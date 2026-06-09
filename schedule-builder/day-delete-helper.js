(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";

  function readStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const schedule = raw?.schedule || raw;
      return schedule?.meet && Array.isArray(schedule.meet.days) ? { raw, schedule, wrapped: Boolean(raw?.schedule) } : null;
    } catch (_error) {
      return null;
    }
  }

  function writeStore(store) {
    store.schedule.updatedAt = new Date().toISOString();
    if (store.wrapped) {
      store.raw.schedule = store.schedule;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.raw));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.schedule));
    }
  }

  function dateLabel(day, index) {
    const date = new Date(`${day?.date || ""}T00:00:00`);
    const label = Number.isNaN(date.getTime())
      ? (day?.date || `Day ${index + 1}`)
      : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    return `Day ${index + 1} - ${label}`;
  }

  function isSetupVisible() {
    const text = document.body?.innerText || "";
    return /meet setup|meet settings|setup|event setup/i.test(text) && /add day|open time|close time|meet type|timezone/i.test(text);
  }

  function findTarget() {
    const candidates = [
      ".setup-panel",
      ".setup-card",
      ".meet-setup",
      ".config-panel",
      ".settings-panel",
      ".workspace",
      "#app"
    ];
    for (const selector of candidates) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const box = node.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) return node;
    }
    return document.body;
  }

  function deleteDay(dayId) {
    const store = readStore();
    if (!store) {
      alert("No active schedule was found.");
      return;
    }
    const days = store.schedule.meet.days || [];
    const index = days.findIndex((day) => day.id === dayId);
    if (index < 0) return;
    if (days.length <= 1) {
      alert("The schedule must keep at least one meet day.");
      return;
    }
    const day = days[index];
    const sessions = store.schedule.sessions || [];
    const sessionsOnDay = sessions.filter((session) => session.dayId === day.id).length;
    const ok = confirm(`${dateLabel(day, index)} will be deleted.\n\nThis will also remove ${sessionsOnDay} session/block${sessionsOnDay === 1 ? "" : "s"} scheduled on that day. Continue?`);
    if (!ok) return;
    store.schedule.meet.days = days.filter((item) => item.id !== day.id);
    store.schedule.sessions = sessions.filter((session) => session.dayId !== day.id);
    writeStore(store);
    window.location.reload();
  }

  function renderControl() {
    const store = readStore();
    if (!store || !store.schedule?.meet?.days?.length) return false;
    if (!isSetupVisible()) return false;

    let panel = document.getElementById("meetDayDeleteHelper");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "meetDayDeleteHelper";
      panel.className = "meet-day-delete-helper";
      panel.style.display = "flex";
      panel.style.alignItems = "center";
      panel.style.gap = "8px";
      panel.style.flexWrap = "wrap";
      panel.style.margin = "12px 0";
      panel.style.padding = "10px 12px";
      panel.style.border = "1px solid rgba(23,31,105,.18)";
      panel.style.borderRadius = "12px";
      panel.style.background = "#fff";
      panel.style.boxShadow = "0 8px 22px rgba(23,31,105,.08)";
      panel.innerHTML = `<strong style="color:#171F69;">Delete meet day</strong><select aria-label="Day to delete"></select><button type="button" style="border:0;border-radius:999px;padding:8px 12px;background:#E31937;color:#fff;font-weight:800;cursor:pointer;">Delete Day</button>`;
      const target = findTarget();
      target.insertBefore(panel, target.firstChild);
      panel.querySelector("button").addEventListener("click", () => {
        const value = panel.querySelector("select")?.value;
        if (value) deleteDay(value);
      });
    }

    const select = panel.querySelector("select");
    const currentValue = select.value;
    select.innerHTML = store.schedule.meet.days
      .map((day, index) => `<option value="${day.id}">${dateLabel(day, index)}</option>`)
      .join("");
    if ([...select.options].some((option) => option.value === currentValue)) select.value = currentValue;
    return true;
  }

  function install() {
    renderControl();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  setInterval(install, 1000);
})();
