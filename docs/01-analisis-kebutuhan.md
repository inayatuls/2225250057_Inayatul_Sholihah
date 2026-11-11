# 01 — Analisis Kebutuhan

| Atribut | Keterangan |
|---------|------------|
| Proyek | KartesiusKu — Aplikasi Belajar Koordinat Kartesius |
| Versi | 1.0 |
| Tanggal | 10 November 2026 |
| Penyusun | Inayatul Sholihah |
| Status | Draf untuk ditinjau |

## Daftar Isi
1. [Metode Pengumpulan Data](#1-metode-pengumpulan-data)
2. [Hasil Wawancara](#2-hasil-wawancara)
3. [Analisis Beban Kognitif](#3-analisis-beban-kognitif)
4. [Persona Pengguna](#4-persona-pengguna)
5. [Kebutuhan Turunan](#5-kebutuhan-turunan)
6. [Keterbatasan & Rekomendasi Pengumpulan Data Lanjutan](#6-keterbatasan--rekomendasi-pengumpulan-data-lanjutan)

---

## 1. Metode Pengumpulan Data

| Aspek | Keterangan |
|-------|------------|
| Teknik | Wawancara semi-terstruktur |
| Materi | Koordinat Kartesius |
| Jenjang | SMP |
| Informan | **Informan S1**, siswa kelas VIII (identitas dianonimkan) |
| Pewawancara | Inayatul Sholihah |
| Tanggal | 8 November 2026 |
| Durasi | 40 menit |
| Pengalaman media aplikasi | Belum pernah menggunakan aplikasi Android khusus materi Koordinat Kartesius |
| Fokus | Kesulitan belajar dan beban kognitif dalam memahami materi |

## 2. Hasil Wawancara

| Kode | Kutipan Informan | Interpretasi | Kebutuhan Fitur |
|------|------------------|--------------|-----------------|
| **W-1** | "Kadang suka bingung kalo misalnya suruh bikin garis yang melewati titik gitu." | Pemahaman hubungan antartitik dan garis masih perlu diperkuat. | Visualisasi garis pada bidang koordinat Kartesius. |
| **W-2** | "Suka kesulitan juga kalo misalnya suruh nentuin titik tapi belum ada angkanya gitu." | Siswa membutuhkan bantuan untuk menentukan posisi titik. | Fitur interaktif menentukan titik koordinat. |
| **W-3** | "Tapi yang paling bingung ma, kalo soalnya cerita panjang, jadi kayak harus dipahami dulu, baru kan bisa dikerjain." | Penyajian informasi dalam soal menjadi hambatan pemahaman. | Soal dengan bahasa sederhana dan penjelasan informasi yang diketahui serta ditanyakan. |
| **W-4** | "Belum pernah si nyoba aplikasi buat belajar ini, paling belajar di kelas biasa sama guru di papan tulis." | Belum ada pengalaman langsung yang dapat dijadikan penilaian terhadap fitur aplikasi. | Tampilan aplikasi sederhana dan petunjuk penggunaan yang jelas. |

**Prioritas menurut informan:** W-3 disebut sebagai hal yang *paling* membingungkan, sehingga fitur soal cerita terstruktur menjadi prioritas tinggi.

## 3. Analisis Beban Kognitif

Teori Beban Kognitif (Sweller, 1988; Sweller, van Merriënboer & Paas, 2019) membagi beban menjadi tiga:

- **Intrinsik** — kompleksitas bawaan materi (jumlah elemen yang harus diolah sekaligus).
- **Ekstrinsik** — beban akibat cara penyajian yang kurang tepat (dapat dan harus dikurangi).
- **Germane** — upaya mental yang produktif untuk membangun skema (didorong).

### 3.1 Pemetaan Temuan ke Jenis Beban

| Kode | Jenis Beban Dominan | Penjelasan | Strategi Desain |
|------|---------------------|------------|-----------------|
| W-1 | Intrinsik tinggi | Menggambar garis menuntut siswa mengolah 2 titik, 2 sumbu, dan arah sekaligus. | **Segmentasi** (plot titik 1 → titik 2 → hubungkan), **worked example** animatif, garis tampil otomatis setelah dua titik benar. |
| W-2 | Intrinsik + ekstrinsik | Abstraksi "titik tanpa angka" (mis. posisi relatif terhadap titik acuan) sulit tanpa alat bantu visual. | **Manipulasi langsung** (geser titik, koordinat tampil real-time), grid dengan snap, petunjuk langkah "geser x kotak ke kanan, y kotak ke atas". |
| W-3 | **Ekstrinsik tinggi** | Teks panjang memaksa siswa menyimpan banyak informasi di memori kerja sebelum mulai berhitung. | **Kalimat pendek**, **signaling** (sorot angka & kata kunci), panel **Diketahui / Ditanya / Langkah**, ilustrasi kontekstual di dekat teks (hindari *split-attention*). |
| W-4 | Ekstrinsik (navigasi) | Pengguna baru harus mempelajari antarmuka sekaligus materi. | **Tutorial interaktif singkat**, maksimal 3 aksi per layar, ikon + label, konsistensi tata letak. |

### 3.2 Implikasi Umum

1. Kurangi beban ekstrinsik semaksimal mungkin agar kapasitas memori kerja dipakai untuk memahami konsep.
2. Kelola beban intrinsik dengan urutan *sederhana → kompleks* dan *contoh lengkap → contoh dipudarkan → latihan mandiri*.
3. Dorong beban germane melalui refleksi singkat dan umpan balik yang menjelaskan "mengapa".

## 4. Persona Pengguna

### Persona 1 — Siswa: "Raka", 13 tahun, kelas VIII
- **Perangkat:** HP Android kelas menengah ke bawah (RAM 3–4 GB, layar 6"), kuota internet terbatas.
- **Kebiasaan:** Belajar dari papan tulis dan buku; belum pernah memakai aplikasi belajar matematika.
- **Kesulitan:** Menggambar garis melalui titik, menentukan titik relatif, memahami soal cerita panjang.
- **Tujuan:** Bisa mengerjakan PR dan ulangan Koordinat Kartesius dengan percaya diri.
- **Frustrasi:** Teks panjang, tampilan rumit, umpan balik "salah" tanpa penjelasan.

### Persona 2 — Guru: "Bu Sari", guru matematika SMP
- **Perangkat:** Laptop dan HP.
- **Tujuan:** Memantau siswa yang tertinggal, mengetahui soal yang paling sering salah.
- **Kebutuhan:** Membuat kelas dengan cepat, laporan ringkas per siswa dan per soal, ekspor nilai.
- **Frustrasi:** Aplikasi yang memerlukan pengaturan rumit.

## 5. Kebutuhan Turunan

| Kode Kebutuhan | Deskripsi | Sumber |
|----------------|-----------|--------|
| KB-01 | Bidang Kartesius interaktif (plot, geser, zoom sederhana) | W-1, W-2 |
| KB-02 | Visualisasi garis otomatis melalui dua titik dan garis sejajar/tegak lurus sumbu | W-1 |
| KB-03 | Mode "titik relatif" — menentukan titik berdasarkan titik acuan | W-2 |
| KB-04 | Soal cerita terstruktur (Diketahui/Ditanya/Langkah, highlight angka) | W-3 |
| KB-05 | Petunjuk bertahap dan umpan balik spesifik | W-1, W-2, W-3 |
| KB-06 | Tutorial penggunaan awal & bantuan kontekstual | W-4 |
| KB-07 | Tampilan sederhana, konsisten, ramah HP | W-4 |
| KB-08 | Login siswa/guru, kelas, dan dashboard guru | Keputusan pengembang |
| KB-09 | Instrumen pengukuran beban kognitif di dalam aplikasi | Kebutuhan penelitian |
| KB-10 | Pengembangan literasi matematika (merumuskan, menerapkan, menafsirkan) melalui stimulus kontekstual bergaya AKM | Tujuan pengembang; diperkuat W-3 |
| KB-11 | Pemodelan soal cerita ke model matematika secara terpandu dan penyelesaian model secara otomatis langkah demi langkah | Tujuan pengembang; diperkuat W-3 |

> **Catatan:** KB-10 dan KB-11 berasal dari tujuan pengembang, bukan langsung dari wawancara. Keduanya selaras dengan W-3: kesulitan memahami soal cerita panjang merupakan hambatan pada proses *merumuskan* dalam literasi matematika. Rinciannya ada di [13-literasi-dan-pemodelan.md](13-literasi-dan-pemodelan.md).

## 6. Keterbatasan & Rekomendasi Pengumpulan Data Lanjutan

- Data berasal dari **satu informan**; temuan bersifat eksploratif. Disarankan menambah 3–5 siswa lagi dan **1–2 guru** untuk triangulasi.
- Disarankan melakukan **observasi** saat siswa mengerjakan soal Kartesius dan **analisis dokumen** (buku paket, hasil ulangan).
- Usulan pertanyaan tambahan untuk siswa terkait literasi: "Setelah membaca soal cerita, apa yang pertama kamu lakukan?", "Bagaimana kamu tahu jawabanmu masuk akal?", "Pernahkah kamu mengerjakan soal AKM/numerasi?"
- Usulan pertanyaan tambahan untuk guru: KD/TP yang diajarkan, miskonsepsi umum (mis. tertukar urutan (x, y)), kebutuhan laporan, ketersediaan perangkat siswa.
