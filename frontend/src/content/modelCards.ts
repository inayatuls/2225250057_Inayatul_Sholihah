import { fmt, pt } from '../lib/math/models/engine';
import type { Model, ModelKind, ModelResult, Quantity } from '../lib/math/models/types';

export interface ModelCard {
  kind: Exclude<ModelKind, 'composite'>;
  code: string;
  name: string;
  icon: string;
  usedWhen: string;
  notation: string;
  example: string;
  starter: Model;
}

/** Kartu Model MP-1 s.d. MP-8 (docs/13 §4). */
export const MODEL_CARDS: ModelCard[] = [
  {
    kind: 'translate',
    code: 'MP-1',
    name: 'Titik dari Titik Acuan',
    icon: '📍',
    usedWhen: 'Mencari letak tempat jika diketahui posisinya dari tempat lain.',
    notation: 'B = (x_A + a, y_A + b)',
    example: 'Sekolah 5 satuan ke timur dan 3 satuan ke utara dari rumah.',
    starter: { kind: 'translate', start: { x: 0, y: 0, label: '' }, moves: [{ dir: 'timur', n: 1 }, { dir: 'utara', n: 1 }] },
  },
  {
    kind: 'route_chain',
    code: 'MP-2',
    name: 'Rute Berantai',
    icon: '🧭',
    usedWhen: 'Ada beberapa perpindahan berturut-turut; mencari posisi akhir dan jarak tempuh.',
    notation: 'P = (x₀ + Σa, y₀ + Σb)',
    example: 'Kurir berjalan 4 ke utara, 5 ke barat, lalu 1 ke selatan.',
    starter: { kind: 'route_chain', start: { x: 0, y: 0, label: '' }, moves: [{ dir: 'utara', n: 1 }, { dir: 'timur', n: 1 }, { dir: 'selatan', n: 1 }] },
  },
  {
    kind: 'axis_distance',
    code: 'MP-3',
    name: 'Jarak Sejajar Sumbu',
    icon: '📏',
    usedWhen: 'Mengukur jarak dua titik yang segaris mendatar atau tegak.',
    notation: 'd = |x₂ − x₁| atau |y₂ − y₁|',
    example: 'Jarak rumah Ayu (−4, 3) dan rumah Bima (2, 3).',
    starter: { kind: 'axis_distance', a: { x: 0, y: 0 }, b: { x: 3, y: 0 } },
  },
  {
    kind: 'relative_position',
    code: 'MP-4',
    name: 'Posisi Relatif',
    icon: '👀',
    usedWhen: 'Mencari letak suatu tempat jika dilihat dari tempat lain.',
    notation: '(x_B − x_A, y_B − y_A)',
    example: 'Pasar berada di mana jika dilihat dari balai desa?',
    starter: { kind: 'relative_position', a: { x: 0, y: 0, label: 'A' }, b: { x: 2, y: 3, label: 'B' } },
  },
  {
    kind: 'axis_line',
    code: 'MP-5',
    name: 'Garis Sejajar Sumbu',
    icon: '➖',
    usedWhen: 'Jalan, pagar, atau rel lurus; mencari titik terdekat di garis.',
    notation: 'y = k (sejajar sumbu X) atau x = k (sejajar sumbu Y)',
    example: 'Jalan melewati (−4, 2) dan (6, 2). Rumah di (1, −3).',
    starter: { kind: 'axis_line', through: { x: 0, y: 2 }, parallel_to: 'x', from: null },
  },
  {
    kind: 'rect_shape',
    code: 'MP-6',
    name: 'Persegi Panjang',
    icon: '▭',
    usedWhen: 'Mencari titik sudut keempat, luas, dan keliling bangun bersisi sejajar sumbu.',
    notation: 'L = p × l, K = 2 × (p + l)',
    example: 'Kebun A(−3, −1), B(5, −1), C(5, 3).',
    starter: { kind: 'rect_shape', a: { x: 0, y: 0 }, b: { x: 4, y: 0 }, c: { x: 4, y: 3 } },
  },
  {
    kind: 'right_triangle',
    code: 'MP-6',
    name: 'Segitiga Siku-siku',
    icon: '◺',
    usedWhen: 'Menghitung luas segitiga siku-siku yang sisi sikunya sejajar sumbu.',
    notation: 'L = ½ × alas × tinggi',
    example: 'Taman A(−2, 4), B(−2, −1), C(6, −1), siku di B.',
    starter: { kind: 'right_triangle', a: { x: 0, y: 3 }, b: { x: 0, y: 0 }, c: { x: 4, y: 0 } },
  },
  {
    kind: 'point_pattern',
    code: 'MP-8',
    name: 'Pola Titik',
    icon: '✨',
    usedWhen: 'Benda dipasang berulang dengan geseran tetap; mencari benda ke-n.',
    notation: 'P_n = (x₁ + (n − 1)a, y₁ + (n − 1)b)',
    example: 'Lampu taman: mulai (−6, −1), tiap lampu 3 ke kanan dan 1 ke atas.',
    starter: { kind: 'point_pattern', first: { x: 0, y: 0 }, step: { dx: 1, dy: 1 }, n: 4, boundary: null },
  },
];

export const SCALE_CARD = {
  code: 'MP-7',
  name: 'Skala',
  icon: '🗺️',
  usedWhen: 'Mengubah satuan pada denah menjadi ukuran sebenarnya. Bisa ditambahkan ke model lain.',
  notation: 'Jarak sebenarnya = n × s; Luas sebenarnya = n × s × s',
  example: '1 satuan = 100 m, jadi 8 satuan = 800 m.',
};

export const cardOf = (kind: ModelKind): ModelCard | undefined => MODEL_CARDS.find((c) => c.kind === kind);

function q(x: Quantity | undefined, satuan = 'satuan'): string {
  if (!x) return '';
  return x.real !== undefined ? `${fmt(x.units)} ${satuan} = ${fmt(x.real)} ${x.unit ?? ''}`.trim() : `${fmt(x.units)} ${satuan}`;
}

/** Ringkasan hasil mesin model dalam kalimat (dipakai Pemodel Bebas & pembahasan). */
export function summarizeResult(r: ModelResult): string[] {
  const out: string[] = [];
  if (r.final_position) out.push(`Posisi akhir: ${pt(...r.final_position)}`);
  if (r.travel_distance) out.push(`Jarak tempuh: ${q(r.travel_distance)}`);
  if (r.distance && !r.nearest) out.push(`Jarak: ${q(r.distance)}`);
  if (r.description) out.push(r.description);
  if (r.equation) out.push(`Persamaan garis: ${r.equation}`);
  if (r.nearest) out.push(`Titik terdekat di garis: ${pt(...r.nearest)}; jarak ${q(r.distance)}`);
  if (r.missing) out.push(`Titik sudut keempat (D): ${pt(...r.missing)}`);
  if (r.length) out.push(`Panjang: ${q(r.length)}`);
  if (r.width) out.push(`Lebar: ${q(r.width)}`);
  if (r.base) out.push(`Alas: ${q(r.base)}`);
  if (r.height) out.push(`Tinggi: ${q(r.height)}`);
  if (r.area) out.push(`Luas: ${q(r.area, 'satuan²')}`);
  if (r.perimeter) out.push(`Keliling: ${q(r.perimeter)}`);
  if (r.point) out.push(`Titik yang dicari: ${pt(...r.point)}`);
  if (r.inside !== undefined) out.push(r.inside ? 'Titik masih di dalam batas.' : 'Titik berada di luar batas.');
  return out;
}

export const DIR_OPTIONS = [
  { value: 'utara', label: 'utara (atas)' },
  { value: 'selatan', label: 'selatan (bawah)' },
  { value: 'timur', label: 'timur (kanan)' },
  { value: 'barat', label: 'barat (kiri)' },
] as const;
