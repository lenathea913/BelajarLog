/* ============================================================
   BelajarLog · csv.js : ekspor & impor sesi belajar ke CSV.
   Skema kolom: Tanggal, Topik, Menit, Refleksi.
   Impor menerima format sendiri plus alias kolom umum
   (date/topic/minutes/…), dengan deteksi duplikat.
   ============================================================ */
import { $, addSession, sortedSessions } from "./store.js";

const ALIAS = {
  date:    ["tanggal", "date", "tgl", "waktu", "hari"],
  topic:   ["topik", "topic", "materi", "judul", "subject"],
  minutes: ["menit", "minutes", "durasi", "duration", "lama", "waktumenit"],
  note:    ["refleksi", "note", "notes", "catatan", "komentar", "description"]
};
const REQUIRED_HUMAN = { date: "Tanggal", topic: "Topik", minutes: "Menit" };

/** escape nilai CSV (kutip, koma, atau newline) */
function q(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const pad = (n) => String(n).padStart(2, "0");
const todayIso = () => {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
};

/** unduh seluruh sesi sebagai CSV (BOM agar Excel membaca UTF-8) */
function exportCsv() {
  const list = sortedSessions();
  const head = ["Tanggal", "Topik", "Menit", "Refleksi"];
  const rows = list.map((s) => [s.date, s.topic, s.minutes, s.note || ""].map(q).join(","));
  const csv = "\uFEFF" + [head.map(q).join(","), ...rows].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "belajarlog-" + todayIso() + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- parser CSV standar: kutip ganda, CRLF, BOM ---------- */
function parseCsv(text) {
  text = String(text ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

function normDate(s) {
  const v = String(s ?? "").trim();
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return iso[1] + "-" + pad(Number(iso[2])) + "-" + pad(Number(iso[3]));
  const eu = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (eu) return eu[3] + "-" + pad(Number(eu[2])) + "-" + pad(Number(eu[1]));
  const d = new Date(v);
  if (!isNaN(d)) return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  return "";
}

const keyOf = (s) => [s.date, s.topic, Number(s.minutes), s.note || ""].join("\u0001");

/**
 * Impor isi CSV ke jurnal.
 * @returns {{added:number, skipped:number} | {error:string}}
 */
function importCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "File CSV kosong atau hanya berisi baris judul." };

  const head = rows[0].map((h) => String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  const col = {};
  for (const [field, aliases] of Object.entries(ALIAS)) {
    const i = head.findIndex((h) => aliases.includes(h));
    if (i > -1) col[field] = i;
  }
  const missing = ["date", "topic", "minutes"].filter((f) => col[f] === undefined);
  if (missing.length) {
    return { error: "Kolom wajib tidak ditemukan: " + missing.map((f) => REQUIRED_HUMAN[f]).join(", ") + "." };
  }

  const seen = new Set(sortedSessions().map(keyOf));
  let added = 0;
  let skipped = 0;

  for (const r of rows.slice(1)) {
    const g = (f) => (col[f] === undefined ? "" : String(r[col[f]] ?? "").trim());
    const date = normDate(g("date"));
    const topic = g("topic");
    const minutes = Number(g("minutes").replace(/\s/g, "").replace(",", "."));
    if (!date || !topic || !isFinite(minutes) || minutes <= 0) { skipped++; continue; }

    const session = { date, topic, minutes: Math.round(minutes), note: g("note") };
    const key = keyOf(session);
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);
    addSession(session);
    added++;
  }
  return { added, skipped };
}

/** pasang tombol & file picker ekspor/impor (dipanggil dari main.js) */
function initCsv(render) {
  $("#exportCsv").addEventListener("click", () => exportCsv());

  $("#importCsv").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = ""; // izinkan file yang sama dipilih ulang
    if (!file) return;

    const el = $("#csvNote");
    try {
      const res = importCsv(await file.text());
      el.hidden = false;
      if (res.error) {
        el.className = "form-note neg";
        el.textContent = "⚠️ " + res.error;
        return;
      }
      el.className = "form-note " + (res.added ? "pos" : "neg");
      el.textContent = res.added
        ? "✓ " + res.added + " sesi diimpor" + (res.skipped ? ", " + res.skipped + " baris dilewati/duplikat." : ".")
        : "⚠️ Tidak ada sesi baru: semua sudah ada atau tidak valid.";
      if (res.added && typeof render === "function") render();
    } catch (err) {
      el.hidden = false;
      el.className = "form-note neg";
      el.textContent = "⚠️ Gagal membaca file: " + err.message;
    }
  });
}

export { exportCsv, importCsv, initCsv };
