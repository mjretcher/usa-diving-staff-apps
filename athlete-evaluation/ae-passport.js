/* ============================================================
   ae-passport.js — Athlete Passport: career trajectory + Dive-by-dive execution.
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr, num, mean } = window.AE;
  const C = window.AECharts;
  const FAM_COLOR = { 'USA Diving': C.COLORS.NAVY, 'World Aquatics': C.COLORS.RED, 'NCAA': C.COLORS.POOL };

  const st = {
    disc: null, stageMode: 'final', // final | all
    dnaYears: 'all', dnaStage: 'all',
    benchOn: true, format: null, formats: [] };

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

    let bench = [], worldExec = [];
    if (gender) {
      try {
        [bench, worldExec] = await Promise.all([
          window.AE.benchmarks(gender, st.disc, 'World Aquatics'),
          window.AE.fieldGroupExec(gender, st.disc),
        ]);
      } catch (e) { bench = []; worldExec = []; }
    }
    st._worldExec = worldExec;
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
          <div><h3>Dive-by-dive execution — every dive, judged by its history</h3>
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

      <div id="aeJudgeCard"></div>

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
    if (window.AEJudge) {
      window.AEJudge.card(b, st.disc, gender).then((html) => {
        const el = document.getElementById('aeJudgeCard');
        if (el) el.innerHTML = html;
      }).catch(() => {});
    }
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
    // Scores are only comparable within one event format. A 6-dive age-group
    // total, an 11-dive international total and a cumulative running total are
    // three different measurements; plotting them on one axis against a world
    // medal line is not a design choice, it is wrong. Default to the format the
    // athlete competes in most, and let the user switch.
    const all = b.phases.filter((p) => p.discipline === st.disc && p.posted_score != null
      && !(p.is_synchronized === true)
      && (st.stageMode === 'all' || p.round_stage === 'Final'));

    const counts = new Map();
    all.forEach((p) => counts.set(p._format, (counts.get(p._format) || 0) + 1));
    st.formats = [...counts.entries()].sort((a, c) => c[1] - a[1]);
    if (!st.format || !counts.has(st.format)) {
      const primary = st.formats.find(([f]) => f !== 'cumulative' && f !== 'unverified');
      st.format = primary ? primary[0] : (st.formats[0] ? st.formats[0][0] : null);
    }
    const rows = all.filter((p) => p._format === st.format);
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
    const comparable = st.format && st.format !== 'cumulative' && st.format !== 'unverified';
    const fmtChips = st.formats.map(([f, n]) =>
      `<button class="ae-chip${f === st.format ? ' on' : ''}" data-fmt="${esc(f)}">${
        esc(f === 'cumulative' ? 'Cumulative totals'
          : f === 'unverified' ? 'Format unverified' : f + ' lists')} (${n})</button>`).join('');
    wrap.innerHTML =
      `<div class="ae-ctl"><div class="ae-ctl-row"><span class="ae-ctl-lab">Event format</span>
        <div class="ae-chips">${fmtChips}</div></div></div>` +
      (comparable ? '' :
        `<div class="ae-warn-note">${st.format === 'cumulative'
          ? 'These are cumulative running totals across rounds, not single-round scores. They cannot be compared with round scores or with a medal line.'
          : 'These results carry no dive count, so the event format cannot be verified. They are shown for completeness but must not be compared with other formats.'}</div>`) +
      C.trajectory({ points, line, refs: comparable ? refs : [], w: 900, h: 320 }) +
      `<p class="ae-soft">Showing ${rows.length} result${rows.length === 1 ? '' : 's'} on the
        <b>${esc(st.format || 'unknown')}</b> format. Scores from other formats are on the other
        chips above and are never mixed into one axis.</p>`;
    wrap.querySelectorAll('[data-fmt]').forEach((el) => el.addEventListener('click', () => {
      st.format = el.getAttribute('data-fmt'); renderTraj(b, latestBench);
    }));
  }

  function dnaRows(b) {
    const maxYear = Math.max(...b.sheets.map((r) => r.meet_year || 0), 0);
    return b.sheets.filter((r) =>
      r.discipline === st.disc && window.AE.isIndiv(r) && r._exec != null &&
      (st.dnaStage === 'all' || r.round_stage === st.dnaStage) &&
      (st.dnaYears === 'all' || r.meet_year > maxYear - Number(st.dnaYears)));
  }

  function worldRef(cat) {
    const rows = (st._worldExec || []).filter((x) => x.category_code === cat && x.n >= 25)
      .sort((a, b2) => b2.meet_year - a.meet_year).slice(0, 2);
    if (!rows.length) return null;
    return { p50: mean(rows.map((r) => r.p50_exec)), p90: mean(rows.map((r) => r.p90_exec)) };
  }
  function worldTag(sEl) {
    const ref = sEl.cat ? worldRef(sEl.cat) : null;
    if (!ref || sEl.n < 3) return '';
    if (sEl.avgExec >= ref.p90) return '<span class="ae-wtag ae-wtag-top"> world top-10% level</span>';
    if (sEl.avgExec >= ref.p50) return '<span class="ae-wtag ae-wtag-up"> above world median</span>';
    return '<span class="ae-wtag ae-wtag-dn"> below world median</span>';
  }

  function renderDNA(b) {
    const el = document.getElementById('aeDna');
    const rows = dnaRows(b);
    if (!rows.length) {
      el.innerHTML = `<div class="ae-empty">No individual dive sheets on record for ${esc(st.disc)} under this filter yet — the scraper is still back-filling older meets, so this can grow.</div>`;
      return;
    }
    const stats = window.AE.diveStats(rows);
    const scaleMin = Math.max(0, Math.min(...stats.map((x) => x.minExec)) - 0.4);
    el.innerHTML = `
      <div class="ae-dna2">
        ${stats.map((x) => `
          <div class="ae-dna2-card">
            <div class="ae-dna2-hd">
              <div class="ae-dna2-dive"><b>${esc(x.dive)}</b><span>${esc(x.height)}</span></div>
              <span class="ae-verdict ae-v-${x.verdict.cls}" title="${esc(x.verdict.why)}">${esc(x.verdict.tag)}</span>
            </div>
            <div class="ae-dna2-desc">${esc((x.desc || '').slice(0, 44))}</div>
            <div class="ae-dna2-candle">${C.candleRow(x, scaleMin, 10, 460)}</div>
            <div class="ae-dna2-chips">
              <span class="ae-stat"><b>${f2(x.p50)}</b><i>typical${x.sdExec != null ? ' ±' + f2(x.sdExec) : ''}</i></span>
              <span class="ae-stat"><b>${f1(x.dd)}</b><i>DD</i></span>
              <span class="ae-stat"><b>${f1(x.evPts)}</b><i>expected pts</i></span>
              <span class="ae-stat"><b>${f1(x.floorPts)}</b><i>bad-day pts</i></span>
              <span class="ae-stat"><b>${x.n}</b><i>attempts</i></span>
              ${x.failRate > 0 ? `<span class="ae-stat ae-stat-bad"><b>${Math.round(x.failRate * 100)}%</b><i>missed</i></span>` : ''}
              ${worldTag(x)}
            </div>
          </div>`).join('')}
      </div>
      <p class="ae-soft ae-footnote">Box = middle half of attempts, thick tick = typical, whisker ends = best and worst; dots are individual attempts (hover). Expected pts = 3 × DD × average execution; bad-day = the 10th-percentile payout. World tags compare this athlete's average to the world field in the same dive group. Synchro excluded.</p>`;
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
