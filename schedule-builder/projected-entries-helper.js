(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const ORIGINAL_GET_ITEM = localStorage.getItem.bind(localStorage);
  const ORIGINAL_SET_ITEM = localStorage.setItem.bind(localStorage);
  const MARK = "projectedEntriesHydratedFromSchedule";

  function isSchedule(value) {
    return Boolean(value && typeof value === "object" && value.meet && Array.isArray(value.sessions));
  }

  function isProjectedEntryRound(event) {
    return ["Qualifier", "Prelim"].includes(String(event?.round || ""));
  }

  function hydrateProjectedEntries(schedule) {
    if (!isSchedule(schedule)) return false;
    const projected = { ...(schedule.projectedEntryDefaults || {}) };
    const legacy = { ...(schedule.entryDefaults || {}) };
    let changed = false;

    (schedule.sessions || []).forEach((session) => {
      (session.events || []).forEach((event) => {
        if (!isProjectedEntryRound(event)) return;
        const key = String(event.canonicalKey || "").trim();
        const value = Number(event.numberOfDivers);
        if (!key || !Number.isFinite(value) || value < 0) return;
        if (projected[key] !== value) {
          projected[key] = value;
          changed = true;
        }
        if (legacy[key] !== value) {
          legacy[key] = value;
          changed = true;
        }
      });
    });

    if (changed) {
      schedule.projectedEntryDefaults = projected;
      schedule.entryDefaults = legacy;
      schedule.entryMode = "projected";
      schedule[MARK] = new Date().toISOString();
    }
    return changed;
  }

  localStorage.getItem = function projectedEntriesGetItem(key) {
    const value = ORIGINAL_GET_ITEM(key);
    if (key !== STORAGE_KEY || !value) return value;
    try {
      const parsed = JSON.parse(value);
      const schedule = parsed?.schedule || parsed;
      if (!isSchedule(schedule)) return value;
      hydrateProjectedEntries(schedule);
      if (parsed?.schedule) parsed.schedule = schedule;
      return JSON.stringify(parsed);
    } catch (error) {
      return value;
    }
  };

  localStorage.setItem = function projectedEntriesSetItem(key, value) {
    if (key === STORAGE_KEY && value) {
      try {
        const parsed = JSON.parse(value);
        const schedule = parsed?.schedule || parsed;
        if (isSchedule(schedule)) {
          hydrateProjectedEntries(schedule);
          if (parsed?.schedule) parsed.schedule = schedule;
          return ORIGINAL_SET_ITEM(key, JSON.stringify(parsed));
        }
      } catch (error) {
        // Keep original save if parsing fails.
      }
    }
    return ORIGINAL_SET_ITEM(key, value);
  };
})();