/* ============================================================
   ae-la28.js — LA28 Watch: who is trending toward the podium.

   Capability = 3 x list-DD x execution on the athlete's best
   optional-dive list each season (senior scoring basis). The
   projection runs the athlete's own execution trend forward to
   2028 under two difficulty scenarios: the list they carry today,
   and a world-finalist-average list. It is a training map, not a
   promise — and it says so on the page. Slopes come from 2–3
   seasons of dive-level data today and deepen automatically as the
   scraper back-fills toward 2015.
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr, num, q } = window.AE;
  const C = window.AECharts;
  const EVENTS = [
    { gender: 'Male', discipline: 'Platform', label: 'Men · Platform' },
    { gender: 'Female', discipline: 'Platform', label: 'Women · Platform' },
    { gender: 'Male', discipline: '3m', label: 'Men · 3m' },
    { gender: 'Female', discipline: '3m', label: 'Women · 3m' },
  ];
  const st = { ev: 0 };
  const f1 = (v) => v == null ? '—' : Number(v).toFixed(1);
  const f2 = (v) => v == null ? '—' : Number(v).toFixed(2);
  const CAT = window.AE.CAT_NAMES;

  async function render(root) {
    const ev = EVENTS[st.ev];
    root.innerHTML = `<div class="ae-card"><div class="ae-empty">Charting the road to Los Angeles…</div></div>`;

    let rows, bench, ldd, corridor, jr;
    try {
      [rows, bench, ldd, corridor] = await Promise.all([
        q(`SELECT * FROM analytics.la28_watch WHERE gender=$1 AND discipline=$2 AND last_year >= 2025 ORDER BY last_tot DESC LIMIT 40`, [ev.gender, ev.discipline]).then((r) => r.rows),
        window.AE.benchmarks(ev.gender, ev.discipline, 'World Aquatics'),
        window.AE.fieldListDD(ev.gender, ev.discipline, 'world'),
        window.AE.corridor(ev.gender, ev.discipline),
      ]);
      jr = await juniorBests(rows);
    } catch (e) {
      root.innerHTML = `<div class="ae-card"><div class="ae-empty" style="color:var(--brand-red)">LA28 Watch failed: ${esc(e.message)}</div></div>`;
      return;
    }

    rows.forEach(coerce);
    const worlds = bench.find((b) => /Championships/i.test(b.meet_name || '') && b.medal_score != null) || bench.find((b) => b.medal_score != null);
    const medal = worlds ? worlds.medal_score : null;
    const cut = worlds ? worlds.final_cut : null;
    const semi = worlds ? worlds.semi_cut : null;
    const wdd = ldd.filter((x) => x.n_lists >= 5).sort((a, b) => b.meet_year - a.meet_year)[0] || null;

    rows.forEach((r) => project(r, wdd));
    const ranked = rows.filter((r) => r.proj_world != null).sort((a, b) => b.proj_world - a.proj_world);
    const trending = ranked.filter((r) => r.n_years >= 2 && r.ehat_slope != null && r.ehat_slope > 0.03).slice(0, 4);

    root.innerHTML = `
      <div class="ae-la-hero">
        <div class="ae-la-head">
          <h2>LA28 WATCH</h2>
          <p>Who is trending toward the podium — each athlete's real scoring engine (execution × difficulty from their best optional list each season), run forward to 2028. Gold line: the ${esc(worlds ? worlds.meet_name : 'World')} medal bar${medal ? ` (${f1(medal)})` : ''}.</p>
          <div class="ae-controls">${EVENTS.map((e, i) => `<button class="ae-pill ae-pill-dark ${i === st.ev ? 'active' : ''}" onclick="AELa28.setEv(${i})">${esc(e.label)}</button>`).join('')}</div>
        </div>
        <div class="ae-la-cards">
          ${trending.length ? trending.map((r) => card(r, medal, cut, wdd, corridor, jr)).join('') : '<div class="ae-empty" style="grid-column:1/-1;background:rgba(255,255,255,.06);color:#B9C4EE">Not enough multi-season dive data in this event yet — the scraper back-fill will populate this automatically.</div>'}
        </div>
        <div class="ae-la-note">Projections assume each athlete's execution trend holds and, in the brighter line, that their list is upgraded to the world-finalist average difficulty${wdd ? ` (DD ${f1(wdd.avg_list_dd)})` : ''}. The medal bar is today's — the world moves too. Slopes rest on ${'2–3'} seasons of dive-level data and sharpen as older seasons land.</div>
      </div>

      <div class="ae-card ae-fi-sec">
        <div class="ae-card-h"><div><h3>The full board — ${esc(ev.label)}</h3>
        <p class="ae-soft">Every active US athlete with a qualifying list since 2025, ranked by <b>% of medal standard</b> — projected 2028 capability as a percentage of the world medal bar (100 = at the medal line). Tap anyone for their full passport.</p></div></div>
        ${boardStory(ranked, medal, cut, semi)}
        ${whereAmI(ranked, ev, medal)}
        <div class="ae-board">
          ${ranked.map((r, i) => {
            const tier = tierOf(r, medal, cut, semi);
            const pi = podiumIndex(r, medal);
            const gap = medal != null && r.proj_world != null ? r.proj_world - medal : null;
            const sparkVals = (r.yearlyArr || []).map((y) => y.tot);
            const selB = window.AE.state.bundle;
            const meB = selB && selB.ident && String(selB.ident.canonical_id) === String(r.canonical_id);
            return `<button class="ae-brow ae-brow-${tier.cls}${meB ? ' ae-la-mine' : ''}" onclick="AEApp.pick('${escJsAttr(r.canonical_id)}')">
              <span class="ae-brow-rank">${i + 1}</span>
              <span class="ae-brow-id">
                <b>${esc(r.display_name)}</b>
                <span class="ae-brow-meta">${esc(r.team_name || '')}${r.latest_group && r.group_year >= 2025 ? ` · ${esc(r.latest_group)}` : ' · Senior'}</span>
                <span class="ae-tier ae-tier-${tier.cls}">${esc(tier.tag)}</span>
              </span>
              <span class="ae-brow-spark">${C.spark(sparkVals, { w: 84, h: 26, color: r.ehat_slope > 0.03 ? '#1F6B33' : r.ehat_slope < -0.03 ? '#E31937' : '#5A6072' })}
                <em>${slopeText(r)}</em></span>
              <span class="ae-brow-stats">
                <span><b>${f1(r.last_tot)}</b><i>now</i></span>
                <span><b>${f2(r.last_ehat)}</b><i>engine</i></span>
                <span><b>${f1(r.proj_world)}</b><i>'28 proj</i></span>
              </span>
              <span class="ae-brow-pi">
                <b>${pi == null ? '—' : pi}</b><i>Podium<br>Index</i>
                ${gap == null ? '' : `<span class="ae-la-gap ${gap >= 0 ? 'good' : gap >= -25 ? 'close' : ''}">${gap >= 0 ? '+' : ''}${f1(gap)}</span>`}
              </span>
            </button>`;
          }).join('')}
        </div>
        <p class="ae-soft ae-footnote">Projection = the athlete's own execution trend carried to 2028 on a world-finalist-average list${wdd ? ` (DD ${f1(wdd.avg_list_dd)})` : ''}. Tiers: clears the medal bar → Medal Track; clears the Worlds final cut → World Finalist Track; clears the semi cut → World Semi Track. One-season athletes project flat. Optional dives only, so junior and senior lists sit on one scale. Trends rest on 2–3 seasons today and sharpen automatically as the scraper lands 2015–2023.</p>
      </div>`;
  }

  // A ranked board of forty people is a league table until you can find your
  // own athlete on it. When they are absent, "not here" is the least useful
  // possible answer — the reason is the information, and there are only a few
  // reasons: wrong event, no result since 2025, or no qualifying list.
  function whereAmI(ranked, ev, medal) {
    const b = window.AE.state.bundle;
    if (!b || !b.ident) return '';
    const nm = b.ident.display_name;
    const i = ranked.findIndex((r) => String(r.canonical_id) === String(b.ident.canonical_id));
    if (i >= 0) {
      const r = ranked[i];
      const gap = medal != null && r.proj_world != null ? r.proj_world - medal : null;
      return `<div class="ae-la-you"><b>${esc(nm)}</b> is <b>${i + 1}</b> of ${ranked.length} on this
        board${r.proj_world != null ? ` · 2028 projection ${f1(r.proj_world)}` : ''}${gap != null
          ? ` · ${gap >= 0 ? f1(gap) + ' above' : f1(-gap) + ' below'} today's medal bar` : ''}.</div>`;
    }
    // Absent — work out which of the board's own entry conditions they miss.
    // Gender first: telling a women's diver she has "no Men · Platform results"
    // is true and useless, and reads as though the app does not know who she is.
    const own = (b.phases || []).map((p) => p.gender).filter(Boolean);
    const aGender = own.length
      ? (own.filter((g) => g === 'Female').length > own.length / 2 ? 'Female' : 'Male') : null;
    if (aGender && aGender !== ev.gender) {
      return `<div class="ae-la-you ae-la-you-off">This board is ${esc(ev.label)}.
        ${esc(nm)} dives ${aGender === 'Female' ? "women's" : "men's"} events — switch the event
        above to place them.</div>`;
    }
    const ph = (b.phases || []).filter((p) => p.discipline === ev.discipline
      && p.gender === ev.gender && !window.AE.truthy(p.is_synchronized));
    if (!ph.length) {
      return `<div class="ae-la-you ae-la-you-off">${esc(nm)} has no ${esc(ev.label)} results on
        record, so they are not on this board. Try another event above.</div>`;
    }
    const recent = ph.filter((p) => Number(p.meet_year) >= 2025).length;
    return `<div class="ae-la-you ae-la-you-off">${esc(nm)} is not on this board.
      ${recent
        ? `They have ${recent} ${esc(ev.label)} result${recent === 1 ? '' : 's'} since 2025, but no
           qualifying list on file — the board needs dive-level sheets to project an engine, and the
           scraper has not landed theirs.`
        : `Their most recent ${esc(ev.label)} result is from ${Math.max(...ph.map((p) => Number(p.meet_year)))},
           and the board only carries athletes active since 2025.`}</div>`;
  }

  function boardStory(ranked, medal, cut, semi) {
    if (!ranked.length || medal == null) return '';
    const nMedal = ranked.filter((r) => r.proj_world >= medal).length;
    const nFinal = ranked.filter((r) => cut != null && r.proj_world >= cut && r.proj_world < medal).length;
    const rising = ranked.filter((r) => r.n_years >= 2 && r.ehat_slope > 0.15).length;
    const bits = [];
    bits.push(nMedal ? `${nMedal} athlete${nMedal > 1 ? 's' : ''} project${nMedal > 1 ? '' : 's'} at or above the medal bar` : 'No one projects above the medal bar yet');
    if (nFinal) bits.push(`${nFinal} more inside world-finalist range`);
    if (rising) bits.push(`${rising} climbing at +0.15/yr or better`);
    return `<div class="ae-narrate">${esc(bits.join(' · ') + '.')}</div>`;
  }
  function slopeText(r) {
    if (r.n_years < 2 || r.ehat_slope == null) return '1 season';
    return (r.ehat_slope >= 0 ? '▲ +' : '▼ ') + r.ehat_slope.toFixed(2) + '/yr';
  }

  function coerce(r) {
    ['n_years','first_year','last_year','last_tot','last_dd','last_ehat','ehat_slope','group_year','grow_delta'].forEach((k) => { r[k] = num(r[k]); });
    try { r.yearlyArr = typeof r.yearly === 'string' ? JSON.parse(r.yearly) : r.yearly; } catch (e) { r.yearlyArr = []; }
    (r.yearlyArr || []).forEach((y) => { y.y = num(y.y); y.tot = num(y.tot); y.dd = num(y.dd); y.ehat = num(y.ehat); });
  }

  function project(r, wdd) {
    if (r.last_ehat == null || r.last_dd == null) { r.proj_world = null; return; }
    const slope = (r.n_years >= 2 && r.ehat_slope != null) ? r.ehat_slope : 0;
    const yrs = 2028 - r.last_year;
    let pe = r.last_ehat + slope * yrs;
    pe = Math.max(3.5, Math.min(pe, Math.min(8.8, r.last_ehat + 1.2)));
    r.proj_exec = pe;
    r.proj_own = 3 * r.last_dd * pe;
    r.proj_world = wdd && wdd.avg_list_dd ? 3 * wdd.avg_list_dd * pe : r.proj_own;
  }

  function tierOf(r, medal, cut, semi) {
    if (r.proj_world == null || medal == null) return { tag: 'DEVELOPING', cls: 'dev' };
    if (r.proj_world >= medal) return { tag: 'On medal pace', cls: 'medal' };
    if (cut != null && r.proj_world >= cut) return { tag: 'WORLD FINALIST TRACK', cls: 'final' };
    if (semi != null && r.proj_world >= semi) return { tag: 'WORLD SEMI TRACK', cls: 'semi' };
    return { tag: 'Building', cls: 'dev' };
  }
  function podiumIndex(r, medal) {
    if (r.proj_world == null || !medal) return null;
    return Math.round(100 * r.proj_world / medal);
  }

  function stageChip(r) {
    if (r.latest_group && r.group_year >= 2025) return `<span class="ae-chip ae-chip-pool">${esc(r.latest_group)} '${String(r.group_year).slice(2)}</span>`;
    if (r.latest_group) return `<span class="ae-chip ae-chip-soft">Senior · ${esc(r.latest_group)} alum</span>`;
    return `<span class="ae-chip ae-chip-soft">Senior</span>`;
  }

  function slopeChip(r) {
    if (r.n_years < 2 || r.ehat_slope == null) return '<span class="ae-soft">1 season</span>';
    const s = r.ehat_slope;
    const cls = s >= 0.15 ? 'up2' : s > 0.03 ? 'up1' : s < -0.15 ? 'down2' : s < -0.03 ? 'down1' : 'flat';
    const arrow = s > 0.03 ? '▲' : s < -0.03 ? '▼' : '■';
    return `<span class="ae-la-slope ${cls}">${arrow} ${s >= 0 ? '+' : ''}${s.toFixed(2)}</span>`;
  }

  function card(r, medal, cut, wdd, corridor, jr) {
    const grow = r.grow_cat && CAT[r.grow_cat] ? `<span class="ae-la-chip">${esc(CAT[r.grow_cat])} group +${f2(r.grow_delta)} this season</span>` : '';
    const dd = wdd && r.last_dd != null && wdd.avg_list_dd - r.last_dd > 0.5
      ? `<span class="ae-la-chip">+${f1(wdd.avg_list_dd - r.last_dd)} DD headroom to world avg</span>` : '';
    const jrChip = jrPath(r, corridor, jr);
    const sel = window.AE.state.bundle;
    const isMe = sel && sel.ident && String(sel.ident.canonical_id) === String(r.canonical_id);
    return `<div class="ae-la-card${isMe ? ' ae-la-mine' : ''}" onclick="AEApp.pick('${escJsAttr(r.canonical_id)}')">
      ${isMe ? '<div class="ae-la-flag">selected athlete</div>' : ''}
      <div class="ae-la-card-top">
        <div><div class="ae-la-name">${esc(r.display_name)}</div>
        <div class="ae-la-sub">${esc(r.team_name || '')}</div></div>
        ${stageChip(r)}
      </div>
      ${fan(r, medal, cut, wdd)}
      <div class="ae-la-nums">
        <div><b>${f1(r.last_tot)}</b><span>now</span></div>
        <div><b>${f2(r.last_ehat)}</b><span>engine</span></div>
        <div><b class="${r.ehat_slope > 0 ? 'up' : ''}">${r.ehat_slope != null && r.n_years >= 2 ? (r.ehat_slope >= 0 ? '+' : '') + r.ehat_slope.toFixed(2) : '—'}</b><span>trend/yr</span></div>
        <div><b>${f1(r.proj_world)}</b><span>2028 proj</span></div>
      </div>
      <div class="ae-la-chips">${grow}${dd}${jrChip}</div>
    </div>`;
  }

  function jrPath(r, corridor, jr) {
    const marks = jr.get(r.canonical_id);
    if (!marks || !marks.length) return '';
    const order = { 'Group A': 4, 'Group B': 3, 'Group C': 2, 'Group D': 1 };
    const m = marks.slice().sort((a, b) => order[b.age_group] - order[a.age_group])[0];
    const band = corridor.find((c) => c.tier === 'intl' && c.age_group === m.age_group && c.n_athletes >= 3)
      || corridor.find((c) => c.tier === 'senior' && c.age_group === m.age_group && c.n_athletes >= 3);
    if (!band) return `<span class="ae-la-chip">Jr Nats ${esc(m.age_group)}: ${f1(m.best)}</span>`;
    const pos = m.best >= band.p75 ? 'top quarter of' : m.best >= band.p50 ? 'above the median of' : m.best >= band.p25 ? 'inside' : 'below';
    const who = band.tier === 'intl' ? 'the international track' : 'the senior-finalist track';
    return `<span class="ae-la-chip">Jr path: ${esc(m.age_group)} best ${f1(m.best)} — ${pos} ${who}</span>`;
  }

  function fan(r, medal, cut, wdd) {
    const pts = (r.yearlyArr || []).filter((y) => y.tot != null);
    if (!pts.length) return '';
    const w = 320, h = 168, padL = 40, padR = 14, padT = 12, padB = 22;
    const x0 = Math.min(pts[0].y, r.first_year || pts[0].y), x1 = 2028.3;
    const yrsOut = 2028 - r.last_year;
    const bandE = 0.20 * Math.sqrt(Math.max(1, yrsOut));
    const projTopWorld = wdd ? 3 * wdd.avg_list_dd * Math.min(8.8, r.proj_exec + bandE) : null;
    const projLoWorld = wdd ? 3 * wdd.avg_list_dd * Math.max(3.5, r.proj_exec - bandE) : null;
    const ys = pts.map((p) => p.tot).concat([medal, cut, r.proj_own, r.proj_world, projTopWorld, projLoWorld].filter((v) => v != null));
    let mn = Math.min(...ys), mx = Math.max(...ys);
    const pad = (mx - mn || 40) * 0.10; mn -= pad; mx += pad;
    const X = (v) => padL + (v - x0 + 0.2) / (x1 - x0 + 0.4) * (w - padL - padR);
    const Y = (v) => padT + (1 - (v - mn) / (mx - mn)) * (h - padT - padB);
    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg ae-la-fan" role="img">`;
    for (let yr = Math.ceil(x0); yr <= 2028; yr += (2028 - Math.ceil(x0) > 4 ? 2 : 1)) {
      s += `<text x="${X(yr)}" y="${h - 6}" text-anchor="middle" class="ae-tick" fill="#8B95C9">${yr}</text>`;
    }
    if (medal != null) s += `<line x1="${padL - 4}" y1="${Y(medal)}" x2="${w - padR}" y2="${Y(medal)}" stroke="${C.COLORS.GOLD}" stroke-width="1.8"/><text x="${padL - 2}" y="${Y(medal) - 4}" class="ae-la-fanlab" fill="${C.COLORS.GOLD}">MEDAL</text>`;
    if (cut != null && Math.abs(Y(cut) - Y(medal || 0)) > 14) s += `<line x1="${padL - 4}" y1="${Y(cut)}" x2="${w - padR}" y2="${Y(cut)}" stroke="#8FC3EA" stroke-width="1.4" stroke-dasharray="5 4"/><text x="${padL - 2}" y="${Y(cut) - 4}" class="ae-la-fanlab" fill="#8FC3EA">FINAL</text>`;
    // uncertainty wedge (world-DD path)
    if (projTopWorld != null && projLoWorld != null && r.proj_world != null) {
      s += `<path d="M${X(r.last_year)},${Y(r.last_tot)} L${X(2028)},${Y(projTopWorld)} L${X(2028)},${Y(projLoWorld)} Z" fill="rgba(143,195,234,0.20)"/>`;
    }
    const line = 'M' + pts.map((p) => `${X(p.y).toFixed(1)},${Y(p.tot).toFixed(1)}`).join('L');
    s += `<path d="${line}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/>`;
    pts.forEach((p) => {
      s += `<circle cx="${X(p.y).toFixed(1)}" cy="${Y(p.tot).toFixed(1)}" r="4" fill="#fff"><title>${p.y}: ${p.tot.toFixed(1)} (DD ${p.dd.toFixed(1)} · exec ${p.ehat.toFixed(2)}) — ${esc(p.stage)}</title></circle>`;
    });
    if (r.proj_world != null) {
      s += `<line x1="${X(r.last_year)}" y1="${Y(r.last_tot)}" x2="${X(2028)}" y2="${Y(r.proj_world)}" stroke="#8FC3EA" stroke-width="2.4" stroke-dasharray="6 5"/>` +
           `<circle cx="${X(2028)}" cy="${Y(r.proj_world)}" r="5" fill="#8FC3EA"><title>2028 at world-avg DD: ${r.proj_world.toFixed(1)}</title></circle>`;
    }
    if (r.proj_own != null && Math.abs(r.proj_own - (r.proj_world || 0)) > 6) {
      s += `<line x1="${X(r.last_year)}" y1="${Y(r.last_tot)}" x2="${X(2028)}" y2="${Y(r.proj_own)}" stroke="rgba(255,255,255,0.55)" stroke-width="1.6" stroke-dasharray="3 4"/>` +
           `<circle cx="${X(2028)}" cy="${Y(r.proj_own)}" r="3.6" fill="rgba(255,255,255,0.75)"><title>2028 on today's list: ${r.proj_own.toFixed(1)}</title></circle>`;
    }
    s += `</svg>`;
    return s;
  }

  async function juniorBests(rows) {
    const ids = rows.map((r) => String(r.canonical_id)).filter((id) => /^\d+$/.test(id));
    const map = new Map();
    if (!ids.length) return map;
    const r = await q(
      `SELECT diver_id_dm::text AS id, age_group, MAX(score) AS best
       FROM core.event_results
       WHERE stage='Nationals' AND round='Final' AND COALESCE(is_synchro,false)=false
         AND age_group IN ('Group A','Group B','Group C','Group D')
         AND score IS NOT NULL AND (place IS NULL OR place < 100)
         AND diver_id_dm::text IN (${ids.map((_, i) => '$' + (i + 1)).join(',')})
       GROUP BY 1,2`, ids);
    r.rows.forEach((x) => {
      const id = x.id;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push({ age_group: x.age_group, best: num(x.best) });
    });
    return map;
  }

  window.AELa28 = { render, setEv(i) { st.ev = i; window.AEApp.rerender(); }, st };
})();
