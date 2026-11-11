from typing import Any

from fastapi import APIRouter
from fastapi.responses import Response
from sqlalchemy import select

from app.core.deps import DB, Student, Teacher
from app.core.errors import AppError, not_found
from app.models import ClassMember, SurveyResponse, User
from app.schemas import SurveyIn
from app.services import literacy, reports
from app.services.progress import module_overview

router = APIRouter(tags=["teacher"])


@router.get("/teacher/classes/{class_id}/overview")
async def overview(class_id: str, teacher: Teacher, db: DB) -> dict[str, Any]:
    cls = await reports.owned_class(db, teacher, class_id)
    return await reports.overview(db, cls)


@router.get("/teacher/classes/{class_id}/students")
async def students(class_id: str, teacher: Teacher, db: DB) -> dict[str, Any]:
    await reports.owned_class(db, teacher, class_id)
    return await reports.students_table(db, class_id)


@router.get("/teacher/classes/{class_id}/items")
async def items(class_id: str, teacher: Teacher, db: DB) -> list[dict[str, Any]]:
    await reports.owned_class(db, teacher, class_id)
    return await reports.item_analysis(db, class_id)


@router.get("/teacher/classes/{class_id}/literacy")
async def class_literacy(class_id: str, teacher: Teacher, db: DB) -> dict[str, Any]:
    await reports.owned_class(db, teacher, class_id)
    studs = await reports.class_students(db, class_id)
    return await literacy.class_profile(db, [(s.id, s.display_name) for s in studs])


@router.get("/teacher/classes/{class_id}/students/{student_id}")
async def student_detail(class_id: str, student_id: str, teacher: Teacher, db: DB) -> dict[str, Any]:
    await reports.owned_class(db, teacher, class_id)
    member = (
        await db.execute(
            select(ClassMember).where(ClassMember.class_id == class_id, ClassMember.student_id == student_id)
        )
    ).scalar_one_or_none()
    student = await db.get(User, student_id)
    if member is None or student is None:
        raise not_found("Siswa tidak ada di kelas ini.")
    detail = await reports.student_detail(db, student)
    return {
        "student": {
            "id": student.id,
            "display_name": student.display_name,
            "username": student.username,
            "last_active_at": student.last_active_at.isoformat() if student.last_active_at else None,
        },
        "modules": await module_overview(db, student.id),
        "literacy": await literacy.student_profile(db, student.id),
        **detail,
    }


@router.get("/teacher/classes/{class_id}/export.csv")
async def export_csv(class_id: str, teacher: Teacher, db: DB) -> Response:
    cls = await reports.owned_class(db, teacher, class_id)
    data = await reports.export_csv(db, class_id)
    safe = "".join(ch for ch in cls.name if ch.isalnum() or ch in "-_") or "kelas"
    return Response(
        content=data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="nilai-{safe}.csv"'},
    )


@router.post("/surveys", status_code=201)
async def submit_survey(body: SurveyIn, user: Student, db: DB) -> dict[str, str]:
    if body.instrument == "paas":
        rating = body.values.get("rating")
        if not isinstance(rating, int) or isinstance(rating, bool) or not 1 <= rating <= 9:
            raise AppError(422, "VALIDATION_ERROR", "Nilai skala harus 1–9.")
    r = SurveyResponse(student_id=user.id, instrument=body.instrument, context=body.context, values=body.values)
    db.add(r)
    await db.commit()
    return {"id": r.id}
