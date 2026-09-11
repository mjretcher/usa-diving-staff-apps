/* Regression tests for the calibration and fee fixes of 2026-09-10/11.
   No network: the engine is loaded in jsdom and driven with a synthetic
   structure and a stubbed calibration. Run: node api/test-calibration.mjs */
import { buildWindow } from './_boundary-money.js';
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  PASS:', msg); } else { fail++; console.log('  FAIL:', msg); } };
const CELLS = ['AB1','AB3','ABP','AG1','AG3','AGP','BB1','BB3','BBP','BG1','BG3','BGP','CB1','CB3','CBP','CG1','CG3','CGP','DB1','DB3','DBP','DG1','DG3','DGP'];

function fresh(levelNames) {
  const { w } = buildWindow(); const I = w.__boundaryInternal, S = I.S;
  S.regions = I.defaultRegions(2);
  S.levels = levelNames.map((name, i) => i === 0 ? { name } : { name, groups: [{ name: name + ' 1' }], of: i === 1 ? [0, 0] : [0] });
  S.routing = null; S.year = 'y26'; S.arrival = null; S.seedPool = 'Test';
  // two regions, one cell each with 20 athletes, so top-15 leaves 15 per region
  S.advData = { pools: { '2026|Test': { '00001': { AG1: 20, CG1: 20 }, '00002': { AG1: 20, CG1: 20 } } } };
  S.assign = { '00001': 0, '00002': 1 };
  S.flow = {}; // readiness gate only
  return { w, I, S };
}

console.log('=== Fix 3: Zone top-3 band must not land in E/W/C when Nationals is not painted ===');
{ const { I, S } = fresh(['Regions','Zones','E / W / C']); I.syncRouting();
  const top3 = S.routing[1].routes.find(r => r.lo === 1 && r.hi === 3);
  ok(!top3, 'top-3 route dropped in a Regions/Zones/E-W-C structure');
  ok(S.routing[1].routes.some(r => r.lo === 4 && r.hi === 18 && r.to.level === 2), '4-18 band still feeds E/W/C'); }
{ const { I, S } = fresh(['Regions','Zones','E / W / C','Nationals']); I.syncRouting();
  const top3 = S.routing[1].routes.find(r => r.lo === 1 && r.hi === 3);
  ok(top3 && top3.to.level === 3, 'top-3 routes to a painted Nationals level when one exists'); }

console.log('=== Fixes 1+2: per-cell conv applied; directAt brought in; explicit entering wins; S.routing untouched ===');
{ const { w, I, S } = fresh(['Regions','Zones','E / W / C']);
  w.JuniorFlow = { constants: () => ({ usable: true, basis: 'test', byStage: {
    Zones: { conv: Object.fromEntries(CELLS.map(c => [c, c === 'AG1' ? 0.5 : c === 'CG1' ? 0 : 1])), directAt: { CG1: 30, AB1: 7 } } } }) };
  I.syncRouting(); S.routing[1].entering = { AB1: 100 }; // explicit hand-specified cohort
  const before = JSON.stringify(S.routing);
  const res = I.projectPathway();
  const QR = w.QualRouting; const at = (c) => QR.entriesCellAt(res, 1, 0, c);
  ok(Math.abs(at('AG1') - 15) < 0.01, 'AG1: 2 regions x top-15 (=30) x per-cell conv 0.5 = 15 (not an averaged rate)');
  ok(Math.abs(at('CG1') - 30) < 0.01, 'CG1: conv 0 removes the routed flow; directAt 30 arrives as entering');
  ok(Math.abs(at('AB1') - 100) < 0.01, 'AB1: explicit entering (100) kept; calibration directAt (7) not added on top');
  ok(JSON.stringify(S.routing) === before, 'S.routing not mutated by calibration-derived entering'); }

console.log('=== Fix 5: Pricing Studio default fee follows the stage, not the position ===');
{ const { w } = buildWindow(); const Ip = w.__pricingInternal; const PS = Ip.PS;
  PS.regions = [{name:'R1'}]; PS.levels = [{ name: 'Zones' }, { name: 'East, West, Central' }, { name: 'National' }]; PS.fees = null; PS.flow = null; PS.synchro = null;
  Ip.resizeCards();
  ok(PS.fees[0].qual === 90 && PS.fees[1].qual === 115, `Zones-first structure: Zones $${PS.fees[0].qual}, E/W/C $${PS.fees[1].qual} (was $85/$90)`);
  PS.levels = [{ name: 'Regions' }, { name: 'Zones' }, { name: 'E / W / C' }]; PS.fees = null; Ip.resizeCards();
  ok(PS.fees[0].qual === 85 && PS.fees[1].qual === 90 && PS.fees[2].qual === 115, 'Region-first structure unchanged: $85/$90/$115'); }

console.log('=== boundary.js feeFor and meetMoney late fee ===');
{ const { I, S } = fresh(['Zones','East, West, Central','National']); S.fees = null; S.hostMode = 'per_entry'; S.hostPer = 25; S.hostMin = 0; S.hostPer_stop = null;
  const m0 = I.meetMoney({ level: 0, entries: 100 });
  ok(m0.fee === 90 && m0.gross === 9000, 'feeFor(0) on a Zones-first structure = $90; gross = entries x fee');
  ok((m0.lateFees || 0) === 0, 'late fees default to 0 (live app unchanged)');
  S.lateFeeShare = 0.1; const m1 = I.meetMoney({ level: 0, entries: 100 });
  ok(m1.lateFees === 1000 && m1.gross === 10000, 'lateFeeShare 0.1 adds 100 x 0.1 x $100 = $1,000'); }

console.log('=== boundary.js feeFor resolves by stage name (Region-first 3-level structure) ===');
{ const { I, S } = fresh(['Regions','Zones','E / W / C']); S.fees = null;
  ok(I.meetMoney({level:0,entries:1}).fee === 85 && I.meetMoney({level:1,entries:1}).fee === 90 && I.meetMoney({level:2,entries:1}).fee === 115,
     'Regions $85 / Zones $90 / E-W-C $115 (was $90/$115/$125 by position)'); }
{ const { I, S } = fresh(['Regions','Zones','Nationals']); S.fees = null;
  ok(I.meetMoney({level:0,entries:1}).fee === 85 && I.meetMoney({level:1,entries:1}).fee === 90 && I.meetMoney({level:2,entries:1}).fee === 125,
     '2025-rules structure: Regions $85 / Zones $90 / Nationals $125'); }
{ const { I, S } = fresh(['Level 1','Level 2','Level 3']); S.fees = null;
  ok(I.meetMoney({level:0,entries:1}).fee === 90 && I.meetMoney({level:2,entries:1}).fee === 125, 'unnamed levels keep the positional fallback'); }

console.log('=== 2026 recap rules: $4.95 per-entry cut, 10% on other fees, Regional $45 non-qualifying tier per cell ===');
{ const { I, S } = fresh(['Regions','Zones','Nationals']); S.fees = null; S.hostMode='per_entry'; S.hostPer=0; S.hostMin=0; S.hostPer_stop=null;
  S.year = 'y26'; let m = I.meetMoney({ level: 1, entries: 100 });
  ok(Math.abs(m.levy - 495) < 0.01, 'y26: DiveMeets cut $4.95 x 100 = $495');
  S.year = 'y25'; m = I.meetMoney({ level: 1, entries: 100 });
  ok(Math.abs(m.levy - 380) < 0.01, 'y25: DiveMeets cut $3.80 x 100 = $380 (Entry Fees.xlsx 2025)');
  S.year = 'y24'; m = I.meetMoney({ level: 1, entries: 100 });
  ok(Math.abs(m.levy - 490) < 0.01, 'other seasons keep the $4.90 default');
  S.year = 'y26'; S.lateFeeShare = 0.1; S.coachLateFeeShare = 0.1; S.sheetChangeShare = 0.1;
  m = I.meetMoney({ level: 1, entries: 100 });
  ok(Math.abs(m.otherFees - (1000 + 500 + 150)) < 0.01 && Math.abs(m.levy - (495 + 165)) < 0.01, 'other fees: $1,000 athlete late + $500 coach late + $150 sheet changes; DiveMeets takes 10% of those ($165) on top of $495');
  S.lateFeeShare = S.coachLateFeeShare = S.sheetChangeShare = 0;
  const events = [{ cell: 'AG1', n: 10 }, { cell: 'CG1', n: 10 }, { cell: 'AGP', n: 10 }];
  m = I.meetMoney({ level: 0, entries: 30, events });
  ok(Math.abs(m.entryIncome - (10*85 + 10*45 + 10*45)) < 0.01, 'Regionals 2026 per cell: A Girls 1M $85, C Girls 1M $45, A Girls platform $45');
  m = I.meetMoney({ level: 1, entries: 30, events });
  ok(Math.abs(m.entryIncome - 30*90) < 0.01, 'the $45 tier applies only at Regionals -- Zones price every cell at $90');
  S.year = 'y25'; m = I.meetMoney({ level: 0, entries: 30, events });
  ok(Math.abs(m.entryIncome - 30*85) < 0.01, 'the $45 tier is 2026-only -- 2025 Regionals price every cell at $85'); }

console.log('=== reconciled basis (S.recapRates): paid uplift, late fees, sheet changes, host share of net by stage ===');
{ const { I, S } = fresh(['Regions','Zones','Nationals']); S.fees = null; S.year = 'y26'; S.hostMode='per_entry'; S.hostPer=25; S.hostMin=0; S.hostPer_stop=null;
  S.recapRates = { Zones: { paidNotCompetedPct: 4.9, lateFeeSharePct: 2.1, avgLateFee: 98, sheetChangePerEntry: 0.47, hostPctOfNet: 36.5 } };
  const m = I.meetMoney({ level: 1, entries: 1000 });
  const paid = 1000 / (1 - 0.049);
  const gross = paid * 90 + paid * 0.021 * 98 + paid * 0.47;
  const levy = paid * 4.95 + (paid * 0.021 * 98 + paid * 0.47) * 0.10;
  ok(Math.abs(m.paidEntries - paid) < 0.01, 'paid entries = competed / (1 - no-show%)');
  ok(Math.abs(m.gross - gross) < 0.01 && Math.abs(m.levy - levy) < 0.01, 'gross and DiveMeets cut computed on paid entries incl. late fees and sheet changes');
  ok(Math.abs(m.host - (m.net * 0.365)) < 0.01 && m.basis === 'recap-2026', 'host = 36.5% of net (recap basis), overriding the $25/entry stored term');
  const m0 = I.meetMoney({ level: 0, entries: 1000 });
  ok(m0.basis === 'model' && Math.abs(m0.host - 25000) < 0.01, 'a stage without recap rates falls back to the stored host terms'); }

console.log('=== 2025 reconciled basis: flat fee, $3.80 cut, 4% card fee, host per entry ===');
{ const { I, S } = fresh(['Regions','Zones','Nationals']); S.fees = null; S.year = 'y25'; S.hostMode='per_entry'; S.hostPer=25; S.hostMin=0; S.hostPer_stop=null;
  S.recapRates = { Regionals: { paidNotCompetedPct: 0, feePerEvent: 85, creditCardPct: 4, diveMeetsPerEntry: 3.80, hostPerEntry: 32.50, lateFeeSharePct: 0, avgLateFee: 0, sheetChangePerEntry: 0 } };
  const m = I.meetMoney({ level: 0, entries: 100, events: [{ cell: 'CG1', n: 100 }] });
  ok(Math.abs(m.gross - 8500) < 0.01, '2025 Regionals price every entry at the flat $85 (no $45 tier)');
  ok(Math.abs(m.levy - (380 + 340)) < 0.01, 'DiveMeets $3.80 x 100 + 4% card fee on gross ($340)');
  ok(Math.abs(m.host - 3250) < 0.01 && m.basis === 'recap-2025', 'host $32.50 per paid entry (2025 split)'); }

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
