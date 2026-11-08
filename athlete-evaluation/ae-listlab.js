/* ============================================================
   ae-listlab.js — List Lab: build any list from the athlete's own
   competed dives and simulate it thousands of times against real
   World lines and the published standards.

   Engine (same method as hp_models.sim_athlete, Model 6):
   - every dive drawn from the athlete's own CHAMPIONSHIP-ADJUSTED execution
     record for that dive (Model 3 restatement), with probability n/(n+4);
     otherwise from the US field's record for that dive code on this board
     (analytics.dive_population), so two lucky attempts never read as certainty;
   - a shared per-competition good-day/bad-day draw, sd from the nightly model;
   - total = sum of 3 x DD x execution.
   The swap optimizer re-runs the whole list for every single-dive replacement
   the athlete has actually competed and ranks the swaps by the change in the
   probability of the chosen target.
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr, mean } = window.AE;
  const C = window.AECharts;
  const ITER = 4000;

  const st = { board: null, picked: new Set(), pinned: null, pinnedLabel: '', targetKey: null, custom: '', prior: new Map(), daySd: 0.3, std: null, weq: null, ctxKey: null };
  const K_OWN = 4;
  const WINTER_STD = { 'Female|1m': 235, 'Female|3m': 260, 'Female|Platform': 250, 'Male|1m': 318, 'Male|3m': 360, 'Male|Platform': 330 };

  // Field prior per dive code + day sd + World equivalent, loaded once per athlete/board.
  async function loadContext(b, gender) {
    const key = (b.ident.canonical_id) + '|' + st.board + '|' + gender;
    if (st.ctxKey === key) return;
    st.ctxKey = key; st.prior = new Map(); st.weq = null; st.std = WINTER_STD[gender + '|' + st.board] || null;
    const pool = poolFor(b);
    try {
      const pop = await window.AE.divePopulation('us-senior', gender, st.board, pool.map((p) => p.dive));
      pop.forEach((x, dive) => {
        // five quantiles widened into a 9-point sample space; good enough for a prior
        const qs = [x.p10_exec, x.p10_exec, x.p25_exec, x.p25_exec, x.p50_exec, x.p75_exec, x.p75_exec, x.p90_exec, x.p90_exec].filter((v) => v != null);
        if (qs.length >= 5) st.prior.set(dive, qs);
      });
    } catch (e) {}
    try {
      const r = await window.AE.q(`SELECT (SELECT day_sd FROM hp_models.sim_athlete WHERE gender = $1 AND discipline = $2 LIMIT 1) AS day_sd,
                                          (SELECT domestic_equiv_final FROM hp_models.world_standard_equiv WHERE gender = $1 AND discipline = $2) AS weq`, [gender, st.board]);
      const row = r.rows[0] || {};
      if (row.day_sd != null) st.daySd = Number(row.day_sd);
      if (row.weq != null) st.weq = Number(row.weq);
    } catch (e) {}
  }
  function gauss() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const f1 = (v) => v == null ? '—' : Number(v).toFixed(1);

  function boardsOf(b) {
    const s = new Set(b.sheets.filter((r) => window.AE.isIndiv(r) && r._exec != null).map((r) => r.discipline));
    return ['3m', 'Platform', '1m'].filter((d) => s.has(d));
  }

  function poolFor(b) {
    const rows = b.sheets.filter((r) => r.discipline === st.board && window.AE.isIndiv(r) && r._exec != null);
    return window.AE.diveStats(rows);
  }

  function latestFinalList(b) {
    const finals = b.sheets.filter((r) => r.discipline === st.board && r.round_stage === 'Final' && window.AE.isIndiv(r) && r._exec != null);
    if (!finals.length) return [];
    const latest = finals.reduce((a, r) => (r.meet_year > a.meet_year || (r.meet_year === a.meet_year && String(r.meet_id) > String(a.meet_id))) ? r : a);
    return finals.filter((r) => r.meet_id === latest.meet_id && r.event_id === latest.event_id)
      .sort((a, b2) => a.dive_order - b2.dive_order)
      .map((r) => r.dive_number + '@' + (r.height || r.discipline));
  }

  function catMeans(pool) {
    const by = {};
    pool.forEach((p) => {
      const c = p.cat || 'x';
      (by[c] = by[c] || []).push(...p.samples.map((s) => s.exec));
    });
    const out = {};
    Object.keys(by).forEach((c) => { out[c] = mean(by[c]); });
    out._all = mean(pool.flatMap((p) => p.samples.map((s) => s.exec)));
    return out;
  }

  function simulate(picks, cm, iter) {
    const N = iter || ITER;
    const spaces = picks.map((p) => {
      const own = p.samples.map((s) => s.adj != null ? s.adj : s.exec);
      const prior = st.prior.get(p.dive) || null;
      // No field record for this code: fall back to the athlete's own dive-group mean as before.
      const fallback = [cm[p.cat || '_all'] != null ? cm[p.cat] : cm._all];
      return { dd: p.dd, own, prior: prior || fallback, wOwn: own.length / (own.length + K_OWN), thin: own.length < 5, hasPrior: !!prior };
    });
    const totals = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const day = gauss() * st.daySd; let t = 0;
      for (const sp of spaces) {
        const src = (Math.random() < sp.wOwn && sp.own.length) ? sp.own : sp.prior;
        let e = src[(Math.random() * src.length) | 0] + day; if (e < 0) e = 0; if (e > 10) e = 10;
        t += 3 * sp.dd * e;
      }
      totals[i] = t;
    }
    const arr = Array.from(totals).sort((a, b) => a - b);
    return {
      totals: arr, mean: mean(arr),
      p10: window.AE.quantile(arr, 0.10), p50: window.AE.quantile(arr, 0.5), p90: window.AE.quantile(arr, 0.90),
      thin: spaces.filter((s) => s.thin).length, noPrior: spaces.filter((s) => !s.hasPrior).length,
      pAtLeast(x) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; } return (arr.length - lo) / arr.length; },
      listDD: picks.reduce((s, p) => s + (p.dd || 0), 0),
    };
  }

  // Swap optimizer: every single-dive replacement from the athlete's competed
  // dives, same dive group as the dive it replaces (so the list stays legal),
  // ranked by the change in P(target). Also reports the best change in median.
  function bestSwaps(picks, pool, cm, target) {
    if (!target || picks.length < 2) return [];
    const base = simulate(picks, cm, 3000); const p0 = base.pAtLeast(target.val);
    const pickedKeys = new Set(picks.map((p) => p.key)); const out = [];
    for (const outDive of picks) {
      for (const cand of pool) {
        if (pickedKeys.has(cand.key)) continue;
        if (cand.group !== outDive.group) continue;
        const list = picks.map((p) => p.key === outDive.key ? cand : p);
        const sim = simulate(list, cm, 3000);
        out.push({ out: outDive, in: cand, dP: sim.pAtLeast(target.val) - p0, dMed: sim.p50 - base.p50, dDD: cand.dd - outDive.dd, p: sim.pAtLeast(target.val), thin: cand.n < 5 });
      }
    }
    out.sort((a, b) => b.dP - a.dP);
    return out;
  }

  async function render(root) {
    const b = window.AE.state.bundle;
    if (!b) { root.innerHTML = window.AEApp.pickerPrompt('Pick an athlete, then build and stress-test dive lists from their real competition history.'); return; }
    const boards = boardsOf(b);
    if (!boards.length) { root.innerHTML = `<div class="ae-card"><div class="ae-empty">No individual dive sheets on record yet for this athlete — List Lab needs dive-level data. The scraper is still back-filling meets.</div></div>`; return; }
    if (!st.board || !boards.includes(st.board)) { st.board = boards[0]; st.picked = new Set(latestFinalList(b)); st.pinned = null; }
    const pool = poolFor(b);
    if (st.picked.size === 0) st.picked = new Set(latestFinalList(b));
    // prune picks not in pool
    st.picked = new Set([...st.picked].filter((k) => pool.some((p) => p.key === k)));

    const gender = (b.phases.find((p) => p.gender === 'Male' || p.gender === 'Female') || {}).gender;
    await loadContext(b, gender);
    let bench = [];
    try { bench = gender ? await window.AE.benchmarks(gender, st.board, 'World Aquatics') : []; } catch (e) {}
    const targets = [];
    if (st.std) targets.push({ key: 'std', label: `Published standard — Winter Nationals ${st.board}`, val: st.std });
    if (st.weq) targets.push({ key: 'weq', label: `World-final equivalent (domestic season mean, Model 4)`, val: st.weq });
    bench.slice(0, 6).forEach((x) => {
      if (x.final_cut != null) targets.push({ key: x.meet_id + ':fc', label: `Make the final — ${x.meet_name}`, val: x.final_cut });
      if (x.medal_score != null) targets.push({ key: x.meet_id + ':md', label: `Medal — ${x.meet_name}`, val: x.medal_score });
    });
    const customV = Number(st.custom);
    if (st.custom && Number.isFinite(customV)) targets.push({ key: 'custom', label: `Custom target ${customV}`, val: customV });
    if (!st.targetKey || !targets.some((t) => t.key === st.targetKey)) st.targetKey = targets.length ? targets[0].key : null;
    const target = targets.find((t) => t.key === st.targetKey) || null;

    const picks = pool.filter((p) => st.picked.has(p.key));
    const cm = catMeans(pool);
    const sim = picks.length ? simulate(picks, cm) : null;
    const simA = st.pinned ? simulate(pool.filter((p) => st.pinned.has(p.key)), cm) : null;
    const swaps = sim && target ? bestSwaps(picks, pool, cm, target) : [];
    const adjustedShare = pool.length ? pool.reduce((a, p) => a + p.samples.filter((x) => x.adj != null && x.adj !== x.exec).length, 0) / Math.max(1, pool.reduce((a, p) => a + p.samples.length, 0)) : 0;

    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>List Lab — ${esc(b.ident.display_name)}</h3>
          <p class="ae-soft">Check dives to build a list. Each dive is drawn from this athlete's own competition record on it, restated to championship-panel level, blended with the US senior field's record for that dive when hers is thin, plus a shared good-day/bad-day draw — ${ITER.toLocaleString()} simulated competitions per list.</p></div>
          <div class="ae-controls">
            ${boards.map((d) => `<button class="ae-pill ${d === st.board ? 'active' : ''}" onclick="AEListLab.setBoard('${escJsAttr(d)}')">${esc(d)}</button>`).join('')}
            <button class="ae-pill" onclick="AEListLab.reset()">Reset to latest final list</button>
          </div>
        </div>

        <div class="ae-lab-grid">
          <div class="ae-lab-pool">
            ${pool.map((p) => `
              <label class="ae-lab2-row ${st.picked.has(p.key) ? 'on' : ''}">
                <input type="checkbox" ${st.picked.has(p.key) ? 'checked' : ''} onchange="AEListLab.toggle('${escJsAttr(p.key)}')"/>
                <span class="ae-lab2-main">
                  <span class="ae-lab2-dive"><b>${esc(p.dive)}</b><em>${esc(p.height)}</em>${p.n < 5 ? ' <i class="ae-thin" title="fewer than 5 competition attempts — simulation blends in this athlete\u2019s dive-group average">thin</i>' : ''}</span>
                  <span class="ae-lab2-chips">DD ${f1(p.dd)} · exec ${p.p50 == null ? '—' : p.p50.toFixed(2)} · bad-day ${f1(p.floorPts)} · ${p.n}×</span>
                </span>
                <span class="ae-lab2-ev"><b>${f1(p.evPts)}</b><i>exp pts</i></span>
              </label>`).join('')}
          </div>

          <div class="ae-lab-out">
            ${!sim ? '<div class="ae-empty">Check at least one dive.</div>' : `
            <div class="ae-lab-tiles">
              <div class="ae-tile"><div class="ae-tile-v">${f1(sim.mean)}</div><div class="ae-tile-l">expected total</div></div>
              <div class="ae-tile"><div class="ae-tile-v">${f1(sim.p10)}</div><div class="ae-tile-l">bad day (p10)</div></div>
              <div class="ae-tile"><div class="ae-tile-v">${f1(sim.p90)}</div><div class="ae-tile-l">great day (p90)</div></div>
              <div class="ae-tile"><div class="ae-tile-v">${sim.listDD.toFixed(1)}</div><div class="ae-tile-l">list DD (${picks.length} dives)</div></div>
              ${target ? `<div class="ae-tile ae-tile-hero"><div class="ae-tile-v">${Math.round(sim.pAtLeast(target.val) * 100)}%</div><div class="ae-tile-l">chance ≥ ${f1(target.val)}<br>${esc(target.label.split('—')[0])}</div></div>` : ''}
            </div>
            <div class="ae-controls ae-lab-target">
              <select class="ae-select" onchange="AEListLab.setTarget(this.value)">
                ${targets.map((t) => `<option value="${esc(t.key)}" ${t.key === st.targetKey ? 'selected' : ''}>${esc(t.label)} (${f1(t.val)})</option>`).join('')}
              </select>
              <input class="ae-input" placeholder="custom target…" value="${esc(st.custom)}" onchange="AEListLab.setCustom(this.value)" size="10"/>
              <button class="ae-pill ${st.pinned ? '' : 'active'}" onclick="AEListLab.pin()">${st.pinned ? 'Re-pin current as List A' : 'Pin current as List A, then edit to compare'}</button>
              ${st.pinned ? `<button class="ae-pill" onclick="AEListLab.unpin()">Clear comparison</button>` : ''}
            </div>
            <div id="aeLabChart">${C.density(
              [
                ...(simA ? [{ samples: simA.totals, color: C.COLORS.SKY, label: 'List A' }] : []),
                { samples: sim.totals, color: C.COLORS.NAVY, label: st.pinned ? 'List B (current)' : 'Current list' },
              ],
              { refs: target ? [{ x: target.val, label: target.label.split('—')[0].trim(), color: C.COLORS.GOLD }] : [], w: 760, h: 240 })}</div>
            ${simA ? compareNarrative(simA, sim, target) : ''}
            ${swaps.length ? swapsBlock(swaps, target, sim) : ''}
            <p class="ae-soft ae-footnote">${sim.thin ? `${sim.thin} dive${sim.thin > 1 ? 's have' : ' has'} fewer than 5 competition attempts; those lean on the field's record for the code. ` : ''}${Math.round(adjustedShare * 100)}% of this athlete's dives carry a panel estimate and are restated to championship level. Day effect sd ${st.daySd.toFixed(2)} per dive. Method: Simulated totals (Model 6).</p>
            `}
          </div>
        </div>
      </div>`;
  }

  function swapsBlock(swaps, target, sim) {
    const up = swaps.filter((s) => s.dP > 0.005).slice(0, 5);
    const p0 = Math.round(sim.pAtLeast(target.val) * 100);
    const tgt = target.label.split('—')[0].trim();
    const line = (s) => `<tr><td><b>${esc(s.out.dive)}</b> → <b>${esc(s.in.dive)}</b>${s.thin ? ' <i class="ae-thin">thin</i>' : ''}</td>
      <td class="num">${s.dDD >= 0 ? '+' : ''}${s.dDD.toFixed(1)}</td><td class="num">${s.dMed >= 0 ? '+' : ''}${s.dMed.toFixed(1)}</td>
      <td class="num"><b>${p0}% → ${Math.round(s.p * 100)}%</b></td></tr>`;
    return `<div class="ae-swaps">
      <div class="ae-swaps-h"><b>Best single swaps for "${esc(tgt)}"</b><span class="ae-soft">same dive group in, same dive group out · from dives this athlete has competed · ${swaps.length} swaps tested</span></div>
      ${up.length ? `<table class="data-table ae-tbl"><thead><tr><th>Swap</th><th class="num">DD</th><th class="num">Median</th><th class="num">P(target)</th></tr></thead><tbody>${up.map(line).join('')}</tbody></table>`
        : `<div class="ae-soft">No single swap raises the chance of ${esc(tgt)}; the current list is already the best one-move list from this athlete's competed dives.</div>`}
      ${swaps.some((s) => s.dMed > 2 && s.dP < -0.02) ? `<div class="ae-soft" style="margin-top:6px">Note: ${swaps.filter((s) => s.dMed > 2 && s.dP < -0.02).length} swap${swaps.filter((s) => s.dMed > 2 && s.dP < -0.02).length > 1 ? 's' : ''} would raise the median but lower the chance of the target — more difficulty, more variance.</div>` : ''}
    </div>`;
  }

  function compareNarrative(a, b, target) {
    const dMean = b.mean - a.mean, dFloor = b.p10 - a.p10, dCeil = b.p90 - a.p90;
    const sign = (v) => (v >= 0 ? '+' : '') + v.toFixed(1);
    let s = `Compared with List A, this list moves the expected total ${sign(dMean)}, the bad-day floor ${sign(dFloor)}, and the ceiling ${sign(dCeil)}.`;
    if (target) {
      const pa = Math.round(a.pAtLeast(target.val) * 100), pb = Math.round(b.pAtLeast(target.val) * 100);
      s += ` Chance of reaching ${target.val.toFixed(1)} moves ${pa}% → ${pb}%.`;
    }
    return `<div class="ae-narrate">${esc(s)}</div>`;
  }

  window.AEListLab = {
    render,
    setBoard(d) { st.board = d; st.picked = new Set(); st.pinned = null; window.AEApp.rerender(); },
    toggle(k) { st.picked.has(k) ? st.picked.delete(k) : st.picked.add(k); window.AEApp.rerender(); },
    reset() { st.picked = new Set(); st.pinned = null; window.AEApp.rerender(); },
    pin() { st.pinned = new Set(st.picked); window.AEApp.rerender(); },
    unpin() { st.pinned = null; window.AEApp.rerender(); },
    setTarget(k) { st.targetKey = k; window.AEApp.rerender(); },
    setCustom(v) { st.custom = v.trim(); st.targetKey = v.trim() ? 'custom' : st.targetKey; window.AEApp.rerender(); },
    onAthleteChange() { st.picked = new Set(); st.pinned = null; st.board = null; st.ctxKey = null; },
    st,
  };
})();
