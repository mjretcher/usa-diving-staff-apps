/* ================================================================
   reports-view.js — Junior Circuit Analytics & Reports
   ----------------------------------------------------------------
   Six analysis panels, all sharing one demographic filter bar
   (Age group · Gender · Discipline · Region · Zone · E/W/C · Team):

     1. Pipeline Flow        – overall stage-by-stage funnel
     2. Cohort Tracker       – follow a defined cohort across stages,
                               showing who advanced and who fell off
     3. Scoring Analysis     – score averages, ranges, distributions
                               by placement across selected events
     4. Participation Breakdowns – teams, multi-event athletes,
                               geographic spread, gender balance,
                               age × stage cross-tabs, and more
     5. Displacement Report  – non-displacing athletes and bump-ins
     6. Special Status       – foreign / dual / HPS / YMCA / petitions

   Data source: effectiveResults (post-recompute) + USAD_EWC_DATA +
                USAD_JO_NAT_QUALIFIERS.
   ================================================================ */
(function () {
  'use strict';

  /* ── Generic helpers ─────────────────────────────────────────── */
  // esc(), escJsAttr(), and norm() are defined globally in main.js (loads
  // first — see index.html's load order) and reused here rather than kept
  // as separate local copies, so a fix to any of them reaches every file.
  function $(id){ return document.getElementById(id); }
  function pct(n,d){ return d ? Math.round(100 * n / d) + '%' : '—'; }
  function fmtScore(v){ const n = Number(v); return Number.isFinite(n) ? n.toFixed(2) : '—'; }
  function fmtNum(n){ return Number.isFinite(n) ? n.toLocaleString() : '—'; }
  function unique(arr, keyFn){ const s = new Set(); const out=[]; for (const x of arr){ const k=keyFn(x); if (!s.has(k)){ s.add(k); out.push(x); } } return out; }
  function groupBy(arr, keyFn){ const m = new Map(); for (const x of arr){ const k = keyFn(x); if (!m.has(k)) m.set(k,[]); m.get(k).push(x); } return m; }
  function mean(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : NaN; }
  function median(arr){
    if (!arr.length) return NaN;
    const s = arr.slice().sort((a,b)=>a-b);
    const m = Math.floor(s.length/2);
    return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
  }
  function stddev(arr){
    if (arr.length < 2) return NaN;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((a,x)=>a + (x-m)*(x-m), 0) / (arr.length - 1));
  }

  /* ── Data accessors ──────────────────────────────────────────── */
  // Year-override layer: when user picks a year other than the current season's
  // static data, fetch that year from Neon and swap it in via _yearOverrideRows.
  // null = use original (static junior-data.js for current season).
  let _yearOverrideRows = null;
  let _yearOverrideEvents = null;
  const _yearDataCache = {};   // year -> { rows, events }
  // Seeded from app_meta.config.current_season_year by fetchAvailableYears().
  // The previous literal was never actually updated despite its comment, so a
  // new season would have silently kept treating 2026 as current.
  let _currentSeason = (window.JuniorEras ? window.JuniorEras.currentSeason() : 2026);

  function allResults(){
    if (_yearOverrideRows) return _yearOverrideRows;
    return typeof effectiveResults !== 'undefined' ? effectiveResults
      : (window.JUNIOR_RESULTS_DATA?.results || []);
  }
  function allEvents(){
    if (_yearOverrideEvents) return _yearOverrideEvents;
    return typeof effectiveEvents !== 'undefined' ? effectiveEvents
      : (window.JUNIOR_RESULTS_DATA?.events || []);
  }
  function natQualifiers(){ return window.USAD_JO_NAT_QUALIFIERS?.qualifiers || []; }
  function ewcEntries(){ return window.USAD_EWC_DATA?.entries || []; }
  function ewcHps(){ return window.USAD_EWC_DATA?.hpsAthletes || []; }
  function ewcForeign(){ return window.USAD_EWC_DATA?.foreignAthletes || []; }
  function ewcDual(){ return window.USAD_EWC_DATA?.dualCitizens || []; }
  function oqz(){ return window.JUNIOR_RESULTS_DATA?.officialZoneQualifiers || []; }

  /* Groups A/B come from Regionals; C/D skip to Zones */
  const GROUPS_REQ_REG = new Set(['Group A','Group B']);

  /* The season the in-app registration files describe. Read from their own
     metadata rather than hard-coded, so replacing the files for a new season
     moves this with them instead of leaving a stale year literal behind —
     which is exactly how the Nationals "event has not occurred" text survived
     past the meet. */
  function currentRegSeason() {
    var srcs = [window.USAD_JO_NAT_QUALIFIERS, window.USAD_EWC_DATA];
    for (var i = 0; i < srcs.length; i++) {
      var t = srcs[i] && srcs[i].meta && (srcs[i].meta.title || srcs[i].meta.generatedAt);
      var m = String(t || '').match(/\b(20\d\d)\b/);
      if (m) return Number(m[1]);
    }
    return null;
  }
  const GROUPS_DIRECT_Z = new Set(['Group C','Group D']);

  /* ── Filter state ────────────────────────────────────────────── */
  const rptState = {
    panel:      'flow',     // flow|cohort|scoring|breakdowns|displacement|status

    // Shared demographic filters
    ageGroup:   '',
    gender:     '',
    discipline: '',
    region:     '',
    zone:       '',
    ewc:        '',
    team:       '',

    // Cohort panel
    cohortStart: 'auto',    // auto = Regionals for A/B, Zones for C/D
    cohortPath:  'any',     // any = either path counted
    cohortBreakBy: 'none',  // none | ageGroup | gender | region | zone | ewc | team — slice comparison

    // Drill provenance grouping (used inside drill-down panel)
    drillGroupBy: 'region',  // ageGroup | gender | region | zone | ewc | team

    // Scoring panel
    scoringStage:  'Zones',
    scoringPlaces: '1-3',   // 1, 1-3, 1-5, 1-15, 1-18, all
    scoringEventScope: 'auto', // auto | by-zone | by-region | grand

    // Breakdowns panel
    breakdownView: 'teams', // teams | multievent | geo | matrix | zonestrength | gender
  };

  /* Sync filters with main app's state where possible */
  function pullMainFilters(){
    try {
      if (typeof state !== 'undefined') {
        if (state.ageGroup && !rptState.ageGroup)   rptState.ageGroup   = state.ageGroup;
        if (state.gender   && !rptState.gender)     rptState.gender     = state.gender;
        if (state.discipline && !rptState.discipline) rptState.discipline = state.discipline;
        if (state.zone     && !rptState.zone)       rptState.zone       = state.zone;
      }
    } catch (_e) {}
  }

  /* ── Filter matcher ──────────────────────────────────────────── */
  function rowMatchesFilters(r){
    if (rptState.ageGroup   && r.ageGroup   !== rptState.ageGroup)   return false;
    if (rptState.gender     && r.gender     !== rptState.gender)     return false;
    if (rptState.discipline && r.discipline !== rptState.discipline) return false;
    if (rptState.region     && String(r.region) !== String(rptState.region)) return false;
    if (rptState.zone       && r.zone       !== rptState.zone)       return false;
    if (rptState.ewc        && r.ewc        !== rptState.ewc)        return false;
    if (rptState.team       && r.team       !== rptState.team)       return false;
    return true;
  }
  function activeFilterCount(){
    let n = 0;
    ['ageGroup','gender','discipline','region','zone','ewc','team']
      .forEach(k => { if (rptState[k]) n++; });
    return n;
  }
  function activeFilterDescription(){
    const bits = [];
    if (rptState.ageGroup)   bits.push(rptState.ageGroup);
    if (rptState.gender)     bits.push(rptState.gender);
    if (rptState.discipline) bits.push(rptState.discipline);
    if (rptState.region)     bits.push('Region '+rptState.region);
    if (rptState.zone)       bits.push('Zone '+rptState.zone);
    if (rptState.ewc)        bits.push(rptState.ewc);
    if (rptState.team)       bits.push('Team: '+rptState.team);
    return bits.join(' · ') || 'All athletes';
  }

  /* Athlete-level: does any of this athlete's rows match the filters?
     Used when we need a per-athlete view that shouldn't drop the
     athlete just because one of their events doesn't match. */
  function athleteRowsMatching(athleteKey, allRows){
    return allRows.filter(r => r.athlete === athleteKey && rowMatchesFilters(r));
  }

  /* ── Stage helpers ───────────────────────────────────────────── */
  function isRegional(r){ return r.stage === 'Regionals'; }
  function isZone(r){ return r.stage === 'Zones'; }
  function isEwc(r){ return r.stage === 'EWC' || r.stage === 'East/West/Central' || r.stage === 'E/W/C'; }

  /* Set of athletes appearing at EWC (from registrations until results
     are scraped). Athlete key = lowercased name. */
  function ewcRegisteredKeys(){
    return new Set(ewcEntries().map(e => norm(e.name)));
  }
  function natQualifierKeys(){
    return new Set(natQualifiers().map(q => norm(q.name)));
  }

  /* ====================================================================
     PANEL 1 · PIPELINE FLOW
     -------------------------------------------------------------------
     Standard top-line funnel respecting active filters. Shows each stage
     side-by-side with athletes, entries, qualifiers out, drop-offs.
     ==================================================================== */
  function buildFlowData(){
    const all = allResults();
    const synth = new Set(['synthetic_from_oqz']);

    const reg = all.filter(r => isRegional(r) && rowMatchesFilters(r));
    const zon = all.filter(r => isZone(r) && !synth.has(r.sourceRow) && rowMatchesFilters(r));
    const zon_synth = all.filter(r => isZone(r) && synth.has(r.sourceRow) && rowMatchesFilters(r));

    /* Regionals — A/B only, but C/D are filtered out of regionals by data */
    const reg_athletes      = new Set(reg.map(r => r.athlete.toLowerCase()));
    const reg_qualifying    = new Set(reg.filter(r => r.advancesToZone).map(r => r.athlete.toLowerCase()));
    /* Bumps & spot shifts at regionals */
    const reg_bumps         = reg.filter(r => r.bumpIn).length;
    const reg_shifts        = reg.filter(r => r.spotShifted).length;

    /* Zones */
    const zon_total         = zon.length + zon_synth.length;
    const zon_athletes      = new Set(zon.map(r => r.athlete.toLowerCase()));
    const zon_cd_athletes   = new Set(zon.filter(r => GROUPS_DIRECT_Z.has(r.ageGroup)).map(r => r.athlete.toLowerCase()));
    const zon_to_nat        = new Set(zon.filter(r => r.advancesToNationals).map(r => r.athlete.toLowerCase()));
    const zon_to_ewc        = new Set(zon.filter(r => r.advancesToEWC && !r.advancesToNationals).map(r => r.athlete.toLowerCase()));
    const zon_to_nat_entries = zon.filter(r => r.advancesToNationals).length;
    const zon_to_ewc_entries = zon.filter(r => r.advancesToEWC).length;
    const zon_bumps         = zon.filter(r => r.bumpIn).length;
    const zon_shifts        = zon.filter(r => r.spotShifted).length;

    /* No-shows: regional qualifier athletes who did not appear at zones */
    const oqz_names = new Set(oqz().map(q => q.athlete.toLowerCase()));
    const reg_noshows = [...reg_qualifying].filter(n =>
      !zon_athletes.has(n) && !oqz_names.has(n));

    /* E/W/C registrations matching the filter (best effort — EWC entries
       only have name+meet+events, no age/gender — so the filter applies
       to the matched name's known status from results). */
    const ewcRegKeys = ewcRegisteredKeys();
    const natKeys    = natQualifierKeys();
    /* athletes who advanced to EWC but did not register */
    const zon_ewc_noshow_keys = [...zon_to_ewc].filter(n => !ewcRegKeys.has(n));
    /* athletes who advanced directly to nationals but not on JO Nat list */
    const zon_nat_noshow_keys = [...zon_to_nat].filter(n => !natKeys.has(n));

    /* If a demographic filter is on, restrict EWC counts to athletes
       known via results to match it */
    let ewcMatchedKeys = ewcRegKeys;
    if (activeFilterCount() > 0) {
      const okFromResults = new Set();
      all.forEach(r => {
        if (rowMatchesFilters(r)) okFromResults.add(r.athlete.toLowerCase());
      });
      ewcMatchedKeys = new Set([...ewcRegKeys].filter(k => okFromResults.has(k)));
    }

    /* Nationals matched */
    let natMatchedKeys = natKeys;
    if (activeFilterCount() > 0) {
      const okFromResults = new Set();
      all.forEach(r => {
        if (rowMatchesFilters(r)) okFromResults.add(r.athlete.toLowerCase());
      });
      natMatchedKeys = new Set([...natKeys].filter(k => okFromResults.has(k)));
    }

    return {
      regionals: {
        entries:    reg.length,
        athletes:   reg_athletes.size,
        qualifying: reg_qualifying.size,
        bumps:      reg_bumps,
        shifts:     reg_shifts,
        noshows:    reg_noshows,
      },
      zones: {
        entries:        zon_total,
        athletes:       zon_athletes.size,
        cdDirect:       zon_cd_athletes.size,
        toNationals:    zon_to_nat.size,
        toEWC:          zon_to_ewc.size,
        toNationalsEnt: zon_to_nat_entries,
        toEWCEnt:       zon_to_ewc_entries,
        bumps:          zon_bumps,
        shifts:         zon_shifts,
        ewcNoshow:      zon_ewc_noshow_keys.length,
        natNoshow:      zon_nat_noshow_keys.length,
      },
      ewc: {
        registered: ewcMatchedKeys.size,
        totalAll:   ewcRegKeys.size,
        entries:    window.USAD_EWC_DATA?.totalEntries || 0,
      },
      nationals: {
        qualified: natMatchedKeys.size,
        totalAll:  natKeys.size,
      },
    };
  }

  function renderFlowPanel(wrap){
    const d = buildFlowData();
    const filtered = activeFilterCount() > 0;
    const desc = activeFilterDescription();

    const statChips = (stats) => `<div class="pf-detail">${stats.map(s => `
        <div class="pf-stat ${s.accent ? 'pf-acc-'+s.accent : ''}">
          <span class="pf-stat-v">${typeof s.val === 'number' ? fmtNum(s.val) : esc(String(s.val))}</span>
          <span class="pf-stat-l">${esc(s.label)}</span>
          ${s.note ? `<span class="pf-stat-n">${esc(s.note)}</span>` : ''}
        </div>`).join('')}</div>`;

    const FLOW = [
      { cls:'s0', icon:'R', title:'Region Championships', sub:'Groups A/B entry point', kpiLabel:'Region entries', val:d.regionals.entries, tag:'entries', stats:[
        {label:'Entries', val: d.regionals.entries, note: GROUPS_REQ_REG.has(rptState.ageGroup) || !rptState.ageGroup ? 'Groups A/B path' : 'Filtered group does not pass through Regionals' },
        {label:'Unique athletes', val: d.regionals.athletes},
        {label:'Qualified to Zones', val: d.regionals.qualifying, accent:'green'},
        {label:'Bumps · spot shifts', val: `${d.regionals.bumps} · ${d.regionals.shifts}`},
        {label:'Qualified — did not compete at Zones', val: d.regionals.noshows.length, accent: d.regionals.noshows.length > 0 ? 'amber' : ''},
      ]},
      { cls:'s1', icon:'Z', title:'Zone Championships', sub:'Four zone sites', kpiLabel:'Zone entries', val:d.zones.entries, tag:'divers', stats:[
        {label:'Entries', val: d.zones.entries},
        {label:'Unique athletes', val: d.zones.athletes},
        {label:'Groups C/D direct entrants', val: d.zones.cdDirect, note:'Skip Regionals'},
        {label:'→ Nationals (direct)', val: d.zones.toNationals, accent:'green', note:`${d.zones.toNationalsEnt} entry slots`},
        {label:'→ E/W/C', val: d.zones.toEWC, accent:'blue', note:`${d.zones.toEWCEnt} entry slots`},
        {label:'Bumps · spot shifts', val: `${d.zones.bumps} · ${d.zones.shifts}`},
        {label:'EWC qual — did not register', val: d.zones.ewcNoshow, accent: d.zones.ewcNoshow > 0 ? 'amber' : ''},
      ]},
      { cls:'s2', icon:'E', title:'East / West / Central', sub:'Three regional finals', kpiLabel:'E/W/C registered', val:d.ewc.registered, tag:'registered', stats:[
        {label:'Registered athletes', val: d.ewc.registered, accent:'blue', note: filtered ? `of ${d.ewc.totalAll} total` : ''},
        {label:'Total event entries', val: d.ewc.entries || '—', note:'Across all 3 meets'},
        {label:'HPS pre-qualified', val: ewcHps().length, note:'Bypass E/W/C — direct to Nat prelims'},
        {label:'Foreign at E/W/C', val: ewcForeign().length, note:'Non-displacing'},
      ]},
      { cls:'s3', icon:'N', title:'Junior Nationals', sub:'National championship', kpiLabel:'On National list', val:d.nationals.qualified, tag:'qualified', stats:[
        {label:'Qualified athletes', val: d.nationals.qualified, accent:'green', note: filtered ? `of ${d.nationals.totalAll} total` : ''},
        {label:'Direct from Zones', val: d.zones.toNationals, note:'Top 3 per zone event'},
        {label:'Via E/W/C', val: 'Pending', note:'Results not yet loaded'},
      ]},
    ];
    const _vals = FLOW.map(f => Number(f.val) || 0);
    const _denom = Math.max(1, ..._vals);
    const _first = _vals[0] || 0;
    const kpiHtml = FLOW.map((f,i) => {
      const v = _vals[i];
      const delta = i === 0
        ? '<span class="pf-kpi-d flat">Starting field</span>'
        : `<span class="pf-kpi-d up">${_vals[i-1] ? Math.round(v / _vals[i-1] * 100) : 0}% of prev stage</span>`;
      return `<div class="pf-kpi k${i}"><div class="pf-kpi-n">${fmtNum(v)}</div><div class="pf-kpi-l">${esc(f.kpiLabel)}</div>${delta}</div>`;
    }).join('');
    const funnelHtml = FLOW.map((f,i) => {
      const v = _vals[i];
      const w = Math.max(7, Math.round(v / _denom * 100));
      const pctField = _first ? Math.round(v / _first * 100) : 0;
      let conn = '';
      if (i < FLOW.length - 1){
        const nv = _vals[i+1], conv = v ? Math.round(nv / v * 100) : 0, drop = Math.max(0, v - nv);
        conn = `<div class="pf-connector"><div class="pf-connector-rail"><i></i></div><div class="pf-conv"><span class="pf-conv-chip">▲ ${conv}% advanced</span>${drop > 0 ? `<span class="pf-drop-chip">−${fmtNum(drop)} did not continue</span>` : ''}</div></div>`;
      }
      return `<div class="pf-stage ${f.cls}">
          <div class="pf-stage-id"><span class="pf-step">${esc(f.icon)}</span><div><div class="pf-stage-name">${esc(f.title)}</div><div class="pf-stage-sub">${esc(f.sub)}</div></div></div>
          <div class="pf-track"><div class="pf-fill" style="width:${w}%"><span class="pf-fill-n">${fmtNum(v)}</span><span class="pf-fill-tag">${esc(f.tag)}</span></div></div>
          <div class="pf-pct">${pctField}%<small>of field</small></div>
        </div>${statChips(f.stats)}${conn}`;
    }).join('');

    wrap.innerHTML = `
      ${filtered ? `<div class="rpt-filter-note">
          <strong>Filtered view:</strong> ${esc(desc)} —
          counts below reflect only matching athletes and events.
        </div>` : ''}
      <div class="rpt-section">
        <div class="rpt-section-title">
          Circuit participation flow
          <button class="rpt-export-btn" onclick="window._rptExportFlow()">Download CSV</button>
        </div>

        <div class="pf-kpis">${kpiHtml}</div>
        <div class="pf-funnel">${funnelHtml}</div>

        ${d.regionals.noshows.length > 0 ? `
        <div class="rpt-subsection">
          <div class="rpt-subsection-title">
            Regional qualifiers who did not compete at Zones
            <span class="rpt-pill">${d.regionals.noshows.length}</span>
          </div>
          ${buildNoshowTable(d.regionals.noshows)}
        </div>` : ''}
      </div>`;
  }

  function buildNoshowTable(noshowLowerNames){
    const all = allResults();
    const rows = noshowLowerNames.map(n => {
      const regRows = all.filter(r => isRegional(r) && r.athlete.toLowerCase() === n);
      const r = regRows[0]; if (!r) return '';
      const events = [...new Set(regRows.filter(x => x.advancesToZone).map(x => x.eventKey))].join(', ');
      return `<tr>
        <td class="r-name">${esc(r.athlete)}</td>
        <td>${esc(r.team || '—')}</td>
        <td>${esc(r.ageGroup||'')} ${esc(r.gender||'')}</td>
        <td>R${esc(String(r.region||'?'))} · Z${esc(r.zone||'?')}</td>
        <td>${esc(events || '—')}</td>
        <td><span class="badge badge-amber">Did not compete</span></td>
      </tr>`;
    }).filter(Boolean);
    return `<table class="rpt-table"><thead><tr>
      <th>Athlete</th><th>Team</th><th>Group</th><th>Region · Zone</th><th>Qualified events</th><th>Status</th>
    </tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }

  window._rptExportFlow = function(){
    const d = buildFlowData();
    const lines = [
      'Stage,Metric,Value',
      `Regionals,Entries,${d.regionals.entries}`,
      `Regionals,Unique athletes,${d.regionals.athletes}`,
      `Regionals,Qualified to Zones,${d.regionals.qualifying}`,
      `Regionals,Bumps,${d.regionals.bumps}`,
      `Regionals,Spot shifts,${d.regionals.shifts}`,
      `Regionals,Did not compete at Zones,${d.regionals.noshows.length}`,
      `Zones,Entries,${d.zones.entries}`,
      `Zones,Unique athletes,${d.zones.athletes}`,
      `Zones,Group C/D direct,${d.zones.cdDirect}`,
      `Zones,→ Nationals (direct athletes),${d.zones.toNationals}`,
      `Zones,→ Nationals (entry slots),${d.zones.toNationalsEnt}`,
      `Zones,→ E/W/C (athletes),${d.zones.toEWC}`,
      `Zones,→ E/W/C (entry slots),${d.zones.toEWCEnt}`,
      `Zones,Bumps,${d.zones.bumps}`,
      `Zones,Spot shifts,${d.zones.shifts}`,
      `Zones,EWC qualifier did not register,${d.zones.ewcNoshow}`,
      `E/W/C,Registered athletes,${d.ewc.registered}`,
      `E/W/C,Total entries,${d.ewc.entries}`,
      `Nationals,Qualified athletes,${d.nationals.qualified}`,
    ];
    downloadCSV(lines.join('\n'), 'pipeline-flow.csv');
  };

  /* ====================================================================
     PANEL 2 · COHORT TRACKER
     -------------------------------------------------------------------
     Define a cohort (the current filter), then track every athlete in
     that cohort through every stage. Each athlete gets a final outcome
     (Made Nationals / At E/W/C / Stuck at Zones / Drop after Regionals
     / Never advanced). Includes named drop-off lists.
     ==================================================================== */
  function buildCohortData(){
    const all = allResults();
    const synth = new Set(['synthetic_from_oqz']);

    /* Decide the entry stage automatically */
    let entryStage = rptState.cohortStart;
    if (entryStage === 'auto') {
      entryStage = rptState.ageGroup && GROUPS_DIRECT_Z.has(rptState.ageGroup)
        ? 'Zones'
        : (rptState.ageGroup && GROUPS_REQ_REG.has(rptState.ageGroup)
            ? 'Regionals'
            : 'Regionals');
    }

    /* Build per-athlete records keyed by lowercased name. Each record
       tracks every event they appear in across the filter, plus their
       reached stage and outcome. */
    const byAthlete = new Map();
    function ensure(name, sample){
      const k = name.toLowerCase();
      if (!byAthlete.has(k)) {
        byAthlete.set(k, {
          key: k,
          name: sample.athlete,
          diveMeetsId: sample.diveMeetsId || '',
          team: sample.team || '',
          ageGroup: sample.ageGroup || '',
          gender: sample.gender || '',
          regions: new Set(),
          zones: new Set(),
          ewc: sample.ewc || '',
          regEvents: [],
          zonEvents: [],
          qualifiedToZone: false,
          qualifiedToEWC: false,
          qualifiedToNationals: false,
          nonDisplacingAt: new Set(),
          hps: false, ymca: false, foreign: false, dual: false,
          atEWCRegistered: false,
          atNationals: false,
        });
      }
      return byAthlete.get(k);
    }

    all.forEach(r => {
      if (!rowMatchesFilters(r)) return;
      const a = ensure(r.athlete, r);
      if (r.team && !a.team) a.team = r.team;
      if (r.region) a.regions.add(r.region);
      if (r.zone) a.zones.add(r.zone);
      if (r.ewc && !a.ewc) a.ewc = r.ewc;

      if (isRegional(r)) {
        a.regEvents.push({
          key: r.eventKey, place: r.place, score: r.score,
          advancesToZone: !!r.advancesToZone, qualStatus: r.qualificationStatus,
        });
        if (r.advancesToZone) a.qualifiedToZone = true;
      }
      else if (isZone(r) && !synth.has(r.sourceRow)) {
        a.zonEvents.push({
          key: r.eventKey, place: r.place, score: r.score,
          advancesToNationals: !!r.advancesToNationals,
          advancesToEWC: !!r.advancesToEWC,
          qualStatus: r.qualificationStatus,
          openedSpot: !!r.openedSpot, bumpIn: !!r.bumpIn,
        });
        if (r.advancesToNationals) a.qualifiedToNationals = true;
        if (r.advancesToEWC) a.qualifiedToEWC = true;
      }

      if (r.nonDisplacing) a.nonDisplacingAt.add(r.stage);
      if (r.hps) a.hps = true;
      if (r.ymca) a.ymca = true;
      if (r.foreignDeclared || r.webpointNonUsEffective) a.foreign = true;
      if (r.dualDeclared || r.dualOtherCountry) a.dual = true;
    });

    /* Athletes coming in directly to Zones via OQZ (no regional results)
       Add them to the cohort even though no regional row exists */
    if (entryStage === 'Zones' || !rptState.ageGroup || GROUPS_DIRECT_Z.has(rptState.ageGroup)) {
      oqz().forEach(q => {
        const ag = q.ageGroup || ''; const gd = q.gender || '';
        if (rptState.ageGroup && ag !== rptState.ageGroup) return;
        if (rptState.gender && gd !== rptState.gender) return;
        if (rptState.zone && q.zone && q.zone !== rptState.zone) return;
        const k = (q.athlete||'').toLowerCase();
        if (!k) return;
        if (!byAthlete.has(k)) {
          byAthlete.set(k, {
            key:k, name:q.athlete, diveMeetsId:q.diveMeetsId||'', team:q.team||'',
            ageGroup:ag, gender:gd, regions:new Set(), zones: q.zone ? new Set([q.zone]) : new Set(),
            ewc:'', regEvents:[], zonEvents:[],
            qualifiedToZone:true, qualifiedToEWC:false, qualifiedToNationals:false,
            nonDisplacingAt: new Set(), hps:false, ymca:false, foreign:false, dual:false,
            atEWCRegistered:false, atNationals:false,
          });
        }
      });
    }

    /* Flag E/W/C registration and Nationals qualification by name match */
    const ewcKeys = ewcRegisteredKeys();
    const natKeys = natQualifierKeys();
    byAthlete.forEach(a => {
      const nk = norm(a.name);
      if (ewcKeys.has(nk)) a.atEWCRegistered = true;
      if (natKeys.has(nk)) a.atNationals = true;
    });

    /* Outcome buckets for every cohort member */
    const buckets = {
      madeNationals_direct: [],   // qualified to Nat from zones
      madeNationals_viaEWC: [],   // on Nat list AND on EWC list AND not direct
      madeNationals_other:  [],   // on Nat list but no zone path (HPS, kept, etc)
      atEWC_notNat:         [],   // EWC registered, not on Nat list yet
      qualifiedEWC_noReg:   [],   // qualified to EWC but never registered
      atZones_outOfNat:     [],   // competed at zones but didn't qualify to Nat or EWC
      qualifiedRegOnly_DNS: [],   // regional qualifier but no zone appearance
      regionalsOnly_NoQual: [],   // competed at regionals, didn't qualify
      nonDisplacing_path:   [],   // foreign/dual/HPS/YMCA — separate logic
    };

    byAthlete.forEach(a => {
      /* Categorize non-displacing separately so users can see them */
      if (a.foreign || a.dual || a.hps || a.ymca) {
        buckets.nonDisplacing_path.push(a);
        /* Continue — they may still appear in another bucket too, but
           for the headline outcome we treat ND as its own track */
        return;
      }

      if (a.qualifiedToNationals)        buckets.madeNationals_direct.push(a);
      else if (a.atNationals && a.atEWCRegistered) buckets.madeNationals_viaEWC.push(a);
      else if (a.atNationals)            buckets.madeNationals_other.push(a);
      else if (a.atEWCRegistered)        buckets.atEWC_notNat.push(a);
      else if (a.qualifiedToEWC)         buckets.qualifiedEWC_noReg.push(a);
      else if (a.zonEvents.length > 0)   buckets.atZones_outOfNat.push(a);
      else if (a.qualifiedToZone)        buckets.qualifiedRegOnly_DNS.push(a);
      else if (a.regEvents.length > 0)   buckets.regionalsOnly_NoQual.push(a);
    });

    return {
      entryStage,
      total: byAthlete.size,
      athletes: [...byAthlete.values()],
      buckets,
    };
  }

  /* ── Slice comparison (break funnel down by demographic) ─────────── */
  const SLICE_FIELDS = {
    none:      { label: 'None — combined funnel', getValue: (a) => null },
    ageGroup:  { label: 'Age group',  getValue: (a) => a.ageGroup || '(unknown)' },
    gender:    { label: 'Gender',     getValue: (a) => a.gender || '(unknown)' },
    region:    { label: 'Region',     getValue: (a) => { const r = [...a.regions][0]; return r ? 'Region ' + r : '(unknown)'; } },
    zone:      { label: 'Zone',       getValue: (a) => { const z = [...a.zones][0]; return z ? 'Zone ' + z : '(unknown)'; } },
    ewc:       { label: 'E/W/C',      getValue: (a) => a.ewc || '(unknown)' },
    team:      { label: 'Team',       getValue: (a) => a.team || '(unknown)' },
  };

  function buildSlicedCohort(d, sliceKey){
    if (!sliceKey || sliceKey === 'none') return null;
    const def = SLICE_FIELDS[sliceKey];
    if (!def) return null;
    const groups = new Map();
    d.athletes.forEach(a => {
      const v = def.getValue(a);
      if (!groups.has(v)) groups.set(v, []);
      groups.get(v).push(a);
    });
    const slices = [...groups.entries()].map(([value, athletes]) => {
      const reachedZones = athletes.filter(a => a.zonEvents.length > 0);
      const reachedEWC = athletes.filter(a => a.atEWCRegistered || a.qualifiedToEWC || a.qualifiedToNationals || a.atNationals);
      const madeNats = athletes.filter(a => a.atNationals);
      return {
        value,
        total: athletes.length,
        reachedZones: reachedZones.length,
        reachedEWC: reachedEWC.length,
        madeNats: madeNats.length,
        athletes,
      };
    });
    // Sort: known values first by natural sort, "(unknown)" last
    slices.sort((a, b) => {
      const aUnk = a.value === '(unknown)', bUnk = b.value === '(unknown)';
      if (aUnk && !bUnk) return 1;
      if (bUnk && !aUnk) return -1;
      return String(a.value).localeCompare(String(b.value), undefined, { numeric: true, sensitivity: 'base' });
    });
    return slices;
  }

  function renderSliceComparison(slices, total, sliceKey){
    const sliceLabel = SLICE_FIELDS[sliceKey].label;
    if (!slices.length) {
      return `<div class="rpt-empty">No data to break down by ${esc(sliceLabel)}.</div>`;
    }

    // Find max total in any slice for bar scaling
    const maxTotal = Math.max(...slices.map(s => s.total), 1);

    // Comparison table
    const tableRows = slices.map(s => {
      const ratio = (n) => s.total > 0 ? Math.round(n / s.total * 100) : 0;
      const sliceFilterKey = sliceKey === 'region' ? 'region' :
                             sliceKey === 'zone' ? 'zone' :
                             sliceKey;
      // Strip "Region " / "Zone " prefixes when applying as filter
      const rawValue = sliceKey === 'region' ? String(s.value).replace(/^Region\s+/, '') :
                       sliceKey === 'zone'   ? String(s.value).replace(/^Zone\s+/, '') :
                       s.value;
      return `<tr class="cf-slice-row" onclick="window._rptFilter('${sliceFilterKey}', '${escJsAttr(rawValue)}')">
        <td class="r-name"><strong>${esc(s.value)}</strong></td>
        <td class="mono"><strong>${fmtNum(s.total)}</strong></td>
        <td class="mono">${fmtNum(s.reachedZones)} <span class="cf-slice-pct">${ratio(s.reachedZones)}%</span></td>
        <td class="mono">${fmtNum(s.reachedEWC)} <span class="cf-slice-pct">${ratio(s.reachedEWC)}%</span></td>
        <td class="mono"><strong style="color:var(--q-direct)">${fmtNum(s.madeNats)}</strong> <span class="cf-slice-pct">${ratio(s.madeNats)}%</span></td>
        <td class="mono cf-slice-conv">${ratio(s.madeNats)}%</td>
      </tr>`;
    }).join('');

    // Mini-funnels grid (visual)
    const mini = slices.map(s => {
      const w0 = 100;
      const w1 = s.total > 0 ? Math.max(8, Math.round(s.reachedZones / s.total * 100)) : 0;
      const w2 = s.total > 0 ? Math.max(8, Math.round(s.reachedEWC / s.total * 100)) : 0;
      const w3 = s.total > 0 ? Math.max(4, Math.round(s.madeNats / s.total * 100)) : 0;
      const conv = s.total > 0 ? Math.round(s.madeNats / s.total * 100) : 0;
      const sliceFilterKey = sliceKey === 'region' || sliceKey === 'zone' ? sliceKey : sliceKey;
      const rawValue = sliceKey === 'region' ? String(s.value).replace(/^Region\s+/, '') :
                       sliceKey === 'zone'   ? String(s.value).replace(/^Zone\s+/, '') :
                       s.value;
      return `<div class="cf-mini" onclick="window._rptFilter('${sliceFilterKey}', '${escJsAttr(rawValue)}')">
        <div class="cf-mini-head">
          <span class="cf-mini-label">${esc(s.value)}</span>
          <span class="cf-mini-conv">${conv}% → Nat</span>
        </div>
        <div class="cf-mini-bars">
          <div class="cf-mini-bar cf-mb-0" style="width:${w0}%" title="Started: ${s.total}"><span>${s.total}</span></div>
          <div class="cf-mini-bar cf-mb-1" style="width:${w1}%" title="Reached Zones: ${s.reachedZones}"><span>${s.reachedZones}</span></div>
          <div class="cf-mini-bar cf-mb-2" style="width:${w2}%" title="Reached E/W/C: ${s.reachedEWC}"><span>${s.reachedEWC}</span></div>
          <div class="cf-mini-bar cf-mb-3" style="width:${w3}%" title="On Nat list: ${s.madeNats}"><span>${s.madeNats}</span></div>
        </div>
      </div>`;
    }).join('');

    return `
      <div class="rpt-h2">
        <span class="rpt-h2-l">Funnel by ${esc(sliceLabel.toLowerCase())}</span>
        <span class="rpt-h2-sub">Click any row or mini-funnel to filter the whole panel to that ${esc(sliceLabel.toLowerCase())}</span>
      </div>

      <div class="rpt-table-scroll">
        <table class="rpt-table cf-slice-table">
          <thead><tr>
            <th>${esc(sliceLabel)}</th><th class="mono">Started</th><th class="mono">Reached Zones</th><th class="mono">Reached E/W/C</th><th class="mono">On Nat list</th><th class="mono">Conversion</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
          <tfoot><tr>
            <td class="r-name"><strong>Combined total</strong></td>
            <td class="mono"><strong>${fmtNum(total)}</strong></td>
            <td class="mono">${fmtNum(slices.reduce((a,b)=>a+b.reachedZones,0))}</td>
            <td class="mono">${fmtNum(slices.reduce((a,b)=>a+b.reachedEWC,0))}</td>
            <td class="mono">${fmtNum(slices.reduce((a,b)=>a+b.madeNats,0))}</td>
            <td class="mono">${pct(slices.reduce((a,b)=>a+b.madeNats,0), total)}</td>
          </tr></tfoot>
        </table>
      </div>

      <div class="cf-mini-grid">${mini}</div>
    `;
  }

  /* ── Provenance breakdown (used inside drill-down panel) ─────────── */
  function buildProvenanceBuckets(athletes, sliceKey){
    const def = SLICE_FIELDS[sliceKey] || SLICE_FIELDS.region;
    const m = new Map();
    athletes.forEach(a => {
      const v = def.getValue(a);
      m.set(v, (m.get(v) || 0) + 1);
    });
    const arr = [...m.entries()].map(([value, count]) => ({ value, count }));
    arr.sort((a,b) => b.count - a.count || String(a.value).localeCompare(String(b.value), undefined, {numeric:true}));
    return arr;
  }

  function renderProvenanceCard(athletes, sliceKey, title){
    const buckets = buildProvenanceBuckets(athletes, sliceKey);
    const total = athletes.length || 1;
    const top = buckets.slice(0, 8);
    const max = Math.max(...top.map(b => b.count), 1);
    const rest = buckets.length - top.length;
    const restCount = buckets.slice(8).reduce((a,b)=>a+b.count, 0);

    return `<div class="cf-prov-card">
      <div class="cf-prov-head">${esc(title)}</div>
      <div class="cf-prov-rows">
        ${top.map(b => `
          <div class="cf-prov-row">
            <span class="cf-prov-val" title="${esc(b.value)}">${esc(b.value)}</span>
            <div class="cf-prov-bar-bg"><div class="cf-prov-bar" style="width:${Math.round(b.count/max*100)}%"></div></div>
            <span class="cf-prov-n">${b.count}</span>
            <span class="cf-prov-pct">${Math.round(b.count/total*100)}%</span>
          </div>`).join('')}
        ${rest > 0 ? `<div class="cf-prov-row cf-prov-row-rest"><span class="cf-prov-val">+ ${rest} more</span><span class="cf-prov-n">${restCount}</span><span class="cf-prov-pct">${Math.round(restCount/total*100)}%</span></div>` : ''}
      </div>
    </div>`;
  }

  function renderCohortPanel(wrap){
    const d = buildCohortData();
    const desc = activeFilterDescription();
    const total = d.total;

    if (total === 0) {
      wrap.innerHTML = `<div class="rpt-section">
        <div class="rpt-empty">
          <strong>No athletes match the current filters.</strong><br>
          <span style="font-size:12px">Try clearing some filter chips at the top of the page.</span>
        </div>
      </div>`;
      return;
    }

    const stages = buildFunnelStages(d);
    const drops  = buildFunnelDrops(stages);
    const outcomes = buildOutcomeCards(d);
    const drill = rptState._cohortDrill || null;
    const sliceKey = rptState.cohortBreakBy || 'none';
    const slices = buildSlicedCohort(d, sliceKey);

    const madeNats = stages[3].athletes.length;
    const droppedOff = total - madeNats;

    wrap.innerHTML = `<div class="rpt-section">

      ${slices ? `
      <!-- Compact hero strip when slicer is active (slice table shows the detail) -->
      <div class="cohort-hero-strip">
        <div class="cohort-hero-strip-grp">
          <span class="cohort-hero-strip-num">${fmtNum(total)}</span>
          <span class="cohort-hero-strip-l">athletes tracked</span>
        </div>
        <span class="cohort-hero-strip-sep"></span>
        <div class="cohort-hero-strip-grp">
          <span class="cohort-hero-strip-num good">${fmtNum(madeNats)}</span>
          <span class="cohort-hero-strip-l">made Nationals (${pct(madeNats, total)})</span>
        </div>
        <span class="cohort-hero-strip-sep"></span>
        <div class="cohort-hero-strip-grp">
          <span class="cohort-hero-strip-num neutral">${fmtNum(droppedOff)}</span>
          <span class="cohort-hero-strip-l">did not advance (${pct(droppedOff, total)})</span>
        </div>
        <span class="cohort-hero-strip-ctx">${esc(desc)} · entry stage: ${esc(d.entryStage)}</span>
      </div>
      ` : `
      <!-- Full hero (3 big blocks) when not slicing -->
      <div class="cohort-hero">
        <div class="cohort-hero-block primary">
          <div class="cohort-hero-eyebrow">Tracking this cohort</div>
          <div class="cohort-hero-num">${fmtNum(total)}</div>
          <div class="cohort-hero-l">athletes through the pipeline</div>
          <div class="cohort-hero-sub">${esc(desc)} · entry stage: ${esc(d.entryStage)}${rptState.ageGroup && GROUPS_DIRECT_Z.has(rptState.ageGroup) ? ' (C/D skip Regionals)' : ''}</div>
        </div>
        <div class="cohort-hero-block">
          <div class="cohort-hero-eyebrow">Made the Nationals list</div>
          <div class="cohort-hero-num good">${fmtNum(madeNats)}</div>
          <div class="cohort-hero-l">${pct(madeNats, total)} of cohort</div>
        </div>
        <div class="cohort-hero-block">
          <div class="cohort-hero-eyebrow">Did not advance to Nationals</div>
          <div class="cohort-hero-num neutral">${fmtNum(droppedOff)}</div>
          <div class="cohort-hero-l">${pct(droppedOff, total)} of cohort</div>
        </div>
      </div>
      `}

      <!-- Break-by selector: pick a demographic dimension to slice the funnel -->
      <div class="cf-slicer-bar">
        <span class="cf-slicer-l">Break funnel down by:</span>
        <div class="cf-slicer-opts">
          ${Object.entries(SLICE_FIELDS).map(([k, def]) => `
            <button class="cf-slicer-btn ${sliceKey===k?'is-active':''}" onclick="window._rptCohortBreakBy('${k}')">${esc(def.label.split(' — ')[0])}</button>
          `).join('')}
        </div>
      </div>

      ${slices ? renderSliceComparison(slices, total, sliceKey) : `
      <!-- Pipeline funnel: stages with drop-offs -->
      <div class="rpt-h2">
        <span class="rpt-h2-l">Pipeline funnel</span>
        <span class="rpt-h2-sub">Click any bar or drop-off to see who's there. Use &ldquo;Break funnel down by&rdquo; above to compare slices side-by-side.</span>
      </div>

      <!-- Data-source legend so the metric for each stage is unambiguous -->
      <div class="cf-data-key">
        <div class="cf-data-key-h">What each row counts <span class="rpt-soft">(definitions matter for CCE/Board accuracy)</span></div>
        <ol class="cf-data-key-list">
          <li><strong>In the pipeline:</strong> Every unique athlete who has at least one Regionals or direct-to-Zones row this season. Source: junior-data.js + Official Zone Qualifier list.</li>
          <li><strong>Competed at Zones:</strong> Athletes with at least one Zone meet result row. <em>Actual attendance, not registration.</em></li>
          <li><strong>E/W/C-eligible:</strong> Athletes who EITHER appear on the E/W/C registration list OR qualified from Zones OR are on the Nationals qualifier list. <strong>This is the eligible/registered set, not actual attendance</strong> — actual attendance appears in the row itself.</li>
          <li><strong>Jr Nationals qualifier list:</strong> Athletes on the published 2026 qualifier list. The Jr Nationals event has not happened yet, so this is the eligible-to-attend roster, not the final attendance.</li>
        </ol>
        <div class="cf-data-key-foot">
          Drop counts can be larger or smaller than the difference between adjacent rows because some athletes enter the pipeline downstream (HPS / pre-qualified / kept invited). Click any &ldquo;dropped here&rdquo; or &ldquo;added here&rdquo; line to see the named athletes.
        </div>
      </div>

      <div class="cf-funnel">
        ${stages.map((s, i) => {
          const widthPct = total > 0 ? Math.max(10, Math.round(s.athletes.length / total * 100)) : 0;
          const isDrill = drill === 'stage_' + s.id;
          const drop = drops[i];
          // Detect "added at this stage": athletes here who weren't in prior stage
          let addedCount = 0;
          if (i > 0) {
            const prevKeys = new Set(stages[i-1].athletes.map(x => x.key));
            addedCount = s.athletes.filter(x => !prevKeys.has(x.key)).length;
          }
          return `
          <div class="cf-stage cf-stage-${i} ${isDrill?'is-drill':''}" onclick="window._rptDrillFunnel('stage_${s.id}')">
            <div class="cf-stage-info">
              <span class="cf-stage-step">${i+1}</span>
              <div>
                <div class="cf-stage-title">${esc(s.label)}</div>
                <div class="cf-stage-sub">${s.sub}</div>
                ${s.source ? `<div class="cf-stage-source">${esc(s.source)}</div>` : ''}
              </div>
            </div>
            <div class="cf-stage-bar-wrap">
              <div class="cf-stage-bar cf-bar-${i}" style="width:${widthPct}%">
                <span class="cf-stage-n">${fmtNum(s.athletes.length)}</span>
              </div>
              <span class="cf-stage-pct">${pct(s.athletes.length, total)}</span>
            </div>
          </div>
          ${addedCount > 0 ? `
          <div class="cf-added" onclick="window._rptDrillFunnel('added_${s.id}')">
            <span class="cf-drop-spacer"></span>
            <div class="cf-drop-arrow-wrap"><span class="cf-added-arrow">+</span></div>
            <div class="cf-drop-info">
              <span class="cf-added-n">+${fmtNum(addedCount)} added here</span>
              <span class="cf-drop-l">athletes who entered the pipeline at this stage (HPS / pre-qualified / kept-invited / non-displacing)</span>
            </div>
            <span class="cf-drop-pct">${pct(addedCount, s.athletes.length)} of this row</span>
          </div>` : ''}
          ${drop && drop.athletes.length > 0 ? `
          <div class="cf-drop ${drill==='drop_'+drop.id?'is-drill':''}" onclick="window._rptDrillFunnel('drop_${drop.id}')">
            <span class="cf-drop-spacer"></span>
            <div class="cf-drop-arrow-wrap">
              <span class="cf-drop-arrow">↓</span>
            </div>
            <div class="cf-drop-info">
              <span class="cf-drop-n">−${fmtNum(drop.athletes.length)} athletes</span>
              <span class="cf-drop-l">${esc(drop.label)}</span>
            </div>
            <span class="cf-drop-pct">${pct(drop.athletes.length, s.athletes.length)} dropped here</span>
          </div>` : ''}`;
        }).join('')}
      </div>
      `}

      <!-- Outcome breakdown cards (always shown) -->
      <div class="rpt-h2">
        <span class="rpt-h2-l">Outcome breakdown</span>
        <span class="rpt-h2-sub">Every athlete lands in exactly one category — click to see who</span>
      </div>
      <div class="cf-outcomes">
        ${outcomes.map(o => `
          <div class="cf-outcome cf-outcome-${o.color} ${drill==='outcome_'+o.key?'is-drill':''}" onclick="window._rptDrillOutcome('${o.key}')">
            <div class="cf-outcome-head">
              <span class="cf-outcome-n">${fmtNum(o.count)}</span>
              <span class="cf-outcome-pct">${o.pct}%</span>
            </div>
            <div class="cf-outcome-title">${esc(o.label)}</div>
            <div class="cf-outcome-hint">${esc(o.hint)}</div>
            <div class="cf-outcome-bar-wrap">
              <div class="cf-outcome-bar cf-outcome-bar-${o.color}" style="width:${Math.max(2, o.pct)}%"></div>
            </div>
          </div>`).join('')}
      </div>

      ${drill ? renderCohortDrillDown(d, stages, drops, outcomes, drill) : `
        <div class="cf-drill-prompt">
          <span class="cf-drill-prompt-icon">↑</span>
          <span>Click a funnel bar, a drop-off, or an outcome card above to see the named list of athletes — plus a geographic breakdown of where they come from.</span>
        </div>`}

      <div class="rpt-toolbar-row">
        <button class="rpt-export-btn" onclick="window._rptExportCohort()">Download full cohort CSV</button>
      </div>
    </div>`;
  }

  function renderCohortDrillDown(d, stages, drops, outcomes, drill){
    let title = '', sub = '', athletes = [], context = '';

    if (drill.startsWith('stage_')) {
      const stage = stages.find(s => 'stage_' + s.id === drill);
      if (stage) {
        title = stage.label;
        sub = stage.sub;
        athletes = stage.athletes;
        context = `Stage ${stages.indexOf(stage)+1} of 4`;
      }
    } else if (drill.startsWith('drop_')) {
      const dropId = drill.replace(/^drop_/, '');
      const drop = drops.find(x => x.id === dropId);
      if (drop) {
        title = 'Dropped off: ' + drop.label;
        sub = `Between ${drop.from} → ${drop.to}`;
        athletes = drop.athletes;
        context = 'Drop-off';
      }
    } else if (drill.startsWith('outcome_')) {
      const okey = drill.replace(/^outcome_/, '');
      const outc = outcomes.find(o => o.key === okey);
      if (outc) {
        title = outc.label;
        sub = outc.hint;
        athletes = outc.athletes;
        context = 'Outcome category';
      }
    }

    if (!athletes.length) {
      return `<div class="cf-drill"><div class="cf-drill-head"><div><div class="cf-drill-eyebrow">${esc(context)}</div><div class="cf-drill-title">${esc(title)}</div></div><div class="cf-drill-actions"><button class="rpt-export-btn" onclick="window._rptDrillClear()">Clear selection</button></div></div><div class="cf-drill-empty">No athletes in this slice.</div></div>`;
    }

    const sorted = athletes.slice().sort((a,b)=>a.name.localeCompare(b.name));
    const rows = sorted.map(a => {
      const regEv = a.regEvents.map(e => `${esc(e.key)} #${esc(String(e.place||'?'))}`).join(' · ') || '—';
      const zonEv = a.zonEvents.map(e => {
        const tag = e.advancesToNationals ? 'badge-green' : e.advancesToEWC ? 'badge-blue' : '';
        return `<span class="badge ${tag}">${esc(e.key)} #${esc(String(e.place||'?'))}</span>`;
      }).join(' ') || '—';
      const status = [];
      if (a.atNationals) status.push('<span class="badge badge-green">Nat</span>');
      if (a.atEWCRegistered) status.push('<span class="badge badge-blue">E/W/C</span>');
      if (a.hps) status.push('<span class="badge badge-purple">HPS</span>');
      if (a.ymca) status.push('<span class="badge badge-pool">YMCA</span>');
      if (a.foreign) status.push('<span class="badge badge-red">Foreign</span>');
      if (a.dual) status.push('<span class="badge badge-pool">Dual</span>');
      const dm = a.diveMeetsId ? `<a class="ext-link" target="_blank" rel="noopener" href="https://www.divemeets.com/profile.php?id=${esc(a.diveMeetsId)}">${esc(a.diveMeetsId)}</a>` : '';

      return `<tr>
        <td class="r-name">${esc(a.name)}</td>
        <td>${status.join(' ')||'—'}</td>
        <td>${dm}</td>
        <td>${esc(a.team || '—')}</td>
        <td>${esc(a.ageGroup||'')} ${esc(a.gender||'')}</td>
        <td class="small">${[...a.regions].map(x => 'R'+x).join(', ')||'—'} · ${[...a.zones].map(x => 'Z'+x).join(', ')||'—'}</td>
        <td>${regEv}</td>
        <td>${zonEv}</td>
      </tr>`;
    }).join('');

    return `<div class="cf-drill" id="cf-drill-anchor">
      <div class="cf-drill-head">
        <div>
          <div class="cf-drill-eyebrow">${esc(context)}</div>
          <div class="cf-drill-title">${esc(title)}</div>
          <div class="cf-drill-hint">${esc(sub)} — <strong>${fmtNum(athletes.length)} athletes</strong> (${pct(athletes.length, d.total)} of cohort)</div>
        </div>
        <div class="cf-drill-actions">
          <button class="rpt-export-btn" onclick="window._rptExportDrill('${esc(drill)}')">Download this list</button>
          <button class="rpt-export-btn rpt-export-btn-ghost" onclick="window._rptDrillClear()">✕ Clear</button>
        </div>
      </div>

      <!-- Provenance breakdown: where do these athletes come from? -->
      <div class="cf-prov-grid">
        ${renderProvenanceCard(athletes, 'ageGroup', 'By age group')}
        ${renderProvenanceCard(athletes, 'gender',   'By gender')}
        ${renderProvenanceCard(athletes, 'region',   'By region')}
        ${renderProvenanceCard(athletes, 'zone',     'By zone')}
        ${renderProvenanceCard(athletes, 'ewc',      'By E/W/C')}
        ${renderProvenanceCard(athletes, 'team',     'By team (top 8)')}
      </div>

      <div class="rpt-table-scroll" style="max-height:520px">
        <table class="rpt-table">
          <thead><tr>
            <th>Athlete</th><th>Flags</th><th>DiveMeets</th><th>Team</th><th>Group</th><th>R · Z</th><th>Regionals</th><th>Zones</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }

  window._rptDrillFunnel = function(key){
    rptState._cohortDrill = key;
    renderReports();
    setTimeout(() => {
      const el = document.getElementById('cf-drill-anchor');
      if (el) el.scrollIntoView({behavior:'smooth', block:'nearest'});
    }, 60);
  };
  window._rptDrillOutcome = function(key){
    rptState._cohortDrill = 'outcome_' + key;
    renderReports();
    setTimeout(() => {
      const el = document.getElementById('cf-drill-anchor');
      if (el) el.scrollIntoView({behavior:'smooth', block:'nearest'});
    }, 60);
  };
  window._rptDrillClear = function(){
    rptState._cohortDrill = null;
    renderReports();
  };

  window._rptCohortBreakBy = function(key){
    rptState.cohortBreakBy = key || 'none';
    renderReports();
  };

  window._rptExportCohort = function(){
    const d = buildCohortData();
    const lines = ['Bucket,Athlete,DiveMeetsID,Team,AgeGroup,Gender,Regions,Zones,RegEvents,ZoneEvents,E/W/C Registered,On Nat List'];
    Object.entries(d.buckets).forEach(([k, arr]) => {
      arr.forEach(a => {
        lines.push([
          k, a.name, a.diveMeetsId, a.team, a.ageGroup, a.gender,
          [...a.regions].join('|'), [...a.zones].join('|'),
          a.regEvents.map(e => `${e.key}#${e.place}`).join('|'),
          a.zonEvents.map(e => `${e.key}#${e.place}`).join('|'),
          a.atEWCRegistered ? 'Yes' : '',
          a.atNationals ? 'Yes' : '',
        ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
      });
    });
    downloadCSV(lines.join('\n'), 'cohort-tracker.csv');
  };

  window._rptExportDrill = function(drill){
    const d = buildCohortData();
    const stages = buildFunnelStages(d);
    const drops = buildFunnelDrops(stages);
    const outcomes = buildOutcomeCards(d);
    let athletes = [], label = drill;
    if (drill.startsWith('stage_')) { const s = stages.find(x => 'stage_'+x.id === drill); if (s) { athletes = s.athletes; label = s.label; } }
    else if (drill.startsWith('drop_')) { const id = drill.replace(/^drop_/,''); const dr = drops.find(x => x.id === id); if (dr) { athletes = dr.athletes; label = dr.label; } }
    else if (drill.startsWith('outcome_')) { const okey = drill.replace(/^outcome_/,''); const o = outcomes.find(x => x.key === okey); if (o) { athletes = o.athletes; label = o.label; } }
    const lines = ['# ' + label.replace(/[\r\n,]/g,' '), 'Athlete,DiveMeetsID,Team,AgeGroup,Gender,Regions,Zones,E/W/C Registered,On Nat List,RegEvents,ZoneEvents'];
    athletes.forEach(a => {
      lines.push([
        a.name, a.diveMeetsId, a.team, a.ageGroup, a.gender,
        [...a.regions].join('|'), [...a.zones].join('|'),
        a.atEWCRegistered ? 'Yes' : '',
        a.atNationals ? 'Yes' : '',
        a.regEvents.map(e => `${e.key}#${e.place}`).join('|'),
        a.zonEvents.map(e => `${e.key}#${e.place}`).join('|'),
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    });
    downloadCSV(lines.join('\n'), `cohort-drill-${drill.replace(/[^a-z0-9_]/gi,'_')}.csv`);
  };

  /* ====================================================================
     PANEL 3 · SCORING ANALYSIS
     -------------------------------------------------------------------
     Average / median / range scores at each placement across the
     selected events. Useful answers: "What's the average score for
     1st place in Group B Girls 3M across zones?", "How does Region 1
     stack up to Region 7 at place 5?", etc.
     ==================================================================== */
  function buildScoringData(){
    const all = allResults();
    const stage = rptState.scoringStage;
    const synth = new Set(['synthetic_from_oqz']);
    const synthHas = (r) => synth.has(r.sourceRow);

    const rows = all.filter(r => {
      if (synthHas(r)) return false;
      if (stage === 'Regionals' && !isRegional(r)) return false;
      if (stage === 'Zones'     && !isZone(r))     return false;
      if (stage === 'EWC'       && !isEwc(r))      return false;
      if (!rowMatchesFilters(r)) return false;
      if (!Number.isFinite(r.score) || !r.placeNumber) return false;
      return true;
    });

    /* Group by event (eventKey + zone/region context) so we can compute
       per-event placement averages, then aggregate across events. */
    const eventGroups = groupBy(rows, r => `${r.eventKey}||${stage === 'Regionals' ? 'R'+r.region : (stage === 'Zones' ? 'Z'+r.zone : (r.ewc||''))}`);

    const placeStats = new Map();  // place -> {scores:[], events: Set}
    function bumpPlace(p, score, eventInstanceKey){
      if (!placeStats.has(p)) placeStats.set(p, {scores:[], events:new Set()});
      const ps = placeStats.get(p);
      ps.scores.push(score);
      ps.events.add(eventInstanceKey);
    }

    /* For each event instance, take the row at each placeNumber.
       (Tied places keep both — that's expected.) */
    eventGroups.forEach((grp, eventInstanceKey) => {
      grp.forEach(r => {
        const p = Math.floor(r.placeNumber);
        if (!Number.isFinite(p) || p < 1) return;
        bumpPlace(p, r.score, eventInstanceKey);
      });
    });

    /* Build sorted rows */
    const places = [...placeStats.keys()].sort((a,b)=>a-b);
    const summary = places.map(p => {
      const ps = placeStats.get(p);
      return {
        place: p,
        n: ps.scores.length,
        events: ps.events.size,
        mean: mean(ps.scores),
        median: median(ps.scores),
        min: Math.min(...ps.scores),
        max: Math.max(...ps.scores),
        sd: stddev(ps.scores),
      };
    });

    /* Cross-tabulated by event category for the active filter
       e.g. Group A Boys 3M — across all zones */
    const byEvent = new Map(); // eventKey -> [scores by place 1, 2, ...]
    eventGroups.forEach((grp, eventInstanceKey) => {
      const eventKey = eventInstanceKey.split('||')[0];
      const scope = eventInstanceKey.split('||')[1];
      grp.forEach(r => {
        const p = Math.floor(r.placeNumber);
        if (!Number.isFinite(p) || p < 1) return;
        if (!byEvent.has(eventKey)) byEvent.set(eventKey, new Map());
        const m = byEvent.get(eventKey);
        if (!m.has(p)) m.set(p, []);
        m.get(p).push({ score: r.score, scope, athlete: r.athlete });
      });
    });

    return { stage, summary, places, byEvent, eventCount: eventGroups.size, rowCount: rows.length };
  }

  function placeFilter(placeRange, places){
    if (placeRange === 'all') return places;
    if (placeRange === '1')     return places.filter(p => p === 1);
    if (placeRange === '1-3')   return places.filter(p => p >= 1 && p <= 3);
    if (placeRange === '1-5')   return places.filter(p => p >= 1 && p <= 5);
    if (placeRange === '1-15')  return places.filter(p => p >= 1 && p <= 15);
    if (placeRange === '1-18')  return places.filter(p => p >= 1 && p <= 18);
    return places;
  }

  function renderScoringPanel(wrap){
    const d = buildScoringData();
    const desc = activeFilterDescription();
    const filtered = activeFilterCount() > 0;
    const places = placeFilter(rptState.scoringPlaces, d.places);
    const placesSorted = places.slice().sort((a,b)=>a-b);

    const ordinal = (n) => {
      const s = ['th','st','nd','rd']; const v = n % 100;
      return n + (s[(v-20)%10] || s[v] || s[0]);
    };

    if (!d.summary.length) {
      wrap.innerHTML = `<div class="rpt-section">
        ${scoringControls()}
        <div class="rpt-empty">
          <strong>No scored results match the current filters at the ${esc(d.stage)} stage.</strong><br>
          <span style="font-size:12px">Try a different stage above, or clear some filter chips.</span>
        </div>
      </div>`;
      return;
    }

    const eventKeys = [...d.byEvent.keys()].sort();
    const drill = rptState._scoringDrill || null;

    // Build per-event aggregates across the selected place range
    const eventStats = eventKeys.map(ek => {
      const byPlace = d.byEvent.get(ek);
      const perPlace = placesSorted.map(p => {
        const entries = byPlace.get(p) || [];
        const scores = entries.map(x => x.score).filter(Number.isFinite);
        return scores.length
          ? { place: p, entries, scores, mean: mean(scores), median: median(scores), min: Math.min(...scores), max: Math.max(...scores), sd: stddev(scores), n: scores.length }
          : { place: p, entries: [], scores: [], mean: NaN, n: 0 };
      });
      const totalSamples = perPlace.reduce((a,b)=>a+b.n, 0);
      return { eventKey: ek, perPlace, totalSamples, byPlaceMap: byPlace };
    }).filter(es => es.totalSamples > 0);

    const drillStats = drill ? eventStats.find(e => e.eventKey === drill) : null;
    const scoringCurYear = (_yearOverrideRows ? rptState.selectedYear : _currentSeason);
    const scoringDiveEra = scoringCurYear < 2024
      ? 'This view reflects the <strong>pre-2024</strong> required dive counts (in effect through 2023).'
      : 'This view reflects required dive counts in effect since <strong>Jan 1, 2024</strong> (aligned to World Aquatics/Pan American Aquatics standards).';

    wrap.innerHTML = `<div class="rpt-section">

      ${scoringControls()}

      <div class="rpt-note">
        <strong>Scores are only comparable within the same event type.</strong>
        Group A Boys 1M, Group D Girls Platform, and every other combination use
        different scoring scales (different dive lists, DDs, board heights), so an
        overall &ldquo;average score for 1st place&rdquo; would mix incomparable numbers.
        Each row below is one event type — those numbers are meaningful.
        ${scoringDiveEra} Group A, Group C girls' springboard, and Group D required
        dive counts changed at that boundary, so switching the year above for those
        groups isn't a like-for-like score comparison — see the Jan 2024 dive-count
        rule change for details.
        ${filtered ? `<br><strong>Active filter:</strong> ${esc(desc)}` : ''}
      </div>

      <div class="rpt-h2">
        <span class="rpt-h2-l">Score profiles by event type</span>
        <span class="rpt-h2-sub">Click any row to see place-by-place detail, score range, and per-meet breakdown</span>
      </div>

      <div class="rpt-table-scroll">
        <table class="rpt-table sc-event-table">
          <thead>
            <tr>
              <th>Event</th>
              ${placesSorted.map(p => `<th class="mono sc-place-col">${ordinal(p)} place</th>`).join('')}
              <th class="mono" title="Total scored results across the place ranges shown">Total scored</th>
            </tr>
          </thead>
          <tbody>
            ${eventStats.map(es => `
              <tr class="sc-event-row ${drill === es.eventKey ? 'is-drill' : ''}" onclick="window._rptScoringDrill('${esc(es.eventKey)}')">
                <td class="r-name sc-event-name">${esc(es.eventKey)}${drill === es.eventKey ? ' <span class="sc-drill-tag">↓ open</span>' : ''}</td>
                ${es.perPlace.map(pp => `
                  <td class="mono sc-cell-td">
                    ${pp.n ? `
                      <div class="sc-cell-mean">${fmtScore(pp.mean)}</div>
                      <div class="sc-cell-range">${fmtScore(pp.min)}&ndash;${fmtScore(pp.max)}</div>
                      <div class="sc-cell-n">n=${pp.n}</div>
                    ` : '<span class="sc-cell-na">—</span>'}
                  </td>`).join('')}
                <td class="mono sc-cell-td sc-event-n">
                  <div class="sc-cell-mean"><strong>${fmt(es.totalSamples)}</strong></div>
                  <div class="sc-cell-n">athletes scored</div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${drillStats ? renderScoringDrillDetail(drillStats, d) : `
        <div class="cf-drill-prompt" style="margin-top:18px">
          <span class="cf-drill-prompt-icon">↑</span>
          <span>Click any event row above to open its full score profile (place-by-place stats, mean+range chart, and per-meet breakdown).</span>
        </div>`}

    </div>`;
  }

  function scoringControls(){
    return `<div class="scoring-controls">
      <div class="scoring-control">
        <label>Stage</label>
        <select onchange="window._rptScoring('scoringStage', this.value)">
          <option value="Regionals" ${rptState.scoringStage==='Regionals'?'selected':''}>Regionals</option>
          <option value="Zones"     ${rptState.scoringStage==='Zones'?'selected':''}>Zones</option>
          <option value="EWC"       ${rptState.scoringStage==='EWC'?'selected':''}>E/W/C (when results loaded)</option>
        </select>
      </div>
      <div class="scoring-control">
        <label>Places shown</label>
        <select onchange="window._rptScoring('scoringPlaces', this.value)">
          <option value="1"    ${rptState.scoringPlaces==='1'?'selected':''}>1st only</option>
          <option value="1-3"  ${rptState.scoringPlaces==='1-3'?'selected':''}>1st – 3rd (Nat-direct band)</option>
          <option value="1-5"  ${rptState.scoringPlaces==='1-5'?'selected':''}>1st – 5th</option>
          <option value="1-15" ${rptState.scoringPlaces==='1-15'?'selected':''}>1st – 15th (Regional qual band)</option>
          <option value="1-18" ${rptState.scoringPlaces==='1-18'?'selected':''}>1st – 18th (Zone field cap)</option>
          <option value="all"  ${rptState.scoringPlaces==='all'?'selected':''}>All places</option>
        </select>
      </div>
      <button class="rpt-export-btn" style="margin-left:auto;align-self:flex-end" onclick="window._rptExportScoring()">Download CSV</button>
    </div>`;
  }

  function renderScoringDrillDetail(es, d){
    // All places where this event has any data (not just the filtered range)
    const allPlaces = [...es.byPlaceMap.keys()].sort((a,b)=>a-b);

    // Per-meet (scope) breakdown
    const scopeSet = new Set();
    allPlaces.forEach(p => (es.byPlaceMap.get(p) || []).forEach(x => scopeSet.add(x.scope)));
    const scopes = [...scopeSet].sort();

    // Place-by-place stats over ALL places
    const placeStats = allPlaces.map(p => {
      const scores = (es.byPlaceMap.get(p) || []).map(x => x.score).filter(Number.isFinite);
      return scores.length
        ? { place: p, n: scores.length, mean: mean(scores), median: median(scores), min: Math.min(...scores), max: Math.max(...scores), sd: stddev(scores) }
        : null;
    }).filter(Boolean);

    const statRows = placeStats.map(s => `<tr>
      <td class="mono"><strong>${s.place}</strong></td>
      <td class="mono">${fmtScore(s.mean)}</td>
      <td class="mono">${fmtScore(s.median)}</td>
      <td class="mono">${fmtScore(s.min)}</td>
      <td class="mono">${fmtScore(s.max)}</td>
      <td class="mono">${s.n > 1 ? s.sd.toFixed(2) : '—'}</td>
      <td class="mono">${s.n}</td>
    </tr>`).join('');

    // Per-meet rows: each scope, mean score at each place (cap at first 12 places for readability)
    const meetPlaceCols = allPlaces.slice(0, 12);
    const meetRows = scopes.map(scope => {
      const cells = meetPlaceCols.map(p => {
        const scores = (es.byPlaceMap.get(p) || []).filter(x => x.scope === scope).map(x => x.score).filter(Number.isFinite);
        if (!scores.length) return '<td class="mono sc-cell-na">—</td>';
        const v = scores.length === 1 ? scores[0] : mean(scores);
        const note = scores.length > 1 ? `<span class="cell-sub">avg of ${scores.length}</span>` : '';
        return `<td class="mono">${fmtScore(v)}${note}</td>`;
      });
      return `<tr><td class="r-name">${esc(scope)}</td>${cells.join('')}</tr>`;
    }).join('');

    const chart = buildScoringChart(placeStats);

    return `<div class="cf-drill" id="cf-drill-anchor" style="margin-top:22px">
      <div class="cf-drill-head">
        <div>
          <div class="cf-drill-eyebrow">Score profile</div>
          <div class="cf-drill-title">${esc(es.eventKey)}</div>
          <div class="cf-drill-hint">${esc(d.stage)} stage · ${scopes.length} meet instance${scopes.length===1?'':'s'} · ${placeStats.reduce((a,b)=>a+b.n,0)} scored results</div>
        </div>
        <div class="cf-drill-actions">
          <button class="rpt-export-btn rpt-export-btn-ghost" onclick="window._rptScoringDrillClear()">✕ Close detail</button>
        </div>
      </div>
      <div style="padding:18px 22px 22px">
        ${chart}
        <div class="sc-drill-grid">
          <div>
            <div class="rpt-subsection-title" style="margin-top:6px">Place-by-place stats (all places with data)</div>
            <div class="rpt-table-scroll" style="max-height:420px">
              <table class="rpt-table">
                <thead><tr><th>Place</th><th>Mean</th><th>Median</th><th>Min</th><th>Max</th><th>Std dev</th><th>Samples</th></tr></thead>
                <tbody>${statRows}</tbody>
              </table>
            </div>
          </div>
          <div>
            <div class="rpt-subsection-title" style="margin-top:6px">Per-meet breakdown ${meetPlaceCols.length < allPlaces.length ? `<span class="rpt-pill-note">(first ${meetPlaceCols.length} places shown)</span>` : ''}</div>
            <div class="rpt-table-scroll" style="max-height:420px">
              <table class="rpt-table">
                <thead><tr><th>Meet</th>${meetPlaceCols.map(p=>`<th class="mono">P${p}</th>`).join('')}</tr></thead>
                <tbody>${meetRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function buildScoringChart(placeStats){
    if (!placeStats.length) return '';
    if (placeStats.length === 1) {
      const s = placeStats[0];
      return `<div class="sc-single">
        <div class="sc-single-place">${s.place}${s.place===1?'st':s.place===2?'nd':s.place===3?'rd':'th'} place</div>
        <div class="sc-single-mean">${fmtScore(s.mean)}</div>
        <div class="sc-single-meta">mean across ${s.n} sample${s.n===1?'':'s'} · range ${fmtScore(s.min)}–${fmtScore(s.max)}</div>
      </div>`;
    }

    const w = 820, h = 240;
    const padL = 56, padR = 24, padT = 22, padB = 36;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const maxScore = Math.max(...placeStats.map(p => p.max));
    const minScore = Math.min(...placeStats.map(p => p.min));
    const range = maxScore - minScore || 1;
    const padR2 = range * 0.08;
    const yLo = minScore - padR2;
    const yHi = maxScore + padR2;
    const yRange = yHi - yLo;

    const xStep = innerW / placeStats.length;
    const xy = placeStats.map((p, i) => ({
      x: padL + i * xStep + xStep/2,
      y: padT + innerH - ((p.mean - yLo) / yRange) * innerH,
      yMin: padT + innerH - ((p.min - yLo) / yRange) * innerH,
      yMax: padT + innerH - ((p.max - yLo) / yRange) * innerH,
      place: p.place, mean: p.mean, min: p.min, max: p.max, n: p.n,
    }));
    const linePath = 'M ' + xy.map(d => `${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join(' L ');

    // Y axis ticks (5)
    const ticks = 4;
    const tickHtml = Array.from({length: ticks+1}, (_, i) => {
      const v = yLo + (yRange * i / ticks);
      const y = padT + innerH - (i / ticks) * innerH;
      return `<g><line x1="${padL}" x2="${w-padR}" y1="${y}" y2="${y}" stroke="var(--line-2)" stroke-dasharray="2 3" stroke-width="1"/><text x="${padL-8}" y="${y+3}" text-anchor="end" font-size="10" fill="var(--ink-3)" font-family="JetBrains Mono, monospace">${v.toFixed(0)}</text></g>`;
    }).join('');

    // Range bars (min-max)
    const ranges = xy.map(d => `<line x1="${d.x}" x2="${d.x}" y1="${d.yMin}" y2="${d.yMax}" stroke="#8fc3ea" stroke-width="6" stroke-linecap="round" opacity="0.55"/>`).join('');

    // Mean dots + labels
    const dots = xy.map(d => `
      <g>
        <circle cx="${d.x}" cy="${d.y}" r="5" fill="#171f69" stroke="#fff" stroke-width="2"><title>P${d.place}: mean ${d.mean.toFixed(2)} · range ${d.min.toFixed(2)}–${d.max.toFixed(2)} · n=${d.n}</title></circle>
        <text x="${d.x}" y="${d.y - 11}" text-anchor="middle" font-size="11" fill="#171f69" font-weight="700" font-family="JetBrains Mono, monospace">${d.mean.toFixed(0)}</text>
      </g>
    `).join('');

    // X axis labels
    const xLabels = xy.map(d => `<text x="${d.x}" y="${h-12}" text-anchor="middle" font-size="11" fill="#566170" font-family="JetBrains Mono, monospace">P${d.place}</text>`).join('');

    return `<svg class="sc-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Score profile chart" style="width:100%;height:auto;max-height:260px;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:0">
      <text x="${padL}" y="${padT - 6}" font-size="11" fill="#566170" font-family="Inter, sans-serif">Mean score at each place (sky band = score range across meets)</text>
      ${tickHtml}
      ${ranges}
      <path d="${linePath}" fill="none" stroke="#171f69" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
      ${dots}
      ${xLabels}
    </svg>`;
  }

  window._rptScoring = function(key, val){
    rptState[key] = val;
    // Clear drill if changing stage (event keys may differ)
    if (key === 'scoringStage') rptState._scoringDrill = null;
    renderReports();
  };

  window._rptScoringDrill = function(eventKey){
    rptState._scoringDrill = (rptState._scoringDrill === eventKey) ? null : eventKey;
    renderReports();
    if (rptState._scoringDrill) {
      setTimeout(() => {
        const el = document.getElementById('cf-drill-anchor');
        if (el) el.scrollIntoView({behavior:'smooth', block:'nearest'});
      }, 60);
    }
  };

  window._rptScoringDrillClear = function(){
    rptState._scoringDrill = null;
    renderReports();
  };

  window._rptExportScoring = function(){
    const d = buildScoringData();
    const lines = [
      `# Scoring profiles · ${d.stage}`,
      'Event,Place,Mean,Median,Min,Max,StdDev,Samples,Meets'
    ];
    const eventKeys = [...d.byEvent.keys()].sort();
    eventKeys.forEach(ek => {
      const byPlace = d.byEvent.get(ek);
      const places = [...byPlace.keys()].sort((a,b)=>a-b);
      places.forEach(p => {
        const entries = byPlace.get(p) || [];
        const scores = entries.map(x => x.score).filter(Number.isFinite);
        if (!scores.length) return;
        const scopes = new Set(entries.map(x => x.scope));
        lines.push([
          ek, p,
          fmtScore(mean(scores)), fmtScore(median(scores)),
          fmtScore(Math.min(...scores)), fmtScore(Math.max(...scores)),
          scores.length > 1 ? stddev(scores).toFixed(2) : '',
          scores.length, scopes.size,
        ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
      });
    });
    downloadCSV(lines.join('\n'), `scoring-profiles-${d.stage.toLowerCase()}.csv`);
  };

  /* ====================================================================
     PANEL 4 · PARTICIPATION BREAKDOWNS
     -------------------------------------------------------------------
     Creative slices. Sub-views:
        Teams        – top teams by athletes, qualifiers, Nat qualifiers
        Multi-event  – athletes in 1, 2, 3 disciplines
        Geographic   – per-zone / per-region density and gender mix
        Matrix       – Age × Gender × Stage athlete counts
        Zone strength– qualifier-to-entry ratios per zone event
        Gender mix   – gender balance across every dimension
     ==================================================================== */
  function buildBreakdownsBase(){
    const all = allResults();
    return all.filter(r => rowMatchesFilters(r));
  }

  function renderBreakdownsPanel(wrap){
    const view = rptState.breakdownView;
    const subtabs = `
      <div class="bd-tabs">
        ${[
          ['teams','Teams'],
          ['multievent','Multi-event'],
          ['geo','Geographic spread'],
          ['matrix','Age × Gender matrix'],
          ['zonestrength','Zone competition strength'],
          ['gender','Gender mix'],
        ].map(([k,l]) => `<button class="bd-tab ${view===k?'active':''}" onclick="window._rptBreakdown('${k}')">${esc(l)}</button>`).join('')}
      </div>`;

    let body = '';
    if (view === 'teams')         body = renderTeamsBreakdown();
    else if (view === 'multievent') body = renderMultiEventBreakdown();
    else if (view === 'geo')      body = renderGeoBreakdown();
    else if (view === 'matrix')   body = renderMatrixBreakdown();
    else if (view === 'zonestrength') body = renderZoneStrengthBreakdown();
    else if (view === 'gender')   body = renderGenderMixBreakdown();

    wrap.innerHTML = `
      <div class="rpt-section">
        <div class="rpt-section-title">
          Participation breakdowns
          <span class="rpt-section-sub">${esc(activeFilterDescription())}</span>
        </div>
        ${subtabs}
        ${body}
      </div>`;
  }

  /* — Teams — */
  function renderTeamsBreakdown(){
    const rows = buildBreakdownsBase();
    /* Per-team aggregates */
    const teams = new Map();
    function ensureTeam(name){
      if (!teams.has(name)) teams.set(name, {
        name,
        athletes: new Set(),
        regionalEntries: 0,
        zoneEntries: 0,
        regionalQualifiers: new Set(),
        zoneToNat: new Set(),
        zoneToEWC: new Set(),
        nationals: new Set(),
        regions: new Set(),
        zones: new Set(),
      });
      return teams.get(name);
    }

    rows.forEach(r => {
      const team = r.team || '— Unaffiliated —';
      const t = ensureTeam(team);
      t.athletes.add(r.athlete);
      if (r.region) t.regions.add(r.region);
      if (r.zone) t.zones.add(r.zone);
      if (isRegional(r)) {
        t.regionalEntries++;
        if (r.advancesToZone) t.regionalQualifiers.add(r.athlete);
      }
      if (isZone(r)) {
        t.zoneEntries++;
        if (r.advancesToNationals) t.zoneToNat.add(r.athlete);
        if (r.advancesToEWC) t.zoneToEWC.add(r.athlete);
      }
    });

    /* Match nationals qualifiers by name */
    const natKeys = natQualifierKeys();
    teams.forEach(t => {
      t.athletes.forEach(a => {
        if (natKeys.has(norm(a))) t.nationals.add(a);
      });
    });

    const sortedTeams = [...teams.values()]
      .sort((a,b) => b.athletes.size - a.athletes.size);

    const total = sortedTeams.reduce((acc,t)=>acc + t.athletes.size, 0);

    const rowsHtml = sortedTeams.slice(0, 100).map(t => {
      const bar = total ? Math.max(2, Math.round(120 * t.athletes.size / sortedTeams[0].athletes.size)) : 0;
      return `<tr>
        <td class="r-name">${esc(t.name)}</td>
        <td class="mono">${t.athletes.size}<div class="bd-bar" style="width:${bar}px"></div></td>
        <td class="mono">${t.regionalEntries}</td>
        <td class="mono">${t.regionalQualifiers.size}</td>
        <td class="mono">${t.zoneEntries}</td>
        <td class="mono">${t.zoneToNat.size}</td>
        <td class="mono">${t.zoneToEWC.size}</td>
        <td class="mono">${t.nationals.size > 0 ? `<strong>${t.nationals.size}</strong>` : '0'}</td>
        <td class="mono small">${[...t.zones].sort().map(x=>'Z'+x).join(', ') || '—'}</td>
      </tr>`;
    }).join('');

    return `<div class="rpt-subsection">
      <div class="rpt-subsection-title">Top teams by athlete count <span class="rpt-pill">${sortedTeams.length} teams</span></div>
      <div class="rpt-note">Showing top 100. Click "Download CSV" for the full list.
        <button class="rpt-export-btn" style="float:right" onclick="window._rptExportTeams()">Download CSV</button>
      </div>
      <div class="rpt-table-scroll">
        <table class="rpt-table">
          <thead><tr>
            <th>Team</th><th>Athletes</th><th>Reg entries</th><th>Reg → Zone</th>
            <th>Zone entries</th><th>Zone → Nat</th><th>Zone → EWC</th><th>On Nat list</th><th>Zones</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
  }

  window._rptExportTeams = function(){
    const rows = buildBreakdownsBase();
    const teams = new Map();
    const natKeys = natQualifierKeys();
    rows.forEach(r => {
      const team = r.team || '— Unaffiliated —';
      if (!teams.has(team)) teams.set(team, {
        name: team, athletes: new Set(),
        regionalEntries:0, zoneEntries:0,
        regionalQualifiers: new Set(),
        zoneToNat: new Set(), zoneToEWC: new Set(),
      });
      const t = teams.get(team);
      t.athletes.add(r.athlete);
      if (isRegional(r)) { t.regionalEntries++; if (r.advancesToZone) t.regionalQualifiers.add(r.athlete); }
      if (isZone(r)) { t.zoneEntries++; if (r.advancesToNationals) t.zoneToNat.add(r.athlete); if (r.advancesToEWC) t.zoneToEWC.add(r.athlete); }
    });
    const lines = ['Team,Athletes,RegEntries,RegToZone,ZoneEntries,ZoneToNat,ZoneToEWC,NatList'];
    [...teams.values()].sort((a,b)=>b.athletes.size-a.athletes.size).forEach(t => {
      const natCount = [...t.athletes].filter(a => natKeys.has(norm(a))).length;
      lines.push([t.name, t.athletes.size, t.regionalEntries, t.regionalQualifiers.size,
                  t.zoneEntries, t.zoneToNat.size, t.zoneToEWC.size, natCount]
        .map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    });
    downloadCSV(lines.join('\n'), 'teams-breakdown.csv');
  };

  /* — Multi-event — */
  function renderMultiEventBreakdown(){
    const rows = buildBreakdownsBase();

    /* Athlete -> set of disciplines they competed in across stages */
    const athletes = new Map();
    rows.forEach(r => {
      const k = r.athlete.toLowerCase();
      if (!athletes.has(k)) athletes.set(k, {
        name: r.athlete, team: r.team || '', ageGroup: r.ageGroup, gender: r.gender,
        disciplines: new Set(), stages: new Set(),
        synchroAlso: false, qualifiedZones: false, qualifiedNatDirect: false, qualifiedEWC: false,
      });
      const a = athletes.get(k);
      if (r.discipline) a.disciplines.add(r.discipline);
      a.stages.add(r.stage);
      if (r.isSynchro) a.synchroAlso = true;
      if (isRegional(r) && r.advancesToZone) a.qualifiedZones = true;
      if (isZone(r) && r.advancesToNationals) a.qualifiedNatDirect = true;
      if (isZone(r) && r.advancesToEWC) a.qualifiedEWC = true;
    });

    /* Bucket by # of disciplines */
    const buckets = {1: [], 2: [], 3: []};
    athletes.forEach(a => {
      const n = a.disciplines.size;
      if (n >= 1 && n <= 3) buckets[n].push(a);
    });

    const total = athletes.size;

    const card = (n) => {
      const arr = buckets[n] || [];
      const boys = arr.filter(a => a.gender === 'Boys').length;
      const girls = arr.filter(a => a.gender === 'Girls').length;
      const natQ = arr.filter(a => a.qualifiedNatDirect).length;
      return `<div class="bd-card bd-card-${n}">
        <div class="bd-card-n">${arr.length}</div>
        <div class="bd-card-l">${n} discipline${n>1?'s':''}</div>
        <div class="bd-card-sub">${pct(arr.length, total)} of athletes · ♂ ${boys} · ♀ ${girls}</div>
        <div class="bd-card-sub">→ Nat direct: ${natQ}</div>
      </div>`;
    };

    /* List of triple-threat athletes (compete in all 3 disciplines) */
    const triples = (buckets[3] || []).sort((a,b)=>a.name.localeCompare(b.name));
    const tripleRows = triples.slice(0, 200).map(a => `<tr>
      <td class="r-name">${esc(a.name)}</td>
      <td>${esc(a.team || '—')}</td>
      <td>${esc(a.ageGroup||'')} ${esc(a.gender||'')}</td>
      <td>${[...a.disciplines].join(', ')}</td>
      <td>${[...a.stages].join(', ')}</td>
      <td>${a.qualifiedNatDirect?'<span class="badge badge-green">→ Nat direct</span>':a.qualifiedEWC?'<span class="badge badge-blue">→ E/W/C</span>':a.qualifiedZones?'<span class="badge badge-pool">→ Zones</span>':''}</td>
    </tr>`).join('');

    return `
      <div class="bd-card-row">
        ${card(1)} ${card(2)} ${card(3)}
      </div>
      <div class="rpt-subsection">
        <div class="rpt-subsection-title">Triple-discipline athletes <span class="rpt-pill">${triples.length}</span></div>
        <div class="rpt-note">Athletes who competed in 1M, 3M, and Platform across the selected scope. Showing top 200.</div>
        <table class="rpt-table">
          <thead><tr><th>Athlete</th><th>Team</th><th>Group</th><th>Disciplines</th><th>Stages</th><th>Best advance</th></tr></thead>
          <tbody>${tripleRows || '<tr><td colspan="6" class="empty">No triple-discipline athletes match filters</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  /* — Geographic spread — */
  function renderGeoBreakdown(){
    const rows = buildBreakdownsBase();

    /* Per-zone counts */
    const zones = new Map();
    rows.forEach(r => {
      if (!r.zone) return;
      const z = r.zone;
      if (!zones.has(z)) zones.set(z, {
        name: 'Zone '+z, ewc: r.ewc,
        athletes: new Set(), regEntries: 0, zoneEntries: 0,
        toNat: new Set(), toEWC: new Set(),
        groups: {'Group A':0, 'Group B':0, 'Group C':0, 'Group D':0},
        gender: {Boys:0, Girls:0},
      });
      const z_ = zones.get(z);
      z_.athletes.add(r.athlete);
      if (isRegional(r)) z_.regEntries++;
      if (isZone(r)) {
        z_.zoneEntries++;
        if (r.advancesToNationals) z_.toNat.add(r.athlete);
        if (r.advancesToEWC) z_.toEWC.add(r.athlete);
        if (z_.groups[r.ageGroup] != null) z_.groups[r.ageGroup]++;
        if (z_.gender[r.gender] != null) z_.gender[r.gender]++;
      }
    });

    /* Per-region counts */
    const regions = new Map();
    rows.forEach(r => {
      if (!r.region || !isRegional(r)) return;
      if (!regions.has(r.region)) regions.set(r.region, {
        region: r.region, ewc: r.ewc, zone: r.zone,
        athletes: new Set(), entries: 0, qualifiers: new Set(),
      });
      const x = regions.get(r.region);
      x.athletes.add(r.athlete);
      x.entries++;
      if (r.advancesToZone) x.qualifiers.add(r.athlete);
    });

    const zoneRows = [...zones.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(z => {
      return `<tr>
        <td class="r-name">${esc(z.name)}</td>
        <td>${esc(z.ewc || '—')}</td>
        <td class="mono">${z.athletes.size}</td>
        <td class="mono">${z.regEntries}</td>
        <td class="mono">${z.zoneEntries}</td>
        <td class="mono">${z.toNat.size}</td>
        <td class="mono">${z.toEWC.size}</td>
        <td class="mono small">A:${z.groups['Group A']} B:${z.groups['Group B']} C:${z.groups['Group C']} D:${z.groups['Group D']}</td>
        <td class="mono small">♂${z.gender.Boys} ♀${z.gender.Girls}</td>
      </tr>`;
    }).join('');

    const regionRows = [...regions.values()]
      .sort((a,b) => Number(a.region) - Number(b.region))
      .map(x => `<tr>
        <td class="r-name">Region ${esc(String(x.region))}</td>
        <td>${esc(x.zone||'—')} · ${esc(x.ewc||'—')}</td>
        <td class="mono">${x.athletes.size}</td>
        <td class="mono">${x.entries}</td>
        <td class="mono">${x.qualifiers.size}</td>
        <td class="mono">${pct(x.qualifiers.size, x.athletes.size)}</td>
      </tr>`).join('');

    return `<div class="rpt-subsection">
      <div class="rpt-subsection-title">By zone <span class="rpt-pill">${zones.size}</span></div>
      <div class="rpt-table-scroll">
        <table class="rpt-table"><thead><tr>
          <th>Zone</th><th>E/W/C</th><th>Athletes</th><th>Reg entries</th><th>Zone entries</th>
          <th>→ Nat</th><th>→ EWC</th><th>Group mix (zone)</th><th>Gender (zone)</th>
        </tr></thead><tbody>${zoneRows || '<tr><td colspan="9" class="empty">No data</td></tr>'}</tbody></table>
      </div>
    </div>
    <div class="rpt-subsection">
      <div class="rpt-subsection-title">By region (Regionals stage) <span class="rpt-pill">${regions.size}</span></div>
      <div class="rpt-table-scroll">
        <table class="rpt-table"><thead><tr>
          <th>Region</th><th>Zone · E/W/C</th><th>Athletes</th><th>Entries</th><th>Qualified to Zones</th><th>Qual rate</th>
        </tr></thead><tbody>${regionRows || '<tr><td colspan="6" class="empty">No data</td></tr>'}</tbody></table>
      </div>
    </div>`;
  }

  /* — Age × Gender × Stage matrix — */
  function renderMatrixBreakdown(){
    const rows = buildBreakdownsBase();
    const groups = ['Group A','Group B','Group C','Group D'];
    const genders = ['Boys','Girls'];
    const stages = ['Regionals','Zones'];

    /* Athlete counts per (group, gender, stage) — distinct athletes */
    function key(g,x,s){ return g+'|'+x+'|'+s; }
    const sets = new Map();
    rows.forEach(r => {
      if (!groups.includes(r.ageGroup) || !genders.includes(r.gender)) return;
      const s = isRegional(r) ? 'Regionals' : (isZone(r) ? 'Zones' : null);
      if (!s) return;
      const k = key(r.ageGroup, r.gender, s);
      if (!sets.has(k)) sets.set(k, new Set());
      sets.get(k).add(r.athlete);
    });
    /* Also pull EWC/Nat from registration/qualifier lists by name */
    const natKeys = natQualifierKeys();
    const ewcKeys = ewcRegisteredKeys();
    function nameToProfile(){
      const map = new Map();
      rows.forEach(r => {
        if (!groups.includes(r.ageGroup) || !genders.includes(r.gender)) return;
        const k = norm(r.athlete);
        if (!map.has(k)) map.set(k, {ageGroup:r.ageGroup, gender:r.gender});
      });
      return map;
    }
    const profile = nameToProfile();
    const ewcCount = new Map(), natCount = new Map();
    profile.forEach((p, nk) => {
      if (ewcKeys.has(nk)) {
        const k = p.ageGroup + '|' + p.gender + '|' + 'EWC';
        ewcCount.set(k, (ewcCount.get(k)||0) + 1);
      }
      if (natKeys.has(nk)) {
        const k = p.ageGroup + '|' + p.gender + '|' + 'Nationals';
        natCount.set(k, (natCount.get(k)||0) + 1);
      }
    });

    function cellHtml(g, x, s){
      let v = 0;
      if (s === 'EWC') v = ewcCount.get(g+'|'+x+'|EWC') || 0;
      else if (s === 'Nationals') v = natCount.get(g+'|'+x+'|Nationals') || 0;
      else v = (sets.get(key(g,x,s)) || new Set()).size;
      const intensity = Math.min(1, v / 80);
      return `<td class="mono mtx" style="background:rgba(23,31,105,${0.04 + intensity*0.18})">${v||''}</td>`;
    }

    const allStages = stagesForYear(selectedYear());
    const headerRow = `<tr><th>Group / Gender</th>${allStages.map(s => `<th>${s}</th>`).join('')}</tr>`;
    const bodyRows = groups.flatMap(g => genders.map(x => `
      <tr>
        <td class="r-name">${esc(g)} ${esc(x)}</td>
        ${allStages.map(s => cellHtml(g,x,s)).join('')}
      </tr>`)).join('');

    return `<div class="rpt-subsection">
      <div class="rpt-subsection-title">Athlete count by group × gender × stage</div>
      <div class="rpt-note">Darker shading = larger cohort. Useful for spotting drop-off patterns between groups.</div>
      <table class="rpt-table">
        <thead>${headerRow}</thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
  }

  /* — Zone strength: per-zone-event qualifier efficiency — */
  function renderZoneStrengthBreakdown(){
    const all = allResults();
    const evMap = new Map();
    all.forEach(r => {
      if (!isZone(r) || !rowMatchesFilters(r)) return;
      const key = r.eventKey + '||Z' + (r.zone || '?');
      if (!evMap.has(key)) evMap.set(key, {
        eventKey: r.eventKey, zone: r.zone || '?', ewc: r.ewc || '',
        entries: 0, athletes: new Set(),
        natQuals: 0, ewcQuals: 0, threshold: null, top1: null,
      });
      const e = evMap.get(key);
      e.entries++;
      e.athletes.add(r.athlete);
      if (r.advancesToNationals) e.natQuals++;
      if (r.advancesToEWC) e.ewcQuals++;
      if (Number(r.placeNumber) === 1 && Number.isFinite(r.score)) e.top1 = r.score;
    });

    const events = [...evMap.values()].sort((a,b) => a.eventKey.localeCompare(b.eventKey) || a.zone.localeCompare(b.zone));

    /* For each eventKey, find min/max top-1 score so we can show
       which zone produced the highest scoring 1st place */
    const byEventKey = groupBy(events, e => e.eventKey);
    const bestZone = new Map(); // eventKey -> {zone, score}
    byEventKey.forEach((arr, k) => {
      let best = null;
      arr.forEach(e => { if (e.top1 != null && (!best || e.top1 > best.top1)) best = e; });
      if (best) bestZone.set(k, best.zone);
    });

    const rows = events.map(e => `<tr>
      <td class="r-name">${esc(e.eventKey)}</td>
      <td>Z${esc(e.zone)} <span class="cell-sub">${esc(e.ewc)}</span></td>
      <td class="mono">${e.entries}</td>
      <td class="mono">${e.athletes.size}</td>
      <td class="mono">${e.natQuals}</td>
      <td class="mono">${e.ewcQuals}</td>
      <td class="mono">${e.top1 != null ? fmtScore(e.top1) : '—'} ${bestZone.get(e.eventKey)===e.zone?'<span class="badge badge-green">High</span>':''}</td>
    </tr>`).join('');

    return `<div class="rpt-subsection">
      <div class="rpt-subsection-title">Zone events — competitive strength <span class="rpt-pill">${events.length}</span></div>
      <div class="rpt-note">Each row is one event at one zone. "High" tag marks the zone with the highest 1st-place score for that event across all zones — the toughest zone for that event.</div>
      <div class="rpt-table-scroll">
        <table class="rpt-table"><thead><tr>
          <th>Event</th><th>Zone · EWC</th><th>Entries</th><th>Athletes</th>
          <th>→ Nat (top 3)</th><th>→ EWC (4-18)</th><th>Top-1 score</th>
        </tr></thead><tbody>${rows||'<tr><td colspan="7" class="empty">No data</td></tr>'}</tbody></table>
      </div>
    </div>`;
  }

  /* — Gender mix — */
  function renderGenderMixBreakdown(){
    const rows = buildBreakdownsBase();
    const splitBy = (keyFn) => {
      const m = new Map();
      rows.forEach(r => {
        const k = keyFn(r); if (!k) return;
        if (!m.has(k)) m.set(k, {Boys: new Set(), Girls: new Set()});
        const slot = m.get(k);
        if (r.gender === 'Boys') slot.Boys.add(r.athlete);
        else if (r.gender === 'Girls') slot.Girls.add(r.athlete);
      });
      return m;
    };

    function renderSplit(title, map, labelPrefix){
      const sorted = [...map.entries()].sort(([a],[b]) => String(a).localeCompare(String(b)));
      const body = sorted.map(([k, v]) => {
        const b = v.Boys.size, g = v.Girls.size, t = b + g;
        const bp = t ? (b/t*100) : 0;
        const gp = t ? (g/t*100) : 0;
        return `<tr>
          <td class="r-name">${esc(labelPrefix)}${esc(String(k))}</td>
          <td class="mono">${b}</td>
          <td class="mono">${g}</td>
          <td>
            <div class="gm-bar">
              <div class="gm-bar-b" style="width:${bp}%" title="Boys ${bp.toFixed(0)}%"></div>
              <div class="gm-bar-g" style="width:${gp}%" title="Girls ${gp.toFixed(0)}%"></div>
            </div>
          </td>
          <td class="mono">${bp.toFixed(0)}% / ${gp.toFixed(0)}%</td>
        </tr>`;
      }).join('');
      return `<div class="rpt-subsection">
        <div class="rpt-subsection-title">${esc(title)}</div>
        <table class="rpt-table"><thead><tr>
          <th>${esc(title.split(' by ').pop()||'Slice')}</th><th>Boys</th><th>Girls</th><th>Mix</th><th>%</th>
        </tr></thead><tbody>${body || '<tr><td colspan="5" class="empty">No data</td></tr>'}</tbody></table>
      </div>`;
    }

    const byZone     = splitBy(r => r.zone);
    const byGroup    = splitBy(r => r.ageGroup);
    const byDiscipline = splitBy(r => r.discipline);
    const byEwc      = splitBy(r => r.ewc);

    return renderSplit('Gender split by Zone',       byZone, 'Zone ')
         + renderSplit('Gender split by Age group',  byGroup, '')
         + renderSplit('Gender split by Discipline', byDiscipline, '')
         + renderSplit('Gender split by E/W/C',      byEwc, '');
  }

  window._rptBreakdown = function(view){
    rptState.breakdownView = view;
    renderReports();
  };

  /* ====================================================================
     PANEL 5 · DISPLACEMENT (kept from prior version)
     ==================================================================== */
  function buildDisplacementData(){
    const all = allResults();
    function ok(r){ return rowMatchesFilters(r); }

    const nd      = all.filter(r => r.nonDisplacing && r.qualifyingEvent && !r.statusOnly && ok(r));
    const bumps   = all.filter(r => r.bumpIn  && ok(r));
    const shifts  = all.filter(r => r.spotShifted && ok(r));
    const opened  = all.filter(r => r.openedSpot && ok(r));

    const byCategory = {};
    nd.forEach(r => {
      const cat = (r.foreignDeclared || r.webpointNonUsEffective) ? 'Foreign'
        : r.dualOtherCountry ? 'Dual (affects results)'
        : r.dualDeclared ? 'Dual citizen'
        : r.hps ? 'HPS'
        : r.ymca ? 'YMCA'
        : 'Other non-displacing';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(r);
    });

    const byAthlete = new Map();
    nd.forEach(r => {
      const k = r.athlete;
      if (!byAthlete.has(k)) byAthlete.set(k, {
        athlete: r.athlete, diveMeetsId: r.diveMeetsId, team: r.team,
        category: '', stages: new Set(), zones: new Set(),
        events: [], openedSpots: 0,
      });
      const a = byAthlete.get(k);
      if (!a.category) {
        a.category = (r.foreignDeclared||r.webpointNonUsEffective) ? 'Foreign'
          : r.dualOtherCountry ? 'Dual (affects results)'
          : r.dualDeclared ? 'Dual citizen'
          : r.hps ? 'HPS' : r.ymca ? 'YMCA' : 'Other';
      }
      a.stages.add(r.stage);
      if (r.zone) a.zones.add(r.zone);
      if (!a.events.some(e => e.eventKey === r.eventKey && e.stage === r.stage)) {
        a.events.push({stage:r.stage, zone:r.zone||'', eventKey:r.eventKey,
          place:r.place, score:r.score, openedSpot:r.openedSpot,
          qualificationStatus:r.qualificationStatus});
      }
      if (r.openedSpot) a.openedSpots++;
    });

    return {
      ndAthletes: [...byAthlete.values()],
      byCategory, bumps, shifts, opened,
      totalNDEntries: nd.length,
    };
  }

  function renderDisplacementPanel(wrap){
    const d = buildDisplacementData();
    const catSummary = Object.entries(d.byCategory).map(([cat, rows]) => {
      const athletes = new Set(rows.map(r => r.athlete)).size;
      const events = new Set(rows.map(r => r.eventId)).size;
      const stages = new Set(rows.map(r => r.stage));
      return `<div class="rpt-summary-card">
        <div class="rsc-count">${athletes}</div>
        <div class="rsc-label">${esc(cat)}</div>
        <div class="rsc-sub">${rows.length} entries · ${events} events · ${[...stages].join(', ')}</div>
      </div>`;
    }).join('') || '<div class="rpt-empty">No non-displacing athletes match the current filters.</div>';

    const athRows = d.ndAthletes
      .sort((a,b) => (a.category||'').localeCompare(b.category||'') || a.athlete.localeCompare(b.athlete))
      .map(a => {
        const stageStr = [...a.stages].join(', ');
        const zoneStr  = [...a.zones].join(', ');
        const dm = a.diveMeetsId ? `<a class="ext-link" target="_blank" rel="noopener" href="https://www.divemeets.com/profile.php?id=${esc(a.diveMeetsId)}">${esc(a.diveMeetsId)}</a>` : '—';
        const eventList = a.events.map(e =>
          `<div class="cell-sub">${esc(e.stage)} ${e.zone?'Z'+e.zone:''}: ${esc(e.eventKey)} — #${esc(e.place||'?')} (${esc(String(e.score||''))})</div>`
        ).join('');
        const catCls = (a.category||'').includes('Foreign') ? 'badge-red'
                     : (a.category||'').includes('Dual')    ? 'badge-pool'
                     : (a.category||'').includes('HPS')     ? 'badge-purple'
                     : (a.category||'').includes('YMCA')    ? 'badge-pool' : '';
        return `<tr>
          <td class="r-name">${esc(a.athlete)}</td>
          <td>${dm}</td>
          <td>${esc(a.team || '—')}</td>
          <td><span class="badge ${catCls}">${esc(a.category||'')}</span></td>
          <td>${esc(zoneStr || '—')}</td>
          <td>${esc(stageStr)}</td>
          <td>${eventList}</td>
          <td class="mono">${a.openedSpots > 0 ? `<span style="color:var(--q-direct)">${a.openedSpots} opened</span>` : '—'}</td>
        </tr>`;
      }).join('');

    const bumpSection = d.bumps.length ? `
      <div class="rpt-subsection">
        <div class="rpt-subsection-title">Athletes bumped into qualifying positions <span class="rpt-pill">${d.bumps.length}</span></div>
        <table class="rpt-table"><thead><tr>
          <th>Athlete</th><th>Team</th><th>Stage</th><th>Event</th><th>Place</th><th>Bumped by</th>
        </tr></thead><tbody>${d.bumps.map(r => `<tr>
          <td class="r-name">${esc(r.athlete)}</td>
          <td>${esc(r.team||'')}</td>
          <td>${esc(r.stage)}</td>
          <td>${esc(r.eventKey||'')}</td>
          <td class="mono">${esc(r.place||'')}</td>
          <td class="cell-sub">${(r.bumpedBy||[]).map(b=>esc(b.athlete)).join(', ')||'—'}</td>
        </tr>`).join('')}</tbody></table>
      </div>` : '';

    wrap.innerHTML = `
      <div class="rpt-section">
        <div class="rpt-section-title">
          Displacements
          <button class="rpt-export-btn" onclick="window._rptExportDisplacement()">Download CSV</button>
        </div>
        <div class="rpt-note">Non-displacing athletes compete but don't consume a qualifying spot — the next eligible US athlete moves up.</div>
        <div class="rpt-summary-row">${catSummary}</div>
        ${d.ndAthletes.length ? `
        <div class="rpt-subsection">
          <div class="rpt-subsection-title">All non-displacing athletes <span class="rpt-pill">${d.ndAthletes.length}</span></div>
          <div class="rpt-table-scroll">
            <table class="rpt-table"><thead><tr>
              <th>Athlete</th><th>DiveMeets</th><th>Team</th><th>Category</th>
              <th>Zone(s)</th><th>Stage(s)</th><th>Events &amp; results</th><th>Impact</th>
            </tr></thead><tbody>${athRows}</tbody></table>
          </div>
        </div>` : ''}
        ${bumpSection}
      </div>`;
  }

  window._rptExportDisplacement = function(){
    const d = buildDisplacementData();
    const lines = ['Athlete,DiveMeetsID,Team,Category,Zones,Stages,Events,SpotsOpened'];
    d.ndAthletes.forEach(a => {
      lines.push([
        a.athlete, a.diveMeetsId||'', a.team||'', a.category||'',
        [...a.zones].join('|'), [...a.stages].join('|'),
        a.events.map(e => `${e.stage} ${e.eventKey} #${e.place}`).join('|'),
        a.openedSpots,
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    });
    downloadCSV(lines.join('\n'), 'displacement-report.csv');
  };

  /* ====================================================================
     PANEL 6 · SPECIAL STATUS (kept and tidied)
     ==================================================================== */
  function buildStatusData(){
    const all = allResults();
    const foreign   = all.filter(r => (r.foreignDeclared || r.webpointNonUsEffective) && !r.statusOnly);
    const dual      = all.filter(r => r.dualDeclared && !r.statusOnly);
    const dualOC    = all.filter(r => r.dualOtherCountry && !r.statusOnly);
    const hps       = all.filter(r => r.hps && !r.statusOnly);
    const ymca      = all.filter(r => r.ymca && !r.statusOnly);
    const petitions = all.filter(r => r.petition && !r.statusOnly);
    const keptInv   = all.filter(r => r.keptInvitedJoNationals && !r.statusOnly);
    const review    = all.filter(r => r.reviewFlags?.length && !r.statusOnly);
    const uniq = arr => new Set(arr.map(r => r.athlete));
    return {
      foreign:  {athletes:uniq(foreign).size,  entries:foreign.length,  rows:foreign},
      dual:     {athletes:uniq(dual).size,     entries:dual.length,     rows:dual},
      dualOC:   {athletes:uniq(dualOC).size,   entries:dualOC.length,   rows:dualOC},
      hps:      {athletes: ewcHps().length || uniq(hps).size, entries:hps.length, rows:hps},
      ymca:     {athletes:uniq(ymca).size,     entries:ymca.length,     rows:ymca},
      petitions:{athletes:uniq(petitions).size,entries:petitions.length,rows:petitions},
      keptInv:  {athletes:uniq(keptInv).size,  entries:keptInv.length,  rows:keptInv},
      review:   {athletes:uniq(review).size,   entries:review.length,   rows:review},
    };
  }

  function renderStatusPanel(wrap){
    const d = buildStatusData();
    function section(title, data, note, badgeCls){
      if (!data.athletes && !data.rows.length) return '';
      const athletes = [...new Map(data.rows.map(r => [r.athlete, r])).values()]
        .sort((a,b) => a.athlete.localeCompare(b.athlete));
      const rows = athletes.map(r => {
        const stageRows = data.rows.filter(x => x.athlete === r.athlete);
        const stages = [...new Set(stageRows.map(x => x.stage))].join(', ');
        const zones  = [...new Set(stageRows.map(x => x.zone).filter(Boolean))].join(', ');
        const events = [...new Set(stageRows.map(x => x.eventKey).filter(Boolean))].join('; ');
        const dm = r.diveMeetsId ? `<a class="ext-link" target="_blank" rel="noopener" href="https://www.divemeets.com/profile.php?id=${esc(r.diveMeetsId)}">${esc(r.diveMeetsId)}</a>` : '—';
        return `<tr><td class="r-name">${esc(r.athlete)}</td><td>${dm}</td><td>${esc(r.team||'—')}</td><td>${esc(stages)}</td><td>${esc(zones||'—')}</td><td class="cell-sub">${esc(events)}</td></tr>`;
      }).join('');
      return `<div class="rpt-subsection">
        <div class="rpt-subsection-title">
          ${esc(title)} <span class="rpt-pill">${data.athletes}</span>
          ${note ? `<span class="rpt-pill-note">${esc(note)}</span>` : ''}
        </div>
        <table class="rpt-table"><thead><tr>
          <th>Athlete</th><th>DiveMeets</th><th>Team</th><th>Stage(s)</th><th>Zone(s)</th><th>Events</th>
        </tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty">None</td></tr>'}</tbody></table>
      </div>`;
    }

    const hpsList = ewcHps();
    const hpsSection = `<div class="rpt-subsection">
      <div class="rpt-subsection-title">HPS Tier 3 Junior squad <span class="rpt-pill">${hpsList.length}</span>
        <span class="rpt-pill-note">Pre-qualified to JO Nationals prelims · not competing at E/W/C</span>
      </div>
      <table class="rpt-table"><thead><tr>
        <th>Athlete</th><th>Gender</th><th>Age group</th><th>Status</th>
      </tr></thead><tbody>${hpsList.map(h => `<tr>
        <td class="r-name">${esc(h.name)}</td>
        <td>${h.gender === 'F' ? 'Girls' : 'Boys'}</td>
        <td>${esc(h.ageGroup||'')}</td>
        <td><span class="badge badge-purple">Pre-qualified</span></td>
      </tr>`).join('')}</tbody></table>
    </div>`;

    const ewcForeignList = ewcForeign();
    const ewcForeignSection = ewcForeignList.length ? `<div class="rpt-subsection">
      <div class="rpt-subsection-title">Foreign athletes registered at E/W/C <span class="rpt-pill">${ewcForeignList.length}</span>
        <span class="rpt-pill-note">Non-displacing — compete but do not take qualifying spots</span>
      </div>
      <table class="rpt-table"><thead><tr>
        <th>Athlete</th><th>Meet</th><th>Group</th><th>Gender</th><th>Events</th>
      </tr></thead><tbody>${ewcForeignList.map(f => `<tr>
        <td class="r-name">${esc(f.name)}</td>
        <td><span class="badge badge-blue">${esc(f.meet)}</span></td>
        <td>${esc(f.group||'')}</td>
        <td>${esc(f.gender||'')}</td>
        <td class="cell-sub">${(f.events||[]).join(', ')}</td>
      </tr>`).join('')}</tbody></table>
    </div>` : '';

    const ewcDualList = ewcDual();
    const dualSection = ewcDualList.length ? `<div class="rpt-subsection">
      <div class="rpt-subsection-title">Dual citizens (other federation) <span class="rpt-pill">${ewcDualList.length}</span>
        <span class="rpt-pill-note">Competed for another federation — affects qualification</span>
      </div>
      <table class="rpt-table"><thead><tr>
        <th>Athlete</th><th>Gender</th><th>Federation</th><th>Events / dates</th>
      </tr></thead><tbody>${ewcDualList.map(dc => `<tr>
        <td class="r-name">${esc(dc.name)}</td>
        <td>${esc(dc.gender||'')}</td>
        <td><strong>${esc(dc.federationRepresented||'')}</strong></td>
        <td class="cell-sub">${esc((dc.events||'').slice(0,120))}${(dc.events||'').length>120?'…':''}</td>
      </tr>`).join('')}</tbody></table>
    </div>` : '';

    wrap.innerHTML = `
      <div class="rpt-section">
        <div class="rpt-section-title">
          Special status athletes
          <button class="rpt-export-btn" onclick="window._rptExportStatus()">Download CSV</button>
        </div>
        ${ewcForeignSection}
        ${dualSection}
        ${hpsSection}
        ${section('YMCA event champions', d.ymca, 'Pre-qualified to E/W/C prelims · non-displacing')}
        ${d.petitions.athletes ? section('Medical petition — approved', d.petitions, 'Approved by CCE/staff') : ''}
        ${d.keptInv.athletes  ? section('Kept invited (dual/policy)', d.keptInv, 'Invited despite dual status') : ''}
        ${d.review.athletes   ? section('Flagged for review', d.review, 'Staff attention needed') : ''}
      </div>`;
  }

  window._rptExportStatus = function(){
    const d = buildStatusData();
    const lines = ['Category,Athlete,DiveMeetsID,Team,Stage,Zone,Event'];
    [['Foreign',d.foreign.rows],['Dual',d.dual.rows],['Dual(other-country)',d.dualOC.rows],
     ['HPS',d.hps.rows],['YMCA',d.ymca.rows],['Petition',d.petitions.rows],
     ['Kept invited',d.keptInv.rows],['Review',d.review.rows]
    ].forEach(([cat, rows]) => {
      rows.forEach(r => {
        lines.push([cat, r.athlete, r.diveMeetsId||'', r.team||'',
                    r.stage, r.zone||'', r.eventKey||'']
          .map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
      });
    });
    downloadCSV(lines.join('\n'), 'special-status.csv');
  };

  /* ── CSV helper ──────────────────────────────────────────────── */
  function downloadCSV(text, filename){
    const blob = new Blob([text], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  }

  /* ── Chrome control (hide main app's irrelevant view-tabs / sidebar) ── */
  function applyReportsChrome(){
    document.body.classList.add('rpt-stage-active');
  }
  function unwindReportsChrome(){
    document.body.classList.remove('rpt-stage-active');
  }
  function setupStageWatcher(){
    if (window._rptStageWatcher) return;
    const tick = () => {
      try {
        let isReports = false;
        // Prefer the app's state object
        if (typeof state !== 'undefined' && state && typeof state.stage === 'string') {
          const s = state.stage.toLowerCase();
          isReports = s === 'reports' || s === 'analytics' || s.includes('report');
        }
        // Fallback: look at the active stage-nav button
        if (!isReports) {
          const nav = document.getElementById('stageNav');
          if (nav) {
            const active = nav.querySelector('.is-active, .active, [aria-current="page"], [aria-pressed="true"]');
            const txt = (active?.textContent || '').toLowerCase();
            if (txt.includes('report') || txt.includes('analytics')) isReports = true;
          }
        }
        if (isReports) applyReportsChrome(); else unwindReportsChrome();
      } catch (e) { /* ignore */ }
    };
    window._rptStageWatcher = setInterval(tick, 250);
    tick();
  }

  /* ── Top header (panel tabs + filter chips) ─────────────────── */
  const PANELS = [
    ['flow',         'Pipeline',          '📊'],
    ['cohort',       'Cohort tracker',    '🎯'],
    ['reconcile',    'Qual / Reg / Att',  '🎯'],
    ['scoring',      'Scoring',           '📈'],
    ['breakdowns',   'Breakdowns',        '🗂️'],
    ['displacement', 'Displacements',     '↔️'],
    ['status',       'Special status',    '🛡️'],
    ['historical',   'Historical (multi-year)', '📅'],
    ['declined',     'Declined Nationals', '🚫'],
    ['anomaly',      'Anomalies',          '⚠️'],
    ['career',       'Athlete career',     '🧬'],
    ['tier_entry',   'Tier entry (old sys)', '🪜'],
    ['rule_era',     'Rule era comparison', '⚖️'],
    ['trials_split', 'Trials Voluntary/Optional', '🤿'],
    ['hps',          'Jr HP Squad tracker', '🏅'],
    ['saved',        'Saved views',        '⭐'],
  ];

  /* Season context banner. Older seasons ran a different competition and in
     some cases a different set of rules, so the report says so rather than
     letting a 2016 result be read under 2026 assumptions. */
  function buildSeasonNotes(){
    const E = window.JuniorEras;
    if (!E) return '';
    const yr = (_yearOverrideRows ? rptState.selectedYear : _currentSeason);
    const notes = E.seasonNotes(yr) || [];
    const s = E.season(yr);
    const out = notes.slice();
    if (s && s.structure === 'region-zone-nationals' && yr < 2026) {
      out.push({ kind:'info', text:'This season ran Region → Zone → Junior Nationals. There was no East/West/Central round; that begins in 2026.' });
    }
    if (s && s.regionals && s.regionals.advance) {
      out.push({ kind:'rule', text:'Top ' + s.regionals.advance + ' per springboard event advanced from Regionals to Zones.' });
    }
    if (s && s.zones && s.zones.springboardAdvance) {
      out.push({ kind:'rule', text:'From Zones: springboard top ' + s.zones.springboardAdvance +
        ' and platform top ' + s.zones.platformAdvance + ' advanced to Junior Nationals.' });
    }
    if (s && s.zones && s.zones.direct) {
      out.push({ kind:'rule', text:'From Zones: top ' + s.zones.direct + ' direct to Junior Nationals, places ' +
        s.zones.toEWC[0] + '–' + s.zones.toEWC[1] + ' to East/West/Central.' });
    }
    const _lim = E.dataLimitations(yr, _currentSeason);
    if (_lim) out.push({ kind:'caveat', text: _lim.short });
    if (!qualRulesKnown() && yr !== _currentSeason) {
      out.push({ kind:'caveat', text:'Zone-qualifier counts are not shown for ' + yr +
        ': the Region advancement cutoff for this season is not confirmed. Placements and scores below are accurate.' });
    }
    if (!out.length) return '';
    const ic = { warn:'⚠', caveat:'⚠', info:'ℹ', rule:'§' };
    return `<div class="rpt-season-notes">` + out.map(n =>
      `<span class="rpt-season-note rpt-note-${n.kind}"><b>${ic[n.kind]||'ℹ'}</b> ${esc(n.text)}</span>`
    ).join('') + `</div>`;
  }

  function buildTopHeader(){
    const mkTab = ([k,l,ic]) =>
      `<button class="rpt-toptab ${rptState.panel===k?'is-active':''}" onclick="window._rptPanel('${k}')">
         <span class="rpt-toptab-ic">${ic}</span><span>${esc(l)}</span>
       </button>`;
    // Fixed split (not Math.ceil(PANELS.length/2)) so growing the "reports" group
    // (row B) never bleeds an item into the "view mode" group (row A) — the first
    // 7 entries are the canonical view-mode tabs and must stay together.
    const _half = 7;
    const tabsRowA = PANELS.slice(0, _half).map(mkTab).join('');
    const tabsRowB = PANELS.slice(_half).map(mkTab).join('');

    return `<div class="rpt-top">
      <div class="rpt-top-row1">
        <span class="rpt-top-eyebrow">Analytics &amp; Reports</span>
        <span class="rpt-year-selector" id="rpt-year-selector">${buildYearSelector()}</span>
        <span class="rpt-top-meta">${esc(activeFilterDescription())}</span>
        <span style="margin-left:auto;display:inline-flex;gap:6px">
          <button class="rpt-export-btn" onclick="window._rptShareUrl()" title="Copy a shareable URL of this view to clipboard">🔗 Share view</button>
          <button class="rpt-export-btn" onclick="window._rptGenerateReport()" title="Open a print-friendly version of this panel">📄 Generate report</button>
        </span>
      </div>
      <div class="rpt-top-row2"><div class="rpt-toptab-row">${tabsRowB}</div><div class="rpt-toptab-row">${tabsRowA}</div></div>
      <div class="rpt-top-row3">${buildFilterChips()}</div>
      ${buildSeasonNotes()}
    </div>`;
  }

  /* ── Year selector + Neon year loader ───────────────────────── */
  let _availableYears = null;   // populated async

  /* The app now spans 2013–2026. Several panels used to hard-code
     [2021..2025], which silently hid a decade of history once the older
     seasons loaded. Everything goes through this instead: the live list when
     it has arrived, and the full known range as a fallback rather than the
     recent slice. */
  function allYears(){
    if (_availableYears && _availableYears.length) return _availableYears.slice().sort((a,b)=>a-b);
    const E = window.JuniorEras;
    if (E) return E.seasons();
    return [2013,2014,2015,2016,2017,2018,2019,2021,2022,2023,2024,2025,2026];
  }
  function pastYears(){
    return allYears().filter(y => y !== _currentSeason);
  }

  /* Stages actually contested in a season. 2026 introduced East/West/Central;
     2013 and 2014 additionally ran the Age Group National Championships, a
     separate competition from the Junior Nationals. Hard-coding four stages
     hid both. */
  function stagesForYear(year){
    const E = window.JuniorEras;
    const y = Number(year) || _currentSeason;
    if (E && E.season(y)) return E.season(y).stages.slice();
    return ['Regionals','Zones','EWC','Nationals'];
  }
  function selectedYear(){
    return (_yearOverrideRows ? rptState.selectedYear : _currentSeason);
  }
  function stageLabelFor(stage){
    const E = window.JuniorEras;
    return E ? E.stageLabel(stage) : stage;
  }
  let _yearLoading = false;
  let _yearLoadError = null;

  function buildYearSelector(){
    const cur = (_yearOverrideRows ? rptState.selectedYear : _currentSeason);
    if (_yearLoading) {
      return `<span class="rpt-year-badge rpt-year-loading">⏳ Loading ${esc(rptState.selectedYear)}…</span>`;
    }
    if (!_availableYears) {
      // Trigger background load of available years
      fetchAvailableYears();
      return `<span class="rpt-year-badge">${cur} <span class="rpt-soft">(loading year list…)</span></span>`;
    }
    const opts = _availableYears.map(y => {
      const label = (y === _currentSeason) ? `${y} (current)` : `${y}`;
      return `<option value="${y}" ${y===cur?'selected':''}>${label}</option>`;
    }).join('');
    return `
      <label class="rpt-year-lbl">Season:</label>
      <select class="rpt-year-select" onchange="window._rptSetYear(parseInt(this.value,10))">${opts}</select>
      ${cur !== _currentSeason ? `<button class="rpt-year-reset" onclick="window._rptSetYear(${_currentSeason})" title="Back to current season">↩</button>` : ''}
      ${_yearLoadError ? `<span class="rpt-year-err">${esc(_yearLoadError)}</span>` : ''}
    `;
  }

  async function loadCurrentSeason(){
    try {
      const r = await neonQuery(
        "SELECT COALESCE(NULLIF(value,'')::int, NULL) AS y FROM app_meta.config " +
        "WHERE key = 'current_season_year'");
      const y = r && r.rows && r.rows[0] && r.rows[0].y;
      if (y) {
        _currentSeason = Number(y);
        if (window.JuniorEras) window.JuniorEras.setCurrentSeason(_currentSeason);
      }
    } catch (e) {
      console.warn('[season] current_season_year unavailable, using', _currentSeason, e);
    }
    return _currentSeason;
  }

  async function fetchAvailableYears(){
    await loadCurrentSeason();
    if (_availableYears !== null) return _availableYears;
    try {
      const r = await neonQuery("SELECT DISTINCT year FROM core.event_results WHERE year IS NOT NULL AND is_junior_circuit ORDER BY year DESC");
      _availableYears = r.rows.map(x => Number(x.year)).filter(y => y);
      // Detect current season from data: max year that has the most recent activity
      // (use 2026 default which matches app_meta config)
      const sel = document.getElementById('rpt-year-selector');
      if (sel) sel.innerHTML = buildYearSelector();
    } catch (e) {
      console.warn('[year-selector] failed to load year list', e);
      _yearLoadError = 'Year list unavailable';
      const sel = document.getElementById('rpt-year-selector');
      if (sel) sel.innerHTML = buildYearSelector();
    }
    return _availableYears;
  }

  /* Convert one or many Neon rows for a year into the
     JUNIOR_RESULTS_DATA.results-compatible shape the existing panels expect.
     Aggregates Prelim/Semi/Final rounds into one row per athlete-event-meet
     (using Final placement when available, falling back to Semi then Prelim). */
  /* Region -> Zone advancement for a historical season.
     Top 15 is the 2019 rule book number and holds from 2019 through 2026, but
     it is NOT universal: the 2014 book sends the top 6 per springboard event to
     the East/West Spring Nationals and does not set the Zones number in Subpart
     C at all, and 2015-2018 sat under revisions that have not been checked.
     Marking a 12th-place 2013 finisher as a Zone qualifier because 2019 said
     top 15 would be a fabrication, so unknown seasons return null and the
     panels show the flag as indeterminate rather than false. */
  function regionAdvanceFor(year){
    const E = window.JuniorEras;
    const s = E && E.season(Number(year));
    if (!s || !s.verified || !s.regionals) return null;
    return (typeof s.regionals.advance === 'number') ? s.regionals.advance : null;
  }

  /* True when the selected season's Region->Zone cutoff is confirmed. Panels
     use this to distinguish "did not advance" from "we cannot say". */
  function qualRulesKnown(){ return regionAdvanceFor(selectedYear()) != null; }

  function transformYearRows(rows){
    const _advN = regionAdvanceFor(selectedYear());
    const _qual = function(place){
      if (_advN == null || place == null) return null;   // unknown for this season
      return place <= _advN;
    };
    const grouped = {};
    for (const r of rows){
      const key = (r.meet_name||'')+'|'+(r.event_key||r.event_name||'')+'|'+(r.diver_id_dm||'');
      if (!grouped[key]){
        grouped[key] = { sample: r, rounds: {} };
      }
      const rd = r.round || 'Final';
      grouped[key].rounds[rd] = { place: r.place != null ? Number(r.place) : null, score: r.score != null ? Number(r.score) : null };
    }
    const out = [];
    for (const k in grouped){
      const g = grouped[k];
      const s = g.sample;
      // Pick effective place/score
      let place = null, score = null, sourceRound = null;
      if (g.rounds.Final && g.rounds.Final.place != null) {
        place = g.rounds.Final.place; score = g.rounds.Final.score; sourceRound = 'Final';
      } else if (g.rounds.Semifinal && g.rounds.Semifinal.place != null) {
        place = g.rounds.Semifinal.place; score = g.rounds.Semifinal.score; sourceRound = 'Semifinal';
      } else if (g.rounds.Prelim && g.rounds.Prelim.place != null) {
        place = g.rounds.Prelim.place; score = g.rounds.Prelim.score; sourceRound = 'Prelim';
      }
      out.push({
        id: (s.stage||'?')+'|'+(s.meet_name||'?')+'|'+(s.event_name||'?')+'|'+(s.diver_id_dm||'?'),
        stage: s.stage || '',
        meetName: s.meet_name || '',
        meetIdDivemeets: s.meet_id_dm != null ? String(s.meet_id_dm) : '',
        region: s.region != null ? Number(s.region) : null,
        zone: s.zone || '',
        ewc: s.ewc_meet || '',
        eventName: s.event_name || '',
        eventId: (s.stage||'?')+'|'+(s.meet_name||'?')+'|'+(s.event_name||'?'),
        eventKey: s.event_key || '',
        eventCategory: 'Qualifying Event',
        qualifyingEvent: true,
        ageGroup: s.age_group || '',
        gender: s.gender || '',
        discipline: s.discipline || '',
        isSynchro: !!s.is_synchro,
        diveMeetsId: s.diver_id_dm != null ? String(s.diver_id_dm) : '',
        first: s.diver_first || '',
        last: s.diver_last || '',
        athlete: ((s.diver_first||'')+' '+(s.diver_last||'')).trim(),
        team: s.team_name || '',
        place: place != null ? String(place) : '',
        placeNumber: place != null ? Number(place) : null,
        score: score != null ? Number(score) : null,
        // Round-specific (new field, additive)
        prelimPlace: g.rounds.Prelim ? g.rounds.Prelim.place : null,
        prelimScore: g.rounds.Prelim ? g.rounds.Prelim.score : null,
        semiPlace:   g.rounds.Semifinal ? g.rounds.Semifinal.place : null,
        semiScore:   g.rounds.Semifinal ? g.rounds.Semifinal.score : null,
        finalPlace:  g.rounds.Final ? g.rounds.Final.place : null,
        finalScore:  g.rounds.Final ? g.rounds.Final.score : null,
        madeFinal:   !!g.rounds.Final,
        primarySourceRound: sourceRound,
        // Status fields not available for historical years — defaults so panels don't crash
        citizenship: '',
        usCitizen: '',
        membershipCitizenStatus: 'Historical data — status not tracked',
        foreignDeclared: false,
        foreignDeclarationDetail: '',
        dualDeclared: false,
        dualOtherCountry: false,
        dualSportNationalityStatus: 'No declaration',
        dualDeclarationDetail: '',
        hps: false,
        ymca: false,
        prequalified: false,
        prequalification: [],
        webpointNonUs: false,
        citizenshipUnknown: true,
        foreignInternational: false,
        nonDisplacing: false,
        nonDisplacingReason: '',
        countsTowardTop15: true,
        countingRank: null,
        regionAdvanceCutoff: _advN,
        qualificationRulesKnown: _advN != null,
        top15Qualifier: _qual(place),
        officialThresholdScore: null,
        scoreMeetsOfficialThreshold: false,
        officialAverageScoreQualifier: false,
        officialQualified: _qual(place),
        officialQualifierRank: place,
        officialQualifierScore: score,
        officialQualifierType: '',
        officialQualifierRegion: s.region != null ? ('Region ' + s.region) : '',
        qualificationStatus: '',
        advancesToZone: s.stage === 'Regionals' ? _qual(place) : false,
        flags: [],
        reviewFlags: [],
        originalStatus: '',
        sourceRow: 0,
        bumpIn: false,
        spotShifted: false,
        openedSpot: false,
        bumpedBy: [],
        openedFor: [],
      });
    }
    return out;
  }

  function transformYearEvents(yearRows){
    // Derive minimal events list from the transformed rows
    const map = {};
    for (const r of yearRows){
      if (!r.eventId || map[r.eventId]) continue;
      map[r.eventId] = {
        id: r.eventId,
        stage: r.stage,
        meetName: r.meetName,
        region: r.region,
        zone: r.zone,
        ewc: r.ewc,
        eventName: r.eventName,
        eventKey: r.eventKey,
        eventCategory: 'Qualifying Event',
        qualifyingEvent: true,
        ageGroup: r.ageGroup,
        gender: r.gender,
        discipline: r.discipline,
        isSynchro: r.isSynchro,
        entries: 0,
        countableEntries: 0,
        nonDisplacingEntries: 0,
        foreignRows: 0,
        dualRows: 0,
        prequalifiedRows: 0,
        top15Qualifiers: 0,
        officialAverageQualifiers: 0,
        officialQualifiedRows: 0,
        bumpIns: 0,
        spotShifts: 0,
        openedSpots: 0,
      };
    }
    const _qCut = regionAdvanceFor(selectedYear());
    // Count entries per event
    for (const r of yearRows){
      if (!r.eventId || !map[r.eventId]) continue;
      map[r.eventId].entries += 1;
      map[r.eventId].countableEntries += 1;
      // Same era caveat as regionAdvanceFor(): 15 is the 2019-book number and
      // does not apply to every season. Count nothing when the cutoff for the
      // selected season is unknown, rather than counting against 15.
      if (_qCut != null && r.placeNumber != null && r.placeNumber <= _qCut) {
        map[r.eventId].top15Qualifiers += 1;
      }
    }
    return Object.values(map);
  }

  window._rptSetYear = async function(year){
    year = Number(year);
    if (!Number.isFinite(year)) return;
    if (year === _currentSeason) {
      _yearOverrideRows = null;
      _yearOverrideEvents = null;
      rptState.selectedYear = year;
      renderReports();
      return;
    }
    if (_yearDataCache[year]) {
      _yearOverrideRows = _yearDataCache[year].rows;
      _yearOverrideEvents = _yearDataCache[year].events;
      rptState.selectedYear = year;
      renderReports();
      return;
    }
    rptState.selectedYear = year;
    _yearLoading = true;
    _yearLoadError = null;
    // Re-render header to show loading state
    const ctx = document.getElementById('resultsContext');
    if (ctx) ctx.innerHTML = buildTopHeader();
    try {
      const r = await neonQuery(
        "SELECT meet_id_dm, meet_name, event_name, event_key, year, stage, "+
        "age_group, gender, discipline, is_synchro, region, zone, ewc_meet, "+
        "diver_id_dm, diver_first, diver_last, team_name, team_code, "+
        "round, place, score "+
        "FROM core.event_results "+
        "WHERE year = $1 AND is_junior_circuit AND NOT is_synchro "+
        "ORDER BY stage, meet_name, event_name, diver_id_dm, round",
        [year]
      );
      const rows = transformYearRows(r.rows);
      const events = transformYearEvents(rows);
      _yearDataCache[year] = { rows: rows, events: events };
      _yearOverrideRows = rows;
      _yearOverrideEvents = events;
      console.log('[year-selector] loaded', year, '— rows:', rows.length, 'events:', events.length);
    } catch (e) {
      console.error('[year-selector] failed', e);
      _yearLoadError = 'Load failed: ' + (e.message || e);
      _yearOverrideRows = null;
      _yearOverrideEvents = null;
      rptState.selectedYear = _currentSeason;
    } finally {
      _yearLoading = false;
    }
    renderReports();
  };

  function buildFilterChips(){
    const all = allResults();
    const opts = (vals) => [...new Set(vals.filter(Boolean))].sort((a,b) => {
      const na = Number(a), nb = Number(b);
      return (Number.isFinite(na) && Number.isFinite(nb)) ? na - nb : String(a).localeCompare(String(b));
    });

    const fields = [
      {key:'ageGroup',   label:'Age group',  opts:opts(all.map(r=>r.ageGroup)),  allLabel:'All ages'},
      {key:'gender',     label:'Gender',     opts:opts(all.map(r=>r.gender)),    allLabel:'All'},
      {key:'discipline', label:'Board',      opts:opts(all.map(r=>r.discipline)),allLabel:'All boards'},
      {key:'region',     label:'Region',     opts:opts(all.map(r=>r.region)),    allLabel:'All regions'},
      {key:'zone',       label:'Zone',       opts:opts(all.map(r=>r.zone)),      allLabel:'All zones'},
      {key:'ewc',        label:'E/W/C',      opts:opts(all.map(r=>r.ewc)),       allLabel:'All'},
      {key:'team',       label:'Team',       opts:opts(all.map(r=>r.team)),      allLabel:'All teams'},
    ];

    const chips = fields.map(f => {
      const val = rptState[f.key];
      const active = val ? 'is-active' : '';
      return `<div class="rpt-chip ${active}">
        <span class="rpt-chip-l">${esc(f.label)}</span>
        <select class="rpt-chip-s" onchange="window._rptFilter('${f.key}',this.value)">
          <option value="">${esc(f.allLabel)}</option>
          ${f.opts.map(o=>`<option value="${esc(o)}" ${val===String(o)?'selected':''}>${esc(o)}</option>`).join('')}
        </select>
        ${val ? `<button class="rpt-chip-x" onclick="event.stopPropagation();window._rptFilter('${f.key}','')" title="Clear ${esc(f.label)}">✕</button>` : ''}
      </div>`;
    }).join('');

    const activeCount = activeFilterCount();
    const clearBtn = activeCount > 0
      ? `<button class="rpt-chip-clear" onclick="window._rptClear()">Clear all (${activeCount})</button>`
      : `<span class="rpt-chip-hint">No filters — showing all athletes</span>`;

    return chips + clearBtn;
  }

  /* ── Funnel data builders (used by Cohort Tracker) ──────────── */
  function buildFunnelStages(d){
    const all = d.athletes;
    const reachedZones = all.filter(a => a.zonEvents.length > 0);
    const reachedEWC = all.filter(a =>
      a.atEWCRegistered || a.qualifiedToEWC || a.qualifiedToNationals || a.atNationals
    );
    const madeNationals = all.filter(a => a.atNationals);

    // Actually-competed-at-EWC: athletes with at least one row whose stage is 'E/W/C'
    const allRows = allResults();
    const ewcAttendedKeys = new Set();
    allRows.forEach(r => {
      if (r.stage === 'E/W/C' && r.athlete) ewcAttendedKeys.add(r.athlete.toLowerCase());
    });
    const actuallyAtEWC = all.filter(a => ewcAttendedKeys.has(a.key));

    const startLabel = 'In the 2026 pipeline';
    const startSub = d.entryStage === 'Zones'
      ? 'Direct-to-Zones starters (Groups C/D) — first appearance is at Zones'
      : 'All athletes with any Regionals or direct-to-Zones entry this season';

    return [
      { id:'start',     label:startLabel,
        sub:startSub,
        source:'Source: Regionals + Zones results in junior-data.js plus Official Zone Qualifier list for direct entrants',
        athletes:all },
      { id:'zones',     label:'Competed at Zones',
        sub:'Actually attended a Zone meet (≥1 Zone result row)',
        source:'Source: Zone Championship results in junior-data.js',
        athletes:reachedZones },
      { id:'ewc',       label:'E/W/C-eligible',
        sub:`${reachedEWC.length} athletes are on the E/W/C registration list, qualified from Zones, or on the Nationals qualifier list. <strong>Actually competed at E/W/C: ${actuallyAtEWC.length}.</strong>`,
        source:'Source: E/W/C registration data + Zone advancement flags + Jr Nationals qualifier list. Note: this row is the ELIGIBLE/REGISTERED set, not actual attendance.',
        athletes:reachedEWC,
        attendedCount: actuallyAtEWC.length },
      { id:'nationals', label:'On the Jr Nationals qualifier list',
        /* Says what this row IS rather than asserting the meet is in the
           future, which stopped being true the day it was scored. Actual
           attendance cannot be computed here: junior-data.js carries only
           Regionals, Zones and E/W/C rows, so the figure lives on the
           Nationals stage, which reads core.event_results. */
        sub:'Published qualifier list — who was invited. Actual attendance is on the Nationals stage.',
        source:'Source: jo-nat-qualifiers.js (USA Diving published list)',
        athletes:madeNationals },
    ];
  }

  function buildFunnelDrops(stages){
    const drops = [];
    const dropLabels = [
      'did not make it to Zones — finished at Regionals or did not show',
      'competed at Zones but did not advance to E/W/C tier',
      'reached E/W/C tier but did not make the Nationals list',
    ];
    for (let i = 0; i < stages.length - 1; i++) {
      const a = stages[i], b = stages[i+1];
      const inB = new Set(b.athletes.map(x => x.key));
      const dropped = a.athletes.filter(x => !inB.has(x.key));
      drops.push({
        id: `${a.id}_${b.id}`,
        from: a.id, to: b.id,
        label: dropLabels[i] || `dropped between ${a.label} and ${b.label}`,
        athletes: dropped,
      });
    }
    return drops;
  }

  function buildOutcomeCards(d){
    const total = d.total || 1;
    const b = d.buckets;
    const all = [
      { key:'madeNationals_direct',  label:'Direct to Nationals',                      hint:'Top-3 at zone event',                        color:'green' },
      { key:'madeNationals_viaEWC',  label:'Nationals via E/W/C',                      hint:'Registered + on Nat list',                   color:'green' },
      { key:'madeNationals_other',   label:'Nationals (other path)',                   hint:'HPS · kept-invited',                         color:'green' },
      { key:'atEWC_notNat',          label:'At E/W/C — not yet on Nat list',           hint:'Registered, decision pending',               color:'blue'  },
      { key:'qualifiedEWC_noReg',    label:'Qualified to E/W/C — did not register',    hint:'Zone said yes, no E/W/C entry',              color:'amber' },
      { key:'atZones_outOfNat',      label:'Competed Zones — out',                     hint:'No advancement',                             color:'gray'  },
      { key:'qualifiedRegOnly_DNS',  label:'Qualified at Regionals — DNS at Zones',    hint:'Withdrawal / no-show',                       color:'amber' },
      { key:'regionalsOnly_NoQual',  label:'Regionals only — no qualification',        hint:'End of road at Regionals',                   color:'gray'  },
      { key:'nonDisplacing_path',    label:'Non-displacing track',                     hint:'Foreign · dual · HPS · YMCA',                color:'purple'},
    ];
    return all.map(o => ({
      ...o,
      count: b[o.key].length,
      pct: Math.round(b[o.key].length / total * 100),
      athletes: b[o.key],
    })).filter(o => o.count > 0);
  }

  /* ── Sidebar (panel switcher + filters) ─────────────────────── */
  function renderSidebar(){
    const el = $('eventList');
    if (!el) return;
    const all = allResults();
    const opts = (vals) => [...new Set(vals.filter(Boolean))].sort((a,b) => {
      const na = Number(a), nb = Number(b);
      return (Number.isFinite(na) && Number.isFinite(nb)) ? na - nb : String(a).localeCompare(String(b));
    });
    const ageGroups  = opts(all.map(r => r.ageGroup));
    const genders    = opts(all.map(r => r.gender));
    const disciplines= opts(all.map(r => r.discipline));
    const regions    = opts(all.map(r => r.region));
    const zones      = opts(all.map(r => r.zone));
    const ewcs       = opts(all.map(r => r.ewc));
    const teams      = opts(all.map(r => r.team));

    function sel(key, options, label, allLabel){
      return `<div class="filter-field">
        <label class="filter-label">${esc(label)}</label>
        <select onchange="window._rptFilter('${key}',this.value)">
          <option value="">${esc(allLabel)}</option>
          ${options.map(o => `<option value="${esc(o)}" ${rptState[key]===String(o)?'selected':''}>${esc(o)}</option>`).join('')}
        </select>
      </div>`;
    }

    const panels = [
      ['flow',         'Pipeline flow',         '📊'],
      ['cohort',       'Cohort tracker',        '🎯'],
      ['reconcile',    'Qual / Reg / Att',      '🎯'],
      ['scoring',      'Scoring analysis',      '📈'],
      ['breakdowns',   'Participation breakdowns','🗂️'],
      ['displacement', 'Displacements',         '↔️'],
      ['status',       'Special status',        '🛡️'],
      ['historical',   'Historical (multi-year)', '📅'],
      ['declined',     'Declined Nationals',    '🚫'],
      ['anomaly',      'Anomalies',             '⚠️'],
      ['career',       'Athlete career',        '🧬'],
      ['tier_entry',   'Tier entry (old sys)',  '🪜'],
      ['rule_era',     'Rule era comparison',   '⚖️'],
      ['trials_split', 'Trials Voluntary/Optional', '🤿'],
      ['hps',          'Jr HP Squad tracker', '🏅'],
      ['saved',        'Saved views',           '⭐'],
    ];

    el.innerHTML = `
      <div class="rpt-sidebar">
        <div class="rpt-sidebar-title">Report</div>
        ${panels.map(([k,l,ic]) => `
          <button class="rpt-panel-btn ${rptState.panel===k?'active':''}" onclick="window._rptPanel('${k}')">
            <span class="rpt-panel-icon">${ic}</span>${esc(l)}
          </button>`).join('')}

        <div class="rpt-sidebar-title" style="margin-top:14px">Filters
          ${activeFilterCount()>0 ? `<span class="rpt-pill" style="float:right">${activeFilterCount()}</span>` : ''}
        </div>
        ${sel('ageGroup',   ageGroups,   'Age group',  'All groups')}
        ${sel('gender',     genders,     'Gender',     'All')}
        ${sel('discipline', disciplines, 'Discipline', 'All boards')}
        ${sel('region',     regions,     'Region',     'All regions')}
        ${sel('zone',       zones,       'Zone',       'All zones')}
        ${sel('ewc',        ewcs,        'E/W/C',      'All')}
        ${sel('team',       teams,       'Team',       'All teams')}
        <button class="rpt-clear-btn" onclick="window._rptClear()">Clear filters</button>
      </div>`;
  }

  window._rptFilter = function(key, val){
    rptState[key] = val;
    rptState._cohortDrill = null;  // reset drill when filters change
    renderReports();
  };
  window._rptPanel = function(panel){
    rptState.panel = panel;
    renderReports();
  };
  window._rptClear = function(){
    Object.assign(rptState, {
      ageGroup:'', gender:'', discipline:'',
      region:'', zone:'', ewc:'', team:'',
      _cohortDrill: null,
    });
    renderReports();
  };

  /* ── Top-level render entry point ───────────────────────────── */
  function renderReports(){
    pullMainFilters();
    applyReportsChrome();
    setupStageWatcher();

    const wrap = $('tableWrap');
    const ctx  = $('resultsContext');
    if (!wrap) return;

    if (ctx) ctx.innerHTML = buildTopHeader();
    renderSidebar();

    // Show banner when viewing a non-current season
    if (_yearOverrideRows && rptState.selectedYear && rptState.selectedYear !== _currentSeason) {
      wrap.innerHTML = `<div class="rpt-historical-banner">
        <span class="rpt-year-num">${rptState.selectedYear}</span>
        <span><strong>Viewing historical season.</strong> Citizenship, HPS, foreign-declaration, and dual-citizen flags weren't tracked in this archive — derived panels (Displacements, Special Status) will be limited.
        Click <button class="rpt-export-btn" onclick="window._rptSetYear(${_currentSeason})" style="padding:2px 8px;font-size:11px">${_currentSeason} (current)</button> to return.</span>
      </div>`;
    } else {
      wrap.innerHTML = '';
    }

    // Sub-wrap so panels render below the banner without overwriting it
    let panelWrap = wrap.querySelector('.rpt-panel-wrap');
    if (!panelWrap) {
      panelWrap = document.createElement('div');
      panelWrap.className = 'rpt-panel-wrap';
      wrap.appendChild(panelWrap);
    }

    if (rptState.panel === 'flow')              renderFlowPanel(panelWrap);
    else if (rptState.panel === 'cohort')       renderCohortPanel(panelWrap);
    else if (rptState.panel === 'reconcile')    renderReconcilePanel(panelWrap);
    else if (rptState.panel === 'scoring')      renderScoringPanel(panelWrap);
    else if (rptState.panel === 'breakdowns')   renderBreakdownsPanel(panelWrap);
    else if (rptState.panel === 'displacement') renderDisplacementPanel(panelWrap);
    else if (rptState.panel === 'historical')   renderHistoricalPanel(panelWrap);
    else if (rptState.panel === 'declined')     renderDeclinedPanel(panelWrap);
    else if (rptState.panel === 'anomaly')      renderAnomalyPanel(panelWrap);
    else if (rptState.panel === 'career')       renderCareerPanel(panelWrap);
    else if (rptState.panel === 'tier_entry')   renderTierEntryPanel(panelWrap);
    else if (rptState.panel === 'rule_era')     renderRuleEraPanel(panelWrap);
    else if (rptState.panel === 'saved')        renderSavedViewsPanel(panelWrap);
    else if (rptState.panel === 'status')       renderStatusPanel(panelWrap);
    else if (rptState.panel === 'trials_split') window.renderTrialsSplitPanel(panelWrap);
    else if (rptState.panel === 'hps')          window.renderHpsTrackerPanel(panelWrap);
  }

  /* ── CSS injection ──────────────────────────────────────────── */
  function injectCSS(){
    const s = document.createElement('style');
    s.textContent = `
/* === Reports sidebar === */
.rpt-sidebar{padding:8px}
.rpt-sidebar-title{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3);margin:6px 4px 6px;display:flex;align-items:center}
.rpt-panel-btn{display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;text-align:left;font-size:12.5px;font-family:var(--f-ui);border:1px solid transparent;border-radius:var(--radius);cursor:pointer;background:transparent;color:var(--ink-2);margin-bottom:2px}
.rpt-panel-btn:hover{background:var(--surface-2)}
.rpt-panel-btn.active{background:var(--surface-2);color:var(--navy);font-weight:600;border-color:var(--line)}
.rpt-panel-icon{font-size:14px;width:20px;display:inline-flex;justify-content:center}
.rpt-clear-btn{width:100%;margin-top:10px;padding:6px;font-size:11px;border-radius:var(--radius);border:1px solid var(--line);background:var(--surface-2);color:var(--ink-2);cursor:pointer}
.rpt-clear-btn:hover{background:var(--surface-3)}
.filter-field{margin-bottom:8px}
.filter-label{display:block;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);margin:0 0 3px 2px}
.filter-field select{width:100%;padding:5px 7px;font-size:12px;font-family:var(--f-ui);border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);color:var(--ink);cursor:pointer}
.filter-field select:focus{outline:1px solid var(--navy);outline-offset:-1px;border-color:var(--navy)}

/* === Section frame === */
.rpt-section{padding:16px 20px 60px}
.rpt-section-title{font-size:18px;font-weight:700;font-family:var(--f-display);letter-spacing:.03em;color:var(--navy);margin-bottom:14px;display:flex;align-items:center;gap:12px;text-transform:uppercase}
.rpt-section-sub{font-size:11px;font-weight:400;color:var(--ink-3);font-family:var(--f-ui);text-transform:none;letter-spacing:0}
.rpt-subsection{margin-top:22px}
.rpt-subsection-title{font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rpt-pill{display:inline-flex;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:2px 9px;font-size:11px;color:var(--ink-2);font-weight:500;font-family:var(--f-mono)}
.rpt-pill-note{font-size:11px;color:var(--ink-3);font-weight:400;font-family:var(--f-ui)}
.rpt-note{font-size:12px;color:var(--ink-2);background:var(--surface-2);border-left:3px solid var(--pool);border-radius:var(--radius);padding:9px 14px;margin-bottom:12px;line-height:1.55}
.rpt-filter-note{font-size:12px;color:var(--ink-2);background:#FEF3C7;border-left:3px solid #d97706;border-radius:var(--radius);padding:9px 14px;margin:0 20px 0}
.rpt-empty{padding:30px 20px;color:var(--ink-3);text-align:center;font-size:13px;background:var(--surface-2);border-radius:var(--radius);border:1px dashed var(--line)}
.rpt-export-btn{margin-left:auto;padding:7px 13px;font-size:11.5px;font-weight:600;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);cursor:pointer;font-family:var(--f-ui);box-shadow:var(--sh-xs);transition:transform .14s,box-shadow .14s,border-color .14s,color .14s}
.rpt-export-btn:hover{background:var(--surface);border-color:var(--navy);color:var(--navy);transform:translateY(-1px);box-shadow:var(--sh-sm)}

/* === Pipeline funnel (v2 — proportional flow) === */
.pf-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin:6px 0 20px}
.pf-kpi{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);padding:15px 16px 14px;box-shadow:var(--sh-xs);overflow:hidden;transition:transform .14s,box-shadow .14s}
.pf-kpi:hover{transform:translateY(-2px);box-shadow:var(--sh)}
.pf-kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.pf-kpi.k0::before{background:linear-gradient(90deg,var(--navy),#2640b0)}
.pf-kpi.k1::before{background:linear-gradient(90deg,var(--pool),#00b6e8)}
.pf-kpi.k2::before{background:linear-gradient(90deg,#6daed8,var(--sky))}
.pf-kpi.k3::before{background:linear-gradient(90deg,var(--q-direct),#2ab86a)}
.pf-kpi-n{font-family:var(--f-mono);font-size:29px;font-weight:700;color:var(--ink);line-height:1;letter-spacing:-.02em}
.pf-kpi-l{font-size:11.5px;font-weight:600;color:var(--ink-2);margin-top:7px}
.pf-kpi-d{display:inline-flex;align-items:center;margin-top:8px;font-family:var(--f-mono);font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px}
.pf-kpi-d.up{background:var(--q-direct-bg);color:var(--q-direct)}
.pf-kpi-d.flat{background:var(--surface-3);color:var(--ink-3)}
.pf-funnel{display:flex;flex-direction:column;gap:0;margin-bottom:8px}
.pf-stage{display:grid;grid-template-columns:220px 1fr 64px;gap:18px;align-items:center;padding:10px 12px;border-radius:var(--radius-lg);border:1px solid transparent;transition:.15s}
.pf-stage:hover{background:var(--surface-2);border-color:var(--line)}
.pf-stage-id{display:flex;align-items:center;gap:12px}
.pf-step{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-family:var(--f-display);font-weight:800;font-size:17px;color:#fff;flex-shrink:0;box-shadow:var(--sh-sm)}
.s0 .pf-step{background:linear-gradient(135deg,var(--navy),#2640b0)}
.s1 .pf-step{background:linear-gradient(135deg,var(--pool),#00b6e8)}
.s2 .pf-step{background:linear-gradient(135deg,#6daed8,var(--sky));color:var(--navy)}
.s3 .pf-step{background:linear-gradient(135deg,var(--q-direct),#2ab86a)}
.pf-stage-name{font-family:var(--f-display);font-size:16px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.02em;line-height:1.05}
.pf-stage-sub{font-size:10.5px;color:var(--ink-4);margin-top:2px}
.pf-track{position:relative;height:44px;background:repeating-linear-gradient(135deg,var(--surface-2) 0 10px,#eef0f7 10px 20px);border-radius:var(--radius);overflow:hidden;border:1px solid var(--line-2)}
.pf-fill{position:absolute;top:0;left:0;bottom:0;border-radius:var(--radius);display:flex;align-items:center;padding:0 15px;gap:9px;min-width:92px;box-shadow:var(--sh-sm);transition:width .5s cubic-bezier(.22,1,.36,1)}
.s0 .pf-fill{background:linear-gradient(90deg,var(--navy),#2640b0)}
.s1 .pf-fill{background:linear-gradient(90deg,var(--pool),#00b6e8)}
.s2 .pf-fill{background:linear-gradient(90deg,#6daed8,var(--sky))}
.s3 .pf-fill{background:linear-gradient(90deg,var(--q-direct),#2ab86a)}
.pf-fill-n{font-family:var(--f-mono);font-size:19px;font-weight:700;color:#fff;line-height:1}
.s2 .pf-fill-n{color:var(--navy)}
.pf-fill-tag{font-size:10px;font-weight:600;color:rgba(255,255,255,.82);text-transform:uppercase;letter-spacing:.04em}
.s2 .pf-fill-tag{color:rgba(23,31,105,.7)}
.pf-pct{font-family:var(--f-mono);font-size:17px;font-weight:700;color:var(--navy);text-align:right}
.pf-pct small{display:block;font-size:8.5px;color:var(--ink-4);font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.pf-detail{display:flex;flex-wrap:wrap;gap:8px;padding:2px 12px 8px 244px}
.pf-stat{flex:1;min-width:148px;background:var(--surface-2);border:1px solid var(--line-2);border-radius:var(--radius);padding:9px 13px}
.pf-stat.pf-acc-green{border-left:3px solid var(--q-direct)}
.pf-stat.pf-acc-blue{border-left:3px solid var(--q-ewc)}
.pf-stat.pf-acc-amber{border-left:3px solid var(--q-repl)}
.pf-stat-v{display:block;font-size:19px;font-weight:600;font-family:var(--f-mono);color:var(--ink);line-height:1.1}
.pf-acc-green .pf-stat-v{color:var(--q-direct)}
.pf-acc-blue .pf-stat-v{color:var(--q-ewc)}
.pf-acc-amber .pf-stat-v{color:var(--q-repl)}
.pf-stat-l{display:block;font-size:11px;color:var(--ink-2);margin-top:3px;font-weight:500}
.pf-stat-n{display:block;font-size:10px;color:var(--ink-3);margin-top:2px;font-style:italic}
.pf-connector{display:grid;grid-template-columns:220px 1fr;gap:18px;padding:0 12px;height:30px;align-items:center}
.pf-connector-rail{display:flex;justify-content:flex-start;padding-left:18px}
.pf-connector-rail i{display:block;width:2px;height:30px;background:linear-gradient(180deg,var(--line),var(--ink-4))}
.pf-conv{display:inline-flex;align-items:center;gap:9px;flex-wrap:wrap}
.pf-conv-chip{display:inline-flex;align-items:center;gap:5px;font-family:var(--f-mono);font-size:11.5px;font-weight:700;color:var(--q-direct);background:var(--q-direct-bg);border:1px solid var(--q-direct-b);padding:3px 10px;border-radius:999px}
.pf-drop-chip{display:inline-flex;align-items:center;gap:5px;font-family:var(--f-mono);font-size:11px;font-weight:600;color:var(--q-repl);background:var(--q-repl-bg);border:1px solid var(--q-repl-b);padding:3px 10px;border-radius:999px}
@media(max-width:860px){.pf-kpis{grid-template-columns:repeat(2,1fr)}.pf-stage{grid-template-columns:130px 1fr 52px;gap:10px}.pf-detail{padding-left:12px}.pf-connector{grid-template-columns:130px 1fr}}

/* === Cohort cards === */
.cohort-summary{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.cohort-summary-block{flex:1;min-width:200px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);padding:10px 14px;box-shadow:var(--sh-xs)}
.cohort-summary-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3)}
.cohort-summary-value{font-size:18px;font-weight:600;font-family:var(--f-display);color:var(--navy);margin-top:3px}
.cohort-summary-hint{font-size:11px;color:var(--ink-3);margin-top:2px}
.cohort-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin-bottom:18px}
.cohort-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:11px 13px;cursor:pointer;transition:all .12s ease;box-shadow:var(--sh-xs)}
.cohort-card:hover{border-color:var(--navy);transform:translateY(-1px);box-shadow:var(--sh-sm)}
.cohort-card-val{font-size:22px;font-weight:600;font-family:var(--f-mono);color:var(--ink);line-height:1}
.cohort-card-pct{display:inline-block;font-size:10px;font-family:var(--f-mono);background:var(--surface-2);padding:1px 6px;border-radius:8px;color:var(--ink-2);margin-left:6px}
.cohort-card-label{font-size:12px;font-weight:600;color:var(--ink-2);margin-top:5px}
.cohort-card-hint{font-size:10px;color:var(--ink-3);margin-top:2px;font-style:italic}
.cohort-green{border-left:3px solid var(--q-direct)}
.cohort-blue{border-left:3px solid var(--q-ewc)}
.cohort-amber{border-left:3px solid var(--q-repl)}
.cohort-gray{border-left:3px solid var(--ink-4)}
.cohort-purple{border-left:3px solid var(--q-avg)}

/* === Scoring controls === */
.scoring-controls{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.scoring-control{display:flex;flex-direction:column;gap:3px}
.scoring-control label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3)}
.scoring-control select{padding:6px 10px;font-size:12.5px;font-family:var(--f-ui);border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);color:var(--ink);min-width:180px;cursor:pointer}
.scoring-control select:focus{outline:1px solid var(--navy);outline-offset:-1px;border-color:var(--navy)}

/* === Breakdown tabs === */
.bd-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:0}
.bd-tab{background:transparent;border:0;padding:8px 14px;font-size:12.5px;font-family:var(--f-ui);color:var(--ink-3);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;font-weight:500}
.bd-tab:hover{color:var(--ink-2)}
.bd-tab.active{color:var(--navy);border-bottom-color:var(--navy);font-weight:600}
.bd-card-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px}
.bd-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;box-shadow:var(--sh-xs)}
.bd-card-1{border-top:3px solid var(--ink-4)}
.bd-card-2{border-top:3px solid var(--pool)}
.bd-card-3{border-top:3px solid var(--q-direct)}
.bd-card-n{font-size:26px;font-weight:600;font-family:var(--f-mono);color:var(--ink);line-height:1}
.bd-card-l{font-size:12px;font-weight:600;color:var(--ink-2);margin-top:5px}
.bd-card-sub{font-size:10.5px;color:var(--ink-3);margin-top:2px}
.bd-bar{display:inline-block;margin-left:8px;height:6px;background:var(--pool);border-radius:3px;vertical-align:middle}

/* === Summary cards (displacement) === */
.rpt-summary-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.rpt-summary-card{flex:1;min-width:160px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);padding:10px 14px;box-shadow:var(--sh-xs)}
.rsc-count{font-size:22px;font-weight:600;color:var(--ink);font-family:var(--f-mono);line-height:1}
.rsc-label{font-size:12px;font-weight:600;color:var(--ink);margin-top:4px}
.rsc-sub{font-size:10.5px;color:var(--ink-3);margin-top:2px}

/* === Tables === */
.rpt-table-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}
.rpt-table{width:100%;border-collapse:collapse;font-size:12.5px;font-family:var(--f-ui)}
.rpt-table th{background:linear-gradient(180deg,#1e2d8a,var(--navy));padding:9px 12px;text-align:left;font-size:10.5px;font-weight:700;font-family:var(--f-display);text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.92);border-bottom:0;white-space:nowrap;position:sticky;top:0;z-index:1}
.rpt-table td{padding:8px 11px;border-bottom:1px solid var(--line-2);vertical-align:middle;color:var(--ink-2)}
.rpt-table tr:last-child td{border-bottom:none}
.rpt-table tr:hover td{background:var(--surface-2)}
.rpt-table td.r-name{color:var(--ink);font-weight:500}
.rpt-table td.mono{font-family:var(--f-mono);font-size:12px;white-space:nowrap}
.rpt-table td.small{font-size:11px;color:var(--ink-3)}
.rpt-table td.empty{text-align:center;padding:18px;color:var(--ink-3);font-style:italic}
.cell-sub{display:block;font-size:10px;color:var(--ink-3);margin-top:1px}
.mtx{text-align:center;font-weight:600;color:var(--navy)}

/* === Badges === */
.badge{display:inline-flex;align-items:center;font-size:10px;padding:2px 7px;border-radius:10px;font-weight:600;background:var(--surface-2);color:var(--ink-2);border:1px solid var(--line);font-family:var(--f-ui);white-space:nowrap;line-height:1.4;margin-right:3px}
.badge-green{background:var(--q-direct-bg);color:var(--q-direct);border-color:var(--q-direct-b)}
.badge-blue{background:var(--q-ewc-bg);color:var(--q-ewc);border-color:var(--q-ewc-b)}
.badge-amber{background:var(--q-repl-bg);color:var(--q-repl);border-color:var(--q-repl-b)}
.badge-red{background:var(--row-foreign);color:var(--red);border-color:rgba(227,25,55,.2)}
.badge-pool{background:var(--pool-soft);color:var(--pool);border-color:rgba(0,154,199,.25)}
.badge-purple{background:var(--q-avg-bg);color:var(--q-avg);border-color:var(--q-avg-b)}
.ext-link{font-family:var(--f-mono);font-size:11px;color:var(--pool);text-decoration:none;border-bottom:1px dashed rgba(0,154,199,.4)}
.ext-link:hover{color:var(--navy);border-bottom-color:var(--navy)}

/* === Gender mix bars === */
.gm-bar{display:flex;height:14px;background:var(--surface-2);border-radius:7px;overflow:hidden;width:160px}
.gm-bar-b{background:var(--pool);height:100%}
.gm-bar-g{background:var(--red);height:100%}

/* === Reports stage chrome (hide dead main-app UI + fill viewport) === */
body.rpt-stage-active .event-panel,
body.rpt-stage-active .results-toolbar,
body.rpt-stage-active .kpi-row { display: none !important; }
body.rpt-stage-active main,
body.rpt-stage-active .app-main,
body.rpt-stage-active .page-main,
body.rpt-stage-active .container { padding: 0 !important; }
body.rpt-stage-active .workspace { grid-template-columns: 1fr !important; gap: 0 !important; padding: 0 !important; margin: 0 !important; min-height: calc(100vh - 60px); }
body.rpt-stage-active .results-panel { width: 100%; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; min-height: calc(100vh - 60px); background: var(--surface) !important; }
body.rpt-stage-active .results-context { padding: 0 !important; margin: 0 !important; background: transparent !important; border: none !important; }
body.rpt-stage-active .table-wrap { padding: 0 !important; background: transparent !important; }

/* === Top header (panel tabs + filter chips) === */
.rpt-top { padding: 14px 24px 0 24px; background: var(--surface); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 5; }
.rpt-top-row1 { display: flex; align-items: baseline; gap: 14px; margin-bottom: 10px; flex-wrap: wrap; }
.rpt-top-eyebrow { font-family: var(--f-display); font-size: 20px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: .03em; }
.rpt-top-meta { font-size: 12.5px; color: var(--ink-3); font-style: italic; }

.rpt-top-row2 { display: flex; flex-direction: column; gap: 8px; border-bottom: 0; margin: 6px 0 2px; padding: 0; }
.rpt-toptab-row { display: flex; flex-wrap: nowrap; justify-content: center; gap: 6px; }
.rpt-toptab { background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 8px 13px; font-size: 12.5px; font-family: var(--f-ui); color: var(--ink-2); cursor: pointer; margin-bottom: 0; font-weight: 600; display: inline-flex; gap: 7px; align-items: center; justify-content: center; transition: all .14s; white-space: nowrap; box-shadow: var(--sh-xs); flex: 0 1 auto; min-width: 0; }
.rpt-toptab > span:last-child { overflow: hidden; text-overflow: ellipsis; }
.rpt-toptab:hover { color: var(--navy); background: var(--surface-2); border-color: var(--ink-4); transform: translateY(-1px); box-shadow: var(--sh-sm); }
.rpt-toptab.is-active { color: #fff; border-color: var(--navy); font-weight: 700; background: linear-gradient(135deg, var(--navy), #2640b0); box-shadow: 0 6px 16px rgba(23,31,105,.26); }
.rpt-toptab-ic { font-size: 15px; flex-shrink: 0; line-height: 1; }

.rpt-top-row3 { display: flex; gap: 6px; flex-wrap: wrap; padding: 12px 0 14px; align-items: center; }
.rpt-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 4px 3px 11px; border: 1px solid var(--line); border-radius: 18px; background: var(--surface); transition: all .12s; }
.rpt-chip:hover { border-color: var(--ink-3); }
.rpt-chip.is-active { border-color: var(--navy); background: var(--surface-2); box-shadow: 0 0 0 1px var(--navy) inset; }
.rpt-chip-l { color: var(--ink-3); font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
.rpt-chip.is-active .rpt-chip-l { color: var(--navy); }
.rpt-chip-s { border: 0; background: transparent; font-size: 12.5px; color: var(--ink); padding: 4px 22px 4px 4px; font-family: var(--f-ui); cursor: pointer; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path d='M2 4l3 3 3-3' stroke='%23566170' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>"); background-repeat: no-repeat; background-position: right 6px center; }
.rpt-chip-s:focus { outline: none; }
.rpt-chip-x { background: var(--ink-3); color: #fff; border: 0; width: 18px; height: 18px; border-radius: 50%; font-size: 9px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; line-height: 1; margin-left: 1px; }
.rpt-chip-x:hover { background: var(--red); }
.rpt-chip-clear { margin-left: 8px; padding: 6px 13px; font-size: 11.5px; border-radius: 14px; border: 1px solid var(--red); background: var(--surface); color: var(--red); cursor: pointer; font-weight: 600; font-family: var(--f-ui); }
.rpt-chip-clear:hover { background: var(--red); color: #fff; }
.rpt-chip-hint { font-size: 11.5px; color: var(--ink-4); font-style: italic; margin-left: 6px; }

/* === Section wrap padding adjust under sticky header === */
body.rpt-stage-active .rpt-section { padding: 14px 22px 28px; }

/* === Cohort hero (full, 3 blocks) === */
.cohort-hero { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 12px; margin-bottom: 14px; }
@media (max-width: 980px) { .cohort-hero { grid-template-columns: 1fr; } }
.cohort-hero-block { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 13px 18px; box-shadow: var(--sh-xs); }
.cohort-hero-block.primary { background: linear-gradient(135deg, var(--navy) 0%, #2a3493 100%); color: #fff; border-color: var(--navy); }
.cohort-hero-eyebrow { font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; opacity: .75; font-weight: 600; margin-bottom: 4px; }
.cohort-hero-block.primary .cohort-hero-eyebrow { color: rgba(255,255,255,.78); opacity: 1; }
.cohort-hero-num { font-family: var(--f-display); font-size: 36px; font-weight: 700; line-height: 1; color: var(--navy); }
.cohort-hero-block.primary .cohort-hero-num { color: #fff; }
.cohort-hero-num.good { color: var(--q-direct); }
.cohort-hero-num.neutral { color: var(--ink-3); }
.cohort-hero-l { font-size: 13px; color: var(--ink-2); margin-top: 4px; font-weight: 500; }
.cohort-hero-block.primary .cohort-hero-l { color: rgba(255,255,255,.88); }
.cohort-hero-sub { font-size: 11px; color: var(--ink-3); margin-top: 7px; padding-top: 7px; border-top: 1px solid var(--line-2); }
.cohort-hero-block.primary .cohort-hero-sub { color: rgba(255,255,255,.7); border-top-color: rgba(255,255,255,.18); }

/* === Cohort hero strip (compact, when slicer active) === */
.cohort-hero-strip { display: flex; align-items: center; gap: 14px; padding: 10px 16px; margin-bottom: 10px; background: linear-gradient(135deg, var(--navy) 0%, #2a3493 100%); color: #fff; border-radius: var(--radius-md); flex-wrap: wrap; }
.cohort-hero-strip-grp { display: inline-flex; align-items: baseline; gap: 6px; }
.cohort-hero-strip-num { font-family: var(--f-display); font-size: 22px; font-weight: 700; color: #fff; line-height: 1; }
.cohort-hero-strip-num.good { color: #6bd99c; }
.cohort-hero-strip-num.neutral { color: #c3c8d8; }
.cohort-hero-strip-l { font-size: 12px; color: rgba(255,255,255,.85); font-weight: 500; }
.cohort-hero-strip-sep { width: 1px; height: 18px; background: rgba(255,255,255,.22); }
.cohort-hero-strip-ctx { font-size: 11px; color: rgba(255,255,255,.65); font-style: italic; margin-left: auto; }

/* === Section H2 === */
.rpt-h2 { display: flex; align-items: baseline; gap: 14px; margin: 16px 0 8px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
.rpt-h2-l { font-family: var(--f-display); font-size: 15px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: .04em; }
.rpt-h2-sub { font-size: 11.5px; color: var(--ink-3); font-style: italic; }

/* === Funnel === */
.cf-funnel { display: flex; flex-direction: column; gap: 0; margin-bottom: 6px; }
.cf-stage { display: grid; grid-template-columns: 260px 1fr; gap: 18px; align-items: center; padding: 10px 8px; cursor: pointer; border-radius: var(--radius); transition: all .12s; border: 1px solid transparent; }
.cf-stage:hover { background: var(--surface-2); border-color: var(--line-2); }
.cf-stage.is-drill { background: rgba(0,154,199,.08); border-color: var(--pool); box-shadow: 0 0 0 1px var(--pool); }
.cf-stage-info { display: flex; align-items: center; gap: 10px; }
.cf-stage-step { width: 26px; height: 26px; border-radius: 50%; background: var(--surface-2); color: var(--ink-3); border: 1px solid var(--line); display: inline-flex; align-items: center; justify-content: center; font-family: var(--f-display); font-weight: 700; font-size: 13px; flex-shrink: 0; }
.cf-stage.cf-stage-0 .cf-stage-step { background: var(--navy); color: #fff; border-color: var(--navy); }
.cf-stage.cf-stage-1 .cf-stage-step { background: var(--pool); color: #fff; border-color: var(--pool); }
.cf-stage.cf-stage-2 .cf-stage-step { background: var(--sky); color: var(--navy); border-color: var(--sky); }
.cf-stage.cf-stage-3 .cf-stage-step { background: var(--q-direct); color: #fff; border-color: var(--q-direct); }
.cf-stage-title { font-family: var(--f-display); font-size: 15px; font-weight: 700; color: var(--navy); line-height: 1.15; }
.cf-stage-sub { font-size: 11px; color: var(--ink-3); font-style: italic; margin-top: 1px; }
.cf-stage-bar-wrap { display: flex; align-items: center; gap: 12px; }
.cf-stage-bar { height: 38px; border-radius: var(--radius); display: flex; align-items: center; padding: 0 16px; min-width: 70px; transition: all .12s; box-shadow: var(--sh-xs); }
.cf-bar-0 { background: linear-gradient(90deg, var(--navy) 0%, #2c3899 100%); color: #fff; }
.cf-bar-1 { background: linear-gradient(90deg, var(--pool) 0%, #00b6e8 100%); color: #fff; }
.cf-bar-2 { background: linear-gradient(90deg, #6daed8 0%, var(--sky) 100%); color: var(--navy); }
.cf-bar-3 { background: linear-gradient(90deg, var(--q-direct) 0%, #2ab86a 100%); color: #fff; }
.cf-stage-n { font-family: var(--f-mono); font-size: 19px; font-weight: 700; }
.cf-stage-pct { font-family: var(--f-mono); font-size: 13px; color: var(--ink-2); font-weight: 600; min-width: 48px; text-align: right; }

.cf-drop { display: grid; grid-template-columns: 260px 30px 1fr auto; gap: 14px; align-items: center; padding: 5px 8px; cursor: pointer; border-radius: var(--radius); transition: all .12s; border: 1px solid transparent; }
.cf-drop:hover { background: rgba(217,119,6,.05); border-color: var(--q-repl-b); }
.cf-drop.is-drill { background: rgba(217,119,6,.1); border-color: var(--q-repl); box-shadow: 0 0 0 1px var(--q-repl); }
.cf-drop-spacer { }
.cf-drop-arrow-wrap { display: flex; justify-content: flex-end; padding-right: 8px; }
.cf-drop-arrow { font-size: 20px; color: var(--q-repl); line-height: 1; font-weight: 700; }
.cf-drop-info { display: flex; flex-direction: column; gap: 1px; }
.cf-drop-n { font-family: var(--f-mono); font-size: 13px; font-weight: 700; color: var(--q-repl); }
.cf-drop-l { font-size: 11.5px; color: var(--ink-2); }
.cf-drop-pct { font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); font-style: italic; text-align: right; }

/* === Outcome cards === */
.cf-outcomes { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; margin-bottom: 4px; }
.cf-outcome { position: relative; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 11px 12px 12px; cursor: pointer; transition: all .12s; box-shadow: var(--sh-xs); overflow: hidden; }
.cf-outcome:hover { border-color: var(--navy); transform: translateY(-1px); box-shadow: var(--sh-sm); }
.cf-outcome.is-drill { border-color: var(--pool); box-shadow: 0 0 0 2px var(--pool); }
.cf-outcome-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.cf-outcome-n { font-family: var(--f-mono); font-size: 22px; font-weight: 700; color: var(--ink); line-height: 1; }
.cf-outcome-pct { font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); background: var(--surface-2); padding: 2px 6px; border-radius: 8px; font-weight: 500; }
.cf-outcome-title { font-size: 12.5px; font-weight: 600; color: var(--ink); margin-bottom: 2px; line-height: 1.3; }
.cf-outcome-hint { font-size: 10.5px; color: var(--ink-3); font-style: italic; line-height: 1.35; margin-bottom: 8px; }
.cf-outcome-bar-wrap { height: 5px; background: var(--line-2); border-radius: 3px; overflow: hidden; }
.cf-outcome-bar { height: 100%; transition: width .25s; border-radius: 3px; }
.cf-outcome-bar-green { background: var(--q-direct); }
.cf-outcome-bar-blue  { background: var(--q-ewc); }
.cf-outcome-bar-amber { background: var(--q-repl); }
.cf-outcome-bar-gray  { background: var(--ink-4); }
.cf-outcome-bar-purple{ background: var(--q-avg); }
.cf-outcome-green  { border-left: 4px solid var(--q-direct); }
.cf-outcome-blue   { border-left: 4px solid var(--q-ewc); }
.cf-outcome-amber  { border-left: 4px solid var(--q-repl); }
.cf-outcome-gray   { border-left: 4px solid var(--ink-4); }
.cf-outcome-purple { border-left: 4px solid var(--q-avg); }

/* === Drill-down === */
.cf-drill-prompt { display: flex; align-items: center; gap: 12px; padding: 12px 18px; margin-top: 14px; background: var(--surface-2); border: 1px dashed var(--line); border-radius: var(--radius); color: var(--ink-3); font-size: 12px; font-style: italic; }
.cf-drill-prompt-icon { font-size: 20px; color: var(--pool); font-style: normal; }
.cf-drill { margin-top: 16px; border: 2px solid var(--pool); border-radius: var(--radius-md); background: var(--surface); overflow: hidden; box-shadow: var(--sh-sm); }
.cf-drill-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 12px 18px; background: linear-gradient(180deg, rgba(0,154,199,.1), rgba(0,154,199,.02)); border-bottom: 1px solid var(--line); }
.cf-drill-eyebrow { font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--pool); font-weight: 700; }
.cf-drill-title { font-family: var(--f-display); font-size: 17px; font-weight: 700; color: var(--navy); margin-top: 3px; line-height: 1.2; }
.cf-drill-hint { font-size: 11.5px; color: var(--ink-2); margin-top: 4px; }
.cf-drill-actions { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
.cf-drill-empty { padding: 30px; text-align: center; color: var(--ink-3); font-size: 13px; font-style: italic; }
.rpt-export-btn-ghost { color: var(--ink-3); border-color: var(--line); }
.rpt-export-btn-ghost:hover { color: var(--red); border-color: var(--red); background: var(--surface); }

.rpt-toolbar-row { display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--line); }

/* === Scoring panel (per-event view) === */
.sc-event-table thead th { background: var(--navy); color: #fff; border-bottom: 0; }
.sc-event-table thead th.sc-place-col { background: var(--navy); color: #fff; text-align: center; }
.sc-event-table tbody td.sc-cell-td { padding: 7px 9px; text-align: center; vertical-align: middle; line-height: 1.25; }
.sc-event-table tbody td.sc-cell-td .sc-cell-mean { font-family: var(--f-mono); font-size: 14px; font-weight: 700; color: var(--ink); }
.sc-event-table tbody td.sc-cell-td .sc-cell-range { font-family: var(--f-mono); font-size: 10px; color: var(--ink-3); margin-top: 1px; }
.sc-event-table tbody td.sc-cell-td .sc-cell-n { font-family: var(--f-mono); font-size: 10px; color: var(--ink-4); margin-top: 1px; }
.sc-event-table tbody td.sc-cell-td .sc-cell-na { color: var(--ink-4); font-style: italic; }
.sc-event-table tbody tr.sc-event-row { cursor: pointer; transition: background .12s; }
.sc-event-table tbody tr.sc-event-row:hover td { background: var(--surface-2); }
.sc-event-table tbody tr.sc-event-row.is-drill td { background: rgba(0,154,199,.10); box-shadow: inset 4px 0 0 var(--pool); }
.sc-event-table tbody tr.sc-event-row.is-drill td.sc-event-name { color: var(--navy); font-weight: 700; }
.sc-drill-tag { font-family: var(--f-mono); font-size: 10px; color: var(--pool); margin-left: 6px; font-weight: 600; }
.sc-event-name { font-weight: 600; color: var(--ink); }
.sc-event-n { background: var(--surface-2) !important; font-weight: 600; }

.sc-drill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 22px; }
@media (max-width: 1100px) { .sc-drill-grid { grid-template-columns: 1fr; } }

.sc-chart { display: block; }

.sc-single { display: flex; flex-direction: column; align-items: center; padding: 30px 20px; background: var(--surface-2); border-radius: var(--radius); border: 1px solid var(--line); }
.sc-single-place { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-3); font-weight: 600; }
.sc-single-mean { font-family: var(--f-display); font-size: 48px; font-weight: 700; color: var(--navy); margin-top: 6px; line-height: 1; }
.sc-single-meta { font-size: 12px; color: var(--ink-3); margin-top: 8px; }

/* === Cohort slicer (break-by selector) === */
.cf-slicer-bar { display: flex; align-items: center; gap: 12px; padding: 8px 14px; margin: 0 0 12px; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius); flex-wrap: wrap; }
.cf-slicer-l { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--ink-3); }
.cf-slicer-opts { display: flex; gap: 4px; flex-wrap: wrap; }
.cf-slicer-btn { background: var(--surface); border: 1px solid var(--line); padding: 5px 12px; font-size: 12px; font-family: var(--f-ui); color: var(--ink-2); cursor: pointer; border-radius: 14px; transition: all .12s; font-weight: 500; }
.cf-slicer-btn:hover { border-color: var(--navy); color: var(--navy); }
.cf-slicer-btn.is-active { background: var(--navy); border-color: var(--navy); color: #fff; font-weight: 700; }

/* === Slice comparison table === */
.cf-slice-table tbody tr td { padding: 8px 10px; }
.cf-slice-table tbody tr.cf-slice-row { cursor: pointer; }
.cf-slice-table tbody tr.cf-slice-row:hover td { background: var(--surface-2); }
.cf-slice-pct { font-family: var(--f-mono); font-size: 10px; color: var(--ink-3); margin-left: 4px; }
.cf-slice-conv { color: var(--q-direct); font-weight: 700; }
.cf-slice-table tfoot td { background: var(--surface-2); border-top: 2px solid var(--navy); font-family: var(--f-mono); color: var(--ink); font-weight: 600; padding: 9px 10px; }

/* === Mini-funnels grid === */
.cf-mini-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin: 12px 0 4px; }
.cf-mini { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; cursor: pointer; transition: all .12s; box-shadow: var(--sh-xs); }
.cf-mini:hover { border-color: var(--navy); transform: translateY(-1px); box-shadow: var(--sh-sm); }
.cf-mini-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; gap: 8px; }
.cf-mini-label { font-family: var(--f-display); font-size: 13px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: .02em; }
.cf-mini-conv { font-family: var(--f-mono); font-size: 10.5px; color: var(--q-direct); font-weight: 700; background: var(--q-direct-bg); padding: 2px 7px; border-radius: 10px; }
.cf-mini-bars { display: flex; flex-direction: column; gap: 2px; }
.cf-mini-bar { height: 14px; border-radius: 4px; display: flex; align-items: center; padding: 0 7px; min-width: 28px; transition: width .25s; }
.cf-mini-bar span { font-family: var(--f-mono); font-size: 10px; font-weight: 700; }
.cf-mini-bar.cf-mb-0 { background: linear-gradient(90deg, var(--navy), #2c3899); color: #fff; }
.cf-mini-bar.cf-mb-1 { background: linear-gradient(90deg, var(--pool), #00b6e8); color: #fff; }
.cf-mini-bar.cf-mb-2 { background: linear-gradient(90deg, #6daed8, var(--sky)); color: var(--navy); }
.cf-mini-bar.cf-mb-3 { background: linear-gradient(90deg, var(--q-direct), #2ab86a); color: #fff; }

/* === Provenance breakdown (in drill-down) === */
.cf-prov-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; padding: 16px 20px; background: linear-gradient(180deg, var(--surface-2) 0%, transparent 100%); border-bottom: 1px solid var(--line); }
.cf-prov-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; }
.cf-prov-head { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--navy); margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--line-2); }
.cf-prov-rows { display: flex; flex-direction: column; gap: 4px; }
.cf-prov-row { display: grid; grid-template-columns: 1fr 60px 36px 38px; gap: 8px; align-items: center; font-size: 11.5px; }
.cf-prov-val { color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cf-prov-bar-bg { height: 8px; background: var(--line-2); border-radius: 4px; overflow: hidden; }
.cf-prov-bar { height: 100%; background: linear-gradient(90deg, var(--navy), var(--pool)); border-radius: 4px; }
.cf-prov-n { font-family: var(--f-mono); font-size: 11px; color: var(--ink); font-weight: 700; text-align: right; }
.cf-prov-pct { font-family: var(--f-mono); font-size: 10px; color: var(--ink-3); text-align: right; }
.cf-prov-row-rest .cf-prov-val { font-style: italic; color: var(--ink-3); }
.cf-prov-row-rest { grid-template-columns: 1fr 36px 38px; }

/* === Historical + Declined panels === */
.rpt-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 18px; margin-bottom: 14px; }
.rpt-card-h { margin: 0 0 12px; font-size: 13px; font-weight: 600; color: var(--navy); font-family: var(--f-ui); text-transform: uppercase; letter-spacing: 0.04em; }
.rpt-loading { color: var(--ink-3); font-size: 12px; font-style: italic; padding: 14px 0; }
.rpt-err { color: var(--red, #E31937); background: #fef2f3; padding: 10px 12px; border-radius: 6px; font-size: 12px; }
.rpt-soft { color: var(--ink-3); font-size: 11px; font-weight: 400; }
.rpt-yr-chip { display: inline-block; padding: 5px 10px; margin: 0 4px 4px 0; border: 1px solid var(--line); border-radius: 999px; background: var(--surface-2); color: var(--ink-2); cursor: pointer; font-size: 12px; font-variant-numeric: tabular-nums; font-family: var(--f-ui); }
.rpt-yr-chip:hover { background: var(--surface-3); }
.rpt-yr-chip.is-on { background: var(--navy); color: white; border-color: var(--navy); font-weight: 600; }
.rpt-stats-row { display: flex; flex-wrap: wrap; gap: 26px; }
.rpt-stat { min-width: 130px; }
.rpt-stat-num { font-size: 28px; font-weight: 700; color: var(--navy); font-family: var(--f-display); font-variant-numeric: tabular-nums; line-height: 1.1; }
.rpt-stat-lbl { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
.rpt-btn-prim { background: var(--navy); color: white; border: 0; padding: 7px 14px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; font-family: var(--f-ui); font-weight: 600; }
.rpt-btn-prim:hover { background: var(--pool); }

/* Year selector in top header */
.rpt-year-selector { display: inline-flex; align-items: center; gap: 6px; margin-left: 14px; padding: 0 12px 0 14px; border-left: 2px solid var(--line); }
.rpt-year-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-3); margin-right: 4px; }
.rpt-year-select { padding: 4px 8px; border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--surface); font-family: var(--f-ui); font-size: 13px; font-weight: 700; color: var(--navy); cursor: pointer; }
.rpt-year-select:focus { outline: 2px solid var(--navy); outline-offset: -1px; }
.rpt-year-reset { background: transparent; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 3px 8px; font-size: 14px; cursor: pointer; color: var(--ink-2); }
.rpt-year-reset:hover { background: var(--surface-2); color: var(--navy); }
.rpt-year-badge { display: inline-block; padding: 4px 10px; background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; color: var(--navy); }
.rpt-year-loading { background: #FEF3C7; border-color: #d97706; color: #92400e; }
.rpt-year-err { font-size: 11px; color: var(--red, #E31937); margin-left: 6px; }

/* Historical-year banner appears on every panel when not current season */
.rpt-historical-banner { background: linear-gradient(90deg, #FEF3C7 0%, #fdf8e1 100%); border-left: 4px solid #d97706; padding: 10px 16px; margin: 0 0 14px; border-radius: var(--radius-sm); font-size: 12px; color: #78350f; display: flex; align-items: center; gap: 10px; }
.rpt-historical-banner strong { color: #78350f; font-weight: 700; }
.rpt-historical-banner .rpt-year-num { background: var(--navy); color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 13px; font-family: var(--f-mono); }

/* Active-filter banner shown on Neon-backed panels when filter chips applied */
.rpt-active-filter { background: linear-gradient(90deg, #f0f3fa 0%, #e8edf7 100%); border-left: 4px solid var(--navy); padding: 9px 14px; margin: 0 0 14px; border-radius: var(--radius-sm); font-size: 12px; color: var(--navy); display: flex; align-items: center; gap: 8px; }
.rpt-active-filter strong { color: var(--navy); font-weight: 700; }
.rpt-filt-tag { display: inline-block; background: #d97706; color: white; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; margin-left: 6px; vertical-align: middle; font-family: var(--f-mono); }

/* Qual/Reg/Att reconciliation table — each column has its own subtle tint to make the 4 datasets visually distinct */
.recon-table th { font-size: 11.5px !important; padding: 10px 12px !important; border-bottom: 2px solid var(--navy) !important; color: var(--navy) !important; font-family: var(--f-display) !important; font-weight: 700 !important; text-transform: uppercase; letter-spacing: 0.04em; background: var(--surface-2) !important; }
.recon-table th.recon-col-a { background: #c5dff5 !important; }
.recon-table th.recon-col-b { background: #b9e0c8 !important; }
.recon-table th.recon-col-c { background: #fce4b0 !important; }
.recon-table th.recon-col-d { background: #f9c5cc !important; }
.recon-table td { padding: 9px 12px; vertical-align: top; font-size: 12.5px; border-bottom: 1px solid var(--line); color: var(--ink); }
.recon-table tr:nth-child(even) td { background: rgba(0,0,0,0.012); }
.recon-table tr:hover td { background: rgba(23,31,105,0.04); }
.recon-table td.recon-col-a-cell { background: #f0f6fc; }
.recon-table td.recon-col-b-cell { background: #f1faf3; }
.recon-table td.recon-col-c-cell { background: #fefaef; }
.recon-table td.recon-col-d-cell { background: #fdf2f3; }

/* The "Why this panel exists" legend at top of reconcile panel */
.recon-legend { background: linear-gradient(135deg, #f8f9fd 0%, #eef2fa 100%); border-left: 4px solid var(--pool); border-radius: var(--radius); padding: 14px 18px; margin-bottom: 14px; }
.recon-legend-h { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--navy); font-weight: 700; font-family: var(--f-display); margin-bottom: 8px; }
.recon-legend-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; }
.recon-legend-col { padding: 10px 12px; font-size: 12px; line-height: 1.5; }
.recon-legend-col-h { font-size: 11px; font-weight: 700; color: var(--navy); margin-bottom: 6px; font-family: var(--f-display); text-transform: uppercase; letter-spacing: 0.04em; }
.recon-legend-col.col-a { background: #f0f6fc; border-right: 1px solid var(--line); }
.recon-legend-col.col-b { background: #f1faf3; border-right: 1px solid var(--line); }
.recon-legend-col.col-c { background: #fefaef; border-right: 1px solid var(--line); }
.recon-legend-col.col-d { background: #fdf2f3; }
@media (max-width: 900px) {
  .recon-legend-grid { grid-template-columns: 1fr 1fr; }
  .recon-legend-col { border-right: 1px solid var(--line) !important; border-bottom: 1px solid var(--line); }
}

/* Cohort tracker — data key (definitions/source legend) */
.cf-data-key { background: linear-gradient(135deg, #f8f9fd 0%, #eef2fa 100%); border: 1px solid var(--line); border-left: 4px solid var(--pool); border-radius: var(--radius); padding: 14px 18px; margin: 0 0 18px; }
.cf-data-key-h { font-size: 12px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px; font-family: var(--f-display); }
.cf-data-key-list { margin: 0 0 8px; padding: 0 0 0 22px; }
.cf-data-key-list li { font-size: 12px; color: var(--ink); margin-bottom: 5px; line-height: 1.5; }
.cf-data-key-list li strong { color: var(--navy); }
.cf-data-key-list li em { font-style: italic; color: var(--ink-2); }
.cf-data-key-foot { font-size: 11px; color: var(--ink-3); font-style: italic; padding-top: 7px; border-top: 1px dashed var(--line); margin-top: 6px; }

/* Stage source attribution under the cohort tracker stage subtitle */
.cf-stage-source { font-size: 10px; color: var(--ink-3); margin-top: 3px; font-style: italic; line-height: 1.4; }

/* "Added at this stage" indicator — mirror of cf-drop in green */
.cf-added { display: grid; grid-template-columns: 28px 28px 1fr auto; gap: 12px; align-items: center; padding: 6px 10px 6px 0; margin: 0 0 4px; cursor: pointer; border-left: 3px solid transparent; transition: background 0.12s, border-color 0.12s; }
.cf-added:hover { background: var(--surface-2); border-left-color: var(--q-direct); }
.cf-added-arrow { color: var(--q-direct); font-size: 18px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: rgba(34,137,62,0.1); }
.cf-added-n { color: var(--q-direct); font-weight: 700; font-family: var(--f-mono); font-size: 13px; display: block; }

/* Report Builder modal */
.rb-overlay { position: fixed; inset: 0; background: rgba(23,31,105,0.4); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(2px); }
.rb-dialog { background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); width: 100%; max-width: 980px; max-height: calc(100vh - 40px); display: flex; flex-direction: column; overflow: hidden; }
.rb-head { padding: 20px 28px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #fafbfd 0%, #f0f3fa 100%); }
.rb-eyebrow { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-3); }
.rb-title { font-size: 22px; font-weight: 700; color: var(--navy); margin: 4px 0 0; font-family: var(--f-display); }
.rb-close { background: transparent; border: 0; font-size: 22px; cursor: pointer; color: var(--ink-3); padding: 4px 10px; border-radius: 6px; }
.rb-close:hover { background: var(--surface-2); color: var(--ink); }
.rb-body { padding: 24px 28px; overflow-y: auto; flex: 1; }
.rb-step { display: flex; gap: 14px; margin-bottom: 22px; }
.rb-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--navy); color: white; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-family: var(--f-display); }
.rb-step-content { flex: 1; min-width: 0; }
.rb-step-h { font-size: 14px; font-weight: 700; color: var(--navy); margin-bottom: 10px; font-family: var(--f-display); text-transform: uppercase; letter-spacing: 0.03em; }
.rb-templates { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
.rb-tmpl { text-align: left; background: var(--surface); border: 2px solid var(--line); border-radius: 8px; padding: 12px 14px; cursor: pointer; transition: all 0.12s; }
.rb-tmpl:hover { border-color: var(--pool); background: var(--surface-2); }
.rb-tmpl.is-on { border-color: var(--navy); background: linear-gradient(135deg, #f0f3fa 0%, #e8edf7 100%); box-shadow: 0 2px 8px rgba(23,31,105,0.12); }
.rb-tmpl-name { font-size: 13px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
.rb-tmpl-desc { font-size: 11px; color: var(--ink-2); line-height: 1.4; }
.rb-tmpl-sections { font-size: 10px; color: var(--ink-3); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
.rb-sections-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 8px; }
.rb-section-opt { display: flex; gap: 10px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; background: var(--surface); transition: all 0.12s; }
.rb-section-opt:hover { background: var(--surface-2); }
.rb-section-opt.is-on { border-color: var(--navy); background: #f0f3fa; }
.rb-section-opt input { margin-top: 2px; }
.rb-section-name { font-size: 12.5px; font-weight: 600; color: var(--navy); margin-bottom: 2px; }
.rb-section-desc { font-size: 11px; color: var(--ink-2); line-height: 1.4; }
.rb-tag { display: inline-block; background: #FEF3C7; color: #78350f; padding: 1px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; margin-left: 4px; }
.rb-year-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.rb-yr-chip { padding: 5px 11px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--ink-2); cursor: pointer; font-size: 12px; font-family: var(--f-ui); font-weight: 600; }
.rb-yr-chip:hover { background: var(--surface-2); }
.rb-yr-chip.is-on { background: var(--navy); color: white; border-color: var(--navy); }
.rb-dmid-input { padding: 7px 11px; border: 1px solid var(--line); border-radius: 5px; font-family: var(--f-mono); font-size: 13px; width: 200px; }
.rb-foot { padding: 16px 28px; border-top: 1px solid var(--line); background: var(--surface-2); display: flex; align-items: center; gap: 14px; }
.rb-btn-prim { background: var(--navy); color: white; border: 0; padding: 9px 20px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; font-family: var(--f-ui); }
.rb-btn-prim:hover { background: var(--pool); }
.rb-btn-prim.is-disabled { background: var(--ink-3); cursor: not-allowed; opacity: 0.6; }
.rb-btn-sec { background: white; color: var(--ink-2); border: 1px solid var(--line); padding: 9px 18px; border-radius: 6px; cursor: pointer; font-size: 13px; font-family: var(--f-ui); }
.rb-btn-sec:hover { background: var(--surface-2); }
.rb-soft { color: var(--ink-3); font-size: 11px; }

/* Filter UI inside Report Builder */
.rb-filter-row { display: flex; flex-wrap: wrap; gap: 18px; }
.rb-filter-grp { flex: 1; min-width: 160px; }
.rb-filter-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); margin-bottom: 5px; }
.rb-filter-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.rb-fchip { padding: 4px 10px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); color: var(--ink-2); cursor: pointer; font-size: 11px; font-weight: 600; font-family: var(--f-ui); }
.rb-fchip:hover { background: var(--surface-2); }
.rb-fchip.is-on { background: var(--navy); color: white; border-color: var(--navy); }
.rb-fchip-tight { padding: 4px 8px; min-width: 28px; text-align: center; }
.rb-fchip-more { color: var(--pool); border-color: var(--pool); border-style: dashed; }
.rb-filter-summary { display: flex; align-items: center; margin-top: 10px; padding: 8px 12px; background: #f0f3fa; border-radius: 6px; font-size: 12px; color: var(--navy); }
.rb-bands-list { display: flex; flex-direction: column; gap: 6px; }
.rb-band-row { display: flex; align-items: center; gap: 8px; }

/* ============================================================
   REPORTS v2 — component polish (cards · controls · callouts)
   Lifts Cohort · Scoring · Participation · Displacement · Special Status
   ============================================================ */
/* Summary cards (Displacement) → KPI-grade treatment */
.rpt-summary-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:11px;margin-bottom:16px}
.rpt-summary-card{position:relative;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);padding:14px 16px 13px;box-shadow:var(--sh-xs);overflow:hidden;transition:transform .14s,box-shadow .14s}
.rpt-summary-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--navy),#2640b0)}
.rpt-summary-card:hover{transform:translateY(-2px);box-shadow:var(--sh)}
.rsc-count{font-size:25px;font-weight:700;color:var(--ink);font-family:var(--f-mono);line-height:1;letter-spacing:-.02em}
.rsc-label{font-size:12px;font-weight:600;color:var(--ink-2);margin-top:6px}
.rsc-sub{font-size:10.5px;color:var(--ink-3);margin-top:2px}

/* Breakdown cards (Participation) → gradient accent + lift */
.bd-card-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(178px,1fr));gap:11px;margin-bottom:16px}
.bd-card{position:relative;background:var(--surface);border:1px solid var(--line);border-top:1px solid var(--line);border-radius:var(--radius-md);padding:14px 16px;box-shadow:var(--sh-xs);overflow:hidden;transition:transform .14s,box-shadow .14s}
.bd-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--ink-4)}
.bd-card.bd-card-1::before{background:linear-gradient(90deg,var(--ink-4),#aab4c3)}
.bd-card.bd-card-2::before{background:linear-gradient(90deg,var(--pool),#00b6e8)}
.bd-card.bd-card-3::before{background:linear-gradient(90deg,var(--q-direct),#2ab86a)}
.bd-card:hover{transform:translateY(-2px);box-shadow:var(--sh)}
.bd-card-n{font-size:27px;font-weight:700;font-family:var(--f-mono);color:var(--ink);line-height:1;letter-spacing:-.02em}
.bd-card-l{font-size:12px;font-weight:600;color:var(--ink-2);margin-top:6px}
.bd-bar{border-radius:999px;height:7px}

/* Cohort summary blocks → light lift (panel already modern) */
.cohort-summary-block{transition:transform .14s,box-shadow .14s}
.cohort-summary-block:hover{transform:translateY(-2px);box-shadow:var(--sh)}

/* Scoring controls → custom chevron + pool focus ring */
.scoring-control select{appearance:none;-webkit-appearance:none;padding:8px 30px 8px 11px;border-radius:var(--radius-sm);border:1px solid var(--line);background-color:var(--surface);background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'><path d='M2 4l3 3 3-3' stroke='%23566170' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>");background-repeat:no-repeat;background-position:right 10px center;transition:border-color .14s,box-shadow .14s}
.scoring-control select:focus{outline:none;border-color:var(--pool);box-shadow:0 0 0 3px rgba(0,154,199,.16)}

/* Breakdown subtabs → polished */
.bd-tabs{gap:2px}
.bd-tab{border-radius:8px 8px 0 0;transition:.14s}
.bd-tab:hover{background:var(--surface-2);color:var(--navy)}
.bd-tab.active{border-bottom-width:2.5px}

/* Slicer + breakdown active states → brand gradient */
.cf-slicer-btn.is-active{background:linear-gradient(135deg,var(--navy),#2640b0);border-color:var(--navy)}

/* Gender mix bars → rounded */
.gm-bar{height:16px;border-radius:999px}

/* Callouts → modern */
.rpt-note{border-left-width:3px;border-radius:var(--radius-md);box-shadow:var(--sh-xs)}
.rpt-filter-note{border-radius:var(--radius-md);box-shadow:var(--sh-xs)}
.rpt-empty{border-radius:var(--radius-md)}

/* Badges + pills → fully rounded, crisp (Special Status, tables) */
.badge{border-radius:999px;font-weight:700;padding:3px 9px}
.rpt-pill{border-radius:999px;font-weight:700}
.rpt-subsection-title{font-weight:700}
`;
    document.head.appendChild(s);
  }

  /* ── Qual / Reg / Att (Pipeline Reconciliation) panel ─────────────
     Side-by-side comparison of FOUR distinct concepts at every pipeline
     stage. The whole point is to surface that these are DIFFERENT datasets
     and counts will not match — that mismatch is exactly the operational
     question (who qualified but didn't register? who registered but didn't
     attend? are there phantom attendees with no qualification?). */
  const reconcileState = { year: null };

  // Same predicate the Pipeline tab always applies to its per-stage counts:
  // drop synchro entries (a separate discipline that never advances through
  // the individual Region->Zone->E/W/C->Nationals pipeline) and, by default,
  // Future Champions / Non-Qualifier / Intermediate / Novice / host-added
  // Senior events. Applied here too so "attended"/"qualified" counts in this
  // panel describe the SAME population as the Pipeline river for the same
  // stage — without it, this panel silently included a few extra divers
  // Pipeline excludes (e.g. Zones showed 1,070 here vs. 1,063 on Pipeline).
  const RECON_INDIV_NONQUAL_SQL =
    " AND discipline IN ('1M','3M','Platform')" +
    " AND (meet_name NOT ILIKE '%Future Champions%'" +
    " AND event_name NOT ILIKE '%Future Champions%'" +
    " AND event_name NOT ILIKE 'FC %'" +
    " AND event_name NOT ILIKE 'Senior %'" +
    " AND event_name NOT ILIKE '%Non Qualifier%'" +
    " AND event_name NOT ILIKE '%Intermediate%'" +
    " AND event_name NOT ILIKE '%Novice%')";

  function renderReconcilePanel(wrap){
    if (!reconcileState.year) reconcileState.year = _currentSeason || 2026;
    const filterSummary = activeRptFilterSummary();
    wrap.innerHTML = `
      <div class="rpt-stage-results">
        <div class="rpt-flow-head">
          <div class="rpt-flow-title">Qualification &middot; Registration &middot; Attendance</div>
          <div class="rpt-soft">Side-by-side counts of distinct concepts at every pipeline stage</div>
        </div>
        ${filterSummary
          ? `<div class="rpt-active-filter" style="background:linear-gradient(90deg,#fef3c7,#fde68a);border-left-color:#d97706;color:#78350f;font-size:13px"><strong>📌 ACTIVE FILTER:</strong> ${esc(filterSummary)} <button class="rpt-export-btn" onclick="window._rptClear()" style="margin-left:8px">Clear</button></div>`
          : ''}
        <div class="recon-legend">
          <div class="recon-legend-h">Why this panel exists</div>
          <p style="margin:0 0 10px;font-size:13px;line-height:1.55;color:var(--ink)">
            At every stage there are FOUR distinct datasets that get confused for each other.
            This panel keeps them in named columns so you (and the CCE/Board) can see them side by side.
          </p>
          <div class="recon-legend-grid">
            <div class="recon-legend-col col-a"><div class="recon-legend-col-h">🅰 Qualification spots</div>Slots authorized by rulebook for that meet/stage (capacity, not athletes). May be unfilled.</div>
            <div class="recon-legend-col col-b"><div class="recon-legend-col-h">🅱 Athletes who qualified</div>Athletes who EARNED a slot by placement at the prior stage (e.g. top-3 at Zones, place 4–18, HPS pre-qualification).</div>
            <div class="recon-legend-col col-c"><div class="recon-legend-col-h">🅲 Athletes who registered</div>Athletes who actually <em>signed up</em> on the registration / qualifier list for the next stage.</div>
            <div class="recon-legend-col col-d"><div class="recon-legend-col-h">🅳 Athletes who attended</div>Athletes with a <em>result row</em> at that stage — they actually competed.</div>
          </div>
        </div>
        <div id="recon-controls" class="rpt-slicer-bar" style="margin:14px 0"><span class="rpt-slicer-lbl">Season:</span> <span id="recon-yr-chips"></span></div>
        <div id="recon-stage-table" class="rpt-card"><div class="rpt-loading">Loading per-stage reconciliation…</div></div>
        <div id="recon-band-table" class="rpt-card"><div class="rpt-loading">Loading band reconciliation…</div></div>
        <div id="recon-event-table" class="rpt-card"><div class="rpt-loading">Loading per-event reconciliation…</div></div>

        <!-- Qualification-side views. These lived on the Nationals stage, which
             meant that stage opened on a June invitation list rather than the
             championship results. They belong with the other qualified /
             registered / attended analysis. -->
        <div id="recon-nat-invited" class="rpt-card"></div>
        <div id="recon-nat-ewc" class="rpt-card"></div>
        <div id="recon-nat-list" class="rpt-card"></div>
      </div>
    `;
    loadReconcileYears();
    mountQualificationViews();
  }

  /* The three qualification-side views moved out of the Nationals stage. Each
     is rendered by qualifier-views.js / nat-reconciliation.js, which own the
     data; this only decides where they appear. */
  function mountQualificationViews(){
    var inv = document.getElementById('recon-nat-invited');
    if (inv && window.renderNatReconciliation) window.renderNatReconciliation(inv);

    var ewc = document.getElementById('recon-nat-ewc');
    if (ewc && window._qvMountComputedEWCNat) {
      ewc.innerHTML = '<h3 class="rpt-card-h">Computed E/W/C → Junior Nationals</h3>';
      var host = document.createElement('div');
      ewc.appendChild(host);
      window._qvMountComputedEWCNat(host);
    }

    var lst = document.getElementById('recon-nat-list');
    if (lst && window._qvRenderNatQualifierList) {
      lst.innerHTML = '<h3 class="rpt-card-h">Official Junior Nationals qualifier list — who was invited</h3>';
      var det = document.createElement('details');
      det.className = 'rpt-fold';
      det.innerHTML = '<summary>Show the published list by event</summary>';
      var body = document.createElement('div');
      det.appendChild(body);
      lst.appendChild(det);
      window._qvRenderNatQualifierList(body);
    }
  }

  async function loadReconcileYears(){
    try {
      const r = await neonQuery("SELECT DISTINCT year FROM core.event_results WHERE is_junior_circuit ORDER BY year DESC");
      const yrs = r.rows.map(x => x.year).filter(Boolean);
      const chips = document.getElementById('recon-yr-chips');
      if (chips) chips.innerHTML = yrs.map(y => `<button class="rpt-yr-chip ${reconcileState.year===y?'is-on':''}" onclick="window._reconYr(${y})">${y}</button>`).join('');
    } catch(_){}
    loadReconcileData();
  }

  window._reconYr = function(y){ reconcileState.year = y; renderReconcilePanel(document.querySelector('.rpt-panel-wrap')); };

  async function loadReconcileData(){
    const y = reconcileState.year;
    const fb = rptFiltersToSQL(2);
    // ── 1) Stage-level reconciliation ─────────────────────────────
    try {
      // Qualified (Neon-computed). Placement is taken on the DECIDING ROUND of
      // each event at each meet (Final if held, otherwise the latest round
      // contested) — NOT the best place across all rounds — so these match the
      // official qualifier rule and the Pipeline projection.
      //   To E/W/C (2026+): place 4-18 at Zones; top-3 at Zones = direct to Nationals
      //   To Nationals (2021-25): place 1-3 at Zones (top-3 direct)
      //   To Nationals (2026+): top-3 by deciding-round placement at E/W/C (per event, per meet)
      const isNewSystem = y >= 2026;

      const qualifiedQ = await neonQuery(`
        WITH zone_dec AS (
          SELECT diver_id_dm, event_key, place, zone,
            CASE WHEN round ILIKE 'final%' THEN 3 WHEN round ILIKE 'semi%' THEN 2
                 WHEN round ILIKE 'prelim%' THEN 1 ELSE 0 END AS rr
          FROM core.event_results
          WHERE year = $1 AND is_junior_circuit AND stage = 'Zones' AND place IS NOT NULL${fb.sql}${RECON_INDIV_NONQUAL_SQL}
        ),
        zone_best AS (
          SELECT diver_id_dm, event_key, place AS p
          FROM (SELECT diver_id_dm, event_key, place, rr,
                       MAX(rr) OVER (PARTITION BY event_key, zone) AS mrr
                FROM zone_dec) z
          WHERE rr = mrr
        ),
        ewc_dec AS (
          SELECT diver_id_dm, event_key, place, ewc_meet,
            CASE WHEN round ILIKE 'final%' THEN 3 WHEN round ILIKE 'semi%' THEN 2
                 WHEN round ILIKE 'prelim%' THEN 1 ELSE 0 END AS rr
          FROM core.event_results
          WHERE year = $1 AND is_junior_circuit AND stage = 'EWC' AND place IS NOT NULL${fb.sql}${RECON_INDIV_NONQUAL_SQL}
        ),
        ewc_best AS (
          SELECT diver_id_dm, event_key, place AS p
          FROM (SELECT diver_id_dm, event_key, place, rr,
                       MAX(rr) OVER (PARTITION BY event_key, ewc_meet) AS mrr
                FROM ewc_dec) e
          WHERE rr = mrr
        )
        SELECT
          (SELECT COUNT(DISTINCT diver_id_dm)::int FROM zone_best) AS qualified_for_ewc_or_nat,
          (SELECT COUNT(DISTINCT diver_id_dm)::int FROM zone_best WHERE p BETWEEN 1 AND 3) AS qualified_to_nat_direct,
          (SELECT COUNT(DISTINCT diver_id_dm)::int FROM zone_best WHERE p BETWEEN 4 AND 18) AS qualified_to_ewc_band,
          (SELECT COUNT(DISTINCT diver_id_dm)::int FROM ewc_best WHERE p BETWEEN 1 AND 3) AS qualified_to_nat_from_ewc
      `, [y, ...fb.params]);

      // Attended (Neon)
      const attendedQ = await neonQuery(`
        SELECT stage, COUNT(DISTINCT diver_id_dm)::int AS n
        FROM core.event_results
        WHERE year = $1 AND is_junior_circuit${fb.sql}${RECON_INDIV_NONQUAL_SQL}
        GROUP BY stage
      `, [y, ...fb.params]);

      const att = {};
      attendedQ.rows.forEach(r => att[r.stage] = r.n);
      const q = qualifiedQ.rows[0] || {};

      // Registered counts come from in-app data files (USAD_EWC_DATA + JO_NAT_QUALIFIERS).
      // These only have current-year (2026) data. Older years: registered = unknown / "—".
      let regEWC = '—';
      let regNat = '—';

      /* Both registration files key the athlete on `name`; this counted
         `entry.athlete`, which exists on neither. Every athlete therefore
         collapsed to one empty string and both cells read "1" — for lists of
         521 and 237 people.

         Neither file carries ageGroup/gender/discipline either, so the old
         filter test could never fire and this column silently ignored the
         filter bar while every other column honoured it. Both files DO carry
         the athlete's event names, so the demographics are parsed from those
         and an athlete counts if any of their events matches the filter. */
      const evDemog = (evName) => {
        const t = String(evName || '');
        const ag = (t.match(/Group\s*([A-D])\b/i) || [])[1];
        return {
          ageGroup: ag ? 'Group ' + ag.toUpperCase() : '',
          gender: /girls/i.test(t) ? 'Girls' : (/boys/i.test(t) ? 'Boys' : ''),
          discipline: /platform|tower/i.test(t) ? 'Platform'
                    : (/\b3m\b/i.test(t) ? '3M' : (/\b1m\b/i.test(t) ? '1M' : '')),
        };
      };
      const entryMatches = (events) => {
        const f = rptState || {};
        if (!f.ageGroup && !f.gender && !f.discipline) return true;
        return (events || []).some(evName => {
          const d = evDemog(evName);
          if (f.ageGroup   && d.ageGroup   !== f.ageGroup)   return false;
          if (f.gender     && d.gender     !== f.gender)     return false;
          if (f.discipline && d.discipline !== f.discipline) return false;
          return true;
        });
      };
      const countRegistered = (list, evKey) => {
        const names = new Set();
        (list || []).forEach(e => {
          const nm = (e.name || '').trim().toLowerCase();
          if (!nm) return;
          if (entryMatches(e[evKey])) names.add(nm);
        });
        return names.size;
      };
      if (y === currentRegSeason()) {
        try {
          if (window.USAD_EWC_DATA && Array.isArray(window.USAD_EWC_DATA.entries)) {
            regEWC = countRegistered(window.USAD_EWC_DATA.entries, 'events');
          }
          if (window.USAD_JO_NAT_QUALIFIERS && Array.isArray(window.USAD_JO_NAT_QUALIFIERS.qualifiers)) {
            regNat = countRegistered(window.USAD_JO_NAT_QUALIFIERS.qualifiers, 'qualifiedEvents');
          }
        } catch(_){}
      }

      // Compose table
      // Stage rows: Regionals, Zones, E/W/C (if 2026+), Nationals
      const stages = [
        { key:'Regionals', label:'Regionals', spots:'<span class="rpt-soft">capacity unbounded (open registration)</span>', qualified:'<span class="rpt-soft">n/a (entry stage)</span>', registered:'<span class="rpt-soft">—</span>', attended: att['Regionals']||0 },
        { key:'Zones', label:'Zones', spots:'<span class="rpt-soft">limited by Regionals advancement</span>', qualified:'<span class="rpt-soft">all Regionals advancers</span>', registered:'<span class="rpt-soft">—</span>', attended: att['Zones']||0 },
      ];
      if (isNewSystem) {
        stages.push({
          key:'EWC', label:'E/W/C',
          spots: '<span class="rpt-soft">3 zones × events × ~15 per event</span>',
          qualified: `<strong>${fmtNum(q.qualified_to_ewc_band||0)}</strong> at Zones places 4–18`,
          registered: regEWC === '—' ? '<span class="rpt-soft">—</span>' : `<strong>${fmtNum(regEWC)}</strong>`,
          attended: att['EWC']||0,
        });
      }
      stages.push({
        key:'Nationals', label:'Junior Nationals',
        spots: '<span class="rpt-soft">per-event quotas in rulebook</span>',
        qualified: isNewSystem
          ? `<strong>${fmtNum((q.qualified_to_nat_direct||0)+(q.qualified_to_nat_from_ewc||0))}</strong> (${fmtNum(q.qualified_to_nat_direct||0)} top-3 Zones + ${fmtNum(q.qualified_to_nat_from_ewc||0)} top E/W/C)`
          : `<strong>${fmtNum(q.qualified_to_nat_direct||0)}</strong> top-3 at Zones (direct)`,
        registered: regNat === '—' ? '<span class="rpt-soft">—</span>' : `<strong>${fmtNum(regNat)}</strong>`,
        /* This read `y >= 2026 ? 'event has not occurred'`, which stayed wrong
           from the moment the meet was scored — the per-event table directly
           below it was already showing Nationals attendance on the same page.
           Ask the data instead: a stage with result rows has occurred. */
        attended: att['Nationals'] > 0
          ? att['Nationals']
          : '<span class="rpt-soft">not yet contested</span>',
      });

      const el = document.getElementById('recon-stage-table');
      el.innerHTML = `
        <h3 class="rpt-card-h">Stage-level reconciliation · ${y} season</h3>
        <div class="rpt-soft" style="margin-bottom:8px">Each column is a DIFFERENT dataset. Numbers will not match each other — gaps are operationally interesting.</div>
        <table class="rpt-table recon-table">
          <thead><tr>
            <th>Stage</th>
            <th class="recon-col-a">🅰 Qualification spots</th>
            <th class="recon-col-b">🅱 Athletes who qualified</th>
            <th class="recon-col-c">🅲 Athletes who registered</th>
            <th class="recon-col-d">🅳 Athletes who attended</th>
          </tr></thead>
          <tbody>
            ${stages.map(s => `<tr>
              <td><strong>${esc(s.label)}</strong></td>
              <td class="recon-col-a-cell">${s.spots}</td>
              <td class="recon-col-b-cell">${s.qualified}</td>
              <td class="recon-col-c-cell">${s.registered}</td>
              <td class="recon-col-d-cell"><strong>${typeof s.attended==='number'?fmtNum(s.attended):s.attended}</strong></td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="rpt-soft" style="margin-top:10px;font-size:11px;line-height:1.6">
          <strong>Column data sources:</strong><br>
          🅰 <em>Spots</em> — Per-event quotas per the Technical Rulebook (not yet wired into the data; descriptive text only).<br>
          🅱 <em>Qualified</em> — Computed from Neon <code>core.event_results</code> placements at the prior stage.<br>
          🅲 <em>Registered</em> — From <code>USAD_EWC_DATA.entries</code> (E/W/C) and <code>USAD_JO_NAT_QUALIFIERS.qualifiers</code> (Nationals list). Current season only.<br>
          🅳 <em>Attended</em> — <code>COUNT(DISTINCT diver_id_dm) FROM core.event_results WHERE stage = X</code>.
        </div>
      `;
    } catch (e) {
      const el = document.getElementById('recon-stage-table');
      if (el) el.innerHTML = '<div class="rpt-err">Failed: '+esc(String(e.message||e))+'</div>';
    }

    // ── 2) Band-level reconciliation (Zones place band → E/W/C) ───
    try {
      const r = await neonQuery(`
        WITH zone_best AS (
          SELECT diver_id_dm, event_key, MIN(place) AS p
          FROM core.event_results
          WHERE year = $1 AND is_junior_circuit AND stage='Zones' AND place IS NOT NULL${fb.sql}
          GROUP BY diver_id_dm, event_key
        ),
        ewc_attended AS (
          SELECT DISTINCT diver_id_dm, event_key
          FROM core.event_results
          WHERE year = $1 AND is_junior_circuit AND stage='EWC'${fb.sql}
        )
        SELECT
          CASE WHEN zb.p BETWEEN 1 AND 3 THEN '1-3'
               WHEN zb.p BETWEEN 4 AND 10 THEN '4-10'
               WHEN zb.p BETWEEN 11 AND 18 THEN '11-18'
               ELSE '19+' END AS band,
          COUNT(*)::int AS qualified,
          COUNT(*) FILTER (WHERE ea.diver_id_dm IS NOT NULL)::int AS attended
        FROM zone_best zb
        LEFT JOIN ewc_attended ea USING (diver_id_dm, event_key)
        GROUP BY band ORDER BY band
      `, [y, ...fb.params]);

      // Pull registered-by-band from USAD_EWC_DATA if possible (only current year, only if entries have zone placement)
      // We approximate by counting registered athletes via name match to zone_best
      const bands = [
        { label:'1-3 (top-3 direct)', min:1, max:3 },
        { label:'4-10 (qualifier band)', min:4, max:10 },
        { label:'11-18 (alternate / E/W/C band)', min:11, max:18 },
        { label:'19+ (below cut)', min:19, max:99 },
      ];
      const dataByBand = {};
      r.rows.forEach(x => dataByBand[x.band] = x);

      const el2 = document.getElementById('recon-band-table');
      el2.innerHTML = `
        <h3 class="rpt-card-h">Zone placement band reconciliation · ${y}</h3>
        <div class="rpt-soft" style="margin-bottom:8px">For each Zone placement band: how many athletes qualified vs. how many actually attended ${isNewSystemReconcile(y)?'E/W/C':'Junior Nationals'}.</div>
        <table class="rpt-table recon-table">
          <thead><tr>
            <th>Zone placement band</th>
            <th class="recon-col-b">🅱 Qualified count</th>
            <th class="recon-col-d">🅳 Attended count</th>
            <th>Attendance rate</th>
            <th>Gap (qualified − attended)</th>
          </tr></thead>
          <tbody>
            ${bands.map(b => {
              const k = b.label.split(' ')[0];
              const d = dataByBand[k];
              if (!d || !d.qualified) return `<tr><td><strong>${esc(b.label)}</strong></td><td colspan=4 class="rpt-soft">no data</td></tr>`;
              const rate = d.qualified ? Math.round(100*d.attended/d.qualified)+'%' : '—';
              const gap = d.qualified - d.attended;
              return `<tr>
                <td><strong>${esc(b.label)}</strong></td>
                <td class="recon-col-b-cell">${fmtNum(d.qualified)}</td>
                <td class="recon-col-d-cell"><strong>${fmtNum(d.attended)}</strong></td>
                <td>${rate}</td>
                <td style="color:${gap>0?'#d97706':'var(--ink-3)'}">${gap>0?'-'+fmtNum(gap):'0'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      const el2 = document.getElementById('recon-band-table');
      if (el2) el2.innerHTML = '<div class="rpt-err">Failed (band): '+esc(String(e.message||e))+'</div>';
    }

    // ── 3) Per-event reconciliation ────────────────────────────────
    try {
      const r = await neonQuery(`
        SELECT event_key,
          COUNT(DISTINCT diver_id_dm) FILTER (WHERE stage='Zones')::int AS zones_n,
          COUNT(DISTINCT diver_id_dm) FILTER (WHERE stage='EWC')::int AS ewc_n,
          COUNT(DISTINCT diver_id_dm) FILTER (WHERE stage='Nationals')::int AS nat_n
        FROM core.event_results
        WHERE year = $1 AND is_junior_circuit${fb.sql}
        GROUP BY event_key
        HAVING COUNT(DISTINCT diver_id_dm) FILTER (WHERE stage='Zones') > 0
        ORDER BY event_key
      `, [y, ...fb.params]);
      const el3 = document.getElementById('recon-event-table');
      if (el3) {
        el3.innerHTML = `
          <h3 class="rpt-card-h">Per-event reconciliation · ${y}</h3>
          <div class="rpt-soft" style="margin-bottom:8px">Attended counts at each stage, by event_key. Use this to spot events where attendance falls off unexpectedly.</div>
          <div class="rpt-table-scroll" style="max-height:480px;overflow:auto">
            <table class="rpt-table recon-table">
              <thead><tr><th>Event</th><th class="recon-col-d">🅳 at Zones</th><th class="recon-col-d">🅳 at E/W/C</th><th class="recon-col-d">🅳 at Nationals</th><th>Z→EWC retention</th></tr></thead>
              <tbody>
                ${r.rows.map(x => {
                  const z2e = (x.zones_n && x.ewc_n) ? Math.round(100*x.ewc_n/x.zones_n)+'%' : '—';
                  return `<tr>
                    <td><strong>${esc(x.event_key||'')}</strong></td>
                    <td class="recon-col-d-cell">${fmtNum(x.zones_n||0)}</td>
                    <td class="recon-col-d-cell">${x.ewc_n?fmtNum(x.ewc_n):'<span class="rpt-soft">—</span>'}</td>
                    <td class="recon-col-d-cell">${x.nat_n?fmtNum(x.nat_n):'<span class="rpt-soft">—</span>'}</td>
                    <td>${z2e}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (e) {
      const el3 = document.getElementById('recon-event-table');
      if (el3) el3.innerHTML = '<div class="rpt-err">Failed (event): '+esc(String(e.message||e))+'</div>';
    }
  }

  function isNewSystemReconcile(y){ return y >= 2026; }

  /* ── Historical (multi-year) panel ─────────────────────────────
     Queries Neon for cross-year stats. Default selected years: all available.
     Shows year × stage matrix, demographic shift, regional strength, dropoff. */
  const fmt = fmtNum;  // alias for new panels (rest of module uses fmtNum)
  const histState = {
    yearsSelected: null,   // null = all years; otherwise Set of selected years
    drillKind: null,       // null | 'yearStage' | 'demographic'
    drillContext: null,
  };

  async function neonQuery(sql, params){
    if (!window.NEON || !window.NEON.query) throw new Error('Neon client not loaded');
    return await window.NEON.query(sql, params || []);
  }

  function renderHistoricalPanel(wrap){
    const filterSummary = activeRptFilterSummary();
    const filterTag = filterSummary ? ` <span class="rpt-filt-tag">${esc(filterSummary)}</span>` : '';
    wrap.innerHTML = `
      <div class="rpt-stage-results">
        <div class="rpt-flow-head">
          <div class="rpt-flow-title">Historical comparison${filterTag} <span class="rpt-soft">(2021&ndash;present)</span></div>
          <div class="rpt-soft">Live from Neon: <code>core.event_results</code> · Build 202606271716</div>
        </div>
        ${filterSummary
          ? `<div class="rpt-active-filter" style="background:linear-gradient(90deg,#fef3c7,#fde68a);border-left-color:#d97706;color:#78350f;font-size:13px">
              <strong>📌 ACTIVE FILTER:</strong> ${esc(filterSummary)} · all 5 queries below are scoped to this subset.
              <button class="rpt-export-btn" onclick="window._rptClear()" style="margin-left:8px">Clear all filters</button>
            </div>`
          : `<div class="rpt-active-filter" style="background:#f6f7fa;border-left-color:#9aa3b1;color:var(--ink-3);font-size:11px;font-style:italic">
              No filters active. Use chips above to filter by age group, gender, board, region, zone, etc.
            </div>`}
        <div id="hist-controls" class="rpt-slicer-bar" style="margin-bottom:14px"></div>
        <div id="hist-overall" class="rpt-card"><div class="rpt-loading">Loading overall stats…</div></div>
        <div id="hist-matrix" class="rpt-card"><div class="rpt-loading">Loading year &times; stage matrix…</div></div>
        <div id="hist-funnel" class="rpt-card"><div class="rpt-loading">Loading per-year funnel comparison…</div></div>
        <div id="hist-demographics" class="rpt-card"><div class="rpt-loading">Loading demographic shift over time…</div></div>
        <div id="hist-region" class="rpt-card"><div class="rpt-loading">Loading regional strength over time…</div></div>
      </div>
    `;
    loadHistoricalData();
  }

  /* Convert the global filter chips (rptState ageGroup/gender/discipline/region/zone/ewc/team)
     into an extra-AND WHERE fragment + params for Neon queries on core.event_results.
     `startIdx` is the next $N parameter index (since most queries use $1 for years). */
  function rptFiltersToSQL(startIdx){
    let n = startIdx || 1;
    const f = rptState || {};
    const conds = [];
    const params = [];
    if (f.ageGroup)   { conds.push('age_group = $'+(n++));   params.push(f.ageGroup); }
    if (f.gender)     { conds.push('gender = $'+(n++));      params.push(f.gender); }
    if (f.discipline) { conds.push('discipline = $'+(n++));  params.push(f.discipline); }
    if (f.region)     { conds.push('region = $'+(n++));      params.push(parseInt(f.region, 10)); }
    if (f.zone)       { conds.push('zone = $'+(n++));        params.push(f.zone); }
    if (f.ewc)        { conds.push('ewc_meet = $'+(n++));    params.push(f.ewc); }
    if (f.team)       { conds.push('team_name = $'+(n++));   params.push(f.team); }
    return { sql: conds.length ? ' AND ' + conds.join(' AND ') : '', params: params };
  }

  function activeRptFilterSummary(){
    const f = rptState || {};
    const parts = [];
    if (f.ageGroup) parts.push(f.ageGroup);
    if (f.gender) parts.push(f.gender);
    if (f.discipline) parts.push(f.discipline);
    if (f.region) parts.push('Region ' + f.region);
    if (f.zone) parts.push('Zone ' + f.zone);
    if (f.ewc) parts.push('E/W/C: ' + f.ewc);
    if (f.team) parts.push('Team: ' + f.team);
    return parts.length ? parts.join(' · ') : null;
  }

  async function loadHistoricalData(){
    try {
      const fb = rptFiltersToSQL(1);
      console.log('[Historical] rptState filters:', JSON.parse(JSON.stringify(rptState)), 'SQL fragment:', fb.sql, 'params:', fb.params);
      // Overall: rows-per-year, athletes-per-year, junior-circuit %
      const r = await neonQuery(
        "SELECT year, COUNT(*)::int AS rows, "+
        "COUNT(DISTINCT diver_id_dm)::int AS divers, "+
        "COUNT(*) FILTER (WHERE is_junior_circuit)::int AS jr_rows, "+
        "COUNT(DISTINCT diver_id_dm) FILTER (WHERE is_junior_circuit)::int AS jr_divers "+
        "FROM core.event_results WHERE year IS NOT NULL"+fb.sql+" GROUP BY year ORDER BY year",
        fb.params
      );
      const years = r.rows.map(x => x.year);
      if (histState.yearsSelected === null) histState.yearsSelected = new Set(years);
      renderHistoricalControls(years);
      renderHistoricalOverall(r.rows);
      renderHistoricalMatrix();
      renderHistoricalFunnel();
      renderHistoricalDemographics();
      renderHistoricalRegion();
    } catch (e) {
      document.getElementById('hist-overall').innerHTML =
        '<div class="rpt-err">Failed to load from Neon: '+esc(String(e.message||e))+'</div>'+
        '<div class="rpt-soft" style="margin-top:8px">Check <a href="neon-status.html">neon-status.html</a> for diagnostics.</div>';
    }
  }

  function renderHistoricalControls(years){
    const el = document.getElementById('hist-controls');
    if (!el) return;
    const sel = histState.yearsSelected;
    el.innerHTML = '<span class="rpt-slicer-lbl">Compare years:</span> '+
      years.map(y => `<button class="rpt-yr-chip ${sel.has(y)?'is-on':''}" onclick="window._histToggleYear(${y})">${y}</button>`).join('') +
      ` <button class="rpt-yr-chip" onclick="window._histAllYears()">All</button>`+
      ` <button class="rpt-yr-chip" onclick="window._histRecent()">Last 3</button>`;
  }

  function renderHistoricalOverall(perYear){
    const el = document.getElementById('hist-overall');
    if (!el) return;
    const sel = histState.yearsSelected;
    const shown = perYear.filter(x => sel.has(x.year));
    const totRows = shown.reduce((a,b)=>a+b.rows, 0);
    const totJr   = shown.reduce((a,b)=>a+b.jr_rows, 0);
    const totDv   = shown.reduce((a,b)=>a+b.divers, 0);  // not unique across years
    el.innerHTML = `
      <h3 class="rpt-card-h">Selected years: ${shown.length} (${shown.map(x=>x.year).join(', ') || '—'})</h3>
      <div class="rpt-stats-row">
        <div class="rpt-stat"><div class="rpt-stat-num">${fmt(totRows)}</div><div class="rpt-stat-lbl">Total result rows</div></div>
        <div class="rpt-stat"><div class="rpt-stat-num">${fmt(totJr)}</div><div class="rpt-stat-lbl">Junior circuit rows</div></div>
        <div class="rpt-stat"><div class="rpt-stat-num">${fmt(totDv)}</div><div class="rpt-stat-lbl">Diver-year appearances</div></div>
      </div>
      <table class="rpt-table" style="margin-top:14px">
        <thead><tr><th>Year</th><th>Rows</th><th>Junior circuit</th><th>Unique divers</th><th>JR %</th></tr></thead>
        <tbody>
          ${shown.map(x => `<tr>
            <td><strong>${x.year}</strong></td>
            <td>${fmt(x.rows)}</td>
            <td>${fmt(x.jr_rows)}</td>
            <td>${fmt(x.divers)}</td>
            <td>${(100*x.jr_rows/Math.max(1,x.rows)).toFixed(1)}%</td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  async function renderHistoricalMatrix(){
    const el = document.getElementById('hist-matrix'); if (!el) return;
    try {
      const fb = rptFiltersToSQL(1);
      const r = await neonQuery(
        "SELECT year, stage, COUNT(DISTINCT diver_id_dm)::int AS athletes "+
        "FROM core.event_results WHERE is_junior_circuit AND year IS NOT NULL"+fb.sql+" "+
        "GROUP BY year, stage ORDER BY year, stage",
        fb.params
      );
      const sel = histState.yearsSelected;
      const stages = stagesForYear(selectedYear());
      const years = Array.from(new Set(r.rows.map(x=>x.year))).filter(y => sel.has(y)).sort();
      const grid = {};
      r.rows.forEach(x => { grid[x.year+'|'+x.stage] = x.athletes; });
      el.innerHTML = `
        <h3 class="rpt-card-h">Athletes per stage, by year <span class="rpt-soft">(junior circuit, unique divers per stage)</span></h3>
        <table class="rpt-table">
          <thead><tr><th>Year</th>${stages.map(s=>`<th>${s}</th>`).join('')}<th>R→Z drop</th><th>Z→N or Z→EWC drop</th></tr></thead>
          <tbody>
          ${years.map(y => {
            const reg = grid[y+'|Regionals']||0;
            const zon = grid[y+'|Zones']||0;
            const ewc = grid[y+'|EWC']||0;
            const nat = grid[y+'|Nationals']||0;
            const r2z = reg ? (1 - zon/reg) : null;
            // 2026+ uses EWC, 2021-25 uses Nationals
            const nextStage = y >= 2026 ? ewc : nat;
            const z2n = zon ? (1 - nextStage/zon) : null;
            return `<tr>
              <td><strong>${y}</strong></td>
              <td>${fmt(reg)}</td>
              <td>${fmt(zon)}</td>
              <td>${ewc?fmt(ewc):'<span class="rpt-soft">—</span>'}</td>
              <td>${nat?fmt(nat):'<span class="rpt-soft">—</span>'}</td>
              <td>${r2z !== null ? (r2z*100).toFixed(1)+'%' : ''}</td>
              <td>${z2n !== null ? (z2n*100).toFixed(1)+'%' : ''}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
        <div class="rpt-soft" style="margin-top:8px">Unique divers per stage. An athlete in multiple events at the same stage is counted once. R→Z drop is the % of Regionals divers who didn't appear at Zones.</div>
      `;
    } catch (e) {
      el.innerHTML = '<div class="rpt-err">Failed to load matrix: '+esc(String(e.message||e))+'</div>';
    }
  }

  async function renderHistoricalFunnel(){
    const el = document.getElementById('hist-funnel'); if (!el) return;
    try {
      // For each year, count distinct divers entering each stage
      const sel = histState.yearsSelected;
      if (sel.size === 0) { el.innerHTML = ''; return; }
      const yrList = Array.from(sel).sort();
      el.innerHTML = `<h3 class="rpt-card-h">Per-year mini-funnels</h3><div id="hist-funnel-grid" class="cf-mini-grid"></div>`;
      const grid = el.querySelector('#hist-funnel-grid');
      grid.innerHTML = yrList.map(y => `<div class="cf-mini-card" id="hf-${y}" style="background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:12px"><div class="cf-mini-title" style="font-weight:700;color:var(--navy);font-size:14px;margin-bottom:8px;font-family:var(--f-display)">${y}</div><div class="rpt-loading">…</div></div>`).join('');
      // Parallel queries
      await Promise.all(yrList.map(async y => {
        const fb = rptFiltersToSQL(2);
        const r = await neonQuery(
          "SELECT stage, COUNT(DISTINCT diver_id_dm)::int AS n "+
          "FROM core.event_results WHERE year = $1 AND is_junior_circuit"+fb.sql+" "+
          "GROUP BY stage ORDER BY stage",
          [y, ...fb.params]
        );
        const m = {};
        r.rows.forEach(x => m[x.stage] = x.n);
        const reg = m['Regionals']||0, zon = m['Zones']||0, ewc = m['EWC']||0, nat = m['Nationals']||0;
        const stages = [
          {k:'Regionals', n:reg, col:'var(--navy)', txt:'#fff'},
          {k:'Zones',     n:zon, col:'var(--pool)', txt:'var(--navy)'},
        ];
        if (ewc) stages.push({k:'E/W/C', n:ewc, col:'var(--sky)', txt:'var(--navy)'});
        if (nat) stages.push({k:'Nationals', n:nat, col:'var(--q-direct)', txt:'#fff'});
        const max = Math.max.apply(null, stages.map(s => s.n));
        const html = stages.map(s => `
          <div class="cf-mini-row">
            <div class="cf-mini-bar" style="width:${max?Math.max(2, 100*s.n/max):0}%;background:${s.col};height:22px;line-height:22px;border-radius:4px;color:${s.txt};padding:0 10px;min-width:50px;display:flex;align-items:center"><span style="font-family:var(--f-mono);font-size:12px;font-weight:700">${fmt(s.n)}</span></div>
            <div class="cf-mini-lbl" style="font-size:11px;color:var(--ink-3);margin:1px 0 6px">${s.k}</div>
          </div>`).join('');
        const cell = document.getElementById('hf-'+y);
        if (cell) cell.innerHTML = `<div class="cf-mini-title" style="font-weight:700;color:var(--navy);font-size:14px;margin-bottom:8px;font-family:var(--f-display)">${y}</div>${html}`;
      }));
    } catch (e) {
      el.innerHTML = '<div class="rpt-err">Failed to load funnel: '+esc(String(e.message||e))+'</div>';
    }
  }

  async function renderHistoricalDemographics(){
    const el = document.getElementById('hist-demographics'); if (!el) return;
    try {
      const sel = histState.yearsSelected;
      const yrList = Array.from(sel).sort();
      const fb = rptFiltersToSQL(2);
      const r = await neonQuery(
        "SELECT year, age_group, gender, COUNT(DISTINCT diver_id_dm)::int AS n "+
        "FROM core.event_results WHERE is_junior_circuit AND stage IN ('Regionals','Zones','EWC','Nationals','AgeGroup-Nationals') "+
        "AND year = ANY($1::int[])"+fb.sql+" "+
        "GROUP BY year, age_group, gender ORDER BY year, age_group, gender",
        ['{'+yrList.join(',')+'}', ...fb.params]
      );
      // Pivot: rows = year, cols = age_group_gender combos
      const combos = ['Group A Boys','Group A Girls','Group B Boys','Group B Girls','Group C Boys','Group C Girls','Group D Boys','Group D Girls'];
      const grid = {};
      r.rows.forEach(x => grid[x.year+'|'+(x.age_group||'?')+' '+(x.gender||'?')] = x.n);
      el.innerHTML = `
        <h3 class="rpt-card-h">Demographic mix (unique divers participating, by age group × gender)</h3>
        <table class="rpt-table">
          <thead><tr><th>Year</th>${combos.map(c=>`<th>${c.replace('Group ','Gp ')}</th>`).join('')}<th>Total</th></tr></thead>
          <tbody>
          ${yrList.map(y => {
            let tot = 0;
            const cells = combos.map(c => { const n = grid[y+'|'+c]||0; tot += n; return `<td>${n?fmt(n):'<span class="rpt-soft">·</span>'}</td>`; }).join('');
            return `<tr><td><strong>${y}</strong></td>${cells}<td><strong>${fmt(tot)}</strong></td></tr>`;
          }).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      el.innerHTML = '<div class="rpt-err">Failed to load demographics: '+esc(String(e.message||e))+'</div>';
    }
  }

  async function renderHistoricalRegion(){
    const el = document.getElementById('hist-region'); if (!el) return;
    try {
      const sel = histState.yearsSelected;
      const yrList = Array.from(sel).sort();
      const fb = rptFiltersToSQL(2);
      const r = await neonQuery(
        "SELECT year, region, COUNT(DISTINCT diver_id_dm)::int AS n "+
        "FROM core.event_results WHERE is_junior_circuit AND region IS NOT NULL "+
        "AND year = ANY($1::int[])"+fb.sql+" "+
        "GROUP BY year, region ORDER BY year, region",
        ['{'+yrList.join(',')+'}', ...fb.params]
      );
      const regs = Array.from({length:12}, (_,i)=>i+1);
      const grid = {};
      r.rows.forEach(x => grid[x.year+'|'+x.region] = x.n);
      el.innerHTML = `
        <h3 class="rpt-card-h">Regional strength (divers at Regionals, by region × year)</h3>
        <table class="rpt-table">
          <thead><tr><th>Year</th>${regs.map(r=>`<th>R${r}</th>`).join('')}<th>Total</th></tr></thead>
          <tbody>
          ${yrList.map(y => {
            let tot = 0;
            const cells = regs.map(r => { const n = grid[y+'|'+r]||0; tot += n; return `<td>${n?fmt(n):'<span class="rpt-soft">·</span>'}</td>`; }).join('');
            return `<tr><td><strong>${y}</strong></td>${cells}<td><strong>${fmt(tot)}</strong></td></tr>`;
          }).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      el.innerHTML = '<div class="rpt-err">Failed to load regional view: '+esc(String(e.message||e))+'</div>';
    }
  }

  // Window handlers
  window._histToggleYear = function(y){
    if (histState.yearsSelected.has(y)) histState.yearsSelected.delete(y);
    else histState.yearsSelected.add(y);
    loadHistoricalData();
  };
  window._histAllYears = function(){
    histState.yearsSelected = null;
    loadHistoricalData();
  };
  window._histRecent = function(){
    histState.yearsSelected = new Set([2024,2025,2026]);
    loadHistoricalData();
  };

  /* ── Declined Nationals panel ──────────────────────────────────
     For each year, finds athletes who placed top 3 at Zones (event-by-event)
     but DID NOT appear at the subsequent destination stage:
       - 2021-2025: subsequent = Junior Nationals
       - 2026+: subsequent = E/W/C  (since under new system top 3 from Zones go direct to Junior Nats; this view captures Zones top-3 absent from EWC if year=2026 only relevant if E/W/C is treated as next stage; for 2026 only, decliners = top-3 Zone qualifiers absent from Junior Nationals — but 2026 Junior Nats hasn't happened yet, so we show top-3 absent from E/W/C as a proxy for engagement)
     This is the headline CCE/Board question: "how many top-3 Zone qualifiers chose not to compete at the next stage?"
  */
  const declState = { years: null, drill: null };

  function renderDeclinedPanel(wrap){
    const filterSummary = activeRptFilterSummary();
    wrap.innerHTML = `
      <div class="rpt-stage-results">
        <div class="rpt-flow-head">
          <div class="rpt-flow-title">Declined Nationals <span class="rpt-soft">(top-3 Zone qualifiers absent from next stage)</span></div>
          <div class="rpt-soft">Live from Neon. Old system (2021&ndash;2025): next stage = Junior Nationals. 2026+: next = E/W/C.</div>
        </div>
        ${filterSummary ? `<div class="rpt-active-filter">📌 Filtering: <strong>${esc(filterSummary)}</strong> <button class="rpt-export-btn" onclick="window._rptClear()" style="margin-left:8px">Clear filters</button></div>` : ''}
        <div id="decl-controls" class="rpt-slicer-bar" style="margin-bottom:14px"></div>
        <div id="decl-summary" class="rpt-card"><div class="rpt-loading">Loading…</div></div>
        <div id="decl-by-year" class="rpt-card"><div class="rpt-loading">Loading by-year breakdown…</div></div>
        <div id="decl-by-demographic" class="rpt-card"><div class="rpt-loading">Loading demographic breakdown…</div></div>
        <div id="decl-athletes" class="rpt-card"><div class="rpt-loading">Loading athletes list…</div></div>
      </div>
    `;
    loadDeclinedData();
  }

  async function loadDeclinedData(){
    try {
      // First, get list of available years
      const yrRes = await neonQuery(
        "SELECT DISTINCT year FROM core.event_results WHERE is_junior_circuit AND stage='Zones' AND year IS NOT NULL ORDER BY year"
      );
      const years = yrRes.rows.map(r=>r.year);
      if (declState.years === null) declState.years = new Set(years);
      renderDeclinedControls(years);
      runDeclinedAnalysis();
    } catch (e) {
      document.getElementById('decl-summary').innerHTML =
        '<div class="rpt-err">Failed to load: '+esc(String(e.message||e))+'</div>';
    }
  }

  function renderDeclinedControls(years){
    const el = document.getElementById('decl-controls'); if (!el) return;
    const sel = declState.years;
    el.innerHTML = '<span class="rpt-slicer-lbl">Years:</span> '+
      years.map(y => `<button class="rpt-yr-chip ${sel.has(y)?'is-on':''}" onclick="window._declToggleYear(${y})">${y}</button>`).join('') +
      ` <button class="rpt-yr-chip" onclick="window._declAllYears()">All</button>`+
      ` <button class="rpt-yr-chip" onclick="window._declPre2026()">2021–2025 (old system)</button>`;
  }

  async function runDeclinedAnalysis(){
    const yrs = Array.from(declState.years).sort();
    if (yrs.length === 0) {
      document.getElementById('decl-summary').innerHTML = '<div class="rpt-soft">Select at least one year above.</div>';
      ['decl-by-year','decl-by-demographic','decl-athletes'].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerHTML = '';
      });
      return;
    }
    try {
      const fb = rptFiltersToSQL(2);
      // SQL: for each year, get athletes who were top-3 at Zones (by FINAL place per event_key)
      // who did NOT appear at the next stage in same year (Junior Nationals for 2021-25, E/W/C for 2026).
      const sql = `
        WITH zones_top3 AS (
          SELECT DISTINCT ON (year, event_key, zone, diver_id_dm)
            year, event_key, zone, diver_id_dm,
            place AS zone_place,
            score AS zone_score,
            diver_first, diver_last, team_name, age_group, gender, discipline, region
          FROM core.event_results
          WHERE is_junior_circuit AND stage='Zones' AND round IN ('Final','')
            AND place IS NOT NULL AND place BETWEEN 1 AND 3
            AND year = ANY($1::int[])${fb.sql}
          ORDER BY year, event_key, zone, diver_id_dm, place
        ),
        next_stage AS (
          SELECT DISTINCT year, event_key, diver_id_dm
          FROM core.event_results
          WHERE is_junior_circuit
            AND ((year < 2026 AND stage='Nationals') OR (year >= 2026 AND stage IN ('EWC','Nationals')))
            AND year = ANY($1::int[])
        )
        SELECT z.year, z.event_key, z.zone, z.diver_id_dm,
               z.zone_place, z.zone_score, z.diver_first, z.diver_last,
               z.team_name, z.age_group, z.gender, z.discipline, z.region
        FROM zones_top3 z
        LEFT JOIN next_stage n
          ON n.year = z.year AND n.event_key = z.event_key AND n.diver_id_dm = z.diver_id_dm
        WHERE n.diver_id_dm IS NULL
        ORDER BY z.year DESC, z.zone, z.event_key, z.zone_place
      `.replace("AND year = ANY($1::int[])\n        ),", "AND year = ANY($1::int[])"+fb.sql+"\n        ),");
      const r = await neonQuery(sql, ['{'+yrs.join(',')+'}', ...fb.params]);
      const rows = r.rows;

      // Summary
      const sumEl = document.getElementById('decl-summary');
      const tot = rows.length;
      const byYear = {}, byZone = {}, byGroup = {}, byGender = {}, byDisc = {};
      rows.forEach(x => {
        byYear[x.year] = (byYear[x.year]||0)+1;
        byZone[x.zone||'?'] = (byZone[x.zone||'?']||0)+1;
        byGroup[x.age_group||'?'] = (byGroup[x.age_group||'?']||0)+1;
        byGender[x.gender||'?'] = (byGender[x.gender||'?']||0)+1;
        byDisc[x.discipline||'?'] = (byDisc[x.discipline||'?']||0)+1;
      });
      sumEl.innerHTML = `
        <h3 class="rpt-card-h">Headline</h3>
        <div class="rpt-stats-row">
          <div class="rpt-stat"><div class="rpt-stat-num">${fmt(tot)}</div><div class="rpt-stat-lbl">Top-3 Zone qualifiers absent from next stage<br><span class="rpt-soft">across ${yrs.length} selected year${yrs.length===1?'':'s'}</span></div></div>
          <div class="rpt-stat"><div class="rpt-stat-num">${tot? (tot/yrs.length).toFixed(1) : '0'}</div><div class="rpt-stat-lbl">Average per year</div></div>
        </div>
      `;

      // By year
      const byYearEl = document.getElementById('decl-by-year');
      byYearEl.innerHTML = `
        <h3 class="rpt-card-h">By year</h3>
        <table class="rpt-table">
          <thead><tr><th>Year</th><th>Decliners</th></tr></thead>
          <tbody>${yrs.map(y => `<tr><td><strong>${y}</strong></td><td>${fmt(byYear[y]||0)}</td></tr>`).join('')}</tbody>
        </table>
      `;

      // Demographic
      const demoEl = document.getElementById('decl-by-demographic');
      const card = (title, dict) => {
        const keys = Object.keys(dict).sort();
        if (keys.length === 0) return '';
        const max = Math.max.apply(null, keys.map(k => dict[k]));
        return `<div class="cf-prov-card">
          <div class="cf-prov-title">${title}</div>
          ${keys.map(k => `<div class="cf-prov-row">
            <div class="cf-prov-lbl">${esc(k)}</div>
            <div class="cf-prov-bar" style="width:${100*dict[k]/Math.max(1,max)}%"></div>
            <div class="cf-prov-val">${fmt(dict[k])}</div>
          </div>`).join('')}
        </div>`;
      };
      demoEl.innerHTML = `<h3 class="rpt-card-h">By demographic</h3>
        <div class="cf-prov-grid">
          ${card('Zone', byZone)}
          ${card('Age group', byGroup)}
          ${card('Gender', byGender)}
          ${card('Discipline', byDisc)}
        </div>`;

      // Athletes list
      const athEl = document.getElementById('decl-athletes');
      athEl.innerHTML = `
        <h3 class="rpt-card-h">Athletes (${fmt(tot)})</h3>
        <div class="rpt-table-scroll" style="max-height:520px;overflow:auto">
          <table class="rpt-table">
            <thead><tr><th>Year</th><th>Athlete</th><th>Team</th><th>Zone</th><th>Event</th><th>Place</th><th>Score</th><th>Region</th></tr></thead>
            <tbody>
            ${rows.slice(0,500).map(x => `<tr>
              <td>${x.year}</td>
              <td><strong>${esc((x.diver_first||'')+' '+(x.diver_last||''))}</strong> <span class="rpt-soft">(DM ${x.diver_id_dm})</span></td>
              <td>${esc(x.team_name||'')}</td>
              <td>Zone ${esc(x.zone||'?')}</td>
              <td>${esc(x.event_key||'')}</td>
              <td>${x.zone_place}</td>
              <td>${x.zone_score!=null?Number(x.zone_score).toFixed(2):''}</td>
              <td>${x.region!=null?'R'+x.region:''}</td>
            </tr>`).join('')}
            </tbody>
          </table>
          ${rows.length>500?`<div class="rpt-soft" style="padding:8px">Showing first 500 of ${fmt(rows.length)}. Use year filter to narrow.</div>`:''}
        </div>
        <div style="margin-top:10px"><button class="rpt-btn-prim" onclick="window._declExport()">Export CSV</button></div>
      `;

      // Cache rows for export
      window._declCachedRows = rows;
    } catch (e) {
      document.getElementById('decl-summary').innerHTML =
        '<div class="rpt-err">Query failed: '+esc(String(e.message||e))+'</div>';
    }
  }

  window._declToggleYear = function(y){
    if (declState.years.has(y)) declState.years.delete(y);
    else declState.years.add(y);
    loadDeclinedData();
  };
  window._declAllYears = function(){ declState.years = null; loadDeclinedData(); };
  window._declPre2026 = function(){ declState.years = new Set(pastYears()); loadDeclinedData(); };
  window._declExport = function(){
    const rows = window._declCachedRows || [];
    const hdr = ['year','diver_first','diver_last','diver_id_dm','team_name','zone','event_key','zone_place','zone_score','age_group','gender','discipline','region'];
    const out = [hdr.join(',')].concat(rows.map(r => hdr.map(h => {
      const v = r[h]; if (v == null) return '';
      const s = String(v); return s.includes(',')||s.includes('"') ? '"'+s.replace(/"/g,'""')+'"' : s;
    }).join(','))).join('\n');
    const blob = new Blob([out],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'declined-nationals.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Anomaly panel ─────────────────────────────────────────────
     Surfaces athletes whose attendance pattern violates expected rules.
     Detection logic per anomaly type:
       - foreign_at_zones_pre2023: any athlete (or row) at Zones in 2021-2022 was, by rule, a US citizen. Foreign athletes were Regionals-only. So if a row at Zones 2021-2022 ALSO appears in a foreign-declared roster, that's an anomaly. (Heuristic: detect by joining against citizenship status if available; otherwise list low-confidence.)
       - alternate_below_threshold: athlete at Junior Nationals (pre-2026) who was 17+ at Zones in same event. Old rule cuts alternates at 16th.
       - skipped_stage: athlete at Junior Nationals (pre-2026) with NO Zones row in same year+event. Possible HPS/prequal OR data gap.
       - score_outlier_high: score > 3.5 standard deviations above event mean (likely scraping error).
  */

  function renderAnomalyPanel(wrap){
    const filterSummary = activeRptFilterSummary();
    wrap.innerHTML = `
      <div class="rpt-stage-results">
        <div class="rpt-flow-head">
          <div class="rpt-flow-title">Anomaly surveillance <span class="rpt-soft">(rulebook violations + data gaps)</span></div>
          <div class="rpt-soft">Each card runs an independent Neon query. False positives are normal — these are starting points for review.</div>
        </div>
        ${filterSummary ? `<div class="rpt-active-filter">📌 Filtering: <strong>${esc(filterSummary)}</strong> <button class="rpt-export-btn" onclick="window._rptClear()" style="margin-left:8px">Clear filters</button></div>` : ''}
        <div id="anom-skipped" class="rpt-card"><div class="rpt-loading">Loading "skipped Zones" check…</div></div>
        <div id="anom-altexc" class="rpt-card"><div class="rpt-loading">Loading "alternate above cutoff" check…</div></div>
        <div id="anom-outlier" class="rpt-card"><div class="rpt-loading">Loading score outlier check…</div></div>
        <div id="anom-future" class="rpt-card"><div class="rpt-loading">Loading "future records" check…</div></div>
      </div>
    `;
    loadAnomalies();
  }

  async function loadAnomalies(){
    // 1) Skipped Zones — at Nationals with no Zones row same year + event_key
    try {
      const fb = rptFiltersToSQL(1);
      const r = await neonQuery(`
        WITH at_nat AS (
          SELECT DISTINCT year, event_key, diver_id_dm, diver_first, diver_last, team_name, age_group, gender, region
          FROM core.event_results
          WHERE is_junior_circuit AND stage='Nationals' AND year < 2026 AND diver_id_dm IS NOT NULL${fb.sql}
        ),
        at_zone AS (
          SELECT DISTINCT year, event_key, diver_id_dm
          FROM core.event_results
          WHERE is_junior_circuit AND stage='Zones' AND diver_id_dm IS NOT NULL${fb.sql}
        )
        SELECT a.* FROM at_nat a
        LEFT JOIN at_zone z USING (year, event_key, diver_id_dm)
        WHERE z.diver_id_dm IS NULL
        ORDER BY a.year DESC, a.event_key
        LIMIT 1000
      `, fb.params);
      const rows = r.rows;
      const byYear = {};
      rows.forEach(x => byYear[x.year] = (byYear[x.year]||0)+1);
      document.getElementById('anom-skipped').innerHTML = `
        <h3 class="rpt-card-h">Athletes at Jr Nationals with no Zones record (likely HPS/prequal or data gap)</h3>
        <div class="rpt-stats-row">
          <div class="rpt-stat"><div class="rpt-stat-num">${fmt(rows.length)}</div><div class="rpt-stat-lbl">Total records (2021–2025, capped at 1000)</div></div>
        </div>
        <table class="rpt-table" style="margin-top:8px"><thead><tr><th>Year</th><th>Count</th></tr></thead>
          <tbody>${Object.keys(byYear).sort().map(y => `<tr><td><strong>${y}</strong></td><td>${fmt(byYear[y])}</td></tr>`).join('')}</tbody>
        </table>
        <div class="rpt-table-scroll" style="max-height:340px;overflow:auto;margin-top:10px">
          <table class="rpt-table">
            <thead><tr><th>Yr</th><th>Athlete</th><th>Team</th><th>Event</th><th>Group</th><th>Region (from Nats row)</th></tr></thead>
            <tbody>
            ${rows.slice(0,300).map(x => `<tr>
              <td>${x.year}</td>
              <td><strong>${esc((x.diver_first||'')+' '+(x.diver_last||''))}</strong> <span class="rpt-soft">DM ${x.diver_id_dm}</span></td>
              <td>${esc(x.team_name||'')}</td>
              <td>${esc(x.event_key||'')}</td>
              <td>${esc(x.age_group||'')}</td>
              <td>${x.region?'R'+x.region:''}</td>
            </tr>`).join('')}
            </tbody>
          </table>
          ${rows.length>300?`<div class="rpt-soft" style="padding:8px">Showing first 300 of ${fmt(rows.length)}.</div>`:''}
        </div>
        <div style="margin-top:10px"><button class="rpt-btn-prim" onclick="window._anomExport('skipped')">Export CSV</button></div>
      `;
      window._anomCache = window._anomCache || {};
      window._anomCache.skipped = rows;
    } catch (e) {
      document.getElementById('anom-skipped').innerHTML = '<div class="rpt-err">Failed: '+esc(String(e.message||e))+'</div>';
    }

    // 2) Alternate above cutoff — at Nationals pre-2026 with Zone place 17+ same event
    try {
      const fb = rptFiltersToSQL(1);
      const r = await neonQuery(`
        WITH zone_place AS (
          SELECT year, event_key, diver_id_dm, MIN(place) AS best_zone_place
          FROM core.event_results
          WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL AND diver_id_dm IS NOT NULL${fb.sql}
          GROUP BY year, event_key, diver_id_dm
        ),
        at_nat AS (
          SELECT DISTINCT year, event_key, diver_id_dm, diver_first, diver_last, team_name, age_group, gender
          FROM core.event_results
          WHERE is_junior_circuit AND stage='Nationals' AND year < 2026${fb.sql}
        )
        SELECT a.year, a.event_key, a.diver_id_dm, a.diver_first, a.diver_last, a.team_name, a.age_group, a.gender, zp.best_zone_place
        FROM at_nat a
        JOIN zone_place zp USING (year, event_key, diver_id_dm)
        WHERE zp.best_zone_place > 16
        ORDER BY a.year DESC, zp.best_zone_place DESC
        LIMIT 500
      `, fb.params);
      const rows = r.rows;
      document.getElementById('anom-altexc').innerHTML = `
        <h3 class="rpt-card-h">At Jr Nationals with Zones placement &gt; 16 (old rule alternate cap)</h3>
        <div class="rpt-stats-row">
          <div class="rpt-stat"><div class="rpt-stat-num">${fmt(rows.length)}</div><div class="rpt-stat-lbl">Records (2021–2025)</div></div>
        </div>
        <div class="rpt-soft" style="margin:8px 0">Per the old system, alternates from positions 11–16 could be called up; 17th+ should not have been at Nationals. These rows are either rule exceptions, replacements from elsewhere, or data noise.</div>
        <div class="rpt-table-scroll" style="max-height:340px;overflow:auto">
          <table class="rpt-table">
            <thead><tr><th>Yr</th><th>Athlete</th><th>Event</th><th>Group</th><th>Zone place</th></tr></thead>
            <tbody>
            ${rows.slice(0,300).map(x => `<tr>
              <td>${x.year}</td>
              <td><strong>${esc((x.diver_first||'')+' '+(x.diver_last||''))}</strong> <span class="rpt-soft">DM ${x.diver_id_dm}</span></td>
              <td>${esc(x.event_key||'')}</td>
              <td>${esc(x.age_group||'')}</td>
              <td><strong>${x.best_zone_place}</strong></td>
            </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:10px"><button class="rpt-btn-prim" onclick="window._anomExport('altexc')">Export CSV</button></div>
      `;
      window._anomCache.altexc = rows;
    } catch (e) {
      document.getElementById('anom-altexc').innerHTML = '<div class="rpt-err">Failed: '+esc(String(e.message||e))+'</div>';
    }

    // 3) Score outliers — score > mean+3.5*sd of same event_key+stage+year+round
    try {
      const r = await neonQuery(`
        WITH ev_stats AS (
          SELECT year, stage, event_key, round,
                 AVG(score)::numeric AS mu,
                 STDDEV_POP(score)::numeric AS sd,
                 COUNT(*) AS n
          FROM core.event_results
          WHERE is_junior_circuit AND score IS NOT NULL
          GROUP BY year, stage, event_key, round
          HAVING COUNT(*) >= 8
        )
        SELECT er.year, er.stage, er.event_key, er.round, er.diver_id_dm, er.diver_first, er.diver_last,
               er.team_name, er.score, s.mu, s.sd
        FROM core.event_results er
        JOIN ev_stats s USING (year, stage, event_key, round)
        WHERE er.score IS NOT NULL
          AND s.sd > 0
          AND er.score > s.mu + 3.5 * s.sd
        ORDER BY (er.score - s.mu) / NULLIF(s.sd, 0) DESC
        LIMIT 200
      `);
      const rows = r.rows;
      document.getElementById('anom-outlier').innerHTML = `
        <h3 class="rpt-card-h">Score outliers (z &gt; 3.5)</h3>
        <div class="rpt-stats-row">
          <div class="rpt-stat"><div class="rpt-stat-num">${fmt(rows.length)}</div><div class="rpt-stat-lbl">High-score outliers</div></div>
        </div>
        <div class="rpt-soft" style="margin:8px 0">Scores more than 3.5 standard deviations above the event mean. Most are scraping errors or score-entry mistakes.</div>
        <div class="rpt-table-scroll" style="max-height:340px;overflow:auto">
          <table class="rpt-table">
            <thead><tr><th>Yr</th><th>Athlete</th><th>Stage</th><th>Event</th><th>Round</th><th>Score</th><th>Mean</th><th>z</th></tr></thead>
            <tbody>
            ${rows.slice(0,200).map(x => `<tr>
              <td>${x.year}</td>
              <td><strong>${esc((x.diver_first||'')+' '+(x.diver_last||''))}</strong></td>
              <td>${esc(x.stage||'')}</td>
              <td>${esc(x.event_key||'')}</td>
              <td>${esc(x.round||'')}</td>
              <td><strong>${Number(x.score).toFixed(2)}</strong></td>
              <td>${Number(x.mu).toFixed(2)}</td>
              <td>${((x.score-x.mu)/Math.max(0.0001,x.sd)).toFixed(1)}</td>
            </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top:10px"><button class="rpt-btn-prim" onclick="window._anomExport('outlier')">Export CSV</button></div>
      `;
      window._anomCache.outlier = rows;
    } catch (e) {
      document.getElementById('anom-outlier').innerHTML = '<div class="rpt-err">Failed: '+esc(String(e.message||e))+'</div>';
    }

    // 4) Future records — rows with year > current_season
    try {
      const r = await neonQuery(`
        SELECT year, COUNT(*)::int AS n FROM core.event_results
        WHERE year > (SELECT COALESCE(NULLIF(value,'')::int, 2026) FROM app_meta.config WHERE key='current_season_year')
        GROUP BY year ORDER BY year DESC
      `);
      document.getElementById('anom-future').innerHTML = `
        <h3 class="rpt-card-h">Future-dated records <span class="rpt-soft">(should be zero unless data is misclassified)</span></h3>
        ${r.rows.length===0 ? '<div class="rpt-soft">None. ✓</div>' :
          '<table class="rpt-table"><thead><tr><th>Year</th><th>Rows</th></tr></thead><tbody>'+
          r.rows.map(x => `<tr><td>${x.year}</td><td>${fmt(x.n)}</td></tr>`).join('')+'</tbody></table>'}
      `;
    } catch (e) {
      document.getElementById('anom-future').innerHTML = '<div class="rpt-err">Failed: '+esc(String(e.message||e))+'</div>';
    }
  }

  window._anomExport = function(which){
    const cache = window._anomCache || {};
    const rows = cache[which] || [];
    if (rows.length === 0) return;
    const hdr = Object.keys(rows[0]);
    const out = [hdr.join(',')].concat(rows.map(r => hdr.map(h => {
      const v = r[h]; if (v == null) return '';
      const s = String(v); return s.includes(',')||s.includes('"') ? '"'+s.replace(/"/g,'""')+'"' : s;
    }).join(','))).join('\n');
    const blob = new Blob([out],{type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'anomaly-'+which+'.csv'; a.click();
  };

  /* ── Athlete Career trace panel ────────────────────────────────
     Trace a single athlete across years by DM ID. Shows every meet, every event, every placement, plus a season-arc visualization. */
  const careerState = { dmId: null, results: null, loading: false };

  function renderCareerPanel(wrap){
    wrap.innerHTML = `
      <div class="rpt-stage-results">
        <div class="rpt-flow-head">
          <div class="rpt-flow-title">Athlete career trace</div>
          <div class="rpt-soft">Search by DiveMeets ID or by name. Shows full career history across all meets and years.</div>
        </div>
        <div class="rpt-card">
          <div class="rpt-slicer-bar">
            <span class="rpt-slicer-lbl">DM ID:</span>
            <input id="career-dm-input" type="text" placeholder="e.g. 73023" style="padding:5px 8px;border:1px solid var(--line);border-radius:var(--radius-sm);font-family:var(--f-mono);width:120px"/>
            <button class="rpt-btn-prim" onclick="window._careerByDm()">Search by DM ID</button>
            <span class="rpt-slicer-lbl" style="margin-left:18px">or name:</span>
            <input id="career-name-input" type="text" placeholder="last name, partial" style="padding:5px 8px;border:1px solid var(--line);border-radius:var(--radius-sm);width:180px"/>
            <button class="rpt-btn-prim" onclick="window._careerByName()">Search by name</button>
          </div>
        </div>
        <div id="career-results"></div>
      </div>
    `;
  }

  window._careerByDm = async function(){
    const v = (document.getElementById('career-dm-input').value || '').trim();
    if (!v) return;
    await loadCareer(v);
  };
  window._careerByName = async function(){
    const v = (document.getElementById('career-name-input').value || '').trim();
    if (!v) return;
    try {
      const r = await neonQuery(
        "SELECT diver_id_dm, first_name, last_name, first_seen_year, last_seen_year, result_count "+
        "FROM core.divers WHERE last_name ILIKE $1 OR first_name ILIKE $1 ORDER BY result_count DESC LIMIT 20",
        ['%'+v+'%']
      );
      const out = document.getElementById('career-results');
      if (r.rows.length === 0) { out.innerHTML = '<div class="rpt-card"><div class="rpt-soft">No matches.</div></div>'; return; }
      out.innerHTML = '<div class="rpt-card"><h3 class="rpt-card-h">Candidates</h3>'+
        '<table class="rpt-table"><thead><tr><th>DM ID</th><th>Name</th><th>Years</th><th>Result count</th><th></th></tr></thead><tbody>'+
        r.rows.map(x => `<tr><td>${x.diver_id_dm}</td><td><strong>${esc((x.first_name||'')+' '+(x.last_name||''))}</strong></td><td>${x.first_seen_year}–${x.last_seen_year}</td><td>${fmt(x.result_count)}</td><td><button class="rpt-btn-prim" onclick="window._careerLoad(${x.diver_id_dm})">View career</button></td></tr>`).join('')+
        '</tbody></table></div>';
    } catch(e) {
      document.getElementById('career-results').innerHTML = '<div class="rpt-err">'+esc(String(e.message||e))+'</div>';
    }
  };
  window._careerLoad = async function(dm){
    document.getElementById('career-dm-input').value = String(dm);
    await loadCareer(String(dm));
  };

  async function loadCareer(dm){
    const out = document.getElementById('career-results');
    out.innerHTML = '<div class="rpt-card"><div class="rpt-loading">Loading career for DM '+esc(dm)+'…</div></div>';
    try {
      const r = await neonQuery(
        "SELECT year, stage, meet_name, event_key, event_name, round, place, score, "+
        "team_name, region, zone, ewc_meet, age_group, gender, discipline, is_synchro, "+
        "diver_first, diver_last "+
        "FROM core.event_results WHERE diver_id_dm = $1 ORDER BY year, meet_name, event_name, round",
        [dm]
      );
      if (r.rows.length === 0) { out.innerHTML = '<div class="rpt-card"><div class="rpt-soft">No results for DM '+esc(dm)+'.</div></div>'; return; }
      const first = r.rows[0];
      const name = (first.diver_first||'')+' '+(first.diver_last||'');
      const byYear = {};
      r.rows.forEach(x => { (byYear[x.year] = byYear[x.year] || []).push(x); });
      const years = Object.keys(byYear).sort();
      const meetCount = new Set(r.rows.map(x => x.year+'|'+x.meet_name)).size;
      const top3s = r.rows.filter(x => x.place != null && x.place <= 3 && (x.round==='Final'||x.round==='')).length;
      const stages = {};
      r.rows.forEach(x => { stages[x.stage||'?'] = (stages[x.stage||'?']||0)+1; });
      // 2018, 2019 and 2024 all changed dive counts; ask the era module.
      const careerCaveat2 = (window.JuniorEras && window.JuniorEras.diveCountCaveat(years.map(Number))) || null;

      out.innerHTML = `
        <div class="rpt-card">
          <h3 class="rpt-card-h">${esc(name)} <span class="rpt-soft">— DM ${esc(dm)}</span></h3>
          <div class="rpt-stats-row">
            <div class="rpt-stat"><div class="rpt-stat-num">${fmt(r.rows.length)}</div><div class="rpt-stat-lbl">Result rows</div></div>
            <div class="rpt-stat"><div class="rpt-stat-num">${fmt(meetCount)}</div><div class="rpt-stat-lbl">Meets entered</div></div>
            <div class="rpt-stat"><div class="rpt-stat-num">${years[0]}–${years[years.length-1]}</div><div class="rpt-stat-lbl">Career span</div></div>
            <div class="rpt-stat"><div class="rpt-stat-num">${fmt(top3s)}</div><div class="rpt-stat-lbl">Top-3 final placements</div></div>
          </div>
          <div style="margin-top:10px">
            <strong>Stages competed:</strong> ${Object.keys(stages).map(s => esc(stageLabelFor(s))+' ('+stages[s]+')').join(', ')}
          </div>
          ${careerCaveat2 ? `<div class="rpt-note rpt-note-divecount" style="margin-top:10px">
            <strong>⚠ ${esc(careerCaveat2)}</strong> A jump or drop across one of those seasons for this athlete may partly reflect the rule change rather than a change in performance — check the age group they competed in each year below.
          </div>` : ''}
        </div>
        ${years.map(y => {
          const rows = byYear[y];
          return `<div class="rpt-card">
            <h3 class="rpt-card-h">${y} <span class="rpt-soft">— ${fmt(rows.length)} result rows</span></h3>
            <table class="rpt-table">
              <thead><tr><th>Stage</th><th>Meet</th><th>Event</th><th>Round</th><th>Place</th><th>Score</th><th>Team</th></tr></thead>
              <tbody>
              ${rows.map(x => `<tr>
                <td><span class="rpt-soft">${esc(x.stage||'')}</span></td>
                <td>${esc(x.meet_name||'')}</td>
                <td>${esc(x.event_key||x.event_name||'')}</td>
                <td>${esc(x.round||'')}</td>
                <td><strong>${x.place!=null?x.place:''}</strong></td>
                <td>${x.score!=null?Number(x.score).toFixed(2):''}</td>
                <td>${esc(x.team_name||'')}</td>
              </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
        }).join('')}
      `;
      careerState.dmId = dm;
      careerState.results = r.rows;
    } catch (e) {
      out.innerHTML = '<div class="rpt-err">'+esc(String(e.message||e))+'</div>';
    }
  }

  /* ── Tier-entry analysis panel (old-system back-trace) ─────────
     For 2021-2025 Junior Nationals: directly observe entry tier from rounds present.
       - Prelim+Semi+Final = entered at prelims (Zone 4-10/4-7 path)
       - Semi+Final only   = entered at semis (Zone top-3 direct)
       - Prelim only       = cut after prelims
     Cross-references with athlete's Zone placement same year/event to validate.
  */
  function renderTierEntryPanel(wrap){
    const filterSummary = activeRptFilterSummary();
    wrap.innerHTML = `
      <div class="rpt-stage-results">
        <div class="rpt-flow-head">
          <div class="rpt-flow-title">Junior Nationals tier entry <span class="rpt-soft">(2021–2025, old system back-trace)</span></div>
          <div class="rpt-soft">Directly observed from which rounds each athlete appeared in. Cross-validated against Zone placement.</div>
        </div>
        ${filterSummary ? `<div class="rpt-active-filter">📌 Filtering: <strong>${esc(filterSummary)}</strong> <button class="rpt-export-btn" onclick="window._rptClear()" style="margin-left:8px">Clear filters</button></div>` : ''}
        <div id="tier-controls" class="rpt-slicer-bar" style="margin-bottom:14px"></div>
        <div id="tier-summary" class="rpt-card"><div class="rpt-loading">Loading…</div></div>
        <div id="tier-by-year" class="rpt-card"><div class="rpt-loading">Loading by-year…</div></div>
        <div id="tier-mismatch" class="rpt-card"><div class="rpt-loading">Loading cross-validation…</div></div>
      </div>
    `;
    loadTierEntry();
  }

  const tierState = { years: new Set(pastYears()) };

  async function loadTierEntry(){
    renderTierControls();
    const yrs = Array.from(tierState.years).sort();
    if (yrs.length === 0) {
      document.getElementById('tier-summary').innerHTML = '<div class="rpt-soft">Select at least one year.</div>';
      document.getElementById('tier-by-year').innerHTML = '';
      document.getElementById('tier-mismatch').innerHTML = '';
      return;
    }
    try {
      const fb = rptFiltersToSQL(2);
      // For each athlete at Nationals same year+event_key, collect set of rounds. Classify.
      const r = await neonQuery(`
        WITH nat_rounds AS (
          SELECT year, event_key, diver_id_dm,
                 BOOL_OR(round='Prelim') AS had_prelim,
                 BOOL_OR(round='Semifinal') AS had_semi,
                 BOOL_OR(round='Final') AS had_final
          FROM core.event_results
          WHERE is_junior_circuit AND stage='Nationals' AND year < 2026 AND diver_id_dm IS NOT NULL
            AND year = ANY($1::int[])${fb.sql}
          GROUP BY year, event_key, diver_id_dm
        )
        SELECT year,
               CASE
                 WHEN had_semi AND NOT had_prelim THEN 'Top-3 direct (semi entry)'
                 WHEN had_prelim AND had_semi THEN 'Prelim entry → advanced'
                 WHEN had_prelim AND NOT had_semi THEN 'Prelim entry → cut'
                 WHEN had_final AND NOT had_prelim AND NOT had_semi THEN 'Final only (data gap?)'
                 ELSE 'Other'
               END AS tier,
               COUNT(*)::int AS n
        FROM nat_rounds GROUP BY year, tier ORDER BY year, tier
      `, ['{'+yrs.join(',')+'}', ...fb.params]);
      const rows = r.rows;
      const tiers = ['Top-3 direct (semi entry)','Prelim entry → advanced','Prelim entry → cut','Final only (data gap?)','Other'];
      const yrSet = Array.from(new Set(rows.map(x => x.year))).sort();
      const grid = {};
      rows.forEach(x => grid[x.year+'|'+x.tier] = x.n);
      const totalsByTier = {};
      const totalsByYear = {};
      rows.forEach(x => {
        totalsByTier[x.tier] = (totalsByTier[x.tier]||0) + x.n;
        totalsByYear[x.year] = (totalsByYear[x.year]||0) + x.n;
      });
      const grandTotal = Object.values(totalsByYear).reduce((a,b)=>a+b, 0);

      document.getElementById('tier-summary').innerHTML = `
        <h3 class="rpt-card-h">Aggregate entry tier (${yrs.length} year${yrs.length===1?'':'s'})</h3>
        <div class="rpt-stats-row">
          ${tiers.filter(t => totalsByTier[t]).map(t => `
            <div class="rpt-stat">
              <div class="rpt-stat-num">${fmt(totalsByTier[t]||0)}</div>
              <div class="rpt-stat-lbl">${esc(t)}<br><span class="rpt-soft">${grandTotal?((100*(totalsByTier[t]||0)/grandTotal).toFixed(1)+'%'):''}</span></div>
            </div>`).join('')}
        </div>
      `;

      document.getElementById('tier-by-year').innerHTML = `
        <h3 class="rpt-card-h">By year</h3>
        <table class="rpt-table">
          <thead><tr><th>Year</th>${tiers.map(t=>`<th>${esc(t)}</th>`).join('')}<th>Total</th></tr></thead>
          <tbody>
          ${yrSet.map(y => {
            const cells = tiers.map(t => `<td>${grid[y+'|'+t]?fmt(grid[y+'|'+t]):'<span class="rpt-soft">·</span>'}</td>`).join('');
            return `<tr><td><strong>${y}</strong></td>${cells}<td><strong>${fmt(totalsByYear[y]||0)}</strong></td></tr>`;
          }).join('')}
          </tbody>
        </table>
      `;

      // Cross-validation: tier observed vs zone placement implies
      const fb2 = rptFiltersToSQL(2);
      const r2 = await neonQuery(`
        WITH nat_rounds AS (
          SELECT year, event_key, diver_id_dm,
                 BOOL_OR(round='Prelim') AS had_prelim,
                 BOOL_OR(round='Semifinal') AS had_semi
          FROM core.event_results
          WHERE is_junior_circuit AND stage='Nationals' AND year < 2026 AND diver_id_dm IS NOT NULL
            AND year = ANY($1::int[])${fb2.sql}
          GROUP BY year, event_key, diver_id_dm
        ),
        zone_place AS (
          SELECT year, event_key, diver_id_dm, MIN(place) AS best_place
          FROM core.event_results
          WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL AND diver_id_dm IS NOT NULL${fb2.sql}
          GROUP BY year, event_key, diver_id_dm
        )
        SELECT n.year,
               CASE WHEN n.had_semi AND NOT n.had_prelim THEN 'observed: top-3 direct'
                    WHEN n.had_prelim THEN 'observed: prelim entry'
                    ELSE 'observed: other' END AS observed,
               CASE WHEN zp.best_place IS NULL THEN 'zone: absent'
                    WHEN zp.best_place BETWEEN 1 AND 3 THEN 'zone: top-3'
                    WHEN zp.best_place BETWEEN 4 AND 10 THEN 'zone: 4-10'
                    WHEN zp.best_place BETWEEN 11 AND 16 THEN 'zone: 11-16'
                    ELSE 'zone: 17+' END AS zone_band,
               COUNT(*)::int AS n
        FROM nat_rounds n
        LEFT JOIN zone_place zp USING (year, event_key, diver_id_dm)
        GROUP BY 1,2,3
        ORDER BY 1,2,3
      `, ['{'+yrs.join(',')+'}', ...fb2.params]);
      const xv = r2.rows;
      const observedKeys = Array.from(new Set(xv.map(x=>x.observed))).sort();
      const zoneKeys = Array.from(new Set(xv.map(x=>x.zone_band))).sort();
      const xvGrid = {};
      xv.forEach(x => xvGrid[x.observed+'|'+x.zone_band] = (xvGrid[x.observed+'|'+x.zone_band]||0) + x.n);
      document.getElementById('tier-mismatch').innerHTML = `
        <h3 class="rpt-card-h">Cross-validation: observed entry tier vs Zone placement</h3>
        <div class="rpt-soft" style="margin-bottom:8px">Expected:
          <em>top-3 direct</em> should be Zone top-3;
          <em>prelim entry</em> should be Zone 4-10 (or 4-7 platform) or alternate from 11-16.
          Cells away from the diagonal are interesting: e.g. observed top-3 direct with Zone absent = HPS/prequal route.
        </div>
        <table class="rpt-table">
          <thead><tr><th></th>${zoneKeys.map(z=>`<th>${esc(z)}</th>`).join('')}<th>Row total</th></tr></thead>
          <tbody>
          ${observedKeys.map(o => {
            let tot = 0;
            const cells = zoneKeys.map(z => { const n = xvGrid[o+'|'+z]||0; tot += n; return `<td>${n?fmt(n):'<span class="rpt-soft">·</span>'}</td>`; }).join('');
            return `<tr><td><strong>${esc(o)}</strong></td>${cells}<td><strong>${fmt(tot)}</strong></td></tr>`;
          }).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      document.getElementById('tier-summary').innerHTML = '<div class="rpt-err">Failed: '+esc(String(e.message||e))+'</div>';
    }
  }

  function renderTierControls(){
    const el = document.getElementById('tier-controls'); if (!el) return;
    const years = pastYears();
    const sel = tierState.years;
    el.innerHTML = '<span class="rpt-slicer-lbl">Years:</span> '+
      years.map(y => `<button class="rpt-yr-chip ${sel.has(y)?'is-on':''}" onclick="window._tierToggleYear(${y})">${y}</button>`).join('')+
      ` <button class="rpt-yr-chip" onclick="window._tierAllYears()">All</button>`;
  }

  window._tierToggleYear = function(y){
    if (tierState.years.has(y)) tierState.years.delete(y);
    else tierState.years.add(y);
    loadTierEntry();
  };
  window._tierAllYears = function(){ tierState.years = new Set(allYears()); loadTierEntry(); };

  /* ── Shareable view URLs ──────────────────────────────────────
     Encode current filter+drill+panel state in URL hash. Apply on page load. */
  function rptStateToHash(){
    const s = rptState;
    const parts = ['panel='+encodeURIComponent(s.panel||'flow')];
    ['ageGroup','gender','discipline','region','zone','ewc','team'].forEach(k => {
      if (s.filters && s.filters[k]) parts.push(k+'='+encodeURIComponent(s.filters[k]));
    });
    if (typeof histState !== 'undefined' && histState.yearsSelected && histState.yearsSelected.size) {
      parts.push('histYears='+Array.from(histState.yearsSelected).join(','));
    }
    if (typeof declState !== 'undefined' && declState.years && declState.years.size) {
      parts.push('declYears='+Array.from(declState.years).join(','));
    }
    return '#rpt-share/' + parts.join('&');
  }
  window._rptShareUrl = function(){
    const h = rptStateToHash();
    const url = location.origin + location.pathname + h;
    navigator.clipboard.writeText(url).then(function(){
      const toast = document.createElement('div');
      toast.textContent = 'Share URL copied to clipboard';
      toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--navy);color:white;padding:10px 16px;border-radius:6px;font-size:13px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.2)';
      document.body.appendChild(toast);
      setTimeout(function(){ toast.remove(); }, 2500);
    }, function(){ alert(url); });
  };
  function applyHashState(){
    const h = location.hash || '';
    if (!h.startsWith('#rpt-share/')) return false;
    const qs = h.slice('#rpt-share/'.length);
    const map = {};
    qs.split('&').forEach(pair => {
      const [k,v] = pair.split('=');
      if (k) map[k] = decodeURIComponent(v || '');
    });
    if (map.panel) rptState.panel = map.panel;
    if (!rptState.filters) rptState.filters = {};
    ['ageGroup','gender','discipline','region','zone','ewc','team'].forEach(k => {
      if (map[k]) rptState.filters[k] = map[k];
    });
    if (map.histYears) {
      try {
        if (typeof histState !== 'undefined') histState.yearsSelected = new Set(map.histYears.split(',').map(Number));
      } catch(e) {}
    }
    if (map.declYears) {
      try {
        if (typeof declState !== 'undefined') declState.years = new Set(map.declYears.split(',').map(Number));
      } catch(e) {}
    }
    return true;
  }

  /* ── Report Builder ─────────────────────────────────────────────
     Replaces the simple "snapshot current panel" approach with a real
     builder: pick a template or assemble custom sections, choose year(s),
     apply filters, and produce a branded multi-section document. */

  // Each section is a self-contained block with its own async data loader.
  // Sections take an `opts` object (years, filters, dmId, bands) and return HTML.

  /* Filter SQL builder — converts builder filter selections to a WHERE fragment
     applicable to core.event_results queries. Returns { sql, params, summary }
     where params start AFTER the years-array param ($1). */
  function buildFilterSQL(filters, startIdx){
    startIdx = startIdx || 2;
    const f = filters || {};
    const conds = [];
    const params = [];
    let n = startIdx;
    if (f.ageGroups && f.ageGroups.length) { conds.push('age_group = ANY($'+n+'::text[])'); params.push('{'+f.ageGroups.join(',')+'}'); n++; }
    if (f.genders && f.genders.length)     { conds.push('gender = ANY($'+n+'::text[])');    params.push('{'+f.genders.join(',')+'}');    n++; }
    if (f.disciplines && f.disciplines.length){ conds.push('discipline = ANY($'+n+'::text[])');params.push('{'+f.disciplines.join(',')+'}');n++; }
    if (f.regions && f.regions.length)     { conds.push('region = ANY($'+n+'::int[])');     params.push('{'+f.regions.join(',')+'}');    n++; }
    if (f.zones && f.zones.length)         { conds.push('zone = ANY($'+n+'::text[])');      params.push('{'+f.zones.join(',')+'}');      n++; }
    const sql = conds.length ? ' AND ' + conds.join(' AND ') : '';
    const parts = [];
    if (f.ageGroups && f.ageGroups.length) parts.push(f.ageGroups.join('/'));
    if (f.genders && f.genders.length) parts.push(f.genders.join('/'));
    if (f.disciplines && f.disciplines.length) parts.push(f.disciplines.join('/'));
    if (f.regions && f.regions.length) parts.push('Reg ' + f.regions.join(','));
    if (f.zones && f.zones.length) parts.push('Zone ' + f.zones.join(','));
    const summary = parts.length ? parts.join(' · ') : 'All athletes';
    return { sql, params, summary, hasFilters: parts.length > 0 };
  }

  /* Default place bands. User can edit in the builder. */
  const DEFAULT_BANDS = [
    { label: '1–3 (direct/top-3)', min: 1, max: 3 },
    { label: '4–10 (springboard qualifier)', min: 4, max: 10 },
    { label: '11–18 (alternate / new-system E/W/C band)', min: 11, max: 18 },
    { label: '19+ (below cut)', min: 19, max: 99 },
  ];

  /* ── Qualifying-score cutoff table helpers ───────────────────────
     Shared by the three cutoff sections below (Region→Zone,
     Zone→Nationals/E-W-C, E/W/C→Nationals). Each raw SQL row carries
     year, age_group, gender, discipline, a breakdown dimension
     (region / zone / ewc_meet), n, avg_score, min_score, max_score. */
  function rbEventKey(x){ return `${x.age_group} ${x.gender} ${x.discipline}`; }

  function rbCombineWeighted(rows){
    const n = rows.reduce((a,r)=>a + (r.n||0), 0);
    if (!n) return { n: 0, avg_score: NaN, min_score: NaN, max_score: NaN };
    const avg = rows.reduce((a,r)=>a + (r.n||0) * Number(r.avg_score), 0) / n;
    const mins = rows.map(r=>Number(r.min_score)).filter(Number.isFinite);
    const maxs = rows.map(r=>Number(r.max_score)).filter(Number.isFinite);
    return { n, avg_score: avg, min_score: mins.length?Math.min(...mins):NaN, max_score: maxs.length?Math.max(...maxs):NaN };
  }

  /* Pooled event × year table — one row per event, one column per year. */
  function rbEventYearTable(rawRows, yrs, dimField, noDataNote){
    const byEvent = new Map();
    rawRows.forEach(x => {
      const key = rbEventKey(x);
      if (!byEvent.has(key)) byEvent.set(key, {});
      const byYear = byEvent.get(key);
      if (!byYear[x.year]) byYear[x.year] = [];
      byYear[x.year].push(x);
    });
    const eventKeys = [...byEvent.keys()].sort();
    if (!eventKeys.length) return `<p class="rb-p rb-soft">${esc(noDataNote || 'No qualifying data for the selected year(s)/filters.')}</p>`;
    return `<table class="rb-table">
      <thead><tr><th>Event</th>${yrs.map(y=>`<th>${y}<br><span class="rb-soft">avg (range) &middot; n</span></th>`).join('')}</tr></thead>
      <tbody>
      ${eventKeys.map(ek => `<tr><td><strong>${esc(ek)}</strong></td>${yrs.map(y => {
        const grp = byEvent.get(ek)[y];
        if (!grp || !grp.length) return `<td class="rb-soft">—</td>`;
        const c = rbCombineWeighted(grp);
        if (!c.n) return `<td class="rb-soft">—</td>`;
        return `<td>${fmtScore(c.avg_score)} <span class="rb-soft">(${fmtScore(c.min_score)}&ndash;${fmtScore(c.max_score)})</span><br><span class="rb-soft">n=${c.n}</span></td>`;
      }).join('')}</tr>`).join('')}
      </tbody>
    </table>`;
  }

  /* By-dimension breakdown — one small table per event, rows = dimension
     value (region / zone / E-W-C site), columns = year. */
  function rbDimBreakdownTables(rawRows, yrs, dimField, dimLabel){
    const byEvent = new Map();
    rawRows.forEach(x => {
      const key = rbEventKey(x);
      if (!byEvent.has(key)) byEvent.set(key, []);
      byEvent.get(key).push(x);
    });
    const eventKeys = [...byEvent.keys()].sort();
    if (!eventKeys.length) return '';
    return eventKeys.map(ek => {
      const evRows = byEvent.get(ek);
      const dimValues = [...new Set(evRows.map(x => x[dimField]))].filter(v => v != null).sort();
      const grid = {};
      evRows.forEach(x => { grid[x[dimField]+'|'+x.year] = x; });
      return `<h3 class="rb-h3">${esc(ek)} — by ${esc(dimLabel)}</h3>
      <table class="rb-table rb-table-sm">
        <thead><tr><th>${esc(dimLabel)}</th>${yrs.map(y=>`<th>${y}</th>`).join('')}</tr></thead>
        <tbody>
        ${dimValues.map(dv => `<tr><td><strong>${esc(String(dv))}</strong></td>${yrs.map(y => {
          const x = grid[dv+'|'+y];
          if (!x || !x.n) return `<td class="rb-soft">—</td>`;
          return `<td>${fmtScore(x.avg_score)} <span class="rb-soft">(n=${x.n})</span></td>`;
        }).join('')}</tr>`).join('')}
        </tbody>
      </table>`;
    }).join('');
  }

  /* Jan 1, 2024 rule change: required dive counts per age group shifted to
     align with World Aquatics/Pan American Aquatics standards (previously a
     USA-specific graduated system, unchanged since at least the 2018
     rulebook). Fewer/more required dives changes the total possible score,
     so raw score comparisons that straddle this boundary need a flag. Only
     show the note when the selected years actually span the boundary. */
  function rbDiveCountNote(yrs){
    if (!(yrs.some(y => y < 2024) && yrs.some(y => y >= 2024))) return '';
    return `<p class="rb-p" style="background:#fef3c7;border-left:3px solid #d97706;padding:8px 10px;border-radius:4px">
      <strong>⚠ Dive-count rule change, Jan 1 2024:</strong> Required dive counts per age group shifted to align with World Aquatics/Pan American Aquatics standards. Group A dropped one dive across the board (both genders, both boards — e.g. Girls 1M/3M 10→9, Boys 1M/3M 11→10). Group C girls' springboard dropped one optional dive (8→7); the rest of Group C and all of Group B were unchanged. The youngest bracket (Group D, 11-and-under) was consolidated from the old separate "9-and-under" (5 dives) and "10-11" (6 dives) lists into one Group D list requiring 6 dives — effectively one more dive for 9-and-under athletes than before. Because dive count changes the total possible score, raw score comparisons spanning the 2023→2024 boundary for the affected groups reflect this rule change as well as any shift in competitiveness.
    </p>`;
  }

  const REPORT_SECTIONS = {
    exec_summary: {
      label: 'Executive Summary',
      desc: 'Top-line athlete counts per stage with year-over-year change',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [_currentSeason];
        const r = await neonQuery(
          "SELECT year, stage, COUNT(DISTINCT diver_id_dm)::int AS divers, COUNT(*)::int AS rows "+
          "FROM core.event_results WHERE is_junior_circuit AND year = ANY($1::int[]) "+
          "AND stage IN ('Regionals','Zones','EWC','Nationals') GROUP BY year, stage ORDER BY year, stage",
          ['{'+yrs.join(',')+'}']
        );
        const grid = {};
        r.rows.forEach(x => grid[x.year+'|'+x.stage] = x);
        const stages = stagesForYear(selectedYear());
        return `<section class="rb-section">
          <h2 class="rb-h2">Executive Summary</h2>
          <table class="rb-table">
            <thead><tr><th>Year</th>${stages.map(s=>`<th>${s}<br><span class="rb-soft">athletes</span></th>`).join('')}<th>R→Z conv.</th></tr></thead>
            <tbody>
            ${yrs.map(y => {
              const r_=(grid[y+'|Regionals']||{}).divers||0;
              const z_=(grid[y+'|Zones']||{}).divers||0;
              const e_=(grid[y+'|EWC']||{}).divers||0;
              const n_=(grid[y+'|Nationals']||{}).divers||0;
              return `<tr><td><strong>${y}</strong></td>
                <td>${fmt(r_)}</td><td>${fmt(z_)}</td>
                <td>${e_?fmt(e_):'<span class="rb-soft">—</span>'}</td>
                <td>${n_?fmt(n_):'<span class="rb-soft">—</span>'}</td>
                <td>${r_?(100*z_/r_).toFixed(1)+'%':'—'}</td></tr>`;
            }).join('')}
            </tbody>
          </table>
        </section>`;
      },
    },

    zone_qualifying_scores: {
      label: 'Zone-Qualifying Score Averages (Region → Zone)',
      desc: 'Average score of the Regional finishers who advanced to Zones (top 15 per Art.305(a)(1)), per event and age group, compared across years and broken down by region — answers "what score got you into Zones?"',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [2024, 2025, _currentSeason];
        const fb = buildFilterSQL(opts.filters);
        const r = await neonQuery(`
          SELECT year, age_group, gender, discipline, region,
                 COUNT(*)::int AS n,
                 AVG(score)::numeric AS avg_score,
                 MIN(score)::numeric AS min_score,
                 MAX(score)::numeric AS max_score
          FROM core.event_results
          WHERE is_junior_circuit AND stage = 'Regionals'
            AND discipline IN ('1M','3M') AND NOT is_synchro
            AND place IS NOT NULL AND place BETWEEN 1 AND 15
            AND score IS NOT NULL
            AND NOT (year = 2026 AND age_group IN ('Group C','Group D'))
            AND year = ANY($1::int[])${fb.sql}
          GROUP BY year, age_group, gender, discipline, region
          ORDER BY age_group, gender, discipline, year, region
        `, ['{'+yrs.join(',')+'}', ...fb.params]);

        if (!r.rows.length) {
          return `<section class="rb-section">
            <h2 class="rb-h2">Zone-Qualifying Score Averages (Region → Zone)</h2>
            <p class="rb-p">No qualifying Regional results found for the selected year(s)/filters.</p>
          </section>`;
        }

        return `<section class="rb-section">
          <h2 class="rb-h2">Zone-Qualifying Score Averages (Region → Zone)</h2>
          <p class="rb-p"><strong>Filter:</strong> ${esc(fb.summary)}${yrs.length>1?` · <strong>Years:</strong> ${yrs.join(', ')}`:''}</p>
          ${rbDiveCountNote(yrs)}
          <p class="rb-p">Average score (range in parentheses) of the athletes who placed 1st&ndash;15th at Regionals — the group that advanced to Zones under Art.305(a)(1). Platform is exhibition/non-qualifying at Regionals in every year, so it has no Zone-qualifying cutoff and isn't included here. In 2026, Groups C and D skip Regionals entirely (they auto-advance to Zones), so no qualifying average applies to them that year — those cells show &mdash;.</p>
          <h3 class="rb-h3">All regions pooled</h3>
          ${rbEventYearTable(r.rows, yrs)}
          <h3 class="rb-h3">By region</h3>
          <p class="rb-p rb-soft">Each region runs its own Regional meet, so a region's top-15 average reflects the depth of that specific region for that event.</p>
          ${rbDimBreakdownTables(r.rows, yrs, 'region', 'Region')}
        </section>`;
      },
    },

    zone_to_next_scores: {
      label: 'Zone-Qualifying Score Averages (Zone → Nationals / E-W-C)',
      desc: 'Average score of the Zone finishers who advanced further — direct-to-Nationals cutoff (top 10 springboard / top 7 platform pre-2026; top 3 in 2026) plus the 2026 Zone→E/W/C band (ranks 4–18) — per event and age group, broken down by zone and across years.',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [2024, 2025, _currentSeason];
        const fb = buildFilterSQL(opts.filters);
        const r = await neonQuery(`
          SELECT year, age_group, gender, discipline, zone,
                 CASE
                   WHEN year < 2026 THEN 'direct'
                   WHEN year >= 2026 AND place BETWEEN 1 AND 3 THEN 'direct'
                   WHEN year >= 2026 AND place BETWEEN 4 AND 18 THEN 'ewc_band'
                 END AS qual_type,
                 COUNT(*)::int AS n,
                 AVG(score)::numeric AS avg_score,
                 MIN(score)::numeric AS min_score,
                 MAX(score)::numeric AS max_score
          FROM core.event_results
          WHERE is_junior_circuit AND stage = 'Zones' AND NOT is_synchro
            AND score IS NOT NULL AND place IS NOT NULL
            AND (
              (year < 2026 AND discipline IN ('1M','3M') AND place BETWEEN 1 AND 10) OR
              (year < 2026 AND discipline = 'Platform' AND place BETWEEN 1 AND 7) OR
              (year >= 2026 AND place BETWEEN 1 AND 18)
            )
            AND year = ANY($1::int[])${fb.sql}
          GROUP BY year, age_group, gender, discipline, zone, qual_type
          ORDER BY age_group, gender, discipline, year, zone
        `, ['{'+yrs.join(',')+'}', ...fb.params]);

        const directRows = r.rows.filter(x => x.qual_type === 'direct');
        const ewcBandRows = r.rows.filter(x => x.qual_type === 'ewc_band');

        if (!r.rows.length) {
          return `<section class="rb-section">
            <h2 class="rb-h2">Zone-Qualifying Score Averages (Zone → Nationals / E-W-C)</h2>
            <p class="rb-p">No qualifying Zone results found for the selected year(s)/filters.</p>
          </section>`;
        }

        return `<section class="rb-section">
          <h2 class="rb-h2">Zone-Qualifying Score Averages (Zone → Nationals / E-W-C)</h2>
          <p class="rb-p"><strong>Filter:</strong> ${esc(fb.summary)}${yrs.length>1?` · <strong>Years:</strong> ${yrs.join(', ')}`:''}</p>
          ${rbDiveCountNote(yrs)}

          <h3 class="rb-h3">Direct-to-Nationals cutoff</h3>
          <p class="rb-p">Average score of the athletes who advanced directly out of Zones. <strong>Pre-2026:</strong> top 10 per springboard event, top 7 for platform (no E/W/C tier existed). <strong>2026:</strong> top 3 per event (Art.303(b)(2)(i)) — the rest of the qualifying field moved to E/W/C instead, so the 2026 number reflects a much smaller, tougher direct cutoff and isn't directly comparable in scale to the pre-2026 top-10/top-7 numbers.</p>
          <h4 style="font-family:var(--f-display,'Barlow Condensed',sans-serif);font-size:12px;color:#171F69;text-transform:uppercase;letter-spacing:.03em;margin:10px 0 4px">All zones pooled</h4>
          ${rbEventYearTable(directRows, yrs, null, 'No direct-to-Nationals qualifiers found for the selected year(s)/filters.')}
          <h4 style="font-family:var(--f-display,'Barlow Condensed',sans-serif);font-size:12px;color:#171F69;text-transform:uppercase;letter-spacing:.03em;margin:14px 0 4px">By zone</h4>
          ${rbDimBreakdownTables(directRows, yrs, 'zone', 'Zone')}

          <h3 class="rb-h3" style="margin-top:22px">Zone → E/W/C band (ranks 4–18, 2026 only)</h3>
          <p class="rb-p">New in 2026 (Art.304(a)(2)): ranks 4&ndash;18 at Zones advance to the East/West/Central meet rather than directly to Nationals. No equivalent existed before 2026, so pre-2026 years show &mdash;.</p>
          <h4 style="font-family:var(--f-display,'Barlow Condensed',sans-serif);font-size:12px;color:#171F69;text-transform:uppercase;letter-spacing:.03em;margin:10px 0 4px">All zones pooled</h4>
          ${rbEventYearTable(ewcBandRows, yrs, null, 'No Zone→E/W/C qualifiers found for the selected year(s)/filters (this band only exists 2026+).')}
          <h4 style="font-family:var(--f-display,'Barlow Condensed',sans-serif);font-size:12px;color:#171F69;text-transform:uppercase;letter-spacing:.03em;margin:14px 0 4px">By zone</h4>
          ${rbDimBreakdownTables(ewcBandRows, yrs, 'zone', 'Zone')}
        </section>`;
      },
    },

    ewc_nationals_scores: {
      label: 'Zone-Qualifying Score Averages (E/W/C → Nationals, 2026+)',
      desc: 'Average score of the E/W/C finishers who advanced to Nationals — top 3 direct (Art.303(b)(3)(i)) plus 4th–6th if their score meets the cross-meet average of the top 3 (Art.303(b)(3)(ii)) — per event and age group, broken down by East/West/Central.',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [2024, 2025, _currentSeason];
        const fb = buildFilterSQL(opts.filters);
        const r = await neonQuery(`
          WITH top3 AS (
            SELECT year, age_group, gender, discipline, score
            FROM core.event_results
            WHERE is_junior_circuit AND stage = 'EWC' AND NOT is_synchro
              AND place BETWEEN 1 AND 3 AND score IS NOT NULL
              AND year = ANY($1::int[])${fb.sql}
          ),
          thresh AS (
            SELECT year, age_group, gender, discipline, AVG(score) AS avg_top3
            FROM top3 GROUP BY year, age_group, gender, discipline
          ),
          cand AS (
            SELECT e.year, e.age_group, e.gender, e.discipline, e.ewc_meet, e.place, e.score,
                   (e.place <= 3 OR (e.place BETWEEN 4 AND 6 AND e.score >= t.avg_top3)) AS qualifies
            FROM core.event_results e
            JOIN thresh t USING (year, age_group, gender, discipline)
            WHERE e.is_junior_circuit AND e.stage = 'EWC' AND NOT e.is_synchro
              AND e.place BETWEEN 1 AND 6 AND e.score IS NOT NULL
              AND e.year = ANY($1::int[])${fb.sql.replace(/(age_group|gender|discipline|region|zone)/g, 'e.$1')}
          )
          SELECT year, age_group, gender, discipline, ewc_meet,
                 COUNT(*) FILTER (WHERE qualifies)::int AS n,
                 AVG(score) FILTER (WHERE qualifies)::numeric AS avg_score,
                 MIN(score) FILTER (WHERE qualifies)::numeric AS min_score,
                 MAX(score) FILTER (WHERE qualifies)::numeric AS max_score
          FROM cand
          GROUP BY year, age_group, gender, discipline, ewc_meet
          HAVING COUNT(*) FILTER (WHERE qualifies) > 0
          ORDER BY age_group, gender, discipline, year, ewc_meet
        `, ['{'+yrs.join(',')+'}', ...fb.params]);

        if (!r.rows.length) {
          return `<section class="rb-section">
            <h2 class="rb-h2">Zone-Qualifying Score Averages (E/W/C → Nationals, 2026+)</h2>
            <p class="rb-p">No qualifying E/W/C results found for the selected year(s)/filters. E/W/C didn't exist before 2026, so years prior to 2026 will always be empty here.</p>
          </section>`;
        }

        return `<section class="rb-section">
          <h2 class="rb-h2">Zone-Qualifying Score Averages (E/W/C → Nationals, 2026+)</h2>
          <p class="rb-p"><strong>Filter:</strong> ${esc(fb.summary)}${yrs.length>1?` · <strong>Years:</strong> ${yrs.join(', ')}`:''}</p>
          ${rbDiveCountNote(yrs)}
          <p class="rb-p">Average score of the athletes who advanced from E/W/C to Nationals: top 3 at their site, plus 4th&ndash;6th if their score met the average of the top 3 scores across all three E/W/C sites for that event. This tier didn't exist before 2026, so earlier years are empty.</p>
          <h3 class="rb-h3">All sites pooled</h3>
          ${rbEventYearTable(r.rows, yrs)}
          <h3 class="rb-h3">By E/W/C site</h3>
          ${rbDimBreakdownTables(r.rows, yrs, 'ewc_meet', 'Site')}
        </section>`;
      },
    },

    pipeline_river: {
      label: 'Pipeline River Flow Map',
      desc: 'The exact qualification river — advance/exit flows, the by-age-group drop-off breakdown, and (2026) the projected Junior Nationals field',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [_currentSeason];
        if (typeof window.PM_riverReport !== 'function') {
          return '<section class="rb-section"><h2 class="rb-h2">Pipeline River Flow Map</h2><p class="rb-p">The pipeline module is not loaded on this page.</p></section>';
        }
        const fit = '<style>.rb-river .pm-flow-scroll{overflow:visible !important}.rb-river .pm-section{box-shadow:none;border:none;padding:0;margin:0}.rb-river .pm-section-head{display:none}.rb-river svg{width:100%;height:auto;max-width:100%}@media print{.rb-river,.rb-river *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}}</style>';
        const parts = [];
        for (const y of yrs) {
          let body;
          try { body = await window.PM_riverReport(y); }
          catch(e){ body = '<p class="rb-p" style="color:#E31937">Failed to build river for '+esc(String(y))+': '+esc(String((e&&e.message)||e))+'</p>'; }
          parts.push('<section class="rb-section rb-river"><h2 class="rb-h2">Qualification River — '+esc(String(y))+'</h2>'+body+'</section>');
        }
        return fit + parts.join('');
      },
    },

    pipeline_funnel: {
      label: 'Pipeline Funnel',
      desc: 'Stage-by-stage athlete counts as a visual funnel for selected year(s)',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [_currentSeason];
        const r = await neonQuery(
          "SELECT year, stage, COUNT(DISTINCT diver_id_dm)::int AS n "+
          "FROM core.event_results WHERE is_junior_circuit AND year = ANY($1::int[]) "+
          "GROUP BY year, stage ORDER BY year, stage",
          ['{'+yrs.join(',')+'}']
        );
        const grid = {};
        r.rows.forEach(x => grid[x.year+'|'+x.stage] = x.n);
        return `<section class="rb-section">
          <h2 class="rb-h2">Pipeline Funnel ${yrs.length===1?'('+yrs[0]+')':'('+yrs.length+' years)'}</h2>
          <div class="rb-funnels">
            ${yrs.map(y => {
              // Text color is per-background: white reads fine on the dark
              // navy/green fills, but fails badly on the light Sky fill
              // (1.88:1 contrast — essentially unreadable) and is only
              // borderline on Cyan (3.26:1). Navy text on those two instead
              // gives 7.77:1 and 4.49:1 — both comfortably legible.
              const stages = [['Regionals', grid[y+'|Regionals']||0, '#171F69', '#fff']];
              stages.push(['Zones', grid[y+'|Zones']||0, '#009AC7', '#171F69']);
              const ewc = grid[y+'|EWC']||0; if (ewc) stages.push(['E/W/C', ewc, '#8FC3EA', '#171F69']);
              const nat = grid[y+'|Nationals']||0; if (nat) stages.push(['Nationals', nat, '#22893E', '#fff']);
              const max = Math.max.apply(null, stages.map(s => s[1]));
              return `<div class="rb-funnel-card">
                <div class="rb-funnel-yr">${y}</div>
                ${stages.map(([lbl,n,col,txt]) => `
                  <div class="rb-funnel-row">
                    <div class="rb-funnel-lbl">${lbl}</div>
                    <div class="rb-funnel-bar" style="width:${max?Math.max(8,100*n/max):0}%;background:${col};color:${txt}">${fmt(n)}</div>
                  </div>
                `).join('')}
              </div>`;
            }).join('')}
          </div>
        </section>`;
      },
    },

    season_context: {
      label: 'Season Rules & Format',
      desc: 'What the competition looked like in each season covered — stages, advancement, dive counts, and anything that makes the numbers non-comparable.',
      async build(opts){
        const E = window.JuniorEras;
        const yrs = (opts.years && opts.years.length ? opts.years : [_currentSeason]).slice().sort((a,b)=>a-b);
        if (!E) return '';
        const caveat = E.diveCountCaveat(yrs);
        const row = (y) => {
          const s = E.season(y);
          if (!s) return `<tr><td><strong>${y}</strong></td><td colspan="4" class="rb-soft">No rules recorded for this season.</td></tr>`;
          const stages = s.stages.map(st => E.stageLabel(st)).join(' → ');
          let adv = [];
          if (s.regionals && s.regionals.advance) adv.push('Regionals: top ' + s.regionals.advance);
          if (s.zones && s.zones.springboardAdvance) adv.push('Zones: springboard top ' + s.zones.springboardAdvance + ', platform top ' + s.zones.platformAdvance);
          if (s.zones && s.zones.direct) adv.push('Zones: top ' + s.zones.direct + ' direct, ' + s.zones.toEWC[0] + '–' + s.zones.toEWC[1] + ' to E/W/C');
          if (s.ewc && s.ewc.direct) adv.push('E/W/C: top ' + s.ewc.direct);
          const advTxt = adv.length ? adv.join('; ')
            : '<span class="rb-soft">not confirmed for this season</span>';
          const notes = (E.seasonNotes(y) || []).map(n => esc(n.text)).join(' ');
          return `<tr>
            <td><strong>${y}</strong></td>
            <td>${esc(stages)}</td>
            <td>${advTxt}</td>
            <td>${s.verified ? '<span class="rb-ok">confirmed</span>' : '<span class="rb-warn">unconfirmed</span>'}</td>
            <td class="rb-soft">${notes || ''}</td>
          </tr>`;
        };
        // Dive counts for the seasons covered, so a reader can see for
        // themselves whether two totals are on the same basis.
        const groups = ['A','B','C','D'], genders = ['Girls','Boys'], boards = ['1M','3M','PL'];
        const boardLbl = { '1M':'1m', '3M':'3m', 'PL':'Platform' };
        const diveRows = [];
        groups.forEach(g => genders.forEach(gd => boards.forEach(b => {
          const vals = yrs.map(y => {
            const d = E.diveCount(y, g, gd, b);
            return d ? d.count : null;
          });
          // Compare the counts, not the rendered cell. The inferred asterisk
          // would otherwise make an unchanged event look like it changed.
          if (new Set(vals).size === 1 && yrs.length > 1) return;
          const cells = yrs.map((y, i) => {
            const d = E.diveCount(y, g, gd, b);
            return vals[i] == null ? '—' : (vals[i] + (d.inferred ? '*' : ''));
          });
          diveRows.push(`<tr><td>Group ${g} ${gd} ${boardLbl[b]}</td>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`);
        })));
        return `<section class="rb-section">
          <h2 class="rb-h2">Season Rules &amp; Format</h2>
          <p class="rb-soft">The Junior Circuit did not run the same way in every season covered by this report. Advancement numbers are only stated where they have been confirmed against a rule book; placements and scores are accurate throughout.</p>
          <table class="rb-table rb-table-sm">
            <thead><tr><th>Season</th><th>Stages</th><th>Advancement</th><th>Rules</th><th>Notes</th></tr></thead>
            <tbody>${yrs.map(row).join('')}</tbody>
          </table>
          ${caveat ? `<p class="rb-p rb-callout-warn"><strong>⚠ ${esc(caveat)}</strong></p>` : ''}
          ${(function(){
            // A printed report can outlive the app, so the status gap has to
            // travel with it rather than living only in the on-screen banner.
            const lims = yrs.map(y => E.dataLimitations(y, _currentSeason)).filter(Boolean);
            if (!lims.length) return '';
            const past = yrs.filter(y => Number(y) !== Number(_currentSeason));
            return `<h3 class="rb-h3">Not included for past seasons</h3>
              <p class="rb-p rb-callout-warn"><strong>⚠ Athlete status is not held for
              ${esc(past.join(', '))}.</strong> Placements and scores are exact, but
              ${esc(E.MISSING_FIELDS.slice(0,-1).join(', '))} and
              ${esc(E.MISSING_FIELDS[E.MISSING_FIELDS.length-1])} are not reflected.
              Because a non-displacing diver moves the qualifying line for everyone below
              them, any qualifier count for these seasons is placement-only and may differ
              from the official result.</p>`;
          })()}
          ${diveRows.length ? `
            <h3 class="rb-h3">Required dives — where they differ across these seasons</h3>
            <table class="rb-table rb-table-sm">
              <thead><tr><th>Event</th>${yrs.map(y=>`<th>${y}</th>`).join('')}</tr></thead>
              <tbody>${diveRows.join('')}</tbody>
            </table>
            <p class="rb-soft">Derived from submitted dive sheets and cross-checked against the 2018 USA Diving rule book. An asterisk marks a season before continuous sheet coverage begins (${E.OBSERVED_FROM}), carried back from the earliest observed season.</p>
          ` : `<p class="rb-soft">Required dive counts are the same across every season in this report, so raw totals are directly comparable.</p>`}
        </section>`;
      },
    },

    year_matrix: {
      label: 'Year × Stage Matrix',
      desc: 'Cross-year participation matrix with drop-off percentages',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : allYears();
        const r = await neonQuery(
          "SELECT year, stage, COUNT(DISTINCT diver_id_dm)::int AS n "+
          "FROM core.event_results WHERE is_junior_circuit AND year IS NOT NULL "+
          "AND year = ANY($1::int[]) GROUP BY year, stage ORDER BY year",
          ['{'+yrs.join(',')+'}']
        );
        const grid = {};
        r.rows.forEach(x => grid[x.year+'|'+x.stage] = x.n);
        // 2013 and 2014 ran the Age Group National Championships as a separate
        // competition alongside the Junior Nationals. The column only appears
        // when a selected season actually had one, so it does not sit empty
        // across a modern report.
        const anyAgn = yrs.some(y => (grid[y+'|AgeGroup-Nationals']||0) > 0);
        return `<section class="rb-section">
          <h2 class="rb-h2">Year × Stage Matrix</h2>
          ${anyAgn ? `<p class="rb-soft">Age Group Nationals was a separate national championship from the Junior Nationals and is counted separately.</p>` : ''}
          <table class="rb-table">
            <thead><tr><th>Year</th><th>Regionals</th><th>Zones</th><th>E/W/C</th><th>Junior Nationals</th>${anyAgn?'<th>Age Group Nationals</th>':''}<th>R→Z drop</th><th>Z→Next drop</th></tr></thead>
            <tbody>
            ${yrs.map(y => {
              const reg=grid[y+'|Regionals']||0, zon=grid[y+'|Zones']||0, ewc=grid[y+'|EWC']||0, nat=grid[y+'|Nationals']||0;
              const agn=grid[y+'|AgeGroup-Nationals']||0;
              const next = y >= 2026 ? ewc : nat;
              const cancelled = window.JuniorEras && (window.JuniorEras.season(y)||{}).cancelled;
              return `<tr${cancelled?' class="rb-row-muted"':''}><td><strong>${y}</strong>${cancelled?' <span class="rb-soft">(season ended early)</span>':''}</td>
                <td>${fmt(reg)}</td><td>${fmt(zon)}</td>
                <td>${ewc?fmt(ewc):'<span class="rb-soft">—</span>'}</td>
                <td>${nat?fmt(nat):'<span class="rb-soft">—</span>'}</td>
                ${anyAgn?`<td>${agn?fmt(agn):'<span class="rb-soft">—</span>'}</td>`:''}
                <td>${reg?(100*(1-zon/reg)).toFixed(1)+'%':'—'}</td>
                <td>${zon?(100*(1-next/zon)).toFixed(1)+'%':'—'}</td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>
        </section>`;
      },
    },

    declined_summary: {
      label: 'Declined Nationals — Summary',
      desc: 'Top-3 Zone qualifiers absent from the next stage, count by year',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : pastYears();
        const r = await neonQuery(`
          WITH top3 AS (
            SELECT DISTINCT year, event_key, diver_id_dm
            FROM core.event_results
            WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL AND place <= 3
              AND year = ANY($1::int[])
          ),
          nexts AS (
            SELECT DISTINCT year, event_key, diver_id_dm FROM core.event_results
            WHERE is_junior_circuit
              AND ((year < 2026 AND stage='Nationals') OR (year >= 2026 AND stage IN ('EWC','Nationals')))
              AND year = ANY($1::int[])
          ),
          dec AS (
            SELECT t.year, COUNT(*) AS n_dec FROM top3 t LEFT JOIN nexts n USING (year, event_key, diver_id_dm)
            WHERE n.diver_id_dm IS NULL GROUP BY t.year
          ),
          tots AS (SELECT year, COUNT(*) AS n_total FROM top3 GROUP BY year)
          SELECT t.year, COALESCE(d.n_dec, 0)::int AS decliners, t.n_total::int AS total
          FROM tots t LEFT JOIN dec d USING (year) ORDER BY t.year
        `, ['{'+yrs.join(',')+'}']);
        return `<section class="rb-section">
          <h2 class="rb-h2">Top-3 Zone Qualifiers Absent From Next Stage</h2>
          <p class="rb-p">Direct answer to the CCE headline question: "of the athletes who placed top 3 at Zones, how many chose not to attend the next stage?"</p>
          <table class="rb-table">
            <thead><tr><th>Year</th><th>Total Top-3</th><th>Decliners</th><th>Decline Rate</th></tr></thead>
            <tbody>
            ${r.rows.map(x => `<tr><td><strong>${x.year}</strong></td><td>${fmt(x.total)}</td><td>${fmt(x.decliners)}</td><td>${x.total?(100*x.decliners/x.total).toFixed(1)+'%':'—'}</td></tr>`).join('')}
            </tbody>
          </table>
        </section>`;
      },
    },

    declined_athletes: {
      label: 'Declined Nationals — Athlete List',
      desc: 'Names, teams, events of each decliner (may be long)',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : pastYears();
        const r = await neonQuery(`
          WITH top3 AS (
            SELECT DISTINCT ON (year, event_key, zone, diver_id_dm)
              year, event_key, zone, diver_id_dm, place AS zp, score AS zs,
              diver_first, diver_last, team_name, age_group, gender, region
            FROM core.event_results
            WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL AND place <= 3
              AND year = ANY($1::int[])
            ORDER BY year, event_key, zone, diver_id_dm, place
          ),
          nexts AS (
            SELECT DISTINCT year, event_key, diver_id_dm FROM core.event_results
            WHERE is_junior_circuit
              AND ((year < 2026 AND stage='Nationals') OR (year >= 2026 AND stage IN ('EWC','Nationals')))
              AND year = ANY($1::int[])
          )
          SELECT t.* FROM top3 t LEFT JOIN nexts n USING (year, event_key, diver_id_dm)
          WHERE n.diver_id_dm IS NULL ORDER BY t.year, t.zone, t.event_key, t.zp
        `, ['{'+yrs.join(',')+'}']);
        return `<section class="rb-section">
          <h2 class="rb-h2">Declined Nationals — Full Athlete List</h2>
          <p class="rb-p">${fmt(r.rows.length)} athletes across ${yrs.length} year${yrs.length===1?'':'s'}.</p>
          <table class="rb-table rb-table-sm">
            <thead><tr><th>Yr</th><th>Athlete</th><th>Team</th><th>Zone</th><th>Event</th><th>Place</th><th>Region</th></tr></thead>
            <tbody>
            ${r.rows.map(x => `<tr>
              <td>${x.year}</td>
              <td><strong>${esc((x.diver_first||'')+' '+(x.diver_last||''))}</strong></td>
              <td>${esc(x.team_name||'')}</td>
              <td>${esc(x.zone||'')}</td>
              <td>${esc(x.event_key||'')}</td>
              <td>${x.zp}</td>
              <td>${x.region?'R'+x.region:''}</td>
            </tr>`).join('')}
            </tbody>
          </table>
        </section>`;
      },
    },

    demographic_mix: {
      label: 'Demographic Mix',
      desc: 'Athletes by age group × gender for selected year(s)',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [_currentSeason];
        const r = await neonQuery(
          "SELECT year, age_group, gender, COUNT(DISTINCT diver_id_dm)::int AS n "+
          "FROM core.event_results WHERE is_junior_circuit AND age_group LIKE 'Group %' "+
          "AND year = ANY($1::int[]) GROUP BY year, age_group, gender ORDER BY year, age_group, gender",
          ['{'+yrs.join(',')+'}']
        );
        const combos = ['Group A Boys','Group A Girls','Group B Boys','Group B Girls','Group C Boys','Group C Girls','Group D Boys','Group D Girls'];
        const grid = {};
        r.rows.forEach(x => grid[x.year+'|'+(x.age_group||'')+' '+(x.gender||'')] = x.n);
        return `<section class="rb-section">
          <h2 class="rb-h2">Demographic Mix</h2>
          <table class="rb-table">
            <thead><tr><th>Year</th>${combos.map(c=>`<th>${c.replace('Group ','Gp ')}</th>`).join('')}<th>Total</th></tr></thead>
            <tbody>
            ${yrs.map(y => {
              let tot=0;
              const cells=combos.map(c => { const n=grid[y+'|'+c]||0; tot+=n; return `<td>${n?fmt(n):'<span class="rb-soft">·</span>'}</td>`; }).join('');
              return `<tr><td><strong>${y}</strong></td>${cells}<td><strong>${fmt(tot)}</strong></td></tr>`;
            }).join('')}
            </tbody>
          </table>
        </section>`;
      },
    },

    regional_strength: {
      label: 'Regional Strength',
      desc: 'Athletes at Regionals per region per year',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [_currentSeason];
        const r = await neonQuery(
          "SELECT year, region, COUNT(DISTINCT diver_id_dm)::int AS n "+
          "FROM core.event_results WHERE is_junior_circuit AND region IS NOT NULL "+
          "AND year = ANY($1::int[]) GROUP BY year, region ORDER BY year, region",
          ['{'+yrs.join(',')+'}']
        );
        const regs = Array.from({length:12}, (_,i)=>i+1);
        const grid = {};
        r.rows.forEach(x => grid[x.year+'|'+x.region] = x.n);
        return `<section class="rb-section">
          <h2 class="rb-h2">Regional Strength</h2>
          <table class="rb-table">
            <thead><tr><th>Year</th>${regs.map(r=>`<th>R${r}</th>`).join('')}<th>Total</th></tr></thead>
            <tbody>
            ${yrs.map(y => {
              let tot=0;
              const cells=regs.map(r => { const n=grid[y+'|'+r]||0; tot+=n; return `<td>${n?fmt(n):'<span class="rb-soft">·</span>'}</td>`; }).join('');
              return `<tr><td><strong>${y}</strong></td>${cells}<td><strong>${fmt(tot)}</strong></td></tr>`;
            }).join('')}
            </tbody>
          </table>
        </section>`;
      },
    },

    rule_era: {
      label: 'Rule Era Comparison',
      desc: 'Three-era comparison: 2021-22 (foreign restricted), 2023-25 (foreign allowed), 2026+ (new system)',
      async build(opts){
        const r = await neonQuery(
          "SELECT year, stage, COUNT(DISTINCT diver_id_dm)::int AS n "+
          "FROM core.event_results WHERE is_junior_circuit GROUP BY year, stage"
        );
        const grid = {};
        r.rows.forEach(x => grid[x.year+'|'+x.stage] = x.n);
        // The audit reaches back to 2013, so the era list covers the whole
        // span rather than the three most recent rule sets. Descriptions state
        // what was structurally different, not just who was eligible.
        const eras = [
          { lbl: '2013–2014', years: [2013,2014],
            desc: 'Two national championships: Junior Nationals and a separate Age Group Nationals. Zones ran senior events too.',
            color: '#6B7280' },
          { lbl: '2015–2017', years: [2015,2016,2017],
            desc: 'Junior Nationals held inside the senior National Championships.',
            color: '#8FC3EA' },
          { lbl: '2018–2019', years: [2018,2019],
            desc: 'Junior Nationals a standalone meet; Zones renamed from "National Preliminary".',
            color: '#0F4C68' },
          { lbl: '2020',      years: [2020],
            desc: 'Season ended after Region Championships (COVID-19).',
            color: '#9CA3AF' },
          { lbl: '2021–2022', years: [2021,2022],
            desc: 'Region → Zone → Nationals. Foreign athletes restricted to Regionals.',
            color: '#171F69' },
          { lbl: '2023–2025', years: [2023,2024,2025],
            desc: 'Region → Zone → Nationals. Foreign athletes non-displacing at Regionals and Zones.',
            color: '#009AC7' },
          { lbl: '2026+',     years: [2026],
            desc: 'New system: East/West/Central tier added; Groups C & D skip Regionals.',
            color: '#22893E' },
        ];
        const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
        return `<section class="rb-section">
          <h2 class="rb-h2">Rule Era Comparison</h2>
          <p class="rb-soft">Averages are distinct athletes per season at each stage. A dash means the stage did not exist in that era.</p>
          <table class="rb-table">
            <thead><tr><th>Era</th><th>What was different</th><th>Avg Regionals</th><th>Avg Zones</th><th>Avg E/W/C</th><th>Avg Jr Nationals</th><th>Avg Age Grp Nats</th></tr></thead>
            <tbody>
            ${eras.map(e => {
              const regs=avg(e.years.map(y=>grid[y+'|Regionals']||0));
              const zons=avg(e.years.map(y=>grid[y+'|Zones']||0));
              const ewcs=avg(e.years.map(y=>grid[y+'|EWC']||0));
              const nats=avg(e.years.map(y=>grid[y+'|Nationals']||0));
              const agns=avg(e.years.map(y=>grid[y+'|AgeGroup-Nationals']||0));
              return `<tr>
                <td><strong style="color:${e.color}">${e.lbl}</strong></td>
                <td class="rb-soft">${esc(e.desc)}</td>
                <td>${regs>0?fmt(Math.round(regs)):'—'}</td>
                <td>${zons>0?fmt(Math.round(zons)):'—'}</td>
                <td>${ewcs>0?fmt(Math.round(ewcs)):'<span class="rb-soft">—</span>'}</td>
                <td>${nats>0?fmt(Math.round(nats)):'<span class="rb-soft">—</span>'}</td>
                <td>${agns>0?fmt(Math.round(agns)):'<span class="rb-soft">—</span>'}</td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>
        </section>`;
      },
    },

    anomaly_summary: {
      label: 'Anomaly Summary',
      desc: 'Count of athletes flagged under each anomaly rule',
      async build(opts){
        // Skipped Zones (at Nats with no Zone row)
        const r1 = await neonQuery(`
          SELECT COUNT(*)::int AS n FROM (
            SELECT DISTINCT a.year, a.event_key, a.diver_id_dm
            FROM core.event_results a
            LEFT JOIN core.event_results z
              ON z.is_junior_circuit AND z.stage='Zones'
              AND z.year=a.year AND z.event_key=a.event_key AND z.diver_id_dm=a.diver_id_dm
            WHERE a.is_junior_circuit AND a.stage='Nationals' AND a.year < 2026
              AND a.diver_id_dm IS NOT NULL AND z.diver_id_dm IS NULL
          ) x
        `);
        // Above alternate cutoff
        const r2 = await neonQuery(`
          SELECT COUNT(*)::int AS n FROM (
            SELECT DISTINCT a.year, a.event_key, a.diver_id_dm
            FROM core.event_results a
            JOIN (
              SELECT year, event_key, diver_id_dm, MIN(place) AS p
              FROM core.event_results WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL
              GROUP BY 1,2,3
            ) z USING (year, event_key, diver_id_dm)
            WHERE a.is_junior_circuit AND a.stage='Nationals' AND a.year < 2026 AND z.p > 16
          ) x
        `);
        return `<section class="rb-section">
          <h2 class="rb-h2">Data Quality / Rule Anomalies</h2>
          <table class="rb-table">
            <thead><tr><th>Anomaly</th><th>Count</th><th>Interpretation</th></tr></thead>
            <tbody>
              <tr><td>At Nationals with no Zone record</td><td><strong>${fmt(r1.rows[0].n)}</strong></td><td class="rb-soft">Likely HPS/prequal route; small share may be data gaps</td></tr>
              <tr><td>At Nationals with Zone placement > 16 (above alternate cap)</td><td><strong>${fmt(r2.rows[0].n)}</strong></td><td class="rb-soft">Old rule cuts alternates at 16; these may be rule exceptions or data noise</td></tr>
            </tbody>
          </table>
        </section>`;
      },
    },

    band_conversion: {
      label: 'Zone Placement Band → Next Stage Attendance',
      desc: 'For 1–3 / 4–10 / 11–18 / 19+ Zone placements: how many qualified vs. how many attended the next stage. Directly answers the CCE band-conversion questions.',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [_currentSeason];
        const bands = opts.bands || DEFAULT_BANDS;
        const fb = buildFilterSQL(opts.filters);
        const r = await neonQuery(`
          WITH zone_best AS (
            SELECT year, event_key, diver_id_dm, MIN(place) AS zone_place
            FROM core.event_results
            WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL
              AND year = ANY($1::int[])${fb.sql}
            GROUP BY year, event_key, diver_id_dm
          ),
          next_stage AS (
            SELECT DISTINCT year, event_key, diver_id_dm FROM core.event_results
            WHERE is_junior_circuit
              AND ((year < 2026 AND stage='Nationals') OR (year >= 2026 AND stage IN ('EWC','Nationals')))
              AND year = ANY($1::int[])${fb.sql}
          )
          SELECT zb.year, zb.zone_place,
                 (ns.diver_id_dm IS NOT NULL) AS attended
          FROM zone_best zb LEFT JOIN next_stage ns USING (year, event_key, diver_id_dm)
        `, ['{'+yrs.join(',')+'}', ...fb.params]);
        // Aggregate by band x year
        const grid = {};
        r.rows.forEach(x => {
          const band = bands.find(b => x.zone_place >= b.min && x.zone_place <= b.max);
          if (!band) return;
          const key = band.label + '|' + x.year;
          if (!grid[key]) grid[key] = { qualified: 0, attended: 0 };
          grid[key].qualified++;
          if (x.attended) grid[key].attended++;
        });
        // Build aggregated-across-years totals too
        const byBand = {};
        bands.forEach(b => byBand[b.label] = { qualified: 0, attended: 0 });
        Object.entries(grid).forEach(([k, v]) => {
          const band = k.split('|')[0];
          byBand[band].qualified += v.qualified;
          byBand[band].attended += v.attended;
        });
        const isPre2026 = yrs.every(y => y < 2026);
        const isPost2026 = yrs.every(y => y >= 2026);
        const nextStageLabel = isPre2026 ? 'Junior Nationals' : (isPost2026 ? 'E/W/C tier' : 'Next stage (E/W/C for 2026+, Nationals for 2021–25)');
        return `<section class="rb-section">
          <h2 class="rb-h2">Zone Placement Band → ${nextStageLabel} Attendance</h2>
          <p class="rb-p"><strong>Filter:</strong> ${esc(fb.summary)}${yrs.length>1?` · <strong>Years:</strong> ${yrs.join(', ')}`:''}</p>
          <p class="rb-p">For each Zone placement band, this shows how many divers fell in that band at their best Zone event, and how many of them actually appeared at the next stage of the pipeline.</p>
          <table class="rb-table">
            <thead><tr><th>Band (best Zone placement)</th><th>Qualified</th><th>Attended next stage</th><th>Attendance rate</th></tr></thead>
            <tbody>
            ${bands.map(b => {
              const v = byBand[b.label];
              const pct = v.qualified ? (100*v.attended/v.qualified).toFixed(1)+'%' : '—';
              return `<tr>
                <td><strong>${esc(b.label)}</strong></td>
                <td>${fmt(v.qualified)}</td>
                <td>${fmt(v.attended)}</td>
                <td><strong>${pct}</strong></td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>
          ${yrs.length > 1 ? `
            <h3 class="rb-h3">Year-by-year breakdown</h3>
            <table class="rb-table">
              <thead><tr><th>Year</th>${bands.map(b => `<th>${esc(b.label.split(' ')[0])}<br><span class="rb-soft">qual / att</span></th>`).join('')}</tr></thead>
              <tbody>
              ${yrs.map(y => `<tr><td><strong>${y}</strong></td>${bands.map(b => {
                const v = grid[b.label+'|'+y] || { qualified: 0, attended: 0 };
                const pct = v.qualified ? Math.round(100*v.attended/v.qualified)+'%' : '';
                return `<td>${v.qualified?`${fmt(v.qualified)} / ${fmt(v.attended)} <span class="rb-soft">(${pct})</span>`:'<span class="rb-soft">—</span>'}</td>`;
              }).join('')}</tr>`).join('')}
              </tbody>
            </table>
          ` : ''}
        </section>`;
      },
    },

    band_demographic: {
      label: 'Band Conversion — by Age Group × Gender',
      desc: 'Same place-band conversion analysis, sliced by demographic. Useful when CCE/Board asks "and how does that look for Group A Boys vs Group B Girls?"',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [_currentSeason];
        const bands = opts.bands || DEFAULT_BANDS;
        const fb = buildFilterSQL(opts.filters);
        const r = await neonQuery(`
          WITH zone_best AS (
            SELECT year, event_key, diver_id_dm, MIN(place) AS zone_place,
                   (array_agg(age_group))[1] AS age_group,
                   (array_agg(gender))[1] AS gender
            FROM core.event_results
            WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL
              AND year = ANY($1::int[])${fb.sql}
            GROUP BY year, event_key, diver_id_dm
          ),
          next_stage AS (
            SELECT DISTINCT year, event_key, diver_id_dm FROM core.event_results
            WHERE is_junior_circuit
              AND ((year < 2026 AND stage='Nationals') OR (year >= 2026 AND stage IN ('EWC','Nationals')))
              AND year = ANY($1::int[])${fb.sql}
          )
          SELECT zb.age_group, zb.gender, zb.zone_place,
                 (ns.diver_id_dm IS NOT NULL) AS attended
          FROM zone_best zb LEFT JOIN next_stage ns USING (year, event_key, diver_id_dm)
        `, ['{'+yrs.join(',')+'}', ...fb.params]);
        // Aggregate by (age_group, gender, band)
        const grid = {};
        r.rows.forEach(x => {
          const band = bands.find(b => x.zone_place >= b.min && x.zone_place <= b.max);
          if (!band) return;
          const k = (x.age_group||'?')+'|'+(x.gender||'?')+'|'+band.label;
          if (!grid[k]) grid[k] = { q: 0, a: 0 };
          grid[k].q++;
          if (x.attended) grid[k].a++;
        });
        const ageGroups = ['Group A','Group B','Group C','Group D'];
        const genders = ['Boys','Girls'];
        return `<section class="rb-section">
          <h2 class="rb-h2">Band Conversion by Demographic</h2>
          <p class="rb-p"><strong>Filter:</strong> ${esc(fb.summary)} · <strong>Years:</strong> ${yrs.join(', ')}</p>
          ${bands.map(b => `
            <h3 class="rb-h3">${esc(b.label)}</h3>
            <table class="rb-table">
              <thead><tr><th>Age group</th>${genders.map(g => `<th>${g}<br><span class="rb-soft">qual → att (%)</span></th>`).join('')}</tr></thead>
              <tbody>
              ${ageGroups.map(ag => `<tr><td><strong>${ag}</strong></td>${genders.map(g => {
                const v = grid[ag+'|'+g+'|'+b.label] || { q: 0, a: 0 };
                const pct = v.q ? Math.round(100*v.a/v.q)+'%' : '';
                return `<td>${v.q?`${fmt(v.q)} → ${fmt(v.a)} <span class="rb-soft">(${pct})</span>`:'<span class="rb-soft">—</span>'}</td>`;
              }).join('')}</tr>`).join('')}
              </tbody>
            </table>
          `).join('')}
        </section>`;
      },
    },

    band_athlete_list: {
      label: 'Band Conversion — Named Athletes',
      desc: 'For selected bands, list every athlete: who qualified, who attended, who didn\'t. Up to 500 rows.',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [_currentSeason];
        const bands = opts.bands || DEFAULT_BANDS;
        const fb = buildFilterSQL(opts.filters);
        // Only show bands the user selected (default all)
        const r = await neonQuery(`
          WITH zone_best AS (
            SELECT year, event_key, diver_id_dm, MIN(place) AS zone_place,
                   (array_agg(diver_first))[1] AS diver_first,
                   (array_agg(diver_last))[1] AS diver_last,
                   (array_agg(team_name))[1] AS team_name,
                   (array_agg(age_group))[1] AS age_group,
                   (array_agg(gender))[1] AS gender,
                   (array_agg(discipline))[1] AS discipline,
                   (array_agg(zone))[1] AS zone,
                   (array_agg(region))[1] AS region
            FROM core.event_results
            WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL
              AND year = ANY($1::int[])${fb.sql}
            GROUP BY year, event_key, diver_id_dm
          ),
          next_stage AS (
            SELECT DISTINCT year, event_key, diver_id_dm FROM core.event_results
            WHERE is_junior_circuit
              AND ((year < 2026 AND stage='Nationals') OR (year >= 2026 AND stage IN ('EWC','Nationals')))
              AND year = ANY($1::int[])${fb.sql}
          )
          SELECT zb.*, (ns.diver_id_dm IS NOT NULL) AS attended
          FROM zone_best zb LEFT JOIN next_stage ns USING (year, event_key, diver_id_dm)
          ORDER BY zb.year DESC, zb.zone_place, zb.diver_last
          LIMIT 500
        `, ['{'+yrs.join(',')+'}', ...fb.params]);
        // Group by band
        const byBand = {};
        r.rows.forEach(x => {
          const band = bands.find(b => x.zone_place >= b.min && x.zone_place <= b.max);
          if (!band) return;
          (byBand[band.label] = byBand[band.label] || []).push(x);
        });
        return `<section class="rb-section">
          <h2 class="rb-h2">Named Athletes by Band</h2>
          <p class="rb-p"><strong>Filter:</strong> ${esc(fb.summary)} · <strong>Years:</strong> ${yrs.join(', ')}</p>
          ${bands.map(b => {
            const rows = byBand[b.label] || [];
            if (rows.length === 0) return '';
            const att = rows.filter(x => x.attended).length;
            return `<h3 class="rb-h3">${esc(b.label)} <span class="rb-soft">(${fmt(rows.length)} athletes; ${fmt(att)} attended, ${fmt(rows.length-att)} did not)</span></h3>
              <table class="rb-table rb-table-sm">
                <thead><tr><th>Yr</th><th>Athlete</th><th>Team</th><th>Event</th><th>Zone</th><th>Place</th><th>Region</th><th>Next stage?</th></tr></thead>
                <tbody>
                ${rows.map(x => `<tr style="${x.attended?'':'background:#fef2f3'}">
                  <td>${x.year}</td>
                  <td><strong>${esc((x.diver_first||'')+' '+(x.diver_last||''))}</strong></td>
                  <td>${esc(x.team_name||'')}</td>
                  <td>${esc(x.event_key||'')}</td>
                  <td>${esc(x.zone||'')}</td>
                  <td>${x.zone_place}</td>
                  <td>${x.region?'R'+x.region:''}</td>
                  <td>${x.attended?'<strong style="color:#22893E">Attended</strong>':'<strong style="color:#E31937">Did not</strong>'}</td>
                </tr>`).join('')}
                </tbody>
              </table>`;
          }).join('')}
        </section>`;
      },
    },

    qualifier_rates: {
      label: 'Qualifier-Attendance Rates (CCE Headline)',
      desc: 'The headline answer: for each Zone band, what percentage attended the next stage? Shown as a single comparison table — ideal for a CCE talking-point slide.',
      async build(opts){
        const yrs = opts.years && opts.years.length ? opts.years : [_currentSeason];
        const bands = opts.bands || DEFAULT_BANDS;
        const fb = buildFilterSQL(opts.filters);
        const r = await neonQuery(`
          WITH zone_best AS (
            SELECT year, event_key, diver_id_dm, MIN(place) AS zone_place
            FROM core.event_results
            WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL
              AND year = ANY($1::int[])${fb.sql}
            GROUP BY year, event_key, diver_id_dm
          ),
          next_stage AS (
            SELECT DISTINCT year, event_key, diver_id_dm FROM core.event_results
            WHERE is_junior_circuit
              AND ((year < 2026 AND stage='Nationals') OR (year >= 2026 AND stage IN ('EWC','Nationals')))
              AND year = ANY($1::int[])${fb.sql}
          )
          SELECT zb.year, zb.zone_place,
                 (ns.diver_id_dm IS NOT NULL) AS attended
          FROM zone_best zb LEFT JOIN next_stage ns USING (year, event_key, diver_id_dm)
        `, ['{'+yrs.join(',')+'}', ...fb.params]);
        const yrSet = Array.from(new Set(r.rows.map(x => x.year))).sort();
        const grid = {};
        r.rows.forEach(x => {
          const band = bands.find(b => x.zone_place >= b.min && x.zone_place <= b.max);
          if (!band) return;
          const k = band.label + '|' + x.year;
          if (!grid[k]) grid[k] = { q: 0, a: 0 };
          grid[k].q++;
          if (x.attended) grid[k].a++;
        });
        // Big visual chart: 2D grid of band × year showing attendance rate as colored cell
        return `<section class="rb-section">
          <h2 class="rb-h2">Qualifier → Attendance Rates</h2>
          <p class="rb-p"><strong>Filter:</strong> ${esc(fb.summary)}</p>
          <p class="rb-p">Color intensity reflects attendance rate. Each cell shows "<em>qualified → attended (%)</em>".</p>
          <table class="rb-table">
            <thead><tr><th>Band</th>${yrSet.map(y => `<th>${y}</th>`).join('')}</tr></thead>
            <tbody>
            ${bands.map(b => `<tr>
              <td><strong>${esc(b.label)}</strong></td>
              ${yrSet.map(y => {
                const v = grid[b.label+'|'+y] || { q: 0, a: 0 };
                if (v.q === 0) return '<td><span class="rb-soft">—</span></td>';
                const pct = v.a / v.q;
                const r_ = Math.round(255 - pct*135);
                const g_ = Math.round(155 + pct*100);
                const b_ = Math.round(155 - pct*120);
                const bg = `rgb(${r_},${g_},${b_})`;
                const textColor = pct > 0.5 ? 'white' : '#171F69';
                return `<td style="background:${bg};color:${textColor};font-weight:600">${fmt(v.q)}→${fmt(v.a)}<br><span style="font-size:14px">${Math.round(100*pct)}%</span></td>`;
              }).join('')}
            </tr>`).join('')}
            </tbody>
          </table>
        </section>`;
      },
    },

    athlete_career: {
      label: 'Athlete Career Trace',
      desc: 'Full history for a single athlete by DM ID',
      requiresDmId: true,
      async build(opts){
        if (!opts.dmId) return '';
        const r = await neonQuery(
          "SELECT year, stage, meet_name, event_key, round, place, score, team_name "+
          "FROM core.event_results WHERE diver_id_dm = $1 ORDER BY year, meet_name, event_name, round",
          [opts.dmId]
        );
        if (!r.rows.length) return '<section class="rb-section"><p>No data for DM '+esc(opts.dmId)+'.</p></section>';
        const first = await neonQuery("SELECT first_name, last_name FROM core.divers WHERE diver_id_dm=$1", [opts.dmId]);
        const name = first.rows[0] ? (first.rows[0].first_name||'')+' '+(first.rows[0].last_name||'') : 'DM '+opts.dmId;
        const byYear = {};
        r.rows.forEach(x => (byYear[x.year]=byYear[x.year]||[]).push(x));
        const careerYears = Object.keys(byYear).map(Number);
        // Dive counts changed in 2018, 2019 and 2024, not only 2024. Ask the
        // era module rather than testing one boundary.
        const careerCaveat = (window.JuniorEras && window.JuniorEras.diveCountCaveat(careerYears)) || null;
        return `<section class="rb-section">
          <h2 class="rb-h2">${esc(name)} — Career Trace</h2>
          <p class="rb-soft">DM ${esc(opts.dmId)} · ${fmt(r.rows.length)} result rows · ${Object.keys(byYear).length} year${Object.keys(byYear).length===1?'':'s'}</p>
          ${careerCaveat ? `<p class="rb-p rb-callout-warn"><strong>⚠ ${esc(careerCaveat)}</strong> A score jump or drop across one of those seasons may partly reflect the rule change rather than a change in performance — check the age group that applied each year in the Event column below.</p>` : ''}
          ${Object.keys(byYear).sort().map(y => `
            <h3 class="rb-h3">${y}</h3>
            <table class="rb-table rb-table-sm">
              <thead><tr><th>Stage</th><th>Meet</th><th>Event</th><th>Round</th><th>Place</th><th>Score</th></tr></thead>
              <tbody>${byYear[y].map(x => `<tr>
                <td>${esc(stageLabelFor(x.stage||''))}</td><td>${esc(x.meet_name||'')}</td><td>${esc(x.event_key||'')}</td>
                <td>${esc(x.round||'')}</td><td>${x.place||''}</td>
                <td>${x.score!=null?Number(x.score).toFixed(2):''}</td>
              </tr>`).join('')}</tbody>
            </table>
          `).join('')}
        </section>`;
      },
    },
  };

  // Templates — curated section sequences for common deliverables
  const REPORT_TEMPLATES = [
    { id: 'zone_qualifying_scores', label: 'Qualifying Score Cutoffs — All Stages',
      desc: 'Average score needed at every cutoff — Region→Zone, Zone→Nationals/E-W-C, and E/W/C→Nationals — per event and age group, broken down by region/zone/site, side by side across 2024–2026.',
      sections: ['zone_qualifying_scores','zone_to_next_scores','ewc_nationals_scores'],
      defaultYears: [2024, 2025, 2026] },
    { id: 'cce_band_question', label: 'CCE Band Question',
      desc: 'Directly answers "how many 1–3 / 4–10 / 11–18 Zone divers attended E/W/C vs qualified?" — Mike\'s specific CCE/Board ask.',
      sections: ['qualifier_rates','band_conversion','band_demographic','band_athlete_list'],
      defaultYears: [2026] },
    { id: 'cce_briefing', label: 'CCE Briefing',
      desc: 'For Committee for Competitive Excellence meetings. Year-over-year pipeline, decline rates, demographics, and band conversion.',
      sections: ['season_context','exec_summary','year_matrix','qualifier_rates','declined_summary','demographic_mix','rule_era'],
      defaultYears: allYears() },
    { id: 'board_update', label: 'Board Update',
      desc: 'Concise update for Board of Directors. Pipeline funnel + multi-year context + anomalies.',
      sections: ['season_context','exec_summary','pipeline_funnel','year_matrix','anomaly_summary'],
      defaultYears: [2024,2025,2026] },
    { id: 'year_review', label: 'Year in Review',
      desc: 'Single-year deep dive. Funnel, demographics, region, band conversion, anomalies.',
      sections: ['season_context','exec_summary','pipeline_funnel','band_conversion','demographic_mix','regional_strength','anomaly_summary'],
      defaultYears: [_currentSeason] },
    { id: 'rule_change', label: 'Rule Change Impact',
      desc: 'Compare the three rule eras. Includes band conversion to show structural shifts.',
      sections: ['season_context','rule_era','year_matrix','qualifier_rates','declined_summary','demographic_mix'],
      defaultYears: allYears() },
    { id: 'decliner_deep', label: 'Decliner Deep Dive',
      desc: 'Full breakdown of top-3 Zone qualifiers who skipped the next stage. Named athlete list.',
      sections: ['season_context','declined_summary','declined_athletes','band_demographic','demographic_mix'],
      defaultYears: pastYears() },
    { id: 'athlete_spotlight', label: 'Athlete Spotlight',
      desc: 'Single-athlete career trace. Requires DM ID.',
      sections: ['athlete_career'],
      defaultYears: [],
      requiresDmId: true },
  ];

  // Builder state — now includes filters
  const rbState = {
    selectedTemplate: null,
    selectedSections: new Set(),
    years: null,
    dmId: '',
    filters: { ageGroups: [], genders: [], disciplines: [], regions: [], zones: [] },
    bands: DEFAULT_BANDS.slice(),
    filtersExpanded: false,
  };

  function openReportBuilder(){
    // Make sure we have year list
    if (!_availableYears) fetchAvailableYears();
    rbState.selectedTemplate = null;
    rbState.selectedSections = new Set();
    rbState.years = null;
    rbState.dmId = '';
    rbState.filters = { ageGroups: [], genders: [], disciplines: [], regions: [], zones: [] };
    rbState.bands = DEFAULT_BANDS.slice();
    rbState.filtersExpanded = false;
    const m = document.createElement('div');
    m.id = 'rb-modal';
    document.body.appendChild(m);
    renderBuilder();
  }

  function rbFilterSummary(){
    const f = rbState.filters;
    const parts = [];
    if (f.ageGroups.length) parts.push(f.ageGroups.join('/'));
    if (f.genders.length) parts.push(f.genders.join('/'));
    if (f.disciplines.length) parts.push(f.disciplines.join('/'));
    if (f.regions.length) parts.push('R' + f.regions.join(','));
    if (f.zones.length) parts.push('Zone ' + f.zones.join(','));
    return parts.length ? parts.join(' · ') : 'All athletes';
  }

  function renderBuilder(){
    const m = document.getElementById('rb-modal');
    if (!m) return;
    const years = allYears();
    const selYears = rbState.years || (rbState.selectedTemplate ? REPORT_TEMPLATES.find(t=>t.id===rbState.selectedTemplate)?.defaultYears : null) || [_currentSeason];
    const requiresDmId = Array.from(rbState.selectedSections).some(s => REPORT_SECTIONS[s] && REPORT_SECTIONS[s].requiresDmId);
    const canGenerate = rbState.selectedSections.size > 0 && (!requiresDmId || rbState.dmId.trim());

    m.innerHTML = `
      <div class="rb-overlay" onclick="if(event.target===this)window._rbClose()">
        <div class="rb-dialog">
          <div class="rb-head">
            <div>
              <div class="rb-eyebrow">USA Diving</div>
              <h2 class="rb-title">Build a Report</h2>
            </div>
            <button class="rb-close" onclick="window._rbClose()" title="Close">✕</button>
          </div>

          <div class="rb-body">
            <!-- Templates row -->
            <div class="rb-step">
              <div class="rb-step-num">1</div>
              <div class="rb-step-content">
                <div class="rb-step-h">Start from a template</div>
                <div class="rb-templates">
                  ${REPORT_TEMPLATES.map(t => `
                    <button class="rb-tmpl ${rbState.selectedTemplate===t.id?'is-on':''}" onclick="window._rbPickTemplate('${t.id}')">
                      <div class="rb-tmpl-name">${esc(t.label)}</div>
                      <div class="rb-tmpl-desc">${esc(t.desc)}</div>
                      <div class="rb-tmpl-sections">${t.sections.length} sections</div>
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Custom sections -->
            <div class="rb-step">
              <div class="rb-step-num">2</div>
              <div class="rb-step-content">
                <div class="rb-step-h">Choose sections <span class="rb-soft">(${rbState.selectedSections.size} selected)</span></div>
                <div class="rb-sections-grid">
                  ${Object.entries(REPORT_SECTIONS).map(([id,sec]) => `
                    <label class="rb-section-opt ${rbState.selectedSections.has(id)?'is-on':''}">
                      <input type="checkbox" ${rbState.selectedSections.has(id)?'checked':''} onchange="window._rbToggleSection('${id}')">
                      <div>
                        <div class="rb-section-name">${esc(sec.label)}${sec.requiresDmId?' <span class="rb-tag">needs DM ID</span>':''}</div>
                        <div class="rb-section-desc">${esc(sec.desc)}</div>
                      </div>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Year selection -->
            <div class="rb-step">
              <div class="rb-step-num">3</div>
              <div class="rb-step-content">
                <div class="rb-step-h">Pick year(s) for the report</div>
                <div class="rb-year-chips">
                  ${years.map(y => `
                    <button class="rb-yr-chip ${selYears.includes(y)?'is-on':''}" onclick="window._rbToggleYear(${y})">${y}</button>
                  `).join('')}
                  <button class="rb-yr-chip" onclick="window._rbAllYears()">All</button>
                  <button class="rb-yr-chip" onclick="window._rbCurrentOnly()">Current only</button>
                </div>
              </div>
            </div>

            <!-- Filters step -->
            <div class="rb-step">
              <div class="rb-step-num">4</div>
              <div class="rb-step-content">
                <div class="rb-step-h">Filters <span class="rb-soft">(optional — narrows every section)</span></div>
                <div class="rb-filter-row">
                  <div class="rb-filter-grp">
                    <div class="rb-filter-lbl">Age group</div>
                    <div class="rb-filter-chips">
                      ${['Group A','Group B','Group C','Group D'].map(g => `<button class="rb-fchip ${rbState.filters.ageGroups.includes(g)?'is-on':''}" onclick="window._rbToggleFilter('ageGroups','${g}')">${g.replace('Group ','')}</button>`).join('')}
                    </div>
                  </div>
                  <div class="rb-filter-grp">
                    <div class="rb-filter-lbl">Gender</div>
                    <div class="rb-filter-chips">
                      ${['Boys','Girls'].map(g => `<button class="rb-fchip ${rbState.filters.genders.includes(g)?'is-on':''}" onclick="window._rbToggleFilter('genders','${g}')">${g}</button>`).join('')}
                    </div>
                  </div>
                  <div class="rb-filter-grp">
                    <div class="rb-filter-lbl">Discipline</div>
                    <div class="rb-filter-chips">
                      ${['1M','3M','Platform'].map(g => `<button class="rb-fchip ${rbState.filters.disciplines.includes(g)?'is-on':''}" onclick="window._rbToggleFilter('disciplines','${g}')">${g}</button>`).join('')}
                    </div>
                  </div>
                </div>
                ${rbState.filtersExpanded ? `
                  <div class="rb-filter-row" style="margin-top:10px">
                    <div class="rb-filter-grp">
                      <div class="rb-filter-lbl">Region</div>
                      <div class="rb-filter-chips">
                        ${[1,2,3,4,5,6,7,8,9,10,11,12].map(r => `<button class="rb-fchip rb-fchip-tight ${rbState.filters.regions.includes(r)?'is-on':''}" onclick="window._rbToggleFilter('regions',${r})">${r}</button>`).join('')}
                      </div>
                    </div>
                    <div class="rb-filter-grp">
                      <div class="rb-filter-lbl">Zone</div>
                      <div class="rb-filter-chips">
                        ${['A','B','C','D','E','F'].map(z => `<button class="rb-fchip ${rbState.filters.zones.includes(z)?'is-on':''}" onclick="window._rbToggleFilter('zones','${z}')">${z}</button>`).join('')}
                      </div>
                    </div>
                  </div>
                ` : `<button class="rb-fchip rb-fchip-more" onclick="window._rbExpandFilters()" style="margin-top:8px">+ Region / Zone filters</button>`}
                ${(rbState.filters.ageGroups.length || rbState.filters.genders.length || rbState.filters.disciplines.length || rbState.filters.regions.length || rbState.filters.zones.length) ? `
                  <div class="rb-filter-summary">
                    <strong>Current scope:</strong> ${esc(rbFilterSummary())}
                    <button class="rb-fchip" style="margin-left:auto" onclick="window._rbClearFilters()">Clear all</button>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Place bands editor — only show if band-related section selected -->
            ${(Array.from(rbState.selectedSections).some(s => s.startsWith('band_') || s === 'qualifier_rates')) ? `
              <div class="rb-step">
                <div class="rb-step-num">5</div>
                <div class="rb-step-content">
                  <div class="rb-step-h">Place bands <span class="rb-soft">(for band-conversion sections)</span></div>
                  <div class="rb-bands-list">
                    ${rbState.bands.map((b,i) => `
                      <div class="rb-band-row">
                        <input type="text" value="${esc(b.label)}" onchange="window._rbSetBand(${i},'label',this.value)" style="flex:1;padding:5px 8px;border:1px solid var(--line);border-radius:4px"/>
                        <input type="number" value="${b.min}" min="1" max="50" onchange="window._rbSetBand(${i},'min',parseInt(this.value,10))" style="width:60px;padding:5px 8px;border:1px solid var(--line);border-radius:4px" title="min place"/>
                        <span class="rb-soft">to</span>
                        <input type="number" value="${b.max}" min="1" max="99" onchange="window._rbSetBand(${i},'max',parseInt(this.value,10))" style="width:60px;padding:5px 8px;border:1px solid var(--line);border-radius:4px" title="max place"/>
                        <button class="rb-fchip" onclick="window._rbRemoveBand(${i})" title="Remove this band">✕</button>
                      </div>
                    `).join('')}
                    <button class="rb-fchip" onclick="window._rbAddBand()" style="align-self:flex-start">+ Add band</button>
                    <button class="rb-fchip" onclick="window._rbResetBands()" style="align-self:flex-start;margin-left:6px">Reset to default (1–3, 4–10, 11–18, 19+)</button>
                  </div>
                </div>
              </div>
            ` : ''}

            ${requiresDmId ? `
              <div class="rb-step">
                <div class="rb-step-num">${(Array.from(rbState.selectedSections).some(s => s.startsWith('band_') || s === 'qualifier_rates')) ? '6' : '5'}</div>
                <div class="rb-step-content">
                  <div class="rb-step-h">Athlete DM ID required</div>
                  <input type="text" class="rb-dmid-input" placeholder="e.g. 73023" value="${esc(rbState.dmId)}" oninput="window._rbSetDmId(this.value)" />
                  <div class="rb-soft" style="margin-top:6px">Find DM IDs via the Athlete Career panel.</div>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="rb-foot">
            <span class="rb-soft">Output: a print-ready, USA Diving-branded document opens in a new view. From there you can print to PDF.</span>
            <span style="margin-left:auto;display:inline-flex;gap:8px">
              <button class="rb-btn-sec" onclick="window._rbClose()">Cancel</button>
              <button class="rb-btn-prim ${!canGenerate?'is-disabled':''}" onclick="window._rbGenerate()" ${!canGenerate?'disabled':''}>📄 Generate report</button>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  window._rbClose = function(){ const m = document.getElementById('rb-modal'); if (m) m.remove(); };
  window._rbPickTemplate = function(id){
    rbState.selectedTemplate = id;
    const t = REPORT_TEMPLATES.find(x => x.id === id);
    if (t) {
      rbState.selectedSections = new Set(t.sections);
      rbState.years = (t.defaultYears && t.defaultYears.length) ? t.defaultYears.slice() : null;
    }
    renderBuilder();
  };
  window._rbToggleSection = function(id){
    if (rbState.selectedSections.has(id)) rbState.selectedSections.delete(id);
    else rbState.selectedSections.add(id);
    rbState.selectedTemplate = null;  // user is customizing now
    renderBuilder();
  };
  window._rbToggleYear = function(y){
    const cur = rbState.years || (rbState.selectedTemplate ? REPORT_TEMPLATES.find(t=>t.id===rbState.selectedTemplate)?.defaultYears.slice() : null) || [_currentSeason];
    const idx = cur.indexOf(y);
    if (idx >= 0) cur.splice(idx, 1); else cur.push(y);
    rbState.years = cur.slice().sort();
    renderBuilder();
  };
  window._rbAllYears = function(){ rbState.years = allYears(); renderBuilder(); };
  window._rbCurrentOnly = function(){ rbState.years = [_currentSeason]; renderBuilder(); };
  window._rbSetDmId = function(v){ rbState.dmId = v; };

  window._rbToggleFilter = function(key, val){
    const arr = rbState.filters[key] || [];
    const idx = arr.indexOf(val);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(val);
    rbState.filters[key] = arr;
    renderBuilder();
  };
  window._rbExpandFilters = function(){ rbState.filtersExpanded = true; renderBuilder(); };
  window._rbClearFilters = function(){
    rbState.filters = { ageGroups: [], genders: [], disciplines: [], regions: [], zones: [] };
    renderBuilder();
  };

  window._rbSetBand = function(i, field, value){
    if (!rbState.bands[i]) return;
    rbState.bands[i][field] = value;
  };
  window._rbAddBand = function(){
    rbState.bands.push({ label: 'New band', min: 1, max: 3 });
    renderBuilder();
  };
  window._rbRemoveBand = function(i){
    rbState.bands.splice(i, 1);
    renderBuilder();
  };
  window._rbResetBands = function(){
    rbState.bands = DEFAULT_BANDS.slice();
    renderBuilder();
  };

  window._rbGenerate = async function(){
    const sectionIds = Array.from(rbState.selectedSections);
    if (sectionIds.length === 0) return;
    const years = (rbState.years && rbState.years.length) ? rbState.years.slice().sort() : [_currentSeason];
    const opts = {
      years: years,
      dmId: rbState.dmId.trim(),
      filters: JSON.parse(JSON.stringify(rbState.filters)),
      bands: rbState.bands.slice(),
    };
    const filterSummary = rbFilterSummary();

    // Close the modal, open the output container
    window._rbClose();
    const out = document.createElement('div');
    out.id = 'rb-output';
    out.innerHTML = `
      <style>
        @media print {
          body * { visibility: hidden !important; }
          #rb-output, #rb-output * { visibility: visible !important; }
          #rb-output { position: absolute; left: 0; top: 0; width: 100%; background: white; }
          #rb-output .rb-toolbar { display: none !important; }
          #rb-output, #rb-output * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          @page { margin: 0.6in; }
        }
        #rb-output { position: fixed; inset: 0; background: #fafbfd; z-index: 99999; overflow: auto; font-family: var(--f-ui, 'Inter', system-ui, sans-serif); color: #171F69; }
        #rb-output .rb-toolbar { position: sticky; top: 0; background: white; border-bottom: 1px solid #e5e9f2; padding: 10px 18px; display: flex; align-items: center; gap: 8px; z-index: 1; }
        #rb-output .rb-doc { max-width: 900px; margin: 24px auto; padding: 32px 44px; background: white; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        #rb-output .rb-doc-head { border-bottom: 4px solid #E31937; padding-bottom: 14px; margin-bottom: 22px; }
        #rb-output .rb-doc-head h1 { font-family: var(--f-display, 'Barlow Condensed', sans-serif); font-weight: 700; font-size: 28px; margin: 0; color: #171F69; text-transform: uppercase; letter-spacing: .01em; }
        #rb-output .rb-doc-head .rb-doc-sub { font-size: 12px; color: #5a6480; margin-top: 8px; }
        #rb-output .rb-section { margin: 26px 0; page-break-inside: avoid; }
        #rb-output .rb-h2 { font-family: var(--f-display, 'Barlow Condensed', sans-serif); font-weight: 700; font-size: 18px; color: #171F69; border-bottom: 2px solid #171F69; padding-bottom: 4px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.04em; }
        #rb-output .rb-h3 { font-family: var(--f-display, 'Barlow Condensed', sans-serif); font-weight: 700; font-size: 14px; color: #171F69; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.03em; }
        #rb-output .rb-p { font-size: 12px; color: #2d3450; margin: 0 0 8px; }
        #rb-output .rb-table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 6px 0; }
        #rb-output .rb-table th { background: #eef1f7; color: #171F69; text-align: left; padding: 5px 8px; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; border-bottom: 1px solid #c5cce0; }
        #rb-output .rb-table td { padding: 5px 8px; border-bottom: 1px solid #e5e9f2; font-variant-numeric: tabular-nums; }
        #rb-output .rb-table-sm { font-size: 10px; }
        #rb-output .rb-soft { color: #6b7390; font-size: 11px; }
        /* Season-context styling. Reports can now span 2013-2026, so a printed
           report has to carry its own caveats -- the reader will not have the
           year picker in front of them. */
        #rb-output .rb-callout-warn { background: #FFF4E5; border-left: 3px solid #B26A00; color: #5A3600; padding: 8px 10px; border-radius: 4px; }
        #rb-output .rb-ok   { color: #1B6E3A; font-weight: 700; }
        #rb-output .rb-warn { color: #8A5A00; font-weight: 700; }
        #rb-output .rb-row-muted td { background: #f7f8fb; color: #6b7390; }
        #rb-output .rb-funnels { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        #rb-output .rb-funnel-card { background: #f6f8fc; border-radius: 6px; padding: 10px; }
        #rb-output .rb-funnel-yr { font-family: var(--f-display, 'Barlow Condensed', sans-serif); font-weight: 700; font-size: 15px; color: #171F69; margin-bottom: 6px; }
        #rb-output .rb-funnel-row { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; font-size: 10px; }
        #rb-output .rb-funnel-lbl { width: 70px; color: #5a6480; }
        #rb-output .rb-funnel-bar { font-family: var(--f-mono, 'JetBrains Mono', monospace); color: white; padding: 3px 8px; border-radius: 2px; font-weight: 700; }
        #rb-output .rb-toolbar button { padding: 6px 12px; border-radius: 4px; border: 1px solid #c5cce0; background: white; cursor: pointer; font-family: inherit; font-size: 12px; }
        #rb-output .rb-toolbar .rb-print-btn { background: #171F69; color: white; border-color: #171F69; font-weight: 600; }
      </style>
      <div class="rb-toolbar">
        <button class="rb-print-btn" onclick="window.print()">🖨️ Print / save as PDF</button>
        <button onclick="document.getElementById('rb-output').remove()">✕ Close</button>
        <span class="rb-soft" style="margin-left:auto">Print to PDF for the cleanest result. The report is sized to print on US Letter paper.</span>
      </div>
      <div class="rb-doc">
        <div class="rb-doc-head">
          <h1 id="rb-doc-title">${esc(rbState.selectedTemplate ? REPORT_TEMPLATES.find(t=>t.id===rbState.selectedTemplate).label : 'Custom Report')}</h1>
          <div class="rb-doc-sub">
            Generated: ${new Date().toLocaleString()}<br>
            Year(s): ${esc(years.join(', '))}<br>
            Scope: <strong>${esc(filterSummary)}</strong>${(opts.bands && opts.bands.length && sectionIds.some(s => s.startsWith('band_') || s === 'qualifier_rates'))?`<br>Bands: ${esc(opts.bands.map(b => b.label).join(' · '))}`:''}<br>
            Sections: ${esc(sectionIds.map(s => REPORT_SECTIONS[s].label).join(' · '))}<br>
            Data source: live Neon (core.event_results)
          </div>
        </div>
        <div id="rb-doc-body">
          <div class="rb-soft">Building sections… <span id="rb-progress">0 / ${sectionIds.length}</span></div>
        </div>
      </div>
    `;
    document.body.appendChild(out);

    // Build sections in parallel
    const promises = sectionIds.map(id => REPORT_SECTIONS[id].build(opts).catch(e => `<section class="rb-section"><h2 class="rb-h2">${esc(REPORT_SECTIONS[id].label)}</h2><p class="rb-p" style="color:#E31937">Failed to build: ${esc(String(e.message||e))}</p></section>`));
    let done = 0;
    const results = await Promise.all(promises.map(p => p.then(html => { done++; const el=document.getElementById('rb-progress'); if (el) el.textContent = done+' / '+sectionIds.length; return html; })));
    const body = document.getElementById('rb-doc-body');
    if (body) {
      // Consistent branded footer across all three print/report paths in
      // this app (this one, Pipeline's full-dashboard print, and Pipeline's
      // river-only print) — same attribution phrase each carries.
      const footerDate = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
      body.innerHTML = results.join('') +
        `<div class="rb-soft" style="margin-top:18px;padding-top:10px;border-top:1px solid #e5e9f2;font-size:10px">` +
        `Generated ${footerDate} \u00b7 USA Diving Junior Results Audit \u00b7 Reflects filters and data active at time of generation.` +
        `</div>`;
    }
  };

  function generateReport(){ openReportBuilder(); }
  window._rptGenerateReport = openReportBuilder;

  /* ── Rule Era Comparison panel ─────────────────────────────────
     Compares the three rule eras side by side:
       Era 1: 2021-2022 — old system + Art. 102.4 (foreign athletes Regionals-only)
       Era 2: 2023-2025 — old system + foreign non-displacing at any stage
       Era 3: 2026+ — new system with E/W/C tier inserted between Zones and Nationals
     Each row of the comparison answers: "did this metric change with the rule change?"
  */
  const ERAS = [
    { id: 'e1', label: '2021–2022', desc: 'Old system + foreign Regionals-only', years: [2021, 2022], color: 'var(--navy)' },
    { id: 'e2', label: '2023–2025', desc: 'Old system + foreign non-displacing', years: [2023, 2024, 2025], color: 'var(--pool)' },
    { id: 'e3', label: '2026+',     desc: 'New system + E/W/C tier',            years: [2026], color: 'var(--q-direct)' },
  ];

  function renderRuleEraPanel(wrap){
    wrap.innerHTML = `
      <div class="rpt-stage-results">
        <div class="rpt-flow-head">
          <div class="rpt-flow-title">Rule era comparison <span class="rpt-soft">(impact of policy changes)</span></div>
          <div class="rpt-soft">Compare three rule eras directly. Each metric is per-year-averaged within the era for fair comparison.</div>
        </div>
        <div class="rpt-card">
          <h3 class="rpt-card-h">The three eras</h3>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
            ${ERAS.map(e => `
              <div style="border-top:3px solid ${e.color};border-radius:var(--radius);padding:12px;background:var(--surface)">
                <div style="font-size:20px;font-weight:700;color:var(--navy);font-family:var(--f-display)">${e.label}</div>
                <div class="rpt-soft" style="margin-top:4px">${esc(e.desc)}</div>
                <div style="margin-top:6px;font-size:11px;color:var(--ink-3)">Years: ${e.years.join(', ')}</div>
              </div>`).join('')}
          </div>
        </div>
        <div id="era-participation" class="rpt-card"><div class="rpt-loading">Loading participation comparison…</div></div>
        <div id="era-funnel" class="rpt-card"><div class="rpt-loading">Loading pipeline funnel comparison…</div></div>
        <div id="era-decliners" class="rpt-card"><div class="rpt-loading">Loading decliner comparison…</div></div>
        <div id="era-demographic" class="rpt-card"><div class="rpt-loading">Loading demographic comparison…</div></div>
      </div>
    `;
    loadRuleEraData();
  }

  async function loadRuleEraData(){
    try {
      // Participation: athletes-per-year-averaged by era, by stage
      const r = await neonQuery(`
        SELECT year, stage,
               COUNT(DISTINCT diver_id_dm)::int AS divers,
               COUNT(*)::int AS rows
        FROM core.event_results
        WHERE is_junior_circuit AND stage IN ('Regionals','Zones','EWC','Nationals') AND year IS NOT NULL
        GROUP BY year, stage ORDER BY year, stage
      `);
      const byEra = {};
      ERAS.forEach(e => { byEra[e.id] = { Regionals: [], Zones: [], EWC: [], Nationals: [] }; });
      r.rows.forEach(x => {
        const era = ERAS.find(e => e.years.includes(x.year));
        if (era && byEra[era.id][x.stage]) byEra[era.id][x.stage].push(x.divers);
      });
      const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0;
      const stages = stagesForYear(selectedYear());
      const html = `
        <h3 class="rpt-card-h">Avg athletes per year, per stage</h3>
        <table class="rpt-table">
          <thead><tr><th>Era</th>${stages.map(s=>`<th>${s}</th>`).join('')}<th>R→Z conversion</th></tr></thead>
          <tbody>
          ${ERAS.map(e => {
            const r_ = avg(byEra[e.id].Regionals);
            const z_ = avg(byEra[e.id].Zones);
            const ewc_ = avg(byEra[e.id].EWC);
            const n_ = avg(byEra[e.id].Nationals);
            const conv = r_ > 0 ? (100*z_/r_).toFixed(1)+'%' : '—';
            return `<tr>
              <td><strong style="color:${e.color}">${e.label}</strong></td>
              <td>${r_>0?fmt(Math.round(r_)):'—'}</td>
              <td>${z_>0?fmt(Math.round(z_)):'—'}</td>
              <td>${ewc_>0?fmt(Math.round(ewc_)):'<span class="rpt-soft">—</span>'}</td>
              <td>${n_>0?fmt(Math.round(n_)):'<span class="rpt-soft">—</span>'}</td>
              <td>${conv}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
        <div class="rpt-soft" style="margin-top:8px">In 2026 the system added an E/W/C tier between Zones and Nationals. Nationals data for 2026 will appear after the 2026 Jr Nationals event.</div>
      `;
      document.getElementById('era-participation').innerHTML = html;

      // Decliner comparison
      const dr = await neonQuery(`
        WITH zones_top3 AS (
          SELECT DISTINCT year, event_key, diver_id_dm
          FROM core.event_results
          WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL AND place <= 3 AND year IS NOT NULL
        ),
        nexts AS (
          SELECT DISTINCT year, event_key, diver_id_dm
          FROM core.event_results
          WHERE is_junior_circuit AND ((year < 2026 AND stage='Nationals') OR (year >= 2026 AND stage IN ('EWC','Nationals')))
        ),
        decliners AS (
          SELECT z.year FROM zones_top3 z
          LEFT JOIN nexts n USING (year, event_key, diver_id_dm)
          WHERE n.diver_id_dm IS NULL
        )
        SELECT year, COUNT(*)::int AS decliners FROM decliners GROUP BY year ORDER BY year
      `);
      const declByEra = { e1: [], e2: [], e3: [] };
      const top3ByEra = { e1: [], e2: [], e3: [] };
      // Need top-3 counts per year too
      const tr = await neonQuery(`
        SELECT year, COUNT(DISTINCT (year, event_key, diver_id_dm))::int AS n
        FROM core.event_results
        WHERE is_junior_circuit AND stage='Zones' AND place IS NOT NULL AND place <= 3 AND year IS NOT NULL
        GROUP BY year ORDER BY year
      `);
      const top3Map = {}; tr.rows.forEach(x => top3Map[x.year] = x.n);
      dr.rows.forEach(x => {
        const era = ERAS.find(e => e.years.includes(x.year));
        if (era) {
          declByEra[era.id].push(x.decliners);
          if (top3Map[x.year]) top3ByEra[era.id].push(top3Map[x.year]);
        }
      });
      const declHtml = `
        <h3 class="rpt-card-h">Top-3 Zone qualifiers who skipped the next stage</h3>
        <table class="rpt-table">
          <thead><tr><th>Era</th><th>Avg decliners / year</th><th>Avg top-3 / year</th><th>Decline rate</th></tr></thead>
          <tbody>
          ${ERAS.map(e => {
            const d = avg(declByEra[e.id]);
            const t = avg(top3ByEra[e.id]);
            const rate = t > 0 ? (100*d/t).toFixed(1)+'%' : '—';
            return `<tr>
              <td><strong style="color:${e.color}">${e.label}</strong></td>
              <td>${d>0?fmt(Math.round(d)):'—'}</td>
              <td>${t>0?fmt(Math.round(t)):'—'}</td>
              <td><strong>${rate}</strong></td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
        <div class="rpt-soft" style="margin-top:8px">Decline rate = (top-3 athletes from Zones who didn't appear at Nationals or E/W/C the same year) ÷ (total top-3 Zone qualifiers). The CCE's headline question.</div>
      `;
      document.getElementById('era-decliners').innerHTML = declHtml;

      // Funnel: avg per-year R→Z→Next per era
      document.getElementById('era-funnel').innerHTML = `
        <h3 class="rpt-card-h">Pipeline funnels per era (avg per year)</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
          ${ERAS.map(e => {
            const r_ = avg(byEra[e.id].Regionals);
            const z_ = avg(byEra[e.id].Zones);
            const ewc_ = avg(byEra[e.id].EWC);
            const n_ = avg(byEra[e.id].Nationals);
            const stages = [['Regionals', r_], ['Zones', z_]];
            if (ewc_ > 0) stages.push(['E/W/C', ewc_]);
            if (n_ > 0) stages.push(['Nationals', n_]);
            const max = Math.max.apply(null, stages.map(s => s[1]));
            return `<div style="background:var(--surface-2);border-radius:var(--radius);padding:12px">
              <div style="font-weight:600;color:${e.color};margin-bottom:8px">${e.label}</div>
              ${stages.map(([lbl, val]) => `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
                  <div style="background:${e.color};height:24px;width:${100*val/Math.max(1,max)}%;min-width:40px;display:flex;align-items:center;padding-left:8px;color:white;font-size:11px;font-weight:600;border-radius:3px">${fmt(Math.round(val))}</div>
                  <div style="font-size:11px;color:var(--ink-3);flex-shrink:0;width:60px">${lbl}</div>
                </div>`).join('')}
            </div>`;
          }).join('')}
        </div>
      `;

      // Demographic comparison (junior circuit, by age group)
      const dem = await neonQuery(`
        SELECT year, age_group,
               COUNT(DISTINCT diver_id_dm)::int AS divers
        FROM core.event_results
        WHERE is_junior_circuit AND age_group IS NOT NULL AND age_group LIKE 'Group %'
        GROUP BY year, age_group ORDER BY year, age_group
      `);
      const demByEra = { e1: {}, e2: {}, e3: {} };
      dem.rows.forEach(x => {
        const era = ERAS.find(e => e.years.includes(x.year));
        if (era) {
          demByEra[era.id][x.age_group] = (demByEra[era.id][x.age_group] || []).concat(x.divers);
        }
      });
      const groups = ['Group A','Group B','Group C','Group D'];
      document.getElementById('era-demographic').innerHTML = `
        <h3 class="rpt-card-h">Avg athletes per age group, per era</h3>
        <table class="rpt-table">
          <thead><tr><th>Era</th>${groups.map(g=>`<th>${g}</th>`).join('')}</tr></thead>
          <tbody>
          ${ERAS.map(e => `<tr>
            <td><strong style="color:${e.color}">${e.label}</strong></td>
            ${groups.map(g => {
              const arr = demByEra[e.id][g] || [];
              const a = avg(arr);
              return `<td>${a>0?fmt(Math.round(a)):'—'}</td>`;
            }).join('')}
          </tr>`).join('')}
          </tbody>
        </table>
        <div class="rpt-soft" style="margin-top:8px">2026 doesn't have Group C/D at Regionals (per new rules — they skip Regionals and start at Zones).</div>
      `;
    } catch (e) {
      document.getElementById('era-participation').innerHTML = '<div class="rpt-err">Failed: '+esc(String(e.message||e))+'</div>';
    }
  }

  /* ── Saved Views panel ─────────────────────────────────────────
     LocalStorage-backed: name + pin a filter+panel+selection state. */
  const SAVED_KEY = 'usad_reports_saved_views_v1';

  function loadSavedViews(){
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); }
    catch(e) { return []; }
  }
  function saveSavedViews(list){
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  }

  function captureCurrentView(){
    const f = rptState.filters || {};
    return {
      panel: rptState.panel,
      filters: { ageGroup:f.ageGroup||null, gender:f.gender||null, discipline:f.discipline||null, region:f.region||null, zone:f.zone||null, ewc:f.ewc||null, team:f.team||null },
      histYears: (typeof histState !== 'undefined' && histState.yearsSelected) ? Array.from(histState.yearsSelected) : null,
      declYears: (typeof declState !== 'undefined' && declState.years) ? Array.from(declState.years) : null,
      tierYears: (typeof tierState !== 'undefined' && tierState.years) ? Array.from(tierState.years) : null,
      savedAt: new Date().toISOString(),
    };
  }
  function applyView(v){
    if (v.panel) rptState.panel = v.panel;
    if (!rptState.filters) rptState.filters = {};
    Object.assign(rptState.filters, v.filters || {});
    if (v.histYears && typeof histState !== 'undefined') histState.yearsSelected = new Set(v.histYears);
    if (v.declYears && typeof declState !== 'undefined') declState.years = new Set(v.declYears);
    if (v.tierYears && typeof tierState !== 'undefined') tierState.years = new Set(v.tierYears);
    renderReports();
  }

  function renderSavedViewsPanel(wrap){
    const list = loadSavedViews();
    wrap.innerHTML = `
      <div class="rpt-stage-results">
        <div class="rpt-flow-head">
          <div class="rpt-flow-title">Saved views</div>
          <div class="rpt-soft">Pin a filter + panel + year state for quick recall. Stored in this browser.</div>
        </div>
        <div class="rpt-card">
          <h3 class="rpt-card-h">Save current view</h3>
          <div class="rpt-slicer-bar">
            <input id="sv-name" type="text" placeholder="Name this view (e.g., 'CCE deck — Q3 dropoff 2024 v 2026')" style="padding:6px 9px;border:1px solid var(--line);border-radius:var(--radius-sm);width:480px"/>
            <button class="rpt-btn-prim" onclick="window._savedAdd()">Save</button>
          </div>
        </div>
        <div class="rpt-card">
          <h3 class="rpt-card-h">Your views (${list.length})</h3>
          ${list.length === 0 ? '<div class="rpt-soft">None saved yet. Set up the filters/panel you want, type a name, and click Save.</div>' :
            '<table class="rpt-table"><thead><tr><th>Name</th><th>Panel</th><th>Filters</th><th>Saved</th><th></th></tr></thead><tbody>'+
            list.map((v,i) => {
              const fSummary = Object.entries(v.filters||{}).filter(x => x[1]).map(x => x[0]+'='+x[1]).join(', ') || '—';
              return `<tr>
                <td><strong>${esc(v.name||'(unnamed)')}</strong></td>
                <td>${esc(v.panel||'')}</td>
                <td class="rpt-soft">${esc(fSummary)}</td>
                <td class="rpt-soft">${new Date(v.savedAt).toLocaleString()}</td>
                <td>
                  <button class="rpt-btn-prim" onclick="window._savedApply(${i})">Open</button>
                  <button class="rpt-export-btn" onclick="window._savedDelete(${i})" style="color:var(--red)">Delete</button>
                </td>
              </tr>`;
            }).join('') + '</tbody></table>'}
        </div>
      </div>
    `;
  }

  window._savedAdd = function(){
    const name = (document.getElementById('sv-name').value || '').trim();
    if (!name) { alert('Please name the view first.'); return; }
    const list = loadSavedViews();
    list.push(Object.assign({ name: name }, captureCurrentView()));
    saveSavedViews(list);
    renderReports();
  };
  window._savedApply = function(idx){
    const list = loadSavedViews();
    if (list[idx]) applyView(list[idx]);
  };
  window._savedDelete = function(idx){
    if (!confirm('Delete this saved view?')) return;
    const list = loadSavedViews();
    list.splice(idx, 1);
    saveSavedViews(list);
    renderReports();
  };

  /* ── Hook into main.js ──────────────────────────────────────── */
  function waitForMain(cb, tries){
    tries = tries || 0;
    if (typeof renderAll === 'function' && typeof state !== 'undefined') cb();
    else if (tries < 200) setTimeout(() => waitForMain(cb, tries + 1), 50);
  }

  function init(){
    injectCSS();
    window._qvRenderReports = renderReports;
    setupStageWatcher();
    // Apply shared-view URL state if present
    try { applyHashState(); } catch(e) { console.warn('[reports-view] hash state apply failed', e); }
    console.log('[reports-view] v4 — historical + declined + anomaly + career + tier-entry + share/print');
  }

  waitForMain(init);
})();
