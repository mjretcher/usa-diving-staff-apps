(function () {
  "use strict";
  let internalAdd = false;
  function R(){ return window.ScheduleBuilderCatalogRules || {}; }
  function Rel(){ return window.ScheduleBuilderRelationships || {}; }

  function patchAdd() {
    if (!window.actions || window.actions.__catalogModulePatched || typeof window.actions.addPresetEvent !== "function") return;
    const originalAdd = window.actions.addPresetEvent;
    window.actions.addPresetEvent = function () {
      if (internalAdd) return originalAdd.call(this);
      const eventId = R().selectedEventId?.() || "";
      const round = R().selectedRound?.() || "";
      if (round === "Qualifier") return originalAdd.call(this);
      const choice = R().finalChoice?.(eventId, round) || "not-applicable";
      if (choice === "cancel") return;
      const before = Rel().readState?.();
      originalAdd.call(this);
      window.setTimeout(() => {
        if (choice === "round-only" || choice === "later") {
          const changed = Rel().removeNewAutoFinals?.(before, Rel().readState?.());
          if (changed) window.location.reload();
          return;
        }
        if (choice === "same-day-final") {
          internalAdd = true;
          try {
            window.actions.selectCatalogEvent?.(eventId);
            window.actions.selectRound?.("Final");
            originalAdd.call(this);
          } finally {
            internalAdd = false;
          }
        }
      }, 90);
    };
    window.actions.__catalogModulePatched = true;
  }

  function patchRemove() {
    if (!window.actions || window.actions.__relationshipDeletePatched || typeof window.actions.removeEvent !== "function") return;
    const originalRemove = window.actions.removeEvent;
    window.actions.removeEvent = function (eventId) {
      const rel = Rel();
      const state = rel.readState?.();
      const located = rel.byScheduleId?.(state, eventId);
      if (located?.event?.round === "Prelim") {
        const finals = rel.matchingRound?.(state, located.event, "Final") || [];
        if (finals.length) {
          const answer = window.prompt("This Prelim has a linked Final.\n\n1 = Remove Prelim only\n2 = Remove Prelim and Final\n3 = Cancel", "2");
          if (answer === null || String(answer).trim() === "3") return;
          originalRemove.call(this, eventId);
          if (String(answer).trim() === "2") finals.forEach((item) => originalRemove.call(this, item.event.scheduleEventId));
          return;
        }
      }
      originalRemove.call(this, eventId);
    };
    window.actions.__relationshipDeletePatched = true;
  }

  function parseAction(source, name) {
    const match = String(source || "").match(new RegExp(`${name}\\(['\"]([^'\"]+)['\"]\\)`));
    return match?.[1] || "";
  }

  function addSynchroPrelimButtons() {
    const selected = R().selectedEventId?.() || "";
    const usage = document.querySelector(".catalog-usage");
    if (usage && R().isSeniorSynchroEventId?.(selected) && !usage.querySelector("[data-catalog-module-round='Prelim']")) {
      const hasPrelim = [...usage.querySelectorAll(".usage-chip")].some((chip) => /(^|\b)Prelim\b/.test(chip.textContent || ""));
      if (!hasPrelim) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "usage-chip available catalog-module-chip";
        button.dataset.catalogModuleEvent = selected;
        button.dataset.catalogModuleRound = "Prelim";
        button.textContent = "Prelim: available";
        usage.insertBefore(button, usage.firstChild);
      }
    }
    document.querySelectorAll(".sb-cat-item").forEach((item) => {
      if (item.querySelector("[data-catalog-module-round='Prelim']")) return;
      const sourcePill = item.querySelector(".sb-round-pill");
      const eventId = parseAction(sourcePill?.getAttribute("onclick"), "selectCatalogEvent");
      if (!R().isSeniorSynchroEventId?.(eventId)) return;
      const holder = item.querySelector(".sb-cat-pills") || sourcePill?.parentElement;
      if (!holder) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sb-round-pill catalog-module-chip";
      button.dataset.catalogModuleEvent = eventId;
      button.dataset.catalogModuleRound = "Prelim";
      button.textContent = "Prelim";
      holder.insertBefore(button, holder.firstChild);
    });
  }

  function installClick() {
    if (window.__catalogModuleClickInstalled) return;
    window.__catalogModuleClickInstalled = true;
    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-catalog-module-event][data-catalog-module-round]");
      if (!target || !window.actions) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const eventId = target.dataset.catalogModuleEvent || "";
      const round = target.dataset.catalogModuleRound || "";
      window.actions.selectCatalogEvent?.(eventId);
      window.setTimeout(() => {
        window.actions.selectRound?.(round);
        window.setTimeout(() => window.actions.addPresetEvent?.(), 25);
      }, 25);
    }, true);
  }

  function install() {
    patchAdd();
    patchRemove();
    addSynchroPrelimButtons();
    installClick();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
  window.setInterval(install, 450);
})();
