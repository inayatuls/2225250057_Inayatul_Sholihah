"""Pemuat data materi, stimulus, dan soal (idempoten berdasarkan code/slug)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import LessonSegment, Module, Question, Stimulus
from app.services import modeling as eng
from app.services.modeling_flow import get_path

SEED_DIR = Path(__file__).parent

# Field yang TIDAK boleh dikirim ke klien.
PRIVATE_KEYS = {
    "answer",
    "feedback",
    "hints",
    "explanation",
    "model_key",
    "solve_key",
    "tokens_key",
    "step_hints",
    "interpret_correct",
    "interpret_mis",
    "check_correct",
    "check_mis",
    "solution_steps",
}
META_KEYS = {"slug", "module", "type", "difficulty", "objective", "literacy", "stimulus"}
QUESTION_TYPES = {
    "plot_point",
    "read_point",
    "relative_point",
    "draw_line",
    "multiple_choice",
    "numeric",
    "quadrant",
    "modeling",
}


class SeedError(ValueError):
    pass


def load_json(name: str) -> Any:
    return json.loads((SEED_DIR / name).read_text(encoding="utf-8"))


def load_questions() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for f in sorted((SEED_DIR / "questions").glob("*.json")):
        out.extend(json.loads(f.read_text(encoding="utf-8")))
    return out


def _subset_equal(expected: Any, actual: Any) -> bool:
    if isinstance(expected, dict):
        return isinstance(actual, dict) and all(_subset_equal(v, actual.get(k)) for k, v in expected.items())
    return expected == actual


def validate_question(q: dict[str, Any]) -> None:
    slug = q.get("slug", "?")
    if q.get("type") not in QUESTION_TYPES:
        raise SeedError(f"{slug}: tipe soal tidak dikenal")
    for k in ("slug", "module", "difficulty", "objective", "prompt"):
        if k not in q:
            raise SeedError(f"{slug}: field '{k}' wajib")
    if q["type"] == "modeling":
        try:
            out = eng.solve(q["model_key"])
        except eng.ModelError as e:
            raise SeedError(f"{slug}: model_key tidak valid: {e}") from e
        if not _subset_equal(q.get("solve_key", {}), out["result"]):
            raise SeedError(f"{slug}: solve_key {q.get('solve_key')} ≠ hasil mesin {out['result']}")
        for f in q.get("answer_fields", []):
            if get_path(out["result"], f["key"]) is None:
                raise SeedError(f"{slug}: answer_field '{f['key']}' tidak ada di hasil mesin")
        tapp = q.get("tappables", [])
        for t in tapp:
            if t not in q["prompt"]:
                raise SeedError(f"{slug}: tappable '{t}' tidak ada di teks soal")
        for t in q["tokens_key"]["known"] + q["tokens_key"]["asked"]:
            if t not in tapp:
                raise SeedError(f"{slug}: token kunci '{t}' bukan tappable")
        for step in ("interpret", "check"):
            ids = {o["id"] for o in q[f"{step}_options"]}
            if q[f"{step}_correct"] not in ids:
                raise SeedError(f"{slug}: {step}_correct tidak ada di opsi")
    else:
        if "answer" not in q:
            raise SeedError(f"{slug}: kunci 'answer' wajib")
        if q["type"] == "multiple_choice":
            ids = {o["id"] for o in q.get("options", [])}
            if q["answer"].get("option") not in ids:
                raise SeedError(f"{slug}: kunci pilihan ganda tidak ada di opsi")
    if len(q.get("hints", [])) > 3:
        raise SeedError(f"{slug}: hint maksimal 3")


def validate_practice(q: dict[str, Any]) -> None:
    """Soal Latihan Soal wajib punya pembahasan dan cara penyelesaian."""
    slug = q.get("slug", "?")
    if not q.get("explanation"):
        raise SeedError(f"{slug}: soal latihan wajib punya 'explanation'")
    steps = q.get("solution_steps")
    if not isinstance(steps, list) or len(steps) < 2:
        raise SeedError(f"{slug}: soal latihan wajib punya minimal 2 'solution_steps'")


def split_question(q: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Pisahkan konten publik dan kunci privat."""
    public = {k: v for k, v in q.items() if k not in PRIVATE_KEYS and k not in META_KEYS}
    private = {k: v for k, v in q.items() if k in PRIVATE_KEYS}
    if q["type"] == "modeling" and q.get("known_mode") == "auto":
        public["prefill_tokens"] = q["tokens_key"]
    return public, private


def validate_all() -> int:
    qs = load_questions()
    slugs = [q["slug"] for q in qs]
    dup = {s for s in slugs if slugs.count(s) > 1}
    if dup:
        raise SeedError(f"slug ganda: {dup}")
    practice = {m["code"] for m in load_json("modules.json") if m.get("kind") == "practice"}
    for q in qs:
        validate_question(q)
        if q["module"] in practice:
            validate_practice(q)
    for code in practice:
        n = sum(1 for q in qs if q["module"] == code)
        if n < 10:
            raise SeedError(f"level {code}: minimal 10 soal (sekarang {n})")
    return len(qs)


async def seed(db: AsyncSession) -> dict[str, int]:
    validate_all()
    modules = load_json("modules.json")
    code_to_id: dict[str, str] = {}
    for m in modules:
        row = (await db.execute(select(Module).where(Module.code == m["code"]))).scalar_one_or_none()
        if row is None:
            row = Module(code=m["code"], order_index=m["order_index"], title=m["title"])
            db.add(row)
        row.title = m["title"]
        row.kind = m.get("kind", "module")
        row.subtitle = m.get("subtitle", "")
        row.order_index = m["order_index"]
        row.objective_codes = m.get("objective_codes", "")
        row.minutes = m.get("minutes", 20)
        await db.flush()
        code_to_id[m["code"]] = row.id
        await db.execute(delete(LessonSegment).where(LessonSegment.module_id == row.id))
        for i, seg in enumerate(m.get("segments", [])):
            content = {k: v for k, v in seg.items() if k != "kind"}
            db.add(LessonSegment(module_id=row.id, order_index=i, kind=seg["kind"], content=content))

    stim_to_id: dict[str, str] = {}
    for s in load_json("stimuli.json"):
        srow = (await db.execute(select(Stimulus).where(Stimulus.slug == s["slug"]))).scalar_one_or_none()
        if srow is None:
            srow = Stimulus(slug=s["slug"], module_id=code_to_id[s["module"]], title=s["title"], context=s["context"])
            db.add(srow)
        srow.module_id = code_to_id[s["module"]]
        srow.title = s["title"]
        srow.context = s["context"]
        srow.content = s["content"]
        await db.flush()
        stim_to_id[s["slug"]] = srow.id

    counters: dict[str, int] = {}
    n = 0
    for q in load_questions():
        public, private = split_question(q)
        mod = q["module"]
        counters[mod] = counters.get(mod, 0) + 1
        qrow = (await db.execute(select(Question).where(Question.slug == q["slug"]))).scalar_one_or_none()
        if qrow is None:
            qrow = Question(slug=q["slug"])
            db.add(qrow)
        elif qrow.content != public or qrow.answer_key != private:
            qrow.version = (qrow.version or 1) + 1
        qrow.module_id = code_to_id[mod]
        qrow.stimulus_id = stim_to_id.get(q["stimulus"]) if q.get("stimulus") else None
        qrow.type = q["type"]
        qrow.difficulty = q["difficulty"]
        qrow.objective = q["objective"]
        qrow.order_index = counters[mod]
        qrow.literacy = q.get("literacy")
        qrow.content = public
        qrow.answer_key = private
        qrow.is_active = True
        n += 1
    await db.commit()
    return {"modules": len(modules), "questions": n, "stimuli": len(stim_to_id)}
