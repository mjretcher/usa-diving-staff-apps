(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";
  const SCHEDULE_LIBRARY_KEY = "usa-diving-schedule-builder-saved-schedules-v1";
  const VERSION_ID = "junior-nationals-v3-2026";
  const VERSION_NAME = "2026 Junior Nationals - Version 3 Working Draft";

  const DAY_DATES = {
    practice: "2026-07-28",
    d1: "2026-07-29",
    d2: "2026-07-30",
    d3: "2026-07-31",
    d4: "2026-08-01",
    d5: "2026-08-02",
    d6: "2026-08-03",
    transition: "2026-08-04"
  };

  const ENTRY_COUNTS = {
    AB3: 42, BB1: 40, AGP: 42,
    AB1: 47, BG3: 40, BBP: 40,
    BG1: 42, AG3: 42, ABP: 42,
    CB1: 36, DB3: 27, DGP: 34,
    AG1: 42, BB3: 39, BGP: 40,
    DG1: 34, CB3: 36, CGP: 35,
    CG1: 36, DG3: 34, DBP: 34,
    DB1: 36, CG3: 35, CBP: 36,
    SG3: 12, SBP: 12, SB3: 12, SGP: 12
  };

  const EVENT_MAP = {
    AB3: ["Group A", "Boys", "3-Meter"],
    BB1: ["Group B", "Boys", "1-Meter"],
    AGP: ["Group A", "Girls", "Platform"],
    AB1: ["Group A", "Boys", "1-Meter"],
    BG3: ["Group B", "Girls", "3-Meter"],
    BBP: ["Group B", "Boys", "Platform"],
    BG1: ["Group B", "Girls", "1-Meter"],
    AG3: ["Group A", "Girls", "3-Meter"],
    ABP: ["Group A", "Boys", "Platform"],
    CB1: ["Group C", "Boys", "1-Meter"],
    DB3: ["Group D", "Boys", "3-Meter"],
    DGP: ["Group D", "Girls", "Platform"],
    AG1: ["Group A", "Girls", "1-Meter"],
    BB3: ["Group B", "Boys", "3-Meter"],
    BGP: ["Group B", "Girls", "Platform"],
    DG1: ["Group D", "Girls", "1-Meter"],
    CB3: ["Group C", "Boys", "3-Meter"],
    CGP: ["Group C", "Girls", "Platform"],
    CG1: ["Group C", "Girls", "1-Meter"],
    DG3: ["Group D", "Girls", "3-Meter"],
    DBP: ["Group D", "Boys", "Platform"],
    DB1: ["Group D", "Boys", "1-Meter"],
    CG3: ["Group C", "Girls", "3-Meter"],
    CBP: ["Group C", "Boys", "Platform"],
    SG3: ["14-18", "Girls", "3-Meter", "Synchro"],
    SBP: ["14-18", "Boys", "Platform", "Synchro"],
    SB3: ["14-18", "Boys", "3-Meter", "Synchro"],
    SGP: ["14-18", "Girls", "Platform", "Synchro"]
  };

  const FLOWS = [
    { date: DAY_DATES.practice, blocks: [
      { type: "block", title: "Junior Nationals official practice - full facility day", start: 390, duration: 810, notes: "Full facility Junior Nationals official practice day before Competition Day 1." }
    ] },
    { date: DAY_DATES.d1, blocks: [
      { type: "block", title: "Junior Nationals open training - first third of day", start: 390, duration: 210, notes: "Junior Nationals open training before the first competition block." },
      { type: "prelim", title: "Session V3-1 - A/B Prelims", start: 600, warmup: 55, events: ["BB1", "AB3", "AGP"] },
      { type: "final", title: "Session V3-2 - A/B Finals", start: 900, warmup: 35, events: ["BB1", "AB3", "AGP"] }
    ] },
    { date: DAY_DATES.d2, blocks: [
      { type: "prelim", title: "Session V3-3 - A/B Prelims", start: 480, warmup: 55, events: ["AB1", "BG3", "BBP"] },
      { type: "final", title: "Session V3-4 - A/B Finals", start: 780, warmup: 35, events: ["AB1", "BG3", "BBP"] }
    ] },
    { date: DAY_DATES.d3, blocks: [
      { type: "prelim", title: "Session V3-5 - A/B Prelims", start: 450, warmup: 55, events: ["BG1", "AG3", "ABP"] },
      { type: "final", title: "Session V3-6 - A/B Finals", start: 735, warmup: 35, events: ["BG1", "AG3", "ABP"] },
      { type: "prelim", title: "Session V3-7 - C/D Prelims", start: 840, warmup: 55, events: ["CB1", "DB3", "DGP"] },
      { type: "final", title: "Session V3-8 - C/D Finals", start: 1050, warmup: 35, events: ["CB1", "DB3", "DGP"] }
    ] },
    { date: DAY_DATES.d4, blocks: [
      { type: "prelim", title: "Session V3-9 - A/B Prelims", start: 450, warmup: 55, events: ["AG1", "BB3", "BGP"] },
      { type: "final", title: "Session V3-10 - A/B Finals", start: 720, warmup: 35, events: ["AG1", "BB3", "BGP"] },
      { type: "prelim", title: "Session V3-11 - C/D Prelims", start: 840, warmup: 55, events: ["DG1", "CB3", "CGP"] },
      { type: "final", title: "Session V3-12 - C/D Finals", start: 1040, warmup: 35, events: ["DG1", "CB3", "CGP"] }
    ] },
    { date: DAY_DATES.d5, blocks: [
      { type: "prelim", title: "Session V3-13 - C/D Prelims", start: 480, warmup: 55, events: ["CG1", "DG3", "DBP"] },
      { type: "final", title: "Session V3-14 - C/D Finals", start: 760, warmup: 40, events: ["CG1", "DG3", "DBP"] },
      { type: "block", title: "Restricted senior/qualifier open boards", start: 900, duration: 300, notes: "Restricted to USA Nationals / National Qualifier athletes only; junior-only athletes excluded." }
    ] },
    { date: DAY_DATES.d6, blocks: [
      { type: "prelim", title: "Session V3-15 - C/D Prelims", start: 480, warmup: 55, events: ["DB1", "CG3", "CBP"] },
      { type: "final", title: "Session V3-16 - C/D Finals", start: 760, warmup: 40, events: ["DB1", "CG3", "CBP"] },
      { type: "final", title: "Session V3-17 - 14-18 Synchro Finals", start: 930, warmup: 60, events: ["SG3", "SBP"] },
      { type: "block", title: "Restricted senior/qualifier open boards", start: 1080, duration: 120, notes: "Restricted to USA Nationals / National Qualifier athletes only after the Junior Nationals synchro finals block." }
    ] },
    { date: DAY_DATES.transition, blocks: [
      { type: "block", title: "Senior open training", start: 390, duration: 180, notes: "USA Nationals senior open training before the remaining Junior Nationals synchro finals." },
      { type: "final", title: "Session V3-18 - 14-18 Synchro Finals", start: 570, warmup: 60, events: ["SB3", "SGP"] },
      { type: "block", title: "National Qualifier open training", start: 720, duration: 480, notes: "Remainder of day restricted to USA Nationals / National Qualifier athletes." }
    ] }
  ];

  function id(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function apparatus(value) {
    const v = normalize(value).replace(/-/g, " ");
    if (/\b1\s*m\b|1 meter/.test(v)) return "1-Meter";
    if (/\b3\s*m\b|3 meter/.test(v)) return "3-Meter";
    if (/platform|10 meter|\b10\s*m\b/.test(v)) return "Platform";
    return String(value || "").trim();
  }

  function isSynchro(event) {
    return /synchro|synchronized/i.test([
      event && event.id,
      event && event.scheduleEventId,
      event && event.canonicalKey,
      event && event.style,
      event && event.display,
      event && event.title,
      event && event.name,
      event && event.sourceNote
    ].join(" "));
  }

  function eventDisplay(level, gender, app, synchro) {
    return `${level} ${gender}${synchro ? " Synchro" : ""} ${app}`;
  }

  function allEventTemplates(schedule) {
    return [
      ...((schedule.profile && schedule.profile.events) || []),
      ...(schedule.sessions || []).flatMap((session) => session.events || [])
    ];
  }

  function findTemplate(schedule, code, round) {
    const [level, gender, app, style] = EVENT_MAP[code];
    const wantSynchro = style === "Synchro";
    const templates = allEventTemplates(schedule);
    return templates.find((event) =>
      normalize(event.level) === normalize(level) &&
      normalize(event.gender) === normalize(gender) &&
      apparatus(event.apparatus) === app &&
      normalize(event.round) === normalize(round) &&
      Boolean(isSynchro(event)) === wantSynchro
    ) || templates.find((event) =>
      normalize(event.level) === normalize(level) &&
      normalize(event.gender) === normalize(gender) &&
      apparatus(event.apparatus) === app &&
      Boolean(isSynchro(event)) === wantSynchro
    );
  }

  function fallbackEvent(code, round) {
    const [level, gender, app, style] = EVENT_MAP[code];
    const synchro = style === "Synchro";
    const count = ENTRY_COUNTS[code] || (round === "Final" ? 12 : 24);
    const dives = synchro ? (app === "Platform" ? 5 : 5) : defaultDives(level, gender, app, round);
    return {
      id: `v3-${code.toLowerCase()}`,
      level,
      gender,
      apparatus: app,
      style: synchro ? "Synchronized" : "Individual",
      display: eventDisplay(level, gender, app, synchro),
      defaultDives: dives,
      allowedRounds: [round],
      sourceNote: "Generated by Junior Nationals Version 3 loader.",
      round,
      canonicalKey: `${level} | ${gender} | ${app} | ${synchro ? "Synchronized" : "Individual"} | ${round}`,
      numberOfDivers: round === "Final" ? Math.min(12, count) : count,
      defaultNumberOfDives: dives,
      numberOfDives: dives,
      numberOfDivesLocked: true,
      secondsPerDive: app === "Platform" ? (round === "Final" ? 45 : 36) : 35,
      secondsPerDiveLocked: false,
      numberOfPanelChanges: 0,
      minutesPerPanelChange: 0,
      manualSplit: false,
      detailsOpen: false,
      projectedAdvancers: round === "Final" ? 0 : 12,
      actualAdvancers: 0,
      finalFieldSize: 12,
      domesticEligibleAdvancers: 12,
      foreignAthleteAdjustment: 0,
      dualCitizenAdjustment: 0,
      notes: ""
    };
  }

  function defaultDives(level, gender, app, round) {
    if (round === "Final") return app === "Platform" ? 3 : 3;
    if (level === "Group A" && gender === "Boys") return app === "Platform" ? 9 : 10;
    if (level === "Group A") return app === "Platform" ? 8 : 9;
    if (level === "Group B") return app === "Platform" ? 8 : 8;
    if (level === "Group C") return app === "Platform" ? 7 : 7;
    return 6;
  }

  function makeEvent(schedule, code, round, sessionId) {
    const [level, gender, app, style] = EVENT_MAP[code];
    const template = clone(findTemplate(schedule, code, round) || fallbackEvent(code, round));
    const count = ENTRY_COUNTS[code] || template.numberOfDivers || 0;
    const synchro = style === "Synchro";
    template.level = level;
    template.gender = gender;
    template.apparatus = app;
    template.style = synchro ? "Synchronized" : (template.style || "Individual");
    template.display = eventDisplay(level, gender, app, synchro);
    template.round = round;
    template.scheduleEventId = id(`v3-${code.toLowerCase()}-${round.toLowerCase()}`);
    template.eventGroupId = `${sessionId}-${app.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    template.numberOfDivers = round === "Final" ? Math.min(12, Number(template.finalFieldSize || 12)) : count;
    template.projectedAdvancers = round === "Prelim" ? 12 : Number(template.projectedAdvancers || 0);
    template.finalFieldSize = Number(template.finalFieldSize || 12);
    template.domesticEligibleAdvancers = Number(template.domesticEligibleAdvancers || 12);
    template.detailsOpen = false;
    template.notes = template.notes || "";
    template.canonicalKey = `${level} | ${gender} | ${app} | ${synchro ? "Synchronized" : "Individual"} | ${round}`;
    return template;
  }

  function makeSession(schedule, dayId, block) {
    const sessionId = id("v3-session");
    const round = block.type === "final" ? "Final" : "Prelim";
    return {
      id: sessionId,
      dayId,
      title: block.title,
      warmupStartMinutes: block.start,
      warmupMinutes: block.warmup,
      transitionBufferMinutes: 5,
      roundingIncrementMinutes: 5,
      locked: false,
      collapsed: false,
      awardsEnabled: round === "Final",
      events: block.events.map((code) => makeEvent(schedule, code, round, sessionId))
    };
  }

  function makeBlock(dayId, block) {
    const sessionId = id("v3-block");
    return {
      id: sessionId,
      dayId,
      title: block.title,
      isOpenPracticeSession: true,
      warmupStartMinutes: block.start,
      warmupMinutes: 0,
      transitionBufferMinutes: 0,
      roundingIncrementMinutes: 5,
      locked: false,
      collapsed: false,
      awardsEnabled: false,
      events: [{
        id: "v3-schedule-block",
        level: "Schedule",
        gender: "Open",
        apparatus: "Pool",
        style: block.title,
        display: block.title,
        defaultDives: 0,
        allowedRounds: ["Custom Block"],
        sourceNote: "Junior Nationals Version 3 schedule block.",
        scheduleEventId: id("v3-block-event"),
        eventGroupId: id("v3-block-group"),
        round: "Custom Block",
        canonicalKey: `Schedule | Open | Pool | ${block.title} | Custom Block`,
        defaultNumberOfDives: 0,
        numberOfDives: 0,
        numberOfDivers: 0,
        secondsPerDive: 0,
        numberOfDivesLocked: false,
        secondsPerDiveLocked: false,
        numberOfPanelChanges: 0,
        minutesPerPanelChange: 0,
        customDurationMinutes: block.duration,
        manualSplit: false,
        detailsOpen: false,
        notes: block.notes || "",
        blockTitle: block.title,
        projectedAdvancers: 0,
        actualAdvancers: 0,
        finalFieldSize: 0,
        domesticEligibleAdvancers: 0,
        foreignAthleteAdjustment: 0,
        dualCitizenAdjustment: 0
      }]
    };
  }

  function ensureDays(schedule) {
    const days = schedule.meet.days || [];
    Object.values(DAY_DATES).forEach((date) => {
      if (!days.some((day) => day.date === date)) {
        days.push({ id: `v3-day-${date}`, date, openMinutes: 390, closeMinutes: 1200, locked: false });
      }
    });
    days.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    schedule.meet.days = days;
  }

  function dateForDayId(schedule, dayId) {
    return (schedule.meet.days || []).find((day) => day.id === dayId)?.date || "";
  }

  function buildVersion3(baseSchedule) {
    const draft = clone(baseSchedule);
    draft.updatedAt = new Date().toISOString();
    draft.meet.name = VERSION_NAME;
    draft.meet.meetType = draft.meet.meetType || "custom";
    ensureDays(draft);

    const replaceDates = new Set(Object.values(DAY_DATES));
    const preserved = (draft.sessions || []).filter((session) => !replaceDates.has(dateForDayId(draft, session.dayId)));
    const newSessions = [];

    FLOWS.forEach((flow) => {
      const day = draft.meet.days.find((item) => item.date === flow.date);
      if (!day) return;
      day.openMinutes = 390;
      day.closeMinutes = 1200;
      day.locked = false;
      flow.blocks.forEach((block) => {
        if (block.type === "block") newSessions.push(makeBlock(day.id, block));
        else newSessions.push(makeSession(baseSchedule, day.id, block));
      });
    });

    draft.sessions = [...preserved, ...newSessions].sort((a, b) => {
      const da = dateForDayId(draft, a.dayId);
      const db = dateForDayId(draft, b.dayId);
      if (da !== db) return da.localeCompare(db);
      return Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0);
    });
    return draft;
  }

  function readScheduleStorage() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return parsed && parsed.schedule ? { wrapper: parsed, schedule: parsed.schedule } : { wrapper: null, schedule: parsed };
    } catch (_error) {
      return { wrapper: null, schedule: null };
    }
  }

  function writeActiveSchedule(existing, schedule) {
    if (existing.wrapper) {
      existing.wrapper.schedule = schedule;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.wrapper));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
    }
  }

  function saveToLibrary(schedule) {
    let library = [];
    try {
      library = JSON.parse(localStorage.getItem(SCHEDULE_LIBRARY_KEY) || "[]");
    } catch (_error) {
      library = [];
    }
    if (!Array.isArray(library)) library = [];
    const updatedAt = new Date().toISOString();
    library = library.filter((item) => item && item.id !== VERSION_ID);
    library.unshift({ id: VERSION_ID, name: VERSION_NAME, updatedAt, builtIn: false, schedule });
    localStorage.setItem(SCHEDULE_LIBRARY_KEY, JSON.stringify(library));
  }

  function loadVersion3() {
    const existing = readScheduleStorage();
    if (!existing.schedule || !existing.schedule.meet || !Array.isArray(existing.schedule.sessions)) {
      window.alert("Open or load the current combined schedule first, then load Version 3 so the app can reuse the current entry counts and event templates.");
      return;
    }
    const ok = window.confirm("Load Junior Nationals Version 3 as the active schedule and save it to your schedule library?");
    if (!ok) return;
    const v3 = buildVersion3(existing.schedule);
    saveToLibrary(v3);
    writeActiveSchedule(existing, v3);
    window.location.reload();
  }

  function addButton() {
    if (document.getElementById("loadJuniorV3Button")) return true;
    const target = document.querySelector(".header-actions") || document.querySelector("#reportShortcutBar") || document.body;
    if (!target) return false;
    const button = document.createElement("button");
    button.id = "loadJuniorV3Button";
    button.type = "button";
    button.className = "primary-button compact-primary";
    button.textContent = "Load Junior V3";
    button.title = "Load the Junior Nationals Version 3 working draft into the active schedule.";
    button.addEventListener("click", loadVersion3);
    target.insertBefore(button, target.firstChild);
    return true;
  }

  function install() {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (addButton() || attempts >= 40) window.clearInterval(timer);
    }, 250);
    addButton();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  window.loadJuniorNationalsVersion3 = loadVersion3;
})();
