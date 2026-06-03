(function () {
  "use strict";

  const ORIGINAL_STRINGIFY = JSON.stringify.bind(JSON);
  const AUTO_FLOW_MARK = Symbol("usaDivingAutoFlowActive");
  const SAFETY_GAP_MINUTES = 5;

  function isScheduleState(value) {
    return Boolean(
      value &&
        typeof value === "object" &&
        value.meet &&
        Array.isArray(value.meet.days) &&
        Array.isArray(value.sessions)
    );
  }

  function roundUp(minutes, increment) {
    const step = Math.max(1, Number(increment || 5));
    return Math.ceil(Number(minutes || 0) / step) * step;
  }

  function eventLaneKey(event) {
    const apparatus = String(event?.apparatus || "").toLowerCase();
    if (apparatus === "1m" || apparatus === "1-meter") return "1m";
    if (apparatus === "3m" || apparatus === "3-meter") return "3m";
    if (apparatus === "platform" || apparatus === "10m" || apparatus === "10-meter") return "platform";
    return "other";
  }

  function isPlatformEvent(event) {
    return eventLaneKey(event) === "platform";
  }

  function sessionHasFinals(session) {
    return (session.events || []).some((event) => event.round === "Final");
  }

  function sessionIsManualBlock(session) {
    return Boolean(session?.isOpenPracticeSession || session?.autoTrainingForDayId);
  }

  function sessionText(session) {
    const eventText = (session.events || [])
      .map((event) => `${event.blockTitle || ""} ${event.style || ""} ${event.round || ""} ${event.notes || ""}`)
      .join(" ");
    return `${session.title || ""} ${eventText}`.toLowerCase();
  }

  function preserveDurationWhenShifted(session) {
    const text = sessionText(session);
    return /assigned practice|group warm-up|flighted warm-up|technical meeting|lunch/.test(text);
  }

  function isHardFixedBlock(session) {
    const text = sessionText(session);
    return /full facility day|full transition day|7:00 am-12:00 pm|2:00 pm-4:00 pm|technical meeting|lunch/.test(text);
  }

  function calculateEventDuration(event) {
    if (Number(event.customDurationMinutes || 0) > 0) return Math.max(0, Number(event.customDurationMinutes || 0));
    const totalDives = Math.max(0, Number(event.numberOfDivers || 0)) * Math.max(0, Number(event.numberOfDives || 0));
    const rawEventMinutes = (totalDives * Math.max(0, Number(event.secondsPerDive || 0))) / 60;
    const splitActive = Boolean(event.manualSplit) && !isPlatformEvent(event);
    const competitiveMinutes = splitActive ? rawEventMinutes / 2 : rawEventMinutes;
    const panelCount = splitActive ? Math.max(0, Number(event.numberOfPanelChanges || 0)) : 0;
    const panelMinutes = panelCount * Math.max(0, Number(event.minutesPerPanelChange || 0));
    return competitiveMinutes + panelMinutes;
  }

  function getEventGroups(session) {
    const groups = [];
    const seen = new Map();
    (session.events || []).forEach((event) => {
      const id = event.eventGroupId || event.scheduleEventId || event.id || `group-${groups.length}`;
      if (!seen.has(id)) {
        const group = { id, events: [] };
        seen.set(id, group);
        groups.push(group);
      }
      seen.get(id).events.push(event);
    });
    return groups;
  }

  function calculateSessionTiming(schedule, session) {
    const timingDefaults = schedule.profile?.timingDefaults || {};
    const start = Number(session.warmupStartMinutes || 0);

    if (sessionIsManualBlock(session)) {
      const duration = Math.max(0, Number(session.events?.[0]?.customDurationMinutes || 0));
      return {
        start,
        eventStart: start,
        competitiveEnd: start + duration,
        end: start + duration,
      };
    }

    const warmup = Math.max(0, Number(session.warmupMinutes || 0));
    const transition = Math.max(0, Number(session.transitionBufferMinutes || 0));
    const increment = Math.max(1, Number(session.roundingIncrementMinutes || timingDefaults.roundingIncrementMinutes || 5));
    const firstEventStart = roundUp(start + warmup + transition, increment);
    const laneCursors = new Map();
    let competitiveEnd = firstEventStart;

    getEventGroups(session).forEach((group) => {
      const lane = eventLaneKey(group.events[0]);
      const groupStart = laneCursors.has(lane) ? laneCursors.get(lane) : firstEventStart;
      const groupEnd = group.events.reduce((latest, event) => Math.max(latest, groupStart + calculateEventDuration(event)), groupStart);
      competitiveEnd = Math.max(competitiveEnd, groupEnd);
      laneCursors.set(lane, roundUp(groupEnd + transition, increment));
    });

    const awardsMinutes = sessionHasFinals(session) && session.awardsEnabled !== false
      ? Math.max(0, Number(timingDefaults.awardsMinutes || 15))
      : 0;
    return {
      start,
      eventStart: firstEventStart,
      competitiveEnd,
      end: competitiveEnd + awardsMinutes,
    };
  }

  function adjustManualBlockStart(schedule, session, desiredStart) {
    const currentStart = Number(session.warmupStartMinutes || 0);
    const event = session.events?.[0];
    if (!event || currentStart === desiredStart) return;

    const currentDuration = Math.max(0, Number(event.customDurationMinutes || 0));
    const currentEnd = currentStart + currentDuration;
    session.warmupStartMinutes = desiredStart;

    if (preserveDurationWhenShifted(session)) {
      event.customDurationMinutes = currentDuration;
    } else {
      event.customDurationMinutes = Math.max(0, currentEnd - desiredStart);
    }
  }

  function autoFlowDay(schedule, dayId) {
    const sessions = schedule.sessions
      .filter((session) => session.dayId === dayId)
      .sort((a, b) => Number(a.warmupStartMinutes || 0) - Number(b.warmupStartMinutes || 0));

    let cursor = sessions[0] ? Number(sessions[0].warmupStartMinutes || 0) : 0;
    let previousWasCompetition = false;
    let manualCascadeActive = false;

    sessions.forEach((session) => {
      const increment = Math.max(1, Number(session.roundingIncrementMinutes || schedule.profile?.timingDefaults?.roundingIncrementMinutes || 5));
      const isManual = sessionIsManualBlock(session);
      const locked = Boolean(session.locked) || isHardFixedBlock(session);

      if (isManual && !locked) {
        if (previousWasCompetition || manualCascadeActive) {
          const gap = previousWasCompetition ? SAFETY_GAP_MINUTES : 0;
          const desiredStart = roundUp(cursor + gap, increment);
          adjustManualBlockStart(schedule, session, desiredStart);
          manualCascadeActive = true;
        }
      } else if (!isManual && !locked) {
        const introMinutes = sessionHasFinals(session)
          ? Math.max(0, Number(schedule.profile?.timingDefaults?.introductionsMinutes || 10))
          : 0;
        const earliestStart = roundUp(cursor + introMinutes, increment);
        if (Number(session.warmupStartMinutes || 0) < earliestStart) {
          session.warmupStartMinutes = earliestStart;
        }
        manualCascadeActive = false;
      } else if (!isManual) {
        manualCascadeActive = false;
      }

      const timing = calculateSessionTiming(schedule, session);
      cursor = Math.max(cursor, timing.end);
      previousWasCompetition = !isManual;
    });
  }

  function autoFlowSchedule(schedule) {
    if (!isScheduleState(schedule) || schedule[AUTO_FLOW_MARK]) return;
    schedule[AUTO_FLOW_MARK] = true;
    try {
      (schedule.meet.days || []).forEach((day) => autoFlowDay(schedule, day.id));
    } finally {
      delete schedule[AUTO_FLOW_MARK];
    }
  }

  JSON.stringify = function usaDivingScheduleStringify(value, replacer, space) {
    if (isScheduleState(value)) autoFlowSchedule(value);
    return ORIGINAL_STRINGIFY(value, replacer, space);
  };
})();
