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
    const result = originalSetItem(key, value);
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
    originalSetItem(STORAGE_KEY, action.value);
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

  function installUndoButton() {
    if (document.getElementById("scheduleBuilderUndoButton")) return;

    const style = document.createElement("style");
    style.textContent = `
      #scheduleBuilderUndoButton {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 9999;
        border: 0;
        border-radius: 999px;
        padding: 8px 14px;
        min-width: 68px;
        min-height: 34px;
        background: #171F69;
        color: #ffffff;
        font-family: inherit;
        font-size: 0.8rem;
        font-weight: 800;
        line-height: 1;
        box-shadow: 0 8px 18px rgba(23, 31, 105, 0.24);
        cursor: pointer;
      }
      #scheduleBuilderUndoButton:disabled {
        background: #5F6062;
        cursor: not-allowed;
        opacity: 0.46;
        box-shadow: none;
      }
      @media (max-width: 720px) {
        #scheduleBuilderUndoButton {
          right: 10px;
          bottom: 10px;
          padding: 7px 12px;
          min-width: 58px;
          min-height: 30px;
          font-size: 0.74rem;
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
    button.addEventListener("click", undoLastAction);
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
