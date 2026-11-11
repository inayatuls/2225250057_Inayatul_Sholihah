# 12 — Deployment, Keamanan & Privasi

| Atribut | Keterangan |
|---------|------------|
| Versi | 1.0 |
| Tanggal | 10 November 2026 |
| Penyusun | Inayatul Sholihah |

## Daftar Isi
1. [Lingkungan](#1-lingkungan)
2. [Variabel Lingkungan](#2-variabel-lingkungan)
3. [Deployment](#3-deployment)
4. [Build Android](#4-build-android)
5. [CI/CD](#5-cicd)
6. [Keamanan](#6-keamanan)
7. [Privasi & Etika Data Anak](#7-privasi--etika-data-anak)
8. [Pemantauan & Cadangan](#8-pemantauan--cadangan)

---

## 1. Lingkungan

| Lingkungan | Frontend | Backend | Basis Data | Kegunaan |
|------------|----------|---------|------------|----------|
| Lokal (dev) | `localhost:5173` | `localhost:8000` | SQLite / Postgres Docker | Pengembangan |
| Staging | Preview Vercel/Netlify | Render/Railway (instance staging) | Neon/Supabase (branch staging) | Uji ahli & uji perorangan |
| Produksi | Vercel/Netlify | Render/Railway | Neon/Supabase | Uji coba lapangan |

## 2. Variabel Lingkungan

### Backend (`backend/.env.example`)
```env
APP_ENV=development
DATABASE_URL=sqlite+aiosqlite:///./dev.db
# Produksi: postgresql+asyncpg://user:pass@host:5432/kartesiusku
JWT_SECRET=ganti-dengan-string-acak-panjang
JWT_ACCESS_TTL_MIN=15
JWT_REFRESH_TTL_DAYS=7
CORS_ORIGINS=http://localhost:5173,https://localhost,capacitor://localhost
TEACHER_REQUIRES_APPROVAL=false
RATE_LIMIT_LOGIN=5/minute
```

### Frontend (`frontend/.env.example`)
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=KartesiusKu
```

File `.env` asli **tidak boleh** di-commit (masukkan ke `.gitignore`).

## 3. Deployment

### 3.1 Backend (Render/Railway)
1. Hubungkan repositori, root `backend/`.
2. Build: `pip install .` · Start: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. Isi variabel lingkungan produksi; `JWT_SECRET` dibuat dengan `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
4. Jalankan seed sekali: `python -m app.seed`.
5. Health check: `/api/v1/health`.

### 3.2 Basis Data (Neon/Supabase)
- Buat database PostgreSQL, salin connection string ke `DATABASE_URL`.
- Aktifkan SSL (`?sslmode=require`).

### 3.3 Frontend (Vercel/Netlify)
1. Root `frontend/`, build `npm run build`, output `dist`.
2. Set `VITE_API_URL` ke URL backend produksi.
3. Tambahkan rewrite SPA: semua rute → `index.html`.

## 4. Build Android

1. `cd frontend && npm run build && npx cap sync android`.
2. Buka `npx cap open android` di Android Studio.
3. Atur `versionCode`/`versionName` di `android/app/build.gradle`.
4. Ikon & splash: `@capacitor/assets` dari logo 1024×1024.
5. Buat keystore (sekali saja; **simpan cadangan di tempat aman, jangan di-commit**):
   ```bash
   keytool -genkey -v -keystore kartesiusku.jks -alias kartesiusku -keyalg RSA -keysize 2048 -validity 10000
   ```
6. *Build → Generate Signed Bundle/APK* → APK (untuk dibagikan langsung ke siswa) atau AAB (Play Store).
7. Distribusi uji coba: tautan unduh APK (Google Drive/GitHub Releases) atau Google Play *internal testing*.
8. `minSdkVersion 26` (Android 8.0); izin hanya `INTERNET`.

## 5. CI/CD

GitHub Actions (`.github/workflows/ci.yml`):

| Job | Langkah |
|-----|---------|
| `frontend` | `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build` |
| `backend` | `pip install -e .[dev]` → `ruff check` → `mypy app` → `pytest` (Postgres service container) |
| `e2e` (main saja) | Jalankan backend + frontend → `npx playwright test` |

Deploy otomatis: push ke `main` → produksi; pull request → preview/staging.

## 6. Keamanan

| Area | Kontrol |
|------|---------|
| Transport | HTTPS wajib (otomatis di Vercel/Render); HSTS |
| Kata sandi | Argon2id; minimal 6 (siswa) / 8 (guru) karakter |
| Token | Access 15 menit; refresh 7 hari, dirotasi & disimpan sebagai hash; dicabut saat logout |
| Penyimpanan token | Web: refresh token di cookie `httpOnly; Secure; SameSite=Lax`; Android: Capacitor Secure Storage |
| Otorisasi | `require_role()` per endpoint + cek kepemilikan kelas di service |
| Validasi input | Pydantic dengan batas panjang; JSON jawaban divalidasi per tipe soal |
| Rate limit | Login 5/menit/IP; endpoint umum 100/menit/pengguna |
| CORS | Hanya origin yang terdaftar |
| Kunci jawaban | Tidak dikirim ke klien sebelum waktunya |
| Header | `X-Content-Type-Options`, `Content-Security-Policy` dasar, `Referrer-Policy` |
| Dependensi | Dependabot + `npm audit` / `pip-audit` di CI |
| Rahasia | Hanya di variabel lingkungan platform; tidak di kode |

Acuan: OWASP Top 10 dan OWASP ASVS level 1.

## 7. Privasi & Etika Data Anak

Mengacu pada **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi** (data anak termasuk data pribadi yang memerlukan perlakuan khusus dan persetujuan orang tua/wali) serta etika penelitian.

1. **Minimisasi data:** hanya nama tampilan, username, kata sandi (hash), aktivitas belajar.
2. **Persetujuan:** surat izin sekolah, *informed consent* guru, dan persetujuan orang tua/wali sebelum uji coba.
3. **Tujuan terbatas:** data hanya untuk pembelajaran dan penelitian ini.
4. **Anonimisasi:** ekspor penelitian memakai `research_code`; identitas informan dalam laporan disamarkan.
5. **Tanpa pihak ketiga:** tidak ada iklan, pelacak analitik pihak ketiga, atau pengiriman data ke layanan AI.
6. **Hak pengguna:** guru/admin dapat menghapus akun siswa atas permintaan.
7. **Kebijakan privasi** singkat dan mudah dipahami tersedia di aplikasi (menu Profil → Privasi).
8. **Retensi:** akun dihapus setelah penelitian selesai; data anonim disimpan sesuai kebutuhan laporan.

## 8. Pemantauan & Cadangan

- Log terstruktur (JSON) di backend, tanpa mencatat kata sandi/token.
- Pemantauan uptime gratis (mis. UptimeRobot) pada `/api/v1/health`; saat uji coba, ping berkala untuk menghindari *cold start*.
- Backup harian otomatis dari penyedia database + ekspor manual sebelum dan sesudah setiap sesi uji coba.
- Catatan insiden di `docs/log/insiden.md` bila terjadi gangguan saat uji coba.
