(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const PANEL_ID = "scheduleHealthReviewPanel";
  const COLLAPSED_KEY = "usa-diving-health-review-collapsed-v1";
  const DETAILS_KEY = "usa-diving-health-review-details-v1";

  function readSchedule() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const schedule = parsed && parsed.schedule ? parsed.schedule : parsed;
      return schedule && schedule.meet && Array.isArray(schedule.sessions) ? schedule : null;
    } catch (error) {
      return null;
    }
  }

  function esc(value) {
    return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function time(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const hour24 = Math.floor(total / 60) % 24;
    const minute = total % 60;
    const hour = hour24 % 12 || 12;
    return `${hour}:${String(minute).padStart(2, "0")} ${hour24 >= 12 ? "PM" : "AM"}`;
  }

  function dateLabel(day) {
    const date = new Date(`${day && day.date || ""}T00:00:00`);
    if (Number.isNaN(date.getTime())) return day && day.date || "Unscheduled day";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function isManualBlock(session) {
    return Boolean(session && (session.isOpenPracticeSession || session.autoTrainingForDayId));
  }

  function isCompetition(event) {
    return ["Qualifier", "Prelim", "Semifinal", "Final"].includes(String(event && event.round || ""));
  }

  function isJuniorIndividual(event) {
    return /^Group\s+[A-D]\b/i.test(String(event && event.level || "")) && String(event && event.style || "") === "Individual" && isCompetition(event);
  }

  function apparatusKey(event) {
    const apparatus = String(event && event.apparatus || "").toLowerCase();
    if (apparatus === "1m" || apparatus === "1-meter" || apparatus === "1 meter") return "1m";
    if (apparatus === "3m" || apparatus === "3-meter" || apparatus === "3 meter") return "3m";
    if (apparatus === "platform" || apparatus === "10m" || apparatus === "10-meter" || apparatus === "10 meter") return "platform";
    return apparatus || "other";
  }

  function apparatusLabel(key) {
    if (key === "1m") return "1-Meter";
    if (key === "3m") return "3-Meter";
    if (key === "platform") return "Platform";
    return key;
  }

  function eventName(event) {
    const display = String(event && event.display || "").trim();
    if (display) return display;
    return `${event && event.level || ""} ${event && event.gender || ""} ${event && event.apparatus || ""}`.replace(/\s+/g, " ").trim() || "Schedule event";
  }

  function durationMinutes(event) {
    if (!isCompetition(event) && Number(event && event.customDurationMinutes || 0) > 0) return Number(event.customDurationMinutes || 0);
    const diveTime = Math.max(0, Number(event && event.numberOfDivers || 0)) * Math.max(0, Number(event && event.numberOfDives || 0)) * Math.max(0, Number(event && event.secondsPerDive || 0)) / 60;
    if (event && event.manualSplit && !/platform|10m|10-meter/i.test(String(event.apparatus || ""))) {
      return diveTime / 2 + Math.max(0, Number(event.numberOfPanelChanges || 0)) * Math.max(0, Number(event.minutesPerPanelChange || 0));
    }
    return diveTime;
  }

  function sessionEnd(session) {
    if (isManualBlock(session)) return Number(session.warmupStartMinutes || 0) + Number(session.events && session.events[0] && session.events[0].customDurationMinutes || 0);
    const start = Number(session.warmupStartMinutes || 0);
    const warmup = Number(session.warmupMinutes || 0);
    const longest = (session.events || []).reduce((max, event) => Math.max(max, durationMinutes(event)), 0);
    const awards = (session.events || []).some((event) => event.round === "Final") && session.awardsEnabled !== false ? 15 : 0;
    return start + warmup + longest + awards;
  }

  function sessionLabel(session, index) {
    if (session.title && !/^session$/i.test(session.title)) return session.title;
    if (isManualBlock(session)) return session.title || "Practice / Block";
    return `Session ${index + 1}`;
  }

  function issue(severity, type, day, sessionId, detail, action) {
    return { severity, type, day, sessionId, detail, action };
  }

  function collectIssues(schedule) {
    if (!schedule) return [];
    const issues = [];
    const seen = new Map();

    (schedule.meet.days || []).forEach((day) => {
      const dayName = dateLabel(day);
      const sessions = (schedule.sessions || [])
        .filter((session) => session.dayId === day.id)
        .sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));

      sessions.forEach((session, sessionIndex) => {
        const label = sessionLabel(session, sessionIndex);
        const end = sessionEnd(session);
        if (Number(day.closeMinutes || 0) && end > Number(day.closeMinutes || 0)) {
          issues.push(issue("error", "Past facility close", dayName, session.id, `${label} ends at ${time(end)}, after close at ${time(day.closeMinutes)}.`, "Adjust timing or shorten the block."));
        }

        (session.events || []).forEach((event) => {
          if (!isCompetition(event)) return;
          const key = `${event.level}|${event.gender}|${event.apparatus}|${event.style}|${event.round}`;
          if (seen.has(key)) issues.push(issue("error", "Duplicate event phase", dayName, session.id, `${eventName(event)} ${event.round} appears more than once.`, "Remove or move the duplicate phase."));
          seen.set(key, event);
        });

        const prelimByBoard = new Map();
        (session.events || []).filter((event) => isJuniorIndividual(event) && event.round === "Prelim").forEach((event) => {
          const board = apparatusKey(event);
          if (!prelimByBoard.has(board)) prelimByBoard.set(board, []);
          prelimByBoard.get(board).push(event);
        });
        prelimByBoard.forEach((events, board) => {
          const total = events.reduce((sum, event) => sum + Math.max(0, Number(event.numberOfDivers || 0)), 0);
          if (events.length > 1 && total >= 20) issues.push(issue("error", "Junior board-set conflict", dayName, session.id, `${label} has ${events.length} junior ${apparatusLabel(board)} prelims totaling ${total} entries.`, "Give each high-entry same-board prelim its own board set/session."));
        });
      });

      for (let i = 1; i < sessions.length; i += 1) {
        const previous = sessions[i - 1];
        const current = sessions[i];
        const previousEnd = sessionEnd(previous);
        const currentStart = Number(current.warmupStartMinutes || 0);
        if (previousEnd > currentStart) issues.push(issue("error", "Time overlap", dayName, current.id, `${sessionLabel(previous, i - 1)} ends at ${time(previousEnd)}, but ${sessionLabel(current, i)} starts at ${time(currentStart)}.`, "Reflow the day or adjust the start time."));
        if (!isManualBlock(previous) && isManualBlock(current) && currentStart - previousEnd < 5) issues.push(issue("error", "Missing safety gap", dayName, current.id, `${sessionLabel(current, i)} starts less than 5 minutes after competition.`, "Start practice/training at least 5 minutes after competition ends."));
      }

      const uniqueJunior = new Map();
      sessions.forEach((session) => (session.events || []).filter(isJuniorIndividual).forEach((event) => uniqueJunior.set(`${event.level}|${event.gender}|${event.apparatus}`, { ...event, sessionId: session.id }))));
      const byAgeGender = new Map();
      [...uniqueJunior.values()].forEach((event) => {
        const key = `${event.level}|${event.gender}`;
        if (!byAgeGender.has(key)) byAgeGender.set(key, []);
        byAgeGender.get(key).push(event);
      });
      byAgeGender.forEach((events) => {
        const apparatuses = [...new Set(events.map((event) => event.apparatus))];
        if (apparatuses.length > 1) issues.push(issue("error", "Junior same-day conflict", dayName, events[0].sessionId, `${events[0].level} ${events[0].gender} has multiple apparatuses on the same day: ${apparatuses.join(", ")}.`, "Move one event to another day."));
      });
    });

    return issues;
  }

  function groupedIssues(issues) {
    const map = new Map();
    issues.forEach((item) => {
      const key = `${item.severity}|${item.type}`;
      if (!map.has(key)) map.set(key, { severity: item.severity, type: item.type, items: [] });
      map.get(key).items.push(item);
    });
    return [...map.values()].sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
      return b.items.length - a.items.length;
    });
  }

  function goToSession(sessionId) {
    const schedule = readSchedule();
    const session = schedule && schedule.sessions && schedule.sessions.find((item) => item.id === sessionId);
    if (session && session.dayId && window.actions && window.actions.setActiveBuilderDay) window.actions.setActiveBuilderDay(session.dayId);
    setTimeout(() => {
      const target = document.querySelector(`[data-session-id="${CSS.escape(sessionId)}"]`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("health-review-focus");
      setTimeout(() => target.classList.remove("health-review-focus"), 2200);
    }, 150);
  }

  function copySummary(groups) {
    const lines = groups.flatMap((group) => [`${group.type} (${group.items.length})`, ...group.items.map((item, index) => `  ${index + 1}. ${item.day}: ${item.detail}`)]);
    navigator.clipboard && navigator.clipboard.writeText(lines.join("\n"));
  }

  function renderPanel() {
    const groups = groupedIssues(collectIssues(readSchedule()));
    const collapsed = sessionStorage.getItem(COLLAPSED_KEY) === "1";
    const showDetails = sessionStorage.getItem(DETAILS_KEY) === "1";
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }

    const errorCount = groups.filter((group) => group.severity === "error").reduce((sum, group) => sum + group.items.length, 0);
    const warningCount = groups.filter((group) => group.severity !== "error").reduce((sum, group) => sum + group.items.length, 0);
    panel.className = `${collapsed ? "collapsed" : ""} ${errorCount ? "has-errors" : warningCount ? "has-warnings" : "clear"}`;
    panel.innerHTML = `
      <div class="health-review-header">
        <button type="button" data-health-collapse>${collapsed ? "Health" : "Hide"}</button>
        <div><strong>Schedule Health</strong><span>${errorCount} action items · ${warningCount} review items</span></div>
        <button type="button" data-health-copy>Copy</button>
      </div>
      ${collapsed ? "" : `<div class="health-review-body">
        ${groups.length ? `<div class="health-review-tools"><button type="button" data-health-details>${showDetails ? "Summary only" : "Show details"}</button><span>Grouped so repeated warnings do not flood the page.</span></div>` : ""}
        ${groups.length ? groups.map((group) => `
          <section class="health-review-group ${group.severity}">
            <header><strong>${esc(group.type)}</strong><span>${group.items.length}</span></header>
            <p>${esc(group.items[0].action)}</p>
            ${showDetails ? `<div class="health-review-examples">${group.items.slice(0, 25).map((item) => `<article><b>${esc(item.day)}</b><span>${esc(item.detail)}</span><button type="button" data-session-id="${esc(item.sessionId)}">Go</button></article>`).join("")}${group.items.length > 25 ? `<em>+${group.items.length - 25} more. Use Copy for the full list.</em>` : ""}</div>` : `<button type="button" data-session-id="${esc(group.items[0].sessionId)}">Go to first item</button>`}
          </section>`).join("") : `<div class="health-review-empty"><strong>No action items detected.</strong><span>The schedule passes the focused health checks.</span></div>`}
      </div>`}
    `;

    panel.querySelector("[data-health-collapse]")?.addEventListener("click", () => {
      sessionStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1");
      renderPanel();
    });
    panel.querySelector("[data-health-details]")?.addEventListener("click", () => {
      sessionStorage.setItem(DETAILS_KEY, showDetails ? "0" : "1");
      renderPanel();
    });
    panel.querySelector("[data-health-copy]")?.addEventListener("click", () => copySummary(groups));
    panel.querySelectorAll("[data-session-id]").forEach((button) => button.addEventListener("click", () => goToSession(button.getAttribute("data-session-id"))));
  }

  function installStyles() {
    if (document.getElementById("scheduleHealthReviewStyles")) return;
    const style = document.createElement("style");
    style.id = "scheduleHealthReviewStyles";
    style.textContent = `
      #scheduleHealthCommandPanel, .schedule-health-panel { display:none !important; }
      .left-rail .warning-list { display:none !important; }
      #${PANEL_ID} { position: fixed; right: 16px; top: 92px; z-index: 9999; width: min(430px, calc(100vw - 32px)); max-height: calc(100vh - 116px); overflow: hidden; border: 1px solid rgba(23,31,105,.18); border-radius: 16px; background: #fff; color: #171F69; box-shadow: 0 16px 40px rgba(23,31,105,.22); font-family: inherit; }
      #${PANEL_ID}.collapsed { width: 132px; top: auto; bottom: 58px; }
      #${PANEL_ID}.collapsed .health-review-header { padding: 8px; }
      #${PANEL_ID}.collapsed .health-review-header div, #${PANEL_ID}.collapsed [data-health-copy] { display:none; }
      .health-review-header { display:grid; grid-template-columns:auto 1fr auto; gap:10px; align-items:center; padding:12px; background:#F7F8FA; border-bottom:1px solid #dbe7f3; }
      .health-review-header strong { display:block; font-size:.95rem; }
      .health-review-header span { color:#5F6062; font-size:.78rem; }
      .health-review-header button, .health-review-tools button, .health-review-group button { border:0; border-radius:999px; padding:8px 12px; background:#171F69; color:#fff; font-weight:800; cursor:pointer; }
      .health-review-header [data-health-copy] { background:#009AC7; }
      .health-review-body { max-height: calc(100vh - 176px); overflow:auto; padding:12px; }
      .health-review-tools { display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:10px; }
      .health-review-tools span { color:#5F6062; font-size:.74rem; line-height:1.25; }
      .health-review-group { margin-bottom:10px; padding:10px; border:1px solid #dbe7f3; border-left:6px solid #5F6062; border-radius:12px; background:#fff; }
      .health-review-group.error { border-left-color:#E31937; background:#fff7f8; }
      .health-review-group.warning { border-left-color:#f0b429; background:#fffdf4; }
      .health-review-group header { display:flex; justify-content:space-between; gap:10px; align-items:center; }
      .health-review-group header span { min-width:28px; min-height:28px; display:inline-flex; align-items:center; justify-content:center; border-radius:999px; background:#EEF6FC; font-weight:900; }
      .health-review-group p { margin:7px 0 10px; color:#5F6062; font-size:.78rem; line-height:1.35; }
      .health-review-examples article { display:grid; grid-template-columns:72px 1fr auto; gap:8px; align-items:center; padding:7px 0; border-top:1px solid #e7f0f8; }
      .health-review-examples b { font-size:.72rem; color:#E31937; }
      .health-review-examples span { font-size:.76rem; color:#243B53; line-height:1.3; }
      .health-review-examples em { display:block; margin-top:8px; color:#5F6062; font-size:.74rem; }
      .health-review-empty { padding:18px; text-align:center; background:#EEF6FC; border-radius:12px; }
      .health-review-empty span { display:block; margin-top:4px; color:#5F6062; font-size:.8rem; }
      .health-review-focus { outline: 4px solid #E31937 !important; outline-offset: 4px; }
      @media (max-width:900px) { #${PANEL_ID} { top:auto; right:10px; bottom:52px; width:min(390px, calc(100vw - 20px)); max-height:55vh; } }
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    renderPanel();
    document.addEventListener("click", () => setTimeout(renderPanel, 250), true);
    document.addEventListener("change", () => setTimeout(renderPanel, 250), true);
    window.addEventListener("storage", renderPanel);
    setInterval(renderPanel, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();