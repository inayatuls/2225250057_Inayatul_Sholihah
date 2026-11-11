import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import BottomNav from '../../app/BottomNav';
import { ErrorBox, Spinner, Stars } from '../../components/ui/Basics';
import { IconLock } from '../../components/ui/Icons';
import Screen from '../../components/ui/Screen';
import { api, errorMessage } from '../../lib/api';
import type { ModuleSummary } from '../../lib/types';

/** Tampilan tiap level: warna & deskripsi singkat (teks tampilan di satu tempat). */
const LEVEL_STYLE: Record<string, { emoji: string; label: string; ring: string; chip: string; bar: string; topics: string[] }> = {
  L1: {
    emoji: '🌱',
    label: 'Mudah',
    ring: 'border-ok-500/40',
    chip: 'bg-ok-50 text-ok-700',
    bar: 'bg-ok-500',
    topics: ['Sumbu X dan sumbu Y', 'Menaruh titik', 'Membaca koordinat'],
  },
  L2: {
    emoji: '🔥',
    label: 'Sedang',
    ring: 'border-amber-400/60',
    chip: 'bg-amber-50 text-amber-800',
    bar: 'bg-amber-400',
    topics: ['Kuadran', 'Geseran titik', 'Jarak sederhana'],
  },
  L3: {
    emoji: '🏆',
    label: 'Sulit',
    ring: 'border-accent-500/50',
    chip: 'bg-bad-50 text-bad-700',
    bar: 'bg-accent-500',
    topics: ['Soal cerita', 'Analisis titik', 'Penalaran & kombinasi konsep'],
  },
};

/** Latihan Soal: 3 level berurutan (Mudah → Sedang → Sulit). */
export default function PracticeLevelsPage() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['practice-levels'],
    queryFn: () => api.get<ModuleSummary[]>('/practice-levels'),
  });
  const done = data?.filter((l) => l.progress.status === 'completed').length ?? 0;

  return (
    <Screen title="Latihan Soal" subtitle="Uji pemahamanmu dari level Mudah sampai Sulit." nav={<BottomNav />}>
      {data && (
        <div className="mb-5">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium">Progres latihan</span>
            <span className="text-ink-muted">
              {done} dari {data.length} level selesai
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-brand-50">
            <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${(done / Math.max(1, data.length)) * 100}%` }} />
          </div>
        </div>
      )}
      {isLoading && <Spinner />}
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />}

      <ul className="space-y-4">
        {data?.map((lv, i) => {
          const st = LEVEL_STYLE[lv.code] ?? LEVEL_STYLE.L1;
          const locked = lv.progress.status === 'locked';
          const completed = lv.progress.status === 'completed';
          const started = lv.progress.status !== 'not_started' && !locked;
          return (
            <li key={lv.code} className={`rounded-card border-2 p-5 ${locked ? 'border-slate-100 bg-slate-50' : `${st.ring} bg-white`}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${locked ? 'bg-slate-100 grayscale' : st.chip}`}>
                    {st.emoji}
                  </span>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${locked ? 'text-ink-soft' : 'text-accent-500'}`}>
                      Level {i + 1} · {st.label}
                    </p>
                    <p className={`text-lg font-semibold ${locked ? 'text-ink-soft' : 'text-ink'}`}>{lv.title}</p>
                    <p className="text-sm text-ink-muted">
                      {lv.question_count} soal · ± {lv.minutes} menit
                    </p>
                  </div>
                </div>
                {locked ? <IconLock className="mt-1 shrink-0 text-ink-soft" aria-label="Terkunci" /> : <Stars count={lv.progress.stars} />}
              </div>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {st.topics.map((t) => (
                  <li key={t} className={`rounded-full px-2.5 py-1 text-xs ${locked ? 'bg-slate-100 text-ink-soft' : 'bg-brand-50 text-brand-700'}`}>
                    {t}
                  </li>
                ))}
              </ul>

              {started && (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-ink-muted">
                    <span>Skor terbaik</span>
                    <span className="font-semibold text-ink">{lv.progress.best_score}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${lv.progress.best_score}%` }} />
                  </div>
                </div>
              )}

              {locked ? (
                <p className="mt-4 text-sm text-ink-soft">Selesaikan {data[i - 1]?.title ?? 'level sebelumnya'} untuk membuka level ini.</p>
              ) : (
                <Link
                  to={`/latihan/${lv.code}`}
                  className="mt-4 flex min-h-[48px] items-center justify-center rounded-2xl bg-accent-500 font-semibold text-white transition hover:bg-accent-600"
                >
                  {completed ? '🔁 Ulangi Latihan' : 'Mulai Latihan'}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Setiap soal dijawab satu kali. Setelah menjawab, kamu langsung melihat benar/salah beserta pembahasannya.
      </p>
    </Screen>
  );
}
