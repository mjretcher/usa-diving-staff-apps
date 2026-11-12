/* ============================================================
   Criteria Simulator — main.js (rebuild)
   Loads data via USAD.data.load (Neon → IndexedDB cache → fallback)
   ============================================================ */
(function () {
'use strict';

// ── Constants (from original; lifted exactly to preserve math) ─────────────
const WINTER_SCORE_STANDARDS = {
  Female: { usa:  { '1m': 235, '3m': 260, Platform: 250 },
            ncaa: { '1m': 282, '3m': 312, Platform: 250 } },
  Male:   { usa:  { '1m': 318, '3m': 360, Platform: 330 },
            ncaa: { '1m': 318, '3m': 360, Platform: 330 } },
};
const WINTER_DD_MINIMUMS = {
  Female: { '1m': 11.9, '3m': 13.7, Platform: 13.3 },
  Male:   { '1m': 15.9, '3m': 17.2, Platform: 17.1 },
};
const NATIONAL_DD_MINIMUMS = {
  Female: { '1m': 11.4, '3m': 13.2, Platform: 13.2 },
  Male:   { '1m': 15.4, '3m': 16.8, Platform: 16.3 },
};
const PRESET_NOTES = {
  winterEligibility:
    'Athletes qualify by meeting the Table 1 score standard at any Table 2 meet in the two-year window. Every source is read on its own optional count (USA 5 or 6, NCAA 6, Junior A/B optionals) and restated to the USA basis, so one bar moves every source together. DD is required to compete at Winter Nationals but may be earned separately.',
  winterQualifier:
    'Winter Qualifier advancement (2026 criteria): top 6 OR the Table 1 score standard, in each of 1m, 3m and 10m.',
  nationalQualifier:
    'USA Nationals qualifier: top 12 finishers in the qualifier event advance to USA Diving National Championships.',
  custom:
    'Custom model: adjust meets, round, placement cutoff, score threshold, DD threshold, and DD handling to test a policy scenario.',
};

const PRESET_SOURCES = {
  winterEligibility: [
    'USA Diving / USA Diving Nationals',
    'USA Diving / USA Diving Nationals Qualifier',
    'USA Diving / USA Diving Junior Nationals',
    'USA Diving / USA Diving Olympic Trials',
    'USA Diving / USA Diving Olympic Trials Qualifier',
    'USA Diving / USA Diving Winter Nationals',
    'USA Diving / USA Diving Winter Nationals Qualifier',
    'NCAA / NCAA Division I Championships / Division I',
    'World Aquatics / World Aquatics Championships',
    'World Aquatics / World Aquatics Recognized Event',
    'World Aquatics / World Aquatics World Cup',
  ],
  winterQualifier:   ['USA Diving / USA Diving Winter Nationals Qualifier'],
  nationalQualifier: ['USA Diving / USA Diving Nationals Qualifier'],
};

const SCENARIO_STORE_KEY = 'usad.criteriaSimulator.scenarios.v2';

// ── Pools ──────────────────────────────────────────────────────────────────
// A "pool" is one internally-consistent scoring universe. Score standards,
// score bases, and DD minimums are only comparable *within* a pool — mixing
// e.g. NCAA 5-category scores with USA posted scores under one threshold
// produces a meaningless number. Every scenario is scoped to exactly one
// pool at a time; comparing pools means switching pools, not summing them.
const POOLS = {
  seniorUsa: {
    id: 'seniorUsa',
    label: 'USA Diving Senior (Nationals / Winter Nationals / Olympic Trials)',
    shortLabel: 'Senior USA',
    family: 'usa',
    presets: ['winterEligibility', 'winterQualifier', 'nationalQualifier', 'custom'],
    // Individual events only. Synchro rows share the meet and carry a
    // discipline like "Synchronized Platform", which normalises to Platform —
    // left in, a synchro total would clear an individual score standard.
    match: (r) => r.competition_family === 'USA Diving' && !r.is_synchronized && [
      'USA Diving Nationals', 'USA Diving Nationals Qualifier',
      'USA Diving Winter Nationals', 'USA Diving Winter Nationals Qualifier',
      'USA Diving Olympic Trials', 'USA Diving Olympic Trials Qualifier',
    ].includes(r.competition_group),
  },
  ncaa: {
    id: 'ncaa',
    label: 'NCAA Championships',
    shortLabel: 'NCAA',
    family: 'ncaa',
    presets: ['custom'],
    match: (r) => r.competition_family === 'NCAA' && !r.is_synchronized,
  },
  juniorAB: {
    id: 'juniorAB',
    label: 'Junior Circuit — Group A/B (Junior Nationals)',
    shortLabel: 'Junior A/B',
    family: null, // no encoded standard yet — HPD sets a custom bar
    presets: ['custom'],
    // 2025+ rows carry age_group tags ('Group A'/'Group B'). 2018–2024 rows
    // have age_group = null but encode the bracket in the event name:
    // "16-18" = Group A, "14-15" = Group B (verified against Neon, all years).
    // Synchro and high-diving events don't match either pattern and are
    // excluded, which is correct for this individual-events pool.
    match: (r) => {
      if (r.competition_family !== 'USA Diving') return false;
      if (r.competition_group !== 'USA Diving Junior Nationals') return false;
      if (r.is_synchronized) return false;
      if (r.age_group === 'Group A' || r.age_group === 'Group B') return true;
      if (r.age_group) return false; // tagged C/D
      const en = String(r.event_round || r.event_name || '');
      return /\b16-18\b/.test(en) || /\b14-15\b/.test(en);
    },
  },
};
// ── Winter Nationals eligibility: every Table 2 source, one per-optional bar ──
// The published standards are per optional dive times the number of optionals
// in each source's format (47/opt → USA women 5 opt = 235, NCAA 6 opt = 282,
// Junior Group A 4 opt = 188). So the cross-source pool restates every score
// to the USA basis before it meets the bar; the bar itself stays one number.
const SENIOR_USA_GROUP_LIST = [
  'USA Diving Nationals', 'USA Diving Nationals Qualifier',
  'USA Diving Winter Nationals', 'USA Diving Winter Nationals Qualifier',
  'USA Diving Olympic Trials', 'USA Diving Olympic Trials Qualifier',
];
// NCAA Division I conference championships approved by the HPD, by competition
// year. Source: USA Diving Approved Conference Championships.xlsx (Events /
// All Events - Master Documents / Policies & Procedures). No 2026 list has
// been issued yet, so 2026 conference meets stay out until it is.
const APPROVED_CONFERENCES = {
  2024: [/ACC Diving/i, /Big 12/i, /\bB1G\b|Big Ten/i, /Ivy League/i, /Mountain West/i,
         /Pac[ -]?12/i, /SEC Diving/i, /Mid American Conference Mens/i, /Mountain Pacific Sports Federation/i],
  2025: [/ACC Diving/i, /Big 12/i, /\bB1G\b|Big Ten/i, /Ivy League/i, /Mountain West/i,
         /SEC Diving/i, /Mid American Conference/i, /Missouri Valley/i],
};
// Optional dives in the optionals-only (final) phase at Junior Nationals,
// verified against core.result_phases for 2025 and 2026.
const JUNIOR_OPTIONALS = {
  Female: { 'Group A': 4, 'Group B': 3 },
  Male:   { 'Group A': 5, 'Group B': 4 },
};
function juniorGroupOf(r) {
  if (r.age_group === 'Group A' || r.age_group === 'Group B') return r.age_group;
  if (r.age_group) return null;
  const en = String(r.event_round || r.event_name || '');
  if (/\b16-18\b/.test(en)) return 'Group A';
  if (/\b14-15\b/.test(en)) return 'Group B';
  return null;
}
// USA-basis optional count for the standard: women 5, men 6 (all boards).
function usaBasisOptionals(gender) { return normaliseGender(gender) === 'Male' ? 6 : 5; }
// Default optionals when the phase dive count is missing (posted-only rows).
function defaultOptionals(gender, discipline, ncaa) {
  const g = normaliseGender(gender);
  if (g === 'Male') return 6;
  return (ncaa && discipline !== 'Platform') ? 6 : 5;
}
const ELIG_LABELS = {
  usadSenior: 'USA Diving senior', jrNatA: 'Junior Nationals Group A optionals', jrNatB: 'Junior Nationals Group B optionals',
  ncaaZone: 'NCAA Zone', ncaaD1: 'NCAA Division I Championships', ncaaConference: 'NCAA conference (HPD approved)',
  ncaaD2D3: 'NCAA Division II/III Championships final', worldAquatics: 'World Aquatics',
};
// Classify a row as a Table 2 source, or null when it does not count toward
// Winter Nationals eligibility. Memoised on the row; nothing here is dynamic.
function eligibilitySource(r) {
  if (r._elig !== undefined) return r._elig;
  let out = null;
  const grp = r.competition_group || '';
  const nd  = r.n_dives;
  if (!r.is_synchronized) {
    if (r.competition_family === 'USA Diving') {
      if (SENIOR_USA_GROUP_LIST.includes(grp)) {
        out = { cls: 'usadSenior', optionals: isNum(nd) ? nd : defaultOptionals(r.gender, r.discipline, false) };
      } else if (grp === 'USA Diving Junior Nationals') {
        const ag = juniorGroupOf(r);
        const exp = ag ? JUNIOR_OPTIONALS[normaliseGender(r.gender)]?.[ag] : null;
        // Only the optionals-only phase counts ("Group A and B – optionals only").
        if (exp && nd === exp) out = { cls: ag === 'Group A' ? 'jrNatA' : 'jrNatB', optionals: exp };
      }
    } else if (r.competition_family === 'NCAA') {
      let cls = null;
      if (/\bZONE\b/i.test(grp)) cls = 'ncaaZone';
      else if (grp === 'NCAA Division I Championships') cls = 'ncaaD1';
      else if (/Division (II|III) Championships/i.test(grp) && !/Region/i.test(grp)) cls = 'ncaaD2D3';
      else if ((APPROVED_CONFERENCES[r.meet_year] || []).some(re => re.test(grp))) cls = 'ncaaConference';
      // 10/26/2026 amendment: D2/D3 counts on 1m and 3m, championship final only.
      if (cls === 'ncaaD2D3' && (r.discipline === 'Platform' || r.round_stage !== 'Final')) cls = null;
      if (cls) out = { cls, optionals: isNum(nd) ? nd : defaultOptionals(r.gender, r.discipline, true) };
    } else if (r.competition_family === 'World Aquatics') {
      out = { cls: 'worldAquatics', optionals: isNum(nd) ? nd : defaultOptionals(r.gender, r.discipline, false) };
    }
  }
  if (out) out.label = ELIG_LABELS[out.cls];
  r._elig = out;
  return out;
}
POOLS.winterEligibility = {
  id: 'winterEligibility',
  label: 'Winter Nationals eligibility (all Table 2 sources, per-optional basis)',
  shortLabel: 'Winter eligibility',
  family: 'usa',        // standards and DD tables are stated on the USA basis
  crossSource: true,    // scores restated to the USA basis via optional counts
  yearWindow: 2,        // Table 2 lists two competition years
  presets: ['winterEligibility', 'custom'],
  match: (r) => eligibilitySource(r) != null,
};
const POOL_ORDER = ['seniorUsa', 'winterEligibility', 'ncaa', 'juniorAB'];

// Years the live evaluation reads. One year for ordinary pools; the
// eligibility pool reads the selected year and the one before it.
function yearsInScope() {
  const y = state.year;
  if (!isNum(y)) return [];
  const w = activePool().yearWindow || 1;
  const out = [];
  for (let i = 0; i < w; i++) out.push(y - i);
  return out;
}
function yearsLabel() {
  const ys = yearsInScope();
  if (!ys.length) return '—';
  return ys.length === 1 ? String(ys[0]) : `${Math.min(...ys)} to ${Math.max(...ys)}`;
}

function activePool() { return POOLS[state.pool] || POOLS.seniorUsa; }
function poolFamily() { return activePool().family; }

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  data: null,           // { results: [...], _source }
  meetsById: new Map(), // meet_id -> { meet_id, name, source, count }
  selectedMeetIds: new Set(),
  pool: 'seniorUsa',
  year: null,           // single year in scope for the live evaluation
  availableYears: [],   // years with data in the active pool
  scenarios: [],
  activeScenarioId: null,
  filtered: [],
  evaluated: [],
  qualified: [],
  bubble: [],
  thresholdEdited: false,
  ddThresholdEdited: false,
  qualifiedSort: { key: 'analysis_score', dir: 'desc' },
};

const els = {};

// ── Utilities ──────────────────────────────────────────────────────────────
const $  = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const fmtScore = (v) => isNum(v) ? v.toFixed(2) : '—';
const fmtDd    = (v) => isNum(v) ? v.toFixed(2) : '—';
const fmtPct   = (v) => isNum(v) ? (v*100).toFixed(0)+'%' : '—';
const fmtInt   = (v) => isNum(v) ? Math.round(v).toLocaleString() : '—';
const sortByName = (a,b) => String(a||'').localeCompare(String(b||''));

function localGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function localSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

// ── Data normalisation ─────────────────────────────────────────────────────
// Source data may come from Neon (snake_case column names) or the static
// criteria-data.js fallback. Normalise to a consistent row shape.
function normaliseRow(r) {
  const nat = r.nat ?? r.country ?? '';
  const isUsa = (r.is_usa ?? r.isUsa);
  const family = r.competition_family ?? '';
  const group = r.competition_group ?? '';
  const division = r.ncaa_division ?? null;
  // Compose the source key the way the original app did:
  // "Family / Group" or "Family / Group / Division" for NCAA Division I/II/III
  let sourceComposed = '';
  if (family && group) {
    sourceComposed = family + ' / ' + group;
    if (division) sourceComposed += ' / ' + division;
  } else if (family) {
    sourceComposed = family;
  } else if (r.source_name || r.sourceName || r.source) {
    sourceComposed = r.source_name ?? r.sourceName ?? r.source;
  }
  return {
    meet_id:       r.meet_id ?? r.meetId ?? null,
    meet_name:     r.meet_name ?? r.meetName ?? '',
    meet_year:     num(r.meet_year ?? r.year ?? r.meetYear),
    // competition_family is the meaningful "source" classifier
    // (USA Diving / NCAA / World Aquatics / etc.). source_system is largely null.
    source_name:   sourceComposed,
    competition_family: family,
    competition_group:  group,
    event_id:      r.event_id ?? r.eventId ?? null,
    event_name:    r.event_name ?? r.eventName ?? r.event_round ?? '',
    event_round:   r.event_round ?? '',
    round_stage:   r.round_stage ?? r.roundStage ?? r.round ?? '',
    event_level:   r.event_level ?? r.eventLevel ?? '',
    age_group:     r.age_group ?? r.ageGroup ?? '',
    place:         num(r.place),
    diver_id:      r.diver_id ?? r.diverId ?? null,
    diver_name:    r.diver_name ?? r.diverName ?? '',
    team_id:       r.team_id ?? r.teamId ?? null,
    team_name:     r.team_name ?? r.teamName ?? '',
    nat:           nat,
    is_usa:        (isUsa != null) ? !!isUsa : (nat ? nat.toUpperCase() === 'USA' : null),
    gender:        normaliseGender(r.gender ?? ''),
    discipline:    normaliseDiscipline(r.discipline ?? r.event_discipline ?? r.eventDiscipline ?? ''),
    // ── Scoring (actual schema column names) ──────────────────
    phase_score:   num(r.phase_score_from_dives ?? r.phase_score ?? r.phaseScore),
    posted_score:  num(r.posted_score ?? r.postedScore),
    phase_dd_sum:  num(r.phase_dd_sum ?? r.phaseDdSum ?? r.dd_sum ?? r.ddSum),
    n_dives:       num(r.phase_dive_count ?? r.n_dives ?? r.nDives),
    is_synchronized: !!r.is_synchronized,
    // NCAA 5-cat fields (actual schema column names)
    ncaa_total:    num(r.ncaa_women_springboard_5cat_score ?? r.ncaa_total ?? r.ncaaTotal),
    raw_total_6:   num(r.ncaa_women_springboard_raw_6_dive_score ?? r.raw_total_6 ?? r.rawTotal6),
    dropped_cat:   r.ncaa_women_springboard_repeated_category ?? r.dropped_cat ?? r.droppedCat ?? null,
    ncaa_5cat_dd:  num(r.ncaa_women_springboard_5cat_dd_sum),
    ncaa_division: r.ncaa_division ?? null,
    phase_dd_sum:  num(r.phase_dd_sum),
    // Model 3 (scoring environment), present when hp_models is built
    env_severity:  num(r.env_severity),
    env_champ_ref: num(r.env_champ_ref),
    // Carry-through
    _raw: r,
  };
}
function normaliseDiscipline(d) {
  const s = String(d || '').toLowerCase();
  if (s.includes('plat') || s === '10m' || s === '10-meter') return 'Platform';
  if (s.includes('3') || s === '3m' || s === '3-meter')      return '3m';
  if (s.includes('1') || s === '1m' || s === '1-meter')      return '1m';
  return d || '';
}
function normaliseGender(g) {
  const s = String(g || '').toLowerCase();
  if (s.startsWith('f') || s === 'women' || s === 'girls') return 'Female';
  if (s.startsWith('m') || s === 'men'   || s === 'boys')  return 'Male';
  return g || '';
}

// ── Scoring helpers ────────────────────────────────────────────────────────
// Restate a non-cumulative score as if judged by this cohort's US Senior
// championship panels (Model 3). total - 3 x (panel severity - championship
// level) x list DD. Needs the panel's estimate and the list DD; otherwise null.
function championshipRestated(row) {
  const base = isNum(row.phase_score) ? row.phase_score : (isNum(row.posted_score) ? row.posted_score : null);
  if (!isNum(base) || !isNum(row.env_severity) || !isNum(row.env_champ_ref) || !isNum(row.phase_dd_sum)) return null;
  return base - 3 * (row.env_severity - row.env_champ_ref) * row.phase_dd_sum;
}
// Factor that restates this row's score onto the USA basis (per optional ×
// USA optional count). 1 outside the cross-source pool.
function basisScaleForRow(row) {
  if (!activePool().crossSource) return 1;
  const src = eligibilitySource(row);
  if (!src) return 1;
  let rowOpt = src.optionals;
  if (els.scoreMode.value === 'ncaaWomen5Category' && isNum(row.ncaa_total)) rowOpt = 5; // 5-cat is already a 5-dive total
  const target = usaBasisOptionals(row.gender);
  if (!isNum(rowOpt) || rowOpt <= 0) return 1;
  return target / rowOpt;
}
function scoreForRow(row) {
  const raw = rawScoreForRow(row);
  if (!isNum(raw)) return null;
  const k = basisScaleForRow(row);
  return k === 1 ? raw : Math.round(raw * k * 100) / 100;
}
function rawScoreForRow(row) {
  const mode = els.scoreMode.value;
  if (mode === 'championshipPanel') {
    const v = championshipRestated(row);
    if (isNum(v)) return v;
    // No panel estimate for this result: fall back to the plain score and say so in the basis label.
  }
  if (mode === 'ncaaWomen5Category' && isNum(row.ncaa_total)) return row.ncaa_total;
  if (mode === 'posted'              && isNum(row.posted_score)) return row.posted_score;
  if (mode === 'phasePreferred'      && isNum(row.phase_score))  return row.phase_score;
  // phaseOrStandalone (default): prefer phase_score, fall back to posted
  if (isNum(row.phase_score)) return row.phase_score;
  if (isNum(row.posted_score)) return row.posted_score;
  return null;
}
function scoreBasisLabel(row) {
  const mode = els.scoreMode.value;
  let base;
  if (mode === 'championshipPanel') base = isNum(championshipRestated(row)) ? 'Restated' : 'Phase (no panel est.)';
  else if (mode === 'ncaaWomen5Category' && isNum(row.ncaa_total)) base = 'NCAA 5-cat';
  else if (mode === 'posted')         base = 'Posted';
  else if (mode === 'phasePreferred') base = 'Phase';
  else base = isNum(row.phase_score) ? 'Phase' : 'Posted';
  const k = basisScaleForRow(row);
  if (k !== 1) {
    const src = eligibilitySource(row);
    base += ` · ${src.optionals} opt → ${usaBasisOptionals(row.gender)}-opt equiv`;
  }
  return base;
}
function ddMinimumForSelection(gender, discipline, preset) {
  // These DD tables were published for the Senior USA pool specifically.
  // Don't apply them to NCAA or Junior pools — no minimum is set there
  // until the HPD provides one, so leave it blank rather than guess.
  if (poolFamily() !== 'usa') return null;
  const g = normaliseGender(gender);
  const d = normaliseDiscipline(discipline);
  if (preset === 'nationalQualifier') return NATIONAL_DD_MINIMUMS[g]?.[d] ?? null;
  return WINTER_DD_MINIMUMS[g]?.[d] ?? null;
}
function scoreThresholdForSelection(gender, discipline, family) {
  const g = normaliseGender(gender);
  const d = normaliseDiscipline(discipline);
  return WINTER_SCORE_STANDARDS[g]?.[family]?.[d] ?? null;
}

// ── Evaluation ─────────────────────────────────────────────────────────────
function ddIsSatisfied(row) {
  const mode = els.ddMode.value;
  const minimum = num(els.ddThreshold.value) ?? ddMinimumForSelection(
    els.genderFilter.value, els.disciplineFilter.value, els.criteriaPreset.value
  );
  const total = row.phase_dd_sum;

  if (mode === 'ignore')       return { pass: true,  status: 'ignored', minimum, total };
  if (!isNum(minimum))         return { pass: true,  status: 'notApplicable', minimum, total };
  if (!isNum(total)) {
    return mode === 'requireKnown'
      ? { pass: false, status: 'unknownFail', minimum, total }
      : { pass: true,  status: 'unknownPass', minimum, total };
  }
  return total >= minimum
    ? { pass: true,  status: 'pass', minimum, total }
    : { pass: false, status: 'fail', minimum, total };
}

function evaluateRow(row) {
  const score = scoreForRow(row);
  const scoreBasis = scoreBasisLabel(row);
  const threshold  = num(els.scoreThreshold.value);
  const topN       = num(els.topN.value) ?? 0;
  const rule       = els.ruleMode.value;
  const dd         = ddIsSatisfied(row);

  const scorePass = isNum(threshold) && isNum(score) && score >= threshold;
  const topPass   = topN > 0 && isNum(row.place) && row.place <= topN;

  let rulePass = false;
  if (rule === 'scoreOnly')   rulePass = scorePass;
  if (rule === 'topNOnly')    rulePass = topPass;
  if (rule === 'topNOrScore') rulePass = topPass || scorePass;

  const qualified = rulePass && dd.pass;
  const rawScore = rawScoreForRow(row);
  const scale    = basisScaleForRow(row);
  const src      = activePool().crossSource ? eligibilitySource(row) : null;
  const scoreTxt = scale === 1
    ? `Score ${fmtScore(score)}`
    : `Score ${fmtScore(rawScore)} on ${src.optionals} opt (${fmtScore(rawScore / src.optionals)}/opt) = ${fmtScore(score)} equiv`;

  let reason;
  if (qualified) {
    const reasons = [];
    if (topPass)   reasons.push(`Top ${topN} (placed ${row.place})`);
    if (scorePass) reasons.push(`${scoreTxt} ≥ ${fmtScore(threshold)}`);
    if (dd.status === 'pass')        reasons.push(`DD ${fmtDd(dd.total)} ≥ ${fmtDd(dd.minimum)}`);
    if (dd.status === 'ignored')     reasons.push('DD ignored');
    if (dd.status === 'unknownPass') reasons.push('DD unknown (accepted)');
    reason = reasons.join(' · ');
  } else {
    const fails = [];
    if (rule !== 'topNOnly'  && isNum(threshold) && !scorePass)
      fails.push(`${scoreTxt} < ${fmtScore(threshold)}`);
    if (rule !== 'scoreOnly' && topN > 0 && !topPass)
      fails.push(isNum(row.place) ? `Placed ${row.place} (need top ${topN})` : `No placement`);
    if (!dd.pass) fails.push(`DD ${fmtDd(dd.total)} < ${fmtDd(dd.minimum)}`);
    reason = fails.join(' · ') || 'Did not meet rule';
  }

  return {
    ...row,
    analysis_score: score,
    raw_score: rawScore,
    basis_scale: scale,
    source_class: src ? src.label : null,
    threshold_used: threshold,
    score_basis: scoreBasis,
    dd_total_used: dd.total,
    dd_minimum_used: dd.minimum,
    dd_status: dd.status,
    qualified,
    reason,
    threshold_gap: isNum(threshold) && isNum(score) ? threshold - score : null,
  };
}

function athleteKey(row) { return row.diver_id || `name::${row.diver_name}`; }
function compareRows(a, b) {
  // Higher score, lower place, better
  const sa = isNum(a.analysis_score) ? a.analysis_score : -Infinity;
  const sb = isNum(b.analysis_score) ? b.analysis_score : -Infinity;
  if (sa !== sb) return sa - sb;
  const pa = isNum(a.place) ? -a.place : -999;
  const pb = isNum(b.place) ? -b.place : -999;
  return pa - pb;
}
function bestQualified(rows) {
  const by = new Map();
  rows.filter(r => r.qualified).forEach(r => {
    const k = athleteKey(r);
    const cur = by.get(k);
    if (!cur || compareRows(r, cur) > 0) by.set(k, r);
  });
  return [...by.values()].sort((a,b) => compareRows(b,a));
}
function bubbleCandidates(rows, qualified) {
  const qk = new Set(qualified.map(athleteKey));
  const by = new Map();
  rows
    .filter(r => !qk.has(athleteKey(r)))
    .filter(r => isNum(r.threshold_gap) && r.threshold_gap > 0)
    .forEach(r => {
      const k = athleteKey(r);
      const cur = by.get(k);
      if (!cur || r.threshold_gap < cur.threshold_gap) by.set(k, r);
    });
  return [...by.values()].sort((a,b) => a.threshold_gap - b.threshold_gap).slice(0, 40);
}

// ── Filter pipeline ────────────────────────────────────────────────────────
function rowsForCurrentFilters() {
  if (!state.data) return [];
  const pool       = activePool();
  const years      = yearsInScope();
  const gender     = els.genderFilter.value;
  const discipline = els.disciplineFilter.value;
  const round      = els.roundFilter.value;
  const scope      = els.athleteScope.value;
  const meets      = state.selectedMeetIds;
  const meetsActive = meets.size > 0;

  return state.data.results.filter(r => {
    if (!pool.match(r)) return false;
    if (years.length && !years.includes(r.meet_year)) return false;
    if (gender     && normaliseGender(r.gender) !== gender) return false;
    if (discipline && r.discipline !== discipline) return false;
    if (round !== 'any' && r.round_stage !== round) return false;
    if (meetsActive && !meets.has(r.meet_id)) return false;
    if (scope === 'usaDomestic') {
      if (r.is_usa === false || (r.nat && r.nat !== 'USA' && r.nat !== 'US')) return false;
    } else if (scope === 'knownUsa') {
      if (r.is_usa !== true && r.nat !== 'USA' && r.nat !== 'US') return false;
    } else if (scope === 'knownInternational') {
      if (r.is_usa === true || (r.nat === 'USA' || r.nat === 'US' || !r.nat)) return false;
    }
    return true;
  });
}

function recompute() {
  if (!state.data) return;
  const filtered  = rowsForCurrentFilters();
  const evaluated = filtered.map(evaluateRow);
  const qualified = bestQualified(evaluated);
  const bubble    = bubbleCandidates(evaluated, qualified);

  state.filtered  = filtered;
  state.evaluated = evaluated;
  state.qualified = qualified;
  state.bubble    = bubble;

  render();
}

// ── Rendering ──────────────────────────────────────────────────────────────
function render() {
  renderFilterStrip();
  renderHero();
  renderFunnel();
  renderEventHeatmap();
  renderScoreHistogram();
  renderSourceImpact();
  renderBreakdown();
  renderQualifiedTable();
  renderBubbleTable();
  renderDecisionZone();
  renderScenarioStrip();
  renderEnhancements();
}

function renderFunnel() {
  const target = $('funnel');
  if (!target) return;
  const total = state.data.results.length;
  const filtered = state.filtered.length;
  const passScore = state.evaluated.filter(r =>
    isNum(r.analysis_score) && isNum(r.threshold_used) && r.analysis_score >= r.threshold_used
  ).length;
  const passBoth = state.evaluated.filter(r => {
    const scoreOK = isNum(r.analysis_score) && isNum(r.threshold_used) && r.analysis_score >= r.threshold_used;
    const ddOK = r.dd_status === 'pass' || r.dd_status === 'ignored' || r.dd_status === 'unknownPass';
    return scoreOK && ddOK;
  }).length;
  const final = state.qualified.length;
  const stages = [
    { label: 'All results',          count: total,    final: false },
    { label: 'After event filters',  count: filtered, final: false },
    { label: 'Met score threshold',  count: passScore, final: false },
    { label: 'Met score + DD',       count: passBoth, final: false },
    { label: 'Qualified athletes',   count: final,    final: true  },
  ];
  const max = stages[0].count || 1;
  target.innerHTML = stages.map(s => {
    const widthPct = max > 0 ? (s.count / max * 100) : 0;
    const overallPct = total > 0 ? (s.count / total * 100).toFixed(1) : '0';
    return `
      <div class="funnel-row ${s.final ? 'stage-final' : ''}">
        <div class="label">${esc(s.label)}</div>
        <div class="bar"><div class="bar-fill" style="width:${Math.max(widthPct, 4).toFixed(1)}%">${s.count.toLocaleString()}</div></div>
        <div class="count">${s.count.toLocaleString()}</div>
        <div class="pct">${overallPct}% of all</div>
      </div>
    `;
  }).join('');
}

function renderEventHeatmap() {
  const target = $('eventHeatmap');
  if (!target) return;
  if (!state.qualified.length) {
    target.innerHTML = '<div class="source-impact-empty">No qualifying results to chart.</div>';
    return;
  }
  // Year × Discipline matrix of qualifying counts
  const yearSet = new Set();
  const discSet = new Set();
  const matrix = new Map();
  for (const r of state.qualified) {
    const y = r.meet_year || '—';
    const d = r.discipline || '—';
    yearSet.add(y);
    discSet.add(d);
    const k = `${y}::${d}`;
    matrix.set(k, (matrix.get(k) || 0) + 1);
  }
  const years = [...yearSet].sort((a,b) => String(b).localeCompare(String(a)));
  // Stable discipline order
  const discOrder = ['1m','3m','Platform','10m','Synchro 3m','Synchro 10m'];
  const discs = discOrder.filter(d => discSet.has(d)).concat([...discSet].filter(d => !discOrder.includes(d)).sort());
  const max = Math.max(...[...matrix.values()], 1);
  const cols = ['80px', ...discs.map(() => 'minmax(60px, 1fr)')].join(' ');
  let html = `<div class="cs-heatmap-grid" style="grid-template-columns: ${cols}">`;
  html += `<div class="cs-heatmap-cell head"></div>`;
  for (const d of discs) html += `<div class="cs-heatmap-cell head">${esc(d)}</div>`;
  for (const y of years) {
    html += `<div class="cs-heatmap-cell row-label">${esc(String(y))}</div>`;
    for (const d of discs) {
      const k = `${y}::${d}`;
      const n = matrix.get(k) || 0;
      const intensity = max > 0 ? n / max : 0;
      let bg = 'var(--surface-2)';
      let color = 'var(--ink-4)';
      if (n > 0) {
        bg = `rgba(23,31,105,${(0.10 + 0.70 * intensity).toFixed(2)})`;
        color = intensity > 0.5 ? 'rgba(255,255,255,.95)' : 'var(--ink)';
      }
      const cls = n > 0 ? 'data' : 'data zero';
      html += `<div class="cs-heatmap-cell ${cls}" style="background:${bg};color:${color}">${n || '·'}</div>`;
    }
  }
  html += '</div>';
  target.innerHTML = html;
}

function renderScoreHistogram() {
  const target = $('scoreHistogram');
  if (!target) return;
  const scored = state.evaluated.filter(r => isNum(r.analysis_score));
  if (!scored.length) { target.innerHTML = '<div class="source-impact-empty">No scored results.</div>'; return; }
  const threshold = scored.find(r => isNum(r.threshold_used))?.threshold_used ?? null;
  const scores = scored.map(r => r.analysis_score);
  const lo = Math.min(...scores), hi = Math.max(...scores);
  const step = (hi - lo) > 120 ? 10 : 5;
  const b0 = Math.floor(lo / step) * step, b1 = Math.floor(hi / step) * step;
  const cats = []; for (let b = b0; b <= b1; b += step) cats.push(b);
  const below = cats.map(() => 0), above = cats.map(() => 0);
  for (const r of scored) {
    const i = Math.min(cats.length - 1, Math.max(0, Math.floor((r.analysis_score - b0) / step)));
    if (isNum(threshold) && r.analysis_score >= threshold) above[i]++; else below[i]++;
  }
  target.innerHTML = '<div id="histChart" class="usad-chart" style="height:240px"></div>';
  if (!window.echarts || !window.USAD.charts) return;
  const { colors: C, MONO } = USAD.charts;
  const marks = [];
  if (isNum(threshold)) marks.push({ xAxis: (threshold - b0) / step - 0.5, lineStyle: { color: C.red, width: 1.5 }, label: { formatter: `standard ${Math.round(threshold)}`, position: 'insideEndTop', rotate: 0, distance: [6, 4], fontFamily: MONO, fontSize: 11, color: C.red, backgroundColor: 'rgba(255,255,255,.9)', padding: [2, 4] } });
  USAD.charts.mount(target.firstChild, {
    grid: { left: 40, right: 16, top: 30, bottom: 34 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: p => `<b style="font-family:${MONO}">${p[0].name}–${+p[0].name + step}</b><br>${p.map(x => `${x.seriesName}: <b>${x.value}</b>`).join('<br>')}` },
    xAxis: { type: 'category', data: cats, axisLabel: { interval: Math.max(0, Math.round(cats.length / 8) - 1) } },
    yAxis: { type: 'value', minInterval: 1, name: 'results' },
    series: [
      { name: 'Below standard', type: 'bar', stack: 'h', data: below, itemStyle: { color: C.pool } },
      { name: 'At or above', type: 'bar', stack: 'h', data: above, itemStyle: { color: C.good }, markLine: { symbol: 'none', silent: true, animation: false, data: marks } },
    ],
  }, { filename: 'score-distribution' });
}

function renderBreakdown() {
  const target = $('breakdownContent');
  if (!target) return;
  if (!state.qualified.length) {
    target.innerHTML = '<div class="source-impact-empty">No qualifying results to break down.</div>';
    return;
  }
  // Group by year, then by discipline
  const byYear = new Map();
  for (const r of state.qualified) {
    const y = r.meet_year || '—';
    if (!byYear.has(y)) byYear.set(y, { total: 0, byDisc: new Map() });
    const slot = byYear.get(y);
    slot.total++;
    const d = r.discipline || '—';
    slot.byDisc.set(d, (slot.byDisc.get(d) || 0) + 1);
  }
  const years = [...byYear.keys()].sort((a,b) => String(b).localeCompare(String(a)));
  const max = Math.max(...[...byYear.values()].map(v => v.total));
  target.innerHTML = years.map(y => {
    const slot = byYear.get(y);
    const discList = [...slot.byDisc.entries()]
      .sort((a,b) => b[1] - a[1])
      .map(([d, n]) => `${esc(d)} <em>${n}</em>`)
      .join(' · ');
    return `
      <div class="source-impact-row">
        <div class="name">${esc(String(y))}<br><span style="font-size:11px;color:var(--ink-4)">${discList}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${(slot.total/max*100).toFixed(1)}%"></div></div>
        <div class="count">${slot.total}</div>
      </div>
    `;
  }).join('');
}

function renderFilterStrip() {
  const presetLabels = {
    winterEligibility: 'Winter Eligibility',
    winterQualifier:   'Winter Qualifier',
    nationalQualifier: 'Nationals Qualifier',
    custom:            'Custom',
  };
  $('chipPool').textContent       = activePool().shortLabel;
  $('chipYear').textContent       = yearsLabel();
  $('chipPreset').textContent     = presetLabels[els.criteriaPreset.value] || '—';
  $('chipGender').textContent     = els.genderFilter.value || '—';
  $('chipDiscipline').textContent = els.disciplineFilter.value || '—';
  $('chipRound').textContent      = els.roundFilter.value === 'any' ? 'Any' : els.roundFilter.value;
  const basisLabels = {
    ncaaWomen5Category: 'NCAA 5-cat',
    championshipPanel:  'Championship-panel restated',
    phaseOrStandalone:  'Non-cumulative',
    posted:             'Posted',
    phasePreferred:     'Phase preferred',
  };
  $('chipBasis').textContent = basisLabels[els.scoreMode.value] || els.scoreMode.value;
  $('chipScore').textContent = els.scoreThreshold.value || '—';
  $('chipDd').textContent    = els.ddThreshold.value || '—';
  const tn = num(els.topN.value);
  $('chipTopN').textContent  = (tn && tn > 0) ? tn : '—';
  const totalMeets = state.meetsById.size;
  const selMeets   = state.selectedMeetIds.size;
  $('chipMeets').textContent = (selMeets && selMeets < totalMeets)
    ? `${selMeets} of ${totalMeets}` : `All ${totalMeets}`;

  // Toggle "active" class on chips that constrain results
  const toggleActive = (id, condition) => {
    const el = $(id);
    if (!el) return;
    el.classList.toggle('active', !!condition);
  };
  toggleActive('chipRoundWrap',  els.roundFilter.value !== 'any');
  toggleActive('chipScoreWrap',  !!els.scoreThreshold.value);
  toggleActive('chipDdWrap',     !!els.ddThreshold.value && els.ddMode.value !== 'ignore');
  toggleActive('chipTopNWrap',   tn && tn > 0);
  toggleActive('chipMeetsWrap',  selMeets && selMeets < totalMeets);
}

function renderHero() {
  $('heroQualified').textContent = fmtInt(state.qualified.length);
  $('heroBubble').textContent    = fmtInt(state.bubble.length);

  const scores = state.qualified.map(r => r.analysis_score).filter(isNum);
  const dds    = state.qualified.map(r => r.dd_total_used).filter(isNum);
  $('heroAvgScore').textContent = scores.length
    ? fmtScore(scores.reduce((a,b) => a+b, 0) / scores.length) : '—';
  $('heroAvgDd').textContent = dds.length
    ? fmtDd(dds.reduce((a,b) => a+b, 0) / dds.length) : '—';
}

function renderSourceImpact() {
  const target = $('sourceImpact');
  if (!state.qualified.length) {
    target.innerHTML = '<div class="source-impact-empty">No qualifying results in the current scenario.</div>';
    return;
  }
  const by = new Map();
  for (const r of state.qualified) {
    const key = r.source_name || r.meet_name || 'Unknown source';
    by.set(key, (by.get(key) || 0) + 1);
  }
  const rows = [...by.entries()].sort((a,b) => b[1] - a[1]);
  const max = rows[0][1];
  target.innerHTML = rows.map(([name, count]) => `
    <div class="source-impact-row">
      <div class="name" title="${esc(name)}">${esc(name)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(count/max*100).toFixed(1)}%"></div></div>
      <div class="count">${count}</div>
    </div>
  `).join('');
}

function ddStatusLabel(status) {
  return ({
    pass: 'Pass', fail: 'Fail',
    ignored: 'Ignored', notApplicable: 'N/A',
    unknownPass: 'Unknown (ok)', unknownFail: 'Unknown (fail)'
  })[status] || status;
}

function rowCellsForQualified(r, i) {
  return `
    <tr class="row-clickable" data-index="${i}" tabindex="0">
      <td>${esc(r.diver_name)}</td>
      <td>${esc(r.team_name || r.nat || '')}</td>
      <td>${esc(r.meet_name)}</td>
      <td>${esc(r.round_stage)}</td>
      <td class="num">${isNum(r.place) ? r.place : '—'}</td>
      <td class="num">${fmtScore(r.analysis_score)}</td>
      <td class="num">${fmtScore(r.threshold_used)}</td>
      <td>${esc(r.score_basis)}</td>
      <td class="num">${fmtDd(r.dd_total_used)}</td>
      <td class="num">${fmtDd(r.dd_minimum_used)}</td>
      <td class="dd-status-${esc(r.dd_status)}">${ddStatusLabel(r.dd_status)}</td>
      <td>${esc(r.reason)}</td>
    </tr>`;
}
function renderQualifiedTable() {
  const tbody = $('qualifiedRows');
  if (!state.qualified.length) {
    tbody.innerHTML = '<tr class="row-empty"><td colspan="12">No athletes qualify under this scenario.</td></tr>';
    return;
  }
  // Apply sort
  const sort = state.qualifiedSort;
  const cmp = (a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;          // nulls last
    if (bv == null) return -1;
    if (typeof av === 'string')
      return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sort.dir === 'asc' ? av - bv : bv - av;
  };
  const sorted = [...state.qualified].sort(cmp).slice(0, 250);
  // Re-key indices for click-to-drill-down lookup
  state.qualifiedRowOrder = sorted;
  tbody.innerHTML = sorted.map((r, i) => rowCellsForQualified(r, i)).join('');
  $('qualifiedSubtitle').textContent =
    `Best qualifying result per athlete · ${state.qualified.length} total`;

  // Update header sort markers
  const head = $('qualifiedTable')?.querySelector('thead');
  if (head) {
    head.querySelectorAll('th.sortable').forEach(th => {
      th.classList.remove('sort-asc','sort-desc');
      if (th.dataset.sort === sort.key) th.classList.add(sort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    });
  }
}

function rowCellsForBubble(r, i) {
  return `
    <tr class="row-clickable" data-bubble-index="${i}" tabindex="0">
      <td>${esc(r.diver_name)}</td>
      <td>${esc(r.team_name || r.nat || '')}</td>
      <td>${esc(r.meet_name)}</td>
      <td>${esc(r.round_stage)}</td>
      <td class="num">${fmtScore(r.analysis_score)}</td>
      <td class="num">${fmtScore(r.threshold_used)}</td>
      <td class="num">${fmtScore(r.threshold_gap)}</td>
      <td class="num">${fmtDd(r.dd_total_used)}</td>
      <td class="num">${fmtDd(r.dd_minimum_used)}</td>
      <td class="dd-status-${esc(r.dd_status)}">${ddStatusLabel(r.dd_status)}</td>
    </tr>`;
}
function renderBubbleTable() {
  const tbody = $('bubbleRows');
  if (!state.bubble.length) {
    tbody.innerHTML = '<tr class="row-empty"><td colspan="10">No bubble athletes under this scenario.</td></tr>';
    return;
  }
  tbody.innerHTML = state.bubble.map((r,i) => rowCellsForBubble(r, i)).join('');
}

function renderScenarioStrip() {
  const active = state.scenarios.find(s => s.id === state.activeScenarioId);
  $('scenarioStripName').textContent = active ? active.name : 'Unsaved scenario';
  const presetLabel = ({
    winterEligibility: 'Winter Eligibility',
    winterQualifier:   'Winter Qualifier',
    nationalQualifier: 'Nationals Qualifier',
    custom:            'Custom',
  })[els.criteriaPreset.value] || '—';
  // The old metrics strip is gone; the same figures live in the KPI row and
  // the filter chips. Keep the preset label for the print/export titles.
  state.presetLabel = presetLabel;
  // Badge the "Who qualifies" tab with the live count so the answer is visible
  // from every view.
  const whoTab = document.querySelector('#ssViews .hp-tab[data-view="who"]');
  if (whoTab) whoTab.innerHTML = `Who qualifies <span class="ss-tab-count">${fmtInt(state.qualified.length)}</span>`;
}

// ── Views (Set the standard / Who qualifies / Evidence / Past seasons) ────
// One screen at a time instead of a 7,500px scroll. Charts measure their
// container when they draw, so switching views re-renders.
const VIEW_KEY = 'usad.standardsStudio.view';
function setView(v, opts = {}) {
  const views = document.querySelectorAll('.ss-view');
  if (![...views].some(el => el.dataset.view === v)) v = 'decide';
  state.view = v;
  views.forEach(el => { el.hidden = el.dataset.view !== v; });
  document.querySelectorAll('#ssViews .hp-tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
  try { localStorage.setItem(VIEW_KEY, v); } catch {}
  if (!opts.silent) {
    history.replaceState(null, '', '#view=' + v);
    if (state.data) recompute();
    const ws = document.getElementById('workspace');
    if (ws) ws.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }
}
// Filter chips are read-outs AND the way in on a phone: tapping one opens the
// controls (drawer on narrow screens) and focuses the matching control.
function initChipTaps() {
  document.querySelectorAll('.filter-chip[data-control]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.control; const ctl = $(id); if (!ctl) return;
      if (window.innerWidth <= 900) {
        document.body.classList.add('ss-drawer-open');
        const btn = $('ssDrawerBtn'), bd = $('ssDrawerBackdrop');
        if (btn) btn.setAttribute('aria-expanded', 'true'); if (bd) bd.hidden = false;
      }
      setTimeout(() => {
        ctl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if (ctl.tagName === 'SELECT' || ctl.tagName === 'INPUT') { ctl.focus(); if (ctl.tagName === 'SELECT' && typeof ctl.showPicker === 'function') { try { ctl.showPicker(); } catch (e) {} } }
        else ctl.click();
        ctl.classList.add('ss-flash'); setTimeout(() => ctl.classList.remove('ss-flash'), 1600);
      }, window.innerWidth <= 900 ? 260 : 0);
    });
  });
}
function initViews() {
  initChipTaps();
  const nav = $('ssViews');
  if (nav) nav.addEventListener('click', (e) => {
    const t = e.target.closest('.hp-tab'); if (!t) return;
    setView(t.dataset.view);
    closeDrawer();
  });
  const fromHash = (location.hash.match(/view=([a-z]+)/) || [])[1];
  let saved = null; try { saved = localStorage.getItem(VIEW_KEY); } catch {}
  setView(fromHash || saved || 'decide', { silent: true });

  // Controls drawer (sidebar) on narrow screens
  const btn = $('ssDrawerBtn'), bd = $('ssDrawerBackdrop');
  if (btn) btn.addEventListener('click', () => {
    const open = document.body.classList.toggle('ss-drawer-open');
    btn.setAttribute('aria-expanded', String(open));
    if (bd) bd.hidden = !open;
  });
  if (bd) bd.addEventListener('click', closeDrawer);
}
function closeDrawer() {
  document.body.classList.remove('ss-drawer-open');
  const btn = $('ssDrawerBtn'), bd = $('ssDrawerBackdrop');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (bd) bd.hidden = true;
}

// ── Filter UI population ───────────────────────────────────────────────────
function populateFilters() {
  // Genders
  const genders = [...new Set(state.data.results.map(r => normaliseGender(r.gender)).filter(Boolean))].sort();
  els.genderFilter.innerHTML = genders.map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
  // Disciplines
  const disciplines = [...new Set(state.data.results.map(r => r.discipline).filter(Boolean))]
    .sort((a, b) => ['1m','3m','Platform'].indexOf(a) - ['1m','3m','Platform'].indexOf(b));
  els.disciplineFilter.innerHTML = disciplines
    .map(d => `<option value="${esc(d)}">${d === 'Platform' ? 'Platform' : d}</option>`).join('');

  populatePoolSelect();
  refreshPoolScope();
}

// Populate the Pool dropdown once (options don't change at runtime).
function populatePoolSelect() {
  if (!els.poolSelect || els.poolSelect.dataset.populated) return;
  els.poolSelect.innerHTML = POOL_ORDER
    .map(id => `<option value="${esc(id)}">${esc(POOLS[id].label)}</option>`).join('');
  els.poolSelect.value = state.pool;
  els.poolSelect.dataset.populated = '1';
}

// Recompute everything that depends on which pool is active: available
// years (and the default single year), the meet lookup scoped to that
// pool, and which presets are offered.
function refreshPoolScope() {
  const pool = activePool();
  if (state.data) updateDataKpis();

  // Years with data in this pool, most recent first.
  const years = [...new Set(
    state.data.results.filter(pool.match).map(r => r.meet_year).filter(isNum)
  )].sort((a, b) => b - a);
  state.availableYears = years;
  if (!state.year || !years.includes(state.year)) state.year = years[0] ?? null;
  if (els.yearSelect) {
    els.yearSelect.innerHTML = years.length
      ? years.map(y => `<option value="${y}">${y}</option>`).join('')
      : '<option value="">No data</option>';
    els.yearSelect.value = state.year ?? '';
  }

  // Presets valid for this pool; force a valid selection.
  if (els.criteriaPreset) {
    const allowed = pool.presets;
    const labels = {
      winterEligibility: 'Winter Nationals eligibility',
      winterQualifier:   'Winter Qualifier advancement',
      nationalQualifier: 'USA Nationals qualifier top 12',
      custom:            'Custom model',
    };
    els.criteriaPreset.innerHTML = allowed.map(p => `<option value="${p}">${esc(labels[p])}</option>`).join('');
    if (!allowed.includes(els.criteriaPreset.value)) els.criteriaPreset.value = allowed[allowed.length - 1];
  }

  rebuildMeetsForScope();
}

// Meet lookup scoped to pool + year — this is the refinement layer under
// the primary pool/year scope, not an independent way to mix pools.
function rebuildMeetsForScope() {
  const pool  = activePool();
  const years = yearsInScope();
  state.meetsById = new Map();
  for (const r of state.data.results) {
    if (!r.meet_id) continue;
    if (!pool.match(r)) continue;
    if (years.length && !years.includes(r.meet_year)) continue;
    const cur = state.meetsById.get(r.meet_id);
    if (cur) cur.count++;
    else state.meetsById.set(r.meet_id, {
      meet_id: r.meet_id,
      name:    r.meet_name || '(unnamed meet)',
      source:  r.source_name || '',
      count:   1,
    });
  }
  // Selected meets that fell out of scope no longer apply.
  for (const id of [...state.selectedMeetIds]) {
    if (!state.meetsById.has(id)) state.selectedMeetIds.delete(id);
  }
  renderMeetPicker();
}

function meetIdsForSources(sourceNames) {
  const names = new Set(sourceNames);
  const out = new Set();
  for (const m of state.meetsById.values()) {
    if (names.has(m.source)) out.add(m.meet_id);
  }
  return out;
}

function renderMeetPicker() {
  const q = ($('meetSearch').value || '').toLowerCase().trim();
  const meets = [...state.meetsById.values()]
    .filter(m => !q || m.name.toLowerCase().includes(q) || (m.source||'').toLowerCase().includes(q))
    .sort((a, b) => sortByName(a.name, b.name));

  $('meetPicker').innerHTML = meets.map(m => `
    <label class="meet-pick">
      <input type="checkbox" value="${esc(m.meet_id)}" ${state.selectedMeetIds.has(m.meet_id) ? 'checked' : ''}>
      <span class="meet-pick-label" title="${esc(m.name)} (${esc(m.source||'unknown source')})">${esc(m.name)}</span>
      <span class="meet-pick-count">${m.count}</span>
    </label>
  `).join('');

  const sel = state.selectedMeetIds.size;
  const tot = state.meetsById.size;
  $('meetPickerHelp').textContent = `${sel || tot} of ${tot} meets ${sel ? 'selected' : 'in scope (no filter)'}.`;
}

// ── Preset application ────────────────────────────────────────────────────
function applyPresetDefaults(initialRun) {
  const preset = els.criteriaPreset.value;
  $('presetNote').textContent = PRESET_NOTES[preset] || '';

  if (preset === 'winterEligibility') {
    els.ruleMode.value   = 'scoreOnly';
    els.roundFilter.value = 'any';
    els.scoreMode.value  = 'phaseOrStandalone';
    els.ddMode.value     = 'ignore';
    // Table 2 is the U.S. citizen list; non-U.S. athletes qualify off a different list.
    if (activePool().crossSource) els.athleteScope.value = 'usaDomestic';
    state.selectedMeetIds = activePool().crossSource
      ? new Set([...state.meetsById.keys()])
      : meetIdsForSources(PRESET_SOURCES.winterEligibility);
  } else if (preset === 'winterQualifier') {
    els.ruleMode.value   = 'topNOrScore';
    els.roundFilter.value = 'Final';
    els.scoreMode.value  = 'phaseOrStandalone';
    els.ddMode.value     = 'ignore';
    state.selectedMeetIds = meetIdsForSources(PRESET_SOURCES.winterQualifier);
  } else if (preset === 'nationalQualifier') {
    els.ruleMode.value   = 'topNOnly';
    els.roundFilter.value = 'Final';
    els.scoreMode.value  = 'posted';
    els.ddMode.value     = 'ignore';
    state.selectedMeetIds = meetIdsForSources(PRESET_SOURCES.nationalQualifier);
  } else if (preset === 'custom' && initialRun) {
    state.selectedMeetIds = new Set([...state.meetsById.keys()]);
  }

  applyEventDefaults();
  renderMeetPicker();
}

function applyEventDefaults() {
  const preset     = els.criteriaPreset.value;
  const gender     = els.genderFilter.value;
  const discipline = els.disciplineFilter.value;

  if (preset === 'nationalQualifier') {
    els.topN.value = 12;
    els.scoreThreshold.value = '';
    els.ddThreshold.value = ddMinimumForSelection(gender, discipline, preset) || '';
  } else if (preset === 'winterQualifier') {
    els.topN.value = 6;
    els.scoreThreshold.value = scoreThresholdForSelection(gender, discipline, poolFamily()) || '';
    els.ddThreshold.value = ddMinimumForSelection(gender, discipline, preset) || '';
  } else if (preset === 'winterEligibility') {
    els.topN.value = 0;
    els.scoreThreshold.value = scoreThresholdForSelection(gender, discipline, poolFamily()) || '';
    els.ddThreshold.value = ddMinimumForSelection(gender, discipline, preset) || '';
  } else if (preset === 'custom') {
    els.scoreThreshold.value = state.thresholdEdited ? els.scoreThreshold.value
      : (scoreThresholdForSelection(gender, discipline, poolFamily()) || '');
    els.ddThreshold.value = state.ddThresholdEdited ? els.ddThreshold.value
      : (ddMinimumForSelection(gender, discipline, preset) || '');
  }
  state.thresholdEdited   = false;
  state.ddThresholdEdited = false;
}

// ── Drill-down ────────────────────────────────────────────────────────────
function openDrilldown(row) {
  $('drilldownTitle').textContent = row.diver_name || '(unnamed athlete)';
  $('drilldownBody').innerHTML = `
    <dl>
      <div class="drilldown-row"><dt>Team</dt><dd>${esc(row.team_name || row.nat || '—')}</dd></div>
      <div class="drilldown-row"><dt>Meet</dt><dd>${esc(row.meet_name)}</dd></div>
      <div class="drilldown-row"><dt>Source</dt><dd>${esc(row.source_name)}</dd></div>
      <div class="drilldown-row"><dt>Round</dt><dd>${esc(row.round_stage)}</dd></div>
      <div class="drilldown-row"><dt>Place</dt><dd>${isNum(row.place) ? row.place : '—'}</dd></div>
      <div class="drilldown-row"><dt>Score</dt><dd>${fmtScore(row.analysis_score)} (${esc(row.score_basis)})</dd></div>
      <div class="drilldown-row"><dt>Score threshold</dt><dd>${fmtScore(row.threshold_used)}</dd></div>
      <div class="drilldown-row"><dt>DD total</dt><dd>${fmtDd(row.dd_total_used)}</dd></div>
      <div class="drilldown-row"><dt>DD minimum</dt><dd>${fmtDd(row.dd_minimum_used)}</dd></div>
      <div class="drilldown-row"><dt>DD status</dt><dd>${ddStatusLabel(row.dd_status)}</dd></div>
      <div class="drilldown-row"><dt>Qualified</dt><dd>${row.qualified ? '<strong style="color:var(--status-direct)">Yes</strong>' : '<strong style="color:var(--status-flag)">No</strong>'}</dd></div>
    </dl>
    <div class="drilldown-reason"><strong>Reason:</strong> ${esc(row.reason)}</div>
    ${pathToQualificationHtml(row)}
  `;
  $('drilldownOverlay').hidden = false;
  $('drilldownPanel').hidden = false;
}
function closeDrilldown() {
  $('drilldownOverlay').hidden = true;
  $('drilldownPanel').hidden = true;
}

// ── Scenarios (localStorage) ──────────────────────────────────────────────
function snapshotScenario() {
  return {
    pool:      state.pool,
    year:      state.year,
    preset:    els.criteriaPreset.value,
    gender:    els.genderFilter.value,
    discipline: els.disciplineFilter.value,
    round:     els.roundFilter.value,
    scoreMode: els.scoreMode.value,
    athleteScope: els.athleteScope.value,
    scoreThreshold: els.scoreThreshold.value,
    ddThreshold:   els.ddThreshold.value,
    topN:          els.topN.value,
    ruleMode:      els.ruleMode.value,
    ddMode:        els.ddMode.value,
    meetIds:       [...state.selectedMeetIds],
  };
}
function applyScenario(snapshot, opts = {}) {
  if (!snapshot) return;
  // Scenarios saved before pool/year scoping existed default to Senior USA
  // at its most recent year — the closest match to the old "everything" scope.
  const isLegacy = !snapshot.pool;
  state.pool = POOLS[snapshot.pool] ? snapshot.pool : 'seniorUsa';
  els.poolSelect.value = state.pool;
  refreshPoolScope(); // repopulates year options + presets for this pool
  state.year = (isNum(snapshot.year) && state.availableYears.includes(snapshot.year))
    ? snapshot.year : state.availableYears[0] ?? null;
  els.yearSelect.value = state.year ?? '';
  rebuildMeetsForScope();

  for (const [k, v] of Object.entries(snapshot)) {
    if (k === 'meetIds') { state.selectedMeetIds = new Set(v); continue; }
    if (k === 'pool' || k === 'year') continue;
    if (els[k]) els[k].value = v;
  }
  $('presetNote').textContent = PRESET_NOTES[els.criteriaPreset.value] || '';
  renderMeetPicker();
  if (isLegacy && !opts.quiet) USAD.toast('Older scenario — verify pool, year, and standard against current criteria.', { kind: 'warn', duration: 6000 });
}

// ── Scenario A/B compare: who swings between two saved standards ──────────
// Evaluates each scenario by snapshot-swap (same engine, zero duplicated
// logic), then restores the workspace exactly as it was.
function evalScenarioHeadless(snapshot) {
  applyScenario(snapshot, { quiet: true });
  const filtered = rowsForCurrentFilters();
  const qualified = bestQualified(filtered.map(evaluateRow));
  const athletes = new Map(qualified.map(r => [athleteKey(r), { name: r.diver_name || 'Unknown', score: scoreForRow(r) }]));
  return {
    count: qualified.length,
    athletes,
    scope: {
      pool: state.pool, poolLabel: (POOLS[state.pool] || {}).label || state.pool, year: state.year,
      gender: els.genderFilter.value, discipline: els.disciplineFilter.value,
      score: els.scoreThreshold.value || '—', dd: els.ddThreshold.value || '—',
      rule: els.ruleMode.value, topN: els.topN.value || '—',
    },
  };
}

// Pure diff — unit-tested. Returns names sorted by score, best first.
function compareQualifiedSets(mapA, mapB) {
  const onlyA = [], onlyB = []; let both = 0;
  for (const [k, v] of mapA) { if (mapB.has(k)) both++; else onlyA.push(v); }
  for (const [k, v] of mapB) { if (!mapA.has(k)) onlyB.push(v); }
  const byScore = (a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity);
  onlyA.sort(byScore); onlyB.sort(byScore);
  return { onlyA, onlyB, both };
}

function populateComparePickers() {
  const a = $('cmpA'), b = $('cmpB');
  if (!a || !b) return;
  const opts = state.scenarios.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  const keepA = a.value, keepB = b.value;
  a.innerHTML = opts; b.innerHTML = opts;
  if (state.scenarios.length >= 2) {
    a.value = state.scenarios.some(s => s.id === keepA) ? keepA : (state.activeScenarioId || state.scenarios[0].id);
    b.value = state.scenarios.some(s => s.id === keepB) && keepB !== a.value ? keepB
      : (state.scenarios.find(s => s.id !== a.value) || state.scenarios[0]).id;
  }
  if (state.scenarios.length < 2) {
    $('cmpResult').innerHTML = '<div class="cmp-note">Save at least two scenarios (sidebar → Scenario Manager) to compare them here.</div>';
  }
}

function cmpChips(list, cls) {
  if (!list.length) return '<span class="cmp-none">none</span>';
  const shown = list.slice(0, 30).map(v => `<span class="dz-name ${cls}">${esc(v.name)} <em>${fmt1(v.score)}</em></span>`).join('');
  return shown + (list.length > 30 ? `<span class="dz-more">+${list.length - 30} more</span>` : '');
}

async function runScenarioCompare() {
  const out = $('cmpResult');
  const a = scenarioById($('cmpA').value), b = scenarioById($('cmpB').value);
  if (!a || !b) { out.innerHTML = '<div class="cmp-note">Pick two saved scenarios first.</div>'; return; }
  if (a.id === b.id) { out.innerHTML = '<div class="cmp-note">Pick two different scenarios.</div>'; return; }
  try {
    await ensurePoolLoaded(a.snapshot.pool || 'seniorUsa');
    await ensurePoolLoaded(b.snapshot.pool || 'seniorUsa');
  } catch (e) { out.innerHTML = `<div class="cmp-note">Could not load the data for one of these scenarios: ${esc(e.message || e)}</div>`; return; }
  const original = snapshotScenario();
  let ra, rb;
  try {
    ra = evalScenarioHeadless(a.snapshot);
    rb = evalScenarioHeadless(b.snapshot);
  } finally {
    applyScenario(original, { quiet: true });
    recompute();
  }
  const diff = compareQualifiedSets(ra.athletes, rb.athletes);
  const crossScope = ra.scope.pool !== rb.scope.pool || ra.scope.year !== rb.scope.year;
  const scopeLine = (s) => `${esc(s.poolLabel)} · ${esc(String(s.year ?? '—'))} · ${esc(s.gender)} ${esc(s.discipline)} · score ≥ ${esc(s.score)} · DD ≥ ${esc(s.dd)}`;
  out.innerHTML = `
    ${crossScope ? '<div class="cmp-warn">These scenarios use different pools or years — athlete lists come from different fields and the counts are not directly comparable.</div>' : ''}
    <div class="cmp-grid">
      <div class="cmp-side cmp-side-a">
        <div class="cmp-side-name">A · ${esc(a.name)}</div>
        <div class="cmp-side-scope">${scopeLine(ra.scope)}</div>
        <div class="cmp-side-count">${ra.count} <span>qualify</span></div>
      </div>
      <div class="cmp-side cmp-side-b">
        <div class="cmp-side-name">B · ${esc(b.name)}</div>
        <div class="cmp-side-scope">${scopeLine(rb.scope)}</div>
        <div class="cmp-side-count">${rb.count} <span>qualify</span></div>
      </div>
    </div>
    <div class="cmp-both">In both: <b>${diff.both}</b> athlete${diff.both === 1 ? '' : 's'}</div>
    <div class="cmp-only"><div class="cmp-only-h cmp-only-h-a">Only under A (${diff.onlyA.length})</div><div class="cmp-chipwrap">${cmpChips(diff.onlyA, 'cmp-a')}</div></div>
    <div class="cmp-only"><div class="cmp-only-h cmp-only-h-b">Only under B (${diff.onlyB.length})</div><div class="cmp-chipwrap">${cmpChips(diff.onlyB, 'cmp-b')}</div></div>
    <div class="cmp-foot">Each chip shows the athlete's best score under that scenario's settings. The workspace above is untouched — comparing never changes your current setup.</div>`;
}

function loadScenarios() {
  state.scenarios = localGet(SCENARIO_STORE_KEY, []);
  refreshScenarioSelect();
}
function persistScenarios() { localSet(SCENARIO_STORE_KEY, state.scenarios); }

// ── Shared sync (GitHub-backed, offline-first) ────────────────────────────
function setScenarioStatus(msg, isError) {
  const el = $('scenarioSyncStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('sync-error', !!isError);
}
function scenarioById(id) { return state.scenarios.find(s => s.id === id); }

async function pushScenario(sc) {
  if (!sc) return;
  const Sync = window.CriteriaScenarioSync;
  if (!Sync || !Sync.hasToken()) {
    sc.pendingSync = true; persistScenarios(); refreshScenarioSelect();
    setScenarioStatus('Saved on this device — sharing is not configured.', true);
    return;
  }
  try {
    setScenarioStatus('Sharing scenario with all staff…');
    await Sync.save(sc);
    sc.pendingSync = false;
    persistScenarios(); refreshScenarioSelect();
    setScenarioStatus(`Shared "${sc.name}" with all staff.`);
  } catch (e) {
    sc.pendingSync = true;
    persistScenarios(); refreshScenarioSelect();
    setScenarioStatus('Saved on this device — could not reach the shared library. Will retry.', true);
  }
}

let _scenarioSyncing = false;
async function syncScenarios(opts) {
  opts = opts || {};
  const Sync = window.CriteriaScenarioSync;
  if (!Sync || _scenarioSyncing) return;
  _scenarioSyncing = true;
  setScenarioStatus(opts.manual ? 'Checking shared library…' : 'Syncing shared scenarios…');
  try {
    const remote = await Sync.loadAll();
    const remoteIds = new Set((remote || []).map(r => r && r.id).filter(Boolean));
    const byId = new Map();
    state.scenarios.forEach(s => { if (s && s.id) byId.set(s.id, s); });
    let added = 0, updated = 0;
    (remote || []).forEach(r => {
      if (!r || !r.id) return;
      const local = byId.get(r.id);
      if (!local) { byId.set(r.id, r); added++; }
      else if (!local.pendingSync && String(r.updated_at || '') > String(local.updated_at || '')) {
        byId.set(r.id, r); updated++;
      }
    });
    state.scenarios = [...byId.values()];
    persistScenarios();
    refreshScenarioSelect();
    // Share anything that exists only locally or is awaiting push (reconnect case)
    const toPush = state.scenarios.filter(s => s.pendingSync || !remoteIds.has(s.id));
    for (const sc of toPush) { try { await Sync.save(sc); sc.pendingSync = false; } catch (e) {} }
    if (toPush.length) { persistScenarios(); refreshScenarioSelect(); }
    const shared = (remote || []).length;
    if (added || updated) setScenarioStatus(`Shared library updated: ${added} added, ${updated} updated.`);
    else setScenarioStatus(`Shared with all staff${shared ? ` · ${shared} saved` : ''}. Auto-syncs every 45s.`);
  } catch (e) {
    setScenarioStatus('Could not reach the shared library. Showing scenarios saved on this device.', true);
  } finally {
    _scenarioSyncing = false;
  }
}
function refreshScenarioSelect() {
  const sel = els.scenarioSelect;
  sel.innerHTML =
    '<option value="">— Select scenario —</option>' +
    state.scenarios
      .slice()
      .sort((a,b) => sortByName(a.name, b.name))
      .map(s => `<option value="${esc(s.id)}" ${s.id === state.activeScenarioId ? 'selected' : ''}>${esc(s.name)}${s.pendingSync ? ' • not synced' : ''}</option>`)
      .join('');
}
async function scenarioCreate() {
  const name = await USAD.modal.prompt({
    title: 'Create scenario',
    body:  'Give this scenario a descriptive name.',
    placeholder: 'e.g. Winter 2026 — Women Platform',
    confirmLabel: 'Create',
  });
  if (!name) return;
  const id = 'sc-' + Math.random().toString(36).slice(2, 10);
  state.scenarios.push({ id, name, snapshot: snapshotScenario(), updated_at: new Date().toISOString() });
  state.activeScenarioId = id;
  persistScenarios();
  refreshScenarioSelect();
  els.scenarioName.value = name;
  USAD.toast(`Created "${name}"`, { kind: 'success' });
  renderScenarioStrip();
  await pushScenario(scenarioById(id));
}
async function scenarioSave() {
  if (!state.activeScenarioId) return scenarioCreate();
  const sc = state.scenarios.find(s => s.id === state.activeScenarioId);
  if (!sc) return;
  sc.snapshot = snapshotScenario();
  sc.updated_at = new Date().toISOString();
  if (els.scenarioName.value && els.scenarioName.value !== sc.name) sc.name = els.scenarioName.value;
  persistScenarios();
  refreshScenarioSelect();
  USAD.toast(`Saved "${sc.name}"`, { kind: 'success' });
  renderScenarioStrip();
  await pushScenario(sc);
}
async function scenarioDuplicate() {
  if (!state.activeScenarioId) { USAD.toast('Nothing to duplicate yet.', { kind: 'warn' }); return; }
  const src = state.scenarios.find(s => s.id === state.activeScenarioId);
  if (!src) return;
  const name = await USAD.modal.prompt({
    title: 'Duplicate scenario',
    body:  'Name for the duplicate:',
    defaultValue: src.name + ' (copy)',
    confirmLabel: 'Duplicate',
  });
  if (!name) return;
  const id = 'sc-' + Math.random().toString(36).slice(2, 10);
  state.scenarios.push({
    id, name,
    snapshot: JSON.parse(JSON.stringify(src.snapshot)),
    updated_at: new Date().toISOString(),
  });
  state.activeScenarioId = id;
  persistScenarios();
  refreshScenarioSelect();
  els.scenarioName.value = name;
  USAD.toast(`Created "${name}"`, { kind: 'success' });
  await pushScenario(scenarioById(id));
}
async function scenarioRename() {
  if (!state.activeScenarioId) return;
  const sc = state.scenarios.find(s => s.id === state.activeScenarioId);
  if (!sc) return;
  const name = await USAD.modal.prompt({
    title: 'Rename scenario',
    defaultValue: sc.name,
    confirmLabel: 'Rename',
  });
  if (!name) return;
  sc.name = name;
  sc.updated_at = new Date().toISOString();
  persistScenarios();
  refreshScenarioSelect();
  els.scenarioName.value = name;
  renderScenarioStrip();
  await pushScenario(sc);
}
async function scenarioLoad() {
  const id = els.scenarioSelect.value;
  if (!id) { USAD.toast('Pick a scenario first.', { kind: 'warn' }); return; }
  const sc = state.scenarios.find(s => s.id === id);
  if (!sc) return;
  try { await ensurePoolLoaded(sc.snapshot.pool || 'seniorUsa'); }
  catch (e) { USAD.toast('Could not load that pool: ' + (e.message || e), { kind: 'error', duration: 6000 }); return; }
  state.activeScenarioId = id;
  els.scenarioName.value = sc.name;
  applyScenario(sc.snapshot);
  USAD.toast(`Loaded "${sc.name}"`);
  recompute();
}
async function scenarioDelete() {
  if (!state.activeScenarioId) return;
  const sc = state.scenarios.find(s => s.id === state.activeScenarioId);
  if (!sc) return;
  const ok = await USAD.modal.confirm({
    title: 'Delete scenario',
    body:  `Delete "${sc.name}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!ok) return;
  const delId = state.activeScenarioId;
  state.scenarios = state.scenarios.filter(s => s.id !== state.activeScenarioId);
  state.activeScenarioId = null;
  els.scenarioName.value = '';
  persistScenarios();
  refreshScenarioSelect();
  USAD.toast('Scenario deleted', { kind: 'success' });
  renderScenarioStrip();
  if (window.CriteriaScenarioSync && window.CriteriaScenarioSync.hasToken()) {
    try { await window.CriteriaScenarioSync.remove(delId); setScenarioStatus('Removed from the shared library.'); }
    catch (e) { setScenarioStatus('Deleted locally — could not update the shared library.', true); }
  }
}
function scenarioExport() {
  const payload = JSON.stringify({
    schema: 'usad.criteriaSimulator/v2',
    exported_at: new Date().toISOString(),
    scenarios: state.scenarios,
  }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `criteria-scenarios-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  USAD.toast('Exported scenarios JSON', { kind: 'success' });
}
function scenarioImport(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const payload = JSON.parse(reader.result);
      const incoming = payload.scenarios || [];
      if (!Array.isArray(incoming)) throw new Error('Invalid file shape');
      const ok = await USAD.modal.confirm({
        title: 'Import scenarios',
        body:  `Import ${incoming.length} scenarios? Existing scenarios with the same name will be duplicated, not replaced.`,
        confirmLabel: 'Import',
      });
      if (!ok) return;
      for (const sc of incoming) {
        const id = 'sc-' + Math.random().toString(36).slice(2, 10);
        state.scenarios.push({ ...sc, id });
      }
      persistScenarios();
      refreshScenarioSelect();
      USAD.toast(`Imported ${incoming.length} scenarios`, { kind: 'success' });
    } catch (e) {
      USAD.modal.alert({ title: 'Import failed', body: String(e.message || e) });
    }
  };
  reader.readAsText(file);
}


// ── Pool-scoped data loading ───────────────────────────────────────────────
const RESULT_COLS = `meet_id, meet_name, meet_year,
                      competition_family, competition_group,
                      event_id, event_round,
                      round_stage, place, diver_id, diver_name,
                      team_id, team_name, nat,
                      gender, discipline, event_level, age_group,
                      phase_score_from_dives, posted_score,
                      phase_dd_sum, phase_dive_count,
                      is_synchronized,
                      ncaa_women_springboard_5cat_score,
                      ncaa_women_springboard_raw_6_dive_score,
                      ncaa_women_springboard_5cat_dd_sum,
                      ncaa_women_springboard_repeated_category,
                      ncaa_division`;
// SQL mirrors of POOLS[...].match — keep the two in step. The JS match still
// runs on every row, so a looser SQL filter is safe; a tighter one is not.
const SENIOR_USA_GROUPS = `('USA Diving Nationals','USA Diving Nationals Qualifier',
   'USA Diving Winter Nationals','USA Diving Winter Nationals Qualifier',
   'USA Diving Olympic Trials','USA Diving Olympic Trials Qualifier')`;
const POOL_SQL_WHERE = {
  // Senior USA + Junior A/B + World Aquatics (benchmarks) in one payload.
  core: `(competition_family = 'USA Diving' AND competition_group IN ${SENIOR_USA_GROUPS})
      OR (competition_family = 'USA Diving' AND competition_group = 'USA Diving Junior Nationals'
          AND NOT COALESCE(is_synchronized, false)
          AND (age_group IN ('Group A','Group B')
               OR (age_group IS NULL AND (event_round ~ '\\m16-18\\m' OR event_round ~ '\\m14-15\\m'))))
      OR competition_family = 'World Aquatics'`,
  ncaa: `competition_family = 'NCAA'`,
};
const POOL_PAYLOAD = { seniorUsa: ['core'], juniorAB: ['core'], ncaa: ['ncaa'], winterEligibility: ['core', 'ncaa'] };
const loadedPayloads = new Set();
const pendingPayloads = new Map();

// Model 3 columns ride along with every result when hp_models is built:
// the panel's severity and its cohort's championship level. If the schema is
// not there yet the join fails and we load the plain rows.
const RESULT_SQL_JOINED = (where) => `SELECT ${RESULT_COLS.replace(/(^|\n)\s*/g, ' ').trim().split(',').map(c => 'r.' + c.trim()).join(', ')},
         p.severity AS env_severity, c.champ_severity AS env_champ_ref
       FROM core.result_phases r
       LEFT JOIN hp_models.panel_environment p ON p.panel_key = r.meet_id::text || '|' || coalesce(r.event_round,'') || '|' || coalesce(r.round_stage,'')
       LEFT JOIN hp_models.cohort_reference c ON c.component_id = p.component_id
       WHERE ${where.replace(/\b(competition_family|competition_group|is_synchronized|age_group|event_round)\b/g, 'r.$1')}`;
async function loadPoolPayload(key, onProgress) {
  const where = POOL_SQL_WHERE[key];
  try {
    return await USAD.data.load({
      cacheKey: 'criteria-sim-' + key + '-v4',
      versionSql: `SELECT count(*)::text || '|' || coalesce(max(imported_at)::text,'') || '|' || coalesce((SELECT max(built_at)::text FROM hp_models.panel_environment),'') AS v
                   FROM core.result_phases WHERE ${where}`,
      queries: [{ name: 'results', sql: RESULT_SQL_JOINED(where) }],
      onProgress,
    });
  } catch (e) {
    console.warn('[standards] hp_models join unavailable, loading plain results:', e.message);
    state.modelsUnavailable = true;
  }
  return USAD.data.load({
    cacheKey: 'criteria-sim-' + key + '-v3',
    // Version = row count + newest import in this slice: changes when a crawl
    // lands, so the IndexedDB copy refreshes itself. No static fallback —
    // an old file shown as live data is worse than an honest error.
    versionSql: `SELECT count(*)::text || '|' || coalesce(max(imported_at)::text,'') AS v
                 FROM core.result_phases WHERE ${where}`,
    queries: [{ name: 'results', sql: `SELECT ${RESULT_COLS} FROM core.result_phases WHERE ${where}` }],
    onProgress,
  });
}

function absorbPayload(key, raw) {
  const rows = (raw.results || []).map(normaliseRow);
  state.data.results = state.data.results.concat(rows);
  loadedPayloads.add(key);
  // The worse of the two sources wins the badge (neon < cache < cache-stale).
  const rank = { neon: 0, cache: 1, 'cache-stale': 2 };
  if ((rank[raw._source] ?? 3) > (rank[state.data._source] ?? 3)) {
    state.data._source = raw._source; state.data._fetchedAt = raw._fetchedAt;
  }
  if (raw._version) {
    const t = String(raw._version).split('|')[1];
    if (t && (!state.data._newestImport || t > state.data._newestImport)) state.data._newestImport = t;
  }
}

// Make sure the rows for a pool are in memory; NCAA is fetched on first use.
async function ensurePoolLoaded(poolId) {
  const keys = POOL_PAYLOAD[poolId] || ['core'];
  for (const key of keys) await ensurePayloadLoaded(key);
}
async function ensurePayloadLoaded(key) {
  if (loadedPayloads.has(key)) return;
  if (pendingPayloads.has(key)) return pendingPayloads.get(key);
  const p = (async () => {
    const strip = $('loadingPanel');
    if (strip) { strip.hidden = false; strip.classList.add('is-overlay'); }
    try {
      const raw = await loadPoolPayload(key, (m) => { $('loadingText').textContent = m; });
      absorbPayload(key, raw);
      updateDataKpis();
    } finally {
      if (strip) { strip.hidden = true; strip.classList.remove('is-overlay'); }
      pendingPayloads.delete(key);
    }
  })();
  pendingPayloads.set(key, p);
  return p;
}

// Small hp_models tables (Model 4: World conversion + cuts). Loaded once;
// absent until the nightly build has run the first time.
async function loadModelTables() {
  state.models = state.models || {};
  try {
    const [eq, fit, meth] = await Promise.all([
      NEON.query('SELECT * FROM hp_models.world_standard_equiv'),
      NEON.query('SELECT * FROM hp_models.world_conversion_fit'),
      NEON.query('SELECT model, title, method, stats, built_at FROM hp_models.method'),
    ]);
    state.models.equiv = eq.rows; state.models.fit = fit.rows[0] || null; state.models.method = meth.rows;
    state.models.ok = true;
  } catch (e) {
    state.models.ok = false; state.models.error = e.message;
  }
  try { renderWorldEquivalent(); renderThresholdExplorer(); } catch (e) { /* not rendered yet */ }
}
function worldEquivFor(gender, discipline) {
  const m = state.models; if (!m || !m.ok) return null;
  const g = normaliseGender(gender), d = normaliseDiscipline(discipline);
  return (m.equiv || []).find(r => normaliseGender(r.gender) === g && normaliseDiscipline(r.discipline) === d) || null;
}
function renderWorldEquivalent() {
  const host = $('worldEquivBody'); if (!host) return;
  const m = state.models;
  if (!m || !m.ok) { host.innerHTML = `<div class="source-impact-empty">The World conversion model has not been built yet. It builds nightly from the dive sheets; this panel fills itself in once it exists.</div>`; return; }
  if (poolFamily() !== 'usa') { host.innerHTML = '<div class="source-impact-empty">World Aquatics scores are on the Senior USA scale only. Switch to the Senior USA pool to use this.</div>'; return; }
  const eq = worldEquivFor(els.genderFilter.value, els.disciplineFilter.value), fit = m.fit;
  if (!eq || !fit) { host.innerHTML = '<div class="source-impact-empty">No World Aquatics reference events for this event yet.</div>'; return; }
  const curStd = num(els.scoreThreshold.value);
  const n = (v) => isNum(num(v)) ? Math.round(num(v)) : '—';
  const equiv = num(eq.domestic_equiv_final), lo = num(eq.domestic_equiv_final_low), hi = num(eq.domestic_equiv_final_high);
  const gapTxt = isNum(curStd) && isNum(equiv) ? (curStd >= equiv ? `Your standard is <b>${Math.round(curStd - equiv)} above</b> the World-final line.` : `Your standard is <b>${Math.round(equiv - curStd)} below</b> the World-final line.`) : '';
  host.innerHTML = `
    <div class="we-grid">
      <div class="we-tile"><span>World final cut</span><b>${n(eq.cut12_median)}</b><small>median 12th-place prelim score, ${esc(eq.n_events)} World Aquatics event${eq.n_events == 1 ? '' : 's'} 2025–26</small></div>
      <div class="we-tile we-main"><span>Domestic season mean that converts to it</span><b>${n(equiv)}</b><small>range ${n(lo)}–${n(hi)} · World prelim ≈ ${(num(fit.ratio_mean) * 100).toFixed(1)}% of domestic season mean (±${(num(fit.ratio_sd) * 100).toFixed(1)}), ${esc(fit.n)} athlete-seasons</small></div>
      <div class="we-tile"><span>Your current standard</span><b>${isNum(curStd) ? Math.round(curStd) : '—'}</b><small>${gapTxt || 'Set a score standard to compare.'}</small></div>
    </div>
    <div class="we-actions">
      <button class="btn btn-sm" type="button" id="weApply">Set the standard to ${n(equiv)}</button>
      <span class="small">This is the 50% line: half of athletes carrying that season mean would be expected to make the World final, half would not. A season <i>mean</i> is the input, not a single best score.</span>
    </div>`;
  const b = $('weApply'); if (b) b.addEventListener('click', () => { els.scoreThreshold.value = Math.round(equiv); state.thresholdEdited = true; recompute(); });
}

// ── Model 6: simulated totals per athlete ─────────────────────────────────
async function loadSimTable() {
  state.sim = state.sim || {};
  const g = normaliseGender(els.genderFilter.value), d = normaliseDiscipline(els.disciplineFilter.value);
  const key = g + '|' + d;
  if (state.sim.key === key && state.sim.rows) return;
  state.sim.key = key; state.sim.rows = null; state.sim.loading = true;
  try {
    const r = await NEON.query(`SELECT s.diver_id, s.diver_name, s.n_obs, s.list_source, s.list_year, s.list_dd, s.list_json, s.sim_p10, s.sim_p50, s.sim_p90, s.quantiles_json,
                                       s.published_standard, s.p_clear_standard, s.world_equiv, s.p_clear_world_equiv, s.day_sd, s.season_max, a.nat
                                FROM hp_models.sim_athlete s LEFT JOIN analytics.athlete_directory a ON a.canonical_id = s.diver_id
                                WHERE s.gender = $1 AND s.discipline = $2`, [g, d]);
    state.sim.rows = r.rows.map(x => ({ ...x, q: JSON.parse(x.quantiles_json || '[]').map(Number), list: JSON.parse(x.list_json || '[]'),
      sim_p50: num(x.sim_p50), sim_p10: num(x.sim_p10), sim_p90: num(x.sim_p90), list_dd: num(x.list_dd), n_obs: num(x.n_obs) }));
    state.sim.error = null;
  } catch (e) { state.sim.rows = []; state.sim.error = e.message; }
  state.sim.loading = false;
  renderSimPanel();
}
// P(total >= x) from 99 stored quantiles (q[i] = (i+1)th percentile).
function pAtLeast(q, x) {
  if (!q || q.length < 99 || !isNum(x)) return null;
  if (x <= q[0]) return 0.995; if (x > q[98]) return 0.005;
  let i = 0; while (i < 99 && q[i] < x) i++;
  // linear interpolation between percentiles i and i+1
  const lo = q[i - 1], hi = q[i]; const frac = hi > lo ? (x - lo) / (hi - lo) : 0;
  const pct = (i + frac) / 100; return Math.max(0, Math.min(1, 1 - pct));
}
function renderSimPanel() {
  const host = $('simBody'); if (!host) return;
  if (poolFamily() !== 'usa') { host.innerHTML = '<div class="source-impact-empty">Simulated totals are built for the Senior USA pool. Switch pools to use this.</div>'; return; }
  const s = state.sim || {};
  if (s.loading || !s.rows) { host.innerHTML = '<div class="source-impact-empty">Loading the simulation…</div>'; return; }
  if (s.error) { host.innerHTML = `<div class="source-impact-empty">The simulation model has not been built yet (${esc(s.error)}). It builds nightly; this fills in on its own.</div>`; return; }
  const std = num(els.scoreThreshold.value);
  const eq = worldEquivFor(els.genderFilter.value, els.disciplineFilter.value); const weq = eq ? num(eq.domestic_equiv_final) : null;
  // Same athlete-scope rule as the results table (nationality from the athlete directory).
  const scope = els.athleteScope.value;
  const inScopeNat = (nat) => scope === 'all' ? true
    : scope === 'knownInternational' ? (nat && nat !== 'USA' && nat !== 'US')
    : scope === 'knownUsa' ? (nat === 'USA' || nat === 'US')
    : !(nat && nat !== 'USA' && nat !== 'US'); // usaDomestic: USA or unknown
  const rows = s.rows.filter(r => inScopeNat(r.nat)).map(r => ({ ...r, p: pAtLeast(r.q, std), pw: isNum(weq) ? pAtLeast(r.q, weq) : null })).filter(r => r.p != null).sort((a, b) => b.p - a.p);
  if (!rows.length) { host.innerHTML = '<div class="source-impact-empty">No athletes simulated for this event yet.</div>'; return; }
  const likely = rows.filter(r => r.p >= 0.5).length, expected = rows.reduce((a, r) => a + r.p, 0);
  const inScope = new Set(state.qualified.map(r => String(r.diver_id)));
  host.innerHTML = `
    <div class="sim-head">
      <div class="sim-kpi"><span>Clear ${isNum(std) ? Math.round(std) : '—'} more often than not</span><b>${likely}</b><small>of ${rows.length} simulated athletes</small></div>
      <div class="sim-kpi"><span>Expected qualifiers in one competition</span><b>${expected.toFixed(1)}</b><small>sum of each athlete's probability</small></div>
      <div class="sim-kpi"><span>Cleared it once this season</span><b>${state.qualified.length}</b><small>the current "who qualifies" count</small></div>
    </div>
    <div id="simChart" class="usad-chart" style="height:${Math.max(220, Math.min(rows.length, window.innerWidth < 720 ? 12 : 30) * 22 + 70)}px"></div>
    <div class="table-wrap"><table class="data-table sim-table"><thead><tr><th>Athlete</th><th class="num">P(≥ ${isNum(std) ? Math.round(std) : '—'})</th>${isNum(weq) ? `<th class="num">P(≥ ${Math.round(weq)} World)</th>` : ''}<th class="num">Median</th><th class="num">10–90%</th><th class="num">List DD</th><th>List from</th><th class="num">Dives on record</th><th>Qualified once</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td><b>${esc(r.diver_name)}</b></td>
      <td class="num"><span class="hp-badge ${r.p >= 0.75 ? 'good' : r.p >= 0.5 ? 'info' : r.p >= 0.25 ? 'warn' : 'out'}">${Math.round(r.p * 100)}%</span></td>
      ${isNum(weq) ? `<td class="num">${Math.round(r.pw * 100)}%</td>` : ''}
      <td class="num">${fmt1(r.sim_p50)}</td><td class="num">${Math.round(r.sim_p10)}–${Math.round(r.sim_p90)}</td><td class="num">${fmt1(r.list_dd)}</td>
      <td class="small">${esc(r.list_source)}${r.list_year ? ' · ' + esc(r.list_year) : ''}</td><td class="num">${fmtInt(r.n_obs)}${r.n_obs < 30 ? ' <span class="small">thin</span>' : ''}</td>
      <td>${inScope.has(String(r.diver_id)) ? '<span class="hp-badge navy">yes</span>' : '<span class="small">no</span>'}</td></tr>`).join('')}</tbody></table></div>
    <div class="small" style="margin-top:10px">Senior-format list (${rows[0].list.length} optional dives). Each dive is drawn from the athlete's own championship-adjusted record for that dive since ${rows[0].season_max - 2}, blended with the field's record when hers is thin, with a shared good-day/bad-day draw (sd ${esc(rows[0].day_sd)} per dive). "Qualified once" is the current Who-qualifies list. Method: Simulated totals (Model 6).</div>`;
  if (!window.echarts || !window.USAD.charts) return;
  const { colors: C, MONO, UI } = USAD.charts; const narrow = window.innerWidth < 720; const top = rows.slice(0, narrow ? 12 : 30);
  USAD.charts.mount($('simChart'), {
    grid: { left: narrow ? 110 : 150, right: narrow ? 44 : 70, top: 28, bottom: 36 },
    tooltip: { formatter: p => { const r = top[top.length - 1 - p.dataIndex]; return `<b>${esc(r.diver_name)}</b><br>P(≥${Math.round(std)}) <b style="font-family:${MONO}">${Math.round(r.p * 100)}%</b>${isNum(weq) ? ` · P(≥${Math.round(weq)}) ${Math.round(r.pw * 100)}%` : ''}<br>median ${fmt1(r.sim_p50)}, 10–90% ${Math.round(r.sim_p10)}–${Math.round(r.sim_p90)}`; } },
    legend: { top: 0, right: 0, data: ['P(clear the standard)'].concat(isNum(weq) ? ['P(World-final equivalent)'] : []) },
    xAxis: { type: 'value', min: 0, max: 1, axisLabel: { formatter: v => (v * 100).toFixed(0) + '%' }, name: 'probability in one competition', nameLocation: 'middle', nameGap: 24 },
    yAxis: { type: 'category', data: top.map(r => narrow ? r.diver_name.split(' ').slice(-1)[0] : r.diver_name).reverse(), axisLabel: { fontFamily: UI, fontSize: 11.5, color: C.ink2 } },
    series: [
      { name: 'P(clear the standard)', type: 'bar', data: top.map(r => r.p).reverse(), barMaxWidth: 12, itemStyle: { color: (p) => p.value >= 0.5 ? C.navy : C.pool }, label: { show: true, position: 'right', formatter: p => (p.value * 100).toFixed(0) + '%', fontFamily: MONO, fontSize: 10.5, color: C.ink2 } },
      ...(isNum(weq) ? [{ name: 'P(World-final equivalent)', type: 'scatter', data: top.map(r => r.pw).reverse(), symbol: 'diamond', symbolSize: 9, itemStyle: { color: C.warn } }] : []),
      { type: 'line', data: [], markLine: { symbol: 'none', silent: true, animation: false, data: [{ xAxis: 0.5, lineStyle: { color: C.red, width: 1.5 }, label: { formatter: 'coin flip', position: 'insideEndTop', rotate: 0, fontFamily: MONO, fontSize: 11, color: C.red } }] } },
    ],
  }, { filename: 'simulated-clearance' });
}

function updateDataKpis() {
  // Topbar figures describe the active pool, not everything in memory.
  const pool = activePool();
  const rows = state.data.results.filter(pool.match);
  $('kpiMeets').textContent    = fmtInt(new Set(rows.map(r => r.meet_id)).size);
  $('kpiResults').textContent  = fmtInt(rows.length);
  $('kpiAthletes').textContent = fmtInt(new Set(rows.map(r => athleteKey(r))).size);
  const src = state.data._source || '—';
  const label = { neon: 'Live', cache: 'Live (cached)', 'cache-stale': 'Cached copy' }[src] || src;
  const imp = state.data._newestImport ? ' · updated ' + String(state.data._newestImport).slice(0, 10) : '';
  const el = $('kpiSource');
  el.textContent = label + imp;
  el.dataset.source = src === 'cache' ? 'neon' : src;
  el.title = src === 'cache-stale'
    ? 'The database could not be reached; this is the last copy saved in this browser (' + (state.data._fetchedAt || '').slice(0, 16) + ').'
    : 'Results come from the live database' + (state.data._newestImport ? '; newest import ' + state.data._newestImport.slice(0, 16) : '');
}

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function bootstrap() {
  // Gather element refs
  for (const id of [
    'poolSelect','yearSelect',
    'criteriaPreset','genderFilter','disciplineFilter','roundFilter','scoreMode',
    'athleteScope','scoreThreshold','ddThreshold','topN','ruleMode','ddMode',
    'scenarioSelect','scenarioName','scenarioStatus','scenarioImportFile'
  ]) els[id] = $(id);

  // Load data — pool-scoped, never the whole table.
  // core.result_phases is ~400k rows; asking Neon for all of it exceeds the
  // HTTP endpoint's 64 MB response cap, which is what used to push this app
  // onto the stale static fallback. Each pool now has its own query, the
  // Senior USA + Junior A/B + World Aquatics set loads at boot (~18k rows),
  // and NCAA (~70k rows) loads the first time that pool is chosen.
  const onProgress = (msg) => { $('loadingText').textContent = msg; };
  let raw;
  try {
    raw = await loadPoolPayload('core', onProgress);
  } catch (e) {
    $('loadingText').innerHTML = `<span style="color:var(--status-flag)">Could not load results from the database: ${esc(e.message || e)}</span>`;
    USAD.toast('Data load failed', { kind: 'error', duration: 6000 });
    return;
  }
  state.data = { results: [], _source: raw._source, _fetchedAt: raw._fetchedAt, _version: raw._version };
  absorbPayload('core', raw);
  updateDataKpis();

  // Populate filters
  populateFilters();
  loadScenarios();

  // Apply default preset
  applyPresetDefaults(true);

  // Show UI
  $('loadingPanel').hidden = true;
  $('mainContent').hidden  = false;

  // Wire events
  wireEvents();
  initEnhancements();
  initViews();
  loadModelTables();

  // Initial render
  recompute();
}

function wireEvents() {
  // Pool — the primary scope decision. Changing it re-derives everything
  // downstream: available years, the meet list, and which presets apply.
  els.poolSelect.addEventListener('change', async () => {
    state.pool = els.poolSelect.value;
    els.poolSelect.disabled = true;
    try { await ensurePoolLoaded(state.pool); }
    catch (e) { USAD.toast('Could not load that pool: ' + (e.message || e), { kind: 'error', duration: 6000 }); }
    finally { els.poolSelect.disabled = false; }
    refreshPoolScope();
    applyPresetDefaults(true);
    recompute();
  });
  // Year — the second scope decision. One year at a time for the live
  // number; use the backtest panel to see other years without mixing them in.
  els.yearSelect.addEventListener('change', () => {
    const v = num(els.yearSelect.value);
    state.year = isNum(v) ? v : null;
    rebuildMeetsForScope();
    recompute();
  });

  // Filters & thresholds — recompute on change
  ['criteriaPreset'].forEach(id =>
    els[id].addEventListener('change', () => { applyPresetDefaults(false); recompute(); })
  );
  ['genderFilter','disciplineFilter'].forEach(id =>
    els[id].addEventListener('change', () => { applyEventDefaults(); recompute(); })
  );
  ['roundFilter','scoreMode','athleteScope','ruleMode','ddMode'].forEach(id =>
    els[id].addEventListener('change', recompute)
  );
  ['scoreThreshold','ddThreshold','topN'].forEach(id =>
    els[id].addEventListener('input', recompute)
  );
  els.scoreThreshold.addEventListener('input', () => { state.thresholdEdited = true; });
  els.ddThreshold.addEventListener('input',   () => { state.ddThresholdEdited = true; });

  // Meet picker
  $('meetSearch').addEventListener('input', renderMeetPicker);
  $('meetPicker').addEventListener('change', (e) => {
    const cb = e.target;
    if (cb.type !== 'checkbox') return;
    if (cb.checked) state.selectedMeetIds.add(cb.value);
    else state.selectedMeetIds.delete(cb.value);
    $('meetPickerHelp').textContent =
      `${state.selectedMeetIds.size || state.meetsById.size} of ${state.meetsById.size} meets ${state.selectedMeetIds.size ? 'selected' : 'in scope (no filter)'}.`;
    recompute();
  });
  $('meetUseAll').addEventListener('click', () => {
    state.selectedMeetIds = new Set([...state.meetsById.keys()]);
    renderMeetPicker(); recompute();
  });
  $('meetClear').addEventListener('click', () => {
    state.selectedMeetIds = new Set();
    renderMeetPicker(); recompute();
  });

  // Scenario buttons
  const cmpDetails = $('scenarioCompare');
  if (cmpDetails) cmpDetails.addEventListener('toggle', () => { if (cmpDetails.open) populateComparePickers(); });
  const cmpRun = $('cmpRun');
  if (cmpRun) cmpRun.addEventListener('click', runScenarioCompare);
  $('scenarioCreate').addEventListener('click', scenarioCreate);
  $('scenarioSave').addEventListener('click', scenarioSave);
  $('scenarioDuplicate').addEventListener('click', scenarioDuplicate);
  $('scenarioRename').addEventListener('click', scenarioRename);
  $('scenarioLoad').addEventListener('click', scenarioLoad);
  $('scenarioDelete').addEventListener('click', scenarioDelete);
  $('scenarioExport').addEventListener('click', scenarioExport);
  $('scenarioImport').addEventListener('click', () => els.scenarioImportFile.click());
  els.scenarioImportFile.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) scenarioImport(f);
    e.target.value = '';
  });
  $('scenarioResetPreset').addEventListener('click', () => { applyPresetDefaults(false); recompute(); });

  // Drill-down — use the sorted view so clicks always hit the right row
  $('qualifiedRows').addEventListener('click', (e) => {
    const tr = e.target.closest('tr.row-clickable');
    if (!tr) return;
    const i = Number(tr.dataset.index);
    const row = (state.qualifiedRowOrder || state.qualified)[i];
    if (row) openDrilldown(row);
  });
  $('bubbleRows').addEventListener('click', (e) => {
    const tr = e.target.closest('tr.row-clickable');
    if (!tr) return;
    const i = Number(tr.dataset.bubbleIndex);
    if (state.bubble[i]) openDrilldown(state.bubble[i]);
  });
  $('drilldownClose').addEventListener('click', closeDrilldown);
  $('drilldownOverlay').addEventListener('click', closeDrilldown);

  // Sortable qualified-table headers
  const qualTable = $('qualifiedTable');
  if (qualTable) {
    qualTable.querySelector('thead').addEventListener('click', (e) => {
      const th = e.target.closest('th.sortable');
      if (!th) return;
      const key = th.dataset.sort;
      if (state.qualifiedSort.key === key) {
        state.qualifiedSort.dir = state.qualifiedSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.qualifiedSort.key = key;
        state.qualifiedSort.dir = ['diver_name','team_name','meet_name','round_stage'].includes(key) ? 'asc' : 'desc';
      }
      renderQualifiedTable();
    });
  }

  // Copy summary
  $('btnCopySummary').addEventListener('click', async () => {
    const lines = [
      `Criteria Simulator — ${els.criteriaPreset.options[els.criteriaPreset.selectedIndex].text}`,
      `Event: ${els.genderFilter.value} ${els.disciplineFilter.value}`,
      `Round: ${els.roundFilter.value} · Score basis: ${els.scoreMode.value}`,
      `Score threshold: ${els.scoreThreshold.value || '—'}`,
      `DD threshold: ${els.ddThreshold.value || '—'} (${els.ddMode.value})`,
      `Placement cutoff: ${els.topN.value || '—'} (${els.ruleMode.value})`,
      `Qualified: ${state.qualified.length} · Bubble: ${state.bubble.length}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      USAD.toast('Summary copied to clipboard', { kind: 'success' });
    } catch {
      USAD.modal.alert({ title: 'Copy summary', body: lines });
    }
  });

  // ESC closes drilldown
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('drilldownPanel').hidden) closeDrilldown();
  });
}

// ── Enhancement layer (v2 overhaul) ───────────────────────────────────────
// Self-contained additions that reuse the existing scoring engine so nothing
// can drift from the real evaluation. Hooked from render(), openDrilldown(),
// and bootstrap().

function pct(n, d) { return d > 0 ? n / d : null; }

function renderTrustStrip() {
  const inScope = state.filtered || [];
  const total   = state.data ? state.data.results.length : 0;
  $('trustScope').textContent = fmtInt(inScope.length);
  $('trustScopeFoot').textContent = `of ${fmtInt(total)} total`;

  const placeKnown = inScope.filter(r => isNum(r.place)).length;
  $('trustPlace').textContent = fmtPct(pct(placeKnown, inScope.length));

  const basisLabels = {
    ncaaWomen5Category: 'NCAA 5-cat', championshipPanel: 'Championship-panel restated',
    posted: 'Posted', phasePreferred: 'Phase', phaseOrStandalone: 'Non-cumulative',
  };
  $('trustBasis').textContent = basisLabels[els.scoreMode.value] || '—';
  const scored = inScope.filter(r => isNum(scoreForRow(r))).length;
  const cumul  = inScope.filter(r => isNum(r.posted_score) && isNum(r.phase_score) && r.posted_score !== r.phase_score).length;
  $('trustBasisFoot').textContent =
    `${fmtPct(pct(scored, inScope.length))} scored · ${fmtInt(cumul)} cumulative handled`;

  const ddKnown = inScope.filter(r => isNum(r.phase_dd_sum)).length;
  $('trustDd').textContent = fmtPct(pct(ddKnown, inScope.length));

  const ts = $('trustStandards');
  if (ts) ts.textContent = `${activePool().shortLabel} · ${yearsLabel()}`;
  // Published-criteria check: does the active score standard match Table 1 of
  // the 2026 Winter Nationals criteria (amended 10/26/2026) for this event?
  const foot = $('trustStandardsFoot');
  if (foot) {
    const pub = scoreThresholdForSelection(els.genderFilter.value, els.disciplineFilter.value, poolFamily());
    const cur = num(els.scoreThreshold.value);
    const pubDd = ddMinimumForSelection(els.genderFilter.value, els.disciplineFilter.value, 'winterEligibility');
    const curDd = num(els.ddThreshold.value);
    if (!isNum(pub)) { foot.textContent = 'no published standard for this pool'; foot.className = 'cs2-trust-foot'; }
    else if (isNum(cur) && Math.abs(cur - pub) < 0.01 && (!isNum(curDd) || !isNum(pubDd) || Math.abs(curDd - pubDd) < 0.01)) {
      foot.innerHTML = `matches published 2026 Winter Nationals criteria (${pub}${isNum(pubDd) ? ' · DD ' + pubDd : ''}) · <a href="https://www.usadiving.org/2026-winter-national-championships" target="_blank" rel="noopener">source, amended 10/26/2026</a>`;
      foot.className = 'cs2-trust-foot is-ok';
    } else {
      foot.innerHTML = `edited: published is ${pub}${isNum(pubDd) ? ' · DD ' + pubDd : ''}, you are testing ${isNum(cur) ? Math.round(cur) : '—'}${isNum(curDd) ? ' · DD ' + curDd : ''}`;
      foot.className = 'cs2-trust-foot is-edited';
    }
  }
}

function activeStandardFor(gender, discipline) {
  // Mirror how the engine resolves the active standard for an event,
  // scoped to whichever pool is currently active.
  return scoreThresholdForSelection(gender, discipline, poolFamily());
}

function renderStandardAchievement() {
  const target = $('standardAchievement');
  const rows = (state.evaluated || []).filter(r => isNum(r.analysis_score) && isNum(r.threshold_used));
  if (!rows.length) {
    target.innerHTML = '<div class="source-impact-empty">No evaluated scores with a standard set.</div>';
    return;
  }
  const meet = rows.filter(r => r.analysis_score >= r.threshold_used).length;
  const rate = pct(meet, rows.length);
  // Breakdown by competition family
  const fam = new Map();
  for (const r of rows) {
    const k = r.competition_family || 'Other';
    const o = fam.get(k) || { meet: 0, total: 0 };
    o.total++; if (r.analysis_score >= r.threshold_used) o.meet++;
    fam.set(k, o);
  }
  const famRows = [...fam.entries()].sort((a,b) => b[1].total - a[1].total).map(([k,o]) => {
    const w = Math.round((o.meet / o.total) * 100);
    return `<div class="cs2-ach-row">
      <span class="cs2-ach-name">${esc(k)}</span>
      <span class="cs2-ach-bar"><span class="cs2-ach-fill" style="width:${w}%"></span></span>
      <span class="cs2-ach-val">${o.meet}/${o.total} · ${w}%</span>
    </div>`;
  }).join('');
  target.innerHTML = `
    <div class="cs2-ach-head">
      <div class="cs2-ach-big">${fmtPct(rate)}</div>
      <div class="cs2-ach-sub">${fmtInt(meet)} of ${fmtInt(rows.length)} evaluated results clear the standard</div>
    </div>
    ${famRows}`;
}

function renderBubbleWatch() {
  const target = $('bubbleWatch');
  const bub = state.bubble || [];
  if (!bub.length) {
    target.innerHTML = '<div class="source-impact-empty">No athletes below the standard in scope.</div>';
    return;
  }
  const bands = [
    { label: 'Within 2.0', test: g => g <= 2,  cls: 'b-hot' },
    { label: '2.0 – 5.0',  test: g => g > 2 && g <= 5, cls: 'b-warm' },
    { label: '5.0 – 10.0', test: g => g > 5 && g <= 10, cls: 'b-cool' },
    { label: 'Over 10.0',  test: g => g > 10, cls: 'b-far' },
  ];
  const counts = bands.map(b => bub.filter(r => b.test(r.threshold_gap)).length);
  const max = Math.max(1, ...counts);
  const rowsHtml = bands.map((b, i) => `
    <div class="cs2-band-row">
      <span class="cs2-band-name">${b.label}</span>
      <span class="cs2-band-bar"><span class="cs2-band-fill ${b.cls}" style="width:${Math.round((counts[i]/max)*100)}%"></span></span>
      <span class="cs2-band-val">${counts[i]}</span>
    </div>`).join('');
  const closest = bub[0];
  const closeNote = closest
    ? `Closest is <strong>${fmtScore(closest.threshold_gap)}</strong> below — one strong meet away.`
    : '';
  target.innerHTML = `
    <div class="cs2-band-caption">Athletes by gap to the score standard</div>
    ${rowsHtml}
    <div class="cs2-band-foot">${closeNote} Names in the bubble detail below.</div>`;
}

function renderWhatIf() {
  const g = $('wifGender').value;
  const d = $('wifEvent').value;
  const rawV = id => { const v = (($(id) && $(id).value) || '').trim(); return v === '' ? null : num(v); };
  const score = rawV('wifScore');
  const dd    = rawV('wifDd');
  const place = rawV('wifPlace');
  const preset = els.criteriaPreset.value;
  const rule   = els.ruleMode.value;
  const topN   = num(els.topN.value) ?? 0;

  // Published standard for the active pool if one exists; otherwise the
  // custom bar the HPD has typed (this is what makes the what-if work in
  // the Junior pool, where no standard is published).
  let standard = activeStandardFor(g, d);
  if (!isNum(standard)) standard = num(els.scoreThreshold.value);
  const ddMin    = isNum(num(els.ddThreshold.value)) && els.ddMode.value !== 'ignore'
    ? num(els.ddThreshold.value)
    : ddMinimumForSelection(g, d, preset);
  const out = $('wifResult');

  if (!isNum(score) && !isNum(place)) {
    out.className = 'cs2-wif-result';
    out.innerHTML = 'Enter a score to simulate against the active model.';
    return;
  }

  const scorePass = isNum(standard) && isNum(score) && score >= standard;
  const topPass   = topN > 0 && isNum(place) && place <= topN;
  let rulePass = false;
  if (rule === 'scoreOnly')   rulePass = scorePass;
  if (rule === 'topNOnly')    rulePass = topPass;
  if (rule === 'topNOrScore') rulePass = topPass || scorePass;

  // DD only blocks if provided and a minimum exists; unknown DD does not fail here.
  const ddPass = !isNum(ddMin) || !isNum(dd) ? true : dd >= ddMin;
  const qualifies = rulePass && ddPass;

  const lines = [];
  if (isNum(standard)) {
    const gap = score - standard;
    lines.push(`<div class="cs2-wif-line"><span>Score standard (${g} ${d})</span><b>${fmtScore(standard)}</b></div>`);
    lines.push(`<div class="cs2-wif-line"><span>Your score</span><b class="${scorePass ? 'ok' : 'no'}">${fmtScore(score)} ${isNum(score) ? (gap >= 0 ? `(+${fmtScore(gap)})` : `(${fmtScore(gap)})`) : ''}</b></div>`);
  } else {
    lines.push(`<div class="cs2-wif-line"><span>Score standard</span><b>— none set for this event</b></div>`);
  }
  if (topN > 0) {
    lines.push(`<div class="cs2-wif-line"><span>Placement cutoff</span><b>top ${topN}</b></div>`);
    if (isNum(place)) lines.push(`<div class="cs2-wif-line"><span>Your place</span><b class="${topPass ? 'ok' : 'no'}">${place}</b></div>`);
  }
  if (isNum(ddMin)) {
    lines.push(`<div class="cs2-wif-line"><span>DD minimum</span><b>${fmtDd(ddMin)}</b></div>`);
    if (isNum(dd)) {
      const dgap = dd - ddMin;
      lines.push(`<div class="cs2-wif-line"><span>Your DD</span><b class="${ddPass ? 'ok' : 'no'}">${fmtDd(dd)} ${dgap >= 0 ? `(+${fmtDd(dgap)})` : `(${fmtDd(dgap)})`}</b></div>`);
    } else {
      lines.push(`<div class="cs2-wif-line"><span>Your DD</span><b>not entered (not blocking)</b></div>`);
    }
  }

  out.className = 'cs2-wif-result ' + (qualifies ? 'cs2-wif-yes' : 'cs2-wif-no');
  out.innerHTML = `
    <div class="cs2-wif-verdict">${qualifies ? '<i>✓</i> Meets the standard' : '<i>✕</i> Does not meet the standard yet'}</div>
    <div class="cs2-wif-detail">${lines.join('')}</div>`;
}

function standardsTableHtml(title, table, fmt) {
  const events = ['1m','3m','Platform'];
  const head = `<tr><th>${esc(title)}</th>${events.map(e => `<th class="num">${e}</th>`).join('')}</tr>`;
  const body = ['Female','Male'].map(g => {
    const row = table[g] || {};
    return `<tr><td>${g}</td>${events.map(e => `<td class="num">${fmt(row[e])}</td>`).join('')}</tr>`;
  }).join('');
  return `<table class="data-table cs2-std-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function renderStandardsPanel() {
  const body = $('standardsBody');
  if (!body) return;
  // Re-render whenever the pool changes (was previously cached once).
  if (body.dataset.renderedPool === state.pool) return;
  body.dataset.renderedPool = state.pool;
  const f = (v) => isNum(v) ? v : '—';
  const pool = activePool();
  if (pool.id === 'seniorUsa') {
    body.innerHTML = `
      <p class="cs2-std-note">Source: USA Diving published selection criteria for the Senior pool. Confirm these match the current season before use.</p>
      ${standardsTableHtml('Score standard · USA', { Female: WINTER_SCORE_STANDARDS.Female.usa, Male: WINTER_SCORE_STANDARDS.Male.usa }, f)}
      ${standardsTableHtml('DD minimum · Winter', WINTER_DD_MINIMUMS, f)}
      ${standardsTableHtml('DD minimum · Nationals', NATIONAL_DD_MINIMUMS, f)}`;
  } else if (pool.id === 'ncaa') {
    body.innerHTML = `
      <p class="cs2-std-note">Source: USA Diving published selection criteria — NCAA score standards. Confirm these match the current season before use. No DD minimum is published for the NCAA pool in this tool.</p>
      ${standardsTableHtml('Score standard · NCAA', { Female: WINTER_SCORE_STANDARDS.Female.ncaa, Male: WINTER_SCORE_STANDARDS.Male.ncaa }, f)}`;
  } else {
    body.innerHTML = `
      <p class="cs2-std-note">No published score standard or DD minimum is encoded for the Junior A/B pool. The bar here is authored fresh each season — set your own Score and DD values in the sidebar and this tool evaluates the field against them. Nothing is pre-filled, so nothing can be silently wrong.</p>`;
  }
}

function pathToQualificationHtml(row) {
  if (row.qualified) {
    const margin = isNum(row.threshold_gap) ? -row.threshold_gap : null;
    return `<div class="cs2-path cs2-path-ok"><strong>Path:</strong> Qualified${isNum(margin) ? ` with ${fmtScore(margin)} to spare on score` : ''}.</div>`;
  }
  const needs = [];
  if (isNum(row.threshold_gap) && row.threshold_gap > 0)
    needs.push(`+${fmtScore(row.threshold_gap)} on score (to reach ${fmtScore(row.threshold_used)})`);
  if (row.dd_status === 'fail' && isNum(row.dd_minimum_used) && isNum(row.dd_total_used))
    needs.push(`+${fmtDd(row.dd_minimum_used - row.dd_total_used)} DD (to reach ${fmtDd(row.dd_minimum_used)})`);
  const txt = needs.length ? `Needs ${needs.join(' and ')}.` : 'Did not meet the rule on placement.';
  return `<div class="cs2-path cs2-path-no"><strong>Path to qualification:</strong> ${esc(txt)}</div>`;
}

function printReport() {
  const sc = state.scenarios.find(s => s.id === state.activeScenarioId);
  const name = (sc && sc.name) || els.scenarioName.value || 'Criteria report';
  const presetText = els.criteriaPreset.options[els.criteriaPreset.selectedIndex].text;
  const q = state.qualified || [];
  const b = state.bubble || [];
  const win = window.open('', '_blank');
  if (!win) { USAD.toast('Allow pop-ups to print the report.', { kind: 'warn' }); return; }
  const rowHtml = (r) => `<tr><td>${esc(r.diver_name)}</td><td>${esc(r.team_name || r.nat || '')}</td><td>${esc(r.meet_name)}</td><td>${esc(r.round_stage)}</td><td class="n">${isNum(r.place) ? r.place : ''}</td><td class="n">${fmtScore(r.analysis_score)}</td><td class="n">${fmtScore(r.threshold_used)}</td><td>${esc(r.reason)}</td></tr>`;
  const bubHtml = (r) => `<tr><td>${esc(r.diver_name)}</td><td>${esc(r.team_name || r.nat || '')}</td><td class="n">${fmtScore(r.analysis_score)}</td><td class="n">${fmtScore(r.threshold_used)}</td><td class="n">${fmtScore(r.threshold_gap)}</td></tr>`;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0d1117;margin:32px;}
      h1{color:#171f69;font-size:22px;margin:0 0 2px;} h2{color:#171f69;font-size:15px;margin:24px 0 8px;border-bottom:2px solid #171f69;padding-bottom:4px;}
      .meta{color:#5a6a7e;font-size:13px;margin-bottom:16px;}
      .pills span{display:inline-block;background:#eef0f7;border-radius:6px;padding:3px 9px;margin:0 6px 6px 0;font-size:12px;}
      table{border-collapse:collapse;width:100%;font-size:12px;} th,td{border-bottom:1px solid #e4e7ee;padding:5px 8px;text-align:left;} th{color:#171f69;font-weight:600;} td.n,th.n{text-align:right;}
      .foot{margin-top:28px;color:#94a3b8;font-size:11px;}
    </style></head><body>
    <h1>USA Diving — Criteria Report</h1>
    <div class="meta">${esc(name)} · generated ${new Date().toLocaleString()}</div>
    <div class="pills">
      <span>Pool: ${esc(activePool().shortLabel)}</span>
      <span>Year: ${esc(yearsLabel())}</span>
      <span>Model: ${esc(presetText)}</span>
      <span>Event: ${esc(els.genderFilter.value)} ${esc(els.disciplineFilter.value)}</span>
      <span>Round: ${esc(els.roundFilter.value)}</span>
      <span>Score standard: ${esc(els.scoreThreshold.value || '—')}</span>
      <span>DD minimum: ${esc(els.ddThreshold.value || '—')} (${esc(els.ddMode.value)})</span>
      <span>Placement: ${esc(els.topN.value || '—')} (${esc(els.ruleMode.value)})</span>
    </div>
    <h2>Qualified (${q.length})</h2>
    <table><thead><tr><th>Name</th><th>Team</th><th>Meet</th><th>Round</th><th class="n">Place</th><th class="n">Score</th><th class="n">Standard</th><th>Reason</th></tr></thead><tbody>${q.map(rowHtml).join('') || '<tr><td colspan="8">None</td></tr>'}</tbody></table>
    <h2>Bubble — closest below the standard (${b.length})</h2>
    <table><thead><tr><th>Name</th><th>Team</th><th class="n">Score</th><th class="n">Standard</th><th class="n">Gap</th></tr></thead><tbody>${b.slice(0,25).map(bubHtml).join('') || '<tr><td colspan="5">None</td></tr>'}</tbody></table>
    <div class="foot">Standards applied are subject to confirmation against current published USA Diving criteria. Data coverage in scope: ${fmtInt((state.filtered||[]).length)} results.</div>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

// ── Word export — official criteria-document format ────────────────────────
// Structure verified against the published "2026 World Junior Diving
// Championships Trials Eligibility Criteria" (usadiving.org): title block
// with dates + location, intro paragraph, Contested Events, lettered
// eligibility clauses with roman-numeral sub-clauses, then standards.
// Everything the scenario knows is filled in; everything that is policy
// language the HPD must author is marked [CONFIRM] so nothing ships by
// accident. Output is Word-processing HTML saved as .doc, which opens
// directly in Microsoft Word for editing.
function criteriaDocEventScope() {
  const pool = activePool();
  const d = els.disciplineFilter.value;
  const g = els.genderFilter.value;
  const discLabel = { '1m': '1-meter', '3m': '3-meter', 'Platform': 'platform' }[d] || d;
  if (pool.id === 'juniorAB') {
    return `Individual ${discLabel} (${g === 'Male' ? 'Boys' : 'Girls'}, Groups A and B)`;
  }
  return `${g === 'Male' ? 'Men' : 'Women'}'s ${discLabel}`;
}
function criteriaDocRuleSentence() {
  const rule = els.ruleMode.value;
  const topN = num(els.topN.value) ?? 0;
  const score = num(els.scoreThreshold.value);
  const d = els.disciplineFilter.value;
  const discLabel = { '1m': '1-meter', '3m': '3-meter', 'Platform': 'platform' }[d] || d;
  if (rule === 'topNOnly' && topN > 0)
    return `The top ${topN} finishers in each ${discLabel} event will qualify.`;
  if (rule === 'scoreOnly' && isNum(score))
    return `Divers must achieve a score of ${fmtScore(score)} or higher in a ${discLabel} event at an approved qualifying competition.`;
  if (rule === 'topNOrScore' && topN > 0 && isNum(score))
    return `The top ${topN} finishers in each ${discLabel} event will qualify, OR divers may qualify by achieving a score of ${fmtScore(score)} or higher.`;
  return '[CONFIRM — advancement rule: set placement cutoff and/or score standard in the tool before exporting]';
}
function criteriaDocStandardsTable() {
  const pool = activePool();
  const evCols = ['1m', '3m', 'Platform'];
  const th = (t) => `<td style="border:1pt solid #171F69;background:#171F69;color:#FFFFFF;padding:4pt 8pt;font-weight:bold;">${t}</td>`;
  const td = (t) => `<td style="border:1pt solid #9AA3C0;padding:4pt 8pt;">${t}</td>`;
  const scoreRow = (gLabel, table) =>
    `<tr>${td(`<b>${gLabel}</b>`)}${evCols.map(e => td(isNum(table?.[e]) ? table[e] : '[CONFIRM]')).join('')}</tr>`;
  const family = pool.family;
  let scoreTable = '';
  if (family) {
    const src = family === 'ncaa'
      ? { Female: WINTER_SCORE_STANDARDS.Female.ncaa, Male: WINTER_SCORE_STANDARDS.Male.ncaa }
      : { Female: WINTER_SCORE_STANDARDS.Female.usa, Male: WINTER_SCORE_STANDARDS.Male.usa };
    scoreTable = `
      <p style="font-weight:bold;margin:10pt 0 4pt;">Score Standards (${family === 'ncaa' ? 'NCAA' : 'USA Diving'})</p>
      <table style="border-collapse:collapse;font-size:10pt;">
        <tr>${th('')}${evCols.map(e => th(e === 'Platform' ? 'Platform' : e)).join('')}</tr>
        ${scoreRow('Women', src.Female)}
        ${scoreRow('Men', src.Male)}
      </table>`;
  } else {
    const g = els.genderFilter.value, d = els.disciplineFilter.value;
    const score = num(els.scoreThreshold.value);
    scoreTable = `
      <p style="font-weight:bold;margin:10pt 0 4pt;">Score Standard</p>
      <table style="border-collapse:collapse;font-size:10pt;">
        <tr>${th('Event')}${th('Standard')}</tr>
        <tr>${td(`${g === 'Male' ? 'Boys' : 'Girls'} ${d}`)}${td(isNum(score) ? fmtScore(score) : '[CONFIRM]')}</tr>
      </table>
      <p style="font-size:9pt;color:#5A6A7E;margin:4pt 0;">[CONFIRM — extend this table to every group/gender/event this document covers; the tool exports the event currently in scope]</p>`;
  }
  let ddTable = '';
  const ddVal = num(els.ddThreshold.value);
  if (family === 'usa') {
    const src = els.criteriaPreset.value === 'nationalQualifier' ? NATIONAL_DD_MINIMUMS : WINTER_DD_MINIMUMS;
    ddTable = `
      <p style="font-weight:bold;margin:10pt 0 4pt;">Degree of Difficulty Minimums</p>
      <table style="border-collapse:collapse;font-size:10pt;">
        <tr>${th('')}${evCols.map(e => th(e === 'Platform' ? 'Platform' : e)).join('')}</tr>
        ${scoreRow('Women', src.Female)}
        ${scoreRow('Men', src.Male)}
      </table>`;
  } else if (isNum(ddVal) && els.ddMode.value !== 'ignore') {
    ddTable = `
      <p style="font-weight:bold;margin:10pt 0 4pt;">Degree of Difficulty Minimum</p>
      <p style="font-size:10pt;">Divers must present a dive list with a total degree of difficulty of ${fmtDd(ddVal)} or higher. [CONFIRM — per-event DD minimums if this document covers multiple events]</p>`;
  }
  return scoreTable + ddTable;
}
function exportCriteriaDoc() {
  const pool = activePool();
  const year = state.year ?? new Date().getFullYear();
  const sc = state.scenarios.find(s => s.id === state.activeScenarioId);
  const docTitle = (sc && sc.name) || els.scenarioName.value || `${year} [CONFIRM — Event Name] Qualification Criteria`;

  // Approved qualifying events — the meets actually in scope right now.
  const meetsInScope = state.selectedMeetIds.size
    ? [...state.selectedMeetIds].map(id => state.meetsById.get(id)).filter(Boolean)
    : [...state.meetsById.values()];
  const meetItems = meetsInScope
    .sort((a, b) => sortByName(a.name, b.name))
    .map(m => `<li style="margin:2pt 0;">${esc(m.name)}</li>`).join('')
    || '<li>[CONFIRM — list approved qualifying competitions]</li>';

  const qualifiedCount = state.qualified.length;
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(docTitle)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; margin: 1in; }
  h1 { font-size: 16pt; color: #171F69; margin: 0 0 2pt; }
  h2 { font-size: 12pt; color: #171F69; margin: 14pt 0 4pt; }
  .sub { font-size: 11pt; color: #1a1a1a; margin: 0 0 12pt; }
  .confirm { background: #FFF3CD; }
  ol.alpha { list-style-type: upper-alpha; padding-left: 22pt; }
  ol.roman { list-style-type: lower-roman; padding-left: 22pt; }
  li { margin: 4pt 0; }
</style></head>
<body>
  <h1>${esc(docTitle)}</h1>
  <p class="sub">[CONFIRM — competition dates]<br>[CONFIRM — city, state]</p>

  <p>USA Diving will host the ${esc(docTitle)}. <span class="confirm">[CONFIRM — one-paragraph purpose statement: what this event determines, and any downstream event it selects for.]</span></p>

  <h2>Contested Events</h2>
  <p>${esc(criteriaDocEventScope())} <span class="confirm">[CONFIRM — full contested-events list if broader than the event currently in scope]</span></p>

  <h2>Eligibility to Compete</h2>
  <ol class="alpha">
    <li><span class="confirm">[CONFIRM — citizenship / federation clause, e.g. "Must be a U.S. citizen and not have competed for another Federation after {date}."]</span></li>
    <li>Must be a competition athlete member in good standing with USA Diving.</li>
    <li><span class="confirm">[CONFIRM — birth-year / age-group clause if applicable]</span></li>
    <li>Must meet at least one of the following qualification criteria:
      <ol class="roman">
        <li>${esc(criteriaDocRuleSentence())}</li>
        <li><span class="confirm">[CONFIRM — pre-qualified pools: HP Squad tiers, prior champions, National Team, prior international team members, as applicable]</span></li>
        <li><span class="confirm">[CONFIRM — non-displacement language for international athletes / athletes not meeting DD, if applicable]</span></li>
      </ol>
    </li>
    <li><span class="confirm">[CONFIRM — petition policy]</span></li>
  </ol>

  <h2>Qualification Standards</h2>
  ${criteriaDocStandardsTable()}

  <h2>Approved Qualifying Competitions</h2>
  <p style="font-size:10pt;color:#5A6A7E;">As scoped in the authoring tool (${esc(pool.shortLabel)} pool, ${esc(String(year))}):</p>
  <ul>${meetItems}</ul>

  <h2>Additional Information</h2>
  <p><span class="confirm">[CONFIRM — entry deadlines, selection-procedures publication, contact]</span></p>

  <p style="margin-top:22pt;font-size:9pt;color:#5A6A7E;border-top:1pt solid #9AA3C0;padding-top:6pt;">
    DRAFT generated from the USA Diving Standards Studio on ${new Date().toLocaleDateString()} ·
    Scope: ${esc(pool.shortLabel)} pool, ${esc(String(year))} · Under the standards in this draft,
    ${qualifiedCount} athlete${qualifiedCount === 1 ? '' : 's'} in the evaluated ${esc(String(year))} field would have qualified.
    Every highlighted [CONFIRM] item requires High Performance review before publication. This footer should be deleted from the final document.
  </p>
</body></html>`;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${docTitle.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_')}_DRAFT.doc`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  USAD.toast('Criteria draft downloaded — opens in Word. Review every [CONFIRM] item.', { kind: 'success', duration: 6000 });
}

// ── Decision zone: field context + move-the-bar ladder with names ─────────
// Same qualification semantics as qualCountWith, but returns Map(athleteKey →
// {name, best score}) so the ladder can show WHO changes, not just how many.
function qualSetWith(scoreThr, ddMin) {
  const rule = els.ruleMode.value;
  const topN = num(els.topN.value) ?? 0;
  const ddMode = els.ddMode.value;
  const out = new Map();
  for (const r of (state.filtered || [])) {
    const score = scoreForRow(r);
    const scorePass = isNum(scoreThr) && isNum(score) && score >= scoreThr;
    const topPass = topN > 0 && isNum(r.place) && r.place <= topN;
    let rulePass = false;
    if (rule === 'scoreOnly') rulePass = scorePass;
    else if (rule === 'topNOnly') rulePass = topPass;
    else if (rule === 'topNOrScore') rulePass = topPass || scorePass;
    let ddPass;
    const total = r.phase_dd_sum;
    if (ddMode === 'ignore' || !isNum(ddMin)) ddPass = true;
    else if (!isNum(total)) ddPass = (ddMode === 'requireKnown') ? false : true;
    else ddPass = total >= ddMin;
    if (rulePass && ddPass) {
      const k = athleteKey(r);
      const prev = out.get(k);
      if (!prev || (isNum(score) && score > prev.score)) {
        out.set(k, { name: r.diver_name || 'Unknown', score: isNum(score) ? score : -Infinity });
      }
    }
  }
  return out;
}

function fmt1(n) { return isNum(n) ? n.toFixed(1) : '—'; }

function renderDecisionZone() {
  const ctxEl = document.getElementById('dzContext');
  const ladEl = document.getElementById('dzLadder');
  if (!ctxEl || !ladEl) return;

  // Field context: best score per athlete in the evaluated scope
  const best = new Map();
  for (const r of (state.filtered || [])) {
    const s = scoreForRow(r);
    if (!isNum(s)) continue;
    const k = athleteKey(r);
    if (!best.has(k) || s > best.get(k)) best.set(k, s);
  }
  const scores = [...best.values()].sort((a, b) => b - a);
  const n = scores.length;
  const avg = n ? scores.reduce((a, b) => a + b, 0) / n : null;
  const median = n ? (n % 2 ? scores[(n - 1) / 2] : (scores[n / 2 - 1] + scores[n / 2]) / 2) : null;
  const topAvg = (k) => scores.length >= 1 ? scores.slice(0, Math.min(k, scores.length)).reduce((a, b) => a + b, 0) / Math.min(k, scores.length) : null;
  const wb = worldBenchmarks(els.genderFilter.value, els.disciplineFilter.value);

  const tiles = [
    { l: 'Athletes in field', v: String(n), f: 'best score per athlete' },
    { l: 'Field average', v: fmt1(avg), f: 'of best scores' },
    { l: 'Field median', v: fmt1(median), f: 'middle of the field' },
    { l: 'Top-8 average', v: fmt1(topAvg(8)), f: 'a finals-strength read' },
    { l: 'Top-12 average', v: fmt1(topAvg(12)), f: 'a semis-strength read' },
  ];
  if (wb && isNum(wb.finalist)) tiles.push({ l: 'World Aquatics finalist', v: fmt1(wb.finalist), f: 'median finalist score', intl: true });
  if (wb && isNum(wb.medalist)) tiles.push({ l: 'World Aquatics medalist', v: fmt1(wb.medalist), f: 'median medalist score', intl: true });
  ctxEl.innerHTML = tiles.map(t =>
    `<div class="dz-tile ${t.intl ? 'dz-tile-intl' : ''}"><span class="dz-tile-l">${esc(t.l)}</span><b class="dz-tile-v">${esc(t.v)}</b><span class="dz-tile-f">${esc(t.f)}</span></div>`
  ).join('');

  // Move-the-bar ladder: names added (drop) / dropped (raise) vs current standard
  const gender = els.genderFilter.value, discipline = els.disciplineFilter.value;
  const family = poolFamily();
  const curStd = num(els.scoreThreshold.value) ?? scoreThresholdForSelection(gender, discipline, family);
  const curDd = num(els.ddThreshold.value) ?? ddMinimumForSelection(gender, discipline, els.criteriaPreset.value);
  if (!isNum(curStd)) {
    ladEl.innerHTML = '<div class="dz-ladder-empty">Drag the bar above (or set a score standard in the sidebar) to see who each change adds or drops.</div>';
    updateBarSlider(scores, avg, median, wb, null, 0);
    return;
  }
  const baseSet = qualSetWith(curStd, curDd);
  updateBarSlider(scores, avg, median, wb, curStd, baseSet.size);
  const steps = [-15, -10, -5, +5, +10, +15];
  const rows = steps.map(d => {
    const thr = Math.round((curStd + d) * 100) / 100;
    const set = qualSetWith(thr, curDd);
    const changed = [];
    if (d < 0) { for (const [k, v] of set) if (!baseSet.has(k)) changed.push(v); }
    else { for (const [k, v] of baseSet) if (!set.has(k)) changed.push(v); }
    changed.sort((a, b) => b.score - a.score);
    return { d, thr, count: set.size, changed };
  });
  const nameChips = (list, cls) => {
    if (!list.length) return '<span class="dz-noone">no change</span>';
    const shown = list.slice(0, 4).map(v => `<span class="dz-name ${cls}">${esc(v.name)} <em>${fmt1(v.score)}</em></span>`).join('');
    const more = list.length > 4 ? `<span class="dz-more">+${list.length - 4} more</span>` : '';
    return shown + more;
  };
  ladEl.innerHTML = `
    <div class="dz-lad-current">Current standard <b>${fmt1(curStd)}</b> → <b>${baseSet.size}</b> qualify</div>
    ${rows.map(r => `
      <div class="dz-lad-row">
        <span class="dz-lad-thr">${r.d > 0 ? '+' : ''}${r.d} → <b>${fmt1(r.thr)}</b></span>
        <span class="dz-lad-count">${r.count} <em class="${r.count > baseSet.size ? 'up' : r.count < baseSet.size ? 'down' : ''}">${r.count === baseSet.size ? '±0' : (r.count > baseSet.size ? '+' : '') + (r.count - baseSet.size)}</em></span>
        <span class="dz-lad-names">${r.d < 0 ? nameChips(r.changed, 'add') : nameChips(r.changed, 'drop')}</span>
      </div>`).join('')}
    <div class="dz-lad-foot">Below the bar = athletes <b>added</b> if you lower it. Above = athletes <b>dropped</b> if you raise it. DD standard held at ${isNum(curDd) ? fmt1(curDd) : 'n/a'}.</div>
    ${perOptionalFoot(curStd)}`;
}

// In the cross-source pool the bar is one per-optional value; show what it
// means in each source's own total so the HPD can check it against Table 1.
function perOptionalFoot(curStd) {
  if (!activePool().crossSource || !isNum(curStd)) return '';
  const g = normaliseGender(els.genderFilter.value) || 'Female';
  const d = els.disciplineFilter.value;
  const target = usaBasisOptionals(g);
  const po = curStd / target;
  const ncaaOpt = defaultOptionals(g, d, true);
  const jrA = JUNIOR_OPTIONALS[g]?.['Group A'], jrB = JUNIOR_OPTIONALS[g]?.['Group B'];
  const parts = [`USA ${target} opt <b>${fmt1(curStd)}</b>`, `NCAA ${ncaaOpt} opt <b>${fmt1(po * ncaaOpt)}</b>`];
  if (jrA) parts.push(`Junior A ${jrA} opt <b>${fmt1(po * jrA)}</b>`);
  if (jrB) parts.push(`Junior B ${jrB} opt <b>${fmt1(po * jrB)}</b>`);
  const yrs = yearsInScope();
  const noConf = yrs.filter(y => !APPROVED_CONFERENCES[y]);
  const confNote = noConf.length ? ` NCAA conference championships for ${noConf.join(' and ')} are excluded until the HPD approval list is issued.` : '';
  return `<div class="dz-lad-foot"><b>${po.toFixed(2)} per optional</b> · ${parts.join(' · ')}. Scores from every source are restated to the USA basis before they meet the bar.${confNote}</div>`;
}

// ── Drag-the-bar slider: direct manipulation of the score standard ────────
// Writes into els.scoreThreshold and dispatches 'input', so the slider drives
// the exact same pipeline as typing (recompute, chips, scenario dirty state).
let _dzBarWired = false;
let _dzBarDragging = false;
function updateBarSlider(scores, avg, median, wb, curStd, qualCount) {
  const panel = document.getElementById('dzBarPanel');
  const bar = document.getElementById('dzBar');
  if (!panel || !bar) return;
  if (!scores.length) { panel.hidden = true; return; }
  panel.hidden = false;

  // Bounds: pad the field, and make room for benchmarks so their ticks fit
  let lo = Math.min(...scores), hi = Math.max(...scores);
  if (wb && isNum(wb.finalist)) hi = Math.max(hi, wb.finalist);
  if (wb && isNum(wb.medalist)) hi = Math.max(hi, wb.medalist);
  lo = Math.floor((lo - 10) / 5) * 5;
  hi = Math.ceil((hi + 10) / 5) * 5;
  bar.min = lo; bar.max = hi;

  const val = isNum(curStd) ? curStd : median;
  if (!_dzBarDragging) bar.value = val;
  const pct = ((val - lo) / (hi - lo)) * 100;
  bar.style.background = `linear-gradient(90deg, var(--brand-pool) ${pct}%, var(--line) ${pct}%)`;

  document.getElementById('dzBarValue').textContent = isNum(curStd) ? fmt1(curStd) : 'drag to set';
  document.getElementById('dzBarCount').textContent = isNum(curStd) ? String(qualCount) : '—';

  // Reference ticks on the track
  const ticks = [
    { label: 'Field avg', v: avg },
    { label: 'Median', v: median },
    wb && isNum(wb.finalist) ? { label: 'WA finalist', v: wb.finalist, intl: true } : null,
    wb && isNum(wb.medalist) ? { label: 'WA medalist', v: wb.medalist, intl: true } : null,
  ].filter(t => t && isNum(t.v) && t.v >= lo && t.v <= hi).sort((a, b) => a.v - b.v);
  let lastPct = -100, row = 0;
  document.getElementById('dzBarTicks').innerHTML = ticks.map(t => {
    const p = ((t.v - lo) / (hi - lo)) * 100;
    row = (p - lastPct < 9) ? 1 - row : 0; // stagger labels that would collide
    lastPct = p;
    return `<div class="dz-tick ${t.intl ? 'dz-tick-intl' : ''} ${row ? 'dz-tick-row2' : ''}" style="left:${p}%">
      <span class="dz-tick-mark"></span><span class="dz-tick-label">${esc(t.label)} ${fmt1(t.v)}</span></div>`;
  }).join('');

  if (!_dzBarWired) {
    _dzBarWired = true;
    const raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : (f) => setTimeout(f, 16);
    let pending = null;
    const flush = () => {
      if (pending === null) return;
      const v = pending; pending = null;
      els.scoreThreshold.value = String(Math.round(v * 10) / 10);
      els.scoreThreshold.dispatchEvent(new Event('input', { bubbles: true }));
    };
    bar.addEventListener('input', () => {
      _dzBarDragging = true;
      const had = pending !== null;
      pending = Number(bar.value);
      if (!had) raf(flush);
    });
    const release = () => { _dzBarDragging = false; };
    bar.addEventListener('change', release);
    bar.addEventListener('pointerup', release);
    bar.addEventListener('keyup', release);
  }
}

function qualCountWith(scoreThr, ddMin, ddModeOverride) {
  const rule = els.ruleMode.value;
  const topN = num(els.topN.value) ?? 0;
  const ddMode = ddModeOverride || els.ddMode.value;
  const seen = new Set();
  for (const r of (state.filtered || [])) {
    const score = scoreForRow(r);
    const scorePass = isNum(scoreThr) && isNum(score) && score >= scoreThr;
    const topPass = topN > 0 && isNum(r.place) && r.place <= topN;
    let rulePass = false;
    if (rule === 'scoreOnly') rulePass = scorePass;
    else if (rule === 'topNOnly') rulePass = topPass;
    else if (rule === 'topNOrScore') rulePass = topPass || scorePass;
    let ddPass;
    const total = r.phase_dd_sum;
    if (ddMode === 'ignore' || !isNum(ddMin)) ddPass = true;
    else if (!isNum(total)) ddPass = (ddMode === 'requireKnown') ? false : true;
    else ddPass = total >= ddMin;
    if (rulePass && ddPass) seen.add(athleteKey(r));
  }
  return seen.size;
}

function sensLadderHtml(title, rows) {
  const maxC = Math.max(1, ...rows.map(r => r.count));
  const body = rows.map(r => {
    const deltaTxt = r.current ? 'current'
      : (r.delta > 0 ? `+${r.delta}` : r.delta < 0 ? `${r.delta}` : '0');
    const dCls = r.current ? 'cur' : (r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : 'flat');
    return `<div class="cs2-sens-row ${r.current ? 'is-current' : ''}">
      <span class="cs2-sens-th">${esc(r.label)}</span>
      <span class="cs2-sens-bar"><span class="cs2-sens-fill" style="width:${Math.round(r.count / maxC * 100)}%"></span></span>
      <span class="cs2-sens-n">${r.count}</span>
      <span class="cs2-sens-d ${dCls}">${deltaTxt}</span>
    </div>`;
  }).join('');
  return `<div class="cs2-sens-ladder"><div class="cs2-sens-title">${esc(title)}</div>${body}</div>`;
}

function renderSensitivity() {
  const body = $('sensitivityBody');
  if (!body) return;
  const curScore = num(els.scoreThreshold.value);
  const curDd    = num(els.ddThreshold.value);
  const rule     = els.ruleMode.value;
  const ddMode   = els.ddMode.value;
  const baseline = qualCountWith(curScore, curDd);
  const blocks = [];

  if ((rule === 'scoreOnly' || rule === 'topNOrScore') && isNum(curScore)) {
    const rows = [-5, -2.5, 0, 2.5, 5].map(step => {
      const thr = Math.round((curScore + step) * 100) / 100;
      const count = qualCountWith(thr, curDd);
      return { label: `${step > 0 ? '+' : ''}${step} → ${thr}`, count, delta: count - baseline, current: step === 0 };
    });
    blocks.push(sensLadderHtml('If the score standard changes', rows));
  }
  if (ddMode !== 'ignore' && isNum(curDd)) {
    const rows = [-0.2, -0.1, 0, 0.1, 0.2, 0.3].map(step => {
      const m = Math.round((curDd + step) * 100) / 100;
      const count = qualCountWith(curScore, m);
      return { label: `${step > 0 ? '+' : ''}${step.toFixed(1)} → ${m.toFixed(1)}`, count, delta: count - baseline, current: Math.abs(step) < 1e-9 };
    });
    blocks.push(sensLadderHtml('If the DD minimum changes', rows));
  }

  const head = `<div class="cs2-sens-baseline"><b>${baseline}</b> athletes qualify at the current standard. Each step shows how the count moves.</div>`;
  body.innerHTML = head + (blocks.length
    ? `<div class="cs2-sens-ladders">${blocks.join('')}</div>`
    : '<div class="source-impact-empty">Set a score standard or DD minimum to see how the count changes.</div>');
}

// ── Threshold Explorer ─────────────────────────────────────────────────────
function pctl(sorted, p) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
function niceStep(x) {
  if (x <= 1) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(x))), f = x / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}
function worldBenchmarks(gender, discipline) {
  // World Aquatics posted scores are only on the same scale as the Senior
  // USA pool's "usa" scoring basis — not NCAA 5-category, not an unset
  // Junior custom bar. Don't overlay a benchmark that isn't comparable.
  if (poolFamily() !== 'usa') return null;
  const g = normaliseGender(gender), d = normaliseDiscipline(discipline);
  const rows = ((state.data && state.data.results) || []).filter(r =>
    r.competition_family === 'World Aquatics' && !r.is_synchronized &&
    r.gender === g && r.discipline === d &&
    String(r.round_stage).toLowerCase().includes('final'));
  const finals = rows.map(scoreForRow).filter(isNum).sort((a, b) => a - b);
  if (finals.length < 6) return null;
  const podium = rows.filter(r => isNum(r.place) && r.place <= 3).map(scoreForRow).filter(isNum).sort((a, b) => a - b);
  return { n: finals.length, finalist: pctl(finals, 0.5), medal: podium.length >= 3 ? pctl(podium, 0.5) : pctl(finals, 0.85) };
}
function explorerCurrentStd() {
  const v = num(els.scoreThreshold.value);
  if (isNum(v)) return v;
  return scoreThresholdForSelection(els.genderFilter.value, els.disciplineFilter.value, poolFamily());
}
function updateInverse() {
  const out = $('explorerInvOut'), tEl = $('explorerTarget');
  if (!out || !state._sweep) return;
  const tgt = (tEl && (tEl.value || '').trim() !== '') ? num(tEl.value) : null;
  if (!isNum(tgt)) { out.innerHTML = 'type a number and I’ll find the standard that lands there.'; return; }
  const { sweep, yMax } = state._sweep;
  let found = null;
  for (const s of sweep) { if (s.n >= tgt) found = s.x; }   // toughest bar still yielding >= tgt
  out.innerHTML = (found == null)
    ? `no standard in range yields ${tgt}+ (the field tops out at ${yMax}).`
    : `set the standard near <b>${Math.round(found)}</b>.`;
}
function renderThresholdExplorer() {
  const host = $('explorerBody');
  if (!host) return;
  if (els.ruleMode.value === 'topNOnly') {
    host.innerHTML = '<div class="source-impact-empty">This preset qualifies by placement, not score — the score standard doesn’t change the count. Switch the rule to “Score” or “Placement or score” to explore thresholds.</div>';
    state._sweep = null; updateInverse(); return;
  }
  const rows = state.filtered || [];
  const scores = rows.map(scoreForRow).filter(isNum).sort((a, b) => a - b);
  if (scores.length < 3) {
    host.innerHTML = '<div class="source-impact-empty">Not enough scored results in the current scope to sweep thresholds.</div>';
    state._sweep = null; updateInverse(); return;
  }
  const curDd = num(els.ddThreshold.value);
  const curStd = explorerCurrentStd();
  const wb = worldBenchmarks(els.genderFilter.value, els.disciplineFilter.value);
  const d = normaliseDiscipline(els.disciplineFilter.value);

  let lo = scores[0], hi = scores[scores.length - 1];
  [curStd, wb && wb.finalist, wb && wb.medal].forEach(v => { if (isNum(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
  const pad = (hi - lo) * 0.04 || 5; lo -= pad; hi += pad;

  const STEPS = 80, sweep = [];
  for (let i = 0; i <= STEPS; i++) { const x = lo + (hi - lo) * i / STEPS; sweep.push({ x, n: qualCountWith(x, curDd) }); }
  const yMax = Math.max(1, ...sweep.map(s => s.n));
  state._sweep = { sweep, yMax };

  const curN = isNum(curStd) ? qualCountWith(curStd, curDd) : null;
  const eq = worldEquivFor(els.genderFilter.value, els.disciplineFilter.value);
  const weq = eq ? num(eq.domestic_equiv_final) : null;
  if (isNum(weq)) { lo = Math.min(lo, weq - pad); hi = Math.max(hi, weq + pad); }

  const curNote = isNum(curStd)
    ? `<b>${curN}</b> athletes clear your current standard of <b>${Math.round(curStd)}</b> in this scope. Tap the curve to move the standard; drag the band below it to zoom.`
    : 'Set a score standard to mark it on the curve. Tap the curve to set one.';
  const wbNote = wb
    ? `Amber lines: a median World finalist posted <b>${Math.round(wb.finalist)}</b> and a median medalist <b>${Math.round(wb.medal)}</b> in ${wb.n} World Aquatics ${d} finals.`
    : `No World Aquatics ${d} finals available for an international overlay.`;
  const weNote = isNum(weq) ? ` Navy dashed line: the domestic season mean that converts to a World final (<b>${Math.round(weq)}</b>, Model 4).` : '';
  host.innerHTML = `<div class="cs2-ex-head">${curNote}</div><div id="explorerChart" class="usad-chart" style="height:340px"></div><div class="cs2-ex-foot">${wbNote}${weNote}</div>`;

  if (!window.echarts || !window.USAD.charts) { host.insertAdjacentHTML('beforeend', '<div class="source-impact-empty">Chart library did not load.</div>'); updateInverse(); return; }
  const { colors: C, MONO } = USAD.charts;
  const vlabel = (text, color) => ({ formatter: text, position: 'insideEndTop', rotate: 0, distance: [6, 4], fontFamily: MONO, fontSize: 11, color, backgroundColor: 'rgba(255,255,255,.9)', padding: [2, 4], borderRadius: 3 });
  const marks = [];
  if (isNum(curStd)) marks.push({ xAxis: curStd, lineStyle: { color: C.red, width: 1.5 }, label: vlabel(`your standard ${Math.round(curStd)}  ·  ${curN} qualify`, C.red) });
  if (wb) {
    marks.push({ xAxis: wb.finalist, lineStyle: { color: '#c39a3e', type: [4, 4], width: 1.5 }, label: vlabel(`World finalist ${Math.round(wb.finalist)}`, '#8a6d1a') });
    marks.push({ xAxis: wb.medal, lineStyle: { color: '#c39a3e', type: [4, 4], width: 1.5 }, label: vlabel(`World medal ${Math.round(wb.medal)}`, '#8a6d1a') });
  }
  if (isNum(weq)) marks.push({ xAxis: weq, lineStyle: { color: C.navy, type: [6, 4], width: 1.5 }, label: vlabel(`World-final equivalent ${Math.round(weq)}`, C.navy) });
  // Stagger labels that would collide: sort by x and step each close neighbour down a row.
  marks.sort((a, b) => a.xAxis - b.xAxis);
  let prevX = -Infinity, row = 0;
  marks.forEach((mk) => { row = (mk.xAxis - prevX) < (hi - lo) * 0.22 ? (row + 1) % 3 : 0; prevX = mk.xAxis; mk.label.distance = [6, 4 + row * 18]; });
  const el = $('explorerChart');
  const chart = USAD.charts.mount(el, {
    grid: { left: 48, right: 24, top: 32, bottom: 78 },
    tooltip: { trigger: 'axis', formatter: p => `<b style="font-family:${MONO}">${p[0].value[0].toFixed(1)}</b> standard → <b>${p[0].value[1]}</b> qualify` },
    xAxis: { type: 'value', min: Math.floor(lo), max: Math.ceil(hi), name: 'score standard', nameLocation: 'middle', nameGap: 26 },
    yAxis: { type: 'value', name: 'athletes', minInterval: 1 },
    dataZoom: [{ type: 'slider', height: 20, bottom: 10, labelFormatter: v => v.toFixed(0) }, { type: 'inside' }],
    series: [{ type: 'line', step: 'end', data: sweep.map(s => [s.x, s.n]), symbol: 'none', lineStyle: { color: C.navy, width: 2 }, areaStyle: { color: 'rgba(0,154,199,.12)' },
      markLine: { symbol: 'none', silent: true, animation: false, data: marks },
      markPoint: isNum(curStd) ? { data: [{ coord: [curStd, curN], symbol: 'circle', symbolSize: 12, itemStyle: { color: '#fff', borderColor: C.red, borderWidth: 2.5 }, label: { show: false } }] } : undefined }],
  }, { filename: 'threshold-explorer' });
  chart.getZr().on('click', (ev) => {
    const pt = chart.convertFromPixel({ xAxisIndex: 0 }, [ev.offsetX, ev.offsetY]);
    const x = Array.isArray(pt) ? pt[0] : pt;
    if (!isNum(x)) return;
    els.scoreThreshold.value = (Math.round(x * 2) / 2).toFixed(1);
    state.thresholdEdited = true; recompute();
  });
  updateInverse();
}

function heatColor(t) {
  t = Math.max(0, Math.min(1, t));
  const stops = [[0, [232, 238, 246]], [0.4, [143, 195, 234]], [0.7, [0, 154, 199]], [1, [23, 31, 105]]];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const a = stops[i - 1][0], ca = stops[i - 1][1], b = stops[i][0], cb = stops[i][1];
      const f = (t - a) / (b - a || 1);
      return `rgb(${ca.map((v, j) => Math.round(v + (cb[j] - v) * f)).join(',')})`;
    }
  }
  return 'rgb(23,31,105)';
}
function renderDecisionSurface() {
  const host = $('surfaceBody');
  if (!host) return;
  const rows = state.filtered || [];
  const curStd = explorerCurrentStd();
  const curDd = num(els.ddThreshold.value) ?? ddMinimumForSelection(els.genderFilter.value, els.disciplineFilter.value, els.criteriaPreset.value);
  const d = normaliseDiscipline(els.disciplineFilter.value);

  const ddKnown = rows.map(r => r.phase_dd_sum).filter(isNum).sort((a, b) => a - b);
  const cov = rows.length ? ddKnown.length / rows.length : 0;
  const covNote = `DD is recorded for <b>${ddKnown.length.toLocaleString()}</b> of ${rows.length.toLocaleString()} results in scope (${Math.round(cov * 100)}%). The DD lever only moves athletes whose DD we know — it’s checked where known.`;
  if (ddKnown.length < 6) {
    host.innerHTML = `<div class="cs2-ex-foot">${covNote}</div><div class="source-impact-empty">Too few known-DD results here to explore the DD lever — DD detail exists for 2024–26 events. Narrow the scope (event + recent meets) to use this view.</div>`;
    return;
  }

  let dlo = ddKnown[0], dhi = ddKnown[ddKnown.length - 1];
  if (isNum(curDd)) { dlo = Math.min(dlo, curDd); dhi = Math.max(dhi, curDd); }
  const dpad = (dhi - dlo) * 0.06 || 0.3; dlo -= dpad; dhi += dpad;

  const scores = rows.map(scoreForRow).filter(isNum).sort((a, b) => a - b);
  let slo = scores[0], shi = scores[scores.length - 1];
  const wb = worldBenchmarks(els.genderFilter.value, els.disciplineFilter.value);
  [curStd, wb && wb.finalist].forEach(v => { if (isNum(v)) { slo = Math.min(slo, v); shi = Math.max(shi, v); } });
  const spad = (shi - slo) * 0.04 || 5; slo -= spad; shi += spad;

  const topOnly = els.ruleMode.value === 'topNOnly';

  // ── DD sweep curve (hold score at current standard) ──
  const DS = 70, dsweep = [];
  for (let i = 0; i <= DS; i++) { const dd = dlo + (dhi - dlo) * i / DS; dsweep.push({ dd, n: qualCountWith(curStd, dd, 'knownOnly') }); }
  const dyMax = Math.max(1, ...dsweep.map(s => s.n));
  const cW = 760, cH = 200, cml = 48, cmr = 18, cmt = 18, cmb = 36, cpw = cW - cml - cmr, cph = cH - cmt - cmb;
  const cX = dd => cml + (dd - dlo) / (dhi - dlo) * cpw;
  const cY = n => cmt + cph - (n / dyMax) * cph;
  let cl = '', ca = `M ${cX(dsweep[0].dd).toFixed(1)} ${cY(0).toFixed(1)}`;
  dsweep.forEach((s, i) => { const px = cX(s.dd).toFixed(1), py = cY(s.n).toFixed(1); cl += (i ? ' L ' : 'M ') + px + ' ' + py; ca += ' L ' + px + ' ' + py; });
  ca += ` L ${cX(dsweep[DS].dd).toFixed(1)} ${cY(0).toFixed(1)} Z`;
  const cyStep = niceStep(dyMax / 3), cyt = []; for (let v = 0; v <= dyMax + 0.001; v += cyStep) cyt.push(v);
  const cxt = []; for (let i = 0; i <= 5; i++) cxt.push(dlo + (dhi - dlo) * i / 5);
  const curDdN = isNum(curDd) ? qualCountWith(curStd, curDd, 'knownOnly') : null;
  const ddMark = (isNum(curDd) && curDd >= dlo && curDd <= dhi)
    ? `<line x1="${cX(curDd).toFixed(1)}" y1="${cmt}" x2="${cX(curDd).toFixed(1)}" y2="${cmt + cph}" stroke="#171f69" stroke-width="2"/><text x="${cX(curDd).toFixed(1)}" y="${cmt - 6}" text-anchor="middle" class="cs2-ex-vlab" fill="#171f69">DD ${curDd.toFixed(1)}${curDdN != null ? ' · ' + curDdN : ''}</text>` : '';
  const ddCurve = `<svg viewBox="0 0 ${cW} ${cH}" class="cs2-ex-svg" role="img" aria-label="Qualifiers by DD minimum">`
    + cyt.map(v => `<line x1="${cml}" y1="${cY(v).toFixed(1)}" x2="${cW - cmr}" y2="${cY(v).toFixed(1)}" class="cs2-ex-grid"/><text x="${cml - 8}" y="${(cY(v) + 4).toFixed(1)}" text-anchor="end" class="cs2-ex-ylab">${Math.round(v)}</text>`).join('')
    + `<path d="${ca}" class="cs2-ex-area cs2-ex-area2"/><path d="${cl}" class="cs2-ex-line cs2-ex-line2"/>${ddMark}`
    + cxt.map(dd => `<text x="${cX(dd).toFixed(1)}" y="${(cmt + cph + 16).toFixed(1)}" text-anchor="middle" class="cs2-ex-xlab">${dd.toFixed(1)}</text>`).join('')
    + `<text x="${cW - cmr}" y="${cH - 4}" text-anchor="end" class="cs2-ex-axis">DD minimum →</text></svg>`;

  // ── score × DD grid ──
  const COLS = 18, ROWS = 12;
  const grid = [], colS = [], rowD = [];
  let gMax = 0;
  for (let c = 0; c < COLS; c++) colS.push(slo + (c + 0.5) / COLS * (shi - slo));
  for (let r = 0; r < ROWS; r++) rowD.push(dlo + (r + 0.5) / ROWS * (dhi - dlo));
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) { const n = topOnly ? qualCountWith(0, rowD[r], 'knownOnly') : qualCountWith(colS[c], rowD[r], 'knownOnly'); grid[r][c] = n; if (n > gMax) gMax = n; }
  }
  const gW = 760, gH = 360, gml = 56, gmr = 16, gmt = 14, gmb = 40, gpw = gW - gml - gmr, gph = gH - gmt - gmb;
  const cw = gpw / COLS, ch = gph / ROWS;
  const cellX = c => gml + c * cw;
  const cellY = r => gmt + (ROWS - 1 - r) * ch;   // higher DD at top
  let cells = '';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    cells += `<rect x="${cellX(c).toFixed(1)}" y="${cellY(r).toFixed(1)}" width="${(cw + 0.6).toFixed(1)}" height="${(ch + 0.6).toFixed(1)}" fill="${heatColor(gMax ? grid[r][c] / gMax : 0)}"/>`;
  }
  // current cell outline
  let curCell = '';
  if (isNum(curStd) && isNum(curDd)) {
    const ci = Math.round((curStd - slo) / (shi - slo) * COLS - 0.5);
    const ri = Math.round((curDd - dlo) / (dhi - dlo) * ROWS - 0.5);
    if (ci >= 0 && ci < COLS && ri >= 0 && ri < ROWS) {
      curCell = `<rect x="${cellX(ci).toFixed(1)}" y="${cellY(ri).toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="none" stroke="#fff" stroke-width="2.5"/><rect x="${(cellX(ci) + 1.2).toFixed(1)}" y="${(cellY(ri) + 1.2).toFixed(1)}" width="${(cw - 2.4).toFixed(1)}" height="${(ch - 2.4).toFixed(1)}" fill="none" stroke="#0d1117" stroke-width="1"/>`;
    }
  }
  // world finalist vertical reference
  let wbLine = '';
  if (wb && !topOnly && wb.finalist >= slo && wb.finalist <= shi) {
    const wx = (gml + (wb.finalist - slo) / (shi - slo) * gpw).toFixed(1);
    wbLine = `<line x1="${wx}" y1="${gmt}" x2="${wx}" y2="${gmt + gph}" stroke="#c39a3e" stroke-width="2" stroke-dasharray="5 4"/><text x="${wx}" y="${gmt - 3}" text-anchor="middle" class="cs2-ex-vlab" fill="#c39a3e">World finalist</text>`;
  }
  const gx = []; for (let i = 0; i <= 5; i++) { const c = Math.round(i / 5 * (COLS - 1)); gx.push(c); }
  const gy = [0, Math.round(ROWS / 2), ROWS - 1];
  const gridSvg = `<svg viewBox="0 0 ${gW} ${gH}" class="cs2-ex-svg" role="img" aria-label="Qualifiers by score and DD">`
    + cells + curCell + wbLine
    + gx.map(c => `<text x="${(cellX(c) + cw / 2).toFixed(1)}" y="${(gmt + gph + 16).toFixed(1)}" text-anchor="middle" class="cs2-ex-xlab">${topOnly ? '' : Math.round(colS[c])}</text>`).join('')
    + gy.map(r => `<text x="${gml - 8}" y="${(cellY(r) + ch / 2 + 4).toFixed(1)}" text-anchor="end" class="cs2-ex-ylab">${rowD[r].toFixed(1)}</text>`).join('')
    + `<text x="${gml}" y="${gH - 4}" class="cs2-ex-axis">${topOnly ? 'score does not gate (placement rule)' : 'score standard →'}</text>`
    + `<text x="${gml - 48}" y="${gmt - 2}" class="cs2-ex-axis">DD min</text></svg>`;

  // legend
  const legStops = [0, 0.25, 0.5, 0.75, 1].map(t => `<span class="cs2-ex-legsw" style="background:${heatColor(t)}"></span>`).join('');
  const legend = `<div class="cs2-ex-legend"><span>fewer qualify</span>${legStops}<span>more (${gMax})</span></div>`;

  host.innerHTML = `<div class="cs2-ex-foot">${covNote}</div>`
    + `<div class="cs2-surf-sub">The DD lever alone — qualifiers as the DD minimum rises (score held at ${isNum(curStd) ? Math.round(curStd) : '—'}):</div>${ddCurve}`
    + `<div class="cs2-surf-sub">Both levers together — every score × DD combination. The outlined cell is your current standard.</div>${gridSvg}${legend}`;
}

// ── Multi-year backtest ────────────────────────────────────────────────────
// Deliberately separate from the live number: shows what the CURRENT
// standard would have produced in each past season, one year at a time,
// within the same pool. Never blended into a single cross-year count.
function rowsForYear(year) {
  const pool       = activePool();
  const gender     = els.genderFilter.value;
  const discipline = els.disciplineFilter.value;
  const round      = els.roundFilter.value;
  const scope      = els.athleteScope.value;
  return state.data.results.filter(r => {
    if (!pool.match(r)) return false;
    if (r.meet_year !== year) return false;
    if (gender     && normaliseGender(r.gender) !== gender) return false;
    if (discipline && r.discipline !== discipline) return false;
    if (round !== 'any' && r.round_stage !== round) return false;
    if (scope === 'usaDomestic') {
      if (r.is_usa === false || (r.nat && r.nat !== 'USA' && r.nat !== 'US')) return false;
    } else if (scope === 'knownUsa') {
      if (r.is_usa !== true && r.nat !== 'USA' && r.nat !== 'US') return false;
    } else if (scope === 'knownInternational') {
      if (r.is_usa === true || (r.nat === 'USA' || r.nat === 'US' || !r.nat)) return false;
    }
    return true;
  });
}
function qualCountForYear(year, scoreThr, ddMin) {
  const rule   = els.ruleMode.value;
  const topN   = num(els.topN.value) ?? 0;
  const ddMode = els.ddMode.value;
  const seen = new Set();
  for (const r of rowsForYear(year)) {
    const score = scoreForRow(r);
    const scorePass = isNum(scoreThr) && isNum(score) && score >= scoreThr;
    const topPass   = topN > 0 && isNum(r.place) && r.place <= topN;
    let rulePass = false;
    if (rule === 'scoreOnly') rulePass = scorePass;
    else if (rule === 'topNOnly') rulePass = topPass;
    else if (rule === 'topNOrScore') rulePass = topPass || scorePass;
    let ddPass;
    const total = r.phase_dd_sum;
    if (ddMode === 'ignore' || !isNum(ddMin)) ddPass = true;
    else if (!isNum(total)) ddPass = (ddMode === 'requireKnown') ? false : true;
    else ddPass = total >= ddMin;
    if (rulePass && ddPass) seen.add(athleteKey(r));
  }
  return seen.size;
}
function renderBacktest() {
  const host = $('backtestBody');
  if (!host) return;
  if (els.ruleMode.value === 'topNOnly' && !isNum(num(els.topN.value))) {
    host.innerHTML = '<div class="source-impact-empty">Set a placement cutoff or score standard to backtest.</div>';
    return;
  }
  const years = (state.availableYears || []).slice().sort((a, b) => b - a);
  if (years.length < 2) {
    host.innerHTML = `<div class="source-impact-empty">Only one year of data in the ${esc(activePool().shortLabel)} pool right now — nothing to backtest against yet.</div>`;
    return;
  }
  const curScore = num(els.scoreThreshold.value);
  const curDd    = num(els.ddThreshold.value);
  const rows = years.map(y => ({ year: y, count: qualCountForYear(y, curScore, curDd), isCurrent: y === state.year }));
  const max  = Math.max(1, ...rows.map(r => r.count));
  const body = rows.map(r => `
    <div class="cs2-sens-row ${r.isCurrent ? 'is-current' : ''}">
      <span class="cs2-sens-th">${r.year}${r.isCurrent ? ' · active' : ''}</span>
      <span class="cs2-sens-bar"><span class="cs2-sens-fill" style="width:${Math.round(r.count / max * 100)}%"></span></span>
      <span class="cs2-sens-n">${r.count}</span>
    </div>`).join('');
  const stdTxt = [
    isNum(curScore) ? `score ${fmtScore(curScore)}` : null,
    isNum(curDd) ? `DD ${fmtDd(curDd)}` : null,
    (num(els.topN.value) > 0) ? `top ${els.topN.value}` : null,
  ].filter(Boolean).join(' · ') || 'the current rule';
  host.innerHTML = `<div class="cs2-sens-baseline">If <b>${esc(stdTxt)}</b> had been the bar in each season (${esc(activePool().shortLabel)} pool, same event/round filters as now):</div><div class="cs2-sens-ladders">${body}</div>`;
}

function renderEnhancements() {
  try { renderTrustStrip(); } catch (e) {}
  try { renderThresholdExplorer(); } catch (e) {}
  try { renderDecisionSurface(); } catch (e) {}
  try { renderSensitivity(); } catch (e) {}
  try { renderBacktest(); } catch (e) {}
  try { renderStandardAchievement(); } catch (e) {}
  try { renderWorldEquivalent(); } catch (e) {}
  try { if (poolFamily() === 'usa') loadSimTable().then(() => {}); renderSimPanel(); } catch (e) {}
  try { renderBubbleWatch(); } catch (e) {}
  try { renderStandardsPanel(); } catch (e) {}
}

function initEnhancements() {
  ['wifGender','wifEvent','wifScore','wifDd','wifPlace'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', renderWhatIf);
    if (el) el.addEventListener('change', renderWhatIf);
  });
  const tgt = $('explorerTarget');
  if (tgt) tgt.addEventListener('input', updateInverse);
  const pr = $('btnPrintReport');
  if (pr) pr.addEventListener('click', printReport);
  const wd = $('btnExportWord');
  if (wd) wd.addEventListener('click', exportCriteriaDoc);
  const rb = $('scenarioRefresh');
  if (rb) rb.addEventListener('click', () => syncScenarios({ manual: true }));
  if (window.CriteriaScenarioSync) {
    setTimeout(() => syncScenarios({ manual: false }), 800);
    setInterval(() => syncScenarios({ manual: false }), 45000);
  } else {
    setScenarioStatus('Sharing is not available in this view.', true);
  }
  // Mirror sidebar event selection into the what-if for convenience on first load.
  if ($('wifGender') && els.genderFilter.value) $('wifGender').value = els.genderFilter.value === 'Male' ? 'Male' : 'Female';
  if ($('wifEvent') && ['1m','3m','Platform'].includes(els.disciplineFilter.value)) $('wifEvent').value = els.disciplineFilter.value;
  renderWhatIf();
}

// ── Go! ────────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

})();
