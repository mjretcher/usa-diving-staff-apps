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
    return ["Qualifier", "Prelim"].includes(String(event && event.round || ""));
  }

  function appKey(event, round) {
    return [event.level, event.gender, event.apparatus, event.style, round].map((part) => String(part || "").trim()).join(" | ");
  }

  function compactKey(event, round) {
    return [event.level, event.gender, event.apparatus, event.style, round].map((part) => String(part || "").trim()).join("|");
  }

  function presetKey(event) {
    return [event.level, event.gender, event.apparatus, event.style].map((part) => String(part || "").trim()).join(" | ");
  }

  function presetFromScheduledEvent(event, allowedRounds) {
    const preset = { ...event };
    ["scheduleEventId", "eventGroupId", "round", "canonicalKey", "numberOfDivers", "numberOfDives", "numberOfPanelChanges", "manualSplit", "detailsOpen", "customDurationMinutes", "durationSource"].forEach((field) => delete preset[field]);
    preset.allowedRounds = allowedRounds;
    preset.defaultDives = event.defaultNumberOfDives || event.defaultDives || event.numberOfDives || 0;
    preset.defaultSecondsPerDive = event.secondsPerDive || event.defaultSecondsPerDive || 35;
    return preset;
  }

  function hydrateProjectedEntries(schedule) {
    if (!isSchedule(schedule)) return false;
    const projected = { ...(schedule.projectedEntryDefaults || {}) };
    const legacy = { ...(schedule.entryDefaults || {}) };
    const profile = schedule.profile || (schedule.profile = {});
    const profileEvents = Array.isArray(profile.events) ? [...profile.events] : [];
    const presetIndex = new Map(profileEvents.map((event, index) => [presetKey(event), index]));
    const scheduledPresets = new Map();
    let changed = false;

    (schedule.sessions || []).forEach((session) => {
      (session.events || []).forEach((event) => {
        if (!isProjectedEntryRound(event)) return;
        const value = Number(event.numberOfDivers);
        if (!Number.isFinite(value) || value < 0) return;

        const keys = [appKey(event, event.round), compactKey(event, event.round), String(event.canonicalKey || "").trim()].filter(Boolean);
        keys.forEach((key) => {
          if (projected[key] !== value) { projected[key] = value; changed = true; }
          if (legacy[key] !== value) { legacy[key] = value; changed = true; }
        });

        const pKey = presetKey(event);
        if (!scheduledPresets.has(pKey)) scheduledPresets.set(pKey, { event, rounds: new Set() });
        scheduledPresets.get(pKey).rounds.add(event.round);
      });
    });

    scheduledPresets.forEach(({ event, rounds }, pKey) => {
      const neededRounds = [...rounds];
      if (presetIndex.has(pKey)) {
        const index = presetIndex.get(pKey);
        const existing = profileEvents[index];
        const merged = [...new Set([...(existing.allowedRounds || []), ...neededRounds])];
        if (merged.join("|") !== (existing.allowedRounds || []).join("|")) {
          profileEvents[index] = { ...existing, allowedRounds: merged };
          changed = true;
        }
      } else {
        profileEvents.push(presetFromScheduledEvent(event, neededRounds));
        presetIndex.set(pKey, profileEvents.length - 1);
        changed = true;
      }
    });

    if (changed) {
      profile.events = profileEvents;
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
      const schedule = parsed && parsed.schedule ? parsed.schedule : parsed;
      if (!isSchedule(schedule)) return value;
      hydrateProjectedEntries(schedule);
      if (parsed && parsed.schedule) parsed.schedule = schedule;
      return JSON.stringify(parsed);
    } catch (error) {
      return value;
    }
  };

  localStorage.setItem = function projectedEntriesSetItem(key, value) {
    if (key === STORAGE_KEY && value) {
      try {
        const parsed = JSON.parse(value);
        const schedule = parsed && parsed.schedule ? parsed.schedule : parsed;
        if (isSchedule(schedule)) {
          hydrateProjectedEntries(schedule);
          if (parsed && parsed.schedule) parsed.schedule = schedule;
          return ORIGINAL_SET_ITEM(key, JSON.stringify(parsed));
        }
      } catch (error) {
        // Keep original save if parsing fails.
      }
    }
    return ORIGINAL_SET_ITEM(key, value);
  };
})();