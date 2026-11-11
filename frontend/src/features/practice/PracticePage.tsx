import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, ErrorBox, ProgressBar, Spinner } from '../../components/ui/Basics';
import Screen from '../../components/ui/Screen';
import { api, errorMessage } from '../../lib/api';
import type { ModuleDetail, Question, Stimulus } from '../../lib/types';
import StimulusPanel from '../literacy/StimulusPanel';
import ModelingLab from '../modeling/ModelingLab';
import { FooterSlotContext } from './FooterSlot';
import QuestionView from './QuestionView';

export interface PracticeSummary {
  code: string;
  title: string;
  scores: number[];
  correct: number;
  total: number;
  /** true = hasil Latihan Soal (level), false/undefined = modul materi */
  level?: boolean;
  items?: { prompt: string; correct: boolean }[];
}

/**
 * Layar latihan (mengikuti layar ke-2 referensi UI): latar indigo, progres teal, kartu soal putih.
 * mode "module": latihan di akhir modul materi (boleh mencoba hingga 3 kali).
 * mode "level": Latihan Soal Mudah/Sedang/Sulit (satu kali jawab, pembahasan langsung).
 */
export default function PracticePage({ mode = 'module' }: { mode?: 'module' | 'level' }) {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isLevel = mode === 'level';
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [items, setItems] = useState<{ prompt: string; correct: boolean }[]>([]);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(!isLevel);
  const [startError, setStartError] = useState<string | null>(null);

  // Latihan Soal: setiap sesi dimulai bersih (petunjuk lama direset di server).
  useEffect(() => {
    if (!isLevel) return;
    api
      .post(`/practice-levels/${code}/start`)
      .then(() => setStarted(true))
      .catch((e) => setStartError(errorMessage(e)));
  }, [isLevel, code]);

  const mod = useQuery({ queryKey: ['module', code], queryFn: () => api.get<ModuleDetail>(`/modules/${code}`) });
  const qs = useQuery({
    queryKey: ['questions', code],
    queryFn: () => api.get<{ questions: Question[]; stimuli: Record<string, Stimulus> }>(`/modules/${code}/questions`),
    enabled: started,
  });

  const questions = qs.data?.questions ?? [];
  const q = questions[index];
  const total = questions.length;
  const correct = items.filter((i) => i.correct).length;

  function done(score: number, ok: boolean) {
    const nextScores = [...scores, score];
    const nextItems = [...items, { prompt: q?.prompt ?? '', correct: ok }];
    setScores(nextScores);
    setItems(nextItems);
    if (index + 1 < total) {
      setIndex(index + 1);
      window.scrollTo({ top: 0 });
    } else {
      void qc.invalidateQueries({ queryKey: ['modules'] });
      void qc.invalidateQueries({ queryKey: ['practice-levels'] });
      const summary: PracticeSummary = {
        code,
        title: mod.data?.title ?? code,
        scores: nextScores,
        correct: nextItems.filter((i) => i.correct).length,
        total,
        level: isLevel,
        items: nextItems,
      };
      navigate(isLevel ? `/latihan/${code}/hasil` : `/modul/${code}/hasil`, { replace: true, state: summary });
    }
  }

  const header = `Soal ${index + 1}/${total}`;
  const error = startError ?? (qs.error ? errorMessage(qs.error) : null);

  return (
    <FooterSlotContext.Provider value={slot}>
      <Screen
        tone="brand"
        back={isLevel ? '/latihan' : `/modul/${code}`}
        title={mod.data?.title ?? 'Latihan'}
        footer={<div ref={setSlot} />}
      >
        {(qs.isLoading || mod.isLoading || !started) && !error && <Spinner />}
        {error && <ErrorBox message={error} onRetry={() => void qs.refetch()} />}
        {q && (
          <>
            <div className="mb-3">
              <ProgressBar value={((index + 1) / total) * 100} label={header} />
            </div>
            {isLevel && (
              <div className="mb-5 flex flex-wrap gap-2 text-sm" aria-live="polite">
                <span className="rounded-full bg-white/15 px-3 py-1">📝 {items.length}/{total} dijawab</span>
                <span className="rounded-full bg-ok-500/90 px-3 py-1">✓ {correct} benar</span>
                <span className="rounded-full bg-bad-500/90 px-3 py-1">✗ {items.length - correct} salah</span>
              </div>
            )}
            {!isLevel && <div className="mb-2" />}
            {q.stimulus_id && qs.data?.stimuli[q.stimulus_id] && <StimulusPanel stimulus={qs.data.stimuli[q.stimulus_id]} />}
            <Card>
              {q.type === 'modeling' ? (
                <>
                  <p className="mb-3 text-sm text-ink-soft">{header} · Lab Pemodelan</p>
                  <ModelingLab key={q.id} question={q} onFinished={(s) => done(s, s >= 60)} />
                </>
              ) : (
                <QuestionView
                  key={q.id}
                  question={q}
                  header={header}
                  onDone={done}
                  isLast={index + 1 === total}
                  singleAttempt={isLevel}
                />
              )}
            </Card>
          </>
        )}
        {qs.data && total === 0 && <p className="text-white/80">Belum ada soal di modul ini.</p>}
      </Screen>
    </FooterSlotContext.Provider>
  );
}
