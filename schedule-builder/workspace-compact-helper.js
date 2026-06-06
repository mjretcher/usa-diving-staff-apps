(function () {
  "use strict";

  function installCompactWorkspaceStyles() {
    // Skip if new sidebar design is active — sb-design.css handles layout
    if (document.querySelector('.sb-left-rail')) return;
    if (document.getElementById("scheduleBuilderCompactWorkspaceStyles")) return;
    const style = document.createElement("style");
    style.id = "scheduleBuilderCompactWorkspaceStyles";
    style.textContent = `
      :root {
        --compact-left-rail-width: 270px;
      }

      .app-main {
        grid-template-columns: var(--compact-left-rail-width) minmax(0, 1fr) !important;
        gap: 14px !important;
        align-items: start !important;
      }

      .left-rail {
        width: var(--compact-left-rail-width) !important;
        max-width: var(--compact-left-rail-width) !important;
        position: sticky !important;
        top: 72px !important;
        max-height: calc(100vh - 86px) !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding-right: 4px !important;
        scrollbar-width: thin;
      }

      .left-rail .panel {
        margin-bottom: 10px !important;
        padding: 10px !important;
        border-radius: 12px !important;
      }

      .left-rail .panel-heading,
      .left-rail .panel-header,
      .left-rail .setup-header,
      .left-rail h2,
      .left-rail h3 {
        margin-bottom: 6px !important;
      }

      .left-rail h2,
      .left-rail h3 {
        font-size: 0.82rem !important;
        line-height: 1.15 !important;
      }

      .left-rail p,
      .left-rail .muted,
      .left-rail label,
      .left-rail span,
      .left-rail button,
      .left-rail input,
      .left-rail select {
        font-size: 0.72rem !important;
        line-height: 1.2 !important;
      }

      .left-rail input,
      .left-rail select {
        min-height: 30px !important;
        padding: 5px 7px !important;
      }

      .left-rail .profile-grid,
      .left-rail .catalog-filter-row,
      .left-rail .meet-setup-grid,
      .left-rail .relationship-list {
        gap: 6px !important;
      }

      .left-rail .catalog-event-grid {
        max-height: 34vh !important;
        overflow: auto !important;
        padding-right: 2px !important;
      }

      .left-rail .catalog-event-card,
      .left-rail .usage-chip,
      .left-rail .text-button,
      .left-rail .primary-button,
      .left-rail .danger-soft {
        min-height: 28px !important;
        padding: 6px 8px !important;
        border-radius: 9px !important;
      }

      .left-rail .catalog-event-name,
      .left-rail .catalog-event-meta,
      .left-rail .catalog-event-status,
      .left-rail .catalog-count-pill,
      .left-rail .selected-event-panel,
      .left-rail .inline-message,
      .left-rail .warning-card,
      .left-rail .warning-item,
      .left-rail .health-item,
      .left-rail .exception-note,
      .left-rail textarea,
      .left-rail .chip,
      .left-rail .pill,
      .left-rail .tag,
      .left-rail .status-pill {
        max-width: 100% !important;
        overflow-wrap: anywhere !important;
        word-break: normal !important;
        white-space: normal !important;
      }

      .left-rail .catalog-event-name,
      .left-rail .catalog-event-meta,
      .left-rail .selected-event-panel p,
      .left-rail .inline-message,
      .left-rail .warning-card p,
      .left-rail .warning-item p,
      .left-rail .health-item p {
        display: -webkit-box !important;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden !important;
      }

      .left-rail .selected-event-panel,
      .left-rail .catalog-add-card,
      .left-rail .catalog-toolbox {
        padding: 8px !important;
        border-radius: 10px !important;
      }

      .left-rail .selected-event-facts,
      .left-rail .panel-actions-inline {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 5px !important;
      }

      .left-rail .selected-event-facts span,
      .left-rail .summary-pill,
      .left-rail .stat-pill {
        padding: 4px 6px !important;
        border-radius: 999px !important;
        max-width: 100% !important;
      }

      .left-rail .warning-list,
      .left-rail .schedule-health-panel,
      .left-rail .warnings-panel {
        display: none !important;
      }

      .left-rail details.compact-side-section > summary {
        cursor: pointer;
        font-weight: 800;
        color: #171F69;
        list-style: none;
      }

      .workspace {
        min-width: 0 !important;
      }

      .command-center,
      .preview-shell,
      .day-board,
      .timeline-preview {
        max-width: 100% !important;
      }

      @media (max-width: 1100px) {
        :root { --compact-left-rail-width: 240px; }
        .app-main { gap: 10px !important; }
      }

      @media (max-width: 900px) {
        .app-main {
          display: block !important;
        }
        .left-rail {
          position: relative !important;
          top: auto !important;
          width: 100% !important;
          max-width: 100% !important;
          max-height: none !important;
          overflow: visible !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function collapseLongLeftRailPanels() {
    const leftRail = document.querySelector(".left-rail");
    if (!leftRail) return;

    const panels = [...leftRail.querySelectorAll(":scope > section.panel")];
    panels.forEach((panel, index) => {
      if (panel.dataset.compactProcessed === "1") return;
      panel.dataset.compactProcessed = "1";

      const heading = panel.querySelector("h2, h3");
      const title = heading ? heading.textContent.trim() : "Panel";
      const shouldCollapse = index > 1 || /profile|rules|health|warnings|setup/i.test(title);
      if (!shouldCollapse) return;

      const details = document.createElement("details");
      details.className = "compact-side-section";
      if (!/profile|rules|health|warnings/i.test(title)) details.open = true;

      const summary = document.createElement("summary");
      summary.textContent = title;
      details.appendChild(summary);

      [...panel.childNodes].forEach((node) => {
        if (node === heading || (node.nodeType === 1 && node.querySelector && node.querySelector("h2, h3") === heading)) return;
        details.appendChild(node);
      });

      panel.innerHTML = "";
      panel.appendChild(details);
    });
  }

  function install() {
    installCompactWorkspaceStyles();
    collapseLongLeftRailPanels();
    setInterval(collapseLongLeftRailPanels, 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();