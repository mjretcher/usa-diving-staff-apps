(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function state() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return parsed?.schedule || parsed;
    } catch (error) {
      return null;
    }
  }

  function publicNote(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const generatedPatterns = [
      /junior nationals assigned (practice|group warm-up):?\s*(west|central|east)?/i,
      /restored on shifted final junior competition day/i,
      /restored from proposed junior nationals schedule/i,
      /revised to \d+ minutes per user request/i,
      /recovered time moved/i,
      /working draft/i,
      /safety shifted/i,
      /shift required because/i,
      /starts? 5 minutes after/i,
      /session moved \d+ minutes earlier/i,
      /existing final time window retained/i,
      /final dive count adjusted/i,
      /optional-only/i,
      /labeled separately from individual events/i,
      /modeled from 2025/i,
      /added in v\d+/i,
    ];

    const kept = raw
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .filter((sentence) => !generatedPatterns.some((pattern) => pattern.test(sentence)));

    const cleaned = kept.join(" ").trim();
    if (!cleaned) return "";
    if (/^(restricted|note|public note|restriction|pool closed|platform closed|boards restricted|open to|closed to)\b/i.test(cleaned)) return cleaned;
    if (!generatedPatterns.some((pattern) => pattern.test(raw))) return cleaned;
    return "";
  }

  function time(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const hour24 = Math.floor(total / 60) % 24;
    const minute = total % 60;
    const hour = hour24 % 12 || 12;
    return `${hour}:${String(minute).padStart(2, "0")} ${hour24 >= 12 ? "PM" : "AM"}`;
  }

  function dateLabel(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function isPractice(session) {
    return Boolean(session?.isOpenPracticeSession || session?.autoTrainingForDayId);
  }

  function isCompetition(event) {
    return ["Qualifier", "Prelim", "Semifinal", "Final"].includes(String(event?.round || ""));
  }

  function eventName(event) {
    const display = String(event?.display || "").trim();
    if (display) return display;
    return `${event?.level || ""} ${event?.gender || ""} ${event?.apparatus || ""}`.replace(/\s+/g, " ").trim() || "Schedule block";
  }

  function eventDuration(event) {
    if (!isCompetition(event) && Number(event?.customDurationMinutes || 0) > 0) return Number(event.customDurationMinutes || 0);
    return (Math.max(0, Number(event?.numberOfDivers || 0)) * Math.max(0, Number(event?.numberOfDives || 0)) * Math.max(0, Number(event?.secondsPerDive || 0))) / 60;
  }

  function sessionEnd(session) {
    if (isPractice(session)) return Number(session.warmupStartMinutes || 0) + Number(session.events?.[0]?.customDurationMinutes || 0);
    const start = Number(session.warmupStartMinutes || 0);
    const warmup = Number(session.warmupMinutes || 0);
    const buffer = Number(session.transitionBufferMinutes || 0);
    const eventStart = start + warmup + buffer;
    const longest = (session.events || []).reduce((max, event) => Math.max(max, eventDuration(event)), 0);
    const awards = (session.events || []).some((event) => event.round === "Final") && session.awardsEnabled !== false ? 15 : 0;
    return eventStart + longest + awards;
  }

  function renderSession(session, index) {
    const start = Number(session.warmupStartMinutes || 0);
    const end = sessionEnd(session);
    const title = session.title && !/^session$/i.test(session.title) ? session.title : isPractice(session) ? "Open Practice / Training" : `Session ${index + 1}`;
    if (isPractice(session)) {
      const note = publicNote(session.events?.[0]?.notes || "");
      return `<article class="practice"><b>${esc(time(start))}-${esc(time(end))}</b><div><strong>${esc(title)}</strong>${note ? `<p>${esc(note)}</p>` : ""}</div></article>`;
    }
    const warmupEnd = start + Number(session.warmupMinutes || 0) + Number(session.transitionBufferMinutes || 0);
    const rows = (session.events || []).map((event) => `<tr><td>${esc(eventName(event))}</td><td>${esc(event.style || "")} ${esc(event.round || "")}</td><td>${Math.round(eventDuration(event))} min</td></tr>`).join("");
    return `<article class="competition"><b>${esc(time(start))}-${esc(time(end))}</b><div><strong>${esc(title)}</strong><p>Warm-up: ${esc(time(start))}-${esc(time(warmupEnd))}</p><table>${rows}</table></div></article>`;
  }

  function buildHtml(schedule) {
    const days = schedule?.meet?.days || [];
    const sessions = schedule?.sessions || [];
    const dayHtml = days.map((day) => {
      const list = sessions.filter((session) => session.dayId === day.id).sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));
      if (!list.length) return "";
      return `<section><h2>${esc(dateLabel(day.date))}</h2>${list.map(renderSession).join("")}</section>`;
    }).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(schedule?.meet?.name || "Schedule")}</title><style>body{font-family:Arial,sans-serif;margin:0;color:#171F69}.toolbar{position:sticky;top:0;background:white;border-bottom:1px solid #ddd;padding:12px 18px;display:flex;justify-content:space-between}.toolbar button{background:#171F69;color:white;border:0;border-radius:999px;padding:10px 16px;font-weight:700}.page{max-width:960px;margin:0 auto;padding:28px}header{border-bottom:5px solid #171F69;margin-bottom:22px}h1{margin:0 0 8px}h2{background:#171F69;color:white;padding:8px 10px;font-size:16px}article{display:grid;grid-template-columns:145px 1fr;gap:12px;border-bottom:1px solid #dbe7f3;padding:9px 0;break-inside:avoid}.practice div{background:#EEF6FC;border-left:4px solid #009AC7;padding:8px}p{margin:4px 0;color:#5F6062;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px}td{border-top:1px solid #eef3f8;padding:5px}@media print{.toolbar{display:none}.page{max-width:none;padding:.35in}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="toolbar"><strong>PDF Print View</strong><button onclick="window.print()">Print / Save as PDF</button></div><main class="page"><header><h1>${esc(schedule?.meet?.name || "Public Schedule")}</h1><p>${esc(schedule?.meet?.venue || "")}</p></header>${dayHtml || "<p>No schedule blocks available.</p>"}</main></body></html>`;
  }

  function openPdfPrintView() {
    const schedule = state();
    if (!schedule?.meet || !Array.isArray(schedule.sessions)) {
      alert("No schedule is loaded to print.");
      return;
    }
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) {
      alert("The print window was blocked. Please allow pop-ups for this site and click PDF again.");
      return;
    }
    win.document.open();
    win.document.write(buildHtml(schedule));
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 350);
  }

  function install() {
    if (!window.actions) return false;
    window.actions.printPreview = openPdfPrintView;
    window.actions.exportPdf = openPdfPrintView;
    return true;
  }

  if (!install()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 80) clearInterval(timer);
    }, 100);
  }
})();