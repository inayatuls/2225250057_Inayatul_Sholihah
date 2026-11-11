import { useState } from 'react';
import { Button, Feedback, Highlighted, Modal, OptionButton } from '../../components/ui/Basics';
import { IconChevron, IconHint } from '../../components/ui/Icons';
import NumberField, { PointField } from '../../components/ui/NumberField';
import { FooterButton } from '../../components/ui/Screen';
import { MISCONCEPTION_NAMES } from '../../content/steps';
import { api, errorMessage, uuid } from '../../lib/api';
import { regionLabel } from '../../lib/math/coords';
import type { XY } from '../../lib/math/models/types';
import type { AttemptResult, Display, Quadrant, Question } from '../../lib/types';
import CartesianCanvas from '../canvas/CartesianCanvas';
import { FooterPortal } from './FooterSlot';

const HINT_SCORE = [100, 90, 75, 60];

interface Props {
  question: Question;
  header: string;
  onDone: (score: number, correct: boolean) => void;
  isLast: boolean;
  /** Latihan Soal: satu kali jawab, lalu langsung benar/salah + pembahasan. */
  singleAttempt?: boolean;
}

/** Soal biasa (bukan pemodelan): plot/baca titik, garis, kuadran, isian, pilihan ganda. */
export default function QuestionView({ question: q, header, onDone, isLast, singleAttempt = false }: Props) {
  const [points, setPoints] = useState<XY[]>([]);
  const [readXY, setReadXY] = useState<[number | null, number | null]>([null, null]);
  const [value, setValue] = useState<number | null>(null);
  const [option, setOption] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [quadrant, setQuadrant] = useState<Quadrant | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [best, setBest] = useState(0);
  const [hints, setHints] = useState<{ text: string; visual?: Display | null }[]>([]);
  const [askHint, setAskHint] = useState(false);
  const [showExplain, setShowExplain] = useState(singleAttempt);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  const finished = !!result && (singleAttempt || result.is_correct || result.attempt_number >= 3);
  const hintCount = q.hint_count ?? 0;
  const xr = q.canvas?.x_range;
  const yr = q.canvas?.y_range;

  function answer(): Record<string, unknown> | null {
    switch (q.type) {
      case 'plot_point':
      case 'relative_point':
        return points.length ? { points: points.map(([x, y]) => ({ x, y })) } : null;
      case 'draw_line':
        return points.length === 2 ? { points: points.map(([x, y]) => ({ x, y })) } : null;
      case 'read_point':
        return readXY[0] !== null && readXY[1] !== null ? { x: readXY[0], y: readXY[1] } : null;
      case 'numeric':
        return value !== null ? { value } : null;
      case 'quadrant':
        return quadrant ? { quadrant } : null;
      case 'multiple_choice':
        if (!option) return null;
        if (q.reason_options?.length) return reason ? { option, reason } : null;
        return { option };
      default:
        return null;
    }
  }

  async function check() {
    const a = answer();
    if (!a) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await api.post<AttemptResult>('/attempts', {
        question_id: q.id,
        answer: a,
        client_attempt_id: uuid(),
        duration_ms: Date.now() - startedAt,
      });
      setResult(r);
      setBest((b) => Math.max(b, r.score));
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function openHint() {
    setAskHint(false);
    try {
      const r = await api.get<{ text: string; visual: Display | null }>(`/questions/${q.id}/hints/${hints.length + 1}`);
      setHints((h) => [...h, { text: r.text, visual: r.visual }]);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }

  const edit = <T,>(fn: (v: T) => void) => (v: T) => {
    if (finished) return;
    fn(v);
    setResult(null);
  };

  const hintVisual = hints.length ? hints[hints.length - 1].visual : null;
  const display: Display = {
    points: q.canvas?.given_points,
    arrows: hintVisual?.arrows,
  };
  const correctPts = finished && result?.correct_answer && Array.isArray((result.correct_answer as { points?: unknown }).points)
    ? ((result.correct_answer as { points: { x: number; y: number }[] }).points.map((p) => [p.x, p.y]) as XY[])
    : undefined;
  const optState = (id: string, selected: string | null, key?: string) => {
    if (result && selected === id) return result.is_correct || (key === 'option' && result.partial) ? 'correct' : 'wrong';
    if (finished && result?.correct_answer && (result.correct_answer as Record<string, unknown>)[key ?? 'option'] === id)
      return 'correct';
    return selected === id ? 'selected' : 'idle';
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-ink-soft">{header}</span>
        {hintCount > 0 && hints.length < hintCount && !finished && (
          <button type="button" onClick={() => setAskHint(true)} className="flex items-center gap-1 font-medium text-accent-500">
            <IconHint /> Petunjuk
          </button>
        )}
      </div>
      <p className="text-[19px] font-medium leading-snug text-ink">
        <Highlighted text={q.prompt} highlights={q.highlights} />
      </p>

      {hints.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          {hints.map((h, i) => (
            <li key={i}>💡 {h.text}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-3">
        {['plot_point', 'relative_point', 'draw_line', 'read_point', 'quadrant', 'numeric', 'multiple_choice'].includes(q.type) &&
          (!['numeric', 'multiple_choice'].includes(q.type) || q.canvas?.given_points) && (
            <CartesianCanvas
              xRange={xr}
              yRange={yr}
              display={display}
              showDisplayCoords={q.type !== 'read_point' && !q.canvas?.hide_coords}
              userPoints={points}
              onUserPointsChange={edit(setPoints)}
              maxPoints={['plot_point', 'relative_point', 'draw_line'].includes(q.type) ? (q.canvas?.max_points ?? (q.type === 'draw_line' ? 2 : 1)) : 0}
              userLine={q.type === 'draw_line'}
              onTapQuadrant={q.type === 'quadrant' ? edit(setQuadrant) : undefined}
              selectedQuadrant={quadrant}
              answerPoints={correctPts}
            />
          )}

        {q.type === 'quadrant' && (
          <p className="text-center text-sm text-ink-muted">
            {quadrant ? `Pilihanmu: ${regionLabel(quadrant)}` : 'Ketuk salah satu kuadran pada bidang.'}
          </p>
        )}
        {q.type === 'read_point' && (
          <div className="flex items-center justify-center gap-2">
            <span className="font-semibold">{q.canvas?.given_points?.[0]?.label ?? 'Titik'} =</span>
            <PointField label="jawaban" value={readXY} onChange={edit(setReadXY)} disabled={finished} />
          </div>
        )}
        {q.type === 'numeric' && (
          <div className="flex justify-center">
            <NumberField label="jawaban" value={value} onChange={edit(setValue)} unit={q.unit} width="w-32" disabled={finished} />
          </div>
        )}
        {q.type === 'multiple_choice' &&
          q.options?.map((o) => (
            <OptionButton key={o.id} label={o.text} state={optState(o.id, option)} onClick={() => edit(setOption)(o.id)} disabled={finished} />
          ))}
        {q.type === 'multiple_choice' && q.reason_options && (
          <>
            <p className="pt-2 text-sm font-semibold text-ink">Alasannya:</p>
            {q.reason_options.map((o) => (
              <OptionButton
                key={o.id}
                label={o.text}
                state={optState(o.id, reason, 'reason')}
                onClick={() => edit(setReason)(o.id)}
                disabled={finished}
              />
            ))}
          </>
        )}
      </div>

      {result && (
        <Feedback ok={result.is_correct ? true : result.partial ? 'partial' : false}>
          <p>{result.feedback}</p>
          {result.misconception_code && <p className="mt-1 text-xs opacity-80">{MISCONCEPTION_NAMES[result.misconception_code]}</p>}
          {!finished && <p className="mt-1 text-xs">Percobaan {result.attempt_number} dari 3. Coba lagi, ya!</p>}
          {finished && <p className="mt-1 text-sm font-semibold">Skor: {best}</p>}
        </Feedback>
      )}
      {notice && <p className="mt-3 rounded-xl bg-bad-50 p-3 text-sm text-bad-700">{notice}</p>}

      {finished && result?.explanation && (
        <div className="mt-3">
          <button type="button" onClick={() => setShowExplain((v) => !v)} className="flex items-center gap-1 text-sm font-semibold text-brand-700">
            {showExplain ? 'Sembunyikan Pembahasan' : 'Lihat Pembahasan'} <IconChevron className={showExplain ? 'rotate-180' : ''} />
          </button>
          {showExplain && (
            <div className="mt-2 rounded-2xl bg-brand-50 p-4 text-sm text-brand-800">
              <p className="font-semibold">Pembahasan</p>
              <p className="mt-1">{result.explanation}</p>
              {result.solution_steps && result.solution_steps.length > 0 && (
                <>
                  <p className="mt-3 font-semibold">Cara penyelesaian</p>
                  <ol className="mt-1 space-y-1.5">
                    {result.solution_steps.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <Modal open={askHint} onClose={() => setAskHint(false)}>
        <p className="text-lg font-semibold">Buka petunjuk?</p>
        <p className="mt-2 text-sm text-ink-muted">Skor maksimal soal ini menjadi {HINT_SCORE[Math.min(3, hints.length + 1)]}.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setAskHint(false)}>
            Batal
          </Button>
          <Button className="flex-1" onClick={openHint}>
            Buka
          </Button>
        </div>
      </Modal>

      <FooterPortal>
        {finished ? (
          <FooterButton onClick={() => onDone(best, !!result?.is_correct)}>{isLast ? 'Lihat Hasil' : 'Soal Berikutnya'}</FooterButton>
        ) : (
          <FooterButton onClick={check} disabled={busy || !answer()}>
            {busy ? 'Memeriksa…' : result ? 'Periksa Lagi' : 'Periksa'}
          </FooterButton>
        )}
      </FooterPortal>
    </div>
  );
}
