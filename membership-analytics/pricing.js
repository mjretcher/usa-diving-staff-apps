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
const BOARD_NAME = {'1':'1-meter','3':'3-meter','P':'Platform'};
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

/* Synchro is billed once per TEAM entry, not once per diver, and the DiveMeets
   levy follows the same rule -- one charge for the pair. Synchro sits outside
   advance-data.json (which carries individual events only), so team counts are
   entered per level. 2026 Junior Nationals ran 4 synchro events / 20 entries. */
function defaultSynchro(levelCount){
  const out = [];
  for (let i=0;i<levelCount;i++) out.push({teams:0, fee:0});
  out.push({teams:NAT_SYN_FALLBACK_2026, fee:125});   // overwritten by the live sync
  return out;
}

/* Every entry fee carries a per-entry pass-through to DiveMeets, the scoring
   management platform. It is NOT USA Diving revenue, and because it is a flat
   amount rather than a percentage it bites hardest on the cheapest entries:
   $4.90 is 10.9% of a $45 non-qualifying entry but 3.9% of a $125 national
   entry. Gross and net are therefore reported separately throughout. */
const DIVEMEETS_LEVY = 4.90;

/* Senior circuit. Not a regional cascade -- a set of qualifier meets feeding
   the national championships, each entry billed at the national rate. Entry
   counts are pulled live from junior_results.meet_entries by DiveMeets meet
   number, with a manual override when a meet has not been synced. */
function defaultSenior(){
  return [
    {key:'qual', name:'National Championships Qualifier', meet:'12924',
     dates:'5-6 Aug', events:6, rounds:'Prelim only, no final',
     entry:'open', hasSynchro:false, synchroEvents:0,
     fee:125, manual:0, manualSyn:0, useManual:false},
    {key:'nats', name:'USA Diving National Championships', meet:'12925',
     dates:'7-11 Aug', events:6, rounds:'Prelim + Final, top 12 advance',
     entry:'prequalified', hasSynchro:true, synchroEvents:4,
     synchroRounds:'Prelim + Final, top 8 advance',
     fee:125, manual:0, manualSyn:0, useManual:false},
  ];
}

/* The Senior pathway is NOT a placement cascade like the Junior circuit. Entry
   to the National Championships is by prequalification against a published list
   of standards; athletes may only enter the events they hold a standard in, and
   the Qualifier exists so they can add events. Source: 2026 USA Diving National
   Championship Qualification Criteria and Competition Format, as of 11 June.

   Counts are left at zero deliberately. Inventing a split would put invented
   numbers in front of the committee; instead the panel reconciles whatever is
   entered against the live entry count, the same discipline the Junior
   calibration uses. */
const SENIOR_PREQUAL = [
  '2024 Olympic Games Team, in their Olympic events',
  '2022 Winter National Championships — champions',
  '2023 National Championships — champions',
  '2023 Winter National Championships — champions',
  '2024 Winter National Championships — champions',
  '2025 National Championships — champions',
  '2025 Winter National Championships — champions',
  '2025 Winter National Championships — places 2 to 12, 1M / 3M / 10M',
  '2026 NCAA Championships — top 5 U.S. citizens',
  '2026 National Team members (eligible in all events)',
  '2025-26 Tier III Junior High Performance Squad (all events)',
  '2025 Tier I or II HPS who competed at 2025 Nationals or Winter Nationals',
  '2024-25 Tier III HPS who competed at 2025 Nationals or Winter Nationals',
  'Non-HPS athletes who met an HPS score threshold at 2025 Nationals',
  'Added at the National Championships Qualifier',
];

/* ---------- flow defaults (2026 rulebook) ----------
   advance : places advancing to the NEXT level, per event, per stop
   direct  : places advancing straight to the final, per event, per stop
   Regionals -> top 15 to Zones.
   Zones     -> top 3 direct to Nationals, 4th-18th (=15) to E/W/C.
   E/W/C     -> top 3 direct to Nationals (+ 4th-6th clearing the average).
------------------------------------------------------------------------- */
function defaultFlow(levelCount){
  const d = [{advance:15, direct:0, add:0, byCell:{}},
             {advance:15, direct:3, add:0, byCell:{}},
             {advance:0,  direct:3, add:0, byCell:{}}];
  const out = [];
  for (let i=0;i<levelCount;i++) out.push(d[i] ? JSON.parse(JSON.stringify(d[i])) : {advance:12, direct:0, add:0, byCell:{}});
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
  prices:{}, mElast:{}, eElast:{}, sElast:{},   // price overrides + elasticities
  prequal:0,                          // HPS Tier 3 pre-qualified entries into the final
  lateRate:0,                         // % of entries paying the late fee
  counts:{}, countsYear:null,
  cal:null,                           // frozen flow constants (see deriveCalibration)
  boundaryRouting:null,               // qualification pathway carried on the loaded structure
  levy:DIVEMEETS_LEVY,                // per-entry DiveMeets pass-through
  senior:null, seniorEntries:{}, seniorEventFields:{},
  qualCutoff:12,                      // Qualifier: top N of each event advance to Nationals
  prequalPaths:{},                    // manual overrides for senior prequalification paths
  seniorPrequal:null,                 // derived pathway counts (senior-prequal.json)
  squads:null,                        // published squad rosters + measured entries
  synchro:null,                       // per-level synchro team entries (billed once per pair)
  natMeet:'12923',                    // DiveMeets meet number for the final championship
  natActual:null, natSyn:null, natFetched:null, natSource:'fallback',
  prequalSource:'solved',
  baseFinal:null,                     // national field under the calibrated baseline
  scenarioId:null, scenarioName:'', openGrid:null,
  section:'prices',                   // prices | athletes | compare | basis
  compare:[], pathway:null,
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

/* Qualifier counts may be set per age group AND per event, not just per level.
   A scenario can send 12 out of Group A 1M and 18 out of Group D platform at the
   same stop. byCell holds the overrides; the level value is the fallback. */
function advanceFor(L, code){
  const f = PS.flow[L]; if (!f) return 0;
  const o = f.byCell && f.byCell[code];
  return (o && o.advance != null) ? o.advance : f.advance;
}
function directFor(L, code){
  const f = PS.flow[L]; if (!f) return 0;
  const o = f.byCell && f.byCell[code];
  return (o && o.direct != null) ? o.direct : f.direct;
}
function cellOverridden(L, code){
  const f = PS.flow[L]; const o = f && f.byCell && f.byCell[code];
  return !!(o && (o.advance != null || o.direct != null));
}
function levelOverrideCount(L){
  const f = PS.flow[L]; if (!f || !f.byCell) return 0;
  return CODES.filter(c => cellOverridden(L, c)).length;
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

/* Build one level's field from the level below. Used by BOTH deriveCalibration
   and computeVolume, deliberately: the conversion constant is a ratio measured
   against the advancement arriving at a level, so if derivation measured it
   against the observed distribution while simulation applied it to the
   reconstructed one, the two would disagree wherever the "or the last diver"
   cap bit differently -- and the level would not reconcile. One function, one
   answer. */
function buildLevel(L, prevRows, k){
  const n = groupCountAt(L);
  const rows = Array.from({length:n}, () => ({}));
  const fPrev = PS.flow[L-1] || {add:0};
  for (let gPrev=0; gPrev<groupCountAt(L-1); gPrev++){
    let parent = null;
    for (let ri=0; ri<PS.regions.length; ri++){
      if (groupOfRegion(L-1, ri) === gPrev){ parent = groupOfRegion(L, ri); break; }
    }
    if (parent==null || parent>=n) continue;
    const src = prevRows[gPrev] || {};
    CODES.forEach(c => {
      const e = src[c] || 0;
      if (!e) return;
      const conv = (k && k.conv[c] != null) ? k.conv[c] : 1;
      rows[parent][c] = (rows[parent][c]||0)
        + advanceOut(e, advanceFor(L-1,c), directFor(L-1,c)) * conv * (1 + (fPrev.add||0)/100);
    });
  }
  const sh = shareFor(L);
  if (sh && k){
    for (const fips in sh.P){
      const ri = PS.assign[fips];
      if (ri==null || ri<0 || ri>=PS.regions.length) continue;
      const gi = groupOfRegion(L, ri);
      if (gi==null || gi>=n) continue;
      const cells = sh.P[fips];
      for (const c in cells){
        const dc = k.directAt[c] || 0;
        if (!dc) continue;
        rows[gi][c] = (rows[gi][c]||0) + dc * (sh.tot[c] ? cells[c]/sh.tot[c] : 0);
      }
    }
  }
  return rows;
}

/* County shares for spreading a direct-entry cohort when the map changes. */
function shareFor(L){
  const st = stageForLevel(L);
  const P = st && PS.adv && PS.adv.pools ? PS.adv.pools[poolKey(st)] : null;
  if (!P) return null;
  const tot = {};
  for (const f in P) for (const c in P[f]) tot[c] = (tot[c]||0) + P[f][c];
  return {P, tot};
}

function stageForLevel(L){ return ['Regionals','Zones','EWC'][L] || null; }
function observedPool(L){
  const st = stageForLevel(L);
  if (!st) return null;
  const P = PS.adv && PS.adv.pools ? PS.adv.pools[poolKey(st)] : null;
  return P ? allocate(poolKey(st), L) : null;
}

/* Derive the flow constants ONCE, against the structure the observed data came
   from. Two constants per level per event cell:

     conv[c]     observed field at this level divided by the advancement the
                 rules alone would send there. Above 1 it absorbs the athletes
                 added by clearing the average-place score bar; BELOW 1 it
                 absorbs qualified athletes who do not take up their place.
                 E/W/C is the case that forced this to be two-directional --
                 the rules send far more athletes there than actually enter.
     directAt[c] athletes who join at this level without passing through the
                 one below: Groups C/D at Zones in 2026, platform in any year
                 (non-qualifying at Regionals), and YMCA champions at E/W/C.

   These are rates of behaviour, not of any one map, so they are held fixed
   while the map is redrawn. Re-deriving them per scenario would let the
   residual swallow the structural change and every hypothetical would falsely
   read as having no effect. */
function deriveCalibration(){
  const NL = levelCount();
  const levels = [];
  const observedAt = [];
  for (let L=0; L<NL; L++){ levels.push({conv:{}, directAt:{}}); observedAt.push(false); }
  observedAt[0] = !!observedPool(0);

  // Walk upward reconstructing as we go, so each level's constant is measured
  // against the same reconstructed field the simulation will apply it to.
  let prevRows = allocate(poolKey('Regionals'), 0).rows;
  for (let L=1; L<NL; L++){
    const obs = observedPool(L);
    if (!obs) break;                     // no observed data above this level
    observedAt[L] = true;
    const obsTot = totalCells(obs.rows);
    const adv = {};
    prevRows.forEach(r => CODES.forEach(c => {
      const e = r[c] || 0;
      if (e > 0) adv[c] = (adv[c]||0) + advanceOut(e, advanceFor(L-1,c), directFor(L-1,c));
    }));
    CODES.forEach(c => {
      const modelled = adv[c] || 0;
      const observed = obsTot[c] || 0;
      if (modelled <= 0){
        levels[L].directAt[c] = Math.max(0, observed);
        levels[L].conv[c] = 1;
      } else if (L===1 && (codeBoard(c)==='P' ||
                 (PS.year==='y26' && (codeGroup(c)==='C' || codeGroup(c)==='D')))){
        // These cohorts do not come through Regionals at all, so the whole
        // field is a direct-entry cohort rather than a conversion on
        // advancement that never happened.
        levels[L].directAt[c] = Math.max(0, observed);
        levels[L].conv[c] = 0;
      } else {
        levels[L].conv[c] = observed / modelled;
        levels[L].directAt[c] = 0;
      }
    });
    prevRows = buildLevel(L, prevRows, levels[L]);
  }
  PS.cal = {levels, observedAt, basis:PS.boundaryName, year:yearNum(),
            regions:PS.regions.length, stops:structureStops()};
}

/* Volume via the general routing engine, for a scenario that carries an
   explicit qualification pathway (PS.boundaryRouting) instead of Pricing
   Studio's own {advance,direct} shape. Reuses the SAME calibration
   (PS.cal, derived once against the real season) so take-up behaviour is
   identical either way -- only the structure differs.

   PS.levels and the routing array are allowed to disagree on level count:
   a hand-built scenario often counts the championship as its own routing
   level while Pricing Studio counts it as one past the painted ones. Both
   groupCount and groupOf below floor at 1 / land on group 0 for any level
   PS.levels doesn't know about, so that extra level resolves to "the
   final" instead of silently vanishing. */
function computeVolumeFromRouting(routing){
  const QR = window.QualRouting;
  const NL = levelCount();
  const gcAt = L => Math.max(1, (L===0 ? PS.regions.length
    : ((PS.levels[L] && PS.levels[L].groups) || []).length));
  const groupOfAny = (fL, g, tL) => {
    let c = g;
    for (let L = fL+1; L <= tL; L++){
      if (gcAt(L) === 1){ c = 0; continue; }
      const of = (PS.levels[L] && PS.levels[L].of) || [];
      c = of[c]; if (c == null) return null;
    }
    return c;
  };

  const a0 = allocate(poolKey('Regionals'), 0);
  const conv = {};
  ((PS.cal && PS.cal.levels) || []).forEach((k,i) => { if (k && k.conv) conv[i] = k.conv; });

  // Direct-entry cohorts (Platform, Groups C/D at Zones in 2026): the same
  // calibrated total, spread by the same real observed geography, as
  // buildLevel()/shareFor() already do for the non-routing path.
  const shareCache = {};
  const shareFn = (L) => {
    if (shareCache[L] !== undefined) return shareCache[L];
    const stage = stageForLevel(L);
    const pool = stage ? (PS.adv && PS.adv.pools ? PS.adv.pools[poolKey(stage)] : null) : null;
    if (!pool) return (shareCache[L] = null);
    const tot = {};
    for (const f in pool) for (const c in pool[f]) tot[c] = (tot[c]||0) + pool[f][c];
    const n = gcAt(L);
    const w = Array.from({length:n}, () => ({}));
    for (const f in pool){
      const ri = PS.assign[f];
      if (ri==null || ri<0 || ri>=PS.regions.length) continue;
      const g = groupOfRegion(L, ri);
      if (g==null || g>=n) continue;
      for (const c in pool[f]) w[g][c] = (w[g][c]||0) + pool[f][c];
    }
    for (const c in tot) for (let g=0; g<n; g++) if (tot[c]) w[g][c] = (w[g][c]||0) / tot[c];
    return (shareCache[L] = w);
  };
  routing.forEach((rlvl, rL) => {
    const cal = (PS.cal.levels||[])[rL];
    if (!cal || !cal.directAt) return;
    const total = {};
    let any = false;
    for (const c in cal.directAt){ if (cal.directAt[c]){ total[c] = cal.directAt[c]; any = true; } }
    if (any) rlvl.entering = Object.assign({}, rlvl.entering, total);
  });

  const res = QR.project({
    routing, entries0: a0.rows,
    groupCount: gcAt, groupOf: groupOfAny, conv, cells: CODES, share: shareFn,
  });

  const lastIsFinal = gcAt(routing.length - 1) === 1;
  const feeIndex = L => (lastIsFinal && L === routing.length - 1) ? NL : Math.min(L, NL);

  const lvl = [];
  for (let L = 0; L < NL; L++){
    const rows = Array.from({length: gcAt(L)}, () => ({}));
    routing.forEach((rlvl, rL) => {
      if (feeIndex(rL) !== L) return;
      for (let g = 0; g < gcAt(L); g++) CODES.forEach(c => {
        rows[g][c] = (rows[g][c]||0) + QR.entriesAt(res, rL, g, [c]);
      });
    });
    lvl.push({rows, un:{}, source:'routed'});
  }
  const finalCells = {};
  routing.forEach((rlvl, rL) => {
    if (feeIndex(rL) !== NL) return;
    for (let g = 0; g < gcAt(rL); g++) CODES.forEach(c => {
      finalCells[c] = (finalCells[c]||0) + QR.entriesAt(res, rL, g, [c]);
    });
  });
  const finalTotalBefore = CODES.reduce((s,c)=>s+(finalCells[c]||0),0);
  if (PS.prequal > 0 && finalTotalBefore > 0){
    CODES.forEach(c => { finalCells[c] = (finalCells[c]||0) + PS.prequal * ((finalCells[c]||0)/finalTotalBefore); });
  }

  return { levels: lvl, final: finalCells, calib: [], problems: res.problems, routed: true };
}

/* Core volume model. Returns entries per level per group per cell, plus the
   calibration residuals. */
function computeVolume(){
  if (PS.boundaryRouting && PS.boundaryRouting.length && window.QualRouting){
    return computeVolumeFromRouting(PS.boundaryRouting);
  }
  const NL = levelCount();
  const flow = PS.flow;
  const cal = PS.cal || {levels:[], observedAt:[]};
  const calAt = L => (cal.levels && cal.levels[L]) || {conv:{}, directAt:{}};
  const wasObserved = L => !!(cal.observedAt && cal.observedAt[L]);

  // --- level 0: observed Regionals, reallocated by the current map ---
  const lvl = [];
  const a0 = allocate(poolKey('Regionals'), 0);
  lvl.push({rows:a0.rows, un:a0.un, source:'observed'});

  // --- levels 1..NL-1, via the same builder the calibration used ---
  for (let L=1; L<NL; L++){
    const rows = buildLevel(L, lvl[L-1].rows, calAt(L));
    lvl.push({rows, un:{}, source: wasObserved(L) ? 'calibrated' : 'modelled'});
  }

  // --- the final championship: one stop, fed by every level's direct places ---
  const finalCells = {};
  for (let L=0; L<NL; L++){
    const f = flow[L];
    if (!f) continue;
    if (!f.direct && !CODES.some(c => directFor(L,c) > 0)) continue;
    lvl[L].rows.forEach(r => {
      CODES.forEach(c => {
        const e = r[c] || 0;
        if (e > 0) finalCells[c] = (finalCells[c]||0) + directOut(e, directFor(L,c)) * (1 + (f.add||0)/100);
      });
    });
  }
  const finalTotalBefore = CODES.reduce((s,c)=>s+(finalCells[c]||0),0);
  if (PS.prequal > 0 && finalTotalBefore > 0){
    CODES.forEach(c => { finalCells[c] = (finalCells[c]||0) + PS.prequal * ((finalCells[c]||0)/finalTotalBefore); });
  }

  // Per-level decomposition for the calibration panel: what the rules alone
  // send up, what the frozen conversion does to it, and who joins directly.
  const calib = [];
  for (let L=1; L<NL; L++){
    const k = calAt(L);
    const obs = observedPool(L);
    let rules = 0, conv = 0, direct = 0, observed = 0;
    for (let gPrev=0; gPrev<groupCountAt(L-1); gPrev++){
      const src = lvl[L-1].rows[gPrev] || {};
      CODES.forEach(c => {
        const e = src[c] || 0;
        if (!e) return;
        const a = advanceOut(e, advanceFor(L-1,c), directFor(L-1,c));
        rules += a;
        conv += a * (((k.conv[c] != null) ? k.conv[c] : 1) - 1);
      });
    }
    CODES.forEach(c => { direct += k.directAt[c] || 0; });
    if (obs){ const t = totalCells(obs.rows); CODES.forEach(c => { observed += t[c]||0; }); }
    calib.push({L, name:levelName(L), rules, conv, direct,
                total: lvl[L].rows.reduce((s,r)=>s+CODES.reduce((q,c)=>q+(r[c]||0),0),0),
                observed, wasObserved: wasObserved(L)});
  }

  return { levels: lvl, final: finalCells, calib };
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

/* Full revenue roll-up at a given price card.
   Reports gross fee income, the DiveMeets per-entry pass-through, and the net
   retained by USA Diving. Membership dues carry no pass-through. */
function computeRevenue(useNewPrices){
  const V = computeVolume();
  const NL = levelCount();
  const levy = PS.levy || 0;

  /* ---- junior circuit event fees ---- */
  const perLevel = [];
  let eventRev = 0, eventEntries = 0, synchroTeams = 0;
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
    // Synchro: one entry fee and one levy charge per TEAM, not per diver.
    const sy = (PS.synchro && PS.synchro[L]) || {teams:0, fee:0};
    const syTeams = Math.max(0, +sy.teams||0);
    const syRev = syTeams * (+sy.fee||0);
    const lv = (entries + syTeams) * levy;
    rev += syRev;
    eventRev += rev; eventEntries += entries;
    synchroTeams += syTeams;
    perLevel.push({
      L, name: fee.name, stops: (L<NL ? groupCountAt(L) : 1),
      qual:q, nonqual:nq, entries, late, rev, levy:lv, net:rev-lv,
      syTeams, syRev, syFee:(+sy.fee||0),
      source: (L<NL ? V.levels[L].source : 'modelled'),
    });
  }

  /* ---- senior circuit ----
     Individual entries bill per event entry. Synchro bills once per TEAM, and
     the DiveMeets levy follows the same rule, so synchro is carried separately
     all the way through rather than folded into the entry count. */
  const perSenior = [];
  let seniorRev = 0, seniorEntries = 0, seniorSynchro = 0;
  (PS.senior||[]).forEach((row, i) => {
    const pulled = PS.seniorEntries[row.meet];
    const liveInd = pulled ? pulled.n : 0;
    const liveSyn = pulled ? pulled.syn : 0;
    const rawInd = row.useManual ? (+row.manual||0) : liveInd;
    // Synchro is never live: the entries scraper excludes it by policy, so the
    // hand-entered figure is authoritative whether or not the override is on.
    const rawSyn = row.hasSynchro ? (+row.manualSyn||0) : 0;
    const baseF = 125;
    const E = useNewPrices ? ((PS.sElast && PS.sElast[i]) || 0) : 0;
    const f = useNewPrices ? (+row.fee||0) : baseF;
    const n = rawInd * volMult(baseF, f, E);
    const sy = rawSyn * volMult(baseF, f, E);
    const rev = (n + sy) * f;
    const lv = (n + sy) * levy;
    seniorRev += rev; seniorEntries += n; seniorSynchro += sy;
    perSenior.push({i, name:row.name, meet:row.meet, dates:row.dates,
                    events:row.events, rounds:row.rounds, entry:row.entry,
                    hasSynchro:row.hasSynchro, synchroEvents:row.synchroEvents,
                    entries:n, synchro:sy, liveInd, liveSyn,
                    evCount: pulled ? pulled.ev : 0, fee:f, rev, levy:lv, net:rev-lv,
                    source: row.useManual ? 'entered' : (pulled ? 'observed' : 'missing')});
  });

  /* ---- membership dues ---- */
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

  // Chargeable units: every individual event entry, plus one per synchro team.
  const allEntries = eventEntries + seniorEntries;
  const chargeable = allEntries + synchroTeams + seniorSynchro;
  const levyTotal  = chargeable * levy;
  const gross      = eventRev + seniorRev + memberRev;

  return {V, perLevel, perSenior, perType,
          eventRev, eventEntries, seniorRev, seniorEntries,
          memberRev, memberCount,
          allEntries, synchroTeams, seniorSynchro, chargeable, levyTotal, gross, net: gross - levyTotal,
          total: gross};
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
    PS.boundaryRouting = (d.routing && d.routing.length) ? d.routing : null;
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
  const ds = defaultSynchro(NL), oldS = PS.synchro || [];
  PS.synchro = ds.map((x,i) => oldS[i] ? Object.assign({}, x, oldS[i]) : x);
}

/* Freeze the national field produced by the calibrated baseline, so the
   qualification panel can show what a scenario actually does to the number of
   athletes reaching the championships. */
function snapshotBaseline(){
  const V = computeVolume();
  PS.baseFinal = Object.assign({}, V.final);
}

/* Pull live senior entry counts from the DiveMeets entries sync. One row per
   (meet, event), so summing entries does not double count prelim vs final. */
async function loadSeniorEntries(){
  const ids = (PS.senior||[]).map(r => String(r.meet||'').trim()).filter(Boolean);
  if (!ids.length) return;
  try {
    const r = await NEON.query(
      `SELECT meet_id_dm m,
         COALESCE(sum(entries) FILTER (WHERE NOT (COALESCE(discipline,'') ILIKE '%synchro%'
                                              OR COALESCE(event_name,'') ILIKE '%synchro%')),0)::int ind,
         COALESCE(sum(entries) FILTER (WHERE COALESCE(discipline,'') ILIKE '%synchro%'
                                          OR COALESCE(event_name,'') ILIKE '%synchro%'),0)::int syn,
         count(*)::int ev
       FROM junior_results.meet_entries WHERE meet_id_dm = ANY($1) GROUP BY 1`, [ids]);
    const out = {};
    r.rows.forEach(x => { out[String(x.m)] = {n:+x.ind, syn:+x.syn, ev:+x.ev}; });
    PS.seniorEntries = out;
    // Per-event detail: the Qualifier advances the top N of each event, and a
    // field shorter than N can only send as many divers as it has.
    const d = await NEON.query(
      `SELECT meet_id_dm m, event_id_dm e, entries n
       FROM junior_results.meet_entries
       WHERE meet_id_dm = ANY($1)
         AND NOT (COALESCE(discipline,'') ILIKE '%synchro%'
               OR COALESCE(event_name,'') ILIKE '%synchro%')`, [ids]);
    const per = {};
    d.rows.forEach(x => { (per[String(x.m)] = per[String(x.m)] || []).push(+x.n); });
    PS.seniorEventFields = per;
  } catch(e){ console.warn('senior entries', e); PS.seniorEntries = {}; }
}

/* Derived senior prequalification pathways. Seven are placement results we can
   compute; the rest are roster decisions recorded nowhere in this database and
   come back null so they are asked for rather than invented. */
async function loadSeniorPrequal(){
  try { PS.seniorPrequal = await loadJson('senior-prequal.json'); }
  catch(e){ console.warn('senior prequal', e); PS.seniorPrequal = null; }
  try { PS.squads = await loadJson('squad-rosters.json'); }
  catch(e){ console.warn('squad rosters', e); PS.squads = null; }
}
function squad(key){
  const s = PS.squads && PS.squads.squads;
  const r = s ? s.find(x => x.key === key) : null;
  return (r && r.reliable) ? r : null;
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
    PS.senior = defaultSenior();
    PS.pathway = defaultPathway();
    await loadCounts();
    await loadSeniorEntries();
    await loadNationalActual();
    await loadSeniorPrequal();
    deriveCalibration();     // freeze against the alignment actually run
    calibratePrequal();
    snapshotBaseline();
    PS.ready = true;
  } catch(e){
    console.error(e); PS.err = e.message || String(e);
  }
  PS.loading = false;
}

/* The national entry count is the anchor the whole flow model is solved
   against, so it must not be a frozen snapshot. 728 was captured on 28 July
   2026 while signup was still open; entries can change until three hours
   before each event. Read it live from the DiveMeets entries sync instead,
   splitting individual from synchro, and fall back to the snapshot only if the
   table cannot be reached -- labelled as such in the UI either way. */
const NAT_FALLBACK_2026 = 728, NAT_SYN_FALLBACK_2026 = 20;
const natActual = () => (PS.natActual != null ? PS.natActual : NAT_FALLBACK_2026);

async function loadNationalActual(){
  const id = String(PS.natMeet||'').trim();
  if (!id) return;
  try {
    const r = await NEON.query(
      `SELECT
         COALESCE(sum(entries) FILTER (WHERE NOT (COALESCE(discipline,'') ILIKE '%synchro%'
                                              OR COALESCE(event_name,'') ILIKE '%synchro%')),0)::int ind,
         COALESCE(sum(entries) FILTER (WHERE COALESCE(discipline,'') ILIKE '%synchro%'
                                          OR COALESCE(event_name,'') ILIKE '%synchro%'),0)::int syn,
         to_char(max(fetched_at),'Mon DD HH24:MI') fetched
       FROM junior_results.meet_entries WHERE meet_id_dm=$1`, [id]);
    const row = r.rows && r.rows[0];
    if (row && +row.ind > 0){
      PS.natActual = +row.ind;
      PS.natFetched = row.fetched || null;
      PS.natSource = 'live';
      // Do NOT seed synchro from this source. The DiveMeets entries scraper
      // excludes synchro by policy (individual-entry planning only), so it
      // always reports zero -- which would silently wipe a real team count.
      PS.natSyn = null;
    } else {
      PS.natSource = 'fallback';
    }
  } catch(e){ console.warn('national actual', e); PS.natSource = 'fallback'; }
}

/* Seed the pre-qualified count so the modelled final matches the actual
   national entry count. */
/* Pre-qualified entries into the final championship.

   This used to be a plug: whatever number made the model reconcile to the
   actual field. It is now the MEASURED entry count of the published Tier III
   Junior squad, matched name by name against the entrant list. The difference
   between (modelled + measured) and the actual field is therefore a real
   residual that says something about the model, rather than a figure defined
   to make the residual zero. */
function calibratePrequal(){
  if (PS.year !== 'y26') { PS.prequal = 0; PS.prequalSource = 'n/a'; return; }
  const sq = squad('tier3_junior');
  if (sq){
    PS.prequal = sq.entries;
    PS.prequalSource = 'measured';
  } else {
    const V = computeVolume();
    const modelled = CODES.reduce((s,c)=>s+(V.final[c]||0),0);
    PS.prequal = Math.max(0, Math.round(natActual() - modelled));
    PS.prequalSource = 'solved';
  }
}

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
  const dNet = sim.net - base.net;
  const dMem = sim.memberRev - base.memberRev;
  const dEvt = (sim.eventRev + sim.seniorRev) - (base.eventRev + base.seniorRev);
  const feeIncome = sim.eventRev + sim.seniorRev;
  const takeRate = feeIncome > 0 ? (sim.levyTotal / feeIncome * 100) : 0;
  return `
  <div class="kpi-band">
    ${kpi('Net retained by USA Diving', usd(sim.net),
          `Baseline ${usd(base.net)} &middot; ${deltaSpan(dNet)}`, 'var(--navy)')}
    ${kpi('Membership dues', usd(sim.memberRev),
          `${fmt(Math.round(sim.memberCount))} memberships &middot; ${deltaSpan(dMem)}`, 'var(--pool)')}
    ${kpi('Entry fees, gross', usd(feeIncome),
          `${fmt(Math.round(sim.allEntries))} entries &middot; ${deltaSpan(dEvt)}`, 'var(--sky)')}
    ${kpi('DiveMeets pass-through', '&minus;' + usd(sim.levyTotal),
          `${usd(PS.levy)} &times; ${fmt(Math.round(sim.allEntries))} entries &middot; ${takeRate.toFixed(1)}% of fee income`, '#b45309')}
    ${kpi('Structure', fmt(structureStops()) + ' junior stops',
          esc(PS.boundaryName) + ' &middot; ' + levelCount() + ' levels + final')}
  </div>`;
}

function renderSenior(base, sim){
  const rows = sim.perSenior.map((p,i) => {
    const row = PS.senior[i];
    const b = base.perSenior[i];
    const d = p.net - b.net;
    const tag = p.source==='observed' ? prov('measured', fmt(p.evCount) + ' events')
              : p.source==='entered'  ? prov('entered')
              :                         prov('missing', 'not synced');
    return `<tr>
      <td><b>${esc(row.name)}</b> ${tag}
        <span class="ps-rider">${esc(row.dates)} &middot; ${row.events} individual events &middot; ${esc(row.rounds)}${
          row.hasSynchro?` &middot; ${row.synchroEvents} synchro events`:''}<br>
          Entry: <b>${row.entry==='open'?'open to any member':'prequalified only'}</b>
          &middot; meet <input class="ps-in xs" type="text" data-smeet="${i}" value="${esc(row.meet)}"></span></td>
      <td class="num">${p.liveInd?fmt(p.liveInd):'<span class="ps-na">&mdash;</span>'}</td>
      <td class="num">${row.hasSynchro ? prov('entered', 'type it in') : '<span class="ps-na">n/a</span>'}</td>
      <td class="num"><input class="ps-in sm" type="number" min="0" data-smanual="${i}" value="${Math.round(row.manual)||0}">
        <label class="ps-chk"><input type="checkbox" data-suse="${i}"${row.useManual?' checked':''}> use</label>
        ${row.hasSynchro?`<span class="ps-bite">synchro teams <input class="ps-in xs2" type="number" min="0" data-smansyn="${i}" value="${Math.round(row.manualSyn)||0}"></span>`:''}</td>
      <td class="num">${fmt(Math.round(p.entries))}${p.synchro?` <span class="ps-bite">+${fmt(Math.round(p.synchro))} teams</span>`:''}</td>
      <td class="num"><input class="ps-in" type="number" min="0" step="5" data-sfee="${i}" value="${row.fee}"></td>
      <td class="num mono">${usd(p.rev)}</td>
      <td class="num mono ps-levy">&minus;${usd(p.levy)}</td>
      <td class="num mono">${usd(p.net)}</td>
      <td class="num">${deltaSpan(d)}</td>
    </tr>`;
  }).join('');
  const dTot = sim.seniorRev - base.seniorRev;
  const missing = sim.perSenior.some(p => p.source==='missing');
  const notStarted = sim.perSenior.some(p => p.source!=='entered' && !p.liveInd);

  // --- prequalification decomposition for the National Championships ---
  const nats = sim.perSenior.find(p => p.entry==='prequalified');
  let prequalBlock = '';
  if (nats){
    const SP = PS.seniorPrequal;
    const paths = SP && SP.pathways ? SP.pathways
                : SENIOR_PREQUAL.map(l => ({label:l, entries:null, derived:false}));
    let manual = 0, derivedShown = 0;
    // Top 12 of each Qualifier event advance to Nationals in that event
    // (2026 National Championship Qualifier Criteria, as of 11 June). Capped
    // at field size: a seven-entry event cannot send twelve.
    const qMeet = (PS.senior.find(r => r.entry==='open')||{}).meet;
    const qFields = (PS.seniorEventFields||{})[qMeet] || [];
    const qAdvance = qFields.reduce((a,n) => a + Math.min(PS.qualCutoff, n), 0);
    const SQUAD_FOR = [
      [/National Team/i,            'national_team'],
      [/Tier III Junior|Tier 3 Junior/i, 'tier3_junior_senior'],
      [/Olympic Games Team/i,       'olympic_2024'],
      [/Tier I or II HPS/i,         'tier1_hps'],
    ];
    const pr = paths.map((p, k) => {
      const sk = (SQUAD_FOR.find(([re]) => re.test(p.label)) || [])[1];
      const sq = sk ? squad(sk) : null;
      const isQual = /Qualifier/i.test(p.label);
      const override = PS.prequalPaths[k];
      const val = override != null ? override
                : (p.derived ? p.entries : (isQual ? qAdvance : (sq ? sq.entries : 0)));
      if (p.derived && override == null) derivedShown += (p.entries||0);
      else manual += (+val||0);
      return `<tr>
        <td class="ps-sub">${esc(p.label)}
          ${p.derived ? prov('measured', p.athletes!=null ? fmt(p.athletes)+' athletes' : '')
            : isQual ? prov('modelled', 'top '+fmt(PS.qualCutoff)+' of each of '+fmt(qFields.length)+' events')
            : sq ? prov('measured', fmt(sq.entered)+' of '+fmt(sq.roster)+' entered, '+sq.events_per_athlete+' events each')
            : (() => {
                const raw = sk && PS.squads && PS.squads.squads
                          ? PS.squads.squads.find(x => x.key === sk) : null;
                return raw
                  ? prov('missing', 'roster of ' + fmt(raw.roster) + ' held, too few matched to measure yet')
                  : prov('missing');
              })()}</td>
        <td class="num"><input class="ps-in sm" type="number" min="0" data-pq="${k}"
          value="${Math.round(val)||0}"></td></tr>`;
    }).join('');
    // Pathways overlap -- the same athlete wins in more than one year -- so the
    // derived rows must be combined by their deduplicated union, not summed.
    const union = SP && SP.union_entries != null ? SP.union_entries : derivedShown;
    const naive = SP && SP.sum_of_derived != null ? SP.sum_of_derived : derivedShown;
    const accounted = union + manual;
    const obs = nats.liveInd;
    prequalBlock = `
    <h4 class="ps-h4">How the National Championships field is filled</h4>
    <p class="note" style="margin:0 0 10px">The Senior pathway is <b>not</b> a placement cascade like the Junior circuit &mdash;
      entry is by prequalification against a published list of standards, and athletes may only enter events they hold a
      standard in. The Qualifier on ${esc((PS.senior.find(r=>r.entry==='open')||{}).dates||'5-6 Aug')} exists so they can add events.
      Rows marked <b>derived</b> are computed from final standings in our own results; the rest are roster decisions recorded
      nowhere in this database and need a number from you.</p>
    <table class="ps-tbl"><thead><tr><th>Qualification pathway</th><th class="num">Entries</th></tr></thead>
      <tbody>${pr}
        <tr class="ps-tot"><td>Accounted for</td><td class="num mono">${fmt(Math.round(accounted))}</td></tr>
        <tr><td class="ps-sub">Live entry count for meet ${esc(nats.meet)}</td>
          <td class="num mono">${obs?fmt(obs):'<span class="ps-na">not yet open</span>'}</td></tr>
        ${obs?`<tr><td class="ps-sub">Unaccounted for</td><td class="num">${diffCell(accounted, obs)}</td></tr>`:''}
      </tbody></table>
    ${naive>union?`<div class="ps-ok" style="margin-top:10px"><b>Do not add the column up.</b> The derived pathways overlap &mdash;
      the same athlete wins in more than one year &mdash; so they sum to ${fmt(naive)} but represent only
      <b>${fmt(union)}</b> distinct athlete-event places. The total above uses the deduplicated figure.</div>`:''}
    <div class="ps-inline">
      <label>Qualifier advances the top <input class="ps-in sm" type="number" min="0" max="60" data-qcut value="${PS.qualCutoff}"> of each event</label>
      <span class="note">Published rule for 2026 is 12, and it is the sharpest lever on the senior field: six events, so each place added or removed moves the Championships by six.
        Capped at field size &mdash; a short event cannot send a full twelve. Athletes who advance this way have the Championships late fee waived, so raising the cutoff does not raise late-fee income.</span>
    </div>
    <p class="note ps-foot">Counted as athlete-and-event pairs, because a pathway qualifies an athlete for a specific event &mdash;
      a 3-meter champion is prequalified on 3-meter, not across the board &mdash; and that is also the unit entry fees bill in.
      Synchronised events sit outside all of this: the criteria set no qualification protocol for them, only a minimum degree of
      difficulty, and a diver may pair with up to two partners. So synchro does not move when you change a pathway &mdash; but it is
      still billed, once per team. <b>Synchro team counts must be typed in:</b> the DiveMeets entries sync excludes synchro by
      policy, so it reports zero for every meet and can never fill this in.</p>`;
  }

  return `<div class="card"><div class="card-h">
      <h3>Senior circuit</h3>
      <div class="note">$125 per event. Structure taken from the 2026 USA Diving National Championship Qualification Criteria and the published schedule.</div>
    </div><div class="card-b">
    ${notStarted ? `<div class="ps-warn">Entry counts read zero because these meets have not opened or have not been synced yet &mdash; the Qualifier runs 5&ndash;6 August and the Championships 7&ndash;11 August. Tick <b>use</b> to model a figure in the meantime, or re-run the DiveMeets entries sync once signup opens.</div>`
      : (missing ? '<div class="ps-warn">One or more meets have no synced entry count. Tick <b>use</b> and type a figure, or re-run the DiveMeets entries sync for that meet number.</div>' : '')}
    <table class="ps-tbl"><thead><tr>
      <th>Meet</th><th class="num">Live individual</th><th class="num">Synchro</th><th class="num">Override</th>
      <th class="num">Entries used</th><th class="num">Fee / event</th>
      <th class="num">Gross</th><th class="num">DiveMeets</th><th class="num">Net</th><th class="num">vs baseline</th>
    </tr></thead><tbody>${rows}
      <tr class="ps-tot"><td>Total</td><td colspan="3"></td>
      <td class="num">${fmt(Math.round(sim.seniorEntries + sim.seniorSynchro))}</td><td></td>
      <td class="num mono">${usd(sim.seniorRev)}</td>
      <td class="num mono ps-levy">&minus;${usd((sim.seniorEntries+sim.seniorSynchro)*PS.levy)}</td>
      <td class="num mono">${usd(sim.seniorRev - (sim.seniorEntries+sim.seniorSynchro)*PS.levy)}</td>
      <td class="num">${deltaSpan(dTot)}</td></tr>
    </tbody></table>
    ${prequalBlock}
    </div></div>`;
}

function structureStops(){
  let n = 1;
  for (let L=0; L<levelCount(); L++) n += groupCountAt(L);
  return n;
}

function renderStructure(sim){
  const NL = levelCount();
  const rows = sim.perLevel.map(p => {
    const tag = p.source==='observed'   ? prov('measured')
              : p.source==='calibrated' ? prov('reconstructed')
              :                           prov('modelled');
    const f = PS.flow[p.L];
    const ovc = f ? levelOverrideCount(p.L) : 0;
    return `<tr>
      <td><b>${esc(p.name)}</b> ${tag}</td>
      <td class="num">${fmt(p.stops)}</td>
      <td class="num">${fmt(Math.round(p.entries))}</td>
      <td class="num">${fmt(Math.round(p.qual))}</td>
      <td class="num">${fmt(Math.round(p.nonqual))}</td>
      <td class="num">${f ? `<input class="ps-in sm" type="number" min="0" max="99" data-flow="advance" data-l="${p.L}" value="${f.advance}">` : '<span class="ps-na">&mdash;</span>'}</td>
      <td class="num">${f ? `<input class="ps-in sm" type="number" min="0" max="99" data-flow="direct" data-l="${p.L}" value="${f.direct}">` : '<span class="ps-na">&mdash;</span>'}</td>
      <td class="num">${f ? `<button class="ps-btn tiny" data-grid="${p.L}">${PS.openGrid===p.L?'Hide':'By age group'}${ovc?` <span class="ps-ovc">${ovc}</span>`:''}</button>` : ''}</td>
    </tr>` + ((f && PS.openGrid===p.L) ? `<tr class="ps-gridrow"><td colspan="8">${renderCellGrid(p.L)}</td></tr>` : '');
  }).join('');
  return `<div class="card"><div class="card-h">
      <h3>Competition structure</h3>
      <div class="note">Stops, fields and qualifier counts come from the loaded boundary scenario. Change how many advance out of each level and every downstream field &mdash; and the revenue &mdash; recomputes.</div>
    </div><div class="card-b">
    <table class="ps-tbl"><thead><tr>
      <th>Level</th><th class="num">Stops</th><th class="num">Entries</th>
      <th class="num">Qualifying</th><th class="num">Non-qual.</th>
      <th class="num">Advance / event</th><th class="num">Direct to final / event</th><th></th>
    </tr></thead><tbody>${rows}</tbody></table>
    <p class="note ps-foot">Advance = places moving to the next level per event per stop. Direct = places going straight to ${esc(PS.finalName)}. A field smaller than the cap sends only as many divers as it has, matching the &ldquo;or the last diver&rdquo; rule.</p>
    </div></div>`;
}

function renderEventFees(base, sim){
  const NL = levelCount();
  const rows = sim.perLevel.map((p,i) => {
    const f = PS.fees[i], b = base.perLevel[i];
    const d = p.net - b.net;
    const showNon = p.nonqual > 0.5 || f.non > 0;
    // What the pass-through costs as a share of the headline fee at this level.
    const bite = f.qual > 0 ? (PS.levy / f.qual * 100) : 0;
    const biteNon = f.non > 0 ? (PS.levy / f.non * 100) : 0;
    return `<tr>
      <td><b>${esc(f.name)}</b></td>
      <td class="num">${fmt(Math.round(p.entries))}</td>
      <td class="num"><input class="ps-in" type="number" min="0" step="5" data-fee="qual" data-l="${i}" value="${f.qual}">
        <span class="ps-bite">${bite?bite.toFixed(1)+'% levy':''}</span></td>
      <td class="num">${showNon ? `<input class="ps-in" type="number" min="0" step="5" data-fee="non" data-l="${i}" value="${f.non}">
        <span class="ps-bite">${biteNon?biteNon.toFixed(1)+'% levy':''}</span>` : '<span class="ps-na">n/a</span>'}</td>
      <td class="num"><input class="ps-in sm" type="number" min="0" max="100" step="0.5" data-eel="${i}" value="${PS.eElast[i]||0}"></td>
      <td class="num"><input class="ps-in sm" type="number" min="0" data-syt="${i}" value="${p.syTeams}">
        <span class="ps-bite">@ <input class="ps-in xs2" type="number" min="0" step="5" data-syf="${i}" value="${p.syFee}"></span></td>
      <td class="num mono">${usd(p.rev)}</td>
      <td class="num mono ps-levy">&minus;${usd(p.levy)}</td>
      <td class="num mono">${usd(p.net)}</td>
      <td class="num">${deltaSpan(d)}</td>
    </tr>`;
  }).join('');
  const dTot = (sim.eventRev - sim.eventEntries*PS.levy) - (base.eventRev - base.eventEntries*PS.levy);
  return `<div class="card"><div class="card-h">
      <h3>Junior circuit entry fees</h3>
      <div class="note">Baseline is the 2026 card from the Athlete Progression Guide. Response = % of entries lost per 10% fee increase.</div>
    </div><div class="card-b">
    <table class="ps-tbl"><thead><tr>
      <th>Level</th><th class="num">Entries</th><th class="num">Qualifying fee</th>
      <th class="num">Non-qual. fee</th><th class="num">Response</th><th class="num">Synchro teams</th>
      <th class="num">Gross</th><th class="num">DiveMeets</th><th class="num">Net</th><th class="num">vs baseline</th>
    </tr></thead><tbody>${rows}
      <tr class="ps-tot"><td>Total</td><td class="num">${fmt(Math.round(sim.eventEntries))}</td>
      <td colspan="3"></td><td class="num">${fmt(sim.synchroTeams)}</td><td class="num mono">${usd(sim.eventRev)}</td>
      <td class="num mono ps-levy">&minus;${usd(sim.eventEntries*PS.levy)}</td>
      <td class="num mono">${usd(sim.eventRev - sim.eventEntries*PS.levy)}</td>
      <td class="num">${deltaSpan(dTot)}</td></tr>
    </tbody></table>
    <div class="ps-inline">
      <label>DiveMeets levy <input class="ps-in sm" type="number" min="0" max="100" step="0.05" data-levy value="${PS.levy}"> per entry</label>
      <label>Late entries <input class="ps-in sm" type="number" min="0" max="100" step="0.5" data-late value="${PS.lateRate}"> % of entries</label>
      <span class="note">The levy is a flat amount, not a percentage, so it bites hardest on the cheapest entries &mdash; ${(PS.levy/45*100).toFixed(1)}% of a $45 non-qualifying entry against ${(PS.levy/125*100).toFixed(1)}% of a $125 national entry. Cutting a fee to widen access gives away proportionally more of what is left. Synchro is billed once per team, not once per diver, and the levy follows the same rule &mdash; one charge for the pair. Late registration is $${LATE_ATHLETE} per athlete ($${LATE_COACH} coach); your calibration is that the late fee is steep enough to deter, so this stays near zero unless you are testing a change to it.</span>
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

/* ---------- qualification outcomes ----------
   The half of the question that is not money: what a scenario does to the
   number of athletes reaching each stage, by age group, gender and event. */
function renderQualification(sim){
  const V = sim.V;
  const nowF = V.final, baseF = PS.baseFinal || {};
  const rowsFor = g => GENDERS.flatMap(x => BOARDS.map(b => {
    const c = g+x+b;
    const now = nowF[c]||0, was = baseF[c]||0;
    return `<tr>
      <td class="ps-sub">${GENDER_NAME[x]} ${BOARD_NAME[b]}</td>
      <td class="num mono">${fmt(Math.round(was))}</td>
      <td class="num mono">${fmt(Math.round(now))}</td>
      <td class="num">${qDelta(now-was)}</td></tr>`;
  })).join('');
  const groupBlocks = GROUPS.map(g => {
    let was=0, now=0;
    GENDERS.forEach(x => BOARDS.forEach(b => { was += baseF[g+x+b]||0; now += nowF[g+x+b]||0; }));
    return `<tr class="ps-grp"><td><b>Group ${g}</b></td>
        <td class="num mono">${fmt(Math.round(was))}</td>
        <td class="num mono">${fmt(Math.round(now))}</td>
        <td class="num">${qDelta(now-was)}</td></tr>` + rowsFor(g);
  }).join('');
  let tWas=0, tNow=0;
  CODES.forEach(c => { tWas += baseF[c]||0; tNow += nowF[c]||0; });

  const fieldRows = sim.perLevel.map(p => {
    const per = p.stops ? p.entries/p.stops : 0;
    return `<tr><td>${esc(p.name)}</td><td class="num">${fmt(p.stops)}</td>
      <td class="num mono">${fmt(Math.round(p.entries))}</td>
      <td class="num mono">${per.toFixed(0)}</td>
      <td class="num mono">${(per/24).toFixed(1)}</td></tr>`;
  }).join('');

  return `<div class="card"><div class="card-h">
      <h3>Qualification outcomes</h3>
      <div class="note">What the scenario does to athlete opportunity, independent of money. Baseline is the calibrated ${yearNum()} alignment.</div>
    </div><div class="card-b">
    <div class="ps-grid2">
      <div>
        <h4 class="ps-h4">Field reaching ${esc(PS.finalName)}</h4>
        <table class="ps-tbl"><thead><tr>
          <th>Age group / event</th><th class="num">Baseline</th><th class="num">Scenario</th><th class="num">Change</th>
        </tr></thead><tbody>${groupBlocks}
          <tr class="ps-tot"><td>All events</td>
            <td class="num mono">${fmt(Math.round(tWas))}</td>
            <td class="num mono">${fmt(Math.round(tNow))}</td>
            <td class="num">${qDelta(tNow-tWas)}</td></tr>
        </tbody></table>
      </div>
      <div>
        <h4 class="ps-h4">Field size per stop</h4>
        <table class="ps-tbl"><thead><tr>
          <th>Level</th><th class="num">Stops</th><th class="num">Entries</th>
          <th class="num">Per stop</th><th class="num">Per event</th>
        </tr></thead><tbody>${fieldRows}</tbody></table>
        <p class="note ps-foot">Per event assumes all 24 individual events run at every stop. This is the number that decides session length &mdash; a scenario that looks affordable can still be unrunnable if it pushes a stop past what the pool can get through in a day.</p>
      </div>
    </div>
    <p class="note ps-foot"><b>Read this alongside the money.</b> Cutting stops usually raises revenue per stop while cutting the number of athletes who reach the championships. Those two move in opposite directions, and this panel is the half the committee will feel.</p>
    </div></div>`;
}
function qDelta(d){
  const n = Math.round(d);
  if (n === 0) return '<span class="ps-d flat">&mdash;</span>';
  return `<span class="ps-d ${n>0?'up':'down'}">${n>0?'+':''}${fmt(n)} ${Math.abs(n)===1?'place':'places'}</span>`;
}

/* Per age group / per event qualifier overrides for one level. */
function renderCellGrid(L){
  const f = PS.flow[L];
  const head = GROUPS.map(g => `<th colspan="2">Group ${g}</th>`).join('');
  const sub  = GROUPS.map(() => '<th class="num">Boys</th><th class="num">Girls</th>').join('');
  const body = BOARDS.map(b => {
    const cells = GROUPS.flatMap(g => GENDERS.map(x => {
      const c = g+x+b;
      const ov = cellOverridden(L, c);
      return `<td class="num"><input class="ps-in xs2${ov?' ov':''}" type="number" min="0" max="99"
        data-cell="${c}" data-cl="${L}" value="${advanceFor(L, c)}"></td>`;
    })).join('');
    return `<tr><td class="ps-sub">${BOARD_NAME[b]}</td>${cells}</tr>`;
  }).join('');
  return `<div class="ps-cellgrid">
    <div class="ps-cg-head"><span>Places advancing out of <b>${esc(levelName(L))}</b>, per event per stop</span>
      <button class="ps-btn tiny" data-clear="${L}">Reset all to ${f.advance}</button></div>
    <table class="ps-tbl ps-cg"><thead>
      <tr><th></th>${head}</tr><tr><th></th>${sub}</tr></thead>
      <tbody>${body}</tbody></table>
    <p class="note">Set any cell independently &mdash; Group A 1-meter can send 12 while Group D platform sends 18. Highlighted cells differ from the level default.</p>
  </div>`;
}

/* ---------- pathway, from the loaded structure ----------
   Boundary Studio scenarios can carry a qualification pathway: place bands
   routing athletes between rounds and stops. When one is present this prices
   it against the fee card on screen, so every fee edit here applies to it.

   It is shown alongside rather than replacing the volume model above, because
   the two index levels differently: this module treats the final championship
   as one MORE level than the painted ones, while a hand-built scenario often
   puts it inside them. Silently reconciling that would misalign the fee rows
   and produce money that looks right. The mapping is therefore printed, so it
   can be checked rather than trusted. */
function renderPathwayMoney(){
  const QR = window.QualRouting;
  if (!QR || !PS.boundaryRouting) return '';
  const routing = PS.boundaryRouting;
  const NL = levelCount();

  let res;
  try {
    const a0 = allocate(poolKey('Regionals'), 0);
    const conv = {};
    ((PS.cal && PS.cal.levels) || []).forEach((k,i) => { if (k && k.conv) conv[i] = k.conv; });
    res = QR.project({
      routing, entries0: a0.rows,
      groupCount: L => groupCountAt(L),
      groupOf: (fL,g,tL) => { let c = g;
        for (let L = fL+1; L <= tL; L++){
          const of = (PS.levels[L] && PS.levels[L].of) || [];
          c = of[c]; if (c == null) return null; }
        return c; },
      conv, cells: CODES,
    });
    var seed = a0.rows;
  } catch(e){
    return `<div class="card"><div class="card-h"><h3>Pathway</h3></div><div class="card-b">
      <p class="note">Could not price the pathway: <span class="mono">${esc(e.message||e)}</span></p></div></div>`;
  }

  // The last level holding a single stop is the championship; that is the row
  // the final fee applies to.
  const lastIsFinal = groupCountAt(routing.length - 1) === 1;
  const feeIndex = L => (lastIsFinal && L === routing.length - 1) ? NL : Math.min(L, NL);
  const fees = routing.map((_,L) => PS.fees[feeIndex(L)] || {qual:0, non:0});
  const rev = QR.revenue(res, CODES, seed,
    {fees, levy: PS.levy, isQual: (L,c) => isQualifying(feeIndex(L), c)});

  const rows = rev.perLevel.map(p => {
    const fee = PS.fees[feeIndex(p.level)] || {name:'—', qual:0};
    return `<tr>
      <td><b>${esc(levelName(p.level))}</b>
        <span class="ps-rider">billed at the <b>${esc(fee.name)}</b> rate</span></td>
      <td class="num">${fmt(groupCountAt(p.level))}</td>
      <td class="num">${fmt(Math.round(p.entries))}</td>
      <td class="num mono">${usd(fee.qual)}</td>
      <td class="num mono">${usd(p.gross)}</td>
      <td class="num mono ps-levy">&minus;${usd(p.levy)}</td>
      <td class="num mono">${usd(p.net)}</td></tr>`;
  }).join('');

  const probs = (res.problems||[]).map(p =>
    `<li>${esc(p.level!=null ? levelName(p.level)+': ' : '')}${esc(p.msg)}</li>`).join('');

  return `<div class="card"><div class="card-h">
      <h3>Pathway carried on this structure</h3>
      <div class="note">${esc(PS.boundaryName)} carries a qualification pathway. Priced here against the fee card above, so every fee change applies to it.</div>
    </div><div class="card-b">
    ${probs ? `<div class="ps-warn"><b>The pathway has problems, so these figures are unsafe.</b><ul style="margin:6px 0 0 18px">${probs}</ul></div>` : ''}
    <table class="ps-tbl"><thead><tr>
      <th>Stage</th><th class="num">Stops</th><th class="num">Billable entries</th>
      <th class="num">Fee</th><th class="num">Gross</th><th class="num">DiveMeets</th><th class="num">Net</th>
    </tr></thead><tbody>${rows}
      <tr class="ps-tot"><td>Total</td><td></td><td class="num">${fmt(Math.round(rev.entries))}</td><td></td>
        <td class="num mono">${usd(rev.gross)}</td>
        <td class="num mono ps-levy">&minus;${usd(rev.levy)}</td>
        <td class="num mono">${usd(rev.net)}</td></tr>
    </tbody></table>
    <p class="note ps-foot"><b>Billable entries, not round fields.</b> An athlete pays once per event at a meet
      however many rounds they dive, so movement between rounds inside a stage bills nothing. Adding the round
      fields together would charge the same diver two or three times.<br>
      <b>Read the mapping above.</b> This module counts the championship as one level beyond the painted ones,
      while a hand-built scenario often puts it inside them, so which fee row each stage is billed at is printed
      rather than assumed. If a stage is on the wrong rate, the fee card order is what to fix.<br>
      This sits alongside the volume model in the other sections rather than replacing it &mdash; the two are not
      yet one engine, and reconciling them is a deliberate change, not a silent one.</p>
    </div></div>`;
}

function renderCalibration(sim){
  const cal = sim.V.calib || [];
  const cb = PS.cal || {};
  const drifted = cb.basis && (cb.basis !== PS.boundaryName || cb.regions !== PS.regions.length);
  const modelledNat = sim.perLevel[sim.perLevel.length-1].entries;

  const banner = drifted
    ? `<div class="ps-warn"><b>You are off the calibrated baseline.</b> The flow constants were derived from
        <b>${esc(cb.basis)}</b> (${fmt(cb.regions)} regions, ${esc(cb.year||yearNum())}) and are being held fixed while you
        simulate <b>${esc(PS.boundaryName)}</b> (${fmt(PS.regions.length)} regions). That is deliberate &mdash;
        re-deriving them per scenario would let the residual absorb your structural change and every hypothetical
        would falsely show no effect.</div>`
    : `<div class="ps-ok">Flow constants derived from <b>${esc(cb.basis||PS.boundaryName)}</b>, ${yearNum()} &mdash;
        the alignment actually run that season. This is the calibrated baseline.</div>`;

  const rows = cal.map(k => {
    const convPct = k.rules > 0 ? (k.conv / k.rules * 100) : 0;
    const tag = k.wasObserved ? prov('measured') : prov('modelled', 'no results behind it');
    return `<tr class="ps-grp"><td><b>${esc(k.name)}</b> ${tag}</td>
        <td class="num mono">${fmt(Math.round(k.total))}</td>
        <td class="num mono">${k.wasObserved ? fmt(Math.round(k.observed)) : '<span class="ps-na">&mdash;</span>'}</td>
        <td class="num">${k.wasObserved ? diffCell(k.total, k.observed) : '<span class="ps-na">&mdash;</span>'}</td></tr>
      <tr><td class="ps-sub">places the rules alone send up</td><td class="num mono">${fmt(Math.round(k.rules))}</td>
        <td colspan="2" class="note">Capped at field size, so a short field sends fewer than the cap allows.</td></tr>
      <tr><td class="ps-sub">take-up adjustment</td>
        <td class="num mono ${k.conv<-0.5?'ps-levy':''}">${k.conv>=0?'+':''}${fmt(Math.round(k.conv))}</td>
        <td colspan="2" class="note">${k.conv >= 0
          ? 'Athletes added by clearing the average-place score bar.'
          : `Qualified athletes who do not take up their place &mdash; ${Math.abs(convPct).toFixed(0)}% of those eligible.`}</td></tr>
      <tr><td class="ps-sub">joining at this level</td><td class="num mono">${fmt(Math.round(k.direct))}</td>
        <td colspan="2" class="note">${k.L===1
          ? (PS.year==='y26' ? 'Groups C/D auto-advance in 2026; plus platform, non-qualifying at Regionals.' : 'Platform, non-qualifying at Regionals.')
          : 'Athletes entering here directly, including YMCA national champions.'}</td></tr>`;
  }).join('');

  const natRow = PS.year==='y26'
    ? `<tr class="ps-tot"><td>${esc(PS.finalName)} entries</td>
         <td class="num mono">${fmt(Math.round(modelledNat))}</td>
         <td class="num mono">${fmt(natActual())}</td>
         <td class="num">${diffCell(modelledNat, natActual())}</td></tr>
       <tr><td colspan="4" class="note">${PS.natSource==='live'
             ? `Live from the DiveMeets sync, meet ${esc(PS.natMeet)}${PS.natFetched?', fetched '+esc(PS.natFetched):''}. Individual entries only &mdash; the entries sync excludes synchro by policy, so synchro team counts are entered by hand below and are never overwritten by a sync.`
             : `<b>Snapshot, not live.</b> Meet ${esc(PS.natMeet)} has no synced entry count, so this falls back to the 28 July 2026 figure taken while signup was still open. Re-run the DiveMeets entries sync for this meet to anchor on the real number.`}</td></tr>`
    : `<tr class="ps-tot"><td>${esc(PS.finalName)} entries</td><td class="num mono">${fmt(Math.round(modelledNat))}</td>
         <td class="num ps-na">&mdash;</td><td class="ps-na">&mdash;</td></tr>`;

  return `<div class="card"><div class="card-h">
      <h3>Model calibration</h3>
      <div class="note">How each level&rsquo;s field is reconstructed, and whether it lands on the season we actually ran.</div>
    </div><div class="card-b">
    ${banner}
    <table class="ps-tbl"><thead><tr>
      <th>Level</th><th class="num">Reconstructed</th><th class="num">Observed</th><th class="num">Difference</th>
    </tr></thead><tbody>${rows}${natRow}</tbody></table>
    <div class="ps-inline">
      <label>Pre-qualified into ${esc(PS.finalName)}
        <input class="ps-in sm" type="number" min="0" max="2000" data-prequal value="${Math.round(PS.prequal)}"> entries</label>
      <label>Final meet no. <input class="ps-in xs" type="text" data-natmeet value="${esc(PS.natMeet)}"></label>
      <span class="note">HP Squad athletes plus any residual needed to reconcile to the actual national field. Replace it with the true squad number when you have it and the difference becomes a real check rather than a plug.</span>
    </div>
    <p class="note ps-foot"><b>Read this before quoting a number.</b> Levels tagged observed reconcile to real entry data <b>by construction</b> at the calibrated baseline &mdash; that is a decomposition, not an independent test. Move off the baseline and the difference column becomes the structural effect you are simulating. Levels tagged no data are projected from the rules alone.</p>
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
        <button class="ps-btn" id="psReport">Committee report</button>
        <button class="ps-btn" id="psCsv">Export CSV</button>
      </div>
    </div>
  </div>`;
}

/* ==========================================================================
   SCENARIO COMPARISON
   --------------------------------------------------------------------------
   Computes several saved scenarios against the same season, pools and frozen
   calibration, so the only thing differing between columns is the scenario.
   State is swapped in and out around each computation; the swap is wrapped in
   try/finally because a throw mid-compare would otherwise leave the live tab
   showing another scenario's structure under the current scenario's name.
   ========================================================================== */

/* Structure refs are never mutated in place, so they can be held by reference.
   The editable cards ARE mutated by the UI, so they are deep copied. */
function snapshotState(){
  return {
    regions:PS.regions, assign:PS.assign, levels:PS.levels,
    finalName:PS.finalName, boundaryId:PS.boundaryId, boundaryName:PS.boundaryName,
    fees:   JSON.parse(JSON.stringify(PS.fees   || [])),
    flow:   JSON.parse(JSON.stringify(PS.flow   || [])),
    synchro:JSON.parse(JSON.stringify(PS.synchro|| [])),
    senior: JSON.parse(JSON.stringify(PS.senior || [])),
    prices: Object.assign({}, PS.prices),
    mElast: Object.assign({}, PS.mElast),
    eElast: Object.assign({}, PS.eElast),
    sElast: Object.assign({}, PS.sElast),
    levy:PS.levy, lateRate:PS.lateRate, prequal:PS.prequal, year:PS.year,
    cal:PS.cal,
  };
}
function restoreState(s){
  // Deep copy the mutable cards on the way back out. The snapshot is restored
  // once per comparison column, so handing back the same array objects each
  // time would let one column's edits alias into the next.
  Object.assign(PS, s, {
    fees:   JSON.parse(JSON.stringify(s.fees   || [])),
    flow:   JSON.parse(JSON.stringify(s.flow   || [])),
    synchro:JSON.parse(JSON.stringify(s.synchro|| [])),
    senior: JSON.parse(JSON.stringify(s.senior || [])),
    prices: Object.assign({}, s.prices),
    mElast: Object.assign({}, s.mElast),
    eElast: Object.assign({}, s.eElast),
    sElast: Object.assign({}, s.sElast),
  });
}

/* Install a saved payload's price cards, padding or trimming to the structure
   it is being applied to. A scenario saved against 12 regions and replayed
   against 9 must not read fees off the end of its own array. */
function applyCards(d){
  const NL = levelCount();
  const df = defaultFees(NL), dfl = defaultFlow(NL), ds = defaultSynchro(NL);
  PS.fees = df.map((f,i) => {
    const k = d.fees && d.fees[i];
    return {name: feeRowName(i, NL, f.name), qual: k ? +k.qual : f.qual, non: k ? +k.non : f.non};
  });
  PS.flow = dfl.map((f,i) => {
    const k = d.flow && d.flow[i];
    return k ? {advance:+k.advance||0, direct:+k.direct||0, add:+k.add||0,
                byCell: k.byCell ? JSON.parse(JSON.stringify(k.byCell)) : {}} : f;
  });
  if (PS.flow.length) PS.flow[PS.flow.length-1].advance = 0;
  PS.synchro = ds.map((x,i) => (d.synchro && d.synchro[i]) ? Object.assign({}, x, d.synchro[i]) : x);
  if (d.senior && d.senior.length) PS.senior = JSON.parse(JSON.stringify(d.senior));
  PS.prices = Object.assign({}, d.prices||{});
  PS.mElast = Object.assign({}, d.mElast||{});
  PS.eElast = Object.assign({}, d.eElast||{});
  PS.sElast = Object.assign({}, d.sElast||{});
  if (d.levy != null) PS.levy = +d.levy;
  if (d.lateRate != null) PS.lateRate = +d.lateRate;
  if (d.prequal != null) PS.prequal = +d.prequal;
}

function columnFor(name, current){
  const r = computeRevenue(true);
  const nat = CODES.reduce((s,c)=>s+(r.V.final[c]||0),0);
  const stops = [];
  for (let L=0; L<levelCount(); L++) stops.push(groupCountAt(L));
  return {
    name, current,
    structure: PS.boundaryName, regions: PS.regions.length, stops,
    totalStops: structureStops(),
    net:r.net, gross:r.gross, levy:r.levyTotal,
    memberRev:r.memberRev, feeRev:r.eventRev + r.seniorRev,
    entries:r.allEntries, chargeable:r.chargeable,
    national:nat, perLevel:r.perLevel.map(p=>({name:p.name, entries:p.entries, stops:p.stops, net:p.net})),
    final:Object.assign({}, r.V.final),
  };
}

/* Compute the current scenario plus every loaded comparison, all against the
   same frozen calibration. Never mutates persistent state on exit. */
function computeCompare(){
  const saved = snapshotState();
  const cols = [];
  try {
    cols.push(columnFor(PS.scenarioName.trim() || 'Current (unsaved)', true));
    (PS.compare||[]).forEach(c => {
      // Every column starts from the live state. Without this reset a scenario
      // that carries no structure of its own would silently inherit whichever
      // structure the previous column installed.
      restoreState(saved);
      if (c.boundary && c.boundary.regions && c.boundary.regions.length){
        PS.regions = c.boundary.regions; PS.assign = c.boundary.assign;
        PS.levels = c.boundary.levels;   PS.finalName = c.boundary.finalName;
        PS.boundaryName = c.boundary.name;
      }
      applyCards(c.payload || {});
      cols.push(columnFor(c.name, false));
    });
  } finally {
    restoreState(saved);
  }
  return cols;
}

async function addCompare(id){
  if ((PS.compare||[]).some(c => c.id === id)) { msg('Already in the comparison.'); return; }
  if ((PS.compare||[]).length >= 3){ msg('Three comparison scenarios is the maximum.'); return; }
  try {
    const r = await NEON.query(`SELECT name, data FROM membership.pricing_scenarios WHERE id=$1`, [id]);
    if (!r.rows.length){ msg('Scenario not found.'); return; }
    const d = typeof r.rows[0].data === 'string' ? JSON.parse(r.rows[0].data) : r.rows[0].data;
    let boundary = null;
    if (d.boundaryId){
      try {
        const b = await NEON.query(`SELECT name, data FROM membership.boundary_scenarios WHERE id=$1`, [d.boundaryId]);
        if (b.rows.length){
          const bd = typeof b.rows[0].data === 'string' ? JSON.parse(b.rows[0].data) : b.rows[0].data;
          boundary = {name:b.rows[0].name, regions:bd.regions||[], assign:bd.assign||{},
                      levels:(bd.levels&&bd.levels.length)?bd.levels:defaultLevels((bd.regions||[]).length||12),
                      finalName:bd.finalName||'Junior Nationals'};
        }
      } catch(e){ console.warn('compare boundary', e); }
    }
    PS.compare = PS.compare || [];
    PS.compare.push({id, name:r.rows[0].name, payload:d, boundary});
    render();
  } catch(e){ console.error(e); msg('Could not add: ' + (e.message||e)); }
}
function removeCompare(id){
  PS.compare = (PS.compare||[]).filter(c => c.id !== id);
  render();
}

function renderCompare(){
  const cols = computeCompare();
  const opts = (PS.sList||[]).filter(x => !(PS.compare||[]).some(c=>c.id===x.id) && x.id !== PS.scenarioId)
    .map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
  if (cols.length < 2){
    return `<div class="card"><div class="card-h"><h3>Scenario comparison</h3>
      <div class="note">Put two or three saved scenarios side by side against the same season and the same frozen calibration.</div></div>
      <div class="card-b">
      <div class="ps-inline" style="margin-top:0;padding-top:0;border:0">
        <label>Add a saved scenario <select id="psAddCmp"><option value="">Choose…</option>${opts}</select></label>
        <span class="note">${opts ? 'Only the scenario differs between columns &mdash; season, member roster and calibration are held constant.' : 'Save a scenario first, then it can be added here.'}</span>
      </div></div></div>`;
  }
  const base = cols[0];
  const head = cols.map(c => `<th class="num">${esc(c.name)}${c.current?' <span class="ps-mark">current</span>':
    `<button class="ps-x" data-rmcmp="${esc(findCmpId(c.name))}" title="Remove">&times;</button>`}</th>`).join('');
  const row = (label, get, fmtF, better) => {
    const vals = cols.map(get);
    return `<tr><td>${label}</td>` + vals.map((v,i) => {
      const d = i===0 ? 0 : v - vals[0];
      const cls = (!better || i===0 || Math.abs(d) < 0.5) ? '' : ((better==='up') === (d>0) ? 'up' : 'down');
      return `<td class="num mono">${fmtF(v)}${i>0 && Math.abs(d)>=0.5 ? `<span class="ps-cd ${cls}">${d>0?'+':''}${fmtF(d)}</span>`:''}</td>`;
    }).join('') + '</tr>';
  };
  const lvlRows = base.perLevel.map((p,li) => row('&nbsp;&nbsp;' + esc(p.name),
      c => (c.perLevel[li] ? c.perLevel[li].entries : 0), v=>fmt(Math.round(v)), null)).join('');

  return `<div class="card"><div class="card-h">
      <h3>Scenario comparison</h3>
      <div class="note">Same season, same member roster, same frozen calibration &mdash; only the scenario differs. Change shown against the first column.</div>
    </div><div class="card-b">
    <table class="ps-tbl ps-cmp"><thead><tr><th>Measure</th>${head}</tr></thead><tbody>
      <tr class="ps-grp"><td colspan="${cols.length+1}">Financial</td></tr>
      ${row('Net retained by USA Diving', c=>c.net, usd1, 'up')}
      ${row('Membership dues', c=>c.memberRev, usd1, 'up')}
      ${row('Entry fees, gross', c=>c.feeRev, usd1, 'up')}
      ${row('DiveMeets pass-through', c=>-c.levy, usd1, 'up')}
      <tr class="ps-grp"><td colspan="${cols.length+1}">Athlete opportunity</td></tr>
      ${row('Field reaching the final', c=>c.national, v=>fmt(Math.round(v)), 'up')}
      ${row('Total chargeable entries', c=>c.chargeable, v=>fmt(Math.round(v)), null)}
      <tr class="ps-grp"><td colspan="${cols.length+1}">Entries by level</td></tr>
      ${lvlRows}
      <tr class="ps-grp"><td colspan="${cols.length+1}">Structure</td></tr>
      ${row('Regions painted', c=>c.regions, v=>fmt(Math.round(v)), null)}
      ${row('Total stops', c=>c.totalStops, v=>fmt(Math.round(v)), null)}
      <tr class="ps-tot"><td>Net per athlete place at the final</td>${cols.map(c=>
        `<td class="num mono">${c.national>0?usd(c.net/c.national):'&mdash;'}</td>`).join('')}</tr>
    </tbody></table>
    <div class="ps-inline">
      <label>Add a saved scenario <select id="psAddCmp"><option value="">Choose…</option>${opts}</select></label>
      <span class="note">The bottom row is the trade-off in one number: what the organisation nets for every athlete place created at the championships. A scenario that raises net revenue while cutting places will show it here.</span>
    </div>
    </div></div>`;
}
function findCmpId(name){
  const c = (PS.compare||[]).find(x => x.name === name);
  return c ? c.id : '';
}

/* ==========================================================================
   ATHLETE / FAMILY COST
   ========================================================================== */
const PATHWAY_PRESETS = {
  ab_full: {label:'Group A/B, full pathway', group:'A', dues:'Competition Athlete (17U)', events:[2,3,3,3]},
  ab_zone: {label:'Group A/B, out at Zones',  group:'A', dues:'Competition Athlete (17U)', events:[2,3,0,0]},
  cd_full: {label:'Group C/D, full pathway',  group:'C', dues:'Competition Athlete (17U)', events:[0,3,3,3]},
  cd_zone: {label:'Group C/D, out at Zones',  group:'C', dues:'Competition Athlete (17U)', events:[0,3,0,0]},
  reg_only:{label:'Regionals only',           group:'A', dues:'Athlete (17U)',             events:[2,0,0,0]},
};
function defaultPathway(){ return {preset:'ab_full', group:'A', dues:'Competition Athlete (17U)', events:[2,3,3,3]}; }

function pathwayCost(useNew){
  const p = PS.pathway, NL = levelCount();
  const df = defaultFees(NL);
  const lines = [];
  let total = 0;
  const duesType = MEMBER_TYPES.find(t => t[0] === p.dues) || MEMBER_TYPES[2];
  const duesBase = duesType[1] + duesType[2];
  const duesNow  = (useNew && PS.prices[duesType[0]] != null ? PS.prices[duesType[0]] : duesType[1]) + duesType[2];
  lines.push({name:duesType[0] + (duesType[2] ? ' (incl. riders)' : ''), n:1, fee:duesNow, cost:duesNow, kind:'dues'});
  total += duesNow;
  for (let L=0; L<=NL; L++){
    const n = Math.max(0, +(p.events[L]||0));
    if (!n) continue;
    // Representative cell for this athlete: springboard first, platform once past Regionals.
    const code = p.group + 'G' + (L===0 ? '1' : 'P');
    const qualifying = isQualifying(L, code);
    const f = useNew ? (qualifying ? PS.fees[L].qual : PS.fees[L].non)
                     : (qualifying ? df[L].qual      : df[L].non);
    lines.push({name:PS.fees[L].name, n, fee:f, cost:n*f, kind:qualifying?'qual':'non'});
    total += n*f;
  }
  return {lines, total, duesBase};
}

function renderAthleteCost(){
  const base = pathwayCost(false), now = pathwayCost(true);
  const NL = levelCount();
  const d = now.total - base.total;
  const presetOpts = Object.entries(PATHWAY_PRESETS).map(([k,v]) =>
    `<option value="${k}"${PS.pathway.preset===k?' selected':''}>${esc(v.label)}</option>`).join('');
  const duesOpts = MEMBER_TYPES.map(t =>
    `<option value="${esc(t[0])}"${PS.pathway.dues===t[0]?' selected':''}>${esc(t[0])}</option>`).join('');
  const evInputs = [];
  for (let L=0; L<=NL; L++){
    evInputs.push(`<label class="ps-ev"><span>${esc(PS.fees[L].name)}</span>
      <input class="ps-in sm" type="number" min="0" max="12" data-ev="${L}" value="${+(PS.pathway.events[L]||0)}"> events</label>`);
  }
  const rows = now.lines.map((l,i) => {
    const b = base.lines[i] || {cost:0};
    return `<tr><td>${esc(l.name)}${l.kind==='non'?' <span class="ps-mark">non-qualifying</span>':''}</td>
      <td class="num">${l.kind==='dues'?'&mdash;':fmt(l.n)}</td>
      <td class="num mono">${usd(l.fee)}</td>
      <td class="num mono">${usd(l.cost)}</td>
      <td class="num">${deltaSpan(l.cost-b.cost)}</td></tr>`;
  }).join('');
  return `<div class="card"><div class="card-h">
      <h3>Cost to the athlete</h3>
      <div class="note">What one athlete&rsquo;s family actually pays to go through the pathway. Entry fees and dues only &mdash; travel, lodging and coaching are not modelled.</div>
    </div><div class="card-b">
    <div class="ps-inline" style="margin-top:0;padding-top:0;border:0">
      <label>Pathway <select id="psPreset">${presetOpts}<option value="custom"${PS.pathway.preset==='custom'?' selected':''}>Custom</option></select></label>
      <label>Membership <select id="psDues">${duesOpts}</select></label>
    </div>
    <div class="ps-evrow">${evInputs.join('')}</div>
    <table class="ps-tbl"><thead><tr>
      <th>Item</th><th class="num">Events</th><th class="num">Unit</th><th class="num">Cost</th><th class="num">vs baseline</th>
    </tr></thead><tbody>${rows}
      <tr class="ps-tot"><td>Total for one athlete</td><td colspan="2"></td>
        <td class="num mono">${usd(now.total)}</td><td class="num">${deltaSpan(d)}</td></tr>
    </tbody></table>
    <p class="note ps-foot">Baseline for this athlete is ${usd(base.total)}. ${Math.abs(d)>=1
      ? `This scenario moves it by <b>${usd1(d)}</b>, or ${(d/base.total*100).toFixed(1)}%.`
      : 'This scenario does not change what the family pays.'}
      A fee rise that looks small at organisation level compounds across a family&rsquo;s season &mdash; an athlete entering three events at four stops pays the increase twelve times over.</p>
    </div></div>`;
}

/* ==========================================================================
   PRINTABLE COMMITTEE REPORT
   Self-contained document opened in its own window, styled for print/PDF.
   Everything it states is recomputed here rather than scraped from the DOM.
   ========================================================================== */
function buildReport(){
  const base = computeRevenue(false), sim = computeRevenue(true);
  const cols = computeCompare();
  const pw = {base:pathwayCost(false), now:pathwayCost(true)};
  const cb = PS.cal || {};
  const drifted = cb.basis && (cb.basis !== PS.boundaryName || cb.regions !== PS.regions.length);
  const nowF = sim.V.final, baseF = PS.baseFinal || {};
  const when = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

  const money = (label, b, n) => `<tr><td>${label}</td><td class="n">${usd(b)}</td><td class="n">${usd(n)}</td>
    <td class="n ${n-b>0?'up':(n-b<0?'dn':'')}">${Math.abs(n-b)<1?'&mdash;':(n-b>0?'+':'')+usd1(n-b)}</td></tr>`;

  const qualRows = GROUPS.map(g => {
    let was=0, now=0;
    GENDERS.forEach(x=>BOARDS.forEach(b=>{ was+=baseF[g+x+b]||0; now+=nowF[g+x+b]||0; }));
    const d = Math.round(now-was);
    return `<tr><td>Group ${g}</td><td class="n">${fmt(Math.round(was))}</td><td class="n">${fmt(Math.round(now))}</td>
      <td class="n ${d>0?'up':(d<0?'dn':'')}">${d===0?'&mdash;':(d>0?'+':'')+fmt(d)}</td></tr>`;
  }).join('');
  let tW=0,tN=0; CODES.forEach(c=>{tW+=baseF[c]||0;tN+=nowF[c]||0;});

  const lvlRows = sim.perLevel.map((p,i) => `<tr>
    <td>${esc(p.name)} <span class="tag">${p.source}</span></td>
    <td class="n">${fmt(p.stops)}</td><td class="n">${fmt(Math.round(p.entries))}</td>
    <td class="n">${usd(PS.fees[i].qual)}</td><td class="n">${usd(p.rev)}</td>
    <td class="n">${usd(p.levy)}</td><td class="n">${usd(p.net)}</td></tr>`).join('');

  const cmpBlock = cols.length < 2 ? '' : `
    <h2>Scenario comparison</h2>
    <table><thead><tr><th>Measure</th>${cols.map(c=>`<th class="n">${esc(c.name)}</th>`).join('')}</tr></thead><tbody>
      <tr><td>Net retained</td>${cols.map(c=>`<td class="n">${usd(c.net)}</td>`).join('')}</tr>
      <tr><td>Entry fees, gross</td>${cols.map(c=>`<td class="n">${usd(c.feeRev)}</td>`).join('')}</tr>
      <tr><td>DiveMeets pass-through</td>${cols.map(c=>`<td class="n">&minus;${usd(c.levy)}</td>`).join('')}</tr>
      <tr><td>Field reaching the final</td>${cols.map(c=>`<td class="n">${fmt(Math.round(c.national))}</td>`).join('')}</tr>
      <tr><td>Total stops</td>${cols.map(c=>`<td class="n">${fmt(c.totalStops)}</td>`).join('')}</tr>
      <tr class="tot"><td>Net per athlete place at the final</td>${cols.map(c=>
        `<td class="n">${c.national>0?usd(c.net/c.national):'&mdash;'}</td>`).join('')}</tr>
    </tbody></table>`;

  const pwRows = pw.now.lines.map((l,i)=>`<tr><td>${esc(l.name)}</td><td class="n">${l.kind==='dues'?'&mdash;':fmt(l.n)}</td>
    <td class="n">${usd(l.fee)}</td><td class="n">${usd(l.cost)}</td></tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>USA Diving — Pricing Scenario Report</title>
<style>
  @page{margin:16mm}
  *{box-sizing:border-box}
  body{font-family:Inter,system-ui,Arial,sans-serif;color:#13213a;margin:0;font-size:11px;line-height:1.5}
  .hd{background:#171F69;color:#fff;padding:20px 24px;border-bottom:5px solid #E31937}
  .hd h1{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:30px;margin:0;letter-spacing:.04em;text-transform:uppercase}
  .hd p{margin:5px 0 0;color:#cfe3ff;font-size:11px}
  .wrap{padding:20px 24px 30px}
  h2{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:19px;text-transform:uppercase;letter-spacing:.04em;
     color:#171F69;margin:22px 0 8px;border-bottom:2px solid #d8e0ec;padding-bottom:4px}
  h2:first-child{margin-top:0}
  table{width:100%;border-collapse:collapse;margin-bottom:6px}
  th{background:#f8fafc;color:#171F69;font-size:9px;text-transform:uppercase;letter-spacing:.06em;
     text-align:left;padding:6px 7px;border-bottom:1px solid #d8e0ec}
  td{padding:5px 7px;border-bottom:1px solid #eef2f7}
  .n{text-align:right;font-family:'JetBrains Mono',Menlo,monospace;font-size:10px}
  th.n{text-align:right}
  .up{color:#15803d;font-weight:700}.dn{color:#E31937;font-weight:700}
  tr.tot td{background:#f4f8fd;font-weight:800;border-top:2px solid #171F69}
  .tag{font-size:8px;text-transform:uppercase;letter-spacing:.06em;background:#eef2f7;color:#475569;
       padding:1px 5px;border-radius:8px;margin-left:4px}
  .kpis{display:flex;gap:10px;margin-bottom:6px;flex-wrap:wrap}
  .k{flex:1;min-width:120px;border:1px solid #d8e0ec;border-left:4px solid #171F69;border-radius:8px;padding:9px 11px}
  .k b{display:block;font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;color:#667085;font-weight:800}
  .k span{font-family:'Barlow Condensed',Arial Narrow,sans-serif;font-size:22px;color:#171F69}
  .note{font-size:9.5px;color:#667085;line-height:1.55}
  .warn{background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #b45309;padding:8px 11px;
        border-radius:7px;font-size:9.5px;color:#5c3a05;margin-bottom:8px}
  .foot{margin-top:22px;padding-top:9px;border-top:1px solid #d8e0ec;font-size:8.5px;color:#667085}
</style></head><body>
<div class="hd"><h1>Pricing Scenario Report</h1>
  <p>${esc(PS.scenarioName.trim()||'Unnamed scenario')} &middot; structure: ${esc(PS.boundaryName)}
     &middot; season ${yearNum()}${PS.year==='y26'?' (year to date)':''} &middot; prepared ${when}</p></div>
<div class="wrap">

<h2>Headline</h2>
<div class="kpis">
  <div class="k"><b>Net retained</b><span>${usd(sim.net)}</span></div>
  <div class="k"><b>Membership dues</b><span>${usd(sim.memberRev)}</span></div>
  <div class="k"><b>Entry fees, gross</b><span>${usd(sim.eventRev+sim.seniorRev)}</span></div>
  <div class="k"><b>DiveMeets pass-through</b><span>&minus;${usd(sim.levyTotal)}</span></div>
  <div class="k"><b>Field at the final</b><span>${fmt(Math.round(tN))}</span></div>
</div>
<table><thead><tr><th>Revenue line</th><th class="n">Baseline</th><th class="n">Scenario</th><th class="n">Change</th></tr></thead>
<tbody>
  ${money('Membership dues', base.memberRev, sim.memberRev)}
  ${money('Junior circuit entry fees', base.eventRev, sim.eventRev)}
  ${money('Senior circuit entry fees', base.seniorRev, sim.seniorRev)}
  ${money('DiveMeets pass-through', -base.levyTotal, -sim.levyTotal)}
  <tr class="tot"><td>Net retained by USA Diving</td><td class="n">${usd(base.net)}</td>
    <td class="n">${usd(sim.net)}</td>
    <td class="n ${sim.net-base.net>0?'up':(sim.net-base.net<0?'dn':'')}">${Math.abs(sim.net-base.net)<1?'&mdash;':(sim.net-base.net>0?'+':'')+usd1(sim.net-base.net)}</td></tr>
</tbody></table>
<p class="note">Baseline is the published ${yearNum()} fee card applied to this same structure, so the change column isolates the pricing decision from the structural one.
$${PS.levy.toFixed(2)} of every event entry goes to DiveMeets as the scoring platform, charged once per synchro team rather than once per diver. It is a flat amount, so it takes ${(PS.levy/45*100).toFixed(1)}% of a $45 non-qualifying entry against ${(PS.levy/125*100).toFixed(1)}% of a $125 national entry.</p>

<h2>By level</h2>
<table><thead><tr><th>Level</th><th class="n">Stops</th><th class="n">Entries</th><th class="n">Qual. fee</th>
  <th class="n">Gross</th><th class="n">DiveMeets</th><th class="n">Net</th></tr></thead><tbody>${lvlRows}</tbody></table>

<h2>Athlete opportunity</h2>
<table><thead><tr><th>Age group</th><th class="n">Baseline field</th><th class="n">Scenario field</th><th class="n">Change</th></tr></thead>
<tbody>${qualRows}
  <tr class="tot"><td>All events</td><td class="n">${fmt(Math.round(tW))}</td><td class="n">${fmt(Math.round(tN))}</td>
  <td class="n ${tN-tW>0?'up':(tN-tW<0?'dn':'')}">${Math.round(tN-tW)===0?'&mdash;':(tN-tW>0?'+':'')+fmt(Math.round(tN-tW))}</td></tr>
</tbody></table>
<p class="note">The size of the field reaching ${esc(PS.finalName)} is set by the number of stops and the direct-qualifying places at each one, not by how many advance between levels. Advancement caps change the size of the intermediate fields, and therefore meet-day load and entry revenue, without changing how many athletes reach the championships.</p>

<h2>Cost to one athlete</h2>
<table><thead><tr><th>Item</th><th class="n">Events</th><th class="n">Unit</th><th class="n">Cost</th></tr></thead>
<tbody>${pwRows}
  <tr class="tot"><td>Total, ${esc((PATHWAY_PRESETS[PS.pathway.preset]||{label:'custom pathway'}).label)}</td>
  <td colspan="2"></td><td class="n">${usd(pw.now.total)}</td></tr>
</tbody></table>
<p class="note">Baseline for the same athlete is ${usd(pw.base.total)}. Entry fees and membership dues only; travel, lodging and coaching are excluded.</p>
${cmpBlock}

<h2>Basis and limitations</h2>
${drifted ? `<div class="warn"><b>This scenario is off the calibrated baseline.</b> Flow constants were derived from ${esc(cb.basis)} (${fmt(cb.regions)} regions, ${esc(cb.year||yearNum())}) and held fixed while simulating ${esc(PS.boundaryName)} (${fmt(PS.regions.length)} regions). Holding them fixed is deliberate: re-deriving them per scenario would let the residual absorb the structural change and every scenario would falsely appear to have no effect.</div>` : ''}
<p class="note">
<b>Observed.</b> Regional entry volumes come from competition results joined to the membership roster by county, so they are exact for the map as drawn. Senior entry counts come from the live DiveMeets sync. The national field is anchored on ${PS.natSource==='live' ? `the live entry count for meet ${esc(PS.natMeet)}${PS.natFetched?', fetched '+esc(PS.natFetched):''}` : `a 28 July 2026 snapshot of ${fmt(NAT_FALLBACK_2026)} entries taken while signup was still open, because meet ${esc(PS.natMeet)} has no synced count`}.<br>
<b>Reconstructed.</b> Zone volumes are rebuilt as advancement out of Regionals, plus athletes clearing the average 15th-place score, plus the cohort entering the circuit at Zones. This ties to the observed Zone field exactly at the calibrated baseline by construction, and is therefore a decomposition rather than an independent test.<br>
<b>Modelled.</b> East/West/Central and ${esc(PS.finalName)} volumes are derived from the advancement rules, because no structure other than the one actually run has real results behind it.<br>
<b>Assumptions.</b> Volume responses to price are the elasticity figures entered on the pricing screen, expressed as percentage of volume lost per 10% price increase; where these are zero the model holds volume fixed and reports pure price arithmetic. Membership counts are the live roster for ${yearNum()}${PS.year==='y26'?', which is a year-to-date figure and not directly comparable to a completed season':''}. Costs of delivery are not modelled: this is a revenue view only.
</p>
<div class="foot">USA Diving Pricing Studio &middot; generated ${when} &middot; figures recomputed at generation time from the live membership roster and competition results.</div>
</div></body></html>`;
}

function openReport(){
  const w = window.open('', '_blank');
  if (!w){ msg('Allow pop-ups for this site to open the report.'); return; }
  w.document.open();
  w.document.write(buildReport());
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch(e){} }, 350);
}

/* ---------- sections ----------
   Eight cards, nine tables and 85 inputs on one scroll is too much to hand
   someone in a meeting. Split into tabs rather than collapsible panels: a
   collapsed section is a hidden control, and the people using this should not
   have to discover anything. The summary band and the legend stay put across
   all four, because those are the numbers you are steering by. */
const SECTIONS = [
  ['prices',   'Prices',  'What we charge, and what it brings in'],
  ['athletes', 'Athletes', 'Who gets to compete, and what it costs them'],
  ['compare',  'Compare',  'Scenarios side by side'],
  ['basis',    'Basis',    'Structure, and where every number came from'],
];
function renderSectionBar(){
  return '<div class="ps-sections">' + SECTIONS.map(([k,label,hint]) =>
    `<button class="ps-sec ${PS.section===k?'on':''}" data-sec="${k}">
       <b>${label}</b><span>${hint}</span></button>`).join('') + '</div>';
}

/* ---------- one provenance vocabulary ----------
   These tags accumulated one at a time -- observed, calibrated, modelled,
   derived, measured, live, rule, by hand, roster held, needs a number -- and
   individually each was reasonable. Eleven phrasings across one screen is not
   scannable. Five canonical states, one fixed colour each, explained once in a
   legend; the specifics move into the row detail where they already live. */
const PROV = {
  measured:      ['measured',      'Counted from real entry or results data.'],
  reconstructed: ['reconstructed', 'Rebuilt from the rules, and ties to real data at the calibrated baseline.'],
  modelled:      ['modelled',      'Follows the rules alone. No results behind it.'],
  entered:       ['entered',       'A figure someone typed in.'],
  missing:       ['missing',       'No number supplied yet.'],
};
function prov(kind, detail){
  const p = PROV[kind] || PROV.missing;
  return `<span class="ps-tag ${kind}" title="${esc(p[1])}">${p[0]}` +
         (detail ? ` <span class="ps-tagd">${detail}</span>` : '') + '</span>';
}
function provLegend(){
  return '<div class="ps-legend">' +
    Object.keys(PROV).map(k =>
      `<span class="ps-lg"><span class="ps-tag ${k}">${PROV[k][0]}</span>${esc(PROV[k][1])}</span>`).join('') +
    '</div>';
}

/* Keeping your place across a redraw now lives in shared/usad-keepplace.js --
   this was the first of three identical fixes in one day. */

function render(){
  const host = document.getElementById('viewPricing');
  if (!host) return;
  const place = keepPlace('viewPricing');
  if (PS.err){
    host.innerHTML = `<div class="card"><div class="card-b"><p><b>Pricing Studio could not load.</b></p>
      <p class="note mono">${esc(PS.err)}</p></div></div>`;
    return;
  }
  if (!PS.ready){ host.innerHTML = '<div class="loading">Loading pricing model&hellip;</div>'; return; }

  const base = computeRevenue(false);
  const sim  = computeRevenue(true);

  const body =
      PS.section==='prices'   ? renderMemberPrices(base, sim) + renderEventFees(base, sim) + renderSenior(base, sim)
    : PS.section==='athletes' ? renderQualification(sim) + renderAthleteCost()
    : PS.section==='compare'  ? renderCompare()
    :                           renderStructure(sim) + renderPathwayMoney() + renderCalibration(sim);

  host.innerHTML =
    renderScenarioBar() +
    renderSummary(base, sim) +
    renderSectionBar() +
    provLegend() +
    body;

  wire();
  keepRestore(place, 'viewPricing');
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
  host.querySelectorAll('input[data-sfee]').forEach(el => el.addEventListener('change', e => {
    PS.senior[+e.target.dataset.sfee].fee = Math.max(0, +e.target.value||0); PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-smanual]').forEach(el => el.addEventListener('change', e => {
    PS.senior[+e.target.dataset.smanual].manual = Math.max(0, Math.round(+e.target.value||0)); PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-smansyn]').forEach(el => el.addEventListener('change', e => {
    PS.senior[+e.target.dataset.smansyn].manualSyn = Math.max(0, Math.round(+e.target.value||0)); PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-pq]').forEach(el => el.addEventListener('change', e => {
    PS.prequalPaths[+e.target.dataset.pq] = Math.max(0, Math.round(+e.target.value||0)); PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-suse]').forEach(el => el.addEventListener('change', e => {
    PS.senior[+e.target.dataset.suse].useManual = e.target.checked; PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-smeet]').forEach(el => el.addEventListener('change', async e => {
    PS.senior[+e.target.dataset.smeet].meet = String(e.target.value||'').trim();
    PS.dirty=true; await loadSeniorEntries(); render();
  }));
  host.querySelectorAll('button[data-grid]').forEach(el => el.addEventListener('click', e => {
    const L = +e.currentTarget.dataset.grid;
    PS.openGrid = (PS.openGrid === L) ? null : L; render();
  }));
  host.querySelectorAll('input[data-cell]').forEach(el => el.addEventListener('change', e => {
    const L = +e.target.dataset.cl, c = e.target.dataset.cell;
    const v = clamp(Math.round(+e.target.value||0), 0, 99);
    const f = PS.flow[L];
    f.byCell = f.byCell || {};
    if (v === f.advance) delete f.byCell[c];
    else f.byCell[c] = Object.assign({}, f.byCell[c], {advance:v});
    PS.dirty=true; render();
  }));
  host.querySelectorAll('button[data-clear]').forEach(el => el.addEventListener('click', e => {
    PS.flow[+e.currentTarget.dataset.clear].byCell = {}; PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-syt]').forEach(el => el.addEventListener('change', e => {
    PS.synchro[+e.target.dataset.syt].teams = Math.max(0, Math.round(+e.target.value||0)); PS.dirty=true; render();
  }));
  host.querySelectorAll('input[data-syf]').forEach(el => el.addEventListener('change', e => {
    PS.synchro[+e.target.dataset.syf].fee = Math.max(0, +e.target.value||0); PS.dirty=true; render();
  }));

  const lv = host.querySelector('input[data-levy]');
  if (lv) lv.addEventListener('change', e => { PS.levy = Math.max(0, +e.target.value||0); PS.dirty=true; render(); });

  const nm2 = host.querySelector('input[data-natmeet]');
  if (nm2) nm2.addEventListener('change', async e => {
    PS.natMeet = String(e.target.value||'').trim();
    await loadNationalActual(); calibratePrequal(); snapshotBaseline(); PS.dirty=true; render();
  });

  const qc = host.querySelector('input[data-qcut]');
  if (qc) qc.addEventListener('change', e => { PS.qualCutoff = clamp(Math.round(+e.target.value||0),0,60); PS.dirty=true; render(); });

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
    await loadCounts(); await loadNationalActual(); deriveCalibration(); calibratePrequal(); snapshotBaseline(); render();
  }));

  const nm = host.querySelector('#psName');
  if (nm) nm.addEventListener('change', e => { PS.scenarioName = e.target.value; });

  const sv = host.querySelector('#psSave');   if (sv) sv.addEventListener('click', saveScenario);
  const ld = host.querySelector('#psLoad');   if (ld) ld.addEventListener('change', e => { if (e.target.value) loadScenario(e.target.value); });
  const rs = host.querySelector('#psReset');  if (rs) rs.addEventListener('click', resetPrices);
  const cx = host.querySelector('#psCsv');    if (cx) cx.addEventListener('click', exportCsv);
  const rp = host.querySelector('#psReport'); if (rp) rp.addEventListener('click', openReport);

  host.querySelectorAll('button[data-sec]').forEach(el => el.addEventListener('click', e => {
    PS.section = e.currentTarget.dataset.sec;
    render();
    // A section change is a deliberate move, not an edit, so go to the top of
    // the new section rather than restoring the old scroll offset.
    try { window.scrollTo(0, 0); } catch(err){}
  }));

  const ac = host.querySelector('#psAddCmp');
  if (ac) ac.addEventListener('change', e => { if (e.target.value) addCompare(e.target.value); });
  host.querySelectorAll('button[data-rmcmp]').forEach(el => el.addEventListener('click', e =>
    removeCompare(e.currentTarget.dataset.rmcmp)));

  const pp = host.querySelector('#psPreset');
  if (pp) pp.addEventListener('change', e => {
    const k = e.target.value;
    if (k !== 'custom' && PATHWAY_PRESETS[k]){
      const p = PATHWAY_PRESETS[k];
      PS.pathway = {preset:k, group:p.group, dues:p.dues, events:p.events.slice()};
    } else { PS.pathway.preset = 'custom'; }
    render();
  });
  const pd = host.querySelector('#psDues');
  if (pd) pd.addEventListener('change', e => { PS.pathway.dues = e.target.value; render(); });
  host.querySelectorAll('input[data-ev]').forEach(el => el.addEventListener('change', e => {
    const L = +e.target.dataset.ev;
    PS.pathway.events[L] = clamp(Math.round(+e.target.value||0), 0, 12);
    PS.pathway.preset = 'custom';
    render();
  }));
}

function resetPrices(){
  PS.prices = {}; PS.mElast = {}; PS.eElast = {}; PS.sElast = {}; PS.lateRate = 0;
  PS.levy = DIVEMEETS_LEVY;
  PS.senior = defaultSenior(); PS.prequalPaths = {};
  PS.synchro = defaultSynchro(levelCount());
  PS.openGrid = null;
  PS.pathway = defaultPathway();
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
    prices:PS.prices, mElast:PS.mElast, eElast:PS.eElast, sElast:PS.sElast,
    senior:PS.senior, levy:PS.levy, synchro:PS.synchro, pathway:PS.pathway, natMeet:PS.natMeet, qualCutoff:PS.qualCutoff,
    prequalPaths:PS.prequalPaths,
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
    PS.prices = d.prices||{}; PS.mElast = d.mElast||{}; PS.eElast = d.eElast||{}; PS.sElast = d.sElast||{};
    if (d.senior && d.senior.length){ PS.senior = d.senior; await loadSeniorEntries(); }
    if (d.prequalPaths) PS.prequalPaths = d.prequalPaths;
    if (d.qualCutoff != null) PS.qualCutoff = +d.qualCutoff;
    if (d.levy != null) PS.levy = +d.levy;
    if (d.synchro && d.synchro.length) PS.synchro = d.synchro;
    if (d.pathway && d.pathway.events) PS.pathway = d.pathway;
    if (d.natMeet) { PS.natMeet = d.natMeet; await loadNationalActual(); }
    // NB: deliberately no snapshotBaseline() here. baseFinal is the calibrated
    // baseline field; re-taking it after applying a scenario would make the
    // scenario its own baseline and every qualification delta would read zero.
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
  L.push('divemeets levy per entry,' + PS.levy.toFixed(2));
  L.push('');
  L.push('section,item,volume,current_price,simulated_price,gross,divemeets_levy,net,baseline_net,delta_net,provenance');
  sim.perType.forEach((t,i) => L.push(['membership', q(t.name), t.n0, t.baseP, t.newP,
    Math.round(t.rev), 0, Math.round(t.rev), Math.round(base.perType[i].rev),
    Math.round(t.rev-base.perType[i].rev), 'live roster'].join(',')));
  const df = defaultFees(levelCount());
  sim.perLevel.forEach((p,i) => L.push(['junior event', q(p.name), Math.round(p.entries),
    df[i] ? df[i].qual : '', PS.fees[i].qual,
    Math.round(p.rev), Math.round(p.levy), Math.round(p.net),
    Math.round(base.perLevel[i].net), Math.round(p.net-base.perLevel[i].net), p.source].join(',')));
  sim.perSenior.forEach((p,i) => L.push(['senior event', q(p.name + ' (meet ' + p.meet + ')'),
    Math.round(p.entries), 125, p.fee,
    Math.round(p.rev), Math.round(p.levy), Math.round(p.net),
    Math.round(base.perSenior[i].net), Math.round(p.net-base.perSenior[i].net), p.source].join(',')));
  L.push('');
  L.push(['TOTAL','',Math.round(sim.allEntries),'','',
    Math.round(sim.gross), Math.round(sim.levyTotal), Math.round(sim.net),
    Math.round(base.net), Math.round(sim.net-base.net),''].join(','));
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
  PS, CODES, computeVolume, computeVolumeFromRouting, computeRevenue, allocate, isQualifying,
  bootstrap, applyBoundary, resizeCards, defaultRegions, defaultLevels,
  defaultFees, defaultFlow, calibratePrequal, totalCells, deriveCalibration,
  defaultSenior, loadSeniorEntries, DIVEMEETS_LEVY, defaultSynchro, loadNationalActual, natActual,
  SENIOR_PREQUAL, loadSeniorPrequal,
  advanceFor, directFor, snapshotBaseline,
  computeCompare, snapshotState, restoreState, applyCards, pathwayCost, buildReport, defaultPathway,
};

/* ==========================================================================
   SHARED FLOW API
   --------------------------------------------------------------------------
   Boundary Studio needs the same "who actually moves up" maths this module
   already carries. Exposing it rather than reimplementing keeps one answer to
   the question -- the previous Boundary advancement panel was withdrawn
   precisely because it did its own arithmetic on hand-entered spot counts,
   with no field-size cap and no take-up, and could not be reconciled against
   real entries.

   Calibration is cached per season and always derived on the alignment that
   season was actually run under, never on whatever map the user is currently
   painting. Deriving on the painted map would let the residual absorb the
   change and every redrawn boundary would falsely appear to move nothing.
   ========================================================================== */
const FLOW = { calByYear:{}, baseline:null, dataReady:false };

async function ensureFlowData(){
  if (!PS.adv){
    const [adv, age] = await Promise.all([loadJson('advance-data.json'), loadJson('age-data.json')]);
    PS.adv = adv; PS.age = age;
  }
  if (!FLOW.baseline){
    // The alignment actually run: the reference scenario, or a stock 12/6/3.
    let base = null;
    try {
      await loadBoundaryList();
      const seed = (PS.bList||[]).find(b => /2026 Alignment/i.test(b.name));
      if (seed){
        const r = await NEON.query(`SELECT name, data FROM membership.boundary_scenarios WHERE id=$1`, [seed.id]);
        if (r.rows.length){
          const d = typeof r.rows[0].data === 'string' ? JSON.parse(r.rows[0].data) : r.rows[0].data;
          base = {name:r.rows[0].name, regions:d.regions||defaultRegions(12), assign:d.assign||{},
                  levels:(d.levels&&d.levels.length)?d.levels:defaultLevels((d.regions||[]).length||12),
                  finalName:d.finalName||'Junior Nationals'};
        }
      }
    } catch(e){ console.warn('flow baseline', e); }
    // A stock structure with no county assignment cannot produce take-up: every
    // area is empty, nothing advances, and every constant computes as exactly 1.
    // That looks like "no athletes drop out" rather than "we could not measure",
    // so it is flagged rather than left to be inferred.
    FLOW.baseline = base || {name:'Default 12 / 6 / 3', regions:defaultRegions(12), assign:{},
                             levels:defaultLevels(12), finalName:'Junior Nationals',
                             fallback:true};
  }
  FLOW.dataReady = true;
  return true;
}

function calForYear(y){
  if (FLOW.calByYear[y]) return FLOW.calByYear[y];
  const saved = snapshotState();
  try {
    const b = FLOW.baseline;
    PS.regions = b.regions; PS.assign = b.assign; PS.levels = b.levels;
    PS.finalName = b.finalName; PS.boundaryName = b.name; PS.year = y;
    resizeCards();
    PS.flow = defaultFlow(levelCount());
    deriveCalibration();
    FLOW.calByYear[y] = PS.cal;
  } finally { restoreState(saved); }
  return FLOW.calByYear[y];
}

/* Compute the junior flow for an arbitrary structure without disturbing the
   Pricing Studio's own state. */
function computeFlowFor(struct){
  const saved = snapshotState();
  try {
    const y = (struct.year === 'y25' || struct.year === 'y26') ? struct.year : PS.year;
    const cal = calForYear(y);
    PS.regions = struct.regions || PS.regions;
    PS.assign  = struct.assign  || PS.assign;
    PS.levels  = (struct.levels && struct.levels.length) ? struct.levels : PS.levels;
    PS.finalName = struct.finalName || PS.finalName;
    PS.year = y;
    resizeCards();
    PS.flow = struct.flow ? struct.flow : defaultFlow(levelCount());
    PS.cal = cal;
    PS.prequal = 0;               // caller wants the flow itself, not the HP top-up
    return computeVolume();
  } finally { restoreState(saved); }
}

window.JuniorFlow = {
  ready: ensureFlowData,
  compute: computeFlowFor,
  /* The frozen take-up constants for a season, so another module can project a
     different pathway against the same measured behaviour rather than
     re-deriving it (and re-deriving it on a painted map is exactly the mistake
     that makes every hypothetical look like it changed nothing). */
  constants: (y) => {
    const cal = calForYear((y === 'y25' || y === 'y26') ? y : PS.year);
    const levels = (cal.levels || []).map(k => ({conv: Object.assign({}, k.conv),
                                                 directAt: Object.assign({}, k.directAt)}));
    // Constants that are all exactly 1 are not measured behaviour, they are the
    // absence of it. A caller applying them would be applying nothing while
    // believing otherwise.
    const moved = levels.some(lv => Object.keys(lv.conv||{})
                    .some(c => Math.abs((lv.conv[c] ?? 1) - 1) > 0.01));
    return {levels, observedAt: (cal.observedAt || []).slice(),
            basis: cal.basis, year: cal.year, regions: cal.regions,
            fallbackBaseline: !!(FLOW.baseline && FLOW.baseline.fallback),
            usable: moved};
  },
  defaultFlow,
  baseline: () => FLOW.baseline,
  stageForLevel,
  CODES, GROUPS, GENDERS, BOARDS, BOARD_NAME, GENDER_NAME,
  totalCells,
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
