(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const UNDO_ACTION_KEY = "usa-diving-schedule-builder-last-action-undo-v1";
  const ACTION_IDLE_MS = 700;
  const SCROLL_SELECTORS = [".single-day-board", ".active-day-panel", "#scheduleBuilderBoard"];

  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  let actionOpen = false;
  let actionTimer = null;
  let lastScrollSnapshot = null;
  let cleanupReloadPending = false;

  function captureScrollPosition() {
    lastScrollSnapshot = {
      windowX: window.scrollX,
      windowY: window.scrollY,
      panels: SCROLL_SELECTORS.map((selector) => {
        const element = document.querySelector(selector);
        return element ? { selector, left: element.scrollLeft, top: element.scrollTop } : null;
      }).filter(Boolean),
    };
  }

  function restoreScrollPosition() {
    if (!lastScrollSnapshot) return;
    const snapshot = lastScrollSnapshot;
    const restore = () => {
      window.scrollTo(snapshot.windowX, snapshot.windowY);
      snapshot.panels.forEach((panel) => {
        const element = document.querySelector(panel.selector);
        if (!element) return;
        element.scrollLeft = panel.left;
        element.scrollTop = panel.top;
      });
    };
    window.requestAnimationFrame(restore);
    window.setTimeout(restore, 0);
    window.setTimeout(restore, 80);
  }

  function scheduleCleanupReload() {
    if (cleanupReloadPending) return;
    cleanupReloadPending = true;
    window.setTimeout(() => {
      window.location.reload();
    }, 120);
  }

  function scrubAutoTrainingSessions(schedule) {
    if (!schedule || typeof schedule !== "object" || !Array.isArray(schedule.sessions)) return false;

    const beforeCount = schedule.sessions.length;
    schedule.sessions = schedule.sessions.filter((session) => !session || !session.autoTrainingForDayId);
    const removedAutoTraining = schedule.sessions.length !== beforeCount;

    if (removedAutoTraining && schedule.profile?.timingDefaults?.finalsTransitionMode === "openTraining") {
      schedule.profile.timingDefaults.finalsTransitionMode = "manualGap";
    }

    return removedAutoTraining;
  }

  function sanitizeScheduleStorageValue(value, { reloadAfterCleanup = false } = {}) {
    if (typeof value !== "string" || !value.trim()) return value;

    try {
      const parsed = JSON.parse(value);
      let changed = false;

      changed = scrubAutoTrainingSessions(parsed) || changed;
      if (parsed?.schedule && typeof parsed.schedule === "object") {
        changed = scrubAutoTrainingSessions(parsed.schedule) || changed;
      }

      if (!changed) return value;
      if (reloadAfterCleanup) scheduleCleanupReload();
      return JSON.stringify(parsed);
    } catch (error) {
      return value;
    }
  }

  function installScrollPreserver() {
    ["pointerdown", "mousedown", "focusin", "input", "change", "click"].forEach((eventName) => {
      document.addEventListener(eventName, captureScrollPosition, true);
    });
  }

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
    const previousValue = sanitizeScheduleStorageValue(localStorage.getItem(STORAGE_KEY));
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
    const nextValue = key === STORAGE_KEY
      ? sanitizeScheduleStorageValue(value, { reloadAfterCleanup: true })
      : value;
    if (key === STORAGE_KEY) rememberStateBeforeAction(nextValue);
    const result = originalSetItem(key, nextValue);
    if (key === STORAGE_KEY) restoreScrollPosition();
    return result;
  };

  localStorage.removeItem = function patchedRemoveItem(key) {
    if (key === STORAGE_KEY) rememberStateBeforeAction(null);
    const result = originalRemoveItem(key);
    if (key === STORAGE_KEY) restoreScrollPosition();
    return result;
  };

  function undoLastAction() {
    const action = readUndoAction();
    if (!action) return;

    actionOpen = false;
    window.clearTimeout(actionTimer);
    originalSetItem(STORAGE_KEY, sanitizeScheduleStorageValue(action.value));
    writeUndoAction(null);
    window.location.reload();
  }

  function updateUndoButton() {
    const button = document.getElementById("scheduleBuilderUndoButton");
    if (!button) return;

    const action = readUndoAction();
    button.disabled = !action;
    button.textContent = "Undo";
    button.title = action
      ? "Undo the last schedule action"
      : "Make a schedule edit to enable undo";
    button.setAttribute("aria-label", button.title);
  }

  function stopUndoPointer(event) {
    event.stopPropagation();
  }

  function installUndoButton() {
    if (document.getElementById("scheduleBuilderUndoButton")) return;

    const style = document.createElement("style");
    style.textContent = `
      #scheduleBuilderUndoButton {
        position: fixed;
        left: 16px;
        right: auto;
        bottom: max(18px, env(safe-area-inset-bottom));
        z-index: 999999;
        border: 2px solid #ffffff;
        border-radius: 999px;
        padding: 10px 16px;
        min-width: 78px;
        min-height: 40px;
        background: #171F69;
        color: #ffffff;
        font-family: inherit;
        font-size: 0.84rem;
        font-weight: 900;
        line-height: 1;
        box-shadow: 0 10px 24px rgba(23, 31, 105, 0.30);
        cursor: pointer;
        pointer-events: auto;
      }
      #scheduleBuilderUndoButton:disabled {
        background: #5F6062;
        cursor: not-allowed;
        opacity: 0.52;
        box-shadow: none;
      }
      @media (max-width: 720px) {
        #scheduleBuilderUndoButton {
          left: 10px;
          right: auto;
          bottom: max(12px, env(safe-area-inset-bottom));
          padding: 8px 13px;
          min-width: 64px;
          min-height: 34px;
          font-size: 0.76rem;
        }
      }
    `;

    const button = document.createElement("button");
    button.id = "scheduleBuilderUndoButton";
    button.type = "button";
    button.disabled = true;
    button.textContent = "Undo";

    document.head.appendChild(style);
    document.body.appendChild(button);
    ["pointerdown", "mousedown", "touchstart"].forEach((eventName) => {
      button.addEventListener(eventName, stopUndoPointer, true);
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      undoLastAction();
    });
    updateUndoButton();
  }

  function installHelpers() {
    installScrollPreserver();
    installUndoButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installHelpers);
  } else {
    installHelpers();
  }
})();