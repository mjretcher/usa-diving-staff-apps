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
  function esc(v){
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function $(id){ return document.getElementById(id); }
  function norm(v){
    return String(v||'').toLowerCase().normalize('NFKD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,' ').trim();
  }
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
  function allResults(){
    return typeof effectiveResults !== 'undefined' ? effectiveResults
      : (window.JUNIOR_RESULTS_DATA?.results || []);
  }
  function allEvents(){
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

    function stage(title, icon, color, stats){
      return `<div class="fnl-card fnl-${color}">
        <div class="fnl-head">
          <span class="fnl-icon">${esc(icon)}</span>
          <span class="fnl-title">${esc(title)}</span>
        </div>
        <div class="fnl-stats">
          ${stats.map(s => `
            <div class="fnl-stat ${s.accent ? 'fnl-acc-'+s.accent : ''}">
              <span class="fnl-val">${typeof s.val === 'number' ? fmtNum(s.val) : esc(String(s.val))}</span>
              <span class="fnl-lbl">${esc(s.label)}</span>
              ${s.note ? `<span class="fnl-note">${esc(s.note)}</span>` : ''}
            </div>`).join('')}
        </div>
      </div>`;
    }

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

        <div class="rpt-funnel">
          ${stage('Region Championships', 'R', 'navy', [
            {label:'Entries', val: d.regionals.entries, note: GROUPS_REQ_REG.has(rptState.ageGroup) || !rptState.ageGroup ? 'Groups A/B path' : 'Filtered group does not pass through Regionals' },
            {label:'Unique athletes', val: d.regionals.athletes},
            {label:'Qualified to Zones', val: d.regionals.qualifying, accent:'green'},
            {label:'Bumps · spot shifts', val: `${d.regionals.bumps} · ${d.regionals.shifts}`},
            {label:'Qualified — did not compete at Zones', val: d.regionals.noshows.length, accent: d.regionals.noshows.length > 0 ? 'amber' : ''},
          ])}

          <div class="fnl-arrow">▼</div>

          ${stage('Zone Championships', 'Z', 'pool', [
            {label:'Entries', val: d.zones.entries},
            {label:'Unique athletes', val: d.zones.athletes},
            {label:'Groups C/D direct entrants', val: d.zones.cdDirect, note:'Skip Regionals'},
            {label:'→ Nationals (direct)', val: d.zones.toNationals, accent:'green', note:`${d.zones.toNationalsEnt} entry slots`},
            {label:'→ E/W/C', val: d.zones.toEWC, accent:'blue', note:`${d.zones.toEWCEnt} entry slots`},
            {label:'Bumps · spot shifts', val: `${d.zones.bumps} · ${d.zones.shifts}`},
            {label:'EWC qual — did not register', val: d.zones.ewcNoshow, accent: d.zones.ewcNoshow > 0 ? 'amber' : ''},
          ])}

          <div class="fnl-arrow">▼</div>

          ${stage('East / West / Central', 'E', 'sky', [
            {label:'Registered athletes', val: d.ewc.registered, accent:'blue', note: filtered ? `of ${d.ewc.totalAll} total` : ''},
            {label:'Total event entries', val: d.ewc.entries || '—', note:'Across all 3 meets'},
            {label:'HPS pre-qualified', val: ewcHps().length, note:'Bypass E/W/C — direct to Nat prelims'},
            {label:'Foreign at E/W/C', val: ewcForeign().length, note:'Non-displacing'},
          ])}

          <div class="fnl-arrow">▼</div>

          ${stage('Junior Nationals', 'N', 'navy', [
            {label:'Qualified athletes', val: d.nationals.qualified, accent:'green', note: filtered ? `of ${d.nationals.totalAll} total` : ''},
            {label:'Direct from Zones', val: d.zones.toNationals, note:'Top 3 per zone event'},
            {label:'Via E/W/C', val: 'Pending', note:'Results not yet loaded'},
          ])}
        </div>

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

    const madeNats = stages[3].athletes.length;
    const droppedOff = total - madeNats;

    wrap.innerHTML = `<div class="rpt-section">

      <!-- Hero summary: 3 big blocks -->
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

      <!-- Pipeline funnel: stages with drop-offs -->
      <div class="rpt-h2">
        <span class="rpt-h2-l">Pipeline funnel</span>
        <span class="rpt-h2-sub">Click any bar or drop-off to see who's there</span>
      </div>
      <div class="cf-funnel">
        ${stages.map((s, i) => {
          const widthPct = total > 0 ? Math.max(10, Math.round(s.athletes.length / total * 100)) : 0;
          const isDrill = drill === 'stage_' + s.id;
          const drop = drops[i];
          return `
          <div class="cf-stage cf-stage-${i} ${isDrill?'is-drill':''}" onclick="window._rptDrillFunnel('stage_${s.id}')">
            <div class="cf-stage-info">
              <span class="cf-stage-step">${i+1}</span>
              <div>
                <div class="cf-stage-title">${esc(s.label)}</div>
                <div class="cf-stage-sub">${esc(s.sub)}</div>
              </div>
            </div>
            <div class="cf-stage-bar-wrap">
              <div class="cf-stage-bar cf-bar-${i}" style="width:${widthPct}%">
                <span class="cf-stage-n">${fmtNum(s.athletes.length)}</span>
              </div>
              <span class="cf-stage-pct">${pct(s.athletes.length, total)}</span>
            </div>
          </div>
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

      <!-- Outcome breakdown cards -->
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
          <span>Click a funnel bar, a drop-off, or an outcome card above to see the named list of athletes.</span>
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

    wrap.innerHTML = `<div class="rpt-section">

      ${scoringControls()}

      <div class="rpt-note">
        <strong>Scores are only comparable within the same event type.</strong>
        Group A Boys 1M, Group D Girls Platform, and every other combination use
        different scoring scales (different dive lists, DDs, board heights), so an
        overall &ldquo;average score for 1st place&rdquo; would mix incomparable numbers.
        Each row below is one event type — those numbers are meaningful.
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
              <th class="mono" title="Total scored results in the selected place range">Total n</th>
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
                <td class="mono sc-event-n"><strong>${es.totalSamples}</strong></td>
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

    const allStages = ['Regionals','Zones','EWC','Nationals'];
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
    ['scoring',      'Scoring',           '📈'],
    ['breakdowns',   'Breakdowns',        '🗂️'],
    ['displacement', 'Displacements',     '↔️'],
    ['status',       'Special status',    '🛡️'],
  ];

  function buildTopHeader(){
    const tabs = PANELS.map(([k,l,ic]) =>
      `<button class="rpt-toptab ${rptState.panel===k?'is-active':''}" onclick="window._rptPanel('${k}')">
         <span class="rpt-toptab-ic">${ic}</span><span>${esc(l)}</span>
       </button>`).join('');

    return `<div class="rpt-top">
      <div class="rpt-top-row1">
        <span class="rpt-top-eyebrow">Analytics &amp; Reports</span>
        <span class="rpt-top-meta">${esc(activeFilterDescription())}</span>
      </div>
      <div class="rpt-top-row2">${tabs}</div>
      <div class="rpt-top-row3">${buildFilterChips()}</div>
    </div>`;
  }

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

    const startLabel = 'Started in the cohort';
    const startSub = d.entryStage === 'Zones'
      ? 'direct to Zones (Groups C/D)'
      : 'most enter at Regionals';

    return [
      { id:'start',     label:startLabel,               sub:startSub,                                  athletes:all },
      { id:'zones',     label:'Competed at Zones',      sub:'showed up at the Zone meet',              athletes:reachedZones },
      { id:'ewc',       label:'Reached E/W/C territory',sub:'qualified to or registered at E/W/C',     athletes:reachedEWC },
      { id:'nationals', label:'On the Jr Nationals list',sub:'the final destination',                  athletes:madeNationals },
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
      ['scoring',      'Scoring analysis',      '📈'],
      ['breakdowns',   'Participation breakdowns','🗂️'],
      ['displacement', 'Displacements',         '↔️'],
      ['status',       'Special status',        '🛡️'],
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

    if (rptState.panel === 'flow')              renderFlowPanel(wrap);
    else if (rptState.panel === 'cohort')       renderCohortPanel(wrap);
    else if (rptState.panel === 'scoring')      renderScoringPanel(wrap);
    else if (rptState.panel === 'breakdowns')   renderBreakdownsPanel(wrap);
    else if (rptState.panel === 'displacement') renderDisplacementPanel(wrap);
    else if (rptState.panel === 'status')       renderStatusPanel(wrap);
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
.rpt-section-title{font-size:16px;font-weight:600;font-family:var(--f-display);letter-spacing:.01em;color:var(--navy);margin-bottom:12px;display:flex;align-items:center;gap:12px;text-transform:uppercase}
.rpt-section-sub{font-size:11px;font-weight:400;color:var(--ink-3);font-family:var(--f-ui);text-transform:none;letter-spacing:0}
.rpt-subsection{margin-top:22px}
.rpt-subsection-title{font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rpt-pill{display:inline-flex;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:2px 9px;font-size:11px;color:var(--ink-2);font-weight:500;font-family:var(--f-mono)}
.rpt-pill-note{font-size:11px;color:var(--ink-3);font-weight:400;font-family:var(--f-ui)}
.rpt-note{font-size:12px;color:var(--ink-2);background:var(--surface-2);border-left:3px solid var(--pool);border-radius:var(--radius);padding:9px 14px;margin-bottom:12px;line-height:1.55}
.rpt-filter-note{font-size:12px;color:var(--ink-2);background:#FEF3C7;border-left:3px solid #d97706;border-radius:var(--radius);padding:9px 14px;margin:0 20px 0}
.rpt-empty{padding:30px 20px;color:var(--ink-3);text-align:center;font-size:13px;background:var(--surface-2);border-radius:var(--radius);border:1px dashed var(--line)}
.rpt-export-btn{margin-left:auto;padding:5px 11px;font-size:11px;border-radius:var(--radius);border:1px solid var(--line);background:var(--surface);color:var(--ink-2);cursor:pointer;font-family:var(--f-ui)}
.rpt-export-btn:hover{background:var(--surface-2);border-color:var(--navy);color:var(--navy)}

/* === Pipeline funnel === */
.rpt-funnel{display:flex;flex-direction:column;gap:0;margin-bottom:16px}
.fnl-card{border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);padding:14px 16px;box-shadow:var(--sh-xs)}
.fnl-card.fnl-navy{border-top:3px solid var(--navy)}
.fnl-card.fnl-pool{border-top:3px solid var(--pool)}
.fnl-card.fnl-sky{border-top:3px solid var(--sky)}
.fnl-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.fnl-icon{width:28px;height:28px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-family:var(--f-display);flex-shrink:0}
.fnl-pool .fnl-icon{background:var(--pool)}
.fnl-sky .fnl-icon{background:var(--sky);color:var(--navy)}
.fnl-title{font-size:14px;font-weight:600;font-family:var(--f-display);color:var(--navy);text-transform:uppercase;letter-spacing:.03em}
.fnl-stats{display:flex;flex-wrap:wrap;gap:8px}
.fnl-stat{flex:1;min-width:160px;background:var(--surface-2);border-radius:var(--radius);padding:9px 13px}
.fnl-stat.fnl-acc-green .fnl-val{color:var(--q-direct)}
.fnl-stat.fnl-acc-blue .fnl-val{color:var(--q-ewc)}
.fnl-stat.fnl-acc-amber .fnl-val{color:var(--q-repl)}
.fnl-val{display:block;font-size:22px;font-weight:600;font-family:var(--f-mono);color:var(--ink);line-height:1.1}
.fnl-lbl{display:block;font-size:11px;color:var(--ink-2);margin-top:3px;font-weight:500}
.fnl-note{display:block;font-size:10px;color:var(--ink-3);margin-top:2px;font-style:italic}
.fnl-arrow{text-align:center;padding:6px 0;color:var(--ink-4);font-size:18px}

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
.rpt-table th{background:var(--surface-2);padding:7px 11px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);border-bottom:1px solid var(--line);white-space:nowrap;position:sticky;top:0;z-index:1}
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

/* === Reports stage chrome (hide dead main-app UI) === */
body.rpt-stage-active .event-panel,
body.rpt-stage-active .results-toolbar,
body.rpt-stage-active .kpi-row { display: none !important; }
body.rpt-stage-active .workspace { grid-template-columns: 1fr !important; gap: 0 !important; }
body.rpt-stage-active .results-panel { width: 100% }
body.rpt-stage-active .results-context { padding: 0 !important; margin: 0 !important; background: transparent !important; border: none !important; }
body.rpt-stage-active .table-wrap { padding: 0 !important; background: transparent !important; }

/* === Top header (panel tabs + filter chips) === */
.rpt-top { padding: 14px 24px 0 24px; background: var(--surface); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 5; }
.rpt-top-row1 { display: flex; align-items: baseline; gap: 14px; margin-bottom: 10px; flex-wrap: wrap; }
.rpt-top-eyebrow { font-family: var(--f-display); font-size: 20px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: .03em; }
.rpt-top-meta { font-size: 12.5px; color: var(--ink-3); font-style: italic; }

.rpt-top-row2 { display: flex; gap: 2px; flex-wrap: wrap; border-bottom: 1px solid var(--line); margin: 0 -24px; padding: 0 24px; }
.rpt-toptab { background: transparent; border: 0; padding: 11px 16px; font-size: 13px; font-family: var(--f-ui); color: var(--ink-3); cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -1px; font-weight: 500; display: inline-flex; gap: 7px; align-items: center; transition: all .12s; }
.rpt-toptab:hover { color: var(--navy); background: var(--surface-2); }
.rpt-toptab.is-active { color: var(--navy); border-bottom-color: var(--navy); font-weight: 700; background: linear-gradient(180deg, transparent 50%, var(--surface-2) 100%); }
.rpt-toptab-ic { font-size: 15px; }

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
body.rpt-stage-active .rpt-section { padding: 18px 24px 80px; }

/* === Cohort hero === */
.cohort-hero { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 14px; margin-bottom: 22px; }
@media (max-width: 980px) { .cohort-hero { grid-template-columns: 1fr; } }
.cohort-hero-block { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 16px 20px; box-shadow: var(--sh-xs); }
.cohort-hero-block.primary { background: linear-gradient(135deg, var(--navy) 0%, #2a3493 100%); color: #fff; border-color: var(--navy); }
.cohort-hero-eyebrow { font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; opacity: .75; font-weight: 600; margin-bottom: 6px; }
.cohort-hero-block.primary .cohort-hero-eyebrow { color: rgba(255,255,255,.78); opacity: 1; }
.cohort-hero-num { font-family: var(--f-display); font-size: 42px; font-weight: 700; line-height: 1; color: var(--navy); }
.cohort-hero-block.primary .cohort-hero-num { color: #fff; }
.cohort-hero-num.good { color: var(--q-direct); }
.cohort-hero-num.neutral { color: var(--ink-3); }
.cohort-hero-l { font-size: 13.5px; color: var(--ink-2); margin-top: 5px; font-weight: 500; }
.cohort-hero-block.primary .cohort-hero-l { color: rgba(255,255,255,.88); }
.cohort-hero-sub { font-size: 11.5px; color: var(--ink-3); margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line-2); }
.cohort-hero-block.primary .cohort-hero-sub { color: rgba(255,255,255,.7); border-top-color: rgba(255,255,255,.18); }

/* === Section H2 === */
.rpt-h2 { display: flex; align-items: baseline; gap: 14px; margin: 26px 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
.rpt-h2-l { font-family: var(--f-display); font-size: 16px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: .04em; }
.rpt-h2-sub { font-size: 12px; color: var(--ink-3); font-style: italic; }

/* === Funnel === */
.cf-funnel { display: flex; flex-direction: column; gap: 0; margin-bottom: 8px; }
.cf-stage { display: grid; grid-template-columns: 280px 1fr; gap: 18px; align-items: center; padding: 14px 8px; cursor: pointer; border-radius: var(--radius); transition: all .12s; border: 1px solid transparent; }
.cf-stage:hover { background: var(--surface-2); border-color: var(--line-2); }
.cf-stage.is-drill { background: rgba(0,154,199,.08); border-color: var(--pool); box-shadow: 0 0 0 1px var(--pool); }
.cf-stage-info { display: flex; align-items: center; gap: 12px; }
.cf-stage-step { width: 28px; height: 28px; border-radius: 50%; background: var(--surface-2); color: var(--ink-3); border: 1px solid var(--line); display: inline-flex; align-items: center; justify-content: center; font-family: var(--f-display); font-weight: 700; font-size: 14px; flex-shrink: 0; }
.cf-stage.cf-stage-0 .cf-stage-step { background: var(--navy); color: #fff; border-color: var(--navy); }
.cf-stage.cf-stage-1 .cf-stage-step { background: var(--pool); color: #fff; border-color: var(--pool); }
.cf-stage.cf-stage-2 .cf-stage-step { background: var(--sky); color: var(--navy); border-color: var(--sky); }
.cf-stage.cf-stage-3 .cf-stage-step { background: var(--q-direct); color: #fff; border-color: var(--q-direct); }
.cf-stage-title { font-family: var(--f-display); font-size: 16px; font-weight: 700; color: var(--navy); line-height: 1.15; }
.cf-stage-sub { font-size: 11.5px; color: var(--ink-3); font-style: italic; margin-top: 1px; }
.cf-stage-bar-wrap { display: flex; align-items: center; gap: 14px; }
.cf-stage-bar { height: 46px; border-radius: var(--radius); display: flex; align-items: center; padding: 0 18px; min-width: 80px; transition: all .12s; box-shadow: var(--sh-xs); }
.cf-bar-0 { background: linear-gradient(90deg, var(--navy) 0%, #2c3899 100%); color: #fff; }
.cf-bar-1 { background: linear-gradient(90deg, var(--pool) 0%, #00b6e8 100%); color: #fff; }
.cf-bar-2 { background: linear-gradient(90deg, #6daed8 0%, var(--sky) 100%); color: var(--navy); }
.cf-bar-3 { background: linear-gradient(90deg, var(--q-direct) 0%, #2ab86a 100%); color: #fff; }
.cf-stage-n { font-family: var(--f-mono); font-size: 22px; font-weight: 700; }
.cf-stage-pct { font-family: var(--f-mono); font-size: 13px; color: var(--ink-2); font-weight: 600; min-width: 52px; text-align: right; }

.cf-drop { display: grid; grid-template-columns: 280px 32px 1fr auto; gap: 16px; align-items: center; padding: 6px 8px; cursor: pointer; border-radius: var(--radius); transition: all .12s; border: 1px solid transparent; }
.cf-drop:hover { background: rgba(217,119,6,.05); border-color: var(--q-repl-b); }
.cf-drop.is-drill { background: rgba(217,119,6,.1); border-color: var(--q-repl); box-shadow: 0 0 0 1px var(--q-repl); }
.cf-drop-spacer { }
.cf-drop-arrow-wrap { display: flex; justify-content: flex-end; padding-right: 8px; }
.cf-drop-arrow { font-size: 22px; color: var(--q-repl); line-height: 1; font-weight: 700; }
.cf-drop-info { display: flex; flex-direction: column; gap: 1px; }
.cf-drop-n { font-family: var(--f-mono); font-size: 14px; font-weight: 700; color: var(--q-repl); }
.cf-drop-l { font-size: 12px; color: var(--ink-2); }
.cf-drop-pct { font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); font-style: italic; text-align: right; }

/* === Outcome cards === */
.cf-outcomes { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin-bottom: 6px; }
.cf-outcome { position: relative; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 14px 14px; cursor: pointer; transition: all .12s; box-shadow: var(--sh-xs); overflow: hidden; }
.cf-outcome:hover { border-color: var(--navy); transform: translateY(-1px); box-shadow: var(--sh-sm); }
.cf-outcome.is-drill { border-color: var(--pool); box-shadow: 0 0 0 2px var(--pool); }
.cf-outcome-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.cf-outcome-n { font-family: var(--f-mono); font-size: 26px; font-weight: 700; color: var(--ink); line-height: 1; }
.cf-outcome-pct { font-family: var(--f-mono); font-size: 12px; color: var(--ink-3); background: var(--surface-2); padding: 2px 7px; border-radius: 8px; font-weight: 500; }
.cf-outcome-title { font-size: 13px; font-weight: 600; color: var(--ink); margin-bottom: 3px; line-height: 1.3; }
.cf-outcome-hint { font-size: 11px; color: var(--ink-3); font-style: italic; line-height: 1.35; margin-bottom: 10px; }
.cf-outcome-bar-wrap { height: 6px; background: var(--line-2); border-radius: 3px; overflow: hidden; }
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
.cf-drill-prompt { display: flex; align-items: center; gap: 12px; padding: 18px 22px; margin-top: 20px; background: var(--surface-2); border: 1px dashed var(--line); border-radius: var(--radius); color: var(--ink-3); font-size: 12.5px; font-style: italic; }
.cf-drill-prompt-icon { font-size: 22px; color: var(--pool); font-style: normal; }
.cf-drill { margin-top: 24px; border: 2px solid var(--pool); border-radius: var(--radius-md); background: var(--surface); overflow: hidden; box-shadow: var(--sh-sm); }
.cf-drill-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 14px 20px; background: linear-gradient(180deg, rgba(0,154,199,.1), rgba(0,154,199,.02)); border-bottom: 1px solid var(--line); }
.cf-drill-eyebrow { font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--pool); font-weight: 700; }
.cf-drill-title { font-family: var(--f-display); font-size: 18px; font-weight: 700; color: var(--navy); margin-top: 3px; line-height: 1.2; }
.cf-drill-hint { font-size: 12px; color: var(--ink-2); margin-top: 4px; }
.cf-drill-actions { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
.cf-drill-empty { padding: 36px; text-align: center; color: var(--ink-3); font-size: 13px; font-style: italic; }
.rpt-export-btn-ghost { color: var(--ink-3); border-color: var(--line); }
.rpt-export-btn-ghost:hover { color: var(--red); border-color: var(--red); background: var(--surface); }

.rpt-toolbar-row { display: flex; justify-content: flex-end; margin-top: 22px; padding-top: 14px; border-top: 1px solid var(--line); }

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
`;
    document.head.appendChild(s);
  }

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
    console.log('[reports-view] v3 registered — visual dashboard + funnel cohort tracker');
  }

  waitForMain(init);
})();
