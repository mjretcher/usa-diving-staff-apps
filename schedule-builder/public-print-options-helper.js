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

  function hideTimes() {
    return localStorage.getItem(HIDE_TIMES_KEY) === "true";
  }

  function setHideTimes(value) {
    localStorage.setItem(HIDE_TIMES_KEY, value ? "true" : "false");
    installControl();
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

  function dateLabel(day) {
    const date = new Date(`${day?.date || ""}T00:00:00`);
    if (Number.isNaN(date.getTime())) return day?.date || "Unscheduled day";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function isManualBlock(session) {
    return Boolean(session?.isOpenPracticeSession || session?.autoTrainingForDayId);
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

  function renderSession(session, map) {
    const title = sessionTitle(session, map);
    if (isManualBlock(session)) {
      const note = String(session.events?.[0]?.notes || "").trim();
      return `<article class="session practice"><strong>${esc(title)}</strong>${note ? `<p>${esc(note)}</p>` : ""}</article>`;
    }
    const items = (session.events || []).map((event) => {
      const split = event.manualSplit ? "SPLIT " : "";
      const round = event.round && event.round !== "Custom Block" ? ` ${event.round}` : "";
      return `<li>${esc(split + eventDisplayName(event) + round)}</li>`;
    }).join("");
    return `<article class="session competition"><strong>${esc(title)}</strong><ul>${items}</ul></article>`;
  }

  function buildNoTimesPrintHtml(schedule) {
    const map = sessionNumberMap(schedule);
    const days = schedule.meet?.days || [];
    const sessions = schedule.sessions || [];
    const updated = schedule.updatedAt ? new Date(schedule.updatedAt) : new Date();
    const updatedText = Number.isNaN(updated.getTime())
      ? "Schedule subject to change."
      : updated.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const dayHtml = days.map((day, index) => {
      const daySessions = sessions
        .filter((session) => session.dayId === day.id)
        .sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));
      if (!daySessions.length) return "";
      return `<section class="day"><header><span>Day ${index + 1}</span><strong>${esc(dateLabel(day))}</strong></header>${daySessions.map((session) => renderSession(session, map)).join("")}</section>`;
    }).join("");

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
      .session { padding: 6px 8px; border-top: 1px solid #e7f0f8; break-inside: avoid; page-break-inside: avoid; }
      .session strong { display: block; font-size: 11px; margin-bottom: 2px; }
      .session p { margin: 2px 0; color: #5F6062; font-size: 9.5px; line-height: 1.25; }
      .session ul { margin: 3px 0 0; padding-left: 14px; }
      .session li { margin: 1px 0; line-height: 1.25; }
      .practice { border-left: 3px solid #009AC7; }
      footer { margin-top: 8px; color: #5F6062; font-size: 9px; border-top: 1px solid #dbe7f3; padding-top: 6px; }
      @media print { .toolbar { display: none; } main { max-width: none; padding: 0; } body { font-size: 10.5px; } }
    </style></head><body><div class="toolbar"><strong>Public Schedule - times hidden</strong><button onclick="window.print()">Print / Save as PDF</button></div><main><section class="cover"><h1>${esc(schedule.meet?.name || "Public Schedule")}</h1><p>Status: ${esc(schedule.publishStatus || "Draft")} · Updated ${esc(updatedText)} · Schedule subject to change.</p></section>${dayHtml || "<p>No sessions to print.</p>"}<footer>Schedule subject to change.</footer></main></body></html>`;
  }

  function openNoTimesPrintView() {
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
    win.document.write(buildNoTimesPrintHtml(schedule));
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 500);
  }

  function installControl() {
    const toolbar = document.querySelector(".preview-toolbar .export-actions");
    if (!toolbar) return;
    let label = document.getElementById("publicHideTimesPrintControl");
    if (!label) {
      label = document.createElement("label");
      label.id = "publicHideTimesPrintControl";
      label.className = "report-print-controls text-button";
      label.style.display = "inline-flex";
      label.style.alignItems = "center";
      label.style.gap = "6px";
      label.style.padding = "8px 10px";
      label.innerHTML = `<input type="checkbox" data-public-hide-times> Hide public times`;
      const after = document.getElementById("reportPrintControls");
      if (after && after.parentNode === toolbar) after.insertAdjacentElement("afterend", label);
      else toolbar.insertBefore(label, toolbar.firstChild);
      label.querySelector("input").addEventListener("change", (event) => setHideTimes(event.target.checked));
    }
    label.querySelector("input").checked = hideTimes();
  }

  function patchActions() {
    if (!window.actions || window.actions.__publicNoTimesPrintPatched) return false;
    ["printPreview", "exportPdf", "printCurrentReport"].forEach((name) => {
      if (typeof window.actions[name] !== "function") return;
      const original = window.actions[name];
      window.actions[name] = function () {
        if (hideTimes() && publicReportVisible()) return openNoTimesPrintView();
        return original.apply(this, arguments);
      };
    });
    window.actions.__publicNoTimesPrintPatched = true;
    return true;
  }

  function install() {
    installControl();
    patchActions();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    install();
    if (attempts > 120) clearInterval(timer);
  }, 500);

  window.addEventListener("click", (event) => {
    if (!hideTimes() || !publicReportVisible()) return;
    const button = event.target?.closest?.("button");
    if (!button) return;
    const text = String(button.textContent || "").toLowerCase();
    const attr = String(button.getAttribute("onclick") || "").toLowerCase();
    if (!/pdf|print/.test(text) && !/printpreview|exportpdf|printcurrentreport/.test(attr)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openNoTimesPrintView();
  }, true);
})();
