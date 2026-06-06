/* Qualification impact annotations: explains who moved because of non-displacing athletes. */
(function installQualificationImpact(){
  if (typeof recompute !== 'function') return;

  function rowStage(r){ return r.stage === 'East/West/Central' ? 'EWC' : r.stage; }
  function rowRank(r){ return Number(r.eligibleRank || r.countingRank || 0); }
  function rowPlace(r){ return Number(r.placeNumber || r.place || 0); }
  function isRealResult(r){ return !r.statusOnly && r.qualifyingEvent !== false && rowPlace(r) > 0; }

  function boundaryCrossed(r){
    const stage = rowStage(r), rank = rowRank(r), place = rowPlace(r);
    if (!rank || !place) return false;
    if (stage === 'Regionals') return !!r.advancesToZone && rank <= 15 && place > 15;
    if (stage === 'Zones') {
      if (r.advancesToNationals && rank <= 3 && place > 3) return true;
      if (r.advancesToEWC && rank <= 18 && place > 18) return true;
      return false;
    }
    if (stage === 'EWC') return !!r.advancesToNationals && rank <= 3 && place > 3;
    return false;
  }

  function pathFor(r){
    if (r.advancesToNationals) return 'Junior Nationals';
    if (r.advancesToEWC) return 'E/W/C';
    if (r.advancesToZone) return 'Zones';
    if (r.eligibleRank || r.countingRank) return 'eligible rank';
    return 'result';
  }

  function appendUnique(list, item){
    const key = [item.athlete,item.place,item.reason,item.path].join('|');
    if (!list.some(x => [x.athlete,x.place,x.reason,x.path].join('|') === key)) list.push(item);
  }

  function resetGenerated(r){
    r.bumpedBy = Array.isArray(r.bumpedBy) ? r.bumpedBy.filter(x => !x.generatedImpact) : [];
    r.openedFor = Array.isArray(r.openedFor) ? r.openedFor.filter(x => !x.generatedImpact) : [];
    if (r.generatedSpotShifted) r.spotShifted = false;
    if (r.generatedBumpIn) r.bumpIn = false;
    if (r.generatedOpenedSpot) r.openedSpot = false;
    r.generatedSpotShifted = false;
    r.generatedBumpIn = false;
    r.generatedOpenedSpot = false;
    r.displacementSource = false;
    r.displacementBeneficiary = false;
    r.displacementExplanation = '';
  }

  function annotateQualificationImpact(){
    if (!Array.isArray(effectiveResults)) return;
    effectiveResults.forEach(resetGenerated);
    const grouped = new Map();
    effectiveResults.forEach(r => {
      if (!r.eventId) return;
      if (!grouped.has(r.eventId)) grouped.set(r.eventId, []);
      grouped.get(r.eventId).push(r);
    });

    grouped.forEach(rows => {
      const ordered = rows.filter(isRealResult).sort((a,b) => rowPlace(a) - rowPlace(b) || (b.score || 0) - (a.score || 0));
      const priorSources = [];
      ordered.forEach(r => {
        if (r.nonDisplacing) {
          r.displacementSource = true;
          priorSources.push(r);
          return;
        }
        const prior = priorSources.filter(n => rowPlace(n) < rowPlace(r));
        if (!prior.length) return;
        r.spotShifted = true;
        r.generatedSpotShifted = true;
        r.displacementBeneficiary = true;
        r.displacementExplanation = `Moved up by ${prior.length} non-displacing athlete${prior.length === 1 ? '' : 's'} ahead.`;
        prior.forEach(n => appendUnique(r.bumpedBy, {
          athlete: n.athlete,
          place: n.place,
          reason: n.nonDisplacingReason || 'Non-displacing status',
          path: pathFor(r),
          generatedImpact: true
        }));
        if (boundaryCrossed(r)) {
          r.bumpIn = true;
          r.generatedBumpIn = true;
          prior.forEach(n => {
            n.openedSpot = true;
            n.generatedOpenedSpot = true;
            n.displacementSource = true;
            appendUnique(n.openedFor, {
              athlete: r.athlete,
              place: r.place,
              countingRank: r.eligibleRank || r.countingRank || '',
              path: pathFor(r),
              generatedImpact: true
            });
          });
        }
      });
    });

    if (typeof buildEffectiveEvents === 'function') {
      effectiveEvents = buildEffectiveEvents(effectiveResults);
      eventById = new Map(effectiveEvents.map(e => [e.id, e]));
    }
  }

  const originalRecompute = recompute;
  recompute = function qualificationImpactRecompute(){
    originalRecompute();
    annotateQualificationImpact();
  };
  annotateQualificationImpact();
  if (typeof renderAll === 'function') renderAll();
})();
