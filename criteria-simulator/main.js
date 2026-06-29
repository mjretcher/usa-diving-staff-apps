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
  initEnhancements();

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
    ncaaWomen5Category: 'NCAA 5-cat',
    posted: 'Posted', phasePreferred: 'Phase', phaseOrStandalone: 'Non-cumulative',
  };
  $('trustBasis').textContent = basisLabels[els.scoreMode.value] || '—';
  const scored = inScope.filter(r => isNum(scoreForRow(r))).length;
  const cumul  = inScope.filter(r => isNum(r.posted_score) && isNum(r.phase_score) && r.posted_score !== r.phase_score).length;
  $('trustBasisFoot').textContent =
    `${fmtPct(pct(scored, inScope.length))} scored · ${fmtInt(cumul)} cumulative handled`;

  const ddKnown = inScope.filter(r => isNum(r.phase_dd_sum)).length;
  $('trustDd').textContent = fmtPct(pct(ddKnown, inScope.length));
}

function activeStandardFor(gender, discipline) {
  // Mirror how the engine resolves the active standard for an event.
  const usa = scoreThresholdForSelection(gender, discipline, 'usa');
  return usa;
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
  const score = num($('wifScore').value);
  const dd    = num($('wifDd').value);
  const place = num($('wifPlace').value);
  const preset = els.criteriaPreset.value;
  const rule   = els.ruleMode.value;
  const topN   = num(els.topN.value) ?? 0;

  const standard = activeStandardFor(g, d);
  const ddMin    = ddMinimumForSelection(g, d, preset);
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
  if (!body || body.dataset.rendered) return;
  const f = (v) => isNum(v) ? v : '—';
  body.innerHTML = `
    <p class="cs2-std-note">Source: USA Diving published selection criteria. Confirm these match the current season before use.</p>
    ${standardsTableHtml('Score standard · USA', { Female: WINTER_SCORE_STANDARDS.Female.usa, Male: WINTER_SCORE_STANDARDS.Male.usa }, f)}
    ${standardsTableHtml('Score standard · NCAA', { Female: WINTER_SCORE_STANDARDS.Female.ncaa, Male: WINTER_SCORE_STANDARDS.Male.ncaa }, f)}
    ${standardsTableHtml('DD minimum · Winter', WINTER_DD_MINIMUMS, f)}
    ${standardsTableHtml('DD minimum · Nationals', NATIONAL_DD_MINIMUMS, f)}`;
  body.dataset.rendered = '1';
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
  return scoreThresholdForSelection(els.genderFilter.value, els.disciplineFilter.value, 'usa');
}
function updateInverse() {
  const out = $('explorerInvOut'), tEl = $('explorerTarget');
  if (!out || !state._sweep) return;
  const tgt = tEl ? num(tEl.value) : null;
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

  const W = 760, H = 340, ml = 48, mr = 18, mt = 22, mb = 44, pw = W - ml - mr, ph = H - mt - mb;
  const X = x => ml + (x - lo) / (hi - lo) * pw;
  const Y = n => mt + ph - (n / yMax) * ph;
  let line = '', area = `M ${X(sweep[0].x).toFixed(1)} ${Y(0).toFixed(1)}`;
  sweep.forEach((s, i) => { const px = X(s.x).toFixed(1), py = Y(s.n).toFixed(1); line += (i ? ' L ' : 'M ') + px + ' ' + py; area += ' L ' + px + ' ' + py; });
  area += ` L ${X(sweep[sweep.length - 1].x).toFixed(1)} ${Y(0).toFixed(1)} Z`;

  const yStep = niceStep(yMax / 4), yt = [];
  for (let v = 0; v <= yMax + 0.001; v += yStep) yt.push(v);
  const xt = []; for (let i = 0; i <= 5; i++) xt.push(lo + (hi - lo) * i / 5);
  const vline = (x, color, dash, label, count) => {
    if (!isNum(x) || x < lo || x > hi) return '';
    const px = X(x).toFixed(1), lbl = `${label}${count != null ? ' · ' + count : ''}`;
    return `<line x1="${px}" y1="${mt}" x2="${px}" y2="${mt + ph}" stroke="${color}" stroke-width="2"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
      + `<text x="${px}" y="${mt - 6}" text-anchor="middle" class="cs2-ex-vlab" fill="${color}">${esc(lbl)}</text>`;
  };
  const curN = isNum(curStd) ? qualCountWith(curStd, curDd) : null;

  const svg = `<svg viewBox="0 0 ${W} ${H}" class="cs2-ex-svg" role="img" aria-label="Qualifiers by score standard">`
    + yt.map(v => `<line x1="${ml}" y1="${Y(v).toFixed(1)}" x2="${W - mr}" y2="${Y(v).toFixed(1)}" class="cs2-ex-grid"/><text x="${ml - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="cs2-ex-ylab">${Math.round(v)}</text>`).join('')
    + `<path d="${area}" class="cs2-ex-area"/><path d="${line}" class="cs2-ex-line"/>`
    + (wb ? vline(wb.medal, '#8a6d1a', '5 4', 'World medal', null) : '')
    + (wb ? vline(wb.finalist, '#c39a3e', '5 4', 'World finalist', null) : '')
    + vline(curStd, '#171f69', null, 'Your standard', curN)
    + xt.map(x => `<text x="${X(x).toFixed(1)}" y="${(mt + ph + 16).toFixed(1)}" text-anchor="middle" class="cs2-ex-xlab">${Math.round(x)}</text>`).join('')
    + `<text x="${W - mr}" y="${H - 6}" text-anchor="end" class="cs2-ex-axis">score standard →</text>`
    + `</svg>`;

  const curNote = isNum(curStd)
    ? `<b>${curN}</b> athletes clear your current standard of <b>${Math.round(curStd)}</b> in this scope.`
    : 'Set a score standard to mark it on the curve.';
  const wbNote = wb
    ? `Gold lines: a median World finalist sits at <b>${Math.round(wb.finalist)}</b> and a median medalist at <b>${Math.round(wb.medal)}</b> (${wb.n} World Aquatics ${d} finals).`
    : `No World Aquatics ${d} finals available for an international overlay.`;
  host.innerHTML = `<div class="cs2-ex-head">${curNote}</div>${svg}<div class="cs2-ex-foot">${wbNote}</div>`;
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

function renderEnhancements() {
  try { renderTrustStrip(); } catch (e) {}
  try { renderThresholdExplorer(); } catch (e) {}
  try { renderDecisionSurface(); } catch (e) {}
  try { renderSensitivity(); } catch (e) {}
  try { renderStandardAchievement(); } catch (e) {}
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
