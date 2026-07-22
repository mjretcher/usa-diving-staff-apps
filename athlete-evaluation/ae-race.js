/* ============================================================
   ae-race.js — Race Replay: replay any scraped event dive by dive.
   Uses running_total_points + round_place from core.dive_sheets.
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr, num } = window.AE;
  const C = window.AECharts;
  const PALETTE = ['#171F69', '#E31937', '#009AC7', '#C9A227', '#5A6072', '#7A4FBF', '#2F8F5B', '#B85C1E'];

  const st = { meets: null, meetId: null, events: null, eventKey: null, rows: null, hi: null };

  async function render(root) {
    if (!st.meets) {
      root.innerHTML = `<div class="ae-card"><div class="ae-empty">Loading meets with dive-level data…</div></div>`;
      st.meets = await window.AE.sheetMeets();
      if (!st.meetId && st.meets.length) st.meetId = st.meets[0].meet_id;
    }
    if (st.meetId && !st.events) {
      st.events = await window.AE.meetEvents(st.meetId);
      const finals = st.events.filter((e) => e.round_stage === 'Final');
      const first = finals[0] || st.events[0];
      st.eventKey = first ? first.event_id + '|' + first.round_stage : null;
      st.rows = null;
    }
    if (st.eventKey && !st.rows) {
      const [eid, stage] = st.eventKey.split('|');
      st.rows = await window.AE.eventSheets(st.meetId, eid, stage);
    }

    const meet = st.meets.find((m) => m.meet_id === st.meetId);
    root.innerHTML = `
      <div class="ae-card">
        <div class="ae-card-h">
          <div><h3>Race Replay</h3>
          <p class="ae-soft">Any event, replayed dive by dive: who led, who moved, and exactly where it was won or lost. Click a line to focus a diver. New meets appear here automatically as the scraper lands them.</p></div>
        </div>
        <div class="ae-controls" style="margin-bottom:10px">
          <select class="ae-select" style="max-width:380px" onchange="AERace.setMeet(this.value)">
            ${st.meets.map((m) => `<option value="${esc(m.meet_id)}" ${m.meet_id === st.meetId ? 'selected' : ''}>${esc(m.meet_year)} · ${esc(m.meet_name || m.meet_id)} (${esc(m.n_events)} events)</option>`).join('')}
          </select>
          ${st.events ? `<select class="ae-select" style="max-width:340px" onchange="AERace.setEvent(this.value)">
            ${st.events.map((e) => { const k = e.event_id + '|' + e.round_stage; return `<option value="${esc(k)}" ${k === st.eventKey ? 'selected' : ''}>${esc(e.event_name)} — ${esc(e.round_stage)} (${esc(e.n_divers)})</option>`; }).join('')}
          </select>` : ''}
        </div>
        <div id="aeRaceChart">${st.rows ? raceChart() : '<div class="ae-empty">Loading…</div>'}</div>
        ${st.rows ? raceTable() : ''}
      </div>`;
  }

  function buildDivers() {
    const by = new Map();
    st.rows.forEach((r) => {
      if (!by.has(r.diver_id)) by.set(r.diver_id, { id: r.diver_id, name: r.diver_name, team: r.team_name, dives: [] });
      by.get(r.diver_id).dives.push(r);
    });
    const divers = [...by.values()];
    divers.forEach((d) => d.dives.sort((a, b) => a.dive_order - b.dive_order));
    const nRounds = Math.max(...divers.map((d) => d.dives.length));
    // Prefer scraped round_place; if absent for a round, derive from running totals.
    for (let r = 0; r < nRounds; r++) {
      const have = divers.filter((d) => d.dives[r]);
      const needDerive = have.some((d) => d.dives[r].round_place == null);
      if (needDerive) {
        const ranked = have.filter((d) => d.dives[r].running_total_points != null)
          .sort((a, b) => b.dives[r].running_total_points - a.dives[r].running_total_points);
        ranked.forEach((d, i) => { if (d.dives[r].round_place == null) d.dives[r].round_place = i + 1; });
      }
    }
    const final = (d) => { const last = d.dives[d.dives.length - 1]; return last && last.round_place != null ? last.round_place : 999; };
    divers.sort((a, b) => final(a) - final(b));
    return { divers, nRounds };
  }

  function raceChart() {
    const { divers, nRounds } = buildDivers();
    const shown = divers.slice(0, 18);
    const data = shown.map((d, i) => ({
      name: d.name,
      places: Array.from({ length: nRounds }, (_, r) => d.dives[r] ? d.dives[r].round_place : null),
      totals: Array.from({ length: nRounds }, (_, r) => d.dives[r] ? d.dives[r].running_total_points : null),
      color: PALETTE[i % PALETTE.length],
      hi: st.hi === d.id,
      id: d.id,
    }));
    const svg = C.bump(data, nRounds, { w: 900 });
    return `<div class="ae-race-wrap">${svg}</div>
      <div class="ae-legend ae-race-legend">${shown.map((d, i) => `<button class="ae-race-key ${st.hi === d.id ? 'on' : ''}" onclick="AERace.hi('${escJsAttr(d.id)}')"><i style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(d.name)}</button>`).join('')}
      ${divers.length > 18 ? `<span class="ae-soft">top 18 of ${divers.length} shown</span>` : ''}</div>`;
  }

  function raceTable() {
    if (!st.hi) return '';
    const { divers } = buildDivers();
    const d = divers.find((x) => x.id === st.hi);
    if (!d) return '';
    const leaderTotal = (r) => Math.max(...divers.map((x) => x.dives[r] && x.dives[r].running_total_points != null ? x.dives[r].running_total_points : -1));
    return `<div class="ae-card" style="margin-top:12px">
      <div class="ae-card-h"><div><h3>${esc(d.name)} — dive by dive</h3></div></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>#</th><th>Dive</th><th class="num">DD</th><th class="num">Award</th><th class="num">Running total</th><th class="num">Place</th><th class="num">Gap to leader</th></tr></thead>
        <tbody>${d.dives.map((r, i) => {
          const lt = leaderTotal(i);
          const gap = r.running_total_points != null && lt >= 0 ? r.running_total_points - lt : null;
          return `<tr><td>${r.dive_order}</td><td><b>${esc(r.dive_number)}</b> <span class="ae-soft">${esc(r.height || '')}</span></td>
            <td class="num">${r.dd != null ? r.dd.toFixed(1) : '—'}</td>
            <td class="num">${r.score != null ? r.score.toFixed(2) : '—'}</td>
            <td class="num">${r.running_total_points != null ? r.running_total_points.toFixed(2) : '—'}</td>
            <td class="num">${r.round_place != null ? r.round_place : '—'}</td>
            <td class="num">${gap == null ? '—' : gap >= 0 ? 'leader' : gap.toFixed(2)}</td></tr>`;
        }).join('')}</tbody>
      </table></div></div>`;
  }

  window.AERace = {
    render,
    setMeet(id) { st.meetId = id; st.events = null; st.eventKey = null; st.rows = null; st.hi = null; window.AEApp.rerender(); },
    setEvent(k) { st.eventKey = k; st.rows = null; st.hi = null; window.AEApp.rerender(); },
    hi(id) { st.hi = st.hi === id ? null : id; window.AEApp.rerender(); },
    st,
  };
})();
