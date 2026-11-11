import NumberField from '../../components/ui/NumberField';
import { DIR_OPTIONS, cardOf } from '../../content/modelCards';
import type { Dir, Model, MPoint, Move } from '../../lib/math/models/types';

/**
 * Formulir penyusun model dengan kosakata cerita (utara/timur/…), bukan notasi formal.
 * Dipakai di Lab Pemodelan (langkah Rumuskan) dan Pemodel Bebas.
 */
export default function ModelBuilder({ model, onChange, disabled }: { model: Model; onChange: (m: Model) => void; disabled?: boolean }) {
  const set = (patch: Partial<Model>) => onChange({ ...model, ...patch });
  const card = cardOf(model.kind);

  return (
    <div className="space-y-4">
      {card && (
        <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          <span className="mr-1">{card.icon}</span>
          <strong>{card.name}</strong> — {card.notation}
        </p>
      )}

      {(model.kind === 'translate' || model.kind === 'route_chain') && (
        <>
          <PointRow label="Mulai dari" point={model.start} onChange={(start) => set({ start })} disabled={disabled} withName />
          <div className="space-y-2">
            <p className="text-sm font-medium">Perpindahan</p>
            {(model.moves ?? []).map((mv, i) => (
              <MoveRow
                key={i}
                index={i}
                move={mv}
                disabled={disabled}
                onChange={(m) => set({ moves: (model.moves ?? []).map((x, j) => (j === i ? m : x)) })}
                onRemove={
                  (model.moves ?? []).length > 1
                    ? () => set({ moves: (model.moves ?? []).filter((_, j) => j !== i) })
                    : undefined
                }
              />
            ))}
            {(model.moves ?? []).length < (model.kind === 'translate' ? 2 : 10) && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => set({ moves: [...(model.moves ?? []), { dir: '', n: 1 }] })}
                className="text-sm font-semibold text-brand-600"
              >
                + Tambah perpindahan
              </button>
            )}
          </div>
          <ScaleRow model={model} onChange={onChange} disabled={disabled} />
        </>
      )}

      {model.kind === 'axis_distance' && (
        <>
          <PointRow label="Titik A" point={model.a} onChange={(a) => set({ a })} disabled={disabled} />
          <PointRow label="Titik B" point={model.b} onChange={(b) => set({ b })} disabled={disabled} />
          <ScaleRow model={model} onChange={onChange} disabled={disabled} />
        </>
      )}

      {model.kind === 'relative_position' && (
        <>
          <PointRow label="Titik acuan (A) — dilihat dari" point={model.a} onChange={(a) => set({ a })} disabled={disabled} withName />
          <PointRow label="Titik yang dicari (B)" point={model.b} onChange={(b) => set({ b })} disabled={disabled} withName />
        </>
      )}

      {model.kind === 'axis_line' && (
        <>
          <PointRow label="Garis melalui titik" point={model.through} onChange={(through) => set({ through })} disabled={disabled} />
          <div className="flex flex-wrap gap-2">
            {(['x', 'y'] as const).map((ax) => (
              <button
                key={ax}
                type="button"
                disabled={disabled}
                onClick={() => set({ parallel_to: ax })}
                className={`min-h-[44px] rounded-xl border-2 px-3 text-sm font-semibold ${
                  model.parallel_to === ax ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink-muted'
                }`}
              >
                Sejajar sumbu {ax.toUpperCase()}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand-600"
              checked={!!model.from}
              disabled={disabled}
              onChange={(e) => set({ from: e.target.checked ? { x: 0, y: 0 } : null })}
            />
            Cari titik terdekat dari sebuah titik
          </label>
          {model.from && <PointRow label="Titik asal" point={model.from} onChange={(from) => set({ from })} disabled={disabled} withName />}
          <ScaleRow model={model} onChange={onChange} disabled={disabled} />
        </>
      )}

      {(model.kind === 'rect_shape' || model.kind === 'right_triangle') && (
        <>
          <PointRow label="Titik A" point={model.a} onChange={(a) => set({ a })} disabled={disabled} />
          <PointRow label={model.kind === 'right_triangle' ? 'Titik B (sudut siku)' : 'Titik B (sudut, di antara A dan C)'} point={model.b} onChange={(b) => set({ b })} disabled={disabled} />
          <PointRow label="Titik C" point={model.c} onChange={(c) => set({ c })} disabled={disabled} />
          <ScaleRow model={model} onChange={onChange} disabled={disabled} />
        </>
      )}

      {model.kind === 'point_pattern' && (
        <>
          <PointRow label="Titik pertama" point={model.first} onChange={(first) => set({ first })} disabled={disabled} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">Geseran tiap titik:</span>
            <NumberField label="geseran x" value={model.step?.dx ?? null} onChange={(dx) => set({ step: { dx: dx ?? NaN, dy: model.step?.dy ?? 0 } })} width="w-16" disabled={disabled} />
            <span>mendatar,</span>
            <NumberField label="geseran y" value={model.step?.dy ?? null} onChange={(dy) => set({ step: { dx: model.step?.dx ?? 0, dy: dy ?? NaN } })} width="w-16" disabled={disabled} />
            <span>tegak</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Titik ke-n, n =</span>
            <NumberField label="n" value={model.n ?? null} onChange={(n) => set({ n: n ?? NaN })} width="w-16" disabled={disabled} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand-600"
              checked={!!model.boundary}
              disabled={disabled}
              onChange={(e) => set({ boundary: e.target.checked ? { axis: 'x', max: 8 } : null })}
            />
            Ada batas (mis. batas kanan taman)
          </label>
          {model.boundary && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select
                aria-label="Sumbu batas"
                className="h-11 rounded-xl border-2 border-slate-200 px-2"
                value={model.boundary.axis}
                disabled={disabled}
                onChange={(e) => set({ boundary: { ...model.boundary!, axis: e.target.value as 'x' | 'y' } })}
              >
                <option value="x">x</option>
                <option value="y">y</option>
              </select>
              <span>≤</span>
              <NumberField
                label="batas maksimum"
                value={model.boundary.max ?? null}
                onChange={(max) => set({ boundary: { ...model.boundary!, max } })}
                width="w-16"
                disabled={disabled}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PointRow({
  label,
  point,
  onChange,
  disabled,
  withName,
}: {
  label: string;
  point?: MPoint | null;
  onChange: (p: MPoint) => void;
  disabled?: boolean;
  withName?: boolean;
}) {
  const p = point ?? { x: NaN, y: NaN };
  const val = (v: number) => (Number.isFinite(v) ? v : null);
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-1 text-lg font-semibold">
        (
        <NumberField label={`x ${label}`} value={val(p.x)} onChange={(x) => onChange({ ...p, x: x ?? NaN })} width="w-16" disabled={disabled} />
        ,
        <NumberField label={`y ${label}`} value={val(p.y)} onChange={(y) => onChange({ ...p, y: y ?? NaN })} width="w-16" disabled={disabled} />)
        {withName && (
          <input
            aria-label={`Nama ${label}`}
            placeholder="nama (opsional)"
            value={p.label ?? ''}
            disabled={disabled}
            maxLength={24}
            onChange={(e) => onChange({ ...p, label: e.target.value })}
            className="ml-1 h-11 w-36 rounded-xl border-2 border-slate-200 px-2 text-sm font-normal outline-none focus:border-brand-500"
          />
        )}
      </div>
    </div>
  );
}

function MoveRow({
  index,
  move,
  onChange,
  onRemove,
  disabled,
}: {
  index: number;
  move: Move;
  onChange: (m: Move) => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-5 text-sm text-ink-muted">{index + 1}.</span>
      <select
        aria-label={`Arah perpindahan ${index + 1}`}
        value={move.dir}
        disabled={disabled}
        onChange={(e) => onChange({ ...move, dir: e.target.value as Dir })}
        className="h-11 rounded-xl border-2 border-slate-200 bg-white px-2 text-sm"
      >
        <option value="">pilih arah</option>
        {DIR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <NumberField
        label={`banyak langkah ${index + 1}`}
        value={Number.isFinite(move.n) && move.n !== 0 ? move.n : null}
        onChange={(n) => onChange({ ...move, n: n ?? 0 })}
        unit="satuan"
        width="w-14"
        disabled={disabled}
      />
      {onRemove && (
        <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Hapus perpindahan ${index + 1}`} className="h-11 w-11 rounded-xl text-bad-700">
          ✕
        </button>
      )}
    </div>
  );
}

function ScaleRow({ model, onChange, disabled }: { model: Model; onChange: (m: Model) => void; disabled?: boolean }) {
  const sc = model.scale;
  return (
    <div className="space-y-2 rounded-2xl border-2 border-dashed border-slate-200 p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="h-5 w-5 accent-brand-600"
          checked={!!sc}
          disabled={disabled}
          onChange={(e) => onChange({ ...model, scale: e.target.checked ? { per_unit: 1, unit: 'm' } : null })}
        />
        🗺️ Pakai skala (MP-7)
      </label>
      {sc && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>1 satuan =</span>
          <NumberField
            label="nilai skala"
            value={Number.isFinite(sc.per_unit) ? sc.per_unit : null}
            onChange={(v) => onChange({ ...model, scale: { ...sc, per_unit: v ?? NaN } })}
            width="w-20"
            disabled={disabled}
          />
          <select
            aria-label="Satuan skala"
            value={sc.unit}
            disabled={disabled}
            onChange={(e) => onChange({ ...model, scale: { ...sc, unit: e.target.value } })}
            className="h-11 rounded-xl border-2 border-slate-200 bg-white px-2"
          >
            {['cm', 'm', 'km'].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/** Bersihkan model dari isian kosong (NaN → dihapus agar mesin memberi pesan ramah). */
export function cleanModel(m: Model): Model {
  return JSON.parse(JSON.stringify(m, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? undefined : v))) as Model;
}
