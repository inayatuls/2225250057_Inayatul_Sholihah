import { useMemo, useState } from 'react';
import type { SolutionStep, XY } from '../../lib/math/models/types';
import type { Display } from '../../lib/types';
import CartesianCanvas from '../canvas/CartesianCanvas';

/** Kumpulkan instruksi kanvas dari langkah 0..i menjadi satu tampilan. */
function accumulate(steps: SolutionStep[], upto: number): Display {
  const d: Display = { points: [], arrows: [] };
  for (const s of steps.slice(0, upto + 1)) {
    const c = s.canvas;
    if (!c) continue;
    if (c.point) d.points!.push({ x: c.point[0], y: c.point[1] });
    if (c.points) c.points.forEach((p) => d.points!.push({ x: p[0], y: p[1] }));
    if (c.arrow) d.arrows!.push({ from: c.arrow[0], to: c.arrow[1] });
    if (c.polygon) d.polygon = c.polygon;
    if (c.hline !== undefined) d.hline = c.hline;
    if (c.vline !== undefined) d.vline = c.vline;
  }
  const seen = new Set<string>();
  d.points = d.points!.filter((p) => {
    const k = `${p.x},${p.y}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return d;
}

function rangeFor(steps: SolutionStep[]): [number, number] {
  let m = 8;
  const see = (p: XY) => {
    m = Math.max(m, Math.ceil(Math.abs(p[0])) + 1, Math.ceil(Math.abs(p[1])) + 1);
  };
  for (const s of steps) {
    const c = s.canvas;
    if (!c) continue;
    if (c.point) see(c.point);
    c.points?.forEach(see);
    c.arrow?.forEach(see);
    c.polygon?.forEach(see);
    if (c.hline !== undefined) see([0, c.hline]);
    if (c.vline !== undefined) see([c.vline, 0]);
  }
  m = Math.min(m, 20);
  return [-m, m];
}

/** Langkah penyelesaian dari mesin model, ditampilkan satu per satu bersama animasi kanvas. */
export default function SolutionPlayer({ steps, title = 'Penyelesaian langkah demi langkah' }: { steps: SolutionStep[]; title?: string }) {
  const [i, setI] = useState(0);
  const display = useMemo(() => accumulate(steps, i), [steps, i]);
  const range = useMemo(() => rangeFor(steps), [steps]);
  if (steps.length === 0) return null;
  const s = steps[i];
  return (
    <div className="space-y-3 rounded-2xl bg-brand-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-brand-800">{title}</p>
        <p className="text-xs text-brand-700">
          Langkah {i + 1} dari {steps.length}
        </p>
      </div>
      <CartesianCanvas xRange={range} yRange={range} display={display} />
      <div className="min-h-[72px] rounded-xl bg-white p-3" aria-live="polite">
        <p className="text-[15px] text-ink">{s.text}</p>
        <p className="mt-1 font-semibold text-brand-700">{s.expr}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          className="min-h-[44px] flex-1 rounded-xl bg-white font-semibold text-brand-700 disabled:opacity-40"
        >
          ◀ Sebelumnya
        </button>
        <button
          type="button"
          onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))}
          disabled={i === steps.length - 1}
          className="min-h-[44px] flex-1 rounded-xl bg-brand-600 font-semibold text-white disabled:opacity-40"
        >
          Berikutnya ▶
        </button>
      </div>
    </div>
  );
}
