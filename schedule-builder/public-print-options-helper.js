(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const HIDE_TIMES_KEY = "usa-diving-public-report-hide-times-v1";

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function captureScroll() {
    const containers = [".workspace", ".public-schedule-preview", ".preview-pane", ".builder-flow-dock", ".left-rail"]
      .map((selector) => {
        const node = document.querySelector(selector);
        return node ? { selector, top: node.scrollTop, left: node.scrollLeft } : null;
      })
      .filter(Boolean);
    return { x: window.scrollX, y: window.scrollY, containers };
  }

  function restoreScroll(snapshot) {
    if (!snapshot) return;
    window.scrollTo(snapshot.x, snapshot.y);
    snapshot.containers.forEach((item) => {
      const node = document.querySelector(item.selector);
      if (!node) return;
      node.scrollTop = item.top;
      node.scrollLeft = item.left;
    });
  }

  function hideTimes() {
    return localStorage.getItem(HIDE_TIMES_KEY) === "true";
  }

  function setHideTimes(value) {
    const snapshot = captureScroll();
    localStorage.setItem(HIDE_TIMES_KEY, value ? "true" : "false");
    installControl();
    restoreScroll(snapshot);
    requestAnimationFrame(() => restoreScroll(snapshot));
    setTimeout(() => restoreScroll(snapshot), 80);
    setTimeout(() => restoreScroll(snapshot), 220);
  }

  function readSchedule() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const schedule = parsed?.schedule || parsed;
      return schedule?.meet && Array.isArray(schedule.sessions) ? schedule : null;
    } catch (_error) {
      return null;
    }
  }

  function isVisible(element) {
    if (!element) return false;
    const box = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
  }

  function publicReportVisible() {
    return isVisible(document.querySelector(".public-schedule-preview"));
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

  function calculateEventDuration(event) {
    if (!isCompetitionEvent(event) && Number(event?.customDurationMinutes || 0) > 0) return Math.max(0, Number(event.customDurationMinutes || 0));
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
      return { warmupStartMinutes: start, eventStartMinutes: start, sessionEndMinutes: start + duration };
    }
    const warmup = Math.max(0, Number(session.warmupMinutes || 0));
    const transition = Math.max(0, Number(session.transitionBufferMinutes || 0));
    const increment = Math.max(1, Number(session.roundingIncrementMinutes || defaults.roundingIncrementMinutes || 5));
    const firstEventStart = roundUp(start + warmup, increment);
    const laneCursors = new Map();
    let competitiveEnd = firstEventStart;
    getEventGroups(session).forEach((group) => {
      const lane = eventLaneKey(group.events[0]);
      const groupStart = laneCursors.has(lane) ? laneCursors.get(lane) : firstEventStart;
      let groupEnd = groupStart;
      group.events.forEach((event) => {
        groupEnd = Math.max(groupEnd, groupStart + calculateEventDuration(event));
      });
      competitiveEnd = Math.max(competitiveEnd, groupEnd);
      laneCursors.set(lane, roundUp(groupEnd + transition, increment));
    });
    const awards = (session.events || []).some((event) => event.round === "Final") && session.awardsEnabled !== false
      ? Math.max(0, Number(defaults.awardsMinutes || 15))
      : 0;
    return { warmupStartMinutes: start, eventStartMinutes: firstEventStart, sessionEndMinutes: competitiveEnd + awards };
  }

  function eventDisplayName(event) {
    const display = String(event?.display || "").trim();
    if (display) return display;
    const synchro = /synchro|synchronized/i.test([event?.style, event?.canonicalKey, event?.sourceNote].join(" "));
    return `${event?.level || ""} ${event?.gender || ""}${synchro ? " Synchro" : ""} ${event?.apparatus || ""}`.replace(/\s+/g, " ").trim() || "Schedule block";
  }

  function sessionNumberMap(schedule) {
    const days = schedule.meet?.days || [];
    const sessions = [...(schedule.sessions || [])]
      .filter((session) => !isManualBlock(session))
      .sort((a, b) => {
        const dayA = days.findIndex((day) => day.id === a.dayId);
        const dayB = days.findIndex((day) => day.id === b.dayId);
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
    const kept = raw.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean).filter((sentence) => sentence.toLowerCase() !== titleText);
    return kept.join(" ").trim();
  }

  function renderSession(schedule, session, map, options) {
    const timing = calculateSessionTiming(schedule, session);
    const title = sessionTitle(session, map);
    const note = cleanPublicNote(session.events?.[0]?.notes || "", title);
    const time = options.hideTimes ? "" : `<div class="session-time">${esc(displayTime(timing.warmupStartMinutes))}-${esc(displayTime(timing.sessionEndMinutes))}</div>`;
    if (isManualBlock(session)) {
      return `<article class="session practice">${time}<div class="session-body"><strong>${esc(title)}</strong>${note ? `<p>${esc(note)}</p>` : ""}</div></article>`;
    }
    const warmup = !options.hideTimes && Number(session.warmupMinutes || 0) > 0
      ? `<div class="warmup">Warm-up: ${esc(displayTime(timing.warmupStartMinutes))}-${esc(displayTime(timing.eventStartMinutes))}</div>`
      : "";
    const items = (session.events || []).map((event) => {
      const split = event.manualSplit ? "SPLIT " : "";
      const round = event.round && event.round !== "Custom Block" ? ` ${event.round}` : "";
      return `<li>${esc(split + eventDisplayName(event) + round)}</li>`;
    }).join("");
    return `<article class="session competition">${time}<div class="session-body"><strong>${esc(title)}</strong>${warmup}<ul>${items}</ul></div></article>`;
  }

  function buildPublicPrintHtml(schedule, options) {
    const map = sessionNumberMap(schedule);
    const days = schedule.meet?.days || [];
    const sessions = schedule.sessions || [];
    const venue = [schedule.meet?.venue, schedule.meet?.timezone ? "Eastern Time (ET)" : ""].filter(Boolean).join(" · ");
    const dayHtml = days.map((day, index) => {
      const daySessions = sessions
        .filter((session) => session.dayId === day.id)
        .sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));
      if (!daySessions.length) return "";
      return `<section class="day"><header><span>Day ${index + 1}</span><strong>${esc(dateLabel(day))}</strong></header>${daySessions.map((session) => renderSession(schedule, session, map, options)).join("")}</section>`;
    }).join("");
    const grid = options.hideTimes ? "1fr" : "1.08in 1fr";
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(schedule.meet?.name || "Public Schedule")}</title><style>
      @page { size: letter portrait; margin: .34in; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { margin: 0; background: #fff; color: #171F69; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
      .toolbar { position: sticky; top: 0; z-index: 20; display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #fff; border-bottom: 1px solid #dbe7f3; box-shadow: 0 6px 18px rgba(23,31,105,.12); }
      .toolbar button { border: 0; border-radius: 999px; padding: 10px 16px; background: #171F69; color: #fff; font-weight: 800; cursor: pointer; }
      main { max-width: 8in; margin: 0 auto; padding: 18px; }
      .cover { border-bottom: 5px solid #171F69; padding-bottom: 10px; margin-bottom: 12px; }
      h1 { margin: 0 0 4px; font-size: 20px; line-height: 1.15; }
      .cover p { margin: 2px 0; color: #5F6062; font-size: 10px; }
      .day { break-inside: avoid; page-break-inside: avoid; margin: 0 0 10px; border: 1px solid #dbe7f3; border-radius: 8px; overflow: hidden; }
      .day header { display: flex; justify-content: space-between; gap: 12px; align-items: center; background: #171F69; color: #fff; padding: 6px 8px; }
      .day header span { text-transform: uppercase; letter-spacing: .08em; font-weight: 800; font-size: 8.5px; color: #d7efff; }
      .day header strong { font-size: 12px; }
      .session { display: grid; grid-template-columns: ${grid}; gap: 8px; padding: 6px 8px; border-top: 1px solid #e7f0f8; break-inside: avoid; page-break-inside: avoid; }
      .session-time { color: #E31937; font-weight: 800; white-space: nowrap; font-size: 10px; }
      .session-body strong { display: block; font-size: 11px; margin-bottom: 2px; }
      .warmup, .session-body p { margin: 2px 0; color: #5F6062; font-size: 9.5px; line-height: 1.25; }
      .session-body ul { margin: 3px 0 0; padding-left: 14px; }
      .session-body li { margin: 1px 0; line-height: 1.25; }
      .practice .session-body { border-left: 3px solid #009AC7; padding-left: 6px; }
      @media print { .toolbar { display: none; } main { max-width: none; padding: 0; } body { font-size: 10.5px; } }
    </style></head><body><div class="toolbar"><strong>Public Schedule${options.hideTimes ? " - times hidden" : ""}</strong><button onclick="window.print()">Print / Save as PDF</button></div><main><section class="cover"><h1>${esc(schedule.meet?.name || "Public Schedule")}</h1>${venue ? `<p>${esc(venue)}</p>` : ""}</section>${dayHtml || "<p>No sessions to print.</p>"}</main></body></html>`;
  }

  function openPublicPrintView() {
    const schedule = readSchedule();
    if (!schedule) {
      alert("No active schedule is available to print.");
      return;
    }
    const win = window.open("", "_blank", "width=1200,height=850");
    if (!win) {
      alert("The print window was blocked. Please allow pop-ups for this site and click PDF/Print again.");
      return;
    }
    win.document.open();
    win.document.write(buildPublicPrintHtml(schedule, { hideTimes: hideTimes() }));
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 500);
  }

  function styleControl(label) {
    label.className = "public-hide-times-control";
    label.style.display = "inline-flex";
    label.style.alignItems = "center";
    label.style.justifyContent = "center";
    label.style.gap = "10px";
    label.style.minHeight = "64px";
    label.style.padding = "10px 22px";
    label.style.border = "1px solid #d5dceb";
    label.style.borderRadius = "999px";
    label.style.background = "#fff";
    label.style.boxShadow = "0 2px 8px rgba(23,31,105,.05)";
    label.style.fontWeight = "800";
    label.style.color = "#334155";
    label.style.cursor = "pointer";
    label.style.verticalAlign = "middle";
    label.style.marginTop = "0";
  }

  function installControl() {
    const outputControls = document.querySelector(".public-output-controls") || document.querySelector(".public-designer-panel");
    const exportToolbar = document.querySelector(".preview-toolbar .export-actions");
    const target = outputControls || exportToolbar;
    if (!target) return;
    let label = document.getElementById("publicHideTimesPrintControl");
    if (!label) {
      label = document.createElement("label");
      label.id = "publicHideTimesPrintControl";
      styleControl(label);
      label.innerHTML = `<input type="checkbox" data-public-hide-times style="width:22px;height:22px;accent-color:#0074f6;cursor:pointer;"> <span>Hide public times</span>`;
      label.querySelector("input").addEventListener("change", (event) => setHideTimes(event.target.checked));
    }
    styleControl(label);
    if (label.parentNode !== target) target.appendChild(label);
    label.querySelector("input").checked = hideTimes();
  }

  function patchActions() {
    if (!window.actions || window.actions.__publicPrintOptionsPatched) return false;
    ["printPreview", "exportPdf", "printCurrentReport"].forEach((name) => {
      if (typeof window.actions[name] !== "function") return;
      const original = window.actions[name];
      window.actions[name] = function () {
        if (publicReportVisible()) return openPublicPrintView();
        return original.apply(this, arguments);
      };
    });
    window.actions.__publicPrintOptionsPatched = true;
    return true;
  }

  function install() {
    installControl();
    patchActions();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  setInterval(install, 700);

  window.addEventListener("click", (event) => {
    if (!publicReportVisible()) return;
    const button = event.target?.closest?.("button");
    if (!button) return;
    const text = String(button.textContent || "").toLowerCase();
    const attr = String(button.getAttribute("onclick") || "").toLowerCase();
    if (!/pdf|print/.test(text) && !/printpreview|exportpdf|printcurrentreport/.test(attr)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPublicPrintView();
  }, true);
})();
