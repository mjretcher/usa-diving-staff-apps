(function () {
  "use strict";

  function injectStyles() {
    if (document.getElementById("scheduleBuilderUiPolishStyles")) return;
    const style = document.createElement("style");
    style.id = "scheduleBuilderUiPolishStyles";
    style.textContent = `
      .preview-toolbar .export-actions {
        align-items: flex-end !important;
        gap: 10px !important;
        flex-wrap: wrap !important;
      }

      #reportPrintControls {
        min-height: 64px !important;
        padding: 10px 20px !important;
        border: 1px solid #d5dceb !important;
        border-radius: 999px !important;
        background: #fff !important;
        color: #334155 !important;
        font-weight: 800 !important;
        box-shadow: 0 2px 8px rgba(23,31,105,.05) !important;
        display: inline-flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        gap: 6px !important;
        margin-top: 0 !important;
      }

      #reportPrintControls select {
        min-width: 180px !important;
        border: 1px solid #d5dceb !important;
        border-radius: 10px !important;
        padding: 8px 36px 8px 12px !important;
        background: #fff !important;
        color: #334155 !important;
        font-weight: 700 !important;
        font-size: 14px !important;
      }

      #publicHideTimesPrintControl {
        margin-top: 0 !important;
        align-self: flex-end !important;
      }

      #publicHideTimesPrintControl input[type="checkbox"] {
        width: 22px !important;
        height: 22px !important;
        accent-color: #0074f6 !important;
      }

      .public-output-controls label,
      .public-output-controls .toggle-pill,
      .public-designer-panel label {
        scroll-margin-top: 120px;
      }

      .public-schedule-preview .public-status,
      .public-schedule-preview .schedule-status,
      .public-schedule-preview .updated-at,
      .public-schedule-preview .status-line,
      .public-schedule-preview [class*="status"],
      .public-schedule-preview [class*="updated"] {
        display: none !important;
      }

      .entry-builder-drawer,
      .entry-builder-panel,
      .entry-builder-modal,
      .entries-drawer,
      .entries-panel,
      [class*="entry"][class*="drawer"],
      [class*="entry"][class*="panel"] {
        max-height: calc(100vh - 24px) !important;
      }

      .entry-builder-drawer,
      .entries-drawer,
      [class*="entry"][class*="drawer"] {
        width: min(760px, 96vw) !important;
      }

      .entry-builder-drawer table,
      .entry-builder-panel table,
      .entry-builder-modal table,
      .entries-drawer table,
      .entries-panel table,
      [class*="entry"][class*="drawer"] table,
      [class*="entry"][class*="panel"] table {
        table-layout: fixed !important;
        width: 100% !important;
      }

      .entry-builder-drawer th,
      .entry-builder-drawer td,
      .entry-builder-panel th,
      .entry-builder-panel td,
      .entry-builder-modal th,
      .entry-builder-modal td,
      .entries-drawer th,
      .entries-drawer td,
      .entries-panel th,
      .entries-panel td,
      [class*="entry"][class*="drawer"] th,
      [class*="entry"][class*="drawer"] td,
      [class*="entry"][class*="panel"] th,
      [class*="entry"][class*="panel"] td {
        white-space: normal !important;
        word-break: normal !important;
        overflow-wrap: anywhere !important;
      }

      .entry-builder-drawer input,
      .entry-builder-panel input,
      .entry-builder-modal input,
      .entries-drawer input,
      .entries-panel input,
      [class*="entry"][class*="drawer"] input,
      [class*="entry"][class*="panel"] input {
        max-width: 100% !important;
        min-width: 0 !important;
      }

      @media (max-width: 900px) {
        .entry-builder-drawer,
        .entry-builder-panel,
        .entry-builder-modal,
        .entries-drawer,
        .entries-panel,
        [class*="entry"][class*="drawer"],
        [class*="entry"][class*="panel"] {
          left: 8px !important;
          right: 8px !important;
          width: calc(100vw - 16px) !important;
          max-width: calc(100vw - 16px) !important;
          top: 8px !important;
          bottom: 8px !important;
          border-radius: 18px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function snapshot() {
    const containers = [".workspace", ".preview-pane", ".timeline-preview", ".public-schedule-preview", ".poster-preview", ".builder-flow-dock", ".left-rail"]
      .map((selector) => {
        const node = document.querySelector(selector);
        return node ? { selector, top: node.scrollTop, left: node.scrollLeft } : null;
      })
      .filter(Boolean);
    return { x: window.scrollX, y: window.scrollY, containers };
  }

  function restore(snap) {
    if (!snap) return;
    window.scrollTo(snap.x, snap.y);
    snap.containers.forEach((item) => {
      const node = document.querySelector(item.selector);
      if (!node) return;
      node.scrollTop = item.top;
      node.scrollLeft = item.left;
    });
  }

  function restoreFor(snap, ms) {
    const started = Date.now();
    restore(snap);
    const timer = setInterval(() => {
      restore(snap);
      if (Date.now() - started > ms) clearInterval(timer);
    }, 45);
  }

  function isReportNavClick(event) {
    const button = event.target?.closest?.("button, a, [role='button']");
    if (!button) return false;
    const text = String(button.textContent || "").toLowerCase();
    if (!/(operations timeline|public schedule|poster|canva|outputs|reports)/.test(text)) return false;
    return Boolean(button.closest(".preview-toolbar, .reports-nav, .report-tabs, .output-tabs, #app"));
  }

  function stripStatusPreviewLines() {
    document.querySelectorAll(".public-schedule-preview p, .public-schedule-preview div, .poster-preview p, .poster-preview div").forEach((node) => {
      if (node.children.length > 2) return;
      const text = String(node.textContent || "").trim().toLowerCase();
      if (/^status:\s*review\b/.test(text) || /^status:\s*draft\b/.test(text) || /updated .*schedule subject to change/.test(text)) {
        node.style.display = "none";
        node.setAttribute("data-hidden-status-line", "true");
      }
    });
  }

  function isEntryPanel(node) {
    if (!node || node.nodeType !== 1) return false;
    const text = String(node.textContent || "").toLowerCase();
    return text.includes("projected + actual entries") || text.includes("timeline basis") || text.includes("clear entries");
  }

  function polishEntryPanels() {
    [...document.querySelectorAll("aside, dialog, .modal, .drawer, .panel, [class*='drawer'], [class*='panel']")].forEach((node) => {
      if (!isEntryPanel(node)) return;
      node.classList.add("entry-builder-drawer");
      node.style.maxHeight = "calc(100vh - 24px)";
      node.style.overflow = "auto";
      node.style.width = "min(760px, 96vw)";
      node.style.maxWidth = "96vw";
      const tables = node.querySelectorAll("table");
      tables.forEach((table) => {
        table.style.tableLayout = "fixed";
        table.style.width = "100%";
      });
    });
  }

  function install() {
    injectStyles();
    polishEntryPanels();
    stripStatusPreviewLines();
  }

  document.addEventListener("pointerdown", (event) => {
    if (isReportNavClick(event)) window.__reportNavScrollSnapshot = snapshot();
  }, true);

  document.addEventListener("click", (event) => {
    if (!isReportNavClick(event)) return;
    restoreFor(window.__reportNavScrollSnapshot || snapshot(), 1500);
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  setInterval(install, 500);
})();
