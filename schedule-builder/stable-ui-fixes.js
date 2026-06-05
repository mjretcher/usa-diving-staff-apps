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
      .app-header { min-height: 66px !important; height: auto !important; flex-wrap: wrap !important; gap: 8px 14px !important; padding: 8px 18px !important; }
      .brand-lockup { flex: 1 1 280px !important; }
      .header-actions { display: flex !important; flex: 2 1 720px !important; flex-wrap: wrap !important; gap: 6px !important; justify-content: flex-end !important; }
      .header-actions button, .header-actions .text-button, .header-actions .primary-button { min-height: 30px !important; padding: 0 10px !important; width: auto !important; white-space: nowrap !important; }
      .report-shortcut-bar { align-items: center; background: #fff; border: 1px solid #D7E1EA; border-radius: 14px; box-shadow: 0 10px 24px rgba(21,27,70,.10); color: #151B46; display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 16px; padding: 10px 12px; }
      .report-shortcut-bar strong { color: #151B46; font-size: 13px; font-weight: 900; text-transform: uppercase; }
      .report-shortcut-bar span { color: #5F6062; font-size: 11px; font-weight: 700; margin-right: 8px; }
      .report-shortcut-bar button { background: #fff; border: 1px solid #009AC7; border-radius: 999px; color: #151B46; cursor: pointer; font-size: 12px; font-weight: 800; min-height: 30px; padding: 4px 10px; }
      .report-shortcut-bar button:hover { background: #EAF8FB; }
      .usad-readable-card, .usad-readable-card * { color: #151B46 !important; text-shadow: none !important; }
      .usad-readable-card { background: #FFFFFF !important; border-color: #D7E1EA !important; }
      .builder-day-tab.active strong, .builder-day-tab.active span, .builder-day-tab.active em { color: #FFFFFF !important; }
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
    bar.innerHTML = `<strong>Reports</strong><span>Jump to outputs</span><button data-report="Operations Timeline">Operations Timeline</button><button data-report="Public Schedule">Public Schedule</button><button data-report="Poster / Canva View">Poster / Canva</button><button data-report="PDF">PDF</button><button data-report="Excel">Excel</button>`;
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

  function markReadableCards() {
    Array.from(document.querySelectorAll("section, article, .panel, .board-shell, .preview-shell")).slice(0, 10).forEach((node) => {
      if (/COMMAND CENTER|COLOR TEMPLATE|Review Warnings|CURRENT SCHEDULE|BUILD CHECKLIST/i.test(node.textContent || "")) node.classList.add("usad-readable-card");
    });
  }

  function init() {
    installStyles();
    markReadableCards();
    addReportBar();
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;
    if (/review warnings/i.test(text(target.textContent))) {
      event.preventDefault();
      reviewWarnings();
      return;
    }
    const reportButton = event.target.closest("#reportShortcutBar button");
    if (!reportButton) return;
    event.preventDefault();
    showReport(reportButton.dataset.report || text(reportButton.textContent));
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    init();
    if ((attempts >= 12 && document.getElementById("reportShortcutBar")) || attempts >= 20) window.clearInterval(timer);
  }, 250);
})();
