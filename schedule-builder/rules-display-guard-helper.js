(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const BLOCK_GUARD_MESSAGE = "Technical meetings and custom-named blocks are not available in the schedule builder. Use an approved block type instead.";
  const FORBIDDEN_BLOCK_TYPES = new Set([
    "custom",
    "custom block",
    "custom note",
    "technical meeting",
    "technical_meeting",
    "technical-meeting",
  ]);
  const APPROVED_BLOCK_TYPES = new Set([
    "open practice",
    "restricted training",
    "open training",
    "break",
    "awards",
  ]);

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizedKey(value) {
    return normalizeText(value).toLowerCase();
  }

  function readStoredSchedule() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return parsed && parsed.schedule ? parsed.schedule : parsed;
    } catch (error) {
      return null;
    }
  }

  function apparatusDisplay(value) {
    const raw = normalizeText(value);
    const lower = raw.toLowerCase();
    if (/\b1\s*-?\s*m\b|1\s*meter|1-meter/.test(lower)) return "1-Meter";
    if (/\b3\s*-?\s*m\b|3\s*meter|3-meter/.test(lower)) return "3-Meter";
    if (/platform|\b10\s*-?\s*m\b|10\s*meter|10-meter/.test(lower)) return "Platform";
    return raw;
  }

  function officialApparatusDisplay(value) {
    const raw = apparatusDisplay(value);
    if (raw === "1-Meter") return "1 Meter";
    if (raw === "3-Meter") return "3 Meter";
    return raw;
  }

  function appEventDisplayName(event) {
    if (!event) return "";
    return normalizeText(`${event.level || ""} ${event.gender || ""} ${apparatusDisplay(event.apparatus || "")}`);
  }

  function isSynchroEvent(event) {
    if (!event) return false;
    const haystack = [
      event.id,
      event.scheduleEventId,
      event.canonicalKey,
      event.level,
      event.gender,
      event.apparatus,
      event.style,
      event.display,
      event.title,
      event.name,
      event.sourceNote,
    ].map((value) => String(value || "")).join(" ").toLowerCase();
    return /synchro|synchronized/.test(haystack);
  }

  function officialEventName(event) {
    const base = normalizeText(`${event && event.level ? event.level : ""} ${event && event.gender ? event.gender : ""}`);
    const apparatus = officialApparatusDisplay(event && event.apparatus ? event.apparatus : "");
    return normalizeText(`${base} Synchro ${apparatus}`);
  }

  function allScheduledEvents(schedule) {
    return (schedule && schedule.sessions ? schedule.sessions : []).flatMap((session) => {
      return (session.events || []).map((event) => ({ event, session }));
    });
  }

  function scheduledEventMap(schedule) {
    const map = new Map();
    allScheduledEvents(schedule).forEach(({ event }) => {
      if (event && event.scheduleEventId) map.set(event.scheduleEventId, event);
    });
    return map;
  }

  function profileEventMap(schedule) {
    const map = new Map();
    ((schedule && schedule.profile && schedule.profile.events) || []).forEach((event) => {
      if (event && event.id) map.set(event.id, event);
    });
    return map;
  }

  function eventsInTimelineOrder(schedule) {
    const days = (schedule && schedule.meet && schedule.meet.days) || [];
    const dayOrder = new Map(days.map((day, index) => [day.id, index]));
    return [...((schedule && schedule.sessions) || [])]
      .sort((a, b) => {
        const dayDiff = (dayOrder.get(a.dayId) || 0) - (dayOrder.get(b.dayId) || 0);
        if (dayDiff) return dayDiff;
        return Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
      })
      .flatMap((session) => {
        if (session.isOpenPracticeSession || session.autoTrainingForDayId) return [];
        return (session.events || []).filter((event) => event.round !== "Custom Block");
      });
  }

  function replaceTextInElement(root, before, after) {
    if (!root || !before || !after || before === after) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (/^(script|style|textarea|input|select)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.includes(before) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      node.nodeValue = node.nodeValue.split(before).join(after);
    });
  }

  function patchScheduledEventCards(schedule, root) {
    const events = scheduledEventMap(schedule);
    root.querySelectorAll(".scheduled-event[data-event-id]").forEach((card) => {
      const event = events.get(card.dataset.eventId || "");
      if (!isSynchroEvent(event)) return;
      replaceTextInElement(card, appEventDisplayName(event), officialEventName(event));
    });
  }

  function patchCatalogEventNames(schedule, root) {
    const profileEvents = profileEventMap(schedule);
    root.querySelectorAll("[onclick*='selectCatalogEvent']").forEach((node) => {
      const click = node.getAttribute("onclick") || "";
      const match = click.match(/selectCatalogEvent\('([^']+)'\)/);
      const event = match ? profileEvents.get(match[1]) : null;
      if (!isSynchroEvent(event)) return;
      replaceTextInElement(node, appEventDisplayName(event), officialEventName(event));
    });
  }

  function patchTimelineTables(schedule, root) {
    const ordered = eventsInTimelineOrder(schedule);
    if (!ordered.length) return;
    root.querySelectorAll(".timeline-table tbody").forEach((tbody) => {
      let index = 0;
      tbody.querySelectorAll("tr").forEach((row) => {
        const kindCell = row.querySelector(".event-kind");
        if (!kindCell) return;
        const kind = normalizedKey(kindCell.textContent);
        if (["awards", "training", "open training", "open practice", "break", "restricted training"].includes(kind)) return;
        const eventCell = kindCell.nextElementSibling;
        const event = ordered[index++];
        if (eventCell && isSynchroEvent(event)) {
          eventCell.textContent = officialEventName(event);
        }
      });
    });
  }

  function patchEventLists(schedule, root) {
    const ordered = eventsInTimelineOrder(schedule);
    if (!ordered.length) return;
    const listItems = root.querySelectorAll(".poster-preview li, .public-schedule-preview li");
    let index = 0;
    listItems.forEach((item) => {
      const event = ordered[index++];
      if (!isSynchroEvent(event)) return;
      replaceTextInElement(item, appEventDisplayName(event), officialEventName(event));
    });
  }

  function patchVisibleSynchroNames(root) {
    const schedule = readStoredSchedule();
    if (!schedule) return;
    patchScheduledEventCards(schedule, root || document);
    patchCatalogEventNames(schedule, root || document);
    patchTimelineTables(schedule, root || document);
    patchEventLists(schedule, root || document);
  }

  function blockTypeForbidden(value) {
    return FORBIDDEN_BLOCK_TYPES.has(normalizedKey(value));
  }

  function isApprovedBlockType(value) {
    return APPROVED_BLOCK_TYPES.has(normalizedKey(value));
  }

  function sessionIsManualBlock(schedule, sessionId) {
    const session = ((schedule && schedule.sessions) || []).find((item) => item.id === sessionId);
    if (!session) return false;
    if (session.isOpenPracticeSession || session.autoTrainingForDayId) return true;
    const first = (session.events || [])[0] || {};
    return first.round === "Custom Block" || Boolean(first.blockTitle);
  }

  function removeForbiddenBlockControls(root) {
    const scope = root || document;
    scope.querySelectorAll("select").forEach((select) => {
      let changed = false;
      Array.from(select.options || []).forEach((option) => {
        if (blockTypeForbidden(option.value) || blockTypeForbidden(option.textContent)) {
          option.remove();
          changed = true;
        }
      });
      if (changed && blockTypeForbidden(select.value)) {
        select.value = "Open Practice";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    scope.querySelectorAll("button, a").forEach((node) => {
      const click = node.getAttribute("onclick") || "";
      const label = normalizedKey(node.textContent);
      if (/addCustomBlock|Custom Block|Technical Meeting/i.test(click) || label === "custom block" || label === "technical meeting") {
        node.setAttribute("hidden", "hidden");
        node.setAttribute("aria-hidden", "true");
      }
    });
  }

  function selectedPlannerTypeIsForbidden() {
    return Array.from(document.querySelectorAll("select")).some((select) => {
      const selectedText = select.selectedOptions && select.selectedOptions[0] ? select.selectedOptions[0].textContent : "";
      return blockTypeForbidden(select.value) || blockTypeForbidden(selectedText);
    });
  }

  function patchActions() {
    if (!window.actions || window.actions.__rulesDisplayGuardPatched) return false;
    const actions = window.actions;

    if (typeof actions.addCustomBlock === "function") {
      actions.addCustomBlock = function () {
        window.alert(BLOCK_GUARD_MESSAGE);
      };
    }

    if (typeof actions.addScheduleBlock === "function") {
      const openPlanner = actions.openScheduleBlockPlanner;
      actions.addScheduleBlock = function (dayId, afterSessionId, position) {
        if (typeof openPlanner === "function") return openPlanner.call(actions, dayId, afterSessionId || "", position || "end");
        window.alert(BLOCK_GUARD_MESSAGE);
      };
    }

    if (typeof actions.updateSession === "function") {
      const originalUpdateSession = actions.updateSession;
      actions.updateSession = function (sessionId, field, value) {
        if (field === "title" && sessionIsManualBlock(readStoredSchedule(), sessionId)) {
          window.alert("Schedule block names are standardized. Use the approved block type and the daily flow note field for restrictions/details.");
          return;
        }
        return originalUpdateSession.apply(this, arguments);
      };
    }

    if (typeof actions.updateScheduleBlockPlanner === "function") {
      const originalUpdatePlanner = actions.updateScheduleBlockPlanner;
      actions.updateScheduleBlockPlanner = function (field, value) {
        if (field === "type" && (blockTypeForbidden(value) || !isApprovedBlockType(value))) {
          window.alert(BLOCK_GUARD_MESSAGE);
          return originalUpdatePlanner.call(this, "type", "Open Practice");
        }
        return originalUpdatePlanner.apply(this, arguments);
      };
    }

    if (typeof actions.createScheduleBlockFromPlanner === "function") {
      const originalCreate = actions.createScheduleBlockFromPlanner;
      actions.createScheduleBlockFromPlanner = function () {
        if (selectedPlannerTypeIsForbidden()) {
          window.alert(BLOCK_GUARD_MESSAGE);
          return;
        }
        return originalCreate.apply(this, arguments);
      };
    }

    actions.__rulesDisplayGuardPatched = true;
    return true;
  }

  function runGuards() {
    patchActions();
    removeForbiddenBlockControls(document);
    patchVisibleSynchroNames(document);
  }

  function install() {
    runGuards();
    document.addEventListener("click", () => window.setTimeout(runGuards, 50), true);
    document.addEventListener("change", () => window.setTimeout(runGuards, 50), true);
    window.addEventListener("storage", runGuards);
    const observer = new MutationObserver(() => runGuards());
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(runGuards, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
