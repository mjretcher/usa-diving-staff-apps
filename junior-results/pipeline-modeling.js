/* ============================================================
   PIPELINE & MODELING — Junior Circuit dashboard
   Multi-year funnel analysis, year-over-year, financial overlay
   Sources: Neon (core.event_results) for ALL years 2021-2026
   ============================================================ */

(function(){
  'use strict';

  /* ── Entry fees (USA Diving Junior Circuit, 2021–2026) ────── */
  /* Source: Mike's Entry_Fees_2021-2026.xlsx                    */
  const ENTRY_FEES = {
    2021: { Regionals: 50, Zones: 50, EWC: 0,   Nationals: 75  },
    2022: { Regionals: 70, Zones: 80, EWC: 0,   Nationals: 65  },
    2023: { Regionals: 72, Zones: 82, EWC: 0,   Nationals: 65  },
    2024: { Regionals: 70, Zones: 80, EWC: 0,   Nationals: 65  },
    2025: { Regionals: 85, Zones: 85, EWC: 0,   Nationals: 115 },
    2026: { Regionals: 85, Zones: 90, EWC: 115, Nationals: 125 },
  };
  const JUDGE_FEE_2026 = 2;

  /* Stage order & display labels */
  const STAGE_ORDER = ['Regionals','Zones','EWC','Nationals'];
  const STAGE_LABELS = {
    Regionals: 'Regional Championships',
    Zones:     'Zone Championships',
    EWC:       'East / West / Central',
    Nationals: 'Junior National Championships',
  };
  const STAGE_SHORT = {
    Regionals:'Regionals', Zones:'Zones', EWC:'E/W/C', Nationals:'Nationals'
  };

  /* Brand colors (mirror design.css tokens, used in inline SVG) */
  const C = {
    blue:    '#171f69',
    blue700: '#1e2d8a',
    blue900: '#0d1040',
    red:     '#e31937',
    pool:    '#009ac7',
    sky:     '#8fc3ea',
    gray:    '#5f6062',
    amber:   '#d97706',
    green:   '#059669',
    line:    '#e2e5ef',
    ink2:    '#2d3a4a',
    ink3:    '#5a6a7e',
  };

  /* ── State ─────────────────────────────────────────────── */
  const pmState = {
    yearsAvailable: null,      // discovered from Neon
    selectedYear:   null,      // current year for funnel
    yoyYearsSet:    null,      // years included in YoY chart
    excludeAsterisked: false,  // hide platform@Regionals etc (default: show with *)
    excludeFutureChamps: true, // default exclude FC events
    showFinancials: false,     // financial overlay toggle
    funnelCache:    {},        // by year
    yoyCache:       null,
    futureChampMeets: null,    // discovered list
    loading: false,
    error:   null,
  };

  /* ── Neon helpers ──────────────────────────────────────── */
  async function neonQ(sql, params){
    if (!window.NEON || !window.NEON.query) {
      throw new Error('Neon client not loaded — check shared/neon-client.js and config.js');
    }
    return await window.NEON.query(sql, params || []);
  }

  /* Filter clause for Future Champions + asterisked rules.       *
   * Returns SQL fragment that goes inside WHERE. Includes leading * 
   * space if non-empty. Apply to a query on core.event_results.   */
  function buildFiltersSql(){
    const parts = [];
    if (pmState.excludeFutureChamps) {
      parts.push("(meet_name NOT ILIKE '%Future Champions%' AND event_name NOT ILIKE '%Future Champions%')");
    }
    if (pmState.excludeAsterisked) {
      // Asterisked = platform at Regionals (exhibition, all years)
      //            + age groups C & D at Regionals in 2026 only
      parts.push("NOT (stage = 'Regionals' AND discipline ILIKE '%platform%')");
      parts.push("NOT (stage = 'Regionals' AND year = 2026 AND age_group IN ('Group C','Group D'))");
    }
    return parts.length ? ' AND ' + parts.join(' AND ') : '';
  }

  /* Always-on filter: synchro events excluded from athlete counts *
   * (they double-count partners) but kept for entry counts.       */
  function whereJrCircuit(){
    return "is_junior_circuit AND year IS NOT NULL";
  }

  /* ── Discovery queries ─────────────────────────────────── */
  async function loadAvailableYears(){
    if (pmState.yearsAvailable !== null) return pmState.yearsAvailable;
    const r = await neonQ(
      "SELECT DISTINCT year FROM core.event_results WHERE " + whereJrCircuit() +
      " ORDER BY year DESC"
    );
    pmState.yearsAvailable = r.rows.map(x => Number(x.year)).filter(y => y);
    if (pmState.selectedYear === null && pmState.yearsAvailable.length) {
      pmState.selectedYear = pmState.yearsAvailable[0]; // newest
    }
    if (pmState.yoyYearsSet === null) {
      pmState.yoyYearsSet = new Set(pmState.yearsAvailable);
    }
    return pmState.yearsAvailable;
  }

  async function discoverFutureChampMeets(){
    if (pmState.futureChampMeets !== null) return pmState.futureChampMeets;
    try {
      const r = await neonQ(
        "SELECT DISTINCT year, meet_name FROM core.event_results " +
        "WHERE " + whereJrCircuit() + " AND (meet_name ILIKE '%Future Champions%' OR event_name ILIKE '%Future Champions%') " +
        "ORDER BY year DESC, meet_name"
      );
      pmState.futureChampMeets = r.rows;
    } catch (e) {
      pmState.futureChampMeets = [];
    }
    return pmState.futureChampMeets;
  }

  /* Per-year funnel data: unique athletes & event entries per stage. *
   * Also splits "asterisked" (non-qualifying) from clean counts.     */
  async function loadFunnelData(year){
    if (pmState.funnelCache[year]) return pmState.funnelCache[year];

    const fb = buildFiltersSql();

    // 1) Per-stage unique athletes + event entries
    const stagesSql =
      "SELECT stage, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS unique_athletes, " +
      "  COUNT(*)::int AS event_entries " +
      "FROM core.event_results " +
      "WHERE year = $1 AND " + whereJrCircuit() + fb + " " +
      "GROUP BY stage";
    const stagesR = await neonQ(stagesSql, [year]);

    // 2) Asterisked counts (always queried, regardless of toggle)
    const astSql =
      "SELECT stage, " +
      "  CASE " +
      "    WHEN stage = 'Regionals' AND discipline ILIKE '%platform%' THEN 'platform_at_regionals' " +
      "    WHEN stage = 'Regionals' AND year = 2026 AND age_group IN ('Group C','Group D') THEN 'group_cd_at_regionals_2026' " +
      "    ELSE 'other' END AS reason, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS unique_athletes, " +
      "  COUNT(*)::int AS event_entries " +
      "FROM core.event_results " +
      "WHERE year = $1 AND " + whereJrCircuit() +
      (pmState.excludeFutureChamps ? " AND (meet_name NOT ILIKE '%Future Champions%' AND event_name NOT ILIKE '%Future Champions%')" : '') + " " +
      "AND ((stage = 'Regionals' AND discipline ILIKE '%platform%') " +
      "  OR (stage = 'Regionals' AND year = 2026 AND age_group IN ('Group C','Group D'))) " +
      "GROUP BY stage, reason";
    const astR = await neonQ(astSql, [year]);

    // 3) Stage transitions: athletes who appear at both stage N and N+1
    //    (this gives us the "advanced" count for the funnel)
    const transSql =
      "WITH per_stage AS ( " +
      "  SELECT stage, diver_id_dm FROM core.event_results " +
      "  WHERE year = $1 AND " + whereJrCircuit() + fb + " " +
      "  GROUP BY stage, diver_id_dm " +
      ") " +
      "SELECT a.stage AS from_stage, b.stage AS to_stage, " +
      "  COUNT(DISTINCT a.diver_id_dm)::int AS advanced " +
      "FROM per_stage a JOIN per_stage b ON a.diver_id_dm = b.diver_id_dm " +
      "WHERE a.stage <> b.stage " +
      "GROUP BY a.stage, b.stage";
    const transR = await neonQ(transSql, [year]);

    const out = {
      year,
      stages: {},      // stage -> { unique_athletes, event_entries }
      asterisked: {},  // stage -> { reason: { unique_athletes, event_entries } }
      transitions: {}, // "from->to" -> advanced count
    };
    STAGE_ORDER.forEach(s => { out.stages[s] = { unique_athletes: 0, event_entries: 0 }; });
    stagesR.rows.forEach(r => {
      if (STAGE_ORDER.includes(r.stage)) {
        out.stages[r.stage] = {
          unique_athletes: Number(r.unique_athletes) || 0,
          event_entries:   Number(r.event_entries) || 0,
        };
      }
    });
    astR.rows.forEach(r => {
      if (!out.asterisked[r.stage]) out.asterisked[r.stage] = {};
      out.asterisked[r.stage][r.reason] = {
        unique_athletes: Number(r.unique_athletes) || 0,
        event_entries:   Number(r.event_entries) || 0,
      };
    });
    transR.rows.forEach(r => {
      out.transitions[r.from_stage + '->' + r.to_stage] = Number(r.advanced) || 0;
    });

    pmState.funnelCache[year] = out;
    return out;
  }

  /* Year-over-year aggregate: athletes & entries per stage per year */
  async function loadYoYData(){
    if (pmState.yoyCache) return pmState.yoyCache;
    const fb = buildFiltersSql();
    const sql =
      "SELECT year, stage, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS unique_athletes, " +
      "  COUNT(*)::int AS event_entries " +
      "FROM core.event_results " +
      "WHERE " + whereJrCircuit() + fb + " " +
      "GROUP BY year, stage " +
      "ORDER BY year, stage";
    const r = await neonQ(sql);
    pmState.yoyCache = r.rows.map(row => ({
      year: Number(row.year),
      stage: row.stage,
      unique_athletes: Number(row.unique_athletes) || 0,
      event_entries:   Number(row.event_entries) || 0,
    }));
    return pmState.yoyCache;
  }

  /* Per-athlete attendance pattern (how many stops each athlete attended) *
   * — used by financial overlay to compute "actual cost paid" distribution */
  async function loadAttendancePattern(year){
    const cacheKey = '__attendance__' + year;
    if (pmState.funnelCache[cacheKey]) return pmState.funnelCache[cacheKey];
    const fb = buildFiltersSql();
    const sql =
      "WITH per_athlete AS ( " +
      "  SELECT diver_id_dm, " +
      "    BOOL_OR(stage = 'Regionals') AS at_reg, " +
      "    BOOL_OR(stage = 'Zones')     AS at_zon, " +
      "    BOOL_OR(stage = 'EWC')       AS at_ewc, " +
      "    BOOL_OR(stage = 'Nationals') AS at_nat " +
      "  FROM core.event_results " +
      "  WHERE year = $1 AND " + whereJrCircuit() + fb + " " +
      "  GROUP BY diver_id_dm " +
      ") " +
      "SELECT at_reg, at_zon, at_ewc, at_nat, COUNT(*)::int AS n " +
      "FROM per_athlete " +
      "GROUP BY at_reg, at_zon, at_ewc, at_nat";
    const r = await neonQ(sql, [year]);
    pmState.funnelCache[cacheKey] = r.rows.map(x => ({
      at_reg: x.at_reg === true || x.at_reg === 't' || x.at_reg === 'true',
      at_zon: x.at_zon === true || x.at_zon === 't' || x.at_zon === 'true',
      at_ewc: x.at_ewc === true || x.at_ewc === 't' || x.at_ewc === 'true',
      at_nat: x.at_nat === true || x.at_nat === 't' || x.at_nat === 'true',
      n: Number(x.n) || 0,
    }));
    return pmState.funnelCache[cacheKey];
  }

  /* Clear caches when filter toggles change                            */
  function invalidateCache(){
    pmState.funnelCache = {};
    pmState.yoyCache = null;
  }

  /* ── Utility: format helpers ───────────────────────────── */
  function fmtNum(n){
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US');
  }
  function fmtMoney(n){
    if (n == null || isNaN(n)) return '—';
    return '$' + Math.round(Number(n)).toLocaleString('en-US');
  }
  function fmtMoneyExact(n){
    if (n == null || isNaN(n)) return '—';
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function pct(num, den){
    if (!den) return '—';
    return (num/den*100).toFixed(1) + '%';
  }
  function escapeHtml(s){
    return String(s || '').replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  /* Compute per-athlete cost distribution given attendance patterns */
  function computeCostDistribution(year, attendance){
    const fees = ENTRY_FEES[year] || {};
    const bands = new Map(); // costPaid -> { n, label }
    let totalAthletes = 0;
    let totalRevenue = 0;
    attendance.forEach(p => {
      let cost = 0;
      const stops = [];
      if (p.at_reg) { cost += (fees.Regionals || 0); stops.push('R'); }
      if (p.at_zon) { cost += (fees.Zones || 0); stops.push('Z'); }
      if (p.at_ewc) { cost += (fees.EWC || 0); stops.push('E'); }
      if (p.at_nat) { cost += (fees.Nationals || 0); stops.push('N'); }
      const label = stops.length ? stops.join(' → ') : '(none)';
      const key = label;
      if (!bands.has(key)) bands.set(key, { n: 0, cost: cost, label: label, stops: stops });
      bands.get(key).n += p.n;
      totalAthletes += p.n;
      totalRevenue += cost * p.n;
    });
    // Sort: ascending by number of stops, then by stage order
    const arr = Array.from(bands.values());
    arr.sort((a,b) => a.stops.length - b.stops.length || a.cost - b.cost);
    return { bands: arr, totalAthletes, totalRevenue };
  }

  /* ── Hero ─────────────────────────────────────────────── */
  function renderHero(){
    return (
      '<div class="pm-hero">' +
        '<div>' +
          '<div class="pm-hero-title">Pipeline &amp; Modeling</div>' +
          '<div class="pm-hero-sub">' +
            'Multi-year view of the USA Diving Junior Circuit — how athletes flow from Regionals through Zones, ' +
            'East/West/Central, and into the Junior National Championships. ' +
            'Toggle the financial overlay to see what families pay and what the meets generate in entry fees.' +
          '</div>' +
        '</div>' +
        '<div class="pm-hero-actions">' +
          '<button class="pm-hero-btn" id="pmPrintBtn" title="Open a print-ready report in a new window">' +
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
              '<path d="M4 1h6v3M3 4h8v6H3zM4 10v3h6v-3" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
            '</svg> Print / PDF Report' +
          '</button>' +
          '<button class="pm-hero-btn" id="pmRefreshBtn" title="Re-pull data from Neon">' +
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
              '<path d="M12 7a5 5 0 1 1-1.5-3.5M12 1v3.5H8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg> Refresh' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ── Controls bar ─────────────────────────────────────── */
  function renderControls(){
    const years = pmState.yearsAvailable || [];
    const currentYr = Math.max.apply(null, years.length ? years : [2026]);
    const yearPills = years.map(y => {
      const isActive = y === pmState.selectedYear;
      const isCurrent = y === currentYr;
      return '<button class="pm-year-pill ' + (isActive ? 'active' : '') + ' ' +
             (isCurrent ? 'current' : '') + '" data-pm-year="' + y + '">' + y + '</button>';
    }).join('');

    return (
      '<div class="pm-controls">' +
        '<div class="pm-ctl-group">' +
          '<span class="pm-ctl-label">Year</span>' +
          '<div class="pm-year-pills">' + yearPills + '</div>' +
        '</div>' +

        '<div class="pm-ctl-group">' +
          '<label class="pm-toggle">' +
            '<input type="checkbox" id="pmToggleAst" ' + (pmState.excludeAsterisked ? '' : 'checked') + '>' +
            '<span class="pm-toggle-switch"></span>' +
            '<span>Include non-qualifying entries<sup class="pm-asterisk">*</sup></span>' +
            '<span class="pm-toggle-help" title="When ON (default), platform results at Regionals and Group C/D Regionals entries in 2026 are included with an asterisk. Toggle OFF to remove them from all counts.">?</span>' +
          '</label>' +
        '</div>' +

        '<div class="pm-ctl-group">' +
          '<label class="pm-toggle">' +
            '<input type="checkbox" id="pmToggleFC" ' + (pmState.excludeFutureChamps ? 'checked' : '') + '>' +
            '<span class="pm-toggle-switch"></span>' +
            '<span>Exclude Future Champions events</span>' +
            '<span class="pm-toggle-help" title="Future Champions meets are developmental and per USA Diving policy do not count in Junior Circuit participation data. Default: ON (excluded).">?</span>' +
          '</label>' +
        '</div>' +

        '<div class="pm-ctl-group">' +
          '<label class="pm-toggle financial">' +
            '<input type="checkbox" id="pmToggleFin" ' + (pmState.showFinancials ? 'checked' : '') + '>' +
            '<span class="pm-toggle-switch"></span>' +
            '<span><strong>Show financial overlay</strong></span>' +
            '<span class="pm-toggle-help" title="Layers entry-fee data on every section: what families actually paid per athlete and what each meet collected in aggregate.">?</span>' +
          '</label>' +
        '</div>' +
      '</div>'
    );
  }

  /* ── SECTION 1: Funnel ─────────────────────────────────── */
  function renderFunnelSection(year, data){
    if (!data) {
      return sectionShell(1, 'Pipeline Funnel — ' + year,
        'How many unique athletes appear at each stage of the circuit, and how many advance from one stage to the next. The widest bar is the entry point; each band shows the count that actually competed at that level.',
        '<div class="pm-loading"><div class="pm-loading-spinner"></div><div class="pm-loading-text">Loading funnel data…</div></div>');
    }

    const stages = STAGE_ORDER.filter(s => data.stages[s].unique_athletes > 0 || s === 'Regionals' || s === 'Zones');
    if (!stages.length) {
      return sectionShell(1, 'Pipeline Funnel — ' + year,
        'How athletes flow from Regionals through to Junior Nationals for the selected year.',
        '<div class="pm-empty"><div class="pm-empty-title">No data available</div>' +
        '<div class="pm-empty-sub">No Junior Circuit results found in Neon for ' + year + '.</div></div>');
    }

    // KPI strip
    const totalAthletes = Math.max.apply(null, stages.map(s => data.stages[s].unique_athletes));
    const lastStage = stages[stages.length - 1];
    const lastCount = data.stages[lastStage].unique_athletes;
    const retentionPct = totalAthletes ? (lastCount/totalAthletes*100).toFixed(1) : '—';

    const totalEntries = stages.reduce((a, s) => a + data.stages[s].event_entries, 0);
    const fees = ENTRY_FEES[year] || {};
    const fullCircuitCost = stages.reduce((a, s) => a + (fees[s] || 0), 0);

    let kpiHtml = '<div class="pm-kpi-strip">';
    kpiHtml +=
      '<div class="pm-kpi">' +
        '<div class="pm-kpi-label">Total athletes (entry-point)</div>' +
        '<div class="pm-kpi-value">' + fmtNum(totalAthletes) + '</div>' +
        '<div class="pm-kpi-sub">unique divers at ' + STAGE_SHORT[stages[0]] + '</div>' +
      '</div>';
    kpiHtml +=
      '<div class="pm-kpi accent">' +
        '<div class="pm-kpi-label">Reached ' + STAGE_SHORT[lastStage] + '</div>' +
        '<div class="pm-kpi-value">' + fmtNum(lastCount) + '</div>' +
        '<div class="pm-kpi-sub">' + retentionPct + '% of entry-point athletes</div>' +
      '</div>';
    kpiHtml +=
      '<div class="pm-kpi pool">' +
        '<div class="pm-kpi-label">Total event entries</div>' +
        '<div class="pm-kpi-value">' + fmtNum(totalEntries) + '</div>' +
        '<div class="pm-kpi-sub">across all stages (events ≠ athletes)</div>' +
      '</div>';
    if (pmState.showFinancials) {
      kpiHtml +=
        '<div class="pm-kpi financial">' +
          '<div class="pm-kpi-label">Full-circuit cost</div>' +
          '<div class="pm-kpi-value">' + fmtMoney(fullCircuitCost) + '</div>' +
          '<div class="pm-kpi-sub">per athlete attending every stop</div>' +
        '</div>';
    }
    kpiHtml += '</div>';

    // Funnel SVG
    const W = 1100, H = 60 + stages.length * 90;
    const bandH = 60;
    const cx = W / 2;
    const maxAth = totalAthletes || 1;
    const minWidth = 180; // never narrower than this so labels fit

    let svg = '<svg class="pm-funnel-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';

    stages.forEach(function(s, i){
      const cnt = data.stages[s].unique_athletes;
      const entries = data.stages[s].event_entries;
      const yTop = 30 + i * 90;
      const widthRatio = Math.max(cnt / maxAth, minWidth / (W - 80));
      const bandW = Math.max(minWidth, (W - 80) * widthRatio);
      const x0 = cx - bandW/2;

      // Color: deeper blue at top, lighter pool toward the bottom
      const colors = [C.blue, C.blue700, C.pool, C.red];
      const fill = colors[i] || C.blue;

      // Band shape (slight trapezoid for funnel feel)
      const nextW = (i < stages.length - 1)
        ? Math.max(minWidth, (W - 80) * Math.max(data.stages[stages[i+1]].unique_athletes / maxAth, minWidth / (W - 80)))
        : bandW * 0.88;
      const nx0 = cx - nextW/2;

      // Trapezoid path
      svg += '<path d="M' + x0 + ' ' + yTop + ' L' + (x0+bandW) + ' ' + yTop +
             ' L' + (nx0 + nextW) + ' ' + (yTop + bandH) + ' L' + nx0 + ' ' + (yTop + bandH) + ' Z" ' +
             'fill="' + fill + '" stroke="' + C.blue900 + '" stroke-width="1.2" opacity="0.95"/>';

      // Stage label (left side)
      svg += '<text class="pm-funnel-stage-label" x="20" y="' + (yTop + 28) + '">' + escapeHtml(STAGE_LABELS[s]) + '</text>';
      svg += '<text class="pm-funnel-stage-sublabel" x="20" y="' + (yTop + 46) + '">$' + (fees[s] || 0) + ' entry fee' + (year === 2026 ? '' : '') + '</text>';

      // Athlete count (center of band)
      svg += '<text class="pm-funnel-band-count" x="' + cx + '" y="' + (yTop + 30) + '" text-anchor="middle">' +
             fmtNum(cnt) + ' athletes</text>';
      svg += '<text class="pm-funnel-band-label" x="' + cx + '" y="' + (yTop + 48) + '" text-anchor="middle">' +
             fmtNum(entries) + ' event entries</text>';

      // Financial overlay on the right
      if (pmState.showFinancials) {
        const revenue = cnt * (fees[s] || 0);
        svg += '<text class="pm-funnel-financial" x="' + (W - 20) + '" y="' + (yTop + 28) + '" text-anchor="end">' +
               fmtMoney(revenue) + ' collected</text>';
        svg += '<text class="pm-funnel-financial" x="' + (W - 20) + '" y="' + (yTop + 46) + '" text-anchor="end" style="font-size:10.5px;opacity:.8">' +
               cnt + ' × $' + (fees[s] || 0) + '</text>';
      }

      // Attrition note between bands (right side)
      if (i < stages.length - 1) {
        const nextCnt = data.stages[stages[i+1]].unique_athletes;
        const dropped = cnt - nextCnt;
        const arrowY = yTop + bandH + 12;
        if (dropped > 0) {
          svg += '<text class="pm-funnel-attrition" x="' + cx + '" y="' + (arrowY + 14) + '" text-anchor="middle">' +
                 '↓ ' + fmtNum(dropped) + ' did not advance (' + pct(dropped, cnt) + ')</text>';
        }
      }
    });

    svg += '</svg>';

    // Asterisk footnote if any
    let footnote = '';
    const astStages = Object.keys(data.asterisked || {});
    if (astStages.length && !pmState.excludeAsterisked) {
      const reasons = [];
      astStages.forEach(s => {
        Object.keys(data.asterisked[s]).forEach(reason => {
          const r = data.asterisked[s][reason];
          let txt = '';
          if (reason === 'platform_at_regionals') {
            txt = r.event_entries + ' platform entries at ' + s + ' (exhibition / non-qualifying)';
          } else if (reason === 'group_cd_at_regionals_2026') {
            txt = r.event_entries + ' Group C/D entries at Regionals (in 2026, C/D enter at Zones)';
          }
          if (txt) reasons.push(txt);
        });
      });
      if (reasons.length) {
        footnote =
          '<div class="pm-footnote">' +
            '<strong>*</strong> Counts above include ' + reasons.join('; ') +
            '. These are kept in view by default with this asterisk marker. ' +
            'Toggle "Include non-qualifying entries" off above to remove them entirely from all counts.' +
          '</div>';
      }
    }

    // Legend
    const legend =
      '<div class="pm-funnel-legend">' +
        '<span class="pm-legend-item"><span class="pm-legend-sw" style="background:' + C.blue + '"></span>Stage band height shows unique athlete count</span>' +
        '<span class="pm-legend-item"><span class="pm-legend-sw" style="background:' + C.ink3 + ';opacity:.4"></span>Drop-off arrows show athletes who did not advance</span>' +
        (pmState.showFinancials ? '<span class="pm-legend-item"><span class="pm-legend-sw" style="background:' + C.amber + '"></span>Aggregate entry-fee revenue collected per stage</span>' : '') +
      '</div>';

    return sectionShell(1, 'Pipeline Funnel — ' + year,
      'Each band shows how many unique athletes competed at that stage of the ' + year + ' Junior Circuit. The bar width is proportional to the count, so the narrowing visually shows attrition through the qualification pipeline. Hover toggles on the right to add financial detail.',
      kpiHtml + '<div class="pm-funnel-wrap">' + svg + legend + '</div>' + footnote);
  }

  /* ── SECTION 2: Year-over-Year ─────────────────────────── */
  function renderYoYSection(rows){
    if (!rows) {
      return sectionShell(2, 'Year-Over-Year Comparison',
        'How participation has changed across 2021–2026. Useful for the "is the circuit growing or shrinking?" conversation.',
        '<div class="pm-loading"><div class="pm-loading-spinner"></div><div class="pm-loading-text">Loading multi-year data…</div></div>');
    }
    if (!rows.length) {
      return sectionShell(2, 'Year-Over-Year Comparison',
        'How participation has changed across 2021–2026.',
        '<div class="pm-empty"><div class="pm-empty-title">No multi-year data found</div></div>');
    }

    // Pivot data
    const allYears = Array.from(new Set(rows.map(r => r.year))).sort();
    const byYearStage = {};
    rows.forEach(r => {
      byYearStage[r.year] = byYearStage[r.year] || {};
      byYearStage[r.year][r.stage] = r;
    });

    // KPI strip — overall trend
    const yearTotals = allYears.map(y => {
      const stagesObj = byYearStage[y] || {};
      const ath = Math.max.apply(null, STAGE_ORDER.map(s => (stagesObj[s] && stagesObj[s].unique_athletes) || 0).concat([0]));
      const entries = STAGE_ORDER.reduce((a, s) => a + ((stagesObj[s] && stagesObj[s].event_entries) || 0), 0);
      const fees = ENTRY_FEES[y] || {};
      // Aggregate revenue: sum across stages of athletes_at_stage * fee_at_stage
      const revenue = STAGE_ORDER.reduce((a, s) => a + (((stagesObj[s] && stagesObj[s].unique_athletes) || 0) * (fees[s] || 0)), 0);
      return { year: y, athletes: ath, entries, revenue };
    });

    const first = yearTotals[0];
    const last = yearTotals[yearTotals.length - 1];
    const athChange = last.athletes - first.athletes;
    const athChangePct = first.athletes ? (athChange / first.athletes * 100).toFixed(1) : '—';

    let kpiHtml = '<div class="pm-kpi-strip">';
    kpiHtml +=
      '<div class="pm-kpi">' +
        '<div class="pm-kpi-label">Years in view</div>' +
        '<div class="pm-kpi-value">' + allYears.length + '</div>' +
        '<div class="pm-kpi-sub">' + first.year + ' – ' + last.year + '</div>' +
      '</div>';
    kpiHtml +=
      '<div class="pm-kpi accent">' +
        '<div class="pm-kpi-label">' + first.year + ' entry-point</div>' +
        '<div class="pm-kpi-value">' + fmtNum(first.athletes) + '</div>' +
        '<div class="pm-kpi-sub">athletes at first stage</div>' +
      '</div>';
    kpiHtml +=
      '<div class="pm-kpi pool">' +
        '<div class="pm-kpi-label">' + last.year + ' entry-point</div>' +
        '<div class="pm-kpi-value">' + fmtNum(last.athletes) + '</div>' +
        '<div class="pm-kpi-sub">' + (athChange >= 0 ? '+' : '') + athChangePct + '% vs ' + first.year + '</div>' +
      '</div>';
    if (pmState.showFinancials) {
      kpiHtml +=
        '<div class="pm-kpi financial">' +
          '<div class="pm-kpi-label">' + last.year + ' aggregate entry-fee revenue</div>' +
          '<div class="pm-kpi-value">' + fmtMoney(last.revenue) + '</div>' +
          '<div class="pm-kpi-sub">across all junior stages</div>' +
        '</div>';
    }
    kpiHtml += '</div>';

    // Chart 1: stacked bars (athletes per stage per year)
    const chart1 = renderYoYStackedChart(allYears, byYearStage, 'unique_athletes', 'Unique athletes per stage, by year');

    // Chart 2: total entries trend line (or stacked: event_entries)
    const chart2 = pmState.showFinancials
      ? renderYoYRevenueChart(yearTotals)
      : renderYoYStackedChart(allYears, byYearStage, 'event_entries', 'Total event entries per stage, by year');

    return sectionShell(2, 'Year-Over-Year Comparison',
      'How participation and revenue have moved across ' + first.year + '–' + last.year + '. The left chart shows unique athletes per stage; the right chart shows total event entries — these tell different stories because one athlete typically enters multiple events.' +
      (pmState.showFinancials ? ' With the financial overlay on, the right chart switches to aggregate entry-fee revenue per year.' : ''),
      kpiHtml +
      '<div class="pm-yoy-grid">' +
        '<div class="pm-yoy-chart">' +
          '<div class="pm-yoy-chart-title">' + chart1.title + '</div>' +
          '<div class="pm-yoy-chart-sub">' + chart1.sub + '</div>' +
          chart1.svg +
        '</div>' +
        '<div class="pm-yoy-chart">' +
          '<div class="pm-yoy-chart-title">' + chart2.title + '</div>' +
          '<div class="pm-yoy-chart-sub">' + chart2.sub + '</div>' +
          chart2.svg +
        '</div>' +
      '</div>'
    );
  }

  /* Build a stacked-bar chart: years × stages */
  function renderYoYStackedChart(years, byYearStage, metric, title){
    const W = 540, H = 320;
    const padL = 50, padR = 14, padT = 14, padB = 50;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    // Compute totals
    const totals = years.map(y => {
      const s = byYearStage[y] || {};
      return STAGE_ORDER.reduce((a, st) => a + ((s[st] && s[st][metric]) || 0), 0);
    });
    const maxT = Math.max.apply(null, totals.concat([1]));
    // Round up for nicer axis
    const niceMax = niceCeiling(maxT);

    const stageColors = { Regionals: C.blue, Zones: C.blue700, EWC: C.pool, Nationals: C.red };

    const barW = innerW / years.length * 0.62;
    const gap = innerW / years.length;

    let svg = '<svg class="pm-yoy-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';

    // Gridlines & y-axis
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const yv = niceMax * i / ticks;
      const yp = padT + innerH - (yv / niceMax) * innerH;
      svg += '<line class="pm-grid-line" x1="' + padL + '" y1="' + yp + '" x2="' + (padL + innerW) + '" y2="' + yp + '"/>';
      svg += '<text class="pm-axis-tick" x="' + (padL - 6) + '" y="' + (yp + 3) + '" text-anchor="end">' + fmtNum(Math.round(yv)) + '</text>';
    }
    svg += '<line class="pm-axis-line" x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + innerH) + '"/>';
    svg += '<line class="pm-axis-line" x1="' + padL + '" y1="' + (padT + innerH) + '" x2="' + (padL + innerW) + '" y2="' + (padT + innerH) + '"/>';

    // Bars
    years.forEach(function(y, i){
      const cx = padL + gap * i + gap/2;
      const x0 = cx - barW/2;
      const stages = byYearStage[y] || {};
      let yCursor = padT + innerH;
      STAGE_ORDER.forEach(function(st){
        const v = (stages[st] && stages[st][metric]) || 0;
        if (v <= 0) return;
        const h = (v / niceMax) * innerH;
        const yTop = yCursor - h;
        svg += '<rect class="pm-bar-rect" x="' + x0 + '" y="' + yTop + '" width="' + barW + '" height="' + h + '" ' +
               'fill="' + stageColors[st] + '" opacity="0.92"><title>' + y + ' ' + STAGE_LABELS[st] + ': ' + fmtNum(v) + '</title></rect>';
        yCursor = yTop;
      });
      // Year label
      svg += '<text class="pm-bar-year" x="' + cx + '" y="' + (padT + innerH + 18) + '" text-anchor="middle">' + y + '</text>';
      // Total label on top
      const tot = totals[i];
      const totY = padT + innerH - (tot / niceMax) * innerH - 4;
      svg += '<text class="pm-bar-value" x="' + cx + '" y="' + totY + '" text-anchor="middle">' + fmtNum(tot) + '</text>';
    });

    // Legend
    let lx = padL;
    const ly = H - 14;
    STAGE_ORDER.forEach(function(st){
      svg += '<rect x="' + lx + '" y="' + (ly - 8) + '" width="10" height="10" fill="' + stageColors[st] + '"/>';
      svg += '<text class="pm-bar-label" x="' + (lx + 14) + '" y="' + ly + '">' + STAGE_SHORT[st] + '</text>';
      lx += 90;
    });

    svg += '</svg>';

    return {
      title: title,
      sub: metric === 'unique_athletes'
        ? 'Each bar segment is the number of distinct athletes who competed at that stage.'
        : 'Total entries — one athlete can enter multiple events (e.g., 1m + 3m + synchro).',
      svg: svg,
    };
  }

  /* Revenue chart: line of aggregate per-meet entry fee revenue */
  function renderYoYRevenueChart(yearTotals){
    const W = 540, H = 320;
    const padL = 60, padR = 14, padT = 14, padB = 50;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const maxR = Math.max.apply(null, yearTotals.map(y => y.revenue).concat([1]));
    const niceMax = niceCeiling(maxR);
    const ticks = 5;

    let svg = '<svg class="pm-yoy-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';

    for (let i = 0; i <= ticks; i++) {
      const yv = niceMax * i / ticks;
      const yp = padT + innerH - (yv / niceMax) * innerH;
      svg += '<line class="pm-grid-line" x1="' + padL + '" y1="' + yp + '" x2="' + (padL + innerW) + '" y2="' + yp + '"/>';
      svg += '<text class="pm-axis-tick" x="' + (padL - 6) + '" y="' + (yp + 3) + '" text-anchor="end">' + fmtMoney(yv) + '</text>';
    }
    svg += '<line class="pm-axis-line" x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + innerH) + '"/>';
    svg += '<line class="pm-axis-line" x1="' + padL + '" y1="' + (padT + innerH) + '" x2="' + (padL + innerW) + '" y2="' + (padT + innerH) + '"/>';

    const gap = innerW / Math.max(yearTotals.length - 1, 1);

    // Area under line
    let pts = yearTotals.map((y, i) => {
      const x = padL + gap * i;
      const yp = padT + innerH - (y.revenue / niceMax) * innerH;
      return x + ',' + yp;
    });
    // Build area path
    const areaPath = 'M' + (padL) + ',' + (padT + innerH) + ' L' +
                     pts.join(' L') + ' L' + (padL + gap * (yearTotals.length-1)) + ',' + (padT + innerH) + ' Z';
    svg += '<path d="' + areaPath + '" fill="' + C.amber + '" opacity="0.18"/>';

    // Line
    svg += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + C.amber + '" stroke-width="2.5"/>';

    // Points & labels
    yearTotals.forEach(function(y, i){
      const x = padL + gap * i;
      const yp = padT + innerH - (y.revenue / niceMax) * innerH;
      svg += '<circle cx="' + x + '" cy="' + yp + '" r="5" fill="' + C.amber + '" stroke="#fff" stroke-width="2"/>';
      svg += '<text class="pm-bar-value" x="' + x + '" y="' + (yp - 10) + '" text-anchor="middle" fill="' + C.amber + '">' + fmtMoney(y.revenue) + '</text>';
      svg += '<text class="pm-bar-year" x="' + x + '" y="' + (padT + innerH + 18) + '" text-anchor="middle">' + y.year + '</text>';
    });

    svg += '</svg>';

    return {
      title: 'Aggregate entry-fee revenue, by year',
      sub: 'Sum of (athletes-at-stage × entry-fee-at-stage) for all stages. Estimates revenue collected from athlete entries; does not include judge fees or other revenue.',
      svg: svg,
    };
  }

  /* ── SECTION 3: Financial detail (full breakdown) ──────── */
  async function renderFinancialSection(year, funnelData){
    const fees = ENTRY_FEES[year] || {};
    const attendance = await loadAttendancePattern(year);
    const dist = computeCostDistribution(year, attendance);

    // Build fees table covering all years for reference
    const allFeeYears = Object.keys(ENTRY_FEES).map(Number).sort();
    let feeTable =
      '<table class="pm-fee-table">' +
        '<thead><tr><th>Meet</th>' +
          allFeeYears.map(y => '<th>' + y + (y === year ? ' ◄' : '') + '</th>').join('') +
        '</tr></thead>' +
        '<tbody>';
    STAGE_ORDER.forEach(s => {
      feeTable += '<tr><td>' + STAGE_LABELS[s] + '</td>' +
        allFeeYears.map(y => {
          const f = ENTRY_FEES[y][s];
          const isNew = (s === 'EWC' && y === 2026);
          return '<td class="' + (isNew ? 'new-2026' : '') + '">' + (f ? '$' + f : '—') + '</td>';
        }).join('') +
        '</tr>';
    });
    // Totals row
    feeTable += '<tr class="total-row"><td>Full-circuit total</td>' +
      allFeeYears.map(y => {
        const total = STAGE_ORDER.reduce((a, s) => a + (ENTRY_FEES[y][s] || 0), 0);
        return '<td>' + fmtMoney(total) + '</td>';
      }).join('') + '</tr>';
    feeTable += '</tbody></table>';

    // Cost histogram — bands of "what families actually paid"
    let hist = '<div class="pm-fin-cost-hist">';
    hist += '<div style="font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--brand-blue); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px;">' +
            'What families actually paid — ' + year + '</div>';
    hist += '<div style="font-size: 11.5px; color: var(--ink-3); margin-bottom: 14px;">' +
            'Each row is a cohort of athletes grouped by which meets they actually attended. ' +
            'Most athletes only paid the entry fee for the meets they competed in, not the full circuit.</div>';

    const maxBand = Math.max.apply(null, dist.bands.map(b => b.n).concat([1]));
    dist.bands.forEach(b => {
      const widthPct = (b.n / maxBand * 100).toFixed(1);
      const isFull = b.stops.length === STAGE_ORDER.length;
      hist += '<div class="pm-fin-hist-bar' + (isFull ? ' full' : '') + '">' +
        '<div class="pm-fin-hist-label">' + escapeHtml(b.label || '(none)') + '<br>' +
          '<span style="font-size: 10.5px; color: var(--ink-4);">' + fmtMoney(b.cost) + ' / athlete</span>' +
        '</div>' +
        '<div class="pm-fin-hist-bar-track">' +
          '<div class="pm-fin-hist-bar-fill" style="width: ' + widthPct + '%"></div>' +
        '</div>' +
        '<div class="pm-fin-hist-count">' + fmtNum(b.n) + '</div>' +
      '</div>';
    });

    // Summary
    const avgCost = dist.totalAthletes ? dist.totalRevenue / dist.totalAthletes : 0;
    hist += '<div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">' +
      '<div><div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-3); font-weight: 700;">Avg per athlete</div>' +
        '<div style="font-family: var(--font-display); font-size: 22px; font-weight: 800; color: var(--brand-blue);">' + fmtMoney(avgCost) + '</div></div>' +
      '<div><div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-3); font-weight: 700;">Full-circuit cost (reference)</div>' +
        '<div style="font-family: var(--font-display); font-size: 22px; font-weight: 800; color: var(--brand-red);">' +
          fmtMoney(STAGE_ORDER.reduce((a, s) => a + (fees[s] || 0), 0)) + '</div></div>' +
      '<div><div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-3); font-weight: 700;">Total entry-fee revenue</div>' +
        '<div style="font-family: var(--font-display); font-size: 22px; font-weight: 800; color: ' + C.amber + ';">' + fmtMoney(dist.totalRevenue) + '</div></div>' +
    '</div>';
    hist += '</div>';

    const body =
      '<div style="margin-bottom: 18px;">' +
        '<div style="font-family: var(--font-display); font-size: 14px; font-weight: 700; color: var(--brand-blue); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px;">' +
          'Entry-fee history — all years' +
        '</div>' +
        '<div style="font-size: 12px; color: var(--ink-3); margin-bottom: 10px;">' +
          'Per-meet entry fees by year. The highlighted column is the year shown above. ' +
          'The E/W/C row is a new meet added to the circuit in 2026.' +
        '</div>' +
      '</div>' +
      feeTable + hist;

    return sectionShell(3, 'Financial Breakdown — ' + year,
      'What families paid and what the NGB collected in entry fees. The headline number ' +
      'people often quote is the "full-circuit cost" — what one athlete would pay to compete at every meet — ' +
      'but most athletes only paid for the meets they actually qualified into. This section shows both.',
      body, true /* financial styling */);
  }

  /* ── Helper: niceCeiling ───────────────────────────────── */
  function niceCeiling(n){
    if (n <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(n)));
    const f = n / exp;
    let nf;
    if (f <= 1) nf = 1;
    else if (f <= 2) nf = 2;
    else if (f <= 2.5) nf = 2.5;
    else if (f <= 5) nf = 5;
    else nf = 10;
    return nf * exp;
  }

  /* ── Section shell ─────────────────────────────────────── */
  function sectionShell(num, title, explainer, bodyHtml, financialStyle){
    return (
      '<section class="pm-section' + (financialStyle ? ' pm-fin-section' : '') + '">' +
        '<div class="pm-section-head">' +
          '<div class="pm-section-title">' +
            '<span class="pm-section-num">' + num + '</span>' +
            escapeHtml(title) +
          '</div>' +
          '<div class="pm-section-explainer">' + explainer + '</div>' +
        '</div>' +
        '<div class="pm-section-body">' + bodyHtml + '</div>' +
      '</section>'
    );
  }

  /* ── Wire up event handlers ────────────────────────────── */
  function bindHandlers(){
    // Year pills
    document.querySelectorAll('[data-pm-year]').forEach(el => {
      el.addEventListener('click', function(){
        const y = Number(this.getAttribute('data-pm-year'));
        if (y && y !== pmState.selectedYear) {
          pmState.selectedYear = y;
          renderPipeline();
        }
      });
    });
    // Asterisked toggle (note inverted: checked = include = excludeAsterisked=false)
    const tAst = document.getElementById('pmToggleAst');
    if (tAst) tAst.addEventListener('change', function(){
      pmState.excludeAsterisked = !this.checked;
      invalidateCache();
      renderPipeline();
    });
    // Future Champions toggle
    const tFC = document.getElementById('pmToggleFC');
    if (tFC) tFC.addEventListener('change', function(){
      pmState.excludeFutureChamps = this.checked;
      invalidateCache();
      renderPipeline();
    });
    // Financial overlay toggle (no cache invalidation — it's pure rendering)
    const tFin = document.getElementById('pmToggleFin');
    if (tFin) tFin.addEventListener('change', function(){
      pmState.showFinancials = this.checked;
      renderPipeline();
    });
    // Print
    const pb = document.getElementById('pmPrintBtn');
    if (pb) pb.addEventListener('click', openPrintReport);
    // Refresh
    const rb = document.getElementById('pmRefreshBtn');
    if (rb) rb.addEventListener('click', function(){
      invalidateCache();
      pmState.yearsAvailable = null;
      renderPipeline();
    });
  }

  /* ── Print-ready report (separate window) ──────────────── */
  function openPrintReport(){
    const root = document.getElementById('stageContent');
    if (!root) return;
    const node = root.querySelector('.pm-root');
    if (!node) return;
    const w = window.open('', '_blank', 'width=1200,height=900');
    if (!w) return alert('Pop-up blocked — please allow pop-ups to generate the report.');
    const year = pmState.selectedYear;
    const title = 'USA Diving Junior Circuit — Pipeline &amp; Modeling Report (' + year + ')';
    w.document.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>USA Diving Junior Circuit ' + year + ' Report</title>' +
      '<link rel="stylesheet" href="' + location.origin + '/usa-diving-staff-apps/shared/design.css">' +
      '<link rel="stylesheet" href="' + location.origin + '/usa-diving-staff-apps/junior-results/pipeline-modeling.css">' +
      '<style>body{background:#fff;padding:0;margin:0}.pm-hero-actions,.pm-controls{display:none !important}' +
      '.print-header{padding:16px 24px;border-bottom:3px solid #171f69;display:flex;justify-content:space-between;align-items:end;margin-bottom:12px}' +
      '.print-header-title{font-family:Barlow Condensed,sans-serif;font-weight:800;font-size:24px;color:#171f69;text-transform:uppercase}' +
      '.print-header-sub{font-size:12px;color:#5a6a7e;margin-top:4px}' +
      '.print-meta{font-size:11px;color:#5a6a7e;text-align:right}' +
      '@media print{.print-noprint{display:none}}' +
      '</style></head><body>' +
      '<div class="print-header">' +
        '<div><div class="print-header-title">Pipeline &amp; Modeling — ' + year + ' Junior Circuit</div>' +
        '<div class="print-header-sub">USA Diving Staff Platform · Generated ' + new Date().toLocaleString() + '</div></div>' +
        '<div class="print-meta">USA Diving — National Governing Body<br>For internal staff review</div>' +
      '</div>' +
      node.outerHTML +
      '<div class="print-noprint" style="position:fixed;bottom:18px;right:18px">' +
        '<button onclick="window.print()" style="background:#171f69;color:#fff;border:none;padding:10px 18px;border-radius:6px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif">Print this page</button>' +
      '</div>' +
      '</body></html>'
    );
    w.document.title = 'USA Diving Junior Circuit ' + year + ' Report';
    w.document.close();
  }

  /* ── Top-level render ──────────────────────────────────── */
  async function renderPipeline(){
    const root = document.getElementById('stageContent');
    if (!root) return;
    // Clear KPI row & other stage UI (since we own the entire content)
    const kpi = document.getElementById('kpiRow');
    if (kpi) kpi.innerHTML = '';

    // First-load: show shell with spinner
    root.innerHTML =
      '<div class="pm-root">' +
        renderHero() +
        '<div class="pm-loading"><div class="pm-loading-spinner"></div>' +
        '<div class="pm-loading-text">Loading from Neon…</div>' +
        '<div class="pm-loading-sub">Pulling Junior Circuit data, 2021–2026</div></div>' +
      '</div>';

    try {
      // Make sure years are loaded
      await loadAvailableYears();
      if (!pmState.yearsAvailable.length) {
        root.innerHTML =
          '<div class="pm-root">' + renderHero() +
            '<div class="pm-error"><strong>No data available.</strong> Neon returned no Junior Circuit results. ' +
            'Check that data has been ingested and the <code>is_junior_circuit</code> flag is set on rows in <code>core.event_results</code>.</div>' +
          '</div>';
        return;
      }

      // Load all needed data in parallel
      const [funnel, yoy] = await Promise.all([
        loadFunnelData(pmState.selectedYear),
        loadYoYData(),
      ]);

      // Render skeleton with controls
      root.innerHTML =
        '<div class="pm-root">' +
          renderHero() +
          renderControls() +
          renderFunnelSection(pmState.selectedYear, funnel) +
          renderYoYSection(yoy) +
          '<div id="pmFinSlot"></div>' +
        '</div>';

      // Financial section (async — needs attendance pattern)
      if (pmState.showFinancials) {
        try {
          const finHtml = await renderFinancialSection(pmState.selectedYear, funnel);
          const slot = document.getElementById('pmFinSlot');
          if (slot) slot.outerHTML = finHtml;
        } catch (e) {
          const slot = document.getElementById('pmFinSlot');
          if (slot) slot.innerHTML = '<div class="pm-error"><strong>Could not load financial detail:</strong> ' + escapeHtml(e.message) + '</div>';
        }
      }

      bindHandlers();
    } catch (e) {
      console.error('[pipeline-modeling]', e);
      root.innerHTML =
        '<div class="pm-root">' + renderHero() +
          '<div class="pm-error"><strong>Could not load data from Neon.</strong> ' + escapeHtml(e.message || String(e)) +
          '<br><br>Try the Refresh button. If the problem persists, check that the Neon connection ' +
          'is configured in <code>data/config.js</code>.</div>' +
        '</div>';
    }
  }

  /* ── Public hook ───────────────────────────────────────── */
  window._pmRender = renderPipeline;

  /* ── Auto-init: if Pipeline stage is selected on page load ─ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeAutoRender);
  } else {
    setTimeout(maybeAutoRender, 50);
  }
  function maybeAutoRender(){
    // If main.js has already set the stage to Pipeline, render
    if (window.state && window.state.stage === 'Pipeline') {
      renderPipeline();
    }
  }

})();
