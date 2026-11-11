import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBox, Spinner, Stars } from '../../components/ui/Basics';
import { IconClock, IconList, IconMedal } from '../../components/ui/Icons';
import Screen, { FooterButton } from '../../components/ui/Screen';
import { api, errorMessage } from '../../lib/api';
import type { ModuleDetail } from '../../lib/types';

/** Pengantar modul (mengikuti layar ke-1 referensi UI): statistik + "Sebelum mulai". */
export default function ModuleIntroPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['module', code],
    queryFn: () => api.get<ModuleDetail>(`/modules/${code}`),
  });

  const started = !!data?.progress && data.progress.status !== 'not_started';

  return (
    <Screen
      back="/beranda"
      title={data?.title ?? 'Modul'}
      subtitle={data ? `${data.code} · ${data.subtitle}` : undefined}
      footer={data && <FooterButton onClick={() => navigate(`/modul/${code}/materi`)}>{started ? 'Lanjutkan Belajar' : 'Mulai Belajar'}</FooterButton>}
    >
      {isLoading && <Spinner />}
      {error && <ErrorBox message={errorMessage(error)} onRetry={() => void refetch()} />}
      {data && (
        <>
          <ul className="mt-2 space-y-5">
            <Stat icon={<IconList />} value={`${data.question_count}`} label="Soal latihan" />
            <Stat icon={<IconClock />} value={`± ${data.minutes} menit`} label="Tanpa batas waktu" />
            <Stat icon={<IconMedal />} value="85%" label="Untuk tiga bintang ★★★" />
          </ul>
          {data.progress && data.progress.status !== 'not_started' && (
            <p className="mt-5 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
              Skor terbaikmu: <strong>{data.progress.best_score}</strong> <Stars count={data.progress.stars} />
            </p>
          )}
          <div className="-mx-5 my-6 h-2 bg-slate-100" />
          <h2 className="text-lg font-semibold">Sebelum mulai</h2>
          <ul className="mt-3 list-disc space-y-3 pl-5 text-[15px] text-ink-muted">
            <li>Pelajari materinya dulu. Setiap layar hanya berisi satu langkah kecil.</li>
            <li>Setiap soal bernilai 100. Petunjuk boleh dipakai, tetapi skor maksimal soal berkurang.</li>
            <li>Salah itu wajar! Kamu boleh mencoba lagi. Setelah 3 kali, pembahasan akan muncul.</li>
            <li>Tidak ada batas waktu. Kerjakan dengan tenang.</li>
          </ul>
          {started && (
            <Link to={`/modul/${code}/latihan`} className="mt-6 block text-center text-sm font-semibold text-brand-600">
              Langsung ke latihan →
            </Link>
          )}
          <p className="mt-6 text-center text-xs uppercase tracking-wider text-ink-soft">Semangat belajar!</p>
        </>
      )}
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <li className="flex items-center gap-4">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand-100 text-brand-600">{icon}</span>
      <span>
        <span className="block text-lg font-semibold text-brand-800">{value}</span>
        <span className="block text-sm text-ink-soft">{label}</span>
      </span>
    </li>
  );
}
