import { useState } from 'react';
import { Button, Modal } from '../../components/ui/Basics';
import { api } from '../../lib/api';

const FACES = ['😌', '🙂', '🙂', '😐', '😐', '😐', '😕', '😣', '😫'];

/** Skala beban kognitif Paas (1–9), cukup satu ketukan (< 10 detik). */
export default function PaasModal({ open, context, onClose }: { open: boolean; context: string; onClose: () => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!rating) return;
    setBusy(true);
    try {
      await api.post('/surveys', { instrument: 'paas', context, values: { rating } });
    } finally {
      setBusy(false);
      onClose();
    }
  }

  return (
    <Modal open={open}>
      <p className="text-lg font-semibold">Seberapa besar usaha berpikirmu tadi?</p>
      <p className="mt-1 text-sm text-ink-muted">Pilih 1 (sangat ringan) sampai 9 (sangat berat). Tidak ada jawaban benar atau salah.</p>
      <div className="mt-4 grid grid-cols-9 gap-1" role="radiogroup" aria-label="Skala usaha 1 sampai 9">
        {FACES.map((f, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i + 1}
            aria-label={`${i + 1}`}
            onClick={() => setRating(i + 1)}
            className={`flex h-14 flex-col items-center justify-center rounded-xl border-2 text-xs ${
              rating === i + 1 ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
            }`}
          >
            <span className="text-base">{f}</span>
            <span className="font-semibold">{i + 1}</span>
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
        <span>Sangat ringan</span>
        <span>Sangat berat</span>
      </div>
      <div className="mt-5 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Lewati
        </Button>
        <Button className="flex-1" disabled={!rating || busy} onClick={send}>
          Kirim
        </Button>
      </div>
    </Modal>
  );
}
