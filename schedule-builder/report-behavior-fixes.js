/*
  Schedule Builder report behavior fixes
  -------------------------------------
  - Replaces the PDF action with a stable report print window.
  - Stops report switches from jumping the operator to the top of the page.
  - Adds in-page print CSS for the Operations Timeline.
*/
(function installReportBehaviorFixes(){
  "use strict";

  const SCROLL_SELECTORS = [
    ".workspace", ".app-main", ".preview-shell", ".timeline-preview", ".public-schedule-preview",
    ".poster-preview", ".single-day-board", ".day-board", ".sb-board-wrap", ".left-rail", ".sb-left-rail"
  ];

  function captureScroll(){
    return {
      x: window.scrollX,
      y: window.scrollY,
      containers: SCROLL_SELECTORS.map(selector => {
        const node = document.querySelector(selector);
        return node ? { selector, top: node.scrollTop, left: node.scrollLeft } : null;
      }).filter(Boolean)
    };
  }

  function restoreScroll(snapshot){
    if (!snapshot) return;
    window.scrollTo(snapshot.x, snapshot.y);
    snapshot.containers.forEach(item => {
      const node = document.querySelector(item.selector);
      if (!node) return;
      node.scrollTop = item.top;
      node.scrollLeft = item.left;
    });
  }

  function restoreFor(snapshot, durationMs = 1100){
    const started = Date.now();
    restoreScroll(snapshot);
    requestAnimationFrame(() => restoreScroll(snapshot));
    const timer = window.setInterval(() => {
      restoreScroll(snapshot);
      if (Date.now() - started > durationMs) window.clearInterval(timer);
    }, 40);
  }

  function preserveDuring(callback){
    const snapshot = captureScroll();
    const result = callback();
    restoreFor(snapshot);
    return result;
  }

  function reportTitle(){
    return document.querySelector(".timeline-table .title th")?.textContent?.trim()
      || document.querySelector(".public-hero-card h2")?.textContent?.trim()
      || document.querySelector(".poster-title")?.textContent?.trim()
      || "USA Diving Schedule";
  }

  function cleanClone(node){
    const clone = node.cloneNode(true);
    clone.querySelectorAll(".public-output-controls,.public-designer-panel,.preview-toolbar,.export-actions,.segmented,button,input,select,textarea").forEach(el => el.remove());
    clone.querySelectorAll("[style]").forEach(el => {
      if (/transform|position:\s*fixed/i.test(el.getAttribute("style") || "")) el.removeAttribute("style");
    });
    return clone;
  }

  function activeReportNode(){
    return document.getElementById("timelinePreview")
      || document.querySelector(".public-schedule-preview")
      || document.querySelector(".poster-preview")
      || document.querySelector(".preview-shell");
  }

  function printCss(){
    return `
      @page { size: letter landscape; margin: 0.18in; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      html, body { margin: 0; padding: 0; background: #fff; color: #151B46; font-family: Arial, Helvetica, sans-serif; }
      body { width: 100%; }
      .print-report { width: 100%; margin: 0; padding: 0; }
      .timeline-preview, .timeline-preview-by-day { border: 0 !important; border-radius: 0 !important; overflow: visible !important; background: #fff !important; }
      .timeline-table { border-collapse: collapse !important; table-layout: fixed !important; width: 100% !important; min-width: 0 !important; margin: 0 0 0.08in 0 !important; page-break-inside: avoid !important; break-inside: avoid !important; }
      .timeline-page-table { page-break-after: always !important; break-after: page !important; }
      .timeline-page-table:last-child { page-break-after: auto !important; break-after: auto !important; }
      .timeline-table th, .timeline-table td { border: 0.55px solid #1a3c66 !important; color: #151B46; font-size: 6.15px !important; line-height: 1.04 !important; padding: 1.6px 1.8px !important; text-align: center !important; vertical-align: middle !important; word-break: normal !important; overflow-wrap: anywhere !important; }
      .timeline-table .title th { background: #151B46 !important; color: #fff !important; font-size: 11px !important; font-weight: 900 !important; padding: 5px 6px !important; }
      .timeline-table th { background: #fff !important; color: #151B46 !important; font-weight: 900 !important; }
      .timeline-table .timeline-day-label td, .timeline-table .separator td { background: #E31937 !important; color: #fff !important; font-size: 7.2px !important; font-weight: 900 !important; letter-spacing: .02em !important; padding: 3px 4px !important; }
      .timeline-table .day-cell { background: #E7F5FC !important; color: #151B46 !important; font-size: 6.2px !important; font-weight: 900 !important; white-space: normal !important; width: 0.74in !important; }
      .timeline-table .session-separator-row td:not(.day-cell) { background: #EEF0F3 !important; color: #151B46 !important; font-size: 7px !important; font-weight: 900 !important; height: 16px !important; text-align: center !important; }
      .timeline-table .event-kind { background: #C8F0F7 !important; color: #151B46 !important; font-weight: 900 !important; width: 0.42in !important; }
      .timeline-table .calc-head { background: #E7F5FC !important; color: #151B46 !important; font-weight: 900 !important; }
      .timeline-table .round-prelim td:not(.day-cell) { background: #FFF6F7 !important; }
      .timeline-table .round-final td:not(.day-cell) { background: #FDECEF !important; }
      .timeline-table .round-custom-block td:not(.day-cell), .timeline-table .round-open-practice td:not(.day-cell), .timeline-table .round-training td:not(.day-cell), .timeline-table .round-intro td:not(.day-cell), .timeline-table .round-awards td:not(.day-cell) { background: #F5F6F8 !important; }
      .timeline-table .split-row td:not(.day-cell) { box-shadow: inset 2px 0 0 #009AC7 !important; }
      .timeline-table .combined-format-cell { background: #F7D8DF !important; color: #151B46 !important; font-weight: 900 !important; }
      .timeline-table .panel-rotation-cell { font-size: 5.2px !important; }
      .timeline-table th:nth-child(1), .timeline-table td.day-cell { width: 0.74in !important; }
      .timeline-table th:nth-child(2) { width: 0.43in !important; }
      .timeline-table th:nth-child(3) { width: 1.50in !important; }
      .timeline-table th:nth-child(4) { width: 0.42in !important; }
      .timeline-table th:nth-child(5) { width: 1.35in !important; }
      .timeline-table th:nth-child(n+6) { width: 0.56in !important; }
      .public-output-controls, .public-designer-panel, .preview-toolbar, .export-actions, .segmented, .report-shortcut-bar { display: none !important; }
      .public-schedule-preview { background: #fff !important; padding: 0 !important; }
      .public-day-card { break-inside: avoid !important; page-break-inside: avoid !important; }
      .poster-preview { transform: none !important; max-width: none !important; min-height: 7.25in !important; width: 100% !important; border-radius: 0 !important; }
    `;
  }

  function openStablePrintWindow(){
    const node = activeReportNode();
    if (!node) {
      window.alert("Open a report first, then click PDF.");
      return;
    }
    const clone = cleanClone(node);
    if (clone.id === "timelinePreview" || clone.classList.contains("timeline-preview")) {
      clone.querySelectorAll("table.timeline-table").forEach(table => table.classList.add("timeline-page-table"));
    }
    const win = window.open("", "_blank");
    if (!win) {
      window.alert("Your browser blocked the PDF window. Allow pop-ups for this app, then click PDF again.");
      return;
    }
    win.document.open();
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(reportTitle())} PDF</title><style>${printCss()}</style></head><body><main class="print-report">${clone.outerHTML}</main></body></html>`);
    win.document.close();
    window.setTimeout(() => { win.focus(); win.print(); }, 350);
  }

  function escapeHtml(value){
    return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function installPrintCss(){
    if (document.getElementById("scheduleReportPrintFixStyles")) return;
    const style = document.createElement("style");
    style.id = "scheduleReportPrintFixStyles";
    style.textContent = `
      @media print {
        @page { size: letter landscape; margin: 0.18in; }
        .app-header, .left-rail, .sb-left-rail, .board-shell, .preview-toolbar, .report-shortcut-bar { display: none !important; }
        .app-main, .workspace, .preview-shell { display: block !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
        .timeline-preview { border: 0 !important; border-radius: 0 !important; overflow: visible !important; }
        .timeline-table { table-layout: fixed !important; min-width: 0 !important; width: 100% !important; page-break-inside: avoid !important; break-inside: avoid !important; }
        .timeline-page-table, .timeline-day-table { page-break-after: always !important; break-after: page !important; }
        .timeline-page-table:last-child, .timeline-day-table:last-child { page-break-after: auto !important; break-after: auto !important; }
        .timeline-table th, .timeline-table td { font-size: 6.1px !important; line-height: 1.04 !important; padding: 1.6px 1.8px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function patchActions(){
    if (!window.actions || window.actions.__reportBehaviorFixesPatched) return false;
    if (typeof window.actions.printPreview === "function") {
      window.actions.printPreview = function(){ return openStablePrintWindow(); };
    }
    ["setPreview", "setOutputSetting", "setPublicOutputSetting"].forEach(name => {
      if (typeof window.actions[name] !== "function") return;
      const original = window.actions[name];
      window.actions[name] = function(){
        const self = this;
        const args = arguments;
        return preserveDuring(() => original.apply(self, args));
      };
    });
    window.actions.__reportBehaviorFixesPatched = true;
    return true;
  }

  function reportModeFromLabel(label){
    const normalized = String(label || "").toLowerCase();
    if (normalized.includes("public")) return "public";
    if (normalized.includes("poster") || normalized.includes("canva")) return "daily";
    if (normalized.includes("timeline") || normalized.includes("operations")) return "timeline";
    return "";
  }

  function installReportShortcutInterception(){
    if (document.__reportShortcutInterceptionInstalled) return;
    document.__reportShortcutInterceptionInstalled = true;
    document.addEventListener("click", event => {
      const button = event.target.closest("#reportShortcutBar button[data-report]");
      if (!button || !window.actions) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      const label = button.dataset.report || button.textContent || "";
      preserveDuring(() => {
        if (/pdf/i.test(label) && typeof window.actions.printPreview === "function") return window.actions.printPreview();
        if (/excel/i.test(label) && typeof window.actions.exportExcel === "function") return window.actions.exportExcel();
        const mode = reportModeFromLabel(label);
        if (mode && typeof window.actions.setPreview === "function") return window.actions.setPreview(mode);
        return null;
      });
    }, true);
  }

  function installPointerSnapshot(){
    if (document.__reportPointerSnapshotInstalled) return;
    document.__reportPointerSnapshotInstalled = true;
    document.addEventListener("pointerdown", event => {
      if (event.target.closest("#reportShortcutBar,.preview-toolbar,.public-output-controls,.public-designer-panel")) {
        document.__reportScrollSnapshot = captureScroll();
      }
    }, true);
    document.addEventListener("click", event => {
      if (event.target.closest("#reportShortcutBar,.preview-toolbar,.public-output-controls,.public-designer-panel")) {
        restoreFor(document.__reportScrollSnapshot || captureScroll(), 900);
      }
    }, true);
  }

  function init(){
    installPrintCss();
    patchActions();
    installReportShortcutInterception();
    installPointerSnapshot();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    init();
    if ((window.actions && window.actions.__reportBehaviorFixesPatched) || attempts > 80) window.clearInterval(timer);
  }, 100);
})();
