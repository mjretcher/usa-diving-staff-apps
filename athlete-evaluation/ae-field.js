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

  // Both sides of every comparison are selectable. Defaults keep the original
  // US-senior-vs-world framing, but the other three fields are now reachable.
  const cmp = { a: 'us-senior', b: 'world' };
  const GUARD = (window.AE.GUARD || { cell: 20, field: 150 });
  const scopeName = (id) => {
    const s2 = (window.AE.SCOPES || []).find((x) => x.id === id);
    return s2 ? s2.label : id;
  };

  function cmpBar() {
    const opts = (id) => (window.AE.SCOPES || [])
      .map((sc) => `<option value="${esc(sc.id)}"${sc.id === id ? ' selected' : ''}>${esc(sc.label)}</option>`).join('');
    return `<section class="ae-card ae-fi-sec"><div class="ae-ctl-row">
      <span class="ae-ctl-lab">Compare</span>
      <select class="ae-sel" onchange="AEField.setA(this.value)">${opts(cmp.a)}</select>
      <span class="ae-ctl-lab" style="min-width:auto">against</span>
      <select class="ae-sel" onchange="AEField.setB(this.value)">${opts(cmp.b)}</select>
      </div></section>`;
  }

  async function bootstrap(force) {
    if (booted && !force) return;
    booted = true;
    const root = document.getElementById('fieldRoot');
    root.innerHTML = `<div class="ae-fi-skel">${'<div class="ae-skel"></div>'.repeat(4)}</div>`;

    try {
      const [pulse, bench, listDD, groupExec, depth, profile, rankCost] = await Promise.all([
        loadPulse(), loadBenchmarks(), loadListDD(), loadGroupExec(), loadDepth(),
        loadProfile(), loadRankCost(),
      ]);
      const usBest = await loadUSBest(bench);
      root.innerHTML =
        cmpBar() +
        decompositionHtml(profile) +
        rankCostHtml(rankCost) +
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
  // Score decomposed by finishing band: is the podium winning on difficulty
  // or on execution? Score = 3 x SUM(DD x execution), and result_phases
  // carries phase_dd_sum, so the split is exact rather than estimated.
  async function loadProfile() {
    const r = await q(`SELECT scope, gender, discipline, dive_count, meet_year, band,
                              n, avg_score, avg_list_dd, avg_exec, p50_score, p90_score
                       FROM analytics.event_profile
                       WHERE meet_year >= 2018`);
    r.rows.forEach((x) => ['dive_count','meet_year','n','avg_score','avg_list_dd','avg_exec',
      'p50_score','p90_score'].forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  // What each finishing place actually costs, with its spread across meets.
  async function loadRankCost() {
    const r = await q(`SELECT scope, gender, discipline, dive_count, place, n_meets,
                              avg_score, p25_score, p50_score, p75_score, sd_score
                       FROM analytics.rank_cost WHERE place <= 18`);
    r.rows.forEach((x) => ['dive_count','place','n_meets','avg_score','p25_score',
      'p50_score','p75_score','sd_score'].forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

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
      WHERE gender IN ('Male','Female')
        AND discipline IN ('3m','Platform')`);
    r.rows.forEach((x) => ['meet_year','n_lists','avg_list_dd','p90_list_dd'].forEach((k) => { x[k] = num(x[k]); }));
    return r.rows;
  }

  async function loadGroupExec() {
    const r = await q(`
      SELECT scope, gender, discipline, category_code, meet_year, n, avg_exec
      FROM analytics.field_group_exec
      WHERE gender IN ('Male','Female') AND discipline IN ('3m','Platform')`);
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

  /* ---------------- field decomposition ---------------- */

  const EV_LABEL = { '1m': '1m', '3m': '3m', Platform: 'Platform' };
  const G_LABEL = { Male: 'Men', Female: 'Women' };

  // For a scope+gender+discipline, pick the dive-count format with the most
  // results — comparing across formats is the error this whole layer exists
  // to prevent.
  function dominantFormat(rows) {
    const c = new Map();
    rows.forEach((r) => c.set(r.dive_count, (c.get(r.dive_count) || 0) + r.n));
    let best = null, bestN = 0;
    c.forEach((n, dc) => { if (n > bestN) { bestN = n; best = dc; } });
    return best;
  }

  function decompositionHtml(profile) {
    const scope = cmp.a;
    const rows = profile.filter((r) => r.scope === scope);
    if (!rows.length) {
      return `<section class="ae-card ae-fi-sec"><h3>Where the podium comes from</h3>
        <p class="ae-soft">No decomposable results for ${esc(scopeName(scope))}. A result needs a
        dive count and a list DD to be split into difficulty and execution.</p></section>`;
    }

    const cells = [];
    ['Male', 'Female'].forEach((g) => {
      ['1m', '3m', 'Platform'].forEach((d) => {
        const sub = rows.filter((r) => r.gender === g && r.discipline === d);
        if (!sub.length) return;
        const dc = dominantFormat(sub);
        const use = sub.filter((r) => r.dive_count === dc);
        const band = (b) => {
          const bs = use.filter((r) => r.band === b);
          const n = bs.reduce((a, r) => a + r.n, 0);
          if (!n) return null;
          return {
            n,
            score: bs.reduce((a, r) => a + r.avg_score * r.n, 0) / n,
            dd: bs.reduce((a, r) => a + r.avg_list_dd * r.n, 0) / n,
            exec: bs.reduce((a, r) => a + r.avg_exec * r.n, 0) / n,
          };
        };
        const pod = band('podium'), fin = band('finalist');
        if (!pod || !fin || pod.n < GUARD.cell || fin.n < GUARD.cell) return;

        // Split the podium-minus-finalist gap into its two causes.
        // score = 3 x DD x exec, so hold one factor at the finalist level
        // to attribute the difference.
        const ddPart = 3 * (pod.dd - fin.dd) * fin.exec;
        const exPart = 3 * pod.dd * (pod.exec - fin.exec);
        const total = pod.score - fin.score;
        cells.push({ g, d, dc, pod, fin, ddPart, exPart, total });
      });
    });

    if (!cells.length) {
      return `<section class="ae-card ae-fi-sec"><h3>Where the podium comes from</h3>
        <p class="ae-soft">Not enough finals results in ${esc(scopeName(scope))} to separate the
        podium from the rest of the final.</p></section>`;
    }

    const maxAbs = Math.max(...cells.map((c) => Math.abs(c.ddPart) + Math.abs(c.exPart)), 1);
    const bar = (c) => {
      const w = 260;
      const dw = Math.abs(c.ddPart) / maxAbs * w, ew = Math.abs(c.exPart) / maxAbs * w;
      return `<svg viewBox="0 0 ${w} 16" class="ae-decomp-bar" preserveAspectRatio="none">
        <rect x="0" y="2" width="${dw}" height="12" fill="${C.COLORS.NAVY}" opacity=".85"></rect>
        <rect x="${dw}" y="2" width="${ew}" height="12" fill="${C.COLORS.POOL}" opacity=".85"></rect>
      </svg>`;
    };

    return `<section class="ae-card ae-fi-sec">
      <h3>Where the podium comes from</h3>
      <p class="ae-soft">A total is 3 &times; the sum of (difficulty &times; execution), so the gap
        between the podium and the rest of the final splits exactly into those two causes. This is
        the difference in ${esc(scopeName(scope))} finals: how much the medallists gain from
        carrying a harder list, and how much from performing it better.</p>
      <table class="ae-tbl">
        <thead><tr><th>Event</th><th class="r">Podium</th><th class="r">4th&ndash;12th</th>
          <th class="r">Gap</th><th class="r">From difficulty</th><th class="r">From execution</th>
          <th style="width:270px">Split</th><th class="r">Results</th></tr></thead>
        <tbody>${cells.map((c) => `<tr>
          <td>${esc(G_LABEL[c.g] || c.g)} ${esc(EV_LABEL[c.d] || c.d)}
            <span class="ae-soft">${c.dc}-dive</span></td>
          <td class="r">${c.pod.score.toFixed(1)}<br><span class="ae-soft">DD ${c.pod.dd.toFixed(1)} &middot; ex ${c.pod.exec.toFixed(2)}</span></td>
          <td class="r">${c.fin.score.toFixed(1)}<br><span class="ae-soft">DD ${c.fin.dd.toFixed(1)} &middot; ex ${c.fin.exec.toFixed(2)}</span></td>
          <td class="r"><b>${c.total >= 0 ? '+' : ''}${c.total.toFixed(1)}</b></td>
          <td class="r" style="color:${C.COLORS.NAVY};font-weight:600">${c.ddPart >= 0 ? '+' : ''}${c.ddPart.toFixed(1)}</td>
          <td class="r" style="color:${C.COLORS.POOL};font-weight:600">${c.exPart >= 0 ? '+' : ''}${c.exPart.toFixed(1)}</td>
          <td>${bar(c)}</td>
          <td class="r">${(c.pod.n + c.fin.n).toLocaleString()}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="ae-legend">
        <span><i style="background:${C.COLORS.NAVY}"></i>points gained from harder dives</span>
        <span><i style="background:${C.COLORS.POOL}"></i>points gained from better execution</span>
      </div>
      <p class="ae-soft">Each row uses the dive-count format most common for that event, so no two
        formats are ever averaged together. Bands need ${GUARD.cell}+ results on each side.</p>
    </section>`;
  }

  /* ---------------- what a place costs ---------------- */

  function rankCostHtml(rankCost) {
    const scope = cmp.b;
    const evs = [];
    ['Male', 'Female'].forEach((g) => ['3m', 'Platform'].forEach((d) => {
      const sub = rankCost.filter((r) => r.scope === scope && r.gender === g && r.discipline === d);
      if (!sub.length) return;
      const dc = dominantFormat(sub.map((r) => ({ dive_count: r.dive_count, n: r.n_meets })));
      const use = sub.filter((r) => r.dive_count === dc && r.n_meets >= 3)
        .sort((a, b) => a.place - b.place);
      if (use.length >= 4) evs.push({ g, d, dc, rows: use });
    }));
    if (!evs.length) {
      return `<section class="ae-card ae-fi-sec"><h3>What a place costs</h3>
        <p class="ae-soft">Not enough repeated finals in ${esc(scopeName(scope))} to establish what
        each finishing position costs.</p></section>`;
    }

    const w = 330, h = 190, padL = 46, padR = 12, padT = 12, padB = 30;
    const chart = (ev) => {
      const rs = ev.rows;
      const lo = Math.min(...rs.map((r) => r.p25_score)) * 0.97;
      const hi = Math.max(...rs.map((r) => r.p75_score)) * 1.03;
      const X = (p) => padL + ((p - rs[0].place) / Math.max(1, rs[rs.length - 1].place - rs[0].place)) * (w - padL - padR);
      const Y = (v) => h - padB - ((v - lo) / (hi - lo || 1)) * (h - padT - padB);
      const area = rs.map((r) => `${X(r.place)},${Y(r.p75_score)}`).join(' ')
        + ' ' + rs.slice().reverse().map((r) => `${X(r.place)},${Y(r.p25_score)}`).join(' ');
      let g = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg">`;
      [0, 0.5, 1].forEach((t) => {
        const v = lo + (hi - lo) * t;
        g += `<line x1="${padL}" y1="${Y(v)}" x2="${w - padR}" y2="${Y(v)}" stroke="#E3E6EF"/>`
          + `<text x="${padL - 6}" y="${Y(v) + 4}" text-anchor="end" class="ae-tick">${v.toFixed(0)}</text>`;
      });
      g += `<polygon points="${area}" fill="${C.COLORS.SKY}" opacity=".45"></polygon>`;
      g += `<polyline points="${rs.map((r) => `${X(r.place)},${Y(r.p50_score)}`).join(' ')}"
             fill="none" stroke="${C.COLORS.NAVY}" stroke-width="2"></polyline>`;
      rs.forEach((r) => {
        g += `<circle cx="${X(r.place)}" cy="${Y(r.p50_score)}" r="3" fill="${C.COLORS.NAVY}">`
          + `<title>Place ${r.place}: median ${r.p50_score.toFixed(1)}, `
          + `middle half ${r.p25_score.toFixed(1)}–${r.p75_score.toFixed(1)} `
          + `across ${r.n_meets} meets</title></circle>`;
      });
      [rs[0].place, rs[Math.floor(rs.length / 2)].place, rs[rs.length - 1].place].forEach((p) => {
        g += `<text x="${X(p)}" y="${h - padB + 16}" text-anchor="middle" class="ae-tick">${p}</text>`;
      });
      g += `<text x="${(padL + w - padR) / 2}" y="${h - 4}" text-anchor="middle" class="ae-axlab">Finishing place</text>`;
      return g + '</svg>';
    };

    return `<section class="ae-card ae-fi-sec">
      <h3>What a place costs</h3>
      <p class="ae-soft">The score that has actually produced each finishing position in
        ${esc(scopeName(scope))} finals since 2018. The line is the median; the band is the middle
        half of results. A single meet's medal line is one observation &mdash; the band is what you
        can plan against.</p>
      <div class="ae-fi-grid">${evs.map((ev) => `<div class="ae-fi-cell">
        <div class="ae-fi-cap">${esc(G_LABEL[ev.g] || ev.g)} ${esc(EV_LABEL[ev.d] || ev.d)}
          <span class="ae-soft">${ev.dc}-dive</span></div>${chart(ev)}
        <div class="ae-soft">Podium ${ev.rows.find((r) => r.place === 3)
          ? ev.rows.find((r) => r.place === 3).p25_score.toFixed(0) + '–'
            + ev.rows.find((r) => r.place === 3).p75_score.toFixed(0) : '—'}
          &middot; final cut ${ev.rows.find((r) => r.place === 12)
          ? ev.rows.find((r) => r.place === 12).p25_score.toFixed(0) + '–'
            + ev.rows.find((r) => r.place === 12).p75_score.toFixed(0) : '—'}</div>
      </div>`).join('')}</div>
    </section>`;
  }

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
      const rows = listDD.filter((x) => x.scope === scope && x.gender === ev.gender && x.discipline === ev.discipline && x.n_lists >= GUARD.lists);
      if (!rows.length) return null;
      return rows.reduce((a, b) => b.meet_year > a.meet_year ? b : a);
    };
    const allRows = EVENTS.map((ev) => {
      const us = pick(cmp.a, ev), wd = pick(cmp.b, ev);
      return { label: ev.label, us: us && us.avg_list_dd, world: wd && wd.avg_list_dd,
               worldP90: wd && wd.p90_list_dd, usN: us && us.n_lists, wdN: wd && wd.n_lists };
    });
    // An event needs a real baseline on both sides or it is not drawn.
    const rows = allRows.filter((r) => r.us != null && r.world != null);
    const dropped = allRows.length - rows.length;
    if (!rows.length) {
      return `<section class="ae-card ae-fi-sec"><h3>The difficulty arms race</h3>
        <p class="ae-soft">No event has enough finalist lists on both sides to compare
        ${esc(scopeName(cmp.a))} with ${esc(scopeName(cmp.b))}. Try a larger field.</p></section>`;
    }
    return `<section class="ae-card ae-fi-sec">
      <div class="ae-card-h"><div><h3>The Difficulty Arms Race</h3>
      ${dropped ? `<p class="ae-soft ae-samplenote">${dropped} event${dropped === 1 ? '' : 's'} omitted — fewer than ${GUARD.lists} finalist lists on one side.</p>` : ''}
      <p class="ae-soft">Average list DD carried by finalists — ${esc(scopeName(cmp.a))} (navy) vs ${esc(scopeName(cmp.b))} (red). The dashed tick is the second field's top decile. Difficulty caps the score before anyone leaves the board: a +2.0 DD gap at 7.0 execution is 42 points conceded at entry.</p></div></div>
      ${C.dumbbell(rows, { w: 780 })}
      <div class="ae-legend"><span><i style="background:${C.COLORS.NAVY}"></i>${esc(scopeName(cmp.a))}</span><span><i style="background:${C.COLORS.RED}"></i>${esc(scopeName(cmp.b))}</span><span class="ae-soft">number = DD the first field would need to add to match</span></div>
    </section>`;
  }

  function heatHtml(groupExec) {
    // Groups come from the rulebook taxonomy now: twists split by takeoff
    // direction, armstands by direction. The old ['5','6'] codes no longer exist.
    const ORDER = (window.AE.CAT_ORDER) || ['1','2','3','4','51','52','53','54','61','62','63'];
    const NAMES = (window.AE.CAT_NAMES) || {};
    const CATS = ORDER.map((c) => [c, NAMES[c] || c]);
    const cell = (scope, ev, cat) => {
      const rows = groupExec.filter((x) => x.scope === scope && x.gender === ev.gender && x.discipline === ev.discipline && x.category_code === cat && x.n >= GUARD.cell);
      if (!rows.length) return null;
      const recent = rows.sort((a, b) => b.meet_year - a.meet_year).slice(0, 2);
      return mean(recent.map((r) => r.avg_exec));
    };
    let body = '';
    CATS.forEach(([code, name]) => {
      body += `<div class="ae-heat-rowlab">${esc(name)}</div>`;
      EVENTS.forEach((ev) => {
        const us = cell(cmp.a, ev, code), wd = cell(cmp.b, ev, code);
        if (us == null || wd == null) { body += `<div class="ae-heat-cell ae-heat-na">—</div>`; return; }
        const d = us - wd;
        const cls = d >= 0.15 ? 'ahead2' : d >= 0.02 ? 'ahead1' : d > -0.02 ? 'even' : d > -0.35 ? 'behind1' : d > -0.7 ? 'behind2' : 'behind3';
        body += `<div class="ae-heat-cell ae-heat-${cls}" title="${esc(ev.label + ' · ' + name)} — ${esc(scopeName(cmp.a))} ${us.toFixed(2)} vs ${esc(scopeName(cmp.b))} ${wd.toFixed(2)} per judge">${d >= 0 ? '+' : ''}${d.toFixed(2)}</div>`;
      });
    });
    return `<section class="ae-card ae-fi-sec">
      <div class="ae-card-h"><div><h3>Where the Points Leak</h3>
      <p class="ae-soft">${esc(scopeName(cmp.a))} execution minus ${esc(scopeName(cmp.b))}, per judge, by dive group. Red cells are where the first field scores lower — each −0.5 is roughly 1.5 raw points conceded on every dive of that group. A dash means one side has too few dives (under 20) to compare.</p></div></div>
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

  window.AEField = {
    bootstrap,
    setA(v) { cmp.a = v; bootstrap(true); },
    setB(v) { cmp.b = v; bootstrap(true); },
  };
})();
