(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const LIBRARY_KEY = "usa-diving-schedule-builder-saved-schedules-v1";
  const RELOAD_FLAG = "usa-diving-ewc-finals-normalized-reload";

  const OPTIONAL_FINAL_DIVES = {
    "Group A": { Girls: { springboard: 4, platform: 4 }, Boys: { springboard: 5, platform: 5 } },
    "Group B": { Girls: { springboard: 4, platform: 4 }, Boys: { springboard: 4, platform: 4 } },
    "Group C": { Girls: { springboard: 3, platform: 3 }, Boys: { springboard: 3, platform: 3 } },
    "Group D": { Girls: { springboard: 3, platform: 3 }, Boys: { springboard: 3, platform: 3 } },
  };

  const nativeGetItem = Storage.prototype.getItem;
  const nativeSetItem = Storage.prototype.setItem;

  function isEwcMeet(schedule) {
    return String(schedule?.meet?.meetType || "") === "eastWestCentral";
  }

  function isJuniorNationalsMeet(schedule) {
    return String(schedule?.meet?.meetType || "") === "juniorNationals";
  }

  function isJuniorFinalsTimingMeet(schedule) {
    return isEwcMeet(schedule) || isJuniorNationalsMeet(schedule);
  }

  function normalizeApparatus(value) {
    const text = String(value || "").toLowerCase();
    if (text.includes("platform") || text === "10m" || text.includes("10-meter")) return "platform";
    return "springboard";
  }

  function optionalDiveCount(event) {
    if (String(event?.style || "") !== "Individual") return null;
    if (String(event?.round || "") !== "Final") return null;
    const level = String(event?.level || "").trim();
    const gender = String(event?.gender || "").trim();
    if (!OPTIONAL_FINAL_DIVES[level] || !OPTIONAL_FINAL_DIVES[level][gender]) return null;
    return OPTIONAL_FINAL_DIVES[level][gender][normalizeApparatus(event)] || null;
  }

  function normalizeProfile(schedule) {
    if (!schedule?.profile) return false;
    let changed = false;
    if (isEwcMeet(schedule)) {
      schedule.profile.allowedRounds = ["Prelim", "Final"];
      const relationships = Array.isArray(schedule.profile.roundRelationships) ? schedule.profile.roundRelationships : [];
      const rule = relationships.find((item) => item.from === "Prelim" && item.to === "Final");
      if (rule) {
        if (rule.relationship !== "sameDayRequired") {
          rule.relationship = "sameDayRequired";
          changed = true;
        }
        rule.configurable = true;
      } else {
        relationships.push({ from: "Prelim", to: "Final", relationship: "sameDayRequired", configurable: true });
        schedule.profile.roundRelationships = relationships;
        changed = true;
      }
      if (!String(schedule.profile.description || "").includes("same-day")) {
        schedule.profile.description = "EWC profile: prelims and finals are same-day; finals are top 12 and use Junior Nationals optional dives only.";
        changed = true;
      }
    }
    return changed;
  }

  function normalizeFinalEvent(event) {
    const optionalDives = optionalDiveCount(event);
    if (!optionalDives) return false;
    let changed = false;
    const set = (field, value) => {
      if (event[field] !== value) {
        event[field] = value;
        changed = true;
      }
    };
    set("numberOfDivers", 12);
    set("projectedAdvancers", 12);
    set("finalFieldSize", 12);
    set("domesticEligibleAdvancers", 12);
    set("defaultNumberOfDives", optionalDives);
    set("defaultDives", optionalDives);
    set("numberOfDives", optionalDives);
    set("numberOfDivesLocked", true);
    set("finalDiveMode", "optionalOnly");
    const note = "Final timing uses top 12 and optional dives only.";
    if (!String(event.notes || "").includes(note)) {
      event.notes = String(event.notes || "").trim() ? `${event.notes} ${note}` : note;
      changed = true;
    }
    return changed;
  }

  function normalizeSchedule(schedule) {
    if (!schedule || !schedule.meet || !Array.isArray(schedule.sessions)) return { schedule, changed: false };
    let changed = normalizeProfile(schedule);
    if (isJuniorFinalsTimingMeet(schedule)) {
      schedule.sessions.forEach((session) => {
        (session.events || []).forEach((event) => {
          if (normalizeFinalEvent(event)) changed = true;
        });
      });
    }
    return { schedule, changed };
  }

  function normalizeScheduleEnvelope(value) {
    const parsed = JSON.parse(value);
    if (parsed?.schedule && parsed?.packageType) {
      const result = normalizeSchedule(parsed.schedule);
      return { value: JSON.stringify(parsed), changed: result.changed };
    }
    const result = normalizeSchedule(parsed);
    return { value: JSON.stringify(result.schedule), changed: result.changed };
  }

  function normalizeLibraryEnvelope(value) {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return { value, changed: false };
    let changed = false;
    parsed.forEach((item) => {
      if (item?.schedule) {
        const result = normalizeSchedule(item.schedule);
        if (result.changed) {
          item.updatedAt = new Date().toISOString();
          changed = true;
        }
      }
    });
    return { value: JSON.stringify(parsed), changed };
  }

  function normalizeStoredValue(key, value) {
    if (typeof value !== "string" || !value) return { value, changed: false };
    try {
      if (key === STORAGE_KEY) return normalizeScheduleEnvelope(value);
      if (key === LIBRARY_KEY) return normalizeLibraryEnvelope(value);
    } catch (error) {
      return { value, changed: false };
    }
    return { value, changed: false };
  }

  function normalizeExistingStorage() {
    [STORAGE_KEY, LIBRARY_KEY].forEach((key) => {
      const current = nativeGetItem.call(localStorage, key);
      const result = normalizeStoredValue(key, current);
      if (result.changed) nativeSetItem.call(localStorage, key, result.value);
    });
  }

  Storage.prototype.getItem = function patchedGetItem(key) {
    const value = nativeGetItem.call(this, key);
    if (this !== localStorage) return value;
    const result = normalizeStoredValue(key, value);
    if (result.changed) nativeSetItem.call(this, key, result.value);
    return result.value;
  };

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    if (this !== localStorage) return nativeSetItem.call(this, key, value);
    const result = normalizeStoredValue(key, String(value));
    return nativeSetItem.call(this, key, result.value);
  };

  function readSchedule() {
    try {
      return JSON.parse(nativeGetItem.call(localStorage, STORAGE_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function scheduleReloadIfNeeded() {
    const schedule = readSchedule();
    if (!isJuniorFinalsTimingMeet(schedule)) return;
    if (sessionStorage.getItem(RELOAD_FLAG) === "pending") return;
    sessionStorage.setItem(RELOAD_FLAG, "pending");
    window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG);
      window.location.reload();
    }, 350);
  }

  function patchActions() {
    if (!window.actions || window.__ewcFinalDiveActionsPatched) return;
    window.__ewcFinalDiveActionsPatched = true;
    ["addPresetEvent", "loadSavedScheduleByIndex", "setMeetType", "applyMeetTemplate", "confirmEventPlacementModal"].forEach((name) => {
      if (typeof window.actions[name] !== "function") return;
      const original = window.actions[name].bind(window.actions);
      window.actions[name] = function patchedAction(...args) {
        const result = original(...args);
        normalizeExistingStorage();
        scheduleReloadIfNeeded();
        return result;
      };
    });
  }

  function waitForActions(attempts = 0) {
    patchActions();
    if (window.actions && window.ScheduleSync) return;
    if (attempts > 120) return;
    window.setTimeout(() => waitForActions(attempts + 1), 50);
  }

  normalizeExistingStorage();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => waitForActions());
  else waitForActions();
})();
