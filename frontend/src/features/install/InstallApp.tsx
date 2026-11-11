import { useEffect, useState } from 'react';
import { Button, Modal } from '../../components/ui/Basics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/** Dipanggil sekali di main.tsx: tangkap event pemasangan PWA (Android/Windows/Mac di Chrome/Edge). */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Tombol "Pasang Aplikasi" — unduh langsung tanpa Play Store / App Store.
 * Android, Windows, macOS: dialog pemasangan bawaan Chrome/Edge.
 * iPhone/iPad: petunjuk "Tambahkan ke Layar Utama" di Safari.
 */
export default function InstallApp({ compact }: { compact?: boolean }) {
  const [, force] = useState(0);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (isStandalone()) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      force((n) => n + 1);
    } else setHelp(true);
  }

  return (
    <>
      <Button variant="ghost" onClick={install} className={compact ? 'w-full text-sm' : 'w-full'}>
        📲 Pasang Aplikasi di Perangkat Ini
      </Button>
      <Modal open={help} onClose={() => setHelp(false)}>
        <p className="text-lg font-semibold">Cara memasang Kartesia</p>
        {isIOS() ? (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-muted">
            <li>Buka halaman ini dengan <strong>Safari</strong>.</li>
            <li>Ketuk tombol <strong>Bagikan</strong> (kotak dengan panah ke atas).</li>
            <li>Pilih <strong>Tambahkan ke Layar Utama</strong>, lalu ketuk <strong>Tambah</strong>.</li>
          </ol>
        ) : (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-muted">
            <li>Buka halaman ini dengan <strong>Chrome</strong> atau <strong>Edge</strong>.</li>
            <li>
              Android: ketuk menu <strong>⋮</strong> → <strong>Instal aplikasi</strong> / <strong>Tambahkan ke layar utama</strong>.
            </li>
            <li>
              Windows/Mac: klik ikon <strong>Instal</strong> (⊕) di ujung kanan bilah alamat.
            </li>
            <li>Pemasangan memerlukan alamat <strong>https://</strong> (atau localhost).</li>
          </ol>
        )}
        <Button className="mt-5 w-full" onClick={() => setHelp(false)}>
          Mengerti
        </Button>
      </Modal>
    </>
  );
}
