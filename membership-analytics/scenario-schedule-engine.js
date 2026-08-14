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
//   - Practice time is DISTRIBUTED, not dumped at the end of the day. A
//     day's slack (facility window minus everything competition needs) is
//     spent reserving a real block before the first session and a real
//     block between each pair of sessions (up to minPracticeBlockMin each)
//     before anything is left "after." This matches how every real
//     built-in schedule in Schedule Builder is actually built: Zone
//     schedules open every competition day with a dedicated "Flighted
//     Warm-Ups" / "Open Training" block before session 1 (e.g. Zone B day
//     3 runs a 60-min Flighted Warm-Ups block, then three back-to-back
//     sessions with only the 5-min competition buffer between them —
//     the practice time is banked up front, not scattered mid-day).
//     Junior Nationals does the same at meet scale: day 2 runs a 450-min
//     "Open training — before 2 PM competition start" block, then the
//     day's sessions run back-to-back. When slack can't cover every
//     reservable gap at the floor, "before" is filled first (mirroring
//     that pattern) and whatever's left is spread across the between-gaps;
//     nothing is banked "after" in that squeezed case, since a real host
//     would rather protect the pre-competition warm-up window.
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
  // Session grouping within a day. Phase 1 is single-lane / worst-case
  // sequential (it does not model parallel apparatus lanes the way
  // Schedule Builder's calcSessTiming does) — the conservative choice for
  // a feasibility check. A schedule promoted into the real Schedule
  // Builder gets the full parallel-lane treatment there.
  // ---------------------------------------------------------------------
  function groupIntoSessions(dayEvents, rules) {
    var size = rules.eventsPerSession;
    var groups = [];
    for (var i = 0; i < dayEvents.length; i += size) {
      groups.push(dayEvents.slice(i, i + size));
    }
    return groups.map(function (evs) {
      var warmup = sessionWarmup(
        evs.map(function (e) { return { group: e.group, totalEntries: e.divers }; }),
        rules
      );
      var compMinutes = evs.reduce(function (sum, e) { return sum + e.estimatedMinutes; }, 0);
      return { events: evs, warmupMinutes: warmup, compMinutes: compMinutes, occupiedMinutes: warmup + compMinutes };
    });
  }

  // ---------------------------------------------------------------------
  // Distributed day layout: reserve real practice blocks BEFORE the first
  // session and BETWEEN each pair of sessions before anything is left
  // "after" the last one — approved 2026-08-14 in place of the pack-tight
  // version, to match how host clubs actually run these days (see the
  // header comment for the real-schedule evidence). Sessions themselves
  // still run back-to-back once started, with only interSessionBufferMin
  // between them, same as every real seed schedule.
  //
  // Reservation rule: with n sessions there are n reservable gaps (1
  // before + (n-1) between). If the day's slack covers all of them at
  // minPracticeBlockMin, each gets exactly that floor and every leftover
  // minute banks "after". If slack is tighter than that, "before" is
  // filled first (up to the floor), then whatever remains is spread
  // across the between-gaps in order; "after" gets nothing in that
  // squeezed case rather than starving the pre-competition warm-up
  // window a host actually needs.
  // ---------------------------------------------------------------------
  function layoutDay(dayEvents, rules) {
    var sessionMeta = groupIntoSessions(dayEvents, rules);
    var n = sessionMeta.length;
    var windowTotal = rules.facilityCloseMin - rules.facilityOpenMin;

    if (n === 0) {
      return {
        sessions: [],
        practiceWindows: [{ position: 'after', minutes: windowTotal, usable: windowTotal >= rules.minPracticeBlockMin }],
        usablePracticeMinutes: windowTotal >= rules.minPracticeBlockMin ? windowTotal : 0,
        overCapacity: false,
        overCapacityByMinutes: 0
      };
    }

    var occupiedTotal = sessionMeta.reduce(function (s, m) { return s + m.occupiedMinutes; }, 0)
      + (n - 1) * rules.interSessionBufferMin;
    var slack = windowTotal - occupiedTotal;
    var overCapacity = slack < 0;

    // gapMinutes[0] = before session 1; gapMinutes[1..n-1] = between sessions;
    // gapMinutes[n] = after the last session.
    var gapMinutes = new Array(n + 1).fill(0);

    if (!overCapacity) {
      var reservableGaps = n; // 1 before + (n-1) between
      var idealReserved = reservableGaps * rules.minPracticeBlockMin;
      if (slack >= idealReserved) {
        for (var g = 0; g < reservableGaps; g++) gapMinutes[g] = rules.minPracticeBlockMin;
        gapMinutes[n] = slack - idealReserved;
      } else {
        var remaining = slack;
        var beforeFill = Math.min(remaining, rules.minPracticeBlockMin);
        gapMinutes[0] = beforeFill;
        remaining -= beforeFill;
        var betweenCount = n - 1;
        if (betweenCount > 0 && remaining > 0) {
          var per = Math.floor(remaining / betweenCount);
          var extra = remaining - per * betweenCount;
          for (var b = 1; b <= betweenCount; b++) {
            gapMinutes[b] = per + (b <= extra ? 1 : 0);
          }
        }
        // gapMinutes[n] ('after') stays 0 — protect the pre-competition
        // window over a trailing block when the day is this tight.
      }
    }

    var cursor = rules.facilityOpenMin + gapMinutes[0];
    var timedSessions = sessionMeta.map(function (m, idx) {
      var warmupStart = cursor;
      var warmupEnd = warmupStart + m.warmupMinutes;
      var end = warmupEnd + m.compMinutes;
      cursor = end;
      if (idx < n - 1) cursor += rules.interSessionBufferMin + gapMinutes[idx + 1];
      return {
        index: idx + 1,
        events: m.events,
        warmupStartMinutes: warmupStart,
        warmupMinutes: m.warmupMinutes,
        competitiveEnd: end,
        sessionEndMinutes: end
      };
    });

    var lastEnd = timedSessions[timedSessions.length - 1].sessionEndMinutes;
    var afterMinutes = overCapacity ? 0 : (rules.facilityCloseMin - lastEnd);

    var windows = [{ position: 'before', minutes: gapMinutes[0], usable: gapMinutes[0] >= rules.minPracticeBlockMin }];
    for (var bi = 1; bi < n; bi++) {
      windows.push({ position: 'between', minutes: gapMinutes[bi], usable: gapMinutes[bi] >= rules.minPracticeBlockMin });
    }
    windows.push({ position: 'after', minutes: afterMinutes, usable: afterMinutes >= rules.minPracticeBlockMin });

    return {
      sessions: timedSessions,
      practiceWindows: windows,
      usablePracticeMinutes: windows.reduce(function (s, w) { return s + (w.usable ? w.minutes : 0); }, 0),
      overCapacity: overCapacity,
      overCapacityByMinutes: overCapacity ? -slack : 0
    };
  }

  function summarizeDay(dayEvents, rules) {
    var laid = layoutDay(dayEvents, rules);
    var reviewFlags = dayEvents.filter(function (e) { return e.reviewSplit; });
    return {
      sessions: laid.sessions,
      practiceWindows: laid.practiceWindows,
      usablePracticeMinutes: laid.usablePracticeMinutes,
      overCapacity: laid.overCapacity,
      overCapacityByMinutes: laid.overCapacityByMinutes,
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
    groupIntoSessions: groupIntoSessions,
    layoutDay: layoutDay,
    summarizeDay: summarizeDay,
    simulateStop: simulateStop
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ScenarioScheduleEngine;
  else global.ScenarioScheduleEngine = ScenarioScheduleEngine;

})(typeof window !== 'undefined' ? window : globalThis);
