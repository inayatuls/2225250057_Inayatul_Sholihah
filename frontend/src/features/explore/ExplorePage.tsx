import { useState } from 'react';
import Screen from '../../components/ui/Screen';
import BottomNav from '../../app/BottomNav';
import { coordText, lineRelation, regionLabel, regionOf } from '../../lib/math/coords';
import { fmt } from '../../lib/math/models/engine';
import type { XY } from '../../lib/math/models/types';
import CartesianCanvas from '../canvas/CartesianCanvas';

/** Mode eksplorasi bebas (F-03): geser titik dan amati koordinat, kuadran, jarak ke sumbu. */
export default function ExplorePage() {
  const [mode, setMode] = useState<'point' | 'line'>('point');
  const [pts, setPts] = useState<XY[]>([[3, 2]]);
  const p = pts[0];

  return (
    <Screen title="Eksplor" subtitle="Geser titik dan amati apa yang berubah." nav={<BottomNav />}>
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-brand-50 p-1">
        {(
          [
            ['point', '📍 Titik'],
            ['line', '➖ Garis'],
          ] as const
        ).map(([m, l]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setPts(m === 'point' ? [[3, 2]] : [[-2, 1], [3, 1]]);
            }}
            className={`min-h-[44px] rounded-xl text-sm font-semibold ${mode === m ? 'bg-white text-brand-700 shadow' : 'text-brand-600'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <CartesianCanvas userPoints={pts} onUserPointsChange={setPts} maxPoints={mode === 'point' ? 1 : 2} userLine={mode === 'line'} />
      {mode === 'point' && p && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Info k="Koordinat" v={coordText(p[0], p[1])} />
          <Info k="Letak" v={regionLabel(regionOf(p[0], p[1]))} />
          <Info k="Jarak ke sumbu X" v={`|y| = ${fmt(Math.abs(p[1]))}`} />
          <Info k="Jarak ke sumbu Y" v={`|x| = ${fmt(Math.abs(p[0]))}`} />
        </dl>
      )}
      {mode === 'line' && pts.length === 2 && (
        <p className="mt-4 rounded-2xl bg-ok-50 p-4 text-sm text-ok-700">{lineRelation(pts[0], pts[1]) || 'Kedua titik masih sama.'}</p>
      )}
    </Screen>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <dt className="text-xs text-ink-muted">{k}</dt>
      <dd className="text-lg font-semibold text-brand-800">{v}</dd>
    </div>
  );
}
