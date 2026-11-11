# Kartesia — Aplikasi Belajar Koordinat Kartesius untuk SMP

> Nama kerja aplikasi: **Kartesia**
> Status: **MVP siap uji coba** · Versi: 0.1.0 · Tanggal: 10 November 2026
> Penyusun: Inayatul Sholihah (NIM 2225250057)

Aplikasi pembelajaran interaktif materi **Koordinat Kartesius** untuk siswa **SMP kelas VIII**, dapat dibuka melalui **browser (web/PWA)** dan **Android (APK)**. Aplikasi dirancang berdasarkan hasil wawancara siswa dan prinsip **Teori Beban Kognitif (Cognitive Load Theory)** agar materi mudah dipahami, tampilan sederhana, dan soal cerita tidak membebani.

---

## Latar Belakang Singkat

Wawancara dengan siswa kelas VIII (8 November 2026) menemukan empat hambatan utama:

| Kode | Temuan | Fitur Solusi |
|------|--------|--------------|
| W-1 | Bingung membuat garis yang melewati titik | Visualisasi garis interaktif pada bidang Kartesius |
| W-2 | Sulit menentukan titik bila belum ada angkanya | Fitur interaktif menentukan (plot) titik koordinat |
| W-3 | Paling bingung pada soal cerita yang panjang | Soal berbahasa sederhana dengan uraian *Diketahui* & *Ditanya* |
| W-4 | Belum pernah memakai aplikasi belajar | Tampilan sederhana + petunjuk penggunaan yang jelas |

Detail lengkap: [docs/01-analisis-kebutuhan.md](docs/01-analisis-kebutuhan.md).

### Tujuan Tambahan: Literasi Matematika & Pemodelan

Aplikasi juga dirancang untuk **menumbuhkembangkan literasi matematika** (kerangka PISA & AKM Numerasi). Siswa dibimbing **memodelkan soal cerita ke dalam model matematika** melalui 5 langkah (Pahami → Rumuskan → Selesaikan → Tafsirkan → Periksa). **Mesin model** aplikasi kemudian **menyelesaikan model tersebut langkah demi langkah**. Pemodelan bersifat terpandu, berbasis 8 templat model Kartesius, dan **tanpa AI**. Detail: [docs/13-literasi-dan-pemodelan.md](docs/13-literasi-dan-pemodelan.md).

---

## Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | React 18 + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query, Zustand |
| Grafik interaktif | Komponen SVG kustom (pointer/touch events, snap ke grid) |
| Android | Capacitor (membungkus build web menjadi APK) |
| Web | Progressive Web App (PWA) |
| Backend | Python 3.12 + FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 |
| Autentikasi | JWT (access + refresh token), hash password Argon2 |
| Basis data | PostgreSQL (produksi), SQLite (pengembangan lokal) |
| Pengujian | Vitest, React Testing Library, Playwright, pytest |

Detail: [docs/07-arsitektur-sistem.md](docs/07-arsitektur-sistem.md).

---

## Daftar Dokumen Perencanaan

| No | Dokumen | Isi |
|----|---------|-----|
| — | [CLAUDE.md](CLAUDE.md) | Panduan kerja untuk Claude Code / asisten AI |
| 01 | [Analisis Kebutuhan](docs/01-analisis-kebutuhan.md) | Hasil wawancara, interpretasi, pemetaan beban kognitif, persona |
| 02 | [PRD](docs/02-PRD.md) | Product Requirements Document |
| 03 | [User Stories](docs/03-user-stories.md) | Cerita pengguna & kriteria penerimaan |
| 04 | [Desain Pembelajaran](docs/04-desain-pembelajaran.md) | Capaian & tujuan pembelajaran, alur materi, strategi CLT |
| 05 | [Spesifikasi Bank Soal](docs/05-bank-soal-spesifikasi.md) | Format soal, tipe soal, contoh soal |
| 06 | [Pedoman UI/UX](docs/06-ui-ux-guideline.md) | Prinsip desain, design tokens, wireframe |
| 07 | [Arsitektur Sistem](docs/07-arsitektur-sistem.md) | Diagram arsitektur, struktur folder, alur data |
| 08 | [Skema Basis Data](docs/08-skema-database.md) | ERD dan definisi tabel |
| 09 | [Spesifikasi API](docs/09-spesifikasi-api.md) | Endpoint REST |
| 10 | [Rencana Pengujian](docs/10-rencana-pengujian.md) | Pengujian teknis, uji ahli, uji beban kognitif |
| 11 | [Roadmap & Sprint](docs/11-roadmap-sprint.md) | Jadwal pengembangan |
| 12 | [Deployment & Keamanan](docs/12-deployment-keamanan.md) | Deploy, build APK, keamanan, privasi data |
| 13 | [Literasi & Pemodelan](docs/13-literasi-dan-pemodelan.md) | Kerangka literasi, siklus pemodelan, pustaka model, mesin model, stimulus AKM |

---

## Struktur Folder

```
2225250057_Inayatul_Sholihah/
├── README.md · CLAUDE.md · jalankan.ps1
├── docs/                      # Dokumen perencanaan
├── shared/model-fixtures/     # kasus uji bersama mesin model (cases.json + golden.json)
├── frontend/                  # React + Vite + TypeScript (PWA)
│   ├── src/app/               # router, navigasi bawah
│   ├── src/features/          # canvas, lessons, practice, modeling, literacy, teacher, …
│   ├── src/lib/math/models/   # mesin model TypeScript
│   └── public/icons/          # ikon aplikasi
└── backend/                   # FastAPI
    ├── app/api/v1/            # router
    ├── app/services/          # modeling.py (mesin model), grading.py, modeling_flow.py, literacy.py, …
    ├── app/seed/              # materi M1–M6, stimulus, Latihan Soal L1–L3; total 72 soal (JSON)
    ├── alembic/               # migrasi database
    ├── scripts/               # gen_golden.py, make_icons.py
    └── tests/
```

---

## Cara Menjalankan

### Cara cepat (Windows)
```powershell
powershell -ExecutionPolicy Bypass -File .\jalankan.ps1
```
Skrip ini menyiapkan backend, database, data materi, akun demo, membangun frontend, lalu menjalankan server di **http://localhost:8000**.

| Akun demo | Username / email | Kata sandi |
|-----------|------------------|------------|
| Siswa | `siswa1` | `siswa123` |
| Guru | `guru@contoh.id` | `guru12345` |
| Kode kelas | `DEMO8A` | — |

### Mode pengembangan (hot reload)
```bash
# Terminal 1 — backend
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload          # API: http://localhost:8000/api/docs

# Terminal 2 — frontend
cd frontend
npm run dev                            # http://localhost:5173 (proxy /api ke :8000)
```

### Tes & pemeriksaan kode
```bash
cd backend  && pytest && ruff check . && python -m mypy app
cd frontend && npm test && npm run typecheck && npm run lint
```

> **Catatan Windows:** bila "Smart App Control" aktif, Windows memblokir DLL SQLAlchemy. `jalankan.ps1` otomatis memasang versi Python murni (`--no-binary sqlalchemy`); fungsinya sama.

---

## Memasang Aplikasi Tanpa Play Store / App Store

KartesiusKu adalah **Progressive Web App (PWA)**: satu alamat web dapat dipasang seperti aplikasi biasa di semua perangkat, langsung dari browser.

| Perangkat | Cara memasang |
|-----------|---------------|
| Android | Buka alamat aplikasi di **Chrome** → menu ⋮ → **Instal aplikasi** |
| Windows / macOS | Buka di **Chrome/Edge** → ikon **Instal** (⊕) di bilah alamat |
| iPhone / iPad | Buka di **Safari** → **Bagikan** → **Tambahkan ke Layar Utama** |

Tombol **"📲 Pasang Aplikasi"** juga tersedia di halaman masuk dan menu *Saya*.

**Syarat:** pemasangan PWA memerlukan alamat **HTTPS** (kecuali `localhost`). Untuk uji coba di sekolah, deploy ke layanan ber-HTTPS gratis (mis. Render) — lihat [docs/12-deployment-keamanan.md](docs/12-deployment-keamanan.md). Satu server FastAPI sudah menyajikan API **dan** aplikasi web sekaligus.

Opsional (Android): file APK dapat dibuat dengan Capacitor dari folder `frontend/` bila diperlukan; lihat docs/12 §4.

---

## Lisensi & Etika

Proyek ini disusun untuk keperluan akademik. Data wawancara dan data siswa diperlakukan secara rahasia; identitas informan dianonimkan dalam dokumen.
