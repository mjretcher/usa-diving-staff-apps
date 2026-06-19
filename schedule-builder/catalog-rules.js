(function () {
  "use strict";

  function shouldAskForFinal(round) {
    return round === "Prelim" || round === "Semifinal";
  }

  function qualifierCreatesFinal(round) {
    return round === "Qualifier" ? false : null;
  }

  function isSeniorSynchroEventId(eventId) {
    return /^senior-synchro-|^senior-mixed-synchro-/.test(String(eventId || ""));
  }

  function eventLabelFromDom(eventId) {
    const card = [...document.querySelectorAll(".catalog-event-card, .sb-cat-item")]
      .find((node) => String(node.getAttribute("onclick") || "").includes(eventId));
    return String(card?.querySelector(".catalog-event-name, .sb-cat-name")?.textContent || card?.textContent || "this event")
      .replace(/\s+/g, " ")
      .trim();
  }

  function finalChoice(eventId, round) {
    if (!shouldAskForFinal(round)) return "not-applicable";
    const eventName = eventLabelFromDom(eventId);
    const answer = window.prompt(
      `Add ${round} for ${eventName}.\n\nDo you also want to schedule the Final?\n\n1 = Add ${round} only / this meet has no final for this event\n2 = Add ${round} and same-day Final\n3 = Add ${round} now; I will schedule Final later\n4 = Cancel`,
      "1"
    );
    if (answer === null) return "cancel";
    const clean = String(answer).trim().toLowerCase();
    if (["2", "same", "same day", "final", "yes", "y"].includes(clean)) return "same-day-final";
    if (["3", "later"].includes(clean)) return "later";
    if (["4", "cancel", "c"].includes(clean)) return "cancel";
    return "round-only";
  }

  function selectedEventId() {
    const selected = document.querySelector(".catalog-event-card.selected");
    const text = String(selected?.getAttribute("onclick") || "");
    return text.match(/selectCatalogEvent\(['\"]([^'\"]+)['\"]\)/)?.[1] || "";
  }

  function selectedRound() {
    const active = document.querySelector(".catalog-usage .usage-chip.active");
    const text = String(active?.getAttribute("onclick") || "");
    const match = text.match(/selectRound\(['\"]([^'\"]+)['\"]\)/);
    if (match) return match[1];
    const label = String(active?.textContent || "").trim();
    return label.includes(":") ? label.split(":")[0].trim() : label;
  }

  window.ScheduleBuilderCatalogRules = {
    shouldAskForFinal,
    qualifierCreatesFinal,
    isSeniorSynchroEventId,
    finalChoice,
    selectedEventId,
    selectedRound,
  };
})();
