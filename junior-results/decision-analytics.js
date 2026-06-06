/*
  Junior Circuit decision analytics layer
  --------------------------------------
  Adds review queues, explainable segmentation, and decision actions on top of
  the existing rules engine without changing Article 303-306 calculations.
*/
(function installDecisionAnalytics(){
  if (typeof state === 'undefined' || typeof renderTable !== 'function') return;

  state.reviewQueue = state.reviewQueue || 'all';
  state.sortMode = state.sortMode || 'eventPlace';
  state.segment = state.segment || '';

  const originalBuildViewTabs = buildViewTabs;
  const originalRenderTable = renderTable;
  const originalFilteredRows = filteredRows;
  const originalSortedRows = sortedRows;
  const originalSearchText = searchText;

  const QUEUES = [
    {id:'all', label:'All review', test:r=>needsReview(r)},
    {id:'impact', label:'Affects qualification', test:r=>affectsQualification(r)},
    {id:'dual', label:'Dual decisions', test:r=>r.dualDeclared && !r.dualOtherCountry},
    {id:'foreign', label:'Foreign declarations', test:r=>r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign},
    {id:'identity', label:'Identity / duplicate', test:r=>hasIdentityIssue(r)},
    {id:'attendance', label:'Attendance decisions', test:r=>canDeclareNotAttending(r) || r.declaredNotAttending},
    {id:'statusOnly', label:'Status-only records', test:r=>r.statusOnly}
  ];

  const SEGMENTS = [
    {id:'foreign', label:'Foreign', test:r=>r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign},
    {id:'dualPending', label:'Dual pending', test:r=>r.dualDeclared && !r.dualOtherCountry},
    {id:'dualEffect', label:'Dual affects', test:r=>r.dualOtherCountry},
    {id:'hpsYmca', label:'HPS / YMCA', test:r=>r.hps || r.ymca},
    {id:'notAttending', label:'Not attending', test:r=>r.declaredNotAttending},
    {id:'directNat', label:'Direct Nationals', test:r=>r.advancesToNationals && r.juniorNationalStatus === 'Direct'},
    {id:'ewc', label:'E/W/C qualifiers', test:r=>r.advancesToEWC},
    {id:'bumps', label:'Bumps / opened spots', test:r=>r.bumpIn || r.openedSpot || r.spotShifted},
    {id:'review', label:'Review', test:r=>needsReview(r)}
  ];

  buildViewTabs = function decisionBuildViewTabs(){
    const tabs = [
      { id:'results',  label:'Results' },
      { id:'review',   label:`Review ${reviewCountBadge()}` },
      { id:'explorer', label:'Explorer' },
      { id:'bumps',    label:'Bumps & shifts' },
      { id:'flags',    label:'Flags' },
      { id:'athletes', label:'Athletes' },
      { id:'official', label:'Official list' },
      { id:'overrides',label:'Overrides' }
    ];
    const wrap = $('viewTabs');
    wrap.innerHTML = tabs.map(t => `<button class="tab-btn ${state.view === t.id ? 'active' : ''}" data-view="${t.id}">${esc(t.label)}</button>`).join('');
    wrap.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.view = btn.dataset.view;
        wrap.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderContext();
        renderTable();
      });
    });
  };

  searchText = function enhancedSearchText(r){
    return [
      originalSearchText(r), r.usaDivingId, r.zone, r.ewc, r.ageGroup, r.gender, r.discipline,
      r.qualificationStatus, r.nonDisplacingReason, r.dualSportNationalityStatus,
      (r.reviewFlags||[]).join(' '), (r.sourceReviewNotes||[]).join(' '),
      (r.dataConflicts||[]).map(c=>[c.issueType,c.description,c.recommendedAction].join(' ')).join(' ')
    ].filter(Boolean).join(' ').toLowerCase();
  };

  filteredRows = function enhancedFilteredRows(opts={}){
    let rows = originalFilteredRows(opts);
    if (state.segment) {
      const seg = SEGMENTS.find(s=>s.id===state.segment);
      if (seg) rows = rows.filter(seg.test);
    }
    return rows;
  };

  sortedRows = function enhancedSortedRows(rows){
    const arr = [...rows];
    const athlete = (a,b)=>(a.athlete||'').localeCompare(b.athlete||'') || (a.eventName||'').localeCompare(b.eventName||'');
    const risk = r => riskScore(r);
    if (state.sortMode === 'risk') return arr.sort((a,b)=>risk(b)-risk(a)||athlete(a,b));
    if (state.sortMode === 'athlete') return arr.sort(athlete);
    if (state.sortMode === 'score') return arr.sort((a,b)=>(b.score||0)-(a.score||0)||athlete(a,b));
    if (state.sortMode === 'qualification') return arr.sort((a,b)=>qualificationBucket(a)-qualificationBucket(b)||athlete(a,b));
    return originalSortedRows(rows);
  };

  renderTable = function decisionRenderTable(){
    if (state.view === 'review') return renderReviewCenter();
    if (state.view === 'explorer') return renderExplorer();
    return originalRenderTable();
  };

  function installSidebar(){
    const sidebar = document.querySelector('.control-sidebar');
    if (!sidebar || $('decisionFilters')) return;
    sidebar.insertAdjacentHTML('afterbegin', `<div class="sidebar-section decision-sidebar" id="decisionFilters">
      <div class="sidebar-section-title">Decision Segments</div>
      <button class="segment-chip ${!state.segment?'active':''}" data-segment="">All active data</button>
      ${SEGMENTS.map(s=>`<button class="segment-chip ${state.segment===s.id?'active':''}" data-segment="${s.id}">${esc(s.label)} <span id="seg-${s.id}"></span></button>`).join('')}
      <div class="sidebar-section-title sort-title">Sort</div>
      <select id="sortModeSelect" class="decision-select">
        <option value="eventPlace">Event / place</option>
        <option value="risk">Highest review risk</option>
        <option value="athlete">Athlete A-Z</option>
        <option value="score">Score high-low</option>
        <option value="qualification">Qualification outcome</option>
      </select>
    </div>`);
    $('sortModeSelect').value = state.sortMode;
    sidebar.addEventListener('click', e=>{
      const btn = e.target.closest('button[data-segment]');
      if (!btn) return;
      state.segment = btn.dataset.segment;
      state.selectedEventId = '';
      sidebar.querySelectorAll('.segment-chip').forEach(b=>b.classList.toggle('active', b===btn));
      refreshSegmentCounts();
      renderAll();
    });
    $('sortModeSelect').addEventListener('change', e=>{ state.sortMode=e.target.value; renderTable(); });
  }

  function refreshSegmentCounts(){
    const rows = originalFilteredRows({ignoreEvent:true, ignoreKpi:true});
    SEGMENTS.forEach(s=>{ const el = $(`seg-${s.id}`); if (el) el.textContent = rows.filter(s.test).length; });
  }

  function renderReviewCenter(){
    const allRows = filteredRows({ignoreEvent:true, ignoreKpi:true});
    const queue = QUEUES.find(q=>q.id===state.reviewQueue) || QUEUES[0];
    const reviewRows = sortedRows(allRows.filter(queue.test));
    $('rowCount').textContent = `${reviewRows.length.toLocaleString()} review rows`;
    renderReviewContext(allRows, reviewRows);
    if (!reviewRows.length) {
      $('tableWrap').innerHTML = `<div class="empty-state"><div class="empty-state-title">No review rows in this queue</div><div class="empty-state-sub">Change the queue, segment, or filters.</div></div>`;
      return;
    }
    const cols = ['Priority','Issue / Reason','Athlete','Event / Stage','Rule impact','Current outcome','Decision actions'];
    const tbody = reviewRows.map(r=>`<tr class="${reviewRowClass(r)}">
      <td>${priorityBadge(r)}</td>
      <td>${issueCell(r)}</td>
      <td>${reviewAthleteCell(r)}</td>
      <td>${reviewEventCell(r)}</td>
      <td>${impactCell(r)}</td>
      <td>${statusBadge(r)}${inlineBumpNote(r)}</td>
      <td>${decisionActions(r)}</td>
    </tr>`).join('');
    $('tableWrap').innerHTML = `<div class="review-shell">${reviewToolbar(allRows)}</div>` + tableHtml(cols, tbody);
    wireReviewControls();
  }

  function renderReviewContext(allRows, reviewRows){
    const impact = allRows.filter(affectsQualification).length;
    const dual = allRows.filter(r=>r.dualDeclared && !r.dualOtherCountry).length;
    const identity = allRows.filter(hasIdentityIssue).length;
    const attendance = allRows.filter(canDeclareNotAttending).length;
    $('resultsContext').innerHTML = `<div class="context-title-block"><strong>Review & Decision Center</strong><span>${esc(state.stage)} — prioritized issues, rule impact, and action buttons</span></div>
      ${[
        ['Queue', reviewRows.length], ['Impact', impact], ['Dual pending', dual], ['Identity', identity], ['Attendance', attendance]
      ].map(([l,v])=>`<div class="context-stat"><span class="context-stat-value">${esc(String(v))}</span><span class="context-stat-label">${esc(l)}</span></div>`).join('')}`;
  }

  function reviewToolbar(allRows){
    return `<div class="review-toolbar"><div class="review-queues">
      ${QUEUES.map(q=>`<button class="review-queue ${state.reviewQueue===q.id?'active':''}" data-review-queue="${q.id}">${esc(q.label)} <span>${allRows.filter(q.test).length}</span></button>`).join('')}
    </div><div class="review-guidance"><strong>Decision model:</strong> foreign/HPS/staff-approved dual-other-country are non-displacing; dual citizen alone is review-only; not-attending is event-specific and can open Zone/E/W/C spots.</div></div>`;
  }

  function wireReviewControls(){
    $('tableWrap').querySelectorAll('button[data-review-queue]').forEach(btn=>{
      btn.addEventListener('click',()=>{ state.reviewQueue=btn.dataset.reviewQueue; renderTable(); });
    });
    $('tableWrap').querySelectorAll('button[data-decision-action]').forEach(btn=>{
      btn.addEventListener('click',()=>applyDecision(btn));
    });
  }

  function applyDecision(btn){
    const row = effectiveResults.find(r=>r.id===btn.dataset.rowId);
    if (!row) return;
    const action = btn.dataset.decisionAction;
    const base = {athleteId: row.diveMeetsId, athleteName: row.athlete};
    if (action === 'foreignOn') addOverride({...base,type:'foreign',value:true,note:'Review decision: confirm foreign athlete'});
    if (action === 'foreignOff') addOverride({...base,type:'foreign',value:false,note:'Review decision: not foreign'});
    if (action === 'dualOn') addOverride({...base,type:'dual',value:true,note:'Review decision: confirm dual citizen'});
    if (action === 'dualNoEffect') { addOverride({...base,type:'dual',value:true,note:'Review decision: dual citizen'}); addOverride({...base,type:'dualEffect',value:false,note:'Review decision: no other-federation effect'}); }
    if (action === 'dualEffect') { addOverride({...base,type:'dual',value:true,note:'Review decision: dual citizen'}); addOverride({...base,type:'dualEffect',value:true,note:'Staff approved: affects results'}); }
    if (action === 'hpsOn') addOverride({...base,type:'hps',value:true,note:'Review decision: HPS'});
    if (action === 'ymcaOn') addOverride({...base,type:'ymca',value:true,note:'Review decision: YMCA champion'});
    if (action === 'notAttending') addOverride({...base,type:'notAttending',value:true,eventId:row.eventId,eventName:row.eventName,note:'Review decision: declared not attending'});
    if (action === 'attending') addOverride({...base,type:'notAttending',value:false,eventId:row.eventId,eventName:row.eventName,note:'Review decision: attending'});
  }

  function renderExplorer(){
    const rows = sortedRows(filteredRows({ignoreEvent:true}));
    $('rowCount').textContent = `${rows.length.toLocaleString()} rows`;
    $('resultsContext').innerHTML = `<div class="context-title-block"><strong>Data Explorer</strong><span>Segment, sort, search, and audit every rule-driving status</span></div>
      ${[['Athletes',new Set(rows.map(r=>r.diveMeetsId||r.athlete)).size],['Foreign',rows.filter(r=>r.foreignDeclared||r.webpointNonUsEffective).length],['Dual',rows.filter(r=>r.dualDeclared).length],['HPS/YMCA',rows.filter(r=>r.hps||r.ymca).length],['Review',rows.filter(needsReview).length]].map(([l,v])=>`<div class="context-stat"><span class="context-stat-value">${v}</span><span class="context-stat-label">${l}</span></div>`).join('')}`;
    const byAthlete = [...groupAthletes(rows).values()].sort((a,b)=>riskScore(b.sample)-riskScore(a.sample)||a.name.localeCompare(b.name));
    const cols = ['Athlete','Status profile','Events','Best / advancement','Risk / notes','Quick actions'];
    const tbody = byAthlete.map(a=>`<tr>
      <td><span class="athlete-name">${esc(a.name)}</span><div class="athlete-id">${esc(a.id||'')}</div><div class="athlete-id">${esc(a.team||'')}</div></td>
      <td>${pillList(a.flags)}</td>
      <td class="mono">${a.rows.length}<div class="athlete-event">${esc([...new Set(a.rows.map(r=>r.eventName).filter(Boolean))].slice(0,3).join(' | '))}${a.rows.length>3?'…':''}</div></td>
      <td>${explorerOutcome(a)}</td>
      <td>${priorityBadge(a.sample)}<div class="review-note">${esc(notesFor(a.sample).slice(0,2).join(' | '))}</div></td>
      <td>${decisionActions(a.sample)}</td>
    </tr>`).join('');
    $('tableWrap').innerHTML = tableHtml(cols, tbody);
    wireReviewControls();
  }

  function groupAthletes(rows){
    const grouped = new Map();
    rows.forEach(r=>{
      const k = r.diveMeetsId || r.athlete;
      if (!grouped.has(k)) grouped.set(k,{id:r.diveMeetsId,name:r.athlete,team:r.team,rows:[],flags:new Set(),sample:r});
      const g = grouped.get(k); g.rows.push(r); (r.effectiveFlags||[]).forEach(f=>g.flags.add(f)); if (riskScore(r)>riskScore(g.sample)) g.sample=r;
    });
    grouped.forEach(g=>g.flags=[...g.flags]);
    return grouped;
  }

  function explorerOutcome(a){
    const direct = a.rows.filter(r=>r.advancesToNationals).length;
    const ewc = a.rows.filter(r=>r.advancesToEWC).length;
    const zone = a.rows.filter(r=>r.advancesToZone).length;
    const best = a.rows.slice().sort((x,y)=>(x.placeNumber||999)-(y.placeNumber||999))[0];
    return `<div>${direct?pill(`${direct} Nationals`,'qualifier'):''}${ewc?pill(`${ewc} E/W/C`,'qualifier'):''}${zone&&!direct&&!ewc?pill(`${zone} Zone`,'qualifier'):''}</div><div class="athlete-event">Best: ${esc(best?.eventName||'')} ${best?.place?`#${esc(best.place)}`:''}</div>`;
  }

  function issueCell(r){
    const notes = notesFor(r);
    return `<strong>${esc(issueTitle(r))}</strong>${notes.map(n=>`<div class="review-note">${esc(n)}</div>`).join('')}`;
  }

  function reviewAthleteCell(r){
    return `<span class="athlete-name">${esc(r.athlete||'')}</span><div class="athlete-id">DM ${esc(r.diveMeetsId||'—')} ${r.usaDivingId?`· USAD ${esc(r.usaDivingId)}`:''}</div><div class="athlete-event">${esc(r.team||'')}</div>${flagPills(r)}`;
  }

  function reviewEventCell(r){
    return `<strong>${esc(r.eventName||'Status record')}</strong><div class="athlete-event">${esc([r.meetName,r.zone?'Zone '+r.zone:'',r.ewc,r.ageGroup,r.discipline].filter(Boolean).join(' · '))}</div>`;
  }

  function impactCell(r){
    const impacts=[];
    if (r.nonDisplacing) impacts.push('Does not consume spot');
    if (r.openedSpot) impacts.push('Opens replacement spot');
    if (r.bumpIn) impacts.push('Moves athlete up');
    if (r.advancesToNationals) impacts.push('Nationals path');
    if (r.advancesToEWC) impacts.push('E/W/C path');
    if (r.statusOnly) impacts.push('Status only; no rank impact');
    if (!impacts.length) impacts.push('No current calculation impact');
    return impacts.map(x=>pill(x, x.includes('Opens')||x.includes('Moves')?'average':'')).join('');
  }

  function decisionActions(r){
    if (!r || (!r.diveMeetsId && !r.athlete)) return '';
    const id = escAttr(r.id);
    const buttons=[];
    if (!r.foreignDeclared) buttons.push(['foreignOn','Mark foreign']); else buttons.push(['foreignOff','Not foreign']);
    if (r.dualDeclared && !r.dualOtherCountry) { buttons.push(['dualNoEffect','Dual no effect']); buttons.push(['dualEffect','Approve dual effect']); }
    else if (!r.dualDeclared) buttons.push(['dualOn','Mark dual']);
    if (!r.hps) buttons.push(['hpsOn','HPS']);
    if (!r.ymca) buttons.push(['ymcaOn','YMCA']);
    if (canDeclareNotAttending(r)) buttons.push(['notAttending','Not attending']);
    if (r.declaredNotAttending) buttons.push(['attending','Attending']);
    return `<div class="decision-actions">${buttons.map(([action,label])=>`<button class="row-act-btn" data-decision-action="${action}" data-row-id="${id}">${esc(label)}</button>`).join('')}</div>`;
  }

  function canDeclareNotAttending(r){
    return Boolean((r.advancesToNationals || r.advancesToEWC || r.advancesToZone || r.eligibleRank || r.countingRank) && !r.statusOnly);
  }

  function notesFor(r){
    const notes=[];
    if (r.reviewFlags?.length) notes.push(...r.reviewFlags);
    if (r.sourceReviewNotes?.length) notes.push(...r.sourceReviewNotes);
    if (r.dataConflicts?.length) notes.push(...r.dataConflicts.flatMap(c=>[c.issueType,c.description,c.recommendedAction].filter(Boolean)));
    if (r.dualDeclared && !r.dualOtherCountry) notes.push('Dual citizen declaration is review-only until staff approves other-federation effect.');
    if (r.exhibitionLikelyForeign && !r.foreignDeclared) notes.push('Exhibition in qualifying event: verify foreign status.');
    return [...new Set(notes)].slice(0,4);
  }

  function issueTitle(r){
    if (r.dualDeclared && !r.dualOtherCountry) return 'Dual citizenship decision needed';
    if (hasIdentityIssue(r)) return 'Identity or duplicate conflict';
    if (r.exhibitionLikelyForeign && !r.foreignDeclared) return 'Possible foreign athlete';
    if (r.statusOnly) return 'Status-only declaration';
    if (r.declaredNotAttending) return 'Attendance affects list';
    if (r.nonDisplacing) return 'Non-displacing status active';
    return 'Review flag';
  }

  function needsReview(r){
    return Boolean(r.reviewFlags?.length || r.sourceReviewNotes?.length || r.dataConflicts?.length || r.statusOnly || (r.dualDeclared && !r.dualOtherCountry) || r.exhibitionLikelyForeign);
  }

  function affectsQualification(r){
    return Boolean(r.nonDisplacing || r.openedSpot || r.bumpIn || r.declaredNotAttending || r.advancesToNationals || r.advancesToEWC || r.advancesToZone);
  }

  function hasIdentityIssue(r){
    const text = notesFor(r).join(' ').toLowerCase();
    return Boolean(r.dataConflicts?.length || text.includes('duplicate') || text.includes('conflict') || text.includes('spelling') || text.includes('sparse') || (!r.diveMeetsId && r.foreignDeclared));
  }

  function riskScore(r){
    let score=0;
    if (affectsQualification(r)) score+=30;
    if (r.openedSpot || r.bumpIn || r.spotShifted) score+=25;
    if (r.dualDeclared && !r.dualOtherCountry) score+=20;
    if (hasIdentityIssue(r)) score+=18;
    if (r.exhibitionLikelyForeign && !r.foreignDeclared) score+=15;
    if (r.statusOnly) score+=10;
    if (r.reviewFlags?.length) score+=r.reviewFlags.length*4;
    return score;
  }

  function priorityBadge(r){
    const s=riskScore(r); const label=s>=55?'Critical':s>=35?'High':s>=18?'Medium':'Monitor';
    const cls=s>=55?'decline':s>=35?'foreign':s>=18?'average':'';
    return pill(label,cls);
  }

  function reviewRowClass(r){ return riskScore(r)>=55?'row-review-critical':riskScore(r)>=35?'row-review-high':''; }
  function qualificationBucket(r){ if(r.advancesToNationals)return 1; if(r.advancesToEWC)return 2; if(r.advancesToZone)return 3; if(r.nonDisplacing)return 4; return 9; }
  function reviewCountBadge(){ try{ const n=effectiveResults.filter(needsReview).length; return n?`(${n})`:''; } catch { return ''; } }

  installSidebar();
  const oldRenderAll = renderAll;
  renderAll = function(){ oldRenderAll(); refreshSegmentCounts(); };
  buildViewTabs(); refreshSegmentCounts(); renderAll();
})();
