/* Test impor CSV BelajarLog.
   Impor menyentuh data jurnal asli: salah baca berarti sesi hilang atau
   dobel tanpa pesan error. localStorage dipalsukan agar data browser
   tidak tersentuh. */

import test from "node:test";
import assert from "node:assert/strict";

const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: k => { mem.delete(k); },
  clear: () => mem.clear(),
  key: i => Array.from(mem.keys())[i] ?? null,
  get length(){ return mem.size; },
};

import { importCsv } from "../src/csv.js";
import { sortedSessions, addSession, load } from "../src/store.js";

/** semua sesi tersimpan (urutan tidak dijamin untuk asersi) */
const daftar = () => sortedSessions();
const csv = rows => rows.map(r => r.join(",")).join("\r\n");

const HEADER_SENDIRI = ["Tanggal", "Topik", "Menit", "Refleksi"];
const HEADER_INGGRIS = ["date", "topic", "minutes", "note"];

test.beforeEach(() => {
  mem.clear();
  load(); // penyimpanan kosong → sesi kembali ke daftar kosong
});

test("importCsv menerima format file ekspor BelajarLog sendiri", () => {
  const hasil = importCsv(csv([
    HEADER_SENDIRI,
    ["2024-01-05", "Aljabar linear", "45", "Paham eliminasi Gauss"],
  ]));
  assert.deepEqual(hasil, { added: 1, skipped: 0 });

  const [s] = daftar();
  assert.equal(s.date, "2024-01-05");
  assert.equal(s.topic, "Aljabar linear");
  assert.equal(s.minutes, 45);
  assert.equal(s.note, "Paham eliminasi Gauss");
});

test("importCsv membaca header bahasa Inggris", () => {
  const hasil = importCsv(csv([
    HEADER_INGGRIS,
    ["2024-02-01", "Fisika", "30", "Bab 3"],
    ["2024-02-02", "Kimia", "20", ""],
  ]));
  assert.deepEqual(hasil, { added: 2, skipped: 0 });
  assert.deepEqual(daftar().map(s => s.topic).sort(), ["Fisika", "Kimia"]);
});

test("importCsv menormalkan format tanggal ISO tanpa nol dan hari/bulan/tahun", () => {
  importCsv(csv([
    HEADER_SENDIRI,
    ["2024-1-5", "A", "10", ""],
    ["05/01/2024", "B", "10", ""],
  ]));
  assert.deepEqual(daftar().map(s => s.date), ["2024-01-05", "2024-01-05"]);
  assert.equal(daftar().length, 2);
});

test("importCsv membulatkan menit dan menerima koma desimal", () => {
  importCsv(csv([
    HEADER_SENDIRI,
    // koma desimal harus dikutip, kalau tidak akan dianggap pemisah kolom
    ["2024-01-01", "A", '"45,5"', ""],
    ["2024-01-02", "B", " 30 ", ""],
  ]));
  const menit = Object.fromEntries(daftar().map(s => [s.topic, s.minutes]));
  assert.deepEqual(menit, { A: 46, B: 30 });
});

test("importCsv melewati baris tidak valid tanpa menggagalkan seluruh impor", () => {
  const hasil = importCsv(csv([
    HEADER_SENDIRI,
    ["2024-01-01", "Valid", "30", ""],       // valid
    ["", "Tanpa tanggal", "30", ""],
    ["2024-01-02", "", "30", ""],            // topik kosong
    ["2024-01-03", "Nol menit", "0", ""],
    ["2024-01-04", "Negatif", "-5", ""],
    ["bukan tanggal", "Rusak", "30", ""],
  ]));
  assert.deepEqual(hasil, { added: 1, skipped: 5 });
  assert.equal(daftar().length, 1);
});

test("importCsv tidak menyimpan sesi dobel, baik di file maupun di jurnal", () => {
  importCsv(csv([HEADER_SENDIRI, ["2024-01-01", "A", "30", ""]]));
  assert.deepEqual(importCsv(csv([HEADER_SENDIRI, ["2024-01-01", "A", "30", ""]])), { added: 0, skipped: 1 });

  const kembar = importCsv(csv([
    HEADER_SENDIRI,
    ["2024-05-01", "B", "20", ""],
    ["2024-05-01", "B", "20", ""],
  ]));
  assert.deepEqual(kembar, { added: 1, skipped: 1 });
  assert.equal(daftar().length, 2);
});

test("importCsv membedakan sesi yang topiknya berbeda pada hari yang sama", () => {
  const hasil = importCsv(csv([
    HEADER_SENDIRI,
    ["2024-01-01", "Aljabar", "30", ""],
    ["2024-01-01", "Fisika", "30", ""],
  ]));
  assert.deepEqual(hasil, { added: 2, skipped: 0 });
});

test("importCsv menghormati BOM, kutip, dan koma di dalam refleksi", () => {
  const isi = "\uFEFF" + csv([
    HEADER_SENDIRI,
    ["2024-01-01", "A", "30", '"belajar rumus, lalu latihan"'],
    ["2024-01-02", "B", "30", '"kata ""penting"""'],
  ]);
  assert.deepEqual(importCsv(isi), { added: 2, skipped: 0 });
  const catatan = Object.fromEntries(daftar().map(s => [s.topic, s.note]));
  assert.deepEqual(catatan, {
    A: "belajar rumus, lalu latihan",
    B: 'kata "penting"',
  });
});

test("importCsv menyebut kolom wajib yang hilang", () => {
  const hasil = importCsv(csv([
    ["Tanggal", "Topik", "Refleksi"], // tanpa Menit
    ["2024-01-01", "A", ""],
  ]));
  assert.match(hasil.error, /Menit/);
  assert.equal(daftar().length, 0);
});

test("importCsv menolak file kosong atau hanya berisi judul", () => {
  assert.match(importCsv("").error, /kosong/i);
  assert.match(importCsv(csv([HEADER_SENDIRI])).error, /kosong/i);
});

test("importCsv tidak menganggap sesi lama sebagai duplikat bila refleksinya berbeda", () => {
  addSession({ date: "2024-01-01", topic: "A", minutes: 30, note: "versi lama" });
  const hasil = importCsv(csv([HEADER_SENDIRI, ["2024-01-01", "A", "30", "versi baru"]]));
  assert.deepEqual(hasil, { added: 1, skipped: 0 });
  assert.equal(daftar().length, 2);
});
