(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const BUTTON_CLASS = "session-text-edit-helper-button";
  const MODAL_ID = "blockToolsModal";

  const BLOCK_TYPES = [
    { id: "open-practice", label: "Open Practice", title: "Open Practice", note: "Open Practice" },
    { id: "open-training", label: "Open Training", title: "Open Training", note: "Open Training" },
    { id: "junior-open-training", label: "Junior open training", title: "Junior Nationals open training", note: "Junior Nationals open training." },
    { id: "senior-open-training", label: "Senior open training", title: "Senior open training", note: "USA Nationals senior open training." },
    { id: "qualifier-open-training", label: "National Qualifier open training", title: "National Qualifier open training", note: "Restricted to USA Nationals / National Qualifier athletes." },
    { id: "usa-open-boards", label: "USA Nationals open boards", title: "USA Nationals open boards", note: "USA Nationals open boards" },
    { id: "restricted-open-boards", label: "Restricted senior/qualifier open boards", title: "Restricted senior/qualifier open boards", note: "Restricted to USA Nationals / National Qualifier athletes only; junior-only athletes excluded." },
    { id: "technical-meeting", label: "Technical Meeting", title: "Technical Meeting", note: "Technical Meeting" },
    { id: "custom", label: "Custom / manual title", title: "", note: "" }
  ];

  function readStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const schedule = raw?.schedule || raw;
      return schedule?.meet && Array.isArray(schedule.sessions) ? { raw, schedule, wrapped: Boolean(raw?.schedule) } : null;
    } catch (_error) {
      return null;
    }
  }

  function writeStore(store) {
    store.schedule.updatedAt = new Date().toISOString();
    if (store.wrapped) {
      store.raw.schedule = store.schedule;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.raw));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.schedule));
    }
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  }

  function isManualBlock(session) {
    return Boolean(session?.isOpenPracticeSession || session?.autoTrainingForDayId || session?.events?.[0]?.round === "Custom Block");
  }

  function sessionTitle(session) {
    return String(session.title || session.events?.[0]?.blockTitle || session.events?.[0]?.style || "Session").trim();
  }

  function sessionNote(session) {
    return String(session.events?.[0]?.notes || "").trim();
  }

  function blockDuration(session) {
    if (isManualBlock(session)) return Math.max(0, Number(session.events?.[0]?.customDurationMinutes || 60));
    return Math.max(0, Number(session.warmupMinutes || 0) + 60);
  }

  function minutesToTime(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const hour = Math.floor(total / 60) % 24;
    const minute = total % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function timeToMinutes(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  function dateLabel(day) {
    const date = new Date(`${day?.date || ""}T00:00:00`);
    if (Number.isNaN(date.getTime())) return day?.date || "";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function currentVisibleDayId(schedule) {
    const pageText = document.body?.innerText || "";
    const days = schedule.meet?.days || [];
    const match = days.find((day) => pageText.includes(dateLabel(day)));
    return match?.id || null;
  }

  function visible(element) {
    if (!element) return false;
    const box = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
  }

  function closestCard(element) {
    let node = element;
    for (let depth = 0; node && depth < 10; depth += 1, node = node.parentElement) {
      if (!node || !(node instanceof HTMLElement)) continue;
      const text = String(node.textContent || "");
      const hasControls = /\bMove\b/.test(text) || /Add Block After/i.test(text) || node.querySelector("button");
      const box = node.getBoundingClientRect();
      if (hasControls && box.width > 320 && box.height > 50) return node;
    }
    return element.parentElement || element;
  }

  function candidateTitleElements(title) {
    if (!title) return [];
    const selectors = [
      "h1", "h2", "h3", "h4", "strong", "b",
      ".session-title", ".sb-session-title", ".builder-session-title", ".card-title",
      ".session-header", ".sb-session-header", ".schedule-session-header"
    ].join(",");
    const exact = [];
    const fuzzy = [];
    document.querySelectorAll(selectors).forEach((element) => {
      if (!visible(element)) return;
      if (element.closest(`.${BUTTON_CLASS}`)) return;
      const text = String(element.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      if (text === title) exact.push(element);
      else if (text.startsWith(title) || text.includes(title)) fuzzy.push(element);
    });
    return [...exact, ...fuzzy];
  }

  function updateSessionText(session, nextTitle, nextNote) {
    const title = String(nextTitle || "").trim() || "Practice / Training";
    const note = String(nextNote ?? "").trim();
    session.title = title;
    if (!Array.isArray(session.events)) session.events = [];
    if (!session.events.length) return;
    const first = session.events[0];
    first.notes = note;
    if (isManualBlock(session)) {
      first.blockTitle = title;
      first.style = title;
      first.display = title;
      first.canonicalKey = `${title} | ${session.dayId || ""}`;
    }
  }

  function makeManualBlock(dayId, start, duration, title, note) {
    const sessionId = uid("manual-block");
    return {
      id: sessionId,
      dayId,
      title,
      isOpenPracticeSession: true,
      warmupStartMinutes: Math.max(0, Number(start || 0)),
      warmupMinutes: 0,
      transitionBufferMinutes: 0,
      roundingIncrementMinutes: 5,
      awardsEnabled: false,
      locked: false,
      collapsed: false,
      events: [{
        id: "manual-schedule-block",
        scheduleEventId: uid("manual-block-event"),
        eventGroupId: `${sessionId}-group`,
        level: "Schedule",
        gender: "Open",
        apparatus: "Pool",
        style: title,
        display: title,
        round: "Custom Block",
        blockTitle: title,
        customDurationMinutes: Math.max(5, Number(duration || 60)),
        numberOfDives: 0,
        defaultNumberOfDives: 0,
        numberOfDivers: 0,
        secondsPerDive: 0,
        notes: note || "",
        canonicalKey: `${title} | ${dayId}`,
        projectedAdvancers: 0,
        actualAdvancers: 0,
        finalFieldSize: 0,
        domesticEligibleAdvancers: 0,
        foreignAthleteAdjustment: 0,
        dualCitizenAdjustment: 0
      }]
    };
  }

  function sessionsForDay(schedule, dayId) {
    return (schedule.sessions || [])
      .filter((session) => session.dayId === dayId)
      .sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));
  }

  function reloadAfterWrite(store) {
    writeStore(store);
    window.location.reload();
  }

  function findSession(store, sessionId) {
    return (store.schedule.sessions || []).find((item) => item.id === sessionId);
  }

  function saveModal(sessionId) {
    const modal = document.getElementById(MODAL_ID);
    const store = readStore();
    if (!modal || !store) return;
    const session = findSession(store, sessionId);
    if (!session) return;
    const title = modal.querySelector("[data-field='title']").value;
    const note = modal.querySelector("[data-field='note']").value;
    const start = timeToMinutes(modal.querySelector("[data-field='start']").value);
    const end = timeToMinutes(modal.querySelector("[data-field='end']").value);
    updateSessionText(session, title, note);
    if (start !== null && end !== null && end > start) {
      session.warmupStartMinutes = start;
      if (isManualBlock(session) && session.events?.[0]) session.events[0].customDurationMinutes = end - start;
    }
    reloadAfterWrite(store);
  }

  function deleteSession(sessionId) {
    const store = readStore();
    if (!store) return;
    const session = findSession(store, sessionId);
    if (!session) return;
    const ok = confirm(`Delete this block/session?\n\n${sessionTitle(session)}`);
    if (!ok) return;
    store.schedule.sessions = (store.schedule.sessions || []).filter((item) => item.id !== sessionId);
    reloadAfterWrite(store);
  }

  function addBlockNear(sessionId, where, duplicate) {
    const store = readStore();
    if (!store) return;
    const session = findSession(store, sessionId);
    if (!session) return;
    const duration = duplicate ? blockDuration(session) : 60;
    const title = duplicate ? `${sessionTitle(session)} copy` : "Open Practice";
    const note = duplicate ? sessionNote(session) : "Open Practice";
    const start = where === "before"
      ? Math.max(0, Number(session.warmupStartMinutes || 0) - duration - 5)
      : Number(session.warmupStartMinutes || 0) + blockDuration(session) + 5;
    store.schedule.sessions.push(makeManualBlock(session.dayId, start, duration, title, note));
    reloadAfterWrite(store);
  }

  function nudge(sessionId, delta) {
    const store = readStore();
    if (!store) return;
    const session = findSession(store, sessionId);
    if (!session) return;
    session.warmupStartMinutes = Math.max(0, Number(session.warmupStartMinutes || 0) + delta);
    reloadAfterWrite(store);
  }

  function swapWithNeighbor(sessionId, direction) {
    const store = readStore();
    if (!store) return;
    const session = findSession(store, sessionId);
    if (!session) return;
    const daySessions = sessionsForDay(store.schedule, session.dayId);
    const index = daySessions.findIndex((item) => item.id === session.id);
    const neighbor = daySessions[index + direction];
    if (!neighbor) return;
    const currentStart = session.warmupStartMinutes;
    session.warmupStartMinutes = neighbor.warmupStartMinutes;
    neighbor.warmupStartMinutes = currentStart;
    reloadAfterWrite(store);
  }

  function openBlockTools(sessionId) {
    const store = readStore();
    if (!store) return;
    const session = findSession(store, sessionId);
    if (!session) return;
    const isBlock = isManualBlock(session);
    const start = Number(session.warmupStartMinutes || 0);
    const end = start + blockDuration(session);
    const typeOptions = BLOCK_TYPES.map((type) => `<option value="${esc(type.id)}">${esc(type.label)}</option>`).join("");
    closeModal();
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="block-tools-backdrop" data-close-modal></div>
      <section class="block-tools-panel" role="dialog" aria-modal="true" aria-label="Block tools">
        <header>
          <div>
            <span>${isBlock ? "Block Tools" : "Session Tools"}</span>
            <strong>${esc(sessionTitle(session))}</strong>
          </div>
          <button type="button" data-close-modal>×</button>
        </header>
        <div class="block-tools-body">
          ${isBlock ? `<label>Block type<select data-field="type">${typeOptions}</select></label>` : ""}
          <label>Title<input data-field="title" type="text" value="${esc(sessionTitle(session))}"></label>
          <label>Gray note / public note<textarea data-field="note" rows="3">${esc(sessionNote(session))}</textarea></label>
          <div class="block-tools-grid">
            <label>Start<input data-field="start" type="time" value="${minutesToTime(start)}"></label>
            <label>End<input data-field="end" type="time" value="${minutesToTime(end)}"></label>
          </div>
          <div class="block-tools-actions primary">
            <button type="button" data-save-block>Save</button>
            <button type="button" data-nudge="-15">15 min earlier</button>
            <button type="button" data-nudge="15">15 min later</button>
          </div>
          <div class="block-tools-actions secondary">
            <button type="button" data-swap="-1">Move up</button>
            <button type="button" data-swap="1">Move down</button>
            <button type="button" data-add="before">Add before</button>
            <button type="button" data-add="after">Add after</button>
            <button type="button" data-duplicate>Duplicate after</button>
          </div>
          <div class="block-tools-actions danger">
            <button type="button" data-delete-block>Delete block/session</button>
          </div>
        </div>
      </section>
    `;
    document.body.appendChild(modal);
    injectModalStyles();
    const typeSelect = modal.querySelector("[data-field='type']");
    if (typeSelect) {
      typeSelect.value = "custom";
      typeSelect.addEventListener("change", () => {
        const selected = BLOCK_TYPES.find((type) => type.id === typeSelect.value);
        if (!selected || selected.id === "custom") return;
        modal.querySelector("[data-field='title']").value = selected.title;
        modal.querySelector("[data-field='note']").value = selected.note;
      });
    }
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) return closeModal();
      if (event.target.closest("[data-save-block]")) return saveModal(sessionId);
      const nudgeButton = event.target.closest("[data-nudge]");
      if (nudgeButton) return nudge(sessionId, Number(nudgeButton.getAttribute("data-nudge")));
      const swapButton = event.target.closest("[data-swap]");
      if (swapButton) return swapWithNeighbor(sessionId, Number(swapButton.getAttribute("data-swap")));
      const addButton = event.target.closest("[data-add]");
      if (addButton) return addBlockNear(sessionId, addButton.getAttribute("data-add"), false);
      if (event.target.closest("[data-duplicate]")) return addBlockNear(sessionId, "after", true);
      if (event.target.closest("[data-delete-block]")) return deleteSession(sessionId);
    });
  }

  function closeModal() {
    document.getElementById(MODAL_ID)?.remove();
  }

  function injectModalStyles() {
    if (document.getElementById("blockToolsModalStyles")) return;
    const style = document.createElement("style");
    style.id = "blockToolsModalStyles";
    style.textContent = `
      #${MODAL_ID} { position: fixed; inset: 0; z-index: 100000; }
      #${MODAL_ID} .block-tools-backdrop { position:absolute; inset:0; background: rgba(10,18,48,.34); }
      #${MODAL_ID} .block-tools-panel { position:absolute; right:24px; top:24px; width:min(560px, calc(100vw - 32px)); max-height:calc(100vh - 48px); overflow:auto; background:#fff; border-radius:20px; box-shadow:0 24px 60px rgba(23,31,105,.28); color:#171F69; }
      #${MODAL_ID} header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:18px 20px; background:#171F69; color:#fff; }
      #${MODAL_ID} header span { display:block; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#8FC3EA; font-weight:800; }
      #${MODAL_ID} header strong { display:block; font-size:20px; line-height:1.2; }
      #${MODAL_ID} header button { border:1px solid rgba(255,255,255,.28); border-radius:12px; background:rgba(255,255,255,.12); color:#fff; font-size:24px; width:42px; height:42px; cursor:pointer; }
      #${MODAL_ID} .block-tools-body { padding:18px 20px 20px; display:flex; flex-direction:column; gap:14px; }
      #${MODAL_ID} label { display:flex; flex-direction:column; gap:6px; color:#334155; font-weight:800; }
      #${MODAL_ID} input, #${MODAL_ID} select, #${MODAL_ID} textarea { width:100%; border:1px solid #d5dceb; border-radius:12px; padding:10px 12px; font:inherit; color:#0f172a; background:#fff; }
      #${MODAL_ID} .block-tools-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      #${MODAL_ID} .block-tools-actions { display:flex; flex-wrap:wrap; gap:8px; }
      #${MODAL_ID} .block-tools-actions button { border:0; border-radius:999px; padding:10px 14px; font-weight:800; cursor:pointer; }
      #${MODAL_ID} .primary button:first-child { background:#171F69; color:#fff; }
      #${MODAL_ID} .primary button:not(:first-child), #${MODAL_ID} .secondary button { background:#eef6fc; color:#171F69; }
      #${MODAL_ID} .danger button { background:#E31937; color:#fff; }
    `;
    document.head.appendChild(style);
  }

  function addButtonToCard(card, session) {
    if (!card || card.querySelector(`.${BUTTON_CLASS}[data-session-id="${CSS.escape(session.id)}"]`)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.dataset.sessionId = session.id;
    button.textContent = isManualBlock(session) ? "Block Tools" : "Session Tools";
    button.title = "Change block type, title, notes, time, order, duplicate, or delete.";
    button.style.border = "0";
    button.style.borderRadius = "999px";
    button.style.padding = "7px 11px";
    button.style.background = "#171F69";
    button.style.color = "#fff";
    button.style.fontWeight = "800";
    button.style.cursor = "pointer";
    button.style.marginLeft = "8px";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openBlockTools(session.id);
    });
    const header = card.querySelector("button")?.parentElement || card.firstElementChild || card;
    header.appendChild(button);
  }

  function renderFallbackPanel(store, sessions) {
    let panel = document.getElementById("sessionTextEditFallbackPanel");
    if (!sessions.length) {
      if (panel) panel.remove();
      return;
    }
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "sessionTextEditFallbackPanel";
      panel.style.display = "flex";
      panel.style.alignItems = "center";
      panel.style.gap = "8px";
      panel.style.flexWrap = "wrap";
      panel.style.margin = "10px 0";
      panel.style.padding = "10px 12px";
      panel.style.border = "1px solid rgba(23,31,105,.18)";
      panel.style.borderRadius = "12px";
      panel.style.background = "#fff";
      panel.style.boxShadow = "0 8px 22px rgba(23,31,105,.08)";
      const target = document.querySelector(".builder-day-actions") || document.querySelector(".workspace") || document.querySelector("#app") || document.body;
      target.insertBefore(panel, target.firstChild);
      panel.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-edit-selected-session]");
        if (!button) return;
        const id = panel.querySelector("select")?.value;
        if (id) openBlockTools(id);
      });
    }
    const options = sessions.map((session) => `<option value="${esc(session.id)}">${esc(sessionTitle(session))}</option>`).join("");
    panel.innerHTML = `<strong style="color:#171F69;">Block/session tools</strong><select aria-label="Block/session to edit">${options}</select><button type="button" data-edit-selected-session style="border:0;border-radius:999px;padding:8px 12px;background:#171F69;color:#fff;font-weight:800;cursor:pointer;">Open Tools</button>`;
  }

  function install() {
    const store = readStore();
    if (!store) return;
    const activeDayId = currentVisibleDayId(store.schedule);
    const sessions = (store.schedule.sessions || [])
      .filter((session) => !activeDayId || session.dayId === activeDayId)
      .sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));

    sessions.forEach((session) => {
      const title = sessionTitle(session);
      const element = candidateTitleElements(title)[0];
      if (!element) return;
      addButtonToCard(closestCard(element), session);
    });

    renderFallbackPanel(store, sessions);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  setInterval(install, 1000);
})();
