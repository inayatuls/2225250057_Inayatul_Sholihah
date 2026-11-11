# CLAUDE.md

Panduan ini dibaca oleh Claude Code (dan asisten AI lain) sebelum bekerja di repositori ini. Ikuti aturan di sini kecuali pengguna meminta lain secara eksplisit.

## 1. Konteks Proyek

- **Produk:** KartesiusKu — aplikasi belajar materi **Koordinat Kartesius** untuk siswa **SMP kelas VIII** (Kurikulum Merdeka, Fase D).
- **Platform:** Web (PWA) dan Android (APK via Capacitor) dari satu basis kode frontend.
- **Pengguna:** Siswa (utama), Guru (dashboard), Admin (kelola konten).
- **Landasan desain:** Hasil wawancara siswa ([docs/01-analisis-kebutuhan.md](docs/01-analisis-kebutuhan.md)) dan **Teori Beban Kognitif**. Setiap fitur harus bisa ditelusuri ke temuan wawancara W-1 s.d. W-4.
- **Tujuan kedua — literasi matematika:** Siswa dilatih memodelkan soal cerita (Pahami → Rumuskan → Selesaikan → Tafsirkan → Periksa). Aplikasi menyelesaikan model dengan **mesin model deterministik, tanpa AI**. Acuan: [docs/13-literasi-dan-pemodelan.md](docs/13-literasi-dan-pemodelan.md).
- **Sumber kebenaran kebutuhan:** [docs/02-PRD.md](docs/02-PRD.md). Bila ada konflik antara kode dan PRD, tanyakan ke pengguna sebelum mengubah.

## 2. Tumpukan Teknologi

| Area | Pilihan |
|------|---------|
| Frontend | React 18, Vite, TypeScript (strict), Tailwind CSS, React Router v6, TanStack Query, Zustand |
| Grafik | Komponen SVG kustom di `frontend/src/features/canvas/` (jangan menambah library grafik tanpa persetujuan) |
| Mobile | Capacitor (Android) |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 (style 2.0), Alembic, Pydantic v2 |
| Auth | JWT access (15 menit) + refresh (7 hari), Argon2 |
| DB | PostgreSQL (prod), SQLite (dev) |
| Tes | Vitest + RTL, Playwright, pytest + httpx |
| Lint/format | ESLint + Prettier (frontend), Ruff + mypy (backend) |

## 3. Perintah Penting

```bash
# Frontend
cd frontend
npm run dev          # server pengembangan
npm run build        # build produksi
npm run lint         # ESLint
npm run test         # Vitest
npm run typecheck    # tsc
# (Playwright & Capacitor belum dipasang — lihat roadmap)

# Backend
cd backend
uvicorn app.main:app --reload
pytest
ruff check . && ruff format --check .
python -m mypy app
python -m app.seed --demo            # isi materi + akun demo
python scripts/gen_golden.py         # buat ulang golden mesin model
alembic revision --autogenerate -m "pesan"
alembic upgrade head
```

## 4. Struktur Kode

```
frontend/src/
  app/            # router, provider, layout
  features/
    auth/         # login, register, gabung kelas
    canvas/       # bidang Kartesius SVG: Grid, Axis, Point, Line, hooks
    lessons/      # modul materi (segmen kecil)
    practice/     # latihan & soal cerita
    modeling/     # Lab Pemodelan (stepper 5 langkah), Pemodel Bebas, Kartu Model
    literacy/     # stimulus AKM, profil literasi
    progress/     # skor, progres siswa
    teacher/      # dashboard guru
    survey/       # kuesioner beban kognitif
  components/ui/  # tombol, kartu, modal, dll. (reusable)
  lib/            # api client, util matematika (pure functions)
    math/models/  # mesin model TS: solveModel, checkStep, describeModel
  content/        # teks materi statis (bila offline)
backend/app/
  api/v1/         # router: auth, me, classes, learning, modeling, teacher
  core/           # config, security, deps, errors, ratelimit
  models.py       # semua model SQLAlchemy
  schemas.py      # skema Pydantic request
  services/       # logika bisnis: grading.py, modeling_flow.py, progress.py, reports.py, messages.py
    modeling.py   # mesin model Python — sumber penilaian resmi
    literacy.py   # perhitungan profil literasi
  seed/           # data materi, soal & stimulus awal (JSON)
shared/model-fixtures/  # cases.json (hasil dihitung manual) + golden.json (langkah, dibuat oleh scripts/gen_golden.py)
```

- Mengubah teks langkah mesin model: ubah Python → `python scripts/gen_golden.py` → sesuaikan TS sampai `npm test` lulus.
- Menambah/mengubah soal: edit `backend/app/seed/questions/*.json` → `python -m app.seed --validate` → `python -m app.seed`.
- Tombol aksi utama halaman soal/materi dirender lewat `FooterPortal` (`features/practice/FooterSlot.tsx`).
- Desain UI mengikuti referensi: layar info putih, layar soal/hasil indigo (`brand-600`), tombol aksi pink selebar layar (`accent-500`), progres teal. **Tidak ada pengatur waktu** pada soal (mengurangi beban kognitif).

## 5. Konvensi Kode

- **Bahasa:** Identifier kode dalam **bahasa Inggris**; teks yang tampil ke pengguna dalam **bahasa Indonesia** dan disimpan di satu tempat (`frontend/src/content/` atau tabel DB), bukan tersebar di komponen.
- **TypeScript:** `strict: true`, tanpa `any`. Komponen fungsi + hooks. Nama file komponen `PascalCase.tsx`, hooks `useXxx.ts`.
- **Logika matematika** (penilaian titik, cek garis melalui titik, kuadran) ditulis sebagai **fungsi murni** di `frontend/src/lib/math/` dan `backend/app/services/grading.py`, dengan unit test. Penilaian **final** selalu dilakukan di backend.
- **Python:** type hints wajib, Ruff format, fungsi async untuk endpoint. Jangan menaruh logika bisnis di router.
- **API:** REST, prefiks `/api/v1`, respons error berformat `{ "detail": { "code": "...", "message": "..." } }`. Lihat [docs/09-spesifikasi-api.md](docs/09-spesifikasi-api.md).
- **DB:** Setiap perubahan skema lewat migrasi Alembic. Jangan mengedit migrasi yang sudah di-commit.
- **Commit:** Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).

## 6. Aturan Pedagogis (WAJIB) — Prinsip Beban Kognitif

Saat membuat UI, materi, atau soal, patuhi aturan berikut:

1. **Segmentasi:** Satu layar = satu konsep. Teks penjelasan maksimal ±3 kalimat pendek per langkah.
2. **Signaling:** Gunakan warna konsisten — **sumbu X biru**, **sumbu Y merah**, titik aktif **oranye**, garis jawaban **hijau**. Sorot informasi penting.
3. **Hindari split-attention:** Label koordinat ditampilkan **di dekat titik**, bukan di panel terpisah.
4. **Hindari redundansi:** Jangan menampilkan teks yang sama dengan narasi/gambar secara bersamaan.
5. **Worked example → faded example → latihan mandiri:** urutan wajib di setiap modul.
6. **Soal cerita (W-3):** Kalimat ≤ 15 kata, paragraf ≤ 3 kalimat, selalu sediakan tombol/bagian **"Diketahui"**, **"Ditanya"**, dan **"Langkah"**. Informasi angka dalam soal di-*highlight*.
7. **Petunjuk bertahap (hint):** maksimal 3 level, dari umum ke spesifik; jangan langsung memberikan jawaban.
8. **Umpan balik segera dan spesifik:** misalnya "Titikmu di (3, −2). Coba geser 4 kotak ke atas." — bukan sekadar "Salah".
9. **UI sederhana (W-4):** maksimal 3 aksi utama per layar, target sentuh ≥ 48 dp, tutorial awal wajib, ikon selalu disertai label.
10. Bahasa ramah remaja, baku tetapi santai; hindari istilah teknis tanpa penjelasan.

## 6a. Aturan Literasi & Pemodelan (WAJIB)

1. Setiap soal pemodelan mengikuti **5 langkah tetap**: ① Pahami → ② Rumuskan → ③ Selesaikan → ④ Tafsirkan → ⑤ Periksa. Urutan, ikon, dan warna stepper tidak boleh berubah antarlayar.
2. Model hanya memakai **pustaka MP-1 s.d. MP-8** (lihat docs/13 §4). Model baru ditambahkan sebagai `kind` baru beserta fixture, solver TS, solver Python, dan dokumentasi.
3. **Mesin model wajib berupa fungsi murni dan deterministik.** Perubahan pada `lib/math/models/` atau `services/modeling.py` harus menambah/memperbarui fixture di `shared/model-fixtures/` dan lulus di kedua sisi.
4. **Tidak memakai AI/LLM/NLP** untuk memodelkan atau menyelesaikan soal (keputusan desain; lihat docs/13 §12).
5. Konvensi arah: kanan/timur = +x, kiri/barat = −x, atas/utara = +y, bawah/selatan = −y.
6. Langkah penyelesaian dari mesin ditulis dalam bahasa Indonesia, satu operasi per langkah, dengan instruksi kanvas yang sesuai.
7. Tombol "Jalankan Model" tidak boleh muncul sebelum siswa mencoba (level 1–2), agar siswa tidak pasif.
8. Setiap skor langkah dicatat beserta proses literasinya (Merumuskan / Menerapkan / Menafsirkan) untuk profil literasi.
9. Jawaban akhir harus dikembalikan ke konteks (satuan nyata, arah mata angin) di langkah ④.

## 7. Keamanan & Privasi

- Pengguna adalah **anak di bawah umur**: kumpulkan data **minimal** (nama tampilan, username, kelas). Jangan meminta email/nomor HP siswa.
- Jangan pernah melakukan commit file `.env`, kunci, atau keystore Android.
- Validasi semua input di backend (Pydantic). Guru hanya boleh mengakses data siswa di kelasnya sendiri — **selalu cek kepemilikan kelas** di service layer.
- Jangan mengirim data pengguna ke layanan pihak ketiga (analytics, AI) tanpa persetujuan eksplisit.

## 8. Definition of Done

Sebuah tugas dianggap selesai jika:
- [ ] Memenuhi acceptance criteria di [docs/03-user-stories.md](docs/03-user-stories.md).
- [ ] Lint, type-check, dan seluruh tes lulus.
- [ ] Logika baru memiliki unit test; alur utama baru memiliki tes E2E.
- [ ] Tampilan dicek pada lebar 360 px (HP) dan 1280 px (desktop).
- [ ] Mematuhi aturan pedagogis bagian 6.
- [ ] Dokumen di `docs/` diperbarui bila ada perubahan kebutuhan/API/skema.

## 9. Hal yang Perlu Ditanyakan Dulu ke Pengguna

- Menambah dependensi besar baru (library grafik, UI kit, state manager lain).
- Mengubah ruang lingkup materi di luar Koordinat Kartesius.
- Mengubah skema basis data yang sudah berjalan di produksi.
- Menghapus data atau melakukan deploy.
