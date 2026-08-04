/* ============================================================
   ae-podium.js — Podium Gap. Any list total is exactly
       total = 3 x (list DD) x (DD-weighted execution)
   so the gap to a world line decomposes into two moves:
       step 1 (difficulty): carry a world finalist's list DD at the
                            athlete's current execution
       step 2 (execution):  lift execution to what the target then
                            requires
   The two steps sum exactly to the gap — no fudge term.
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr, mean } = window.AE;
  const C = window.AECharts;
  const st = { board: null, targetKey: null, ddMode: 'avg', scope: 'world' };
  // benchmarks() keys on competition_family; field tables key on scope.
  const FAMILY = { world: 'World Aquatics', ncaa: 'NCAA' };
  const scopeLabel = () => {
    const s2 = (window.AE.SCOPES || []).find((x) => x.id === st.scope);
    return s2 ? s2.label : st.scope;
  };
  const f1 = (v) => v == null ? '—' : Number(v).toFixed(1);
  const f2 = (v) => v == null ? '—' : Number(v).toFixed(2);

  function bestRecentFinal(b) {
    const finals = b.sheets.filter((r) => r.discipline === st.board && r.round_stage === 'Final' && window.AE.isIndiv(r) && r._exec != null && r.dd > 0);
    if (!finals.length) return null;
    const byList = new Map();
    finals.forEach((r) => {
      const k = r.meet_id + '|' + r.event_id;
      if (!byList.has(k)) byList.set(k, { rows: [], year: r.meet_year, meet: r.meet_id });
      byList.get(k).rows.push(r);
    });
    const lists = [...byList.values()];
    const maxYear = Math.max(...lists.map((l) => l.year));
    const recent = lists.filter((l) => l.year >= maxYear - 1);
    const pick = (recent.length ? recent : lists).reduce((a, l) =>
      l.rows.reduce((s, r) => s + r.score, 0) > a.rows.reduce((s, r) => s + r.score, 0) ? l : a);
    const D = pick.rows.reduce((s, r) => s + r.dd, 0);
    const total = pick.rows.reduce((s, r) => s + r.score, 0);
    const eHat = total / (3 * D);
    return { rows: pick.rows.sort((a, b2) => a.dive_order - b2.dive_order), year: pick.year, meet: pick.meet, D, total, eHat };
  }

  async function render(root) {
    const b = window.AE.state.bundle;
    if (!b) { root.innerHTML = window.AEApp.pickerPrompt('Pick an athlete to break their gap to the world podium into its two ingredients — difficulty and execution.'); return; }
    const boards = ['3m', 'Platform', '1m'].filter((d) => b.sheets.some((r) => r.discipline === d && r.round_stage === 'Final' && window.AE.isIndiv(r)));
    if (!boards.length) { root.innerHTML = `<div class="ae-card"><div class="ae-empty">Needs at least one Final round with dive sheets. The scraper is still back-filling — check back as coverage grows.</div></div>`; return; }
    if (!st.board || !boards.includes(st.board)) st.board = boards[0];
    const gender = (b.phases.find((p) => p.gender === 'Male' || p.gender === 'Female') || {}).gender;

    const cur = bestRecentFinal(b);
    let bench = [], listDD = [], groupExec = [];
    try {
      [bench, listDD, groupExec] = await Promise.all([
        window.AE.benchmarks(gender, st.board, FAMILY[st.scope] || 'USA Diving'),
        window.AE.fieldListDD(gender, st.board, st.scope),
        window.AE.fieldGroupExec(gender, st.board, st.scope),
      ]);
    } catch (e) {}

    const targets = [];
    bench.slice(0, 6).forEach((x) => {
      if (x.medal_score != null) targets.push({ key: x.meet_id + ':md', label: `Medal — ${x.meet_name}`, val: x.medal_score });
      if (x.final_cut != null) targets.push({ key: x.meet_id + ':fc', label: `Make the final — ${x.meet_name}`, val: x.final_cut });
      if (x.win_score != null) targets.push({ key: x.meet_id + ':w', label: `Win — ${x.meet_name}`, val: x.win_score });
    });
    if (!targets.length) { root.innerHTML = `<div class="ae-card"><div class="ae-empty">No ${esc(scopeLabel())} benchmarks available for ${esc(gender || '')} ${esc(st.board)} yet. Try another comparison field.</div></div>`; return; }
    if (!st.targetKey || !targets.some((t) => t.key === st.targetKey)) st.targetKey = targets[0].key;
    const target = targets.find((t) => t.key === st.targetKey);

    // A benchmark built on a handful of lists is not a benchmark. If nothing
    // clears the bar, say so rather than quietly using the thin one.
    const GUARD = (window.AE.GUARD || { athlete: 8, field: 150, cell: 20, lists: 6 });
    const fddOk = listDD.find((x) => (x.n_lists || 0) >= GUARD.lists) || null;
    const fddThin = fddOk ? null : (listDD[0] || null);
    const fdd = fddOk;
    const Db = fdd ? (st.ddMode === 'p90' ? fdd.p90_list_dd : fdd.avg_list_dd) : null;

    let waterfallHtml = fddThin
      ? `<div class="ae-empty">The ${esc(scopeLabel())} baseline for ${esc(gender || '')} ${esc(st.board)} rests on `
        + `${fddThin.n_lists || 0} finalist list${(fddThin.n_lists || 0) === 1 ? '' : 's'} — `
        + `too few to measure a gap against. Pick a larger comparison field.</div>`
      : '<div class="ae-empty">Field DD profile unavailable.</div>';
    let narrate = '';
    if (cur && Db != null && target) {
      const step1 = 3 * (Db - cur.D) * cur.eHat;
      const eB = target.val / (3 * Db);
      const step2 = 3 * Db * (eB - cur.eHat);
      const gap = target.val - cur.total;
      waterfallHtml = C.waterfall([
        { label: 'Current best list', value: cur.total, color: C.COLORS.NAVY },
        { label: 'Carry world DD', value: cur.total + step1, delta: step1, color: C.COLORS.POOL },
        { label: 'Lift execution', value: cur.total + step1 + step2, delta: step2, color: C.COLORS.SKY },
        { label: target.label.split('—')[0].trim(), value: target.val, color: C.COLORS.RED },
      ], { w: 700, h: 270 });
      const dNote = Db > cur.D
        ? `carrying a world ${st.ddMode === 'p90' ? 'top-decile' : 'average'} finalist's difficulty (${f1(Db)} vs your ${f1(cur.D)}) at your current execution is worth ${step1 >= 0 ? '+' : ''}${f1(step1)}`
        : `your list difficulty (${f1(cur.D)}) already exceeds the world ${st.ddMode === 'p90' ? 'top-decile' : 'average'} (${f1(Db)}) — difficulty gives back ${f1(step1)}`;
      narrate = gap <= 0
        ? `This list already clears the ${target.label.toLowerCase().split('—')[0].trim()} line by ${f1(-gap)} points. The remaining work is repeating it under lights.`
        : `The gap to "${target.label.split('—')[0].trim().toLowerCase()}" is ${f1(gap)} points: ${dNote}; the rest (${step2 >= 0 ? '+' : ''}${f1(step2)}) comes from lifting DD-weighted execution ${f2(cur.eHat)} → ${f2(eB)} per judge.`;
    }

    /* Radar: athlete last-2y exec by group vs field p50/p90 */
    const maxYear = Math.max(...b.sheets.map((r) => r.meet_year || 0));
    const own = b.sheets.filter((r) => r.discipline === st.board && window.AE.isIndiv(r) && r._exec != null && r.meet_year >= maxYear - 1);
    // Groups come from the shared rulebook order — the old ['1'..'6'] list
    // lost all four twisting directions and two of the three armstand ones.
    // Axes with no data on either side are dropped so the radar stays legible.
    const allCodes = window.AE.CAT_ORDER || ['1', '2', '3', '4'];
    const axes = allCodes
      .map((c) => ({ code: c, label: window.AE.CAT_NAMES[c] }))
      .filter((a) => a.label && (own.some((r) => r._cat === a.code)
        || groupExec.some((g) => g.category_code === a.code && g.n >= GUARD.cell)));
    const ownVals = axes.map((a) => {
      const ex = own.filter((r) => r._cat === a.code).map((r) => r._exec);
      return ex.length >= GUARD.athlete ? mean(ex) : null;
    });
    const fieldBy = (k) => axes.map((a) => {
      const rows = groupExec.filter((g) => g.category_code === a.code && g.n >= GUARD.cell);
      if (!rows.length) return null;
      return mean(rows.slice(0, 2).map((r) => r[k]));
    });

    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>Gap to the podium — ${esc(b.ident.display_name)}</h3>
          <p class="ae-soft">Because a list total is exactly 3 × list-DD × weighted execution, the road to any score splits cleanly into a difficulty move and an execution move. The two bars sum to the gap — nothing hidden.</p></div>
          <div class="ae-controls">
            ${boards.map((d) => `<button class="ae-pill ${d === st.board ? 'active' : ''}" onclick="AEPodium.setBoard('${escJsAttr(d)}')">${esc(d)}</button>`).join('')}
            <select class="ae-select" onchange="AEPodium.setScope(this.value)" title="Which field to measure against">
              ${(window.AE.SCOPES || []).map((sc) => `<option value="${esc(sc.id)}" ${sc.id === st.scope ? 'selected' : ''}>vs ${esc(sc.label)}</option>`).join('')}
            </select>
          </div>
        </div>

        ${cur ? `<div class="ae-chiprow" style="margin-bottom:10px">
          <span class="ae-chip">Baseline: best final list ${cur.year} — ${f1(cur.total)} pts</span>
          <span class="ae-chip">List DD ${f1(cur.D)} · execution ${f2(cur.eHat)}/judge</span>
          <span class="ae-chip ae-chip-soft">${cur.rows.map((r) => r.dive_number).join(' · ')}</span>
        </div>` : ''}

        <div class="ae-controls" style="margin-bottom:8px">
          <select class="ae-select" onchange="AEPodium.setTarget(this.value)">
            ${targets.map((t) => `<option value="${esc(t.key)}" ${t.key === st.targetKey ? 'selected' : ''}>${esc(t.label)} (${f1(t.val)})</option>`).join('')}
          </select>
          <button class="ae-pill ${st.ddMode === 'avg' ? 'active' : ''}" onclick="AEPodium.setDD('avg')">${esc(scopeLabel())} avg finalist DD${fdd ? ' ' + f1(fdd.avg_list_dd) : ''}</button>
          <button class="ae-pill ${st.ddMode === 'p90' ? 'active' : ''}" onclick="AEPodium.setDD('p90')">${esc(scopeLabel())} top-decile DD${fdd ? ' ' + f1(fdd.p90_list_dd) : ''}</button>
        </div>

        ${waterfallHtml}
        ${narrate ? `<div class="ae-narrate">${esc(narrate)}</div>` : ''}
      </div>

      <div class="ae-dual">
        <div class="ae-card">
          <div class="ae-card-h"><div><h3>Dive-group execution vs the world</h3>
            <p class="ae-soft">${esc(b.ident.display_name.split(' ')[0])}'s last two seasons (navy) against the ${esc(scopeLabel())} field — median (sky) and top performers (red outline). Gaps show where points leak.</p></div></div>
          ${C.radar(axes, [
            { values: fieldBy('p90_exec'), color: C.COLORS.RED, label: 'World p90', fillOpacity: 0.05 },
            { values: fieldBy('p50_exec'), color: C.COLORS.SKY, label: 'World median', fillOpacity: 0.14 },
            { values: ownVals, color: C.COLORS.NAVY, label: b.ident.display_name, fillOpacity: 0.2 },
          ], { w: 400, max: 10 })}
        </div>
        <div class="ae-card">
          <div class="ae-card-h"><div><h3>The moving target</h3>
            <p class="ae-soft">World final-cut and medal lines by season, with ${esc(b.ident.display_name.split(' ')[0])}'s best score each year. The question isn't the gap today — it's whether the lines converge by 2028.</p></div></div>
          <div id="aePodTrend">${trendChart(b, bench)}</div>
          <p class="ae-soft ae-samplenote">${fdd
            ? `Baseline: ${fdd.n_lists} ${esc(scopeLabel())} finalist lists. Radar axes need `
              + `${GUARD.athlete}+ dives from the athlete and ${GUARD.cell}+ in the field; thinner groups are omitted.`
            : `No ${esc(scopeLabel())} baseline meets the minimum of ${GUARD.lists} finalist lists.`}</p>
        </div>
      </div>`;
  }

  function trendChart(b, bench) {
    const own = new Map();
    b.phases.filter((p) => p.discipline === st.board && p.posted_score != null && !(p.is_synchronized === true))
      .forEach((p) => { own.set(p.meet_year, Math.max(own.get(p.meet_year) || 0, p.posted_score)); });
    const points = [...own.entries()].map(([y, v]) => ({ x: y + 0.5, y: v, color: C.COLORS.NAVY, big: true, label: `${y} season best: ${v.toFixed(1)}` }));
    const line = points.map((p) => ({ x: p.x, y: p.y })).sort((a, b2) => a.x - b2.x);
    bench.forEach((x) => {
      if (x.final_cut != null) points.push({ x: x.meet_year + 0.5, y: x.final_cut, color: C.COLORS.GOLD, label: `${x.meet_name} final cut: ${x.final_cut.toFixed(1)}` });
      if (x.medal_score != null) points.push({ x: x.meet_year + 0.5, y: x.medal_score, color: C.COLORS.RED, label: `${x.meet_name} medal: ${x.medal_score.toFixed(1)}` });
    });
    return C.trajectory({ points, line, refs: [], w: 460, h: 260 });
  }

  window.AEPodium = {
    setScope(v) { st.scope = v; st.targetKey = null; window.AEApp.rerender(); },
    render,
    setBoard(d) { st.board = d; window.AEApp.rerender(); },
    setTarget(k) { st.targetKey = k; window.AEApp.rerender(); },
    setDD(m) { st.ddMode = m; window.AEApp.rerender(); },
    onAthleteChange() { st.board = null; st.targetKey = null; },
    st,
  };
})();
