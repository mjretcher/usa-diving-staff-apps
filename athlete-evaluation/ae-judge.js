/* ============================================================
   ae-judge.js — Judge Lens: judge-by-judge analysis for the
   passport. Detail exists ONLY on World Aquatics meets (7-judge
   panels, ~100% coverage there; DiveMeets publishes totals only)
   and the card says so plainly. A wide judge spread on the same
   dive usually means the entry read differently from different
   angles — a technical signal, not noise.
   ============================================================ */
(function () {
  'use strict';
  const { esc, mean } = window.AE;
  const f2 = (v) => v == null ? '—' : Number(v).toFixed(2);
  const f1 = (v) => v == null ? '—' : Number(v).toFixed(1);

  // Returns card HTML ('' when no judge detail for this discipline).
  async function card(bundle, disc, gender) {
    const rows = bundle.sheets.filter((r) => r.discipline === disc && window.AE.isIndiv(r) &&
      r.judges_scores && r._exec != null);
    if (!rows.length) return '';

    const attempts = rows.map((r) => {
      const js = window.AE.parseJudges(r.judges_scores);
      if (js.length < 3) return null;
      return { r, js, range: Math.max(...js) - Math.min(...js), avg: mean(js) };
    }).filter(Boolean);
    if (!attempts.length) return '';

    let ref = null;
    try { ref = await window.AE.judgeSpreadRef(gender, disc); } catch (e) {}

    const byDive = new Map();
    attempts.forEach((a) => {
      const k = a.r.dive_number;
      if (!byDive.has(k)) byDive.set(k, []);
      byDive.get(k).push(a);
    });
    const diveRows = [...byDive.entries()].map(([dive, list]) => ({
      dive,
      n: list.length,
      avgRange: mean(list.map((a) => a.range)),
      splitRate: list.filter((a) => a.range >= 1.5).length / list.length,
      avgAward: mean(list.map((a) => a.avg)),
    })).sort((a, b) => b.avgRange - a.avgRange);

    const overall = mean(attempts.map((a) => a.range));
    const worst = attempts.reduce((m, a) => a.range > m.range ? a : m);
    const readout = ref == null ? '' :
      overall <= ref.avg_range - 0.12 ? 'Judges agree on these dives more than they do on the field average — the shapes read cleanly from every chair.' :
      overall >= ref.avg_range + 0.12 ? 'Judges split on these dives more than the field average — entries or positions are reading differently from different angles, which is a coachable technical signal.' :
      'Judge agreement is right at the field norm.';

    const maxJ = Math.max(...worst.js), minJ = Math.min(...worst.js);

    return `
      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>Judge Lens — how the panel sees ${esc(disc)}</h3>
          <p class="ae-soft">Judge-by-judge awards exist only for World Aquatics meets — ${attempts.length} dives here. "Spread" is the gap between the highest and lowest judge on one dive; 1.5+ points counts as a split panel.</p></div>
        </div>
        <div class="ae-lab-tiles">
          <div class="ae-tile"><div class="ae-tile-v">${f2(overall)}</div><div class="ae-tile-l">avg judge spread</div></div>
          ${ref ? `<div class="ae-tile"><div class="ae-tile-v">${f2(ref.avg_range)}</div><div class="ae-tile-l">world field avg</div></div>` : ''}
          <div class="ae-tile"><div class="ae-tile-v">${Math.round(attempts.filter((a) => a.range >= 1.5).length / attempts.length * 100)}%</div><div class="ae-tile-l">split panels</div></div>
        </div>
        ${readout ? `<div class="ae-narrate">${esc(readout)}</div>` : ''}
        <div class="ae-dual" style="margin-top:12px">
          <div>
            <h4 class="ae-h4">By dive — where the panel splits</h4>
            <table class="data-table ae-mini-table"><thead><tr><th>Dive</th><th class="num">Avg award</th><th class="num">Avg spread</th><th class="num">Split panels</th><th class="num">n</th></tr></thead><tbody>
              ${diveRows.map((d) => `<tr class="${d.n < 3 ? 'ae-dim' : ''}"><td><b>${esc(d.dive)}</b></td><td class="num">${f2(d.avgAward)}</td><td class="num">${f2(d.avgRange)}</td><td class="num">${Math.round(d.splitRate * 100)}%</td><td class="num">${d.n}</td></tr>`).join('')}
            </tbody></table>
          </div>
          <div>
            <h4 class="ae-h4">The most divided panel</h4>
            <p class="ae-soft">${esc(worst.r.dive_number)} · ${esc(worst.r.meet_year)} ${esc(worst.r.round_stage)} — award ${f1(worst.r.score)} (DD ${f1(worst.r.dd)})</p>
            <div class="ae-judgechips">${worst.js.map((j, i) => `<span class="ae-jchip ${j === maxJ ? 'hi' : j === minJ ? 'lo' : ''}">J${i + 1}<b>${j.toFixed(1)}</b></span>`).join('')}</div>
            <p class="ae-soft" style="margin-top:8px">A ${f1(worst.range)}-point spread on one dive usually means the entry or a position read differently from different chairs — worth a look on video from both sides.</p>
          </div>
        </div>
      </div>`;
  }

  window.AEJudge = { card };
})();
