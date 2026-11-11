import copy
from typing import Any

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.learning import ensure_unlocked
from app.core.deps import DB, CurrentUser, Student
from app.core.errors import AppError, bad_request, conflict, forbidden, not_found
from app.models import Attempt, ModelingStepAttempt, Module, Question, SavedModel, User
from app.schemas import ModelingStart, SaveModelIn, SolveIn, StepIn
from app.services import modeling as eng
from app.services import modeling_flow as flow
from app.services.grading import hint_factor
from app.services.progress import recompute

router = APIRouter(tags=["modeling"])


async def _own_attempt(db: AsyncSession, user: User, attempt_id: str) -> tuple[Attempt, Question]:
    att = await db.get(Attempt, attempt_id)
    if att is None or att.student_id != user.id:
        raise not_found("Percobaan tidak ditemukan.")
    q = await db.get(Question, att.question_id)
    assert q is not None
    return att, q


def _state_view(state: dict[str, Any]) -> dict[str, Any]:
    return {
        "current": state["current"],
        "steps": {
            s: {k: v for k, v in st.items() if k in ("tries", "hints", "done", "score", "revealed")}
            for s, st in state["steps"].items()
        },
        "solution_viewed": state.get("solution_viewed", False),
    }


@router.post("/modeling/attempts")
async def start_modeling(body: ModelingStart, user: Student, db: DB) -> dict[str, Any]:
    q = await db.get(Question, body.question_id)
    if q is None or q.type != "modeling":
        raise not_found("Soal pemodelan tidak ditemukan.")
    m = await db.get(Module, q.module_id)
    assert m is not None
    await ensure_unlocked(db, user, m.code)
    n_prev = (
        await db.execute(
            select(func.count()).select_from(Attempt).where(Attempt.student_id == user.id, Attempt.question_id == q.id)
        )
    ).scalar_one()
    att = Attempt(
        student_id=user.id,
        question_id=q.id,
        answer={"state": flow.new_state(q.difficulty)},
        attempt_number=n_prev + 1,
        finished=False,
    )
    db.add(att)
    await db.commit()
    return {"attempt_id": att.id, "state": _state_view(att.answer["state"])}


@router.get("/modeling/attempts/{attempt_id}/hints/{step}/{level}")
async def step_hint(attempt_id: str, step: str, level: int, user: Student, db: DB) -> dict[str, Any]:
    att, q = await _own_attempt(db, user, attempt_id)
    hints = q.answer_key.get("step_hints", {}).get(step, [])
    if step not in flow.STEPS or level < 1 or level > len(hints):
        raise not_found("Petunjuk tidak tersedia.")
    state = copy.deepcopy(att.answer["state"])
    st = state["steps"][step]
    if level > st["hints"] + 1:
        raise conflict("HINT_ORDER", "Buka petunjuk secara berurutan, ya.")
    if not st["done"]:
        st["hints"] = max(st["hints"], level)
        att.answer = {**att.answer, "state": state}
        await db.commit()
    return {
        "level": level,
        "text": hints[level - 1],
        "max_score_after": round(flow.WEIGHTS[step] * hint_factor(level)),
    }


@router.post("/modeling/attempts/{attempt_id}/steps/{step}")
async def submit_step(attempt_id: str, step: str, body: StepIn, user: Student, db: DB) -> dict[str, Any]:
    att, q = await _own_attempt(db, user, attempt_id)
    if att.finished:
        raise conflict("STEP_LOCKED", "Soal ini sudah selesai.")
    if step not in flow.STEPS:
        raise not_found("Langkah tidak dikenal.")
    state = copy.deepcopy(att.answer["state"])
    st = state["steps"][step]
    if st["done"]:
        raise conflict("STEP_LOCKED", "Langkah ini sudah selesai.")
    if step != state["current"]:
        raise conflict("STEP_ORDER", "Kerjakan langkah secara berurutan, ya.")

    ev = flow.evaluate(step, body.input, q.answer_key, q.content)
    st["tries"] += 1
    weight = flow.WEIGHTS[step]
    revealed = None
    if ev.correct:
        st["done"] = True
        st["score"] = flow.step_score(step, st["hints"])
    elif st["tries"] >= flow.MAX_TRIES:
        st["done"] = True
        st["score"] = 0
        st["revealed"] = True
        revealed = ev.reveal

    db.add(
        ModelingStepAttempt(
            attempt_id=att.id,
            step=step,
            literacy_process=flow.PROCESS[step],
            input=body.input,
            is_correct=ev.correct,
            score=st["score"] if st["done"] else 0,
            max_score=weight,
            hints_used=st["hints"],
            misconception_code=ev.misconception,
            try_number=st["tries"],
        )
    )

    finished = False
    next_step = None
    if st["done"]:
        idx = flow.STEPS.index(step)
        if idx + 1 < len(flow.STEPS):
            next_step = flow.STEPS[idx + 1]
            state["current"] = next_step
        else:
            finished = True
            state["current"] = "done"
    total = sum(s["score"] for s in state["steps"].values())
    att.answer = {**att.answer, "state": state}
    att.hints_used = sum(s["hints"] for s in state["steps"].values())
    if ev.misconception:
        att.misconception_code = ev.misconception
    progress = None
    if finished:
        att.finished = True
        att.score = total
        att.is_correct = total >= 60
        await db.flush()
        prog = await recompute(db, user.id, q.module_id)
        progress = {"status": prog.status, "best_score": prog.best_score, "stars": prog.stars}
    await db.commit()

    out: dict[str, Any] = {
        "step": step,
        "is_correct": ev.correct,
        "score": st["score"] if st["done"] else 0,
        "max_score": weight,
        "literacy_process": flow.PROCESS[step],
        "feedback": ev.feedback,
        "misconception_code": ev.misconception,
        "model_text": ev.model_text,
        "tries": st["tries"],
        "done": st["done"],
        "revealed": revealed,
        "next_step": next_step,
        "finished": finished,
        "state": _state_view(state),
    }
    if ev.correct and step in ("understand", "formulate", "solve"):
        out["confirmed"] = ev.reveal  # nilai benar boleh ditampilkan setelah langkah benar
    if finished:
        out["total_score"] = total
        out["explanation"] = q.answer_key.get("explanation")
        out["module_progress"] = progress
    return out


@router.get("/modeling/attempts/{attempt_id}/solution")
async def solution(attempt_id: str, user: Student, db: DB) -> dict[str, Any]:
    att, q = await _own_attempt(db, user, attempt_id)
    state = copy.deepcopy(att.answer["state"])
    solve_st = state["steps"]["solve"]
    level = state.get("level", 1)
    if not att.finished and level <= 2 and solve_st["tries"] == 0 and not solve_st["done"]:
        raise forbidden("SOLUTION_NOT_AVAILABLE", "Coba hitung sendiri dulu, lalu jalankan model untuk memeriksa.")
    if not att.finished and level >= 3 and not solve_st["done"]:
        # Pada level 3, melihat penyelesaian dihitung sebagai petunjuk penuh.
        solve_st["hints"] = 3
        state["solution_viewed"] = True
        att.answer = {**att.answer, "state": state}
        await db.commit()
    out = eng.solve(q.answer_key["model_key"])
    return {"steps": out["steps"], "result": out["result"], "model_text": eng.describe(q.answer_key["model_key"])}


@router.post("/modeling/solve")
async def solve_free(body: SolveIn, user: CurrentUser) -> dict[str, Any]:
    try:
        out = eng.solve(body.model)
    except eng.ModelError as e:
        raise AppError(422, "INVALID_MODEL", str(e)) from e
    return {**out, "model_text": eng.describe(body.model)}


@router.get("/saved-models")
async def list_saved(user: CurrentUser, db: DB) -> list[dict[str, Any]]:
    rows = (
        (
            await db.execute(
                select(SavedModel).where(SavedModel.user_id == user.id).order_by(SavedModel.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return [{"id": r.id, "title": r.title, "model": r.model, "result": r.result} for r in rows]


@router.post("/saved-models", status_code=201)
async def save_model(body: SaveModelIn, user: CurrentUser, db: DB) -> dict[str, Any]:
    n = (
        await db.execute(select(func.count()).select_from(SavedModel).where(SavedModel.user_id == user.id))
    ).scalar_one()
    if n >= 100:
        raise bad_request("LIMIT_REACHED", "Kamu sudah menyimpan 100 model. Hapus beberapa dulu.")
    try:
        out = eng.solve(body.model)
    except eng.ModelError as e:
        raise AppError(422, "INVALID_MODEL", str(e)) from e
    r = SavedModel(user_id=user.id, title=body.title.strip(), model=body.model, result=out["result"])
    db.add(r)
    await db.commit()
    return {"id": r.id, "title": r.title, "model": r.model, "result": r.result}


@router.delete("/saved-models/{model_id}", status_code=204)
async def delete_saved(model_id: str, user: CurrentUser, db: DB) -> None:
    r = await db.get(SavedModel, model_id)
    if r is None or r.user_id != user.id:
        raise not_found("Model tidak ditemukan.")
    await db.delete(r)
    await db.commit()
