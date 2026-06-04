(function () {
  "use strict";

  const PRINT_MODE_KEY = "usa-diving-report-print-mode-v1";
  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const VALID_PRINT_MODES = new Set(["auto", "oneDay", "compact", "manual"]);

  function printMode() {
    const stored = localStorage.getItem(PRINT_MODE_KEY) || "auto";
    return VALID_PRINT_MODES.has(stored) ? stored : "auto";
  }

  function setPrintMode(value) {
    const next = VALID_PRINT_MODES.has(value) ? value : "auto";
    localStorage.setItem(PRINT_MODE_KEY, next);
    installReportControls();
  }

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function readSchedule() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const schedule = parsed?.schedule || parsed;
      return schedule?.meet && Array.isArray(schedule.sessions) ? schedule : null;
    } catch (error) {
      return null;
    }
  }

  function activeReportElement() {
    const candidates = [
      { id: "timelinePreview", label: "Operations Timeline", size: "landscape", kind: "timeline" },
      { selector: ".public-schedule-preview", label: "Public Schedule", size: "portrait", kind: "public" },
      { selector: ".poster-preview", label: "Poster / Canva View", size: "portrait", kind: "poster" },
      { id: "dailySchedulePreview", label: "Daily Schedule", size: "portrait", kind: "daily" },
      { id: "reportsPreview", label: "Report", size: "portrait", kind: "generic" },
    ];

    for (const item of candidates) {
      const element = item.id ? document.getElementById(item.id) : document.querySelector(item.selector);
      if (!element) continue;
      const box = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || box.width === 0 || box.height === 0) continue;
      return { element, ...item };
    }

    const visibleReport = [...document.querySelectorAll(".timeline-preview, .public-schedule-preview, .poster-preview, .daily-schedule-preview")]
      .find((element) => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
      });
    return visibleReport ? { element: visibleReport, label: "Current Report", size: "portrait", kind: "generic" } : null;
  }

  function pageTitle() {
    const title = document.querySelector(".command-center-copy h2")?.textContent?.trim();
    return title || "USA Diving Schedule Report";
  }

  function linkedStyles() {
    return [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((link) => `<link rel="stylesheet" href="${link.getAttribute("href")}">`)
      .join("\n");
  }

  function inlineStyles() {
    return [...document.querySelectorAll("style")].map((style) => style.outerHTML).join("\n");
  }

  function displayTime(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const hour24 = Math.floor(total / 60) % 24;
    const minute = total % 60;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour = hour24 % 12 || 12;
    return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
  }

  function dateLabel(day) {
    const date = new Date(`${day?.date || ""}T00:00:00`);
    if (Number.isNaN(date.getTime())) return day?.date || "Unscheduled day";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function roundUp(minutes, increment) {
    const step = Math.max(1, Number(increment || 5));
    return Math.ceil(Number(minutes || 0) / step) * step;
  }

  function eventLaneKey(event) {
    const apparatus = String(event?.apparatus || "").toLowerCase();
    if (apparatus === "1m" || apparatus === "1-meter" || apparatus === "1 meter") return "1m";
    if (apparatus === "3m" || apparatus === "3-meter" || apparatus === "3 meter") return "3m";
    if (apparatus === "platform" || apparatus === "10m" || apparatus === "10-meter" || apparatus === "10 meter") return "platform";
    return "other";
  }

  function isPlatformEvent(event) {
    return eventLaneKey(event) === "platform";
  }

  function isManualBlock(session) {
    return Boolean(session?.isOpenPracticeSession || session?.autoTrainingForDayId);
  }

  function isCompetitionEvent(event) {
    const round = String(event?.round || "").toLowerCase();
    const style = String(event?.style || "").toLowerCase();
    const level = String(event?.level || "").toLowerCase();
    if (!["qualifier", "prelim", "semifinal", "final"].includes(round)) return false;
    if (["custom block", "open practice", "open training", "administrative block"].includes(style)) return false;
    if (["schedule", "open", "custom"].includes(level)) return false;
    return true;
  }

  function useManualDuration(event) {
    return !isCompetitionEvent(event) && Number(event?.customDurationMinutes || 0) > 0;
  }

  function calculateEventDuration(event) {
    if (useManualDuration(event)) return Math.max(0, Number(event.customDurationMinutes || 0));
    const totalDives = Math.max(0, Number(event?.numberOfDivers || 0)) * Math.max(0, Number(event?.numberOfDives || 0));
    const rawEventMinutes = (totalDives * Math.max(0, Number(event?.secondsPerDive || 0))) / 60;
    const splitActive = Boolean(event?.manualSplit) && !isPlatformEvent(event);
    const competitiveMinutes = splitActive ? rawEventMinutes / 2 : rawEventMinutes;
    const panelCount = splitActive ? Math.max(0, Number(event?.numberOfPanelChanges || 0)) : 0;
    const panelMinutes = panelCount * Math.max(0, Number(event?.minutesPerPanelChange || 0));
    return competitiveMinutes + panelMinutes;
  }

  function getEventGroups(session) {
    const groups = [];
    const seen = new Map();
    (session.events || []).forEach((event) => {
      const key = event.eventGroupId || event.scheduleEventId || event.id || `group-${groups.length}`;
      if (!seen.has(key)) {
        const group = { id: key, events: [] };
        seen.set(key, group);
        groups.push(group);
      }
      seen.get(key).events.push(event);
    });
    return groups;
  }

  function calculateSessionTiming(schedule, session) {
    const defaults = schedule?.profile?.timingDefaults || {};
    const start = Number(session?.warmupStartMinutes || 0);
    if (isManualBlock(session)) {
      const duration = Math.max(0, Number(session.events?.[0]?.customDurationMinutes || 0));
      return { warmupStartMinutes: start, eventStartMinutes: start, sessionEndMinutes: start + duration, events: [] };
    }

    const warmup = Math.max(0, Number(session.warmupMinutes || 0));
    const transition = Math.max(0, Number(session.transitionBufferMinutes || 0));
    const increment = Math.max(1, Number(session.roundingIncrementMinutes || defaults.roundingIncrementMinutes || 5));
    const firstEventStart = roundUp(start + warmup, increment);
    const laneCursors = new Map();
    const timedEvents = [];
    let competitiveEnd = firstEventStart;

    getEventGroups(session).forEach((group) => {
      const lane = eventLaneKey(group.events[0]);
      const groupStart = laneCursors.has(lane) ? laneCursors.get(lane) : firstEventStart;
      let groupEnd = groupStart;
      group.events.forEach((event) => {
        const duration = calculateEventDuration(event);
        const eventEnd = groupStart + duration;
        timedEvents.push({ scheduleEventId: event.scheduleEventId, eventStartMinutes: groupStart, eventEndMinutes: eventEnd });
        groupEnd = Math.max(groupEnd, eventEnd);
      });
      competitiveEnd = Math.max(competitiveEnd, groupEnd);
      laneCursors.set(lane, roundUp(groupEnd + transition, increment));
    });

    const awards = (session.events || []).some((event) => event.round === "Final") && session.awardsEnabled !== false
      ? Math.max(0, Number(defaults.awardsMinutes || 15))
      : 0;
    return { warmupStartMinutes: start, eventStartMinutes: firstEventStart, sessionEndMinutes: competitiveEnd + awards, events: timedEvents };
  }

  function eventDisplayName(event) {
    const display = String(event?.display || "").trim();
    if (display) return display;
    return `${event?.level || ""} ${event?.gender || ""} ${event?.apparatus || ""}`.replace(/\s+/g, " ").trim() || "Schedule block";
  }

  function sessionNumberMap(schedule) {
    const sessions = [...(schedule.sessions || [])]
      .filter((session) => !isManualBlock(session))
      .sort((a, b) => {
        const dayA = (schedule.meet?.days || []).findIndex((day) => day.id === a.dayId);
        const dayB = (schedule.meet?.days || []).findIndex((day) => day.id === b.dayId);
        if (dayA !== dayB) return dayA - dayB;
        return Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
      });
    const map = new Map();
    sessions.forEach((session, index) => map.set(session.id, index + 1));
    return map;
  }

  function sessionTitle(session, map) {
    if (!isManualBlock(session)) return `Session ${map.get(session.id) || ""}`.trim();
    return String(session.title || session.events?.[0]?.blockTitle || session.events?.[0]?.style || "Practice / Training").trim();
  }

  function cleanPublicNote(value, title = "") {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const titleText = String(title || "").trim().toLowerCase();
    const generatedPatterns = [
      /assigned practice group/i,
      /assigned group warm-up/i,
      /restored on shifted/i,
      /restored from proposed/i,
      /revised to \d+ minutes/i,
      /recovered time moved/i,
      /safety shifted/i,
      /shift required/i,
      /working draft/i,
      /evaluation block/i,
      /starts? 5 minutes after/i,
      /full facility practice window/i,
      /official practice day before/i,
      /per user request/i,
    ];
    const seen = new Set();
    const kept = raw
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .filter((sentence) => !generatedPatterns.some((pattern) => pattern.test(sentence)))
      .filter((sentence) => {
        const key = sentence.toLowerCase();
        if (key === titleText) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    const cleaned = kept.join(" ").trim();
    if (/^(restricted|note|public note|restriction|pool closed|platform closed|boards restricted|open to|closed to|all junior nationals athletes)/i.test(cleaned)) return cleaned;
    return cleaned;
  }

  function renderPublicSession(schedule, session, map) {
    const timing = calculateSessionTiming(schedule, session);
    const isPractice = isManualBlock(session);
    const timeRange = `${displayTime(timing.warmupStartMinutes)}-${displayTime(timing.sessionEndMinutes)}`;
    const title = sessionTitle(session, map);
    const firstEvent = session.events?.[0] || {};
    const note = cleanPublicNote(firstEvent.notes || "", title);

    if (isPractice) {
      return `<article class="clean-session practice"><div class="clean-time">${esc(timeRange)}</div><div class="clean-body"><strong>${esc(title)}</strong>${note ? `<p>${esc(note)}</p>` : ""}</div></article>`;
    }

    const warmup = Number(session.warmupMinutes || 0) > 0
      ? `<div class="clean-warmup">Warm-up: ${esc(displayTime(timing.warmupStartMinutes))}-${esc(displayTime(timing.eventStartMinutes))}</div>`
      : "";
    const events = (session.events || []).map((event) => {
      const prefix = event.manualSplit ? "SPLIT " : "";
      const round = event.round && event.round !== "Custom Block" ? ` ${event.round}` : "";
      return `<li>${esc(prefix + eventDisplayName(event) + round)}</li>`;
    }).join("");
    return `<article class="clean-session competition"><div class="clean-time">${esc(timeRange)}</div><div class="clean-body"><strong>${esc(title)}</strong>${warmup}<ul>${events}</ul></div></article>`;
  }

  function cleanPublicScheduleShell(schedule, report) {
    const mode = printMode();
    const map = sessionNumberMap(schedule);
    const days = schedule.meet?.days || [];
    const sessions = schedule.sessions || [];
    const updated = schedule.updatedAt ? new Date(schedule.updatedAt).toLocaleString() : new Date().toLocaleString();
    const venue = [schedule.meet?.venue, schedule.meet?.timezone ? "Eastern Time (ET)" : ""].filter(Boolean).join(" · ");
    const dayHtml = days.map((day, index) => {
      const daySessions = sessions
        .filter((session) => session.dayId === day.id)
        .sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));
      if (!daySessions.length) return "";
      const force = mode === "oneDay" || (mode === "auto" && daySessions.length >= 6);
      const compact = mode === "compact" || (mode === "auto" && daySessions.length <= 2);
      return `<section class="clean-day ${force ? "force-break" : ""} ${compact ? "compact" : ""}"><header><span>Day ${index + 1}</span><strong>${esc(dateLabel(day))}</strong></header>${daySessions.map((session) => renderPublicSession(schedule, session, map)).join("")}</section>`;
    }).join("");

    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(schedule.meet?.name || report.label)}</title><style>
      @page { size: letter portrait; margin: 0.32in; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { margin: 0; color: #171F69; font-family: Arial, Helvetica, sans-serif; background: #fff; font-size: 11px; }
      .print-toolbar { position: sticky; top: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 18px; background: #fff; border-bottom: 1px solid #dbe7f3; box-shadow: 0 6px 18px rgba(23,31,105,.12); }
      .print-toolbar button { border: 0; border-radius: 999px; padding: 10px 16px; background: #171F69; color: white; font-weight: 800; cursor: pointer; }
      .clean-page { max-width: 8in; margin: 0 auto; padding: 18px; }
      .clean-cover { border-bottom: 5px solid #171F69; padding-bottom: 10px; margin-bottom: 12px; }
      .clean-cover h1 { margin: 0 0 4px; font-size: 20px; line-height: 1.15; }
      .clean-cover p { margin: 2px 0; color: #5F6062; font-size: 10px; }
      .clean-day { break-inside: avoid; page-break-inside: avoid; margin: 0 0 10px; border: 1px solid #dbe7f3; border-radius: 8px; overflow: hidden; }
      .clean-day header { display: flex; justify-content: space-between; gap: 12px; align-items: center; background: #171F69; color: #fff; padding: 6px 8px; }
      .clean-day header span { text-transform: uppercase; letter-spacing: .08em; font-weight: 800; font-size: 8.5px; color: #d7efff; }
      .clean-day header strong { font-size: 12px; }
      .clean-session { display: grid; grid-template-columns: 1.08in 1fr; gap: 8px; padding: 6px 8px; border-top: 1px solid #e7f0f8; break-inside: avoid; page-break-inside: avoid; }
      .clean-time { color: #E31937; font-weight: 800; white-space: nowrap; font-size: 10px; }
      .clean-body strong { display: block; font-size: 11px; margin-bottom: 1px; }
      .clean-warmup, .clean-body p { margin: 2px 0; color: #5F6062; font-size: 9.5px; line-height: 1.25; }
      .clean-body ul { margin: 3px 0 0; padding-left: 14px; columns: 1; }
      .clean-body li { margin: 1px 0; line-height: 1.25; }
      .practice .clean-body { border-left: 3px solid #009AC7; padding-left: 6px; }
      .clean-day.compact .clean-session { padding-top: 5px; padding-bottom: 5px; }
      .clean-footer { margin-top: 8px; color: #5F6062; font-size: 9px; border-top: 1px solid #dbe7f3; padding-top: 6px; }
      @media print {
        .print-toolbar { display: none; }
        .clean-page { max-width: none; padding: 0; }
        .clean-day.force-break { break-after: page; page-break-after: always; }
        .clean-day.force-break:last-of-type { break-after: auto; page-break-after: auto; }
        body { font-size: 10.5px; }
      }
    </style></head><body><div class="print-toolbar"><strong>${esc(report.label)} - clean print view</strong><button onclick="window.print()">Print / Save as PDF</button></div><main class="clean-page"><section class="clean-cover"><h1>${esc(schedule.meet?.name || "Public Schedule")}</h1><p>${esc(venue)}</p><p>Status: ${esc(schedule.publishStatus || "Draft")} · Updated ${esc(updated)} · Schedule subject to change.</p></section>${dayHtml || "<p>No sessions to print.</p>"}<footer class="clean-footer">All times are local to the meet. Schedule subject to change.</footer></main></body></html>`;
  }

  function daySessionCount(dayCard) {
    return dayCard.querySelectorAll(".public-schedule-item, .poster-session").length;
  }

  function prepareReportClone(report, mode) {
    const clone = report.element.cloneNode(true);
    clone.querySelectorAll("button, input, select, textarea, .public-output-controls, .public-designer-panel, .report-print-controls").forEach((node) => node.remove());

    if (report.kind === "public") {
      const dayCards = [...clone.querySelectorAll(".public-day-card, .polished-public-day")];
      dayCards.forEach((dayCard) => {
        const count = daySessionCount(dayCard);
        dayCard.classList.add("print-day-card");
        if (mode === "oneDay") dayCard.classList.add("print-force-break");
        if (mode === "compact") dayCard.classList.add("print-compact-flow");
        if (mode === "auto" && count >= 6) dayCard.classList.add("print-force-break");
      });
    }

    if (report.kind === "timeline") {
      const tables = [...clone.querySelectorAll(".timeline-page-table")];
      tables.forEach((table, index) => {
        table.classList.add("print-timeline-table");
        if (mode !== "compact" && index < tables.length - 1) table.classList.add("print-force-break-after");
      });
    }

    return clone;
  }

  function printShell(report) {
    const schedule = report.kind === "public" ? readSchedule() : null;
    if (schedule) return cleanPublicScheduleShell(schedule, report);

    const mode = printMode();
    const pageSize = report.size === "landscape" ? "letter landscape" : "letter portrait";
    const clone = prepareReportClone(report, mode);

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${pageTitle()} - ${report.label}</title>
  ${linkedStyles()}
  ${inlineStyles()}
  <style>
    @page { size: ${pageSize}; margin: 0.28in; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
    html, body { margin: 0; background: #fff !important; }
    body { color: #171F69; font-family: Arial, sans-serif; }
    .print-toolbar { position: sticky; top: 0; z-index: 99999; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 18px; background: #fff; border-bottom: 1px solid #dbe7f3; box-shadow: 0 6px 18px rgba(23,31,105,.12); }
    .print-toolbar strong { color: #171F69; }
    .print-toolbar button { border: 0; border-radius: 999px; padding: 10px 16px; background: #171F69; color: white; font-weight: 800; cursor: pointer; }
    .print-page { padding: 18px; }
    .print-page > * { max-width: none !important; }

    @media print {
      .print-toolbar { display: none !important; }
      .print-page { padding: 0 !important; }
      body { background: #fff !important; }
      .timeline-preview, .timeline-preview-by-day { width: 100% !important; }
      .timeline-table { width: 100% !important; page-break-inside: auto; break-inside: auto; }
      .print-timeline-table.print-force-break-after { page-break-after: always; break-after: page; }
      .timeline-table tr, .timeline-table td, .timeline-table th { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar"><strong>${report.label} - ${mode === "oneDay" ? "One day per page" : mode === "compact" ? "Compact flow" : mode === "manual" ? "Manual breaks" : "Auto page breaks"}</strong><button onclick="window.print()">Print / Save as PDF</button></div>
  <main class="print-page">${clone.outerHTML}</main>
</body>
</html>`;
  }

  function openPdfPrintView() {
    const report = activeReportElement();
    if (!report) {
      alert("No report is currently visible. Open the report you want, then click PDF/Print again.");
      return;
    }
    const win = window.open("", "_blank", "width=1200,height=850");
    if (!win) {
      alert("The print window was blocked. Please allow pop-ups for this site and click PDF/Print again.");
      return;
    }
    win.document.open();
    win.document.write(printShell(report));
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 500);
  }

  function installReportControls() {
    const toolbar = document.querySelector(".preview-toolbar .export-actions");
    if (!toolbar) return;
    let wrap = document.getElementById("reportPrintControls");
    if (!wrap) {
      wrap = document.createElement("label");
      wrap.id = "reportPrintControls";
      wrap.className = "report-print-controls text-button";
      wrap.style.display = "inline-flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "6px";
      wrap.style.padding = "8px 10px";
      wrap.innerHTML = `Print flow <select aria-label="Report print flow"><option value="auto">Auto</option><option value="oneDay">One day/page</option><option value="compact">Compact</option><option value="manual">Manual</option></select>`;
      toolbar.insertBefore(wrap, toolbar.firstChild);
      wrap.querySelector("select").addEventListener("change", (event) => setPrintMode(event.target.value));
    }
    wrap.querySelector("select").value = printMode();
  }

  function install() {
    installReportControls();
    if (!window.actions) return false;
    window.actions.printPreview = openPdfPrintView;
    window.actions.exportPdf = openPdfPrintView;
    window.actions.printCurrentReport = openPdfPrintView;
    return true;
  }

  if (!install()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 80) clearInterval(timer);
    }, 100);
  }

  setInterval(installReportControls, 1000);

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    const text = String(button.textContent || "").toLowerCase();
    const attr = String(button.getAttribute("onclick") || "").toLowerCase();
    if (!/pdf|print/.test(text) && !/printpreview|exportpdf|printcurrentreport/.test(attr)) return;
    event.preventDefault();
    event.stopPropagation();
    openPdfPrintView();
  }, true);
})();