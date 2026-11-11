"""Mesin model Python vs fixture bersama (shared/model-fixtures)."""

import json
from pathlib import Path

import pytest

from app.services import modeling as eng

FIX = Path(__file__).resolve().parents[2] / "shared" / "model-fixtures"
CASES = json.loads((FIX / "cases.json").read_text(encoding="utf-8"))
GOLDEN = json.loads((FIX / "golden.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_fixture(case: dict) -> None:
    if "error" in case:
        with pytest.raises(eng.ModelError) as e:
            eng.solve(case["model"])
        assert str(e.value) == case["error"]
        assert eng.describe(case["model"]) == "Model belum lengkap"
        return
    out = eng.solve(case["model"])
    assert out["result"] == case["result"]
    g = GOLDEN[case["name"]]
    assert out["steps"] == g["steps"]
    assert eng.describe(case["model"]) == g["describe"]


@pytest.mark.parametrize(
    ("value", "text"),
    [(0, "0"), (1000, "1.000"), (-3, "−3"), (2.5, "2,5"), (5.625, "5,63"), (480000, "480.000"), (-0.001, "0")],
)
def test_fmt(value: float, text: str) -> None:
    assert eng.fmt(value) == text


def test_steps_are_indonesian_and_one_op_each() -> None:
    out = eng.solve(CASES[1]["model"])
    assert out["steps"][0]["text"] == "Mulai dari gudang."
    assert out["steps"][1]["expr"] == "(1, −2 + 4) = (1, 2)"
