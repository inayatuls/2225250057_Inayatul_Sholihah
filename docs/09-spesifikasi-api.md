# 09 — Spesifikasi API

| Atribut | Keterangan |
|---------|------------|
| Versi | 1.0 |
| Tanggal | 10 November 2026 |
| Penyusun | Inayatul Sholihah |
| Base URL | `https://<host>/api/v1` |
| Format | JSON, UTF-8 |
| Dokumentasi otomatis | `/docs` (Swagger UI), `/openapi.json` |

## Daftar Isi
1. [Konvensi](#1-konvensi)
2. [Ringkasan Endpoint](#2-ringkasan-endpoint)
3. [Detail Endpoint Utama](#3-detail-endpoint-utama)
4. [Kode Error](#4-kode-error)

---

## 1. Konvensi

- Autentikasi: header `Authorization: Bearer <access_token>`.
- Waktu dalam ISO 8601 UTC.
- Paginasi: `?page=1&page_size=20` → respons `{ "items": [...], "total": n, "page": 1 }`.
- Error: `{ "detail": { "code": "STRING_CODE", "message": "Pesan untuk pengguna" } }`.
- Peran: 🧑‍🎓 siswa, 👩‍🏫 guru, 🛠 admin, 🌐 publik.

## 2. Ringkasan Endpoint

| Metode | Path | Akses | Keterangan |
|--------|------|-------|------------|
| POST | `/auth/register/student` | 🌐 | Daftar siswa |
| POST | `/auth/register/teacher` | 🌐 | Daftar guru |
| POST | `/auth/login` | 🌐 | Masuk (username atau email) |
| POST | `/auth/refresh` | 🌐 | Perbarui access token |
| POST | `/auth/logout` | semua | Cabut refresh token |
| GET | `/me` | semua | Profil pengguna |
| PATCH | `/me` | semua | Ubah nama, `onboarding_done` |
| POST | `/me/password` | semua | Ganti kata sandi |
| POST | `/classes` | 👩‍🏫 | Buat kelas |
| GET | `/classes` | 👩‍🏫 | Daftar kelas milik guru |
| PATCH | `/classes/{id}` | 👩‍🏫 | Ubah nama/pengaturan/arsip |
| POST | `/classes/join` | 🧑‍🎓 | Gabung via kode |
| DELETE | `/classes/{id}/members/{student_id}` | 👩‍🏫 | Keluarkan siswa |
| POST | `/classes/{id}/members/{student_id}/reset-password` | 👩‍🏫 | Reset kata sandi siswa |
| GET | `/modules` | 🧑‍🎓 | Daftar modul materi (M1–M6) + status progres siswa |
| GET | `/practice-levels` | 🧑‍🎓 | Level Latihan Soal (L1 Mudah, L2 Sedang, L3 Sulit); selalu terbuka berurutan |
| POST | `/practice-levels/{code}/start` | 🧑‍🎓 | Mulai/ulangi sesi latihan (petunjuk level itu direset) |
| GET | `/modules/{code}` | 🧑‍🎓 | Detail modul + segmen materi |
| GET | `/modules/{code}/questions` | 🧑‍🎓 | Soal modul (tanpa kunci) |
| GET | `/questions/{id}/hints/{level}` | 🧑‍🎓 | Ambil hint (dicatat) |
| POST | `/attempts` | 🧑‍🎓 | Kirim jawaban → hasil penilaian |
| POST | `/attempts/batch` | 🧑‍🎓 | Sinkron jawaban offline |
| PATCH | `/progress/{module_code}` | 🧑‍🎓 | Simpan posisi segmen terakhir |
| POST | `/surveys` | 🧑‍🎓 | Kirim respons Paas/SUS |
| GET | `/teacher/classes/{id}/overview` | 👩‍🏫 | Ringkasan kelas |
| GET | `/teacher/classes/{id}/students` | 👩‍🏫 | Tabel progres siswa |
| GET | `/teacher/classes/{id}/students/{sid}` | 👩‍🏫 | Detail & riwayat jawaban siswa |
| GET | `/teacher/classes/{id}/items` | 👩‍🏫 | Analisis per soal |
| GET | `/teacher/classes/{id}/export.csv` | 👩‍🏫 | Ekspor nilai |
| GET | `/admin/research/export` | 🛠 | Ekspor data penelitian anonim (ZIP CSV) |
| GET | `/model-cards` | semua | Daftar Kartu Model MP-1 s.d. MP-8 |
| POST | `/modeling/attempts` | 🧑‍🎓 | Mulai soal pemodelan → `attempt_id` |
| POST | `/modeling/attempts/{id}/steps/{step}` | 🧑‍🎓 | Kirim jawaban satu langkah → penilaian langkah |
| GET | `/modeling/attempts/{id}/solution` | 🧑‍🎓 | Langkah penyelesaian dari mesin model (sesuai aturan ketersediaan) |
| POST | `/modeling/solve` | semua | Selesaikan model bebas (cadangan server untuk Pemodel Bebas) |
| GET/POST/DELETE | `/saved-models` | semua | Kelola model tersimpan dari Pemodel Bebas |
| GET | `/stimuli/{slug}` | 🧑‍🎓 | Stimulus literasi + daftar butir (tanpa kunci) |
| GET | `/me/literacy-profile` | 🧑‍🎓 | Profil literasi siswa |
| GET | `/teacher/classes/{id}/literacy` | 👩‍🏫 | Profil literasi kelas, tren, N-gain literasi |
| GET | `/health` | 🌐 | Health check |

## 3. Detail Endpoint Utama

### 3.1 `POST /auth/register/student`
```json
// Request
{ "display_name": "Raka", "username": "raka08", "password": "rahasia1" }
// 201 Created
{ "access_token": "eyJ...", "refresh_token": "eyJ...", "token_type": "bearer",
  "user": { "id": "uuid", "role": "student", "display_name": "Raka", "onboarding_done": false } }
```
Error: `409 USERNAME_TAKEN`, `422 VALIDATION_ERROR`.

### 3.2 `POST /auth/login`
```json
{ "identifier": "raka08", "password": "rahasia1" }
```
Respons sama seperti register (200). Error: `401 INVALID_CREDENTIALS`, `429 TOO_MANY_ATTEMPTS` (5 percobaan/menit/IP). Jika `must_change_password = true`, respons menyertakan `"must_change_password": true`.

### 3.3 `POST /classes` (guru)
```json
// Request
{ "name": "VIII-A" }
// 201
{ "id": "uuid", "name": "VIII-A", "join_code": "K7P2QX", "sequential_unlock": true, "survey_enabled": false }
```

### 3.4 `POST /classes/join` (siswa)
```json
{ "join_code": "K7P2QX" }
// 200
{ "class": { "id": "uuid", "name": "VIII-A", "teacher_name": "Bu Sari" } }
```
Error: `404 CLASS_NOT_FOUND`, `409 ALREADY_IN_CLASS`.

### 3.5 `GET /modules`
```json
[
  { "code": "M1", "title": "Bidang Kartesius", "order_index": 1,
    "progress": { "status": "completed", "best_score": 92, "stars": 3 } },
  { "code": "M2", "title": "Koordinat Titik", "order_index": 2,
    "progress": { "status": "in_progress", "best_score": 55, "stars": 1 } },
  { "code": "M3", "title": "Posisi Titik", "order_index": 3,
    "progress": { "status": "locked", "best_score": 0, "stars": 0 } }
]
```

### 3.6 `GET /modules/{code}/questions`
Mengembalikan `content` soal **tanpa** `answer_key`, `feedback`, dan `hints` (hint diambil per level).

### 3.7 `GET /questions/{id}/hints/{level}`
```json
// 200
{ "level": 2, "text": "Geser 3 satuan ke kiri: nilai x berkurang 3.", "max_score_after": 75,
  "visual": { "arrows": [{ "from": [1, -2], "to": [-2, -2], "axis": "x" }] } }
```
Level harus diminta berurutan (`409 HINT_ORDER`).

### 3.8 `POST /attempts`
```json
// Request
{
  "client_attempt_id": "5f0c…",
  "question_id": "uuid",
  "answer": { "points": [{ "x": -3, "y": 4 }] },
  "hints_used": 1,
  "duration_ms": 41250
}
// 200
{
  "is_correct": false,
  "score": 0,
  "attempt_number": 1,
  "misconception_code": "MK-3",
  "feedback": "Kamu menghitung dari O(0, 0). Mulailah dari titik A.",
  "explanation": null,
  "module_progress": { "status": "in_progress", "best_score": 55, "stars": 1 }
}
```
Bila benar atau `attempt_number ≥ 3`, `explanation` diisi dan `correct_answer` disertakan. Untuk soal Latihan Soal (modul `kind = "practice"`), pembahasan, `correct_answer`, dan `solution_steps` (cara penyelesaian) **selalu** dikirim setelah jawaban pertama.

### 3.9 `POST /surveys`
```json
{ "instrument": "paas", "context": "M5", "values": { "rating": 4 } }
```

### 3.10 `GET /teacher/classes/{id}/items`
```json
[
  { "question_slug": "m4-line-002", "module": "M4", "attempted_by": 26,
    "percent_correct_first_try": 38, "avg_attempts": 2.1, "avg_hints": 1.4,
    "top_misconceptions": [{ "code": "MK-4", "percent": 42 }] }
]
```
Akses ditolak (`403 NOT_CLASS_OWNER`) jika kelas bukan milik guru yang login.

### 3.11 `POST /modeling/attempts/{id}/steps/{step}`
`step` ∈ `understand | formulate | solve | interpret | check`. Langkah harus dikirim berurutan (`409 STEP_ORDER`).

```json
// Request — langkah ② Rumuskan
{
  "input": {
    "kind": "route_chain",
    "start": { "x": 1, "y": -2 },
    "moves": [{ "dir": "barat", "n": 5 }, { "dir": "utara", "n": 4 }, { "dir": "selatan", "n": 1 }],
    "scale": { "per_unit": 100, "unit": "m" }
  },
  "hints_used": 0
}
// 200
{
  "step": "formulate",
  "is_correct": true,
  "score": 30,
  "literacy_process": "formulate",
  "model_text": "P = (1 − 5, −2 + 4 − 1)",
  "feedback": "Model tepat! Urutan langkahmu berbeda, tapi hasilnya sama.",
  "next_step": "solve"
}
```
Jika salah: `is_correct: false`, `misconception_code` (mis. `MK-8`), dan `feedback` spesifik. Langkah yang benar dikunci (`409 STEP_LOCKED` bila dikirim ulang).

### 3.12 `GET /modeling/attempts/{id}/solution`
```json
{
  "steps": [
    { "text": "Mulai dari gudang.", "expr": "(1, −2)", "canvas": { "highlight_point": [1, -2] } },
    { "text": "Ke utara 4 satuan: y bertambah 4.", "expr": "(1, −2 + 4) = (1, 2)", "canvas": { "arrow": [[1, -2], [1, 2]] } },
    { "text": "Ke barat 5 satuan: x berkurang 5.", "expr": "(1 − 5, 2) = (−4, 2)", "canvas": { "arrow": [[1, 2], [-4, 2]] } },
    { "text": "Ke selatan 1 satuan: y berkurang 1.", "expr": "(−4, 2 − 1) = (−4, 1)", "canvas": { "arrow": [[-4, 2], [-4, 1]] } },
    { "text": "Jarak tempuh = 4 + 5 + 1 = 10 satuan = 10 × 100 m.", "expr": "1.000 m" }
  ],
  "result": { "final_position": [-4, 1], "travel_distance": { "units": 10, "real": 1000, "unit": "m" } }
}
```
`403 SOLUTION_NOT_AVAILABLE` jika siswa belum mencoba langkah ③ (level 1–2). Pada level 3, permintaan ini dicatat sebagai hint.

### 3.13 `GET /me/literacy-profile`
```json
{
  "processes": [
    { "process": "formulate", "label": "Merumuskan", "score": 58, "category": "Dasar" },
    { "process": "employ", "label": "Menerapkan", "score": 76, "category": "Cakap" },
    { "process": "interpret", "label": "Menafsirkan", "score": 61, "category": "Cakap" }
  ],
  "trend": [{ "week": "2027-W02", "formulate": 45, "employ": 70, "interpret": 50 }],
  "suggestion": "Coba lagi soal Lab Pemodelan level 2 untuk melatih Merumuskan."
}
```

## 4. Kode Error

| HTTP | Kode | Arti |
|------|------|------|
| 400 | `BAD_REQUEST` | Permintaan tidak valid |
| 401 | `INVALID_CREDENTIALS` | Username/kata sandi salah |
| 401 | `TOKEN_EXPIRED` | Access token kedaluwarsa |
| 403 | `FORBIDDEN_ROLE` | Peran tidak diizinkan |
| 403 | `NOT_CLASS_OWNER` | Bukan pemilik kelas |
| 403 | `MODULE_LOCKED` | Modul belum terbuka |
| 404 | `NOT_FOUND`, `CLASS_NOT_FOUND` | Data tidak ditemukan |
| 409 | `USERNAME_TAKEN`, `EMAIL_TAKEN`, `ALREADY_IN_CLASS`, `HINT_ORDER`, `STEP_ORDER`, `STEP_LOCKED` | Konflik |
| 403 | `SOLUTION_NOT_AVAILABLE` | Penyelesaian mesin belum boleh ditampilkan |
| 422 | `INVALID_MODEL` | Model tidak valid (mis. di luar rentang kanvas, skala ≤ 0, bukan persegi panjang) |
| 422 | `VALIDATION_ERROR` | Validasi Pydantic gagal |
| 429 | `TOO_MANY_ATTEMPTS` | Rate limit |
| 500 | `INTERNAL_ERROR` | Kesalahan server |
