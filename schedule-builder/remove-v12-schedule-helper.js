(function () {
  "use strict";

  const LIBRARY_KEY = "usa-diving-schedule-builder-saved-schedules-v1";
  const BLOCKED_TEXT = "2026 Junior Nationals + National Qualifier + USA Nationals - Working Draft v12 Junior Equipment Remap";
  const BLOCKED_NEEDLES = [
    "Working Draft v12 Junior Equipment Remap",
    "Junior Equipment Remap",
    "working-draft-v12-junior-equipment-remap",
    "junior-equipment-remap"
  ];

  const nativeGetItem = Storage.prototype.getItem;
  const nativeSetItem = Storage.prototype.setItem;

  function isBlockedItem(item) {
    const fields = [
      item && item.id,
      item && item.name,
      item && item.schedule && item.schedule.meet && item.schedule.meet.name,
      item && item.schedule && item.schedule.scheduleName,
      item && item.schedule && item.schedule.schedulePackageId
    ].map((value) => String(value || "").toLowerCase());
    return fields.some((field) => BLOCKED_NEEDLES.some((needle) => field.includes(needle.toLowerCase()))) ||
      fields.some((field) => field.includes(BLOCKED_TEXT.toLowerCase()));
  }

  function pruneLibraryJson(value) {
    if (typeof value !== "string" || !value.trim()) return { value, changed: false };
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return { value, changed: false };
      const filtered = parsed.filter((item) => !isBlockedItem(item));
      return { value: JSON.stringify(filtered), changed: filtered.length !== parsed.length };
    } catch (_) {
      return { value, changed: false };
    }
  }

  function pruneLocalLibrary() {
    const current = nativeGetItem.call(localStorage, LIBRARY_KEY);
    const result = pruneLibraryJson(current);
    if (result.changed) nativeSetItem.call(localStorage, LIBRARY_KEY, result.value);
  }

  Storage.prototype.getItem = function patchedGetItem(key) {
    const value = nativeGetItem.call(this, key);
    if (this === localStorage && key === LIBRARY_KEY) {
      const result = pruneLibraryJson(value);
      if (result.changed) nativeSetItem.call(this, key, result.value);
      return result.value;
    }
    return value;
  };

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    if (this === localStorage && key === LIBRARY_KEY) {
      const result = pruneLibraryJson(String(value));
      return nativeSetItem.call(this, key, result.value);
    }
    return nativeSetItem.call(this, key, value);
  };

  function removeBlockedCards() {
    const allNodes = Array.from(document.querySelectorAll(".sb-lib-item,.library-row,article,div,section"));
    allNodes.forEach((node) => {
      const text = String(node.textContent || "");
      if (BLOCKED_NEEDLES.some((needle) => text.includes(needle)) || text.includes(BLOCKED_TEXT)) {
        const card = node.closest(".sb-lib-item,.library-row,article") || node;
        if (card && card.parentElement) card.remove();
      }
    });
  }

  function patchScheduleSync() {
    if (!window.ScheduleSync || window.__removedV12ScheduleSyncPatched) return;
    window.__removedV12ScheduleSyncPatched = true;
    const originalLoad = window.ScheduleSync.loadSchedules && window.ScheduleSync.loadSchedules.bind(window.ScheduleSync);
    const originalSave = window.ScheduleSync.saveSchedule && window.ScheduleSync.saveSchedule.bind(window.ScheduleSync);
    const originalDelete = window.ScheduleSync.deleteSchedule && window.ScheduleSync.deleteSchedule.bind(window.ScheduleSync);

    if (originalLoad) {
      window.ScheduleSync.loadSchedules = async function patchedLoadSchedules() {
        const schedules = await originalLoad();
        const list = Array.isArray(schedules) ? schedules : [];
        const blocked = list.filter(isBlockedItem);
        if (blocked.length && originalDelete) {
          blocked.forEach((item) => {
            if (item && item.id) originalDelete(item.id).catch(() => {});
          });
        }
        return list.filter((item) => !isBlockedItem(item));
      };
    }

    if (originalSave) {
      window.ScheduleSync.saveSchedule = async function patchedSaveSchedule(schedule) {
        if (isBlockedItem(schedule)) return true;
        return originalSave(schedule);
      };
    }
  }

  function install() {
    pruneLocalLibrary();
    patchScheduleSync();
    removeBlockedCards();
    const observer = new MutationObserver(() => removeBlockedCards());
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(() => {
      pruneLocalLibrary();
      patchScheduleSync();
      removeBlockedCards();
    }, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
