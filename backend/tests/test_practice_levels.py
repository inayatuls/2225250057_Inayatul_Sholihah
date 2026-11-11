"""Latihan Soal (L1–L3): kebenaran matematis kunci jawaban + alur API."""

from typing import Any

from httpx import AsyncClient

from app.seed import load_questions
from app.services.grading import quadrant_of
from app.services.modeling import fmt, pt
from tests.conftest import register_student

API = "/api/v1"
QS = {q["slug"]: q for q in load_questions() if q["module"] in ("L1", "L2", "L3")}


def keyed_text(slug: str) -> str:
    q = QS[slug]
    return next(o["text"] for o in q["options"] if o["id"] == q["answer"]["option"])


def quad_label(x: float, y: float) -> str:
    return f"Kuadran {quadrant_of(x, y)}"


def dist(a: tuple[int, int], b: tuple[int, int]) -> int:
    assert a[0] == b[0] or a[1] == b[1], "hanya jarak sejajar sumbu"
    return abs(b[0] - a[0]) + abs(b[1] - a[1])


def move(p: tuple[int, int], *steps: tuple[str, int]) -> tuple[int, int]:
    d = {"timur": (1, 0), "kanan": (1, 0), "barat": (-1, 0), "kiri": (-1, 0), "utara": (0, 1), "atas": (0, 1),
         "selatan": (0, -1), "bawah": (0, -1)}  # fmt: skip
    x, y = p
    for name, n in steps:
        x, y = x + d[name][0] * n, y + d[name][1] * n
    return x, y


def rect_d(a: tuple[int, int], b: tuple[int, int], c: tuple[int, int]) -> tuple[int, int]:
    assert a[1] == b[1] and b[0] == c[0], "AB mendatar, BC tegak"
    return a[0], c[1]


# Jawaban dihitung ulang secara independen dari teks soal.
EXPECTED_MC: dict[str, str] = {
    "l1-01": "Sumbu X",
    "l1-02": "Sumbu Y",
    "l1-03": "Titik asal O(0, 0)",
    "l1-04": fmt(5),
    "l1-05": fmt(7),
    "l1-10": pt(-3, 2),
    "l1-11": "Sumbu Y" if quadrant_of(0, 6) == "y-axis" else "?",
    "l1-12": "Sumbu X" if quadrant_of(-7, 0) == "x-axis" else "?",
    "l2-01": "Titik C" if quadrant_of(-2, -5) == "III" else "?",
    "l2-03": quad_label(7, -8),
    "l2-04": fmt(-2),  # kuadran II → x < 0; satu-satunya pilihan negatif
    "l2-06": f"{dist((4, -6), (4, 3))} satuan",
    "l2-09": pt(*move((2, -1), ("kiri", 3), ("atas", 5))),
    "l2-11": "Sejajar sumbu Y",
    "l2-12": pt(*rect_d((1, 1), (5, 1), (5, 4))),
    "l3-01": pt(*move((2, 3), ("barat", 6), ("selatan", 4))),
    "l3-02": f"{fmt(dist((-3, 2), (5, 2)) * 50)} m",
    "l3-03": "Garis AB sejajar sumbu X dan garis BC sejajar sumbu Y",
    "l3-04": quad_label(3, 1),  # contoh P(−3, 1) di kuadran II → Q(3, 1)
    "l3-07": f"{dist((-2, -1), (4, -1)) * dist((4, -1), (4, 3))} satuan²",
    "l3-08": "Tidak benar" if quadrant_of(-3, 5) != quadrant_of(5, -3) else "Benar",
    "l3-09": pt(1, (2 + -4) / 2),
    "l3-10": pt(-5 + (6 - 1) * 2, 2),
}


def test_every_multiple_choice_key_is_mathematically_correct() -> None:
    mc = [s for s, q in QS.items() if q["type"] == "multiple_choice"]
    assert set(mc) - {"l3-12"} == set(EXPECTED_MC), "setiap soal pilihan ganda wajib diverifikasi"
    for slug in mc:
        if slug == "l3-12":
            continue
        assert keyed_text(slug) == EXPECTED_MC[slug], slug


def test_l3_12_combined_rectangle() -> None:
    a, b, c = (-4, 3), (2, 3), (2, -2)
    d = rect_d(a, b, c)
    keliling = 2 * (dist(a, b) + dist(b, c))
    assert keyed_text("l3-12") == f"D{pt(*d)}, keliling {keliling} satuan"


def test_l3_08_reason_is_consistent() -> None:
    assert QS["l3-08"]["answer"]["reason"] == "r1"
    assert quadrant_of(-3, 5) == "II" and quadrant_of(5, -3) == "IV"


def test_interactive_keys_are_mathematically_correct() -> None:
    def ans(slug: str) -> dict[str, Any]:
        return QS[slug]["answer"]

    assert ans("l1-06")["points"] == [{"x": 3, "y": 4}]
    assert ans("l1-07")["points"] == [{"x": -2, "y": 5}]
    p = QS["l1-08"]["canvas"]["given_points"][0]
    assert ans("l1-08") == {"x": p["x"], "y": p["y"]}
    q = QS["l1-09"]["canvas"]["given_points"][0]
    assert ans("l1-09") == {"x": q["x"], "y": q["y"]}
    assert ans("l2-02")["quadrant"] == quadrant_of(-6, -3)
    assert ans("l2-05")["value"] == dist((-3, 2), (5, 2))
    assert ans("l2-07")["value"] == abs(-4)
    bx, by = move((-1, 2), ("kanan", 4), ("bawah", 3))
    assert ans("l2-08")["points"] == [{"x": bx, "y": by}]
    line = ans("l2-10")["line"]
    assert all(pt_["y"] == -2 for pt_ in line)
    assert ans("l3-05")["value"] == 5 + 6 + 2
    cx, cy = move((-3, 1), ("timur", 5), ("selatan", 2))
    assert ans("l3-06")["points"] == [{"x": cx, "y": cy}]
    assert all(pt_["x"] == 2 for pt_ in ans("l3-11")["line"])


def test_each_level_has_at_least_ten_questions_with_solutions() -> None:
    for code in ("L1", "L2", "L3"):
        qs = [q for q in QS.values() if q["module"] == code]
        assert len(qs) >= 10, code
        assert sum(1 for q in qs if q["type"] == "multiple_choice") >= 6
        for q in qs:
            assert q["explanation"] and len(q["solution_steps"]) >= 2, q["slug"]


async def _questions(c: AsyncClient, h: dict[str, str], code: str) -> list[dict[str, Any]]:
    r = await c.get(f"{API}/modules/{code}/questions", headers=h)
    assert r.status_code == 200, r.text
    return r.json()["questions"]


async def test_practice_levels_api_flow(client: AsyncClient) -> None:
    h = await register_student(client)
    # /modules tetap hanya modul materi
    assert [m["code"] for m in (await client.get(f"{API}/modules", headers=h)).json()] == [f"M{i}" for i in range(1, 7)]
    levels = (await client.get(f"{API}/practice-levels", headers=h)).json()
    assert [(lv["code"], lv["progress"]["status"]) for lv in levels] == [
        ("L1", "not_started"),
        ("L2", "locked"),
        ("L3", "locked"),
    ]
    assert (await client.get(f"{API}/modules/L2/questions", headers=h)).status_code == 403

    qs = await _questions(client, h, "L1")
    assert len(qs) == 12 and "solution_steps" not in qs[0]
    # Satu kali jawab salah → langsung ada pembahasan & cara penyelesaian
    first = qs[0]
    wrong = (
        await client.post(f"{API}/attempts", json={"question_id": first["id"], "answer": {"option": "b"}}, headers=h)
    ).json()
    assert wrong["is_correct"] is False
    assert wrong["explanation"] and len(wrong["solution_steps"]) >= 2
    assert wrong["correct_answer"] == {"option": "a"}

    # Petunjuk direset saat latihan diulang
    await client.get(f"{API}/questions/{qs[1]['id']}/hints/1", headers=h)
    assert (await client.post(f"{API}/practice-levels/L1/start", headers=h)).status_code == 204
    r = (
        await client.post(f"{API}/attempts", json={"question_id": qs[1]["id"], "answer": {"option": "c"}}, headers=h)
    ).json()
    assert r["is_correct"] and r["score"] == 100

    # Jawab semua soal L1 → L2 terbuka
    keys = {q["slug"]: q["answer"] for q in QS.values() if q["module"] == "L1"}
    for q in qs:
        r = await client.post(f"{API}/attempts", json={"question_id": q["id"], "answer": keys[q["slug"]]}, headers=h)
        assert r.json()["is_correct"], q["slug"]
    levels = {lv["code"]: lv["progress"] for lv in (await client.get(f"{API}/practice-levels", headers=h)).json()}
    assert levels["L1"]["status"] == "completed" and levels["L1"]["stars"] == 3
    assert levels["L2"]["status"] == "not_started"
    assert levels["L3"]["status"] == "locked"
