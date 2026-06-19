(function () {
  "use strict";

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
      .catalog-add-working {
        opacity: .72;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
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

  function stableAdd(eventId, round) {
    if (!eventId || !round || !window.actions) return false;
    if (typeof window.actions.selectCatalogEvent !== "function" || typeof window.actions.selectRound !== "function" || typeof window.actions.addPresetEvent !== "function") return false;
    const snapshot = captureScroll();
    document.body.classList.add("catalog-add-working");
    window.actions.selectCatalogEvent(eventId);
    setTimeout(() => {
      window.actions.selectRound(round);
      setTimeout(() => {
        window.actions.addPresetEvent();
        document.body.classList.remove("catalog-add-working");
        restoreScroll(snapshot);
        requestAnimationFrame(() => restoreScroll(snapshot));
        setTimeout(() => restoreScroll(snapshot), 180);
      }, 35);
    }, 35);
    return true;
  }

  function interceptCatalogAdds() {
    if (window.__eventCatalogStableAddInstalled) return;
    window.__eventCatalogStableAddInstalled = true;
    document.addEventListener("click", (event) => {
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

  function parseChipRound(chip) {
    const fromAction = extractActionArg(chip.getAttribute("onclick"), "selectRound");
    if (fromAction) return fromAction;
    const text = String(chip.textContent || "").trim();
    return text.includes(":") ? text.split(":")[0].trim() : text;
  }

  function chipUsed(chip) {
    return chip.disabled || chip.classList.contains("used") || /\bused\b/i.test(chip.textContent || "");
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
      note.innerHTML = `<strong>Catalog status</strong>This event has not been scheduled yet.`;
    }
  }

  function install() {
    injectStyles();
    interceptCatalogAdds();
    polishCatalogStatus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  setInterval(install, 450);
})();
