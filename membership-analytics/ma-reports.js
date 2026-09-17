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

/* One source of truth for every Boundary Studio report's name. The picker
   label and the heading rendered inside the report used to be stored
   separately and had already drifted apart (boundary_compare's label said
   "which counties move (vs. another scenario)" while its heading said just
   "Which counties move"). Both now read from here, so they cannot diverge
   again.

   Names state the question the report answers rather than the module that
   produced it. In particular "balance" and "equity" are no longer both
   called equity: area SIZE and the SCORE IT TAKES TO ADVANCE are different
   tests, and blurring them hides the distinction that matters most when a
   selection decision is reviewed. */
/* Boundary Studio moved to boundary-studio/. Its report families went
   with it; these registries stay declared because the shared report
   builder below reads them, and an undeclared name is a ReferenceError
   that would take every membership report down with it. */
const BOUNDARY_SECTIONS = {};
const EQUITY_SECTIONS = {};


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
    sections:['exec_summary','membership_mix','age_profile','geography_assoc','geography_state','retention','clubs','sales_ledger'], years:[2024,2025,2026] },
  { id:'retention_deep', label:'Retention Deep Dive',
    desc:'Where members are being lost — by age group, association and club — and the win-back picture.',
    sections:['retention','age_profile','geography_assoc','clubs'], years:[2024,2025,2026] },
  { id:'competitive_landscape', label:'Competitive Landscape (AAU)',
    desc:'AAU versus USA Diving meet volume alongside the membership footprint it competes for.',
    sections:['aau_landscape','geography_state','geography_assoc'], years:[2024,2025,2026] },
  { id:'club_health', label:'Club Health',
    desc:'Club-level scoreboard with association context and the retention picture behind it.',
    sections:['clubs','geography_assoc','retention'], years:[2024,2025,2026] },
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
    <button class="mr-bar-btn" onclick="window._jcOpen ? window._jcOpen() : null"
            title="Junior Circuit Comparison Report and your saved copies — generate, duplicate, edit">Comparison reports</button>
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
