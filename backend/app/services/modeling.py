"""Mesin model KartesiusKu (MP-1 s.d. MP-8).

Fungsi murni dan deterministik. Implementasi ini HARUS identik dengan
`frontend/src/lib/math/models/` — keduanya diuji dengan `shared/model-fixtures/`.
Lihat docs/13-literasi-dan-pemodelan.md §4–§5.
"""

from __future__ import annotations

import math
from typing import Any

Json = dict[str, Any]
Num = int | float

MINUS = "−"
MAX_COORD = 1000
MAX_SCALE = 1_000_000

DIRS: dict[str, tuple[int, int]] = {
    "utara": (0, 1),
    "atas": (0, 1),
    "selatan": (0, -1),
    "bawah": (0, -1),
    "timur": (1, 0),
    "kanan": (1, 0),
    "barat": (-1, 0),
    "kiri": (-1, 0),
}

MODEL_KINDS = (
    "translate",
    "route_chain",
    "axis_distance",
    "relative_position",
    "axis_line",
    "rect_shape",
    "right_triangle",
    "point_pattern",
    "composite",
)


class ModelError(ValueError):
    """Model tidak valid. Pesan selalu ramah dan berbahasa Indonesia."""


# ---------------------------------------------------------------- format angka


def r2(v: Num) -> Num:
    """Bulatkan ke 2 desimal, setara `Math.floor(v * 100 + 0.5) / 100` di JS."""
    val = math.floor(v * 100 + 0.5) / 100
    return int(val) if val == int(val) else val


def fmt(v: Num) -> str:
    """Format angka gaya Indonesia: 1.000 dan 2,5; minus memakai tanda '−'."""
    neg = v < 0
    cents = math.floor(abs(v) * 100 + 0.5)
    whole, frac = divmod(cents, 100)
    s = f"{whole:,}".replace(",", ".")
    if frac:
        s += "," + (str(frac // 10) if frac % 10 == 0 else f"{frac:02d}")
    return MINUS + s if neg and cents != 0 else s


def par(v: Num) -> str:
    """Bilangan negatif diberi kurung, mis. (−3)."""
    return f"({fmt(v)})" if v < 0 else fmt(v)


def pt(x: Num, y: Num) -> str:
    return f"({fmt(x)}, {fmt(y)})"


def _step(text: str, expr: str, canvas: Json | None = None) -> Json:
    s: Json = {"text": text, "expr": expr}
    if canvas is not None:
        s["canvas"] = canvas
    return s


# ---------------------------------------------------------------- validasi


def _num(v: Any, name: str, limit: Num = MAX_COORD) -> Num:
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
        raise ModelError(f"Nilai {name} harus berupa angka.")
    if abs(v) > limit:
        raise ModelError(f"Nilai {name} terlalu besar.")
    return v


def _point(p: Any, name: str) -> tuple[Num, Num, str]:
    if not isinstance(p, dict):
        raise ModelError(f"Koordinat {name} belum diisi.")
    x = _num(p.get("x"), f"x {name}")
    y = _num(p.get("y"), f"y {name}")
    label = p.get("label")
    return x, y, label if isinstance(label, str) and label.strip() else ""


def _scale(m: Json) -> tuple[Num, str] | None:
    s = m.get("scale")
    if s is None:
        return None
    if not isinstance(s, dict):
        raise ModelError("Skala belum lengkap.")
    per = _num(s.get("per_unit"), "skala", MAX_SCALE)
    if per <= 0:
        raise ModelError("Skala harus lebih dari 0.")
    unit = s.get("unit")
    unit = unit.strip()[:10] if isinstance(unit, str) and unit.strip() else "m"
    return per, unit


def _qty(units: Num, sc: tuple[Num, str] | None) -> Json:
    q: Json = {"units": r2(units)}
    if sc:
        q["real"] = r2(units * sc[0])
        q["unit"] = sc[1]
    return q


def _area_qty(units: Num, sc: tuple[Num, str] | None) -> Json:
    q: Json = {"units": r2(units)}
    if sc:
        q["real"] = r2(units * sc[0] * sc[0])
        q["unit"] = sc[1] + "²"
    return q


def _scale_step(value: Num, sc: tuple[Num, str]) -> Json:
    per, unit = sc
    return _step(
        f"Skala 1 satuan = {fmt(per)} {unit}.",
        f"{fmt(value)} × {fmt(per)} = {fmt(r2(value * per))} {unit}",
    )


def _scale_text(sc: tuple[Num, str] | None) -> str:
    return f"; 1 satuan = {fmt(sc[0])} {sc[1]}" if sc else ""


# ---------------------------------------------------------------- MP-1 & MP-2


def _moves(m: Json) -> list[tuple[str, Num]]:
    moves = m.get("moves")
    if not isinstance(moves, list) or not moves:
        raise ModelError("Tambahkan minimal satu perpindahan.")
    if len(moves) > 10:
        raise ModelError("Perpindahan paling banyak 10 langkah.")
    out: list[tuple[str, Num]] = []
    for i, mv in enumerate(moves):
        d = mv.get("dir") if isinstance(mv, dict) else None
        if d not in DIRS:
            raise ModelError(f"Arah perpindahan ke-{i + 1} belum dipilih.")
        n = _num(mv.get("n"), "banyak langkah")
        if n <= 0:
            raise ModelError("Banyak langkah harus lebih dari 0.")
        out.append((d, n))
    return out


def _solve_route(m: Json) -> tuple[Json, list[Json]]:
    x, y, label = _point(m.get("start"), "titik awal")
    moves = _moves(m)
    sc = _scale(m)
    steps = [_step(f"Mulai dari {label or 'titik awal'}.", pt(x, y), {"point": [x, y]})]
    travel: Num = 0
    for d, n in moves:
        dx, dy = DIRS[d]
        if dx:
            nx, ny = r2(x + dx * n), y
            word, op = ("bertambah", "+") if dx > 0 else ("berkurang", MINUS)
            text = f"Ke {d} {fmt(n)} satuan: x {word} {fmt(n)}."
            expr = f"({fmt(x)} {op} {fmt(n)}, {fmt(y)}) = {pt(nx, ny)}"
        else:
            nx, ny = x, r2(y + dy * n)
            word, op = ("bertambah", "+") if dy > 0 else ("berkurang", MINUS)
            text = f"Ke {d} {fmt(n)} satuan: y {word} {fmt(n)}."
            expr = f"({fmt(x)}, {fmt(y)} {op} {fmt(n)}) = {pt(nx, ny)}"
        steps.append(_step(text, expr, {"arrow": [[x, y], [nx, ny]]}))
        x, y = nx, ny
        travel = r2(travel + n)
    steps.append(_step("Posisi akhir ditemukan.", pt(x, y), {"point": [x, y]}))
    if len(moves) > 1:
        sum_expr = " + ".join(fmt(n) for _, n in moves) + f" = {fmt(travel)} satuan"
    else:
        sum_expr = f"{fmt(travel)} satuan"
    steps.append(_step("Jarak tempuh = jumlah semua langkah.", sum_expr))
    if sc:
        steps.append(_scale_step(travel, sc))
    return {"final_position": [x, y], "travel_distance": _qty(travel, sc)}, steps


def _describe_route(m: Json) -> str:
    x, y, _ = _point(m.get("start"), "titik awal")
    moves = _moves(m)
    sc = _scale(m)
    xs, ys = [fmt(x)], [fmt(y)]
    for d, n in moves:
        dx, dy = DIRS[d]
        if dx:
            xs.append(f"{'+' if dx > 0 else MINUS} {fmt(n)}")
        else:
            ys.append(f"{'+' if dy > 0 else MINUS} {fmt(n)}")
    tempuh = " + ".join(fmt(n) for _, n in moves)
    return f"P = ({' '.join(xs)}, {' '.join(ys)}); tempuh = {tempuh} satuan{_scale_text(sc)}"


# ---------------------------------------------------------------- MP-3


def _axis_pair(m: Json) -> tuple[Num, Num, Num, Num, bool]:
    ax, ay, _ = _point(m.get("a"), "A")
    bx, by, _ = _point(m.get("b"), "B")
    if ax == bx and ay == by:
        raise ModelError("Kedua titik masih sama. Pilih dua titik yang berbeda.")
    if ay == by:
        return ax, ay, bx, by, True
    if ax == bx:
        return ax, ay, bx, by, False
    raise ModelError("Kedua titik harus segaris mendatar atau tegak (nilai x atau y-nya sama).")


def _solve_axis_distance(m: Json) -> tuple[Json, list[Json]]:
    ax, ay, bx, by, horizontal = _axis_pair(m)
    sc = _scale(m)
    if horizontal:
        d = r2(abs(bx - ax))
        steps = [
            _step(
                "Kedua titik memiliki nilai y yang sama, jadi jaraknya diukur mendatar.",
                f"{pt(ax, ay)} dan {pt(bx, by)}",
                {"points": [[ax, ay], [bx, by]]},
            ),
            _step("Jarak = |x₂ − x₁|.", f"|{fmt(bx)} − {par(ax)}| = {fmt(d)} satuan", {"arrow": [[ax, ay], [bx, by]]}),
        ]
    else:
        d = r2(abs(by - ay))
        steps = [
            _step(
                "Kedua titik memiliki nilai x yang sama, jadi jaraknya diukur tegak.",
                f"{pt(ax, ay)} dan {pt(bx, by)}",
                {"points": [[ax, ay], [bx, by]]},
            ),
            _step("Jarak = |y₂ − y₁|.", f"|{fmt(by)} − {par(ay)}| = {fmt(d)} satuan", {"arrow": [[ax, ay], [bx, by]]}),
        ]
    if sc:
        steps.append(_scale_step(d, sc))
    return {"distance": _qty(d, sc)}, steps


def _describe_axis_distance(m: Json) -> str:
    ax, ay, bx, by, horizontal = _axis_pair(m)
    sc = _scale(m)
    inner = f"{fmt(bx)} − {par(ax)}" if horizontal else f"{fmt(by)} − {par(ay)}"
    return f"d = |{inner}|{_scale_text(sc)}"


# ---------------------------------------------------------------- MP-4


def _solve_relative(m: Json) -> tuple[Json, list[Json]]:
    ax, ay, al = _point(m.get("a"), "A")
    bx, by, bl = _point(m.get("b"), "B")
    al, bl = al or "A", bl or "B"
    dx, dy = r2(bx - ax), r2(by - ay)
    parts: list[str] = []
    if dx > 0:
        parts.append(f"{fmt(dx)} satuan ke kanan (timur)")
    elif dx < 0:
        parts.append(f"{fmt(-dx)} satuan ke kiri (barat)")
    if dy > 0:
        parts.append(f"{fmt(dy)} satuan ke atas (utara)")
    elif dy < 0:
        parts.append(f"{fmt(-dy)} satuan ke bawah (selatan)")
    desc = f"{bl} berada " + " dan ".join(parts) + f" dari {al}." if parts else f"{bl} berimpit dengan {al}."
    steps = [
        _step("Selisih x = x_B − x_A.", f"{fmt(bx)} − {par(ax)} = {fmt(dx)}", {"arrow": [[ax, ay], [bx, ay]]}),
        _step("Selisih y = y_B − y_A.", f"{fmt(by)} − {par(ay)} = {fmt(dy)}", {"arrow": [[bx, ay], [bx, by]]}),
        _step("Artinya:", desc, {"points": [[ax, ay], [bx, by]]}),
    ]
    return {"dx": dx, "dy": dy, "description": desc}, steps


def _describe_relative(m: Json) -> str:
    ax, ay, _ = _point(m.get("a"), "A")
    bx, by, _ = _point(m.get("b"), "B")
    return f"(x_B − x_A, y_B − y_A) = ({fmt(bx)} − {par(ax)}, {fmt(by)} − {par(ay)})"


# ---------------------------------------------------------------- MP-5


def _line_parts(m: Json) -> tuple[Num, Num, str]:
    tx, ty, _ = _point(m.get("through"), "titik pada garis")
    p = m.get("parallel_to")
    if p not in ("x", "y"):
        raise ModelError("Pilih garis sejajar sumbu X atau sumbu Y.")
    return tx, ty, p


def _solve_axis_line(m: Json) -> tuple[Json, list[Json]]:
    tx, ty, p = _line_parts(m)
    sc = _scale(m)
    if p == "x":
        k = ty
        eq = f"y = {fmt(k)}"
        steps = [_step("Garis sejajar sumbu X, jadi semua titiknya memiliki nilai y yang sama.", eq, {"hline": k})]
    else:
        k = tx
        eq = f"x = {fmt(k)}"
        steps = [_step("Garis sejajar sumbu Y, jadi semua titiknya memiliki nilai x yang sama.", eq, {"vline": k})]
    res: Json = {"equation": eq}
    if m.get("from") is not None:
        fx, fy, _ = _point(m.get("from"), "titik asal")
        if p == "x":
            nx, ny = fx, k
            d = r2(abs(k - fy))
            dexpr = f"|{fmt(k)} − {par(fy)}| = {fmt(d)} satuan"
        else:
            nx, ny = k, fy
            d = r2(abs(k - fx))
            dexpr = f"|{fmt(k)} − {par(fx)}| = {fmt(d)} satuan"
        steps.append(
            _step(
                "Titik terdekat di garis dicapai dengan berjalan tegak lurus ke garis.",
                pt(nx, ny),
                {"arrow": [[fx, fy], [nx, ny]]},
            )
        )
        steps.append(_step("Jarak terpendek ke garis.", dexpr))
        if sc:
            steps.append(_scale_step(d, sc))
        res["nearest"] = [nx, ny]
        res["distance"] = _qty(d, sc)
    return res, steps


def _describe_axis_line(m: Json) -> str:
    tx, ty, p = _line_parts(m)
    sc = _scale(m)
    eq = f"y = {fmt(ty)}" if p == "x" else f"x = {fmt(tx)}"
    extra = ""
    if m.get("from") is not None:
        fx, fy, _ = _point(m.get("from"), "titik asal")
        extra = f"; dari {pt(fx, fy)} tegak lurus ke garis"
    return f"Garis: {eq}{extra}{_scale_text(sc)}"


# ---------------------------------------------------------------- MP-6


def _right_angle(m: Json, msg: str) -> tuple[tuple[Num, Num], tuple[Num, Num], tuple[Num, Num], bool]:
    ax, ay, _ = _point(m.get("a"), "A")
    bx, by, _ = _point(m.get("b"), "B")
    cx, cy, _ = _point(m.get("c"), "C")
    ab_h = ay == by and ax != bx
    ab_v = ax == bx and ay != by
    bc_h = by == cy and bx != cx
    bc_v = bx == cx and by != cy
    if not ((ab_h and bc_v) or (ab_v and bc_h)):
        raise ModelError(msg)
    return (ax, ay), (bx, by), (cx, cy), ab_h


RECT_MSG = "Titik A, B, C harus membentuk sudut siku di B dengan sisi sejajar sumbu."


def _rect_sides(m: Json) -> Json:
    (ax, ay), (bx, by), (cx, cy), ab_h = _right_angle(m, RECT_MSG)
    if ab_h:
        return {
            "d": (ax, cy),
            "p": r2(abs(bx - ax)),
            "pexpr": f"|{fmt(bx)} − {par(ax)}|",
            "l": r2(abs(cy - by)),
            "lexpr": f"|{fmt(cy)} − {par(by)}|",
            "dtext": "D sejajar tegak dengan A dan sejajar mendatar dengan C, jadi D = (x_A, y_C).",
            "pts": [[ax, ay], [bx, by], [cx, cy]],
        }
    return {
        "d": (cx, ay),
        "p": r2(abs(cx - bx)),
        "pexpr": f"|{fmt(cx)} − {par(bx)}|",
        "l": r2(abs(by - ay)),
        "lexpr": f"|{fmt(by)} − {par(ay)}|",
        "dtext": "D sejajar mendatar dengan A dan sejajar tegak dengan C, jadi D = (x_C, y_A).",
        "pts": [[ax, ay], [bx, by], [cx, cy]],
    }


def _solve_rect(m: Json) -> tuple[Json, list[Json]]:
    s = _rect_sides(m)
    sc = _scale(m)
    dx, dy = s["d"]
    p, lebar = s["p"], s["l"]
    area = r2(p * lebar)
    keliling = r2(2 * (p + lebar))
    steps = [
        _step(s["dtext"], f"D = {pt(dx, dy)}", {"polygon": [*s["pts"], [dx, dy]]}),
        _step("Panjang = sisi mendatar.", f"{s['pexpr']} = {fmt(p)} satuan"),
        _step("Lebar = sisi tegak.", f"{s['lexpr']} = {fmt(lebar)} satuan"),
        _step("Luas = panjang × lebar.", f"{fmt(p)} × {fmt(lebar)} = {fmt(area)} satuan²"),
        _step("Keliling = 2 × (panjang + lebar).", f"2 × ({fmt(p)} + {fmt(lebar)}) = {fmt(keliling)} satuan"),
    ]
    if sc:
        per, u = sc
        rp, rl = r2(p * per), r2(lebar * per)
        steps += [
            _step(
                f"Skala 1 satuan = {fmt(per)} {u}.",
                f"panjang {fmt(p)} × {fmt(per)} = {fmt(rp)} {u}; lebar {fmt(lebar)} × {fmt(per)} = {fmt(rl)} {u}",
            ),
            _step("Luas sebenarnya = panjang × lebar sebenarnya.", f"{fmt(rp)} × {fmt(rl)} = {fmt(r2(rp * rl))} {u}²"),
            _step("Keliling sebenarnya.", f"{fmt(keliling)} × {fmt(per)} = {fmt(r2(keliling * per))} {u}"),
        ]
    res = {
        "missing": [dx, dy],
        "length": _qty(p, sc),
        "width": _qty(lebar, sc),
        "area": _area_qty(area, sc),
        "perimeter": _qty(keliling, sc),
    }
    return res, steps


def _describe_rect(m: Json) -> str:
    s = _rect_sides(m)
    return f"p = {s['pexpr']}; l = {s['lexpr']}; L = p × l; K = 2 × (p + l){_scale_text(_scale(m))}"


TRI_MSG = "Sudut siku-siku harus di B, dengan sisi A–B dan B–C sejajar sumbu."


def _tri_sides(m: Json) -> Json:
    (ax, ay), (bx, by), (cx, cy), ab_h = _right_angle(m, TRI_MSG)
    if ab_h:
        return {
            "base": r2(abs(bx - ax)),
            "bexpr": f"|{fmt(bx)} − {par(ax)}|",
            "h": r2(abs(cy - by)),
            "hexpr": f"|{fmt(cy)} − {par(by)}|",
            "pts": [[ax, ay], [bx, by], [cx, cy]],
        }
    return {
        "base": r2(abs(cx - bx)),
        "bexpr": f"|{fmt(cx)} − {par(bx)}|",
        "h": r2(abs(by - ay)),
        "hexpr": f"|{fmt(by)} − {par(ay)}|",
        "pts": [[ax, ay], [bx, by], [cx, cy]],
    }


def _solve_triangle(m: Json) -> tuple[Json, list[Json]]:
    s = _tri_sides(m)
    sc = _scale(m)
    base, h = s["base"], s["h"]
    area = r2(base * h / 2)
    steps = [
        _step(
            "Sudut siku-siku ada di B. Alas = sisi mendatar.",
            f"{s['bexpr']} = {fmt(base)} satuan",
            {"polygon": s["pts"]},
        ),
        _step("Tinggi = sisi tegak.", f"{s['hexpr']} = {fmt(h)} satuan"),
        _step("Luas = ½ × alas × tinggi.", f"½ × {fmt(base)} × {fmt(h)} = {fmt(area)} satuan²"),
    ]
    if sc:
        per, u = sc
        rb, rh = r2(base * per), r2(h * per)
        steps += [
            _step(
                f"Skala 1 satuan = {fmt(per)} {u}.",
                f"alas {fmt(base)} × {fmt(per)} = {fmt(rb)} {u}; tinggi {fmt(h)} × {fmt(per)} = {fmt(rh)} {u}",
            ),
            _step(
                "Luas sebenarnya = ½ × alas × tinggi sebenarnya.",
                f"½ × {fmt(rb)} × {fmt(rh)} = {fmt(r2(rb * rh / 2))} {u}²",
            ),
        ]
    return {"base": _qty(base, sc), "height": _qty(h, sc), "area": _area_qty(area, sc)}, steps


def _describe_triangle(m: Json) -> str:
    s = _tri_sides(m)
    return f"alas = {s['bexpr']}; tinggi = {s['hexpr']}; L = ½ × alas × tinggi{_scale_text(_scale(m))}"


# ---------------------------------------------------------------- MP-8


def _pattern_parts(m: Json) -> tuple[Num, Num, Num, Num, int]:
    fx, fy, _ = _point(m.get("first"), "titik pertama")
    st = m.get("step")
    if not isinstance(st, dict):
        raise ModelError("Isi geseran x dan y untuk setiap titik berikutnya.")
    dx = _num(st.get("dx"), "geseran x")
    dy = _num(st.get("dy"), "geseran y")
    n = m.get("n")
    if isinstance(n, bool) or not isinstance(n, int) or n < 1 or n > 100:
        raise ModelError("Urutan titik (n) harus bilangan bulat 1–100.")
    return fx, fy, dx, dy, n


def _solve_pattern(m: Json) -> tuple[Json, list[Json]]:
    fx, fy, dx, dy, n = _pattern_parts(m)
    k = n - 1
    px, py = r2(fx + k * dx), r2(fy + k * dy)
    pts = [[r2(fx + i * dx), r2(fy + i * dy)] for i in range(min(n, 20))]
    steps = [
        _step(f"Titik ke-1 ada di {pt(fx, fy)}.", pt(fx, fy), {"point": [fx, fy]}),
        _step(f"Titik ke-{fmt(n)} sudah bergeser (n − 1) kali.", f"{fmt(n)} − 1 = {fmt(k)}"),
        _step("x = x₁ + (n − 1) × geseran x.", f"{fmt(fx)} + {fmt(k)} × {par(dx)} = {fmt(px)}"),
        _step("y = y₁ + (n − 1) × geseran y.", f"{fmt(fy)} + {fmt(k)} × {par(dy)} = {fmt(py)}"),
        _step(f"Titik ke-{fmt(n)} ada di {pt(px, py)}.", pt(px, py), {"points": pts}),
    ]
    res: Json = {"point": [px, py]}
    b = m.get("boundary")
    if b is not None:
        if not isinstance(b, dict) or b.get("axis") not in ("x", "y"):
            raise ModelError("Batas harus untuk sumbu x atau y.")
        axis = b["axis"]
        mx = _num(b["max"], "batas") if b.get("max") is not None else None
        mn = _num(b["min"], "batas") if b.get("min") is not None else None
        if mx is None and mn is None:
            raise ModelError("Isi nilai batas.")
        v = px if axis == "x" else py
        inside = (mx is None or v <= mx) and (mn is None or v >= mn)
        conds = []
        if mx is not None:
            conds.append(f"{axis} ≤ {fmt(mx)}")
        if mn is not None:
            conds.append(f"{axis} ≥ {fmt(mn)}")
        line_val = mx if mx is not None else mn
        canvas = {"vline": line_val} if axis == "x" else {"hline": line_val}
        verdict = "masih di dalam batas" if inside else "di luar batas"
        steps.append(_step(f"Batas: {' dan '.join(conds)}.", f"{axis} = {fmt(v)}, jadi {verdict}", canvas))
        res["inside"] = inside
    return res, steps


def _describe_pattern(m: Json) -> str:
    fx, fy, dx, dy, n = _pattern_parts(m)
    return f"P_{fmt(n)} = ({fmt(fx)} + ({fmt(n)} − 1) × {par(dx)}, {fmt(fy)} + ({fmt(n)} − 1) × {par(dy)})"


# ---------------------------------------------------------------- dispatcher

_SOLVERS = {
    "translate": (_solve_route, _describe_route),
    "route_chain": (_solve_route, _describe_route),
    "axis_distance": (_solve_axis_distance, _describe_axis_distance),
    "relative_position": (_solve_relative, _describe_relative),
    "axis_line": (_solve_axis_line, _describe_axis_line),
    "rect_shape": (_solve_rect, _describe_rect),
    "right_triangle": (_solve_triangle, _describe_triangle),
    "point_pattern": (_solve_pattern, _describe_pattern),
}


def composite_parts(m: Json) -> list[Json]:
    parts = m.get("parts")
    if not isinstance(parts, list) or not parts or len(parts) > 4:
        raise ModelError("Model gabungan harus berisi 1–4 bagian.")
    shared = next((p for p in parts if isinstance(p, dict) and p.get("kind") == "scale"), None)
    out: list[Json] = []
    for p in parts:
        if not isinstance(p, dict) or p.get("kind") == "scale":
            continue
        if shared is not None and p.get("scale") is None:
            p = {**p, "scale": {"per_unit": shared.get("per_unit"), "unit": shared.get("unit")}}
        out.append(p)
    if not out:
        raise ModelError("Model gabungan belum berisi model.")
    return out


def _kind(m: Any) -> str:
    if not isinstance(m, dict) or m.get("kind") not in MODEL_KINDS:
        raise ModelError("Pilih jenis model terlebih dahulu.")
    return str(m["kind"])


def solve(model: Any) -> Json:
    """Selesaikan model → {"result": {...}, "steps": [...]}. Melempar ModelError bila tidak valid."""
    kind = _kind(model)
    if kind == "composite":
        result: Json = {}
        steps: list[Json] = []
        for part in composite_parts(model):
            sub = solve(part)
            result.update(sub["result"])
            steps.extend(sub["steps"])
        return {"result": result, "steps": steps}
    res, steps = _SOLVERS[kind][0](model)
    return {"result": res, "steps": steps}


def describe(model: Any) -> str:
    """Notasi model yang mudah dibaca. Tidak pernah melempar error."""
    try:
        kind = _kind(model)
        if kind == "composite":
            return " | ".join(describe(p) for p in composite_parts(model))
        return _SOLVERS[kind][1](model)
    except ModelError:
        return "Model belum lengkap"


def family(kind: str) -> str:
    """translate dan route_chain dianggap satu keluarga (perpindahan)."""
    return "route" if kind in ("translate", "route_chain") else kind


def route_axis_sums(model: Json) -> tuple[Num, Num] | None:
    """Jumlah perpindahan per sumbu, untuk deteksi MK-8 (arah terbalik)."""
    try:
        moves = _moves(model)
    except ModelError:
        return None
    sx: Num = 0
    sy: Num = 0
    for d, n in moves:
        dx, dy = DIRS[d]
        sx += dx * n
        sy += dy * n
    return r2(sx), r2(sy)
