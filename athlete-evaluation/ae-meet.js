/* ============================================================
   ae-meet.js — Meet Replay.

   Replaces the old Race Replay, which drew a rank-only bump chart and picked
   its meet from a select element listing all 903 scraped meets. Three things
   were wrong with that and all three are addressed here:

     1. Rank hides the race. A 0.4-point final and a 90-point walkover draw
        the identical picture. The chart here is in POINTS BEHIND THE LEADER,
        so the actual competitive distance is the thing you see.
     2. A dive score on its own is uninterpretable. 62.05 is a good 107B and a
        poor 109C. Every dive on the board is read against its own population
        in analytics.dive_population, at the same level.
     3. 903 meets in a dropdown is not a picker. There is a real search.

   Everything here is competition context for coaching. Percentiles depend on
   how completely the scraper has covered a level, which is not uniform across
   athletes, so none of it belongs in binding selection criteria.
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr, num, truthy, ok, GUARD } = window.AE;

  const st = {
    meet: null, meetId: null,          // selected meet
    events: null, eventKey: null,      // selected event within it
    rows: null, pop: null, official: null, // dive rows, population ref, posted result
    focus: null,                       // focused diver id
    finder: { term: '', year: null, results: null, busy: false },
    years: null,
  };

  /* ================= entry ================= */

  async function render(root) {
    if (!st.meetId) return renderFinder(root);

    if (!st.meet) st.meet = await window.AE.meetInfo(st.meetId);
    if (!st.events) {
      st.events = await window.AE.meetEvents(st.meetId);
      if (!st.eventKey) {
        // Default to the biggest final in the meet — the event most likely to
        // be the one someone opened the meet to look at.
        const finals = st.events.filter((e) => e.round_stage === 'Final');
        const pick = (finals.length ? finals : st.events)
          .slice().sort((a, b) => (b.n_divers || 0) - (a.n_divers || 0))[0];
        st.eventKey = pick ? pick.event_id + '|' + pick.round_stage : null;
      }
    }
    if (st.eventKey && !st.rows) {
      const [eid, stage] = st.eventKey.split('|');
      const [rows, official] = await Promise.all([
        window.AE.eventSheets(st.meetId, eid, stage),
        window.AE.eventOfficial(st.meetId, eid, stage).catch(() => new Map()),
      ]);
      st.rows = rows; st.official = official;
      const ev = currentEvent();
      st.pop = await window.AE.divePopulation(
        (st.meet && st.meet.scope) || 'us-open',
        ev ? ev.gender : null, ev ? ev.discipline : null,
        st.rows.map((r) => r.dive_number));
    }

    root.innerHTML = meetHeader() + eventPicker() +
      (st.rows && st.rows.length ? analysis() : `<div class="ae-card"><div class="ae-empty">No dive-level rows for this event.</div></div>`);
  }

  function currentEvent() {
    if (!st.eventKey || !st.events) return null;
    const [eid, stage] = st.eventKey.split('|');
    return st.events.find((e) => e.event_id === eid && e.round_stage === stage) || null;
  }

  /* ================= meet finder ================= */

  const FAMILY_CLS = { 'World Aquatics': 'wa', 'NCAA': 'ncaa', 'USA Diving': 'usad' };
  const fmtDate = (d) => {
    if (!d) return '';
    const t = new Date(String(d).replace(' ', 'T') + (String(d).length <= 10 ? 'T00:00:00' : ''));
    return isNaN(t) ? '' : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  async function renderFinder(root) {
    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h"><div>
          <h3>Meet Replay</h3>
          <p class="ae-soft">Open any meet with dive-level data and see how the event was actually won — the points gap round by round, every dive read against what that dive normally scores, and where the lead changed hands for the last time.</p>
        </div></div>
        <div class="ae-mf-search">
          <input type="search" id="aeMeetSearch" class="ae-mf-input"
                 placeholder="Search meets — name, venue or year…" autocomplete="off"
                 value="${esc(st.finder.term)}" />
        </div>
        <div class="ae-mf-years" id="aeMeetYears"></div>
        <div class="ae-mf-list" id="aeMeetList"></div>
      </div>`;

    const inp = document.getElementById('aeMeetSearch');
    let t;
    inp.addEventListener('input', (e) => {
      st.finder.term = e.target.value;
      clearTimeout(t); t = setTimeout(() => runFinder(), 220);
    });
    inp.focus();

    if (!st.years) { try { st.years = await window.AE.meetYears(); } catch (e) { st.years = []; } }
    paintYears();
    runFinder();
  }

  function paintYears() {
    const el = document.getElementById('aeMeetYears');
    if (!el || !st.years) return;
    el.innerHTML = `<button class="ae-yr ${st.finder.year == null ? 'on' : ''}" onclick="AEMeet.year(null)">All years</button>` +
      st.years.map((y) => `<button class="ae-yr ${st.finder.year === y.meet_year ? 'on' : ''}" onclick="AEMeet.year(${y.meet_year})">${y.meet_year}<i>${y.n_meets}</i></button>`).join('');
  }

  async function runFinder() {
    const list = document.getElementById('aeMeetList');
    if (!list) return;
    list.innerHTML = `<div class="ae-empty">Searching…</div>`;
    let rows = [];
    try { rows = await window.AE.meetSearch(st.finder.term, { year: st.finder.year }); }
    catch (e) { list.innerHTML = `<div class="ae-empty" style="color:var(--brand-red)">Meet search failed: ${esc(e.message || e)}</div>`; return; }
    if (!rows.length) {
      list.innerHTML = `<div class="ae-empty">No meets match${st.finder.term ? ` “${esc(st.finder.term)}”` : ''}${st.finder.year ? ' in ' + st.finder.year : ''}.</div>`;
      return;
    }
    list.innerHTML = rows.map((m) => `
      <button class="ae-mf-row" onclick="AEMeet.open('${escJsAttr(m.meet_id)}')">
        <span class="ae-mf-main">
          <span class="ae-mf-name">${esc(m.meet_name)}</span>
          <span class="ae-mf-meta">${[fmtDate(m.start_date) || m.meet_year, m.venue].filter(Boolean).map(esc).join(' · ')}</span>
        </span>
        <span class="ae-mf-right">
          <span class="ae-fam ${FAMILY_CLS[m.competition_family] || 'usad'}">${esc(m.competition_family || '')}</span>
          <span class="ae-mf-counts">${m.n_events} events · ${m.n_divers} divers</span>
        </span>
      </button>`).join('') +
      (rows.length === 40 ? `<div class="ae-soft ae-mf-more">Showing the 40 closest matches — narrow the search to see others.</div>` : '');
  }

  /* ================= meet + event header ================= */

  function meetHeader() {
    const m = st.meet || {};
    const span = m.start_date
      ? fmtDate(m.start_date) + (m.end_date && m.end_date !== m.start_date ? ' – ' + fmtDate(m.end_date) : '')
      : (m.meet_year || '');
    return `
      <div class="ae-card ae-meet-head">
        <div class="ae-mh-top">
          <div>
            <div class="ae-mh-eyebrow">${[span, m.venue].filter(Boolean).map(esc).join(' · ')}</div>
            <h3 class="ae-mh-title">${esc(m.meet_name || st.meetId)}</h3>
          </div>
          <button class="ae-btn-ghost" onclick="AEMeet.back()">← All meets</button>
        </div>
      </div>`;
  }

  function eventPicker() {
    if (!st.events || !st.events.length) return '';
    const byGender = {};
    st.events.forEach((e) => { (byGender[e.gender || '—'] = byGender[e.gender || '—'] || []).push(e); });
    const order = ['Female', 'Male'];
    const genders = Object.keys(byGender).sort((a, b) => (order.indexOf(a) + 9) % 9 - (order.indexOf(b) + 9) % 9);
    return `<div class="ae-card ae-evpick">
      ${genders.map((g) => `
        <div class="ae-evp-group">
          <div class="ae-evp-label">${esc(g)}</div>
          <div class="ae-evp-chips">${byGender[g].map((e) => {
            const k = e.event_id + '|' + e.round_stage;
            return `<button class="ae-evp ${k === st.eventKey ? 'on' : ''}" onclick="AEMeet.setEvent('${escJsAttr(k)}')">
              <b>${esc(e.discipline)}</b>
              <span>${esc(e.round_stage)} · ${e.n_divers}</span>
            </button>`;
          }).join('')}</div>
        </div>`).join('')}
    </div>`;
  }

  /* ================= model ================= */

  // One row per diver with their dives in order, plus the per-round leader
  // total so every gap is measured against the same reference.
  //
  // The carry-in is the important part. A Junior Circuit final is contested
  // from a starting score — the diver's prelim voluntary total — not from
  // zero, so a replay that begins everyone at 0 reports the wrong winner.
  // st.official holds the posted result; carry = posted total minus the dives
  // actually swum in this stage. That derives the carry arithmetically from
  // the authoritative number rather than assuming any particular format, so
  // it is also correct where nothing carries (prelims, NCAA, most world meets).
  function buildModel() {
    const by = new Map();
    st.rows.forEach((r) => {
      if (!by.has(r.diver_id)) by.set(r.diver_id, { id: r.diver_id, name: r.diver_name, team: r.team_name, dives: [] });
      by.get(r.diver_id).dives.push(r);
    });
    const divers = [...by.values()];
    divers.forEach((d) => d.dives.sort((a, b) => (a.dive_order || 0) - (b.dive_order || 0)));
    const nRounds = Math.max(1, ...divers.map((d) => d.dives.length));
    const official = st.official || new Map();

    divers.forEach((d) => {
      d.stageSum = d.dives.reduce((s, r) => s + (r.score || 0), 0);
      d.listDD = d.dives.reduce((s, r) => s + (r.dd || 0), 0);
      const o = official.get(String(d.id));
      d.official = o || null;
      d.carry = 0;
      if (o && o.posted_score != null && d.dives.length) {
        const gap = o.posted_score - d.stageSum;
        if (gap > 0.005) d.carry = gap;
      }
    });

    // Cumulative only if the posted result says so AND a carry is actually
    // present. One diver with a stray posted score must not switch the mode.
    const withCarry = divers.filter((d) => d.carry > 0.005).length;
    const flagged = divers.some((d) => d.official && truthy(d.official.score_is_cumulative));
    const cumulative = withCarry >= Math.max(2, Math.ceil(divers.length * 0.6)) && flagged;
    if (!cumulative) divers.forEach((d) => { d.carry = 0; });

    // Running total from the carry-in forward. Scraped running_total_points is
    // within-stage where present, so the carry is added on top of it.
    divers.forEach((d) => {
      let acc = d.carry;
      d.dives.forEach((r) => {
        if (r.running_total_points != null) acc = d.carry + r.running_total_points;
        else if (r.score != null) acc += r.score;
        r._run = acc;
      });
      d.total = d.dives.length ? d.dives[d.dives.length - 1]._run : null;
    });

    // Leader total after each round, and each diver's place at that point.
    // Derived rather than trusted: round_place is absent on most scraped
    // sheets, and where present it is within-stage, which is wrong here.
    //
    // Only displacing divers are ranked. A diver carrying a null or >=100
    // place did not take a placing in the real meet — exhibition, withdrawn,
    // or non-displacing — and ranking them silently pushes everyone below
    // them down a spot. That is how the replay came to disagree with the
    // posted sheet by one across whole events.
    const hasOfficial = official.size > 0;
    divers.forEach((d) => {
      const o = d.official;
      d.displacing = hasOfficial ? !!(o && o.place != null && o.place < 100) : true;
    });
    const field = divers.filter((d) => d.displacing);

    const leader = [];
    for (let r = 0; r < nRounds; r++) {
      const tot = field.map((d) => d.dives[r] ? d.dives[r]._run : null).filter((v) => v != null);
      leader.push(tot.length ? Math.max(...tot) : null);
      field.filter((d) => d.dives[r] && d.dives[r]._run != null)
        .sort((a, b) => b.dives[r]._run - a.dives[r]._run)
        .forEach((d, i) => { d.dives[r]._place = i + 1; });
    }
    // Where the field stood before a dive was taken, when there is a carry.
    const startLeader = cumulative && field.length ? Math.max(...field.map((d) => d.carry)) : null;

    // Independent check before the posted place is applied: does replaying the
    // dives reproduce the official order? Run first so the comparison is real
    // rather than a number checking itself.
    const derived = field.slice().sort((a, b) => (b.total == null ? -1e9 : b.total) - (a.total == null ? -1e9 : a.total));
    derived.forEach((d, i) => { d.derivedPlace = i + 1; });
    let checked = 0, agree = 0;
    derived.forEach((d) => {
      if (d.official && d.official.place != null) { checked++; if (d.official.place === d.derivedPlace) agree++; }
    });

    // Display order: the posted placing wins wherever one exists. Non-displacing
    // divers keep their dives on the board but sit below the placed field.
    divers.sort((a, b) => {
      if (a.displacing !== b.displacing) return a.displacing ? -1 : 1;
      if (a.displacing && hasOfficial) return a.official.place - b.official.place;
      return (b.total == null ? -1e9 : b.total) - (a.total == null ? -1e9 : a.total);
    });
    let nd = 0;
    divers.forEach((d, i) => {
      d.place = d.displacing ? (hasOfficial ? d.official.place : i + 1) : null;
      if (!d.displacing) nd++;
    });
    const nonDisplacing = nd;

    const leaders = [];
    for (let r = 0; r < nRounds; r++) {
      const at = field.filter((d) => d.dives[r] && d.dives[r]._place === 1)[0];
      leaders.push(at ? at.id : null);
    }
    let changes = 0, lastChange = null;
    for (let r = 1; r < nRounds; r++) {
      if (leaders[r] && leaders[r - 1] && leaders[r] !== leaders[r - 1]) { changes++; lastChange = r; }
    }
    // With a carry, the diver who starts ahead is already "leading" at dive 0,
    // so a change on the first dive counts too.
    if (cumulative && nRounds) {
      const startTop = field.slice().sort((a, b) => b.carry - a.carry)[0];
      if (startTop && leaders[0] && leaders[0] !== startTop.id) { changes++; if (lastChange == null) lastChange = 0; }
    }
    const margin = field.length > 1 && field[0].total != null && field[1].total != null
      ? Math.abs(field[0].total - field[1].total) : null;
    return { divers, nRounds, leader, leaders, changes, lastChange, margin,
             cumulative, startLeader, checked, agree, nonDisplacing, field };
  }

  // Population read for one dive: percentile and points vs the median mark.
  function popRead(r) {
    if (!st.pop) return null;
    const p = st.pop.get(r.dive_number);
    if (!p || !ok(p.n, 'cell')) return null;
    const pct = window.AE.execPercentile(r._exec, p);
    const vsMed = (r.dd != null && p.p50_exec != null && r.score != null)
      ? r.score - 3 * r.dd * p.p50_exec : null;
    return { pop: p, pct, vsMed };
  }

  const tintOf = (pct) => pct == null ? '' :
    pct >= 90 ? 't5' : pct >= 70 ? 't4' : pct >= 40 ? 't3' : pct >= 20 ? 't2' : 't1';

  /* ================= analysis ================= */

  function analysis() {
    const M = buildModel();
    if (!M.divers.length) return `<div class="ae-card"><div class="ae-empty">No divers on this sheet.</div></div>`;
    return verdict(M) + raceCard(M) + boardCard(M) + standoutsCard(M) + focusCard(M);
  }

  function verdict(M) {
    const w = (M.field && M.field[0]) || M.divers[0], ev = currentEvent();
    const runnerUp = M.field && M.field[1];
    const decided = M.lastChange != null
      ? `Dive ${M.lastChange + 1}`
      : (M.divers.length > 1 ? 'Wire to wire' : '—');
    const tiles = [
      ['Winner', esc(w.name), esc(w.team || '')],
      ['Margin', M.margin != null ? M.margin.toFixed(2) : '—', M.margin != null ? 'points over 2nd' : ''],
      ['Lead changes', M.changes, M.changes === 0 ? 'led from dive 1' : 'times the lead moved'],
      ['Decided', decided, M.lastChange != null ? 'last change of leader' : 'leader never changed'],
      ['Field', (M.field || M.divers).length, `${M.nRounds} dives${M.nonDisplacing ? ` · ${M.nonDisplacing} non-displacing` : ''}`],
    ];
    const carryNote = M.cumulative
      ? `<div class="ae-vd-carry">Scored cumulatively — each diver carried a starting score into this round, so the totals here are the full official totals, not the sum of the dives on this sheet.</div>` : '';
    const checkNote = M.checked
      ? (M.agree === M.checked
          ? `<span class="ae-vd-ok">Replaying the dives reproduces the posted placings for all ${M.checked} divers.</span>`
          : `<span class="ae-vd-warn">Replaying the dives disagrees with the posted placings for ${M.checked - M.agree} of ${M.checked} divers. Places shown are the posted ones.</span>`)
      : `<span class="ae-vd-soft">No posted result on file for this stage; placings are derived from the dive sheet.</span>`;
    const sentence = (M.field || M.divers).length < 2
      ? `${esc(w.name)} was the only diver on this sheet.`
      : M.changes === 0
        ? `<b>${esc(w.name)}</b> led from the first dive and won by <b>${M.margin != null ? M.margin.toFixed(2) : '—'}</b> over ${esc(runnerUp ? runnerUp.name : '')}.`
        : `<b>${esc(w.name)}</b> won by <b>${M.margin != null ? M.margin.toFixed(2) : '—'}</b> over ${esc(runnerUp ? runnerUp.name : '')}. The lead changed ${M.changes} time${M.changes === 1 ? '' : 's'}, for the last time on dive ${M.lastChange + 1}.`;
    return `<div class="ae-card ae-verdict">
      <div class="ae-vd-line">${sentence}</div>
      <div class="ae-vd-tiles">${tiles.map(([k, v, sub]) => `
        <div class="ae-vd-tile"><div class="ae-vd-k">${esc(k)}</div>
          <div class="ae-vd-v">${v}</div><div class="ae-vd-sub">${sub}</div></div>`).join('')}</div>
      ${carryNote}
      <div class="ae-vd-foot">${ev ? esc(ev.event_name || '') + ' — ' + esc(ev.round_stage) + ' · ' : ''}${checkNote}</div>
    </div>`;
  }

  /* ---- the race, in points behind the leader ---- */
  function raceCard(M) {
    return `<div class="ae-card">
      <div class="ae-card-h"><div>
        <h3>The race</h3>
        <p class="ae-soft">Points behind the leader after every dive. The top line is whoever led at that moment; distance below it is the real gap, which a rank chart cannot show. Click any diver to follow them.</p>
      </div></div>
      ${gapChart(M)}
      <div class="ae-legend ae-race-legend">${(M.field && M.field.length ? M.field : M.divers).slice(0, 24).map((d) => `
        <button class="ae-race-key ${st.focus === d.id ? 'on' : ''}" onclick="AEMeet.focus('${escJsAttr(d.id)}')">
          <i style="background:${colorFor(d, M)}"></i>${esc(d.name)}</button>`).join('')}
        ${(M.field || M.divers).length > 24 ? `<span class="ae-soft">24 of ${(M.field || M.divers).length} shown</span>` : ''}
      </div></div>`;
  }

  const PALETTE = ['#171F69', '#009AC7', '#C9A227', '#7A4FBF', '#2F8F5B', '#B85C1E', '#4A5578', '#0E7C9B'];
  function colorFor(d, M) {
    const list = (M.field && M.field.length ? M.field : M.divers);
    const i = list.indexOf(d);
    return i === 0 ? '#E31937' : PALETTE[(Math.max(i, 1) - 1) % PALETTE.length];
  }

  function gapChart(M) {
    const w = 940, padL = 54, padR = 210, padT = 26, padB = 34;
    const shown = (M.field && M.field.length ? M.field : M.divers).slice(0, 24);
    // Worst gap that still fits a readable scale; deep outliers are clamped
    // and marked rather than flattening everyone else into one band.
    const gaps = [];
    shown.forEach((d) => d.dives.forEach((r, i) => {
      if (r._run != null && M.leader[i] != null) gaps.push(M.leader[i] - r._run);
    }));
    if (!gaps.length) return `<div class="ae-empty">No running totals on this sheet.</div>`;
    const sorted = gaps.slice().sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    const maxGap = Math.max(10, Math.ceil(p95 / 10) * 10);
    if (M.cumulative && M.startLeader != null) {
      shown.forEach((d) => gaps.push(M.startLeader - d.carry));
    }
    const h = Math.max(300, 44 + shown.length * 13);
    // With a carry, the field is already spread out before a dive is taken —
    // column 0 is where they stood on the way in.
    const off = M.cumulative ? 1 : 0;
    const nCols = M.nRounds + off;
    const X = (r) => padL + (nCols <= 1 ? 0 : r / (nCols - 1)) * (w - padL - padR);
    const Y = (g) => padT + Math.min(1, g / maxGap) * (h - padT - padB);

    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img" aria-label="Points behind the leader by dive">`;
    // horizontal gridlines in points
    const step = maxGap <= 20 ? 5 : maxGap <= 60 ? 10 : maxGap <= 150 ? 25 : 50;
    for (let g = 0; g <= maxGap; g += step) {
      s += `<line x1="${padL}" y1="${Y(g).toFixed(1)}" x2="${w - padR}" y2="${Y(g).toFixed(1)}" stroke="${g === 0 ? '#171F69' : '#E4E7EF'}" stroke-width="${g === 0 ? 1.4 : 1}"/>`;
      s += `<text x="${padL - 8}" y="${(Y(g) + 4).toFixed(1)}" text-anchor="end" class="ae-tick">${g === 0 ? 'lead' : '−' + g}</text>`;
    }
    if (off) s += `<text x="${X(0).toFixed(1)}" y="${h - 10}" text-anchor="middle" class="ae-tick">start</text>`;
    for (let r = 0; r < M.nRounds; r++) {
      s += `<text x="${X(r + off).toFixed(1)}" y="${h - 10}" text-anchor="middle" class="ae-tick">${r + 1}</text>`;
    }
    s += `<text x="${padL - 8}" y="${padT - 12}" text-anchor="end" class="ae-axis-cap">pts</text>`;
    // decisive dive marker
    if (M.lastChange != null) {
      const mx = X(M.lastChange + off);
      s += `<line x1="${mx.toFixed(1)}" y1="${padT - 6}" x2="${mx.toFixed(1)}" y2="${h - padB}" stroke="#E31937" stroke-width="1.2" stroke-dasharray="4 3" opacity=".65"/>`
        + `<text x="${mx.toFixed(1)}" y="${padT - 12}" text-anchor="middle" class="ae-mark">lead changed</text>`;
    }

    const labels = [];
    const ordered = shown.slice().sort((a, b) => (a.id === st.focus ? 1 : 0) - (b.id === st.focus ? 1 : 0));
    ordered.forEach((d) => {
      const col = colorFor(d, M), on = st.focus === d.id, dim = st.focus && !on;
      const pts = [];
      if (off && M.startLeader != null) pts.push([X(0), Y(M.startLeader - d.carry), M.startLeader - d.carry, -1]);
      d.dives.forEach((r, i) => {
        if (r._run == null || M.leader[i] == null) return;
        pts.push([X(i + off), Y(M.leader[i] - r._run), M.leader[i] - r._run, i]);
      });
      if (!pts.length) return;
      if (pts.length > 1) {
        s += `<path d="M${pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L')}" fill="none" stroke="${col}" stroke-width="${on ? 3.2 : 1.8}" opacity="${dim ? 0.16 : on ? 1 : 0.62}" stroke-linejoin="round" stroke-linecap="round"/>`;
      }
      pts.forEach((p) => {
        const dv = p[3] >= 0 ? d.dives[p[3]] : null;
        const what = dv
          ? `dive ${p[3] + 1}: ${dv.dive_number || ''} ${dv.score != null ? dv.score.toFixed(2) : ''} · ${p[2] < 0.005 ? 'leading' : p[2].toFixed(2) + ' behind'} · place ${dv._place || '—'}`
          : `carried in ${d.carry.toFixed(2)} · ${p[2] < 0.005 ? 'leading' : p[2].toFixed(2) + ' behind'}`;
        s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${on ? 4.2 : 2.5}" fill="${col}" opacity="${dim ? 0.18 : on ? 1 : 0.7}"><title>${esc(d.name)} — ${what}</title></circle>`;
      });
      const last = pts[pts.length - 1];
      labels.push({ y: last[1], x: last[0], name: d.name, place: d.place, col, on, dim });
    });

    // Labels are placed by gap, so ties land on identical y. The old chart drew
    // them straight there and printed names on top of each other; these get
    // pushed apart to a legible minimum spacing.
    labels.sort((a, b) => a.y - b.y);
    const MIN = 13;
    for (let i = 1; i < labels.length; i++) {
      if (labels[i].y - labels[i - 1].y < MIN) labels[i].y = labels[i - 1].y + MIN;
    }
    const overflow = labels.length ? Math.max(0, labels[labels.length - 1].y - (h - 6)) : 0;
    if (overflow > 0) labels.forEach((l) => { l.y -= overflow; });
    labels.forEach((l) => {
      s += `<line x1="${(l.x + 3).toFixed(1)}" y1="${l.y.toFixed(1)}" x2="${(w - padR + 4).toFixed(1)}" y2="${l.y.toFixed(1)}" stroke="${l.col}" stroke-width=".8" opacity="${l.dim ? 0.12 : 0.3}"/>`
        + `<text x="${(w - padR + 9).toFixed(1)}" y="${(l.y + 4).toFixed(1)}" class="ae-bump-name" fill="${l.on ? l.col : '#3B4463'}" font-weight="${l.on ? 800 : 600}" opacity="${l.dim ? 0.3 : 1}">${l.place}. ${esc(l.name)}</text>`;
    });
    s += `</svg>`;
    return `<div class="ae-race-wrap">${s}</div>`;
  }

  /* ---- the board: every dive, read against its own population ---- */
  function boardCard(M) {
    const ev = currentEvent();
    const scopeLabel = (window.AE.SCOPES.find((x) => x.id === ((st.meet && st.meet.scope) || 'us-open')) || {}).label || 'all levels';
    const covered = st.pop ? st.pop.size : 0;
    const distinct = new Set(st.rows.map((r) => r.dive_number)).size;

    const head = `<tr><th class="ae-bd-rank">#</th><th>Diver</th>` +
      (M.cumulative ? `<th class="ae-bd-r">Start</th>` : '') +
      Array.from({ length: M.nRounds }, (_, i) => `<th class="ae-bd-r">Dive ${i + 1}</th>`).join('') +
      `<th class="num">Total</th></tr>`;

    const body = M.divers.map((d) => {
      const cells = Array.from({ length: M.nRounds }, (_, i) => {
        const r = d.dives[i];
        if (!r) return `<td class="ae-bd-cell empty"></td>`;
        const pr = popRead(r);
        const tint = tintOf(pr && pr.pct);
        const vo = r.optional_voluntary ? String(r.optional_voluntary)[0].toUpperCase() : '';
        const tip = [
          `${r.dive_number || ''} ${r.description || ''}`.trim(),
          r.dd != null ? `DD ${r.dd.toFixed(1)}` : null,
          r.score != null ? `${r.score.toFixed(2)} pts` : null,
          pr ? `${pr.pct}th percentile of ${pr.pop.n.toLocaleString()} recorded` : 'no population reference',
          pr && pr.vsMed != null ? `${pr.vsMed >= 0 ? '+' : ''}${pr.vsMed.toFixed(1)} vs typical` : null,
        ].filter(Boolean).join(' · ');
        return `<td class="ae-bd-cell ${tint}" title="${esc(tip)}">
          <span class="ae-bd-dive">${esc(r.dive_number || '—')}${vo ? `<i class="ae-bd-vo">${vo}</i>` : ''}</span>
          <span class="ae-bd-score">${r.score != null ? r.score.toFixed(2) : '—'}</span>
          ${pr ? `<span class="ae-bd-pct">${pr.pct}</span>` : ''}
        </td>`;
      }).join('');
      const start = M.cumulative
        ? `<td class="ae-bd-cell ae-bd-start"><span class="ae-bd-dive">carried in</span><span class="ae-bd-score">${d.carry.toFixed(2)}</span></td>`
        : '';
      return `<tr class="${st.focus === d.id ? 'on' : ''}" onclick="AEMeet.focus('${escJsAttr(d.id)}')">
        <td class="ae-bd-rank">${d.place != null ? d.place : '<span class="ae-nd" title="No official placing — non-displacing entry">ex</span>'}</td>
        <td class="ae-bd-name"><b>${esc(d.name)}</b><span>${esc(d.team || '')}</span></td>
        ${start}${cells}
        <td class="num ae-bd-total">${d.total != null ? d.total.toFixed(2) : '—'}</td></tr>`;
    }).join('');

    return `<div class="ae-card">
      <div class="ae-card-h"><div>
        <h3>The board</h3>
        <p class="ae-soft">Every dive in the event. The number in the corner of each cell is where that score sits in the history of that exact dive at this level — so a 62.05 reads as strong or weak against its own record rather than against nothing.</p>
      </div></div>
      <div class="ae-bd-legend">
        <span class="ae-bd-key t1"></span><span class="ae-bd-key t2"></span><span class="ae-bd-key t3"></span><span class="ae-bd-key t4"></span><span class="ae-bd-key t5"></span>
        <span class="ae-soft">weak for this dive → exceptional for this dive · <b>V</b> marks a voluntary</span>
      </div>
      <div class="table-wrap ae-bd-wrap"><table class="data-table ae-board">
        <thead>${head}</thead><tbody>${body}</tbody></table></div>
      <div class="ae-bd-note">Compared against <b>${esc(scopeLabel)}</b> dives, ${covered} of ${distinct} dive numbers in this event having at least ${GUARD.cell} recorded attempts. Cells with a thinner record than that are left untinted rather than given a percentile that cannot carry weight. Coaching context — coverage is not equal across athletes, so this is not a selection metric.</div>
    </div>`;
  }

  /* ---- standouts ---- */
  function standoutsCard(M) {
    const scored = [];
    M.divers.forEach((d) => d.dives.forEach((r, i) => {
      const pr = popRead(r);
      if (pr && pr.vsMed != null) scored.push({ d, r, i, ...pr });
    }));
    if (scored.length < 4) return '';
    scored.sort((a, b) => b.vsMed - a.vsMed);
    const best = scored.slice(0, 4), worst = scored.slice(-4).reverse();
    const row = (x) => `<button class="ae-so-row" onclick="AEMeet.focus('${escJsAttr(x.d.id)}')">
      <span class="ae-so-delta ${x.vsMed >= 0 ? 'up' : 'dn'}">${x.vsMed >= 0 ? '+' : ''}${x.vsMed.toFixed(1)}</span>
      <span class="ae-so-main"><b>${esc(x.d.name)}</b>
        <span>dive ${x.i + 1} · ${esc(x.r.dive_number || '')} · ${x.r.score != null ? x.r.score.toFixed(2) : '—'} · ${x.pct}th pct</span></span></button>`;
    return `<div class="ae-card">
      <div class="ae-card-h"><div>
        <h3>Standouts</h3>
        <p class="ae-soft">The dives furthest from what that dive normally scores at this level, in points. This is the difficulty-neutral read on who actually outperformed — a big number here is execution, not a harder list.</p>
      </div></div>
      <div class="ae-so-grid">
        <div><div class="ae-so-h">Most points over expectation</div>${best.map(row).join('')}</div>
        <div><div class="ae-so-h">Most points lost</div>${worst.map(row).join('')}</div>
      </div></div>`;
  }

  /* ---- focused diver detail ---- */
  function focusCard(M) {
    if (!st.focus) return '';
    const d = M.divers.find((x) => x.id === st.focus);
    if (!d) return '';
    return `<div class="ae-card">
      <div class="ae-card-h"><div><h3>${esc(d.name)} — dive by dive</h3>
        <p class="ae-soft">${esc(d.team || '')}${d.listDD ? ` · list DD ${d.listDD.toFixed(1)}` : ''} · ${d.place != null ? 'finished ' + d.place + ' of ' + (M.field || M.divers).length : 'no official placing — non-displacing entry'}</p></div></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>#</th><th>Dive</th><th class="num">DD</th><th class="num">Score</th>
          <th class="num">Typical</th><th class="num">vs typical</th><th class="num">Pct</th>
          <th class="num">Running</th><th class="num">Place</th><th class="num">Behind</th></tr></thead>
        <tbody>${(M.cumulative ? `<tr class="ae-fc-start"><td>—</td><td><b>Carried in</b> <span class="ae-soft">prelim score brought into this round</span></td>
            <td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td>
            <td class="num">${d.carry.toFixed(2)}</td><td class="num">—</td>
            <td class="num">${M.startLeader != null ? (M.startLeader - d.carry < 0.005 ? 'led' : (M.startLeader - d.carry).toFixed(2)) : '—'}</td></tr>` : '')}
          ${d.dives.map((r, i) => {
          const pr = popRead(r);
          const behind = r._run != null && M.leader[i] != null ? M.leader[i] - r._run : null;
          const typical = pr && pr.pop.p50_exec != null && r.dd != null ? 3 * r.dd * pr.pop.p50_exec : null;
          return `<tr><td>${i + 1}</td>
            <td><b>${esc(r.dive_number || '—')}</b> <span class="ae-soft">${esc(r.description || r.height || '')}</span></td>
            <td class="num">${r.dd != null ? r.dd.toFixed(1) : '—'}</td>
            <td class="num">${r.score != null ? r.score.toFixed(2) : '—'}</td>
            <td class="num ae-soft">${typical != null ? typical.toFixed(1) : '—'}</td>
            <td class="num ${pr && pr.vsMed != null ? (pr.vsMed >= 0 ? 'ae-up' : 'ae-dn') : ''}">${pr && pr.vsMed != null ? (pr.vsMed >= 0 ? '+' : '') + pr.vsMed.toFixed(1) : '—'}</td>
            <td class="num">${pr ? pr.pct : '—'}</td>
            <td class="num">${r._run != null ? r._run.toFixed(2) : '—'}</td>
            <td class="num">${r._place || '—'}</td>
            <td class="num">${behind == null ? '—' : behind < 0.005 ? 'led' : behind.toFixed(2)}</td></tr>`;
        }).join('')}</tbody></table></div></div>`;
  }

  /* ================= api ================= */

  window.AEMeet = {
    render,
    // select() only sets state; open() also repaints. The global search needs
    // the first form, because it switches view straight afterwards and a
    // repaint here would render whichever view you were on beforehand.
    select(id) {
      st.meetId = id; st.meet = null; st.events = null;
      st.eventKey = null; st.rows = null; st.pop = null; st.official = null; st.focus = null;
    },
    open(id) { this.select(id); window.AEApp.rerender(); },
    back() {
      st.meetId = null; st.meet = null; st.events = null;
      st.eventKey = null; st.rows = null; st.pop = null; st.official = null; st.focus = null;
      window.AEApp.rerender();
    },
    year(y) { st.finder.year = y; paintYears(); runFinder(); },
    setEvent(k) { st.eventKey = k; st.rows = null; st.pop = null; st.official = null; st.focus = null; window.AEApp.rerender(); },
    focus(id) { st.focus = st.focus === id ? null : id; window.AEApp.rerender(); },
    st,
  };
})();
