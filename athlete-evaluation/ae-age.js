/* ============================================================
   ae-age.js — Age progression (Model 5).
   Reads hp_models.age_bands / athlete_season_ppd / age_window, built nightly
   by db/scripts/build_hp_models.py. Shows where an athlete sits against every
   US athlete of the same age on the same board, season by season, in points
   per optional dive (3 × DD × execution) — the one measure that is comparable
   across list lengths and sees both difficulty and execution.

   Two screens in one view:
   - Athlete selected: fan chart of the bands with the athlete's seasons on top,
     plus a season table (age, window width, dives, exec, DD, points per dive,
     percentile for age).
   - No athlete: the talent board — current season, who sits highest for their
     age on each board.
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr } = window.AE;
  const st = { board: null, season: null, gender: 'Female', minAge: 11, maxAge: 17, cache: {} };
  const f1 = (v) => (v == null || isNaN(v)) ? '—' : Number(v).toFixed(1);
  const f2 = (v) => (v == null || isNaN(v)) ? '—' : Number(v).toFixed(2);
  const q = (sql, params) => window.NEON.query(sql, (params || []).map((p) => p == null ? null : String(p)));

  async function method() {
    if (st.cache.method !== undefined) return st.cache.method;
    try { const r = await q(`SELECT method, stats, built_at FROM hp_models.method WHERE model = 'age_progression'`); st.cache.method = r.rows[0] || null; }
    catch (e) { st.cache.method = null; }
    return st.cache.method;
  }
  async function bands(gender, discipline) {
    const k = gender + '|' + discipline;
    if (!st.cache[k]) {
      const r = await q(`SELECT age, n, p10, p25, p50, p75, p90, p97, exec_p50, dd_p50 FROM hp_models.age_bands WHERE gender = $1 AND discipline = $2 ORDER BY age`, [gender, discipline]);
      st.cache[k] = r.rows.map((x) => Object.fromEntries(Object.entries(x).map(([a, b]) => [a, b == null ? null : Number(b)])));
    }
    return st.cache[k];
  }

  function notBuilt(root, err) {
    root.innerHTML = `<div class="ae-card"><div class="ae-card-h"><div><h3>Age progression</h3>
      <p class="ae-soft">This view reads the nightly age-progression model. It has not been built yet${err ? ` (${esc(err)})` : ''}. It fills itself in after the first nightly run; nothing to do.</p></div></div></div>`;
  }

  /* ---------- athlete view ---------- */
  async function renderAthlete(root, b) {
    const id = b.ident.canonical_id;
    let seasons, win;
    try {
      const [s, w] = await Promise.all([
        q(`SELECT meet_year, gender, discipline, age, width, n_opt_dives, exec_mean, dd_mean, ppd, pct_in_age FROM hp_models.athlete_season_ppd WHERE diver_id = $1 ORDER BY meet_year, discipline`, [id]),
        q(`SELECT birth_lo, birth_hi, birth_mid, width, n_seasons, consistent, first_season, last_season FROM hp_models.age_window WHERE diver_id = $1`, [id]),
      ]);
      seasons = s.rows; win = w.rows[0] || null;
    } catch (e) { notBuilt(root, e.message); return; }
    const m = await method();
    if (!win) {
      root.innerHTML = `<div class="ae-card"><div class="ae-card-h"><div><h3>Age progression — ${esc(b.ident.display_name)}</h3>
        <p class="ae-soft">No age estimate for this athlete. Ages come from junior age-group entries (Group A–D) in the dive sheets; this athlete has none on file, so there is nothing to place them against. Seniors with no junior history will get an age once birth years are added from World Aquatics profiles.</p></div></div></div>`;
      return;
    }
    if (!win.consistent) {
      root.innerHTML = `<div class="ae-card"><div class="ae-card-h"><div><h3>Age progression — ${esc(b.ident.display_name)}</h3>
        <p class="ae-soft">This athlete's junior group entries contradict each other (${esc(win.first_season)}–${esc(win.last_season)}), so no single birth year fits. Usually an age-up entry or a mis-entered group. Not shown rather than guessed.</p></div></div></div>`;
      return;
    }
    const boards = [...new Set(seasons.map((r) => r.discipline))];
    if (!st.board || !boards.includes(st.board)) st.board = boards.includes('3m') ? '3m' : boards[0];
    const gender = seasons[0] ? seasons[0].gender : (b.ident.gender || 'Female');
    const B = await bands(gender, st.board);
    const rows = seasons.filter((r) => r.discipline === st.board).map((r) => ({ ...r, age: +r.age, ppd: +r.ppd, pct: r.pct_in_age == null ? null : +r.pct_in_age, exec: +r.exec_mean, dd: +r.dd_mean }));
    const latest = rows[rows.length - 1];
    const widthTxt = +win.width === 1 ? `born ${esc(win.birth_lo)}` : `born ${esc(win.birth_lo)}–${esc(win.birth_hi)} (${esc(win.width)}-year window)`;
    const headline = latest && latest.pct != null
      ? `${latest.meet_year}: <b>${f1(latest.ppd)}</b> points per optional dive on ${esc(st.board)} at age ${latest.age} — <b>${Math.round(latest.pct)}th percentile</b> of US ${gender === 'Female' ? 'girls' : 'boys'} that age.`
      : (latest ? `${latest.meet_year}: <b>${f1(latest.ppd)}</b> points per optional dive at age ${latest.age}. Too few athletes that age on this board for a percentile.` : 'No seasons with 6+ optional dives on this board.');

    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>Age progression — ${esc(b.ident.display_name)}</h3>
            <p class="ae-soft">${widthTxt} · ages are AQUA ages (31 Dec). Bands are every US athlete of that age on this board with a known age; the athlete's seasons sit on top.</p></div>
          <div class="ae-controls">${boards.map((d) => `<button class="ae-pill ${d === st.board ? 'active' : ''}" onclick="AEAge.setBoard('${escJsAttr(d)}')">${esc(d)}</button>`).join('')}</div>
        </div>
        <div class="ae-narrate" style="margin:4px 0 10px">${headline}</div>
        <div id="aeAgeChart" class="usad-chart" style="height:380px"></div>
        <div class="ae-soft" style="margin-top:8px">Light band 10th–90th percentile, darker band 25th–75th, line = median. ${B.length ? `Bands published where 40+ athlete-seasons exist for an age.` : 'No bands yet for this board.'}</div>
      </div>
      <div class="ae-card">
        <div class="ae-card-h"><div><h3>Season by season</h3><p class="ae-soft">Optional dives only. Points per dive = 3 × DD × execution.</p></div></div>
        <div class="table-wrap"><table class="data-table ae-tbl">
          <thead><tr><th>Season</th><th class="num">Age</th><th class="num">Optional dives</th><th class="num">Execution</th><th class="num">DD</th><th class="num">Pts / dive</th><th class="num">Age median</th><th class="num">Percentile for age</th></tr></thead>
          <tbody>${rows.map((r) => { const band = B.find((x) => x.age === r.age); return `<tr>
            <td>${esc(r.meet_year)}</td><td class="num">${r.age}${+r.width > 1 ? `<span class="ae-soft"> ±${(+r.width - 1) / 2}</span>` : ''}</td><td class="num">${esc(r.n_opt_dives)}</td>
            <td class="num">${f2(r.exec)}</td><td class="num">${f2(r.dd)}</td><td class="num"><b>${f1(r.ppd)}</b></td>
            <td class="num">${band ? f1(band.p50) : '—'}</td><td class="num">${r.pct == null ? '<span class="ae-soft">n &lt; 40</span>' : `<span class="hp-badge ${r.pct >= 90 ? 'good' : r.pct >= 50 ? 'info' : 'out'}">${Math.round(r.pct)}</span>`}</td></tr>`; }).join('')}</tbody>
        </table></div>
      </div>
      ${methodCard(m)}`;
    drawFan(document.getElementById('aeAgeChart'), B, [{ name: b.ident.display_name, pts: rows.map((r) => [r.age, r.ppd, r.meet_year]) }], gender, st.board);
  }

  function methodCard(m) {
    if (!m) return '';
    let stats = {}; try { stats = JSON.parse(m.stats || '{}'); } catch (e) {}
    return `<details class="ae-card ae-method"><summary><b>How this is computed</b> <span class="ae-soft">· model built ${esc(String(m.built_at || '').slice(0, 16))}</span></summary>
      <pre class="ae-method-text">${esc(m.method)}</pre></details>`;
  }

  function drawFan(el, B, trajs, gender, board) {
    if (!el || !window.echarts || !window.USAD || !window.USAD.charts) return;
    const { colors: C, MONO, UI } = USAD.charts;
    const ages = B.map((x) => x.age);
    const band = (lo, hi, color, name) => [
      { name, type: 'line', data: lo, stack: name, symbol: 'none', lineStyle: { opacity: 0 }, silent: true },
      { name, type: 'line', data: hi.map((v, i) => +(v - lo[i]).toFixed(2)), stack: name, symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color }, silent: true },
    ];
    const tc = [C.red, C.warn, C.ink3];
    // athlete ages outside the band range still need an x slot
    const allAges = [...new Set(ages.concat(...trajs.map((t) => t.pts.map((p) => p[0]))))].sort((a, b) => a - b);
    const at = (arr, key) => allAges.map((a) => { const i = ages.indexOf(a); return i >= 0 ? B[i][key] : null; });
    USAD.charts.mount(el, {
      grid: { left: 48, right: 120, top: 24, bottom: 64 },
      tooltip: { trigger: 'axis', formatter: (ps) => { const a = allAges[ps[0].dataIndex]; const i = ages.indexOf(a); let s = `<b>age ${a}</b>`; if (i >= 0) s += ` · ${B[i].n} athlete-seasons<br>p10 ${f1(B[i].p10)} · p25 ${f1(B[i].p25)} · <b>median ${f1(B[i].p50)}</b> · p75 ${f1(B[i].p75)} · p90 ${f1(B[i].p90)}`; trajs.forEach((t) => { const p = t.pts.find((x) => x[0] === a); if (p) s += `<br><b>${esc(t.name)}</b> ${f1(p[1])} (${p[2]})`; }); return s; } },
      legend: { bottom: 0, left: 'center', data: ['10–90%', '25–75%', 'Median'].concat(trajs.map((t) => t.name)) },
      xAxis: { type: 'category', data: allAges, name: 'age (31 Dec)', nameLocation: 'middle', nameGap: 24, boundaryGap: false },
      yAxis: { type: 'value', name: 'pts / optional dive', scale: true },
      series: [
        ...band(at(B, 'p10'), at(B, 'p90'), 'rgba(143,195,234,.28)', '10–90%'),
        ...band(at(B, 'p25'), at(B, 'p75'), 'rgba(0,154,199,.30)', '25–75%'),
        { name: 'Median', type: 'line', data: at(B, 'p50'), symbol: 'none', lineStyle: { color: C.navy, width: 2 }, connectNulls: true },
        ...trajs.map((t, k) => ({ name: t.name, type: 'line', data: allAges.map((a) => { const p = t.pts.find((x) => x[0] === a); return p ? p[1] : null; }), connectNulls: true, symbol: 'circle', symbolSize: 9, lineStyle: { color: tc[k % 3], width: 2 }, itemStyle: { color: tc[k % 3], borderColor: '#fff', borderWidth: 1.5 },
          label: { show: true, formatter: (d) => d.value == null ? '' : f1(d.value), position: 'top', fontFamily: MONO, fontSize: 10.5, color: tc[k % 3] },
          endLabel: { show: true, formatter: t.name.split(' ').slice(-1)[0], fontFamily: UI, fontSize: 11, fontWeight: 600, color: tc[k % 3] } })),
      ],
    }, { filename: `age-progression-${gender}-${board}` });
  }

  /* ---------- talent board (no athlete) ---------- */
  async function renderBoard(root) {
    let seasons = [];
    try {
      const r = await q(`SELECT max(meet_year) AS y FROM hp_models.athlete_season_ppd`);
      if (!st.season) st.season = r.rows[0] && r.rows[0].y ? +r.rows[0].y : new Date().getFullYear();
    } catch (e) { notBuilt(root, e.message); return; }
    const m = await method();
    try {
      const r = await q(`SELECT s.diver_id, s.diver_name, s.gender, s.discipline, s.age, s.width, s.n_opt_dives, s.exec_mean, s.dd_mean, s.ppd, s.pct_in_age, b.p50, b.p90, b.p97
                         FROM hp_models.athlete_season_ppd s
                         LEFT JOIN hp_models.age_bands b ON b.gender = s.gender AND b.discipline = s.discipline AND b.age = s.age
                         WHERE s.meet_year = $1 AND s.gender = $2 AND s.width <= 2 AND s.age BETWEEN $3 AND $4 AND s.pct_in_age IS NOT NULL
                         ORDER BY s.pct_in_age DESC, s.ppd DESC LIMIT 400`, [st.season, st.gender, st.minAge, st.maxAge]);
      seasons = r.rows;
    } catch (e) { notBuilt(root, e.message); return; }
    const boards = ['1m', '3m', 'Platform'];
    const byBoard = Object.fromEntries(boards.map((d) => [d, seasons.filter((s) => s.discipline === d).slice(0, 15)]));
    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>Ahead of their age — ${esc(st.season)}</h3>
            <p class="ae-soft">Every US athlete with a known age window (two years or less) and 6+ optional dives this season, ranked by percentile for their age on each board. Points per optional dive = 3 × DD × execution. Tap a name to open the athlete.</p></div>
          <div class="ae-controls">
            <button class="ae-pill ${st.gender === 'Female' ? 'active' : ''}" onclick="AEAge.set('gender','Female')">Girls</button>
            <button class="ae-pill ${st.gender === 'Male' ? 'active' : ''}" onclick="AEAge.set('gender','Male')">Boys</button>
            <span class="ae-soft" style="margin:0 4px">ages</span>
            ${[[11,13],[12,15],[14,17],[11,17]].map(([a,b]) => `<button class="ae-pill ${st.minAge === a && st.maxAge === b ? 'active' : ''}" onclick="AEAge.ages(${a},${b})">${a}–${b}</button>`).join('')}
            <button class="ae-pill" onclick="AEAge.set('season',${st.season - 1})">◀ ${st.season - 1}</button>
          </div>
        </div>
        <div class="ae-age-boards">
          ${boards.map((d) => `<div class="ae-age-board"><h4>${esc(d)}</h4>
            ${byBoard[d].length ? `<table class="data-table ae-tbl"><thead><tr><th>Athlete</th><th class="num">Age</th><th class="num">Pts/dive</th><th class="num">Age median</th><th class="num">Pctl</th></tr></thead><tbody>
            ${byBoard[d].map((s) => `<tr><td><a href="#" onclick="AEApp.pick('${escJsAttr(s.diver_id)}');AEApp.go('age');return false;" class="ae-link">${esc(s.diver_name)}</a></td><td class="num">${esc(s.age)}${+s.width > 1 ? '<span class="ae-soft">±½</span>' : ''}</td><td class="num"><b>${f1(s.ppd)}</b></td><td class="num">${f1(s.p50)}</td><td class="num"><span class="hp-badge ${+s.pct_in_age >= 97 ? 'good' : 'info'}">${Math.round(+s.pct_in_age)}</span></td></tr>`).join('')}
            </tbody></table>` : '<div class="ae-empty">Nobody in this age range on this board.</div>'}
          </div>`).join('')}
        </div>
      </div>
      ${methodCard(m)}`;
  }

  async function render(root) {
    root.innerHTML = `<div class="ae-card"><div class="ae-empty">Loading the age model…</div></div>`;
    const b = window.AE.state.bundle;
    if (b) return renderAthlete(root, b); else return renderBoard(root);
  }

  window.AEAge = {
    render,
    setBoard(d) { st.board = d; window.AEApp.rerender(); },
    set(k, v) { st[k] = v; window.AEApp.rerender(); },
    ages(a, b) { st.minAge = a; st.maxAge = b; window.AEApp.rerender(); },
  };
})();
