import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import BottomNav from '../../app/BottomNav';
import { Button, ErrorBox, Field, inputClass } from '../../components/ui/Basics';
import Screen from '../../components/ui/Screen';
import { MODEL_CARDS, SCALE_CARD, cardOf, summarizeResult } from '../../content/modelCards';
import { api, errorMessage } from '../../lib/api';
import { describeModel, trySolve } from '../../lib/math/models/engine';
import type { Model, SolveOutput } from '../../lib/math/models/types';
import type { SavedModel } from '../../lib/types';
import ModelBuilder, { cleanModel } from './ModelBuilder';
import SolutionPlayer from './SolutionPlayer';

/**
 * Pemodel Bebas (F-23) + Kartu Model (F-26).
 * Siswa memasukkan data soal cerita apa pun ke templat model; mesin model (TS, offline) menyelesaikannya.
 */
export default function FreeModelerPage() {
  const qc = useQueryClient();
  const [model, setModel] = useState<Model | null>(null);
  const [out, setOut] = useState<SolveOutput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const saved = useQuery({ queryKey: ['saved-models'], queryFn: () => api.get<SavedModel[]>('/saved-models') });

  function pick(m: Model) {
    setModel(JSON.parse(JSON.stringify(m)) as Model);
    setOut(null);
    setErr(null);
    setSaveMsg(null);
    window.scrollTo({ top: 0 });
  }

  function run() {
    if (!model) return;
    const r = trySolve(cleanModel(model));
    if (r.ok) {
      setOut(r.out);
      setErr(null);
    } else {
      setOut(null);
      setErr(r.error);
    }
  }

  async function save() {
    if (!model) return;
    try {
      await api.post('/saved-models', { title: title || cardOf(model.kind)?.name || 'Model', model: cleanModel(model) });
      setSaveMsg('Model tersimpan.');
      setTitle('');
      void qc.invalidateQueries({ queryKey: ['saved-models'] });
    } catch (e) {
      setSaveMsg(errorMessage(e));
    }
  }

  async function remove(id: string) {
    await api.del(`/saved-models/${id}`).catch(() => undefined);
    void qc.invalidateQueries({ queryKey: ['saved-models'] });
  }

  if (model) {
    const card = cardOf(model.kind);
    return (
      <Screen back={false} title={`${card?.icon ?? ''} ${card?.name ?? 'Model'}`} subtitle="Isi data dari soal ceritamu." nav={<BottomNav />}>
        <button type="button" onClick={() => setModel(null)} className="mb-4 text-sm font-semibold text-brand-600">
          ← Pilih model lain
        </button>
        <ModelBuilder model={model} onChange={(m) => { setModel(m); setOut(null); }} />
        <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm">
          <span className="text-ink-muted">Model: </span>
          <strong className="text-brand-700">{describeModel(cleanModel(model))}</strong>
        </p>
        <Button className="mt-4 w-full" onClick={run}>
          ▶ Jalankan Model
        </Button>
        {err && <div className="mt-3"><ErrorBox message={err} /></div>}
        {out && (
          <div className="mt-5 space-y-4">
            <SolutionPlayer steps={out.steps} />
            <div className="rounded-2xl bg-ok-50 p-4 text-sm text-ok-700">
              <p className="mb-1 font-semibold">Jawaban</p>
              <ul className="list-disc space-y-1 pl-5">
                {summarizeResult(out.result).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Field label="Simpan dengan judul">
                  <input className={inputClass} value={title} maxLength={80} placeholder="mis. Rute kurir buku paket" onChange={(e) => setTitle(e.target.value)} />
                </Field>
              </div>
              <Button variant="secondary" onClick={save}>
                Simpan
              </Button>
            </div>
            {saveMsg && <p className="text-sm text-ink-muted">{saveMsg}</p>}
          </div>
        )}
      </Screen>
    );
  }

  return (
    <Screen title="Pemodel" subtitle="Ubah soal cerita apa pun menjadi model, lalu lihat cara menyelesaikannya." nav={<BottomNav />}>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-soft">Kartu Model</h2>
      <ul className="space-y-3">
        {MODEL_CARDS.map((c) => (
          <li key={c.kind} className="rounded-card border-2 border-brand-100 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{c.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-accent-500">{c.code}</p>
                <p className="font-semibold">{c.name}</p>
                <p className="mt-1 text-sm text-ink-muted">{c.usedWhen}</p>
                <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">{c.notation}</p>
                <p className="mt-2 text-xs text-ink-soft">Contoh: {c.example}</p>
              </div>
            </div>
            <Button variant="ghost" className="mt-3 w-full text-sm" onClick={() => pick(c.starter)}>
              Pakai model ini
            </Button>
          </li>
        ))}
        <li className="rounded-card border-2 border-dashed border-brand-100 p-4">
          <p className="text-xs font-semibold text-accent-500">{SCALE_CARD.code}</p>
          <p className="font-semibold">
            {SCALE_CARD.icon} {SCALE_CARD.name}
          </p>
          <p className="mt-1 text-sm text-ink-muted">{SCALE_CARD.usedWhen}</p>
          <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800">{SCALE_CARD.notation}</p>
        </li>
      </ul>

      {saved.data && saved.data.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-ink-soft">Model tersimpan</h2>
          <ul className="space-y-2">
            {saved.data.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3">
                <button type="button" className="flex-1 text-left" onClick={() => pick(s.model)}>
                  <span className="block font-medium">{s.title}</span>
                  <span className="block text-xs text-ink-muted">{summarizeResult(s.result)[0]}</span>
                </button>
                <button type="button" aria-label={`Hapus ${s.title}`} onClick={() => void remove(s.id)} className="h-11 w-11 rounded-xl text-bad-700">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}
