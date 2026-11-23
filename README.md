# Novellity

**Asisten Sintesis Literatur Ilmiah & Pemetaan Research Gap Berbasis AI Multimodal**

Novellity adalah aplikasi web berbasis **Node.js** dan **Express.js** yang membantu mahasiswa tingkat akhir maupun peneliti dalam menganalisis kumpulan artikel jurnal ilmiah (PDF) secara simultan. Aplikasi ini membandingkan fokus kajian, metodologi, temuan utama, dan keterbatasan antar-jurnal, memetakan celah penelitian (*research gap*) yang tertaut langsung ke dokumen sumber, serta merumuskan rekomendasi judul penelitian baru yang spesifik dan terukur.

---

## Fitur Utama

* **Analisis Multimodal PDF Langsung:** Memproses hingga **10 berkas jurnal PDF** sekaligus (maksimal total **15 MB**) menggunakan **Google Gemini API** (`gemini-4-hydrogen`) tanpa pustaka ekstraksi teks manual yang rentan merusak tata letak dua kolom, tabel, maupun rumus.
* **Penyetelan Penalaran Optimal:** Menggunakan konfigurasi `thinkingLevel: 'LOW'` dan batas waktu tunggu peladen **180 detik (3 menit)** untuk menjaga keseimbangan antara ketajaman sintesis akademik dan keandalan eksekusi pada beban hingga 10 jurnal.
* **Arsitektur Stateless & Privasi Data:** Seluruh berkas PDF hanya diproses di dalam penyangga memori sementara (RAM) tanpa disimpan ke disk maupun basis data permanen, dan langsung dibersihkan seketika di dalam blok `finally` setelah respons selesai dikirim.
* **Pertahanan Keamanan Berlapis:**
  * *Rate Limiter* berbasis IP (maksimal 5 permintaan per menit).
  * *Concurrency Limiter* (maksimal 2 antrean analisis berjalan paralel untuk mencegah kehabisan memori).
  * Validasi tanda tangan biner `%PDF-` pada 5 byte awal berkas untuk menolak dokumen palsu (*spoofed extension*).
  * Validasi skema keluaran JSON ketat (*Structured Outputs*) untuk mencegah halusinasi format.
* **Dasbor Hasil Interaktif & Ekspor Laporan:** Dilengkapi navigasi tab (*Ringkasan Literatur*, *Research Gap*, *Sintesis Research Gap*, dan *Rekomendasi Judul*), fitur salin teks terformat satu klik, serta tata letak cetak bersih ke PDF melalui CSS `@media print`.
* **Mode Uji Cepat:** Menyediakan fitur **Gunakan 3 Jurnal Contoh** untuk menguji seluruh alur sintesis secara instan tanpa perlu mengunggah berkas manual.

---

## Arsitektur & Struktur Direktori

Aplikasi ini dibangun menggunakan pola arsitektur **MVC (Model-View-Controller)** dengan pemisahan tanggung jawab tiap lapisan:

```text
novellity_project/
├── config/
│   └── gemini.js               # Inisialisasi klien Google GenAI, model, dan batas waktu AI (180s)
├── controllers/
│   ├── analisis.controller.js  # Orkestrasi analisis jurnal, mode sampel, & pembersihan buffer RAM
│   └── page.controller.js      # Pengendali rendering halaman antarmuka EJS
├── middlewares/
│   ├── concurrencyLimit.js     # Pembatas antrean proses paralel di memori (maks. 2)
│   ├── rateLimit.js            # Pembatas laju permintaan per alamat IP
│   └── uploadPdf.js            # Konfigurasi Multer memoryStorage & validasi biner %PDF-
├── public/
│   ├── js/
│   │   └── app.js              # Logika klien (drag-and-drop, progres, tab hasil, salin/cetak)
│   └── samples/                # Tempat menyimpan maksimal 3 berkas jurnal PDF contoh
├── routes/
│   ├── analisis.routes.js      # Definisi endpoint REST API (/api/status & /api/analisis)
│   └── page.routes.js          # Definisi rute halaman utama (/)
├── services/
│   ├── gemini.service.js       # Pemanggilan multimodal Gemini API dengan Promise.race timeout
│   └── prompt.service.js       # Instruksi sistem anti-halusinasi dan prompt sintesis literatur
├── utils/
│   ├── response.js             # Standarisasi format respons JSON sukses dan galat
│   └── schema.js               # Definisi skema JSON terstruktur untuk keluaran Gemini
├── views/
│   ├── partials/
│   │   ├── head.ejs            # Konfigurasi Tailwind CSS, font editorial, & aturan @media print
│   │   ├── navbar.ejs          # Header aplikasi dan indikator status antrean peladen
│   │   └── footer.ejs          # Catatan kaki privasi stateless & disclaimer akademik
│   └── index.ejs               # Halaman utama (unggah berkas, layar progres, & dasbor hasil)
├── .env.example                # Templat variabel lingkungan
├── .gitignore                  # Pengecualian node_modules dan berkas .env
├── app.js                      # Titik masuk peladen Express.js & konfigurasi timeout soket HTTP
├── package.json                # Daftar dependensi dan skrip NPM
└── README.md                   # Dokumentasi proyek
```

---

## Instalasi & Menjalankan Secara Lokal

### 1. Prasyarat
* **Node.js** versi `18.0.0` atau lebih baru.
* Kunci API aktif dari **Google AI Studio** (`GEMINI_API_KEY`).

### 2. Langkah Pemasangan
1. **Unduh atau klon repositori proyek**, lalu masuk ke direktori utama:
   ```bash
   cd novellity_project
   ```

2. **Pasang seluruh dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi variabel lingkungan:**
   Salin berkas `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Buka berkas `.env` dan sesuaikan nilainya:
   ```env
   PORT=3000
   GEMINI_API_KEY=masukkan_api_key_google_ai_studio_anda
   GEMINI_MODEL=gemini-4-hydrogen
   AI_TIMEOUT_MS=180000
   MAX_FILES=10
   MAX_TOTAL_MB=15
   MAX_CONCURRENT=2
   RATE_LIMIT_PER_MIN=5
   ```

4. **Siapkan Paket Jurnal Contoh (Opsional):**
   Letakkan maksimal 3 berkas artikel jurnal ilmiah `.pdf` (total ukuran di bawah 15 MB) ke dalam folder `public/samples/` agar tombol **Gunakan 3 Jurnal Contoh** dapat digunakan.

5. **Jalankan Peladen:**
   * Mode pengembangan (dengan *auto-reload* `nodemon`):
     ```bash
     npm run dev
     ```
   * Mode produksi:
     ```bash
     npm start
     ```
   Buka peramban dan akses **`http://localhost:3000`**.

---

## Spesifikasi Endpoint API

### 1. `GET /api/status`
Memeriksa kesiapan peladen dan ketersediaan slot antrean pemrosesan.

**Contoh Respons (`200 OK`):**
```json
{
  "success": true,
  "status": "aktif",
  "antrean_aktif": 0,
  "maks_antrean": 2
}
```

### 2. `POST /api/analisis`
Menganalisis 1 hingga 10 berkas PDF dan mengembalikan hasil sintesis terstruktur.

* **Content-Type:** `multipart/form-data`
* **Parameter Body:**
  * `files`: Array berkas PDF (wajib diisi jika `useSample` bukan `true`).
  * `useSample`: String `"true"` untuk memproses paket jurnal dari `public/samples/`.

**Kode Status HTTP yang Ditangani:**
* `200 OK`: Analisis berhasil dan JSON terstruktur dikembalikan.
* `400 Bad Request` (`BERKAS_TIDAK_VALID`): Berkas kosong (0 byte) atau jumlah melebihi 10 dokumen.
* `413 Payload Too Large` (`UKURAN_MELEBIHI_BATAS`): Akumulasi ukuran berkas melebihi 15 MB.
* `415 Unsupported Media Type` (`BUKAN_FORMAT_PDF`): Ekstensi atau header biner berkas bukan `%PDF-`.
* `422 Unprocessable Entity` (`PDF_TIDAK_TERBACA`): Dokumen PDF rusak atau terkunci kata sandi.
* `429 Too Many Requests` (`TERLALU_BANYAK_PERMINTAAN`): Melebihi batas 5 permintaan per menit per IP.
* `503 Service Unavailable` (`SERVER_SEDANG_SIBUK`): Seluruh slot antrean paralel (2 proses) sedang penuh.
* `504 Gateway Timeout` (`LAYANAN_AI_TIMEOUT`): Waktu pemrosesan AI melampaui batas 180 detik.

---

## Panduan Deployment ke Cloud (Render)

1. Unggah seluruh kode proyek ke repositori GitHub (pastikan berkas `.env` tidak ikut terunggah karena sudah terdaftar di `.gitignore`).
2. Buat layanan baru bertipe **Web Service** di dasbor **Render** dan hubungkan dengan repositori GitHub Anda.
3. Gunakan pengaturan berikut:
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
4. Tambahkan seluruh variabel pada bagian **Environment Variables** di Render sesuai isi berkas `.env` Anda (`GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_TIMEOUT_MS`, `MAX_FILES`, `MAX_TOTAL_MB`, `MAX_CONCURRENT`, `RATE_LIMIT_PER_MIN`).
5. **Catatan Infrastruktur Cloud:** Pada paket gratis layanan cloud (*free tier*), *reverse proxy* jaringan umumnya menerapkan batas waktu koneksi HTTP bawaan sekitar 100 detik. Untuk penggunaan daring pada paket gratis, disarankan mengunggah 3 hingga 6 jurnal per sesi analisis agar proses selesai di bawah batas waktu *proxy* jaringan.

---

## Disclaimer Akademik

Seluruh hasil matriks literatur, pemetaan *research gap*, dan rekomendasi judul yang dihasilkan oleh Novellity disusun secara otomatis berdasarkan dokumen sumber yang diunggah sebagai alat bantu eksplorasi awal, dan **wajib diverifikasi kembali bersama dosen pembimbing**.