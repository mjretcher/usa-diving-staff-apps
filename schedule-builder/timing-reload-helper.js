(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const FLAG_KEY = "usa-diving-schedule-builder-timing-reload-v1";
  const ORIGINAL_SET_ITEM = localStorage.setItem.bind(localStorage);

  function isSchedulePayload(value) {
    try {
      const parsed = JSON.parse(value || "null");
      const schedule = parsed && parsed.schedule ? parsed.schedule : parsed;
      return Boolean(schedule && schedule.meet && Array.isArray(schedule.sessions));
    } catch (error) {
      return false;
    }
  }

  function markForReload() {
    sessionStorage.setItem(FLAG_KEY, "1");
    window.setTimeout(() => {
      if (sessionStorage.getItem(FLAG_KEY) !== "1") return;
      sessionStorage.removeItem(FLAG_KEY);
      window.location.reload();
    }, 350);
  }

  localStorage.setItem = function timingReloadSetItem(key, value) {
    const result = ORIGINAL_SET_ITEM(key, value);
    if (key === STORAGE_KEY && isSchedulePayload(value)) markForReload();
    return result;
  };
})();