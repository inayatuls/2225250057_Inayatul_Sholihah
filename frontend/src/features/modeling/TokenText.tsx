/**
 * Teks cerita yang dapat diketuk per frasa (langkah ① Pahami).
 * mode "tap": frasa penting bergaris bawah; "self": tanpa penanda (siswa mencari sendiri).
 */
export default function TokenText({
  text,
  tappables,
  known,
  asked,
  mode,
  onTap,
  disabled,
}: {
  text: string;
  tappables: string[];
  known: string[];
  asked: string[];
  mode: 'auto' | 'tap' | 'self';
  onTap: (token: string) => void;
  disabled?: boolean;
}) {
  const sorted = [...tappables].sort((a, b) => b.length - a.length);
  const esc = sorted.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = esc.length ? text.split(new RegExp(`(${esc.join('|')})`, 'g')) : [text];
  return (
    <p className="text-[17px] leading-8 text-ink">
      {parts.map((p, i) => {
        if (!tappables.includes(p)) return <span key={i}>{p}</span>;
        const isKnown = known.includes(p);
        const isAsked = asked.includes(p);
        const cls = isKnown
          ? 'bg-hl text-ink'
          : isAsked
            ? 'bg-accent-400/30 text-ink'
            : mode === 'self'
              ? ''
              : 'underline decoration-dotted decoration-2 underline-offset-4 decoration-brand-500';
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onTap(p)}
            className={`rounded px-0.5 text-left ${cls}`}
            aria-pressed={isKnown || isAsked}
          >
            {p}
          </button>
        );
      })}
    </p>
  );
}
