import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, ErrorBox, Modal, Spinner, Stars } from '../../components/ui/Basics';
import { IconCopy } from '../../components/ui/Icons';
import { MISCONCEPTION_NAMES } from '../../content/steps';
import { api, download, errorMessage } from '../../lib/api';
import type { LiteracyProcess } from '../../lib/types';
import LiteracyBars from '../literacy/LiteracyBars';
import TeacherLayout from './TeacherLayout';

interface Overview {
  class: { id: string; name: string; join_code: string; sequential_unlock: boolean; survey_enabled: boolean; is_archived: boolean };
  student_count: number;
  completion_percent: number;
  average_score: number;
  needs_help: number;
  hardest_question: Item | null;
}
interface StudentRow {
  id: string;
  display_name: string;
  username: string;
  modules: { code: string; status: string; stars: number; score: number }[];
  average: number;
  completed: number;
  last_active_at: string | null;
  needs_help: boolean;
}
interface Item {
  question_id: string;
  question_slug: string;
  type: string;
  prompt: string;
  module: string;
  attempted_by: number;
  percent_correct_first_try: number;
  avg_attempts: number;
  avg_hints: number;
  top_misconceptions: { code: string; percent: number }[];
}
interface ClassLiteracy {
  processes: LiteracyProcess[];
  trend: { week: string; formulate: number | null; employ: number | null; interpret: number | null }[];
  students: { student_id: string; display_name: string; processes: LiteracyProcess[]; weakest: string | null }[];
  weak_counts: Record<string, number>;
}

const TABS = ['Ringkasan', 'Siswa', 'Analisis Soal', 'Literasi', 'Pengaturan'] as const;
type Tab = (typeof TABS)[number];

function ago(iso: string | null): string {
  if (!iso) return 'belum pernah';
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (d < 1) return 'hari ini';
  if (d < 2) return 'kemarin';
  return `${Math.floor(d)} hari lalu`;
}

export default function ClassPage() {
  const { id = '' } = useParams();
  const [tab, setTab] = useState<Tab>('Ringkasan');
  const ov = useQuery({ queryKey: ['t-overview', id], queryFn: () => api.get<Overview>(`/teacher/classes/${id}/overview`) });
  const [copied, setCopied] = useState(false);

  return (
    <TeacherLayout title={ov.data?.class.name ?? 'Kelas'} back="/guru">
      {ov.isLoading && <Spinner />}
      {ov.error && <ErrorBox message={errorMessage(ov.error)} />}
      {ov.data && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="text-sm text-ink-muted">Kode kelas:</span>
            <span className="rounded-xl bg-white px-3 py-1 font-mono text-xl font-bold tracking-widest text-brand-700 shadow">{ov.data.class.join_code}</span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(ov.data!.class.join_code);
                setCopied(true);
              }}
              className="flex items-center gap-1 text-sm font-semibold text-brand-600"
            >
              <IconCopy /> {copied ? 'Tersalin!' : 'Salin'}
            </button>
            <Button variant="ghost" className="ml-auto text-sm" onClick={() => void download(`/teacher/classes/${id}/export.csv`, `nilai-${ov.data!.class.name}.csv`)}>
              ⬇ Ekspor CSV
            </Button>
          </div>
          <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                type="button"
                onClick={() => setTab(t)}
                className={`min-h-[44px] whitespace-nowrap rounded-xl px-4 text-sm font-semibold ${tab === t ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-brand-50'}`}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'Ringkasan' && <Summary o={ov.data} />}
          {tab === 'Siswa' && <Students classId={id} />}
          {tab === 'Analisis Soal' && <Items classId={id} />}
          {tab === 'Literasi' && <Literacy classId={id} />}
          {tab === 'Pengaturan' && <Settings o={ov.data} />}
        </>
      )}
    </TeacherLayout>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold text-brand-700">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

function Summary({ o }: { o: Overview }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Siswa" value={`${o.student_count}`} />
        <StatCard label="Penyelesaian modul" value={`${o.completion_percent}%`} />
        <StatCard label="Rata-rata skor" value={`${o.average_score}`} />
        <StatCard label="Perlu bantuan" value={`${o.needs_help}`} hint="rata-rata skor < 60" />
      </div>
      {o.hardest_question && (
        <div className="rounded-card bg-white p-5 shadow-card">
          <p className="text-sm text-ink-muted">Soal tersulit (benar di percobaan pertama)</p>
          <p className="mt-1 font-semibold">
            {o.hardest_question.module} · {o.hardest_question.prompt}
          </p>
          <p className="text-sm text-bad-700">{o.hardest_question.percent_correct_first_try}% benar</p>
        </div>
      )}
    </div>
  );
}

function Students({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['t-students', classId], queryFn: () => api.get<{ modules: string[]; students: StudentRow[] }>(`/teacher/classes/${classId}/students`) });
  const [temp, setTemp] = useState<{ name: string; pw: string } | null>(null);
  const [sort, setSort] = useState<'name' | 'avg'>('name');

  async function reset(s: StudentRow) {
    const r = await api.post<{ temporary_password: string }>(`/classes/${classId}/members/${s.id}/reset-password`);
    setTemp({ name: s.display_name, pw: r.temporary_password });
  }
  async function remove(s: StudentRow) {
    if (!window.confirm(`Keluarkan ${s.display_name} dari kelas?`)) return;
    await api.del(`/classes/${classId}/members/${s.id}`);
    void qc.invalidateQueries({ queryKey: ['t-students', classId] });
  }

  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorBox message={errorMessage(q.error)} />;
  const rows = [...(q.data?.students ?? [])].sort((a, b) => (sort === 'avg' ? a.average - b.average : a.display_name.localeCompare(b.display_name)));
  return (
    <div className="overflow-x-auto rounded-card bg-white shadow-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-brand-50 text-left text-brand-800">
          <tr>
            <th className="px-4 py-3">
              <button type="button" onClick={() => setSort('name')} className="font-semibold">Nama ↕</button>
            </th>
            {q.data?.modules.map((m) => (
              <th key={m} className="px-2 py-3 text-center">{m}</th>
            ))}
            <th className="px-2 py-3 text-center">
              <button type="button" onClick={() => setSort('avg')} className="font-semibold">Rata-rata ↕</button>
            </th>
            <th className="px-2 py-3">Aktif</th>
            <th className="px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className={`border-t border-slate-100 ${s.needs_help ? 'bg-bad-50/60' : ''}`}>
              <td className="px-4 py-3">
                <Link to={`/guru/kelas/${classId}/siswa/${s.id}`} className="font-semibold text-brand-700 hover:underline">
                  {s.display_name}
                </Link>
                <span className="block text-xs text-ink-soft">@{s.username}</span>
                {s.needs_help && <span className="mt-1 inline-block rounded-full bg-bad-500 px-2 text-[11px] text-white">Perlu bantuan</span>}
              </td>
              {s.modules.map((m) => (
                <td key={m.code} className="px-2 py-3 text-center">
                  {m.status === 'not_started' ? <span className="text-ink-soft">—</span> : <Stars count={m.stars} size="text-sm" />}
                </td>
              ))}
              <td className="px-2 py-3 text-center font-semibold">{s.average}</td>
              <td className="px-2 py-3 text-xs text-ink-muted">{ago(s.last_active_at)}</td>
              <td className="px-2 py-3 text-right">
                <button type="button" onClick={() => void reset(s)} className="mr-2 text-xs font-semibold text-brand-600">Reset sandi</button>
                <button type="button" onClick={() => void remove(s)} className="text-xs font-semibold text-bad-700">Keluarkan</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-5 text-ink-muted">Belum ada siswa. Bagikan kode kelas kepada siswa.</p>}
      <Modal open={!!temp} onClose={() => setTemp(null)}>
        <p className="text-lg font-semibold">Kata sandi sementara</p>
        <p className="mt-2 text-sm text-ink-muted">Berikan kepada {temp?.name}. Siswa wajib menggantinya saat masuk.</p>
        <p className="my-4 text-center font-mono text-3xl font-bold tracking-widest text-brand-700">{temp?.pw}</p>
        <Button className="w-full" onClick={() => setTemp(null)}>Tutup</Button>
      </Modal>
    </div>
  );
}

function Items({ classId }: { classId: string }) {
  const q = useQuery({ queryKey: ['t-items', classId], queryFn: () => api.get<Item[]>(`/teacher/classes/${classId}/items`) });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorBox message={errorMessage(q.error)} />;
  if (!q.data?.length) return <p className="text-ink-muted">Belum ada jawaban siswa.</p>;
  return (
    <div className="space-y-3">
      {q.data.map((i) => (
        <div key={i.question_id} className="rounded-card bg-white p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-accent-500">
                {i.module} · {i.question_slug}
                {i.type === 'modeling' ? ' · pemodelan' : ''}
              </p>
              <p className="font-medium">{i.prompt}</p>
            </div>
            <p className={`text-2xl font-bold ${i.percent_correct_first_try < 50 ? 'text-bad-700' : 'text-ok-700'}`}>{i.percent_correct_first_try}%</p>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {i.attempted_by} siswa · rata-rata {i.avg_attempts} percobaan · {i.avg_hints} petunjuk
          </p>
          {i.top_misconceptions.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {i.top_misconceptions.map((m) => (
                <li key={m.code} className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">
                  {MISCONCEPTION_NAMES[m.code]?.replace('Kesalahan umum: ', '') ?? m.code}: {m.percent}%
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function Literacy({ classId }: { classId: string }) {
  const q = useQuery({ queryKey: ['t-literacy', classId], queryFn: () => api.get<ClassLiteracy>(`/teacher/classes/${classId}/literacy`) });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorBox message={errorMessage(q.error)} />;
  const d = q.data!;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-card bg-white p-5 shadow-card">
        <p className="mb-4 font-semibold">Rata-rata kelas per proses literasi</p>
        <LiteracyBars processes={d.processes} />
        <ul className="mt-4 space-y-1 text-sm text-ink-muted">
          {Object.entries(d.weak_counts).map(([k, v]) => (
            <li key={k}>
              {v} siswa paling lemah pada <strong>{k}</strong>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-card bg-white p-5 shadow-card">
        <p className="mb-3 font-semibold">Tren mingguan</p>
        {d.trend.length === 0 ? (
          <p className="text-sm text-ink-muted">Belum ada data.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-ink-muted">
              <tr>
                <th className="py-1">Minggu</th>
                <th>Merumuskan</th>
                <th>Menerapkan</th>
                <th>Menafsirkan</th>
              </tr>
            </thead>
            <tbody>
              {d.trend.map((t) => (
                <tr key={t.week} className="border-t border-slate-100">
                  <td className="py-1">{t.week}</td>
                  <td>{t.formulate ?? '—'}</td>
                  <td>{t.employ ?? '—'}</td>
                  <td>{t.interpret ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="overflow-x-auto rounded-card bg-white p-5 shadow-card lg:col-span-2">
        <p className="mb-3 font-semibold">Per siswa</p>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-ink-muted">
            <tr>
              <th className="py-1">Nama</th>
              <th>Merumuskan</th>
              <th>Menerapkan</th>
              <th>Menafsirkan</th>
              <th>Paling lemah</th>
            </tr>
          </thead>
          <tbody>
            {d.students.map((s) => (
              <tr key={s.student_id} className="border-t border-slate-100">
                <td className="py-2">
                  <Link to={`/guru/kelas/${classId}/siswa/${s.student_id}`} className="font-medium text-brand-700 hover:underline">
                    {s.display_name}
                  </Link>
                </td>
                {s.processes.map((p) => (
                  <td key={p.process}>{p.score ?? '—'}</td>
                ))}
                <td>{s.weakest ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Settings({ o }: { o: Overview }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  async function patch(body: Record<string, unknown>) {
    try {
      await api.patch(`/classes/${o.class.id}`, body);
      void qc.invalidateQueries({ queryKey: ['t-overview', o.class.id] });
      void qc.invalidateQueries({ queryKey: ['classes'] });
      setMsg('Pengaturan disimpan.');
    } catch (e) {
      setMsg(errorMessage(e));
    }
  }
  const Toggle = ({ label, desc, value, k }: { label: string; desc: string; value: boolean; k: string }) => (
    <label className="flex items-start justify-between gap-4 border-t border-slate-100 py-4 first:border-0">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-ink-muted">{desc}</span>
      </span>
      <input type="checkbox" className="mt-1 h-6 w-6 accent-brand-600" checked={value} onChange={(e) => void patch({ [k]: e.target.checked })} />
    </label>
  );
  return (
    <div className="max-w-xl rounded-card bg-white p-5 shadow-card">
      <Toggle label="Buka modul berurutan" desc="Modul berikutnya terbuka setelah modul sebelumnya selesai." value={o.class.sequential_unlock} k="sequential_unlock" />
      <Toggle label="Kuesioner beban kognitif (skala Paas)" desc="Tampilkan 1 pertanyaan singkat setelah setiap modul." value={o.class.survey_enabled} k="survey_enabled" />
      <Toggle label="Arsipkan kelas" desc="Siswa tidak dapat bergabung lagi ke kelas yang diarsipkan." value={o.class.is_archived} k="is_archived" />
      {msg && <p className="mt-2 text-sm text-ink-muted">{msg}</p>}
    </div>
  );
}
