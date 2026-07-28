/* USA Diving — Membership Analytics : CLUB HEALTH tab
   Data: membership.members + membership.sales_ledger (Neon), PII-stripped.
   Loaded after ma-app.js, so shared helpers (fmt, esc, deltaHtml, NEON,
   AGE_COLORS, AGE_KEYS, AGE_BUCKETS) are already in global scope.

   Honesty rules baked in here:
   - 2026 is YEAR-TO-DATE (data pulled 20 Jul 2026). 2024 and 2025 are full years.
     So 2024 -> 2025 is the only apples-to-apples club comparison. A club missing
     from 2026 has "not renewed yet", which is not the same as "gone".
   - Webpoint exports stamp each row with the member's CURRENT club, so a member
     who transferred has their older years re-attributed to their new club.
     Transfers are rare (~1.6%/yr) but the caveat is stated on the page.
*/

(function(){
'use strict';

/* Local copies of the shared helpers — each module in this app is its own
   IIFE (see ma-app.js / ma-reports.js), so nothing crosses file boundaries
   except NEON, which neon-client.js puts on the global scope. */
const fmt = n => Number(n||0).toLocaleString('en-US');
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function deltaHtml(cur, prev){
  if (prev == null || prev === 0) return '<span class="delta flat">&mdash;</span>';
  const d = cur - prev, p = (100*d/prev).toFixed(1);
  if (d > 0) return `<span class="delta up">&#9650; +${fmt(d)} (+${p}%)</span>`;
  if (d < 0) return `<span class="delta down">&#9660; ${fmt(d)} (${p}%)</span>`;
  return '<span class="delta flat">&#9644; 0</span>';
}
const AGE_COLORS = ['#8FC3EA','#009AC7','#2456B8','#171F69','#94a3b8'];
const AGE_KEYS = ['D','C','B','A','19+'];
const AGE_BUCKETS = [['gd',0,11],['gc',12,13],['gb',14,15],['ga',16,18],['gx',19,200]];

const CLUB_FEES = [
  ['Athlete (17U)',                      'a17',  40, ''],
  ['Athlete (AQUA Age 18+)',             'a18',  40, '+ $33 background screening'],
  ['Competition Athlete (17U)',          'ca17', 200, ''],
  ['Competition Athlete (AQUA Age 18+)', 'ca18', 200, '+ $33 background screening'],
  ['Introductory Athlete 17U',           'i17',  22, 'New for 2026'],
  ['Introductory Athlete AQUA Age 18+',  'i18',  22, 'New for 2026'],
  ['Coach',                              'co',   75, '+ $33 background screening'],
  ['Competition Coach',                  'cco', 125, '+ $33 background screening'],
  ['Judge',                              'j',    75, '+ $30 judging course + $33 background'],
  ['Volunteer/Official',                 'vo',   13, '+ $33 background screening'],
  ['Alumni / Fan',                       'af',   10, ''],
];
const FEE = {}; CLUB_FEES.forEach(([, k, v]) => FEE[k] = v);
const CLUB_FEE_ORG = 150;   // club (organisation) membership
const NO_CLUB = '(no club listed)';

const CL = {
  loaded: false, rows: [], byClub: {}, assoc: [], ledger: [],
  q: '', sort: { col: 'm26', dir: -1 }, ageOn: false, ageYear: 2026,
};

const money = n => '$' + Number(Math.round(n)).toLocaleString('en-US');
const band = n => n <= 5 ? '1–5' : n <= 10 ? '6–10' : n <= 25 ? '11–25'
  : n <= 50 ? '26–50' : n <= 100 ? '51–100' : '100+';
const BANDS = ['1–5', '6–10', '11–25', '26–50', '51–100', '100+'];

function clubRevenue(r) {
  let t = 0; for (const k in FEE) t += FEE[k] * (+r[k] || 0);
  return t;
}

async function renderClubs() {
  const el = document.getElementById('viewClubs');
  if (!CL.loaded) {
    el.innerHTML = '<div class="loading">Loading club data&hellip;</div>';
    const ageSel = AGE_BUCKETS.map(([k, lo, hi]) =>
      `count(DISTINCT member_id) FILTER (WHERE membership_type ILIKE '%Athlete%' AND birth_date IS NOT NULL
        AND (membership_year-EXTRACT(YEAR FROM birth_date)) BETWEEN ${lo} AND ${hi}) ${k}`).join(',\n        ');
    try {
      const [clubs, assoc, ledger, chk] = await Promise.all([
        NEON.query(`SELECT COALESCE(NULLIF(club,''),'${NO_CLUB}') club, membership_year y,
          count(DISTINCT member_id) n,
          mode() WITHIN GROUP (ORDER BY association) assoc,
          mode() WITHIN GROUP (ORDER BY zip5 || '|' || COALESCE(city,'') || '|' || COALESCE(state,'')) zcs,
          count(DISTINCT member_id) FILTER (WHERE membership_type ILIKE '%Athlete%') ath,
          count(DISTINCT member_id) FILTER (WHERE membership_type ILIKE '%Coach%') coach,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Athlete (17U)') a17,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Athlete (AQUA Age 18+)') a18,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Competition Athlete (17U)') ca17,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Competition Athlete (AQUA Age 18+)') ca18,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Introductory Athlete 17U') i17,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Introductory Athlete AQUA Age 18+') i18,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Coach') co,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Competition Coach') cco,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Judge') j,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Volunteer/Official') vo,
          count(DISTINCT member_id) FILTER (WHERE membership_type='Alumni / Fan') af,
          ${ageSel}
          FROM membership.members GROUP BY 1,2`),
        NEON.query(`SELECT COALESCE(NULLIF(association,''),'(none)') assoc,
          count(DISTINCT NULLIF(club,'')) FILTER (WHERE membership_year=2024) c24,
          count(DISTINCT NULLIF(club,'')) FILTER (WHERE membership_year=2025) c25,
          count(DISTINCT NULLIF(club,'')) FILTER (WHERE membership_year=2026) c26,
          count(DISTINCT member_id) FILTER (WHERE membership_year=2025) m25,
          count(DISTINCT member_id) FILTER (WHERE membership_year=2026) m26
          FROM membership.members GROUP BY 1`),
        NEON.query(`SELECT year, item, sum(cnt) cnt, sum(total) total
          FROM membership.sales_ledger GROUP BY 1,2`),
        NEON.query(`SELECT membership_year y, membership_type t, count(DISTINCT member_id) n,
          count(DISTINCT member_id) FILTER (WHERE EXTRACT(YEAR FROM exp_date)=membership_year
                                             OR EXTRACT(YEAR FROM exp_date)>=2100) nc
          FROM membership.members GROUP BY 1,2`),
      ]);
      CL.rows = clubs.rows; CL.assoc = assoc.rows; CL.ledger = ledger.rows;
      CL.sold = {};
      chk.rows.forEach(r => (CL.sold[r.t] = CL.sold[r.t] || {})[+r.y] = +r.nc > 0);
      CL.byClub = {};
      CL.rows.forEach(r => (CL.byClub[r.club] = CL.byClub[r.club] || {})[+r.y] = r);
      CL.loaded = true;
    } catch (e) {
      el.innerHTML = `<div class="card"><div class="card-b"><div class="callout warn">
        <b>Couldn&rsquo;t load the club data.</b> ${esc(e.message || e)} &mdash; try reloading the page.
        </div></div></div>`;
      return;
    }
  }

  const B = CL.byClub;
  const named = Object.keys(B).filter(c => c !== NO_CLUB);
  const inYear = y => new Set(named.filter(c => B[c][y]));
  const S24 = inYear(2024), S25 = inYear(2025), S26 = inYear(2026);
  const size = (c, y) => B[c] && B[c][y] ? +B[c][y].n : 0;

  const lost2526 = [...S25].filter(c => !S26.has(c)).sort((a, b) => size(b, 2025) - size(a, 2025));
  const new2026 = [...S26].filter(c => !S25.has(c)).sort((a, b) => size(b, 2026) - size(a, 2026));
  const lost2425 = [...S24].filter(c => !S25.has(c));
  const new2025 = [...S25].filter(c => !S24.has(c));
  const membersInLost = lost2526.reduce((s, c) => s + size(c, 2025), 0);
  const membersInNew = new2026.reduce((s, c) => s + size(c, 2026), 0);

  const rev = y => Object.values(B).reduce((s, d) => s + (d[y] ? clubRevenue(d[y]) : 0), 0);
  const rev26 = rev(2026);

  // Same-period dues from the accountant's ledger (Dec–Jun both years) — the
  // only true like-for-like revenue comparison available.
  const lsum = (y) => CL.ledger.filter(r => +r.year === y &&
    !['Background Fee', 'Processing Fee', 'Sanction Fee', 'Donations', 'Club'].includes(r.item))
    .reduce((s, r) => s + (+r.total), 0);
  const led25 = lsum(2025), led26 = lsum(2026);
  const orgClubs = y => { const r = CL.ledger.find(x => +x.year === y && x.item === 'Club'); return r ? +r.cnt : 0; };

  const unatt = y => B[NO_CLUB] && B[NO_CLUB][y] ? +B[NO_CLUB][y].n : 0;
  const totalMembers = y => Object.values(B).reduce((s, d) => s + (d[y] ? +d[y].n : 0), 0);

  /* ---------- KPI band ---------- */
  const kpis = `
  <div class="kpi-band">
    <div class="kpi"><div class="big">${fmt(S26.size)}</div>
      <div class="chip navy">Clubs with 2026 members</div>
      <div class="note" style="margin-top:8px">${fmt(S25.size)} in 2025 &middot; ${fmt(S24.size)} in 2024</div></div>
    <div class="kpi red"><div class="big">${fmt(lost2526.length)}</div>
      <div class="chip">No 2026 members yet</div>
      <div class="note" style="margin-top:8px">${fmt(membersInLost)} people were registered at these clubs in 2025</div></div>
    <div class="kpi pool"><div class="big">${fmt(new2026.length)}</div>
      <div class="chip pool">New clubs in 2026</div>
      <div class="note" style="margin-top:8px">bringing ${fmt(membersInNew)} members</div></div>
    <div class="kpi sky"><div class="big">${fmt(unatt(2026))}</div>
      <div class="chip navy">Members with no club</div>
      <div class="note" style="margin-top:8px">${(100 * unatt(2026) / totalMembers(2026)).toFixed(1)}% of all 2026 members</div></div>
    <div class="kpi"><div class="big" style="font-size:40px">${money(rev26)}</div>
      <div class="chip navy">Individual dues, 2026 so far</div>
      <div class="note" style="margin-top:8px">at published fees &middot; ${money(rev(2025))} full-year 2025</div></div>
  </div>`;

  /* ---------- signature: how the club count moved ---------- */
  const step = (from, to, lostN, newN, label, honest) => `
    <div class="cl-step">
      <div class="cl-step-h">${label}</div>
      <div class="cl-flow">
        <div class="cl-node"><b>${from}</b><span>clubs</span></div>
        <div class="cl-arm">
          <div class="cl-arm-l">&minus;${lostN} stopped</div>
          <div class="cl-line"></div>
          <div class="cl-arm-g">+${newN} started</div>
        </div>
        <div class="cl-node end"><b>${to}</b><span>clubs</span></div>
        <div class="cl-net ${to - from < 0 ? 'dn' : 'up'}">${to - from >= 0 ? '+' : ''}${to - from} net</div>
      </div>
      <div class="note" style="margin-top:6px">${honest}</div>
    </div>`;

  const flowCard = `
  <div class="card"><div class="card-h"><h2>How the club count moved</h2>
    <span class="note">Clubs counted = clubs with at least one registered person</span></div>
  <div class="card-b">
    ${step(S24.size, S25.size, lost2425.length, new2025.length, '2024 &rarr; 2025',
      'Both are complete years, so this is the clean read on club attrition: a net loss of '
      + Math.abs(S25.size - S24.size) + ' clubs.')}
    ${step(S25.size, S26.size, lost2526.length, new2026.length, '2025 &rarr; 2026 (so far)',
      '2026 is only part-way through &mdash; every club below still has the rest of the year to renew, '
      + 'and fall-season clubs typically have not registered yet. Read this as a watch list, not a final count.')}
    <div class="coverage-note" style="margin-bottom:0"><b>Two ways to count clubs.</b>
      The figures above count clubs that have <b>people</b> registered. Separately, the finance ledger shows
      <b>${orgClubs(2026)} club (organisation) memberships</b> sold Dec&ndash;Jun 2026 at ${money(CLUB_FEE_ORG)} each,
      versus ${orgClubs(2025)} over the same months in 2025 &mdash; essentially flat. A club can hold an organisation
      membership without having registered its athletes yet, which is why the two counts differ.</div>
  </div></div>`;

  /* ---------- watch list + new clubs ---------- */
  const miniTable = (list, yr, cols, empty) => list.length ? `
    <table class="tc-table"><thead><tr><th>Club</th><th>Association</th><th>State</th><th class="num">${cols}</th></tr></thead>
    <tbody>${list.map(c => { const r = B[c][yr]; return `<tr>
      <td><b>${esc(c)}</b></td><td>${esc(r.assoc || '—')}</td>
      <td>${esc((r.zcs || '||').split('|')[2] || '—')}</td>
      <td class="num">${fmt(+r.n)}</td></tr>`; }).join('')}</tbody></table>` : `<div class="note">${empty}</div>`;

  const watchCard = `
  <div class="card"><div class="card-h"><h2>Clubs with no 2026 registrations yet</h2>
    <span class="note">${fmt(lost2526.length)} clubs &middot; ${fmt(membersInLost)} people in 2025</span></div>
  <div class="card-b">
    <div class="coverage-note">These clubs had members in 2025 and none so far in 2026. Some will renew later in the
      year; some have folded. This is the single most useful call list on the page &mdash; the largest ones are worth a
      phone call before the fall season starts.</div>
    ${miniTable(lost2526, 2025, '2025 members', 'Every 2025 club has registered someone for 2026.')}
  </div></div>`;

  const newCard = `
  <div class="card"><div class="card-h"><h2>Clubs new in 2026</h2>
    <span class="note">${fmt(new2026.length)} clubs &middot; ${fmt(membersInNew)} members</span></div>
  <div class="card-b">${miniTable(new2026, 2026, '2026 members', 'No brand-new clubs registered yet this year.')}</div></div>`;

  /* ---------- biggest swings ---------- */
  const both = [...S26].filter(c => S25.has(c))
    .map(c => ({ c, a: size(c, 2025), b: size(c, 2026), d: size(c, 2026) - size(c, 2025) }));
  const swingRows = list => list.map(x => `<tr>
      <td><b>${esc(x.c)}</b></td>
      <td class="num">${fmt(x.a)}</td><td class="num">${fmt(x.b)}</td>
      <td class="num">${deltaHtml(x.b, x.a)}</td></tr>`).join('');
  const swingCard = `
  <div class="card"><div class="card-h"><h2>Biggest movers</h2>
    <span class="note">Clubs registered in both years &middot; 2026 is year-to-date</span></div>
  <div class="card-b"><div class="cl-two">
    <div><div class="cl-sub">Losing the most members</div>
      <table class="tc-table"><thead><tr><th>Club</th><th class="num">2025</th><th class="num">2026</th><th class="num">&Delta;</th></tr></thead>
      <tbody>${swingRows(both.slice().sort((x, y) => x.d - y.d).slice(0, 12))}</tbody></table></div>
    <div><div class="cl-sub">Growing the most</div>
      <table class="tc-table"><thead><tr><th>Club</th><th class="num">2025</th><th class="num">2026</th><th class="num">&Delta;</th></tr></thead>
      <tbody>${swingRows(both.slice().sort((x, y) => y.d - x.d).slice(0, 12))}</tbody></table></div>
  </div></div></div>`;

  /* ---------- size distribution ---------- */
  const bandCount = y => { const o = {}; BANDS.forEach(b => o[b] = 0);
    [...inYear(y)].forEach(c => o[band(size(c, y))]++); return o; };
  const bc = { 2024: bandCount(2024), 2025: bandCount(2025), 2026: bandCount(2026) };
  const maxBand = Math.max(...BANDS.map(b => Math.max(bc[2024][b], bc[2025][b], bc[2026][b])));
  const sizeCard = `
  <div class="card"><div class="card-h"><h2>Club sizes</h2>
    <span class="note">How many clubs fall in each size band</span></div>
  <div class="card-b">
    <table class="tc-table"><thead><tr><th>Club size</th><th class="num">2024</th><th class="num">2025</th>
      <th class="num">2026 YTD</th><th style="width:38%">Shape, 2026</th></tr></thead>
    <tbody>${BANDS.map(b => `<tr>
      <td><b>${b}</b> members</td>
      <td class="num">${bc[2024][b]}</td><td class="num">${bc[2025][b]}</td><td class="num">${bc[2026][b]}</td>
      <td><span class="cl-bar"><span style="width:${(100 * bc[2026][b] / maxBand).toFixed(1)}%"></span></span></td>
      </tr>`).join('')}</tbody></table>
    <div class="coverage-note" style="margin:10px 0 0">The squeeze is in the middle and upper-middle. Clubs of
      51&ndash;100 members have gone from ${bc[2024]['51–100']} to ${bc[2026]['51–100']}, and 26&ndash;50 from
      ${bc[2024]['26–50']} to ${bc[2026]['26–50']}. Small clubs are holding up better in count, but they carry far fewer members each.</div>
  </div></div>`;

  /* ---------- dues value ---------- */
  const feeRows = CLUB_FEES.map(([label, k, price, note]) => {
    const c = y => Object.values(B).reduce((s, d) => s + (d[y] ? +d[y][k] : 0), 0);
    // Same guard as the Membership Types tab: a type with members on file but no
    // records genuinely belonging to that year was not on sale then.
    const sold = y => !(CL.sold[label] && CL.sold[label][y] === false && c(y) > 0);
    const cell = y => sold(y) ? `<td class="num">${fmt(c(y))}</td>`
      : '<td class="num" style="color:#94a3b8" title="Not offered this year">&mdash;</td>';
    return `<tr><td>${esc(label)}</td><td class="num">${money(price)}</td>
      ${cell(2025)}${cell(2026)}
      <td class="num">${money(price * c(2026))}</td>
      <td class="note" style="font-size:11.5px">${note}</td></tr>`;
  }).join('');

  const duesCard = `
  <div class="card"><div class="card-h"><h2>What the memberships are worth</h2>
    <span class="note">Published USA Diving fees &times; registrations</span></div>
  <div class="card-b">
    <div class="cl-money">
      <div class="cl-money-b"><span>Same months, both years</span>
        <b>${money(led26)}</b>
        <em>Dec&ndash;Jun 2026 &middot; ${money(led25)} in 2025 &middot;
        <span style="color:${led26 < led25 ? 'var(--red)' : 'var(--green)'}">${led26 - led25 >= 0 ? '+' : '&minus;'}${money(Math.abs(led26 - led25))} (${(100 * (led26 - led25) / led25).toFixed(1)}%)</span></em></div>
      <div class="cl-money-b"><span>Full year 2025</span><b>${money(rev(2025))}</b>
        <em>from the membership roster &middot; 2024 was ${money(rev(2024))}</em></div>
      <div class="cl-money-b"><span>2026 booked so far</span><b>${money(rev26)}</b>
        <em>roster as of the 20 Jul 2026 pull</em></div>
    </div>
    <div class="coverage-note">The <b>same-months figure on the left is the honest one</b> &mdash; it comes from the
      finance sales ledger and compares December&ndash;June in both years. The other two boxes count everyone on the
      roster, so 2026 is still filling in. Fees exclude the $33 background screening, $30 judging course,
      $2.95 processing fee and club organisation dues.</div>
    <table class="tc-table"><thead><tr><th>Membership</th><th class="num">Fee</th><th class="num">2025</th>
      <th class="num">2026 YTD</th><th class="num">2026 value</th><th>Notes</th></tr></thead>
      <tbody>${feeRows}
      <tr class="grand"><td><b>Club (organisation) membership</b></td><td class="num">${money(CLUB_FEE_ORG)}</td>
        <td class="num">${orgClubs(2025)}</td><td class="num">${orgClubs(2026)}</td>
        <td class="num">${money(CLUB_FEE_ORG * orgClubs(2026))}</td>
        <td class="note" style="font-size:11.5px">Counts from the finance ledger, Dec&ndash;Jun</td></tr>
      </tbody></table>
    <div class="note" style="margin-top:8px">Fees are unchanged since 2024. The only new price is the
      Introductory Athlete membership at $22, first sold in 2026.
      Source: usadiving.org membership pages, confirmed against the finance sales ledger.</div>
  </div></div>`;

  /* ---------- associations ---------- */
  const arows = CL.assoc.slice().sort((a, b) => +b.m25 - +a.m25).filter(r => +r.m25 || +r.m26);
  const assocCard = `
  <div class="card"><div class="card-h"><h2>Associations</h2>
    <span class="note">Clubs and members by association</span></div>
  <div class="card-b"><div class="clubs-wrap">
    <table class="tc-table"><thead><tr><th>Association</th>
      <th class="num">Clubs &rsquo;25</th><th class="num">Clubs &rsquo;26</th>
      <th class="num">Members &rsquo;25</th><th class="num">Members &rsquo;26</th><th class="num">&Delta;</th></tr></thead>
    <tbody>${arows.map(r => `<tr><td><b>${esc(r.assoc)}</b></td>
      <td class="num">${fmt(+r.c25)}</td>
      <td class="num">${+r.c26 < +r.c25 ? `<span style="color:var(--red)">${fmt(+r.c26)}</span>` : fmt(+r.c26)}</td>
      <td class="num">${fmt(+r.m25)}</td><td class="num">${fmt(+r.m26)}</td>
      <td class="num">${deltaHtml(+r.m26, +r.m25)}</td></tr>`).join('')}</tbody></table>
  </div></div></div>`;

  /* ---------- full roster ---------- */
  const rosterCard = `
  <div class="card"><div class="card-h"><h2>Every club</h2>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto">
      <div class="seg"><button id="clAge" class="${CL.ageOn ? 'on' : ''}">Age groups: ${CL.ageOn ? 'on' : 'off'}</button></div>
      ${CL.ageOn ? `<div class="seg"><button id="clY25" class="${CL.ageYear === 2025 ? 'on' : ''}">2025</button><button id="clY26" class="${CL.ageYear === 2026 ? 'on' : ''}">2026 YTD</button></div>` : ''}
      <input class="search" id="clQ" placeholder="Search club / city / state&hellip;" value="${esc(CL.q)}">
    </div></div>
  <div class="card-b"><div class="clubs-wrap"><table class="clubs-table" id="clRoster"></table></div>
  <div class="note" style="margin-top:6px">Location = each club&rsquo;s most common member zip code. Click any column to sort.${CL.ageOn ? ` <b>Age groups</b> = AQUA age (Dec 31) of ${CL.ageYear} athletes: <span style="color:#0b6ea0">D</span> 11&amp;under &middot; <span style="color:#009AC7">C</span> 12&ndash;13 &middot; <span style="color:#2456B8">B</span> 14&ndash;15 &middot; <span style="color:#171F69">A</span> 16&ndash;18 &middot; <span style="color:#64748b">19+</span>.` : ''}</div></div></div>`;

  const caveat = `
  <div class="coverage-note"><b>Two things to know before quoting these numbers.</b>
    <b>1.</b> 2026 is year-to-date (roster pulled 20 July 2026); 2024 and 2025 are complete years. Any 2025&rarr;2026
    drop is part real and part calendar.
    <b>2.</b> Webpoint stamps every export row with the member&rsquo;s <i>current</i> club, so the roughly 1.6% of
    members who transfer each year have their earlier years counted at their new club. It moves individual club
    histories slightly; it does not change the totals.</div>`;

  el.innerHTML = kpis + caveat + flowCard + watchCard + newCard + swingCard
    + sizeCard + duesCard + assocCard + rosterCard;

  document.getElementById('clQ').addEventListener('input', e => { CL.q = e.target.value; renderClubRoster(); });
  const ab = document.getElementById('clAge');
  if (ab) ab.addEventListener('click', () => { CL.ageOn = !CL.ageOn; renderClubs(); });
  const y25 = document.getElementById('clY25'); if (y25) y25.addEventListener('click', () => { CL.ageYear = 2025; renderClubs(); });
  const y26 = document.getElementById('clY26'); if (y26) y26.addEventListener('click', () => { CL.ageYear = 2026; renderClubs(); });
  renderClubRoster();
}

function renderClubRoster() {
  const B = CL.byClub;
  const AGE_COLS = [['agebar', 'Age mix'], ['gD', 'D'], ['gC', 'C'], ['gB', 'B'], ['gA', 'A'], ['gX', '19+']];
  const AGE_DOT = { gD: 0, gC: 1, gB: 2, gA: 3, gX: 4 };
  const cols = [['club', 'Club'], ['assoc', 'Association'], ['loc', 'Location (modal zip)'],
    ['m24', '2024'], ['m25', '2025'], ['m26', '2026 YTD'], ['a26', 'Athletes \u201926'],
    ['c26', 'Coaches \u201926'], ['v26', 'Dues \u201926'], ['d', '\u0394 25\u219226']]
    .concat(CL.ageOn ? AGE_COLS : []);
  const numCols = new Set(['m24', 'm25', 'm26', 'a26', 'c26', 'v26', 'd', 'gD', 'gC', 'gB', 'gA', 'gX']);
  if (!CL.ageOn && (CL.sort.col in AGE_DOT || CL.sort.col === 'agebar')) CL.sort = { col: 'm26', dir: -1 };

  const gv = (c, y, k) => B[c][y] ? +B[c][y][k] : 0;
  let rows = Object.keys(B).map(c => {
    const latest = B[c][2026] || B[c][2025] || B[c][2024];
    const [zip, city, st] = (latest.zcs || '||').split('|');
    const ay = CL.ageYear, ar = B[c][ay];
    return {
      club: c, assoc: c === NO_CLUB ? '—' : (latest.assoc || ''), st,
      loc: c === '(no club listed)' ? '—' : (city ? city + ', ' : '') + (st || '') + (zip ? ' ' + zip : ''),
      m24: gv(c, 2024, 'n'), m25: gv(c, 2025, 'n'), m26: gv(c, 2026, 'n'),
      a26: gv(c, 2026, 'ath'), c26: gv(c, 2026, 'coach'),
      v26: B[c][2026] ? clubRevenue(B[c][2026]) : 0,
      d: gv(c, 2026, 'n') - gv(c, 2025, 'n'),
      gD: ar ? +ar.gd : 0, gC: ar ? +ar.gc : 0, gB: ar ? +ar.gb : 0, gA: ar ? +ar.ga : 0, gX: ar ? +ar.gx : 0,
    };
  });
  const q = CL.q.trim().toLowerCase();
  if (q) rows = rows.filter(r => (r.club + ' ' + r.assoc + ' ' + r.loc).toLowerCase().includes(q));
  const { col, dir } = CL.sort;
  const sortVal = r => col === 'agebar' ? (r.gD + r.gC + r.gB + r.gA + r.gX) : r[col];
  rows.sort((a, b) => { const x = sortVal(a), y = sortVal(b);
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir; });

  const head = cols.map(([k, l]) => {
    const dot = k in AGE_DOT ? `<span class="agdot" style="background:${AGE_COLORS[AGE_DOT[k]]}"></span>` : '';
    return `<th data-col="${k}" class="${numCols.has(k) ? 'num' : ''}">${dot}${l} ${CL.sort.col === k ? `<span class="arr">${dir < 0 ? '\u25BC' : '\u25B2'}</span>` : ''}</th>`;
  }).join('');

  const ageCells = r => {
    if (!CL.ageOn) return '';
    const vals = [r.gD, r.gC, r.gB, r.gA, r.gX], tot = vals.reduce((s, x) => s + x, 0);
    const seg = vals.map((v, j) => v > 0 ? `<span style="flex:${v};background:${AGE_COLORS[j]}" title="${AGE_KEYS[j]}: ${fmt(v)}"></span>` : '').join('');
    return `<td><span class="ag-bar clubbar" title="${tot} athletes">${seg || '<span style="flex:1;background:#eef1f6"></span>'}</span></td>`
      + vals.map(v => `<td class="num">${v ? fmt(v) : '<span class="z0">0</span>'}</td>`).join('');
  };

  const body = rows.map(r => `<tr>
    <td><b>${esc(r.club)}</b></td><td>${esc(r.assoc)}</td><td>${esc(r.loc)}</td>
    <td class="num">${r.m24 ? fmt(r.m24) : '<span class="z0">—</span>'}</td>
    <td class="num">${r.m25 ? fmt(r.m25) : '<span class="z0">—</span>'}</td>
    <td class="num">${r.m26 ? fmt(r.m26) : '<span class="z0">—</span>'}</td>
    <td class="num">${fmt(r.a26)}</td><td class="num">${fmt(r.c26)}</td>
    <td class="num">${money(r.v26)}</td>
    <td class="num">${r.m25 ? deltaHtml(r.m26, r.m25) : '<span class="pill green">new</span>'}</td>
    ${ageCells(r)}</tr>`).join('');

  const t = document.getElementById('clRoster');
  t.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
  t.querySelectorAll('th').forEach(th => th.addEventListener('click', () => {
    const k = th.dataset.col;
    CL.sort = { col: k, dir: CL.sort.col === k ? -CL.sort.dir : (k === 'club' || k === 'assoc' || k === 'loc' ? 1 : -1) };
    renderClubRoster();
  }));
}

window.renderClubs = renderClubs;
})();
