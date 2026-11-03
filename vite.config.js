import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Kunci port: localStorage terikat ke URL persis, jadi port dipilih
    // eksplisit agar tidak bentrok dengan proyek lokal lain
    // (InStats 5173, StockVest 5174, BelajarLog 5175).
    port: 5175,
    strictPort: true,
  },
  // Path aset relatif agar build statis tetap benar di GitHub Pages
  // (https://lenathea913.github.io/BelajarLog/) maupun saat dibuka lokal.
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
