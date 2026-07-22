/* ============================================================
   ae-passport.js — Athlete Passport: career trajectory + Dive DNA.
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr, num, mean } = window.AE;
  const C = window.AECharts;
  const FAM_COLOR = { 'USA Diving': C.COLORS.NAVY, 'World Aquatics': C.COLORS.RED, 'NCAA': C.COLORS.POOL };

  const st = {
    disc: null, stageMode: 'final', // final | all
    dnaYears: 'all', dnaStage: 'all',
    benchOn: true,
  };

  function fam(f) { return FAM_COLOR[f] || C.COLORS.SKY; }
  const f1 = (v) => v == null ? '—' : Number(v).toFixed(1);
  const f2 = (v) => v == null ? '—' : Number(v).toFixed(2);

  function disciplinesOf(b) {
    const seen = new Map();
    b.phases.forEach((p) => { if (['1m', '3m', 'Platform'].includes(p.discipline)) seen.set(p.discipline, (seen.get(p.discipline) || 0) + 1); });
    const order = ['3m', 'Platform', '1m'];
    return order.filter((d) => seen.has(d)).concat([...seen.keys()].filter((d) => !order.includes(d)));
  }

  // Open on the athlete's real event: most dive-sheet rows wins (their primary
  // board almost always has the deepest sheet history), falling back to phases.
  function defaultDisc(b, discs) {
    const counts = new Map(discs.map((d) => [d, 0]));
    b.sheets.forEach((r) => { if (counts.has(r.discipline) && r._exec != null) counts.set(r.discipline, counts.get(r.discipline) + 1); });
    const best = [...counts.entries()].sort((a, b2) => b2[1] - a[1])[0];
    return best && best[1] > 0 ? best[0] : discs[0];
  }

  async function render(root) {
    const b = window.AE.state.bundle;
    if (!b) { root.innerHTML = window.AEApp.pickerPrompt('Search an athlete to open their passport — career arc, personal bests, and every competition dive on record.'); return; }
    const discs = disciplinesOf(b);
    if (!st.disc || !discs.includes(st.disc)) st.disc = defaultDisc(b, discs) || '3m';
    const gender = (b.phases.find((p) => p.gender === 'Male' || p.gender === 'Female') || {}).gender || null;

    let bench = [];
    if (gender) { try { bench = await window.AE.benchmarks(gender, st.disc, 'World Aquatics'); } catch (e) { bench = []; } }
    const latestBench = bench.find((x) => x.final_cut != null || x.medal_score != null);

    const iv = b.ident;
    const linked = iv.wa_id && iv.match_method === 'name_token_exact';
    const synN = b.phases.filter((p) => p.is_synchronized === true || /^Synchro/i.test(p.discipline || '')).length;

    root.innerHTML = `
      <div class="ae-pass-head ae-card">
        <div class="ae-pass-id">
          <div class="ae-pass-name">${esc(iv.display_name)}</div>
          <div class="ae-pass-sub">${esc(iv.team_name || '')}${iv.nat ? ' · ' + esc(iv.nat) : ''} · active ${esc(iv.first_year)}–${esc(iv.last_year)}</div>
          <div class="ae-chiprow">
            <span class="ae-chip">${esc(iv.n_phase_meets)} meets on record</span>
            <span class="ae-chip">${esc(iv.n_dives)} scored dives across ${esc(iv.n_sheet_meets)} meets</span>
            ${Number(iv.n_judge_dives) > 0 ? `<span class="ae-chip ae-chip-pool">judge-by-judge detail · ${esc(iv.n_judge_dives)} dives</span>` : ''}
            ${linked ? `<span class="ae-chip ae-chip-red">World Aquatics record linked (exact name match)</span>` : ''}
            ${synN ? `<span class="ae-chip ae-chip-soft">${synN} synchro results (shown in history, excluded from execution stats)</span>` : ''}
          </div>
        </div>
        <div class="ae-pass-pbs" id="aePbs"></div>
      </div>

      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>Career trajectory — ${esc(st.disc)}</h3>
          <p class="ae-soft">Every posted score, colored by circuit. Line follows the season best. Hover any point for the meet.</p></div>
          <div class="ae-controls">
            ${discs.map((d) => `<button class="ae-pill ${d === st.disc ? 'active' : ''}" onclick="AEPassport.setDisc('${escJsAttr(d)}')">${esc(d)}</button>`).join('')}
            <span class="ae-ctrl-gap"></span>
            <button class="ae-pill ${st.stageMode === 'final' ? 'active' : ''}" onclick="AEPassport.setStage('final')">Finals</button>
            <button class="ae-pill ${st.stageMode === 'all' ? 'active' : ''}" onclick="AEPassport.setStage('all')">All rounds</button>
            ${latestBench ? `<button class="ae-pill ${st.benchOn ? 'active' : ''}" onclick="AEPassport.toggleBench()">World lines</button>` : ''}
          </div>
        </div>
        <div id="aeTrajWrap"></div>
        <div class="ae-legend">
          <span><i style="background:${C.COLORS.NAVY}"></i>USA Diving</span>
          <span><i style="background:${C.COLORS.RED}"></i>World Aquatics</span>
          <span><i style="background:${C.COLORS.POOL}"></i>NCAA</span>
          ${latestBench && st.benchOn ? `<span class="ae-soft">Dashed lines: ${esc(latestBench.meet_name)} (final cut / medal)</span>` : ''}
        </div>
      </div>

      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>Dive DNA — every dive, judged by its history</h3>
          <p class="ae-soft">Per-judge execution = score ÷ (3 × DD), so a Regionals dive and a Worlds dive sit on the same 0–10 scale.
             Box shows the middle half of attempts, thick tick = typical, whisker ends = best and worst. Background bands: red = deficient (&lt;4.5), blue = good (6.5+), green = excellent (8.5+).</p></div>
          <div class="ae-controls">
            <select class="ae-select" onchange="AEPassport.setDnaYears(this.value)">
              <option value="all" ${st.dnaYears === 'all' ? 'selected' : ''}>All years</option>
              <option value="2" ${st.dnaYears === '2' ? 'selected' : ''}>Last 2 seasons</option>
              <option value="1" ${st.dnaYears === '1' ? 'selected' : ''}>This season</option>
            </select>
            <select class="ae-select" onchange="AEPassport.setDnaStage(this.value)">
              <option value="all" ${st.dnaStage === 'all' ? 'selected' : ''}>All rounds</option>
              <option value="Final" ${st.dnaStage === 'Final' ? 'selected' : ''}>Finals only</option>
            </select>
          </div>
        </div>
        <div id="aeDna"></div>
      </div>

      <div class="ae-card">
        <div class="ae-card-h"><div><h3>Meet history</h3></div></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Year</th><th>Meet</th><th>Event</th><th>Round</th><th class="num">Place</th><th class="num">Score</th></tr></thead>
          <tbody>${meetRows(b)}</tbody>
        </table></div>
      </div>`;

    renderPBs(b, discs);
    renderTraj(b, latestBench);
    renderDNA(b);
  }

  function renderPBs(b, discs) {
    const el = document.getElementById('aePbs');
    if (!el) return;
    el.innerHTML = discs.map((d) => {
      const rows = b.phases.filter((p) => p.discipline === d && p.posted_score != null && !(p.is_synchronized === true));
      if (!rows.length) return '';
      const best = rows.reduce((a, r) => r.posted_score > a.posted_score ? r : a);
      return `<div class="ae-pb"><div class="ae-pb-val">${f2(best.posted_score)}</div>
        <div class="ae-pb-lab">${esc(d)} best</div>
        <div class="ae-pb-meet" title="${esc(best.meet_name)}">${esc(best.meet_year)} · ${esc(shortMeet(best.meet_name))}</div></div>`;
    }).join('');
  }

  function shortMeet(m) {
    return String(m || '').replace(/^\d{4}\s*/, '').replace('USA Diving ', '').replace('World Aquatics ', '').slice(0, 34);
  }

  function renderTraj(b, latestBench) {
    const wrap = document.getElementById('aeTrajWrap');
    const rows = b.phases.filter((p) => p.discipline === st.disc && p.posted_score != null && !(p.is_synchronized === true) &&
      (st.stageMode === 'all' || p.round_stage === 'Final'));
    // spread points within each year for readability
    const byYear = new Map();
    rows.forEach((r) => { if (!byYear.has(r.meet_year)) byYear.set(r.meet_year, []); byYear.get(r.meet_year).push(r); });
    const points = [];
    byYear.forEach((list, yr) => {
      list.sort((a, b2) => String(a.meet_id).localeCompare(String(b2.meet_id)));
      list.forEach((r, i) => {
        points.push({
          x: yr + 0.12 + 0.76 * (list.length === 1 ? 0.5 : i / (list.length - 1)),
          y: r.posted_score,
          color: fam(r.competition_family),
          big: r.competition_family === 'World Aquatics',
          label: `${r.meet_year} · ${r.meet_name}\n${r.round_stage}${r.place != null ? ' · place ' + r.place : ''} · ${f2(r.posted_score)}`,
        });
      });
    });
    const line = [...byYear.entries()].map(([yr, list]) => ({ x: yr + 0.5, y: Math.max(...list.map((r) => r.posted_score)) })).sort((a, b2) => a.x - b2.x);
    const refs = [];
    if (st.benchOn && latestBench) {
      if (latestBench.final_cut != null) refs.push({ y: latestBench.final_cut, label: 'World final cut', color: C.COLORS.GOLD, dash: true });
      if (latestBench.medal_score != null) refs.push({ y: latestBench.medal_score, label: 'World medal', color: C.COLORS.RED, dash: true });
    }
    wrap.innerHTML = C.trajectory({ points, line, refs, w: 900, h: 320 });
  }

  function dnaRows(b) {
    const maxYear = Math.max(...b.sheets.map((r) => r.meet_year || 0), 0);
    return b.sheets.filter((r) =>
      r.discipline === st.disc && window.AE.isIndiv(r) && r._exec != null &&
      (st.dnaStage === 'all' || r.round_stage === st.dnaStage) &&
      (st.dnaYears === 'all' || r.meet_year > maxYear - Number(st.dnaYears)));
  }

  function renderDNA(b) {
    const el = document.getElementById('aeDna');
    const rows = dnaRows(b);
    if (!rows.length) {
      el.innerHTML = `<div class="ae-empty">No individual dive sheets on record for ${esc(st.disc)} under this filter yet — the scraper is still back-filling older meets, so this can grow.</div>`;
      return;
    }
    const stats = window.AE.diveStats(rows);
    const scaleMin = Math.max(0, Math.min(...stats.map((s) => s.minExec)) - 0.4);
    el.innerHTML = `
      <div class="ae-dna-grid">
        <div class="ae-dna-hd"><span>Dive</span><span>Execution range (0–10)</span><span class="num">Typical</span><span class="num">DD</span><span class="num">Expected pts</span><span class="num">Bad-day pts</span><span class="num">Attempts</span><span>Read</span></div>
        ${stats.map((s) => `
          <div class="ae-dna-row">
            <div class="ae-dna-dive"><b>${esc(s.dive)}</b><span>${esc(s.height)}</span><em title="${esc(s.desc || '')}">${esc((s.desc || '').slice(0, 26))}</em></div>
            <div>${C.candleRow(s, scaleMin, 10, 340)}</div>
            <div class="num"><b>${f2(s.p50)}</b>${s.sdExec != null ? `<span class="ae-soft"> ±${f2(s.sdExec)}</span>` : ''}</div>
            <div class="num">${f1(s.dd)}</div>
            <div class="num"><b>${f1(s.evPts)}</b></div>
            <div class="num">${f1(s.floorPts)}</div>
            <div class="num">${s.n}${s.failRate > 0 ? `<span class="ae-fail" title="attempts below 4.5 execution"> · ${Math.round(s.failRate * 100)}% miss</span>` : ''}</div>
            <div><span class="ae-verdict ae-v-${s.verdict.cls}" title="${esc(s.verdict.why)}">${esc(s.verdict.tag)}</span></div>
          </div>`).join('')}
      </div>
      <p class="ae-soft ae-footnote">Expected pts = 3 × DD × average execution. Bad-day pts = 3 × DD × 10th-percentile execution — what this dive pays out roughly one bad attempt in ten. Hover a verdict for the reasoning; hover dots for individual attempts. Synchro dives excluded.</p>`;
  }

  function meetRows(b) {
    const rows = b.phases.slice().sort((a, b2) => (b2.meet_year - a.meet_year) || String(b2.meet_id).localeCompare(String(a.meet_id)));
    return rows.slice(0, 200).map((r) => `
      <tr><td>${esc(r.meet_year)}</td><td>${esc(r.meet_name)}</td>
      <td>${esc(r.discipline)}${r.age_group ? ' · ' + esc(r.age_group) : ''}${r.is_synchronized === true ? ' · synchro' : ''}</td>
      <td>${esc(r.round_stage)}</td>
      <td class="num">${r.place != null ? esc(r.place) : '—'}</td>
      <td class="num">${f2(r.posted_score)}</td></tr>`).join('') +
      (rows.length > 200 ? `<tr><td colspan="6" class="ae-soft" style="text-align:center">…${rows.length - 200} earlier rows not shown</td></tr>` : '');
  }

  window.AEPassport = {
    render,
    setDisc(d) { st.disc = d; window.AEApp.rerender(); },
    setStage(m) { st.stageMode = m; window.AEApp.rerender(); },
    toggleBench() { st.benchOn = !st.benchOn; window.AEApp.rerender(); },
    setDnaYears(v) { st.dnaYears = v; window.AEApp.rerender(); },
    setDnaStage(v) { st.dnaStage = v; window.AEApp.rerender(); },
    st,
  };
})();
