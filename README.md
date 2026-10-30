# 📚 BelajarLog — Jurnal Belajar Harian

[![Build](https://github.com/lenathea913/BelajarLog/actions/workflows/ci.yml/badge.svg)](https://github.com/lenathea913/BelajarLog/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![Vite](https://img.shields.io/badge/build-Vite_5-646CFF.svg)

> **English:** A free, open-source **daily learning journal** that runs fully local in your browser — no server, no account, no data leaves your machine. Log short study sessions (topic, duration, reflection) and get daily/weekly totals. Built with vanilla JS + Vite, MIT licensed.

Aplikasi **jurnal belajar harian** yang berjalan 100% lokal di browser — Vite + vanilla JS, data di **localStorage**. Tidak ada server, tidak ada akun, tidak ada data yang dikirim ke mana pun.

Masalahnya sederhana: orang belajar tiap hari, tapi catatannya tersebar di notes, chat, dan buku tulis — sehingga "sebenarnya sudah berapa jam minggu ini?" tidak pernah terjawab.

## ✨ Fitur

- **Catat sesi belajar** — topik, durasi (menit), tanggal, dan refleksi singkat
- **Ringkasan instan** — menit hari ini, **streak harian**, total 7 hari terakhir, dan total seluruh riwayat
- **Streak hari beruntun** — masih dianggap hidup kalau hari ini belum belajar tapi kemarin iya
- **Grafik 7 hari** — batang durasi per hari, hari tanpa sesi tetap terlihat
- **Riwayat terbaru di atas** — daftar sesi dengan tanggal & durasi
- **Hapus sesi** dengan konfirmasi dua langkah (tanpa dialog sistem yang membekukan halaman)
- **Ekspor & impor CSV** — kolom `Tanggal, Topik, Menit, Refleksi`; impor juga menerima alias kolom umum (`date`, `topic`, `minutes`, …) dengan deteksi duplikat
- **Backup & pulihkan JSON** — unduh `belajarlog-backup-YYYY-MM-DD.json`; saat dipulihkan isi file **digabungkan**, data lama tidak hilang
- **Tanpa jaringan** — semua data di localStorage browser masing-masing

## 🚀 Mulai cepat

**Syarat:** Node.js ≥ 18 ([nodejs.org](https://nodejs.org)) dan browser apa pun.

```bash
git clone https://github.com/lenathea913/BelajarLog.git
cd BelajarLog
npm install     # sekali saja
npm run dev     # lalu buka http://localhost:5175
```

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | server pengembangan (port **5175**, dikunci) |
| `npm run build` | build produksi ke `dist/` |
| `npm run preview` | pratinjau hasil build |

> Port dikunci di `vite.config.js` karena `localStorage` menempel pada URL persis — jangan diubah agar data tidak terlihat "hilang".

## 🧱 Struktur proyek

```
BelajarLog/
├── index.html        # ringkasan, grafik 7 hari, form catat sesi, riwayat
├── vite.config.js    # port dikunci, output build
└── src/
    ├── main.js       # render (ringkasan, streak, grafik), form, hapus, init
    ├── store.js      # state, localStorage, format durasi/tanggal, streak, deret harian
    ├── csv.js        # ekspor & impor CSV (alias kolom, deteksi duplikat)
    ├── backup.js     # backup & pulihkan file JSON (merge)
    └── style.css     # token & komponen visual
```

Konvensi: modul kecil satu-tanggung-jawab, komentar bahasa Indonesia, tanpa framework/pustaka runtime — Vite hanya sebagai toolchain.

## 🗺️ Roadmap (belum dikerjakan)

Ide berikutnya, dikerjakan per langkah kecil — lihat [Issues](https://github.com/lenathea913/BelajarLog/issues):

- **Target mingguan** — mis. “5 jam/minggu”, dengan sisa yang tersisa hari ini
- **Grafik bulanan** — heatmap menit per hari seperti kalender
- **Filter & pencarian** topik, rentang tanggal
- **Pengingat lembut** saat hari hampir habis tanpa sesi (tanpa notifikasi push)
- Mode tema terang

## 🤝 Berkontribusi

1. Fork & buat branch fitur (`git checkout -b fitur/nama-fitur`)
2. Ikuti pola yang ada: modul kecil, komentar Indonesia, tanpa dependensi baru tanpa diskusi dulu
3. Pastikan `npm run build` lulus
4. Buka Pull Request yang menjelaskan *perubahan* dan *mengapa*

Bug atau ide fitur? Buka [Issues](https://github.com/lenathea913/BelajarLog/issues).

## ⚠️ Catatan & keterbatasan

- **Tidak ada sinkronisasi antar perangkat** — data menempel ke browser & origin (port) tempat kamu mengetik. Untuk pindah perangkat, pakai **Ekspor CSV** atau **Backup JSON**.
- **Backup JSON digabungkan, bukan menimpa** — sesi lama yang sudah ada (menurut `id`) tidak akan terduplikasi, tapi sesi yang kamu hapus bisa muncul lagi bila file backup lama dipulihkan.
- **Duplikat impor CSV dideteksi lewat isi** (tanggal + topik + menit + refleksi) — dua sesi identik yang memang kamu catat dua kali akan dianggap duplikat.
- **Tidak ada notifikasi/pengingat** — aplikasi ini pasif; kamu yang membukanya.

## 📄 Lisensi

[MIT](LICENSE) — bebas dipakai, dimodifikasi, dan didistribusikan.
