(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const BRAND = { blue: "#171F69", red: "#E31937", gray: "#5F6062", cyan: "#009AC7", sky: "#8FC3EA" };
  const TIME_ZONES = {
    "America/New_York": "Eastern Time (ET)",
    "America/Chicago": "Central Time (CT)",
    "America/Denver": "Mountain Time (MT)",
    "America/Los_Angeles": "Pacific Time (PT)",
  };

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(() => waitForActions(install));

  function waitForActions(callback, attempts = 0) {
    if (window.actions) {
      callback();
      return;
    }
    if (attempts > 100) return;
    window.setTimeout(() => waitForActions(callback, attempts + 1), 100);
  }

  function install() {
    if (window.__usaDivingPrintBrandPolishInstalled) return;
    window.__usaDivingPrintBrandPolishInstalled = true;
    window.actions.printPreview = openCleanPrint;
    window.actions.exportPdf = openCleanPrint;
    window.actions.printCurrentReport = openCleanPrint;
  }

  function readSchedule() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const schedule = parsed?.schedule || parsed;
      return schedule?.meet && Array.isArray(schedule.sessions) ? schedule : null;
    } catch (_) {
      return null;
    }
  }

  function openCleanPrint() {
    const schedule = readSchedule();
    if (!schedule) {
      alert("No saved schedule is available for printing. Save or reload the schedule, then try again.");
      return;
    }
    const win = window.open("", "_blank", "width=1200,height=850");
    if (!win) {
      alert("The print window was blocked. Please allow pop-ups for this site and try again.");
      return;
    }
    win.document.open();
    win.document.write(buildPrintHtml(schedule));
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 500);
  }

  function buildPrintHtml(schedule) {
    const days = schedule.meet?.days || [];
    const sessions = orderedSessions(schedule);
    const logo = window.USAD_ASSETS?.logoWhite || "";
    const timezone = TIME_ZONES[schedule.meet?.timezone] || schedule.meet?.timezone || "Meet local time";
    const updated = schedule.updatedAt ? new Date(schedule.updatedAt).toLocaleString("en-US") : new Date().toLocaleString("en-US");
    const venue = [schedule.meet?.venue, timezone].filter(Boolean).join(" · ");
    const dayHtml = days.map((day, index) => {
      const daySessions = sessions.filter((session) => session.dayId === day.id);
      if (!daySessions.length) return "";
      return `<section class="day-card"><header><span>Day ${index + 1}</span><strong>${esc(dateLabel(day))}</strong></header>${daySessions.map((session) => renderSession(schedule, session)).join("")}</section>`;
    }).join("");

    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(schedule.meet?.name || "USA Diving Schedule")}</title><style>${styles()}</style></head><body>
      <div class="print-toolbar"><strong>USA Diving Schedule Print View</strong><button onclick="window.print()">Print / Save as PDF</button></div>
      <main class="page">
        <section class="brand-cover">
          <div class="brand-mark">${logo ? `<img src="${logo}" alt="USA Diving">` : `<strong>USA Diving</strong>`}</div>
          <div><h1>${esc(schedule.meet?.name || "USA Diving Schedule")}</h1><p>${esc(venue)}</p><p>Status: ${esc(statusLabel(schedule.publishStatus))} · Updated ${esc(updated)} · Schedule subject to change.</p></div>
        </section>
        ${dayHtml || `<p class="empty">No sessions are currently scheduled.</p>`}
        <footer>All times are local to the meet. Schedule subject to change.</footer>
      </main>
    </body></html>`;
  }

  function renderSession(schedule, session) {
    const timing = calculateTiming(schedule, session);
    const isBlock = isManualBlock(session);
    const title = sessionTitle(schedule, session);
    const timeRange = `${displayTime(timing.start)}–${displayTime(timing.end)}`;
    if (isBlock) {
      const note = cleanNote(session.events?.[0]?.notes || "", title);
      return `<article class="session block"><div class="time">${esc(timeRange)}</div><div class="body"><strong>${esc(title)}</strong>${note ? `<p>${esc(note)}</p>` : ""}</div></article>`;
    }
    const warmup = Number(session.warmupMinutes || 0) > 0 ? `<p class="warmup">Warm-up: ${esc(displayTime(timing.start))}–${esc(displayTime(timing.eventStart))}</p>` : "";
    const events = (session.events || []).map((event) => {
      const split = event.manualSplit ? "Split: " : "";
      const round = event.round && event.round !== "Custom Block" ? ` ${event.round}` : "";
      return `<li>${esc(split + eventName(event) + round)}</li>`;
    }).join("");
    return `<article class="session"><div class="time">${esc(timeRange)}</div><div class="body"><strong>${esc(title)}</strong>${warmup}<ul>${events}</ul></div></article>`;
  }

  function orderedSessions(schedule) {
    const dayOrder = new Map((schedule.meet?.days || []).map((day, index) => [day.id, index]));
    return [...(schedule.sessions || [])].sort((a, b) => {
      const dayCompare = (dayOrder.get(a.dayId) ?? 999) - (dayOrder.get(b.dayId) ?? 999);
      if (dayCompare) return dayCompare;
      return Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
    });
  }

  function sessionTitle(schedule, session) {
    if (isManualBlock(session)) return String(session.title || session.events?.[0]?.blockTitle || session.events?.[0]?.style || "Practice / Training").trim();
    const competition = orderedSessions(schedule).filter((item) => !isManualBlock(item));
    return `Session ${competition.findIndex((item) => item.id === session.id) + 1}`;
  }

  function calculateTiming(schedule, session) {
    const start = Number(session.warmupStartMinutes || 0);
    if (isManualBlock(session)) {
      const duration = Math.max(0, Number(session.events?.[0]?.customDurationMinutes || 0));
      return { start, eventStart: start, end: start + duration };
    }
    const defaults = schedule.profile?.timingDefaults || {};
    const increment = Math.max(1, Number(session.roundingIncrementMinutes || defaults.roundingIncrementMinutes || 5));
    const eventStart = roundUp(start + Number(session.warmupMinutes || 0), increment);
    let end = eventStart;
    const laneCursors = new Map();
    groupedEvents(session).forEach((group) => {
      const lane = laneKey(group[0]);
      const groupStart = laneCursors.has(lane) ? laneCursors.get(lane) : eventStart;
      const groupEnd = group.reduce((max, event) => Math.max(max, groupStart + eventDuration(event)), groupStart);
      laneCursors.set(lane, roundUp(groupEnd + Number(session.transitionBufferMinutes || 0), increment));
      end = Math.max(end, groupEnd);
    });
    if ((session.events || []).some((event) => event.round === "Final") && session.awardsEnabled !== false) end += Math.max(0, Number(defaults.awardsMinutes || 15));
    return { start, eventStart, end };
  }

  function groupedEvents(session) {
    const groups = [];
    const byId = new Map();
    (session.events || []).forEach((event) => {
      const key = event.eventGroupId || event.scheduleEventId || event.id || `event-${groups.length}`;
      if (!byId.has(key)) {
        const group = [];
        byId.set(key, group);
        groups.push(group);
      }
      byId.get(key).push(event);
    });
    return groups;
  }

  function eventDuration(event) {
    if (!isCompetitionEvent(event) && Number(event.customDurationMinutes || 0) > 0) return Number(event.customDurationMinutes || 0);
    const raw = (Math.max(0, Number(event.numberOfDivers || 0)) * Math.max(0, Number(event.numberOfDives || 0)) * Math.max(0, Number(event.secondsPerDive || 0))) / 60;
    const split = Boolean(event.manualSplit) && laneKey(event) !== "platform";
    const panels = split ? Math.max(0, Number(event.numberOfPanelChanges || 0)) * Math.max(0, Number(event.minutesPerPanelChange || 0)) : 0;
    return (split ? raw / 2 : raw) + panels;
  }

  function isCompetitionEvent(event) {
    const round = String(event.round || "").toLowerCase();
    const level = String(event.level || "").toLowerCase();
    return ["qualifier", "prelim", "semifinal", "final"].includes(round) && !["schedule", "open", "custom"].includes(level);
  }

  function isManualBlock(session) {
    return Boolean(session?.isOpenPracticeSession || session?.autoTrainingForDayId);
  }

  function eventName(event) {
    return String(event.display || "").trim() || [event.level, event.gender, event.apparatus].filter(Boolean).join(" ") || "Scheduled event";
  }

  function laneKey(event) {
    const text = String(event?.apparatus || "").toLowerCase();
    if (["1m", "1-meter", "1 meter"].includes(text)) return "1m";
    if (["3m", "3-meter", "3 meter"].includes(text)) return "3m";
    if (["platform", "10m", "10-meter", "10 meter"].includes(text)) return "platform";
    return "other";
  }

  function cleanNote(value, title) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const titleText = String(title || "").trim().toLowerCase();
    const blocked = [/restored/i, /working draft/i, /per user request/i, /shift required/i, /recovered time/i, /evaluation block/i];
    return raw.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean).filter((sentence, index, list) => {
      const key = sentence.toLowerCase();
      return key !== titleText && !blocked.some((pattern) => pattern.test(sentence)) && list.findIndex((other) => other.toLowerCase() === key) === index;
    }).join(" ");
  }

  function dateLabel(day) {
    const date = new Date(`${day?.date || ""}T12:00:00`);
    if (Number.isNaN(date.getTime())) return day?.date || "Unscheduled day";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function displayTime(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const hour24 = Math.floor(total / 60) % 24;
    const minute = total % 60;
    return `${hour24 % 12 || 12}:${String(minute).padStart(2, "0")} ${hour24 >= 12 ? "PM" : "AM"}`;
  }

  function roundUp(minutes, increment) {
    return Math.ceil(Number(minutes || 0) / increment) * increment;
  }

  function statusLabel(value) {
    return ({ draft: "Draft", review: "Internal Review", ready: "Ready to Publish", published: "Published" })[value] || "Draft";
  }

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  function styles() {
    return `
      @page{size:letter portrait;margin:.32in}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{margin:0;background:#fff;color:${BRAND.blue};font-family:Arial,Helvetica,sans-serif;font-size:11px}.print-toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:space-between;align-items:center;padding:12px 18px;background:#fff;border-bottom:1px solid #dbe7f3;box-shadow:0 6px 18px rgba(23,31,105,.12)}.print-toolbar button{border:0;border-radius:999px;padding:10px 16px;background:${BRAND.blue};color:#fff;font-weight:800;cursor:pointer}.page{max-width:8in;margin:0 auto;padding:18px}.brand-cover{display:grid;grid-template-columns:1.7in 1fr;gap:16px;align-items:center;background:${BRAND.blue};color:#fff;border-radius:12px;padding:16px;margin-bottom:14px}.brand-mark{display:flex;align-items:center;justify-content:center;min-height:.78in}.brand-mark img{max-width:1.45in;max-height:.62in;display:block}.brand-mark strong{font-size:18px}.brand-cover h1{margin:0 0 5px;font-size:21px;line-height:1.12}.brand-cover p{margin:3px 0;color:#eef6fc}.day-card{break-inside:avoid;page-break-inside:avoid;margin:0 0 10px;border:1px solid #dbe7f3;border-radius:8px;overflow:hidden}.day-card header{display:flex;justify-content:space-between;gap:12px;align-items:center;background:${BRAND.blue};color:#fff;padding:7px 9px}.day-card header span{text-transform:uppercase;letter-spacing:.08em;font-weight:900;font-size:8.5px;color:#d7efff}.day-card header strong{font-size:12px}.session{display:grid;grid-template-columns:1.1in 1fr;gap:8px;padding:7px 9px;border-top:1px solid #e7f0f8;break-inside:avoid;page-break-inside:avoid}.time{color:${BRAND.red};font-weight:900;white-space:nowrap}.body strong{display:block;font-size:11px;margin-bottom:2px}.body p,.warmup{margin:2px 0;color:${BRAND.gray};font-size:9.7px;line-height:1.3}.body ul{margin:3px 0 0;padding-left:14px}.body li{margin:1px 0;line-height:1.27}.block .body{border-left:3px solid ${BRAND.cyan};padding-left:6px}footer{margin-top:8px;border-top:1px solid #dbe7f3;padding-top:7px;color:${BRAND.gray};font-size:9px}.empty{border:1px solid #dbe7f3;border-radius:8px;padding:12px;color:${BRAND.gray}}@media print{.print-toolbar{display:none}.page{max-width:none;padding:0}.brand-cover{border-radius:0}.day-card{break-inside:avoid;page-break-inside:avoid}}`;
  }
})();
