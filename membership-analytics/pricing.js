/* ==========================================================================
   USA Diving — Pricing Studio  (Membership Analytics tab)
   --------------------------------------------------------------------------
   Revenue-only simulator. Two coupled price cards (membership dues + event
   entry fees) driven by a competition STRUCTURE inherited from a Boundary
   Studio scenario, so "how many stops / what geography / how many qualifiers"
   is scenario-defined rather than a single dial.

   Volume provenance is tracked explicitly and shown in the UI:
     OBSERVED  Regionals + Zones entries come from advance-data.json
               (core.event_results joined to members by name -> zip -> county).
     MODELLED  E/W/C and the final championship are derived from the flow
               rules, because no scenario other than the real one has results.

   The flow model self-calibrates: it derives the average-score add rate by
   modelling Zones from Regionals and comparing against OBSERVED Zones. That
   residual is shown on screen, not buried. Nothing here re-implements the
   qualifier engine in junior-data.js -- that remains the single source of
   truth for real advancement decisions.
   ========================================================================== */
(function(){
'use strict';

/* ---------- event cell vocabulary ---------- */
const GROUPS  = ['A','B','C','D'];
const GENDERS = ['B','G'];
const BOARDS  = ['1','3','P'];
const CODES   = [];
GROUPS.forEach(g => GENDERS.forEach(x => BOARDS.forEach(b => CODES.push(g+x+b))));
const codeGroup  = c => c[0];
const codeGender = c => c[1];
const codeBoard  = c => c[2];
const BOARD_NAME = {'1':'1-metre','3':'3-metre','P':'Platform'};
const GENDER_NAME = {B:'Boys', G:'Girls'};

/* ---------- membership price card (mirrors ma-clubs.js CLUB_FEES) ---------- */
const MEMBER_TYPES = [
  ['Athlete (17U)',                      40,  0],
  ['Athlete (AQUA Age 18+)',             40,  33],
  ['Competition Athlete (17U)',          200, 0],
  ['Competition Athlete (AQUA Age 18+)', 200, 33],
  ['Introductory Athlete 17U',           22,  0],
  ['Introductory Athlete AQUA Age 18+',  22,  0],
  ['Coach',                              75,  33],
  ['Competition Coach',                  125, 33],
  ['Judge',                              75,  63],
  ['Volunteer/Official',                 13,  33],
  ['Alumni / Fan',                       10,  0],
];

/* ---------- event fee card (2026 Junior Circuit, Athlete Progression Guide) ---------- */
function defaultFees(levelCount){
  // levelCount counts painted levels; the final championship is one more.
  const base = [
    {name:'Regional Championships',  qual:85,  non:45},
    {name:'Zone Championships',      qual:90,  non:45},
    {name:'East / West / Central',   qual:115, non:0},
  ];
  const out = [];
  for (let i=0;i<levelCount;i++) out.push(base[i] ? Object.assign({}, base[i]) : {name:'Level '+(i+1), qual:100, non:0});
  out.push({name:'National Championships', qual:125, non:0});
  return out;
}
const LATE_ATHLETE = 100, LATE_COACH = 50;

/* ---------- flow defaults (2026 rulebook) ----------
   advance : places advancing to the NEXT level, per event, per stop
   direct  : places advancing straight to the final, per event, per stop
   Regionals -> top 15 to Zones.
   Zones     -> top 3 direct to Nationals, 4th-18th (=15) to E/W/C.
   E/W/C     -> top 3 direct to Nationals (+ 4th-6th clearing the average).
------------------------------------------------------------------------- */
function defaultFlow(levelCount){
  const d = [{advance:15, direct:0, add:0}, {advance:15, direct:3, add:0}, {advance:0, direct:3, add:0}];
  const out = [];
  for (let i=0;i<levelCount;i++) out.push(d[i] ? Object.assign({}, d[i]) : {advance:12, direct:0, add:0});
  if (out.length) out[out.length-1].advance = 0;   // top level cannot advance further
  return out;
}

/* ---------- state ---------- */
const PS = {
  ready:false, loading:false,
  adv:null, age:null,                 // advance-data.json, age-data.json
  regions:[], assign:{}, levels:null, finalName:'Junior Nationals',
  boundaryId:null, boundaryName:'Official 2026 Alignment',
  year:'y26',
  fees:null, flow:null,
  prices:{}, mElast:{}, eElast:{},    // membership price overrides + elasticities
  prequal:0,                          // HPS Tier 3 pre-qualified entries into the final
  lateRate:0,                         // % of entries paying the late fee
  counts:{}, countsYear:null,
  cal:null,                           // frozen flow constants (see deriveCalibration)
  scenarioId:null, scenarioName:'',
  bList:null, sList:null,
  dirty:false, err:null, tab:'summary',
};

const fmt  = n => Number(n||0).toLocaleString('en-US');
const usd  = n => '$' + Math.round(Number(n)||0).toLocaleString('en-US');
const usd1 = n => { const v=Number(n)||0; return (v<0?'-':'') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US'); };
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function msg(t){ if (window.USADToast) USADToast(t); else console.log(t); }
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

/* ---------- structure helpers ---------- */
const levelCount   = () => (PS.levels ? PS.levels.length : 1);
const groupCountAt = L => (L===0 ? PS.regions.length : ((PS.levels[L] && PS.levels[L].groups) || []).length);
function groupNameAt(L, gi){
  if (L===0) return (PS.regions[gi] && PS.regions[gi].name) || ('Region '+(gi+1));
  const g = PS.levels[L].groups || [];
  return (g[gi] && g[gi].name) || ('Group '+(gi+1));
}
const levelName = L => (PS.levels[L] && PS.levels[L].name) || ('Level '+(L+1));

// Walk a level-0 region index up to its group at level L.
function groupOfRegion(L, ri){
  let g = ri;
  for (let l=1; l<=L; l++){
    const of = (PS.levels[l] && PS.levels[l].of) || [];
    g = of[g];
    if (g==null) return null;
  }
  return g;
}

/* Allocate a county-keyed pool into the groups at a level. */
function allocate(poolKey, L){
  const n = groupCountAt(L);
  const rows = Array.from({length:n}, () => ({}));
  const un = {};
  const P = PS.adv && PS.adv.pools ? PS.adv.pools[poolKey] : null;
  if (!P) return {rows, un};
  for (const fips in P){
    const ri = PS.assign[fips];
    let tgt = un;
    if (ri!=null && ri>=0 && ri<PS.regions.length){
      const gi = groupOfRegion(L, ri);
      if (gi!=null && gi<n) tgt = rows[gi];
    }
    const cells = P[fips];
    for (const c in cells) tgt[c] = (tgt[c]||0) + cells[c];
  }
  return {rows, un};
}

const yearNum  = () => (PS.year === 'y25' ? '2025' : '2026');
const poolKey  = stage => yearNum() + '|' + stage;

/* ==========================================================================
   ENGINE
   ========================================================================== */

/* Sum a per-group array of cell maps into one cell map. */
function totalCells(rows){
  const t = {};
  rows.forEach(r => { for (const c in r) t[c] = (t[c]||0) + r[c]; });
  return t;
}

/* Advancement out of one stop for one cell, honouring "or the last diver if
   fewer entries than the cap" -- a 9-entry field cannot send 15 divers on. */
function advanceOut(entries, cap, direct){
  const afterDirect = Math.max(0, entries - direct);
  return Math.min(cap, afterDirect);
}
function directOut(entries, direct){
  return Math.min(direct, entries);
}

/* Derive the flow constants ONCE, against the structure the observed data came
   from (the alignment actually run that season). Two constants per event cell:

     addRate[c]    fraction of top-15 advancers added again by athletes who
                   clear the average 15th-place score bar.
     directAtZ[c]  athletes who enter the circuit at Zones rather than passing
                   through Regionals -- Groups C/D in 2026 (they auto-advance)
                   and platform in every year (non-qualifying at Regionals).

   These are structural rates of the sport, not of any one map, so they are
   held fixed while the map is redrawn. */
function deriveCalibration(){
  const NL = levelCount();
  if (NL < 2){ PS.cal = {addRate:{}, directAtZ:{}, basis:PS.boundaryName, year:yearNum()}; return; }
  const a0 = allocate(poolKey('Regionals'), 0);
  const obsZTot = totalCells(allocate(poolKey('Zones'), 1).rows);
  const f0 = PS.flow[0];
  const advIntoZ = {};
  a0.rows.forEach(r => CODES.forEach(c => {
    const e = r[c] || 0;
    if (e > 0) advIntoZ[c] = (advIntoZ[c]||0) + advanceOut(e, f0.advance, f0.direct);
  }));
  const addRate = {}, directAtZ = {};
  CODES.forEach(c => {
    const modelled = advIntoZ[c] || 0;
    const observed = obsZTot[c] || 0;
    const gap = observed - modelled;
    const skipsRegionals = (PS.year==='y26' && (codeGroup(c)==='C' || codeGroup(c)==='D'));
    const isPlatform = codeBoard(c)==='P';
    if (skipsRegionals || isPlatform || modelled === 0){
      directAtZ[c] = Math.max(0, gap); addRate[c] = 0;
    } else if (gap > 0){
      addRate[c] = gap / modelled; directAtZ[c] = 0;
    } else {
      addRate[c] = 0; directAtZ[c] = 0;
    }
  });
  PS.cal = {addRate, directAtZ, basis:PS.boundaryName, year:yearNum(),
            regions:PS.regions.length, stops:structureStops()};
}

/* Core volume model. Returns entries per level per group per cell, plus the
   calibration residuals. */
function computeVolume(){
  const NL = levelCount();
  const flow = PS.flow;

  // --- level 0: observed Regionals, reallocated by the current map ---
  const lvl = [];
  const a0 = allocate(poolKey('Regionals'), 0);
  lvl.push({rows:a0.rows, un:a0.un, source:'observed'});

  // --- observed Zones, used both as truth (baseline map) and to calibrate ---
  const obsZ = NL > 1 ? allocate(poolKey('Zones'), 1) : null;
  const obsZTot = obsZ ? totalCells(obsZ.rows) : {};

  // Calibration constants are FROZEN against the structure the observed data
  // actually came from. They must never be re-derived per scenario: if they
  // were, the residual would silently absorb whatever a structural change did
  // and Zone volume would heal itself straight back to the observed figure,
  // making every hypothetical look like it changed nothing.
  const cal = PS.cal || {addRate:{}, directAtZ:{}};
  const addRate = cal.addRate, directAtZ = cal.directAtZ;

  // Advancement modelled from level 0 under the CURRENT structure (this does
  // move with the scenario -- it is the thing being simulated).
  const advIntoZ = {};
  if (NL > 1){
    const f0 = flow[0];
    lvl[0].rows.forEach(r => {
      CODES.forEach(c => {
        const e = r[c] || 0;
        if (e > 0) advIntoZ[c] = (advIntoZ[c]||0) + advanceOut(e, f0.advance, f0.direct);
      });
    });
  }

  // County shares for redistributing the direct-entry cohort when the map changes.
  const zShare = (() => {
    const P = PS.adv && PS.adv.pools ? PS.adv.pools[poolKey('Zones')] : null;
    if (!P) return null;
    const tot = {};
    for (const f in P) for (const c in P[f]) tot[c] = (tot[c]||0) + P[f][c];
    return {P, tot};
  })();

  // --- levels 1..NL-1 ---
  for (let L=1; L<NL; L++){
    const n = groupCountAt(L);
    const rows = Array.from({length:n}, () => ({}));
    const fPrev = flow[L-1];

    // advancement in from the level below
    for (let gPrev=0; gPrev<groupCountAt(L-1); gPrev++){
      // find this child's parent group at L
      let parent = null;
      for (let ri=0; ri<PS.regions.length; ri++){
        if (groupOfRegion(L-1, ri) === gPrev){ parent = groupOfRegion(L, ri); break; }
      }
      if (parent==null || parent>=n) continue;
      const src = lvl[L-1].rows[gPrev] || {};
      CODES.forEach(c => {
        const e = src[c] || 0;
        if (!e) return;
        const out = advanceOut(e, fPrev.advance, fPrev.direct) * (1 + (L===1 ? (addRate[c]||0) : 0) + (fPrev.add||0)/100);
        rows[parent][c] = (rows[parent][c]||0) + out;
      });
    }

    // direct-entry cohort at this level (Zones only), spread by county share
    if (L===1 && zShare){
      for (const fips in zShare.P){
        const ri = PS.assign[fips];
        if (ri==null || ri<0 || ri>=PS.regions.length) continue;
        const gi = groupOfRegion(L, ri);
        if (gi==null || gi>=n) continue;
        const cells = zShare.P[fips];
        for (const c in cells){
          const dc = directAtZ[c] || 0;
          if (!dc) continue;
          const share = zShare.tot[c] ? cells[c]/zShare.tot[c] : 0;
          rows[gi][c] = (rows[gi][c]||0) + dc*share;
        }
      }
    }
    lvl.push({rows, un:{}, source: L===1 ? 'calibrated' : 'modelled'});
  }

  // --- the final championship: one stop, fed by every level's direct places ---
  const finalCells = {};
  for (let L=0; L<NL; L++){
    const f = flow[L];
    if (!f || !f.direct) continue;
    lvl[L].rows.forEach(r => {
      CODES.forEach(c => {
        const e = r[c] || 0;
        if (e > 0) finalCells[c] = (finalCells[c]||0) + directOut(e, f.direct) * (1 + (f.add||0)/100);
      });
    });
  }
  const finalTotalBefore = CODES.reduce((s,c)=>s+(finalCells[c]||0),0);
  if (PS.prequal > 0 && finalTotalBefore > 0){
    CODES.forEach(c => { finalCells[c] = (finalCells[c]||0) + PS.prequal * ((finalCells[c]||0)/finalTotalBefore); });
  }

  return {
    levels: lvl,
    final: finalCells,
    calib: { advIntoZ, obsZTot, addRate, directAtZ },
  };
}

/* Is a cell a QUALIFYING event at this level?
   Regionals: springboard only, and in 2026 only Groups A/B (C/D auto-advance,
   so they may only enter Regionals as non-qualifying). Platform is
   non-qualifying at Regionals in every year. Every event at Zones and above
   is a qualifying event. */
function isQualifying(L, code){
  if (L > 0) return true;
  if (codeBoard(code) === 'P') return false;
  if (PS.year === 'y26' && (codeGroup(code)==='C' || codeGroup(code)==='D')) return false;
  return true;
}

/* Volume response to a price change.
   elasticity E = "% of volume lost per 10% price increase". */
function volMult(baseP, newP, E){
  if (!baseP || !E) return 1;
  const pctChange = (newP - baseP) / baseP * 100;
  return Math.max(0, 1 - (E/100) * (pctChange/10));
}

/* Full revenue roll-up at a given price card. */
function computeRevenue(useNewPrices){
  const V = computeVolume();
  const NL = levelCount();

  /* ---- event fee revenue ---- */
  const perLevel = [];
  let eventRev = 0, eventEntries = 0;
  for (let L=0; L<=NL; L++){
    const fee = PS.fees[L] || {qual:0, non:0, name:'Level '+(L+1)};
    const baseFee = defaultFees(NL)[L] || {qual:0, non:0};
    const E = useNewPrices ? (PS.eElast[L]||0) : 0;
    const cells = (L < NL) ? totalCells(V.levels[L].rows) : V.final;

    let q=0, nq=0, rev=0;
    CODES.forEach(c => {
      const raw = cells[c] || 0;
      if (!raw) return;
      const qualifying = isQualifying(L, c);
      const fNew  = qualifying ? fee.qual : fee.non;
      const fBase = qualifying ? baseFee.qual : baseFee.non;
      const n = raw * volMult(fBase, useNewPrices ? fNew : fBase, E);
      if (qualifying) q += n; else nq += n;
      rev += n * (useNewPrices ? fNew : fBase);
    });
    const entries = q + nq;
    const late = entries * (PS.lateRate/100) * LATE_ATHLETE;
    rev += late;
    eventRev += rev; eventEntries += entries;
    perLevel.push({
      L, name: fee.name, stops: (L<NL ? groupCountAt(L) : 1),
      qual:q, nonqual:nq, entries, late, rev,
      source: (L<NL ? V.levels[L].source : 'modelled'),
    });
  }

  /* ---- membership dues revenue ---- */
  const perType = [];
  let memberRev = 0, memberCount = 0;
  MEMBER_TYPES.forEach(([name, baseP, rider]) => {
    const n0 = PS.counts[name] || 0;
    const newP = useNewPrices ? (PS.prices[name]!=null ? PS.prices[name] : baseP) : baseP;
    const E = useNewPrices ? (PS.mElast[name]||0) : 0;
    const n = n0 * volMult(baseP, newP, E);
    const rev = n * (newP + rider);
    memberRev += rev; memberCount += n;
    perType.push({name, baseP, newP, rider, n0, n, rev});
  });

  return {V, perLevel, perType, eventRev, eventEntries, memberRev, memberCount,
          total: eventRev + memberRev};
}

/* ==========================================================================
   DATA LOADING
   ========================================================================== */
function loadJson(file){
  return fetch(file + '?v=' + Date.now().toString(36).slice(0,5))
    .then(r => { if (!r.ok) throw new Error(file + ' HTTP ' + r.status); return r.json(); });
}

function defaultRegions(n){
  const pal = ['#171F69','#009AC7','#E31937','#8FC3EA','#2456B8','#0f766e','#b45309','#7c3aed',
               '#be123c','#047857','#a16207','#1e40af','#9d174d','#155e75','#4d7c0f','#6b21a8'];
  return Array.from({length:n}, (_,i)=>({name:'Region '+(i+1), color:pal[i%pal.length]}));
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

async function loadBoundaryList(){
  if (PS.bList) return PS.bList;
  try {
    const r = await NEON.query(
      `SELECT id, name, to_char(updated_at,'Mon DD HH24:MI') u
       FROM membership.boundary_scenarios ORDER BY updated_at DESC LIMIT 50`);
    PS.bList = r.rows;
  } catch(e){ console.warn('boundary list', e); PS.bList = []; }
  return PS.bList;
}

async function applyBoundary(id){
  try {
    const r = await NEON.query(`SELECT name, data FROM membership.boundary_scenarios WHERE id=$1`, [id]);
    if (!r.rows.length){ msg('Structure not found.'); return false; }
    const row = r.rows[0];
    const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    PS.regions = (d.regions && d.regions.length) ? d.regions : defaultRegions(12);
    PS.assign  = d.assign || {};
    PS.levels  = (d.levels && d.levels.length) ? d.levels : defaultLevels(PS.regions.length);
    PS.finalName = d.finalName || 'Junior Nationals';
    PS.boundaryId = id; PS.boundaryName = row.name;
    resizeCards();
    return true;
  } catch(e){ console.error(e); msg('Could not load structure: ' + (e.message||e)); return false; }
}

/* Readable fee-row labels: use the scenario's own level names, but expand the
   stock ones so the fee table reads like the published card. */
const LEVEL_ALIAS = {
  'Regions':'Regional Championships',
  'Zones':'Zone Championships',
  'E / W / C':'East / West / Central Championships',
};
function feeRowName(i, NL, fallback){
  if (i >= NL) return PS.finalName || fallback;
  const ln = levelName(i);
  return LEVEL_ALIAS[ln] || ln;
}

/* Keep the fee + flow cards the same length as the structure, preserving any
   edits the user has already made at each index. */
function resizeCards(){
  const NL = levelCount();
  const df = defaultFees(NL), dfl = defaultFlow(NL);
  const oldF = PS.fees || [], oldFl = PS.flow || [];
  PS.fees = df.map((f,i) => ({
    name: feeRowName(i, NL, f.name),
    qual: oldF[i] ? oldF[i].qual : f.qual,
    non:  oldF[i] ? oldF[i].non  : f.non,
  }));
  PS.flow = dfl.map((f,i) => oldFl[i] ? Object.assign({}, f, oldFl[i]) : f);
  if (PS.flow.length) PS.flow[PS.flow.length-1].advance = 0;
}

async function loadCounts(){
  const y = PS.year==='y25' ? 2025 : 2026;
  if (PS.countsYear === y) return;
  try {
    const r = await NEON.query(
      `SELECT membership_type t, count(DISTINCT member_id) n
       FROM membership.members WHERE membership_year=$1 GROUP BY 1`, [y]);
    const m = {};
    r.rows.forEach(x => { m[x.t] = +x.n; });
    PS.counts = m; PS.countsYear = y;
  } catch(e){ console.warn('counts', e); PS.counts = {}; PS.countsYear = y; }
}

async function bootstrap(){
  if (PS.ready || PS.loading) return;
  PS.loading = true;
  try {
    const [adv, age] = await Promise.all([loadJson('advance-data.json'), loadJson('age-data.json')]);
    PS.adv = adv; PS.age = age;
    PS.regions = defaultRegions(12);
    PS.levels  = defaultLevels(12);
    resizeCards();
    await loadBoundaryList();
    const seed = (PS.bList||[]).find(b => /2026 Alignment/i.test(b.name));
    if (seed) await applyBoundary(seed.id);
    await loadCounts();
    deriveCalibration();     // freeze against the alignment actually run
    calibratePrequal();
    PS.ready = true;
  } catch(e){
    console.error(e); PS.err = e.message || String(e);
  }
  PS.loading = false;
}

/* Seed the pre-qualified count so the modelled final matches the known 2026
   entry count for meet 12923 (728 individual prelim entries). */
function calibratePrequal(){
  if (PS.year !== 'y26') { PS.prequal = 0; return; }
  const V = computeVolume();
  const modelled = CODES.reduce((s,c)=>s+(V.final[c]||0),0);
  PS.prequal = Math.max(0, Math.round(728 - modelled));
}
const NAT_ACTUAL_2026 = 728;

/* ==========================================================================
   RENDER
   ========================================================================== */
function kpi(label, value, sub, accent){
  return `<div class="kpi"${accent?` style="border-left:5px solid ${accent}"`:''}>
    <div class="ps-k-l">${esc(label)}</div>
    <div class="ps-k-v">${value}</div>
    ${sub?`<div class="ps-k-s">${sub}</div>`:''}</div>`;
}
function deltaSpan(d){
  if (Math.abs(d) < 1) return `<span class="ps-d flat">no change</span>`;
  const cls = d>0 ? 'up' : 'down';
  return `<span class="ps-d ${cls}">${d>0?'▲':'▼'} ${usd1(Math.abs(d))}</span>`;
}

function renderSummary(base, sim){
  const dTotal = sim.total - base.total;
  const dMem   = sim.memberRev - base.memberRev;
  const dEvt   = sim.eventRev - base.eventRev;
  return `
  <div class="kpi-band">
    ${kpi('Total modelled revenue', usd(sim.total),
          `Baseline ${usd(base.total)} &middot; ${deltaSpan(dTotal)}`, 'var(--navy)')}
    ${kpi('Membership dues', usd(sim.memberRev),
          `${fmt(Math.round(sim.memberCount))} memberships &middot; ${deltaSpan(dMem)}`, 'var(--pool)')}
    ${kpi('Event entry fees', usd(sim.eventRev),
          `${fmt(Math.round(sim.eventEntries))} entries &middot; ${deltaSpan(dEvt)}`, 'var(--sky)')}
    ${kpi('Structure', fmt(structureStops()) + ' stops',
          esc(PS.boundaryName) + ' &middot; ' + levelCount() + ' levels + final')}
  </div>`;
}
function structureStops(){
  let n = 1;
  for (let L=0; L<levelCount(); L++) n += groupCountAt(L);
  return n;
}

function renderStructure(sim){
  const NL = levelCount();
  const rows = sim.perLevel.map(p => {
    const tag = p.source==='observed'   ? '<span class="ps-tag obs">observed</span>'
              : p.source==='calibrated' ? '<span class="ps-tag cal">calibrated</span>'
              :                           '<span class="ps-tag mod">modelled</span>';
    const f = PS.flow[p.L];
    return `<tr>
      <td><b>${esc(p.name)}</b> ${tag}</td>
      <td class="num">${fmt(p.stops)}</td>
      <td class="num">${fmt(Math.round(p.entries))}</td>
      <td class="num">${fmt(Math.round(p.qual))}</td>
      <td class="num">${fmt(Math.round(p.nonqual))}</td>
      <td class="num">${f ? `<input class="ps-in sm" type="number" min="0" max="99" data-flow="advance" data-l="${p.L}" value="${f.advance}">` : '<span class="ps-na">&mdash;</span>'}</td>
      <td class="num">${f ? `<input class="ps-in sm" type="number" min="0" max="99" data-flow="direct" data-l="${p.L}" value="${f.direct}">` : '<span class="ps-na">&mdash;</span>'}</td>
    </tr>`;
  }).join('');
  return `<div class="card"><div class="card-h">
      <h3>Competition structure</h3>
      <div class="note">Stops, fields and qualifier counts come from the loaded boundary scenario. Change how many advance out of each level and every downstream field &mdash; and the revenue &mdash; recomputes.</div>
    </div><div class="card-b">
    <table class="ps-tbl"><thead><tr>
      <th>Level</th><th class="num">Stops</th><th class="num">Entries</th>
      <th class="num">Qualifying</th><th class="num">Non-qual.</th>
      <th class="num">Advance / event</th><th class="num">Direct to final / event</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <p class="note ps-foot">Advance = places moving to the next level per event per stop. Direct = places going straight to ${esc(PS.finalName)}. A field smaller than the cap sends only as many divers as it has, matching the &ldquo;or the last diver&rdquo; rule.</p>
    </div></div>`;
}

function renderEventFees(base, sim){
  const NL = levelCount();
  const rows = sim.perLevel.map((p,i) => {
    const f = PS.fees[i], b = base.perLevel[i];
    const d = p.rev - b.rev;
    const showNon = p.nonqual > 0.5 || f.non > 0;
    return `<tr>
      <td><b>${esc(f.name)}</b></td>
      <td class="num">${fmt(Math.round(p.entries))}</td>
      <td class="num"><input class="ps-in" type="number" min="0" step="5" data-fee="qual" data-l="${i}" value="${f.qual}"></td>
      <td class="num">${showNon ? `<input class="ps-in" type="number" min="0" step="5" data-fee="non" data-l="${i}" value="${f.non}">` : '<span class="ps-na">n/a</span>'}</td>
      <td class="num"><input class="ps-in sm" type="number" min="0" max="100" step="0.5" data-eel="${i}" value="${PS.eElast[i]||0}"></td>
      <td class="num mono">${usd(p.rev)}</td>
      <td class="num">${deltaSpan(d)}</td>
    </tr>`;
  }).join('');
  const dTot = sim.eventRev - base.eventRev;
  return `<div class="card"><div class="card-h">
      <h3>Event entry fees</h3>
      <div class="note">Baseline is the 2026 Junior Circuit card from the Athlete Progression Guide. Response = % of entries lost per 10% fee increase.</div>
    </div><div class="card-b">
    <table class="ps-tbl"><thead><tr>
      <th>Level</th><th class="num">Entries</th><th class="num">Qualifying fee</th>
      <th class="num">Non-qual. fee</th><th class="num">Response</th>
      <th class="num">Revenue</th><th class="num">vs baseline</th>
    </tr></thead><tbody>${rows}
      <tr class="ps-tot"><td>Total</td><td class="num">${fmt(Math.round(sim.eventEntries))}</td>
      <td colspan="3"></td><td class="num mono">${usd(sim.eventRev)}</td><td class="num">${deltaSpan(dTot)}</td></tr>
    </tbody></table>
    <div class="ps-inline">
      <label>Late entries <input class="ps-in sm" type="number" min="0" max="100" step="0.5" data-late value="${PS.lateRate}"> % of entries</label>
      <span class="note">Late registration is $${LATE_ATHLETE} per athlete ($${LATE_COACH} coach). Your calibration: the late fee is steep enough to deter, so this stays near zero unless you are testing a change to it.</span>
    </div>
    </div></div>`;
}

function renderMemberPrices(base, sim){
  const rows = sim.perType.map((t,i) => {
    const b = base.perType[i];
    const d = t.rev - b.rev;
    const changed = Math.abs(t.newP - t.baseP) > 0.001;
    return `<tr${changed?' class="ps-chg"':''}>
      <td><b>${esc(t.name)}</b>${t.rider?`<span class="ps-rider">+ ${usd(t.rider)} rider</span>`:''}</td>
      <td class="num">${fmt(t.n0)}</td>
      <td class="num mono">${usd(t.baseP)}</td>
      <td class="num"><input class="ps-in" type="number" min="0" step="1" data-price="${esc(t.name)}" value="${t.newP}"></td>
      <td class="num"><input class="ps-in sm" type="number" min="0" max="100" step="0.5" data-mel="${esc(t.name)}" value="${PS.mElast[t.name]||0}"></td>
      <td class="num">${fmt(Math.round(t.n))}</td>
      <td class="num mono">${usd(t.rev)}</td>
      <td class="num">${deltaSpan(d)}</td>
    </tr>`;
  }).join('');
  const dTot = sim.memberRev - base.memberRev;
  return `<div class="card"><div class="card-h">
      <h3>Membership dues</h3>
      <div class="note">Counts are live from <span class="mono">membership.members</span> for ${PS.year==='y25'?'2025 (complete)':'2026 (year to date)'}. Response = % of members lost per 10% dues increase.</div>
    </div><div class="card-b">
    <table class="ps-tbl"><thead><tr>
      <th>Membership type</th><th class="num">Members</th><th class="num">Current</th>
      <th class="num">Simulated</th><th class="num">Response</th>
      <th class="num">Modelled</th><th class="num">Revenue</th><th class="num">vs baseline</th>
    </tr></thead><tbody>${rows}
      <tr class="ps-tot"><td>Total</td><td class="num">${fmt(sim.perType.reduce((s,t)=>s+t.n0,0))}</td>
      <td colspan="3"></td><td class="num">${fmt(Math.round(sim.memberCount))}</td>
      <td class="num mono">${usd(sim.memberRev)}</td><td class="num">${deltaSpan(dTot)}</td></tr>
    </tbody></table>
    <p class="note ps-foot">Riders are the background screening ($33), judging course ($30) and club organisation ($150) add-ons carried in the published fee schedule. They are billed on top and are not moved by the dues slider.</p>
    </div></div>`;
}

function renderCalibration(sim){
  const cal = sim.V.calib;
  const NL = levelCount();
  let modZ = 0, obsZ = 0, adds = 0, direct = 0;
  CODES.forEach(c => {
    modZ += cal.advIntoZ[c]||0; obsZ += cal.obsZTot[c]||0;
    adds += (cal.advIntoZ[c]||0)*(cal.addRate[c]||0);
    direct += cal.directAtZ[c]||0;
  });
  const modelledNat = sim.perLevel[sim.perLevel.length-1].entries;
  const natRow = PS.year==='y26'
    ? `<tr><td>${esc(PS.finalName)} entries</td>
         <td class="num mono">${fmt(Math.round(modelledNat))}</td>
         <td class="num mono">${fmt(NAT_ACTUAL_2026)}</td>
         <td class="num">${diffCell(modelledNat, NAT_ACTUAL_2026)}</td>
         <td class="note">Actual = DiveMeets meet 12923, individual prelim entries</td></tr>`
    : `<tr><td>${esc(PS.finalName)} entries</td><td class="num mono">${fmt(Math.round(modelledNat))}</td>
         <td class="num ps-na">&mdash;</td><td class="ps-na">&mdash;</td>
         <td class="note">No verified 2025 national entry count loaded</td></tr>`;
  const cb = PS.cal || {};
  const drifted = cb.basis && (cb.basis !== PS.boundaryName || cb.regions !== PS.regions.length);
  const banner = drifted
    ? `<div class="ps-warn"><b>You are off the calibrated baseline.</b> The flow constants were derived from
        <b>${esc(cb.basis)}</b> (${fmt(cb.regions)} regions, ${yearNum()}) and are being held fixed while you
        simulate <b>${esc(PS.boundaryName)}</b> (${fmt(PS.regions.length)} regions). That is deliberate &mdash;
        re-deriving them per scenario would let the residual absorb your structural change and every hypothetical
        would falsely show no effect.</div>`
    : `<div class="ps-ok">Flow constants derived from <b>${esc(cb.basis||PS.boundaryName)}</b>, ${yearNum()} &mdash;
        the alignment actually run that season. This is the calibrated baseline.</div>`;

  return `<div class="card"><div class="card-h">
      <h3>Model calibration</h3>
      <div class="note">Before a hypothetical is worth anything, the model has to reproduce the season we actually ran &mdash; and be clear about which parts are checks and which are definitions.</div>
    </div><div class="card-b">
    ${banner}
    <table class="ps-tbl"><thead><tr>
      <th>Zone field, reconstructed</th><th class="num">Entries</th><th class="num">Observed</th><th class="num">Difference</th><th>What this is</th>
    </tr></thead><tbody>
      <tr><td>&mdash; places 1&ndash;15 advancing from Regionals</td><td class="num mono">${fmt(Math.round(modZ))}</td>
        <td class="num ps-na">&mdash;</td><td class="ps-na">&mdash;</td>
        <td class="note">Modelled. Capped at field size, so a short field sends fewer.</td></tr>
      <tr><td>&mdash; average 15th-place score adds</td><td class="num mono">${fmt(Math.round(adds))}</td>
        <td class="num ps-na">&mdash;</td><td class="ps-na">&mdash;</td>
        <td class="note">Rate frozen at baseline, applied to advancement above.</td></tr>
      <tr><td>&mdash; entering the circuit at Zones</td><td class="num mono">${fmt(Math.round(direct))}</td>
        <td class="num ps-na">&mdash;</td><td class="ps-na">&mdash;</td>
        <td class="note">${PS.year==='y26' ? 'Groups C/D auto-advance in 2026; plus platform, non-qualifying at Regionals.' : 'Platform, non-qualifying at Regionals.'} Fixed count.</td></tr>
      <tr class="ps-tot"><td>Total Zone entries</td>
        <td class="num mono">${fmt(Math.round(modZ+adds+direct))}</td>
        <td class="num mono">${fmt(Math.round(obsZ))}</td>
        <td class="num">${diffCell(modZ+adds+direct, obsZ)}</td>
        <td class="note">${drifted ? 'Gap is the structural effect you are simulating.' : 'Reconciles exactly <b>by construction</b> at baseline &mdash; not an independent test.'}</td></tr>
      ${natRow}
    </tbody></table>
    <div class="ps-inline">
      <label>Pre-qualified into ${esc(PS.finalName)}
        <input class="ps-in sm" type="number" min="0" max="2000" data-prequal value="${Math.round(PS.prequal)}"> entries</label>
      <span class="note">HP Squad athletes plus any residual needed to reconcile to the actual national field. Solved to ${fmt(NAT_ACTUAL_2026)} for 2026 &mdash; replace it with the true squad number when you have it and the difference becomes a real check rather than a plug.</span>
    </div>
    <p class="note ps-foot"><b>Read this before quoting a number.</b> Regionals volume is observed and exact for the map as drawn. Zones is reconstructed and ties to observed at baseline. E/W/C and ${esc(PS.finalName)} are modelled from the flow rules, because no alternative structure has real results behind it. The tag on each row of the structure table tells you which is which.</p>
    </div></div>`;
}
function diffCell(a, b){
  const d = a - b;
  if (!b) return '<span class="ps-na">&mdash;</span>';
  const p = Math.abs(d/b*100);
  const cls = p < 2 ? 'good' : (p < 8 ? 'ok' : 'bad');
  return `<span class="ps-diff ${cls}">${d>0?'+':''}${fmt(Math.round(d))} (${p.toFixed(1)}%)</span>`;
}

function renderScenarioBar(){
  const opts = (PS.bList||[]).map(b =>
    `<option value="${esc(b.id)}"${b.id===PS.boundaryId?' selected':''}>${esc(b.name)}</option>`).join('');
  const sOpts = (PS.sList||[]).map(s =>
    `<option value="${esc(s.id)}"${s.id===PS.scenarioId?' selected':''}>${esc(s.name)}</option>`).join('');
  return `<div class="ps-bar">
    <div class="ps-bar-g">
      <label>Structure</label>
      <select id="psBoundary">${opts || '<option>(no scenarios found)</option>'}</select>
    </div>
    <div class="ps-bar-g">
      <label>Season</label>
      <div class="seg ps-seg">
        <button data-year="y25" class="${PS.year==='y25'?'on':''}">2025 complete</button>
        <button data-year="y26" class="${PS.year==='y26'?'on':''}">2026 YTD</button>
      </div>
    </div>
    <div class="ps-bar-g grow">
      <label>Pricing scenario</label>
      <input id="psName" type="text" placeholder="Name this pricing scenario" value="${esc(PS.scenarioName)}">
    </div>
    <div class="ps-bar-g">
      <label>&nbsp;</label>
      <div class="ps-btns">
        <button class="ps-btn primary" id="psSave">Save</button>
        <select id="psLoad"><option value="">Load…</option>${sOpts}</select>
        <button class="ps-btn" id="psReset">Reset prices</button>
        <button class="ps-btn" id="psCsv">Export CSV</button>
      </div>
    </div>
  </div>`;
}

function render(){
  const host = document.getElementById('viewPricing');
  if (!host) return;
  if (PS.err){
    host.innerHTML = `<div class="card"><div class="card-b"><p><b>Pricing Studio could not load.</b></p>
      <p class="note mono">${esc(PS.err)}</p></div></div>`;
    return;
  }
  if (!PS.ready){ host.innerHTML = '<div class="loading">Loading pricing model&hellip;</div>'; return; }

  const base = computeRevenue(false);
  const sim  = computeRevenue(true);

  host.innerHTML =
    renderScenarioBar() +
    renderSummary(base, sim) +
    renderMemberPrices(base, sim) +
    renderEventFees(base, sim) +
    renderStructure(sim) +
    renderCalibration(sim);

  wire();
}

/* ---------- events ---------- */
function wire(){
  const host = document.getElementById('viewPricing');
  if (!host) return;

  host.querySelectorAll('input[data-price]').forEach(el => el.addEventListener('change', e => {
    PS.prices[e.target.dataset.price] = Math.max(0, +e.target.value||0); PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-mel]').forEach(el => el.addEventListener('change', e => {
    PS.mElast[e.target.dataset.mel] = clamp(+e.target.value||0, 0, 100); PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-fee]').forEach(el => el.addEventListener('change', e => {
    const L = +e.target.dataset.l;
    PS.fees[L][e.target.dataset.fee] = Math.max(0, +e.target.value||0); PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-eel]').forEach(el => el.addEventListener('change', e => {
    PS.eElast[+e.target.dataset.eel] = clamp(+e.target.value||0, 0, 100); PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-flow]').forEach(el => el.addEventListener('change', e => {
    const L = +e.target.dataset.l;
    PS.flow[L][e.target.dataset.flow] = clamp(Math.round(+e.target.value||0), 0, 99); PS.dirty=true; render();
  }));
  const pq = host.querySelector('input[data-prequal]');
  if (pq) pq.addEventListener('change', e => { PS.prequal = clamp(Math.round(+e.target.value||0),0,2000); PS.dirty=true; render(); });

  const late = host.querySelector('input[data-late]');
  if (late) late.addEventListener('change', e => { PS.lateRate = clamp(+e.target.value||0,0,100); PS.dirty=true; render(); });

  const bsel = host.querySelector('#psBoundary');
  if (bsel) bsel.addEventListener('change', async e => {
    const ok = await applyBoundary(e.target.value);
    if (ok){ calibratePrequal(); render(); msg('Structure: ' + PS.boundaryName); }
  });

  host.querySelectorAll('.ps-seg button').forEach(b => b.addEventListener('click', async () => {
    PS.year = b.dataset.year;
    await loadCounts(); deriveCalibration(); calibratePrequal(); render();
  }));

  const nm = host.querySelector('#psName');
  if (nm) nm.addEventListener('change', e => { PS.scenarioName = e.target.value; });

  const sv = host.querySelector('#psSave');   if (sv) sv.addEventListener('click', saveScenario);
  const ld = host.querySelector('#psLoad');   if (ld) ld.addEventListener('change', e => { if (e.target.value) loadScenario(e.target.value); });
  const rs = host.querySelector('#psReset');  if (rs) rs.addEventListener('click', resetPrices);
  const cx = host.querySelector('#psCsv');    if (cx) cx.addEventListener('click', exportCsv);
}

function resetPrices(){
  PS.prices = {}; PS.mElast = {}; PS.eElast = {}; PS.lateRate = 0;
  resizeCards(); PS.flow = defaultFlow(levelCount());
  PS.dirty = false; render(); msg('Prices reset to the published 2026 card.');
}

/* ---------- persistence ---------- */
async function loadScenarioList(){
  try {
    const r = await NEON.query(
      `SELECT id, name, to_char(updated_at,'Mon DD HH24:MI') u
       FROM membership.pricing_scenarios ORDER BY updated_at DESC LIMIT 50`);
    PS.sList = r.rows;
  } catch(e){ console.warn('pricing list', e); PS.sList = []; }
}
async function saveScenario(){
  const name = (PS.scenarioName||'').trim();
  if (!name){ msg('Give the pricing scenario a name first.'); return; }
  if (!PS.scenarioId) PS.scenarioId = 'ps-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
  const data = JSON.stringify({
    boundaryId:PS.boundaryId, boundaryName:PS.boundaryName, year:PS.year,
    prices:PS.prices, mElast:PS.mElast, eElast:PS.eElast,
    fees:PS.fees, flow:PS.flow, prequal:PS.prequal, lateRate:PS.lateRate, v:1});
  try {
    await NEON.query(
      `INSERT INTO membership.pricing_scenarios (id, name, data) VALUES ($1,$2,$3::jsonb)
       ON CONFLICT (id) DO UPDATE SET name=$2, data=$3::jsonb, updated_at=now()`,
      [PS.scenarioId, name, data]);
    PS.dirty = false; PS.sList = null;
    await loadScenarioList();
    msg('Saved "' + name + '" to cloud.');
    render();
  } catch(e){ console.error(e); msg('Save failed: ' + (e.message||e)); }
}
async function loadScenario(id){
  try {
    const r = await NEON.query(`SELECT name, data FROM membership.pricing_scenarios WHERE id=$1`, [id]);
    if (!r.rows.length){ msg('Scenario not found.'); return; }
    const d = typeof r.rows[0].data === 'string' ? JSON.parse(r.rows[0].data) : r.rows[0].data;
    if (d.boundaryId && d.boundaryId !== PS.boundaryId) await applyBoundary(d.boundaryId);
    const yearChanged = (d.year === 'y25' ? 'y25' : 'y26') !== PS.year;
    PS.year = d.year === 'y25' ? 'y25' : 'y26';
    await loadCounts();
    resizeCards();
    if (yearChanged || !PS.cal) deriveCalibration();
    if (d.fees) PS.fees = PS.fees.map((f,i) => d.fees[i] ? Object.assign({}, f, {qual:d.fees[i].qual, non:d.fees[i].non}) : f);
    if (d.flow) PS.flow = PS.flow.map((f,i) => d.flow[i] ? Object.assign({}, f, d.flow[i]) : f);
    PS.prices = d.prices||{}; PS.mElast = d.mElast||{}; PS.eElast = d.eElast||{};
    PS.prequal = +d.prequal||0; PS.lateRate = +d.lateRate||0;
    PS.scenarioId = id; PS.scenarioName = r.rows[0].name; PS.dirty = false;
    render(); msg('Loaded "' + r.rows[0].name + '".');
  } catch(e){ console.error(e); msg('Load failed: ' + (e.message||e)); }
}

function exportCsv(){
  const base = computeRevenue(false), sim = computeRevenue(true);
  const L = [];
  L.push('USA Diving Pricing Studio export');
  L.push('scenario,' + q(PS.scenarioName||'(unnamed)'));
  L.push('structure,' + q(PS.boundaryName));
  L.push('season,' + (PS.year==='y25'?'2025 complete':'2026 YTD'));
  L.push('');
  L.push('section,item,members_or_entries,current_price,simulated_price,modelled_volume,revenue,baseline_revenue,delta');
  sim.perType.forEach((t,i) => L.push(['membership', q(t.name), t.n0, t.baseP, t.newP,
    Math.round(t.n), Math.round(t.rev), Math.round(base.perType[i].rev),
    Math.round(t.rev-base.perType[i].rev)].join(',')));
  sim.perLevel.forEach((p,i) => L.push(['event', q(p.name), Math.round(p.entries),
    base.perLevel[i] ? defaultFees(levelCount())[i].qual : '', PS.fees[i].qual,
    Math.round(p.entries), Math.round(p.rev), Math.round(base.perLevel[i].rev),
    Math.round(p.rev-base.perLevel[i].rev)].join(',')));
  L.push('');
  L.push('total,,,,,,' + Math.round(sim.total) + ',' + Math.round(base.total) + ',' + Math.round(sim.total-base.total));
  const blob = new Blob([L.join('\n')], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (PS.scenarioName.trim()||'pricing-scenario') + '-' + yearNum() + '.csv';
  a.click(); URL.revokeObjectURL(a.href);
}
function q(s){ return '"' + String(s==null?'':s).replace(/"/g,'""') + '"'; }

/* Inspection hook: lets the engine be exercised headlessly in the test harness
   and poked at from the browser console without opening the UI. */
window.__PRICING = {
  PS, CODES, computeVolume, computeRevenue, allocate, isQualifying,
  bootstrap, applyBoundary, resizeCards, defaultRegions, defaultLevels,
  defaultFees, defaultFlow, calibratePrequal, totalCells, deriveCalibration,
};

/* ---------- entry point ---------- */
window.renderPricing = async function(){
  const host = document.getElementById('viewPricing');
  if (!host) return;
  if (!PS.ready && !PS.loading){
    host.innerHTML = '<div class="loading">Loading pricing model&hellip;</div>';
    await bootstrap();
    await loadScenarioList();
  }
  render();
};

})();
