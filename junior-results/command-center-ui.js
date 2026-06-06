/* Executive command-center UI overlay for the junior qualification app. */
(function(){
  if (typeof state === 'undefined' || typeof effectiveResults === 'undefined') return;
  const oldTable = renderTable;
  const oldContext = renderContext;
  const oldSearch = searchText;

  const qDefs = [
    ['impact','Affects list', r => review(r) && impact(r)],
    ['mismatch','Data match', r => mismatch(r)],
    ['dual','Dual', r => r.dualDeclared],
    ['foreign','Foreign', r => r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign],
    ['hps','HPS/YMCA', r => r.hps || r.ymca],
    ['all','All review', r => review(r)]
  ];
  const filters = [
    ['','All statuses'], ['foreign','Foreign'], ['dual','Dual pending'], ['hps','HPS'], ['ymca','YMCA'],
    ['qualified','Qualified'], ['movement','Movement impact'], ['review','Needs review']
  ];

  state.view = ['qualified','review','displacement'].includes(state.view) ? state.view : 'qualified';
  state.ccQueue = state.ccQueue || 'impact';
  state.ccFilter = state.ccFilter || '';
  state.ccSort = state.ccSort || 'event';

  searchText = function(r){ return [oldSearch(r), notes(r).join(' '), movementText(r)].filter(Boolean).join(' ').toLowerCase(); };

  buildViewTabs = function(){
    const tabs = [['qualified','Qualified'],['review','Needs Review'],['displacement','Displaced / Why'],['results','Results'],['athletes','Athletes'],['official','Official list'],['overrides','Decisions']];
    $('viewTabs').innerHTML = tabs.map(([id,label]) => `<button class="tab-btn ${state.view===id?'active':''}" data-view="${id}">${esc(label)}${id==='review'?` <span class="tab-count">${rows(true).filter(review).length}</span>`:''}</button>`).join('');
    $('viewTabs').querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => { state.view=b.dataset.view; buildViewTabs(); renderContext(); renderTable(); }));
  };

  renderContext = function(){
    if (!['qualified','review','displacement'].includes(state.view)) return oldContext();
    const r = rows(true);
    const title = state.view === 'qualified' ? 'Qualification Board' : state.view === 'review' ? 'Needs Review' : 'Displaced / Why';
    const sub = state.view === 'qualified' ? 'Who qualified, why, and what status changed the list.' : state.view === 'review' ? 'Why staff is reviewing each item and the action that resolves it.' : 'Who was non-displacing, who moved up, and the corrected outcome.';
    $('resultsContext').innerHTML = `<div class="cc-context"><div class="cc-title"><strong>${esc(title)}</strong><span>${esc(sub)}</span></div>${metric('Qualified',r.filter(qualified).length)}${metric('Needs review',r.filter(review).length)}${metric('Movement',r.filter(movement).length)}${metric('Foreign',r.filter(x=>x.foreignDeclared||x.webpointNonUsEffective||x.exhibitionLikelyForeign).length)}</div>`;
  };

  renderTable = function(){
    if (state.view === 'qualified') return renderQualified();
    if (state.view === 'review') return renderReview();
    if (state.view === 'displacement') return renderMovement();
    return oldTable();
  };

  function rows(ignoreFilter){
    let out = effectiveResults.filter(r => (stageMatch(r,state.stage) || r.stage === state.stage) && !r.statusOnly);
    if (state.selectedEventId) out = out.filter(r => r.eventId === state.selectedEventId);
    if (state.meetName) out = out.filter(r => r.meetName === state.meetName);
    if (state.eventCategory) out = out.filter(r => r.eventCategory === state.eventCategory);
    if (state.discipline) out = out.filter(r => r.discipline === state.discipline);
    if (state.gender) out = out.filter(r => r.gender === state.gender);
    if (state.ageGroup) out = out.filter(r => r.ageGroup === state.ageGroup);
    if (state.zone) out = out.filter(r => r.zone === state.zone);
    if (state.ewc) out = out.filter(r => r.ewc === state.ewc);
    if (state.search) out = out.filter(r => searchText(r).includes(state.search.toLowerCase()));
    if (!ignoreFilter && state.ccFilter) out = out.filter(filterTest(state.ccFilter));
    return sort(out);
  }

  function renderQualified(){
    const list = rows(false).filter(qualified);
    $('rowCount').textContent = `${list.length.toLocaleString()} qualifiers`;
    $('tableWrap').innerHTML = shell('Qualified athletes','Executive view of advancement, status, and movement.', groups(list).map(eventCard).join('') || empty('No qualifiers match the current filters.'));
    wire();
  }

  function renderReview(){
    const base = rows(false);
    const q = qDefs.find(x => x[0] === state.ccQueue) || qDefs[0];
    const list = base.filter(q[2]).sort((a,b)=>risk(b)-risk(a)||eventSort(a,b));
    $('rowCount').textContent = `${list.length.toLocaleString()} review items`;
    $('tableWrap').innerHTML = shell('Review board','Each card explains why review is needed and which decision resolves it.', queueBar(base) + (list.map(reviewCard).join('') || empty('No review items match this queue.')));
    wire();
  }

  function renderMovement(){
    const list = rows(false).filter(movement);
    $('rowCount').textContent = `${list.length.toLocaleString()} movement rows`;
    $('tableWrap').innerHTML = shell('Displacement and movement','Shows participation impact and the corrected advancement outcome.', list.map(moveCard).join('') || empty('No movement rows match the current filters.'));
    wire();
  }

  function shell(title,sub,body){ return `<div class="cc-shell"><div class="cc-toolbar"><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>${filterBar()}</div><div class="cc-body">${body}</div></div>`; }
  function filterBar(){ return `<div class="cc-filters"><label>Status<select id="ccFilter">${filters.map(([id,l])=>`<option value="${escAttr(id)}" ${state.ccFilter===id?'selected':''}>${esc(l)}</option>`).join('')}</select></label><label>Sort<select id="ccSort"><option value="event">Event/order</option><option value="risk">Highest impact</option><option value="athlete">Athlete A-Z</option><option value="score">Score high-low</option></select></label><button id="ccClear">Clear</button></div>`; }
  function queueBar(base){ return `<div class="cc-queues">${qDefs.map(q=>`<button class="cc-queue ${state.ccQueue===q[0]?'active':''}" data-queue="${q[0]}"><span>${esc(q[1])}</span><b>${base.filter(q[2]).length}</b></button>`).join('')}</div>`; }
  function metric(label,val){ return `<div class="cc-metric"><strong>${Number(val).toLocaleString()}</strong><span>${esc(label)}</span></div>`; }

  function eventCard(g){
    return `<section class="cc-event"><header><div><h3>${esc(g.name)}</h3><p>${esc(g.meta)}</p></div><span>${g.rows.length} qualifiers</span></header>${g.rows.map(qualRow).join('')}</section>`;
  }
  function qualRow(r){ return `<article class="cc-row"><div class="cc-rank"><small>Rank</small><strong>${esc(String(r.eligibleRank||r.countingRank||r.place||'-'))}</strong></div>${person(r)}<div class="cc-status"><strong>${esc(path(r))}</strong>${statusBadge(r)}${flagPills(r)}</div><div class="cc-explain">${explain(r)}</div></article>`; }
  function reviewCard(r){ return `<article class="cc-review ${risk(r)>=45?'high':''}"><div class="cc-review-grid"><div>${priority(r)}<h3>${esc(reason(r)[0]||'Review required')}</h3>${reason(r).slice(1,4).map(x=>`<p>${esc(x)}</p>`).join('')}</div>${person(r)}${eventInfo(r)}<div><h4>Decision needed</h4>${decision(r)}<h4>Current impact</h4>${explain(r)}</div></div><footer>${actions(r)}</footer></article>`; }
  function moveCard(r){ return `<article class="cc-move"><div>${moveType(r)}</div>${eventInfo(r)}${person(r)}<div>${explain(r)}</div><div>${actions(r)}</div></article>`; }

  function groups(list){
    const m = new Map();
    list.forEach(r => { if(!m.has(r.eventId)) m.set(r.eventId,{event:eventById.get(r.eventId)||r,rows:[]}); m.get(r.eventId).rows.push(r); });
    return [...m.values()].sort((a,b)=>evCompare(a.event,b.event)).map(g => ({name:g.event.eventName||g.rows[0].eventName, meta:[g.rows[0].meetName,g.rows[0].zone?'Zone '+g.rows[0].zone:'',g.rows[0].ewc].filter(Boolean).join(' - '), rows:g.rows}));
  }

  function person(r){ return `<div class="cc-person"><strong>${esc(r.athlete||'')}</strong><span>${esc([r.diveMeetsId?'DM '+r.diveMeetsId:'',r.usaDivingId?'USAD '+r.usaDivingId:'',r.team].filter(Boolean).join(' - '))}</span></div>`; }
  function eventInfo(r){ return `<div class="cc-event-info"><strong>${esc(r.eventName||'')}</strong><span>${esc([r.meetName,r.zone?'Zone '+r.zone:'',r.ageGroup,r.discipline].filter(Boolean).join(' - '))}</span></div>`; }
  function explain(r){ const p=[]; if(r.nonDisplacing)p.push('Does not consume a spot, but participation affects who moves up.'); if(r.bumpIn)p.push('Moved into qualifying range.'); if(r.openedSpot)p.push('Opened a replacement/advancement spot.'); if(r.spotShifted)p.push('Rank shifted by a non-displacing athlete ahead.'); if(r.declaredNotAttending)p.push('Removed from attending calculation.'); if(!p.length&&qualified(r))p.push('Qualified by rule from the current calculation.'); if(!p.length)p.push('No downstream movement currently shown.'); const by=r.bumpedBy?.length?`<p>Moved because of: ${esc(r.bumpedBy.map(x=>x.athlete).join(', '))}</p>`:''; const forWhom=r.openedFor?.length?`<p>Opened for: ${esc(r.openedFor.map(x=>x.athlete).join(', '))}</p>`:''; return `<div class="cc-explain-text">${p.map(x=>`<p>${esc(x)}</p>`).join('')}${by}${forWhom}</div>`; }
  function decision(r){ const d=[]; if(mismatch(r))d.push('Resolve source or identity mismatch.'); if(r.dualDeclared&&!r.dualOtherCountry)d.push('Choose dual no effect or dual affects results.'); if(r.exhibitionLikelyForeign&&!r.foreignDeclared)d.push('Confirm or reject foreign status.'); if(r.hps||r.ymca)d.push('Confirm prequalified status and document participation impact.'); if(!d.length)d.push('Verify and apply the appropriate staff decision.'); return d.map(x=>`<p>${esc(x)}</p>`).join(''); }
  function actions(r){ const b=[]; if(r.exhibitionLikelyForeign&&!r.foreignDeclared)b.push(['foreignOn','Confirm foreign'],['foreignOff','Not foreign']); else if(r.foreignDeclared||r.webpointNonUsEffective)b.push(['foreignOff','Not foreign']); else b.push(['foreignOn','Mark foreign']); if(r.dualDeclared&&!r.dualOtherCountry)b.push(['dualNoEffect','Dual no effect'],['dualEffect','Dual affects']); else if(!r.dualDeclared)b.push(['dualNoEffect','Mark dual/no effect']); if(!r.hps)b.push(['hpsOn','Mark HPS']); if(!r.ymca)b.push(['ymcaOn','Mark YMCA']); if(r.declaredNotAttending)b.push(['attending','Mark attending']); else if(qualified(r)||r.eligibleRank||r.countingRank)b.push(['notAttending','Not attending']); return `<div class="cc-actions">${b.map(([a,l])=>`<button data-action="${a}" data-id="${escAttr(r.id)}">${esc(l)}</button>`).join('')}</div>`; }
  function apply(btn){ const r=effectiveResults.find(x=>x.id===btn.dataset.id); if(!r)return; const base={athleteId:r.diveMeetsId,athleteName:r.athlete}; const a=btn.dataset.action; if(a==='foreignOn')addOverride({...base,type:'foreign',value:true,note:'Staff decision: foreign athlete'}); if(a==='foreignOff')addOverride({...base,type:'foreign',value:false,note:'Staff decision: not foreign'}); if(a==='dualNoEffect'){addOverride({...base,type:'dual',value:true,note:'Staff decision: dual citizen'});addOverride({...base,type:'dualEffect',value:false,note:'Staff decision: dual no effect'});} if(a==='dualEffect'){addOverride({...base,type:'dual',value:true,note:'Staff decision: dual citizen'});addOverride({...base,type:'dualEffect',value:true,note:'Staff approved: dual affects results'});} if(a==='hpsOn')addOverride({...base,type:'hps',value:true,note:'Staff decision: HPS'}); if(a==='ymcaOn')addOverride({...base,type:'ymca',value:true,note:'Staff decision: YMCA'}); if(a==='notAttending')addOverride({...base,type:'notAttending',value:true,note:'Staff decision: not attending all events'}); if(a==='attending')addOverride({...base,type:'notAttending',value:false,note:'Staff decision: attending'}); }
  function wire(){ const f=$('ccFilter'); if(f)f.addEventListener('change',e=>{state.ccFilter=e.target.value;renderContext();renderTable();}); const s=$('ccSort'); if(s){s.value=state.ccSort;s.addEventListener('change',e=>{state.ccSort=e.target.value;renderTable();});} const c=$('ccClear'); if(c)c.addEventListener('click',()=>{state.ccFilter='';state.ccSort='event';renderContext();renderTable();}); document.querySelectorAll('[data-queue]').forEach(b=>b.addEventListener('click',()=>{state.ccQueue=b.dataset.queue;renderTable();})); document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>apply(b))); }

  function qualified(r){return !!(r.advancesToNationals||r.advancesToEWC||r.advancesToZone||r.officialQualified);} function movement(r){return !!(r.nonDisplacing||r.bumpIn||r.openedSpot||r.spotShifted||r.declaredNotAttending||r.displacementSource||r.displacementBeneficiary);} function impact(r){return qualified(r)||movement(r)||r.eligibleRank||r.countingRank;} function review(r){return !!(r.reviewFlags?.length||r.dataConflicts?.length||r.sourceReviewNotes?.length||r.exhibitionLikelyForeign||(r.dualDeclared&&!r.dualOtherCountry)||mismatch(r));}
  function reason(r){const a=[]; if(mismatch(r))a.push('Data does not match cleanly',...notes(r)); if(r.dualDeclared&&!r.dualOtherCountry)a.push('Dual citizen requires staff decision.'); if(r.foreignDeclared)a.push('Foreign athlete is non-displacing and can move the next eligible athlete up.'); if(r.exhibitionLikelyForeign&&!r.foreignDeclared)a.push('Exhibition result may indicate a foreign athlete.'); if(r.hps)a.push('HPS athlete competed despite already being prequalified.'); if(r.ymca)a.push('YMCA champion status may affect advancement treatment.'); if(r.displacementSource)a.push('This athlete changed the list as a non-displacing source.'); if(r.displacementBeneficiary)a.push('This athlete moved because someone ahead was non-displacing.'); return [...new Set(a.filter(Boolean))];}
  function notes(r){return [...new Set([...(r.reviewFlags||[]),...(r.sourceReviewNotes||[]),...(r.dataConflicts||[]).flatMap(c=>[c.issueType,c.description,c.recommendedAction].filter(Boolean))].filter(Boolean))];}
  function mismatch(r){const t=notes(r).join(' ').toLowerCase();return !!(r.dataConflicts?.length||t.includes('duplicate')||t.includes('conflict')||t.includes('spelling')||t.includes('unmatched')||(!r.diveMeetsId&&r.foreignDeclared));}
  function filterTest(id){return {foreign:r=>r.foreignDeclared||r.webpointNonUsEffective||r.exhibitionLikelyForeign,dual:r=>r.dualDeclared&&!r.dualOtherCountry,hps:r=>r.hps,ymca:r=>r.ymca,qualified,movement,review}[id]||(()=>true);} function sort(list){const a=[...list]; if(state.ccSort==='athlete')return a.sort((x,y)=>(x.athlete||'').localeCompare(y.athlete||'')); if(state.ccSort==='risk')return a.sort((x,y)=>risk(y)-risk(x)||eventSort(x,y)); if(state.ccSort==='score')return a.sort((x,y)=>(y.score||0)-(x.score||0)); return a.sort(eventSort);} function eventSort(a,b){return String(a.zone||'').localeCompare(String(b.zone||''))||evCompare(eventById.get(a.eventId)||a,eventById.get(b.eventId)||b)||(a.eligibleRank||a.countingRank||a.placeNumber||9999)-(b.eligibleRank||b.countingRank||b.placeNumber||9999);} function risk(r){let s=0;if(impact(r))s+=20;if(movement(r))s+=25;if(mismatch(r))s+=20;if(r.dualDeclared&&!r.dualOtherCountry)s+=15;if(r.exhibitionLikelyForeign&&!r.foreignDeclared)s+=15;return s;} function priority(r){const s=risk(r);return s>=45?pill('High','decline'):s>=25?pill('Medium','bump'):pill('Monitor','review');} function path(r){if(r.advancesToNationals)return 'Junior Nationals';if(r.advancesToEWC)return 'E/W/C';if(r.advancesToZone)return 'Zones';return 'Qualified';} function moveType(r){if(r.nonDisplacing)return pill('Non-displacing source','foreign');if(r.bumpIn)return pill('Moved up','bump');if(r.openedSpot)return pill('Opened spot','bump');if(r.spotShifted)return pill('Shifted','bump');if(r.declaredNotAttending)return pill('Not attending','decline');return pill('Impact','review');} function movementText(r){return [r.nonDisplacingReason,r.displacementExplanation,...(r.bumpedBy||[]).map(x=>x.athlete),...(r.openedFor||[]).map(x=>x.athlete)].filter(Boolean).join(' ');} function empty(m){return `<div class="cc-empty"><strong>${esc(m)}</strong></div>`;}
  buildViewTabs(); renderContext(); renderTable();
})();
