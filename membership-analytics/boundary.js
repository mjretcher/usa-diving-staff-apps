/* USA Diving Membership Analytics — Boundary Studio (boundary.js)
   Paint counties into proposed areas and watch member/athlete/coach/club
   tallies update live. Atoms: member -> zip5 -> county (point-in-polygon,
   precomputed in boundary-data.json). Competitor pools (entrants by event /
   age group / gender) come from advance-data.json, built by joining
   core.event_results to membership.members on name -> zip5 -> county.
   Scenarios persist to membership.boundary_scenarios (Neon), format v3.
*/
(function(){
'use strict';

const PALETTE = ['#171F69','#E31937','#009AC7','#15803d','#b45309','#7c3aed','#0f766e','#be185d','#8FC3EA','#a16207','#64748b','#92400e','#1d4ed8','#ca8a04','#0891b2','#9f1239'];
const UNASSIGNED_BASE = '#eef1f6';
// Distinct, brand-aligned color ramps for the tier-2 and tier-3 map views.
const ZONE_RAMP = ['#171F69','#009AC7','#15803d','#b45309','#7c3aed','#E31937','#0891b2','#be185d','#a16207','#4f46e5'];
const EWC_RAMP  = ['#171F69','#009AC7','#E31937','#15803d','#b45309','#7c3aed'];
// Junior age groups (age as of Dec 31) + adult bucket, young->old color ramp.
const AGE_GROUPS = [
  {k:'D',   label:'11 & under', color:'#8FC3EA'},
  {k:'C',   label:'12–13',      color:'#009AC7'},
  {k:'B',   label:'14–15',      color:'#2456B8'},
  {k:'A',   label:'16–18',      color:'#171F69'},
  {k:'19+', label:'adult',      color:'#94a3b8'},
];
// Competitor pool dimensions. Cell key = age + gender + discipline, e.g. "AB1".
const AGES  = [{k:'A',label:'Group A'},{k:'B',label:'Group B'},{k:'C',label:'Group C'},{k:'D',label:'Group D'}];
const GENS  = [{k:'B',label:'Boys'},{k:'G',label:'Girls'}];
const DISCS = [{k:'1',label:'1 meter'},{k:'3',label:'3 meter'},{k:'P',label:'Platform'}];
const CELLS = [];
AGES.forEach(a=>GENS.forEach(g=>DISCS.forEach(d=>CELLS.push(a.k+g.k+d.k))));
const cellLabel = c => `${AGES.find(a=>a.k===c[0]).label} ${GENS.find(g=>g.k===c[1]).label} ${DISCS.find(d=>d.k===c[2]).label}`;

const POOLS = [
  {k:'2026|Zones',     label:'2026 Zone entrants'},
  {k:'2026|Regionals', label:'2026 Regional entrants'},
  {k:'2025|Zones',     label:'2025 Zone entrants'},
  {k:'2025|Regionals', label:'2025 Regional entrants'},
  {k:'members',        label:'Registered athletes'},
];

const S = {
  geo: null,            // boundary-data.json
  advData: null,        // advance-data.json
  regions: [],          // [{name, color}]  = tier 0 groups (the painted areas)
  assign: {},           // fips -> region index
  active: 0,            // active region index (-1 = eraser)
  tool: 'county',       // county | state | pan
  year: 'y25',          // y25 (complete) | y26 (YTD)
  zoom: {k:1, x:0, y:0},
  painting: false,
  detailRegion: null,   // group index (in current tier view) for zip drill-down
  tiers: null,          // {zones:[{name}], zoneOf:[zi per region], ewc:[{name}], ewcOf:[ei per zone]}
  tierView: 0,          // 0 = painted areas, 1 = second tier, 2 = third tier
  tierCount: 3,         // how many levels exist above nothing: 1, 2 or 3
  tierNames: ['Regions','Zones','E / W / C'],
  finalName: 'Junior Nationals',
  legendMode: 'members',// members | age | comp
  panelMode: 'tally',   // tally | advance
  adv: null,            // {pool, steps:[{a:{},d:{}}], focus:'all'}
  age: null,            // fips -> {y25:[D,C,B,A,19+], y26:[...]}
  scenarioId: null,
  scenarioName: '',
  dirty: false,
  booted: false,
  totals: {y25: 5881, y26: 4755},
};

const fmt = n => Number(n||0).toLocaleString('en-US');
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function defaultRegions(n){
  return Array.from({length:n}, (_,i)=>({name:'Region '+(i+1), color:PALETTE[i%PALETTE.length]}));
}

function defaultAdv(){
  return {pool:'2026|Zones', focus:'all', steps:[{a:{},d:{}},{a:{},d:{}},{a:{},d:{}}]};
}

function defaultTiers(nRegions){
  const nZones = Math.max(1, Math.ceil(nRegions/2));
  const zones = Array.from({length:nZones}, (_,i)=>({name:'Zone '+String.fromCharCode(65+i)}));
  const zoneOf = Array.from({length:nRegions}, (_,i)=>Math.min(Math.floor(i/2), nZones-1));
  const nE = Math.max(1, Math.ceil(nZones/2));
  const ewc = nE===3 ? [{name:'East'},{name:'Central'},{name:'West'}] : Array.from({length:nE}, (_,i)=>({name:'Group '+(i+1)}));
  const ewcOf = Array.from({length:nZones}, (_,i)=>Math.min(Math.floor(i/2), nE-1));
  return {zones, zoneOf, ewc, ewcOf};
}

function syncTiers(){
  if (!S.tiers) S.tiers = defaultTiers(S.regions.length);
  const T = S.tiers;
  while (T.zoneOf.length < S.regions.length) T.zoneOf.push(Math.min(Math.floor(T.zoneOf.length/2), T.zones.length-1));
  T.zoneOf.length = S.regions.length;
  T.zoneOf = T.zoneOf.map(z => Math.min(z, T.zones.length-1));
  while (T.ewcOf.length < T.zones.length) T.ewcOf.push(Math.min(Math.floor(T.ewcOf.length/2), T.ewc.length-1));
  T.ewcOf.length = T.zones.length;
  T.ewcOf = T.ewcOf.map(e => Math.min(e, T.ewc.length-1));
  if (!S.adv) S.adv = defaultAdv();
  while (S.adv.steps.length < 3) S.adv.steps.push({a:{},d:{}});
  if (S.tierView >= S.tierCount) S.tierView = S.tierCount - 1;
}

// Groups at a given level (0 = painted areas) + mapping regionIndex -> groupIndex.
function tierGroupsAt(level){
  syncTiers();
  if (level===0) return {groups:S.regions.map(r=>({name:r.name, colors:[r.color]})), of:S.regions.map((_,i)=>i)};
  if (level===1){
    return {groups:S.tiers.zones.map((z,zi)=>({name:z.name, colors:S.regions.filter((_,ri)=>S.tiers.zoneOf[ri]===zi).map(r=>r.color)})),
            of:S.regions.map((_,ri)=>S.tiers.zoneOf[ri])};
  }
  const ewcOfRegion = S.regions.map((_,ri)=>S.tiers.ewcOf[S.tiers.zoneOf[ri]]);
  return {groups:S.tiers.ewc.map((e,ei)=>({name:e.name, colors:S.regions.filter((_,ri)=>ewcOfRegion[ri]===ei).map(r=>r.color)})),
          of:ewcOfRegion};
}
function tierGroups(){ return tierGroupsAt(S.tierView); }
function tierName(i){ return S.tierNames[i] || ('Tier '+(i+1)); }

// Color for a group index in the CURRENT tier view.
function groupColor(gi){
  if (gi==null || gi<0) return UNASSIGNED_BASE;
  if (S.tierView===0) return (S.regions[gi] && S.regions[gi].color) || UNASSIGNED_BASE;
  const ramp = S.tierView===1 ? ZONE_RAMP : EWC_RAMP;
  return ramp[gi % ramp.length];
}

function heatTint(m, maxM){
  if (!m) return UNASSIGNED_BASE;
  const t = Math.pow(Math.min(1, m/maxM), 0.45);
  const mix=(a,b)=>Math.round(a+(b-a)*t*0.55); // cap at 55% toward navy so it reads as "unassigned but populated"
  return `rgb(${mix(238,23)},${mix(241,31)},${mix(246,105)})`;
}

/* ---------- tallies ---------- */
function computeTallies(){
  const y = S.year;
  const TG = tierGroups();
  const rows = TG.groups.map(()=>({m:0,a:0,c:0,cl:new Set(),zips:0,counties:0,countiesAssigned:0,ag:[0,0,0,0,0]}));
  const un = {m:0,a:0,c:0,cl:new Set(),zips:0,counties:0,ag:[0,0,0,0,0]};
  for (const [fips, st] of Object.entries(S.geo.stats)){
    const v = st[y]; if (!v) continue;
    const ri = S.assign[fips];
    const gi = (ri==null || ri<0 || ri>=S.regions.length) ? -1 : TG.of[ri];
    const tgt = gi<0 ? un : rows[gi];
    tgt.m += v.m; tgt.a += v.a; tgt.c += v.c;
    v.cl.forEach(i=>tgt.cl.add(i));
    tgt.zips += Object.keys(st.z).filter(z => st.z[z][y==='y25'?0:1] > 0).length;
    if (v.m>0) tgt.counties++;
    const ag = S.age && S.age[fips] ? S.age[fips][y] : null;
    if (ag) for (let j=0;j<5;j++) tgt.ag[j] += (ag[j]||0);
  }
  Object.values(S.assign).forEach(ri => {
    if (ri>=0 && ri<S.regions.length) rows[TG.of[ri]].countiesAssigned++;
  });
  return {rows, un, TG};
}

/* ---------- competitor pools ---------- */
// Entrants per group at a level, broken out by cell key (age+gender+discipline).
function poolCells(level){
  const TG = tierGroupsAt(level);
  const out = TG.groups.map(()=>({}));
  const un = {};
  const P = S.advData && S.advData.pools ? S.advData.pools[S.adv.pool] : null;
  if (!P) return {rows:out, un};
  for (const [fips, cells] of Object.entries(P)){
    const ri = S.assign[fips];
    const tgt = (ri==null || ri<0 || ri>=S.regions.length) ? un : out[TG.of[ri]];
    for (const k in cells) tgt[k] = (tgt[k]||0) + cells[k];
  }
  return {rows:out, un};
}
// Registered athletes per group at a level, by junior age group (A/B/C/D only).
function poolMembers(level){
  const TG = tierGroupsAt(level);
  const idx = {D:0, C:1, B:2, A:3};
  const out = TG.groups.map(()=>({}));
  const un = {};
  if (!S.age) return {rows:out, un};
  for (const [fips, rec] of Object.entries(S.age)){
    const ag = rec[S.year]; if (!ag) continue;
    const ri = S.assign[fips];
    const tgt = (ri==null || ri<0 || ri>=S.regions.length) ? un : out[TG.of[ri]];
    for (const a in idx) tgt[a] = (tgt[a]||0) + (ag[idx[a]]||0);
  }
  return {rows:out, un};
}
const poolIsMembers = () => S.adv.pool === 'members';
// Total pool for a group, honoring the current focus filter.
function poolTotal(cells){
  const f = S.adv.focus;
  if (poolIsMembers()){
    if (f==='all') return AGES.reduce((s,a)=>s+(cells[a.k]||0),0);
    return cells[f[0]] || 0;               // members pool only resolves to age group
  }
  if (f==='all') return CELLS.reduce((s,c)=>s+(cells[c]||0),0);
  return cells[f] || 0;
}
// How many advance out of ONE group at a step, honoring the focus filter.
function advPerGroup(step, kind){
  const st = S.adv.steps[step] || {a:{},d:{}};
  const g = st[kind] || {};
  const f = S.adv.focus;
  if (f==='all') return CELLS.reduce((s,c)=>s+(+g[c]||0),0);
  if (poolIsMembers() && f.length===1) return CELLS.filter(c=>c[0]===f).reduce((s,c)=>s+(+g[c]||0),0);
  return +g[f] || 0;
}
// Field size arriving at the final destination, per cell.
function finalField(){
  const k = S.tierCount, res = {};
  CELLS.forEach(c=>res[c]=0);
  for (let i=0;i<k;i++){
    const n = tierGroupsAt(i).groups.length;
    const st = S.adv.steps[i] || {a:{},d:{}};
    CELLS.forEach(c=>{
      res[c] += n * (+((i===k-1 ? st.a : st.d)[c]) || 0);
    });
  }
  return res;
}

function regionZips(gi){
  const y = S.year;
  const TG = tierGroups();
  const out = [];
  for (const [fips, st] of Object.entries(S.geo.stats)){
    const ri = S.assign[fips];
    if (ri==null || ri<0 || ri>=S.regions.length || TG.of[ri] !== gi) continue;
    const county = S.geo.counties.find(c=>c.f===fips);
    for (const [zip, mm] of Object.entries(st.z)){
      const m = mm[y==='y25'?0:1];
      if (m>0) out.push({zip, m, county: county?county.n:'', st: county?county.st:''});
    }
  }
  out.sort((a,b)=>b.m-a.m);
  return out;
}

/* ---------- map rendering ---------- */
function fillFor(fips, maxM){
  const ri = S.assign[fips];
  if (ri!=null && ri>=0 && ri<S.regions.length){
    const of = S._of || (S._of = tierGroups().of);
    return groupColor(of[ri]);
  }
  const st = S.geo.stats[fips];
  return heatTint(st ? st[S.year].m : 0, maxM);
}

function paintCountyEl(fips){
  const el = document.querySelector(`path.bcty[data-f="${fips}"]`);
  if (el) el.setAttribute('fill', fillFor(fips, S._maxM));
}

function renderMapOnce(){
  const geo = S.geo;
  S._maxM = Math.max(1, ...Object.values(geo.stats).map(s=>s[S.year].m));
  S._of = tierGroups().of;
  const paths = geo.counties.map(c=>
    `<path class="bcty" data-f="${c.f}" d="${c.d}" fill="${fillFor(c.f, S._maxM)}"/>`).join('');
  document.getElementById('bsSvgG').innerHTML = paths +
    `<path d="${geo.stateMesh}" fill="none" stroke="#ffffff" stroke-width="1.4" pointer-events="none"/>` +
    `<path d="${geo.nationMesh}" fill="none" stroke="#94a3b8" stroke-width="1" pointer-events="none"/>`;
  applyZoom();
}

function repaintAll(){
  S._maxM = Math.max(1, ...Object.values(S.geo.stats).map(s=>s[S.year].m));
  S._of = tierGroups().of;
  document.querySelectorAll('path.bcty').forEach(el=>{
    el.setAttribute('fill', fillFor(el.dataset.f, S._maxM));
  });
}

function applyZoom(){
  const g = document.getElementById('bsSvgG');
  if (g) g.setAttribute('transform', `translate(${S.zoom.x},${S.zoom.y}) scale(${S.zoom.k})`);
}

/* ---------- panel ---------- */
function renderPanel(){
  const y = S.year;

  const tierBtns = Array.from({length:S.tierCount}, (_,i)=>
    `<button data-tierv="${i}" class="${S.tierView===i?'on':''}">${esc(tierName(i))}</button>`).join('');

  const chips = S.regions.map((r,i)=>`
    <button class="bs-chip ${S.active===i?'on':''}" data-ri="${i}" style="--c:${r.color}">
      <span class="dot"></span><span class="chip-lbl">${esc(r.name)}</span></button>`).join('') +
    `<button class="bs-chip eraser ${S.active===-1?'on':''}" data-ri="-1"><span class="dot" style="background:#fff;border:1.5px solid #94a3b8"></span>Eraser</button>`;

  document.getElementById('bsPanel').innerHTML = `
    <div class="bs-row">
      <div class="seg">
        <button id="bsToolCounty" class="${S.tool==='county'?'on':''}">Paint counties</button>
        <button id="bsToolState" class="${S.tool==='state'?'on':''}">Paint whole state</button>
        <button id="bsToolPan" class="${S.tool==='pan'?'on':''}">Pan</button>
      </div>
      <div class="seg">
        <button id="bsY25" class="${y==='y25'?'on':''}">2025</button>
        <button id="bsY26" class="${y==='y26'?'on':''}">2026 YTD</button>
      </div>
      <div class="seg">
        <button id="bsZoomIn">+</button><button id="bsZoomOut">&minus;</button><button id="bsZoomReset">Reset view</button>
      </div>
      <div class="seg" id="bsTierSeg">${tierBtns}</div>
      <div class="seg">
        <button id="bsLgMembers" class="${S.legendMode==='members'?'on':''}">Members</button>
        <button id="bsLgAge" class="${S.legendMode==='age'?'on':''}">Age groups</button>
        <button id="bsLgComp" class="${S.legendMode==='comp'?'on':''}">Competitors</button>
      </div>
    </div>
    <div class="bs-chips">${chips}
      <button class="bs-chip add" id="bsAddRegion">+ Add area</button>
      <button class="bs-chip add" id="bsRemRegion" ${S.regions.length<=1?'disabled':''}>&minus; Remove last</button>
    </div>
    <div class="seg bs-modeseg">
      <button id="bsModeTally" class="${S.panelMode==='tally'?'on':''}">Who lives here</button>
      <button id="bsModeAdv" class="${S.panelMode==='advance'?'on':''}">Who moves up</button>
    </div>
    <div id="bsBody"></div>
    ${renderNamesPanel()}
    <div class="bs-row" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
      <input class="search" id="bsName" placeholder="Scenario name&hellip;" value="${esc(S.scenarioName)}" style="min-width:180px">
      <button class="tab" id="bsSave">${S.dirty?'Save*':'Save'}</button>
      <select class="sel" id="bsLoad"><option value="">Load scenario&hellip;</option></select>
      <button class="tab" id="bsNew">New / Clear</button>
      <button class="tab" id="bsCsv">Export zips CSV</button>
      <button class="tab" id="bsCsvAdv">Export advancement CSV</button>
    </div>
    <div class="note" id="bsMsg"></div>`;

  if (S.panelMode==='advance') renderAdvShell();
  renderNumbers();
  wirePanel();
  loadScenarioList();
}

// Everything that changes as you paint. Never touches name inputs or the
// advancement grid, so typing focus is never stolen.
function renderNumbers(){
  const t = computeTallies();
  const y = S.year;
  const yLabel = y==='y25' ? '2025 (complete year)' : '2026 (YTD)';
  const assignedM = t.rows.reduce((s,r)=>s+r.m,0);
  const mappableTotal = assignedM + t.un.m;

  if (S.panelMode==='tally'){
    const body = document.getElementById('bsBody');
    if (body) body.innerHTML = renderTallyTable(t, mappableTotal, yLabel);
    wireTallyRows();
  } else {
    renderAdvResults();
  }
  renderLegend(t, mappableTotal, yLabel);
}

function renderTallyTable(t, mappableTotal, yLabel){
  const rowsHtml = t.rows.map((r,i)=>`
    <tr class="${S.detailRegion===i?'sel':''}" data-drill="${i}">
      <td><span class="sw" style="background:${groupColor(i)}"></span><b>${esc(t.TG.groups[i].name)}</b></td>
      <td class="num">${fmt(r.m)}</td><td class="num">${fmt(r.a)}</td><td class="num">${fmt(r.c)}</td>
      <td class="num">${fmt(r.cl.size)}</td><td class="num">${fmt(r.zips)}</td><td class="num">${fmt(r.countiesAssigned)}</td>
      <td class="num">${mappableTotal>0 ? (100*r.m/mappableTotal).toFixed(1)+'%' : '—'}</td>
    </tr>`).join('');
  const unRow = `<tr class="unrow"><td><span class="sw" style="background:${UNASSIGNED_BASE};border:1px solid #d8e0ec"></span>Unassigned</td>
      <td class="num">${fmt(t.un.m)}</td><td class="num">${fmt(t.un.a)}</td><td class="num">${fmt(t.un.c)}</td>
      <td class="num">${fmt(t.un.cl.size)}</td><td class="num">${fmt(t.un.zips)}</td><td class="num">—</td>
      <td class="num">${mappableTotal>0 ? (100*t.un.m/mappableTotal).toFixed(1)+'%' : '—'}</td></tr>`;

  let drill = '';
  if (S.detailRegion!=null && S.detailRegion>=0 && S.detailRegion<t.TG.groups.length){
    const zips = regionZips(S.detailRegion);
    const g = t.TG.groups[S.detailRegion];
    drill = `<div class="bs-drill">
      <div class="bs-drill-h"><span class="sw" style="background:${groupColor(S.detailRegion)}"></span><b>${esc(g.name)}</b> — ${fmt(zips.length)} zip codes pooled (${yLabel}) <button class="tab" id="bsDrillClose" style="padding:3px 10px;font-size:11px">close</button></div>
      <div class="bs-zips">${zips.map(z=>`<span class="bs-zip" title="${esc(z.county)} County, ${esc(z.st)}"><b>${z.zip}</b> ${z.m}</span>`).join('') || '<span class="note">No members in this area yet.</span>'}</div>
    </div>`;
  }
  const unmappable = S.totals[S.year] - mappableTotal;
  return `<table class="bs-table"><thead><tr>
      <th>Area</th><th class="num">Members</th><th class="num">Athletes</th><th class="num">Coaches</th>
      <th class="num">Clubs</th><th class="num">Zips</th><th class="num">Counties</th><th class="num">Share</th>
    </tr></thead><tbody>${rowsHtml}${unRow}</tbody></table>
    <div class="note" style="margin-top:6px">Tallies: ${yLabel}. Click a row to pool its zip codes. ${unmappable>0?`<b>${fmt(unmappable)}</b> members not mappable (foreign address or invalid zip) are excluded from the map.`:''}</div>
    ${drill}`;
}

/* ---------- names & tiers panel ---------- */
function renderNamesPanel(){
  const lvlRow = (i, val) => `<label class="bs-tier-row"><span class="bs-lvl">Level ${i+1}</span>
      <input class="bs-name-in bs-tiername" data-lvl="${i}" value="${esc(val)}" placeholder="Level ${i+1} name"></label>`;
  const zoneSelects = S.tierCount>1 ? `
    <div>
      <div class="bs-tier-h">${esc(tierName(0))} &rarr; ${esc(tierName(1))}
        <button class="tab bs-mini" id="bsAddZone">+ add</button>
        <button class="tab bs-mini" id="bsRemZone" ${S.tiers.zones.length<=1?'disabled':''}>&minus; remove</button></div>
      ${S.regions.map((r,ri)=>`<label class="bs-tier-row"><span class="sw" style="background:${r.color}"></span>
        <input class="bs-name-in bs-rname" data-ri="${ri}" value="${esc(r.name)}">
        <select class="sel bs-zsel" data-ri="${ri}">${S.tiers.zones.map((z,zi)=>`<option value="${zi}" ${S.tiers.zoneOf[ri]===zi?'selected':''}>${esc(z.name)}</option>`).join('')}</select></label>`).join('')}
    </div>` : '';
  const ewcSelects = S.tierCount>2 ? `
    <div>
      <div class="bs-tier-h">${esc(tierName(1))} &rarr; ${esc(tierName(2))}
        <button class="tab bs-mini" id="bsAddEwc">+ add</button>
        <button class="tab bs-mini" id="bsRemEwc" ${S.tiers.ewc.length<=1?'disabled':''}>&minus; remove</button></div>
      ${S.tiers.zones.map((z,zi)=>`<label class="bs-tier-row">
        <input class="bs-name-in bs-zname" data-zi="${zi}" value="${esc(z.name)}">
        <select class="sel bs-esel" data-zi="${zi}">${S.tiers.ewc.map((e,ei)=>`<option value="${ei}" ${S.tiers.ewcOf[zi]===ei?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label>`).join('')}
    </div>` : '';
  const topNames = S.tierCount>2 ? `
    <div>
      <div class="bs-tier-h">${esc(tierName(2))} names</div>
      ${S.tiers.ewc.map((e,ei)=>`<label class="bs-tier-row">
        <input class="bs-name-in bs-ename" data-ei="${ei}" value="${esc(e.name)}"></label>`).join('')}
    </div>` : (S.tierCount>1 ? `
    <div>
      <div class="bs-tier-h">${esc(tierName(1))} names</div>
      ${S.tiers.zones.map((z,zi)=>`<label class="bs-tier-row">
        <input class="bs-name-in bs-zname" data-zi="${zi}" value="${esc(z.name)}"></label>`).join('')}
    </div>` : `
    <div>
      <div class="bs-tier-h">${esc(tierName(0))} names</div>
      ${S.regions.map((r,ri)=>`<label class="bs-tier-row"><span class="sw" style="background:${r.color}"></span>
        <input class="bs-name-in bs-rname" data-ri="${ri}" value="${esc(r.name)}"></label>`).join('')}
    </div>`);

  return `<details class="bs-tiers" ${S.tierView>0?'open':''}>
    <summary>Names &amp; structure — rename anything, choose how many levels, set what rolls up into what</summary>
    <div class="bs-namebar">
      <span class="bs-lvl">How many levels</span>
      <div class="seg">${[1,2,3].map(n=>`<button data-tiercount="${n}" class="${S.tierCount===n?'on':''}">${n}</button>`).join('')}</div>
      <span class="bs-lvl" style="margin-left:10px">Top meet</span>
      <input class="bs-name-in" id="bsFinalName" value="${esc(S.finalName)}" placeholder="Junior Nationals" style="min-width:150px">
    </div>
    <div class="bs-namebar">${Array.from({length:S.tierCount},(_,i)=>lvlRow(i, tierName(i))).join('')}</div>
    <div class="bs-tier-grid">${zoneSelects}${ewcSelects}${topNames}</div>
  </details>`;
}

/* ---------- advancement ---------- */
function renderAdvShell(){
  const body = document.getElementById('bsBody');
  if (!body) return;
  const steps = Array.from({length:S.tierCount}, (_,i)=>{
    const to = i===S.tierCount-1 ? S.finalName : tierName(i+1);
    return `<button data-step="${i}" class="${(S.adv.step||0)===i?'on':''}">${esc(tierName(i))} &rarr; ${esc(to)}</button>`;
  }).join('');
  const poolOpts = POOLS.map(p=>`<option value="${p.k}" ${S.adv.pool===p.k?'selected':''}>${esc(p.label)}</option>`).join('');
  const focusOpts = `<option value="all" ${S.adv.focus==='all'?'selected':''}>All events &amp; age groups</option>` +
    (poolIsMembers()
      ? AGES.map(a=>`<option value="${a.k}" ${S.adv.focus===a.k?'selected':''}>${esc(a.label)}</option>`).join('')
      : CELLS.map(c=>`<option value="${c}" ${S.adv.focus===c?'selected':''}>${esc(cellLabel(c))}</option>`).join(''));

  body.innerHTML = `
    <div class="bs-row">
      <span class="bs-lvl">Compare against</span>
      <select class="sel" id="bsAdvPool">${poolOpts}</select>
      <span class="bs-lvl">Balance shown for</span>
      <select class="sel" id="bsAdvFocus">${focusOpts}</select>
    </div>
    <div class="seg bs-stepseg" id="bsAdvSteps">${steps}</div>
    <div id="bsAdvGrid"></div>
    <div id="bsAdvResults"></div>`;
  renderAdvGrid();
}

function renderAdvGrid(){
  const el = document.getElementById('bsAdvGrid');
  if (!el) return;
  const i = S.adv.step || 0;
  const last = i === S.tierCount-1;
  const st = S.adv.steps[i] || (S.adv.steps[i] = {a:{},d:{}});
  const nFrom = tierGroupsAt(i).groups.length;
  const toName = last ? S.finalName : tierName(i+1);

  const grid = kind => `<table class="bs-adv-grid"><thead><tr><th>Age group</th><th></th>${DISCS.map(d=>`<th class="num">${d.label}</th>`).join('')}</tr></thead><tbody>` +
    AGES.map(a=>GENS.map((g,gi)=>`<tr>
        ${gi===0?`<td rowspan="2" class="ag-cell"><b>${a.label}</b></td>`:''}
        <td class="gn-cell">${g.label}</td>
        ${DISCS.map(d=>{
          const c = a.k+g.k+d.k;
          return `<td class="num"><input class="bs-adv-in" type="number" min="0" step="1" data-kind="${kind}" data-cell="${c}" value="${st[kind][c]!=null?st[kind][c]:''}" placeholder="0"></td>`;
        }).join('')}
      </tr>`).join('')).join('') + '</tbody></table>';

  el.innerHTML = `
    <div class="bs-adv-head">
      <b>How many advance from EACH ${esc(tierName(i))} &rarr; ${esc(toName)}</b>
      <span class="bs-lvl">${nFrom} ${nFrom===1?'group':'groups'} at this level</span>
      <span class="bs-fill">Fill every box: <input class="bs-adv-in" id="bsFillA" type="number" min="0" step="1" placeholder="—"></span>
      <button class="tab bs-mini" id="bsCopyStep">Copy to all levels</button>
      <button class="tab bs-mini" id="bsClearStep">Clear</button>
    </div>
    ${grid('a')}
    ${last ? '' : `
      <details class="bs-direct">
        <summary>Also send some straight to ${esc(S.finalName)}, skipping ${esc(tierName(i+1))} (this is how 2026 works — Zone top 3 go direct)</summary>
        <div class="bs-adv-head"><span class="bs-fill">Fill every box: <input class="bs-adv-in" id="bsFillD" type="number" min="0" step="1" placeholder="—"></span></div>
        ${grid('d')}
      </details>`}`;
  wireAdvGrid();
}

function renderAdvResults(){
  const el = document.getElementById('bsAdvResults');
  if (!el) return;
  const i = S.adv.step || 0;
  const last = i === S.tierCount-1;
  const TG = tierGroupsAt(i);
  const pooled = poolIsMembers() ? poolMembers(i) : poolCells(i);
  const perGroupAdv = advPerGroup(i, 'a');
  const perGroupDir = last ? 0 : advPerGroup(i, 'd');
  const nFrom = TG.groups.length;

  const totals = pooled.rows.map(c=>poolTotal(c));
  const grand = totals.reduce((s,x)=>s+x,0);
  const equal = nFrom>0 ? 100/nFrom : 0;

  const rows = TG.groups.map((g,gi)=>{
    const pool = totals[gi];
    const share = grand>0 ? 100*pool/grand : 0;
    const diff = share - equal;
    const rate = pool>0 ? 100*(perGroupAdv+perGroupDir)/pool : null;
    const bar = grand>0 ? Math.max(2, Math.round(100*pool/Math.max(1,Math.max(...totals)))) : 0;
    const diffCls = Math.abs(diff) < equal*0.15 ? 'ok' : (diff>0 ? 'over' : 'under');
    return `<tr>
      <td><span class="sw" style="background:${tierColorAt(i,gi)}"></span><b>${esc(g.name)}</b></td>
      <td class="num">${fmt(pool)}</td>
      <td><span class="bs-bar"><i style="width:${bar}%;background:${tierColorAt(i,gi)}"></i></span></td>
      <td class="num">${share.toFixed(1)}%</td>
      <td class="num ${diffCls}">${diff>=0?'+':''}${diff.toFixed(1)} pp</td>
      <td class="num">${fmt(perGroupAdv+perGroupDir)}</td>
      <td class="num">${rate==null?'—':rate.toFixed(1)+'%'}</td>
    </tr>`;
  }).join('');

  const spread = totals.length>1 && grand>0
    ? (100*Math.max(...totals)/grand - 100*Math.min(...totals)/grand) : 0;
  const spreadCls = spread <= equal*0.30 ? 'ok' : (spread <= equal*0.60 ? 'over' : 'under');

  // Pipeline summary across every level.
  const ff = finalField();
  const ffTotal = CELLS.reduce((s,c)=>s+ff[c],0);
  const pipe = Array.from({length:S.tierCount},(_,j)=>{
    const n = tierGroupsAt(j).groups.length;
    const a = CELLS.reduce((s,c)=>s+(+(S.adv.steps[j].a[c])||0),0);
    const d = CELLS.reduce((s,c)=>s+(+(S.adv.steps[j].d[c])||0),0);
    const to = j===S.tierCount-1 ? S.finalName : tierName(j+1);
    return `<div class="bs-pipe-card">
      <span class="bs-pipe-nm">${esc(tierName(j))} &rarr; ${esc(to)}</span>
      <span class="bs-pipe-big">${fmt(n*a)}</span>
      <span class="bs-lg-sub">${n} ${n===1?'group':'groups'} × ${fmt(a)} spots</span>
      ${(j<S.tierCount-1 && d>0) ? `<span class="bs-pipe-dir">+ ${fmt(n*d)} straight to ${esc(S.finalName)}</span>` : ''}
    </div>`;
  }).join('');

  const byEvent = DISCS.map(d=>{
    const n = CELLS.filter(c=>c[2]===d.k).reduce((s,c)=>s+ff[c],0);
    return `<span class="bs-ev"><b>${fmt(n)}</b> ${d.label}</span>`;
  }).join('');
  const byAge = AGES.map(a=>{
    const n = CELLS.filter(c=>c[0]===a.k).reduce((s,c)=>s+ff[c],0);
    return `<span class="bs-ev"><b>${fmt(n)}</b> ${a.label}</span>`;
  }).join('');

  const poolLabel = (POOLS.find(p=>p.k===S.adv.pool)||{}).label || '';
  const focusLabel = S.adv.focus==='all' ? 'all events and age groups'
    : (poolIsMembers() ? (AGES.find(a=>a.k===S.adv.focus)||{label:''}).label : cellLabel(S.adv.focus));
  const cov = S.advData && S.advData.totals && S.advData.totals[S.adv.pool];
  const covNote = (!poolIsMembers() && cov)
    ? `${fmt(cov.mapped)} of ${fmt(cov.total)} entries placed on the map (${(100*cov.mapped/cov.total).toFixed(1)}% — the rest are entrants whose name has no matching membership address).`
    : (poolIsMembers() ? 'Registered athletes have no gender or event recorded in the Webpoint export, so balance here is by age group only.' : '');

  el.innerHTML = `
    <div class="bs-pipe">${pipe}
      <div class="bs-pipe-card final">
        <span class="bs-pipe-nm">${esc(S.finalName)} field</span>
        <span class="bs-pipe-big">${fmt(ffTotal)}</span>
        <span class="bs-lg-sub">total entries across all events</span>
      </div>
    </div>
    <div class="bs-evrow"><span class="bs-evh">By event</span>${byEvent}</div>
    <div class="bs-evrow"><span class="bs-evh">By age group</span>${byAge}</div>

    <div class="bs-balhead">
      <b>Is ${esc(tierName(i))} balanced?</b>
      <span class="bs-lvl">${esc(poolLabel)} · ${esc(focusLabel)}</span>
      <span class="bs-spread ${spreadCls}">${spread.toFixed(1)} pp spread between biggest and smallest</span>
    </div>
    <table class="bs-table"><thead><tr>
      <th>${esc(tierName(i))}</th><th class="num">Pool</th><th></th><th class="num">Share</th>
      <th class="num">vs equal (${equal.toFixed(1)}%)</th><th class="num">Move up</th><th class="num">Rate</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="note" style="margin-top:6px">Pool = ${esc(poolLabel)} living in each ${esc(tierName(i))} under the map as painted. "Move up" is what you typed above, applied to every group equally. ${covNote}</div>`;
}

function tierColorAt(level, gi){
  if (level===0) return (S.regions[gi] && S.regions[gi].color) || UNASSIGNED_BASE;
  const ramp = level===1 ? ZONE_RAMP : EWC_RAMP;
  return ramp[gi % ramp.length];
}

/* ---------- legend ---------- */
function renderLegend(t, mappableTotal, yLabel){
  const lgEl = document.getElementById('bsLegend');
  if (!lgEl) return;
  const tierLabel = tierName(S.tierView);
  const share = m => mappableTotal>0 ? (100*m/mappableTotal).toFixed(1)+'%' : '—';

  if (S.legendMode==='age'){
    const key = `<div class="bs-age-key">${AGE_GROUPS.map(g=>
      `<span><i style="background:${g.color}"></i><b>${g.k}</b> <span class="k-lbl">${g.label}</span></span>`).join('')}</div>`;
    const cards = t.rows.map((r,i)=>{
      const ag = r.ag, ath = ag.reduce((s,x)=>s+x,0);
      const seg = ag.map((v,j)=> v>0
        ? `<span style="flex:${v};background:${AGE_GROUPS[j].color}" title="${AGE_GROUPS[j].k} (${AGE_GROUPS[j].label}): ${fmt(v)}"></span>` : '').join('');
      const nums = AGE_GROUPS.map((g,j)=>
        `<span class="ag-n"><b style="color:${g.color==='#8FC3EA'?'#0b6ea0':g.color}">${g.k}</b>${fmt(ag[j])}</span>`).join('');
      return `<button class="bs-lg-card ${S.detailRegion===i?'sel':''}" data-drill2="${i}" style="--c:${groupColor(i)}">
        <span class="bs-lg-nm"><span class="bs-lg-sw"></span>${esc(t.TG.groups[i].name)}</span>
        <span class="bs-lg-big">${fmt(ath)}<span class="bs-lg-athlbl"> athletes</span></span>
        <span class="ag-bar">${seg || '<span style="flex:1;background:#eef1f6"></span>'}</span>
        <span class="ag-nums">${nums}</span>
      </button>`;
    }).join('');
    lgEl.innerHTML = `<div class="bs-lg-head"><b>${esc(tierLabel)}</b> &mdash; athletes by age group · ${yLabel} · <span class="bs-lg-hint">AQUA age (as of Dec 31) · tap a card to pool its zips</span></div>${key}<div class="bs-lg-cards age">${cards}</div>`;
    return;
  }

  if (S.legendMode==='comp'){
    const pooled = poolCells(S.tierView);
    const poolLabel = (POOLS.find(p=>p.k===S.adv.pool)||{}).label || '';
    const key = `<div class="bs-age-key">${DISCS.map((d,j)=>
      `<span><i style="background:${['#009AC7','#171F69','#E31937'][j]}"></i><b>${d.label}</b></span>`).join('')}
      <span style="margin-left:6px">·</span><span>bars split boys / girls underneath</span></div>`;
    const maxTot = Math.max(1, ...pooled.rows.map(c=>CELLS.reduce((s,k)=>s+(c[k]||0),0)));
    const cards = t.rows.map((r,i)=>{
      const c = pooled.rows[i] || {};
      const tot = CELLS.reduce((s,k)=>s+(c[k]||0),0);
      const ev = DISCS.map((d,j)=>{
        const n = CELLS.filter(k=>k[2]===d.k).reduce((s,k)=>s+(c[k]||0),0);
        return n>0 ? `<span style="flex:${n};background:${['#009AC7','#171F69','#E31937'][j]}" title="${d.label}: ${fmt(n)}"></span>` : '';
      }).join('');
      const boys = CELLS.filter(k=>k[1]==='B').reduce((s,k)=>s+(c[k]||0),0);
      const girls = tot - boys;
      const nums = DISCS.map((d,j)=>`<span class="ag-n"><b style="color:${['#0b6ea0','#171F69','#E31937'][j]}">${d.k==='P'?'PL':d.k+'M'}</b>${fmt(CELLS.filter(k=>k[2]===d.k).reduce((s,k)=>s+(c[k]||0),0))}</span>`).join('');
      return `<button class="bs-lg-card ${S.detailRegion===i?'sel':''}" data-drill2="${i}" style="--c:${groupColor(i)}">
        <span class="bs-lg-nm"><span class="bs-lg-sw"></span>${esc(t.TG.groups[i].name)}</span>
        <span class="bs-lg-big">${fmt(tot)}<span class="bs-lg-athlbl"> entries</span></span>
        <span class="ag-bar">${ev || '<span style="flex:1;background:#eef1f6"></span>'}</span>
        <span class="ag-nums">${nums}<span class="ag-n"><b style="color:#64748b">B/G</b>${fmt(boys)}/${fmt(girls)}</span></span>
      </button>`;
    }).join('');
    lgEl.innerHTML = `<div class="bs-lg-head"><b>${esc(tierLabel)}</b> &mdash; ${esc(poolLabel)} by event · <span class="bs-lg-hint">one entry per diver per event · change the pool under "Who moves up"</span></div>${key}<div class="bs-lg-cards age">${cards}</div>`;
    return;
  }

  const cards = t.rows.map((r,i)=>`
    <button class="bs-lg-card ${S.detailRegion===i?'sel':''}" data-drill2="${i}" style="--c:${groupColor(i)}">
      <span class="bs-lg-nm"><span class="bs-lg-sw"></span>${esc(t.TG.groups[i].name)}</span>
      <span class="bs-lg-big">${fmt(r.m)}</span>
      <span class="bs-lg-sub">${share(r.m)} share · ${fmt(r.a)} ath · ${fmt(r.c)} coach · ${fmt(r.cl.size)} clubs</span>
    </button>`).join('');
  const un = t.un.m>0 ? `<div class="bs-lg-card un">
      <span class="bs-lg-nm"><span class="bs-lg-sw" style="background:${UNASSIGNED_BASE};border:1px solid #d8e0ec"></span>Unassigned</span>
      <span class="bs-lg-big">${fmt(t.un.m)}</span>
      <span class="bs-lg-sub">${share(t.un.m)} share</span></div>` : '';
  const hint = S.detailRegion!=null ? 'tap the highlighted card to close the zip drill-down'
                                    : 'tap a card to pool its zip codes';
  lgEl.innerHTML = `<div class="bs-lg-head"><b>${esc(tierLabel)}</b> &mdash; members by area · ${yLabel} · <span class="bs-lg-hint">${hint}</span></div>
    <div class="bs-lg-cards">${cards}${un}</div>`;
}

/* ---------- interactions ---------- */
function assignCounty(fips){
  const cur = S.assign[fips];
  if (S.active === -1){ if (cur!=null){ delete S.assign[fips]; paintCountyEl(fips); S.dirty=true; } return; }
  if (cur !== S.active){ S.assign[fips] = S.active; paintCountyEl(fips); S.dirty = true; }
}
function assignState(abbr){
  S.geo.counties.forEach(c=>{ if (c.st===abbr){
    if (S.active===-1) delete S.assign[c.f]; else S.assign[c.f] = S.active;
  }});
  S.dirty = true;
  repaintAll();
}

let tallyTimer = null;
function tallySoon(){ clearTimeout(tallyTimer); tallyTimer = setTimeout(renderNumbers, 180); }

function wireMap(){
  const svg = document.getElementById('bsSvg');
  const tip = document.getElementById('bsTip');
  let panStart = null;

  svg.addEventListener('pointerdown', e=>{
    if (S.tool==='pan'){ panStart = {x:e.clientX, y:e.clientY, zx:S.zoom.x, zy:S.zoom.y}; svg.setPointerCapture(e.pointerId); return; }
    const t = e.target.closest('path.bcty'); if (!t) return;
    S.painting = true;
    if (S.tool==='state') assignState(t.dataset.f && S.geo.counties.find(c=>c.f===t.dataset.f).st);
    else assignCounty(t.dataset.f);
    tallySoon();
  });
  svg.addEventListener('pointermove', e=>{
    if (panStart){
      S.zoom.x = panStart.zx + (e.clientX - panStart.x) * (975 / svg.clientWidth);
      S.zoom.y = panStart.zy + (e.clientY - panStart.y) * (975 / svg.clientWidth);
      applyZoom(); return;
    }
    const t = e.target.closest('path.bcty');
    if (t){
      if (S.painting && S.tool==='county'){ assignCounty(t.dataset.f); tallySoon(); }
      const c = S.geo.counties.find(x=>x.f===t.dataset.f);
      const st = S.geo.stats[t.dataset.f];
      const v = st ? st[S.year] : null;
      const ri = S.assign[t.dataset.f];
      let grpHtml = '<br><i>Unassigned</i>';
      if (ri!=null && S.regions[ri]){
        const TG = tierGroups(); const gi = TG.of[ri];
        const gc = groupColor(gi);
        const gname = (TG.groups[gi] && TG.groups[gi].name) || S.regions[ri].name;
        grpHtml = `<br><span style="color:${gc==='#171F69'?'#8FC3EA':gc}">&#9632;</span> ${esc(gname)}` +
          (S.tierView>0 ? ` <span style="opacity:.65">· ${esc(S.regions[ri].name)}</span>` : '');
      }
      tip.style.display='block';
      tip.style.left = (e.clientX+14)+'px'; tip.style.top = (e.clientY+14)+'px';
      tip.innerHTML = `<b>${esc(c.n)} County, ${esc(c.st)}</b><br>` +
        (v ? `${fmt(v.m)} members · ${fmt(v.a)} athletes · ${fmt(v.c)} coaches · ${fmt(v.cl.length)} clubs · ${Object.keys(st.z).length} zips`
           : 'No members') + grpHtml;
    } else tip.style.display='none';
  });
  const stop = ()=>{ S.painting=false; panStart=null; };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointerleave', e=>{ stop(); tip.style.display='none'; });
  svg.addEventListener('wheel', e=>{
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX-rect.left) * (975/rect.width), my = (e.clientY-rect.top) * (975/rect.width);
    const f = e.deltaY < 0 ? 1.18 : 1/1.18;
    const k2 = Math.min(14, Math.max(1, S.zoom.k * f));
    const real = k2 / S.zoom.k;
    S.zoom.x = mx - (mx - S.zoom.x) * real;
    S.zoom.y = my - (my - S.zoom.y) * real;
    S.zoom.k = k2;
    if (S.zoom.k===1){ S.zoom.x=0; S.zoom.y=0; }
    applyZoom();
  }, {passive:false});
}

function wireTallyRows(){
  document.querySelectorAll('#bsBody tr[data-drill]').forEach(tr=>tr.addEventListener('click',()=>{
    const i = +tr.dataset.drill;
    S.detailRegion = (S.detailRegion===i) ? null : i;
    renderNumbers();
  }));
  const dc = document.getElementById('bsDrillClose');
  if (dc) dc.addEventListener('click', e=>{ e.stopPropagation(); S.detailRegion=null; renderNumbers(); });
  document.querySelectorAll('#bsLegend [data-drill2]').forEach(el=>el.addEventListener('click',()=>{
    const i=+el.dataset.drill2; S.detailRegion=(S.detailRegion===i)?null:i; renderNumbers();
  }));
}

function wireAdvGrid(){
  const commit = (kind, cell, val)=>{
    const st = S.adv.steps[S.adv.step||0];
    if (val==='' || val==null) delete st[kind][cell]; else st[kind][cell] = Math.max(0, Math.round(+val)||0);
    S.dirty = true;
    renderAdvResults();
  };
  document.querySelectorAll('#bsAdvGrid .bs-adv-in[data-cell]').forEach(inp=>{
    inp.addEventListener('input', ()=>commit(inp.dataset.kind, inp.dataset.cell, inp.value));
  });
  const fill = (kind, val)=>{
    const st = S.adv.steps[S.adv.step||0];
    CELLS.forEach(c=>{ if (val==='') delete st[kind][c]; else st[kind][c] = Math.max(0, Math.round(+val)||0); });
    S.dirty = true; renderAdvGrid(); renderAdvResults();
  };
  const fa = document.getElementById('bsFillA');
  if (fa) fa.addEventListener('change', ()=>fill('a', fa.value));
  const fd = document.getElementById('bsFillD');
  if (fd) fd.addEventListener('change', ()=>fill('d', fd.value));
  const cs = document.getElementById('bsCopyStep');
  if (cs) cs.addEventListener('click', ()=>{
    const src = S.adv.steps[S.adv.step||0];
    S.adv.steps = S.adv.steps.map(()=>({a:Object.assign({},src.a), d:Object.assign({},src.d)}));
    S.dirty=true; renderAdvResults(); msg('Copied these numbers to every level.');
  });
  const cl = document.getElementById('bsClearStep');
  if (cl) cl.addEventListener('click', ()=>{
    S.adv.steps[S.adv.step||0] = {a:{},d:{}};
    S.dirty=true; renderAdvGrid(); renderAdvResults();
  });
}

function wirePanel(){
  const P = document.getElementById('bsPanel');
  const bind = (id,f)=>{ const b=document.getElementById(id); if(b) b.addEventListener('click',f); };
  bind('bsToolCounty', ()=>{S.tool='county'; renderPanel();});
  bind('bsToolState', ()=>{S.tool='state'; renderPanel();});
  bind('bsToolPan', ()=>{S.tool='pan'; renderPanel();});
  bind('bsY25', ()=>{S.year='y25'; repaintAll(); renderPanel();});
  bind('bsY26', ()=>{S.year='y26'; repaintAll(); renderPanel();});
  bind('bsZoomIn', ()=>{S.zoom.k=Math.min(14,S.zoom.k*1.4); applyZoom();});
  bind('bsZoomOut', ()=>{S.zoom.k=Math.max(1,S.zoom.k/1.4); if(S.zoom.k===1){S.zoom.x=0;S.zoom.y=0;} applyZoom();});
  bind('bsZoomReset', ()=>{S.zoom={k:1,x:0,y:0}; applyZoom();});
  bind('bsLgMembers', ()=>{S.legendMode='members'; renderNumbers();});
  bind('bsLgAge', ()=>{S.legendMode='age'; renderNumbers();});
  bind('bsLgComp', ()=>{S.legendMode='comp'; renderNumbers();});
  bind('bsModeTally', ()=>{S.panelMode='tally'; renderPanel();});
  bind('bsModeAdv', ()=>{S.panelMode='advance'; renderPanel();});

  P.querySelectorAll('#bsTierSeg [data-tierv]').forEach(b=>b.addEventListener('click',()=>{
    S.tierView = +b.dataset.tierv; S.detailRegion=null; repaintAll(); renderPanel();
  }));
  P.querySelectorAll('[data-tiercount]').forEach(b=>b.addEventListener('click',()=>{
    S.tierCount = +b.dataset.tiercount;
    if (S.tierView >= S.tierCount) S.tierView = S.tierCount-1;
    if ((S.adv.step||0) >= S.tierCount) S.adv.step = S.tierCount-1;
    S.dirty=true; repaintAll(); renderPanel();
  }));
  P.querySelectorAll('#bsAdvSteps [data-step]').forEach(b=>b.addEventListener('click',()=>{
    S.adv.step = +b.dataset.step;
    P.querySelectorAll('#bsAdvSteps [data-step]').forEach(x=>x.classList.toggle('on', +x.dataset.step===S.adv.step));
    renderAdvGrid(); renderAdvResults();
  }));
  const poolSel = document.getElementById('bsAdvPool');
  if (poolSel) poolSel.addEventListener('change', ()=>{
    S.adv.pool = poolSel.value;
    if (poolIsMembers() && S.adv.focus!=='all' && S.adv.focus.length>1) S.adv.focus='all';
    S.dirty=true; renderPanel();
  });
  const focSel = document.getElementById('bsAdvFocus');
  if (focSel) focSel.addEventListener('change', ()=>{ S.adv.focus = focSel.value; renderAdvResults(); });

  // --- renaming: live, never re-renders the input you are typing in ---
  const nameBind = (sel, apply)=>{
    P.querySelectorAll(sel).forEach(inp=>inp.addEventListener('input', ()=>{
      apply(inp);
      S.dirty = true;
      clearTimeout(S._nameT);
      S._nameT = setTimeout(renderNumbers, 200);
    }));
  };
  nameBind('.bs-rname', inp=>{
    const ri = +inp.dataset.ri;
    S.regions[ri].name = inp.value;
    const chip = P.querySelector(`.bs-chip[data-ri="${ri}"] .chip-lbl`);
    if (chip) chip.textContent = inp.value;
    P.querySelectorAll(`.bs-rname[data-ri="${ri}"]`).forEach(o=>{ if(o!==inp) o.value = inp.value; });
  });
  nameBind('.bs-zname', inp=>{
    const zi = +inp.dataset.zi;
    S.tiers.zones[zi].name = inp.value;
    P.querySelectorAll(`.bs-zsel option[value="${zi}"]`).forEach(o=>o.textContent = inp.value);
    P.querySelectorAll(`.bs-zname[data-zi="${zi}"]`).forEach(o=>{ if(o!==inp) o.value = inp.value; });
  });
  nameBind('.bs-ename', inp=>{
    const ei = +inp.dataset.ei;
    S.tiers.ewc[ei].name = inp.value;
    P.querySelectorAll(`.bs-esel option[value="${ei}"]`).forEach(o=>o.textContent = inp.value);
  });
  nameBind('.bs-tiername', inp=>{
    S.tierNames[+inp.dataset.lvl] = inp.value;
    const tb = P.querySelector(`#bsTierSeg [data-tierv="${inp.dataset.lvl}"]`);
    if (tb) tb.textContent = inp.value;
  });
  const fin = document.getElementById('bsFinalName');
  if (fin) fin.addEventListener('input', ()=>{
    S.finalName = fin.value; S.dirty=true;
    clearTimeout(S._nameT); S._nameT = setTimeout(renderNumbers, 200);
  });

  P.querySelectorAll('.bs-zsel').forEach(sel=>sel.addEventListener('change',()=>{
    S.tiers.zoneOf[+sel.dataset.ri] = +sel.value; S.dirty=true; repaintAll(); renderPanel();
  }));
  P.querySelectorAll('.bs-esel').forEach(sel=>sel.addEventListener('change',()=>{
    S.tiers.ewcOf[+sel.dataset.zi] = +sel.value; S.dirty=true; repaintAll(); renderPanel();
  }));
  bind('bsAddZone', ()=>{ S.tiers.zones.push({name:'Zone '+String.fromCharCode(65+S.tiers.zones.length)}); syncTiers(); S.dirty=true; repaintAll(); renderPanel(); });
  bind('bsRemZone', ()=>{ if(S.tiers.zones.length<=1)return; S.tiers.zones.pop(); S.tiers.zoneOf=S.tiers.zoneOf.map(z=>Math.min(z,S.tiers.zones.length-1)); syncTiers(); S.dirty=true; repaintAll(); renderPanel(); });
  bind('bsAddEwc', ()=>{ S.tiers.ewc.push({name:'Group '+(S.tiers.ewc.length+1)}); syncTiers(); S.dirty=true; repaintAll(); renderPanel(); });
  bind('bsRemEwc', ()=>{ if(S.tiers.ewc.length<=1)return; S.tiers.ewc.pop(); S.tiers.ewcOf=S.tiers.ewcOf.map(e=>Math.min(e,S.tiers.ewc.length-1)); syncTiers(); S.dirty=true; repaintAll(); renderPanel(); });

  P.querySelectorAll('.bs-chip[data-ri]').forEach(ch=>ch.addEventListener('click',()=>{
    S.active = +ch.dataset.ri;
    P.querySelectorAll('.bs-chip[data-ri]').forEach(x=>x.classList.toggle('on', +x.dataset.ri===S.active));
  }));
  bind('bsAddRegion', ()=>{
    S.regions.push({name:'Region '+(S.regions.length+1), color:PALETTE[S.regions.length%PALETTE.length]});
    syncTiers(); S.dirty=true; renderPanel();
  });
  bind('bsRemRegion', ()=>{
    if (S.regions.length<=1) return;
    const gone = S.regions.length-1;
    S.regions.pop();
    Object.keys(S.assign).forEach(f=>{ if (S.assign[f]===gone) delete S.assign[f]; });
    if (S.active>=S.regions.length) S.active=S.regions.length-1;
    if (S.detailRegion===gone) S.detailRegion=null;
    if (S.tiers) S.tiers.zoneOf.length = S.regions.length;
    syncTiers(); S.dirty=true; repaintAll(); renderPanel();
  });
  const nameI = document.getElementById('bsName');
  nameI.addEventListener('input', ()=>{ S.scenarioName = nameI.value; S.dirty=true; });
  bind('bsSave', saveScenario);
  bind('bsNew', ()=>{
    if (S.dirty && !confirm('Discard unsaved changes and start a new scenario?')) return;
    S.assign={}; S.regions=defaultRegions(12); S.tiers=null; S.adv=defaultAdv();
    S.tierNames=['Regions','Zones','E / W / C']; S.finalName='Junior Nationals'; S.tierCount=3;
    syncTiers(); S.active=0; S.scenarioId=null; S.scenarioName=''; S.detailRegion=null; S.dirty=false; S.tierView=0;
    repaintAll(); renderPanel();
  });
  bind('bsCsv', exportCsv);
  bind('bsCsvAdv', exportAdvCsv);
  const loadSel = document.getElementById('bsLoad');
  loadSel.addEventListener('change', ()=>{ if (loadSel.value) loadScenario(loadSel.value); });
}

/* ---------- persistence ---------- */
function msg(t){ const m=document.getElementById('bsMsg'); if(m){ m.textContent=t; setTimeout(()=>{ if(m.textContent===t) m.textContent=''; }, 4000);} }

async function saveScenario(){
  if (!S.scenarioName.trim()){ msg('Give the scenario a name first.'); return; }
  if (!S.scenarioId) S.scenarioId = 'bs-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
  syncTiers();
  const data = JSON.stringify({regions:S.regions, assign:S.assign, year:S.year, tiers:S.tiers,
    tierNames:S.tierNames, tierCount:S.tierCount, finalName:S.finalName, adv:S.adv, v:3});
  try {
    await NEON.query(
      `INSERT INTO membership.boundary_scenarios (id, name, data) VALUES ($1,$2,$3::jsonb)
       ON CONFLICT (id) DO UPDATE SET name=$2, data=$3::jsonb, updated_at=now()`,
      [S.scenarioId, S.scenarioName.trim(), data]);
    S.dirty = false;
    msg('Saved "' + S.scenarioName.trim() + '" to cloud.');
    renderPanel();
  } catch(e){ console.error(e); msg('Save failed: ' + (e.message||e)); }
}

let scenarioListCache = null;
async function loadScenarioList(){
  try {
    if (!scenarioListCache || scenarioListCache.t < Date.now()-15000){
      const res = await NEON.query(`SELECT id, name, to_char(updated_at,'Mon DD HH24:MI') u FROM membership.boundary_scenarios ORDER BY updated_at DESC LIMIT 50`);
      scenarioListCache = {t: Date.now(), rows: res.rows};
    }
    const sel = document.getElementById('bsLoad');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Load scenario&hellip;</option>' +
      scenarioListCache.rows.map(r=>`<option value="${esc(r.id)}" ${r.id===S.scenarioId?'selected':''}>${esc(r.name)} (${esc(r.u)})</option>`).join('');
    if (cur && !S.scenarioId) sel.value = cur;
  } catch(e){ /* silent */ }
}

async function loadScenario(id){
  if (S.dirty && !confirm('Discard unsaved changes and load this scenario?')) return;
  try {
    const res = await NEON.query(`SELECT name, data FROM membership.boundary_scenarios WHERE id=$1`, [id]);
    if (!res.rows.length){ msg('Scenario not found.'); return; }
    const row = res.rows[0];
    const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    S.regions = d.regions && d.regions.length ? d.regions : defaultRegions(12);
    S.assign = d.assign || {};
    S.year = d.year === 'y26' ? 'y26' : 'y25';
    S.tiers = d.tiers || null;
    // v2 scenarios carry no names/tier depth/advancement — fill in the defaults.
    S.tierNames = (d.tierNames && d.tierNames.length===3) ? d.tierNames : ['Regions','Zones','E / W / C'];
    S.tierCount = [1,2,3].includes(d.tierCount) ? d.tierCount : 3;
    S.finalName = d.finalName || 'Junior Nationals';
    S.adv = d.adv && d.adv.steps ? d.adv : defaultAdv();
    if (!S.adv.focus) S.adv.focus = 'all';
    if (!S.adv.pool) S.adv.pool = '2026|Zones';
    syncTiers();
    S.scenarioId = id; S.scenarioName = row.name; S.active = 0; S.detailRegion = null; S.dirty = false;
    if (S.tierView >= S.tierCount) S.tierView = S.tierCount-1;
    repaintAll(); renderPanel();
    msg('Loaded "' + row.name + '".');
  } catch(e){ console.error(e); msg('Load failed: ' + (e.message||e)); }
}

function exportCsv(){
  const y = S.year;
  const lines = ['area,zip,members,county,state'];
  S.regions.forEach((r,i)=>{
    regionZips(i).forEach(z=>lines.push(`"${r.name.replace(/"/g,'""')}",${z.zip},${z.m},"${z.county.replace(/"/g,'""')}",${z.st}`));
  });
  download(lines.join('\n'), (S.scenarioName.trim()||'boundary-scenario') + '-' + (y==='y25'?'2025':'2026') + '-zips.csv');
}

function exportAdvCsv(){
  const lines = ['level,group,age_group,gender,event,pool,advance_to_next,direct_to_final'];
  for (let i=0;i<S.tierCount;i++){
    const TG = tierGroupsAt(i);
    const pooled = poolIsMembers() ? poolMembers(i) : poolCells(i);
    const st = S.adv.steps[i] || {a:{},d:{}};
    const last = i===S.tierCount-1;
    TG.groups.forEach((g,gi)=>{
      CELLS.forEach(c=>{
        const pool = poolIsMembers() ? '' : ((pooled.rows[gi]||{})[c] || 0);
        lines.push([`"${tierName(i).replace(/"/g,'""')}"`, `"${g.name.replace(/"/g,'""')}"`,
          AGES.find(a=>a.k===c[0]).label, GENS.find(x=>x.k===c[1]).label, DISCS.find(d=>d.k===c[2]).label,
          pool, (+st.a[c]||0), last ? 0 : (+st.d[c]||0)].join(','));
      });
    });
  }
  const ff = finalField();
  lines.push('');
  lines.push(`"${S.finalName.replace(/"/g,'""')} field",,age_group,gender,event,,entries,`);
  CELLS.forEach(c=>lines.push([`"${S.finalName.replace(/"/g,'""')}"`,'',
    AGES.find(a=>a.k===c[0]).label, GENS.find(x=>x.k===c[1]).label, DISCS.find(d=>d.k===c[2]).label, '', ff[c], ''].join(',')));
  download(lines.join('\n'), (S.scenarioName.trim()||'boundary-scenario') + '-advancement.csv');
}

function download(text, filename){
  const blob = new Blob([text], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- boot ---------- */
window.renderBoundary = async function(){
  const el = document.getElementById('viewBoundary');
  if (S.booted) return;
  el.innerHTML = '<div class="loading">Loading county map&hellip;</div>';
  try {
    S.geo = await (await fetch('boundary-data.json?v=202607202100')).json();
  } catch(e){
    el.innerHTML = `<div class="card"><div class="card-b"><div class="callout warn"><b>Boundary data failed to load.</b> ${esc(e.message||e)}</div></div></div>`;
    return;
  }
  try { S.age = await (await fetch('age-data.json?v=202607210030')).json(); }
  catch(e){ S.age = {}; }
  try { S.advData = await (await fetch('advance-data.json?v=202607231600')).json(); }
  catch(e){ S.advData = {pools:{}, totals:{}}; }
  S.regions = defaultRegions(12);
  S.adv = defaultAdv();
  syncTiers();
  el.innerHTML = `
    <div class="callout"><b>How it works:</b> pick an area chip, then click (or click-drag) counties to paint them in — or switch to <b>Paint whole state</b> for fast broad strokes, then refine county-by-county where the real lines matter (I&#8209;35, Southern&nbsp;California, Clark&nbsp;County). Unassigned counties are tinted navy by how many members live there, so the membership itself shows you where the lines want to go. Add or remove areas to test any structure &mdash; 12, 9, 6, whatever &mdash; and rename everything under <b>Names &amp; structure</b>. Switch to <b>Who moves up</b> to type in how many advance per age group and event. Or start from today's map: <button class="tab" id="bsLoadSeed" style="font-weight:800">Load Current 2026 Alignment</button></div>
    <div class="bs-layout">
      <div class="card" style="margin-bottom:0"><div class="card-b" style="padding:10px">
        <svg id="bsSvg" viewBox="0 0 975 610" style="width:100%;height:auto;display:block;touch-action:none;cursor:crosshair"><g id="bsSvgG"></g></svg>
        <div id="bsLegend" class="bs-legend"></div>
      </div></div>
      <div class="card" style="margin-bottom:0"><div class="card-b" id="bsPanel"></div></div>
    </div>
    <div id="bsTip" class="tooltip-fixed"></div>`;
  renderMapOnce();
  wireMap();
  renderPanel();
  const seedBtn = document.getElementById('bsLoadSeed');
  if (seedBtn) seedBtn.addEventListener('click', ()=>loadScenario('seed-2026-alignment'));
  S.booted = true;
};
})();
