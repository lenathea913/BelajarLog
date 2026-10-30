# 📚 BelajarLog — Jurnal Belajar Harian

[![Build](https://github.com/lenathea913/BelajarLog/actions/workflows/ci.yml/badge.svg)](https://github.com/lenathea913/BelajarLog/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![Vite](https://img.shields.io/badge/build-Vite_5-646CFF.svg)

> **English:** A free, open-source **daily learning journal** that runs fully local in your browser — no server, no account, no data leaves your machine. Log short study sessions (topic, duration, reflection) and get daily/weekly totals. Built with vanilla JS + Vite, MIT licensed.

Aplikasi **jurnal belajar harian** yang berjalan 100% lokal di browser — Vite + vanilla JS, data di **localStorage**. Tidak ada server, tidak ada akun, tidak ada data yang dikirim ke mana pun.

Masalahnya sederhana: orang belajar tiap hari, tapi catatannya tersebar di notes, chat, dan buku tulis — sehingga "sebenarnya sudah berapa jam minggu ini?" tidak pernah terjawab.

## ✨ Fitur (MVP saat ini)

- **Catat sesi belajar** — topik, durasi (menit), tanggal, dan refleksi singkat
- **Ringkasan instan** — total menit hari ini + jumlah sesi, serta total seluruh riwayat
- **Riwayat terbaru di atas** — daftar sesi dengan tanggal & durasi
- **Hapus sesi** dengan konfirmasi dua langkah (tanpa dialog sistem yang membekukan halaman)
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
├── index.html        # ringkasan, form catat sesi, riwayat
├── vite.config.js    # port dikunci, output build
└── src/
    ├── main.js       # render, form, hapus (konfirmasi 2 langkah), init
    ├── store.js      # state, localStorage, format durasi/tanggal, ringkasan
    └── style.css     # token & komponen visual
```

Konvensi: modul kecil satu-tanggung-jawab, komentar bahasa Indonesia, tanpa framework/pustaka runtime — Vite hanya sebagai toolchain.

## 🗺️ Roadmap (belum dikerjakan)

Ide berikutnya, dikerjakan per langkah kecil — lihat [Issues](https://github.com/lenathea913/BelajarLog/issues):

- **Streak harian** & target mingguan (hari beruntun belajar)
- **Grafik mingguan/bulanan** — batang durasi per hari
- **Ekspor/impor CSV & backup JSON** agar data tidak terkunci di satu browser
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

- **Tidak ada sinkronisasi antar perangkat** — data menempel ke browser & origin (port) tempat kamu mengetik.
- **Tidak ada notifikasi/pengingat** — aplikasi ini pasif; kamu yang membukanya.
- Belum ada ekspor data; cadangkan manual lewat DevTools → Application → Local Storage bila perlu.

## 📄 Lisensi

[MIT](LICENSE) — bebas dipakai, dimodifikasi, dan didistribusikan.
