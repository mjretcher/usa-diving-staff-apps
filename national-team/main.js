/* ============================================================
   National Team — USA Diving Staff
   Applies the published USA Diving National Team Selection Criteria
   (FINAL 2025) to official results. A check against the High Performance
   department's roster, not the roster itself.

   Rules encoded (and nothing else):
     Automatic, individual   1st-4th in an individual Olympic event (3m, 10m)
                             at USA Diving Nationals or Winter Nationals.
     Automatic, synchro      1st-place team in an Olympic synchro event, plus
                             any team whose finals score is within 3% of the
                             winner's.
     Consistent performance  5th-7th in the SAME individual Olympic event at
                             two separate meets inside the rolling four-meet
                             window that starts with 2025 Winter Nationals.
     Term                    one year from the last qualifying result: to the
                             end of the next year's same meet.
   Not encoded, because the data cannot show it: membership / SafeSport /
   Code of Conduct standing, eligibility to represent the USA, and the HPS
   transition groups. Those are listed on the page as things to confirm.

   Placements come from core.result_phases (final round, official place).
   Finalists the meet did not place (typically non-U.S. athletes) are listed
   separately and never counted.
   ============================================================ */
(function () {
'use strict';

const $ = (id) => document.getElementById(id);
function nq(sql, params) { return window.NEON.query(sql, (params || []).map(String)); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const num = (v) => (v === null || v === undefined || v === '') ? null : Number(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const ord = (n) => n + (['th','st','nd','rd'][(n % 100 >= 11 && n % 100 <= 13) ? 0 : Math.min(n % 10, 4) % 4] || 'th');

// The rolling four-meet window named in the criteria. `id` is the DiveMeets
// meet id once the meet has been held and loaded; null until then.
const SEQUENCE = [
  { id: '12068', name: '2025 Winter Nationals', short: "'25 Winter", kind: 'W', year: 2025, held: true },
  { id: '12925', name: '2026 Nationals',        short: "'26 Nationals", kind: 'N', year: 2026, held: true },
  { id: null,    name: '2026 Winter Nationals', short: "'26 Winter", kind: 'W', year: 2026, held: false },
  { id: null,    name: '2027 Nationals',        short: "'27 Nationals", kind: 'N', year: 2027, held: false },
];
const KIND_NAME = { W: 'Winter Nationals', N: 'Nationals' };
const EVENTS = [
  { gender: 'Female', discipline: '3m', label: "Women's 3m" },
  { gender: 'Female', discipline: 'Platform', label: "Women's 10m" },
  { gender: 'Male', discipline: '3m', label: "Men's 3m" },
  { gender: 'Male', discipline: 'Platform', label: "Men's 10m" },
];
const SYNC_EVENTS = [
  { gender: 'Female', discipline: 'Synchronized 3m', label: "Women's 3m synchro" },
  { gender: 'Female', discipline: 'Synchronized Platform', label: "Women's 10m synchro" },
  { gender: 'Male', discipline: 'Synchronized 3m', label: "Men's 3m synchro" },
  { gender: 'Male', discipline: 'Synchronized Platform', label: "Men's 10m synchro" },
];
const evKey = (g, d) => g + '|' + d;
const EV_LABEL = Object.fromEntries([...EVENTS, ...SYNC_EVENTS].map(e => [evKey(e.gender, e.discipline), e.label]));
const SYNC_PCT = 0.97;   // "within 3% of the winning team's finals score"

const state = { rows: [], model: null, filter: '', view: 'roster' };

/* ── Data ─────────────────────────────────────────────────── */
async function loadRows() {
  const ids = SEQUENCE.filter(m => m.id).map(m => `'${m.id}'`).join(',');
  const r = await nq(
    `SELECT meet_id, event_id, gender, discipline, round_stage, place, diver_id::text AS diver_id, diver_name, team_name,
            posted_score, phase_score_from_dives, phase_dive_count, is_synchronized,
            diver2_id::text AS diver2_id, diver2_name, team2_name
       FROM core.result_phases
      WHERE meet_id IN (${ids})
        AND gender IN ('Female','Male')
        AND discipline IN ('3m','Platform','Synchronized 3m','Synchronized Platform')
        AND event_level IN ('Senior','Senior/Open')`);
  return r.rows.map(x => ({
    meet: String(x.meet_id), gender: x.gender, discipline: x.discipline, round: x.round_stage,
    place: num(x.place), id: String(x.diver_id), name: x.diver_name, team: x.team_name || '',
    posted: num(x.posted_score), list: num(x.phase_score_from_dives), nd: num(x.phase_dive_count),
    sync: x.is_synchronized === true || x.is_synchronized === 't' || /^Synchro/.test(x.discipline),
    id2: x.diver2_id ? String(x.diver2_id) : null, name2: x.diver2_name || null, team2: x.team2_name || '',
  }));
}

/* ── Rules ────────────────────────────────────────────────── */
// Expiry: the conclusion of the following year's same meet.
function expiryOf(meetIdx) {
  const m = SEQUENCE[meetIdx];
  const nextIdx = SEQUENCE.findIndex(s => s.kind === m.kind && s.year === m.year + 1);
  return { name: `${m.year + 1} ${KIND_NAME[m.kind]}`, idx: nextIdx, order: (m.year + 1) * 2 + (m.kind === 'W' ? 1 : 0) };
}

function buildModel(rows) {
  const meetIdx = Object.fromEntries(SEQUENCE.map((m, i) => [m.id, i]).filter(([k]) => k));
  const athletes = new Map();          // id -> { id, name, team, quals: [], banked: [] }
  const A = (id, name, team) => {
    if (!athletes.has(id)) athletes.set(id, { id, name, team, quals: [], results: [] });
    const a = athletes.get(id); if (!a.team && team) a.team = team; return a;
  };
  const grid = [];                     // per meet x individual event: placed finalists 1-7
  const unplaced = [];                 // finalists the meet did not place
  const notes = { partnersMissing: [] };

  // ── individual finals ──
  for (const ev of EVENTS) {
    for (const m of SEQUENCE) {
      if (!m.id) continue;
      const fin = rows.filter(r => r.meet === m.id && !r.sync && r.gender === ev.gender && r.discipline === ev.discipline && r.round === 'Final');
      const best = new Map();
      for (const r of fin) {
        if (!isNum(r.place) || r.place < 1) { unplaced.push({ ...r, meetName: m.name, event: ev.label }); continue; }
        const cur = best.get(r.id); if (!cur || r.place < cur.place) best.set(r.id, r);
      }
      const placed = [...best.values()].sort((a, b) => a.place - b.place);
      grid.push({ meet: m, ev, placed: placed.filter(r => r.place <= 7), finalists: placed.length });
      for (const r of placed) {
        if (r.place > 7) continue;
        const a = A(r.id, r.name, r.team);
        a.results.push({ ev: evKey(ev.gender, ev.discipline), label: ev.label, place: r.place, mi: meetIdx[m.id] });
        if (r.place <= 4) a.quals.push({ type: 'auto', mi: meetIdx[m.id], text: `${ord(r.place)} ${ev.label}`, place: r.place, ev: ev.label });
      }
    }
  }

  // ── consistent performance: two 5th-7th in the same event, inside one four-meet window ──
  const watch = [];
  for (const a of athletes.values()) {
    const byEv = new Map();
    for (const r of a.results) if (r.place >= 5 && r.place <= 7) { if (!byEv.has(r.ev)) byEv.set(r.ev, []); byEv.get(r.ev).push(r); }
    for (const [, list] of byEv) {
      list.sort((x, y) => x.mi - y.mi);
      const distinct = list.filter((r, i) => i === 0 || r.mi !== list[i - 1].mi);
      let done = false;
      for (let i = 1; i < distinct.length; i++) {
        if (distinct[i].mi - distinct[i - 1].mi <= 3) {
          a.quals.push({ type: 'consistent', mi: distinct[i].mi, ev: distinct[i].label,
            text: `${ord(distinct[i - 1].place)} and ${ord(distinct[i].place)} ${distinct[i].label}`,
            detail: `${ord(distinct[i - 1].place)} at ${SEQUENCE[distinct[i - 1].mi].name}, ${ord(distinct[i].place)} at ${SEQUENCE[distinct[i].mi].name}` });
          done = true;
        }
      }
      if (!done) {
        const last = distinct[distinct.length - 1];
        // meets still to come that fall inside a four-meet window containing the banked result
        const open = SEQUENCE.map((s, i) => ({ s, i })).filter(({ s, i }) => !s.held && i > last.mi && i - last.mi <= 3).map(({ s }) => s.name);
        watch.push({ a, banked: last, open });
      }
    }
  }

  // ── synchro finals ──
  const synchro = [];
  for (const ev of SYNC_EVENTS) {
    for (const m of SEQUENCE) {
      if (!m.id) continue;
      const all = rows.filter(r => r.meet === m.id && r.sync && r.gender === ev.gender && r.discipline === ev.discipline);
      const fin = all.filter(r => r.round === 'Final' && isNum(r.place) && r.place >= 1);
      if (!fin.length) continue;
      const teams = fin.map(r => {
        const pre = all.find(p => p.round !== 'Final' && p.id === r.id && (p.id2 || '') === (r.id2 || ''));
        // final-round list score: from the dives when present, otherwise cumulative minus preliminary
        const list = (isNum(r.list) && isNum(r.nd) && r.nd > 0 && Math.abs(r.list - r.posted) > 0.01) ? r.list
                   : (pre && isNum(pre.posted) && isNum(r.posted)) ? +(r.posted - pre.posted).toFixed(2) : null;
        return { ...r, finalList: list };
      }).sort((a, b) => a.place - b.place);
      const win = teams[0];
      for (const t of teams) {
        t.pctTotal = (isNum(t.posted) && isNum(win.posted) && win.posted > 0) ? t.posted / win.posted : null;
        t.pctList = (isNum(t.finalList) && isNum(win.finalList) && win.finalList > 0) ? t.finalList / win.finalList : null;
        const byTotal = t.place > 1 && isNum(t.pctTotal) && t.pctTotal >= SYNC_PCT;
        const byList = t.place > 1 && isNum(t.pctList) && t.pctList >= SYNC_PCT;
        t.status = t.place === 1 ? 'win' : (byTotal && byList) ? 'add' : (byTotal || byList) ? 'reading' : 'no';
        if (t.status === 'win' || t.status === 'add') {
          const type = t.status === 'win' ? 'synchro' : 'synchro3';
          const text = t.status === 'win' ? `1st ${ev.label}` : `Within 3% of the winner, ${ev.label}`;
          A(t.id, t.name, t.team).quals.push({ type, mi: meetIdx[m.id], text, ev: ev.label, partner: t.name2 });
          if (t.id2) A(t.id2, t.name2, t.team2).quals.push({ type, mi: meetIdx[m.id], text, ev: ev.label, partner: t.name });
          else notes.partnersMissing.push({ meet: m.name, event: ev.label, named: t.name, place: t.place });
        }
      }
      synchro.push({ meet: m, ev, teams });
    }
  }

  // ── members and terms ──
  const members = [];
  for (const a of athletes.values()) {
    if (!a.quals.length) continue;
    a.quals.sort((x, y) => x.mi - y.mi);
    const last = a.quals[a.quals.length - 1];
    const exp = a.quals.map(q => expiryOf(q.mi)).sort((x, y) => y.order - x.order)[0];
    a.expiry = exp; a.since = SEQUENCE[a.quals[0].mi].name; a.lastQual = SEQUENCE[last.mi].name;
    a.paths = [...new Set(a.quals.map(q => q.type === 'auto' ? 'Automatic' : q.type === 'consistent' ? 'Consistent' : q.type === 'synchro' ? 'Synchro winner' : 'Synchro 3%'))];
    members.push(a);
  }
  members.sort((x, y) => x.name.localeCompare(y.name));
  const nextMeet = SEQUENCE.find(s => !s.held);
  const expiring = nextMeet ? members.filter(a => a.expiry.name === nextMeet.name) : [];
  const oneAway = watch.filter(w => w.open.length).sort((x, y) => x.a.name.localeCompare(y.a.name));
  return { members, expiring, oneAway, grid, synchro, unplaced, notes, nextMeet, athletes };
}

/* ── Render ───────────────────────────────────────────────── */
const badge = (t) => `<span class="hp-badge ${t === 'Automatic' ? 'good' : t === 'Consistent' ? 'info' : t === 'Synchro winner' ? 'navy' : 'warn'}">${esc(t)}</span>`;
const link = (a) => `<a class="nt-link" href="../athlete-evaluation/#view=passport&a=${encodeURIComponent(a.id)}">${esc(a.name)}</a>`;

function renderKpis(M) {
  $('ntKpiMembers').textContent = M.members.length;
  $('ntKpiExpiring').textContent = M.expiring.length;
  $('ntKpiExpiringFoot').textContent = M.nextMeet ? `term ends at the ${M.nextMeet.name} unless they qualify again there` : 'no upcoming meet in the window';
  $('ntKpiOneAway').textContent = M.oneAway.length;
  $('ntKpiAuto').textContent = M.members.filter(a => a.paths.includes('Automatic')).length;
  $('ntTopMembers').textContent = M.members.length;
  $('ntTopMeets').textContent = SEQUENCE.filter(s => s.held).length + ' of ' + SEQUENCE.length;
}

function renderRoster(M) {
  const f = state.filter.trim().toLowerCase();
  const list = M.members.filter(a => !f || a.name.toLowerCase().includes(f) || (a.team || '').toLowerCase().includes(f));
  $('ntRosterCount').textContent = `${list.length} of ${M.members.length} athletes`;
  $('ntRosterBody').innerHTML = list.map(a => `<tr>
      <td class="c-name">${link(a)}<span class="c-sub">${esc(a.team)}</span></td>
      <td>${a.paths.map(badge).join(' ')}</td>
      <td class="c-how">${a.quals.map(q => `<div>${esc(q.text)}${q.partner ? ` <span class="nt-soft">with ${esc(q.partner)}</span>` : ''} <span class="nt-soft">· ${esc(SEQUENCE[q.mi].short)}</span></div>`).join('')}</td>
      <td class="c-through"><b>${esc(a.expiry.name)}</b>${M.nextMeet && a.expiry.name === M.nextMeet.name ? ' <span class="hp-badge warn">next meet</span>' : ''}</td>
    </tr>`).join('') || `<tr><td colspan="4" class="nt-empty">No athlete matches that filter.</td></tr>`;
}

function renderWatch(M) {
  const next = M.nextMeet ? M.nextMeet.name : 'the next meet';
  $('ntWatchSub').textContent = `What has to happen at the ${next} for each athlete whose status is in play there.`;
  const banked = new Map(M.oneAway.map(w => [w.a.id, w]));
  const exp = M.expiring.map(a => {
    const b = banked.get(a.id);
    return `<tr><td class="c-name">${link(a)}<span class="c-sub">${esc(a.team)}</span></td>
      <td>${a.quals.map(q => esc(q.text)).join('; ')} <span class="nt-soft">· ${esc(a.lastQual)}</span></td>
      <td>Top 4 in an individual Olympic event, or win a synchro Olympic event${b ? `, or 5th to 7th in ${esc(b.banked.label)} (one already banked at ${esc(SEQUENCE[b.banked.mi].name)})` : ''}.</td></tr>`;
  }).join('');
  const one = M.oneAway.filter(w => !M.members.some(a => a.id === w.a.id)).map(w => `<tr>
      <td class="c-name">${link(w.a)}<span class="c-sub">${esc(w.a.team)}</span></td>
      <td>${ord(w.banked.place)} ${esc(w.banked.label)} <span class="nt-soft">· ${esc(SEQUENCE[w.banked.mi].name)}</span></td>
      <td>5th to 7th in ${esc(w.banked.label)} again at ${w.open.map(esc).join(' or ')}. Top 4 qualifies outright.</td></tr>`).join('');
  $('ntWatchBody').innerHTML = `
    <h3 class="nt-h3">Members whose term ends at the ${esc(next)} <span class="nt-count">${M.expiring.length}</span></h3>
    <div class="table-wrap"><table class="data-table nt-table"><thead><tr><th>Athlete</th><th>Qualified by</th><th>To stay on the team</th></tr></thead>
      <tbody>${exp || '<tr><td colspan="3" class="nt-empty">None.</td></tr>'}</tbody></table></div>
    <h3 class="nt-h3">Not on the team, one result away <span class="nt-count">${M.oneAway.filter(w => !M.members.some(a => a.id === w.a.id)).length}</span></h3>
    <div class="table-wrap"><table class="data-table nt-table"><thead><tr><th>Athlete</th><th>Banked</th><th>To qualify</th></tr></thead>
      <tbody>${one || '<tr><td colspan="3" class="nt-empty">None.</td></tr>'}</tbody></table></div>`;
}

function renderGrid(M) {
  const held = SEQUENCE.filter(s => s.held);
  $('ntGridBody').innerHTML = EVENTS.map(ev => `
    <div class="nt-ev">
      <h3 class="nt-h3">${esc(ev.label)}</h3>
      <div class="nt-ev-cols" style="--cols:${held.length}">${held.map(m => {
        const g = M.grid.find(x => x.meet.id === m.id && x.ev === ev);
        return `<div class="nt-ev-col"><div class="nt-ev-meet">${esc(m.name)}</div>
          ${(g ? g.placed : []).map(r => `<div class="nt-place ${r.place <= 4 ? 'is-auto' : 'is-cons'}"><b>${r.place}</b><span>${esc(r.name)}</span></div>`).join('') || '<div class="nt-empty">No final on file.</div>'}</div>`;
      }).join('')}</div>
    </div>`).join('');
}

function renderSynchro(M) {
  const pct = (v) => isNum(v) ? (v * 100).toFixed(1) + '%' : '—';
  $('ntSyncBody').innerHTML = M.synchro.map(s => `
    <div class="nt-sync"><h3 class="nt-h3">${esc(s.ev.label)} <span class="nt-soft">· ${esc(s.meet.name)}</span></h3>
    <div class="table-wrap"><table class="data-table nt-table"><thead><tr><th class="num">Place</th><th>Team</th><th class="num">Meet total</th><th class="num">% of winner</th><th class="num">Final list</th><th class="num">% of winner</th><th>Result</th></tr></thead>
    <tbody>${s.teams.map(t => `<tr>
      <td class="num">${t.place}</td><td>${esc(t.name)}${t.name2 ? ' / ' + esc(t.name2) : ' <span class="hp-badge flag">partner not on file</span>'}</td>
      <td class="num">${isNum(t.posted) ? t.posted.toFixed(2) : '—'}</td><td class="num">${t.place === 1 ? '' : pct(t.pctTotal)}</td>
      <td class="num">${isNum(t.finalList) ? t.finalList.toFixed(2) : '—'}</td><td class="num">${t.place === 1 ? '' : pct(t.pctList)}</td>
      <td>${t.status === 'win' ? '<span class="hp-badge navy">Qualifies, 1st</span>' : t.status === 'add' ? '<span class="hp-badge good">Qualifies, within 3%</span>' : t.status === 'reading' ? '<span class="hp-badge warn">Depends on reading</span>' : '<span class="nt-soft">outside 3%</span>'}</td></tr>`).join('')}</tbody></table></div></div>`).join('') || '<div class="nt-empty">No synchro finals on file.</div>';
}

function renderNotes(M) {
  const items = [];
  if (M.notes.partnersMissing.length) items.push(`<li><b>${M.notes.partnersMissing.length} synchro partner${M.notes.partnersMissing.length === 1 ? ' is' : 's are'} missing from this list.</b> The 2025 Winter Nationals results on file name only one diver per team, so the partner of ${M.notes.partnersMissing.map(p => `${esc(p.named)} (${esc(p.event)})`).join(', ')} qualified but cannot be shown unless they also qualified another way.</li>`);
  if (M.unplaced.length) items.push(`<li><b>${M.unplaced.length} finalist${M.unplaced.length === 1 ? ' was' : 's were'} not given a place</b> in the official results and ${M.unplaced.length === 1 ? 'is' : 'are'} not counted: ${M.unplaced.map(u => `${esc(u.name)} (${esc(u.event)}, ${esc(u.meetName)})`).join('; ')}. This is how the meet handled athletes not eligible to place, which is the citizenship bypass in the criteria. Confirm that reading.</li>`);
  if (M.synchro.some(s => s.teams.some(t => t.status === 'reading'))) items.push(`<li><b>The 3% synchro rule gives two answers for at least one team</b> depending on whether "finals score" means the final-round list or the meet total. Those teams are marked and not counted until the reading is confirmed.</li>`);
  items.push(`<li><b>Not checked here:</b> membership, SafeSport, Code of Conduct and National Team Agreement standing; eligibility to represent the United States; and the three HPS transition groups, whose lists are not on file. 1-meter is not an Olympic event and earns no status.</li>`);
  items.push(`<li><b>Pre-qualified entry:</b> everyone on this list is pre-qualified to enter Nationals and Winter Nationals in the events of their choice while their term runs. Use the download to check DiveMeets' pre-qualified list.</li>`);
  $('ntNotesBody').innerHTML = `<ul class="nt-notes">${items.join('')}</ul>`;
}

function renderAll() {
  const M = state.model; if (!M) return;
  renderKpis(M); renderRoster(M); renderWatch(M); renderGrid(M); renderSynchro(M); renderNotes(M);
}

function downloadCsv() {
  const M = state.model; if (!M) return;
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const lines = [['Athlete', 'DiveMeets ID', 'Club', 'Pathway', 'Qualified by', 'Last qualifying meet', 'Valid through'].map(q).join(',')];
  for (const a of M.members) lines.push([a.name, a.id, a.team, a.paths.join('; '), a.quals.map(x => `${x.text} (${SEQUENCE[x.mi].name})`).join('; '), a.lastQual, a.expiry.name].map(q).join(','));
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
  const aEl = document.createElement('a'); aEl.href = URL.createObjectURL(blob); aEl.download = 'national-team-check.csv'; aEl.click();
  setTimeout(() => URL.revokeObjectURL(aEl.href), 2000);
}

function setView(v) {
  state.view = v;
  document.querySelectorAll('#ntViews .hp-tab').forEach(b => { const on = b.dataset.view === v; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  document.querySelectorAll('.nt-view').forEach(s => { s.hidden = s.dataset.view !== v; });
  try { history.replaceState(null, '', '#view=' + v); } catch (e) { /* ignore */ }
}

async function boot() {
  document.querySelectorAll('#ntViews .hp-tab').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  $('ntFilter').addEventListener('input', (e) => { state.filter = e.target.value; renderRoster(state.model); });
  $('ntCsv').addEventListener('click', downloadCsv);
  const m = /view=(\w+)/.exec(location.hash); if (m && document.querySelector(`.nt-view[data-view="${m[1]}"]`)) state.view = m[1];
  try {
    state.rows = await loadRows();
    state.model = buildModel(state.rows);
    $('ntLoading').hidden = true; $('ntMain').hidden = false;
    renderAll(); setView(state.view);
  } catch (err) {
    $('ntLoading').innerHTML = `<div class="nt-empty">Could not read the results: ${esc(err.message || err)}</div>`;
  }
}
window.__NT_TEST__ = { buildModel, state, SEQUENCE };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
