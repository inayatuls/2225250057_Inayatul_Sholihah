"""Teks umpan balik yang dipakai backend (satu tempat, bahasa Indonesia)."""

MISCONCEPTIONS: dict[str, str] = {
    "MK-1": "Sepertinya x dan y tertukar. Ingat: (x, y) = (mendatar, tegak).",
    "MK-2": "Perhatikan arah: kiri dan bawah bernilai negatif.",
    "MK-3": "Mulailah dari titik acuan, bukan dari O(0, 0).",
    "MK-4": "Garis sejajar sumbu X arahnya mendatar; nilai y semua titiknya sama.",
    "MK-5": "Jarak ke sumbu X diukur tegak, jadi lihat nilai y.",
    "MK-6": "Hitung loncatannya, bukan garisnya.",
    "MK-7": "Luas memakai skala dua kali (panjang dan lebar): kalikan dengan skala × skala.",
    "MK-8": "Cek lagi arahnya. Barat/kiri membuat x berkurang, selatan/bawah membuat y berkurang.",
    "MK-9": "Jarak tempuh menjumlahkan semua langkah yang dijalani, bukan hanya jarak awal ke akhir.",
    "MK-10": "Titik pertama belum bergeser. Titik ke-n bergeser (n − 1) kali.",
    "MK-11": "Jarak = selisih koordinat: |x₂ − x₁|.",
    "MK-12": "Jawabanmu masih dalam satuan grid. Ubah ke satuan sebenarnya memakai skala.",
}

STEP_LABELS = {
    "understand": "Pahami",
    "formulate": "Rumuskan",
    "solve": "Selesaikan",
    "interpret": "Tafsirkan",
    "check": "Periksa",
}

LITERACY_LABELS = {"formulate": "Merumuskan", "employ": "Menerapkan", "interpret": "Menafsirkan"}

LITERACY_SUGGESTIONS = {
    "formulate": "Coba lagi soal Lab Pemodelan level 2 untuk melatih Merumuskan.",
    "employ": "Latih lagi perhitungan di modul M3 dan M4 untuk menguatkan Menerapkan.",
    "interpret": "Perhatikan satuan dan arah di langkah Tafsirkan pada soal M6.",
}
