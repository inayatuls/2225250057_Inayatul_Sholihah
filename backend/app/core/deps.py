from collections.abc import Callable, Coroutine
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError, forbidden
from app.core.security import decode_access_token
from app.db import get_db
from app.models import User

DB = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(db: DB, authorization: Annotated[str | None, Header()] = None) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AppError(401, "NOT_AUTHENTICATED", "Silakan masuk terlebih dahulu.")
    data = decode_access_token(authorization[7:])
    if not data:
        raise AppError(401, "TOKEN_EXPIRED", "Sesi berakhir. Silakan masuk lagi.")
    user = await db.get(User, data["sub"])
    if not user or not user.is_active:
        raise AppError(401, "NOT_AUTHENTICATED", "Akun tidak ditemukan.")
    user.last_active_at = datetime.now(UTC)
    await db.commit()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: str) -> Callable[[User], Coroutine[Any, Any, User]]:
    async def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise forbidden()
        return user

    return checker


Student = Annotated[User, Depends(require_role("student"))]
Teacher = Annotated[User, Depends(require_role("teacher", "admin"))]
