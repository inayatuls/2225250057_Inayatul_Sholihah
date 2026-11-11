import os
import tempfile
from collections.abc import AsyncIterator

import pytest

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_tmp}/test.db"
os.environ["JWT_SECRET"] = "test-secret-yang-cukup-panjang-untuk-hs256"

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app import models  # noqa: E402,F401
from app.core.ratelimit import login_limiter  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as db:
        await seed(db)
    login_limiter.reset()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def register_student(c: AsyncClient, username: str = "raka08") -> dict[str, str]:
    r = await c.post(
        "/api/v1/auth/register/student", json={"display_name": "Raka", "username": username, "password": "rahasia1"}
    )
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def register_teacher(c: AsyncClient, email: str = "sari@sekolah.id") -> dict[str, str]:
    r = await c.post(
        "/api/v1/auth/register/teacher", json={"display_name": "Bu Sari", "email": email, "password": "rahasia123"}
    )
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
