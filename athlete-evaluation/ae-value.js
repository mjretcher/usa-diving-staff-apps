/* ============================================================
   ae-value.js — Dive value against risk, and list construction.

   Diving reduces to one identity: score = SUM over dives of 3 x DD x execution.
   So every dive in a repertoire has an expected value and a spread, and a
   list is a portfolio choice between them.

   For each dive this computes, from the athlete's own history:
     EV        3 x DD x mean(execution)      what it pays on an average day
     floor     3 x DD x p10(execution)       what it pays on a bad one
     ceiling   3 x DD x p90(execution)
     spread    3 x DD x sd(execution)        points of volatility
     fail      share of attempts under 4.5 per judge

   Dives are then placed against the athlete's own medians, which is what
   makes the quadrants meaningful — this is a portfolio of THEIR dives, not
   a comparison to a field.

   The list builder is deliberately not rule-aware. It searches only dives
   the athlete has actually performed, under constraints the user sets, and
   says so. Composition rules vary by event and age group, so a list it
   proposes is a starting point for a coach, never an eligibility ruling.
   ============================================================ */
(function () {
  'use strict';

  const NAVY = '#171F69', RED = '#E31937', POOL = '#009AC7', SKY = '#8FC3EA';
  const GOLD = '#B8860B', INK2 = '#5A6079', GRID = '#E3E6EF';

  const esc = (s) => window.AE.esc(s);
  const f1 = (v) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(1));
  const f2 = (v) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(2));
  const pct = (v) => (v == null || isNaN(v) ? '—' : (100 * v).toFixed(0) + '%');

  // A dive needs this many attempts before its spread means anything.
  const MIN_N = 5;

  const st = { disc: null, listSize: 6, distinctGroups: false, sort: 'ev' };

  function quantile(sorted, q) {
    if (!sorted.length) return null;
    const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }

  /* ---------------- analysis ---------------- */

  function repertoire(bundle) {
    const rows = bundle.sheets.filter((r) => window.AE.isIndiv(r)
      && window.AE.bucketOf(r) === 'dive'
      && (!st.disc || r.discipline === st.disc));

    const by = new Map();
    rows.forEach((r) => {
      const ex = r._exec != null ? r._exec : window.AE.execOf(r);
      if (ex == null || !r.dive_number) return;
      const code = r.dive_code_norm || r.dive_number;
      const key = code + '@' + (r.height || r.discipline || '');
      if (!by.has(key)) {
        by.set(key, { key, code, height: r.height || r.discipline, desc: r.description,
                      group: window.AE.catOf(r), execs: [], dds: [], years: [] });
      }
      const g = by.get(key);
      g.desc = g.desc || r.description;
      g.execs.push(ex);
      if (r.dd != null) g.dds.push(Number(r.dd));
      if (r.meet_year) g.years.push(+r.meet_year);
    });

    const out = [];
    by.forEach((g) => {
      const s = g.execs.slice().sort((a, b) => a - b);
      const n = s.length;
      const mean = s.reduce((a, b) => a + b, 0) / n;
      const sd = n > 1
        ? Math.sqrt(s.reduce((a, v) => a + (v - mean) * (v - mean), 0) / (n - 1)) : 0;
      // Current DD: the most recent one performed, not the average, because a
      // dive's DD is a property of the dive as it is being done now.
      const dd = g.dds.length ? g.dds[g.dds.length - 1] : null;
      if (dd == null) return;
      out.push({
        ...g, n, dd,
        meanExec: mean, sdExec: sd,
        p10: quantile(s, 0.10), p90: quantile(s, 0.90),
        ev: 3 * dd * mean,
        floor: 3 * dd * quantile(s, 0.10),
        ceiling: 3 * dd * quantile(s, 0.90),
        spread: 3 * dd * sd,
        failRate: s.filter((v) => v < 4.5).length / n,
        lastYear: g.years.length ? Math.max(...g.years) : null,
        reliable: n >= MIN_N,
      });
    });
    return out.sort((a, b) => b.ev - a.ev);
  }

  // Quadrant against the athlete's own medians.
  function classify(dives) {
    const rated = dives.filter((d) => d.reliable);
    if (!rated.length) return dives.map((d) => ({ ...d, quad: null }));
    const evs = rated.map((d) => d.ev).sort((a, b) => a - b);
    const sps = rated.map((d) => d.spread).sort((a, b) => a - b);
    const evMid = quantile(evs, 0.5), spMid = quantile(sps, 0.5);
    return dives.map((d) => {
      if (!d.reliable) return { ...d, quad: null };
      const hiEv = d.ev >= evMid, hiSp = d.spread >= spMid;
      return { ...d, quad: hiEv ? (hiSp ? 'swing' : 'anchor') : (hiSp ? 'liability' : 'steady') };
    });
  }

  const QUAD = {
    anchor:    { label: 'Anchor',    color: POOL, note: 'pays well and lands consistently' },
    swing:     { label: 'Swing',     color: GOLD, note: 'pays well but the spread is wide' },
    steady:    { label: 'Steady',    color: SKY,  note: 'reliable, but limited scoring' },
    liability: { label: 'Liability', color: RED,  note: 'low return and volatile' },
  };

  /* ---------------- scatter ---------------- */

  function scatter(dives) {
    const pts = dives.filter((d) => d.quad);
    if (pts.length < 2) {
      return `<div class="ae-empty">Not enough dives with ${MIN_N}+ attempts to plot a portfolio yet.</div>`;
    }
    const w = 760, h = 420, padL = 62, padR = 22, padT = 22, padB = 54;
    const exs = pts.map((d) => d.ev), sps = pts.map((d) => d.spread);
    const x0 = Math.min(...exs) * 0.92, x1 = Math.max(...exs) * 1.05;
    const y0 = 0, y1 = Math.max(...sps) * 1.12 || 1;
    const X = (v) => padL + ((v - x0) / (x1 - x0)) * (w - padL - padR);
    const Y = (v) => h - padB - ((v - y0) / (y1 - y0)) * (h - padT - padB);
    const evMid = quantile(exs.slice().sort((a, b) => a - b), 0.5);
    const spMid = quantile(sps.slice().sort((a, b) => a - b), 0.5);

    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img" aria-label="Dive value against volatility">`;
    // quadrant shading
    s += `<rect x="${X(evMid)}" y="${padT}" width="${w - padR - X(evMid)}" height="${Y(spMid) - padT}" fill="${GOLD}" opacity=".05"/>`;
    s += `<rect x="${X(evMid)}" y="${Y(spMid)}" width="${w - padR - X(evMid)}" height="${h - padB - Y(spMid)}" fill="${POOL}" opacity=".06"/>`;
    s += `<line x1="${X(evMid)}" y1="${padT}" x2="${X(evMid)}" y2="${h - padB}" stroke="${INK2}" stroke-dasharray="3 3" opacity=".5"/>`;
    s += `<line x1="${padL}" y1="${Y(spMid)}" x2="${w - padR}" y2="${Y(spMid)}" stroke="${INK2}" stroke-dasharray="3 3" opacity=".5"/>`;
    // axes
    for (let i = 0; i <= 4; i++) {
      const v = y0 + (y1 - y0) * i / 4;
      s += `<line x1="${padL}" y1="${Y(v)}" x2="${w - padR}" y2="${Y(v)}" stroke="${GRID}"/>`;
      s += `<text x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end" class="ae-tick">${v.toFixed(1)}</text>`;
    }
    for (let i = 0; i <= 4; i++) {
      const v = x0 + (x1 - x0) * i / 4;
      s += `<text x="${X(v)}" y="${h - padB + 18}" text-anchor="middle" class="ae-tick">${v.toFixed(0)}</text>`;
    }
    s += `<text x="${(padL + w - padR) / 2}" y="${h - 8}" text-anchor="middle" class="ae-axlab">Expected points per dive</text>`;
    s += `<text x="14" y="${(padT + h - padB) / 2}" text-anchor="middle" class="ae-axlab" transform="rotate(-90 14 ${(padT + h - padB) / 2})">Points of volatility</text>`;
    s += `<text x="${w - padR - 6}" y="${padT + 14}" text-anchor="end" class="ae-quadlab" fill="${GOLD}">SWING</text>`;
    s += `<text x="${w - padR - 6}" y="${h - padB - 8}" text-anchor="end" class="ae-quadlab" fill="${POOL}">ANCHOR</text>`;

    pts.forEach((d) => {
      const q = QUAD[d.quad];
      const r = 5 + Math.min(9, Math.sqrt(d.n));
      s += `<circle cx="${X(d.ev)}" cy="${Y(d.spread)}" r="${r}" fill="${q.color}" opacity=".78" stroke="#fff" stroke-width="1.5">`
        + `<title>${esc(d.code)} ${esc(d.height || '')} — ${q.label}\n`
        + `${d.n} attempts, DD ${f1(d.dd)}\n`
        + `expected ${f1(d.ev)} pts · floor ${f1(d.floor)} · ceiling ${f1(d.ceiling)}\n`
        + `volatility ${f1(d.spread)} pts · fails ${pct(d.failRate)}</title></circle>`;
      s += `<text x="${X(d.ev)}" y="${Y(d.spread) - r - 4}" text-anchor="middle" class="ae-ptlab">${esc(d.code)}</text>`;
    });
    return s + '</svg>';
  }

  /* ---------------- list construction ---------------- */

  // Highest expected-value selection from dives the athlete has performed.
  // Greedy by EV, optionally forcing distinct dive groups.
  function bestList(dives, size, distinct) {
    const pool = dives.filter((d) => d.reliable).slice().sort((a, b) => b.ev - a.ev);
    const out = [], usedGroups = new Set(), usedCodes = new Set();
    for (const d of pool) {
      if (out.length >= size) break;
      if (usedCodes.has(d.code)) continue;           // a dive may be used once
      if (distinct && d.group && usedGroups.has(d.group)) continue;
      out.push(d);
      usedCodes.add(d.code);
      if (d.group) usedGroups.add(d.group);
    }
    return out;
  }

  // What the athlete most recently actually performed, as a list of that size.
  function recentList(bundle, size) {
    const rows = bundle.sheets.filter((r) => window.AE.isIndiv(r)
      && window.AE.bucketOf(r) === 'dive'
      && (!st.disc || r.discipline === st.disc)
      && r.meet_id && r.dive_order != null);
    if (!rows.length) return [];
    const byPhase = new Map();
    rows.forEach((r) => {
      const k = [r.meet_id, r.event_id, r.round_stage].join('|');
      if (!byPhase.has(k)) byPhase.set(k, { year: +r.meet_year || 0, rows: [] });
      byPhase.get(k).rows.push(r);
    });
    const best = [...byPhase.values()]
      .filter((p) => p.rows.length >= Math.min(size, 4))
      .sort((a, b) => b.year - a.year || b.rows.length - a.rows.length)[0];
    return best ? best.rows.sort((a, b) => a.dive_order - b.dive_order) : [];
  }

  function totals(list) {
    return list.reduce((a, d) => ({
      ev: a.ev + d.ev, floor: a.floor + d.floor, ceiling: a.ceiling + d.ceiling,
      dd: a.dd + d.dd,
    }), { ev: 0, floor: 0, ceiling: 0, dd: 0 });
  }

  /* ---------------- render ---------------- */

  async function render(root) {
    const b = window.AE.state.bundle;
    if (!b) {
      root.innerHTML = '<div class="ae-card"><div class="ae-empty">Pick an athlete to see their dive portfolio.</div></div>';
      return;
    }
    const discs = [...new Set(b.sheets.filter(window.AE.isIndiv).map((r) => r.discipline))]
      .filter(Boolean).sort();
    if (!discs.length) {
      root.innerHTML = '<div class="ae-card"><div class="ae-empty">No individual dive sheets on record.</div></div>';
      return;
    }
    if (!st.disc || !discs.includes(st.disc)) st.disc = discs[0];

    const dives = classify(repertoire(b));
    const rated = dives.filter((d) => d.quad);
    const thin = dives.filter((d) => !d.reliable);

    const proposed = bestList(dives, st.listSize, st.distinctGroups);
    const pT = totals(proposed);

    const actualRows = recentList(b, st.listSize);
    const actual = actualRows.map((r) => {
      const code = r.dive_code_norm || r.dive_number;
      return dives.find((d) => d.code === code && d.height === (r.height || r.discipline))
        || dives.find((d) => d.code === code);
    }).filter(Boolean);
    const aT = totals(actual);

    const sorted = dives.slice().sort((a, c) => {
      if (st.sort === 'spread') return c.spread - a.spread;
      if (st.sort === 'fail') return c.failRate - a.failRate;
      if (st.sort === 'floor') return c.floor - a.floor;
      return c.ev - a.ev;
    });

    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h"><h3>Dive value against risk</h3></div>
        <div class="ae-ctl">
          <div class="ae-ctl-row"><span class="ae-ctl-lab">Event</span><div class="ae-chips">
            ${discs.map((d) => `<button class="ae-chip${d === st.disc ? ' on' : ''}" data-disc="${esc(d)}">${esc(d)}</button>`).join('')}
          </div></div>
        </div>
        <p class="ae-soft">Every dive this athlete has performed on ${esc(st.disc)}, placed by what it
          expects to pay against how much that payout moves. Expected points are
          3 &times; DD &times; average execution; volatility is the same formula on the standard
          deviation. Both axes split at this athlete's own median, so the quadrants describe
          their portfolio rather than a comparison to anyone else.</p>
        ${scatter(dives)}
        <div class="ae-legend">
          ${Object.keys(QUAD).map((k) => `<span><i style="background:${QUAD[k].color}"></i>${
            esc(QUAD[k].label)} — ${esc(QUAD[k].note)}</span>`).join('')}
        </div>
      </div>

      <div class="ae-card">
        <div class="ae-card-h"><h3>List construction</h3></div>
        <div class="ae-ctl">
          <div class="ae-ctl-row">
            <span class="ae-ctl-lab">Dives in list</span>
            <select class="ae-sel" id="val-size">${[5, 6, 8, 10, 11].map((n) =>
              `<option value="${n}"${n === st.listSize ? ' selected' : ''}>${n}</option>`).join('')}</select>
            <label class="ae-check"><input type="checkbox" id="val-distinct"${st.distinctGroups ? ' checked' : ''}>
              One dive per group</label>
          </div>
        </div>
        ${proposed.length ? `
        <table class="ae-tbl">
          <thead><tr><th>Highest-value list available</th><th class="r">DD</th><th class="r">Expected</th>
            <th class="r">Floor</th><th class="r">Ceiling</th><th class="r">Attempts</th></tr></thead>
          <tbody>${proposed.map((d) => `<tr>
            <td>${esc(d.code)} <span class="ae-soft">${esc(d.height || '')} · ${esc(d.desc || '')}</span></td>
            <td class="r">${f1(d.dd)}</td><td class="r">${f1(d.ev)}</td>
            <td class="r">${f1(d.floor)}</td><td class="r">${f1(d.ceiling)}</td>
            <td class="r">${d.n}</td></tr>`).join('')}
            <tr class="ae-tot"><td>Total</td><td class="r">${f1(pT.dd)}</td><td class="r">${f1(pT.ev)}</td>
              <td class="r">${f1(pT.floor)}</td><td class="r">${f1(pT.ceiling)}</td><td class="r"></td></tr>
          </tbody>
        </table>
        ${actual.length ? `<p class="ae-soft" style="margin-top:10px">
            Their most recent full list of this size expects <b>${f1(aT.ev)}</b> points
            (floor ${f1(aT.floor)}, ceiling ${f1(aT.ceiling)}, total DD ${f1(aT.dd)}).
            ${pT.ev - aT.ev > 0.5
              ? `The selection above expects <b>${f1(pT.ev - aT.ev)} more points</b> — though it is
                 built only from expected value, and takes no account of session order, fatigue,
                 or what the athlete is currently training.`
              : 'The list they are already performing is at or near the best available on expected value.'}
          </p>` : ''}
        <div class="ae-warn-note">
          Built only from dives this athlete has actually performed, using the constraints set
          above. It does not apply event or age-group composition rules, so treat it as a
          coaching starting point and check eligibility against the rulebook before use.
        </div>` : `<div class="ae-empty">No dive has ${MIN_N}+ attempts yet, so there is nothing
          reliable enough to build a list from.</div>`}
      </div>

      <div class="ae-card">
        <div class="ae-card-h"><h3>Every dive</h3></div>
        <div class="ae-ctl"><div class="ae-ctl-row">
          <span class="ae-ctl-lab">Sort by</span><div class="ae-chips">
          ${[['ev', 'Expected points'], ['floor', 'Floor'], ['spread', 'Volatility'], ['fail', 'Failure rate']]
            .map(([k, l]) => `<button class="ae-chip${st.sort === k ? ' on' : ''}" data-sort="${k}">${l}</button>`).join('')}
        </div></div></div>
        <table class="ae-tbl">
          <thead><tr><th>Dive</th><th>Group</th><th class="r">Attempts</th><th class="r">DD</th>
            <th class="r">Avg exec</th><th class="r">Expected</th><th class="r">Floor</th>
            <th class="r">Ceiling</th><th class="r">Volatility</th><th class="r">Fails</th><th>Reads as</th></tr></thead>
          <tbody>${sorted.map((d) => `<tr${d.reliable ? '' : ' class="ae-muted"'}>
            <td>${esc(d.code)} <span class="ae-soft">${esc(d.height || '')}</span></td>
            <td>${esc((window.AE.CAT_NAMES || {})[d.group] || '')}</td>
            <td class="r">${d.n}</td><td class="r">${f1(d.dd)}</td><td class="r">${f2(d.meanExec)}</td>
            <td class="r">${f1(d.ev)}</td><td class="r">${f1(d.floor)}</td><td class="r">${f1(d.ceiling)}</td>
            <td class="r">${f1(d.spread)}</td><td class="r">${pct(d.failRate)}</td>
            <td>${d.quad ? `<span style="color:${QUAD[d.quad].color};font-weight:600">${QUAD[d.quad].label}</span>`
              : `<span class="ae-soft">under ${MIN_N} attempts</span>`}</td></tr>`).join('')}
          </tbody>
        </table>
        ${thin.length ? `<ul class="ae-notes"><li>${thin.length} dive${thin.length === 1 ? '' : 's'}
          shown greyed with fewer than ${MIN_N} attempts. A spread computed from that few landings
          is not meaningful, so they are excluded from the chart and from list construction.</li></ul>` : ''}
      </div>`;

    root.querySelectorAll('[data-disc]').forEach((el) => el.addEventListener('click', () => {
      st.disc = el.getAttribute('data-disc'); render(root);
    }));
    root.querySelectorAll('[data-sort]').forEach((el) => el.addEventListener('click', () => {
      st.sort = el.getAttribute('data-sort'); render(root);
    }));
    const sz = root.querySelector('#val-size');
    if (sz) sz.addEventListener('change', () => { st.listSize = +sz.value; render(root); });
    const dg = root.querySelector('#val-distinct');
    if (dg) dg.addEventListener('change', () => { st.distinctGroups = dg.checked; render(root); });
  }

  window.AEValue = { render, repertoire, classify, bestList };
})();
