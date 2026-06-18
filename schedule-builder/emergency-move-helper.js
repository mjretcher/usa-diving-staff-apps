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
    installDragCleanup();
    waitForActions(installQuickMoveButton);
  });

  function waitForActions(callback, attempts = 0) {
    const actions = window.actions || {};
    if (typeof actions.pickMove === "function" && typeof actions.dropPickedSessionAt === "function" && typeof actions.dropPickedEventInSession === "function") {
      callback();
      return;
    }
    if (attempts > 100) return;
    window.setTimeout(() => waitForActions(callback, attempts + 1), 100);
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const schedule = parsed?.schedule || parsed;
      return schedule?.meet && Array.isArray(schedule.sessions) ? schedule : null;
    } catch (_) {
      return null;
    }
  }

  function installQuickMoveButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Quick Move";
    button.addEventListener("click", openModal);
    document.body.appendChild(button);
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

  function openModal() {
    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = MODAL_ID;
      document.body.appendChild(modal);
    }
    renderModal("session");
  }

  function closeModal() {
    document.getElementById(MODAL_ID)?.remove();
    window.actions?.cancelPickMove?.();
  }

  function renderModal(tab) {
    const state = readState();
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    if (!state) {
      modal.innerHTML = shell("session", `<div class="qm-empty">No saved schedule was found. Save or reload the schedule, then try Quick Move again.</div>`);
      return;
    }
    modal.innerHTML = shell(tab, tab === "event" ? eventPanel(state) : sessionPanel(state));
    wireModal(modal);
  }

  function shell(tab, body) {
    return `
      <div class="qm-backdrop">
        <section class="qm-modal" role="dialog" aria-modal="true" aria-label="Quick Move schedule tools">
          <header class="qm-header">
            <div><span>Emergency schedule tools</span><h2>Quick Move</h2><p>Use this panel when drag-and-drop feels slow or unreliable. It uses the app's existing move actions and keeps the schedule active.</p></div>
            <button type="button" class="qm-close" data-qm-close aria-label="Close">×</button>
          </header>
          <nav class="qm-tabs">
            <button type="button" class="${tab === "session" ? "active" : ""}" data-qm-tab="session">Move Session / Block</button>
            <button type="button" class="${tab === "event" ? "active" : ""}" data-qm-tab="event">Move Event</button>
          </nav>
          <div class="qm-body">${body}</div>
        </section>
      </div>`;
  }

  function sessionPanel(state) {
    const sessions = orderedSessions(state);
    const days = state.meet?.days || [];
    return `
      <div class="qm-grid">
        <label>Session or block to move<select id="qmSourceSession">${sessions.map((session) => `<option value="${esc(session.id)}">${esc(sessionLabel(state, session))}</option>`).join("")}</select></label>
        <label>Target day<select id="qmTargetDay">${days.map((day, index) => `<option value="${esc(day.id)}">Day ${index + 1} — ${esc(dayLabel(day))}</option>`).join("")}</select></label>
        <label>Placement<select id="qmSessionPlacement"><option value="end">End of selected day</option><option value="before">Before selected target</option><option value="after">After selected target</option></select></label>
        <label>Target session/block<select id="qmTargetSession">${sessions.map((session) => `<option value="${esc(session.id)}">${esc(sessionLabel(state, session))}</option>`).join("")}</select></label>
      </div>
      <p class="qm-note">For the most predictable result, place a session before or after a specific target, then review start times.</p>
      <footer class="qm-actions"><button type="button" data-qm-close>Cancel</button><button type="button" class="primary" data-qm-move-session>Move Session</button></footer>`;
  }

  function eventPanel(state) {
    const sessions = orderedSessions(state).filter((session) => !session.autoTrainingForDayId);
    const events = sessions.flatMap((session) => (session.events || []).map((event) => ({ session, event })));
    return `
      <div class="qm-grid">
        <label>Event to move<select id="qmSourceEvent">${events.map(({ session, event }) => `<option value="${esc(event.scheduleEventId)}">${esc(eventLabel(event))} — ${esc(sessionLabel(state, session))}</option>`).join("")}</select></label>
        <label>Target session<select id="qmEventTargetSession">${sessions.map((session) => `<option value="${esc(session.id)}">${esc(sessionLabel(state, session))}</option>`).join("")}</select></label>
      </div>
      <p class="qm-note">This moves the event into the selected session. To create an independent session first, use "Create New Session from Event."</p>
      <footer class="qm-actions"><button type="button" data-qm-close>Cancel</button><button type="button" data-qm-new-session>Create New Session from Event</button><button type="button" class="primary" data-qm-move-event>Move Event</button></footer>`;
  }

  function wireModal(modal) {
    modal.querySelectorAll("[data-qm-close]").forEach((node) => node.addEventListener("click", closeModal));
    modal.querySelectorAll("[data-qm-tab]").forEach((node) => node.addEventListener("click", () => renderModal(node.dataset.qmTab)));
    modal.querySelector("[data-qm-move-session]")?.addEventListener("click", () => {
      const sourceId = value("qmSourceSession");
      const targetDayId = value("qmTargetDay");
      const placement = value("qmSessionPlacement") || "end";
      const targetSessionId = placement === "end" ? "" : value("qmTargetSession");
      if (!sourceId || !targetDayId) return;
      window.actions.pickMove("session", sourceId);
      window.actions.dropPickedSessionAt(targetDayId, targetSessionId, placement);
      closeModal();
    });
    modal.querySelector("[data-qm-move-event]")?.addEventListener("click", () => {
      const eventId = value("qmSourceEvent");
      const targetSessionId = value("qmEventTargetSession");
      if (!eventId || !targetSessionId) return;
      window.actions.pickMove("event", eventId);
      window.actions.dropPickedEventInSession(null, targetSessionId);
      closeModal();
    });
    modal.querySelector("[data-qm-new-session]")?.addEventListener("click", () => {
      const eventId = value("qmSourceEvent");
      if (!eventId) return;
      window.actions.moveEventToNewSession?.(eventId);
      closeModal();
    });
  }

  function orderedSessions(state) {
    const dayOrder = new Map((state.meet?.days || []).map((day, index) => [day.id, index]));
    return [...(state.sessions || [])].sort((a, b) => {
      const dayCompare = (dayOrder.get(a.dayId) ?? 999) - (dayOrder.get(b.dayId) ?? 999);
      if (dayCompare) return dayCompare;
      return Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
    });
  }

  function sessionLabel(state, session) {
    const day = (state.meet?.days || []).find((item) => item.id === session.dayId);
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

  function time(minutes) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const h24 = Math.floor(total / 60) % 24;
    const min = total % 60;
    return `${h24 % 12 || 12}:${String(min).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
  }

  function value(id) {
    return document.getElementById(id)?.value || "";
  }

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID}{position:fixed;right:18px;bottom:18px;z-index:10000;border:0;border-radius:999px;padding:12px 18px;background:#E31937;color:#fff;font-weight:900;box-shadow:0 12px 28px rgba(0,0,0,.22);cursor:pointer}
      .qm-backdrop{position:fixed;inset:0;z-index:10001;background:rgba(8,16,40,.6);display:flex;align-items:center;justify-content:center;padding:18px}
      .qm-modal{width:min(920px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.3);border:1px solid rgba(23,31,105,.18);color:#111827}
      .qm-header{display:flex;justify-content:space-between;gap:18px;padding:24px 26px 16px;background:linear-gradient(135deg,#171F69,#26358f);color:#fff;border-radius:22px 22px 0 0}.qm-header span{font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#8FC3EA}.qm-header h2{margin:3px 0 6px;font-size:25px}.qm-header p{margin:0;opacity:.86;max-width:700px}.qm-close{width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;font-size:24px;cursor:pointer}
      .qm-tabs{display:flex;gap:8px;padding:14px 26px;background:#f7f9fc;border-bottom:1px solid rgba(23,31,105,.1)}.qm-tabs button{border:1px solid rgba(23,31,105,.18);border-radius:999px;background:#fff;color:#171F69;padding:9px 14px;font-weight:850;cursor:pointer}.qm-tabs button.active{background:#171F69;color:#fff}
      .qm-body{padding:22px 26px}.qm-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.qm-grid label{display:block;font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#5F6062}.qm-grid select{display:block;width:100%;margin-top:6px;border:1px solid rgba(23,31,105,.18);border-radius:12px;padding:10px;font:inherit;background:#fff;color:#111827}.qm-note{margin:14px 0;color:#5F6062}.qm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.qm-actions button{border:1px solid rgba(23,31,105,.2);background:#fff;color:#171F69;border-radius:999px;padding:10px 16px;font-weight:850;cursor:pointer}.qm-actions button.primary{border:0;background:#E31937;color:#fff}.qm-empty{padding:18px;border:1px solid #fecdd3;background:#fff1f2;color:#9f1239;border-radius:14px;font-weight:800}
      @media(max-width:760px){.qm-grid{grid-template-columns:1fr}.qm-backdrop{align-items:flex-start;padding:8px}.qm-modal{max-height:96vh}#${BUTTON_ID}{right:12px;bottom:12px}}
    `;
    document.head.appendChild(style);
  }
})();
