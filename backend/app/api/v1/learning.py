from typing import Any

from fastapi import APIRouter
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import DB, CurrentUser, Student
from app.core.errors import bad_request, conflict, forbidden, not_found
from app.models import Attempt, HintUsage, LessonSegment, Module, ModuleProgress, Question, Stimulus, User
from app.schemas import AttemptIn, ProgressPatch
from app.services.grading import MAX_TRIES_BEFORE_REVEAL, correct_answer_view, grade, hint_factor
from app.services.modeling_flow import STEPS
from app.services.progress import module_overview, recompute

router = APIRouter(tags=["learning"])


def question_view(q: Question) -> dict[str, Any]:
    priv = q.answer_key
    d: dict[str, Any] = {
        **q.content,
        "id": q.id,
        "slug": q.slug,
        "type": q.type,
        "difficulty": q.difficulty,
        "objective": q.objective,
        "stimulus_id": q.stimulus_id,
        "literacy": q.literacy,
    }
    if q.type == "modeling":
        d["step_hint_counts"] = {s: len(priv.get("step_hints", {}).get(s, [])) for s in STEPS}
    else:
        d["hint_count"] = len(priv.get("hints", []))
    return d


async def get_module(db: AsyncSession, code: str) -> Module:
    m = (await db.execute(select(Module).where(Module.code == code.upper()))).scalar_one_or_none()
    if m is None:
        raise not_found("Modul tidak ditemukan.")
    return m


async def ensure_unlocked(db: AsyncSession, user: User, code: str) -> None:
    if user.role != "student":
        return
    for m in await module_overview(db, user.id):
        if m["code"] == code.upper() and m["progress"]["status"] == "locked":
            raise forbidden("MODULE_LOCKED", "Selesaikan modul sebelumnya dulu, ya.")


@router.get("/modules")
async def list_modules(user: Student, db: DB) -> list[dict[str, Any]]:
    return await module_overview(db, user.id, kind="module")


@router.get("/practice-levels")
async def list_practice_levels(user: Student, db: DB) -> list[dict[str, Any]]:
    """Level Latihan Soal (Mudah, Sedang, Sulit) — selalu terbuka berurutan."""
    return await module_overview(db, user.id, kind="practice")


@router.post("/practice-levels/{code}/start", status_code=204)
async def start_practice_level(code: str, user: Student, db: DB) -> None:
    """Mulai/ulangi latihan: petunjuk yang pernah dibuka di level ini direset agar skor sesi baru adil."""
    m = await get_module(db, code)
    if m.kind != "practice":
        raise not_found("Level latihan tidak ditemukan.")
    await ensure_unlocked(db, user, code)
    qids = select(Question.id).where(Question.module_id == m.id)
    await db.execute(delete(HintUsage).where(HintUsage.student_id == user.id, HintUsage.question_id.in_(qids)))
    await db.commit()


@router.get("/modules/{code}")
async def module_detail(code: str, user: CurrentUser, db: DB) -> dict[str, Any]:
    m = await get_module(db, code)
    await ensure_unlocked(db, user, code)
    segs = (
        (
            await db.execute(
                select(LessonSegment).where(LessonSegment.module_id == m.id).order_by(LessonSegment.order_index)
            )
        )
        .scalars()
        .all()
    )
    n_q = (await db.execute(select(func.count()).select_from(Question).where(Question.module_id == m.id))).scalar_one()
    progress = None
    if user.role == "student":
        overview = {x["code"]: x for x in await module_overview(db, user.id)}
        progress = overview.get(m.code, {}).get("progress")
    return {
        "code": m.code,
        "kind": m.kind,
        "title": m.title,
        "subtitle": m.subtitle,
        "minutes": m.minutes,
        "objective_codes": m.objective_codes,
        "question_count": n_q,
        "segments": [{"kind": s.kind, **s.content} for s in segs],
        "progress": progress,
    }


@router.get("/modules/{code}/questions")
async def module_questions(code: str, user: CurrentUser, db: DB) -> dict[str, Any]:
    m = await get_module(db, code)
    await ensure_unlocked(db, user, code)
    qs = (
        (
            await db.execute(
                select(Question)
                .where(Question.module_id == m.id, Question.is_active.is_(True))
                .order_by(Question.order_index)
            )
        )
        .scalars()
        .all()
    )
    stim_ids = {q.stimulus_id for q in qs if q.stimulus_id}
    stimuli: dict[str, Any] = {}
    if stim_ids:
        for s in (await db.execute(select(Stimulus).where(Stimulus.id.in_(stim_ids)))).scalars():
            stimuli[s.id] = {"id": s.id, "slug": s.slug, "title": s.title, "context": s.context, **s.content}
    return {"questions": [question_view(q) for q in qs], "stimuli": stimuli}


@router.get("/questions/{question_id}/hints/{level}")
async def get_hint(question_id: str, level: int, user: Student, db: DB) -> dict[str, Any]:
    q = await db.get(Question, question_id)
    if q is None:
        raise not_found("Soal tidak ditemukan.")
    hints = q.answer_key.get("hints", [])
    if level < 1 or level > len(hints):
        raise not_found("Petunjuk tidak tersedia.")
    usage = (
        await db.execute(select(HintUsage).where(HintUsage.student_id == user.id, HintUsage.question_id == q.id))
    ).scalar_one_or_none()
    current = usage.level if usage else 0
    if level > current + 1:
        raise conflict("HINT_ORDER", "Buka petunjuk secara berurutan, ya.")
    if usage is None:
        usage = HintUsage(student_id=user.id, question_id=q.id, level=0)
        db.add(usage)
    usage.level = max(usage.level, level)
    await db.commit()
    hint = hints[level - 1]
    text = hint["text"] if isinstance(hint, dict) else str(hint)
    visual = hint.get("visual") if isinstance(hint, dict) else None
    return {"level": level, "text": text, "visual": visual, "max_score_after": round(100 * hint_factor(level))}


@router.post("/attempts")
async def submit_attempt(body: AttemptIn, user: Student, db: DB) -> dict[str, Any]:
    if body.client_attempt_id:
        prev = (
            await db.execute(select(Attempt).where(Attempt.client_attempt_id == body.client_attempt_id))
        ).scalar_one_or_none()
        if prev is not None:
            return {
                "is_correct": prev.is_correct,
                "score": prev.score,
                "attempt_number": prev.attempt_number,
                "feedback": "Jawaban ini sudah tercatat.",
                "duplicate": True,
            }
    q = await db.get(Question, body.question_id)
    if q is None or not q.is_active:
        raise not_found("Soal tidak ditemukan.")
    if q.type == "modeling":
        raise bad_request("USE_MODELING_API", "Soal pemodelan dikerjakan per langkah.")
    m = await db.get(Module, q.module_id)
    assert m is not None
    await ensure_unlocked(db, user, m.code)
    n_prev = (
        await db.execute(
            select(func.count()).select_from(Attempt).where(Attempt.student_id == user.id, Attempt.question_id == q.id)
        )
    ).scalar_one()
    usage = (
        await db.execute(select(HintUsage).where(HintUsage.student_id == user.id, HintUsage.question_id == q.id))
    ).scalar_one_or_none()
    hints_used = usage.level if usage else 0
    result = grade(q.type, body.answer, q.answer_key, hints_used)
    attempt_number = n_prev + 1
    att = Attempt(
        student_id=user.id,
        question_id=q.id,
        client_attempt_id=body.client_attempt_id,
        answer=body.answer,
        is_correct=result.is_correct,
        score=result.score,
        hints_used=hints_used,
        misconception_code=result.misconception_code,
        attempt_number=attempt_number,
        duration_ms=body.duration_ms,
    )
    db.add(att)
    await db.flush()
    prog = await recompute(db, user.id, q.module_id)
    await db.commit()
    # Latihan Soal: satu kali jawab per soal, pembahasan langsung ditampilkan.
    reveal = result.is_correct or attempt_number >= MAX_TRIES_BEFORE_REVEAL or m.kind == "practice"
    return {
        "is_correct": result.is_correct,
        "score": result.score,
        "partial": result.extra.get("partial", False),
        "attempt_number": attempt_number,
        "misconception_code": result.misconception_code,
        "feedback": result.feedback,
        "explanation": q.answer_key.get("explanation") if reveal else None,
        "correct_answer": correct_answer_view(q.type, q.answer_key) if reveal else None,
        "solution_steps": q.answer_key.get("solution_steps") if reveal else None,
        "module_progress": {"status": prog.status, "best_score": prog.best_score, "stars": prog.stars},
    }


@router.patch("/progress/{code}")
async def patch_progress(code: str, body: ProgressPatch, user: Student, db: DB) -> dict[str, Any]:
    m = await get_module(db, code)
    await ensure_unlocked(db, user, code)
    prog = (
        await db.execute(
            select(ModuleProgress).where(ModuleProgress.student_id == user.id, ModuleProgress.module_id == m.id)
        )
    ).scalar_one_or_none()
    if prog is None:
        prog = ModuleProgress(student_id=user.id, module_id=m.id, status="in_progress")
        db.add(prog)
    prog.last_segment_index = body.last_segment_index
    await db.commit()
    return {"status": prog.status, "last_segment_index": prog.last_segment_index}


@router.get("/stimuli/{slug}")
async def get_stimulus(slug: str, user: CurrentUser, db: DB) -> dict[str, Any]:
    s = (await db.execute(select(Stimulus).where(Stimulus.slug == slug))).scalar_one_or_none()
    if s is None:
        raise not_found("Stimulus tidak ditemukan.")
    qs = (
        (await db.execute(select(Question).where(Question.stimulus_id == s.id).order_by(Question.order_index)))
        .scalars()
        .all()
    )
    return {
        "id": s.id,
        "slug": s.slug,
        "title": s.title,
        "context": s.context,
        **s.content,
        "questions": [question_view(q) for q in qs],
    }
