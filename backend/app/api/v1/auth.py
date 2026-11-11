from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Cookie, Request, Response
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import DB
from app.core.errors import AppError, conflict
from app.core.ratelimit import login_limiter
from app.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    new_refresh_token,
    random_code,
    verify_password,
)
from app.models import RefreshToken, User
from app.schemas import Login, RegisterStudent, RegisterTeacher
from app.services.progress import student_class

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "kk_refresh"
COOKIE_PATH = "/api/v1/auth"


async def user_view(db: AsyncSession, user: User) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": user.id,
        "role": user.role,
        "display_name": user.display_name,
        "username": user.username,
        "email": user.email,
        "onboarding_done": user.onboarding_done,
        "must_change_password": user.must_change_password,
        "class": None,
    }
    if user.role == "student":
        cls = await student_class(db, user.id)
        if cls:
            teacher = await db.get(User, cls.teacher_id)
            data["class"] = {
                "id": cls.id,
                "name": cls.name,
                "teacher_name": teacher.display_name if teacher else "",
                "survey_enabled": cls.survey_enabled,
            }
    return data


async def _issue(db: AsyncSession, user: User, response: Response) -> dict[str, Any]:
    raw, hashed, exp = new_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=hashed, expires_at=exp))
    await db.commit()
    s = get_settings()
    response.set_cookie(
        COOKIE,
        raw,
        httponly=True,
        secure=s.cookie_secure,
        samesite="lax",
        max_age=s.jwt_refresh_ttl_days * 86400,
        path=COOKIE_PATH,
    )
    return {
        "access_token": create_access_token(user.id, user.role),
        "token_type": "bearer",
        "user": await user_view(db, user),
    }


async def _research_code(db: AsyncSession) -> str:
    while True:
        code = random_code(10, "abcdefghjkmnpqrstuvwxyz23456789")
        if not (await db.execute(select(User.id).where(User.research_code == code))).first():
            return code


@router.post("/register/student", status_code=201)
async def register_student(body: RegisterStudent, db: DB, response: Response) -> dict[str, Any]:
    if (await db.execute(select(User.id).where(User.username == body.username))).first():
        raise conflict("USERNAME_TAKEN", "Username sudah dipakai, coba yang lain.")
    user = User(
        role="student",
        display_name=body.display_name.strip(),
        username=body.username,
        password_hash=hash_password(body.password),
        research_code=await _research_code(db),
    )
    db.add(user)
    await db.flush()
    return await _issue(db, user, response)


@router.post("/register/teacher", status_code=201)
async def register_teacher(body: RegisterTeacher, db: DB, response: Response) -> dict[str, Any]:
    if (await db.execute(select(User.id).where(User.email == body.email))).first():
        raise conflict("EMAIL_TAKEN", "Email sudah terdaftar.")
    user = User(
        role="teacher",
        display_name=body.display_name.strip(),
        email=body.email,
        password_hash=hash_password(body.password),
        research_code=await _research_code(db),
        onboarding_done=True,
    )
    db.add(user)
    await db.flush()
    return await _issue(db, user, response)


@router.post("/login")
async def login(body: Login, db: DB, request: Request, response: Response) -> dict[str, Any]:
    ip = request.client.host if request.client else "unknown"
    login_limiter.check(f"login:{ip}", get_settings().login_rate_per_min)
    ident = body.identifier.strip().lower()
    user = (await db.execute(select(User).where(or_(User.username == ident, User.email == ident)))).scalar_one_or_none()
    if not user or not user.is_active or not verify_password(body.password, user.password_hash):
        raise AppError(401, "INVALID_CREDENTIALS", "Username/email atau kata sandi salah.")
    return await _issue(db, user, response)


@router.post("/refresh")
async def refresh(db: DB, response: Response, kk_refresh: str | None = Cookie(default=None)) -> dict[str, Any]:
    if not kk_refresh:
        raise AppError(401, "NOT_AUTHENTICATED", "Silakan masuk terlebih dahulu.")
    tok = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hash_token(kk_refresh)))
    ).scalar_one_or_none()
    now = datetime.now(UTC)
    if tok is None or tok.revoked_at is not None or _aware(tok.expires_at) < now:
        raise AppError(401, "TOKEN_EXPIRED", "Sesi berakhir. Silakan masuk lagi.")
    user = await db.get(User, tok.user_id)
    if user is None or not user.is_active:
        raise AppError(401, "NOT_AUTHENTICATED", "Akun tidak ditemukan.")
    tok.revoked_at = now  # rotasi
    return await _issue(db, user, response)


@router.post("/logout", status_code=204)
async def logout(db: DB, response: Response, kk_refresh: str | None = Cookie(default=None)) -> Response:
    if kk_refresh:
        tok = (
            await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hash_token(kk_refresh)))
        ).scalar_one_or_none()
        if tok and tok.revoked_at is None:
            tok.revoked_at = datetime.now(UTC)
            await db.commit()
    response.delete_cookie(COOKIE, path=COOKIE_PATH)
    response.status_code = 204
    return response


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)
