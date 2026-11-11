"""Aplikasi FastAPI. Juga menyajikan hasil build frontend (PWA) dari satu server."""

from pathlib import Path

from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response

from app.api.v1 import auth, classes, learning, me, modeling, teacher
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Kartesia API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):  # type: ignore[no-untyped-def]
    response: Response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "detail": {
                "code": "VALIDATION_ERROR",
                "message": "Data yang dikirim belum sesuai. Periksa lagi isianmu.",
                "errors": [{"loc": list(e.get("loc", [])), "msg": e.get("msg")} for e in exc.errors()],
            }
        },
    )


api = APIRouter(prefix="/api/v1")


@api.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


for r in (auth.router, me.router, classes.router, learning.router, modeling.router, teacher.router):
    api.include_router(r)
app.include_router(api)


# ---------------------------------------------------------------- frontend statis (PWA)

DIST: Path = settings.frontend_dist


@app.get("/{full_path:path}", include_in_schema=False)
async def spa(full_path: str) -> Response:
    if full_path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": {"code": "NOT_FOUND", "message": "Tidak ditemukan."}})
    if not DIST.exists():
        return JSONResponse(
            status_code=503,
            content={
                "detail": {"code": "FRONTEND_NOT_BUILT", "message": "Jalankan 'npm run build' di folder frontend."}
            },
        )
    target = (DIST / full_path).resolve()
    if full_path and target.is_file() and DIST.resolve() in target.parents:
        headers = {}
        if target.name in ("sw.js", "index.html", "manifest.webmanifest") or target.name.startswith("workbox-"):
            headers["Cache-Control"] = "no-cache"
        elif "assets" in target.parts:
            headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return FileResponse(target, headers=headers)
    return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-cache"})
