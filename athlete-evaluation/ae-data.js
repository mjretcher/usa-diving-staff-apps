/* ============================================================
   ae-data.js — shared data layer for Athlete Evaluation.

   Identity model: analytics.athlete_identity links DiveMeets ids to
   World Aquatics ids (exact normalized-name matches auto-accepted,
   agreed with Mike 2026-07-21). Every athlete fetch queries BOTH ids.

   Execution normalization (validated against live data 2026-07-21):
   5-judge (drop 1+1) and 7-judge (drop 2+2) panels both reduce to
   score = (sum of 3 middle judges) x DD, so
       execution-per-judge = score / (3 x DD), clamped to [0,10].
   Synchro scoring differs (11-judge, x0.6) — synchro rows are shown
   in score history but EXCLUDED from all execution analytics.

   The dive-sheet scraper is still back-filling meets (target: 2015
   and earlier), so nothing here hardcodes coverage — the app reads
   whatever exists and labels coverage per athlete.
   ============================================================ */
(function () {
  'use strict';

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  // For strings embedded inside onclick="..." attributes — browser decodes
  // HTML entities before the JS parser sees them (house rule).
  const escJsAttr = (s) => esc(String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));

  const num = (v) => { if (v == null || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

  // Postgres booleans reach us as real booleans over the normal client, but as
  // 't'/'f' strings whenever raw-text output is on — which is how the Vercel
  // proxy and several of the audit scripts talk to Neon. A bare === true test
  // silently inverts under one transport and not the other, so every boolean
  // from the database goes through this.
  const truthy = (v) => v === true || v === 't' || v === 'true' || v === 1 || v === '1';

  function q(sql, params) {
    return window.NEON.query(sql, (params || []).map((p) => p == null ? null : String(p)));
  }

  const INDIV = new Set(['1m', '3m', 'Platform']);
  // Dive groups now come from AETaxonomy (ae-taxonomy.js), which implements the
  // 2026 Rulebook Art. 105.1 grammar: twists split by takeoff direction and
  // armstands split by direction, with skills and scraper artifacts excluded.
  const CAT_NAMES = (function () {
    const m = {};
    const G = (window.AETaxonomy && window.AETaxonomy.GROUPS) || {};
    Object.keys(G).forEach((k) => { m[k] = G[k][1]; });
    return m;
  })();
  const CAT_ORDER = (window.AETaxonomy && window.AETaxonomy.GROUP_ORDER)
    || ['1', '2', '3', '4', '51', '52', '53', '54', '61', '62', '63'];

  function isIndiv(row) { return INDIV.has(row.discipline); }

  function execOf(row) {
    const s = num(row.score), dd = num(row.dd);
    if (s == null || dd == null || dd <= 0) return null;
    return Math.min(10, Math.max(0, s / (3 * dd)));
  }

  function parseJudges(str) {
    if (!str) return [];
    return String(str).split(';').map((p) => num(p.split(':')[1])).filter((v) => v != null);
  }

  // Prefer the backfilled column; fall back to live classification so the app
  // still works on rows written before the taxonomy backfill.
  function catOf(row) {
    if (row.dive_group_code) return CAT_NAMES[row.dive_group_code] ? row.dive_group_code : null;
    if (window.AETaxonomy) {
      const r = window.AETaxonomy.classify(row.dive_number);
      return r.bucket === 'dive' ? r.groupCode : null;
    }
    return null;
  }

  // True when the row is a rulebook dive (not a skill or a parse artifact).
  function isRulebookDive(row) {
    if (row.dive_bucket) return row.dive_bucket === 'dive';
    if (window.AETaxonomy) return window.AETaxonomy.classify(row.dive_number).bucket === 'dive';
    return true;
  }

  function bucketOf(row) {
    if (row.dive_bucket) return row.dive_bucket;
    return window.AETaxonomy ? window.AETaxonomy.classify(row.dive_number).bucket : 'dive';
  }

  /* ---------- basic stats ---------- */
  function mean(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; }
  function sd(a) {
    if (a.length < 2) return null;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1));
  }
  function quantile(sorted, p) {
    if (!sorted.length) return null;
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  /* ---------- athlete search ---------- */
  async function searchAthletes(term) {
    const t = '%' + term.trim().replace(/[%_]/g, '') + '%';
    const r = await q(
      `SELECT canonical_id, dm_id, wa_id, display_name, nat, team_name, families,
              first_year, last_year, n_phase_meets, n_sheet_meets, n_dives,
              n_judge_dives, disciplines, match_method
       FROM analytics.athlete_directory
       WHERE display_name ILIKE $1
       ORDER BY n_dives DESC, n_phase_meets DESC
       LIMIT 30`, [t]);
    return r.rows;
  }

  /* ---------- athlete bundle (cached) ---------- */
  const _cache = new Map();

  async function loadAthlete(canonicalId) {
    if (_cache.has(canonicalId)) return _cache.get(canonicalId);
    const idr = await q(
      `SELECT * FROM analytics.athlete_directory WHERE canonical_id = $1`, [canonicalId]);
    if (!idr.rows.length) throw new Error('Athlete not found in directory');
    const ident = idr.rows[0];
    const ids = [ident.canonical_id, ident.wa_id || ident.canonical_id];

    const [phases, sheets] = await Promise.all([
      q(`SELECT meet_id, meet_name, meet_year, competition_family, gender, discipline,
                event_id, age_group, event_level, round_stage, place, posted_score,
                is_synchronized,
                -- Format columns. Without these a 6-dive age-group total and an
                -- 11-dive international total are indistinguishable, and
                -- cumulative running totals get plotted as single-round scores.
                phase_dive_count, score_is_cumulative, phase_dd_sum,
                phase_score_from_dives, score_analysis_mode
         FROM core.result_phases
         WHERE diver_id = $1 OR diver_id = $2
         ORDER BY meet_year, meet_id, event_id`, ids),
      q(`SELECT meet_id, meet_year, competition_family, event_id, event_name, gender,
                discipline, round_stage, dive_order, dive_number, height, description,
                dd, score, judges_scores, running_total_points, round_place,
                dive_category_code, optional_voluntary,
                dive_bucket, dive_group_code, dive_group_label, dive_code_norm
         FROM core.dive_sheets
         WHERE diver_id = $1 OR diver_id = $2
         ORDER BY meet_year, meet_id, event_id, round_stage, dive_order`, ids),
    ]);

    // numeric coercion once (Neon returns strings)
    phases.rows.forEach((r) => {
      r.place = num(r.place); r.posted_score = num(r.posted_score); r.meet_year = num(r.meet_year);
      r.phase_dive_count = num(r.phase_dive_count);
      r.phase_dd_sum = num(r.phase_dd_sum);
      r.phase_score_from_dives = num(r.phase_score_from_dives);
      // Comparability class. Scores are only ever comparable within one of these.
      r._format = r.score_is_cumulative === true ? 'cumulative'
        : (r.phase_dive_count ? r.phase_dive_count + '-dive' : 'unverified');
      r._comparable = r.score_is_cumulative !== true && r.phase_dive_count != null;
    });
    sheets.rows.forEach((r) => {
      r.dd = num(r.dd); r.score = num(r.score); r.meet_year = num(r.meet_year);
      r.dive_order = num(r.dive_order); r.round_place = num(r.round_place);
      r.running_total_points = num(r.running_total_points);
      r._exec = execOf(r); r._cat = catOf(r);
    });

    const bundle = { ident, phases: phases.rows, sheets: sheets.rows };
    _cache.set(canonicalId, bundle);
    return bundle;
  }

  /* ---------- per-dive reliability stats ----------
     rows: individual (non-synchro) sheet rows for one athlete, pre-filtered.
     Grouped by dive_number x height so 107B on 1m and 3m stay separate.   */
  function diveStats(rows) {
    const by = new Map();
    rows.forEach((r) => {
      if (r._exec == null || !r.dive_number) return;
      const key = r.dive_number + '@' + (r.height || r.discipline || '');
      if (!by.has(key)) by.set(key, { key, dive: r.dive_number, height: r.height || r.discipline, desc: r.description, samples: [] });
      const g = by.get(key);
      g.desc = g.desc || r.description;
      g.samples.push({ exec: r._exec, score: r.score, dd: r.dd, year: r.meet_year, meet: r.meet_id, stage: r.round_stage, family: r.competition_family, cat: r._cat });
    });
    const out = [];
    by.forEach((g) => {
      const ex = g.samples.map((s) => s.exec);
      const sorted = ex.slice().sort((a, b) => a - b);
      const dds = g.samples.map((s) => s.dd).filter((v) => v != null);
      const latestDD = g.samples.slice().sort((a, b) => b.year - a.year)[0].dd;
      const st = {
        key: g.key, dive: g.dive, height: g.height, desc: g.desc,
        cat: g.samples[0].cat, samples: g.samples,
        n: ex.length,
        avgExec: mean(ex), sdExec: sd(ex),
        minExec: sorted[0], maxExec: sorted[sorted.length - 1],
        p25: quantile(sorted, 0.25), p50: quantile(sorted, 0.5), p75: quantile(sorted, 0.75),
        failRate: ex.filter((v) => v < 4.5).length / ex.length,
        moneyRate: ex.filter((v) => v >= 7.5).length / ex.length,
        dd: latestDD, avgDD: mean(dds),
        evPts: latestDD != null ? 3 * latestDD * mean(ex) : null,
        floorPts: latestDD != null ? 3 * latestDD * quantile(sorted, 0.1) : null,
        lastYear: Math.max(...g.samples.map((s) => s.year || 0)),
      };
      st.verdict = verdictOf(st);
      out.push(st);
    });
    out.sort((a, b) => (b.evPts || 0) - (a.evPts || 0));
    return out;
  }

  function verdictOf(st) {
    if (st.n < 3) return { tag: 'Developing', cls: 'dev', why: `only ${st.n} competition attempt${st.n === 1 ? '' : 's'} on record — treat the numbers as early signal` };
    if (st.avgExec >= 7.2 && st.failRate === 0 && st.n >= 4) return { tag: 'Money dive', cls: 'money', why: 'high execution, no failed attempts — a scoring weapon' };
    if (st.avgExec >= 6.3 && st.failRate <= 0.06 && (st.sdExec == null || st.sdExec <= 0.95)) return { tag: 'Bankable', cls: 'bank', why: 'consistently lands near its average — safe points' };
    if (st.avgExec < 5.5) return { tag: 'Liability', cls: 'liab', why: 'average execution below satisfactory — costs points most attempts' };
    if ((st.sdExec != null && st.sdExec >= 1.3) || st.failRate >= 0.18) return { tag: 'Volatile', cls: 'vol', why: 'big swings between attempts — high ceiling, dangerous floor' };
    return { tag: 'Steady', cls: 'steady', why: 'dependable mid-range production' };
  }

  /* ---------- benchmarks + field context ---------- */
  async function benchmarks(gender, discipline, family) {
    const r = await q(
      `SELECT meet_id, meet_name, meet_year, competition_family, age_group, event_level,
              n_prelim, n_semi, n_final, win_score, medal_score, final_cut, semi_cut
       FROM analytics.benchmarks
       WHERE gender = $1 AND discipline = $2 AND competition_family = $3
       ORDER BY meet_year DESC, meet_name`, [gender, discipline, family]);
    r.rows.forEach((b) => ['win_score', 'medal_score', 'final_cut', 'semi_cut', 'meet_year', 'n_final'].forEach((k) => { b[k] = num(b[k]); }));
    return r.rows;
  }

  // Five comparison fields exist in analytics.field_group_exec:
  //   us-open (1.15M dives) · us-junior (246k) · us-senior (74k)
  //   ncaa (36k) · world (7.1k, 2025-26 only)
  // The app used to hardcode 'world', the thinnest of the five.
  // ---- shared sample-size standard -------------------------------------
  // One set of thresholds for every view, so a number that is too thin to
  // trust never renders identically to one built from a real sample.
  //   athlete  minimum scored dives by this athlete in a group
  //   field    minimum dives behind a comparison baseline
  //   cell     minimum dives behind a single chart cell or axis
  //   lists    minimum finalist lists behind a list-DD benchmark
  const GUARD = { athlete: 8, field: 150, cell: 20, lists: 6 };

  // n is sufficient for `kind`. Missing/zero always fails.
  function ok(n, kind) {
    return Number(n) >= (GUARD[kind] != null ? GUARD[kind] : GUARD.cell);
  }

  // Plain-English note for a number that did not clear the bar.
  function thinNote(n, kind) {
    const need = GUARD[kind] != null ? GUARD[kind] : GUARD.cell;
    const have = Number(n) || 0;
    return `Too few dives to compare (${have.toLocaleString()} of ${need} needed).`;
  }

  const SCOPES = [
    { id: 'us-junior', label: 'US Junior' },
    { id: 'us-senior', label: 'US Senior' },
    { id: 'us-open',   label: 'US All levels' },
    { id: 'ncaa',      label: 'NCAA' },
    { id: 'world',     label: 'World Aquatics' },
  ];
  const NUMS_FGE = ['meet_year', 'n', 'n_divers', 'avg_exec', 'p25_exec',
    'p50_exec', 'p75_exec', 'p90_exec', 'fail_rate', 'avg_dd'];

  // core.dive_sheets uses Female/Male throughout, but athlete rows have carried
  // Women/Girls/Boys in places. Normalise so a variant never silently returns
  // an empty comparison field.
  function normGender(g) {
    const t = String(g || '').trim().toLowerCase();
    if (['female', 'women', 'woman', 'girls', 'girl', 'f', 'w'].includes(t)) return 'Female';
    if (['male', 'men', 'man', 'boys', 'boy', 'm'].includes(t)) return 'Male';
    return g || null;
  }

  async function fieldGroupExec(gender, discipline, scope, yearFrom) {
    gender = normGender(gender);
    const r = await q(
      `SELECT meet_year, scope, category_code, category_label, n, n_divers,
              avg_exec, p25_exec, p50_exec, p75_exec, p90_exec, fail_rate, avg_dd
       FROM analytics.field_group_exec
       WHERE gender = $1 AND discipline = $2
         AND ($3::text IS NULL OR scope = $3)
         AND ($4::int  IS NULL OR meet_year >= $4)
       ORDER BY meet_year DESC`,
      [gender, discipline, scope || null, yearFrom || null]);
    r.rows.forEach((x) => NUMS_FGE.forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  // Score-by-place with its spread across meets, for a single dive-count format.
  async function rankCost(gender, discipline, scope, diveCount, place) {
    const r = await q(
      `SELECT scope, gender, discipline, dive_count, place, n_meets,
              avg_score, p25_score, p50_score, p75_score, sd_score
       FROM analytics.rank_cost
       WHERE gender = $1 AND discipline = $2 AND scope = $3
         AND ($4::int IS NULL OR dive_count = $4)
         AND ($5::int IS NULL OR place = $5)
       ORDER BY place`,
      [normGender(gender), discipline, scope, diveCount || null, place || null]);
    r.rows.forEach((x) => ['dive_count', 'place', 'n_meets', 'avg_score', 'p25_score',
      'p50_score', 'p75_score', 'sd_score'].forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  // Field decomposed by finishing band: difficulty vs execution.
  async function eventProfile(gender, discipline, scope, diveCount) {
    const r = await q(
      `SELECT scope, gender, discipline, dive_count, meet_year, band,
              n, avg_score, avg_list_dd, avg_exec
       FROM analytics.event_profile
       WHERE gender = $1 AND discipline = $2 AND scope = $3
         AND ($4::int IS NULL OR dive_count = $4)`,
      [normGender(gender), discipline, scope, diveCount || null]);
    r.rows.forEach((x) => ['dive_count', 'meet_year', 'n', 'avg_score', 'avg_list_dd',
      'avg_exec'].forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  // Same grain, split voluntary vs optional.
  async function fieldGroupExecVO(gender, discipline, scope, yearFrom) {
    gender = normGender(gender);
    const r = await q(
      `SELECT meet_year, scope, category_code, vo, n, n_divers, avg_exec, fail_rate, avg_dd
       FROM analytics.field_group_exec_vo
       WHERE gender = $1 AND discipline = $2
         AND ($3::text IS NULL OR scope = $3)
         AND ($4::int  IS NULL OR meet_year >= $4)
       ORDER BY meet_year DESC`,
      [gender, discipline, scope || null, yearFrom || null]);
    r.rows.forEach((x) => ['meet_year', 'n', 'n_divers', 'avg_exec', 'fail_rate', 'avg_dd']
      .forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  async function fieldListDD(gender, discipline, scope) {
    const r = await q(
      `SELECT meet_year, n_lists, avg_list_dd, p50_list_dd, p90_list_dd, avg_n_dives
       FROM analytics.field_list_dd
       WHERE ($3::text IS NULL OR scope = $3) AND gender = $1 AND discipline = $2
       ORDER BY meet_year DESC`, [gender, discipline, scope || null]);
    r.rows.forEach((x) => Object.keys(x).forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  async function buildMeta() {
    try {
      const r = await q(`SELECT to_char(MAX(built_at),'Mon DD HH24:MI') AS built,
                                (SELECT to_char(MAX(imported_at),'Mon DD HH24:MI') FROM core.dive_sheets) AS latest_import
                         FROM analytics.build_meta`);
      return r.rows[0] || {};
    } catch (e) { return {}; }
  }

  /* ---------- meet lookups ----------
     903 meets carry dive-level data and the scraper keeps adding them, so a
     select element was never going to work. analytics.meet_directory holds one
     pre-searchable row per meet; these two calls are the whole meet finder. */
  const MEET_COLS = `meet_id, meet_name, start_date, end_date, venue,
                     competition_family, meet_year, n_dives, n_events, n_divers, scope`;
  const meetNums = (rows) => {
    rows.forEach((x) => ['meet_year', 'n_dives', 'n_events', 'n_divers']
      .forEach((k) => { x[k] = num(x[k]); }));
    return rows;
  };

  // Ranked by how well the term matches, then by recency and size — so typing
  // "zone" surfaces this year's Zone championships before a 2015 invitational.
  async function meetSearch(term, opts) {
    const o = opts || {};
    const t = String(term || '').trim().toLowerCase();
    const like = '%' + t.replace(/[%_]/g, '') + '%';
    const r = await q(
      `SELECT ${MEET_COLS}
       FROM analytics.meet_directory
       WHERE ($1 = '' OR search_text LIKE $2)
         AND ($3::int  IS NULL OR meet_year = $3)
         AND ($4::text IS NULL OR scope = $4)
       ORDER BY (CASE WHEN LOWER(meet_name) LIKE $2 THEN 0 ELSE 1 END),
                meet_year DESC, n_dives DESC
       LIMIT 40`,
      [t, like, o.year || null, o.scope || null]);
    return meetNums(r.rows);
  }

  // Years that actually have data, for the year filter chips.
  async function meetYears() {
    const r = await q(
      `SELECT meet_year, COUNT(*) AS n_meets FROM analytics.meet_directory
       GROUP BY 1 ORDER BY 1 DESC`);
    r.rows.forEach((x) => { x.meet_year = num(x.meet_year); x.n_meets = num(x.n_meets); });
    return r.rows;
  }

  async function meetInfo(meetId) {
    const r = await q(`SELECT ${MEET_COLS} FROM analytics.meet_directory WHERE meet_id = $1`, [meetId]);
    return meetNums(r.rows)[0] || null;
  }

  async function meetEvents(meetId) {
    const r = await q(
      `SELECT event_id, MAX(event_name) AS event_name, gender, discipline, round_stage,
              COUNT(DISTINCT diver_id) AS n_divers, MAX(dive_order) AS n_rounds,
              COUNT(*) AS n_dives
       FROM core.dive_sheets
       WHERE meet_id = $1 AND discipline IN ('1m','3m','Platform')
       GROUP BY event_id, gender, discipline, round_stage
       ORDER BY event_name, round_stage`, [meetId]);
    r.rows.forEach((x) => ['n_divers', 'n_rounds', 'n_dives'].forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  async function eventSheets(meetId, eventId, stage) {
    const r = await q(
      `SELECT diver_id, diver_name, team_name, dive_order, dive_number, height,
              description, dd, score, judges_scores, running_total_points, round_place,
              optional_voluntary, dive_bucket, dive_group_code, dive_group_label
       FROM core.dive_sheets
       WHERE meet_id = $1 AND event_id = $2 AND round_stage = $3
       ORDER BY diver_name, dive_order`, [meetId, eventId, stage]);
    r.rows.forEach((x) => {
      x.dd = num(x.dd); x.score = num(x.score); x.dive_order = num(x.dive_order);
      x.running_total_points = num(x.running_total_points); x.round_place = num(x.round_place);
      x._exec = execOf(x);
    });
    return r.rows;
  }

  // The posted result for the same event/stage.
  //
  // This is load-bearing, not decoration. Junior Circuit finals are scored
  // cumulatively: a diver carries their prelim VOLUNTARY total into the final
  // and only optional dives are contested there. Verified to the cent across
  // the 2026 East Championship Group A Boys 1m final — official total minus
  // the final's dives equals the prelim voluntary sum for all 12 divers, zero
  // residual. Replaying such a final from zero produces the wrong winner,
  // which is exactly the "cumulative totals masquerading as round scores"
  // trap. Meet Replay anchors on posted_score instead of assuming a format,
  // so it is also correct for stages that carry nothing.
  async function eventOfficial(meetId, eventId, stage) {
    const r = await q(
      `SELECT diver_id, place, posted_score, score_is_cumulative, phase_dive_count
       FROM core.result_phases
       WHERE meet_id = $1 AND event_id = $2 AND round_stage = $3`,
      [meetId, eventId, stage]);
    const m = new Map();
    r.rows.forEach((x) => {
      x.place = num(x.place); x.posted_score = num(x.posted_score);
      x.phase_dive_count = num(x.phase_dive_count);
      m.set(String(x.diver_id), x);
    });
    return m;
  }

  /* ---------- dive population ----------
     What a dive normally scores at a given level, so one dive in one meet can
     be read against its own history rather than against nothing. Coaching
     context only — coverage is uneven by level and it is not published in
     advance, so it does not meet the bar for selection criteria. */
  async function divePopulation(scope, gender, discipline, diveNumbers) {
    const list = [...new Set((diveNumbers || []).filter(Boolean))];
    if (!list.length) return new Map();
    // Postgres array literal; dive numbers are alphanumeric but quote anyway.
    const arr = '{' + list.map((d) => '"' + String(d).replace(/"/g, '') + '"') + '}';
    let rows = [];
    try {
      const r = await q(
        `SELECT dive_number, n, n_divers, avg_dd, avg_exec, p10_exec, p25_exec,
                p50_exec, p75_exec, p90_exec, sd_exec, avg_score, p50_score,
                p90_score, fail_rate, y0, y1
         FROM analytics.dive_population
         WHERE scope = $1 AND gender = $2 AND discipline = $3
           AND dive_number = ANY($4::text[])`,
        [scope, normGender(gender), discipline, arr]);
      rows = r.rows;
    } catch (e) {
      // Table lands with the next analytics rebuild; the view degrades to
      // showing scores without population context rather than breaking.
      console.warn('[AE] dive_population unavailable', e.message);
      return new Map();
    }
    const m = new Map();
    rows.forEach((x) => {
      ['n', 'n_divers', 'avg_dd', 'avg_exec', 'p10_exec', 'p25_exec', 'p50_exec',
       'p75_exec', 'p90_exec', 'sd_exec', 'avg_score', 'p50_score', 'p90_score',
       'fail_rate', 'y0', 'y1'].forEach((k) => { x[k] = num(x[k]); });
      m.set(x.dive_number, x);
    });
    return m;
  }

  // Where an execution mark sits inside a dive's own distribution.
  // Piecewise-linear through the five stored percentiles — honest about being
  // an interpolation rather than pretending to a smooth parametric fit.
  function execPercentile(exec, pop) {
    if (exec == null || !pop) return null;
    const pts = [[pop.p10_exec, 10], [pop.p25_exec, 25], [pop.p50_exec, 50],
                 [pop.p75_exec, 75], [pop.p90_exec, 90]].filter((p) => p[0] != null);
    if (pts.length < 2) return null;
    if (exec <= pts[0][0]) return Math.max(1, Math.round(pts[0][1] * (exec / (pts[0][0] || 1))));
    for (let i = 1; i < pts.length; i++) {
      if (exec <= pts[i][0]) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        return Math.round(x1 === x0 ? y1 : y0 + (exec - x0) / (x1 - x0) * (y1 - y0));
      }
    }
    const last = pts[pts.length - 1];
    return Math.min(99, Math.round(last[1] + (exec - last[0]) * 9));
  }

  /* ---------- medal-track corridor ---------- */
  async function corridor(gender, discipline) {
    const r = await q(
      `SELECT tier, age_group, n_athletes, p10, p25, p50, p75, p90
       FROM analytics.corridor WHERE gender = $1 AND discipline = $2`, [gender, discipline]);
    r.rows.forEach((x) => ['n_athletes','p10','p25','p50','p75','p90'].forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }
  async function corridorMarks(gender, discipline) {
    const r = await q(
      `SELECT tier, canonical_id, display_name, age_group, best_score, best_year
       FROM analytics.corridor_marks WHERE gender = $1 AND discipline = $2`, [gender, discipline]);
    r.rows.forEach((x) => { x.best_score = num(x.best_score); x.best_year = num(x.best_year); });
    return r.rows;
  }
  // Selected athlete's own Junior Nationals results for the overlay.
  // Official Final totals preferred; best any-round mark kept for juniors who
  // haven't made a final yet (rendered hollow + labeled).
  async function juniorMarks(dmId) {
    if (!dmId) return [];
    const r = await q(
      `SELECT age_group,
              CASE discipline WHEN '1M' THEN '1m' WHEN '3M' THEN '3m' ELSE discipline END AS discipline,
              MAX(score) FILTER (WHERE round = 'Final') AS final_best,
              MAX(score) AS any_best,
              MAX(year) AS last_year
       FROM core.event_results
       WHERE diver_id_dm = $1 AND stage = 'Nationals'
         AND COALESCE(is_synchro,false) = false
         AND age_group IN ('Group A','Group B','Group C','Group D')
         AND score IS NOT NULL AND (place IS NULL OR place < 100)
       GROUP BY age_group, 2`, [dmId]);
    r.rows.forEach((x) => { x.final_best = num(x.final_best); x.any_best = num(x.any_best); x.last_year = num(x.last_year); });
    return r.rows;
  }
  async function judgeSpreadRef(gender, discipline) {
    const r = await q(
      `SELECT n, avg_range, p50_range, p75_range FROM analytics.field_judge_spread
       WHERE gender = $1 AND discipline = $2`, [gender, discipline]);
    const x = r.rows[0];
    if (x) Object.keys(x).forEach((k) => { x[k] = num(x[k]); });
    return x || null;
  }

  window.AE = {
    esc, escJsAttr, num, truthy, q,
    isIndiv, execOf, parseJudges, catOf, CAT_NAMES, CAT_ORDER,
    isRulebookDive, bucketOf, SCOPES, normGender, GUARD, ok, thinNote,
    mean, sd, quantile,
    searchAthletes, loadAthlete, diveStats,
    benchmarks, fieldGroupExec, fieldGroupExecVO, fieldListDD, buildMeta,
    rankCost, eventProfile,
    meetSearch, meetYears, meetInfo, meetEvents, eventSheets, eventOfficial,
    divePopulation, execPercentile,
    corridor, corridorMarks, juniorMarks, judgeSpreadRef,
    state: { athleteId: null, bundle: null },
  };
})();
