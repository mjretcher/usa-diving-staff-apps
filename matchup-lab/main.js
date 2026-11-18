/* ============================================================
   Matchup Lab — synchro & mixed-pair scouting from voluntary dives.

   Why voluntaries: in junior synchro the required dives carry an
   assigned DD, so the score is pure execution quality — the best
   available proxy for "will these two look clean on the same list."
   Data: core.dive_sheets rows with optional_voluntary = 'V', which
   exist for 2025 Junior Nationals (11609) and 2026 World Junior
   Trials (12838); 2026 Junior Nationals (12923) joins when it posts.

   Pairings (advisory only) are ranked by a projected synchro total from
   hp_models Model 7 (db/scripts/build_hp_models.py):
     - shape: how the synchronisation mark follows the two divers' execution
       marks, measured on World Aquatics synchro dives with full panels
     - carry-over: synchro execution from individual execution
     - level: an offset from US pairs whose result names both partners
   The list is 2 required dives at DD 2.0 and 3 optionals at the mean of the
   partners' typical optional DD. If the model tables are not available the
   panel says so rather than falling back to a made-up score.
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

const state = { profiles: [], selected: new Set(), sortKey: 'avg', sortDesc: true, filter: '', rowsRead: 0, pairView: 'distinct' };

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

// Model 7 tables, read once per board. `syn.ath` is keyed by diver id.
const syn = { fit: null, off: null, ath: new Map(), board: null, error: null };
const REQ_DD = 2.0, N_REQ = 2, N_OPT = 3;
async function loadSynchroModel(discipline) {
  if (syn.board === discipline && (syn.fit || syn.error)) return;
  syn.board = discipline; syn.error = null; syn.ath = new Map();
  try {
    if (!syn.fit) {
      const [f, o] = await Promise.all([
        nq(`SELECT a, b, c, c0, c1, n_wa_dives, n_carry FROM hp_models.synchro_fit LIMIT 1`),
        nq(`SELECT dive_type, award_offset, n_pairs_total, pair_award_sd, mean_abs_error_pts FROM hp_models.synchro_offsets WHERE level = 'Junior'`),
      ]);
      if (!f.rows.length || o.rows.length < 2) throw new Error('synchro model tables are empty');
      const fit = {}; for (const k of Object.keys(f.rows[0])) fit[k] = Number(f.rows[0][k]);
      const off = { nPairs: Number(o.rows[0].n_pairs_total), sd: Number(o.rows[0].pair_award_sd), mae: Number(o.rows[0].mean_abs_error_pts) };
      for (const r of o.rows) off[r.dive_type] = Number(r.award_offset);
      if (![fit.a, fit.b, fit.c, fit.c0, fit.c1, off.required, off.optional, off.sd].every(isNum)) throw new Error('synchro model values are incomplete');
      syn.fit = fit; syn.off = off;
    }
    const a = await nq(
      `SELECT diver_id, season, exec_req, n_req, exec_opt, n_opt, dd_opt FROM hp_models.synchro_athlete WHERE discipline = $1`, [discipline]);
    for (const r of a.rows) {
      const rec = { season: Number(r.season), execReq: Number(r.exec_req), nReq: Number(r.n_req), execOpt: Number(r.exec_opt), nOpt: Number(r.n_opt), ddOpt: r.dd_opt == null ? null : Number(r.dd_opt) };
      if (isNum(rec.execReq) && isNum(rec.execOpt) && isNum(rec.ddOpt)) syn.ath.set(String(r.diver_id), rec);
    }
  } catch (err) {
    syn.error = err.message || String(err); syn.fit = null; syn.off = null;
  }
}

// Mirrors syn_pair_award() in db/scripts/build_hp_models.py. Keep the two identical.
function synAward(ia, ib, fit) {
  const ea = fit.c0 + fit.c1 * ia, eb = fit.c0 + fit.c1 * ib;
  const s = fit.a + fit.b * (ea + eb) / 2 + fit.c * Math.abs(ea - eb);
  return (ea + eb + 3 * s) / 5;
}
const clampAward = (v) => Math.max(0, Math.min(10, v));

function projectPair(a, b) {
  if (!syn.fit) return null;
  const ra = syn.ath.get(String(a.id)), rb = syn.ath.get(String(b.id));
  if (!ra || !rb) return null;
  const req = clampAward(synAward(ra.execReq, rb.execReq, syn.fit) + syn.off.required);
  const opt = clampAward(synAward(ra.execOpt, rb.execOpt, syn.fit) + syn.off.optional);
  const ddOpt = (ra.ddOpt + rb.ddOpt) / 2;
  const ddSum = N_REQ * REQ_DD + N_OPT * ddOpt;
  const total = 3 * (N_REQ * REQ_DD * req + N_OPT * ddOpt * opt);
  const half = 1.2816 * 3 * ddSum * syn.off.sd;   // middle 80% of checked pairs
  return { total, lo: total - half, hi: total + half, req, opt, ddOpt, ddSum, shared: sharedDives(a, b) };
}

function buildPairs(profiles, mode) {
  const pairs = [];
  let noRecord = 0;
  const usable = profiles.filter(p => { const ok = syn.ath.has(String(p.id)); if (!ok) noRecord++; return ok; });
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const a = usable[i], b = usable[j];
      if (mode === 'Mixed') { if (a.gender === b.gender) continue; }
      else { if (a.gender !== b.gender) continue; }
      const pr = projectPair(a, b);
      if (pr) pairs.push({ a, b, ...pr });
    }
  }
  pairs.sort((x, y) => y.total - x.total);
  return { pairs, noRecord };
}

// Three ways to read the same ranking. "Each athlete once" walks down the
// ranking and keeps a pair only if neither athlete is already placed, which
// gives a squad of distinct pairs instead of the same few names repeated.
function pairView(all, view) {
  if (view === 'club') return all.filter(p => p.a.team && p.a.team === p.b.team);
  if (view !== 'distinct') return all;
  const used = new Set(), out = [];
  for (const p of all) {
    if (used.has(p.a.id) || used.has(p.b.id)) continue;
    used.add(p.a.id); used.add(p.b.id); out.push(p);
    if (out.length >= PAIRS_SHOWN) break;
  }
  return out;
}
const PAIRS_SHOWN = 15;

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
      <td><span class="ml-name">${esc(p.name)}</span>${p.gender === 'Male' ? '<span class="ml-g ml-g-m">M</span>' : '<span class="ml-g ml-g-f">F</span>'}<span class="ml-club-sub">${esc(p.team)} · Group ${esc(p.group)}</span></td>
      <td class="small ml-c-club">${esc(p.team)}</td>
      <td class="ml-c-group">${esc(p.group)}</td>
      <td class="num ml-c-dives">${p.dives}</td>
      <td class="num"><strong>${f1(p.avg)}</strong></td>
      <td class="ml-bar-col"><div class="ml-bar" title="Field ${f1(lo)}–${f1(hi)}, mean ${f1(fieldMean)}"><i class="${p.avg >= fieldMean ? 'hi' : ''}" style="width:${pct(p.avg).toFixed(1)}%"></i><s style="left:${pct(fieldMean).toFixed(1)}%"></s></div></td>
      <td class="num">${isNum(p.bestTotal) ? f1(p.bestTotal) + `<span class="ml-sub">${p.bestTotalDives} dives</span>` : '<span class="ml-na" title="No round with the full voluntary list on file">—</span>'}</td>
      <td class="num ml-c-spread">${f1(p.consistency)}<span class="ml-sub">σ per dive</span></td>
      <td class="small ml-c-meets">${esc(p.meets)}</td>
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
  let pairLine = '';
  if (picks.length === 2) {
    const mode = $('mlMode').value;
    const okMix = mode === 'Mixed' ? picks[0].gender !== picks[1].gender : picks[0].gender === picks[1].gender;
    const pr = okMix ? projectPair(picks[0], picks[1]) : null;
    if (pr) pairLine = `<div class="ml-cc-proj"><span>As a pair</span><b>${Math.round(pr.total)}</b>
        <span>projected synchro total · likely ${Math.round(pr.lo)} to ${Math.round(pr.hi)} · list DD ${pr.ddSum.toFixed(1)} · ${pr.shared} voluntary dive${pr.shared === 1 ? '' : 's'} in common</span></div>`;
    else if (okMix && syn.fit) pairLine = `<div class="ml-cc-proj is-none"><span>No pair projection: one of these athletes has fewer than five scored dives on this board in the last two seasons.</span></div>`;
  }
  $('mlCompareBody').innerHTML = pairLine + `<div class="ml-compare-grid" style="--cols:${picks.length}">` + picks.map(p => `
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
  if (!syn.fit) {
    $('mlPairsSub').textContent = 'Projected synchro totals for every possible pair in scope.';
    $('mlPairsBody').innerHTML = `<div class="ml-empty-inline">The synchro projection could not be read${syn.error ? ' (' + esc(syn.error) + ')' : ''}, so no pairs are ranked. The athlete table and side-by-side above are unaffected.</div>`;
    return;
  }
  const { pairs: all, noRecord } = buildPairs(state.profiles, mode);
  const o = syn.off;
  $('mlPairsSub').textContent =
    `${mode === 'Mixed' ? 'One boy and one girl per pair. ' : ''}Projected synchro total on a ${N_REQ} required + ${N_OPT} optional list, from each athlete's own season record. ` +
    `Checked against ${o.nPairs} US junior pairs: typical miss ${Math.round(o.mae)} points. Advisory only.`;
  if (!all.length) { $('mlPairsBody').innerHTML = '<div class="ml-empty-inline">Not enough athletes in scope with a season record to form pairs.</div>'; return; }
  const view = state.pairView;
  const shown = pairView(all, view).slice(0, PAIRS_SHOWN);
  const top = all[0].total, half = all[0].hi - all[0].total;
  const inReach = all.filter(p => p.total >= top - half).length;
  const mid = all[Math.floor(all.length / 2)].total;
  // Axis runs from the middle possible pair to the best case, so a bar shows
  // how far a pair sits above an ordinary pairing, not just above its neighbours.
  const lo = Math.min(mid - half * 0.25, ...shown.map(p => p.lo)), hi = Math.max(...all.slice(0, 1).map(p => p.hi), ...shown.map(p => p.hi)), span = Math.max(hi - lo, 1);
  const x = (v) => Math.max(0, Math.min(100, (v - lo) / span * 100));
  const tabs = [['distinct', 'Each athlete once'], ['all', 'Top pairs'], ['club', 'Same club']];
  $('mlPairsBody').innerHTML = `
    <div class="ml-pairs-head">
      <p class="ml-pairs-lead"><b>${inReach.toLocaleString()}</b> of ${all.length.toLocaleString()} possible pairs are within reach of the top projection (${Math.round(top)}). Individual records cannot separate them; timing, body type and who can train together decide it.</p>
      <div class="ml-seg" role="tablist" aria-label="Which pairs to list">${tabs.map(([k, label]) => `<button type="button" role="tab" data-view="${k}" class="${k === view ? 'is-on' : ''}" aria-selected="${k === view}">${label}</button>`).join('')}</div>
    </div>` + (shown.length ? `<div class="ml-pairs">` + shown.map((p, i) => `
    <div class="ml-pair">
      <span class="ml-pair-rank">#${view === 'all' ? i + 1 : all.indexOf(p) + 1}</span>
      <span class="ml-pair-names"><span class="ml-pair-line"><b>${esc(p.a.name)}</b><span>+</span><b>${esc(p.b.name)}</b></span>
        <em>${esc(p.a.team)}${p.a.team === p.b.team ? ' (same club)' : ' / ' + esc(p.b.team)}</em></span>
      <span class="ml-pair-proj" title="Required dives: award ${p.req.toFixed(2)} at DD ${REQ_DD.toFixed(1)}. Optionals: award ${p.opt.toFixed(2)} at DD ${p.ddOpt.toFixed(2)}.">
        <b>${Math.round(p.total)}</b>
        <span class="ml-pair-range"><u style="left:${x(mid).toFixed(1)}%"></u><i style="left:${x(p.lo).toFixed(1)}%;width:${(x(p.hi) - x(p.lo)).toFixed(1)}%"></i><s style="left:${x(p.total).toFixed(1)}%"></s></span>
        <em>${Math.round(p.lo)} to ${Math.round(p.hi)} · list DD ${p.ddSum.toFixed(1)} · ${p.shared} shared vol.</em></span>
    </div>`).join('') + `</div>` : `<div class="ml-empty-inline">No two athletes in this scope are at the same club.</div>`) + `
    <div class="ml-pairs-foot">
      <p><b>How to read it.</b> The number is the projected total and # is the pair's place among all possible pairs. The bar is where 8 in 10 checked pairs landed around their projection (about ±${Math.round(half)} points); pairs whose bars overlap are not separated by this evidence. The grey tick is the middle possible pair in this scope (${Math.round(mid)}).</p>
      <p><b>What it is built from.</b> ${Math.round(syn.fit.n_wa_dives).toLocaleString()} World Aquatics synchro dives with full judging panels set how the synchronisation mark follows the two divers' execution, and the level is set from the ${o.nPairs} US junior pairs whose results name both partners (2026 Junior Nationals). It reads each athlete's individual record on this board; it does not know how two athletes time together.</p>
      <p>${noRecord ? `${noRecord} athlete${noRecord === 1 ? '' : 's'} in scope left out (fewer than five scored dives on this board in the last two seasons) · ` : ''}shared vol. = voluntary dives both have performed.</p>
    </div>`;
  $('mlPairsBody').querySelectorAll('.ml-seg button').forEach(btn => btn.addEventListener('click', () => {
    const y = window.scrollY; state.pairView = btn.dataset.view; renderPairs(); window.scrollTo(0, y);
  }));
}

/* ── Flow ─────────────────────────────────────────────────── */
async function loadField() {
  const seq = ++loadSeq;
  $('mlEmpty').classList.remove('error');
  $('mlEmpty').hidden = true; $('mlResults').hidden = true; $('mlLoading').hidden = false;
  try {
    const [rows] = await Promise.all([
      loadVoluntaryRows($('mlDiscipline').value, $('mlMeets').value),
      loadSynchroModel($('mlDiscipline').value),
    ]);
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
  window.__ML_TEST__ = { buildProfiles, buildPairs, projectPair, synAward, syn, groupOf, state };
}
function start() { wire(); loadField(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

})();
