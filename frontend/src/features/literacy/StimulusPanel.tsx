import { useState } from 'react';
import { fmt } from '../../lib/math/models/engine';
import type { Stimulus } from '../../lib/types';
import CartesianCanvas from '../canvas/CartesianCanvas';

/** Stimulus literasi (gaya AKM): denah + tabel data yang bisa disematkan saat menjawab. */
export default function StimulusPanel({ stimulus }: { stimulus: Stimulus }) {
  const [open, setOpen] = useState(true);
  const [pinned, setPinned] = useState(false);
  return (
    <section className={`mb-4 rounded-card bg-white/10 p-4 ${pinned ? 'sticky top-2 z-20 backdrop-blur' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-left font-semibold" aria-expanded={open}>
          🗺️ {stimulus.title} {open ? '▴' : '▾'}
        </button>
        <button
          type="button"
          onClick={() => setPinned((v) => !v)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${pinned ? 'bg-accent-500' : 'bg-white/20'}`}
          aria-pressed={pinned}
        >
          📌 {pinned ? 'Disematkan' : 'Sematkan'}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-white/80">{stimulus.description}</p>
          <div className={pinned ? 'max-h-[40vh] overflow-auto' : ''}>
            <CartesianCanvas display={{ points: stimulus.places.map((p) => ({ x: p.x, y: p.y, label: p.label })) }} showDisplayCoords={false} />
          </div>
          <table className="w-full overflow-hidden rounded-xl bg-white text-sm text-ink">
            <thead className="bg-brand-50 text-brand-800">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Tempat</th>
                <th className="px-3 py-2 text-left font-semibold">Koordinat</th>
              </tr>
            </thead>
            <tbody>
              {stimulus.places.map((p) => (
                <tr key={p.label} className="border-t border-slate-100">
                  <td className="px-3 py-2">{p.label}</td>
                  <td className="px-3 py-2 font-medium">
                    ({fmt(p.x)}, {fmt(p.y)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stimulus.scale && (
            <p className="text-sm font-semibold">
              Skala: 1 satuan = {fmt(stimulus.scale.per_unit)} {stimulus.scale.unit}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
