# 03 — User Stories & Acceptance Criteria

| Atribut | Keterangan |
|---------|------------|
| Versi | 1.0 |
| Tanggal | 10 November 2026 |
| Penyusun | Inayatul Sholihah |
| Acuan | [02-PRD.md](02-PRD.md) |

Format: *Sebagai [peran], saya ingin [tujuan], agar [manfaat].* Kriteria penerimaan memakai format **Given / When / Then** (Diberikan / Ketika / Maka).

## Daftar Isi
1. [Epik & Ringkasan](#1-epik--ringkasan)
2. [Siswa](#2-siswa)
3. [Guru](#3-guru)
4. [Admin / Peneliti](#4-admin--peneliti)

---

## 1. Epik & Ringkasan

| Epik | Story | Fitur | Prioritas |
|------|-------|-------|-----------|
| E1 Onboarding & Akun | US-S01, US-S02, US-G01 | F-01, F-10, F-11, F-18 | M |
| E2 Titik Koordinat | US-S03, US-S04 | F-02, F-03, F-04 | M |
| E3 Garis | US-S05, US-S06 | F-05 | M |
| E4 Soal Cerita | US-S07, US-S08 | F-08, F-09 | M |
| E5 Progres | US-S09 | F-12 | M |
| E6 Dashboard Guru | US-G02 – US-G05 | F-13, F-16 | M/S |
| E7 Penelitian | US-S10, US-A01, US-A02 | F-14, F-15 | S |
| E8 Offline | US-S11 | F-17 | S |
| E9 Pemodelan | US-S12, US-S13 | F-22, F-23, F-26, F-27 | M/S |
| E10 Literasi | US-S14, US-S15, US-G06 | F-24, F-25 | M/S |

---

## 2. Siswa

### US-S01 — Tutorial awal (W-4)
Sebagai **siswa yang belum pernah memakai aplikasi belajar**, saya ingin **dipandu cara memakai aplikasi**, agar **saya tidak bingung saat mulai belajar**.

- **Given** saya login pertama kali, **when** beranda dibuka, **then** tutorial interaktif 4–5 langkah otomatis muncul.
- **Given** tutorial tampil, **when** saya menekan "Lewati", **then** tutorial ditutup dan dapat dibuka lagi dari menu "Bantuan".
- **Given** langkah tutorial tentang kanvas, **when** saya mengetuk grid, **then** sebuah titik muncul dan tutorial lanjut ke langkah berikutnya (belajar dengan melakukan).

### US-S02 — Daftar, masuk, dan gabung kelas
Sebagai **siswa**, saya ingin **mendaftar dan bergabung ke kelas guru saya**, agar **guru dapat melihat progres saya**.

- **Given** form daftar, **when** saya mengisi nama, username unik, dan kata sandi ≥ 6 karakter, **then** akun dibuat dan saya otomatis masuk.
- **Given** username sudah dipakai, **when** saya mendaftar, **then** muncul pesan "Username sudah dipakai, coba yang lain".
- **Given** saya sudah login, **when** saya memasukkan kode kelas valid, **then** saya tergabung dan nama kelas tampil di beranda.
- **Given** kode salah, **when** saya menekan "Gabung", **then** muncul pesan "Kode kelas tidak ditemukan".

### US-S03 — Menentukan titik pada bidang Kartesius (W-2)
Sebagai **siswa**, saya ingin **menaruh dan menggeser titik sambil melihat koordinatnya**, agar **saya paham hubungan posisi dan pasangan (x, y)**.

- **Given** kanvas terbuka, **when** saya mengetuk perpotongan grid, **then** titik muncul dan label "(x, y)" tampil di dekat titik.
- **Given** titik ada, **when** saya menyeretnya, **then** titik menempel (snap) ke bilangan bulat terdekat dan label diperbarui real-time.
- **Given** titik dipilih, **when** saya menekan tombol panah, **then** titik bergeser 1 satuan (alternatif bagi yang sulit menyeret).
- **Given** mode eksplorasi, **when** titik berpindah kuadran, **then** keterangan kuadran (I–IV) atau "pada sumbu X/Y" diperbarui.

### US-S04 — Menentukan titik relatif terhadap titik acuan (W-2)
Sebagai **siswa**, saya ingin **dibantu menentukan titik yang tidak diberi angka secara langsung**, agar **saya bisa mengerjakan soal "posisi titik terhadap titik acuan"**.

- **Given** soal "Tentukan titik B yang 3 satuan ke kanan dan 2 satuan ke atas dari A(1, 1)", **when** saya meminta hint level 1, **then** muncul teks "Mulai dari titik A".
- **When** hint level 2, **then** panah horizontal 3 satuan dari A digambar.
- **When** hint level 3, **then** panah vertikal 2 satuan ditambahkan, tanpa langsung menandai jawaban.
- **Given** saya menaruh B di (2, 4), **when** saya menekan "Periksa", **then** umpan balik: "Ke kanan sudah 1 satuan, masih kurang 2. Ke atas sudah 3, kelebihan 1."

### US-S05 — Menggambar garis melalui dua titik (W-1)
Sebagai **siswa**, saya ingin **melihat garis tergambar melalui titik-titik yang saya tentukan**, agar **saya memahami bahwa garis ditentukan oleh titik-titik yang dilaluinya**.

- **Given** mode garis, **when** saya menaruh titik pertama, **then** titik ditandai "1" dan instruksi berubah menjadi "Taruh titik kedua".
- **When** saya menaruh titik kedua, **then** garis tergambar memanjang melalui kedua titik sampai tepi kanvas.
- **Given** garis tergambar, **when** saya menggeser salah satu titik, **then** garis ikut berubah secara real-time.
- **Given** soal "Gambarlah garis melalui P(−2, 1) dan Q(3, 1)", **when** jawaban benar, **then** muncul umpan balik dan keterangan "Garis ini sejajar sumbu X karena nilai y kedua titik sama".

### US-S06 — Garis sejajar & tegak lurus sumbu (W-1)
Sebagai **siswa**, saya ingin **mengamati garis yang sejajar atau tegak lurus sumbu X/Y**, agar **saya bisa menentukan posisi garis terhadap sumbu**.

- **Given** contoh dipudarkan, **when** saya menggeser titik sehingga y kedua titik sama, **then** sistem menyorot "y sama → sejajar sumbu X".
- **Given** soal pilihan ganda posisi garis, **when** saya menjawab, **then** sistem menampilkan garis pada kanvas sebagai penjelasan.

### US-S07 — Soal cerita terstruktur (W-3)
Sebagai **siswa yang bingung dengan soal cerita panjang**, saya ingin **soal disajikan pendek dengan informasi penting disorot**, agar **saya bisa langsung memahami apa yang diketahui dan ditanyakan**.

- **Given** soal cerita, **when** soal ditampilkan, **then** teks maksimal 3 kalimat pendek, angka dan kata kunci di-*highlight*, dan ilustrasi berada tepat di atas/bawah teks.
- **Given** tingkat Mudah, **when** saya membuka panel "Diketahui / Ditanya", **then** isinya sudah terisi otomatis dalam bentuk poin.
- **Given** tingkat Sedang, **when** panel dibuka, **then** saya diminta memilih/mengetuk informasi yang diketahui dari teks sebelum menjawab.
- **Given** panel "Langkah", **when** dibuka, **then** tampil langkah penyelesaian bertahap (satu per satu, bukan sekaligus).

### US-S08 — Petunjuk dan umpan balik
Sebagai **siswa**, saya ingin **mendapat petunjuk bertahap dan umpan balik yang menjelaskan kesalahan**, agar **saya belajar dari kesalahan, bukan hanya tahu salah**.

- **Given** jawaban salah karena x dan y tertukar, **when** saya menekan "Periksa", **then** muncul pesan "Sepertinya x dan y tertukar. Ingat: (x, y) = (mendatar, tegak)".
- **Given** saya memakai hint, **then** skor maksimal soal berkurang sesuai aturan FR-15 dan hal ini diberitahukan sebelum hint dibuka.

### US-S09 — Melihat progres
Sebagai **siswa**, saya ingin **melihat kemajuan belajar saya**, agar **saya termotivasi menyelesaikan materi**.

- **Given** beranda, **then** setiap modul menampilkan status (terkunci/sedang/selesai), persentase, dan bintang 0–3.

### US-S10 — Mengisi kuesioner beban kognitif
Sebagai **siswa peserta uji coba**, saya ingin **mengisi kuesioner singkat**, agar **peneliti mengetahui seberapa berat materi bagi saya**.

- **Given** kelas mengaktifkan kuesioner, **when** saya menyelesaikan soal cerita/modul, **then** muncul 1 pertanyaan skala 1–9 dengan ilustrasi emoji dan dapat diisi dalam < 10 detik.

### US-S11 — Belajar tanpa internet
Sebagai **siswa dengan kuota terbatas**, saya ingin **tetap bisa membuka materi saat offline**, agar **belajar tidak terputus**.

- **Given** modul pernah dibuka, **when** perangkat offline, **then** materi dan latihan tetap dapat dibuka.
- **Given** saya menjawab saat offline, **when** perangkat online kembali, **then** jawaban dikirim otomatis dan progres diperbarui.

### US-S12 — Memodelkan soal cerita secara terpandu (KB-11, W-3)
Sebagai **siswa**, saya ingin **dibimbing mengubah soal cerita menjadi model matematika langkah demi langkah**, agar **saya tahu harus mulai dari mana dan bisa menyelesaikan soal cerita sendiri**.

- **Given** soal di Lab Pemodelan, **then** stepper 5 langkah (Pahami, Rumuskan, Selesaikan, Tafsirkan, Periksa) tampil dan hanya langkah ① yang aktif.
- **Given** langkah ①, **when** saya mengetuk "(1, −2)" lalu memasukkannya ke kotak Diketahui, **then** token tercatat. **When** saya menekan "Periksa langkah" dan ada informasi penting yang terlewat, **then** muncul pesan "Masih ada 1 informasi penting yang belum kamu tandai".
- **Given** langkah ②, **when** saya memilih kartu "Rute Berantai" dan mengisi perpindahan, **then** notasi model tampil, mis. "P = (1 − 5, −2 + 4 − 1)", dan sistem menerima urutan perpindahan yang berbeda selama jumlahnya sama.
- **Given** saya salah arah (barat diisi +5), **then** umpan balik MK-8: "Barat = kiri, jadi nilai x berkurang."
- **Given** langkah ③ level 1, **when** saya sudah menjawab, **then** tombol "Jalankan Model" muncul dan menampilkan langkah penyelesaian satu per satu beserta animasi panah di kanvas.
- **Given** langkah ④, **when** jawaban saya "(−4, 1)" tanpa konteks pada soal yang menanyakan jarak dalam meter, **then** umpan balik MK-12 mengingatkan untuk memakai skala.
- **Given** semua langkah selesai, **then** skor per langkah dan totalnya tampil.

### US-S13 — Pemodel Bebas (KB-11)
Sebagai **siswa**, saya ingin **memasukkan data soal cerita dari buku ke templat model**, agar **aplikasi menampilkan model dan cara penyelesaiannya untuk saya pelajari**.

- **Given** Pemodel Bebas, **when** saya memilih templat "Bangun Datar", mengisi tiga titik sudut, dan skala 1 satuan = 2 m, **then** aplikasi menampilkan titik sudut keempat, panjang, lebar, luas (dalam satuan² dan m²), gambar persegi panjang, serta langkah penyelesaian.
- **Given** data tidak valid (mis. tiga titik tidak membentuk sudut siku sejajar sumbu), **then** muncul pesan ramah yang menjelaskan alasannya.
- **Given** hasil tampil, **when** saya menekan "Simpan", **then** model tersimpan di riwayat saya. Hasil ini tidak memengaruhi nilai.

### US-S14 — Mengerjakan stimulus literasi (KB-10)
Sebagai **siswa**, saya ingin **mengerjakan beberapa pertanyaan dari satu denah atau peta**, agar **saya terlatih membaca informasi dan bernalar seperti pada soal AKM**.

- **Given** stimulus "Denah Desa", **then** denah dan tabel data tampil, dan saya dapat menyematkannya (*pin*) saat menjawab tiap butir.
- **Given** butir penalaran, **when** saya memilih jawaban "Tidak benar", **then** saya juga diminta memilih alasan dari beberapa opsi. Skor penuh hanya jika jawaban dan alasan benar.

### US-S15 — Melihat profil literasi saya (KB-10)
Sebagai **siswa**, saya ingin **melihat kemampuan literasi saya per proses**, agar **saya tahu bagian mana yang perlu dilatih**.

- **Given** halaman profil, **then** tampil 3 batang (Merumuskan, Menerapkan, Menafsirkan) dengan label kategori dan satu saran latihan, mis. "Coba lagi soal Lab Pemodelan level 2 untuk melatih Merumuskan".

---

## 3. Guru

### US-G01 — Membuat kelas
Sebagai **guru**, saya ingin **membuat kelas dan membagikan kode**, agar **siswa dapat bergabung dengan mudah**.

- **Given** dashboard, **when** saya mengisi nama kelas (mis. "VIII-A") dan menekan "Buat", **then** kelas dibuat dengan kode 6 karakter dan tombol "Salin kode".

### US-G02 — Memantau progres kelas
Sebagai **guru**, saya ingin **melihat progres seluruh siswa**, agar **saya tahu siapa yang perlu dibantu**.

- **Given** halaman kelas, **then** tabel menampilkan nama siswa, modul selesai, skor rata-rata, waktu aktif terakhir; dapat diurutkan.
- **Given** siswa dengan skor < 60, **then** baris ditandai "Perlu bantuan".

### US-G03 — Analisis per soal
Sebagai **guru**, saya ingin **mengetahui soal yang paling sering salah dan kesalahan umum**, agar **saya bisa menyesuaikan pengajaran di kelas**.

- **Given** halaman analisis, **then** setiap soal menampilkan % benar, rata-rata percobaan, rata-rata hint, dan 3 kesalahan paling umum (mis. "x–y tertukar: 40%").

### US-G04 — Detail jawaban siswa
Sebagai **guru**, saya ingin **melihat jawaban seorang siswa**, agar **saya dapat memberikan umpan balik personal**.

- **Given** saya membuka profil siswa, **then** tampil riwayat jawaban per soal termasuk tampilan kanvas jawaban siswa.

### US-G05 — Ekspor nilai & reset kata sandi
- **Given** halaman kelas, **when** saya menekan "Ekspor CSV", **then** file berisi nama, skor per modul, total, dan tanggal terunduh.
- **Given** siswa lupa kata sandi, **when** saya menekan "Reset kata sandi", **then** sistem memberikan kata sandi sementara yang wajib diganti saat siswa login.

### US-G06 — Profil literasi kelas (KB-10)
Sebagai **guru**, saya ingin **melihat profil literasi kelas dan siswa**, agar **saya dapat merancang pembelajaran yang menguatkan proses yang lemah**.

- **Given** tab "Literasi", **then** tampil rata-rata kelas per proses (Merumuskan, Menerapkan, Menafsirkan), tren mingguan, dan daftar siswa per kategori.
- **Given** saya membuka satu siswa, **then** tampil skor per langkah pada tiap soal pemodelan, termasuk model yang disusun siswa.
- **Given** tes literasi awal dan akhir sudah dikerjakan, **then** tampil N-gain literasi kelas.

---

## 4. Admin / Peneliti

### US-A01 — Kelola konten
Sebagai **admin**, saya ingin **menambah/mengubah materi dan soal melalui file seed JSON atau panel admin**, agar **konten dapat diperbaiki setelah validasi ahli**.

- **Given** file seed valid sesuai skema [05-bank-soal-spesifikasi.md](05-bank-soal-spesifikasi.md), **when** perintah seed dijalankan, **then** soal tersimpan/diperbarui tanpa duplikasi (idempoten berdasarkan `slug`).

### US-A02 — Unduh data penelitian
Sebagai **peneliti**, saya ingin **mengunduh data jawaban, skor pretest-posttest, skala Paas, dan SUS secara anonim**, agar **saya dapat menganalisis data untuk laporan**.

- **Given** halaman admin, **when** saya mengekspor, **then** file CSV memakai ID acak per siswa tanpa nama/username.
