/* USA Diving Membership Analytics — ma-reports.js
   ---------------------------------------------------------------------------
   Reporting layer for the Membership Analytics app, built to the same standard
   as the Junior Results Audit "Analytics & Reports" stage:

     • a scoped Report Builder — pick a template or hand-assemble sections,
       choose year(s), narrow the scope, generate a branded print/PDF document
     • deep Boundary Studio reporting — balance & equity metrics, per-region
       profiles, tier rollups, scenario-vs-scenario diffs, zip appendix
     • a shareable view URL so a colleague opens exactly what you were looking at

   Membership sections read live from Neon (membership.members,
   membership.sales_ledger, divemeets.meets). Boundary sections read the live
   Boundary Studio scenario through window.BoundaryAPI — never a stale copy —
   so a report always describes the map currently on screen.

   Categorization matches ma-app.js exactly (Athlete / Coach / Official / Other,
   competition-year age groups). Any change there must be mirrored here.
*/
(function(){
'use strict';

const NAVY='#171F69', RED='#E31937', POOL='#009AC7', SKY='#8FC3EA';
const ALL_YEARS = [2024, 2025, 2026];
const CUR_YEAR  = 2026;
const CATS = ['Athlete','Coach','Official','Other'];
const GROUP_ORDER = ['D','C','B','A','19+'];
const GROUP_LABEL = {D:'11 & under', C:'12–13', B:'14–15', A:'16–18', '19+':'19 & over'};

const fmt  = n => Number(n||0).toLocaleString('en-US');
/* Money, for the pathway's fee tables. */
const usd = n => '$' + Math.round(Number(n)||0).toLocaleString('en-US');

const fmt1 = n => (Number(n)||0).toFixed(1);
/* If shared/usad-keepplace.js is not loaded, every redraw silently goes back to
   throwing away your scroll position and open sections -- the exact bug it was
   written to stop, reintroduced by a missing script tag and invisible. Say so
   once. */
let _keepWarned = false;
function keepPlace(target){
  if (window.KeepPlace) return KeepPlace.capture(target);
  if (!_keepWarned){ _keepWarned = true;
    console.warn('shared/usad-keepplace.js is not loaded — this panel will lose your scroll position and open sections on every redraw.'); }
  return null;
}
function keepRestore(st, target){ if (window.KeepPlace) KeepPlace.restore(st, target); }

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sq(s){ return "'" + String(s==null?'':s).replace(/'/g,"''") + "'"; }
function pctS(a,b){ return b>0 ? (100*a/b).toFixed(1)+'%' : '—'; }

/* Signed delta cell — arrows only, never colour alone (accessibility). */
function delta(cur, prev){
  if (prev == null || prev === 0) return '<span class="mr-soft">—</span>';
  const d = cur - prev, p = (100*d/prev).toFixed(1);
  if (d > 0) return `<span class="mr-up">▲ +${fmt(d)} (+${p}%)</span>`;
  if (d < 0) return `<span class="mr-down">▼ ${fmt(d)} (${p}%)</span>`;
  return '<span class="mr-soft">▪ 0</span>';
}

/* ---------- shared SQL fragments (must match ma-app.js) ---------- */
const CAT_SQL = `CASE
  WHEN membership_type ILIKE '%Athlete%' THEN 'Athlete'
  WHEN membership_type ILIKE '%Coach%' THEN 'Coach'
  WHEN membership_type IN ('Volunteer/Official','Judge') THEN 'Official'
  ELSE 'Other' END`;
const GRP_SQL = `CASE
  WHEN membership_year - EXTRACT(YEAR FROM birth_date) <= 11 THEN 'D'
  WHEN membership_year - EXTRACT(YEAR FROM birth_date) <= 13 THEN 'C'
  WHEN membership_year - EXTRACT(YEAR FROM birth_date) <= 15 THEN 'B'
  WHEN membership_year - EXTRACT(YEAR FROM birth_date) <= 18 THEN 'A'
  ELSE '19+' END`;

function catPred(c, a){
  a = a || '';
  if (c === 'Athlete')  return `${a}membership_type ILIKE '%Athlete%'`;
  if (c === 'Coach')    return `${a}membership_type ILIKE '%Coach%'`;
  if (c === 'Official') return `${a}membership_type IN ('Volunteer/Official','Judge')`;
  return `NOT (${a}membership_type ILIKE '%Athlete%' OR ${a}membership_type ILIKE '%Coach%'
               OR ${a}membership_type IN ('Volunteer/Official','Judge'))`;
}

/* Scope predicates shared by every membership section. Years are handled
   separately by sections that pivot across years. */
function scopePreds(o, alias){
  const a = alias ? alias + '.' : '';
  const w = [];
  if (o.cats   && o.cats.length   && o.cats.length   < CATS.length)
    w.push('(' + o.cats.map(c => catPred(c, a)).join(' OR ') + ')');
  if (o.assocs && o.assocs.length)
    w.push(`COALESCE(${a}association,'(none)') IN (${o.assocs.map(sq).join(',')})`);
  if (o.states && o.states.length)
    w.push(`COALESCE(${a}state,'??') IN (${o.states.map(sq).join(',')})`);
  return w;
}
function scopeWhere(o, extra, alias){
  const w = scopePreds(o, alias).concat(extra || []);
  return w.length ? 'WHERE ' + w.join(' AND ') : '';
}
function scopeAnd(o, extra, alias){
  const w = scopePreds(o, alias).concat(extra || []);
  return w.length ? ' AND ' + w.join(' AND ') : '';
}
function scopeSummary(o){
  const p = [];
  if (o.cats && o.cats.length && o.cats.length < CATS.length) p.push(o.cats.join(' / '));
  if (o.assocs && o.assocs.length) p.push(o.assocs.length > 3 ? o.assocs.length+' associations' : o.assocs.join(', '));
  if (o.states && o.states.length) p.push(o.states.length > 6 ? o.states.length+' states' : o.states.join(', '));
  return p.length ? p.join(' · ') : 'All members, all associations';
}

async function q(sql){
  const r = await NEON.query(sql);
  return r.rows || [];
}

/* Build a {key: {year: value}} pivot. */
function pivot(rows, keyF, yearF, valF){
  const m = {};
  rows.forEach(r => { const k = keyF(r); (m[k] = m[k] || {})[yearF(r)] = Number(valF(r)) || 0; });
  return m;
}

/* Standard year-columns table used by most membership sections. */
function yearTable(opts){
  const {rowsMap, order, years, label, totalRow} = opts;
  const keys = order || Object.keys(rowsMap).sort();
  const last = years[years.length-1], prev = years[years.length-2];
  const totals = {}; years.forEach(y => totals[y] = 0);
  keys.forEach(k => years.forEach(y => totals[y] += (rowsMap[k]||{})[y] || 0));
  const body = keys.map(k => {
    const r = rowsMap[k] || {};
    return `<tr><td>${esc(opts.labelFn ? opts.labelFn(k) : k)}</td>` +
      years.map(y => `<td class="mr-num">${fmt(r[y]||0)}</td>`).join('') +
      (prev ? `<td>${delta(r[last]||0, r[prev]||0)}</td>` : '') +
      `<td class="mr-num">${pctS(r[last]||0, totals[last])}</td></tr>`;
  }).join('');
  const foot = totalRow === false ? '' :
    `<tr class="mr-total"><td>Total</td>` +
    years.map(y => `<td class="mr-num">${fmt(totals[y])}</td>`).join('') +
    (prev ? `<td>${delta(totals[last], totals[prev])}</td>` : '') +
    `<td class="mr-num">100%</td></tr>`;
  return `<table class="mr-table"><thead><tr><th scope="col">${esc(label)}</th>` +
    years.map(y => `<th scope="col" class="mr-num">${y}${y===CUR_YEAR?' YTD':''}</th>`).join('') +
    (prev ? `<th scope="col">Change ${prev}→${last}</th>` : '') +
    `<th scope="col" class="mr-num">Share ${last}</th></tr></thead><tbody>${body}${foot}</tbody></table>`;
}

/* Inline horizontal bar — used inside report tables so printed output still
   carries visual weight without depending on a chart library. */
function bar(v, max, color){
  const w = max > 0 ? Math.max(1, Math.round(100 * v / max)) : 0;
  return `<span class="mr-bar"><span class="mr-bar-f" style="width:${w}%;background:${color||POOL}"></span></span>`;
}

/* =====================================================================
   POTENTIAL-SCHEDULE RENDERING — shared by the "does each meet fit" report
   section. Turns one stop's ScenarioScheduleEngine.simulateStop() output
   (days -> sessions -> events) into a printable, session-by-session
   schedule, in the same board/warm-up/practice-time terms Boundary Studio's
   live Schedule tab uses, so the paper says what the screen says.
   ===================================================================== */
const SCHED_BOARD_DISPLAY = {'1m':'1-Meter', '3m':'3-Meter', 'Platform':'Platform',
                              'platform':'Platform', 'other':'Other'};

/* Minutes-since-midnight -> "8:05am". Mirrors hhmm() in boundary.js's live
   Schedule tab so a clock time in the report matches the clock time on
   screen. */
function hhmmSched(m){
  const h = Math.floor(m/60), mm = Math.round(m%60);
  const ap = h >= 12 ? 'pm' : 'am', h12 = ((h + 11) % 12) + 1;
  return h12 + ':' + String(mm).padStart(2,'0') + ap;
}

/* One line per event, inside a session's table -- entries and estimated run
   time, no clock times: this is a projection with no real date set, so a
   start/end time would be fabricated precision. Matches the fields the
   handout format actually needs to answer "how long does this take and for
   how many people," which is the whole point of laying it out. */
function schedEventRow(e){
  const QRr = window.QualRouting;
  const board = SCHED_BOARD_DISPLAY[e.discipline] || e.discipline;
  const round = QRr && QRr.ROUND_NAME && QRr.ROUND_NAME[e.round];
  const label = `${esc(e.group)} ${esc(e.gender)} ${esc(board)}` + (round ? ` &middot; ${esc(round)}` : '');
  const flags = [];
  if (!e.dives) flags.push('no dive count on record &mdash; not timed, will run longer than shown');
  if (e.split) flags.push(`split across two boards${e.splitManual ? ' (set by staff)' : ''}`);
  if (e.reviewSplit) flags.push('flagged for review &mdash; long, but the host decides whether to split it');
  return `<div class="mr-hd-ev">
    <span class="mr-hd-ev-name">${label}${flags.length ? `<span class="mr-hd-ev-flag">${flags.join('; ')}</span>` : ''}</span>
    <span class="mr-hd-ev-nums">${fmt(Math.round(e.divers))}<span class="n"> entries</span>
      &nbsp;&middot;&nbsp; ${e.dives ? fmt(e.estimatedMinutes) : '&mdash;'}<span class="n"> min</span></span>
  </div>`;
}

/* One session: which boards run it, the standard warm-up, and every event
   in it with its entries and run time. No clock times -- see the note on
   schedEventRow. Warm-up is shown at the standard 55 minutes used to plan a
   session regardless of which groups are in it; the day's actual pool-time
   math (whether everything fits, below) still uses the engine's real
   per-group warm-up, so the "Fits" verdict elsewhere in this report keeps
   agreeing with Boundary Studio's own Schedule tab. */
const STANDARD_WARMUP_MIN = 55;
function schedSessionCard(ss){
  const boardBits = Object.keys(ss.lanes||{})
    .map(L => `${esc(SCHED_BOARD_DISPLAY[L]||L)} ${Math.round(ss.lanes[L])} min`).join(' &middot; ');
  const saved = (ss.sequentialMinutes||0) - (ss.compMinutes||0);
  const evRows = (ss.events||[]).map(schedEventRow).join('');
  const compMin = (ss.events||[]).reduce((a,e) => a + (e.dives ? e.estimatedMinutes : 0), 0);
  return `<div class="mr-hd-sess">
    <div class="mr-hd-sess-h">
      <span class="mr-hd-sess-name">Session ${ss.index}</span>
      <span class="mr-hd-wu">Warm-up ${STANDARD_WARMUP_MIN} min</span>
      <span class="mr-soft">&middot; ${fmt(compMin)} min competition &middot; ${fmt(STANDARD_WARMUP_MIN + compMin)} min total</span>
    </div>
    ${boardBits ? `<p class="mr-hd-boards">${boardBits}${saved > 0
      ? ` &mdash; these boards run at the same time, ${saved} min shorter than running one after another`
      : ''}</p>` : ''}
    ${evRows}
  </div>`;
}

/* The open-practice-time sentence for one day, naming which gap (before the
   first session, between two named sessions, or after the last) each usable
   block sits in. windows[] is [before, between(1,2), between(2,3), ...,
   after] exactly as ScenarioScheduleEngine.layoutDay() returns it. */
function schedPracticeLine(windows, sessCount){
  const list = windows || [];
  const usable = list.filter(w => w.usable);
  if (!usable.length) return 'No usable open-practice window on this day &mdash; every gap between sessions is under the 60-minute floor that counts as real practice time.';
  const parts = list.map((w, i) => {
    if (!w.usable) return null;
    if (w.position === 'before') return `${w.minutes} min before session 1`;
    if (w.position === 'after') return `${w.minutes} min after session ${sessCount}`;
    return `${w.minutes} min between sessions ${i} and ${i+1}`;
  }).filter(Boolean);
  return 'Open practice time: ' + parts.join('; ') + '.';
}

/* One day, in the same visual family as Schedule Builder's own printed
   handout: a navy header bar, the red/white/blue accent stripe, and every
   session that day with its warm-up and events. No clock times -- see the
   note on schedEventRow for why. */
function schedDayCard(d, windowMin){
  const occupied = (d.sessions||[]).reduce((a,ss) => a + (ss.sessionEndMinutes - ss.warmupStartMinutes), 0);
  const sessCount = (d.sessions||[]).length;
  const sessCards = (d.sessions||[]).map(schedSessionCard).join('');
  return `<div class="mr-hd-day ${d.overCapacity ? 'over' : ''}">
    <div class="mr-hd-day-h">
      <span class="mr-hd-daynum">Day ${d.dayNumber}</span>
      <span class="mr-hd-pool">${(occupied/60).toFixed(1)}h of ${(windowMin/60).toFixed(1)}h pool time used</span>
    </div>
    <div class="mr-hd-accent"></div>
    <div class="mr-hd-body">
      ${d.overCapacity ? `<p class="mr-hd-day-warn">Runs ${d.overCapacityByMinutes} min past the assumed closing
          time on this layout &mdash; this day needs fewer entries, an earlier open, a later close, or a
          second day.</p>` : ''}
      ${(d.conflicts||[]).length ? `<p class="mr-hd-day-warn">Two events for the same age group and gender are
          placed on this day (${esc(d.conflicts.join(', '))}) &mdash; a person moved one here deliberately,
          and that placement is kept.</p>` : ''}
      ${sessCards || '<p class="mr-note">Nothing is scheduled on this day.</p>'}
      <p class="mr-sched-practice">${schedPracticeLine(d.practiceWindows, sessCount)}</p>
    </div>
  </div>`;
}

/* One stop, start to finish: header, headline status, and every day it
   would take to run under this pathway. */
function schedStopCard(x, windowMin){
  if (x.err) return `<div class="mr-sched-stop">
      <div class="mr-sched-stop-h"><span class="mr-sched-stop-name">${esc(x.name)}</span>
        <span class="mr-soft">${esc(x.level)}</span></div>
      <p class="mr-p mr-warn">This stop could not be laid out: ${esc(x.err)}</p>
    </div>`;
  const days = (x.sim && x.sim.days) || [];
  if (!days.length) return `<div class="mr-sched-stop">
      <div class="mr-sched-stop-h"><span class="mr-sched-stop-name">${esc(x.name)}</span>
        <span class="mr-soft">${esc(x.level)}</span></div>
      <p class="mr-p mr-warn">No events project onto this stop under the current pathway, so there is nothing
        to schedule.</p>
    </div>`;
  const status = x.daysOver
    ? `<span class="mr-over">${x.daysOver} of ${days.length} day${days.length===1?'':'s'} run past the
        assumed closing time</span>`
    : `<span class="mr-under">Every day fits inside the assumed pool hours</span>`;
  return `<div class="mr-sched-stop">
    <div class="mr-sched-stop-h">
      <span class="mr-sched-stop-name">${esc(x.name)}</span>
      <span class="mr-soft">${esc(x.level)}</span>
    </div>
    <div class="mr-sched-stop-kpis">
      <span>${fmt(Math.round(x.entries))} entries</span>
      <span>${fmt(x.events)} event${x.events===1?'':'s'}</span>
      <span>${days.length} day${days.length===1?'':'s'}</span>
      ${status}
    </div>
    ${x.unknown ? `<p class="mr-note mr-warn">${fmt(x.unknown)} event${x.unknown===1?' has':'s have'} no dive
      count on record and ${x.unknown===1?'is':'are'} timed here as zero minutes. This meet will run longer
      than the schedule below shows, until those events have a dive count.</p>` : ''}
    ${days.map(d => schedDayCard(d, windowMin)).join('')}
  </div>`;
}
/* =====================================================================
   SECTION REGISTRY — membership sections (live Neon)
   Each section: {label, desc, group, build(opts) -> HTML string}
   `opts` = {years, cats, assocs, states, topN}
   ===================================================================== */
const SECTIONS = {

  exec_summary: {
    label: 'Executive summary', group: 'Membership',
    desc: 'Headline totals, year-over-year movement, renewal position, and the same-period sales comparison.',
    async build(o){
      const yrs = o.years;
      const [tot, cat, ret, ledger] = await Promise.all([
        q(`SELECT membership_year y, count(DISTINCT member_id) n
             FROM membership.members ${scopeWhere(o)} GROUP BY 1 ORDER BY 1`),
        q(`SELECT membership_year y, ${CAT_SQL} cat, count(DISTINCT member_id) n
             FROM membership.members ${scopeWhere(o)} GROUP BY 1,2`),
        q(`SELECT 'renewed' k, count(DISTINCT a.member_id) n FROM membership.members a
             WHERE a.membership_year=2026 ${scopeAnd(o, [], 'a')}
               AND EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2025)
           UNION ALL SELECT 'lapsed', count(DISTINCT a.member_id) FROM membership.members a
             WHERE a.membership_year=2025 ${scopeAnd(o, [], 'a')}
               AND NOT EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2026)
           UNION ALL SELECT 'new', count(DISTINCT a.member_id) FROM membership.members a
             WHERE a.membership_year=2026 ${scopeAnd(o, [], 'a')}
               AND NOT EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2025)`),
        q(`SELECT year y,
                  sum(cnt) FILTER (WHERE item NOT IN ('Background Fee','Donations','Processing Fee','Sanction Fee')) n,
                  sum(cnt) FILTER (WHERE item LIKE '%Athlete%') ath
             FROM membership.sales_ledger GROUP BY 1 ORDER BY 1`),
      ]);
      const T = {}; tot.forEach(r => T[r.y] = +r.n);
      const C = pivot(cat, r=>r.cat, r=>r.y, r=>r.n);
      const R = {}; ret.forEach(r => R[r.k] = +r.n);
      const L = {}; ledger.forEach(r => L[r.y] = {n:+r.n, ath:+r.ath});
      const last = yrs[yrs.length-1], prev = yrs[yrs.length-2];
      const scoped = (o.cats && o.cats.length && o.cats.length < CATS.length) ||
                     (o.assocs && o.assocs.length) || (o.states && o.states.length);

      const kpis = [
        {v: fmt(T[last]||0), l: `${last} members${last===CUR_YEAR?' (year to date)':''}`,
         s: prev ? `${prev}: ${fmt(T[prev]||0)} · ${delta(T[last]||0, T[prev]||0)}` : ''},
        {v: fmt((C.Athlete||{})[last]||0), l: `${last} athletes`,
         s: prev ? `${prev}: ${fmt((C.Athlete||{})[prev]||0)} · ${delta((C.Athlete||{})[last]||0,(C.Athlete||{})[prev]||0)}` : ''},
        {v: fmt(R.renewed||0), l: '2025 members renewed for 2026',
         s: `${fmt(R.lapsed||0)} not yet renewed · ${fmt(R['new']||0)} brand new in 2026`},
        {v: fmt((C.Coach||{})[last]||0), l: `${last} coaches`,
         s: prev ? `${prev}: ${fmt((C.Coach||{})[prev]||0)} · ${delta((C.Coach||{})[last]||0,(C.Coach||{})[prev]||0)}` : ''},
      ];

      const ledgerBlock = (L[2026] && L[2025] && !scoped) ? `
        <h3 class="mr-h3">Same-period comparison — accounting sales ledger</h3>
        <p class="mr-p">The membership year opens 1 December, so raw 2026 totals are still filling in.
        The sales ledger is the honest like-for-like read: it covers December–June of each membership
        year and is net of refunds.</p>
        <table class="mr-table">
          <thead><tr><th scope="col">Dec–Jun, membership year</th><th scope="col" class="mr-num">2025</th><th scope="col" class="mr-num">2026</th><th scope="col">Change</th></tr></thead>
          <tbody>
            <tr><td>Memberships sold</td><td class="mr-num">${fmt(L[2025].n)}</td><td class="mr-num">${fmt(L[2026].n)}</td><td>${delta(L[2026].n, L[2025].n)}</td></tr>
            <tr><td>Athlete memberships</td><td class="mr-num">${fmt(L[2025].ath)}</td><td class="mr-num">${fmt(L[2026].ath)}</td><td>${delta(L[2026].ath, L[2025].ath)}</td></tr>
          </tbody>
        </table>
        <p class="mr-note"><b>Why this and not a "registered by today" figure:</b> Webpoint overwrites
        <code>start_date</code> with the member's current start date when they renew, so prior-year
        registration-pace baselines pulled from the roster export are not trustworthy. The sales ledger
        is an independent record and is used here instead.</p>` :
        (scoped ? `<p class="mr-note">Sales-ledger comparison omitted: the ledger has no association,
          state, or membership-category dimension, so it cannot be filtered to this scope.</p>` : '');

      return `<section class="mr-section">
        <h2 class="mr-h2">Executive summary</h2>
        <p class="mr-p">Scope: <strong>${esc(scopeSummary(o))}</strong>. Roster figures come from the
        Webpoint membership export loaded into Neon; ${CUR_YEAR} is a season in progress.</p>
        <div class="mr-kpis">${kpis.map(k=>`
          <div class="mr-kpi"><div class="mr-kpi-v">${k.v}</div><div class="mr-kpi-l">${esc(k.l)}</div>
          <div class="mr-kpi-s">${k.s}</div></div>`).join('')}</div>
        ${yearTable({rowsMap:C, order:CATS, years:yrs, label:'Membership category'})}
        ${ledgerBlock}
      </section>`;
    }
  },

  membership_mix: {
    label: 'Membership mix by category', group: 'Membership',
    desc: 'Athletes, coaches, officials and other membership types across the selected years, with share of total.',
    async build(o){
      const rows = await q(`SELECT membership_year y, ${CAT_SQL} cat, count(DISTINCT member_id) n
        FROM membership.members ${scopeWhere(o)} GROUP BY 1,2 ORDER BY 1,2`);
      const detail = await q(`SELECT membership_year y, COALESCE(NULLIF(membership_type,''),'(blank)') t,
        count(DISTINCT member_id) n FROM membership.members ${scopeWhere(o)} GROUP BY 1,2 ORDER BY 3 DESC`);
      const C = pivot(rows, r=>r.cat, r=>r.y, r=>r.n);
      const Tm = pivot(detail, r=>r.t, r=>r.y, r=>r.n);
      const last = o.years[o.years.length-1];
      const order = Object.keys(Tm).sort((a,b)=>((Tm[b][last]||0)-(Tm[a][last]||0)));
      return `<section class="mr-section">
        <h2 class="mr-h2">Membership mix by category</h2>
        ${yearTable({rowsMap:C, order:CATS, years:o.years, label:'Category'})}
        <h3 class="mr-h3">Raw membership types</h3>
        <p class="mr-p">Every distinct membership type as written in Webpoint, rolled up into the four
        categories above. A small number of member IDs legitimately hold two membership types in the
        same year, so type rows can exceed the category total.</p>
        ${yearTable({rowsMap:Tm, order:order, years:o.years, label:'Membership type', totalRow:false})}
      </section>`;
    }
  },

  age_profile: {
    label: 'Athlete age profile', group: 'Membership',
    desc: 'Athletes by competition-year age group (D/C/B/A/19+) across years — the pipeline supply picture.',
    async build(o){
      const rows = await q(`SELECT membership_year y, ${GRP_SQL} grp, count(DISTINCT member_id) n
        FROM membership.members ${scopeWhere(o, [`membership_type ILIKE '%Athlete%'`, 'birth_date IS NOT NULL'])}
        GROUP BY 1,2 ORDER BY 1,2`);
      const G = pivot(rows, r=>r.grp, r=>r.y, r=>r.n);
      const last = o.years[o.years.length-1];
      const maxV = Math.max(1, ...GROUP_ORDER.map(g => (G[g]||{})[last]||0));
      const shape = GROUP_ORDER.map(g => `<tr><td>${esc(GROUP_LABEL[g])} <span class="mr-soft">(${g})</span></td>
        <td style="width:52%">${bar((G[g]||{})[last]||0, maxV, NAVY)}</td>
        <td class="mr-num">${fmt((G[g]||{})[last]||0)}</td></tr>`).join('');
      return `<section class="mr-section">
        <h2 class="mr-h2">Athlete age profile</h2>
        <p class="mr-p">Athletes only — age groups apply only to athlete memberships. Age is
        competition-year age (membership year minus birth year), matching how the Junior Circuit
        brackets athletes. Members with no birth date on file are excluded.</p>
        ${yearTable({rowsMap:G, order:GROUP_ORDER, years:o.years, label:'Age group',
                     labelFn:k => `${GROUP_LABEL[k]} (${k})`})}
        <h3 class="mr-h3">${last} shape</h3>
        <table class="mr-table mr-table-plain"><tbody>${shape}</tbody></table>
      </section>`;
    }
  },

  geography_assoc: {
    label: 'Geography — by association', group: 'Membership',
    desc: 'Member and athlete counts per association across years, with change and share of national total.',
    async build(o){
      const rows = await q(`SELECT COALESCE(association,'(none)') k, membership_year y,
        count(DISTINCT member_id) n FROM membership.members ${scopeWhere(o)} GROUP BY 1,2`);
      const ath = await q(`SELECT COALESCE(association,'(none)') k, membership_year y,
        count(DISTINCT member_id) n FROM membership.members
        ${scopeWhere(o, [`membership_type ILIKE '%Athlete%'`])} GROUP BY 1,2`);
      const A = pivot(rows, r=>r.k, r=>r.y, r=>r.n);
      const AT = pivot(ath, r=>r.k, r=>r.y, r=>r.n);
      const last = o.years[o.years.length-1], prev = o.years[o.years.length-2];
      const order = Object.keys(A).sort((a,b)=>((A[b][last]||0)-(A[a][last]||0)));
      const grand = order.reduce((s,k)=>s+(A[k][last]||0),0);
      const body = order.map(k => {
        const cur = A[k][last]||0, pv = prev ? (A[k][prev]||0) : null;
        return `<tr><td>${esc(k)}</td>` +
          o.years.map(y=>`<td class="mr-num">${fmt(A[k][y]||0)}</td>`).join('') +
          `<td class="mr-num">${fmt((AT[k]||{})[last]||0)}</td>` +
          (prev ? `<td>${delta(cur, pv)}</td>` : '') +
          `<td class="mr-num">${pctS(cur, grand)}</td></tr>`;
      }).join('');
      return `<section class="mr-section">
        <h2 class="mr-h2">Geography — by association</h2>
        <p class="mr-p">All membership types. The athlete column is a subset of the member column.</p>
        <table class="mr-table mr-table-sm"><thead><tr><th scope="col">Association</th>
          ${o.years.map(y=>`<th scope="col" class="mr-num">${y}${y===CUR_YEAR?' YTD':''}</th>`).join('')}
          <th scope="col" class="mr-num">${last} athletes</th>${prev?`<th scope="col">Change</th>`:''}<th scope="col" class="mr-num">Share</th>
        </tr></thead><tbody>${body}
        <tr class="mr-total"><td>Total</td>
          ${o.years.map(y=>`<td class="mr-num">${fmt(order.reduce((s,k)=>s+(A[k][y]||0),0))}</td>`).join('')}
          <td class="mr-num">${fmt(order.reduce((s,k)=>s+((AT[k]||{})[last]||0),0))}</td>
          ${prev?`<td>${delta(grand, order.reduce((s,k)=>s+(A[k][prev]||0),0))}</td>`:''}
          <td class="mr-num">100%</td></tr></tbody></table>
      </section>`;
    }
  },

  geography_state: {
    label: 'Geography — by state', group: 'Membership',
    desc: 'State-level totals with year-over-year change — the national footprint at a glance.',
    async build(o){
      const rows = await q(`SELECT COALESCE(state,'??') k, membership_year y,
        count(DISTINCT member_id) n FROM membership.members ${scopeWhere(o)} GROUP BY 1,2`);
      const A = pivot(rows, r=>r.k, r=>r.y, r=>r.n);
      const last = o.years[o.years.length-1];
      const order = Object.keys(A).sort((a,b)=>((A[b][last]||0)-(A[a][last]||0)));
      return `<section class="mr-section">
        <h2 class="mr-h2">Geography — by state</h2>
        ${yearTable({rowsMap:A, order:order, years:o.years, label:'State'})}
      </section>`;
    }
  },

  retention: {
    label: 'Retention & churn', group: 'Membership',
    desc: 'Renewal, lapse and new-member counts year over year, plus where the losses concentrate.',
    async build(o){
      const pairs = [[2024,2025],[2025,2026]];
      const parts = pairs.map(([a,b]) => `
        SELECT ${a} AS fy, ${b} AS ty, 'renewed' k, count(DISTINCT m.member_id) n
          FROM membership.members m WHERE m.membership_year=${b} ${scopeAnd(o, [], 'm')}
            AND EXISTS (SELECT 1 FROM membership.members x WHERE x.member_id=m.member_id AND x.membership_year=${a})
        UNION ALL
        SELECT ${a}, ${b}, 'lapsed', count(DISTINCT m.member_id)
          FROM membership.members m WHERE m.membership_year=${a} ${scopeAnd(o, [], 'm')}
            AND NOT EXISTS (SELECT 1 FROM membership.members x WHERE x.member_id=m.member_id AND x.membership_year=${b})
        UNION ALL
        SELECT ${a}, ${b}, 'new', count(DISTINCT m.member_id)
          FROM membership.members m WHERE m.membership_year=${b} ${scopeAnd(o, [], 'm')}
            AND NOT EXISTS (SELECT 1 FROM membership.members x WHERE x.member_id=m.member_id AND x.membership_year=${a})
        UNION ALL
        SELECT ${a}, ${b}, 'base', count(DISTINCT m.member_id)
          FROM membership.members m WHERE m.membership_year=${a} ${scopeAnd(o, [], 'm')}`).join(' UNION ALL ');
      const [flow, byGrp, byAssoc] = await Promise.all([
        q(parts),
        q(`SELECT ${GRP_SQL} grp, count(DISTINCT member_id) total,
             count(DISTINCT member_id) FILTER (WHERE NOT EXISTS (
               SELECT 1 FROM membership.members b WHERE b.member_id=membership.members.member_id AND b.membership_year=2026)) lost
           FROM membership.members
           ${scopeWhere(o, ['membership_year=2025', `membership_type ILIKE '%Athlete%'`, 'birth_date IS NOT NULL'])}
           GROUP BY 1`),
        q(`SELECT COALESCE(association,'(none)') k, count(DISTINCT member_id) total,
             count(DISTINCT member_id) FILTER (WHERE NOT EXISTS (
               SELECT 1 FROM membership.members b WHERE b.member_id=membership.members.member_id AND b.membership_year=2026)) lost
           FROM membership.members ${scopeWhere(o, ['membership_year=2025'])} GROUP BY 1 ORDER BY 3 DESC`),
      ]);
      const F = {}; flow.forEach(r => { const k=r.fy+'>'+r.ty; (F[k]=F[k]||{})[r.k]=+r.n; });
      const flowRows = pairs.map(([a,b]) => {
        const f = F[a+'>'+b] || {};
        return `<tr><td>${a} → ${b}</td><td class="mr-num">${fmt(f.base||0)}</td>
          <td class="mr-num">${fmt(f.renewed||0)}</td><td class="mr-num">${pctS(f.renewed||0, f.base||0)}</td>
          <td class="mr-num">${fmt(f.lapsed||0)}</td><td class="mr-num">${fmt(f['new']||0)}</td></tr>`;
      }).join('');
      const grpRows = GROUP_ORDER.map(g => {
        const r = byGrp.find(x=>x.grp===g); if (!r) return '';
        return `<tr><td>${esc(GROUP_LABEL[g])} (${g})</td><td class="mr-num">${fmt(r.total)}</td>
          <td class="mr-num">${fmt(r.lost)}</td><td class="mr-num">${pctS(+r.lost, +r.total)}</td>
          <td style="width:34%">${bar(pct100(+r.lost,+r.total), 100, RED)}</td></tr>`;
      }).join('');
      const assocRows = byAssoc.slice(0, o.topN || 20).map(r =>
        `<tr><td>${esc(r.k)}</td><td class="mr-num">${fmt(r.total)}</td>
         <td class="mr-num">${fmt(r.lost)}</td><td class="mr-num">${pctS(+r.lost,+r.total)}</td>
         <td style="width:30%">${bar(pct100(+r.lost,+r.total), 100, RED)}</td></tr>`).join('');
      return `<section class="mr-section">
        <h2 class="mr-h2">Retention &amp; churn</h2>
        <p class="mr-p">A member counts as renewed if the same member ID appears in the following
        membership year. Because 2026 is still in progress, its lapse figure is a
        <em>not-yet-renewed</em> count, not a final churn number.</p>
        <table class="mr-table"><thead><tr><th scope="col">Transition</th><th scope="col" class="mr-num">Starting base</th>
          <th scope="col" class="mr-num">Renewed</th><th scope="col" class="mr-num">Renewal rate</th>
          <th scope="col" class="mr-num">Not renewed</th><th scope="col" class="mr-num">New</th></tr></thead>
          <tbody>${flowRows}</tbody></table>
        <h3 class="mr-h3">Where athletes are lost — by age group (2025 → 2026)</h3>
        <table class="mr-table"><thead><tr><th scope="col">Age group</th><th scope="col" class="mr-num">2025 athletes</th>
          <th scope="col" class="mr-num">Not renewed</th><th scope="col" class="mr-num">Rate</th><th scope="col">&nbsp;</th></tr></thead>
          <tbody>${grpRows}</tbody></table>
        <h3 class="mr-h3">Where members are lost — by association (2025 → 2026)</h3>
        <table class="mr-table mr-table-sm"><thead><tr><th scope="col">Association</th><th scope="col" class="mr-num">2025 members</th>
          <th scope="col" class="mr-num">Not renewed</th><th scope="col" class="mr-num">Rate</th><th scope="col">&nbsp;</th></tr></thead>
          <tbody>${assocRows}</tbody></table>
      </section>`;
    }
  },

  clubs: {
    label: 'Club leaderboard', group: 'Membership',
    desc: 'Largest clubs by membership, with athletes, coaches, year-over-year change and retention.',
    async build(o){
      const rows = await q(`SELECT COALESCE(NULLIF(club,''),'(no club listed)') k, membership_year y,
        count(DISTINCT member_id) n,
        count(DISTINCT member_id) FILTER (WHERE membership_type ILIKE '%Athlete%') ath,
        count(DISTINCT member_id) FILTER (WHERE membership_type ILIKE '%Coach%') coa
        FROM membership.members ${scopeWhere(o)} GROUP BY 1,2`);
      const N = pivot(rows, r=>r.k, r=>r.y, r=>r.n);
      const A = pivot(rows, r=>r.k, r=>r.y, r=>r.ath);
      const C = pivot(rows, r=>r.k, r=>r.y, r=>r.coa);
      const last = o.years[o.years.length-1], prev = o.years[o.years.length-2];
      const order = Object.keys(N).sort((a,b)=>((N[b][last]||0)-(N[a][last]||0))).slice(0, o.topN || 40);
      const maxV = Math.max(1, ...order.map(k=>N[k][last]||0));
      const body = order.map((k,i) => `<tr><td class="mr-num">${i+1}</td><td>${esc(k)}</td>
        <td style="width:20%">${bar(N[k][last]||0, maxV, POOL)}</td>
        ${o.years.map(y=>`<td class="mr-num">${fmt(N[k][y]||0)}</td>`).join('')}
        <td class="mr-num">${fmt((A[k]||{})[last]||0)}</td>
        <td class="mr-num">${fmt((C[k]||{})[last]||0)}</td>
        ${prev?`<td>${delta(N[k][last]||0, N[k][prev]||0)}</td>`:''}</tr>`).join('');
      return `<section class="mr-section">
        <h2 class="mr-h2">Club leaderboard</h2>
        <p class="mr-p">Top ${order.length} clubs by ${last} membership. Members with no club recorded
        are pooled into a single “(no club listed)” row rather than dropped, so the totals reconcile.</p>
        <table class="mr-table mr-table-sm"><thead><tr><th scope="col" class="mr-num">#</th><th scope="col">Club</th><th scope="col">&nbsp;</th>
          ${o.years.map(y=>`<th scope="col" class="mr-num">${y}</th>`).join('')}
          <th scope="col" class="mr-num">Athletes</th><th scope="col" class="mr-num">Coaches</th>${prev?'<th scope="col">Change</th>':''}
        </tr></thead><tbody>${body}</tbody></table>
      </section>`;
    }
  },

  sales_ledger: {
    label: 'Sales ledger — month by month', group: 'Membership',
    desc: 'Net memberships sold per month of the membership year (Dec–Jun) from the accounting ledger.',
    async build(o){
      const rows = await q(`SELECT year y, month m,
        sum(cnt) FILTER (WHERE item NOT IN ('Background Fee','Donations','Processing Fee','Sanction Fee')) n,
        sum(cnt) FILTER (WHERE item LIKE '%Athlete%') ath
        FROM membership.sales_ledger GROUP BY 1,2 ORDER BY 1,2`);
      const MONTHS = ['Dec','Jan','Feb','Mar','Apr','May','Jun'];
      const P = {}; rows.forEach(r => { (P[r.m]=P[r.m]||{})[r.y] = {n:+r.n||0, ath:+r.ath||0}; });
      const yrs = [...new Set(rows.map(r=>+r.y))].sort();
      const ms  = [...new Set(rows.map(r=>+r.m))].sort((a,b)=>a-b);
      const body = ms.map(m => {
        const lab = MONTHS[m] || ('M'+m);
        const a = (P[m]||{})[yrs[0]], b = (P[m]||{})[yrs[yrs.length-1]];
        return `<tr><td>${esc(lab)}</td>` +
          yrs.map(y=>`<td class="mr-num">${fmt(((P[m]||{})[y]||{}).n||0)}</td>`).join('') +
          `<td>${delta((b||{}).n||0, (a||{}).n||0)}</td></tr>`;
      }).join('');
      const totals = yrs.map(y => ms.reduce((s,m)=>s+(((P[m]||{})[y]||{}).n||0),0));
      return `<section class="mr-section">
        <h2 class="mr-h2">Sales ledger — month by month</h2>
        <p class="mr-p">Net membership sales by month of the membership year, which opens 1 December.
        This is the accounting record, independent of the Webpoint roster export, and is the
        authoritative same-period comparison across years. Fee and donation lines are excluded;
        club/organisation memberships are included and have no counterpart in the people roster.</p>
        <table class="mr-table"><thead><tr><th scope="col">Month of membership year</th>
          ${yrs.map(y=>`<th scope="col" class="mr-num">${y}</th>`).join('')}<th scope="col">Change</th></tr></thead>
          <tbody>${body}<tr class="mr-total"><td>Dec–Jun total</td>
          ${totals.map(t=>`<td class="mr-num">${fmt(t)}</td>`).join('')}
          <td>${delta(totals[totals.length-1], totals[0])}</td></tr></tbody></table>
      </section>`;
    }
  },

  aau_landscape: {
    label: 'AAU competitive landscape', group: 'Membership',
    desc: 'AAU vs USA Diving sanctioned meet volume by year, plus the current results-crawl coverage.',
    async build(o){
      const [meets, cov] = await Promise.all([
        q(`SELECT EXTRACT(YEAR FROM start_date)::int y,
             count(*) FILTER (WHERE sanction ILIKE '%AAU%') aau,
             count(*) FILTER (WHERE sanction = 'USA Diving') usad
           FROM divemeets.meets WHERE start_date IS NOT NULL
             AND EXTRACT(YEAR FROM start_date) BETWEEN 2018 AND ${CUR_YEAR}
           GROUP BY 1 ORDER BY 1`),
        q(`SELECT CASE WHEN sanction ILIKE '%AAU%' THEN 'AAU'
                       WHEN sanction = 'USA Diving' THEN 'USA Diving' ELSE 'Other' END body,
             count(*) meets, count(*) FILTER (WHERE results_done) done,
             count(*) FILTER (WHERE NOT results_done AND coalesce(results_attempts,0) >= 3) parked
           FROM divemeets.meets GROUP BY 1 ORDER BY 2 DESC`),
      ]);
      const maxV = Math.max(1, ...meets.flatMap(r=>[+r.aau, +r.usad]));
      const body = meets.map(r => `<tr><td class="mr-num">${r.y}</td>
        <td class="mr-num">${fmt(r.usad)}</td><td style="width:24%">${bar(+r.usad, maxV, NAVY)}</td>
        <td class="mr-num">${fmt(r.aau)}</td><td style="width:24%">${bar(+r.aau, maxV, POOL)}</td>
        <td class="mr-num">${pctS(+r.aau, (+r.aau)+(+r.usad))}</td></tr>`).join('');
      const covRows = cov.map(r => `<tr><td>${esc(r.body)}</td><td class="mr-num">${fmt(r.meets)}</td>
        <td class="mr-num">${fmt(r.done)}</td><td class="mr-num">${pctS(+r.done, +r.meets)}</td>
        <td class="mr-num">${fmt(r.parked)}</td></tr>`).join('');
      const aauRow = cov.find(r=>r.body==='AAU') || {meets:0, done:0};
      return `<section class="mr-section">
        <h2 class="mr-h2">AAU competitive landscape</h2>
        <p class="mr-p">Sanctioned meet counts from the DiveMeets catalogue. This measures where
        competition <em>opportunity</em> sits, which is the leading indicator for where membership
        follows.</p>
        <table class="mr-table"><thead><tr><th scope="col" class="mr-num">Year</th>
          <th scope="col" class="mr-num">USA Diving</th><th scope="col">&nbsp;</th><th scope="col" class="mr-num">AAU</th><th scope="col">&nbsp;</th>
          <th scope="col" class="mr-num">AAU share</th></tr></thead><tbody>${body}</tbody></table>
        <h3 class="mr-h3">Results-crawl coverage</h3>
        <p class="mr-p">Meet <em>results</em> are crawled separately from the catalogue. Athlete-level
        AAU comparison is only possible for meets whose results have been crawled.</p>
        <table class="mr-table"><thead><tr><th scope="col">Sanctioning body</th><th scope="col" class="mr-num">Meets catalogued</th>
          <th scope="col" class="mr-num">Results crawled</th><th scope="col" class="mr-num">Coverage</th>
          <th scope="col" class="mr-num">Parked (failed)</th></tr></thead><tbody>${covRows}</tbody></table>
        <p class="mr-note"><b>Status:</b> ${fmt(aauRow.done)} of ${fmt(aauRow.meets)} AAU meets
        (${pctS(+aauRow.done, +aauRow.meets)}) have results crawled. Until that reaches full coverage,
        treat AAU athlete-level comparisons as partial.</p>
      </section>`;
    }
  },

};

function pct100(a,b){ return b>0 ? 100*a/b : 0; }
/* =====================================================================
   BOUNDARY STUDIO SECTIONS
   These read the live scenario through window.BoundaryAPI, so a generated
   report always describes the map currently on screen — including unsaved
   edits. Every section states the scenario name and membership year it used.
   ===================================================================== */

function B(){ return window.BoundaryAPI; }
/* Map the report's membership years onto the years the boundary data holds.
   Previously every boundary section rendered whichever single year Boundary
   Studio happened to be sitting on, ignoring the report's selection entirely --
   so asking for 2025 and 2026 produced one year twice over. */
function boundaryYears(o){
  const avail = (B().availableYears && B().availableYears()) || ['y25','y26'];
  const want = (o && o.years && o.years.length ? o.years : [2026])
    .map(y => 'y' + String(y).slice(-2))
    .filter(y => avail.indexOf(y) >= 0);
  const missing = (o && o.years ? o.years : [])
    .filter(y => avail.indexOf('y' + String(y).slice(-2)) < 0);
  return {years: want.length ? want : [B().year()], missing};
}
function boundaryReady(){ return !!(B() && B().ready()); }
function notReady(title){
  return `<section class="mr-section"><h2 class="mr-h2">${esc(title)}</h2>
    <p class="mr-p mr-warn">Boundary Studio has not finished loading. Open the
    <strong>Boundary Studio</strong> tab once, let the map draw, then generate this report again.</p>
    </section>`;
}
function scenarioLine(){
  const sc = B().scenario();
  const name = sc.name || 'Unsaved working scenario';
  return `<div class="mr-scenario-badge">
    <span class="mr-sb-label">Scenario</span>
    <span class="mr-sb-name">${esc(name)}</span>
    ${sc.dirty ? '<span class="mr-sb-dirty">unsaved edits included</span>' : ''}
    <span class="mr-sb-year">Membership year ${esc(B().yearLabel())}</span>
  </div>`;
}

/* Same visual language as scenarioLine(), for sections that compare two named
   scenarios rather than describing one. Both names get equal visual weight
   deliberately -- neither reads as "the real one" and the other as an
   afterthought, which a plain sentence naming one in bold and the other in
   passing tends to imply even when that isn't the intent. */
function scenarioCompareLine(nameA, labelA, nameB, labelB){
  return `<div class="mr-scenario-badge mr-sb-compare">
    <span class="mr-sb-col"><span class="mr-sb-label">${esc(labelA)}</span>
      <span class="mr-sb-name">${esc(nameA)}</span></span>
    <span class="mr-sb-vs">VS</span>
    <span class="mr-sb-col mr-sb-right"><span class="mr-sb-label">${esc(labelB)}</span>
      <span class="mr-sb-name">${esc(nameB)}</span></span>
  </div>`;
}

/* ---------- distribution statistics ---------- */
function gini(xs){
  const n = xs.length;
  if (n < 2) return 0;
  const mean = xs.reduce((a,b)=>a+b,0) / n;
  if (mean <= 0) return 0;
  let sum = 0;
  for (let i=0;i<n;i++) for (let j=0;j<n;j++) sum += Math.abs(xs[i]-xs[j]);
  return sum / (2 * n * n * mean);
}
function stats(xs){
  const n = xs.length;
  if (!n) return {n:0, total:0, mean:0, sd:0, cv:0, min:0, max:0, ratio:0, gini:0, spread:0};
  const total = xs.reduce((a,b)=>a+b,0);
  const mean = total / n;
  const sd = Math.sqrt(xs.reduce((s,x)=>s+(x-mean)*(x-mean),0) / n);
  const min = Math.min(...xs), max = Math.max(...xs);
  return {n, total, mean, sd, cv: mean>0 ? sd/mean : 0, min, max,
          ratio: min>0 ? max/min : Infinity, gini: gini(xs),
          spread: mean>0 ? (max-min)/mean : 0};
}
/* Plain-English verdict so the report is readable by non-analysts. */
function balanceVerdict(cv){
  if (cv <= 0.10) return ['Well balanced', 'Every area is within roughly a tenth of the average size.'];
  if (cv <= 0.20) return ['Reasonably balanced', 'Some variation between areas, but nothing extreme.'];
  if (cv <= 0.35) return ['Uneven', 'Areas differ enough that the largest carry a noticeably heavier load.'];
  return ['Highly uneven', 'The largest and smallest areas are very far apart.'];
}

/* Full per-group profile at the current tier view. */
function groupProfiles(){
  const api = B(), geo = api.geo(), y = api.year(), age = api.age() || {};
  const TG = api.tierGroups(), assign = api.assign(), regions = api.regions();
  const counties = geo.counties, clubs = geo.clubs || [];
  const byFips = {}; counties.forEach(c => byFips[c.f] = c);
  const P = TG.groups.map((g,i) => ({
    idx:i, name:g.name || ('Area '+(i+1)), color: api.groupColor(i),
    m:0, a:0, c:0, clubs:new Map(), counties:0, countiesWithMembers:0,
    states:new Map(), zips:[], ages:[0,0,0,0,0],
  }));
  const un = {idx:-1, name:'Unassigned', color:'#94a3b8', m:0,a:0,c:0,
              clubs:new Map(), counties:0, countiesWithMembers:0, states:new Map(), zips:[], ages:[0,0,0,0,0]};
  const groupOf = fips => {
    const ri = assign[fips];
    if (ri == null || ri < 0 || ri >= regions.length) return null;
    return P[TG.of[ri]] || null;
  };
  // Counties assigned (whether or not they contain members)
  Object.keys(assign).forEach(f => { const t = groupOf(f); if (t) t.counties++; });
  // Member statistics, which only exist for counties that geocoded members
  for (const [fips, st] of Object.entries(geo.stats)){
    const v = st[y]; if (!v) continue;
    const t = groupOf(fips) || un;
    t.m += v.m; t.a += v.a; t.c += v.c;
    if (v.m > 0) t.countiesWithMembers++;
    (v.cl || []).forEach(ci => t.clubs.set(ci, (t.clubs.get(ci)||0) + 1));
    const co = byFips[fips];
    if (co && v.m > 0) t.states.set(co.st, (t.states.get(co.st)||0) + v.m);
    const ag = age[fips] && age[fips][y];
    if (ag) for (let j=0;j<5;j++) t.ages[j] += (ag[j]||0);
    for (const [zip, mm] of Object.entries(st.z || {})){
      const n = mm[y === 'y25' ? 0 : 1];
      if (n > 0) t.zips.push({zip, n, county: co ? co.n : '', st: co ? co.st : ''});
    }
  }
  P.concat([un]).forEach(t => t.zips.sort((a,b)=>b.n-a.n));
  return {P, un, TG};
}

/* One map renderer for every boundary section. Two copies would eventually
   disagree about a colour or an unassigned county, and the report is the
   artefact that leaves the building. */
const BMAP_FALLBACK = [NAVY, RED, POOL, SKY, '#6d28d9', '#047857', '#b45309', '#9d174d',
                       '#0e7490', '#4d7c0f', '#7c2d12', '#1e40af'];
function boundaryMapSvg(L){
  const api = B(), geo = api.geo();
  const assign = api.assign(), regions = api.regions();
  const TG = api.tierGroupsAt(L), of = TG.of, nG = TG.groups.length;
  const colorOf = gi => {
    const g = TG.groups[gi];
    if (g && g.colors && g.colors.length && g.colors[0]) return g.colors[0];
    return BMAP_FALLBACK[gi % BMAP_FALLBACK.length];
  };
  const nameOf = gi => (TG.groups[gi] && TG.groups[gi].name) || ('Area ' + (gi+1));
  const dParts = Array.from({length:nG}, ()=>[]), unParts = [];
  for (const c of geo.counties){
    const ri = assign[c.f];
    const gi = (ri != null && ri >= 0 && ri < regions.length) ? of[ri] : null;
    if (gi == null || gi < 0 || gi >= nG) unParts.push(c.d); else dParts[gi].push(c.d);
  }
  const paths = dParts.map((parts, gi) => parts.length
      ? `<path d="${parts.join('')}" fill="${colorOf(gi)}" stroke="#ffffff" stroke-width="0.3"/>` : '').join('')
    + (unParts.length ? `<path d="${unParts.join('')}" fill="#e2e8f2" stroke="#ffffff" stroke-width="0.3"/>` : '');
  return {
    svg: `<svg viewBox="${esc(geo.viewBox || '0 0 975 610')}" class="mr-stagemap">${paths}
      <path d="${geo.stateMesh}" fill="none" stroke="#ffffff" stroke-width="0.9"/>
      <path d="${geo.nationMesh}" fill="none" stroke="#94a3b8" stroke-width="0.7"/></svg>`,
    colorOf, nameOf, nG,
  };
}

const BOUNDARY_SECTIONS = {

  boundary_summary: {
    label: 'Realignment — scenario summary (start here)', group: 'Boundary Studio',
    desc: 'One page: the map, the structure in a sentence, who reaches the championship, '
        + 'whether every meet runs, and exactly what it was computed from.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — scenario summary');
      const api = B(), QRr = window.QualRouting;
      const nLev = api.levelCount ? api.levelCount() : 1;
      const routing = api.routing ? api.routing() : null;
      const res = api.pathway ? api.pathway() : null;
      const M = boundaryMapSvg(0);
      const t = api.tallies();
      const stamps = api.stamps ? api.stamps() : null;
      const finalNm = api.finalName ? api.finalName() : 'the championship';
      const frozen = api.frozen ? api.frozen() : null;
      const drift = (frozen && api.frozenDrift) ? api.frozenDrift() : null;
      const freezeBlock = !frozen ? '' : (drift
        ? `<p class="mr-p mr-warn"><strong>This scenario was frozen on
             ${esc(String(frozen.at||'').slice(0,10))}${frozen.note?` (${esc(frozen.note)})`:''} and no longer
             computes what it said then.</strong> ${drift.figures.length
             ? drift.figures.map(r=>`${esc(r.label)} was ${fmt(Math.round(r.then))}, now ${fmt(Math.round(r.now))}`).join('; ')+'.'
             : 'The headline figures still match; the inputs behind them have moved.'}
             Do not circulate these numbers under the earlier date without saying so.</p>`
        : `<p class="mr-p"><strong>Frozen ${esc(String(frozen.at||'').slice(0,10))}${
             frozen.note?` — ${esc(frozen.note)}`:''}.</strong> Everything below still computes exactly what it
             said when it was presented.</p>`);

      // The structure as one readable sentence, which is how it gets described
      // out loud in the room anyway.
      const chain = [];
      for (let L = 0; L < nLev; L++) chain.push(`${fmt(api.groupCountAt(L))} ${esc(api.tierName(L))}`);
      const sentence = chain.join(' &rarr; ') + ' &rarr; ' + esc(finalNm);

      let field = null, levelRows = '', schedLine = '', probLine = '';
      if (routing && res && QRr){
        const CELLS = (window.JuniorFlow && window.JuniorFlow.CODES) || [];
        levelRows = routing.map((lvl, L) => {
          const stops = api.groupCountAt(L);
          // Everyone who joins this stage at any round. Reading the first round
          // alone misses athletes seeded past it, which the 2026 rules do.
          let n = 0;
          for (let g = 0; g < stops; g++) n += QRr.entriesAt(res, L, g, CELLS);
          return `<tr><td>${esc(api.tierName(L))}</td><td class="mr-num">${fmt(stops)}</td>
            <td class="mr-num">${fmt(Math.round(n))}</td>
            <td class="mr-num">${fmt(Math.round(n/Math.max(1,stops)))}</td></tr>`;
        }).join('');
        const last = routing.length - 1;
        field = 0;
        for (let g = 0; g < Math.max(1, api.groupCountAt(last)); g++) field += QRr.entriesAt(res, last, g, CELLS);
        const nProb = (res.problems||[]).length;
        probLine = nProb ? `<p class="mr-p mr-warn"><strong>${nProb} problem${nProb===1?'':'s'} in this
          pathway.</strong> Open Boundary Studio &rarr; Structure and clear them before this goes further.</p>` : '';
      }
      const sched = api.scheduleAll ? api.scheduleAll() : null;
      if (sched && sched.stops && sched.stops.length){
        const bad = sched.stops.filter(x=>x.daysOver);
        schedLine = bad.length
          ? `<p class="mr-p mr-warn"><strong>${bad.length} of ${sched.stops.length} meets do not fit a standard
             facility day.</strong> ${esc(bad.map(x=>x.name).join(', '))}.</p>`
          : `<p class="mr-p">All ${sched.stops.length} meets fit inside a standard facility day.</p>`;
      }
      const key = Array.from({length:M.nG}, (_,gi)=>`<span class="mr-mapkey">
        <span class="mr-sw" style="background:${M.colorOf(gi)}"></span>${esc(M.nameOf(gi))}</span>`).join('');
      const assignedM = t.rows.reduce((a2,r)=>a2+r.m,0);

      return `<section class="mr-section">
        <h2 class="mr-h2">Realignment — scenario summary</h2>
        ${scenarioLine()}
        ${freezeBlock}
        <p class="mr-p"><strong>Structure.</strong> ${sentence}.</p>
        <p class="mr-p"><strong>Pathway.</strong> ${esc(api.pathwayLabel ? api.pathwayLabel() : 'as configured')}.</p>
        <div class="mr-map">${M.svg}</div>
        <div class="mr-mapkeys">${key}</div>
        <table class="mr-table"><tbody>
          <tr><td>Members in the mapped area</td><td class="mr-num">${fmt(assignedM)}</td></tr>
          ${field!=null?`<tr><td><strong>Reaching ${esc(finalNm)}</strong></td>
            <td class="mr-num"><strong>${fmt(Math.round(field))}</strong></td></tr>`:''}
        </tbody></table>
        ${levelRows?`<h3 class="mr-h3">Every stage</h3>
        <table class="mr-table"><thead><tr><th scope="col">Stage</th><th scope="col" class="mr-num">Meets</th>
          <th scope="col" class="mr-num">Entries</th><th scope="col" class="mr-num">Per meet</th></tr></thead>
          <tbody>${levelRows}</tbody></table>`:''}
        ${schedLine}${probLine}
        <h3 class="mr-h3">What this was computed from</h3>
        <p class="mr-p">Every figure above should be reproducible from this alone. If one is not, it does not
          belong in a decision.</p>
        <table class="mr-table mr-table-sm"><tbody>
          <tr><td>Season</td><td>${esc(api.yearLabel())}</td></tr>
          ${frozen?`<tr><td>Frozen</td><td>${esc(String(frozen.at||'').slice(0,10))}${
            frozen.note?' — '+esc(frozen.note):''}${drift?' <strong>(figures have moved since)</strong>':''}</td></tr>`:''}
          ${stamps?`<tr><td>Entry data build</td><td>${esc(String(stamps.advance_data||'—').slice(0,10))}</td></tr>
          <tr><td>Events per athlete</td><td>${esc(String(stamps.multiplicity||'—').slice(0,10))}</td></tr>
          <tr><td>Take-up measured on</td><td>${esc(stamps.calibration_basis||'—')}</td></tr>
          <tr><td>First stop fed by</td><td>${esc(stamps.seed_pool||'—')}</td></tr>`:''}
        </tbody></table>
        <p class="mr-note">Entries are not people: athletes commonly contest two or three events, so an entry count
          tells you what a session costs and how long it runs, not how many bodies need a bed. Projected figures are
          qualified places carried up by the published rules and the take-up measured on the alignment that season
          was actually run under &mdash; they are not a forecast of who wins.</p>
      </section>`;
    }
  },

  boundary_pathways_compared: {
    label: 'Realignment — pathways compared', group: 'Boundary Studio',
    desc: 'Saved pathways side by side on the same map: championship field, meet sizes, days, and what does not fit.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — pathways compared');
      const api = B();
      let C = api.comparison ? api.comparison() : null;
      let fromCompareSlot = false;
      if (!C || !C.length){
        C = api.comparisonFromCompareSlot ? api.comparisonFromCompareSlot() : null;
        fromCompareSlot = !!(C && C.length);
      }
      if (!C || !C.length) return `<section class="mr-section"><h2 class="mr-h2">Pathways compared</h2>
        <p class="mr-p mr-warn">No comparison is loaded. Either open <strong>Boundary Studio &rarr; Compare with</strong>
        and load a saved scenario there, or use <strong>Boundary Studio &rarr; Compare</strong> to tick saved
        pathways or maps against the one on screen, then generate this report again.</p>
        </section>`;
      const base = C[0];
      const head = C.map((c,i)=>`<th scope="col" class="mr-num">${esc(c.label)}${i===0?'<div class="mr-soft">on screen</div>':''}</th>`).join('');
      const delta = (v,b) => (b==null||v==null||Math.round(v)===Math.round(b)) ? ''
        : ` <span class="mr-soft">(${v-b>0?'+':''}${fmt(Math.round(v-b))})</span>`;
      const row = (label, get, hint) => `<tr><td>${esc(label)}${hint?`<div class="mr-soft">${esc(hint)}</div>`:''}</td>` +
        C.map((c,i)=>{
          if (c.error) return `<td class="mr-num mr-warn">${esc(c.error)}</td>`;
          const v=get(c); if (v==null) return '<td class="mr-num">—</td>';
          return `<td class="mr-num">${fmt(Math.round(v))}${i>0?delta(v,get(base)):''}</td>`;
        }).join('') + '</tr>';
      const nLev = Math.max(0, ...C.filter(c=>c.levels).map(c=>c.levels.length));
      const levelRows = Array.from({length:nLev}, (_,L) =>
        row(((base.levels&&base.levels[L])?base.levels[L].name:'Level '+(L+1)) + ' — entries',
            c => (c.levels&&c.levels[L]) ? c.levels[L].entries : null,
            (base.levels&&base.levels[L]) ? `${base.levels[L].stops} stop${base.levels[L].stops===1?'':'s'}` : '')).join('');
      const noted = C.filter(c=>c.notes && c.notes.length);
      const introText = fromCompareSlot
        ? `Two full scenarios, each run exactly as saved &mdash; its own map and its own pathway together.
           Nothing is held fixed between columns; every difference below reflects everything that differs
           between the two proposals, not one isolated rule change.`
        : `The same map, run under each pathway. Only the rules differ between columns — the boundaries,
           the field each pathway starts from, and the measured behaviour are held still, so every difference
           below is caused by the rules and nothing else.`;

      // The actual qualification RULES, per scenario -- not just the numbers
      // those rules produce. Same QualRouting.describe() boundary_pathway
      // itself uses, so the wording matches exactly if you look at either
      // scenario on its own afterward.
      const QRr = window.QualRouting;
      const rulesBlocks = QRr ? C.map(c => {
        if (c.error || !c.routing) return '';
        const nmFor = i => (c.levels && c.levels[i] && c.levels[i].name) || ('Level '+(i+1));
        const items = c.routing.map((lvl, L) =>
          `<li><strong>${esc(nmFor(L))}</strong> — ${esc(QRr.describe(c.routing, L, nmFor))}</li>`).join('');
        return `<div class="mr-rules-col"><div class="mr-rules-h">${esc(c.label)}</div>
          <ul class="mr-bullets">${items}</ul></div>`;
      }).join('') : '';

      const usdSigned = v => (v < 0 ? '\u2212' + usd(Math.abs(v)) : usd(v));
      const moneyDelta = (v,b) => {
        const d = Math.round(v - b);
        if (!d) return '';
        return ` <span class="mr-soft">(${d>0?'+':'\u2212'}${usd(Math.abs(d))})</span>`;
      };
      const financeRow = (label, get) => `<tr><td>${esc(label)}</td>` +
        C.map((c,i)=>{
          if (c.error || !c.finance) return '<td class="mr-num">—</td>';
          const v = get(c.finance);
          return `<td class="mr-num mono">${usdSigned(v)}${i>0 && base.finance?moneyDelta(v,get(base.finance)):''}</td>`;
        }).join('') + '</tr>';

      const bannerNames = C.map(c => c.label);
      const banner = bannerNames.length === 2
        ? scenarioCompareLine(bannerNames[0], 'On screen', bannerNames[1], 'Compared against')
        : `<div class="mr-scenario-badge"><span class="mr-sb-label">Comparing</span>
             <span class="mr-sb-name">${bannerNames.map(esc).join(' &nbsp;vs&nbsp; ')}</span></div>`;

      return `<section class="mr-section">
        <h2 class="mr-h2">Pathways compared</h2>
        ${banner}
        <p class="mr-p">${introText}</p>

        <h3 class="mr-h3">Qualification rules, side by side</h3>
        <div class="mr-rules-grid">${rulesBlocks}</div>

        <h3 class="mr-h3">Entries and the field</h3>
        <table class="mr-table"><thead><tr><th scope="col">&nbsp;</th>${head}</tr></thead><tbody>
          ${row('Championship field', c=>c.finalField, 'who reaches the top meet')}
          ${levelRows}
        </tbody></table>

        <h3 class="mr-h3">Money — entry fees only</h3>
        <table class="mr-table"><thead><tr><th scope="col">&nbsp;</th>${head}</tr></thead><tbody>
          ${financeRow('Entry income (gross)', f=>f.gross)}
          ${financeRow('DiveMeets pass-through', f=>-f.levy)}
          ${financeRow('To hosts', f=>f.host)}
          ${financeRow('USA Diving keeps', f=>f.usad)}
        </tbody></table>
        <p class="mr-note">Entry fees only, at the standing rates, less the DiveMeets pass-through — membership
          dues, synchro and the senior circuit are not here. Priced the same way for every column, so a
          difference is caused by the rules, not by a different fee card.</p>

        <h3 class="mr-h3">Meets and schedule</h3>
        <table class="mr-table"><thead><tr><th scope="col">&nbsp;</th>${head}</tr></thead><tbody>
          ${row('Meets to run', c=>c.meets)}
          ${row('Competition days, all meets', c=>c.daysTotal)}
          ${row('Meets that do not fit', c=>c.over)}
          ${row('Events split', c=>c.autoSplit)}
          ${row('Events to look at', c=>c.review)}
        </tbody></table>
        ${noted.length ? `<p class="mr-note mr-warn">${noted.map(c=>
          `<strong>${esc(c.label)}</strong> was saved for a different structure and was fitted onto this one. ${
          c.notes.map(n=>esc(n)).join(' ')}`).join('<br>')}</p>` : ''}
        <p class="mr-note">Each route band sets the size of the meet it feeds. Widening how many leave the first
          stop changes how big the next meet is; it does not change the championship field, which is capped by the
          last route into it. A top line that has not moved means the change was upstream of what sets it.</p>
      </section>`;
    }
  },

  boundary_schedule: {
    label: 'Realignment — potential schedules', group: 'Boundary Studio',
    desc: 'A proposed day-by-day, session-by-session schedule for every stop this pathway creates — boards, '
        + 'warm-ups, splits and practice time — so the committee sees how each meet would actually run, not '
        + 'just whether a summary number says it fits.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — potential schedules');
      const api = B(), QRr = window.QualRouting, E = window.ScenarioScheduleEngine;
      if (!QRr || !E || typeof E.simulateStop !== 'function')
        return `<section class="mr-section"><h2 class="mr-h2">Potential schedules</h2>
          <p class="mr-p mr-warn">The schedule engine is not loaded.</p></section>`;
      const res = api.pathway();
      if (!res || !res.field) return `<section class="mr-section"><h2 class="mr-h2">Potential schedules</h2>
        <p class="mr-p mr-warn">Open the <strong>Boundary Studio</strong> tab once so the map and pathway are
        worked out, then generate this report again.</p></section>`;
      const sched = api.scheduleAll ? api.scheduleAll() : null;
      if (!sched || !sched.stops.length) return `<section class="mr-section"><h2 class="mr-h2">Potential schedules</h2>
        <p class="mr-p mr-warn">No stops to lay out. Draw a map and set a pathway first.</p></section>`;

      const R = sched.rules;
      const windowMin = R.facilityCloseMin - R.facilityOpenMin;
      const maxDay = Math.max(1, ...sched.stops.map(x => x.longestDayMin || 0));

      const rows = sched.stops.map(x => {
        const overCls = x.daysOver ? 'mr-warn' : '';
        return `<tr>
          <td>${esc(x.name)}<div class="mr-soft">${esc(x.level)}</div></td>
          <td class="mr-num">${fmt(Math.round(x.entries))}</td>
          <td class="mr-num">${fmt(x.events)}</td>
          <td class="mr-num">${fmt(x.days)}</td>
          <td class="mr-num">${x.longestDayMin ? (x.longestDayMin/60).toFixed(1)+' h' : '—'}</td>
          <td style="width:16%">${bar(x.longestDayMin||0, maxDay, x.daysOver ? RED : POOL)}</td>
          <td class="mr-num">${x.autoSplit || '—'}</td>
          <td class="mr-num">${x.review || '—'}</td>
          <td class="${overCls}">${x.daysOver ? x.daysOver+' day'+(x.daysOver>1?'s':'')+' over' : 'Fits'}</td>
        </tr>`;
      }).join('');

      const bad = sched.stops.filter(x => x.daysOver);
      const untimed = sched.stops.reduce((a,x)=>a+(x.unknown||0), 0);
      const verdict = bad.length
        ? `<p class="mr-p mr-warn"><strong>${bad.length} of ${sched.stops.length} stops run past the assumed
             facility day on this layout.</strong> ${esc(bad.map(x=>x.name).join(', '))}. Either those areas
             carry too many entries for one venue, or those hosts need an extra day — the full proposed
             schedule for each stop, below, shows exactly which day and which session.</p>`
        : `<p class="mr-p">Every stop fits inside the assumed facility day on this layout.</p>`;

      return `<section class="mr-section">
        <h2 class="mr-h2">Potential schedules</h2>
        ${scenarioLine()}
        <p class="mr-p">Every area this map and pathway create becomes a real meet a host club has to run
          inside its own pool hours. The pages below lay out each stop day by day and session by session,
          in the same format Schedule Builder prints for a real meet — entries and estimated run time per
          event, standard 55-minute warm-up, one discipline per age group and gender per day. There is no
          real date yet, so there are no clock times; once a stop is actually scheduled, Schedule Builder
          fills those in.</p>
        <p class="mr-note">Warm-up shows as the standard 55 minutes throughout. The <strong>Fits / doesn't
          fit</strong> verdict below still uses each session's real computed warm-up (Groups A/B run longer
          than C/D), so that verdict keeps agreeing with Boundary Studio's own Schedule tab — the 55-minute
          figure is a planning standard for reading the pages, not a change to that math. Dive counts are
          taken from the 2026 Zone and Junior National schedules as actually run. This is a proposal, not a
          real schedule — a host's own equipment, pool hours and judgement outrank every figure here.</p>

        <h3 class="mr-h3">Summary — does each meet fit</h3>
        ${verdict}
        <table class="mr-table"><thead><tr>
          <th scope="col">Stop</th><th scope="col" class="mr-num">Entries</th><th scope="col" class="mr-num">Events</th>
          <th scope="col" class="mr-num">Days</th><th scope="col" class="mr-num">Longest day</th><th scope="col">&nbsp;</th>
          <th scope="col" class="mr-num">Split</th><th scope="col" class="mr-num">Look at</th><th scope="col">Verdict</th>
        </tr></thead><tbody>${rows}</tbody></table>
        ${untimed ? `<p class="mr-note mr-warn">${fmt(untimed)} event${untimed>1?'s have':' has'} no dive count on
          record and ${untimed>1?'are':'is'} not timed here. Those meets will run longer than shown, both above
          and in the proposed schedules below.</p>` : ''}
        <p class="mr-note">Pool assumed open ${Math.floor(R.facilityOpenMin/60)}:00 to
          ${Math.floor(R.facilityCloseMin/60)}:00 — a ${(windowMin/60).toFixed(1)}-hour day, the same for every
          host, purely so stops can be compared on one ruler. Hosts open at different times in practice and may
          run one age group earlier or later than another.</p>

        <h3 class="mr-h3">Proposed schedule, stop by stop</h3>
        <p class="mr-p">Every day, every session, every event — for every stop this pathway creates.</p>
        ${sched.stops.map(x => schedStopCard(x, windowMin)).join('')}
      </section>`;
    }
  },

  boundary_pathway: {
    label: 'Realignment — qualification pathway', group: 'Boundary Studio',
    desc: 'Who advances at every stage and round, how many people that is, and what it bills.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — qualification pathway');
      const api = B(), QRr = window.QualRouting;
      if (!QRr) return `<section class="mr-section"><h2 class="mr-h2">Qualification pathway</h2>
        <p class="mr-p mr-warn">The pathway engine is not loaded.</p></section>`;
      await (api.ensureMult ? api.ensureMult() : Promise.resolve());
      const routing = api.routing();
      const res = api.pathway();
      if (!res) return `<section class="mr-section"><h2 class="mr-h2">Qualification pathway</h2>
        <p class="mr-p mr-warn">Open the <strong>Boundary Studio</strong> tab once so the map and pathway
        are worked out, then generate this report again.</p></section>`;

      const CELLS = (window.JuniorFlow && window.JuniorFlow.CODES) || [];
      const mult = api.multiplicity();
      const nm = i => api.tierName(i);
      const seed = (function(){
        // The entry level's own field, which is what it bills on.
        const g = api.groupCountAt(0);
        const rows = [];
        for (let i=0;i<g;i++) rows.push(res.field[0][QRr.roundsOf(routing[0])[0].key][i] || {});
        return rows;
      })();

      const rows = routing.map((lvl, L) => {
        const stops = api.groupCountAt(L);
        const rounds = QRr.roundsOf(lvl).map(r => {
          const size = QRr.sizeAt(res, L, r.key, CELLS);
          let people = '';
          if (mult){
            const d = QRr.diversAt(res, L, r.key, CELLS, mult, api.multBasis(L));
            if (d && d.ok) people = fmt(Math.round(d.divers)) + (d.reliable ? '' : ' <span class="mr-soft">(est.)</span>');
          }
          return `<tr><td>${esc(nm(L))}</td><td>${esc(QRr.ROUND_NAME[r.key] || r.key)}</td>
            <td class="mr-num">${fmt(stops)}</td>
            <td class="mr-num">${fmt(Math.round(size))}</td>
            <td class="mr-num">${fmt(Math.round(size / Math.max(1, stops)))}</td>
            <td class="mr-num">${people || '—'}</td></tr>`;
        }).join('');
        return rounds;
      }).join('');

      // Three genuinely different kinds of number, easy to conflate unless
      // each row says which one it is: what the rules would admit if every
      // qualifier turned up (a ceiling, not a forecast), and what the field
      // actually was in each of the last two real seasons (calibrated to
      // that season's own measured take-up, where a real one exists at all).
      // entriesForSource() and withYear() already existed for exactly this
      // -- built for the schedule generator, never wired into a report until
      // now. Sequential, not Promise.all: withYear mutates S.year for its
      // duration, and its own comment warns against overlapping calls.
      let sourceRows = '';
      try {
        const maxRes = await api.entriesForSource('max');
        const y25Res = await api.entriesForSource('y25');
        const y26Res = await api.entriesForSource('y26');
        const stageOf = (L, rk) => {
          const total = (R) => {
            const f = R && R.field && R.field[L] && R.field[L][rk];
            return f ? f.reduce((s,g) => s + CELLS.reduce((s2,c) => s2+(g[c]||0), 0), 0) : null;
          };
          return {max: total(maxRes), y25: total(y25Res), y26: total(y26Res)};
        };
        const srows = [];
        routing.forEach((lvl2, L) => QRr.roundsOf(lvl2).forEach(r => {
          const s = stageOf(L, r.key);
          // Level 0 is the entry pool itself, not a stage anything advances
          // INTO -- there is no rule capping it, so "max available" has no
          // real meaning there. maxCapacityEntries() seeds it with an
          // arbitrary huge placeholder to make the projection math work,
          // which is not a number to show anyone; say plainly why instead.
          const maxCell = L === 0
            ? '<span class="mr-soft">n/a — entry pool, not capped by a rule</span>'
            : (s.max!=null?fmt(Math.round(s.max)):'—');
          srows.push(`<tr><td>${esc(nm(L))}</td><td>${esc(QRr.ROUND_NAME[r.key] || r.key)}</td>
            <td class="mr-num">${maxCell}</td>
            <td class="mr-num">${s.y25!=null?fmt(Math.round(s.y25)):'<span class="mr-soft">no 2025 data</span>'}</td>
            <td class="mr-num">${s.y26!=null?fmt(Math.round(s.y26)):'<span class="mr-soft">no 2026 data</span>'}</td></tr>`);
        }));
        sourceRows = srows.join('');
      } catch(e){ sourceRows = `<tr><td colspan="5" class="mr-warn">Could not compute the max/2025/2026
        comparison: ${esc(e.message||String(e))}</td></tr>`; }

      const billed = routing.map((lvl, L) => {
        const b = QRr.billableEntries(res, L, CELLS, seed);
        const n = CELLS.reduce((s,c) => s + (b[c]||0), 0);
        return `<tr><td>${esc(nm(L))}</td><td class="mr-num">${fmt(Math.round(n))}</td></tr>`;
      }).join('');

      // Published 2026 card. Pricing Studio owns fees and is the single source
      // of truth for them; read its live PS.fees rather than keep a second
      // copy here that would silently go stale the moment a fee actually
      // changes -- the same class of gap the pricing.js/routing.js merge
      // closed earlier, just in a different spot. Fall back only if Pricing
      // Studio genuinely hasn't loaded, and say so plainly either way.
      const livePSFees = (window.__PRICING && window.__PRICING.PS && window.__PRICING.PS.fees && window.__PRICING.PS.fees.length)
        ? window.__PRICING.PS.fees : null;
      const CARD = livePSFees || [{qual:85,non:45},{qual:90,non:45},{qual:115,non:0},{qual:125,non:0}];
      const feeSourceNote = livePSFees
        ? 'Fees read live from Pricing Studio.'
        : 'Pricing Studio has not loaded in this session, so this used a fallback 2026 fee card -- confirm it still matches Pricing Studio before relying on this figure.';
      const fees = routing.map((_,L) => CARD[Math.min(L, CARD.length-1)]);
      const isQual = (L, c) => L > 0 || (c[2] !== 'P');
      const rev = QRr.revenue(res, CELLS, seed, {fees, levy:4.90, isQual});
      const money = rev.perLevel.map(p => `<tr><td>${esc(nm(p.level))}</td>
        <td class="mr-num">${fmt(Math.round(p.entries))}</td>
        <td class="mr-num">${usd(fees[p.level].qual)}</td>
        <td class="mr-num">${usd(p.gross)}</td>
        <td class="mr-num">&minus;${usd(p.levy)}</td>
        <td class="mr-num">${usd(p.net)}</td></tr>`).join('');

      const routes = routing.map((lvl,L) =>
        `<li><strong>${esc(nm(L))}</strong> — ${esc(QRr.describe(routing, L, nm))}</li>`).join('');
      const probs = (res.problems||[]).map(p =>
        `<li class="mr-warn">${esc(p.level!=null ? nm(p.level)+': ' : '')}${esc(p.msg)}</li>`).join('');

      return `<section class="mr-section">
        <h2 class="mr-h2">Qualification pathway</h2>
        ${scenarioLine()}
        ${probs ? `<p class="mr-p mr-warn"><b>This pathway has problems that affect the numbers below.</b></p>
          <ul class="mr-bullets">${probs}</ul>` : ''}
        <ul class="mr-bullets">${routes}</ul>

        <h3 class="mr-h3">Field at every stage and round</h3>
        <p class="mr-note">Calibrated to ${esc(api.yearLabel())}'s measured take-up where a real one exists;
          bands with no real measurement assume every qualifier turns up.</p>
        <table class="mr-table"><thead><tr><th scope="col">Stage</th><th scope="col">Round</th><th scope="col" class="mr-num">Stops</th>
          <th scope="col" class="mr-num">Entries</th><th scope="col" class="mr-num">Per stop</th><th scope="col" class="mr-num">Divers</th></tr></thead>
          <tbody>${rows}</tbody></table>
        <p class="mr-note">Entries are athlete-and-event; divers are people. Athletes commonly contest two or
          three events, so the two answer different questions — entries decide session length and fee income,
          divers decide beds and awards. Anything marked <i>est.</i> means this pathway has moved the mix
          of events away from what was measured, so read it as indicative.</p>

        <h3 class="mr-h3">The same field, three ways</h3>
        <p class="mr-p">These are three different kinds of number, not three estimates of the same one.
          <b>Max available</b> is a structural ceiling — every band saturated as if the real field were
          infinite, useful for sizing a venue's worst case, not for predicting turnout. It only means
          something for a stage a <em>rule</em> caps; the entry level itself has no such rule, so it shows
          as not applicable rather than a number. <b>2025</b> and <b>2026</b> are what actually happened
          those seasons, each calibrated to that season's own measured take-up where a real measurement
          exists for that stage. A stage marked "no data" did not exist, or was not separately measured,
          in that season.</p>
        <table class="mr-table mr-table-sm"><thead><tr><th scope="col">Stage</th><th scope="col">Round</th>
          <th scope="col" class="mr-num">Max available</th><th scope="col" class="mr-num">2025</th>
          <th scope="col" class="mr-num">2026</th></tr></thead>
          <tbody>${sourceRows}</tbody></table>

        <h3 class="mr-h3">Every event, every round</h3>
        ${(function(){
          const AGE={A:'Group A',B:'Group B',C:'Group C',D:'Group D'};
          const GEN={B:'Boys',G:'Girls'}, DIS={'1':'1m','3':'3m',P:'Platform'};
          const cols=[];
          routing.forEach((lvl,L)=>QRr.roundsOf(lvl).forEach(r=>
            cols.push({L,key:r.key,name:nm(L),round:QRr.ROUND_NAME[r.key]||r.key})));
          const val=(L,rk,cell)=>{const f=res.field[L]&&res.field[L][rk];
            return f? f.reduce((s,g)=>s+(g[cell]||0),0) : 0;};
          const head=cols.map(c=>`<th scope="col" class="mr-num">${esc(c.name)}<br><span class="mr-soft">${esc(c.round)}</span></th>`).join('');
          const body=['A','B','C','D'].map(ag=>{
            const sub=cols.map(c=>{let n=0;['B','G'].forEach(g=>['1','3','P'].forEach(d=>{n+=val(c.L,c.key,ag+g+d);}));
              return `<td class="mr-num">${n>0.5?fmt(Math.round(n)):'—'}</td>`;}).join('');
            const rows=['B','G'].flatMap(g=>['1','3','P'].map(d=>{
              const cell=ag+g+d;
              const tds=cols.map(c=>{const n=val(c.L,c.key,cell);
                return `<td class="mr-num">${n>0.5?fmt(Math.round(n)):'—'}</td>`;}).join('');
              return `<tr><td style="padding-left:18px">${esc(GEN[g])} ${esc(DIS[d])}</td>${tds}</tr>`;})).join('');
            return `<tr class="mr-sub"><td><b>${esc(AGE[ag])}</b></td>${sub}</tr>${rows}`;}).join('');
          const tot=cols.map(c=>{const n=CELLS.reduce((s,cell)=>s+val(c.L,c.key,cell),0);
            return `<td class="mr-num"><b>${fmt(Math.round(n))}</b></td>`;}).join('');
          return `<table class="mr-table"><thead><tr><th scope="col">Age group / event</th>${head}</tr></thead>
            <tbody>${body}<tr class="mr-tot"><td><b>All events</b></td>${tot}</tr></tbody></table>`;
        })()}
        <p class="mr-note">A stage total says how big a meet is. This says how many 14-15 girls will be on the
          3-meter board in the semi-final — the number a timetable and an awards order are actually built from.</p>

        <h3 class="mr-h3">What actually gets billed</h3>
        <table class="mr-table"><thead><tr><th scope="col">Stage</th><th scope="col" class="mr-num">Billable entries</th></tr></thead>
          <tbody>${billed}</tbody></table>
        <p class="mr-note">An athlete pays once per event at a meet however many rounds they dive, so moving
          between rounds inside a stage bills nothing. Adding the round fields together would charge the same
          diver two or three times over.</p>

        <h3 class="mr-h3">Fee income at the published 2026 rates</h3>
        <table class="mr-table"><thead><tr><th scope="col">Stage</th><th scope="col" class="mr-num">Entries</th>
          <th scope="col" class="mr-num">Fee</th><th scope="col" class="mr-num">Gross</th><th scope="col" class="mr-num">DiveMeets</th>
          <th scope="col" class="mr-num">Net</th></tr></thead><tbody>${money}
          <tr class="mr-tot"><td>Total</td><td class="mr-num">${fmt(Math.round(rev.entries))}</td><td></td>
            <td class="mr-num">${usd(rev.gross)}</td><td class="mr-num">&minus;${usd(rev.levy)}</td>
            <td class="mr-num">${usd(rev.net)}</td></tr></tbody></table>
        <p class="mr-note">Entry fees only, at the standing 2026 rates, with $4.90 per entry passed through to
          DiveMeets. Membership dues, synchro and the senior circuit are not in this figure — Pricing Studio
          carries those, and is where fees themselves can be changed. ${esc(feeSourceNote)}</p>
      </section>`;
    }
  },

  boundary_overview: {
    label: 'Realignment — scenario overview', group: 'Boundary Studio',
    desc: 'What the scenario is, how the tiers are structured, and the headline size of every area.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — scenario overview');
      const api = B(), {P, un} = groupProfiles();
      const total = P.reduce((s,g)=>s+g.m,0);
      const equal = P.length ? total / P.length : 0;
      const maxM = Math.max(1, ...P.map(g=>g.m));
      const levels = api.levels() || [];
      const tierChain = levels.map((l,i) => {
        const n = api.tierGroupsAt(i).groups.length;
        return `${esc(api.tierName(i))} <span class="mr-soft">(${n})</span>`;
      }).join(' &rarr; ') + (api.finalName() ? ` &rarr; ${esc(api.finalName())}` : '');
      const body = P.map(g => `<tr>
        <td><span class="mr-sw" style="background:${g.color}"></span>${esc(g.name)}</td>
        <td class="mr-num">${fmt(g.m)}</td>
        <td style="width:20%">${bar(g.m, maxM, g.color)}</td>
        <td class="mr-num">${fmt(g.a)}</td><td class="mr-num">${fmt(g.c)}</td>
        <td class="mr-num">${fmt(g.clubs.size)}</td>
        <td class="mr-num">${fmt(g.counties)}</td>
        <td class="mr-num">${pctS(g.m, total)}</td>
        <td class="mr-num ${devClass(g.m, equal)}">${equal>0 ? signPct((g.m-equal)/equal) : '—'}</td>
      </tr>`).join('');
      const unRow = un.m > 0 ? `<tr class="mr-muted"><td>Not assigned to any area</td>
        <td class="mr-num">${fmt(un.m)}</td><td></td><td class="mr-num">${fmt(un.a)}</td>
        <td class="mr-num">${fmt(un.c)}</td><td class="mr-num">${fmt(un.clubs.size)}</td>
        <td class="mr-num">—</td><td class="mr-num">${pctS(un.m, total+un.m)}</td><td class="mr-num">—</td></tr>` : '';
      return `<section class="mr-section">
        <h2 class="mr-h2">Realignment — scenario overview</h2>
        ${scenarioLine()}
        <p class="mr-p">Structure: ${tierChain}</p>
        <p class="mr-p">This table is at the <strong>${esc(api.tierName(api.tierView()))}</strong>
        level currently shown on the map. “Deviation” is how far an area sits from an equal share of
        members — an equal split would put ${fmt(Math.round(equal))} members in each of the
        ${P.length} areas.</p>
        <table class="mr-table"><thead><tr><th scope="col">Area</th><th scope="col" class="mr-num">Members</th><th scope="col">&nbsp;</th>
          <th scope="col" class="mr-num">Athletes</th><th scope="col" class="mr-num">Coaches</th><th scope="col" class="mr-num">Clubs</th>
          <th scope="col" class="mr-num">Counties</th><th scope="col" class="mr-num">Share</th>
          <th scope="col" class="mr-num">Deviation</th></tr></thead>
          <tbody>${body}${unRow}
          <tr class="mr-total"><td>Total assigned</td><td class="mr-num">${fmt(total)}</td><td></td>
            <td class="mr-num">${fmt(P.reduce((s,g)=>s+g.a,0))}</td>
            <td class="mr-num">${fmt(P.reduce((s,g)=>s+g.c,0))}</td>
            <td class="mr-num">${fmt(new Set(P.flatMap(g=>[...g.clubs.keys()])).size)}</td>
            <td class="mr-num">${fmt(P.reduce((s,g)=>s+g.counties,0))}</td>
            <td class="mr-num">100%</td><td class="mr-num">—</td></tr></tbody></table>
        ${un.m > 0 ? `<p class="mr-note"><b>Unassigned members:</b> ${fmt(un.m)} members sit in counties
          that have not been painted into any area. They are excluded from every share and balance
          figure in this report. Assign them before treating the scenario as complete.</p>` : ''}
      </section>`;
    }
  },

  boundary_balance: {
    label: 'Realignment — balance & equity', group: 'Boundary Studio',
    desc: 'How evenly the scenario splits members, athletes and clubs — spread, largest-to-smallest ratio and concentration.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — balance & equity');
      const {P} = groupProfiles();
      if (P.length < 2) return `<section class="mr-section"><h2 class="mr-h2">Realignment — balance &amp; equity</h2>
        <p class="mr-p mr-warn">Balance statistics need at least two areas. This scenario has ${P.length}.</p></section>`;
      const dims = [
        {k:'m', label:'Members'}, {k:'a', label:'Athletes'}, {k:'c', label:'Coaches'},
      ];
      const rows = dims.map(d => {
        const s = stats(P.map(g=>g[d.k]));
        const [v] = balanceVerdict(s.cv);
        return `<tr><td>${esc(d.label)}</td><td class="mr-num">${fmt(s.total)}</td>
          <td class="mr-num">${fmt(Math.round(s.mean))}</td>
          <td class="mr-num">${fmt(s.min)}</td><td class="mr-num">${fmt(s.max)}</td>
          <td class="mr-num">${isFinite(s.ratio) ? s.ratio.toFixed(2)+'×' : '—'}</td>
          <td class="mr-num">${(100*s.cv).toFixed(1)}%</td>
          <td class="mr-num">${s.gini.toFixed(3)}</td>
          <td>${esc(v)}</td></tr>`;
      }).join('');
      const clubStats = stats(P.map(g=>g.clubs.size));
      const mS = stats(P.map(g=>g.m));
      const [verdict, verdictWhy] = balanceVerdict(mS.cv);
      const equal = mS.mean;
      const sorted = P.slice().sort((a,b)=>b.m-a.m);
      const maxAbs = Math.max(...P.map(g=>Math.abs(g.m-equal)), 1);
      const devRows = sorted.map(g => {
        const d = g.m - equal, p = equal>0 ? d/equal : 0;
        return `<tr><td><span class="mr-sw" style="background:${g.color}"></span>${esc(g.name)}</td>
          <td class="mr-num">${fmt(g.m)}</td>
          <td class="mr-dev">${devBar(d, maxAbs)}</td>
          <td class="mr-num ${devClass(g.m, equal)}">${signNum(d)}</td>
          <td class="mr-num ${devClass(g.m, equal)}">${signPct(p)}</td></tr>`;
      }).join('');
      return `<section class="mr-section">
        <h2 class="mr-h2">Realignment — balance &amp; equity</h2>
        ${scenarioLine()}
        <div class="mr-kpis">
          <div class="mr-kpi"><div class="mr-kpi-v">${verdict}</div>
            <div class="mr-kpi-l">Overall balance of members</div>
            <div class="mr-kpi-s">${esc(verdictWhy)}</div></div>
          <div class="mr-kpi"><div class="mr-kpi-v">${isFinite(mS.ratio)?mS.ratio.toFixed(2)+'×':'—'}</div>
            <div class="mr-kpi-l">Largest ÷ smallest area</div>
            <div class="mr-kpi-s">${fmt(mS.max)} vs ${fmt(mS.min)} members</div></div>
          <div class="mr-kpi"><div class="mr-kpi-v">${(100*mS.cv).toFixed(1)}%</div>
            <div class="mr-kpi-l">Spread around the average</div>
            <div class="mr-kpi-s">Lower is more even. Under 10% is tight.</div></div>
          <div class="mr-kpi"><div class="mr-kpi-v">${fmt(Math.round(equal))}</div>
            <div class="mr-kpi-l">Members in an equal split</div>
            <div class="mr-kpi-s">${fmt(mS.total)} members ÷ ${P.length} areas</div></div>
        </div>
        <h3 class="mr-h3">Distribution by measure</h3>
        <table class="mr-table"><thead><tr><th scope="col">Measure</th><th scope="col" class="mr-num">Total</th>
          <th scope="col" class="mr-num">Average</th><th scope="col" class="mr-num">Smallest</th><th scope="col" class="mr-num">Largest</th>
          <th scope="col" class="mr-num">Max ÷ min</th><th scope="col" class="mr-num">Spread</th><th scope="col" class="mr-num">Gini</th>
          <th scope="col">Read</th></tr></thead><tbody>${rows}
          <tr><td>Distinct clubs</td><td class="mr-num">${fmt(clubStats.total)}</td>
            <td class="mr-num">${fmt(Math.round(clubStats.mean))}</td>
            <td class="mr-num">${fmt(clubStats.min)}</td><td class="mr-num">${fmt(clubStats.max)}</td>
            <td class="mr-num">${isFinite(clubStats.ratio)?clubStats.ratio.toFixed(2)+'×':'—'}</td>
            <td class="mr-num">${(100*clubStats.cv).toFixed(1)}%</td>
            <td class="mr-num">${clubStats.gini.toFixed(3)}</td>
            <td>${esc(balanceVerdict(clubStats.cv)[0])}</td></tr>
        </tbody></table>
        <p class="mr-note"><b>How to read these:</b> <em>Spread</em> is the coefficient of variation —
        the typical distance from the average, as a percentage of the average. <em>Gini</em> runs from
        0 (perfectly equal) to 1 (all members in one area); anything under about 0.10 is a very even
        split. Both ignore geography, so pair them with the deviation chart below and with travel
        considerations before drawing conclusions.</p>
        <h3 class="mr-h3">Deviation from an equal share</h3>
        <p class="mr-p">Bars to the right of the centre line are larger than an equal share; bars to the
        left are smaller.</p>
        <table class="mr-table"><thead><tr><th scope="col">Area</th><th scope="col" class="mr-num">Members</th>
          <th scope="col" style="width:34%">Versus equal share</th><th scope="col" class="mr-num">Difference</th>
          <th scope="col" class="mr-num">%</th></tr></thead><tbody>${devRows}</tbody></table>
      </section>`;
    }
  },

  boundary_tiers: {
    label: 'Realignment — tier rollups', group: 'Boundary Studio',
    desc: 'Every level of the structure rolled up in turn, with balance statistics at each level.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — tier rollups');
      const api = B(), geo = api.geo(), y = api.year();
      const assign = api.assign(), regions = api.regions(), levels = api.levels() || [];
      const blocks = levels.map((lv, li) => {
        const TG = api.tierGroupsAt(li);
        const agg = TG.groups.map(g => ({name: g.name || 'Area', m:0, a:0, c:0, cl:new Set()}));
        let unM = 0;
        for (const [fips, st] of Object.entries(geo.stats)){
          const v = st[y]; if (!v) continue;
          const ri = assign[fips];
          if (ri == null || ri < 0 || ri >= regions.length){ unM += v.m; continue; }
          const t = agg[TG.of[ri]]; if (!t) continue;
          t.m += v.m; t.a += v.a; t.c += v.c;
          (v.cl||[]).forEach(ci=>t.cl.add(ci));
        }
        const s = stats(agg.map(x=>x.m));
        const maxM = Math.max(1, ...agg.map(x=>x.m));
        const rows = agg.map((x,i) => `<tr>
          <td><span class="mr-sw" style="background:${api.groupColor(i)}"></span>${esc(x.name)}</td>
          <td class="mr-num">${fmt(x.m)}</td><td style="width:26%">${bar(x.m, maxM, api.groupColor(i))}</td>
          <td class="mr-num">${fmt(x.a)}</td><td class="mr-num">${fmt(x.cl.size)}</td>
          <td class="mr-num">${pctS(x.m, s.total)}</td>
          <td class="mr-num ${devClass(x.m, s.mean)}">${s.mean>0?signPct((x.m-s.mean)/s.mean):'—'}</td></tr>`).join('');
        return `<h3 class="mr-h3">${esc(api.tierName(li))} — ${agg.length} area${agg.length===1?'':'s'}</h3>
          <p class="mr-p">Average ${fmt(Math.round(s.mean))} members per area ·
             largest ÷ smallest ${isFinite(s.ratio)?s.ratio.toFixed(2)+'×':'—'} ·
             spread ${(100*s.cv).toFixed(1)}% · <strong>${esc(balanceVerdict(s.cv)[0])}</strong></p>
          <table class="mr-table"><thead><tr><th scope="col">Area</th><th scope="col" class="mr-num">Members</th><th scope="col">&nbsp;</th>
            <th scope="col" class="mr-num">Athletes</th><th scope="col" class="mr-num">Clubs</th><th scope="col" class="mr-num">Share</th>
            <th scope="col" class="mr-num">Deviation</th></tr></thead><tbody>${rows}</tbody></table>
          ${unM>0 && li===0 ? `<p class="mr-note">${fmt(unM)} members are in unassigned counties and are excluded.</p>`:''}`;
      }).join('');
      return `<section class="mr-section">
        <h2 class="mr-h2">Realignment — tier rollups</h2>
        ${scenarioLine()}
        <p class="mr-p">Each level of the structure is rolled up from the painted county map. Balance
        usually improves as levels combine — a lopsided bottom tier can still produce even upper tiers,
        and that is worth checking before signing off on a structure.</p>
        <p class="mr-note"><b>How to read this.</b> <em>Share</em> is this area's percentage of the
        level's total membership — areas at a level should sum to 100%. <em>Deviation</em> compares an
        area to what an exactly even split would look like at that level (total members ÷ number of
        areas): a deviation of +20% means this area has a fifth more members than an equal share would
        give it, not a fifth more than any other specific area. Compare the same level's deviation
        column across areas to see which ones are furthest from even; compare deviation at one area
        across levels to see whether combining areas is smoothing out or compounding an imbalance.</p>
        ${blocks}
      </section>`;
    }
  },

  boundary_region_profiles: {
    label: 'Realignment — area profiles', group: 'Boundary Studio',
    desc: 'A one-block profile per area: size, age mix, states covered, and its largest clubs.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — area profiles');
      const api = B(), clubs = api.clubs(), AG = api.ageGroups();
      const {P} = groupProfiles();
      const total = P.reduce((s,g)=>s+g.m,0);
      const blocks = P.map(g => {
        const topClubs = [...g.clubs.keys()].map(ci => clubs[ci] || ('club #'+ci)).sort();
        const states = [...g.states.entries()].sort((a,b)=>b[1]-a[1]);
        const ageTot = g.ages.reduce((a,b)=>a+b,0);
        const ageBar = AG.map((ag,i) => {
          const w = ageTot>0 ? (100*g.ages[i]/ageTot) : 0;
          return w > 0 ? `<span class="mr-seg" style="width:${w}%;background:${ag.color}"
            title="${esc(ag.label)}: ${fmt(g.ages[i])}"></span>` : '';
        }).join('');
        const ageCells = AG.map((ag,i) =>
          `<td class="mr-num">${fmt(g.ages[i])}<div class="mr-soft">${pctS(g.ages[i], ageTot)}</div></td>`).join('');
        const stateList = states.slice(0,12).map(([st,n]) => `${esc(st)} <span class="mr-soft">${fmt(n)}</span>`).join(' · ')
          + (states.length > 12 ? ` <span class="mr-soft">+${states.length-12} more</span>` : '');
        const zipTop = g.zips.slice(0,8).map(z =>
          `${esc(z.zip)} <span class="mr-soft">${fmt(z.n)}</span>`).join(' · ');
        return `<div class="mr-profile">
          <div class="mr-profile-h" style="border-left:6px solid ${g.color}">
            <div class="mr-profile-name">${esc(g.name)}</div>
            <div class="mr-profile-kpi">
              <span><b>${fmt(g.m)}</b> members</span>
              <span><b>${fmt(g.a)}</b> athletes</span>
              <span><b>${fmt(g.c)}</b> coaches</span>
              <span><b>${fmt(g.clubs.size)}</b> clubs</span>
              <span><b>${fmt(g.counties)}</b> counties</span>
              <span><b>${pctS(g.m, total)}</b> of national</span>
            </div>
          </div>
          <table class="mr-table mr-table-sm"><thead><tr>
            ${AG.map(a=>`<th scope="col" class="mr-num">${esc(a.label)}</th>`).join('')}
            <th scope="col" class="mr-num">Total</th></tr></thead>
            <tbody><tr>${ageCells}<td class="mr-num"><b>${fmt(ageTot)}</b></td></tr></tbody></table>
          <div class="mr-stack">${ageBar}</div>
          <div class="mr-kv"><span class="mr-kv-k">States</span>
            <span class="mr-kv-v">${stateList || '<span class="mr-soft">none</span>'}</span></div>
          <div class="mr-kv"><span class="mr-kv-k">Densest zips</span>
            <span class="mr-kv-v">${zipTop || '<span class="mr-soft">none</span>'}</span></div>
          <div class="mr-kv"><span class="mr-kv-k">Clubs (${g.clubs.size})</span>
            <span class="mr-kv-v">${topClubs.length ? esc(topClubs.join(' · ')) : '<span class="mr-soft">none</span>'}</span></div>
        </div>`;
      }).join('');
      return `<section class="mr-section">
        <h2 class="mr-h2">Realignment — area profiles</h2>
        ${scenarioLine()}
        <p class="mr-p">Age bands are athlete counts by competition-year age. County counts include
        every county painted into the area, whether or not it currently contains members.</p>
        ${blocks}
      </section>`;
    }
  },

  boundary_compare: {
    label: 'Realignment — which counties move (vs. another scenario)', group: 'Boundary Studio',
    desc: 'Geographic differences only: which counties and members change area between the working scenario '
        + 'and the loaded comparison scenario. Two proposals sharing the same map will correctly show zero '
        + 'differences here \u2014 for field size, meets, or money differences, use "Pathways compared" instead.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — which counties move');
      const api = B(), cmp = api.compare();
      if (!cmp) return `<section class="mr-section">
        <h2 class="mr-h2">Realignment — which counties move</h2>
        <p class="mr-p mr-warn">No comparison scenario is loaded. In Boundary Studio, load a scenario
        into the compare slot first, then generate this report.</p></section>`;
      const geo = api.geo(), y = api.year(), assign = api.assign(), regions = api.regions();
      const byFips = {}; geo.counties.forEach(c => byFips[c.f] = c);
      const curName = i => (regions[i] && regions[i].name) || ('Area '+(i+1));
      const oldName = i => (cmp.regions && cmp.regions[i] && cmp.regions[i].name) || ('Area '+(i+1));
      const moves = [];
      let movedMembers = 0, sameCount = 0;
      const flow = new Map();
      const allFips = new Set([...Object.keys(assign), ...Object.keys(cmp.assign || {})]);
      allFips.forEach(f => {
        const a = cmp.assign ? cmp.assign[f] : undefined;
        const b = assign[f];
        const an = (a == null || a < 0) ? null : oldName(a);
        const bn = (b == null || b < 0) ? null : curName(b);
        if (an === bn){ sameCount++; return; }
        const st = geo.stats[f];
        const m = st && st[y] ? st[y].m : 0;
        movedMembers += m;
        const co = byFips[f];
        moves.push({f, name: co?co.n:'', st: co?co.st:'', from: an, to: bn, m});
        const key = (an||'Unassigned') + ' → ' + (bn||'Unassigned');
        const cur = flow.get(key) || {counties:0, m:0};
        cur.counties++; cur.m += m; flow.set(key, cur);
      });
      moves.sort((a,b)=>b.m-a.m || String(a.st).localeCompare(String(b.st)));
      const flowRows = [...flow.entries()].sort((a,b)=>b[1].m-a[1].m).map(([k,v]) =>
        `<tr><td>${esc(k)}</td><td class="mr-num">${fmt(v.counties)}</td>
         <td class="mr-num">${fmt(v.m)}</td></tr>`).join('');
      const moveRows = moves.filter(m=>m.m>0).slice(0, o.topN || 60).map(m =>
        `<tr><td>${esc(m.name)}</td><td>${esc(m.st)}</td>
         <td>${esc(m.from || 'Unassigned')}</td><td>${esc(m.to || 'Unassigned')}</td>
         <td class="mr-num">${fmt(m.m)}</td></tr>`).join('');
      const workingName = api.scenario().name || 'Unsaved working scenario';
      const sameMap = moves.length === 0;
      const sameMapNote = sameMap ? `<div class="mr-note" style="border-left-color:#171F69">
        <strong>These two scenarios use the exact same map.</strong> Every county is assigned to the same
        area in both, so zero geographic differences is the correct answer, not a sign nothing loaded.
        If ${esc(workingName)} and ${esc(cmp.name || cmp.id || 'the compared scenario')} differ in their
        rules instead \u2014 who qualifies, how big the field is, what it costs \u2014 that shows up in
        <strong>"Realignment \u2014 pathways compared,"</strong> not here.</div>` : '';
      return `<section class="mr-section">
        <h2 class="mr-h2">Which counties move</h2>
        ${scenarioCompareLine(workingName, 'Working scenario', cmp.name || cmp.id || 'Comparison scenario', 'Compared against')}
        ${sameMapNote}
        <div class="mr-kpis">
          <div class="mr-kpi"><div class="mr-kpi-v">${fmt(moves.length)}</div>
            <div class="mr-kpi-l">Counties that change area</div>
            <div class="mr-kpi-s">${fmt(sameCount)} stay where they are</div></div>
          <div class="mr-kpi"><div class="mr-kpi-v">${fmt(movedMembers)}</div>
            <div class="mr-kpi-l">Members who change area</div>
            <div class="mr-kpi-s">Everyone in a moved county</div></div>
          <div class="mr-kpi"><div class="mr-kpi-v">${flow.size}</div>
            <div class="mr-kpi-l">Distinct area-to-area moves</div>
            <div class="mr-kpi-s">Each origin/destination pairing</div></div>
        </div>
        <h3 class="mr-h3">Member flows between areas</h3>
        <table class="mr-table"><thead><tr><th scope="col">Move</th><th scope="col" class="mr-num">Counties</th>
          <th scope="col" class="mr-num">Members affected</th></tr></thead><tbody>${flowRows || '<tr><td colspan="3">No geographic differences \u2014 see the note above.</td></tr>'}</tbody></table>
        <h3 class="mr-h3">Counties that move (those containing members)</h3>
        <table class="mr-table mr-table-sm"><thead><tr><th scope="col">County</th><th scope="col">State</th><th scope="col">From</th>
          <th scope="col">To</th><th scope="col" class="mr-num">Members</th></tr></thead>
          <tbody>${moveRows || '<tr><td colspan="5">No member-carrying county changes area.</td></tr>'}</tbody></table>
        <p class="mr-note">Counties with no recorded members can still change area; they are counted in
        the headline figure above but omitted from the detail table to keep it readable.</p>
      </section>`;
    }
  },

  boundary_circuit_delta: {
    label: 'New Junior Circuit — old vs. proposed', group: 'Boundary Studio',
    desc: 'Today\u2019s real qualification field against both 9-zone proposals, on the same map, by age group and gender, with the E/W/C cap shown at 3/4/5.',
    build: async function(o){
      if (!boundaryReady()) return notReady('New Junior Circuit — old vs. proposed');
      const api = B();
      const OLD_SEED_ID = 'seed-2026-official';
      const CCE_ID = 'bs-msg2vatz-5q86m';
      const COUNTER_ID = 'bs-msix7ibe-nij21';

      let rows;
      try {
        rows = await NEON.query(
          `SELECT id, name, data, updated_at FROM membership.boundary_scenarios WHERE id IN ($1,$2,$3)`,
          [OLD_SEED_ID, CCE_ID, COUNTER_ID]);
      } catch(e){
        return `<section class="mr-section"><h2 class="mr-h2">New Junior Circuit — old vs. proposed</h2>
          <p class="mr-p mr-warn">Could not load the comparison scenarios: ${esc(e.message||e)}</p></section>`;
      }
      const byId = {};
      (rows.rows||[]).forEach(r => byId[r.id] = {name:r.name, updatedAt:r.updated_at,
        data: typeof r.data==='string'?JSON.parse(r.data):r.data});
      const missing = [OLD_SEED_ID, CCE_ID, COUNTER_ID].filter(id => !byId[id]);
      if (missing.length) return `<section class="mr-section"><h2 class="mr-h2">New Junior Circuit — old vs. proposed</h2>
        <p class="mr-p mr-warn">Missing saved scenario(s): ${missing.map(esc).join(', ')}. This section names
        specific scenarios rather than whatever happens to be on screen, so it cannot substitute another one.</p></section>`;

      const oldData = byId[OLD_SEED_ID].data, cceData = byId[CCE_ID].data, cntData = byId[COUNTER_ID].data;

      // OLD: the real 2026 structure on the real, currently-published 12-region
      // map -- what actually happened, not a hypothetical.
      const oldLevels = [{name:'Regions'},
        {name:'Zones', groups:Array.from({length:6},(_,i)=>({name:'Zone '+String.fromCharCode(65+i)})),
         of:[0,0,1,1,2,2,3,3,4,4,5,5]},
        {name:'E / W / C', groups:[{name:'East'},{name:'Central'},{name:'West'}], of:[0,0,1,1,2,2]},
        {name:'Junior Nationals', groups:[{name:'Junior Nationals'}], of:[0,0,0]}];
      const oldSummary = api.withMap(
        {regions: Array.from({length:12},(_,i)=>({name:'Region '+(i+1)})), assign: oldData.assign, levels: oldLevels},
        () => api.summariseRouting(window.QualRouting.defaultRouting(3,3), 'Today\u2019s real system', null));

      // CCE and the counter-proposal share one map (the counter-proposal's,
      // the more developed of the two) -- only the rules differ between them,
      // so every difference below is caused by the rules and nothing else.
      const sharedMap = {regions: cntData.regions, assign: cntData.assign, levels: cntData.levels};
      const cceSummary = api.withMap(sharedMap, () => api.summariseRouting(cceData.routing, 'CCE proposal', null));

      const CAPS = [3,4,5];
      const capSummaries = {};
      CAPS.forEach(cap => {
        const routing = JSON.parse(JSON.stringify(cntData.routing));
        const rt = routing[1].routes.find(r => r.from === 'final');
        if (rt) rt.hi = cap;
        capSummaries[cap] = api.withMap(sharedMap,
          () => api.summariseRouting(routing, `Counter-proposal (E/W/C final top ${cap})`, null));
      });
      const DEFAULT_CAP = 4;
      const cntSummary = capSummaries[DEFAULT_CAP];

      const cols = [oldSummary, cceSummary, cntSummary];
      const maxField = Math.max(...cols.map(c=>c.finalField));
      const pctVs = (v, base) => base > 0 ? (100*(v-base)/base) : null;
      const pctStr = p => p == null ? '—' : `${p>0?'+':''}${p.toFixed(0)}%`;

      const headlineRows = cols.map((c,i) => `<tr>
        <td><b>${esc(c.label)}</b>${i===2?` <span class="mr-soft">(E/W/C final cap = ${DEFAULT_CAP})</span>`:''}</td>
        <td style="width:32%">${bar(c.finalField, maxField, i===0?SKY:(i===1?POOL:NAVY))}</td>
        <td class="mr-num">${fmt(c.finalField)}</td>
        <td class="mr-num">${i===0?'—':pctStr(pctVs(c.finalField, cols[0].finalField))}</td>
      </tr>`).join('');

      const groupRows = oldSummary.byGroup.map((g,i) => {
        const oldV = g.field, cceV = cceSummary.byGroup[i].field, cntV = cntSummary.byGroup[i].field;
        return `<tr><td>${esc(g.label)}</td>
          <td class="mr-num">${fmt(oldV)}</td>
          <td class="mr-num">${fmt(cceV)} <span class="mr-soft">${pctStr(pctVs(cceV, oldV))}</span></td>
          <td class="mr-num">${fmt(cntV)} <span class="mr-soft">${pctStr(pctVs(cntV, oldV))}</span></td>
        </tr>`;
      }).join('');

      const capRows = CAPS.map(cap => `<tr>${cap===DEFAULT_CAP?'<td><b>':'<td>'}Top ${cap}${cap===DEFAULT_CAP?' (current default)</b>':''}</td>
        <td class="mr-num">${fmt(capSummaries[cap].finalField)}</td>
        <td class="mr-num">${pctStr(pctVs(capSummaries[cap].finalField, cols[0].finalField))}</td></tr>`).join('');

      // Financials, in the same two-part shape as the athlete-count sections
      // above: a headline bar-chart on the one number that matters most
      // (what USA Diving actually keeps), then every line of the breakdown.
      // finance was already computed by summariseRouting() for all three
      // systems -- same "already there, just never rendered" situation as
      // byGroup was.
      const usdSigned = v => (v < 0 ? '\u2212' + usd(Math.abs(v)) : usd(v));
      const maxUsad = Math.max(...cols.map(c => c.finance ? c.finance.usad : 0));
      const finHeadlineRows = cols.map((c,i) => {
        const v = c.finance ? c.finance.usad : null;
        return `<tr>
          <td><b>${esc(c.label)}</b>${i===2?` <span class="mr-soft">(E/W/C final cap = ${DEFAULT_CAP})</span>`:''}</td>
          <td style="width:32%">${v!=null ? bar(v, maxUsad, i===0?SKY:(i===1?POOL:NAVY)) : ''}</td>
          <td class="mr-num mono">${v!=null ? usdSigned(v) : '—'}</td>
          <td class="mr-num">${i===0 || v==null ? '—' : pctStr(pctVs(v, cols[0].finance ? cols[0].finance.usad : null))}</td>
        </tr>`;
      }).join('');

      const pctVsSigned = (v, base) => (base == null || Math.abs(base) < 0.5) ? null
        : (100*(Math.abs(v)-Math.abs(base))/Math.abs(base));
      const finRow = (label, get) => {
        const oldV = cols[0].finance ? get(cols[0].finance) : null;
        return `<tr><td>${esc(label)}</td>` + cols.map((c,i) => {
          const v = c.finance ? get(c.finance) : null;
          if (v == null) return '<td class="mr-num">—</td>';
          const pct = i===0 ? '' : ` <span class="mr-soft">${pctStr(pctVsSigned(v, oldV))}</span>`;
          return `<td class="mr-num mono">${usdSigned(v)}${pct}</td>`;
        }).join('') + '</tr>';
      };

      return `<section class="mr-section">
        <h2 class="mr-h2">New Junior Circuit — old vs. proposed</h2>
        <div class="mr-scenario-badge"><span class="mr-sb-label">Comparing</span>
          <span class="mr-sb-name">${cols.map(c=>esc(c.label)).join(' &nbsp;vs&nbsp; ')}</span></div>
        <p class="mr-note"><b>How to read this.</b> "Today's real system" is the 2026 season as it actually ran:
          12 Regions → 6 Zones → East/Central/West → Junior Nationals, real entries, real results. Both proposals
          replace that with 9 Zones feeding East/Central/West directly — no Regional round. CCE's proposal sends
          the top 12 from each Zone to E/W/C and the top 9 from each E/W/C meet straight to Nationals. The
          counter-proposal sends the top 15/16 from each Zone to an E/W/C <em>prelim</em>: the top 8 of that
          qualify straight to Nationals, places 9\u201324 continue to an E/W/C <em>final</em>, and the top of that
          final also qualifies — currently set to the top ${DEFAULT_CAP}. The two proposals sit on the identical
          9-zone map, so every difference between them below is the rule, not the geography. Volume for both
          is the real 2026 Zone-level field, redrawn onto that map — no invented numbers.</p>
        <p class="mr-note mr-soft"><b>Computed from:</b>
          "${esc(byId[OLD_SEED_ID].name)}" (${esc(OLD_SEED_ID)}, saved ${esc(String(byId[OLD_SEED_ID].updatedAt||'').slice(0,16).replace('T',' '))} UTC) ·
          "${esc(byId[CCE_ID].name)}" (${esc(CCE_ID)}, saved ${esc(String(byId[CCE_ID].updatedAt||'').slice(0,16).replace('T',' '))} UTC) ·
          "${esc(byId[COUNTER_ID].name)}" (${esc(COUNTER_ID)}, saved ${esc(String(byId[COUNTER_ID].updatedAt||'').slice(0,16).replace('T',' '))} UTC).
          Report generated ${esc(new Date().toISOString().slice(0,16).replace('T',' '))} UTC. If any of these three
          scenarios has been edited since the timestamp shown for it, the numbers above no longer reflect what's
          currently saved — regenerate this section rather than trust a printed copy.</p>

        <h3 class="mr-h3">Junior Nationals prelim field</h3>
        <table class="mr-table"><thead><tr><th scope="col">System</th><th scope="col"></th>
          <th scope="col" class="mr-num">Athletes</th><th scope="col" class="mr-num">vs. today</th></tr></thead>
          <tbody>${headlineRows}</tbody></table>

        <h3 class="mr-h3">By age group and gender</h3>
        <table class="mr-table"><thead><tr><th scope="col">Group</th>
          <th scope="col" class="mr-num">Today</th><th scope="col" class="mr-num">CCE proposal</th>
          <th scope="col" class="mr-num">Counter-proposal</th></tr></thead>
          <tbody>${groupRows}</tbody></table>
        <p class="mr-note">Percentages are each proposal against today's real field for that group, not against
          the other proposal.</p>

        <h3 class="mr-h3">Counter-proposal — sensitivity to the E/W/C final cap</h3>
        <p class="mr-p">The cap on how many qualify out of the E/W/C final is not yet decided. This is the whole
          field's sensitivity to that one number, everything else held the same.</p>
        <table class="mr-table mr-table-sm"><thead><tr><th scope="col">E/W/C final qualifiers</th>
          <th scope="col" class="mr-num">Nationals field</th><th scope="col" class="mr-num">vs. today</th></tr></thead>
          <tbody>${capRows}</tbody></table>

        <h3 class="mr-h3">USA Diving keeps (entry fees only)</h3>
        <table class="mr-table"><thead><tr><th scope="col">System</th><th scope="col"></th>
          <th scope="col" class="mr-num">Net to USA Diving</th><th scope="col" class="mr-num">vs. today</th></tr></thead>
          <tbody>${finHeadlineRows}</tbody></table>
        <p class="mr-note">Priced at today's standing fee card for all three systems — the same card CCE and the
          counter-proposal are already compared under — so a financial difference below is caused by how many
          athletes and meets the rules produce, not by a different fee schedule. This is not what 2026 actually
          collected under the old rules; it is what today's fee card would collect on that old structure's field,
          held constant on purpose so the comparison isolates the rule change.</p>

        <h3 class="mr-h3">Financial breakdown</h3>
        <table class="mr-table"><thead><tr><th scope="col">&nbsp;</th>
          <th scope="col" class="mr-num">Today</th><th scope="col" class="mr-num">CCE proposal</th>
          <th scope="col" class="mr-num">Counter-proposal</th></tr></thead><tbody>
          ${finRow('Entry income (gross)', f=>f.gross)}
          ${finRow('DiveMeets pass-through', f=>-f.levy)}
          ${finRow('To hosts', f=>f.host)}
          ${finRow('USA Diving keeps', f=>f.usad)}
        </tbody></table>
        <p class="mr-note">Membership dues, synchro and the senior circuit are not here — entry fees only, same
          as every other financial comparison in this report family.</p>

        <p class="mr-note mr-warn"><b>What this is and is not.</b> This projects real 2026 entry volume through
          each rule set on the same map — it is not a prediction of who will actually enter under a new circuit,
          and it does not yet account for behaviour change (a bigger or smaller field can itself change how many
          athletes choose to compete). Today's system starts its count at Regionals because Regions exist there;
          both proposals start at Zones because Regions do not exist in either. That is a real structural
          difference between old and new, not a gap in the comparison. The financial figures carry the same
          caveat: they are entry-fee volume under today's rate card, not a revenue forecast.</p>
      </section>`;
    }
  },

  boundary_zips: {
    label: 'Realignment — zip code appendix', group: 'Boundary Studio',
    desc: 'Every zip code in every area with its member count — the appendix a rulebook edit needs.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — zip code appendix');
      const {P} = groupProfiles();
      const blocks = P.map(g => {
        const rows = g.zips.map(z => `<tr><td class="mr-mono">${esc(z.zip)}</td>
          <td>${esc(z.county)}</td><td>${esc(z.st)}</td><td class="mr-num">${fmt(z.n)}</td></tr>`).join('');
        return `<h3 class="mr-h3"><span class="mr-sw" style="background:${g.color}"></span>${esc(g.name)}
          <span class="mr-soft">— ${fmt(g.zips.length)} zip codes, ${fmt(g.m)} members</span></h3>
          <table class="mr-table mr-table-sm mr-zip"><thead><tr><th scope="col">Zip</th><th scope="col">County</th><th scope="col">State</th>
            <th scope="col" class="mr-num">Members</th></tr></thead><tbody>${rows ||
            '<tr><td colspan="4">No zip codes with members.</td></tr>'}</tbody></table>`;
      }).join('');
      return `<section class="mr-section">
        <h2 class="mr-h2">Realignment — zip code appendix</h2>
        ${scenarioLine()}
        <p class="mr-p">Only zip codes containing at least one member are listed. Zip codes are assigned
        by geocoding the member's zip to a point and testing which county polygon contains it, so a zip
        straddling a county line lands wholly in one county.</p>
        ${blocks}
      </section>`;
    }
  },

};

/* deviation helpers */
function devClass(v, equal){ if (!equal) return ''; const d=(v-equal)/equal; return d>0.05?'mr-over':(d<-0.05?'mr-under':''); }
function signPct(p){ const v=100*p; return (v>0?'+':'') + v.toFixed(1) + '%'; }
function signNum(d){ return (d>0?'+':'') + fmt(Math.round(d)); }
function devBar(d, maxAbs){
  const w = maxAbs>0 ? Math.min(50, Math.abs(d)/maxAbs*50) : 0;
  const side = d >= 0
    ? `left:50%;width:${w}%;background:${POOL}`
    : `right:50%;width:${w}%;background:${NAVY}`;
  return `<span class="mr-devbar"><span class="mr-devbar-mid"></span>
          <span class="mr-devbar-f" style="${side}"></span></span>`;
}

/* ===================================================================
   COMPETITIVE EQUITY
   The question a realignment is actually judged on is not "are the areas
   the same size" but "does an athlete in one area need a better score to
   advance than an athlete in another". Regionals advance the top 15 per
   springboard event, so the 15th-place score IS the bar, and it is
   directly measurable from historical results.

   For a PROPOSED map, qual-data.json's cellsByCounty carries each athlete's
   real historical score under their home county, so every county the
   current map assigns to an area contributes its own field directly --
   no estimation, since a county belongs to exactly one area (this used to
   pool fractional shares of whole regions before qual-data.json learned to
   carry county; see git history on pooledCut if that estimation logic is
   ever needed again). Merging counties into one area correctly raises the
   bar: the same athletes now compete for one set of 15 places instead of
   several.
   =================================================================== */
let _qual = null, _qualLoading = null;
function loadQual(){
  if (_qual) return Promise.resolve(_qual);
  if (_qualLoading) return _qualLoading;
  _qualLoading = fetch('qual-data.json?v=202607242330')
    .then(r => { if (!r.ok) throw new Error('qual-data.json ' + r.status); return r.json(); })
    .then(j => { _qual = j; return j; });
  return _qualLoading;
}
let _autoFips = null;
function loadAutoFips(){
  if (_autoFips) return Promise.resolve(_autoFips);
  return fetch('auto-data.json?v=202607242100').then(r=>r.json())
    .then(j => { _autoFips = j; return j; });
}

/* Sum every county's real per-year score lists directly into whichever area
   the CURRENT map assigns it to. No share/overlap estimation needed now that
   qual-data.json is itself keyed by county: a county belongs to exactly one
   area, unlike a region, which used to have to be split fractionally by
   population share. Simpler and exact where the old method was an estimate. */
function pooledCutByCounty(Q, cellKey, areaIndex, rank){
  const api = B(), assign = api.assign(), regions = api.regions(), TG = api.tierGroups();
  const cell = Q.cellsByCounty && Q.cellsByCounty[cellKey];
  if (!cell) return null;
  const pool = [];
  let contributingCounties = 0;
  for (const [fips, byYear] of Object.entries(cell)){
    const ri = assign[fips];
    if (ri == null || ri < 0 || ri >= regions.length) continue;
    const a = TG.of[ri];
    if (a !== areaIndex) continue;
    const years = Object.keys(byYear);
    if (!years.length) continue;
    contributingCounties++;
    // Average the per-year field so one unusually deep season cannot dominate.
    const perYear = years.map(yr => byYear[yr]);
    const longest = perYear.reduce((x,y)=>x.length>=y.length?x:y);
    const avg = longest.map((_,i) => {
      const vals = perYear.map(l=>l[i]).filter(v=>v!=null);
      return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
    }).filter(v=>v!=null);
    pool.push(...avg);
  }
  if (pool.length < rank) return {cut:null, field:pool.length, counties:contributingCounties};
  pool.sort((a,b)=>b-a);
  return {cut: pool[rank-1], field: pool.length, counties: contributingCounties};
}

/* Today's actual bar per region, averaged across the stored years. Reads the
   region-keyed half of qual-data.json -- the same data that was there before
   this file also learned to carry county. */
function todaysCuts(Q, cellKey, rank){
  const cell = (Q.cellsByRegion || Q.cells || {})[cellKey]; if (!cell) return [];
  const out = [];
  for (const [rg, yrs] of Object.entries(cell)){
    const vals = Object.values(yrs).filter(l=>l.length>=rank).map(l=>l[rank-1]);
    if (vals.length) out.push({region:+rg, cut: vals.reduce((a,b)=>a+b,0)/vals.length});
  }
  return out.sort((a,b)=>a.cut-b.cut);
}

/* The real "how many advance out of this level" cutoff, read from whatever
   scenario is actually on screen -- not a number baked into qual-data.json
   at build time, which reflected the old top-15-from-Regions rule and has
   no way to know a proposal now advances a different number. A level can
   have more than one route leaving it (a prelim/final split sends some
   people straight through and others via a second round with a different
   cutoff); in that case there is no single clean "the bar," so this takes
   the widest cutoff among routes that actually leave the level -- the last
   rank with any path forward at all -- and flags that it's a simplification
   rather than silently presenting it as one clean rule. */
function realAdvanceRank(routing, level){
  const lvl = routing && routing[level];
  if (!lvl || !lvl.routes) return null;
  const outRoutes = lvl.routes.filter(r => r.to && r.to.level > level && r.hi != null);
  if (!outRoutes.length) return null;
  const QRr = window.QualRouting;
  const rounds = QRr ? QRr.roundsOf(lvl) : (lvl.rounds || []);
  const simple = rounds.length <= 1 && outRoutes.length === 1;
  return {rank: Math.max(...outRoutes.map(r => r.hi)), simple, routeCount: outRoutes.length};
}

const EQUITY_SECTIONS = {

  boundary_equity: {
    label: 'Realignment — competitive equity', group: 'Boundary Studio',
    desc: 'What score it actually takes to advance in each area, versus today. The fairness test that headcount cannot show.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — competitive equity');
      let Q;
      try { Q = await loadQual(); }
      catch(e){ return `<section class="mr-section"><h2 class="mr-h2">Realignment — competitive equity</h2>
        <p class="mr-p mr-warn">Could not load the historical results data: ${esc(String(e.message||e))}</p></section>`; }
      const api = B();
      const liveRank = realAdvanceRank(api.routing(), api.tierView());
      const rank = liveRank ? liveRank.rank : (Q.advanceRank || 15);
      const rankNote = !liveRank
        ? `<p class="mr-note mr-warn">This level has no route advancing to a later one under the pathway on
             screen, so there is no real "how many advance" figure to read here &mdash; showing the ${rank}th
             place bar from the underlying data file instead. Switch to a level that actually advances
             somewhere before trusting the numbers below.</p>`
        : !liveRank.simple
        ? `<p class="mr-note">This level sends people forward through ${liveRank.routeCount} different routes
             (for example, a prelim/final split), so there is no single cutoff rank in the strict sense. The
             ${rank}th place score below is the widest cutoff among those routes &mdash; the last rank with any
             path forward at all, not a claim that everyone in ${esc(fmt(rank))}th place actually advances.</p>`
        : '';
      const TG = api.tierGroups();
      const nA = TG.groups.length;
      const names = TG.groups.map((g,i)=>g.name || ('Area '+(i+1)));

      const events = Object.keys(Q.cellsByRegion || Q.cells || {})
        .filter(k => !/Platform$/.test(k))
        .sort();

      // Today's inequity, worst events first.
      const todayRows = events.map(k => {
        const cuts = todaysCuts(Q, k, rank);
        if (cuts.length < 2) return null;
        const lo = cuts[0], hi = cuts[cuts.length-1];
        return {k, lo, hi, gap: hi.cut - lo.cut, n: cuts.length};
      }).filter(Boolean).sort((a,b)=>b.gap-a.gap);

      const todayTable = todayRows.slice(0, 12).map(r => {
        const [ag, gd, dc] = r.k.split('|');
        return `<tr><td>${esc(ag)} ${esc(gd)} ${esc(dc)}</td>
          <td class="mr-num">${r.lo.cut.toFixed(1)}</td><td>R${r.lo.region}</td>
          <td class="mr-num">${r.hi.cut.toFixed(1)}</td><td>R${r.hi.region}</td>
          <td class="mr-num mr-over">+${r.gap.toFixed(1)}</td>
          <td class="mr-num">${(100*r.gap/r.lo.cut).toFixed(0)}%</td></tr>`;
      }).join('');

      // Proposed map: bar per area for the worst few events, pooled directly
      // from every county the current map assigns to that area.
      const focus = todayRows.slice(0, 6).map(r => r.k);
      const propBlocks = focus.map(k => {
        const [ag, gd, dc] = k.split('|');
        const rows = [];
        for (let a=0;a<nA;a++){
          const res = pooledCutByCounty(Q, k, a, rank);
          rows.push({a, res});
        }
        const valid = rows.filter(r=>r.res && r.res.cut != null);
        if (valid.length < 2) return '';
        const cuts = valid.map(r=>r.res.cut);
        const lo = Math.min(...cuts), hi = Math.max(...cuts);
        const today = todayRows.find(r=>r.k===k);
        const body = rows.map(r => {
          if (!r.res || r.res.cut == null)
            return `<tr><td>${esc(names[r.a])}</td><td class="mr-num">&mdash;</td>
              <td class="mr-num">${r.res?fmt(r.res.field):'0'}</td>
              <td colspan="2" class="mr-soft">field too small to fill ${rank} places</td></tr>`;
          const rel = (r.res.cut - lo);
          return `<tr><td>${esc(names[r.a])}</td>
            <td class="mr-num">${r.res.cut.toFixed(1)}</td>
            <td class="mr-num">${fmt(r.res.field)}</td>
            <td style="width:28%">${bar(r.res.cut-lo, Math.max(1,hi-lo), r.res.cut>=hi-1e-9?RED:POOL)}</td>
            <td class="mr-num ${rel>0?'mr-over':''}">${rel>0?'+'+rel.toFixed(1):'lowest bar'}</td></tr>`;
        }).join('');
        return `<h3 class="mr-h3">${esc(ag)} ${esc(gd)} ${esc(dc)}</h3>
          <p class="mr-p">Estimated score needed for ${rank}th place under this map:
            <b>${lo.toFixed(1)}</b> in the easiest area to <b>${hi.toFixed(1)}</b> in the hardest
            &mdash; a spread of <b>${(hi-lo).toFixed(1)}</b> points.
            ${today ? `Today that spread is <b>${today.gap.toFixed(1)}</b> points.
              ${(hi-lo) < today.gap
                 ? `<span class="mr-up">This map narrows it by ${(today.gap-(hi-lo)).toFixed(1)}.</span>`
                 : `<span class="mr-down">This map widens it by ${((hi-lo)-today.gap).toFixed(1)}.</span>`}` : ''}</p>
          <table class="mr-table mr-table-sm"><thead><tr><th scope="col">Area</th>
            <th scope="col" class="mr-num">Bar to advance</th><th scope="col" class="mr-num">Field size</th>
            <th scope="col">&nbsp;</th><th scope="col" class="mr-num">vs easiest</th></tr></thead>
            <tbody>${body}</tbody></table>`;
      }).join('');

      const rc = (function(){
        const byYear = Q.regionChoice && Q.regionChoice.regionals;
        if (!byYear) return null;
        const yrs = (Q.years||[]).map(String).filter(y => byYear[y]);
        if (!yrs.length) return null;
        const athletes = yrs.reduce((s,y)=>s+(byYear[y].athletes||0), 0);
        const away = yrs.reduce((s,y)=>s+(byYear[y].competing_away||0), 0);
        const clubs = Math.max(...yrs.map(y=>byYear[y].clubs||0));
        const clubsSplit = Math.max(...yrs.map(y=>byYear[y].clubs_split||0));
        if (!athletes) return null;
        return {
          athletes, competing_away: away, leakage_pct: Math.round(away/athletes*1000)/10,
          clubs, clubs_split: clubsSplit,
          clubs_split_pct: clubs ? Math.round(clubsSplit/clubs*1000)/10 : 0,
          years: yrs,
        };
      })();
      const regionChoiceBlock = rc ? `
        <h3 class="mr-h3">Region choice — how much the map itself explains</h3>
        <p class="mr-p">An athlete may begin the pathway in any region and must then stay in that
          region's route. Every number above assumes people compete where the map sends them; this
          is how often that assumption doesn't hold, measured against each club's own usual region
          rather than any drawn boundary, so it can't be circular.</p>
        <table class="mr-table mr-table-sm"><tbody>
          <tr><td>Athletes competing outside their club's usual region</td>
            <td class="mr-num">${rc.leakage_pct}%</td><td class="mr-soft">${fmt(rc.competing_away)} of ${fmt(rc.athletes)}</td></tr>
          <tr><td>Clubs whose athletes don't all go to one region</td>
            <td class="mr-num">${rc.clubs_split_pct}%</td><td class="mr-soft">${fmt(rc.clubs_split)} of ${fmt(rc.clubs)} clubs</td></tr>
        </tbody></table>
        <p class="mr-note">A modest overall rate can still move a specific bar substantially where a
          handful of strong athletes cluster near the cutoff — this is a real, rule-permitted pattern,
          not noise to average away, and it's the honest reason today's-bar and under-this-map numbers
          above can diverge from what a purely geographic model would predict.</p>` : '';

      return `<section class="mr-section">
        <h2 class="mr-h2">Realignment — competitive equity</h2>
        ${scenarioLine()}
        <p class="mr-p">Headcount does not tell you whether a structure is fair. What an athlete
        experiences is the score they must post to get out of ${esc((api.levels()[api.tierView()] && api.levels()[api.tierView()].name) || 'this stage')}, and the top
        ${rank} advance. That bar is directly measurable.</p>
        ${rankNote}
        <div class="mr-note"><b>Scope of this section — read before using any number below.</b>
          <ul style="margin:6px 0 0 16px;padding:0">
            <li><b>Gate modelled:</b> ${esc(Q.scope || '')}</li>
            <li><b>Years used:</b> ${esc(Q.basis || '')}</li>
            <li><b>Excluded:</b> ${esc(Q.exclusions || '')}</li>
            ${Q.matchRate!=null ? `<li><b>Matched to a home county:</b> ${Q.matchRate}% of qualifying
              results &mdash; the rest could not be attributed to a membership record with a zip code
              and are excluded from the "under this map" estimate below, though not from the "today"
              table, which uses the region already on record.</li>` : ''}
            <li><b>If this structure has no Regions:</b> these figures are still built from Regionals-level
              historical scores, because that is the historical data that exists. Neither new-circuit
              proposal has a Regionals stage &mdash; the actual first gate becomes Zone &rarr; E/W/C. Using
              Regionals scores as the stand-in is reasonable because dive lists are unchanged, but it is a
              real interpretive step: this section estimates what the bar would have looked like at the old
              first gate if it were redrawn, not a direct measurement of the new first gate. The cutoff rank
              used throughout (top ${rank}) is read from the pathway on screen's own advancement rule for
              this stage, not a fixed historical constant, so it matches whatever the scenario actually says.</li>
          </ul>
          Every figure here is computed from those fields and nothing else. Gates beyond Regionals
          &mdash; Zones to Nationals, and the E/W/C stage &mdash; are <b>not</b> modelled, so this
          section says nothing about them.</div>

        <h3 class="mr-h3">Today's inequity — the bar to advance, by region</h3>
        <p class="mr-p">Average ${rank}th-place score in each region's own Regionals field,
        ${esc((Q.years||[]).join(' and '))}. Only fields meeting the exclusions above are counted.</p>
        <table class="mr-table mr-table-sm"><thead><tr><th scope="col">Event</th>
          <th scope="col" class="mr-num">Easiest bar</th><th scope="col">Where</th>
          <th scope="col" class="mr-num">Hardest bar</th><th scope="col">Where</th>
          <th scope="col" class="mr-num">Gap</th><th scope="col" class="mr-num">Harder by</th></tr></thead>
          <tbody>${todayTable}</tbody></table>
        ${todayRows[0] ? `<p class="mr-note"><b>Largest measured gap:</b>
          ${esc(todayRows[0].k.split('|').join(' '))} &mdash; ${todayRows[0].lo.cut.toFixed(1)} in
          Region ${todayRows[0].lo.region} against ${todayRows[0].hi.cut.toFixed(1)} in Region
          ${todayRows[0].hi.region}, a difference of ${todayRows[0].gap.toFixed(1)} points
          (${(100*todayRows[0].gap/todayRows[0].lo.cut).toFixed(0)}%). This compares the
          ${rank}th-place score in each region's own field across ${esc((Q.years||[]).join(' and '))};
          it is not a statement about any individual athlete.</p>` : ''}
        ${regionChoiceBlock}

        <h3 class="mr-h3">Under this map — estimated bar to advance</h3>
        <p class="mr-p">Every county the current map assigns to an area contributes its own real
        historical field directly &mdash; no fractional overlap or sampling, since a county belongs to
        exactly one area. This works for any structure, including one with no Regions at all.
        Combining counties into fewer, larger areas correctly raises the bar, because the same
        athletes then compete for one set of ${rank} places instead of several.</p>
        ${propBlocks || '<p class="mr-p mr-warn">Not enough counties with usable history fall inside this map to estimate.</p>'}
        <p class="mr-note"><b>What this is and is not:</b> an estimate built from
        ${esc((Q.years||[]).join(' and '))} Regionals results, keyed to each athlete's home county and
        assuming the same athletes competing under different boundaries. It cannot predict who will
        actually enter, it says nothing about athletes who change clubs, and it models only the
        Regionals gate. The region-choice figures above are the honest measure of how far that
        assumption can be wrong. Treat it as the relative ordering of areas, not a forecast of any
        score.</p>
      </section>`;
    }
  },

  boundary_map: {
    label: 'Realignment — maps by stage', group: 'Boundary Studio',
    desc: 'A colour-coded map of every stage in the structure, each with its own breakdown.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — maps by stage');
      const api = B(), geo = api.geo(), y = api.year();
      const assign = api.assign(), regions = api.regions();
      const nLev = api.levelCount ? api.levelCount() : 1;
      const counties = geo.counties;
      const FALLBACK = [NAVY, RED, POOL, SKY, '#6d28d9', '#047857', '#b45309', '#9d174d',
                        '#0e7490', '#4d7c0f', '#7c2d12', '#1e40af'];

      const blocks = [];
      for (let L = 0; L < nLev; L++){
        const TG = api.tierGroupsAt(L);
        const of = TG.of, nG = TG.groups.length;
        const colorOf = gi => {
          const g = TG.groups[gi];
          if (g && g.colors && g.colors.length && g.colors[0]) return g.colors[0];
          return FALLBACK[gi % FALLBACK.length];
        };
        const nameOf = gi => (TG.groups[gi] && TG.groups[gi].name) || ('Area ' + (gi+1));

        // Every county in a group shares one fill, so their outlines are merged
        // into a single path per group. That keeps a three-stage report to a few
        // dozen path elements instead of three copies of 3,142.
        const dParts = Array.from({length:nG}, ()=>[]);
        const unParts = [];
        const stat = Array.from({length:nG}, ()=>({m:0,a:0,c:0,cl:new Set(),n:0}));
        let unM = 0, unN = 0;
        for (const c of counties){
          const ri = assign[c.f];
          const gi = (ri != null && ri >= 0 && ri < regions.length) ? of[ri] : null;
          if (gi == null || gi < 0 || gi >= nG){ unParts.push(c.d); unN++; }
          else { dParts[gi].push(c.d); stat[gi].n++; }
        }
        for (const [fips, st] of Object.entries(geo.stats)){
          const v = st[y]; if (!v) continue;
          const ri = assign[fips];
          const gi = (ri != null && ri >= 0 && ri < regions.length) ? of[ri] : null;
          if (gi == null || gi < 0 || gi >= nG){ unM += v.m; continue; }
          stat[gi].m += v.m; stat[gi].a += v.a; stat[gi].c += v.c;
          (v.cl||[]).forEach(i => stat[gi].cl.add(i));
        }

        const paths = dParts.map((parts, gi) => parts.length
          ? `<path d="${parts.join('')}" fill="${colorOf(gi)}" stroke="#ffffff" stroke-width="0.3"/>` : '')
          .join('') +
          (unParts.length ? `<path d="${unParts.join('')}" fill="#e2e8f2" stroke="#ffffff" stroke-width="0.3"/>` : '');
        const svg = `<svg viewBox="${esc(geo.viewBox || '0 0 975 610')}" class="mr-stagemap">
            ${paths}
            <path d="${geo.stateMesh}" fill="none" stroke="#ffffff" stroke-width="0.9"/>
            <path d="${geo.nationMesh}" fill="none" stroke="#94a3b8" stroke-width="0.7"/>
          </svg>`;

        const total = stat.reduce((s2,x)=>s2+x.m, 0);
        const mean = nG ? total/nG : 0;
        const maxM = Math.max(1, ...stat.map(x=>x.m));
        const rows = stat.map((x,gi) => `<tr>
            <td><span class="mr-sw" style="background:${colorOf(gi)}"></span>${esc(nameOf(gi))}</td>
            <td class="mr-num">${fmt(x.m)}</td>
            <td style="width:18%">${bar(x.m, maxM, colorOf(gi))}</td>
            <td class="mr-num">${fmt(x.a)}</td><td class="mr-num">${fmt(x.c)}</td>
            <td class="mr-num">${fmt(x.cl.size)}</td><td class="mr-num">${fmt(x.n)}</td>
            <td class="mr-num">${pctS(x.m, total)}</td>
            <td class="mr-num ${devClass(x.m, mean)}">${mean>0 ? signPct((x.m-mean)/mean) : '—'}</td>
          </tr>`).join('');
        const sd = nG ? Math.sqrt(stat.reduce((s2,x)=>s2+(x.m-mean)*(x.m-mean),0)/nG) : 0;
        const mins = Math.min(...stat.map(x=>x.m)), maxs = Math.max(...stat.map(x=>x.m));
        const key = stat.map((x,gi) => `<span class="mr-mapkey"><span class="mr-sw" style="background:${colorOf(gi)}"></span>
          ${esc(nameOf(gi))} <span class="mr-soft">${fmt(x.m)}</span></span>`).join('');

        blocks.push(`<div class="mr-stage">
          <h3 class="mr-h3">${esc(api.tierName(L))} &mdash; ${nG} area${nG===1?'':'s'}</h3>
          <p class="mr-p">Average ${fmt(Math.round(mean))} members ·
            smallest ${fmt(mins)} to largest ${fmt(maxs)} ·
            largest &divide; smallest ${mins>0 ? (maxs/mins).toFixed(2)+'\u00d7' : '—'} ·
            spread ${mean>0 ? (100*sd/mean).toFixed(1) : '0.0'}%</p>
          <div class="mr-map">${svg}</div>
          <div class="mr-mapkeys">${key}</div>
          <table class="mr-table mr-table-sm"><thead><tr><th scope="col">Area</th>
            <th scope="col" class="mr-num">Members</th><th scope="col">&nbsp;</th><th scope="col" class="mr-num">Athletes</th>
            <th scope="col" class="mr-num">Coaches</th><th scope="col" class="mr-num">Clubs</th>
            <th scope="col" class="mr-num">Counties</th><th scope="col" class="mr-num">Share</th>
            <th scope="col" class="mr-num">Deviation</th></tr></thead><tbody>${rows}</tbody></table>
          ${unM > 0 && L === 0 ? `<p class="mr-note">${fmt(unM)} members sit in ${fmt(unN)}
            unassigned counties, shown pale grey and excluded from every figure above.</p>` : ''}
        </div>`);
      }

      return `<section class="mr-section">
        <h2 class="mr-h2">Realignment — maps by stage</h2>
        ${scenarioLine()}
        <p class="mr-p">One map per stage of the structure, in the colours used on screen, each with
        the breakdown for that stage. Counties are shaded by the area they belong to at that level;
        pale grey means unassigned.</p>
        ${blocks.join('')}
      </section>`;
    }
  },

  boundary_club_moves: {
    label: 'Realignment — which clubs move', group: 'Boundary Studio',
    desc: 'Every club that changes area, with where it goes. The first thing a regional chair will ask for.',
    build: async function(o){
      if (!boundaryReady()) return notReady('Realignment — which clubs move');
      let Q, AD;
      try { [Q, AD] = await Promise.all([loadQual(), loadAutoFips()]); }
      catch(e){ return `<section class="mr-section"><h2 class="mr-h2">Realignment — which clubs move</h2>
        <p class="mr-p mr-warn">Could not load reference data: ${esc(String(e.message||e))}</p></section>`; }
      const api = B(), geo = api.geo(), y = api.year();
      const assign = api.assign(), regions = api.regions(), TG = api.tierGroups();
      const clubs = api.clubs();
      const names = TG.groups.map((g,i)=>g.name || ('Area '+(i+1)));
      const offByFips = {}; AD.fips.forEach((f,i)=>offByFips[f]=Q.officialRegion[i]);

      // A club can appear in several counties; attribute it to where most of
      // its members are, weighting each county by its membership.
      const acc = {};
      for (const [fips, st] of Object.entries(geo.stats)){
        const v = st[y]; if (!v || !v.cl) continue;
        const ri = assign[fips];
        const a = (ri != null && ri >= 0 && ri < regions.length) ? TG.of[ri] : null;
        const off = offByFips[fips] || 0;
        for (const ci of v.cl){
          const e = acc[ci] = acc[ci] || {m:0, area:{}, off:{}};
          e.m += v.m;
          if (a != null) e.area[a] = (e.area[a]||0) + v.m;
          if (off) e.off[off] = (e.off[off]||0) + v.m;
        }
      }
      const top = obj => { let bk=null,bv=-1; for(const [k,v] of Object.entries(obj||{})) if(v>bv){bv=v;bk=k;} return bk; };
      const rows = [];
      for (const [ci, e] of Object.entries(acc)){
        const a = top(e.area), off = top(e.off);
        if (a == null) continue;
        rows.push({name: clubs[ci] || ('club #'+ci), m: e.m,
                   from: off ? ('Region '+off) : 'not in published map',
                   to: names[+a], moved: off ? (names[+a] !== ('Region '+off)) : true});
      }
      rows.sort((x,y2)=>y2.m-x.m);
      const movers = rows.filter(r=>r.moved);
      const stay = rows.length - movers.length;
      const body = movers.slice(0, o.topN || 60).map(r =>
        `<tr><td>${esc(r.name)}</td><td class="mr-num">${fmt(r.m)}</td>
         <td>${esc(r.from)}</td><td>${esc(r.to)}</td></tr>`).join('');
      return `<section class="mr-section">
        <h2 class="mr-h2">Realignment — which clubs move</h2>
        ${scenarioLine()}
        <div class="mr-kpis">
          <div class="mr-kpi"><div class="mr-kpi-v">${fmt(movers.length)}</div>
            <div class="mr-kpi-l">Clubs changing area</div>
            <div class="mr-kpi-s">out of ${fmt(rows.length)} with members on file</div></div>
          <div class="mr-kpi"><div class="mr-kpi-v">${fmt(stay)}</div>
            <div class="mr-kpi-l">Clubs staying put</div>
            <div class="mr-kpi-s">${pctS(stay, rows.length)} of all clubs</div></div>
        </div>
        <table class="mr-table mr-table-sm"><thead><tr><th scope="col">Club</th>
          <th scope="col" class="mr-num">Members nearby</th><th scope="col">Today</th><th scope="col">Proposed</th></tr></thead>
          <tbody>${body || '<tr><td colspan="4">No club changes area under this map.</td></tr>'}</tbody></table>
        <p class="mr-note">A club is placed where most of its members live. Clubs drawing members
        across a county line may show a move that only affects part of their roster, so treat this as
        the list to consult rather than the final word.</p>
      </section>`;
    }
  },

};
Object.assign(BOUNDARY_SECTIONS, EQUITY_SECTIONS);

Object.assign(SECTIONS, BOUNDARY_SECTIONS);
/* =====================================================================
   TEMPLATES — curated section sequences for the deliverables staff
   actually get asked for.
   ===================================================================== */
const TEMPLATES = [
  { id:'board_update', label:'Board Update',
    desc:'Concise membership position for the Board — headline numbers, mix, age profile and renewal.',
    sections:['exec_summary','membership_mix','age_profile','retention'], years:[2024,2025,2026] },

  { id:'year_review', label:'Membership Year in Review',
    desc:'The full annual picture: totals, mix, ages, geography, retention, clubs and the sales ledger.',
    sections:['exec_summary','membership_mix','age_profile','geography_assoc','geography_state',
              'retention','clubs','sales_ledger'], years:[2024,2025,2026] },

  { id:'retention_deep', label:'Retention Deep Dive',
    desc:'Where members are being lost — by age group, association and club — and the win-back picture.',
    sections:['retention','age_profile','geography_assoc','clubs'], years:[2024,2025,2026] },

  { id:'competitive_landscape', label:'Competitive Landscape (AAU)',
    desc:'AAU versus USA Diving meet volume alongside the membership footprint it competes for.',
    sections:['aau_landscape','geography_state','geography_assoc'], years:[2024,2025,2026] },

  { id:'club_health', label:'Club Health',
    desc:'Club-level scoreboard with association context and the retention picture behind it.',
    sections:['clubs','geography_assoc','retention'], years:[2024,2025,2026] },

  { id:'realignment_proposal', label:'Realignment Proposal',
    desc:'The full case: the map, size balance, what it takes to advance in each area, whether every meet fits, tier rollups and a profile of every area.',
    sections:['boundary_summary','boundary_map','boundary_overview','boundary_balance','boundary_equity',
              'boundary_pathway','boundary_schedule','boundary_circuit_delta','boundary_tiers','boundary_region_profiles'],
    years:[2025,2026], boundary:true },

  { id:'realignment_board', label:'Realignment — Board Packet',
    desc:'The lean decision document: a map and breakdown for every stage, how even the sizes are, what it takes to advance, and whether every meet this creates can actually be run. No appendices.',
    sections:['boundary_map','boundary_balance','boundary_equity','boundary_schedule','boundary_circuit_delta'], years:[2025,2026], boundary:true },

  { id:'realignment_equity', label:'Realignment — Fairness Case',
    desc:'The argument on competitive equity alone: what score it takes to advance today versus under this map.',
    sections:['boundary_map','boundary_equity','boundary_balance'], years:[2025,2026], boundary:true },

  { id:'realignment_compare', label:'Realignment — Before & After (full)',
    desc:'The complete case for the loaded scenario -- map, structure, balance, competitive equity, tier rollups, the full qualification pathway and its billing, and the full schedule -- plus every delta against the currently loaded comparison scenario: counties moved, members affected, and pathways and field sizes set side by side.',
    sections:['boundary_summary','boundary_map','boundary_overview','boundary_compare','boundary_club_moves',
              'boundary_balance','boundary_equity','boundary_tiers','boundary_pathway',
              'boundary_pathways_compared','boundary_schedule','boundary_circuit_delta'], years:[2025,2026], boundary:true },

  { id:'realignment_rulebook', label:'Realignment — Rulebook Appendix',
    desc:'The document a rulebook edit needs: area definitions, profiles, and the full zip code appendix.',
    sections:['boundary_summary','boundary_map','boundary_overview','boundary_region_profiles',
              'boundary_club_moves','boundary_zips'], years:[2025,2026], boundary:true },
];

/* =====================================================================
   BUILDER STATE + UI
   ===================================================================== */
const RB = {
  template: null,
  sections: new Set(),
  years: null,
  cats: [],
  assocs: [],
  states: [],
  topN: 25,
  optionsLoaded: false,
  assocOpts: [],
  stateOpts: [],
  scopeOpen: false,
};

function rbYears(){
  if (RB.years && RB.years.length) return RB.years.slice().sort();
  const t = TEMPLATES.find(t=>t.id===RB.template);
  return (t && t.years) ? t.years.slice() : [CUR_YEAR];
}
function rbOpts(){
  return { years: rbYears(), cats: RB.cats.slice(), assocs: RB.assocs.slice(),
           states: RB.states.slice(), topN: RB.topN };
}

async function loadFilterOptions(){
  if (RB.optionsLoaded) return;
  try {
    const [a, s] = await Promise.all([
      q(`SELECT COALESCE(association,'(none)') k, count(DISTINCT member_id) n
           FROM membership.members GROUP BY 1 ORDER BY 2 DESC`),
      q(`SELECT COALESCE(state,'??') k, count(DISTINCT member_id) n
           FROM membership.members GROUP BY 1 ORDER BY 1`),
    ]);
    RB.assocOpts = a.map(r=>r.k);
    RB.stateOpts = s.map(r=>r.k);
  } catch(e){ /* filters simply stay empty; sections still run unscoped */ }
  RB.optionsLoaded = true;
  if (document.getElementById('mr-modal')) renderBuilder();
}

function openBuilder(preset){
  RB.template = null; RB.sections = new Set(); RB.years = null;
  RB.cats = []; RB.assocs = []; RB.states = []; RB.scopeOpen = false;
  // '__boundary__' means "show me the map templates", not "pick one for me".
  // Landing already committed to the six-section Realignment Proposal is a
  // choice made on the reader's behalf, and it was not asked for.
  RB.mapFirst = (preset === '__boundary__');
  if (preset && preset !== '__boundary__') pickTemplate(preset, true);
  let m = document.getElementById('mr-modal');
  if (!m){ m = document.createElement('div'); m.id = 'mr-modal'; document.body.appendChild(m); }
  renderBuilder();
  loadFilterOptions();
}

function pickTemplate(id, silent){
  const t = TEMPLATES.find(x=>x.id===id);
  if (!t) return;
  RB.template = id;
  RB.sections = new Set(t.sections);
  RB.years = t.years.slice();
  if (!silent) renderBuilder();
}

/* Keeping your place across a redraw lives in shared/usad-keepplace.js. */

function renderBuilder(){
  const m = document.getElementById('mr-modal');
  if (!m) return;
  const place = keepPlace('mr-modal');
  const sel = rbYears();
  const canGo = RB.sections.size > 0;
  const groups = {};
  Object.entries(SECTIONS).forEach(([id,s]) => { (groups[s.group] = groups[s.group] || []).push([id,s]); });
  const bReady = boundaryReady();

  const sectionGroups = Object.entries(groups).map(([g, list]) => `
    <div class="mr-secgrp">
      <div class="mr-secgrp-h">${esc(g)}${g==='Boundary Studio' && !bReady
        ? ' <span class="mr-tag mr-tag-warn">open Boundary Studio first</span>' : ''}</div>
      <div class="mr-sections">
        ${list.map(([id,s]) => `
          <label class="mr-secopt ${RB.sections.has(id)?'is-on':''}">
            <input type="checkbox" ${RB.sections.has(id)?'checked':''}
                   onchange="window._mrToggleSection('${id}')">
            <div><div class="mr-secopt-n">${esc(s.label)}</div>
                 <div class="mr-secopt-d">${esc(s.desc)}</div></div>
          </label>`).join('')}
      </div>
    </div>`).join('');

  m.innerHTML = `
  <div class="mr-overlay" onclick="if(event.target===this)window._mrClose()">
    <div class="mr-dialog">
      <div class="mr-head">
        <div><div class="mr-eyebrow">USA Diving · Membership Analytics</div>
             <h2 class="mr-title">Build a Report</h2></div>
        <button class="mr-x" onclick="window._mrClose()" title="Close">✕</button>
      </div>
      <div class="mr-body">

        <div class="mr-step"><div class="mr-step-n">1</div><div class="mr-step-c">
          <div class="mr-step-h">Start from a template</div>
          <div class="mr-tmpls">
            ${TEMPLATES.map(t => `
              <button class="mr-tmpl ${RB.template===t.id?'is-on':''} ${t.boundary && !bReady ? 'is-dim':''} ${RB.mapFirst && t.boundary ? 'is-hint':''}"
                      data-tpl="${t.id}"
                      onclick="window._mrPickTemplate('${t.id}')">
                <div class="mr-tmpl-n">${esc(t.label)}</div>
                <div class="mr-tmpl-d">${esc(t.desc)}</div>
                <div class="mr-tmpl-s">${t.sections.length} sections${t.boundary?' · uses the live map':''}</div>
              </button>`).join('')}
          </div>
        </div></div>

        <div class="mr-step"><div class="mr-step-n">2</div><div class="mr-step-c">
          <div class="mr-step-h">Choose sections
            <span class="mr-soft">(${RB.sections.size} selected)</span></div>
          ${sectionGroups}
        </div></div>

        <div class="mr-step"><div class="mr-step-n">3</div><div class="mr-step-c">
          <div class="mr-step-h">Pick membership year(s)</div>
          <div class="mr-chips">
            ${ALL_YEARS.map(y => `<button class="mr-chip ${sel.includes(y)?'is-on':''}"
                onclick="window._mrToggleYear(${y})">${y}${y===CUR_YEAR?' (YTD)':''}</button>`).join('')}
            <button class="mr-chip" onclick="window._mrAllYears()">All years</button>
            <button class="mr-chip" onclick="window._mrCurrentYear()">Current only</button>
          </div>
          <div class="mr-soft" style="margin-top:6px">Boundary Studio sections always use the year
            selected on the map itself, not this setting.</div>
        </div></div>

        <div class="mr-step"><div class="mr-step-n">4</div><div class="mr-step-c">
          <div class="mr-step-h">Narrow the scope
            <span class="mr-soft">(optional — applies to every membership section)</span></div>
          <div class="mr-fgrp">
            <div class="mr-flbl">Membership category</div>
            <div class="mr-chips">
              ${CATS.map(c => `<button class="mr-chip sm ${RB.cats.includes(c)?'is-on':''}"
                onclick="window._mrToggleFilter('cats','${c}')">${c}</button>`).join('')}
            </div>
          </div>
          ${RB.scopeOpen ? `
            <div class="mr-fgrp">
              <div class="mr-flbl">Association <span class="mr-soft">(${RB.assocs.length||'all'})</span></div>
              <div class="mr-chips mr-scroll">
                ${RB.assocOpts.map(a => `<button class="mr-chip sm ${RB.assocs.includes(a)?'is-on':''}"
                  onclick="window._mrToggleFilter('assocs',${JSON.stringify(a).replace(/"/g,'&quot;')})">${esc(a)}</button>`).join('')
                  || '<span class="mr-soft">loading…</span>'}
              </div>
            </div>
            <div class="mr-fgrp">
              <div class="mr-flbl">State <span class="mr-soft">(${RB.states.length||'all'})</span></div>
              <div class="mr-chips mr-scroll">
                ${RB.stateOpts.map(a => `<button class="mr-chip sm ${RB.states.includes(a)?'is-on':''}"
                  onclick="window._mrToggleFilter('states',${JSON.stringify(a).replace(/"/g,'&quot;')})">${esc(a)}</button>`).join('')
                  || '<span class="mr-soft">loading…</span>'}
              </div>
            </div>
            <button class="mr-link" onclick="window._mrClearScope()">Clear all scope filters</button>`
          : `<button class="mr-link" onclick="window._mrOpenScope()">＋ Also narrow by association or state</button>`}
          <div class="mr-fgrp">
            <div class="mr-flbl">List length <span class="mr-soft">(clubs, associations, county moves)</span></div>
            <div class="mr-chips">
              ${[10,25,40,100].map(n => `<button class="mr-chip sm ${RB.topN===n?'is-on':''}"
                onclick="window._mrSetTopN(${n})">Top ${n}</button>`).join('')}
            </div>
          </div>
        </div></div>

      </div>
      <div class="mr-foot">
        <div class="mr-soft">Scope: <strong>${esc(scopeSummary(rbOpts()))}</strong> ·
          Years: ${esc(sel.join(', '))}</div>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="mr-btn" onclick="window._mrClose()">Cancel</button>
          <button class="mr-btn mr-btn-p ${canGo?'':'is-dim'}" ${canGo?'':'disabled'}
                  onclick="window._mrGenerate()">Generate report</button>
        </div>
      </div>
    </div>
  </div>`;
  keepRestore(place, 'mr-modal');
}

window._mrClose = function(){ const m=document.getElementById('mr-modal'); if (m) m.remove(); };
window._mrPickTemplate = function(id){ pickTemplate(id); };
window._mrToggleSection = function(id){
  if (RB.sections.has(id)) RB.sections.delete(id); else RB.sections.add(id);
  RB.template = null; renderBuilder();
};
window._mrToggleYear = function(y){
  const cur = rbYears().slice();
  const i = cur.indexOf(y);
  if (i >= 0) cur.splice(i,1); else cur.push(y);
  RB.years = cur.length ? cur : [CUR_YEAR];
  renderBuilder();
};
window._mrAllYears = function(){ RB.years = ALL_YEARS.slice(); renderBuilder(); };
window._mrCurrentYear = function(){ RB.years = [CUR_YEAR]; renderBuilder(); };
window._mrToggleFilter = function(key, val){
  const arr = RB[key];
  const i = arr.indexOf(val);
  if (i >= 0) arr.splice(i,1); else arr.push(val);
  renderBuilder();
};
window._mrOpenScope = function(){ RB.scopeOpen = true; renderBuilder(); loadFilterOptions(); };
window._mrClearScope = function(){ RB.cats=[]; RB.assocs=[]; RB.states=[]; renderBuilder(); };
window._mrSetTopN = function(n){ RB.topN = n; renderBuilder(); };

/* =====================================================================
   GENERATE — branded, print-ready document
   ===================================================================== */
window._mrGenerate = async function(){
  const ids = Array.from(RB.sections);
  if (!ids.length) return;
  const opts = rbOpts();
  const tmpl = TEMPLATES.find(t=>t.id===RB.template);
  const title = tmpl ? tmpl.label : 'Custom Membership Report';
  window._mrClose();

  const out = document.createElement('div');
  out.id = 'mr-output';
  out.innerHTML = `
    <div class="mr-toolbar">
      <button class="mr-print" onclick="window.print()">Print / save as PDF</button>
      <button onclick="document.getElementById('mr-output').remove()">✕ Close</button>
      <span class="mr-soft" style="margin-left:auto">Print to PDF for the cleanest result.
        Sized for US Letter.</span>
    </div>
    <div class="mr-doc">
      <div class="mr-doc-head">
        <h1>${esc(title)}</h1>
        <div class="mr-doc-sub">
          Generated: ${new Date().toLocaleString()}<br>
          Membership year(s): ${esc(opts.years.join(', '))}<br>
          Scope: <strong>${esc(scopeSummary(opts))}</strong><br>
          Sections: ${esc(ids.map(i => SECTIONS[i].label).join(' · '))}<br>
          Data source: live Neon — membership.members, membership.sales_ledger, divemeets.meets
        </div>
      </div>
      <div id="mr-doc-body">
        <div class="mr-soft">Building sections… <span id="mr-prog">0 / ${ids.length}</span></div>
      </div>
    </div>`;
  document.body.appendChild(out);

  let done = 0;
  const total = ids.length;
  const tick = () => { done++; const el = document.getElementById('mr-prog');
                       if (el) el.textContent = done + ' / ' + total; };
  const fail = (id, e) => `<section class="mr-section"><h2 class="mr-h2">${esc(SECTIONS[id].label)}</h2>
        <p class="mr-p mr-warn">This section could not be built: ${esc(String(e && e.message || e))}</p>
        </section>`;

  const isBoundary = id => !!BOUNDARY_SECTIONS[id];
  const plainIds = ids.filter(id => !isBoundary(id));
  const boundIds = ids.filter(isBoundary);

  // Non-boundary sections are independent and can run together.
  const plain = await Promise.all(plainIds.map(id =>
    Promise.resolve().then(() => SECTIONS[id].build(opts))
      .catch(e => fail(id, e)).then(h => { tick(); return h; })));

  // Boundary sections read the live map through global state, so they run one
  // at a time -- and once per requested year, which is what was missing.
  const bound = [];
  if (boundIds.length){
    const by = boundaryReady() ? boundaryYears(opts) : {years:[], missing:[]};
    for (const id of boundIds){
      let html = '';
      try {
        if (!boundaryReady()){
          html = await SECTIONS[id].build(opts);      // renders its own "open the tab" notice
        } else if (by.years.length <= 1){
          html = await SECTIONS[id].build(opts);
        } else {
          const parts = [];
          for (const y of by.years){
            const one = await B().withYear(y, () => SECTIONS[id].build(opts));
            parts.push(`<div class="mr-yearband">Membership year — ${esc(B().yearLabel(y))}</div>` + one);
          }
          if (by.missing.length){
            parts.push(`<p class="mr-note">No boundary data exists for ${esc(by.missing.join(', '))}: the
              geocoded county statistics only cover 2025 and 2026, so those years are omitted here rather
              than estimated.</p>`);
          }
          html = parts.join('');
        }
      } catch(e){ html = fail(id, e); }
      tick();
      bound.push(html);
    }
  }

  const order = {};
  plainIds.forEach((id,i) => order[id] = plain[i]);
  boundIds.forEach((id,i) => order[id] = bound[i]);
  const results = ids.map(id => order[id]);

  const body = document.getElementById('mr-doc-body');
  if (body){
    const d = new Date().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});
    body.innerHTML = results.join('') +
      `<div class="mr-foot-note">Generated ${d} · USA Diving Membership Analytics ·
       Reflects the filters, scenario and data active at time of generation.</div>`;
  }
};

/* =====================================================================
   SHARE VIEW
   ===================================================================== */
window._mrShare = function(){
  const tab = document.querySelector('#tabs .tab.active');
  const view = tab ? tab.getAttribute('data-view') : 'overview';
  const parts = ['view=' + encodeURIComponent(view)];
  if (boundaryReady()){
    const sc = B().scenario();
    parts.push('byear=' + encodeURIComponent(B().year()));
    if (sc.id) parts.push('scenario=' + encodeURIComponent(sc.id));
  }
  const url = window.location.origin + window.location.pathname + '#ma-share/' + parts.join('&');
  const done = () => toast('Share link copied to clipboard');
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(done, () => window.prompt('Copy this link:', url));
  } else window.prompt('Copy this link:', url);
};
function toast(msg){
  if (window.USADToast && window.USADToast.show) { window.USADToast.show(msg); return; }
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:'+NAVY+';color:#fff;'+
    'padding:10px 16px;border-radius:6px;font-size:13px;z-index:100000;box-shadow:0 2px 8px rgba(0,0,0,.2)';
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2500);
}
function applyShareHash(){
  const h = window.location.hash || '';
  if (!h.startsWith('#ma-share/')) return;
  const map = {};
  h.slice('#ma-share/'.length).split('&').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) map[p.slice(0,i)] = decodeURIComponent(p.slice(i+1));
  });
  if (map.view){
    const btn = document.querySelector(`#tabs .tab[data-view="${CSS.escape(map.view)}"]`);
    if (btn) btn.click();
  }
}

/* =====================================================================
   MOUNT — action bar + styles
   ===================================================================== */
function mount(){
  if (document.getElementById('mr-bar')) return;
  const tabs = document.getElementById('tabs');
  if (!tabs) return;
  const bar = document.createElement('div');
  bar.id = 'mr-bar';
  bar.className = 'mr-bar';
  bar.innerHTML = `
    <span class="mr-bar-lbl">Reports</span>
    <button class="mr-bar-btn mr-bar-prim" onclick="window._mrOpenBuilder()">Build a report</button>
    <button class="mr-bar-btn" onclick="window._mrOpenBuilder('__boundary__')"
            title="Open the builder with the map templates first — nothing is chosen for you">Report on this map</button>
    <button class="mr-bar-btn" onclick="window._mrShare()"
            title="Copy a link that opens this same view">Share this view</button>
    <span class="mr-bar-note">Every report prints straight to PDF.</span>`;
  tabs.parentNode.insertBefore(bar, tabs.nextSibling);
  window._mrOpenBuilder = function(preset){ openBuilder(preset); };
  applyShareHash();
}

const STYLES = `
.mr-bar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:0 0 16px;padding:10px 14px;
  background:#fff;border:1px solid #e2e8f2;border-radius:12px;box-shadow:0 4px 12px rgba(16,24,40,.04)}
.mr-bar-lbl{font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;
  letter-spacing:.06em;font-size:13px;color:#171F69;padding-right:4px}
.mr-bar-btn{border:1px solid #cdd6e4;background:#fff;color:#171F69;border-radius:999px;
  padding:8px 15px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
.mr-bar-btn:hover{border-color:#009AC7;color:#00789b}
.mr-bar-prim{background:#171F69;color:#fff;border-color:#171F69}
.mr-bar-prim:hover{background:#0f1650;color:#fff}
.mr-bar-note{margin-left:auto;font-size:12px;color:#6b7390}

/* ---- builder modal ---- */
#mr-modal .mr-overlay{position:fixed;inset:0;background:rgba(15,20,45,.55);z-index:99998;
  display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:26px 16px}
#mr-modal .mr-dialog{background:#fff;border-radius:14px;max-width:1020px;width:100%;
  box-shadow:0 18px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;max-height:92vh}
#mr-modal .mr-head{display:flex;align-items:flex-start;padding:20px 24px 14px;border-bottom:3px solid #E31937}
#mr-modal .mr-eyebrow{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#009AC7}
#mr-modal .mr-title{font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:700;
  margin:2px 0 0;color:#171F69;text-transform:uppercase}
#mr-modal .mr-x{margin-left:auto;border:none;background:none;font-size:20px;cursor:pointer;color:#6b7390}
#mr-modal .mr-body{padding:16px 24px;overflow:auto}
#mr-modal .mr-step{display:flex;gap:14px;margin-bottom:22px}
#mr-modal .mr-step-n{width:28px;height:28px;border-radius:50%;background:#171F69;color:#fff;
  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex:0 0 28px}
#mr-modal .mr-step-c{flex:1;min-width:0}
#mr-modal .mr-step-h{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:17px;
  color:#171F69;text-transform:uppercase;letter-spacing:.03em;margin-bottom:9px}
#mr-modal .mr-tmpls{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:9px}
#mr-modal .mr-tmpl{text-align:left;border:1px solid #dbe2ee;border-radius:9px;padding:11px 13px;
  background:#fff;cursor:pointer;font-family:inherit}
#mr-modal .mr-tmpl:hover{border-color:#009AC7;background:#f6fbfd}
#mr-modal .mr-tmpl.is-on{border-color:#171F69;background:#eef2fb;box-shadow:inset 0 0 0 1px #171F69}
#mr-modal .mr-tmpl.is-dim{opacity:.62}
#mr-modal .mr-tmpl-n{font-weight:800;font-size:13.5px;color:#171F69}
#mr-modal .mr-tmpl-d{font-size:11.5px;color:#5a6480;margin:4px 0 6px;line-height:1.42}
#mr-modal .mr-tmpl-s{font-size:10.5px;color:#009AC7;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
#mr-modal .mr-secgrp{margin-bottom:14px}
#mr-modal .mr-secgrp-h{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;
  color:#009AC7;margin-bottom:6px}
#mr-modal .mr-sections{display:grid;grid-template-columns:repeat(auto-fill,minmax(292px,1fr));gap:7px}
#mr-modal .mr-secopt{display:flex;gap:9px;align-items:flex-start;border:1px solid #e2e8f2;
  border-radius:8px;padding:9px 11px;cursor:pointer;background:#fff}
#mr-modal .mr-secopt:hover{border-color:#009AC7}
#mr-modal .mr-secopt.is-on{border-color:#171F69;background:#f5f8fd}
#mr-modal .mr-secopt input{margin-top:2px;accent-color:#171F69}
#mr-modal .mr-secopt-n{font-weight:700;font-size:12.5px;color:#171F69}
#mr-modal .mr-secopt-d{font-size:11px;color:#5a6480;margin-top:2px;line-height:1.4}
#mr-modal .mr-chips{display:flex;gap:6px;flex-wrap:wrap}
#mr-modal .mr-scroll{max-height:132px;overflow:auto;padding:3px;border:1px solid #eef1f7;border-radius:7px}
#mr-modal .mr-chip{border:1px solid #cdd6e4;background:#fff;color:#171F69;border-radius:999px;
  padding:6px 13px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit}
#mr-modal .mr-chip.sm{padding:4px 10px;font-size:11.5px}
#mr-modal .mr-chip.is-on{background:#171F69;color:#fff;border-color:#171F69}
#mr-modal .mr-fgrp{margin-bottom:11px}
#mr-modal .mr-flbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
  color:#5a6480;margin-bottom:5px}
#mr-modal .mr-link{background:none;border:none;color:#009AC7;font-weight:700;font-size:12.5px;
  cursor:pointer;padding:2px 0;font-family:inherit;text-decoration:underline}
#mr-modal .mr-tag{font-size:9.5px;background:#eef2fb;color:#171F69;border-radius:4px;padding:1px 5px;
  text-transform:uppercase;letter-spacing:.04em}
#mr-modal .mr-tag-warn{background:#fef3e2;color:#b45309}
#mr-modal .mr-foot{display:flex;align-items:center;gap:10px;padding:13px 24px;border-top:1px solid #e5e9f2;
  background:#fafbfd;border-radius:0 0 14px 14px;flex-wrap:wrap}
#mr-modal .mr-btn{border:1px solid #cdd6e4;background:#fff;color:#171F69;border-radius:7px;
  padding:9px 17px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
#mr-modal .mr-btn-p{background:#171F69;color:#fff;border-color:#171F69}
#mr-modal .mr-btn.is-dim{opacity:.45;cursor:not-allowed}
#mr-modal .mr-soft{color:#6b7390;font-size:12px;font-weight:500}

/* ---- generated document ---- */
#mr-output{position:fixed;inset:0;background:#fafbfd;z-index:99999;overflow:auto;
  font-family:'Inter',system-ui,sans-serif;color:#171F69}
#mr-output .mr-toolbar{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e9f2;
  padding:10px 18px;display:flex;align-items:center;gap:8px;z-index:1}
#mr-output .mr-toolbar button{padding:7px 13px;border-radius:5px;border:1px solid #cdd6e4;background:#fff;
  cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:600;color:#171F69}
#mr-output .mr-print{background:#171F69;color:#fff;border-color:#171F69}
#mr-output .mr-doc{max-width:920px;margin:24px auto;padding:34px 46px;background:#fff;
  box-shadow:0 1px 4px rgba(0,0,0,.06)}
#mr-output .mr-doc-head{border-bottom:4px solid #E31937;padding-bottom:14px;margin-bottom:22px}
#mr-output .mr-doc-head h1{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:29px;
  margin:0;color:#171F69;text-transform:uppercase;letter-spacing:.01em}
#mr-output .mr-doc-sub{font-size:11.5px;color:#5a6480;margin-top:8px;line-height:1.65}
#mr-output .mr-section{margin:26px 0;page-break-inside:auto}
#mr-output .mr-scenario-badge{background:#171F69;color:#fff;border-radius:8px;padding:10px 16px;
  margin:0 0 14px;display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;page-break-inside:avoid}
#mr-output .mr-scenario-badge .mr-sb-label{font-family:'Barlow Condensed',sans-serif;font-weight:700;
  font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:#8FC3EA;flex-shrink:0}
#mr-output .mr-scenario-badge .mr-sb-name{font-weight:800;font-size:15px}
#mr-output .mr-scenario-badge .mr-sb-year{font-size:11px;color:#c8d0f0;margin-left:auto;white-space:nowrap}
#mr-output .mr-scenario-badge .mr-sb-dirty{font-size:10px;color:#fde68a;font-weight:600}
#mr-output .mr-scenario-badge.mr-sb-compare{display:grid;grid-template-columns:1fr auto 1fr;
  align-items:center;gap:4px 12px}
#mr-output .mr-scenario-badge.mr-sb-compare .mr-sb-col{display:flex;flex-direction:column;gap:1px}
#mr-output .mr-scenario-badge.mr-sb-compare .mr-sb-vs{font-family:'Barlow Condensed',sans-serif;
  font-weight:700;font-size:12px;color:#8FC3EA;text-align:center;padding:0 4px}
#mr-output .mr-scenario-badge.mr-sb-compare .mr-sb-col.mr-sb-right{align-items:flex-end;text-align:right}
#mr-output .mr-rules-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;
  margin:8px 0 16px}
#mr-output .mr-rules-col{background:#f7f8fc;border:1px solid #e2e5ef;border-radius:8px;padding:11px 14px}
#mr-output .mr-rules-h{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:13px;
  color:#171F69;text-transform:uppercase;letter-spacing:.02em;margin-bottom:6px;
  border-bottom:2px solid #E31937;padding-bottom:4px}
#mr-output .mr-rules-col .mr-bullets{margin:0;padding-left:16px;font-size:11px;line-height:1.6}
#mr-output .mr-h2{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:19px;color:#171F69;
  border-bottom:2px solid #171F69;padding-bottom:4px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.04em}
.mr-yearband{background:var(--navy);color:#fff;font-family:var(--display);font-size:17px;letter-spacing:.05em;
  text-transform:uppercase;padding:7px 14px;border-radius:9px;margin:22px 0 10px;page-break-after:avoid}

#mr-output .mr-h3{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14.5px;color:#171F69;
  margin:18px 0 6px;text-transform:uppercase;letter-spacing:.03em}
#mr-output .mr-p{font-size:12px;color:#2d3450;margin:0 0 9px;line-height:1.55}
#mr-output .mr-note{font-size:11px;color:#5a6480;margin:9px 0 0;line-height:1.55;
  background:#f6f8fc;border-left:3px solid #009AC7;padding:8px 11px;border-radius:0 5px 5px 0}
.mr-sub td{background:#f4f8fd}

.mr-bullets{margin:8px 0 12px;padding-left:20px;font-size:11px;line-height:1.6;color:#13213a}
.mr-bullets li{margin-bottom:4px}

#mr-output .mr-warn{background:#fef3e2;border-left:3px solid #b45309;padding:9px 12px;border-radius:0 5px 5px 0;color:#7c4a06}
#mr-output .mr-soft{color:#6b7390;font-size:10.5px}
#mr-output .mr-mono{font-family:'JetBrains Mono',monospace;font-size:11px}
#mr-output .mr-table{width:100%;border-collapse:collapse;font-size:11.5px;margin:7px 0 4px}
#mr-output .mr-table th{background:#eef1f7;color:#171F69;text-align:left;padding:5px 8px;font-weight:700;
  text-transform:uppercase;font-size:9.5px;letter-spacing:.04em;border-bottom:1px solid #c5cce0}
#mr-output .mr-table td{padding:5px 8px;border-bottom:1px solid #e9edf5;vertical-align:middle}
#mr-output .mr-table .mr-num{text-align:right;font-variant-numeric:tabular-nums;
  font-family:'JetBrains Mono',monospace;font-size:11px}
#mr-output .mr-table th.mr-num{text-align:right}
#mr-output .mr-table-sm{font-size:10.5px}
#mr-output .mr-table-sm td,#mr-output .mr-table-sm th{padding:3.5px 7px}
#mr-output .mr-table-plain td{border-bottom:none;padding:3px 8px}
#mr-output .mr-table tr.mr-total td{font-weight:800;background:#eef3fa;border-top:2px solid #c8d4e6}
#mr-output .mr-table tr.mr-muted td{color:#6b7390;font-style:italic}
#mr-output .mr-zip{page-break-inside:auto}
#mr-output .mr-up{color:#15803d;font-weight:700;font-size:11px}
#mr-output .mr-down{color:#b3122b;font-weight:700;font-size:11px}
#mr-output .mr-over{color:#b45309;font-weight:700}
#mr-output .mr-under{color:#1d4ed8;font-weight:700}
#mr-output .mr-bar{display:block;height:10px;line-height:0;background:#eef1f7;border-radius:3px;overflow:hidden;min-width:40px}
#mr-output .mr-bar-f{display:block;height:10px;min-height:10px;border-radius:3px}
#mr-output .mr-devbar{position:relative;display:block;height:11px;background:#f2f5fa;border-radius:3px}
#mr-output .mr-devbar-mid{position:absolute;left:50%;top:0;bottom:0;width:1px;background:#94a3b8}
#mr-output .mr-devbar-f{position:absolute;top:1px;bottom:1px;border-radius:2px}
#mr-output .mr-sw{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}
#mr-output .mr-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:9px;margin:10px 0 14px}
#mr-output .mr-kpi{background:#f6f8fc;border-radius:7px;padding:11px 13px;border-top:3px solid #009AC7}
#mr-output .mr-kpi-v{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:26px;color:#171F69;line-height:1.05}
#mr-output .mr-kpi-l{font-size:10.5px;font-weight:700;color:#171F69;text-transform:uppercase;
  letter-spacing:.03em;margin-top:3px}
#mr-output .mr-kpi-s{font-size:10px;color:#5a6480;margin-top:4px;line-height:1.45}
#mr-output .mr-profile{border:1px solid #e2e8f2;border-radius:8px;padding:12px 14px;margin:11px 0;
  page-break-inside:avoid}
#mr-output .mr-profile-h{padding-left:11px;margin-bottom:9px}
#mr-output .mr-profile-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px;
  color:#171F69;text-transform:uppercase;letter-spacing:.02em}
#mr-output .mr-profile-kpi{display:flex;flex-wrap:wrap;gap:13px;font-size:11px;color:#5a6480;margin-top:3px}
#mr-output .mr-profile-kpi b{color:#171F69;font-size:12.5px}
#mr-output .mr-stack{display:flex;height:11px;border-radius:3px;overflow:hidden;margin:5px 0 9px;background:#eef1f7}
#mr-output .mr-seg{display:block;height:11px;min-height:11px}
#mr-output .mr-kv{display:flex;gap:9px;font-size:11px;margin:5px 0;line-height:1.5}
#mr-output .mr-kv-k{flex:0 0 96px;font-weight:700;color:#171F69;text-transform:uppercase;
  font-size:9.5px;letter-spacing:.04em;padding-top:1px}
#mr-output .mr-kv-v{flex:1;color:#2d3450}
#mr-output .mr-map{border:1px solid #e2e8f2;border-radius:8px;padding:8px;margin:9px 0;background:#fff}
#mr-output .mr-map svg{width:100%;height:auto;display:block}\n#mr-output .mr-stage{margin:14px 0 20px;page-break-inside:avoid}\n#mr-output .mr-stagemap{width:100%;height:auto;display:block}
#mr-output .mr-mapkeys{display:flex;flex-wrap:wrap;gap:5px 14px;margin:6px 0 2px}
#mr-output .mr-mapkey{font-size:10.5px;color:#2d3450;white-space:nowrap}
#mr-output .mr-foot-note{margin-top:20px;padding-top:10px;border-top:1px solid #e5e9f2;
  font-size:9.5px;color:#6b7390}

/* ---- potential-schedule cards (boundary_schedule report section) ----
   Matches Schedule Builder's own printed handout (HANDOUT_CSS / buildHandoutDayHTML
   in sb-app.js) as closely as a report section can -- same navy header bar, same
   red/white/blue accent stripe, same Barlow Condensed treatment for the big
   numbers -- so a page from this report and a page Schedule Builder prints for a
   real meet read as the same family of document. No clock times: this is a
   projection with no real date set yet, so entries and estimated run time replace
   start/end times as the thing each row actually reports. */
#mr-output .mr-sched-stop{border:1px solid #e2e8f2;border-radius:9px;padding:13px 15px;margin:14px 0;
  page-break-inside:avoid}
#mr-output .mr-sched-stop-h{display:flex;align-items:baseline;gap:9px;margin-bottom:3px}
#mr-output .mr-sched-stop-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;
  color:#171F69;text-transform:uppercase;letter-spacing:.02em}
#mr-output .mr-sched-stop-kpis{display:flex;flex-wrap:wrap;gap:5px 16px;font-size:11px;color:#5a6480;
  margin:2px 0 9px}
#mr-output .mr-sched-stop-kpis .mr-over{color:#b45309;font-weight:700}
#mr-output .mr-sched-stop-kpis .mr-under{color:#15803d;font-weight:700}
#mr-output .mr-hd-day{background:#fff;border:1px solid #e2e8f2;border-radius:10px;margin:10px 0;
  overflow:hidden;page-break-inside:avoid}
#mr-output .mr-hd-day.over{border-color:#f0c48a}
#mr-output .mr-hd-day-h{background:#171F69;color:#fff;padding:9px 14px;display:flex;
  justify-content:space-between;align-items:center}
#mr-output .mr-hd-day-h .mr-hd-daynum{font-family:'Barlow Condensed',sans-serif;font-weight:700;
  font-size:16px;text-transform:uppercase;letter-spacing:.03em}
#mr-output .mr-hd-day-h .mr-hd-pool{font-size:10.5px;opacity:.8}
#mr-output .mr-hd-accent{height:3px;background:linear-gradient(90deg,#E31937 0 33%,#fff 33% 66%,#009AC7 66% 100%)}
#mr-output .mr-hd-body{padding:9px 14px 11px}
#mr-output .mr-hd-day-warn{font-size:10.5px;color:#b45309;font-weight:600;margin:6px 0 0}
#mr-output .mr-hd-sess{border-bottom:1.5px solid #E5E9F2;padding:8px 0}
#mr-output .mr-hd-sess:last-child{border-bottom:none}
#mr-output .mr-hd-sess-h{display:flex;align-items:baseline;gap:8px;margin-bottom:2px}
#mr-output .mr-hd-sess-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;
  color:#171F69}
#mr-output .mr-hd-wu{font-size:10.5px;color:#009AC7;font-weight:600}
#mr-output .mr-hd-boards{font-size:10px;color:#5a6480;margin-bottom:3px}
#mr-output .mr-hd-ev{display:flex;justify-content:space-between;align-items:baseline;
  font-size:11.5px;padding:1.5px 0}
#mr-output .mr-hd-ev-name{flex:1}
#mr-output .mr-hd-ev-nums{color:#374151;font-variant-numeric:tabular-nums;font-weight:600;
  white-space:nowrap;margin-left:10px}
#mr-output .mr-hd-ev-nums .n{color:#94A3B8;font-weight:500}
#mr-output .mr-hd-ev-flag{display:block;font-size:10px;color:#b45309;font-style:italic}
#mr-output .mr-sched-practice{font-size:10.5px;color:#5a6480;margin-top:8px}
@media print{
  body *{visibility:hidden !important}
  #mr-output,#mr-output *{visibility:visible !important}
  #mr-output{position:absolute;left:0;top:0;width:100%;background:#fff;overflow:visible}
  #mr-output .mr-toolbar{display:none !important}
  #mr-output .mr-doc{box-shadow:none;margin:0;max-width:none;padding:0}
  #mr-output,#mr-output *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;
    color-adjust:exact !important}
  #mr-output .mr-h2{page-break-after:avoid}
  #mr-output .mr-h3{page-break-after:avoid}
  #mr-output table{page-break-after:auto}
  #mr-output .mr-table thead{display:table-header-group}
  #mr-output tr{page-break-inside:avoid}
  #mr-output .mr-table{table-layout:auto;max-width:100%;font-size:10px}
  #mr-output .mr-fg-tbl,#mr-output .bs-fg-tbl{font-size:8.5px}
  #mr-output .mr-rules-grid{display:block}
  #mr-output .mr-rules-col{margin-bottom:8px;page-break-inside:avoid}
  @page{margin:.55in}
}

/* No mobile breakpoint existed anywhere in this file before. Two fixes, both
   standard and low-risk: the document's fixed 34px/46px padding leaves very
   little usable width once the viewport itself is only a few hundred px, and
   report tables run 5-9 columns wide, which will not reflow sanely at any
   width -- letting them scroll horizontally is the safe, well-established
   fix, not attempting to reflow columns nobody has seen rendered.
   Explicitly screen-only: overflow-x:auto does nothing useful on a printed
   page (there is no scrolling), and leaving this unscoped risked being part
   of why report tables were bleeding past the printed page edge instead of
   shrinking or wrapping. */
@media screen and (max-width: 600px){
  #mr-output .mr-doc{padding:18px 14px}
  #mr-output .mr-table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;
    white-space:nowrap;max-width:100%}
  #mr-output .mr-map svg,#mr-output .mr-stagemap{max-width:100%}
}
`;


/* A duplicate key in a section object is silent in JavaScript -- the later one
   wins and the earlier section vanishes with no error. That happened once
   (boundary_compare was added on top of an existing section of the same name,
   which killed the county-churn report until it was caught). Counting the keys
   in the source is not possible at runtime, so instead every section registry
   is checked for collisions as the registries are merged. */
function assertNoDuplicateSections(){
  const seen = {}, dupes = [];
  [['SECTIONS', SECTIONS], ['BOUNDARY_SECTIONS', BOUNDARY_SECTIONS],
   ['EQUITY_SECTIONS', EQUITY_SECTIONS]].forEach(([nm, reg]) => {
    Object.keys(reg || {}).forEach(k => {
      if (seen[k]) dupes.push(`${k} (in ${seen[k]} and ${nm})`);
      else seen[k] = nm;
    });
  });
  if (dupes.length) console.error('Report sections collide, so one of each pair is unreachable:', dupes);
  return dupes;
}

function injectCSS(){
  if (document.getElementById('mr-css')) return;
  const s = document.createElement('style');
  s.id = 'mr-css';
  s.textContent = STYLES;
  document.head.appendChild(s);
}

injectCSS();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
/* Exposed so a single section can be built without driving the whole modal --
   used by the tests, and by anything that wants one section's html. */
window.MAReports = {
  sections: () => SECTIONS,
  build: (id, opts) => SECTIONS[id] ? SECTIONS[id].build(opts) : Promise.resolve(''),
};

window.addEventListener('load', mount);

})();
