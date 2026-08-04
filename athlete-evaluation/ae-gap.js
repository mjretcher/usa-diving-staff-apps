/* ============================================================
   ae-gap.js — Gap to the podium.

   Two questions, one page:

     1. HOW FAR, AND WHY. A total is 3 x SUM(DD x execution). The athlete's
        distance from a finishing position therefore splits exactly into
        difficulty and execution. That split is the coaching decision — adding
        DD to an athlete whose gap is execution makes them worse.

     2. HOW LIKELY. An athlete does not have a score, they have a distribution.
        The bar does too: rank_cost holds the mean and standard deviation of
        the score that has actually produced each place. The probability of
        clearing it is P(X - M > 0) where X is the athlete's form and M is the
        bar. Treating both as approximately normal and independent, the
        difference is normal with mean (mx - mm) and variance (sx^2 + sm^2).

   Normality is an approximation, not a fact. Finals scores are mildly
   left-skewed because a failed dive has no matching upside, so these
   probabilities are best read as "roughly one in three" rather than 34.2%.
   The page says so rather than hiding it behind a decimal.
   ============================================================ */
(function () {
  'use strict';

  const NAVY = '#171F69', RED = '#E31937', POOL = '#009AC7', SKY = '#8FC3EA';
  const INK2 = '#5A6079', GRID = '#E3E6EF', GREEN = '#1B6E3A';

  const esc = (s) => window.AE.esc(s);
  const f1 = (v) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(1));
  const f2 = (v) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(2));
  const G = () => (window.AE.GUARD || { athlete: 8, field: 150, cell: 20, lists: 6 });

  // An athlete needs this many comparable finals before a distribution means
  // anything. Below it we show the results and refuse the probability.
  const MIN_FINALS = 4;

  const st = { disc: null, scope: 'us-senior', place: 3 };

  /* ---------- statistics ---------- */

  // Abramowitz & Stegun 26.2.17 — standard normal CDF, plenty accurate here.
  function normCdf(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937
      + t * (-1.821255978 + t * 1.330274429))));
    return z > 0 ? 1 - p : p;
  }

  function meanSd(xs) {
    const n = xs.length;
    if (!n) return { n: 0, mean: null, sd: null };
    const m = xs.reduce((a, b) => a + b, 0) / n;
    const sd = n > 1
      ? Math.sqrt(xs.reduce((a, v) => a + (v - m) * (v - m), 0) / (n - 1)) : 0;
    return { n, mean: m, sd };
  }

  /* ---------- athlete's comparable finals ---------- */

  function athleteFinals(bundle) {
    // Only comparable results: one dive-count format, finals, never cumulative.
    const all = bundle.phases.filter((p) => p.discipline === st.disc
      && p.posted_score != null
      && p.round_stage === 'Final'
      && !(p.is_synchronized === true)
      && p._comparable === true);
    if (!all.length) return { rows: [], format: null, formats: [] };
    const counts = new Map();
    all.forEach((p) => counts.set(p.phase_dive_count,
      (counts.get(p.phase_dive_count) || 0) + 1));
    const formats = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const fmt = formats[0][0];
    return { rows: all.filter((p) => p.phase_dive_count === fmt), format: fmt, formats };
  }

  /* ---------- decomposition ---------- */

  // Split (bar - athlete) into the part attributable to list difficulty and
  // the part attributable to execution. Holding one factor at the athlete's
  // own level attributes the remainder to the other; the two always sum to
  // the gap exactly.
  function decompose(athlete, bar) {
    if (!athlete || !bar || athlete.dd == null || bar.dd == null) return null;
    const ddPart = 3 * (bar.dd - athlete.dd) * athlete.exec;
    const exPart = 3 * bar.dd * (bar.exec - athlete.exec);
    return { ddPart, exPart, total: ddPart + exPart };
  }

  /* ---------- distribution chart ---------- */

  function distChart(a, bar, prob) {
    if (a.sd == null || a.sd <= 0 || !bar) return '';
    const w = 700, h = 210, padL = 40, padR = 20, padT = 16, padB = 40;
    const lo = Math.min(a.mean - 3 * a.sd, bar.mean - 3 * (bar.sd || 10));
    const hi = Math.max(a.mean + 3 * a.sd, bar.mean + 3 * (bar.sd || 10));
    const X = (v) => padL + ((v - lo) / (hi - lo)) * (w - padL - padR);
    const pdf = (v, m, s) => Math.exp(-((v - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));
    const peak = Math.max(pdf(a.mean, a.mean, a.sd),
      pdf(bar.mean, bar.mean, bar.sd || 10));
    const Y = (d) => h - padB - (d / peak) * (h - padT - padB);
    const curve = (m, s) => {
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const v = lo + (hi - lo) * i / 120;
        pts.push(`${X(v)},${Y(pdf(v, m, s))}`);
      }
      return pts.join(' ');
    };
    let g = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img"
      aria-label="Athlete score distribution against the bar">`;
    g += `<polygon points="${X(lo)},${h - padB} ${curve(a.mean, a.sd)} ${X(hi)},${h - padB}"
      fill="${POOL}" opacity=".25"></polygon>`;
    g += `<polyline points="${curve(a.mean, a.sd)}" fill="none" stroke="${POOL}" stroke-width="2"></polyline>`;
    g += `<polyline points="${curve(bar.mean, bar.sd || 10)}" fill="none" stroke="${RED}"
      stroke-width="2" stroke-dasharray="5 3"></polyline>`;
    [[a.mean, POOL, 'their form'], [bar.mean, RED, 'the bar']].forEach(([v, c, lab]) => {
      g += `<line x1="${X(v)}" y1="${padT}" x2="${X(v)}" y2="${h - padB}" stroke="${c}" stroke-width="1.2"/>`
        + `<text x="${X(v)}" y="${padT - 3}" text-anchor="middle" class="ae-tick" fill="${c}">${v.toFixed(0)}</text>`;
    });
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const v = lo + (hi - lo) * t;
      g += `<text x="${X(v)}" y="${h - padB + 16}" text-anchor="middle" class="ae-tick">${v.toFixed(0)}</text>`;
    });
    g += `<text x="${(padL + w - padR) / 2}" y="${h - 6}" text-anchor="middle" class="ae-axlab">Total score</text>`;
    return g + '</svg>';
  }

  // Deliberately coarse. A probability from a dozen results does not deserve
  // a decimal point, and a decimal invites a false read of precision.
  function plainOdds(p) {
    if (p == null) return null;
    if (p >= 0.9) return 'very likely on current form';
    if (p >= 0.65) return 'more likely than not';
    if (p >= 0.45) return 'close to a coin flip';
    if (p >= 0.25) return 'roughly one in three';
    if (p >= 0.12) return 'roughly one in six';
    if (p >= 0.04) return 'unlikely without a step up';
    return 'out of reach on current form';
  }

  /* ---------- render ---------- */

  async function render(root) {
    const b = window.AE.state.bundle;
    if (!b) {
      root.innerHTML = '<div class="ae-card"><div class="ae-empty">Pick an athlete to see their gap to the podium.</div></div>';
      return;
    }
    const discs = [...new Set(b.sheets.filter(window.AE.isIndiv).map((r) => r.discipline))]
      .filter(Boolean).sort();
    if (!discs.length) {
      root.innerHTML = '<div class="ae-card"><div class="ae-empty">No individual results on record.</div></div>';
      return;
    }
    if (!st.disc || !discs.includes(st.disc)) st.disc = discs[0];

    const gender = (b.sheets.find((r) => r.gender) || {}).gender || null;
    const { rows, format, formats } = athleteFinals(b);
    const scores = meanSd(rows.map((r) => Number(r.posted_score)));

    // The athlete's own difficulty and execution, from the same finals.
    const dds = rows.map((r) => Number(r.phase_dd_sum)).filter((v) => v > 0);
    const aDD = dds.length ? dds.reduce((x, y) => x + y, 0) / dds.length : null;
    const aExec = (aDD && scores.mean) ? scores.mean / (3 * aDD) : null;

    let bar = null, barRow = null, err = null;
    try {
      const rc = await window.AE.rankCost(gender, st.disc, st.scope, format, st.place);
      if (rc && rc.length) {
        barRow = rc[0];
        bar = { mean: barRow.avg_score, sd: barRow.sd_score, n: barRow.n_meets };
      }
    } catch (e) { err = e.message || String(e); }

    // Field difficulty/execution at that band, for the decomposition.
    let barSplit = null;
    try {
      const prof = await window.AE.eventProfile(gender, st.disc, st.scope, format);
      const band = st.place <= 3 ? 'podium' : 'finalist';
      const bs = (prof || []).filter((r) => r.band === band);
      const n = bs.reduce((a, r) => a + r.n, 0);
      if (n >= G().cell) {
        barSplit = {
          dd: bs.reduce((a, r) => a + r.avg_list_dd * r.n, 0) / n,
          exec: bs.reduce((a, r) => a + r.avg_exec * r.n, 0) / n,
          n,
        };
      }
    } catch (e) { /* decomposition simply omitted */ }

    const split = (aDD && aExec && barSplit)
      ? decompose({ dd: aDD, exec: aExec }, barSplit) : null;

    let prob = null;
    if (bar && scores.n >= MIN_FINALS && scores.sd > 0) {
      const mu = scores.mean - bar.mean;
      const sigma = Math.sqrt(scores.sd ** 2 + (bar.sd || 0) ** 2);
      if (sigma > 0) prob = 1 - normCdf(-mu / sigma);
    }

    const scopeLabel = ((window.AE.SCOPES || []).find((s) => s.id === st.scope) || {}).label || st.scope;

    // Provenance for the two figures that could reach a selection conversation.
    const P = window.AEProv;
    const provGap = (P && bar) ? P.record('gap-to-place', {
      source: 'analytics.rank_cost',
      filters: { scope: st.scope, gender, discipline: st.disc, dive_count: format, place: st.place },
      key: 'meet_id + event_id + result_set_id + diver_id',
      n: bar.n, nLabel: 'meets behind the bar',
      method: 'Athlete mean of comparable finals minus the mean score at that place. '
        + 'Probability from the overlap of two normal approximations, variance summed.',
      caveats: ['Cumulative totals excluded', `Restricted to ${format}-dive lists`,
        `Athlete distribution from ${scores.n} finals`,
        'Normal approximation; finals scores are mildly left-skewed'],
    }) : null;
    const provSplit = (P && split && barSplit) ? P.record('gap-decomposition', {
      source: 'analytics.event_profile',
      filters: { scope: st.scope, gender, discipline: st.disc, dive_count: format,
                 band: st.place <= 3 ? 'podium' : 'finalist' },
      key: 'meet_id + event_id + result_set_id + diver_id',
      n: barSplit.n, nLabel: 'results in band',
      method: 'score = 3 x sum(DD x execution); gap attributed by holding one factor '
        + 'at the athlete level. The two parts sum to the gap exactly.',
      caveats: ['Cumulative totals excluded', 'One dive-count format only'],
    }) : null;
    const gap = (bar && scores.mean != null) ? scores.mean - bar.mean : null;

    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h"><h3>Gap to the podium</h3></div>
        <div class="ae-ctl">
          <div class="ae-ctl-row"><span class="ae-ctl-lab">Event</span><div class="ae-chips">
            ${discs.map((d) => `<button class="ae-chip${d === st.disc ? ' on' : ''}" data-disc="${esc(d)}">${esc(d)}</button>`).join('')}
          </div></div>
          <div class="ae-ctl-row">
            <span class="ae-ctl-lab">Target</span>
            <select class="ae-sel" id="gap-place">${[1, 3, 8, 12, 18].map((p) =>
              `<option value="${p}"${p === st.place ? ' selected' : ''}>${
                p === 1 ? 'Win' : p === 3 ? 'Podium (3rd)' : p === 12 ? 'Final cut (12th)' : p + 'th'}</option>`).join('')}</select>
            <span class="ae-ctl-lab" style="margin-left:14px">Field</span>
            <select class="ae-sel" id="gap-scope">${(window.AE.SCOPES || []).map((s) =>
              `<option value="${esc(s.id)}"${s.id === st.scope ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select>
          </div>
        </div>

        ${rows.length < MIN_FINALS ? `<div class="ae-warn-note">
          Only ${rows.length} comparable final${rows.length === 1 ? '' : 's'} on ${esc(st.disc)}
          in this format. Below ${MIN_FINALS} there is no distribution to speak of, so no
          probability is shown.</div>` : ''}

        ${bar ? `
          <div class="ae-gap-head">
            <div><span class="ae-gap-num" style="color:${gap >= 0 ? GREEN : RED}">${
              gap >= 0 ? '+' : ''}${f1(gap)}</span>
              <span class="ae-gap-lab">points ${gap >= 0 ? 'above' : 'below'} ${
                st.place === 1 ? 'the winning score' : st.place === 3 ? 'the podium' : st.place + 'th place'}</span></div>
            ${prob != null ? `<div><span class="ae-gap-num">${esc(plainOdds(prob))}</span>
              <span class="ae-gap-lab">on current form</span></div>` : ''}
          </div>
          <p class="ae-soft">Their ${scores.n} comparable finals on ${esc(st.disc)} average
            <b>${f1(scores.mean)}</b> (spread ${f1(scores.sd)}). In ${esc(scopeLabel)},
            ${st.place === 1 ? 'winning' : st.place + 'th place'} has averaged
            <b>${f1(bar.mean)}</b> across ${bar.n} meets (spread ${f1(bar.sd)}).
            Both are ${format}-dive lists — no other format is mixed in.</p>
          ${distChart(scores, bar, prob)}
          <p class="ae-soft">Solid is their form, dashed is the bar. The overlap is the
            chance. This treats both as roughly normal and independent; finals scores are
            mildly left-skewed because a failed dive has no matching upside, so read these
            as rough odds rather than a precise figure.</p>
        ` : `<div class="ae-empty">No ${esc(scopeLabel)} benchmark for
            ${esc(st.disc)} at ${format || '—'} dives.${err ? ' ' + esc(err) : ''}</div>`}
      </div>

      ${split ? `<div class="ae-card">
        <div class="ae-card-h"><h3>What would close it</h3>${provSplit ? P.badge(provSplit) : ''}</div>
        <p class="ae-soft">The gap splits exactly into difficulty and execution, because a
          total is 3 &times; the sum of (DD &times; execution). This is arithmetic, not a model —
          the two parts always sum to the gap.</p>
        <table class="ae-tbl">
          <thead><tr><th></th><th class="r">Them</th><th class="r">The bar</th>
            <th class="r">Difference</th><th class="r">Worth</th></tr></thead>
          <tbody>
            <tr><td>List difficulty (total DD)</td><td class="r">${f1(aDD)}</td>
              <td class="r">${f1(barSplit.dd)}</td>
              <td class="r">${(barSplit.dd - aDD) >= 0 ? '+' : ''}${f1(barSplit.dd - aDD)}</td>
              <td class="r" style="color:${NAVY};font-weight:700">${split.ddPart >= 0 ? '+' : ''}${f1(split.ddPart)} pts</td></tr>
            <tr><td>Execution per judge</td><td class="r">${f2(aExec)}</td>
              <td class="r">${f2(barSplit.exec)}</td>
              <td class="r">${(barSplit.exec - aExec) >= 0 ? '+' : ''}${f2(barSplit.exec - aExec)}</td>
              <td class="r" style="color:${POOL};font-weight:700">${split.exPart >= 0 ? '+' : ''}${f1(split.exPart)} pts</td></tr>
            <tr class="ae-tot"><td>Total gap</td><td class="r"></td><td class="r"></td><td class="r"></td>
              <td class="r">${split.total >= 0 ? '+' : ''}${f1(split.total)} pts</td></tr>
          </tbody>
        </table>
        <p class="ae-soft">${Math.abs(split.exPart) > Math.abs(split.ddPart)
          ? `Most of this gap is <b>execution</b>, not difficulty. Adding DD to a list that is
             not yet being performed cleanly usually widens the gap rather than closing it.`
          : `Most of this gap is <b>difficulty</b>. Their execution is already at or near the
             standard for this band, so the list itself is the constraint.`}
          Based on ${barSplit.n.toLocaleString()} results in that band.</p>
      </div>` : ''}`;

    root.querySelectorAll('[data-disc]').forEach((el) => el.addEventListener('click', () => {
      st.disc = el.getAttribute('data-disc'); render(root);
    }));
    const pl = root.querySelector('#gap-place');
    if (pl) pl.addEventListener('change', () => { st.place = +pl.value; render(root); });
    const sc = root.querySelector('#gap-scope');
    if (sc) sc.addEventListener('change', () => { st.scope = sc.value; render(root); });
  }

  window.AEGap = { render, normCdf, decompose, meanSd, plainOdds };
})();
