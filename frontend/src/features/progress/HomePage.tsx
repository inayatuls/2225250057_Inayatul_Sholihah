import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ErrorBox, Spinner, Stars } from '../../components/ui/Basics';
import { IconLock } from '../../components/ui/Icons';
import Screen from '../../components/ui/Screen';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { ModuleSummary } from '../../lib/types';
import BottomNav from '../../app/BottomNav';
import Tutorial from '../onboarding/Tutorial';

export default function HomePage() {
  const user = useAuth((s) => s.user);
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['modules'],
    queryFn: () => api.get<ModuleSummary[]>('/modules'),
  });
  const done = data?.filter((m) => m.progress.status === 'completed').length ?? 0;

  return (
    <Screen
      title={`Hai, ${user?.display_name.split(' ')[0] ?? ''} 👋`}
      subtitle={user?.class ? `Kelas ${user.class.name} · ${user.class.teacher_name}` : 'Belum bergabung ke kelas'}
      nav={<BottomNav />}
    >
      {!user?.class && (
        <Link to="/gabung-kelas" className="mb-4 block rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Punya kode kelas dari guru? <strong>Gabung sekarang →</strong>
        </Link>
      )}
      <Link
        to="/latihan"
        className="mb-4 flex items-center gap-3 rounded-card bg-brand-600 p-4 text-white shadow-card transition hover:bg-brand-700"
      >
        <span className="text-3xl" aria-hidden>
          🎯
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Latihan Soal</span>
          <span className="block text-sm text-white/80">Level Mudah, Sedang, dan Sulit · 36 soal</span>
        </span>
        <span className="rounded-xl bg-accent-500 px-3 py-2 text-sm font-semibold">Mulai</span>
      </Link>
      {data && (
        <p className="mb-4 text-sm text-ink-muted">
          {done} dari {data.length} modul selesai
        </p>
      )}
      {isLoading && <Spinner />}
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />}
      <ul className="space-y-3">
        {data?.map((m) => {
          const locked = m.progress.status === 'locked';
          const pct = m.progress.status === 'completed' ? 100 : m.progress.best_score;
          const body = (
            <div
              className={`rounded-card border-2 p-4 transition ${
                locked ? 'border-slate-100 bg-slate-50 text-ink-soft' : 'border-brand-100 bg-white hover:border-brand-500'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-accent-500">{m.code}</p>
                  <p className="text-[17px] font-semibold text-ink">{m.title}</p>
                  <p className="text-sm text-ink-muted">{m.subtitle}</p>
                </div>
                {locked ? <IconLock className="mt-1 shrink-0" aria-label="Terkunci" /> : <Stars count={m.progress.stars} />}
              </div>
              {!locked && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-50">
                  <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
                </div>
              )}
              {locked && <p className="mt-2 text-xs">Selesaikan modul sebelumnya untuk membuka.</p>}
            </div>
          );
          return <li key={m.code}>{locked ? body : <Link to={`/modul/${m.code}`}>{body}</Link>}</li>;
        })}
      </ul>
      {user && !user.onboarding_done && <Tutorial />}
    </Screen>
  );
}
