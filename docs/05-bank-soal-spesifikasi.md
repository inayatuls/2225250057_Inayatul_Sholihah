# 05 — Spesifikasi Bank Soal

| Atribut | Keterangan |
|---------|------------|
| Versi | 1.0 |
| Tanggal | 10 November 2026 |
| Penyusun | Inayatul Sholihah |
| Acuan | [04-desain-pembelajaran.md](04-desain-pembelajaran.md) |

## Daftar Isi
1. [Tipe Soal](#1-tipe-soal)
2. [Tingkat Kesulitan](#2-tingkat-kesulitan)
3. [Format Data (JSON)](#3-format-data-json)
4. [Aturan Penilaian](#4-aturan-penilaian)
5. [Contoh Soal](#5-contoh-soal)
6. [Checklist Penulisan Soal](#6-checklist-penulisan-soal)

---

## 1. Tipe Soal

| Kode Tipe | Nama | Interaksi Siswa | Jawaban yang Dinilai |
|-----------|------|-----------------|----------------------|
| `plot_point` | Plot titik | Ketuk/seret titik pada kanvas | Koordinat titik |
| `read_point` | Baca titik | Isi x dan y dari titik yang tampil | Pasangan bilangan |
| `relative_point` | Titik relatif | Plot titik berdasarkan titik acuan | Koordinat titik |
| `draw_line` | Gambar garis | Plot dua titik pada kanvas | Dua titik pada garis yang benar |
| `multiple_choice` | Pilihan ganda | Pilih satu opsi | ID opsi |
| `numeric` | Isian angka | Isi bilangan (mis. jarak ke sumbu) | Bilangan |
| `quadrant` | Kuadran | Ketuk kuadran pada kanvas | I/II/III/IV/sumbu |
| `story` | Soal cerita terstruktur | Kombinasi panel + salah satu tipe di atas | Sesuai sub-tipe |
| `modeling` | Lab Pemodelan | 5 langkah: tandai informasi, susun model, selesaikan, tafsirkan, periksa | Skor per langkah (lihat 3.3) |
| `literacy_item` | Butir stimulus literasi | Salah satu tipe di atas, terikat pada satu `stimulus` | Sesuai sub-tipe + alasan (opsional) |

## 2. Tingkat Kesulitan

| Level | Ciri | Bantuan Soal Cerita |
|-------|------|---------------------|
| 1 — Mudah | Satu langkah, bilangan positif, kuadran I | Diketahui/Ditanya terisi otomatis |
| 2 — Sedang | 2 langkah, melibatkan bilangan negatif | Siswa mengetuk informasi penting |
| 3 — Sulit | ≥ 3 langkah, titik acuan bukan O, konteks lebih kompleks | Siswa menyusun sendiri; panel Langkah tersedia lewat hint |

## 3. Format Data (JSON)

Soal disimpan sebagai file JSON di `backend/app/seed/questions/*.json` dan dimuat ke tabel `questions` (kolom `content` dan `answer_key` bertipe JSONB).

```json
{
  "slug": "m3-rel-001",
  "module": "M3",
  "type": "relative_point",
  "difficulty": 2,
  "objective": "TP-4",
  "prompt": "Titik A ada di (1, −2). Tentukan titik B yang 3 satuan ke kiri dan 4 satuan ke atas dari A.",
  "highlights": ["(1, −2)", "3 satuan ke kiri", "4 satuan ke atas"],
  "canvas": {
    "x_range": [-10, 10],
    "y_range": [-10, 10],
    "given_points": [{ "label": "A", "x": 1, "y": -2, "locked": true }],
    "max_user_points": 1
  },
  "story": null,
  "hints": [
    "Mulai dari titik A, bukan dari O(0, 0).",
    "Geser 3 satuan ke kiri: nilai x berkurang 3.",
    "Lalu geser 4 satuan ke atas: nilai y bertambah 4."
  ],
  "answer_key": { "points": [{ "x": -2, "y": 2 }] },
  "feedback": {
    "correct": "Tepat! B(−2, 2). Dari A kamu ke kiri 3 dan ke atas 4.",
    "misconceptions": [
      { "code": "MK-3", "match": { "points": [{ "x": -3, "y": 4 }] }, "message": "Kamu menghitung dari O(0, 0). Mulailah dari titik A." },
      { "code": "MK-2", "match": { "points": [{ "x": 4, "y": 2 }] }, "message": "Ke kiri berarti x berkurang, bukan bertambah." }
    ],
    "generic_wrong": "Belum tepat. Coba gunakan petunjuk."
  },
  "explanation": "B = (1 − 3, −2 + 4) = (−2, 2)."
}
```

### 3.1 Skema Field

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `slug` | string | ✔ | ID unik stabil, pola `m{n}-{tipe}-{nnn}` |
| `module` | enum M1–M6, PRE, POST | ✔ | |
| `literacy` | object | – | `{ "process": "formulate|employ|interpret", "level": "knowing|applying|reasoning", "context": "personal|social|scientific" }`. Wajib untuk `modeling` & `literacy_item` |
| `type` | enum (tabel 1) | ✔ | |
| `difficulty` | 1–3 | ✔ | |
| `objective` | TP-1…TP-6 | ✔ | |
| `prompt` | string | ✔ | ≤ 3 kalimat, ≤ 15 kata/kalimat |
| `highlights` | string[] | – | Potongan teks yang disorot |
| `canvas` | object | – | Wajib untuk tipe berbasis kanvas |
| `options` | `{id, text}[]` | – | Wajib untuk `multiple_choice` |
| `story` | object | – | Wajib untuk `story` (lihat 3.2) |
| `hints` | string[≤3] | ✔ | Dari umum ke spesifik |
| `answer_key` | object | ✔ | **Tidak pernah dikirim ke klien** sebelum soal dijawab |
| `feedback` | object | ✔ | Umpan balik benar, per miskonsepsi, umum |
| `explanation` | string | ✔ | Ditampilkan setelah benar / setelah 3 percobaan |

### 3.2 Objek `story`

```json
"story": {
  "illustration": "denah-sekolah-01.svg",
  "known": ["Gerbang di (0, 0)", "Perpustakaan di (4, 3)", "Kantin 6 satuan ke kiri dari perpustakaan"],
  "asked": "Koordinat kantin",
  "known_mode": "auto",
  "steps": [
    "Tandai perpustakaan di (4, 3).",
    "Geser 6 satuan ke kiri: x = 4 − 6.",
    "Nilai y tetap 3."
  ],
  "sub_type": "relative_point"
}
```
`known_mode`: `auto` (level 1), `tap` (level 2, siswa mengetuk kata penting), `self` (level 3).

### 3.3 Soal `modeling` (Lab Pemodelan)

```json
{
  "slug": "m5-mod-002",
  "module": "M5",
  "type": "modeling",
  "difficulty": 2,
  "objective": "TP-7",
  "literacy": { "process": "formulate", "level": "applying", "context": "social" },
  "prompt": "Kurir berangkat dari gudang di (1, −2). Ia berjalan 4 satuan ke utara, 5 satuan ke barat, lalu 1 satuan ke selatan. Satu satuan = 100 m. Di mana posisi akhir kurir dan berapa jarak tempuhnya?",
  "tokens_key": {
    "known": ["(1, −2)", "4 satuan ke utara", "5 satuan ke barat", "1 satuan ke selatan", "100 m"],
    "asked": ["posisi akhir", "jarak tempuh"]
  },
  "model_choices": ["translate", "route_chain", "axis_distance"],
  "model_key": {
    "kind": "composite",
    "parts": [
      { "kind": "route_chain", "start": { "label": "Gudang", "x": 1, "y": -2 },
        "moves": [{ "dir": "utara", "n": 4 }, { "dir": "barat", "n": 5 }, { "dir": "selatan", "n": 1 }],
        "ask": ["final_position", "travel_distance"] },
      { "kind": "scale", "per_unit": 100, "unit": "m" }
    ]
  },
  "solve_key": { "final_position": [-4, 1], "travel_distance": { "units": 10, "real": 1000, "unit": "m" } },
  "interpret_options": [
    { "id": "a", "text": "Kurir berada di (−4, 1) dan sudah berjalan 1.000 m.", "correct": true },
    { "id": "b", "text": "Kurir berada di (−4, 1) dan sudah berjalan 10 m.", "misconception": "MK-12" },
    { "id": "c", "text": "Kurir berada di (6, 1) dan sudah berjalan 1.000 m.", "misconception": "MK-8" }
  ],
  "check_question": "Mengapa jarak tempuh lebih besar dari jarak berpetak terpendek gudang ke posisi akhir?",
  "check_options": [
    { "id": "a", "text": "Karena kurir sempat ke selatan setelah ke utara (berbalik arah).", "correct": true },
    { "id": "b", "text": "Karena skalanya 100 m.", "misconception": "MK-9" }
  ],
  "step_hints": {
    "understand": ["Cari titik awal, semua arah perpindahan, dan skala."],
    "formulate": ["Ada beberapa perpindahan berturut-turut. Kartu model mana yang cocok?", "Utara/selatan mengubah y, timur/barat mengubah x."],
    "solve": ["Jumlahkan semua perubahan x, lalu semua perubahan y."],
    "interpret": ["Jarak tempuh harus dalam meter. Kalikan dengan skala."]
  }
}
```

Catatan:
- `model_key` dibandingkan dengan model siswa oleh mesin model (urutan perpindahan boleh berbeda; arah boleh berupa kata atau tanda).
- `solve_key` **harus sama** dengan hasil `solveModel(model_key)`. Validator seed menolak soal jika berbeda, sehingga kunci tidak mungkin salah ketik.
- Bobot skor langkah: Pahami 15, Rumuskan 30, Selesaikan 25, Tafsirkan 15, Periksa 15.

### 3.4 Stimulus Literasi

```json
{
  "slug": "m6-stim-desa",
  "module": "M6",
  "title": "Denah Desa Sukamaju",
  "context": "social",
  "illustration": "denah-desa-sukamaju.svg",
  "data_table": [["Balai desa", "(0, 0)"], ["Masjid", "(−3, 4)"], ["Pasar", "(5, 4)"], ["Puskesmas", "(5, −2)"], ["Sekolah", "(−3, −2)"]],
  "scale": { "per_unit": 100, "unit": "m" },
  "items": ["m6-lit-001", "m6-lit-002", "m6-lit-003", "m6-lit-004", "m6-lit-005"]
}
```
Butir-butir stimulus adalah soal bertipe `literacy_item` dengan field `stimulus_slug`. Contoh lengkap ada di [13-literasi-dan-pemodelan.md §7](13-literasi-dan-pemodelan.md#7-stimulus-literasi-gaya-akm).

## 4. Aturan Penilaian

| Tipe | Aturan Benar |
|------|--------------|
| `plot_point`, `relative_point` | Koordinat tepat sama (bilangan bulat; toleransi 0 setelah snap) |
| `read_point` | x dan y tepat sama |
| `draw_line` | Dua titik berbeda yang **keduanya terletak pada garis kunci** (bukan harus titik yang sama), kecuali soal meminta titik tertentu |
| `multiple_choice` | ID opsi sama |
| `numeric` | Nilai sama (toleransi 0,01 bila desimal) |
| `quadrant` | Label sama |
| `modeling` | Per langkah: ① semua token penting `known`/`asked` tertandai (token pengecoh mengurangi skor); ② model setara `model_key`; ③ hasil = `solve_key`; ④ opsi tafsiran benar; ⑤ alasan benar |
| `literacy_item` | Sesuai sub-tipe; butir penalaran: jawaban **dan** alasan benar = 100, hanya jawaban benar = 50 |

**Cek titik pada garis** (dipakai di `draw_line`): titik (x, y) berada pada garis melalui (x1, y1) dan (x2, y2) jika `(x2 − x1)(y − y1) − (y2 − y1)(x − x1) = 0`.

**Skor:** 100 tanpa hint; maksimal 90/75/60 bila hint level 1/2/3 dibuka. Percobaan ulang tidak mengurangi skor, tetapi dicatat. Setelah 3 percobaan salah, penjelasan ditampilkan dan skor soal = 0 untuk percobaan tersebut (soal dapat diulang di sesi berikutnya).

**Deteksi miskonsepsi:** Backend mencocokkan jawaban dengan `feedback.misconceptions[].match` lalu dengan aturan otomatis (MK-1: x↔y tertukar; MK-2: tanda terbalik).

## 5. Contoh Soal

| No | Slug | Tipe | Lv | Soal | Kunci |
|----|------|------|----|------|-------|
| 1 | m1-quad-001 | quadrant | 1 | Ketuk kuadran tempat titik (−3, 5) berada. | Kuadran II |
| 2 | m1-mc-001 | multiple_choice | 1 | Titik dengan x negatif dan y negatif ada di kuadran …? | III |
| 3 | m2-plot-001 | plot_point | 1 | Taruh titik A(4, 2) pada bidang Kartesius. | (4, 2) |
| 4 | m2-plot-002 | plot_point | 2 | Taruh titik B(−5, −1). | (−5, −1) |
| 5 | m2-read-001 | read_point | 2 | Tuliskan koordinat titik C yang tampil. *(C di (0, −4))* | (0, −4) |
| 6 | m3-num-001 | numeric | 2 | Berapa jarak titik P(−6, 3) ke sumbu X? | 3 |
| 7 | m3-rel-001 | relative_point | 2 | A(1, −2). Titik B 3 satuan ke kiri, 4 satuan ke atas dari A. | (−2, 2) |
| 8 | m3-mc-002 | multiple_choice | 3 | Posisi Q(5, 1) terhadap R(2, 4) adalah …? | 3 satuan ke kanan, 3 satuan ke bawah |
| 9 | m4-line-001 | draw_line | 1 | Gambarlah garis melalui P(−2, 1) dan Q(3, 1). | Garis y = 1 |
| 10 | m4-mc-001 | multiple_choice | 2 | Garis melalui (3, −4) dan (3, 5) posisinya terhadap sumbu X adalah …? | Tegak lurus sumbu X (sejajar sumbu Y) |
| 11 | m4-line-002 | draw_line | 3 | Gambarlah garis melalui titik (−1, 2) yang sejajar sumbu Y. | Garis x = −1 |
| 12 | m5-story-001 | story / relative_point | 1 | Gerbang sekolah di (0, 0). Perpustakaan di (4, 3). Kantin 6 satuan ke kiri dari perpustakaan. Di mana kantin? | (−2, 3) |
| 13 | m5-story-002 | story / draw_line | 2 | Rumah Dina di (−3, 2). Rumah Bayu di (5, 2). Mereka berjalan lurus dari rumah Dina ke rumah Bayu. Gambarlah jalannya. Jalan itu sejajar sumbu apa? | Garis y = 2; sejajar sumbu X |
| 14 | m5-story-003 | story / numeric | 3 | Kurir mulai di (2, −1). Ia ke utara 5 satuan, lalu ke barat 4 satuan. Berapa koordinat akhirnya? *(utara = atas, barat = kiri)* | (−2, 4) |

| 15 | m5-mod-001 | modeling (MP-1) | 1 | Rumah Sinta di (−2, 1). Sekolah 5 satuan ke timur dan 3 satuan ke utara dari rumah. Di mana sekolah? | S = (−2 + 5, 1 + 3) = (3, 4) |
| 16 | m5-mod-002 | modeling (MP-2 + MP-7) | 2 | Kurir dari gudang (1, −2): 4 ke utara, 5 ke barat, 1 ke selatan; 1 satuan = 100 m. | (−4, 1); 1.000 m |
| 17 | m6-mod-001 | modeling (MP-6 + MP-7) | 2 | Kebun persegi panjang A(−3, −1), B(5, −1), C(5, 3); 1 satuan = 2 m. Titik D dan luas? | D(−3, 3); 128 m² |
| 18 | m6-mod-002 | modeling (MP-5 + MP-3) | 3 | Jalan melalui (−4, 2) dan (6, 2); rumah di (1, −3). Titik terdekat di jalan dan jaraknya? | (1, 2); 5 satuan |
| 19 | m6-mod-003 | modeling (MP-8) | 3 | Lampu pertama (−6, −1), tiap lampu berikutnya 3 ke kanan, 1 ke atas. Lampu ke-5? Lampu ke-6 masih di dalam batas x = 8? | (6, 3); tidak, (9, 4) |

> Soal pretest dan posttest dibuat paralel: struktur & tingkat kesulitan sama, angka/konteks berbeda.

## 6. Checklist Penulisan Soal

- [ ] Kalimat ≤ 15 kata, maksimal 3 kalimat.
- [ ] Angka dan kata kunci tercantum di `highlights`.
- [ ] Soal cerita memiliki ilustrasi, `known`, `asked`, dan `steps`.
- [ ] 3 hint dari umum ke spesifik, tidak membocorkan jawaban di hint 1.
- [ ] Minimal 1 miskonsepsi beserta umpan baliknya.
- [ ] Kunci jawaban diperiksa dua kali (dan oleh ahli materi).
- [ ] Konteks netral dan inklusif.
- [ ] Lolos validasi skema JSON (`python -m app.seed --validate`).
- [ ] (Soal `modeling`) `solve_key` sama dengan keluaran mesin model, opsi tafsiran memuat minimal 1 pengecoh berbasis miskonsepsi, field `literacy` terisi.
- [ ] (Stimulus) butir mencakup level Pemahaman, Penerapan, dan Penalaran.
