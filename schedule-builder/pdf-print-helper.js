(function () {
  "use strict";

  function activeReportElement() {
    const candidates = [
      { id: "timelinePreview", label: "Operations Timeline", size: "landscape" },
      { id: "posterPreview", label: "Public Schedule", size: "portrait" },
      { id: "dailySchedulePreview", label: "Daily Schedule", size: "portrait" },
      { id: "reportsPreview", label: "Report", size: "portrait" },
    ];

    for (const item of candidates) {
      const element = document.getElementById(item.id);
      if (!element) continue;
      const box = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || box.width === 0 || box.height === 0) continue;
      return { element, ...item };
    }

    const visibleReport = [...document.querySelectorAll(".timeline-preview, .public-schedule-preview, .daily-schedule-preview")]
      .find((element) => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
      });
    return visibleReport ? { element: visibleReport, label: "Current Report", size: "portrait" } : null;
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

  function printShell(report) {
    const pageSize = report.size === "landscape" ? "letter landscape" : "letter portrait";
    const clone = report.element.cloneNode(true);
    clone.querySelectorAll("button, input, select, textarea, .public-output-controls, .public-designer-panel").forEach((node) => node.remove());

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${pageTitle()} - ${report.label}</title>
  ${linkedStyles()}
  ${inlineStyles()}
  <style>
    @page { size: ${pageSize}; margin: 0.25in; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
      .timeline-table { width: 100% !important; page-break-inside: auto; }
      .timeline-page-table { page-break-after: always; }
      .timeline-page-table:last-child { page-break-after: auto; }
      .public-schedule-preview { box-shadow: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar"><strong>${report.label}</strong><button onclick="window.print()">Print / Save as PDF</button></div>
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

  function install() {
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