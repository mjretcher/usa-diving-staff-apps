(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function apparatusDisplay(value) {
    const raw = clean(value);
    const lower = raw.toLowerCase();
    if (/\b1\s*-?\s*m\b|1\s*meter|1-meter/.test(lower)) return "1-Meter";
    if (/\b3\s*-?\s*m\b|3\s*meter|3-meter/.test(lower)) return "3-Meter";
    if (/platform|\b10\s*-?\s*m\b|10\s*meter|10-meter/.test(lower)) return "Platform";
    return raw;
  }

  function baseEventName(event) {
    return clean(`${event && event.level ? event.level : ""} ${event && event.gender ? event.gender : ""} ${apparatusDisplay(event && event.apparatus ? event.apparatus : "")}`);
  }

  function isSynchro(event) {
    return /synchro|synchronized/i.test([
      event && event.id,
      event && event.scheduleEventId,
      event && event.canonicalKey,
      event && event.style,
      event && event.display,
      event && event.title,
      event && event.name,
      event && event.sourceNote
    ].join(" "));
  }

  function officialSynchroName(event) {
    const base = baseEventName(event);
    if (/\bSynchro\b/i.test(base)) return base;
    return base.replace(/\s+(1-Meter|3-Meter|Platform|10-Meter)$/i, " Synchro $1");
  }

  function sortedSessions(state) {
    const dayOrder = new Map((state && state.meet && state.meet.days || []).map((day, index) => [day.id, index]));
    return [...(state && state.sessions || [])].sort((a, b) => {
      const dayCompare = (dayOrder.get(a.dayId) || 0) - (dayOrder.get(b.dayId) || 0);
      if (dayCompare) return dayCompare;
      return Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
    });
  }

  function orderedCompetitionEvents(state) {
    return sortedSessions(state)
      .filter((session) => !session.isOpenPracticeSession && !session.autoTrainingForDayId)
      .flatMap((session) => session.events || [])
      .filter((event) => event && event.round !== "Custom Block");
  }

  function patchTimelineTables() {
    const state = readState();
    if (!state) return;
    const events = orderedCompetitionEvents(state);
    if (!events.length) return;
    let index = 0;
    document.querySelectorAll(".timeline-table tr").forEach((row) => {
      const kindCell = row.querySelector(".event-kind");
      if (!kindCell) return;
      const kind = clean(kindCell.textContent).toLowerCase();
      if (["intro", "awards", "training"].includes(kind) || kind.includes("practice")) return;
      const eventCell = kindCell.nextElementSibling;
      const event = events[index++];
      if (eventCell && isSynchro(event)) eventCell.textContent = officialSynchroName(event);
    });
  }

  function patchEventCardsAndLists() {
    document.querySelectorAll(".scheduled-event").forEach((card) => {
      const meta = clean(card.querySelector(".event-title-main span, .compact-event-main span")?.textContent || "");
      if (!/^Synchronized\b/i.test(meta)) return;
      const title = card.querySelector(".event-title-main strong, .compact-event-main strong");
      if (!title || /\bSynchro\b/i.test(title.textContent || "")) return;
      title.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.nodeValue = clean(node.nodeValue).replace(/\s+(1-Meter|3-Meter|Platform|10-Meter)$/i, " Synchro $1");
      });
    });
  }

  function patchReports() {
    patchEventCardsAndLists();
    patchTimelineTables();
  }

  function findClickableByText(label) {
    const wanted = clean(label).toLowerCase();
    return Array.from(document.querySelectorAll("button, a")).find((node) => clean(node.textContent).toLowerCase() === wanted);
  }

  function scrollToReports() {
    const target = document.querySelector(".preview-shell") || document.getElementById("timelinePreview") || document.querySelector(".timeline-preview");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function activateReport(label) {
    const button = findClickableByText(label);
    if (button) button.click();
    setTimeout(() => {
      patchReports();
      scrollToReports();
    }, 80);
  }

  function clickExport(label) {
    activateReport(label === "Excel" ? "Operations Timeline" : "Operations Timeline");
    setTimeout(() => {
      patchReports();
      const button = findClickableByText(label);
      if (button) button.click();
    }, 140);
  }

  function reviewWarnings() {
    const target = document.querySelector(".schedule-health-panel") || Array.from(document.querySelectorAll("section, .panel")).find((node) => /Schedule Health|warnings/i.test(node.textContent || ""));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildShortcutBar() {
    if (document.getElementById("reportShortcutBar")) return;
    const anchor = document.querySelector(".app-main") || document.getElementById("app");
    if (!anchor || !anchor.parentNode) return;

    const bar = document.createElement("section");
    bar.id = "reportShortcutBar";
    bar.className = "report-shortcut-bar";
    bar.innerHTML = '<div><strong>Reports</strong><span>Jump to outputs without scrolling</span></div>' +
      '<button type="button" data-report="Operations Timeline">Operations Timeline</button>' +
      '<button type="button" data-report="Public Schedule">Public Schedule</button>' +
      '<button type="button" data-report="Poster / Canva View">Poster / Canva</button>' +
      '<button type="button" data-export="PDF">PDF</button>' +
      '<button type="button" data-export="Excel">Excel</button>';

    bar.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.report) activateReport(button.dataset.report);
      if (button.dataset.export) clickExport(button.dataset.export);
    });

    anchor.parentNode.insertBefore(bar, anchor);
  }

  function wireWarningsButton() {
    document.querySelectorAll("button, a").forEach((node) => {
      if (!/review warnings/i.test(clean(node.textContent || ""))) return;
      if (node.dataset.warningShortcutBound) return;
      node.dataset.warningShortcutBound = "1";
      node.addEventListener("click", (event) => {
        event.preventDefault();
        reviewWarnings();
      }, true);
    });
  }

  function run() {
    buildShortcutBar();
    wireWarningsButton();
    patchReports();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();

  document.addEventListener("click", () => setTimeout(run, 60), true);
  document.addEventListener("change", () => setTimeout(run, 60), true);
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
})();
