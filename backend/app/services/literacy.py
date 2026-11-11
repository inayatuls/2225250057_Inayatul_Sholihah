"""Profil literasi per siswa/kelas (docs/13 §9.2)."""

from collections import defaultdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Attempt, ModelingStepAttempt, Question
from app.services.messages import LITERACY_LABELS, LITERACY_SUGGESTIONS

PROCESSES = ["formulate", "employ", "interpret"]


def category(score: int | None) -> str | None:
    if score is None:
        return None
    if score >= 80:
        return "Mahir"
    if score >= 60:
        return "Cakap"
    if score >= 40:
        return "Dasar"
    return "Perlu Intervensi"


async def _raw(db: AsyncSession, student_ids: list[str]) -> dict[str, list[tuple[str, str, int, int]]]:
    """Kembalikan {student_id: [(proses, minggu, skor, maks), ...]} dari data final."""
    out: dict[str, list[tuple[str, str, int, int]]] = defaultdict(list)
    if not student_ids:
        return out
    rows = (
        await db.execute(
            select(Attempt.student_id, ModelingStepAttempt)
            .join(Attempt, Attempt.id == ModelingStepAttempt.attempt_id)
            .where(Attempt.student_id.in_(student_ids))
        )
    ).all()
    # Ambil percobaan final tiap (attempt, langkah): benar atau percobaan ke-3.
    for sid, st in rows:
        if st.is_correct or st.try_number >= 3:
            week = st.submitted_at.strftime("%G-W%V")
            out[sid].append((st.literacy_process, week, st.score, st.max_score))
    items = (
        await db.execute(
            select(Attempt, Question.literacy)
            .join(Question, Question.id == Attempt.question_id)
            .where(Attempt.student_id.in_(student_ids), Question.type != "modeling")
        )
    ).all()
    best: dict[tuple[str, str], tuple[int, str, str]] = {}
    for att, lit in items:
        proc = (lit or {}).get("process")
        if proc not in PROCESSES:
            continue
        k = (att.student_id, att.question_id)
        if k not in best or att.score > best[k][0]:
            best[k] = (att.score, proc, att.submitted_at.strftime("%G-W%V"))
    for (sid, _), (score, proc, week) in best.items():
        out[sid].append((proc, week, score, 100))
    return out


def _summarize(records: list[tuple[str, str, int, int]]) -> dict[str, Any]:
    earned: dict[str, int] = defaultdict(int)
    maxed: dict[str, int] = defaultdict(int)
    weekly: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    for proc, week, score, mx in records:
        earned[proc] += score
        maxed[proc] += mx
        weekly[week][proc][0] += score
        weekly[week][proc][1] += mx
    processes: list[dict[str, Any]] = []
    for p in PROCESSES:
        sc = round(100 * earned[p] / maxed[p]) if maxed[p] else None
        processes.append({"process": p, "label": LITERACY_LABELS[p], "score": sc, "category": category(sc)})
    trend = []
    for week in sorted(weekly):
        row: dict[str, Any] = {"week": week}
        for p in PROCESSES:
            e, m = weekly[week][p]
            row[p] = round(100 * e / m) if m else None
        trend.append(row)
    scored = [p for p in processes if p["score"] is not None]
    suggestion = None
    if scored:
        weakest = min(scored, key=lambda p: p["score"])
        suggestion = LITERACY_SUGGESTIONS[weakest["process"]]
    return {"processes": processes, "trend": trend, "suggestion": suggestion}


async def student_profile(db: AsyncSession, student_id: str) -> dict[str, Any]:
    raw = await _raw(db, [student_id])
    return _summarize(raw.get(student_id, []))


async def class_profile(db: AsyncSession, students: list[tuple[str, str]]) -> dict[str, Any]:
    """students: [(id, nama)]."""
    raw = await _raw(db, [s[0] for s in students])
    all_records = [r for recs in raw.values() for r in recs]
    summary = _summarize(all_records)
    per_student = []
    weak_counts: dict[str, int] = defaultdict(int)
    for sid, name in students:
        prof = _summarize(raw.get(sid, []))
        scored = [p for p in prof["processes"] if p["score"] is not None]
        weakest = min(scored, key=lambda p: p["score"]) if scored else None
        if weakest and weakest["score"] < 60:
            weak_counts[weakest["process"]] += 1
        per_student.append(
            {
                "student_id": sid,
                "display_name": name,
                "processes": prof["processes"],
                "weakest": weakest["label"] if weakest else None,
            }
        )
    summary["students"] = per_student
    summary["weak_counts"] = {LITERACY_LABELS[p]: weak_counts[p] for p in PROCESSES}
    return summary
