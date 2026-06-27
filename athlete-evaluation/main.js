/* ============================================================
   HP Analytics / Athlete Evaluation — main.js (rebuild)
   ============================================================ */
(function () {
'use strict';

const GROUPS = {
  '1': 'Front', '2': 'Back', '3': 'Reverse',
  '4': 'Inward', '5': 'Twister', '6': 'Armstand',
};
const GROUP_ORDER = ['1','2','3','4','5','6'];

const state = {
  data: null,         // { results, dives, _source }
  resultsById: new Map(),
  meetsById: new Map(),
  yearSet: new Set(), // years present in data
  selectedYears: new Set(),
  selectedMeets: new Set(),
  scope: 'hpd',
  filteredResults: [],
  filteredDives: [],
  leaderboardSort: { key: 'bestTotal', dir: 'desc' },
};

const els = {};
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const fmtScore = (v) => isNum(v) ? v.toFixed(2) : '—';
const fmtDd    = (v) => isNum(v) ? v.toFixed(2) : '—';
const fmtInt   = (v) => isNum(v) ? Math.round(v).toLocaleString() : '—';
const sortStr  = (a,b) => String(a||'').localeCompare(String(b||''));

function normaliseGender(g) {
  const s = String(g || '').toLowerCase();
  if (s.startsWith('f') || s === 'women' || s === 'girls') return 'Female';
  if (s.startsWith('m') || s === 'men'   || s === 'boys')  return 'Male';
  return g || '';
}
function normaliseBoard(b) {
  const s = String(b || '').toLowerCase();
  if (s.includes('plat') || s === '10m' || s === '10-meter') return 'Platform';
  if (s === '3m' || s === '3-meter' || s.includes('3-met'))  return '3m';
  if (s === '1m' || s === '1-meter' || s.includes('1-met'))  return '1m';
  return b || '';
}
function diveGroup(diveCode) {
  const s = String(diveCode || '');
  return s.charAt(0); // first char of dive number = group
}

// ── Data normalisation ─────────────────────────────────────────────────
function normaliseResult(r) {
  const family = r.competition_family ?? '';
  const group = r.competition_group ?? '';
  return {
    meet_id:     r.meet_id ?? r.meetId ?? null,
    meet_name:   r.meet_name ?? r.meetName ?? '',
    meet_year:   num(r.meet_year ?? r.year ?? (r.start_date ? new Date(r.start_date).getFullYear() : null)),
    event_id:    r.event_id ?? r.eventId ?? null,
    event_name:  r.event_name ?? r.eventName ?? r.event_round ?? '',
    event_level: r.event_level ?? r.eventLevel ?? '',
    age_group:   r.age_group ?? r.ageGroup ?? '',
    round_stage: r.round_stage ?? r.roundStage ?? r.round ?? '',
    place:       num(r.place),
    diver_id:    r.diver_id ?? r.diverId ?? null,
    diver_name:  r.diver_name ?? r.diverName ?? '',
    team_id:     r.team_id ?? r.teamId ?? null,
    team_name:   r.team_name ?? r.teamName ?? '',
    nat:         r.nat ?? '',
    gender:      normaliseGender(r.gender),
    discipline:  normaliseBoard(r.discipline ?? r.event_discipline ?? r.board),
    total:       num(r.total ?? r.posted_score ?? r.postedScore ?? r.phase_score ?? r.phase_score_from_dives),
    phase_dd_sum: num(r.phase_dd_sum),
    phase_dive_count: num(r.phase_dive_count),
    competition_family: family,
    competition_group:  group,
    source_name: family ? (group ? family + ' / ' + group : family) : '',
    is_synchronized: !!r.is_synchronized,
    _raw: r,
  };
}
function parseJudgeAvg(text) {
  // Format: "J1:8.5; J2:8.5; ..."
  if (!text || typeof text !== 'string') return null;
  const nums = [];
  const re = /:\s*(\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v)) nums.push(v);
  }
  if (!nums.length) return null;
  return nums.reduce((a,b)=>a+b, 0) / nums.length;
}
function normaliseDive(d) {
  return {
    meet_id:    d.meet_id ?? d.meetId ?? null,
    event_id:   d.event_id ?? d.eventId ?? null,
    diver_id:   d.diver_id ?? d.diverId ?? null,
    diver_name: d.diver_name ?? d.diverName ?? '',
    dive_number: d.dive_number ?? d.diveNumber ?? d.code ?? '',
    height:     d.height ?? '',
    description: d.description ?? '',
    dd:         num(d.dd),
    score:      num(d.score ?? d.dive_score),
    net_score:  num(d.net_score),
    judge_avg:  num(d.judge_avg ?? d.judgeAvg ?? d.avg_judge ?? parseJudgeAvg(d.judges_scores)),
    optional_voluntary: d.optional_voluntary ?? d.optionalVoluntary ?? null,
    gender:     normaliseGender(d.gender),
    discipline: normaliseBoard(d.discipline ?? d.board),
    meet_year:  num(d.meet_year),
    dive_category_code:  d.dive_category_code ?? null,
    dive_category_label: d.dive_category_label ?? null,
    competition_family:  d.competition_family ?? '',
    _raw: d,
  };
}

// ── Filter pipeline ───────────────────────────────────────────────────
// Actual event_level values in data: 'Senior', 'Senior/Open', 'Junior', 'Other'
// HPD focus = top-end competitive — Senior + Senior/Open + elite Junior (Group A/B)
function eventLevelMatchesScope(level, scope, ageGroup) {
  const l = String(level || '').toLowerCase();
  const ag = String(ageGroup || '').toLowerCase();
  if (scope === 'all')      return true;
  if (scope === 'senior')   return l.includes('senior') || l.includes('open');
  if (scope === 'junior')   return l.includes('junior') || ag.startsWith('group ');
  if (scope === 'national') return l.includes('senior') || l.includes('open');
  // hpd focus: Senior + Senior/Open + Group A / Group B (elite juniors)
  if (scope === 'hpd') {
    if (l.includes('senior') || l.includes('open')) return true;
    if (ag === 'group a' || ag === 'group b') return true;
    return false;
  }
  return true;
}
function ageGroupOptions() {
  const set = new Set();
  for (const r of state.data.results) if (r.age_group) set.add(r.age_group);
  return [...set].sort(sortStr);
}
function eventLevelOptions() {
  const set = new Set();
  for (const r of state.data.results) if (r.event_level) set.add(r.event_level);
  return [...set].sort(sortStr);
}

function applyFilters() {
  const data = state.data;
  if (!data) return;

  const scope     = els.scopePreset.value;
  const level     = els.eventLevelFilter.value;
  const ageGroup  = els.ageGroupFilter.value;
  const gender    = els.genderFilter.value;
  const board     = els.boardFilter.value;
  const placement = num(els.placementCutoff.value) || 0;
  const search    = (els.athleteSearch.value || '').toLowerCase().trim();

  // Filter results
  const results = data.results.filter(r => {
    if (state.selectedYears.size && (r.meet_year == null || !state.selectedYears.has(r.meet_year))) return false;
    if (state.selectedMeets.size && !state.selectedMeets.has(r.meet_id)) return false;
    if (!eventLevelMatchesScope(r.event_level, scope, r.age_group)) return false;
    if (level !== 'all' && r.event_level !== level) return false;
    if (ageGroup !== 'all' && r.age_group !== ageGroup) return false;
    if (gender !== 'all' && r.gender !== gender) return false;
    if (board  !== 'all' && r.discipline !== board) return false;
    if (placement > 0 && !(isNum(r.place) && r.place <= placement)) return false;
    if (search && !(r.diver_name || '').toLowerCase().includes(search)) return false;
    return true;
  });

  state.filteredResults = results;

  // Build allowed (meet_id, event_id, diver_id) set for dive filtering
  const allowed = new Set();
  for (const r of results) {
    allowed.add(`${r.meet_id}::${r.event_id}::${r.diver_id}`);
  }
  const group = els.groupFilter.value;
  state.filteredDives = data.dives.filter(d => {
    const key = `${d.meet_id}::${d.event_id}::${d.diver_id}`;
    if (!allowed.has(key)) return false;
    if (group !== 'all' && diveGroup(d.dive_number) !== group) return false;
    return true;
  });
}

// ── Rendering ─────────────────────────────────────────────────────────
function recompute() {
  applyFilters();
  render();
}

function render() {
  renderFilterStrip();
  renderHero();
  renderHeatmap();
  renderLeaderboard();
  renderTopDives();
}

function renderFilterStrip() {
  const scopeLabels = {
    hpd: 'HPD focus',
    senior: 'Senior only',
    junior: 'Junior only',
    national: 'National only',
    all: 'All levels',
  };
  $('chipScope').textContent = scopeLabels[els.scopePreset.value] || els.scopePreset.value;

  const yrs = [...state.selectedYears].sort((a,b)=>b-a);
  $('chipYears').textContent = yrs.length
    ? (yrs.length === 1 ? String(yrs[0]) : `${yrs[yrs.length-1]}–${yrs[0]}`)
    : 'All';

  $('chipGender').textContent = els.genderFilter.value === 'all' ? 'All' : els.genderFilter.value;
  $('chipBoard').textContent  = els.boardFilter.value  === 'all' ? 'All' : els.boardFilter.value;
  $('chipLevel').textContent  = els.eventLevelFilter.value === 'all' ? 'All' : els.eventLevelFilter.value;
  $('chipAge').textContent    = els.ageGroupFilter.value   === 'all' ? 'All' : els.ageGroupFilter.value;
  const groupLabels = { all:'All', '1':'Front', '2':'Back', '3':'Reverse', '4':'Inward', '5':'Twister', '6':'Armstand' };
  $('chipGroup').textContent  = groupLabels[els.groupFilter.value] || els.groupFilter.value;
  const placement = num(els.placementCutoff.value) || 0;
  $('chipPlacement').textContent = placement > 0 ? placement : '—';

  const totalMeets = state.meetsById.size;
  const selMeets   = state.selectedMeets.size;
  $('chipMeetsCount').textContent = (selMeets && selMeets < totalMeets)
    ? `${selMeets} of ${totalMeets}` : `All ${totalMeets}`;

  const toggleActive = (id, on) => {
    const el = $(id);
    if (el) el.classList.toggle('active', !!on);
  };
  toggleActive('chipLevelWrap',     els.eventLevelFilter.value !== 'all');
  toggleActive('chipAgeWrap',       els.ageGroupFilter.value   !== 'all');
  toggleActive('chipGroupWrap',     els.groupFilter.value      !== 'all');
  toggleActive('chipPlacementWrap', placement > 0);
  toggleActive('chipMeetsWrap',     selMeets && selMeets < totalMeets);
}

function renderHero() {
  const dives = state.filteredDives;
  const athletes = new Set(state.filteredResults.map(r => r.diver_id || r.diver_name)).size;
  $('heroAthletes').textContent = fmtInt(athletes);
  $('heroDives').textContent    = fmtInt(dives.length);

  const scores = dives.map(d => d.score).filter(isNum);
  const dds    = dives.map(d => d.dd).filter(isNum);
  $('heroAvgScore').textContent = scores.length
    ? fmtScore(scores.reduce((a,b) => a+b, 0) / scores.length) : '—';
  $('heroAvgDd').textContent = dds.length
    ? fmtDd(dds.reduce((a,b) => a+b, 0) / dds.length) : '—';

  $('heroAthletesFoot').textContent = state.filteredResults.length
    ? `${state.filteredResults.length} event entries`
    : 'After all filters';
}

function renderHeatmap() {
  const metric = els.heatmapMetric.value;
  const dives  = state.filteredDives;

  // Top 25 athletes by dive count
  const counts = new Map();
  for (const d of dives) {
    const k = d.diver_name || d.diver_id;
    if (!k) continue;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const topAthletes = [...counts.entries()]
    .sort((a,b) => b[1] - a[1])
    .slice(0, 25)
    .map(([k]) => k);

  // Build cell aggregates
  const cells = new Map(); // key athlete::group -> { sumScore, sumDd, n, hits }
  for (const d of dives) {
    const a = d.diver_name || d.diver_id;
    if (!topAthletes.includes(a)) continue;
    const g = diveGroup(d.dive_number);
    if (!g) continue;
    const key = `${a}::${g}`;
    const c = cells.get(key) || { sumScore: 0, sumDd: 0, n: 0, hits: 0 };
    if (isNum(d.score)) { c.sumScore += d.score; c.n += 1; if (d.score >= 7) c.hits++; }
    if (isNum(d.dd))    c.sumDd    += d.dd;
    cells.set(key, c);
  }

  function valueFor(athlete, group) {
    const c = cells.get(`${athlete}::${group}`);
    if (!c || !c.n) return null;
    if (metric === 'avgScore')    return c.sumScore / c.n;
    if (metric === 'avgDd')       return c.sumDd / c.n;
    if (metric === 'diveCount')   return c.n;
    if (metric === 'successRate') return c.hits / c.n;
    return null;
  }

  // Find min/max across cells for normalisation
  let lo = Infinity, hi = -Infinity;
  for (const a of topAthletes) {
    for (const g of GROUP_ORDER) {
      const v = valueFor(a, g);
      if (isNum(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    }
  }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (hi === lo) hi = lo + 1;

  function color(v) {
    if (!isNum(v)) return null;
    const t = (v - lo) / (hi - lo);
    // Light → mid (pool) → dark (blue)
    const stops = [
      [240, 242, 248],    // var(--bg)
      [0, 154, 199],      // var(--brand-pool)
      [23, 31, 105],      // var(--brand-blue)
    ];
    const k = Math.min(1, Math.max(0, t)) * (stops.length - 1);
    const i = Math.floor(k);
    const f = k - i;
    const A = stops[i], B = stops[Math.min(i+1, stops.length-1)];
    const r = Math.round(A[0] + (B[0] - A[0]) * f);
    const g = Math.round(A[1] + (B[1] - A[1]) * f);
    const b = Math.round(A[2] + (B[2] - A[2]) * f);
    return `rgb(${r},${g},${b})`;
  }
  function textColor(v) {
    if (!isNum(v)) return 'var(--ink-4)';
    return ((v - lo) / (hi - lo)) > 0.55 ? '#fff' : 'rgba(13,16,64,.85)';
  }
  function fmt(v) {
    if (!isNum(v)) return '';
    if (metric === 'avgScore' || metric === 'avgDd') return v.toFixed(2);
    if (metric === 'successRate') return Math.round(v*100) + '%';
    return Math.round(v);
  }

  const target = $('heatmap');
  if (!topAthletes.length) {
    target.innerHTML = '<div class="source-impact-empty" style="padding:20px;text-align:center;color:var(--ink-3)">No dives match the current filters.</div>';
    return;
  }
  const head = `<tr><th class="row-label">Athlete</th>${GROUP_ORDER.map(g => `<th>${esc(GROUPS[g])}</th>`).join('')}</tr>`;
  const rows = topAthletes.map(a => {
    const cells = GROUP_ORDER.map(g => {
      const v = valueFor(a, g);
      const c = color(v);
      const t = textColor(v);
      if (v == null) return `<td class="heatmap-cell empty"></td>`;
      return `<td class="heatmap-cell" style="background:${c};color:${t}" title="${esc(a)} — ${esc(GROUPS[g])}: ${fmt(v)}">${fmt(v)}</td>`;
    }).join('');
    return `<tr><th class="row-label" title="${esc(a)}">${esc(a)}</th>${cells}</tr>`;
  }).join('');

  target.innerHTML = `
    <table class="heatmap-table">
      <thead>${head}</thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="heatmap-legend">
      <span>${fmt(lo)}</span>
      <div class="heatmap-legend-bar"></div>
      <span>${fmt(hi)}</span>
    </div>
  `;
}

function renderLeaderboard() {
  const byAthlete = new Map();
  for (const r of state.filteredResults) {
    const k = r.diver_id || r.diver_name;
    if (!k) continue;
    const cur = byAthlete.get(k) || {
      name: r.diver_name, team: r.team_name, gender: r.gender,
      events: 0, dives: 0, scoreSum: 0, scoreN: 0,
      ddSum: 0, ddN: 0, bestTotal: -Infinity, bestPlace: Infinity,
    };
    cur.events += 1;
    if (isNum(r.total))         { cur.scoreSum += r.total; cur.scoreN += 1; cur.bestTotal = Math.max(cur.bestTotal, r.total); }
    if (isNum(r.place))         cur.bestPlace = Math.min(cur.bestPlace, r.place);
    byAthlete.set(k, cur);
  }
  // Add dive aggregates
  for (const d of state.filteredDives) {
    const k = d.diver_id || d.diver_name;
    const cur = byAthlete.get(k);
    if (!cur) continue;
    cur.dives += 1;
    if (isNum(d.score)) { cur.scoreSum += d.score; cur.scoreN += 1; }
    if (isNum(d.dd))    { cur.ddSum    += d.dd;    cur.ddN += 1; }
  }
  // Compute derived metrics
  const derived = [...byAthlete.values()].map(r => ({
    ...r,
    avgScore: r.scoreN ? r.scoreSum / r.scoreN : null,
    avgDd:    r.ddN    ? r.ddSum / r.ddN    : null,
    bestTotal: r.bestTotal > -Infinity ? r.bestTotal : null,
    bestPlace: r.bestPlace < Infinity  ? r.bestPlace : null,
  }));

  // Sort by the active key
  const sort = state.leaderboardSort || { key: 'bestTotal', dir: 'desc' };
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
  const rows = derived.sort(cmp).slice(0, 100);

  const tbody = $('leaderboardRows');
  if (!rows.length) {
    tbody.innerHTML = '<tr class="row-empty"><td colspan="10">No athletes match the current filters.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td class="num">${i+1}</td>
      <td>${esc(r.name)}</td>
      <td>${esc(r.team)}</td>
      <td>${esc(r.gender)}</td>
      <td class="num">${r.events}</td>
      <td class="num">${r.dives}</td>
      <td class="num">${r.avgScore != null ? fmtScore(r.avgScore) : '—'}</td>
      <td class="num">${r.avgDd != null ? fmtDd(r.avgDd) : '—'}</td>
      <td class="num">${r.bestTotal != null ? fmtScore(r.bestTotal) : '—'}</td>
      <td class="num">${r.bestPlace != null ? r.bestPlace : '—'}</td>
    </tr>
  `).join('');
  $('leaderboardSubtitle').textContent = `Top ${Math.min(100, rows.length)} of ${derived.length} athletes in the current scope.`;

  // Sync sort markers on header
  const head = $('leaderboardTable')?.querySelector('thead');
  if (head) {
    head.querySelectorAll('th.sortable').forEach(th => {
      th.classList.remove('sort-asc','sort-desc');
      if (th.dataset.sort === sort.key) th.classList.add(sort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    });
  }
}

function renderTopDives() {
  const top = state.filteredDives
    .filter(d => isNum(d.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
  const tbody = $('topDivesRows');
  if (!top.length) {
    tbody.innerHTML = '<tr class="row-empty"><td colspan="8">No dives match the current filters.</td></tr>';
    return;
  }
  // Look up meet name from resultsById
  // Position letter is the last char of dive_number (A/B/C/D) — there is no separate column.
  function divePosition(n) {
    const s = String(n || '').trim();
    if (!s) return '';
    const last = s.slice(-1).toUpperCase();
    if ('ABCD'.includes(last)) return last;
    return '';
  }
  tbody.innerHTML = top.map(d => {
    const result = state.resultsById.get(`${d.meet_id}::${d.event_id}::${d.diver_id}`);
    return `
      <tr>
        <td>${esc(d.diver_name)}</td>
        <td>${esc(result ? result.meet_name : '—')}</td>
        <td>${esc(result ? result.event_name : '—')}</td>
        <td>${esc(d.dive_number)}</td>
        <td>${esc(divePosition(d.dive_number))}</td>
        <td class="num">${fmtDd(d.dd)}</td>
        <td class="num">${fmtScore(d.judge_avg)}</td>
        <td class="num">${fmtScore(d.score)}</td>
      </tr>
    `;
  }).join('');
}

// ── Pickers ───────────────────────────────────────────────────────────
function renderYearPicker() {
  const q = (els.yearSearch.value || '').toLowerCase().trim();
  const years = [...state.yearSet].sort((a,b) => b - a);
  const filtered = q ? years.filter(y => String(y).includes(q)) : years;
  $('yearPicker').innerHTML = filtered.map(y => `
    <label class="multi-pick">
      <input type="checkbox" value="${y}" ${state.selectedYears.has(y) ? 'checked' : ''}>
      <span class="multi-pick-label">${y}</span>
    </label>
  `).join('');
}
function renderMeetPicker() {
  const q = (els.meetSearch.value || '').toLowerCase().trim();
  const meets = [...state.meetsById.values()]
    .filter(m => !q || m.name.toLowerCase().includes(q))
    .sort((a,b) => sortStr(a.name, b.name))
    .slice(0, 200);
  $('meetPicker').innerHTML = meets.map(m => `
    <label class="multi-pick">
      <input type="checkbox" value="${esc(m.meet_id)}" ${state.selectedMeets.has(m.meet_id) ? 'checked' : ''}>
      <span class="multi-pick-label" title="${esc(m.name)}">${esc(m.name)}</span>
      <span class="multi-pick-count">${m.year || ''}</span>
    </label>
  `).join('');
}

function populateScopeSummary() {
  const map = {
    hpd: 'Senior + National Championship events (HPD focus).',
    senior: 'Senior, National Qualifier, and Olympic events.',
    junior: 'Junior groups (A, B, C, D) only.',
    national: 'Nationals and Championship events.',
    all: 'Every event in the dataset.',
  };
  $('scopeSummary').textContent = map[els.scopePreset.value] || '';
}

// ── Bootstrap ─────────────────────────────────────────────────────────
async function bootstrap() {
  for (const id of [
    'scopePreset','yearSearch','meetSearch','athleteSearch',
    'eventLevelFilter','ageGroupFilter','genderFilter','boardFilter',
    'groupFilter','placementCutoff','heatmapMetric',
  ]) els[id] = $(id);

  const onProgress = (msg) => { $('loadingText').textContent = msg; };

  let raw;
  try {
    raw = await USAD.data.load({
      cacheKey: 'hp-analytics-v2',
      versionKey: 'criteria_simulator_data_version',
      fallback: { src: '../data/criteria-data.js', global: 'DIVE_APP_DATA' },
      queries: [
        {
          name: 'results',
          sql: `SELECT meet_id, meet_name, meet_year,
                       event_id, event_round AS event_name,
                       event_level, age_group,
                       round_stage, place, diver_id, diver_name,
                       team_id, team_name, nat,
                       gender, discipline,
                       posted_score AS total,
                       phase_score_from_dives, phase_dd_sum, phase_dive_count,
                       competition_family, competition_group,
                       is_synchronized
                FROM core.result_phases`
        },
        {
          name: 'dives',
          sql: `SELECT meet_id, event_id, diver_id, diver_name,
                       dive_number, height, description, dd, score, net_score,
                       round_place, optional_voluntary, judges_scores,
                       gender, discipline, meet_year,
                       dive_category_code, dive_category_label,
                       competition_family, competition_group
                FROM core.dive_sheets`
        },
      ],
      onProgress,
    });
  } catch (e) {
    $('loadingText').innerHTML = `<span style="color:var(--status-flag)">Could not load data: ${esc(e.message || e)}</span>`;
    USAD.toast('Data load failed', { kind: 'error', duration: 6000 });
    return;
  }

  const rawResults = raw.results || [];
  const rawDives   = raw.dives   || [];
  state.data = {
    results: rawResults.map(normaliseResult),
    dives:   rawDives.map(normaliseDive),
    _source: raw._source,
  };

  // Build lookups
  state.resultsById = new Map();
  for (const r of state.data.results) {
    if (r.meet_id && r.event_id && r.diver_id) {
      state.resultsById.set(`${r.meet_id}::${r.event_id}::${r.diver_id}`, r);
    }
  }
  state.meetsById = new Map();
  for (const r of state.data.results) {
    if (!r.meet_id) continue;
    if (!state.meetsById.has(r.meet_id)) {
      state.meetsById.set(r.meet_id, { meet_id: r.meet_id, name: r.meet_name || '(unnamed)', year: r.meet_year });
    }
  }
  state.yearSet = new Set(state.data.results.map(r => r.meet_year).filter(y => isNum(y)));

  // Populate KPIs
  $('kpiMeets').textContent    = fmtInt(state.meetsById.size);
  $('kpiEvents').textContent   = fmtInt(new Set(state.data.results.map(r => r.event_id)).size);
  $('kpiAthletes').textContent = fmtInt(new Set(state.data.results.map(r => r.diver_id || r.diver_name)).size);
  $('kpiDives').textContent    = fmtInt(state.data.dives.length);
  $('kpiSource').textContent   = raw._source || '—';
  $('kpiSource').dataset.source = raw._source || '';

  // Default years: 2024-2026 if present
  for (const y of [2024, 2025, 2026]) if (state.yearSet.has(y)) state.selectedYears.add(y);

  // Populate filters
  const levels = ['all', ...eventLevelOptions()];
  els.eventLevelFilter.innerHTML = levels.map(l => `<option value="${esc(l)}">${l === 'all' ? 'All levels' : esc(l)}</option>`).join('');
  const ages = ['all', ...ageGroupOptions()];
  els.ageGroupFilter.innerHTML = ages.map(a => `<option value="${esc(a)}">${a === 'all' ? 'All age groups' : esc(a)}</option>`).join('');

  // Athlete autocomplete options (top 500)
  const athletes = [...new Set(state.data.results.map(r => r.diver_name).filter(Boolean))].sort(sortStr).slice(0, 500);
  $('athleteOptions').innerHTML = athletes.map(a => `<option value="${esc(a)}">`).join('');

  // Pickers
  renderYearPicker();
  renderMeetPicker();
  populateScopeSummary();

  // Show UI
  $('loadingPanel').hidden = true;
  $('mainContent').hidden  = false;

  // Wire events
  wireEvents();

  // Initial render
  recompute();
}

function wireEvents() {
  // Filter changes
  ['scopePreset','eventLevelFilter','ageGroupFilter','genderFilter','boardFilter','groupFilter','heatmapMetric'].forEach(id =>
    els[id].addEventListener('change', () => { populateScopeSummary(); recompute(); })
  );
  els.placementCutoff.addEventListener('input', recompute);
  els.athleteSearch.addEventListener('input', () => {
    clearTimeout(els.athleteSearch._t);
    els.athleteSearch._t = setTimeout(recompute, 150);
  });

  // Year picker
  els.yearSearch.addEventListener('input', renderYearPicker);
  $('yearPicker').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    const y = Number(e.target.value);
    if (e.target.checked) state.selectedYears.add(y);
    else state.selectedYears.delete(y);
    recompute();
  });
  $('yearUseAll').addEventListener('click', () => {
    state.selectedYears = new Set(state.yearSet);
    renderYearPicker(); recompute();
  });
  $('yearRecent').addEventListener('click', () => {
    state.selectedYears = new Set([2024, 2025, 2026].filter(y => state.yearSet.has(y)));
    renderYearPicker(); recompute();
  });
  $('yearClear').addEventListener('click', () => {
    state.selectedYears = new Set();
    renderYearPicker(); recompute();
  });

  // Meet picker
  els.meetSearch.addEventListener('input', renderMeetPicker);
  $('meetPicker').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    if (e.target.checked) state.selectedMeets.add(e.target.value);
    else state.selectedMeets.delete(e.target.value);
    recompute();
  });
  $('meetUseAll').addEventListener('click', () => {
    state.selectedMeets = new Set([...state.meetsById.keys()]);
    renderMeetPicker(); recompute();
  });
  $('meetClear').addEventListener('click', () => {
    state.selectedMeets = new Set();
    renderMeetPicker(); recompute();
  });

  // Sortable leaderboard headers
  const lbTable = $('leaderboardTable');
  if (lbTable) {
    lbTable.querySelector('thead').addEventListener('click', (e) => {
      const th = e.target.closest('th.sortable');
      if (!th) return;
      const key = th.dataset.sort;
      if (state.leaderboardSort.key === key) {
        state.leaderboardSort.dir = state.leaderboardSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.leaderboardSort.key = key;
        // Default to descending for numeric, ascending for text
        state.leaderboardSort.dir = ['name','team','gender'].includes(key) ? 'asc' : 'desc';
      }
      renderLeaderboard();
    });
  }
}

// ── Go ────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

})();
