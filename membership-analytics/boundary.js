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
  // Which inspector the right-hand panel is showing. The map is always on
  // screen; only this changes. map | structure | projection | money | schedule | report
  panelMode: 'map',
  brush: 0,             // 0 = one county; N = everything within N borders
  schedStop: null,      // which meet the Schedule tab is showing
  schedPlans: {},       // per-stop manual placements: {dayOf, split, minDays}
  schedRules: null,     // pool hours / events per session, when overridden
  cmpAxis: 'pathway',   // which thing varies between columns: pathway | map
  mapList: null,        // saved maps, for the map axis
  cmpIds: null,         // saved pathways or maps picked for side-by-side
  cmpRes: null,         // the built comparison
  pathSaved: null,      // {id,name} when the live pathway came from the library
  pathDirty: false,     // edited since it was loaded/saved
  flow: null,           // cached JuniorFlow result for the current map
  routing: null,        // editable qualification pathway (see routing.js)
  mult: null,           // measured entries-per-athlete (athlete-multiplicity.json)
  routeRes: null,       // its projection
  bdMode: 'stop',       // breakdown view: stop | total | qualified
  bdCell: 'all',        // which event+gender the panel is showing
  arrival: null,        // per-level arrival rate override
  seedPool: null,       // which observed field feeds the first stop
  fees: null,           // entry fee per level; null means the published ladder
  hostShare: 0.25,      // share of net entry income going to the host
  hostMode: 'pct',      // pct | flat | per_entry
  hostFlat: 3000,       // flat fee per meet
  hostPer: 15,          // dollars per entry
  hostMin: 0,           // guaranteed minimum, whichever model is used
  hostPer_stop: null,   // {levelIdx|groupIdx: dollars} — a negotiated figure for one meet
  tiersOpen: false,     // whether Names & structure is open, because YOU opened it
  frozen: null,         // {at, note, stamps, figures} once presented — see freezeScenario()
  loadedStamps: null,   // the data build a loaded scenario was saved against
  tripCost: null,       // per-stop travel and lodging
  costEvents: 2,        // events an athlete contests
  costElastic: null,    // how hard cost bites on take-up
  gender: null,         // gender-data.json
  evOpen: null,         // which level's events grid is expanded
  pathList: null,       // saved pathways
  pathName: '',         // the one currently loaded
  pathNotes: null,      // what adapting it changed
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
const usd = n => '$' + Math.round(Number(n)||0).toLocaleString('en-US');

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
  tallyInvalidate();
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
/* ============================================================================
   INCREMENTAL TALLIES
   The old computeTallies() walked all ~3,143 counties on every repaint, which
   is why painting needed a 180ms debounce and why the numbers arrived after
   your hand had already moved on.

   A stroke is not a new world. Moving one county from area A to area B is a
   two-area delta: subtract its statistics from A, add them to B. So the totals
   are kept as a live accumulator and maintained on assignment, rather than
   rebuilt by scanning. A stroke costs a fixed handful of arithmetic instead of
   a full pass, which is what lets the debounce go and the numbers move with
   the pointer.

   tallyBatch() -- the original full scan -- is kept deliberately. It is the
   oracle the incremental path is tested against: any divergence between the
   two is a bug in the accumulator, and a harness asserts they agree.
   ========================================================================= */

function emptyBucket(){
  return {m:0,a:0,c:0,cl:new Set(),zips:0,counties:0,countiesAssigned:0,ag:[0,0,0,0,0]};
}

/* Everything one county contributes, computed once and cached. This is the
   part that was being recomputed 3,143 times per repaint. */
function countyStat(fips){
  const cache = S._cstat || (S._cstat = {});
  const key = fips + '|' + S.year;
  if (cache[key]) return cache[key];
  const st = S.geo.stats[fips];
  const v = st && st[S.year];
  if (!v){ return (cache[key] = null); }
  const ag = S.age && S.age[fips] ? S.age[fips][S.year] : null;
  const rec = {
    m: v.m, a: v.a, c: v.c, cl: v.cl,
    zips: Object.keys(st.z).filter(z => st.z[z][S.year==='y25'?0:1] > 0).length,
    counted: v.m > 0 ? 1 : 0,
    ag: ag ? [0,1,2,3,4].map(j => ag[j]||0) : [0,0,0,0,0],
  };
  return (cache[key] = rec);
}

function addStat(tgt, rec, sign){
  if (!rec) return;
  tgt.m += sign*rec.m; tgt.a += sign*rec.a; tgt.c += sign*rec.c;
  tgt.zips += sign*rec.zips; tgt.counties += sign*rec.counted;
  for (let j=0;j<5;j++) tgt.ag[j] += sign*rec.ag[j];
  // Club sets cannot be decremented -- a club present in two counties is still
  // present when one leaves. Membership of the set is rebuilt for the two areas
  // an edit touches, which is bounded work, not a full scan.
  if (sign > 0) rec.cl.forEach(i => tgt.cl.add(i));
}

/* Rebuild the club set for one area only. Called for the two areas an edit
   touches, so it stays O(counties in those areas) rather than O(all). */
function rebuildClubs(gi, TG){
  const set = new Set();
  let assigned = 0;
  for (const fips in S.assign){
    const ri = S.assign[fips];
    if (ri==null || ri<0 || ri>=S.regions.length) continue;
    if (TG.of[ri] !== gi) continue;
    assigned++;
    const rec = countyStat(fips);
    if (rec) rec.cl.forEach(i => set.add(i));
  }
  return {cl:set, countiesAssigned:assigned};
}

/* The full scan. Correct by construction, used to seed the accumulator and as
   the oracle in tests. Never called on the paint path. */
function tallyBatch(){
  const y = S.year;
  const TG = tierGroups();
  const rows = TG.groups.map(()=>emptyBucket());
  const un = emptyBucket();
  for (const [fips, st] of Object.entries(S.geo.stats)){
    const v = st[y]; if (!v) continue;
    const ri = S.assign[fips];
    const gi = (ri==null || ri<0 || ri>=S.regions.length) ? -1 : TG.of[ri];
    const tgt = gi<0 ? un : rows[gi];
    addStat(tgt, countyStat(fips), 1);
  }
  Object.values(S.assign).forEach(ri => {
    if (ri>=0 && ri<S.regions.length) rows[TG.of[ri]].countiesAssigned++;
  });
  return {rows, un, TG};
}

/* The live accumulator. Invalidated whenever something the delta cannot track
   changes -- the season, the level structure, which tier is on screen. */
function tallyInvalidate(){ S._tally = null; }

function computeTallies(){
  const TG = tierGroups();
  const sig = S.year + '|' + S.tierView + '|' + TG.groups.length + '|' + S.regions.length;
  if (S._tally && S._tally.sig === sig) return S._tally.val;
  const val = tallyBatch();
  S._tally = {sig, val};
  return val;
}

/* Apply one county's move to the live totals. Returns false when the caller
   must fall back to a full rebuild. */
function tallyMove(fips, fromRi, toRi){
  const t = S._tally;
  if (!t) return false;                       // nothing to update yet
  const {rows, un, TG} = t.val;
  const rec = countyStat(fips);
  const bucket = ri => (ri==null || ri<0 || ri>=S.regions.length) ? un : rows[TG.of[ri]];
  const from = bucket(fromRi), to = bucket(toRi);
  if (from === to) return true;
  addStat(from, rec, -1);
  addStat(to,   rec, +1);
  const gFrom = (fromRi!=null && fromRi>=0 && fromRi<S.regions.length) ? TG.of[fromRi] : -1;
  const gTo   = (toRi  !=null && toRi  >=0 && toRi  <S.regions.length) ? TG.of[toRi]   : -1;
  // Club membership and assigned-county counts are set operations, so they are
  // recomputed for exactly the two areas involved.
  [gFrom, gTo].forEach(gi => {
    if (gi < 0) return;
    const r = rebuildClubs(gi, TG);
    rows[gi].cl = r.cl; rows[gi].countiesAssigned = r.countiesAssigned;
  });
  if (gFrom < 0 || gTo < 0){
    const set = new Set();
    for (const f in S.geo.stats){
      const ri = S.assign[f];
      if (ri!=null && ri>=0 && ri<S.regions.length) continue;
      const rc = countyStat(f); if (rc) rc.cl.forEach(i=>set.add(i));
    }
    un.cl = set;
  }
  return true;
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

/* No membership of any kind for the season on screen -- no members, no
   athletes, no coaches. Not the same as unassigned: an empty county can sit in
   the middle of an area and still count toward its size on a map while
   contributing nobody to it. Worth seeing while you are drawing. */
function countyEmpty(fips){
  const r = countyStat(fips);
  return !r || (!r.m && !r.a && !r.c);
}

/* Which colour slot a county belongs to. u = unassigned. An empty county keeps
   its area's colour, lightened, so it still reads as part of the area. */
function countyClass(fips){
  const ri = S.assign[fips];
  if (ri==null || ri<0 || ri>=S.regions.length) return 'a-u';
  const of = S._of || (S._of = tierGroups().of);
  return 'a-' + of[ri] + (countyEmpty(fips) ? ' e' : '');
}

/* Cached element lookup -- querySelector per county was a measurable share of
   the paint cost during a drag. */
function countyEl(fips){
  const m = S._els || (S._els = new Map());
  let el = m.get(fips);
  if (el && el.isConnected) return el;
  el = document.querySelector(`path.bcty[data-f="${fips}"]`);
  if (el) m.set(fips, el);
  return el;
}

/* The class is a pair now -- the area slot plus an optional empty marker -- so
   swap on the whole string rather than a single token. */
function setCountyClass(el, want){
  if (el._ac === want) return false;
  if (el._ac) el._ac.split(' ').forEach(c => c && el.classList.remove(c));
  want.split(' ').forEach(c => c && el.classList.add(c));
  el._ac = want;
  return true;
}

function paintCountyEl(fips){
  const el = countyEl(fips);
  if (!el) return;
  const want = countyClass(fips);
  if (!setCountyClass(el, want)) return;
  if (want === 'a-u') el.style.fill = fillFor(fips, S._maxM);   // heat tint is per-county
  else if (el.style.fill) el.style.fill = '';
}

/* Push the palette into CSS variables. This is the whole repaint for a colour
   or tier change: a dozen writes instead of three thousand. */
/* ---------- the empty-county tint ----------
   Counties with nobody in them keep their area's colour, lightened. The amount
   cannot be a fixed mix: lightening a near-black navy by 40% is an enormous
   jump that reads as a second area, while the same 40% on the pale sky blue is
   invisible. Measured across the brand palette a flat 0.42 mix ranged from
   1.32x to 3.69x apparent difference -- inconsistent in both directions.

   So it is solved per colour for a constant apparent difference instead. Every
   area separates by about the same amount, which is what makes it read as one
   signal rather than sixteen. */
function mixWhite(hex, t){
  const v = String(hex||'').replace('#','');
  if (v.length !== 6) return hex;
  const p = [0,2,4].map(i => parseInt(v.slice(i,i+2),16) || 0);
  return '#' + p.map(c => Math.round(c + (255-c)*t).toString(16).padStart(2,'0')).join('');
}
function relLum(hex){
  const v = String(hex||'').replace('#','');
  const p = [0,2,4].map(i => (parseInt(v.slice(i,i+2),16)||0)/255)
    .map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
  return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2];
}
function lumRatio(a, b){
  const la = relLum(a), lb = relLum(b);
  return (Math.max(la,lb) + 0.05) / (Math.min(la,lb) + 0.05);
}
const EMPTY_RATIO = 1.62;    // noticed on a scan, never mistaken for another area
const EMPTY_MAX_MIX = 0.62;  // a very light area cannot reach it -- cap rather than bleach
const UNASSIGNED_FLOOR = 190;// below this, two fills read as the same colour
const _emptyTint = {};
function emptyTint(hex){
  if (_emptyTint[hex]) return _emptyTint[hex];
  let lo = 0.05, hi = EMPTY_MAX_MIX;
  for (let i = 0; i < 24; i++){
    const m = (lo + hi) / 2;
    if (lumRatio(hex, mixWhite(hex, m)) < EMPTY_RATIO) lo = m; else hi = m;
  }
  let mix = Math.min(EMPTY_MAX_MIX, (lo + hi) / 2);

  /* An already-pale area is the awkward case: lightening the sky blue enough to
     read as "emptier" walks it straight into the grey used for unassigned, and
     an empty county reading as UNASSIGNED is a worse error than one that is
     merely subtle -- it changes what the map says rather than how loudly it
     says it. So back the mix off until the tint is clearly not that grey, even
     at the cost of the signal. If it cannot separate at all, leave the colour
     alone rather than print something misleading. */
  while (mix > 0.02 && colorDistance(mixWhite(hex, mix), UNASSIGNED_BASE) < UNASSIGNED_FLOOR) mix -= 0.02;
  if (colorDistance(mixWhite(hex, mix), UNASSIGNED_BASE) < UNASSIGNED_FLOOR) mix = 0;
  return (_emptyTint[hex] = mixWhite(hex, mix));
}

function syncPalette(){
  const svg = document.getElementById('bsSvg');
  if (!svg) return;
  S._of = tierGroups().of;
  const n = groupCountAt(S.tierView);
  for (let gi=0; gi<n; gi++){
    const c = groupColor(gi);
    svg.style.setProperty('--a'+gi, c);
    svg.style.setProperty('--a'+gi+'e', emptyTint(c));
  }
  svg.style.setProperty('--a-u', UNASSIGNED_BASE);
  // Retire variables from a structure with more areas than this one.
  for (let gi=n; gi<n+24; gi++){
    svg.style.removeProperty('--a'+gi);
    svg.style.removeProperty('--a'+gi+'e');
  }
}

function renderMapOnce(){
  const geo = S.geo;
  S._maxM = Math.max(1, ...Object.values(geo.stats).map(s=>s[S.year].m));
  S._of = tierGroups().of;
  // Fill comes from a CSS variable chosen by the area class, not an inline
  // attribute. Repainting the whole map is then a dozen variable writes rather
  // than 3,143 DOM mutations, and a single county move is one class swap.
  const paths = geo.counties.map(c=>
    `<path class="bcty ${countyClass(c.f)}" data-f="${c.f}" d="${c.d}"/>`).join('');
  syncPalette();
  document.getElementById('bsSvgG').innerHTML = paths +
    `<path d="${geo.stateMesh}" fill="none" stroke="#ffffff" stroke-width="1.4" pointer-events="none"/>` +
    `<path d="${geo.nationMesh}" fill="none" stroke="#94a3b8" stroke-width="1" pointer-events="none"/>`;
  S._els = null;                 // element cache is stale after a full re-render
  document.querySelectorAll('path.bcty').forEach(el=>{
    el._ac = countyClass(el.dataset.f);
    if (el._ac === 'a-u') el.style.fill = fillFor(el.dataset.f, S._maxM);
  });
  applyZoom();
}

function repaintAll(){
  S._maxM = Math.max(1, ...Object.values(S.geo.stats).map(s=>s[S.year].m));
  S._of = tierGroups().of;
  syncPalette();
  // Only counties whose slot actually changed are touched.
  document.querySelectorAll('path.bcty').forEach(el=>{
    const want = countyClass(el.dataset.f);
    if (!setCountyClass(el, want)){
      if (want === 'a-u') el.style.fill = fillFor(el.dataset.f, S._maxM);
      return;
    }
    el.style.fill = (want === 'a-u') ? fillFor(el.dataset.f, S._maxM) : '';
  });
}

function applyZoom(){
  const g = document.getElementById('bsSvgG');
  if (g) g.setAttribute('transform', `translate(${S.zoom.x},${S.zoom.y}) scale(${S.zoom.k})`);
}

/* ---------- panel ---------- */

/* Keeping your place across a redraw lives in shared/usad-keepplace.js. The
   open/closed state of Names & structure is handled there too, so S.tiersOpen
   only has to record what the user chose. */


/* ---------- time zones ----------
   An area spanning two time zones is a scheduling problem before it is anything
   else: warm-ups, session starts and travel days all have to be quoted in
   something, and half the area reads it wrong. It also lengthens the real
   travel day at one end without showing up in a mileage figure.

   Most states sit wholly in one zone. Thirteen do not, and rather than pretend
   otherwise the split ones are handled by name where the list is short and
   exact, and by an east/west line through the state where it is long. The line
   is drawn on the map's own projected coordinates, so it follows the map rather
   than a longitude the map does not use.

   This is good enough to plan around and NOT a legal boundary: the Navajo
   Nation observes DST inside Arizona, a few counties straddle the line
   properly, and no attempt is made to model either. It is labelled as
   approximate wherever it is shown. */
const TZ_STATE = {
  CT:'ET', DE:'ET', DC:'ET', GA:'ET', ME:'ET', MD:'ET', MA:'ET', NH:'ET', NJ:'ET',
  NY:'ET', NC:'ET', OH:'ET', PA:'ET', RI:'ET', SC:'ET', VT:'ET', VA:'ET', WV:'ET',
  AL:'CT', AR:'CT', IL:'CT', IA:'CT', LA:'CT', MN:'CT', MS:'CT', MO:'CT', OK:'CT', WI:'CT',
  AZ:'MT', CO:'MT', MT:'MT', NM:'MT', UT:'MT', WY:'MT',
  CA:'PT', WA:'PT', NV:'PT',
  AK:'AKT', HI:'HAT', PR:'AST', VI:'AST', GU:'ChT',
  // Split states, listed by the zone MOST of the state keeps. Without these
  // every county not named in an exception list below falls through with no
  // zone at all -- 804 of them, including Houston, Miami and Detroit.
  TX:'CT', FL:'ET', MI:'ET', IN:'ET', KS:'CT', NE:'CT', ND:'CT', SD:'CT',
  OR:'PT', ID:'MT',
};
/* Short, exact county lists. */
const TZ_COUNTY = {};
[['MI','CT',['26053','26071','26043','26109']],                       // western UP
 ['TX','MT',['48141','48229']],                                       // El Paso, Hudspeth
 ['KS','MT',['20181','20199','20071','20075']],                       // NW corner
 ['OR','MT',['41045']],                                               // Malheur
 ['ID','PT',['16055','16017','16009','16021','16035','16057','16069','16079']],
 ['FL','CT',['12005','12013','12033','12045','12059','12063','12091','12113','12131','12133']],
 ['IN','CT',['18051','18173','18163','18129','18147','18123','18125','18037','18027','18083','18101','18089','18127','18091','18073','18111']],
 ['NE','MT',['31007','31015','31029','31033','31045','31049','31057','31069','31091','31105','31123','31135','31157','31161','31165']],
 ['ND','MT',['38007','38011','38013','38025','38033','38037','38041','38043','38053','38059','38065','38085','38087','38089']],
 ['SD','MT',['46007','46019','46031','46033','46047','46055','46063','46071','46081','46093','46102','46103','46105','46113','46117','46137']],
].forEach(([st,tz,list]) => list.forEach(f => { TZ_COUNTY[f] = tz; }));

/* Long splits, drawn on the map's own x axis rather than a county list.
   Threshold is a projected x in the viewBox; west of it is the earlier zone. */
/* Calibrated against counties whose zone is not in doubt: in Kentucky the line
   falls between Bowling Green (Central, x 670) and Louisville (Eastern, x 680);
   in Tennessee between Nashville (Central, x 665) and Knoxville (Eastern,
   x 717), which is roughly the Cumberland Plateau where the real line runs. */
const TZ_LINE = { KY:{split:675, west:'CT', east:'ET'},
                  TN:{split:692, west:'CT', east:'ET'} };

const TZ_NAME = {ET:'Eastern', CT:'Central', MT:'Mountain', PT:'Pacific',
                 AKT:'Alaska', HAT:'Hawaii', AST:'Atlantic', ChT:'Chamorro'};

function tzOf(fips, st, cx){
  if (TZ_COUNTY[fips]) return TZ_COUNTY[fips];
  const line = TZ_LINE[st];
  if (line && cx != null) return cx < line.split ? line.west : line.east;
  return TZ_STATE[st] || null;
}

/* Which zones an area covers, and how its members split across them. */
/* A per-county zone array in the optimiser's own index order, so scoring can
   ask "same zone?" without a lookup per comparison. */
function tzIndexFor(A){
  if (!A || !A.fips) return null;
  const codes = ['ET','CT','MT','PT','AKT','HAT','AST','ChT'];
  const out = new Int8Array(A.fips.length);
  for (let i = 0; i < A.fips.length; i++){
    const z = tzOf(A.fips[i], A.st ? A.st[i] : null, A.cx ? A.cx[i] : null);
    out[i] = z ? codes.indexOf(z) : -1;
  }
  return out;
}

function tzSpread(){
  // auto-data.json carries the county list with state codes and projected
  // centroids. It loads lazily, so this reports nothing until the auto-draw
  // panel has been opened once -- which is honest, not a failure.
  const A = (typeof autoData === 'function') ? autoData() : null;
  const out = S.regions.map(() => ({}));
  if (!A || !A.fips) return out;
  for (let i = 0; i < A.fips.length; i++){
    const f = A.fips[i];
    const r = S.assign[f];
    if (r == null || r < 0 || r >= out.length) continue;
    const z = tzOf(f, A.st ? A.st[i] : null, A.cx ? A.cx[i] : null);
    if (!z) continue;
    const w = (S.geo && S.geo.stats && S.geo.stats[f] && S.geo.stats[f][S.year])
            ? (S.geo.stats[f][S.year].m || 0) : 0;
    out[r][z] = (out[r][z] || 0) + Math.max(w, 0.001);
  }
  return out;
}

function tzReport(){
  const sp = tzSpread();
  const split = [];
  sp.forEach((z, r) => {
    const keys = Object.keys(z);
    if (keys.length <= 1) return;
    const tot = keys.reduce((a,k)=>a+z[k], 0);
    const sorted = keys.sort((a,b)=>z[b]-z[a]);
    split.push({region:r, name:(S.regions[r]||{}).name || ('Area '+(r+1)),
                zones:sorted.map(k=>({tz:k, name:TZ_NAME[k]||k, share:z[k]/tot})),
                minority: 1 - z[sorted[0]]/tot});
  });
  return {split, total: sp.length};
}

function renderPanel(){
  const _place = keepPlace('bsPanel');
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
      <div class="bs-brush" title="How wide the paint brush is. [ and ] change it.">
        <button class="tab bs-mini" id="bsBrushDown" aria-label="Decrease paint brush size">&minus;</button>
        <span class="bs-brush-l">Brush <b id="bsBrushLbl">${S.brush===0?'single county':S.brush+' deep'}</b></span>
        <button class="tab bs-mini" id="bsBrushUp" aria-label="Increase paint brush size">+</button>
      </div>
      <div class="seg">
        <button id="bsY25" class="${y==='y25'?'on':''}">2025</button>
        <button id="bsY26" class="${y==='y26'?'on':''}">2026 YTD</button>
      </div>
      <div class="seg">
        <button id="bsZoomIn" aria-label="Zoom in on map">+</button><button id="bsZoomOut" aria-label="Zoom out on map">&minus;</button><button id="bsZoomReset">Reset view</button>
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
      <button class="bs-chip add" id="bsPalOpen" title="Search every action, map, pathway and area (Ctrl+K)">Search actions &#8984;K</button>
      <button class="bs-chip add" id="bsSepColors" title="Give any two areas that share a border colours you can actually tell apart">Separate touching colours</button>
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
      ${INSPECTORS.map(t=>`<button data-insp="${t.k}" class="${S.panelMode===t.k?'on':''}" title="${esc(t.hint)}">${esc(t.label)}</button>`).join('')}
    </div>
    <div id="bsBody"></div>
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
    ${S.frozen ? `<div class="note bs-frozen-tag"><b>Frozen ${esc(String(S.frozen.at||'').slice(0,10))}</b>${
      S.frozen.note?` &mdash; ${esc(S.frozen.note)}`:''}. What it said then is recorded; see <b>Report</b>.</div>` : ''}
    <div class="note" id="bsMsg"></div>`;

  if (S.panelMode!=='map') renderInspectorShell();
  // The map never leaves the screen. It used to be pushed below the fold
  // whenever the pathway was open, which is exactly when you most want to see
  // which area you are reading numbers for.
  const lay = document.querySelector('.bs-layout');
  if (lay) lay.classList.remove('bs-wide');
  renderNumbers();
  wirePanel();
  wireCrossHighlight();
  keepRestore(_place, 'bsPanel');
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

  if (S.panelMode==='map'){
    const body = document.getElementById('bsBody');
    if (body) body.innerHTML = renderTallyTable(t, mappableTotal, yLabel) + renderBalanceStrip();
    wireTallyRows();
    refreshFlow();          // the balance strip needs the flow too
  } else {
    refreshFlow();
  }
  renderLegend(t, mappableTotal, yLabel);
  renderConsequenceStrip();
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

  return `<details class="bs-tiers" ${S.tiersOpen ? 'open' : ''}>
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
    ${renderSeedPoolPicker()}
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

/* Any edit to the routing means the pathway on screen is no longer the one
   that was loaded from the library. Say so rather than let a changed pathway
   keep a saved pathway's name on a committee paper. */
function markPathwayEdited(){
  if (S.pathSaved) S.pathDirty = true;
  S.dirty = true;
}

function syncRouting(){
  tallyInvalidate();
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
  if (!S.gender){
    try {
      const g = await fetch('gender-data.json?v=' + Date.now().toString(36).slice(0,5));
      S.gender = g.ok ? await g.json() : null;
    } catch(e){ S.gender = null; }
  }
  return S.mult;
}

/* Two projections of the same pathway. `qualified` is what the rules entitle
   people to; `expected` applies the take-up measured from the season we ran,
   because the published rules always qualify more athletes than turn up. Asked
   "how many could register", the honest answer is both numbers. */
/* The arrival rate: how big a field actually turns out to be, against the size
   the rules alone would send. Above 100% means extra athletes arrive by a route
   the bands do not describe -- the average-score pathway. Below means qualified
   athletes decline their place, which is the usual case.

   This used to be a hidden per-cell constant lifted from the calibrated
   alignment, and it was wrong in a way that erased events. Sixteen of the 24
   cells carry a measured rate of ZERO at the second level -- every platform
   event and all of Groups C and D -- not because nobody turns up, but because
   under current rules those cohorts do not ADVANCE into Zones at all. Platform
   is non-qualifying at Regionals and Groups C and D auto-advance, so their
   arrival was never measured as advancement. Multiplying a hypothetical pathway
   by that zero deleted those events from the projection entirely.

   So it is now one visible, editable rate per level, defaulted from the mean of
   the cells that WERE measured, and shown on the panel. A number this
   consequential should not be invisible. */
/* Which real advancement stage a Boundary Studio level actually IS --
   Regionals, Zones or EWC -- inferred from its own name, the same way
   seedStage() already infers the first stop's feeder pool. This exists because
   Pricing Studio's calibration is keyed by a FIXED position (0 Regionals,
   1 Zones, 2 EWC) but a Boundary Studio scenario is free to drop a level --
   a pathway that starts at Zones is one level shorter than the reference
   structure, and reading calibration by raw index would silently hand EWC's
   arrival rate to Zones, or Zones' rate to EWC. Naming the stage and looking
   it up by name instead of position is what keeps the two arrays honest
   about each other regardless of how many levels either one has.
   National / the championship matches nothing here on purpose: Pricing
   Studio's conv/directAt scheme never modelled arrival into the championship
   (that comes from real Nationals entries loaded separately), so a level
   named "National" correctly finds no stage and reports unmeasured. */
function stageNameForLevel(L){
  const n = String(tierName(L) || '').toLowerCase();
  if (/region/.test(n)) return 'Regionals';
  if (/zone/.test(n)) return 'Zones';
  if (/east|west|central|e\s*\/\s*w\s*\/\s*c|\bewc\b/.test(n)) return 'EWC';
  return null;
}

function measuredArrival(L){
  try {
    const k = window.JuniorFlow && window.JuniorFlow.constants
            ? window.JuniorFlow.constants(S.year) : null;
    if (!k || !k.usable) return null;
    const stage = stageNameForLevel(L);
    const lv = stage && k.byStage ? k.byStage[stage] : null;
    if (!lv || !lv.conv) return null;
    const vals = Object.keys(lv.conv).map(c => lv.conv[c]).filter(v => v > 0);
    if (!vals.length) return null;
    return vals.reduce((a,b)=>a+b, 0) / vals.length;
  } catch(e){ return null; }
}

function arrivalRate(L){
  if (S.arrival && S.arrival[L] != null) return S.arrival[L];
  const m = measuredArrival(L);
  return m == null ? 1 : m;
}

/* Which observed field feeds the first stop. A structure whose first stop is a
   Zone championship must be seeded from the Zone pool, not the Regional one:
   platform is exhibition at Regionals, so seeding from there gives Group A
   girls 25 platform entries where the real Zone field is 136. Inferred from the
   level's own name, and shown so it can be corrected. */
const SEED_STAGES = ['Regionals','Zones','EWC','Nationals'];

/* The highest real, ever-observed entry total for a stage, across every year
   advance-data.json carries. This is the check that would have caught the
   seedStage bug automatically: a "Zones" seeded from the wrong pool produced
   an E/W/C field several times larger than E/W/C has ever actually run, and
   nothing said so until it was found by hand. Real data only -- never a
   projection compared against another projection. */
function historicalCeiling(stageName){
  if (!stageName || !S.advData || !S.advData.pools) return null;
  let max = null;
  for (const key in S.advData.pools){
    const [, stage] = key.split('|');
    if (stage !== stageName) continue;
    const P = S.advData.pools[key];
    let total = 0;
    for (const fips in P) for (const c in P[fips]) total += P[fips][c];
    if (max == null || total > max) max = total;
  }
  return max;
}
/* How far over the real historical ceiling counts as "look at this before you
   trust it" rather than ordinary season-to-season variation. Real fields move
   10-20% year to year; a real proposal can legitimately run larger once
   qualification cuts change. 75% headroom is generous on purpose -- this is a
   tripwire for a wrong seed pool or an unintended band, not a policy opinion
   about how big a stage should be. */
const SANITY_HEADROOM = 1.75;
function seedStageInferred(){
  const n = String(tierName(0)||'').toLowerCase();
  if (/zone/.test(n)) return 'Zones';
  if (/east|west|central|e\/w\/c/.test(n)) return 'EWC';
  if (/national/.test(n)) return 'Nationals';
  return 'Regionals';
}
function seedStage(){
  if (S.seedPool) return S.seedPool;
  return seedStageInferred();
}

/* Which real field seeds Level 1 used to be guessed silently from Level 1's
   name -- right for a scenario that keeps Regionals as-is and only redraws
   Zones-and-up, wrong for a scenario that DELETES a stage and has Level 1
   absorb its job (a "Zones" that is really doing Regionals' old work gets
   seeded from the real, already-filtered Zone field, which is too small by
   construction and understates every number above it). Surfacing the choice
   here, instead of leaving it to a name match, is the fix: whoever builds the
   scenario sees it and can correct it, rather than the tool guessing wrong in
   a way nobody notices until the numbers don't add up. */
function renderSeedPoolPicker(){
  const inferred = seedStageInferred();
  const effective = seedStage();
  const overridden = !!S.seedPool;
  const total = seedTotal();
  return `<div class="note bs-seedpool" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bs-line,#e5e7eb)">
    <label class="bs-tier-row"><span class="bs-lvl">Seed Level 1 (${esc(tierName(0))}) from</span>
      <select class="sel" id="bsSeedPool">
        <option value="" ${!overridden?'selected':''}>Auto (currently: ${inferred})</option>
        ${SEED_STAGES.map(s=>`<option value="${s}" ${overridden && S.seedPool===s?'selected':''}>${s} (real, always)</option>`).join('')}
      </select>
    </label>
    <div style="margin-top:4px">Currently seeding from real <b>${effective} ${S.year==='y25'?'2025':'2026'}</b> data — ${total.toLocaleString()} real entries, before this level's own advancement rule is applied.
    ${overridden ? '' : `If Level 1 has taken over a stage this map used to have below it (e.g. it now absorbs what Regionals used to do), auto-detect will seed it from the wrong, already-filtered field — pick the correct one explicitly above.`}</div>
  </div>`;
}
function seedPoolKey(){ return (S.year==='y25'?'2025':'2026') + '|' + seedStage(); }
function seedRows(){
  const n = Math.max(1, groupCountAt(0));
  const rows = Array.from({length:n}, () => ({}));
  const P = S.advData && S.advData.pools ? S.advData.pools[seedPoolKey()] : null;
  if (!P) return rows;
  for (const fips in P){
    const ri = S.assign[fips];
    if (ri == null || ri < 0 || ri >= n) continue;
    const cells = P[fips];
    for (const c in cells) rows[ri][c] = (rows[ri][c]||0) + cells[c];
  }
  return rows;
}
function seedTotal(){
  const P = S.advData && S.advData.pools ? S.advData.pools[seedPoolKey()] : null;
  if (!P) return 0;
  let t = 0; for (const f in P) for (const c in P[f]) t += P[f][c];
  return t;
}

function projectPathway(withTakeUp){
  S._cr = null;
  if (!QR() || !S.flow) return null;   // caller must have refreshed the flow
  syncRouting();
  const cells = CELLS;
  const conv = {};
  S.takeUp = null;
  if (withTakeUp !== false){
    let anyMeasured = false;
    for (let L = 1; L < S.routing.length; L++){
      const r = arrivalRate(L);
      if (measuredArrival(L) != null) anyMeasured = true;
      if (Math.abs(r - 1) > 0.001){
        const m = {}; cells.forEach(c => { m[c] = r; });
        conv[L] = m;
      }
    }
    let basis = null;
    try { const k = window.JuniorFlow.constants(S.year); basis = k && k.basis; } catch(e){}
    S.takeUp = {basis, usable: anyMeasured};
  }
  return QR().project({
    routing: S.routing,
    entries0: seedRows(),
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
   14-15 girls will be on the 3-meter board in the semi-final", which is the
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


/* Which events a stage contests. Platform is exhibition at Regionals today and
   Groups C and D do not appear there at all, but a proposal can change either.
   Rather than bake the current rules in, every event is a switch per stage. */

/* ---------- the membership pool ----------
   Everything else here is seeded from athletes who competed. This is seeded
   from athletes who merely EXIST: everyone holding a junior membership in the
   area a stop draws from. It answers a different question -- not "how many will
   turn up under current behaviour" but "how many could".

   Two conversions stand between a member and an entry, and both are measured
   rather than assumed: what share of members compete at all, and what share of
   competitors contest each board. Both are shown, because a projection built on
   two silent multipliers is not one anybody should trust. */
function memberPool(L){
  const n = Math.max(1, groupCountAt(L));
  const rows = Array.from({length:n}, () => ({A:0,B:0,C:0,D:0}));
  if (!S.age) return rows;
  const idx = {D:0, C:1, B:2, A:3};
  for (const fips in S.age){
    const rec = S.age[fips][S.year];
    if (!rec) continue;
    const ri = S.assign[fips];
    if (ri == null || ri < 0 || ri >= S.regions.length) continue;
    const gi = groupUp(0, ri, L);
    if (gi == null || gi >= n) continue;
    for (const a in idx) rows[gi][a] += (rec[idx[a]] || 0);
  }
  return rows;
}

/* Gender split per county, name-matched where known and filled locally where
   not. Falls back to an even split rather than guessing a national ratio. */
function genderSplit(){
  const g = S.gender && S.gender.counties;
  if (!g) return null;
  const tot = {A:[0,0], B:[0,0], C:[0,0], D:[0,0]};
  const order = ['D','C','B','A'];
  for (const f in g){
    const v = g[f][S.year];
    if (!v) continue;
    order.forEach((a,i) => { tot[a][0] += (v[i]||0); tot[a][1] += (v[i+4]||0); });
  }
  const out = {};
  order.forEach(a => {
    const s = tot[a][0] + tot[a][1];
    out[a] = s > 0 ? [tot[a][0]/s, tot[a][1]/s] : [0.5, 0.5];
  });
  return out;
}

/* What share of members actually compete, measured at the seeded stage. */
function competeRate(){
  const pool = memberPool(0).reduce((s,r) => s + r.A + r.B + r.C + r.D, 0);
  if (!pool) return null;
  const seed = seedRows();
  const entries = seed.reduce((s,r) => s + CELLS.reduce((q,c)=>q+(r[c]||0), 0), 0);
  const mult = S.mult && S.mult.cells && S.mult.cells[seedPoolKey().replace('|','|')];
  // Entries are athlete-events; divide by events-per-athlete to get people.
  let per = 2.0;
  try {
    const b = S.mult.cells[seedPoolKey()];
    const vals = Object.values(b).map(x => x.entries_per_athlete).filter(Boolean);
    if (vals.length) per = vals.reduce((a,b2)=>a+b2,0)/vals.length;
  } catch(e){}
  return {members: pool, competitors: entries/per, rate: (entries/per)/pool, per};
}

function renderEventGrid(L){
  const off = new Set(S.routing[L].notOffered || []);
  const head = ['A','B','C','D'].map(a=>`<th colspan="2">${esc(AGE_LBL[a])}</th>`).join('');
  const sub  = ['A','B','C','D'].map(()=>'<th class="num">Boys</th><th class="num">Girls</th>').join('');
  const body = ['1','3','P'].map(d => {
    const tds = ['A','B','C','D'].flatMap(a => ['B','G'].map(g => {
      const c = a+g+d;
      return `<td class="num"><label class="bs-ev-c"><input type="checkbox" data-ev="${c}" data-evl="${L}"
        ${off.has(c)?'':'checked'}></label></td>`;
    })).join('');
    return `<tr><td class="ps-sub">${esc(DIS_LBL[d])}</td>${tds}</tr>`;
  }).join('');
  return `<div class="bs-evgrid">
    <div class="bs-cg-head"><span>Events contested at <b>${esc(tierName(L))}</b></span>
      <span>
        <button class="tab bs-mini" data-evall="${L}">all on</button>
        <button class="tab bs-mini" data-evnone="${L}" title="Turn platform off for every age group">platform off</button>
      </span></div>
    <table class="ps-tbl bs-cg"><thead><tr><th></th>${head}</tr><tr><th></th>${sub}</tr></thead>
      <tbody>${body}</tbody></table>
    <p class="note">Unticking an event means this stage does not hold it. Athletes are not carried into an
      event a stage does not run.</p>
  </div>`;
}

function renderPathwayBreakdown(res){
  if (!res) return '';
  const mode = S.bdMode || 'stop';
  const qual = (mode === 'qualified') ? projectPathway(false) : null;
  const src = qual || res;
  const gsplit = (mode === 'members') ? genderSplit() : null;
  const pools = (mode === 'members') ? {} : null;

  const cols = [];
  S.routing.forEach((lvl, L) => QR().roundsOf(lvl).forEach(r => {
    cols.push({L, key:r.key, name: tierName(L), round: QR().ROUND_NAME[r.key] || r.key,
               stops: groupCountAt(L)});
  }));

  /* Across every stop, and at a single one. The per-stop figure is the field a
     diver actually stands in and the session an official actually runs -- a
     total spread over three championships tells you neither. */
  /* Spots: what the bands create, before anyone exists.
     Members: how many athletes hold a membership in the area this stop draws
     from, converted to entries by the measured share who compete and the
     measured share who contest each board. */
  const capAt = (c, cell) => {
    const v = QR().capacityAt(S.routing, c.L, c.key, L2 => groupCountAt(L2), cell);
    return isFinite(v) ? v : 0;
  };
  const memAt = (c, cell) => {
    if (!pools[c.L]) pools[c.L] = memberPool(c.L);
    const ag = cell[0], gd = cell[1], bd = cell[2];
    const rows = pools[c.L];
    const people = rows.reduce((s,r) => s + (r[ag]||0), 0);
    const gs = gsplit ? gsplit[ag] : [0.5,0.5];
    const share = gd === 'B' ? gs[0] : gs[1];
    // Of members, the share who compete; of competitors, the share on this board.
    const cr = S._cr || (S._cr = competeRate());
    const rate = cr ? cr.rate : 0.4;
    let boardShare = 0.6;
    try {
      const blk = S.mult.cells[seedPoolKey()][ag+gd];
      boardShare = QR().boardShare(blk.combinations, bd);
    } catch(e){}
    return people * share * rate * boardShare;
  };
  const at = (c, cell) => {
    if (mode === 'spots')   { const v = capAt(c, cell); return {tot:v, per:v/Math.max(1,c.stops), lo:0, hi:0}; }
    if (mode === 'members') { const v = memAt(c, cell); return {tot:v, per:v/Math.max(1,c.stops), lo:0, hi:0}; }
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
    if (mode === 'spots' || mode === 'members')
      return {tot:t, per:t/Math.max(1,c.stops), lo:0, hi:0};
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

  const cr = (mode === 'members') ? (S._cr || (S._cr = competeRate())) : null;
  const note = mode === 'spots'
    ? 'Places the bands create, before any athlete exists. The entry stop is blank because nothing routes into it — its size is whoever enters. A round with far more places than field is a formality rather than a selection.'
    : mode === 'members'
      ? (cr ? `Everyone holding a junior membership where each stop draws from, converted at the measured
              ${Math.round(cr.rate*100)}% of members who compete (${fmt(Math.round(cr.members))} members,
              about ${fmt(Math.round(cr.competitors))} competing) and the measured share contesting each board.
              This is who COULD be there, not who would. Membership does not thin as you climb the pathway
              &mdash; above the entry stop the population is whoever qualified, so only the per-stop figure
              means anything here: it is the catchment each meet draws from.`
            : 'Membership pool could not be worked out.')
    : mode === 'stop'
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
        <button data-bd="spots" class="${mode==='spots'?'on':''}">Spots the structure creates</button>
        <button data-bd="members" class="${mode==='members'?'on':''}">Membership pool</button>
      </div>
      <span class="note">${note}</span></div>
    <div class="bs-bd-scroll"><table class="bs-drill bs-bd-tbl bs-cell-tbl">
      <thead><tr><th>Age group / event</th>${head}</tr></thead>
      <tbody>${body}<tr class="bs-bd-tot"><td><b>All events</b></td>${totals}</tr></tbody>
    </table></div>
  </div>`;
}



/* ---------- the meet manifest ----------
   A schedule is built one meet at a time. This lists every stop at every level
   with the events it runs and how big each field is, because "E/W/C prelims are
   1,316" is not something anyone can timetable -- East, Central and West each
   run their own competition and they are not the same size.

   Two scheduling rules shape the summary:
     prelims and finals of an event are the same day, so an event is one day's
     commitment rather than two;
     an age group and gender does not contest more than one event in a day, so
     the days a meet needs is at least the number of events its busiest
     age-and-gender block runs.
   ------------------------------------------------------------------------- */

/* ---------- per-meet money ----------
   What each stop draws and what it is worth, because a host bidding for a Zone
   or an E/W/C is bidding on a field size nobody can currently tell them.

   The reason to look at this before drawing lines rather than after: under the
   worked scenario East draws 259 entries and Central 691 at the same tier. A
   percentage cut pays Central's host 2.7 times East's for running the same
   meet; a flat fee may not cover East's pool rental. Neither is a fee problem.
   It is the map, and it is only fixable while the map is still being drawn. */
const DEFAULT_FEES = [85, 90, 115, 125];
function feeFor(L){
  if (S.fees && S.fees[L] != null) return S.fees[L];
  const n = S.levels.length;
  // Last level is the championship; otherwise walk the published ladder.
  if (L === n - 1) return DEFAULT_FEES[3];
  return DEFAULT_FEES[Math.min(L + (n <= 3 ? 1 : 0), 2)];
}
const LEVY = 4.90;

/* How a host is paid. A percentage is only one of the answers, and on an
   unbalanced tier it is the worst of them: at 44x apart it pays one host
   forty-four times another for running the same meet. A flat fee inverts the
   problem -- fine for the small meet, trivial for the large one. Per-entry sits
   between. A guaranteed minimum on top of any of them is what actually makes a
   small meet biddable, so it is a separate lever rather than a fourth mode. */
function meetKey(m){ return m.level + '|' + m.gi; }

function meetMoney(m){
  const fee = feeFor(m.level);
  const gross = m.entries * fee;
  const levy = m.entries * LEVY;
  const net = gross - levy;
  const mode = S.hostMode || 'pct';
  // A negotiated figure for one meet beats any formula. Hosts are dealt with
  // individually -- a facility with its own board, a city bidding to attract a
  // championship, a small stop that needs underwriting -- and a single rule
  // across a tier that is 44x apart was never going to survive contact with
  // that. The model stays as the default for every stop nobody has set.
  const ov = S.hostPer_stop && S.hostPer_stop[meetKey(m)];
  const overridden = ov != null && ov !== '';
  let host = overridden ? (+ov || 0)
           : mode === 'flat'      ? (+S.hostFlat || 0)
           : mode === 'per_entry' ? m.entries * (+S.hostPer || 0)
           :                        net * (S.hostShare || 0);
  // A minimum is a floor under the MODEL, not a second-guess of a figure
  // someone has agreed.
  const floored = !overridden && (+S.hostMin || 0) > host;
  if (floored) host = +S.hostMin;
  // A host cut cannot exceed what the meet actually took.
  const capped = host > net;
  if (capped) host = net;
  return {fee, gross, levy, net, host, usad: net - host, floored, capped, overridden,
          pct: net > 0 ? host/net : 0};
}

/* Largest against smallest within a tier: the number a host cut lives or dies
   on. */
function tierSpread(meets){
  const byLevel = {};
  meets.forEach(m => (byLevel[m.level] = byLevel[m.level] || []).push(m.entries));
  const out = {};
  for (const L in byLevel){
    const v = byLevel[L].filter(x => x > 0);
    if (v.length < 2) continue;
    const lo = Math.min(...v), hi = Math.max(...v);
    const mean = v.reduce((a,b)=>a+b,0)/v.length;
    out[L] = {lo, hi, ratio: lo ? hi/lo : Infinity, mean, n: v.length};
  }
  return out;
}

function meetManifest(res){
  if (!res) return [];
  const out = [];
  S.routing.forEach((lvl, L) => {
    const TG = tierGroupsAt(L);
    const rounds = QR().roundsOf(lvl);
    TG.groups.forEach((g, gi) => {
      const events = [];
      let entries = 0, spots = 0;
      const blocks = {};
      CELLS.forEach(cell => {
        /* An entry is a person JOINING this meet, wherever they join it.
           Qualifying out of the prelim into the final of the same meet is not a
           second entry and carries no second fee -- but an athlete seeded
           straight into a later round from the stage below IS entering, and the
           2026 rules do exactly that. Reading the first round alone was short
           by everyone who skipped a stage; summing the rounds would have
           charged the finalists twice. Arrivals are neither. */
        const n = QR().entriesCellAt(res, L, gi, cell);
        if (n < 0.5) return;
        const first = rounds[0].key;
        const byRound = {};
        rounds.forEach(r => {
          const ff = res.field[L] && res.field[L][r.key];
          byRound[r.key] = ff && ff[gi] ? Math.round(ff[gi][cell] || 0) : 0;
        });
        events.push({cell, n: Math.round(n), byRound});
        entries += n;
        const cap = QR().capacityAt(S.routing, L, rounds[0].key, l => groupCountAt(l), cell);
        if (isFinite(cap)) spots += cap / Math.max(1, TG.groups.length);
        const blk = cell.slice(0,2);
        blocks[blk] = (blocks[blk] || 0) + 1;
      });
      const minDays = Object.keys(blocks).length ? Math.max(...Object.values(blocks)) : 0;
      out.push({level:L, levelName: tierName(L), gi,
                name: g.name || ('Area ' + (gi+1)),
                rounds: rounds.map(r => r.key),
                events, entries: Math.round(entries), spots: Math.round(spots),
                biggest: events.length ? Math.max(...events.map(e => e.n)) : 0,
                minDays, blocks});
    });
  });
  return out;
}


/* ---------- pricing a second scenario ----------
   Comparing two maps on member counts says who is bigger. It does not say
   whether either can be run: that turns on entries per meet, what those meets
   bill, and whether one host cut works across a tier. So the comparison is
   computed the same way the live one is -- same pathway engine, same fees, same
   host model -- with the other map swapped in and put back afterwards.

   The swap is why this is written with a finally: a comparison that left the
   panel showing someone else's map would be worse than no comparison. */
function financialsFor(map){
  const snap = {regions:S.regions, assign:S.assign, levels:S.levels, routing:S.routing,
                flow:S.flow, cr:S._cr, finalName:S.finalName};
  try {
    if (map){
      S.regions = map.regions && map.regions.length ? map.regions : snap.regions;
      S.assign  = map.assign || snap.assign;
      if (map.levels && map.levels.length) S.levels = map.levels;
      if (map.routing && map.routing.length) S.routing = map.routing;
      if (map.finalName) S.finalName = map.finalName;
      S._cr = null;
      syncRouting();
      S.flow = window.JuniorFlow.compute({
        regions:S.regions, assign:S.assign, levels:S.levels,
        finalName:S.finalName, year:S.year});
    }
    const res = projectPathway();
    if (!res) return null;
    const meets = meetManifest(res);
    const tiers = {};
    meets.forEach(m => {
      const $ = meetMoney(m);
      const t = tiers[m.level] || (tiers[m.level] = {
        name: tierName(m.level), meets:0, entries:0, gross:0, levy:0, host:0, usad:0,
        sizes:[], days:0, spots:0});
      t.meets++; t.entries += m.entries; t.gross += $.gross; t.levy += $.levy;
      t.host += $.host; t.usad += $.usad; t.sizes.push(m.entries);
      t.days = Math.max(t.days, m.minDays);
      t.spots += m.spots;
    });
    Object.values(tiers).forEach(t => {
      const v = t.sizes.filter(x => x > 0);
      t.lo = v.length ? Math.min(...v) : 0;
      t.hi = v.length ? Math.max(...v) : 0;
      t.ratio = t.lo ? t.hi/t.lo : 0;
    });
    // Whether this tier's entries reflect measured, real-season attrition or
    // (silently, otherwise) assume every qualifier turns up. Level 0 is always
    // the real seeded pool for the chosen season -- not a rate applied to a
    // model -- so it carries no separate "measured" question of its own.
    Object.keys(tiers).forEach(L => {
      const l = +L;
      const t = tiers[L];
      t.measured = l === 0 ? true : (measuredArrival(l) != null);
      t.fill = t.spots ? t.entries / t.spots : null;
    });
    const total = Object.values(tiers).reduce((a,t) => ({
      meets:a.meets+t.meets, entries:a.entries+t.entries, gross:a.gross+t.gross,
      levy:a.levy+t.levy, host:a.host+t.host, usad:a.usad+t.usad,
    }), {meets:0,entries:0,gross:0,levy:0,host:0,usad:0});
    return {tiers, total, meets};
  } catch(e){
    console.error('financialsFor', e); return null;
  } finally {
    S.regions = snap.regions; S.assign = snap.assign; S.levels = snap.levels;
    S.routing = snap.routing; S.flow = snap.flow; S._cr = snap.cr;
    S.finalName = snap.finalName;
  }
}

/* Same map, same rules, a different season's real entries seeded into it --
   priced the way financialsFor(map) prices a different MAP: swap, compute,
   restore. This is what lets "how would this map's zones actually have
   filled" be answered for 2025 and 2026 side by side without the two calls
   disturbing whichever season is live on the rest of the screen. */
function financialsForYear(year){
  const snap = {year: S.year, flow: S.flow};
  try {
    S.year = year;
    S.flow = window.JuniorFlow.compute({
      regions:S.regions, assign:S.assign, levels:S.levels,
      finalName:S.finalName, year:S.year});
    return financialsFor(null);
  } catch(e){
    console.error('financialsForYear', e); return null;
  } finally {
    S.year = snap.year; S.flow = snap.flow;
  }
}

/* Does advance-data.json actually carry a real field for this stage in this
   season? Regionals and Zones ran in both eras; East/West/Central is new to
   2026 and 2025 has no such round to have measured. Checking the data rather
   than hard-coding the rule year means this stays correct if the data build
   ever back-fills more seasons. */
function stageExists(stageName, year){
  if (!stageName) return false;
  const key = (year === 'y25' ? '2025' : '2026') + '|' + stageName;
  return !!(S.advData && S.advData.pools && S.advData.pools[key]);
}


/* ---------- what this scenario was computed from ----------
   These numbers are drifting toward decisions about who competes, and the
   arbitration record on selection is unambiguous: a metric survives challenge
   when it can be reproduced from source data, when the exact inputs on the
   decision date can be reconstructed, and when everyone's number came from the
   same computation. A scenario that stores its rules but not the data build it
   was priced against fails all three -- re-open it in three months, the numbers
   have moved, and nothing records why.

   So every save carries the build stamps of the files it was computed from. */
function dataStamps(){
  const st = {saved: new Date().toISOString()};
  try {
    const a = S.advData || {};
    // build_advance_data.py stamps under meta, not at the top level.
    st.advance_data = (a.meta && (a.meta.built || a.meta.generated)) || a.generated || null;
    if (a.meta && a.meta.builder) st.advance_builder = a.meta.builder;
  } catch(e){}
  try { if (S.mult && S.mult.generated) st.multiplicity = S.mult.generated; } catch(e){}
  try {
    const k = window.JuniorFlow && window.JuniorFlow.constants
            ? window.JuniorFlow.constants(S.year) : null;
    if (k){ st.calibration_basis = k.basis; st.calibration_year = k.year;
            st.calibration_regions = k.regions; }
  } catch(e){}
  st.year = S.year === 'y25' ? '2025' : '2026';
  st.seed_pool = seedPoolKey();
  return st;
}


/* ---------- what it costs a family, and what that does to the field ----------
   Every financial figure here has been USA Diving's side of the ledger. A
   structure that is revenue-neutral to the organisation but adds several
   hundred dollars per family is a different proposal, and cost is not a
   footnote to attendance -- it is most of the reason for it.

   Which matters because the arrival rates the whole projection rests on are
   measured constants borrowed from the structure we happen to run now. Add a
   stop and they are wrong, in a direction the model cannot currently see. So
   cost feeds back: a pathway that costs a family more than today's loses
   take-up in proportion, at a sensitivity that is on screen and adjustable
   rather than buried.

   The elasticity is a judgement, not a measurement -- we have one structure and
   therefore one observation, so nothing here can derive it. It is exposed and
   defaulted to a deliberately modest figure so it is argued with rather than
   trusted. */
const TRAVEL_DEFAULT = {0: 250, 1: 450, 2: 700};   // per stop: travel, lodging, food

function stopCost(L){
  if (S.tripCost && S.tripCost[L] != null) return +S.tripCost[L];
  const n = S.levels.length;
  if (L === n - 1) return 700;                      // championship: furthest, longest
  return TRAVEL_DEFAULT[Math.min(L, 2)];
}

/* What one athlete pays to travel the whole pathway, if they keep advancing.
   Entry fees are per event, everything else is per trip. */
function athletePathCost(events){
  const ev = events || 2;
  const rows = S.routing.map((_, L) => {
    const fee = feeFor(L) * ev;
    const trip = stopCost(L);
    return {level:L, name:tierName(L), fee, trip, total:fee + trip};
  });
  return {rows, total: rows.reduce((a,r) => a + r.total, 0)};
}

/* Today's cost, as the reference the elasticity works against. Uses the same
   fee ladder and trip costs over the 2026 structure: Regionals, Zones, E/W/C,
   championship. */
function referenceCost(events){
  const ev = events || 2;
  return [85,90,115,125].reduce((a,f,i) => a + f*ev + (TRAVEL_DEFAULT[Math.min(i,2)] || 700), 0);
}

/* The feedback. Above today's cost, fewer families travel. */
function costTakeUp(events){
  const now = athletePathCost(events).total;
  const ref = referenceCost(events);
  if (!ref) return {factor:1, now, ref, delta:0};
  const delta = (now - ref) / ref;
  const e = S.costElastic == null ? 0.35 : +S.costElastic;   // modest by default
  return {factor: Math.max(0.4, Math.min(1.6, 1 - delta * e)), now, ref, delta, e};
}

function renderAthleteCost(){
  const ev = S.costEvents || 2;
  const c = athletePathCost(ev);
  const t = costTakeUp(ev);
  const rows = c.rows.map(r => `<tr>
    <td><b>${esc(r.name)}</b></td>
    <td class="num mono">${usd(r.fee)}<span class="bs-bd-rng">${ev} event${ev===1?'':'s'}</span></td>
    <td class="num mono">$<input class="bs-rt-in" type="number" min="0" step="50"
        data-trip="${r.level}" value="${stopCost(r.level)}"></td>
    <td class="num mono"><b>${usd(r.total)}</b></td></tr>`).join('');
  const up = t.delta > 0.01, dn = t.delta < -0.01;
  return `<div class="bs-bd">
    <div class="bs-bd-h"><b>What it costs a family</b>
      <label class="bs-arr">events each
        <input class="bs-rt-in" type="number" min="1" max="3" id="bsCostEv" value="${ev}"></label>
      <label class="bs-arr">cost sensitivity
        <input class="bs-rt-in" type="number" min="0" max="2" step="0.05" id="bsCostEl"
          value="${S.costElastic == null ? 0.35 : S.costElastic}"></label>
      <span class="note">One athlete travelling the whole pathway. Entry fees are per event, charged once per
        meet &mdash; qualifying out of a prelim into that meet's final is not a second entry and carries no second
        fee. Travel, lodging and food are per trip and editable; they are placeholders, not measurements.</span></div>
    <div class="bs-bd-scroll"><table class="bs-drill bs-bd-tbl">
      <thead><tr><th>Stop</th><th class="num" title="One fee per meet. Qualifying from a prelim into that meet's final is not a second entry.">Entry fees</th><th class="num">Travel &amp; stay</th>
        <th class="num">Total</th></tr></thead>
      <tbody>${rows}
        <tr class="bs-bd-tot"><td><b>Whole pathway</b></td><td></td><td></td>
          <td class="num mono"><b>${usd(c.total)}</b></td></tr></tbody></table></div>
    <div class="bs-costbox ${up?'ps-warn':'bs-auto-note'}" style="margin-top:10px">
      <b>${usd(c.total)} against ${usd(t.ref)} on today's structure &mdash;
        ${Math.abs(t.delta*100).toFixed(0)}% ${up?'more':dn?'less':'the same'}.</b>
      ${(up||dn) ? `At a sensitivity of ${t.e}, that moves take-up by
        ${((t.factor-1)*100).toFixed(0)}% &mdash; roughly ${Math.abs(Math.round((1-t.factor)*100))} in every 100
        families ${up?'not making a trip they would have made':'making one they would not have'}.` : ''}
      <br><span class="note">The sensitivity is a judgement, not a measurement. We run one structure, so
      there is one observation and nothing to derive it from. It is here to be argued with.</span>
    </div>
  </div>`;
}

function renderProvenance(){
  const st = S.loadedStamps;
  const now = dataStamps();
  const d = x => x ? String(x).slice(0,10) : '—';
  const drifted = st && ((st.advance_data && st.advance_data !== now.advance_data) ||
                         (st.multiplicity && st.multiplicity !== now.multiplicity) ||
                         (st.calibration_basis && st.calibration_basis !== now.calibration_basis));
  return `<div class="bs-prov">
    <b>Computed from</b>
    <span>entries <code>${d(now.advance_data)}</code></span>
    <span>events per athlete <code>${d(now.multiplicity)}</code></span>
    <span>take-up <code>${esc(now.calibration_basis||'—')}</code></span>
    <span>season <code>${esc(now.year)}</code></span>
    ${st ? (drifted
      ? `<span class="bs-prov-warn">This scenario was saved against a different data build
          (${d(st.advance_data)}). The figures on screen are not the figures it was saved with.</span>`
      : `<span class="bs-prov-ok">Same data build as when it was saved.</span>`) : ''}
  </div>`;
}

function renderFinancials(){
  const a = financialsFor(null);
  if (!a) return '';
  const b = S.compare ? financialsFor(S.compare) : null;
  const money = v => usd(v);
  const d = (x,y) => {
    const v = x - y;
    if (Math.abs(v) < 1) return '<span class="bs-fd0">same</span>';
    return `<span class="${v>0?'bs-fdup':'bs-fddn'}">${v>0?'+':'−'}${usd(Math.abs(v))}</span>`;
  };
  const dn = (x,y) => {
    const v = Math.round(x - y);
    if (!v) return '<span class="bs-fd0">same</span>';
    return `<span class="${v>0?'bs-fdup':'bs-fddn'}">${v>0?'+':'−'}${fmt(Math.abs(v))}</span>`;
  };

  const levels = Object.keys(a.tiers).sort((x,y)=>x-y);
  const rows = levels.map(L => {
    const t = a.tiers[L], o = b && b.tiers[L];
    const fillCell = t.spots
      ? `${Math.round(t.fill*100)}%<span class="bs-bd-rng">of ${fmt(Math.round(t.spots))} places</span>`
      : '<span class="bs-bd-0">no cap</span>';
    return `<tr>
      <td><b>${esc(t.name)}</b><span class="bs-mf-l">${fmt(t.meets)} ${t.meets===1?'meet':'meets'}</span>
        ${t.measured ? '' : '<span class="bs-arr-m warn" title="No real season to check this tier\'s attrition against — this assumes every qualifier turns up.">not measured</span>'}</td>
      <td class="num">${fmt(Math.round(t.entries))}${o?`<span class="bs-bd-rng">${dn(t.entries,o.entries)}</span>`:''}</td>
      <td class="num">${fillCell}</td>
      <td class="num mono">${money(t.gross)}${o?`<span class="bs-bd-rng">${d(t.gross,o.gross)}</span>`:''}</td>
      <td class="num mono">${money(t.host)}</td>
      <td class="num mono"><b>${money(t.usad)}</b>${o?`<span class="bs-bd-rng">${d(t.usad,o.usad)}</span>`:''}</td>
      <td class="num">${t.ratio ? t.ratio.toFixed(1)+'&times;' : '—'}
        ${o&&o.ratio?`<span class="bs-bd-rng">${o.ratio.toFixed(1)}&times; there</span>`:''}</td>
    </tr>`;
  }).join('');

  const tot = a.total, otot = b && b.total;
  return `<div class="bs-bd">
    <div class="bs-bd-h"><b>The money${b?` &mdash; against ${esc(S.compare.name)}`:''}</b>
      <span class="note">${b
        ? `Both priced the same way: same pathway engine, same fees, same host model, with only the map and its tiers changed. Deltas are this scenario against <b>${esc(S.compare.name)}</b>.`
        : 'Load a comparison scenario on the map to price two side by side.'}</span>
      <div class="bs-feebar">
        <span class="bs-fee-lbl">Entry fee per tier</span>
        ${levels.map(L => `<label class="bs-fee">${esc(a.tiers[L].name)}
          $<input class="bs-rt-in" type="number" min="0" step="5" data-fee="${L}"
             value="${feeFor(+L)}"></label>`).join('')}
        ${S.fees ? '<button class="tab bs-mini" id="bsFeeReset">back to published</button>' : ''}
      </div></div>
    <div class="bs-bd-scroll"><table class="bs-drill bs-bd-tbl bs-fin-tbl">
      <thead><tr><th>Tier</th><th class="num">Entries</th><th class="num">Filled</th><th class="num">Entry income</th>
        <th class="num">To hosts</th><th class="num">USA Diving keeps</th>
        <th class="num">Biggest &divide; smallest</th></tr></thead>
      <tbody>${rows}
        <tr class="bs-bd-tot"><td><b>All tiers</b><span class="bs-mf-l">${fmt(tot.meets)} meets</span></td>
          <td class="num"><b>${fmt(Math.round(tot.entries))}</b>${otot?`<span class="bs-bd-rng">${dn(tot.entries,otot.entries)}</span>`:''}</td>
          <td class="num"></td>
          <td class="num mono"><b>${money(tot.gross)}</b>${otot?`<span class="bs-bd-rng">${d(tot.gross,otot.gross)}</span>`:''}</td>
          <td class="num mono"><b>${money(tot.host)}</b></td>
          <td class="num mono"><b>${money(tot.usad)}</b>${otot?`<span class="bs-bd-rng">${d(tot.usad,otot.usad)}</span>`:''}</td>
          <td class="num"></td></tr>
      </tbody></table></div>
    <p class="note">Entry fees ${S.fees ? '<b>as typed above</b>' : 'at the published rate for each tier'},
      less the DiveMeets pass-through.
      Membership dues and the senior circuit are not here &mdash; Pricing Studio carries those.
      <b>Filled</b> is entries against the places the rules make available at that tier &mdash; capacity, not a
      forecast, so a tier can legitimately run over 100% where the rules admit extra qualifiers by average score.
      <b>Biggest &divide; smallest</b> is the number a single host cut lives or dies on: a tier far from 1&times;
      cannot be paid by one rule, whatever the rule is.</p>
  </div>`;
}

/* This map's zones, run against 2025's and 2026's actual entries instead of
   the model's take-up estimate -- the same map twice, not two maps. Where a
   season really ran a stage (Regionals and Zones in both eras) the number is
   the real reallocated field; where it did not (2025 had no East/West/Central
   round, and no season here calibrates arrival into the championship) that is
   said plainly rather than guessed at. */
function renderYearFill(){
  if (!S.advData || !S.advData.pools) return '';
  const fy25 = financialsForYear('y25');
  const fy26 = financialsForYear('y26');
  if (!fy25 && !fy26) return '';
  const levels = Array.from(new Set([
    ...(fy25 ? Object.keys(fy25.tiers) : []),
    ...(fy26 ? Object.keys(fy26.tiers) : []),
  ])).sort((x,y) => x-y);
  if (!levels.length) return '';

  const cell = (f, L, year) => {
    const t = f && f.tiers[L];
    if (!t || !(t.entries > 0)) return '<span class="bs-bd-0">—</span>';
    const l = +L;
    const stage = stageNameForLevel(l);
    // Level 0 is always the real seeded pool for that season if the pool
    // exists at all; above that, "real" means the arrival rate was actually
    // measured against that season, not just left at full take-up.
    const real = l === 0 ? stageExists(stage || seedStage(), year) : t.measured;
    const fillPct = t.spots ? `<span class="bs-bd-rng">${Math.round(t.fill*100)}% of places</span>` : '';
    const flag = real ? '' : ' <span class="bs-arr-m warn">modelled</span>';
    return `${fmt(Math.round(t.entries))}${fillPct}${flag}`;
  };

  const rows = levels.map(L => {
    const name = (fy26 && fy26.tiers[L] && fy26.tiers[L].name) ||
                 (fy25 && fy25.tiers[L] && fy25.tiers[L].name) || tierName(+L);
    return `<tr><td><b>${esc(name)}</b></td>
      <td class="num">${cell(fy25, L, 'y25')}</td>
      <td class="num">${cell(fy26, L, 'y26')}</td></tr>`;
  }).join('');

  return `<div class="bs-bd" style="margin-top:16px">
    <div class="bs-bd-h"><b>Real participation by season</b>
      <span class="note">This map's zones, seeded from 2025's and 2026's actual entries reallocated
        county by county &mdash; the same map run against two real seasons, not two different maps.
        <b>Modelled</b> marks a tier that season has no recorded field for (2025 ran no East/West/Central
        round, and no season here has a measured rate into the championship), so that figure assumes
        every qualifier turns up rather than measuring who actually did.</span></div>
    <div class="bs-bd-scroll"><table class="bs-drill bs-bd-tbl">
      <thead><tr><th>Tier</th><th class="num">2025</th><th class="num">2026</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
  </div>`;
}

/* Which areas straddle a line, reported whether or not the draw was told to
   care. A map painted by hand needs this more than one the optimiser drew. */
function renderTimezones(){
  const r = tzReport();
  if (!r.total) return '';
  const A = (typeof autoData === 'function') ? autoData() : null;
  if (!A) return `<div class="bs-tzbox note">Time-zone check needs the county file &mdash;
    open <b>Draw it for me</b> once and it will load.</div>`;
  if (!r.split.length) return `<div class="bs-tzbox ok"><b>Every area sits in one time zone.</b>
    Session times mean the same thing to everyone in an area.</div>`;
  const rows = r.split.map(x => `<li><b>${esc(x.name)}</b> &mdash; ${
    x.zones.map(z => `${esc(z.name)} ${Math.round(z.share*100)}%`).join(' / ')}
    ${x.minority > 0.1 ? '<span class="bs-tz-bad">a real split</span>'
                       : '<span class="bs-tz-mild">a handful of members</span>'}</li>`).join('');
  return `<div class="bs-tzbox warn">
    <b>${r.split.length} of ${r.total} areas span more than one time zone.</b>
    Every warm-up and session start has to be quoted in something, and half the area reads it wrong.
    <ul>${rows}</ul>
    <span class="note">Shares are by members, not counties &mdash; three empty counties across a line is
    not a scheduling problem and three hundred divers is. Approximate: state level with the thirteen
    split states handled, and not a legal boundary.</span></div>`;
}

function renderMeetManifest(res){
  const meets = meetManifest(res);
  if (!meets.length) return '';
  const spread = tierSpread(meets);
  const grand = meets.reduce((a,m) => {
    const $ = meetMoney(m);
    a.entries += m.entries; a.gross += $.gross; a.levy += $.levy; a.host += $.host; a.usad += $.usad;
    return a;
  }, {entries:0, gross:0, levy:0, host:0, usad:0});
  const COLS = 10;
  let lastLevel = null;
  const rows = meets.map(m => {
    const $ = meetMoney(m);
    // A tier header, because "Group 1" exists at more than one level and a flat
    // list makes you read a grey subtitle to tell two meets apart.
    let head = '';
    if (m.level !== lastLevel){
      lastLevel = m.level;
      const kin = meets.filter(x => x.level === m.level);
      const tot = kin.reduce((s2,x) => s2 + x.entries, 0);
      const money = kin.reduce((s2,x) => s2 + meetMoney(x).net, 0);
      head = `<tr class="bs-mf-tier"><td colspan="${COLS}">
        <b>${esc(m.levelName)}</b> &middot; ${fmt(kin.length)} ${kin.length===1?'meet':'meets'}
        &middot; ${fmt(Math.round(tot))} entries &middot; ${usd(money)} net
        <span class="bs-mf-bulk">
          set every ${esc(m.levelName)} host cut to
          $<input class="bs-rt-in bs-mini" type="number" min="0" step="100"
            data-bulklevelin="${m.level}" placeholder="0">
          <button class="tab bs-mini" data-bulklevel="${m.level}"
            title="Sets this figure for all ${kin.length} ${kin.length===1?'meet':'meets'} in ${esc(m.levelName)} -- each stays individually editable afterward">Apply to this level</button>
        </span></td></tr>`;
    }
    return head + `<tr>
      <td><b>${esc(m.name)}</b></td>
      <td class="num">${fmt(m.events.length)}</td>
      <td class="num"><b>${fmt(m.entries)}</b></td>
      <td class="num">${m.spots
          ? fmt(m.spots) + `<span class="bs-bd-rng">${Math.round(m.entries/m.spots*100)}% used</span>`
          : '<span class="bs-bd-0">no cap</span>'}</td>
      <td class="num">${fmt(m.biggest)}</td>
      <td class="num mono">${usd($.gross)}</td>
      <td class="num mono bs-mf-levy">&minus;${usd($.levy)}</td>
      <td class="num mono">
        <span class="bs-hostcell">$<input class="bs-rt-in bs-hostin ${$.overridden?'set':''}" type="number"
          min="0" step="100" data-host="${esc(meetKey(m))}"
          value="${Math.round($.host)}" title="Type a figure to fix this meet's payout. Clear it to go back to the model."></span>
        ${$.capped ? `<span class="bs-bd-rng bs-mf-cap">${$.overridden?'more than this meet takes':'all of net'}</span>`
        : $.overridden ? `<span class="bs-bd-rng bs-mf-set">set for this meet &middot; ${Math.round($.pct*100)}% of net</span>`
        : $.floored ? '<span class="bs-bd-rng">at the minimum</span>'
        : `<span class="bs-bd-rng">${Math.round($.pct*100)}% of net</span>`}</td>
      <td class="num mono">${usd($.usad)}</td>
      <td class="num"><b>${fmt(m.minDays)}</b></td>
    </tr>`;
  }).join('');
  const bal = Object.keys(spread).map(L => {
    const s2 = spread[L];
    const bad = s2.ratio >= 2;
    return `<li class="${bad?'bs-prob bad':'bs-prob warn'}"><b>${esc(tierName(+L))}</b>:
      biggest meet ${fmt(Math.round(s2.hi))} entries, smallest ${fmt(Math.round(s2.lo))} &mdash;
      <b>${s2.ratio.toFixed(1)}&times;</b> apart across ${s2.n} stops.
      ${bad ? `A percentage cut pays one host ${s2.ratio.toFixed(1)} times another for running the same meet;
               a flat fee may not cover the smallest one's rental. That is the map, not the fee.`
            : 'Close enough that one host cut works across the tier.'}</li>`;
  }).join('');
  return `<div class="bs-bd">
    <div class="bs-bd-h"><b>Every meet</b>
      <label class="bs-arr">host cut
        <select class="sel bs-mini" id="bsHostMode">
          <option value="pct"       ${(S.hostMode||'pct')==='pct'?'selected':''}>% of net</option>
          <option value="flat"      ${S.hostMode==='flat'?'selected':''}>flat per meet</option>
          <option value="per_entry" ${S.hostMode==='per_entry'?'selected':''}>per entry</option>
        </select>
        ${(S.hostMode||'pct')==='pct'
          ? `<input class="bs-rt-in" id="bsHostShare" type="number" min="0" max="100" step="1"
               value="${Math.round((S.hostShare||0)*100)}">%`
          : S.hostMode==='flat'
          ? `$<input class="bs-rt-in" id="bsHostFlat" type="number" min="0" step="100" value="${+S.hostFlat||0}">`
          : `$<input class="bs-rt-in" id="bsHostPer" type="number" min="0" step="1" value="${+S.hostPer||0}">/entry`}
      </label>
      <label class="bs-arr">minimum $<input class="bs-rt-in" id="bsHostMin" type="number" min="0" step="100"
        value="${+S.hostMin||0}"></label>
      ${S.hostPer_stop && Object.keys(S.hostPer_stop).length
        ? `<button class="tab bs-mini" id="bsHostClear">back to the model (${Object.keys(S.hostPer_stop).length} set)</button>` : ''}
      <button class="tab bs-mini" id="bsMfCsv">Export</button>
      <span class="note">One row per stop &mdash; the unit a schedule is actually built for.
        <b>Places</b> is what the bands entitle this meet to take; where it far exceeds the entries, the
        stop is admitting nearly everyone sent to it. <b>Days</b> is the least a meet can run in, given an
        age group and gender does not contest more than one event in a day; prelims and finals of an event
        share a day, so an event is one day's commitment. Entry income is at
        ${SEED_STAGES.map((x,i)=>'').join('')}the published fee for each tier; change fees in Pricing Studio to model them properly.</span>
      ${bal ? `<ul class="bs-probs" style="width:100%;margin:8px 0 0">${bal}</ul>` : ''}</div>
    <div class="bs-bd-scroll"><table class="bs-drill bs-bd-tbl bs-mf-tbl">
      <thead><tr><th>Meet</th><th class="num">Events</th><th class="num">Entries</th>
        <th class="num">Places</th><th class="num">Biggest field</th>
        <th class="num">Entry income</th><th class="num">DiveMeets</th>
        <th class="num">Host cut</th><th class="num">USA Diving keeps</th>
        <th class="num">Days</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="bs-mf-grand">
        <td><b>Whole season &mdash; every tier</b></td><td></td>
        <td class="num mono"><b>${fmt(grand.entries)}</b></td><td></td><td></td>
        <td class="num mono"><b>${usd(grand.gross)}</b></td>
        <td class="num mono">&minus;${usd(grand.levy)}</td>
        <td class="num mono">${usd(grand.host)}</td>
        <td class="num mono"><b>${usd(grand.usad)}</b></td><td></td>
      </tr></tfoot></table></div>
  </div>`;
}

function exportManifestCsv(){
  const res = S.routeRes || projectPathway();
  const meets = meetManifest(res);
  if (!meets.length){ msg('Nothing to export yet.'); return; }
  const q = v => `"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const rounds = new Set();
  meets.forEach(m => m.rounds.forEach(r => rounds.add(r)));
  const rl = QR().ROUND_ORDER.filter(r => rounds.has(r));
  const head = ['stage','meet','age_group','gender','event','entries']
    .concat(rl.map(r => 'in_' + r))
    .concat(['min_days_for_this_meet','meet_total_entries','entry_fee',
             'meet_gross','meet_divemeets_levy','meet_host_cut','host_cut_pct_of_net',
             'host_cut_set_for_this_meet','meet_usad_keeps']);
  const lines = [head.join(',')];
  meets.forEach(m => {
    const $ = meetMoney(m);
    m.events.forEach(e => {
      lines.push([q(m.levelName), q(m.name), q(AGE_LBL[e.cell[0]]), q(GEN_LBL[e.cell[1]]),
                  q(DIS_LBL[e.cell[2]]), e.n]
        .concat(rl.map(r => e.byRound[r] == null ? '' : e.byRound[r]))
        .concat([m.minDays, m.entries, $.fee, Math.round($.gross), Math.round($.levy),
                 Math.round($.host), Math.round($.pct*100), $.overridden ? 'yes' : '',
                 Math.round($.usad)]).join(','));
    });
  });
  download(lines.join('\n'), (S.scenarioName.trim()||'pathway') + '-meets.csv');
}


/* ---------- the pathway library ----------
   A pathway and a map are separate questions. The pathway is rules -- rounds,
   place bands, which events a stage holds, arrival rates. The map is geography.
   Welding them together means rebuilding the same rules every time a boundary
   is redrawn, which is most of the work and all of the transcription errors.

   Routes address levels by index, so a pathway built on three tiers has to
   adapt to four. The adaptation is deliberate rather than silent: the old
   championship maps onto the new championship, the tiers below match up from
   the bottom, and anything that cannot be placed is dropped and named. */
function pathwayPayload(){
  syncRouting();
  return {
    v: 1,
    levels: S.routing.length,
    routing: JSON.parse(JSON.stringify(S.routing)),
    arrival: S.arrival ? JSON.parse(JSON.stringify(S.arrival)) : null,
    seedPool: S.seedPool || null,
    levelNames: S.levels.map(l => l.name),
  };
}

/* Fit a saved pathway onto the structure now on screen.

   Tiers are matched from the bottom and the championship is matched to the
   championship, because those are the two ends anyone actually means. What
   happens between them depends on which structure is deeper:

     more tiers here  -- the saved intermediates fill from the bottom and the
                         extra tiers are left empty for you to fill, rather than
                         being handed a copy of the championship's rules;
     fewer tiers here -- routes aimed at a tier that no longer exists are sent
                         up to the next one that does, so athletes still move
                         forward instead of the entry stop being left with no
                         way out.

   Every one of those decisions is named on the panel. Adapting a pathway is a
   change to the rules, and a change to the rules should not be silent. */
function adaptPathway(p){
  const src = p.routing || [];
  const N = src.length, M = S.levels.length;
  const notes = [];
  const seen = {};

  // Where does saved tier L end up here?
  const mapLevel = (L) => {
    if (L === N - 1) return M - 1;            // championship to championship
    if (L <= M - 2) return L;                 // intermediates from the bottom
    return M - 1;                             // ran out of tiers: send it up
  };

  const out = [];
  for (let L = 0; L < M; L++){
    // Which saved tier supplies this one.
    const from = (L === M - 1) ? src[N - 1] : (L <= N - 2 ? src[L] : null);
    if (!from){
      out.push({rounds:[{key:'final'}], routes:[]});
      notes.push(`${tierName(L)} has no counterpart in the saved pathway and is left empty for you to fill.`);
      continue;
    }
    const lvl = {rounds: JSON.parse(JSON.stringify(from.rounds || [{key:'final'}])),
                 notOffered: (from.notOffered || []).slice(), routes: []};
    (from.routes || []).forEach(rt => {
      const copy = {from: rt.from, lo: rt.lo, hi: rt.hi};
      if (rt.to){
        const to = mapLevel(rt.to.level);
        if (rt.to.level !== to && rt.to.level !== N - 1 && !seen['r'+L]){
          seen['r'+L] = 1;
          notes.push(`Routes out of ${tierName(L)} aimed at a tier that does not exist here, so they now go to ${tierName(to)}.`);
        }
        copy.to = {level: to, round: rt.to.round};
      }
      lvl.routes.push(copy);
    });
    out.push(lvl);
  }
  if (N !== M) notes.push(`Saved for ${N} tiers, loaded onto ${M}.`);
  return {routing: out, notes};
}

/* The saved maps, for the map axis of Compare. Same source the Load dropdown
   uses; kept separately so switching axis does not disturb that control. */
async function loadMapList(){
  try {
    const r = await NEON.query(
      `SELECT id, name FROM membership.boundary_scenarios ORDER BY updated_at DESC LIMIT 50`);
    S.mapList = r.rows || [];
  } catch(e){ console.warn('mapList', e); S.mapList = []; }
  return S.mapList;
}

async function listPathways(){
  try {
    const r = await NEON.query(
      `SELECT id, name, levels, notes, to_char(updated_at,'Mon DD') u
       FROM membership.pathways ORDER BY updated_at DESC LIMIT 60`);
    return r.rows || [];
  } catch(e){ console.warn('pathways', e); return []; }
}

async function savePathway(){
  const name = await bsPrompt({
    title: 'Save this pathway to the library',
    body: `<p class="bs-dlg-p">It can then be loaded onto any map, including ones with a different number
      of levels &mdash; those get fitted and the changes named.</p>
      <div class="bs-dlg-facts"><span>${fmt(S.routing.length)} levels</span>
      <span>${fmt(S.routing.reduce((a,l)=>a+((l.routes||[]).length),0))} routes</span></div>`,
    label: 'Name', value: S.pathName || (S.scenarioName || 'Pathway'), okLabel: 'Save pathway'});
  if (!name) return;
  const id = 'pw-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6);
  try {
    await NEON.query(
      `INSERT INTO membership.pathways (id,name,levels,data,updated_at)
       VALUES ($1,$2,$3,$4::jsonb, now())`,
      [id, name, S.routing.length, JSON.stringify(pathwayPayload())]);
    S.pathName = name; S.pathSaved = {id, name}; S.pathDirty = false;
    S.pathList = await listPathways();
    msg(`Saved "${name}" — it can now be loaded onto any map.`);
    renderPathway();
  } catch(e){ msg('Could not save: ' + (e.message || e)); }
}

async function loadPathway(id){
  if (!id) return;
  try {
    const r = await NEON.query(`SELECT name, data FROM membership.pathways WHERE id=$1`, [id]);
    if (!r.rows || !r.rows.length){ msg('That pathway is gone.'); return; }
    const p = typeof r.rows[0].data === 'string' ? JSON.parse(r.rows[0].data) : r.rows[0].data;
    pushUndo();
    const fit = adaptPathway(p);
    S.routing = fit.routing;
    if (p.arrival) S.arrival = p.arrival;
    if (p.seedPool) S.seedPool = p.seedPool;
    S.pathName = r.rows[0].name;
    S.pathSaved = {id, name: r.rows[0].name};
    S.pathDirty = false;
    S.pathNotes = fit.notes;
    S.dirty = true;
    syncRouting(); repaintAll(); renderPathway();
    msg(`Loaded "${r.rows[0].name}"` + (fit.notes.length ? ` — ${fit.notes.length} adjustment(s), see the panel.` : ''));
  } catch(e){ msg('Could not load: ' + (e.message || e)); }
}

async function deletePathway(){
  const id = (document.getElementById('bsPathLoad') || {}).value;
  if (!id) { msg('Choose a saved pathway first.'); return; }
  const nm = (S.pathList || []).find(p => p.id === id);
  if (!await bsConfirm({title:'Delete this saved pathway?', danger:true, okLabel:'Delete',
    body:`<p class="bs-dlg-p">Removes <b>${esc(nm ? nm.name : id)}</b> from the library. Maps that used it keep
      their own copy, so nothing already saved changes.</p>`})) return;
  try {
    await NEON.query(`DELETE FROM membership.pathways WHERE id=$1`, [id]);
    S.pathList = await listPathways(); renderPathway();
    msg('Deleted.');
  } catch(e){ msg('Could not delete: ' + (e.message || e)); }
}


/* ============================================================================
   THE INSPECTOR
   The map is always on screen. This is everything you read *about* the map,
   one subject at a time, so no single view is a thirty-column scroll.
   ========================================================================= */

const INSPECTORS = [
  {k:'map',        label:'Map',        hint:'Who lives in each area, and whether the areas are even'},
  {k:'structure',  label:'Structure',  hint:'Levels, names, and the qualification pathway'},
  {k:'projection', label:'Projection', hint:'How many people are at each meet'},
  {k:'money',      label:'Money',      hint:'Entry income, host payouts, athlete cost'},
  {k:'schedule',   label:'Schedule',   hint:'Whether each meet actually fits in the days available'},
  {k:'compare',    label:'Compare',    hint:'Put saved pathways side by side on this same map'},
  {k:'report',     label:'Report',     hint:'Where these numbers come from, and how to export them'},
];

function renderInspectorShell(){
  const body = document.getElementById('bsBody');
  if (!body) return;
  body.innerHTML = `<div id="bsPathWrap"><div class="note">Working the numbers&hellip;</div></div>`;
  if (!S.pathList) listPathways().then(l => { S.pathList = l; renderInspector(); });
  // Compare can open straight onto the map axis; its list has to be there too.
  if (S.panelMode === 'compare' && S.cmpAxis === 'map' && !S.mapList)
    loadMapList().then(() => renderInspector());
  refreshFlow();
}

/* Single dispatch point after the flow recomputes. */
function renderInspector(){
  renderConsequenceStrip();      // live regardless of which inspector is open
  if (S.panelMode === 'map'){
    const slot = document.getElementById('bsBalance');
    if (slot) slot.outerHTML = renderBalanceStrip();
    return;
  }
  renderPathway();
}

/* ---------- map tab: is this map even? ----------
   This is the half of the old "Who moves up" panel that was actually about the
   map. It answers "have I drawn areas of comparable size", which is a question
   you ask while painting -- so it belongs beside the paint tools, not behind a
   mode switch that hides the tallies. */
function renderBalanceStrip(){
  if (!S.flow) return `<div id="bsBalance" class="note">Working out how even the areas are&hellip;</div>`;
  const i = Math.min(S.tierView, S.flow.levels.length-1);
  const TG = tierGroupsAt(i);
  const rows = (S.flow.levels[i] && S.flow.levels[i].rows) || [];
  const tot = g => CELLS.reduce((a,c)=>a+((rows[g]||{})[c]||0), 0);
  const totals = TG.groups.map((_,gi)=>tot(gi));
  const grand = totals.reduce((a,b)=>a+b,0);
  if (!grand) return `<div id="bsBalance"></div>`;
  const n = TG.groups.length, equal = n ? 100/n : 0;
  const spread = n>1 ? (100*Math.max(...totals)/grand - 100*Math.min(...totals)/grand) : 0;
  const cls = spread <= equal*0.30 ? 'ok' : (spread <= equal*0.60 ? 'over' : 'under');
  const word = spread <= equal*0.30 ? 'evenly balanced'
             : spread <= equal*0.60 ? 'somewhat uneven' : 'markedly uneven';
  const bars = TG.groups.map((g,gi)=>{
    const share = 100*totals[gi]/grand, diff = share-equal;
    const dc = Math.abs(diff) < equal*0.15 ? 'ok' : (diff>0?'over':'under');
    return `<tr data-hl="${gi}"><td><span class="sw" style="background:${tierColorAt(i,gi)}"></span>${esc(g.name)}</td>
      <td class="num">${fmt(Math.round(totals[gi]))}</td>
      <td><span class="bs-bar"><i style="width:${Math.max(2,Math.round(100*totals[gi]/Math.max(...totals)))}%;background:${tierColorAt(i,gi)}"></i></span></td>
      <td class="num ${dc}">${diff>=0?'+':''}${diff.toFixed(1)} pp</td></tr>`;
  }).join('');
  return `<div id="bsBalance" class="bs-balance">
    <div class="bs-tier-h">Are the areas even? &mdash; entries that actually competed, by ${esc(tierName(i))}</div>
    <div class="bs-scroll"><table class="bs-drill"><thead><tr><th>${esc(tierName(i))}</th>
      <th class="num">Competing</th><th></th><th class="num">vs even split</th></tr></thead>
      <tbody>${bars}</tbody></table></div>
    <div class="bs-spread ${cls}">Widest gap: <b>${spread.toFixed(1)} percentage points</b> &mdash; ${word}.</div>
  </div>`;
}

/* ---------- the pathway library ----------
   A pathway and a map are separate things that only mean something together:
   the same nine-zone map run at three-per-zone is a different championship
   from the same map at five. Keeping two libraries lets one good map be tried
   against every structure the committee floats, without redrawing anything.

   A map still carries a copy of the pathway it was last saved with, so opening
   a map on its own restores what you had. The library is for reuse across
   maps, not a replacement for that. */
function renderPathwayLibrary(){
  const embedded = !!(S.routing && S.routing.length);
  const inLib    = !!(S.pathSaved && S.pathSaved.id);
  const label = inLib
    ? `<b>${esc(S.pathSaved.name)}</b>${S.pathDirty ? ' <span class="bs-arr-m warn">edited since loaded</span>' : ' <span class="bs-arr-m">from the library</span>'}`
    : embedded
      ? `<b>${esc(S.scenarioName || 'this map')}&rsquo;s own pathway</b> <span class="bs-arr-m warn">not in the library</span>`
      : `<b>Current published rules</b> <span class="bs-arr-m warn">nothing saved &mdash; built from defaults</span>`;
  return `<div class="bs-pwbar">
    <div class="bs-pwbar-h">Pathway in use &mdash; ${label}</div>
    <div class="bs-pwbar-r">
      <select class="sel" id="bsPathLoad">
        <option value="">Load a saved pathway&hellip;</option>
        ${(S.pathList||[]).map(p=>`<option value="${esc(p.id)}" ${S.pathSaved&&S.pathSaved.id===p.id?'selected':''}>${esc(p.name)} &middot; ${p.levels} levels &middot; ${esc(p.u||'')}</option>`).join('')}
      </select>
      <button class="tab bs-mini" id="bsPathSave">${inLib && !S.pathDirty ? 'Save a copy' : 'Save this pathway'}</button>
      <button class="tab bs-mini" id="bsPathDel" title="Delete the selected saved pathway">Delete saved</button>
      <button class="tab bs-mini" id="bsPathReset">Back to published rules</button>
    </div>
    <div class="note">Saved pathways can be loaded onto any map. Loading one onto a different
      number of levels fits it bottom&#8209;up and names every adjustment before you read the numbers.</div>
  </div>`;
}


/* ---------- schedule tab ----------
   Wires scenario-schedule-engine.js: does each meet this pathway creates
   actually fit in the days a host has? A map can be perfectly balanced and
   still produce a zone meet nobody can run. */
/* ---------- dive counts ----------
   The schedule engine deliberately refuses to guess how many dives an event
   requires, and it is right to: a wrong dive count makes every duration wrong,
   which makes every "does this meet fit" verdict wrong.

   This table is not invented. It is lifted verbatim from the 2026 Zone and
   Junior National schedules committed in schedule-builder/sb-app.js -- meets
   that were actually run -- and it independently reproduces the dive-count
   change effective 1 Jan 2024: Group A one dive down across the board, Group C
   Girls springboard one optional down, Group B unchanged, Group D consolidated
   to a single 6-dive list. That agreement is why it is trusted here.

   [dives, secondsPerDive] per round shape:
     full   -- a standalone contest with no prelim before it (a Zone final that
               is the only round is a full list, not a 5-dive final)
     prelim -- the prelim of a two-round meet
     final  -- the reduced final list, which only means anything after a prelim
*/
const DIVE_TABLE = {
  'Group A|Boys|1-Meter':{full:[10,32],prelim:[10,35],final:[5,35]},
  'Group A|Boys|3-Meter':{full:[10,32],prelim:[10,35],final:[5,35]},
  'Group A|Boys|Platform':{full:[9,38],prelim:[9,33],final:[5,45]},
  'Group A|Girls|1-Meter':{full:[9,32],prelim:[9,35],final:[4,35]},
  'Group A|Girls|3-Meter':{full:[9,32],prelim:[9,35],final:[4,35]},
  'Group A|Girls|Platform':{full:[8,38],prelim:[8,32],final:[4,45]},
  'Group B|Boys|1-Meter':{full:[9,33],prelim:[9,35],final:[4,35]},
  'Group B|Boys|3-Meter':{full:[9,33],prelim:[9,35],final:[4,35]},
  'Group B|Boys|Platform':{full:[8,42],prelim:[8,35],final:[4,45]},
  'Group B|Girls|1-Meter':{full:[8,34],prelim:[8,35],final:[3,35]},
  'Group B|Girls|3-Meter':{full:[8,34],prelim:[8,35],final:[3,35]},
  'Group B|Girls|Platform':{full:[7,42],prelim:[7,34],final:[3,45]},
  'Group C|Boys|1-Meter':{full:[8,35],prelim:[8,35],final:[4,35]},
  'Group C|Boys|3-Meter':{full:[8,35],prelim:[8,35],final:[4,35]},
  'Group C|Boys|Platform':{full:[7,45],prelim:[7,30],final:[4,45]},
  'Group C|Girls|1-Meter':{full:[7,35],prelim:[7,35],final:[3,35]},
  'Group C|Girls|3-Meter':{full:[7,35],prelim:[7,35],final:[3,35]},
  'Group C|Girls|Platform':{full:[6,45],prelim:[6,36],final:[3,45]},
  'Group D|Boys|1-Meter':{full:[6,35],prelim:[6,35],final:[3,35]},
  'Group D|Boys|3-Meter':{full:[6,35],prelim:[6,35],final:[3,35]},
  'Group D|Boys|Platform':{full:[6,45],prelim:[6,30],final:[3,45]},
  'Group D|Girls|1-Meter':{full:[6,35],prelim:[6,35],final:[3,35]},
  'Group D|Girls|3-Meter':{full:[6,35],prelim:[6,35],final:[3,35]},
  'Group D|Girls|Platform':{full:[6,45],prelim:[6,30],final:[3,45]},};

const DIS_APPARATUS = {'1m':'1-Meter', '3m':'3-Meter', 'Platform':'Platform'};

/* Which list an event swims depends on whether anything precedes it at this
   stop. Derived from the routing itself, never assumed: a level holding one
   round is a standalone contest and swims the full list; a level holding a
   prelim and a final swims the reduced list in the final. */
function diveSpecFor(L){
  const rounds = QR().roundsOf(S.routing[L]).map(r => r.key);
  const standalone = rounds.length <= 1;
  // The engine reads only parts 0-2 of a cell key, so the round rides along in
  // part 3 -- the alternative is one simulateStop per round, which would stop
  // the day assignment seeing the whole meet at once.
  return (cellKey) => {
    const p = String(cellKey).split('|');            // Group A|Girls|1m|final
    const row = DIVE_TABLE[`${p[0]}|${p[1]}|${DIS_APPARATUS[p[2]] || p[2]}`];
    if (!row) return {dives: 0, secondsPerDive: 0};  // unknown -> zero, never a guess
    const shape = standalone ? row.full : (p[3] === 'final' ? row.final : row.prelim);
    return {dives: shape[0], secondsPerDive: shape[1]};
  };
}

/* ---------- schedule feasibility ----------
   ONE computation, two consumers: the Schedule inspector and the report
   section both read this. If they each did their own, they would eventually
   disagree, and a committee paper would say something the screen does not. */
function computeSchedule(res){
  const E = window.ScenarioScheduleEngine;
  if (!E || typeof E.simulateStop !== 'function') return {error:'engine-missing', stops:[]};
  if (!res || !res.field || !S.routing) return {error:'no-pathway', stops:[]};
  const stops = [];
  for (let L = 0; L < S.routing.length; L++){
    const lvl = res.field[L]; if (!lvl) continue;
    const nG = Math.max(1, groupCountAt(L));
    const spec = diveSpecFor(L);
    for (let g = 0; g < nG; g++){
      // The projection carries compact cell keys (AG1). The engine reads
      // group|gender|discipline and decides warm-up from the group name; the
      // round rides in a 4th part the engine ignores but diveSpec reads.
      const rounds = []; let entries = 0, unknown = 0;
      QR().roundsOf(S.routing[L]).forEach(r => {
        const src = (lvl[r.key] && lvl[r.key][g]) || {};
        const cells = {}; let any = false;
        for (const c in src){
          const n = src[c]; if (!n || n < 0.5) continue;
          const key = `${AGE_LBL[c[0]]}|${GEN_LBL[c[1]]}|${DIS_LBL[c[2]]}|${r.key}`;
          cells[key] = n; entries += n; any = true;
          if (!DIVE_TABLE[`${AGE_LBL[c[0]]}|${GEN_LBL[c[1]]}|${DIS_APPARATUS[DIS_LBL[c[2]]] || DIS_LBL[c[2]]}`]) unknown++;
        }
        if (any) rounds.push({key: r.key, cells});
      });
      if (!rounds.length) continue;
      const name = (tierGroupsAt(L).groups[g] || {}).name || (tierName(L) + ' ' + (g+1));
      let sim = null, err = null;
      const pkey = L + ':' + g;
      const plan = (S.schedPlans && S.schedPlans[pkey]) || null;
      try { sim = E.simulateStop({stopName: name, rounds}, spec, S.schedRules || undefined, plan); }
      catch(e){ err = e.message || String(e); }
      const d = (sim && sim.days) || [];
      stops.push({
        name, level: tierName(L), levelIndex: L, groupIndex: g, entries, unknown, err, sim,
        events:      sim ? sim.totalEvents : 0,
        days:        sim ? sim.totalDays : 0,
        autoSplit:   d.reduce((a,x)=>a+((x.splitEvents||[]).length), 0),
        review:      d.reduce((a,x)=>a+((x.reviewSplitFlags||[]).length), 0),
        daysOver:    d.filter(x=>x.overCapacity).length,
        longestDayMin: d.reduce((a,x)=>Math.max(a,
                        (x.sessions||[]).reduce((t,ss)=>t+(ss.occupiedMinutes||0),0)), 0),
      });
    }
  }
  return {stops, rules: Object.assign({}, E.DEFAULT_RULES, S.schedRules || {})};
}

/* ============================================================================
   THE SCHEDULE
   A verdict is useless on its own. "East does not fit" tells you nothing you
   can act on -- not which day is long, not which event is the problem, not
   what happens if you move it. So this shows the actual day, session by
   session, with clock times, and lets the schedule be moved.

   The engine proposes; you dispose. Every manual decision is kept and beats
   the model, including when it breaks the model's own rules: putting two
   events for the same age group and gender on one day is reported as a clash,
   not quietly undone. Being able to overrule it is the point.
   ========================================================================= */

function stopKeyOf(st){ return st.levelIndex + ':' + st.groupIndex; }

function planFor(key){
  const all = S.schedPlans || (S.schedPlans = {});
  return all[key] || (all[key] = {dayOf:{}, split:{}, minDays:0});
}
function planDirty(key){
  const p = S.schedPlans && S.schedPlans[key];
  return !!(p && (Object.keys(p.dayOf).length || Object.keys(p.split).length || p.minDays));
}

const hhmm = m => {
  const h = Math.floor(m/60), mm = Math.round(m%60);
  const ap = h >= 12 ? 'pm' : 'am', h12 = ((h + 11) % 12) + 1;
  return h12 + ':' + String(mm).padStart(2,'0') + ap;
};
const EVLBL = id => {
  const p = String(id).split('|');
  return `${p[0]} ${p[1]} ${p[2]}` + (p[3] && p[3] !== 'final' ? ' · ' + p[3] : (p[3] ? ' · final' : ''));
};


/* Every control on the Schedule tab. Each one records a decision and re-lays
   the meet out around it; none of them silently correct anything. */

/* ---------- dragging a session around ----------
   HTML5 drag events do not fire on touch, so this is the desktop path only and
   the day selector on each card stays as the way it is done on a phone and with
   a keyboard. Neither is a fallback for the other; they are two inputs to the
   same decision.

   While a card is in the air, each day is costed live: the day under the cursor
   shows what it would total with this event added, and turns red if that would
   run past closing. Knowing before you let go is the whole point -- otherwise
   it is drop, read, undo. */
function wireScheduleDnD(){
  const P = document.getElementById('bsPathWrap');
  if (!P) return;
  const grid = P.querySelector('.bs-sc-grid');
  if (!grid) return;
  let dragId = null, dragMin = 0, dragFrom = 0;

  const clearMarks = () => {
    grid.querySelectorAll('.drop,.drop-bad').forEach(el => el.classList.remove('drop','drop-bad'));
    grid.querySelectorAll('.bs-sc-ghost').forEach(el => el.remove());
  };

  const cost = (zone) => {
    const occ = +zone.dataset.occ || 0, win = +zone.dataset.win || 1;
    const day = +zone.dataset.day;
    const would = day === dragFrom ? occ : occ + dragMin;
    return {would, win, over: would > win};
  };

  grid.querySelectorAll('.bs-sc-ev').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = card.dataset.ev;
      dragMin = +card.dataset.min || 0;
      dragFrom = +card.dataset.day || 0;
      try {
        e.dataTransfer.setData('text/plain', dragId);
        e.dataTransfer.effectAllowed = 'move';
      } catch(err){}
      card.classList.add('bs-drag-src');
      grid.classList.add('bs-dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('bs-drag-src');
      grid.classList.remove('bs-dragging');
      clearMarks();
      dragId = null;
    });
  });

  grid.querySelectorAll('.bs-sc-day, .bs-sc-newday').forEach(zone => {
    zone.addEventListener('dragover', e => {
      if (!dragId) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch(err){}
      if (zone.classList.contains('drop') || zone.classList.contains('drop-bad')) return;
      clearMarks();
      const c = cost(zone);
      zone.classList.add(c.over ? 'drop-bad' : 'drop');
      const g = document.createElement('div');
      g.className = 'bs-sc-ghost' + (c.over ? ' bad' : '');
      g.textContent = +zone.dataset.day === dragFrom
        ? 'Already on this day'
        : `${(c.would/60).toFixed(1)}h of ${(c.win/60).toFixed(1)}h` + (c.over ? ' — runs past closing' : '');
      zone.appendChild(g);
    });
    zone.addEventListener('dragleave', e => {
      if (zone.contains(e.relatedTarget)) return;
      zone.classList.remove('drop','drop-bad');
      zone.querySelectorAll('.bs-sc-ghost').forEach(el => el.remove());
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      const id = dragId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
      clearMarks();
      grid.classList.remove('bs-dragging');
      if (!id) return;
      const to = +zone.dataset.day;
      if (!to || to === dragFrom) return;
      const plan = planFor(S.schedStop);
      plan.dayOf[id] = to;
      S.dirty = true;
      renderPathway();
    });
  });
}

function wireSchedule(){
  const P = document.getElementById('bsPathWrap');
  if (!P) return;
  const redraw = () => { S.dirty = true; renderPathway(); };
  const rules = () => (S.schedRules || (S.schedRules = Object.assign({},
    (window.ScenarioScheduleEngine||{}).DEFAULT_RULES || {})));

  const pick = P.querySelector('#bsSchedStop');
  if (pick) pick.addEventListener('change', ()=>{ S.schedStop = pick.value; renderPathway(); });
  P.querySelectorAll('[data-stop]').forEach(b =>
    b.addEventListener('click', ()=>{ S.schedStop = b.dataset.stop; renderPathway(); }));

  // Move an event to another day.
  P.querySelectorAll('.bs-sc-daysel[data-ev]').forEach(sel =>
    sel.addEventListener('change', ()=>{
      const plan = planFor(S.schedStop);
      plan.dayOf[sel.dataset.ev] = +sel.value;
      if (+sel.value > (plan.minDays||0)) plan.minDays = 0;   // a new day comes from the placement
      redraw();
    }));

  // Split or un-split one event, whatever the threshold says.
  P.querySelectorAll('.bs-sc-split').forEach(b =>
    b.addEventListener('click', ()=>{
      const plan = planFor(S.schedStop);
      const id = b.dataset.ev;
      const cur = plan.split[id];
      // Cycle: model's choice -> forced on -> forced off -> back to the model.
      plan.split[id] = cur == null ? !(b.textContent.trim() === 'Run whole') : (cur ? false : null);
      if (plan.split[id] == null) delete plan.split[id];
      redraw();
    }));

  const open = P.querySelector('#bsSchedOpen'), close = P.querySelector('#bsSchedClose');
  const toMin = v => { const p = String(v||'').split(':'); return (+p[0]||0)*60 + (+p[1]||0); };
  if (open)  open.addEventListener('change',  ()=>{ rules().facilityOpenMin  = toMin(open.value);  redraw(); });
  if (close) close.addEventListener('change', ()=>{ rules().facilityCloseMin = toMin(close.value); redraw(); });
  const eps = P.querySelector('#bsSchedEPS');
  if (eps) eps.addEventListener('change', ()=>{
    rules().eventsPerSession = Math.max(1, Math.min(12, +eps.value||1)); redraw(); });

  const addDay = P.querySelector('#bsSchedAddDay');
  if (addDay) addDay.addEventListener('click', ()=>{
    const plan = planFor(S.schedStop);
    const out = computeSchedule(S.routeRes);
    const st = (out.stops||[]).find(x => stopKeyOf(x) === S.schedStop);
    plan.minDays = ((st && st.days) || 0) + 1;
    redraw();
  });

  wireScheduleDnD();

  const reset = P.querySelector('#bsSchedReset');
  if (reset) reset.addEventListener('click', async ()=>{
    if (!await bsConfirm({title:'Undo your changes to this meet?', danger:true, okLabel:'Undo my changes',
      body:'<p class="bs-dlg-p">Every event goes back where the model would put it, and any split you set by hand '
         + 'returns to the threshold. Other meets are untouched.</p>'})) return;
    delete S.schedPlans[S.schedStop];
    redraw();
  });

  const tplPick = P.querySelector('#bsTemplatePick');
  if (tplPick && !S._templateOptions){
    loadScheduleTemplates().then(list => { S._templateOptions = list; renderPathway(); });
  }
  const genBtn = P.querySelector('#bsGenSchedule');
  if (genBtn) genBtn.addEventListener('click', async ()=>{
    const tid = (P.querySelector('#bsTemplatePick')||{}).value;
    const src = (P.querySelector('#bsTemplateSource')||{}).value || 'projected';
    const startDate = (P.querySelector('#bsTemplateStart')||{}).value;
    if (!tid){ msg('Pick a template first.'); return; }
    if (!startDate){ msg('Pick a start date first \u2014 the template needs one to lay out real calendar days.'); return; }
    S._templateStart = startDate;
    genBtn.disabled = true; genBtn.textContent = 'Generating\u2026';
    try { await generateScheduleFromTemplate(tid, src, startDate); }
    catch(e){ console.error(e); /* generateScheduleFromTemplate already called msg() with the specific reason */ }
    finally { genBtn.disabled = false; genBtn.textContent = 'Generate real schedule\u2026'; }
  });
}

function renderScheduleInspector(res){
  const out = computeSchedule(res);
  if (out.error === 'engine-missing')
    return `<div class="ps-warn"><b>The schedule engine is not loaded.</b>
      Add <code>scenario-schedule-engine.js</code> to the page.</div>`;
  if (out.error) return `<div class="note">Working out the pathway first&hellip;</div>`;
  if (!out.stops.length) return `<div class="note">No stops to lay out yet. Draw a map and set a pathway first.</div>`;

  // Which meet are we looking at? Default to the first that does not fit,
  // because that is the one you opened this tab for.
  if (!S.schedStop || !out.stops.some(x => stopKeyOf(x) === S.schedStop))
    S.schedStop = stopKeyOf(out.stops.find(x => x.daysOver) || out.stops[0]);
  const st = out.stops.find(x => stopKeyOf(x) === S.schedStop) || out.stops[0];
  const R = out.rules, key = stopKeyOf(st), plan = planFor(key);

  const picker = `<select class="sel" id="bsSchedStop">${out.stops.map(x=>{
    const k = stopKeyOf(x);
    const flag = x.daysOver ? ' — does not fit' : '';
    return `<option value="${esc(k)}" ${k===S.schedStop?'selected':''}>${esc(x.name)} · ${esc(x.level)}${flag}</option>`;
  }).join('')}</select>`;

  const overview = out.stops.map(x => {
    const k = stopKeyOf(x);
    // data-hl lights this stop's area on the map on hover, the way every other
    // table here does -- reading "East runs long" and then hunting for East by
    // eye was the thing cross-highlighting exists to stop.
    const hl = x.levelIndex === 0 ? ` data-hl="${x.groupIndex}"` : '';
    return `<button class="bs-sc-pill ${k===S.schedStop?'on':''} ${x.unknown?'untimed':(x.daysOver?'bad':'ok')}"
      data-stop="${esc(k)}"${hl} title="${esc(x.level)}${x.unknown?` — ${x.unknown} event(s) not timed`:''}">${esc(x.name)}
      <b>${x.days}d</b>${x.daysOver?` <span>${x.daysOver} over</span>`:''}${
        x.unknown?` <span class="bs-sc-untimed">${x.unknown} untimed</span>`:''}</button>`;
  }).join('');

  if (st.err) return `<div class="ps-warn">${esc(st.err)}</div>`;
  const sim = st.sim, days = (sim && sim.days) || [];
  const dayCount = days.length;

  const dayCols = days.map(d => {
    const over = d.overCapacity;
    const clash = (d.conflicts||[]).length;
    const sessions = (d.sessions||[]).map(ss => {
      const evs = ss.events.map(e => {
        const canSplit = (R.neverSplitDisciplines||[]).indexOf(e.discipline) < 0;
        return `<div class="bs-sc-ev ${e.split?'split':''}" data-ev="${esc(e.id)}"
             data-min="${e.estimatedMinutes}" data-day="${d.dayNumber}"
             draggable="true" tabindex="0" role="button"
             aria-label="${esc(EVLBL(e.id))}, ${e.estimatedMinutes} minutes, day ${d.dayNumber}. Drag to another day, or use the day selector.">
          <div class="bs-sc-evh">
            <span class="bs-sc-grip" aria-hidden="true">&#8942;&#8942;</span>
            <span class="bs-sc-evn">${esc(EVLBL(e.id))}</span>
            <span class="bs-sc-evm">${e.estimatedMinutes}m</span>
          </div>
          <div class="bs-sc-evb">
            <span>${fmt(Math.round(e.divers))} divers &middot; ${e.dives ? e.dives + ' dives'
              : '<b class="bs-sc-untimed">no dive count &mdash; not timed</b>'}</span>
            ${e.split?`<span class="bs-sc-tag">split${e.splitManual?' (yours)':''}</span>`:''}
            ${!e.split && e.unsplitMinutes > R.splitReviewThresholdMin
               ? `<span class="bs-sc-tag warn">long</span>`:''}
          </div>
          <div class="bs-sc-eva">
            <label title="Drag the card on a desktop, or use this on a phone or with a keyboard">Day
              <select class="sel bs-sc-daysel" data-ev="${esc(e.id)}">
                ${Array.from({length: Math.max(dayCount, 1) + 1}, (_,i)=>i+1).map(n=>
                  `<option value="${n}" ${n===d.dayNumber?'selected':''}>${n}${n>dayCount?' (new)':''}</option>`).join('')}
              </select></label>
            ${canSplit ? `<button class="tab bs-mini bs-sc-split" data-ev="${esc(e.id)}"
                title="${e.split?'Run this whole instead':'Split this across two boards'}">${e.split?'Run whole':'Split'}</button>` : ''}
          </div>
        </div>`;
      }).join('');
      const laneNames = {'1m':'1m','3m':'3m','platform':'Platform','other':'other'};
      const laneBits = Object.keys(ss.lanes||{}).map(L =>
        `<span class="bs-sc-lane" title="${Math.round(ss.lanes[L])} min on this board">${esc(laneNames[L]||L)}
          <b>${Math.round(ss.lanes[L])}m</b></span>`).join('');
      const saved = (ss.sequentialMinutes||0) - (ss.compMinutes||0);
      return `<div class="bs-sc-sess">
        <div class="bs-sc-sh">Session ${ss.index}
          <span>${hhmm(ss.warmupStartMinutes)} &ndash; ${hhmm(ss.sessionEndMinutes)}</span></div>
        <div class="bs-sc-lanes">${laneBits}${saved > 0
          ? `<span class="bs-sc-par">running together &mdash; ${saved} min shorter than one board at a time</span>`
          : ''}</div>
        <div class="bs-sc-wu">Warm-up ${ss.warmupMinutes} min
          <span>${hhmm(ss.warmupStartMinutes)} &ndash; ${hhmm(ss.warmupStartMinutes + ss.warmupMinutes)}</span></div>
        ${evs}</div>`;
    }).join('');
    const occupied = (d.sessions||[]).reduce((a,ss)=>a+(ss.sessionEndMinutes-ss.warmupStartMinutes),0);
    const windowMin = R.facilityCloseMin - R.facilityOpenMin;
    const pct = Math.min(100, Math.round(100*occupied/Math.max(1,windowMin)));
    const practice = (d.practiceWindows||[]).filter(x=>x.usable)
      .map(x=>`${x.position} ${x.minutes}m`).join(' · ');
    return `<div class="bs-sc-day ${over?'over':''}" data-day="${d.dayNumber}"
        data-occ="${Math.round(occupied)}" data-win="${Math.round(windowMin)}">
      <div class="bs-sc-dh">Day ${d.dayNumber}
        <span class="bs-sc-dm">${(occupied/60).toFixed(1)}h of ${(windowMin/60).toFixed(1)}h</span></div>
      <div class="bs-sc-bar"><i style="width:${pct}%"></i></div>
      ${over?`<div class="bs-sc-warn">Runs ${d.overCapacityByMinutes} min past closing.</div>`:''}
      ${clash?`<div class="bs-sc-warn">Two events for the same age group and gender on one day
        (${esc((d.conflicts||[]).join(', '))}). You put them here; the model would not have.</div>`:''}
      ${sessions || '<div class="note" style="padding:8px">Nothing on this day.</div>'}
      ${practice?`<div class="bs-sc-pr">Practice: ${esc(practice)}</div>`:
        '<div class="bs-sc-pr warn">No usable practice window.</div>'}
    </div>`;
  }).join('');

  const bad = days.filter(d=>d.overCapacity).length;
  return `<div class="bs-tier-h">The schedule</div>
    <div class="bs-sc-pills">${overview}</div>
    <div class="bs-pwbar">
      <div class="bs-pwbar-h">${esc(st.name)} &mdash; ${esc(st.level)}</div>
      <div class="bs-pwbar-r">
        ${picker}
        <label class="bs-arr">Pool opens
          <input class="bs-rt-in" type="time" id="bsSchedOpen" value="${String(Math.floor(R.facilityOpenMin/60)).padStart(2,'0')}:${String(R.facilityOpenMin%60).padStart(2,'0')}"></label>
        <label class="bs-arr">closes
          <input class="bs-rt-in" type="time" id="bsSchedClose" value="${String(Math.floor(R.facilityCloseMin/60)).padStart(2,'0')}:${String(R.facilityCloseMin%60).padStart(2,'0')}"></label>
        <label class="bs-arr">Events per session
          <input class="bs-rt-in" type="number" min="1" max="12" id="bsSchedEPS" value="${R.eventsPerSession}"></label>
        <button class="tab bs-mini" id="bsSchedAddDay">Add a day</button>
        ${planDirty(key)?`<button class="tab bs-mini" id="bsSchedReset">Undo my changes to this meet</button>`:''}
      </div>
      <div class="bs-pwbar-r" style="margin-top:8px">
        <label class="bs-arr">Template
          <select class="sel" id="bsTemplatePick">${(S._templateOptions||[]).map(t=>
            `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('') || '<option value="">Loading&hellip;</option>'}</select></label>
        <label class="bs-arr">Entries
          <select class="sel" id="bsTemplateSource">
            <option value="projected">Today's calibrated projection</option>
            <option value="max">Maximum capacity (no calibration)</option>
            <option value="y25">Real 2025 entries</option>
            <option value="y26">Real 2026 entries</option>
          </select></label>
        <label class="bs-arr">Start date
          <input class="bs-rt-in" type="date" id="bsTemplateStart" value="${esc(S._templateStart || '')}"></label>
        <button class="tab bs-mini" id="bsGenSchedule">Generate real schedule&hellip;</button>
      </div>
      <div class="note bs-sc-hint">Builds a full Schedule Builder file from the picked template and entry source
        &mdash; training days, session-by-session timing, the works &mdash; and saves it there to open and refine
        with the real timing engine, boards, and broadcast tools. This tab stays the quick feasibility check;
        that is where a proposal becomes an actual working schedule.</div>
      <div class="note bs-sc-hint">Drag a card to another day. On a phone or with a keyboard, use the day
        selector on the card.</div>
      <div class="note">${planDirty(key)
        ? 'You have moved things on this meet. Your placements are kept and beat the model.'
        : 'Laid out by the model. Move an event to another day, or split one, and your choice sticks.'}</div>
    </div>
    ${st.unknown ? `<div class="ps-warn"><b>${fmt(st.unknown)} event${st.unknown===1?' has':'s have'} no dive count
        on record, and ${st.unknown===1?'is':'are'} therefore timed as zero minutes here.</b> This meet will run
        longer than shown, and the verdict below cannot be relied on until those events have a dive count.
        Everything else on the day is timed normally.</div>` : ''}
    ${bad?`<div class="bs-spread under">${bad} of ${dayCount} day${dayCount===1?'':'s'} runs past closing.</div>`
         :`<div class="bs-spread ${st.unknown?'':'ok'}">${st.unknown
             ? 'Every day fits — but only counting the events that could be timed.'
             : 'Every day fits inside the pool hours.'}</div>`}
    <div class="bs-sc-grid">${dayCols}
      <div class="bs-sc-newday" data-day="${dayCount+1}" data-occ="0" data-win="${R.facilityCloseMin-R.facilityOpenMin}">
        <span>Drop here to start<br>day ${dayCount+1}</span></div>
    </div>
    <div class="bs-prov"><b>Assuming</b>
      <span>warm-up A/B <code>${R.warmupSeniorGroupsMin} min</code>, C/D scales with entries</span>
      <span>one warm-up per session &mdash; the longest any event in it needs</span>
      <span>up to <code>3 boards</code> at once; a session is as long as its slowest board</span>
      <span>split over <code>${R.splitAutoThresholdMin} min</code>, flag over <code>${R.splitReviewThresholdMin} min</code></span>
      <span>platform never splits</span>
      <span>dive counts <code>2026 Zone &amp; Junior National schedules</code></span>
    </div>
    <p class="note"><b>Sessions run boards at the same time.</b> One event per board &mdash; a group on 1m while
      another is on 3m and another on platform &mdash; so a session lasts as long as its slowest board, not the sum
      of its events. That is how the published schedules are built: of the 102 competitive sessions in the 2026 Zone
      and Junior National schedules, 40 run three events, 46 run two, and 31 are the full 1m + 3m + platform.
      Two age groups are not put on the same board in a session unless it costs the session nothing.</p>
    <p class="note">Checked against those real schedules, this reproduces 12 of 14 sampled sessions to within 12%.
      The two it misses are dense three-event sessions where the host stacked a board and accepted a longer
      session; there this model reads <i>longer</i> than the day actually ran, which is the safe direction for a
      feasibility check. Sessions run back-to-back once started, with practice reserved before the first and
      between each pair. Nothing here changes a real schedule; it is a plan to argue with.</p>`;
}

/* ============================================================================
   COMPARE PATHWAYS ON ONE MAP
   Separating maps from pathways only pays off if you can put the variants next
   to each other. The committee question is not "is this map balanced" -- it is
   "nine zones sending three, or six sending five?" -- and answering it used to
   mean editing the routing, writing the numbers on paper, editing it back, and
   trusting yourself to have written them down right.

   Only the routing is swapped. The map, the seed field and the measured
   behaviour are held still, so every column differs by exactly one thing.
   ========================================================================= */

/* Swap the routing, run something, put it back whatever happens. Same shape as
   financialsFor(), and for the same reason: the routing is global state for the
   duration, so these must never be run concurrently. */
function withRouting(routing, fn){
  const snap = S.routing;
  try { S.routing = routing; return fn(); }
  finally { S.routing = snap; }
}

/* Structural ceiling, not a forecast: every band saturated as if the real
   field were infinite, no calibration applied (take-up behaviour is a fact
   about real turnout, meaningless against a hypothetical maximum). Reuses
   project() itself rather than re-deriving capacity by hand, so it can never
   quietly disagree with what a real, populated projection would do. */
function maxCapacityEntries(){
  const n = groupCountAt(0);
  const HUGE = 999999;
  const rows = Array.from({length: n}, () => {
    const r = {}; CELLS.forEach(c => r[c] = HUGE); return r;
  });
  return QR().project({
    routing: S.routing, entries0: rows,
    groupCount: groupCountAt, groupOf: groupUp, conv: {}, cells: CELLS,
  });
}

/* One place that answers "which entries feed this schedule" for all three
   sources the generator offers, so the UI picker and any future caller read
   the exact same definitions. Uses BoundaryAPI's own withYear (async) rather
   than a second one -- that property already existed before this feature. */
async function entriesForSource(source){
  if (source === 'max') return maxCapacityEntries();
  if (source === 'y25') return window.BoundaryAPI.withYear('y25', () => projectPathway());
  if (source === 'y26') return window.BoundaryAPI.withYear('y26', () => projectPathway());
  return projectPathway(); // 'projected': today's loaded year, calibrated
}

/* ============================================================================
   TEMPLATE -> REAL SCHEDULE
   A template names the WEEK'S SHAPE (training days, which groups compete
   which days, where a synchro or other special event sits) independent of
   any one scenario's numbers. Applying one to a projection is what actually
   produces a schedule -- output shaped to drop straight into
   schedule_builder.schedules, per the promotion path scenario_schedules was
   built for from the start.
   ========================================================================= */
function buildScheduleFromTemplate(template, res, meetInfo){
  const last = S.routing.length - 1;
  const spec = diveSpecFor(last);
  const E = window.ScenarioScheduleEngine;
  if (!E) throw new Error('scenario-schedule-engine.js is not loaded');

  function cellsFor(groupLetters){
    const prelim = {}, final = {};
    groupLetters.forEach(g => ['B','G'].forEach(x => ['1','3','P'].forEach(d => {
      const code = g + x + d;
      let n = 0;
      for (let gi = 0; gi < Math.max(1, groupCountAt(last)); gi++) n += QR().entriesAt(res, last, gi, [code]);
      n = Math.round(n); if (!n) return;
      const key = `${AGE_LBL[g]}|${GEN_LBL[x]}|${DIS_LBL[d]}`;
      prelim[`${key}|prelim`] = n;
      final[`${key}|final`] = Math.min(12, n);
    })));
    return [{key:'prelim', cells: prelim}, {key:'final', cells: final}];
  }
  function simDiveSpec(cellKey){
    // spec() expects Group X|Gender|Discipline|round with the LONG apparatus
    // name; DIS_LBL gives the short one, so translate exactly as computeSchedule() does.
    const p = cellKey.split('|');
    return spec(`${p[0]}|${p[1]}|${DIS_APPARATUS[p[2]]||p[2]}|${p[3]}`);
  }

  const blocks = template.blocks;
  const cdBlocks = blocks.filter(b => b.type === 'competition' && b.groups && b.groups.includes('C'));
  const abBlocks = blocks.filter(b => b.type === 'competition' && b.groups && b.groups.includes('A'));
  const cdSim = E.simulateStop({stopName:'C/D', rounds: cellsFor(['C','D'])}, simDiveSpec, null, {minDays: cdBlocks.length});
  const abSim = E.simulateStop({stopName:'A/B', rounds: cellsFor(['A','B'])}, simDiveSpec, null, {minDays: abBlocks.length});

  const days = [], sessions = [];
  let sc = 1;
  const base = new Date(meetInfo.startDate);
  const dateFor = n => { const d = new Date(base); d.setDate(d.getDate()+n-1); return d.toISOString().slice(0,10); };

  function trainingDay(n, label, openMin, closeMin, notes){
    days.push({id:`day-${n}`, date:dateFor(n), openMinutes:openMin, closeMinutes:closeMin, locked:false});
    sessions.push({id:`open-practice-${n}`, dayId:`day-${n}`, title:label, isOpenPracticeSession:true,
      warmupStartMinutes:openMin, warmupMinutes:0, transitionBufferMinutes:0, roundingIncrementMinutes:5,
      awardsEnabled:false, locked:false, collapsed:false,
      events:[{id:`training-${n}`, level:'Schedule', gender:'Open', apparatus:'Pool', style:'Custom Block',
        display:label, round:'Custom Block', blockTitle:label, customDurationMinutes:closeMin-openMin,
        numberOfDives:0, numberOfDivers:0, secondsPerDive:0, notes: notes||''}]});
  }
  function synchroSession(n, extraEvents, warmupStart){
    if (!extraEvents || !extraEvents.length) return;
    const evs = extraEvents.map(x => {
      const d = x.apparatus === '3-Meter' ? {dives:5, secondsPerDive:35} : {dives:5, secondsPerDive:45};
      return {id:`synchro-${x.gender}-${x.apparatus}`.toLowerCase().replace(/\s+/g,'-'), level:'14-18',
        gender:x.gender, apparatus:x.apparatus, style:'Synchronized', display:`14-18 ${x.gender} Synchro ${x.apparatus}`,
        round:'Final', numberOfDives:d.dives, defaultNumberOfDives:d.dives, numberOfDivers:12,
        secondsPerDive:d.secondsPerDive, notes:'Fixed field (12 teams) -- does not scale with proposal.'};
    });
    sessions.push({id:`session-${sc++}`, dayId:`day-${n}`, title:'Synchro', isOpenPracticeSession:false,
      warmupStartMinutes:warmupStart, warmupMinutes:60, transitionBufferMinutes:5, roundingIncrementMinutes:5,
      awardsEnabled:true, locked:false, collapsed:false, events:evs});
  }
  function compDay(n, simDay){
    days.push({id:`day-${n}`, date:dateFor(n), openMinutes:390, closeMinutes:1200, locked:false});
    (simDay.sessions||[]).forEach(sess => {
      const evs = sess.events.map(e => ({
        id:`${e.group}-${e.gender}-${e.discipline}-${e.round}`.toLowerCase().replace(/\s+/g,'-'),
        level:e.group, gender:e.gender, apparatus:e.discipline, style:'Individual',
        display:`${e.group} ${e.gender} ${e.discipline}`, round: e.round==='prelim'?'Prelim':'Final',
        numberOfDives:e.dives, defaultNumberOfDives:e.dives, numberOfDivers:e.divers,
        secondsPerDive:e.secondsPerDive, notes: e.split?'Split board (auto)':(e.reviewSplit?'Flagged for split review':''),
      }));
      sessions.push({id:`session-${sc++}`, dayId:`day-${n}`, title:`Session ${sc-1}`, isOpenPracticeSession:false,
        warmupStartMinutes:null, warmupMinutes:sess.warmupMinutes, transitionBufferMinutes:5,
        roundingIncrementMinutes:5, awardsEnabled:true, locked:false, collapsed:false, events:evs});
    });
  }

  let n = 1;
  blocks.forEach(b => {
    if (b.type === 'training'){ trainingDay(n, b.label, b.hours ? 480 : 390, b.hours ? 480+b.hours*60 : 1200, b.notes); n++; return; }
    if (b.type === 'mixed'){ trainingDay(n, b.label, 390, 1200, b.notes||''); synchroSession(n, b.extraEvents, 580); n++; return; }
    // competition
    const isC = b.groups.includes('C');
    const sim = isC ? cdSim : abSim;
    const idx = (isC?cdBlocks:abBlocks).indexOf(b);
    compDay(n, sim.days[idx]);
    if (b.extraEvents) synchroSession(n, b.extraEvents, 780);
    n++;
  });

  return {
    id: meetInfo.id, name: meetInfo.name, updatedAt: new Date().toISOString(),
    meet_type: 'custom', year: meetInfo.year || null,
    schedule: {
      updatedAt: new Date().toISOString(),
      meet: {name: meetInfo.name, venue: meetInfo.venue||'', city:'', timezone:'America/New_York',
        meetType:'custom', divemeetsId:'', divemeetsSources:[], days},
      profile: {id:'custom', label:'Custom', description: meetInfo.description||'',
        allowedRounds:['Qualifier','Prelim','Semifinal','Final','Custom Block','Open Practice'],
        roundRelationships:[], events:[]},
      sessions,
      outputSettings: {showWarmup:true, showEndTimes:true, showSubjectToChange:true},
      theme: 'classic', entryMode: 'projected', locks: {entries:false, sessionOrder:false}, publishStatus: 'draft',
    }
  };
}

let _templateListCache = null;
async function loadScheduleTemplates(){
  if (_templateListCache) return _templateListCache;
  try {
    const r = await NEON.query('SELECT id, name, notes, data FROM membership.schedule_templates ORDER BY name', []);
    _templateListCache = r.rows.map(row => ({...row, data: typeof row.data==='string'?JSON.parse(row.data):row.data}));
  } catch(e){ console.error(e); _templateListCache = []; }
  return _templateListCache;
}

async function generateScheduleFromTemplate(templateId, source, startDate){
  const templates = await loadScheduleTemplates();
  const t = templates.find(x => x.id === templateId);
  if (!t) { msg('Template not found.'); throw new Error('generateScheduleFromTemplate: no template with id ' + templateId); }
  if (!startDate) { msg('A start date is required.'); throw new Error('generateScheduleFromTemplate: startDate is required'); }
  const res = await entriesForSource(source);
  const sourceLabel = {max:'maximum capacity (no calibration)', y25:'real 2025 entries', y26:'real 2026 entries',
    projected:'today\u2019s calibrated projection'}[source] || source;
  const name = `${S.scenarioName || 'Untitled scenario'} \u2014 ${t.name} \u2014 ${sourceLabel}`;
  const schedule = buildScheduleFromTemplate(t.data, res, {
    id: 'sched-' + Math.random().toString(36).slice(2,10),
    name, venue: 'Peak Health Aquatic Center at Mylan Park, Morgantown, WV',
    description: `Generated from Boundary Studio scenario "${S.scenarioName||''}" (${S.scenarioId||'unsaved'}) `
      + `via template "${t.name}" (${t.id}), entries: ${sourceLabel}. Generated ${new Date().toISOString()}. `
      + `Projected entries, not synced from DiveMeets -- verify before publishing.`,
    year: S.year === 'y25' ? 2025 : 2026,
    startDate,
  });
  schedule.saved = false;
  try {
    if (S.scenarioId){
      await NEON.query(
        `INSERT INTO membership.scenario_schedules (id, boundary_scenario_id, stop_name, name, data)
         VALUES ($1,$2,$3,$4,$5::jsonb)
         ON CONFLICT (id) DO UPDATE SET name=$4, data=$5::jsonb, updated_at=now()`,
        [schedule.id, S.scenarioId, t.name, name, JSON.stringify(schedule.schedule)]);
    }
    await NEON.query(
      `INSERT INTO schedule_builder.schedules (id, name, meet_type, year, is_builtin, publish_status, data)
       VALUES ($1,$2,'custom',$3,false,'draft',$4::jsonb)
       ON CONFLICT (id) DO UPDATE SET name=$2, data=$4::jsonb, updated_at=now()`,
      [schedule.id, name, schedule.year, JSON.stringify(schedule)]);
    schedule.saved = true;
    msg(`Generated "${name}" \u2014 open it in Schedule Builder to refine timing, boards, and broadcast.`);
  } catch(e){
    console.error(e);
    msg('Could not save the generated schedule: ' + (e.message||e));
    // schedule.saved stays false -- built successfully, not persisted. A caller
    // checking truthiness alone would otherwise read this as a full success.
  }
  return schedule;
}

/* Swap the map, run something, put it back. Take-up is read from
   JuniorFlow.constants(), not from the map, so it stays fixed across the swap
   -- which is the same choice the advancement figures already make: re-measuring
   behaviour on every map would let it absorb the change and nothing would ever
   appear to move. */
function withMap(map, fn){
  const snap = {regions:S.regions, assign:S.assign, levels:S.levels,
                finalName:S.finalName, routing:S.routing};
  try {
    S.regions = (map.regions && map.regions.length) ? map.regions : snap.regions;
    S.assign  = map.assign || snap.assign;
    if (map.levels && map.levels.length) S.levels = map.levels;
    if (map.finalName) S.finalName = map.finalName;
    // A map with a different number of levels cannot take the current routing
    // as-is -- routes point at level indices. Fit it, and hand back the notes.
    let notes = [];
    if (S.levels.length !== snap.routing.length){
      const fit = adaptPathway({routing: snap.routing});
      S.routing = fit.routing; notes = fit.notes;
    }
    return fn(notes);
  } finally {
    S.regions = snap.regions; S.assign = snap.assign; S.levels = snap.levels;
    S.finalName = snap.finalName; S.routing = snap.routing;
  }
}

/* Everything a column needs, measured the same way for every variant. */
function summariseRouting(routing, label, notes){
  return withRouting(routing, () => {
    const res = projectPathway();
    if (!res) return {label, notes, error: 'could not project'};
    const sched = computeSchedule(res);
    const cells = CELLS;
    // Same meetMoney() the "Every meet" table and its CSV export already use --
    // summed across every stop in the whole season, not reimplemented here.
    // This is the number that answers "what does this proposal net USA Diving,
    // all in" without cross-referencing Pricing Studio by hand.
    const manifest = meetManifest(res);
    const finance = manifest.reduce((acc, m) => {
      const $ = meetMoney(m);
      acc.gross += $.gross; acc.levy += $.levy; acc.host += $.host; acc.usad += $.usad;
      return acc;
    }, {gross:0, levy:0, host:0, usad:0});
    const levels = routing.map((lvl, L) => {
      const stops = Math.max(1, groupCountAt(L));
      const rounds = QR().roundsOf(lvl);
      // People AT this stage, which is everyone who joins it at any round --
      // not the size of its first round, which misses anyone seeded past it.
      let entry = 0;
      for (let g = 0; g < stops; g++) entry += QR().entriesAt(res, L, g, cells);
      const refStage = L === 0 ? seedStage() : stageNameForLevel(L);
      const ceiling = historicalCeiling(refStage);
      const flagged = ceiling != null && entry > ceiling * SANITY_HEADROOM;
      return {name: tierName(L), stops, entries: entry, perStop: entry / stops,
              rounds: rounds.length, refStage, historicalMax: ceiling, flagged};
    });
    const sanityFlags = levels.filter(l => l.flagged);
    const last = routing.length - 1;
    const lastRounds = QR().roundsOf(routing[last]);
    // The headline a committee actually argues about: how many reach the
    // championship. Read off its entry round, not the reduced final.
    let finalField = 0;
    for (let g = 0; g < Math.max(1, groupCountAt(last)); g++) finalField += QR().entriesAt(res, last, g, cells);
    // Same number, split by age group x gender (summed across the three
    // disciplines) -- the cut a committee actually asks for, not just the
    // aggregate. Additive: existing callers reading finalField are unaffected.
    const byGroup = AGES.map(a => GENS.map(gd => {
      const subset = DISCS.map(d => a.k + gd.k + d.k);
      let n = 0;
      for (let g = 0; g < Math.max(1, groupCountAt(last)); g++) n += QR().entriesAt(res, last, g, subset);
      return {age: a.k, gender: gd.k, label: `${a.label} ${gd.label}`, field: Math.round(n*100)/100};
    })).flat();
    const st = sched.stops || [];
    return {
      label, notes,
      levels, finalField, byGroup, sanityFlags, finance,
      meets:     st.length,
      daysTotal: st.reduce((a,x)=>a+(x.days||0), 0),
      over:      st.filter(x=>x.daysOver).length,
      autoSplit: st.reduce((a,x)=>a+(x.autoSplit||0), 0),
      review:    st.reduce((a,x)=>a+(x.review||0), 0),
      problems:  (res.problems||[]).length,
      stops: st.map(x=>({name:x.name, level:x.level, entries:x.entries,
                         days:x.days, daysOver:x.daysOver})),
    };
  });
}

/* Build every column. The first is always what is on screen, so a comparison
   is always anchored to something you can see. */
async function buildComparison(ids, axis){
  if (!QR() || !S.flow || !S.routing) return null;
  const onPathways = (axis || 'pathway') === 'pathway';
  const baseLabel = onPathways ? currentPathwayLabel() : (S.scenarioName || 'This map');
  const cols = [summariseRouting(S.routing, baseLabel, null)];

  for (const id of (ids||[])){
    let row = null;
    try {
      if (onPathways){
        const r = await NEON.query('SELECT name, data FROM membership.pathways WHERE id=$1', [id]);
        if (!r.rows || !r.rows.length){ cols.push({label:'(deleted)', error:'no longer saved'}); continue; }
        const p = typeof r.rows[0].data === 'string' ? JSON.parse(r.rows[0].data) : r.rows[0].data;
        // Fit onto the structure now on screen; carry the notes into the column
        // so a fitted pathway never reads as a clean like-for-like.
        const fit = adaptPathway(p);
        row = summariseRouting(fit.routing, r.rows[0].name, fit.notes);
      } else {
        const r = await NEON.query('SELECT name, data FROM membership.boundary_scenarios WHERE id=$1', [id]);
        if (!r.rows || !r.rows.length){ cols.push({label:'(deleted)', error:'no longer saved'}); continue; }
        const d = typeof r.rows[0].data === 'string' ? JSON.parse(r.rows[0].data) : r.rows[0].data;
        const map = {regions: d.regions, assign: d.assign,
                     levels: migrateLevels(d, (d.regions||[]).length), finalName: d.finalName};
        row = withMap(map, notes => summariseRouting(S.routing, r.rows[0].name, notes.length ? notes : null));
      }
    } catch(e){ row = {label:'(error)', error: e.message || String(e)}; }
    cols.push(row);
  }
  return cols;
}

function currentPathwayLabel(){
  if (S.pathSaved) return S.pathSaved.name + (S.pathDirty ? ' (edited)' : '');
  if (S.routing && S.routing.length) return (S.scenarioName || 'This map') + '\u2019s own';
  return 'Published rules';
}

/* ---------- compare tab ---------- */
function renderCompareInspector(){
  const axis = S.cmpAxis || 'pathway';
  const onPath = axis === 'pathway';
  const lib = onPath ? (S.pathList || []) : (S.mapList || []).filter(m => m.id !== S.scenarioId);
  const anchor = onPath ? currentPathwayLabel() : (S.scenarioName || 'the map on screen');

  const axisSeg = `<div class="seg" style="margin-bottom:10px">
    <button data-cmpaxis="pathway" class="${onPath?'on':''}">Same map, different pathways</button>
    <button data-cmpaxis="map" class="${!onPath?'on':''}">Same pathway, different maps</button></div>`;

  const held = onPath
    ? 'The boundaries, the field each pathway starts from and the measured behaviour are held still.'
    : 'The pathway, the season and the measured behaviour are held still.';

  if (!lib.length) return `<div class="bs-tier-h">Compare</div>${axisSeg}
    <div class="ps-warn"><b>${onPath
      ? 'Nothing saved to compare against yet.' : 'No other saved maps to compare against yet.'}</b>
      ${onPath
        ? 'Save the pathway you have now under <b>Structure</b>, change it, save that too &mdash; then this puts them side by side on the same map.'
        : 'Save another map under the scenario controls below the inspector, then this runs your pathway across both.'}</div>
    <p class="note">Only the ${onPath?'pathway':'map'} changes between columns. ${esc(held)}</p>`;

  const picks = S.cmpIds || [];
  const chooser = lib.map(p => `<label class="bs-cmp-pick">
    <input type="checkbox" data-cmp="${esc(p.id)}" ${picks.indexOf(p.id)>=0?'checked':''}>
    ${esc(p.name)}${onPath?` <span class="bs-arr-m">${p.levels} levels</span>`:''}</label>`).join('');

  const C = S.cmpRes;
  let table = `<div class="note">Choose one or more saved ${onPath?'pathways':'maps'} to put beside ${esc(anchor)}.</div>`;
  if (C && C.length){
    const head = C.map((c,i)=>`<th class="num">${esc(c.label)}${i===0?' <span class="bs-arr-m">on screen</span>':''}</th>`).join('');
    const base = C[0];
    const delta = (v,b) => (b==null||v==null||!isFinite(v-b)||Math.round(v)===Math.round(b)) ? ''
      : ` <span class="bs-cmp-d ${v-b>0?'up':'down'}">${v-b>0?'+':''}${fmt(Math.round(v-b))}</span>`;
    const row = (label,get,fmtv,hint) => `<tr><td>${esc(label)}${hint?`<div class="bs-lg-sub">${esc(hint)}</div>`:''}</td>` +
      C.map((c,i)=>{
        if (c.error) return `<td class="num under">${esc(c.error)}</td>`;
        const v=get(c); if (v==null) return '<td class="num">&mdash;</td>';
        return `<td class="num">${fmtv?fmtv(v):fmt(Math.round(v))}${i>0?delta(v,get(base)):''}</td>`;
      }).join('') + '</tr>';
    const nLev = Math.max(0, ...C.filter(c=>c.levels).map(c=>c.levels.length));
    const levelRows = Array.from({length:nLev}, (_,L) =>
      row(((base.levels&&base.levels[L])?base.levels[L].name:'Level '+(L+1)) + ' \u2014 entries',
          c => (c.levels&&c.levels[L]) ? c.levels[L].entries : null, null,
          (base.levels&&base.levels[L]) ? `${base.levels[L].stops} stop${base.levels[L].stops===1?'':'s'}` : '')).join('');
    const noted = C.filter(c=>c.notes && c.notes.length);
    table = `<div class="bs-scroll"><table class="bs-drill bs-cmp"><thead><tr><th>&nbsp;</th>${head}</tr></thead><tbody>
      ${row('Championship field', c=>c.finalField, null, 'who reaches the top meet')}
      ${levelRows}
      ${row('Meets to run', c=>c.meets)}
      ${row('Competition days, all meets', c=>c.daysTotal)}
      ${row('Meets that do not fit', c=>c.over, v=>v?`<span class="under">${v}</span>`:'0')}
      ${row('Events split', c=>c.autoSplit)}
      ${row('Events to look at', c=>c.review)}
      ${row('Pathway problems', c=>c.problems, v=>v?`<span class="under">${v}</span>`:'0')}
      ${row('Sanity check vs. real history', c=>(c.sanityFlags||[]).length, v=>v?`<span class="under">${v} above real ceiling</span>`:'clear')}
      ${row('Entry income (season, all stops)', c=>c.finance&&c.finance.gross, v=>usd(v), 'published fee \u00d7 real entries, every stop')}
      ${row('DiveMeets levy', c=>c.finance&&c.finance.levy, v=>'\u2212'+usd(v))}
      ${row('Host cut', c=>c.finance&&c.finance.host, v=>usd(v), 'per the host-cut model on screen')}
      ${row('USA Diving keeps (entry fees only)', c=>c.finance&&c.finance.usad, v=>usd(v), 'does not include membership dues \u2014 a separate revenue stream, shown for context in Membership Analytics')}
    </tbody></table></div>
    ${C.some(c=>(c.sanityFlags||[]).length) ? `<ul class="bs-probs">${C.filter(c=>(c.sanityFlags||[]).length).map(c=>`<li class="bs-prob warn">
      <b>${esc(c.label)}</b>: ${c.sanityFlags.map(f=>`${esc(f.name)} projects ${fmt(Math.round(f.entries))}, the highest real ${esc(f.refStage)} field ever run is ${fmt(f.historicalMax)}`).join('; ')}.
      Check the seed pool and route bands before using this number.</li>`).join('')}</ul>` : ''}
    ${noted.length ? `<ul class="bs-probs">${noted.map(c=>`<li class="bs-prob warn">
      <b>${esc(c.label)}</b> does not have the same number of levels as the structure on screen, so the pathway was
      fitted onto it. ${c.notes.map(n=>esc(n)).join(' ')}</li>`).join('')}</ul>` : ''}
    <p class="note">Only the ${onPath?'pathway':'map'} differs between columns. ${esc(held)} A change against the
      column on screen is caused by that one thing and nothing else.</p>
    <p class="note"><b>Reading this without being caught out.</b> Each route band sets the size of the meet it feeds,
      so widening how many leave the first stop changes how big the next meet is &mdash; it does <i>not</i> change the
      championship field, which is capped by the last route into it. If the top line has not moved, the change you
      made was upstream of what sets it.</p>`;
  }

  return `<div class="bs-tier-h">Compare</div>${axisSeg}
    <div class="bs-pwbar"><div class="bs-pwbar-h">Put beside &ldquo;${esc(anchor)}&rdquo;</div>
      <div class="bs-cmp-picks">${chooser}</div>
      <div class="bs-pwbar-r"><button class="tab bs-mini" id="bsCmpRun">Compare</button>
        ${C?`<button class="tab bs-mini" id="bsCmpClear">Clear</button>`:''}</div></div>
    ${table}`;
}


/* ============================================================================
   BRUSH INTELLIGENCE
   One county per click is a mouse-sized tool for a country-sized job. The
   brush walks the same county adjacency graph the auto-draw uses, so a radius
   of 2 paints the cursor county and everything within two borders of it.
   ========================================================================= */
let _brushAdj = null, _brushIdx = null;
function ensureBrushGraph(){
  if (_brushAdj) return true;
  if (!_autoData || !_autoData.adj || !_autoData.fips) { loadAutoData().catch(()=>{}); return false; }
  _brushAdj = _autoData.adj;
  _brushIdx = {}; _autoData.fips.forEach((f,i)=>{ _brushIdx[f] = i; });
  return true;
}

/* Counties within `r` borders of `fips`, breadth-first. */
function brushDisc(fips, r){
  if (!ensureBrushGraph() || _brushIdx[fips] == null) return [fips];
  const start = _brushIdx[fips], seen = new Set([start]);
  let frontier = [start];
  for (let d = 0; d < r; d++){
    const next = [];
    for (const u of frontier) for (const v of (_brushAdj[u]||[])){
      if (!seen.has(v)){ seen.add(v); next.push(v); }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return [...seen].map(i => _autoData.fips[i]);
}

function paintBrush(fips){
  brushDisc(fips, S.brush).forEach(f => assignCounty(f));
}

function setBrush(r){
  S.brush = Math.max(0, Math.min(6, r));
  if (S.brush > 0) ensureBrushGraph();
  const el = document.getElementById('bsBrushLbl');
  if (el) el.textContent = S.brush === 0 ? 'single county' : `${S.brush} deep`;
  msg(S.brush === 0 ? 'Brush: single county' : `Brush: everything within ${S.brush} border${S.brush>1?'s':''}`);
}

/* ============================================================================
   PREDICTIVE HOVER
   The accumulator makes a speculative tally cheap enough to run on every
   pointer move, which means the consequence of a stroke can be shown BEFORE it
   is committed. Hover a county with a brush loaded and the strip reports what
   the map would become, not what it is. You stop painting-then-checking and
   start steering.
   ========================================================================= */
function previewMove(fips){
  if (S.active == null) return null;
  const cur = S.assign[fips];
  const to  = S.active === -1 ? null : S.active;
  if ((cur == null && to == null) || cur === to) return null;
  const before = computeTallies();
  const TG = before.TG;
  const rec = countyStat(fips);
  if (!rec) return null;
  const gi = ri => (ri==null || ri<0 || ri>=S.regions.length) ? -1 : TG.of[ri];
  const gFrom = gi(cur), gTo = gi(to);
  if (gFrom === gTo) return null;

  // Speculative totals: copy only the two areas that move, never the whole set.
  const tot = before.rows.map(r => r.m);
  const unM = before.un.m;
  const adj = (g, sign) => { if (g >= 0) tot[g] += sign*rec.m; };
  adj(gFrom, -1); adj(gTo, +1);
  const grand = tot.reduce((a,b)=>a+b, 0);
  const spreadOf = arr => {
    const g = arr.reduce((a,b)=>a+b,0);
    return (g > 0 && arr.length > 1) ? (100*Math.max(...arr)/g - 100*Math.min(...arr)/g) : 0;
  };
  const wasArr = before.rows.map(r=>r.m);
  return {
    fips,
    toName:   gTo   >= 0 ? (TG.groups[gTo]||{}).name   : 'unassigned',
    fromName: gFrom >= 0 ? (TG.groups[gFrom]||{}).name : 'unassigned',
    members: rec.m,
    spreadWas: spreadOf(wasArr),
    spreadNow: spreadOf(tot),
  };
}

/* Draw the preview into the strip without disturbing the committed numbers. */
function showPreview(fips){
  const el = document.getElementById('bsStrip');
  if (!el) return;
  const p = fips == null ? null : previewMove(fips);
  if (!p){
    if (S._preview){ S._preview = null; renderConsequenceStrip(); }
    return;
  }
  S._preview = p;
  const d = p.spreadNow - p.spreadWas;
  const better = d < -0.05, worse = d > 0.05;
  const arrow = better ? '&darr;' : (worse ? '&uarr;' : '&rarr;');
  el.innerHTML = `<div class="bs-str-c pre">
      <span class="bs-str-v">+${fmt(p.members)}</span>
      <span class="bs-str-l">members to ${esc(p.toName)}</span></div>
    <div class="bs-str-c pre ${better?'ok':(worse?'bad':'')}">
      <span class="bs-str-v">${p.spreadWas.toFixed(1)} ${arrow} ${p.spreadNow.toFixed(1)}</span>
      <span class="bs-str-l">widest gap, pp</span></div>
    <div class="bs-str-c pre"><span class="bs-str-v">&mdash;</span>
      <span class="bs-str-l">release to apply</span></div>`;
}

/* ============================================================================
   COMMAND PALETTE
   Six inspectors, two libraries, a dozen actions and every area by name. For
   someone running this one-handed from a station beside the pool, typing three
   letters beats hunting through tabs.
   ========================================================================= */
function paletteItems(){
  const out = [];
  const add = (label, hint, run, group) => out.push({label, hint, run, group});
  INSPECTORS.forEach(t => add('Go to ' + t.label, t.hint,
    ()=>{ S.panelMode=t.k; renderPanel(); refreshFlow(); }, 'Navigate'));
  (S.pathList||[]).forEach(pw => add('Load pathway: ' + pw.name,
    `${pw.levels} levels`, ()=>loadPathway(pw.id), 'Pathways'));
  (S.mapList||[]).forEach(mp => add('Load map: ' + mp.name, '', ()=>loadScenario(mp.id), 'Maps'));
  const TG = tierGroups();
  TG.groups.forEach((g, gi) => add('Highlight ' + g.name, tierName(S.tierView),
    ()=>{ highlightArea(gi); setTimeout(()=>highlightArea(null), 2600); }, 'Areas'));
  add('Separate touching colours', 'No two neighbours look alike', separateAdjacentColors, 'Map');
  add('Freeze this scenario', 'Record what it says right now', freezeScenario, 'Record');
  add('Save the scenario', '', ()=>saveScenario(false), 'Record');
  add('Undo', 'Ctrl+Z', ()=>doUndo(), 'Edit');
  [0,1,2,3,4].forEach(r => add('Brush: ' + (r===0?'single county':r+' deep'),
    r===0?'One county per click':'Everything within '+r+' border'+(r>1?'s':''), ()=>setBrush(r), 'Brush'));
  return out;
}

function openPalette(){
  if (document.getElementById('bsPal')) return;
  const items = paletteItems();
  const wrap = document.createElement('div');
  wrap.className = 'bs-dlg-back'; wrap.id = 'bsPal';
  wrap.innerHTML = `<div class="bs-pal" role="dialog" aria-modal="true" aria-label="Command palette">
    <input class="bs-pal-in" id="bsPalIn" placeholder="Type to search actions, maps, pathways, areas&hellip;"
      autocomplete="off" spellcheck="false">
    <div class="bs-pal-list" id="bsPalList"></div>
    <div class="bs-pal-f">Enter to run &middot; Esc to close</div></div>`;
  document.body.appendChild(wrap);
  const inp = wrap.querySelector('#bsPalIn'), list = wrap.querySelector('#bsPalList');
  let shown = items, sel = 0;

  // Subsequence match, so "gtsc" finds "Go to Schedule" the way an editor would.
  const score = (q, s2) => {
    if (!q) return 0;
    const a = q.toLowerCase(), b = s2.toLowerCase();
    const direct = b.indexOf(a);
    if (direct >= 0) return 1000 - direct;
    let i = 0, hits = 0, last = -1, gap = 0;
    for (let j = 0; j < b.length && i < a.length; j++){
      if (b[j] === a[i]){ if (last >= 0) gap += j - last - 1; last = j; i++; hits++; }
    }
    return i === a.length ? 500 - gap : -1;
  };
  const draw = () => {
    list.innerHTML = shown.length ? shown.map((it,i)=>`<div class="bs-pal-i ${i===sel?'on':''}" data-i="${i}">
      <span class="bs-pal-g">${esc(it.group)}</span>
      <span class="bs-pal-l">${esc(it.label)}</span>
      ${it.hint?`<span class="bs-pal-h">${esc(it.hint)}</span>`:''}</div>`).join('')
      : '<div class="bs-pal-none">Nothing matches.</div>';
    const on = list.querySelector('.bs-pal-i.on');
    if (on && on.scrollIntoView) on.scrollIntoView({block:'nearest'});
  };
  const close = () => { document.removeEventListener('keydown', key, true); wrap.remove(); };
  const run = () => { const it = shown[sel]; close(); if (it) try { it.run(); } catch(e){ msg(e.message||String(e)); } };
  const key = e => {
    if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown'){ e.preventDefault(); sel = Math.min(sel+1, shown.length-1); draw(); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); sel = Math.max(sel-1, 0); draw(); }
    else if (e.key === 'Enter'){ e.preventDefault(); run(); }
  };
  inp.addEventListener('input', ()=>{
    const q = inp.value.trim();
    shown = !q ? items
      : items.map(it=>({it, s:Math.max(score(q,it.label), score(q,it.group)-200)}))
             .filter(x=>x.s>=0).sort((a,b)=>b.s-a.s).map(x=>x.it);
    sel = 0; draw();
  });
  list.addEventListener('click', e=>{
    const t = e.target.closest('[data-i]'); if (!t) return;
    sel = +t.dataset.i; run();
  });
  wrap.addEventListener('click', e=>{ if (e.target===wrap) close(); });
  document.addEventListener('keydown', key, true);
  draw(); inp.focus();
}

/* ============================================================================
   THE CONSEQUENCE STRIP
   Splitting the old seven-panel scroll into inspectors fixed the scrolling and
   created a new problem: paint a county now and you cannot see what it broke
   unless you happen to be standing on the tab that knows. Make an area too big
   and Schedule knows the meet will not run -- but you will not, until you think
   to go and look. So four numbers live under the map and never leave.
   ========================================================================= */
function renderConsequenceStrip(){
  const el = document.getElementById('bsStrip');
  if (!el) return;
  const cell = (label, value, cls, hint) => `<div class="bs-str-c ${cls||''}" ${hint?`title="${esc(hint)}"`:''}>
    <span class="bs-str-v">${value}</span><span class="bs-str-l">${esc(label)}</span></div>`;
  const nAreas = groupCountAt(S.tierView);
  let out = cell(tierName(S.tierView) + (nAreas===1?'':'s'), fmt(nAreas), '');
  if (S.flow && S.flow.levels){
    const i = Math.min(S.tierView, S.flow.levels.length-1);
    const rows = (S.flow.levels[i] && S.flow.levels[i].rows) || [];
    const totals = tierGroupsAt(i).groups.map((_,gi)=>CELLS.reduce((a,c)=>a+((rows[gi]||{})[c]||0),0));
    const grand = totals.reduce((a,b)=>a+b,0);
    if (grand > 0 && totals.length > 1){
      const equal = 100/totals.length;
      const spread = 100*Math.max(...totals)/grand - 100*Math.min(...totals)/grand;
      const cls = spread <= equal*0.30 ? 'ok' : (spread <= equal*0.60 ? 'warn' : 'bad');
      out += cell('widest gap', spread.toFixed(1)+' pp', cls,
        'How far the biggest area is from the smallest, as a share of everyone competing.');
    }
  } else out += cell('widest gap', '&hellip;', '');
  const res = S.routeRes;
  if (res && res.field){
    let sched = null;
    try { sched = computeSchedule(res); } catch(e){}
    if (sched && sched.stops && sched.stops.length){
      const bad = sched.stops.filter(x=>x.daysOver).length;
      out += cell(bad===1?'meet does not fit':'meets do not fit', fmt(bad), bad?'bad':'ok',
        'Meets running past a standard facility day. Open Schedule for which ones.');
    }
    try {
      const last = S.routing.length-1;
      let n = 0;
      for (let g = 0; g < Math.max(1, groupCountAt(last)); g++) n += QR().entriesAt(res, last, g, CELLS);
      out += cell('reach ' + (S.finalName||'the final'), fmt(Math.round(n)), '');
    } catch(e){}
  } else out += cell('meets', '&hellip;', '') + cell('championship field', '&hellip;', '');
  el.innerHTML = out;
}

/* ============================================================================
   CROSS-HIGHLIGHTING
   Reading "East runs three days over" and then hunting for East by eye against
   a colour key is the slowest thing about these screens. Hovering any row that
   names an area lights that area on the map and fades the rest. Purely a class
   on the <svg>: the county paths already carry everything the CSS needs.
   ========================================================================= */
function highlightArea(gi){
  const svg = document.getElementById('bsSvg');
  if (!svg) return;
  if (gi == null || gi < 0 || isNaN(gi)){
    svg.classList.remove('bs-hl');
    svg.querySelectorAll('path.bcty.on').forEach(el => el.classList.remove('on'));
    return;
  }
  svg.classList.add('bs-hl');
  const of = tierGroups().of;
  svg.querySelectorAll('path.bcty').forEach(el => {
    const ri = S.assign[el.dataset.f];
    const g = (ri != null && ri >= 0) ? of[ri] : null;
    el.classList.toggle('on', g === gi);
  });
}

/* One delegated listener for the whole inspector rather than one per table. */
function wireCrossHighlight(){
  const P = document.getElementById('bsPanel');
  if (!P || P._xh) return;
  P._xh = true;
  P.addEventListener('mouseover', e => {
    const t = e.target.closest && e.target.closest('[data-hl]');
    if (t) highlightArea(+t.dataset.hl);
  });
  P.addEventListener('mouseout', e => {
    const t = e.target.closest && e.target.closest('[data-hl]');
    if (!t) return;
    const to = e.relatedTarget;
    if (!to || !to.closest || !to.closest('[data-hl]')) highlightArea(null);
  });
  P.addEventListener('mouseleave', () => highlightArea(null));
}

/* ============================================================================
   ADJACENCY-AWARE COLOURS
   groupColor() hands out a fixed palette by index with no idea which areas
   touch. Several pairs in that list are hard to separate at map scale
   (#009AC7 / #0891b2, #171F69 / #1d4ed8, #8FC3EA / #009AC7) and nothing stopped
   two of them landing side by side. In a printed board pack two near-identical
   neighbours read as one area -- a wrong conclusion drawn from a correct map,
   in the artefact that leaves the building.
   ========================================================================= */
function colorDistance(a, b){
  const hex = h => { const v = String(h||'').replace('#',''); return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16)||0); };
  const c1 = hex(a), c2 = hex(b), rm = (c1[0]+c2[0])/2;
  // Weighted RGB — the cheap approximation of perceived difference. Good enough
  // to separate two blues, which is the entire job here.
  return Math.sqrt((2+rm/256)*(c1[0]-c2[0])**2 + 4*(c1[1]-c2[1])**2 + (2+(255-rm)/256)*(c1[2]-c2[2])**2);
}

/* Which painted areas share a border, from the county adjacency the auto-draw
   already walks. */
async function areaAdjacency(){
  let A = null;
  try { A = await loadAutoData(); } catch(e){ return null; }
  if (!A || !A.adj || !A.fips) return null;
  const n = S.regions.length;
  const adj = Array.from({length:n}, () => new Set());
  for (let i = 0; i < A.adj.length; i++){
    const ra = S.assign[A.fips[i]];
    if (ra == null || ra < 0 || ra >= n) continue;
    for (const j of A.adj[i]){
      const rb = S.assign[A.fips[j]];
      if (rb == null || rb < 0 || rb >= n || rb === ra) continue;
      adj[ra].add(rb); adj[rb].add(ra);
    }
  }
  return adj;
}

async function separateAdjacentColors(){
  const adj = await areaAdjacency();
  if (!adj){ msg('Could not work out which areas touch each other.'); return; }
  const MIN = 190;                 // below this, two fills read as one at map scale
  const chosen = S.regions.map(r => r.color);
  let changed = 0, stuck = 0;
  for (let i = 0; i < S.regions.length; i++){
    const clash = c => [...adj[i]].some(j => colorDistance(c, chosen[j]) < MIN);
    if (!clash(chosen[i])) continue;
    const alt = PALETTE.find(c => !clash(c) && chosen.indexOf(c) < 0) || PALETTE.find(c => !clash(c));
    if (alt){ chosen[i] = alt; changed++; } else stuck++;
  }
  if (!changed && !stuck){ msg('Every pair of touching areas is already easy to tell apart.'); return; }
  pushUndo();
  S.regions.forEach((r,i) => { r.color = chosen[i]; });
  S.dirty = true; repaintAll(); renderPanel();
  msg(`Recoloured ${changed} area${changed===1?'':'s'} so no two touching areas look alike.`
    + (stuck ? ` ${stuck} could not be separated \u2014 more neighbours than distinct colours.` : ''));
}

/* ============================================================================
   DIALOGS
   Replaces window.prompt / window.confirm. Those are unstyled, off-brand,
   unusable one-handed at the side of a pool, and -- the reason that actually
   matters -- structurally incapable of showing you what you are about to do.
   Freezing a scenario should put the figures you are recording in front of you
   BEFORE you commit them; a browser prompt cannot.

   Promise-based so call sites read the same as the calls they replace:
     const name = await bsPrompt({title, label, value});      // null if cancelled
     if (!await bsConfirm({title, body})) return;
   ========================================================================= */
function bsDialog(opts){
  return new Promise(resolve => {
    const prev = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'bs-dlg-back';
    const danger = opts.danger ? ' danger' : '';
    wrap.innerHTML = `
      <div class="bs-dlg${danger}" role="dialog" aria-modal="true" aria-label="${esc(opts.title||'')}">
        <div class="bs-dlg-h">${esc(opts.title||'')}</div>
        <div class="bs-dlg-b">
          ${opts.body || ''}
          ${opts.input ? `<label class="bs-dlg-lbl">${esc(opts.input.label||'')}
            <input class="bs-dlg-in" id="bsDlgIn" value="${esc(opts.input.value||'')}"
              placeholder="${esc(opts.input.placeholder||'')}" maxlength="120"></label>` : ''}
        </div>
        <div class="bs-dlg-f">
          <button class="tab" data-dlg="cancel">${esc(opts.cancelLabel||'Cancel')}</button>
          <button class="tab bs-dlg-go${danger}" data-dlg="ok">${esc(opts.okLabel||'OK')}</button>
        </div>
      </div>`;
    const done = v => {
      document.removeEventListener('keydown', key, true);
      wrap.remove();
      if (prev && prev.focus) try { prev.focus(); } catch(e){}
      resolve(v);
    };
    const val = () => {
      const el = wrap.querySelector('#bsDlgIn');
      return opts.input ? (el ? el.value.trim() : '') : true;
    };
    const key = e => {
      if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); done(null); }
      else if (e.key === 'Enter' && (!opts.input || document.activeElement === wrap.querySelector('#bsDlgIn'))){
        e.preventDefault(); e.stopPropagation();
        const v = val(); done(opts.input && !v ? null : v);
      }
    };
    wrap.addEventListener('click', e => {
      if (e.target === wrap) return done(null);          // click the backdrop to dismiss
      const b = e.target.closest('[data-dlg]'); if (!b) return;
      if (b.dataset.dlg === 'cancel') return done(null);
      const v = val(); done(opts.input && !v ? null : v);
    });
    document.addEventListener('keydown', key, true);
    document.body.appendChild(wrap);
    const focusEl = wrap.querySelector('#bsDlgIn') || wrap.querySelector('[data-dlg="ok"]');
    if (focusEl){ focusEl.focus(); if (focusEl.select) focusEl.select(); }
  });
}
const bsPrompt  = o => bsDialog(Object.assign({okLabel:'Save'}, o, {input: o.input || {label:o.label, value:o.value, placeholder:o.placeholder}}));
const bsConfirm = o => bsDialog(o).then(v => v !== null);

/* ============================================================================
   FREEZING A SCENARIO
   Once numbers have been in front of a committee they stop being a working
   model and become part of a record. The arbitration standard on selection is
   specific about what makes a figure defensible: an independent party has to be
   able to reconstruct the exact inputs as they stood on the decision date.

   Recording the inputs alone does not achieve that. The entry data is rebuilt
   nightly and the calibration moves with it, so a scenario that stores only
   "computed from the 3 August build" cannot be recomputed once that build is
   gone -- and the figures on screen will quietly differ from the ones in the
   paper with nothing to show it happened.

   So a freeze stores BOTH: what it was computed from, and what it actually
   said. Re-open it later and the tool puts the two side by side.

   Freezing does not lock anything. Mike keeps the map. What it does is make
   divergence impossible to miss, and stop a frozen record being overwritten in
   place -- saving a changed frozen scenario forks a copy, the same way a
   reference map already does.
   ========================================================================= */

/* The figures as presented. Deliberately the headline set a committee actually
   discusses, not every number on screen -- a snapshot nobody reads is not a
   record, it is a haystack. */
function freezeFigures(){
  try {
    const res = S.routeRes || projectPathway();
    if (!res) return null;
    const sum = summariseRouting(S.routing, currentPathwayLabel(), null);
    const t = computeTallies();
    return {
      pathway:       currentPathwayLabel(),
      structure:     S.levels.map((l,i) => ({name: tierName(i), stops: groupCountAt(i)})),
      members:       t.rows.reduce((a,r)=>a+r.m, 0),
      finalField:    sum.finalField,
      levelEntries:  (sum.levels||[]).map(l => ({name:l.name, entries:Math.round(l.entries)})),
      meets:         sum.meets,
      meetsOverDay:  sum.over,
      eventsSplit:   sum.autoSplit,
      eventsToWatch: sum.review,
    };
  } catch(e){ console.error('freezeFigures', e); return null; }
}

async function freezeScenario(){
  if (!S.scenarioId){ msg('Save the scenario first — a freeze has to attach to something.'); return; }
  const figures = freezeFigures();
  if (!figures){ msg('Could not read the figures to freeze. Open Projection once, then try again.'); return; }
  const st = dataStamps();
  const note = await bsPrompt({
    title: 'Freeze this scenario as presented',
    okLabel: 'Freeze',
    body: `<p class="bs-dlg-p">This records what the scenario says right now, so if the entry data is rebuilt
        underneath it the difference shows instead of hiding. Check the figures before committing them &mdash;
        these are what the record will say you presented.</p>
      <table class="bs-dlg-t"><tbody>
        <tr><td>Pathway</td><td>${esc(figures.pathway||'—')}</td></tr>
        ${figures.finalField!=null?`<tr><td>Reaching the championship</td>
          <td><b>${fmt(Math.round(figures.finalField))}</b></td></tr>`:''}
        ${(figures.levelEntries||[]).map(l=>`<tr><td>${esc(l.name)} &mdash; entries</td>
          <td>${fmt(l.entries)}</td></tr>`).join('')}
        <tr><td>Meets to run</td><td>${fmt(figures.meets||0)}</td></tr>
        <tr><td>Meets that do not fit</td><td>${figures.meetsOverDay
          ? `<b class="bs-dlg-bad">${fmt(figures.meetsOverDay)}</b>` : '0'}</td></tr>
        <tr><td>Entry data build</td><td>${esc(String(st.advance_data||'—').slice(0,10))}</td></tr>
      </tbody></table>`,
    label: 'What was this shown to, or shown for?',
    value: S.frozen ? S.frozen.note : '',
    placeholder: 'CCE, 10 August'});
  if (note === null) return;
  S.frozen = {at: new Date().toISOString(), note, stamps: st, figures};
  S.dirty = true;
  // The freeze on S.frozen lives inside the scenario row and can be removed
  // by unfreezeScenario() -- appropriate for a working model, wrong for a
  // record of what a committee was actually shown. This copy is independent
  // of the scenario, INSERT-only, and survives an unfreeze, a re-freeze, or
  // the scenario being deleted outright.
  try {
    await NEON.query(
      `INSERT INTO app_meta.decision_ledger (app, kind, ref_id, label, inputs, outputs) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)`,
      ['boundary_studio', 'scenario_freeze', S.scenarioId, S.scenarioName.trim(),
       JSON.stringify({note, stamps: st}), JSON.stringify(figures)]);
  } catch(e){ console.error('decision_ledger write failed (freeze itself still succeeded):', e); }
  msg('Frozen. Save the scenario to write the record.');
  renderPanel();
}

async function unfreezeScenario(){
  if (!S.frozen) return;
  if (!await bsConfirm({title:'Remove the freeze?', danger:true, okLabel:'Remove the freeze',
    body:`<p class="bs-dlg-p">The record of what this said when it was presented is deleted, and the scenario
      becomes a working model again. If it has already been in front of a committee, keep the freeze and save a
      copy to work in instead.</p>`})) return;
  S.frozen = null; S.dirty = true;
  msg('Freeze removed.');
  renderPanel();
}

/* What has moved since it was frozen. Returns null when nothing has. */
function freezeDrift(){
  if (!S.frozen || !S.frozen.figures) return null;
  const now = freezeFigures();
  if (!now) return null;
  const rows = [];
  const cmp = (label, a, b) => {
    if (a == null || b == null) return;
    if (Math.round(a) !== Math.round(b)) rows.push({label, then: a, now: b});
  };
  const f = S.frozen.figures;
  cmp('Members in the mapped area', f.members, now.members);
  cmp('Reaching the championship', f.finalField, now.finalField);
  (f.levelEntries||[]).forEach((l,i) => {
    const n = (now.levelEntries||[])[i];
    if (n && n.name === l.name) cmp(l.name + ' — entries', l.entries, n.entries);
  });
  cmp('Meets to run', f.meets, now.meets);
  cmp('Meets that do not fit', f.meetsOverDay, now.meetsOverDay);
  cmp('Events split', f.eventsSplit, now.eventsSplit);

  const st = S.frozen.stamps || {}, ns = dataStamps();
  const inputs = [];
  const ic = (label, a, b) => { if (a && b && a !== b) inputs.push({label, then:a, now:b}); };
  ic('Entry data build', st.advance_data, ns.advance_data);
  ic('Events per athlete', st.multiplicity, ns.multiplicity);
  ic('Take-up measured on', st.calibration_basis, ns.calibration_basis);
  ic('First stop fed by', st.seed_pool, ns.seed_pool);
  ic('Pathway', (S.frozen.figures||{}).pathway, currentPathwayLabel());
  return (rows.length || inputs.length) ? {figures: rows, inputs} : null;
}

function renderFreezePanel(){
  const F = S.frozen;
  if (!F) return `<div class="bs-freeze">
    <div class="bs-pwbar-h">Freeze this scenario</div>
    <p class="note">Once these numbers have been in front of a committee, freeze them. That records both what
      they were computed from and what they actually said, so if the entry data is rebuilt underneath you, the
      difference shows rather than hides. It does not lock the map &mdash; it stops the record being overwritten
      without you noticing.</p>
    <button class="tab" id="bsFreeze" ${S.scenarioId?'':'disabled'}>Freeze as presented&hellip;</button>
    ${S.scenarioId?'':'<span class="bs-arr-m warn">Save the scenario first.</span>'}</div>`;

  const d = freezeDrift();
  const when = String(F.at||'').slice(0,10);
  const fig = F.figures || {};
  return `<div class="bs-freeze ${d?'drift':'ok'}">
    <div class="bs-pwbar-h">Frozen ${esc(when)}${F.note?` &mdash; ${esc(F.note)}`:''}</div>
    <div class="bs-prov">
      <b>As presented</b>
      <span>pathway <code>${esc(fig.pathway||'—')}</code></span>
      ${fig.finalField!=null?`<span>championship field <code>${fmt(Math.round(fig.finalField))}</code></span>`:''}
      ${fig.meets!=null?`<span>${fmt(fig.meets)} meets</span>`:''}
      <span>entry build <code>${esc(String((F.stamps||{}).advance_data||'—').slice(0,10))}</code></span>
    </div>
    ${d ? `<div class="ps-warn" style="margin-top:8px">
      <b>This no longer computes what it said when it was frozen.</b>
      ${d.inputs.length?`<div class="note" style="margin-top:6px">Inputs that changed:
        ${d.inputs.map(x=>`<b>${esc(x.label)}</b> ${esc(String(x.then).slice(0,10))} &rarr; ${esc(String(x.now).slice(0,10))}`).join('; ')}.</div>`:''}
      ${d.figures.length?`<table class="bs-drill" style="margin-top:8px"><thead><tr>
        <th>Figure</th><th class="num">As presented</th><th class="num">Now</th><th class="num">Change</th>
        </tr></thead><tbody>${d.figures.map(r=>`<tr><td>${esc(r.label)}</td>
          <td class="num">${fmt(Math.round(r.then))}</td><td class="num">${fmt(Math.round(r.now))}</td>
          <td class="num ${r.now>r.then?'over':'under'}">${r.now>r.then?'+':''}${fmt(Math.round(r.now-r.then))}</td>
        </tr>`).join('')}</tbody></table>
        <p class="note" style="margin-top:6px">The frozen column is what the committee saw. Do not quietly
          republish the new figures under the old date &mdash; either explain the change or freeze again.</p>`
        :'<div class="note" style="margin-top:6px">The headline figures still match; only the inputs moved.</div>'}
      </div>`
    : `<div class="note" style="margin-top:8px">Everything still computes exactly what it said when it was frozen.</div>`}
    <div class="bs-pwbar-r" style="margin-top:10px">
      <button class="tab bs-mini" id="bsFreeze">Re-freeze as it stands now</button>
      <button class="tab bs-mini" id="bsUnfreeze">Remove the freeze</button>
      <button class="tab bs-mini" id="bsLedgerHist">Permanent record&hellip;</button>
    </div>
    <div id="bsLedgerHistBox"></div>
  </div>`;
}

async function showLedgerHistory(){
  const box = document.getElementById('bsLedgerHistBox');
  if (!box || !S.scenarioId) return;
  box.innerHTML = '<p class="note">Loading&hellip;</p>';
  try {
    const res = await NEON.query(
      `SELECT label, outputs, recorded_at FROM app_meta.decision_ledger
       WHERE app='boundary_studio' AND kind='scenario_freeze' AND ref_id=$1
       ORDER BY recorded_at DESC LIMIT 20`, [S.scenarioId]);
    const rows = res.rows || [];
    box.innerHTML = `<div class="note" style="margin-top:8px"><b>Every freeze ever recorded for this scenario
      &mdash; independent of "Remove the freeze" above, this list cannot be edited or deleted from the app.</b></div>
      ${rows.length ? `<table class="bs-drill" style="margin-top:6px"><thead><tr>
        <th>When</th><th>Note</th><th class="num">Championship field</th></tr></thead><tbody>
        ${rows.map(r=>{
          const o = typeof r.outputs==='string' ? JSON.parse(r.outputs) : (r.outputs||{});
          return `<tr><td>${esc(String(r.recorded_at).slice(0,16).replace('T',' '))}</td>
            <td>${esc(r.label||'')}</td><td class="num">${o.finalField!=null?fmt(Math.round(o.finalField)):'—'}</td></tr>`;
        }).join('')}</tbody></table>` : '<p class="note">Nothing recorded yet for this scenario.</p>'}`;
  } catch(e){ box.innerHTML = `<p class="note bs-warn">Could not load: ${esc(e.message||e)}</p>`; }
}

/* ---------- report tab ----------
   Renamed from "provenance", which was jargon of my own invention. What it
   answers is: if someone on the committee asks where a figure came from, can
   you tell them without opening the code? */
function renderReportInspector(){
  const p = (S.pathSaved && S.pathSaved.name) || (S.routing && S.routing.length ? 'this map\u2019s own pathway' : 'published rules');
  return `<div class="bs-tier-h">Where these numbers come from</div>
    ${renderProvenance()}
    <div class="bs-prov">
      <b>This scenario</b>
      <span>map <code>${esc(S.scenarioName || 'unsaved')}</code></span>
      <span>pathway <code>${esc(p)}</code></span>
      <span>first stop fed by <code>${esc(seedStage())} ${S.year==='y25'?'2025':'2026'}</code></span>
      <span>${fmt(seedTotal())} entries in that pool</span>
    </div>
    <p class="note">Anything you put in front of a committee should be reproducible from this line alone:
      the map, the pathway, the season the field came from, and the data build. If a figure on screen cannot be
      traced back to those, do not put it in a paper.</p>
    ${renderFreezePanel()}
    <div class="bs-pwbar-r" style="margin-top:10px">
      <button class="tab" id="bsGoReport">Open the report builder</button>
      <button class="tab" id="bsCsvManifest">Export the meet list (CSV)</button>
    </div>
    <p class="note">The report builder has the Boundary Studio sections &mdash; scenario overview and
      qualification pathway &mdash; and prints to PDF.</p>`;
}

function renderPathwayShell(){
  const body = document.getElementById('bsBody');
  if (!body) return;
  body.innerHTML = `<div id="bsPathWrap"><div class="note">Working out the pathway&hellip;</div></div>`;
  if (!S.pathList) listPathways().then(l => { S.pathList = l; renderPathway(); });
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
  const M = S.panelMode;          // which inspector is on screen
  const RN = QR().ROUND_NAME;
  const lvlOpts = (sel) => S.levels.map((l,i) =>
    `<option value="${i}" ${i===sel?'selected':''}>${esc(tierName(i))}</option>`).join('');
  const rndOpts = (sel) => ROUND_CHOICES.map(r =>
    `<option value="${r}" ${r===sel?'selected':''}>${esc(RN[r])}</option>`).join('');

  const levels = (M !== 'structure') ? '' : S.routing.map((lvl, L) => {
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
          <input class="bs-rt-in bs-rt-hi" type="number" min="1" max="200" data-rt="hi" data-l="${L}" data-i="${ri}" value="${rt.hi==null?'':rt.hi}">
          <span class="bs-rt-step" style="display:inline-flex;gap:2px;margin:0 4px">
            <button class="bs-rt-stepbtn" data-step="-1" data-l="${L}" data-i="${ri}" title="One fewer" ${rt.hi==null||rt.hi<=1?'disabled':''}
              style="width:22px;height:22px;border:1px solid #cdd6e4;border-radius:5px;background:#fff;color:#171F69;font-weight:700;cursor:pointer;line-height:1;padding:0">&minus;</button>
            <button class="bs-rt-stepbtn" data-step="1" data-l="${L}" data-i="${ri}" title="One more"
              style="width:22px;height:22px;border:1px solid #cdd6e4;border-radius:5px;background:#fff;color:#171F69;font-weight:700;cursor:pointer;line-height:1;padding:0">&plus;</button>
          </span>
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
        <button class="tab bs-mini" data-evtog="${L}">${S.evOpen===L?'hide events':'events'}${
          (S.routing[L].notOffered||[]).length ? ` <span class="bs-ovc">${(S.routing[L].notOffered||[]).length} off</span>` : ''}</button>
        ${L>0 ? `<label class="bs-arr">arrive
          <input class="bs-rt-in" type="number" min="0" max="300" step="1" data-arr="${L}"
            value="${Math.round(arrivalRate(L)*100)}">%
          ${measuredArrival(L)!=null ? `<span class="bs-arr-m">measured ${Math.round(measuredArrival(L)*100)}% (real ${esc(stageNameForLevel(L))})</span>`
            : `<span class="bs-arr-m warn">not measured${stageNameForLevel(L)?'':` — name "${esc(tierName(L))}" does not match a real stage`}</span>`}</label>` : ''}
        ${spare.length ? `<select class="sel bs-mini bs-rndadd" data-l="${L}">
          <option value="">+ add round…</option>${spare.map(k=>`<option value="${k}">${esc(RN[k])}</option>`).join('')}</select>` : ''}
      </div>
      ${S.evOpen===L ? renderEventGrid(L) : ''}
      ${roundRows}
    </div>`;
  }).join('');

  const probs = (res.problems||[]).map(p =>
    `<li class="bs-prob ${p.kind==='gap'?'warn':'bad'}">${esc(p.level!=null?tierName(p.level)+': ':'')}${esc(p.msg)}</li>`).join('');

  wrap.innerHTML = `
    ${M==='structure' ? renderNamesPanel() : ''}
    <div class="bs-adv-head">
      <span class="note">${M==='structure'
        ? 'Places finishing a round, and where they go. Every route is a band of finishing positions &mdash; a band wider than the field simply sends fewer, the way a short field does today.'
        : 'Reading the pathway now on screen. Change it under <b>Structure</b>.'}</span>
      <label class="bs-focus">First stop&rsquo;s field
        <select class="sel" id="bsSeedPool">
          ${SEED_STAGES.map(x=>`<option value="${x}" ${seedStage()===x?'selected':''}>${esc(x)} ${(S.year==='y25'?'2025':'2026')}</option>`).join('')}
        </select><span class="bs-arr-m">${fmt(seedTotal())} entries</span></label>
      <label class="bs-focus">Showing
        <select class="sel" id="bsPathFocus">
          <option value="all" ${(!S.bdCell||S.bdCell==='all')?'selected':''}>every event and age group</option>
          ${['A','B','C','D'].map(a=>`<optgroup label="${esc(AGE_LBL[a])}">` +
            ['G','B'].map(g=>['1','3','P'].map(d=>{
              const c=a+g+d;
              return `<option value="${c}" ${S.bdCell===c?'selected':''}>${esc(AGE_LBL[a])} ${esc(GEN_LBL[g])} ${esc(DIS_LBL[d])}</option>`;
            }).join('')).join('') + '</optgroup>').join('')}
        </select></label>
    </div>
    ${S.pathNotes && S.pathNotes.length ? `<ul class="bs-probs">
      <li class="bs-prob warn"><b>Loaded "${esc(S.pathName)}" onto a different structure.</b>
        ${S.pathNotes.map(n=>esc(n)).join(' ')} Check the routes before reading the numbers.</li></ul>` : ''}
    ${probs ? `<ul class="bs-probs">${probs}</ul>` : ''}
    ${M==='structure' ? renderPathwayLibrary() + levels : ''}
    ${M==='projection' ? renderPathwayBreakdown(res) + renderMeetManifest(res) : ''}
    ${M==='money'      ? renderFinancials() + renderYearFill() + `<details class="bs-tiers"><summary>What it costs an athlete to go</summary>${renderAthleteCost()}</details>` : ''}
    ${M==='schedule'   ? renderScheduleInspector(res) : ''}
    ${M==='compare'    ? renderCompareInspector() : ''}
    ${M==='report'     ? renderReportInspector() : ''}
    ${(M==='projection' || M==='schedule' || M==='money') && (S.takeUp && S.takeUp.usable)
      ? `<p class="note" style="margin-top:12px">The <b>arrive</b> figure on each level is how big that field
          actually turns out to be against the size the rules alone would send &mdash; above 100% means athletes
          arrive by the average-score route as well as the bands; below means qualified athletes decline.
          Defaults are measured from <b>${esc(S.takeUp.basis)}</b> and can be overridden. Places are counted,
          never simulated: nothing here predicts who wins.
          ${M==='money' ? ' A tier still marked <b>not measured</b> below has no real season to check it against and assumes full turnout &mdash; treat that figure as a ceiling, not a forecast.' : ''}</p>`
      : `<div class="ps-warn" style="margin-top:12px"><b>These are qualified places, not expected entries.</b>
          ${S.takeUp && S.takeUp.fallback
            ? 'No calibrated alignment could be loaded, so there is no measured take-up to apply — every figure here assumes every qualifier turns up, which never happens.'
            : 'Take-up could not be measured for this season, so every figure here assumes every qualifier turns up.'}
          Load the reference alignment on the map and reopen this panel to see expected entries instead.</div>`}
    ${M==='structure' || M==='projection' || M==='schedule' ? `<p class="note"><b>Entries are not people.</b> Athletes commonly contest two or three events, so entries tell you
      what a session costs and how long it runs, while divers tell you how many bodies need a bed and an award.
      Diver counts come from the share of athletes measured contesting each combination of boards, per age group and
      gender. Anything marked <i>estimate</i> means this pathway has moved the mix of events away from what was
      measured, so treat the headcount as indicative rather than a count.</p>` : ''}`;
  wirePathway();
}

function wirePathway(){
  const _b=(id,fn)=>{const e=document.getElementById(id); if(e) e.addEventListener('click',fn);};
  /* The report builder is a modal opened by ma-reports.js, not a tab. This
     used to click [data-view="reports"], a selector that does not exist --
     there is no reports tab -- so the guard swallowed it and the button did
     nothing at all. '__boundary__' opens the builder showing the map templates
     first, which is what you want arriving from here. */
  _b('bsGoReport', ()=>{
    if (typeof window._mrOpenBuilder === 'function') window._mrOpenBuilder('__boundary__');
    else msg('The report builder has not loaded yet. Give the page a moment and try again.');
  });
  _b('bsCsvManifest', exportManifestCsv);
  _b('bsCmpClear', ()=>{ S.cmpRes=null; renderPathway(); });
  _b('bsFreeze', freezeScenario);
  _b('bsLedgerHist', showLedgerHistory);
  wireSchedule();
  _b('bsUnfreeze', unfreezeScenario);
  (document.getElementById('bsPathWrap')||document).querySelectorAll('[data-cmpaxis]').forEach(b=>
    b.addEventListener('click', ()=>{
      S.cmpAxis = b.dataset.cmpaxis; S.cmpIds = []; S.cmpRes = null;
      if (S.cmpAxis === 'map' && !S.mapList){
        loadMapList().then(()=>renderPathway());
      } else renderPathway();
    }));
  _b('bsCmpRun', async ()=>{
    const P0=document.getElementById('bsPathWrap');
    S.cmpIds = Array.from((P0||document).querySelectorAll('[data-cmp]:checked')).map(x=>x.dataset.cmp);
    if (!S.cmpIds.length){ msg('Tick at least one saved pathway to compare against.'); return; }
    const btn=document.getElementById('bsCmpRun');
    if (btn){ btn.disabled=true; btn.textContent='Comparing\u2026'; }
    try { S.cmpRes = await buildComparison(S.cmpIds, S.cmpAxis || 'pathway'); }
    catch(e){ msg('Could not compare: '+(e.message||e)); S.cmpRes=null; }
    renderPathway();
  });
  (document.getElementById('bsPathWrap')||document).querySelectorAll('[data-cmp]').forEach(cb=>
    cb.addEventListener('change', ()=>{
      S.cmpIds = Array.from(document.querySelectorAll('[data-cmp]:checked')).map(x=>x.dataset.cmp);
    }));
  const P = document.getElementById('bsPathWrap');
  if (!P) return;
  const touch = () => { markPathwayEdited(); repaintAll(); renderPathway(); };

  P.querySelectorAll('.bs-rt-in').forEach(el => el.addEventListener('change', e => {
    pushUndo();
    const L = +e.target.dataset.l, i = +e.target.dataset.i, k = e.target.dataset.rt;
    const v = e.target.value === '' ? null : Math.max(1, Math.round(+e.target.value||1));
    S.routing[L].routes[i][k] = v;
    touch();
  }));
  // Quick +/-1 on a route's hi value -- for comparing nearby thresholds (is
  // the cap 3, 4, or 5?) without retyping a number each time. Drives the
  // same hi input and fires the same change event above, so there is one
  // update path, not two.
  P.querySelectorAll('.bs-rt-stepbtn').forEach(b => b.addEventListener('click', e => {
    const L = e.currentTarget.dataset.l, i = e.currentTarget.dataset.i, step = +e.currentTarget.dataset.step;
    const input = P.querySelector(`.bs-rt-hi[data-l="${L}"][data-i="${i}"]`);
    if (!input) return;
    const cur = input.value === '' ? 0 : +input.value;
    input.value = Math.max(1, cur + step);
    input.dispatchEvent(new Event('change', {bubbles:true}));
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
  P.querySelectorAll('input[data-arr]').forEach(el => el.addEventListener('change', e => {
    S.arrival = S.arrival || {};
    S.arrival[+e.target.dataset.arr] = Math.max(0, (+e.target.value||0) / 100);
    S.dirty = true; renderPathway();
  }));
  P.querySelectorAll('.bs-bdseg button').forEach(b => b.addEventListener('click', () => {
    S.bdMode = b.dataset.bd; renderPathway();
  }));
  const sp = document.getElementById('bsSeedPool');
  if (sp) sp.addEventListener('change', () => { S.seedPool = sp.value; S.dirty = true; renderPathway(); });
  P.querySelectorAll('[data-evtog]').forEach(b => b.addEventListener('click', e => {
    const L = +e.currentTarget.dataset.evtog;
    S.evOpen = (S.evOpen === L) ? null : L; renderPathway();
  }));
  P.querySelectorAll('input[data-ev]').forEach(el => el.addEventListener('change', e => {
    pushUndo();
    const L = +e.target.dataset.evl, c = e.target.dataset.ev;
    const set = new Set(S.routing[L].notOffered || []);
    if (e.target.checked) set.delete(c); else set.add(c);
    S.routing[L].notOffered = [...set];
    S.dirty = true; renderPathway();
  }));
  P.querySelectorAll('[data-evall]').forEach(b => b.addEventListener('click', e => {
    pushUndo(); S.routing[+e.currentTarget.dataset.evall].notOffered = [];
    S.dirty = true; renderPathway();
  }));
  P.querySelectorAll('[data-evnone]').forEach(b => b.addEventListener('click', e => {
    pushUndo();
    const L = +e.currentTarget.dataset.evnone;
    const set = new Set(S.routing[L].notOffered || []);
    CELLS.filter(c => c[2] === 'P').forEach(c => set.add(c));
    S.routing[L].notOffered = [...set];
    S.dirty = true; renderPathway();
  }));

  const bind$ = (id, fn) => { const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { fn(el); S.dirty = true; renderPathway(); }); };
  bind$('bsHostMode',  el => { S.hostMode = el.value; });
  bind$('bsHostShare', el => { S.hostShare = Math.max(0, Math.min(100, +el.value||0))/100; });
  bind$('bsHostFlat',  el => { S.hostFlat = Math.max(0, +el.value||0); });
  bind$('bsHostPer',   el => { S.hostPer  = Math.max(0, +el.value||0); });
  bind$('bsHostMin',   el => { S.hostMin  = Math.max(0, +el.value||0); });
  P.querySelectorAll('button[data-bulklevel]').forEach(el => el.addEventListener('click', e => {
    const level = +e.target.dataset.bulklevel;
    const input = P.querySelector(`input[data-bulklevelin="${level}"]`);
    const v = input ? input.value : '';
    if (v === '' || v == null){ msg('Type a dollar figure first.'); return; }
    const value = Math.max(0, +v || 0);
    const res = S.routeRes || projectPathway();
    const levelMeets = meetManifest(res).filter(x => x.level === level);
    if (!levelMeets.length) return;
    S.hostPer_stop = S.hostPer_stop || {};
    levelMeets.forEach(m => { S.hostPer_stop[meetKey(m)] = value; });
    S.dirty = true;
    msg(`Set to $${fmt(value)} for all ${levelMeets.length} meets -- each one is still individually editable below.`);
    renderPathway();
  }));
  P.querySelectorAll('input[data-host]').forEach(el => el.addEventListener('change', e => {
    const k = e.target.dataset.host, v = e.target.value;
    S.hostPer_stop = S.hostPer_stop || {};
    // Blank means "use the model again", not "pay nothing".
    if (v === '' || v == null) delete S.hostPer_stop[k];
    else S.hostPer_stop[k] = Math.max(0, +v || 0);
    if (!Object.keys(S.hostPer_stop).length) S.hostPer_stop = null;
    S.dirty = true; renderPathway();
  }));
  P.querySelectorAll('input[data-trip]').forEach(el => el.addEventListener('change', e => {
    S.tripCost = S.tripCost || {};
    S.tripCost[+e.target.dataset.trip] = Math.max(0, +e.target.value || 0);
    S.dirty = true; renderPathway();
  }));
  const ce = document.getElementById('bsCostEv');
  if (ce) ce.addEventListener('change', () => {
    S.costEvents = Math.max(1, Math.min(3, +ce.value || 2)); S.dirty = true; renderPathway(); });
  const cl = document.getElementById('bsCostEl');
  if (cl) cl.addEventListener('change', () => {
    S.costElastic = Math.max(0, Math.min(2, +cl.value || 0)); S.dirty = true; renderPathway(); });
  const hc = document.getElementById('bsHostClear');
  if (hc) hc.addEventListener('click', () => {
    S.hostPer_stop = null; S.dirty = true; renderPathway();
  });
  const mc = document.getElementById('bsMfCsv');
  if (mc) mc.addEventListener('click', exportManifestCsv);
  P.querySelectorAll('input[data-fee]').forEach(el => el.addEventListener('change', e => {
    S.fees = S.fees || {};
    S.fees[+e.target.dataset.fee] = Math.max(0, +e.target.value || 0);
    S.dirty = true; renderPathway();
  }));
  const fr = document.getElementById('bsFeeReset');
  if (fr) fr.addEventListener('click', () => { S.fees = null; S.dirty = true; renderPathway(); });
  const pl = document.getElementById('bsPathLoad');
  if (pl) pl.addEventListener('change', () => { if (pl.value) loadPathway(pl.value); });
  const pv = document.getElementById('bsPathSave');
  if (pv) pv.addEventListener('click', savePathway);
  const pd = document.getElementById('bsPathDel');
  if (pd) pd.addEventListener('click', deletePathway);
  const fc = document.getElementById('bsPathFocus');
  if (fc) fc.addEventListener('change', () => { S.bdCell = fc.value; renderPathway(); });
  const rs = document.getElementById('bsPathReset');
  if (rs) rs.addEventListener('click', async () => {
    if (!await bsConfirm({title:'Back to the published rules?', okLabel:'Replace the pathway',
      body:'<p class="bs-dlg-p">Replaces every round and route with the current published rules. '
         + 'Undo will bring this one back.</p>'})) return;
    pushUndo();
    S.routing = QR().defaultRouting(S.levels.length - 1, S.levels.length - 1);
    touch();
  });
}

/* Recompute the flow for the current map. Cheap after the first call: the
   calibration is derived once per season and cached inside JuniorFlow.

   These two were deleted by accident along with the "Who moves up" panel they
   happened to sit between, which left five live callers pointing at nothing.
   Restored verbatim, with the one tail line repointed at renderInspector()
   since renderAdvResults() is genuinely gone. */
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
  if (!window.JuniorFlow){ S.flowErr = 'Pricing engine not loaded.'; renderInspector(); return; }
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
  renderInspector();
  renderConsequenceStrip();
}

/* The old "Who moves up" panel lived here. Its balance read -- are the areas
   evenly sized -- moved onto the Map inspector, where you are actually looking
   when the answer matters. Its per-meet totals asked the same question the
   Pathway projection already answers, from a different engine, which is what
   let the two disagree. There is one answer now. */

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
  if (S.active === -1){
    if (cur!=null){
      delete S.assign[fips];
      if (!tallyMove(fips, cur, null)) tallyInvalidate();
      paintCountyEl(fips); S.dirty=true;
    }
    return;
  }
  if (cur !== S.active){
    S.assign[fips] = S.active;
    if (!tallyMove(fips, cur, S.active)) tallyInvalidate();
    paintCountyEl(fips); S.dirty = true;
  }
}
function assignState(abbr){
  S.geo.counties.forEach(c=>{ if (c.st===abbr){
    const cur = S.assign[c.f];
    if (S.active===-1) delete S.assign[c.f]; else S.assign[c.f] = S.active;
    if (!tallyMove(c.f, cur, S.active===-1 ? null : S.active)) tallyInvalidate();
  }});
  S.dirty = true;
  repaintAll();
}

/* The tallies are now maintained incrementally, so the numbers under the map
   can be redrawn on the stroke itself. Anything genuinely expensive downstream
   (the flow model, the projection, the meet simulation) still coalesces onto
   an animation frame, so a fast drag paints at pointer rate and settles once
   rather than queueing a job per pixel. */
let tallyRaf = 0, heavyTimer = null;
function tallySoon(){
  if (!tallyRaf) tallyRaf = requestAnimationFrame(()=>{ tallyRaf = 0; renderNumbersLight(); });
  clearTimeout(heavyTimer);
  heavyTimer = setTimeout(()=>{ heavyTimer = null; renderNumbers(); }, 220);
}

/* The cheap half: the strip and the legend, straight off the accumulator. No
   flow model, no projection, no meet simulation. */
function renderNumbersLight(){
  const t = computeTallies();
  const yLabel = S.year==='y25' ? '2025' : '2026';
  const mappableTotal = t.rows.reduce((a,r)=>a+r.m,0) + t.un.m;
  renderLegend(t, mappableTotal, yLabel);
  renderConsequenceStrip();
  if (S.panelMode === 'map'){
    const body = document.getElementById('bsBody');
    if (body){
      const bal = document.getElementById('bsBalance');
      body.innerHTML = renderTallyTable(t, mappableTotal, yLabel) + (bal ? bal.outerHTML : '<div id="bsBalance"></div>');
      wireTallyRows();
    }
  }
}

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
    if (!t) showPreview(null);
    if (t){
      if (S.painting && S.tool==='county'){
        // Brush radius: paint everything within N steps of the cursor county.
        if (S.brush > 0) paintBrush(t.dataset.f); else assignCounty(t.dataset.f);
        tallySoon();
      } else if (S.tool==='county'){
        showPreview(t.dataset.f);        // not painting: show what a stroke WOULD do
      }
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
        (v && (v.m || v.a || v.c)
           ? `${fmt(v.m)} members · ${fmt(v.a)} athletes · ${fmt(v.c)} coaches · ${fmt(v.cl.length)} clubs · ${Object.keys(st.z).length} zips`
           : '<b>Nobody registered here this season</b>') + grpHtml;
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
  // Record open/closed as the user sets it, so the next redraw honours it.
  const det = document.querySelector('details.bs-tiers');
  if (det) det.addEventListener('toggle', () => { S.tiersOpen = det.open; });
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
  // (There is no #bsModeSeg -- the inspector strip is .bs-modeseg. The id half
  //  of this selector was dead weight of my own making.)
  P.querySelectorAll('.bs-modeseg [data-insp]').forEach(b=>
    b.addEventListener('click', ()=>{ S.panelMode = b.dataset.insp; renderPanel(); refreshFlow(); }));

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
  // (The advancement-panel handlers were removed with the panel itself.)

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
  P.querySelectorAll('.bs-renum').forEach(b => b.addEventListener('click', async ()=>{
    const lvl = +b.dataset.lvl;
    const base = singulariseLevel(tierName(lvl));
    if (!base){
      msg(`"${tierName(lvl)}" is not a plural name to number from — try something like "Zones".`);
      return;
    }
    const areas = areasAtLevel(lvl);
    const custom = areas.filter(g => !looksGenerated(g.name)).map(g => g.name);
    // Forcing overwrites deliberate names, so say exactly which ones first.
    if (custom.length && !await bsConfirm({
        title: `Rename all ${areas.length} areas to ${esc(base)} 1\u2013${areas.length}?`,
        danger: true, okLabel: 'Rename them all',
        body: `<p class="bs-dlg-p">This overwrites ${custom.length} name${custom.length===1?'':'s'} you chose
          yourself:</p><div class="bs-dlg-facts">${custom.slice(0,10).map(n=>`<span>${esc(n)}</span>`).join('')}
          ${custom.length>10?`<span>and ${custom.length-10} more</span>`:''}</div>`})) return;
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

  const seedSel = document.getElementById('bsSeedPool');
  if (seedSel) seedSel.addEventListener('change', ()=>{
    pushUndo();
    S.seedPool = seedSel.value || null;   // '' -> back to auto-detect
    S.dirty = true;
    refreshFlow(); repaintAll(); renderPanel();
    msg(seedSel.value
      ? `Level 1 will seed from real ${seedSel.value} data.`
      : `Level 1 seed pool set back to auto-detect (currently: ${seedStageInferred()}).`);
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
  bind('bsSepColors', separateAdjacentColors);
  bind('bsPalOpen',   openPalette);
  bind('bsBrushUp',   ()=>setBrush(S.brush+1));
  bind('bsBrushDown', ()=>setBrush(S.brush-1));
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
  bind('bsNew', async ()=>{
    if (S.dirty && !await bsConfirm({title:'Start a new scenario?', danger:true, okLabel:'Discard and start new',
      body:`<p class="bs-dlg-p">There are unsaved changes to <b>${esc(S.scenarioName||'this scenario')}</b>.
        Starting a new one discards them.</p>`})) return;
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
  // Reference maps are never overwritten — saving one forks it instead. A frozen
  // record gets the same protection the moment it stops matching what it said:
  // the version a committee saw has to stay recoverable, so the edit forks and
  // the frozen original is left where it is.
  const frozenChanged = !!(S.frozen && freezeDrift());
  const forking = asNew || !S.scenarioId || isSeed(S.scenarioId) || frozenChanged;
  if (frozenChanged && !asNew){
    if (!await bsConfirm({title:'This frozen scenario has changed', okLabel:'Save a copy',
      body:`<p class="bs-dlg-p"><b>${esc(S.scenarioName)}</b> was frozen on
        ${esc(String(S.frozen.at||'').slice(0,10))} and no longer computes what it said then.</p>
        <p class="bs-dlg-p">Saving creates a copy so the frozen version stays exactly as the committee saw it.
        The copy is a working model again.</p>`})) return;
  }
  if (forking){
    S.scenarioId = newScenarioId();
    if (isSeed(S.scenarioId)) S.scenarioId = newScenarioId();
    const base = S.scenarioName.trim();
    if (asNew || frozenChanged || /^(Official 2026 Alignment|Current 2026 Alignment)/.test(base)){
      S.scenarioName = base.replace(/ \(copy( \d+)?\)$/, '') + ' (copy)';
    }
    // The copy is a working model again; the freeze belongs to the original.
    if (frozenChanged) S.frozen = null;
  }
  syncLevels();
  const data = JSON.stringify({regions:S.regions, assign:S.assign, year:S.year, routing:S.routing,
    fees:S.fees, hostMode:S.hostMode, hostShare:S.hostShare, hostFlat:S.hostFlat,
    hostPer:S.hostPer, hostMin:S.hostMin, hostPer_stop:S.hostPer_stop,
    tripCost:S.tripCost, costEvents:S.costEvents, costElastic:S.costElastic,
    stamps:dataStamps(), frozen:S.frozen,
    schedPlans:S.schedPlans, schedRules:S.schedRules,
    arrival:S.arrival, seedPool:S.seedPool,
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
  if (!await bsConfirm({title:'Delete this scenario?', danger:true, okLabel:'Delete permanently',
    body:`<p class="bs-dlg-p">Deletes <b>${esc(S.scenarioName)}</b> and everything saved with it &mdash; the map,
      its pathway, and any frozen record of what it said. This cannot be undone.</p>`})) return;
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
    // Keep the whole scenario, not just the painted counties: pricing a
    // comparison needs its tiers and its pathway too.
    S.compare = {id, name: row.name, assign: d.assign || {}, regions: d.regions || [],
                 levels: d.levels || null, routing: d.routing || null,
                 finalName: d.finalName || null};
    renderPanel();
  } catch(e){ console.error(e); msg('Compare failed: ' + (e.message||e)); }
}

let scenarioListCache = null;
async function loadScenarioList(){
  try {
    if (!scenarioListCache || scenarioListCache.t < Date.now()-15000){
      const res = await NEON.query(`
        SELECT bs.id, bs.name, to_char(bs.updated_at,'Mon DD HH24:MI') u,
               (bs.data ? 'fees' AND bs.data->'fees' IS NOT NULL AND bs.data->'fees' != 'null'::jsonb) AS has_fees,
               EXISTS(SELECT 1 FROM membership.scenario_schedules ss WHERE ss.boundary_scenario_id = bs.id) AS has_schedule
        FROM membership.boundary_scenarios bs
        ORDER BY bs.updated_at DESC LIMIT 50`);
      scenarioListCache = {t: Date.now(), rows: res.rows};
    }
    const completeness = r => {
      const parts = [];
      parts.push(r.has_fees ? 'fees \u2713' : 'no fees');
      parts.push(r.has_schedule ? 'schedule \u2713' : 'no schedule');
      return ` \u2014 ${parts.join(', ')}`;
    };
    const sel = document.getElementById('bsLoad');
    if (sel){
      const cur = sel.value;
      sel.innerHTML = '<option value="">Load scenario&hellip;</option>' +
        scenarioListCache.rows.map(r=>`<option value="${esc(r.id)}" ${r.id===S.scenarioId?'selected':''}>${esc(r.name)} (${esc(r.u)})${completeness(r)}</option>`).join('');
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
  if (S.dirty && !await bsConfirm({title:'Load over unsaved changes?', danger:true, okLabel:'Discard and load',
    body:`<p class="bs-dlg-p">There are unsaved changes to <b>${esc(S.scenarioName||'the current scenario')}</b>.
      Loading another discards them.</p>`})) return;
  try {
    const res = await NEON.query(`SELECT name, data FROM membership.boundary_scenarios WHERE id=$1`, [id]);
    if (!res.rows.length){ msg('Scenario not found.'); return; }
    const row = res.rows[0];
    const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    S.regions = d.regions && d.regions.length ? d.regions : defaultRegions(12);
    S.assign = d.assign || {};
    S.year = d.year === 'y26' ? 'y26' : 'y25';
    S.routing = (d.routing && d.routing.length) ? d.routing : null;   // null -> rebuilt from the current rules
    S.pathSaved = null; S.pathDirty = false;   // this is the map's own copy, not a library pathway
    S.frozen = d.frozen || null;
    S.schedPlans = d.schedPlans || {};
    S.schedRules = d.schedRules || null;
    S.schedStop = null;
    S.fees = d.fees || null;
    if (d.hostMode)  S.hostMode  = d.hostMode;
    if (d.hostShare != null) S.hostShare = d.hostShare;
    if (d.hostFlat  != null) S.hostFlat  = d.hostFlat;
    if (d.hostPer   != null) S.hostPer   = d.hostPer;
    if (d.hostMin   != null) S.hostMin   = d.hostMin;
    S.hostPer_stop = d.hostPer_stop || null;
    S.loadedStamps = d.stamps || null;
    S.tripCost = d.tripCost || null;
    if (d.costEvents != null) S.costEvents = d.costEvents;
    if (d.costElastic != null) S.costElastic = d.costElastic;
    S.arrival  = d.arrival  || null;
    S.seedPool = d.seedPool || null;
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
  if (!S.flow){
    msg(S.flowErr
      ? `Pathway hasn't computed: ${S.flowErr}`
      : 'Pathway is still working out — give it a second and try again.');
    return;
  }
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

    /* Time-zone purity. Weighted by MEMBERS in the minority zone rather than by
       counties, because three empty counties on the wrong side of a line is not
       a scheduling problem and three hundred divers is. Zero when every area
       sits in one zone. */
    let tzPen = 0;
    if (opts.tzOf){
      const zc = [];
      for (let r = 0; r < N; r++) zc.push({});
      for (let i = 0; i < n; i++){
        const a = assign[i];
        if (a < 0 || a >= N) continue;
        const z = opts.tzOf[i];
        if (z < 0) continue;
        zc[a][z] = (zc[a][z] || 0) + (weights[i] || 0);
      }
      let minority = 0, total = 0;
      for (let r = 0; r < N; r++){
        const keys = Object.keys(zc[r]);
        if (!keys.length) continue;
        let big = 0, sum = 0;
        for (let k = 0; k < keys.length; k++){ const v = zc[r][keys[k]]; sum += v; if (v > big) big = v; }
        minority += sum - big; total += sum;
      }
      tzPen = total > 0 ? minority / total : 0;
    }

    // No hostless term. Travel is still measured to real candidate sites where
    // they exist, and to the area centre where they do not, but an area is not
    // scored down for lacking one -- that is a facilities judgement, not a
    // boundary one, and it was silently discarding otherwise good maps.
    // Heavy: asked for at all, it is close to a constraint rather than a
    // preference, and a map that splits a zone is usually just wrong for
    // scheduling however well it balances.
    const score = wB*balance + wT*(travelMi/TRAVEL_REF) + wV*via + wC*continuity + tzPen*3.0;
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
/* Read-only access for anything that only wants the county geography. */
function autoData(){ return _autoData; }
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

/* Blending several objectives. Weights fall off by rank rather than splitting
   evenly, because "even sizes first, travel second" should not come out as a
   50/50 compromise -- that is what "Balanced blend" already is. First choice
   carries about half again what the second does. */
function rankWeight(i, n){
  if (n <= 1) return 1;
  const raw = []; let tot = 0;
  for (let k = 0; k < n; k++){ const v = 1 / Math.pow(1.5, k); raw.push(v); tot += v; }
  return raw[i] / tot;
}
function blendedOptions(){
  const picks = (AUTO.picks && AUTO.picks.length) ? AUTO.picks : ['blend'];
  if (picks.length === 1){
    const p = AUTO_PRESETS.find(x => x.k === picks[0]);
    return Object.assign({}, p ? p.o : {});
  }
  const out = {};
  picks.forEach((k, i) => {
    const p = AUTO_PRESETS.find(x => x.k === k);
    if (!p) return;
    const w = rankWeight(i, picks.length);
    for (const key in p.o) out[key] = (out[key] || 0) + p.o[key] * w;
  });
  return out;
}
function picksNeedBase(){
  return (AUTO.picks||[]).some(k => (AUTO_PRESETS.find(x=>x.k===k)||{}).needsBase);
}

const AUTO = { n: 12, basis: 'members', whole: false, preset: 'blend', result: null,
               busy: false, locks: [], ladder: '12, 6, 3', picks: ['blend'], tz: false,
               // Host sites are no longer a user choice, but the two things
               // that control did are separable and only one of them should go.
               // Measuring travel to a county that actually carries membership
               // is a better proxy than the area's mathematical centre, which
               // may be farmland -- so that stays on. PENALISING an area for
               // having no such county does not: whether somewhere can host is
               // a facilities question and Mike's to answer, not a reason for
               // the optimiser to quietly rule a map out.
               hostMin: 25, weights: null };

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
        <button class="bs-auto-x" onclick="window._bsAutoClose()" aria-label="Close">&#10005;</button>
      </div>
      <div class="bs-auto-body">
        <p class="bs-auto-p">Pick how many areas you want and this will divide the whole
        country into that many <b>connected</b> areas with roughly the same number of members
        in each. It is a starting point, not a decision &mdash; every county stays fully
        editable afterwards, and Undo puts back what you had.</p>

        <div class="bs-auto-row">
          <label class="bs-auto-lbl">How many areas?</label>
          <div class="bs-auto-nrow">
            <button onclick="window._bsAutoN(-1)" aria-label="One fewer area">&minus;</button>
            <input id="bsAutoN" type="number" min="2" max="24" value="${AUTO.n}"
                   onchange="window._bsAutoSetN(this.value)">
            <button onclick="window._bsAutoN(1)" aria-label="One more area">+</button>
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
            ${AUTO_PRESETS.map(p=>{
              const rank = (AUTO.picks||[]).indexOf(p.k);
              return `<button class="${rank>=0?'on':''}" onclick="window._bsAutoPreset('${p.k}')">
                <b>${esc(p.label)}</b><span>${esc(p.hint)}</span>
                ${rank>=0?`<span class="bs-auto-rank" title="Ranked ${rank+1} of ${AUTO.picks.length}">${rank+1}</span>`:''}
                </button>`;}).join('')}
          </div>
        </div>
        <div class="bs-auto-row">
          <label class="bs-auto-lbl"></label>
          <div class="bs-auto-hint" style="flex:1">
            ${(AUTO.picks||[]).length > 1
              ? `Blending <b>${(AUTO.picks||[]).map((k,i)=>{
                   const p=AUTO_PRESETS.find(x=>x.k===k);
                   return esc(p?p.label:k)+' ('+Math.round(rankWeight(i,AUTO.picks.length)*100)+'%)';}).join(' · ')}</b>.
                 Click again to drop one, or click in a different order to change the ranking &mdash;
                 the first counts most.`
              : (AUTO.picks||[]).length === 1
                ? 'Pick a second and a third if you want them blended. The order you click is the ranking.'
                : 'Pick one, or several &mdash; the order you click them is the order they count.'}
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
            ${(r.stats.hostless>0)?`<div class="bs-auto-note"><b>${r.stats.hostless} area${r.stats.hostless===1?' has':'s have'} no county carrying 25+ members.</b>
               This does not count against the map &mdash; whether somewhere can host is a facilities question.
              Worth knowing when you come to bid them out.</div>`:''}
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
window._bsAutoTz = function(on){ AUTO.tz = !!on; AUTO.result = null; renderAutoDialog(); };
window._bsAutoPreset = function(k){
  // Click to add, click again to drop. Order of clicking IS the ranking, so
  // there is nothing extra to drag.
  AUTO.picks = AUTO.picks || [];
  const at = AUTO.picks.indexOf(k);
  if (at >= 0) AUTO.picks.splice(at, 1); else AUTO.picks.push(k);
  if (!AUTO.picks.length) AUTO.picks = ['blend'];
  AUTO.preset = AUTO.picks[0];
  AUTO.result = null; renderAutoDialog();
};
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
      // Any blended objective that measures against today's map needs a
      // baseline, not just the first-ranked one.
      const needsBase = picksNeedBase();
      if (AUTO.whole){
        AUTO.result = autoAssignStates(A, w, AUTO.n);
        AUTO.result.wholeStates = true;
      } else {
        // "Keep today's map" measures against whatever is currently painted.
        let baseline = null;
        if (needsBase){
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
                                  Object.assign({restarts:4, hostMin:AUTO.hostMin, tzOf: AUTO.tz ? tzIndexFor(A) : null},
                                                blendedOptions()));
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
  /* One schedule computation, shared by the Schedule inspector and the report
     section, so the paper cannot say something the screen does not. */
  scheduleAll: () => computeSchedule(S.routeRes || projectPathway()),
  /* The built comparison, if one is on screen. The report shows what you are
     looking at rather than silently rebuilding a different one. */
  comparison: () => S.cmpRes,
  /* What the figures were computed from. The scenario summary prints these, so
     a committee paper can be traced back to its inputs months later. */
  stamps: dataStamps,
  /* The frozen record and whatever has moved since, so a report can say plainly
     that it no longer matches the version a committee was shown. */
  frozen: () => S.frozen,
  frozenDrift: freezeDrift,
  pathwayLabel: currentPathwayLabel,
  /* For a report that names specific scenarios/pathways to compare (not just
     "whatever is on screen"): the same withMap/withRouting/summariseRouting
     pipeline the Compare tab itself runs on, so a named comparison and an
     on-screen one can never quietly disagree. */
  withMap, withRouting, summariseRouting,
  maxCapacityEntries, entriesForSource, buildScheduleFromTemplate,
  loadScheduleTemplates, generateScheduleFromTemplate,
  AGES, GENS, DISCS, CELLS,
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
        <div id="bsStrip" class="bs-strip"></div>
        <div class="bs-emptykey">Paler counties inside an area have <b>no members, athletes or coaches</b>
          this season &mdash; they still count toward the area's size, but contribute nobody to it.</div>
        <div id="bsLegend" class="bs-legend"></div>
      </div></div>
      <div class="card" style="margin-bottom:0"><div class="card-b" id="bsPanel"></div></div>
    </div>
    <div id="bsTip" class="tooltip-fixed"></div>`;
  renderMapOnce();
  wireMap();
  renderPanel();
  document.addEventListener('keydown', e=>{
    const view = document.getElementById('viewBoundary');
    const live = view && view.offsetParent !== null;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target||{}).tagName||'');
    if (live && !typing && (e.ctrlKey || e.metaKey) && (e.key||'').toLowerCase() === 'k'){
      e.preventDefault(); openPalette(); return;
    }
    if (live && !typing && !e.ctrlKey && !e.metaKey && (e.key === '[' || e.key === ']')){
      e.preventDefault(); setBrush(S.brush + (e.key === ']' ? 1 : -1)); return;
    }
    if (!(e.ctrlKey || e.metaKey) || (e.key||'').toLowerCase() !== 'z') return;
    if (!live) return;                                        // Boundary tab not showing
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

/* Inspection hook, matching the pattern in routing.js (window.QualRouting) and
   pricing.js (window.__PRICING): lets the pathway editor's actual state
   mutations be exercised and verified headlessly instead of only being
   reachable by clicking through the UI. */
window.__BOUNDARY = {
  S, syncRouting, projectPathway, pushUndo, groupCountAt, groupUp, seedRows,
  meetManifest, meetMoney, tierGroupsAt, tierName,
};

})();
