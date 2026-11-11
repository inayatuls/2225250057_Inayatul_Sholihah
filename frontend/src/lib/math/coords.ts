import { fmt } from './models/engine';
import type { Quadrant } from '../types';

export type Region = Quadrant | 'x-axis' | 'y-axis' | 'origin';

/** Kuadran/sumbu tempat sebuah titik berada. */
export function regionOf(x: number, y: number): Region {
  if (x === 0 && y === 0) return 'origin';
  if (x === 0) return 'y-axis';
  if (y === 0) return 'x-axis';
  if (x > 0) return y > 0 ? 'I' : 'IV';
  return y > 0 ? 'II' : 'III';
}

export function regionLabel(r: Region): string {
  if (r === 'origin') return 'titik asal';
  if (r === 'x-axis') return 'pada sumbu X';
  if (r === 'y-axis') return 'pada sumbu Y';
  return `kuadran ${r}`;
}

export const coordText = (x: number, y: number): string => `(${fmt(x)}, ${fmt(y)})`;

/** Titik p terletak pada garis melalui a dan b. */
export function isOnLine(p: [number, number], a: [number, number], b: [number, number]): boolean {
  return Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) < 1e-9;
}

/** Deskripsi posisi garis melalui dua titik terhadap sumbu. */
export function lineRelation(a: [number, number], b: [number, number]): string {
  if (a[0] === b[0] && a[1] === b[1]) return '';
  if (a[1] === b[1]) return `Nilai y sama (${fmt(a[1])}), jadi garis sejajar sumbu X.`;
  if (a[0] === b[0]) return `Nilai x sama (${fmt(a[0])}), jadi garis sejajar sumbu Y (tegak lurus sumbu X).`;
  return 'Garis ini miring, jadi memotong sumbu X dan sumbu Y.';
}

/** Ubah teks isian menjadi angka; menerima "−", "-", dan koma desimal. */
export function parseNum(s: string): number | null {
  const t = s.trim().replace('−', '-').replace(',', '.');
  if (t === '' || t === '-' || t === '.') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}
