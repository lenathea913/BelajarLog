/* ============================================================
   BelajarLog — jurnal belajar harian (lokal, tanpa server)
   store.js : state aplikasi, penyimpanan, format tanggal/durasi.
   Modul ini bebas DOM (kecuali tidak ada sama sekali).
   ============================================================ */

const KEY_SESSIONS = "belajarlog.sessions.v1";

let sessions = [];

/* ---------- storage ---------- */
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY_SESSIONS) || "[]");
    sessions = Array.isArray(raw) ? raw.filter(x => x && x.id && x.date) : [];
  } catch (e) {
    sessions = [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions));
    return true;
  } catch (e) {
    return false; // penuh / diblokir — pemanggil bisa menampilkan peringatan
  }
}

const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- mutasi ---------- */
/** simpan satu sesi belajar; data: { date, topic, minutes, note } */
function addSession(data) {
  const s = Object.assign({ id: uid(), createdAt: Date.now() }, data);
  sessions.push(s);
  save();
  return s;
}

/** hapus sesi by id, kembalikan yang dihapus (atau null) */
function removeSession(id) {
  const i = sessions.findIndex(s => s.id === id);
  if (i < 0) return null;
  const [gone] = sessions.splice(i, 1);
  save();
  return gone;
}

/** urut: tanggal terbaru dulu, lalu yang terbaru dicatat */
function sortedSessions() {
  return sessions.slice().sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0)
  );
}

/* ---------- format ---------- */
const isoLocal = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

function dateLabel(iso) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso + "T00:00:00")
  );
}

/** menit → "45m" / "1j 25m" */
function minutesLabel(total) {
  const m = Math.round(Number(total) || 0);
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? h + "j " + rest + "m" : h + "j";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/* ---------- ringkasan ---------- */
function summarize(list) {
  const today = isoLocal(new Date());
  const hariIni = list.filter((s) => s.date === today);
  return {
    sesiHariIni: hariIni.length,
    menitHariIni: hariIni.reduce((a, s) => a + (Number(s.minutes) || 0), 0),
    totalSesi: list.length,
    totalMenit: list.reduce((a, s) => a + (Number(s.minutes) || 0), 0)
  };
}

export {
  load, save, addSession, removeSession, sortedSessions, summarize,
  isoLocal, dateLabel, minutesLabel, esc
};
