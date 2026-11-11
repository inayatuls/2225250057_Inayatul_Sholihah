import type { StepName } from '../lib/types';

/** Urutan, ikon, dan warna stepper TIDAK boleh berubah antarlayar (CLAUDE.md §6a). */
export const STEP_ORDER: StepName[] = ['understand', 'formulate', 'solve', 'interpret', 'check'];

export const STEP_INFO: Record<StepName, { icon: string; label: string; instruction: string; autoInstruction?: string }> = {
  understand: {
    icon: '🔍',
    label: 'Pahami',
    instruction: 'Ketuk kata atau angka penting pada cerita. Masukkan ke Diketahui atau Ditanya.',
    autoInstruction: 'Informasi penting sudah ditandai untukmu. Baca, lalu tekan Periksa Langkah.',
  },
  formulate: { icon: '🧩', label: 'Rumuskan', instruction: 'Pilih kartu model yang cocok, lalu isi datanya dari cerita.' },
  solve: { icon: '✏️', label: 'Selesaikan', instruction: 'Hitung hasil dari modelmu.' },
  interpret: { icon: '💬', label: 'Tafsirkan', instruction: 'Kembalikan hasil ke cerita. Pilih kalimat jawaban yang tepat.' },
  check: { icon: '✅', label: 'Periksa', instruction: 'Apakah jawabanmu masuk akal? Pilih alasannya.' },
};

export const STEP_PROCESS: Record<StepName, 'formulate' | 'employ' | 'interpret'> = {
  understand: 'formulate',
  formulate: 'formulate',
  solve: 'employ',
  interpret: 'interpret',
  check: 'interpret',
};

export const LITERACY_LABEL = { formulate: 'Merumuskan', employ: 'Menerapkan', interpret: 'Menafsirkan' } as const;

export const MISCONCEPTION_NAMES: Record<string, string> = {
  'MK-1': 'Kesalahan umum: x dan y tertukar',
  'MK-2': 'Kesalahan umum: tanda negatif terabaikan',
  'MK-3': 'Kesalahan umum: menghitung dari titik asal, bukan titik acuan',
  'MK-4': 'Kesalahan umum: arah garis sejajar sumbu tertukar',
  'MK-5': 'Kesalahan umum: jarak ke sumbu memakai koordinat yang salah',
  'MK-6': 'Kesalahan umum: menghitung garis, bukan loncatan',
  'MK-7': 'Kesalahan umum: skala luas hanya dikali satu kali',
  'MK-8': 'Kesalahan umum: arah mata angin tertukar',
  'MK-9': 'Kesalahan umum: jarak tempuh disamakan dengan jarak awal–akhir',
  'MK-10': 'Kesalahan umum: pola memakai n, bukan (n − 1)',
  'MK-11': 'Kesalahan umum: jarak dihitung dengan menjumlah koordinat',
  'MK-12': 'Kesalahan umum: satuan sebenarnya belum dipakai',
};
