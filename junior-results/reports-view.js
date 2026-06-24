/* ================================================================
   reports-view.js
   Analytics and reporting for the Junior Circuit staff app.
   Three panels: Participation Flow, Displacement Report, Special Status.
   Reads from effectiveResults (post-recompute) and USAD_EWC_DATA.
   ================================================================ */
(function () {
  'use strict';

  /* ── helpers ─────────────────────────────────────────────────── */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function $(id) { return document.getElementById(id); }
  function norm(v) { return String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function pct(n, d) { return d ? Math.round(100 * n / d) + '%' : '—'; }
  function fmtScore(v) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(2) : '—'; }

  const EWC = window.USAD_EWC_DATA || null;
  const NAT = window.USAD_JO_NAT_QUALIFIERS || null;

  /* Groups C/D skip Regionals — this is the rule */
  const GROUPS_REQUIRING_REGIONALS = new Set(['Group A', 'Group B']);
  const GROUPS_DIRECT_TO_ZONES     = new Set(['Group C', 'Group D']);

  /* ── Data access ─────────────────────────────────────────────── */
  function allResults() {
    return typeof effectiveResults !== 'undefined' ? effectiveResults
      : (window.JUNIOR_RESULTS_DATA?.results || []);
  }

  /* ── Filter state (shared with main app filters) ─────────────── */
  const rptState = {
    ageGroup:   '',
    gender:     '',
    discipline: '',
    zone:       '',
    ewcGroup:   '',
    team:       '',
    panel:      'flow',  // 'flow' | 'displacement' | 'status'
  };

  /* ── Build participation flow data ──────────────────────────── */
  function buildFlowData() {
    const results = allResults();
    const synth = new Set(['synthetic_from_oqz']);

    // Apply current filters
    function matches(r) {
      if (rptState.ageGroup   && r.ageGroup   !== rptState.ageGroup)   return false;
      if (rptState.gender     && r.gender     !== rptState.gender)     return false;
      if (rptState.discipline && r.discipline !== rptState.discipline) return false;
      if (rptState.zone       && r.zone       !== rptState.zone)       return false;
      if (rptState.team       && r.team       !== rptState.team)       return false;
      return true;
    }

    const reg = results.filter(r => r.stage === 'Regionals' && matches(r));
    const zon = results.filter(r => r.stage === 'Zones' && !synth.has(r.sourceRow) && matches(r));
    const zon_synt = results.filter(r => r.stage === 'Zones' && synth.has(r.sourceRow) && matches(r));

    // Regional stats — only for A/B
    const reg_ab = reg.filter(r => GROUPS_REQUIRING_REGIONALS.has(r.ageGroup));
    const reg_ab_athletes = new Set(reg_ab.map(r => r.athlete.toLowerCase()));
    const reg_ab_qual_athletes = new Set(reg_ab.filter(r => r.advancesToZone).map(r => r.athlete.toLowerCase()));

    // Zone stats
    const zon_athletes = new Set(zon.map(r => r.athlete.toLowerCase()));
    const zon_qual_athletes = new Set(zon.filter(r => r.advancesToNationals || r.advancesToEWC).map(r => r.athlete.toLowerCase()));
    const zon_nat_athletes  = new Set(zon.filter(r => r.advancesToNationals).map(r => r.athlete.toLowerCase()));
    const zon_ewc_athletes  = new Set(zon.filter(r => r.advancesToEWC && !r.advancesToNationals).map(r => r.athlete.toLowerCase()));

    // No-shows: A/B athletes who qualified from regionals but don't appear in zone results
    // Exclude those in the OQZ-sourced synthetic rows (they DID compete, just data gap)
    const oqz = window.JUNIOR_RESULTS_DATA?.officialZoneQualifiers || [];
    const oqz_names = new Set(oqz.map(q => q.athlete.toLowerCase()));
    const noshows_ab = [...reg_ab_qual_athletes].filter(n =>
      !zon_athletes.has(n) && !oqz_names.has(n)
    );

    // Group C/D entered directly at zones — no regionals
    const zon_cd = zon.filter(r => GROUPS_DIRECT_TO_ZONES.has(r.ageGroup));
    const zon_cd_athletes = new Set(zon_cd.map(r => r.athlete.toLowerCase()));

    // EWC registered (from USAD_EWC_DATA)
    const ewcEntryNames = new Set((EWC?.entries || []).map(e => norm(e.name)));
    const ewcGroupFilter = rptState.ewcGroup;
    const ewcRegAthletes = ewcGroupFilter
      ? new Set((EWC?.entries || []).filter(e => e.meet === ewcGroupFilter).map(e => norm(e.name)))
      : ewcEntryNames;

    // JO Nationals
    const natAthletes = new Set((NAT?.qualifiers || []).map(q => norm(q.name)));

    // No-shows: Zone EWC qualifiers not registered at EWC
    const zon_ewc_noshows = [...zon_ewc_athletes].filter(n => !ewcEntryNames.has(n));
    const zon_nat_noshows = [...zon_nat_athletes].filter(n => !natAthletes.has(n) && !n.includes('synthetic'));

    return {
      regionals: {
        total:     reg.length,
        athletes:  reg_ab_athletes.size,
        qualifying: reg_ab_qual_athletes.size,
        noshows:   noshows_ab.length,
        noshowPct: pct(noshows_ab.length, reg_ab_qual_athletes.size),
        noshowList: noshows_ab,
      },
      zones: {
        total:       zon.length + zon_synt.length,
        athletes:    zon_athletes.size,
        cdDirect:    zon_cd_athletes.size,
        qualifying:  zon_qual_athletes.size,
        toNationals: zon_nat_athletes.size,
        toEWC:       zon_ewc_athletes.size,
        ewcNoshows:  zon_ewc_noshows.length,
        natNoshows:  zon_nat_noshows.length,
      },
      ewc: {
        registered:  ewcRegAthletes.size,
        totalEntries:(EWC?.totalEntries || 0),
      },
      nationals: {
        qualified: natAthletes.size,
      },
    };
  }

  /* ── Build displacement data ─────────────────────────────────── */
  function buildDisplacementData() {
    const results = allResults();

    function matches(r) {
      if (rptState.ageGroup   && r.ageGroup   !== rptState.ageGroup)   return false;
      if (rptState.gender     && r.gender     !== rptState.gender)     return false;
      if (rptState.discipline && r.discipline !== rptState.discipline) return false;
      if (rptState.zone       && r.zone       !== rptState.zone)       return false;
      return true;
    }

    // All non-displacing qualifying athletes across all stages
    const ndRows = results.filter(r =>
      r.nonDisplacing && r.qualifyingEvent && matches(r) && !r.statusOnly
    );

    // Displacement events: events where a bump-in or spot shift occurred
    const bumpRows   = results.filter(r => r.bumpIn && matches(r));
    const shiftRows  = results.filter(r => r.spotShifted && matches(r));
    const openedRows = results.filter(r => r.openedSpot && matches(r));

    // Categorize ND athletes
    const byCategory = {};
    ndRows.forEach(r => {
      const cat = r.foreignDeclared || r.webpointNonUsEffective ? 'Foreign'
                : r.dualOtherCountry ? 'Dual (affects results)'
                : r.dualDeclared ? 'Dual citizen'
                : r.hps ? 'HPS'
                : r.ymca ? 'YMCA'
                : 'Other non-displacing';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(r);
    });

    // Per-athlete summary
    const byAthlete = new Map();
    ndRows.forEach(r => {
      const key = r.athlete;
      if (!byAthlete.has(key)) {
        byAthlete.set(key, {
          athlete: r.athlete,
          diveMeetsId: r.diveMeetsId,
          team: r.team,
          category: Object.keys(byCategory).find(c => byCategory[c].some(x => x.athlete === r.athlete)) || 'Other',
          stages: new Set(),
          zones: new Set(),
          events: [],
          openedSpots: 0,
        });
      }
      const a = byAthlete.get(key);
      a.stages.add(r.stage);
      if (r.zone) a.zones.add(r.zone);
      if (!a.events.some(e => e.eventKey === r.eventKey && e.stage === r.stage)) {
        a.events.push({
          stage: r.stage, zone: r.zone || '', ewc: r.ewc || '',
          eventKey: r.eventKey, place: r.place, score: r.score,
          openedSpot: r.openedSpot, openedFor: r.openedFor || [],
          qualificationStatus: r.qualificationStatus,
        });
      }
      if (r.openedSpot) a.openedSpots++;
    });

    return {
      ndAthletes: [...byAthlete.values()],
      byCategory,
      bumpRows,
      shiftRows,
      openedRows,
      totalNDEntries: ndRows.length,
      totalBumpIns:   bumpRows.length,
      totalSpotShifts: shiftRows.length,
    };
  }

  /* ── Build special status data ───────────────────────────────── */
  function buildStatusData() {
    const results = allResults();
    const foreign = results.filter(r => (r.foreignDeclared || r.webpointNonUsEffective) && !r.statusOnly);
    const dual    = results.filter(r => r.dualDeclared && !r.statusOnly);
    const dualOC  = results.filter(r => r.dualOtherCountry && !r.statusOnly);
    const hps     = results.filter(r => r.hps && !r.statusOnly);
    const ymca    = results.filter(r => r.ymca && !r.statusOnly);
    const petitions = results.filter(r => r.petition && !r.statusOnly);
    const keptInv = results.filter(r => r.keptInvitedJoNationals && !r.statusOnly);
    const review  = results.filter(r => r.reviewFlags?.length && !r.statusOnly);

    // Unique athletes per category
    const uniq = arr => new Set(arr.map(r => r.athlete));

    return {
      foreign:    { athletes: uniq(foreign).size, entries: foreign.length, rows: foreign },
      dual:       { athletes: uniq(dual).size,    entries: dual.length,    rows: dual },
      dualOC:     { athletes: uniq(dualOC).size,  entries: dualOC.length,  rows: dualOC },
      hps:        { athletes: (EWC?.hpsAthletes?.length || uniq(hps).size), entries: hps.length, rows: hps },
      ymca:       { athletes: uniq(ymca).size,    entries: ymca.length,    rows: ymca },
      petitions:  { athletes: uniq(petitions).size, entries: petitions.length, rows: petitions },
      keptInv:    { athletes: uniq(keptInv).size,  entries: keptInv.length,  rows: keptInv },
      review:     { athletes: uniq(review).size,  entries: review.length,  rows: review },
      ewcForeign: EWC?.foreignAthletes || [],
      ewcDual:    EWC?.dualCitizens    || [],
      hpsList:    EWC?.hpsAthletes     || [],
    };
  }

  /* ── Render ──────────────────────────────────────────────────── */
  function renderReports() {
    const wrap = $('tableWrap');
    const ctx  = $('resultsContext');
    const eventList = $('eventList');
    if (!wrap) return;

    // Sidebar: filter controls + panel switcher
    if (eventList) renderReportSidebar(eventList);

    // Context bar
    if (ctx) ctx.innerHTML = `
      <div class="context-title-block">
        <strong>Analytics &amp; Reports</strong>
        <span>Circuit participation, displacement, and special status summaries</span>
      </div>`;

    // Panel
    if (rptState.panel === 'flow')         renderFlowPanel(wrap);
    else if (rptState.panel === 'displacement') renderDisplacementPanel(wrap);
    else if (rptState.panel === 'status')  renderStatusPanel(wrap);
  }

  function renderReportSidebar(el) {
    const results = allResults();
    const ageGroups  = [...new Set(results.map(r => r.ageGroup).filter(Boolean))].sort();
    const genders    = [...new Set(results.map(r => r.gender).filter(Boolean))].sort();
    const disciplines= [...new Set(results.map(r => r.discipline).filter(Boolean))].sort();
    const zones      = [...new Set(results.map(r => r.zone).filter(Boolean))].sort();
    const teams      = [...new Set(results.map(r => r.team).filter(Boolean))].sort();

    function sel(key, options, label, allLabel) {
      return `<div class="filter-field">
        <span class="filter-label">${esc(label)}</span>
        <select onchange="window._rptFilter('${key}',this.value)">
          <option value="">${esc(allLabel)}</option>
          ${options.map(o=>`<option value="${esc(o)}" ${rptState[key]===o?'selected':''}>${esc(o)}</option>`).join('')}
        </select>
      </div>`;
    }

    el.innerHTML = `
      <div style="padding:8px 10px 4px">
        <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-tertiary);margin-bottom:8px">Report view</div>
        <button class="rpt-panel-btn ${rptState.panel==='flow'?'active':''}" onclick="window._rptPanel('flow')">
          <i class="ti ti-chart-bar" aria-hidden="true"></i> Participation flow
        </button>
        <button class="rpt-panel-btn ${rptState.panel==='displacement'?'active':''}" onclick="window._rptPanel('displacement')">
          <i class="ti ti-arrows-exchange" aria-hidden="true"></i> Displacements
        </button>
        <button class="rpt-panel-btn ${rptState.panel==='status'?'active':''}" onclick="window._rptPanel('status')">
          <i class="ti ti-shield-check" aria-hidden="true"></i> Special status
        </button>
      </div>
      <div style="padding:0 10px 8px;border-top:0.5px solid var(--color-border-tertiary);margin-top:8px">
        <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-tertiary);margin:10px 0 6px">Filters</div>
        ${sel('ageGroup',   ageGroups,   'Age group',  'All groups')}
        ${sel('gender',     genders,     'Gender',     'All genders')}
        ${sel('discipline', disciplines, 'Board',      'All boards')}
        ${sel('zone',       zones,       'Zone',       'All zones')}
        ${sel('team',       teams,       'Team',       'All teams')}
        <button class="rpt-clear-btn" onclick="window._rptClear()">Clear filters</button>
      </div>`;
  }

  window._rptFilter = function(key, val) {
    rptState[key] = val;
    renderReports();
  };
  window._rptPanel = function(panel) {
    rptState.panel = panel;
    renderReports();
  };
  window._rptClear = function() {
    Object.assign(rptState, { ageGroup:'', gender:'', discipline:'', zone:'', ewcGroup:'', team:'' });
    renderReports();
  };

  /* ── Flow panel ──────────────────────────────────────────────── */
  function renderFlowPanel(wrap) {
    const d = buildFlowData();
    const hasFilters = rptState.ageGroup || rptState.gender || rptState.discipline || rptState.zone || rptState.team;

    const filterNote = hasFilters
      ? `<div class="rpt-filter-note">Filtered view active — counts reflect current filter selection.</div>`
      : '';

    wrap.innerHTML = `${filterNote}
    <div class="rpt-section">
      <div class="rpt-section-title">Circuit participation flow
        <button class="rpt-export-btn" onclick="window._rptExportFlow()">Download CSV</button>
      </div>

      <div class="rpt-funnel">
        ${funnelStage('Region Championships', [
          {label:'Entries (Group A/B only)', val: d.regionals.total, note:'Groups C/D enter directly at Zones'},
          {label:'Unique athletes', val: d.regionals.athletes},
          {label:'Qualified to Zones', val: d.regionals.qualifying, accent:'green'},
          {label:'Qualified but did not compete at Zones', val: d.regionals.noshows, accent: d.regionals.noshows > 0 ? 'amber' : '', note: d.regionals.noshows > 0 ? `${d.regionals.noshowPct} of qualifiers` : ''},
        ], 'R')}

        <div class="funnel-arrow"><i class="ti ti-arrow-down" aria-hidden="true"></i></div>

        ${funnelStage('Zone Championships', [
          {label:'Total entries', val: d.zones.total},
          {label:'Unique athletes', val: d.zones.athletes},
          {label:'Groups C/D (entered directly)', val: d.zones.cdDirect, note:'No regional requirement'},
          {label:'→ Junior Nationals direct', val: d.zones.toNationals, accent:'green'},
          {label:'→ East/West/Central', val: d.zones.toEWC, accent:'blue'},
        ], 'Z')}

        <div class="funnel-arrow"><i class="ti ti-arrow-down" aria-hidden="true"></i></div>

        ${funnelStage('East / West / Central', [
          {label:'Registered athletes', val: d.ewc.registered, accent:'blue'},
          {label:'Total event entries (prelims)', val: d.ewc.totalEntries || '—'},
          {label:'Zone qualifiers who did not register', val: d.zones.ewcNoshows, accent: d.zones.ewcNoshows > 0 ? 'amber' : ''},
        ], 'E')}

        <div class="funnel-arrow"><i class="ti ti-arrow-down" aria-hidden="true"></i></div>

        ${funnelStage('Junior Nationals', [
          {label:'Qualified athletes (official list)', val: d.nationals.qualified, accent:'green'},
          {label:'Qualifiers from Zone direct', val: d.zones.toNationals, note:'Top 3 per zone event'},
          {label:'Qualifiers from E/W/C', val: 'Pending', note:'Results this weekend'},
          {label:'HPS pre-qualified', val: EWC?.hpsAthletes?.length || 33, note:'Prelim pre-qual, non-displacing'},
        ], 'N')}
      </div>

      ${d.regionals.noshowList.length > 0 ? `
      <div class="rpt-subsection">
        <div class="rpt-subsection-title">
          Group A/B athletes who qualified from Regionals but did not compete at Zones
          <span class="rpt-badge">${d.regionals.noshowList.length}</span>
        </div>
        <div class="rpt-note">These 3 athletes qualified via the top-15 path at Regionals but have no zone result and do not appear on the official zone qualifier list. Likely withdrew or did not attend.</div>
        ${buildNoshowTable(d.regionals.noshowList)}
      </div>` : ''}
    </div>`;
  }

  function funnelStage(title, stats, icon) {
    return `<div class="funnel-stage">
      <div class="funnel-stage-header">
        <span class="funnel-icon">${esc(icon)}</span>
        <span class="funnel-title">${esc(title)}</span>
      </div>
      <div class="funnel-stats">
        ${stats.map(s => `
          <div class="funnel-stat ${s.accent ? 'fs-'+s.accent : ''}">
            <span class="fs-val">${typeof s.val === 'number' ? s.val.toLocaleString() : esc(String(s.val))}</span>
            <span class="fs-lbl">${esc(s.label)}</span>
            ${s.note ? `<span class="fs-note">${esc(s.note)}</span>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
  }

  function buildNoshowTable(noshowNames) {
    const results = allResults();
    const rows = noshowNames.map(name => {
      const regRows = results.filter(r => r.stage === 'Regionals' && r.athlete.toLowerCase() === name);
      const r = regRows[0];
      if (!r) return '';
      return `<tr>
        <td>${esc(r.athlete)}</td>
        <td>${esc(r.team || '—')}</td>
        <td>${esc(r.ageGroup || '')} ${esc(r.gender || '')}</td>
        <td>Region ${esc(String(r.region || '?'))}</td>
        <td>Zone ${esc(r.zone || '?')}</td>
        <td>${esc([...new Set(regRows.map(x => x.eventKey))].join(', '))}</td>
        <td><span class="qvb qvb-dna">Did not compete</span></td>
      </tr>`;
    });
    return `<table class="rpt-table">
      <thead><tr><th>Athlete</th><th>Team</th><th>Group</th><th>Region</th><th>Zone</th><th>Events qualified</th><th>Status</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
  }

  window._rptExportFlow = function() {
    const d = buildFlowData();
    const lines = [
      'Stage,Metric,Value',
      `Regionals,Total entries (Group A/B),${d.regionals.total}`,
      `Regionals,Unique athletes,${d.regionals.athletes}`,
      `Regionals,Qualified to Zones,${d.regionals.qualifying}`,
      `Regionals,Qualified but did not compete at Zones,${d.regionals.noshows}`,
      `Zones,Total entries,${d.zones.total}`,
      `Zones,Unique athletes,${d.zones.athletes}`,
      `Zones,Groups C/D (direct entry),${d.zones.cdDirect}`,
      `Zones,→ Junior Nationals direct,${d.zones.toNationals}`,
      `Zones,→ East/West/Central,${d.zones.toEWC}`,
      `E/W/C,Registered athletes,${d.ewc.registered}`,
      `E/W/C,Total event entries,${d.ewc.totalEntries}`,
      `Nationals,Qualified athletes,${d.nationals.qualified}`,
    ];
    downloadCSV(lines.join('\n'), 'participation-flow.csv');
  };

  /* ── Displacement panel ──────────────────────────────────────── */
  function renderDisplacementPanel(wrap) {
    const d = buildDisplacementData();

    // Summary cards
    const catSummary = Object.entries(d.byCategory).map(([cat, rows]) => {
      const athletes = new Set(rows.map(r => r.athlete)).size;
      const events   = new Set(rows.map(r => r.eventId)).size;
      const stages   = new Set(rows.map(r => r.stage));
      return `<div class="rpt-summary-card">
        <div class="rsc-count">${athletes}</div>
        <div class="rsc-label">${esc(cat)}</div>
        <div class="rsc-sub">${rows.length} entries · ${events} events · ${[...stages].join(', ')}</div>
      </div>`;
    }).join('');

    // Per-athlete table
    const athRows = d.ndAthletes
      .sort((a,b) => a.category.localeCompare(b.category) || a.athlete.localeCompare(b.athlete))
      .map(a => {
        const stageStr = [...a.stages].join(', ');
        const zoneStr  = [...a.zones].join(', ');
        const dm = a.diveMeetsId ? `<a class="dm-ext-link" href="https://www.divemeets.com/profile.php?id=${esc(a.diveMeetsId)}" target="_blank" rel="noopener"><i class="ti ti-external-link" aria-hidden="true"></i>${esc(a.diveMeetsId)}</a>` : '—';
        const eventList = a.events.map(e =>
          `<div style="font-size:11px;color:var(--color-text-secondary)">${esc(e.stage)} ${e.zone?'Z'+e.zone:''}: ${esc(e.eventKey)} — ${esc(e.place||'?')} (${esc(String(e.score||''))})</div>`
        ).join('');
        const catCls = a.category.includes('Foreign') ? 'qvb-foreign'
                     : a.category.includes('Dual') ? 'qvb-dual'
                     : a.category.includes('HPS') ? 'qvb-hps'
                     : a.category.includes('YMCA') ? 'qvb-ymca' : 'qvb-nd';
        return `<tr>
          <td><div class="ath-name">${esc(a.athlete)}</div></td>
          <td>${dm}</td>
          <td class="team-col">${esc(a.team || '—')}</td>
          <td><span class="qvb ${catCls}">${esc(a.category)}</span></td>
          <td>${esc(zoneStr || '—')}</td>
          <td>${esc(stageStr)}</td>
          <td>${eventList}</td>
          <td class="mono">${a.openedSpots > 0 ? `<span style="color:#0a8f55">${a.openedSpots} spot${a.openedSpots>1?'s':''} opened</span>` : '—'}</td>
        </tr>`;
      }).join('');

    const bumpSection = d.bumpRows.length ? `
      <div class="rpt-subsection">
        <div class="rpt-subsection-title">Athletes bumped into qualifying positions <span class="rpt-badge">${d.bumpRows.length}</span></div>
        <table class="rpt-table">
          <thead><tr><th>Athlete</th><th>Team</th><th>Stage</th><th>Event</th><th>Place</th><th>Elig. rank</th><th>Bumped by</th></tr></thead>
          <tbody>${d.bumpRows.map(r => `<tr>
            <td class="ath-name">${esc(r.athlete)}</td>
            <td class="team-col">${esc(r.team||'')}</td>
            <td>${esc(r.stage)}</td>
            <td>${esc(r.eventKey||'')}</td>
            <td class="mono">${esc(r.place||'')}</td>
            <td class="mono">${esc(String(r.eligibleRank||r.countingRank||''))}</td>
            <td style="font-size:11px">${(r.bumpedBy||[]).map(b=>esc(b.athlete)).join(', ')||'—'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>` : '';

    wrap.innerHTML = `
    <div class="rpt-section">
      <div class="rpt-section-title">Non-displacing athletes &amp; displacement events
        <button class="rpt-export-btn" onclick="window._rptExportDisplacement()">Download CSV</button>
      </div>
      <div class="rpt-note">Non-displacing athletes compete but do not consume a qualifying spot. The next eligible US athlete moves up in their place.</div>

      <div class="rpt-summary-row">${catSummary}</div>

      <div class="rpt-subsection">
        <div class="rpt-subsection-title">All non-displacing athletes <span class="rpt-badge">${d.ndAthletes.length}</span></div>
        <table class="rpt-table">
          <thead><tr><th>Athlete</th><th>DiveMeets</th><th>Team</th><th>Category</th><th>Zone(s)</th><th>Stage(s)</th><th>Events &amp; results</th><th>Impact</th></tr></thead>
          <tbody>${athRows || '<tr><td colspan="8" style="text-align:center;color:var(--color-text-tertiary)">No non-displacing athletes match current filters</td></tr>'}</tbody>
        </table>
      </div>
      ${bumpSection}
    </div>`;
  }

  window._rptExportDisplacement = function() {
    const d = buildDisplacementData();
    const lines = ['Athlete,DiveMeetsID,Team,Category,Zones,Stages,Events,SpotsOpened'];
    d.ndAthletes.forEach(a => {
      lines.push([
        a.athlete, a.diveMeetsId||'', a.team||'', a.category,
        [...a.zones].join('; '), [...a.stages].join('; '),
        a.events.map(e=>`${e.stage} ${e.eventKey} #${e.place}`).join('; '),
        a.openedSpots,
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    });
    downloadCSV(lines.join('\n'), 'displacement-report.csv');
  };

  /* ── Status panel ────────────────────────────────────────────── */
  function renderStatusPanel(wrap) {
    const d = buildStatusData();

    function statusSection(title, data, note, cls) {
      if (!data.athletes && !data.rows.length) return '';
      const dmId = r => r.diveMeetsId ? `<a class="dm-ext-link" href="https://www.divemeets.com/profile.php?id=${esc(r.diveMeetsId)}" target="_blank" rel="noopener"><i class="ti ti-external-link" aria-hidden="true"></i>${esc(r.diveMeetsId)}</a>` : '—';

      // Unique athletes
      const athletes = [...new Map(data.rows.map(r => [r.athlete, r])).values()];
      const rows = athletes.sort((a,b) => a.athlete.localeCompare(b.athlete)).map(r => {
        const stageRows = data.rows.filter(x => x.athlete === r.athlete);
        const stages = [...new Set(stageRows.map(x => x.stage))].join(', ');
        const zones  = [...new Set(stageRows.map(x => x.zone).filter(Boolean))].join(', ');
        const events = [...new Set(stageRows.map(x => x.eventKey).filter(Boolean))].join('; ');
        return `<tr>
          <td class="ath-name">${esc(r.athlete)}</td>
          <td>${dmId(r)}</td>
          <td class="team-col">${esc(r.team||'—')}</td>
          <td>${esc(stages)}</td>
          <td>${esc(zones||'—')}</td>
          <td style="font-size:11px">${esc(events)}</td>
        </tr>`;
      }).join('');

      return `<div class="rpt-subsection">
        <div class="rpt-subsection-title">${esc(title)} <span class="rpt-badge">${data.athletes}</span>
          ${note?`<span class="rpt-badge-note">${esc(note)}</span>`:''}
        </div>
        <table class="rpt-table">
          <thead><tr><th>Athlete</th><th>DiveMeets</th><th>Team</th><th>Stage(s)</th><th>Zone(s)</th><th>Events</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:var(--color-text-tertiary)">None</td></tr>'}</tbody>
        </table>
      </div>`;
    }

    // HPS from EWC data (not from results, since they don't compete at EWC)
    const hpsSection = `<div class="rpt-subsection">
      <div class="rpt-subsection-title">HPS Tier 3 Junior squad <span class="rpt-badge">${d.hpsList.length}</span>
        <span class="rpt-badge-note">Pre-qualified to JO Nationals prelims · not competing at E/W/C</span>
      </div>
      <table class="rpt-table">
        <thead><tr><th>Athlete</th><th>Gender</th><th>Age group</th><th>Status</th></tr></thead>
        <tbody>${d.hpsList.map(h => `<tr>
          <td class="ath-name">${esc(h.name)}</td>
          <td>${h.gender === 'F' ? 'Girls' : 'Boys'}</td>
          <td>${esc(h.ageGroup)}</td>
          <td><span class="qvb qvb-hps">Pre-qualified Nationals prelims</span></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;

    // Foreign athletes at EWC (from EWC data)
    const ewcForeignSection = d.ewcForeign.length ? `<div class="rpt-subsection">
      <div class="rpt-subsection-title">Foreign athletes registered at E/W/C <span class="rpt-badge">${d.ewcForeign.length}</span>
        <span class="rpt-badge-note">Non-displacing — compete but do not take qualifying spots</span>
      </div>
      <table class="rpt-table">
        <thead><tr><th>Athlete</th><th>Meet</th><th>Group</th><th>Gender</th><th>Events</th></tr></thead>
        <tbody>${d.ewcForeign.map(f => `<tr>
          <td class="ath-name">${esc(f.name)}</td>
          <td><span class="qvb qvb-ewc">${esc(f.meet)}</span></td>
          <td>${esc(f.group)}</td>
          <td>${esc(f.gender)}</td>
          <td style="font-size:11px">${f.events.join(', ')}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : '';

    // Dual citizens at EWC
    const dualSection = d.ewcDual.length ? `<div class="rpt-subsection">
      <div class="rpt-subsection-title">Dual citizens (dualOtherCountry) <span class="rpt-badge">${d.ewcDual.length}</span>
        <span class="rpt-badge-note">Competed for another federation — affects qualification</span>
      </div>
      <table class="rpt-table">
        <thead><tr><th>Athlete</th><th>Gender</th><th>Federation represented</th><th>Events/dates</th><th>Status</th></tr></thead>
        <tbody>${d.ewcDual.map(dc => {
          const inNat = (NAT?.qualifiers||[]).some(q => norm(q.name) === norm(dc.name));
          return `<tr>
            <td class="ath-name">${esc(dc.name)}</td>
            <td>${esc(dc.gender)}</td>
            <td><strong>${esc(dc.federationRepresented)}</strong></td>
            <td style="font-size:11px">${esc((dc.events||'').slice(0,80))}${(dc.events||'').length>80?'…':''}</td>
            <td>${inNat
              ? '<span class="qvb qvb-nat">Kept invited — JO Nationals</span>'
              : '<span class="qvb qvb-nd">Non-displacing · replacement invited</span>'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>` : '';

    wrap.innerHTML = `
    <div class="rpt-section">
      <div class="rpt-section-title">Special status athletes
        <button class="rpt-export-btn" onclick="window._rptExportStatus()">Download CSV</button>
      </div>
      ${ewcForeignSection}
      ${dualSection}
      ${hpsSection}
      ${statusSection('YMCA event champions', d.ymca, 'Pre-qualified to E/W/C prelims · non-displacing')}
      ${d.petitions.athletes ? statusSection('Medical petition — approved', d.petitions, 'Approved by CCE/staff') : ''}
      ${d.keptInv.athletes ? statusSection('Kept invited (dual/policy)', d.keptInv, 'Invited to JO Nationals despite dual status per USA Diving policy') : ''}
      ${d.review.athletes ? statusSection('Flagged for review', d.review, 'Staff attention needed') : ''}
    </div>`;
  }

  window._rptExportStatus = function() {
    const d = buildStatusData();
    const lines = ['Category,Athlete,DiveMeetsID,Team,Stage,Zone,Event'];
    const cats = [
      ['Foreign', d.foreign.rows],
      ['Dual (affects results)', d.dualOC.rows],
      ['HPS', d.hps.rows],
      ['YMCA', d.ymca.rows],
      ['Petition', d.petitions.rows],
      ['Kept invited', d.keptInv.rows],
      ['Review', d.review.rows],
    ];
    cats.forEach(([cat, rows]) => {
      rows.forEach(r => {
        lines.push([cat, r.athlete, r.diveMeetsId||'', r.team||'', r.stage, r.zone||'', r.eventKey||'']
          .map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
      });
    });
    downloadCSV(lines.join('\n'), 'special-status-report.csv');
  };

  /* ── CSV download helper ─────────────────────────────────────── */
  function downloadCSV(text, filename) {
    const blob = new Blob([text], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  }

  /* ── CSS ─────────────────────────────────────────────────────── */
  function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
.rpt-panel-btn{display:flex;align-items:center;gap:6px;width:100%;padding:7px 10px;text-align:left;font-size:12px;border:0.5px solid transparent;border-radius:var(--border-radius-md);cursor:pointer;background:transparent;color:var(--color-text-secondary);margin-bottom:3px}
.rpt-panel-btn:hover{background:var(--color-background-secondary)}
.rpt-panel-btn.active{background:var(--color-background-secondary);color:var(--color-text-primary);font-weight:500;border-color:var(--color-border-tertiary)}
.rpt-panel-btn i{font-size:14px;flex-shrink:0}
.rpt-clear-btn{width:100%;margin-top:8px;padding:6px;font-size:11px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);color:var(--color-text-secondary);cursor:pointer}
.rpt-section{padding:16px}
.rpt-section-title{font-size:15px;font-weight:500;color:var(--color-text-primary);margin-bottom:12px;display:flex;align-items:center;gap:10px}
.rpt-subsection{margin-top:20px}
.rpt-subsection-title{font-size:12px;font-weight:500;color:var(--color-text-primary);margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rpt-badge{background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:10px;padding:2px 8px;font-size:11px;color:var(--color-text-secondary)}
.rpt-badge-note{font-size:11px;color:var(--color-text-tertiary);font-weight:400}
.rpt-note{font-size:12px;color:var(--color-text-secondary);background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:8px 12px;margin-bottom:12px;line-height:1.5}
.rpt-filter-note{font-size:11px;color:#b26a00;background:#FAEEDA;border-radius:var(--border-radius-md);padding:6px 12px;margin:8px 16px 0}
.rpt-export-btn{padding:4px 10px;font-size:11px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);color:var(--color-text-secondary);cursor:pointer;margin-left:auto}
.rpt-export-btn:hover{background:var(--color-background-primary)}
/* Funnel */
.rpt-funnel{display:flex;flex-direction:column;gap:0;margin-bottom:16px}
.funnel-stage{border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);background:var(--color-background-primary);padding:14px 16px}
.funnel-stage-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.funnel-icon{width:28px;height:28px;border-radius:50%;background:#0d1040;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.funnel-title{font-size:14px;font-weight:500;color:var(--color-text-primary)}
.funnel-stats{display:flex;flex-wrap:wrap;gap:8px}
.funnel-stat{flex:1;min-width:160px;background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:8px 12px}
.funnel-stat.fs-green .fs-val{color:#0a8f55}
.funnel-stat.fs-blue .fs-val{color:#185FA5}
.funnel-stat.fs-amber .fs-val{color:#b26a00}
.funnel-stat.fs-red .fs-val{color:#c0392b}
.fs-val{display:block;font-size:20px;font-weight:500;font-family:var(--font-mono);color:var(--color-text-primary)}
.fs-lbl{display:block;font-size:11px;color:var(--color-text-secondary);margin-top:2px}
.fs-note{display:block;font-size:10px;color:var(--color-text-tertiary);margin-top:2px}
.funnel-arrow{text-align:center;padding:6px 0;color:var(--color-text-tertiary);font-size:20px}
/* Summary cards */
.rpt-summary-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.rpt-summary-card{flex:1;min-width:140px;border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);background:var(--color-background-primary);padding:10px 14px}
.rsc-count{font-size:24px;font-weight:500;color:var(--color-text-primary);font-family:var(--font-mono)}
.rsc-label{font-size:12px;font-weight:500;color:var(--color-text-primary);margin-top:2px}
.rsc-sub{font-size:11px;color:var(--color-text-secondary);margin-top:2px}
/* Table */
.rpt-table{width:100%;border-collapse:collapse;font-size:12px}
.rpt-table th{background:var(--color-background-secondary);padding:6px 10px;text-align:left;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-secondary);border-bottom:0.5px solid var(--color-border-tertiary);white-space:nowrap;position:sticky;top:0}
.rpt-table td{padding:7px 10px;border-bottom:0.5px solid var(--color-border-tertiary);vertical-align:middle}
.rpt-table tr:last-child td{border-bottom:none}
.rpt-table tr:hover td{background:var(--color-background-secondary)}
`;
    document.head.appendChild(s);
  }

  /* ── Hook into main.js stage system ─────────────────────────── */
  function waitForMain(cb, tries) {
    tries = tries || 0;
    if (typeof renderAll === 'function' && typeof state !== 'undefined') cb();
    else if (tries < 100) setTimeout(() => waitForMain(cb, tries + 1), 50);
  }

  function patchMain() {
    injectCSS();
    window._qvRenderReports = renderReports;
    console.log('[reports-view] registered');
  }

  waitForMain(patchMain);
})();
