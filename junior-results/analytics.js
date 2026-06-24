/* ================================================================
   analytics.js — Junior Circuit pipeline analytics
   "Qualified but didn't compete" reports, displacement maps,
   foreign/dual/HPS participation breakdowns across all stages.
   Mounted as a new tab on the Nationals stage.
   ================================================================ */
(function () {
  'use strict';

  /* ── helpers ───────────────────────────────────────────────── */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function norm(v) {
    return String(v||'').toLowerCase().normalize('NFKD')
      .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function pct(n, d) { return d ? Math.round(100 * n / d) : 0; }
  function fmtScore(v) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(2) : '—'; }

  /* ── Data sources ──────────────────────────────────────────── */
  function allResults() {
    return (typeof effectiveResults !== 'undefined' ? effectiveResults
      : (window.JUNIOR_RESULTS_DATA?.results || []));
  }
  const EWC    = window.USAD_EWC_DATA || null;
  const ZONE_TO_EWC = {A:'East',B:'East',C:'Central',D:'Central',E:'West',F:'West'};

  /* ── EWC registration lookup ───────────────────────────────── */
  const _ewcSet = new Set();
  if (EWC?.entries) {
    EWC.entries.forEach(e => _ewcSet.add(norm(e.name)));
  }
  function isEWCRegistered(name) { return _ewcSet.has(norm(name)); }

  /* ── Core pipeline data builder ────────────────────────────── */
  function buildPipelineData(filters = {}) {
    const all = allResults();
    function match(r) {
      if (filters.ageGroup && r.ageGroup !== filters.ageGroup) return false;
      if (filters.gender   && r.gender   !== filters.gender)   return false;
      if (filters.zone     && r.zone     !== filters.zone)     return false;
      if (filters.ewc      && r.ewc      !== filters.ewc && ZONE_TO_EWC[r.zone] !== filters.ewc) return false;
      if (filters.discipline && r.discipline !== filters.discipline) return false;
      if (filters.team     && !(r.team||'').toLowerCase().includes(filters.team.toLowerCase())) return false;
      return true;
    }

    const regRows  = all.filter(r => r.stage === 'Regionals' && match(r));
    const zoneRows = all.filter(r => r.stage === 'Zones'     && match(r));

    // Regionals → Zones
    const regQualified = regRows.filter(r => r.advancesToZone && !r.nonDisplacing);
    const regNames     = new Set(zoneRows.map(r => norm(r.athlete)));
    const regNoShow    = regQualified.filter(r => !regNames.has(norm(r.athlete)));

    // Zone → EWC (only Groups A–D advancing, non-displacing excluded)
    const zoneEWCQual  = zoneRows.filter(r => (r.advancesToEWC || r.advancesToNationals) && !r.nonDisplacing);
    const zoneNatDirect= zoneRows.filter(r => r.advancesToNationals && !r.nonDisplacing);
    const zoneEWCOnly  = zoneRows.filter(r => r.advancesToEWC && !r.advancesToNationals && !r.nonDisplacing);
    const zoneNoShowEWC= EWC ? zoneEWCOnly.filter(r => !isEWCRegistered(r.athlete)) : [];
    const zoneNoShowNat= EWC ? zoneNatDirect.filter(r => !isEWCRegistered(r.athlete)) : [];

    // Non-displacing breakdown
    const ndZone = zoneRows.filter(r => r.nonDisplacing);
    const foreignZone = ndZone.filter(r => r.foreignDeclared || r.webpointNonUsEffective);
    const hpsZone     = ndZone.filter(r => r.hps && !r.foreignDeclared);
    const dualZone    = ndZone.filter(r => r.dualOtherCountry);
    const ymcaZone    = zoneRows.filter(r => r.ymca && !r.nonDisplacing);

    // Displacement events (bump-ins caused by non-displacing)
    const bumpedReg  = regRows.filter(r => r.bumpIn);
    const bumpedZone = zoneRows.filter(r => r.bumpIn);
    const openedReg  = regRows.filter(r => r.openedSpot);
    const openedZone = zoneRows.filter(r => r.openedSpot);

    // Avg threshold qualifiers
    const regAvgQual  = regRows.filter(r => r.officialAverageScoreQualifier);
    const zoneAvgQual = zoneRows.filter(r => r.officialAverageScoreQualifier);

    return {
      regRows, zoneRows,
      regQualified, regNoShow,
      zoneEWCQual, zoneNatDirect, zoneEWCOnly,
      zoneNoShowEWC, zoneNoShowNat,
      ndZone, foreignZone, hpsZone, dualZone, ymcaZone,
      bumpedReg, bumpedZone, openedReg, openedZone,
      regAvgQual, zoneAvgQual,
    };
  }

  /* ── Filter state ──────────────────────────────────────────── */
  const aState = {
    ageGroup:   '',
    gender:     '',
    zone:       '',
    ewc:        '',
    discipline: '',
    team:       '',
    activeTab:  'dropout',  // dropout | special | displacement
  };

  /* ── Render analytics ──────────────────────────────────────── */
  function renderAnalytics() {
    const tableWrap = document.getElementById('tableWrap');
    const ctx       = document.getElementById('resultsContext');
    if (!tableWrap) return;

    if (ctx) ctx.innerHTML = `
      <div class="context-title-block">
        <strong>Pipeline Analytics — Junior Circuit 2026</strong>
        <span>Qualification flow, dropout rates, special athlete participation, displacement events</span>
      </div>`;

    // Build data with current filters
    const d = buildPipelineData(aState);

    tableWrap.innerHTML = `
      <div class="an-shell">
        ${renderAnFilters(d)}
        <div class="an-tabs">
          <button class="an-tab ${aState.activeTab==='dropout'?'active':''}" onclick="window._anTab('dropout')">
            Qualified not competed
          </button>
          <button class="an-tab ${aState.activeTab==='special'?'active':''}" onclick="window._anTab('special')">
            Foreign / Dual / HPS / YMCA
          </button>
          <button class="an-tab ${aState.activeTab==='displacement'?'active':''}" onclick="window._anTab('displacement')">
            Displacement &amp; bump-ins
          </button>
        </div>
        <div class="an-body">
          ${aState.activeTab === 'dropout'     ? renderDropoutTab(d)     : ''}
          ${aState.activeTab === 'special'     ? renderSpecialTab(d)     : ''}
          ${aState.activeTab === 'displacement'? renderDisplacementTab(d): ''}
        </div>
      </div>`;

    updateAnEventList(d);
    wireAnFilters();
  }

  window._anTab = function(tab) { aState.activeTab = tab; renderAnalytics(); };

  /* ── Filter bar ────────────────────────────────────────────── */
  function renderAnFilters(d) {
    const all = allResults();
    function opts(key) {
      return [...new Set(all.map(r => r[key]).filter(Boolean))].sort();
    }
    function sel(id, key, label, values) {
      return `<div class="an-filter">
        <label class="an-filter-label">${esc(label)}</label>
        <select id="an-f-${id}" onchange="window._anFilter('${key}',this.value)">
          <option value="">All</option>
          ${values.map(v=>`<option value="${esc(v)}" ${aState[key]===v?'selected':''}>${esc(v)}</option>`).join('')}
        </select>
      </div>`;
    }
    return `<div class="an-filters">
      ${sel('ag','ageGroup','Age group',['Group A','Group B','Group C','Group D'])}
      ${sel('gn','gender','Gender',['Girls','Boys'])}
      ${sel('zn','zone','Zone',['A','B','C','D','E','F'])}
      ${sel('ew','ewc','E/W/C meet',['East','Central','West'])}
      ${sel('bd','discipline','Board',['1M','3M','Platform'])}
      <div class="an-filter">
        <label class="an-filter-label">Team</label>
        <input id="an-f-team" type="search" placeholder="Search team…" value="${esc(aState.team)}"
          oninput="window._anFilter('team',this.value)" class="an-search-input">
      </div>
      ${aState.ageGroup||aState.gender||aState.zone||aState.ewc||aState.discipline||aState.team
        ? `<button class="an-clear-btn" onclick="window._anClearFilters()">Clear filters</button>` : ''}
    </div>`;
  }

  window._anFilter = function(key, val) { aState[key] = val; renderAnalytics(); };
  window._anClearFilters = function() {
    Object.assign(aState, {ageGroup:'',gender:'',zone:'',ewc:'',discipline:'',team:''});
    renderAnalytics();
  };

  function wireAnFilters() {
    // Filters are inline onchange/oninput, nothing extra needed
  }

  /* ── Event list sidebar ────────────────────────────────────── */
  function updateAnEventList(d) {
    const el = document.getElementById('eventList');
    if (!el) return;
    el.innerHTML = `
      <div style="padding:10px 12px">
        <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3);margin-bottom:8px">Quick stats</div>
        ${statRow('Reg. qualifiers', d.regQualified.length)}
        ${statRow('Did not compete at Zones', d.regNoShow.length, d.regQualified.length)}
        ${statRow('Zone EWC qualifiers', d.zoneEWCOnly.length)}
        ${statRow('Did not register for EWC', d.zoneNoShowEWC.length, d.zoneEWCOnly.length)}
        ${statRow('Zone Nat direct', d.zoneNatDirect.length)}
        ${statRow('Non-displacing at Zones', d.ndZone.length)}
        ${statRow('Foreign at Zones', d.foreignZone.length)}
        ${statRow('HPS at Zones', d.hpsZone.length)}
        ${statRow('Dual (affect results)', d.dualZone.length)}
        ${statRow('Bump-ins at Regionals', d.bumpedReg.length)}
      </div>`;
  }

  function statRow(label, n, denom) {
    const pctStr = denom != null ? ` <span style="color:var(--ink-4);font-size:10px">(${pct(n,denom)}%)</span>` : '';
    return `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:0.5px solid var(--line-2)">
      <span style="font-size:11px;color:var(--ink-2)">${esc(label)}</span>
      <span style="font-size:12px;font-weight:500;font-family:var(--f-mono)">${n}${pctStr}</span>
    </div>`;
  }

  /* ── Tab 1: Qualified not competed ───────────────────────────── */
  function renderDropoutTab(d) {
    return `
      <div class="an-section-title">Regionals → Zones: athletes who qualified but did not compete</div>
      ${kpiRow([
        {label:'Qualified at Regionals', value: d.regQualified.length, sub:'Groups A & B only'},
        {label:'Appeared at Zones', value: d.regQualified.length - d.regNoShow.length, accent:'green', sub: pct(d.regQualified.length - d.regNoShow.length, d.regQualified.length)+'% attendance'},
        {label:'Did not compete', value: d.regNoShow.length, accent: d.regNoShow.length > 0 ? 'amber' : '', sub: pct(d.regNoShow.length, d.regQualified.length)+'% dropout'},
        {label:'Avg threshold qualifiers', value: d.regAvgQual.length, sub:'qualified via 15th avg'},
      ])}
      ${d.regNoShow.length ? athleteTable(d.regNoShow, 'reg', [
        {key:'athlete', label:'Athlete'},
        {key:'team',    label:'Team'},
        {key:'ageGroup',label:'Group'},
        {key:'zone',    label:'Zone'},
        {key:'eventKey',label:'Event'},
        {key:'qualificationStatus', label:'How qualified', trunc:35},
        {key:'score',   label:'Score', fmt:fmtScore},
      ]) : '<div class="an-empty">No no-shows match these filters.</div>'}

      <div class="an-section-title" style="margin-top:28px">Zones → E/W/C: athletes who qualified but did not register</div>
      ${kpiRow([
        {label:'Qualified to E/W/C', value: d.zoneEWCOnly.length, sub:'places 4–18 + avg threshold'},
        {label:'Registered', value: d.zoneEWCOnly.length - d.zoneNoShowEWC.length, accent:'green', sub: pct(d.zoneEWCOnly.length - d.zoneNoShowEWC.length, d.zoneEWCOnly.length)+'%'},
        {label:'Not registered', value: d.zoneNoShowEWC.length, accent: d.zoneNoShowEWC.length > 10 ? 'red' : 'amber', sub: pct(d.zoneNoShowEWC.length, d.zoneEWCOnly.length)+'% dropout'},
        {label:'Nat direct — not at EWC', value: d.zoneNoShowNat.length, sub:'chose not to compete'},
      ])}
      ${d.zoneNoShowEWC.length ? `
        <div style="margin-bottom:8px">
          ${['East','Central','West'].map(meet => {
            const zones = Object.entries(ZONE_TO_EWC).filter(([,m])=>m===meet).map(([z])=>z);
            const q = d.zoneNoShowEWC.filter(r => zones.includes(r.zone));
            return q.length ? `<span style="margin-right:12px;font-size:12px;color:var(--ink-2)">${esc(meet)}: <strong>${q.length}</strong> not registered</span>` : '';
          }).join('')}
        </div>
        ${athleteTable(d.zoneNoShowEWC, 'ewc-noshow', [
          {key:'athlete',  label:'Athlete'},
          {key:'team',     label:'Team'},
          {key:'ageGroup', label:'Group'},
          {key:'zone',     label:'Zone', render: r => `<span class="zone-badge zone-${r.zone}">Z${r.zone}</span> → ${ZONE_TO_EWC[r.zone]||'?'}`},
          {key:'eventKey', label:'Event'},
          {key:'eligibleRank', label:'Elig rank'},
          {key:'score',    label:'Score', fmt: fmtScore},
          {key:'qualificationStatus', label:'How qualified', trunc:30},
        ])}` : '<div class="an-empty">All zone qualifiers registered at E/W/C (or no filter match).</div>'}

      ${d.zoneAvgQual.length ? `
        <div class="an-section-title" style="margin-top:28px">Zones: athletes who qualified via 18th-place avg threshold</div>
        ${athleteTable(d.zoneAvgQual, 'zone-avg', [
          {key:'athlete',  label:'Athlete'},
          {key:'team',     label:'Team'},
          {key:'ageGroup', label:'Group'},
          {key:'zone',     label:'Zone', render: r => `<span class="zone-badge zone-${r.zone}">Z${r.zone}</span>`},
          {key:'eventKey', label:'Event'},
          {key:'score',    label:'Score', fmt:fmtScore},
          {key:'officialThresholdScore', label:'Threshold', fmt:fmtScore},
        ])}` : ''}`;
  }

  /* ── Tab 2: Foreign / Dual / HPS / YMCA ───────────────────── */
  function renderSpecialTab(d) {
    const all = allResults();
    const regRows = all.filter(r => r.stage === 'Regionals');
    const foreignReg = regRows.filter(r => r.foreignDeclared || r.webpointNonUsEffective);
    const dualReg    = regRows.filter(r => r.dualOtherCountry);
    const hpsReg     = regRows.filter(r => r.hps);

    return `
      <div class="an-section-grid">

        <div class="an-section-card">
          <div class="an-card-title">Foreign athletes</div>
          ${kpiRow([
            {label:'At Regionals',  value: foreignReg.length,       sub:'non-displacing'},
            {label:'At Zones',      value: d.foreignZone.length,     sub:'non-displacing', accent:'red'},
            {label:'At E/W/C',      value: EWC ? EWC.foreignAthletes.length : '?', sub:'declared', accent:'red'},
          ], 'compact')}
          <div class="an-card-sub-title">Zone-level foreign athletes</div>
          ${d.foreignZone.length ? athleteTable(d.foreignZone, 'foreign-zone', [
            {key:'athlete',  label:'Athlete'},
            {key:'zone',     label:'Zone', render: r=>`<span class="zone-badge zone-${r.zone}">Z${r.zone}</span>`},
            {key:'eventKey', label:'Event'},
            {key:'place',    label:'Place'},
            {key:'score',    label:'Score', fmt:fmtScore},
          ]) : '<div class="an-empty">No foreign athletes match filters.</div>'}
        </div>

        <div class="an-section-card">
          <div class="an-card-title">Dual citizens (affects results)</div>
          ${kpiRow([
            {label:'At Regionals', value: dualReg.length,       sub:'non-displacing'},
            {label:'At Zones',     value: d.dualZone.length,    sub:'non-displacing', accent:'amber'},
            {label:'Kept invited', value: d.zoneRows.filter(r=>r.keptInvitedJoNationals).length, sub:'to JO Nationals'},
          ], 'compact')}
          <div class="an-card-sub-title">Zone-level dual citizens</div>
          ${d.dualZone.length ? athleteTable(d.dualZone, 'dual-zone', [
            {key:'athlete',  label:'Athlete'},
            {key:'team',     label:'Team'},
            {key:'zone',     label:'Zone', render: r=>`<span class="zone-badge zone-${r.zone}">Z${r.zone}</span>`},
            {key:'eventKey', label:'Event'},
            {key:'eligibleRank', label:'Elig rank'},
            {key:'score',    label:'Score', fmt:fmtScore},
            {key:'keptInvitedJoNationals', label:'Kept invited', render: r => r.keptInvitedJoNationals
              ? '<span class="an-badge an-badge-green">Yes</span>'
              : '<span class="an-badge an-badge-gray">No</span>'},
          ]) : '<div class="an-empty">No dual citizens match filters.</div>'}
        </div>

        <div class="an-section-card">
          <div class="an-card-title">HPS athletes</div>
          ${kpiRow([
            {label:'Pre-qualified list', value: EWC ? EWC.hpsAthletes.length : 33, sub:'to JO Nationals prelims'},
            {label:'Competing at E/W/C', value: 0, sub:'none registered', accent:''},
            {label:'At Zones (ND)',      value: d.hpsZone.length, sub:'non-displacing'},
          ], 'compact')}
          <div class="an-card-sub-title">HPS athletes appearing at Zones (non-displacing)</div>
          ${d.hpsZone.length ? athleteTable(d.hpsZone, 'hps-zone', [
            {key:'athlete',  label:'Athlete'},
            {key:'ageGroup', label:'Group'},
            {key:'zone',     label:'Zone', render: r=>`<span class="zone-badge zone-${r.zone}">Z${r.zone}</span>`},
            {key:'eventKey', label:'Event'},
            {key:'place',    label:'Place'},
            {key:'score',    label:'Score', fmt:fmtScore},
          ]) : '<div class="an-empty">No HPS athletes at Zones match filters.</div>'}
        </div>

        <div class="an-section-card">
          <div class="an-card-title">YMCA champions (E/W/C pre-qual)</div>
          ${kpiRow([
            {label:'YMCA champions', value: d.zoneRows.filter(r=>r.ymca).length, sub:'all appear at zones'},
            {label:'At Zones (ND)',  value: d.ymcaZone.length, sub:'non-displacing'},
            {label:'Registered EWC', value: EWC ? EWC.entries.filter(e =>
              (window.USAD_JO_NAT_QUALIFIERS?.hpsPrequalFemale||[]).concat(window.USAD_JO_NAT_QUALIFIERS?.hpsPrequalMale||[])
              .some(h => norm(h.name) === norm(e.name))
            ).length : '?', sub:'of YMCA athletes'},
          ], 'compact')}
          <div class="an-card-sub-title">YMCA athletes at Zones</div>
          ${d.zoneRows.filter(r=>r.ymca).length ? athleteTable(d.zoneRows.filter(r=>r.ymca), 'ymca-zone', [
            {key:'athlete',  label:'Athlete'},
            {key:'ageGroup', label:'Group'},
            {key:'zone',     label:'Zone', render: r=>`<span class="zone-badge zone-${r.zone}">Z${r.zone}</span>`},
            {key:'eventKey', label:'Event'},
            {key:'place',    label:'Place'},
            {key:'score',    label:'Score', fmt:fmtScore},
            {key:'qualificationStatus', label:'Status', trunc:30},
          ]) : '<div class="an-empty">No YMCA athletes match filters.</div>'}
        </div>

      </div>`;
  }

  /* ── Tab 3: Displacement & bump-ins ───────────────────────── */
  function renderDisplacementTab(d) {
    return `
      <div class="an-section-title">Where non-displacing athletes opened spots and caused bump-ins</div>
      ${kpiRow([
        {label:'Non-displacing at Zones', value: d.ndZone.length, sub:'total ND athletes'},
        {label:'Spots opened (Regionals)', value: d.openedReg.length, sub:'by ND athletes'},
        {label:'Bump-ins (Regionals)',     value: d.bumpedReg.length, accent: d.bumpedReg.length ? 'green' : '', sub:'athletes moved up'},
        {label:'Spots opened (Zones)',     value: d.openedZone.length, sub:'by ND athletes'},
      ])}

      ${d.bumpedReg.length ? `
        <div class="an-card-sub-title">Regionals bump-ins — athletes who advanced due to non-displacing athletes ahead</div>
        ${athleteTable(d.bumpedReg, 'bumped-reg', [
          {key:'athlete',  label:'Athlete bumped in'},
          {key:'team',     label:'Team'},
          {key:'ageGroup', label:'Group'},
          {key:'zone',     label:'Zone', render: r=>`<span class="zone-badge zone-${r.zone}">Z${r.zone}</span>`},
          {key:'eventKey', label:'Event'},
          {key:'place',    label:'Actual place'},
          {key:'countingRank', label:'Counting rank'},
          {key:'score',    label:'Score', fmt:fmtScore},
          {key:'bumpedBy', label:'Bumped in by', render: r =>
            (r.bumpedBy||[]).map(b=>`<div style="font-size:10px">${esc(b.athlete)}</div>`).join('') || '—'},
        ])}` : ''}

      ${d.openedReg.length ? `
        <div class="an-card-sub-title" style="margin-top:20px">Non-displacing athletes who opened spots at Regionals</div>
        ${athleteTable(d.openedReg, 'opened-reg', [
          {key:'athlete',  label:'ND athlete'},
          {key:'team',     label:'Team'},
          {key:'ageGroup', label:'Group'},
          {key:'zone',     label:'Zone', render: r=>`<span class="zone-badge zone-${r.zone}">Z${r.zone}</span>`},
          {key:'eventKey', label:'Event'},
          {key:'place',    label:'Place'},
          {key:'nonDisplacingReason', label:'ND reason', trunc:30},
          {key:'openedFor', label:'Spot opened for', render: r =>
            (r.openedFor||[]).map(b=>`<div style="font-size:10px">${esc(b.athlete)}</div>`).join('') || '—'},
        ])}` : ''}

      ${d.ndZone.length ? `
        <div class="an-card-sub-title" style="margin-top:20px">All non-displacing athletes at Zones by category</div>
        <div class="an-nd-grid">
          ${renderNDGroupCard('Foreign', d.foreignZone, 'red')}
          ${renderNDGroupCard('HPS',     d.hpsZone,    'amber')}
          ${renderNDGroupCard('Dual (affects results)', d.dualZone, 'blue')}
        </div>` : ''}`;
  }

  function renderNDGroupCard(title, rows, accent) {
    if (!rows.length) return '';
    const byZone = {};
    rows.forEach(r => { byZone[r.zone] = (byZone[r.zone]||0)+1; });
    return `<div class="an-nd-card an-nd-${accent}">
      <div class="an-nd-title">${esc(title)}</div>
      <div class="an-nd-count">${rows.length}</div>
      <div class="an-nd-zones">
        ${Object.entries(byZone).sort().map(([z,n])=>`<span class="zone-badge zone-${z}">Z${z}: ${n}</span>`).join(' ')}
      </div>
      <div class="an-nd-names">
        ${[...new Set(rows.map(r=>r.athlete))].slice(0,8).map(n=>`<div class="an-nd-name">${esc(n)}</div>`).join('')}
        ${[...new Set(rows.map(r=>r.athlete))].length > 8 ? `<div class="an-nd-name an-nd-more">+${[...new Set(rows.map(r=>r.athlete))].length-8} more</div>` : ''}
      </div>
    </div>`;
  }

  /* ── Shared table renderer ─────────────────────────────────── */
  function athleteTable(rows, id, cols) {
    if (!rows.length) return '<div class="an-empty">No data.</div>';
    // Deduplicate by athlete+event
    const seen = new Set();
    const deduped = rows.filter(r => {
      const k = `${r.athlete}|${r.eventId||r.eventKey}`;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });

    const thead = `<thead><tr>${cols.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead>`;
    const tbody = deduped.map(r => `<tr>${cols.map(c => {
      if (c.render) return `<td>${c.render(r)}</td>`;
      const v = r[c.key];
      const s = c.fmt ? c.fmt(v) : String(v == null ? '—' : v);
      const display = c.trunc && s.length > c.trunc ? s.slice(0, c.trunc)+'…' : s;
      if (c.key === 'athlete') {
        return `<td><div class="an-ath-name">${esc(r.athlete)}</div>${r.diveMeetsId?`<div class="an-ath-id">${esc(r.diveMeetsId)}</div>`:''}</td>`;
      }
      return `<td>${esc(display)}</td>`;
    }).join('')}</tr>`).join('');

    return `<div class="an-table-wrap">
      <div class="an-table-count">${deduped.length} rows</div>
      <div style="overflow-x:auto">
        <table class="an-table"><${thead}<tbody>${tbody}</tbody></table>
      </div>
    </div>`;
  }

  /* ── KPI row ───────────────────────────────────────────────── */
  function kpiRow(cards, style) {
    return `<div class="an-kpi-row${style==='compact'?' an-kpi-compact':''}">
      ${cards.map(k=>`<div class="an-kpi${k.accent?' an-kpi-'+k.accent:''}">
        <div class="an-kpi-val">${typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</div>
        <div class="an-kpi-label">${esc(k.label)}</div>
        ${k.sub?`<div class="an-kpi-sub">${esc(k.sub)}</div>`:''}
      </div>`).join('')}
    </div>`;
  }

  /* ── CSS ───────────────────────────────────────────────────── */
  function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
.an-shell{display:flex;flex-direction:column;min-height:400px}
.an-filters{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;border-bottom:0.5px solid var(--line);align-items:flex-end}
.an-filter{display:flex;flex-direction:column;gap:3px}
.an-filter-label{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3)}
.an-search-input{height:28px;padding:0 8px;font-size:12px;border-radius:var(--radius-sm);border:0.5px solid var(--line)}
.an-clear-btn{align-self:flex-end;padding:4px 10px;font-size:11px;border-radius:var(--radius-sm);border:0.5px solid var(--line);background:var(--surface-2);cursor:pointer;color:var(--ink-2)}
.an-tabs{display:flex;gap:0;border-bottom:0.5px solid var(--line);padding:0 16px}
.an-tab{padding:8px 16px;font-size:12px;font-weight:500;border:none;background:transparent;cursor:pointer;color:var(--ink-3);border-bottom:2px solid transparent;margin-bottom:-0.5px}
.an-tab:hover{color:var(--ink)}
.an-tab.active{color:var(--pool);border-bottom-color:var(--pool)}
.an-body{padding:16px;overflow-y:auto}
.an-section-title{font-size:12px;font-weight:500;color:var(--ink-2);margin:0 0 12px;padding-bottom:6px;border-bottom:0.5px solid var(--line-2)}
.an-card-sub-title{font-size:11px;font-weight:500;color:var(--ink-3);margin:14px 0 6px;text-transform:uppercase;letter-spacing:.04em}
.an-kpi-row{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}
.an-kpi-compact .an-kpi{flex:1;min-width:100px}
.an-kpi{flex:1;min-width:120px;background:var(--surface-2);border-radius:var(--radius);padding:10px 12px;border:0.5px solid var(--line-2)}
.an-kpi-val{font-size:22px;font-weight:500;font-family:var(--f-mono);color:var(--ink)}
.an-kpi-label{font-size:11px;color:var(--ink-3);margin-top:2px}
.an-kpi-sub{font-size:10px;color:var(--ink-4);margin-top:2px}
.an-kpi-green .an-kpi-val{color:#047857}
.an-kpi-amber .an-kpi-val{color:#b45309}
.an-kpi-red .an-kpi-val{color:var(--red)}
.an-kpi-blue .an-kpi-val{color:var(--pool)}
.an-table-wrap{margin-bottom:16px}
.an-table-count{font-size:10px;color:var(--ink-4);margin-bottom:4px}
.an-table{width:100%;border-collapse:collapse;font-size:12px}
.an-table th{background:var(--surface-2);padding:6px 8px;text-align:left;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3);border-bottom:0.5px solid var(--line);white-space:nowrap}
.an-table td{padding:6px 8px;border-bottom:0.5px solid var(--line-2);vertical-align:middle;color:var(--ink-2)}
.an-table tr:last-child td{border-bottom:none}
.an-table tr:hover td{background:var(--surface-2)}
.an-ath-name{font-weight:500;color:var(--ink)}
.an-ath-id{font-size:10px;color:var(--ink-4);font-family:var(--f-mono)}
.an-empty{font-size:12px;color:var(--ink-4);padding:16px;text-align:center;background:var(--surface-2);border-radius:var(--radius);border:0.5px dashed var(--line)}
.an-section-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}
.an-section-card{background:var(--surface);border:0.5px solid var(--line);border-radius:var(--radius-md);padding:14px}
.an-card-title{font-size:13px;font-weight:500;color:var(--ink);margin-bottom:10px}
.zone-badge{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700}
.zone-A,.zone-B{background:#EEEDFE;color:#3C3489}
.zone-C,.zone-D{background:#E1F5EE;color:#085041}
.zone-E,.zone-F{background:#FAEEDA;color:#633806}
.an-nd-grid{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
.an-nd-card{flex:1;min-width:160px;border-radius:var(--radius-md);padding:12px 14px;border:0.5px solid}
.an-nd-red{background:#FCEBEB;border-color:#F09595}
.an-nd-amber{background:#FAEEDA;border-color:#EF9F27}
.an-nd-blue{background:#E6F1FB;border-color:#85B7EB}
.an-nd-title{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);margin-bottom:4px}
.an-nd-count{font-size:24px;font-weight:500;font-family:var(--f-mono);color:var(--ink);margin-bottom:6px}
.an-nd-zones{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.an-nd-name{font-size:11px;color:var(--ink-2);padding:1px 0}
.an-nd-more{color:var(--ink-4);font-style:italic}
.an-badge{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:500}
.an-badge-green{background:#EAF3DE;color:#3B6D11}
.an-badge-gray{background:var(--surface-3);color:var(--ink-3)}
`;
    document.head.appendChild(s);
  }

  /* ── Hook into main.js ─────────────────────────────────────── */
  function patchMain() {
    injectCSS();
    // Register as hook for Nationals stage
    window._qvRenderNat = renderAnalytics;
    // Also expose for direct calls
    window._anRender = renderAnalytics;
    console.log('[analytics] registered');
  }

  function waitForMain(cb, tries) {
    tries = tries || 0;
    if (typeof renderAll === 'function' && typeof state !== 'undefined') cb();
    else if (tries < 100) setTimeout(() => waitForMain(cb, tries + 1), 50);
  }

  waitForMain(patchMain);
})();
