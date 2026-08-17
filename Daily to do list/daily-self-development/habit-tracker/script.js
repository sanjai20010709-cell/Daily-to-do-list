/* ==========================================================================
   Daily Self Development — script.js
   A dependency-free vanilla JS app. Everything is organised into small
   sections below: constants, storage, date helpers, calculations, and
   then one render function per tab.
   ========================================================================== */

/* ---------------------------------- Constants ---------------------------------- */

const STORAGE_KEY = "dsd_daily_data";      // { "2026-08-17": DayData, ... }
const THEME_KEY = "dsd_theme";              // "light" | "dark"
const WEEKLY_REPORTS_KEY = "dsd_weekly_reports"; // { "2026-08-10": ReportSnapshot }

const ACTIVITIES = [
  { id: "meditation", name: "Meditation", icon: "🧘", detailLabel: "Duration", detailPlaceholder: "e.g. 15 minutes" },
  { id: "gym", name: "Gym", icon: "🏋️", detailLabel: "Workout", detailPlaceholder: "e.g. Chest + triceps", sundaySkip: true },
  { id: "healthyBreakfast", name: "Healthy Breakfast", icon: "🥗", detailLabel: "What you ate", detailPlaceholder: "e.g. Oats + fruit" },
  { id: "walking", name: "Walking", icon: "🚶", detailLabel: "Distance", detailPlaceholder: "e.g. 4.2 km" },
  { id: "readBook", name: "Read a Book", icon: "📖", detailLabel: "Book & pages", detailPlaceholder: "e.g. Atomic Habits — 12 pages" },
  { id: "selfVideo", name: "Self Video – Explain What I Read", icon: "🎥", detailLabel: "Topic", detailPlaceholder: "e.g. Habit stacking" },
  { id: "earlySleep", name: "Early Sleep", icon: "😴", detailLabel: "Bedtime", detailPlaceholder: "e.g. 10:30 PM" },
];

const MOTIVATION_STEPS = [
  { min: 0, max: 0, text: "Start with one. You don\u2019t need to complete everything at once." },
  { min: 1, max: 2, text: "You\u2019ve started \u2014 nice. Keep the momentum going." },
  { min: 3, max: 5, text: "You\u2019re making progress. Keep going." },
  { min: 6, max: 6, text: "Almost there! Finish strong." },
];

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ---------------------------------- Date helpers ---------------------------------- */

// Local YYYY-MM-DD key (never UTC, so it matches the user's own calendar day).
function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayKey() {
  return dateKey(new Date());
}

function isSundayKey(key) {
  return keyToDate(key).getDay() === 0;
}

function addDays(date, n) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function isConsecutiveDay(earlierKey, laterKey) {
  const diff = (keyToDate(laterKey) - keyToDate(earlierKey)) / 86400000;
  return diff === 1;
}

function formatLongDate(date) {
  return date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatShortDate(key) {
  return keyToDate(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Monday-Sunday week containing `date` (Sunday is the closing day).
function getWeekStart(date) {
  const day = date.getDay(); // 0 = Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = addDays(date, diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/* ---------------------------------- Storage ---------------------------------- */

function loadAllData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to read saved data, starting fresh.", e);
    return {};
  }
}

function saveAllData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function emptyDayData() {
  const activities = {};
  const details = {};
  ACTIVITIES.forEach((a) => { activities[a.id] = false; details[a.id] = ""; });
  return { activities, details, notes: "" };
}

// Returns the stored day (without persisting a blank shell just for reading).
function getDayData(key) {
  const data = loadAllData();
  return data[key] ? data[key] : emptyDayData();
}

function saveDayData(key, dayData) {
  const data = loadAllData();
  data[key] = dayData;
  saveAllData(data);
}

function loadWeeklyReports() {
  try {
    const raw = localStorage.getItem(WEEKLY_REPORTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveWeeklyReport(weekStartKey, report) {
  const reports = loadWeeklyReports();
  reports[weekStartKey] = report;
  localStorage.setItem(WEEKLY_REPORTS_KEY, JSON.stringify(reports));
}

/* ---------------------------------- Calculations ---------------------------------- */

function applicableActivitiesForKey(key) {
  const sunday = isSundayKey(key);
  return ACTIVITIES.filter((a) => !(sunday && a.sundaySkip));
}

function calcProgress(key, dayData) {
  const applicable = applicableActivitiesForKey(key);
  const completed = applicable.filter((a) => dayData.activities[a.id]).length;
  const total = applicable.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, pct, isPerfect: total > 0 && completed === total };
}

function calcStreaks(allData) {
  const keys = Object.keys(allData).sort(); // ascending
  const successful = {};
  keys.forEach((k) => {
    const { isPerfect } = calcProgress(k, allData[k]);
    successful[k] = isPerfect;
  });

  // Best streak: longest run of consecutive calendar days, all successful.
  let best = 0, run = 0, prevKey = null;
  keys.forEach((k) => {
    if (successful[k]) {
      run = prevKey && isConsecutiveDay(prevKey, k) ? run + 1 : 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    prevKey = k;
  });

  // Current streak: walk backwards from today. If today isn't finished yet,
  // start counting from yesterday so an in-progress day doesn't zero it out.
  let current = 0;
  let cursor = new Date();
  if (!successful[dateKey(cursor)]) cursor = addDays(cursor, -1);
  while (successful[dateKey(cursor)]) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, best };
}

function calcAllTimeStats(allData) {
  const keys = Object.keys(allData);
  let totalActivities = 0;
  let perfectDays = 0;
  keys.forEach((k) => {
    const { completed, isPerfect } = calcProgress(k, allData[k]);
    totalActivities += completed;
    if (isPerfect) perfectDays += 1;
  });
  return { totalActivities, perfectDays };
}

function buildWeekReport(weekStartDate, allData) {
  const days = [];
  for (let i = 0; i < 7; i++) days.push(dateKey(addDays(weekStartDate, i)));

  let totalCompleted = 0, totalPossible = 0, perfectDays = 0;
  const perActivityCompleted = {};
  const perActivityPossible = {};
  ACTIVITIES.forEach((a) => { perActivityCompleted[a.id] = 0; perActivityPossible[a.id] = 0; });
  const dayBreakdown = [];
  const notes = [];

  days.forEach((key) => {
    const dayData = allData[key];
    const applicable = applicableActivitiesForKey(key);
    const hasData = !!dayData;
    const progress = hasData ? calcProgress(key, dayData) : { completed: 0, total: applicable.length, pct: 0, isPerfect: false };

    totalCompleted += progress.completed;
    totalPossible += progress.total;
    if (hasData && progress.isPerfect) perfectDays += 1;

    applicable.forEach((a) => {
      perActivityPossible[a.id] += 1;
      if (hasData && dayData.activities[a.id]) perActivityCompleted[a.id] += 1;
    });

    dayBreakdown.push({ key, completed: progress.completed, total: progress.total, pct: progress.pct, hasData });

    if (hasData && dayData.notes && dayData.notes.trim()) {
      notes.push({ key, text: dayData.notes.trim() });
    }
  });

  const avgCompletion = totalPossible === 0 ? 0 : Math.round((totalCompleted / totalPossible) * 100);

  const activityRates = ACTIVITIES.map((a) => ({
    id: a.id,
    name: a.name,
    pct: perActivityPossible[a.id] === 0 ? 0 : Math.round((perActivityCompleted[a.id] / perActivityPossible[a.id]) * 100),
  }));

  const strongest = [...activityRates].sort((a, b) => b.pct - a.pct)[0];
  const weakest = [...activityRates].sort((a, b) => a.pct - b.pct)[0];

  return {
    weekStart: dateKey(weekStartDate),
    weekEnd: days[6],
    totalCompleted,
    totalPossible,
    avgCompletion,
    perfectDays,
    activityRates,
    dayBreakdown,
    notes,
    strongest,
    weakest,
  };
}

/* ---------------------------------- App state ---------------------------------- */

const state = {
  activeTab: "today",
  historySelectedKey: null,
  statsWeekStart: getWeekStart(new Date()),
};

/* ---------------------------------- Theme ---------------------------------- */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("themeIcon").textContent = theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || "light";
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}

/* ---------------------------------- Tabs ---------------------------------- */

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.hidden = view.dataset.view !== tab;
  });
  if (tab === "history") renderHistory();
  if (tab === "statistics") renderStatistics();
}

/* ---------------------------------- Render: Today ---------------------------------- */

function renderHeader() {
  document.getElementById("headerDate").textContent = formatLongDate(new Date());
}

function motivationFor(completed) {
  const step = MOTIVATION_STEPS.slice().reverse().find((s) => completed >= s.min);
  return step ? step.text : MOTIVATION_STEPS[0].text;
}

function renderToday() {
  const key = todayKey();
  const dayData = getDayData(key);
  const applicable = applicableActivitiesForKey(key);
  const { completed, total, pct, isPerfect } = calcProgress(key, dayData);

  document.getElementById("progressCompleted").textContent = completed;
  document.getElementById("progressTotal").textContent = total;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressBar").setAttribute("aria-valuenow", String(pct));

  const sunday = isSundayKey(key);
  document.getElementById("sundayNote").hidden = !sunday;

  const motivationEl = document.getElementById("progressMotivation");
  const celebrationEl = document.getElementById("celebrationMsg");
  if (isPerfect) {
    motivationEl.hidden = true;
    celebrationEl.hidden = false;
  } else {
    motivationEl.hidden = false;
    celebrationEl.hidden = true;
    motivationEl.textContent = motivationFor(completed);
  }

  const allData = loadAllData();
  const { current } = calcStreaks(allData);
  document.getElementById("currentStreakValue").textContent = current;

  renderChecklist(key, dayData, applicable);

  document.getElementById("notesArea").value = dayData.notes || "";
}

function renderChecklist(key, dayData, applicable) {
  const list = document.getElementById("checklist");
  list.innerHTML = "";

  ACTIVITIES.forEach((activity) => {
    const isApplicable = applicable.some((a) => a.id === activity.id);
    const done = !!dayData.activities[activity.id];

    const li = document.createElement("li");
    li.className = "checklist-item";
    if (done) li.classList.add("is-done");
    if (!isApplicable) li.classList.add("is-skipped");

    const stampBtn = document.createElement("button");
    stampBtn.type = "button";
    stampBtn.className = "check-stamp";
    stampBtn.setAttribute("aria-label", `Mark ${activity.name} as ${done ? "not done" : "done"}`);
    stampBtn.disabled = !isApplicable;
    stampBtn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="4,13 9,18 20,6"/></svg>';
    if (isApplicable) {
      stampBtn.addEventListener("click", () => toggleActivity(key, activity.id));
    }

    const body = document.createElement("div");
    body.className = "item-body";

    const mainRow = document.createElement("div");
    mainRow.className = "item-main-row";

    const iconSpan = document.createElement("span");
    iconSpan.className = "item-icon";
    iconSpan.textContent = activity.icon;

    const nameSpan = document.createElement("span");
    nameSpan.className = "item-name";
    nameSpan.textContent = isApplicable ? activity.name : `${activity.name} — Rest Day, Skipped`;

    mainRow.appendChild(iconSpan);
    mainRow.appendChild(nameSpan);

    if (isApplicable) {
      const detailToggle = document.createElement("button");
      detailToggle.type = "button";
      detailToggle.className = "detail-toggle";
      const existingDetail = dayData.details && dayData.details[activity.id];
      detailToggle.textContent = existingDetail ? "Edit detail" : "+ Add detail";
      detailToggle.addEventListener("click", () => {
        const row = body.querySelector(".detail-row");
        row.classList.toggle("is-open");
        if (row.classList.contains("is-open")) row.querySelector("input").focus();
      });
      mainRow.appendChild(detailToggle);
    }

    body.appendChild(mainRow);

    if (isApplicable) {
      const detailRow = document.createElement("div");
      detailRow.className = "detail-row";
      const existingDetail = (dayData.details && dayData.details[activity.id]) || "";
      if (existingDetail) detailRow.classList.add("is-open");

      const input = document.createElement("input");
      input.type = "text";
      input.className = "detail-input";
      input.placeholder = `${activity.detailLabel} \u2014 ${activity.detailPlaceholder}`;
      input.value = existingDetail;
      input.addEventListener("change", () => saveActivityDetail(key, activity.id, input.value));
      input.addEventListener("blur", () => saveActivityDetail(key, activity.id, input.value));

      detailRow.appendChild(input);
      body.appendChild(detailRow);
    }

    li.appendChild(stampBtn);
    li.appendChild(body);
    list.appendChild(li);
  });
}

function toggleActivity(key, activityId) {
  const data = loadAllData();
  const dayData = data[key] ? data[key] : emptyDayData();
  dayData.activities[activityId] = !dayData.activities[activityId];
  data[key] = dayData;
  saveAllData(data);
  renderToday();
  maybeRefreshWeeklyReport(key);
}

function saveActivityDetail(key, activityId, value) {
  const data = loadAllData();
  const dayData = data[key] ? data[key] : emptyDayData();
  if (!dayData.details) dayData.details = {};
  dayData.details[activityId] = value;
  data[key] = dayData;
  saveAllData(data);
}

function saveNotes() {
  const key = todayKey();
  const data = loadAllData();
  const dayData = data[key] ? data[key] : emptyDayData();
  dayData.notes = document.getElementById("notesArea").value;
  data[key] = dayData;
  saveAllData(data);

  const confirmEl = document.getElementById("notesConfirm");
  confirmEl.hidden = false;
  clearTimeout(saveNotes._t);
  saveNotes._t = setTimeout(() => { confirmEl.hidden = true; }, 2400);

  maybeRefreshWeeklyReport(key);
}

// If the edited day falls inside a week that has already closed (i.e. we are
// past that week's Sunday), keep its saved report snapshot in sync.
function maybeRefreshWeeklyReport(editedKey) {
  const weekStart = getWeekStart(keyToDate(editedKey));
  const weekEnd = addDays(weekStart, 6);
  if (weekEnd < new Date(new Date().setHours(0, 0, 0, 0))) {
    const allData = loadAllData();
    const report = buildWeekReport(weekStart, allData);
    saveWeeklyReport(dateKey(weekStart), report);
  }
}

/* ---------------------------------- Render: History ---------------------------------- */

function renderHistory() {
  const allData = loadAllData();
  const keys = Object.keys(allData).sort().reverse();
  const tbody = document.getElementById("historyTableBody");
  tbody.innerHTML = "";

  document.getElementById("historyEmpty").hidden = keys.length > 0;
  document.getElementById("historyDetailCard").hidden = true;

  keys.forEach((key) => {
    const { completed, total, pct, isPerfect } = calcProgress(key, allData[key]);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatShortDate(key)}</td>
      <td>${completed} / ${total}${isPerfect ? '<span class="badge-perfect">Perfect</span>' : ""}</td>
      <td>${pct}%</td>
      <td>${key === todayKey() ? "Today" : ""}</td>
    `;
    tr.addEventListener("click", () => showHistoryDetail(key));
    tbody.appendChild(tr);
  });
}

function showHistoryDetail(key) {
  state.historySelectedKey = key;
  const allData = loadAllData();
  const dayData = allData[key];
  const applicable = applicableActivitiesForKey(key);
  const { completed, total } = calcProgress(key, dayData);

  const card = document.getElementById("historyDetailCard");
  card.hidden = false;
  document.getElementById("historyDetailDate").textContent = formatLongDate(keyToDate(key));
  document.getElementById("historyDetailProgress").textContent = `${completed} / ${total}`;
  document.getElementById("historyDetailNotes").textContent = dayData.notes && dayData.notes.trim() ? dayData.notes : "No notes for this day.";

  const list = document.getElementById("historyDetailChecklist");
  list.innerHTML = "";
  ACTIVITIES.forEach((activity) => {
    const isApplicable = applicable.some((a) => a.id === activity.id);
    const done = !!dayData.activities[activity.id];
    const detail = dayData.details && dayData.details[activity.id];

    const li = document.createElement("li");
    li.className = "checklist-item";
    if (done) li.classList.add("is-done");
    if (!isApplicable) li.classList.add("is-skipped");

    li.innerHTML = `
      <button type="button" class="check-stamp" disabled><svg viewBox="0 0 24 24"><polyline points="4,13 9,18 20,6"/></svg></button>
      <div class="item-body">
        <div class="item-main-row">
          <span class="item-icon">${activity.icon}</span>
          <span class="item-name">${isApplicable ? activity.name : activity.name + " — Rest Day, Skipped"}</span>
        </div>
        ${detail ? `<p class="detail-saved-text">${activity.detailLabel}: ${escapeHtml(detail)}</p>` : ""}
      </div>
    `;
    list.appendChild(li);
  });

  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------------------------- Render: Statistics ---------------------------------- */

function renderStatistics() {
  const allData = loadAllData();
  const streaks = calcStreaks(allData);
  const allTime = calcAllTimeStats(allData);

  document.getElementById("statCurrentStreak").textContent = streaks.current;
  document.getElementById("statBestStreak").textContent = streaks.best;
  document.getElementById("statPerfectDays").textContent = allTime.perfectDays;
  document.getElementById("statTotalActivities").textContent = allTime.totalActivities;

  renderWeekReport(allData);
  renderMonthSummary(allData);
}

function renderWeekReport(allData) {
  const weekStart = state.statsWeekStart;
  const report = buildWeekReport(weekStart, allData);
  const isCurrentWeek = dateKey(weekStart) === dateKey(getWeekStart(new Date()));

  document.getElementById("weekRangeLabel").textContent = isCurrentWeek
    ? "This week"
    : `${formatShortDate(report.weekStart)} \u2013 ${formatShortDate(report.weekEnd)}`;

  document.getElementById("weekActivities").textContent = `${report.totalCompleted} / ${report.totalPossible}`;
  document.getElementById("weekAverage").textContent = `${report.avgCompletion}%`;
  document.getElementById("weekPerfectDays").textContent = report.perfectDays;

  // Day-by-day bars
  const daysEl = document.getElementById("weekDaysBreakdown");
  daysEl.innerHTML = "";
  const todayK = todayKey();
  report.dayBreakdown.forEach((day) => {
    const col = document.createElement("div");
    col.className = "week-day-col";
    if (day.key === todayK) col.classList.add("is-today");
    if (keyToDate(day.key) > new Date()) col.classList.add("is-future");

    const track = document.createElement("div");
    track.className = "week-day-track";
    const fill = document.createElement("div");
    fill.className = "week-day-fill";
    fill.style.height = day.hasData ? `${Math.max(day.pct, day.pct > 0 ? 6 : 0)}%` : "0%";
    track.appendChild(fill);

    const label = document.createElement("div");
    label.className = "week-day-label";
    label.textContent = DAY_NAMES_SHORT[keyToDate(day.key).getDay()];

    col.appendChild(track);
    col.appendChild(label);
    daysEl.appendChild(col);
  });

  // Per-activity completion rates
  const ratesEl = document.getElementById("weekActivityRates");
  ratesEl.innerHTML = "";
  report.activityRates.forEach((rate) => {
    const row = document.createElement("div");
    row.className = "activity-rate-row";
    row.innerHTML = `
      <span class="activity-rate-name">${rate.name}</span>
      <span class="activity-rate-track"><span class="activity-rate-fill" style="width:${rate.pct}%"></span></span>
      <span class="activity-rate-pct">${rate.pct}%</span>
    `;
    ratesEl.appendChild(row);
  });

  // Notes
  const notesEl = document.getElementById("weekNotesList");
  notesEl.innerHTML = "";
  if (report.notes.length === 0) {
    notesEl.innerHTML = '<p class="empty-note">No notes logged this week yet.</p>';
  } else {
    report.notes.forEach((n) => {
      const item = document.createElement("div");
      item.className = "week-note-item";
      item.innerHTML = `<p class="week-note-date">${formatShortDate(n.key)}</p><p class="week-note-text">${escapeHtml(n.text)}</p>`;
      notesEl.appendChild(item);
    });
  }

  // Summary sentence
  const summaryEl = document.getElementById("weekSummaryText");
  if (report.totalPossible === 0) {
    summaryEl.textContent = "No data logged for this week yet.";
  } else {
    const strongText = report.strongest && report.strongest.pct > 0
      ? `${report.strongest.name} was your strongest habit at ${report.strongest.pct}%.`
      : "";
    const weakText = report.weakest && report.weakest.pct < 100
      ? ` ${report.weakest.name} slipped the most, at ${report.weakest.pct}%.`
      : "";
    summaryEl.textContent = `You completed ${report.avgCompletion}% of your routine on average, with ${report.perfectDays} perfect day${report.perfectDays === 1 ? "" : "s"}. ${strongText}${weakText}`.trim();
  }

  if (weekEnd(weekStart) < new Date(new Date().setHours(0, 0, 0, 0))) {
    saveWeeklyReport(dateKey(weekStart), report);
  }
}

function weekEnd(weekStart) {
  return addDays(weekStart, 6);
}

function renderMonthSummary(allData) {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const keysThisMonth = Object.keys(allData).filter((k) => k.startsWith(monthPrefix));

  let completed = 0, possible = 0, perfectDays = 0;
  keysThisMonth.forEach((k) => {
    const p = calcProgress(k, allData[k]);
    completed += p.completed;
    possible += p.total;
    if (p.isPerfect) perfectDays += 1;
  });
  const avg = possible === 0 ? 0 : Math.round((completed / possible) * 100);

  document.getElementById("monthActivities").textContent = `${completed} / ${possible}`;
  document.getElementById("monthAverage").textContent = `${avg}%`;
  document.getElementById("monthPerfectDays").textContent = perfectDays;
}

/* ---------------------------------- Settings: export / import / clear ---------------------------------- */

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    dailyData: loadAllData(),
    weeklyReports: loadWeeklyReports(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daily-self-development-export-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showSettingsConfirm("Export downloaded.");
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const daily = parsed.dailyData || parsed; // allow importing a raw dailyData object too
      if (typeof daily !== "object" || daily === null) throw new Error("Invalid file");
      saveAllData({ ...loadAllData(), ...daily });
      if (parsed.weeklyReports) {
        localStorage.setItem(WEEKLY_REPORTS_KEY, JSON.stringify({ ...loadWeeklyReports(), ...parsed.weeklyReports }));
      }
      showSettingsConfirm("Data imported successfully.");
      renderToday();
    } catch (e) {
      showSettingsConfirm("Import failed \u2014 that doesn\u2019t look like a valid export file.");
    }
  };
  reader.readAsText(file);
}

function showSettingsConfirm(msg) {
  const el = document.getElementById("settingsConfirm");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showSettingsConfirm._t);
  showSettingsConfirm._t = setTimeout(() => { el.hidden = true; }, 3200);
}

/* ---------------------------------- Confirmation dialog ---------------------------------- */

function askConfirm(message, onConfirm) {
  const overlay = document.getElementById("dialogOverlay");
  document.getElementById("dialogMessage").textContent = message;
  overlay.hidden = false;

  const cleanup = () => {
    overlay.hidden = true;
    confirmBtn.removeEventListener("click", onConfirmHandler);
    cancelBtn.removeEventListener("click", onCancelHandler);
  };
  const confirmBtn = document.getElementById("dialogConfirm");
  const cancelBtn = document.getElementById("dialogCancel");
  const onConfirmHandler = () => { cleanup(); onConfirm(); };
  const onCancelHandler = () => cleanup();

  confirmBtn.addEventListener("click", onConfirmHandler);
  cancelBtn.addEventListener("click", onCancelHandler);
}

/* ---------------------------------- Init & event wiring ---------------------------------- */

function init() {
  initTheme();
  renderHeader();
  renderToday();

  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("settingsThemeToggle").addEventListener("click", toggleTheme);

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.getElementById("saveNotesBtn").addEventListener("click", saveNotes);

  document.getElementById("closeHistoryDetail").addEventListener("click", () => {
    document.getElementById("historyDetailCard").hidden = true;
  });

  document.getElementById("prevWeekBtn").addEventListener("click", () => {
    state.statsWeekStart = addDays(state.statsWeekStart, -7);
    renderStatistics();
  });
  document.getElementById("nextWeekBtn").addEventListener("click", () => {
    const next = addDays(state.statsWeekStart, 7);
    if (next <= getWeekStart(new Date())) {
      state.statsWeekStart = next;
      renderStatistics();
    }
  });

  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("importInput").addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
    e.target.value = "";
  });
  document.getElementById("clearDataBtn").addEventListener("click", () => {
    askConfirm("Are you sure? This will permanently delete all your saved daily records.", () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(WEEKLY_REPORTS_KEY);
      renderToday();
      showSettingsConfirm("All data cleared.");
    });
  });

  // Keep the app correct if the tab is left open across midnight.
  setInterval(() => {
    if (state.activeTab === "today") {
      const headerDateText = document.getElementById("headerDate").textContent;
      if (headerDateText !== formatLongDate(new Date())) {
        renderHeader();
        renderToday();
      }
    }
  }, 30000);
}

document.addEventListener("DOMContentLoaded", init);
