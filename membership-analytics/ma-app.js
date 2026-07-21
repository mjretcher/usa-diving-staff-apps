/* USA Diving Membership Analytics — ma-app.js
   Data: membership.members (Neon) — PII-stripped (no addresses/emails/phones/parent info).
   Membership Type categorization:
     Athlete  = membership_type ILIKE '%Athlete%'
     Coach    = membership_type ILIKE '%Coach%'   (includes Lifetime Coach)
     Official = 'Volunteer/Official' or 'Judge'
     Other    = everything else (Lifetime, Medical/Consultant, Alumni / Fan, blank legacy rows)
   Age groups use competition-year age (membership_year - birth year):
     D <=11, C 12-13, B 14-15, A 16-18, 19+ older.
*/
(function(){
'use strict';

const YEARS = [2024, 2025, 2026];
const CUR_YEAR = 2026;
const NAVY='#171F69', RED='#E31937', POOL='#009AC7', SKY='#8FC3EA', GREEN='#15803d', GRAY='#94a3b8';
const YEAR_COLORS = {2024: SKY, 2025: POOL, 2026: NAVY};
const GROUP_ORDER = ['D','C','B','A','19+'];
const GROUP_LABEL = {D:'Group D (11 & under)', C:'Group C (12–13)', B:'Group B (14–15)', A:'Group A (16–18)', '19+':'19 & over'};
// Shared age palette (young→old) so the club table matches Boundary Studio & Trends.
const AGE_COLORS = ['#8FC3EA','#009AC7','#2456B8','#171F69','#94a3b8'];
const AGE_KEYS = ['D','C','B','A','19+'];
// AQUA-age buckets for per-club SQL: alias, low, high (inclusive).
const AGE_BUCKETS = [['gd',0,11],['gc',12,13],['gb',14,15],['ga',16,18],['gx',19,200]];

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

const D = {}; // loaded datasets
const fmt = n => Number(n).toLocaleString('en-US');
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function pct(a,b){ return b>0 ? (100*a/b) : 0; }
function deltaHtml(cur, prev){
  if (prev == null || prev === 0) return '<span class="delta flat">—</span>';
  const d = cur - prev, p = (100*d/prev).toFixed(1);
  if (d > 0) return `<span class="delta up">&#9650; +${fmt(d)} (+${p}%)</span>`;
  if (d < 0) return `<span class="delta down">&#9660; ${fmt(d)} (${p}%)</span>`;
  return '<span class="delta flat">&#9644; 0</span>';
}

/* ---------- tiny SVG chart helpers ---------- */
function groupedBars(opts){
  // opts: {categories:[..], series:[{label,color,values:[..]}], height, valueFmt}
  const H = opts.height || 240, padL=44, padB=34, padT=14, padR=8;
  const nCat = opts.categories.length, nS = opts.series.length;
  const W = Math.max(520, nCat * (nS*26 + 30) + padL + padR);
  const maxV = Math.max(1, ...opts.series.flatMap(s=>s.values));
  const plotH = H - padB - padT, plotW = W - padL - padR;
  const catW = plotW / nCat, barW = Math.min(24, (catW - 14) / nS);
  let bars='', labels='', grid='';
  const ticks = 4;
  for (let t=0;t<=ticks;t++){
    const v = maxV * t / ticks, y = padT + plotH - plotH*t/ticks;
    grid += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#eef2f7"/>`+
            `<text x="${padL-6}" y="${y+4}" text-anchor="end" font-size="10" fill="#94a3b8" font-family="JetBrains Mono,monospace">${Math.round(v).toLocaleString()}</text>`;
  }
  opts.categories.forEach((c,ci)=>{
    const cx = padL + catW*ci + catW/2;
    labels += `<text x="${cx}" y="${H-12}" text-anchor="middle" font-size="11" font-weight="700" fill="#13213a" font-family="Inter,sans-serif">${esc(c)}</text>`;
    opts.series.forEach((s,si)=>{
      const v = s.values[ci] || 0;
      const h = plotH * v / maxV;
      const x = cx - (nS*barW)/2 + si*barW;
      bars += `<rect x="${x}" y="${padT+plotH-h}" width="${barW-3}" height="${h}" rx="3" fill="${s.color}"><title>${esc(s.label)} — ${esc(c)}: ${fmt(v)}</title></rect>`;
      if (barW >= 20 && v > 0){
        bars += `<text x="${x+(barW-3)/2}" y="${padT+plotH-h-4}" text-anchor="middle" font-size="9.5" fill="#536176" font-family="JetBrains Mono,monospace">${fmt(v)}</text>`;
      }
    });
  });
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:${Math.min(W,900)}px">${grid}${bars}${labels}</svg></div>`;
}

function lineChart(opts){
  // opts: {xs:[..], series:[{label,color,values,dashed?}], height}
  const H = opts.height || 220, padL=48, padB=30, padT=12, padR=14, W=680;
  const maxV = Math.max(1, ...opts.series.flatMap(s=>s.values.filter(v=>v!=null)));
  const plotH=H-padT-padB, plotW=W-padL-padR;
  const x = i => padL + (opts.xs.length===1 ? plotW/2 : plotW * i/(opts.xs.length-1));
  const y = v => padT + plotH - plotH*v/maxV;
  let grid='', lines='', labels='';
  for (let t=0;t<=4;t++){
    const v=maxV*t/4, yy=y(v);
    grid += `<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="#eef2f7"/>`+
            `<text x="${padL-6}" y="${yy+4}" text-anchor="end" font-size="10" fill="#94a3b8" font-family="JetBrains Mono,monospace">${Math.round(v).toLocaleString()}</text>`;
  }
  opts.xs.forEach((xv,i)=>{ labels += `<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="11" font-weight="700" fill="#13213a" font-family="Inter,sans-serif">${esc(xv)}</text>`; });
  opts.series.forEach(s=>{
    const pts = s.values.map((v,i)=>v==null?null:`${x(i)},${y(v)}`).filter(Boolean).join(' ');
    lines += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="3" ${s.dashed?'stroke-dasharray="6 5"':''} stroke-linecap="round"/>`;
    s.values.forEach((v,i)=>{ if(v!=null) lines += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color}"><title>${esc(s.label)} ${esc(opts.xs[i])}: ${fmt(v)}</title></circle>`; });
  });
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:520px">${grid}${lines}${labels}</svg></div>`;
}

function legendHtml(items){
  return '<div class="legend">' + items.map(i=>`<span><span class="sw" style="background:${i.color}"></span>${esc(i.label)}</span>`).join('') + '</div>';
}

/* ---------- data loading ---------- */
async function loadAll(){
  const mmdd = String(new Date().getMonth()+1).padStart(2,'0') + '-' + String(new Date().getDate()).padStart(2,'0');
  const [byYear, byCat, byGrp, byAssoc, byState, pace, retPairs, lostByGrp, lostByAssoc, lostRoster, aauMeets] = await Promise.all([
    NEON.query(`SELECT membership_year y, count(DISTINCT member_id) n FROM membership.members GROUP BY 1 ORDER BY 1`),
    NEON.query(`SELECT membership_year y, ${CAT_SQL} cat, count(DISTINCT member_id) n FROM membership.members GROUP BY 1,2 ORDER BY 1,2`),
    NEON.query(`SELECT membership_year y, ${GRP_SQL} grp, count(DISTINCT member_id) n FROM membership.members WHERE membership_type ILIKE '%Athlete%' AND birth_date IS NOT NULL GROUP BY 1,2 ORDER BY 1,2`),
    NEON.query(`SELECT COALESCE(association,'(none)') assoc, membership_year y, count(DISTINCT member_id) n,
                count(DISTINCT member_id) FILTER (WHERE membership_type ILIKE '%Athlete%') ath
                FROM membership.members GROUP BY 1,2`),
    NEON.query(`SELECT COALESCE(state,'??') st, membership_year y, count(DISTINCT member_id) n FROM membership.members GROUP BY 1,2`),
    NEON.query(`SELECT year y,
                sum(cnt) FILTER (WHERE item NOT IN ('Background Fee','Donations','Processing Fee','Sanction Fee')) n,
                sum(cnt) FILTER (WHERE item LIKE '%Athlete%') ath
                FROM membership.sales_ledger GROUP BY 1 ORDER BY 1`),
    NEON.query(`
      SELECT 'r2425' k, count(DISTINCT a.member_id) n FROM membership.members a WHERE a.membership_year=2025 AND EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2024)
      UNION ALL SELECT 'new25', count(DISTINCT a.member_id) FROM membership.members a WHERE a.membership_year=2025 AND NOT EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2024)
      UNION ALL SELECT 'lost2425', count(DISTINCT a.member_id) FROM membership.members a WHERE a.membership_year=2024 AND NOT EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2025)
      UNION ALL SELECT 'r2526', count(DISTINCT a.member_id) FROM membership.members a WHERE a.membership_year=2026 AND EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2025)
      UNION ALL SELECT 'new26', count(DISTINCT a.member_id) FROM membership.members a WHERE a.membership_year=2026 AND NOT EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2025)
      UNION ALL SELECT 'lost2526', count(DISTINCT a.member_id) FROM membership.members a WHERE a.membership_year=2025 AND NOT EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2026)`),
    NEON.query(`SELECT ${GRP_SQL} grp,
                count(DISTINCT member_id) total,
                count(DISTINCT member_id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=membership.members.member_id AND b.membership_year=2026)) lost
                FROM membership.members WHERE membership_year=2025 AND membership_type ILIKE '%Athlete%' AND birth_date IS NOT NULL GROUP BY 1`),
    NEON.query(`SELECT COALESCE(association,'(none)') assoc,
                count(DISTINCT member_id) total,
                count(DISTINCT member_id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=membership.members.member_id AND b.membership_year=2026)) lost
                FROM membership.members WHERE membership_year=2025 GROUP BY 1`),
    NEON.query(`SELECT DISTINCT ON (a.member_id) a.member_id, a.first_name, a.last_name, a.membership_type, a.member_status,
                COALESCE(a.club,'(no club)') club, COALESCE(a.association,'') assoc, a.state,
                CASE WHEN a.birth_date IS NULL THEN '' ELSE (${GRP_SQL.replace(/membership_year/g,'a.membership_year').replace(/birth_date/g,'a.birth_date')}) END grp
                FROM membership.members a
                WHERE a.membership_year=2025
                AND NOT EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2026)
                ORDER BY a.member_id, a.membership_type`),
    NEON.query(`SELECT EXTRACT(YEAR FROM start_date)::int y,
                count(*) FILTER (WHERE sanction ILIKE '%AAU%') aau,
                count(*) FILTER (WHERE sanction = 'USA Diving') usad
                FROM divemeets.meets WHERE start_date IS NOT NULL AND EXTRACT(YEAR FROM start_date) BETWEEN 2018 AND 2026
                GROUP BY 1 ORDER BY 1`),
  ]);
  D.byYear = byYear.rows; D.byCat = byCat.rows; D.byGrp = byGrp.rows;
  D.byAssoc = byAssoc.rows; D.byState = byState.rows; D.pace = pace.rows;
  D.ret = {}; retPairs.rows.forEach(r => D.ret[r.k] = +r.n);
  D.lostByGrp = lostByGrp.rows; D.lostByAssoc = lostByAssoc.rows; D.lostRoster = lostRoster.rows;
  D.aau = aauMeets.rows;
  D.paceDate = mmdd;
}

function yearMap(rows, keyF, valF){
  const m = {};
  rows.forEach(r => { const k = keyF(r); (m[k] = m[k] || {})[r.y] = +valF(r); });
  return m;
}

/* ---------- views ---------- */
function renderOverview(){
  const tot = {}; D.byYear.forEach(r => tot[r.y] = +r.n);
  const paceM = {}, paceA = {}; D.pace.forEach(r => { paceM[r.y] = +r.n; paceA[r.y] = +r.ath; });
  const catM = yearMap(D.byCat, r=>r.cat, r=>r.n);
  const grpM = yearMap(D.byGrp, r=>r.grp, r=>r.n);
  const ath26 = (catM.Athlete||{})[2026]||0, ath25 = (catM.Athlete||{})[2025]||0;
  const clubsQ = D.byAssoc; // association count as proxy header stat handled below

  const kpis = `
  <div class="kpi-band">
    <div class="kpi navy">
      <div class="big">${fmt(tot[2026]||0)}</div>
      <span class="chip navy">2026 Members (YTD)</span>
      <div class="sub">Full-year 2025: ${fmt(tot[2025]||0)} &middot; 2024: ${fmt(tot[2024]||0)}<br><span class="scope-tag all">All membership types</span></div>
    </div>
    <div class="kpi red">
      <div class="big">${fmt(paceM[2026]||0)}</div>
      <span class="chip">Same-Period Memberships Sold (Dec&ndash;Jun)</span>
      <div class="sub">2025 same period: ${fmt(paceM[2025]||0)} &middot; ${deltaHtml(paceM[2026]||0, paceM[2025]||0)}<br>Athletes: ${fmt(paceA[2026]||0)} vs ${fmt(paceA[2025]||0)} ${deltaHtml(paceA[2026]||0, paceA[2025]||0)}<br><span style="opacity:.75">Source: accounting sales ledger (net of refunds, incl. clubs)</span></div>
    </div>
    <div class="kpi pool">
      <div class="big">${fmt(ath26)}</div>
      <span class="chip pool">2026 Athletes (YTD)</span>
      <div class="sub">2025 full-year: ${fmt(ath25)} &middot; ${deltaHtml(ath26, ath25)}<br><span class="scope-tag ath">Athletes only &middot; subset</span></div>
    </div>
    <div class="kpi sky">
      <div class="big">${fmt(D.ret.r2526||0)}</div>
      <span class="chip navy">2025 Members Renewed for 2026</span>
      <div class="sub">${fmt(D.ret.lost2526||0)} not yet renewed &middot; ${fmt(D.ret.new26||0)} brand-new in 2026<br><span class="scope-tag all">All membership types</span></div>
    </div>
  </div>`;

  const compChart = groupedBars({
    categories: ['Athlete','Coach','Official','Other'],
    series: YEARS.map(y=>({label:String(y), color:YEAR_COLORS[y], values:['Athlete','Coach','Official','Other'].map(c=>(catM[c]||{})[y]||0)})),
    height: 250,
  });
  const grpChart = groupedBars({
    categories: GROUP_ORDER,
    series: YEARS.map(y=>({label:String(y), color:YEAR_COLORS[y], values:GROUP_ORDER.map(g=>(grpM[g]||{})[y]||0)})),
    height: 250,
  });

  document.getElementById('viewOverview').innerHTML = kpis + `
  <div class="coverage-note"><b>Coverage:</b> member totals and renewal above &mdash; and the <b>Retention</b>, Trends &ldquo;By Role,&rdquo; Geography, and Clubs views &mdash; count <b>every membership type</b>: athletes (including adult / AQUA&nbsp;18+), coaches, officials, and other. Only panels labeled &ldquo;by age group&rdquo; are athletes&#8209;only, since age groups apply only to athletes.</div>
  <div class="callout warn"><b>Reading these numbers:</b> 2026 is a season in progress (data through the latest export), so raw 2026 totals will keep growing. For a fair year-over-year read, use the <b>&ldquo;Registered by ${D.paceDate.replace('-','/')}&rdquo;</b> pace figure, which counts only members who had joined by this same date in each year.</div>
  <div class="grid-2">
    <div class="card"><div class="card-h"><h2>Membership Mix by Year</h2><span class="sub">Distinct members per category</span></div>
      <div class="card-b">${compChart}${legendHtml(YEARS.map(y=>({label:String(y),color:YEAR_COLORS[y]})))}</div></div>
    <div class="card"><div class="card-h"><h2>Athletes by Age Group</h2><span class="sub">Competition-year age</span></div>
      <div class="card-b">${grpChart}${legendHtml(YEARS.map(y=>({label:String(y),color:YEAR_COLORS[y]})))}
      <div class="note" style="margin-top:8px">Groups: D = 11 &amp; under &middot; C = 12&ndash;13 &middot; B = 14&ndash;15 &middot; A = 16&ndash;18 &middot; 19+ = AQUA-age adults.</div></div></div>
  </div>`;
}

function renderTrends(){
  const tot = {}; D.byYear.forEach(r => tot[r.y] = +r.n);
  const paceM = {}, paceA = {}; D.pace.forEach(r => { paceM[r.y] = +r.n; paceA[r.y] = +r.ath; });
  const catM = yearMap(D.byCat, r=>r.cat, r=>r.n);
  const grpM = yearMap(D.byGrp, r=>r.grp, r=>r.n);

  const totalLine = lineChart({
    xs: YEARS.map(String),
    series: [
      {label:'Total members (full year / YTD for 2026)', color:NAVY, values:YEARS.map(y=>tot[y]||0)},
      {label:`Registered by ${D.paceDate.replace('-','/')} (same-date pace)`, color:RED, dashed:true, values:YEARS.map(y=>paceM[y]||0)},
    ], height: 250,
  });
  const catLine = lineChart({
    xs: YEARS.map(String),
    series: [
      {label:'Athletes', color:POOL, values:YEARS.map(y=>(catM.Athlete||{})[y]||0)},
      {label:'Coaches', color:NAVY, values:YEARS.map(y=>(catM.Coach||{})[y]||0)},
      {label:'Officials/Judges', color:GRAY, values:YEARS.map(y=>(catM.Official||{})[y]||0)},
    ], height: 230,
  });
  const grpLine = lineChart({
    xs: YEARS.map(String),
    series: GROUP_ORDER.map((g,i)=>({label:GROUP_LABEL[g], color:AGE_COLORS[i], values:YEARS.map(y=>(grpM[g]||{})[y]||0)})),
    height: 260,
  });

  // biggest movers table (age group % change 2024 -> 2025 full years)
  const rows = GROUP_ORDER.map(g=>{
    const a=(grpM[g]||{})[2024]||0, b=(grpM[g]||{})[2025]||0, c=(grpM[g]||{})[2026]||0;
    return `<tr><td><b>${esc(GROUP_LABEL[g])}</b></td><td class="num">${fmt(a)}</td><td class="num">${fmt(b)}</td><td>${deltaHtml(b,a)}</td><td class="num">${fmt(c)}</td><td>${deltaHtml(c,b)}</td></tr>`;
  }).join('');

  document.getElementById('viewTrends').innerHTML = `
  <div class="card"><div class="card-h"><h2>Total Membership Trend</h2><span class="sub">Solid = year total &middot; dashed = same-date pace (apples-to-apples)</span></div>
    <div class="card-b">${totalLine}${legendHtml([{label:'Year total',color:NAVY},{label:`Registered by ${D.paceDate.replace('-','/')}`,color:RED}])}</div></div>
  <div class="grid-2">
    <div class="card"><div class="card-h"><h2>By Role</h2></div><div class="card-b">${catLine}${legendHtml([{label:'Athletes',color:POOL},{label:'Coaches',color:NAVY},{label:'Officials/Judges',color:GRAY}])}</div></div>
    <div class="card"><div class="card-h"><h2>Athletes by Age Group</h2></div><div class="card-b">${grpLine}${legendHtml(GROUP_ORDER.map((g,i)=>({label:GROUP_LABEL[g],color:AGE_COLORS[i]})))}</div></div>
  </div>
  <div class="card"><div class="card-h"><h2>Age-Group Scorecard</h2><span class="sub">2026 is YTD &mdash; deltas vs 2025 will improve as the season fills in</span></div>
    <div class="card-b"><table><thead><tr><th>Age group</th><th class="num">2024</th><th class="num">2025</th><th>&Delta; 24&rarr;25</th><th class="num">2026 YTD</th><th>&Delta; 25&rarr;26 YTD</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

let geoState = { mode:'assoc', metric:'all', sortK:'y2025', sortDir:-1, q:'' };
function renderGeography(){
  const el = document.getElementById('viewGeography');
  const src = geoState.mode==='assoc' ? D.byAssoc : D.byState;
  const keyF = geoState.mode==='assoc' ? (r=>r.assoc) : (r=>r.st);
  const valF = geoState.mode==='assoc' && geoState.metric==='ath' ? (r=>r.ath) : (r=>r.n);
  const m = yearMap(src, keyF, valF);
  let entries = Object.entries(m).map(([k,v])=>({name:k, y2024:v[2024]||0, y2025:v[2025]||0, y2026:v[2026]||0}));
  if (geoState.q) entries = entries.filter(e=>e.name.toLowerCase().includes(geoState.q.toLowerCase()));
  entries.sort((a,b)=>{
    const va = geoState.sortK==='name'? a.name : a[geoState.sortK];
    const vb = geoState.sortK==='name'? b.name : b[geoState.sortK];
    return (va<vb?-1:va>vb?1:0) * geoState.sortDir;
  });
  const maxBar = Math.max(1, ...entries.map(e=>e.y2025||e.y2024));
  const arrow = k => geoState.sortK===k ? `<span class="arr">${geoState.sortDir<0?'&#9660;':'&#9650;'}</span>` : '';
  const rows = entries.map(e=>`
    <tr><td><b>${esc(e.name)}</b></td>
    <td class="num">${fmt(e.y2024)}</td>
    <td class="num"><div class="bar-cell"><span class="mini-bar" style="width:${Math.max(2, 90*e.y2025/maxBar)}px"></span>${fmt(e.y2025)}</div></td>
    <td>${deltaHtml(e.y2025, e.y2024)}</td>
    <td class="num">${fmt(e.y2026)}</td>
    <td>${deltaHtml(e.y2026, e.y2025)}</td></tr>`).join('');

  el.innerHTML = `
  <div class="card"><div class="card-h"><h2>Where the Membership Lives</h2>
    <span class="sub">2026 is YTD. Boundary Studio (region/zone redraw on a live map) builds on this data next.</span></div>
    <div class="card-b">
      <div class="controls-row">
        <div class="seg"><button id="geoAssoc" class="${geoState.mode==='assoc'?'on':''}">By Association (LDA)</button><button id="geoStateB" class="${geoState.mode==='state'?'on':''}">By State</button></div>
        ${geoState.mode==='assoc' ? `<div class="seg"><button id="metAll" class="${geoState.metric==='all'?'on':''}">All members</button><button id="metAth" class="${geoState.metric==='ath'?'on':''}">Athletes only</button></div>`:''}
        <input class="search" id="geoQ" placeholder="Filter&hellip;" value="${esc(geoState.q)}">
        <span class="note">${entries.length} ${geoState.mode==='assoc'?'associations':'states'}</span>
      </div>
      <table><thead><tr>
        <th data-k="name">${geoState.mode==='assoc'?'Association':'State'} ${arrow('name')}</th>
        <th class="num" data-k="y2024">2024 ${arrow('y2024')}</th>
        <th class="num" data-k="y2025">2025 ${arrow('y2025')}</th>
        <th>&Delta; 24&rarr;25</th>
        <th class="num" data-k="y2026">2026 YTD ${arrow('y2026')}</th>
        <th>&Delta; 25&rarr;26 YTD</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </div></div>`;

  el.querySelectorAll('th[data-k]').forEach(th=>th.addEventListener('click',()=>{
    const k = th.dataset.k;
    if (geoState.sortK===k) geoState.sortDir *= -1; else { geoState.sortK=k; geoState.sortDir = k==='name'?1:-1; }
    renderGeography();
  }));
  const bind = (id,f)=>{ const b=document.getElementById(id); if(b) b.addEventListener('click',()=>{f();renderGeography();}); };
  bind('geoAssoc', ()=>{geoState.mode='assoc';});
  bind('geoStateB', ()=>{geoState.mode='state';});
  bind('metAll', ()=>{geoState.metric='all';});
  bind('metAth', ()=>{geoState.metric='ath';});
  const qi=document.getElementById('geoQ');
  qi.addEventListener('input',()=>{geoState.q=qi.value; renderGeography(); document.getElementById('geoQ').focus(); const v=document.getElementById('geoQ'); v.setSelectionRange(v.value.length, v.value.length);});
}

let lostState = { q:'', assoc:'', page:0 };
function renderRetention(){
  const el = document.getElementById('viewRetention');
  const r = D.ret;
  const kpis = `
  <div class="kpi-band">
    <div class="kpi navy"><div class="big">${fmt(r.r2425)}</div><span class="chip navy">2024 &rarr; 2025 Retained</span>
      <div class="sub">${fmt(r.lost2425)} lost (${pct(r.lost2425, +D.byYear.find(x=>+x.y===2024).n).toFixed(1)}% churn) &middot; ${fmt(r.new25)} new in 2025<br><span class="scope-tag all">All membership types</span></div></div>
    <div class="kpi pool"><div class="big">${fmt(r.r2526)}</div><span class="chip pool">2025 &rarr; 2026 Renewed So Far</span>
      <div class="sub">${fmt(r.lost2526)} not yet renewed &middot; ${fmt(r.new26)} new in 2026<br><span class="scope-tag all">All membership types</span></div></div>
    <div class="kpi red"><div class="big">${pct(r.r2526, +D.byYear.find(x=>+x.y===2025).n).toFixed(0)}%</div><span class="chip">2026 Renewal Rate (YTD)</span>
      <div class="sub">Share of all 2025 members who have a 2026 membership so far. Will rise through the season.<br><span class="scope-tag all">All membership types</span></div></div>
  </div>`;

  const grpRows = D.lostByGrp.slice().sort((a,b)=>GROUP_ORDER.indexOf(a.grp)-GROUP_ORDER.indexOf(b.grp)).map(g=>{
    const rate = pct(+g.lost, +g.total);
    return `<tr><td><b>${esc(GROUP_LABEL[g.grp]||g.grp)}</b></td><td class="num">${fmt(+g.total)}</td><td class="num">${fmt(+g.lost)}</td>
      <td><div class="bar-cell"><span class="mini-bar" style="background:${RED};width:${Math.max(2,rate*1.6)}px"></span><span class="delta down">${rate.toFixed(1)}%</span></div></td></tr>`;
  }).join('');

  const assocRows = D.lostByAssoc.filter(a=>+a.total>=40).sort((a,b)=>pct(+b.lost,+b.total)-pct(+a.lost,+a.total)).slice(0,15).map(a=>{
    const rate = pct(+a.lost,+a.total);
    return `<tr><td><b>${esc(a.assoc)}</b></td><td class="num">${fmt(+a.total)}</td><td class="num">${fmt(+a.lost)}</td>
      <td><div class="bar-cell"><span class="mini-bar" style="background:${RED};width:${Math.max(2,rate*1.6)}px"></span><span class="delta down">${rate.toFixed(1)}%</span></div></td></tr>`;
  }).join('');

  // lost roster explorer
  const assocs = [...new Set(D.lostRoster.map(x=>x.assoc).filter(Boolean))].sort();
  let roster = D.lostRoster;
  if (lostState.assoc) roster = roster.filter(x=>x.assoc===lostState.assoc);
  if (lostState.q){ const q=lostState.q.toLowerCase(); roster = roster.filter(x=>(x.last_name||'').toLowerCase().includes(q)||(x.first_name||'').toLowerCase().includes(q)||(x.club||'').toLowerCase().includes(q)); }
  const PAGE=25, pages=Math.max(1, Math.ceil(roster.length/PAGE));
  lostState.page = Math.min(lostState.page, pages-1);
  const slice = roster.slice(lostState.page*PAGE, lostState.page*PAGE+PAGE);
  const rosterRows = slice.map(x=>`<tr>
    <td><b>${esc(x.last_name)}, ${esc(x.first_name)}</b></td>
    <td>${esc(x.membership_type)}</td>
    <td>${x.grp?`<span class="pill navy">${esc(x.grp)}</span>`:''}</td>
    <td>${esc(x.club)}</td><td>${esc(x.assoc)}</td><td>${esc(x.state||'')}</td></tr>`).join('');

  el.innerHTML = kpis + `
  <div class="coverage-note"><b>Coverage:</b> every figure on this tab &mdash; retained, not-yet-renewed, the renewal rate, and the win-back list &mdash; counts <b>all membership types</b> (athletes, coaches, officials, and other). The one exception is the <b>&ldquo;by age group&rdquo;</b> table below, which is athletes-only by definition.</div>
  <div class="callout"><b>How to read churn mid-season:</b> &ldquo;Not yet renewed&rdquo; 2025 members may still register for 2026 &mdash; especially athletes whose competition season starts later. The 2024&rarr;2025 numbers compare two complete years and are the true churn benchmark.</div>
  <div class="grid-2">
    <div class="card"><div class="card-h"><h2>Not-Yet-Renewed by Age Group</h2><span class="sub">2025 athletes without a 2026 membership</span></div>
      <div class="card-b"><table><thead><tr><th>Age group (2025)</th><th class="num">2025 athletes</th><th class="num">Not renewed</th><th>Rate</th></tr></thead><tbody>${grpRows}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h2>Highest Non-Renewal by Association</h2><span class="sub">Associations with 40+ members in 2025</span></div>
      <div class="card-b"><table><thead><tr><th>Association</th><th class="num">2025 members</th><th class="num">Not renewed</th><th>Rate</th></tr></thead><tbody>${assocRows}</tbody></table></div></div>
  </div>
  <div class="card"><div class="card-h"><h2>Win-Back List &mdash; 2025 Members Not Yet in 2026</h2><span class="sub">${fmt(roster.length)} people &middot; sorted by name search &amp; association filter</span></div>
    <div class="card-b">
      <div class="controls-row">
        <input class="search" id="lostQ" placeholder="Search name or club&hellip;" value="${esc(lostState.q)}">
        <select class="sel" id="lostAssoc"><option value="">All associations</option>${assocs.map(a=>`<option ${a===lostState.assoc?'selected':''}>${esc(a)}</option>`).join('')}</select>
        <span class="note">Page ${lostState.page+1} / ${pages}</span>
        <button class="tab" id="lostPrev">&larr;</button><button class="tab" id="lostNext">&rarr;</button>
      </div>
      <table><thead><tr><th>Name</th><th>2025 membership</th><th>Group</th><th>Club</th><th>Association</th><th>State</th></tr></thead><tbody>${rosterRows}</tbody></table>
    </div>
    <div class="foot">Contact details are intentionally not stored in this system. Pull outreach contacts from Webpoint using Member ID / name.</div></div>`;

  const qi=document.getElementById('lostQ');
  qi.addEventListener('input',()=>{lostState.q=qi.value; lostState.page=0; renderRetention(); const v=document.getElementById('lostQ'); v.focus(); v.setSelectionRange(v.value.length,v.value.length);});
  document.getElementById('lostAssoc').addEventListener('change',e=>{lostState.assoc=e.target.value; lostState.page=0; renderRetention();});
  document.getElementById('lostPrev').addEventListener('click',()=>{if(lostState.page>0){lostState.page--;renderRetention();}});
  document.getElementById('lostNext').addEventListener('click',()=>{lostState.page++;renderRetention();});
}

function renderAau(){
  const el = document.getElementById('viewAau');
  const xs = D.aau.map(r=>String(r.y));
  const chart = lineChart({
    xs,
    series: [
      {label:'USA Diving sanctioned meets', color:NAVY, values:D.aau.map(r=>+r.usad)},
      {label:'AAU sanctioned meets', color:RED, values:D.aau.map(r=>+r.aau)},
    ], height: 260,
  });
  const rows = D.aau.slice().reverse().map(r=>`<tr><td><b>${r.y}</b></td><td class="num">${fmt(+r.usad)}</td><td class="num">${fmt(+r.aau)}</td>
    <td class="num">${(+r.usad>0? (+r.aau / +r.usad).toFixed(2) : '—')}</td></tr>`).join('');
  el.innerHTML = `
  <div class="card"><div class="card-h"><h2>Meet Activity: USA Diving vs AAU</h2><span class="sub">Sanctioned meets cataloged on DiveMeets (2026 is YTD)</span></div>
    <div class="card-b">${chart}${legendHtml([{label:'USA Diving',color:NAVY},{label:'AAU',color:RED}])}</div></div>
  <div class="grid-2">
    <div class="card"><div class="card-h"><h2>By the Numbers</h2></div>
      <div class="card-b"><table><thead><tr><th>Year</th><th class="num">USA Diving meets</th><th class="num">AAU meets</th><th class="num">AAU : USAD ratio</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h2>What's Next for AAU Comparison</h2></div>
      <div class="card-b"><div class="callout"><b>678 AAU meets</b> are already cataloged in our DiveMeets crawl (names, dates, venues) &mdash; but their <b>results have not been crawled yet</b>, so athlete-level comparison (who dives AAU-only, who does both, head-to-head participation by geography and age) is pending a results crawl. That crawl runs on our existing GitHub Actions pipeline and is the next build step for this tab.</div>
      <div class="note">Once results land, this tab gains: AAU athlete counts by year &amp; state, overlap analysis (USA Diving members also seen in AAU results), and market-share maps.</div></div></div>
  </div>`;
}


/* ---------- Membership Map (SafeSport-poster style) ---------- */
let mapState = { mode:'trend', pins:true, geo:null };

function heatColor(v, maxV){
  // white -> navy ramp
  const t = maxV>0 ? Math.pow(v/maxV, 0.5) : 0; // sqrt for visual spread
  const mix = (a,b)=>Math.round(a+(b-a)*t);
  return `rgb(${mix(238,23)},${mix(243,31)},${mix(249,105)})`;
}

async function renderMap(){
  const el = document.getElementById('viewMap');
  if (!mapState.geo){
    try { mapState.geo = await (await fetch('map-data.json?v=202607201900')).json(); }
    catch(e){ el.innerHTML = `<div class="card"><div class="card-b"><div class="callout warn"><b>Map data failed to load.</b> ${esc(e.message||e)}</div></div></div>`; return; }
  }
  const geo = mapState.geo;
  const stM = yearMap(D.byState, r=>r.st, r=>r.n);
  const tot = y => Object.values(stM).reduce((s,v)=>s+(v[y]||0),0);
  const clubsTotal = geo.clubs.length;

  let growing=0, declining=0, flat=0, none=0;
  const fills = {};
  const max26 = Math.max(1, ...Object.values(stM).map(v=>v[2026]||0));
  geo.states.forEach(s=>{
    const v = stM[s.abbr] || {};
    const a = v[2024]||0, b = v[2025]||0, c = v[2026]||0;
    if (mapState.mode === 'trend'){
      if (a===0 && b===0){ fills[s.abbr] = '#e6ebf2'; none++; }
      else {
        const chg = b - a;
        const thresh = Math.max(2, a*0.03); // ±3% (min 2 people) = flat
        if (chg > thresh){ fills[s.abbr] = NAVY; growing++; }
        else if (chg < -thresh){ fills[s.abbr] = RED; declining++; }
        else { fills[s.abbr] = '#b9c3d4'; flat++; }
      }
    } else {
      const val = mapState.mode === 'heat26' ? c : c; // heat26 only heat mode for now
      fills[s.abbr] = val>0 ? heatColor(val, max26) : '#e6ebf2';
    }
  });

  const paths = geo.states.map(s=>{
    const v = stM[s.abbr]||{};
    const tip = `${s.name} — 2024: ${fmt(v[2024]||0)} · 2025: ${fmt(v[2025]||0)} · 2026 YTD: ${fmt(v[2026]||0)}`;
    return `<path class="st" d="${s.d}" fill="${fills[s.abbr]}"><title>${esc(tip)}</title></path>`;
  }).join('');

  const pins = mapState.pins ? geo.clubs.map(c=>`
    <g class="pin"><title>${esc(c.name)} — ${esc(c.city)}, ${esc(c.state)} · ${fmt(c.members)} members (${fmt(c.athletes)} athletes)</title>
      <line x1="${c.x}" y1="${c.y}" x2="${c.x}" y2="${c.y-11}" stroke="#fff" stroke-width="3.4"/>
      <line x1="${c.x}" y1="${c.y}" x2="${c.x}" y2="${c.y-11}" stroke="${RED}" stroke-width="1.8"/>
      <circle cx="${c.x}" cy="${c.y-13}" r="4.6" fill="${RED}" stroke="#fff" stroke-width="1.6"/>
    </g>`).join('') : '';

  const monthStamp = new Date().toLocaleString('en-US',{month:'long', year:'numeric'}).toUpperCase();
  const stats = mapState.mode==='trend' ? `
    <div class="big-stat"><div class="n">${growing}</div><span class="lbl navy">States Growing</span><div class="under"></div></div>
    <div class="big-stat"><div class="n">${declining}</div><span class="lbl">States Declining</span><div class="under"></div></div>` : `
    <div class="big-stat"><div class="n">${fmt(tot(2026))}</div><span class="lbl navy">2026 Members</span><div class="under"></div></div>
    <div class="big-stat"><div class="n">${clubsTotal}</div><span class="lbl">Largest Clubs Pinned</span><div class="under"></div></div>`;

  const legend = mapState.mode==='trend'
    ? `<span><span class="sw" style="background:${NAVY}"></span>Growing (2024&rarr;2025)</span>
       <span><span class="sw" style="background:${RED}"></span>Declining</span>
       <span><span class="sw" style="background:#b9c3d4"></span>Steady (&plusmn;3%)</span>
       <span><span class="sw" style="background:#e6ebf2;border:1px solid #d8e0ec"></span>No members</span>
       <span><span class="sw" style="background:${RED};border-radius:50%;width:10px;height:10px"></span>Top-30 club (2026 members)</span>`
    : `<span><span class="sw" style="background:${heatColor(1,10)}"></span>Fewer</span>
       <span><span class="sw" style="background:${heatColor(5,10)}"></span>&rarr;</span>
       <span><span class="sw" style="background:${NAVY}"></span>More 2026 members</span>`;

  const clubList = geo.clubs.map(c=>`<div><b>${fmt(c.members)}</b> &nbsp;${esc(c.name)} <span style="color:#94a3b8">(${esc(c.state)})</span></div>`).join('');

  el.innerHTML = `
  <div class="controls-row" style="margin-bottom:10px">
    <div class="seg">
      <button id="mapTrend" class="${mapState.mode==='trend'?'on':''}">Growth / Decline</button>
      <button id="mapHeat" class="${mapState.mode==='heat26'?'on':''}">2026 Members Heat</button>
    </div>
    <div class="seg"><button id="mapPins" class="${mapState.pins?'on':''}">${mapState.pins?'Pins: On':'Pins: Off'}</button></div>
    <span class="note">Hover any state or pin for details. Trend compares complete years 2024 vs 2025.</span>
  </div>
  <div class="map-board">
    <div class="map-head">
      <div class="wordmark">USA<br>Diving<span>Membership</span></div>
      <div class="map-title">Membership Map</div>
      <div style="width:110px"></div>
    </div>
    <div class="map-body">
      <div class="map-svg-wrap"><svg viewBox="${geo.viewBox}" xmlns="http://www.w3.org/2000/svg">${paths}${pins}</svg></div>
      <div class="big-stats">${stats}</div>
    </div>
    <div class="map-legend">${legend}</div>
    <div class="map-foot">
      <div class="stamp">${monthStamp} &middot; Top 30 Clubs by 2026 Membership</div>
      <div class="club-cols">${clubList}</div>
    </div>
  </div>
  <div class="callout" style="margin-top:14px"><b>Coming next — Boundary Studio:</b> this same map gains Region / Zone / East-West-Central overlays and a redraw mode: move geography between regions (down to the county level for the I&#8209;35, Southern&nbsp;Pacific, and Clark&nbsp;County splits), test any structure &mdash; 12&nbsp;regions or 9, four tiers or three &mdash; and instantly see the membership and meet-field numbers for every proposed alignment, with saved scenarios to compare side by side.</div>`;

  const bind=(id,f)=>{const b=document.getElementById(id); if(b) b.addEventListener('click',()=>{f();renderMap();});};
  bind('mapTrend',()=>{mapState.mode='trend';});
  bind('mapHeat',()=>{mapState.mode='heat26';});
  bind('mapPins',()=>{mapState.pins=!mapState.pins;});
}


/* ---------- Types & Clubs ---------- */
let TC = { loaded:false, types:null, clubs:null, sort:{col:'m26', dir:-1}, q:'', ageOn:false, ageYear:2026 };

async function renderTypes(){
  const el = document.getElementById('viewTypes');
  if (!TC.loaded){
    el.innerHTML = '<div class="loading">Loading&hellip;</div>';
    const ageSql = [2025,2026].flatMap(Y => AGE_BUCKETS.map(([k,lo,hi]) =>
      `count(DISTINCT member_id) FILTER (WHERE membership_year=${Y} AND membership_type ILIKE '%Athlete%' AND birth_date IS NOT NULL AND (${Y}-EXTRACT(YEAR FROM birth_date)) BETWEEN ${lo} AND ${hi}) ${k}${Y%100}`
    )).join(',\n          ');
    try {
      const [types, clubs] = await Promise.all([
        NEON.query(`SELECT membership_year y, membership_type t, count(DISTINCT member_id) n FROM membership.members GROUP BY 1,2`),
        NEON.query(`SELECT COALESCE(NULLIF(club,''),'(no club listed)') club,
          mode() WITHIN GROUP (ORDER BY association) assoc,
          mode() WITHIN GROUP (ORDER BY zip5 || '|' || COALESCE(city,'') || '|' || COALESCE(state,'')) zcs,
          count(DISTINCT member_id) FILTER (WHERE membership_year=2024) m24,
          count(DISTINCT member_id) FILTER (WHERE membership_year=2025) m25,
          count(DISTINCT member_id) FILTER (WHERE membership_year=2026) m26,
          count(DISTINCT member_id) FILTER (WHERE membership_year=2026 AND membership_type ILIKE '%Athlete%') a26,
          count(DISTINCT member_id) FILTER (WHERE membership_year=2026 AND membership_type ILIKE '%Coach%') c26,
          ${ageSql}
          FROM membership.members GROUP BY 1`),
      ]);
      TC.types = types.rows; TC.clubs = clubs.rows; TC.loaded = true;
    } catch(e){ el.innerHTML = `<div class="card"><div class="card-b"><div class="callout warn"><b>Load failed.</b> ${esc(e.message||e)}</div></div></div>`; return; }
  }
  const tm = {}; TC.types.forEach(r => (tm[r.t] = tm[r.t] || {})[r.y] = +r.n);
  const g = (types, y) => types.reduce((s,t)=>s+((tm[t]||{})[y]||0), 0);
  const row = (label, types, cls, indent) => {
    const v = y => g(types, y);
    return `<tr class="${cls||''}"><td class="${indent||''}">${label}</td>
      <td class="num">${fmt(v(2024))}</td><td class="num">${fmt(v(2025))}</td><td class="num">${fmt(v(2026))}</td>
      <td class="num">${deltaHtml(v(2026), v(2025))}</td></tr>`;
  };
  const T = {
    ath17:'Athlete (17U)', ath18:'Athlete (AQUA Age 18+)',
    c17:'Competition Athlete (17U)', c18:'Competition Athlete (AQUA Age 18+)',
    i17:'Introductory Athlete 17U', i18:'Introductory Athlete AQUA Age 18+',
    co:'Coach', cco:'Competition Coach', lco:'Lifetime Coach',
    j:'Judge', vo:'Volunteer/Official', af:'Alumni / Fan', lt:'Lifetime', mc:'Medical/Consultant', st:'Staff',
  };
  const allAth = [T.ath17,T.ath18,T.c17,T.c18,T.i17,T.i18];
  const allCoach = [T.co,T.cco,T.lco];
  const other = [T.j,T.vo,T.af,T.lt,T.mc,T.st];
  const typesTable = `
  <div class="card"><div class="card-h"><h2>Membership Types</h2><span class="note">Distinct members &middot; 2026 is YTD</span></div>
  <div class="card-b"><table class="tc-table"><thead><tr>
    <th>Type</th><th class="num">2024</th><th class="num">2025</th><th class="num">2026 YTD</th><th class="num">&Delta; 25&rarr;26</th>
  </tr></thead><tbody>
    ${row('<b>ALL ATHLETES</b> (combined)', allAth, 'grand')}
    ${row('Standard Athletes (combined)', [T.ath17,T.ath18], 'sub', 'indent1')}
    ${row(esc(T.ath17), [T.ath17], '', 'indent2')}
    ${row(esc(T.ath18), [T.ath18], '', 'indent2')}
    ${row('Competition Athletes (combined)', [T.c17,T.c18], 'sub', 'indent1')}
    ${row(esc(T.c17), [T.c17], '', 'indent2')}
    ${row(esc(T.c18), [T.c18], '', 'indent2')}
    ${row('Introductory Athletes (combined)', [T.i17,T.i18], 'sub', 'indent1')}
    ${row(esc(T.i17), [T.i17], '', 'indent2')}
    ${row(esc(T.i18), [T.i18], '', 'indent2')}
    ${row('<b>ALL COACHES</b> (combined)', allCoach, 'grand')}
    ${row(esc(T.co), [T.co], '', 'indent2')}
    ${row(esc(T.cco), [T.cco], '', 'indent2')}
    ${row(esc(T.lco), [T.lco], '', 'indent2')}
    ${row('<b>OFFICIALS &amp; OTHER</b> (combined)', other, 'grand')}
    ${other.map(t=>row(esc(t), [t], '', 'indent2')).join('')}
  </tbody></table></div></div>`;

  const clubsCard = `
  <div class="card"><div class="card-h"><h2>Clubs</h2>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto">
      <div class="seg"><button id="tcAge" class="${TC.ageOn?'on':''}">Age groups: ${TC.ageOn?'on':'off'}</button></div>
      ${TC.ageOn ? `<div class="seg"><button id="tcY25" class="${TC.ageYear===2025?'on':''}">2025</button><button id="tcY26" class="${TC.ageYear===2026?'on':''}">2026 YTD</button></div>` : ''}
      <input class="search" id="tcQ" placeholder="Search club / city / state&hellip;" value="${esc(TC.q)}">
    </div></div>
  <div class="card-b"><div class="clubs-wrap"><table class="clubs-table" id="tcClubs"></table></div>
  <div class="note" style="margin-top:6px">Location = each club&rsquo;s most common member zip code. Click any column to sort.${TC.ageOn?` <b>Age groups</b> = AQUA age (Dec 31) of ${TC.ageYear} athletes: <span style="color:#0b6ea0">D</span> 11&amp;under · <span style="color:#009AC7">C</span> 12&ndash;13 · <span style="color:#2456B8">B</span> 14&ndash;15 · <span style="color:#171F69">A</span> 16&ndash;18 · <span style="color:#64748b">19+</span>.`:''}</div></div></div>`;

  el.innerHTML = typesTable + clubsCard;
  document.getElementById('tcQ').addEventListener('input', e=>{ TC.q = e.target.value; renderClubTable(); });
  const ageBtn = document.getElementById('tcAge');
  if (ageBtn) ageBtn.addEventListener('click', ()=>{ TC.ageOn=!TC.ageOn; renderTypes(); });
  const y25 = document.getElementById('tcY25'); if (y25) y25.addEventListener('click', ()=>{ TC.ageYear=2025; renderTypes(); });
  const y26 = document.getElementById('tcY26'); if (y26) y26.addEventListener('click', ()=>{ TC.ageYear=2026; renderTypes(); });
  renderClubTable();
}

function renderClubTable(){
  const yy = TC.ageYear % 100; // 25 | 26
  const AGE_COLS = [['agebar','Age mix'],['gD','D'],['gC','C'],['gB','B'],['gA','A'],['gX','19+']];
  const AGE_DOT = {gD:0,gC:1,gB:2,gA:3,gX:4};
  const cols = [
    ['club','Club'],['assoc','Association'],['loc','Location (modal zip)'],
    ['m24','2024'],['m25','2025'],['m26','2026 YTD'],['a26','Athletes \u201926'],['c26','Coaches \u201926'],['d','\u0394 25\u219226'],
  ].concat(TC.ageOn ? AGE_COLS : []);
  const numCols = new Set(['m24','m25','m26','a26','c26','d','gD','gC','gB','gA','gX']);
  // If age columns are hidden, don't leave the sort pointing at one.
  if (!TC.ageOn && (TC.sort.col in AGE_DOT || TC.sort.col==='agebar')) TC.sort = {col:'m26', dir:-1};

  let rows = TC.clubs.map(r => {
    const [zip, city, st] = (r.zcs||'||').split('|');
    return ({
    club:r.club, assoc:r.assoc||'', zip, city, st,
    loc: r.club==='(no club listed)' ? '—' : (city?city+', ':'')+(st||'')+(zip?' '+zip:''),
    m24:+r.m24, m25:+r.m25, m26:+r.m26, a26:+r.a26, c26:+r.c26, d:+r.m26-+r.m25,
    gD:+r['gd'+yy], gC:+r['gc'+yy], gB:+r['gb'+yy], gA:+r['ga'+yy], gX:+r['gx'+yy],
  });});
  const q = TC.q.trim().toLowerCase();
  if (q) rows = rows.filter(r => (r.club+' '+r.assoc+' '+r.loc).toLowerCase().includes(q));
  const {col, dir} = TC.sort;
  const sortVal = (r) => col==='agebar' ? (r.gD+r.gC+r.gB+r.gA+r.gX) : r[col];
  rows.sort((a,b)=>{ const x=sortVal(a), y=sortVal(b); return (typeof x==='string' ? x.localeCompare(y) : x-y) * dir; });

  const head = cols.map(([k,l])=>{
    const dot = k in AGE_DOT ? `<span class="agdot" style="background:${AGE_COLORS[AGE_DOT[k]]}"></span>` : '';
    return `<th data-col="${k}" class="${numCols.has(k)?'num':''}">${dot}${l} ${TC.sort.col===k?`<span class="arr">${dir<0?'\u25BC':'\u25B2'}</span>`:''}</th>`;
  }).join('');

  const ageCells = (r) => {
    if (!TC.ageOn) return '';
    const vals=[r.gD,r.gC,r.gB,r.gA,r.gX], tot=vals.reduce((s,x)=>s+x,0);
    const seg = vals.map((v,j)=> v>0 ? `<span style="flex:${v};background:${AGE_COLORS[j]}" title="${AGE_KEYS[j]}: ${fmt(v)}"></span>` : '').join('');
    const bar = `<td><span class="ag-bar clubbar" title="${tot} athletes">${seg||'<span style="flex:1;background:#eef1f6"></span>'}</span></td>`;
    const nums = vals.map(v=>`<td class="num">${v?fmt(v):'<span class="z0">0</span>'}</td>`).join('');
    return bar + nums;
  };
  const body = rows.map(r=>`<tr>
    <td><b>${esc(r.club)}</b></td><td>${esc(r.assoc)}</td><td>${esc(r.loc)}</td>
    <td class="num">${fmt(r.m24)}</td><td class="num">${fmt(r.m25)}</td><td class="num">${fmt(r.m26)}</td>
    <td class="num">${fmt(r.a26)}</td><td class="num">${fmt(r.c26)}</td><td class="num">${deltaHtml(r.m26,r.m25)}</td>${ageCells(r)}</tr>`).join('');
  const t = document.getElementById('tcClubs');
  t.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
  t.querySelectorAll('th').forEach(th=>th.addEventListener('click',()=>{
    const c = th.dataset.col;
    TC.sort = { col:c, dir: TC.sort.col===c ? -TC.sort.dir : (['club','assoc','loc'].includes(c)?1:-1) };
    renderClubTable();
  }));
}

/* ---------- boot ---------- */
function wireTabs(){
  document.querySelectorAll('#tabs .tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('#tabs .tab').forEach(x=>x.classList.toggle('active', x===t));
    const v = t.dataset.view;
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    document.getElementById('view'+v[0].toUpperCase()+v.slice(1)).classList.add('active');
    if (v==='boundary' && window.renderBoundary) window.renderBoundary();
    if (v==='types') renderTypes();
  }));
}

async function boot(){
  wireTabs();
  try {
    await loadAll();
    const tot = {}; D.byYear.forEach(r => tot[r.y] = +r.n);
    document.getElementById('topMeta').innerHTML =
      `Data: ${fmt(tot[2024]||0)} / ${fmt(tot[2025]||0)} / ${fmt(tot[2026]||0)} members (2024 / 2025 / 2026 YTD)<br>Source: Webpoint exports &middot; PII-stripped`;
    renderOverview(); renderTrends(); renderGeography(); renderRetention(); renderAau(); renderMap();
  } catch (err) {
    console.error(err);
    document.getElementById('topMeta').textContent = 'Data load failed';
    document.querySelectorAll('.view').forEach(v=>v.innerHTML =
      `<div class="card"><div class="card-b"><div class="callout warn"><b>Could not load membership data.</b> ${esc(err.message||err)}<br>Check the Neon connection and refresh.</div></div></div>`);
  }
}
boot();
})();
