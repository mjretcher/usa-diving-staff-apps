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

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function parseDate(value) {
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return "";
    return `${match[3]}-${String(match[1]).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`;
  }

  function addDays(isoDate, count) {
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + count);
    return date.toISOString().slice(0, 10);
  }

  function dateLabelFromIso(iso, index) {
    const date = new Date(`${iso || ""}T00:00:00`);
    const label = Number.isNaN(date.getTime())
      ? (iso || `Day ${index + 1}`)
      : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    return `Day ${index + 1} - ${label}`;
  }

  function dateLabel(day, index) {
    return dateLabelFromIso(day?.date, index);
  }

  function isSetupVisible() {
    const text = document.body?.innerText || "";
    return /meet setup|meet settings|setup|event setup/i.test(text) && /add day|open time|close time|meet type|timezone|competition day|meet day/i.test(text);
  }

  function findTarget() {
    const candidates = [".setup-panel", ".setup-card", ".meet-setup", ".config-panel", ".settings-panel", ".workspace", "#app"];
    for (const selector of candidates) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const box = node.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) return node;
    }
    return document.body;
  }

  function sortDaysByDate(store) {
    store.schedule.meet.days = [...(store.schedule.meet.days || [])].sort((a, b) => {
      const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCompare !== 0) return dateCompare;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }

  function panelDates(panel) {
    const inputs = [...panel.querySelectorAll("input[data-day-date]")];
    return inputs.map((input) => ({ id: input.getAttribute("data-day-date"), value: parseDate(input.value), input }));
  }

  function applyPanelDatesToStore(store, panel) {
    const values = new Map();
    const seen = new Set();
    for (const item of panelDates(panel)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.value)) {
        alert("Each meet day needs a valid date.");
        item.input.focus();
        return false;
      }
      if (seen.has(item.value)) {
        alert("Each meet day must use a unique date.");
        item.input.focus();
        return false;
      }
      seen.add(item.value);
      values.set(item.id, item.value);
    }
    store.schedule.meet.days.forEach((day) => {
      if (values.has(day.id)) day.date = values.get(day.id);
    });
    return true;
  }

  function cascadeFrom(panel, startIndex) {
    const rows = [...panel.querySelectorAll(".meet-day-manager-row")];
    const startInput = rows[startIndex]?.querySelector("input[data-day-date]");
    const startDate = parseDate(startInput?.value);
    if (!startDate) return;
    for (let i = startIndex; i < rows.length; i += 1) {
      const input = rows[i].querySelector("input[data-day-date]");
      if (input) input.value = addDays(startDate, i - startIndex);
    }
    refreshLabels(panel);
  }

  function refreshLabels(panel) {
    [...panel.querySelectorAll(".meet-day-manager-row")].forEach((row, index) => {
      const input = row.querySelector("input[data-day-date]");
      const label = row.querySelector("label[data-day-label]");
      if (label) label.textContent = dateLabelFromIso(parseDate(input?.value), index);
    });
  }

  function saveDates(panel) {
    const store = readStore();
    if (!store) {
      alert("No active schedule was found.");
      return;
    }
    if (!applyPanelDatesToStore(store, panel)) return;
    sortDaysByDate(store);
    writeStore(store);
    window.location.reload();
  }

  function nextDateFromPanelOrStore(store, panel) {
    const panelValues = panel ? panelDates(panel).map((item) => item.value).filter(Boolean) : [];
    const source = panelValues.length ? panelValues : (store.schedule.meet.days || []).map((day) => day.date).filter(Boolean);
    const valid = source
      .map((date) => new Date(`${date}T00:00:00`))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);
    const base = valid.length ? valid[valid.length - 1] : new Date();
    base.setDate(base.getDate() + 1);
    return base.toISOString().slice(0, 10);
  }

  function uniqueDayId(days, date) {
    const existing = new Set(days.map((day) => day.id));
    let id = `day-${date}`;
    let counter = 2;
    while (existing.has(id)) {
      id = `day-${date}-${counter}`;
      counter += 1;
    }
    return id;
  }

  function addDay(panel) {
    const store = readStore();
    if (!store) {
      alert("No active schedule was found.");
      return;
    }
    if (panel && !applyPanelDatesToStore(store, panel)) return;
    const days = store.schedule.meet.days || [];
    const date = nextDateFromPanelOrStore(store, panel);
    days.push({ id: uniqueDayId(days, date), date, openMinutes: 390, closeMinutes: 1200, locked: false });
    store.schedule.meet.days = days;
    sortDaysByDate(store);
    writeStore(store);
    window.location.reload();
  }

  function deleteDay(dayId, panel) {
    const store = readStore();
    if (!store) {
      alert("No active schedule was found.");
      return;
    }
    if (panel && !applyPanelDatesToStore(store, panel)) return;
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
    sortDaysByDate(store);
    writeStore(store);
    window.location.reload();
  }

  function dayRows(store) {
    return (store.schedule.meet.days || []).map((day, index) => `
      <div class="meet-day-manager-row" style="display:grid;grid-template-columns:minmax(120px,1fr) 150px auto;gap:8px;align-items:center;margin-top:8px;">
        <label data-day-label style="font-weight:800;color:#171F69;">${esc(dateLabel(day, index))}</label>
        <input type="date" data-day-date="${esc(day.id)}" data-day-index="${index}" value="${esc(day.date || "")}" style="width:100%;border:1px solid rgba(23,31,105,.24);border-radius:10px;padding:8px 10px;">
        <button type="button" data-delete-day="${esc(day.id)}" style="border:0;border-radius:999px;padding:8px 12px;background:#E31937;color:#fff;font-weight:800;cursor:pointer;">Delete</button>
      </div>
    `).join("");
  }

  function renderControl() {
    const store = readStore();
    if (!store || !store.schedule?.meet?.days?.length) return false;
    if (!isSetupVisible()) return false;

    let panel = document.getElementById("meetDayManagerHelper");
    const focusedInPanel = panel && panel.contains(document.activeElement);
    if (!panel) {
      const oldPanel = document.getElementById("meetDayDeleteHelper");
      if (oldPanel) oldPanel.remove();
      panel = document.createElement("div");
      panel.id = "meetDayManagerHelper";
      panel.className = "meet-day-manager-helper";
      panel.style.margin = "12px 0";
      panel.style.padding = "12px";
      panel.style.border = "1px solid rgba(23,31,105,.18)";
      panel.style.borderRadius = "14px";
      panel.style.background = "#fff";
      panel.style.boxShadow = "0 8px 22px rgba(23,31,105,.08)";
      const target = findTarget();
      target.insertBefore(panel, target.firstChild);
      panel.addEventListener("click", (event) => {
        const deleteButton = event.target.closest("button[data-delete-day]");
        if (deleteButton) return deleteDay(deleteButton.getAttribute("data-delete-day"), panel);
        if (event.target.closest("button[data-save-days]")) return saveDates(panel);
        if (event.target.closest("button[data-add-day]")) return addDay(panel);
      });
      panel.addEventListener("change", (event) => {
        const input = event.target.closest("input[data-day-date]");
        if (!input) return;
        const index = Number(input.getAttribute("data-day-index") || 0);
        cascadeFrom(panel, index);
      });
      panel.addEventListener("input", () => refreshLabels(panel));
    }

    if (focusedInPanel) return true;
    panel.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <strong style="display:block;color:#171F69;font-size:14px;">Meet competition days</strong>
          <span style="display:block;color:#5F6062;font-size:12px;margin-top:2px;">Change Day 1 and the remaining days auto-fill consecutively. Add Day uses the next calendar day after the current series. Sessions stay attached to their day when the date changes.</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" data-add-day style="border:0;border-radius:999px;padding:8px 12px;background:#009AC7;color:#fff;font-weight:800;cursor:pointer;">Add Day</button>
          <button type="button" data-save-days style="border:0;border-radius:999px;padding:8px 12px;background:#171F69;color:#fff;font-weight:800;cursor:pointer;">Save Dates</button>
        </div>
      </div>
      <div style="margin-top:8px;">${dayRows(store)}</div>
    `;
    return true;
  }

  function install() {
    renderControl();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  setInterval(install, 1000);
})();
