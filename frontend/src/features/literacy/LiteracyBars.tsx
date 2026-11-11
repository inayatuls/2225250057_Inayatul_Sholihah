import type { LiteracyProcess } from '../../lib/types';

const COLORS: Record<LiteracyProcess['process'], string> = {
  formulate: 'bg-brand-600',
  employ: 'bg-teal-400',
  interpret: 'bg-accent-500',
};

/** Diagram batang 3 proses literasi (F-25). Nilai juga ditulis sebagai teks, bukan hanya warna. */
export default function LiteracyBars({ processes }: { processes: LiteracyProcess[] }) {
  return (
    <ul className="space-y-3">
      {processes.map((p) => (
        <li key={p.process}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium">{p.label}</span>
            <span className="text-ink-muted">{p.score === null ? 'belum ada data' : `${p.score} · ${p.category}`}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${COLORS[p.process]}`} style={{ width: `${p.score ?? 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
