(function () {
  "use strict";

  function fieldName(input) {
    const source = String(input.getAttribute("onchange") || "");
    const match = source.match(/updateEvent\([^,]+,\s*['\"]([^'\"]+)['\"]/);
    return match ? match[1] : "";
  }

  function labelText(label) {
    const clone = label.cloneNode(true);
    clone.querySelectorAll("input,select,textarea,button").forEach((node) => node.remove());
    return String(clone.textContent || "").replace(/\s+/g, " ").trim();
  }

  function valueFor(panel, field) {
    const input = [...panel.querySelectorAll("input[type='number']")].find((node) => fieldName(node) === field);
    return Number(input?.value || 0);
  }

  function enhanceLabels(panel) {
    panel.querySelectorAll("label").forEach((label) => {
      if (label.dataset.editorEnhanced) return;
      const input = label.querySelector("input, textarea, select");
      if (!input) return;
      const text = labelText(label);
      if (text) label.dataset.label = text;
      const field = fieldName(input);
      if (field) label.dataset.field = field;
      if (input.type === "number") {
        input.inputMode = "decimal";
        input.addEventListener("focus", () => input.select(), { once: false });
        input.addEventListener("wheel", (event) => {
          if (document.activeElement === input) event.preventDefault();
        }, { passive: false });
      }
      label.dataset.editorEnhanced = "true";
    });
  }

  function addPanelHeader(panel) {
    if (panel.querySelector(".event-editor-header")) return;
    const eventCard = panel.closest(".scheduled-event");
    const title = eventCard?.querySelector(".event-title-main strong")?.textContent?.trim() || "Event";
    const meta = eventCard?.querySelector(".event-title-main span")?.textContent?.trim() || "Timing and advancement controls";
    const header = document.createElement("div");
    header.className = "event-editor-header";
    header.innerHTML = `<div><span>Event editor</span><strong>${title}</strong><small>${meta}</small></div><div class="event-editor-header-badge">Live timing</div>`;
    panel.insertBefore(header, panel.firstChild);
  }

  function insights(panel) {
    const messages = [];
    const divers = valueFor(panel, "numberOfDivers");
    const dives = valueFor(panel, "numberOfDives");
    const seconds = valueFor(panel, "secondsPerDive");
    if (divers <= 0) messages.push("Divers is 0, so this event contributes no competitive time.");
    if (dives <= 0) messages.push("Dives is 0. Confirm the event template or unlock only for an approved override.");
    if (seconds <= 0) messages.push("Seconds per dive is 0. Timing will not calculate correctly.");
    if (panel.closest(".split-event")) {
      const breaks = valueFor(panel, "numberOfPanelChanges");
      if (breaks <= 0) messages.push("Split is on with no panel breaks. Add breaks if panel rotation requires them.");
    }
    return messages;
  }

  function addInsights(panel) {
    let box = panel.querySelector(".event-editor-insights");
    if (!box) {
      box = document.createElement("div");
      box.className = "event-editor-insights";
      const details = panel.querySelector("details");
      if (details) details.insertAdjacentElement("beforebegin", box);
      else panel.appendChild(box);
    }
    const messages = insights(panel);
    if (!messages.length) {
      box.innerHTML = `<strong>Editor check</strong><span>Timing inputs look ready. Changes update the session timeline automatically.</span>`;
      box.classList.remove("warning");
      return;
    }
    box.classList.add("warning");
    box.innerHTML = `<strong>Review before publishing</strong>${messages.map((item) => `<span>${item}</span>`).join("")}`;
  }

  function installPanel(panel) {
    addPanelHeader(panel);
    enhanceLabels(panel);
    addInsights(panel);
  }

  function install() {
    document.querySelectorAll(".event-detail-panel").forEach(installPanel);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
  window.setInterval(install, 500);
})();
