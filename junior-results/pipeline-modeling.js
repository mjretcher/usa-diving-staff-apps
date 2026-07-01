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

  /* Nominal end-of-window for each stage, per the rulebook competition calendar
     (Art. 301.2): Regions ~ first weekend of May, Zones ~ first weekend of June,
     E/W/C ends July 3, Junior Nationals ~ early August. A small buffer is added
     for results being entered after the last day of competition. Used only to
     tell whether a stage that already has SOME results is still being contested
     (so we don't present a half-finished meet as a settled, final stage). The
     check is client-side against the viewer's current date, so it self-resolves
     once a meet wraps. */
  function stageEndDate(year, stage){
    year = Number(year);
    switch (stage) {
      case 'Regionals': return new Date(year, 4, 12);  // ~May 12
      case 'Zones':     return new Date(year, 5, 10);  // ~June 10
      case 'EWC':       return new Date(year, 6, 4);   // July 3 + buffer
      case 'Nationals': return new Date(year, 7, 15);  // ~mid-August
      default: return null;
    }
  }
  /* Explicit "officially concluded & finalized" overrides. The date check
     below is only a fallback for telling whether a stage with partial results
     is still being contested. When USA Diving has certified a stage's results
     as final — including when a meet wraps ahead of its nominal calendar
     window — list it here so the app treats it as complete regardless of the
     viewer's current date. Key format: `${year}:${stage}`. */
  const STAGE_FINALIZED = {
    '2026:EWC': true,   // East/Central/West Championships — results final
  };
  // 'not_started' (no results yet) | 'in_progress' (some results, still being
  // contested) | 'complete' (finalized, or the calendar window has passed).
  function stageStatus(year, stage, hasData){
    if (!hasData) return 'not_started';
    if (STAGE_FINALIZED[Number(year) + ':' + stage]) return 'complete';
    const end = stageEndDate(year, stage);
    if (!end) return 'complete';
    return (Date.now() <= end.getTime()) ? 'in_progress' : 'complete';
  }

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
    lens: 'divers',            // pipeline metric: 'divers' (unique athletes) | 'entries' (event qualifications) — a SEPARATE evaluation, never blended
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
    cohortCompareYears: [],         // cross-cohort comparison (empty = single year)
    // Score & placement section state
    scoringStage:   'Nationals',    // which stage's score distribution to show
    // Athlete career trace state
    careerQuery:    '',             // search box text
    careerResults:  null,           // search candidate list
    careerSelectedId: null,         // chosen diver_id_dm
    careerData:     null,           // that diver's loaded history
    filterOptions: null,       // distinct values discovered from Neon
    funnelCache:    {},        // by year+filters key
    yoyCache:       null,      // by filters key
    demoCache:      {},        // by year+filters key
    cohortCache:    {},        // by year+startStage+filters key
    cohortCompareCache: {},    // by years+startStage+filters key
    retentionCache: null,      // by filters key
    scoringCache:   {},        // by year+stage+filters key
    careerCache:    {},        // by diverId
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

  // SQL predicate that drops events which are NOT part of the Junior qualification
  // pipeline, so they never inflate participation / advancement counts:
  //   - Future Champions, incl. the abbreviated "FC Level N" events inside Region meets
  //   - Senior / "open" events run alongside a junior meet
  //   - host-added non-championship events: "Non Qualifier ...", Intermediate, Novice
  //     (e.g. 2026 Zone C "Non Qualifier", Zone D Intermediate/Novice)
  // NOTE: platform at Regionals is also non-qualifying, but per policy it stays
  // VISIBLE with an asterisk (handled by the asterisk logic), so it is deliberately
  // NOT removed here. Gated by the same toggle as before (default = excluded).
  function nonQualSql(){
    return " AND (meet_name NOT ILIKE '%Future Champions%' " +
           "AND event_name NOT ILIKE '%Future Champions%' " +
           "AND event_name NOT ILIKE 'FC %' " +
           "AND event_name NOT ILIKE 'Senior %' " +
           "AND event_name NOT ILIKE '%Non Qualifier%' " +
           "AND event_name NOT ILIKE '%Intermediate%' " +
           "AND event_name NOT ILIKE '%Novice%')";
  }

  // SQL predicate restricting to the INDIVIDUAL qualifying disciplines
  // (1m / 3m / platform). Synchronized events carry their own discipline
  // values (Synchro-3M, Synchro-Platform) and a handful are unparsed (NULL);
  // none of those advance through the individual Region -> Zone -> E/W/C ->
  // Junior Nationals pipeline, so they must never inflate individual athlete
  // counts, event-entry counts, transitions, or placement tiers. Always on:
  // synchro is a separate discipline, not a "non-qualifying" toggle choice.
  function indivSql(){
    return " AND discipline IN ('1M','3M','Platform')";
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
      "WHERE year = $1 AND " + whereJrCircuit() + indivSql() + (pmState.excludeFutureChamps ? nonQualSql() : '') + fb.sql + " " +
      "GROUP BY stage";
    const stagesR = await neonQ(stagesSql, [year].concat(fb.params));

    // 2) Asterisked counts — always queried so we can show "X were marked
    //    non-qualifying" footnote. Master filters apply so the count lines
    //    up with the filtered view. Future-Champions filter applies per toggle.
    const astFb = { sql: '', params: [] };
    let astParamIdx = 2;
    const f2 = pmState.filters;
    if (pmState.excludeFutureChamps) astFb.sql += nonQualSql();
    if (f2.age_group)  { astFb.sql += " AND age_group = $" + astParamIdx;  astFb.params.push(f2.age_group);  astParamIdx++; }
    if (f2.gender)     { astFb.sql += " AND gender = $" + astParamIdx;     astFb.params.push(f2.gender);     astParamIdx++; }
    if (f2.discipline) { astFb.sql += " AND discipline = $" + astParamIdx; astFb.params.push(f2.discipline); astParamIdx++; }
    if (f2.zone)       { astFb.sql += " AND zone = $" + astParamIdx;       astFb.params.push(f2.zone);       astParamIdx++; }
    const astSql =
      "SELECT stage, " +
      "  CASE " +
      "    WHEN stage = 'Regionals' AND discipline = 'Platform' THEN 'platform_at_regionals' " +
      "    WHEN stage = 'Regionals' AND year = 2026 AND age_group IN ('Group C','Group D') THEN 'group_cd_at_regionals_2026' " +
      "    ELSE 'other' END AS reason, " +
      "  COUNT(DISTINCT diver_id_dm)::int AS unique_athletes, " +
      "  COUNT(*)::int AS event_entries " +
      "FROM core.event_results " +
      "WHERE year = $1 AND " + whereJrCircuit() + astFb.sql + " " +
      "AND ((stage = 'Regionals' AND discipline = 'Platform') " +
      "  OR (stage = 'Regionals' AND year = 2026 AND age_group IN ('Group C','Group D'))) " +
      "GROUP BY stage, reason";
    const astR = await neonQ(astSql, [year].concat(astFb.params));

    // 3) Stage transitions: athletes who appear at both stage N and N+1
    //    (this gives us the "advanced" count for the funnel)
    const transFb = buildFiltersSql(2);
    const transSql =
      "WITH per_stage AS ( " +
      "  SELECT stage, diver_id_dm FROM core.event_results " +
      "  WHERE year = $1 AND " + whereJrCircuit() + indivSql() + (pmState.excludeFutureChamps ? nonQualSql() : '') + transFb.sql + " " +
      "  GROUP BY stage, diver_id_dm " +
      ") " +
      "SELECT a.stage AS from_stage, b.stage AS to_stage, " +
      "  COUNT(DISTINCT a.diver_id_dm)::int AS advanced " +
      "FROM per_stage a JOIN per_stage b ON a.diver_id_dm = b.diver_id_dm " +
      "WHERE a.stage <> b.stage " +
      "GROUP BY a.stage, b.stage";
    const transR = await neonQ(transSql, [year].concat(transFb.params));

    // 3b) ENTRY-level transitions: an *entry* (diver in a specific event) that
    //     appears at both stage N and N+1. This is the entries-lens analogue of
    //     (3): a diver who advances in two events counts as two advancing entries,
    //     and an event a diver picks up only at the later stage is a fresh entry.
    //     Computed independently so the entries lens never borrows athlete math.
    const entFb = buildFiltersSql(2);
    const entTransSql =
      "WITH per_entry AS ( " +
      "  SELECT stage, diver_id_dm, event_key FROM core.event_results " +
      "  WHERE year = $1 AND " + whereJrCircuit() + indivSql() + (pmState.excludeFutureChamps ? nonQualSql() : '') + entFb.sql + " " +
      "  GROUP BY stage, diver_id_dm, event_key " +
      ") " +
      "SELECT a.stage AS from_stage, b.stage AS to_stage, " +
      "  COUNT(*)::int AS advanced " +
      "FROM per_entry a JOIN per_entry b " +
      "  ON a.diver_id_dm = b.diver_id_dm AND a.event_key = b.event_key " +
      "WHERE a.stage <> b.stage " +
      "GROUP BY a.stage, b.stage";
    const entTransR = await neonQ(entTransSql, [year].concat(entFb.params));

    const out = {
      year,
      stages: {},           // stage -> { unique_athletes, event_entries }
      asterisked: {},       // stage -> { reason: { unique_athletes, event_entries } }
      transitions: {},      // "from->to" -> advanced DIVERS (athlete lens)
      entryTransitions: {}, // "from->to" -> advanced ENTRIES (entries lens)
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
    entTransR.rows.forEach(r => {
      out.entryTransitions[r.from_stage + '->' + r.to_stage] = Number(r.advanced) || 0;
    });

    /* ── Projected Junior Nationals (computed by placement) ───────────────
       When the championship has not been scored yet — a new-system season
       (2026+) where E/W/C is complete but Nationals has no results — the
       qualifier field is still KNOWABLE from the finalized upstream results.
       We compute it with the SAME rule the Nationals tab / official computed
       list uses: top-3 by placement on the DECIDING round (the latest round
       contested for that event at that meet — Final if held, otherwise the
       highest round present) per event, per meet, at E/W/C, plus the Zones
       top-3 that advance DIRECTLY (bypassing E/W/C). Filters mirror the river
       bars exactly so the projection is a true subset of the E/W/C field.
       Preliminary by design — placement only; no registration-dependent
       adjustments and no pre-qualified / skip-stage adds. Null on any failure
       so the section falls back to the plain "results pending" ghost. */
    out.projectedNationals = null;
    if (Number(year) >= 2026
        && out.stages.Nationals.unique_athletes === 0
        && out.stages.EWC.unique_athletes > 0) {
      try {
        const pjFb = buildFiltersSql(2);
        const baseWhere =
          "year = $1 AND " + whereJrCircuit() + indivSql() +
          (pmState.excludeFutureChamps ? nonQualSql() : '') + pjFb.sql +
          " AND place IS NOT NULL";
        const projSql =
          "WITH base AS (" +
          "  SELECT stage, event_key, ewc_meet, zone, diver_id_dm, place, " +
          "    CASE WHEN round ILIKE 'final%' THEN 3 WHEN round ILIKE 'semi%' THEN 2 " +
          "         WHEN round ILIKE 'prelim%' THEN 1 ELSE 0 END AS rr " +
          "  FROM core.event_results WHERE " + baseWhere +
          "), " +
          "ewc_r AS (SELECT diver_id_dm, event_key, place, rr, " +
          "    MAX(rr) OVER (PARTITION BY event_key, ewc_meet) AS mrr " +
          "  FROM base WHERE stage = 'EWC'), " +
          "ewc_q AS (SELECT DISTINCT diver_id_dm, event_key FROM ewc_r " +
          "  WHERE rr = mrr AND place BETWEEN 1 AND 3), " +
          "zon_r AS (SELECT diver_id_dm, event_key, place, rr, " +
          "    MAX(rr) OVER (PARTITION BY event_key, zone) AS mrr " +
          "  FROM base WHERE stage = 'Zones'), " +
          "zon_q AS (SELECT DISTINCT diver_id_dm, event_key FROM zon_r " +
          "  WHERE rr = mrr AND place BETWEEN 1 AND 3) " +
          "SELECT " +
          "  (SELECT COUNT(*)::int FROM ewc_q) AS ewc_slots, " +
          "  (SELECT COUNT(DISTINCT diver_id_dm)::int FROM ewc_q) AS ewc_divers, " +
          "  (SELECT COUNT(*)::int FROM zon_q) AS zon_slots, " +
          "  (SELECT COUNT(DISTINCT diver_id_dm)::int FROM zon_q) AS zon_divers, " +
          "  (SELECT COUNT(*)::int FROM (SELECT diver_id_dm, event_key FROM ewc_q " +
          "    UNION SELECT diver_id_dm, event_key FROM zon_q) u) AS proj_slots, " +
          "  (SELECT COUNT(DISTINCT diver_id_dm)::int FROM (SELECT diver_id_dm FROM ewc_q " +
          "    UNION SELECT diver_id_dm FROM zon_q) v) AS proj_divers";
        const pj = await neonQ(projSql, [year].concat(pjFb.params));
        const pr = (pj.rows && pj.rows[0]) || {};
        out.projectedNationals = {
          ewcSlots:   Number(pr.ewc_slots)  || 0,
          ewcDivers:  Number(pr.ewc_divers) || 0,
          zonSlots:   Number(pr.zon_slots)  || 0,
          zonDivers:  Number(pr.zon_divers) || 0,
          projSlots:  Number(pr.proj_slots) || 0,
          projDivers: Number(pr.proj_divers)|| 0,
        };
      } catch (e) {
        out.projectedNationals = null;
      }
    }

    /* ── Zones → E/W/C advancement breakdown, by age group ────────────────
       Splits the Zones field into four mutually-exclusive outcomes so the
       "did not advance" number stops conflating very different situations:
         • direct    — Zones top-3, advanced DIRECTLY to Junior Nationals
                       (these bypass E/W/C, so co-occurrence wrongly reads them
                        as "stopped" — this is what inflates the raw exit number)
         • ewc_reg   — qualified to E/W/C (Zones 4–18) AND registered/competed
         • ewc_noreg — qualified to E/W/C (Zones 4–18) but did NOT register
         • not_qual  — did not place high enough to qualify (Zones 19+)
       Placement is the deciding-round place per event/zone; non-displacing
       (127) entries are excluded. Returned at BOTH the entry (event-
       qualification) and diver (best-outcome) levels, per age group. 2026+
       only (the era with the Zones-direct / E/W/C structure). */
    out.advBreakdown = null;
    if (Number(year) >= 2026
        && out.stages.Zones.unique_athletes > 0
        && out.stages.EWC.unique_athletes > 0) {
      try {
        const abFb = buildFiltersSql(2);
        const flt = (pmState.excludeFutureChamps ? nonQualSql() : '') + abFb.sql;
        const abSql =
          "WITH z AS (" +
          "  SELECT diver_id_dm, age_group, event_key, zone, place, " +
          "    CASE WHEN round ILIKE 'final%' THEN 3 WHEN round ILIKE 'semi%' THEN 2 " +
          "         WHEN round ILIKE 'prelim%' THEN 1 ELSE 0 END AS rr " +
          "  FROM core.event_results " +
          "  WHERE year = $1 AND " + whereJrCircuit() + indivSql() + flt +
          "    AND stage = 'Zones' AND place IS NOT NULL AND place <> 127" +
          "), " +
          "zd AS (SELECT diver_id_dm, age_group, event_key, place FROM (" +
          "  SELECT diver_id_dm, age_group, event_key, place, rr, " +
          "    MAX(rr) OVER (PARTITION BY event_key, zone) AS mrr FROM z) t WHERE rr = mrr), " +
          "ereg AS (SELECT DISTINCT diver_id_dm, event_key FROM core.event_results " +
          "  WHERE year = $1 AND " + whereJrCircuit() + indivSql() + flt + " AND stage = 'EWC'), " +
          "ent AS (SELECT zd.age_group, zd.diver_id_dm, " +
          "    CASE WHEN zd.place BETWEEN 1 AND 3 THEN 'direct' " +
          "         WHEN zd.place BETWEEN 4 AND 18 AND er.diver_id_dm IS NOT NULL THEN 'ewc_reg' " +
          "         WHEN zd.place BETWEEN 4 AND 18 THEN 'ewc_noreg' " +
          "         ELSE 'not_qual' END AS bucket " +
          "  FROM zd LEFT JOIN ereg er ON er.diver_id_dm = zd.diver_id_dm AND er.event_key = zd.event_key), " +
          "divr AS (SELECT diver_id_dm, MAX(age_group) AS age_group, " +
          "    CASE WHEN bool_or(bucket='direct') THEN 'direct' " +
          "         WHEN bool_or(bucket='ewc_reg') THEN 'ewc_reg' " +
          "         WHEN bool_or(bucket='ewc_noreg') THEN 'ewc_noreg' " +
          "         ELSE 'not_qual' END AS bucket FROM ent GROUP BY diver_id_dm) " +
          "SELECT 'ent' AS lvl, age_group, bucket, COUNT(*)::int AS n FROM ent GROUP BY age_group, bucket " +
          "UNION ALL " +
          "SELECT 'div' AS lvl, age_group, bucket, COUNT(*)::int AS n FROM divr GROUP BY age_group, bucket";
        const ab = await neonQ(abSql, [year].concat(abFb.params));
        const div = {}, ent = {}, ageSet = {};
        (ab.rows || []).forEach(function(r){
          const tgt = (r.lvl === 'div') ? div : ent;
          const ag = r.age_group || 'Unspecified';
          ageSet[ag] = true;
          if (!tgt[ag]) tgt[ag] = { direct:0, ewc_reg:0, ewc_noreg:0, not_qual:0 };
          if (tgt[ag][r.bucket] !== undefined) tgt[ag][r.bucket] = Number(r.n) || 0;
        });
        const ageOrder = Object.keys(ageSet).sort();
        out.advBreakdown = { mode: 'ewc', div: div, ent: ent, ageOrder: ageOrder };
      } catch (e) {
        out.advBreakdown = null;
      }
    }

    /* ── Pre-2026 (old system) advancement breakdown, by age group ────────
       The pre-2026 circuit had NO E/W/C tier: the gate is Zones → Junior
       Nationals directly. Qualification is discipline-dependent on the
       deciding-round placement — springboard (1M/3M) top 10, platform top 7
       — matching qualifiedAt() and the pipeline river convention. Splits the
       Zones field into three mutually-exclusive outcomes so the "did not
       advance" number stops conflating two very different facts:
         • nat_reg   — reached Junior Nationals (competed there)
         • nat_noreg — qualified (top 10 / top 7) but did NOT compete
         • not_qual  — did not place high enough to qualify
       Non-displacing exhibition entries (place 127) are excluded, exactly as
       the 2026 path and every other pipeline computation treat them. The
       DIVER level is attendance-based (did the diver reach Nationals at all),
       so it reconciles exactly to the funnel's Zones-exit number; the ENTRY
       level is per event-spot (was this specific qualified spot used). Only
       runs for years with both Zones and Nationals results, so a year missing
       Nationals data can never mislabel everyone as a no-show. */
    if (out.advBreakdown === null
        && Number(year) < 2026
        && out.stages.Zones.unique_athletes > 0
        && out.stages.Nationals.unique_athletes > 0) {
      try {
        const pbFb = buildFiltersSql(2);
        const flt = (pmState.excludeFutureChamps ? nonQualSql() : '') + pbFb.sql;
        const pbSql =
          "WITH z AS (" +
          "  SELECT diver_id_dm, age_group, event_key, discipline, zone, place, " +
          "    CASE WHEN round ILIKE 'final%' THEN 3 WHEN round ILIKE 'semi%' THEN 2 " +
          "         WHEN round ILIKE 'prelim%' THEN 1 ELSE 0 END AS rr " +
          "  FROM core.event_results " +
          "  WHERE year = $1 AND " + whereJrCircuit() + indivSql() + flt +
          "    AND stage = 'Zones' AND place IS NOT NULL AND place <> 127" +
          "), " +
          "zd AS (SELECT diver_id_dm, age_group, event_key, discipline, place, " +
          "    ((discipline IN ('1M','3M') AND place <= 10) OR (discipline = 'Platform' AND place <= 7)) AS qualified " +
          "  FROM (SELECT z.*, MAX(rr) OVER (PARTITION BY event_key, zone, diver_id_dm) AS mrr FROM z) t " +
          "  WHERE rr = mrr), " +
          "natE AS (SELECT DISTINCT diver_id_dm, event_key FROM core.event_results " +
          "  WHERE year = $1 AND " + whereJrCircuit() + indivSql() + flt + " AND stage = 'Nationals'), " +
          "natD AS (SELECT DISTINCT diver_id_dm FROM core.event_results " +
          "  WHERE year = $1 AND " + whereJrCircuit() + indivSql() + flt + " AND stage = 'Nationals'), " +
          "ent AS (SELECT zd.age_group, " +
          "    CASE WHEN zd.qualified AND ne.diver_id_dm IS NOT NULL THEN 'nat_reg' " +
          "         WHEN zd.qualified THEN 'nat_noreg' " +
          "         ELSE 'not_qual' END AS bucket " +
          "  FROM zd LEFT JOIN natE ne ON ne.diver_id_dm = zd.diver_id_dm AND ne.event_key = zd.event_key), " +
          "zdiv AS (SELECT diver_id_dm, MAX(age_group) AS age_group, bool_or(qualified) AS qualified FROM zd GROUP BY diver_id_dm), " +
          "divr AS (SELECT zdiv.age_group, " +
          "    CASE WHEN nd.diver_id_dm IS NOT NULL THEN 'nat_reg' " +
          "         WHEN zdiv.qualified THEN 'nat_noreg' " +
          "         ELSE 'not_qual' END AS bucket " +
          "  FROM zdiv LEFT JOIN natD nd ON nd.diver_id_dm = zdiv.diver_id_dm) " +
          "SELECT 'ent' AS lvl, age_group, bucket, COUNT(*)::int AS n FROM ent GROUP BY age_group, bucket " +
          "UNION ALL " +
          "SELECT 'div' AS lvl, age_group, bucket, COUNT(*)::int AS n FROM divr GROUP BY age_group, bucket";
        const pb = await neonQ(pbSql, [year].concat(pbFb.params));
        const div = {}, ent = {}, ageSet = {};
        (pb.rows || []).forEach(function(r){
          const tgt = (r.lvl === 'div') ? div : ent;
          const ag = r.age_group || 'Unspecified';
          ageSet[ag] = true;
          if (!tgt[ag]) tgt[ag] = { nat_reg:0, nat_noreg:0, not_qual:0 };
          if (tgt[ag][r.bucket] !== undefined) tgt[ag][r.bucket] = Number(r.n) || 0;
        });
        const ageOrder = Object.keys(ageSet).sort();
        out.advBreakdown = { mode: 'nats', div: div, ent: ent, ageOrder: ageOrder };
      } catch (e) {
        out.advBreakdown = null;
      }
    }

    pmState.funnelCache[ck] = out;
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
      "  WHERE year = $1 AND stage = $2 AND " + whereJrCircuit() + indivSql() + " " +
      "    AND diver_id_dm IS NOT NULL " +
      (pmState.excludeFutureChamps ? nonQualSql() : '') +
      fb.sql + " " +
      "), " +
      "journey AS ( " +
      "  SELECT er.diver_id_dm, er.stage, " +
      "    MIN(er.place) FILTER (WHERE er.place <> 127) AS best_place, " +
      "    BOOL_OR(er.round = 'Prelim')    AS had_prelim, " +
      "    BOOL_OR(er.round = 'Semifinal') AS had_semi, " +
      "    BOOL_OR(er.round = 'Final')     AS had_final " +
      "  FROM core.event_results er " +
      "  JOIN cohort c ON c.diver_id_dm = er.diver_id_dm " +
      "  WHERE er.year = $1 AND " + whereJrCircuit() + indivSql() + " " +
      (pmState.excludeFutureChamps ? nonQualSql() : '') +
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
      (pmState.excludeFutureChamps ? nonQualSql() : '') +
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
      "GROUP BY discipline, stage";
    const r = await neonQ(sql, [year].concat(fb.params));

    // Pivot into per-dimension matrices
    const out = { age: {}, gender: {}, discipline: {}, zone: {} };
    r.rows.forEach(row => {
      const d = row.dim, b = row.bucket, s = row.stage, n = Number(row.athletes) || 0;
      if (!out[d]) return;
      if (!out[d][b]) out[d][b] = {};
      out[d][b][s] = n;
    });

    // Zone needs special handling. Regionals rows carry a REGION (1-12) but no
    // zone; Zones rows carry a ZONE (A-F) but no region; E/W/C rows carry
    // neither. USA Diving groups regions into zones two-at-a-time, so we derive
    // each diver's "home zone" (their Zones zone if present, otherwise mapped
    // from their Regionals region) and attribute every stage to it — this is
    // why the chart no longer dumps everyone into a single "(unknown)" bucket.
    const regionToZone =
      "CASE WHEN region IN (1,2) THEN 'A' WHEN region IN (3,4) THEN 'B' " +
      "WHEN region IN (5,6) THEN 'C' WHEN region IN (7,8) THEN 'D' " +
      "WHEN region IN (9,10) THEN 'E' WHEN region IN (11,12) THEN 'F' END";
    const zoneSql =
      "WITH dz AS (" +
      "  SELECT diver_id_dm, COALESCE(MAX(zone), MAX(" + regionToZone + ")) AS home_zone " +
      "  FROM core.event_results " +
      "  WHERE year = $1 AND " + whereJrCircuit() + fb.sql + " " +
      "  GROUP BY diver_id_dm" +
      ") " +
      "SELECT COALESCE(dz.home_zone, '(unknown)') AS bucket, er.stage AS stage, " +
      "  COUNT(DISTINCT er.diver_id_dm)::int AS athletes " +
      "FROM core.event_results er JOIN dz ON dz.diver_id_dm = er.diver_id_dm " +
      "WHERE er.year = $1 AND " + whereJrCircuit() + fb.sql + " " +
      "GROUP BY dz.home_zone, er.stage";
    try {
      const rz = await neonQ(zoneSql, [year].concat(fb.params));
      rz.rows.forEach(row => {
        const b = row.bucket, s = row.stage, n = Number(row.athletes) || 0;
        if (!out.zone[b]) out.zone[b] = {};
        out.zone[b][s] = n;
      });
    } catch (e) { /* leave zone empty on failure rather than break the section */ }

    pmState.demoCache[ck] = out;
    return out;
  }

  /* === CROSS-COHORT COMPARISON (#2) ===========================================
   * Run loadCohortProgression for multiple years and return them together so
   * the renderer can overlay trajectories. Reuses the single-cohort loader.
   * ========================================================================== */
  async function loadCohortComparison(years, startStage){
    const ck = years.slice().sort().join(',') + '|cmp|' + startStage + '|' + cacheKey('x');
    if (pmState.cohortCompareCache[ck]) return pmState.cohortCompareCache[ck];
    const results = await Promise.all(years.map(y => loadCohortProgression(y, startStage)));
    const out = results.map((data, i) => ({ year: years[i], data: data }));
    pmState.cohortCompareCache[ck] = out;
    return out;
  }

  /* === SCORE & PLACEMENT DISTRIBUTION (#1) ====================================
   * Per-event score distribution at a chosen stage: min / Q1 / median / Q3 /
   * max / mean / stddev / n via PERCENTILE_CONT, plus the 15th-best score
   * (advancement-cutoff proxy) so we can draw it as a reference line.
   * Uses each athlete's best score per event (MAX across rounds).
   * ========================================================================== */
  async function loadScoringData(year, stage){
    const ck = cacheKey(year) + '|score|' + stage;
    if (pmState.scoringCache[ck]) return pmState.scoringCache[ck];
    const fb = buildFiltersSql(3);  // $1=year, $2=stage, $3+=filters

    const sql =
      "WITH scored AS ( " +
      "  SELECT event_key, " +
      "    MAX(event_name) AS event_name, MAX(discipline) AS discipline, " +
      "    MAX(age_group) AS age_group, MAX(gender) AS gender, " +
      "    diver_id_dm, MAX(score) AS best_score " +
      "  FROM core.event_results " +
      "  WHERE year = $1 AND stage = $2 AND " + whereJrCircuit() + " " +
      "    AND score IS NOT NULL AND score > 0 " +
      (pmState.excludeFutureChamps ? nonQualSql() : '') +
      fb.sql + " " +
      "  GROUP BY event_key, diver_id_dm " +
      ") " +
      "SELECT event_key, " +
      "  MAX(event_name) AS event_name, MAX(discipline) AS discipline, " +
      "  MAX(age_group) AS age_group, MAX(gender) AS gender, " +
      "  COUNT(*)::int AS n, " +
      "  MIN(best_score)::numeric AS min_s, " +
      "  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY best_score)::numeric AS q1, " +
      "  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY best_score)::numeric AS median_s, " +
      "  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY best_score)::numeric AS q3, " +
      "  MAX(best_score)::numeric AS max_s, " +
      "  AVG(best_score)::numeric AS mean_s, " +
      "  STDDEV_POP(best_score)::numeric AS sd_s, " +
      "  (SELECT s2.best_score FROM scored s2 WHERE s2.event_key = scored.event_key " +
      "    ORDER BY s2.best_score DESC OFFSET 17 LIMIT 1)::numeric AS cutoff_18th " +
      "FROM scored " +
      "GROUP BY event_key " +
      "HAVING COUNT(*) >= 6 " +
      "ORDER BY age_group, gender, discipline";
    const r = await neonQ(sql, [year, stage].concat(fb.params));

    const out = r.rows.map(row => ({
      event_key: row.event_key,
      event_name: row.event_name,
      discipline: row.discipline,
      age_group: row.age_group,
      gender: row.gender,
      n: Number(row.n) || 0,
      min: Number(row.min_s) || 0,
      q1: Number(row.q1) || 0,
      median: Number(row.median_s) || 0,
      q3: Number(row.q3) || 0,
      max: Number(row.max_s) || 0,
      mean: Number(row.mean_s) || 0,
      sd: Number(row.sd_s) || 0,
      cutoff18: row.cutoff_18th != null ? Number(row.cutoff_18th) : null,
    }));
    pmState.scoringCache[ck] = out;
    return out;
  }

  /* === ATHLETE CAREER SEARCH + TRACE (#3) =====================================
   * Search core.divers by name or DiveMeets ID; trace one athlete's full
   * multi-year, multi-stage journey across the Junior Circuit.
   * ========================================================================== */
  async function searchAthletes(query){
    const term = (query || '').trim();
    if (term.length < 2) return [];
    if (/^\d+$/.test(term)) {
      const r = await neonQ(
        "SELECT diver_id_dm, first_name, last_name FROM core.divers WHERE diver_id_dm = $1 LIMIT 5",
        [term]
      );
      return r.rows.map(x => ({ id: x.diver_id_dm, first: x.first_name, last: x.last_name, count: null }));
    }
    const r = await neonQ(
      "SELECT d.diver_id_dm, d.first_name, d.last_name, COUNT(er.*)::int AS result_count " +
      "FROM core.divers d " +
      "JOIN core.event_results er ON er.diver_id_dm = d.diver_id_dm AND er.is_junior_circuit " +
      "WHERE (d.last_name ILIKE $1 OR d.first_name ILIKE $1 OR (d.first_name || ' ' || d.last_name) ILIKE $1) " +
      "GROUP BY d.diver_id_dm, d.first_name, d.last_name " +
      "ORDER BY result_count DESC LIMIT 20",
      ['%' + term + '%']
    );
    return r.rows.map(x => ({ id: x.diver_id_dm, first: x.first_name, last: x.last_name, count: Number(x.result_count) }));
  }

  async function loadAthleteCareer(diverId){
    const key = String(diverId);
    if (pmState.careerCache[key]) return pmState.careerCache[key];
    const nameR = await neonQ("SELECT first_name, last_name FROM core.divers WHERE diver_id_dm = $1", [key]);
    const name = nameR.rows.length ? (nameR.rows[0].first_name + ' ' + nameR.rows[0].last_name) : ('Diver ' + diverId);
    const r = await neonQ(
      "SELECT year, stage, meet_name, event_name, event_key, round, place, score, team_name, " +
      "  age_group, gender, discipline, zone, region " +
      "FROM core.event_results WHERE diver_id_dm = $1 AND is_junior_circuit " +
      "ORDER BY year, " +
      "  CASE stage WHEN 'Regionals' THEN 1 WHEN 'Zones' THEN 2 WHEN 'EWC' THEN 3 WHEN 'Nationals' THEN 4 ELSE 5 END, " +
      "  event_name, " +
      "  CASE round WHEN 'Prelim' THEN 1 WHEN 'Semifinal' THEN 2 WHEN 'Final' THEN 3 ELSE 4 END",
      [key]
    );
    const out = {
      id: diverId, name: name,
      rows: r.rows.map(x => ({
        year: Number(x.year), stage: x.stage, meet_name: x.meet_name,
        event_name: x.event_name, event_key: x.event_key, round: x.round,
        place: x.place != null ? Number(x.place) : null,
        score: x.score != null ? Number(x.score) : null,
        team_name: x.team_name, age_group: x.age_group, gender: x.gender,
        discipline: x.discipline, zone: x.zone, region: x.region,
      })),
    };
    pmState.careerCache[key] = out;
    return out;
  }

  /* === SPECIAL STATUS & FLAGS (#4) ============================================
   * Two sources, presented honestly:
   *  (a) "Declined Nationals" — computable from Neon across ALL years: athletes
   *      who placed in an advancing position at the prior stage but never
   *      appeared at the next stage. Mirrors the existing app's declined logic
   *      (pre-2026: Zones top-3 → Nationals; 2026+: Zones → EWC/Nationals).
   *  (b) Foreign / Dual / HPS / YMCA — only tracked client-side in
   *      window.USAD_EWC_DATA and only for 2026. We surface them when present
   *      and clearly note that status tracking began in 2026 otherwise.
   * ========================================================================== */
  async function loadStatusData(year){
    const ck = cacheKey(year) + '|status';
    if (pmState.statusCache && pmState.statusCache[ck]) return pmState.statusCache[ck];
    if (!pmState.statusCache) pmState.statusCache = {};
    const fb = buildFiltersSql(2);  // $1=year, $2+=filters

    // Declined: qualified at Zones (best place 1-3 pre-2026 advancing band, or
    // any Zones appearance 2026+) but did NOT appear at the next stage.
    const nextStageClause = year >= 2026
      ? "stage IN ('EWC','Nationals')"
      : "stage = 'Nationals'";
    const declinedSql =
      "WITH zone_qual AS ( " +
      "  SELECT diver_id_dm, MAX(age_group) AS age_group, MAX(gender) AS gender, MIN(place) AS best_place " +
      "  FROM core.event_results " +
      "  WHERE year = $1 AND stage = 'Zones' AND " + whereJrCircuit() + " AND place IS NOT NULL " +
      (pmState.excludeFutureChamps ? nonQualSql() : '') +
      fb.sql + " " +
      "  GROUP BY diver_id_dm " +              // ONE ROW PER ATHLETE (best finish across their events)
      "), " +
      "advanced AS ( " +
      "  SELECT DISTINCT diver_id_dm FROM core.event_results " +
      "  WHERE year = $1 AND " + nextStageClause + " AND " + whereJrCircuit() + " " +
      fb.sql + " " +
      ") " +
      "SELECT zq.age_group, zq.gender, " +
      "  COUNT(*)::int AS qualified, " +                                  // distinct athletes
      "  COUNT(*) FILTER (WHERE a.diver_id_dm IS NULL)::int AS declined " +
      "FROM zone_qual zq " +
      "LEFT JOIN advanced a ON a.diver_id_dm = zq.diver_id_dm " +
      "WHERE zq.best_place BETWEEN 1 AND 18 " +
      "GROUP BY zq.age_group, zq.gender " +
      "ORDER BY zq.age_group, zq.gender";
    let declinedRows = [];
    try {
      const dr = await neonQ(declinedSql, [year].concat(fb.params));
      declinedRows = dr.rows.map(x => ({
        age_group: x.age_group, gender: x.gender,
        qualified: Number(x.qualified) || 0, declined: Number(x.declined) || 0,
      }));
    } catch (e) { declinedRows = []; }

    // Client-side status flags (2026 only)
    const ewc = (typeof window !== 'undefined' && window.USAD_EWC_DATA) ? window.USAD_EWC_DATA : null;
    const flags = { tracked: false, hps: 0, foreign: 0, dual: 0, ymca: 0 };
    if (ewc && year >= 2026) {
      flags.tracked = true;
      flags.hps     = (ewc.hpsAthletes     || []).length;
      flags.foreign = (ewc.foreignAthletes || []).length;
      flags.dual    = (ewc.dualCitizens || ewc.dualCitizenAthletes || []).length;
      flags.ymca    = (ewc.ymcaAthletes    || []).length;
    }

    // The "did not continue" lens is only meaningful once the stages an athlete
    // could advance to have finished. In 2026 the season is still live (E/W/C
    // through early July, Junior Nationals in late July/August), so we flag it
    // and let the renderer hold the decline numbers back until it's decided.
    const advancementComplete = Date.now() > stageEndDate(year, 'Nationals').getTime();

    const out = { year, declined: declinedRows, flags, advancementComplete };
    pmState.statusCache[ck] = out;
    return out;
  }

  /* Clear caches when filter toggles change                            */
  function invalidateCache(){
    pmState.funnelCache = {};
    pmState.yoyCache = null;
    pmState.demoCache = {};
    pmState.cohortCache = {};
    pmState.cohortCompareCache = {};
    pmState.retentionCache = null;
    pmState.scoringCache = {};
    pmState.statusCache = {};
    // careerCache is keyed by diver id and not affected by filters; keep it.
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
            '<span>Exclude non-qualifying events</span>' +
            '<span class="pm-toggle-help" title="Excludes events that are not part of the qualifying pipeline: Future Champions (including the abbreviated &quot;FC Level&quot; events), Senior / open events, and host non-qualifying events (e.g. 2026 Zone C &quot;Non Qualifier&quot;, Zone D Intermediate / Novice). Default: ON (excluded). Platform at Regionals is non-qualifying too but is kept visible with an asterisk.">?</span>' +
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

        '<div class="pm-ctl-divider"></div>' +

        '<div class="pm-ctl-group">' +
          '<button data-pm-print onclick="window.PM_printRiver()" title="Print the river flow map, or save it as a clean landscape PDF" ' +
            'style="font-family:Inter,sans-serif;font-size:12.5px;font-weight:600;color:#fff;background:#171F69;border:none;border-radius:7px;padding:8px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px">&#128424; Print / Save PDF</button>' +
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
          dropdown('region',     'Region',     opts.region) +
        '</div>' +
      '</div>'
    );
  }

  /* ── SECTION 1: Qualification Pipeline (alluvial flow / "the river") ──
     Replaces the old vertical funnel. Shows TRUE cohort flow using the
     transition data: advancing current, real exits, and late entrants.
     Brand-locked, ADA-safe (red only ever sits on white), zero deps.    */
  function renderFunnelSection(year, data, printMode){
    if (!data) {
      return sectionShell(1, 'Qualification Pipeline — ' + year,
        'How the season\u2019s divers move from one stage to the next \u2014 the blue current carries everyone who advanced, red streams peel off where divers stopped, and a pale stream joining from below marks divers who entered straight at that stage.',
        '<div class="pm-loading"><div class="pm-loading-spinner"></div><div class="pm-loading-text">Loading the pipeline\u2026</div></div>');
    }

    /* ---- which stages actually have results, plus a trailing "pending" stage ---- */
    const has = function(s){ return data.stages[s] && data.stages[s].unique_athletes > 0; };
    let lastRealIdx = -1;
    STAGE_ORDER.forEach(function(s,i){ if (has(s)) lastRealIdx = i; });
    if (lastRealIdx < 0) {
      return sectionShell(1, 'Qualification Pipeline — ' + year,
        'How athletes flow from Regionals through to Junior Nationals for the selected season.',
        '<div class="pm-empty"><div class="pm-empty-title">No results yet</div>' +
        '<div class="pm-empty-sub">No Junior Circuit results found for ' + year + '. As meets are scored they will appear here.</div></div>');
    }
    const realStages = STAGE_ORDER.slice(0, lastRealIdx + 1).filter(has);
    let pendingStage = null;
    if (lastRealIdx < STAGE_ORDER.length - 1 && !has(STAGE_ORDER[lastRealIdx + 1])) {
      pendingStage = STAGE_ORDER[lastRealIdx + 1];
    }

    /* ---- per-stage counts ----
       Unique divers and event entries are computed as TWO separate evaluations
       and never blended into one figure. The active lens decides which one
       drives the river; the other lives only in its own clearly-labeled places
       (the cross-reference KPI and the dedicated "Two lenses" comparison). */
    const ATH = {}, ENT = {};
    realStages.forEach(function(s){ ATH[s] = data.stages[s].unique_athletes; ENT[s] = data.stages[s].event_entries; });
    const isEntries = printMode ? false : (pmState.lens === 'entries');
    const N  = isEntries ? ENT : ATH;   // active-lens per-stage count (drives the river)
    const EN = ENT;                     // entries always available (separate readout)
    const UNIT      = isEntries ? 'entries' : 'divers';
    const UNIT_ONE  = isEntries ? 'entry'   : 'diver';
    const transSrc  = isEntries ? (data.entryTransitions || {}) : (data.transitions || {});
    const maxN = realStages.reduce(function(m,s){ return Math.max(m, N[s]); }, 1);

    /* ---- TRUE transitions for the ACTIVE lens: advanced / exited / entered-fresh.
       Entries-lens advancement counts (diver, event) pairs that recur at the next
       stage — it borrows none of the athlete math. ---- */
    const A = [], EXIT = [], ENTER = [];
    ENTER[0] = 0;
    for (let i = 0; i < realStages.length - 1; i++){
      const advRaw = transSrc[realStages[i] + '->' + realStages[i+1]];
      const adv = (advRaw != null) ? advRaw : Math.min(N[realStages[i]], N[realStages[i+1]]);
      A[i] = adv;
      EXIT[i] = Math.max(0, N[realStages[i]] - adv);
      ENTER[i+1] = Math.max(0, N[realStages[i+1]] - adv);
    }

    const fees = ENTRY_FEES[year] || {};
    const fullCircuitCost = STAGE_ORDER.reduce(function(a,s){ return a + (fees[s] || 0); }, 0);
    const nationalsHasData = has('Nationals');

    /* Projected Junior Nationals field (only when 'Nationals' is the pending
       stage and the placement-derived projection was computed). projActive is
       the DISTINCT union in the active lens; projEwc / projZon are the two
       feeder paths (E/W/C top-3 and Zones direct top-3) used to size ribbons. */
    const proj = (pendingStage === 'Nationals') ? (data.projectedNationals || null) : null;
    const projActive = proj ? (isEntries ? proj.projSlots : proj.projDivers) : 0;
    const projEwc    = proj ? (isEntries ? proj.ewcSlots  : proj.ewcDivers)  : 0;
    const projZon    = proj ? (isEntries ? proj.zonSlots  : proj.zonDivers)  : 0;

    /* ── Zones → E/W/C advancement breakdown in the ACTIVE lens ──────────
       Used to (a) split the "did not advance" number into its two real
       reasons and (b) correct the Zones exit so divers who advanced DIRECT
       to Junior Nationals (Zones top-3, bypassing E/W/C) are no longer
       miscounted as "stopped". abByAge powers the dedicated breakdown card. */
    const abSrc = data.advBreakdown ? (isEntries ? data.advBreakdown.ent : data.advBreakdown.div) : null;
    const abOrder = data.advBreakdown ? data.advBreakdown.ageOrder : [];
    let abTot = null;
    const abMode = data.advBreakdown ? data.advBreakdown.mode : null;
    if (abSrc) {
      // Init every possible bucket to 0 so either era aggregates cleanly.
      abTot = { direct:0, ewc_reg:0, ewc_noreg:0, not_qual:0, nat_reg:0, nat_noreg:0 };
      abOrder.forEach(function(ag){
        const r = abSrc[ag] || {};
        Object.keys(abTot).forEach(function(k){ abTot[k] += r[k] || 0; });
      });
    }
    // Correct the Zones-gate exit so the funnel's exit number equals the split
    // sum exactly (genuine non-advancers only). 2026: qualified-but-unregistered
    // + did-not-qualify, with the Zones top-3 direct-to-Nationals shown flowing
    // into the projected basin instead. Pre-2026: qualified-but-didn't-compete
    // + did-not-qualify, straight into Junior Nationals (no direct-bypass tier).
    const exitSplit = {};   // gate index -> { noreg, notqual } for the relabeled tributary
    if (abTot) {
      const zi = realStages.indexOf('Zones');
      if (zi >= 0 && zi < realStages.length - 1) {
        const noreg = (abMode === 'nats') ? abTot.nat_noreg : abTot.ewc_noreg;
        EXIT[zi] = noreg + abTot.not_qual;
        exitSplit[zi] = { noreg: noreg, notqual: abTot.not_qual };
      }
    }

    /* ---- is the deepest stage still being contested? (e.g. E/W/C mid-meet) ---- */
    const deepStageName = realStages[realStages.length - 1];
    const deepInProgress = stageStatus(year, deepStageName, true) === 'in_progress';
    const lastGate = realStages.length - 2;  // gate INTO the deepest stage (-1 if single stage)

    /* ======================= KPI STRIP (re-framed) ======================= */
    const entryStage = realStages[0];
    const deepStage  = realStages[realStages.length - 1];

    // biggest single-gate drop-off — only over COMPLETED gates. A still-running
    // stage has no trustworthy drop-off yet, so skip the gate leading into it.
    let bigIdx = -1, bigVal = -1;
    EXIT.forEach(function(v,i){ if (deepInProgress && i === lastGate) return; if (v > bigVal){ bigVal = v; bigIdx = i; } });
    // largest late-entry inflow (also skip the still-running stage)
    let entIdx = -1, entVal = -1;
    ENTER.forEach(function(v,i){ if (deepInProgress && i === realStages.length - 1) return; if (v > entVal){ entVal = v; entIdx = i; } });

    const totalEntries = realStages.reduce(function(a,s){ return a + EN[s]; }, 0);

    let kpiHtml = '<div class="pm-kpi-strip">';
    kpiHtml +=
      '<div class="pm-kpi">' +
        '<div class="pm-kpi-label">Entry-point ' + UNIT + '</div>' +
        '<div class="pm-kpi-value">' + fmtNum(N[entryStage]) + '</div>' +
        '<div class="pm-kpi-sub">' + (isEntries ? 'event entries' : 'unique divers') + ' at ' + STAGE_SHORT[entryStage] + '</div>' +
      '</div>';
    kpiHtml +=
      '<div class="pm-kpi pool">' +
        '<div class="pm-kpi-label">Reached ' + STAGE_SHORT[deepStage] + (deepInProgress ? ' (so far)' : '') + '</div>' +
        '<div class="pm-kpi-value">' + fmtNum(N[deepStage]) + '</div>' +
        '<div class="pm-kpi-sub">' + (deepInProgress ? 'in progress \u00b7 results still arriving' : (pendingStage ? 'deepest stage completed so far' : (isEntries ? 'championship event entries' : 'the championship field'))) + '</div>' +
      '</div>';
    if (proj && projActive > 0) {
      kpiHtml +=
        '<div class="pm-kpi pool">' +
          '<div class="pm-kpi-label">Projected to Jr Nationals</div>' +
          '<div class="pm-kpi-value">\u2248 ' + fmtNum(projActive) + '</div>' +
          '<div class="pm-kpi-sub">by placement \u00b7 ' + fmtNum(projEwc) + ' E/W/C top-3 + ' + fmtNum(projZon) + ' Zones direct \u00b7 not final</div>' +
        '</div>';
    }
    if (bigIdx >= 0 && bigVal > 0) {
      kpiHtml +=
        '<div class="pm-kpi accent">' +
          '<div class="pm-kpi-label">Biggest drop-off</div>' +
          '<div class="pm-kpi-value">' + fmtNum(bigVal) + '</div>' +
          '<div class="pm-kpi-sub">stopped after ' + STAGE_SHORT[realStages[bigIdx]] +
            ' \u00b7 ' + pct(bigVal, N[realStages[bigIdx]]) + ' of that field</div>' +
        '</div>';
    }
    if (entIdx >= 1 && entVal >= 8) {
      kpiHtml +=
        '<div class="pm-kpi sky">' +
          '<div class="pm-kpi-label">Joined at ' + STAGE_SHORT[realStages[entIdx]] + '</div>' +
          '<div class="pm-kpi-value">' + fmtNum(entVal) + '</div>' +
          '<div class="pm-kpi-sub">' + (isEntries
            ? 'events first entered here \u00b7 no matching ' + STAGE_SHORT[realStages[entIdx-1]] + ' entry'
            : 'competed with no ' + STAGE_SHORT[realStages[entIdx-1]] + ' result \u00b7 byes / new entrants') + '</div>' +
        '</div>';
    }
    // Cross-reference KPI — the OTHER lens at the championship stage, shown as
    // its own clearly-labeled figure (never fused into the active-lens numbers).
    const otherAtDeep = isEntries ? ATH[deepStage] : ENT[deepStage];
    const otherUnit   = isEntries ? 'unique divers' : 'event entries';
    kpiHtml +=
      '<div class="pm-kpi neutral">' +
        '<div class="pm-kpi-label">' + (isEntries ? 'Divers behind them' : 'Entries among them') + '</div>' +
        '<div class="pm-kpi-value">' + fmtNum(otherAtDeep) + '</div>' +
        '<div class="pm-kpi-sub">' + otherUnit + ' at ' + STAGE_SHORT[deepStage] + ' \u00b7 separate count, entries \u2260 divers</div>' +
      '</div>';
    if (pmState.showFinancials) {
      kpiHtml +=
        '<div class="pm-kpi financial">' +
          '<div class="pm-kpi-label">Cost of the full climb</div>' +
          '<div class="pm-kpi-value">' + fmtMoney(fullCircuitCost) + '</div>' +
          '<div class="pm-kpi-sub">' + (nationalsHasData ? 'one diver, every stop' : 'Regionals \u2192 Nationals (reference)') + '</div>' +
        '</div>';
    }
    kpiHtml += '</div>';

    /* ===== "Viewing" context chip (always say which slice is on screen) ===== */
    const f = pmState.filters || {};
    const chips = [];
    if (f.age_group) chips.push(f.age_group);
    if (f.gender)    chips.push(f.gender);
    if (f.discipline)chips.push(f.discipline);
    if (f.zone)      chips.push('Zone ' + f.zone);
    if (f.region)    chips.push('Region ' + f.region);
    const viewingHtml =
      '<div class="pm-flow-viewing">' +
        '<span class="pm-flow-viewing-key">Viewing</span>' +
        (chips.length
          ? chips.map(function(c){ return '<span class="pm-flow-chip">' + escapeHtml(c) + '</span>'; }).join('')
          : '<span class="pm-flow-chip all">all divers \u00b7 all events</span>') +
        (pmState.excludeFutureChamps ? '<span class="pm-flow-chip muted">Non-qualifying events excluded</span>' : '') +
      '</div>';

    /* ============================ THE RIVER (SVG) ============================ */
    const W = 1400;
    const marginL = 56, marginR = 56;
    const wNode = 30;
    const nGates = realStages.length + (pendingStage ? 1 : 0);
    const usable = W - marginL - marginR;
    const step = nGates > 1 ? (usable - wNode) / (nGates - 1) : 0;
    const gateLeft = function(i){ return marginL + i * step; };
    const cxOf = function(i){ return gateLeft(i) + wNode / 2; };

    const Y0 = 208;            // river top line
    const RIVER_H = 280;       // height of the largest (entry) post
    const hOf = function(n){ return (n / maxN) * RIVER_H; };
    const yExit = Y0 + RIVER_H + 34;   // red exit pools sit on this line
    let maxExitH = 0;  EXIT.forEach(function(v){ maxExitH = Math.max(maxExitH, hOf(v)); });
    let maxEnterH = 0; ENTER.forEach(function(v){ if (v >= 8) maxEnterH = Math.max(maxEnterH, hOf(v)); });
    const yEnter = yExit + Math.max(maxExitH * 0.6, 72);   // pale "joined late" pools on a lower lane
    const H = Math.max(yExit + maxExitH, yEnter + maxEnterH) + 56;

    /* two-line stage titles keep the long official names inside the canvas */
    const STAGE_TITLE_LINES = {
      Regionals: ['REGIONAL', 'CHAMPIONSHIPS'],
      Zones:     ['ZONE', 'CHAMPIONSHIPS'],
      EWC:       ['', 'EAST / WEST / CENTRAL'],
      Nationals: ['JUNIOR NATIONAL', 'CHAMPIONSHIPS'],
    };
    const titleLines = function(s){ return STAGE_TITLE_LINES[s] || [ (STAGE_LABELS[s] || s).toUpperCase(), '' ]; };

    // smooth Sankey ribbon between two vertical slices
    const ribbon = function(x1, y1t, y1b, x2, y2t, y2b){
      const mx = (x1 + x2) / 2;
      return 'M' + x1 + ',' + y1t +
             ' C' + mx + ',' + y1t + ' ' + mx + ',' + y2t + ' ' + x2 + ',' + y2t +
             ' L' + x2 + ',' + y2b +
             ' C' + mx + ',' + y2b + ' ' + mx + ',' + y1b + ' ' + x1 + ',' + y1b + ' Z';
    };

    let svg = '<svg class="pm-flow-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" ' +
      'aria-label="Qualification pipeline flow for ' + year + '">';

    // defs: water gradients
    svg +=
      '<defs>' +
        '<linearGradient id="pmFlowCurrent" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#0d7fa6"/><stop offset="1" stop-color="#33b4d6"/>' +
        '</linearGradient>' +
        '<linearGradient id="pmFlowExit" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#e31937" stop-opacity="0.92"/><stop offset="1" stop-color="#e31937" stop-opacity="0.62"/>' +
        '</linearGradient>' +
        '<linearGradient id="pmFlowEnter" x1="0" y1="1" x2="0" y2="0">' +
          '<stop offset="0" stop-color="#8fc3ea" stop-opacity="0.95"/><stop offset="1" stop-color="#56a8da" stop-opacity="0.8"/>' +
        '</linearGradient>' +
        '<linearGradient id="pmFlowPost" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#1e2d8a"/><stop offset="1" stop-color="#171f69"/>' +
        '</linearGradient>' +
      '</defs>';

    // faint baseline under the river (the "waterline")
    svg += '<line x1="' + (marginL - 8) + '" y1="' + (Y0 + RIVER_H + 1) + '" x2="' + (W - marginR + 8) + '" y2="' + (Y0 + RIVER_H + 1) +
           '" stroke="#dfe3ef" stroke-width="1"/>';

    /* ---- advancing current (pool-blue), drawn first ---- */
    for (let i = 0; i < realStages.length - 1; i++){
      const x1 = gateLeft(i) + wNode;
      const x2 = gateLeft(i + 1);
      const ha = hOf(A[i]);
      svg += '<path d="' + ribbon(x1, Y0, Y0 + ha, x2, Y0, Y0 + ha) + '" fill="url(#pmFlowCurrent)" opacity="0.93"/>';
      // advance count riding the current
      const midx = (x1 + x2) / 2;
      if (ha >= 22) {
        const advWord = (deepInProgress && i === lastGate) ? ' advanced so far' : ' advanced';
        svg += '<text class="pm-flow-advlabel" x="' + midx + '" y="' + (Y0 + Math.min(ha/2 + 5, ha - 6)) + '" text-anchor="middle">' +
               fmtNum(A[i]) + advWord + '</text>';
      }
    }

    /* ---- projected (pending) flow into the ghost basin ----
       Two feeder paths, both dashed/ghost to signal "projected, not final":
       (a) E/W/C top-3 advancing from the deepest real stage, and
       (b) Zones top-3 that go DIRECT, bypassing E/W/C (a stream into the basin).
       Sized to the real placement-derived projection — never a cosmetic guess.
       Falls back to the original faint ghost ribbon when no projection exists. */
    if (pendingStage && proj && (projEwc > 0 || projZon > 0)) {
      const li = realStages.length - 1;            // deepest real stage (E/W/C)
      const x1 = gateLeft(li) + wNode;
      const x2 = gateLeft(li + 1);
      const hEwc = projEwc > 0 ? hOf(projEwc) : 0;
      // (a) E/W/C top-3 advancing current (ghost)
      if (projEwc > 0) {
        svg += '<path d="' + ribbon(x1, Y0, Y0 + hEwc, x2, Y0, Y0 + hEwc) +
               '" fill="url(#pmFlowCurrent)" opacity="0.32" stroke="#0d7fa6" stroke-width="1" stroke-dasharray="3 4"/>';
        const midx = (x1 + x2) / 2;
        if (hEwc >= 18) svg += '<text class="pm-flow-advlabel" x="' + midx + '" y="' + (Y0 + Math.min(hEwc/2 + 5, hEwc - 6)) +
               '" text-anchor="middle" fill="#0d7fa6">\u2248 ' + fmtNum(projEwc) + ' top-3</text>';
      }
      // (b) Zones top-3 direct — leaves the Zones post and arcs into the basin,
      //     passing BEHIND the E/W/C node (drawn before the posts) = a true bypass.
      if (projZon > 0) {
        const hz = hOf(projZon);
        const zi = realStages.indexOf('Zones');
        const xZr  = (zi >= 0 ? gateLeft(zi) + wNode : x1);
        const yStub = (zi >= 0 ? Y0 + hOf(A[zi]) + hOf(EXIT[zi]) : Y0 + hEwc);
        const xBasin = gateLeft(realStages.length);
        const yIn = Y0 + hEwc;                       // stacks below the E/W/C inflow in the basin
        svg += '<path d="' + ribbon(xZr, yStub, yStub + hz, xBasin, yIn, yIn + hz) +
               '" fill="url(#pmFlowEnter)" opacity="0.5" stroke="#56a8da" stroke-width="1" stroke-dasharray="3 4"/>';
        svg += '<text class="pm-flow-enter-n" x="' + (xBasin - 8) + '" y="' + (yIn + hz + 14) + '" text-anchor="end">\u2248 ' + fmtNum(projZon) + ' direct</text>';
        svg += '<text class="pm-flow-enter-sub" x="' + (xBasin - 8) + '" y="' + (yIn + hz + 30) + '" text-anchor="end">Zones top-3 \u00b7 bypass E/W/C</text>';
      }
    } else if (pendingStage) {
      const li = realStages.length - 1;
      const x1 = gateLeft(li) + wNode;
      const x2 = gateLeft(li + 1);
      const hp = Math.min(hOf(N[deepStage]) * 0.62, 120);
      svg += '<path d="' + ribbon(x1, Y0, Y0 + Math.min(hOf(N[deepStage]), hp + 18), x2, Y0, Y0 + hp) +
             '" fill="#cfe0ee" opacity="0.5" stroke="#9db8d6" stroke-width="1" stroke-dasharray="2 5"/>';
    }

    /* ---- exit tributaries (red), shedding downward ---- */
    for (let i = 0; i < realStages.length - 1; i++){
      if (deepInProgress && i === lastGate) continue;  // drop-off into a still-running stage isn't known yet
      if (EXIT[i] <= 0) continue;
      const x1 = gateLeft(i) + wNode;
      const ha = hOf(A[i]);
      const he = hOf(EXIT[i]);
      const sinkX = x1 + step * 0.42;
      const sinkW = 13;
      svg += '<path d="' + ribbon(x1, Y0 + ha, Y0 + ha + he, sinkX, yExit, yExit + he) + '" fill="url(#pmFlowExit)"/>';
      // exit "pool" cap
      svg += '<rect x="' + sinkX + '" y="' + yExit + '" width="' + sinkW + '" height="' + he +
             '" rx="3" fill="#e31937" opacity="0.92"/>';
      // labels (always on white, ADA-safe)
      const ly = yExit + Math.max(he / 2, 9);
      svg += '<text class="pm-flow-exit-n" x="' + (sinkX + sinkW + 9) + '" y="' + (ly - 2) + '">\u2193 ' + fmtNum(EXIT[i]) + ' ' + UNIT + '</text>';
      if (exitSplit[i]) {
        // corrected Zones exit — direct-to-Nationals removed; split by reason
        svg += '<text class="pm-flow-exit-sub" x="' + (sinkX + sinkW + 9) + '" y="' + (ly + 15) + '">did not advance to ' + STAGE_SHORT[realStages[i+1]] +
               ' \u00b7 ' + pct(EXIT[i], N[realStages[i]]) + ' of Zones</text>';
        svg += '<text class="pm-flow-exit-sub" x="' + (sinkX + sinkW + 9) + '" y="' + (ly + 31) + '" style="fill:#b45309">' +
               fmtNum(exitSplit[i].noreg) + ' qualified, didn\u2019t register</text>';
        svg += '<text class="pm-flow-exit-sub" x="' + (sinkX + sinkW + 9) + '" y="' + (ly + 47) + '" style="fill:#5f6062">' +
               fmtNum(exitSplit[i].notqual) + ' didn\u2019t place high enough</text>';
      } else {
        svg += '<text class="pm-flow-exit-sub" x="' + (sinkX + sinkW + 9) + '" y="' + (ly + 15) + '">stopped after ' + STAGE_SHORT[realStages[i]] +
               ' \u00b7 ' + pct(EXIT[i], N[realStages[i]]) + '</text>';
      }
    }

    /* ---- late-entry inflows (pale blue), rising from a lower lane into the next post ---- */
    for (let i = 1; i < realStages.length; i++){
      if (deepInProgress && i === realStages.length - 1) continue;  // inflow to a still-running stage isn't known yet
      const he = hOf(ENTER[i]);
      if (ENTER[i] < 8 || he < 6) continue;   // tiny inflows handled in footnote
      const x2 = gateLeft(i);
      const ha = hOf(A[i-1]);
      const srcX = x2 - step * 0.34;
      const srcW = 12;
      const ySrc = yEnter;
      svg += '<path d="' + ribbon(srcX + srcW, ySrc, ySrc + he, x2, Y0 + ha, Y0 + ha + he) + '" fill="url(#pmFlowEnter)" opacity="0.9"/>';
      svg += '<rect x="' + (srcX) + '" y="' + ySrc + '" width="' + srcW + '" height="' + he + '" rx="3" fill="#56a8da" opacity="0.95"/>';
      const ly = ySrc + Math.max(he / 2, 9);
      svg += '<text class="pm-flow-enter-n" x="' + (srcX - 9) + '" y="' + (ly - 2) + '" text-anchor="end">\u2191 ' + fmtNum(ENTER[i]) + ' joined</text>';
      svg += '<text class="pm-flow-enter-sub" x="' + (srcX - 9) + '" y="' + (ly + 15) + '" text-anchor="end">' + (isEntries ? 'event not entered at ' + STAGE_SHORT[realStages[i-1]] : 'entered at ' + STAGE_SHORT[realStages[i]] + ' \u00b7 no prior result') + '</text>';
    }

    /* ---- gate posts (navy) + headers ---- */
    realStages.forEach(function(s, i){
      const x = gateLeft(i);
      const h = hOf(N[s]);
      const cx = cxOf(i);
      const isIP = deepInProgress && i === realStages.length - 1;
      // post
      svg += '<rect x="' + x + '" y="' + Y0 + '" width="' + wNode + '" height="' + h + '" rx="6" fill="url(#pmFlowPost)"' + (isIP ? ' opacity="0.5"' : '') + '/>';
      if (isIP) svg += '<rect x="' + (x - 1.5) + '" y="' + (Y0 - 1.5) + '" width="' + (wNode + 3) + '" height="' + (h + 3) + '" rx="7" fill="none" stroke="#009ac7" stroke-width="1.5" stroke-dasharray="4 4"/>';
      svg += '<rect x="' + x + '" y="' + Y0 + '" width="' + wNode + '" height="4" rx="2" fill="#009ac7"/>';
      // connector tick from header to post
      svg += '<line x1="' + cx + '" y1="160" x2="' + cx + '" y2="' + (Y0 - 6) + '" stroke="#cdd3e6" stroke-width="1" stroke-dasharray="1 4"/>';
      // header card text (two-line title keeps long names on-canvas)
      const tl = titleLines(s);
      if (tl[0]) svg += '<text class="pm-flow-stage" x="' + cx + '" y="34" text-anchor="middle">' + escapeHtml(tl[0]) + '</text>';
      if (tl[1]) svg += '<text class="pm-flow-stage" x="' + cx + '" y="54" text-anchor="middle">' + escapeHtml(tl[1]) + '</text>';
      svg += '<text class="pm-flow-count" x="' + cx + '" y="94" text-anchor="middle">' + fmtNum(N[s]) + '</text>';
      svg += '<text class="pm-flow-count-unit" x="' + cx + '" y="114" text-anchor="middle">' + UNIT + (isIP ? ' so far' : '') + '</text>';
      if (isIP) {
        svg += '<text x="' + cx + '" y="133" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" font-weight="700" fill="#0d7fa6">\u25cf in progress</text>';
      } else {
        const feeTxt = (fees[s] !== undefined && fees[s] !== null)
          ? (fees[s] > 0 ? '$' + fees[s] + ' entry fee' : 'no separate entry fee')
          : '';
        if (feeTxt) svg += '<text class="pm-flow-fee" x="' + cx + '" y="132" text-anchor="middle">' + feeTxt + '</text>';
        if (pmState.showFinancials && fees[s]) {
          // Entry fees are charged per EVENT ENTRY, so revenue is always entries × fee
          // (independent of the display lens) — never athletes × fee.
          svg += '<text class="pm-flow-rev" x="' + cx + '" y="150" text-anchor="middle">' +
                 fmtMoney(EN[s] * fees[s]) + ' collected</text>';
        }
      }
    });

    /* ---- pending ghost basin ---- */
    if (pendingStage) {
      const i = realStages.length;
      const x = gateLeft(i);
      const cx = cxOf(i);
      const tlp = titleLines(pendingStage);
      if (proj && projActive > 0) {
        // Sized to the two feeder paths so the dashed inflows fill it; labeled
        // with the DISTINCT projected field in the active lens.
        const gh = Math.max(Math.min(hOf(projEwc + projZon), RIVER_H), 100);
        svg += '<rect x="' + x + '" y="' + Y0 + '" width="' + wNode + '" height="' + gh + '" rx="6" fill="#eef3fb" stroke="#009ac7" stroke-width="1.5" stroke-dasharray="4 5"/>';
        svg += '<rect x="' + x + '" y="' + Y0 + '" width="' + wNode + '" height="4" rx="2" fill="#009ac7" opacity="0.65"/>';
        if (tlp[0]) svg += '<text class="pm-flow-stage ghost" x="' + cx + '" y="34" text-anchor="middle">' + escapeHtml(tlp[0]) + '</text>';
        if (tlp[1]) svg += '<text class="pm-flow-stage ghost" x="' + cx + '" y="54" text-anchor="middle">' + escapeHtml(tlp[1]) + '</text>';
        svg += '<text class="pm-flow-count" x="' + cx + '" y="94" text-anchor="middle" fill="#0d7fa6">\u2248 ' + fmtNum(projActive) + '</text>';
        svg += '<text class="pm-flow-count-unit" x="' + cx + '" y="114" text-anchor="middle">projected ' + UNIT + '</text>';
        svg += '<text x="' + cx + '" y="133" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="700" fill="#0d7fa6">by placement \u00b7 not final</text>';
      } else {
        const gh = 132;
        svg += '<rect x="' + x + '" y="' + Y0 + '" width="' + wNode + '" height="' + gh + '" rx="6" fill="#eef1f8" stroke="#9db8d6" stroke-width="1.5" stroke-dasharray="4 5"/>';
        if (tlp[0]) svg += '<text class="pm-flow-stage ghost" x="' + cx + '" y="34" text-anchor="middle">' + escapeHtml(tlp[0]) + '</text>';
        if (tlp[1]) svg += '<text class="pm-flow-stage ghost" x="' + cx + '" y="54" text-anchor="middle">' + escapeHtml(tlp[1]) + '</text>';
        svg += '<text class="pm-flow-pending" x="' + cx + '" y="94" text-anchor="middle">Results</text>';
        svg += '<text class="pm-flow-pending" x="' + cx + '" y="114" text-anchor="middle">pending</text>';
      }
      const pf = fees[pendingStage];
      if (pf) svg += '<text class="pm-flow-fee" x="' + cx + '" y="' + ((proj && projActive>0) ? 150 : 132) + '" text-anchor="middle">$' + pf + ' entry fee</text>';
    }

    svg += '</svg>';

    /* ============================ legend ============================ */
    const legend =
      '<div class="pm-flow-legend">' +
        '<span class="pm-legend-item"><span class="pm-legend-sw" style="background:linear-gradient(90deg,#0d7fa6,#33b4d6)"></span>Advancing current \u2014 ' + (isEntries ? 'entries that continued to the next stage' : 'divers who competed at the next stage too') + '</span>' +
        '<span class="pm-legend-item"><span class="pm-legend-sw" style="background:#e31937"></span>Stopped here \u2014 ' + (isEntries ? 'entered this stage but not the next' : 'competed at this stage but not the next') + '</span>' +
        '<span class="pm-legend-item"><span class="pm-legend-sw" style="background:#56a8da"></span>Joined late \u2014 ' + (isEntries ? 'event first entered at this stage' : 'first appeared at this stage (byes / new entrants)') + '</span>' +
        (deepInProgress ? '<span class="pm-legend-item"><span class="pm-legend-sw" style="background:linear-gradient(90deg,#0d7fa6,#33b4d6);opacity:0.5;box-shadow:inset 0 0 0 1.5px #009ac7"></span>In progress \u2014 results still arriving</span>' : '') +
        (pendingStage ? ((proj && projActive > 0)
          ? '<span class="pm-legend-item"><span class="pm-legend-sw" style="background:#eef3fb;box-shadow:inset 0 0 0 1.5px #009ac7"></span>Projected \u2014 not yet contested (top-3 by placement)</span>'
          : '<span class="pm-legend-item"><span class="pm-legend-sw" style="background:#eef1f8;box-shadow:inset 0 0 0 1.5px #9db8d6"></span>Stage not yet contested</span>') : '') +
        (pmState.showFinancials ? '<span class="pm-legend-item"><span class="pm-legend-sw" style="background:#d97706"></span>Entry-fee revenue collected</span>' : '') +
      '</div>';

    /* ============================ footnotes ============================ */
    let notes = [];
    // tiny inflows folded into footnote
    for (let i = 1; i < realStages.length; i++){
      if (deepInProgress && i === realStages.length - 1) continue;  // inflow to a still-running stage isn't final yet
      if (ENTER[i] > 0 && (ENTER[i] < 8 || hOf(ENTER[i]) < 6)) {
        notes.push(fmtNum(ENTER[i]) + ' ' + (ENTER[i]>1 ? UNIT : UNIT_ONE) + (isEntries
            ? ' first entered at ' + STAGE_SHORT[realStages[i]] + ' (no matching ' + STAGE_SHORT[realStages[i-1]] + ' entry, too few to draw)'
            : ' entered at ' + STAGE_SHORT[realStages[i]] + ' without a ' + STAGE_SHORT[realStages[i-1]] + ' result (too few to draw)'));
      }
    }
    // asterisk (non-qualifying) note — preserved from prior behavior
    const astStages = Object.keys(data.asterisked || {});
    if (astStages.length && !pmState.excludeAsterisked) {
      astStages.forEach(function(s){
        Object.keys(data.asterisked[s]).forEach(function(reason){
          const r = data.asterisked[s][reason];
          if (reason === 'platform_at_regionals') notes.push(r.event_entries + ' platform entries at ' + STAGE_SHORT[s] + ' are exhibition / non-qualifying (kept in view, marked *)');
          else if (reason === 'group_cd_at_regionals_2026') notes.push(r.event_entries + ' Group C/D entries at Regionals (in 2026, C/D enter at Zones)');
        });
      });
    }
    // In-progress banner (prominent, brand-safe pool-blue on light)
    let banner = '';
    if (deepInProgress) {
      const priorShort = realStages.length >= 2 ? STAGE_SHORT[realStages[realStages.length - 2]] : null;
      const heldBack = priorShort
        ? ', so the drop-off after ' + priorShort + ' and any late entries at ' + STAGE_SHORT[deepStageName] + ' are held back until the meet finishes'
        : '';
      banner =
        '<div style="display:flex;gap:10px;align-items:flex-start;background:#eaf6fb;border-left:4px solid #009ac7;border-radius:8px;padding:12px 16px;margin:0 0 14px;font-family:Inter,sans-serif;font-size:14px;line-height:1.45;color:#0d2230">' +
          '<span style="flex:0 0 auto;width:10px;height:10px;border-radius:50%;background:#009ac7;margin-top:5px;box-shadow:0 0 0 3px rgba(0,154,199,0.25)"></span>' +
          '<span><strong>' + escapeHtml(STAGE_LABELS[deepStageName] || STAGE_SHORT[deepStageName]) + ' is still being contested.</strong> ' +
          'The ' + STAGE_SHORT[deepStageName] + ' numbers below are preliminary and will keep changing as the remaining sessions are scored' + heldBack + '.</span>' +
        '</div>';
    }

    let footnote = '';
    if (notes.length) {
      footnote = '<div class="pm-footnote"><strong>Notes</strong> \u2014 ' + notes.join('; ') + '.</div>';
    }

    /* Projected-Nationals caveat — shown whenever the dashed basin carries a
       placement-derived projection. States plainly that the championship has
       not happened, what the projection includes, and what it cannot. */
    let projBanner = '';
    if (proj && projActive > 0) {
      projBanner =
        '<div style="display:flex;gap:10px;align-items:flex-start;background:#eef3fb;border-left:4px solid #009ac7;border-radius:8px;padding:12px 16px;margin:0 0 14px;font-family:Inter,sans-serif;font-size:14px;line-height:1.5;color:#0d2230">' +
          '<span style="flex:0 0 auto;width:10px;height:10px;border-radius:50%;background:#009ac7;margin-top:5px;box-shadow:0 0 0 3px rgba(0,154,199,0.25)"></span>' +
          '<span><strong>Junior Nationals has not been contested yet</strong> \u2014 results and registrations arrive at the end of July. ' +
          'The dashed basin is the <strong>projected qualifier field by placement</strong>: \u2248' + fmtNum(projActive) + ' ' + UNIT +
          ' (\u2248' + fmtNum(projEwc) + ' from E/W/C top-3 + \u2248' + fmtNum(projZon) + ' direct from Zones top-3), computed from the finalized Zone &amp; E/W/C results, applying the same top-3-by-final-placement rule as the official qualifier list. ' +
          'It is <strong>preliminary</strong>: it does not remove non-displacing (foreign) finishers, apply average-score / replacement / declined adjustments, or add pre-qualified &amp; skip-stage athletes (Alaska/Hawaii, YMCA national champions, military dependents) \u2014 all of which need the registration file. Verify against the official list before publishing.</span>' +
        '</div>';
    }

    const explainer = isEntries
      ? ('Read it left to right as the ' + year + ' season unfolds, counting EVENT ENTRIES (one diver in one event). '
        + 'Each navy post is a stage; its height is how many event entries were contested there. '
        + 'The blue current carries entries that recurred at the next stage; red streams are entries that stopped; '
        + 'a pale stream joining from below is an event a diver first picked up at that stage. '
        + 'This is the entries lens \u2014 a diver in three events counts three times. Switch to Unique divers to count people instead.')
      : ('Read it left to right as the ' + year + ' season unfolds, counting UNIQUE DIVERS (each person once). '
        + 'Each navy post is a stage; its height is how many unique divers competed there. '
        + 'The blue current carries divers who advanced (competed at the next stage too); red streams peeling off are divers who stopped; '
        + 'a pale stream joining from below is divers who first appeared at that stage \u2014 byes or new entrants a simple drop-off count would hide. '
        + 'This is the divers lens \u2014 a diver in three events still counts once. Switch to Event entries to count event-qualifications instead.')
      + (pendingStage ? ((proj && projActive > 0)
          ? ' The dashed basin is the projected Junior Nationals field (top-3 by placement) \u2014 the championship is still to come.'
          : ' The dashed basin is the stage still to come.') : '')
      + ' Use the Financial overlay toggle to add what families paid and what each meet collected.';

    /* ===== lens toggle: divers vs entries are two SEPARATE evaluations ===== */
    const lensToggle = printMode
      ? '<div style="font-family:Inter,sans-serif;font-size:12.5px;color:#5f6062;margin:0 0 14px"><strong style="color:#171f69">Counting unique divers</strong> \u2014 a diver in 3 events still = 1 diver.</div>'
      :
      '<div class="pm-lens-toggle" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 14px">' +
        '<span style="font-family:Inter,sans-serif;font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#5f6062">Count by</span>' +
        '<div class="pm-cohort-stage-picker" style="background:#eef1f8;border-radius:999px;padding:3px;display:inline-flex;gap:2px">' +
          '<button class="pm-cohort-stage-btn ' + (isEntries ? '' : 'active') + '" data-pm-lens="divers">Unique divers</button>' +
          '<button class="pm-cohort-stage-btn ' + (isEntries ? 'active' : '') + '" data-pm-lens="entries">Event entries</button>' +
        '</div>' +
        '<span style="font-family:Inter,sans-serif;font-size:12px;color:#5f6062">' +
          (isEntries ? 'Counting every event a diver entered \u2014 a diver in 3 events = 3 entries.'
                     : 'Counting people \u2014 a diver in 3 events still = 1 diver.') +
        '</span>' +
      '</div>';

    /* ===== "Two lenses" comparison — the divers/entries gap, made the point.
       Both measures shown together ONLY here, as an explicit side-by-side of two
       separate counts, with the events-per-diver ratio that the gap represents. */
    let twoLens = '';
    (function(){
      const stages = realStages;
      const maxEnt = stages.reduce(function(m,s){ return Math.max(m, ENT[s]); }, 1);
      const rowH = 58, top = 16, labelW = 150, barX = labelW + 16, barMax = 560, ratioX = barX + barMax + 90;
      const VW = ratioX + 150, VH = top + stages.length * rowH + 18;
      let s2 = '<svg viewBox="0 0 ' + VW + ' ' + VH + '" preserveAspectRatio="xMidYMid meet" class="pm-twolens-svg" style="width:100%;height:auto;display:block" role="img" aria-label="Unique divers versus event entries by stage">';
      stages.forEach(function(s, i){
        const y = top + i * rowH;
        const dW = (ATH[s] / maxEnt) * barMax;
        const eW = (ENT[s] / maxEnt) * barMax;
        const ratio = ATH[s] ? (ENT[s] / ATH[s]) : 0;
        s2 += '<text x="' + labelW + '" y="' + (y + 22) + '" text-anchor="end" font-family="Inter,sans-serif" font-size="13.5" font-weight="700" fill="#171f69">' + escapeHtml(STAGE_SHORT[s]) + '</text>';
        // divers bar (navy)
        s2 += '<rect x="' + barX + '" y="' + (y + 4) + '" width="' + Math.max(dW,2) + '" height="15" rx="3.5" fill="#171f69"/>';
        s2 += '<text x="' + (barX + Math.max(dW,2) + 8) + '" y="' + (y + 16) + '" font-family="Inter,sans-serif" font-size="12" font-weight="700" fill="#171f69">' + fmtNum(ATH[s]) + ' divers</text>';
        // entries bar (pool blue)
        s2 += '<rect x="' + barX + '" y="' + (y + 24) + '" width="' + Math.max(eW,2) + '" height="15" rx="3.5" fill="#009ac7"/>';
        s2 += '<text x="' + (barX + Math.max(eW,2) + 8) + '" y="' + (y + 36) + '" font-family="Inter,sans-serif" font-size="12" font-weight="700" fill="#0d7fa6">' + fmtNum(ENT[s]) + ' entries</text>';
        // ratio badge
        s2 += '<rect x="' + ratioX + '" y="' + (y + 6) + '" width="132" height="30" rx="15" fill="#eef1f8"/>';
        s2 += '<text x="' + (ratioX + 66) + '" y="' + (y + 25) + '" text-anchor="middle" font-family="Inter,sans-serif" font-size="12.5" font-weight="700" fill="#171f69">' + (ratio ? ratio.toFixed(2) : '\u2014') + ' events/diver</text>';
      });
      s2 += '</svg>';
      const ratios = stages.map(function(s){ return ATH[s] ? ENT[s]/ATH[s] : 0; }).filter(function(r){ return r > 0; });
      const trend = (ratios.length >= 2 && ratios[ratios.length-1] > ratios[0])
        ? ' Divers take on more events as they advance \u2014 from about ' + ratios[0].toFixed(1) + ' to ' + ratios[ratios.length-1].toFixed(1) + ' events each by ' + STAGE_SHORT[stages[stages.length-1]] + '.'
        : '';
      twoLens =
        '<div class="pm-flow-wrap" style="margin-top:18px">' +
          '<div style="font-family:Inter,sans-serif;font-size:13.5px;color:#2d3a4a;margin:0 0 10px;line-height:1.5">' +
            '<strong style="color:#171f69">Two lenses, kept separate.</strong> Unique divers (navy) counts each person once; event entries (blue) counts every event they entered. They are measured independently and never combined into a single figure.' + trend +
          '</div>' + s2 +
        '</div>';
    })();

    /* ===== Advancement breakdown by age group =====
       The committee-facing answer to "why didn't they advance": qualified-but-
       didn't-continue vs didn't-place-high-enough, per age group. Active lens.
       Wording adapts to era — 2026 gates Zones → E/W/C, pre-2026 gates
       Zones → Junior Nationals directly (no E/W/C tier). */
    let advCard = '';
    const BK = (abMode === 'nats')
      ? [
        { key:'nat_reg',   short:'Reached Jr Nationals',            label:'Reached Junior Nationals (competed)',                color:'#009ac7' },
        { key:'nat_noreg', short:'Qualified, didn\u2019t compete',  label:'Qualified to Jr Nationals \u2014 did NOT compete',    color:'#d97706' },
        { key:'not_qual',  short:'Didn\u2019t qualify',             label:'Did not place high enough to qualify',               color:'#9aa3b2' },
      ]
      : [
        { key:'direct',    short:'Direct to Nationals',             label:'Advanced direct to Jr Nationals (Zones top-3)',      color:'#171f69' },
        { key:'ewc_reg',   short:'Advanced to E/W/C',               label:'Advanced to E/W/C \u2014 registered',                color:'#009ac7' },
        { key:'ewc_noreg', short:'Qualified, didn\u2019t register', label:'Qualified to E/W/C \u2014 did NOT register',          color:'#d97706' },
        { key:'not_qual',  short:'Didn\u2019t qualify',             label:'Did not place high enough to qualify',               color:'#9aa3b2' },
      ];
    const sumBK = function(r){ return BK.reduce(function(a,b){ return a + (r[b.key]||0); }, 0); };
    if (abSrc && abTot && sumBK(abTot) > 0) {
      const rowHtml = function(name, r, isTotal){
        const tot = sumBK(r);
        if (!tot) return '';
        let bar = '<div style="display:flex;height:20px;border-radius:5px;overflow:hidden;background:#eef1f8">';
        BK.forEach(function(b){ const v=r[b.key]||0; if(!v) return; bar += '<div title="' + escapeHtml(b.short+': '+v) + '" style="width:' + (v/tot*100) + '%;background:' + b.color + '"></div>'; });
        bar += '</div>';
        const tdTop = isTotal ? 'border-top:2px solid #171f69;' : 'border-top:1px solid #eef1f8;';
        return '<tr>' +
          '<td style="' + tdTop + 'font-family:Inter,sans-serif;font-weight:700;color:#171f69;font-size:13.5px;white-space:nowrap;padding:8px 12px 8px 0">' + escapeHtml(name) + '</td>' +
          '<td style="' + tdTop + 'width:42%;padding:8px 14px 8px 0">' + bar + '</td>' +
          BK.map(function(b){ const v=r[b.key]||0; return '<td style="' + tdTop + 'text-align:center;font-family:JetBrains Mono,monospace;font-size:13px;color:' + (v?b.color:'#b7bdc9') + ';font-weight:' + (v?'700':'400') + '">' + fmtNum(v) + '</td>'; }).join('') +
          '<td style="' + tdTop + 'text-align:center;font-family:JetBrains Mono,monospace;font-size:13px;color:#5f6062;font-weight:700">' + fmtNum(tot) + '</td>' +
        '</tr>';
      };
      let rows = '';
      abOrder.forEach(function(ag){ rows += rowHtml(ag, abSrc[ag] || {}, false); });
      rows += rowHtml('All age groups', abTot, true);
      const legendHtml = BK.map(function(b){ return '<span style="display:inline-flex;align-items:center;gap:6px;font-family:Inter,sans-serif;font-size:12px;color:#2d3a4a;margin-right:16px"><span style="width:11px;height:11px;border-radius:3px;background:' + b.color + '"></span>' + escapeHtml(b.label) + '</span>'; }).join('');
      const noregTot = (abMode === 'nats') ? abTot.nat_noreg : abTot.ewc_noreg;
      const notqualTot = abTot.not_qual, stoppedTot = noregTot + notqualTot;
      const unitWord = isEntries ? 'event-qualifications' : 'unique divers';
      const descHtml = (abMode === 'nats')
        ? ('Of the ' + unitWord + ' who stopped after Zones, <strong style="color:#b45309">' + fmtNum(noregTot) + ' qualified to Junior Nationals but did not compete</strong> (they earned the spot \u2014 placed top 10 on springboard or top 7 on platform) and <strong style="color:#5f6062">' + fmtNum(notqualTot) + ' did not place high enough to qualify</strong> (a competitive cutoff) \u2014 ' + fmtNum(stoppedTot) + ' total. Counting ' + unitWord + ' \u00b7 ' + year + ' \u00b7 non-displacing exhibition entries excluded.')
        : ('Of the divers who stopped after Zones, <strong style="color:#b45309">' + fmtNum(noregTot) + ' qualified to E/W/C but did not register</strong> (recoverable \u2014 they earned the spot) and <strong style="color:#5f6062">' + fmtNum(notqualTot) + ' did not place high enough to qualify</strong> (a competitive cutoff) \u2014 ' + fmtNum(stoppedTot) + ' total. Divers who placed top-3 advanced <em>directly</em> to Junior Nationals and are not "stopped." Counting ' + unitWord + ' \u00b7 ' + year + ' \u00b7 non-displacing exhibition entries excluded.');
      advCard =
        '<div style="margin:18px 0 6px;border:1px solid #e2e5ef;border-radius:12px;padding:18px 20px;background:#fff">' +
          '<div style="font-family:Barlow Condensed,Inter,sans-serif;font-weight:700;font-size:20px;letter-spacing:.01em;color:#171f69;text-transform:uppercase">Where the Zones field went \u2014 by age group</div>' +
          '<div style="font-family:Inter,sans-serif;font-size:13.5px;color:#5a6a7e;margin:5px 0 14px;line-height:1.5">' + descHtml + '</div>' +
          '<div style="overflow-x:auto">' +
          '<table style="width:100%;border-collapse:collapse;min-width:640px">' +
            '<thead><tr>' +
              '<th style="text-align:left;font-family:Inter,sans-serif;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#5f6062;padding-bottom:8px">Age group</th>' +
              '<th style="padding-bottom:8px"></th>' +
              BK.map(function(b){ return '<th style="text-align:center;font-family:Inter,sans-serif;font-size:11px;color:' + b.color + ';padding:0 4px 8px;font-weight:700">' + escapeHtml(b.short) + '</th>'; }).join('') +
              '<th style="text-align:center;font-family:Inter,sans-serif;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#5f6062;padding-bottom:8px">Total</th>' +
            '</tr></thead><tbody>' + rows + '</tbody>' +
          '</table></div>' +
          '<div style="margin-top:14px">' + legendHtml + '</div>' +
        '</div>';
    }

    return sectionShell(1, 'Qualification Pipeline — ' + year, explainer,
      banner + projBanner + lensToggle + kpiHtml + viewingHtml + '<div class="pm-flow-wrap"><div class="pm-flow-scroll">' + svg + '</div>' + legend + '</div>' + footnote + advCard + twoLens);
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

      // Map demographics dimension to its master-filter key
      const filterKey = { age: 'age_group', gender: 'gender', discipline: 'discipline' }[dim] || null;

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
        // Row header is click-to-filter when this dimension maps to a filter
        const isActiveFilter = filterKey && pmState.filters[filterKey] === b;
        const thAttrs = filterKey
          ? ' class="pm-demo-rowhead clickable' + (isActiveFilter ? ' active' : '') + '" data-pm-setfilter="' + filterKey + ':' + escapeHtml(b) + '" title="Click to filter all sections by ' + escapeHtml(b) + '"'
          : ' class="pm-demo-rowhead"';
        rows += '<tr><th' + thAttrs + '>' + escapeHtml(b) + (isActiveFilter ? ' <span class="pm-demo-filter-on">●</span>' : '') + '</th>' + cells +
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
        const zoneActive = pmState.filters.zone === String(z.zone);
        bars += '<div class="pm-zone-row clickable' + (zoneActive ? ' active' : '') + '" data-pm-setfilter="zone:' + escapeHtml(String(z.zone)) + '" title="Click to filter all sections by Zone ' + escapeHtml(String(z.zone)) + '">' +
          '<div class="pm-zone-label">' + escapeHtml('Zone ' + z.zone) + (zoneActive ? ' <span class="pm-demo-filter-on">●</span>' : '') + '</div>' +
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

    // Cross-cohort comparison year pills (#2)
    const years = pmState.yearsAvailable || [];
    const cmpYears = pmState.cohortCompareYears || [];
    const cmpPills = years.map(y =>
      '<button class="pm-cohort-cmp-pill ' + (cmpYears.indexOf(y) >= 0 ? 'active' : '') + '" data-pm-cohort-cmp="' + y + '">' + y + '</button>'
    ).join('');
    const cmpControls =
      '<div class="pm-cohort-cmp">' +
        '<span class="pm-cohort-cmp-label">Compare years</span>' +
        '<div class="pm-cohort-cmp-pills">' + cmpPills + '</div>' +
        (cmpYears.length ? '<button class="pm-cohort-cmp-clear" id="pmCohortCmpClear">Clear</button>' : '') +
      '</div>';

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

    // Cross-cohort comparison overlay (rendered async into a slot)
    const cmpSlot = cmpYears.length ? '<div id="pmCohortCmpSlot" class="pm-cohort-cmp-slot"><div class="pm-loading"><div class="pm-loading-spinner"></div><div class="pm-loading-text">Loading comparison cohorts…</div></div></div>' : '';

    return sectionShell(3, 'Cohort Progression — Following the ' + year + ' ' + STAGE_SHORT[startStage] + ' cohort',
      'Every athlete in the starting cohort, traced through every subsequent stage of the ' + year + ' pipeline. The bar width is the share of the starting cohort that reached that stage; each color segment is a placement tier at that stage. For Junior Nationals, the round-by-round breakdown below shows who made the Final, who was in the Semifinal round, and who was cut after Prelim. Use "Compare years" to overlay multiple cohorts\' survival curves.',
      kpis + eraNote + controls + cmpControls + cmpSlot + lanes);
  }

  /* Cross-cohort comparison overlay — retention curves for multiple years */
  function renderCohortComparisonOverlay(comparison, startStage){
    if (!comparison || !comparison.length) return '';
    const startIdx = STAGE_ORDER.indexOf(startStage);
    const stages = STAGE_ORDER.slice(startIdx);

    // Build retention curve per year: % of starting cohort reaching each stage
    const W = 760, H = 340, padL = 60, padR = 140, padT = 20, padB = 50;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const colors = ['#171f69', '#009ac7', '#e31937', '#d97706', '#059669', '#7c3aed'];

    function xOf(i){ return padL + (stages.length === 1 ? 0 : i / (stages.length - 1) * innerW); }
    function yOf(rate){ return padT + innerH - rate * innerH; }

    let svg = '<svg class="pm-score-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';
    // Gridlines
    for (let i = 0; i <= 4; i++) {
      const rate = i / 4, yp = yOf(rate);
      svg += '<line class="pm-grid-line" x1="' + padL + '" y1="' + yp + '" x2="' + (padL + innerW) + '" y2="' + yp + '"/>';
      svg += '<text class="pm-axis-tick" x="' + (padL - 6) + '" y="' + (yp + 3) + '" text-anchor="end">' + (rate*100).toFixed(0) + '%</text>';
    }
    // Stage labels on x-axis
    stages.forEach((s, i) => {
      svg += '<text class="pm-bar-year" x="' + xOf(i) + '" y="' + (padT + innerH + 20) + '" text-anchor="middle">' + STAGE_SHORT[s] + '</text>';
    });
    svg += '<line class="pm-axis-line" x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT+innerH) + '"/>';
    svg += '<line class="pm-axis-line" x1="' + padL + '" y1="' + (padT+innerH) + '" x2="' + (padL+innerW) + '" y2="' + (padT+innerH) + '"/>';

    comparison.forEach((c, ci) => {
      const color = colors[ci % colors.length];
      const base = c.data.cohortSize || (c.data.stages[startStage] ? c.data.stages[startStage].reached : 0);
      const pts = [];
      stages.forEach((s, i) => {
        const reached = (c.data.stages[s] || {}).reached || 0;
        if (s === 'EWC' && c.year < 2026) return; // skip non-existent stage
        const rate = base ? reached / base : 0;
        pts.push({ x: xOf(i), y: yOf(rate), rate: rate, reached: reached, stage: s });
      });
      if (pts.length >= 2) {
        svg += '<polyline points="' + pts.map(p => p.x + ',' + p.y).join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round"/>';
      }
      pts.forEach(p => {
        svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="' + color + '" stroke="#fff" stroke-width="2"><title>' +
          c.year + ' — ' + STAGE_SHORT[p.stage] + ': ' + (p.rate*100).toFixed(1) + '% (' + fmtNum(p.reached) + ')</title></circle>';
      });
      // Right-edge year label
      const lastPt = pts[pts.length - 1];
      if (lastPt) {
        svg += '<text x="' + (padL + innerW + 8) + '" y="' + (lastPt.y + 4) + '" class="pm-bar-value" fill="' + color + '">' + c.year + ' (' + fmtNum(base) + ')</text>';
      }
    });
    svg += '</svg>';

    return '<div class="pm-cohort-cmp-overlay">' +
      '<div class="pm-yoy-chart-title">Cohort survival comparison — share of starting cohort reaching each stage</div>' +
      '<div class="pm-yoy-chart-sub">Each line is one year\'s ' + STAGE_SHORT[startStage] + ' cohort. The y-axis is the percent of that starting cohort still competing at each later stage. Numbers in the legend are the starting cohort size. This normalizes for cohort size so you compare retention shape, not just volume.</div>' +
      svg + '</div>';
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
    const W = 540, H = 326;
    const padL = 60, padR = 16, padT = 18, padB = 26;
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

    svg += '</svg>';

    // Legend — wrapping HTML below the chart (prevents the in-SVG overlap)
    const legendHtml = '<div class="pm-chart-legend">' + series.map(ser =>
      '<span class="pm-legend-item"><span class="pm-legend-line" style="border-top:3px ' +
      (ser.dash ? 'dashed' : 'solid') + ' ' + ser.color + '"></span>' + escapeHtml(ser.label) + '</span>'
    ).join('') + '</div>';
    return svg + legendHtml;
  }

  /* Absolute athlete-count chart — small stacked-area for context */
  function buildAbsoluteCountsChart(rows, minY, maxY){
    const W = 540, H = 326;
    const padL = 60, padR = 16, padT = 18, padB = 26;
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

    svg += '</svg>';

    // Legend — wrapping HTML below the chart
    const legendHtml = '<div class="pm-chart-legend">' + series.map(ser =>
      '<span class="pm-legend-item"><span class="pm-legend-box" style="background:' + ser.color + '"></span>' +
      escapeHtml(ser.label) + '</span>'
    ).join('') + '</div>';
    return svg + legendHtml;
  }


  /* ── SECTION 5: Score & Placement Distribution (#1) ──────
     Box plots per event at a chosen stage, with the 15th-place cutoff score
     drawn as a reference line so you can see how close the advancement cutoff
     falls to the distribution's mass.
  ──────────────────────────────────────────────────────── */
  function renderScoringSection(year, data){
    const stage = pmState.scoringStage;
    // 18th-place line is only meaningful at Zones from 2026 on: places 4–18
    // advance to E/W/C, while places 1–3 advance straight to Junior Nationals.
    const showCutoff = stage === 'Zones' && Number(year) >= 2026;
    const stagePicker = STAGE_ORDER
      .filter(s => s !== 'EWC' || year >= 2026)
      .map(s => '<button class="pm-cohort-stage-btn ' + (s === stage ? 'active' : '') + '" data-pm-score-stage="' + s + '">' + STAGE_SHORT[s] + '</button>')
      .join('');
    const picker = '<div class="pm-cohort-controls"><div class="pm-cohort-stage-picker">' + stagePicker + '</div>' +
      '<div class="pm-score-hint">Box = middle 50% of scores (Q1–Q3). Line in box = median. Whiskers = full range.' +
      (showCutoff ? ' <span class="pm-score-cutoff-key"></span> = 18th-place score (E/W/C qualifying cutoff).' : '') +
      '</div></div>';

    if (!data) {
      return sectionShell(5, 'Score & Placement Distribution — ' + year,
        'How scores are distributed within each event, and where the advancement cutoff falls on that distribution.',
        '<div class="pm-loading"><div class="pm-loading-spinner"></div><div class="pm-loading-text">Loading score distributions…</div></div>');
    }
    if (!data.length) {
      return sectionShell(5, 'Score & Placement Distribution — ' + year + ' ' + STAGE_SHORT[stage],
        'How scores are distributed within each event at this stage.',
        picker + '<div class="pm-empty"><div class="pm-empty-title">No score data</div>' +
        '<div class="pm-empty-sub">No events at ' + STAGE_SHORT[stage] + ' in ' + year + ' have enough scored athletes (need 6+) under the current filters.</div></div>');
    }

    // Global score range across all events for a shared x-axis
    const allMin = Math.min.apply(null, data.map(d => d.min));
    const allMax = Math.max.apply(null, data.map(d => d.max));
    const pad = (allMax - allMin) * 0.05 || 10;
    const axMin = Math.max(0, allMin - pad);
    const axMax = allMax + pad;

    // KPIs
    const totalEvents = data.length;
    const avgN = Math.round(data.reduce((a, d) => a + d.n, 0) / totalEvents);
    const widestEvent = data.slice().sort((a, b) => (b.max - b.min) - (a.max - a.min))[0];
    const tightestEvent = data.slice().sort((a, b) => (a.max - a.min) - (b.max - b.min))[0];
    let kpis = '<div class="pm-kpi-strip">';
    kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Events analyzed</div>' +
            '<div class="pm-kpi-value">' + totalEvents + '</div>' +
            '<div class="pm-kpi-sub">at ' + STAGE_SHORT[stage] + ', ' + year + ' (6+ scored)</div></div>';
    kpis += '<div class="pm-kpi pool"><div class="pm-kpi-label">Median field size</div>' +
            '<div class="pm-kpi-value">' + avgN + '</div>' +
            '<div class="pm-kpi-sub">scored athletes per event</div></div>';
    kpis += '<div class="pm-kpi accent"><div class="pm-kpi-label">Widest spread</div>' +
            '<div class="pm-kpi-value" style="font-size:16px;line-height:1.15">' + escapeHtml(fullEventLabel(widestEvent)) + '</div>' +
            '<div class="pm-kpi-sub">range ' + widestEvent.min.toFixed(0) + '–' + widestEvent.max.toFixed(0) + '</div></div>';
    kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Tightest spread</div>' +
            '<div class="pm-kpi-value" style="font-size:16px;line-height:1.15">' + escapeHtml(fullEventLabel(tightestEvent)) + '</div>' +
            '<div class="pm-kpi-sub">range ' + tightestEvent.min.toFixed(0) + '–' + tightestEvent.max.toFixed(0) + '</div></div>';
    kpis += '</div>';

    // Box-plot rows
    const rowH = 46, labelW = 268, chartW = 690, padR = 30;
    const W = labelW + chartW + padR;
    const H = data.length * rowH + 50;
    function xOf(v){ return labelW + (v - axMin) / (axMax - axMin) * chartW; }

    let svg = '<svg class="pm-score-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';
    // X-axis ticks
    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
      const v = axMin + (axMax - axMin) * i / tickCount;
      const x = xOf(v);
      svg += '<line x1="' + x + '" y1="34" x2="' + x + '" y2="' + (H - 12) + '" stroke="#eaecf3" stroke-width="1"/>';
      svg += '<text x="' + x + '" y="24" text-anchor="middle" class="pm-axis-tick">' + v.toFixed(0) + '</text>';
    }
    svg += '<text x="' + (labelW + chartW/2) + '" y="' + (H - 1) + '" text-anchor="middle" class="pm-bar-label">Score</text>';

    data.forEach((d, i) => {
      const cy = 44 + i * rowH + rowH/2 - 6;
      const boxTop = cy - 11, boxH = 22;
      // Whisker
      svg += '<line x1="' + xOf(d.min) + '" y1="' + cy + '" x2="' + xOf(d.max) + '" y2="' + cy + '" stroke="#94a3b8" stroke-width="1.5"/>';
      svg += '<line x1="' + xOf(d.min) + '" y1="' + (cy-6) + '" x2="' + xOf(d.min) + '" y2="' + (cy+6) + '" stroke="#94a3b8" stroke-width="1.5"/>';
      svg += '<line x1="' + xOf(d.max) + '" y1="' + (cy-6) + '" x2="' + xOf(d.max) + '" y2="' + (cy+6) + '" stroke="#94a3b8" stroke-width="1.5"/>';
      // Box (Q1–Q3)
      svg += '<rect x="' + xOf(d.q1) + '" y="' + boxTop + '" width="' + (xOf(d.q3) - xOf(d.q1)) + '" height="' + boxH + '" ' +
             'fill="rgba(0,154,199,0.22)" stroke="#009ac7" stroke-width="1.5" rx="3"><title>' +
             escapeHtml(d.event_name) + ' — n=' + d.n + ', median ' + d.median.toFixed(1) + ', Q1 ' + d.q1.toFixed(1) + ', Q3 ' + d.q3.toFixed(1) + '</title></rect>';
      // Median line
      svg += '<line x1="' + xOf(d.median) + '" y1="' + boxTop + '" x2="' + xOf(d.median) + '" y2="' + (boxTop+boxH) + '" stroke="#171f69" stroke-width="2.5"/>';
      // Mean dot
      svg += '<circle cx="' + xOf(d.mean) + '" cy="' + cy + '" r="3" fill="#171f69" opacity="0.5"/>';
      // 18th-place cutoff reference line (Zones → E/W/C; places 1–3 go to Nationals)
      if (showCutoff && d.cutoff18 != null && d.n >= 18) {
        svg += '<line x1="' + xOf(d.cutoff18) + '" y1="' + (boxTop-5) + '" x2="' + xOf(d.cutoff18) + '" y2="' + (boxTop+boxH+5) + '" stroke="#e31937" stroke-width="2" stroke-dasharray="3,2"><title>18th-place score: ' + d.cutoff18.toFixed(1) + ' \u2014 places 4\u201318 advance to E/W/C; places 1\u20133 advance to Junior Nationals</title></line>';
      }
      // Event label (full words)
      svg += '<text x="' + (labelW - 12) + '" y="' + (cy - 1) + '" text-anchor="end" class="pm-score-event-label">' + escapeHtml(fullEventLabel(d)) + '</text>';
      svg += '<text x="' + (labelW - 12) + '" y="' + (cy + 11) + '" text-anchor="end" class="pm-score-event-sub">' + fmtNum(d.n) + ' athletes</text>';
    });
    svg += '</svg>';

    return sectionShell(5, 'Score & Placement Distribution — ' + year + ' ' + STAGE_SHORT[stage],
      'How scores spread within each event at ' + STAGE_SHORT[stage] + '. Each row is one event. The box covers the middle 50% of athletes (Q1 to Q3); the dark line is the median and the faint dot is the mean. The whiskers reach the lowest and highest scores.' +
      (showCutoff ? ' The red dashed line marks the 18th-place score — the cutoff to advance to the E/W/C Championships (places 4–18). Places 1–3 in each event advance directly to Junior Nationals, and divers near the 18th-place score may also qualify on the average-score rule, so treat the line as the primary cutoff rather than an exact one.' : ''),
      kpis + picker + '<div class="pm-score-wrap">' + svg + '</div>');
  }

  function shortEventLabel(d){
    // Compress "Group A Boys 3 Meter Springboard" → "A Boys 3m"
    var ag = (d.age_group || '').replace('Group ', '');
    var disc = (d.discipline || '');
    disc = disc.replace(/spring ?board/i, 'm').replace(/platform/i, 'Plat').replace(/1 ?meter/i, '1m').replace(/3 ?meter/i, '3m').replace(/synchro/i, 'Syn');
    var g = (d.gender || '').replace('Boys', 'B').replace('Girls', 'G').replace('Male','B').replace('Female','G');
    var s = (ag + ' ' + g + ' ' + disc).replace(/\s+/g, ' ').trim();
    return s || (d.event_name || d.event_key || '').slice(0, 24);
  }

  function fullEventLabel(d){
    // Full-word label, e.g. "Group A · Boys · 1M" / "Group B · Girls · Platform".
    var ag = (d.age_group || '').trim();
    var g  = (d.gender || '').trim();
    var disc = (d.discipline || '').trim()
      .replace(/spring ?board/i, '')
      .replace(/1 ?meter/i, '1M').replace(/3 ?meter/i, '3M')
      .replace(/^platform$/i, 'Platform')
      .replace(/synchro[\s-]*platform/i, 'Synchro Platform')
      .replace(/synchro[\s-]*3 ?m/i, 'Synchro 3M')
      .replace(/synchro[\s-]*1 ?m/i, 'Synchro 1M')
      .replace(/\s+/g, ' ').trim();
    var parts = [ag, g, disc].filter(function(x){ return x; });
    return parts.join(' \u00b7 ') || (d.event_name || d.event_key || '').slice(0, 28);
  }

  /* ── SECTION 6: Special Status & Flags (#4) ──────────────
     Declined-Nationals analysis (computable all years from Neon) plus the
     2026-only foreign/dual/HPS/YMCA flags from client-side EWC data.
  ──────────────────────────────────────────────────────── */
  function renderStatusSection(year, data){
    if (!data) {
      return sectionShell(6, 'Special Status & Flags — ' + year,
        'Athletes who qualified but declined to advance, plus special-status flags where tracked.',
        '<div class="pm-loading"><div class="pm-loading-spinner"></div><div class="pm-loading-text">Loading status data…</div></div>');
    }

    // Status flags block (valid to show even mid-season — these are registration
    // designations, not advancement outcomes). Computed once, used by both paths.
    let flagsBlock = '';
    if (data.flags.tracked) {
      const chip = (label, count, color) =>
        '<div class="pm-status-flag-chip" style="--c:' + color + '"><div class="cnt">' + fmtNum(count) + '</div><div class="lbl">' + label + '</div></div>';
      flagsBlock = '<div class="pm-status-block"><div class="pm-status-block-head">Special-status athletes — ' + year + '</div>' +
        '<div class="pm-status-block-sub">From the official E/W/C status data. These designations affect qualification and counting rules.</div>' +
        '<div class="pm-status-flags">' +
          chip('Foreign', data.flags.foreign, '#009ac7') +
          chip('Dual citizen', data.flags.dual, '#171f69') +
          chip('HPS', data.flags.hps, '#d97706') +
          chip('YMCA', data.flags.ymca, '#e31937') +
        '</div></div>';
    } else {
      flagsBlock = '<div class="pm-footnote"><strong>Note:</strong> Foreign / dual-citizen / HPS / YMCA status flags began being tracked in 2026 with the E/W/C system. ' +
        'For ' + year + ', only the declined-to-advance analysis is available — it is computed directly from placement and attendance data.</div>';
    }

    // The did-not-continue lens needs the stages an athlete could advance to be
    // finished. While the season is still live, hold those numbers back rather
    // than show a misleading "decline" rate that's really just unfinished meets.
    if (!data.advancementComplete) {
      const banner =
        '<div style="display:flex;gap:10px;align-items:flex-start;background:#eaf6fb;border-left:4px solid #009ac7;border-radius:8px;padding:14px 16px;margin:0 0 14px;font-family:Inter,sans-serif;font-size:14px;line-height:1.45;color:#0d2230">' +
          '<span style="flex:0 0 auto;width:10px;height:10px;border-radius:50%;background:#009ac7;margin-top:5px;box-shadow:0 0 0 3px rgba(0,154,199,0.25)"></span>' +
          '<span><strong>Advancement is still in progress for ' + year + '.</strong> ' +
          'Whether a Zone qualifier continued on can\'t be measured yet \u2014 places 1\u20133 advance straight to Junior Nationals and places 4\u201318 advance to the E/W/C Championships, and those meets are still being contested or have not yet been held. ' +
          'A reliable did-not-continue rate will appear here once Junior Nationals is complete.</span>' +
        '</div>';
      return sectionShell(6, 'Special Status & Flags — ' + year,
        'Two lenses on athletes the standard funnel doesn\'t fully capture: who qualified at Zones but didn\'t continue on, and special-status designations (foreign, dual-citizen, HPS, YMCA) where tracked. The did-not-continue lens waits until the season\u2019s remaining meets are complete.',
        banner + flagsBlock);
    }

    // Declined totals
    const totQual = data.declined.reduce((a, r) => a + r.qualified, 0);
    const totDeclined = data.declined.reduce((a, r) => a + r.declined, 0);
    const declineRate = totQual ? (totDeclined / totQual * 100).toFixed(1) : '—';
    const nextStageLabel = year >= 2026 ? 'E/W/C or Nationals' : 'Junior Nationals';

    let kpis = '<div class="pm-kpi-strip">';
    kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Top-18 finishers at Zones</div>' +
            '<div class="pm-kpi-value">' + fmtNum(totQual) + '</div>' +
            '<div class="pm-kpi-sub">distinct athletes · best event placing ≤ 18</div></div>';
    kpis += '<div class="pm-kpi accent"><div class="pm-kpi-label">Did not continue</div>' +
            '<div class="pm-kpi-value">' + fmtNum(totDeclined) + '</div>' +
            '<div class="pm-kpi-sub">no appearance at ' + nextStageLabel + '</div></div>';
    kpis += '<div class="pm-kpi pool"><div class="pm-kpi-label">Did-not-continue rate</div>' +
            '<div class="pm-kpi-value">' + declineRate + '%</div>' +
            '<div class="pm-kpi-sub">share of top-18 athletes</div></div>';
    if (data.flags.tracked) {
      kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Special-status flags</div>' +
              '<div class="pm-kpi-value" style="font-size:20px">' + (data.flags.foreign + data.flags.dual + data.flags.hps + data.flags.ymca) + '</div>' +
              '<div class="pm-kpi-sub">foreign + dual + HPS + YMCA</div></div>';
    }
    kpis += '</div>';

    // Declined breakdown table by age × gender
    let tbl = '';
    if (data.declined.length) {
      tbl = '<div class="pm-status-block"><div class="pm-status-block-head">Did not continue — by age group &amp; gender</div>' +
        '<div class="pm-status-block-sub">Distinct athletes who finished in the top 18 in at least one event at ' + year + ' Zones but did not appear at ' + nextStageLabel + '. ' +
        'Each athlete is counted once (by their best event), not once per event. Top 18 is used here as a working advancing-band definition. ' +
        'A high rate may indicate cost, travel, or scheduling barriers.</div>' +
        '<table class="pm-status-table"><thead><tr><th>Age group</th><th>Gender</th><th>Top-18 athletes</th><th>Did not continue</th><th>Rate</th></tr></thead><tbody>';
      data.declined.forEach(r => {
        const rate = r.qualified ? (r.declined / r.qualified * 100).toFixed(1) : '0.0';
        const hot = Number(rate) >= 25;
        tbl += '<tr><td>' + escapeHtml(r.age_group || '—') + '</td><td>' + escapeHtml(r.gender || '—') + '</td>' +
          '<td>' + fmtNum(r.qualified) + '</td><td>' + fmtNum(r.declined) + '</td>' +
          '<td class="' + (hot ? 'pm-status-hot' : '') + '">' + rate + '%</td></tr>';
      });
      tbl += '</tbody></table></div>';
    } else {
      tbl = '<div class="pm-empty"><div class="pm-empty-sub">No declined-athlete data available for ' + year + ' under the current filters.</div></div>';
    }

    return sectionShell(6, 'Special Status & Flags — ' + year,
      'Two lenses on the athletes the standard funnel doesn\'t fully capture. First, distinct athletes who reached the top 18 at Zones but did not appear at the next stage — which can point to barriers like cost and travel. Second, special-status designations (foreign, dual-citizen, High Performance Squad, YMCA) where the data is tracked.',
      kpis + tbl + flagsBlock);
  }

  /* ── SECTION 7: Athlete Career Trace (#3) ────────────────
     Search by name or DiveMeets ID; render one athlete's full multi-year
     journey as a timeline of meets, placements, and scores.
  ──────────────────────────────────────────────────────── */
  function renderCareerSection(){
    const searchBox =
      '<div class="pm-career-search">' +
        '<input type="text" id="pmCareerInput" class="pm-career-input" placeholder="Search by athlete name or DiveMeets ID…" ' +
          'value="' + escapeHtml(pmState.careerQuery || '') + '" autocomplete="off">' +
        '<button class="pm-career-btn" id="pmCareerGo">Search</button>' +
      '</div>';

    let resultsBlock = '';
    if (pmState.careerResults && !pmState.careerSelectedId) {
      if (!pmState.careerResults.length) {
        resultsBlock = '<div class="pm-empty"><div class="pm-empty-sub">No athletes found matching "' + escapeHtml(pmState.careerQuery) + '". Try a different spelling or a DiveMeets ID.</div></div>';
      } else {
        resultsBlock = '<div class="pm-career-results">' +
          pmState.careerResults.map(a =>
            '<button class="pm-career-result" data-pm-career-id="' + escapeHtml(String(a.id)) + '">' +
              '<span class="pm-career-result-name">' + escapeHtml((a.first || '') + ' ' + (a.last || '')) + '</span>' +
              '<span class="pm-career-result-meta">DM ' + escapeHtml(String(a.id)) + (a.count != null ? ' · ' + a.count + ' results' : '') + '</span>' +
            '</button>'
          ).join('') +
        '</div>';
      }
    }

    let careerBlock = '';
    if (pmState.careerSelectedId && pmState.careerData) {
      const c = pmState.careerData;
      // Group rows by year, then stage
      const byYear = {};
      c.rows.forEach(r => {
        if (!byYear[r.year]) byYear[r.year] = {};
        if (!byYear[r.year][r.stage]) byYear[r.year][r.stage] = [];
        byYear[r.year][r.stage].push(r);
      });
      const years = Object.keys(byYear).map(Number).sort();

      // Career summary KPIs
      const allYears = years.length;
      const bestPlace = Math.min.apply(null, c.rows.filter(r => r.place != null).map(r => r.place).concat([Infinity]));
      const natFinals = c.rows.filter(r => r.stage === 'Nationals' && r.round === 'Final').length;
      const teams = Array.from(new Set(c.rows.map(r => r.team_name).filter(Boolean)));

      let kpis = '<div class="pm-kpi-strip">';
      kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Seasons on record</div>' +
              '<div class="pm-kpi-value">' + allYears + '</div>' +
              '<div class="pm-kpi-sub">' + (years.length ? years[0] + '–' + years[years.length-1] : '') + '</div></div>';
      kpis += '<div class="pm-kpi accent"><div class="pm-kpi-label">Best placement</div>' +
              '<div class="pm-kpi-value">' + (bestPlace === Infinity ? '—' : ordinal(bestPlace)) + '</div>' +
              '<div class="pm-kpi-sub">across all meets</div></div>';
      kpis += '<div class="pm-kpi pool"><div class="pm-kpi-label">Junior Nationals finals</div>' +
              '<div class="pm-kpi-value">' + natFinals + '</div>' +
              '<div class="pm-kpi-sub">final-round appearances</div></div>';
      kpis += '<div class="pm-kpi"><div class="pm-kpi-label">Team(s)</div>' +
              '<div class="pm-kpi-value" style="font-size:16px;line-height:1.2">' + escapeHtml(teams[0] || '—') + '</div>' +
              '<div class="pm-kpi-sub">' + (teams.length > 1 ? '+' + (teams.length-1) + ' more' : 'club affiliation') + '</div></div>';
      kpis += '</div>';

      // Timeline
      let timeline = '<div class="pm-career-timeline">';
      years.forEach(y => {
        timeline += '<div class="pm-career-year">' +
          '<div class="pm-career-year-label">' + y + '</div>' +
          '<div class="pm-career-stages">';
        STAGE_ORDER.forEach(stg => {
          const rows = byYear[y][stg];
          if (!rows || !rows.length) return;
          // Best place at this stage
          const places = rows.filter(r => r.place != null).map(r => r.place);
          const best = places.length ? Math.min.apply(null, places) : null;
          const madeFinal = rows.some(r => r.round === 'Final');
          const stageColor = { Regionals: '#171f69', Zones: '#1e2d8a', EWC: '#009ac7', Nationals: '#e31937' }[stg] || '#171f69';
          // Distinct events
          const events = Array.from(new Set(rows.map(r => r.event_name))).length;
          timeline += '<div class="pm-career-stage" style="--c:' + stageColor + '">' +
            '<div class="pm-career-stage-head">' + STAGE_SHORT[stg] + (madeFinal && stg === 'Nationals' ? ' <span class="pm-career-final-badge">FINAL</span>' : '') + '</div>' +
            '<div class="pm-career-stage-body">' +
              '<div class="pm-career-stat"><span class="v">' + (best != null ? ordinal(best) : '—') + '</span><span class="l">best place</span></div>' +
              '<div class="pm-career-stat"><span class="v">' + events + '</span><span class="l">event' + (events===1?'':'s') + '</span></div>' +
            '</div>' +
          '</div>';
        });
        timeline += '</div></div>';
      });
      timeline += '</div>';

      // Detail table (collapsed)
      let detail = '<details class="pm-career-detail"><summary>Full result detail (' + c.rows.length + ' rows)</summary>' +
        '<table class="pm-status-table"><thead><tr><th>Year</th><th>Stage</th><th>Event</th><th>Round</th><th>Place</th><th>Score</th></tr></thead><tbody>';
      c.rows.forEach(r => {
        detail += '<tr><td>' + r.year + '</td><td>' + escapeHtml(r.stage) + '</td>' +
          '<td>' + escapeHtml(r.event_name || '') + '</td><td>' + escapeHtml(r.round || '—') + '</td>' +
          '<td>' + (r.place != null ? r.place : '—') + '</td><td>' + (r.score != null ? r.score.toFixed(2) : '—') + '</td></tr>';
      });
      detail += '</tbody></table></details>';

      careerBlock =
        '<div class="pm-career-header">' +
          '<div class="pm-career-name">' + escapeHtml(c.name) + '</div>' +
          '<button class="pm-career-clear" id="pmCareerClear">← New search</button>' +
        '</div>' +
        kpis + timeline + detail;
    }

    return sectionShell(7, 'Athlete Career Trace',
      'Search for any athlete by name or DiveMeets ID to see their full journey through the Junior Circuit — every season, every stage, best placements, and Junior Nationals final-round appearances. Useful for answering "how has this athlete progressed?" or verifying an individual\'s history.',
      searchBox + resultsBlock + careerBlock);
  }

  function ordinal(n){
    if (n == null) return '—';
    const s = ['th','st','nd','rd'], v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
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

    return sectionShell(8, 'Financial Breakdown — ' + year,
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
          pmState.cohortCache = {};       // invalidate just this section's cache
          pmState.cohortCompareCache = {}; // comparison depends on start stage too
          renderPipeline();
        }
      });
    });
    // Cross-cohort comparison year pills (#2)
    document.querySelectorAll('[data-pm-cohort-cmp]').forEach(el => {
      el.addEventListener('click', function(){
        const y = Number(this.getAttribute('data-pm-cohort-cmp'));
        const idx = pmState.cohortCompareYears.indexOf(y);
        if (idx >= 0) pmState.cohortCompareYears.splice(idx, 1);
        else pmState.cohortCompareYears.push(y);
        renderPipeline();
      });
    });
    const cmpClear = document.getElementById('pmCohortCmpClear');
    if (cmpClear) cmpClear.addEventListener('click', function(){
      pmState.cohortCompareYears = [];
      renderPipeline();
    });
    // Pipeline lens: unique divers vs event entries (render-only — both metrics
    // are already in the loaded data; switching never refetches or blends them).
    document.querySelectorAll('[data-pm-lens]').forEach(el => {
      el.addEventListener('click', function(){
        const v = this.getAttribute('data-pm-lens');
        if (v && v !== pmState.lens) {
          pmState.lens = v;
          renderPipeline();
        }
      });
    });
    // Score & placement stage picker (#1)
    document.querySelectorAll('[data-pm-score-stage]').forEach(el => {
      el.addEventListener('click', function(){
        const s = this.getAttribute('data-pm-score-stage');
        if (s && s !== pmState.scoringStage) {
          pmState.scoringStage = s;
          renderPipeline();
        }
      });
    });
    // Athlete career search (#3)
    const careerInput = document.getElementById('pmCareerInput');
    const careerGo = document.getElementById('pmCareerGo');
    async function doCareerSearch(){
      const q = careerInput ? careerInput.value.trim() : '';
      if (q.length < 2) return;
      pmState.careerQuery = q;
      pmState.careerSelectedId = null;
      pmState.careerData = null;
      pmState.careerResults = [{ id: '__loading__', first: 'Searching', last: '…' }];
      try {
        pmState.careerResults = await searchAthletes(q);
      } catch (e) {
        pmState.careerResults = [];
      }
      renderPipeline();
    }
    if (careerGo) careerGo.addEventListener('click', doCareerSearch);
    if (careerInput) careerInput.addEventListener('keydown', function(e){
      if (e.key === 'Enter') { e.preventDefault(); doCareerSearch(); }
    });
    document.querySelectorAll('[data-pm-career-id]').forEach(el => {
      el.addEventListener('click', async function(){
        const id = this.getAttribute('data-pm-career-id');
        pmState.careerSelectedId = id;
        try {
          pmState.careerData = await loadAthleteCareer(id);
        } catch (e) {
          pmState.careerData = null;
        }
        renderPipeline();
      });
    });
    const careerClear = document.getElementById('pmCareerClear');
    if (careerClear) careerClear.addEventListener('click', function(){
      pmState.careerSelectedId = null;
      pmState.careerData = null;
      pmState.careerResults = null;
      pmState.careerQuery = '';
      renderPipeline();
    });
    // Click-to-filter (#5): any element with data-pm-setfilter="key:value"
    document.querySelectorAll('[data-pm-setfilter]').forEach(el => {
      el.addEventListener('click', function(){
        const spec = this.getAttribute('data-pm-setfilter');
        const ci = spec.indexOf(':');
        if (ci < 0) return;
        const key = spec.slice(0, ci), val = spec.slice(ci + 1);
        if (pmState.filters.hasOwnProperty(key)) {
          // Toggle: clicking the same value again clears it
          pmState.filters[key] = (pmState.filters[key] === val) ? '' : val;
          invalidateCache();
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

    // Preserve scroll position across re-renders so clicking a toggle/tab/filter
    // doesn't throw the user back to the top of the page.
    const prevScroll = window.scrollY || window.pageYOffset || 0;

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
    const firstLoad = !dash.querySelector('.pm-section');

    // First-load only: show shell with spinner. On re-renders we keep the
    // current content on screen until the new content is ready, which avoids
    // a height-collapsing flash that scrolls the page to the top.
    if (firstLoad) {
      dash.innerHTML =
        '<div class="pm-root">' +
          renderHero() +
          '<div class="pm-loading"><div class="pm-loading-spinner"></div>' +
          '<div class="pm-loading-text">Loading from Neon…</div>' +
          '<div class="pm-loading-sub">Pulling Junior Circuit data, 2021–2026</div></div>' +
        '</div>';
    }

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
      const [filterOpts, funnel, demo, cohort, retention, scoring, status] = await Promise.all([
        loadFilterOptions(),
        loadFunnelData(pmState.selectedYear),
        loadDemographicsData(pmState.selectedYear),
        loadCohortProgression(pmState.selectedYear, pmState.cohortStartStage),
        loadRetentionRates(),
        loadScoringData(pmState.selectedYear, pmState.scoringStage),
        loadStatusData(pmState.selectedYear),
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
          renderScoringSection(pmState.selectedYear, scoring) +
          renderStatusSection(pmState.selectedYear, status) +
          renderCareerSection() +
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

      // Cross-cohort comparison overlay (async)
      if (pmState.cohortCompareYears && pmState.cohortCompareYears.length) {
        try {
          const cmp = await loadCohortComparison(pmState.cohortCompareYears, pmState.cohortStartStage);
          const slot = document.getElementById('pmCohortCmpSlot');
          if (slot) slot.innerHTML = renderCohortComparisonOverlay(cmp, pmState.cohortStartStage);
        } catch (e) {
          const slot = document.getElementById('pmCohortCmpSlot');
          if (slot) slot.innerHTML = '<div class="pm-error"><strong>Could not load comparison:</strong> ' + escapeHtml(e.message) + '</div>';
        }
      }

      bindHandlers();
      if (!firstLoad) {
        requestAnimationFrame(function(){ window.scrollTo(0, prevScroll); });
      }
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

  /* Static river render for the report builder. Produces the exact river flow
     map (caveat banner + KPIs + SVG + legend + by-age-group breakdown) for a
     given year, in the divers lens with no master filters, and with the
     interactive lens toggle replaced by a static label. Restores live state. */
  window.PM_riverReport = async function(year){
    const saved = { lens: pmState.lens, filters: pmState.filters, selectedYear: pmState.selectedYear };
    try {
      pmState.lens = 'divers';
      pmState.filters = { age_group:'', gender:'', discipline:'', zone:'', region:'' };
      const data = await loadFunnelData(year);
      return renderFunnelSection(year, data, true);
    } finally {
      pmState.lens = saved.lens;
      pmState.filters = saved.filters;
      pmState.selectedYear = saved.selectedYear;
    }
  };

  /* Dedicated, gold-standard print of the river: a clean landscape page with a
     USA Diving header, the full-bleed colour-preserved flow map, the by-age
     breakdown, and a footer. Built as a print-only overlay so the page's own
     styles apply but only this prints. */
  window.PM_printRiver = async function(year){
    year = year || pmState.selectedYear ||
           (pmState.yearsAvailable && pmState.yearsAvailable.length ? Math.max.apply(null, pmState.yearsAvailable) : 2026);
    const btn = document.querySelector('[data-pm-print]');
    if (btn) { btn.disabled = true; btn.textContent = 'Preparing…'; }
    let body;
    try { body = await window.PM_riverReport(year); }
    catch(e){ if (btn){ btn.disabled=false; btn.innerHTML='&#128424; Print / Save PDF'; } alert('Could not build the river for printing: ' + ((e && e.message) || e)); return; }

    const prev = document.getElementById('pm-print-root'); if (prev) prev.remove();
    const isNew = Number(year) >= 2026;
    const path = isNew
      ? 'Regionals \u2192 Zones \u2192 East / West / Central \u2192 Junior Nationals'
      : 'Regionals \u2192 Zones \u2192 Junior Nationals';
    const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

    const root = document.createElement('div');
    root.id = 'pm-print-root';
    root.innerHTML =
      '<style>' +
        '#pm-print-root{display:none}' +
        '@media print{' +
          'html,body{background:#fff !important;margin:0 !important;padding:0 !important}' +
          'body > *:not(#pm-print-root){display:none !important}' +
          '#pm-print-root{display:block !important;position:static !important;padding:0 !important}' +
          '@page{size:landscape;margin:11mm}' +
          '*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}' +
          '#pm-print-root .pm-section{box-shadow:none !important;border:0 !important;padding:0 !important;margin:0 !important;background:#fff !important}' +
          '#pm-print-root .pm-section-head{display:none !important}' +
          '#pm-print-root .pm-flow-scroll{overflow:visible !important;margin:0 !important}' +
          '#pm-print-root .pm-flow-wrap{padding:0 !important}' +
          '#pm-print-root svg{width:100% !important;height:auto !important;max-width:100% !important}' +
          '#pm-print-root .pm-adv-breakdown,#pm-print-root .pm-twolens,#pm-print-root .pm-kpi-strip{page-break-inside:avoid}' +
          '#pm-print-root .pmp-head{display:flex;align-items:flex-end;justify-content:space-between;border-bottom:3px solid #E31937;padding-bottom:9px;margin-bottom:14px}' +
          '#pm-print-root .pmp-title{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:29px;color:#171F69;line-height:1;text-transform:uppercase;letter-spacing:.01em}' +
          '#pm-print-root .pmp-sub{font-family:Inter,sans-serif;font-size:11px;color:#5f6062;margin-top:4px}' +
          '#pm-print-root .pmp-mark{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:16px;color:#171F69;text-align:right;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap}' +
          '#pm-print-root .pmp-mark b{color:#E31937;font-weight:700}' +
          '#pm-print-root .pmp-foot{margin-top:14px;border-top:1px solid #d7dcea;padding-top:7px;font-family:Inter,sans-serif;font-size:9.5px;color:#8a93a6}' +
        '}' +
      '</style>' +
      '<div class="pmp-head">' +
        '<div>' +
          '<div class="pmp-title">Junior Qualification Pipeline \u2014 ' + year + '</div>' +
          '<div class="pmp-sub">' + path + '</div>' +
        '</div>' +
        '<div class="pmp-mark">USA <b>Diving</b></div>' +
      '</div>' +
      body +
      '<div class="pmp-foot">Generated ' + today + ' \u00b7 USA Diving Junior Results Audit \u00b7 Projected fields are computed from current results and can change with declines and registration.</div>';

    document.body.appendChild(root);
    const cleanup = function(){ try { root.remove(); } catch(e){} if (btn){ btn.disabled=false; btn.innerHTML='&#128424; Print / Save PDF'; } window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    setTimeout(function(){ window.print(); setTimeout(cleanup, 1500); }, 80);
  };

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
