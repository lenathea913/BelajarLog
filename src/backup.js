/* ============================================================
   BelajarLog — backup.js : Backup & Pulihkan file JSON.
   Unduh seluruh jurnal sebagai belajarlog-backup-YYYY-MM-DD.json,
   atau pulihkan dari file cadangan — isi file DIGABUNGKAN dengan
   jurnal saat ini (data lama tidak hilang).
   ============================================================ */
import { $, sortedSessions, restoreSessions } from "./store.js";

const pad = (n) => String(n).padStart(2, "0");

function payload() {
  return { app: "belajarlog", version: 1, sessions: sortedSessions() };
}

function backupName() {
  const d = new Date();
  return "belajarlog-backup-" + d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + ".json";
}

function note(type, text) {
  const el = $("#backupNote");
  if (!el) return;
  el.hidden = false;
  el.className = "form-note " + type;
  el.textContent = (type === "ok" ? "✓ " : "⚠️ ") + text;
}

/** unduh seluruh jurnal sebagai file JSON */
function download() {
  try {
    const blob = new Blob([JSON.stringify(payload(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    note("ok", "File backup berhasil diunduh (" + backupName() + ").");
  } catch (e) {
    note("err", "Gagal membuat file backup.");
  }
}

/** validasi minimum: file berisi minimal satu sesi yang dikenali */
function looksLikeBackup(data) {
  if (Array.isArray(data)) return data.some((s) => s && s.id && s.date && s.topic);
  if (data && typeof data === "object") return Array.isArray(data.sessions) && data.sessions.some((s) => s && s.id && s.date && s.topic);
  return false;
}

async function onFile(ev, render) {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = ""; // izinkan file yang sama dipilih ulang
  if (!file) return;

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (e) {
    note("err", "File tidak dikenali sebagai backup BelajarLog.");
    return;
  }
  if (!looksLikeBackup(data)) {
    note("err", "File tidak dikenali sebagai backup BelajarLog.");
    return;
  }

  const list = Array.isArray(data) ? data : data.sessions;
  const res = restoreSessions(list);
  if (!res.ok) {
    note("err", "File tidak dikenali sebagai backup BelajarLog.");
    return;
  }
  if (typeof render === "function") render();
  note("ok", res.added > 0
    ? "Backup dipulihkan (+" + res.added + " sesi baru)."
    : "Backup dipulihkan — tidak ada sesi baru, semua sudah ada.");
}

/** pasang handler tombol Backup & Pulihkan (dipanggil dari main.js) */
export function initBackup(render) {
  $("#backupBtn").addEventListener("click", download);
  $("#restoreBtn").addEventListener("click", () => $("#restoreFile").click());
  $("#restoreFile").addEventListener("change", (ev) => onFile(ev, render));
}
