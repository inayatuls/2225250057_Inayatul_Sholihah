/**
 * Mesin model KartesiusKu (MP-1 s.d. MP-8).
 *
 * Fungsi murni dan deterministik. HARUS identik dengan
 * `backend/app/services/modeling.py` — keduanya diuji dengan `shared/model-fixtures/`.
 */
import type {
  CanvasInstr,
  ModelKind,
  ModelResult,
  Quantity,
  SolveOutput,
  SolutionStep,
} from './types';

type Json = Record<string, unknown>;
type Scale = [number, string] | null;

export const MINUS = '−';
const MAX_COORD = 1000;
const MAX_SCALE = 1_000_000;

export const DIRS: Record<string, [number, number]> = {
  utara: [0, 1],
  atas: [0, 1],
  selatan: [0, -1],
  bawah: [0, -1],
  timur: [1, 0],
  kanan: [1, 0],
  barat: [-1, 0],
  kiri: [-1, 0],
};

export const MODEL_KINDS: ModelKind[] = [
  'translate',
  'route_chain',
  'axis_distance',
  'relative_position',
  'axis_line',
  'rect_shape',
  'right_triangle',
  'point_pattern',
  'composite',
];

export class ModelError extends Error {}

// ------------------------------------------------------------ format angka

export function r2(v: number): number {
  return Math.floor(v * 100 + 0.5) / 100;
}

export function fmt(v: number): string {
  const neg = v < 0;
  const cents = Math.floor(Math.abs(v) * 100 + 0.5);
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  let s = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (frac) s += ',' + (frac % 10 === 0 ? String(frac / 10) : String(frac).padStart(2, '0'));
  return neg && cents !== 0 ? MINUS + s : s;
}

export const par = (v: number): string => (v < 0 ? `(${fmt(v)})` : fmt(v));
export const pt = (x: number, y: number): string => `(${fmt(x)}, ${fmt(y)})`;

function step(text: string, expr: string, canvas?: CanvasInstr): SolutionStep {
  return canvas ? { text, expr, canvas } : { text, expr };
}

// ------------------------------------------------------------ validasi

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function num(v: unknown, name: string, limit = MAX_COORD): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ModelError(`Nilai ${name} harus berupa angka.`);
  if (Math.abs(v) > limit) throw new ModelError(`Nilai ${name} terlalu besar.`);
  return v;
}

function point(p: unknown, name: string): [number, number, string] {
  if (!isObj(p)) throw new ModelError(`Koordinat ${name} belum diisi.`);
  const x = num(p.x, `x ${name}`);
  const y = num(p.y, `y ${name}`);
  const label = typeof p.label === 'string' && p.label.trim() ? p.label : '';
  return [x, y, label];
}

function scaleOf(m: Json): Scale {
  const s = m.scale;
  if (s === undefined || s === null) return null;
  if (!isObj(s)) throw new ModelError('Skala belum lengkap.');
  const per = num(s.per_unit, 'skala', MAX_SCALE);
  if (per <= 0) throw new ModelError('Skala harus lebih dari 0.');
  const unit = typeof s.unit === 'string' && s.unit.trim() ? s.unit.trim().slice(0, 10) : 'm';
  return [per, unit];
}

function qty(units: number, sc: Scale): Quantity {
  const q: Quantity = { units: r2(units) };
  if (sc) {
    q.real = r2(units * sc[0]);
    q.unit = sc[1];
  }
  return q;
}

function areaQty(units: number, sc: Scale): Quantity {
  const q: Quantity = { units: r2(units) };
  if (sc) {
    q.real = r2(units * sc[0] * sc[0]);
    q.unit = sc[1] + '²';
  }
  return q;
}

function scaleStep(value: number, sc: [number, string]): SolutionStep {
  const [per, unit] = sc;
  return step(`Skala 1 satuan = ${fmt(per)} ${unit}.`, `${fmt(value)} × ${fmt(per)} = ${fmt(r2(value * per))} ${unit}`);
}

const scaleText = (sc: Scale): string => (sc ? `; 1 satuan = ${fmt(sc[0])} ${sc[1]}` : '');

// ------------------------------------------------------------ MP-1 & MP-2

function movesOf(m: Json): [string, number][] {
  const moves = m.moves;
  if (!Array.isArray(moves) || moves.length === 0) throw new ModelError('Tambahkan minimal satu perpindahan.');
  if (moves.length > 10) throw new ModelError('Perpindahan paling banyak 10 langkah.');
  return moves.map((mv: unknown, i: number) => {
    const d = isObj(mv) ? mv.dir : undefined;
    if (typeof d !== 'string' || !(d in DIRS)) throw new ModelError(`Arah perpindahan ke-${i + 1} belum dipilih.`);
    const n = num((mv as Json).n, 'banyak langkah');
    if (n <= 0) throw new ModelError('Banyak langkah harus lebih dari 0.');
    return [d, n];
  });
}

function solveRoute(m: Json): [ModelResult, SolutionStep[]] {
  let [x, y] = point(m.start, 'titik awal');
  const label = point(m.start, 'titik awal')[2];
  const moves = movesOf(m);
  const sc = scaleOf(m);
  const steps = [step(`Mulai dari ${label || 'titik awal'}.`, pt(x, y), { point: [x, y] })];
  let travel = 0;
  for (const [d, n] of moves) {
    const [dx, dy] = DIRS[d];
    let nx: number, ny: number, text: string, expr: string;
    if (dx) {
      nx = r2(x + dx * n);
      ny = y;
      const [word, op] = dx > 0 ? ['bertambah', '+'] : ['berkurang', MINUS];
      text = `Ke ${d} ${fmt(n)} satuan: x ${word} ${fmt(n)}.`;
      expr = `(${fmt(x)} ${op} ${fmt(n)}, ${fmt(y)}) = ${pt(nx, ny)}`;
    } else {
      nx = x;
      ny = r2(y + dy * n);
      const [word, op] = dy > 0 ? ['bertambah', '+'] : ['berkurang', MINUS];
      text = `Ke ${d} ${fmt(n)} satuan: y ${word} ${fmt(n)}.`;
      expr = `(${fmt(x)}, ${fmt(y)} ${op} ${fmt(n)}) = ${pt(nx, ny)}`;
    }
    steps.push(step(text, expr, { arrow: [[x, y], [nx, ny]] }));
    x = nx;
    y = ny;
    travel = r2(travel + n);
  }
  steps.push(step('Posisi akhir ditemukan.', pt(x, y), { point: [x, y] }));
  const sumExpr =
    moves.length > 1
      ? moves.map(([, n]) => fmt(n)).join(' + ') + ` = ${fmt(travel)} satuan`
      : `${fmt(travel)} satuan`;
  steps.push(step('Jarak tempuh = jumlah semua langkah.', sumExpr));
  if (sc) steps.push(scaleStep(travel, sc));
  return [{ final_position: [x, y], travel_distance: qty(travel, sc) }, steps];
}

function describeRoute(m: Json): string {
  const [x, y] = point(m.start, 'titik awal');
  const moves = movesOf(m);
  const sc = scaleOf(m);
  const xs = [fmt(x)];
  const ys = [fmt(y)];
  for (const [d, n] of moves) {
    const [dx, dy] = DIRS[d];
    if (dx) xs.push(`${dx > 0 ? '+' : MINUS} ${fmt(n)}`);
    else ys.push(`${dy > 0 ? '+' : MINUS} ${fmt(n)}`);
  }
  const tempuh = moves.map(([, n]) => fmt(n)).join(' + ');
  return `P = (${xs.join(' ')}, ${ys.join(' ')}); tempuh = ${tempuh} satuan${scaleText(sc)}`;
}

// ------------------------------------------------------------ MP-3

function axisPair(m: Json): [number, number, number, number, boolean] {
  const [ax, ay] = point(m.a, 'A');
  const [bx, by] = point(m.b, 'B');
  if (ax === bx && ay === by) throw new ModelError('Kedua titik masih sama. Pilih dua titik yang berbeda.');
  if (ay === by) return [ax, ay, bx, by, true];
  if (ax === bx) return [ax, ay, bx, by, false];
  throw new ModelError('Kedua titik harus segaris mendatar atau tegak (nilai x atau y-nya sama).');
}

function solveAxisDistance(m: Json): [ModelResult, SolutionStep[]] {
  const [ax, ay, bx, by, horizontal] = axisPair(m);
  const sc = scaleOf(m);
  let d: number;
  let steps: SolutionStep[];
  if (horizontal) {
    d = r2(Math.abs(bx - ax));
    steps = [
      step(
        'Kedua titik memiliki nilai y yang sama, jadi jaraknya diukur mendatar.',
        `${pt(ax, ay)} dan ${pt(bx, by)}`,
        { points: [[ax, ay], [bx, by]] },
      ),
      step('Jarak = |x₂ − x₁|.', `|${fmt(bx)} − ${par(ax)}| = ${fmt(d)} satuan`, { arrow: [[ax, ay], [bx, by]] }),
    ];
  } else {
    d = r2(Math.abs(by - ay));
    steps = [
      step(
        'Kedua titik memiliki nilai x yang sama, jadi jaraknya diukur tegak.',
        `${pt(ax, ay)} dan ${pt(bx, by)}`,
        { points: [[ax, ay], [bx, by]] },
      ),
      step('Jarak = |y₂ − y₁|.', `|${fmt(by)} − ${par(ay)}| = ${fmt(d)} satuan`, { arrow: [[ax, ay], [bx, by]] }),
    ];
  }
  if (sc) steps.push(scaleStep(d, sc));
  return [{ distance: qty(d, sc) }, steps];
}

function describeAxisDistance(m: Json): string {
  const [ax, ay, bx, by, horizontal] = axisPair(m);
  const inner = horizontal ? `${fmt(bx)} − ${par(ax)}` : `${fmt(by)} − ${par(ay)}`;
  return `d = |${inner}|${scaleText(scaleOf(m))}`;
}

// ------------------------------------------------------------ MP-4

function solveRelative(m: Json): [ModelResult, SolutionStep[]] {
  const [ax, ay, alRaw] = point(m.a, 'A');
  const [bx, by, blRaw] = point(m.b, 'B');
  const al = alRaw || 'A';
  const bl = blRaw || 'B';
  const dx = r2(bx - ax);
  const dy = r2(by - ay);
  const parts: string[] = [];
  if (dx > 0) parts.push(`${fmt(dx)} satuan ke kanan (timur)`);
  else if (dx < 0) parts.push(`${fmt(-dx)} satuan ke kiri (barat)`);
  if (dy > 0) parts.push(`${fmt(dy)} satuan ke atas (utara)`);
  else if (dy < 0) parts.push(`${fmt(-dy)} satuan ke bawah (selatan)`);
  const desc = parts.length ? `${bl} berada ` + parts.join(' dan ') + ` dari ${al}.` : `${bl} berimpit dengan ${al}.`;
  const steps = [
    step('Selisih x = x_B − x_A.', `${fmt(bx)} − ${par(ax)} = ${fmt(dx)}`, { arrow: [[ax, ay], [bx, ay]] }),
    step('Selisih y = y_B − y_A.', `${fmt(by)} − ${par(ay)} = ${fmt(dy)}`, { arrow: [[bx, ay], [bx, by]] }),
    step('Artinya:', desc, { points: [[ax, ay], [bx, by]] }),
  ];
  return [{ dx, dy, description: desc }, steps];
}

function describeRelative(m: Json): string {
  const [ax, ay] = point(m.a, 'A');
  const [bx, by] = point(m.b, 'B');
  return `(x_B − x_A, y_B − y_A) = (${fmt(bx)} − ${par(ax)}, ${fmt(by)} − ${par(ay)})`;
}

// ------------------------------------------------------------ MP-5

function lineParts(m: Json): [number, number, 'x' | 'y'] {
  const [tx, ty] = point(m.through, 'titik pada garis');
  const p = m.parallel_to;
  if (p !== 'x' && p !== 'y') throw new ModelError('Pilih garis sejajar sumbu X atau sumbu Y.');
  return [tx, ty, p];
}

function solveAxisLine(m: Json): [ModelResult, SolutionStep[]] {
  const [tx, ty, p] = lineParts(m);
  const sc = scaleOf(m);
  let k: number;
  let eq: string;
  const steps: SolutionStep[] = [];
  if (p === 'x') {
    k = ty;
    eq = `y = ${fmt(k)}`;
    steps.push(step('Garis sejajar sumbu X, jadi semua titiknya memiliki nilai y yang sama.', eq, { hline: k }));
  } else {
    k = tx;
    eq = `x = ${fmt(k)}`;
    steps.push(step('Garis sejajar sumbu Y, jadi semua titiknya memiliki nilai x yang sama.', eq, { vline: k }));
  }
  const res: ModelResult = { equation: eq };
  if (m.from !== undefined && m.from !== null) {
    const [fx, fy] = point(m.from, 'titik asal');
    let nx: number, ny: number, d: number, dexpr: string;
    if (p === 'x') {
      nx = fx;
      ny = k;
      d = r2(Math.abs(k - fy));
      dexpr = `|${fmt(k)} − ${par(fy)}| = ${fmt(d)} satuan`;
    } else {
      nx = k;
      ny = fy;
      d = r2(Math.abs(k - fx));
      dexpr = `|${fmt(k)} − ${par(fx)}| = ${fmt(d)} satuan`;
    }
    steps.push(
      step('Titik terdekat di garis dicapai dengan berjalan tegak lurus ke garis.', pt(nx, ny), {
        arrow: [[fx, fy], [nx, ny]],
      }),
    );
    steps.push(step('Jarak terpendek ke garis.', dexpr));
    if (sc) steps.push(scaleStep(d, sc));
    res.nearest = [nx, ny];
    res.distance = qty(d, sc);
  }
  return [res, steps];
}

function describeAxisLine(m: Json): string {
  const [tx, ty, p] = lineParts(m);
  const eq = p === 'x' ? `y = ${fmt(ty)}` : `x = ${fmt(tx)}`;
  let extra = '';
  if (m.from !== undefined && m.from !== null) {
    const [fx, fy] = point(m.from, 'titik asal');
    extra = `; dari ${pt(fx, fy)} tegak lurus ke garis`;
  }
  return `Garis: ${eq}${extra}${scaleText(scaleOf(m))}`;
}

// ------------------------------------------------------------ MP-6

type P2 = [number, number];

function rightAngle(m: Json, msg: string): [P2, P2, P2, boolean] {
  const [ax, ay] = point(m.a, 'A');
  const [bx, by] = point(m.b, 'B');
  const [cx, cy] = point(m.c, 'C');
  const abH = ay === by && ax !== bx;
  const abV = ax === bx && ay !== by;
  const bcH = by === cy && bx !== cx;
  const bcV = bx === cx && by !== cy;
  if (!((abH && bcV) || (abV && bcH))) throw new ModelError(msg);
  return [[ax, ay], [bx, by], [cx, cy], abH];
}

const RECT_MSG = 'Titik A, B, C harus membentuk sudut siku di B dengan sisi sejajar sumbu.';

interface RectSides {
  d: P2;
  p: number;
  pexpr: string;
  l: number;
  lexpr: string;
  dtext: string;
  pts: P2[];
}

function rectSides(m: Json): RectSides {
  const [[ax, ay], [bx, by], [cx, cy], abH] = rightAngle(m, RECT_MSG);
  const pts: P2[] = [[ax, ay], [bx, by], [cx, cy]];
  if (abH) {
    return {
      d: [ax, cy],
      p: r2(Math.abs(bx - ax)),
      pexpr: `|${fmt(bx)} − ${par(ax)}|`,
      l: r2(Math.abs(cy - by)),
      lexpr: `|${fmt(cy)} − ${par(by)}|`,
      dtext: 'D sejajar tegak dengan A dan sejajar mendatar dengan C, jadi D = (x_A, y_C).',
      pts,
    };
  }
  return {
    d: [cx, ay],
    p: r2(Math.abs(cx - bx)),
    pexpr: `|${fmt(cx)} − ${par(bx)}|`,
    l: r2(Math.abs(by - ay)),
    lexpr: `|${fmt(by)} − ${par(ay)}|`,
    dtext: 'D sejajar mendatar dengan A dan sejajar tegak dengan C, jadi D = (x_C, y_A).',
    pts,
  };
}

function solveRect(m: Json): [ModelResult, SolutionStep[]] {
  const s = rectSides(m);
  const sc = scaleOf(m);
  const [dx, dy] = s.d;
  const { p, l } = s;
  const area = r2(p * l);
  const keliling = r2(2 * (p + l));
  const steps = [
    step(s.dtext, `D = ${pt(dx, dy)}`, { polygon: [...s.pts, [dx, dy]] }),
    step('Panjang = sisi mendatar.', `${s.pexpr} = ${fmt(p)} satuan`),
    step('Lebar = sisi tegak.', `${s.lexpr} = ${fmt(l)} satuan`),
    step('Luas = panjang × lebar.', `${fmt(p)} × ${fmt(l)} = ${fmt(area)} satuan²`),
    step('Keliling = 2 × (panjang + lebar).', `2 × (${fmt(p)} + ${fmt(l)}) = ${fmt(keliling)} satuan`),
  ];
  if (sc) {
    const [per, u] = sc;
    const rp = r2(p * per);
    const rl = r2(l * per);
    steps.push(
      step(
        `Skala 1 satuan = ${fmt(per)} ${u}.`,
        `panjang ${fmt(p)} × ${fmt(per)} = ${fmt(rp)} ${u}; lebar ${fmt(l)} × ${fmt(per)} = ${fmt(rl)} ${u}`,
      ),
      step('Luas sebenarnya = panjang × lebar sebenarnya.', `${fmt(rp)} × ${fmt(rl)} = ${fmt(r2(rp * rl))} ${u}²`),
      step('Keliling sebenarnya.', `${fmt(keliling)} × ${fmt(per)} = ${fmt(r2(keliling * per))} ${u}`),
    );
  }
  return [
    {
      missing: [dx, dy],
      length: qty(p, sc),
      width: qty(l, sc),
      area: areaQty(area, sc),
      perimeter: qty(keliling, sc),
    },
    steps,
  ];
}

function describeRect(m: Json): string {
  const s = rectSides(m);
  return `p = ${s.pexpr}; l = ${s.lexpr}; L = p × l; K = 2 × (p + l)${scaleText(scaleOf(m))}`;
}

const TRI_MSG = 'Sudut siku-siku harus di B, dengan sisi A–B dan B–C sejajar sumbu.';

function triSides(m: Json) {
  const [[ax, ay], [bx, by], [cx, cy], abH] = rightAngle(m, TRI_MSG);
  const pts: P2[] = [[ax, ay], [bx, by], [cx, cy]];
  if (abH) {
    return {
      base: r2(Math.abs(bx - ax)),
      bexpr: `|${fmt(bx)} − ${par(ax)}|`,
      h: r2(Math.abs(cy - by)),
      hexpr: `|${fmt(cy)} − ${par(by)}|`,
      pts,
    };
  }
  return {
    base: r2(Math.abs(cx - bx)),
    bexpr: `|${fmt(cx)} − ${par(bx)}|`,
    h: r2(Math.abs(by - ay)),
    hexpr: `|${fmt(by)} − ${par(ay)}|`,
    pts,
  };
}

function solveTriangle(m: Json): [ModelResult, SolutionStep[]] {
  const s = triSides(m);
  const sc = scaleOf(m);
  const { base, h } = s;
  const area = r2((base * h) / 2);
  const steps = [
    step('Sudut siku-siku ada di B. Alas = sisi mendatar.', `${s.bexpr} = ${fmt(base)} satuan`, { polygon: s.pts }),
    step('Tinggi = sisi tegak.', `${s.hexpr} = ${fmt(h)} satuan`),
    step('Luas = ½ × alas × tinggi.', `½ × ${fmt(base)} × ${fmt(h)} = ${fmt(area)} satuan²`),
  ];
  if (sc) {
    const [per, u] = sc;
    const rb = r2(base * per);
    const rh = r2(h * per);
    steps.push(
      step(
        `Skala 1 satuan = ${fmt(per)} ${u}.`,
        `alas ${fmt(base)} × ${fmt(per)} = ${fmt(rb)} ${u}; tinggi ${fmt(h)} × ${fmt(per)} = ${fmt(rh)} ${u}`,
      ),
      step('Luas sebenarnya = ½ × alas × tinggi sebenarnya.', `½ × ${fmt(rb)} × ${fmt(rh)} = ${fmt(r2((rb * rh) / 2))} ${u}²`),
    );
  }
  return [{ base: qty(base, sc), height: qty(h, sc), area: areaQty(area, sc) }, steps];
}

function describeTriangle(m: Json): string {
  const s = triSides(m);
  return `alas = ${s.bexpr}; tinggi = ${s.hexpr}; L = ½ × alas × tinggi${scaleText(scaleOf(m))}`;
}

// ------------------------------------------------------------ MP-8

function patternParts(m: Json): [number, number, number, number, number] {
  const [fx, fy] = point(m.first, 'titik pertama');
  const st = m.step;
  if (!isObj(st)) throw new ModelError('Isi geseran x dan y untuk setiap titik berikutnya.');
  const dx = num(st.dx, 'geseran x');
  const dy = num(st.dy, 'geseran y');
  const n = m.n;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 100) {
    throw new ModelError('Urutan titik (n) harus bilangan bulat 1–100.');
  }
  return [fx, fy, dx, dy, n];
}

function solvePattern(m: Json): [ModelResult, SolutionStep[]] {
  const [fx, fy, dx, dy, n] = patternParts(m);
  const k = n - 1;
  const px = r2(fx + k * dx);
  const py = r2(fy + k * dy);
  const pts: P2[] = [];
  for (let i = 0; i < Math.min(n, 20); i++) pts.push([r2(fx + i * dx), r2(fy + i * dy)]);
  const steps = [
    step(`Titik ke-1 ada di ${pt(fx, fy)}.`, pt(fx, fy), { point: [fx, fy] }),
    step(`Titik ke-${fmt(n)} sudah bergeser (n − 1) kali.`, `${fmt(n)} − 1 = ${fmt(k)}`),
    step('x = x₁ + (n − 1) × geseran x.', `${fmt(fx)} + ${fmt(k)} × ${par(dx)} = ${fmt(px)}`),
    step('y = y₁ + (n − 1) × geseran y.', `${fmt(fy)} + ${fmt(k)} × ${par(dy)} = ${fmt(py)}`),
    step(`Titik ke-${fmt(n)} ada di ${pt(px, py)}.`, pt(px, py), { points: pts }),
  ];
  const res: ModelResult = { point: [px, py] };
  const b = m.boundary;
  if (b !== undefined && b !== null) {
    if (!isObj(b) || (b.axis !== 'x' && b.axis !== 'y')) throw new ModelError('Batas harus untuk sumbu x atau y.');
    const axis = b.axis;
    const mx = b.max !== undefined && b.max !== null ? num(b.max, 'batas') : null;
    const mn = b.min !== undefined && b.min !== null ? num(b.min, 'batas') : null;
    if (mx === null && mn === null) throw new ModelError('Isi nilai batas.');
    const v = axis === 'x' ? px : py;
    const inside = (mx === null || v <= mx) && (mn === null || v >= mn);
    const conds: string[] = [];
    if (mx !== null) conds.push(`${axis} ≤ ${fmt(mx)}`);
    if (mn !== null) conds.push(`${axis} ≥ ${fmt(mn)}`);
    const lineVal = (mx !== null ? mx : mn) as number;
    const canvas: CanvasInstr = axis === 'x' ? { vline: lineVal } : { hline: lineVal };
    const verdict = inside ? 'masih di dalam batas' : 'di luar batas';
    steps.push(step(`Batas: ${conds.join(' dan ')}.`, `${axis} = ${fmt(v)}, jadi ${verdict}`, canvas));
    res.inside = inside;
  }
  return [res, steps];
}

function describePattern(m: Json): string {
  const [fx, fy, dx, dy, n] = patternParts(m);
  return `P_${fmt(n)} = (${fmt(fx)} + (${fmt(n)} − 1) × ${par(dx)}, ${fmt(fy)} + (${fmt(n)} − 1) × ${par(dy)})`;
}

// ------------------------------------------------------------ dispatcher

type Solver = (m: Json) => [ModelResult, SolutionStep[]];
type Describer = (m: Json) => string;

const SOLVERS: Record<Exclude<ModelKind, 'composite'>, [Solver, Describer]> = {
  translate: [solveRoute, describeRoute],
  route_chain: [solveRoute, describeRoute],
  axis_distance: [solveAxisDistance, describeAxisDistance],
  relative_position: [solveRelative, describeRelative],
  axis_line: [solveAxisLine, describeAxisLine],
  rect_shape: [solveRect, describeRect],
  right_triangle: [solveTriangle, describeTriangle],
  point_pattern: [solvePattern, describePattern],
};

function compositeParts(m: Json): Json[] {
  const parts = m.parts;
  if (!Array.isArray(parts) || parts.length === 0 || parts.length > 4) {
    throw new ModelError('Model gabungan harus berisi 1–4 bagian.');
  }
  const shared = parts.find((p) => isObj(p) && p.kind === 'scale') as Json | undefined;
  const out: Json[] = [];
  for (const p of parts) {
    if (!isObj(p) || p.kind === 'scale') continue;
    if (shared !== undefined && (p.scale === undefined || p.scale === null)) {
      out.push({ ...p, scale: { per_unit: shared.per_unit, unit: shared.unit } });
    } else out.push(p);
  }
  if (out.length === 0) throw new ModelError('Model gabungan belum berisi model.');
  return out;
}

function kindOf(m: unknown): ModelKind {
  if (!isObj(m) || typeof m.kind !== 'string' || !MODEL_KINDS.includes(m.kind as ModelKind)) {
    throw new ModelError('Pilih jenis model terlebih dahulu.');
  }
  return m.kind as ModelKind;
}

/** Selesaikan model → { result, steps }. Melempar ModelError bila tidak valid. */
export function solveModel(model: unknown): SolveOutput {
  const kind = kindOf(model);
  const m = model as Json;
  if (kind === 'composite') {
    const result: ModelResult = {};
    const steps: SolutionStep[] = [];
    for (const part of compositeParts(m)) {
      const sub = solveModel(part);
      Object.assign(result, sub.result);
      steps.push(...sub.steps);
    }
    return { result, steps };
  }
  const [result, steps] = SOLVERS[kind][0](m);
  return { result, steps };
}

/** Notasi model yang mudah dibaca. Tidak pernah melempar error. */
export function describeModel(model: unknown): string {
  try {
    const kind = kindOf(model);
    const m = model as Json;
    if (kind === 'composite') return compositeParts(m).map(describeModel).join(' | ');
    return SOLVERS[kind][1](m);
  } catch (e) {
    if (e instanceof ModelError) return 'Model belum lengkap';
    throw e;
  }
}

/** Coba selesaikan; kembalikan pesan error ramah bila model tidak valid. */
export function trySolve(model: unknown): { ok: true; out: SolveOutput } | { ok: false; error: string } {
  try {
    return { ok: true, out: solveModel(model) };
  } catch (e) {
    if (e instanceof ModelError) return { ok: false, error: e.message };
    throw e;
  }
}
