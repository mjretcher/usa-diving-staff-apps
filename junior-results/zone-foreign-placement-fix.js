/*
  Zone foreign / exhibition placement fix
  ---------------------------------------
  DiveMeets pushes non-US citizen / exhibition athletes to place code 127 or EX,
  which breaks rule-order calculations if the app sorts by official DiveMeets
  place. USA Diving still needs the athlete's score-order participation impact:
  they are foreign/non-displacing, and the next eligible athlete moves up.
*/
(function installZoneForeignPlacementFix(){
  if (typeof state === 'undefined' || typeof effectiveResults === 'undefined') return;

  function norm(v){ return String(v == null ? '' : v).trim(); }
  function upper(v){ return norm(v).toUpperCase(); }
  function isFiniteScore(v){ return Number.isFinite(Number(v)); }
  function athleteOverrideKey(v){ return typeof athleteKey === 'function' ? athleteKey(v) : ''; }
  function isDiveMeetsForeignCode(row){
    const place = upper(row.place);
    const rawPlace = upper(row.rawPlace || row.diveMeetsPlace || row.officialPlace);
    const placeNumber = Number(row.placeNumber);
    const rawPlaceNumber = Number(row.rawPlaceNumber || row.diveMeetsPlaceNumber || row.officialPlaceNumber);
    return place === '127' || rawPlace === '127' || place === 'EX' || place === 'EXH' ||
      rawPlace === 'EX' || rawPlace === 'EXH' || placeNumber === 127 || rawPlaceNumber === 127 ||
      row.exhibition === true || String(row.qualified || '').toLowerCase().includes('exhibition');
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
  function appendReason(current, reason){
    const parts = String(current || '').split('|').map(s => s.trim()).filter(Boolean);
    if (!parts.includes(reason)) parts.push(reason);
    return parts.join(' | ');
  }
  function normalizeZoneEvent(eventRows){
    if (!eventRows.length) return;
    const stage = eventRows[0].stage;
    if (stage !== 'Zones') return;
    if (!eventRows.some(r => r.qualifyingEvent !== false && (isDiveMeetsForeignCode(r) || r.foreignDeclared || r.webpointNonUsEffective || r.nonDisplacing))) return;
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
  function normalizeAllZoneEvents(rows){
    const grouped = new Map();
    rows.forEach(r => {
      if (!r || !r.eventId) return;
      if (!grouped.has(r.eventId)) grouped.set(r.eventId, []);
      grouped.get(r.eventId).push(r);
    });
    grouped.forEach(normalizeZoneEvent);
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