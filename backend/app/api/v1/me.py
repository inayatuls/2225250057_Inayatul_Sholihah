from typing import Any

from fastapi import APIRouter

from app.api.v1.auth import user_view
from app.core.deps import DB, CurrentUser, Student
from app.core.errors import AppError
from app.core.security import hash_password, verify_password
from app.schemas import ChangePassword, MePatch
from app.services.literacy import student_profile

router = APIRouter(prefix="/me", tags=["me"])


@router.get("")
async def me(user: CurrentUser, db: DB) -> dict[str, Any]:
    return await user_view(db, user)


@router.patch("")
async def patch_me(body: MePatch, user: CurrentUser, db: DB) -> dict[str, Any]:
    if body.display_name is not None:
        user.display_name = body.display_name.strip()
    if body.onboarding_done is not None:
        user.onboarding_done = body.onboarding_done
    await db.commit()
    return await user_view(db, user)


@router.post("/password", status_code=204)
async def change_password(body: ChangePassword, user: CurrentUser, db: DB) -> None:
    if user.role != "student" and len(body.new_password) < 8:
        raise AppError(422, "VALIDATION_ERROR", "Kata sandi guru minimal 8 karakter.")
    if not user.must_change_password and not verify_password(body.old_password or "", user.password_hash):
        raise AppError(401, "INVALID_CREDENTIALS", "Kata sandi lama salah.")
    user.password_hash = hash_password(body.new_password)
    user.must_change_password = False
    await db.commit()


@router.get("/literacy-profile")
async def literacy_profile(user: Student, db: DB) -> dict[str, Any]:
    return await student_profile(db, user.id)
