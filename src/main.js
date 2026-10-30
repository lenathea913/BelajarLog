/* ============================================================
   BelajarLog · main.js : render ringkasan (termasuk streak &
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
    : list.length ? "streak putus, mulai lagi hari ini" : "belum ada streak";

  const series = dailySeries(list, 7);
  const weekMenit = series.reduce((a, d) => a + d.minutes, 0);
  const hariAktif = series.filter((d) => d.minutes > 0).length;
  $("#sumWeek").textContent = minutesLabel(weekMenit);
  $("#sumWeekMeta").textContent = hariAktif + " hari belajar";

  $("#sumTotal").textContent = minutesLabel(sum.totalMenit);
  $("#sumTotalMeta").textContent = sum.totalSesi + " sesi tercatat";

  renderChart(series, weekMenit);
  renderHeat(list);

  /* daftar sesi */
  const empty = $("#emptyState");
  const rows = $("#sessionList");
  empty.hidden = list.length > 0;
  $("#historyBox").hidden = list.length === 0;

  renderList(list, rows);

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

/**
 * Kalender aktif 53 minggu (≈12 bulan), gaya kontribusi: 7 baris (Sen–Min)
 * × kolom minggu. Sel biru bila pada hari itu ada sesi belajar.
 */
function renderHeat(list) {
  const grid = $("#heatGrid");
  const months = $("#heatMonths");
  if (!grid) return;

  const map = new Map();
  list.forEach((s) => map.set(s.date, (map.get(s.date) || 0) + (Number(s.minutes) || 0)));

  const now = new Date();
  const todayKey = isoLocal(now);
  const dow = (now.getDay() + 6) % 7;                  // 0 = Senin
  const end = new Date(now);
  end.setDate(now.getDate() + (6 - dow));              // Sabtu pekan ini

  // mulai dari Senin pekan yang memuat tanggal 1 sebelas bulan sebelum bulan ini,
  // supaya label bulan selalu jatuh di kolom tanggal 1 dan tidak berdempetan
  const firstOfWindow = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const start = new Date(firstOfWindow);
  start.setDate(firstOfWindow.getDate() - ((firstOfWindow.getDay() + 6) % 7));

  const WEEKS = Math.floor((end - start) / 604800000) + 1;

  const cells = [];
  const labels = [];
  let activeDays = 0;

  /* label bulan: kolom yang memuat tanggal 1 */
  let ly = start.getFullYear();
  let lm = start.getMonth();
  for (let i = 0; i < 24; i++) {
    const first = new Date(ly, lm, 1);
    if (first > now) break; // bulan yang belum dimulai tidak diberi label
    const col = Math.floor((first - start) / 604800000);
    if (col >= 0 && col < WEEKS) {
      labels.push(`<span style="grid-column:${col + 1}">${monthShort(first)}</span>`);
    }
    if (++lm > 11) { lm = 0; ly++; }
  }

  for (let c = 0; c < WEEKS; c++) {
    const week = new Date(start);
    week.setDate(start.getDate() + c * 7);

    for (let r = 0; r < 7; r++) {
      const d = new Date(week);
      d.setDate(week.getDate() + r);
      const key = isoLocal(d);
      const future = key > todayKey;
      const minutes = map.get(key) || 0;
      if (minutes > 0 && !future) activeDays++;

      const cls = [
        "heat-cell",
        minutes ? "on" : "",
        future ? "is-future" : "",
        key === todayKey ? "is-today" : ""
      ].filter(Boolean).join(" ");

      const tip = future
        ? ""
        : ` title="${dateLabel(key)} · ${minutes ? minutesLabel(minutes) : "tidak ada sesi"}"`;
      cells.push(`<span class="${cls}"${tip}></span>`);
    }
  }

  grid.innerHTML = cells.join("");
  months.innerHTML = labels.join("");
  grid.setAttribute(
    "aria-label",
    `Kalender aktif 12 bulan terakhir, ${activeDays} hari belajar tercatat`
  );
  $("#heatHint").textContent = list.length
    ? `${activeDays} hari aktif · 12 bulan terakhir`
    : "Belum ada sesi tercatat";
}

const monthShort = (d) =>
  new Intl.DateTimeFormat("id-ID", { month: "short" }).format(d).replace(".", "");

/* ---------- daftar riwayat: per bulan, 10 baris pertama ---------- */
const PAGE = 10;
const monthKeyOf = (iso) => (iso || "").slice(0, 7);
const monthLabel = (key) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(key + "-01"));

/* status tampilan — sengaja di memori saja (bukan localStorage) */
const expandedMonth = new Set(); // bulan yang menampilkan semua baris (tanpa batas PAGE)
let selectedMonth = null; // bulan yang sedang dibuka di riwayat
let monthKeys = []; // semua kunci bulan, terbaru dulu
let monthTotal = new Map(); // kunci → { count, menit }

function rowHtml(s) {
  return `
    <li class="row" data-id="${s.id}">
      <div class="row-main">
        <span class="row-topic">${esc(s.topic)}</span>
        <span class="row-meta">${dateLabel(s.date)} · <b class="num">${minutesLabel(s.minutes)}</b></span>
        ${s.note ? `<p class="row-note">${esc(s.note)}</p>` : ""}
      </div>
      <button type="button" class="btn-ghost danger" data-act="del" data-id="${s.id}">Hapus</button>
    </li>`;
}

/** sidebar bulan di kiri + daftar sesi bulan terpilih di kanan */
function renderList(list, host) {
  const groups = new Map();
  list.forEach((s) => {
    const k = monthKeyOf(s.date);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  });

  monthKeys = [...groups.keys()]; // list urut terbaru → yang pertama duluan
  monthTotal = new Map(
    monthKeys.map((k) => [
      k,
      {
        count: groups.get(k).length,
        menit: groups.get(k).reduce((a, s) => a + (Number(s.minutes) || 0), 0)
      }
    ])
  );
  // bulan terpilih masih ada → dipakai; kalau tidak (terhapus/habis) → bulan terbaru
  if (!selectedMonth || !groups.has(selectedMonth)) selectedMonth = monthKeys[0] || null;

  const nav = $("#monthList");
  nav.innerHTML = monthKeys
    .map((k) => {
      const t = monthTotal.get(k);
      const on = k === selectedMonth;
      return `<button type="button" class="month-btn${on ? " on" : ""}" data-key="${k}" aria-pressed="${on}">
        <span class="month-name">${monthLabel(k)}</span>
        <span class="month-meta">${t.count} sesi · ${minutesLabel(t.menit)}</span>
      </button>`;
    })
    .join("");

  const items = groups.get(selectedMonth) || [];
  const all = !!selectedMonth && expandedMonth.has(selectedMonth);
  const shown = all ? items : items.slice(0, PAGE);
  const rest = items.length - shown.length;

  let more = "";
  if (rest > 0) {
    more = `<div class="more-wrap"><button type="button" class="btn-ghost" data-act="more" data-key="${selectedMonth}">Tampilkan ${rest} sesi lainnya</button></div>`;
  } else if (all && items.length > PAGE) {
    more = `<div class="more-wrap"><button type="button" class="btn-ghost" data-act="less" data-key="${selectedMonth}">Tampilkan ${PAGE} saja</button></div>`;
  }

  host.innerHTML = `<ul class="list">${shown.map(rowHtml).join("")}</ul>` + more;
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
  /* sidebar bulan */
  $("#monthList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-key]");
    if (!btn) return;
    selectedMonth = btn.dataset.key;
    render();
  });

  $("#sessionList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;

    const act = btn.dataset.act;
    if (act === "more" || act === "less") {
      if (act === "more") expandedMonth.add(btn.dataset.key);
      else expandedMonth.delete(btn.dataset.key);
      render();
      return;
    }
    if (act !== "del") return;

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
