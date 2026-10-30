import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Kunci port: localStorage terikat ke URL persis, jadi port dipilih
    // eksplisit agar tidak bentrok dengan proyek lokal lain
    // (InStats 5173, StockVest 5174, BelajarLog 5175).
    port: 5175,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
