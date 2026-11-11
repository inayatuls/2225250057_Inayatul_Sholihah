import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Stars } from '../../components/ui/Basics';
import Screen, { FooterButton } from '../../components/ui/Screen';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { ModuleSummary } from '../../lib/types';
import PaasModal from '../survey/PaasModal';
import type { PracticeSummary } from './PracticePage';

function starsFor(score: number): number {
  return score >= 85 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0;
}

/** Layar hasil (mengikuti layar ke-3 referensi UI): kartu tiket, skor besar, medali. */
export default function ResultPage() {
  const { state } = useLocation() as { state: PracticeSummary | null };
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const surveyKey = state ? `paas-${state.code}` : '';
  const [showPaas, setShowPaas] = useState(() => {
    try {
      return !!user?.class?.survey_enabled && !!state && !sessionStorage.getItem(surveyKey);
    } catch {
      return !!user?.class?.survey_enabled;
    }
  });
  const [showReview, setShowReview] = useState(false);
  const levels = useQuery({
    queryKey: ['practice-levels'],
    queryFn: () => api.get<ModuleSummary[]>('/practice-levels'),
    enabled: !!state?.level,
  });
  if (!state) return <Navigate to="/beranda" replace />;

  const avg = state.total ? Math.round(state.scores.reduce((a, b) => a + b, 0) / state.total) : 0;
  const stars = starsFor(avg);
  const good = avg >= 70;
  const home = state.level ? '/latihan' : '/beranda';

  const list = levels.data ?? [];
  const idx = list.findIndex((l) => l.code === state.code);
  const next = idx >= 0 ? list[idx + 1] : undefined;
  const nextOpen = next && next.progress.status !== 'locked';

  return (
    <Screen
      tone="brand"
      footer={<FooterButton onClick={() => navigate(home)}>{state.level ? 'Kembali ke Daftar Latihan' : 'Kembali ke Beranda'}</FooterButton>}
    >
      <h1 className="mt-10 text-center text-xl font-medium">Hasil {state.title}</h1>
      <div className="relative mx-auto mt-6 max-w-sm rounded-card bg-white px-6 pb-8 pt-8 text-center text-ink shadow-card">
        <span className="absolute -left-3 top-[44%] h-6 w-6 rounded-full bg-brand-600" aria-hidden />
        <span className="absolute -right-3 top-[44%] h-6 w-6 rounded-full bg-brand-600" aria-hidden />
        <p className="text-lg font-medium">{good ? 'Selamat! Skormu' : 'Ayo, terus berlatih! Skormu'}</p>
        <p className="mt-1 text-5xl font-bold">{avg}%</p>
        <p className="mt-2 text-sm font-semibold text-ink-muted">
          Benar {state.correct} dari {state.total} soal
        </p>
        <div className="my-6 border-t-2 border-dashed border-slate-200" />
        <p className="text-sm text-ink-muted">{stars > 0 ? 'Kamu mendapatkan lencana' : 'Kumpulkan skor 50 untuk lencana pertama'}</p>
        <Medal active={stars > 0} />
        <Stars count={stars} size="text-3xl" />
      </div>

      {state.level && (
        <div className="mx-auto mt-5 max-w-sm space-y-2">
          <Button className="w-full" onClick={() => navigate(`/latihan/${state.code}`, { replace: true })}>
            🔁 Ulangi Latihan
          </Button>
          {next && (
            <Button
              variant="ghost"
              className="w-full"
              disabled={!nextOpen}
              onClick={() => navigate(`/latihan/${next.code}`)}
            >
              {nextOpen ? `➡️ Lanjut ke ${next.title}` : `🔒 ${next.title} terkunci`}
            </Button>
          )}
          {!next && levels.data && <p className="text-center text-sm text-white/80">🎉 Kamu sudah sampai level tertinggi!</p>}
          {state.items && state.items.length > 0 && (
            <div className="rounded-card bg-white/10 p-4">
              <button type="button" onClick={() => setShowReview((v) => !v)} className="w-full text-left text-sm font-semibold" aria-expanded={showReview}>
                📋 Ringkasan jawaban {showReview ? '▴' : '▾'}
              </button>
              {showReview && (
                <ol className="mt-3 space-y-2 text-sm">
                  {state.items.map((it, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={`shrink-0 font-bold ${it.correct ? 'text-ok-500' : 'text-accent-400'}`}>{it.correct ? '✓' : '✗'}</span>
                      <span className="text-white/90">
                        {i + 1}. {it.prompt}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}

      <PaasModal
        open={showPaas}
        context={state.code}
        onClose={() => {
          try {
            sessionStorage.setItem(surveyKey, '1');
          } catch {
            /* abaikan */
          }
          setShowPaas(false);
        }}
      />
    </Screen>
  );
}

function Medal({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className={`mx-auto my-3 h-28 w-28 ${active ? '' : 'opacity-30 grayscale'}`} aria-hidden>
      <path d="M38 8h18l10 34H48z" fill="#F5678D" />
      <path d="M82 8H64L54 42h18z" fill="#4351A8" />
      <rect x="44" y="38" width="32" height="10" rx="3" fill="#F97316" />
      <circle cx="60" cy="76" r="30" fill="#F97316" />
      <circle cx="60" cy="76" r="21" fill="#FBBF24" />
      <path d="M60 62l4.5 9 10 1.5-7.2 7 1.7 10-9-4.7-9 4.7 1.7-10-7.2-7 10-1.5z" fill="#fff" opacity="0.9" />
      <circle cx="18" cy="70" r="4" fill="#22C55E" />
      <circle cx="104" cy="58" r="3" fill="#4FD1C5" />
      <path d="M100 28l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FBBF24" />
      <path d="M22 30l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#FBBF24" />
    </svg>
  );
}
