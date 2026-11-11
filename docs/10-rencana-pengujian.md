# 10 — Rencana Pengujian

| Atribut | Keterangan |
|---------|------------|
| Versi | 1.0 |
| Tanggal | 10 November 2026 |
| Penyusun | Inayatul Sholihah |

## Daftar Isi
1. [Strategi Pengujian](#1-strategi-pengujian)
2. [Pengujian Teknis](#2-pengujian-teknis)
3. [Kasus Uji Fungsional](#3-kasus-uji-fungsional)
4. [Uji Perangkat & Kompatibilitas](#4-uji-perangkat--kompatibilitas)
5. [Validasi Ahli](#5-validasi-ahli)
6. [Uji Coba Pengguna](#6-uji-coba-pengguna)
7. [Instrumen Pengukuran](#7-instrumen-pengukuran)
8. [Kriteria Lulus](#8-kriteria-lulus)

---

## 1. Strategi Pengujian

| Tingkat | Tujuan | Alat | Pelaksana |
|---------|--------|------|-----------|
| Unit | Logika matematika, penilaian, util | Vitest, pytest | Pengembang (otomatis CI) |
| Integrasi API | Endpoint + DB + otorisasi | pytest + httpx + DB uji | Pengembang |
| Komponen | Kanvas, form, panel soal | Vitest + React Testing Library | Pengembang |
| End-to-End | Alur utama siswa & guru | Playwright (Chromium + emulasi mobile) | Pengembang |
| Perangkat | Android nyata | Manual, checklist | Pengembang |
| Validasi ahli | Kelayakan materi & media | Angket skala Likert | Ahli materi, ahli media |
| Uji coba pengguna | Kepraktisan, beban kognitif, efektivitas | SUS, Paas, pretest-posttest | Siswa & guru |

## 2. Pengujian Teknis

### 2.1 Unit Test Wajib
| Modul | Fungsi | Contoh Kasus |
|-------|--------|--------------|
| `lib/math/quadrant` | `getQuadrant(x, y)` | (3,2)→I, (−3,2)→II, (0,5)→sumbu Y, (0,0)→titik asal |
| `lib/math/onLine` | `isOnLine(p, a, b)` | Titik pada garis vertikal, horizontal, miring |
| `lib/math/relative` | `applyMove(a, dx, dy)` | Arah negatif |
| `canvas/useCanvasTransform` | konversi dunia↔layar | Flip sumbu Y, snap |
| `services/grading.py` | `grade()` per tipe soal | Benar, salah, MK-1…MK-6, skor dengan hint |
| `services/class_code.py` | kode unik | Tidak mengandung O/0/I/1 |
| `services/reports.py` | analisis soal | Persentase & rata-rata benar |
| `lib/math/models` + `services/modeling.py` | `solveModel` / `solve` untuk MP-1 s.d. MP-8 & `composite` | Semua fixture di `shared/model-fixtures/` (minimal 5 per jenis model, termasuk kasus negatif & tepi) lulus **identik** di TS dan Python |
| mesin model | `checkStep` kesetaraan model | Urutan perpindahan berbeda tetap benar; arah kata vs tanda; deteksi MK-7 s.d. MK-12 |
| mesin model | validasi | Model tidak valid ditolak dengan pesan ramah |
| `services/literacy.py` | profil literasi | Agregasi per proses, kategori, tren mingguan |
| validator seed | `solve_key` | Soal dengan `solve_key` ≠ hasil mesin ditolak |

Target cakupan mesin model: ≥ 95%.

Target cakupan: `grading.py` dan `lib/math` ≥ 90%; keseluruhan ≥ 70%.

### 2.2 Uji Keamanan
- Siswa tidak dapat mengakses endpoint guru (403).
- Guru A tidak dapat melihat kelas guru B (403 `NOT_CLASS_OWNER`).
- `answer_key` tidak muncul pada respons `GET /modules/{code}/questions`.
- Rate limit login aktif.
- Token kedaluwarsa ditolak; refresh token yang sudah dirotasi tidak bisa dipakai ulang.

## 3. Kasus Uji Fungsional

| ID | Temuan | Skenario | Hasil yang Diharapkan |
|----|--------|----------|-----------------------|
| TC-ONB-01 | W-4 | Login pertama siswa | Tutorial tampil otomatis |
| TC-ONB-02 | W-4 | Tekan "Lewati" lalu buka Bantuan | Tutorial dapat dibuka ulang |
| TC-AUTH-01 | — | Daftar username duplikat | Pesan `USERNAME_TAKEN` |
| TC-CLASS-01 | — | Gabung dengan kode valid/tidak valid | Berhasil / pesan error ramah |
| TC-POINT-01 | W-2 | Ketuk grid pada (4, 2) | Titik muncul, label "(4, 2)" di dekat titik |
| TC-POINT-02 | W-2 | Seret titik ke posisi non-bulat | Snap ke bilangan bulat terdekat |
| TC-POINT-03 | W-2 | Pakai tombol panah | Titik bergeser 1 satuan |
| TC-REL-01 | W-2 | Soal titik relatif, jawab dari O | Umpan balik MK-3 |
| TC-REL-02 | W-2 | Buka hint 1→3 | Panah langkah tampil bertahap, skor maks 90/75/60 |
| TC-LINE-01 | W-1 | Taruh 2 titik di mode garis | Garis tergambar hingga tepi kanvas |
| TC-LINE-02 | W-1 | Seret salah satu titik | Garis ikut berubah real-time |
| TC-LINE-03 | W-1 | Jawab garis dengan dua titik lain yang tetap pada garis kunci | Dinilai benar |
| TC-STORY-01 | W-3 | Buka soal cerita level 1 | Angka disorot; Diketahui/Ditanya terisi |
| TC-STORY-02 | W-3 | Soal cerita level 2 | Siswa harus mengetuk informasi penting |
| TC-STORY-03 | W-3 | Buka panel Langkah | Langkah tampil satu per satu |
| TC-FB-01 | — | x dan y tertukar | Umpan balik MK-1 |
| TC-PROG-01 | — | Selesaikan modul skor 88 | Status selesai, 3★, modul berikut terbuka |
| TC-TCH-01 | — | Guru membuka analisis soal | Persentase & miskonsepsi sesuai data uji |
| TC-TCH-02 | — | Ekspor CSV | File terunduh, kolom lengkap |
| TC-OFF-01 | — | Jawab saat offline, lalu online | Jawaban tersinkron sekali (idempoten) |
| TC-SURV-01 | — | Kuesioner Paas aktif | Muncul setelah modul, tersimpan |
| TC-MOD-01 | KB-11 | Buka soal Lab Pemodelan | Stepper 5 langkah tampil, hanya ① aktif |
| TC-MOD-02 | KB-11 | Langkah ① dengan informasi terlewat | Pesan jumlah informasi yang belum ditandai |
| TC-MOD-03 | KB-11 | Langkah ② dengan urutan perpindahan berbeda | Dinilai benar, skor 30 |
| TC-MOD-04 | KB-11 | Langkah ② dengan barat = +x | Umpan balik MK-8 |
| TC-MOD-05 | KB-11 | Minta solusi sebelum mencoba langkah ③ (level 2) | Tombol tidak tampil / `403 SOLUTION_NOT_AVAILABLE` |
| TC-MOD-06 | KB-11 | Jalankan Model | Langkah penyelesaian tampil satu per satu, sinkron dengan animasi kanvas |
| TC-MOD-07 | KB-11 | Langkah ④ pilih jawaban tanpa skala | Umpan balik MK-12 |
| TC-MOD-08 | KB-11 | Pemodel Bebas: bangun datar A(−3,−1), B(5,−1), C(5,3), skala 2 m | D(−3, 3), L = 128 m², langkah tampil, berjalan offline |
| TC-MOD-09 | KB-11 | Pemodel Bebas: data tidak valid | Pesan validasi ramah, tidak crash |
| TC-LIT-01 | KB-10 | Buka stimulus | Data stimulus dapat disematkan saat menjawab butir |
| TC-LIT-02 | KB-10 | Butir penalaran: jawaban benar, alasan salah | Skor 50 |
| TC-LIT-03 | KB-10 | Profil literasi siswa setelah data uji | Skor per proses & kategori sesuai perhitungan manual |
| TC-LIT-04 | KB-10 | Guru membuka tab Literasi | Rata-rata kelas, tren, daftar siswa per kategori, N-gain literasi |

## 4. Uji Perangkat & Kompatibilitas

| Perangkat/Browser | Spesifikasi | Fokus |
|-------------------|-------------|-------|
| Android kelas bawah | Android 8–10, RAM 2–3 GB, 720p | Kinerja kanvas, ukuran APK |
| Android kelas menengah | Android 12–14, RAM 4–6 GB | Fungsi umum |
| Chrome desktop | Versi terbaru | Dashboard guru |
| Firefox, Safari (iPad/macOS) | Versi terbaru | Kompatibilitas web |

Checklist: rotasi layar, keyboard virtual tidak menutupi input, tombol kembali Android, mode gelap sistem tidak merusak kontras, kinerja seret ≥ 50 fps.

## 5. Validasi Ahli

| Validator | Jumlah | Aspek |
|-----------|--------|-------|
| Ahli materi (dosen/guru matematika) | 2 | Kesesuaian CP/TP, kebenaran konsep, kualitas soal, bahasa |
| Ahli media (dosen TI/media pembelajaran) | 2 | Tampilan, navigasi, interaktivitas, kinerja, kemudahan |
| Ahli desain pembelajaran (opsional) | 1 | Penerapan prinsip beban kognitif |
| Ahli materi (aspek literasi) | dapat sama dengan ahli materi | Kesesuaian stimulus & butir dengan kerangka literasi (proses, level, konteks), ketepatan model MP-1 s.d. MP-8, validitas instrumen tes literasi |

Skala Likert 1–5. Persentase kelayakan = (skor total ÷ skor maksimal) × 100%.

| Persentase | Kategori |
|-----------|----------|
| 81–100% | Sangat layak |
| 61–80% | Layak |
| 41–60% | Cukup layak |
| 21–40% | Kurang layak |
| ≤ 20% | Tidak layak |

## 6. Uji Coba Pengguna

| Tahap | Peserta | Tujuan |
|-------|---------|--------|
| Uji perorangan (one-to-one) | 3 siswa (kemampuan tinggi/sedang/rendah) | Menemukan masalah keterbacaan & navigasi; *think-aloud* |
| Uji kelompok kecil | 6–10 siswa | Kepraktisan, SUS, Paas |
| Uji lapangan | 1 kelas (±30 siswa) + guru | Efektivitas (pretest–posttest), beban kognitif, kepraktisan guru |

> Sesuaikan tahap dengan model R&D yang dipilih (mis. ADDIE atau 4D) dan dengan arahan dosen pembimbing.

## 7. Instrumen Pengukuran

### 7.1 Skala Beban Kognitif Paas (1993)
Satu butir: *"Seberapa besar usaha mental yang kamu keluarkan untuk mengerjakan bagian ini?"* — skala 1 (sangat sangat rendah) s.d. 9 (sangat sangat tinggi). Diberikan setelah setiap modul dan setelah soal cerita.

Alternatif/pelengkap: kuesioner beban kognitif tiga dimensi (intrinsik, ekstrinsik, germane) dari Leppink dkk. (2013) yang diadaptasi ke bahasa Indonesia.

### 7.2 System Usability Scale (SUS)
10 butir skala 1–5 (versi bahasa Indonesia). Skor = [(Σ(butir ganjil − 1) + Σ(5 − butir genap)) × 2,5]. Interpretasi: ≥ 68 di atas rata-rata; ≥ 80,3 sangat baik.

### 7.3 Pretest–Posttest
10 soal paralel. Analisis **N-gain** = (posttest − pretest) ÷ (100 − pretest). Kategori: g ≥ 0,7 tinggi; 0,3 ≤ g < 0,7 sedang; g < 0,3 rendah.

### 7.3a Tes Literasi Matematika
- 2 stimulus × 4–5 butir untuk tes awal dan tes akhir (paralel), mencakup 3 proses (Merumuskan, Menerapkan, Menafsirkan) dan 3 level (Pemahaman, Penerapan, Penalaran). Kisi-kisi disusun dalam tabel proses × level.
- Butir penalaran memakai format jawaban + alasan (pilihan), dan dapat ditambah 1 butir uraian yang dinilai guru dengan rubrik 0–3.
- Validitas isi oleh ahli materi (mis. indeks Aiken's V); reliabilitas Alpha Cronbach pada uji coba instrumen.
- Analisis: N-gain literasi total dan per proses; perbandingan profil literasi awal–akhir.
- Data pendukung dari aplikasi: perubahan skor langkah ② Rumuskan antara sesi awal dan akhir (G-8).

### 7.4 Angket Kepraktisan Guru
Skala Likert untuk aspek: kemudahan membuat kelas, kejelasan dashboard, kebermanfaatan laporan.

## 8. Kriteria Lulus

| Aspek | Kriteria |
|-------|----------|
| Unit & integrasi | 100% lulus di CI |
| E2E alur utama | Lulus di Chromium desktop & emulasi Android |
| Bug | Tidak ada bug kritis/tinggi terbuka sebelum uji lapangan |
| Validasi ahli | ≥ 61% (Layak) di semua aspek; revisi sesuai saran |
| SUS | ≥ 70 |
| Paas soal cerita | Rata-rata ≤ 5 |
| N-gain | ≥ 0,3 |
| Kepraktisan guru | ≥ 75% |
| Mesin model | 100% fixture lulus identik di TS & Python |
| N-gain literasi | ≥ 0,3 |
| Skor langkah Rumuskan | Naik ≥ 20 poin persentase (sesi awal vs akhir) |
