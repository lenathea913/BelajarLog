/* Test ringkasan, streak, deret harian, dan pemulihan backup.
   Streak dan grafik 7 hari adalah alasan orang membuka jurnal ini, tapi
   hitungannya bergantung pada "hari ini" — jadi semua tanggal uji dibuat
   relatif terhadap hari berjalan, bukan tanggal mati. */

import test from "node:test";
import assert from "node:assert/strict";

// store.js menulis ke localStorage; Node tidak punya, jadi dipalsukan.
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: k => { mem.delete(k); },
  clear: () => mem.clear(),
  key: i => Array.from(mem.keys())[i] ?? null,
  get length(){ return mem.size; },
};

import {
  computeStreak, dailySeries, summarize, minutesLabel, isoLocal,
  restoreSessions, addSession, removeSession, sortedSessions, load,
} from "../src/store.js";

/** ISO lokal untuk n hari yang lalu (0 = hari ini) */
function hariLalu(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoLocal(d);
}

const sesi = (over = {}) => ({ id: "s", date: hariLalu(0), topic: "Topik", minutes: 30, ...over });

test.beforeEach(() => {
  mem.clear();
  load(); // penyimpanan kosong → sesi kembali ke daftar kosong
});

/* ============================ streak ============================ */

test("computeStreak 0 bila belum ada sesi sama sekali", () => {
  assert.equal(computeStreak([]), 0);
});

test("computeStreak menghitung hari ini dan hari-hari sebelumnya yang berurutan", () => {
  assert.equal(computeStreak([sesi({ date: hariLalu(0) })]), 1);
  assert.equal(computeStreak([
    sesi({ date: hariLalu(0) }),
    sesi({ date: hariLalu(1) }),
    sesi({ date: hariLalu(2) }),
  ]), 3);
});

test("computeStreak tetap hidup bila hari ini kosong tapi kemarin ada", () => {
  assert.equal(computeStreak([sesi({ date: hariLalu(1) })]), 1);
  assert.equal(computeStreak([
    sesi({ date: hariLalu(1) }),
    sesi({ date: hariLalu(2) }),
  ]), 2);
});

test("computeStreak putus bila kemarin dan hari ini sama-sama kosong", () => {
  // hanya ada sesi dua hari lalu: streak dianggap sudah putus
  assert.equal(computeStreak([sesi({ date: hariLalu(2) })]), 0);
  assert.equal(computeStreak([
    sesi({ date: hariLalu(2) }),
    sesi({ date: hariLalu(3) }),
  ]), 0);
});

test("computeStreak menghitung hari, bukan jumlah sesi", () => {
  // tiga sesi hari ini + satu kemarin = 2 hari beruntun
  assert.equal(computeStreak([
    sesi({ id: "a", date: hariLalu(0) }),
    sesi({ id: "b", date: hariLalu(0) }),
    sesi({ id: "c", date: hariLalu(0) }),
    sesi({ id: "d", date: hariLalu(1) }),
  ]), 2);
});

test("computeStreak berhenti pada hari yang bolong", () => {
  // hari ini dan kemarin ada, dua hari lalu bolong, tiga hari lalu ada
  assert.equal(computeStreak([
    sesi({ date: hariLalu(0) }),
    sesi({ date: hariLalu(1) }),
    sesi({ date: hariLalu(3) }),
  ]), 2);
});

test("computeStreak tidak terpengaruh urutan data", () => {
  const campur = [
    sesi({ date: hariLalu(2) }),
    sesi({ date: hariLalu(0) }),
    sesi({ date: hariLalu(1) }),
  ];
  assert.equal(computeStreak(campur), 3);
});

/* ============================ deret harian ============================ */

test("dailySeries mengembalikan 7 hari berakhir hari ini, termasuk hari kosong", () => {
  const seri = dailySeries([sesi({ date: hariLalu(0), minutes: 30 })]);
  assert.equal(seri.length, 7);
  assert.equal(seri[6].date, hariLalu(0)); // hari terakhir = hari ini
  assert.equal(seri[0].date, hariLalu(6));
  assert.deepEqual(seri.map(s => s.minutes), [0, 0, 0, 0, 0, 0, 30]);
});

test("dailySeries menjumlahkan beberapa sesi pada hari yang sama", () => {
  const seri = dailySeries([
    sesi({ id: "a", date: hariLalu(1), minutes: 30 }),
    sesi({ id: "b", date: hariLalu(1), minutes: 15 }),
  ]);
  assert.equal(seri.find(s => s.date === hariLalu(1)).minutes, 45);
});

test("dailySeries menerima jumlah hari lain dan menampung menit berbentuk teks", () => {
  const seri = dailySeries([sesi({ date: hariLalu(0), minutes: "20" })], 3);
  assert.equal(seri.length, 3);
  assert.equal(seri[2].minutes, 20);
});

test("dailySeries mengabaikan menit tidak valid dan sesi di luar rentang", () => {
  const seri = dailySeries([
    sesi({ id: "a", date: hariLalu(0), minutes: "abc" }),
    sesi({ id: "b", date: "2099-01-01", minutes: 500 }), // masa depan
  ]);
  assert.equal(seri[6].minutes, 0);
  assert.equal(seri.reduce((a, s) => a + s.minutes, 0), 0);
});

/* ============================ ringkasan ============================ */

test("summarize memisahkan hitungan hari ini dari total keseluruhan", () => {
  const hasil = summarize([
    sesi({ date: hariLalu(0), minutes: 30 }),
    sesi({ date: hariLalu(0), minutes: 15 }),
    sesi({ date: hariLalu(5), minutes: 60 }),
  ]);
  assert.deepEqual(hasil, {
    sesiHariIni: 2,
    menitHariIni: 45,
    totalSesi: 3,
    totalMenit: 105,
  });
});

test("summarize memberi nol untuk daftar kosong", () => {
  assert.deepEqual(summarize([]), {
    sesiHariIni: 0, menitHariIni: 0, totalSesi: 0, totalMenit: 0,
  });
});

test("summarize tidak menghasilkan NaN saat menit kosong atau bukan angka", () => {
  const hasil = summarize([
    sesi({ date: hariLalu(0), minutes: undefined }),
    sesi({ date: hariLalu(0), minutes: "abc" }),
    sesi({ date: hariLalu(1), minutes: 10 }),
  ]);
  assert.equal(hasil.menitHariIni, 0);
  assert.equal(hasil.totalMenit, 10);
});

/* ============================ label durasi ============================ */

test("minutesLabel memformat menit dan jam", () => {
  assert.equal(minutesLabel(0), "0m");
  assert.equal(minutesLabel(45), "45m");
  assert.equal(minutesLabel(59), "59m");
  assert.equal(minutesLabel(60), "1j");
  assert.equal(minutesLabel(85), "1j 25m");
  assert.equal(minutesLabel(120), "2j");
});

test("minutesLabel membulatkan menit dan menerima teks", () => {
  assert.equal(minutesLabel(90.4), "1j 30m");
  assert.equal(minutesLabel("45"), "45m");
  assert.equal(minutesLabel(undefined), "0m");
  assert.equal(minutesLabel(0.4), "0m");
});

/* ============================ mutasi dasar ============================ */

test("addSession menyimpan sesi baru dengan id unik dan createdAt", () => {
  const a = addSession({ date: hariLalu(0), topic: "Aljabar", minutes: 30 });
  const b = addSession({ date: hariLalu(0), topic: "Fisika", minutes: 20 });
  assert.ok(a.id && b.id);
  assert.notEqual(a.id, b.id);
  assert.ok(a.createdAt > 0);
  assert.equal(sortedSessions().length, 2);
  // benar-benar tersimpan ke penyimpanan, bukan hanya di memori
  const tersimpan = JSON.parse(mem.get("belajarlog.sessions.v1"));
  assert.deepEqual(tersimpan.map(s => s.id).sort(), [a.id, b.id].sort());
});

test("removeSession menghapus satu sesi dan mengembalikannya", () => {
  const a = addSession({ date: hariLalu(0), topic: "Aljabar", minutes: 30 });
  assert.equal(removeSession(a.id).topic, "Aljabar");
  assert.equal(removeSession(a.id), null); // sudah tidak ada
  assert.equal(sortedSessions().length, 0);
});

test("sortedSessions mengurutkan tanggal terbaru lebih dulu", () => {
  const a = addSession({ date: hariLalu(5), topic: "A", minutes: 1, createdAt: 1 });
  const b = addSession({ date: hariLalu(0), topic: "B", minutes: 1, createdAt: 1 });
  const c = addSession({ date: hariLalu(0), topic: "C", minutes: 1, createdAt: 2 });
  assert.deepEqual(sortedSessions().map(s => s.id), [c.id, b.id, a.id]);
});

/* ============================ pemulihan backup ============================ */

test("restoreSessions menggabungkan data tanpa menduplikasi id", () => {
  addSession({ id: "lama", date: hariLalu(1), topic: "Lama", minutes: 10 });
  const hasil = restoreSessions([
    { id: "lama", date: hariLalu(1), topic: "Lama", minutes: 10 },
    { id: "baru", date: hariLalu(0), topic: "Baru", minutes: 20 },
  ]);
  assert.deepEqual(hasil, { ok: true, added: 1 });
  assert.deepEqual(sortedSessions().map(s => s.id).sort(), ["baru", "lama"]);
});

test("restoreSessions menolak masukan yang bukan daftar atau tanpa entri valid", () => {
  assert.deepEqual(restoreSessions({ sessions: [] }), { ok: false });
  assert.deepEqual(restoreSessions(null), { ok: false });
  // topik wajib ada
  assert.deepEqual(restoreSessions([{ id: "x", date: hariLalu(0) }]), { ok: false });
  assert.equal(sortedSessions().length, 0);
});

test("restoreSessions dapat diulang tanpa menambah salinan", () => {
  const backup = [
    { id: "a", date: hariLalu(0), topic: "A", minutes: 5 },
    { id: "b", date: hariLalu(1), topic: "B", minutes: 5 },
  ];
  assert.deepEqual(restoreSessions(backup), { ok: true, added: 2 });
  assert.deepEqual(restoreSessions(backup), { ok: true, added: 0 });
  assert.equal(sortedSessions().length, 2);
});
