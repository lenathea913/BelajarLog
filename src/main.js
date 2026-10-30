/* ============================================================
   BelajarLog — main.js : render ringkasan (termasuk streak &
   grafik 7 hari), form pencatatan, hapus sesi, ekspor/impor
   CSV, backup/pulihkan JSON, init.
   ============================================================ */
import {
  $, load, addSession, removeSession, sortedSessions, summarize,
  computeStreak, dailySeries, isoLocal, dateLabel, dayLabel, minutesLabel, esc
} from "./store.js";
import { initCsv } from "./csv.js";
import { initBackup } from "./backup.js";

const pad = (n) => String(n).padStart(2, "0");

function render() {
  const list = sortedSessions();
  const sum = summarize(list);

  /* kartu ringkasan */
  $("#sumToday").textContent = minutesLabel(sum.menitHariIni);
  $("#sumTodayMeta").textContent = sum.sesiHariIni + " sesi hari ini";

  const streak = computeStreak(list);
  $("#sumStreak").textContent = streak ? streak + " hari" : "0 hari";
  $("#sumStreakMeta").textContent = streak
    ? "hari beruntun"
    : list.length ? "streak putus — mulai lagi hari ini" : "belum ada streak";

  const series = dailySeries(list, 7);
  const weekMenit = series.reduce((a, d) => a + d.minutes, 0);
  const hariAktif = series.filter((d) => d.minutes > 0).length;
  $("#sumWeek").textContent = minutesLabel(weekMenit);
  $("#sumWeekMeta").textContent = hariAktif + " hari belajar";

  $("#sumTotal").textContent = minutesLabel(sum.totalMenit);
  $("#sumTotalMeta").textContent = sum.totalSesi + " sesi tercatat";

  renderChart(series, weekMenit);

  /* daftar sesi */
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
  $("#exportCsv").disabled = list.length === 0;
}

/** batang durasi per hari; tinggi sebanding menit, hari tanpa sesi tetap terlihat */
function renderChart(series, weekMenit) {
  const chart = $("#weekChart");
  const max = Math.max(...series.map((d) => d.minutes), 1);

  $("#weekHint").textContent = weekMenit
    ? `${minutesLabel(weekMenit)} total · ${series.filter((d) => d.minutes > 0).length}/7 hari aktif`
    : "Belum ada sesi dalam 7 hari terakhir";

  chart.innerHTML = series
    .map((d) => {
      const h = d.minutes > 0 ? Math.max(4, (d.minutes / max) * 100) : 0;
      const today = d.date === isoLocal(new Date()) ? " is-today" : "";
      return `<div class="bar-col${today}">
        <span class="bar-val num">${d.minutes ? minutesLabel(d.minutes) : ""}</span>
        <span class="bar${d.minutes ? " on" : ""}" style="height:${h.toFixed(1)}%"
              title="${dateLabel(d.date)} · ${d.minutes ? minutesLabel(d.minutes) : "tidak ada sesi"}"></span>
        <span class="bar-day">${dayLabel(d.date)}</span>
      </div>`;
    })
    .join("");
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
      minutes: Math.round(minutes),
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
initCsv(render);
initBackup(render);
render();
