(function () {
  "use strict";

  // If the new sb-design sidebar is active, this helper is not needed.
  // The new design handles its own layout via sb-design.css.
  function isNewDesign() {
    return Boolean(document.querySelector('.sb-left-rail'));
  }

  function installCompactWorkspaceStyles() {
    if (isNewDesign()) return;
    if (document.getElementById("scheduleBuilderCompactWorkspaceStyles")) return;
    const style = document.createElement("style");
    style.id = "scheduleBuilderCompactWorkspaceStyles";
    style.textContent = `
      :root { --compact-left-rail-width: 270px; }
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
      .workspace { min-width: 0 !important; }
    `;
    document.head.appendChild(style);
  }

  function collapseLongLeftRailPanels() {
    if (isNewDesign()) return;
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
    if (isNewDesign()) return; // New design is self-sufficient
    installCompactWorkspaceStyles();
    collapseLongLeftRailPanels();
    setInterval(collapseLongLeftRailPanels, 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
