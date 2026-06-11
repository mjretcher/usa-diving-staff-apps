(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const MODAL_ID = "eventPlacementModal";
  const STYLE_ID = "eventPlacementHelperStyles";

  let originalAddPresetEvent = null;
  let originalSelectCatalogEvent = null;
  let selectModalTimer = null;

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(() => waitForActions(install));

  function waitForActions(callback, attempts = 0) {
    if (window.actions && typeof window.actions.addPresetEvent === "function" && typeof window.actions.selectCatalogEvent === "function") {
      callback();
      return;
    }
    if (attempts > 80) return;
    window.setTimeout(() => waitForActions(callback, attempts + 1), 50);
  }

  function install() {
    if (window.__usaDivingEventPlacementInstalled) return;
    window.__usaDivingEventPlacementInstalled = true;
    injectStyles();

    originalAddPresetEvent = window.actions.addPresetEvent.bind(window.actions);
    originalSelectCatalogEvent = window.actions.selectCatalogEvent.bind(window.actions);

    window.actions.selectCatalogEvent = function patchedSelectCatalogEvent(eventId) {
      originalSelectCatalogEvent(eventId);
      clearSelectTimer();
      selectModalTimer = window.setTimeout(() => {
        selectModalTimer = null;
        if (!window.__eventPlacementBypassSelectModal) openPlacementModal();
      }, 0);
    };

    window.actions.addPresetEvent = function patchedAddPresetEvent() {
      if (window.__eventPlacementConfirmedAdd) return originalAddPresetEvent();
      clearSelectTimer();
      openPlacementModal();
    };

    window.actions.closeEventPlacementModal = closePlacementModal;
    window.actions.eventPlacementModalChanged = renderPlacementModal;
    window.actions.confirmEventPlacementModal = confirmPlacement;
  }

  function clearSelectTimer() {
    if (selectModalTimer) window.clearTimeout(selectModalTimer);
    selectModalTimer = null;
  }

  function currentState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && parsed.meet && parsed.profile) return parsed;
    } catch (_) {}
    return null;
  }

  function selectedPreset(state) {
    const events = state?.profile?.events || [];
    return events.find((event) => event.id === state.selectedEventId) || events[0] || null;
  }

  function allowedRounds(state, preset) {
    const profileRounds = new Set(state?.profile?.allowedRounds || []);
    return (preset?.allowedRounds || []).filter((round) => profileRounds.has(round));
  }

  function canonicalKeyFor(preset, round) {
    if (!preset) return "";
    return [preset.level, preset.gender, preset.apparatus, preset.style, round].map((part) => String(part || "").trim()).join(" | ");
  }

  function isDuplicate(state, key) {
    if (!key) return false;
    return (state.sessions || []).some((session) => (session.events || []).some((event) => event.canonicalKey === key));
  }

  function eventName(event) {
    if (!event) return "Selected event";
    if (event.display) return String(event.display);
    return [event.level, event.gender, apparatusDisplay(event.apparatus)].filter(Boolean).join(" ") || event.id || "Selected event";
  }

  function apparatusDisplay(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^1m$/i.test(text)) return "1-Meter";
    if (/^3m$/i.test(text)) return "3-Meter";
    if (/^10m$/i.test(text)) return "10-Meter";
    return text;
  }

  function minutesToTime(minutes) {
    const total = Math.max(0, Number(minutes || 0));
    const hours = Math.floor(total / 60) % 24;
    const mins = Math.floor(total % 60);
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }

  function displayTime(minutes) {
    const total = Math.max(0, Number(minutes || 0));
    const hours24 = Math.floor(total / 60) % 24;
    const mins = Math.floor(total % 60);
    const suffix = hours24 >= 12 ? "PM" : "AM";
    const hours = hours24 % 12 || 12;
    return `${hours}:${String(mins).padStart(2, "0")} ${suffix}`;
  }

  function parseTimeInput(value, fallback) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return Number(fallback || 0);
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function roundUp(value, increment) {
    const step = Math.max(1, Number(increment || 5));
    return Math.ceil(Number(value || 0) / step) * step;
  }

  function estimateEventMinutes(event, state) {
    if (!event) return 0;
    const custom = Number(event.customDurationMinutes || 0);
    if (custom > 0) return custom;
    const divers = Number(event.numberOfDivers || event.defaultNumberOfDivers || 0);
    const dives = Number(event.numberOfDives || event.defaultNumberOfDives || event.defaultDives || 0);
    const seconds = Number(event.secondsPerDive || event.defaultSecondsPerDive || state?.profile?.timingDefaults?.secondsPerDive || 0);
    const panels = Number(event.numberOfPanelChanges || 0) * Number(event.minutesPerPanelChange || state?.profile?.timingDefaults?.panelChangeMinutes || 0);
    return (divers * dives * seconds) / 60 + panels;
  }

  function estimateSessionEnd(session, state) {
    const start = Number(session.warmupStartMinutes || 0);
    const warmup = Number(session.warmupMinutes || 0);
    const buffer = Number(session.transitionBufferMinutes || 0);
    const eventStart = start + warmup + buffer;
    const eventMinutes = Math.max(0, ...(session.events || []).map((event) => estimateEventMinutes(event, state)));
    return eventStart + eventMinutes;
  }

  function defaultStartForDay(state, dayId) {
    const day = (state.meet?.days || []).find((item) => item.id === dayId) || state.meet?.days?.[0] || {};
    const sessions = (state.sessions || []).filter((session) => session.dayId === dayId);
    const latest = sessions.reduce((max, session) => Math.max(max, estimateSessionEnd(session, state)), Number(day.openMinutes || 480));
    return roundUp(latest, Number(state.profile?.timingDefaults?.roundingIncrementMinutes || 5));
  }

  function shortDayLabel(day, index) {
    const date = String(day?.date || "");
    if (!date) return `Day ${index + 1}`;
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return `Day ${index + 1} - ${date}`;
    return `Day ${index + 1} - ${parsed.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;
  }

  function sessionLabel(session, state) {
    const day = (state.meet?.days || []).find((item) => item.id === session.dayId);
    const events = (session.events || []).map(eventName).slice(0, 3).join(", ");
    const title = String(session.title || "Session").trim() || "Session";
    const start = displayTime(session.warmupStartMinutes || 0);
    const eventStart = displayTime(Number(session.warmupStartMinutes || 0) + Number(session.warmupMinutes || 0) + Number(session.transitionBufferMinutes || 0));
    return `${shortDayLabel(day || {}, 0)} | ${title} | warm-up ${start} / event ${eventStart}${events ? ` | ${events}` : ""}`;
  }

  function openPlacementModal() {
    const state = currentState();
    const preset = selectedPreset(state);
    if (!state || !preset) return;
    const rounds = allowedRounds(state, preset);
    if (!rounds.length) return;
    const selectedRound = rounds.includes(state.selectedRound) ? state.selectedRound : rounds[0];
    if (window.actions?.selectRound && state.selectedRound !== selectedRound) window.actions.selectRound(selectedRound);

    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = MODAL_ID;
      document.body.appendChild(modal);
    }
    renderPlacementModal();
  }

  function closePlacementModal() {
    document.getElementById(MODAL_ID)?.remove();
  }

  function renderPlacementModal() {
    const state = currentState();
    const modal = document.getElementById(MODAL_ID);
    if (!modal || !state) return;

    const preset = selectedPreset(state);
    const days = state.meet?.days || [];
    const rounds = allowedRounds(state, preset);
    const selectedRound = rounds.includes(state.selectedRound) ? state.selectedRound : rounds[0] || "Final";
    const selectedDayId = modal.querySelector("#epDay")?.value || days[0]?.id || "";
    const placementMode = modal.querySelector("input[name='epPlacementMode']:checked")?.value || "new";
    const currentKey = canonicalKeyFor(preset, selectedRound);
    const duplicate = isDuplicate(state, currentKey);
    const warmupDefault = Number(preset?.defaultWarmupMinutes || state.profile?.timingDefaults?.warmupMinutes || 35);
    const bufferDefault = Number(state.profile?.timingDefaults?.transitionBufferMinutes || 5);
    const startDefault = defaultStartForDay(state, selectedDayId);
    const sessionNameValue = modal.querySelector("#epSessionName")?.value || `${eventName(preset)} ${selectedRound} Session`;
    const warmupStartValue = modal.querySelector("#epWarmupStart")?.value || minutesToTime(startDefault);
    const warmupMinutesValue = modal.querySelector("#epWarmupMinutes")?.value || String(warmupDefault);
    const bufferValue = modal.querySelector("#epBufferMinutes")?.value || String(bufferDefault);
    const existingSessions = (state.sessions || []).filter((session) => session.dayId === selectedDayId && !session.isOpenPracticeSession);
    const allExistingSessions = (state.sessions || []).filter((session) => session.dayId === selectedDayId);
    const sessionOptions = (existingSessions.length ? existingSessions : allExistingSessions);
    const targetSessionId = modal.querySelector("#epTargetSession")?.value || sessionOptions[0]?.id || "";

    modal.innerHTML = `
      <div class="ep-backdrop" role="presentation">
        <section class="ep-modal" role="dialog" aria-modal="true" aria-label="Add Event to Schedule">
          <header class="ep-header">
            <div>
              <span class="ep-kicker">Event placement</span>
              <h2>Add Event to Schedule</h2>
              <p>Select the day and decide whether this event creates a new session or joins an existing session.</p>
            </div>
            <button type="button" class="ep-icon" onclick="actions.closeEventPlacementModal()" aria-label="Close">×</button>
          </header>

          <div class="ep-summary">
            <div><span>Selected event</span><strong>${escapeHtml(eventName(preset))}</strong></div>
            <div><span>Round / stage</span><select id="epRound" onchange="actions.selectRound(this.value); actions.eventPlacementModalChanged();">${rounds.map((round) => `<option value="${escapeHtml(round)}" ${round === selectedRound ? "selected" : ""}>${escapeHtml(round)}</option>`).join("")}</select></div>
            <div><span>Apparatus</span><strong>${escapeHtml(apparatusDisplay(preset?.apparatus))}</strong></div>
            <div><span>Dives</span><strong>${escapeHtml(String(preset?.defaultDives ?? preset?.defaultNumberOfDives ?? "--"))}</strong></div>
          </div>

          ${duplicate ? `<div class="ep-message ep-error">This event round is already in the schedule.</div>` : ""}

          <div class="ep-grid">
            <label>Day assignment
              <select id="epDay" onchange="actions.eventPlacementModalChanged()" required>
                ${days.map((day, index) => `<option value="${escapeHtml(day.id)}" ${day.id === selectedDayId ? "selected" : ""}>${escapeHtml(shortDayLabel(day, index))}</option>`).join("")}
              </select>
            </label>

            <fieldset class="ep-placement-fieldset">
              <legend>Placement option</legend>
              <label class="ep-radio"><input type="radio" name="epPlacementMode" value="new" ${placementMode === "new" ? "checked" : ""} onchange="actions.eventPlacementModalChanged()"> Create new session/block</label>
              <label class="ep-radio"><input type="radio" name="epPlacementMode" value="existing" ${placementMode === "existing" ? "checked" : ""} onchange="actions.eventPlacementModalChanged()"> Add to existing session/block</label>
            </fieldset>
          </div>

          ${placementMode === "existing" ? `
            <div class="ep-section">
              <label>Existing session/block on selected day
                <select id="epTargetSession" ${sessionOptions.length ? "" : "disabled"}>
                  ${sessionOptions.length ? sessionOptions.map((session) => `<option value="${escapeHtml(session.id)}" ${session.id === targetSessionId ? "selected" : ""}>${escapeHtml(sessionLabel(session, state))}</option>`).join("") : `<option value="">No sessions on this day</option>`}
                </select>
              </label>
              <p class="ep-note">The added event will share the selected session warm-up and event start. The session end will update to the latest event end.</p>
            </div>
          ` : `
            <div class="ep-section ep-new-session">
              <label>Session/block name<input id="epSessionName" value="${escapeHtml(sessionNameValue)}"></label>
              <label>Session type
                <select id="epSessionType">
                  <option>Event Session</option>
                  <option>Prelim Session</option>
                  <option>Final Session</option>
                  <option>Qualifier Session</option>
                  <option>Custom</option>
                </select>
              </label>
              <label>Warm-up start<input id="epWarmupStart" type="time" value="${escapeHtml(warmupStartValue)}"></label>
              <label>Warm-up duration<input id="epWarmupMinutes" type="number" min="0" step="5" value="${escapeHtml(warmupMinutesValue)}"></label>
              <label>Transition buffer<input id="epBufferMinutes" type="number" min="0" step="1" value="${escapeHtml(bufferValue)}"></label>
              <label class="ep-check"><input id="epLockStart" type="checkbox"> Lock start time</label>
            </div>
          `}

          <footer class="ep-footer">
            <button type="button" class="ep-secondary" onclick="actions.closeEventPlacementModal()">Cancel</button>
            <button type="button" class="ep-primary" ${duplicate || (placementMode === "existing" && !targetSessionId) ? "disabled" : ""} onclick="actions.confirmEventPlacementModal()">Add to Schedule</button>
          </footer>
        </section>
      </div>
    `;
  }

  function confirmPlacement() {
    const modal = document.getElementById(MODAL_ID);
    const stateBefore = currentState();
    const preset = selectedPreset(stateBefore);
    if (!modal || !stateBefore || !preset) return;

    const selectedRound = modal.querySelector("#epRound")?.value || stateBefore.selectedRound;
    const dayId = modal.querySelector("#epDay")?.value || stateBefore.meet?.days?.[0]?.id || "";
    const placementMode = modal.querySelector("input[name='epPlacementMode']:checked")?.value || "new";
    const targetSessionId = modal.querySelector("#epTargetSession")?.value || "";
    const key = canonicalKeyFor(preset, selectedRound);

    if (isDuplicate(stateBefore, key)) {
      renderPlacementModal();
      return;
    }

    const beforeSessionIds = new Set((stateBefore.sessions || []).map((session) => session.id));

    if (window.actions?.selectRound) window.actions.selectRound(selectedRound);

    if (placementMode === "existing") {
      if (!targetSessionId) return;
      if (window.actions?.setCatalogMode) window.actions.setCatalogMode("combine");
      if (window.actions?.setCombineSession) window.actions.setCombineSession(targetSessionId);
      runConfirmedAdd();
      closePlacementModal();
      return;
    }

    const sessionName = String(modal.querySelector("#epSessionName")?.value || "").trim();
    const warmupStart = parseTimeInput(modal.querySelector("#epWarmupStart")?.value, defaultStartForDay(stateBefore, dayId));
    const warmupMinutes = Number(modal.querySelector("#epWarmupMinutes")?.value || stateBefore.profile?.timingDefaults?.warmupMinutes || 35);
    const bufferMinutes = Number(modal.querySelector("#epBufferMinutes")?.value || stateBefore.profile?.timingDefaults?.transitionBufferMinutes || 5);
    const locked = Boolean(modal.querySelector("#epLockStart")?.checked);

    if (window.actions?.setCatalogMode) window.actions.setCatalogMode("new");
    if (window.actions?.setCatalogNewDay) window.actions.setCatalogNewDay(dayId);
    runConfirmedAdd();

    const stateAfter = currentState();
    const newSession = findAddedSession(stateAfter, beforeSessionIds, key, dayId);
    if (newSession?.id && window.actions?.updateSession) {
      if (sessionName) window.actions.updateSession(newSession.id, "title", sessionName);
      window.actions.updateSession(newSession.id, "warmupStartMinutes", minutesToTime(warmupStart));
      window.actions.updateSession(newSession.id, "warmupMinutes", warmupMinutes);
      window.actions.updateSession(newSession.id, "transitionBufferMinutes", bufferMinutes);
      if (locked) window.actions.updateSession(newSession.id, "locked", true);
    }
    closePlacementModal();
  }

  function runConfirmedAdd() {
    try {
      window.__eventPlacementConfirmedAdd = true;
      originalAddPresetEvent();
    } finally {
      window.__eventPlacementConfirmedAdd = false;
    }
  }

  function findAddedSession(state, beforeSessionIds, canonicalKey, dayId) {
    if (!state) return null;
    const sessions = state.sessions || [];
    return sessions.find((session) => session.dayId === dayId && (session.events || []).some((event) => event.canonicalKey === canonicalKey)) ||
      sessions.find((session) => !beforeSessionIds.has(session.id) && session.dayId === dayId) || null;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ep-backdrop{position:fixed;inset:0;z-index:9999;background:rgba(8,16,40,.58);display:flex;align-items:center;justify-content:center;padding:22px;backdrop-filter:blur(4px)}
      .ep-modal{width:min(860px,96vw);max-height:92vh;overflow:auto;background:#fff;color:#111827;border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.28);border:1px solid rgba(23,31,105,.15)}
      .ep-header{display:flex;justify-content:space-between;gap:18px;padding:24px 26px 16px;background:linear-gradient(135deg,var(--sb-navy,#171F69),#26358f);color:#fff;border-radius:22px 22px 0 0}.ep-header h2{margin:2px 0 6px;font-size:24px}.ep-header p{margin:0;opacity:.84;max-width:620px}.ep-kicker{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--sb-sky,#8FC3EA)}.ep-icon{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;font-size:22px;cursor:pointer}.ep-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:18px 26px;background:#f7f9fc;border-bottom:1px solid rgba(23,31,105,.1)}.ep-summary div{background:#fff;border:1px solid rgba(23,31,105,.1);border-radius:14px;padding:10px}.ep-summary span,.ep-modal label,.ep-placement-fieldset legend{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#5F6062;margin-bottom:6px}.ep-summary strong{display:block;color:#171F69}.ep-summary select,.ep-modal input,.ep-modal select{width:100%;box-sizing:border-box;border:1px solid rgba(23,31,105,.18);border-radius:10px;padding:9px 10px;font:inherit;background:#fff;color:#111827}.ep-message{margin:16px 26px 0;padding:10px 12px;border-radius:12px;font-weight:700}.ep-error{background:#fff1f2;color:#9f1239;border:1px solid #fecdd3}.ep-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:20px 26px 4px}.ep-placement-fieldset{border:1px solid rgba(23,31,105,.14);border-radius:14px;padding:12px 14px}.ep-radio,.ep-check{display:flex!important;align-items:center;gap:8px;text-transform:none!important;letter-spacing:0!important;font-size:14px!important;color:#111827!important;font-weight:650!important}.ep-radio input,.ep-check input{width:auto}.ep-section{padding:14px 26px 6px}.ep-new-session{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:12px;align-items:end}.ep-note{margin:8px 0 0;color:#5F6062;font-size:13px}.ep-footer{display:flex;justify-content:flex-end;gap:10px;padding:18px 26px 24px}.ep-primary,.ep-secondary{border-radius:999px;padding:10px 18px;font-weight:800;cursor:pointer}.ep-primary{border:0;background:var(--sb-red,#E31937);color:#fff}.ep-primary:disabled{opacity:.45;cursor:not-allowed}.ep-secondary{border:1px solid rgba(23,31,105,.2);background:#fff;color:#171F69}@media(max-width:760px){.ep-summary,.ep-grid,.ep-new-session{grid-template-columns:1fr}.ep-backdrop{align-items:flex-start;padding:10px}.ep-modal{max-height:96vh}}
    `;
    document.head.appendChild(style);
  }
})();
