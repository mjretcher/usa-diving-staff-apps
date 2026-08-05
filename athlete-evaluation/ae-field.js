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

  // The five field datasets describe populations and do not depend on who is
  // selected, so they are fetched once and kept. Switching athlete or changing
  // the comparison only repaints.
  let cache = null;

  function paint(root) {
    root.innerHTML =
      cmpBar() +
      decompositionHtml(cache.profile) +
      diagnosisHtml(cache.profile) +
      rankCostHtml(cache.rankCost) +
      armsRaceHtml(cache.listDD) +
      heatHtml(cache.groupExec) +
      depthHtml(cache.depth);
  }

  async function render(root) {
    root = root || document.getElementById('fieldRoot') || document.getElementById('view-field');
    if (!root) return;
    if (cache) { paint(root); return; }
    root.innerHTML = `<div class="ae-fi-skel">${'<div class="ae-skel"></div>'.repeat(4)}</div>`;
    try {
      const [listDD, groupExec, depth, profile, rankCost] = await Promise.all([
        loadListDD(), loadGroupExec(), loadDepth(), loadProfile(), loadRankCost(),
      ]);
      cache = { listDD, groupExec, depth, profile, rankCost };
      booted = true;
      paint(root);
    } catch (e) {
      root.innerHTML = `<div class="ae-card"><div class="ae-empty" style="color:var(--brand-red)">Field Intel failed to load: ${esc(e.message || e)}</div></div>`;
      console.error('[AEField]', e);
    }
  }

  // Kept so anything still calling bootstrap() keeps working.
  async function bootstrap(force) {
    if (force) cache = null;
    return render(null);
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

  /* ---------------- the selected athlete, on the field ----------------
     These charts describe a population. On their own they are reference
     material: "the podium median is 445" is a fact about other people. The
     point of putting the selected athlete on them is to turn each one into an
     answer about a specific diver — what their current form actually buys.

     Comparability is the whole risk here, so the athlete's marks are drawn
     with EXACTLY the predicate analytics.rank_cost is built from: finals only,
     non-cumulative, non-synchronized, 2018 onward, and the same scope, gender,
     discipline and dive-count format. Anything else silently compares an
     11-dive international total against a 6-dive age-group one, or a
     cumulative carry against a single-round score.

     Coaching context, not a selection metric: an athlete's position here
     depends on how completely the scraper has covered their meets, which is
     not equal across athletes. */

  // One definition, in ae-data. This was a local copy of the SQL rule and it
  // was already wrong: it returned 'world' for every World Aquatics result,
  // American Cup included.
  const phaseScope = window.AE.scopeOf;

  function athleteMark(scope, gender, discipline, diveCount) {
    const b = window.AE.state && window.AE.state.bundle;
    if (!b || !b.phases || !b.phases.length) return null;
    const truthy = window.AE.truthy;
    const rows = b.phases.filter((p) =>
      p.round_stage === 'Final' &&
      !truthy(p.score_is_cumulative) &&
      !truthy(p.is_synchronized) &&
      p.gender === gender && p.discipline === discipline &&
      num(p.phase_dive_count) === diveCount &&
      num(p.meet_year) >= 2018 &&
      num(p.posted_score) != null &&
      phaseScope(p) === scope);
    if (!rows.length) return null;
    const scores = rows.map((p) => num(p.posted_score)).sort((a, b2) => a - b2);
    const years = rows.map((p) => num(p.meet_year));
    // Recent form is the median of the last three finals, not the personal
    // best: a best is one good day and consistently overstates where an
    // athlete would land at the next meet.
    const byRecent = rows.slice().sort((a, b2) => num(b2.meet_year) - num(a.meet_year)).slice(0, 3);
    const rec = byRecent.map((p) => num(p.posted_score)).sort((a, b2) => a - b2);
    return {
      n: rows.length,
      best: scores[scores.length - 1],
      median: window.AE.quantile(scores, 0.5),
      recent: window.AE.quantile(rec, 0.5),
      nRecent: rec.length,
      y0: Math.min(...years), y1: Math.max(...years),
      name: (b.ident && b.ident.display_name) || 'Selected athlete',
    };
  }

  // What place a given score has historically bought: the best place whose
  // median is at or below it. Reported as approximate because it reads one
  // number off a distribution built from several meets.
  function placeFor(score, rows) {
    if (score == null || !rows.length) return null;
    for (const r of rows) if (score >= r.p50_score) return r.place;
    return null;
  }

  /* ---------------- difficulty or execution? ----------------
     The diagnostic this whole section exists for. A score is
     3 x SUM(DD x execution), so the distance between an athlete and a podium
     splits exactly into "their list is harder" and "they performed it better".
     Those have completely different answers — one is a season of new dives,
     the other is water time on the dives you already have — and a raw points
     gap tells you nothing about which one you are looking at.

     The split is exact, not apportioned:
       gap    = 3(DDp x Ep) - 3(DDa x Ea)
       from DD   = 3(DDp - DDa) x Ea
       from exec = 3 x DDp x (Ep - Ea)
     Those two sum to the gap identically. */

  // An athlete's own list DD and execution, from the score identity. Verified
  // across all 172,282 non-cumulative finals: posted_score equals
  // phase_score_from_dives exactly, so execution divides out cleanly.
  //
  // 1.8% of those rows carry a phase_dd_sum that implies an impossible
  // execution — above 10, or near zero — which means a partial DD sum rather
  // than a remarkable dive. Those are dropped rather than averaged in.
  function athleteSplit(scope, gender, discipline, diveCount) {
    const b = window.AE.state && window.AE.state.bundle;
    if (!b || !b.phases) return null;
    const truthy = window.AE.truthy;
    const base = b.phases.filter((p) =>
      p.round_stage === 'Final' &&
      !truthy(p.score_is_cumulative) && !truthy(p.is_synchronized) &&
      p.gender === gender && p.discipline === discipline &&
      num(p.phase_dive_count) === diveCount &&
      num(p.meet_year) >= 2018 &&
      num(p.posted_score) != null && num(p.phase_dd_sum) > 0);

    const usable = base.filter((p) => {
      const e = num(p.posted_score) / (3 * num(p.phase_dd_sum));
      return e >= 2 && e <= 10;
    });
    if (!usable.length) return null;

    // Strictly like-for-like. An earlier version widened to other fields when
    // the athlete had little in the benchmark one, which produced a true but
    // useless number: a platform specialist's junior 3m results measured
    // against a world podium showed a 230-point gap that says nothing about
    // his 3m. Execution marks are also not comparable across meet levels.
    // Coverage is the comparison selector's job, not a silent substitution.
    const use = usable.filter((p) => phaseScope(p) === scope);
    // One final is an anecdote. Two is the minimum from which "current form"
    // means anything, and the count is always shown either way.
    if (use.length < 2) return null;

    const recent = use.slice().sort((a, b2) => num(b2.meet_year) - num(a.meet_year)).slice(0, 3);
    const dd = window.AE.mean(recent.map((p) => num(p.phase_dd_sum)));
    const ex = window.AE.mean(recent.map((p) => num(p.posted_score) / (3 * num(p.phase_dd_sum))));
    const scopes = [...new Set(recent.map((p) => scopeName(phaseScope(p))))];
    return {
      dd, exec: ex, score: 3 * dd * ex,
      n: recent.length, pool: use.length, scopes,
      y0: Math.min(...recent.map((p) => num(p.meet_year))),
      y1: Math.max(...recent.map((p) => num(p.meet_year))),
      dropped: base.length - usable.length,
      name: (b.ident && b.ident.display_name) || 'Selected athlete',
    };
  }

  // "No data" is the wrong thing to tell someone who plainly has results. Sarah
  // Bacon has a stack of US Senior finals; every one is cumulative, because
  // that final is scored prelim plus semi plus final. Comparing her 639.00 to a
  // world podium's 348 would show her 290 points clear of it. The exclusion is
  // right — but saying which exclusion applied is what makes it trustworthy
  // rather than just opaque.
  function splitBlockers(scope) {
    const b = window.AE.state && window.AE.state.bundle;
    const nm = (b && b.ident && b.ident.display_name) || 'This athlete';
    const truthy = window.AE.truthy;
    const fin = (b.phases || []).filter((p) =>
      p.round_stage === 'Final' && !truthy(p.is_synchronized) && num(p.meet_year) >= 2018);
    if (!fin.length) return `No finals on record for ${esc(nm)} since 2018.`;

    const cum = fin.filter((p) => truthy(p.score_is_cumulative)).length;
    const noDD = fin.filter((p) => !truthy(p.score_is_cumulative)
      && !(num(p.phase_dd_sum) > 0 && num(p.phase_dive_count) > 0)).length;
    const inScope = fin.filter((p) => !truthy(p.score_is_cumulative)
      && num(p.phase_dd_sum) > 0 && phaseScope(p) === scope).length;

    const bits = [];
    if (cum) bits.push(`${cum} ${cum === 1 ? 'is' : 'are'} scored cumulatively — a total carried
      across prelims and semis is not a single-round score and cannot be set against a podium average`);
    if (noDD) bits.push(`${noDD} ${noDD === 1 ? 'has' : 'have'} no list DD recorded, so
      ${noDD === 1 ? 'it' : 'they'} cannot be split into difficulty and execution`);
    if (!inScope) bits.push(`none of what remains is in ${esc(scopeName(scope))}`);
    else if (inScope < 2) bits.push(`only ${inScope} of what remains is in
      ${esc(scopeName(scope))}, and one meet is an anecdote rather than current form`);
    return `${esc(nm)} has ${fin.length} final${fin.length === 1 ? '' : 's'} on record since 2018,
      but ${bits.join('; ')}. Switching the comparison field above may give a usable match.`;
  }

  function diagnosisHtml(profile) {
    const scope = cmp.b;
    const b = window.AE.state && window.AE.state.bundle;
    if (!b) return '';

    const rows = profile.filter((r) => r.scope === scope);
    const cells = [];
    // Events where the athlete has usable results but the comparison population
    // does not. The reason the panel is empty differs completely between the
    // two sides, and reporting the athlete-side reason when the podium is what
    // is missing sends someone looking for a problem in the wrong place.
    const thinPodium = [];
    ['Male', 'Female'].forEach((g) => ['1m', '3m', 'Platform'].forEach((d) => {
      const sub = rows.filter((r) => r.gender === g && r.discipline === d);
      if (!sub.length) return;
      const dc = dominantFormat(sub);
      const use = sub.filter((r) => r.dive_count === dc && r.band === 'podium');
      const n = use.reduce((a, r) => a + r.n, 0);
      // Below FLOOR there is nothing worth drawing. Between FLOOR and the
      // normal guard the panel still renders, with the count stated and a
      // warning attached — splitting the world scope correctly left the
      // championship podium at 18 against a threshold of 20, and hiding the
      // whole diagnostic over that tells the reader less, not more.
      const FLOOR = 8;
      if (n < FLOOR) { if (athleteSplit(scope, g, d, dc)) thinPodium.push({ g, d, n }); return; }
      const pod = {
        n,
        dd: use.reduce((a, r) => a + r.avg_list_dd * r.n, 0) / n,
        exec: use.reduce((a, r) => a + r.avg_exec * r.n, 0) / n,
        posted: use.reduce((a, r) => a + r.avg_score * r.n, 0) / n,
      };
      // Both sides modelled from the same identity. Using the stored average
      // score for the podium and a modelled one for the athlete left the two
      // parts failing to sum to the gap by up to 0.6, because the mean of
      // DD x exec is not the product of their means. Under a point either way,
      // but a decomposition that does not add up is not a decomposition.
      pod.score = 3 * pod.dd * pod.exec;
      const me = athleteSplit(scope, g, d, dc);
      if (!me) return;
      const ddPart = 3 * (pod.dd - me.dd) * me.exec;
      const exPart = 3 * pod.dd * (pod.exec - me.exec);
      cells.push({ g, d, dc, pod, me, ddPart, exPart, total: pod.score - me.score });
    }));

    if (!cells.length) {
      const why = thinPodium.length
        ? `${esc(thinPodium[0].me || '')}There are results to compare, but
           ${esc(scopeName(scope))} has too few podium finishes to compare them against —
           ${thinPodium.map((x) => `${esc(G_LABEL[x.g] || x.g)} ${esc(EV_LABEL[x.d] || x.d)}
             has ${x.n}`).join(', ')}. That is a limit of the field, not of the athlete.
           A broader comparison field above will have more.`
        : splitBlockers(scope);
      return `<section class="ae-card ae-fi-sec"><h3>Difficulty or execution?</h3>
        <p class="ae-soft">${why}</p></section>`;
    }

    const verdict = (c) => {
      const dd = c.ddPart, ex = c.exPart;
      if (c.total <= 0) return `already at or above this podium's average`;
      const share = Math.abs(dd) / (Math.abs(dd) + Math.abs(ex) || 1);
      if (dd > 0 && ex > 0) {
        return share > 0.65 ? 'mostly difficulty — the list is the limiter'
          : share < 0.35 ? 'mostly execution — the list is competitive'
          : 'both, roughly evenly';
      }
      if (dd > 0) return 'difficulty alone — execution already clears this podium';
      return 'execution alone — the list already clears this podium';
    };

    const row = (c) => {
      const w = 240;
      const tot = Math.abs(c.ddPart) + Math.abs(c.exPart) || 1;
      const dw = Math.abs(c.ddPart) / tot * w, ew = Math.abs(c.exPart) / tot * w;
      return `<tr>
        <td class="ae-dx-ev"><b>${esc(G_LABEL[c.g] || c.g)} ${esc(EV_LABEL[c.d] || c.d)}</b>
          <span>${c.dc}-dive · vs ${c.pod.n} podium finishes${window.AE.ok(c.pod.n, 'cell') ? '' : ' ⚠'}</span></td>
        <td class="num">${c.me.dd.toFixed(1)}<span class="ae-dx-vs">vs ${c.pod.dd.toFixed(1)}</span></td>
        <td class="num">${c.me.exec.toFixed(2)}<span class="ae-dx-vs">vs ${c.pod.exec.toFixed(2)}</span></td>
        <td class="num ${c.total > 0 ? 'ae-dn' : 'ae-up'}">${c.total > 0 ? '−' : '+'}${Math.abs(c.total).toFixed(1)}</td>
        <td class="num">${c.ddPart > 0 ? '−' : '+'}${Math.abs(c.ddPart).toFixed(1)}</td>
        <td class="num">${c.exPart > 0 ? '−' : '+'}${Math.abs(c.exPart).toFixed(1)}</td>
        <td><svg viewBox="0 0 ${w} 14" class="ae-decomp-bar" preserveAspectRatio="none">
          <rect x="0" y="1" width="${dw.toFixed(1)}" height="12" fill="${C.COLORS.NAVY}" opacity=".85"/>
          <rect x="${dw.toFixed(1)}" y="1" width="${ew.toFixed(1)}" height="12" fill="${C.COLORS.POOL}" opacity=".85"/>
        </svg></td>
        <td class="ae-dx-verdict">${esc(verdict(c))}</td></tr>`;
    };

    const me0 = cells[0].me;
    const dropped = cells.reduce((a, c) => a + c.me.dropped, 0);
    return `<section class="ae-card ae-fi-sec">
      <h3>Difficulty or execution?</h3>
      <p class="ae-soft">${esc(me0.name)}'s distance from the ${esc(scopeName(scope))} podium,
        split into its two causes. A score is 3 × the sum of difficulty × execution, so the gap
        divides exactly: how much comes from carrying a lighter list, and how much from performing
        it less well. These have different answers — one is a season of new dives, the other is
        water time on the dives already there.</p>
      <div class="table-wrap"><table class="data-table ae-dx">
        <thead><tr><th>Event</th><th class="num">List DD</th><th class="num">Execution</th>
          <th class="num">Gap</th><th class="num">From difficulty</th><th class="num">From execution</th>
          <th>Split</th><th>Read</th></tr></thead>
        <tbody>${cells.map(row).join('')}</tbody></table></div>
      <div class="ae-legend"><span class="ae-key" style="background:${C.COLORS.NAVY}"></span>difficulty
        <span class="ae-key" style="background:${C.COLORS.POOL}"></span>execution</div>
      ${cells.some((c) => !window.AE.ok(c.pod.n, 'cell'))
        ? `<div class="ae-thin">Thin comparison: ${cells.filter((c) => !window.AE.ok(c.pod.n, 'cell'))
            .map((c) => `${esc(G_LABEL[c.g] || c.g)} ${esc(EV_LABEL[c.d] || c.d)} rests on
              ${c.pod.n} podium finishes, under the ${GUARD.cell} this normally wants. Read it as
              indicative, not settled.`).join(' ')}</div>` : ''}
      <div class="ae-fi-foot">Athlete figures are the mean of their ${me0.n} most recent
        final${me0.n === 1 ? '' : 's'}
 (${me0.y0}–${me0.y1}${me0.scopes.length ? ' · ' + me0.scopes.map(esc).join(', ') : ''}), matched
        to the podium on dive-count format so no two scoring formats are ever compared.
        ${dropped ? `${dropped} final${dropped === 1 ? '' : 's'} excluded for carrying a list DD that
          implies an impossible execution mark.` : ''}
        Coaching context, not a selection metric: this depends on how completely an athlete's meets
        were recorded, which is not equal across athletes.</div>
    </section>`;
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

  // Plain sentence under each chart: what this athlete's form currently buys,
  // and how far the next rung is. The gap is the actionable half.
  function markLine(ev) {
    const mk = ev.mark;
    if (!mk || mk.recent == null) return '';
    const p = placeFor(mk.recent, ev.rows);
    const podium = ev.rows.find((r) => r.place === 3);
    const gap = podium ? podium.p50_score - mk.recent : null;
    const where = p == null
      ? `outside the top ${ev.rows[ev.rows.length - 1].place}`
      : (p === 1 ? 'first' : `around ${p}${p === 2 ? 'nd' : p === 3 ? 'rd' : 'th'}`);
    return `<div class="ae-fi-mark">
      <b>${esc(mk.name)}</b> ${mk.recent.toFixed(1)} &rarr; ${where}
      ${gap != null && gap > 0 ? `<span class="ae-soft">&middot; ${gap.toFixed(1)} off the podium median</span>`
        : gap != null ? `<span class="ae-soft">&middot; ${Math.abs(gap).toFixed(1)} clear of it</span>` : ''}
      <span class="ae-fi-mark-n">${mk.n === 1
        ? `their only ${esc(scopeName(cmp.b))} final on record, ${mk.y1}`
        : `median of ${mk.nRecent} most recent of ${mk.n} finals, ${mk.y0}–${mk.y1}`}</span>
    </div>`;
  }

  function athleteFoot(evs, scope) {
    const has = evs.filter((e) => e.mark && e.mark.recent != null);
    const b = window.AE.state && window.AE.state.bundle;
    if (!b) {
      return `<div class="ae-fi-foot">Search an athlete above to draw them across these curves and
        see what their current form buys.</div>`;
    }
    const nm = (b.ident && b.ident.display_name) || 'this athlete';
    if (!has.length) {
      return `<div class="ae-fi-foot">No ${esc(scopeName(scope))} finals on record for ${esc(nm)} in
        these formats since 2018, so there is nothing to place them against here. Try a different
        comparison field above.</div>`;
    }
    return `<div class="ae-fi-foot">Dashed line is ${esc(nm)}. Drawn with the same rule these curves
      are built from &mdash; finals only, non-cumulative, non-synchronized, ${esc(scopeName(scope))},
      2018 onward, matched on dive-count format, so no two scoring formats are ever compared.
      Coaching context: where an athlete lands here depends on how completely their meets have been
      recorded, which is not equal across athletes, so this is not a selection metric.</div>`;
  }

  function rankCostHtml(rankCost) {
    const scope = cmp.b;
    const evs = [];
    ['Male', 'Female'].forEach((g) => ['3m', 'Platform'].forEach((d) => {
      const sub = rankCost.filter((r) => r.scope === scope && r.gender === g && r.discipline === d);
      if (!sub.length) return;
      const dc = dominantFormat(sub.map((r) => ({ dive_count: r.dive_count, n: r.n_meets })));
      const use = sub.filter((r) => r.dive_count === dc && r.n_meets >= 3)
        .sort((a, b) => a.place - b.place);
      if (use.length >= 4) evs.push({ g, d, dc, rows: use, mark: athleteMark(scope, g, d, dc) });
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
      // The selected athlete's recent form, drawn straight across the curve so
      // the place it buys is read off where the two meet.
      const mk = ev.mark;
      if (mk && mk.recent != null) {
        const inRange = mk.recent >= lo && mk.recent <= hi;
        const y = Math.max(padT + 6, Math.min(h - padB - 2, Y(mk.recent)));
        g += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}"
               stroke="${C.COLORS.RED}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
        if (!inRange) {
          // Clamped, so say so rather than implying the line sits on the axis.
          g += `<text x="${w - padR - 3}" y="${(y + (mk.recent > hi ? 12 : -5)).toFixed(1)}"
                 text-anchor="end" class="ae-mark">${mk.recent > hi ? 'above chart' : 'below chart'}
                 ${mk.recent.toFixed(0)}</text>`;
        } else {
          g += `<text x="${w - padR - 3}" y="${(y - 5).toFixed(1)}" text-anchor="end"
                 class="ae-mark">${mk.recent.toFixed(1)}</text>`;
        }
      }
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
        ${markLine(ev)}
      </div>`).join('')}</div>
      ${athleteFoot(evs, scope)}
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
    render,
    bootstrap,
    setA(v) { cmp.a = v; render(); },
    setB(v) { cmp.b = v; render(); },
  };
})();
