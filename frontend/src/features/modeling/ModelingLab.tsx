import { useEffect, useMemo, useState } from 'react';
import { Feedback, Modal, OptionButton, Spinner, ErrorBox, Button } from '../../components/ui/Basics';
import NumberField, { PointField } from '../../components/ui/NumberField';
import { cardOf } from '../../content/modelCards';
import { LITERACY_LABEL, MISCONCEPTION_NAMES, STEP_INFO, STEP_ORDER, STEP_PROCESS } from '../../content/steps';
import { api, errorMessage } from '../../lib/api';
import { describeModel } from '../../lib/math/models/engine';
import type { Model, ModelKind } from '../../lib/math/models/types';
import type { ModelingState, Question, Solution, StepName, StepResult } from '../../lib/types';
import { FooterPortal } from '../practice/FooterSlot';
import { FooterButton } from '../../components/ui/Screen';
import ModelBuilder, { cleanModel } from './ModelBuilder';
import SolutionPlayer from './SolutionPlayer';
import TokenText from './TokenText';

const WEIGHTS: Record<StepName, number> = { understand: 15, formulate: 30, solve: 25, interpret: 15, check: 15 };
const HINT_FACTORS = [1, 0.9, 0.75, 0.6];

type Values = Record<string, unknown>;

function starterFor(kind: ModelKind, prefill?: Partial<Model>): Model {
  if (prefill && prefill.kind === kind) {
    const base = cardOf(kind)?.starter ?? { kind };
    return { ...base, ...prefill, scale: prefill.scale ?? null } as Model;
  }
  const s = cardOf(kind)?.starter ?? { kind };
  return JSON.parse(JSON.stringify({ ...s, scale: null })) as Model;
}

/** Lab Pemodelan: Pahami → Rumuskan → Selesaikan → Tafsirkan → Periksa (docs/13 §3). */
export default function ModelingLab({ question, onFinished }: { question: Question; onFinished: (score: number) => void }) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [state, setState] = useState<ModelingState | null>(null);
  const [view, setView] = useState<StepName | 'summary'>('understand');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StepResult | null>(null);
  const [final, setFinal] = useState<StepResult | null>(null);

  // isian siswa
  const mode = question.known_mode ?? 'tap';
  const [known, setKnown] = useState<string[]>(mode === 'auto' ? question.prefill_tokens?.known ?? [] : []);
  const [asked, setAsked] = useState<string[]>(mode === 'auto' ? question.prefill_tokens?.asked ?? [] : []);
  const [markAs, setMarkAs] = useState<'known' | 'asked'>('known');
  const initialKind = (question.model_prefill?.kind as ModelKind | undefined) ?? null;
  const [kind, setKind] = useState<ModelKind | null>(initialKind);
  const [model, setModel] = useState<Model | null>(initialKind ? starterFor(initialKind, question.model_prefill) : null);
  const [modelText, setModelText] = useState<string>('');
  const [values, setValues] = useState<Values>({});
  const [choice, setChoice] = useState<Record<'interpret' | 'check', string | null>>({ interpret: null, check: null });

  // bantuan
  const [hints, setHints] = useState<Record<StepName, string[]>>({ understand: [], formulate: [], solve: [], interpret: [], check: [] });
  const [hintAsk, setHintAsk] = useState(false);
  const [solution, setSolution] = useState<Solution | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .post<{ attempt_id: string; state: ModelingState }>('/modeling/attempts', { question_id: question.id })
      .then((r) => {
        if (!alive) return;
        setAttemptId(r.attempt_id);
        setState(r.state);
      })
      .catch((e) => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [question.id]);

  const step = view === 'summary' ? null : view;
  const stepState = step && state ? state.steps[step] : null;
  const level = question.difficulty;

  const previewText = useMemo(() => (model ? describeModel(cleanModel(model)) : ''), [model]);

  if (error) return <ErrorBox message={error} />;
  if (!attemptId || !state) return <Spinner label="Menyiapkan lab pemodelan…" />;

  function buildInput(s: StepName): Record<string, unknown> {
    switch (s) {
      case 'understand':
        return { known, asked };
      case 'formulate':
        return { model: model ? cleanModel(model) : {} };
      case 'solve':
        return { values };
      default:
        return { option: choice[s] };
    }
  }

  async function submit() {
    if (!step) return;
    setBusy(true);
    try {
      const r = await api.post<StepResult>(`/modeling/attempts/${attemptId}/steps/${step}`, { input: buildInput(step) });
      setResult(r);
      setState(r.state);
      setNotice(null);
      if (r.model_text) setModelText(r.model_text);
      applyReveal(step, r.revealed);
      if (r.finished) setFinal(r);
    } catch (e) {
      setResult(null);
      setNotice(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function applyReveal(s: StepName, rev: Record<string, unknown> | null) {
    if (!rev) return;
    if (s === 'understand' && Array.isArray(rev.known) && Array.isArray(rev.asked)) {
      setKnown(rev.known as string[]);
      setAsked(rev.asked as string[]);
    }
    if (s === 'formulate' && rev.model) {
      const m = rev.model as Model;
      setKind(m.kind);
      setModel(m);
      if (typeof rev.model_text === 'string') setModelText(rev.model_text);
    }
    if (s === 'solve' && rev.values) setValues(rev.values as Values);
  }

  function goNext() {
    if (!result) return;
    setResult(null);
    setSolution(null);
    setView(result.finished ? 'summary' : (result.next_step ?? 'summary'));
  }

  async function openHint() {
    if (!step) return;
    setHintAsk(false);
    try {
      const level = hints[step].length + 1;
      const r = await api.get<{ text: string }>(`/modeling/attempts/${attemptId}/hints/${step}/${level}`);
      setHints((h) => ({ ...h, [step]: [...h[step], r.text] }));
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }

  async function loadSolution() {
    try {
      setSolution(await api.get<Solution>(`/modeling/attempts/${attemptId}/solution`));
      if (level >= 3 && step === 'solve' && !stepDone) {
        setState((s) => (s ? { ...s, steps: { ...s.steps, solve: { ...s.steps.solve, hints: 3 } } } : s));
      }
    } catch (e) {
      setNotice(errorMessage(e));
    }
  }

  function tapToken(t: string) {
    const [mine, setMine, other, setOther] =
      markAs === 'known' ? [known, setKnown, asked, setAsked] : [asked, setAsked, known, setKnown];
    if (mine.includes(t)) setMine(mine.filter((x) => x !== t));
    else {
      setMine([...mine, t]);
      if (other.includes(t)) setOther(other.filter((x) => x !== t));
    }
  }

  const stepDone = !!stepState?.done;
  const hintCount = step ? question.step_hint_counts?.[step] ?? 0 : 0;
  const canHint = !!step && !stepDone && hints[step].length < hintCount;
  const solveTried = state.steps.solve.tries > 0 || state.steps.solve.done;
  const solutionAvailable = level >= 3 || solveTried || !!final;

  return (
    <div className="space-y-4">
      <Stepper state={state} view={view} />

      {view !== 'understand' && view !== 'summary' && (
        <details className="rounded-2xl bg-slate-50 p-3 text-sm text-ink-muted">
          <summary className="cursor-pointer font-medium text-ink">📖 Cerita</summary>
          <p className="mt-2">{question.prompt}</p>
          {known.length > 0 && <p className="mt-2"><strong className="text-ink">Diketahui:</strong> {known.join(' · ')}</p>}
          {asked.length > 0 && <p><strong className="text-ink">Ditanya:</strong> {asked.join(' · ')}</p>}
        </details>
      )}

      {step && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">
              {STEP_INFO[step].icon} {STEP_INFO[step].label}
            </p>
            <p className="text-sm text-ink-muted">
              {step === 'understand' && mode === 'auto' ? STEP_INFO.understand.autoInstruction : STEP_INFO[step].instruction}
            </p>
          </div>
          {canHint && (
            <button type="button" onClick={() => setHintAsk(true)} className="shrink-0 text-sm font-semibold text-accent-500">
              💡 Petunjuk
            </button>
          )}
        </div>
      )}

      {step && hints[step].length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          {hints[step].map((h, i) => (
            <li key={i}>💡 {h}</li>
          ))}
        </ul>
      )}

      {/* ① Pahami */}
      {view === 'understand' && (
        <div className="space-y-3">
          {mode !== 'auto' && (
            <div className="flex gap-2" role="radiogroup" aria-label="Tandai sebagai">
              {(['known', 'asked'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={markAs === k}
                  onClick={() => setMarkAs(k)}
                  className={`min-h-[44px] flex-1 rounded-xl border-2 text-sm font-semibold ${
                    markAs === k
                      ? k === 'known'
                        ? 'border-amber-400 bg-hl text-ink'
                        : 'border-accent-500 bg-accent-400/20 text-ink'
                      : 'border-slate-200 text-ink-muted'
                  }`}
                >
                  Tandai: {k === 'known' ? 'Diketahui' : 'Ditanya'}
                </button>
              ))}
            </div>
          )}
          <TokenText
            text={question.prompt}
            tappables={question.tappables ?? []}
            known={known}
            asked={asked}
            mode={mode}
            onTap={tapToken}
            disabled={stepDone || mode === 'auto'}
          />
          <div className="grid gap-2 text-sm">
            <ChipList title="Diketahui" items={known} tone="known" />
            <ChipList title="Ditanya" items={asked} tone="asked" />
          </div>
        </div>
      )}

      {/* ② Rumuskan */}
      {view === 'formulate' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(question.model_choices ?? []).map((k) => {
              const c = cardOf(k);
              if (!c) return null;
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  disabled={stepDone}
                  onClick={() => {
                    setKind(k);
                    setModel(starterFor(k, question.model_prefill));
                  }}
                  className={`rounded-2xl border-2 p-3 text-left ${active ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}
                >
                  <span className="text-xl">{c.icon}</span>
                  <span className="block text-sm font-semibold leading-tight">{c.name}</span>
                  <span className="mt-1 block text-xs text-ink-muted">{c.usedWhen}</span>
                </button>
              );
            })}
          </div>
          {model && <ModelBuilder model={model} onChange={setModel} disabled={stepDone} />}
          {model && (
            <p className="rounded-2xl bg-slate-50 p-3 text-sm">
              <span className="text-ink-muted">Modelmu: </span>
              <strong className="text-brand-700">{previewText}</strong>
            </p>
          )}
        </div>
      )}

      {/* ③ Selesaikan */}
      {view === 'solve' && (
        <div className="space-y-4">
          {modelText && (
            <p className="rounded-2xl bg-slate-50 p-3 text-sm">
              <span className="text-ink-muted">Model: </span>
              <strong className="text-brand-700">{modelText}</strong>
            </p>
          )}
          {(question.answer_fields ?? []).map((f) => (
            <div key={f.key} className="space-y-1">
              <p className="text-sm font-medium">{f.label}</p>
              {f.type === 'point' && (
                <PointField
                  label={f.label}
                  disabled={stepDone}
                  value={(values[f.key] as [number | null, number | null]) ?? [null, null]}
                  onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                />
              )}
              {f.type === 'number' && (
                <NumberField
                  label={f.label}
                  unit={f.unit}
                  width="w-32"
                  disabled={stepDone}
                  value={(values[f.key] as number | null) ?? null}
                  onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                />
              )}
              {f.type === 'yesno' && (
                <div className="flex gap-2">
                  {[
                    [true, 'Ya'],
                    [false, 'Tidak'],
                  ].map(([v, l]) => (
                    <button
                      key={String(v)}
                      type="button"
                      disabled={stepDone}
                      onClick={() => setValues((s) => ({ ...s, [f.key]: v }))}
                      className={`min-h-[44px] flex-1 rounded-xl border-2 font-semibold ${
                        values[f.key] === v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-ink-muted'
                      }`}
                    >
                      {l as string}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {solutionAvailable && !solution && (
            <Button variant="ghost" onClick={loadSolution} className="w-full">
              ▶ Jalankan Model{level >= 3 && !stepDone ? ' (dihitung sebagai petunjuk)' : ''}
            </Button>
          )}
          {!solutionAvailable && (
            <p className="text-xs text-ink-muted">Coba hitung sendiri dulu. Setelah itu, kamu bisa menjalankan model untuk memeriksa.</p>
          )}
          {solution && <SolutionPlayer steps={solution.steps} />}
        </div>
      )}

      {/* ④ Tafsirkan & ⑤ Periksa */}
      {(view === 'interpret' || view === 'check') && (
        <div className="space-y-3">
          {view === 'check' && <p className="font-medium">{question.check_question}</p>}
          {(view === 'interpret' ? question.interpret_options : question.check_options)?.map((o) => {
            const sel = choice[view] === o.id;
            const st =
              result && result.step === view && sel ? (result.is_correct ? 'correct' : 'wrong') : sel ? 'selected' : 'idle';
            const revealedOk =
              result?.revealed && (result.revealed as { option?: string }).option === o.id ? 'correct' : null;
            return (
              <OptionButton
                key={o.id}
                label={o.text}
                state={revealedOk ?? st}
                disabled={stepDone}
                onClick={() => {
                  setChoice((c) => ({ ...c, [view]: o.id }));
                  setResult(null);
                }}
              />
            );
          })}
        </div>
      )}

      {/* Umpan balik langkah */}
      {result && step && result.step === step && (
        <Feedback ok={result.is_correct}>
          <p>{result.feedback}</p>
          {result.misconception_code && (
            <p className="mt-1 text-xs opacity-80">{MISCONCEPTION_NAMES[result.misconception_code] ?? result.misconception_code}</p>
          )}
          {result.done && (
            <p className="mt-1 text-sm font-semibold">
              {result.revealed ? 'Jawaban yang benar sudah ditampilkan. ' : ''}Skor langkah: {result.score}/{result.max_score}
            </p>
          )}
          {!result.done && <p className="mt-1 text-xs">Percobaan {result.tries} dari 3.</p>}
        </Feedback>
      )}

      {notice && <ErrorBox message={notice} />}

      {/* Ringkasan */}
      {view === 'summary' && final && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-brand-50 p-4 text-center">
            <p className="text-sm text-brand-700">Skor soal ini</p>
            <p className="text-4xl font-bold text-brand-700">{final.total_score}</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {STEP_ORDER.map((s) => (
                <tr key={s} className="border-b border-slate-100">
                  <td className="py-2">
                    {STEP_INFO[s].icon} {STEP_INFO[s].label}
                  </td>
                  <td className="py-2 text-xs text-ink-muted">{LITERACY_LABEL[STEP_PROCESS[s]]}</td>
                  <td className="py-2 text-right font-semibold">
                    {final.state.steps[s].score}/{WEIGHTS[s]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {final.explanation && <p className="rounded-2xl bg-slate-50 p-3 text-sm">💬 {final.explanation}</p>}
          {!solution ? (
            <Button variant="ghost" onClick={loadSolution} className="w-full">
              ▶ Lihat penyelesaian lengkap
            </Button>
          ) : (
            <SolutionPlayer steps={solution.steps} />
          )}
        </div>
      )}

      <Modal open={hintAsk} onClose={() => setHintAsk(false)}>
        <p className="text-lg font-semibold">Buka petunjuk?</p>
        <p className="mt-2 text-sm text-ink-muted">
          Skor maksimal langkah ini menjadi{' '}
          {step ? Math.round(WEIGHTS[step] * HINT_FACTORS[Math.min(3, hints[step].length + 1)]) : 0} dari {step ? WEIGHTS[step] : 0}.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setHintAsk(false)}>
            Batal
          </Button>
          <Button className="flex-1" onClick={openHint}>
            Buka
          </Button>
        </div>
      </Modal>

      <FooterPortal>
        {view === 'summary' ? (
          <FooterButton onClick={() => onFinished(final?.total_score ?? 0)}>Soal Berikutnya</FooterButton>
        ) : result?.done ? (
          <FooterButton onClick={goNext}>
            {result.finished ? 'Lihat Ringkasan' : `Lanjut: ${STEP_INFO[result.next_step ?? 'check'].label}`}
          </FooterButton>
        ) : (
          <FooterButton onClick={submit} disabled={busy || !canSubmit(view, { known, asked, model, values, choice })}>
            {busy ? 'Memeriksa…' : 'Periksa Langkah'}
          </FooterButton>
        )}
      </FooterPortal>
    </div>
  );
}

function canSubmit(
  view: StepName | 'summary',
  d: { known: string[]; asked: string[]; model: Model | null; values: Values; choice: Record<'interpret' | 'check', string | null> },
): boolean {
  if (view === 'understand') return d.known.length + d.asked.length > 0;
  if (view === 'formulate') return !!d.model;
  if (view === 'solve') return Object.keys(d.values).length > 0;
  if (view === 'interpret' || view === 'check') return !!d.choice[view];
  return false;
}

function ChipList({ title, items, tone }: { title: string; items: string[]; tone: 'known' | 'asked' }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="w-20 shrink-0 font-semibold">{title}:</span>
      {items.length === 0 && <span className="text-ink-soft">belum ada</span>}
      {items.map((t) => (
        <span key={t} className={`rounded-full px-3 py-1 ${tone === 'known' ? 'bg-hl' : 'bg-accent-400/25'}`}>
          {t}
        </span>
      ))}
    </div>
  );
}

function Stepper({ state, view }: { state: ModelingState; view: StepName | 'summary' }) {
  return (
    <ol className="flex items-start justify-between" aria-label="Langkah pemodelan">
      {STEP_ORDER.map((s, i) => {
        const st = state.steps[s];
        const active = view === s;
        return (
          <li key={s} className="flex flex-1 flex-col items-center gap-1 text-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : st.done || active ? 'bg-brand-500' : 'bg-slate-200'}`} />
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                  st.done ? 'bg-ok-500 text-white' : active ? 'bg-white ring-4 ring-accent-500' : 'bg-slate-100 grayscale'
                }`}
                aria-current={active ? 'step' : undefined}
              >
                {st.done ? '✓' : STEP_INFO[s].icon}
              </span>
              <span className={`h-0.5 flex-1 ${i === 4 ? 'opacity-0' : st.done ? 'bg-brand-500' : 'bg-slate-200'}`} />
            </div>
            <span className={`text-[11px] ${active ? 'font-semibold text-ink' : 'text-ink-muted'}`}>{STEP_INFO[s].label}</span>
          </li>
        );
      })}
    </ol>
  );
}
