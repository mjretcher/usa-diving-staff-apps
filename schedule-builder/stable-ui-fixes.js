(function () {
  "use strict";

  function text(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function installStyles() {
    if (document.getElementById("stableUiFixStyles")) return;
    const style = document.createElement("style");
    style.id = "stableUiFixStyles";
    style.textContent = `
      .app-header { min-height: 48px !important; height: 48px !important; flex-wrap: nowrap !important; gap: 8px !important; padding: 0 14px !important; align-items: center !important; }
      .brand-lockup { flex: 0 0 auto !important; min-width: 0 !important; max-width: 220px !important; }
      .brand-lockup h1, .brand-lockup p { color: #FFFFFF !important; }
      .header-actions { display: flex !important; flex: 0 0 auto !important; flex-wrap: nowrap !important; gap: 6px !important; justify-content: flex-end !important; align-items: center !important; }
      .header-actions button, .header-actions .text-button, .header-actions .primary-button { min-height: 30px !important; padding: 0 10px !important; width: auto !important; white-space: nowrap !important; }

      .usad-readable-card:not(.sb-board-wrap):not(.board-shell),
      .command-center-card,
      .command-center-hero,
      .schedule-command-card,
      .dashboard-command-card {
        background: #FFFFFF !important;
        border: 1px solid #D7E1EA !important;
        color: #151B46 !important;
        text-shadow: none !important;
      }

      .usad-readable-card:not(.sb-board-wrap):not(.board-shell) *,
      .command-center-panel:not(:where(.sb-board-wrap, .sb-board-wrap *)) *,
      .command-center-card *,
      .command-center-hero *,
      .schedule-command-card *,
      .dashboard-command-card * {
        color: #151B46 !important;
        opacity: 1 !important;
        text-shadow: none !important;
      }
      /* Hard exclusion: sb-board-wrap and board-shell never get the dark text treatment */
      .sb-board-wrap *, .board-shell *, .sb-left-rail * { color: inherit; }
      .sb-board-wrap .usad-readable-card *, .board-shell .usad-readable-card * { color: inherit !important; opacity: inherit !important; }

      .usad-readable-card .muted,
      .usad-readable-card p,
      .usad-readable-card small,
      .usad-readable-card span:not(.status-dot):not(.check-dot) {
        color: #5F6062 !important;
      }

      .usad-readable-card button.primary-button,
      .usad-readable-card button.release-button,
      .usad-readable-card button[class*="release"],
      .usad-readable-card button[class*="warning"],
      .usad-readable-card .primary-button {
        color: #FFFFFF !important;
      }

      .builder-day-tabs {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 10px !important;
        max-height: 180px !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        padding: 12px 14px !important;
        scrollbar-gutter: stable !important;
      }
      .builder-day-tab { flex: 1 1 170px !important; max-width: 235px !important; min-width: 150px !important; }
      .builder-day-tab.active strong, .builder-day-tab.active span, .builder-day-tab.active em { color: #FFFFFF !important; }

      .report-shortcut-bar { align-items: center; background: #fff; border: 1px solid #D7E1EA; border-radius: 14px; box-shadow: 0 10px 24px rgba(21,27,70,.10); color: #151B46; display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 16px; padding: 10px 12px; }
      .report-shortcut-bar strong { color: #151B46; font-size: 13px; font-weight: 900; text-transform: uppercase; }
      .report-shortcut-bar span { color: #5F6062; font-size: 11px; font-weight: 700; margin-right: 8px; }
      .report-shortcut-bar :not(.sb-left-rail) > button:not(.sb-tab-btn):not(.sb-lib-item button) { background: #fff; border: 1px solid #009AC7; border-radius: 999px; color: #151B46; cursor: pointer; font-size: 12px; font-weight: 800; min-height: 30px; padding: 4px 10px; }
      .report-shortcut-bar button:hover { background: #EAF8FB; }

      .timeline-table .title th, .timeline-table .timeline-day-label td, .timeline-table .timeline-day-label th, .timeline-table .timeline-endcap-row td:not(.day-cell) { color: #FFFFFF !important; }
    
      /* ════════════════════════════════════════════════
         SIDEBAR COMPREHENSIVE COLOR OVERRIDES
         Scoped to .sb-left-rail — beats all global rules
         ════════════════════════════════════════════════ */

      /* Base: everything in sidebar is light text */
      .sb-left-rail,
      .sb-left-rail * {
        color: rgba(255,255,255,.82) !important;
        opacity: 1 !important;
        text-shadow: none !important;
      }

      /* Tab nav background */
      .sb-left-rail { background: #0a0e38 !important; }
      .sb-tab-body { background: #0a0e38 !important; }

      /* Tab buttons */
      .sb-left-rail .sb-tab-btn {
        background: transparent !important;
        background-color: transparent !important;
        color: rgba(255,255,255,.75) !important;
        border: none !important;
        border-radius: 5px !important;
        min-height: 0 !important;
        padding: 0 9px !important;
        font-size: 11.5px !important;
        font-weight: 400 !important;
        width: 100% !important;
        text-align: left !important;
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
        height: 33px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        cursor: pointer !important;
      }
      .sb-left-rail .sb-tab-btn.active {
        background: rgba(255,255,255,.1) !important;
        background-color: rgba(255,255,255,.1) !important;
        color: #ffffff !important;
        font-weight: 600 !important;
      }
      .sb-left-rail .sb-tab-btn:hover {
        background: rgba(255,255,255,.07) !important;
        background-color: rgba(255,255,255,.07) !important;
        color: rgba(255,255,255,.95) !important;
      }
      .sb-left-rail .sb-tab-badge {
        background: #e31937 !important;
        color: #fff !important;
        font-size: 9px !important;
        font-weight: 700 !important;
        border-radius: 8px !important;
        padding: 0 4px !important;
        height: 15px !important;
        min-width: 15px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-left: auto !important;
      }

      /* Field labels */
      .sb-left-rail .sb-field-label,
      .sb-left-rail label {
        color: rgba(212,220,245,.7) !important;
        font-size: 9.5px !important;
        font-weight: 700 !important;
        letter-spacing: .07em !important;
        text-transform: uppercase !important;
      }

      /* Input and select fields */
      .sb-left-rail input,
      .sb-left-rail select,
      .sb-left-rail textarea {
        color: rgba(255,255,255,.9) !important;
        background: rgba(255,255,255,.08) !important;
        background-color: rgba(255,255,255,.08) !important;
        border: 1px solid rgba(255,255,255,.15) !important;
        border-radius: 5px !important;
        padding: 0 8px !important;
        height: 27px !important;
        font-size: 11.5px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        font-family: inherit !important;
        min-height: 0 !important;
      }
      .sb-left-rail input::placeholder { color: rgba(255,255,255,.35) !important; }
      .sb-left-rail input:focus,
      .sb-left-rail select:focus {
        outline: none !important;
        border-color: rgba(143,195,234,.5) !important;
        background: rgba(255,255,255,.12) !important;
        background-color: rgba(255,255,255,.12) !important;
      }
      .sb-left-rail select option {
        background: #111650 !important;
        color: #d4dcf5 !important;
      }

      /* Day chips */
      .sb-left-rail .sb-day-chip {
        background: rgba(255,255,255,.06) !important;
        background-color: rgba(255,255,255,.06) !important;
        border: 1px solid rgba(255,255,255,.1) !important;
        border-radius: 5px !important;
        padding: 5px 8px !important;
        margin-bottom: 3px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        font-size: 11px !important;
      }
      .sb-left-rail .sb-day-chip-date { color: rgba(212,220,245,.55) !important; font-size: 10px !important; }

      /* Catalog items */
      .sb-left-rail .sb-cat-item {
        background: rgba(255,255,255,.05) !important;
        background-color: rgba(255,255,255,.05) !important;
        border: 1px solid rgba(255,255,255,.1) !important;
        border-radius: 5px !important;
        padding: 7px 8px !important;
        margin-bottom: 3px !important;
        cursor: pointer !important;
      }
      .sb-left-rail .sb-cat-item:hover { border-color: rgba(143,195,234,.4) !important; background: rgba(255,255,255,.08) !important; }
      .sb-left-rail .sb-cat-name { font-size: 11.5px !important; font-weight: 500 !important; color: rgba(255,255,255,.9) !important; }
      .sb-left-rail .sb-cat-sub { font-size: 10px !important; color: rgba(212,220,245,.55) !important; margin-top: 1px !important; }
      .sb-left-rail .sb-round-pill {
        background: rgba(255,255,255,.06) !important;
        background-color: rgba(255,255,255,.06) !important;
        border: 1px solid rgba(255,255,255,.12) !important;
        color: rgba(212,220,245,.75) !important;
        border-radius: 8px !important;
        padding: 0 6px !important;
        height: 17px !important;
        font-size: 9px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        min-height: 0 !important;
      }
      .sb-left-rail .sb-round-pill.active,
      .sb-left-rail .sb-round-pill:hover {
        background: #171f69 !important;
        background-color: #171f69 !important;
        color: #fff !important;
        border-color: #1e2d8a !important;
      }

      /* Health items */
      .sb-left-rail .sb-health-item {
        border-radius: 5px !important;
        padding: 6px 8px !important;
        margin-bottom: 3px !important;
      }
      .sb-left-rail .sb-health-item.err {
        background: rgba(239,68,68,.15) !important;
        border: 1px solid rgba(239,68,68,.3) !important;
      }
      .sb-left-rail .sb-health-item.err,
      .sb-left-rail .sb-health-item.err * { color: #fca5a5 !important; }
      .sb-left-rail .sb-health-item.warn {
        background: rgba(250,204,21,.1) !important;
        border: 1px solid rgba(250,204,21,.25) !important;
      }
      .sb-left-rail .sb-health-item.warn,
      .sb-left-rail .sb-health-item.warn * { color: #fde68a !important; }
      .sb-left-rail .sb-health-item.info {
        background: rgba(59,130,246,.1) !important;
        border: 1px solid rgba(59,130,246,.25) !important;
      }
      .sb-left-rail .sb-health-item.info,
      .sb-left-rail .sb-health-item.info * { color: #93c5fd !important; }
      .sb-left-rail .sb-health-title { font-weight: 600 !important; font-size: 11px !important; }
      .sb-left-rail .sb-health-sub { font-size: 10px !important; margin-top: 1px !important; opacity: .8 !important; }

      /* Library items */
      .sb-left-rail .sb-lib-item {
        background: rgba(255,255,255,.05) !important;
        background-color: rgba(255,255,255,.05) !important;
        border: 1px solid rgba(255,255,255,.1) !important;
        border-radius: 5px !important;
        padding: 7px 8px !important;
        margin-bottom: 3px !important;
        cursor: pointer !important;
      }
      .sb-left-rail .sb-lib-item:hover { border-color: rgba(143,195,234,.3) !important; }
      .sb-left-rail .sb-lib-active { border-color: rgba(143,195,234,.5) !important; background: rgba(143,195,234,.08) !important; }
      .sb-left-rail .sb-lib-name { font-size: 11.5px !important; font-weight: 500 !important; color: rgba(255,255,255,.9) !important; }
      .sb-left-rail .sb-lib-sub { font-size: 10px !important; color: rgba(212,220,245,.55) !important; margin-top: 1px !important; }

      /* All buttons inside sidebar (non-tab) */
      .sb-left-rail button:not(.sb-tab-btn) {
        background: rgba(255,255,255,.08) !important;
        background-color: rgba(255,255,255,.08) !important;
        border: 1px solid rgba(255,255,255,.15) !important;
        color: rgba(255,255,255,.82) !important;
        border-radius: 5px !important;
        cursor: pointer !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        min-height: 0 !important;
        padding: 4px 8px !important;
        line-height: 1.4 !important;
      }
      .sb-left-rail button:not(.sb-tab-btn):hover {
        background: rgba(255,255,255,.13) !important;
        background-color: rgba(255,255,255,.13) !important;
        color: #fff !important;
      }
      /* Save to library button — sky blue accent */
      .sb-left-rail button[onclick*="saveNamedSchedule"] {
        background: #8fc3ea !important;
        background-color: #8fc3ea !important;
        color: #0a1840 !important;
        border: none !important;
        font-weight: 700 !important;
        width: 100% !important;
        height: 28px !important;
        border-radius: 5px !important;
        font-size: 11.5px !important;
      }
      .sb-left-rail button[onclick*="saveNamedSchedule"]:hover {
        background: #a8d4f0 !important;
        background-color: #a8d4f0 !important;
      }

      /* Section headers */
      .sb-left-rail div[style*="text-transform: uppercase"],
      .sb-left-rail div[style*="text-transform:uppercase"] {
        color: rgba(212,220,245,.55) !important;
      }

      /* "No saved schedules yet" empty state */
      .sb-left-rail div[style*="text-align:center"],
      .sb-left-rail div[style*="text-align: center"] {
        color: rgba(212,220,245,.45) !important;
      }

      /* TEMPLATES section label */
      .sb-left-rail > div > div[style*="font-size:9px"],
      .sb-left-rail > * div[style*="font-size:9px"] {
        color: rgba(212,220,245,.5) !important;
        font-weight: 700 !important;
        letter-spacing: .08em !important;
        text-transform: uppercase !important;
        margin: 10px 0 5px !important;
      }

      /* Add day button */
      .sb-left-rail button[onclick*="addDay"] {
        width: 100% !important;
        margin-top: 4px !important;
        height: 26px !important;
        border-radius: 5px !important;
        background: rgba(255,255,255,.06) !important;
        background-color: rgba(255,255,255,.06) !important;
        border: 1px solid rgba(255,255,255,.12) !important;
        color: rgba(255,255,255,.7) !important;
        font-size: 10.5px !important;
        cursor: pointer !important;
      }
    `;
    document.head.appendChild(style);
  }

  function addReportBar() {
    if (document.getElementById("reportShortcutBar")) return true;
    const main = document.querySelector(".app-main");
    if (!main || !main.parentElement) return false;
    const bar = document.createElement("section");
    bar.id = "reportShortcutBar";
    bar.className = "report-shortcut-bar";
    bar.innerHTML = `<strong>Reports</strong><span>Jump to outputs</span><button type="button" data-report="Operations Timeline">Operations Timeline</button><button type="button" data-report="Public Schedule">Public Schedule</button><button type="button" data-report="Poster / Canva View">Poster / Canva</button><button type="button" data-report="PDF">PDF</button><button type="button" data-report="Excel">Excel</button>`;
    bar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-report]");
      if (!button) return;
      event.preventDefault();
      showReport(button.dataset.report || text(button.textContent));
    });
    main.parentElement.insertBefore(bar, main);
    return true;
  }

  function findButton(label) {
    const wanted = text(label).toLowerCase();
    return Array.from(document.querySelectorAll("button, a")).find((node) => text(node.textContent).toLowerCase() === wanted);
  }

  function showReport(label) {
    const button = findButton(label);
    if (button) button.click();
    window.setTimeout(() => {
      const target = document.querySelector(".preview-shell") || document.querySelector(".timeline-preview");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function reviewWarnings() {
    const target = document.querySelector(".schedule-health-panel") || document.querySelector(".warning-list") || document.querySelector(".health-summary-grid");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindReviewWarnings() {
    Array.from(document.querySelectorAll("button, a")).forEach((node) => {
      if (!/review warnings/i.test(text(node.textContent)) || node.dataset.reviewWarningBound) return;
      node.dataset.reviewWarningBound = "1";
      node.addEventListener("click", (event) => {
        event.preventDefault();
        reviewWarnings();
      });
    });
  }

  function markReadableCards() {
    // DISABLED for new design — markReadableCards causes color:#151B46 to bleed
    // into board content via usad-readable-card * rule.
    // The REPORTS bar is rendered by addReportBar() with explicit styling.
    if (document.querySelector('.sb-left-rail')) return;

    Array.from(document.querySelectorAll("section, article, div, .panel")).slice(0, 120).forEach((node) => {
      if (node.closest('.sb-left-rail') || node.closest('.sb-board-wrap') ||
          node.closest('.board-shell') || node.closest('.day-lane') ||
          node.closest('.session-card') || node.closest('.preview-shell')) return;
      if (node.classList.contains('board-shell') || node.classList.contains('sb-board-wrap') ||
          node.classList.contains('session-card') || node.classList.contains('day-lane')) return;
      if (/COMMAND CENTER|COLOR TEMPLATE|Review Warnings|CURRENT SCHEDULE|BUILD CHECKLIST/i.test(node.textContent || "")) {
        node.classList.add("usad-readable-card");
      }
    });
  }

  function init() {
    installStyles();
    markReadableCards();
    addReportBar();
    bindReviewWarnings();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    init();
    if ((attempts >= 12 && document.getElementById("reportShortcutBar")) || attempts >= 20) window.clearInterval(timer);
  }, 250);
})();
