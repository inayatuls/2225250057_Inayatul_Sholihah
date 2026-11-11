from app.seed import load_questions, validate_all
from app.services.grading import grade, on_line, quadrant_of
from app.services.modeling_flow import eval_choice, eval_formulate, eval_solve, eval_understand

KEY_PLOT = {"answer": {"points": [{"x": 4, "y": 2}]}, "feedback": {}}


def test_quadrant_of() -> None:
    assert quadrant_of(3, 2) == "I"
    assert quadrant_of(-3, 2) == "II"
    assert quadrant_of(-1, -1) == "III"
    assert quadrant_of(1, -1) == "IV"
    assert quadrant_of(0, 5) == "y-axis"
    assert quadrant_of(0, 0) == "origin"


def test_on_line() -> None:
    assert on_line((7, 1), (-2, 1), (3, 1))
    assert on_line((2, 8), (2, -3), (2, 4))
    assert on_line((1, 1), (0, 0), (3, 3))
    assert not on_line((1, 2), (0, 0), (3, 3))


def test_plot_correct_and_hint_penalty() -> None:
    r = grade("plot_point", {"points": [{"x": 4, "y": 2}]}, KEY_PLOT, 0)
    assert r.is_correct and r.score == 100
    assert grade("plot_point", {"points": [{"x": 4, "y": 2}]}, KEY_PLOT, 1).score == 90
    assert grade("plot_point", {"points": [{"x": 4, "y": 2}]}, KEY_PLOT, 2).score == 75
    assert grade("plot_point", {"points": [{"x": 4, "y": 2}]}, KEY_PLOT, 3).score == 60


def test_plot_swapped_is_mk1() -> None:
    r = grade("plot_point", {"points": [{"x": 2, "y": 4}]}, KEY_PLOT, 0)
    assert not r.is_correct and r.misconception_code == "MK-1"


def test_plot_sign_is_mk2() -> None:
    r = grade("plot_point", {"points": [{"x": -4, "y": 2}]}, KEY_PLOT, 0)
    assert r.misconception_code == "MK-2"


def test_plot_direction_feedback() -> None:
    r = grade("plot_point", {"points": [{"x": 3, "y": -2}]}, KEY_PLOT, 0)
    assert r.feedback == "Titikmu di (3, −2). Coba geser 1 kotak ke kanan dan 4 kotak ke atas."


def test_draw_line_any_two_points_on_line() -> None:
    key = {"answer": {"line": [{"x": -2, "y": 1}, {"x": 3, "y": 1}]}, "feedback": {}}
    assert grade("draw_line", {"points": [{"x": 0, "y": 1}, {"x": 7, "y": 1}]}, key, 0).is_correct
    assert not grade("draw_line", {"points": [{"x": 0, "y": 1}, {"x": 0, "y": 1}]}, key, 0).is_correct
    assert not grade("draw_line", {"points": [{"x": 0, "y": 1}, {"x": 7, "y": 2}]}, key, 0).is_correct


def test_custom_misconception_match() -> None:
    q = next(x for x in load_questions() if x["slug"] == "m3-rel-002")
    r = grade("relative_point", {"points": [{"x": -3, "y": 4}]}, q, 0)
    assert r.misconception_code == "MK-3"


def test_reasoning_item_partial_score() -> None:
    q = next(x for x in load_questions() if x["slug"] == "m6-lit-005")
    assert grade("multiple_choice", {"option": "b", "reason": "r1"}, q, 0).score == 100
    partial = grade("multiple_choice", {"option": "b", "reason": "r2"}, q, 0)
    assert partial.score == 50 and not partial.is_correct


def test_seed_bank_valid() -> None:
    assert validate_all() >= 30


# ------------------------------------------------------------ Lab Pemodelan


def _q(slug: str) -> dict:
    return next(x for x in load_questions() if x["slug"] == slug)


def test_understand_missing_tokens() -> None:
    q = _q("m5-mod-002")
    ev = eval_understand({"known": ["(1, −2)", "4 satuan ke utara"], "asked": ["posisi akhir"]}, q)
    assert not ev.correct
    assert ev.feedback == "Masih ada 3 informasi yang diketahui dan 1 hal yang ditanyakan yang belum kamu tandai."
    ev2 = eval_understand(q["tokens_key"], q)
    assert ev2.correct


def test_formulate_order_independent() -> None:
    q = _q("m5-mod-002")
    model = {
        "kind": "route_chain",
        "start": {"x": 1, "y": -2},
        "moves": [{"dir": "barat", "n": 5}, {"dir": "utara", "n": 4}, {"dir": "selatan", "n": 1}],
        "scale": {"per_unit": 100, "unit": "m"},
    }
    assert eval_formulate({"model": model}, q).correct


def test_formulate_direction_flip_is_mk8() -> None:
    q = _q("m5-mod-002")
    model = {
        "kind": "route_chain",
        "start": {"x": 1, "y": -2},
        "moves": [{"dir": "utara", "n": 4}, {"dir": "timur", "n": 5}, {"dir": "selatan", "n": 1}],
        "scale": {"per_unit": 100, "unit": "m"},
    }
    ev = eval_formulate({"model": model}, q)
    assert not ev.correct and ev.misconception == "MK-8"


def test_formulate_missing_scale() -> None:
    q = _q("m5-mod-002")
    model = {
        "kind": "route_chain",
        "start": {"x": 1, "y": -2},
        "moves": [{"dir": "utara", "n": 4}, {"dir": "barat", "n": 5}, {"dir": "selatan", "n": 1}],
    }
    ev = eval_formulate({"model": model}, q)
    assert not ev.correct and "skala" in ev.feedback


def test_formulate_wrong_family() -> None:
    q = _q("m6-mod-001")
    model = {"kind": "axis_distance", "a": {"x": -3, "y": -1}, "b": {"x": 5, "y": -1}}
    assert not eval_formulate({"model": model}, q).correct


def test_solve_scale_misconceptions() -> None:
    q = _q("m6-mod-001")
    fields = q["answer_fields"]
    ok = eval_solve({"values": {"missing": [-3, 3], "area.real": 128}}, q, fields)
    assert ok.correct
    mk7 = eval_solve({"values": {"missing": [-3, 3], "area.real": 64}}, q, fields)
    assert mk7.misconception == "MK-7"
    mk12 = eval_solve({"values": {"missing": [-3, 3], "area.real": 32}}, q, fields)
    assert mk12.misconception == "MK-12"


def test_solve_pattern_off_by_one() -> None:
    q = _q("m6-mod-002")
    ev = eval_solve({"values": {"point": [12, 5], "inside": False}}, q, q["answer_fields"])
    assert ev.misconception == "MK-10"
    assert eval_solve({"values": {"point": [9, 4], "inside": False}}, q, q["answer_fields"]).correct


def test_interpret_choice_misconception() -> None:
    q = _q("m5-mod-002")
    ev = eval_choice("interpret", {"option": "b"}, q)
    assert ev.misconception == "MK-12"
    assert eval_choice("interpret", {"option": "a"}, q).correct
