(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const BUTTON_CLASS = "session-text-edit-helper-button";

  function readStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const schedule = raw?.schedule || raw;
      return schedule?.meet && Array.isArray(schedule.sessions) ? { raw, schedule, wrapped: Boolean(raw?.schedule) } : null;
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

  function isManualBlock(session) {
    return Boolean(session?.isOpenPracticeSession || session?.autoTrainingForDayId);
  }

  function dateLabel(day) {
    const date = new Date(`${day?.date || ""}T00:00:00`);
    if (Number.isNaN(date.getTime())) return day?.date || "";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function currentVisibleDayId(schedule) {
    const pageText = document.body?.innerText || "";
    const days = schedule.meet?.days || [];
    const match = days.find((day) => pageText.includes(dateLabel(day)));
    return match?.id || null;
  }

  function sessionTitle(session) {
    return String(session.title || session.events?.[0]?.blockTitle || session.events?.[0]?.style || "Session").trim();
  }

  function sessionNote(session) {
    return String(session.events?.[0]?.notes || "").trim();
  }

  function visible(element) {
    if (!element) return false;
    const box = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
  }

  function closestCard(element) {
    let node = element;
    for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
      if (!node || !(node instanceof HTMLElement)) continue;
      const text = String(node.textContent || "");
      const hasControls = /\bMove\b/.test(text) || /Add Block After/i.test(text) || node.querySelector("button");
      const box = node.getBoundingClientRect();
      if (hasControls && box.width > 320 && box.height > 50) return node;
    }
    return element.parentElement || element;
  }

  function candidateTitleElements(title) {
    if (!title) return [];
    const selectors = [
      "h1", "h2", "h3", "h4", "strong", "b",
      ".session-title", ".sb-session-title", ".builder-session-title", ".card-title",
      ".session-header", ".sb-session-header", ".schedule-session-header"
    ].join(",");
    const exact = [];
    const fuzzy = [];
    document.querySelectorAll(selectors).forEach((element) => {
      if (!visible(element)) return;
      if (element.closest(`.${BUTTON_CLASS}`)) return;
      const text = String(element.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      if (text === title) exact.push(element);
      else if (text.startsWith(title) || text.includes(title)) fuzzy.push(element);
    });
    return [...exact, ...fuzzy];
  }

  function addButtonToCard(card, session) {
    if (!card || card.querySelector(`.${BUTTON_CLASS}[data-session-id="${CSS.escape(session.id)}"]`)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.dataset.sessionId = session.id;
    button.textContent = "Edit Text";
    button.title = "Edit this block/session title and the gray public-note text.";
    button.style.border = "0";
    button.style.borderRadius = "999px";
    button.style.padding = "7px 11px";
    button.style.background = "#171F69";
    button.style.color = "#fff";
    button.style.fontWeight = "800";
    button.style.cursor = "pointer";
    button.style.marginLeft = "8px";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      editSessionText(session.id);
    });

    const header = card.querySelector("button")?.parentElement || card.firstElementChild || card;
    header.appendChild(button);
  }

  function updateSession(session, nextTitle, nextNote) {
    const title = String(nextTitle || "").trim() || "Practice / Training";
    const note = String(nextNote ?? "").trim();
    session.title = title;
    session.notes = session.notes || "";

    if (!Array.isArray(session.events)) session.events = [];
    if (!session.events.length) return;
    const first = session.events[0];
    first.notes = note;
    if (isManualBlock(session)) {
      first.blockTitle = title;
      first.style = title;
      first.display = title;
      first.canonicalKey = `${title} | ${session.dayId || ""}`;
    }
  }

  function editSessionText(sessionId) {
    const store = readStore();
    if (!store) {
      alert("No active schedule was found.");
      return;
    }
    const session = (store.schedule.sessions || []).find((item) => item.id === sessionId);
    if (!session) return;
    const currentTitle = sessionTitle(session);
    const currentNote = sessionNote(session);
    const nextTitle = prompt("Edit the block/session title:", currentTitle);
    if (nextTitle === null) return;
    const nextNote = prompt("Edit the gray text under the title. Leave blank to remove it:", currentNote);
    if (nextNote === null) return;
    updateSession(session, nextTitle, nextNote);
    writeStore(store);
    window.location.reload();
  }

  function renderFallbackPanel(store, sessions) {
    let panel = document.getElementById("sessionTextEditFallbackPanel");
    if (!sessions.length) {
      if (panel) panel.remove();
      return;
    }
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "sessionTextEditFallbackPanel";
      panel.style.display = "flex";
      panel.style.alignItems = "center";
      panel.style.gap = "8px";
      panel.style.flexWrap = "wrap";
      panel.style.margin = "10px 0";
      panel.style.padding = "10px 12px";
      panel.style.border = "1px solid rgba(23,31,105,.18)";
      panel.style.borderRadius = "12px";
      panel.style.background = "#fff";
      panel.style.boxShadow = "0 8px 22px rgba(23,31,105,.08)";
      const target = document.querySelector(".builder-day-actions") || document.querySelector(".workspace") || document.querySelector("#app") || document.body;
      target.insertBefore(panel, target.firstChild);
      panel.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-edit-selected-session]");
        if (!button) return;
        const id = panel.querySelector("select")?.value;
        if (id) editSessionText(id);
      });
    }
    const options = sessions.map((session) => `<option value="${esc(session.id)}">${esc(sessionTitle(session))}</option>`).join("");
    panel.innerHTML = `<strong style="color:#171F69;">Edit block text</strong><select aria-label="Block text to edit">${options}</select><button type="button" data-edit-selected-session style="border:0;border-radius:999px;padding:8px 12px;background:#171F69;color:#fff;font-weight:800;cursor:pointer;">Edit</button>`;
  }

  function install() {
    const store = readStore();
    if (!store) return;
    const activeDayId = currentVisibleDayId(store.schedule);
    const sessions = (store.schedule.sessions || [])
      .filter((session) => !activeDayId || session.dayId === activeDayId)
      .sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));

    let attached = 0;
    sessions.forEach((session) => {
      const title = sessionTitle(session);
      const element = candidateTitleElements(title)[0];
      if (!element) return;
      addButtonToCard(closestCard(element), session);
      attached += 1;
    });

    renderFallbackPanel(store, sessions);
    document.body.classList.toggle("session-text-edit-helper-active", attached > 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  setInterval(install, 1200);
})();
