/*
  2026 Junior Zone rule normalization
  -----------------------------------
  Runs before main.js recomputes the dashboard.

  2026 Rulebook Articles 303-305 require Zone individual events in Groups
  A, B, C, and D on 1M, 3M, and Platform to be qualifying events, subject to
  prequalified, foreign, HPS/YMCA, staff-approved dual, and not-attending logic.
*/
(function normalizeJuniorZoneRules() {
  const data = window.JUNIOR_RESULTS_DATA;
  if (!data || !Array.isArray(data.results)) return;

  const qualifyingAges = new Set(['Group A', 'Group B', 'Group C', 'Group D']);
  const qualifyingDisciplines = new Set(['1M', '3M', 'Platform']);

  function inferAgeGroup(row) {
    const text = `${row.ageGroup || ''} ${row.eventName || ''} ${row.eventKey || ''}`;
    const match = text.match(/group\s+([abcd])/i);
    return match ? `Group ${match[1].toUpperCase()}` : row.ageGroup;
  }

  function inferDiscipline(row) {
    const text = `${row.discipline || ''} ${row.eventName || ''} ${row.eventKey || ''}`;
    if (/platform/i.test(text)) return 'Platform';
    if (/\b3\s*[- ]?m\b|3\s*meter/i.test(text)) return '3M';
    if (/\b1\s*[- ]?m\b|1\s*meter/i.test(text)) return '1M';
    return row.discipline;
  }

  let normalizedRows = 0;
  data.results.forEach(row => {
    if (row.statusOnly || row.stage !== 'Zones') return;
    const ageGroup = inferAgeGroup(row);
    const discipline = inferDiscipline(row);
    const eventText = `${row.eventName || ''} ${row.eventKey || ''}`;
    const isSynchro = row.isSynchro === true || /synchro/i.test(eventText);
    const isQualifyingZoneEvent = qualifyingAges.has(ageGroup) && qualifyingDisciplines.has(discipline) && !isSynchro;
    if (!isQualifyingZoneEvent) return;

    row.ageGroup = ageGroup;
    row.discipline = discipline;
    row.qualifyingEvent = true;
    row.eventCategory = 'Qualifying Event';
    normalizedRows += 1;
  });

  data.meta = data.meta || {};
  data.meta.zoneRuleNormalization = {
    normalizedRows,
    rule: '2026 Articles 303-305: Zone individual 1M, 3M, and Platform for Groups A-D are qualifying events.'
  };
})();
