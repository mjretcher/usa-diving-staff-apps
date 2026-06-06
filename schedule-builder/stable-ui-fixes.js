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
      .brand-lockup { flex: 1 1 300px !important; min-width: 260px !important; }
      .brand-lockup h1, .brand-lockup p { color: #FFFFFF !important; }
      .header-actions { display: flex !important; flex: 2 1 760px !important; flex-wrap: wrap !important; gap: 6px !important; justify-content: flex-end !important; }
      .header-actions button, .header-actions .text-button, .header-actions .primary-button { min-height: 30px !important; padding: 0 10px !important; width: auto !important; white-space: nowrap !important; }

      .usad-readable-card,
      .command-center-panel,
      .command-center-card,
      .command-center-hero,
      .schedule-command-card,
      .dashboard-command-card {
        background: #FFFFFF !important;
        border: 1px solid #D7E1EA !important;
        color: #151B46 !important;
        text-shadow: none !important;
      }

      .usad-readable-card *,
      .command-center-panel *,
      .command-center-card *,
      .command-center-hero *,
      .schedule-command-card *,
      .dashboard-command-card * {
        color: #151B46 !important;
        opacity: 1 !important;
        text-shadow: none !important;
      }

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
      .report-shortcut-bar button { background: #fff; border: 1px solid #009AC7; border-radius: 999px; color: #151B46; cursor: pointer; font-size: 12px; font-weight: 800; min-height: 30px; padding: 4px 10px; }
      .report-shortcut-bar button:hover { background: #EAF8FB; }

      .timeline-table .title th, .timeline-table .timeline-day-label td, .timeline-table .timeline-day-label th, .timeline-table .timeline-endcap-row td:not(.day-cell) { color: #FFFFFF !important; }
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
    Array.from(document.querySelectorAll("section, article, div, .panel, .board-shell, .preview-shell")).slice(0, 120).forEach((node) => {
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
