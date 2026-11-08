/* ============================================================
   Matchup Lab — synchro & mixed-pair scouting from voluntary dives.

   Why voluntaries: in junior synchro the required dives carry an
   assigned DD, so the score is pure execution quality — the best
   available proxy for "will these two look clean on the same list."
   Data: core.dive_sheets rows with optional_voluntary = 'V', which
   exist for 2025 Junior Nationals (11609) and 2026 World Junior
   Trials (12838); 2026 Junior Nationals (12923) joins when it posts.

   Pair score (explained in the UI, advisory only):
     combined = athlete A avg/dive + athlete B avg/dive
     bonus    = +1.0 per distinct voluntary dive number both have
                performed (capped at +5) — a shared list is easier
                to build than a new one
     balance  = -0.5 × |A avg − B avg| — a pair is only as clean as
                its rougher half, so lopsided pairs rank down
   ============================================================ */
(function () {
'use strict';

const $ = (id) => document.getElementById(id);
function nq(sql, params) { return window.NEON.query(sql, (params || []).map(String)); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const f1 = (n) => isNum(n) ? n.toFixed(1) : '—';
const f2 = (n) => isNum(n) ? n.toFixed(2) : '—';

const MEET_NAMES = { '11609': '2025 Jr Nationals', '12838': '2026 Trials', '12923': '2026 Jr Nationals' };
const ALL_MEETS = ['11609', '12838', '12923'];

const state = { profiles: [], selected: new Set(), sortKey: 'avg', sortDesc: true, filter: '', rowsRead: 0 };

/* ── Data ──────────────────────────────────────────────────── */
// Era note: both covered meets are 2025+, where junior brackets are ALSO
// encoded in event names ("Group A Boys 1m (16-18)"). Parse from event_name.
function groupOf(eventName) {
  const m = /Group\s+([ABCD])/i.exec(eventName || '');
  return m ? m[1].toUpperCase() : null;
}

async function loadVoluntaryRows(discipline, meets) {
  const meetIds = meets === 'all' ? ALL_MEETS : [meets];
  const r = await nq(
    `SELECT diver_id, diver_name, team_name, gender, meet_id, event_id, event_name,
            result_set_id, dive_number, score
     FROM core.dive_sheets
     WHERE optional_voluntary = 'V'
       AND discipline = $1
       AND meet_id = ANY(string_to_array($2, ','))
       AND score IS NOT NULL
       AND diver_name IS NOT NULL AND diver_name <> ''`,
    [discipline, meetIds.join(',')]
  );
  return r.rows.map(row => ({
    ...row,
    score: Number(row.score),
    group: groupOf(row.event_name),
  }));
}

/* ── Profile building ─────────────────────────────────────── */
// A round only counts toward "best voluntary total" when it holds the full
// voluntary list for that event. The full count is the most common per-round
// voluntary count across the whole field in that event (5 for A/B), so a
// round where the scrape caught one voluntary dive never posts as a "total".
function fullVolCountByEvent(rows) {
  const perRound = new Map(); // event_name -> Map(roundKey -> n)
  for (const r of rows) {
    const ev = r.event_name || '';
    if (!perRound.has(ev)) perRound.set(ev, new Map());
    const m = perRound.get(ev);
    const k = `${r.meet_id}|${r.event_id}|${r.result_set_id}|${r.diver_id}`;
    m.set(k, (m.get(k) || 0) + 1);
  }
  const out = new Map();
  for (const [ev, m] of perRound) {
    const freq = new Map();
    for (const n of m.values()) freq.set(n, (freq.get(n) || 0) + 1);
    let best = 0, bestN = 0;
    for (const [n, f] of freq) if (f > bestN || (f === bestN && n > best)) { best = n; bestN = f; }
    out.set(ev, best);
  }
  return out;
}

function buildProfiles(rows, mode, group) {
  const byDiver = new Map();
  const fullCount = fullVolCountByEvent(rows);
  for (const r of rows) {
    if (mode !== 'Mixed' && r.gender !== mode) continue;
    if (mode === 'Mixed' && r.gender !== 'Male' && r.gender !== 'Female') continue;
    const g = r.group !== undefined ? r.group : groupOf(r.event_name);
    if (group === 'all') { if (g !== 'A' && g !== 'B') continue; }
    else if (g !== group) continue;
    const k = r.diver_id;
    if (!byDiver.has(k)) byDiver.set(k, { id: k, name: r.diver_name, team: r.team_name, gender: r.gender, groups: new Set(), meets: new Set(), dives: [], byRound: new Map() });
    const p = byDiver.get(k);
    if (g) p.groups.add(g);
    p.meets.add(r.meet_id);
    p.dives.push(r);
    const roundKey = `${r.meet_id}|${r.event_id}|${r.result_set_id}`;
    if (!p.byRound.has(roundKey)) p.byRound.set(roundKey, { total: 0, n: 0, full: fullCount.get(r.event_name || '') || 0 });
    const rr = p.byRound.get(roundKey); rr.total += r.score; rr.n += 1;
  }
  const out = [];
  for (const p of byDiver.values()) {
    const scores = p.dives.map(d => d.score);
    const n = scores.length;
    if (n < 2) continue; // one stray voluntary is not a record
    const avg = scores.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(scores.reduce((a, b) => a + (b - avg) ** 2, 0) / n);
    const completeRounds = [...p.byRound.values()].filter(rr => rr.full > 0 && rr.n === rr.full);
    const bestTotal = completeRounds.length ? Math.max(...completeRounds.map(rr => rr.total)) : null;
    const bestTotalDives = completeRounds.length ? completeRounds.find(rr => rr.total === bestTotal).n : null;
    const diveNums = new Set(p.dives.map(d => d.dive_number));
    out.push({
      id: p.id, name: p.name, team: p.team, gender: p.gender,
      group: [...p.groups].sort().join('/') || '—',
      meets: [...p.meets].map(m => MEET_NAMES[m] || m).join(', '),
      dives: n, avg, consistency: sd, bestTotal, bestTotalDives, diveNums,
      perDive: aggregatePerDive(p.dives),
    });
  }
  return out;
}

function aggregatePerDive(dives) {
  const m = new Map();
  for (const d of dives) {
    if (!m.has(d.dive_number)) m.set(d.dive_number, { num: d.dive_number, scores: [] });
    m.get(d.dive_number).scores.push(d.score);
  }
  return [...m.values()].map(v => ({
    num: v.num,
    n: v.scores.length,
    avg: v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
  })).sort((a, b) => b.avg - a.avg);
}

/* ── Pairing ──────────────────────────────────────────────── */
function sharedDives(a, b) {
  let s = 0;
  for (const num of a.diveNums) if (b.diveNums.has(num)) s++;
  return s;
}

function pairScore(a, b) {
  const combined = a.avg + b.avg;
  const shared = Math.min(sharedDives(a, b), 5);
  const balancePenalty = 0.5 * Math.abs(a.avg - b.avg);
  return { total: combined + shared * 1.0 - balancePenalty, combined, shared: sharedDives(a, b), balancePenalty };
}

function buildPairs(profiles, mode) {
  const pairs = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const a = profiles[i], b = profiles[j];
      if (mode === 'Mixed') { if (a.gender === b.gender) continue; }
      else { if (a.gender !== b.gender) continue; }
      pairs.push({ a, b, ...pairScore(a, b) });
    }
  }
  pairs.sort((x, y) => y.total - x.total);
  return pairs.slice(0, 15);
}

/* ── Rendering ────────────────────────────────────────────── */
function sortProfiles() {
  const k = state.sortKey, d = state.sortDesc ? -1 : 1;
  state.profiles.sort((a, b) => {
    const av = a[k], bv = b[k];
    if (typeof av === 'string') return d * String(av).localeCompare(String(bv));
    return d * ((av ?? -Infinity) - (bv ?? -Infinity));
  });
}

function renderProfiles() {
  sortProfiles();
  const all = state.profiles;
  const q = state.filter.trim().toLowerCase();
  const shown = q ? all.filter(p => (p.name + ' ' + p.team).toLowerCase().includes(q)) : all;
  $('mlProfilesSub').textContent =
    `${all.length} athletes with 2+ voluntary dives in scope` + (q ? ` · ${shown.length} match "${state.filter.trim()}"` : '') +
    `. Tick two or more to compare dive by dive.`;
  const avgs = all.map(p => p.avg);
  const lo = Math.min(...avgs), hi = Math.max(...avgs), fieldMean = avgs.reduce((a, b) => a + b, 0) / (avgs.length || 1);
  const span = Math.max(hi - lo, 0.01);
  const pct = (v) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));
  $('mlProfileRows').innerHTML = shown.map(p => `
    <tr class="${state.selected.has(p.id) ? 'ml-row-picked' : ''}">
      <td><input type="checkbox" class="ml-pick" data-id="${esc(p.id)}" ${state.selected.has(p.id) ? 'checked' : ''} aria-label="Compare ${esc(p.name)}"></td>
      <td><span class="ml-name">${esc(p.name)}</span>${p.gender === 'Male' ? '<span class="ml-g ml-g-m">M</span>' : '<span class="ml-g ml-g-f">F</span>'}</td>
      <td class="small">${esc(p.team)}</td>
      <td>${esc(p.group)}</td>
      <td class="num">${p.dives}</td>
      <td class="num"><strong>${f1(p.avg)}</strong></td>
      <td><div class="ml-bar" title="Field ${f1(lo)}–${f1(hi)}, mean ${f1(fieldMean)}"><i class="${p.avg >= fieldMean ? 'hi' : ''}" style="width:${pct(p.avg).toFixed(1)}%"></i><s style="left:${pct(fieldMean).toFixed(1)}%"></s></div></td>
      <td class="num">${isNum(p.bestTotal) ? f1(p.bestTotal) + `<span class="ml-sub">${p.bestTotalDives} dives</span>` : '<span class="ml-na" title="No round with the full voluntary list on file">—</span>'}</td>
      <td class="num">${f1(p.consistency)}<span class="ml-sub">σ per dive</span></td>
      <td class="small">${esc(p.meets)}</td>
    </tr>`).join('');
  document.querySelectorAll('.ml-pick').forEach(cb => cb.addEventListener('change', (e) => {
    const id = e.target.dataset.id;
    if (e.target.checked) state.selected.add(id); else state.selected.delete(id);
    e.target.closest('tr').classList.toggle('ml-row-picked', e.target.checked);
    $('mlClearPicks').hidden = state.selected.size === 0;
    renderCompare();
  }));
  $('mlClearPicks').hidden = state.selected.size === 0;
}

function renderKpis(rows) {
  const all = state.profiles;
  const avgs = all.map(p => p.avg);
  const mean = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
  const top = all.length ? all.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;
  $('mlKpiN').textContent = all.length;
  $('mlKpiAvg').textContent = f1(mean);
  $('mlKpiTop').textContent = top ? f1(top.avg) : '—';
  $('mlKpiTopWho').textContent = top ? `${top.name} · ${top.team}` : '—';
  $('mlKpiDivesBody').textContent = rows.length.toLocaleString();
  const meets = new Set(rows.map(r => r.meet_id));
  $('mlKpiMeets').textContent = `actual · scored dives across ${meets.size} meet${meets.size === 1 ? '' : 's'}`;
  $('mlKpiAthletes').textContent = all.length;
  $('mlKpiDives').textContent = rows.length.toLocaleString();
}

function renderCompare() {
  const picks = state.profiles.filter(p => state.selected.has(p.id));
  const panel = $('mlComparePanel');
  if (picks.length < 2) { panel.hidden = true; return; }
  panel.hidden = false;
  // dive numbers shared by ALL picked athletes get the highlight
  const sharedAll = picks.slice(1).reduce(
    (acc, p) => new Set([...acc].filter(n => p.diveNums.has(n))),
    new Set(picks[0].diveNums)
  );
  $('mlCompareBody').innerHTML = `<div class="ml-compare-grid" style="--cols:${picks.length}">` + picks.map(p => `
    <div class="ml-compare-card">
      <div class="ml-cc-head"><b>${esc(p.name)}</b><span>${esc(p.team)} · ${esc(p.group)}</span>
        <span class="ml-cc-kpis">${p.dives} vol dives · avg <b>${f1(p.avg)}</b> · σ ${f1(p.consistency)}</span></div>
      <div class="ml-cc-dives">${p.perDive.map(d => `
        <div class="ml-cc-dive ${sharedAll.has(d.num) ? 'is-shared' : ''}">
          <span class="mono">${esc(d.num)}</span><span class="num">${f1(d.avg)}</span><span class="small">×${d.n}</span>
        </div>`).join('')}</div>
    </div>`).join('') + `</div>
    <div class="ml-cc-foot"><span class="ml-cc-shared-swatch"></span> voluntary dive every ticked athlete has performed. Avg is points per dive; ×n is how many times it was performed in scope.</div>`;
}

function renderPairs() {
  const mode = $('mlMode').value;
  const pairs = buildPairs(state.profiles, mode);
  $('mlPairsSub').textContent = mode === 'Mixed'
    ? 'One boy + one girl per pair, ranked by combined voluntary execution, shared-dive bonus, and balance. Advisory only.'
    : 'Ranked by combined voluntary execution, shared-dive bonus, and balance. Advisory only.';
  if (!pairs.length) { $('mlPairsBody').innerHTML = '<div class="ml-empty-inline">Not enough athletes in scope to form pairs.</div>'; return; }
  $('mlPairsBody').innerHTML = `<div class="ml-pairs">` + pairs.map((p, i) => `
    <div class="ml-pair">
      <span class="ml-pair-rank">#${i + 1}</span>
      <span class="ml-pair-names"><span class="ml-pair-line"><b>${esc(p.a.name)}</b><span>+</span><b>${esc(p.b.name)}</b></span>
        <em>${esc(p.a.team)}${p.a.team === p.b.team ? ' (same club)' : ' / ' + esc(p.b.team)}</em></span>
      <span class="ml-pair-math" title="combined avg + shared-dive bonus − balance penalty">
        ${f1(p.combined)} combined
        <em class="up">+${Math.min(p.shared,5)}.0 (${p.shared} shared dives)</em>
        <em class="down">−${f1(p.balancePenalty)} balance</em>
        = <b>${f1(p.total)}</b></span>
    </div>`).join('') + `</div>
    <div class="ml-pairs-foot">Pair score = A avg/dive + B avg/dive, +1.0 per shared voluntary dive (max +5),
    −0.5 × the gap between their averages (a pair is only as clean as its rougher half).</div>`;
}

/* ── Flow ─────────────────────────────────────────────────── */
async function loadField() {
  const seq = ++loadSeq;
  $('mlEmpty').classList.remove('error');
  $('mlEmpty').hidden = true; $('mlResults').hidden = true; $('mlLoading').hidden = false;
  try {
    const rows = await loadVoluntaryRows($('mlDiscipline').value, $('mlMeets').value);
    if (seq !== loadSeq) return; // a newer selection superseded this one
    state.profiles = buildProfiles(rows, $('mlMode').value, $('mlGroup').value);
    state.selected.clear();
    $('mlLoading').hidden = true;
    if (!state.profiles.length) {
      $('mlEmpty').hidden = false;
      $('mlEmpty').innerHTML = '<b>No athletes with two or more voluntary dives in this scope.</b><span>Platform fields are small. Try all three meets, or the combined Group A + B scope.</span>';
      $('mlKpiAthletes').textContent = '0'; $('mlKpiDives').textContent = rows.length.toLocaleString();
      return;
    }
    $('mlResults').hidden = false;
    renderKpis(rows); renderProfiles(); renderCompare(); renderPairs();
  } catch (err) {
    if (seq !== loadSeq) return;
    $('mlLoading').hidden = true; $('mlEmpty').hidden = false;
    $('mlEmpty').classList.add('error');
    $('mlEmpty').innerHTML = '<b>Could not read the dive sheets from the database.</b><span>' + esc(err.message || String(err)) + '</span>';
  }
}

let loadSeq = 0;
function wire() {
  $('mlLoad').addEventListener('click', loadField);
  ['mlDiscipline', 'mlMode', 'mlGroup', 'mlMeets'].forEach(id => $(id).addEventListener('change', loadField));
  $('mlFilter').addEventListener('input', (e) => { state.filter = e.target.value; renderProfiles(); });
  $('mlClearPicks').addEventListener('click', () => { state.selected.clear(); renderProfiles(); renderCompare(); });
  document.querySelectorAll('#mlProfileTable th.sortable').forEach(th => th.addEventListener('click', () => {
    const k = th.dataset.sort;
    if (state.sortKey === k) state.sortDesc = !state.sortDesc; else { state.sortKey = k; state.sortDesc = true; }
    document.querySelectorAll('#mlProfileTable th.sortable').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
    th.classList.add(state.sortDesc ? 'sort-desc' : 'sort-asc');
    renderProfiles(); renderCompare();
  }));
}

if (typeof window !== 'undefined') {
  window.__ML_TEST__ = { buildProfiles, buildPairs, pairScore, groupOf, state };
}
function start() { wire(); loadField(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

})();
