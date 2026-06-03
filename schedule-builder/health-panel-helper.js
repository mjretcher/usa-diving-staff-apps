(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const PANEL_ID = "scheduleHealthCommandPanel";
  const COLLAPSED_KEY = "usa-diving-schedule-health-panel-collapsed-v1";

  function readSchedule() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return parsed?.schedule || parsed;
    } catch (error) {
      return null;
    }
  }

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function time(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const hour24 = Math.floor(total / 60) % 24;
    const minute = total % 60;
    const hour = hour24 % 12 || 12;
    return `${hour}:${String(minute).padStart(2, "0")} ${hour24 >= 12 ? "PM" : "AM"}`;
  }

  function dateLabel(day) {
    const date = new Date(`${day?.date || ""}T00:00:00`);
    if (Number.isNaN(date.getTime())) return day?.date || "Unscheduled day";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function isManualBlock(session) {
    return Boolean(session?.isOpenPracticeSession || session?.autoTrainingForDayId);
  }

  function isCompetition(event) {
    return ["Qualifier", "Prelim", "Semifinal", "Final"].includes(String(event?.round || ""));
  }

  function isJuniorIndividual(event) {
    return /^Group\s+[A-D]\b/i.test(String(event?.level || "")) && String(event?.style || "") === "Individual" && isCompetition(event);
  }

  function eventName(event) {
    const display = String(event?.display || "").trim();
    if (display) return display;
    return `${event?.level || ""} ${event?.gender || ""} ${event?.apparatus || ""}`.replace(/\s+/g, " ").trim() || "Schedule event";
  }

  function eventFamily(event) {
    return `${event.level}|${event.gender}|${event.apparatus}|${event.style}|${event.round}`;
  }

  function juniorFamily(event) {
    return `${event.level}|${event.gender}`;
  }

  function juniorApparatusFamily(event) {
    return `${event.level}|${event.apparatus}`;
  }

  function durationMinutes(event) {
    if (!isCompetition(event) && Number(event?.customDurationMinutes || 0) > 0) return Number(event.customDurationMinutes || 0);
    const diveTime = Math.max(0, Number(event?.numberOfDivers || 0)) * Math.max(0, Number(event?.numberOfDives || 0)) * Math.max(0, Number(event?.secondsPerDive || 0)) / 60;
    if (event?.manualSplit && !/platform|10m|10-meter/i.test(String(event?.apparatus || ""))) {
      return diveTime / 2 + Math.max(0, Number(event?.numberOfPanelChanges || 0)) * Math.max(0, Number(event?.minutesPerPanelChange || 0));
    }
    return diveTime;
  }

  function sessionEnd(session) {
    if (isManualBlock(session)) return Number(session.warmupStartMinutes || 0) + Number(session.events?.[0]?.customDurationMinutes || 0);
    const start = Number(session.warmupStartMinutes || 0);
    const warmup = Number(session.warmupMinutes || 0);
    const buffer = Number(session.transitionBufferMinutes || 0);
    const longest = (session.events || []).reduce((max, event) => Math.max(max, durationMinutes(event)), 0);
    const awards = (session.events || []).some((event) => event.round === "Final") && session.awardsEnabled !== false ? 15 : 0;
    return start + warmup + buffer + longest + awards;
  }

  function sessionLabel(session, index) {
    if (session.title && !/^session$/i.test(session.title)) return session.title;
    if (isManualBlock(session)) return session.title || "Practice / Block";
    return `Session ${index + 1}`;
  }

  function buildHealthItems(schedule) {
    if (!schedule?.meet?.days || !Array.isArray(schedule.sessions)) return [];
    const items = [];
    const seenEvents = new Map();

    schedule.meet.days.forEach((day) => {
      const daySessions = schedule.sessions
        .filter((session) => session.dayId === day.id)
        .sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));

      daySessions.forEach((session, sessionIndex) => {
        if (Number(day.closeMinutes || 0) && sessionEnd(session) > Number(day.closeMinutes || 0)) {
          items.push({
            severity: "error",
            label: "Past facility close",
            day: dateLabel(day),
            sessionId: session.id,
            detail: `${sessionLabel(session, sessionIndex)} ends at ${time(sessionEnd(session))}, after the listed close time of ${time(day.closeMinutes)}.`,
            action: "Adjust time or shorten block",
          });
        }

        (session.events || []).forEach((event) => {
          if (!isCompetition(event)) return;
          const key = eventFamily(event);
          if (seenEvents.has(key)) {
            items.push({
              severity: "error",
              label: "Duplicate event phase",
              day: dateLabel(day),
              sessionId: session.id,
              detail: `${eventName(event)} ${event.round} appears more than once in the schedule.`,
              action: "Remove duplicate event",
            });
          }
          seenEvents.set(key, event);
        });
      });

      for (let i = 1; i < daySessions.length; i += 1) {
        const prev = daySessions[i - 1];
        const current = daySessions[i];
        const prevEnd = sessionEnd(prev);
        const currentStart = Number(current.warmupStartMinutes || 0);
        if (prevEnd > currentStart) {
          items.push({
            severity: "error",
            label: "Time overlap",
            day: dateLabel(day),
            sessionId: current.id,
            detail: `${sessionLabel(prev, i - 1)} ends at ${time(prevEnd)}, but ${sessionLabel(current, i)} starts at ${time(currentStart)}.`,
            action: "Reflow day or adjust start time",
          });
        }
        if (!isManualBlock(prev) && isManualBlock(current) && currentStart - prevEnd < 5) {
          items.push({
            severity: "error",
            label: "Missing 5-minute safety gap",
            day: dateLabel(day),
            sessionId: current.id,
            detail: `${sessionLabel(current, i)} starts ${Math.max(0, currentStart - prevEnd)} minutes after competition. It must start at least 5 minutes after the prior event/session ends.`,
            action: "Move block later",
          });
        }
      }

      const juniorEvents = [];
      daySessions.forEach((session) => (session.events || []).filter(isJuniorIndividual).forEach((event) => juniorEvents.push({ ...event, sessionId: session.id })));
      const uniqueJunior = new Map();
      juniorEvents.forEach((event) => uniqueJunior.set(`${event.level}|${event.gender}|${event.apparatus}`, event));
      const byAgeGender = new Map();
      const byAgeApparatus = new Map();
      [...uniqueJunior.values()].forEach((event) => {
        const ageGender = juniorFamily(event);
        const ageApparatus = juniorApparatusFamily(event);
        if (!byAgeGender.has(ageGender)) byAgeGender.set(ageGender, []);
        if (!byAgeApparatus.has(ageApparatus)) byAgeApparatus.set(ageApparatus, []);
        byAgeGender.get(ageGender).push(event);
        byAgeApparatus.get(ageApparatus).push(event);
      });
      byAgeGender.forEach((events) => {
        const apparatus = [...new Set(events.map((event) => event.apparatus))];
        if (apparatus.length > 1) {
          items.push({
            severity: "error",
            label: "Junior same-day conflict",
            day: dateLabel(day),
            sessionId: events[0].sessionId,
            detail: `${events[0].level} ${events[0].gender} has multiple individual events on the same day: ${apparatus.join(", ")}. Same-day prelim/final is allowed only for the same event.`,
            action: "Move one event to another day",
          });
        }
      });
      byAgeApparatus.forEach((events) => {
        const genders = [...new Set(events.map((event) => event.gender))];
        if (genders.length > 1) {
          items.push({
            severity: "warning",
            label: "Junior gender/apparatus review",
            day: dateLabel(day),
            sessionId: events[0].sessionId,
            detail: `${events[0].level} ${events[0].apparatus} has both boys and girls on the same day. Confirm this is intentional before release.`,
            action: "Review with HP director",
          });
        }
      });
    });

    return items;
  }

  function goToSession(sessionId) {
    const schedule = readSchedule();
    const session = schedule?.sessions?.find((item) => item.id === sessionId);
    if (session?.dayId && window.actions?.setActiveBuilderDay) {
      window.actions.setActiveBuilderDay(session.dayId);
    }
    setTimeout(() => {
      const target = document.querySelector(`[data-session-id="${CSS.escape(sessionId)}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.classList.add("health-focus-session");
      setTimeout(() => target?.classList.remove("health-focus-session"), 2200);
    }, 150);
  }

  function copySummary(items) {
    const text = items.length
      ? items.map((item, index) => `${index + 1}. ${item.day} - ${item.label}: ${item.detail}`).join("\n")
      : "No active schedule health items.";
    navigator.clipboard?.writeText(text);
  }

  function renderPanel() {
    const schedule = readSchedule();
    const items = buildHealthItems(schedule);
    const collapsed = sessionStorage.getItem(COLLAPSED_KEY) === "1";
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }

    const errors = items.filter((item) => item.severity === "error").length;
    const warnings = items.filter((item) => item.severity === "warning").length;
    panel.className = `${collapsed ? "collapsed" : ""} ${errors ? "has-errors" : warnings ? "has-warnings" : "clear"}`;
    panel.innerHTML = `
      <div class="health-command-header">
        <button class="health-toggle" type="button" data-health-toggle>${collapsed ? "Health" : "Hide"}</button>
        <div><strong>Schedule Health</strong><span>${errors} errors · ${warnings} warnings</span></div>
        <button class="health-copy" type="button" data-health-copy>Copy</button>
      </div>
      ${collapsed ? "" : `<div class="health-command-body">
        ${items.length ? items.map((item, index) => `
          <article class="health-action-card ${item.severity}">
            <div class="health-card-title"><span>${esc(item.day)}</span><strong>${esc(item.label)}</strong></div>
            <p>${esc(item.detail)}</p>
            <div class="health-card-actions"><em>${esc(item.action)}</em><button type="button" data-session-id="${esc(item.sessionId)}">Go to item</button></div>
          </article>
        `).join("") : `<div class="health-empty"><strong>No active health issues detected.</strong><span>Schedule is clear under the current automated checks.</span></div>`}
      </div>`}
    `;

    panel.querySelector("[data-health-toggle]")?.addEventListener("click", () => {
      sessionStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1");
      renderPanel();
    });
    panel.querySelector("[data-health-copy]")?.addEventListener("click", () => copySummary(items));
    panel.querySelectorAll("[data-session-id]").forEach((button) => button.addEventListener("click", () => goToSession(button.getAttribute("data-session-id"))));
  }

  function installStyles() {
    if (document.getElementById("scheduleHealthCommandStyles")) return;
    const style = document.createElement("style");
    style.id = "scheduleHealthCommandStyles";
    style.textContent = `
      .schedule-health-panel { display: none !important; }
      #juniorCircuitRulePanel { display: none !important; }
      #${PANEL_ID} {
        position: fixed;
        right: 16px;
        top: 92px;
        z-index: 9997;
        width: min(430px, calc(100vw - 32px));
        max-height: calc(100vh - 116px);
        background: #ffffff;
        border: 1px solid rgba(23,31,105,0.18);
        border-radius: 16px;
        box-shadow: 0 16px 40px rgba(23,31,105,0.22);
        overflow: hidden;
        color: #171F69;
        font-family: inherit;
      }
      #${PANEL_ID}.collapsed { width: 132px; top: auto; bottom: 58px; }
      #${PANEL_ID}.collapsed .health-command-header { padding: 8px; }
      #${PANEL_ID}.collapsed .health-command-header div, #${PANEL_ID}.collapsed .health-copy { display:none; }
      .health-command-header {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 10px;
        align-items: center;
        padding: 12px;
        background: #F7F8FA;
        border-bottom: 1px solid #dbe7f3;
      }
      .health-command-header strong { display:block; font-size:0.95rem; }
      .health-command-header span { display:block; color:#5F6062; font-size:0.78rem; }
      .health-toggle, .health-copy, .health-card-actions button {
        border: 0;
        border-radius: 999px;
        padding: 8px 12px;
        background: #171F69;
        color: #fff;
        font-weight: 800;
        cursor: pointer;
      }
      .health-copy { background:#009AC7; }
      .health-command-body { max-height: calc(100vh - 176px); overflow:auto; padding: 12px; }
      .health-action-card {
        border: 1px solid #dbe7f3;
        border-left: 6px solid #5F6062;
        border-radius: 12px;
        padding: 10px;
        margin-bottom: 10px;
        background: #fff;
      }
      .health-action-card.error { border-left-color: #E31937; background: #fff7f8; }
      .health-action-card.warning { border-left-color: #f0b429; background: #fffdf4; }
      .health-card-title { display:flex; justify-content:space-between; gap:12px; align-items:baseline; }
      .health-card-title span { color:#5F6062; font-size:0.76rem; font-weight:800; }
      .health-card-title strong { font-size:0.9rem; }
      .health-action-card p { margin: 7px 0 10px; line-height:1.35; color:#243B53; font-size:0.82rem; }
      .health-card-actions { display:flex; justify-content:space-between; gap:10px; align-items:center; }
      .health-card-actions em { color:#5F6062; font-size:0.74rem; font-style:normal; }
      .health-empty { padding: 18px; text-align:center; background:#EEF6FC; border-radius:12px; }
      .health-empty strong, .health-empty span { display:block; }
      .health-empty span { margin-top:4px; color:#5F6062; font-size:0.8rem; }
      .health-focus-session { outline: 4px solid #E31937 !important; outline-offset: 4px; }
      @media (max-width: 900px) { #${PANEL_ID} { top:auto; right:10px; bottom:52px; width:min(390px, calc(100vw - 20px)); max-height:55vh; } }
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