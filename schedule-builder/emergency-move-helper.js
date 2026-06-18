(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const STYLE_ID = "emergencyMoveHelperStyles";
  const MODAL_ID = "emergencyMoveModal";
  const BUTTON_ID = "emergencyMoveButton";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(() => {
    injectStyles();
    installQuickMoveButton();
    installDragCleanup();
    installBrokenMoveUiSuppressor();
  });

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
    window.setTimeout(() => window.location.reload(), 120);
  }

  function installQuickMoveButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Move Schedule Item";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openModal("event");
    }, true);
    document.body.appendChild(button);
  }

  function installBrokenMoveUiSuppressor() {
    const hideOldControls = () => {
      document.querySelectorAll("button[onclick*='pickMove'], button[onclick*='moveEventPrompt'], .move-mode-panel, .session-slot-drop-zone, .click-drop-ready")
        .forEach((node) => {
          node.setAttribute("aria-hidden", "true");
          node.style.display = "none";
        });
      document.querySelectorAll("[draggable='true']").forEach((node) => node.setAttribute("draggable", "false"));
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

  function openModal(tab = "event") {
    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = MODAL_ID;
      document.body.appendChild(modal);
    }
    renderModal(tab);
  }

  function closeModal() {
    document.getElementById(MODAL_ID)?.remove();
  }

  function renderModal(tab) {
    const storage = readStorage();
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    if (!storage) {
      modal.innerHTML = shell("event", `<div class="qm-empty">No saved schedule was found. Save or reload the schedule, then try again.</div>`);
      wireModal(modal);
      return;
    }
    modal.innerHTML = shell(tab, tab === "session" ? sessionPanel(storage.schedule) : eventPanel(storage.schedule));
    wireModal(modal);
    refreshDependentSelects();
  }

  function shell(tab, body) {
    return `
      <div class="qm-backdrop" data-qm-backdrop>
        <section class="qm-modal" role="dialog" aria-modal="true" aria-label="Move schedule item">
          <header class="qm-header">
            <div><span>Schedule movement</span><h2>Move Schedule Item</h2><p>This replaces the old drag/drop and "drop here" movement controls. Choose the item and exact destination, then apply the move.</p></div>
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

  function sessionPanel(schedule) {
    const sessions = orderedSessions(schedule);
    const days = schedule.meet?.days || [];
    return `
      <div class="qm-grid">
        <label>Session or block to move<select id="qmSourceSession">${sessions.map((session) => `<option value="${esc(session.id)}">${esc(sessionLabel(schedule, session))}</option>`).join("")}</select></label>
        <label>Target day<select id="qmTargetDay">${days.map((day, index) => `<option value="${esc(day.id)}">Day ${index + 1} — ${esc(dayLabel(day))}</option>`).join("")}</select></label>
        <label>Placement<select id="qmSessionPlacement"><option value="end">End of selected day</option><option value="start">Start of selected day</option><option value="before">Before selected target</option><option value="after">After selected target</option></select></label>
        <label data-qm-session-target-wrap>Target session/block<select id="qmTargetSession"></select></label>
      </div>
      <p class="qm-note">This will move the selected session or block and resequence the affected day so the schedule remains usable.</p>
      <footer class="qm-actions"><button type="button" data-qm-close>Cancel</button><button type="button" class="primary" data-qm-move-session>Move Session / Block</button></footer>`;
  }

  function eventPanel(schedule) {
    const sessions = orderedSessions(schedule).filter((session) => !session.autoTrainingForDayId);
    const events = sessions.flatMap((session) => (session.events || []).map((event) => ({ session, event })));
    const days = schedule.meet?.days || [];
    return `
      <div class="qm-grid">
        <label>Event to move<select id="qmSourceEvent">${events.map(({ session, event }) => `<option value="${esc(event.scheduleEventId)}">${esc(eventLabel(event))} — ${esc(sessionLabel(schedule, session))}</option>`).join("")}</select></label>
        <label>Destination type<select id="qmEventMode"><option value="existing">Existing session/block</option><option value="new">New independent session</option></select></label>
        <label data-qm-event-session-wrap>Target session<select id="qmEventTargetSession">${sessions.map((session) => `<option value="${esc(session.id)}">${esc(sessionLabel(schedule, session))}</option>`).join("")}</select></label>
        <label data-qm-event-place-wrap>Placement<select id="qmEventPlacement"><option value="end">End of target session</option><option value="before">Before selected target event</option><option value="after">After selected target event</option></select></label>
        <label data-qm-event-target-wrap>Target event<select id="qmEventTargetEvent"></select></label>
        <label data-qm-new-day-wrap>New session day<select id="qmNewEventDay">${days.map((day, index) => `<option value="${esc(day.id)}">Day ${index + 1} — ${esc(dayLabel(day))}</option>`).join("")}</select></label>
        <label data-qm-new-time-wrap>New session warm-up start<input id="qmNewEventStart" type="time" value="08:00"></label>
      </div>
      <p class="qm-note">This does not use drag-and-drop. It directly moves the saved schedule item and reloads the schedule after the change is applied.</p>
      <footer class="qm-actions"><button type="button" data-qm-close>Cancel</button><button type="button" class="primary" data-qm-move-event>Move Event</button></footer>`;
  }

  function wireModal(modal) {
    modal.addEventListener("click", (event) => event.stopPropagation(), true);
    modal.querySelectorAll("[data-qm-close]").forEach((node) => node.addEventListener("click", closeModal));
    modal.querySelectorAll("[data-qm-tab]").forEach((node) => node.addEventListener("click", (event) => {
      event.preventDefault();
      renderModal(node.dataset.qmTab);
    }));
    ["qmTargetDay", "qmSessionPlacement", "qmSourceSession", "qmEventMode", "qmEventTargetSession", "qmEventPlacement", "qmSourceEvent"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", refreshDependentSelects);
    });
    modal.querySelector("[data-qm-move-session]")?.addEventListener("click", applySessionMove);
    modal.querySelector("[data-qm-move-event]")?.addEventListener("click", applyEventMove);
  }

  function refreshDependentSelects() {
    const storage = readStorage();
    if (!storage) return;
    const schedule = storage.schedule;
    const sessions = orderedSessions(schedule);

    const targetDayId = value("qmTargetDay");
    const sourceSessionId = value("qmSourceSession");
    const placement = value("qmSessionPlacement");
    const targetWrap = document.querySelector("[data-qm-session-target-wrap]");
    const targetSelect = document.getElementById("qmTargetSession");
    if (targetWrap && targetSelect) {
      const needsTarget = placement === "before" || placement === "after";
      targetWrap.style.display = needsTarget ? "block" : "none";
      const choices = sessions.filter((session) => session.dayId === targetDayId && session.id !== sourceSessionId);
      targetSelect.innerHTML = choices.map((session) => `<option value="${esc(session.id)}">${esc(sessionLabel(schedule, session))}</option>`).join("") || `<option value="">No target sessions on this day</option>`;
    }

    const eventMode = value("qmEventMode") || "existing";
    const showExisting = eventMode === "existing";
    ["[data-qm-event-session-wrap]", "[data-qm-event-place-wrap]", "[data-qm-event-target-wrap]"].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node) node.style.display = showExisting ? "block" : "none";
    });
    ["[data-qm-new-day-wrap]", "[data-qm-new-time-wrap]"].forEach((selector) => {
      const node = document.querySelector(selector);
      if (node) node.style.display = showExisting ? "none" : "block";
    });

    const targetSessionId = value("qmEventTargetSession");
    const eventPlacement = value("qmEventPlacement") || "end";
    const eventTargetWrap = document.querySelector("[data-qm-event-target-wrap]");
    const eventTargetSelect = document.getElementById("qmEventTargetEvent");
    if (eventTargetWrap && eventTargetSelect) {
      const needsTargetEvent = showExisting && (eventPlacement === "before" || eventPlacement === "after");
      eventTargetWrap.style.display = needsTargetEvent ? "block" : "none";
      const targetSession = sessions.find((session) => session.id === targetSessionId);
      const sourceEventId = value("qmSourceEvent");
      const choices = (targetSession?.events || []).filter((event) => event.scheduleEventId !== sourceEventId);
      eventTargetSelect.innerHTML = choices.map((event) => `<option value="${esc(event.scheduleEventId)}">${esc(eventLabel(event))}</option>`).join("") || `<option value="">No target events in this session</option>`;
    }

    const source = findEvent(schedule, value("qmSourceEvent"));
    const newDay = document.getElementById("qmNewEventDay");
    const newStart = document.getElementById("qmNewEventStart");
    if (source && newDay && !newDay.dataset.touched) newDay.value = source.session.dayId;
    if (source && newStart && !newStart.dataset.touched) newStart.value = minutesToInput(Number(source.session.warmupStartMinutes || 480));
    newDay?.addEventListener("change", () => { newDay.dataset.touched = "1"; }, { once: true });
    newStart?.addEventListener("change", () => { newStart.dataset.touched = "1"; }, { once: true });
  }

  function applySessionMove() {
    const storage = readStorage();
    if (!storage) return showError("No saved schedule was found.");
    const schedule = clone(storage.schedule);
    const sourceSessionId = value("qmSourceSession");
    const targetDayId = value("qmTargetDay");
    const placement = value("qmSessionPlacement") || "end";
    const targetSessionId = value("qmTargetSession");
    const source = schedule.sessions.find((session) => session.id === sourceSessionId);
    const targetDay = (schedule.meet?.days || []).find((day) => day.id === targetDayId);
    const sourceDay = (schedule.meet?.days || []).find((day) => day.id === source?.dayId);
    if (!source || !targetDay) return showError("Select a valid session/block and target day.");
    if (sourceDay?.locked || targetDay.locked) return showError("The source or target day is locked. Unlock the day before moving items.");
    if ((placement === "before" || placement === "after") && !targetSessionId) return showError("Select a target session/block for before/after placement.");

    const sourceDayId = source.dayId;
    source.dayId = targetDayId;
    source.locked = false;
    const targetOrder = orderedSessions(schedule).filter((session) => session.dayId === targetDayId && session.id !== source.id);
    let insertIndex = placement === "start" ? 0 : targetOrder.length;
    if (placement === "before" || placement === "after") {
      const targetIndex = targetOrder.findIndex((session) => session.id === targetSessionId);
      if (targetIndex === -1) return showError("The selected target session/block was not found.");
      insertIndex = targetIndex + (placement === "after" ? 1 : 0);
    }
    targetOrder.splice(insertIndex, 0, source);
    normalizeDay(schedule, targetDayId, targetOrder);
    if (sourceDayId !== targetDayId) normalizeDay(schedule, sourceDayId, orderedSessions(schedule).filter((session) => session.dayId === sourceDayId));
    writeStorage(storage, schedule);
    showSaving();
  }

  function applyEventMove() {
    const storage = readStorage();
    if (!storage) return showError("No saved schedule was found.");
    const schedule = clone(storage.schedule);
    const sourceEventId = value("qmSourceEvent");
    const source = findEvent(schedule, sourceEventId);
    if (!source) return showError("Select a valid event to move.");
    const mode = value("qmEventMode") || "existing";
    const sourceDay = (schedule.meet?.days || []).find((day) => day.id === source.session.dayId);
    if (sourceDay?.locked) return showError("The source day is locked. Unlock it before moving this event.");

    const moved = source.session.events.splice(source.index, 1)[0];
    moved.eventGroupId = makeId("group");
    moved.detailsOpen = true;

    if (mode === "new") {
      const dayId = value("qmNewEventDay") || source.session.dayId;
      const targetDay = (schedule.meet?.days || []).find((day) => day.id === dayId);
      if (!targetDay || targetDay.locked) return showError("The target day is locked or invalid.");
      const newSession = createSessionForEvent(schedule, moved, dayId, inputToMinutes(value("qmNewEventStart"), Number(source.session.warmupStartMinutes || targetDay.openMinutes || 480)));
      schedule.sessions.push(newSession);
      normalizeDay(schedule, dayId, orderedSessions(schedule).filter((session) => session.dayId === dayId));
    } else {
      const targetSessionId = value("qmEventTargetSession");
      const targetSession = schedule.sessions.find((session) => session.id === targetSessionId);
      if (!targetSession) return showError("Select a valid target session.");
      const targetDay = (schedule.meet?.days || []).find((day) => day.id === targetSession.dayId);
      if (targetDay?.locked) return showError("The target day is locked. Unlock it before moving this event.");
      const placement = value("qmEventPlacement") || "end";
      let insertIndex = targetSession.events.length;
      if (placement === "before" || placement === "after") {
        const targetEventId = value("qmEventTargetEvent");
        const targetIndex = targetSession.events.findIndex((event) => event.scheduleEventId === targetEventId);
        if (targetIndex === -1) return showError("Select a valid target event for before/after placement.");
        insertIndex = targetIndex + (placement === "after" ? 1 : 0);
      }
      targetSession.events.splice(insertIndex, 0, moved);
      targetSession.collapsed = false;
      targetSession.warmupMinutes = Math.max(Number(targetSession.warmupMinutes || 0), Number(moved.defaultWarmupMinutes || 0), Number(schedule.profile?.timingDefaults?.warmupMinutes || 0));
    }

    schedule.sessions = schedule.sessions.filter((session) => (session.events || []).length || session.autoTrainingForDayId);
    writeStorage(storage, schedule);
    showSaving();
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
    const day = (schedule.meet?.days || []).find((item) => item.id === dayId);
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
    const laneCursors = new Map();
    groupedEvents(session).forEach((group) => {
      const lane = laneKey(group[0]);
      const groupStart = laneCursors.has(lane) ? laneCursors.get(lane) : eventStart;
      const groupEnd = group.reduce((max, event) => Math.max(max, groupStart + eventDuration(event)), groupStart);
      end = Math.max(end, groupEnd);
      laneCursors.set(lane, roundUp(groupEnd + transition, step));
    });
    if ((session.events || []).some((event) => event.round === "Final") && session.awardsEnabled !== false) end += Number(defaults.awardsMinutes || 15);
    return end;
  }

  function groupedEvents(session) {
    const groups = [];
    const seen = new Map();
    (session.events || []).forEach((event) => {
      const key = event.eventGroupId || event.scheduleEventId || event.id || `group-${groups.length}`;
      if (!seen.has(key)) {
        const group = [];
        seen.set(key, group);
        groups.push(group);
      }
      seen.get(key).push(event);
    });
    return groups;
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

  function findEvent(schedule, eventId) {
    for (const session of schedule.sessions || []) {
      const index = (session.events || []).findIndex((event) => event.scheduleEventId === eventId);
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

  function sessionLabel(schedule, session) {
    const day = (schedule.meet?.days || []).find((item) => item.id === session.dayId);
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

  function time(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const h24 = Math.floor(total / 60) % 24;
    const min = total % 60;
    return `${h24 % 12 || 12}:${String(min).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
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

  function roundUp(minutes, increment) {
    const step = Math.max(1, Number(increment || 5));
    return Math.ceil(Number(minutes || 0) / step) * step;
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

  function showError(message) {
    let error = document.querySelector(`#${MODAL_ID} .qm-error`);
    if (!error) {
      error = document.createElement("div");
      error.className = "qm-error";
      document.querySelector(`#${MODAL_ID} .qm-body`)?.prepend(error);
    }
    error.textContent = message;
  }

  function showSaving() {
    const body = document.querySelector(`#${MODAL_ID} .qm-body`);
    if (body) body.innerHTML = `<div class="qm-saving">Move applied. Reloading the schedule…</div>`;
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
      .qm-body{padding:22px 26px}.qm-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.qm-grid label{display:block;font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#5F6062}.qm-grid select,.qm-grid input{display:block;width:100%;margin-top:6px;border:1px solid rgba(23,31,105,.18);border-radius:12px;padding:10px;font:inherit;background:#fff;color:#111827}.qm-note{margin:14px 0;color:#5F6062}.qm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.qm-actions button{border:1px solid rgba(23,31,105,.2);background:#fff;color:#171F69;border-radius:999px;padding:10px 16px;font-weight:850;cursor:pointer}.qm-actions button.primary{border:0;background:#E31937;color:#fff}.qm-empty,.qm-error{padding:12px 14px;border:1px solid #fecdd3;background:#fff1f2;color:#9f1239;border-radius:14px;font-weight:800;margin-bottom:12px}.qm-saving{padding:18px;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;border-radius:14px;font-weight:850}
      @media(max-width:760px){.qm-grid{grid-template-columns:1fr}.qm-backdrop{align-items:flex-start;padding:8px}.qm-modal{max-height:96vh}#${BUTTON_ID}{right:12px;bottom:12px}}
    `;
    document.head.appendChild(style);
  }
})();
