/* ============================================================
   Trials Voluntary / Optional Split — 2026 World Aquatics Junior
   Diving Championships Team Trials (meet 12838), Groups A & B
   individual events. Reads core.dive_sheets (populated by
   db/scripts/fetch_trials_dive_sheets.py) via the shared Neon
   client. Shows two totals per finalist — don't conflate them:
     Actual Trials Total      = Prelims Total + Finals Total
                                 (the athlete's real result/rank)
     Prelim Vol + Final Op    = Voluntary(Prelims) + Optional(Finals)
                                 (a.k.a. "Nationals-equivalent";
                                  hypothetical, NOT the real result)

   Mechanic confirmed two ways: empirically against the scraped
   dive sheets (2026-07-14), and in writing in the official Meet
   Information Packet's "Competition Format" section — Prelims mix
   Voluntary + Optional dives into one round, top 12 advance, Finals
   are Optional-dives-only, and real rankings are the cumulative
   total of both rounds. So there are three raw fields (not four):
   Voluntary(Prelims), Optional(Prelims), Optional(Finals) — plus
   the two derived totals above.
   ============================================================ */
(function(){
  const MEET_ID = '12838';

  const EVENTS = [
    { event_id:'1420', age_group:'Group A', gender:'Male',   disc:'1m',       label:'A Boys 1m' },
    { event_id:'1430', age_group:'Group A', gender:'Male',   disc:'3m',       label:'A Boys 3m' },
    { event_id:'1440', age_group:'Group A', gender:'Male',   disc:'Platform', label:'A Boys Platform' },
    { event_id:'1250', age_group:'Group A', gender:'Female', disc:'1m',       label:'A Girls 1m' },
    { event_id:'1260', age_group:'Group A', gender:'Female', disc:'3m',       label:'A Girls 3m' },
    { event_id:'1270', age_group:'Group A', gender:'Female', disc:'Platform', label:'A Girls Platform' },
    { event_id:'1390', age_group:'Group B', gender:'Male',   disc:'1m',       label:'B Boys 1m' },
    { event_id:'1400', age_group:'Group B', gender:'Male',   disc:'3m',       label:'B Boys 3m' },
    { event_id:'1410', age_group:'Group B', gender:'Male',   disc:'Platform', label:'B Boys Platform' },
    { event_id:'1220', age_group:'Group B', gender:'Female', disc:'1m',       label:'B Girls 1m' },
    { event_id:'1230', age_group:'Group B', gender:'Female', disc:'3m',       label:'B Girls 3m' },
    { event_id:'1240', age_group:'Group B', gender:'Female', disc:'Platform', label:'B Girls Platform' },
  ];
  const EV_BY_ID = Object.fromEntries(EVENTS.map(e => [e.event_id, e]));

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (n) => (n == null ? '—' : Number(n).toFixed(2));

  let _cache = null; // { rows: per-athlete reconstructed records }

  async function loadData(){
    if (_cache) return _cache;
    const r = await window.NEON.query(
      `SELECT event_id, result_set_id AS round, diver_id, diver_name, team_name,
              gender, discipline, optional_voluntary,
              COUNT(*)::int AS dives, SUM(score)::numeric AS total_score
         FROM core.dive_sheets
        WHERE meet_id = $1
        GROUP BY event_id, result_set_id, diver_id, diver_name, team_name,
                 gender, discipline, optional_voluntary
        ORDER BY event_id, diver_id, result_set_id`,
      [MEET_ID]);

    // Pivot into one record per (event_id, diver_id)
    const byKey = new Map();
    for (const row of r.rows) {
      const key = row.event_id + '|' + row.diver_id;
      if (!byKey.has(key)) {
        byKey.set(key, {
          event_id: row.event_id, diver_id: row.diver_id,
          diver_name: row.diver_name, team_name: row.team_name,
          vol_prelim: null, opt_prelim: null, opt_final: null, vol_final: null,
          vol_prelim_dives: 0, opt_prelim_dives: 0, opt_final_dives: 0,
        });
      }
      const rec = byKey.get(key);
      const score = row.total_score == null ? null : Number(row.total_score);
      if (row.round === '1' && row.optional_voluntary === 'V') { rec.vol_prelim = score; rec.vol_prelim_dives = row.dives; }
      else if (row.round === '1' && row.optional_voluntary === 'O') { rec.opt_prelim = score; rec.opt_prelim_dives = row.dives; }
      else if (row.round === '9' && row.optional_voluntary === 'O') { rec.opt_final = score; rec.opt_final_dives = row.dives; }
      else if (row.round === '9' && row.optional_voluntary === 'V') { rec.vol_final = score; } // defensive — not expected
    }

    const rows = [...byKey.values()].map(rec => {
      const ev = EV_BY_ID[rec.event_id] || {};
      const prelimsTotal = (rec.vol_prelim != null && rec.opt_prelim != null) ? rec.vol_prelim + rec.opt_prelim : null;
      const madeFinals = rec.opt_final != null;
      // finalsTotal: Finals is Optional-dives-only (confirmed both empirically and in
      // the official Meet Information Packet), so the Optional(Finals) score IS the
      // Finals round total — no separate Voluntary component to add.
      const finalsTotal = rec.opt_final;
      // Real Trials result, per the Meet Information Packet's Competition Format section:
      // "Final rankings will be determined by the cumulative total of all preliminary
      // scores (voluntary and optional) and final scores (optional only)." This is the
      // athlete's actual score/rank at the meet — matches DiveMeets' own cumulative total.
      const actualTotal = (prelimsTotal != null && finalsTotal != null) ? prelimsTotal + finalsTotal : null;
      // Hypothetical Junior-Nationals-style reconstruction (what the HP Director asked
      // for) — NOT the real Trials result, so it must never be labeled "Official."
      const nationalsEquivTotal = (rec.vol_prelim != null && rec.opt_final != null) ? rec.vol_prelim + rec.opt_final : null;
      return {
        ...rec, ...ev,
        prelimsTotal, madeFinals, finalsTotal, actualTotal, nationalsEquivTotal,
        // Flag only a genuine scored Voluntary dive in a Final round — DiveMeets carries
        // zero-score placeholder rows for the declared-but-unused voluntary list on some
        // finalists (e.g. a scratch), which don't affect any total computed above.
        finalsVolWarning: rec.vol_final != null && rec.vol_final > 0,
      };
    });
    _cache = rows;
    return rows;
  }

  function groupAgg(rows){
    const groups = new Map();
    for (const ev of EVENTS) groups.set(ev.event_id, { ...ev, n: 0, nFinalists: 0,
      volPrelimSum:0, optPrelimSum:0, optFinalSum:0 });
    for (const r of rows) {
      const g = groups.get(r.event_id);
      if (!g) continue;
      if (r.vol_prelim != null && r.opt_prelim != null) {
        g.n++; g.volPrelimSum += r.vol_prelim; g.optPrelimSum += r.opt_prelim;
      }
      if (r.madeFinals) { g.nFinalists++; g.optFinalSum += r.opt_final; }
    }
    return [...groups.values()].map(g => ({
      ...g,
      volPrelimAvg: g.n ? g.volPrelimSum / g.n : null,
      optPrelimAvg: g.n ? g.optPrelimSum / g.n : null,
      optFinalAvg: g.nFinalists ? g.optFinalSum / g.nFinalists : null,
    }));
  }

  function chartSVG(agg){
    const W = 980, H = 360, padL = 46, padR = 16, padT = 20, padB = 92;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const maxVal = Math.max(1, ...agg.map(g => Math.max(g.volPrelimAvg||0, g.optPrelimAvg||0, g.optFinalAvg||0)));
    const scale = (v) => plotH * (v / maxVal);
    const n = agg.length;
    const groupW = plotW / n;
    const barW = Math.min(16, groupW / 5);
    const colors = { vol: '#171F69', opt: '#009AC7', optFinal: '#8FC3EA' };

    let bars = '';
    agg.forEach((g, i) => {
      const cx = padL + groupW * i + groupW / 2;
      const bars3 = [
        { v: g.volPrelimAvg, c: colors.vol,      dx: -barW - 3 },
        { v: g.optPrelimAvg, c: colors.opt,      dx: 0 },
        { v: g.optFinalAvg,  c: colors.optFinal, dx: barW + 3 },
      ];
      bars3.forEach(b => {
        if (b.v == null) return;
        const h = scale(b.v);
        const x = cx + b.dx - barW/2;
        const y = padT + plotH - h;
        bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" fill="${b.c}" rx="2"/>`;
        bars += `<text x="${(x+barW/2).toFixed(1)}" y="${(y-4).toFixed(1)}" font-size="9" font-family="var(--f-mono)" text-anchor="middle" fill="#4b5570">${b.v.toFixed(0)}</text>`;
      });
      bars += `<text x="${cx.toFixed(1)}" y="${(padT+plotH+16).toFixed(1)}" font-size="10.5" font-family="var(--f-ui)" text-anchor="end" fill="#2a3350" transform="rotate(-38 ${cx.toFixed(1)} ${(padT+plotH+16).toFixed(1)})">${esc(g.label)}</text>`;
    });

    // Y axis gridlines
    let grid = '';
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const v = maxVal * s / steps;
      const y = padT + plotH - scale(v);
      grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="#e3e7f0" stroke-width="1"/>`;
      grid += `<text x="${padL-6}" y="${(y+3).toFixed(1)}" font-size="9.5" font-family="var(--f-mono)" text-anchor="end" fill="#8891a8">${v.toFixed(0)}</text>`;
    }

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
      ${grid}${bars}
      <g transform="translate(${padL},${H-16})">
        <rect width="10" height="10" fill="${colors.vol}"/><text x="14" y="9" font-size="10.5" font-family="var(--f-ui)" fill="#2a3350">Voluntary (Prelims)</text>
        <rect x="150" width="10" height="10" fill="${colors.opt}"/><text x="164" y="9" font-size="10.5" font-family="var(--f-ui)" fill="#2a3350">Optional (Prelims)</text>
        <rect x="300" width="10" height="10" fill="${colors.optFinal}"/><text x="314" y="9" font-size="10.5" font-family="var(--f-ui)" fill="#2a3350">Optional (Finals, finalists only)</text>
      </g>
    </svg>`;
  }

  function athleteTable(rows, eventId){
    const filtered = rows.filter(r => r.event_id === eventId)
      // Real competition order: finalists ranked by their actual cumulative total
      // (prelims + finals, per the Meet Info Packet's stated rule), then everyone
      // who didn't advance ranked by their prelim total underneath.
      .sort((a, b) => {
        if (a.madeFinals !== b.madeFinals) return a.madeFinals ? -1 : 1;
        const av = a.madeFinals ? a.actualTotal : a.prelimsTotal;
        const bv = b.madeFinals ? b.actualTotal : b.prelimsTotal;
        return (bv || 0) - (av || 0);
      });
    if (!filtered.length) return '<div class="rpt-empty">No divers scraped yet for this event.</div>';
    return `<div class="rpt-table-scroll"><table class="rpt-table">
      <thead><tr>
        <th>Rank</th><th>Diver</th><th>Team</th>
        <th>Voluntary<br>(Prelims)</th><th>Optional<br>(Prelims)</th><th>Prelims Total</th>
        <th>Optional<br>(Finals)</th><th>Actual Trials Total<sup>†</sup></th>
        <th>Prelim Vol<br>+ Final Op<sup>‡</sup></th>
      </tr></thead>
      <tbody>
        ${filtered.map((r, i) => `<tr>
          <td class="mono">${i + 1}${r.madeFinals ? '' : '<span class="small"> (prelim)</span>'}</td>
          <td class="r-name">${esc(r.diver_name)}</td>
          <td class="small">${esc(r.team_name)}</td>
          <td class="mono">${fmt(r.vol_prelim)}</td>
          <td class="mono">${fmt(r.opt_prelim)}</td>
          <td class="mono"><strong>${fmt(r.prelimsTotal)}</strong></td>
          <td class="mono">${r.madeFinals ? fmt(r.finalsTotal) : '<span class="small">—</span>'}</td>
          <td class="mono">${r.madeFinals ? `<strong>${fmt(r.actualTotal)}</strong>` : '<span class="small">—</span>'}</td>
          <td class="mono">${r.madeFinals ? fmt(r.nationalsEquivTotal) : '<span class="small">—</span>'}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
    <div class="rpt-pill-note" style="margin-top:6px">
      † Actual Trials Total = Prelims Total + Finals Total — the athlete's real score and the basis
      for the meet's actual final rankings, per the official Meet Information Packet.<br>
      ‡ Prelim Vol + Final Op = Voluntary (Prelims) + Optional (Finals) — a hypothetical
      reconstruction of what the score would be under Junior Nationals' format (the
      &ldquo;Nationals-equivalent&rdquo; total). This is <em>not</em> the athlete's real Trials result.
    </div>`;
  }

  window.renderTrialsSplitPanel = async function(wrap){
    wrap.innerHTML = `
      <div class="rpt-flow-head">
        <div class="rpt-flow-title">Trials Voluntary / Optional Split</div>
        <div class="rpt-soft">Live from Neon: <code>core.dive_sheets</code> · meet 12838 · Groups A/B individual events</div>
      </div>
      <div class="rpt-note">
        <strong>2026 World Aquatics Junior Diving Championships Team Trials</strong> — Coral Springs, May 6&ndash;10, 2026.
        Per the official Meet Information Packet: Individual-event Prelims combine Voluntary + Optional
        dives; the top 12 advance to a Finals round of Optional dives only; real rankings are the
        cumulative total of both rounds. The <strong>Prelim Vol + Final Op</strong> column below is a separate,
        hypothetical reconstruction (Voluntary Prelims + Optional Finals) for comparing against Junior
        Nationals scoring — it is not the athlete's actual Trials result.
      </div>
      <div id="trials-split-body"><div class="rpt-loading">Loading Trials dive sheets…</div></div>
    `;
    const body = wrap.querySelector('#trials-split-body');
    try {
      const rows = await loadData();
      if (!rows.length) {
        body.innerHTML = '<div class="rpt-empty">No Trials dive-sheet data in Neon yet. Run the "Trials dive sheets" GitHub Action to scrape it.</div>';
        return;
      }
      const agg = groupAgg(rows);
      const anyFinalVolWarning = rows.some(r => r.finalsVolWarning);
      body.innerHTML = `
        <div class="rpt-card">
          <div class="rpt-card-h">Average score by group &times; gender &times; discipline</div>
          ${chartSVG(agg)}
        </div>
        ${anyFinalVolWarning ? `<div class="rpt-note" style="border-left-color:#d97706;background:#FEF3C7">
          Heads up: at least one Final-round dive was scraped with a genuine non-zero Voluntary score,
          which breaks the "Finals are Optional-only" rule this report relies on for that diver/event.
          That diver's Actual Trials Total and Prelim Vol + Final Op above are excluded — check
          <code>core.dive_sheets</code> for that diver before trusting either number.
        </div>` : ''}
        <div class="rpt-subsection">
          <div class="rpt-subsection-title">Per-athlete breakdown</div>
          <div class="filter-field" style="max-width:280px;margin-bottom:10px">
            <select id="trials-split-event-pick" onchange="window._trialsSplitPick(this.value)">
              ${EVENTS.map(e => `<option value="${e.event_id}">${esc(e.label)}</option>`).join('')}
            </select>
          </div>
          <div id="trials-split-athlete-table">${athleteTable(rows, EVENTS[0].event_id)}</div>
        </div>
      `;
      window._trialsSplitRows = rows;
      window._trialsSplitPick = function(eventId){
        document.getElementById('trials-split-athlete-table').innerHTML = athleteTable(window._trialsSplitRows, eventId);
      };
    } catch (e) {
      body.innerHTML = `<div class="rpt-empty">Couldn't load Trials data: ${esc(e.message || e)}</div>`;
    }
  };
})();
