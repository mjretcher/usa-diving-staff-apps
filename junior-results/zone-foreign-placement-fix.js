/*
  Zone foreign / exhibition placement integrity fix
  -------------------------------------------------
  DiveMeets can mark non-US citizen athletes as exhibition / place 127. That
  pushes them out of normal place order even when their score won the event.

  USA Diving needs two truths at the same time:
  - The athlete is foreign/non-displacing and does not consume a spot.
  - Their score-order performance still determines who moved up and why.
*/
(function installZoneForeignPlacementFix(){
  if (typeof state === 'undefined' || typeof effectiveResults === 'undefined') return;

  function norm(v){ return String(v == null ? '' : v).trim(); }
  function upper(v){ return norm(v).toUpperCase(); }
  function athleteOverrideKey(v){ return typeof athleteKey === 'function' ? athleteKey(v) : ''; }
  function isDiveMeetsForeignCode(row){
    const place = upper(row.place);
    const rawPlace = upper(row.rawPlace || row.diveMeetsPlace || row.officialPlace);
    const placeNumber = Number(row.placeNumber);
    const rawPlaceNumber = Number(row.rawPlaceNumber || row.diveMeetsPlaceNumber || row.officialPlaceNumber);
    return place === '127' || rawPlace === '127' || place === 'EX' || place === 'EXH' ||
      rawPlace === 'EX' || rawPlace === 'EXH' || placeNumber === 127 || rawPlaceNumber === 127 ||
      row.exhibition === true || String(row.qualified || '').toLowerCase().includes('exhibition') ||
      String(row.status || '').toLowerCase().includes('exhibition');
  }
  function hasForeignOffOverride(row){
    const key = athleteOverrideKey(row);
    if (!key || !state || !Array.isArray(state.overrides)) return false;
    return state.overrides.some(o => o && o.active && o.type === 'foreign' && o.value === false &&
      (athleteOverrideKey(o) === key || (o.eventId && o.eventId === row.eventId && athleteOverrideKey(o) === key))
    );
  }
  function appendUnique(list, value){
    if (!Array.isArray(list)) list = [];
    const text = norm(value);
    if (text && !list.includes(text)) list.push(text);
    return list;
  }
  function appendReason(current, reason){
    const parts = String(current || '').split('|').map(s => s.trim()).filter(Boolean);
    if (!parts.includes(reason)) parts.push(reason);
    return parts.join(' | ');
  }
  function performanceSort(a,b){
    const as = Number(a.score), bs = Number(b.score);
    if (Number.isFinite(as) || Number.isFinite(bs)) {
      if (!Number.isFinite(as)) return 1;
      if (!Number.isFinite(bs)) return -1;
      if (bs !== as) return bs - as;
    }
    const ap = Number(a.placeNumber), bp = Number(b.placeNumber);
    return (Number.isFinite(ap) ? ap : 9999) - (Number.isFinite(bp) ? bp : 9999);
  }
  function isForeign(row){
    return Boolean(row.foreignDeclared || row.webpointNonUsEffective || row.diveMeetsForeignCode || isDiveMeetsForeignCode(row));
  }
  function isGhost(row){
    return Boolean(row.ghostAdvances || row.hps || row.dualOtherCountry || isForeign(row));
  }
  function sourceLabel(row){
    if (row.hps) return 'HPS athlete';
    if (row.dualOtherCountry) return 'Dual - competed for another federation';
    if (isForeign(row)) return 'Foreign athlete';
    return 'Non-displacing athlete';
  }
  function markDiveMeetsForeign(row){
    if (!isDiveMeetsForeignCode(row) || hasForeignOffOverride(row)) return row;
    row.diveMeetsForeignCode = true;
    row.foreignDeclared = true;
    row.webpointNonUsEffective = true;
    row.foreignInternational = true;
    row.nonDisplacing = true;
    row.ghostAdvances = true;
    row.nonDisplacingReason = appendReason(row.nonDisplacingReason, 'Foreign athlete - DiveMeets non-US/exhibition code');
    row.sourceReviewNotes = appendUnique(row.sourceReviewNotes, 'DiveMeets marked this athlete as non-US/exhibition; USA Diving rule order is restored by score for qualification impact.');
    row.countsTowardCutoff = false;
    return row;
  }
  function normalizeZoneEvent(eventRows){
    if (!eventRows.length || eventRows[0].stage !== 'Zones') return;
    const hasForeignOrNonDisplacing = eventRows.some(r => r.qualifyingEvent !== false && (isDiveMeetsForeignCode(r) || r.foreignDeclared || r.webpointNonUsEffective || r.nonDisplacing || r.hps || r.dualOtherCountry));
    if (!hasForeignOrNonDisplacing) return;
    const ordered = [...eventRows].sort(performanceSort);
    ordered.forEach((row, idx) => {
      const performancePlace = idx + 1;
      if (row.diveMeetsPlace == null) row.diveMeetsPlace = row.place;
      if (row.diveMeetsPlaceNumber == null) row.diveMeetsPlaceNumber = row.placeNumber;
      row.performancePlace = performancePlace;
      row.performancePlaceNumber = performancePlace;
      row.rulePlaceNumber = performancePlace;
      row.place = String(performancePlace);
      row.placeNumber = performancePlace;
      markDiveMeetsForeign(row);
    });
  }
  function groupedEvents(rows){
    const grouped = new Map();
    rows.forEach(r => {
      if (!r || !r.eventId) return;
      if (!grouped.has(r.eventId)) grouped.set(r.eventId, []);
      grouped.get(r.eventId).push(r);
    });
    return grouped;
  }
  function normalizeAllZoneEvents(rows){
    groupedEvents(rows).forEach(normalizeZoneEvent);
  }
  function applyGhostAdvancement(rows){
    const report = [];
    groupedEvents(rows).forEach(eventRows => {
      if (!eventRows.length || eventRows[0].stage !== 'Zones') return;
      eventRows.forEach(row => {
        if (row.qualifyingEvent === false || !row.nonDisplacing || !isGhost(row)) return;
        const p = Number(row.performancePlaceNumber || row.rulePlaceNumber || row.placeNumber);
        if (!Number.isFinite(p)) return;
        const threshold = Number(row.officialThresholdScore);
        const meetsThreshold = Number.isFinite(threshold) && Number(row.score) >= threshold;
        row.ghostAdvances = true;
        row.ghostQualificationImpact = true;
        row.ghostImpactReason = sourceLabel(row);
        row.advancesToZone = true;
        if (p <= 3) {
          row.ghostAdvancesToNationals = true;
          row.advancesToNationals = true;
          row.advancesToEWC = false;
          row.juniorNationalStatus = row.juniorNationalStatus || 'Non-displacing direct';
          row.qualificationStatus = 'Non-displacing - ' + sourceLabel(row).toLowerCase() + ' in Nationals position';
        } else if (p <= 18 || meetsThreshold) {
          row.ghostAdvancesToEWC = true;
          row.advancesToEWC = true;
          if (!row.advancesToNationals) {
            row.qualificationStatus = 'Non-displacing - ' + sourceLabel(row).toLowerCase() + ' in E/W/C position';
          }
        }
        if (row.ghostAdvancesToNationals || row.ghostAdvancesToEWC) {
          report.push({ athlete:row.athlete, event:row.eventName, zone:row.zone, performancePlace:p, score:row.score, path:row.ghostAdvancesToNationals ? 'Nationals position' : 'E/W/C position', reason:row.ghostImpactReason });
        }
      });
    });
    window.USAD_ZONE_FOREIGN_INTEGRITY = report;
  }

  if (typeof applyOverrides === 'function' && !applyOverrides.__zoneForeignPlacementFix) {
    const originalApplyOverrides = applyOverrides;
    applyOverrides = function zoneForeignApplyOverrides(row, lookup){
      const r = originalApplyOverrides(row, lookup);
      return markDiveMeetsForeign(r);
    };
    applyOverrides.__zoneForeignPlacementFix = true;
  }

  if (typeof recalcQualification === 'function' && !recalcQualification.__zoneForeignPlacementFix) {
    const originalRecalcQualification = recalcQualification;
    recalcQualification = function zoneForeignRecalcQualification(rows){
      normalizeAllZoneEvents(rows);
      originalRecalcQualification(rows);
      normalizeAllZoneEvents(rows);
      applyGhostAdvancement(rows);
    };
    recalcQualification.__zoneForeignPlacementFix = true;
  }

  if (typeof rowActions === 'function' && !rowActions.__zoneForeignPlacementFix) {
    const originalRowActions = rowActions;
    rowActions = function zoneForeignRowActions(r){
      const out = originalRowActions(r);
      if (!r || !r.diveMeetsForeignCode) return out;
      return out + '<div class="row-note" style="font-size:10.5px;color:var(--ink-3);margin-top:4px">DiveMeets 127/exhibition restored by score order</div>';
    };
    rowActions.__zoneForeignPlacementFix = true;
  }

  if (typeof recompute === 'function') {
    recompute();
    if (typeof renderAll === 'function') renderAll();
  }
})();