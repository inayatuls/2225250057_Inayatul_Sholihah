from typing import Any

from fastapi import APIRouter
from sqlalchemy import delete, select

from app.core.deps import DB, Student, Teacher
from app.core.errors import conflict, not_found
from app.core.security import hash_password, random_code
from app.models import ClassMember, Classroom, User
from app.schemas import ClassCreate, ClassPatch, JoinClass
from app.services.progress import student_class
from app.services.reports import owned_class

router = APIRouter(prefix="/classes", tags=["classes"])

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # tanpa O/0/I/1


def class_view(c: Classroom, count: int = 0) -> dict[str, Any]:
    return {
        "id": c.id,
        "name": c.name,
        "join_code": c.join_code,
        "sequential_unlock": c.sequential_unlock,
        "survey_enabled": c.survey_enabled,
        "is_archived": c.is_archived,
        "student_count": count,
    }


@router.post("", status_code=201)
async def create_class(body: ClassCreate, teacher: Teacher, db: DB) -> dict[str, Any]:
    while True:
        code = random_code(6, CODE_ALPHABET)
        if not (await db.execute(select(Classroom.id).where(Classroom.join_code == code))).first():
            break
    c = Classroom(teacher_id=teacher.id, name=body.name.strip(), join_code=code)
    db.add(c)
    await db.commit()
    return class_view(c)


@router.get("")
async def list_classes(teacher: Teacher, db: DB) -> list[dict[str, Any]]:
    classes = (
        (await db.execute(select(Classroom).where(Classroom.teacher_id == teacher.id).order_by(Classroom.created_at)))
        .scalars()
        .all()
    )
    out = []
    for c in classes:
        n = len((await db.execute(select(ClassMember.id).where(ClassMember.class_id == c.id))).all())
        out.append(class_view(c, n))
    return out


@router.patch("/{class_id}")
async def patch_class(class_id: str, body: ClassPatch, teacher: Teacher, db: DB) -> dict[str, Any]:
    c = await owned_class(db, teacher, class_id)
    for field in ("name", "sequential_unlock", "survey_enabled", "is_archived"):
        val = getattr(body, field)
        if val is not None:
            setattr(c, field, val.strip() if isinstance(val, str) else val)
    await db.commit()
    return class_view(c)


@router.post("/join")
async def join_class(body: JoinClass, student: Student, db: DB) -> dict[str, Any]:
    code = body.join_code.strip().upper()
    c = (
        await db.execute(select(Classroom).where(Classroom.join_code == code, Classroom.is_archived.is_(False)))
    ).scalar_one_or_none()
    if c is None:
        raise not_found("Kode kelas tidak ditemukan. Cek lagi ke gurumu, ya.", "CLASS_NOT_FOUND")
    current = await student_class(db, student.id)
    if current and current.id == c.id:
        raise conflict("ALREADY_IN_CLASS", "Kamu sudah bergabung di kelas ini.")
    if current:
        raise conflict("ALREADY_IN_CLASS", f"Kamu sudah terdaftar di kelas {current.name}.")
    db.add(ClassMember(class_id=c.id, student_id=student.id))
    await db.commit()
    teacher = await db.get(User, c.teacher_id)
    return {"class": {"id": c.id, "name": c.name, "teacher_name": teacher.display_name if teacher else ""}}


@router.delete("/{class_id}/members/{student_id}", status_code=204)
async def remove_member(class_id: str, student_id: str, teacher: Teacher, db: DB) -> None:
    await owned_class(db, teacher, class_id)
    await db.execute(delete(ClassMember).where(ClassMember.class_id == class_id, ClassMember.student_id == student_id))
    await db.commit()


@router.post("/{class_id}/members/{student_id}/reset-password")
async def reset_password(class_id: str, student_id: str, teacher: Teacher, db: DB) -> dict[str, str]:
    await owned_class(db, teacher, class_id)
    member = (
        await db.execute(
            select(ClassMember).where(ClassMember.class_id == class_id, ClassMember.student_id == student_id)
        )
    ).scalar_one_or_none()
    student = await db.get(User, student_id)
    if member is None or student is None:
        raise not_found("Siswa tidak ada di kelas ini.")
    temp = random_code(6, "abcdefghjkmnpqrstuvwxyz23456789")
    student.password_hash = hash_password(temp)
    student.must_change_password = True
    await db.commit()
    return {"temporary_password": temp}
