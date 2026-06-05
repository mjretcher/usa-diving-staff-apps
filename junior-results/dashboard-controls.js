/*
  Junior dashboard controlled-edit extensions
  ------------------------------------------
  Keeps the current dashboard and rule engine intact while adding controlled
  direct edits for HPS/YMCA status and preserving imported not-attending flags.
*/
(function installJuniorDashboardControls() {
  if (typeof applyOverrides !== 'function') return;

  const originalOverrideTypeLabel = typeof overrideTypeLabel === 'function' ? overrideTypeLabel : null;

  function ensureOverrideOption(value, label) {
    const select = document.getElementById('overrideType');
    if (!select || [...select.options].some(option => option.value === value)) return;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    const notAttendingOption = [...select.options].find(opt => opt.value === 'notAttending');
    select.insertBefore(option, notAttendingOption || null);
  }

  ensureOverrideOption('hps', 'HPS athlete');
  ensureOverrideOption('ymca', 'YMCA event champion');

  overrideTypeLabel = function enhancedOverrideTypeLabel(type) {
    const labels = {
      foreign: 'Foreign athlete',
      dual: 'Dual citizen',
      dualEffect: 'Dual affects results',
      hps: 'HPS athlete',
      ymca: 'YMCA event champion',
      notAttending: 'Not attending',
    };
    return labels[type] || (originalOverrideTypeLabel ? originalOverrideTypeLabel(type) : type);
  };

  applyOverrides = function enhancedApplyOverrides(row, lookup) {
    const r = JSON.parse(JSON.stringify(row));
    const key = athleteKey(r);
    const overrides = [
      ...(lookup.byAthlete.get(key) || []),
      ...(lookup.byEventAthlete.get(`${r.eventId}|${key}`) || []),
    ];
    r.overrideNotes = overrides.map(overrideDesc);

    const get = type => {
      const match = [...overrides].reverse().find(o => o.type === type);
      return match ? Boolean(match.value) : null;
    };

    r.foreignDeclared = get('foreign') ?? Boolean(row.foreignDeclared);
    r.dualDeclared = get('dual') ?? Boolean(row.dualDeclared);
    r.dualOtherCountry = get('dualEffect') ?? Boolean(row.dualOtherCountry);
    r.hps = get('hps') ?? Boolean(row.hps);
    r.ymca = get('ymca') ?? Boolean(row.ymca);
    r.declaredNotAttending = get('notAttending') ?? Boolean(row.declaredNotAttending);

    r.webpointNonUsEffective = Boolean(r.webpointNonUs && get('foreign') !== false);
    r.foreignInternational = r.foreignDeclared || r.webpointNonUsEffective || r.dualOtherCountry;

    const ndReasons = [];
    if (r.hps) ndReasons.push('HPS Tier 3 Junior squad');
    if (r.ymca && r.stage !== 'Zones') ndReasons.push('YMCA champion');
    if (r.foreignDeclared) ndReasons.push('Foreign athlete');
    if (r.webpointNonUsEffective && !r.foreignDeclared) ndReasons.push('Webpoint non-US');
    if (r.dualOtherCountry) ndReasons.push('Dual — competed for another federation');

    r.prequalified = Boolean(r.hps || r.ymca);
    r.prequalification = [];
    if (r.hps) r.prequalification.push('Junior Nationals: Tier 3 HPS');
    if (r.ymca) r.prequalification.push('E/W/C prelims: YMCA champion');

    const isExhibition = r.exhibition === true ||
      String(r.place || '').toUpperCase() === 'EX' ||
      String(r.qualified || '').toLowerCase().includes('exhibition');
    r.exhibitionLikelyForeign = isExhibition && r.qualifyingEvent && !r.hps && !r.ymca;

    r.nonDisplacingReason = ndReasons.join(' | ');
    r.nonDisplacing = ndReasons.length > 0;
    r.countsTowardCutoff = Boolean(r.qualifyingEvent && !r.nonDisplacing && r.placeNumber != null);

    return r;
  };

  if (typeof recompute === 'function' && typeof renderAll === 'function') {
    recompute();
    renderAll();
  }
})();
