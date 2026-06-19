(function () {
  "use strict";
  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";

  const HELP = {
    numberOfDivers: "Drives event time. Update when projected or actual entries change.",
    numberOfDives: "Template dive count. Unlock only for an approved meet-format exception.",
    secondsPerDive: "Controls timeline length. Use profile defaults unless operations approves a change.",
    projectedAdvancers: "Expected advancers before results are final.",
    actualAdvancers: "Final results count when known.",
    finalFieldSize: "Target final size. Usually 12 unless format says otherwise.",
    domesticEligibleAdvancers: "Domestic-eligible athletes used for USA selection calculations.",
    foreignAthleteAdjustment: "Subtract or adjust for foreign athletes when they affect advancement.",
    dualCitizenAdjustment: "Use only when dual-citizen eligibility changes advancement math.",
    numberOfPanelChanges: "Panel break count for split-board operations.",
    minutesPerPanelChange: "Minutes added for each split-board panel break."
  };

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
    catch (_error) { return null; }
  }

  function writeState(state) {
    if (!state) return;
    const now = new Date().toISOString();
    state.updatedAt = now;
    if (state.meet) state.meet.updatedAt = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function panelEventId(panel) {
    return panel.closest(".scheduled-event")?.dataset?.eventId || "";
  }

  function findEvent(state, scheduleEventId) {
    for (const session of state?.sessions || []) {
      for (const event of session.events || []) {
        if (event.scheduleEventId === scheduleEventId) return { session, event };
      }
    }
    return null;
  }

  function fieldName(input) {
    const source = String(input.getAttribute("onchange") || "");
    const match = source.match(/updateEvent\([^,]+,\s*['\"]([^'\"]+)['\"]/);
    return match ? match[1] : "";
  }

  function labelText(label) {
    const clone = label.cloneNode(true);
    clone.querySelectorAll("input,select,textarea,button,.field-help,.stepper").forEach((node) => node.remove());
    return String(clone.textContent || "").replace(/\s+/g, " ").trim();
  }

  function inputFor(panel, field) {
    return [...panel.querySelectorAll("input,textarea,select")].find((node) => fieldName(node) === field) || null;
  }

  function valueFor(panel, field) {
    return Number(inputFor(panel, field)?.value || 0);
  }

  function changeNumber(input, direction) {
    const step = Number(input.step || 1) || 1;
    const min = input.min === "" ? -Infinity : Number(input.min || 0);
    const next = Math.max(min, Number(input.value || 0) + direction * step);
    input.value = String(Number(next.toFixed(3)));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function addStepper(label, input) {
    if (label.querySelector(".stepper") || input.type !== "number" || input.disabled) return;
    const stepper = document.createElement("div");
    stepper.className = "stepper";
    stepper.innerHTML = `<button type="button" class="step-down" aria-label="Decrease">-</button><button type="button" class="step-up" aria-label="Increase">+</button>`;
    stepper.querySelector(".step-down").addEventListener("click", (event) => { event.preventDefault(); changeNumber(input, -1); });
    stepper.querySelector(".step-up").addEventListener("click", (event) => { event.preventDefault(); changeNumber(input, 1); });
    label.appendChild(stepper);
  }

  function enhanceLabels(panel) {
    panel.querySelectorAll("label").forEach((label) => {
      const input = label.querySelector("input, textarea, select");
      if (!input) return;
      const text = labelText(label);
      if (text) label.dataset.label = text;
      const field = fieldName(input);
      if (field) label.dataset.field = field;
      if (input.type === "number") {
        input.inputMode = "decimal";
        if (!input.dataset.editorEvents) {
          input.addEventListener("focus", () => input.select(), { once: false });
          input.addEventListener("wheel", (event) => { if (document.activeElement === input) event.preventDefault(); }, { passive: false });
          input.dataset.editorEvents = "true";
        }
        addStepper(label, input);
      }
      if (field && HELP[field] && !label.querySelector(".field-help")) {
        const help = document.createElement("small");
        help.className = "field-help";
        help.textContent = HELP[field];
        label.appendChild(help);
      }
      label.dataset.editorEnhanced = "true";
    });
  }

  function resetEvent(panel) {
    const eventId = panelEventId(panel);
    const state = readState();
    const located = findEvent(state, eventId);
    if (!located) return;
    const event = located.event;
    const ok = window.confirm("Reset this event to template defaults for dives, seconds per dive, locks, split settings, and notes?");
    if (!ok) return;
    event.numberOfDives = Number(event.defaultNumberOfDives || event.defaultDives || event.numberOfDives || 0);
    event.numberOfDivesLocked = true;
    if (Number(event.defaultSecondsPerDive || 0) > 0) event.secondsPerDive = Number(event.defaultSecondsPerDive);
    event.secondsPerDiveLocked = Boolean(event.defaultSecondsPerDive);
    event.manualSplit = false;
    event.numberOfPanelChanges = 0;
    event.minutesPerPanelChange = 0;
    event.detailsOpen = true;
    writeState(state);
    window.location.reload();
  }

  function addPanelHeader(panel) {
    const eventCard = panel.closest(".scheduled-event");
    const title = eventCard?.querySelector(".event-title-main strong")?.textContent?.trim() || "Event";
    const meta = eventCard?.querySelector(".event-title-main span")?.textContent?.trim() || "Timing and advancement controls";
    let header = panel.querySelector(".event-editor-header");
    if (!header) {
      header = document.createElement("div");
      header.className = "event-editor-header";
      panel.insertBefore(header, panel.firstChild);
    }
    header.innerHTML = `<div><span>Event editor</span><strong>${title}</strong><small>${meta}</small></div><div class="event-editor-actions"><button type="button" class="editor-reset-button">Reset defaults</button><div class="event-editor-header-badge">Live timing</div></div>`;
    header.querySelector(".editor-reset-button").addEventListener("click", (event) => { event.preventDefault(); resetEvent(panel); });
  }

  function addGroupTitles(panel) {
    const topGrid = panel.querySelector(".event-grid-wide");
    if (topGrid && !topGrid.previousElementSibling?.classList?.contains("editor-section-title")) {
      const title = document.createElement("div");
      title.className = "editor-section-title";
      title.innerHTML = `<strong>Timing inputs</strong><span>Divers, dive count, and seconds-per-dive drive the live session timeline.</span>`;
      topGrid.insertAdjacentElement("beforebegin", title);
    }
    const details = panel.querySelector("details");
    if (details && !details.dataset.renamed) {
      const summary = details.querySelector("summary");
      if (summary) summary.textContent = "Advancement, eligibility adjustments, and notes";
      details.dataset.renamed = "true";
    }
  }

  function timingImpact(panel) {
    const divers = valueFor(panel, "numberOfDivers");
    const dives = valueFor(panel, "numberOfDives");
    const seconds = valueFor(panel, "secondsPerDive");
    const totalDives = divers * dives;
    const rawMinutes = totalDives * seconds / 60;
    const splitOn = Boolean(panel.closest(".split-event"));
    const breaks = valueFor(panel, "numberOfPanelChanges");
    const breakMin = valueFor(panel, "minutesPerPanelChange");
    const eventMinutes = splitOn ? rawMinutes / 2 + breaks * breakMin : rawMinutes;
    const durationText = panel.closest(".scheduled-event")?.querySelector(".duration-line")?.textContent?.replace(/\s+/g, " ").trim() || "";
    return { divers, dives, seconds, totalDives, rawMinutes, eventMinutes, splitOn, durationText };
  }

  function addImpact(panel) {
    let box = panel.querySelector(".event-editor-impact");
    if (!box) {
      box = document.createElement("div");
      box.className = "event-editor-impact";
      const split = panel.querySelector(".split-controls");
      if (split) split.insertAdjacentElement("beforebegin", box);
      else panel.appendChild(box);
    }
    const t = timingImpact(panel);
    box.innerHTML = `<div><strong>${t.totalDives || 0}</strong><span>Total dives</span></div><div><strong>${t.rawMinutes.toFixed(1)}</strong><span>Raw minutes</span></div><div><strong>${t.eventMinutes.toFixed(1)}</strong><span>${t.splitOn ? "Split minutes" : "Event minutes"}</span></div><div><strong>${t.seconds || 0}</strong><span>Sec / dive</span></div>${t.durationText ? `<p>${t.durationText}</p>` : ""}`;
  }

  function insights(panel) {
    const messages = [];
    const divers = valueFor(panel, "numberOfDivers");
    const dives = valueFor(panel, "numberOfDives");
    const seconds = valueFor(panel, "secondsPerDive");
    const finalSize = valueFor(panel, "finalFieldSize");
    const domestic = valueFor(panel, "domesticEligibleAdvancers");
    if (divers <= 0) messages.push("Divers is 0, so this event contributes no competitive time.");
    if (dives <= 0) messages.push("Dives is 0. Confirm the event template or unlock only for an approved override.");
    if (seconds <= 0) messages.push("Seconds per dive is 0. Timing will not calculate correctly.");
    if (finalSize > 0 && domestic > finalSize) messages.push("Domestic eligible advancers is greater than the final field size. Review eligibility fields.");
    if (panel.closest(".split-event") && valueFor(panel, "numberOfPanelChanges") <= 0) messages.push("Split is on with no panel breaks. Add breaks if panel rotation requires them.");
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
      box.innerHTML = `<strong>Editor check</strong><span>Timing and advancement fields look ready. Changes update the session timeline automatically.</span>`;
      box.classList.remove("warning");
      return;
    }
    box.classList.add("warning");
    box.innerHTML = `<strong>Review before publishing</strong>${messages.map((item) => `<span>${item}</span>`).join("")}`;
  }

  function installPanel(panel) {
    addPanelHeader(panel);
    addGroupTitles(panel);
    enhanceLabels(panel);
    addImpact(panel);
    addInsights(panel);
  }

  function install() { document.querySelectorAll(".event-detail-panel").forEach(installPanel); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
  window.setInterval(install, 500);
})();
