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
// Distinct, brand-aligned color ramps, one per level above the painted map.
const RAMPS = [
  ['#171F69','#009AC7','#15803d','#b45309','#7c3aed','#E31937','#0891b2','#be185d','#a16207','#4f46e5'],
  ['#171F69','#009AC7','#E31937','#15803d','#b45309','#7c3aed'],
  ['#0f766e','#b45309','#7c3aed','#171F69','#009AC7','#be185d'],
  ['#be185d','#15803d','#1d4ed8','#ca8a04','#0891b2','#92400e'],
];
const MAX_LEVELS = 6;
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
  // levels[0] is the painted map itself (its groups are S.regions). Every level
  // above it has its own groups and an `of` array mapping each group one level
  // down to its parent here. Any depth, any group counts, any names.
  levels: null,         // [{name}, {name, groups:[{name}], of:[...]}, ...]
  tierView: 0,          // which level the map + tallies are showing
  finalName: 'Junior Nationals',
  legendMode: 'members',// members | age | comp
  panelMode: 'tally',   // tally | advance
  flow: null,           // cached JuniorFlow result for the current map
  routing: null,        // editable qualification pathway (see routing.js)
  mult: null,           // measured entries-per-athlete (athlete-multiplicity.json)
  routeRes: null,       // its projection
  bdMode: 'stop',       // breakdown view: stop | total | qualified
  bdCell: 'all',        // which event+gender the panel is showing
  flowErr: null,
  adv: null,            // {pool, steps:[{a:{},d:{}}], focus:'all'}
  age: null,            // fips -> {y25:[D,C,B,A,19+], y26:[...]}
  scenarioId: null,
  scenarioName: '',
  undo: [], redo: [],   // full scenario snapshots
  compare: null,        // {id, name, assign, regions} loaded for side-by-side churn
  palOpen: null,        // area index whose colour picker is open
  mergeFrom: 0, mergeTo: 1,
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
  return {pool:'2026|Zones', focus:'all', step:0, steps:[{a:{},d:{}},{a:{},d:{}},{a:{},d:{}}]};
}

function defaultLevels(nRegions){
  const nZ = Math.max(1, Math.ceil(nRegions/2));
  const zones = Array.from({length:nZ}, (_,i)=>({name:'Zone '+String.fromCharCode(65+i)}));
  const zoneOf = Array.from({length:nRegions}, (_,i)=>Math.min(Math.floor(i/2), nZ-1));
  const nE = Math.max(1, Math.ceil(nZ/2));
  const top = nE===3 ? [{name:'East'},{name:'Central'},{name:'West'}]
                     : Array.from({length:nE}, (_,i)=>({name:'Group '+(i+1)}));
  const topOf = Array.from({length:nZ}, (_,i)=>Math.min(Math.floor(i/2), nE-1));
  return [{name:'Regions'}, {name:'Zones', groups:zones, of:zoneOf},
          {name:'E / W / C', groups:top, of:topOf}];
}

const levelCount = () => (S.levels ? S.levels.length : 1);
// How many groups sit at a level. Level 0 is the painted map.
function groupCountAt(level){
  return level===0 ? S.regions.length : (S.levels[level].groups || []).length;
}

function syncLevels(){
  if (!S.levels || !S.levels.length) S.levels = defaultLevels(S.regions.length);
  if (!S.levels[0]) S.levels[0] = {name:'Regions'};
  syncRouting();
  if (!S.levels[0].name) S.levels[0].name = 'Regions';
  for (let k=1; k<S.levels.length; k++){
    const L = S.levels[k];
    if (!L.name) L.name = 'Level ' + (k+1);
    if (!L.groups || !L.groups.length) L.groups = [{name:'Group 1'}];
    const nBelow = groupCountAt(k-1);
    if (!Array.isArray(L.of)) L.of = [];
    while (L.of.length < nBelow) L.of.push(Math.min(Math.floor(L.of.length/2), L.groups.length-1));
    L.of.length = nBelow;
    L.of = L.of.map(v => Math.min(Math.max(0, v|0), L.groups.length-1));
  }
  if (!S.adv) S.adv = defaultAdv();
  while (S.adv.steps.length < S.levels.length) S.adv.steps.push({a:{},d:{}});
  S.adv.steps.length = Math.max(S.adv.steps.length, S.levels.length);
  if (S.adv.step==null) S.adv.step = 0;                 // open on the first transition
  if (S.adv.step >= S.levels.length) S.adv.step = S.levels.length-1;
  if (S.tierView >= S.levels.length) S.tierView = S.levels.length-1;
}

// region index -> group index at `level`, by walking the chain of `of` arrays.
function ofChain(level){
  let cur = S.regions.map((_,i)=>i);
  for (let k=1; k<=level; k++){
    const of = S.levels[k].of;
    cur = cur.map(gi => (of[gi]==null ? 0 : of[gi]));
  }
  return cur;
}

// Groups at a given level + mapping regionIndex -> groupIndex.
function tierGroupsAt(level){
  syncLevels();
  if (level===0) return {groups:S.regions.map(r=>({name:r.name, colors:[r.color]})), of:S.regions.map((_,i)=>i)};
  const of = ofChain(level);
  return {groups:S.levels[level].groups.map((g,gi)=>({name:g.name,
            colors:S.regions.filter((_,ri)=>of[ri]===gi).map(r=>r.color)})), of};
}
function tierGroups(){ return tierGroupsAt(S.tierView); }
function tierName(i){ return (S.levels[i] && S.levels[i].name) || ('Level '+(i+1)); }

// Color for a group index in the CURRENT level view.
function groupColor(gi){
  if (gi==null || gi<0) return UNASSIGNED_BASE;
  if (S.tierView===0) return (S.regions[gi] && S.regions[gi].color) || UNASSIGNED_BASE;
  const ramp = RAMPS[(S.tierView-1) % RAMPS.length];
  return ramp[gi % ramp.length];
}

function heatTint(m, maxM){
  if (!m) return UNASSIGNED_BASE;
  const t = Math.pow(Math.min(1, m/maxM), 0.45);
  const mix=(a,b)=>Math.round(a+(b-a)*t*0.55); // cap at 55% toward navy so it reads as "unassigned but populated"
  return `rgb(${mix(238,23)},${mix(241,31)},${mix(246,105)})`;
}

/* ---------- undo / redo ---------- */
const SEED_IDS = ['seed-2026-official','seed-2026-alignment'];
const isSeed = id => SEED_IDS.includes(id);

function snapshot(){
  return {assign:Object.assign({}, S.assign),
          regions:JSON.parse(JSON.stringify(S.regions)),
          levels:JSON.parse(JSON.stringify(S.levels)),
          finalName:S.finalName};
}
function sameAssign(a, b){
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}
// `key` coalesces rapid edits to the same control (typing a name) into one step.
function pushUndo(key){
  const now = Date.now();
  if (key && S._uKey === key && now - S._uAt < 1500){ S._uAt = now; return; }
  S.undo.push(snapshot());
  if (S.undo.length > 50) S.undo.shift();
  S.redo.length = 0;
  S._uKey = key || null; S._uAt = now;
}
function applySnap(sn){
  S.assign = sn.assign; S.regions = sn.regions; S.levels = sn.levels; S.finalName = sn.finalName;
  syncLevels();
  if (S.active >= S.regions.length) S.active = S.regions.length - 1;
  S.detailRegion = null; S.palOpen = null;
}
// Toggle the history buttons without rebuilding the panel — a full re-render
// would blow away whatever input the user is typing in.
function refreshHistoryButtons(){
  const u = document.getElementById('bsUndo'), r = document.getElementById('bsRedo');
  if (u) u.disabled = !S.undo.length;
  if (r) r.disabled = !S.redo.length;
}
function doUndo(){
  if (!S.undo.length) return;
  S.redo.push(snapshot()); applySnap(S.undo.pop());
  S._uKey = null; S.dirty = true; repaintAll(); renderPanel();
}
function doRedo(){
  if (!S.redo.length) return;
  S.undo.push(snapshot()); applySnap(S.redo.pop());
  S._uKey = null; S.dirty = true; repaintAll(); renderPanel();
}

/* ---------- area surgery ---------- */
// Remove area `i`. Its counties go unassigned, or into `into` when given.
function removeArea(i, into){
  if (S.regions.length <= 1) return;
  pushUndo();
  const shift = j => (j < i ? j : j - 1);
  const dest = (into==null || into===i) ? null : shift(into);
  const next = {};
  for (const [f, ri] of Object.entries(S.assign)){
    if (ri === i){ if (dest!=null) next[f] = dest; }
    else if (ri >= 0 && ri < S.regions.length) next[f] = shift(ri);
  }
  S.assign = next;
  S.regions.splice(i, 1);
  if (S.levels.length > 1) S.levels[1].of.splice(i, 1);
  if (S.active >= S.regions.length) S.active = S.regions.length - 1;
  if (S.detailRegion != null) S.detailRegion = null;
  S.palOpen = null;
  S.mergeFrom = Math.min(S.mergeFrom, S.regions.length-1);
  S.mergeTo = Math.min(S.mergeTo, S.regions.length-1);
  syncLevels(); S.dirty = true; repaintAll(); renderPanel();
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

  const tierBtns = Array.from({length:levelCount()}, (_,i)=>
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
      <div class="seg">
        <button id="bsUndo" ${S.undo.length?'':'disabled'} title="Ctrl+Z">&#8630; Undo</button>
        <button id="bsRedo" ${S.redo.length?'':'disabled'} title="Ctrl+Shift+Z">Redo &#8631;</button>
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
    </div>
    <div class="bs-row bs-mergebar">
      <span class="bs-lvl">Combine</span>
      <select class="sel" id="bsMergeFrom">${S.regions.map((r,i)=>`<option value="${i}" ${S.mergeFrom===i?'selected':''}>${esc(r.name)}</option>`).join('')}</select>
      <span class="bs-lvl">into</span>
      <select class="sel" id="bsMergeTo">${S.regions.map((r,i)=>`<option value="${i}" ${S.mergeTo===i?'selected':''}>${esc(r.name)}</option>`).join('')}</select>
      <button class="tab bs-mini" id="bsMergeGo" ${S.regions.length<=1?'disabled':''}>Combine them</button>
      <span class="note">Hands every county in the first area to the second, then deletes the first.</span>
    </div>
    <div class="seg bs-modeseg">
      <button id="bsModeTally" class="${S.panelMode==='tally'?'on':''}">Who lives here</button>
      <button id="bsModeAdv" class="${S.panelMode==='advance'?'on':''}">Who moves up</button>
      <button id="bsModePath" class="${S.panelMode==='pathway'?'on':''}">Pathway</button>
    </div>
    <div id="bsBody"></div>
    ${renderNamesPanel()}
    <div class="bs-row" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
      <input class="search" id="bsName" placeholder="Scenario name&hellip;" value="${esc(S.scenarioName)}" style="min-width:180px">
      <button class="tab" id="bsSave">${S.dirty?'Save*':'Save'}</button>
      <button class="tab" id="bsSaveNew">Save as a new one</button>
      <select class="sel" id="bsLoad"><option value="">Load scenario&hellip;</option></select>
      <button class="tab" id="bsNew">New / Clear</button>
      <button class="tab" id="bsDelete" ${(!S.scenarioId||isSeed(S.scenarioId))?'disabled':''}>Delete this one</button>
    </div>
    <div class="bs-row">
      <span class="bs-lvl">Compare with</span>
      <select class="sel" id="bsCompare"><option value="">nothing&hellip;</option></select>
      ${S.compare?`<button class="tab bs-mini" id="bsCompareOff">Stop comparing</button>`:''}
      <button class="tab" id="bsCsv">Export zips CSV</button>
      <button class="tab" id="bsCsvAdv">Export advancement CSV</button>
    </div>
    ${S.scenarioId && isSeed(S.scenarioId) ? `<div class="note" style="margin-top:6px"><b>${esc(S.scenarioName)}</b> is a reference map. Saving will create a copy so the original stays intact.</div>` : ''}
    <div class="note" id="bsMsg"></div>`;

  if (S.panelMode==='advance') renderAdvShell();
  if (S.panelMode==='pathway') renderPathwayShell();
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
    refreshFlow();
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
    ${drill}
    ${renderCompare()}`;
}

/* ---------- comparison ---------- */
function compareChurn(){
  if (!S.compare) return null;
  const y = S.year;
  const nameCur = ri => (ri==null || ri<0 || !S.regions[ri]) ? '\u2014 unassigned \u2014' : S.regions[ri].name;
  const nameOth = ri => (ri==null || ri<0 || !S.compare.regions[ri]) ? '\u2014 unassigned \u2014' : S.compare.regions[ri].name;
  const rows = new Map();
  let moved = 0, movedM = 0, totM = 0;
  for (const c of S.geo.counties){
    const f = c.f;
    const an = nameCur(S.assign[f]), bn = nameOth(S.compare.assign[f]);
    const m = S.geo.stats[f] ? S.geo.stats[f][y].m : 0;
    totM += m;
    if (an !== bn){ moved++; movedM += m; }
    if (!rows.has(an)) rows.set(an, new Map());
    const inner = rows.get(an);
    const rec = inner.get(bn) || {c:0, m:0};
    rec.c++; rec.m += m; inner.set(bn, rec);
  }
  return {rows, moved, movedM, totM};
}

function renderCompare(){
  const ch = compareChurn();
  if (!ch) return '';
  const body = [...ch.rows.entries()].map(([an, inner])=>{
    const src = [...inner.entries()].sort((a,b)=>b[1].m-a[1].m || b[1].c-a[1].c);
    const same = src.filter(([bn])=>bn===an).reduce((s,[,v])=>s+v.m, 0);
    const from = src.filter(([bn])=>bn!==an).slice(0,4)
      .map(([bn,v])=>`<span class="bs-src">${esc(bn)} <b>${fmt(v.m)}</b></span>`).join('');
    return `<tr><td><b>${esc(an)}</b></td><td class="num">${fmt(same)}</td>
      <td>${from || '<span class="note">nothing new</span>'}</td></tr>`;
  }).join('');
  return `<div class="bs-cmp">
    <div class="bs-balhead" style="margin-top:0;border-top:0;padding-top:0">
      <b>Against ${esc(S.compare.name)}</b>
      <span class="bs-spread ${ch.movedM/Math.max(1,ch.totM) < 0.05 ? 'ok' : (ch.movedM/Math.max(1,ch.totM) < 0.2 ? 'over' : 'under')}">${fmt(ch.moved)} counties &middot; ${fmt(ch.movedM)} members change area</span>
    </div>
    <table class="bs-table"><thead><tr>
      <th>Area now</th><th class="num">Members it keeps</th><th>Members it takes from</th>
    </tr></thead><tbody>${body}</tbody></table>
    <div class="note" style="margin-top:6px">Matched by area name. Rename areas to match the other scenario if you want a like-for-like read.</div>
  </div>`;
}

/* ---------- names & structure panel ---------- */
function renderNamesPanel(){
  const N = levelCount();

  // One column per level above the map: rename each group one level down and
  // choose which group here it rolls into. Plus a column naming the top level.
  const cols = [];
  for (let k=1; k<N; k++){
    const L = S.levels[k];
    cols.push(`<div>
      <div class="bs-tier-h">${esc(tierName(k-1))} &rarr; ${esc(tierName(k))}
        <button class="tab bs-mini bs-addgrp" data-lvl="${k}">+ add</button>
        <button class="tab bs-mini bs-remgrp" data-lvl="${k}" ${L.groups.length<=1?'disabled':''}>&minus; remove</button>
        <button class="tab bs-mini bs-renum" data-lvl="${k-1}" title="Rename every area from the level name, including ones you typed">renumber</button></div>
      ${Array.from({length:groupCountAt(k-1)}, (_,gi)=>{
        const sw = k===1 ? `<button class="sw bs-swbtn" data-pal="${gi}" style="background:${S.regions[gi].color}" title="Change colour"></button>` : '';
        const nm = k===1 ? S.regions[gi].name : S.levels[k-1].groups[gi].name;
        const del = k===1 ? `<button class="bs-x" data-delarea="${gi}" title="Delete this area" ${S.regions.length<=1?'disabled':''}>&times;</button>` : '';
        return `<div class="bs-tier-row">${sw}
          <input class="bs-name-in bs-gname" data-lvl="${k-1}" data-gi="${gi}" value="${esc(nm)}">
          <select class="sel bs-psel" data-lvl="${k}" data-gi="${gi}">${L.groups.map((g,j)=>
            `<option value="${j}" ${L.of[gi]===j?'selected':''}>${esc(g.name)}</option>`).join('')}</select>${del}</div>
          ${(k===1 && S.palOpen===gi) ? `<div class="bs-pal">${PALETTE.map(c=>
            `<button class="bs-pal-c" data-setcol="${gi}" data-col="${esc(c)}" style="background:${c}"></button>`).join('')}</div>` : ''}`;
      }).join('')}
    </div>`);
  }
  // Name the groups at the highest level (for a 1-level map that is the map itself).
  const top = N-1;
  cols.push(`<div>
    <div class="bs-tier-h">${esc(tierName(top))} names
      <button class="tab bs-mini bs-renum" data-lvl="${top}" title="Rename every area from the level name, including ones you typed">renumber</button></div>
    ${Array.from({length:groupCountAt(top)}, (_,gi)=>{
      const sw = top===0 ? `<button class="sw bs-swbtn" data-pal="${gi}" style="background:${S.regions[gi].color}" title="Change colour"></button>` : '';
      const nm = top===0 ? S.regions[gi].name : S.levels[top].groups[gi].name;
      const del = top===0 ? `<button class="bs-x" data-delarea="${gi}" title="Delete this area" ${S.regions.length<=1?'disabled':''}>&times;</button>` : '';
      return `<div class="bs-tier-row">${sw}
        <input class="bs-name-in bs-gname" data-lvl="${top}" data-gi="${gi}" value="${esc(nm)}">${del}</div>
        ${(top===0 && S.palOpen===gi) ? `<div class="bs-pal">${PALETTE.map(c=>
          `<button class="bs-pal-c" data-setcol="${gi}" data-col="${esc(c)}" style="background:${c}"></button>`).join('')}</div>` : ''}`;
    }).join('')}
  </div>`);

  const lvlInputs = Array.from({length:N}, (_,i)=>
    `<label class="bs-tier-row"><span class="bs-lvl">Level ${i+1}</span>
      <input class="bs-name-in bs-lvlname" data-lvl="${i}" value="${esc(tierName(i))}"></label>`).join('');

  return `<details class="bs-tiers" ${S.tierView>0?'open':''}>
    <summary>Names &amp; structure — rename anything, add or remove levels, set what rolls up into what</summary>
    <div class="bs-namebar">
      <span class="bs-lvl">Levels</span>
      <button class="tab bs-mini" id="bsAddLevel" ${N>=MAX_LEVELS?'disabled':''}>+ add a level on top</button>
      <button class="tab bs-mini" id="bsRemLevel" ${N<=1?'disabled':''}>&minus; remove top level</button>
      <span class="bs-lvl" style="margin-left:10px">Top meet</span>
      <input class="bs-name-in" id="bsFinalName" value="${esc(S.finalName)}" placeholder="Junior Nationals" style="min-width:150px">
    </div>
    <div class="bs-namebar">${lvlInputs}</div>
    <div class="bs-tier-grid">${cols.join('')}</div>
    <div class="note" style="margin-top:6px">Level 1 is the map you paint. Everything above it is just grouping — name the levels whatever the committee is calling them.</div>
  </details>`;
}

/* ---------- advancement ---------- */
/* The advancement view is READ-ONLY with respect to the rules. It shows what
   the published qualification rules plus measured take-up actually produce on
   the map you have drawn. What-if on the rules themselves (different qualifier
   counts per age group, fee changes) lives in Pricing Studio, which owns that
   model; this panel consumes it through window.JuniorFlow so there is only one
   answer to "who moves up". */


/* ---------- the qualification pathway ----------
   Which athletes move where, expressed as place bands between rounds. The
   engine lives in routing.js; this is the editing surface and the projection.
   Held alongside the map because a pathway and a set of boundaries only mean
   something together -- nine zones sending three each is a different
   championship from six zones sending five. */
function QR(){ return window.QualRouting; }

function syncRouting(){
  if (!QR()) return;
  const n = S.levels.length;
  if (!S.routing || !S.routing.length) S.routing = QR().defaultRouting(n - 1, n - 1);
  while (S.routing.length < n) S.routing.push({rounds:[{key:'final'}], routes:[]});
  S.routing.length = n;
  S.routing.forEach(l => {
    if (!l.rounds || !l.rounds.length) l.rounds = [{key:'final'}];
    if (!l.routes) l.routes = [];
    // A route pointing past the top of the structure would drop athletes.
    l.routes = l.routes.filter(rt => !rt.to || rt.to.level < n);
  });
}

/* Walk a group index up the tier chain, the way the map already nests areas. */
function groupUp(fromL, g, toL){
  let cur = g;
  for (let L = fromL + 1; L <= toL; L++){
    const of = (S.levels[L] && S.levels[L].of) || [];
    cur = of[cur];
    if (cur == null) return null;
  }
  return cur;
}

/* Project the current pathway over the current map. */
/* Which stage's measured behaviour applies to a level. Custom structures do not
   carry the rulebook's names, so it is matched by depth: the first stop behaves
   like Regionals, the championship like Nationals. Named on screen, because
   applying Nationals behaviour to a Regionals-sized field would be wrong and
   invisible. */
function multBasisFor(L){
  const n = S.levels.length;
  const yr = S.year === 'y25' ? '2025' : '2026';
  const stage = (L === 0) ? 'Regionals'
              : (L === n - 1) ? 'Nationals'
              : (L === 1) ? 'Zones' : 'EWC';
  return stage + '|' + yr;
}

async function ensureMult(){
  if (S.mult) return S.mult;
  try {
    const r = await fetch('athlete-multiplicity.json?v=' + Date.now().toString(36).slice(0,5));
    S.mult = r.ok ? await r.json() : null;
  } catch(e){ console.warn('multiplicity', e); S.mult = null; }
  return S.mult;
}

/* Two projections of the same pathway. `qualified` is what the rules entitle
   people to; `expected` applies the take-up measured from the season we ran,
   because the published rules always qualify more athletes than turn up. Asked
   "how many could register", the honest answer is both numbers. */
function projectPathway(withTakeUp){
  if (!QR() || !S.flow) return null;   // caller must have refreshed the flow
  syncRouting();
  const cells = CELLS;
  let conv = {};
  S.takeUp = null;
  if (withTakeUp !== false){
    try {
      const k = window.JuniorFlow && window.JuniorFlow.constants
              ? window.JuniorFlow.constants(S.year) : null;
      if (k){
        S.takeUp = {basis:k.basis, usable:k.usable, fallback:k.fallbackBaseline};
        // Only apply constants that actually measured something. All-ones is the
        // absence of a measurement, and applying it while saying take-up is
        // included would be a claim the numbers do not support.
        if (k.usable) (k.levels || []).forEach((lv, i) => { if (lv && lv.conv) conv[i] = lv.conv; });
      }
    } catch(e){ console.warn('take-up constants', e); S.takeUp = {error:String(e.message||e)}; }
  }
  return QR().project({
    routing: S.routing,
    entries0: (S.flow.levels[0] || {rows: []}).rows,
    groupCount: L => groupCountAt(L),
    groupOf: groupUp,
    conv, cells,
  });
}

/* ---------- naming areas from the level they sit under ----------
   Renaming a level should rename the areas beneath it: call level 1 "Zones"
   and its areas become Zone 1, Zone 2, and so on, rather than being typed by
   hand nine times (which is how "Zone8" ends up missing its space).

   The whole difficulty is knowing what NOT to touch. A level whose areas are
   called East, Central and West must survive being renamed, because those are
   real names rather than placeholders. So a name is only replaced when it
   looks like something we generated. */

/* "Zones" -> "Zone". Returns null when the label is not a simple plural noun:
   "East, Central, West" names the areas themselves, and numbering areas from
   it would produce nonsense. */
function singulariseLevel(name){
  const n = String(name || '').trim();
  if (!n || n.indexOf(',') >= 0) return null;
  if (n.split(/\s+/).length > 2) return null;
  if (/ies$/i.test(n)) return n.slice(0, -3) + 'y';
  if (/(ses|xes|zes|ches|shes)$/i.test(n)) return n.slice(0, -2);
  if (/ss$/i.test(n)) return n;
  if (/s$/i.test(n)) return n.slice(0, -1);
  return n;
}

/* Did we generate this name, or did a person choose it? "Zone 1" and "Zone8"
   are ours; "East" and "Central" are not, and are never overwritten. */
function looksGenerated(name){
  const n = String(name || '').trim();
  if (!n) return true;
  return /^[A-Za-z][A-Za-z .'\-]*\s*\d+$/.test(n) ||
         /^[A-Za-z][A-Za-z .'\-]*\s+[A-Z]$/.test(n);
}

function areasAtLevel(lvl){
  return lvl === 0 ? S.regions : ((S.levels[lvl] && S.levels[lvl].groups) || []);
}

/* Rename the areas under a level from that level's own name.
   force=true renames everything, including names a person chose. */
function renumberAreas(lvl, force){
  const base = singulariseLevel(tierName(lvl));
  const areas = areasAtLevel(lvl);
  if (!base || !areas.length) return {renamed:0, kept:0, base:null};
  let renamed = 0, kept = 0;
  areas.forEach((g, i) => {
    if (!force && !looksGenerated(g.name)){ kept++; return; }
    // A single area does not want a number after it.
    const want = areas.length === 1 ? base : base + ' ' + (i + 1);
    if (g.name !== want){ g.name = want; renamed++; }
  });
  return {renamed, kept, base};
}


/* ---------- pathway editor ---------- */

/* ---------- the breakdown ----------
   A stage total answers "how big is this meet". It does not answer "how many
   14-15 girls will be on the 3-metre board in the semi-final", which is the
   question that decides a timetable and an awards order. The projection
   already carries every cell; this shows it. */
const AGE_LBL = {A:'Group A', B:'Group B', C:'Group C', D:'Group D'};
const GEN_LBL = {B:'Boys', G:'Girls'};
const DIS_LBL = {'1':'1m', '3':'3m', P:'Platform'};

/* Which cells the panel is showing. A stage total is the sum of 24 separate
   competitions; the field an official runs and a diver stands in is one of
   them. Filtering to a single event and gender makes every number on the panel
   -- round sizes, per-stop loads, diver counts -- that competition's, not a
   figure nobody ever experiences. */
function focusCells(){
  return (!S.bdCell || S.bdCell === 'all') ? CELLS : [S.bdCell];
}
function focusLabel(){
  if (!S.bdCell || S.bdCell === 'all') return 'every event and age group';
  const c = S.bdCell;
  return `${AGE_LBL[c[0]]} ${GEN_LBL[c[1]]} ${DIS_LBL[c[2]]}`;
}

function renderPathwayBreakdown(res){
  if (!res) return '';
  const mode = S.bdMode || 'stop';
  const qual = (mode === 'qualified') ? projectPathway(false) : null;
  const src = qual || res;

  const cols = [];
  S.routing.forEach((lvl, L) => QR().roundsOf(lvl).forEach(r => {
    cols.push({L, key:r.key, name: tierName(L), round: QR().ROUND_NAME[r.key] || r.key,
               stops: groupCountAt(L)});
  }));

  /* Across every stop, and at a single one. The per-stop figure is the field a
     diver actually stands in and the session an official actually runs -- a
     total spread over three championships tells you neither. */
  const at = (c, cell) => {
    const f = src.field[c.L] && src.field[c.L][c.key];
    if (!f) return {tot:0, per:0, lo:0, hi:0};
    const vals = f.map(g => g[cell] || 0);
    const tot = vals.reduce((a,b)=>a+b, 0);
    const live = vals.filter(v => v > 0);
    return {tot, per: tot / Math.max(1, c.stops),
            lo: live.length ? Math.min(...live) : 0,
            hi: live.length ? Math.max(...live) : 0};
  };
  const show = (v) => {
    if (mode !== 'stop') return v.tot > 0.5 ? fmt(Math.round(v.tot)) : '<span class="bs-bd-0">·</span>';
    if (v.tot <= 0.5) return '<span class="bs-bd-0">·</span>';
    const spread = (v.hi - v.lo) > 1.5 && v.lo > 0
      ? `<span class="bs-bd-rng">${Math.round(v.lo)}–${Math.round(v.hi)}</span>` : '';
    return `${Math.round(v.per)}${spread}`;
  };
  const agg = (c, cells) => {
    const t = cells.reduce((s,cell) => s + at(c, cell).tot, 0);
    const lo = [], hi = [];
    const f = src.field[c.L] && src.field[c.L][c.key];
    if (f) f.forEach(g => { const n = cells.reduce((s,cell)=>s+(g[cell]||0),0); if (n>0){ lo.push(n); hi.push(n);} });
    return {tot:t, per:t/Math.max(1,c.stops), lo: lo.length?Math.min(...lo):0, hi: hi.length?Math.max(...hi):0};
  };

  const head = cols.map(c =>
    `<th class="num"><span class="bs-bd-l">${esc(c.name)}</span>${esc(c.round)}
      <span class="bs-bd-s">${c.stops} ${c.stops===1?'stop':'stops'}</span></th>`).join('');

  const body = ['A','B','C','D'].map(ag => {
    const mine = ['B','G'].flatMap(g => ['1','3','P'].map(d => ag+g+d));
    const sub = cols.map(c => `<td class="num">${show(agg(c, mine))}</td>`).join('');
    const rows = ['B','G'].flatMap(g => ['1','3','P'].map(d => {
      const cell = ag+g+d;
      const tds = cols.map(c => `<td class="num">${show(at(c, cell))}</td>`).join('');
      const on = (S.bdCell === cell) ? ' class="bs-bd-on"' : '';
      return `<tr${on}><td class="bs-bd-cell">${esc(GEN_LBL[g])} ${esc(DIS_LBL[d])}</td>${tds}</tr>`;
    })).join('');
    return `<tr class="bs-bd-grp"><td><b>${esc(AGE_LBL[ag])}</b></td>${sub}</tr>${rows}`;
  }).join('');

  const totals = cols.map(c => `<td class="num"><b>${show(agg(c, CELLS))}</b></td>`).join('');

  const note = mode === 'stop'
    ? 'One event at one meet &mdash; the field a diver stands in and the session an official runs. Where stops differ in size, the range is shown beside the average.'
    : mode === 'qualified'
      ? 'What the rules entitle athletes to, before take-up. Always higher than the field that turns up.'
      : 'Every stop of a stage added together. Useful for fees and totals, not for planning a session.';

  return `<div class="bs-bd">
    <div class="bs-bd-h">
      <b>Every event, every round</b>
      <div class="seg bs-bdseg">
        <button data-bd="stop" class="${mode==='stop'?'on':''}">At one stop</button>
        <button data-bd="total" class="${mode==='total'?'on':''}">All stops</button>
        <button data-bd="qualified" class="${mode==='qualified'?'on':''}">Qualified, before take-up</button>
      </div>
      <span class="note">${note}</span></div>
    <div class="bs-bd-scroll"><table class="bs-drill bs-bd-tbl">
      <thead><tr><th>Age group / event</th>${head}</tr></thead>
      <tbody>${body}<tr class="bs-bd-tot"><td><b>All events</b></td>${totals}</tr></tbody>
    </table></div>
  </div>`;
}


function renderPathwayShell(){
  const body = document.getElementById('bsBody');
  if (!body) return;
  body.innerHTML = `<div id="bsPathWrap"><div class="note">Working out the pathway&hellip;</div></div>`;
  refreshFlow();
}

const ROUND_CHOICES = ['prelim','quarter','semi','final'];

function renderPathway(){
  const wrap = document.getElementById('bsPathWrap');
  if (!wrap) return;
  if (!QR()){ wrap.innerHTML = '<div class="note">Pathway engine not loaded.</div>'; return; }
  if (!S.flow){ wrap.innerHTML = '<div class="note">Working out the pathway&hellip;</div>'; return; }
  const res = projectPathway();
  S.routeRes = res;
  const RN = QR().ROUND_NAME;
  const lvlOpts = (sel) => S.levels.map((l,i) =>
    `<option value="${i}" ${i===sel?'selected':''}>${esc(tierName(i))}</option>`).join('');
  const rndOpts = (sel) => ROUND_CHOICES.map(r =>
    `<option value="${r}" ${r===sel?'selected':''}>${esc(RN[r])}</option>`).join('');

  const levels = S.routing.map((lvl, L) => {
    const rounds = QR().roundsOf(lvl);
    const stops = groupCountAt(L);
    const roundRows = rounds.map(r => {
      const outs = (lvl.routes||[]).map((rt,ri)=>({rt,ri})).filter(x => x.rt.from === r.key);
      const size = QR().sizeAt(res, L, r.key, focusCells());
      let people = '';
      if (size > 0.5 && focusCells().length === 1){
        // Within one event an entry IS a diver. No estimation, no caveat.
        people = ` &middot; <b>${fmt(Math.round(size))} divers</b>`;
      } else if (S.mult && size > 0.5){
        const d = QR().diversAt(res, L, r.key, focusCells(), S.mult, multBasisFor(L));
        if (d && d.ok){
          people = ` &middot; <b>${fmt(Math.round(d.divers))} divers</b>` +
            (d.reliable ? '' :
              `<span class="bs-est" title="${esc(d.boards_dropped
                ? 'A board that is normally contested has no entries here, so the measured mix no longer describes this field.'
                : 'The boards disagree about how many people this is, which means the mix of events has moved away from what was measured.')}">estimate</span>`);
        }
      }
      const routes = outs.map(({rt,ri}) => `
        <div class="bs-route">
          <span class="bs-rt-lbl">places</span>
          <input class="bs-rt-in" type="number" min="1" max="200" data-rt="lo" data-l="${L}" data-i="${ri}" value="${rt.lo||1}">
          <span class="bs-rt-lbl">to</span>
          <input class="bs-rt-in" type="number" min="1" max="200" data-rt="hi" data-l="${L}" data-i="${ri}" value="${rt.hi==null?'':rt.hi}">
          <span class="bs-rt-arrow">&rarr;</span>
          <select class="sel bs-rt-sel" data-rt="lvl" data-l="${L}" data-i="${ri}">${lvlOpts(rt.to?rt.to.level:L)}</select>
          <select class="sel bs-rt-sel" data-rt="rnd" data-l="${L}" data-i="${ri}">${rndOpts(rt.to?rt.to.round:'prelim')}</select>
          <button class="bs-x" data-rtdel="${ri}" data-l="${L}" title="Remove this route">&times;</button>
        </div>`).join('');
      return `<div class="bs-round">
        <div class="bs-round-h"><b>${esc(RN[r.key]||r.key)}</b>
          <span class="bs-round-n"><b>${Math.round(size/Math.max(1,stops))}</b> per stop &middot; ${fmt(Math.round(size))} across ${stops} ${stops===1?'stop':'stops'}${people}</span>
          <button class="tab bs-mini" data-rndel="${esc(r.key)}" data-l="${L}" ${rounds.length<=1?'disabled':''}>remove round</button></div>
        ${routes || '<div class="note bs-rt-none">Nobody advances from here.</div>'}
        <button class="tab bs-mini bs-rtadd" data-l="${L}" data-r="${esc(r.key)}">+ add a route</button>
      </div>`;
    }).join('');
    const spare = ROUND_CHOICES.filter(k => !rounds.some(r=>r.key===k));
    return `<div class="bs-plevel">
      <div class="bs-plevel-h"><b>${esc(tierName(L))}</b>
        <span class="bs-round-n">${fmt(stops)} ${stops===1?'stop':'stops'}</span>
        ${spare.length ? `<select class="sel bs-mini bs-rndadd" data-l="${L}">
          <option value="">+ add round…</option>${spare.map(k=>`<option value="${k}">${esc(RN[k])}</option>`).join('')}</select>` : ''}
      </div>
      ${roundRows}
    </div>`;
  }).join('');

  const probs = (res.problems||[]).map(p =>
    `<li class="bs-prob ${p.kind==='gap'?'warn':'bad'}">${esc(p.level!=null?tierName(p.level)+': ':'')}${esc(p.msg)}</li>`).join('');

  wrap.innerHTML = `
    <div class="bs-adv-head">
      <span class="note">Places finishing a round, and where they go. Every route is a band of finishing
        positions &mdash; a band wider than the field simply sends fewer, the way a short field does today.</span>
      <label class="bs-focus">Showing
        <select class="sel" id="bsPathFocus">
          <option value="all" ${(!S.bdCell||S.bdCell==='all')?'selected':''}>every event and age group</option>
          ${['A','B','C','D'].map(a=>`<optgroup label="${esc(AGE_LBL[a])}">` +
            ['G','B'].map(g=>['1','3','P'].map(d=>{
              const c=a+g+d;
              return `<option value="${c}" ${S.bdCell===c?'selected':''}>${esc(AGE_LBL[a])} ${esc(GEN_LBL[g])} ${esc(DIS_LBL[d])}</option>`;
            }).join('')).join('') + '</optgroup>').join('')}
        </select></label>
      <button class="tab bs-mini" id="bsPathReset">Load current rules</button>
    </div>
    ${probs ? `<ul class="bs-probs">${probs}</ul>` : ''}
    ${levels}
    ${renderPathwayBreakdown(res)}
    ${(S.takeUp && S.takeUp.usable)
      ? `<p class="note" style="margin-top:12px">Entry counts include the take-up measured from
          <b>${esc(S.takeUp.basis)}</b> &mdash; the published rules qualify more athletes than turn up.
          Places are counted, never simulated: nothing here predicts who wins.</p>`
      : `<div class="ps-warn" style="margin-top:12px"><b>These are qualified places, not expected entries.</b>
          ${S.takeUp && S.takeUp.fallback
            ? 'No calibrated alignment could be loaded, so there is no measured take-up to apply — every figure here assumes every qualifier turns up, which never happens.'
            : 'Take-up could not be measured for this season, so every figure here assumes every qualifier turns up.'}
          Load the reference alignment on the map and reopen this panel to see expected entries instead.</div>`}
    <p class="note"><b>Entries are not people.</b> Athletes commonly contest two or three events, so entries tell you
      what a session costs and how long it runs, while divers tell you how many bodies need a lane, a bed and an award.
      Diver counts come from the share of athletes measured contesting each combination of boards, per age group and
      gender. Anything marked <i>estimate</i> means this pathway has moved the mix of events away from what was
      measured, so treat the headcount as indicative rather than a count.</p>`;
  wirePathway();
}

function wirePathway(){
  const P = document.getElementById('bsPathWrap');
  if (!P) return;
  const touch = () => { S.dirty = true; repaintAll(); renderPathway(); };

  P.querySelectorAll('.bs-rt-in').forEach(el => el.addEventListener('change', e => {
    pushUndo();
    const L = +e.target.dataset.l, i = +e.target.dataset.i, k = e.target.dataset.rt;
    const v = e.target.value === '' ? null : Math.max(1, Math.round(+e.target.value||1));
    S.routing[L].routes[i][k] = v;
    touch();
  }));
  P.querySelectorAll('.bs-rt-sel').forEach(el => el.addEventListener('change', e => {
    pushUndo();
    const L = +e.target.dataset.l, i = +e.target.dataset.i, rt = S.routing[L].routes[i];
    rt.to = rt.to || {level:L, round:'prelim'};
    if (e.target.dataset.rt === 'lvl') rt.to.level = +e.target.value;
    else rt.to.round = e.target.value;
    touch();
  }));
  P.querySelectorAll('[data-rtdel]').forEach(b => b.addEventListener('click', e => {
    pushUndo();
    const L = +e.currentTarget.dataset.l;
    S.routing[L].routes.splice(+e.currentTarget.dataset.rtdel, 1);
    touch();
  }));
  P.querySelectorAll('.bs-rtadd').forEach(b => b.addEventListener('click', e => {
    pushUndo();
    const L = +e.currentTarget.dataset.l, from = e.currentTarget.dataset.r;
    const existing = S.routing[L].routes.filter(r => r.from === from);
    const lo = existing.reduce((m,r) => Math.max(m, (r.hi==null?r.lo:r.hi) + 1), 1);
    const up = Math.min(L + 1, S.levels.length - 1);
    S.routing[L].routes.push({from, lo, hi: lo + 2,
      to:{level: up, round: QR().entryRound(S.routing[up])}});
    touch();
  }));
  P.querySelectorAll('.bs-rndadd').forEach(sel => sel.addEventListener('change', e => {
    if (!e.target.value) return;
    pushUndo();
    S.routing[+e.target.dataset.l].rounds.push({key: e.target.value});
    touch();
  }));
  P.querySelectorAll('[data-rndel]').forEach(b => b.addEventListener('click', e => {
    pushUndo();
    const L = +e.currentTarget.dataset.l, k = e.currentTarget.dataset.rndel;
    S.routing[L].rounds = S.routing[L].rounds.filter(r => r.key !== k);
    // Routes out of a round that no longer runs would be orphaned.
    S.routing[L].routes = S.routing[L].routes.filter(r => r.from !== k);
    touch();
  }));
  P.querySelectorAll('.bs-bdseg button').forEach(b => b.addEventListener('click', () => {
    S.bdMode = b.dataset.bd; renderPathway();
  }));
  const fc = document.getElementById('bsPathFocus');
  if (fc) fc.addEventListener('change', () => { S.bdCell = fc.value; renderPathway(); });
  const rs = document.getElementById('bsPathReset');
  if (rs) rs.addEventListener('click', () => {
    if (!confirm('Replace the whole pathway with the current published rules?')) return;
    pushUndo();
    S.routing = QR().defaultRouting(S.levels.length - 1, S.levels.length - 1);
    touch();
  });
}

function renderAdvShell(){
  const body = document.getElementById('bsBody');
  if (!body) return;
  const focusOpts = ['<option value="all">every event and age group</option>']
    .concat(CELLS.map(c=>`<option value="${c}" ${S.adv && S.adv.focus===c?'selected':''}>${esc(cellLabel(c))}</option>`))
    .join('');
  body.innerHTML = `
    <div class="bs-adv-head">
      <span class="bs-lvl">Show</span>
      <select class="sel" id="bsAdvFocus">${focusOpts}</select>
      <span class="note">Entries that actually competed, carried up the pathway by the published rules and the take-up measured from the season we ran.</span>
    </div>
    <div id="bsAdvResults"><div class="note">Working out the pathway&hellip;</div></div>`;
  wirePanelAdv();
}

function wirePanelAdv(){
  const f = document.getElementById('bsAdvFocus');
  if (f) f.addEventListener('change', ()=>{ S.adv = S.adv||{}; S.adv.focus = f.value; renderAdvResults(); });
}

/* Recompute the flow for the current map. Cheap after the first call: the
   calibration is derived once per season and cached inside JuniorFlow. */
let flowBusy = false, flowAgain = false;
async function refreshFlow(){
  if (flowBusy){ flowAgain = true; return; }   // painting fires this rapidly
  flowBusy = true;
  try { await doRefreshFlow(); }
  finally {
    flowBusy = false;
    if (flowAgain){ flowAgain = false; refreshFlow(); }
  }
}
async function doRefreshFlow(){
  if (!window.JuniorFlow){ S.flowErr = 'Pricing engine not loaded.'; renderAdvResults(); return; }
  try {
    await window.JuniorFlow.ready();
    await ensureMult();
    S.flow = window.JuniorFlow.compute({
      regions:S.regions, assign:S.assign, levels:S.levels,
      finalName:S.finalName, year:S.year,
    });
    S.flowErr = null;
  } catch(e){
    console.error(e); S.flow = null; S.flowErr = e.message || String(e);
  }
  if (S.panelMode === 'pathway') renderPathway(); else renderAdvResults();
}

function renderAdvResults(){
  const el = document.getElementById('bsAdvResults');
  if (!el) return;
  if (S.flowErr){
    el.innerHTML = `<div class="note"><b>Could not work out the pathway.</b> ${esc(S.flowErr)}</div>`;
    return;
  }
  if (!S.flow){ el.innerHTML = '<div class="note">Working out the pathway&hellip;</div>'; return; }

  const JF = window.JuniorFlow;
  const focus = (S.adv && S.adv.focus) || 'all';
  const cellSum = row => focus==='all'
    ? CELLS.reduce((s,c)=>s+(row[c]||0), 0)
    : (row[focus]||0);

  const i = Math.min(S.tierView, S.flow.levels.length-1);
  const TG = tierGroupsAt(i);
  const rowsAtLevel = S.flow.levels[i] ? S.flow.levels[i].rows : [];
  const totals = TG.groups.map((_,gi)=>cellSum(rowsAtLevel[gi]||{}));
  const grand = totals.reduce((s,x)=>s+x,0);
  const nFrom = TG.groups.length;
  const equal = nFrom>0 ? 100/nFrom : 0;
  const maxT = Math.max(1, ...totals);

  const body = TG.groups.map((g,gi)=>{
    const pool = totals[gi];
    const share = grand>0 ? 100*pool/grand : 0;
    const diff = share - equal;
    const bar = Math.max(2, Math.round(100*pool/maxT));
    const diffCls = Math.abs(diff) < equal*0.15 ? 'ok' : (diff>0 ? 'over' : 'under');
    return `<tr>
      <td><span class="sw" style="background:${tierColorAt(i,gi)}"></span><b>${esc(g.name)}</b></td>
      <td class="num">${fmt(Math.round(pool))}</td>
      <td><span class="bs-bar"><i style="width:${bar}%;background:${tierColorAt(i,gi)}"></i></span></td>
      <td class="num">${share.toFixed(1)}%</td>
      <td class="num ${diffCls}">${diff>=0?'+':''}${diff.toFixed(1)} pp</td>
    </tr>`;
  }).join('');

  const spread = totals.length>1 && grand>0
    ? (100*Math.max(...totals)/grand - 100*Math.min(...totals)/grand) : 0;
  const spreadCls = spread <= equal*0.30 ? 'ok' : (spread <= equal*0.60 ? 'over' : 'under');

  // Pipeline across every level, from real entries.
  const pipe = S.flow.levels.map((l,j)=>{
    const n = l.rows.reduce((s,r)=>s+cellSum(r), 0);
    const stops = l.rows.length;
    const tag = l.source==='observed' ? 'measured'
              : l.source==='calibrated' ? 'measured' : 'projected';
    return `<div class="bs-pipe-card">
      <span class="bs-pipe-nm">${esc(tierName(j))}</span>
      <span class="bs-pipe-big">${fmt(Math.round(n))}</span>
      <span class="bs-lg-sub">${stops} ${stops===1?'stop':'stops'} &middot; ${Math.round(n/Math.max(1,stops))} per stop &middot; ${tag}</span>
    </div>`;
  }).join('');
  const ffTotal = focus==='all'
    ? CELLS.reduce((s,c)=>s+(S.flow.final[c]||0),0)
    : (S.flow.final[focus]||0);

  const byEvent = DISCS.map(d=>{
    const n = CELLS.filter(c=>c[2]===d.k).reduce((s,c)=>s+(S.flow.final[c]||0),0);
    return `<span class="bs-ev"><b>${fmt(Math.round(n))}</b> ${d.label}</span>`;
  }).join('');
  const byAge = AGES.map(a=>{
    const n = CELLS.filter(c=>c[0]===a.k).reduce((s,c)=>s+(S.flow.final[c]||0),0);
    return `<span class="bs-ev"><b>${fmt(Math.round(n))}</b> ${a.label}</span>`;
  }).join('');

  // Take-up, straight from the calibration decomposition.
  const takeup = (S.flow.calib||[]).map(k=>{
    if (!k.wasObserved || k.rules<=0) return '';
    const pct = k.conv/k.rules*100;
    const word = k.conv < 0 ? 'do not take up their place' : 'added by clearing the score bar';
    return `<span class="bs-ev"><b>${pct>=0?'+':''}${pct.toFixed(0)}%</b> into ${esc(k.name)} &mdash; ${word}</span>`;
  }).filter(Boolean).join('');

  const base = JF && JF.baseline ? JF.baseline() : null;
  const cov = S.advData && S.advData.totals && S.advData.totals[(S.year==='y25'?'2025':'2026')+'|Regionals'];

  el.innerHTML = `
    <div class="bs-pipe">${pipe}
      <div class="bs-pipe-card final">
        <span class="bs-pipe-nm">${esc(S.finalName)} field</span>
        <span class="bs-pipe-big">${fmt(Math.round(ffTotal))}</span>
        <span class="bs-lg-sub">places created by this map</span>
      </div>
    </div>
    <div class="bs-evrow"><span class="bs-evh">By event</span>${byEvent}</div>
    <div class="bs-evrow"><span class="bs-evh">By age group</span>${byAge}</div>
    ${takeup?`<div class="bs-evrow"><span class="bs-evh">Take-up</span>${takeup}</div>`:''}
    <table class="bs-drill"><thead><tr>
      <th>${esc(tierName(i))}</th><th class="num">Competing here</th><th></th>
      <th class="num">Share</th><th class="num">vs even split</th>
    </tr></thead><tbody>${body}</tbody></table>
    <div class="bs-spread ${spreadCls}">Widest gap between ${esc(tierName(i))}: <b>${spread.toFixed(1)} percentage points</b>
      ${spread <= equal*0.30 ? '&mdash; evenly balanced.' : (spread <= equal*0.60 ? '&mdash; somewhat uneven.' : '&mdash; markedly uneven.')}</div>
    <p class="note" style="margin-top:10px">
      Entries are athletes who actually competed, not registered members. Levels marked <b>measured</b> reconcile
      to real entry data on the alignment that season was run under; <b>projected</b> levels have no results behind
      them and follow the rules alone. Take-up and score-bar behaviour are held fixed from that alignment while you
      redraw &mdash; re-measuring them on every map would let them absorb your change and nothing would ever appear to move.
      ${base?`Behaviour measured on <b>${esc(base.name)}</b>.`:''}
      ${cov?`${fmt(cov.mapped)} of ${fmt(cov.total)} entries carry a mappable address (${(100*cov.mapped/cov.total).toFixed(1)}%).`:''}
      Changing the qualifier counts themselves is done in Pricing Studio.
    </p>`;
}

function tierColorAt(level, gi){
  if (level===0) return (S.regions[gi] && S.regions[gi].color) || UNASSIGNED_BASE;
  const ramp = RAMPS[(level-1) % RAMPS.length];
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
    lgEl.innerHTML = `<div class="bs-lg-head"><b>${esc(tierLabel)}</b> &mdash; ${esc(poolLabel)} by event</div>${key}<div class="bs-lg-cards age">${cards}</div>`;
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
    S._pre = snapshot();           // one undo step per stroke, not per county
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
  const stop = ()=>{
    if (S.painting && S._pre){
      if (!sameAssign(S._pre.assign, S.assign)){
        S.undo.push(S._pre); if (S.undo.length>50) S.undo.shift();
        S.redo.length = 0; S._uKey = null;
        refreshHistoryButtons();
      }
      S._pre = null;
    }
    S.painting=false; panStart=null;
  };
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
  bind('bsModeAdv',   ()=>{S.panelMode='advance'; renderPanel(); refreshFlow();});
  bind('bsModePath',  ()=>{S.panelMode='pathway'; renderPanel(); refreshFlow();});

  P.querySelectorAll('#bsTierSeg [data-tierv]').forEach(b=>b.addEventListener('click',()=>{
    S.tierView = +b.dataset.tierv; S.detailRegion=null; repaintAll(); renderPanel();
  }));
  bind('bsAddLevel', ()=>{
    if (levelCount() >= MAX_LEVELS) return;
    pushUndo();
    const below = groupCountAt(levelCount()-1);
    const n = Math.max(1, Math.ceil(below/2));
    S.levels.push({name:'Level '+(levelCount()+1),
      groups:Array.from({length:n},(_,i)=>({name:'Group '+(i+1)})),
      of:Array.from({length:below},(_,i)=>Math.min(Math.floor(i/2), n-1))});
    S.adv.steps.push({a:{},d:{}});
    syncLevels(); S.dirty=true; repaintAll(); renderPanel();
  });
  bind('bsRemLevel', ()=>{
    if (levelCount() <= 1) return;
    pushUndo();
    S.levels.pop();
    if (S.tierView >= levelCount()) S.tierView = levelCount()-1;
    if ((S.adv.step||0) >= levelCount()) S.adv.step = levelCount()-1;
    syncLevels(); S.dirty=true; repaintAll(); renderPanel();
  });
  P.querySelectorAll('#bsAdvSteps [data-step]').forEach(b=>b.addEventListener('click',()=>{
    S.adv.step = +b.dataset.step;
    P.querySelectorAll('#bsAdvSteps [data-step]').forEach(x=>x.classList.toggle('on', +x.dataset.step===S.adv.step));
    renderAdvResults();
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
      pushUndo(sel + (inp.dataset.lvl||'') + ':' + (inp.dataset.gi||''));
      refreshHistoryButtons();
      apply(inp);
      S.dirty = true;
      clearTimeout(S._nameT);
      S._nameT = setTimeout(renderNumbers, 200);
    }));
  };
  nameBind('.bs-gname', inp=>{
    const lvl = +inp.dataset.lvl, gi = +inp.dataset.gi, v = inp.value;
    if (lvl===0){
      S.regions[gi].name = v;
      const chip = P.querySelector(`.bs-chip[data-ri="${gi}"] .chip-lbl`);
      if (chip) chip.textContent = v;
    } else {
      S.levels[lvl].groups[gi].name = v;
      P.querySelectorAll(`.bs-psel[data-lvl="${lvl}"] option[value="${gi}"]`).forEach(o=>o.textContent = v);
    }
    // the same group can appear in two columns; keep them in step
    P.querySelectorAll(`.bs-gname[data-lvl="${lvl}"][data-gi="${gi}"]`).forEach(o=>{ if(o!==inp) o.value = v; });
  });
  nameBind('.bs-lvlname', inp=>{
    const lvl = +inp.dataset.lvl;
    S.levels[lvl].name = inp.value;
    const tb = P.querySelector(`#bsTierSeg [data-tierv="${lvl}"]`);
    if (tb) tb.textContent = inp.value;
  });
  /* Renaming the level renames the areas under it -- but on commit, not on
     every keystroke, or typing "Zones" would march the areas through
     "Z 1", "Zo 1", "Zon 1". Names you chose yourself are left alone. */
  P.querySelectorAll('.bs-lvlname').forEach(inp => inp.addEventListener('change', ()=>{
    const lvl = +inp.dataset.lvl;
    const r = renumberAreas(lvl, false);
    if (!r.renamed) return;
    S.dirty = true;
    syncLevels(); repaintAll(); renderPanel();
    const n = areasAtLevel(lvl).length;
    msg(`Renamed ${r.renamed} area${r.renamed===1?'':'s'} to ` +
        (n === 1 ? r.base : `${r.base} 1–${n}`) +
        (r.kept ? ` · kept ${r.kept} you named yourself` : ''));
  }));
  P.querySelectorAll('.bs-renum').forEach(b => b.addEventListener('click', ()=>{
    const lvl = +b.dataset.lvl;
    const base = singulariseLevel(tierName(lvl));
    if (!base){
      msg(`"${tierName(lvl)}" is not a plural name to number from — try something like "Zones".`);
      return;
    }
    const areas = areasAtLevel(lvl);
    const custom = areas.filter(g => !looksGenerated(g.name)).map(g => g.name);
    // Forcing overwrites deliberate names, so say exactly which ones first.
    if (custom.length && !confirm(
        `Rename all ${areas.length} areas to ${base} 1–${areas.length}?\n\n` +
        `This will overwrite ${custom.length} name${custom.length===1?'':'s'} you chose: ` +
        custom.slice(0,6).join(', ') + (custom.length>6 ? ', …' : ''))) return;
    pushUndo();
    const r = renumberAreas(lvl, true);
    S.dirty = true;
    syncLevels(); repaintAll(); renderPanel();
    msg(`Renamed ${r.renamed} area${r.renamed===1?'':'s'} to ${base} 1–${areas.length}`);
  }));
  const fin = document.getElementById('bsFinalName');
  if (fin) fin.addEventListener('input', ()=>{
    pushUndo('finalName');
    refreshHistoryButtons();
    S.finalName = fin.value; S.dirty=true;
    clearTimeout(S._nameT); S._nameT = setTimeout(renderNumbers, 200);
  });

  P.querySelectorAll('.bs-psel').forEach(sel=>sel.addEventListener('change',()=>{
    pushUndo();
    S.levels[+sel.dataset.lvl].of[+sel.dataset.gi] = +sel.value;
    S.dirty=true; repaintAll(); renderPanel();
  }));
  P.querySelectorAll('.bs-addgrp').forEach(b=>b.addEventListener('click',()=>{
    pushUndo();
    const k = +b.dataset.lvl;
    S.levels[k].groups.push({name:'Group '+(S.levels[k].groups.length+1)});
    syncLevels(); S.dirty=true; repaintAll(); renderPanel();
  }));
  P.querySelectorAll('.bs-remgrp').forEach(b=>b.addEventListener('click',()=>{
    const k = +b.dataset.lvl;
    if (S.levels[k].groups.length<=1) return;
    pushUndo();
    S.levels[k].groups.pop();
    syncLevels(); S.dirty=true; repaintAll(); renderPanel();
  }));

  P.querySelectorAll('.bs-chip[data-ri]').forEach(ch=>ch.addEventListener('click',()=>{
    S.active = +ch.dataset.ri;
    P.querySelectorAll('.bs-chip[data-ri]').forEach(x=>x.classList.toggle('on', +x.dataset.ri===S.active));
  }));
  bind('bsAddRegion', ()=>{
    pushUndo();
    S.regions.push({name:'Region '+(S.regions.length+1), color:PALETTE[S.regions.length%PALETTE.length]});
    syncLevels(); S.dirty=true; renderPanel();
  });
  bind('bsUndo', doUndo);
  bind('bsRedo', doRedo);
  P.querySelectorAll('[data-delarea]').forEach(b=>b.addEventListener('click', e=>{
    e.preventDefault();
    removeArea(+b.dataset.delarea, null);
  }));
  P.querySelectorAll('[data-pal]').forEach(b=>b.addEventListener('click', e=>{
    e.preventDefault();
    const i = +b.dataset.pal;
    S.palOpen = (S.palOpen===i) ? null : i;
    renderPanel();
  }));
  P.querySelectorAll('[data-setcol]').forEach(b=>b.addEventListener('click', e=>{
    e.preventDefault();
    pushUndo();
    S.regions[+b.dataset.setcol].color = b.dataset.col;
    S.palOpen = null; S.dirty=true; repaintAll(); renderPanel();
  }));
  const mf = document.getElementById('bsMergeFrom'), mt = document.getElementById('bsMergeTo');
  if (mf) mf.addEventListener('change', ()=>{ S.mergeFrom = +mf.value; });
  if (mt) mt.addEventListener('change', ()=>{ S.mergeTo = +mt.value; });
  bind('bsMergeGo', ()=>{
    if (S.regions.length<=1) return;
    if (S.mergeFrom === S.mergeTo){ msg('Pick two different areas to combine.'); return; }
    const a = S.regions[S.mergeFrom] && S.regions[S.mergeFrom].name;
    const b = S.regions[S.mergeTo] && S.regions[S.mergeTo].name;
    removeArea(S.mergeFrom, S.mergeTo);
    msg(`Combined ${a} into ${b}.`);
  });
  const nameI = document.getElementById('bsName');
  nameI.addEventListener('input', ()=>{ S.scenarioName = nameI.value; S.dirty=true; });
  bind('bsSave', ()=>saveScenario(false));
  bind('bsSaveNew', ()=>saveScenario(true));
  bind('bsDelete', deleteScenario);
  const cmp = document.getElementById('bsCompare');
  if (cmp) cmp.addEventListener('change', ()=>{ if (cmp.value) loadCompare(cmp.value); });
  bind('bsCompareOff', ()=>{ S.compare=null; renderPanel(); });
  bind('bsNew', ()=>{
    if (S.dirty && !confirm('Discard unsaved changes and start a new scenario?')) return;
    pushUndo();
    S.assign={}; S.regions=defaultRegions(12); S.levels=null; S.adv=defaultAdv();
    S.finalName='Junior Nationals'; S.compare=null;
    syncLevels(); S.active=0; S.scenarioId=null; S.scenarioName=''; S.detailRegion=null; S.dirty=false; S.tierView=0;
    repaintAll(); renderPanel();
  });
  bind('bsCsv', exportCsv);
  bind('bsCsvAdv', exportAdvCsv);
  const loadSel = document.getElementById('bsLoad');
  loadSel.addEventListener('change', ()=>{ if (loadSel.value) loadScenario(loadSel.value); });
}

/* ---------- persistence ---------- */
function msg(t){ const m=document.getElementById('bsMsg'); if(m){ m.textContent=t; setTimeout(()=>{ if(m.textContent===t) m.textContent=''; }, 4000);} }

function newScenarioId(){
  return 'bs-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
}

async function saveScenario(asNew){
  if (!S.scenarioName.trim()){ msg('Give the scenario a name first.'); return; }
  // Reference maps are never overwritten — saving one forks it instead.
  const forking = asNew || !S.scenarioId || isSeed(S.scenarioId);
  if (forking){
    S.scenarioId = newScenarioId();
    if (isSeed(S.scenarioId)) S.scenarioId = newScenarioId();
    const base = S.scenarioName.trim();
    if (asNew || /^(Official 2026 Alignment|Current 2026 Alignment)/.test(base)){
      S.scenarioName = base.replace(/ \(copy( \d+)?\)$/, '') + ' (copy)';
    }
  }
  syncLevels();
  const data = JSON.stringify({regions:S.regions, assign:S.assign, year:S.year, routing:S.routing,
    levels:S.levels, finalName:S.finalName, adv:S.adv, v:4});
  try {
    await NEON.query(
      `INSERT INTO membership.boundary_scenarios (id, name, data) VALUES ($1,$2,$3::jsonb)
       ON CONFLICT (id) DO UPDATE SET name=$2, data=$3::jsonb, updated_at=now()`,
      [S.scenarioId, S.scenarioName.trim(), data]);
    S.dirty = false;
    scenarioListCache = null;
    msg((forking ? 'Saved a new scenario "' : 'Saved "') + S.scenarioName.trim() + '" to cloud.');
    renderPanel();
  } catch(e){ console.error(e); msg('Save failed: ' + (e.message||e)); }
}

async function deleteScenario(){
  if (!S.scenarioId || isSeed(S.scenarioId)){ msg('Reference maps cannot be deleted.'); return; }
  if (!confirm('Delete "' + S.scenarioName + '" permanently?')) return;
  try {
    await NEON.query('DELETE FROM membership.boundary_scenarios WHERE id=$1', [S.scenarioId]);
    scenarioListCache = null;
    msg('Deleted "' + S.scenarioName + '".');
    S.scenarioId = null; S.scenarioName = ''; S.dirty = true;
    renderPanel();
  } catch(e){ console.error(e); msg('Delete failed: ' + (e.message||e)); }
}

async function loadCompare(id){
  try {
    const res = await NEON.query('SELECT name, data FROM membership.boundary_scenarios WHERE id=$1', [id]);
    if (!res.rows.length){ msg('Scenario not found.'); return; }
    const row = res.rows[0];
    const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    S.compare = {id, name: row.name, assign: d.assign || {}, regions: d.regions || []};
    renderPanel();
  } catch(e){ console.error(e); msg('Compare failed: ' + (e.message||e)); }
}

let scenarioListCache = null;
async function loadScenarioList(){
  try {
    if (!scenarioListCache || scenarioListCache.t < Date.now()-15000){
      const res = await NEON.query(`SELECT id, name, to_char(updated_at,'Mon DD HH24:MI') u FROM membership.boundary_scenarios ORDER BY updated_at DESC LIMIT 50`);
      scenarioListCache = {t: Date.now(), rows: res.rows};
    }
    const sel = document.getElementById('bsLoad');
    if (sel){
      const cur = sel.value;
      sel.innerHTML = '<option value="">Load scenario&hellip;</option>' +
        scenarioListCache.rows.map(r=>`<option value="${esc(r.id)}" ${r.id===S.scenarioId?'selected':''}>${esc(r.name)} (${esc(r.u)})</option>`).join('');
      if (cur && !S.scenarioId) sel.value = cur;
    }
    const csel = document.getElementById('bsCompare');
    if (csel){
      csel.innerHTML = '<option value="">nothing&hellip;</option>' +
        scenarioListCache.rows.filter(r=>r.id!==S.scenarioId)
          .map(r=>`<option value="${esc(r.id)}" ${S.compare&&S.compare.id===r.id?'selected':''}>${esc(r.name)}</option>`).join('');
    }
  } catch(e){ /* silent */ }
}

// v2/v3 stored a fixed three-tier shape ({zones, zoneOf, ewc, ewcOf} + tierNames +
// tierCount). v4 stores an arbitrary levels array. Bring the old ones forward.
function migrateLevels(d, nRegions){
  if (Array.isArray(d.levels) && d.levels.length) return d.levels;
  const names = (d.tierNames && d.tierNames.length) ? d.tierNames : ['Regions','Zones','E / W / C'];
  const depth = [1,2,3].includes(d.tierCount) ? d.tierCount : 3;
  const t = d.tiers || {};
  const out = [{name:names[0] || 'Regions'}];
  if (depth>1) out.push({name:names[1] || 'Zones',
    groups:(t.zones && t.zones.length ? t.zones : [{name:'Zone A'}]).map(z=>({name:z.name})),
    of:(t.zoneOf || []).slice()});
  if (depth>2) out.push({name:names[2] || 'E / W / C',
    groups:(t.ewc && t.ewc.length ? t.ewc : [{name:'East'}]).map(e=>({name:e.name})),
    of:(t.ewcOf || []).slice()});
  return out.length ? out : defaultLevels(nRegions);
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
    S.routing = (d.routing && d.routing.length) ? d.routing : null;   // null -> rebuilt from the current rules
    syncRouting();
    S.levels = migrateLevels(d, S.regions.length);
    S.finalName = d.finalName || 'Junior Nationals';
    S.adv = d.adv && d.adv.steps ? d.adv : defaultAdv();
    if (!S.adv.focus) S.adv.focus = 'all';
    if (!S.adv.pool) S.adv.pool = '2026|Zones';
    syncLevels();
    S.scenarioId = id; S.scenarioName = row.name; S.active = 0; S.detailRegion = null; S.dirty = false;
    S.undo.length = 0; S.redo.length = 0; S.palOpen = null;
    if (S.compare && S.compare.id === id) S.compare = null;
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
  if (!S.flow){ msg('Open "Who moves up" first so the pathway is worked out.'); return; }
  const q = v => `"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const lines = ['level,group,age_group,gender,event,entries_competing,provenance'];
  S.flow.levels.forEach((l,i)=>{
    const TG = tierGroupsAt(i);
    TG.groups.forEach((g,gi)=>{
      const row = l.rows[gi] || {};
      CELLS.forEach(c=>{
        lines.push([q(tierName(i)), q(g.name),
          AGES.find(a=>a.k===c[0]).label, GENS.find(x=>x.k===c[1]).label, DISCS.find(d=>d.k===c[2]).label,
          Math.round(row[c]||0), l.source].join(','));
      });
    });
  });
  lines.push('');
  lines.push(`${q(S.finalName + ' field')},,age_group,gender,event,entries,`);
  CELLS.forEach(c=>lines.push([q(S.finalName), '',
    AGES.find(a=>a.k===c[0]).label, GENS.find(x=>x.k===c[1]).label, DISCS.find(d=>d.k===c[2]).label,
    Math.round(S.flow.final[c]||0), ''].join(',')));
  lines.push('');
  (S.flow.calib||[]).forEach(k=>lines.push([q('take-up into '+k.name), '', '', '', '',
    Math.round(k.conv), k.wasObserved?'measured':'projected'].join(',')));
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
/* ============================================================================
   AUTO-ASSIGN — partition the country into N contiguous, membership-balanced
   areas.

   Approach: capacity-constrained multi-source region growing.
     1. Seeds are chosen far apart but weighted toward member density, so areas
        form where the members actually are (deterministic — no random seed, so
        the same inputs always produce the same map).
     2. Every area grows outward along the real county adjacency graph. At each
        step the area furthest below its quota gets to take the next county,
        which balances membership while contiguity is guaranteed by construction
        (an area only ever absorbs a county touching it).
     3. A refinement pass trades border counties between an over-full area and
        an adjacent under-full one, rejecting any swap that would break the
        donor into disconnected pieces.

   Counties with no members still get assigned, so the map has no holes; they
   carry zero weight and so cannot distort the balance.

   Returns {assign, stats, iterations} where assign is a county-index -> area
   index array ready to drop into S.assign.
   ========================================================================== */
function autoAssign(A, weights, N, opts){
  opts = opts || {};
  const n = A.fips.length;
  const adj = A.adj, cx = A.cx, cy = A.cy;
  const W = weights;                      // county index -> weight (members)
  const total = W.reduce((a,b)=>a+b, 0);
  const target = total / N;
  const dist2 = (i,j) => { const dx=cx[i]-cx[j], dy=cy[i]-cy[j]; return dx*dx+dy*dy; };

  /* ---- 1. seeds: weighted farthest-point, deterministic ---- */
  const seeds = [];
  let first = 0;
  for (let i=1;i<n;i++) if (W[i] > W[first]) first = i;
  seeds.push(first);
  const near = new Float64Array(n);
  for (let i=0;i<n;i++) near[i] = dist2(i, first);
  while (seeds.length < N){
    let best = -1, bestScore = -1;
    for (let i=0;i<n;i++){
      if (seeds.indexOf(i) >= 0) continue;
      // Distance dominates (keeps seeds spread); weight breaks ties toward
      // populated counties so empty rural areas don't become area centres.
      const score = near[i] * (1 + W[i]);
      if (score > bestScore){ bestScore = score; best = i; }
    }
    if (best < 0) break;
    seeds.push(best);
    for (let i=0;i<n;i++){ const d = dist2(i, best); if (d < near[i]) near[i] = d; }
  }

  /* ---- 2. capacity-constrained growth ---- */
  const assign = new Int32Array(n).fill(-1);
  const wsum = new Float64Array(N);
  const sx = new Float64Array(N), sy = new Float64Array(N), cnt = new Int32Array(N);
  const frontier = [];                     // per area: Set of candidate counties
  for (let r=0;r<N;r++){
    const s = seeds[r];
    assign[s] = r; wsum[r] = W[s];
    sx[r] = cx[s]; sy[r] = cy[s]; cnt[r] = 1;
    frontier.push(new Set(adj[s].filter(j => assign[j] < 0)));
  }
  let placed = N;
  while (placed < n){
    // The area furthest below quota goes first. Areas with an empty frontier
    // are skipped; if every frontier is empty but counties remain, the
    // leftovers are attached to the nearest area (cannot happen on a connected
    // graph, but the guard keeps the map hole-free regardless).
    let pick = -1, worst = Infinity;
    for (let r=0;r<N;r++){
      if (!frontier[r].size) continue;
      const fill = target > 0 ? wsum[r]/target : cnt[r];
      if (fill < worst){ worst = fill; pick = r; }
    }
    if (pick < 0){
      for (let i=0;i<n;i++){
        if (assign[i] >= 0) continue;
        let br = 0, bd = Infinity;
        for (let r=0;r<N;r++){
          const dx = cx[i]-sx[r]/cnt[r], dy = cy[i]-sy[r]/cnt[r];
          const d = dx*dx+dy*dy;
          if (d < bd){ bd = d; br = r; }
        }
        assign[i] = br; wsum[br] += W[i]; cnt[br]++; placed++;
      }
      break;
    }
    // Within that area, take the candidate closest to its current centre so
    // areas stay compact rather than growing in tendrils.
    const mx = sx[pick]/cnt[pick], my = sy[pick]/cnt[pick];
    let bestC = -1, bestD = Infinity;
    for (const j of frontier[pick]){
      if (assign[j] >= 0){ frontier[pick].delete(j); continue; }
      const dx = cx[j]-mx, dy = cy[j]-my;
      const d = dx*dx + dy*dy;
      if (d < bestD){ bestD = d; bestC = j; }
    }
    if (bestC < 0) continue;
    assign[bestC] = pick; wsum[pick] += W[bestC];
    sx[pick] += cx[bestC]; sy[pick] += cy[bestC]; cnt[pick]++;
    placed++;
    frontier[pick].delete(bestC);
    for (const j of adj[bestC]) if (assign[j] < 0) frontier[pick].add(j);
    for (let r=0;r<N;r++) if (r !== pick) frontier[r].delete(bestC);
  }

  /* ---- 3. refinement: trade border counties, never breaking contiguity ---- */
  const members = () => {
    const m = Array.from({length:N}, ()=>[]);
    for (let i=0;i<n;i++) if (assign[i] >= 0) m[assign[i]].push(i);
    return m;
  };
  const stillConnected = (list, drop) => {
    const set = new Set(list); set.delete(drop);
    if (!set.size) return false;
    const start = set.values().next().value;
    const seen = new Set([start]); const stack = [start];
    while (stack.length){
      const u = stack.pop();
      for (const v of adj[u]) if (set.has(v) && !seen.has(v)){ seen.add(v); stack.push(v); }
    }
    return seen.size === set.size;
  };
  const spread = () => {
    const mean = total/N;
    if (mean <= 0) return 0;
    let s = 0; for (let r=0;r<N;r++) s += (wsum[r]-mean)*(wsum[r]-mean);
    return Math.sqrt(s/N)/mean;
  };

  /* Local search over every border county, not just the single most-over /
     most-under pair -- those two areas are frequently not adjacent, which
     previously caused the refinement to give up immediately. Moves are ranked
     by how much they reduce the sum of squared deviations from the target, and
     the best one that keeps the donor area in one piece is applied. */
  const mean0 = total/N;
  const dev = r => (wsum[r]-mean0)*(wsum[r]-mean0);
  let iterations = 0;
  const maxIter = opts.maxIter || 600;
  for (; iterations < maxIter; iterations++){
    const moves = [];
    for (let i=0;i<n;i++){
      const from = assign[i];
      if (from < 0) continue;
      const cand = new Set();
      for (const j of adj[i]) if (assign[j] >= 0 && assign[j] !== from) cand.add(assign[j]);
      for (const to of cand){
        const before = dev(from) + dev(to);
        const wf = wsum[from] - W[i], wt = wsum[to] + W[i];
        const after = (wf-mean0)*(wf-mean0) + (wt-mean0)*(wt-mean0);
        const gain = before - after;
        if (gain > 1e-9) moves.push({i, from, to, gain});
      }
    }
    if (!moves.length) break;
    moves.sort((a,b)=>b.gain-a.gain);
    const M = members();
    let applied = null;
    for (const mv of moves){
      if (M[mv.from].length <= 1) continue;          // never empty an area
      if (!stillConnected(M[mv.from], mv.i)) continue;
      applied = mv; break;
    }
    if (!applied) break;
    assign[applied.i] = applied.to;
    wsum[applied.from] -= W[applied.i];
    wsum[applied.to]   += W[applied.i];
  }

  /* Safety net: if any area is still in more than one piece (possible in
     state-whole mode, where contiguity is enforced between states rather than
     between counties), every piece but the largest is handed to whichever
     neighbouring area it shares the most border with. */
  function repairContiguity(){
    let repaired = 0;
    for (let r=0;r<N;r++){
      const list = []; for (let i=0;i<n;i++) if (assign[i] === r) list.push(i);
      if (list.length < 2) continue;
      const set = new Set(list), pieces = [], seen = new Set();
      for (const s0 of list){
        if (seen.has(s0)) continue;
        const piece = [], stack = [s0]; seen.add(s0);
        while (stack.length){
          const u = stack.pop(); piece.push(u);
          for (const v of adj[u]) if (set.has(v) && !seen.has(v)){ seen.add(v); stack.push(v); }
        }
        pieces.push(piece);
      }
      if (pieces.length < 2) continue;
      pieces.sort((a,b)=>b.length-a.length);
      for (const piece of pieces.slice(1)){
        const touch = {};
        for (const i of piece) for (const j of adj[i]){
          const a2 = assign[j];
          if (a2 >= 0 && a2 !== r) touch[a2] = (touch[a2]||0) + 1;
        }
        const best = Object.keys(touch).sort((a,b)=>touch[b]-touch[a])[0];
        if (best === undefined) continue;
        const to = +best;
        for (const i of piece){ assign[i] = to; wsum[r] -= W[i]; wsum[to] += W[i]; }
        repaired++;
      }
    }
    return repaired;
  }
  const repaired = repairContiguity();

  const mean = total/N;
  const list = Array.from(wsum);
  const stats = {
    total, target: mean,
    min: Math.min(...list), max: Math.max(...list),
    ratio: Math.min(...list) > 0 ? Math.max(...list)/Math.min(...list) : Infinity,
    spread: spread(),
    counties: Array.from({length:N}, (_,r)=>{ let c=0; for(let i=0;i<n;i++) if(assign[i]===r) c++; return c; }),
    weights: list,
  };
  stats.repaired = repaired;
  return { assign: Array.from(assign), stats, iterations };
}

/* State-level variant: whole states are kept intact by collapsing the county
   graph to a state graph, partitioning that, then expanding back. Real
   governing-body maps often avoid splitting states, so this is offered as a
   mode rather than forced. */
function autoAssignStates(A, weights, N, opts){
  const n = A.fips.length;
  const states = [], sIdx = {};
  for (let i=0;i<n;i++){
    const st = A.st[i];
    if (sIdx[st] === undefined){ sIdx[st] = states.length; states.push(st); }
  }
  const S = states.length;
  const sw = new Float64Array(S), scx = new Float64Array(S), scy = new Float64Array(S), sc = new Int32Array(S);
  const sadj = Array.from({length:S}, ()=>new Set());
  for (let i=0;i<n;i++){
    const a = sIdx[A.st[i]];
    sw[a] += weights[i]; scx[a] += A.cx[i]; scy[a] += A.cy[i]; sc[a]++;
    for (const j of A.adj[i]){
      const b = sIdx[A.st[j]];
      if (a !== b){ sadj[a].add(b); sadj[b].add(a); }
    }
  }
  const SA = {
    fips: states, st: states,
    cx: Array.from({length:S}, (_,i)=>scx[i]/sc[i]),
    cy: Array.from({length:S}, (_,i)=>scy[i]/sc[i]),
    adj: sadj.map(s=>Array.from(s)),
  };
  const res = autoAssign(SA, Array.from(sw), Math.min(N, S), opts);
  const assign = new Array(n);
  for (let i=0;i<n;i++) assign[i] = res.assign[sIdx[A.st[i]]];
  return { assign, stats: res.stats, iterations: res.iterations, byState: true };
}


/* ============================================================================
   SMART AUTO-ASSIGN — multi-objective boundary optimiser.

   Equal member counts alone is the wrong target. A split can be perfectly even
   and still be unusable: an area stretching Montana to Texas, or one with 400
   members but only nine Group C girls, is not a workable competitive area. So
   this optimises four things at once, each normalised to 0..1 (lower better)
   and weighted by what the user says matters:

     BALANCE     how evenly members are shared (spread around the average)
     TRAVEL      member-weighted average distance to the area's centre. Weighted
                 by members, because 500 people driving 100 miles is a bigger
                 burden than 5 people driving 300.
     VIABILITY   whether every area has enough athletes in EVERY junior age
                 group to actually run its events. A shortfall in one age group
                 is a broken event, invisible in the headline total.
     CONTINUITY  how many members change area versus today. A proposal that
                 moves everyone is politically dead however elegant it is.

   Alaska and Hawaii sit in projection insets, so their map positions carry no
   real distance. They are excluded from TRAVEL (their athletes fly regardless)
   but still count fully toward balance and viability.

   Search is deterministic multi-start: several different seedings are grown and
   polished, and the best-scoring result wins. Same inputs always give the same
   map, so a result can be reproduced and argued about.
   ========================================================================== */

/* ============================================================================
   SMART AUTO-ASSIGN — multi-objective boundary optimiser.

   Equal member counts alone is the wrong target. A split can be perfectly even
   and still be unusable: an area stretching Montana to Texas, or one with 400
   members but only nine Group C girls, is not a workable competitive area. So
   this optimises four things at once, each normalised to 0..1 (lower better)
   and weighted by what the user says matters:

     BALANCE     how evenly members are shared (spread around the average)
     TRAVEL      member-weighted average distance to the area's centre. Weighted
                 by members, because 500 people driving 100 miles is a bigger
                 burden than 5 people driving 300.
     VIABILITY   whether every area has enough athletes in EVERY junior age
                 group to actually run its events. A shortfall in one age group
                 is a broken event, invisible in the headline total.
     CONTINUITY  how many members change area versus today. A proposal that
                 moves everyone is politically dead however elegant it is.

   Alaska and Hawaii sit in projection insets, so their map positions carry no
   real distance. They are excluded from TRAVEL (their athletes fly regardless)
   but still count fully toward balance and viability.

   Search is deterministic multi-start: several different seedings are grown and
   polished, and the best-scoring result wins. Same inputs always give the same
   map, so a result can be reproduced and argued about.
   ========================================================================== */

const MI_PER_UNIT = 3.1;      // calibrated against known county-pair distances
const TRAVEL_REF  = 250;      // miles; normalisation reference, not a limit

function smartAssign(A, ctx, N, opts){
  opts = opts || {};
  const n = A.fips.length, adj = A.adj, cx = A.cx, cy = A.cy;
  const W  = ctx.weights;                       // balance weight (members or athletes)
  const AG = ctx.ages || null;                  // [i] -> [D,C,B,A] junior athletes
  const base = ctx.baseline || null;            // [i] -> area index, or null
  const locked = ctx.locked || null;            // [i] -> true if pinned in place
  const insular = A.st.map(s => s === 'AK' || s === 'HI');

  /* Host sites. Travel to an area's mathematical centre is a poor proxy: the
     centre may be farmland with no pool. A county carrying real membership
     almost certainly has a facility, so those are treated as the candidate
     hosts and travel is measured to the NEAREST host inside the same area.
     This also rewards an area built around two clusters, which a centroid
     measure wrongly punishes, and exposes an area with no viable host at all. */
  const hostMin = opts.hostMin != null ? opts.hostMin : 25;
  const hosts = [];
  for (let i=0;i<n;i++) if (!insular[i] && (ctx.hostWeights || W)[i] >= hostMin) hosts.push(i);
  const H = hosts.length;
  // Precomputed county -> host distances (miles). n x H floats.
  const hostD = H ? new Float32Array(n*H) : null;
  if (H) for (let i=0;i<n;i++) for (let h=0;h<H;h++){
    const j = hosts[h];
    hostD[i*H+h] = Math.hypot(cx[i]-cx[j], cy[i]-cy[j]) * MI_PER_UNIT;
  }
  const hostArea = new Int32Array(H);

  const wB = opts.wBalance    != null ? opts.wBalance    : 1.0;
  const wT = opts.wTravel     != null ? opts.wTravel     : 0.8;
  const wV = opts.wViability  != null ? opts.wViability  : 0.5;
  const wC = opts.wContinuity != null ? opts.wContinuity : 0.0;
  const viaFrac = opts.viabilityFraction != null ? opts.viabilityFraction : 0.55;
  const restarts = opts.restarts || 5;
  const maxIter  = opts.maxIter  || 1200;

  const total = W.reduce((a,b)=>a+b,0);
  const mean  = total / N;
  const NG = (AG && AG[0] && AG[0].length) ? AG[0].length : 4;
  const groupTotals = new Array(NG).fill(0);
  if (AG) for (let i=0;i<n;i++) for (let g=0;g<NG;g++) groupTotals[g] += AG[i][g];
  const groupNeed = groupTotals.map(t => (t / N) * viaFrac);

  const dist = (i, x, y) => Math.hypot(cx[i]-x, cy[i]-y) * MI_PER_UNIT;

  /* ---------------- scoring ---------------- */
  function evaluate(assign){
    const wsum = new Float64Array(N);
    const gx = new Float64Array(N), gy = new Float64Array(N), gw = new Float64Array(N);
    const ages = Array.from({length:N}, ()=>new Array(NG).fill(0));
    let sameBase = 0, baseTot = 0;
    for (let i=0;i<n;i++){
      const r = assign[i]; if (r < 0) continue;
      wsum[r] += W[i];
      if (!insular[i] && W[i] > 0){ gx[r] += cx[i]*W[i]; gy[r] += cy[i]*W[i]; gw[r] += W[i]; }
      if (AG) for (let g=0;g<NG;g++) ages[r][g] += AG[i][g];
      if (base){ baseTot += W[i]; if (base[i] === r) sameBase += W[i]; }
    }
    // Centres are member-weighted: the point most members are closest to, not
    // the geometric middle of the landmass.
    const ctrX = new Float64Array(N), ctrY = new Float64Array(N);
    for (let r=0;r<N;r++){
      if (gw[r] > 0){ ctrX[r] = gx[r]/gw[r]; ctrY[r] = gy[r]/gw[r]; }
      else { ctrX[r] = NaN; ctrY[r] = NaN; }
    }
    let travelNum = 0, travelDen = 0, hostless = 0;
    const chosenHost = new Int32Array(N).fill(-1);
    if (H){
      for (let h=0;h<H;h++) hostArea[h] = assign[hosts[h]];
      // A Regional is one meet at one site, so each area is scored on the SINGLE
      // host that minimises member-weighted travel -- the site it would actually
      // pick. Measuring to the nearest of many hosts flatters every map.
      const byArea = Array.from({length:N}, ()=>[]);
      for (let h=0;h<H;h++) if (hostArea[h] >= 0) byArea[hostArea[h]].push(h);
      const areaCounties = Array.from({length:N}, ()=>[]);
      for (let i=0;i<n;i++){
        const r = assign[i];
        if (r >= 0 && !insular[i] && W[i] > 0) areaCounties[r].push(i);
      }
      for (let r=0;r<N;r++){
        const cs = areaCounties[r];
        if (!cs.length) continue;
        if (!byArea[r].length){
          hostless++;
          if (!isNaN(ctrX[r])) for (const i of cs){ travelNum += W[i]*dist(i,ctrX[r],ctrY[r]); travelDen += W[i]; }
          continue;
        }
        let bestH = -1, bestSum = Infinity;
        for (const h of byArea[r]){
          let sum = 0;
          for (const i of cs) sum += W[i]*hostD[i*H+h];
          if (sum < bestSum){ bestSum = sum; bestH = h; }
        }
        chosenHost[r] = hosts[bestH];
        travelNum += bestSum;
        for (const i of cs) travelDen += W[i];
      }
    } else {
      for (let i=0;i<n;i++){
        const r = assign[i];
        if (r < 0 || insular[i] || W[i] <= 0 || isNaN(ctrX[r])) continue;
        travelNum += W[i] * dist(i, ctrX[r], ctrY[r]);
        travelDen += W[i];
      }
    }
    const travelMi = travelDen > 0 ? travelNum/travelDen : 0;

    let sd = 0;
    for (let r=0;r<N;r++) sd += (wsum[r]-mean)*(wsum[r]-mean);
    sd = Math.sqrt(sd/N);
    const balance = mean > 0 ? sd/mean : 0;

    let via = 0;
    if (AG){
      for (let r=0;r<N;r++) for (let g=0;g<NG;g++){
        if (groupNeed[g] <= 0) continue;
        const short = (groupNeed[g] - ages[r][g]) / groupNeed[g];
        if (short > 0) via += short*short;   // squared: worst cell dominates
      }
      via /= (N*NG);
    }
    const continuity = base && baseTot > 0 ? 1 - sameBase/baseTot : 0;

    const score = wB*balance + wT*(travelMi/TRAVEL_REF) + wV*via + wC*continuity
                + (hostless/N) * 2.0;   // an area that cannot host is not a real option
    return {score, balance, travelMi, via, continuity, hostless, hostCount:H,
            chosenHost: Array.from(chosenHost),
            wsum:Array.from(wsum), ages, ctrX, ctrY,
            ratio: Math.min(...wsum) > 0 ? Math.max(...wsum)/Math.min(...wsum) : Infinity};
  }

  /* ---------------- seeding ---------------- */
  function seedsFor(variant){
    const seeds = [];
    // Different variants start from a different first seed and trade off
    // spread against density, which lands the multi-start in genuinely
    // different basins rather than jittering around one answer.
    const order = Array.from({length:n}, (_,i)=>i)
      .filter(i => W[i] > 0 && !insular[i])
      .sort((a,b)=>W[b]-W[a]);
    if (!order.length) return Array.from({length:N},(_,i)=>i);
    seeds.push(order[Math.min(variant, order.length-1)]);
    const near = new Float64Array(n);
    for (let i=0;i<n;i++) near[i] = Math.hypot(cx[i]-cx[seeds[0]], cy[i]-cy[seeds[0]]);
    const densityPow = [1.0, 0.0, 0.5, 1.5, 0.25][variant % 5];
    while (seeds.length < N){
      let best=-1, bs=-1;
      for (let i=0;i<n;i++){
        if (insular[i] || seeds.indexOf(i)>=0) continue;
        const s = near[i]*near[i] * Math.pow(1+W[i], densityPow);
        if (s > bs){ bs = s; best = i; }
      }
      if (best < 0) break;
      seeds.push(best);
      for (let i=0;i<n;i++){ const d=Math.hypot(cx[i]-cx[best], cy[i]-cy[best]); if (d<near[i]) near[i]=d; }
    }
    while (seeds.length < N){
      for (let i=0;i<n && seeds.length<N;i++) if (seeds.indexOf(i)<0) seeds.push(i);
    }
    return seeds;
  }

  /* ---------------- growth ---------------- */
  function grow(seeds){
    const assign = new Int32Array(n).fill(-1);
    const wsum = new Float64Array(N);
    const sx = new Float64Array(N), sy = new Float64Array(N), sw = new Float64Array(N);
    const cnt = new Int32Array(N);
    const front = [];
    for (let r=0;r<N;r++) front.push(new Set());

    // Pinned counties are placed first and are never reconsidered anywhere.
    if (locked && base) for (let i=0;i<n;i++)
      if (locked[i] && base[i] != null && base[i] >= 0 && base[i] < N) assign[i] = base[i];

    // Seat every area. If its chosen seed is already pinned to a different
    // area, fall back to the nearest still-free county so the area is not lost.
    for (let r=0;r<N;r++){
      let sd = seeds[r];
      if (assign[sd] >= 0 && assign[sd] !== r){
        let best=-1, bd=Infinity;
        for (let i=0;i<n;i++){
          if (assign[i] >= 0) continue;
          const d = Math.hypot(cx[i]-cx[sd], cy[i]-cy[sd]);
          if (d < bd){ bd = d; best = i; }
        }
        if (best < 0) continue;      // nothing free left; area stays empty
        sd = best;
      }
      if (assign[sd] < 0) assign[sd] = r;
    }

    // Accumulate over everything assigned so far -- pins included, which the
    // earlier version missed, leaving seed weight out of the balance figure.
    let placed = 0;
    for (let i=0;i<n;i++){
      const r = assign[i]; if (r < 0) continue;
      placed++;
      wsum[r] += W[i]; cnt[r]++;
      const ww = W[i] || 0.001;
      sx[r] += cx[i]*ww; sy[r] += cy[i]*ww; sw[r] += ww;
    }
    for (let i=0;i<n;i++){
      const r = assign[i]; if (r < 0) continue;
      for (const j of adj[i]) if (assign[j] < 0) front[r].add(j);
    }
    while (placed < n){
      let pick=-1, worst=Infinity;
      for (let r=0;r<N;r++){
        if (!front[r].size) continue;
        const fill = mean>0 ? wsum[r]/mean : cnt[r];
        if (fill < worst){ worst=fill; pick=r; }
      }
      if (pick<0){
        for (let i=0;i<n;i++){
          if (assign[i]>=0) continue;
          let br=0,bd=Infinity;
          for (let r=0;r<N;r++){
            const d=Math.hypot(cx[i]-sx[r]/sw[r], cy[i]-sy[r]/sw[r]);
            if (d<bd){bd=d;br=r;}
          }
          assign[i]=br; wsum[br]+=W[i]; cnt[br]++; placed++;
        }
        break;
      }
      const mx=sx[pick]/sw[pick], my=sy[pick]/sw[pick];
      let bc=-1, bd=Infinity;
      for (const j of front[pick]){
        if (assign[j]>=0){ front[pick].delete(j); continue; }
        const d=Math.hypot(cx[j]-mx, cy[j]-my);
        if (d<bd){ bd=d; bc=j; }
      }
      if (bc<0) continue;
      assign[bc]=pick; wsum[pick]+=W[bc]; cnt[pick]++;
      const ww = W[bc]||0.001;
      sx[pick]+=cx[bc]*ww; sy[pick]+=cy[bc]*ww; sw[pick]+=ww;
      placed++;
      front[pick].delete(bc);
      for (const j of adj[bc]) if (assign[j]<0) front[pick].add(j);
      for (let r=0;r<N;r++) if (r!==pick) front[r].delete(bc);
    }
    return assign;
  }

  /* ---------------- contiguity helpers ---------------- */
  function membersOf(assign){
    const m = Array.from({length:N},()=>[]);
    for (let i=0;i<n;i++) if (assign[i]>=0) m[assign[i]].push(i);
    return m;
  }
  function connectedWithout(list, drop){
    const set = new Set(list); set.delete(drop);
    if (!set.size) return false;
    const s0 = set.values().next().value;
    const seen = new Set([s0]), st=[s0];
    while (st.length){
      const u=st.pop();
      for (const v of adj[u]) if (set.has(v) && !seen.has(v)){ seen.add(v); st.push(v); }
    }
    return seen.size === set.size;
  }

  /* ---------------- local search over the full objective ---------------- */
  function polish(assign){
    let cur = evaluate(assign);
    for (let it=0; it<maxIter; it++){
      // Candidate moves are border counties only. Scored against the real
      // objective using the current area centres, then the winner is verified
      // with a full re-evaluation so approximation error can never accumulate.
      const cand = [];
      for (let i=0;i<n;i++){
        if (locked && locked[i]) continue;      // pinned by the user
        const from = assign[i]; if (from<0) continue;
        const to = new Set();
        for (const j of adj[i]) if (assign[j]>=0 && assign[j]!==from) to.add(assign[j]);
        for (const t of to){
          const wf = cur.wsum[from]-W[i], wt = cur.wsum[t]+W[i];
          const dSS = ((wf-mean)**2 + (wt-mean)**2)
                    - ((cur.wsum[from]-mean)**2 + (cur.wsum[t]-mean)**2);
          let dT = 0;
          if (!insular[i] && W[i]>0 && !isNaN(cur.ctrX[from]) && !isNaN(cur.ctrX[t])){
            dT = W[i]*(dist(i,cur.ctrX[t],cur.ctrY[t]) - dist(i,cur.ctrX[from],cur.ctrY[from]));
          }
          let dV = 0;
          if (AG) for (let g=0;g<NG;g++){
            if (groupNeed[g]<=0) continue;
            const sq = x => x>0 ? x*x : 0;
            const sf0 = sq((groupNeed[g]-cur.ages[from][g])/groupNeed[g]);
            const st0 = sq((groupNeed[g]-cur.ages[t][g])/groupNeed[g]);
            const sf1 = sq((groupNeed[g]-(cur.ages[from][g]-AG[i][g]))/groupNeed[g]);
            const st1 = sq((groupNeed[g]-(cur.ages[t][g]+AG[i][g]))/groupNeed[g]);
            dV += (sf1+st1)-(sf0+st0);
          }
          let dC = 0;
          if (base) dC = ((base[i]===t)?-W[i]:0) + ((base[i]===from)?W[i]:0);
          // Ranking heuristic only -- every applied move is confirmed against a
          // full re-evaluation below, so an imperfect estimate can misorder
          // candidates but can never let the objective get worse. Each term is
          // scaled the same way the real objective normalises it.
          const est = wB*(dSS/(N*mean*mean || 1))
                    + wT*(dT/((total||1)*TRAVEL_REF))
                    + wV*(dV/(N*4))
                    + wC*(dC/(total||1));
          if (est < 0) cand.push({i, from, to:t, est});
        }
      }
      if (!cand.length) break;
      cand.sort((a,b)=>a.est-b.est);
      const M = membersOf(assign);
      let applied = false;
      for (const c of cand.slice(0, 40)){
        if (M[c.from].length <= 1) continue;
        if (!connectedWithout(M[c.from], c.i)) continue;
        assign[c.i] = c.to;
        const next = evaluate(assign);
        if (next.score < cur.score - 1e-12){ cur = next; applied = true; break; }
        assign[c.i] = c.from;   // revert, try the next candidate
      }
      if (!applied) break;
    }
    return cur;
  }

  /* ---------------- multi-start ---------------- */
  let best = null, bestAssign = null, tried = 0;
  const starts = [];
  if (base){
    const b = new Int32Array(n);
    for (let i=0;i<n;i++) b[i] = (base[i] != null && base[i] >= 0 && base[i] < N) ? base[i] : -1;
    // Any county the baseline does not cover (or that falls outside the
    // requested area count) is attached to its nearest assigned neighbour so
    // the starting map is complete before polishing.
    let guard = 0;
    while (Array.prototype.some.call(b, x => x < 0) && guard++ < 50){
      for (let i=0;i<n;i++){
        if (b[i] >= 0) continue;
        for (const j of adj[i]) if (b[j] >= 0){ b[i] = b[j]; break; }
      }
    }
    for (let i=0;i<n;i++) if (b[i] < 0) b[i] = 0;
    starts.push(b);
  }
  for (let v=0; v<restarts; v++) starts.push(grow(seedsFor(v)));
  for (const a of starts){
    const res = polish(a);
    tried++;
    if (!best || res.score < best.score){ best = res; bestAssign = Array.from(a); }
  }

  // Final safety: no area may be in more than one piece.
  const assign = bestAssign;
  let repaired = 0;
  for (let r=0;r<N;r++){
    const list=[]; for (let i=0;i<n;i++) if (assign[i]===r) list.push(i);
    if (list.length<2) continue;
    const set=new Set(list), seen=new Set(), pieces=[];
    for (const s0 of list){
      if (seen.has(s0)) continue;
      const p=[], st=[s0]; seen.add(s0);
      while(st.length){ const u=st.pop(); p.push(u);
        for (const v of adj[u]) if (set.has(v)&&!seen.has(v)){seen.add(v);st.push(v);} }
      pieces.push(p);
    }
    if (pieces.length<2) continue;
    pieces.sort((a,b)=>b.length-a.length);
    for (const p of pieces.slice(1)){
      const touch={};
      for (const i of p) for (const j of adj[i]){
        const a2=assign[j]; if (a2>=0&&a2!==r) touch[a2]=(touch[a2]||0)+1;
      }
      const opts2 = Object.keys(touch).map(Number);
      if (!opts2.length) continue;
      // Hand the stray piece to whichever neighbouring area it hurts least.
      // Choosing purely by border contact could dump a 200-member piece into an
      // already-large area and wreck the balance -- which is exactly what
      // happened when starting from a map whose regions were already split.
      const pw = p.reduce((sum,i)=>sum+W[i],0);
      const wsNow = new Float64Array(N);
      for (let i=0;i<n;i++) if (assign[i]>=0) wsNow[assign[i]] += W[i];
      let bestK=opts2[0], bestCost=Infinity;
      for (const k of opts2){
        const after = wsNow[k] + pw;
        const cost = (after-mean)*(after-mean) - touch[k]*1e-6;   // contact breaks ties
        if (cost < bestCost){ bestCost = cost; bestK = k; }
      }
      if (locked && p.some(i=>locked[i])) continue;   // cannot move a pinned piece
      for (const i of p) assign[i]=bestK;
      repaired++;
    }
  }
  // Relabel areas to line up with the baseline's numbering wherever possible,
  // so "Region 7" still means roughly the same part of the country.
  if (base){
    const overlap = Array.from({length:N},()=>new Float64Array(N));
    for (let i=0;i<n;i++){
      const a2 = assign[i], b2 = base[i];
      if (a2>=0 && b2!=null && b2>=0 && b2<N) overlap[a2][b2] += (W[i]||0) + 0.001;
    }
    const pairs = [];
    for (let a2=0;a2<N;a2++) for (let b2=0;b2<N;b2++) pairs.push([overlap[a2][b2], a2, b2]);
    pairs.sort((p,q)=>q[0]-p[0]);
    const mapTo = new Array(N).fill(-1), usedB = new Set(), usedA = new Set();
    for (const [, a2, b2] of pairs){
      if (usedA.has(a2) || usedB.has(b2)) continue;
      mapTo[a2] = b2; usedA.add(a2); usedB.add(b2);
    }
    let free = 0;
    for (let a2=0;a2<N;a2++){
      if (mapTo[a2] >= 0) continue;
      while (usedB.has(free)) free++;
      mapTo[a2] = free; usedB.add(free);
    }
    for (let i=0;i<n;i++) if (assign[i] >= 0) assign[i] = mapTo[assign[i]];
  }
  // Repair is a structural edit, not an optimising one, so give the objective
  // the last word once the map is guaranteed contiguous.
  let final = evaluate(assign);
  if (repaired){
    const arr = Int32Array.from(assign);
    final = polish(arr);
    for (let i=0;i<n;i++) assign[i] = arr[i];
  }

  const counties = Array.from({length:N},(_,r)=>{let c=0;for(let i=0;i<n;i++) if(assign[i]===r)c++;return c;});
  return {
    assign: Array.from(assign),
    stats: {
      total, target: mean,
      weights: final.wsum, counties, ages: final.ages,
      min: Math.min(...final.wsum), max: Math.max(...final.wsum),
      ratio: final.ratio, spread: final.balance,
      travelMi: final.travelMi, viability: final.via, continuity: final.continuity,
      score: final.score, repaired, restarts: tried,
      groupNeed, viabilityFraction: viaFrac,
      hostless: final.hostless, hostCount: final.hostCount, hostMin,
      chosenHost: final.chosenHost,
    },
  };
}



/* Roll the drawn areas up into higher tiers. Each tier is partitioned with the
   same balanced-and-connected engine, run over a coarse graph whose nodes are
   the tier below (two areas are neighbours if any of their counties touch), so
   a zone is never a pair of areas on opposite sides of the country. Returns one
   "of" array per tier above the base, in the shape S.levels expects. */
function groupAreasIntoTiers(A, baseAssign, W, counts){
  const chain = [];
  let curAssign = baseAssign.slice();
  let curN = 0;
  for (const v of curAssign) if (v + 1 > curN) curN = v + 1;
  for (const Kraw of counts){
    const K = Math.max(1, Math.min(Kraw, curN));
    if (curN <= 1){ chain.push(new Array(curN).fill(0)); continue; }
    const wsum = new Array(curN).fill(0), sx = new Array(curN).fill(0),
          sy = new Array(curN).fill(0), cnt = new Array(curN).fill(0);
    const adjS = Array.from({length:curN}, ()=>new Set());
    for (let i=0;i<A.fips.length;i++){
      const a = curAssign[i]; if (a < 0) continue;
      wsum[a] += W[i]; sx[a] += A.cx[i]; sy[a] += A.cy[i]; cnt[a]++;
      for (const j of A.adj[i]){
        const b = curAssign[j];
        if (b >= 0 && b !== a){ adjS[a].add(b); adjS[b].add(a); }
      }
    }
    const CA = {
      fips: Array.from({length:curN}, (_,i)=>'n'+i),
      st:   new Array(curN).fill(''),
      cx:   Array.from({length:curN}, (_,i)=> cnt[i] ? sx[i]/cnt[i] : 0),
      cy:   Array.from({length:curN}, (_,i)=> cnt[i] ? sy[i]/cnt[i] : 0),
      adj:  adjS.map(x=>Array.from(x)),
    };
    // No host modelling at tier level and no age cells: balance and compactness only.
    const res = (K === 1)
      ? { assign: new Array(curN).fill(0) }
      : smartAssign(CA, {weights: wsum}, K,
          {restarts:4, wBalance:1.5, wTravel:0.4, wViability:0, hostMin:Infinity});
    chain.push(res.assign.slice(0, curN));
    curAssign = curAssign.map(v => v >= 0 ? res.assign[v] : -1);
    curN = K;
  }
  return chain;
}

/* ---------- auto-assign: data loading + UI ---------- */
let _genderData = null;
function loadGenderData(){
  if (_genderData) return Promise.resolve(_genderData);
  return fetch('gender-data.json?v=202607250130')
    .then(r => { if (!r.ok) throw new Error('gender-data.json ' + r.status); return r.json(); })
    .then(j => { _genderData = j; return j; })
    .catch(() => { _genderData = {counties:{}}; return _genderData; });
}
const VIA_LABELS = ['Boys 11&under','Boys 12-13','Boys 14-15','Boys 16-18',
                    'Girls 11&under','Girls 12-13','Girls 14-15','Girls 16-18'];

let _autoData = null, _autoLoading = null;
function loadAutoData(){
  if (_autoData) return Promise.resolve(_autoData);
  if (_autoLoading) return _autoLoading;
  _autoLoading = fetch('auto-data.json?v=202607242100')
    .then(r => { if (!r.ok) throw new Error('auto-data.json ' + r.status); return r.json(); })
    .then(j => { _autoData = j; return j; });
  return _autoLoading;
}

// County weights for the current year, in auto-data county order.
function autoWeights(A, basis){
  const st = S.geo.stats, y = S.year;
  return A.fips.map(f => {
    const s = st[f]; if (!s || !s[y]) return 0;
    return basis === 'athletes' ? (s[y].a || 0) : (s[y].m || 0);
  });
}


const AUTO_PRESETS = [
  {k:'blend',   label:'Balanced blend',  hint:'Even sizes and sensible travel together. Start here.',
   o:{wBalance:1.0, wTravel:0.8, wViability:0.8, viabilityFraction:0.8, wContinuity:0}},
  {k:'even',    label:'Most even sizes', hint:'Push hardest on equal membership.',
   o:{wBalance:1.5, wTravel:0.35, wViability:0.4, viabilityFraction:0.7, wContinuity:0}},
  {k:'travel',  label:'Least travel',    hint:'Tightest areas. Sizes will be less even.',
   o:{wBalance:0.5, wTravel:1.8, wViability:0.4, viabilityFraction:0.7, wContinuity:0}},
  {k:'depth',   label:'Event depth',     hint:'Protect every age group from being too thin.',
   o:{wBalance:0.8, wTravel:0.5, wViability:3.0, viabilityFraction:0.9, wContinuity:0}},
  {k:'keep',    label:"Keep today's map", hint:'Fixes split regions, moves the fewest people. Stays uneven.',
   o:{wBalance:1.2, wTravel:0.7, wViability:0.8, viabilityFraction:0.8, wContinuity:0.8}, needsBase:true},
];

const AUTO = { n: 12, basis: 'members', whole: false, preset: 'blend', result: null,
               busy: false, locks: [], hostMin: 40, ladder: '12, 6, 3' };

function openAutoDialog(){
  AUTO.n = Math.max(2, S.regions.length || 12);
  AUTO.result = null;
  let d = document.getElementById('bsAutoModal');
  if (!d){ d = document.createElement('div'); d.id = 'bsAutoModal'; document.body.appendChild(d); }
  renderAutoDialog();
  loadAutoData().then(renderAutoDialog).catch(e => {
    AUTO.error = String(e.message || e); renderAutoDialog();
  });
}

function renderAutoDialog(){
  const d = document.getElementById('bsAutoModal');
  if (!d) return;
  const ready = !!_autoData;
  const r = AUTO.result;
  d.innerHTML = `
  <div class="bs-auto-ov" onclick="if(event.target===this)window._bsAutoClose()">
    <div class="bs-auto-dlg">
      <div class="bs-auto-head">
        <div><div class="bs-auto-eyebrow">Boundary Studio</div>
             <h2>Auto-draw the map</h2></div>
        <button class="bs-auto-x" onclick="window._bsAutoClose()">&#10005;</button>
      </div>
      <div class="bs-auto-body">
        <p class="bs-auto-p">Pick how many areas you want and this will divide the whole
        country into that many <b>connected</b> areas with roughly the same number of members
        in each. It is a starting point, not a decision &mdash; every county stays fully
        editable afterwards, and Undo puts back what you had.</p>

        <div class="bs-auto-row">
          <label class="bs-auto-lbl">How many areas?</label>
          <div class="bs-auto-nrow">
            <button onclick="window._bsAutoN(-1)">&minus;</button>
            <input id="bsAutoN" type="number" min="2" max="24" value="${AUTO.n}"
                   onchange="window._bsAutoSetN(this.value)">
            <button onclick="window._bsAutoN(1)">+</button>
            <span class="bs-auto-hint">2 to 24</span>
          </div>
        </div>

        <div class="bs-auto-row">
          <label class="bs-auto-lbl">Stages</label>
          <div style="flex:1">
            <input id="bsAutoLadder" type="text" value="${esc(AUTO.ladder)}"
                   onchange="window._bsAutoLadder(this.value)"
                   style="width:180px;height:32px;border:1px solid #cdd6e4;border-radius:7px;
                          padding:0 9px;font-family:'JetBrains Mono',monospace;font-size:14px;
                          font-weight:700;color:#171F69">
            <div class="bs-auto-hint" style="margin-top:4px">How many at each stage, biggest first
              &mdash; e.g. <b>9, 3, 1</b> for nine areas feeding three, feeding one. Each stage is
              balanced and connected in its own right. Two stages is fine; so is one.</div>
          </div>
        </div>

        <div class="bs-auto-row">
          <label class="bs-auto-lbl">What matters most</label>
          <div class="bs-auto-presets">
            ${AUTO_PRESETS.map(p=>`
              <button class="${AUTO.preset===p.k?'on':''}" onclick="window._bsAutoPreset('${p.k}')">
                <b>${esc(p.label)}</b><span>${esc(p.hint)}</span></button>`).join('')}
          </div>
        </div>

        <div class="bs-auto-row">
          <label class="bs-auto-lbl">Count</label>
          <div class="bs-auto-chips">
            <button class="${AUTO.basis==='members'?'on':''}" onclick="window._bsAutoBasis('members')">All members</button>
            <button class="${AUTO.basis==='athletes'?'on':''}" onclick="window._bsAutoBasis('athletes')">Athletes only</button>
          </div>
        </div>

        <div class="bs-auto-row">
          <label class="bs-auto-lbl">Keep in place</label>
          <div style="flex:1">
            <div class="bs-auto-chips">
              ${S.regions.map((r,i)=>`<button class="sm ${AUTO.locks.indexOf(i)>=0?'on':''}"
                onclick="window._bsAutoLock(${i})" style="border-left:5px solid ${r.color}">
                ${esc(r.name||('Area '+(i+1)))}</button>`).join('')}
              ${AUTO.locks.length?`<button class="sm" onclick="window._bsAutoLock(-1)">Clear</button>`:''}
            </div>
            <div class="bs-auto-hint" style="margin-top:4px">Pick any areas whose counties must not
              move. Everything else gets redrawn around them.</div>
          </div>
        </div>

        <div class="bs-auto-row">
          <label class="bs-auto-lbl">Host sites</label>
          <div style="flex:1">
            <div class="bs-auto-chips">
              <button class="sm ${AUTO.hostMin===Infinity?'on':''}"
                onclick="window._bsAutoHost(-1)">Skip for now</button>
              ${[25,40,60].map(h=>`<button class="sm ${AUTO.hostMin===h?'on':''}"
                onclick="window._bsAutoHost(${h})">${h}+ members</button>`).join('')}
            </div>
            <div class="bs-auto-hint" style="margin-top:4px">${AUTO.hostMin===Infinity
              ? 'Host sites ignored. Travel is measured to the centre of each area instead, and no area is flagged for being unable to host.'
              : `Travel is measured to the single best
              host county in each area`} &mdash; the site it would actually run the meet at &mdash; not
              to an empty point in the middle. A county needs at least this many members to count as
              able to host.</div>
          </div>
        </div>

        <div class="bs-auto-row">
          <label class="bs-auto-lbl">Whole states</label>
          <label class="bs-auto-check">
            <input type="checkbox" ${AUTO.whole?'checked':''} onchange="window._bsAutoWhole(this.checked)">
            <span>Never split a state across two areas
              <span class="bs-auto-hint">(tidier lines, but less even &mdash; a big state can't be shared)</span></span>
          </label>
        </div>

        <div class="bs-auto-note">Using <b>${S.year==='y25'?'2025 (complete year)':'2026 (year to date)'}</b>
          membership &mdash; switch the year on the map before drawing if you want the other one.</div>

        ${AUTO.error ? `<div class="bs-auto-err">Could not load the map data: ${esc(AUTO.error)}</div>` : ''}

        ${r ? `
          <div class="bs-auto-result">
            <div class="bs-auto-rh">Result</div>
            <div class="bs-auto-kpis">
              <div><b>${(100*r.stats.spread).toFixed(1)}%</b><span>size spread &mdash; lower is more even</span></div>
              <div><b>${isFinite(r.stats.ratio)?r.stats.ratio.toFixed(2)+'\u00d7':'&mdash;'}</b><span>largest &divide; smallest area</span></div>
              ${r.stats.travelMi!=null?`<div><b>${Math.round(r.stats.travelMi)} mi</b><span>average trip to the area centre</span></div>`:''}
              ${weakestGroup(r)!=null?`<div><b>${Math.round(100*weakestGroup(r))}%</b><span>thinnest ${esc(weakestGroup(r,true)||'age group')} field vs average <b>(estimated)</b></span></div>`:''}
              ${(r.stats.continuity!=null&&r.stats.continuity>0)?`<div><b>${Math.round(100*(1-r.stats.continuity))}%</b><span>of members stay where they are</span></div>`:''}
            </div>
            ${(r.stats.hostless>0)?`<div class="bs-auto-err"><b>${r.stats.hostless} area${r.stats.hostless===1?' has':'s have'} no county big enough to host.</b>
              Either lower the host-site threshold or redraw &mdash; an area that cannot run its own
              championship is not a workable area.</div>`:''}
            ${(r.stats.chosenHost&&r.stats.chosenHost.some(x=>x>=0))?`
              <div class="bs-auto-legend"><b>Likely host counties:</b>
              ${r.stats.chosenHost.map((ci,i)=>ci>=0?hostLabel(ci):null).filter(Boolean).join(' · ')}</div>`:''}
            <div class="bs-auto-legend"><b>Age/gender fields are estimates.</b> Gender is known for
              about 45% of athletes (name-matched to competition results); the rest are split using
              the observed local ratio. Use these to compare areas, not as counts.</div>
            <div class="bs-auto-legend">Areas are always connected &mdash; no area is ever left in
              two separate pieces. Alaska and Hawaii are left out of the travel figure, since those
              athletes fly whatever the map says.</div>
            <table class="bs-auto-tbl"><thead><tr><th>Area</th><th>Members</th><th>Counties</th></tr></thead>
              <tbody>${r.stats.weights.map((w,i)=>`<tr>
                <td><span class="sw" style="background:${PALETTE[i%PALETTE.length]}"></span>Area ${i+1}</td>
                <td>${fmt(Math.round(w))}</td><td>${fmt(r.stats.counties[i])}</td></tr>`).join('')}</tbody></table>
          </div>` : ''}
      </div>
      <div class="bs-auto-foot">
        <span class="bs-auto-hint">${ready ? '' : 'Loading map data&hellip;'}</span>
        <div class="bs-auto-btns">
          <button onclick="window._bsAutoClose()">Cancel</button>
          <button class="prim" ${ready&&!AUTO.busy?'':'disabled'} onclick="window._bsAutoRun()">
            ${AUTO.busy ? 'Working&hellip;' : (r ? 'Draw it again' : 'Preview the map')}</button>
          ${r ? `<button class="prim go" onclick="window._bsAutoApply()">Use this map</button>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

window._bsAutoClose = function(){ const d=document.getElementById('bsAutoModal'); if(d) d.remove(); };
function syncLadderFirst(){
  const L = parseLadder(); L[0] = AUTO.n; AUTO.ladder = L.join(', ');
}
window._bsAutoN = function(delta){ AUTO.n = Math.min(24, Math.max(2, AUTO.n + delta)); syncLadderFirst(); AUTO.result=null; renderAutoDialog(); };
function parseLadder(){
  const nums = String(AUTO.ladder||'').split(/[^0-9]+/).filter(Boolean).map(Number)
    .filter(n => n >= 1 && n <= 24);
  return nums.length ? nums : [AUTO.n];
}
window._bsAutoLadder = function(v){
  AUTO.ladder = v;
  const L = parseLadder();
  if (L.length) AUTO.n = L[0];
  AUTO.result = null; renderAutoDialog();
};
window._bsAutoSetN = function(v){ const n=parseInt(v,10); if(!isNaN(n)) AUTO.n=Math.min(24,Math.max(2,n)); syncLadderFirst(); AUTO.result=null; renderAutoDialog(); };
function weakestGroup(r, wantLabel){
  if (!r || !r.stats || !r.stats.ages || !r.stats.groupNeed) return null;
  const N = r.stats.ages.length, NG = r.stats.groupNeed.length;
  let worst = Infinity, worstG = -1;
  for (let i=0;i<N;i++) for (let g=0;g<NG;g++){
    // groupNeed is already scaled by the viability fraction; undo it so the
    // number shown is honestly "share of the average area", not of a threshold.
    const avg = r.stats.groupNeed[g] / (r.stats.viabilityFraction || 0.8);
    if (avg <= 0) continue;
    const rel = r.stats.ages[i][g] / avg;
    if (rel < worst){ worst = rel; worstG = g; }
  }
  if (!isFinite(worst)) return null;
  if (wantLabel) return (NG === 8 && VIA_LABELS[worstG]) ? VIA_LABELS[worstG] : 'age group';
  return worst;
}
function hostLabel(ci){
  if (!_autoData) return '';
  const f = _autoData.fips[ci];
  const c = (S.geo.counties||[]).find(x=>x.f===f);
  return c ? esc(c.n + ', ' + c.st) : esc(String(f));
}
window._bsAutoLock = function(i){
  if (i < 0){ AUTO.locks = []; }
  else {
    const k = AUTO.locks.indexOf(i);
    if (k >= 0) AUTO.locks.splice(k,1); else AUTO.locks.push(i);
  }
  AUTO.result = null; renderAutoDialog();
};
window._bsAutoHost = function(h){ AUTO.hostMin = (h < 0 ? Infinity : h); AUTO.result=null; renderAutoDialog(); };
window._bsAutoPreset = function(k){ AUTO.preset=k; AUTO.result=null; renderAutoDialog(); };
window._bsAutoBasis = function(b){ AUTO.basis=b; AUTO.result=null; renderAutoDialog(); };
window._bsAutoWhole = function(v){ AUTO.whole=!!v; AUTO.result=null; renderAutoDialog(); };

window._bsAutoRun = function(){
  if (!_autoData) return;
  AUTO.busy = true; renderAutoDialog();
  loadGenderData().then(()=>setTimeout(()=>{
    try {
      const A = _autoData, y = S.year;
      const w = autoWeights(A, AUTO.basis);
      // Gender-split cells when available, falling back to age-group-only.
      const GD = _genderData && _genderData.counties;
      const ages = A.fips.map(f => {
        const g8 = GD && GD[f] && GD[f][y];
        if (g8) return g8.slice(0,8);
        const a = S.age && S.age[f] ? S.age[f][y] : null;
        return a ? [a[0]||0, a[1]||0, a[2]||0, a[3]||0] : [0,0,0,0];
      });
      const p = AUTO_PRESETS.find(x=>x.k===AUTO.preset) || AUTO_PRESETS[0];
      if (AUTO.whole){
        AUTO.result = autoAssignStates(A, w, AUTO.n);
        AUTO.result.wholeStates = true;
      } else {
        // "Keep today's map" measures against whatever is currently painted.
        let baseline = null;
        if (p.needsBase){
          baseline = A.fips.map(f => {
            const v = S.assign[f];
            return (v == null || v < 0 || v >= AUTO.n) ? -1 : v;
          });
          if (!baseline.some(v => v >= 0)) baseline = null;
        }
        // "Keep in place" pins every county currently painted into the chosen
        // areas; the optimiser works around them.
        let locked = null;
        if (AUTO.locks.length){
          locked = A.fips.map(f => {
            const v = S.assign[f];
            return v != null && v >= 0 && AUTO.locks.indexOf(v) >= 0;
          });
          if (!baseline){
            baseline = A.fips.map(f => {
              const v = S.assign[f];
              return (v == null || v < 0 || v >= AUTO.n) ? -1 : v;
            });
          }
        }
        AUTO.result = smartAssign(A, {weights:w, ages, baseline, locked}, AUTO.n,
                                  Object.assign({restarts:4, hostMin:AUTO.hostMin}, p.o));
      }
      AUTO.error = null;
    } catch(e){ AUTO.error = String(e.message||e); }
    AUTO.busy = false; renderAutoDialog();
  }, 30));
};

window._bsAutoApply = function(){
  const r = AUTO.result; if (!r || !_autoData) return;
  pushUndo('auto');
  const N = AUTO.n;
  // Keep existing names and colours when the area count is unchanged, so a
  // re-draw doesn't wipe naming work.
  if (S.regions.length !== N) S.regions = defaultRegions(N);
  const A = _autoData, next = {};
  for (let i=0;i<A.fips.length;i++){
    const g = r.assign[i];
    if (g != null && g >= 0 && g < N) next[A.fips[i]] = g;
  }
  S.assign = next;
  // Build the requested tier ladder from the map just drawn.
  const ladder = parseLadder().slice(1).filter(k => k >= 1);
  if (ladder.length && !r.byState){
    try {
      const baseAssign = A.fips.map((f,i) => {
        const g = r.assign[i];
        return (g != null && g >= 0 && g < N) ? g : -1;
      });
      const w = autoWeights(A, AUTO.basis);
      const chain = groupAreasIntoTiers(A, baseAssign, w, ladder);
      const names = ladder.length === 2 && ladder[0] === 3
        ? [['East','Central','West'], ['National']]
        : null;
      S.levels = [{name:'Regions'}].concat(chain.map((of, t) => ({
        name: ladder[t] === 1 ? 'National' : (t === 0 ? 'Zones' : 'Level ' + (t+2)),
        groups: Array.from({length: ladder[t]}, (_,gi) =>
          ({name: (names && names[t] && names[t][gi]) ? names[t][gi]
                  : (ladder[t] === 1 ? 'National' : 'Group ' + (gi+1))})),
        of: of.slice(),
      })));
    } catch(e){ console.warn('tier rollup failed, leaving levels as they were:', e && e.message); }
  }
  if (S.active >= S.regions.length) S.active = S.regions.length - 1;
  S.detailRegion = null; S.dirty = true;
  syncLevels();
  window._bsAutoClose();
  repaintAll(); renderPanel();
  const msg = `Drew ${N} areas \u00b7 largest \u00f7 smallest ${isFinite(r.stats.ratio)?r.stats.ratio.toFixed(2)+'\u00d7':'n/a'} \u00b7 spread ${(100*r.stats.spread).toFixed(1)}%`;
  if (window.USADToast && window.USADToast.show) window.USADToast.show(msg);
};


/* ---------- read-only API for the reporting layer (ma-reports.js) ----------
   Boundary Studio owns this state; the reports module only ever reads it.
   Every accessor returns live values, so a generated report always reflects
   the exact scenario the user is looking at when they hit "Build report". */
window.BoundaryAPI = {
  ready:      () => !!(S.booted && S.geo),
  geo:        () => S.geo,
  age:        () => S.age,
  clubs:      () => (S.geo ? S.geo.clubs : []),
  counties:   () => (S.geo ? S.geo.counties : []),
  year:       () => S.year,
  yearLabel:  (y) => ((y || S.year) === 'y25' ? '2025 (complete year)' : '2026 (year to date)'),
  /* Which membership years the boundary data actually covers. The geocoded
     county statistics only carry y25 and y26, so a report asking for 2024 can
     be told plainly rather than silently shown the wrong year. */
  availableYears: () => ['y25', 'y26'],
  /* Run something with the map temporarily set to another year, then put it
     back. Every boundary computation reads S.year through shared helpers, so
     this is how a report renders more than one year without nine section
     builders each having to thread a year parameter through.
     CALLERS MUST NOT RUN THESE CONCURRENTLY: the year is global state for the
     duration, so two overlapping calls would read each other's year. The
     report runner serialises boundary sections for exactly this reason. */
  withYear: async (y, fn) => {
    const prev = S.year;
    try { S.year = y; return await fn(); }
    finally { S.year = prev; }
  },
  regions:    () => S.regions,
  assign:     () => S.assign,
  levels:     () => S.levels,
  levelCount, tierName, tierGroups, tierGroupsAt,
  tierView:   () => S.tierView,
  tallies:    computeTallies,
  regionZips, groupColor,
  ageGroups:  () => AGE_GROUPS,
  finalName:  () => S.finalName,
  scenario:   () => ({ id: S.scenarioId, name: S.scenarioName, dirty: S.dirty }),
  compare:    () => S.compare,
  totals:     () => S.totals,
  /* The qualification pathway and its projection. project() recomputes rather
     than returning a cache, so a report never depends on whether the Pathway
     panel happened to be open. */
  routing:    () => { syncRouting(); return S.routing; },
  pathway:    () => projectPathway(),
  multiplicity: () => S.mult,
  multBasis:  multBasisFor,
  ensureMult,
  groupCountAt,
};

function injectAutoCSS(){
  if (document.getElementById('bs-auto-css')) return;
  const el = document.createElement('style');
  el.id = 'bs-auto-css';
  el.textContent = "\n/* auto-assign dialog */\n#bsAutoModal .bs-auto-ov{position:fixed;inset:0;background:rgba(15,20,45,.55);z-index:99998;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:28px 16px}\n#bsAutoModal .bs-auto-dlg{background:#fff;border-radius:14px;max-width:620px;width:100%;box-shadow:0 18px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;max-height:92vh}\n#bsAutoModal .bs-auto-head{display:flex;align-items:flex-start;padding:18px 22px 12px;border-bottom:3px solid #E31937}\n#bsAutoModal .bs-auto-eyebrow{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#009AC7}\n#bsAutoModal .bs-auto-head h2{font-family:'Barlow Condensed',sans-serif;font-size:27px;font-weight:700;margin:2px 0 0;color:#171F69;text-transform:uppercase}\n#bsAutoModal .bs-auto-x{margin-left:auto;border:none;background:none;font-size:19px;cursor:pointer;color:#6b7390}\n#bsAutoModal .bs-auto-body{padding:15px 22px;overflow:auto}\n#bsAutoModal .bs-auto-p{font-size:13px;color:#3d4a63;line-height:1.55;margin:0 0 14px}\n#bsAutoModal .bs-auto-row{display:flex;gap:14px;align-items:flex-start;margin-bottom:13px}\n#bsAutoModal .bs-auto-lbl{flex:0 0 130px;font-size:12px;font-weight:800;color:#171F69;text-transform:uppercase;letter-spacing:.04em;padding-top:7px}\n#bsAutoModal .bs-auto-nrow{display:flex;align-items:center;gap:6px}\n#bsAutoModal .bs-auto-nrow button{width:32px;height:32px;border:1px solid #cdd6e4;background:#fff;border-radius:7px;font-size:16px;font-weight:800;color:#171F69;cursor:pointer}\n#bsAutoModal .bs-auto-nrow input{width:66px;height:32px;text-align:center;border:1px solid #cdd6e4;border-radius:7px;font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:#171F69}\n#bsAutoModal .bs-auto-presets{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:6px;flex:1}\n#bsAutoModal .bs-auto-presets button{text-align:left;border:1px solid #cdd6e4;background:#fff;border-radius:8px;padding:8px 10px;cursor:pointer;font-family:inherit}\n#bsAutoModal .bs-auto-presets button.on{border-color:#171F69;background:#eef2fb;box-shadow:inset 0 0 0 1px #171F69}\n#bsAutoModal .bs-auto-presets b{display:block;font-size:12.5px;color:#171F69}\n#bsAutoModal .bs-auto-presets span{display:block;font-size:10.5px;color:#5a6480;margin-top:2px;line-height:1.35}\n#bsAutoModal .bs-auto-legend{font-size:11px;color:#5a6480;margin:8px 0 10px;line-height:1.5}\n#bsAutoModal .bs-auto-chips{display:flex;gap:6px;flex-wrap:wrap}\n#bsAutoModal .bs-auto-chips button{border:1px solid #cdd6e4;background:#fff;color:#171F69;border-radius:999px;padding:7px 15px;font-weight:700;font-size:12.5px;cursor:pointer}\n#bsAutoModal .bs-auto-chips button.on{background:#171F69;color:#fff;border-color:#171F69}\n#bsAutoModal .bs-auto-check{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:#3d4a63;padding-top:5px;cursor:pointer}\n#bsAutoModal .bs-auto-check input{margin-top:2px;accent-color:#171F69}\n#bsAutoModal .bs-auto-hint{color:#6b7390;font-size:11.5px;font-weight:500}\n#bsAutoModal .bs-auto-note{background:#f6f8fc;border-left:3px solid #009AC7;padding:8px 11px;border-radius:0 5px 5px 0;font-size:12px;color:#3d4a63;margin-top:4px}\n#bsAutoModal .bs-auto-err{background:#fdecec;border-left:3px solid #E31937;padding:8px 11px;border-radius:0 5px 5px 0;font-size:12px;color:#8a1020;margin-top:9px}\n#bsAutoModal .bs-auto-result{margin-top:15px;border-top:1px solid #e5e9f2;padding-top:12px}\n#bsAutoModal .bs-auto-rh{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;color:#171F69;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}\n#bsAutoModal .bs-auto-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:11px}\n#bsAutoModal .bs-auto-kpis div{background:#f6f8fc;border-radius:7px;padding:9px 10px;border-top:3px solid #009AC7}\n#bsAutoModal .bs-auto-kpis b{display:block;font-family:'Barlow Condensed',sans-serif;font-size:22px;color:#171F69;line-height:1.05}\n#bsAutoModal .bs-auto-kpis span{display:block;font-size:10.5px;color:#5a6480;margin-top:3px;line-height:1.35}\n#bsAutoModal .bs-auto-tbl{width:100%;border-collapse:collapse;font-size:12px}\n#bsAutoModal .bs-auto-tbl th{background:#eef1f7;color:#171F69;text-align:left;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.04em}\n#bsAutoModal .bs-auto-tbl td{padding:4px 8px;border-bottom:1px solid #eef1f7;font-variant-numeric:tabular-nums}\n#bsAutoModal .bs-auto-tbl .sw{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:7px;vertical-align:-1px}\n#bsAutoModal .bs-auto-foot{display:flex;align-items:center;gap:10px;padding:12px 22px;border-top:1px solid #e5e9f2;background:#fafbfd;border-radius:0 0 14px 14px}\n#bsAutoModal .bs-auto-btns{margin-left:auto;display:flex;gap:8px}\n#bsAutoModal .bs-auto-btns button{border:1px solid #cdd6e4;background:#fff;color:#171F69;border-radius:7px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer}\n#bsAutoModal .bs-auto-btns .prim{background:#171F69;color:#fff;border-color:#171F69}\n#bsAutoModal .bs-auto-btns .go{background:#009AC7;border-color:#009AC7;color:#fff}\n#bsAutoModal .bs-auto-btns button[disabled]{opacity:.45;cursor:not-allowed}\n";
  document.head.appendChild(el);
}

window.renderBoundary = async function(){
  injectAutoCSS();
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
  S.levels = defaultLevels(12);
  S.adv = defaultAdv();
  syncLevels();
  el.innerHTML = `
    <div class="callout"><b>How it works:</b> pick an area chip, then click (or click-drag) counties to paint them in — or switch to <b>Paint whole state</b> for fast broad strokes, then refine county-by-county where the real lines matter (I&#8209;35, Southern&nbsp;California, Clark&nbsp;County). Unassigned counties are tinted navy by how many members live there, so the membership itself shows you where the lines want to go. Add or remove areas to test any structure &mdash; 12, 9, 6, whatever. Under <b>Names &amp; structure</b> you can rename every area and every level, and add or remove whole levels: nothing here assumes today's Region / Zone / E-W-C shape.
    <div class="bs-seedrow"><button class="tab" id="bsLoadOfficial" style="font-weight:800">Load Official 2026 Alignment</button>
      <span class="note">Traced from the published Regional Championship map plus the Region 4 / 10 / 11 / 12 notes.</span></div>
    <div class="bs-seedrow"><button class="tab" id="bsAutoOpen" style="font-weight:800;background:#009AC7;color:#fff;border-color:#009AC7">&#9889; Auto-draw the map&hellip;</button>
      <span class="note">Choose how many areas you want and it divides the country into that many connected, evenly-sized areas. A starting point &mdash; edit anything afterwards, or Undo.</span></div>
    <div class="bs-seedrow"><button class="tab" id="bsLoadSeed">Load attendance-based map</button>
      <span class="note">The older draft, built from which Regional meet each club actually attended. Useful for comparison, but it is not the published alignment.</span></div></div>
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
  document.addEventListener('keydown', e=>{
    if (!(e.ctrlKey || e.metaKey) || (e.key||'').toLowerCase() !== 'z') return;
    const view = document.getElementById('viewBoundary');
    if (!view || view.offsetParent === null) return;          // Boundary tab not showing
    const t = e.target;
    if (t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    if (e.shiftKey) doRedo(); else doUndo();
  });
  const offBtn = document.getElementById('bsLoadOfficial');
  if (offBtn) offBtn.addEventListener('click', ()=>loadScenario('seed-2026-official'));
  const autoBtn = document.getElementById('bsAutoOpen');
  if (autoBtn) autoBtn.addEventListener('click', openAutoDialog);
  const seedBtn = document.getElementById('bsLoadSeed');
  if (seedBtn) seedBtn.addEventListener('click', ()=>loadScenario('seed-2026-alignment'));
  S.booted = true;
};
})();
