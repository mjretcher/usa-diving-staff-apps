(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-left-tools-open-v1";

  function isNewDesign() {
    return Boolean(document.querySelector('.sb-left-rail'));
  }

  function isOpen() {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  }

  function setOpen(value) {
    sessionStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    document.body.classList.toggle("left-tools-open", Boolean(value));
    setTimeout(syncButtonLabel, 0);
  }

  function installStyles() {
    if (isNewDesign()) return; // New design handles its own layout
    if (document.getElementById("scheduleBuilderFocusWorkspaceStyles")) return;
    const style = document.createElement("style");
    style.id = "scheduleBuilderFocusWorkspaceStyles";
    style.textContent = `
      body:not(.left-tools-open) .left-rail { display: none !important; }
      body:not(.left-tools-open) .app-main { display: block !important; }
      body.left-tools-open .left-rail {
        display: block !important;
        position: fixed !important;
        top: 72px !important;
        left: 12px !important;
        bottom: 58px !important;
        z-index: 10000 !important;
        width: min(380px, calc(100vw - 28px)) !important;
        overflow-y: scroll !important;
        background: #fff !important;
        border-radius: 16px !important;
        box-shadow: 0 18px 48px rgba(23,31,105,.28) !important;
        padding: 12px 12px 72px !important;
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
      body.left-tools-open #leftToolsToggle { background: #E31937; }
    `;
    document.head.appendChild(style);
  }

  function installToggle() {
    // In new design, Tools button is not needed — sidebar is always visible
    if (isNewDesign()) {
      const existing = document.getElementById("leftToolsToggle");
      if (existing) existing.style.display = "none";
      return;
    }
    let button = document.getElementById("leftToolsToggle");
    if (!button) {
      button = document.createElement("button");
      button.id = "leftToolsToggle";
      button.type = "button";
      button.addEventListener("click", () => setOpen(!document.body.classList.contains("left-tools-open")));
      document.body.appendChild(button);
    }
    button.style.display = "";
    button.textContent = document.body.classList.contains("left-tools-open") ? "Close tools" : "Tools";
  }

  function syncButtonLabel() {
    const button = document.getElementById("leftToolsToggle");
    if (!button) return;
    if (isNewDesign()) { button.style.display = "none"; return; }
    button.textContent = document.body.classList.contains("left-tools-open") ? "Close tools" : "Tools";
  }

  function install() {
    installStyles();
    if (!isNewDesign()) setOpen(isOpen());
    installToggle();
    syncButtonLabel();
    setInterval(syncButtonLabel, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
