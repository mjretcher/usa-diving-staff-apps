(function () {
  "use strict";

  const BUTTON_CLASS = "event-delete-helper-button";

  function injectStyles() {
    if (document.getElementById("eventDeleteHelperStyles")) return;
    const style = document.createElement("style");
    style.id = "eventDeleteHelperStyles";
    style.textContent = `
      .event-delete-helper-panel {
        margin-top: 12px;
        padding: 12px;
        border: 1px solid rgba(227,25,55,.28);
        border-radius: 14px;
        background: #fff7f9;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .event-delete-helper-panel strong {
        display: block;
        color: #171F69;
        font-size: 13px;
        line-height: 1.2;
      }
      .event-delete-helper-panel span {
        display: block;
        color: #5F6062;
        font-size: 11px;
        margin-top: 2px;
      }
      .${BUTTON_CLASS} {
        border: 0;
        border-radius: 999px;
        padding: 9px 14px;
        background: #E31937;
        color: #fff;
        font-weight: 800;
        cursor: pointer;
        white-space: nowrap;
      }
      .${BUTTON_CLASS}:hover { filter: brightness(.96); }
      .event-actions .${BUTTON_CLASS}.compact-delete-event {
        padding: 7px 10px;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  function eventTitle(eventNode) {
    const title = eventNode.querySelector(".event-title-main strong, .compact-event-main strong, strong")?.textContent || "this event";
    return String(title).replace(/\s+/g, " ").trim();
  }

  function deleteEvent(eventId, label) {
    if (!eventId || !window.actions || typeof window.actions.removeEvent !== "function") {
      alert("Delete is not available for this event yet.");
      return;
    }
    const ok = window.confirm(`Delete ${label || "this event"}?\n\nThis removes it from the current schedule immediately. It will not be stored in a deleted-events list.`);
    if (!ok) return;
    window.actions.removeEvent(eventId);
  }

  function makeButton(eventId, label, compact) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${BUTTON_CLASS}${compact ? " compact-delete-event" : ""}`;
    button.textContent = compact ? "Delete" : "Delete Event";
    button.title = "Permanently remove this event from the current schedule.";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteEvent(eventId, label);
    });
    return button;
  }

  function installForEvent(eventNode) {
    const eventId = eventNode.getAttribute("data-event-id");
    if (!eventId) return;
    const label = eventTitle(eventNode);

    const actionsRow = eventNode.querySelector(".event-title .event-actions, .compact-actions");
    if (actionsRow && !actionsRow.querySelector(`.${BUTTON_CLASS}`)) {
      actionsRow.appendChild(makeButton(eventId, label, true));
    }

    const detailPanel = eventNode.querySelector(".event-detail-panel");
    if (!detailPanel || detailPanel.querySelector(".event-delete-helper-panel")) return;

    const panel = document.createElement("div");
    panel.className = "event-delete-helper-panel";
    panel.innerHTML = `<div><strong>Event actions</strong><span>Remove this event from the schedule. Deleted events are not archived or stored.</span></div>`;
    panel.appendChild(makeButton(eventId, label, false));
    detailPanel.appendChild(panel);
  }

  function install() {
    injectStyles();
    document.querySelectorAll(".scheduled-event[data-event-id]").forEach(installForEvent);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  setInterval(install, 600);
})();
