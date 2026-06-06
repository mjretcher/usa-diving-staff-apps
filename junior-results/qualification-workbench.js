/*
  Junior Qualification Workbench
  ------------------------------
  Qualification-first operating layer for staff review.
  Order of questions: who qualified, who needs review, who was displaced and why.
*/
(function installQualificationWorkbench(){
  if (typeof state === 'undefined' || typeof effectiveResults === 'undefined') return;

  const originalRenderTable = renderTable;
  const originalRenderContext = renderContext;
  const originalSearchText = searchText;
  const originalApplyOverrides = applyOverrides;

  state.view = state.view || 'qualified';
  state.workbenchQueue = state.workbenchQueue || 'impact';
  state.workbenchSort = state.workbenchSort || 'outcome';
  state.workbenchSegment = state.workbenchSegment || '';

  function isQualified(r){ return !!(r.advancesToNationals || r.advancesToEWC || r.advancesToZone || r.officialQualified); }
  function needsReview(r){ return !!(r.reviewFlags?.length || r.dataConflicts?.length || r.sourceReviewNotes?.length || r.exhibitionLikelyForeign || (r.dualDeclared && !r.dualOtherCountry)); }
  function isDisplacement(r){ return !!(r.nonDisplacing || r.bumpIn || r.openedSpot || r.spotShifted || r.declaredNotAttending || r.displacementSource || r.displacementBeneficiary); }
  function isOutcomeImpact(r){ return !!(isQualified(r) || isDisplacement(r) || r.eligibleRank || r.countingRank); }
  function isStatusOnly(r){ return !!r.statusOnly; }
  // Actionable = requires a staff decision now (not just monitoring)
  // Excludes dual-pending (monitor category) from the urgent count
  function isActionable(r){
    return !!(
      (r.exhibitionLikelyForeign && !r.foreignDeclared) ||  // unconfirmed foreign
      hasMismatch(r) ||                                      // data mismatch
      (r.foreignDeclared && !r.nonDisplacing) ||             // foreign not yet marked non-displacing
      r.declaredNotAttending                                  // attendance decision needed
    );
  }

  const STATUS_FILTERS = [
    ['','All statuses'],
    ['foreign','Foreign'],
    ['dualPending','Dual pending'],
    ['dualEffect','Dual affects results'],
    ['hps','HPS'],
    ['ymca','YMCA'],
    ['notAtt','Not attending'],
    ['qualified','Qualified'],
    ['displaced','Displaced / shifted'],
    ['review','Needs review']
  ];

  const SEGMENT_TESTS = {
    foreign: r => r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign,
    dualPending: r => r.dualDeclared && !r.dualOtherCountry,
    dualEffect: r => r.dualOtherCountry,
    hps: r => r.hps,
    ymca: r => r.ymca,
    notAtt: r => r.declaredNotAttending,
    qualified: isQualified,
    displaced: isDisplacement,
    review: needsReview
  };

  const QUEUES = [
    ['impact','Affects list', r => needsReview(r) && isOutcomeImpact(r)],
    ['mismatch','Mismatches / IDs', r => hasMismatch(r)],
    ['dual','Dual citizens', r => r.dualDeclared],
    ['foreign','Foreign status', r => r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign],
    ['hpsYmca','HPS / YMCA', r => r.hps || r.ymca],
    ['attendance','Not attending', r => r.declaredNotAttending || isQualified(r)],
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
      ['qualified','Qualified'],
      ['review','Needs Review'],
      ['displacement','Displaced / Why'],
      ['results','Results'],
      ['athletes','Athletes'],
      ['roster','Flag Roster'],
      ['official','Official list'],
      ['roster','Flag Roster'],
      ['overrides','Decisions']
    ];
    $('viewTabs').innerHTML = tabs.map(([id,label]) => `<button class="tab-btn ${state.view===id?'active':''}" data-view="${id}">${esc(label)}${id==='review'?` <span class="tab-count">${effectiveResults.filter(r=>isActionable(r)).length}</span>`:id==='displacement'?` <span class="tab-count">${effectiveResults.filter(isDisplacement).length}</span>`:''}</button>`).join('');
    $('viewTabs').querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>{
      state.view = btn.dataset.view;
      $('viewTabs').querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b===btn));
      renderContext(); renderTable();
    }));
  };

  renderContext = function workbenchRenderContext(){
    if (['qualified','review','displacement','roster'].includes(state.view)) return renderWorkbenchContext();
    return originalRenderContext();
  };

  renderTable = function workbenchRenderTable(){
    if (state.view === 'qualified')    return renderQualifiedBoard();
    if (state.view === 'review')       return renderDecisionReview();
    if (state.view === 'displacement') return renderDisplacementBoard();
    if (state.view === 'roster')       return renderFlagRoster();
    return originalRenderTable();
  };

  rowActions = function workbenchRowActions(r){ return decisionActions(r); };

  function renderWorkbenchContext(){
    const rows = baseRows();
    const qualified = rows.filter(isQualified).length;
    const review = rows.filter(needsReview).length;
    const displaced = rows.filter(isDisplacement).length;
    const foreign = rows.filter(r=>r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign).length;
    const title = state.view === 'qualified' ? 'Qualification Board' : state.view === 'review' ? 'Needs Review' : 'Displaced / Why';
    const sub = state.view === 'qualified' ? 'Who qualified, by event, and why' : state.view === 'review' ? 'Why the athlete is on review, what decision is needed, and how to apply it' : 'Who changed the list, who moved up, and the corrected outcome';
    if (state.view === 'roster') {
      const statusData = window.USAD_JUNIOR_ATHLETE_STATUS;
      const records = statusData ? statusData.records || [] : [];
      const headers = statusData ? statusData.headers || [] : [];
      function getField(rec, key) {
        if (Array.isArray(rec)) { const i = headers.indexOf(key); return i >= 0 ? rec[i] : undefined; }
        return rec[key];
      }
      const fCount  = records.filter(r => getField(r,'foreignDeclared')).length;
      const hCount  = records.filter(r => getField(r,'hps')).length;
      const dCount  = records.filter(r => getField(r,'dualDeclared')).length;
      const yCount  = records.filter(r => getField(r,'ymca')).length;
      $('resultsContext').innerHTML = `<div class="context-title-block"><strong>FLAG ROSTER</strong><span>All flagged athletes — from official declaration workbook, independent of results loaded</span></div>
        ${[['Foreign',fCount],['HPS',hCount],['Dual',dCount],['YMCA',yCount]].map(([l,v])=>`<div class="context-stat"><span class="context-stat-value">${v}</span><span class="context-stat-label">${esc(l)}</span></div>`).join('')}`;
      return;
    }
    $('resultsContext').innerHTML = `<div class="context-title-block"><strong>${esc(title)}</strong><span>${esc(state.stage)} - ${esc(sub)}</span></div>
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
    if (state.workbenchSegment && SEGMENT_TESTS[state.workbenchSegment]) rows = rows.filter(SEGMENT_TESTS[state.workbenchSegment]);
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
    const cols=['Path','Event','Rank','Athlete','Status','Why qualified','Impact explanation'];
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
    const cols=['Priority','Why review?','Decision needed','Athlete','Event / result','Current impact','Apply decision'];
    const body=allRows.map(r=>`<tr class="${riskScore(r)>=45?'wb-risk-high':''}">${td(priority(r))}${td(whyReviewCell(r))}${td(decisionNeededCell(r))}${td(athleteSummary(r))}${td(eventCell(r))}${td(changeExplanation(r))}${td(decisionActions(r))}</tr>`).join('');
    $('tableWrap').innerHTML = reviewQueues() + workbenchToolbar() + tableHtml(cols,body);
    wireWorkbench();
  }

  function renderDisplacementBoard(){
    const allRows = baseRows().filter(isDisplacement);
    if (!allRows.length) return empty('No displacement rows match the current filters.');

    // Group by eventId
    const byEvent = new Map();
    allRows.forEach(r => {
      const key = r.eventId || r.eventName;
      if (!byEvent.has(key)) byEvent.set(key, []);
      byEvent.get(key).push(r);
    });

    // Count only cause rows (non-displacing sources) for the summary
    const causeRows = allRows.filter(r => r.nonDisplacing || r.declaredNotAttending || r.openedSpot);
    $('rowCount').textContent = `${causeRows.length} cause${causeRows.length!==1?'s':''} · ${byEvent.size} event${byEvent.size!==1?'s':''}`;

    // Build event cards (Option C) + cause detail inside (Option A)
    let html = workbenchToolbar();
    html += '<div class="disp-event-list">';

    for (const [eventKey, rows] of byEvent) {
      const eventRef = rows[0];
      const eventName = eventRef.eventName || eventKey;
      const meetMeta = [eventRef.meetName, eventRef.zone ? 'Zone '+eventRef.zone : '', eventRef.ewc].filter(Boolean).join(' · ');

      // Causes: athletes who are non-displacing / DNA
      const causes = rows.filter(r => r.nonDisplacing || r.declaredNotAttending);
      // Beneficiaries: athletes who directly moved up because of a cause in this event
      const beneficiaries = rows.filter(r => r.bumpIn || (r.spotShifted && r.bumpedBy?.length));
      // Net qualification change
      const netGain = beneficiaries.length;
      const causeCount = causes.length;

      // Collapsed summary line
      const causeTypes = [...new Set(causes.map(r =>
        r.nonDisplacing ? (r.foreignDeclared ? 'Foreign' : r.hps ? 'HPS' : 'Non-displacing') :
        r.declaredNotAttending ? 'Not attending' : 'Impact'
      ))].join(', ');

      const netLabel = netGain > 0
        ? `<span class="disp-net disp-net-gain">+${netGain} qualifier${netGain!==1?'s':''} shifted</span>`
        : causeCount > 0
          ? `<span class="disp-net disp-net-neutral">List reordered</span>`
          : `<span class="disp-net disp-net-neutral">No net change</span>`;

      const cardId = 'disp-' + CSS.escape(eventKey.replace(/[^a-z0-9]/gi,'_'));

      html += `
      <div class="disp-card" id="${escAttr(cardId)}">
        <button class="disp-card-header" data-disp-toggle="${escAttr(cardId)}" type="button">
          <div class="disp-card-left">
            <span class="disp-card-event">${esc(eventName)}</span>
            <span class="disp-card-meta">${esc(meetMeta)}</span>
          </div>
          <div class="disp-card-right">
            <span class="disp-cause-summary">${esc(causeTypes)} (${causeCount})</span>
            ${netLabel}
            <span class="disp-chevron">▸</span>
          </div>
        </button>
        <div class="disp-card-body" hidden>`;

      // Option A: show ONLY cause rows + direct beneficiaries (skip middle-of-pack shifts)
      const focusRows = [...causes, ...beneficiaries];

      if (focusRows.length === 0) {
        html += `<div class="disp-empty">No direct cause/beneficiary rows found for this event.</div>`;
      } else {
        html += `<table class="disp-table">
          <thead><tr>
            <th>Role</th><th>Athlete</th><th>Status / Action</th><th>Effect</th><th>Decision</th>
          </tr></thead><tbody>`;
        focusRows.forEach(r => {
          const isCause = causes.includes(r);
          const role = isCause
            ? (r.nonDisplacing ? displacementType(r) : pill('Not attending','decline'))
            : `<span class="disp-role-benefit">${pill('Moved up','bump')}</span>`;
          const effect = isCause
            ? `<span class="disp-effect">${r.openedFor?.length ? 'Opened spot for ' + r.openedFor.map(x=>x.athlete).join(', ') : 'Opens replacement spot'}</span>`
            : `<span class="disp-effect">Moved to rank ${r.attendingEligibleRank || r.eligibleRank || '—'}${r.bumpedBy?.length ? ' (was displaced by ' + r.bumpedBy.map(x=>x.athlete).join(', ') + ')' : ''}</span>`;
          html += `<tr class="${isCause?'disp-row-cause':'disp-row-benefit'}">
            <td>${role}</td>
            <td>${athleteSummary(r)}</td>
            <td>${statusBadge(r)}</td>
            <td>${effect}</td>
            <td>${decisionActions(r)}</td>
          </tr>`;
        });

        // If there are MORE rows that were just rank-shifted (not cause/benefit), show a suppressed count
        const silentShifts = rows.filter(r => !causes.includes(r) && !beneficiaries.includes(r) && r.spotShifted);
        if (silentShifts.length > 0) {
          html += `<tr class="disp-row-silent">
            <td colspan="5"><span class="disp-silent-note">
              + ${silentShifts.length} athlete${silentShifts.length!==1?'s':''} had rank positions updated automatically — no action needed.
            </span></td>
          </tr>`;
        }
        html += '</tbody></table>';
      }

      html += `</div></div>`;
    }

    html += '</div>';
    $('tableWrap').innerHTML = html;
    wireWorkbench();

    // Wire card toggles
    document.querySelectorAll('[data-disp-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = document.getElementById(btn.dataset.dispToggle);
        if (!card) return;
        const body = card.querySelector('.disp-card-body');
        const chevron = btn.querySelector('.disp-chevron');
        const open = body.hidden;
        body.hidden = !open;
        if (chevron) chevron.textContent = open ? '▾' : '▸';
        card.classList.toggle('disp-card-open', open);
      });
    });
  }

  function workbenchToolbar(){
    return `<div class="wb-toolbar"><label class="wb-filter-label">Status filter <select id="wbSegment">${STATUS_FILTERS.map(([id,label])=>`<option value="${escAttr(id)}" ${state.workbenchSegment===id?'selected':''}>${esc(label)}</option>`).join('')}</select></label><label class="wb-filter-label">Sort <select id="wbSort"><option value="outcome">Event / outcome</option><option value="risk">Highest review impact</option><option value="athlete">Athlete A-Z</option><option value="score">Score high-low</option></select></label><button class="btn-ghost btn-sm" id="wbClearFilters">Clear workbench filters</button></div>`;
  }

  function reviewQueues(){
    const rows = baseRows();
    return `<div class="wb-queues"><span class="wb-queue-label">Review queue</span>${QUEUES.map(q=>`<button class="wb-queue ${state.workbenchQueue===q[0]?'active':''}" data-wb-queue="${q[0]}">${esc(q[1])} <span>${rows.filter(q[2]).length}</span></button>`).join('')}</div>`;
  }

  function wireWorkbench(){
    const sort = $('wbSort'); if (sort) { sort.value=state.workbenchSort; sort.addEventListener('change',e=>{state.workbenchSort=e.target.value;renderTable();}); }
    const seg = $('wbSegment'); if (seg) { seg.value=state.workbenchSegment; seg.addEventListener('change',e=>{state.workbenchSegment=e.target.value;renderContext();renderTable();}); }
    const clear = $('wbClearFilters'); if (clear) clear.addEventListener('click',()=>{ state.workbenchSegment=''; state.workbenchSort='outcome'; renderContext(); renderTable(); });
    document.querySelectorAll('[data-wb-queue]').forEach(b=>b.addEventListener('click',()=>{state.workbenchQueue=b.dataset.wbQueue; renderTable();}));
    document.querySelectorAll('[data-wb-action]').forEach(b=>b.addEventListener('click',()=>applyWorkbenchAction(b)));
  }

  function applyWorkbenchAction(btn){
    const row = effectiveResults.find(r=>r.id===btn.dataset.rowId) || (DATA.athleteStatusOnlyRecords||[]).find(r=>r.id===btn.dataset.rowId);
    if (!row) return;
    const base={athleteId:row.diveMeetsId, athleteName:row.athlete};
    const action=btn.dataset.wbAction;
    if(action==='foreignOn') addOverride({...base,type:'foreign',value:true,note:'Staff decision: confirm foreign athlete'});
    if(action==='foreignOff') addOverride({...base,type:'foreign',value:false,note:'Staff decision: not foreign'});
    if(action==='dualNoEffect'){ addOverride({...base,type:'dual',value:true,note:'Staff decision: dual citizen'}); addOverride({...base,type:'dualEffect',value:false,note:'Staff decision: dual does not affect results'}); }
    if(action==='dualEffect'){ addOverride({...base,type:'dual',value:true,note:'Staff decision: dual citizen'}); addOverride({...base,type:'dualEffect',value:true,note:'Staff approved: dual affects results'}); }
    if(action==='hpsOn') addOverride({...base,type:'hps',value:true,note:'Staff decision: HPS athlete'});
    if(action==='ymcaOn') addOverride({...base,type:'ymca',value:true,note:'Staff decision: YMCA champion'});
    if(action==='notAttending') addOverride({...base,type:'notAttending',value:true,note:'Staff decision: not attending all events'});
    if(action==='attending') addOverride({...base,type:'notAttending',value:false,note:'Staff decision: attending'});
  }

  function statusRecordVisible(r){
    if (!state.search) return true;
    return [r.athlete,r.diveMeetsId,r.usaDivingId,r.review,(r.reviewFlags||[]).join(' '),(r.sourceReviewNotes||[]).join(' ')].join(' ').toLowerCase().includes(state.search.toLowerCase());
  }

  function statusOnlyAsReviewRow(r){ return {...r, stage:state.stage, eventName:'Unmatched status record', eventId:r.id, qualificationStatus:'Needs data match'}; }
  function pathCell(r){ if(r.advancesToNationals)return pill('Junior Nationals','qualifier'); if(r.advancesToEWC)return pill('E/W/C','qualifier'); if(r.advancesToZone)return pill('Zones','qualifier'); return pill('Qualified','qualifier'); }
  function eventCell(r){ return `<strong>${esc(r.eventName||'')}</strong><div class="athlete-event">${esc([r.meetName,r.zone?'Zone '+r.zone:'',r.ewc,r.ageGroup,r.discipline].filter(Boolean).join(' - '))}</div>`; }
  function athleteSummary(r){ return `<span class="athlete-name">${esc(r.athlete||'')}</span><div class="athlete-id">${esc(r.diveMeetsId||'No DiveMeets ID')}</div><div class="athlete-event">${esc(r.team||'')}</div>`; }
  function whyQualified(r){ return statusBadge(r) + `<div class="wb-note">${esc(r.qualifyingEvent===false?'Non-qualifying/status only':`Eligible rank ${r.eligibleRank||r.countingRank||'-'}${r.score?`, score ${fmtScore(r.score)}`:''}`)}</div>`; }
  function displacementReason(r){ return `<strong>${esc(r.nonDisplacingReason||r.qualificationStatus||'Status affects list')}</strong><div class="wb-note">${notesFor(r).join(' | ')}</div>`; }
  function displacementType(r){ if(r.nonDisplacing)return pill('Non-displacing source','foreign'); if(r.declaredNotAttending)return pill('Not attending','decline'); if(r.bumpIn)return pill('Moved up','bump'); if(r.openedSpot)return pill('Opened spot','bump'); if(r.spotShifted)return pill('Shifted','bump'); return pill('Impact','review'); }
  function changeExplanation(r){ const parts=[]; if(r.nonDisplacing)parts.push('Does not consume a qualifying spot, but participation affects who moves up.'); if(r.bumpIn)parts.push('Moved into qualifying range.'); if(r.openedSpot)parts.push('Opened a replacement/advancement spot.'); if(r.spotShifted)parts.push('Rank shifted by non-displacing athlete ahead.'); if(r.declaredNotAttending)parts.push('Removed from attending qualifier calculation.'); if(!parts.length && isQualified(r))parts.push('Qualified by rule from current calculation.'); if(!parts.length)parts.push('No current downstream change.'); return `<div class="wb-impact">${parts.map(esc).join('<br>')}</div>${r.bumpedBy?.length?`<div class="wb-note">Moved because of: ${esc(r.bumpedBy.map(x=>`${x.athlete} (${x.reason||'non-displacing'})`).join(', '))}</div>`:''}${r.openedFor?.length?`<div class="wb-note">Opened for: ${esc(r.openedFor.map(x=>x.athlete).join(', '))}</div>`:''}`; }

  function whyReviewCell(r){
    const reasons = reviewReasons(r);
    return `<strong>${esc(reasons[0] || 'Review required')}</strong>${reasons.slice(1,4).map(x=>`<div class="wb-note">${esc(x)}</div>`).join('')}`;
  }

  function decisionNeededCell(r){
    const items = [];
    if (hasMismatch(r)) items.push('Resolve identity/source mismatch before relying on the status.');
    if (r.dualDeclared && !r.dualOtherCountry) items.push('Decide: dual citizen only, or dual affects results.');
    if (r.exhibitionLikelyForeign && !r.foreignDeclared) items.push('Confirm whether this is a foreign athlete.');
    if (r.foreignDeclared) items.push('Foreign status is active; verify match/source if questioned.');
    if (r.hps || r.ymca) items.push('Confirm prequalified status and evaluate participation impact.');
    if (isQualified(r)) items.push('Verify qualification path for official communication.');
    if (!items.length) items.push('Review source notes and apply a staff decision if needed.');
    return items.map(x=>`<div class="wb-impact">${esc(x)}</div>`).join('');
  }

  function decisionActions(r){
    if (!r || (!r.diveMeetsId && !r.athlete)) return '';
    const buttons = [];
    if (r.exhibitionLikelyForeign && !r.foreignDeclared) buttons.push(['foreignOn','Confirm foreign'], ['foreignOff','Not foreign']);
    else if (r.foreignDeclared || r.webpointNonUsEffective) buttons.push(['foreignOff','Not foreign']);
    else buttons.push(['foreignOn','Mark foreign']);
    if (r.dualDeclared && !r.dualOtherCountry) buttons.push(['dualNoEffect','Dual no effect'], ['dualEffect','Dual affects']);
    else if (!r.dualDeclared) buttons.push(['dualNoEffect','Mark dual/no effect']);
    if (!r.hps) buttons.push(['hpsOn','Mark HPS']);
    if (!r.ymca) buttons.push(['ymcaOn','Mark YMCA']);
    if (r.declaredNotAttending) buttons.push(['attending','Mark attending']); else if (isQualified(r) || r.eligibleRank || r.countingRank) buttons.push(['notAttending','Not attending']);
    return `<div class="row-actions wb-actions">${buttons.map(([a,l])=>`<button class="row-act-btn" data-wb-action="${a}" data-row-id="${escAttr(r.id)}">${esc(l)}</button>`).join('')}</div>`;
  }

  function reviewReasons(r){
    const reasons = [];
    if (hasMismatch(r)) reasons.push('Data does not match cleanly', ...notesFor(r));
    if (r.dualDeclared && !r.dualOtherCountry) reasons.push('Dual citizen requires staff decision before it can affect results');
    if (r.exhibitionLikelyForeign && !r.foreignDeclared) reasons.push('Exhibition result may indicate a foreign athlete');
    if (r.foreignDeclared) reasons.push('Foreign athlete is non-displacing and can move the next eligible athlete up');
    if (r.hps) reasons.push('HPS athlete competed despite already being prequalified to Junior Nationals');
    if (r.ymca) reasons.push('YMCA champion status can affect advancement treatment');
    if (r.declaredNotAttending) reasons.push('Not-attending decision can open or change a qualification spot');
    if (r.displacementSource) reasons.push('This athlete is a source of displacement impact in the event');
    if (r.displacementBeneficiary) reasons.push('This athlete moved because someone ahead was non-displacing');
    if (!reasons.length) reasons.push(...notesFor(r));
    return [...new Set(reasons.filter(Boolean))];
  }

  function priority(r){ const s=riskScore(r); return s>=45?pill('High','decline'):s>=25?pill('Medium','bump'):pill('Monitor','review'); }
  function notesFor(r){ return [...new Set([...(r.reviewFlags||[]),...(r.sourceReviewNotes||[]),...(r.dataConflicts||[]).flatMap(c=>[c.issueType,c.description,c.recommendedAction].filter(Boolean))].filter(Boolean))]; }
  function hasMismatch(r){ const t=notesFor(r).join(' ').toLowerCase(); return !!(r.dataConflicts?.length || t.includes('duplicate') || t.includes('conflict') || t.includes('spelling') || t.includes('unmatched') || t.includes('no matched') || (!r.diveMeetsId && r.foreignDeclared)); }
  function riskScore(r){ let s=0; if(isOutcomeImpact(r))s+=20; if(isDisplacement(r))s+=25; if(hasMismatch(r))s+=20; if(r.dualDeclared&&!r.dualOtherCountry)s+=15; if(r.exhibitionLikelyForeign&&!r.foreignDeclared)s+=15; if(r.statusOnly)s+=10; return s; }
  function td(x){ return `<td>${x||''}</td>`; }
  function empty(msg){ $('tableWrap').innerHTML=`<div class="empty-state"><div class="empty-state-title">${esc(msg)}</div></div>`; }



  /* ── Flag Roster — always shows complete flagged athlete list ── */
  function renderFlagRoster() {
    const statusData = window.USAD_JUNIOR_ATHLETE_STATUS;
    if (!statusData) {
      return empty('Athlete status data not loaded. Ensure junior-athlete-status.js is included.');
    }

    const records = statusData.records || [];
    const headers = statusData.headers || [];
    function getField(rec, key) {
      if (Array.isArray(rec)) { const i = headers.indexOf(key); return i >= 0 ? rec[i] : undefined; }
      return rec[key];
    }
    function getName(rec) { return getField(rec,'name') || getField(rec,'athlete') || '—'; }
    function getDmId(rec) { return getField(rec,'diveMeetsId') || ''; }
    function getUsaId(rec) { return getField(rec,'usaDivingId') || ''; }
    function getApproval(rec) { return getField(rec,'approval') || ''; }
    function getReview(rec) { return getField(rec,'review') || ''; }

    // Cross-reference with results to show which stages they competed in
    const resultsByAthlete = new Map();
    effectiveResults.forEach(r => {
      const key = r.diveMeetsId || r.athlete;
      if (!resultsByAthlete.has(key)) resultsByAthlete.set(key, []);
      resultsByAthlete.get(key).push(r);
    });

    function getResultsSummary(rec) {
      const dmId = getDmId(rec);
      const name = getName(rec);
      const rows = resultsByAthlete.get(dmId) || resultsByAthlete.get(name) || [];
      if (!rows.length) return `<span class="roster-no-results">No results in loaded data</span>`;
      const stages = [...new Set(rows.map(r => r.stage))];
      const zones  = [...new Set(rows.filter(r => r.zone).map(r => 'Zone ' + r.zone))];
      return `<span class="roster-stages">${stages.join(' · ')}</span>${zones.length ? `<div class="roster-zones">${zones.join(', ')}</div>` : ''}`;
    }

    // Group into categories
    const categories = [
      { label: 'Foreign Athletes',        icon: '🌐', test: r => getField(r,'foreignDeclared'),  note: 'Declared foreign — non-displacing, advances as ghost through all stages' },
      { label: 'HPS Athletes',            icon: '🏅', test: r => getField(r,'hps'),              note: 'High Performance Squad — non-displacing, prequalified to Junior Nationals' },
      { label: 'YMCA Champions',          icon: '🏆', test: r => getField(r,'ymca'),             note: 'YMCA champion — non-displacing at Regionals, qualifies to E/W/C from Zones' },
      { label: 'Dual Citizens',           icon: '🔀', test: r => getField(r,'dualDeclared'),     note: 'Dual citizenship declared — pending staff decision on whether affects results' },
      { label: 'Dual (Affects Results)',  icon: '⚠️', test: r => getField(r,'dualOtherCountry'), note: 'Staff approved: dual citizen competing for another federation — non-displacing' },
    ];

    let html = `<div class="roster-search-bar">
      <input class="roster-search" id="rosterSearch" type="search" placeholder="Search by name or ID…" value="">
    </div>`;

    categories.forEach(cat => {
      const members = records.filter(cat.test);
      if (!members.length) return;

      html += `<div class="roster-category">
        <div class="roster-cat-header">
          <span class="roster-cat-icon">${cat.icon}</span>
          <span class="roster-cat-label">${esc(cat.label)}</span>
          <span class="roster-cat-count">${members.length}</span>
          <span class="roster-cat-note">${esc(cat.note)}</span>
        </div>
        <table class="roster-table">
          <thead><tr>
            <th>Athlete</th>
            <th>DiveMeets ID</th>
            <th>USA Diving ID</th>
            <th>Status / Approval</th>
            <th>Results in loaded data</th>
          </tr></thead>
          <tbody>
            ${members.map(rec => `<tr class="roster-row" data-name="${escAttr(getName(rec).toLowerCase())}" data-id="${escAttr(getDmId(rec))}">
              <td><span class="athlete-name">${esc(getName(rec))}</span></td>
              <td class="mono athlete-id">${esc(getDmId(rec)) || '<span class="roster-missing">No ID</span>'}</td>
              <td class="mono">${esc(getUsaId(rec)) || '—'}</td>
              <td>${getApproval(rec) ? `<span class="roster-approval">${esc(getApproval(rec))}</span>` : '—'}${getReview(rec) ? `<div class="wb-note">${esc(getReview(rec))}</div>` : ''}</td>
              <td>${getResultsSummary(rec)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    });

    $('rowCount').textContent = `${records.length} athletes on file`;
    $('tableWrap').innerHTML = html;

    // Wire search
    const searchInput = document.getElementById('rosterSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase();
        document.querySelectorAll('.roster-row').forEach(row => {
          const match = !q || row.dataset.name.includes(q) || row.dataset.id.includes(q);
          row.style.display = match ? '' : 'none';
        });
      });
    }
  }


  function renderFlagRoster() {
    const sd = window.USAD_JUNIOR_ATHLETE_STATUS;
    if (!sd) return empty('Athlete status file not loaded.');
    const records = sd.records || [], headers = sd.headers || [];
    const gf = (rec, key) => Array.isArray(rec) ? rec[headers.indexOf(key)] : rec[key];
    const gname = r => gf(r,'name') || gf(r,'athlete') || '—';
    const gdmid = r => gf(r,'diveMeetsId') || '';
    const gusaid = r => gf(r,'usaDivingId') || '';
    const gapproval = r => gf(r,'approval') || '';
    const greview = r => gf(r,'review') || '';

    // Cross-ref results
    const byId = new Map();
    effectiveResults.forEach(r => {
      const k = r.diveMeetsId;
      if (!byId.has(k)) byId.set(k,[]);
      byId.get(k).push(r);
    });
    function resultsSummary(rec) {
      const rows = byId.get(gdmid(rec)) || [];
      if (!rows.length) return '<span class="roster-no-results">Not in loaded results</span>';
      const stages = [...new Set(rows.map(r=>r.stage))];
      const zones = [...new Set(rows.filter(r=>r.zone).map(r=>'Zone '+r.zone))];
      return `<span class="roster-stages">${stages.join(' · ')}</span>${zones.length?'<br><span class="roster-zones">'+zones.join(', ')+'</span>':''}`;
    }

    const cats = [
      { label:'Foreign Athletes', icon:'🌐', test: r=>gf(r,'foreignDeclared'), note:'Non-displacing · competes at all stages as ghost' },
      { label:'HPS Athletes', icon:'🏅', test: r=>gf(r,'hps'), note:'Pre-qualified to Nationals · non-displacing' },
      { label:'YMCA Champions', icon:'🏆', test: r=>gf(r,'ymca'), note:'Non-displacing at Regionals · E/W/C qualifier from Zones' },
      { label:'Dual Citizens — Declared', icon:'🔀', test: r=>gf(r,'dualDeclared') && !gf(r,'dualOtherCountry'), note:'Pending staff decision on whether affects results' },
      { label:'Dual — Affects Results', icon:'⚠️', test: r=>gf(r,'dualOtherCountry'), note:'Staff approved: competed for another federation · non-displacing' },
    ];

    let html = `<div class="roster-bar"><input class="roster-search-input" id="rosterQ" type="search" placeholder="Search by name or ID…"></div>`;
    cats.forEach(cat => {
      const members = records.filter(cat.test);
      if (!members.length) return;
      html += `<div class="roster-cat">
        <div class="roster-cat-hd">
          <span class="rc-icon">${cat.icon}</span>
          <span class="rc-lbl">${esc(cat.label)}</span>
          <span class="rc-count">${members.length}</span>
          <span class="rc-note">${esc(cat.note)}</span>
        </div>
        <table class="roster-tbl"><thead><tr>
          <th>Athlete</th><th>DiveMeets</th><th>USA Diving ID</th><th>Approval / Note</th><th>In loaded results</th>
        </tr></thead><tbody>${members.map(rec=>`
          <tr class="rr" data-q="${escAttr((gname(rec)+' '+gdmid(rec)).toLowerCase())}">
            <td><span class="athlete-name">${esc(gname(rec))}</span></td>
            <td class="mono athlete-id">${gdmid(rec)||'<span class="roster-missing">No ID</span>'}</td>
            <td class="mono">${gusaid(rec)||'—'}</td>
            <td>${gapproval(rec)?`<span class="rc-approval">${esc(gapproval(rec))}</span>`:''}${greview(rec)?`<div class="wb-note">${esc(greview(rec))}</div>`:''}</td>
            <td>${resultsSummary(rec)}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>`;
    });

    $('rowCount').textContent = `${records.length} athletes on file`;
    $('tableWrap').innerHTML = html;
    const q = document.getElementById('rosterQ');
    if (q) q.addEventListener('input', () => {
      const v = q.value.toLowerCase();
      document.querySelectorAll('.rr').forEach(tr => tr.style.display = !v||tr.dataset.q.includes(v)?'':'none');
    });
  }

  const stageNav = $('stageNav');
  if(stageNav) stageNav.addEventListener('click',()=>setTimeout(()=>{ if(state.view==='results'){ state.view='qualified'; buildViewTabs(); renderContext(); renderTable(); }},0), true);
  state.view='qualified';
  recompute(); buildViewTabs(); renderAll();
})();
