"""Penilaian Lab Pemodelan per langkah (docs/13 §3 dan §9). Fungsi murni."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.services import modeling as eng
from app.services.grading import hint_factor
from app.services.messages import MISCONCEPTIONS

STEPS = ["understand", "formulate", "solve", "interpret", "check"]
WEIGHTS = {"understand": 15, "formulate": 30, "solve": 25, "interpret": 15, "check": 15}
PROCESS = {
    "understand": "formulate",
    "formulate": "formulate",
    "solve": "employ",
    "interpret": "interpret",
    "check": "interpret",
}
MAX_TRIES = 3


@dataclass
class StepEval:
    correct: bool
    feedback: str
    misconception: str | None = None
    reveal: dict[str, Any] = field(default_factory=dict)
    model_text: str | None = None


def new_state(difficulty: int) -> dict[str, Any]:
    return {
        "current": "understand",
        "level": difficulty,
        "solution_viewed": False,
        "steps": {s: {"tries": 0, "hints": 0, "done": False, "score": 0, "revealed": False} for s in STEPS},
    }


def step_score(step: str, hints: int) -> int:
    return round(WEIGHTS[step] * hint_factor(hints))


# ------------------------------------------------------------ util


def _norm(s: Any) -> str:
    return " ".join(str(s).replace("−", "-").split()).lower()


def get_path(obj: Any, path: str) -> Any:
    for part in path.split("."):
        if not isinstance(obj, dict) or part not in obj:
            return None
        obj = obj[part]
    return obj


def _num(v: Any) -> float | None:
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.replace("−", "-").replace(",", "."))
        except ValueError:
            return None
    return None


def _pair(v: Any) -> tuple[float, float] | None:
    if isinstance(v, (list, tuple)) and len(v) == 2:
        a, b = _num(v[0]), _num(v[1])
        if a is not None and b is not None:
            return a, b
    if isinstance(v, dict):
        return _pair([v.get("x"), v.get("y")])
    return None


def _close(a: float, b: float) -> bool:
    return abs(a - b) <= 0.01


def _strip_real(v: Any) -> Any:
    if isinstance(v, dict):
        return {k: _strip_real(x) for k, x in v.items() if k not in ("real", "unit")}
    return v


def _comparable(res: dict[str, Any]) -> dict[str, Any]:
    """Abaikan kalimat deskripsi (bergantung label titik) saat membandingkan hasil."""
    return {k: v for k, v in res.items() if k != "description"}


def _flatten(m: Any) -> list[dict[str, Any]]:
    if isinstance(m, dict) and m.get("kind") == "composite":
        return eng.composite_parts(m)
    return [m] if isinstance(m, dict) else []


# ------------------------------------------------------------ evaluasi per langkah


def eval_understand(inp: dict[str, Any], priv: dict[str, Any]) -> StepEval:
    key = priv.get("tokens_key", {})
    known = {_norm(x) for x in inp.get("known", []) if isinstance(x, str)}
    asked = {_norm(x) for x in inp.get("asked", []) if isinstance(x, str)}
    miss_known = [k for k in key.get("known", []) if _norm(k) not in known]
    miss_asked = [k for k in key.get("asked", []) if _norm(k) not in asked]
    reveal = {"known": key.get("known", []), "asked": key.get("asked", [])}
    if not miss_known and not miss_asked:
        return StepEval(True, "Bagus! Semua informasi penting sudah kamu tandai.", reveal=reveal)
    parts = []
    if miss_known:
        parts.append(f"{len(miss_known)} informasi yang diketahui")
    if miss_asked:
        parts.append(f"{len(miss_asked)} hal yang ditanyakan")
    return StepEval(False, "Masih ada " + " dan ".join(parts) + " yang belum kamu tandai.", reveal=reveal)


def eval_formulate(inp: dict[str, Any], priv: dict[str, Any]) -> StepEval:
    key_model = priv["model_key"]
    student = inp.get("model")
    reveal = {"model": key_model, "model_text": eng.describe(key_model)}
    try:
        got = eng.solve(student)
    except eng.ModelError as e:
        return StepEval(False, str(e), reveal=reveal)
    text = eng.describe(student)
    want = eng.solve(key_model)
    s_parts, k_parts = _flatten(student), _flatten(key_model)
    fam_s = sorted(eng.family(p.get("kind", "")) for p in s_parts)
    fam_k = sorted(eng.family(p.get("kind", "")) for p in k_parts)
    if fam_s != fam_k:
        return StepEval(
            False,
            "Jenis model ini belum cocok dengan cerita. Baca lagi: apa yang ditanyakan?",
            model_text=text,
            reveal=reveal,
        )
    got_res, want_res = _comparable(got["result"]), _comparable(want["result"])
    if got_res == want_res:
        return StepEval(True, "Model tepat!", model_text=text, reveal=reveal)
    if _strip_real(got_res) == _strip_real(want_res):
        return StepEval(
            False, "Bentuk modelnya sudah benar. Periksa lagi skala dari cerita.", model_text=text, reveal=reveal
        )
    if fam_k == ["route"] and len(s_parts) == 1 and len(k_parts) == 1:
        gs, ks = eng.route_axis_sums(s_parts[0]), eng.route_axis_sums(k_parts[0])
        if gs and ks and (abs(gs[0]), abs(gs[1])) == (abs(ks[0]), abs(ks[1])) and gs != ks:
            return StepEval(False, MISCONCEPTIONS["MK-8"], "MK-8", model_text=text, reveal=reveal)
        if s_parts[0].get("start", {}) != k_parts[0].get("start", {}):
            sx, sy = (s_parts[0].get("start") or {}).get("x"), (s_parts[0].get("start") or {}).get("y")
            kx, ky = k_parts[0]["start"]["x"], k_parts[0]["start"]["y"]
            if (sx, sy) != (kx, ky):
                return StepEval(False, "Periksa lagi titik awal modelmu.", model_text=text, reveal=reveal)
    return StepEval(
        False, "Ada angka atau arah yang belum tepat. Cocokkan lagi dengan cerita.", model_text=text, reveal=reveal
    )


def eval_solve(inp: dict[str, Any], priv: dict[str, Any], fields: list[dict[str, Any]]) -> StepEval:
    key_model = priv["model_key"]
    expected = eng.solve(key_model)["result"]
    values = inp.get("values", {}) if isinstance(inp.get("values"), dict) else {}
    reveal = {"values": {f["key"]: get_path(expected, f["key"]) for f in fields}}
    wrong: list[str] = []
    mis: str | None = None
    for f in fields:
        path, ftype = f["key"], f.get("type", "number")
        exp = get_path(expected, path)
        got = values.get(path)
        if ftype == "point":
            g, e = _pair(got), _pair(exp)
            ok = g is not None and e is not None and _close(g[0], e[0]) and _close(g[1], e[1])
            if not ok and g and e and mis is None:
                if (g[1], g[0]) == e and e[0] != e[1]:
                    mis = "MK-1"
                elif path == "point":
                    mis = _pattern_mis(g, key_model)
        elif ftype == "yesno":
            ok = isinstance(got, bool) and got == exp
        else:
            g1, e1 = _num(got), _num(exp)
            ok = g1 is not None and e1 is not None and _close(g1, e1)
            if not ok and g1 is not None and mis is None:
                mis = _number_mis(path, g1, expected, key_model)
        if not ok:
            wrong.append(f.get("label", path))
    if not wrong:
        return StepEval(True, "Perhitunganmu benar!", reveal=reveal)
    if mis:
        return StepEval(False, MISCONCEPTIONS[mis], mis, reveal=reveal)
    return StepEval(False, "Periksa lagi: " + ", ".join(wrong) + ".", reveal=reveal)


def _number_mis(path: str, got: float, expected: dict[str, Any], model: dict[str, Any]) -> str | None:
    if path.endswith(".real"):
        parent = get_path(expected, path.rsplit(".", 1)[0]) or {}
        units, real = _num(parent.get("units")), _num(parent.get("real"))
        if units is not None and _close(got, units):
            return "MK-12"
        if path.startswith("area.") and units is not None and real is not None and units:
            per = (real / units) ** 0.5
            if _close(got, units * per):
                return "MK-7"
    if path == "travel_distance.units":
        sums = None
        for p in _flatten(model):
            sums = eng.route_axis_sums(p)
        if sums and _close(got, abs(sums[0]) + abs(sums[1])):
            return "MK-9"
    return None


def _pattern_mis(got: tuple[float, float], model: dict[str, Any]) -> str | None:
    for p in _flatten(model):
        if p.get("kind") == "point_pattern":
            f, s, n = p["first"], p["step"], p["n"]
            if _close(got[0], f["x"] + n * s["dx"]) and _close(got[1], f["y"] + n * s["dy"]):
                return "MK-10"
    return None


def eval_choice(step: str, inp: dict[str, Any], priv: dict[str, Any]) -> StepEval:
    correct_id = priv.get(f"{step}_correct")
    mis_map: dict[str, str] = priv.get(f"{step}_mis", {})
    opt = inp.get("option")
    reveal = {"option": correct_id}
    if opt == correct_id:
        msg = "Tepat! Kamu sudah mengembalikan hasil ke konteks cerita." if step == "interpret" else "Alasanmu tepat!"
        return StepEval(True, msg, reveal=reveal)
    code = mis_map.get(str(opt))
    if code:
        return StepEval(False, MISCONCEPTIONS.get(code, "Belum tepat."), code, reveal=reveal)
    if step == "interpret":
        return StepEval(False, "Belum tepat. Bandingkan dengan hasil hitunganmu dan konteks cerita.", reveal=reveal)
    return StepEval(False, "Belum tepat. Pikirkan lagi: apakah hasilnya masuk akal?", reveal=reveal)


def evaluate(step: str, inp: dict[str, Any], priv: dict[str, Any], content: dict[str, Any]) -> StepEval:
    if step == "understand":
        return eval_understand(inp, priv)
    if step == "formulate":
        return eval_formulate(inp, priv)
    if step == "solve":
        return eval_solve(inp, priv, content.get("answer_fields", []))
    return eval_choice(step, inp, priv)
