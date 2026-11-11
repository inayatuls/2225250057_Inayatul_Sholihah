"""Laporan untuk dashboard guru. Pemeriksaan kepemilikan kelas WAJIB lewat `owned_class`."""

import csv
import io
from collections import Counter, defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import forbidden, not_found
from app.models import (
    Attempt,
    ClassMember,
    Classroom,
    ModelingStepAttempt,
    Module,
    ModuleProgress,
    Question,
    User,
)


async def owned_class(db: AsyncSession, teacher: User, class_id: str) -> Classroom:
    cls = await db.get(Classroom, class_id)
    if cls is None:
        raise not_found("Kelas tidak ditemukan.", "CLASS_NOT_FOUND")
    if cls.teacher_id != teacher.id and teacher.role != "admin":
        raise forbidden("NOT_CLASS_OWNER", "Kelas ini bukan milikmu.")
    return cls


async def class_students(db: AsyncSession, class_id: str) -> list[User]:
    q = (
        select(User)
        .join(ClassMember, ClassMember.student_id == User.id)
        .where(ClassMember.class_id == class_id)
        .order_by(User.display_name)
    )
    return list((await db.execute(q)).scalars().all())


async def students_table(db: AsyncSession, class_id: str) -> dict[str, Any]:
    students = await class_students(db, class_id)
    modules = list((await db.execute(select(Module).order_by(Module.order_index))).scalars().all())
    ids = [s.id for s in students]
    progs: dict[str, dict[str, ModuleProgress]] = defaultdict(dict)
    if ids:
        for p in (await db.execute(select(ModuleProgress).where(ModuleProgress.student_id.in_(ids)))).scalars():
            progs[p.student_id][p.module_id] = p
    rows = []
    for s in students:
        per = []
        scores = []
        for m in modules:
            prog = progs[s.id].get(m.id)
            per.append(
                {
                    "code": m.code,
                    "status": prog.status if prog else "not_started",
                    "stars": prog.stars if prog else 0,
                    "score": prog.best_score if prog else 0,
                }
            )
            if prog and prog.best_score:
                scores.append(prog.best_score)
        avg = round(sum(scores) / len(scores)) if scores else 0
        rows.append(
            {
                "id": s.id,
                "display_name": s.display_name,
                "username": s.username,
                "modules": per,
                "average": avg,
                "completed": sum(1 for x in per if x["status"] == "completed"),
                "last_active_at": s.last_active_at.isoformat() if s.last_active_at else None,
                "needs_help": bool(scores) and avg < 60,
            }
        )
    return {"modules": [m.code for m in modules], "students": rows}


async def overview(db: AsyncSession, cls: Classroom) -> dict[str, Any]:
    table = await students_table(db, cls.id)
    n = len(table["students"])
    m = len(table["modules"]) or 1
    done = sum(r["completed"] for r in table["students"])
    active = [r["average"] for r in table["students"] if r["average"]]
    items = await item_analysis(db, cls.id)
    hardest = min(items, key=lambda i: i["percent_correct_first_try"]) if items else None
    return {
        "class": {
            "id": cls.id,
            "name": cls.name,
            "join_code": cls.join_code,
            "sequential_unlock": cls.sequential_unlock,
            "survey_enabled": cls.survey_enabled,
            "is_archived": cls.is_archived,
        },
        "student_count": n,
        "completion_percent": round(100 * done / (n * m)) if n else 0,
        "average_score": round(sum(active) / len(active)) if active else 0,
        "needs_help": sum(1 for r in table["students"] if r["needs_help"]),
        "hardest_question": hardest,
    }


async def item_analysis(db: AsyncSession, class_id: str) -> list[dict[str, Any]]:
    ids = [s.id for s in await class_students(db, class_id)]
    if not ids:
        return []
    rows = (
        await db.execute(
            select(Attempt, Question.slug, Question.type, Question.content, Module.code)
            .join(Question, Question.id == Attempt.question_id)
            .join(Module, Module.id == Question.module_id)
            .where(Attempt.student_id.in_(ids), Attempt.finished.is_(True))
            .order_by(Module.order_index, Question.order_index)
        )
    ).all()
    step_mis: dict[str, Counter[str]] = defaultdict(Counter)
    step_rows = (
        await db.execute(
            select(Attempt.question_id, ModelingStepAttempt.misconception_code)
            .join(Attempt, Attempt.id == ModelingStepAttempt.attempt_id)
            .where(Attempt.student_id.in_(ids), ModelingStepAttempt.misconception_code.is_not(None))
        )
    ).all()
    for qid, code in step_rows:
        if not code:
            continue
        step_mis[qid][code] += 1
    by_q: dict[str, dict[str, Any]] = {}
    for att, slug, qtype, content, mcode in rows:
        d = by_q.setdefault(
            att.question_id,
            {
                "question_id": att.question_id,
                "question_slug": slug,
                "type": qtype,
                "prompt": content.get("prompt", ""),
                "module": mcode,
                "students": set(),
                "first": [],
                "attempts": 0,
                "hints": [],
                "mis": Counter(),
                "wrong": 0,
            },
        )
        d["students"].add(att.student_id)
        d["attempts"] += 1
        d["hints"].append(att.hints_used)
        if att.attempt_number == 1:
            d["first"].append(att.is_correct)
        if not att.is_correct:
            d["wrong"] += 1
            if att.misconception_code:
                d["mis"][att.misconception_code] += 1
    out = []
    for qid, d in by_q.items():
        mis = d["mis"] + step_mis.get(qid, Counter())
        total_mis = sum(mis.values()) or 1
        n_students = len(d["students"])
        out.append(
            {
                "question_id": qid,
                "question_slug": d["question_slug"],
                "type": d["type"],
                "prompt": d["prompt"],
                "module": d["module"],
                "attempted_by": n_students,
                "percent_correct_first_try": round(100 * sum(d["first"]) / len(d["first"])) if d["first"] else 0,
                "avg_attempts": round(d["attempts"] / n_students, 1) if n_students else 0,
                "avg_hints": round(sum(d["hints"]) / len(d["hints"]), 1) if d["hints"] else 0,
                "top_misconceptions": [
                    {"code": c, "percent": round(100 * k / total_mis)} for c, k in mis.most_common(3)
                ],
            }
        )
    return out


async def student_detail(db: AsyncSession, student: User) -> dict[str, Any]:
    rows = (
        await db.execute(
            select(Attempt, Question.slug, Question.type, Question.content, Module.code)
            .join(Question, Question.id == Attempt.question_id)
            .join(Module, Module.id == Question.module_id)
            .where(Attempt.student_id == student.id)
            .order_by(Attempt.submitted_at.desc())
            .limit(200)
        )
    ).all()
    attempt_ids = [row[0].id for row in rows]
    steps_by_attempt: dict[str, list[dict[str, Any]]] = defaultdict(list)
    if attempt_ids:
        for st in (
            await db.execute(
                select(ModelingStepAttempt)
                .where(ModelingStepAttempt.attempt_id.in_(attempt_ids))
                .order_by(ModelingStepAttempt.submitted_at)
            )
        ).scalars():
            steps_by_attempt[st.attempt_id].append(
                {
                    "step": st.step,
                    "process": st.literacy_process,
                    "is_correct": st.is_correct,
                    "score": st.score,
                    "max_score": st.max_score,
                    "try_number": st.try_number,
                    "misconception_code": st.misconception_code,
                    "input": st.input,
                }
            )
    history = []
    for att, slug, qtype, content, mcode in rows:
        history.append(
            {
                "id": att.id,
                "module": mcode,
                "question_slug": slug,
                "type": qtype,
                "prompt": content.get("prompt", ""),
                "answer": att.answer if qtype != "modeling" else None,
                "is_correct": att.is_correct,
                "score": att.score,
                "hints_used": att.hints_used,
                "misconception_code": att.misconception_code,
                "attempt_number": att.attempt_number,
                "finished": att.finished,
                "submitted_at": att.submitted_at.isoformat(),
                "steps": steps_by_attempt.get(att.id, []),
            }
        )
    return {"history": history}


async def export_csv(db: AsyncSession, class_id: str) -> str:
    table = await students_table(db, class_id)
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Nama", "Username", *[f"Skor {c}" for c in table["modules"]], "Rata-rata", "Modul selesai"])
    for r in table["students"]:
        w.writerow(
            [
                r["display_name"],
                r["username"],
                *[m["score"] for m in r["modules"]],
                r["average"],
                r["completed"],
            ]
        )
    return "﻿" + buf.getvalue()
