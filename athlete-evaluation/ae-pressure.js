/* ============================================================
   ae-pressure.js — Pressure Ledger.
   All three cuts are designed to kill confounds:
   - Clutch: Final vs Prelim execution ON THE SAME DIVE within the
     same meet (paired), so harder finals lists don't fake a choke.
   - Slot fade: residual vs the athlete's own average on that dive,
     by dive order — list difficulty can't contaminate it.
   - Bounce-back: the very next dive after a deficient one (<4.5).
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr, mean, sd } = window.AE;
  const C = window.AECharts;
  const st = { board: 'all' };
  const f2 = (v) => v == null ? '—' : Number(v).toFixed(2);
  const sign2 = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2);

  function rowsOf(b) {
    return b.sheets.filter((r) => window.AE.isIndiv(r) && r._exec != null &&
      (st.board === 'all' || r.discipline === st.board));
  }

  async function render(root) {
    const b = window.AE.state.bundle;
    if (!b) { root.innerHTML = window.AEApp.pickerPrompt('Pick an athlete to see how they hold up when it counts — finals vs prelims, late-list fade, and recovery after a miss.'); return; }
    const all = rowsOf(b);
    if (!all.length) { root.innerHTML = `<div class="ae-card"><div class="ae-empty">No individual dive sheets yet for this athlete.</div></div>`; return; }
    const boards = ['all', ...new Set(b.sheets.filter((r) => window.AE.isIndiv(r)).map((r) => r.discipline))];

    /* Clutch: paired same-dive Prelim/Semi -> Final within a meet */
    const pairs = [];
    const byMeetDive = new Map();
    all.forEach((r) => {
      const k = r.meet_id + '|' + r.discipline + '|' + r.dive_number + '@' + (r.height || '');
      if (!byMeetDive.has(k)) byMeetDive.set(k, {});
      byMeetDive.get(k)[r.round_stage] = r;
    });
    byMeetDive.forEach((g) => {
      const early = g['Prelim'] || g['Semifinal'];
      if (early && g['Final']) pairs.push({ dive: g['Final'].dive_number, year: g['Final'].meet_year, d: g['Final']._exec - early._exec });
    });
    const clutchMean = pairs.length ? mean(pairs.map((p) => p.d)) : null;
    const clutchUp = pairs.filter((p) => p.d > 0.01).length, clutchDown = pairs.filter((p) => p.d < -0.01).length;

    /* Stage table */
    const stages = ['Prelim', 'Semifinal', 'Final', 'Head-To-Head'].map((sg) => {
      const ex = all.filter((r) => r.round_stage === sg).map((r) => r._exec);
      return { stage: sg, n: ex.length, avg: mean(ex), sd: sd(ex), fail: ex.length ? ex.filter((v) => v < 4.5).length / ex.length : null };
    }).filter((s) => s.n > 0);

    /* Slot residuals */
    const byDive = new Map();
    all.forEach((r) => {
      const k = r.discipline + '|' + r.dive_number + '@' + (r.height || '');
      if (!byDive.has(k)) byDive.set(k, []);
      byDive.get(k).push(r);
    });
    const resBySlot = new Map();
    byDive.forEach((list) => {
      const m = mean(list.map((r) => r._exec));
      list.forEach((r) => {
        if (r.dive_order == null) return;
        if (!resBySlot.has(r.dive_order)) resBySlot.set(r.dive_order, []);
        resBySlot.get(r.dive_order).push(r._exec - m);
      });
    });
    const slots = [...resBySlot.keys()].sort((a, b2) => a - b2)
      .map((s) => ({ slot: s, mean: mean(resBySlot.get(s)), n: resBySlot.get(s).length }));

    /* Bounce-back */
    const byRound = new Map();
    all.forEach((r) => {
      const k = r.meet_id + '|' + r.event_id + '|' + r.round_stage;
      if (!byRound.has(k)) byRound.set(k, []);
      byRound.get(k).push(r);
    });
    const bounce = [];
    byRound.forEach((list) => {
      list.sort((a, b2) => a.dive_order - b2.dive_order);
      for (let i = 0; i < list.length - 1; i++) {
        if (list[i]._exec < 4.5) {
          const nx = list[i + 1];
          const m = mean((byDive.get(nx.discipline + '|' + nx.dive_number + '@' + (nx.height || '')) || [nx]).map((r) => r._exec));
          bounce.push({ after: list[i].dive_number, next: nx.dive_number, year: nx.meet_year, res: nx._exec - m });
        }
      }
    });
    const bounceMean = bounce.length ? mean(bounce.map((x) => x.res)) : null;

    const clutchRead = clutchMean == null ? 'Not enough paired prelim/final dives yet.' :
      clutchMean >= 0.15 ? 'Executes BETTER in finals than prelims on the same dives — a genuine big-moment riser.' :
      clutchMean <= -0.15 ? 'Execution drops in finals on the same dives — worth building pressure reps into training.' :
      'Holds steady from prelims to finals — pressure-neutral.';

    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>Pressure Ledger — ${esc(b.ident.display_name)}</h3>
          <p class="ae-soft">Every comparison here is against the athlete's own baseline, so list difficulty can't fake a result. Samples under 5 are shown faded.</p></div>
          <div class="ae-controls">${boards.map((d) => `<button class="ae-pill ${d === st.board ? 'active' : ''}" onclick="AEPressure.setBoard('${escJsAttr(d)}')">${d === 'all' ? 'All boards' : esc(d)}</button>`).join('')}</div>
        </div>

        <div class="ae-press-grid">
          <div class="ae-press-cell">
            <h4>Clutch factor</h4>
            <div class="ae-bignum ${clutchMean != null && clutchMean < -0.15 ? 'ae-neg' : ''}">${sign2(clutchMean)}</div>
            <div class="ae-soft">judge points per dive, finals vs prelims<br>same dive, same meet · ${pairs.length} paired dives</div>
            ${pairs.length ? `<div class="ae-soft" style="margin-top:6px">${clutchUp} dives up · ${clutchDown} down</div>` : ''}
            <div class="ae-narrate">${esc(clutchRead)}</div>
          </div>

          <div class="ae-press-cell">
            <h4>By round</h4>
            <table class="data-table ae-mini-table"><thead><tr><th>Round</th><th class="num">Avg exec</th><th class="num">Miss rate</th><th class="num">n</th></tr></thead><tbody>
              ${stages.map((s) => `<tr class="${s.n < 5 ? 'ae-dim' : ''}"><td>${esc(s.stage)}</td><td class="num">${f2(s.avg)}</td><td class="num">${s.fail == null ? '—' : Math.round(s.fail * 100) + '%'}</td><td class="num">${s.n}</td></tr>`).join('')}
            </tbody></table>
          </div>

          <div class="ae-press-cell ae-press-wide">
            <h4>Late-list fade check</h4>
            <p class="ae-soft">Execution vs this athlete's own norm on each dive, by list position. Bars below zero late in the list = fading; above = a closer.</p>
            ${C.slotBars(slots, { w: 560, h: 190 })}
          </div>

          <div class="ae-press-cell ae-press-wide">
            <h4>Bounce-back after a miss</h4>
            ${bounce.length === 0 ? `<div class="ae-soft">No deficient dives (&lt;4.5 execution) followed by another dive on record${all.length > 30 ? ' — that itself is a statement' : ''}.</div>` : `
              <div class="ae-bignum ${bounceMean < -0.15 ? 'ae-neg' : ''}">${sign2(bounceMean)}</div>
              <div class="ae-soft">next-dive execution vs own norm, after ${bounce.length} miss${bounce.length > 1 ? 'es' : ''}</div>
              <div class="ae-narrate">${esc(bounceMean >= 0 ? 'Resets after a mistake — the miss stays contained.' : bounceMean >= -0.3 ? 'Slight carryover after a miss — mostly contained.' : 'Misses tend to cascade into the next dive — recovery routines are a training target.')}</div>
              <table class="data-table ae-mini-table" style="margin-top:8px"><thead><tr><th>Year</th><th>Missed</th><th>Next dive</th><th class="num">vs norm</th></tr></thead><tbody>
              ${bounce.slice(-8).reverse().map((x) => `<tr><td>${esc(x.year)}</td><td>${esc(x.after)}</td><td>${esc(x.next)}</td><td class="num">${sign2(x.res)}</td></tr>`).join('')}
              </tbody></table>`}
          </div>
        </div>
      </div>`;
  }

  window.AEPressure = { render, setBoard(d) { st.board = d; window.AEApp.rerender(); }, st };
})();
