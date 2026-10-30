/* ============================================================
   BelajarLog — main.js : render ringkasan & daftar sesi,
   form pencatatan, hapus sesi, init.
   ============================================================ */
import {
  load, addSession, removeSession, sortedSessions, summarize,
  isoLocal, dateLabel, minutesLabel, esc
} from "./store.js";

const $ = (s, r = document) => r.querySelector(s);

function render() {
  const list = sortedSessions();
  const sum = summarize(list);

  $("#sumToday").textContent = minutesLabel(sum.menitHariIni);
  $("#sumTodayMeta").textContent = sum.sesiHariIni + " sesi hari ini";
  $("#sumTotal").textContent = minutesLabel(sum.totalMenit);
  $("#sumTotalMeta").textContent = sum.totalSesi + " sesi tercatat";

  const empty = $("#emptyState");
  const rows = $("#sessionList");
  empty.hidden = list.length > 0;
  rows.hidden = list.length === 0;

  rows.innerHTML = list
    .map(
      (s) => `
    <li class="row" data-id="${s.id}">
      <div class="row-main">
        <span class="row-topic">${esc(s.topic)}</span>
        <span class="row-meta">${dateLabel(s.date)} · <b class="num">${minutesLabel(s.minutes)}</b></span>
        ${s.note ? `<p class="row-note">${esc(s.note)}</p>` : ""}
      </div>
      <button type="button" class="btn-ghost danger" data-act="del" data-id="${s.id}">Hapus</button>
    </li>`
    )
    .join("");

  $("#rowCount").textContent = list.length ? list.length + " sesi" : "";
}

/* ---------- form ---------- */
function initForm() {
  const form = $("#sessionForm");
  form.date.value = isoLocal(new Date());

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const topic = form.topic.value.trim();
    const minutes = Number(form.minutes.value);
    if (!topic || !isFinite(minutes) || minutes <= 0) {
      $("#formNote").hidden = false;
      $("#formNote").textContent = "Topik dan durasi (menit > 0) wajib diisi.";
      return;
    }
    $("#formNote").hidden = true;
    addSession({
      date: form.date.value || isoLocal(new Date()),
      topic,
      minutes,
      note: form.note.value.trim()
    });
    form.topic.value = "";
    form.minutes.value = "";
    form.note.value = "";
    form.date.value = isoLocal(new Date());
    form.topic.focus();
    render();
  });
}

/* ---------- hapus (konfirmasi dua langkah, tanpa dialog sistem) ---------- */
function initList() {
  $("#sessionList").addEventListener("click", (e) => {
    const btn = e.target.closest('button[data-act="del"]');
    if (!btn) return;
    if (btn.dataset.armed !== "1") {
      btn.dataset.armed = "1";
      btn.textContent = "Yakin?";
      setTimeout(() => {
        if (btn.isConnected) {
          btn.dataset.armed = "";
          btn.textContent = "Hapus";
        }
      }, 3000);
      return;
    }
    removeSession(btn.dataset.id);
    render();
  });
}

/* ---------- init ---------- */
load();
initForm();
initList();
render();
