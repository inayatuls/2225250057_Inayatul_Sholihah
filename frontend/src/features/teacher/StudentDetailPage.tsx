import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ErrorBox, Spinner, Stars } from '../../components/ui/Basics';
import { MISCONCEPTION_NAMES, STEP_INFO } from '../../content/steps';
import { api, errorMessage } from '../../lib/api';
import type { LiteracyProfile, ModuleSummary, StepName } from '../../lib/types';
import LiteracyBars from '../literacy/LiteracyBars';
import TeacherLayout from './TeacherLayout';

interface Detail {
  student: { id: string; display_name: string; username: string; last_active_at: string | null };
  modules: ModuleSummary[];
  literacy: LiteracyProfile;
  history: {
    id: string;
    module: string;
    question_slug: string;
    type: string;
    prompt: string;
    answer: Record<string, unknown> | null;
    is_correct: boolean;
    score: number;
    hints_used: number;
    misconception_code: string | null;
    attempt_number: number;
    finished: boolean;
    submitted_at: string;
    steps: { step: StepName; is_correct: boolean; score: number; max_score: number; try_number: number; misconception_code: string | null; input: Record<string, unknown> }[];
  }[];
}

function answerText(a: Record<string, unknown> | null): string {
  if (!a) return '';
  if (Array.isArray(a.points)) return (a.points as { x: number; y: number }[]).map((p) => `(${p.x}, ${p.y})`).join(', ');
  return Object.entries(a)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('; ');
}

export default function StudentDetailPage() {
  const { id = '', sid = '' } = useParams();
  const q = useQuery({ queryKey: ['t-student', id, sid], queryFn: () => api.get<Detail>(`/teacher/classes/${id}/students/${sid}`) });
  const d = q.data;
  return (
    <TeacherLayout title={d?.student.display_name ?? 'Siswa'} back={`/guru/kelas/${id}`}>
      {q.isLoading && <Spinner />}
      {q.error && <ErrorBox message={errorMessage(q.error)} />}
      {d && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="rounded-card bg-white p-5 shadow-card">
              <p className="mb-3 font-semibold">Progres modul</p>
              <ul className="space-y-2 text-sm">
                {d.modules.map((m) => (
                  <li key={m.code} className="flex items-center justify-between">
                    <span>
                      {m.code} · {m.title}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-ink-muted">{m.progress.best_score}</span>
                      <Stars count={m.progress.stars} size="text-sm" />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-card bg-white p-5 shadow-card">
              <p className="mb-3 font-semibold">Profil literasi</p>
              <LiteracyBars processes={d.literacy.processes} />
            </div>
          </div>
          <div className="rounded-card bg-white p-5 shadow-card lg:col-span-2">
            <p className="mb-3 font-semibold">Riwayat jawaban</p>
            {d.history.length === 0 && <p className="text-sm text-ink-muted">Belum ada jawaban.</p>}
            <ul className="divide-y divide-slate-100">
              {d.history.map((h) => (
                <li key={h.id} className="py-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <p className="text-xs font-semibold text-accent-500">
                      {h.module} · {h.question_slug} · percobaan {h.attempt_number}
                    </p>
                    <span className={`font-semibold ${h.is_correct ? 'text-ok-700' : 'text-bad-700'}`}>
                      {h.finished ? `${h.score}` : 'belum selesai'}
                    </span>
                  </div>
                  <p className="text-ink">{h.prompt}</p>
                  {h.answer && <p className="text-ink-muted">Jawaban: {answerText(h.answer)}</p>}
                  {h.misconception_code && <p className="text-xs text-amber-800">{MISCONCEPTION_NAMES[h.misconception_code]}</p>}
                  {h.steps.length > 0 && (
                    <ul className="mt-2 grid gap-1 rounded-xl bg-slate-50 p-2 text-xs">
                      {h.steps.map((s, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span>
                            {STEP_INFO[s.step].icon} {STEP_INFO[s.step].label} (percobaan {s.try_number})
                            {s.step === 'formulate' && s.input.model ? ` — model: ${String((s.input.model as { kind?: string }).kind ?? '')}` : ''}
                            {s.misconception_code ? ` · ${s.misconception_code}` : ''}
                          </span>
                          <span className={s.is_correct ? 'text-ok-700' : 'text-bad-700'}>
                            {s.score}/{s.max_score}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
