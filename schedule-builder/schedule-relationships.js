(function () {
  "use strict";

  const STORAGE_KEY = "usa-diving-schedule-builder-standalone-v1";

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (_error) {
      return null;
    }
  }

  function writeState(state) {
    if (!state) return;
    const now = new Date().toISOString();
    state.updatedAt = now;
    if (state.meet) state.meet.updatedAt = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function familyKey(event) {
    return [event?.id, event?.level, event?.gender, event?.apparatus, event?.style]
      .map((part) => String(part || "").trim().toLowerCase())
      .join("|");
  }

  function allEvents(state) {
    return (state?.sessions || []).flatMap((session) => (session.events || []).map((event) => ({ session, event })));
  }

  function byScheduleId(state, scheduleEventId) {
    return allEvents(state).find((item) => item.event.scheduleEventId === scheduleEventId) || null;
  }

  function matchingRound(state, sourceEvent, round) {
    const key = familyKey(sourceEvent);
    return allEvents(state).filter((item) => familyKey(item.event) === key && item.event.round === round);
  }

  function removeEventsById(state, ids) {
    const set = new Set(ids);
    let changed = false;
    state.sessions = (state.sessions || []).map((session) => {
      const events = (session.events || []).filter((event) => {
        const remove = set.has(event.scheduleEventId);
        if (remove) changed = true;
        return !remove;
      });
      return { ...session, events };
    }).filter((session) => session.events.length || session.autoTrainingForDayId || session.isOpenPracticeSession);
    if (changed) writeState(state);
    return changed;
  }

  function newLinkedEvents(beforeState, afterState, sourceRounds, targetRound) {
    const beforeIds = new Set(allEvents(beforeState || {}).map((item) => item.event.scheduleEventId));
    const sources = allEvents(afterState || {}).filter((item) => !beforeIds.has(item.event.scheduleEventId) && sourceRounds.includes(item.event.round));
    const sourceKeys = new Set(sources.map((item) => familyKey(item.event)));
    return allEvents(afterState || {}).filter((item) => !beforeIds.has(item.event.scheduleEventId) && item.event.round === targetRound && sourceKeys.has(familyKey(item.event)));
  }

  function removeNewAutoFinals(beforeState, afterState) {
    const finals = newLinkedEvents(beforeState, afterState, ["Prelim", "Semifinal"], "Final");
    if (!finals.length) return false;
    return removeEventsById(afterState, finals.map((item) => item.event.scheduleEventId));
  }

  window.ScheduleBuilderRelationships = {
    readState,
    writeState,
    familyKey,
    allEvents,
    byScheduleId,
    matchingRound,
    removeEventsById,
    removeNewAutoFinals,
  };
})();
