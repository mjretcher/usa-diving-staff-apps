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

  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

  function q(sql, params) {
    return window.NEON.query(sql, (params || []).map((p) => p == null ? null : String(p)));
  }

  const INDIV = new Set(['1m', '3m', 'Platform']);
  const CAT_NAMES = { '1': 'Front', '2': 'Back', '3': 'Reverse', '4': 'Inward', '5': 'Twister', '6': 'Armstand' };

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

  function catOf(row) {
    const c = (row.dive_category_code && String(row.dive_category_code)) || String(row.dive_number || '').charAt(0);
    return CAT_NAMES[c] ? c : null;
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
                is_synchronized
         FROM core.result_phases
         WHERE diver_id = $1 OR diver_id = $2
         ORDER BY meet_year, meet_id, event_id`, ids),
      q(`SELECT meet_id, meet_year, competition_family, event_id, event_name, gender,
                discipline, round_stage, dive_order, dive_number, height, description,
                dd, score, judges_scores, running_total_points, round_place,
                dive_category_code, optional_voluntary
         FROM core.dive_sheets
         WHERE diver_id = $1 OR diver_id = $2
         ORDER BY meet_year, meet_id, event_id, round_stage, dive_order`, ids),
    ]);

    // numeric coercion once (Neon returns strings)
    phases.rows.forEach((r) => { r.place = num(r.place); r.posted_score = num(r.posted_score); r.meet_year = num(r.meet_year); });
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

  async function fieldGroupExec(gender, discipline) {
    const r = await q(
      `SELECT meet_year, category_code, n, avg_exec, p50_exec, p90_exec, fail_rate
       FROM analytics.field_group_exec
       WHERE competition_family = 'World Aquatics' AND gender = $1 AND discipline = $2
       ORDER BY meet_year DESC`, [gender, discipline]);
    r.rows.forEach((x) => ['meet_year', 'n', 'avg_exec', 'p50_exec', 'p90_exec', 'fail_rate'].forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  async function fieldListDD(gender, discipline) {
    const r = await q(
      `SELECT meet_year, n_lists, avg_list_dd, p50_list_dd, p90_list_dd, avg_n_dives
       FROM analytics.field_list_dd
       WHERE competition_family = 'World Aquatics' AND gender = $1 AND discipline = $2
       ORDER BY meet_year DESC`, [gender, discipline]);
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

  /* ---------- race replay lookups ---------- */
  async function sheetMeets() {
    const r = await q(
      `WITH m AS (
         SELECT meet_id, competition_family, MAX(meet_year) AS meet_year,
                COUNT(DISTINCT event_id) AS n_events, COUNT(DISTINCT diver_id) AS n_divers
         FROM core.dive_sheets GROUP BY meet_id, competition_family)
       SELECT m.*, (SELECT MAX(meet_name) FROM core.result_phases p WHERE p.meet_id = m.meet_id) AS meet_name
       FROM m ORDER BY meet_year DESC, meet_name`);
    r.rows.forEach((x) => { x.meet_year = num(x.meet_year); });
    return r.rows;
  }

  async function meetEvents(meetId) {
    const r = await q(
      `SELECT event_id, MAX(event_name) AS event_name, gender, discipline, round_stage,
              COUNT(DISTINCT diver_id) AS n_divers, MAX(dive_order) AS n_rounds
       FROM core.dive_sheets
       WHERE meet_id = $1 AND discipline IN ('1m','3m','Platform')
       GROUP BY event_id, gender, discipline, round_stage
       ORDER BY event_name, round_stage`, [meetId]);
    return r.rows;
  }

  async function eventSheets(meetId, eventId, stage) {
    const r = await q(
      `SELECT diver_id, diver_name, team_name, dive_order, dive_number, height, dd, score,
              running_total_points, round_place
       FROM core.dive_sheets
       WHERE meet_id = $1 AND event_id = $2 AND round_stage = $3
       ORDER BY diver_name, dive_order`, [meetId, eventId, stage]);
    r.rows.forEach((x) => {
      x.dd = num(x.dd); x.score = num(x.score); x.dive_order = num(x.dive_order);
      x.running_total_points = num(x.running_total_points); x.round_place = num(x.round_place);
    });
    return r.rows;
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
    esc, escJsAttr, num, q,
    isIndiv, execOf, parseJudges, catOf, CAT_NAMES,
    mean, sd, quantile,
    searchAthletes, loadAthlete, diveStats,
    benchmarks, fieldGroupExec, fieldListDD, buildMeta,
    sheetMeets, meetEvents, eventSheets,
    corridor, corridorMarks, juniorMarks, judgeSpreadRef,
    state: { athleteId: null, bundle: null },
  };
})();
