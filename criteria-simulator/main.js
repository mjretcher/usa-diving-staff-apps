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
    'Athletes qualify by meeting score standards at approved source meets. DD is required to compete at Winter Nationals but may be earned separately.',
  winterQualifier:
    'Winter Qualifier advancement: 1m and 3m use top 3 OR score standard; platform uses top 5 OR score standard.',
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

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  data: null,           // { results: [...], _source }
  meetsById: new Map(), // meet_id -> { meet_id, name, source, count }
  selectedMeetIds: new Set(),
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
function scoreForRow(row) {
  const mode = els.scoreMode.value;
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
  if (mode === 'ncaaWomen5Category' && isNum(row.ncaa_total)) return 'NCAA 5-cat';
  if (mode === 'posted')             return 'Posted';
  if (mode === 'phasePreferred')     return 'Phase';
  return isNum(row.phase_score) ? 'Phase' : 'Posted';
}
function ddMinimumForSelection(gender, discipline, preset) {
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

  let reason;
  if (qualified) {
    const reasons = [];
    if (topPass)   reasons.push(`Top ${topN} (placed ${row.place})`);
    if (scorePass) reasons.push(`Score ${fmtScore(score)} ≥ ${fmtScore(threshold)}`);
    if (dd.status === 'pass')        reasons.push(`DD ${fmtDd(dd.total)} ≥ ${fmtDd(dd.minimum)}`);
    if (dd.status === 'ignored')     reasons.push('DD ignored');
    if (dd.status === 'unknownPass') reasons.push('DD unknown (accepted)');
    reason = reasons.join(' · ');
  } else {
    const fails = [];
    if (rule !== 'topNOnly'  && isNum(threshold) && !scorePass)
      fails.push(`Score ${fmtScore(score)} < ${fmtScore(threshold)}`);
    if (rule !== 'scoreOnly' && topN > 0 && !topPass)
      fails.push(isNum(row.place) ? `Placed ${row.place} (need top ${topN})` : `No placement`);
    if (!dd.pass) fails.push(`DD ${fmtDd(dd.total)} < ${fmtDd(dd.minimum)}`);
    reason = fails.join(' · ') || 'Did not meet rule';
  }

  return {
    ...row,
    analysis_score: score,
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
  const gender     = els.genderFilter.value;
  const discipline = els.disciplineFilter.value;
  const round      = els.roundFilter.value;
  const scope      = els.athleteScope.value;
  const meets      = state.selectedMeetIds;
  const meetsActive = meets.size > 0;

  return state.data.results.filter(r => {
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
  renderScenarioStrip();
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
  if (!scored.length) {
    target.innerHTML = '<div class="source-impact-empty">No scored results.</div>';
    return;
  }
  const threshold = scored.find(r => isNum(r.threshold_used))?.threshold_used ?? null;
  const scores = scored.map(r => r.analysis_score);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const range = (hi - lo) || 1;
  const N = 24;
  const step = range / N;
  const buckets = new Array(N).fill(0).map(() => ({ below: 0, above: 0 }));
  for (const r of scored) {
    let i = Math.floor((r.analysis_score - lo) / step);
    if (i >= N) i = N - 1;
    if (i < 0)  i = 0;
    const passing = isNum(threshold) && r.analysis_score >= threshold;
    if (passing) buckets[i].above++; else buckets[i].below++;
  }
  const maxCount = Math.max(...buckets.map(b => b.below + b.above), 1);
  const W = 700, H = 200;
  const padL = 32, padR = 14, padT = 16, padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const barW = innerW / N;
  let bars = '';
  for (let i = 0; i < N; i++) {
    const x = padL + i * barW;
    const total = buckets[i].below + buckets[i].above;
    const totalH = (total / maxCount) * innerH;
    const aboveH = (buckets[i].above / maxCount) * innerH;
    const belowH = totalH - aboveH;
    const yBelowTop = padT + innerH - belowH;
    const yAboveTop = padT + innerH - totalH;
    if (belowH > 0) bars += `<rect class="bar" x="${(x+1).toFixed(1)}" y="${yBelowTop.toFixed(1)}" width="${(barW-2).toFixed(1)}" height="${belowH.toFixed(1)}" />`;
    if (aboveH > 0) bars += `<rect class="bar qualified" x="${(x+1).toFixed(1)}" y="${yAboveTop.toFixed(1)}" width="${(barW-2).toFixed(1)}" height="${aboveH.toFixed(1)}" />`;
  }
  // Threshold line
  let thresh = '';
  if (isNum(threshold) && threshold >= lo && threshold <= hi) {
    const tx = padL + ((threshold - lo) / range) * innerW;
    thresh = `
      <line class="threshold-line" x1="${tx.toFixed(1)}" y1="${padT}" x2="${tx.toFixed(1)}" y2="${(padT + innerH).toFixed(1)}" />
      <text class="threshold-label" x="${(tx + 5).toFixed(1)}" y="${(padT + 12).toFixed(1)}">≥ ${threshold.toFixed(0)}</text>
    `;
  }
  // Axis
  const axisY = padT + innerH;
  const axis = `
    <line class="axis-line" x1="${padL}" y1="${axisY}" x2="${padL + innerW}" y2="${axisY}" />
    <text class="axis-label" x="${padL}" y="${H - 6}" text-anchor="start">${lo.toFixed(0)}</text>
    <text class="axis-label" x="${(padL + innerW/2).toFixed(1)}" y="${H - 6}" text-anchor="middle">score</text>
    <text class="axis-label" x="${padL + innerW}" y="${H - 6}" text-anchor="end">${hi.toFixed(0)}</text>
    <text class="axis-label" x="${padL - 4}" y="${(padT + 8).toFixed(1)}" text-anchor="end">${maxCount}</text>
    <text class="axis-label" x="${padL - 4}" y="${axisY}" text-anchor="end">0</text>
  `;
  target.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}${thresh}${axis}</svg>`;
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
  $('chipPreset').textContent     = presetLabels[els.criteriaPreset.value] || '—';
  $('chipGender').textContent     = els.genderFilter.value || '—';
  $('chipDiscipline').textContent = els.disciplineFilter.value || '—';
  $('chipRound').textContent      = els.roundFilter.value === 'any' ? 'Any' : els.roundFilter.value;
  const basisLabels = {
    ncaaWomen5Category: 'NCAA 5-cat',
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
  $('stripModel').textContent      = presetLabel;
  $('stripScore').textContent      = els.scoreThreshold.value || '—';
  $('stripDd').textContent         = els.ddThreshold.value || '—';
  $('stripCutoff').textContent     = (num(els.topN.value) > 0) ? els.topN.value : '—';
  $('stripQualified').textContent  = fmtInt(state.qualified.length);
  $('stripBubble').textContent     = fmtInt(state.bubble.length);
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

  // Build meet lookup
  state.meetsById = new Map();
  for (const r of state.data.results) {
    if (!r.meet_id) continue;
    const cur = state.meetsById.get(r.meet_id);
    if (cur) cur.count++;
    else state.meetsById.set(r.meet_id, {
      meet_id: r.meet_id,
      name:    r.meet_name || '(unnamed meet)',
      source:  r.source_name || '',
      count:   1,
    });
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
    state.selectedMeetIds = meetIdsForSources(PRESET_SOURCES.winterEligibility);
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
    els.topN.value = discipline === 'Platform' ? 5 : 3;
    els.scoreThreshold.value = scoreThresholdForSelection(gender, discipline, 'usa') || '';
    els.ddThreshold.value = ddMinimumForSelection(gender, discipline, preset) || '';
  } else if (preset === 'winterEligibility') {
    els.topN.value = 0;
    els.scoreThreshold.value = scoreThresholdForSelection(gender, discipline, 'usa') || '';
    els.ddThreshold.value = ddMinimumForSelection(gender, discipline, preset) || '';
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
function applyScenario(snapshot) {
  if (!snapshot) return;
  for (const [k, v] of Object.entries(snapshot)) {
    if (k === 'meetIds') { state.selectedMeetIds = new Set(v); continue; }
    if (els[k]) els[k].value = v;
  }
  $('presetNote').textContent = PRESET_NOTES[els.criteriaPreset.value] || '';
  renderMeetPicker();
}

function loadScenarios() {
  state.scenarios = localGet(SCENARIO_STORE_KEY, []);
  refreshScenarioSelect();
}
function persistScenarios() { localSet(SCENARIO_STORE_KEY, state.scenarios); }
function refreshScenarioSelect() {
  const sel = els.scenarioSelect;
  sel.innerHTML =
    '<option value="">— Select scenario —</option>' +
    state.scenarios
      .slice()
      .sort((a,b) => sortByName(a.name, b.name))
      .map(s => `<option value="${esc(s.id)}" ${s.id === state.activeScenarioId ? 'selected' : ''}>${esc(s.name)}</option>`)
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
  persistScenarios();
  refreshScenarioSelect();
  els.scenarioName.value = name;
  renderScenarioStrip();
}
function scenarioLoad() {
  const id = els.scenarioSelect.value;
  if (!id) { USAD.toast('Pick a scenario first.', { kind: 'warn' }); return; }
  const sc = state.scenarios.find(s => s.id === id);
  if (!sc) return;
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
  state.scenarios = state.scenarios.filter(s => s.id !== state.activeScenarioId);
  state.activeScenarioId = null;
  els.scenarioName.value = '';
  persistScenarios();
  refreshScenarioSelect();
  USAD.toast('Scenario deleted', { kind: 'success' });
  renderScenarioStrip();
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

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function bootstrap() {
  // Gather element refs
  for (const id of [
    'criteriaPreset','genderFilter','disciplineFilter','roundFilter','scoreMode',
    'athleteScope','scoreThreshold','ddThreshold','topN','ruleMode','ddMode',
    'scenarioSelect','scenarioName','scenarioStatus','scenarioImportFile'
  ]) els[id] = $(id);

  // Load data
  const onProgress = (msg) => { $('loadingText').textContent = msg; };
  let raw;
  try {
    raw = await USAD.data.load({
      cacheKey: 'criteria-sim-results-v2',
      versionKey: 'criteria_simulator_data_version',
      fallback: { src: '../data/criteria-data.js', global: 'DIVE_APP_DATA' },
      queries: [{
        name: 'results',
        sql:  `SELECT meet_id, meet_name, meet_year,
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
                      ncaa_division
               FROM core.result_phases`,
      }],
      onProgress,
    });
  } catch (e) {
    $('loadingText').innerHTML = `<span style="color:var(--status-flag)">Could not load data: ${esc(e.message || e)}</span>`;
    USAD.toast('Data load failed', { kind: 'error', duration: 6000 });
    return;
  }

  // raw shape: either { results: [...], _source } (from Neon) or
  //            DIVE_APP_DATA-shaped object { results: [...], meta, _source } (from fallback)
  const rawRows = raw.results || (raw._source === 'fallback' && raw.results) || [];
  state.data = {
    results: rawRows.map(normaliseRow),
    _source: raw._source,
  };

  // KPIs
  const uniqMeets    = new Set(state.data.results.map(r => r.meet_id)).size;
  const uniqAthletes = new Set(state.data.results.map(r => athleteKey(r))).size;
  $('kpiMeets').textContent    = fmtInt(uniqMeets);
  $('kpiResults').textContent  = fmtInt(state.data.results.length);
  $('kpiAthletes').textContent = fmtInt(uniqAthletes);
  $('kpiSource').textContent   = raw._source || '—';
  $('kpiSource').dataset.source = raw._source || '';

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

  // Initial render
  recompute();
}

function wireEvents() {
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

// ── Go! ────────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

})();
