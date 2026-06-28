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
    // Master filters — apply to ALL data pulls
    filters: {
      age_group: '',           // '' = all
      gender:    '',
      discipline:'',
      zone:      '',
      region:    '',
    },
    // Cohort progression state — scoped to that section
    cohortStartStage: 'Regionals',  // starting point of the traced cohort
    cohortShowFinals: true,         // expose Nationals Prelim/Final split
    filterOptions: null,       // distinct values discovered from Neon
    funnelCache:    {},        // by year+filters key
    yoyCache:       null,      // by filters key
    demoCache:      {},        // by year+filters key
    cohortCache:    {},        // by year+startStage+filters key
    retentionCache: null,      // by filters key
    futureChampMeets: null,    // discovered list
    loading: false,
    error:   null,
  };

  // Cache-key helper: any change to filters/toggles invalidates per-year caches
  function cacheKey(year){
    const f = pmState.filters;
    return [
      year || 'all',
      pmState.excludeAsterisked ? 'noast' : 'wast',
      pmState.excludeFutureChamps ? 'nofc' : 'wfc',
      f.age_group || '*', f.gender || '*', f.discipline || '*',
      f.zone || '*', f.region || '*'
    ].join('|');
  }

  /* ── Neon helpers ──────────────────────────────────────── */
  async function neonQ(sql, params){
    if (!window.NEON || !window.NEON.query) {
      throw new Error('Neon client not loaded — check shared/neon-client.js and config.js');
    }
    return await window.NEON.query(sql, params || []);
  }

  /* Filter clause for Future Champions + asterisked rules + master filters. *
   * Returns SQL fragment that goes inside WHERE. Includes leading space if  *
   * non-empty. Apply to any query on core.event_results.                    *
   * NOTE: master filter values are bound via $N params (caller appends them). *
   * Caller passes startIdx and gets back { sql, params } so it can correctly  *
   * sequence parameter numbers.                                              */
  function buildFiltersSql(startIdx){
    if (startIdx == null) startIdx = 1;
    const parts = [];
    const params = [];
    let p = startIdx;

    if (pmState.excludeFutureChamps) {
      parts.push("(meet_name NOT ILIKE '%Future Champions%' AND event_name NOT ILIKE '%Future Champions%')");
    }
    if (pmState.excludeAsterisked) {
      // Asterisked = platform at Regionals (exhibition, all years)
      //            + age groups C & D at Regionals in 2026 only
      parts.push("NOT (stage = 'Regionals' AND discipline ILIKE '%platform%')");
      parts.push("NOT (stage = 'Regionals' AND year = 2026 AND age_group IN ('Group C','Group D'))");
    }
    // Master filters
    const f = pmState.filters;
    if (f.age_group)  { parts.push('age_group = $' + p);  params.push(f.age_group);  p++; }
    if (f.gender)     { parts.push('gender = $' + p);     params.push(f.gender);     p++; }
    if (f.discipline) { parts.push('discipline = $' + p); params.push(f.discipline); p++; }
    if (f.zone)       { parts.push('zone = $' + p);       params.push(f.zone);       p++; }
    if (f.region)     { parts.push('region = $' + p);     params.push(String(f.region)); p++; }

    return {
      sql: parts.length ? ' AND ' + parts.join(' AND ') : '',
      params: params,
      nextIdx: p,
    };
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
    const ck = cacheKey(year);
    if (pmState.funnelCache[ck]) return pmState.funnelCache[ck];

    // $1 = year, then $2..$N for any active master filter values
    const fb = buildFiltersSql(2);

    // 1) Per-stage unique athletes + event entries
    const stagesSql =
      "SELECT stage, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS unique_athletes, " +
      "  COUNT(*)::int AS event_entries " +
      "FROM core.event_results " +
      "WHERE year = $1 AND " + whereJrCircuit() + fb.sql + " " +
      "GROUP BY stage";
    const stagesR = await neonQ(stagesSql, [year].concat(fb.params));

    // 2) Asterisked counts — always queried so we can show "X were marked
    //    non-qualifying" footnote. Master filters apply so the count lines
    //    up with the filtered view. Future-Champions filter applies per toggle.
    const astFb = { sql: '', params: [] };
    let astParamIdx = 2;
    const f2 = pmState.filters;
    if (pmState.excludeFutureChamps) astFb.sql += " AND (meet_name NOT ILIKE '%Future Champions%' AND event_name NOT ILIKE '%Future Champions%')";
    if (f2.age_group)  { astFb.sql += " AND age_group = $" + astParamIdx;  astFb.params.push(f2.age_group);  astParamIdx++; }
    if (f2.gender)     { astFb.sql += " AND gender = $" + astParamIdx;     astFb.params.push(f2.gender);     astParamIdx++; }
    if (f2.discipline) { astFb.sql += " AND discipline = $" + astParamIdx; astFb.params.push(f2.discipline); astParamIdx++; }
    if (f2.zone)       { astFb.sql += " AND zone = $" + astParamIdx;       astFb.params.push(f2.zone);       astParamIdx++; }
    const astSql =
      "SELECT stage, " +
      "  CASE " +
      "    WHEN stage = 'Regionals' AND discipline ILIKE '%platform%' THEN 'platform_at_regionals' " +
      "    WHEN stage = 'Regionals' AND year = 2026 AND age_group IN ('Group C','Group D') THEN 'group_cd_at_regionals_2026' " +
      "    ELSE 'other' END AS reason, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS unique_athletes, " +
      "  COUNT(*)::int AS event_entries " +
      "FROM core.event_results " +
      "WHERE year = $1 AND " + whereJrCircuit() + astFb.sql + " " +
      "AND ((stage = 'Regionals' AND discipline ILIKE '%platform%') " +
      "  OR (stage = 'Regionals' AND year = 2026 AND age_group IN ('Group C','Group D'))) " +
      "GROUP BY stage, reason";
    const astR = await neonQ(astSql, [year].concat(astFb.params));

    // 3) Stage transitions: athletes who appear at both stage N and N+1
    //    (this gives us the "advanced" count for the funnel)
    const transFb = buildFiltersSql(2);
    const transSql =
      "WITH per_stage AS ( " +
      "  SELECT stage, diver_id_dm FROM core.event_results " +
      "  WHERE year = $1 AND " + whereJrCircuit() + transFb.sql + " " +
      "  GROUP BY stage, diver_id_dm " +
      ") " +
      "SELECT a.stage AS from_stage, b.stage AS to_stage, " +
      "  COUNT(DISTINCT a.diver_id_dm)::int AS advanced " +
      "FROM per_stage a JOIN per_stage b ON a.diver_id_dm = b.diver_id_dm " +
      "WHERE a.stage <> b.stage " +
      "GROUP BY a.stage, b.stage";
    const transR = await neonQ(transSql, [year].concat(transFb.params));

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

    pmState.funnelCache[ck] = out;
    return out;
  }

  /* Year-over-year aggregate: athletes & entries per stage per year */
  async function loadYoYData(){
    const ck = cacheKey('yoy');
    if (pmState.yoyCache && pmState.yoyCache.__ck === ck) return pmState.yoyCache;
    const fb = buildFiltersSql(1);
    const sql =
      "SELECT year, stage, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS unique_athletes, " +
      "  COUNT(*)::int AS event_entries " +
      "FROM core.event_results " +
      "WHERE " + whereJrCircuit() + fb.sql + " " +
      "GROUP BY year, stage " +
      "ORDER BY year, stage";
    const r = await neonQ(sql, fb.params);
    const out = r.rows.map(row => ({
      year: Number(row.year),
      stage: row.stage,
      unique_athletes: Number(row.unique_athletes) || 0,
      event_entries:   Number(row.event_entries) || 0,
    }));
    out.__ck = ck;
    pmState.yoyCache = out;
    return out;
  }

  /* Per-athlete attendance pattern (how many stops each athlete attended) *
   * — used by financial overlay to compute "actual cost paid" distribution */
  async function loadAttendancePattern(year){
    const akey = '__attendance__' + cacheKey(year);
    if (pmState.funnelCache[akey]) return pmState.funnelCache[akey];
    const fb = buildFiltersSql(2);
    const sql =
      "WITH per_athlete AS ( " +
      "  SELECT diver_id_dm, " +
      "    BOOL_OR(stage = 'Regionals') AS at_reg, " +
      "    BOOL_OR(stage = 'Zones')     AS at_zon, " +
      "    BOOL_OR(stage = 'EWC')       AS at_ewc, " +
      "    BOOL_OR(stage = 'Nationals') AS at_nat " +
      "  FROM core.event_results " +
      "  WHERE year = $1 AND " + whereJrCircuit() + fb.sql + " " +
      "  GROUP BY diver_id_dm " +
      ") " +
      "SELECT at_reg, at_zon, at_ewc, at_nat, COUNT(*)::int AS n " +
      "FROM per_athlete " +
      "GROUP BY at_reg, at_zon, at_ewc, at_nat";
    const r = await neonQ(sql, [year].concat(fb.params));
    pmState.funnelCache[akey] = r.rows.map(x => ({
      at_reg: x.at_reg === true || x.at_reg === 't' || x.at_reg === 'true',
      at_zon: x.at_zon === true || x.at_zon === 't' || x.at_zon === 'true',
      at_ewc: x.at_ewc === true || x.at_ewc === 't' || x.at_ewc === 'true',
      at_nat: x.at_nat === true || x.at_nat === 't' || x.at_nat === 'true',
      n: Number(x.n) || 0,
    }));
    return pmState.funnelCache[akey];
  }

  /* Discover distinct filter-option values from Neon (populate dropdowns).  */
  async function loadFilterOptions(){
    if (pmState.filterOptions) return pmState.filterOptions;
    const sql =
      "SELECT 'age_group' AS dim, age_group::text AS val FROM core.event_results " +
      "  WHERE " + whereJrCircuit() + " AND age_group IS NOT NULL " +
      "UNION " +
      "SELECT 'gender' AS dim, gender::text AS val FROM core.event_results " +
      "  WHERE " + whereJrCircuit() + " AND gender IS NOT NULL " +
      "UNION " +
      "SELECT 'discipline' AS dim, discipline::text AS val FROM core.event_results " +
      "  WHERE " + whereJrCircuit() + " AND discipline IS NOT NULL " +
      "UNION " +
      "SELECT 'zone' AS dim, zone::text AS val FROM core.event_results " +
      "  WHERE " + whereJrCircuit() + " AND zone IS NOT NULL " +
      "UNION " +
      "SELECT 'region' AS dim, region::text AS val FROM core.event_results " +
      "  WHERE " + whereJrCircuit() + " AND region IS NOT NULL " +
      "ORDER BY dim, val";
    const r = await neonQ(sql);
    const opts = { age_group: [], gender: [], discipline: [], zone: [], region: [] };
    r.rows.forEach(row => {
      if (opts[row.dim] && row.val) opts[row.dim].push(row.val);
    });
    // Sort regions numerically if they're numeric strings
    if (opts.region.every(v => /^\d+$/.test(v))) {
      opts.region.sort((a, b) => Number(a) - Number(b));
    }
    pmState.filterOptions = opts;
    return opts;
  }

  /* === COHORT PROGRESSION ANALYSIS ============================================
   * The headline analytical capability. Define a starting cohort (athletes who
   * appeared at $startStage in $year), then trace every one of them through
   * every subsequent stage in that same year. For each stage we compute:
   *   - reached:          unique athletes who showed up at that stage
   *   - top_3:            best place 1-3 (medals)
   *   - top_4_10:         best place 4-10
   *   - top_11_18:        best place 11-18 (the typical advance band)
   *   - rest:             best place 19+
   *   - had_final:        appeared in any 'Final' round at that stage
   *   - had_semi:         appeared in any 'Semifinal' round
   *   - had_prelim:       appeared in any 'Prelim' round
   * For Nationals these round flags answer the killer question:
   *   "Athletes who started at Regionals AND made the Finals at Junior Nationals"
   * Pre-2026: Regionals → Zones → Nationals.  2026+: Regionals → Zones → EWC → Nationals.
   * ========================================================================== */
  async function loadCohortProgression(year, startStage){
    const ck = cacheKey(year) + '|coh|' + startStage;
    if (pmState.cohortCache[ck]) return pmState.cohortCache[ck];
    const fb = buildFiltersSql(3);  // $1=year, $2=startStage, $3+=filters

    const sql =
      "WITH cohort AS ( " +
      "  SELECT DISTINCT diver_id_dm FROM core.event_results " +
      "  WHERE year = $1 AND stage = $2 AND " + whereJrCircuit() + " " +
      "    AND diver_id_dm IS NOT NULL " +
      (pmState.excludeFutureChamps ? "    AND (meet_name NOT ILIKE '%Future Champions%' AND event_name NOT ILIKE '%Future Champions%') " : '') +
      fb.sql + " " +
      "), " +
      "journey AS ( " +
      "  SELECT er.diver_id_dm, er.stage, " +
      "    MIN(er.place) AS best_place, " +
      "    BOOL_OR(er.round = 'Prelim')    AS had_prelim, " +
      "    BOOL_OR(er.round = 'Semifinal') AS had_semi, " +
      "    BOOL_OR(er.round = 'Final')     AS had_final " +
      "  FROM core.event_results er " +
      "  JOIN cohort c ON c.diver_id_dm = er.diver_id_dm " +
      "  WHERE er.year = $1 AND " + whereJrCircuit() + " " +
      (pmState.excludeFutureChamps ? "    AND (meet_name NOT ILIKE '%Future Champions%' AND event_name NOT ILIKE '%Future Champions%') " : '') +
      fb.sql + " " +
      "  GROUP BY er.diver_id_dm, er.stage " +
      ") " +
      "SELECT stage, " +
      "  COUNT(DISTINCT diver_id_dm)::int                                                  AS reached, " +
      "  COUNT(DISTINCT diver_id_dm) FILTER (WHERE best_place BETWEEN 1 AND 3)::int        AS top_3, " +
      "  COUNT(DISTINCT diver_id_dm) FILTER (WHERE best_place BETWEEN 4 AND 10)::int       AS top_4_10, " +
      "  COUNT(DISTINCT diver_id_dm) FILTER (WHERE best_place BETWEEN 11 AND 18)::int      AS top_11_18, " +
      "  COUNT(DISTINCT diver_id_dm) FILTER (WHERE best_place >= 19)::int                  AS rest_place, " +
      "  COUNT(DISTINCT diver_id_dm) FILTER (WHERE best_place IS NULL)::int                AS no_place, " +
      "  COUNT(DISTINCT diver_id_dm) FILTER (WHERE had_final)::int                         AS in_final_round, " +
      "  COUNT(DISTINCT diver_id_dm) FILTER (WHERE had_semi)::int                          AS in_semi_round, " +
      "  COUNT(DISTINCT diver_id_dm) FILTER (WHERE had_prelim)::int                        AS in_prelim_round " +
      "FROM journey GROUP BY stage";

    const params = [year, startStage].concat(fb.params);
    const r = await neonQ(sql, params);

    // Build output keyed by stage
    const out = { year: year, startStage: startStage, stages: {} };
    STAGE_ORDER.forEach(s => {
      out.stages[s] = {
        reached: 0, top_3: 0, top_4_10: 0, top_11_18: 0, rest_place: 0, no_place: 0,
        in_final_round: 0, in_semi_round: 0, in_prelim_round: 0,
      };
    });
    r.rows.forEach(row => {
      if (!STAGE_ORDER.includes(row.stage)) return;
      Object.keys(out.stages[row.stage]).forEach(k => {
        out.stages[row.stage][k] = Number(row[k]) || 0;
      });
    });
    // The "starting" cohort size is reached at startStage by definition
    out.cohortSize = out.stages[startStage] ? out.stages[startStage].reached : 0;
    pmState.cohortCache[ck] = out;
    return out;
  }

  /* === RETENTION RATE TRENDS (replaces stacked-bar YoY) =======================
   * For every year on record, compute the retention rate at each stage transition.
   * Returns one row per (year, transition) so the renderer can draw a line per
   * transition over time. Rule-era differences are reflected automatically: the
   * EWC transitions only have data for 2026+, the Nationals-direct transitions
   * only for 2021–2025.
   * ========================================================================== */
  async function loadRetentionRates(){
    const ck = cacheKey('ret');
    if (pmState.retentionCache && pmState.retentionCache.__ck === ck) return pmState.retentionCache;
    const fb = buildFiltersSql(1);

    const sql =
      "WITH per_year_stage AS ( " +
      "  SELECT year, stage, COUNT(DISTINCT diver_id_dm)::int AS n " +
      "  FROM core.event_results " +
      "  WHERE " + whereJrCircuit() + " AND diver_id_dm IS NOT NULL " +
      (pmState.excludeFutureChamps ? "    AND (meet_name NOT ILIKE '%Future Champions%' AND event_name NOT ILIKE '%Future Champions%') " : '') +
      fb.sql + " " +
      "  GROUP BY year, stage " +
      ") " +
      "SELECT * FROM per_year_stage ORDER BY year, stage";
    const r = await neonQ(sql, fb.params);

    // Pivot: year -> stage -> n
    const grid = {};
    r.rows.forEach(row => {
      if (!grid[row.year]) grid[row.year] = {};
      grid[row.year][row.stage] = Number(row.n) || 0;
    });
    // Compute retention rates per year per transition
    const years = Object.keys(grid).map(Number).sort();
    const out = years.map(y => {
      const s = grid[y];
      const reg = s.Regionals || 0;
      const zon = s.Zones     || 0;
      const ewc = s.EWC       || 0;
      const nat = s.Nationals || 0;
      return {
        year: y,
        regionals: reg,
        zones: zon,
        ewc: ewc,
        nationals: nat,
        reg_to_zon: reg > 0 ? zon / reg : null,
        zon_to_ewc: zon > 0 && ewc > 0 ? ewc / zon : null,
        zon_to_nat: zon > 0 && nat > 0 && ewc === 0 ? nat / zon : null,   // pre-2026 direct
        ewc_to_nat: ewc > 0 && nat > 0 ? nat / ewc : null,                // 2026+
        reg_to_nat: reg > 0 && nat > 0 ? nat / reg : null,                // overall pipeline survival
      };
    });
    out.__ck = ck;
    pmState.retentionCache = out;
    return out;
  }

  /* Demographics + composition: counts split by age_group × stage,        *
   * gender × stage, discipline × stage, and zone (entry-point distribution). */
  async function loadDemographicsData(year){
    const ck = cacheKey(year);
    if (pmState.demoCache[ck]) return pmState.demoCache[ck];
    const fb = buildFiltersSql(2);

    // Single roundtrip with UNION ALL to get all four dimensions at once
    const sql =
      "SELECT 'age' AS dim, COALESCE(age_group, '(unknown)') AS bucket, stage, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS athletes " +
      "FROM core.event_results " +
      "WHERE year = $1 AND " + whereJrCircuit() + fb.sql + " " +
      "GROUP BY age_group, stage " +
      "UNION ALL " +
      "SELECT 'gender' AS dim, COALESCE(gender, '(unknown)') AS bucket, stage, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS athletes " +
      "FROM core.event_results " +
      "WHERE year = $1 AND " + whereJrCircuit() + fb.sql + " " +
      "GROUP BY gender, stage " +
      "UNION ALL " +
      "SELECT 'discipline' AS dim, COALESCE(discipline, '(unknown)') AS bucket, stage, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS athletes " +
      "FROM core.event_results " +
      "WHERE year = $1 AND " + whereJrCircuit() + fb.sql + " " +
      "GROUP BY discipline, stage " +
      "UNION ALL " +
      "SELECT 'zone' AS dim, COALESCE(zone, '(unknown)') AS bucket, stage, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS athletes " +
      "FROM core.event_results " +
      "WHERE year = $1 AND " + whereJrCircuit() + fb.sql + " " +
      "GROUP BY zone, stage";
    const r = await neonQ(sql, [year].concat(fb.params));

    // Pivot into per-dimension matrices
    const out = { age: {}, gender: {}, discipline: {}, zone: {} };
    r.rows.forEach(row => {
      const d = row.dim, b = row.bucket, s = row.stage, n = Number(row.athletes) || 0;
      if (!out[d]) return;
      if (!out[d][b]) out[d][b] = {};
      out[d][b][s] = n;
    });
    pmState.demoCache[ck] = out;
    return out;
  }

  /* Clear caches when filter toggles change                            */
  function invalidateCache(){
    pmState.funnelCache = {};
    pmState.yoyCache = null;
    pmState.demoCache = {};
    pmState.cohortCache = {};
    pmState.retentionCache = null;
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
        '<div class="pm-hero-inner">' +
          '<div class="pm-hero-eyebrow">Junior Circuit Analytics</div>' +
          '<div class="pm-hero-title">Pipeline &amp; Modeling</div>' +
          '<div class="pm-hero-sub">' +
            'Multi-year view of how athletes flow through the USA Diving Junior Circuit — ' +
            'from Regionals through Zones, East/West/Central, and into the Junior National Championships. ' +
            'Toggle the financial overlay to layer in what families pay and what each meet generates in entry fees.' +
          '</div>' +
        '</div>' +
        '<div class="pm-hero-actions">' +
          '<button class="pm-hero-btn" id="pmRefreshBtn" title="Re-pull data from Neon">' +
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
              '<path d="M12 7a5 5 0 1 1-1.5-3.5M12 1v3.5H8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg> Refresh' +
          '</button>' +
          '<button class="pm-hero-btn primary" id="pmPrintBtn" title="Open a print-ready report in a new window">' +
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">' +
              '<path d="M4 1h6v3M3 4h8v6H3zM4 10v3h6v-3" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
            '</svg> Print / PDF Report' +
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

    // Build filter dropdowns
    const opts = pmState.filterOptions || { age_group: [], gender: [], discipline: [], zone: [] };
    function dropdown(key, label, optsList){
      const cur = pmState.filters[key] || '';
      const optsHtml = ['<option value="">All ' + label.toLowerCase() + '</option>']
        .concat(optsList.map(v => '<option value="' + escapeHtml(v) + '" ' + (cur === v ? 'selected' : '') + '>' + escapeHtml(v) + '</option>'))
        .join('');
      return '<div class="pm-filter-field">' +
        '<label class="pm-filter-label">' + escapeHtml(label) + '</label>' +
        '<select class="pm-filter-select" data-pm-filter="' + key + '">' + optsHtml + '</select>' +
      '</div>';
    }
    const activeFilterCount = Object.values(pmState.filters).filter(v => v).length;

    return (
      '<div class="pm-controls">' +
        '<div class="pm-ctl-group">' +
          '<span class="pm-ctl-label">Year</span>' +
          '<div class="pm-year-pills">' + yearPills + '</div>' +
        '</div>' +

        '<div class="pm-ctl-divider"></div>' +

        '<div class="pm-ctl-group">' +
          '<label class="pm-toggle">' +
            '<input type="checkbox" id="pmToggleAst" ' + (pmState.excludeAsterisked ? '' : 'checked') + '>' +
            '<span class="pm-toggle-switch"></span>' +
            '<span>Include non-qualifying<sup class="pm-asterisk">*</sup></span>' +
            '<span class="pm-toggle-help" title="When ON (default), platform results at Regionals and Group C/D Regionals entries in 2026 are included with an asterisk. Toggle OFF to remove them entirely from all counts.">?</span>' +
          '</label>' +
        '</div>' +

        '<div class="pm-ctl-group">' +
          '<label class="pm-toggle">' +
            '<input type="checkbox" id="pmToggleFC" ' + (pmState.excludeFutureChamps ? 'checked' : '') + '>' +
            '<span class="pm-toggle-switch"></span>' +
            '<span>Exclude Future Champions</span>' +
            '<span class="pm-toggle-help" title="Future Champions meets are developmental and per USA Diving policy do not count in Junior Circuit participation data. Default: ON (excluded).">?</span>' +
          '</label>' +
        '</div>' +

        '<div class="pm-ctl-group">' +
          '<label class="pm-toggle financial">' +
            '<input type="checkbox" id="pmToggleFin" ' + (pmState.showFinancials ? 'checked' : '') + '>' +
            '<span class="pm-toggle-switch"></span>' +
            '<span><strong>Financial overlay</strong></span>' +
            '<span class="pm-toggle-help" title="Layers entry-fee data on every section: what families actually paid per athlete and what each meet collected in aggregate.">?</span>' +
          '</label>' +
        '</div>' +
      '</div>' +

      // Filter bar — separate row, scoped to all data pulls
      '<div class="pm-filter-bar">' +
        '<div class="pm-filter-bar-head">' +
          '<span class="pm-filter-bar-label">Filter the data</span>' +
          '<span class="pm-filter-bar-hint">All sections below update together. ' +
            (activeFilterCount ? '<strong>' + activeFilterCount + ' active filter' + (activeFilterCount === 1 ? '' : 's') + '</strong>' : 'No filters applied') +
          '</span>' +
          (activeFilterCount ? '<button class="pm-filter-clear" id="pmFilterClear">Clear all filters</button>' : '') +
        '</div>' +
        '<div class="pm-filter-fields">' +
          dropdown('age_group',  'Age group',  opts.age_group) +
          dropdown('gender',     'Gender',     opts.gender) +
          dropdown('discipline', 'Discipline', opts.discipline) +
          dropdown('zone',       'Zone',       opts.zone) +
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
    // Full-circuit reference cost = theoretical cost across ALL 4 stages, regardless
    // of which have completed. (Previously summed only visible stages, which
    // under-reported when Nationals hadn't happened yet for the current season.)
    const fullCircuitCost = STAGE_ORDER.reduce((a, s) => a + (fees[s] || 0), 0);
    const nationalsHasData = data.stages.Nationals && data.stages.Nationals.unique_athletes > 0;
    const fullCircuitNote = nationalsHasData ? 'per athlete attending every stop' : 'reference cost (Nationals upcoming for ' + year + ')';

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
          '<div class="pm-kpi-sub">' + fullCircuitNote + '</div>' +
        '</div>';
    }
    kpiHtml += '</div>';

    // Funnel SVG — larger now that we have full width
    const W = 1400, H = 80 + stages.length * 110;
    const bandH = 80;
    const cx = W / 2;
    const maxAth = totalAthletes || 1;
    const minWidth = 240; // never narrower than this so labels fit

    let svg = '<svg class="pm-funnel-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';

    stages.forEach(function(s, i){
      const cnt = data.stages[s].unique_athletes;
      const entries = data.stages[s].event_entries;
      const yTop = 36 + i * 110;
      const widthRatio = Math.max(cnt / maxAth, minWidth / (W - 80));
      const bandW = Math.max(minWidth, (W - 80) * widthRatio);
      const x0 = cx - bandW/2;

      // Color: deeper blue at top, lighter pool toward the bottom
      const colors = [C.blue, C.blue700, C.pool, C.red];
      const fill = colors[i] || C.blue;

      // Band shape (slight trapezoid for funnel feel)
      const nextW = (i < stages.length - 1)
        ? Math.max(minWidth, (W - 80) * Math.max(data.stages[stages[i+1]].unique_athletes / maxAth, minWidth / (W - 80)))
        : bandW * 0.86;
      const nx0 = cx - nextW/2;

      // Trapezoid path with rounded top-left and top-right on the first band
      svg += '<path d="M' + x0 + ' ' + yTop + ' L' + (x0+bandW) + ' ' + yTop +
             ' L' + (nx0 + nextW) + ' ' + (yTop + bandH) + ' L' + nx0 + ' ' + (yTop + bandH) + ' Z" ' +
             'fill="' + fill + '" stroke="' + C.blue900 + '" stroke-width="1" opacity="0.96"/>';

      // Stage label (left side)
      svg += '<text class="pm-funnel-stage-label" x="24" y="' + (yTop + 32) + '">' + escapeHtml(STAGE_LABELS[s]) + '</text>';
      svg += '<text class="pm-funnel-stage-sublabel" x="24" y="' + (yTop + 52) + '">' + (fees[s] !== undefined ? '$' + fees[s] + ' entry fee' : 'entry fee not set') + '</text>';

      // Athlete count (center of band)
      svg += '<text class="pm-funnel-band-count" x="' + cx + '" y="' + (yTop + 38) + '" text-anchor="middle">' +
             fmtNum(cnt) + ' athletes</text>';
      svg += '<text class="pm-funnel-band-label" x="' + cx + '" y="' + (yTop + 60) + '" text-anchor="middle">' +
             fmtNum(entries) + ' event entries</text>';

      // Financial overlay on the right
      if (pmState.showFinancials) {
        const revenue = cnt * (fees[s] || 0);
        svg += '<text class="pm-funnel-financial" x="' + (W - 24) + '" y="' + (yTop + 32) + '" text-anchor="end">' +
               fmtMoney(revenue) + ' collected</text>';
        svg += '<text class="pm-funnel-financial-sub" x="' + (W - 24) + '" y="' + (yTop + 52) + '" text-anchor="end">' +
               cnt + ' × $' + (fees[s] || 0) + '</text>';
      }

      // Attrition note between bands (centered below current band)
      if (i < stages.length - 1) {
        const nextCnt = data.stages[stages[i+1]].unique_athletes;
        const dropped = cnt - nextCnt;
        const arrowY = yTop + bandH + 16;
        if (dropped > 0) {
          svg += '<text class="pm-funnel-attrition" x="' + cx + '" y="' + arrowY + '" text-anchor="middle">' +
                 '↓ ' + fmtNum(dropped) + ' did not advance (' + pct(dropped, cnt) + ' of stage)</text>';
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
      'Each band shows how many unique athletes competed at that stage of the ' + year + ' Junior Circuit. The bar width is proportional to the count, so the narrowing visually shows attrition through the qualification pipeline. Use the financial overlay toggle in the controls bar to add fee revenue detail to each band.',
      kpiHtml + '<div class="pm-funnel-wrap">' + svg + legend + '</div>' + footnote);
  }

  /* ── SECTION 2: Demographics & Composition ─────────────── */
  function renderDemographicsSection(year, data){
    if (!data) {
      return sectionShell(2, 'Demographics & Composition — ' + year,
        'Who is competing at each stage — age groups, gender, discipline, and zone of origin. The filter bar above narrows everything here too.',
        '<div class="pm-loading"><div class="pm-loading-spinner"></div><div class="pm-loading-text">Loading demographics…</div></div>');
    }

    // Sort the bucket keys for each dimension in a sensible order
    function sortAge(a, b){
      const order = ['Group A','Group B','Group C','Group D'];
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      return a.localeCompare(b);
    }
    function sortDefault(a, b){ return a.localeCompare(b); }
    const sorters = { age: sortAge, gender: sortDefault, discipline: sortDefault, zone: sortDefault };

    function matrixCard(dim, title, subtitle, accentColor){
      const matrix = data[dim] || {};
      const buckets = Object.keys(matrix).sort(sorters[dim] || sortDefault);
      if (!buckets.length) {
        return '<div class="pm-demo-card"><div class="pm-demo-card-head">' +
          '<div class="pm-demo-card-title">' + escapeHtml(title) + '</div>' +
          '<div class="pm-demo-card-sub">' + escapeHtml(subtitle) + '</div>' +
          '</div><div class="pm-empty"><div class="pm-empty-sub">No data for this dimension</div></div></div>';
      }
      // Stages with any data
      const activeStages = STAGE_ORDER.filter(s => buckets.some(b => (matrix[b][s] || 0) > 0));

      // Find max for bar scaling
      let maxVal = 0;
      buckets.forEach(b => activeStages.forEach(s => { maxVal = Math.max(maxVal, matrix[b][s] || 0); }));

      // Build the matrix as a card with bucket rows × stage columns
      let rows = '';
      buckets.forEach(b => {
        const total = activeStages.reduce((a, s) => a + (matrix[b][s] || 0), 0);
        const cells = activeStages.map(s => {
          const v = matrix[b][s] || 0;
          const opacity = maxVal ? (0.18 + 0.82 * v / maxVal) : 0.18;
          return '<td style="background: rgba(23,31,105,' + opacity.toFixed(3) + ')' +
                 '; color: ' + (opacity > 0.55 ? '#fff' : '#171f69') + '">' +
                 (v > 0 ? fmtNum(v) : '<span style="opacity:.4">—</span>') +
                 '</td>';
        }).join('');
        rows += '<tr><th>' + escapeHtml(b) + '</th>' + cells +
                '<td class="pm-demo-total">' + fmtNum(total) + '</td></tr>';
      });

      const headerCells = activeStages.map(s =>
        '<th>' + escapeHtml(STAGE_SHORT[s] || s) + '</th>'
      ).join('');

      return (
        '<div class="pm-demo-card" style="--accent: ' + accentColor + '">' +
          '<div class="pm-demo-card-head">' +
            '<div class="pm-demo-card-title">' + escapeHtml(title) + '</div>' +
            '<div class="pm-demo-card-sub">' + escapeHtml(subtitle) + '</div>' +
          '</div>' +
          '<table class="pm-demo-table">' +
            '<thead><tr><th></th>' + headerCells + '<th class="pm-demo-total">Total</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>'
      );
    }

    // Bar-chart card for zone (single-column horizontal-bar visualization)
    function zoneBarCard(){
      const matrix = data.zone || {};
      const buckets = Object.keys(matrix).sort();
      if (!buckets.length) {
        return '<div class="pm-demo-card"><div class="pm-demo-card-head">' +
          '<div class="pm-demo-card-title">Zone breakdown</div>' +
          '<div class="pm-demo-card-sub">Where athletes come from geographically</div>' +
          '</div><div class="pm-empty"><div class="pm-empty-sub">Zone data not available</div></div></div>';
      }
      // Use Regionals as the entry-point measure (max per zone is essentially attendance there)
      const entryPoint = buckets.map(b => ({
        zone: b,
        regionals: matrix[b]['Regionals'] || 0,
        zones: matrix[b]['Zones'] || 0,
        ewc: matrix[b]['EWC'] || 0,
      }));
      entryPoint.sort((a, b) => b.regionals - a.regionals);
      const maxRegionals = Math.max.apply(null, entryPoint.map(z => z.regionals).concat([1]));

      let bars = '';
      entryPoint.forEach(z => {
        const pctR = (z.regionals / maxRegionals * 100).toFixed(1);
        const pctZ = z.regionals ? (z.zones / z.regionals * 100).toFixed(0) : 0;
        const pctE = z.regionals ? (z.ewc   / z.regionals * 100).toFixed(0) : 0;
        bars += '<div class="pm-zone-row">' +
          '<div class="pm-zone-label">' + escapeHtml('Zone ' + z.zone) + '</div>' +
          '<div class="pm-zone-bar-stack">' +
            '<div class="pm-zone-bar regionals" style="width: ' + pctR + '%">' +
              '<span class="pm-zone-bar-text">' + fmtNum(z.regionals) + ' at Regionals</span>' +
            '</div>' +
          '</div>' +
          '<div class="pm-zone-trail">' +
            '<span>' + fmtNum(z.zones) + ' → Zones (' + pctZ + '%)</span>' +
            (z.ewc > 0 ? '<span>' + fmtNum(z.ewc) + ' → E/W/C (' + pctE + '%)</span>' : '') +
          '</div>' +
        '</div>';
      });

      return (
        '<div class="pm-demo-card wide">' +
          '<div class="pm-demo-card-head">' +
            '<div class="pm-demo-card-title">Zone breakdown</div>' +
            '<div class="pm-demo-card-sub">' +
              'Athletes by zone at the entry point (Regionals), with the share that advanced. ' +
              'Bar length is proportional to that zone\'s Regionals count.' +
            '</div>' +
          '</div>' +
          '<div class="pm-zone-list">' + bars + '</div>' +
        '</div>'
      );
    }

    // KPI strip for demographics
    const ageBuckets = Object.keys(data.age || {});
    const totalDistinctAge = ageBuckets.length;
    const genderBuckets = Object.keys(data.gender || {});
    const disciplineBuckets = Object.keys(data.discipline || {});
    const zoneBuckets = Object.keys(data.zone || {});

    let kpis = '<div class="pm-kpi-strip">';
    kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Age groups represented</div>' +
            '<div class="pm-kpi-value">' + totalDistinctAge + '</div>' +
            '<div class="pm-kpi-sub">' + ageBuckets.join(' · ') + '</div></div>';
    kpis += '<div class="pm-kpi pool"><div class="pm-kpi-label">Genders represented</div>' +
            '<div class="pm-kpi-value">' + genderBuckets.length + '</div>' +
            '<div class="pm-kpi-sub">' + genderBuckets.join(' · ') + '</div></div>';
    kpis += '<div class="pm-kpi accent"><div class="pm-kpi-label">Disciplines</div>' +
            '<div class="pm-kpi-value">' + disciplineBuckets.length + '</div>' +
            '<div class="pm-kpi-sub">' + disciplineBuckets.join(' · ') + '</div></div>';
    kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Zones contributing</div>' +
            '<div class="pm-kpi-value">' + zoneBuckets.length + '</div>' +
            '<div class="pm-kpi-sub">at least one athlete from each</div></div>';
    kpis += '</div>';

    const grid =
      '<div class="pm-demo-grid">' +
        matrixCard('age',        'Age groups by stage',    'Unique athletes — darker cell = larger cohort',  C.blue) +
        matrixCard('gender',     'Gender by stage',        'How representation shifts through the pipeline', C.pool) +
        matrixCard('discipline', 'Discipline by stage',    'Spring­board, platform, and synchro participation', C.red) +
      '</div>' +
      zoneBarCard();

    return sectionShell(2, 'Demographics & Composition — ' + year,
      'Who is competing at each stage of the circuit, broken down by age group, gender, discipline, and zone of origin. The matrix cells use intensity to show cohort size — the darker the cell, the more athletes. All filters in the bar above narrow these counts too.',
      kpis + grid);
  }

  /* ── SECTION 3: Cohort Progression Analysis ──────────────
     The killer feature: trace a starting cohort (athletes who appeared at
     [startStage] in [year]) through every subsequent stage in that same year.
     Each stage shows the placement-tier breakdown (top 3 / 4–10 / 11–18 / 19+)
     and — for Junior Nationals — whether the athlete made the Final round,
     was cut after Prelim, or entered via Semifinal direct. This is what
     answers questions like "of athletes who started at 2025 Regionals, how
     many made the Junior Nationals Final round?"
  ──────────────────────────────────────────────────────── */
  function renderCohortSection(year, data){
    if (!data) {
      return sectionShell(3, 'Cohort Progression — Following the ' + year + ' ' + STAGE_SHORT[pmState.cohortStartStage] + ' cohort',
        'Trace every athlete from a starting cohort through the entire pipeline that year. Placement-tier and Prelim/Semi/Final breakdowns at each stage.',
        '<div class="pm-loading"><div class="pm-loading-spinner"></div><div class="pm-loading-text">Tracing cohort through the pipeline…</div></div>');
    }

    const startStage = pmState.cohortStartStage;
    const startCount = data.cohortSize;

    // Decide which subsequent stages to show based on rule era and data presence
    const startIdx = STAGE_ORDER.indexOf(startStage);
    const downstream = STAGE_ORDER.slice(startIdx).filter((s, i) => {
      if (i === 0) return true;
      // EWC only exists 2026+; for pre-2026 it's an empty stage to skip
      if (s === 'EWC' && year < 2026) return false;
      return true;
    });

    if (!startCount) {
      const stageBtns = ['Regionals','Zones','EWC'].map(s =>
        '<button class="pm-cohort-stage-btn ' + (s === startStage ? 'active' : '') + '" data-pm-cohort-stage="' + s + '">Starting at ' + STAGE_SHORT[s] + '</button>'
      ).join('');
      return sectionShell(3, 'Cohort Progression — ' + year,
        'Trace every athlete from a starting cohort through the rest of the pipeline.',
        '<div class="pm-cohort-controls"><div class="pm-cohort-stage-picker">' + stageBtns + '</div></div>' +
        '<div class="pm-empty"><div class="pm-empty-title">No athletes in starting cohort</div>' +
        '<div class="pm-empty-sub">No ' + year + ' ' + STAGE_SHORT[startStage] + ' athletes match the current filters. Try a different starting stage, clear filters, or change year.</div></div>');
    }

    // Tier colors — chosen to read top-down: red (medal) → orange → amber → gray
    const tierColors = {
      top_3:     '#e31937',   // brand red — medal contenders
      top_4_10:  '#f59e0b',   // amber
      top_11_18: '#fbbf24',   // light amber
      rest:      '#94a3b8',   // gray
      no_place:  '#cbd5e1',   // very light gray
    };

    // KPI strip — focused on the cohort + answer to the headline question
    const finalStage = downstream[downstream.length - 1];
    const finalStageData = data.stages[finalStage] || { reached: 0, in_final_round: 0 };
    const reachedLast = finalStageData.reached;
    const reachedFinalAtLast = finalStageData.in_final_round;
    const retentionPct = startCount ? (reachedLast / startCount * 100).toFixed(1) : '—';
    const madeFinalsPct = startCount ? (reachedFinalAtLast / startCount * 100).toFixed(1) : '—';

    let kpis = '<div class="pm-kpi-strip">';
    kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Starting cohort</div>' +
            '<div class="pm-kpi-value">' + fmtNum(startCount) + '</div>' +
            '<div class="pm-kpi-sub">' + year + ' ' + STAGE_SHORT[startStage] + ' athletes</div></div>';
    kpis += '<div class="pm-kpi accent"><div class="pm-kpi-label">Reached ' + STAGE_SHORT[finalStage] + '</div>' +
            '<div class="pm-kpi-value">' + fmtNum(reachedLast) + '</div>' +
            '<div class="pm-kpi-sub">' + retentionPct + '% of starting cohort</div></div>';
    if (finalStage === 'Nationals') {
      kpis += '<div class="pm-kpi pool"><div class="pm-kpi-label">Made the Final round at Nationals</div>' +
              '<div class="pm-kpi-value">' + fmtNum(reachedFinalAtLast) + '</div>' +
              '<div class="pm-kpi-sub">' + madeFinalsPct + '% of starting cohort</div></div>';
      kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Medaled (Top 3) at Nationals</div>' +
              '<div class="pm-kpi-value">' + fmtNum(finalStageData.top_3) + '</div>' +
              '<div class="pm-kpi-sub">from the starting cohort</div></div>';
    } else {
      kpis += '<div class="pm-kpi pool"><div class="pm-kpi-label">Medaled (Top 3) at ' + STAGE_SHORT[finalStage] + '</div>' +
              '<div class="pm-kpi-value">' + fmtNum(finalStageData.top_3) + '</div>' +
              '<div class="pm-kpi-sub">from the starting cohort</div></div>';
      kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Last stage in ' + year + '</div>' +
              '<div class="pm-kpi-value" style="font-size: 24px;">' + STAGE_SHORT[finalStage] + '</div>' +
              '<div class="pm-kpi-sub">' + (year >= 2026 ? '4-meet rule era' : '3-meet rule era') + '</div></div>';
    }
    kpis += '</div>';

    // Visualization: horizontal "lane chart". Each stage is a row with a
    // stacked-segment bar showing tier breakdown. Width relative to startCount.
    let lanes = '<div class="pm-cohort-lanes">';
    downstream.forEach((s, i) => {
      const sd = data.stages[s] || {};
      const total = sd.reached || 0;
      const widthPct = startCount ? (total / startCount * 100).toFixed(2) : 0;

      // Tier segments (non-cumulative — they stack to total)
      const tiers = [
        { key: 'top_3',     label: 'Top 3 (medal)',  count: sd.top_3,     color: tierColors.top_3 },
        { key: 'top_4_10',  label: 'Top 4–10',       count: sd.top_4_10,  color: tierColors.top_4_10 },
        { key: 'top_11_18', label: 'Top 11–18',      count: sd.top_11_18, color: tierColors.top_11_18 },
        { key: 'rest',      label: '19+ place',      count: sd.rest_place, color: tierColors.rest },
        { key: 'no_place',  label: 'No place',       count: sd.no_place,  color: tierColors.no_place },
      ];
      const segHtml = tiers.filter(t => t.count > 0).map(t => {
        const pct = total ? (t.count / total * 100).toFixed(1) : 0;
        const tooltip = t.label + ': ' + fmtNum(t.count) + ' (' + pct + '% of stage)';
        return '<div class="pm-cohort-tier" style="flex: ' + t.count + '; background: ' + t.color + '" title="' + escapeHtml(tooltip) + '">' +
          (t.count >= 8 ? fmtNum(t.count) : '') +
        '</div>';
      }).join('');

      // Pct retention vs starting cohort
      const retentionThis = startCount ? (total / startCount * 100).toFixed(1) : '—';
      const dropFromPrev = (i > 0) ? (data.stages[downstream[i-1]].reached - total) : null;

      lanes += '<div class="pm-cohort-lane' + (i === 0 ? ' starting' : '') + '">' +
        '<div class="pm-cohort-lane-head">' +
          '<div class="pm-cohort-lane-stage">' +
            (i === 0 ? '<span class="pm-cohort-lane-start-tag">START</span>' : '') +
            '<span class="pm-cohort-lane-stage-name">' + escapeHtml(STAGE_LABELS[s]) + '</span>' +
          '</div>' +
          '<div class="pm-cohort-lane-counts">' +
            '<div class="pm-cohort-lane-big">' + fmtNum(total) + ' <span class="lbl">athletes</span></div>' +
            '<div class="pm-cohort-lane-pct">' + retentionThis + '% of starting cohort</div>' +
          '</div>' +
        '</div>' +
        '<div class="pm-cohort-bar-wrap">' +
          '<div class="pm-cohort-bar" style="width: ' + widthPct + '%">' + segHtml + '</div>' +
          '<div class="pm-cohort-bar-scale">' + (startCount ? fmtNum(startCount) : '—') + ' →</div>' +
        '</div>';

      // For Nationals: show Prelim/Semi/Final breakdown
      if (s === 'Nationals' && total > 0) {
        const inFinal = sd.in_final_round || 0;
        const inSemi = sd.in_semi_round || 0;
        const inPrelim = sd.in_prelim_round || 0;
        const prelimCut = Math.max(0, inPrelim - inFinal - inSemi);
        const semiDirect = Math.max(0, inSemi - inFinal);
        const finalDirect = Math.max(0, inFinal - inSemi - inPrelim);
        const finalFromPrelim = Math.min(inFinal, inPrelim);

        lanes += '<div class="pm-cohort-nat-rounds">' +
          '<div class="pm-cohort-nat-rounds-head">Round-by-round at Junior Nationals</div>' +
          '<div class="pm-cohort-nat-row">' +
            '<div class="pm-cohort-nat-cell final"><div class="lbl">Made the Final</div>' +
              '<div class="val">' + fmtNum(inFinal) + '</div>' +
              '<div class="sub">' + (total ? (inFinal/total*100).toFixed(1) : 0) + '% of attendees</div></div>' +
            '<div class="pm-cohort-nat-cell semi"><div class="lbl">In Semifinal round</div>' +
              '<div class="val">' + fmtNum(inSemi) + '</div>' +
              '<div class="sub">' + (total ? (inSemi/total*100).toFixed(1) : 0) + '% of attendees</div></div>' +
            '<div class="pm-cohort-nat-cell prelim"><div class="lbl">Prelim entry — cut</div>' +
              '<div class="val">' + fmtNum(prelimCut) + '</div>' +
              '<div class="sub">' + (total ? (prelimCut/total*100).toFixed(1) : 0) + '% of attendees</div></div>' +
          '</div>' +
        '</div>';
      }

      // Drop-off arrow between bars
      if (i < downstream.length - 1 && dropFromPrev === null) {
        const nextStage = downstream[i + 1];
        const nextTotal = (data.stages[nextStage] || {}).reached || 0;
        const dropped = total - nextTotal;
        if (dropped > 0) {
          lanes += '<div class="pm-cohort-drop-arrow">↓ ' + fmtNum(dropped) +
            ' did not advance from ' + STAGE_SHORT[s] + ' to ' + STAGE_SHORT[nextStage] +
            ' (' + (total ? (dropped/total*100).toFixed(1) : 0) + '% drop-off)</div>';
        }
      } else if (i > 0 && dropFromPrev > 0) {
        // Show the drop-off note above the lane head instead (positioned below previous)
      }

      lanes += '</div>';
    });
    lanes += '</div>';

    // Cohort starting-stage selector (within section)
    const stageBtns = ['Regionals','Zones','EWC']
      .filter(s => s !== 'EWC' || year >= 2026)
      .map(s => '<button class="pm-cohort-stage-btn ' + (s === startStage ? 'active' : '') + '" data-pm-cohort-stage="' + s + '">Starting at ' + STAGE_SHORT[s] + '</button>')
      .join('');
    const controls =
      '<div class="pm-cohort-controls">' +
        '<div class="pm-cohort-stage-picker">' + stageBtns + '</div>' +
        '<div class="pm-cohort-legend">' +
          '<span class="pm-cohort-legend-item"><span class="sw" style="background:' + tierColors.top_3 + '"></span>Top 3 (medal)</span>' +
          '<span class="pm-cohort-legend-item"><span class="sw" style="background:' + tierColors.top_4_10 + '"></span>Top 4–10</span>' +
          '<span class="pm-cohort-legend-item"><span class="sw" style="background:' + tierColors.top_11_18 + '"></span>Top 11–18</span>' +
          '<span class="pm-cohort-legend-item"><span class="sw" style="background:' + tierColors.rest + '"></span>19+ place</span>' +
          '<span class="pm-cohort-legend-item"><span class="sw" style="background:' + tierColors.no_place + '"></span>No place recorded</span>' +
        '</div>' +
      '</div>';

    // Era note
    const eraNote = year >= 2026
      ? '<div class="pm-cohort-era">This cohort runs under the <strong>2026+ four-meet system</strong> (Regionals → Zones → E/W/C → Junior Nationals). Counts within a stage are non-cumulative and stack to that stage\'s total.</div>'
      : '<div class="pm-cohort-era">This cohort runs under the <strong>2021–2025 three-meet system</strong> (Regionals → Zones → Junior Nationals — no E/W/C). Counts within a stage are non-cumulative and stack to that stage\'s total.</div>';

    return sectionShell(3, 'Cohort Progression — Following the ' + year + ' ' + STAGE_SHORT[startStage] + ' cohort',
      'Every athlete in the starting cohort, traced through every subsequent stage of the ' + year + ' pipeline. The bar width is the share of the starting cohort that reached that stage; each color segment is a placement tier at that stage. For Junior Nationals, the round-by-round breakdown below shows who made the Final, who was in the Semifinal round, and who was cut after Prelim.',
      kpis + eraNote + controls + lanes);
  }

  /* ── SECTION 4: Retention Rate Trends (replaces stacked YoY bars) ──
     Industry-standard pipeline analytics: per-year retention rates at each
     stage transition, drawn as lines so the eye sees trends, not just totals.
     Shaded background bands distinguish the two rule eras (pre-2026 three-meet
     vs 2026+ four-meet) so the reader knows which transitions are even possible
     in each era. Below the lines, a small "absolute counts" companion shows
     the underlying volume so retention rates can be read in context.
  ──────────────────────────────────────────────────────── */
  function renderRetentionSection(rows){
    if (!rows) {
      return sectionShell(4, 'Retention Rate Trends — Multi-Year Pipeline Survival',
        'How well the pipeline retains athletes from stage to stage, year over year. Pipeline analytics, not just bars.',
        '<div class="pm-loading"><div class="pm-loading-spinner"></div><div class="pm-loading-text">Loading retention curves…</div></div>');
    }
    if (!rows.length) {
      return sectionShell(4, 'Retention Rate Trends',
        'How retention has moved across years.',
        '<div class="pm-empty"><div class="pm-empty-title">No multi-year data found</div></div>');
    }

    const years = rows.map(r => r.year);
    const minY = Math.min.apply(null, years);
    const maxY = Math.max.apply(null, years);

    // Headline retention KPIs — latest year, with year-over-year delta
    const last = rows[rows.length - 1];
    const prev = rows[rows.length - 2] || last;
    function pctFmt(v) { return v == null ? '—' : (v * 100).toFixed(1) + '%'; }
    function deltaStr(curr, prior){
      if (curr == null || prior == null) return '';
      const delta = (curr - prior) * 100;
      const arrow = delta >= 0 ? '▲' : '▼';
      const sign = delta >= 0 ? '+' : '';
      return arrow + ' ' + sign + delta.toFixed(1) + ' pts vs ' + prev.year;
    }

    let kpiHtml = '<div class="pm-kpi-strip">';
    kpiHtml += '<div class="pm-kpi"><div class="pm-kpi-label">Regionals → Zones</div>' +
      '<div class="pm-kpi-value">' + pctFmt(last.reg_to_zon) + '</div>' +
      '<div class="pm-kpi-sub">' + last.year + ' &nbsp;·&nbsp; ' + deltaStr(last.reg_to_zon, prev.reg_to_zon) + '</div></div>';
    if (last.year >= 2026 || last.zon_to_ewc != null) {
      kpiHtml += '<div class="pm-kpi pool"><div class="pm-kpi-label">Zones → E/W/C</div>' +
        '<div class="pm-kpi-value">' + pctFmt(last.zon_to_ewc) + '</div>' +
        '<div class="pm-kpi-sub">' + last.year + ' &nbsp;·&nbsp; 2026+ rule era</div></div>';
    } else {
      kpiHtml += '<div class="pm-kpi pool"><div class="pm-kpi-label">Zones → Junior Nationals</div>' +
        '<div class="pm-kpi-value">' + pctFmt(last.zon_to_nat) + '</div>' +
        '<div class="pm-kpi-sub">' + last.year + ' &nbsp;·&nbsp; pre-2026 rule era</div></div>';
    }
    // Overall pipeline survival
    const overall = last.reg_to_nat != null ? last.reg_to_nat : (last.reg_to_zon && (last.zon_to_ewc || last.zon_to_nat) ? last.reg_to_zon * (last.zon_to_ewc || last.zon_to_nat) : null);
    kpiHtml += '<div class="pm-kpi accent"><div class="pm-kpi-label">Overall pipeline survival</div>' +
      '<div class="pm-kpi-value">' + pctFmt(overall) + '</div>' +
      '<div class="pm-kpi-sub">Regionals → Nationals (' + last.year + ')</div></div>';
    kpiHtml += '<div class="pm-kpi"><div class="pm-kpi-label">' + last.year + ' Regionals base</div>' +
      '<div class="pm-kpi-value">' + fmtNum(last.regionals) + '</div>' +
      '<div class="pm-kpi-sub">starting athletes that year</div></div>';
    kpiHtml += '</div>';

    // Build the retention lines chart
    const lineSvg = buildRetentionLines(rows, minY, maxY);
    // Build the absolute counts companion chart
    const absSvg = buildAbsoluteCountsChart(rows, minY, maxY);

    const era1 = '<span class="pm-era-chip pre"><span class="pm-era-dot"></span>2021–2025 · Three-meet system (Reg → Zones → Nationals)</span>';
    const era2 = '<span class="pm-era-chip post"><span class="pm-era-dot post"></span>2026+ · Four-meet system (Reg → Zones → E/W/C → Nationals)</span>';
    const eraBar = '<div class="pm-era-bar">' + era1 + era2 + '</div>';

    return sectionShell(4, 'Retention Rate Trends — Multi-Year Pipeline Survival',
      'How well the pipeline retains athletes from stage to stage, year over year. Each line is a stage transition; the y-axis is the percent of athletes from the prior stage who advanced. The shaded background marks where the rule system changed in 2026 (E/W/C added as an intermediate stage), so you can see which transitions are even possible in each era.',
      kpiHtml + eraBar +
      '<div class="pm-yoy-grid">' +
        '<div class="pm-yoy-chart">' +
          '<div class="pm-yoy-chart-title">Stage-to-stage retention, by year</div>' +
          '<div class="pm-yoy-chart-sub">Pipeline survival rates. Higher = more athletes from the prior stage advanced. Gaps indicate transitions that don\'t apply in that rule era.</div>' +
          lineSvg +
        '</div>' +
        '<div class="pm-yoy-chart">' +
          '<div class="pm-yoy-chart-title">Absolute athlete counts, by year and stage</div>' +
          '<div class="pm-yoy-chart-sub">Underlying volume. Retention rates above should be read against these counts — high retention with shrinking volume tells a different story than steady volume.</div>' +
          absSvg +
        '</div>' +
      '</div>'
    );
  }

  /* Retention lines SVG — one polyline per stage transition over time */
  function buildRetentionLines(rows, minY, maxY){
    const W = 540, H = 360;
    const padL = 60, padR = 16, padT = 18, padB = 60;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const yearSpan = Math.max(1, maxY - minY);

    function xOf(y){ return padL + (y - minY) / yearSpan * innerW; }
    function yOf(rate){ return padT + innerH - (rate * innerH); }  // rate ∈ [0,1]

    let svg = '<svg class="pm-yoy-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';

    // Era backdrop — shaded region for 2026+ (4-meet era)
    if (maxY >= 2026) {
      const eraStart = xOf(2026 - 0.5);
      const eraEnd = padL + innerW;
      svg += '<rect x="' + eraStart + '" y="' + padT + '" width="' + (eraEnd - eraStart) + '" height="' + innerH +
             '" fill="rgba(0,154,199,0.06)"/>';
      svg += '<text x="' + ((eraStart + eraEnd) / 2) + '" y="' + (padT + 14) + '" text-anchor="middle" ' +
             'style="font-family: var(--font-ui); font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; fill: #009ac7; opacity: .75;">4-MEET ERA</text>';
    }
    if (minY < 2026) {
      const eraStart = padL;
      const eraEnd = xOf(2025.5);
      svg += '<text x="' + ((eraStart + eraEnd) / 2) + '" y="' + (padT + 14) + '" text-anchor="middle" ' +
             'style="font-family: var(--font-ui); font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; fill: #5a6a7e; opacity: .65;">3-MEET ERA</text>';
    }

    // Gridlines & y-axis (0%, 25%, 50%, 75%, 100%)
    for (let i = 0; i <= 4; i++) {
      const rate = i / 4;
      const yp = yOf(rate);
      svg += '<line class="pm-grid-line" x1="' + padL + '" y1="' + yp + '" x2="' + (padL + innerW) + '" y2="' + yp + '"/>';
      svg += '<text class="pm-axis-tick" x="' + (padL - 6) + '" y="' + (yp + 3) + '" text-anchor="end">' + Math.round(rate * 100) + '%</text>';
    }
    // X-axis years
    for (let y = minY; y <= maxY; y++) {
      const xp = xOf(y);
      svg += '<text class="pm-bar-year" x="' + xp + '" y="' + (padT + innerH + 18) + '" text-anchor="middle">' + y + '</text>';
    }
    svg += '<line class="pm-axis-line" x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + innerH) + '"/>';
    svg += '<line class="pm-axis-line" x1="' + padL + '" y1="' + (padT + innerH) + '" x2="' + (padL + innerW) + '" y2="' + (padT + innerH) + '"/>';

    // Define the four transitions to plot
    const series = [
      { key: 'reg_to_zon', label: 'Regionals → Zones', color: '#171f69', dash: '' },
      { key: 'zon_to_nat', label: 'Zones → Nationals (pre-2026)', color: '#e31937', dash: '4,3' },
      { key: 'zon_to_ewc', label: 'Zones → E/W/C (2026+)', color: '#009ac7', dash: '' },
      { key: 'ewc_to_nat', label: 'E/W/C → Nationals (2026+)', color: '#d97706', dash: '' },
      { key: 'reg_to_nat', label: 'Overall: Regionals → Nationals', color: '#0d1040', dash: '8,4' },
    ];

    series.forEach(ser => {
      // Build path from points with valid (non-null) data
      const pts = rows.filter(r => r[ser.key] != null).map(r => xOf(r.year) + ',' + yOf(r[ser.key]));
      if (pts.length >= 2) {
        svg += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + ser.color +
               '" stroke-width="2.5" ' + (ser.dash ? 'stroke-dasharray="' + ser.dash + '" ' : '') +
               'stroke-linejoin="round" stroke-linecap="round"/>';
      }
      // Points + value labels at each year
      rows.filter(r => r[ser.key] != null).forEach(r => {
        const cx = xOf(r.year), cy = yOf(r[ser.key]);
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="' + ser.color + '" stroke="#fff" stroke-width="2"><title>' +
          ser.label + ' — ' + r.year + ': ' + (r[ser.key] * 100).toFixed(1) + '%</title></circle>';
      });
    });

    // Legend at the bottom
    const legendY = H - 6;
    let lx = padL;
    series.forEach(ser => {
      const w = 8 + ser.label.length * 5;
      svg += '<line x1="' + lx + '" y1="' + (legendY - 4) + '" x2="' + (lx + 14) + '" y2="' + (legendY - 4) +
             '" stroke="' + ser.color + '" stroke-width="2.5" ' + (ser.dash ? 'stroke-dasharray="' + ser.dash + '"' : '') + '/>';
      svg += '<text class="pm-bar-label" x="' + (lx + 18) + '" y="' + (legendY - 1) + '">' + escapeHtml(ser.label) + '</text>';
      lx += w + 14;
    });

    svg += '</svg>';
    return svg;
  }

  /* Absolute athlete-count chart — small stacked-area for context */
  function buildAbsoluteCountsChart(rows, minY, maxY){
    const W = 540, H = 360;
    const padL = 60, padR = 16, padT = 18, padB = 60;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const yearSpan = Math.max(1, maxY - minY);

    function xOf(y){ return padL + (y - minY) / yearSpan * innerW; }

    // Find max athletes across all years/stages for y-axis
    const maxVal = Math.max.apply(null, rows.flatMap(r => [r.regionals, r.zones, r.ewc, r.nationals]).concat([1]));
    const niceMax = niceCeiling(maxVal);

    function yOf(v){ return padT + innerH - (v / niceMax * innerH); }

    let svg = '<svg class="pm-yoy-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';

    // Gridlines
    for (let i = 0; i <= 4; i++) {
      const v = niceMax * i / 4;
      const yp = yOf(v);
      svg += '<line class="pm-grid-line" x1="' + padL + '" y1="' + yp + '" x2="' + (padL + innerW) + '" y2="' + yp + '"/>';
      svg += '<text class="pm-axis-tick" x="' + (padL - 6) + '" y="' + (yp + 3) + '" text-anchor="end">' + fmtNum(Math.round(v)) + '</text>';
    }
    for (let y = minY; y <= maxY; y++) {
      svg += '<text class="pm-bar-year" x="' + xOf(y) + '" y="' + (padT + innerH + 18) + '" text-anchor="middle">' + y + '</text>';
    }
    svg += '<line class="pm-axis-line" x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + innerH) + '"/>';
    svg += '<line class="pm-axis-line" x1="' + padL + '" y1="' + (padT + innerH) + '" x2="' + (padL + innerW) + '" y2="' + (padT + innerH) + '"/>';

    const series = [
      { key: 'regionals', label: 'Regionals', color: '#171f69' },
      { key: 'zones',     label: 'Zones',     color: '#1e2d8a' },
      { key: 'ewc',       label: 'E/W/C',     color: '#009ac7' },
      { key: 'nationals', label: 'Nationals', color: '#e31937' },
    ];

    series.forEach(ser => {
      const pts = rows.filter(r => r[ser.key] > 0).map(r => xOf(r.year) + ',' + yOf(r[ser.key]));
      if (pts.length >= 2) {
        svg += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + ser.color +
               '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
      }
      rows.filter(r => r[ser.key] > 0).forEach(r => {
        svg += '<circle cx="' + xOf(r.year) + '" cy="' + yOf(r[ser.key]) + '" r="4" fill="' + ser.color +
               '" stroke="#fff" stroke-width="2"><title>' + ser.label + ' ' + r.year + ': ' + fmtNum(r[ser.key]) + ' athletes</title></circle>';
      });
    });

    // Legend
    const legendY = H - 6;
    let lx = padL;
    series.forEach(ser => {
      const w = 8 + ser.label.length * 6;
      svg += '<rect x="' + lx + '" y="' + (legendY - 9) + '" width="10" height="10" fill="' + ser.color + '"/>';
      svg += '<text class="pm-bar-label" x="' + (lx + 14) + '" y="' + (legendY - 1) + '">' + escapeHtml(ser.label) + '</text>';
      lx += w + 14;
    });

    svg += '</svg>';
    return svg;
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
    let feeTable = '<div class="pm-fee-table-wrap"><table class="pm-fee-table">' +
        '<thead><tr><th>Meet</th>' +
          allFeeYears.map(y => '<th' + (y === year ? ' class="col-current"' : '') + '>' + y + '</th>').join('') +
        '</tr></thead>' +
        '<tbody>';
    STAGE_ORDER.forEach(s => {
      feeTable += '<tr><td>' + STAGE_LABELS[s] + '</td>' +
        allFeeYears.map(y => {
          const f = ENTRY_FEES[y][s];
          const isNew = (s === 'EWC' && y === 2026);
          const cls = [];
          if (y === year) cls.push('col-current');
          if (isNew) cls.push('new-2026');
          return '<td' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '>' + (f ? '$' + f : '—') + '</td>';
        }).join('') +
        '</tr>';
    });
    // Totals row
    feeTable += '<tr class="total-row"><td>Full-circuit total</td>' +
      allFeeYears.map(y => {
        const total = STAGE_ORDER.reduce((a, s) => a + (ENTRY_FEES[y][s] || 0), 0);
        return '<td' + (y === year ? ' class="col-current"' : '') + '>' + fmtMoney(total) + '</td>';
      }).join('') + '</tr>';
    feeTable += '</tbody></table></div>';

    // Cost histogram — bands of "what families actually paid"
    let hist = '<div class="pm-fin-cost-hist">';
    hist += '<div class="pm-fin-hist-head">What families actually paid &mdash; ' + year + '</div>';
    hist += '<div class="pm-fin-hist-sub">' +
            'Each row is a cohort of athletes grouped by which meets they competed in. ' +
            'Most athletes only paid the entry fee for the meets they actually attended — not the full circuit cost.' +
            '</div>';

    const maxBand = Math.max.apply(null, dist.bands.map(b => b.n).concat([1]));
    dist.bands.forEach(b => {
      const widthPct = (b.n / maxBand * 100).toFixed(1);
      const pctOfAll = dist.totalAthletes ? (b.n / dist.totalAthletes * 100).toFixed(1) : '0.0';
      const isFull = b.stops.length === STAGE_ORDER.length;
      hist += '<div class="pm-fin-hist-bar' + (isFull ? ' full' : '') + '">' +
        '<div class="pm-fin-hist-label">' + escapeHtml(b.label || '(none)') +
          '<span class="cost-tag">' + fmtMoney(b.cost) + ' per athlete</span>' +
        '</div>' +
        '<div class="pm-fin-hist-bar-track">' +
          '<div class="pm-fin-hist-bar-fill" style="width: ' + widthPct + '%"></div>' +
        '</div>' +
        '<div class="pm-fin-hist-count">' + fmtNum(b.n) +
          '<span class="pct">' + pctOfAll + '% of all</span>' +
        '</div>' +
      '</div>';
    });

    // Summary
    const avgCost = dist.totalAthletes ? dist.totalRevenue / dist.totalAthletes : 0;
    const fullCircuitCost = STAGE_ORDER.reduce((a, s) => a + (fees[s] || 0), 0);
    hist += '<div class="pm-fin-summary">' +
      '<div class="pm-fin-summary-item">' +
        '<div class="label">Average per athlete</div>' +
        '<div class="value">' + fmtMoney(avgCost) + '</div>' +
      '</div>' +
      '<div class="pm-fin-summary-item red">' +
        '<div class="label">Full-circuit reference cost</div>' +
        '<div class="value">' + fmtMoney(fullCircuitCost) + '</div>' +
      '</div>' +
      '<div class="pm-fin-summary-item amber">' +
        '<div class="label">Total entry-fee revenue</div>' +
        '<div class="value">' + fmtMoney(dist.totalRevenue) + '</div>' +
      '</div>' +
    '</div>';
    hist += '</div>';

    const body =
      '<div class="pm-fin-hist-head" style="margin-bottom: 6px;">Entry-fee history &mdash; all years</div>' +
      '<div class="pm-fin-hist-sub" style="margin-bottom: 14px;">' +
        'Per-meet entry fees by year. The highlighted column is the year shown above. ' +
        'The 2026 E/W/C row is a new meet added to the circuit this year — flagged with a NEW badge.' +
      '</div>' +
      feeTable + hist;

    return sectionShell(5, 'Financial Breakdown — ' + year,
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
    // Filter dropdowns — apply across all sections
    document.querySelectorAll('[data-pm-filter]').forEach(el => {
      el.addEventListener('change', function(){
        const key = this.getAttribute('data-pm-filter');
        pmState.filters[key] = this.value;
        invalidateCache();
        renderPipeline();
      });
    });
    // Clear all filters
    const clearBtn = document.getElementById('pmFilterClear');
    if (clearBtn) clearBtn.addEventListener('click', function(){
      pmState.filters = { age_group: '', gender: '', discipline: '', zone: '', region: '' };
      invalidateCache();
      renderPipeline();
    });
    // Cohort starting-stage buttons (within section)
    document.querySelectorAll('[data-pm-cohort-stage]').forEach(el => {
      el.addEventListener('click', function(){
        const s = this.getAttribute('data-pm-cohort-stage');
        if (s && s !== pmState.cohortStartStage) {
          pmState.cohortStartStage = s;
          pmState.cohortCache = {};  // invalidate just this section's cache
          renderPipeline();
        }
      });
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
    const stageContent = document.getElementById('stageContent');
    if (!stageContent) return;

    // Find or create the dashboard container (sibling to the regular
    // kpi-row + workspace inside #stageContent). Using a separate
    // container instead of overwriting #stageContent.innerHTML
    // preserves the original DOM so we can switch back to other
    // stages without breaking them.
    let dash = document.getElementById('pmDashboard');
    if (!dash) {
      dash = document.createElement('div');
      dash.id = 'pmDashboard';
      stageContent.appendChild(dash);
    }

    // First-load: show shell with spinner
    dash.innerHTML =
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
        dash.innerHTML =
          '<div class="pm-root">' + renderHero() +
            '<div class="pm-error"><strong>No data available.</strong> Neon returned no Junior Circuit results. ' +
            'Check that data has been ingested and the <code>is_junior_circuit</code> flag is set on rows in <code>core.event_results</code>.</div>' +
          '</div>';
        return;
      }

      // Load all needed data in parallel
      const [filterOpts, funnel, demo, cohort, retention] = await Promise.all([
        loadFilterOptions(),
        loadFunnelData(pmState.selectedYear),
        loadDemographicsData(pmState.selectedYear),
        loadCohortProgression(pmState.selectedYear, pmState.cohortStartStage),
        loadRetentionRates(),
      ]);

      // Render skeleton with controls
      dash.innerHTML =
        '<div class="pm-root">' +
          renderHero() +
          renderControls() +
          renderFunnelSection(pmState.selectedYear, funnel) +
          renderDemographicsSection(pmState.selectedYear, demo) +
          renderCohortSection(pmState.selectedYear, cohort) +
          renderRetentionSection(retention) +
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
      dash.innerHTML =
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
