(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const ORIGINAL_SET_ITEM = localStorage.setItem.bind(localStorage);
  let lastSignature = "";

  function scheduleSignature(value) {
    try {
      const parsed = JSON.parse(value || "null");
      const schedule = parsed && parsed.schedule ? parsed.schedule : parsed;
      if (!schedule || !schedule.meet || !Array.isArray(schedule.sessions)) return "";
      return [
        schedule.schedulePackageId || "",
        schedule.updatedAt || "",
        schedule.meet && schedule.meet.name || "",
        schedule.sessions.length,
        (schedule.sessions || []).reduce((sum, session) => sum + (session.events || []).length, 0),
      ].join("|");
    } catch (error) {
      return "";
    }
  }

  function modalIsOpen() {
    return Boolean(document.querySelector(".entry-manager-modal, .schedule-library-modal, .schedule-block-modal, .notes-manager-modal, .release-modal, .reset-modal, .duplicate-day-modal"));
  }

  localStorage.setItem = function timingReloadSetItem(key, value) {
    const nextSignature = key === STORAGE_KEY ? scheduleSignature(value) : "";
    const previousSignature = lastSignature;
    const result = ORIGINAL_SET_ITEM(key, value);

    if (key === STORAGE_KEY && nextSignature) {
      lastSignature = nextSignature;
      const looksLikeNewImport = previousSignature && nextSignature !== previousSignature && !modalIsOpen();
      if (looksLikeNewImport) {
        window.setTimeout(() => {
          if (!modalIsOpen()) window.location.reload();
        }, 350);
      }
    }

    return result;
  };
})();