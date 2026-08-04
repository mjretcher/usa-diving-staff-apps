/* ============================================================
   ae-report.js — Athlete Evaluation reporting.

   Two outputs, both for the currently selected athlete:
     · a printed report (US Letter, prints to PDF cleanly)
     · a formatted Excel workbook, one sheet per topic

   Conventions follow the existing apps deliberately: the print layout
   mirrors the Junior Circuit report builder (rb-output), and the Excel
   export mirrors Schedule Builder's workbook export, so staff who use
   those already know what they are looking at.

   Every figure carries its sample size, and anything excluded from the
   analysis (skills, unreadable dive numbers) is stated rather than
   quietly dropped — a printed report has to defend itself without the
   controls that were on screen.
   ============================================================ */
(function () {
  'use strict';

  const NAVY = '#171F69', RED = '#E31937';
  const esc = (s) => window.AE.esc(s);
  const G = () => (window.AE.GUARD || { athlete: 8, field: 150, cell: 20, lists: 6 });

  const f2 = (v) => (v == null || isNaN(v) ? '' : Number(v).toFixed(2));
  const f1 = (v) => (v == null || isNaN(v) ? '' : Number(v).toFixed(1));
  const pct = (v) => (v == null || isNaN(v) ? '' : (100 * v).toFixed(1) + '%');
  const stamp = () => new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  /* ---------------- shared analysis ---------------- */

  // Everything both outputs need, computed once.
  async function collect(opts) {
    const b = window.AE.state.bundle;
    if (!b) throw new Error('Select an athlete first.');
    const scope = opts.scope || 'us-junior';
    const disc = opts.discipline || null;

    const indiv = b.sheets.filter((r) => window.AE.isIndiv(r)
      && (!disc || r.discipline === disc));

    let skills = 0, unreadable = 0;
    const dives = [];
    indiv.forEach((r) => {
      const bucket = window.AE.bucketOf(r);
      if (bucket === 'skill') { skills++; return; }
      if (bucket !== 'dive') { unreadable++; return; }
      dives.push(r);
    });

    const gender = (b.sheets.find((r) => r.gender) || {}).gender || null;
    const discs = [...new Set(dives.map((r) => r.discipline))].filter(Boolean).sort();

    // group profile per discipline, against the chosen field
    const groups = {};
    for (const d of discs) {
      let field = new Map();
      try {
        const rows = await window.AE.fieldGroupExec(gender, d, scope, opts.since || null);
        const acc = new Map();
        rows.forEach((r) => {
          if (!r.category_code) return;
          const a = acc.get(r.category_code) || { n: 0, sum: 0 };
          if (r.n && r.avg_exec != null) { a.sum += r.avg_exec * r.n; a.n += r.n; }
          acc.set(r.category_code, a);
        });
        acc.forEach((a, k) => field.set(k, { avg: a.n ? a.sum / a.n : null, n: a.n }));
      } catch (e) { /* field unavailable — rows still render without a delta */ }

      const order = window.AE.CAT_ORDER || [];
      groups[d] = order.map((code) => {
        const mine = dives.filter((r) => r.discipline === d && window.AE.catOf(r) === code);
        const ex = mine.map((r) => (r._exec != null ? r._exec : window.AE.execOf(r)))
          .filter((v) => v != null);
        const fx = field.get(code) || {};
        const myAvg = ex.length ? window.AE.mean(ex) : null;
        const reliable = ex.length >= G().athlete && (fx.n || 0) >= G().field && fx.avg != null;
        return {
          code, label: (window.AE.CAT_NAMES || {})[code] || code,
          n: ex.length, avg: myAvg,
          avgDD: mine.length ? window.AE.mean(mine.map((r) => Number(r.dd)).filter((v) => v)) : null,
          fieldAvg: fx.avg == null ? null : fx.avg, fieldN: fx.n || 0,
          diff: reliable ? myAvg - fx.avg : null, reliable,
        };
      }).filter((r) => r.n > 0 || r.fieldN > 0);
    }

    const perDive = window.AE.diveStats
      ? window.AE.diveStats(dives.map((r) => {
          if (r._exec == null) r._exec = window.AE.execOf(r);
          if (r._cat == null) r._cat = window.AE.catOf(r);
          return r;
        }))
      : [];

    return {
      ident: b.ident, phases: b.phases || [], dives, discs, gender, scope,
      scopeLabel: ((window.AE.SCOPES || []).find((s) => s.id === scope) || {}).label || scope,
      groups, perDive, skills, unreadable,
      years: dives.length
        ? [Math.min(...dives.map((r) => +r.meet_year)), Math.max(...dives.map((r) => +r.meet_year))]
        : null,
    };
  }

  /* ---------------- print report ---------------- */

  function groupTableHtml(rows) {
    if (!rows.length) return '<p class="aer-p aer-soft">No dives on record for this event.</p>';
    return `<table class="aer-table">
      <thead><tr><th>Dive group</th><th class="r">Attempts</th><th class="r">Execution</th>
        <th class="r">Field</th><th class="r">Difference</th><th class="r">Avg DD</th><th class="r">Field size</th></tr></thead>
      <tbody>${rows.map((r) => `<tr${r.reliable ? '' : ' class="aer-muted"'}>
        <td>${esc(r.label)}</td><td class="r">${r.n || '—'}</td><td class="r">${f2(r.avg) || '—'}</td>
        <td class="r">${f2(r.fieldAvg) || '—'}</td>
        <td class="r"${r.diff != null ? ` style="color:${r.diff >= 0 ? '#1B6E3A' : RED};font-weight:700"` : ''}>${
          r.diff == null ? '—' : (r.diff >= 0 ? '+' : '') + r.diff.toFixed(2)}</td>
        <td class="r">${f1(r.avgDD) || '—'}</td>
        <td class="r">${r.fieldN ? r.fieldN.toLocaleString() : '—'}</td></tr>`).join('')}</tbody></table>`;
  }

  async function printReport(opts) {
    const d = await collect(opts || {});
    const id = d.ident || {};
    const strongest = [], weakest = [];
    Object.keys(d.groups).forEach((disc) => {
      d.groups[disc].filter((r) => r.reliable).forEach((r) => {
        (r.diff >= 0 ? strongest : weakest).push({ disc, ...r });
      });
    });
    strongest.sort((a, b) => b.diff - a.diff);
    weakest.sort((a, b) => a.diff - b.diff);

    const out = document.createElement('div');
    out.id = 'aer-output';
    out.innerHTML = `
      <style>
        @media print {
          body * { visibility: hidden !important; }
          #aer-output, #aer-output * { visibility: visible !important; }
          #aer-output { position: absolute; left:0; top:0; width:100%; background:#fff; }
          #aer-output .aer-toolbar { display: none !important; }
          #aer-output, #aer-output * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 0.6in; }
        }
        #aer-output { position: fixed; inset: 0; background:#fafbfd; z-index: 99999; overflow:auto;
          font-family:'Inter',system-ui,sans-serif; color:${NAVY}; }
        #aer-output .aer-toolbar { position:sticky; top:0; background:#fff; border-bottom:1px solid #e5e9f2;
          padding:10px 18px; display:flex; align-items:center; gap:8px; z-index:1; }
        #aer-output .aer-toolbar button { padding:6px 12px; border-radius:4px; border:1px solid #c5cce0;
          background:#fff; cursor:pointer; font:inherit; font-size:12px; }
        #aer-output .aer-toolbar .primary { background:${NAVY}; color:#fff; border-color:${NAVY}; font-weight:600; }
        #aer-output .aer-doc { max-width:900px; margin:24px auto; padding:32px 44px; background:#fff;
          box-shadow:0 1px 4px rgba(0,0,0,.06); }
        #aer-output .aer-head { border-bottom:4px solid ${RED}; padding-bottom:14px; margin-bottom:22px; }
        #aer-output .aer-head h1 { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:28px;
          margin:0; text-transform:uppercase; letter-spacing:.01em; }
        #aer-output .aer-sub { font-size:12px; color:#5a6480; margin-top:8px; }
        #aer-output .aer-h2 { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:18px;
          border-bottom:2px solid ${NAVY}; padding-bottom:4px; margin:26px 0 10px; text-transform:uppercase;
          letter-spacing:.04em; page-break-after:avoid; }
        #aer-output .aer-h3 { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:14px;
          margin:16px 0 6px; text-transform:uppercase; letter-spacing:.03em; page-break-after:avoid; }
        #aer-output .aer-p { font-size:12px; color:#2d3450; margin:0 0 8px; }
        #aer-output .aer-soft { color:#6b7390; font-size:11px; }
        #aer-output .aer-table { width:100%; border-collapse:collapse; font-size:12px; margin:6px 0;
          page-break-inside:avoid; }
        #aer-output .aer-table th { background:#eef1f7; text-align:left; padding:5px 8px; font-weight:700;
          text-transform:uppercase; font-size:10px; letter-spacing:.03em; border-bottom:1px solid #c5cce0; }
        #aer-output .aer-table td { padding:5px 8px; border-bottom:1px solid #e5e9f2; font-variant-numeric:tabular-nums; }
        #aer-output .aer-table .r { text-align:right; }
        #aer-output .aer-muted td { background:#f7f8fb; color:#8890a8; }
        #aer-output .aer-section { page-break-inside:avoid; }
        #aer-output .aer-note { background:#F2F7FB; border-left:3px solid #009AC7; padding:8px 10px;
          border-radius:4px; font-size:11px; color:#2d3450; margin:8px 0; }
      </style>
      <div class="aer-toolbar">
        <button class="primary" onclick="window.print()">Print / save as PDF</button>
        <button onclick="AEReport.excel()">Download Excel</button>
        <button onclick="document.getElementById('aer-output').remove()">Close</button>
        <span class="aer-soft" style="margin-left:auto">Sized for US Letter. Print to PDF for the cleanest result.</span>
      </div>
      <div class="aer-doc">
        <div class="aer-head">
          <h1>Athlete Evaluation — ${esc(id.display_name || 'Unknown')}</h1>
          <div class="aer-sub">
            ${[id.team_name, id.nat, id.dm_id ? 'DiveMeets ' + id.dm_id : null]
              .filter(Boolean).map(esc).join(' · ')}<br>
            ${d.years ? `Seasons ${d.years[0]}–${d.years[1]} · ` : ''}${d.dives.length.toLocaleString()} scored dives
            · Compared against ${esc(d.scopeLabel)}<br>
            Generated ${esc(stamp())} · USA Diving High Performance
          </div>
        </div>

        <div class="aer-section">
          <div class="aer-h2">Where this athlete stands</div>
          ${strongest.length || weakest.length ? `
            <p class="aer-p">Measured against the ${esc(d.scopeLabel)} field, execution scores separate as follows.
              Only groups with at least ${G().athlete} attempts by this athlete and ${G().field} dives in the
              comparison field are ranked.</p>
            ${strongest.length ? `<div class="aer-h3">Strengths</div><table class="aer-table">
              <thead><tr><th>Event</th><th>Group</th><th class="r">Attempts</th><th class="r">Above field</th></tr></thead>
              <tbody>${strongest.slice(0, 6).map((r) => `<tr><td>${esc(r.disc)}</td><td>${esc(r.label)}</td>
                <td class="r">${r.n}</td><td class="r" style="color:#1B6E3A;font-weight:700">+${r.diff.toFixed(2)}</td></tr>`).join('')}
              </tbody></table>` : ''}
            ${weakest.length ? `<div class="aer-h3">Development priorities</div><table class="aer-table">
              <thead><tr><th>Event</th><th>Group</th><th class="r">Attempts</th><th class="r">Below field</th></tr></thead>
              <tbody>${weakest.slice(0, 6).map((r) => `<tr><td>${esc(r.disc)}</td><td>${esc(r.label)}</td>
                <td class="r">${r.n}</td><td class="r" style="color:${RED};font-weight:700">${r.diff.toFixed(2)}</td></tr>`).join('')}
              </tbody></table>` : ''}
          ` : `<p class="aer-p">No dive group yet has enough attempts to compare fairly against the
              ${esc(d.scopeLabel)} field. A group needs ${G().athlete} scored dives from this athlete.</p>`}
        </div>

        ${d.discs.map((disc) => `<div class="aer-section">
          <div class="aer-h2">${esc(disc)} — by dive group</div>
          ${groupTableHtml(d.groups[disc] || [])}
        </div>`).join('')}

        <div class="aer-section">
          <div class="aer-h2">Dive by dive</div>
          ${d.perDive.length ? `<table class="aer-table">
            <thead><tr><th>Dive</th><th>Description</th><th>Height</th><th class="r">Times</th>
              <th class="r">DD</th><th class="r">Avg exec</th><th class="r">Best</th><th class="r">Worst</th>
              <th class="r">Under 4.5</th></tr></thead>
            <tbody>${d.perDive.slice(0, 40).map((s) => `<tr>
              <td>${esc(s.dive)}</td><td>${esc(s.desc || '')}</td><td>${esc(s.height || '')}</td>
              <td class="r">${s.n}</td><td class="r">${f1(s.dd)}</td><td class="r">${f2(s.avgExec)}</td>
              <td class="r">${f2(s.maxExec)}</td><td class="r">${f2(s.minExec)}</td>
              <td class="r">${pct(s.failRate)}</td></tr>`).join('')}</tbody></table>
            ${d.perDive.length > 40 ? `<p class="aer-soft">Showing the 40 highest-value dives of
              ${d.perDive.length}. The Excel workbook contains all of them.</p>` : ''}`
            : '<p class="aer-p aer-soft">No dive-sheet detail on record.</p>'}
        </div>

        <div class="aer-section">
          <div class="aer-h2">How to read this</div>
          <p class="aer-p"><b>Execution</b> is the judges' award before difficulty, so it isolates how well a
            dive was performed from how hard it was. A difference of −0.50 per judge is roughly 1.5 raw points
            conceded on every dive of that group.</p>
          <p class="aer-p"><b>Dive groups</b> follow the 2026 USA Diving Technical Rulebook, Article 105.1:
            twisting dives are separated by take-off direction and armstands by direction, rather than being
            collapsed into single "twister" and "armstand" buckets.</p>
          <div class="aer-note">
            <b>What is excluded.</b>
            ${d.skills ? `${d.skills.toLocaleString()} skill${d.skills === 1 ? '' : 's'} (DD 1.0 lineups and
              jumps from the Skills Bank, Art. 401.4) — these are not rulebook dives and are not comparable
              to them. ` : 'No skills were present. '}
            ${d.unreadable ? `${d.unreadable.toLocaleString()} row${d.unreadable === 1 ? '' : 's'} with
              unreadable dive numbers from the results feed. ` : ''}
            Synchronised events are excluded throughout.
          </div>
          <p class="aer-soft">Minimum sample sizes: ${G().athlete} dives from the athlete, ${G().field} in a
            comparison field, ${G().cell} behind any single chart value. Figures below those thresholds are
            shown greyed with no difference calculated. Source: USA Diving results database
            (core.dive_sheets). Generated ${esc(stamp())}.</p>
        </div>
      </div>`;
    document.body.appendChild(out);
    window._aerData = d;
  }

  /* ---------------- Excel ---------------- */

  let _sheetJs = null;
  function loadSheetJS() {
    if (window.XLSX) return Promise.resolve();
    if (_sheetJs) return _sheetJs;
    _sheetJs = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => res();
      s.onerror = () => { _sheetJs = null; rej(new Error('Could not load the Excel library — check your internet connection')); };
      document.head.appendChild(s);
    });
    return _sheetJs;
  }

  // Apply a number format to a column range so Excel shows 5.40 not 5.4.
  function fmtCol(ws, colIdx, z, firstRow) {
    const X = window.XLSX;
    const range = X.utils.decode_range(ws['!ref']);
    for (let R = firstRow; R <= range.e.r; R++) {
      const cell = ws[X.utils.encode_cell({ c: colIdx, r: R })];
      if (cell && cell.t === 'n') cell.z = z;
    }
  }

  function sheet(wb, name, aoa, cols, numFmts, headerRow) {
    const X = window.XLSX;
    const ws = X.utils.aoa_to_sheet(aoa);
    if (cols) ws['!cols'] = cols.map((w) => ({ wch: w }));
    (numFmts || []).forEach(([c, z]) => fmtCol(ws, c, z, (headerRow || 0) + 1));
    // freeze the header so long tables stay readable while scrolling
    if (headerRow != null) ws['!freeze'] = { xSplit: 0, ySplit: headerRow + 1 };
    X.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    return ws;
  }

  async function excel(opts) {
    const d = window._aerData || await collect(opts || {});
    await loadSheetJS();
    const X = window.XLSX;
    const id = d.ident || {};
    const wb = X.utils.book_new();
    wb.Props = {
      Title: `Athlete Evaluation — ${id.display_name || ''}`,
      Author: 'USA Diving High Performance', CreatedDate: new Date(),
    };

    /* 1. Summary */
    sheet(wb, 'Summary', [
      ['USA DIVING — ATHLETE EVALUATION'],
      [id.display_name || ''],
      [],
      ['Team', id.team_name || ''],
      ['Nation', id.nat || ''],
      ['DiveMeets ID', id.dm_id || ''],
      ['Seasons', d.years ? `${d.years[0]}–${d.years[1]}` : ''],
      ['Scored dives', d.dives.length],
      ['Events contested', d.discs.join(', ')],
      ['Compared against', d.scopeLabel],
      ['Generated', stamp()],
      [],
      ['Excluded from analysis'],
      ['Skills (DD 1.0 lineups and jumps)', d.skills],
      ['Unreadable dive numbers', d.unreadable],
      ['Synchronised events', 'excluded throughout'],
      [],
      ['Minimum sample sizes'],
      ['Athlete dives per group', G().athlete],
      ['Dives behind a comparison field', G().field],
      ['Dives behind a single chart value', G().cell],
      [],
      ['Source', 'USA Diving results database (core.dive_sheets)'],
      ['Dive groups', '2026 USA Diving Technical Rulebook, Art. 105.1'],
    ], [34, 46], null, null);

    /* 2. Dive groups, one block per event */
    const gAoa = [['Event', 'Dive group', 'Attempts', 'Execution', 'Field average',
                   'Difference', 'Avg DD', 'Field size', 'Comparable?']];
    d.discs.forEach((disc) => {
      (d.groups[disc] || []).forEach((r) => gAoa.push([
        disc, r.label, r.n || null, r.avg == null ? null : +r.avg.toFixed(3),
        r.fieldAvg == null ? null : +r.fieldAvg.toFixed(3),
        r.diff == null ? null : +r.diff.toFixed(3),
        r.avgDD == null ? null : +r.avgDD.toFixed(2),
        r.fieldN || null, r.reliable ? 'yes' : 'below minimum',
      ]));
    });
    sheet(wb, 'Dive groups', gAoa, [12, 20, 10, 11, 13, 11, 9, 11, 15],
          [[3, '0.00'], [4, '0.00'], [5, '+0.00;-0.00'], [6, '0.00'], [7, '#,##0']], 0);

    /* 3. Dive by dive */
    const pAoa = [['Dive', 'Description', 'Height', 'Group', 'Times', 'DD', 'Avg exec',
                   'Best', 'Worst', 'Std dev', 'Under 4.5', '7.5 or better', 'Expected points', 'Last year']];
    d.perDive.forEach((s) => pAoa.push([
      s.dive, s.desc || '', s.height || '',
      (window.AE.CAT_NAMES || {})[s.cat] || '',
      s.n, s.dd == null ? null : +s.dd,
      s.avgExec == null ? null : +s.avgExec.toFixed(3),
      s.maxExec == null ? null : +s.maxExec.toFixed(2),
      s.minExec == null ? null : +s.minExec.toFixed(2),
      s.sdExec == null ? null : +s.sdExec.toFixed(3),
      s.failRate == null ? null : +s.failRate.toFixed(4),
      s.moneyRate == null ? null : +s.moneyRate.toFixed(4),
      s.evPts == null ? null : +s.evPts.toFixed(2), s.lastYear || null,
    ]));
    sheet(wb, 'Dive by dive', pAoa, [9, 40, 10, 18, 8, 7, 10, 8, 8, 9, 11, 14, 15, 10],
          [[5, '0.0'], [6, '0.00'], [7, '0.00'], [8, '0.00'], [9, '0.00'],
           [10, '0.0%'], [11, '0.0%'], [12, '0.00']], 0);

    /* 4. Every dive, raw */
    const rAoa = [['Year', 'Meet', 'Event', 'Round', 'Order', 'Dive', 'Group',
                   'Description', 'DD', 'Score', 'Execution', 'Voluntary/Optional', 'Judges']];
    d.dives.slice().sort((a, b) => (a.meet_year - b.meet_year) || String(a.meet_id).localeCompare(String(b.meet_id)))
      .forEach((r) => {
        const ex = r._exec != null ? r._exec : window.AE.execOf(r);
        rAoa.push([
          +r.meet_year || null, r.meet_id || '', r.event_name || '', r.round_stage || '',
          r.dive_order == null ? null : +r.dive_order, r.dive_code_norm || r.dive_number || '',
          (window.AE.CAT_NAMES || {})[window.AE.catOf(r)] || '', r.description || '',
          r.dd == null ? null : +r.dd, r.score == null ? null : +r.score,
          ex == null ? null : +ex.toFixed(3), r.optional_voluntary || '',
          r.judges_scores || '',
        ]);
      });
    sheet(wb, 'All dives', rAoa, [7, 12, 34, 12, 7, 9, 18, 38, 7, 9, 11, 18, 26],
          [[8, '0.0'], [9, '0.00'], [10, '0.00']], 0);

    /* 5. Meet history */
    if (d.phases.length) {
      const mAoa = [['Year', 'Meet', 'Event', 'Round', 'Place', 'Score']];
      d.phases.slice().sort((a, b) => (a.meet_year - b.meet_year)).forEach((p) => mAoa.push([
        +p.meet_year || null, p.meet_id || '', p.event_name || '', p.round_stage || '',
        p.place == null ? null : +p.place, p.posted_score == null ? null : +p.posted_score,
      ]));
      sheet(wb, 'Meet history', mAoa, [7, 12, 40, 14, 8, 10], [[5, '0.00']], 0);
    }

    const safe = String(id.display_name || 'athlete').replace(/[\\/\?\*\[\]:]/g, '').trim();
    X.writeFile(wb, `${safe} — athlete evaluation.xlsx`);
  }

  window.AEReport = { printReport, excel, collect };
})();
