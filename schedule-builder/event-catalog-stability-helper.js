(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";

  function injectStyles() {
    if (document.getElementById("eventCatalogStabilityStyles")) return;
    const style = document.createElement("style");
    style.id = "eventCatalogStabilityStyles";
    style.textContent = `
      .catalog-event-card,
      .sb-cat-item {
        transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease;
      }
      .catalog-event-card:hover,
      .sb-cat-item:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 28px rgba(23,31,105,.12);
      }
      .catalog-event-card.selected {
        outline: 2px solid #009AC7 !important;
        outline-offset: 2px !important;
      }
      .catalog-event-status.available,
      .usage-chip.available {
        background: #e8f7fb !important;
        color: #0b5f7c !important;
        border-color: rgba(0,154,199,.22) !important;
      }
      .catalog-event-status.used,
      .usage-chip.used {
        background: #f4f5f8 !important;
        color: #5F6062 !important;
        border-color: rgba(95,96,98,.22) !important;
      }
      .usage-chip.final-needed,
      .catalog-event-status.final-needed {
        background: #fff4d8 !important;
        color: #7a4d00 !important;
        border-color: rgba(217,144,0,.32) !important;
      }
      .catalog-add-card {
        position: sticky;
        bottom: 10px;
        z-index: 6;
        backdrop-filter: blur(8px);
        box-shadow: 0 14px 36px rgba(23,31,105,.14) !important;
      }
      .catalog-add-button {
        min-height: 42px !important;
        font-size: 14px !important;
      }
      .catalog-stability-note {
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        background: #eef6fc;
        border: 1px solid rgba(0,154,199,.2);
        color: #171F69;
        font-size: 12px;
        line-height: 1.35;
      }
      .catalog-stability-note strong {
        display: block;
        margin-bottom: 2px;
      }
      .catalog-helper-chip {
        border: 1px solid rgba(0,154,199,.3) !important;
        border-radius: 999px !important;
        background: #e8f7fb !important;
        color: #0b5f7c !important;
        font-weight: 800 !important;
        cursor: pointer !important;
      }
      .catalog-add-working {
        opacity: .72;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (_error) {
      return null;
    }
  }

  function writeState(state) {
    if (!state) return;
    const now = new Date().toISOString();
    state.updatedAt = now;
    if (state.meet) state.meet.updatedAt = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function familyKey(event) {
    return [event?.id, event?.level, event?.gender, event?.apparatus, event?.style]
      .map((part) => String(part || "").trim().toLowerCase())
      .join("|");
  }

  function allEvents(state) {
    return (state?.sessions || []).flatMap((session) => (session.events || []).map((event) => ({ session, event })));
  }

  function eventByScheduleId(state, scheduleEventId) {
    return allEvents(state).find((item) => item.event.scheduleEventId === scheduleEventId) || null;
  }

  function matchingEvents(state, sourceEvent, round) {
    const key = familyKey(sourceEvent);
    return allEvents(state).filter((item) => familyKey(item.event) === key && item.event.round === round);
  }

  function captureScroll() {
    const containers = [".workspace", ".left-rail", ".builder-flow-dock", ".catalog-list", ".sb-sidebar", "#app"]
      .map((selector) => {
        const node = document.querySelector(selector);
        return node ? { selector, top: node.scrollTop, left: node.scrollLeft } : null;
      })
      .filter(Boolean);
    return { x: window.scrollX, y: window.scrollY, containers };
  }

  function restoreScroll(snapshot) {
    if (!snapshot) return;
    window.scrollTo(snapshot.x, snapshot.y);
    snapshot.containers.forEach((item) => {
      const node = document.querySelector(item.selector);
      if (!node) return;
      node.scrollTop = item.top;
      node.scrollLeft = item.left;
    });
  }

  function extractActionArg(source, actionName) {
    const text = String(source || "");
    const re = new RegExp(`${actionName}\\(['\"]([^'\"]+)['\"]\\)`);
    return text.match(re)?.[1] || "";
  }

  function selectedEventId() {
    const selected = document.querySelector(".catalog-event-card.selected");
    return extractActionArg(selected?.getAttribute("onclick"), "selectCatalogEvent");
  }

  function selectedRound() {
    const active = document.querySelector(".catalog-usage .usage-chip.active");
    const fromAction = extractActionArg(active?.getAttribute("onclick"), "selectRound");
    if (fromAction) return fromAction;
    const text = String(active?.textContent || "").trim();
    return text.includes(":") ? text.split(":")[0].trim() : text;
  }

  function findPresetName(eventId) {
    const card = [...document.querySelectorAll(".catalog-event-card, .sb-cat-item")].find((node) => (node.getAttribute("onclick") || "").includes(eventId));
    return String(card?.querySelector(".catalog-event-name, .sb-cat-name")?.textContent || card?.textContent || "this event").replace(/\s+/g, " ").trim();
  }

  function asksForFinal(round) {
    return round === "Prelim" || round === "Semifinal";
  }

  function finalChoice(eventId, round) {
    if (!asksForFinal(round)) return "not-applicable";
    const eventName = findPresetName(eventId);
    const answer = window.prompt(
      `Add ${round} for ${eventName}.\n\nDo you also want to schedule the Final?\n\n1 = Add ${round} only / this meet has no final for this event\n2 = Add ${round} and same-day Final\n3 = Add ${round} now; I will schedule Final later\n4 = Cancel`,
      "1"
    );
    if (answer === null) return "cancel";
    const clean = String(answer).trim().toLowerCase();
    if (["2", "same", "same day", "final", "yes", "y"].includes(clean)) return "same-day-final";
    if (["3", "later"].includes(clean)) return "later";
    if (["4", "cancel", "c"].includes(clean)) return "cancel";
    return "prelim-only";
  }

  function removeNewAutoFinals(beforeState, afterState) {
    if (!beforeState || !afterState) return false;
    const beforeIds = new Set(allEvents(beforeState).map((item) => item.event.scheduleEventId));
    const newPrelims = allEvents(afterState).filter((item) => !beforeIds.has(item.event.scheduleEventId) && ["Prelim", "Semifinal"].includes(item.event.round));
    if (!newPrelims.length) return false;
    const newPrelimKeys = new Set(newPrelims.map((item) => familyKey(item.event)));
    let changed = false;
    afterState.sessions = (afterState.sessions || []).map((session) => {
      const nextEvents = (session.events || []).filter((event) => {
        const isNewLinkedFinal = !beforeIds.has(event.scheduleEventId) && event.round === "Final" && newPrelimKeys.has(familyKey(event));
        if (isNewLinkedFinal) changed = true;
        return !isNewLinkedFinal;
      });
      return { ...session, events: nextEvents };
    }).filter((session) => session.events.length || session.autoTrainingForDayId || session.isOpenPracticeSession);
    if (changed) writeState(afterState);
    return changed;
  }

  function addFinalIfMissing(beforeState, eventId) {
    const current = readState();
    if (!current) return;
    const beforeIds = new Set(allEvents(beforeState || {}).map((item) => item.event.scheduleEventId));
    const newPrelim = allEvents(current).find((item) => !beforeIds.has(item.event.scheduleEventId) && ["Prelim", "Semifinal"].includes(item.event.round));
    if (!newPrelim) return;
    const finals = matchingEvents(current, newPrelim.event, "Final");
    if (finals.length) return;
    stableAdd(eventId, "Final", { skipFinalPrompt: true, forceAdd: true });
  }

  function stableAdd(eventId, round, options = {}) {
    if (!eventId || !round || !window.actions) return false;
    if (typeof window.actions.selectCatalogEvent !== "function" || typeof window.actions.selectRound !== "function" || typeof window.actions.addPresetEvent !== "function") return false;
    const choice = options.skipFinalPrompt ? "not-applicable" : finalChoice(eventId, round);
    if (choice === "cancel") return true;
    const beforeState = readState();
    const snapshot = captureScroll();
    document.body.classList.add("catalog-add-working");
    window.actions.selectCatalogEvent(eventId);
    setTimeout(() => {
      window.actions.selectRound(round);
      setTimeout(() => {
        window.actions.addPresetEvent();
        setTimeout(() => {
          if (choice === "prelim-only" || choice === "later") removeNewAutoFinals(beforeState, readState());
          if (choice === "same-day-final") addFinalIfMissing(beforeState, eventId);
          document.body.classList.remove("catalog-add-working");
          restoreScroll(snapshot);
          requestAnimationFrame(() => restoreScroll(snapshot));
          setTimeout(() => restoreScroll(snapshot), 180);
          if (choice === "prelim-only" || choice === "later") window.location.reload();
        }, 90);
      }, 35);
    }, 35);
    return true;
  }

  function interceptCatalogAdds() {
    if (window.__eventCatalogStableAddInstalled) return;
    window.__eventCatalogStableAddInstalled = true;
    document.addEventListener("click", (event) => {
      const helperChip = event.target.closest("[data-catalog-helper-event][data-catalog-helper-round]");
      if (helperChip) {
        if (stableAdd(helperChip.getAttribute("data-catalog-helper-event"), helperChip.getAttribute("data-catalog-helper-round"))) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }
      const sidebarRound = event.target.closest(".sb-round-pill");
      if (sidebarRound) {
        const source = sidebarRound.getAttribute("onclick") || "";
        const eventId = extractActionArg(source, "selectCatalogEvent");
        const round = extractActionArg(source, "selectRound") || sidebarRound.textContent.trim();
        if (eventId && round && stableAdd(eventId, round)) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }
      const addButton = event.target.closest(".catalog-add-button");
      if (!addButton) return;
      const eventId = selectedEventId();
      const round = selectedRound();
      if (eventId && round && stableAdd(eventId, round)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  function patchRemoveEvent() {
    if (!window.actions || window.actions.__catalogDeletePromptPatched || typeof window.actions.removeEvent !== "function") return;
    const original = window.actions.removeEvent;
    window.actions.removeEvent = function patchedRemoveEvent(eventId) {
      const state = readState();
      const located = eventByScheduleId(state, eventId);
      if (located?.event?.round === "Prelim") {
        const finals = matchingEvents(state, located.event, "Final");
        if (finals.length) {
          const answer = window.prompt(
            `This Prelim has a linked Final in the schedule.\n\n1 = Delete Prelim only\n2 = Delete Prelim and linked Final\n3 = Cancel`,
            "2"
          );
          if (answer === null || String(answer).trim() === "3") return;
          original.call(this, eventId);
          if (String(answer).trim() === "2") finals.forEach((item) => original.call(this, item.event.scheduleEventId));
          return;
        }
      }
      original.call(this, eventId);
    };
    window.actions.__catalogDeletePromptPatched = true;
  }

  function parseChipRound(chip) {
    const fromAction = extractActionArg(chip.getAttribute("onclick"), "selectRound");
    if (fromAction) return fromAction;
    const text = String(chip.textContent || "").trim();
    return text.includes(":") ? text.split(":")[0].trim() : text;
  }

  function chipUsed(chip) {
    return chip.disabled || chip.classList.contains("used") || /\bused\b/i.test(chip.textContent || "");
  }

  function addSeniorSynchroPrelimChip() {
    const eventId = selectedEventId();
    if (!eventId || !/^senior-synchro-|^senior-mixed-synchro-/.test(eventId)) return;
    const usage = document.querySelector(".catalog-usage");
    if (!usage || usage.querySelector("[data-catalog-helper-round='Prelim']")) return;
    const hasPrelimChip = [...usage.querySelectorAll(".usage-chip")].some((chip) => parseChipRound(chip) === "Prelim");
    if (hasPrelimChip) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "usage-chip available catalog-helper-chip";
    button.dataset.catalogHelperEvent = eventId;
    button.dataset.catalogHelperRound = "Prelim";
    button.textContent = "Prelim: available";
    usage.insertBefore(button, usage.firstChild);
  }

  function addSidebarSeniorSynchroPrelimPills() {
    document.querySelectorAll(".sb-cat-item").forEach((item) => {
      if (item.querySelector("[data-catalog-helper-round='Prelim']")) return;
      const finalPill = item.querySelector(".sb-round-pill");
      const source = finalPill?.getAttribute("onclick") || "";
      const eventId = extractActionArg(source, "selectCatalogEvent");
      if (!eventId || !/^senior-synchro-|^senior-mixed-synchro-/.test(eventId)) return;
      const holder = item.querySelector(".sb-cat-pills") || finalPill.parentElement;
      if (!holder) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sb-round-pill catalog-helper-chip";
      button.dataset.catalogHelperEvent = eventId;
      button.dataset.catalogHelperRound = "Prelim";
      button.textContent = "Prelim";
      holder.insertBefore(button, holder.firstChild);
    });
  }

  function polishCatalogStatus() {
    const chips = [...document.querySelectorAll(".catalog-usage .usage-chip")];
    if (!chips.length) return;
    const status = new Map(chips.map((chip) => [parseChipRound(chip), chipUsed(chip)]));
    const prelimUsed = Boolean(status.get("Prelim"));
    const finalAvailable = status.has("Final") && !status.get("Final");
    chips.forEach((chip) => chip.classList.remove("final-needed"));
    if (prelimUsed && finalAvailable) {
      const finalChip = chips.find((chip) => parseChipRound(chip) === "Final");
      if (finalChip) finalChip.classList.add("final-needed");
    }
    const panel = document.querySelector(".selected-event-panel")?.parentElement;
    if (!panel) return;
    let note = document.getElementById("catalogStabilityNote");
    if (!note) {
      note = document.createElement("div");
      note.id = "catalogStabilityNote";
      note.className = "catalog-stability-note";
      const usage = panel.querySelector(".catalog-usage");
      if (usage) usage.insertAdjacentElement("afterend", note);
      else panel.appendChild(note);
    }
    const usedRounds = [...status.entries()].filter(([, used]) => used).map(([round]) => round);
    if (prelimUsed && finalAvailable) {
      note.innerHTML = `<strong>Catalog status</strong>Prelim is already scheduled. Final is still available and should be added if this meet format requires prelim/final flow.`;
    } else if (usedRounds.length && usedRounds.length < status.size) {
      note.innerHTML = `<strong>Catalog status</strong>${usedRounds.join(", ")} scheduled. Remaining phases are still available.`;
    } else if (usedRounds.length === status.size) {
      note.innerHTML = `<strong>Catalog status</strong>All available phases for this event are already scheduled.`;
    } else {
      note.innerHTML = `<strong>Catalog status</strong>This event has not been scheduled yet. Qualifiers do not generate finals. Prelims and semifinals ask whether a final should be scheduled.`;
    }
  }

  function install() {
    injectStyles();
    interceptCatalogAdds();
    patchRemoveEvent();
    addSeniorSynchroPrelimChip();
    addSidebarSeniorSynchroPrelimPills();
    polishCatalogStatus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  setInterval(install, 450);
})();
