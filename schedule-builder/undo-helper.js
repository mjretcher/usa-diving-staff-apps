(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const UNDO_STACK_KEY = "usa-diving-schedule-builder-undo-stack-v1";
  const MAX_UNDO_STATES = 10;

  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  function readUndoStack() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(UNDO_STACK_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeUndoStack(stack) {
    sessionStorage.setItem(UNDO_STACK_KEY, JSON.stringify(stack.slice(-MAX_UNDO_STATES)));
    updateUndoButton();
  }

  function summarizeSchedule(rawValue) {
    try {
      const parsed = JSON.parse(rawValue || "{}");
      const name = parsed?.meet?.name || parsed?.schedule?.meet?.name || "schedule";
      const updatedAt = parsed?.updatedAt || parsed?.schedule?.updatedAt || "";
      return `${name}${updatedAt ? ` updated ${updatedAt}` : ""}`;
    } catch (error) {
      return "schedule change";
    }
  }

  function rememberPreviousState(nextValue) {
    const previousValue = localStorage.getItem(STORAGE_KEY);
    if (!previousValue || previousValue === nextValue) return;

    const stack = readUndoStack();
    const last = stack[stack.length - 1];
    if (last?.value === previousValue) return;

    stack.push({
      value: previousValue,
      label: summarizeSchedule(previousValue),
      capturedAt: new Date().toISOString(),
    });
    writeUndoStack(stack);
  }

  localStorage.setItem = function patchedSetItem(key, value) {
    if (key === STORAGE_KEY) rememberPreviousState(value);
    return originalSetItem(key, value);
  };

  localStorage.removeItem = function patchedRemoveItem(key) {
    if (key === STORAGE_KEY) rememberPreviousState(null);
    return originalRemoveItem(key);
  };

  function undoLastScheduleChange() {
    const stack = readUndoStack();
    const previous = stack.pop();
    if (!previous) return;

    originalSetItem(STORAGE_KEY, previous.value);
    writeUndoStack(stack);
    window.location.reload();
  }

  function updateUndoButton() {
    const button = document.getElementById("scheduleBuilderUndoButton");
    const note = document.getElementById("scheduleBuilderUndoNote");
    if (!button || !note) return;

    const stack = readUndoStack();
    const latest = stack[stack.length - 1];
    button.disabled = !latest;
    button.textContent = latest ? "Undo last schedule change" : "Undo unavailable";
    note.textContent = latest ? "Restores the schedule state before the most recent saved edit." : "Make a schedule edit to enable undo.";
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
        width: min(310px, calc(100vw - 36px));
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
      <strong>Schedule Undo</strong>
      <p id="scheduleBuilderUndoNote">Make a schedule edit to enable undo.</p>
      <button id="scheduleBuilderUndoButton" type="button" disabled>Undo unavailable</button>
    `;

    document.head.appendChild(style);
    document.body.appendChild(panel);
    document.getElementById("scheduleBuilderUndoButton")?.addEventListener("click", undoLastScheduleChange);
    updateUndoButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installUndoPanel);
  } else {
    installUndoPanel();
  }
})();
