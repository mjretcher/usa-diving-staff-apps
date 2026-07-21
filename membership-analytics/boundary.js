/* USA Diving Membership Analytics — Boundary Studio (boundary.js)
   Paint counties into proposed regions and watch member/athlete/coach/club
   tallies update live. Atoms: member -> zip5 -> county (point-in-polygon,
   precomputed in boundary-data.json). Scenarios persist to
   membership.boundary_scenarios (Neon).
*/
(function(){
'use strict';

const PALETTE = ['#171F69','#E31937','#009AC7','#15803d','#b45309','#7c3aed','#0f766e','#be185d','#8FC3EA','#a16207','#64748b','#92400e','#1d4ed8','#ca8a04','#0891b2','#9f1239'];
const UNASSIGNED_BASE = '#eef1f6';
// Distinct, brand-aligned color ramps for the Zone and E/W/C map views.
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
// Color for a group index in the CURRENT tier view (region / zone / E-W-C).
function groupColor(gi){
  if (gi==null || gi<0) return UNASSIGNED_BASE;
  if (S.tierView===0) return (S.regions[gi] && S.regions[gi].color) || UNASSIGNED_BASE;
  const ramp = S.tierView===1 ? ZONE_RAMP : EWC_RAMP;
  return ramp[gi % ramp.length];
}

const S = {
  geo: null,            // boundary-data.json
  regions: [],          // [{name, color}]
  assign: {},           // fips -> region index
  active: 0,            // active region index (-1 = eraser)
  tool: 'county',       // county | state | pan
  year: 'y25',          // y25 (complete) | y26 (YTD)
  zoom: {k:1, x:0, y:0},
  painting: false,
  detailRegion: null,   // group index (in current tier view) for zip drill-down
  tiers: null,          // {zones:[{name}], zoneOf:[zi per region], ewc:[{name}], ewcOf:[ei per zone]}
  tierView: 0,          // 0=regions 1=zones 2=ewc
  age: null,            // fips -> {y25:[D,C,B,A,19+], y26:[...]}
  ageBreak: false,      // show athlete age-group breakdown
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
}

// current tier: groups list + mapping regionIndex -> groupIndex
function tierGroups(){
  syncTiers();
  if (S.tierView===0) return {groups:S.regions.map((r,i)=>({name:r.name, colors:[r.color]})), of:S.regions.map((_,i)=>i)};
  if (S.tierView===1){
    return {groups:S.tiers.zones.map((z,zi)=>({name:z.name, colors:S.regions.filter((_,ri)=>S.tiers.zoneOf[ri]===zi).map(r=>r.color)})),
            of:S.regions.map((_,ri)=>S.tiers.zoneOf[ri])};
  }
  const ewcOfRegion = S.regions.map((_,ri)=>S.tiers.ewcOf[S.tiers.zoneOf[ri]]);
  return {groups:S.tiers.ewc.map((e,ei)=>({name:e.name, colors:S.regions.filter((_,ri)=>ewcOfRegion[ri]===ei).map(r=>r.color)})),
          of:ewcOfRegion};
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

/* ---------- rendering ---------- */
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

function renderPanel(){
  const t = computeTallies();
  const y = S.year;
  const yLabel = y==='y25' ? '2025 (complete year)' : '2026 (YTD)';
  const assignedM = t.rows.reduce((s,r)=>s+r.m,0);
  const mappableTotal = assignedM + t.un.m;

  const tierCtl = `<div class="seg">
        <button id="bsTier0" class="${S.tierView===0?'on':''}">Regions</button>
        <button id="bsTier1" class="${S.tierView===1?'on':''}">Zones</button>
        <button id="bsTier2" class="${S.tierView===2?'on':''}">E / W / C</button>
      </div>`;
  const ageCtl = `<div class="seg"><button id="bsAgeToggle" class="${S.ageBreak?'on':''}">Age groups: ${S.ageBreak?'on':'off'}</button></div>`;

  const chips = S.regions.map((r,i)=>`
    <button class="bs-chip ${S.active===i?'on':''}" data-ri="${i}" style="--c:${r.color}">
      <span class="dot"></span>${esc(r.name)}</button>`).join('') +
    `<button class="bs-chip eraser ${S.active===-1?'on':''}" data-ri="-1"><span class="dot" style="background:#fff;border:1.5px solid #94a3b8"></span>Eraser</button>`;

  const swatches = cols => cols.map(c=>`<span class="sw sw-multi" style="background:${c}"></span>`).join('');
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
  const TGnow = t.TG;
  if (S.detailRegion!=null && S.detailRegion>=0 && S.detailRegion<TGnow.groups.length){
    const zips = regionZips(S.detailRegion);
    const g = TGnow.groups[S.detailRegion];
    drill = `<div class="bs-drill">
      <div class="bs-drill-h"><span class="sw" style="background:${groupColor(S.detailRegion)}"></span><b>${esc(g.name)}</b> — ${fmt(zips.length)} zip codes pooled (${yLabel}) <button class="tab" id="bsDrillClose" style="padding:3px 10px;font-size:11px">close</button></div>
      <div class="bs-zips">${zips.map(z=>`<span class="bs-zip" title="${esc(z.county)} County, ${esc(z.st)}"><b>${z.zip}</b> ${z.m}</span>`).join('') || '<span class="note">No members in this region yet.</span>'}</div>
    </div>`;
  }

  const unmappable = S.totals[y] - mappableTotal;

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
      ${tierCtl}${ageCtl}
    </div>
    <div class="bs-chips">${chips}
      <button class="bs-chip add" id="bsAddRegion">+ Add region</button>
      <button class="bs-chip add" id="bsRemRegion" ${S.regions.length<=1?'disabled':''}>&minus; Remove last</button>
    </div>
    <table class="bs-table"><thead><tr>
      <th>Area</th><th class="num">Members</th><th class="num">Athletes</th><th class="num">Coaches</th>
      <th class="num">Clubs</th><th class="num">Zips</th><th class="num">Counties</th><th class="num">Share</th>
    </tr></thead><tbody>${rowsHtml}${unRow}</tbody></table>
    <div class="note" style="margin-top:6px">Tallies: ${yLabel}. Click a region row to pool its zip codes. ${unmappable>0?`<b>${fmt(unmappable)}</b> members not mappable (foreign address or invalid zip) are excluded from the map.`:''}</div>
    ${drill}
    <details class="bs-tiers" ${S.tierView>0?'open':''}>
      <summary>Configure tiers (which regions form each Zone, which zones form E/W/C)</summary>
      <div class="bs-tier-grid">
        <div>
          <div class="bs-tier-h">Region &rarr; Zone
            <button class="tab bs-mini" id="bsAddZone">+ zone</button>
            <button class="tab bs-mini" id="bsRemZone" ${S.tiers && S.tiers.zones.length<=1?'disabled':''}>&minus; zone</button></div>
          ${S.regions.map((r,ri)=>`<label class="bs-tier-row"><span class="sw" style="background:${r.color}"></span>${esc(r.name)}
            <select class="sel bs-zsel" data-ri="${ri}">${S.tiers.zones.map((z,zi)=>`<option value="${zi}" ${S.tiers.zoneOf[ri]===zi?'selected':''}>${esc(z.name)}</option>`).join('')}</select></label>`).join('')}
        </div>
        <div>
          <div class="bs-tier-h">Zone &rarr; E/W/C
            <button class="tab bs-mini" id="bsAddEwc">+ group</button>
            <button class="tab bs-mini" id="bsRemEwc" ${S.tiers && S.tiers.ewc.length<=1?'disabled':''}>&minus; group</button></div>
          ${S.tiers.zones.map((z,zi)=>`<label class="bs-tier-row"><b>${esc(z.name)}</b>
            <select class="sel bs-esel" data-zi="${zi}">${S.tiers.ewc.map((e,ei)=>`<option value="${ei}" ${S.tiers.ewcOf[zi]===ei?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label>`).join('')}
        </div>
      </div>
    </details>
    <div class="bs-row" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
      <input class="search" id="bsName" placeholder="Scenario name&hellip;" value="${esc(S.scenarioName)}" style="min-width:180px">
      <button class="tab" id="bsSave">${S.dirty?'Save*':'Save'}</button>
      <select class="sel" id="bsLoad"><option value="">Load scenario&hellip;</option></select>
      <button class="tab" id="bsNew">New / Clear</button>
      <button class="tab" id="bsCsv">Export CSV</button>
    </div>
    <div class="note" id="bsMsg"></div>`;

  renderLegend(t, mappableTotal, yLabel);
  wirePanel();
  loadScenarioList();
}

// Front-and-center stat band under the map: one card per group in the active tier.
function renderLegend(t, mappableTotal, yLabel){
  const lgEl = document.getElementById('bsLegend');
  if (!lgEl) return;
  const tierLabel = S.tierView===0 ? 'Regions' : (S.tierView===1 ? 'Zones' : 'East · Central · West');
  const share = m => mappableTotal>0 ? (100*m/mappableTotal).toFixed(1)+'%' : '—';

  if (S.ageBreak){
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
    lgEl.innerHTML = `<div class="bs-lg-head"><b>${tierLabel}</b> &mdash; athletes by age group · ${yLabel} · <span class="bs-lg-hint">AQUA age (as of Dec 31) · tap a card to pool its zips</span></div>${key}<div class="bs-lg-cards age">${cards}</div>`;
    return;
  }

  const cards = t.rows.map((r,i)=>`
    <button class="bs-lg-card ${S.detailRegion===i?'sel':''}" data-drill2="${i}" style="--c:${groupColor(i)}">
      <span class="bs-lg-nm"><span class="bs-lg-sw"></span>${esc(t.TG.groups[i].name)}</span>
      <span class="bs-lg-big">${fmt(r.m)}</span>
      <span class="bs-lg-sub">${share(r.m)} share · ${fmt(r.a)} ath · ${fmt(r.cl.size)} clubs</span>
    </button>`).join('');
  const un = t.un.m>0 ? `<div class="bs-lg-card un">
      <span class="bs-lg-nm"><span class="bs-lg-sw" style="background:${UNASSIGNED_BASE};border:1px solid #d8e0ec"></span>Unassigned</span>
      <span class="bs-lg-big">${fmt(t.un.m)}</span>
      <span class="bs-lg-sub">${share(t.un.m)} share</span></div>` : '';
  const hint = S.detailRegion!=null ? 'tap the highlighted card to close the zip drill-down'
                                    : 'tap a card to pool its zip codes';
  lgEl.innerHTML = `<div class="bs-lg-head"><b>${tierLabel}</b> &mdash; members by area · ${yLabel} · <span class="bs-lg-hint">${hint}</span></div>
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
function tallySoon(){ clearTimeout(tallyTimer); tallyTimer = setTimeout(renderPanel, 180); }

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
  bind('bsTier0', ()=>{S.tierView=0; S.detailRegion=null; repaintAll(); renderPanel();});
  bind('bsTier1', ()=>{S.tierView=1; S.detailRegion=null; repaintAll(); renderPanel();});
  bind('bsTier2', ()=>{S.tierView=2; S.detailRegion=null; repaintAll(); renderPanel();});
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
  bind('bsAgeToggle', ()=>{S.ageBreak=!S.ageBreak; renderPanel();});
  document.querySelectorAll('#bsLegend [data-drill2]').forEach(el=>el.addEventListener('click',()=>{
    const i=+el.dataset.drill2; S.detailRegion=(S.detailRegion===i)?null:i; renderPanel();
  }));
  P.querySelectorAll('.bs-chip[data-ri]').forEach(ch=>ch.addEventListener('click',()=>{
    S.active = +ch.dataset.ri; renderPanel();
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
  P.querySelectorAll('tr[data-drill]').forEach(tr=>tr.addEventListener('click',()=>{
    const i = +tr.dataset.drill;
    S.detailRegion = (S.detailRegion===i) ? null : i;
    renderPanel();
  }));
  bind('bsDrillClose', ()=>{S.detailRegion=null; renderPanel();});
  const nameI = document.getElementById('bsName');
  nameI.addEventListener('input', ()=>{ S.scenarioName = nameI.value; S.dirty=true; });
  bind('bsSave', saveScenario);
  bind('bsNew', ()=>{
    if (S.dirty && !confirm('Discard unsaved changes and start a new scenario?')) return;
    S.assign={}; S.regions=defaultRegions(12); S.tiers=null; syncTiers(); S.active=0; S.scenarioId=null; S.scenarioName=''; S.detailRegion=null; S.dirty=false; S.tierView=0;
    repaintAll(); renderPanel();
  });
  bind('bsCsv', exportCsv);
  const loadSel = document.getElementById('bsLoad');
  loadSel.addEventListener('change', ()=>{ if (loadSel.value) loadScenario(loadSel.value); });
}

/* ---------- persistence ---------- */
function msg(t){ const m=document.getElementById('bsMsg'); if(m){ m.textContent=t; setTimeout(()=>{ if(m.textContent===t) m.textContent=''; }, 4000);} }

async function saveScenario(){
  if (!S.scenarioName.trim()){ msg('Give the scenario a name first.'); return; }
  if (!S.scenarioId) S.scenarioId = 'bs-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
  syncTiers();
  const data = JSON.stringify({regions:S.regions, assign:S.assign, year:S.year, tiers:S.tiers, v:2});
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
    S.tiers = d.tiers || null; syncTiers();
    S.scenarioId = id; S.scenarioName = row.name; S.active = 0; S.detailRegion = null; S.dirty = false;
    repaintAll(); renderPanel();
    msg('Loaded "' + row.name + '".');
  } catch(e){ console.error(e); msg('Load failed: ' + (e.message||e)); }
}

function exportCsv(){
  const y = S.year;
  const lines = ['region,zip,members,county,state'];
  S.regions.forEach((r,i)=>{
    regionZips(i).forEach(z=>lines.push(`"${r.name.replace(/"/g,'""')}",${z.zip},${z.m},"${z.county.replace(/"/g,'""')}",${z.st}`));
  });
  const blob = new Blob([lines.join('\n')], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (S.scenarioName.trim()||'boundary-scenario') + '-' + (y==='y25'?'2025':'2026') + '-zips.csv';
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
  S.regions = defaultRegions(12);
  syncTiers();
  el.innerHTML = `
    <div class="callout"><b>How it works:</b> pick a region chip, then click (or click-drag) counties to paint them in — or switch to <b>Paint whole state</b> for fast broad strokes, then refine county-by-county where the real lines matter (I&#8209;35, Southern&nbsp;California, Clark&nbsp;County). Unassigned counties are tinted navy by how many members live there, so the membership itself shows you where the lines want to go. The tally updates as you paint. Add or remove regions to test any structure &mdash; 12, 9, 6, whatever. Or start from today's map: <button class="tab" id="bsLoadSeed" style="font-weight:800">Load Current 2026 Alignment</button></div>
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
