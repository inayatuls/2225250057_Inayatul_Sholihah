"""Penilaian jawaban soal biasa (bukan pemodelan). Fungsi murni.

Lihat docs/05-bank-soal-spesifikasi.md §4 dan docs/04-desain-pembelajaran.md §6.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, TypeGuard

from app.services.modeling import fmt

HINT_FACTORS = {0: 1.0, 1: 0.9, 2: 0.75, 3: 0.6}
MAX_TRIES_BEFORE_REVEAL = 3

AUTO_MISCONCEPTIONS = {
    "MK-1": "Sepertinya x dan y tertukar. Ingat: (x, y) = (mendatar, tegak).",
    "MK-2": "Perhatikan arah: kiri dan bawah bernilai negatif.",
}


@dataclass
class GradeResult:
    is_correct: bool
    score: int
    feedback: str
    misconception_code: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


def hint_factor(level: int) -> float:
    return HINT_FACTORS.get(max(0, min(level, 3)), 0.6)


def _xy(p: Any) -> tuple[float, float] | None:
    if isinstance(p, dict) and _is_num(p.get("x")) and _is_num(p.get("y")):
        return float(p["x"]), float(p["y"])
    return None


def _is_num(v: Any) -> TypeGuard[int | float]:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _points(raw: Any) -> list[tuple[float, float]]:
    if not isinstance(raw, list):
        return []
    return [p for p in (_xy(x) for x in raw) if p is not None]


def on_line(p: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> bool:
    """Titik p pada garis melalui a dan b: (x2−x1)(y−y1) − (y2−y1)(x−x1) = 0."""
    return abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) < 1e-9


def quadrant_of(x: float, y: float) -> str:
    if x == 0 and y == 0:
        return "origin"
    if x == 0:
        return "y-axis"
    if y == 0:
        return "x-axis"
    if x > 0:
        return "I" if y > 0 else "IV"
    return "II" if y > 0 else "III"


def _matches(answer: dict[str, Any], match: dict[str, Any]) -> bool:
    """Cocokkan jawaban dengan pola miskonsepsi dari bank soal."""
    if "points" in match:
        got = sorted(_points(answer.get("points")))
        want = sorted(_points(match["points"]))
        return bool(want) and got == want
    for k, v in match.items():
        av = answer.get(k)
        if _is_num(v) and _is_num(av):
            if abs(float(av) - float(v)) > 0.01:
                return False
        elif av != v:
            return False
    return True


def _auto_point_misconception(got: tuple[float, float], want: tuple[float, float]) -> str | None:
    if got == (want[1], want[0]) and want[0] != want[1]:
        return "MK-1"
    if abs(got[0]) == abs(want[0]) and abs(got[1]) == abs(want[1]) and got != want:
        return "MK-2"
    return None


def _check(qtype: str, answer: dict[str, Any], key: dict[str, Any]) -> tuple[bool, str | None]:
    """Kembalikan (benar?, kode miskonsepsi otomatis)."""
    if qtype in ("plot_point", "relative_point"):
        got = sorted(_points(answer.get("points")))
        want = sorted(_points(key.get("points")))
        if got == want:
            return True, None
        mis = _auto_point_misconception(got[0], want[0]) if len(got) == 1 and len(want) == 1 else None
        return False, mis
    if qtype == "read_point":
        got_p = _xy(answer)
        want_p = _xy(key)
        if got_p is None or want_p is None:
            return False, None
        if got_p == want_p:
            return True, None
        return False, _auto_point_misconception(got_p, want_p)
    if qtype == "draw_line":
        pts = _points(answer.get("points"))
        line = _points(key.get("line"))
        if len(pts) != 2 or len(line) != 2 or pts[0] == pts[1]:
            return False, None
        return on_line(pts[0], line[0], line[1]) and on_line(pts[1], line[0], line[1]), None
    if qtype == "multiple_choice":
        return answer.get("option") == key.get("option"), None
    if qtype == "numeric":
        v, k = answer.get("value"), key.get("value")
        return _is_num(v) and _is_num(k) and abs(float(v) - float(k)) <= 0.01, None
    if qtype == "quadrant":
        return answer.get("quadrant") == key.get("quadrant"), None
    return False, None


def grade(qtype: str, answer: dict[str, Any], private: dict[str, Any], hint_level: int) -> GradeResult:
    """Nilai satu jawaban. `private` = answer_key soal (kunci, umpan balik, dsb.)."""
    key = private.get("answer", {})
    fb = private.get("feedback", {})
    correct, auto_mis = _check(qtype, answer, key)
    factor = hint_factor(hint_level)

    reason_key = key.get("reason")
    if reason_key is not None:
        # Butir literasi bernalar: jawaban + alasan. Hanya jawaban benar = 50.
        reason_ok = answer.get("reason") == reason_key
        if correct and reason_ok:
            return GradeResult(True, round(100 * factor), fb.get("correct", "Tepat! Jawaban dan alasanmu benar."))
        if correct:
            return GradeResult(
                False,
                round(50 * factor),
                fb.get("reason_wrong", "Jawabanmu benar, tetapi alasannya belum tepat. Baca lagi datanya."),
                extra={"partial": True},
            )

    if correct:
        return GradeResult(True, round(100 * factor), fb.get("correct", "Tepat!"))

    for mis in fb.get("misconceptions", []):
        if _matches(answer, mis.get("match", {})):
            return GradeResult(False, 0, mis["message"], mis.get("code"))
    if auto_mis:
        return GradeResult(False, 0, AUTO_MISCONCEPTIONS[auto_mis], auto_mis)
    if qtype in ("plot_point", "relative_point"):
        got = _points(answer.get("points"))
        want = _points(key.get("points"))
        if len(got) == 1 and len(want) == 1:
            return GradeResult(False, 0, _direction_hint(got[0], want[0]))
    return GradeResult(False, 0, fb.get("generic_wrong", "Belum tepat. Coba gunakan petunjuk."))


def _direction_hint(got: tuple[float, float], want: tuple[float, float]) -> str:
    dx, dy = want[0] - got[0], want[1] - got[1]
    parts = []
    if dx:
        parts.append(f"{fmt(abs(dx))} kotak ke {'kanan' if dx > 0 else 'kiri'}")
    if dy:
        parts.append(f"{fmt(abs(dy))} kotak ke {'atas' if dy > 0 else 'bawah'}")
    return f"Titikmu di ({fmt(got[0])}, {fmt(got[1])}). Coba geser " + " dan ".join(parts) + "."


def correct_answer_view(qtype: str, private: dict[str, Any]) -> dict[str, Any]:
    """Kunci yang aman ditampilkan setelah benar / batas percobaan habis."""
    return dict(private.get("answer", {}))
