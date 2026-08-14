// membership-analytics/scenario-schedule-engine.js
//
// Scenario Schedule Studio — core engine (Phase 1: data model + math).
//
// Pure, DOM-free simulation engine that turns a Boundary Studio pathway
// projection (per stop, per round, per age-group/gender/discipline cell:
// projected diver count) into a draft day/session layout and an
// open-practice-time feasibility check, using the same duration math
// Schedule Builder already trusts (calcEvDur() in schedule-builder/sb-app.js),
// plus the rules Mike set for this feature:
//
//   - Split-board REVIEW flag: any event estimated over 120 minutes gets
//     flagged "review to split". This never auto-splits — a person decides,
//     same as the "Review split board / flow" notes already hand-written
//     into the real seed schedules today.
//   - One discipline (1M / 3M / Platform) per age-group+gender per day.
//   - Warm-up: Groups A/B fixed at 55 min regardless of entries. Groups C/D
//     scale with total entries in the event (thresholds below — editable).
//   - Open-practice-time check: for each day, facility window minus total
//     session time (warm-up + competition + inter-session buffer) = time
//     left for practice, reported before / between / after. A block under
//     60 minutes is real time on the clock but doesn't count as usable
//     practice time.
//
// This module deliberately does NOT know how many dives an event requires
// or what seconds-per-dive to assume for it — those are governed by
// junior-data.js, the single source of truth for 2026 qualification/dive
// rules per project-instructions.md, and must never be reimplemented here.
// Callers pass a `diveSpec(cellKey)` resolver; this engine only does the
// arithmetic and the day/session/practice-time layout on top of it.
//
// Output shape is intended to line up with schedule_builder.schedules.data
// (meet/days/sessions/events) so a generated stop schedule can eventually be
// promoted into a real Schedule Builder schedule with minimal transformation.
// Phase 1 ships the simulation math only; the UI panel and the
// simulate-schedule -> real-schedule-builder-JSON adapter are follow-on work.

(function (global) {
  'use strict';

  // ---------------------------------------------------------------------
  // Editable rules. Exposed on the export so a UI settings panel can
  // override any of these without touching the engine itself.
  // ---------------------------------------------------------------------
  var DEFAULT_RULES = {
    // Anything estimated over this many minutes gets flagged for a human
    // to decide whether to split — this NEVER auto-splits.
    splitReviewThresholdMin: 120,

    // Groups A and B: warm-up is fixed regardless of entry count.
    warmupSeniorGroupsMin: 55,

    // Groups C and D: warm-up scales with total entries in the event.
    // Evaluated in order; first matching (entries <= maxEntries) wins.
    warmupJuniorGroupsByEntries: [
      { maxEntries: 15, minutes: 35 },
      { maxEntries: 25, minutes: 45 },
      { maxEntries: Infinity, minutes: 55 }
    ],

    // When a session mixes groups (e.g. Group B + Group C events together),
    // warm-up is set once per session, not per event. 'mostSenior' means:
    // if any event in the session belongs to Group A or B, the session runs
    // the fixed 55-minute warm-up even though a Group C/D event alone might
    // only need 35/45. This is OUR inferred default (Mike didn't state it
    // explicitly) — flag if wrong.
    mixedSessionWarmupPolicy: 'mostSenior',

    // Smallest contiguous block (before/between/after sessions) that counts
    // as real, usable open-practice time. Anything shorter is real time on
    // the clock but is not reported as practice time.
    minPracticeBlockMin: 60,

    // Default facility day window. Editable per scenario/day in the UI —
    // host clubs vary.
    facilityOpenMin: 7 * 60,   // 7:00 AM
    facilityCloseMin: 20 * 60, // 8:00 PM

    // Buffer between competition sessions, matching Schedule Builder's own
    // convention (bufferMinutes: 5 on every non-practice seed session).
    interSessionBufferMin: 5,

    // Events grouped into a session before starting the next one. Simple
    // chunking, not an optimizer — a placeholder ordering for staff/the
    // chat layer to adjust, consistent with hosts having discretion over
    // actual session composition.
    eventsPerSession: 3
  };

  var SENIOR_GROUPS = { 'Group A': true, 'Group B': true };

  function isSeniorGroup(group) { return !!SENIOR_GROUPS[group]; }

  function warmupMinutesForEvent(group, totalEntries, rules) {
    if (isSeniorGroup(group)) return rules.warmupSeniorGroupsMin;
    var tiers = rules.warmupJuniorGroupsByEntries;
    for (var i = 0; i < tiers.length; i++) {
      if (totalEntries <= tiers[i].maxEntries) return tiers[i].minutes;
    }
    return tiers[tiers.length - 1].minutes;
  }

  // events: array of {group, totalEntries} contributing to one session.
  function sessionWarmup(events, rules) {
    if (rules.mixedSessionWarmupPolicy === 'mostSenior') {
      for (var i = 0; i < events.length; i++) {
        if (isSeniorGroup(events[i].group)) return rules.warmupSeniorGroupsMin;
      }
    }
    var max = 0;
    events.forEach(function (e) {
      max = Math.max(max, warmupMinutesForEvent(e.group, e.totalEntries, rules));
    });
    return max;
  }

  // ---------------------------------------------------------------------
  // Event duration — SAME formula as calcEvDur() in schedule-builder/
  // sb-app.js (divers * dives * secondsPerDive / 60). Kept in lockstep
  // deliberately: if that formula ever changes, this one must change with
  // it, or simulated and real durations will silently disagree.
  // ---------------------------------------------------------------------
  function eventDuration(divers, dives, secondsPerDive) {
    var rawMin = (Math.max(0, divers) * Math.max(0, dives) * Math.max(0, secondsPerDive)) / 60;
    return { rawMin: rawMin, evMin: rawMin }; // evMin === rawMin: this engine never auto-splits.
  }

  // spec: { cell, group, gender, discipline, round, divers, diveSpec }
  function buildEvent(spec, rules) {
    var resolved = spec.diveSpec(spec.cell) || {};
    var dives = Number(resolved.dives || 0);
    var secondsPerDive = Number(resolved.secondsPerDive || 0);
    var d = eventDuration(spec.divers, dives, secondsPerDive);
    return {
      cell: spec.cell,
      group: spec.group,
      gender: spec.gender,
      discipline: spec.discipline,
      round: spec.round,
      divers: spec.divers,
      dives: dives,
      secondsPerDive: secondsPerDive,
      estimatedMinutes: Math.ceil(d.evMin),
      reviewSplit: d.rawMin > rules.splitReviewThresholdMin
    };
  }

  // ---------------------------------------------------------------------
  // Day assignment: one discipline per age-group+gender per day.
  // Greedy bucketing — fills a day, opens the next once a group+gender
  // already has a discipline scheduled that day. This produces A workable
  // grouping, not THE optimal one; the UI (and the chat layer re-running
  // this with an override) is where a person adjusts it.
  // ---------------------------------------------------------------------
  function assignDays(events) {
    var days = []; // [{ used: {'A|Girls': true}, events: [...] }]
    events.forEach(function (ev) {
      var key = ev.group + '|' + ev.gender;
      var day = null;
      for (var i = 0; i < days.length; i++) {
        if (!days[i].used[key]) { day = days[i]; break; }
      }
      if (!day) { day = { used: {}, events: [] }; days.push(day); }
      day.used[key] = true;
      day.events.push(ev);
    });
    return days;
  }

  // ---------------------------------------------------------------------
  // Session packing within a day. Phase 1 is single-lane / worst-case
  // sequential (it does not model parallel apparatus lanes the way
  // Schedule Builder's calcSessTiming does) — the conservative choice for
  // a feasibility check. A schedule promoted into the real Schedule
  // Builder gets the full parallel-lane treatment there.
  // ---------------------------------------------------------------------
  function layoutDay(dayEvents, rules) {
    var size = rules.eventsPerSession;
    var sessions = [];
    for (var i = 0; i < dayEvents.length; i += size) {
      sessions.push(dayEvents.slice(i, i + size));
    }
    var cursor = rules.facilityOpenMin;
    return sessions.map(function (evs, idx) {
      var warmup = sessionWarmup(
        evs.map(function (e) { return { group: e.group, totalEntries: e.divers }; }),
        rules
      );
      var start = cursor;
      var warmupEnd = start + warmup;
      var compMinutes = evs.reduce(function (sum, e) { return sum + e.estimatedMinutes; }, 0);
      var end = warmupEnd + compMinutes;
      cursor = end + rules.interSessionBufferMin;
      return {
        index: idx + 1,
        events: evs,
        warmupStartMinutes: start,
        warmupMinutes: warmup,
        competitiveEnd: end,
        sessionEndMinutes: end
      };
    });
  }

  // ---------------------------------------------------------------------
  // Practice-time capacity check: before / between / after, each block
  // only counted as usable if >= minPracticeBlockMin.
  // ---------------------------------------------------------------------
  function practiceWindows(timedSessions, rules) {
    var windows = [];
    var cursor = rules.facilityOpenMin;
    timedSessions.forEach(function (s, i) {
      var gap = s.warmupStartMinutes - cursor;
      windows.push({
        position: i === 0 ? 'before' : 'between',
        minutes: gap,
        usable: gap >= rules.minPracticeBlockMin
      });
      cursor = s.sessionEndMinutes;
    });
    var tail = rules.facilityCloseMin - cursor;
    windows.push({ position: 'after', minutes: tail, usable: tail >= rules.minPracticeBlockMin });
    return windows;
  }

  function summarizeDay(dayEvents, rules) {
    var timedSessions = layoutDay(dayEvents, rules);
    var windows = practiceWindows(timedSessions, rules);
    var lastEnd = timedSessions.length
      ? timedSessions[timedSessions.length - 1].sessionEndMinutes
      : rules.facilityOpenMin;
    var overCapacity = lastEnd > rules.facilityCloseMin;
    var reviewFlags = dayEvents.filter(function (e) { return e.reviewSplit; });
    return {
      sessions: timedSessions,
      practiceWindows: windows,
      usablePracticeMinutes: windows.reduce(function (s, w) { return s + (w.usable ? w.minutes : 0); }, 0),
      overCapacity: overCapacity,
      overCapacityByMinutes: overCapacity ? lastEnd - rules.facilityCloseMin : 0,
      reviewSplitFlags: reviewFlags.map(function (e) {
        return { cell: e.cell, group: e.group, gender: e.gender, discipline: e.discipline, minutes: e.estimatedMinutes };
      })
    };
  }

  // ---------------------------------------------------------------------
  // Top-level: one stop's pathway (from Boundary Studio's projectPathway()
  // output for that stop) -> full day/session/practice-time simulation.
  //
  //   stopPathway: { stopName, rounds: [ { key, label, cells: { 'A|Girls|1M': divers, ... } } ] }
  //   diveSpec: (cellKey) => { dives, secondsPerDive } — sourced from
  //     junior-data.js by the caller. NEVER invented in this module.
  //   rulesOverride: partial DEFAULT_RULES to merge in.
  // ---------------------------------------------------------------------
  function simulateStop(stopPathway, diveSpec, rulesOverride) {
    var rules = Object.assign({}, DEFAULT_RULES, rulesOverride || {});
    var events = [];
    (stopPathway.rounds || []).forEach(function (round) {
      var cells = round.cells || {};
      Object.keys(cells).forEach(function (cellKey) {
        var divers = cells[cellKey];
        if (!divers) return;
        var parts = cellKey.split('|');
        events.push(buildEvent({
          cell: cellKey, group: parts[0], gender: parts[1], discipline: parts[2],
          round: round.key, divers: divers, diveSpec: diveSpec
        }, rules));
      });
    });
    var days = assignDays(events).map(function (d, i) {
      return Object.assign({ dayNumber: i + 1 }, summarizeDay(d.events, rules));
    });
    var warnings = [];
    days.forEach(function (d) {
      if (d.overCapacity) {
        warnings.push('Day ' + d.dayNumber + ' exceeds the facility window by ' + d.overCapacityByMinutes + ' min.');
      }
      d.reviewSplitFlags.forEach(function (f) {
        warnings.push('Day ' + d.dayNumber + ': ' + f.cell + ' (~' + f.minutes + ' min) — review for split.');
      });
    });
    return {
      stopName: stopPathway.stopName,
      rules: rules,
      totalEvents: events.length,
      totalDays: days.length,
      days: days,
      warnings: warnings
    };
  }

  var ScenarioScheduleEngine = {
    DEFAULT_RULES: DEFAULT_RULES,
    warmupMinutesForEvent: warmupMinutesForEvent,
    sessionWarmup: sessionWarmup,
    eventDuration: eventDuration,
    buildEvent: buildEvent,
    assignDays: assignDays,
    layoutDay: layoutDay,
    practiceWindows: practiceWindows,
    summarizeDay: summarizeDay,
    simulateStop: simulateStop
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ScenarioScheduleEngine;
  else global.ScenarioScheduleEngine = ScenarioScheduleEngine;

})(typeof window !== 'undefined' ? window : globalThis);
