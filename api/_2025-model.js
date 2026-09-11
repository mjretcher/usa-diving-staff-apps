/* Financial projection for the 2021-2025 qualification rules (Region -> Zone
 * -> Nationals, no E/W/C tier) -- built and validated 2026-09-09.
 *
 * WHY THIS ISN'T JUST ANOTHER SAVED BOUNDARY SCENARIO
 * ------------------------------------------------------------------------
 * The standard pipeline (financialsFor / projectPathway, see
 * api/_boundary-money.js) computes its take-up rate automatically via
 * arrivalRate()/measuredArrival(), which pull from FLOW.calByYear -- a cache
 * derived ONCE against whichever scenario happens to be the seed baseline
 * ("2026 Alignment"), keyed only by year. That calibration reflects "how well
 * does the CURRENT system's structure explain a given year's real numbers" --
 * a different question from "how well does the OLD top-15 rule explain them,"
 * and applying it to a fundamentally different, older ruleset would silently
 * substitute the wrong number for a real one. Loading this as a normal saved
 * scenario through the unmodified pipeline would produce a plausible-looking
 * but wrong result.
 *
 * So this bypasses projectPathway()'s automatic calibration and calls
 * QR().project() directly, using a take-up rate measured specifically for
 * the OLD rule (see below), then feeds the result into the SAME real,
 * unmodified meetManifest()/meetMoney()/tierName() functions boundary.js
 * itself uses -- reusing everything that's genuinely reusable (fee math,
 * meet enumeration) and replacing only the piece that's coupled to the
 * wrong calibration.
 *
 * VALIDATION (against real 2025 historical results, core.event_results):
 *   - 12 real regions, pairing 2-per-zone into 6 real zones (A-F) -- both
 *     the region count and the pairing confirmed from actual athlete
 *     records, not assumed.
 *   - Take-up rate 0.8374 = real attendees at the top-15 band (1,735) /
 *     theoretical top-15-per-region slots (2,072), measured directly from
 *     2025 results.
 *   - Threshold-qualifiers (121 real athletes who advanced from beyond
 *     15th place) and platform's direct Zone entries (525 real athletes --
 *     platform is exhibition at Regionals in every year 2021-2026, so it
 *     enters at Zones directly) are both real 2025 counts, not estimates.
 *   - Result: projected Zone total 2,382 vs. real 2,410 (1.2% off); projected
 *     Nationals total 1,224 vs. real 1,234 (0.8% off), both from this file's
 *     own meetManifest/meetMoney-based output. The remaining gap is most
 *     likely the domain rules' "skip-stage qualifiers" (Alaska/Hawaii, YMCA
 *     champions, military-dependent athletes) which this does not yet model
 *     as a separate cohort.
 *
 * Fee/host-cost basis: DEFAULT_FEES (same as the CCE Submission scenario,
 * which stores no fee override) and the same host-cost settings both real
 * proposals use (per_entry, 25% share, $3,000 flat, $25/entry, $0 minimum) --
 * so the comparison isolates the effect of the qualification structure
 * itself, not a difference in pricing assumptions. Documented explicitly
 * here and in the tool's own output, not left implicit.
 */

import fs from 'node:fs';
import path from 'node:path';
import { buildWindow } from './_boundary-money.js';
import { cohortLoad, movementRates } from './_eligibility.js';

const CELLS = ['AB1','AB3','ABP','AG1','AG3','AGP','BB1','BB3','BBP','BG1','BG3','BGP',
               'CB1','CB3','CBP','CG1','CG3','CGP','DB1','DB3','DBP','DG1','DG3','DGP'];
const PLATFORM_CELLS = CELLS.filter((c) => c[2] === 'P');
const SPRINGBOARD_CELLS = CELLS.filter((c) => c[2] !== 'P');

// Real 2025 per-region, per-cell Regional entries -- core.event_results,
// stage='Regionals', is_junior_circuit, year=2025, grouped by real region
// (1-12) and cell. Row index 0 = region 1, ... row index 11 = region 12.
const REGION_ENTRIES_FULL = [
  {"AB1":17,"AB3":14,"AG1":40,"AG3":33,"BB1":11,"BB3":9,"BG1":28,"BG3":21,"CB1":8,"CB3":6,"CG1":25,"CG3":16,"DB1":4,"DB3":4,"DG1":15,"DG3":11},
  {"AB1":29,"AB3":24,"AG1":42,"AG3":36,"BB1":19,"BB3":18,"BG1":25,"BG3":17,"CB1":17,"CB3":14,"CG1":23,"CG3":20,"DB1":18,"DB3":14,"DG1":15,"DG3":14},
  {"AB1":30,"AB3":26,"AG1":31,"AG3":29,"BB1":7,"BB3":6,"BG1":16,"BG3":11,"CB1":6,"CB3":5,"CG1":12,"CG3":11,"DB1":13,"DB3":11,"DG1":9,"DG3":7},
  {"AB1":21,"AB3":21,"AG1":28,"AG3":26,"BB1":5,"BB3":4,"BG1":14,"BG3":15,"CB1":1,"CB3":1,"CG1":4,"CG3":4,"DB1":4,"DB3":4,"DG1":3,"DG3":3},
  {"AB1":28,"AB3":21,"AG1":53,"AG3":38,"BB1":17,"BB3":12,"BG1":23,"BG3":20,"CB1":5,"CB3":4,"CG1":20,"CG3":15,"DB1":7,"DB3":5,"DG1":11,"DG3":9},
  {"AB1":25,"AB3":20,"AG1":40,"AG3":25,"BB1":10,"BB3":8,"BG1":19,"BG3":11,"CB1":11,"CB3":5,"CG1":10,"CG3":8,"DB1":10,"DB3":6,"DG1":7,"DG3":6},
  {"AB1":19,"AB3":17,"AG1":28,"AG3":26,"BB1":7,"BB3":5,"BG1":13,"BG3":12,"CB1":4,"CB3":2,"CG1":9,"CG3":7,"DB1":3,"DB3":2,"DG1":2,"DG3":2},
  {"AB1":12,"AB3":10,"AG1":34,"AG3":30,"BB1":7,"BB3":6,"BG1":15,"BG3":14,"CB1":2,"CB3":2,"CG1":12,"CG3":9,"DB1":7,"DB3":6,"DG1":5,"DG3":4},
  {"AB1":27,"AB3":24,"AG1":42,"AG3":39,"BB1":6,"BB3":6,"BG1":23,"BG3":22,"CB1":5,"CB3":4,"CG1":8,"CG3":7,"DB1":2,"DB3":2,"DG1":3,"DG3":1},
  {"AB1":16,"AB3":12,"AG1":47,"AG3":42,"BB1":13,"BB3":13,"BG1":32,"BG3":26,"CB1":15,"CB3":14,"CG1":23,"CG3":18,"DB1":8,"DB3":8,"DG1":19,"DG3":14},
  {"AB1":14,"AB3":14,"AG1":27,"AG3":24,"BB1":5,"BB3":4,"BG1":14,"BG3":13,"CB1":13,"CB3":12,"CG1":14,"CG3":11,"DB1":7,"DB3":4,"DG1":9,"DG3":6},
  {"AB1":13,"AB3":12,"AG1":45,"AG3":39,"BB1":11,"BB3":11,"BG1":25,"BG3":21,"CB1":9,"CB3":7,"CG1":26,"CG3":19,"DB1":14,"DB3":11,"DG1":19,"DG3":16}
];

const THRESHOLD_ADDS_2025 = {AB1:12,AB3:8,AG1:16,AG3:19,BB1:2,BG1:22,BG3:17,CB1:1,CG1:14,CG3:7,DG1:3};
const PLATFORM_ZONE_ENTRIES_2025 = {ABP:74,AGP:134,BBP:51,BGP:104,CBP:39,CGP:64,DBP:27,DGP:32};
const TAKE_UP_RATE_2025 = 0.8374;

function buildLevels() {
  const zones = ['A','B','C','D','E','F'].map((L) => ({ name: 'Zone ' + L }));
  const zoneOf = [0,0,1,1,2,2,3,3,4,4,5,5]; // 12 regions -> 6 zones, 2 each -- confirmed from real athlete records
  return [
    { name: 'Regions' },
    { name: 'Zones', groups: zones, of: zoneOf },
    { name: 'Nationals', groups: [{ name: 'Junior Nationals' }], of: [0,0,0,0,0,0] },
  ];
}

function buildRouting() {
  const entering = Object.assign({}, THRESHOLD_ADDS_2025, PLATFORM_ZONE_ENTRIES_2025);
  const byCellPrelim = {};
  PLATFORM_CELLS.forEach((c) => { byCellPrelim[c] = { lo: 4, hi: 7 }; });
  return [
    { rounds: [{ key: 'final' }],
      routes: [{ from: 'final', lo: 1, hi: 15, to: { level: 1, round: 'final' } }] },
    { rounds: [{ key: 'final' }], entering,
      routes: [
        { from: 'final', lo: 1, hi: 3, to: { level: 2, round: 'semi' } },
        { from: 'final', lo: 4, hi: 10, to: { level: 2, round: 'prelim' }, byCell: byCellPrelim },
      ] },
    { rounds: [{ key: 'prelim' }, { key: 'semi' }, { key: 'final' }],
      routes: [
        { from: 'prelim', lo: 1, hi: 12, to: { level: 2, round: 'final' } },
        { from: 'semi', lo: 1, hi: 8, to: { level: 2, round: 'final' } },
      ] },
  ];
}

export async function compute2025Model(options = {}) {
  const opts = Object.assign({ useRecapRates: false }, options);
  const { w } = buildWindow();
  const I = w.__boundaryInternal;
  const QR = w.QualRouting;
  const S = I.S;

  S.regions = I.defaultRegions(12);
  S.levels = buildLevels();
  S.routing = buildRouting();
  S.finalName = 'Junior Nationals';
  S.year = 'y25';
  S.fees = null; // DEFAULT_FEES -- same basis as the CCE Submission scenario
  S.hostMode = 'per_entry';
  S.hostShare = 0.25;
  S.hostFlat = 3000;
  S.hostPer = 25;
  S.hostMin = 0;
  let recaps = null;
  try { recaps = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'membership-analytics', 'recaps-2025.json'), 'utf8')); } catch (e) {}
  S.recapRates = opts.useRecapRates && recaps ? recaps.byStage : null;
  S.scenarioId = 'model-2025-rules';
  S.scenarioName = '2025 Model — Region \u2192 Zone \u2192 Nationals (pre-E/W/C rules)';

  const conv = { 1: {} };
  SPRINGBOARD_CELLS.forEach((c) => { conv[1][c] = TAKE_UP_RATE_2025; });

  const res = QR.project({
    routing: S.routing,
    entries0: REGION_ENTRIES_FULL,
    groupCount: I.groupCountAt,
    groupOf: I.groupUp,
    conv,
    cells: CELLS,
  });

  if (res.problems && res.problems.length) {
    throw new Error('Routing validation problems: ' + JSON.stringify(res.problems));
  }

  // Cohort load per level: unique athletes as a share of eligible 2025 membership.
  const loadsByLevel = {};
  for (let L = 0; L < S.levels.length; L++) {
    const m = {};
    CELLS.forEach((c) => { let e = 0; for (let g = 0; g < I.groupCountAt(L); g++) e += QR.entriesCellAt(res, L, g, c); m[c] = e; });
    loadsByLevel[L] = await cohortLoad(m, 2025, S.levels[L].name);
  }

  const meets = I.meetManifest(res);
  const perMeet = meets.map((m) => { const money = I.meetMoney(m); return { tier: m.levelName, stop: m.name, entries: m.entries, spots: m.spots || null, basis: money.basis,
    feePerEvent: money.fee, grossEntryIncome: Math.round(money.gross), lateFees: Math.round(money.lateFees || 0), diveMeetsPassThrough: Math.round(money.levy),
    toHosts: Math.round(money.host), usaDivingKeeps: Math.round(money.usad) }; });
  const tiers = {};
  meets.forEach((m) => {
    const fin = I.meetMoney(m);
    const t = tiers[m.level] || (tiers[m.level] = {
      name: I.tierName(m.level), meets: 0, entries: 0, gross: 0, levy: 0, host: 0, usad: 0,
      sizes: [], spots: 0,
    });
    t.meets++; t.entries += m.entries; t.gross += fin.gross; t.levy += fin.levy;
    t.host += fin.host; t.usad += fin.usad; t.sizes.push(m.entries); t.spots += m.spots;
  });
  Object.values(tiers).forEach((t) => {
    const v = t.sizes.filter((x) => x > 0);
    t.lo = v.length ? Math.min(...v) : 0;
    t.hi = v.length ? Math.max(...v) : 0;
    t.ratio = t.lo ? t.hi / t.lo : 0;
    t.fill = t.spots ? t.entries / t.spots : null;
  });
  const total = Object.values(tiers).reduce((a, t) => ({
    meets: a.meets + t.meets, entries: a.entries + t.entries, gross: a.gross + t.gross,
    levy: a.levy + t.levy, host: a.host + t.host, usad: a.usad + t.usad,
  }), { meets: 0, entries: 0, gross: 0, levy: 0, host: 0, usad: 0 });

  const perTier = Object.keys(tiers).sort((a, b) => a - b).map((L) => {
    const t = tiers[L];
    return {
      cohortLoad: loadsByLevel[L] || null,
      level: t.name, meets: t.meets, entries: Math.round(t.entries),
      spots: t.spots ? Math.round(t.spots) : null,
      fillRate: t.fill != null ? Math.round(t.fill * 1000) / 10 : null,
      grossEntryIncome: Math.round(t.gross), diveMeetsPassThrough: Math.round(t.levy),
      toHosts: Math.round(t.host), usaDivingKeeps: Math.round(t.usad),
      biggestToSmallestRatio: t.ratio ? Math.round(t.ratio * 10) / 10 : null,
    };
  });

  // Attach 2025 actuals per meet (Entry Fees.xlsx 2025 tab; rate x count model that ties to the GL).
  if (recaps) {
    const byName = {}; for (const r of recaps.perMeet) byName[r.name] = r;
    for (const m of perMeet) { const r = byName[m.stop] || byName[m.stop.replace(/^Region (\d+)$/, 'Region $1')] || (m.tier === 'Nationals' ? byName['Junior Nationals'] : null);
      if (r) m.recap = { paidEntries: r.paid, competedEntries: r.competed, paidNotCompetedPct: r.no_show_pct, gross: r.gross, creditCardFees: r.credit_card, diveMeetsFees: r.divemeets, host: r.host, hostPerEntry: r.host_per_entry, usadShare: r.usad }; }
  }
  const reconciled = recaps ? (() => { const rows = recaps.perMeet; const sum = (k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
    return { source: recaps.source, paidEntries: sum('paid'), competedEntries: sum('competed'), gross: sum('gross'), creditCardFees: +sum('credit_card').toFixed(2), diveMeetsFees: +sum('divemeets').toFixed(2), host: +sum('host').toFixed(2), usadShare: +sum('usad').toFixed(2), byStage: recaps.byStage }; })() : null;
  const movementBand = await movementRates();
  const mvRate = ((movementBand[2025] || {}).regionals || {}).rate || 0;
  const band = (v) => ({ low: Math.round(v * (1 - mvRate / 100)), point: Math.round(v), high: Math.round(v * (1 + mvRate / 100)) });
  return {
    assumptions: { basis: opts.useRecapRates ? 'reconciled 2025 rates (Entry Fees.xlsx): $85/$115 flat, $3.80 DiveMeets, 4% card fee absorbed, host $32.50/$30.00/$23.44 per entry, paid-vs-competed uplift' : 'real 2025 per-region entries with default fees and $25/entry host', ceilingYear: 2025 },
    reconciled,
    movementBandApplied: { ratePct: mvRate, firstTierEntries: band(perTier[0].entries), usaDivingKeeps: band(Math.round(total.usad)) },
    perMeet,
    movementBand,
    scenarioId: 'model-2025-rules',
    scenarioName: S.scenarioName,
    fieldAtFinal: perTier.length ? perTier[perTier.length - 1].entries : null,
    grossEntryIncome: Math.round(total.gross),
    diveMeetsPassThrough: Math.round(total.levy),
    toHosts: Math.round(total.host),
    usaDivingKeeps: Math.round(total.usad),
    perTier,
    validation: {
      method: 'Take-up rate (83.74%) and threshold/platform entry counts measured directly ' +
        'from real 2021-2025 results (core.event_results), not estimated. Figures below are ' +
        'from this file\'s own output (via the real meetManifest/meetMoney billing logic), ' +
        'not a separate rough estimate.',
      projectedVsReal: {
        zoneTotal: { projected: perTier.find((t) => t.level === 'Zones').entries, real: 2410 },
        nationalsTotal: { projected: perTier.find((t) => t.level === 'Nationals').entries, real: 1234 },
      },
      knownGap: 'Remaining ~1-2% gap likely reflects skip-stage qualifiers (Alaska/Hawaii, YMCA ' +
        'champions, military-dependent athletes) not yet modeled as a separate entry cohort.',
    },
    notes: [
      'Entry fees only, same basis as the two live proposals -- membership dues and senior ' +
      'circuit revenue are a separate model, not included here.',
      'Fee schedule: DEFAULT_FEES (same basis as CCE Submission, which stores no override). ' +
      'Host-cost settings (per_entry, 25% share, $3,000 flat, $25/entry, $0 min) match both ' +
      'live proposals exactly, so this comparison isolates the qualification structure itself.',
      'This is NOT run through the standard scenario pipeline (see file header) -- it uses a ' +
      'take-up rate measured specifically for this ruleset, not the app\'s automatic per-year ' +
      'calibration, which is built for the current system\'s structure and would not apply ' +
      'correctly here.',
    ],
  };
}
