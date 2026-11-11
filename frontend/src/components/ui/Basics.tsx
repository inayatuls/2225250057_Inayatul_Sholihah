import type { ReactNode } from 'react';
import { IconCheck, IconCross } from './Icons';

/** Progress bar teal (gaya referensi), menampilkan kemajuan soal — bukan pengatur waktu. */
export function ProgressBar({ value, label, tone = 'brand' }: { value: number; label?: string; tone?: 'brand' | 'light' }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`relative h-9 w-full overflow-hidden rounded-full ${tone === 'brand' ? 'bg-brand-800/60' : 'bg-brand-50'}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-teal-400 transition-all duration-300" style={{ width: `${Math.max(pct, 12)}%` }} />
      {label && <span className="absolute inset-y-0 left-4 flex items-center text-sm font-medium text-brand-800">{label}</span>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card bg-white p-5 text-ink shadow-card ${className}`}>{children}</div>;
}

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong';

/** Pilihan jawaban bergaya referensi: abu (biasa), hijau ✓ (benar), pink ✗ (salah). */
export function OptionButton({
  label,
  state = 'idle',
  onClick,
  disabled,
}: {
  label: ReactNode;
  state?: OptionState;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const styles: Record<OptionState, string> = {
    idle: 'border-slate-200 bg-white text-ink-muted',
    selected: 'border-brand-500 bg-brand-50 text-brand-800',
    correct: 'border-ok-500 bg-ok-50 text-ok-700',
    wrong: 'border-bad-500 bg-bad-50 text-bad-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === 'selected'}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left text-[15px] transition ${styles[state]} disabled:cursor-default`}
    >
      <span>{label}</span>
      <span className="shrink-0">
        {state === 'correct' ? (
          <IconCheck className="text-ok-500" />
        ) : state === 'wrong' ? (
          <IconCross className="text-bad-500" />
        ) : (
          <span className={`block h-5 w-5 rounded-full border-2 ${state === 'selected' ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`} />
        )}
      </span>
    </button>
  );
}

export function Feedback({ ok, children }: { ok: boolean | 'partial'; children: ReactNode }) {
  const good = ok === true;
  return (
    <div
      role="status"
      className={`mt-4 flex gap-3 rounded-2xl border-2 p-4 text-[15px] ${
        good ? 'border-ok-500 bg-ok-50 text-ok-700' : 'border-bad-500 bg-bad-50 text-bad-700'
      }`}
    >
      {good ? <IconCheck className="shrink-0" /> : <IconCross className="shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

export function Stars({ count, size = 'text-base' }: { count: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${count} dari 3 bintang`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < count ? 'text-amber-400' : 'text-slate-300'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-muted" role="status">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-bad-50 p-4 text-sm text-bad-700" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">
          Coba lagi
        </button>
      )}
    </div>
  );
}

/** Teks dengan **tebal** sederhana. */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className={className}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold text-brand-700">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

/** Teks soal dengan angka/kata kunci disorot kuning (signaling, W-3). */
export function Highlighted({ text, highlights = [] }: { text: string; highlights?: string[] }) {
  if (!highlights.length) return <>{text}</>;
  const esc = highlights.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
  const parts = text.split(new RegExp(`(${esc.join('|')})`, 'g'));
  return (
    <>
      {parts.map((p, i) =>
        highlights.includes(p) ? (
          <mark key={i} className="rounded bg-hl px-1 text-ink">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base text-ink outline-none focus:border-brand-500';

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const v = {
    primary: 'bg-accent-500 text-white hover:bg-accent-600',
    secondary: 'bg-brand-600 text-white hover:bg-brand-700',
    ghost: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
    danger: 'bg-bad-50 text-bad-700 hover:bg-bad-500 hover:text-white',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[48px] rounded-2xl px-5 py-3 font-semibold transition disabled:opacity-50 ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function Modal({ open, children, onClose }: { open: boolean; children: ReactNode; onClose?: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[420px] rounded-card bg-white p-6 text-ink shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
