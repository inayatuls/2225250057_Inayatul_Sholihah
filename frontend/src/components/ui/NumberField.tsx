import { useEffect, useState } from 'react';
import { parseNum } from '../../lib/math/coords';

/**
 * Isian angka ramah HP: tombol ± karena papan angka di beberapa HP tidak punya tanda minus.
 */
export default function NumberField({
  value,
  onChange,
  label,
  placeholder = '0',
  unit,
  width = 'w-24',
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  placeholder?: string;
  unit?: string;
  width?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));

  useEffect(() => {
    const parsed = parseNum(text);
    if (parsed !== value) setText(value === null ? '' : String(value).replace('-', '−'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function update(t: string) {
    setText(t);
    onChange(parseNum(t));
  }

  function toggleSign() {
    const t = text.trim();
    if (t.startsWith('−') || t.startsWith('-')) update(t.slice(1));
    else update('−' + t);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={toggleSign}
        disabled={disabled}
        aria-label={`Ubah tanda ${label}`}
        className="h-11 w-9 rounded-xl bg-brand-50 font-bold text-brand-700 disabled:opacity-40"
      >
        ±
      </button>
      <input
        aria-label={label}
        inputMode="decimal"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => update(e.target.value)}
        className={`${width} h-11 rounded-xl border-2 border-slate-200 bg-white px-2 text-center text-base font-semibold text-ink outline-none focus:border-brand-500 disabled:bg-slate-50`}
      />
      {unit && <span className="text-sm text-ink-muted">{unit}</span>}
    </span>
  );
}

/** Isian pasangan koordinat ( x , y ). */
export function PointField({
  value,
  onChange,
  label,
  disabled,
}: {
  value: [number | null, number | null];
  onChange: (v: [number | null, number | null]) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 text-lg font-semibold text-ink">
      (
      <NumberField label={`x ${label}`} value={value[0]} onChange={(x) => onChange([x, value[1]])} width="w-16" disabled={disabled} />
      ,
      <NumberField label={`y ${label}`} value={value[1]} onChange={(y) => onChange([value[0], y])} width="w-16" disabled={disabled} />)
    </span>
  );
}
