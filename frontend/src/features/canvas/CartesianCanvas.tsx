import { useCallback, useId, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent } from 'react';
import { coordText, lineRelation, regionLabel, regionOf } from '../../lib/math/coords';
import type { XY } from '../../lib/math/models/types';
import type { Display, Quadrant } from '../../lib/types';

/**
 * Bidang Kartesius interaktif (SVG).
 * Warna bermakna (CLAUDE.md §6): sumbu X biru, sumbu Y merah, titik siswa oranye, garis jawaban hijau.
 */
export interface CartesianCanvasProps {
  xRange?: [number, number];
  yRange?: [number, number];
  display?: Display;
  /** Tampilkan koordinat di samping titik statis (materi). Matikan untuk soal "baca titik". */
  showDisplayCoords?: boolean;
  userPoints?: XY[];
  onUserPointsChange?: (pts: XY[]) => void;
  /** 0 = tidak bisa menaruh titik. */
  maxPoints?: number;
  /** Gambar garis melalui dua titik siswa. */
  userLine?: boolean;
  onTapQuadrant?: (q: Quadrant) => void;
  selectedQuadrant?: Quadrant | null;
  /** Titik jawaban benar (hijau), ditampilkan setelah pembahasan. */
  answerPoints?: XY[];
  ariaLabel?: string;
  showControls?: boolean;
}

const S = 40; // satuan → piksel viewBox

const ARROW_COLORS = { x: '#2563EB', y: '#DC2626', other: '#6B7190' } as const;

export default function CartesianCanvas({
  xRange = [-8, 8],
  yRange = [-8, 8],
  display,
  showDisplayCoords = true,
  userPoints = [],
  onUserPointsChange,
  maxPoints = 0,
  userLine = false,
  onTapQuadrant,
  selectedQuadrant,
  answerPoints,
  ariaLabel,
  showControls = true,
}: CartesianCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<number>(userPoints.length - 1);
  const dragIdx = useRef<number | null>(null);
  const uid = useId().replace(/:/g, '');
  const [xmin, xmax] = xRange;
  const [ymin, ymax] = yRange;
  const W = (xmax - xmin + 1) * S;
  const H = (ymax - ymin + 1) * S;
  const tx = (x: number) => (x - xmin + 0.5) * S;
  const ty = (y: number) => (ymax - y + 0.5) * S;
  const interactive = maxPoints > 0 && !!onUserPointsChange;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const toWorld = useCallback(
    (e: RPointerEvent<SVGSVGElement>): [number, number] | null => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return null;
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      return [pt.x / S - 0.5 + xmin, ymax - (pt.y / S - 0.5)];
    },
    [xmin, ymax],
  );

  const snap = (w: [number, number]): XY => [
    clamp(Math.round(w[0]), xmin, xmax),
    clamp(Math.round(w[1]), ymin, ymax),
  ];

  function onPointerDown(e: RPointerEvent<SVGSVGElement>) {
    const w = toWorld(e);
    if (!w) return;
    if (onTapQuadrant) {
      const [x, y] = w;
      if (Math.abs(x) < 0.3 || Math.abs(y) < 0.3) return;
      onTapQuadrant(x > 0 ? (y > 0 ? 'I' : 'IV') : y > 0 ? 'II' : 'III');
      return;
    }
    if (!interactive) return;
    const near = userPoints.findIndex((p) => Math.hypot(p[0] - w[0], p[1] - w[1]) < 0.7);
    const s = snap(w);
    let next = [...userPoints];
    let idx: number;
    if (near >= 0) {
      idx = near;
    } else if (userPoints.length < maxPoints) {
      next = [...userPoints, s];
      idx = next.length - 1;
    } else {
      idx = maxPoints === 1 ? 0 : clamp(selected, 0, userPoints.length - 1);
      next[idx] = s;
    }
    setSelected(idx);
    dragIdx.current = idx;
    e.currentTarget.setPointerCapture(e.pointerId);
    onUserPointsChange?.(next);
  }

  function onPointerMove(e: RPointerEvent<SVGSVGElement>) {
    if (dragIdx.current === null || !interactive) return;
    const w = toWorld(e);
    if (!w) return;
    const s = snap(w);
    const cur = userPoints[dragIdx.current];
    if (cur && cur[0] === s[0] && cur[1] === s[1]) return;
    const next = [...userPoints];
    next[dragIdx.current] = s;
    onUserPointsChange?.(next);
  }

  function endDrag() {
    dragIdx.current = null;
  }

  function nudge(dx: number, dy: number) {
    if (!interactive || userPoints.length === 0) return;
    const i = clamp(selected, 0, userPoints.length - 1);
    const next = [...userPoints];
    next[i] = [clamp(next[i][0] + dx, xmin, xmax), clamp(next[i][1] + dy, ymin, ymax)];
    onUserPointsChange?.(next);
  }

  // ------------------------------------------------------------ gambar

  const xs: number[] = [];
  for (let x = xmin; x <= xmax; x++) xs.push(x);
  const ys: number[] = [];
  for (let y = ymin; y <= ymax; y++) ys.push(y);
  const step = xmax - xmin > 16 ? 2 : 1;

  const quadRect = (q: Quadrant) => {
    const left = q === 'I' || q === 'IV' ? tx(0) : tx(xmin) - S / 2;
    const right = q === 'I' || q === 'IV' ? tx(xmax) + S / 2 : tx(0);
    const top = q === 'I' || q === 'II' ? ty(ymax) - S / 2 : ty(0);
    const bottom = q === 'I' || q === 'II' ? ty(0) : ty(ymin) + S / 2;
    return { x: left, y: top, width: right - left, height: bottom - top };
  };

  const infiniteLine = (a: XY, b: XY) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const k = 100 / len;
    return { x1: tx(a[0] - dx * k), y1: ty(a[1] - dy * k), x2: tx(a[0] + dx * k), y2: ty(a[1] + dy * k) };
  };

  const labelPos = (x: number, y: number) => {
    const px = tx(x);
    const py = ty(y);
    const right = px < W - 120;
    const up = py > 40;
    return { x: px + (right ? 12 : -12), y: py + (up ? -12 : 24), anchor: (right ? 'start' : 'end') as 'start' | 'end' };
  };

  const userLineOn = userLine && userPoints.length === 2;
  const regionText =
    interactive && userPoints.length > 0
      ? userPoints.map((p) => `${coordText(p[0], p[1])} ${regionLabel(regionOf(p[0], p[1]))}`).join('; ')
      : '';

  return (
    <div className="w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none rounded-2xl bg-white"
        style={{ cursor: interactive || onTapQuadrant ? 'pointer' : 'default' }}
        role="img"
        aria-label={ariaLabel ?? (regionText ? `Bidang Kartesius. Titikmu: ${regionText}` : 'Bidang Kartesius')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          {Object.entries(ARROW_COLORS).map(([k, c]) => (
            <marker key={k} id={`${uid}-ah-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
          <clipPath id={`${uid}-clip`}>
            <rect x={0} y={0} width={W} height={H} />
          </clipPath>
        </defs>

        {(display?.quadrant || selectedQuadrant) && (
          <rect {...quadRect((selectedQuadrant ?? display?.quadrant) as Quadrant)} fill="#4351A8" opacity={0.12} />
        )}

        {/* grid */}
        {xs.map((x) => (
          <line key={`gx${x}`} x1={tx(x)} y1={0} x2={tx(x)} y2={H} stroke="#E5E7F0" strokeWidth={1.5} />
        ))}
        {ys.map((y) => (
          <line key={`gy${y}`} x1={0} y1={ty(y)} x2={W} y2={ty(y)} stroke="#E5E7F0" strokeWidth={1.5} />
        ))}

        {/* sumbu */}
        <line x1={4} y1={ty(0)} x2={W - 4} y2={ty(0)} stroke="#2563EB" strokeWidth={3} markerEnd={`url(#${uid}-ah-x)`} markerStart={`url(#${uid}-ah-x)`} />
        <line x1={tx(0)} y1={H - 4} x2={tx(0)} y2={4} stroke="#DC2626" strokeWidth={3} markerEnd={`url(#${uid}-ah-y)`} markerStart={`url(#${uid}-ah-y)`} />
        <text x={W - 14} y={ty(0) - 10} fill="#2563EB" fontSize={20} fontWeight={700} textAnchor="end">x</text>
        <text x={tx(0) + 10} y={20} fill="#DC2626" fontSize={20} fontWeight={700}>y</text>
        {xs.filter((x) => x !== 0 && x % step === 0 && x !== xmax).map((x) => (
          <text key={`lx${x}`} x={tx(x)} y={ty(0) + 20} fontSize={14} fill="#6B7190" textAnchor="middle">
            {x < 0 ? `−${-x}` : x}
          </text>
        ))}
        {ys.filter((y) => y !== 0 && y % step === 0 && y !== ymax).map((y) => (
          <text key={`ly${y}`} x={tx(0) - 8} y={ty(y) + 5} fontSize={14} fill="#6B7190" textAnchor="end">
            {y < 0 ? `−${-y}` : y}
          </text>
        ))}
        <text x={tx(0) - 8} y={ty(0) + 20} fontSize={14} fill="#6B7190" textAnchor="end">O</text>

        <g clipPath={`url(#${uid}-clip)`}>
          {display?.polygon && (
            <polygon
              points={display.polygon.map(([x, y]) => `${tx(x)},${ty(y)}`).join(' ')}
              fill="#16A34A"
              fillOpacity={0.15}
              stroke="#16A34A"
              strokeWidth={3}
            />
          )}
          {display?.lines?.map((l, i) => <line key={`l${i}`} {...infiniteLine(l.a, l.b)} stroke="#16A34A" strokeWidth={3} />)}
          {display?.hline !== undefined && (
            <line x1={0} y1={ty(display.hline)} x2={W} y2={ty(display.hline)} stroke="#16A34A" strokeWidth={3} strokeDasharray="10 6" />
          )}
          {display?.vline !== undefined && (
            <line x1={tx(display.vline)} y1={0} x2={tx(display.vline)} y2={H} stroke="#16A34A" strokeWidth={3} strokeDasharray="10 6" />
          )}
          {userLineOn && (
            <line {...infiniteLine(userPoints[0], userPoints[1])} stroke="#16A34A" strokeWidth={3} />
          )}
          {display?.arrows?.map((a, i) => {
            const kind = a.from[1] === a.to[1] ? 'x' : a.from[0] === a.to[0] ? 'y' : 'other';
            const len = Math.abs(kind === 'x' ? a.to[0] - a.from[0] : a.to[1] - a.from[1]);
            const mx = (tx(a.from[0]) + tx(a.to[0])) / 2;
            const my = (ty(a.from[1]) + ty(a.to[1])) / 2;
            return (
              <g key={`a${i}`}>
                <line
                  x1={tx(a.from[0])}
                  y1={ty(a.from[1])}
                  x2={tx(a.to[0])}
                  y2={ty(a.to[1])}
                  stroke={ARROW_COLORS[kind]}
                  strokeWidth={4}
                  markerEnd={`url(#${uid}-ah-${kind})`}
                />
                {kind !== 'other' && len > 0 && (
                  <text
                    x={mx + (kind === 'y' ? 10 : 0)}
                    y={my + (kind === 'x' ? -10 : 5)}
                    fontSize={16}
                    fontWeight={700}
                    fill={ARROW_COLORS[kind]}
                    textAnchor={kind === 'y' ? 'start' : 'middle'}
                  >
                    {len}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {display?.points?.map((p, i) => {
          const lp = labelPos(p.x, p.y);
          const text = [p.label, showDisplayCoords ? coordText(p.x, p.y) : ''].filter(Boolean).join(' ');
          return (
            <g key={`p${i}`}>
              <circle cx={tx(p.x)} cy={ty(p.y)} r={8} fill="#475569" />
              {text && (
                <text x={lp.x} y={lp.y} fontSize={16} fontWeight={600} fill="#1E2340" textAnchor={lp.anchor} paintOrder="stroke" stroke="#fff" strokeWidth={4}>
                  {text}
                </text>
              )}
            </g>
          );
        })}

        {answerPoints?.map((p, i) => (
          <circle key={`ans${i}`} cx={tx(p[0])} cy={ty(p[1])} r={11} fill="none" stroke="#16A34A" strokeWidth={4} />
        ))}

        {userPoints.map((p, i) => {
          const lp = labelPos(p[0], p[1]);
          const active = interactive && i === selected;
          return (
            <g key={`u${i}`}>
              {active && <circle cx={tx(p[0])} cy={ty(p[1])} r={16} fill="#F97316" opacity={0.2} />}
              <circle cx={tx(p[0])} cy={ty(p[1])} r={9} fill="#F97316" stroke="#fff" strokeWidth={2} />
              <text x={lp.x} y={lp.y} fontSize={17} fontWeight={700} fill="#C2410C" textAnchor={lp.anchor} paintOrder="stroke" stroke="#fff" strokeWidth={4}>
                {coordText(p[0], p[1])}
              </text>
            </g>
          );
        })}
      </svg>

      {interactive && showControls && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-ink-muted min-h-[1rem]" aria-live="polite">
            {userPoints.length === 0
              ? 'Ketuk bidang untuk menaruh titik.'
              : userLineOn
                ? lineRelation(userPoints[0], userPoints[1])
                : `Titik ${coordText(...userPoints[clamp(selected, 0, userPoints.length - 1)])} ${regionLabel(regionOf(...userPoints[clamp(selected, 0, userPoints.length - 1)]))}`}
          </p>
          <div className="flex shrink-0 items-center gap-1" aria-label="Geser titik">
            {(
              [
                ['◀', -1, 0, 'Geser kiri'],
                ['▲', 0, 1, 'Geser atas'],
                ['▼', 0, -1, 'Geser bawah'],
                ['▶', 1, 0, 'Geser kanan'],
              ] as const
            ).map(([icon, dx, dy, label]) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                disabled={userPoints.length === 0}
                onClick={() => nudge(dx, dy)}
                className="h-11 w-11 rounded-xl bg-brand-50 text-brand-700 font-bold disabled:opacity-40 active:scale-95"
              >
                {icon}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onUserPointsChange?.([]);
                setSelected(-1);
              }}
              disabled={userPoints.length === 0}
              className="h-11 rounded-xl px-3 text-sm font-semibold text-bad-700 bg-bad-50 disabled:opacity-40"
            >
              Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
