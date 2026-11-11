import { useState } from 'react';
import { Button, Modal } from '../../components/ui/Basics';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { User } from '../../lib/types';
import type { XY } from '../../lib/math/models/types';
import CartesianCanvas from '../canvas/CartesianCanvas';

const STEPS = [
  { icon: '👋', title: 'Selamat datang di Kartesia!', body: 'Di sini kamu belajar Koordinat Kartesius selangkah demi selangkah. Tidak perlu terburu-buru.' },
  { icon: '📚', title: 'Pilih modul', body: 'Mulailah dari modul M1. Modul berikutnya terbuka setelah modul sebelumnya selesai.' },
  { icon: '👆', title: 'Coba ketuk bidang', body: 'Ketuk bidang di bawah untuk menaruh titik. Seret titik atau pakai tombol panah untuk menggesernya.', canvas: true },
  { icon: '💡', title: 'Petunjuk & pembahasan', body: 'Bingung? Ketuk "Petunjuk". Setelah 3 kali mencoba, pembahasan akan muncul.' },
  { icon: '🧩', title: 'Soal cerita jadi mudah', body: 'Soal cerita dikerjakan dalam 5 langkah: Pahami, Rumuskan, Selesaikan, Tafsirkan, Periksa.' },
];

/** Tutorial awal interaktif (F-01, W-4). Dapat dibuka lagi dari menu Saya. */
export default function Tutorial({ forceOpen, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(true);
  const [i, setI] = useState(0);
  const [pts, setPts] = useState<XY[]>([]);
  const setUser = useAuth((s) => s.setUser);
  const s = STEPS[i];
  const last = i === STEPS.length - 1;

  async function finish() {
    setOpen(false);
    onClose?.();
    if (!forceOpen) {
      try {
        setUser(await api.patch<User>('/me', { onboarding_done: true }));
      } catch {
        /* tidak fatal */
      }
    }
  }

  return (
    <Modal open={open}>
      <p className="text-4xl">{s.icon}</p>
      <p className="mt-2 text-xl font-semibold">{s.title}</p>
      <p className="mt-2 text-[15px] text-ink-muted">{s.body}</p>
      {s.canvas && (
        <div className="mt-3">
          <CartesianCanvas xRange={[-4, 4]} yRange={[-4, 4]} userPoints={pts} onUserPointsChange={setPts} maxPoints={1} />
          {pts.length > 0 && <p className="mt-2 text-sm font-semibold text-ok-700">Hebat! Kamu menaruh titik pertamamu.</p>}
        </div>
      )}
      <div className="mt-4 flex items-center justify-center gap-1" aria-hidden>
        {STEPS.map((_, j) => (
          <span key={j} className={`h-2 rounded-full ${j === i ? 'w-6 bg-accent-500' : 'w-2 bg-slate-200'}`} />
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={finish}>
          Lewati
        </Button>
        <Button className="flex-1" disabled={!!s.canvas && pts.length === 0} onClick={() => (last ? finish() : setI(i + 1))}>
          {last ? 'Mulai!' : 'Lanjut'}
        </Button>
      </div>
    </Modal>
  );
}
