(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const UNDO_ACTION_KEY = "usa-diving-schedule-builder-last-action-undo-v1";
  const ACTION_IDLE_MS = 700;

  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  let actionOpen = false;
  let actionTimer = null;

  function readUndoAction() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(UNDO_ACTION_KEY) || "null");
      return parsed && typeof parsed === "object" && parsed.value ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function writeUndoAction(action) {
    if (!action) sessionStorage.removeItem(UNDO_ACTION_KEY);
    else sessionStorage.setItem(UNDO_ACTION_KEY, JSON.stringify(action));
    updateUndoButton();
  }

  function scheduleActionClose() {
    window.clearTimeout(actionTimer);
    actionTimer = window.setTimeout(() => {
      actionOpen = false;
    }, ACTION_IDLE_MS);
  }

  function rememberStateBeforeAction(nextValue) {
    const previousValue = localStorage.getItem(STORAGE_KEY);
    if (!previousValue || previousValue === nextValue) return;

    if (!actionOpen) {
      writeUndoAction({
        value: previousValue,
        capturedAt: new Date().toISOString(),
      });
      actionOpen = true;
    }

    scheduleActionClose();
  }

  localStorage.setItem = function patchedSetItem(key, value) {
    if (key === STORAGE_KEY) rememberStateBeforeAction(value);
    return originalSetItem(key, value);
  };

  localStorage.removeItem = function patchedRemoveItem(key) {
    if (key === STORAGE_KEY) rememberStateBeforeAction(null);
    return originalRemoveItem(key);
  };

  function undoLastAction() {
    const action = readUndoAction();
    if (!action) return;

    actionOpen = false;
    window.clearTimeout(actionTimer);
    originalSetItem(STORAGE_KEY, action.value);
    writeUndoAction(null);
    window.location.reload();
  }

  function updateUndoButton() {
    const button = document.getElementById("scheduleBuilderUndoButton");
    const note = document.getElementById("scheduleBuilderUndoNote");
    if (!button || !note) return;

    const action = readUndoAction();
    button.disabled = !action;
    button.textContent = action ? "Undo last action" : "Undo unavailable";
    note.textContent = action
      ? "Use this immediately after an accidental delete, move, or timing edit."
      : "Make a schedule edit to enable undo.";
  }

  function installUndoPanel() {
    if (document.getElementById("scheduleBuilderUndoPanel")) return;

    const style = document.createElement("style");
    style.textContent = `
      #scheduleBuilderUndoPanel {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 9999;
        width: min(300px, calc(100vw - 36px));
        padding: 14px;
        border-radius: 14px;
        background: #ffffff;
        border: 1px solid rgba(23, 31, 105, 0.18);
        box-shadow: 0 12px 32px rgba(23, 31, 105, 0.18);
        font-family: inherit;
      }
      #scheduleBuilderUndoPanel strong {
        display: block;
        color: #171F69;
        font-size: 0.86rem;
        margin-bottom: 4px;
      }
      #scheduleBuilderUndoPanel p {
        margin: 0 0 10px;
        color: #5F6062;
        font-size: 0.78rem;
        line-height: 1.35;
      }
      #scheduleBuilderUndoButton {
        width: 100%;
        border: 0;
        border-radius: 999px;
        padding: 10px 12px;
        background: #171F69;
        color: #ffffff;
        font-weight: 700;
        cursor: pointer;
      }
      #scheduleBuilderUndoButton:disabled {
        background: #5F6062;
        cursor: not-allowed;
        opacity: 0.62;
      }
    `;

    const panel = document.createElement("div");
    panel.id = "scheduleBuilderUndoPanel";
    panel.innerHTML = `
      <strong>Undo</strong>
      <p id="scheduleBuilderUndoNote">Make a schedule edit to enable undo.</p>
      <button id="scheduleBuilderUndoButton" type="button" disabled>Undo unavailable</button>
    `;

    document.head.appendChild(style);
    document.body.appendChild(panel);
    document.getElementById("scheduleBuilderUndoButton")?.addEventListener("click", undoLastAction);
    updateUndoButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installUndoPanel);
  } else {
    installUndoPanel();
  }
})();
