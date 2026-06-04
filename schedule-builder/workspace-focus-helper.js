(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-left-tools-open-v1";

  function isOpen() {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  }

  function setOpen(value) {
    sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    document.body.classList.toggle("left-tools-open", Boolean(value));
    setTimeout(syncButtonLabel, 0);
  }

  function installStyles() {
    if (document.getElementById("scheduleBuilderFocusWorkspaceStyles")) return;
    const style = document.createElement("style");
    style.id = "scheduleBuilderFocusWorkspaceStyles";
    style.textContent = `
      body:not(.left-tools-open) .left-rail {
        display: none !important;
      }

      body:not(.left-tools-open) .app-main {
        display: block !important;
      }

      body.left-tools-open .left-rail {
        display: block !important;
        position: fixed !important;
        top: 72px !important;
        left: 12px !important;
        bottom: 58px !important;
        z-index: 10000 !important;
        width: min(380px, calc(100vw - 28px)) !important;
        max-width: min(380px, calc(100vw - 28px)) !important;
        height: auto !important;
        max-height: calc(100vh - 130px) !important;
        overflow-y: scroll !important;
        overflow-x: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain !important;
        background: #fff !important;
        border: 1px solid rgba(23,31,105,.18) !important;
        border-radius: 16px !important;
        box-shadow: 0 18px 48px rgba(23,31,105,.28) !important;
        padding: 12px 12px 72px !important;
        scrollbar-width: thin;
      }

      body.left-tools-open .left-rail::after {
        content: "";
        display: block;
        height: 64px;
      }

      body.left-tools-open .app-main {
        display: block !important;
      }

      .workspace,
      .preview-shell,
      .command-center,
      .timeline-preview,
      .public-schedule-preview,
      .day-board {
        width: 100% !important;
        max-width: 100% !important;
      }

      #leftToolsToggle {
        position: fixed;
        left: 12px;
        bottom: 14px;
        z-index: 10001;
        border: 0;
        border-radius: 999px;
        padding: 9px 13px;
        background: #171F69;
        color: #fff;
        font-weight: 900;
        box-shadow: 0 10px 24px rgba(23,31,105,.24);
        cursor: pointer;
      }

      body.left-tools-open #leftToolsToggle {
        background: #E31937;
      }

      #scheduleHealthReviewPanel,
      #scheduleHealthCommandPanel,
      #juniorCircuitRulePanel,
      .schedule-health-panel,
      .warning-list,
      .warnings-panel {
        display: none !important;
      }

      .left-rail .warning-list,
      .left-rail .warnings-panel,
      .left-rail .schedule-health-panel {
        display: none !important;
      }

      .left-rail * {
        max-width: 100% !important;
        overflow-wrap: anywhere !important;
      }

      .left-rail .catalog-event-grid {
        max-height: none !important;
        overflow: visible !important;
      }

      .left-rail .catalog-event-card,
      .left-rail .selected-event-panel,
      .left-rail .catalog-add-card,
      .left-rail .catalog-toolbox,
      .left-rail .panel {
        overflow: visible !important;
      }

      @media (max-width: 900px) {
        body.left-tools-open .left-rail {
          top: 56px !important;
          bottom: 58px !important;
          left: 10px !important;
          width: calc(100vw - 20px) !important;
          max-width: calc(100vw - 20px) !important;
          max-height: calc(100vh - 114px) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function installToggle() {
    let button = document.getElementById("leftToolsToggle");
    if (!button) {
      button = document.createElement("button");
      button.id = "leftToolsToggle";
      button.type = "button";
      button.addEventListener("click", () => setOpen(!document.body.classList.contains("left-tools-open")));
      document.body.appendChild(button);
    }
    button.textContent = document.body.classList.contains("left-tools-open") ? "Close tools" : "Tools";
  }

  function syncButtonLabel() {
    const button = document.getElementById("leftToolsToggle");
    if (button) button.textContent = document.body.classList.contains("left-tools-open") ? "Close tools" : "Tools";
  }

  function install() {
    installStyles();
    setOpen(isOpen());
    installToggle();
    syncButtonLabel();
    setInterval(syncButtonLabel, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();