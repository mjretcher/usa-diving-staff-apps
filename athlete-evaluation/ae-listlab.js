/* ============================================================
   ae-listlab.js — List Lab: build any list from the athlete's own
   competed dives and simulate it thousands of times against real
   World lines. Sampling uses the athlete's actual execution history
   per dive; thin histories (n<5) are blended with the athlete's own
   dive-group average and labeled as such.
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr, mean } = window.AE;
  const C = window.AECharts;
  const ITER = 4000;

  const st = { board: null, picked: new Set(), pinned: null, pinnedLabel: '', targetKey: null, custom: '' };
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

  function simulate(picks, cm) {
    // Each pick: sample exec from own history; n<5 → blend 3 pseudo-draws at the
    // athlete's dive-group mean so two lucky attempts don't masquerade as certainty.
    const spaces = picks.map((p) => {
      const own = p.samples.map((s) => s.exec);
      const blend = own.length < 5 ? own.concat(new Array(3).fill(cm[p.cat || '_all'] != null ? cm[p.cat] : cm._all)) : own;
      return { dd: p.dd, space: blend, thin: own.length < 5 };
    });
    const totals = new Float64Array(ITER);
    for (let i = 0; i < ITER; i++) {
      let t = 0;
      for (const sp of spaces) {
        t += 3 * sp.dd * sp.space[(Math.random() * sp.space.length) | 0];
      }
      totals[i] = t;
    }
    const arr = Array.from(totals).sort((a, b) => a - b);
    return {
      totals: arr,
      mean: mean(arr),
      p10: window.AE.quantile(arr, 0.10), p50: window.AE.quantile(arr, 0.5), p90: window.AE.quantile(arr, 0.90),
      thin: spaces.filter((s) => s.thin).length,
      pAtLeast(x) { let c = 0; for (const v of arr) if (v >= x) c++; return c / arr.length; },
      listDD: picks.reduce((s, p) => s + (p.dd || 0), 0),
    };
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
    let bench = [];
    try { bench = gender ? await window.AE.benchmarks(gender, st.board, 'World Aquatics') : []; } catch (e) {}
    const targets = [];
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

    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>List Lab — ${esc(b.ident.display_name)}</h3>
          <p class="ae-soft">Check dives to build a list. Every simulation draw uses execution scores this athlete has actually posted on that dive in competition — ${ITER.toLocaleString()} simulated meets per list.</p></div>
          <div class="ae-controls">
            ${boards.map((d) => `<button class="ae-pill ${d === st.board ? 'active' : ''}" onclick="AEListLab.setBoard('${escJsAttr(d)}')">${esc(d)}</button>`).join('')}
            <button class="ae-pill" onclick="AEListLab.reset()">Reset to latest final list</button>
          </div>
        </div>

        <div class="ae-lab-grid">
          <div class="ae-lab-pool">
            <div class="ae-dna-hd ae-lab-hd"><span></span><span>Dive</span><span class="num">DD</span><span class="num">Typical exec</span><span class="num">Expected</span><span class="num">Bad-day</span><span class="num">n</span></div>
            ${pool.map((p) => `
              <label class="ae-lab-row ${st.picked.has(p.key) ? 'on' : ''}">
                <input type="checkbox" ${st.picked.has(p.key) ? 'checked' : ''} onchange="AEListLab.toggle('${escJsAttr(p.key)}')"/>
                <span><b>${esc(p.dive)}</b> <em>${esc(p.height)}</em>${p.n < 5 ? ' <i class="ae-thin" title="fewer than 5 competition attempts — simulation blends in this athlete\u2019s dive-group average">thin history</i>' : ''}</span>
                <span class="num">${f1(p.dd)}</span>
                <span class="num">${p.p50 == null ? '—' : p.p50.toFixed(2)}</span>
                <span class="num"><b>${f1(p.evPts)}</b></span>
                <span class="num">${f1(p.floorPts)}</span>
                <span class="num">${p.n}</span>
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
            ${sim.thin ? `<p class="ae-soft ae-footnote">${sim.thin} dive${sim.thin > 1 ? 's have' : ' has'} fewer than 5 competition attempts — those draws are blended with the athlete's dive-group average, so treat the tails as approximate.</p>` : ''}
            `}
          </div>
        </div>
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
    onAthleteChange() { st.picked = new Set(); st.pinned = null; st.board = null; },
    st,
  };
})();
