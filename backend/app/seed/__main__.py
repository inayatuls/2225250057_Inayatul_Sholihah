"""Jalankan: python -m app.seed [--validate] [--demo]

--validate  hanya memeriksa bank soal (tanpa menulis ke database)
--demo      membuat akun guru & siswa contoh beserta satu kelas
"""

import asyncio
import sys

from sqlalchemy import select

from app.core.security import hash_password, random_code
from app.db import SessionLocal
from app.models import ClassMember, Classroom, User
from app.seed import seed, validate_all

DEMO_TEACHER = ("guru@contoh.id", "guru12345", "Bu Guru Demo")
DEMO_STUDENT = ("siswa1", "siswa123", "Siswa Demo")


async def create_demo() -> None:
    async with SessionLocal() as db:
        teacher = (await db.execute(select(User).where(User.email == DEMO_TEACHER[0]))).scalar_one_or_none()
        if teacher is None:
            teacher = User(
                role="teacher",
                email=DEMO_TEACHER[0],
                display_name=DEMO_TEACHER[2],
                password_hash=hash_password(DEMO_TEACHER[1]),
                research_code=random_code(10, "abcdefghjkmnpqrstuvwxyz23456789"),
                onboarding_done=True,
            )
            db.add(teacher)
            await db.flush()
        cls = (await db.execute(select(Classroom).where(Classroom.teacher_id == teacher.id))).scalars().first()
        if cls is None:
            cls = Classroom(teacher_id=teacher.id, name="VIII-A (Demo)", join_code="DEMO8A", survey_enabled=True)
            db.add(cls)
            await db.flush()
        student = (await db.execute(select(User).where(User.username == DEMO_STUDENT[0]))).scalar_one_or_none()
        if student is None:
            student = User(
                role="student",
                username=DEMO_STUDENT[0],
                display_name=DEMO_STUDENT[2],
                password_hash=hash_password(DEMO_STUDENT[1]),
                research_code=random_code(10, "abcdefghjkmnpqrstuvwxyz23456789"),
            )
            db.add(student)
            await db.flush()
            db.add(ClassMember(class_id=cls.id, student_id=student.id))
        await db.commit()
        print(f"Akun guru demo  : {DEMO_TEACHER[0]} / {DEMO_TEACHER[1]}")
        print(f"Akun siswa demo : {DEMO_STUDENT[0]} / {DEMO_STUDENT[1]}")
        print(f"Kode kelas demo : {cls.join_code}")


async def main() -> None:
    if "--validate" in sys.argv:
        print(f"Bank soal valid: {validate_all()} soal.")
        return
    async with SessionLocal() as db:
        stats = await seed(db)
    print(f"Seed selesai: {stats}")
    if "--demo" in sys.argv:
        await create_demo()


if __name__ == "__main__":
    asyncio.run(main())
