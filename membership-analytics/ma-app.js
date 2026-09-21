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

/* ---------- CSV / PDF export, shared by every screen ----------
   Generic and DOM-driven on purpose: it reads whatever is actually on screen
   right now (current filter/sort/search state), rather than re-querying or
   re-deriving data, so the export can never drift from what the user is
   looking at. Works off two structural conventions already used by every
   screen in this app: a KPI headline (.kpi-band > .kpi > .big/.chip/.sub)
   and detail tables (.card > .card-h h2 + .card-b table). A screen with
   neither (the Membership Map) opts in with data-csv-table / data-csv-row /
   data-col-* attributes instead — see renderMap().
   PDF reuses the same branded doc header as the Comparison Reports bar
   (ma-reports.js's #mr-output / .mr-doc / .mr-css, injected by that file)
   and simply clones the live view into it, so a screen's charts, cards and
   tables print exactly as shown, with interactive controls stripped out. */
function csvCell(el){
  if (!el) return '';
  return el.textContent.replace(/\s+/g,' ').trim();
}
function csvEscape(v){
  const s = v==null ? '' : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}
function tableToCSVRows(table){
  const rows = [];
  table.querySelectorAll('tr').forEach(tr=>{
    const cells = Array.from(tr.children)
      .filter(c=>c.tagName==='TD'||c.tagName==='TH')
      .map(csvCell);
    if (cells.some(c=>c!=='')) rows.push(cells);
  });
  return rows;
}
function downloadCSVText(filenameBase, text){
  const blob = new Blob(['\uFEFF' + text], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href = url; a.download = `${filenameBase}-${stamp}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}
function notifyExport(msg){ if (window.USAD && USAD.toast) USAD.toast(msg, {kind:'warn'}); else console.warn(msg); }

function exportViewCSV(viewElId, filenameBase){
  const src = document.getElementById(viewElId);
  if (!src){ notifyExport('Nothing to export yet'); return; }
  const blocks = [];

  src.querySelectorAll('.kpi-band').forEach(band=>{
    const rows = [['Metric','Value','Detail']];
    band.querySelectorAll(':scope > .kpi').forEach(k=>{
      rows.push([csvCell(k.querySelector('.chip')), csvCell(k.querySelector('.big')), csvCell(k.querySelector('.sub'))]);
    });
    if (rows.length > 1) blocks.push({title:'Summary', rows});
  });

  // Opt-in generic data grid, for screens with no native <table> (e.g. the Map).
  src.querySelectorAll('[data-csv-table]').forEach(grid=>{
    const items = Array.from(grid.querySelectorAll('[data-csv-row]'));
    if (!items.length) return;
    const cols = Array.from(items[0].attributes)
      .filter(a=>a.name.startsWith('data-col-'))
      .map(a=>a.name.slice('data-col-'.length));
    if (!cols.length) return;
    const rows = [cols.map(c=>c.replace(/-/g,' '))];
    items.forEach(it=>rows.push(cols.map(c=>it.getAttribute('data-col-'+c) || '')));
    blocks.push({title: grid.getAttribute('data-csv-title') || '', rows});
  });

  src.querySelectorAll('.card').forEach(card=>{
    const h2 = card.querySelector('.card-h h2');
    const title = h2 ? csvCell(h2) : '';
    card.querySelectorAll('table').forEach(table=>{
      const rows = tableToCSVRows(table);
      if (rows.length) blocks.push({title, rows});
    });
  });
  // Defensive: a table not inside a .card (none exist today, but don't silently drop one).
  Array.from(src.querySelectorAll('table')).forEach(table=>{
    if (table.closest('.card')) return;
    const rows = tableToCSVRows(table);
    if (rows.length) blocks.push({title:'', rows});
  });

  if (!blocks.length){ notifyExport('Nothing exportable on this screen yet'); return; }
  const lines = [];
  blocks.forEach((b,i)=>{
    if (i > 0) lines.push('');
    if (b.title) lines.push(csvEscape(b.title));
    b.rows.forEach(r=>lines.push(r.map(csvEscape).join(',')));
  });
  downloadCSVText(filenameBase, lines.join('\r\n'));
}

function exportViewPDF(viewElId, title, subtitleHtml){
  const src = document.getElementById(viewElId);
  if (!src){ notifyExport('Nothing to export yet'); return; }
  if (!document.getElementById('mr-css')){
    notifyExport('Report styling has not loaded yet — try again in a moment');
    return;
  }
  const old = document.getElementById('mr-output'); if (old) old.remove();
  const out = document.createElement('div');
  out.id = 'mr-output';
  out.innerHTML = `
    <div class="mr-toolbar">
      <button class="mr-print" onclick="window.print()">Print / save as PDF</button>
      <button onclick="document.getElementById('mr-output').remove()">✕ Close</button>
      <span class="mr-soft" style="margin-left:auto">Print to PDF for the cleanest result. Sized for US Letter.</span>
    </div>
    <div class="mr-doc">
      <div class="mr-doc-head">
        <h1>${esc(title)}</h1>
        <div class="mr-doc-sub">${subtitleHtml}</div>
      </div>
      <div class="mr-doc-body"></div>
    </div>`;
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  // Strip anything interactive — a printed doc has no use for a search box,
  // a sort button, or our own export bar, and they read as broken when static.
  clone.querySelectorAll('input,select,button,.ma-export-bar').forEach(n=>n.remove());
  out.querySelector('.mr-doc-body').appendChild(clone);
  document.body.appendChild(out);
  try { window.scrollTo(0,0); } catch(e){}
}

function exportBarHtml(viewElId, filenameBase, title, subtitleHtml){
  return `<div class="ma-export-bar">
    <button class="mr-bar-btn" onclick="MAExport.csv('${viewElId}','${filenameBase}')">Export CSV</button>
    <button class="mr-bar-btn mr-bar-prim" onclick="MAExport.pdf('${viewElId}',${JSON.stringify(title)},${JSON.stringify(subtitleHtml)})">Export PDF</button>
  </div>`;
}
// Exposed so ma-clubs.js and ma-reports.js (each its own IIFE) can use the
// same exporter and the same export-bar markup — one implementation, every screen.
window.MAExport = { csv: exportViewCSV, pdf: exportViewPDF, bar: exportBarHtml };

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
    // The only query needing name columns. The browser's database role cannot
    // read those by design (this app's credential is served publicly), so this
    // one query is allowed to fail on its own instead of taking the whole
    // bootstrap -- and every other view -- down with it.
    NEON.query(`SELECT DISTINCT ON (a.member_id) a.member_id, a.first_name, a.last_name, a.membership_type, a.member_status,
                COALESCE(a.club,'(no club)') club, COALESCE(a.association,'') assoc, a.state,
                CASE WHEN a.birth_date IS NULL THEN '' ELSE (${GRP_SQL.replace(/membership_year/g,'a.membership_year').replace(/birth_date/g,'a.birth_date')}) END grp
                FROM membership.members a
                WHERE a.membership_year=2025
                AND NOT EXISTS (SELECT 1 FROM membership.members b WHERE b.member_id=a.member_id AND b.membership_year=2026)
                ORDER BY a.member_id, a.membership_type`).catch(e => {
                  console.warn('win-back roster unavailable:', e && e.message);
                  return { rows: [] };
                }),
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

  document.getElementById('viewOverview').innerHTML =
    exportBarHtml('viewOverview','membership-overview','Membership Overview',
      `Membership years: 2024–2026 (2026 is year-to-date)<br>Generated: ${new Date().toLocaleString()}`)
    + kpis + `
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

  document.getElementById('viewTrends').innerHTML =
    exportBarHtml('viewTrends','membership-trends','Membership Trends',
      `Membership years: 2024–2026 (2026 is year-to-date)<br>Generated: ${new Date().toLocaleString()}`)
    + `
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

  const geoSub = `Grouped by: ${geoState.mode==='assoc'?'Association (LDA)':'State'}`
    + (geoState.mode==='assoc' ? ` · Scope: ${geoState.metric==='ath'?'Athletes only':'All members'}` : '')
    + ` · Sorted by: ${geoState.sortK} (${geoState.sortDir<0?'desc':'asc'})`
    + (geoState.q ? ` · Filter: "${esc(geoState.q)}"` : '')
    + `<br>Generated: ${new Date().toLocaleString()}`;
  el.innerHTML =
    exportBarHtml('viewGeography','membership-geography','Geography', geoSub)
    + `
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
      <div class="sub">${fmt(r.lost2425)} lost (${pct(r.lost2425, +(D.byYear.find(x=>+x.y===2024)||{n:0}).n).toFixed(1)}% churn) &middot; ${fmt(r.new25)} new in 2025<br><span class="scope-tag all">All membership types</span></div></div>
    <div class="kpi pool"><div class="big">${fmt(r.r2526)}</div><span class="chip pool">2025 &rarr; 2026 Renewed So Far</span>
      <div class="sub">${fmt(r.lost2526)} not yet renewed &middot; ${fmt(r.new26)} new in 2026<br><span class="scope-tag all">All membership types</span></div></div>
    <div class="kpi red"><div class="big">${pct(r.r2526, +(D.byYear.find(x=>+x.y===2025)||{n:0}).n).toFixed(0)}%</div><span class="chip">2026 Renewal Rate (YTD)</span>
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
  const rosterBlock = rosterRows ? rosterRows :
    `<tr><td colspan="9"><b>Names unavailable.</b> This list shows members by name, and the browser's
      database role can no longer read name fields &mdash; that access was removed because this app's
      credential is served publicly. The retention and churn figures above are unaffected and complete.
      Restoring the list means routing this one query through the server-side proxy.</td></tr>`;

  const retSub = `Win-back list filter: ${lostState.assoc ? 'association "'+esc(lostState.assoc)+'"' : 'all associations'}`
    + (lostState.q ? ` · search "${esc(lostState.q)}"` : '')
    + `<br>Generated: ${new Date().toLocaleString()}`;
  el.innerHTML =
    exportBarHtml('viewRetention','membership-retention','Retention & Churn', retSub)
    + kpis + `
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
      <table><thead><tr><th>Name</th><th>2025 membership</th><th>Group</th><th>Club</th><th>Association</th><th>State</th></tr></thead><tbody>${rosterBlock}</tbody></table>
    </div>
    <div class="foot">Contact details are intentionally not stored in this system. Pull outreach contacts from Webpoint using Member ID / name.</div></div>`;

  const qi=document.getElementById('lostQ');
  qi.addEventListener('input',()=>{lostState.q=qi.value; lostState.page=0; renderRetention(); const v=document.getElementById('lostQ'); v.focus(); v.setSelectionRange(v.value.length,v.value.length);});
  document.getElementById('lostAssoc').addEventListener('change',e=>{lostState.assoc=e.target.value; lostState.page=0; renderRetention();});
  document.getElementById('lostPrev').addEventListener('click',()=>{if(lostState.page>0){lostState.page--;renderRetention();}});
  document.getElementById('lostNext').addEventListener('click',()=>{lostState.page++;renderRetention();});
}

/* ---------- AAU Landscape ----------
   Backed by the AAU/Dive-Live pipeline (db/scripts/build_aau_overlap.py,
   aau_qualifying_check.py -- both run daily via
   .github/workflows/build-aau-overlap.yml). Every number here carries its
   own coverage caveat inline rather than in one disclaimer at the bottom,
   matching the rest of this app -- see each card. */
let AAU = { loaded:false, overlap:null, overlapDetail:null, rwb:null, qual:null, qualDetail:null, qualYear:2026,
  membership:null, membershipDetail:null };
// USA Diving's own fees, mirroring ma-clubs.js's CLUB_FEES (kept separately since
// each module here is its own IIFE with nothing shared but NEON) -- and AAU's,
// from AAU's own published membership-fees page (aausports.org/membership-fees/,
// checked 2026-09-21). Entry fees are the AAU Diving Nationals 2026 packet Mike
// provided ($80/event) vs a representative USA Diving Junior Circuit entry fee.
const AAU_FEE_YOUTH_ATHLETE = 22;      // AAU Youth Athlete, regular (their cheapest athlete tier)
const USAD_FEE_INTRO = 22;             // USA Diving Introductory Athlete, new for 2026
const USAD_FEE_COMPETITION = 233;      // USA Diving Competition Athlete + $33 background
const AAU_GROUP_ORDER = ['D','C','B','A','19PLUS'];
const AAU_GROUP_LABEL = {D:'Group D (11 & under)', C:'Group C (12–13)', B:'Group B (14–15)', A:'Group A (16–18)', '19PLUS':'19 & over'};

async function renderAau(){
  const el = document.getElementById('viewAau');
  if (!AAU.loaded){
    el.innerHTML = '<div class="loading">Loading AAU comparison data&hellip;</div>';
    try {
      const [overlap, detail, rwb, qual, qualDetail, membership, membershipDetail] = await Promise.all([
        NEON.query(`SELECT cohort_year, aau_divers, matched_usad, match_pct, membership_data_available
                    FROM scoresandmore.aau_usad_overlap WHERE match_tier='nickname' ORDER BY cohort_year`),
        NEON.query(`SELECT cohort_year, gender, usad_group, apparatus, aau_divers, matched_usad, membership_data_available
                    FROM scoresandmore.aau_usad_overlap_detail
                    WHERE match_tier='nickname' AND usad_group IN ('D','C','B','A','19PLUS')`),
        NEON.query(`SELECT EXTRACT(YEAR FROM start_date)::int yr, rwb_color, rwb_region
                    FROM scoresandmore.meet_classification
                    WHERE series='aau_rwb_qualifier' AND rwb_region IS NOT NULL`),
        NEON.query(`SELECT cohort_year, entrants, verified_dive_live_only, verified_usad_only,
                    verified_both, verified_total, unverified, verified_pct
                    FROM scoresandmore.aau_qualifying_check ORDER BY cohort_year`),
        NEON.query(`SELECT cohort_year, usad_group, gender, apparatus, entrants, verified_total,
                    unverified, verified_pct
                    FROM scoresandmore.aau_qualifying_check_detail ORDER BY cohort_year, usad_group, gender, apparatus`),
        NEON.query(`SELECT cohort_year, unique_names, unique_diver_ids
                    FROM scoresandmore.aau_membership_estimate ORDER BY cohort_year`),
        NEON.query(`SELECT cohort_year, gender, usad_group, unique_names, unique_diver_ids
                    FROM scoresandmore.aau_membership_estimate_detail ORDER BY cohort_year, usad_group, gender`),
      ]);
      AAU.overlap = overlap.rows; AAU.overlapDetail = detail.rows; AAU.rwb = rwb.rows;
      AAU.qual = qual.rows; AAU.qualDetail = qualDetail.rows;
      AAU.membership = membership.rows; AAU.membershipDetail = membershipDetail.rows;
      AAU.loaded = true;
    } catch(e){
      el.innerHTML = `<div class="card"><div class="card-b"><div class="callout warn"><b>Load failed.</b> ${esc(e.message||e)}</div></div></div>`;
      return;
    }
  }
  renderAauBody();
}

function aauKpis(){
  const latestOverlap = AAU.overlap[AAU.overlap.length-1] || {};
  const latestMembership = AAU.membership[AAU.membership.length-1] || {};
  const rwbByYear = {};
  AAU.rwb.forEach(r=>{ (rwbByYear[r.yr] = rwbByYear[r.yr] || new Set()).add(r.rwb_color+'|'+r.rwb_region); });
  const rwbYears = Object.keys(rwbByYear).map(Number).sort((a,b)=>a-b);
  const latestRwbYear = rwbYears[rwbYears.length-1];
  const priorRwbYear = rwbYears.find(y=>rwbByYear[y].size !== (rwbByYear[latestRwbYear]||new Set()).size);
  const feeMultiple = (USAD_FEE_COMPETITION / AAU_FEE_YOUTH_ATHLETE).toFixed(1);
  return `
  <div class="kpi-band">
    <div class="kpi navy"><div class="big">${fmt(+latestMembership.unique_names||0)}</div>
      <span class="chip navy">${latestMembership.cohort_year||''} Est. AAU Membership</span>
      <div class="sub">Unique names across AAU-classified events<br><span class="scope-tag all">Floor, not a census &mdash; see card below</span></div></div>
    <div class="kpi pool"><div class="big">${latestOverlap.membership_data_available ? (+latestOverlap.match_pct||0)+'%' : '—'}</div>
      <span class="chip pool">Matched to USA Diving</span>
      <div class="sub">${latestOverlap.membership_data_available ? 'Name match, nickname tier' : 'No membership snapshot for this year to check against'}</div></div>
    <div class="kpi red"><div class="big">${feeMultiple}&times;</div>
      <span class="chip">Cost Gap: Competition Athlete vs AAU</span>
      <div class="sub">$${USAD_FEE_COMPETITION} (+background) vs $${AAU_FEE_YOUTH_ATHLETE}/yr &mdash; see cost card</div></div>
    <div class="kpi sky"><div class="big">${(rwbByYear[latestRwbYear]?.size||0)}</div>
      <span class="chip navy">${latestRwbYear||''} RWB Qualifying Sites</span>
      <div class="sub">${priorRwbYear ? `Was ${rwbByYear[priorRwbYear].size} in ${priorRwbYear}` : '3 colors &times; regions'}</div></div>
  </div>`;
}

function aauMembershipCard(){
  const rows = AAU.membership.slice().reverse().map(r=>{
    const gap = (+r.unique_diver_ids) - (+r.unique_names);
    return `<tr><td><b>${r.cohort_year}</b></td><td class="num">${fmt(+r.unique_names)}</td>
      <td class="num">${fmt(+r.unique_diver_ids)}</td>
      <td class="num" style="color:#5a6480">${gap>0?'+':''}${fmt(gap)}</td></tr>`;
  }).join('');
  const latestYear = AAU.membership.length ? AAU.membership[AAU.membership.length-1].cohort_year : null;
  const detail = AAU.membershipDetail.filter(r=>r.cohort_year===latestYear);
  const genders = ['Boys','Girls'];
  const groupOrder = ['D','C','B','A','19PLUS','OTHER'];
  const groupLabel = Object.assign({}, AAU_GROUP_LABEL, {OTHER:'Other / unclassified'});
  const detailRows = groupOrder.map(g=>{
    return `<tr><td>${esc(groupLabel[g]||g)}</td>` + genders.map(gen=>{
      const r = detail.find(d=>d.usad_group===g && d.gender===gen);
      return `<td class="num">${r?fmt(+r.unique_names):'&mdash;'}</td>`;
    }).join('') + `</tr>`;
  }).join('');
  return `
  <div class="card"><div class="card-h"><h2>Estimated AAU Membership</h2>
    <span class="sub">Unique event-entry names, all domestic-AAU-classified meets &middot; AAU publishes no membership figures of its own</span></div>
    <div class="card-b">
      <table><thead><tr><th>Year</th><th class="num">Unique names</th><th class="num">Unique diver IDs</th><th class="num">Gap</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <details style="margin-top:10px">
        <summary style="cursor:pointer;font-weight:700;color:#171F69;font-size:12.5px">By age group &amp; gender (${latestYear||''}) &mdash; click to expand</summary>
        <table style="margin-top:8px"><thead><tr><th>Group</th><th class="num">Boys</th><th class="num">Girls</th></tr></thead>
        <tbody>${detailRows}</tbody></table>
      </details>
      <div class="coverage-note" style="margin-top:10px"><b>Two identity keys, on purpose.</b> "Unique names" dedupes by normalized
        first+last name; "unique diver IDs" is Dive Live's own athlete key. They should track closely &mdash; where they don't (2024&ndash;2026
        run slightly higher on names than IDs; 2022&ndash;2023 run the other way) is itself a data-quality signal, not noise to average away.
        Either way, this only counts people with evidence in a meet whose <i>name</i> reads as AAU &mdash; most Dive Live volume (52,621 of
        82,471 results) sits in meets that never say "AAU," so this is a floor, likely a substantial one.</div>
    </div></div>`;
}

function aauCostCard(){
  return `
  <div class="card"><div class="card-h"><h2>Membership Cost Comparison</h2>
    <span class="sub">AAU's own published fees vs ours &middot; checked 2026-09-21</span></div>
    <div class="card-b">
      <table><thead><tr><th>Membership</th><th class="num">Annual fee</th></tr></thead><tbody>
        <tr><td><b>AAU Youth Athlete</b> (regular)</td><td class="num">$${AAU_FEE_YOUTH_ATHLETE}</td></tr>
        <tr><td>USA Diving Introductory Athlete <span class="note" style="font-size:10.5px">(new for 2026)</span></td><td class="num">$${USAD_FEE_INTRO}</td></tr>
        <tr><td>USA Diving Athlete (17U)</td><td class="num">$40</td></tr>
        <tr class="grand"><td><b>USA Diving Competition Athlete</b> (+ $33 background)</td><td class="num">$${USAD_FEE_COMPETITION}</td></tr>
      </tbody></table>
      <div class="note" style="margin-top:8px">Per-event entry: AAU Nationals runs $80/event flat. USA Diving Junior Circuit entries vary by
        meet tier (see the Reports bar's fee tables) but Regional/Zone entries commonly run higher per event once host and sanction fees are added.</div>
      <div class="coverage-note" style="margin-top:10px">Our new Introductory Athlete tier ($22) now matches AAU's own youth fee almost exactly &mdash;
        but the <b>Competition Athlete</b> tier most serious divers actually need to enter meets like Zones/Nationals is roughly
        <b>${(USAD_FEE_COMPETITION/AAU_FEE_YOUTH_ATHLETE).toFixed(1)}&times;</b> AAU's price. Source: AAU's published membership-fees page
        (aausports.org/membership-fees) and our own CLUB_FEES table (Club Health tab).</div>
    </div></div>`;
}

function aauHunchNarrative(){
  return `<div class="callout" style="margin-bottom:14px"><b>Working hypothesis (Mike, 2026-09-21):</b> we're likely losing some
    members to AAU not because it offers a worse experience, but because it's dramatically cheaper and is widely seen as
    offering &ldquo;equal&rdquo; opportunity and prestige &mdash; especially at AAU Summer Nationals. This tab exists to put real
    numbers next to that hunch, not to confirm it: the membership estimate and cost gap above are the strongest evidence for it
    so far; the qualifying-score enforcement question below is a related but separate thread.</div>`;
}

function aauOverlapCard(){
  const rows = AAU.overlap.slice().reverse().map(r=>`
    <tr><td><b>${r.cohort_year}</b></td>
      <td class="num">${fmt(+r.aau_divers)}</td>
      <td class="num">${r.membership_data_available ? fmt(+r.matched_usad) : '<span style="color:#94a3b8" title="membership.members has no snapshot for this year">n/a<sup style="color:#E31937">*</sup></span>'}</td>
      <td class="num">${r.membership_data_available ? (+r.match_pct)+'%' : '—'}</td></tr>`).join('');
  return `
  <div class="card"><div class="card-h"><h2>AAU / USA Diving Overlap by Year</h2>
    <span class="sub">Distinct AAU-cohort divers also seen as a USA Diving athlete member, by name (nickname tier)</span></div>
    <div class="card-b">
      <table><thead><tr><th>Year</th><th class="num">AAU cohort</th><th class="num">Also USA Diving</th><th class="num">Match rate</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="coverage-note"><b><span style="color:#E31937">*</span> Not zero &mdash; not checkable.</b>
        USA Diving membership records only go back to 2024, so 2022&ndash;2023 AAU cohorts have nothing to match against yet.
        Once earlier membership years are loaded, these rows recompute automatically.</div>
    </div></div>`;
}

function aauGroupGenderCard(){
  const latestYear = AAU.overlap.length ? AAU.overlap[AAU.overlap.length-1].cohort_year : null;
  const rows = AAU.overlapDetail.filter(r=>r.cohort_year===latestYear);
  const agg = {};   // group|gender -> {n, matched, avail}
  rows.forEach(r=>{
    const key = r.usad_group+'|'+r.gender;
    const a = agg[key] = agg[key] || {n:0, matched:0, avail:r.membership_data_available};
    a.n += +r.aau_divers; a.matched += r.membership_data_available ? (+r.matched_usad||0) : 0;
  });
  const genders = ['Male','Female'];
  const body = AAU_GROUP_ORDER.map(g=>{
    return `<tr><td><b>${esc(AAU_GROUP_LABEL[g])}</b></td>` + genders.map(gen=>{
      const a = agg[g+'|'+gen];
      if (!a || !a.n) return `<td class="num">&mdash;</td>`;
      if (!a.avail) return `<td class="num" style="color:#94a3b8">n/a</td>`;
      return `<td class="num">${(100*a.matched/a.n).toFixed(1)}% <span style="color:#94a3b8;font-size:10.5px">(${fmt(a.n)})</span></td>`;
    }).join('') + `</tr>`;
  }).join('');
  return `
  <div class="card"><div class="card-h"><h2>Overlap by Age Group &amp; Gender</h2>
    <span class="sub">${latestYear||''} &middot; match rate, cohort size in parens</span></div>
    <div class="card-b"><table><thead><tr><th>Age group</th><th class="num">Boys</th><th class="num">Girls</th></tr></thead>
    <tbody>${body}</tbody></table></div></div>`;
}

function aauRwbCard(){
  const byYear = {};
  AAU.rwb.forEach(r=>{
    const y = byYear[r.yr] = byYear[r.yr] || {};
    const k = r.rwb_color+'|'+r.rwb_region;
    y[k] = (y[k]||0) + 1;
  });
  const years = Object.keys(byYear).map(Number).sort((a,b)=>a-b);
  const rows = years.map(y=>{
    const regions = new Set(Object.keys(byYear[y]).map(k=>k.split('|')[1]));
    return `<tr><td><b>${y}</b></td><td>${[...regions].sort().map(r=>`<span class="pill navy" style="margin-right:4px;text-transform:capitalize">${esc(r)}</span>`).join('')}</td>
      <td class="num">${regions.size * 3}</td></tr>`;
  }).join('');
  return `
  <div class="card"><div class="card-h"><h2>Red / White / Blue Qualifier Structure</h2>
    <span class="sub">Derived from meet names classified as RWB qualifiers &mdash; not an authoritative rules feed</span></div>
    <div class="card-b"><table><thead><tr><th>Year</th><th>Regions seen</th><th class="num">Sites (regions &times; 3 colors)</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="note" style="margin-top:8px">AAU's own announcement confirms the North/South &rarr; North/Central/South expansion starting the 2025 season (6 &rarr; 9 qualifying sites) &mdash; matches what the meet-name classification shows independently.</div></div></div>`;
}

function aauQualifyingCard(){
  const yr = AAU.qualYear;
  const coarse = AAU.qual.find(r=>r.cohort_year===yr) || {};
  const detail = AAU.qualDetail.filter(r=>r.cohort_year===yr);
  const rows = detail.map(r=>`<tr><td><b>${esc(AAU_GROUP_LABEL[r.usad_group]||r.usad_group)}</b></td><td>${esc(r.gender)}</td><td>${esc(r.apparatus)}</td>
    <td class="num">${fmt(r.entrants)}</td>
    <td class="num">${r.verified_pct!=null ? r.verified_pct+'%' : '—'}</td>
    <td class="num">${fmt(r.unverified)}</td></tr>`).join('');
  const yearBtns = AAU.qual.map(r=>`<button class="tab ${r.cohort_year===yr?'active':''}" data-qual-yr="${r.cohort_year}">${r.cohort_year}</button>`).join('');
  return `
  <div class="card"><div class="card-h"><h2>AAU Nationals &mdash; Verified Qualifying Score</h2>
    <span class="sub">Age-group (D/C/B/A) entrants only &middot; Elite Open, College Open and Group E excluded (no point-score standard)</span></div>
    <div class="card-b">
      <div class="controls-row"><div class="seg" id="aauQualYearSeg">${yearBtns}</div>
        <span class="note">${fmt(coarse.entrants||0)} entrants &middot; ${fmt(coarse.unverified||0)} (${coarse.entrants?(100-coarse.verified_pct).toFixed(1):'—'}%) with no qualifying result found</span></div>
      <table><thead><tr><th>Group</th><th>Gender</th><th>Event</th><th class="num">Entrants</th><th class="num">Verified</th><th class="num">No record</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="coverage-note"><b>What "no record found" does and doesn't mean.</b> Checked against every scraped
        Dive Live result (not just meets named "AAU") <i>and</i> USA Diving's own results (exact name match) for the
        Sept&ndash;July qualifying window. <b>Not checked:</b> state high-school meets outside our Dive Live scrape,
        and AQUA/FINA or Diving Plongeon Canada results (not in our data at all). A diver here may have legitimately
        qualified somewhere we can't see &mdash; this is a floor on verified qualification, not a finding that anyone
        lacked a score.</div>
    </div></div>`;
}

function renderAauBody(){
  const el = document.getElementById('viewAau');
  const latestYear = AAU.overlap.length ? AAU.overlap[AAU.overlap.length-1].cohort_year : '';
  el.innerHTML =
    exportBarHtml('viewAau','membership-aau-landscape','AAU Landscape',
      `AAU/Dive-Live cohort through ${latestYear} (latest year is YTD)<br>Generated: ${new Date().toLocaleString()}`)
    + aauHunchNarrative()
    + aauKpis()
    + `<div class="grid-2">${aauMembershipCard()}${aauCostCard()}</div>`
    + `<div class="grid-2">${aauOverlapCard()}${aauGroupGenderCard()}</div>`
    + aauRwbCard()
    + `<details style="margin-top:6px"><summary style="cursor:pointer;font-weight:700;color:#171F69;
         font-family:var(--display);font-size:15px;letter-spacing:.03em;text-transform:uppercase;padding:6px 2px">
         My Hunch: Is the Qualifying Score Actually Enforced? &mdash; click to expand</summary>
       <div style="margin-top:8px">${aauQualifyingCard()}</div></details>`;

  const seg = document.getElementById('aauQualYearSeg');
  if (seg) seg.querySelectorAll('button[data-qual-yr]').forEach(b=>b.addEventListener('click', ()=>{
    AAU.qualYear = +b.dataset.qualYr; renderAauBody();
  }));
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
    return `<path class="st" d="${s.d}" fill="${fills[s.abbr]}" data-csv-row
      data-col-state="${esc(s.name)}" data-col-2024="${v[2024]||0}" data-col-2025="${v[2025]||0}"
      data-col-2026-ytd="${v[2026]||0}"><title>${esc(tip)}</title></path>`;
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

  const clubList = geo.clubs.map(c=>`<div data-csv-row data-col-club="${esc(c.name)}" data-col-city="${esc(c.city||'')}"
    data-col-state="${esc(c.state)}" data-col-members="${c.members||0}" data-col-athletes="${c.athletes||0}">
    <b>${fmt(c.members)}</b> &nbsp;${esc(c.name)} <span style="color:#94a3b8">(${esc(c.state)})</span></div>`).join('');

  const mapSub = `Mode: ${mapState.mode==='trend'?'Growth / Decline (2024→2025)':'2026 Members Heat'} · Pins: ${mapState.pins?'on':'off'}`
    + `<br>Generated: ${new Date().toLocaleString()}`;
  el.innerHTML =
    exportBarHtml('viewMap','membership-map', 'Membership Map', mapSub)
    + `
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
      <div class="map-svg-wrap"><svg viewBox="${geo.viewBox}" xmlns="http://www.w3.org/2000/svg" data-csv-table data-csv-title="Membership by state">${paths}${pins}</svg></div>
      <div class="big-stats">${stats}</div>
    </div>
    <div class="map-legend">${legend}</div>
    <div class="map-foot">
      <div class="stamp">${monthStamp} &middot; Top 30 Clubs by 2026 Membership</div>
      <div class="club-cols" data-csv-table data-csv-title="Top clubs by 2026 membership">${clubList}</div>
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
    try {
      const types = await NEON.query(`SELECT membership_year y, membership_type t, count(DISTINCT member_id) n,
          count(DISTINCT member_id) FILTER (WHERE EXTRACT(YEAR FROM exp_date)=membership_year
                                             OR EXTRACT(YEAR FROM exp_date)>=2100) nc
          FROM membership.members GROUP BY 1,2`);
      TC.types = types.rows; TC.loaded = true;
    } catch(e){ el.innerHTML = `<div class="card"><div class="card-b"><div class="callout warn"><b>Load failed.</b> ${esc(e.message||e)}</div></div></div>`; return; }
  }
  const tm = {}; TC.types.forEach(r => (tm[r.t] = tm[r.t] || {})[r.y] = {n:+r.n, c:+r.nc});
  const g  = (types, y) => types.reduce((s,t)=>s+(((tm[t]||{})[y]||{}).n||0), 0);
  const gc = (types, y) => types.reduce((s,t)=>s+(((tm[t]||{})[y]||{}).c||0), 0);
  // A membership type that shows members in an earlier year but has ZERO records
  // that actually belong to that year was not sold that year — the rows are the
  // member's current (renewed) record bleeding backwards in the Webpoint export.
  // Lifetime types are safe here: their far-future expiry counts as consistent.
  const notSold = (types, y) => y < 2026 && g(types,y) > 0 && gc(types,y) === 0;
  const NA = '<td class="num" style="color:#94a3b8" title="Not offered this year — see note below">&mdash;<sup style="color:#E31937">*</sup></td>';
  const row = (label, types, cls, indent, opts) => {
    const sup = y => !(opts&&opts.noSup) && notSold(types, y);
    const cell = y => sup(y) ? NA : `<td class="num">${fmt(g(types,y))}</td>`;
    const d = sup(2025)
      ? `<td class="num" style="color:#009AC7;font-weight:600">new in 2026</td>`
      : `<td class="num">${deltaHtml(g(types,2026), g(types,2025))}</td>`;
    return `<tr class="${cls||''}"><td class="${indent||''}">${label}</td>
      ${cell(2024)}${cell(2025)}${cell(2026)}${d}</tr>`;
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
  // Anything Webpoint sent us that doesn't match a known type (blank type field,
  // retired labels). Shown so the three groups above reconcile to the year totals.
  const KNOWN = new Set(Object.values(T));
  const unk = Object.keys(tm).filter(t => !KNOWN.has(t));
  const unkRow = (g(unk,2024)+g(unk,2025)+g(unk,2026)) > 0
    ? row('<b>NO TYPE ON FILE</b> (blank or retired label)', unk, 'grand', '', {noSup:true})
    : '';
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
    ${unkRow}
  </tbody></table>
  <div class="coverage-note"><b><span style="color:#E31937">*</span> Not offered that year.</b>
    Webpoint exports show each member&rsquo;s <b>current</b> membership record, so when someone renews,
    their earlier year&rsquo;s row gets rewritten with today&rsquo;s membership type and dates. That is why a type
    first sold in 2026 (Introductory Athlete) can appear to have a handful of 2024 and 2025 sign-ups.
    Those people were real members in those years &mdash; they are still counted in the combined athlete
    rows &mdash; but their actual 2024/2025 type is not recoverable from this export.
    <br><br>Same effect, smaller impact, everywhere else: <b>35% of 2024 rows and 53% of 2025 rows</b>
    carry a renewed 2026 record, so prior-year type splits are close but not exact for members who have
    since renewed. Year totals, 2026 figures, and the accountant&rsquo;s sales ledger are unaffected.
  </div></div></div>`;

  el.innerHTML =
    exportBarHtml('viewTypes','membership-types','Membership Types',
      `Distinct members · 2026 is year-to-date<br>Generated: ${new Date().toLocaleString()}`)
    + typesTable;
}
function wireTabs(){
  document.querySelectorAll('#tabs .tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('#tabs .tab').forEach(x=>x.classList.toggle('active', x===t));
    const v = t.dataset.view;
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    document.getElementById('view'+v[0].toUpperCase()+v.slice(1)).classList.add('active');
    // Boundary Studio and Pricing Studio moved to boundary-studio/ — their
    // handoffs are gone with them. Everything else is unchanged.
    if (v==='types') renderTypes();
    if (v==='clubs' && window.renderClubs) window.renderClubs();
    if (v==='overview' && window.renderMemberImport){
      const host = document.getElementById('viewOverview');
      if (host && !document.getElementById('miCard')){
        const d = document.createElement('div'); d.id = 'miCard'; host.appendChild(d);
      }
      window.renderMemberImport();
    }
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
