from httpx import AsyncClient

from tests.conftest import register_student, register_teacher

API = "/api/v1"


async def _module_questions(c: AsyncClient, h: dict, code: str) -> list[dict]:
    r = await c.get(f"{API}/modules/{code}/questions", headers=h)
    assert r.status_code == 200, r.text
    return r.json()["questions"]


async def test_register_login_refresh_logout(client: AsyncClient) -> None:
    await register_student(client)
    dup = await client.post(
        f"{API}/auth/register/student", json={"display_name": "X", "username": "RAKA08", "password": "rahasia1"}
    )
    assert dup.status_code == 409 and dup.json()["detail"]["code"] == "USERNAME_TAKEN"
    bad = await client.post(f"{API}/auth/login", json={"identifier": "raka08", "password": "salah"})
    assert bad.status_code == 401
    ok = await client.post(f"{API}/auth/login", json={"identifier": "raka08", "password": "rahasia1"})
    assert ok.status_code == 200
    ref = await client.post(f"{API}/auth/refresh")
    assert ref.status_code == 200 and ref.json()["user"]["username"] == "raka08"
    await client.post(f"{API}/auth/logout")
    assert (await client.post(f"{API}/auth/refresh")).status_code == 401


async def test_answer_key_never_sent(client: AsyncClient) -> None:
    h = await register_student(client)
    for code in ("M1", "M5"):
        await client.patch(f"{API}/progress/{code}", json={"last_segment_index": 0}, headers=h)
    r = await client.get(f"{API}/modules/M1/questions", headers=h)
    body = r.text
    for secret in ('"answer"', '"feedback"', '"hints"', '"explanation"', "model_key", "tokens_key"):
        assert secret not in body


async def test_module_locking_and_progress(client: AsyncClient) -> None:
    h = await register_student(client)
    mods = (await client.get(f"{API}/modules", headers=h)).json()
    assert mods[0]["progress"]["status"] == "not_started"
    assert mods[1]["progress"]["status"] == "locked"
    assert (await client.get(f"{API}/modules/M2", headers=h)).status_code == 403
    answers = {
        "m1-quad-001": {"quadrant": "II"},
        "m1-mc-001": {"option": "c"},
        "m1-mc-002": {"option": "b"},
        "m1-quad-002": {"quadrant": "IV"},
        "m1-mc-003": {"option": "c"},
        "m1-mc-004": {"option": "b"},
    }
    for q in await _module_questions(client, h, "M1"):
        r = await client.post(f"{API}/attempts", json={"question_id": q["id"], "answer": answers[q["slug"]]}, headers=h)
        assert r.status_code == 200 and r.json()["is_correct"], r.text
    mods = (await client.get(f"{API}/modules", headers=h)).json()
    assert mods[0]["progress"] == {**mods[0]["progress"], "status": "completed", "best_score": 100, "stars": 3}
    assert mods[1]["progress"]["status"] == "not_started"


async def test_hint_reduces_score_and_reveal_after_three(client: AsyncClient) -> None:
    h = await register_student(client)
    q = (await _module_questions(client, h, "M1"))[0]
    assert (await client.get(f"{API}/questions/{q['id']}/hints/2", headers=h)).status_code == 409
    hint = await client.get(f"{API}/questions/{q['id']}/hints/1", headers=h)
    assert hint.json()["max_score_after"] == 90
    for i in range(3):
        r = (
            await client.post(f"{API}/attempts", json={"question_id": q["id"], "answer": {"quadrant": "I"}}, headers=h)
        ).json()
        assert not r["is_correct"]
        assert (r["explanation"] is not None) == (i == 2)
    r = (
        await client.post(f"{API}/attempts", json={"question_id": q["id"], "answer": {"quadrant": "II"}}, headers=h)
    ).json()
    assert r["score"] == 90


async def test_modeling_full_flow(client: AsyncClient) -> None:
    h = await register_student(client)
    # buka semua modul untuk tes: guru menonaktifkan penguncian berurutan
    t = await register_teacher(client)
    cls = (await client.post(f"{API}/classes", json={"name": "VIII-A"}, headers=t)).json()
    await client.patch(f"{API}/classes/{cls['id']}", json={"sequential_unlock": False}, headers=t)
    assert (
        await client.post(f"{API}/classes/join", json={"join_code": cls["join_code"]}, headers=h)
    ).status_code == 200

    q = next(x for x in await _module_questions(client, h, "M5") if x["slug"] == "m5-mod-002")
    assert "model_key" not in q and "prefill_tokens" not in q
    start = (await client.post(f"{API}/modeling/attempts", json={"question_id": q["id"]}, headers=h)).json()
    aid = start["attempt_id"]
    base = f"{API}/modeling/attempts/{aid}"

    # Solusi belum boleh dilihat sebelum mencoba langkah Selesaikan (level 2)
    assert (await client.get(f"{base}/solution", headers=h)).status_code == 403
    # Langkah harus berurutan
    assert (await client.post(f"{base}/steps/formulate", json={"input": {}}, headers=h)).status_code == 409

    known = ["(1, −2)", "4 satuan ke utara", "5 satuan ke barat", "1 satuan ke selatan", "100 m"]
    r = (
        await client.post(
            f"{base}/steps/understand",
            json={"input": {"known": known, "asked": ["posisi akhir", "jarak tempuhnya"]}},
            headers=h,
        )
    ).json()
    assert r["is_correct"] and r["score"] == 15 and r["next_step"] == "formulate"

    await client.get(f"{base}/hints/formulate/1", headers=h)
    model = {
        "kind": "route_chain",
        "start": {"x": 1, "y": -2},
        "moves": [{"dir": "utara", "n": 4}, {"dir": "barat", "n": 5}, {"dir": "selatan", "n": 1}],
        "scale": {"per_unit": 100, "unit": "m"},
    }
    r = (await client.post(f"{base}/steps/formulate", json={"input": {"model": model}}, headers=h)).json()
    assert r["is_correct"] and r["score"] == 27  # 30 × 0,9 karena 1 hint
    assert r["model_text"] == "P = (1 − 5, −2 + 4 − 1); tempuh = 4 + 5 + 1 satuan; 1 satuan = 100 m"

    wrong = {"values": {"final_position": [-4, 1], "travel_distance.real": 10}}
    r = (await client.post(f"{base}/steps/solve", json={"input": wrong}, headers=h)).json()
    assert not r["is_correct"] and r["misconception_code"] == "MK-12"
    sol = await client.get(f"{base}/solution", headers=h)
    assert sol.status_code == 200 and sol.json()["result"]["final_position"] == [-4, 1]
    right = {"values": {"final_position": [-4, 1], "travel_distance.real": 1000}}
    r = (await client.post(f"{base}/steps/solve", json={"input": right}, headers=h)).json()
    assert r["is_correct"] and r["score"] == 25

    r = (await client.post(f"{base}/steps/interpret", json={"input": {"option": "a"}}, headers=h)).json()
    assert r["is_correct"]
    r = (await client.post(f"{base}/steps/check", json={"input": {"option": "a"}}, headers=h)).json()
    assert r["finished"] and r["total_score"] == 15 + 27 + 25 + 15 + 15

    prof = (await client.get(f"{API}/me/literacy-profile", headers=h)).json()
    by = {p["process"]: p for p in prof["processes"]}
    assert by["formulate"]["score"] == round(100 * (15 + 27) / 45)
    assert by["employ"]["score"] == 100


async def test_teacher_cannot_see_other_class(client: AsyncClient) -> None:
    t1 = await register_teacher(client, "a@sekolah.id")
    t2 = await register_teacher(client, "b@sekolah.id")
    s = await register_student(client)
    cls = (await client.post(f"{API}/classes", json={"name": "VIII-B"}, headers=t1)).json()
    await client.post(f"{API}/classes/join", json={"join_code": cls["join_code"]}, headers=s)
    for path in ("overview", "students", "items", "literacy", "export.csv"):
        r = await client.get(f"{API}/teacher/classes/{cls['id']}/{path}", headers=t2)
        assert r.status_code == 403 and r.json()["detail"]["code"] == "NOT_CLASS_OWNER"
    assert (await client.get(f"{API}/teacher/classes/{cls['id']}/overview", headers=s)).status_code == 403
    ok = await client.get(f"{API}/teacher/classes/{cls['id']}/students", headers=t1)
    assert ok.status_code == 200 and len(ok.json()["students"]) == 1


async def test_join_wrong_code_and_reset_password(client: AsyncClient) -> None:
    t = await register_teacher(client)
    s = await register_student(client)
    r = await client.post(f"{API}/classes/join", json={"join_code": "ZZZZZZ"}, headers=s)
    assert r.status_code == 404 and r.json()["detail"]["message"].startswith("Kode kelas tidak ditemukan")
    cls = (await client.post(f"{API}/classes", json={"name": "VIII-C"}, headers=t)).json()
    await client.post(f"{API}/classes/join", json={"join_code": cls["join_code"].lower()}, headers=s)
    sid = (await client.get(f"{API}/me", headers=s)).json()["id"]
    temp = (await client.post(f"{API}/classes/{cls['id']}/members/{sid}/reset-password", headers=t)).json()
    login = await client.post(
        f"{API}/auth/login", json={"identifier": "raka08", "password": temp["temporary_password"]}
    )
    assert login.json()["user"]["must_change_password"] is True


async def test_free_modeler_solve(client: AsyncClient) -> None:
    h = await register_student(client)
    m = {"kind": "rect_shape", "a": {"x": 0, "y": 0}, "b": {"x": 3, "y": 1}, "c": {"x": 3, "y": 4}}
    bad = await client.post(f"{API}/modeling/solve", json={"model": m}, headers=h)
    assert bad.status_code == 422 and bad.json()["detail"]["code"] == "INVALID_MODEL"
    m["b"] = {"x": 3, "y": 0}
    ok = await client.post(f"{API}/modeling/solve", json={"model": m}, headers=h)
    assert ok.json()["result"]["missing"] == [0, 4]
