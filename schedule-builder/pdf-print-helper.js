(function () {
  "use strict";

  const PRINT_MODE_KEY = "usa-diving-report-print-mode-v1";
  const VALID_PRINT_MODES = new Set(["auto", "oneDay", "compact", "manual"]);

  function printMode() {
    const stored = localStorage.getItem(PRINT_MODE_KEY) || "auto";
    return VALID_PRINT_MODES.has(stored) ? stored : "auto";
  }

  function setPrintMode(value) {
    const next = VALID_PRINT_MODES.has(value) ? value : "auto";
    localStorage.setItem(PRINT_MODE_KEY, next);
    installReportControls();
  }

  function activeReportElement() {
    const candidates = [
      { id: "timelinePreview", label: "Operations Timeline", size: "landscape", kind: "timeline" },
      { selector: ".public-schedule-preview", label: "Public Schedule", size: "portrait", kind: "public" },
      { selector: ".poster-preview", label: "Poster / Canva View", size: "portrait", kind: "poster" },
      { id: "dailySchedulePreview", label: "Daily Schedule", size: "portrait", kind: "daily" },
      { id: "reportsPreview", label: "Report", size: "portrait", kind: "generic" },
    ];

    for (const item of candidates) {
      const element = item.id ? document.getElementById(item.id) : document.querySelector(item.selector);
      if (!element) continue;
      const box = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || box.width === 0 || box.height === 0) continue;
      return { element, ...item };
    }

    const visibleReport = [...document.querySelectorAll(".timeline-preview, .public-schedule-preview, .poster-preview, .daily-schedule-preview")]
      .find((element) => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
      });
    return visibleReport ? { element: visibleReport, label: "Current Report", size: "portrait", kind: "generic" } : null;
  }

  function pageTitle() {
    const title = document.querySelector(".command-center-copy h2")?.textContent?.trim();
    return title || "USA Diving Schedule Report";
  }

  function linkedStyles() {
    return [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((link) => `<link rel="stylesheet" href="${link.getAttribute("href")}">`)
      .join("\n");
  }

  function inlineStyles() {
    return [...document.querySelectorAll("style")].map((style) => style.outerHTML).join("\n");
  }

  function daySessionCount(dayCard) {
    return dayCard.querySelectorAll(".public-schedule-item, .poster-session").length;
  }

  function prepareReportClone(report, mode) {
    const clone = report.element.cloneNode(true);
    clone.querySelectorAll("button, input, select, textarea, .public-output-controls, .public-designer-panel, .report-print-controls").forEach((node) => node.remove());

    if (report.kind === "public") {
      const dayCards = [...clone.querySelectorAll(".public-day-card, .polished-public-day")];
      dayCards.forEach((dayCard) => {
        const count = daySessionCount(dayCard);
        dayCard.classList.add("print-day-card");
        if (mode === "oneDay") dayCard.classList.add("print-force-break");
        if (mode === "compact") dayCard.classList.add("print-compact-flow");
        if (mode === "auto" && count >= 4) dayCard.classList.add("print-force-break");
      });
    }

    if (report.kind === "timeline") {
      const tables = [...clone.querySelectorAll(".timeline-page-table")];
      tables.forEach((table, index) => {
        table.classList.add("print-timeline-table");
        if (mode !== "compact" && index < tables.length - 1) table.classList.add("print-force-break-after");
      });
    }

    return clone;
  }

  function printShell(report) {
    const mode = printMode();
    const pageSize = report.size === "landscape" ? "letter landscape" : "letter portrait";
    const clone = prepareReportClone(report, mode);

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${pageTitle()} - ${report.label}</title>
  ${linkedStyles()}
  ${inlineStyles()}
  <style>
    @page { size: ${pageSize}; margin: 0.28in; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
    html, body { margin: 0; background: #fff !important; }
    body { color: #171F69; font-family: Arial, sans-serif; }
    .print-toolbar { position: sticky; top: 0; z-index: 99999; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 18px; background: #fff; border-bottom: 1px solid #dbe7f3; box-shadow: 0 6px 18px rgba(23,31,105,.12); }
    .print-toolbar strong { color: #171F69; }
    .print-toolbar button { border: 0; border-radius: 999px; padding: 10px 16px; background: #171F69; color: white; font-weight: 800; cursor: pointer; }
    .print-page { padding: 18px; }
    .print-page > * { max-width: none !important; }

    @media print {
      .print-toolbar { display: none !important; }
      .print-page { padding: 0 !important; }
      body { background: #fff !important; }

      .timeline-preview, .timeline-preview-by-day { width: 100% !important; }
      .timeline-table { width: 100% !important; page-break-inside: auto; break-inside: auto; }
      .print-timeline-table.print-force-break-after { page-break-after: always; break-after: page; }
      .timeline-table tr, .timeline-table td, .timeline-table th { page-break-inside: avoid; break-inside: avoid; }

      .public-schedule-preview {
        box-shadow: none !important;
        padding: 0 !important;
        background: #fff !important;
      }
      .public-hero-card {
        page-break-after: avoid;
        break-after: avoid;
        margin-bottom: 0.16in !important;
      }
      .public-day-grid, .polished-public-grid {
        display: block !important;
        column-count: 1 !important;
        gap: 0 !important;
      }
      .public-day-card, .polished-public-day, .print-day-card {
        display: block !important;
        width: 100% !important;
        margin: 0 0 0.16in !important;
        padding: 0.12in !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        box-shadow: none !important;
        border: 1px solid #dbe7f3 !important;
      }
      .print-day-card.print-force-break {
        page-break-before: auto !important;
        break-before: auto !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .print-day-card.print-force-break:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      .print-day-card.print-compact-flow {
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      .public-day-top {
        page-break-after: avoid !important;
        break-after: avoid !important;
        margin-bottom: 0.08in !important;
      }
      .public-session-list {
        display: block !important;
      }
      .public-schedule-item {
        display: grid !important;
        grid-template-columns: 1.15in 1fr !important;
        gap: 0.10in !important;
        width: 100% !important;
        margin: 0 0 0.08in !important;
        padding: 0.08in !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        box-shadow: none !important;
      }
      .public-schedule-item * {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .public-time-pill {
        min-width: 0 !important;
        width: auto !important;
        white-space: nowrap !important;
      }
      .public-item-body ul {
        margin-top: 0.04in !important;
      }
      .public-schedule-footer {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar"><strong>${report.label} - ${mode === "oneDay" ? "One day per page" : mode === "compact" ? "Compact flow" : mode === "manual" ? "Manual breaks" : "Auto page breaks"}</strong><button onclick="window.print()">Print / Save as PDF</button></div>
  <main class="print-page">${clone.outerHTML}</main>
</body>
</html>`;
  }

  function openPdfPrintView() {
    const report = activeReportElement();
    if (!report) {
      alert("No report is currently visible. Open the report you want, then click PDF/Print again.");
      return;
    }
    const win = window.open("", "_blank", "width=1200,height=850");
    if (!win) {
      alert("The print window was blocked. Please allow pop-ups for this site and click PDF/Print again.");
      return;
    }
    win.document.open();
    win.document.write(printShell(report));
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 500);
  }

  function installReportControls() {
    const toolbar = document.querySelector(".preview-toolbar .export-actions");
    if (!toolbar) return;
    let wrap = document.getElementById("reportPrintControls");
    if (!wrap) {
      wrap = document.createElement("label");
      wrap.id = "reportPrintControls";
      wrap.className = "report-print-controls text-button";
      wrap.style.display = "inline-flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "6px";
      wrap.style.padding = "8px 10px";
      wrap.innerHTML = `Print flow <select aria-label="Report print flow"><option value="auto">Auto</option><option value="oneDay">One day/page</option><option value="compact">Compact</option><option value="manual">Manual</option></select>`;
      toolbar.insertBefore(wrap, toolbar.firstChild);
      wrap.querySelector("select").addEventListener("change", (event) => setPrintMode(event.target.value));
    }
    wrap.querySelector("select").value = printMode();
  }

  function install() {
    installReportControls();
    if (!window.actions) return false;
    window.actions.printPreview = openPdfPrintView;
    window.actions.exportPdf = openPdfPrintView;
    window.actions.printCurrentReport = openPdfPrintView;
    return true;
  }

  if (!install()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 80) clearInterval(timer);
    }, 100);
  }

  setInterval(installReportControls, 1000);

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    const text = String(button.textContent || "").toLowerCase();
    const attr = String(button.getAttribute("onclick") || "").toLowerCase();
    if (!/pdf|print/.test(text) && !/printpreview|exportpdf|printcurrentreport/.test(attr)) return;
    event.preventDefault();
    event.stopPropagation();
    openPdfPrintView();
  }, true);
})();