/* ============================================================
   ae-field.js — Field Intel, rebuilt on the verified analytics
   layer. Replaces the legacy main.js dashboard whose cumulative-
   score aggregation produced impossible numbers. Every figure here
   traces to analytics.benchmarks / field profiles / result_phases
   with per-round official scores.

   Sections: Data Pulse · The World Stage · The Moving Bar ·
   The Difficulty Arms Race · Where the Points Leak · Depth of Field
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr, num, mean, q } = window.AE;
  const C = window.AECharts;
  const EVENTS = [
    { gender: 'Female', discipline: '3m', label: 'Women · 3m' },
    { gender: 'Male', discipline: '3m', label: 'Men · 3m' },
    { gender: 'Female', discipline: 'Platform', label: 'Women · Platform' },
    { gender: 'Male', discipline: 'Platform', label: 'Men · Platform' },
  ];
  const f1 = (v) => v == null ? '—' : Number(v).toFixed(1);
  let booted = false;

  async function bootstrap() {
    if (booted) return;
    booted = true;
    const root = document.getElementById('fieldRoot');
    root.innerHTML = `<div class="ae-fi-skel">${'<div class="ae-skel"></div>'.repeat(4)}</div>`;

    try {
      const [pulse, bench, listDD, groupExec, depth] = await Promise.all([
        loadPulse(), loadBenchmarks(), loadListDD(), loadGroupExec(), loadDepth(),
      ]);
      const usBest = await loadUSBest(bench);
      root.innerHTML =
        pulseHtml(pulse) +
        worldStageHtml(bench, usBest) +
        movingBarHtml(bench) +
        armsRaceHtml(listDD) +
        heatHtml(groupExec) +
        depthHtml(depth);
    } catch (e) {
      root.innerHTML = `<div class="ae-card"><div class="ae-empty" style="color:var(--brand-red)">Field Intel failed to load: ${esc(e.message || e)}</div></div>`;
      console.error('[AEField]', e);
    }
  }

  /* ---------------- data ---------------- */
  async function loadPulse() {
    const r = await q(`
      SELECT (SELECT COUNT(*) FROM core.dive_sheets) AS dives,
             (SELECT COUNT(DISTINCT meet_id) FROM core.dive_sheets) AS sheet_meets,
             (SELECT COUNT(*) FROM core.dive_sheets WHERE judges_scores IS NOT NULL AND judges_scores <> '') AS judge_dives,
             (SELECT COUNT(*) FROM core.result_phases) AS phases,
             (SELECT COUNT(DISTINCT meet_id) FROM core.result_phases) AS meets,
             (SELECT COUNT(DISTINCT diver_id) FROM core.result_phases) AS athletes,
             (SELECT MIN(meet_year) FROM core.result_phases) AS y0,
             (SELECT MAX(meet_year) FROM core.result_phases) AS y1`);
    const p = r.rows[0];
    Object.keys(p).forEach((k) => { p[k] = num(p[k]); });
    return p;
  }

  async function loadBenchmarks() {
    const r = await q(`
      SELECT meet_id, meet_name, meet_year, gender, discipline, n_semi, n_final,
             win_score, medal_score, final_cut, semi_cut
      FROM analytics.benchmarks
      WHERE competition_family = 'World Aquatics'
        AND gender IN ('Male','Female') AND discipline IN ('3m','Platform')
      ORDER BY meet_year, meet_id`);
    r.rows.forEach((b) => ['meet_year','n_semi','n_final','win_score','medal_score','final_cut','semi_cut'].forEach((k) => { b[k] = num(b[k]); }));
    return r.rows;
  }

  async function loadUSBest(bench) {
    // Best US score at each World Aquatics meet we benchmark against, same
    // scoring basis (fresh per-round WA scores) — apples to apples.
    const r = await q(`
      SELECT meet_id, gender, discipline, MAX(posted_score) AS best,
             (ARRAY_AGG(diver_name ORDER BY posted_score DESC))[1] AS name
      FROM core.result_phases
      WHERE competition_family = 'World Aquatics' AND nat = 'USA'
        AND COALESCE(is_synchronized,false) = false
        AND gender IN ('Male','Female') AND discipline IN ('3m','Platform')
        AND posted_score IS NOT NULL
      GROUP BY meet_id, gender, discipline`);
    const map = new Map();
    r.rows.forEach((x) => map.set(x.meet_id + '|' + x.gender + '|' + x.discipline, { v: num(x.best), name: prettyName(x.name) }));
    return map;
  }

  function prettyName(n) {
    // WA names arrive "SURNAME Given" — flip and title-case the surname.
    if (!n) return '';
    const m = String(n).match(/^([A-Z][A-Z'\-\s]+)\s+(.+)$/);
    if (!m) return n;
    const sur = m[1].trim().toLowerCase().replace(/(^|[\s'\-])\w/g, (c) => c.toUpperCase());
    return m[2] + ' ' + sur;
  }

  async function loadListDD() {
    const r = await q(`
      SELECT scope, gender, discipline, meet_year, n_lists, avg_list_dd, p90_list_dd
      FROM analytics.field_list_dd
      WHERE scope IN ('us-senior','world') AND gender IN ('Male','Female')
        AND discipline IN ('3m','Platform')`);
    r.rows.forEach((x) => ['meet_year','n_lists','avg_list_dd','p90_list_dd'].forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  async function loadGroupExec() {
    const r = await q(`
      SELECT scope, gender, discipline, category_code, meet_year, n, avg_exec
      FROM analytics.field_group_exec
      WHERE scope IN ('us-senior','world') AND gender IN ('Male','Female')
        AND discipline IN ('3m','Platform') AND category_code IN ('1','2','3','4','5','6')`);
    r.rows.forEach((x) => ['meet_year','n','avg_exec'].forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  async function loadDepth() {
    const r = await q(`
      SELECT gender, discipline, diver_id, MAX(diver_name) AS name,
             MAX(posted_score) AS best, (ARRAY_AGG(meet_year ORDER BY posted_score DESC))[1] AS yr
      FROM core.result_phases
      WHERE competition_family = 'USA Diving' AND event_level = 'Senior'
        AND round_stage = 'Final' AND COALESCE(is_synchronized,false) = false
        AND gender IN ('Male','Female') AND discipline IN ('3m','Platform')
        AND posted_score IS NOT NULL AND place < 100
      GROUP BY gender, discipline, diver_id`);
    r.rows.forEach((x) => { x.best = num(x.best); x.yr = num(x.yr); });
    return r.rows;
  }

  /* ---------------- sections ---------------- */
  function pulseHtml(p) {
    const chips = [
      [p.dives, 'dives scored'], [p.athletes, 'athletes tracked'], [p.meets, 'meets'],
      [`${p.y0}–${p.y1}`, 'seasons'], [p.judge_dives, 'judge-by-judge dives'],
    ];
    return `<div class="ae-pulse">
      <div class="ae-pulse-title">THE DATASET<span>growing nightly — scraper is back-filling toward 2015</span></div>
      <div class="ae-pulse-chips">${chips.map(([v, l]) => `<div class="ae-pulse-chip"><b>${typeof v === 'number' ? v.toLocaleString() : esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
    </div>`;
  }

  function latestChampMeet(bench, ev) {
    const rows = bench.filter((b) => b.gender === ev.gender && b.discipline === ev.discipline && b.medal_score != null);
    if (!rows.length) return null;
    const champs = rows.filter((b) => /Championships/i.test(b.meet_name || '') && b.n_semi > 0);
    const pool = champs.length ? champs : rows;
    return pool.reduce((a, b) => (b.meet_year > a.meet_year) ? b : a);
  }

  function worldStageHtml(bench, usBest) {
    const cards = EVENTS.map((ev) => {
      const bm = latestChampMeet(bench, ev);
      if (!bm) return `<div class="ae-stage-card"><div class="ae-stage-ev">${esc(ev.label)}</div><div class="ae-empty">Awaiting data</div></div>`;
      const us = usBest.get(bm.meet_id + '|' + ev.gender + '|' + ev.discipline) || null;
      const gap = us && bm.medal_score != null ? bm.medal_score - us.v : null;
      return `<div class="ae-stage-card">
        <div class="ae-stage-ev">${esc(ev.label)}</div>
        <div class="ae-stage-meet">${esc(bm.meet_name)}</div>
        ${C.ladder({ win: bm.win_score, medal: bm.medal_score, cut: bm.final_cut, us, h: 252 })}
        ${gap != null ? `<div class="ae-stage-gap ${gap <= 0 ? 'good' : ''}">${gap <= 0 ? `US best CLEARED the medal line by ${f1(-gap)}` : `${f1(gap)} points from the medal line`}</div>` : `<div class="ae-stage-gap dim">No US result at this meet</div>`}
      </div>`;
    }).join('');
    return `<section class="ae-stage">
      <div class="ae-stage-head">
        <h2>THE WORLD STAGE</h2>
        <p>The latest World Championships, drawn to scale: gold, the medal line, the final cut — and the best American in that same pool. Fresh per-round scores, no cumulative mixing.</p>
      </div>
      <div class="ae-stage-grid">${cards}</div>
    </section>`;
  }

  function shortMeet(name, year) {
    const n = String(name || '');
    if (/Championships/i.test(n) && /World Aquatics/i.test(n)) return ['Worlds', String(year)];
    if (/Super Final/i.test(n)) return ['Super Final', String(year)];
    if (/American Cup/i.test(n)) return ['Am Cup', String(year)];
    if (/World Cup/i.test(n)) return ['World Cup', String(year)];
    return [n.slice(0, 10), String(year)];
  }

  function movingBarHtml(bench) {
    const panels = EVENTS.map((ev) => {
      const rows = bench.filter((b) => b.gender === ev.gender && b.discipline === ev.discipline &&
        (b.win_score != null || b.final_cut != null));
      if (!rows.length) return '';
      const labels = rows.map((b) => shortMeet(b.meet_name, b.meet_year));
      const svg = C.areaTrend({
        labels,
        series: [
          { name: 'Gold', color: C.COLORS.GOLD, values: rows.map((b) => b.win_score), area: true },
          { name: 'Medal', color: C.COLORS.RED, values: rows.map((b) => b.medal_score) },
          { name: 'Final cut', color: C.COLORS.POOL, values: rows.map((b) => b.final_cut), dash: true },
        ], w: 440, h: 232,
      });
      return `<div class="ae-mb-panel"><div class="ae-mb-title">${esc(ev.label)}</div>${svg}</div>`;
    }).join('');
    return `<section class="ae-card ae-fi-sec">
      <div class="ae-card-h"><div><h3>The Moving Bar</h3>
      <p class="ae-soft">What winning, medaling, and making the final has cost at every World Aquatics meet on record. The question for 2028 isn't today's gap — it's the slope. New meets join this chart automatically as the scraper lands them.</p></div>
      <div class="ae-legend"><span><i style="background:${C.COLORS.GOLD}"></i>Gold</span><span><i style="background:${C.COLORS.RED}"></i>Medal (3rd)</span><span><i style="background:${C.COLORS.POOL}"></i>Final cut</span></div></div>
      <div class="ae-mb-grid">${panels}</div>
    </section>`;
  }

  function armsRaceHtml(listDD) {
    const pick = (scope, ev) => {
      const rows = listDD.filter((x) => x.scope === scope && x.gender === ev.gender && x.discipline === ev.discipline && x.n_lists >= 5);
      if (!rows.length) return null;
      return rows.reduce((a, b) => b.meet_year > a.meet_year ? b : a);
    };
    const rows = EVENTS.map((ev) => {
      const us = pick('us-senior', ev), wd = pick('world', ev);
      return { label: ev.label, us: us && us.avg_list_dd, world: wd && wd.avg_list_dd, worldP90: wd && wd.p90_list_dd };
    });
    return `<section class="ae-card ae-fi-sec">
      <div class="ae-card-h"><div><h3>The Difficulty Arms Race</h3>
      <p class="ae-soft">Average list DD carried by finalists — US senior championships (navy) vs World Aquatics finals (red). The dashed tick is the world's top decile. Difficulty caps the score before anyone leaves the board: a +2.0 DD gap at 7.0 execution is 42 points conceded at entry.</p></div></div>
      ${C.dumbbell(rows, { w: 780 })}
      <div class="ae-legend"><span><i style="background:${C.COLORS.NAVY}"></i>US senior finalists</span><span><i style="background:${C.COLORS.RED}"></i>World finalists</span><span class="ae-soft">number = DD the US would need to add to match</span></div>
    </section>`;
  }

  function heatHtml(groupExec) {
    const CATS = [['1','Front'],['2','Back'],['3','Reverse'],['4','Inward'],['5','Twister'],['6','Armstand']];
    const cell = (scope, ev, cat) => {
      const rows = groupExec.filter((x) => x.scope === scope && x.gender === ev.gender && x.discipline === ev.discipline && x.category_code === cat && x.n >= 20);
      if (!rows.length) return null;
      const recent = rows.sort((a, b) => b.meet_year - a.meet_year).slice(0, 2);
      return mean(recent.map((r) => r.avg_exec));
    };
    let body = '';
    CATS.forEach(([code, name]) => {
      body += `<div class="ae-heat-rowlab">${esc(name)}</div>`;
      EVENTS.forEach((ev) => {
        const us = cell('us-senior', ev, code), wd = cell('world', ev, code);
        if (us == null || wd == null) { body += `<div class="ae-heat-cell ae-heat-na">—</div>`; return; }
        const d = us - wd;
        const cls = d >= 0.15 ? 'ahead2' : d >= 0.02 ? 'ahead1' : d > -0.02 ? 'even' : d > -0.35 ? 'behind1' : d > -0.7 ? 'behind2' : 'behind3';
        body += `<div class="ae-heat-cell ae-heat-${cls}" title="${esc(ev.label + ' · ' + name)} — US ${us.toFixed(2)} vs World ${wd.toFixed(2)} per judge">${d >= 0 ? '+' : ''}${d.toFixed(2)}</div>`;
      });
    });
    return `<section class="ae-card ae-fi-sec">
      <div class="ae-card-h"><div><h3>Where the Points Leak</h3>
      <p class="ae-soft">US senior-field execution minus the world field, per judge, by dive group. Red cells are where American dives score lower out of the same six shapes — each −0.5 here is roughly 1.5 raw points conceded on every dive of that group.</p></div></div>
      <div class="ae-heat-grid">
        <div></div>${EVENTS.map((ev) => `<div class="ae-heat-collab">${esc(ev.label.replace(' · ', ' '))}</div>`).join('')}
        ${body}
      </div>
      <div class="ae-legend"><span class="ae-soft">Scale: judge points per dive · deep red ≤ −0.7 · green = US ahead · dives with n&lt;20 excluded</span></div>
    </section>`;
  }

  function depthHtml(depth) {
    const cols = EVENTS.map((ev) => {
      const rows = depth.filter((x) => x.gender === ev.gender && x.discipline === ev.discipline)
        .sort((a, b) => b.best - a.best).slice(0, 6);
      if (!rows.length) return '';
      return `<div class="ae-depth-col">
        <div class="ae-depth-ev">${esc(ev.label)}</div>
        ${rows.map((r, i) => `
          <button class="ae-depth-row" onclick="AEApp.pick('${escJsAttr(r.diver_id)}')" title="Open passport">
            <span class="ae-depth-rank">${i + 1}</span>
            <span class="ae-depth-name">${esc(r.name)}<em>best senior final · ${esc(r.yr)}</em></span>
            <span class="ae-depth-score">${f1(r.best)}</span>
          </button>`).join('')}
      </div>`;
    }).join('');
    return `<section class="ae-card ae-fi-sec">
      <div class="ae-card-h"><div><h3>Depth of Field</h3>
      <p class="ae-soft">Best US senior-final score on record, per Olympic event. Tap any athlete to open their full passport — dive DNA, pressure profile, and their line to the podium.</p></div></div>
      <div class="ae-depth-grid">${cols}</div>
    </section>`;
  }

  window.AEField = { bootstrap };
})();
