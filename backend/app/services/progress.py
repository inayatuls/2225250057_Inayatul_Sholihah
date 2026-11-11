from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Attempt, ClassMember, Classroom, Module, ModuleProgress, Question


def stars_for(score: int) -> int:
    if score >= 85:
        return 3
    if score >= 70:
        return 2
    if score >= 50:
        return 1
    return 0


async def student_class(db: AsyncSession, student_id: str) -> Classroom | None:
    q = (
        select(Classroom)
        .join(ClassMember, ClassMember.class_id == Classroom.id)
        .where(ClassMember.student_id == student_id, Classroom.is_archived.is_(False))
    )
    return (await db.execute(q)).scalars().first()


async def recompute(db: AsyncSession, student_id: str, module_id: str) -> ModuleProgress:
    """Hitung ulang progres modul dari skor terbaik tiap soal."""
    qids = (
        (await db.execute(select(Question.id).where(Question.module_id == module_id, Question.is_active.is_(True))))
        .scalars()
        .all()
    )
    best_rows = (
        await db.execute(
            select(Attempt.question_id, func.max(Attempt.score))
            .where(Attempt.student_id == student_id, Attempt.question_id.in_(qids), Attempt.finished.is_(True))
            .group_by(Attempt.question_id)
        )
    ).all()
    best = {qid: int(score or 0) for qid, score in best_rows}
    total = len(qids)
    avg = round(sum(best.values()) / total) if total else 0
    prog = (
        await db.execute(
            select(ModuleProgress).where(ModuleProgress.student_id == student_id, ModuleProgress.module_id == module_id)
        )
    ).scalar_one_or_none()
    if prog is None:
        prog = ModuleProgress(student_id=student_id, module_id=module_id)
        db.add(prog)
    prog.best_score = avg
    prog.stars = stars_for(avg)
    if total and len(best) == total:
        if prog.status != "completed":
            prog.completed_at = datetime.now(UTC)
        prog.status = "completed"
    else:
        prog.status = "in_progress"
    await db.flush()
    return prog


async def module_overview(db: AsyncSession, student_id: str, kind: str | None = None) -> list[dict[str, Any]]:
    """Daftar modul dengan status (terkunci/sedang/selesai), skor, bintang.

    Penguncian berurutan dihitung terpisah per jenis: modul materi mengikuti pengaturan kelas,
    level Latihan Soal SELALU berurutan (Mudah → Sedang → Sulit).
    """
    modules = (await db.execute(select(Module).order_by(Module.order_index))).scalars().all()
    progs = {
        p.module_id: p
        for p in (await db.execute(select(ModuleProgress).where(ModuleProgress.student_id == student_id))).scalars()
    }
    counts = dict(
        (
            await db.execute(
                select(Question.module_id, func.count())
                .where(Question.is_active.is_(True))
                .group_by(Question.module_id)
            )
        ).all()
    )
    cls = await student_class(db, student_id)
    sequential = cls.sequential_unlock if cls else True
    out: list[dict[str, Any]] = []
    prev_done: dict[str, bool] = {}
    for m in modules:
        p = progs.get(m.id)
        status = p.status if p else "not_started"
        mkind = m.kind or "module"
        seq = True if mkind == "practice" else sequential
        if seq and not prev_done.get(mkind, True) and status == "not_started":
            status = "locked"
        prev_done[mkind] = bool(p and p.status == "completed")
        if kind is not None and mkind != kind:
            continue
        out.append(
            {
                "code": m.code,
                "kind": mkind,
                "title": m.title,
                "subtitle": m.subtitle,
                "order_index": m.order_index,
                "minutes": m.minutes,
                "question_count": counts.get(m.id, 0),
                "progress": {
                    "status": status,
                    "best_score": p.best_score if p else 0,
                    "stars": p.stars if p else 0,
                    "last_segment_index": p.last_segment_index if p else 0,
                },
            }
        )
    return out
