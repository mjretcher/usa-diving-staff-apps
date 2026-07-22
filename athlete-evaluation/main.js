/* ============================================================
   HP Analytics — Layout B (aggregate-first)
   main.js rebuild  ·  USA Diving High Performance
   ============================================================
   Data rules (§4 of brief):
   - Score field: phase_score_from_dives (NOT posted_score).
     ~11% of phases are cumulative; this field is always per-phase.
   - Intl benchmark (competition_family='World Aquatics'): ~28% populated.
     All World-sourced modules are labelled "partial".
   - judges_scores parse: ~25%, World Aquatics only.
   - nat populated ~28%; age_group ~81%.
   ============================================================ */
(function () {
'use strict';

/* ── Helpers ─────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const fmt1 = (v) => isNum(v) ? v.toFixed(1) : '—';
const fmt2 = (v) => isNum(v) ? v.toFixed(2) : '—';
const fmtInt = (v) => isNum(v) ? Math.round(v).toLocaleString() : '—';
const pct = (v) => isNum(v) ? Math.round(v) + '%' : '—';

/* ── State ───────────────────────────────────────────────── */
const state = {
  yearMin: 2024,
  yearMax: 2026,
  data: null,
  lbData: null,
  spotlightCache: new Map(),
  progFilter: { gender: 'all', board: 'all' },
  lbFilter: { gender: 'all', board: 'all', family: 'USA Diving' },
};

/* ── Olympic event definitions ───────────────────────────── */
const OLY_EVENTS = [
  { gender: 'Female', discipline: '3m',       label: 'Women · 3m' },
  { gender: 'Female', discipline: 'Platform', label: 'Women · Platform' },
  { gender: 'Male',   discipline: '3m',       label: 'Men · 3m' },
  { gender: 'Male',   discipline: 'Platform', label: 'Men · Platform' },
];
const DIVE_GROUPS = { '1':'Front','2':'Back','3':'Reverse','4':'Inward','5':'Twister','6':'Armstand' };
const GROUP_CODES = ['1','2','3','4','5','6'];

/* ── Neon query helpers ──────────────────────────────────── */
function nq(sql, params) {
  return window.NEON.query(sql, (params || []).map(String));
}

/* ── SQL: Trust strip ────────────────────────────────────── */
async function loadTrust(yMin, yMax) {
  const r = await nq(
    `SELECT COUNT(*) AS phases,
            COUNT(CASE WHEN place IS NOT NULL THEN 1 END) AS place_known,
            COUNT(CASE WHEN nat IS NOT NULL AND nat <> '' THEN 1 END) AS nat_known,
            COUNT(DISTINCT meet_id) AS meets,
            COUNT(DISTINCT diver_id) AS athletes,
            COUNT(DISTINCT team_id) AS teams,
            MIN(meet_year) AS yr_min,
            MAX(meet_year) AS yr_max
     FROM core.result_phases
     WHERE meet_year BETWEEN $1 AND $2`,
    [yMin, yMax]
  );
  return r.rows[0];
}

/* ── SQL: Medal gap (Road to the Podium) ─────────────────── */
async function loadMedalGap(yMin, yMax) {
  const r = await nq(
    `WITH wa AS (
       SELECT gender, discipline,
              MAX(phase_score_from_dives) AS gold,
              MIN(phase_score_from_dives) AS cut,
              COUNT(*) AS finalists
       FROM core.result_phases
       WHERE competition_family = 'World Aquatics'
         AND round_stage = 'Final'
         AND is_synchronized = false
         AND discipline IN ('3m','Platform')
         AND gender IN ('Female','Male')
         AND phase_score_from_dives IS NOT NULL
         AND meet_year BETWEEN $1 AND $2
       GROUP BY gender, discipline
     ),
     us AS (
       SELECT gender, discipline,
              MAX(phase_score_from_dives) AS best
       FROM core.result_phases
       WHERE competition_family = 'USA Diving'
         AND round_stage = 'Final'
         AND is_synchronized = false
         AND discipline IN ('3m','Platform')
         AND gender IN ('Female','Male')
         AND (event_level ILIKE '%senior%' OR event_level ILIKE '%open%')
         AND phase_score_from_dives IS NOT NULL
         AND meet_year BETWEEN $1 AND $2
       GROUP BY gender, discipline
     )
     SELECT COALESCE(wa.gender, us.gender) AS gender,
            COALESCE(wa.discipline, us.discipline) AS discipline,
            us.best AS us_best,
            wa.gold AS world_gold,
            wa.cut  AS world_cut,
            wa.finalists
     FROM wa FULL OUTER JOIN us
       ON wa.gender = us.gender AND wa.discipline = us.discipline
     ORDER BY gender, discipline`,
    [yMin, yMax]
  );
  return r.rows;
}

/* ── SQL: Score bands ────────────────────────────────────── */
async function loadScoreBands(yMin, yMax) {
  const r = await nq(
    `SELECT gender, discipline,
            MAX(phase_score_from_dives) AS top_score,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY phase_score_from_dives) AS q3,
            PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY phase_score_from_dives) AS median,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY phase_score_from_dives) AS q1,
            MIN(phase_score_from_dives) AS floor_score,
            COUNT(*) AS n
     FROM core.result_phases
     WHERE competition_family = 'USA Diving'
       AND round_stage = 'Final'
       AND is_synchronized = false
       AND discipline IN ('3m','Platform')
       AND gender IN ('Female','Male')
       AND (event_level ILIKE '%senior%' OR event_level ILIKE '%open%')
       AND phase_score_from_dives IS NOT NULL
       AND meet_year BETWEEN $1 AND $2
     GROUP BY gender, discipline
     ORDER BY gender, discipline`,
    [yMin, yMax]
  );
  return r.rows;
}

/* ── SQL: DD comparison ──────────────────────────────────── */
async function loadDD(yMin, yMax) {
  const r = await nq(
    `SELECT competition_family,
            gender, discipline,
            AVG(phase_dd_sum / NULLIF(phase_dive_count, 0)) AS avg_dd_per_dive,
            COUNT(*) AS n
     FROM core.result_phases
     WHERE round_stage = 'Final'
       AND is_synchronized = false
       AND discipline IN ('3m','Platform')
       AND gender IN ('Female','Male')
       AND phase_score_from_dives IS NOT NULL
       AND phase_dive_count > 0
       AND phase_dd_sum IS NOT NULL
       AND competition_family IN ('USA Diving','World Aquatics')
       AND meet_year BETWEEN $1 AND $2
     GROUP BY competition_family, gender, discipline
     ORDER BY gender, discipline, competition_family`,
    [yMin, yMax]
  );
  return r.rows;
}

/* ── SQL: Dive-group heatmap ─────────────────────────────── */
async function loadHeatmap(yMin, yMax) {
  const r = await nq(
    `SELECT
       CASE WHEN r.competition_family = 'USA Diving' THEN 'USA' ELSE 'World' END AS cohort,
       r.gender, r.discipline,
       d.dive_category_code AS grp,
       AVG(d.score) AS avg_score,
       COUNT(*) AS n
     FROM core.dive_sheets d
     JOIN core.result_phases r
       ON r.meet_id = d.meet_id AND r.event_id = d.event_id AND r.diver_id = d.diver_id
     WHERE r.round_stage = 'Final'
       AND r.is_synchronized = false
       AND r.discipline IN ('3m','Platform')
       AND r.gender IN ('Female','Male')
       AND d.score IS NOT NULL
       AND d.dive_category_code IS NOT NULL
       AND r.competition_family IN ('USA Diving','World Aquatics')
       AND d.meet_year BETWEEN $1 AND $2
     GROUP BY cohort, r.gender, r.discipline, d.dive_category_code
     ORDER BY r.gender, r.discipline, d.dive_category_code`,
    [yMin, yMax]
  );
  return r.rows;
}

/* ── SQL: Multi-year trend (all years, no year filter) ────── */
async function loadTrends() {
  const r = await nq(
    `WITH wa AS (
       SELECT meet_year, gender, discipline,
              MAX(phase_score_from_dives) AS gold
       FROM core.result_phases
       WHERE competition_family = 'World Aquatics'
         AND round_stage = 'Final'
         AND is_synchronized = false
         AND discipline IN ('3m','Platform')
         AND gender IN ('Female','Male')
         AND phase_score_from_dives IS NOT NULL
       GROUP BY meet_year, gender, discipline
     ),
     us AS (
       SELECT meet_year, gender, discipline,
              MAX(phase_score_from_dives) AS best
       FROM core.result_phases
       WHERE competition_family = 'USA Diving'
         AND round_stage = 'Final'
         AND is_synchronized = false
         AND discipline IN ('3m','Platform')
         AND gender IN ('Female','Male')
         AND (event_level ILIKE '%senior%' OR event_level ILIKE '%open%')
         AND phase_score_from_dives IS NOT NULL
       GROUP BY meet_year, gender, discipline
     )
     SELECT COALESCE(wa.meet_year, us.meet_year) AS yr,
            COALESCE(wa.gender, us.gender) AS gender,
            COALESCE(wa.discipline, us.discipline) AS discipline,
            us.best AS us_best,
            wa.gold AS world_gold
     FROM wa FULL OUTER JOIN us
       ON wa.meet_year = us.meet_year AND wa.gender = us.gender AND wa.discipline = us.discipline
     ORDER BY yr, gender, discipline`,
    []
  );
  return r.rows;
}

/* ── SQL: Round progression ──────────────────────────────── */
async function loadProgression(yMin, yMax) {
  const r = await nq(
    `SELECT diver_id, diver_name, team_name,
            meet_name, meet_year, gender, discipline,
            competition_family,
            MAX(CASE WHEN round_stage = 'Prelim'     THEN place END) AS prelim_place,
            MAX(CASE WHEN round_stage = 'Semifinal'  THEN place END) AS semi_place,
            MAX(CASE WHEN round_stage = 'Final'      THEN place END) AS final_place,
            MAX(CASE WHEN round_stage = 'Final'      THEN phase_score_from_dives END) AS final_score
     FROM core.result_phases
     WHERE is_synchronized = false
       AND discipline IN ('3m','Platform')
       AND gender IN ('Female','Male')
       AND (event_level ILIKE '%senior%' OR event_level ILIKE '%open%')
       AND competition_family IN ('USA Diving','World Aquatics')
       AND meet_year BETWEEN $1 AND $2
     GROUP BY diver_id, diver_name, team_name, meet_name, meet_year, gender, discipline, competition_family
     HAVING MAX(CASE WHEN round_stage = 'Prelim' THEN place END) IS NOT NULL
        AND MAX(CASE WHEN round_stage = 'Final'  THEN place END) IS NOT NULL
     ORDER BY meet_year DESC, gender, discipline, final_place
     LIMIT 200`,
    [yMin, yMax]
  );
  return r.rows;
}

/* ── SQL: Judge execution detail ─────────────────────────── */
async function loadJudges(yMin, yMax) {
  // Parses judges_scores strings client-side after fetch for flexibility
  const r = await nq(
    `SELECT r.gender, r.discipline,
            AVG(CASE WHEN judges_scores IS NOT NULL AND judges_scores <> '' THEN 1.0 ELSE 0 END) * 100 AS parse_rate,
            COUNT(*) AS total_dives,
            COUNT(CASE WHEN judges_scores IS NOT NULL AND judges_scores <> '' THEN 1 END) AS parsed_dives
     FROM core.dive_sheets d
     JOIN core.result_phases r
       ON r.meet_id = d.meet_id AND r.event_id = d.event_id AND r.diver_id = d.diver_id
     WHERE r.competition_family = 'World Aquatics'
       AND r.is_synchronized = false
       AND r.discipline IN ('3m','Platform')
       AND r.gender IN ('Female','Male')
       AND d.meet_year BETWEEN $1 AND $2
     GROUP BY r.gender, r.discipline
     ORDER BY r.gender, r.discipline`,
    [yMin, yMax]
  );
  // Also get spread stats where parseable
  const r2 = await nq(
    `SELECT r.gender, r.discipline,
            AVG(d.score) AS avg_score,
            STDDEV(d.score) AS stddev_score,
            AVG(d.dd) AS avg_dd,
            COUNT(*) AS n
     FROM core.dive_sheets d
     JOIN core.result_phases r
       ON r.meet_id = d.meet_id AND r.event_id = d.event_id AND r.diver_id = d.diver_id
     WHERE r.competition_family = 'World Aquatics'
       AND r.is_synchronized = false
       AND r.discipline IN ('3m','Platform')
       AND r.gender IN ('Female','Male')
       AND d.score IS NOT NULL
       AND d.judges_scores IS NOT NULL AND d.judges_scores <> ''
       AND d.meet_year BETWEEN $1 AND $2
     GROUP BY r.gender, r.discipline
     ORDER BY r.gender, r.discipline`,
    [yMin, yMax]
  );
  return { coverage: r.rows, stats: r2.rows };
}

/* ── SQL: Synchro medal gap ──────────────────────────────── */
async function loadSynchro(yMin, yMax) {
  const r = await nq(
    `WITH wa AS (
       SELECT gender, discipline,
              MAX(phase_score_from_dives) AS gold,
              MIN(phase_score_from_dives) AS cut
       FROM core.result_phases
       WHERE competition_family = 'World Aquatics'
         AND round_stage = 'Final'
         AND is_synchronized = true
         AND phase_score_from_dives IS NOT NULL
         AND meet_year BETWEEN $1 AND $2
       GROUP BY gender, discipline
     ),
     us AS (
       SELECT gender, discipline,
              MAX(phase_score_from_dives) AS best
       FROM core.result_phases
       WHERE competition_family = 'USA Diving'
         AND round_stage = 'Final'
         AND is_synchronized = true
         AND phase_score_from_dives IS NOT NULL
         AND meet_year BETWEEN $1 AND $2
       GROUP BY gender, discipline
     )
     SELECT COALESCE(wa.gender, us.gender) AS gender,
            COALESCE(wa.discipline, us.discipline) AS discipline,
            us.best AS us_best,
            wa.gold AS world_gold,
            wa.cut  AS world_cut
     FROM wa FULL OUTER JOIN us
       ON wa.gender = us.gender AND wa.discipline = us.discipline
     ORDER BY gender, discipline`,
    [yMin, yMax]
  );
  return r.rows;
}

/* ── SQL: Athlete autocomplete list ─────────────────────── */
async function loadAthleteList() {
  const r = await nq(
    `SELECT DISTINCT diver_name
     FROM core.result_phases
     WHERE competition_family = 'USA Diving'
       AND diver_name IS NOT NULL AND diver_name <> ''
     ORDER BY diver_name
     LIMIT 800`,
    []
  );
  return r.rows.map(row => row.diver_name);
}

/* ── SQL: Athlete spotlight ──────────────────────────────── */
async function loadSpotlight(name) {
  const [phases, pctRows] = await Promise.all([
    nq(
      `SELECT meet_year, meet_name, meet_id, event_id, discipline, gender,
              round_stage, place, phase_score_from_dives AS score,
              phase_dd_sum, phase_dive_count, event_level, competition_family,
              diver_id
       FROM core.result_phases
       WHERE diver_name ILIKE $1
         AND is_synchronized = false
       ORDER BY meet_year, meet_id, round_stage`,
      [name]
    ),
    nq(
      `WITH scores AS (
         SELECT diver_name,
                MAX(phase_score_from_dives) AS best_score,
                gender, discipline
         FROM core.result_phases
         WHERE round_stage = 'Final'
           AND is_synchronized = false
           AND discipline IN ('3m','Platform')
           AND gender IN ('Female','Male')
           AND (event_level ILIKE '%senior%' OR event_level ILIKE '%open%')
           AND competition_family = 'USA Diving'
           AND phase_score_from_dives IS NOT NULL
         GROUP BY diver_name, gender, discipline
       )
       SELECT gender, discipline,
              COUNT(*) AS total,
              SUM(CASE WHEN diver_name ILIKE $1 THEN 1 ELSE 0 END) AS is_target,
              COUNT(CASE WHEN best_score <= (
                SELECT MAX(phase_score_from_dives) FROM core.result_phases
                WHERE diver_name ILIKE $1 AND round_stage = 'Final'
                  AND discipline = scores.discipline AND gender = scores.gender
                  AND competition_family = 'USA Diving'
                  AND phase_score_from_dives IS NOT NULL
              ) THEN 1 END) AS rank_at_or_below
       FROM scores
       GROUP BY gender, discipline`,
      [name]
    ),
  ]);

  // Fetch best event dives
  const finals = phases.rows.filter(r => r.round_stage === 'Final' && isNum(num(r.score)));
  let dives = [];
  if (finals.length > 0) {
    const best = finals.reduce((a, b) => num(a.score) >= num(b.score) ? a : b);
    const dr = await nq(
      `SELECT dive_number, description, dd, score, net_score, optional_voluntary,
              dive_category_code, dive_category_label
       FROM core.dive_sheets
       WHERE meet_id = $1 AND event_id = $2 AND diver_id = $3
       ORDER BY dive_number`,
      [best.meet_id, best.event_id, best.diver_id]
    );
    dives = dr.rows;
  }

  return { phases: phases.rows, pct: pctRows.rows, dives };
}

/* ── SQL: Leaderboard ────────────────────────────────────── */
async function loadLeaderboard(yMin, yMax) {
  const r = await nq(
    `SELECT diver_name, team_name, gender, discipline,
            competition_family,
            MAX(phase_score_from_dives) AS best_score,
            MIN(place) AS best_place,
            COUNT(DISTINCT meet_id) AS events
     FROM core.result_phases
     WHERE round_stage = 'Final'
       AND is_synchronized = false
       AND phase_score_from_dives IS NOT NULL
       AND meet_year BETWEEN $1 AND $2
     GROUP BY diver_name, team_name, gender, discipline, competition_family
     ORDER BY best_score DESC
     LIMIT 500`,
    [yMin, yMax]
  );
  return r.rows;
}

/* ── setLoading ──────────────────────────────────────────── */
function setLoading(msg) { $('loadingText').textContent = msg; }

/* ─────────────────────────────────────────────────────────────────── */
/*  RENDER FUNCTIONS                                                    */
/* ─────────────────────────────────────────────────────────────────── */

/* ── Trust strip ─────────────────────────────────────────── */
function renderTrust(t) {
  const phases = num(t.phases) || 0;
  const placeKnown = phases > 0 ? (num(t.place_known) / phases * 100) : 0;
  const natKnown = phases > 0 ? (num(t.nat_known) / phases * 100) : 0;
  $('tPhases').textContent = fmtInt(phases);
  $('tPlaceNote').textContent = `place known ${pct(placeKnown)}`;
  $('tIntl').textContent = pct(natKnown);
  $('tYears').textContent = `${t.yr_min || '—'}–${t.yr_max || '—'}`;
  $('tMeets').textContent = `${fmtInt(num(t.meets))} meets`;
  $('tAthletes').textContent = fmtInt(num(t.athletes));
  $('tTeams').textContent = `${fmtInt(num(t.teams))} teams`;
  $('kpiPhases').textContent = fmtInt(phases);
  $('kpiAthletes').textContent = fmtInt(num(t.athletes));
}

/* ── Medal gap ───────────────────────────────────────────── */
function renderMedalGap(rows) {
  // Build lookup by gender+discipline
  const map = new Map();
  for (const r of rows) {
    map.set(`${r.gender}::${r.discipline}`, r);
  }

  const col1 = OLY_EVENTS.slice(0, 2);  // Women 3m, Women Platform
  const col2 = OLY_EVENTS.slice(2, 4);  // Men 3m, Men Platform

  function renderCol(events) {
    return events.map(ev => {
      const d = map.get(`${ev.gender}::${ev.discipline}`);
      if (!d) return `<div class="hp-medal-row"><div class="hp-medal-labels"><span class="hp-medal-event">${esc(ev.label)}</span><span style="color:var(--ink-4);font-size:12px">no data</span></div></div>`;

      const usBest = num(d.us_best);
      const gold = num(d.world_gold);
      const cut  = num(d.world_cut);

      if (!isNum(usBest) || !isNum(gold)) {
        return `<div class="hp-medal-row"><div class="hp-medal-labels"><span class="hp-medal-event">${esc(ev.label)}</span><span style="color:var(--ink-4);font-size:12px">insufficient data</span></div></div>`;
      }

      const gap = gold - usBest;
      const gapSign = gap > 0 ? `+${Math.round(gap)}` : Math.round(gap);
      const gapClass = gap > 0 ? '' : ' good';
      const trackMax = Math.max(gold * 1.02, usBest * 1.02);
      const usPct   = (usBest / trackMax * 100).toFixed(1);
      const cutPct  = isNum(cut) ? (cut / trackMax * 100).toFixed(1) : null;
      const belowCut = isNum(cut) && usBest < cut;

      const cutEl = cutPct
        ? `<div class="hp-medal-cut ${belowCut ? 'below' : 'above'}" style="left:${cutPct}%"></div>`
        : '';
      const cutLbl = isNum(cut)
        ? `<span class="hp-medal-cut-lbl ${belowCut ? 'below-cut' : ''}">
             ${belowCut ? '▲ below final cut ' : 'final cut '} ${Math.round(cut)}
           </span>`
        : `<span></span>`;

      return `
        <div class="hp-medal-row">
          <div class="hp-medal-labels">
            <span class="hp-medal-event">${esc(ev.label)}</span>
            <span class="hp-medal-gap-num${gapClass}">gap to gold ${gapSign}</span>
          </div>
          <div class="hp-medal-track">
            <div class="hp-medal-fill" style="width:${usPct}%"></div>
            ${cutEl}
            <div class="hp-medal-gold-dot"></div>
          </div>
          <div class="hp-medal-nums">
            <span class="hp-medal-us">US ${Math.round(usBest)}</span>
            ${cutLbl}
            <span class="hp-medal-gold-lbl">gold ${Math.round(gold)}</span>
          </div>
        </div>`;
    }).join('');
  }

  const legend = `
    <div class="hp-medal-legend">
      <span><span class="hp-legend-swatch" style="background:var(--brand-blue)"></span>US best senior final score</span>
      <span><span class="hp-legend-swatch" style="background:var(--ink-3)"></span>World final cut (grey = US above, red = US below)</span>
      <span><span class="hp-legend-swatch" style="background:#b8860b;height:8px;width:8px;border-radius:50%"></span>World gold</span>
    </div>`;

  $('medalGapGrid').innerHTML = `
    <div class="hp-medal-col">${renderCol(col1)}</div>
    <div class="hp-medal-col">${renderCol(col2)}</div>`;
  // Append legend after grid
  $('medalGapGrid').insertAdjacentHTML('afterend', legend);
}

/* ── Score bands ─────────────────────────────────────────── */
function renderScoreBands(rows) {
  const map = new Map();
  for (const r of rows) map.set(`${r.gender}::${r.discipline}`, r);

  const html = OLY_EVENTS.map(ev => {
    const d = map.get(`${ev.gender}::${ev.discipline}`);
    if (!d) return `<div><div class="hp-band-event">${esc(ev.label)}</div><div class="hp-band-chart" style="display:flex;align-items:center;justify-content:center;color:var(--ink-4);font-size:12px">no data</div></div>`;

    const top = num(d.top_score);
    const q3  = num(d.q3);
    const med = num(d.median);
    const q1  = num(d.q1);
    const flr = num(d.floor_score);
    const n   = num(d.n);

    if (!isNum(top) || !isNum(flr) || top === flr) {
      return `<div><div class="hp-band-event">${esc(ev.label)}</div><div class="hp-band-chart" style="display:flex;align-items:center;justify-content:center;color:var(--ink-4);font-size:12px">insufficient data</div></div>`;
    }

    const range = top - flr;
    const toBot = (val) => isNum(val) ? ((val - flr) / range * 88 + 6).toFixed(1) : null;

    const topPct = toBot(top);
    const q3Pct  = toBot(q3);
    const medPct = toBot(med);
    const q1Pct  = toBot(q1);
    const flrPct = toBot(flr);

    const ticks = [
      topPct ? `<div class="hp-tick hp-tick-gold" style="bottom:${topPct}%"><span class="hp-tick-lbl gold">${fmt1(top)}</span></div>` : '',
      q3Pct  ? `<div class="hp-tick hp-tick-q3"   style="bottom:${q3Pct}%"><span class="hp-tick-lbl q3">${fmt1(q3)}</span></div>` : '',
      medPct ? `<div class="hp-tick hp-tick-median" style="bottom:${medPct}%"><span class="hp-tick-lbl median">${fmt1(med)}</span></div>` : '',
      q1Pct  ? `<div class="hp-tick hp-tick-q1"   style="bottom:${q1Pct}%"><span class="hp-tick-lbl q1">${fmt1(q1)}</span></div>` : '',
    ].join('');

    const fillH = (q3Pct && q1Pct) ? `bottom:${q1Pct}%;top:${(100 - parseFloat(q3Pct)).toFixed(1)}%` : 'display:none';

    return `
      <div>
        <div class="hp-band-event">${esc(ev.label)}</div>
        <div class="hp-band-chart">
          ${ticks}
          <div class="hp-band-fill" style="${fillH}"></div>
        </div>
        <div class="hp-band-meta">
          <strong>Top:</strong> ${fmt1(top)} &nbsp;·&nbsp;
          <strong>Median:</strong> ${fmt1(med)}<br>
          <strong>N finals:</strong> ${fmtInt(n)}
        </div>
      </div>`;
  }).join('');

  $('scoreBandsGrid').innerHTML = html;
}

/* ── DD comparison ───────────────────────────────────────── */
function renderDD(rows) {
  // Group by gender+discipline → {USA, World}
  const events = new Map();
  for (const r of rows) {
    const k = `${r.gender}::${r.discipline}`;
    if (!events.has(k)) events.set(k, { label: '', us: null, world: null });
    const slot = events.get(k);
    const ev = OLY_EVENTS.find(e => e.gender === r.gender && e.discipline === r.discipline);
    slot.label = ev ? ev.label : `${r.gender} ${r.discipline}`;
    if (r.competition_family === 'USA Diving')    slot.us    = num(r.avg_dd_per_dive);
    if (r.competition_family === 'World Aquatics') slot.world = num(r.avg_dd_per_dive);
  }

  const maxDD = Math.max(...[...events.values()].flatMap(e => [e.us, e.world]).filter(isNum), 3.5);

  const html = OLY_EVENTS.map(ev => {
    const k = `${ev.gender}::${ev.discipline}`;
    const d = events.get(k);
    if (!d || (!isNum(d.us) && !isNum(d.world))) return '';

    const usW   = isNum(d.us)    ? (d.us    / maxDD * 100).toFixed(1) : '0';
    const worldW = isNum(d.world) ? (d.world / maxDD * 100).toFixed(1) : '0';
    const delta = isNum(d.us) && isNum(d.world) ? d.us - d.world : null;
    const deltaHtml = isNum(delta)
      ? `<span class="hp-dd-delta ${delta >= 0 ? 'ahead' : 'behind'}">${delta >= 0 ? '+' : ''}${delta.toFixed(2)}</span>`
      : '';

    return `
      <div class="hp-dd-event">
        <div class="hp-dd-event-label">${esc(ev.label)} ${deltaHtml}</div>
        <div class="hp-dd-bars">
          <div class="hp-dd-bar-row">
            <div class="hp-dd-bar-label">USA</div>
            <div class="hp-dd-track"><div class="hp-dd-fill us" style="width:${usW}%"></div></div>
            <div class="hp-dd-val">${fmt2(d.us)}</div>
          </div>
          <div class="hp-dd-bar-row">
            <div class="hp-dd-bar-label">World</div>
            <div class="hp-dd-track"><div class="hp-dd-fill world" style="width:${worldW}%"></div></div>
            <div class="hp-dd-val">${fmt2(d.world)}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  $('ddContent').innerHTML = html || '<div style="padding:16px;color:var(--ink-3);font-size:13px;">No DD data in this year range.</div>';
}

/* ── Dive-group heatmap ──────────────────────────────────── */
function renderHeatmap(rows) {
  // Build map: cohort::gender::discipline::grp → avg_score
  const data = new Map();
  let lo = Infinity, hi = -Infinity;
  for (const r of rows) {
    const k = `${r.cohort}::${r.gender}::${r.discipline}::${r.grp}`;
    const v = num(r.avg_score);
    data.set(k, v);
    if (isNum(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  }
  if (!isFinite(lo)) { lo = 0; hi = 10; }
  if (hi === lo) hi = lo + 1;

  function color(v) {
    if (!isNum(v)) return null;
    const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    const stops = [[240,242,248],[0,154,199],[23,31,105]];
    const k = t * (stops.length - 1);
    const i = Math.min(Math.floor(k), stops.length - 2);
    const f = k - i;
    const A = stops[i], B = stops[i + 1];
    return `rgb(${Math.round(A[0]+(B[0]-A[0])*f)},${Math.round(A[1]+(B[1]-A[1])*f)},${Math.round(A[2]+(B[2]-A[2])*f)})`;
  }
  function textColor(v) {
    return (isNum(v) && (v - lo)/(hi - lo) > 0.55) ? '#fff' : 'rgba(13,16,64,.85)';
  }

  const sections = OLY_EVENTS.map(ev => {
    const header = `<tr><th class="row-head">Cohort</th>${GROUP_CODES.map(g => `<th>${esc(DIVE_GROUPS[g])}</th>`).join('')}</tr>`;
    const rows2 = ['USA','World'].map(cohort => {
      const label = cohort === 'USA' ? '🇺🇸 USA' : '🌍 World';
      const cells = GROUP_CODES.map(g => {
        const v = data.get(`${cohort}::${ev.gender}::${ev.discipline}::${g}`);
        if (!isNum(v)) return `<td class="hp-hm-cell hp-hm-empty">·</td>`;
        const bg = color(v);
        const tc = textColor(v);
        return `<td class="hp-hm-cell" style="background:${bg};color:${tc}" title="${cohort} ${ev.label} ${DIVE_GROUPS[g]}: ${v.toFixed(2)}">${v.toFixed(1)}</td>`;
      }).join('');
      return `<tr><th class="row-head">${label}</th>${cells}</tr>`;
    }).join('');

    return `
      <div class="hp-hm-section">
        <div class="hp-hm-section-title">${esc(ev.label)}</div>
        <table class="hp-hm-table"><thead>${header}</thead><tbody>${rows2}</tbody></table>
      </div>`;
  }).join('');

  const legend = `
    <div class="hp-hm-legend">
      <span>${fmt1(lo)}</span>
      <div class="hp-hm-legend-bar"></div>
      <span>${fmt1(hi)}</span>
      <span style="margin-left:8px;color:var(--ink-4)">avg execution score per dive group</span>
    </div>`;

  $('heatmapContent').innerHTML = sections + legend;
}

/* ── Multi-year trends ───────────────────────────────────── */
function renderTrends(rows) {
  const byEvent = new Map();
  for (const r of rows) {
    const k = `${r.gender}::${r.discipline}`;
    if (!byEvent.has(k)) byEvent.set(k, []);
    byEvent.get(k).push(r);
  }

  const W = 340, H = 130, PL = 34, PR = 10, PT = 12, PB = 24;
  const iW = W - PL - PR, iH = H - PT - PB;

  function trendSVG(k, evLabel) {
    const pts = (byEvent.get(k) || []).sort((a, b) => num(a.yr) - num(b.yr));
    if (!pts.length) return `<div style="color:var(--ink-4);font-size:12px;padding:16px">No World Aquatics data in this range.</div>`;

    const years = pts.map(p => num(p.yr)).filter(isNum);
    const allScores = pts.flatMap(p => [num(p.us_best), num(p.world_gold)]).filter(isNum);
    if (!years.length || !allScores.length) return '';

    const yMin2 = Math.min(...years), yMax2 = Math.max(...years);
    const sMin = Math.min(...allScores) * 0.95;
    const sMax = Math.max(...allScores) * 1.02;
    const sRange = sMax - sMin || 1;
    const xScale = yMax2 > yMin2 ? iW / (yMax2 - yMin2) : iW;
    const X = (yr)  => (PL + (num(yr) - yMin2) * xScale).toFixed(1);
    const Y = (s)   => (PT + iH - ((num(s) - sMin) / sRange * iH)).toFixed(1);

    const usLine = pts.filter(p => isNum(num(p.us_best))).map((p, i) => `${i===0?'M':'L'}${X(p.yr)},${Y(p.us_best)}`).join(' ');
    const wLine  = pts.filter(p => isNum(num(p.world_gold))).map((p, i) => `${i===0?'M':'L'}${X(p.yr)},${Y(p.world_gold)}`).join(' ');

    // Axis labels
    const axisY = PT + iH;
    const yearLabels = years.filter((y, i) => i === 0 || i === years.length - 1 || years.length <= 6)
      .map(y => `<text x="${X(y)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="var(--ink-4)">${y}</text>`).join('');

    const dots = pts.map(p => {
      const parts = [];
      if (isNum(num(p.us_best)))    parts.push(`<circle cx="${X(p.yr)}" cy="${Y(p.us_best)}"    r="3" fill="var(--brand-blue)"/>`);
      if (isNum(num(p.world_gold))) parts.push(`<circle cx="${X(p.yr)}" cy="${Y(p.world_gold)}" r="3" fill="#b8860b"/>`);
      return parts.join('');
    }).join('');

    return `
      <svg class="hp-trend-chart" viewBox="0 0 ${W} ${H}" style="height:${H}px">
        <line x1="${PL}" y1="${axisY}" x2="${PL+iW}" y2="${axisY}" stroke="var(--line)" stroke-width="1"/>
        ${usLine  ? `<path d="${usLine}"  fill="none" stroke="var(--brand-blue)" stroke-width="2" stroke-linejoin="round"/>` : ''}
        ${wLine   ? `<path d="${wLine}"   fill="none" stroke="#b8860b"           stroke-width="2" stroke-linejoin="round" stroke-dasharray="5,3"/>` : ''}
        ${dots}
        ${yearLabels}
        <text x="${PL-3}" y="${PT+8}"  text-anchor="end" font-size="9" fill="var(--ink-4)">${Math.round(sMax)}</text>
        <text x="${PL-3}" y="${axisY}" text-anchor="end" font-size="9" fill="var(--ink-4)">${Math.round(sMin)}</text>
      </svg>`;
  }

  const evHtml = OLY_EVENTS.map(ev => {
    const k = `${ev.gender}::${ev.discipline}`;
    return `
      <div>
        <div class="hp-trend-event-label">${esc(ev.label)}</div>
        ${trendSVG(k, ev.label)}
      </div>`;
  }).join('');

  const legend = `
    <div class="hp-trend-legend">
      <span><span class="hp-trend-swatch" style="background:var(--brand-blue)"></span>US best senior score</span>
      <span><span class="hp-trend-swatch" style="background:#b8860b;border-top:2px dashed #b8860b;background:none"></span>World gold (dashed)</span>
    </div>`;

  $('trendsContent').innerHTML = `<div class="hp-trend-events">${evHtml}</div>${legend}`;
}

/* ── Round progression ───────────────────────────────────── */
function renderProgression(rows) {
  const gF = state.progFilter.gender;
  const bF = state.progFilter.board;
  const filtered = rows.filter(r =>
    (gF === 'all' || r.gender === gF) &&
    (bF === 'all' || r.discipline === bF)
  );

  if (!filtered.length) {
    $('progressionContent').innerHTML = '<div class="hp-prog-empty">No progression data for this filter.</div>';
    return;
  }

  const shown = filtered.slice(0, 80);
  const tbody = shown.map(r => {
    const pp = num(r.prelim_place);
    const sp = num(r.semi_place);
    const fp = num(r.final_place);
    let change = null;
    if (isNum(pp) && isNum(fp)) change = pp - fp; // positive = climbed

    const arrow = isNum(sp)
      ? `${pp || '—'} <span class="hp-prog-arrow">→</span> ${sp} <span class="hp-prog-arrow">→</span> ${fp || '—'}`
      : `${pp || '—'} <span class="hp-prog-arrow">→</span> ${fp || '—'}`;

    let cls = 'hp-prog-stable';
    let delta = '';
    if (isNum(change) && change > 0) { cls = 'hp-prog-climber'; delta = `▲ +${change}`; }
    if (isNum(change) && change < 0) { cls = 'hp-prog-fader';   delta = `▼ ${change}`; }

    return `<tr>
      <td>${esc(r.diver_name)}</td>
      <td>${esc(r.team_name || '—')}</td>
      <td>${esc(r.gender === 'Female' ? 'W' : 'M')} ${esc(r.discipline)}</td>
      <td>${esc(String(r.meet_year || ''))}</td>
      <td>${esc(r.meet_name || '—')}</td>
      <td class="num">${arrow}</td>
      <td class="num"><span class="${cls}">${delta || '–'}</span></td>
      <td class="num">${fmt1(num(r.final_score))}</td>
    </tr>`;
  }).join('');

  $('progressionContent').innerHTML = `
    <div style="padding:0 0 0 0;overflow-x:auto">
      <table class="hp-prog-table">
        <thead><tr>
          <th>Athlete</th><th>Team</th><th>Event</th><th>Year</th><th>Meet</th>
          <th class="num">Prelim → Final</th>
          <th class="num">Change</th>
          <th class="num">Final Score</th>
        </tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
    ${filtered.length > 80 ? `<div style="padding:10px 20px;font-size:12px;color:var(--ink-3)">Showing 80 of ${filtered.length} records.</div>` : ''}`;
}

/* ── Judge detail ────────────────────────────────────────── */
function renderJudges(data) {
  const statMap = new Map();
  for (const r of data.stats) statMap.set(`${r.gender}::${r.discipline}`, r);

  const html = OLY_EVENTS.map(ev => {
    const cov = data.coverage.find(r => r.gender === ev.gender && r.discipline === ev.discipline);
    const st  = statMap.get(`${ev.gender}::${ev.discipline}`);
    const parsed = cov ? num(cov.parsed_dives) : 0;
    const total  = cov ? num(cov.total_dives)  : 0;
    const rate   = total > 0 ? (parsed / total * 100) : 0;
    const avgScore = st ? num(st.avg_score) : null;
    const stddev   = st ? num(st.stddev_score) : null;
    const cv = isNum(avgScore) && isNum(stddev) && avgScore > 0 ? (stddev / avgScore * 100) : null;

    return `
      <div class="hp-judge-card">
        <div class="hp-judge-event">${esc(ev.label)}</div>
        <div class="hp-judge-stat"><span class="label">Dives with scores</span><span class="val">${fmtInt(parsed)}</span></div>
        <div class="hp-judge-stat"><span class="label">Coverage</span><span class="val">${pct(rate)}</span></div>
        <div class="hp-judge-stat"><span class="label">Avg execution</span><span class="val">${fmt2(avgScore)}</span></div>
        <div class="hp-judge-stat"><span class="label">Score CV</span><span class="val">${isNum(cv) ? cv.toFixed(1)+'%' : '—'}</span></div>
      </div>`;
  }).join('');

  $('judgeContent').innerHTML = `<div class="hp-judge-grid">${html}</div>
    <p style="padding:10px 0 0;font-size:11.5px;color:var(--ink-3)">
      Execution CV (coefficient of variation) measures judge agreement — lower is more consistent.
      Data source: World Aquatics meets with parseable judge strings (~25% of all dives).
    </p>`;
}

/* ── Synchro ─────────────────────────────────────────────── */
function renderSynchro(rows) {
  if (!rows.length) {
    $('synchroContent').innerHTML = '<div style="padding:16px 20px;color:var(--ink-3);font-size:13px;">No synchro data in this year range.</div>';
    return;
  }
  const maxGold = Math.max(...rows.map(r => num(r.world_gold)).filter(isNum), 1);
  const html = rows.map(r => {
    const us   = num(r.us_best);
    const gold = num(r.world_gold);
    const cut  = num(r.world_cut);
    const gap  = isNum(us) && isNum(gold) ? gold - us : null;
    const usPct = isNum(us) ? (us / maxGold * 90).toFixed(1) : '0';
    return `
      <div class="hp-medal-row" style="margin-bottom:14px">
        <div class="hp-medal-labels">
          <span class="hp-medal-event">${esc(r.gender)} · ${esc(r.discipline)}</span>
          ${isNum(gap) ? `<span class="hp-medal-gap-num${gap<=0?' good':''}">gap ${gap>0?'+':''}${Math.round(gap)}</span>` : ''}
        </div>
        <div class="hp-medal-track">
          <div class="hp-medal-fill" style="width:${usPct}%"></div>
          ${isNum(cut) ? `<div class="hp-medal-cut ${isNum(us)&&us<cut?'below':'above'}" style="left:${(cut/maxGold*90).toFixed(1)}%"></div>` : ''}
          <div class="hp-medal-gold-dot"></div>
        </div>
        <div class="hp-medal-nums">
          <span class="hp-medal-us">US ${isNum(us)?Math.round(us):'—'}</span>
          <span class="hp-medal-cut-lbl">cut ${isNum(cut)?Math.round(cut):'—'}</span>
          <span class="hp-medal-gold-lbl">gold ${isNum(gold)?Math.round(gold):'—'}</span>
        </div>
      </div>`;
  }).join('');
  $('synchroContent').innerHTML = `<div style="padding:16px 20px 20px">${html}</div>`;
}

/* ── Athlete autocomplete ────────────────────────────────── */
function populateAthleteList(names) {
  const dl = $('spotlightOptions');
  dl.innerHTML = names.map(n => `<option value="${esc(n)}">`).join('');
}

/* ── Athlete spotlight ───────────────────────────────────── */
async function runSpotlight(name) {
  const btn   = $('spotlightBtn');
  const panel = $('spotlightContent');
  btn.disabled = true;
  btn.textContent = 'Loading…';

  try {
    let sp = state.spotlightCache.get(name.toLowerCase());
    if (!sp) {
      sp = await loadSpotlight(name);
      state.spotlightCache.set(name.toLowerCase(), sp);
    }
    renderSpotlight(name, sp);
    panel.hidden = false;
    $('printSpotlight').hidden = false;
  } catch (e) {
    panel.innerHTML = `<div style="color:var(--brand-red);padding:16px">Could not load data for "${esc(name)}": ${esc(e.message)}</div>`;
    panel.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Search';
  }
}

function renderSpotlight(name, sp) {
  const phases  = sp.phases;
  const dives   = sp.dives;

  if (!phases.length) {
    $('spotlightContent').innerHTML = `<div style="padding:20px;color:var(--ink-3)">No results found for "<strong>${esc(name)}</strong>". Check spelling.</div>`;
    return;
  }

  // Derive basic stats
  const finals  = phases.filter(p => p.round_stage === 'Final' && isNum(num(p.score)));
  const bestFinal = finals.length ? finals.reduce((a,b) => num(a.score) >= num(b.score) ? a : b) : null;
  const bestScore = bestFinal ? num(bestFinal.score) : null;
  const bestPlace = phases.reduce((best, p) => {
    const pl = num(p.place);
    return (isNum(pl) && (!isNum(best) || pl < best)) ? pl : best;
  }, null);
  const meets = [...new Set(phases.map(p => p.meet_id))].length;
  const disciplines = [...new Set(phases.map(p => p.discipline).filter(Boolean))];
  const gender = phases[0]?.gender || '';

  // Trajectory: finals per meet-year sorted
  const trajData = finals
    .sort((a,b) => num(a.meet_year) - num(b.meet_year) || String(a.meet_name).localeCompare(String(b.meet_name)));
  const trajYears = trajData.map(p => p.meet_year || '');
  const trajScores = trajData.map(p => num(p.score));

  // Consistency (CV of dive scores)
  const diveScores = dives.map(d => num(d.score)).filter(isNum);
  let cv = null;
  if (diveScores.length > 1) {
    const mean = diveScores.reduce((a,b)=>a+b,0) / diveScores.length;
    const variance = diveScores.reduce((s,x)=>s+(x-mean)**2,0) / diveScores.length;
    cv = mean > 0 ? (Math.sqrt(variance) / mean * 100) : null;
  }
  const ddSum = bestFinal ? num(bestFinal.phase_dd_sum) : null;

  // Percentile: use pct data from query
  let pctHtml = '';
  if (sp.pct && sp.pct.length > 0) {
    const bestDisc = bestFinal ? bestFinal.discipline : disciplines[0];
    const bestGend = bestFinal ? bestFinal.gender : gender;
    const pctRow = sp.pct.find(p => p.discipline === bestDisc && p.gender === bestGend);
    if (pctRow) {
      const total = num(pctRow.total);
      const atOrBelow = num(pctRow.rank_at_or_below);
      if (isNum(total) && total > 0 && isNum(atOrBelow)) {
        const pctRank = (atOrBelow / total * 100);
        let label = '';
        if (pctRank >= 75) label = 'top quartile';
        else if (pctRank >= 50) label = 'upper half';
        else if (pctRank >= 25) label = 'lower half';
        else label = 'bottom quartile';
        pctHtml = `<div class="hp-spot-pctl">Ranks <strong>${label}</strong> among US senior ${esc(bestDisc)} finalists — top ${Math.round(100-pctRank)}% (score ${fmt1(bestScore)} vs ${fmtInt(total)} athletes).</div>`;
      }
    }
  }

  // Initials for avatar
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();

  // Trajectory SVG
  function trajSVG() {
    if (trajScores.length < 2) return '';
    const W2=480, H2=80, PL2=10, PR2=10, PT2=8, PB2=20;
    const iW2 = W2-PL2-PR2, iH2 = H2-PT2-PB2;
    const sMin = Math.min(...trajScores)*0.95, sMax = Math.max(...trajScores)*1.02;
    const sR = sMax - sMin || 1;
    const xScale = trajScores.length > 1 ? iW2/(trajScores.length-1) : iW2;
    const X2 = (i) => (PL2 + i*xScale).toFixed(1);
    const Y2 = (s) => (PT2 + iH2 - ((s-sMin)/sR*iH2)).toFixed(1);
    const bestI = trajScores.indexOf(Math.max(...trajScores));
    const linePts = trajScores.map((s,i) => `${i===0?'M':'L'}${X2(i)},${Y2(s)}`).join(' ');
    const dots = trajScores.map((s,i) => {
      const isPeak = i === bestI;
      return `<circle cx="${X2(i)}" cy="${Y2(s)}" r="${isPeak?5:3.5}" fill="${isPeak?'var(--status-direct)':'var(--brand-blue)'}"/>`;
    }).join('');
    const lbls = trajScores.map((s,i) => {
      const isPeak = i === bestI;
      const yr = String(trajYears[i] || '');
      const yy = yr.length === 4 ? `'${yr.slice(2)}` : yr;
      return `<text x="${X2(i)}" y="${H2-4}" text-anchor="middle" font-size="9" fill="${isPeak?'var(--status-direct)':'var(--ink-4)'}" font-weight="${isPeak?'700':'400'}">${yy} ${s.toFixed(0)}</text>`;
    }).join('');
    return `<svg class="hp-spot-traj-chart" viewBox="0 0 ${W2} ${H2}" style="height:${H2}px">
      <path d="${linePts}" fill="none" stroke="var(--brand-blue)" stroke-width="2" stroke-linejoin="round"/>
      ${dots}${lbls}
    </svg>`;
  }

  // Dive-by-dive bars
  function diveBarHtml() {
    if (!dives.length) return '';
    const scores = dives.map(d => num(d.score)).filter(isNum);
    if (!scores.length) return '';
    const maxS = Math.max(...scores);
    const bestI = scores.indexOf(maxS);
    const bars = dives.map((d, i) => {
      const s = num(d.score);
      if (!isNum(s)) return '<div class="hp-spot-dive-bar" style="height:4px;background:var(--line)"></div>';
      const h = Math.max(4, (s / maxS * 100)).toFixed(0);
      const isPeak = i === bestI;
      return `<div class="hp-spot-dive-bar${isPeak?' peak':''}" style="height:${h}%" title="${esc(d.description||d.dive_number||'')} — ${s.toFixed(2)}"></div>`;
    }).join('');
    const labels = dives.map((d, i) => {
      const s = num(d.score);
      const isPeak = i === bestI;
      return `<span class="hp-spot-dive-score${isPeak?' peak':''}">${isNum(s)?s.toFixed(1):'—'}</span>`;
    }).join('');
    return `<div class="hp-spot-dive-bars">${bars}</div><div class="hp-spot-dive-scores">${labels}</div>`;
  }

  // Dive profile table
  function diveTableHtml() {
    if (!dives.length) return '';
    const scores = dives.map(d => num(d.score)).filter(isNum);
    const maxS = scores.length ? Math.max(...scores) : -1;
    const rows2 = dives.map(d => {
      const s = num(d.score);
      const isBest = isNum(s) && s === maxS;
      return `<tr class="${isBest?'best-dive':''}">
        <td>${esc(d.dive_number||'')}</td>
        <td>${esc(d.description||'')}</td>
        <td>${esc(d.optional_voluntary||'')}</td>
        <td class="num">${fmt2(num(d.dd))}</td>
        <td class="num">${fmt2(s)}</td>
        <td class="num">${fmt2(num(d.net_score))}</td>
      </tr>`;
    }).join('');
    return `
      <div class="hp-spot-section-title" style="margin-top:16px">Best performance — dive by dive (${esc(bestFinal?.meet_name||'')}, ${esc(String(bestFinal?.meet_year||''))})</div>
      <table class="hp-spot-dive-table">
        <thead><tr>
          <th>Code</th><th>Description</th><th>O/V</th>
          <th class="num">DD</th><th class="num">Score</th><th class="num">Net</th>
        </tr></thead>
        <tbody>${rows2}</tbody>
      </table>`;
  }

  $('spotlightContent').innerHTML = `
    <div class="hp-spot-header">
      <div class="hp-spot-avatar">${esc(initials)}</div>
      <div>
        <div class="hp-spot-name">${esc(name)}</div>
        <div class="hp-spot-meta">${esc(disciplines.join(' · '))} · ${esc(gender)} · ${meets} meet${meets!==1?'s':''}</div>
      </div>
      ${isNum(bestScore) ? `<div class="hp-spot-best"><div class="label">Personal best</div><div class="val">${fmt1(bestScore)}</div></div>` : ''}
    </div>

    <div class="hp-spot-chips">
      <div class="hp-spot-chip">
        <div class="label">Best place</div>
        <div class="val">${isNum(bestPlace) ? bestPlace : '—'}</div>
      </div>
      <div class="hp-spot-chip">
        <div class="label">Consistency (CV)</div>
        <div class="val">${isNum(cv) ? cv.toFixed(1)+'%' : '—'}</div>
        <div class="sub">lower = more consistent</div>
      </div>
      <div class="hp-spot-chip">
        <div class="label">Difficulty (DD sum)</div>
        <div class="val">${fmt2(ddSum)}</div>
        <div class="sub">best final</div>
      </div>
      <div class="hp-spot-chip">
        <div class="label">Finals competed</div>
        <div class="val">${finals.length}</div>
      </div>
    </div>

    ${pctHtml}

    ${trajScores.length >= 2 ? `
      <div class="hp-spot-traj">
        <div class="hp-spot-section-title">Score trajectory — US senior finals over time</div>
        ${trajSVG()}
      </div>` : ''}

    ${dives.length ? `
      <div class="hp-spot-dives">
        <div class="hp-spot-section-title">Best performance — dive-by-dive scores</div>
        ${diveBarHtml()}
      </div>` : ''}

    ${diveTableHtml()}
  `;
}

/* ── Leaderboard ─────────────────────────────────────────── */
function renderLeaderboard(rows) {
  const gF = state.lbFilter.gender;
  const bF = state.lbFilter.board;
  const fF = state.lbFilter.family;

  const filtered = rows.filter(r =>
    (gF === 'all' || r.gender === gF) &&
    (bF === 'all' || r.discipline === bF) &&
    (fF === 'all' || r.competition_family === fF)
  ).sort((a,b) => num(b.best_score) - num(a.best_score)).slice(0, 100);

  if (!filtered.length) {
    $('leaderboardRows').innerHTML = '<tr class="row-empty"><td colspan="8">No athletes match filters.</td></tr>';
    return;
  }

  $('leaderboardRows').innerHTML = filtered.map((r, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${esc(r.diver_name)}</td>
      <td>${esc(r.team_name||'—')}</td>
      <td>${esc(r.gender==='Female'?'W':'M')}</td>
      <td>${esc(r.discipline)}</td>
      <td class="num">${fmt1(num(r.best_score))}</td>
      <td class="num">${fmtInt(num(r.events))}</td>
      <td class="num">${isNum(num(r.best_place)) ? Math.round(num(r.best_place)) : '—'}</td>
    </tr>`).join('');
}

/* ── Print handlers ──────────────────────────────────────── */
function printMedalGap() {
  const w = window.open('', '_blank');
  const content = document.getElementById('sec-medal-gap').outerHTML;
  const sty = document.querySelector('link[href*="design.css"]')?.href || '';
  const sty2 = document.querySelector('link[href*="styles.css"]')?.href || '';
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>HP Analytics — Road to the Podium</title>
    <link rel="stylesheet" href="${sty}"><link rel="stylesheet" href="${sty2}">
    <style>body{padding:32px;max-width:900px;margin:0 auto;}.hp-section-hd .hp-print-btn{display:none}</style>
    </head><body>${content}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch(e){} }, 600);
}

function printAthleteCard() {
  const w = window.open('', '_blank');
  const content = document.getElementById('sec-spotlight').outerHTML;
  const name = document.getElementById('spotlightSearch').value || 'Athlete';
  const sty = document.querySelector('link[href*="design.css"]')?.href || '';
  const sty2 = document.querySelector('link[href*="styles.css"]')?.href || '';
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>HP Analytics — ${esc(name)}</title>
    <link rel="stylesheet" href="${sty}"><link rel="stylesheet" href="${sty2}">
    <style>body{padding:32px;max-width:900px;margin:0 auto;}.hp-spotlight-search,.hp-section-hd .hp-print-btn{display:none}</style>
    </head><body>${content}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch(e){} }, 600);
}

/* ── Year scope controls ─────────────────────────────────── */
function setYearScope(min, max) {
  state.yearMin = min;
  state.yearMax = max;
  document.querySelectorAll('.hp-year-btn').forEach(b => b.classList.remove('active'));
  reloadData();
}

/* ── Reload data + re-render ─────────────────────────────── */
async function reloadData() {
  document.getElementById('mainContent').hidden = true;
  document.getElementById('loadingPanel').hidden = false;
  setLoading(`Loading ${state.yearMin}–${state.yearMax} data…`);
  await bootstrap(state.yearMin, state.yearMax);
}

/* ── Wire all events ─────────────────────────────────────── */
function wireEvents(progressionData, lbData) {
  // Year scope buttons
  document.querySelectorAll('.hp-year-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hp-year-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const min = parseInt(btn.dataset.min);
      const max = parseInt(btn.dataset.max);
      setYearScope(min, max);
    });
  });

  // Progression filter
  $('progGender').addEventListener('change', (e) => {
    state.progFilter.gender = e.target.value;
    renderProgression(progressionData);
  });
  $('progBoard').addEventListener('change', (e) => {
    state.progFilter.board = e.target.value;
    renderProgression(progressionData);
  });

  // Leaderboard filter
  ['lbGender','lbBoard','lbFamily'].forEach(id => {
    $(id).addEventListener('change', () => {
      state.lbFilter.gender = $('lbGender').value;
      state.lbFilter.board  = $('lbBoard').value;
      state.lbFilter.family = $('lbFamily').value;
      renderLeaderboard(lbData);
    });
  });

  // Load leaderboard on expand
  $('sec-leaderboard').addEventListener('toggle', async () => {
    if ($('sec-leaderboard').open && !state.lbData) {
      $('leaderboardRows').innerHTML = '<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--ink-3)">Loading…</td></tr>';
      try {
        state.lbData = await loadLeaderboard(state.yearMin, state.yearMax);
        renderLeaderboard(state.lbData);
      } catch(e) {
        $('leaderboardRows').innerHTML = `<tr class="row-empty"><td colspan="8">Load failed: ${esc(e.message)}</td></tr>`;
      }
    }
  });

  // Athlete spotlight
  $('spotlightBtn').addEventListener('click', () => {
    const name = $('spotlightSearch').value.trim();
    if (name) runSpotlight(name);
  });
  $('spotlightSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const name = e.target.value.trim();
      if (name) runSpotlight(name);
    }
  });

  // Print buttons
  $('printMedalGap').addEventListener('click', printMedalGap);
  $('printSpotlight').addEventListener('click', printAthleteCard);
}

/* ── Bootstrap ───────────────────────────────────────────── */
async function bootstrap(yMin, yMax) {
  yMin = yMin || state.yearMin;
  yMax = yMax || state.yearMax;
  const p = [yMin, yMax];

  document.getElementById('loadingPanel').hidden = false;
  document.getElementById('mainContent').hidden  = true;

  try {
    setLoading('Checking Neon connection…');

    // Run hero queries in parallel for fast first paint
    setLoading(`Loading ${yMin}–${yMax} field-level data…`);
    const [trust, medalGap, scoreBands, ddData, heatData, synchroData] = await Promise.all([
      loadTrust(yMin, yMax),
      loadMedalGap(yMin, yMax),
      loadScoreBands(yMin, yMax),
      loadDD(yMin, yMax),
      loadHeatmap(yMin, yMax),
      loadSynchro(yMin, yMax),
    ]);

    // Render hero modules immediately
    renderTrust(trust);
    renderMedalGap(medalGap);
    renderScoreBands(scoreBands);
    renderDD(ddData);
    renderHeatmap(heatData);
    renderSynchro(synchroData);

    // Show content while secondary queries load
    document.getElementById('loadingPanel').hidden = true;
    document.getElementById('mainContent').hidden  = false;

    setLoading('Loading trends and progression data…');

    // Secondary queries (less time-critical)
    const [trends, progression, judges, athleteList] = await Promise.all([
      loadTrends(),
      loadProgression(yMin, yMax),
      loadJudges(yMin, yMax),
      loadAthleteList(),
    ]);

    renderTrends(trends);
    renderProgression(progression);
    renderJudges(judges);
    populateAthleteList(athleteList);

    // Wire all interactivity
    wireEvents(progression, null);
    state.lbData = null; // reset so it reloads if year changed

    $('kpiSource').textContent = 'Neon ✓';

  } catch (e) {
    document.getElementById('loadingPanel').hidden = false;
    document.getElementById('mainContent').hidden  = true;
    setLoading('');
    $('loadingText').innerHTML = `<span style="color:var(--brand-red)">Could not load data: ${esc(e.message || String(e))}</span><br><small style="color:var(--ink-3)">Check console for details.</small>`;
    console.error('[HP Analytics]', e);
  }
}

/* ── Exposed as the Field Intel view; booted lazily by app.js ── */
window.AEField = { bootstrap };

})();
