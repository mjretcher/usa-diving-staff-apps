/*
  Junior Qualification Workbench
  ------------------------------
  Qualification-first operating layer for staff review.
  Order of questions: who qualified, who needs review, who was displaced and why.
*/
(function installQualificationWorkbench(){
  if (typeof state === 'undefined' || typeof effectiveResults === 'undefined') return;

  const originalBuildViewTabs = buildViewTabs;
  const originalRenderTable = renderTable;
  const originalRenderContext = renderContext;
  const originalCurrentRows = currentRows;
  const originalSearchText = searchText;
  const originalApplyOverrides = applyOverrides;
  const originalRowActions = rowActions;

  state.view = state.view || 'qualified';
  state.workbenchQueue = state.workbenchQueue || 'impact';
  state.workbenchSort = state.workbenchSort || 'outcome';
  state.workbenchSegment = state.workbenchSegment || '';

  function isQualified(r){ return !!(r.advancesToNationals || r.advancesToEWC || r.advancesToZone || r.officialQualified); }
  function needsReview(r){ return !!(r.reviewFlags?.length || r.dataConflicts?.length || r.sourceReviewNotes?.length || r.exhibitionLikelyForeign || (r.dualDeclared && !r.dualOtherCountry)); }
  function isDisplacement(r){ return !!(r.nonDisplacing || r.bumpIn || r.openedSpot || r.spotShifted || r.declaredNotAttending); }
  function isOutcomeImpact(r){ return !!(isQualified(r) || isDisplacement(r) || r.eligibleRank || r.countingRank); }
  function isStatusOnly(r){ return !!r.statusOnly; }

  const SEGMENTS = [
    ['foreign','Foreign', r=>r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign],
    ['dualPending','Dual pending', r=>r.dualDeclared && !r.dualOtherCountry],
    ['dualEffect','Dual affects', r=>r.dualOtherCountry],
    ['hps','HPS', r=>r.hps],
    ['ymca','YMCA', r=>r.ymca],
    ['notAtt','Not attending', r=>r.declaredNotAttending],
    ['qualified','Qualified', isQualified],
    ['displaced','Displaced / shifted', isDisplacement],
    ['review','Review', needsReview]
  ];

  const QUEUES = [
    ['impact','Affects list', r=>needsReview(r) && isOutcomeImpact(r)],
    ['mismatch','Mismatches / IDs', r=>hasMismatch(r)],
    ['dual','Dual citizens', r=>r.dualDeclared],
    ['foreign','Foreign status', r=>r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign],
    ['hpsYmca','HPS / YMCA', r=>r.hps || r.ymca],
    ['attendance','Not attending', r=>r.declaredNotAttending || isQualified(r)],
    ['all','All review', needsReview]
  ];

  applyOverrides = function workbenchApplyOverrides(row, lookup){
    const r = originalApplyOverrides(row, lookup);
    const key = athleteKey(r);
    const overrides = [...(lookup.byAthlete.get(key) || [])];
    const get = type => { const m = [...overrides].reverse().find(o => o.type === type); return m ? Boolean(m.value) : null; };
    const globalNotAttending = get('notAttending');
    if (globalNotAttending !== null) r.declaredNotAttending = globalNotAttending;
    return r;
  };

  searchText = function workbenchSearchText(r){
    return [
      originalSearchText(r), r.usaDivingId, r.zone, r.ewc, r.ageGroup, r.gender, r.discipline,
      r.qualificationStatus, r.juniorNationalStatus, r.nonDisplacingReason,
      r.dualSportNationalityStatus, (r.effectiveFlags||[]).join(' '),
      (r.reviewFlags||[]).join(' '), (r.sourceReviewNotes||[]).join(' '),
      (r.dataConflicts||[]).map(c=>[c.issueType,c.description,c.recommendedAction].join(' ')).join(' ')
    ].filter(Boolean).join(' ').toLowerCase();
  };

  buildViewTabs = function workbenchBuildViewTabs(){
    const tabs = [
      ['qualified','Qualified'], ['review','Review'], ['displacement','Displaced / Why'], ['results','Results'], ['athletes','Athletes'], ['official','Official list'], ['overrides','Decisions']
    ];
    $('viewTabs').innerHTML = tabs.map(([id,label])=>`<button class="tab-btn ${state.view===id?'active':''}" data-view="${id}">${esc(label)}${id==='review'?` <span class="tab-count">${effectiveResults.filter(needsReview).length}</span>`:''}</button>`).join('');
    $('viewTabs').querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{
      state.view = btn.dataset.view;
      $('viewTabs').querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b===btn));
      renderContext(); renderTable();
    }));
  };

  renderContext = function workbenchRenderContext(){
    if (['qualified','review','displacement'].includes(state.view)) return renderWorkbenchContext();
    return originalRenderContext();
  };

  renderTable = function workbenchRenderTable(){
    if (state.view === 'qualified') return renderQualifiedBoard();
    if (state.view === 'review') return renderDecisionReview();
    if (state.view === 'displacement') return renderDisplacementBoard();
    return originalRenderTable();
  };

  rowActions = function workbenchRowActions(r){
    if (!r || (!r.diveMeetsId && !r.athlete)) return '';
    return `<div class="row-actions wb-actions">
      <button class="row-act-btn" data-wb-action="foreignOn" data-row-id="${escAttr(r.id)}">Foreign</button>
      <button class="row-act-btn" data-wb-action="foreignOff" data-row-id="${escAttr(r.id)}">Not foreign</button>
      <button class="row-act-btn" data-wb-action="dualNoEffect" data-row-id="${escAttr(r.id)}">Dual no effect</button>
      <button class="row-act-btn" data-wb-action="dualEffect" data-row-id="${escAttr(r.id)}">Dual affects</button>
      <button class="row-act-btn" data-wb-action="notAttending" data-row-id="${escAttr(r.id)}">Not attending</button>
      <button class="row-act-btn" data-wb-action="attending" data-row-id="${escAttr(r.id)}">Attending</button>
    </div>`;
  };

  function renderWorkbenchContext(){
    const rows = baseRows();
    const qualified = rows.filter(isQualified).length;
    const review = rows.filter(needsReview).length;
    const displaced = rows.filter(isDisplacement).length;
    const foreign = rows.filter(r=>r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign).length;
    const title = state.view === 'qualified' ? 'Qualification Board' : state.view === 'review' ? 'Decision Review' : 'Displacement & Rule Impact';
    const sub = state.view === 'qualified' ? 'Who qualified, by event, and why' : state.view === 'review' ? 'What staff must confirm before lists are final' : 'Who did not consume a spot, who moved up, and why';
    $('resultsContext').innerHTML = `<div class="context-title-block"><strong>${esc(title)}</strong><span>${esc(state.stage)} — ${esc(sub)}</span></div>
      ${[['Qualified',qualified],['Needs review',review],['Displaced/shifted',displaced],['Foreign',foreign]].map(([l,v])=>`<div class="context-stat"><span class="context-stat-value">${v}</span><span class="context-stat-label">${l}</span></div>`).join('')}`;
  }

  function baseRows(){
    let rows = effectiveResults.filter(r=>stageMatch(r,state.stage) || r.stage===state.stage);
    rows = rows.filter(r=>!isStatusOnly(r));
    if (state.selectedEventId) rows = rows.filter(r=>r.eventId===state.selectedEventId);
    if (state.meetName) rows = rows.filter(r=>r.meetName===state.meetName);
    if (state.eventCategory) rows = rows.filter(r=>r.eventCategory===state.eventCategory);
    if (state.discipline) rows = rows.filter(r=>r.discipline===state.discipline);
    if (state.gender) rows = rows.filter(r=>r.gender===state.gender);
    if (state.ageGroup) rows = rows.filter(r=>r.ageGroup===state.ageGroup);
    if (state.zone) rows = rows.filter(r=>r.zone===state.zone);
    if (state.ewc) rows = rows.filter(r=>r.ewc===state.ewc);
    if (state.search) rows = rows.filter(r=>searchText(r).includes(state.search.toLowerCase()));
    if (state.workbenchSegment) {
      const seg = SEGMENTS.find(s=>s[0]===state.workbenchSegment);
      if (seg) rows = rows.filter(seg[2]);
    }
    return sortWorkbench(rows);
  }

  function sortWorkbench(rows){
    const arr=[...rows];
    if (state.workbenchSort==='athlete') return arr.sort((a,b)=>(a.athlete||'').localeCompare(b.athlete||''));
    if (state.workbenchSort==='risk') return arr.sort((a,b)=>riskScore(b)-riskScore(a)||eventSort(a,b));
    if (state.workbenchSort==='score') return arr.sort((a,b)=>(b.score||0)-(a.score||0));
    return arr.sort(eventSort);
  }

  function eventSort(a,b){
    return String(a.zone||'').localeCompare(String(b.zone||'')) || evCompare(eventById.get(a.eventId)||a,eventById.get(b.eventId)||b) || (a.eligibleRank||a.countingRank||a.placeNumber||9999)-(b.eligibleRank||b.countingRank||b.placeNumber||9999);
  }

  function renderQualifiedBoard(){
    const rows = baseRows().filter(isQualified);
    $('rowCount').textContent = `${rows.length.toLocaleString()} qualifiers`;
    if (!rows.length) return empty('No qualifiers match the current filters.');
    const cols=['Path','Event','Rank','Athlete','Status flags','Why qualified','What changed'];
    const body=rows.map(r=>`<tr>${td(pathCell(r))}${td(eventCell(r))}<td class="mono">${esc(String(r.eligibleRank||r.countingRank||r.place||''))}</td>${td(athleteSummary(r))}${td(flagPills(r))}${td(whyQualified(r))}${td(changeExplanation(r))}</tr>`).join('');
    $('tableWrap').innerHTML = workbenchToolbar() + tableHtml(cols,body);
    wireWorkbench();
  }

  function renderDecisionReview(){
    const queue = QUEUES.find(q=>q[0]===state.workbenchQueue) || QUEUES[0];
    const rows = baseRows().filter(queue[2]);
    const unmatched = (DATA.athleteStatusOnlyRecords || []).filter(r=>statusRecordVisible(r));
    const allRows = state.workbenchQueue === 'mismatch' || state.workbenchQueue === 'all' ? rows.concat(unmatched.map(statusOnlyAsReviewRow)) : rows;
    $('rowCount').textContent = `${allRows.length.toLocaleString()} review items`;
    if (!allRows.length) return empty('No review items match the current queue and filters.');
    const cols=['Priority','Decision needed','Athlete','Context','Current rule impact','Action'];
    const body=allRows.map(r=>`<tr class="${riskScore(r)>=45?'wb-risk-high':''}">${td(priority(r))}${td(decisionNeeded(r))}${td(athleteSummary(r))}${td(eventCell(r))}${td(changeExplanation(r))}${td(rowActions(r))}</tr>`).join('');
    $('tableWrap').innerHTML = reviewQueues() + workbenchToolbar() + tableHtml(cols,body);
    wireWorkbench();
  }

  function renderDisplacementBoard(){
    const rows = baseRows().filter(isDisplacement);
    $('rowCount').textContent = `${rows.length.toLocaleString()} impact rows`;
    if (!rows.length) return empty('No displacement or shift rows match the current filters.');
    const cols=['Type','Event','Athlete','Reason','Downstream effect','Actions'];
    const body=rows.map(r=>`<tr>${td(displacementType(r))}${td(eventCell(r))}${td(athleteSummary(r))}${td(displacementReason(r))}${td(changeExplanation(r))}${td(rowActions(r))}</tr>`).join('');
    $('tableWrap').innerHTML = workbenchToolbar() + tableHtml(cols,body);
    wireWorkbench();
  }

  function workbenchToolbar(){
    return `<div class="wb-toolbar"><div class="wb-segments"><button class="wb-seg ${!state.workbenchSegment?'active':''}" data-wb-seg="">All</button>${SEGMENTS.map(s=>`<button class="wb-seg ${state.workbenchSegment===s[0]?'active':''}" data-wb-seg="${s[0]}">${esc(s[1])}</button>`).join('')}</div><select id="wbSort"><option value="outcome">Event / outcome</option><option value="risk">Highest impact risk</option><option value="athlete">Athlete A-Z</option><option value="score">Score high-low</option></select></div>`;
  }

  function reviewQueues(){
    const rows = baseRows();
    return `<div class="wb-queues">${QUEUES.map(q=>`<button class="wb-queue ${state.workbenchQueue===q[0]?'active':''}" data-wb-queue="${q[0]}">${esc(q[1])} <span>${rows.filter(q[2]).length}</span></button>`).join('')}</div>`;
  }

  function wireWorkbench(){
    const sort = $('wbSort'); if (sort) { sort.value=state.workbenchSort; sort.addEventListener('change',e=>{state.workbenchSort=e.target.value;renderTable();}); }
    document.querySelectorAll('[data-wb-seg]').forEach(b=>b.addEventListener('click',()=>{state.workbenchSegment=b.dataset.wbSeg; renderContext(); renderTable();}));
    document.querySelectorAll('[data-wb-queue]').forEach(b=>b.addEventListener('click',()=>{state.workbenchQueue=b.dataset.wbQueue; renderTable();}));
    document.querySelectorAll('[data-wb-action]').forEach(b=>b.addEventListener('click',()=>applyWorkbenchAction(b)));
  }

  function applyWorkbenchAction(btn){
    const row = effectiveResults.find(r=>r.id===btn.dataset.rowId) || (DATA.athleteStatusOnlyRecords||[]).find(r=>r.id===btn.dataset.rowId);
    if (!row) return;
    const base={athleteId:row.diveMeetsId, athleteName:row.athlete};
    const action=btn.dataset.wbAction;
    if(action==='foreignOn') addOverride({...base,type:'foreign',value:true,note:'Staff decision: foreign athlete'});
    if(action==='foreignOff') addOverride({...base,type:'foreign',value:false,note:'Staff decision: not foreign'});
    if(action==='dualNoEffect'){ addOverride({...base,type:'dual',value:true,note:'Staff decision: dual citizen'}); addOverride({...base,type:'dualEffect',value:false,note:'Staff decision: dual does not affect results'}); }
    if(action==='dualEffect'){ addOverride({...base,type:'dual',value:true,note:'Staff decision: dual citizen'}); addOverride({...base,type:'dualEffect',value:true,note:'Staff approved: dual affects results'}); }
    if(action==='notAttending') addOverride({...base,type:'notAttending',value:true,note:'Staff decision: not attending all events'});
    if(action==='attending') addOverride({...base,type:'notAttending',value:false,note:'Staff decision: attending'});
  }

  function statusRecordVisible(r){
    if (!state.search) return true;
    return [r.athlete,r.diveMeetsId,r.usaDivingId,r.review,(r.reviewFlags||[]).join(' '),(r.sourceReviewNotes||[]).join(' ')].join(' ').toLowerCase().includes(state.search.toLowerCase());
  }

  function statusOnlyAsReviewRow(r){ return {...r, stage:state.stage, eventName:'Unmatched status record', eventId:r.id, qualificationStatus:'Needs data match'}; }
  function pathCell(r){ if(r.advancesToNationals)return pill('Junior Nationals','qualifier'); if(r.advancesToEWC)return pill('E/W/C','qualifier'); if(r.advancesToZone)return pill('Zones','qualifier'); return pill('Qualified','qualifier'); }
  function eventCell(r){ return `<strong>${esc(r.eventName||'')}</strong><div class="athlete-event">${esc([r.meetName,r.zone?'Zone '+r.zone:'',r.ewc,r.ageGroup,r.discipline].filter(Boolean).join(' · '))}</div>`; }
  function athleteSummary(r){ return `<span class="athlete-name">${esc(r.athlete||'')}</span><div class="athlete-id">${esc(r.diveMeetsId||'No DiveMeets ID')}</div><div class="athlete-event">${esc(r.team||'')}</div>`; }
  function whyQualified(r){ return statusBadge(r) + `<div class="wb-note">${esc(r.qualifyingEvent===false?'Non-qualifying/status only':`Eligible rank ${r.eligibleRank||r.countingRank||'—'}${r.score?`, score ${fmtScore(r.score)}`:''}`)}</div>`; }
  function displacementReason(r){ return `<strong>${esc(r.nonDisplacingReason||r.qualificationStatus||'Status affects list')}</strong><div class="wb-note">${notesFor(r).join(' | ')}</div>`; }
  function displacementType(r){ if(r.nonDisplacing)return pill('Non-displacing','foreign'); if(r.declaredNotAttending)return pill('Not attending','decline'); if(r.bumpIn)return pill('Bump in','bump'); if(r.openedSpot)return pill('Opened spot','bump'); return pill('Shift','review'); }
  function changeExplanation(r){ const parts=[]; if(r.nonDisplacing)parts.push('Does not consume a qualifying spot.'); if(r.bumpIn)parts.push('Moved into qualifying range.'); if(r.openedSpot)parts.push('Opened a replacement/advancement spot.'); if(r.spotShifted)parts.push('Rank shifted by non-displacing athlete ahead.'); if(r.declaredNotAttending)parts.push('Removed from attending qualifier calculation.'); if(!parts.length && isQualified(r))parts.push('Qualified by rule from current calculation.'); if(!parts.length)parts.push('No current downstream change.'); return `<div class="wb-impact">${parts.map(esc).join('<br>')}</div>${r.bumpedBy?.length?`<div class="wb-note">By: ${esc(r.bumpedBy.map(x=>x.athlete).join(', '))}</div>`:''}${r.openedFor?.length?`<div class="wb-note">Opened for: ${esc(r.openedFor.map(x=>x.athlete).join(', '))}</div>`:''}`; }
  function decisionNeeded(r){ return `<strong>${esc(issueTitle(r))}</strong><div class="wb-note">${notesFor(r).slice(0,3).map(esc).join('<br>')}</div>`; }
  function priority(r){ const s=riskScore(r); return s>=45?pill('High','decline'):s>=25?pill('Medium','bump'):pill('Monitor','review'); }
  function notesFor(r){ return [...new Set([...(r.reviewFlags||[]),...(r.sourceReviewNotes||[]),...(r.dataConflicts||[]).flatMap(c=>[c.issueType,c.description,c.recommendedAction].filter(Boolean))].filter(Boolean))]; }
  function issueTitle(r){ if(hasMismatch(r))return 'Data mismatch / identity review'; if(r.dualDeclared&&!r.dualOtherCountry)return 'Dual decision needed'; if(r.exhibitionLikelyForeign&&!r.foreignDeclared)return 'Possible foreign athlete'; if(r.foreignDeclared)return 'Foreign status drives advancement'; if(r.hps||r.ymca)return 'Prequalified athlete competed'; if(r.declaredNotAttending)return 'Attendance decision changes list'; return 'Review required'; }
  function hasMismatch(r){ const t=notesFor(r).join(' ').toLowerCase(); return !!(r.dataConflicts?.length || t.includes('duplicate') || t.includes('conflict') || t.includes('spelling') || t.includes('unmatched') || t.includes('no matched') || (!r.diveMeetsId && r.foreignDeclared)); }
  function riskScore(r){ let s=0; if(isOutcomeImpact(r))s+=20; if(isDisplacement(r))s+=25; if(hasMismatch(r))s+=20; if(r.dualDeclared&&!r.dualOtherCountry)s+=15; if(r.exhibitionLikelyForeign&&!r.foreignDeclared)s+=15; if(r.statusOnly)s+=10; return s; }
  function td(x){ return `<td>${x||''}</td>`; }
  function empty(msg){ $('tableWrap').innerHTML=`<div class="empty-state"><div class="empty-state-title">${esc(msg)}</div></div>`; }

  const stageNav = $('stageNav');
  if(stageNav) stageNav.addEventListener('click',()=>setTimeout(()=>{ if(state.view==='results'){ state.view='qualified'; buildViewTabs(); renderContext(); renderTable(); }},0), true);
  state.view='qualified';
  recompute(); buildViewTabs(); renderAll();
})();
