(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const STYLE_ID = "emergencyMoveHelperStyles";
  const MODAL_ID = "emergencyMoveModal";
  const BUTTON_ID = "emergencyMoveButton";

  ready(() => {
    injectStyles();
    installMoveButton();
    installBrokenMoveUiSuppressor();
    installDragCleanup();
  });

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  function readStorage() {
    try {
      const root = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const schedule = root?.schedule || root;
      if (!schedule?.meet || !Array.isArray(schedule.sessions)) return null;
      return { root, schedule, wrapped: Boolean(root?.schedule) };
    } catch (_) {
      return null;
    }
  }

  function writeStorage(storage, schedule) {
    schedule.updatedAt = new Date().toISOString();
    const nextRoot = storage.wrapped ? { ...storage.root, schedule } : schedule;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRoot));
    try { window.dispatchEvent(new CustomEvent("schedule-builder-emergency-move-applied", { detail: { updatedAt: schedule.updatedAt } })); } catch (_) {}
    window.setTimeout(() => window.location.reload(), 450);
  }

  function installMoveButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Move Schedule Item";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openModal("event");
    });
    document.body.appendChild(button);
  }

  function installBrokenMoveUiSuppressor() {
    const hideOldControls = () => {
      document.querySelectorAll("button[onclick*='pickMove'], button[onclick*='moveEventPrompt'], .move-mode-panel, .session-slot-drop-zone, .click-drop-ready")
        .forEach((node) => {
          if (node.closest(`#${MODAL_ID}`)) return;
          node.setAttribute("aria-hidden", "true");
          node.style.display = "none";
        });
      document.querySelectorAll("[draggable='true']").forEach((node) => {
        if (!node.closest(`#${MODAL_ID}`)) node.setAttribute("draggable", "false");
      });
    };
    hideOldControls();
    new MutationObserver(hideOldControls).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("dragstart", (event) => {
      if (event.target?.closest?.(`#${MODAL_ID}`)) return;
      if (event.target?.closest?.(".session-card, .scheduled-event")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  function installDragCleanup() {
    const cleanup = () => {
      document.body.classList.remove("schedule-drag-active", "pointer-drag-active");
      document.querySelectorAll(".dragging, .event-dragging, .pointer-drag-source, .event-drop-target, .combine-ready, .stack-drop-ready, .day-lane.over, .session-slot-active")
        .forEach((node) => node.classList.remove("dragging", "event-dragging", "pointer-drag-source", "event-drop-target", "combine-ready", "stack-drop-ready", "over", "session-slot-active"));
    };
    ["dragend", "drop", "pointerup", "pointercancel", "keyup"].forEach((name) => {
      window.addEventListener(name, (event) => {
        if (name === "keyup" && event.key !== "Escape") return;
        cleanup();
      }, true);
    });
  }

  function openModal(tab) {
    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = MODAL_ID;
      document.body.appendChild(modal);
    }
    renderModal(tab || "event");
  }

  function closeModal() {
    document.getElementById(MODAL_ID)?.remove();
  }

  function renderModal(tab) {
    const storage = readStorage();
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    const body = storage ? (tab === "session" ? sessionPanel(storage.schedule) : eventPanel(storage.schedule)) : `<div class="qm-empty">No saved schedule was found. Save or reload the schedule, then try again.</div>`;
    modal.innerHTML = shell(tab, body);
    wireModal(modal);
    refreshDependentSelects();
  }

  function shell(tab, body) {
    return `
      <div class="qm-backdrop">
        <section class="qm-modal" role="dialog" aria-modal="true" aria-label="Move schedule item">
          <header class="qm-header">
            <div><span>Schedule movement</span><h2>Move Schedule Item</h2><p>Use this panel instead of drag/drop. Select the item, choose the destination, then press Apply Move.</p></div>
            <button type="button" class="qm-close" data-qm-close aria-label="Close">×</button>
          </header>
          <nav class="qm-tabs">
            <button type="button" class="${tab === "event" ? "active" : ""}" data-qm-tab="event">Move Event</button>
            <button type="button" class="${tab === "session" ? "active" : ""}" data-qm-tab="session">Move Session / Block</button>
          </nav>
          <div class="qm-body">${body}</div>
        </section>
      </div>`;
  }

  function eventPanel(schedule) {
    const sessions = orderedSessions(schedule).filter((session) => !session.autoTrainingForDayId);
    const events = sessions.flatMap((session) => (session.events || []).map((event) => ({ session, event })));
    const days = schedule.meet?.days || [];
    if (!events.length) return `<div class="qm-empty">No movable events were found in this schedule.</div>`;
    return `
      <div class="qm-grid">
        <label>Event to move<select id="qmSourceEvent">${events.map(({ session, event }) => `<option value="${esc(eventKey(event))}">${esc(eventLabel(event))} — ${esc(sessionLabel(schedule, session))}</option>`).join("")}</select></label>
        <label>Destination type<select id="qmEventMode"><option value="existing">Existing session/block</option><option value="new">New independent session</option></select></label>
        <label data-qm-event-session-wrap>Target session<select id="qmEventTargetSession">${sessions.map((session) => `<option value="${esc(session.id)}">${esc(sessionLabel(schedule, session))}</option>`).join("")}</select></label>
        <label data-qm-event-place-wrap>Placement<select id="qmEventPlacement"><option value="end">End of target session</option><option value="before">Before selected target event</option><option value="after">After selected target event</option></select></label>
        <label data-qm-event-target-wrap>Target event<select id="qmEventTargetEvent"></select></label>
        <label data-qm-new-day-wrap>New session day<select id="qmNewEventDay">${days.map((day, index) => `<option value="${esc(day.id)}">Day ${index + 1} — ${esc(dayLabel(day))}</option>`).join("")}</select></label>
        <label data-qm-new-time-wrap>New session warm-up start<input id="qmNewEventStart" type="time" value="08:00"></label>
      </div>
      <p class="qm-note">The move saves immediately and reloads the schedule so the new position is visible.</p>
      <footer class="qm-actions"><button type="button" data-qm-close>Cancel</button><button type="button" class="primary" data-qm-move-event>Apply Move</button></footer>`;
  }

  function sessionPanel(schedule) {
    const sessions = orderedSessions(schedule);
    const days = schedule.meet?.days || [];
    if (!sessions.length) return `<div class="qm-empty">No sessions or blocks were found in this schedule.</div>`;
    return `
      <div class="qm-grid">
        <label>Session or block to move<select id="qmSourceSession">${sessions.map((session) => `<option value="${esc(session.id)}">${esc(sessionLabel(schedule, session))}</option>`).join("")}</select></label>
        <label>Target day<select id="qmTargetDay">${days.map((day, index) => `<option value="${esc(day.id)}">Day ${index + 1} — ${esc(dayLabel(day))}</option>`).join("")}</select></label>
        <label>Placement<select id="qmSessionPlacement"><option value="end">End of selected day</option><option value="start">Start of selected day</option><option value="before">Before selected target</option><option value="after">After selected target</option></select></label>
        <label data-qm-session-target-wrap>Target session/block<select id="qmTargetSession"></select></label>
      </div>
      <p class="qm-note">The move saves immediately and reloads the schedule so the new order is visible.</p>
      <footer class="qm-actions"><button type="button" data-qm-close>Cancel</button><button type="button" class="primary" data-qm-move-session>Apply Move</button></footer>`;
  }

  function wireModal(modal) {
    modal.querySelector(".qm-modal")?.addEventListener("click", (event) => event.stopPropagation());
    modal.querySelectorAll("[data-qm-close]").forEach((node) => node.addEventListener("click", closeModal));
    modal.querySelectorAll("[data-qm-tab]").forEach((node) => node.addEventListener("click", (event) => {
      event.preventDefault();
      renderModal(node.dataset.qmTab);
    }));
    ["qmSourceEvent", "qmEventMode", "qmEventTargetSession", "qmEventPlacement", "qmTargetDay", "qmSourceSession", "qmSessionPlacement"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", refreshDependentSelects);
    });
    modal.querySelector("[data-qm-move-event]")?.addEventListener("click", applyEventMove);
    modal.querySelector("[data-qm-move-session]")?.addEventListener("click", applySessionMove);
  }

  function refreshDependentSelects() {
    const storage = readStorage();
    if (!storage) return;
    const schedule = storage.schedule;
    const sessions = orderedSessions(schedule).filter((session) => !session.autoTrainingForDayId);
    const source = findEvent(schedule, value("qmSourceEvent"));

    const mode = value("qmEventMode") || "existing";
    const existing = mode === "existing";
    setVisible("[data-qm-event-session-wrap]", existing);
    setVisible("[data-qm-event-place-wrap]", existing);
    setVisible("[data-qm-new-day-wrap]", !existing);
    setVisible("[data-qm-new-time-wrap]", !existing);

    const targetSessionSelect = document.getElementById("qmEventTargetSession");
    if (targetSessionSelect && source) {
      const currentValue = targetSessionSelect.value;
      targetSessionSelect.innerHTML = sessions.map((session) => `<option value="${esc(session.id)}">${esc(sessionLabel(schedule, session))}${session.id === source.session.id ? " — current" : ""}</option>`).join("");
      const preferred = sessions.find((session) => session.id !== source.session.id)?.id || source.session.id;
      targetSessionSelect.value = currentValue && sessions.some((session) => session.id === currentValue) ? currentValue : preferred;
    }

    const placement = value("qmEventPlacement") || "end";
    const needsTargetEvent = existing && (placement === "before" || placement === "after");
    setVisible("[data-qm-event-target-wrap]", needsTargetEvent);
    const targetEventSelect = document.getElementById("qmEventTargetEvent");
    if (targetEventSelect) {
      const targetSession = sessions.find((session) => session.id === value("qmEventTargetSession"));
      const choices = (targetSession?.events || []).filter((event) => eventKey(event) !== value("qmSourceEvent"));
      targetEventSelect.innerHTML = choices.map((event) => `<option value="${esc(eventKey(event))}">${esc(eventLabel(event))}</option>`).join("") || `<option value="">No target events in this session</option>`;
    }

    const newDay = document.getElementById("qmNewEventDay");
    const newStart = document.getElementById("qmNewEventStart");
    if (source && newDay && !newDay.dataset.touched) newDay.value = source.session.dayId;
    if (source && newStart && !newStart.dataset.touched) newStart.value = minutesToInput(Number(source.session.warmupStartMinutes || 480));
    newDay?.addEventListener("change", () => { newDay.dataset.touched = "1"; }, { once: true });
    newStart?.addEventListener("change", () => { newStart.dataset.touched = "1"; }, { once: true });

    const allSessions = orderedSessions(schedule);
    const targetDayId = value("qmTargetDay");
    const sourceSessionId = value("qmSourceSession");
    const sessionPlacement = value("qmSessionPlacement") || "end";
    const needsTargetSession = sessionPlacement === "before" || sessionPlacement === "after";
    setVisible("[data-qm-session-target-wrap]", needsTargetSession);
    const targetSessionForSessionMove = document.getElementById("qmTargetSession");
    if (targetSessionForSessionMove) {
      const choices = allSessions.filter((session) => session.dayId === targetDayId && session.id !== sourceSessionId);
      targetSessionForSessionMove.innerHTML = choices.map((session) => `<option value="${esc(session.id)}">${esc(sessionLabel(schedule, session))}</option>`).join("") || `<option value="">No target sessions on this day</option>`;
    }
  }

  function applyEventMove(event) {
    event?.preventDefault?.();
    const button = event?.currentTarget;
    markWorking(button, "Applying move...");
    const storage = readStorage();
    if (!storage) return showError("No saved schedule was found.", button);
    const schedule = clone(storage.schedule);
    const sourceEventId = value("qmSourceEvent");
    const source = findEvent(schedule, sourceEventId);
    if (!source) return showError("Select a valid event to move.", button);
    const sourceDay = dayById(schedule, source.session.dayId);
    if (sourceDay?.locked) return showError("The source day is locked. Unlock it before moving this event.", button);

    const mode = value("qmEventMode") || "existing";
    let targetSession = null;
    let targetDay = null;
    let insertIndex = 0;

    if (mode === "existing") {
      targetSession = schedule.sessions.find((session) => session.id === value("qmEventTargetSession"));
      if (!targetSession) return showError("Select a valid target session.", button);
      targetDay = dayById(schedule, targetSession.dayId);
      if (targetDay?.locked) return showError("The target day is locked. Unlock it before moving this event.", button);
      const placement = value("qmEventPlacement") || "end";
      insertIndex = targetSession.events.length;
      if (placement === "before" || placement === "after") {
        const targetEventId = value("qmEventTargetEvent");
        const targetIndex = targetSession.events.findIndex((candidate) => eventKey(candidate) === targetEventId);
        if (targetIndex === -1) return showError("Select a valid target event for before/after placement.", button);
        insertIndex = targetIndex + (placement === "after" ? 1 : 0);
      }
    } else {
      targetDay = dayById(schedule, value("qmNewEventDay") || source.session.dayId);
      if (!targetDay || targetDay.locked) return showError("The target day is locked or invalid.", button);
    }

    const moved = source.session.events.splice(source.index, 1)[0];
    moved.eventGroupId = makeId("group");
    moved.detailsOpen = true;

    if (mode === "existing") {
      if (targetSession.id === source.session.id && insertIndex > source.index) insertIndex -= 1;
      targetSession.events.splice(Math.max(0, Math.min(insertIndex, targetSession.events.length)), 0, moved);
      targetSession.collapsed = false;
      targetSession.warmupMinutes = Math.max(Number(targetSession.warmupMinutes || 0), Number(moved.defaultWarmupMinutes || 0), Number(schedule.profile?.timingDefaults?.warmupMinutes || 0));
      normalizeDay(schedule, targetSession.dayId, orderedSessions(schedule).filter((session) => session.dayId === targetSession.dayId));
    } else {
      const start = inputToMinutes(value("qmNewEventStart"), Number(source.session.warmupStartMinutes || targetDay.openMinutes || 480));
      schedule.sessions.push(createSessionForEvent(schedule, moved, targetDay.id, start));
      normalizeDay(schedule, targetDay.id, orderedSessions(schedule).filter((session) => session.dayId === targetDay.id));
    }

    schedule.sessions = schedule.sessions.filter((session) => (session.events || []).length || session.autoTrainingForDayId);
    if (source.session.dayId !== targetDay.id) normalizeDay(schedule, source.session.dayId, orderedSessions(schedule).filter((session) => session.dayId === source.session.dayId));
    showSaving("Move applied. Reloading schedule...");
    writeStorage(storage, schedule);
  }

  function applySessionMove(event) {
    event?.preventDefault?.();
    const button = event?.currentTarget;
    markWorking(button, "Applying move...");
    const storage = readStorage();
    if (!storage) return showError("No saved schedule was found.", button);
    const schedule = clone(storage.schedule);
    const sourceSessionId = value("qmSourceSession");
    const source = schedule.sessions.find((session) => session.id === sourceSessionId);
    const targetDay = dayById(schedule, value("qmTargetDay"));
    if (!source || !targetDay) return showError("Select a valid session/block and target day.", button);
    const sourceDay = dayById(schedule, source.dayId);
    if (sourceDay?.locked || targetDay.locked) return showError("The source or target day is locked. Unlock the day before moving items.", button);
    const placement = value("qmSessionPlacement") || "end";
    const targetSessionId = value("qmTargetSession");
    if ((placement === "before" || placement === "after") && !targetSessionId) return showError("Select a target session/block for before/after placement.", button);

    const sourceDayId = source.dayId;
    source.dayId = targetDay.id;
    const targetOrder = orderedSessions(schedule).filter((session) => session.dayId === targetDay.id && session.id !== source.id);
    let insertIndex = placement === "start" ? 0 : targetOrder.length;
    if (placement === "before" || placement === "after") {
      const targetIndex = targetOrder.findIndex((session) => session.id === targetSessionId);
      if (targetIndex === -1) return showError("The selected target session/block was not found.", button);
      insertIndex = targetIndex + (placement === "after" ? 1 : 0);
    }
    targetOrder.splice(insertIndex, 0, source);
    normalizeDay(schedule, targetDay.id, targetOrder);
    if (sourceDayId !== targetDay.id) normalizeDay(schedule, sourceDayId, orderedSessions(schedule).filter((session) => session.dayId === sourceDayId));
    showSaving("Move applied. Reloading schedule...");
    writeStorage(storage, schedule);
  }

  function createSessionForEvent(schedule, event, dayId, startMinutes) {
    const defaults = schedule.profile?.timingDefaults || {};
    return {
      id: makeId("session"),
      dayId,
      title: "Session",
      warmupStartMinutes: Math.max(0, Number(startMinutes || 0)),
      warmupMinutes: Math.max(Number(event.defaultWarmupMinutes || 0), Number(defaults.warmupMinutes || 35)),
      transitionBufferMinutes: Number(defaults.transitionBufferMinutes || 5),
      roundingIncrementMinutes: Number(defaults.roundingIncrementMinutes || 5),
      locked: false,
      collapsed: false,
      awardsEnabled: event.round === "Final",
      events: [event],
    };
  }

  function normalizeDay(schedule, dayId, ordered) {
    const day = dayById(schedule, dayId);
    if (!day || !ordered.length) return;
    const rounding = Number(schedule.profile?.timingDefaults?.roundingIncrementMinutes || 5);
    let cursor = Number(day.openMinutes || 480);
    ordered.forEach((session) => {
      const step = Number(session.roundingIncrementMinutes || rounding || 5);
      session.dayId = dayId;
      session.locked = false;
      session.warmupStartMinutes = roundUp(cursor, step);
      cursor = roundUp(sessionEnd(schedule, session), step);
    });
  }

  function sessionEnd(schedule, session) {
    const start = Number(session.warmupStartMinutes || 0);
    if (isManualBlock(session)) return start + Math.max(5, Number(session.events?.[0]?.customDurationMinutes || 60));
    const defaults = schedule.profile?.timingDefaults || {};
    const step = Number(session.roundingIncrementMinutes || defaults.roundingIncrementMinutes || 5);
    const eventStart = roundUp(start + Number(session.warmupMinutes || 0), step);
    const transition = Number(session.transitionBufferMinutes || 0);
    let end = eventStart;
    (session.events || []).forEach((event, index) => {
      const groupStart = index === 0 ? eventStart : roundUp(end + transition, step);
      end = Math.max(end, groupStart + eventDuration(event));
    });
    if ((session.events || []).some((event) => event.round === "Final") && session.awardsEnabled !== false) end += Number(defaults.awardsMinutes || 15);
    return end;
  }

  function eventDuration(event) {
    if (!isCompetitionEvent(event) && Number(event.customDurationMinutes || 0) > 0) return Math.max(5, Number(event.customDurationMinutes || 0));
    const raw = (Math.max(0, Number(event.numberOfDivers || 0)) * Math.max(0, Number(event.numberOfDives || event.defaultNumberOfDives || event.defaultDives || 0)) * Math.max(0, Number(event.secondsPerDive || 0))) / 60;
    const split = Boolean(event.manualSplit) && laneKey(event) !== "platform";
    const panels = split ? Math.max(0, Number(event.numberOfPanelChanges || 0)) * Math.max(0, Number(event.minutesPerPanelChange || 0)) : 0;
    return Math.max(5, (split ? raw / 2 : raw) + panels);
  }

  function isCompetitionEvent(event) {
    const round = String(event.round || "").toLowerCase();
    const level = String(event.level || "").toLowerCase();
    return ["qualifier", "prelim", "semifinal", "final"].includes(round) && !["schedule", "open", "custom"].includes(level);
  }

  function isManualBlock(session) {
    return Boolean(session?.isOpenPracticeSession || session?.autoTrainingForDayId);
  }

  function findEvent(schedule, idValue) {
    for (const session of schedule.sessions || []) {
      const index = (session.events || []).findIndex((event) => eventKey(event) === idValue);
      if (index !== -1) return { session, index, event: session.events[index] };
    }
    return null;
  }

  function orderedSessions(schedule) {
    const dayOrder = new Map((schedule.meet?.days || []).map((day, index) => [day.id, index]));
    return [...(schedule.sessions || [])].sort((a, b) => {
      const dayCompare = (dayOrder.get(a.dayId) ?? 999) - (dayOrder.get(b.dayId) ?? 999);
      if (dayCompare) return dayCompare;
      return Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
    });
  }

  function dayById(schedule, dayId) {
    return (schedule.meet?.days || []).find((day) => day.id === dayId);
  }

  function eventKey(event) {
    return String(event?.scheduleEventId || event?.id || event?.canonicalKey || "");
  }

  function sessionLabel(schedule, session) {
    const day = dayById(schedule, session.dayId);
    const title = String(session.title || session.events?.[0]?.blockTitle || "Session").trim();
    return `${dayLabel(day)} — ${time(session.warmupStartMinutes)} — ${title}`;
  }

  function eventLabel(event) {
    const display = String(event.display || "").trim();
    const fallback = [event.level, event.gender, event.apparatus, event.round].filter(Boolean).join(" ");
    return display || fallback || "Scheduled event";
  }

  function dayLabel(day) {
    if (!day?.date) return "Unscheduled day";
    const date = new Date(`${day.date}T12:00:00`);
    if (Number.isNaN(date.getTime())) return day.date;
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function laneKey(event) {
    const text = String(event?.apparatus || "").toLowerCase();
    if (["1m", "1-meter", "1 meter"].includes(text)) return "1m";
    if (["3m", "3-meter", "3 meter"].includes(text)) return "3m";
    if (["platform", "10m", "10-meter", "10 meter"].includes(text)) return "platform";
    return "other";
  }

  function minutesToInput(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function inputToMinutes(input, fallback) {
    const match = String(input || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return Number(fallback || 480);
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function time(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const h24 = Math.floor(total / 60) % 24;
    const min = total % 60;
    return `${h24 % 12 || 12}:${String(min).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
  }

  function roundUp(minutes, increment) {
    const step = Math.max(1, Number(increment || 5));
    return Math.ceil(Number(minutes || 0) / step) * step;
  }

  function setVisible(selector, visible) {
    const node = document.querySelector(selector);
    if (node) node.style.display = visible ? "block" : "none";
  }

  function value(id) {
    return document.getElementById(id)?.value || "";
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function markWorking(button, text) {
    if (!button) return;
    button.disabled = true;
    button.dataset.originalText = button.textContent || "Apply Move";
    button.textContent = text || "Working...";
  }

  function restoreButton(button) {
    if (!button) return;
    button.disabled = false;
    button.textContent = button.dataset.originalText || "Apply Move";
  }

  function showError(message, button) {
    restoreButton(button);
    let error = document.querySelector(`#${MODAL_ID} .qm-error`);
    if (!error) {
      error = document.createElement("div");
      error.className = "qm-error";
      document.querySelector(`#${MODAL_ID} .qm-body`)?.prepend(error);
    }
    error.textContent = message;
  }

  function showSaving(message) {
    const body = document.querySelector(`#${MODAL_ID} .qm-body`);
    if (body) body.innerHTML = `<div class="qm-saving">${esc(message || "Move applied. Reloading schedule...")}</div>`;
  }

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      button[onclick*='pickMove'],button[onclick*='moveEventPrompt'],.move-mode-panel,.session-slot-drop-zone,.click-drop-ready{display:none!important}
      #${BUTTON_ID}{position:fixed;right:18px;bottom:18px;z-index:10000;border:0;border-radius:999px;padding:12px 18px;background:#E31937;color:#fff;font-weight:900;box-shadow:0 12px 28px rgba(0,0,0,.22);cursor:pointer}
      .qm-backdrop{position:fixed;inset:0;z-index:10001;background:rgba(8,16,40,.6);display:flex;align-items:center;justify-content:center;padding:18px}
      .qm-modal{width:min(980px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.3);border:1px solid rgba(23,31,105,.18);color:#111827}
      .qm-header{display:flex;justify-content:space-between;gap:18px;padding:24px 26px 16px;background:linear-gradient(135deg,#171F69,#26358f);color:#fff;border-radius:22px 22px 0 0}.qm-header span{font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#8FC3EA}.qm-header h2{margin:3px 0 6px;font-size:25px}.qm-header p{margin:0;opacity:.86;max-width:740px}.qm-close{width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;font-size:24px;cursor:pointer}
      .qm-tabs{display:flex;gap:8px;padding:14px 26px;background:#f7f9fc;border-bottom:1px solid rgba(23,31,105,.1)}.qm-tabs button{border:1px solid rgba(23,31,105,.18);border-radius:999px;background:#fff;color:#171F69;padding:9px 14px;font-weight:850;cursor:pointer}.qm-tabs button.active{background:#171F69;color:#fff}
      .qm-body{padding:22px 26px}.qm-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.qm-grid label{display:block;font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#5F6062}.qm-grid select,.qm-grid input{display:block;width:100%;margin-top:6px;border:1px solid rgba(23,31,105,.18);border-radius:12px;padding:10px;font:inherit;background:#fff;color:#111827}.qm-note{margin:14px 0;color:#5F6062}.qm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.qm-actions button{border:1px solid rgba(23,31,105,.2);background:#fff;color:#171F69;border-radius:999px;padding:10px 16px;font-weight:850;cursor:pointer}.qm-actions button.primary{border:0;background:#E31937;color:#fff}.qm-actions button:disabled{opacity:.65;cursor:wait}.qm-empty,.qm-error{padding:12px 14px;border:1px solid #fecdd3;background:#fff1f2;color:#9f1239;border-radius:14px;font-weight:800;margin-bottom:12px}.qm-saving{padding:18px;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;border-radius:14px;font-weight:850}
      @media(max-width:760px){.qm-grid{grid-template-columns:1fr}.qm-backdrop{align-items:flex-start;padding:8px}.qm-modal{max-height:96vh}#${BUTTON_ID}{right:12px;bottom:12px}}
    `;
    document.head.appendChild(style);
  }
})();
