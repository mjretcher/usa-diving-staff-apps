(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const PANEL_ID = "juniorCircuitRulePanel";

  function readSchedule() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return parsed?.schedule || parsed;
    } catch (error) {
      return null;
    }
  }

  function isJuniorIndividual(event) {
    return /^Group\s+[A-D]\b/i.test(String(event?.level || "")) &&
      String(event?.style || "") === "Individual" &&
      ["Qualifier", "Prelim", "Semifinal", "Final"].includes(String(event?.round || ""));
  }

  function dateLabel(day) {
    const date = new Date(`${day?.date || ""}T00:00:00`);
    if (Number.isNaN(date.getTime())) return day?.date || "Unscheduled day";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  function eventFamilyKey(event) {
    return `${event.level}|${event.gender}|${event.apparatus}`;
  }

  function findJuniorCircuitConflicts(schedule) {
    if (!schedule?.meet?.days || !Array.isArray(schedule.sessions)) return [];
    const conflicts = [];

    schedule.meet.days.forEach((day) => {
      const familyMap = new Map();
      schedule.sessions
        .filter((session) => session.dayId === day.id)
        .forEach((session) => {
          (session.events || []).filter(isJuniorIndividual).forEach((event) => {
            const key = eventFamilyKey(event);
            if (!familyMap.has(key)) familyMap.set(key, { ...event, sessionId: session.id });
          });
        });

      const families = [...familyMap.values()];
      const byAgeGender = new Map();
      const byAgeApparatus = new Map();

      families.forEach((event) => {
        const ageGender = `${event.level}|${event.gender}`;
        const ageApparatus = `${event.level}|${event.apparatus}`;
        if (!byAgeGender.has(ageGender)) byAgeGender.set(ageGender, []);
        if (!byAgeApparatus.has(ageApparatus)) byAgeApparatus.set(ageApparatus, []);
        byAgeGender.get(ageGender).push(event);
        byAgeApparatus.get(ageApparatus).push(event);
      });

      byAgeGender.forEach((events) => {
        const apparatuses = [...new Set(events.map((event) => event.apparatus))];
        if (apparatuses.length > 1) {
          const sample = events[0];
          conflicts.push({
            day: dateLabel(day),
            message: `${sample.level} ${sample.gender} has multiple individual events on the same day: ${apparatuses.join(", ")}. Junior circuit rule allows same-day prelim/final only for the same event.`,
          });
        }
      });

      byAgeApparatus.forEach((events) => {
        const genders = [...new Set(events.map((event) => event.gender))];
        if (genders.length > 1) {
          const sample = events[0];
          conflicts.push({
            day: dateLabel(day),
            message: `${sample.level} ${sample.apparatus} has both boys and girls on the same day. Review HP schedule separation before release.`,
          });
        }
      });
    });

    return conflicts;
  }

  function ensureStyles() {
    if (document.getElementById("juniorCircuitRuleStyles")) return;
    const style = document.createElement("style");
    style.id = "juniorCircuitRuleStyles";
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 16px;
        bottom: 58px;
        z-index: 9998;
        width: min(360px, calc(100vw - 32px));
        padding: 12px;
        border-radius: 14px;
        background: #fff;
        border: 2px solid #E31937;
        box-shadow: 0 10px 24px rgba(23, 31, 105, 0.18);
        color: #171F69;
        font-family: inherit;
      }
      #${PANEL_ID} strong { display:block; margin-bottom:6px; font-size:0.88rem; }
      #${PANEL_ID} ul { margin:0; padding-left:18px; max-height:180px; overflow:auto; }
      #${PANEL_ID} li { margin:0 0 6px; font-size:0.78rem; line-height:1.3; }
      #${PANEL_ID} .day { font-weight:800; color:#E31937; }
    `;
    document.head.appendChild(style);
  }

  function renderPanel() {
    const conflicts = findJuniorCircuitConflicts(readSchedule());
    const existing = document.getElementById(PANEL_ID);
    if (!conflicts.length) {
      existing?.remove();
      return;
    }
    ensureStyles();
    const panel = existing || document.createElement("aside");
    panel.id = PANEL_ID;
    panel.innerHTML = `<strong>Junior circuit rule conflict</strong><ul>${conflicts.map((item) => `<li><span class="day">${item.day}:</span> ${item.message}</li>`).join("")}</ul>`;
    if (!existing) document.body.appendChild(panel);
  }

  function install() {
    renderPanel();
    window.addEventListener("storage", renderPanel);
    document.addEventListener("click", () => setTimeout(renderPanel, 250), true);
    document.addEventListener("change", () => setTimeout(renderPanel, 250), true);
    setInterval(renderPanel, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();