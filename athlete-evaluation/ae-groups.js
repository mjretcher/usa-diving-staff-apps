/* ============================================================
   ae-groups.js — Dive Groups.

   One athlete's execution in each dive group, measured against a
   comparison field the user chooses. Answers the question a coach
   actually asks: which groups is this athlete strong in, and which
   are costing points?

   Groups follow the 2026 Rulebook Art. 105.1: twisting dives split
   by takeoff direction, armstands split by direction. Skills (DD 1.0
   lineups and jumps) and unparseable rows are excluded — they are
   counted separately and shown at the foot of the table so nothing
   silently disappears.
   ============================================================ */
(function () {
  'use strict';

  const NAVY = '#171F69', RED = '#E31937', POOL = '#009AC7', SKY = '#8FC3EA';
  const INK2 = '#5A6079', GRID = '#E3E6EF';

  // Below this many attempts an athlete average is not worth reading.
  const MIN_ATHLETE_N = 8;
  // Below this many field dives the comparison baseline is too thin to trust.
  const MIN_FIELD_N = 150;

  const state = { disc: null, scope: 'us-junior', vo: 'all', since: null };

  const esc = (s) => window.AE.esc(s);
  const f2 = (v) => (v == null ? '—' : Number(v).toFixed(2));
  const n0 = (v) => (v == null ? '—' : Number(v).toLocaleString());

  /* ---------- helpers ---------- */

  function voMatches(row) {
    if (state.vo === 'all') return true;
    const t = String(row.optional_voluntary || '').toLowerCase();
    return state.vo === 'voluntary' ? t.startsWith('v') : t.startsWith('o');
  }

  function athleteGroups(bundle) {
    const out = new Map();
    let skills = 0, unparsed = 0;
    bundle.sheets.forEach((r) => {
      if (!window.AE.isIndiv(r)) return;
      if (state.disc && r.discipline !== state.disc) return;
      if (state.since && Number(r.meet_year) < state.since) return;
      if (!voMatches(r)) return;
      const bucket = window.AE.bucketOf(r);
      if (bucket === 'skill') { skills++; return; }
      if (bucket !== 'dive') { unparsed++; return; }
      const ex = r._exec != null ? r._exec : window.AE.execOf(r);
      if (ex == null) return;
      const g = window.AE.catOf(r);
      if (!g) return;
      if (!out.has(g)) out.set(g, []);
      out.get(g).push({ exec: ex, dd: Number(r.dd), dive: r.dive_code_norm || r.dive_number });
    });
    return { groups: out, skills, unparsed };
  }

  function fieldIndex(rows) {
    // Collapse the per-year field rows into one weighted baseline per group.
    const acc = new Map();
    rows.forEach((r) => {
      const g = r.category_code;
      if (!g) return;
      if (!acc.has(g)) acc.set(g, { n: 0, sum: 0, failN: 0, dives: 0 });
      const a = acc.get(g);
      if (r.n && r.avg_exec != null) { a.sum += r.avg_exec * r.n; a.n += r.n; }
      if (r.n && r.fail_rate != null) { a.failN += r.fail_rate * r.n; a.dives += r.n; }
    });
    const out = new Map();
    acc.forEach((a, g) => {
      out.set(g, {
        avg: a.n ? a.sum / a.n : null,
        n: a.n,
        failRate: a.dives ? a.failN / a.dives : null,
      });
    });
    return out;
  }

  /* ---------- diverging bar chart ---------- */

  function gapChart(rows) {
    const usable = rows.filter((r) => r.diff != null && r.reliable);
    if (!usable.length) {
      return '<div class="ae-empty">Not enough attempts yet to compare any group.</div>';
    }
    const w = 720, rowH = 34, padT = 26, padB = 24, padL = 150, padR = 60;
    const h = padT + padB + usable.length * rowH;
    const maxAbs = Math.max(0.35, ...usable.map((r) => Math.abs(r.diff)));
    const mid = padL + (w - padL - padR) / 2;
    const X = (v) => mid + (v / maxAbs) * ((w - padL - padR) / 2);

    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img" aria-label="Execution gap by dive group">`;
    [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs].forEach((t) => {
      s += `<line x1="${X(t)}" y1="${padT - 8}" x2="${X(t)}" y2="${h - padB}" stroke="${GRID}"/>` +
           `<text x="${X(t)}" y="${padT - 12}" text-anchor="middle" class="ae-tick">${t > 0 ? '+' : ''}${t.toFixed(1)}</text>`;
    });
    s += `<line x1="${mid}" y1="${padT - 8}" x2="${mid}" y2="${h - padB}" stroke="${INK2}" stroke-width="1.4"/>`;

    usable.forEach((r, i) => {
      const y = padT + i * rowH + rowH / 2;
      const x0 = Math.min(mid, X(r.diff)), x1 = Math.max(mid, X(r.diff));
      const good = r.diff >= 0;
      s += `<text x="8" y="${y + 4}" class="ae-db-lab">${esc(r.label)}</text>`;
      s += `<rect x="${x0}" y="${y - 9}" width="${Math.max(1, x1 - x0)}" height="18" rx="3" ` +
           `fill="${good ? POOL : RED}" opacity="${good ? 0.85 : 0.8}">` +
           `<title>${esc(r.label)}: ${r.diff >= 0 ? '+' : ''}${r.diff.toFixed(2)} vs field (${r.athleteN} attempts)</title></rect>`;
      s += `<text x="${w - padR + 8}" y="${y + 4}" class="ae-db-delta" fill="${good ? '#1F6B33' : RED}">` +
           `${r.diff >= 0 ? '+' : ''}${r.diff.toFixed(2)}</text>`;
    });
    s += '</svg>';
    return s;
  }

  /* ---------- controls ---------- */

  function controls(discs) {
    const scopes = (window.AE.SCOPES || []).map((s) =>
      `<option value="${esc(s.id)}"${s.id === state.scope ? ' selected' : ''}>${esc(s.label)}</option>`).join('');
    const discChips = discs.map((d) =>
      `<button class="ae-chip${d === state.disc ? ' on' : ''}" data-disc="${esc(d)}">${esc(d)}</button>`).join('');
    const voChips = [['all', 'All dives'], ['voluntary', 'Voluntary only'], ['optional', 'Optional only']]
      .map(([v, l]) => `<button class="ae-chip${v === state.vo ? ' on' : ''}" data-vo="${esc(v)}">${esc(l)}</button>`).join('');
    const years = [null, 2026, 2025, 2024, 2022].map((y) =>
      `<option value="${y == null ? '' : y}"${state.since === y ? ' selected' : ''}>` +
      `${y == null ? 'All years' : y + ' onward'}</option>`).join('');
    return `
      <div class="ae-ctl">
        <div class="ae-ctl-row"><span class="ae-ctl-lab">Event</span><div class="ae-chips">${discChips}</div></div>
        <div class="ae-ctl-row"><span class="ae-ctl-lab">Dive type</span><div class="ae-chips">${voChips}</div></div>
        <div class="ae-ctl-row">
          <span class="ae-ctl-lab">Compare against</span>
          <select class="ae-sel" id="grp-scope">${scopes}</select>
          <span class="ae-ctl-lab" style="margin-left:14px">Seasons</span>
          <select class="ae-sel" id="grp-since">${years}</select>
        </div>
      </div>`;
  }

  /* ---------- render ---------- */

  async function render(root) {
    const bundle = window.AE.state.bundle;
    if (!bundle) {
      root.innerHTML = '<div class="ae-card"><div class="ae-empty">Pick an athlete to see their dive-group profile.</div></div>';
      return;
    }

    const discs = [...new Set(bundle.sheets.filter(window.AE.isIndiv).map((r) => r.discipline))]
      .filter(Boolean).sort();
    if (!discs.length) {
      root.innerHTML = '<div class="ae-card"><div class="ae-empty">No individual dive sheets on record for this athlete.</div></div>';
      return;
    }
    if (!state.disc || !discs.includes(state.disc)) state.disc = discs[0];

    const gender = (bundle.sheets.find((r) => r.gender) || {}).gender || null;
    const { groups, skills, unparsed } = athleteGroups(bundle);

    let field = new Map();
    let fieldErr = null;
    try {
      const rows = await window.AE.fieldGroupExec(gender, state.disc, state.scope, state.since);
      field = fieldIndex(rows);
    } catch (e) { fieldErr = e.message || String(e); }

    const order = window.AE.CAT_ORDER || [];
    const rows = order.map((g) => {
      const mine = groups.get(g) || [];
      const fx = field.get(g) || {};
      const myAvg = mine.length ? window.AE.mean(mine.map((d) => d.exec)) : null;
      const reliable = mine.length >= MIN_ATHLETE_N && (fx.n || 0) >= MIN_FIELD_N && fx.avg != null;
      return {
        code: g,
        label: (window.AE.CAT_NAMES || {})[g] || g,
        athleteN: mine.length,
        athleteAvg: myAvg,
        athleteDD: mine.length ? window.AE.mean(mine.map((d) => d.dd)) : null,
        fieldAvg: fx.avg == null ? null : fx.avg,
        fieldN: fx.n || 0,
        diff: (myAvg != null && fx.avg != null) ? myAvg - fx.avg : null,
        reliable,
      };
    }).filter((r) => r.athleteN > 0 || r.fieldN > 0);

    const rated = rows.filter((r) => r.reliable);
    const best = rated.slice().sort((a, b) => b.diff - a.diff)[0];
    const worst = rated.slice().sort((a, b) => a.diff - b.diff)[0];

    const scopeLabel = ((window.AE.SCOPES || []).find((s) => s.id === state.scope) || {}).label || state.scope;

    let headline;
    if (!rated.length) {
      headline = `<p class="ae-soft">Not enough attempts in any single group yet to compare fairly against the ${esc(scopeLabel)} field. A group needs at least ${MIN_ATHLETE_N} scored dives here.</p>`;
    } else {
      const bits = [];
      if (best && best.diff > 0) bits.push(`strongest in <b>${esc(best.label.toLowerCase())}</b>, ${best.diff.toFixed(2)} above the ${esc(scopeLabel)} average`);
      if (worst && worst !== best && worst.diff < 0) bits.push(`weakest in <b>${esc(worst.label.toLowerCase())}</b>, ${Math.abs(worst.diff).toFixed(2)} below`);
      headline = `<p class="ae-soft">Across ${rated.length} comparable group${rated.length === 1 ? '' : 's'} on ${esc(state.disc)}: ${bits.join('; ') || 'no group differs much from the field'}.</p>`;
    }

    const thin = rows.filter((r) => r.athleteN > 0 && !r.reliable);

    const tbl = `
      <table class="ae-tbl">
        <thead><tr>
          <th>Dive group</th><th class="r">Attempts</th><th class="r">Their execution</th>
          <th class="r">Field average</th><th class="r">Difference</th><th class="r">Avg DD</th><th class="r">Field size</th>
        </tr></thead>
        <tbody>
          ${rows.map((r) => {
            const muted = !r.reliable ? ' class="ae-muted"' : '';
            const dcol = r.diff == null ? INK2 : (r.diff >= 0 ? '#1F6B33' : RED);
            return `<tr${muted}>
              <td>${esc(r.label)}</td>
              <td class="r">${r.athleteN || '—'}</td>
              <td class="r">${f2(r.athleteAvg)}</td>
              <td class="r">${f2(r.fieldAvg)}</td>
              <td class="r" style="color:${dcol};font-weight:600">${r.diff == null || !r.reliable ? '—' : (r.diff >= 0 ? '+' : '') + r.diff.toFixed(2)}</td>
              <td class="r">${f2(r.athleteDD)}</td>
              <td class="r">${n0(r.fieldN)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    const notes = [];
    if (thin.length) {
      notes.push(`${thin.length} group${thin.length === 1 ? '' : 's'} shown greyed out — either fewer than ${MIN_ATHLETE_N} attempts by this athlete, or fewer than ${MIN_FIELD_N} dives in the comparison field. Differences are not calculated for those.`);
    }
    if (skills) notes.push(`${n0(skills)} skill${skills === 1 ? '' : 's'} (DD 1.0 lineups and jumps) excluded — these are not rulebook dives.`);
    if (unparsed) notes.push(`${n0(unparsed)} row${unparsed === 1 ? '' : 's'} excluded as unreadable dive numbers from the results scraper.`);
    if (fieldErr) notes.push(`Comparison field could not be loaded: ${esc(fieldErr)}`);

    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h"><h3>Dive groups</h3></div>
        ${controls(discs)}
        ${headline}
        ${gapChart(rows)}
        <p class="ae-soft" style="margin-top:6px">
          Bars show execution score against the ${esc(scopeLabel)} field on ${esc(state.disc)}.
          Right of the line is above the field, left is below.
          Execution is the judges' award before difficulty, so it isolates how well the dive was
          performed from how hard it was.
        </p>
      </div>
      <div class="ae-card">
        <div class="ae-card-h"><h3>Group by group</h3></div>
        ${tbl}
        ${notes.length ? `<ul class="ae-notes">${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
      </div>`;

    root.querySelectorAll('[data-disc]').forEach((b) => b.addEventListener('click', () => {
      state.disc = b.getAttribute('data-disc'); render(root);
    }));
    root.querySelectorAll('[data-vo]').forEach((b) => b.addEventListener('click', () => {
      state.vo = b.getAttribute('data-vo'); render(root);
    }));
    const sc = root.querySelector('#grp-scope');
    if (sc) sc.addEventListener('change', () => { state.scope = sc.value; render(root); });
    const sy = root.querySelector('#grp-since');
    if (sy) sy.addEventListener('change', () => { state.since = sy.value ? Number(sy.value) : null; render(root); });
  }

  window.AEGroups = { render };
})();
