/* A saved Boundary Studio scenario, run through Boundary Studio's own Money
   calculation (financialsFor) -- the numbers a person sees on that screen.
   Moved here from api/_boundary-money.js (2026-09-16) so the in-app report and
   the server tools share one implementation. */
import { q as neonQuery, engine, json } from './runtime.js';
import { cohortLoad, yearFromCode, movementRates } from './eligibility.js';

/**
 * Mechanical copy of loadScenario()'s own state-assignment lines (verified
 * against the real function in boundary.js), stopping before its UI calls
 * (bsConfirm, repaintAll, renderPanel, msg). Every line here corresponds
 * 1:1 to a line in the real loadScenario -- nothing added, nothing
 * reinterpreted.
 */
export async function hydrateScenario(I, id) {
  const r = { rows: await neonQuery(
    `SELECT name, data FROM membership.boundary_scenarios WHERE id=$1`,
    [id]
  ) };
  if (!r.rows.length) return false;
  const row = r.rows[0];
  const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  const S = I.S;

  // A fresh page load seeds these before any scenario is ever loaded;
  // loadScenario() itself assumes they already exist (it never sets a
  // default for S.levels). This harness skips that UI-driven initial load,
  // so it has to seed the same defaults explicitly, in the same order.
  if (!S.regions || !S.regions.length) S.regions = I.defaultRegions(12);
  if (!S.levels) S.levels = I.defaultLevels(S.regions.length);

  S.regions = d.regions && d.regions.length ? d.regions : S.regions;
  S.assign = d.assign || {};
  S.year = (d.year === 'y24' || d.year === 'y26') ? d.year : 'y25';
  S.routing = (d.routing && d.routing.length) ? d.routing : null;
  S.fees = d.fees || null;
  if (d.hostMode) S.hostMode = d.hostMode;
  if (d.hostShare != null) S.hostShare = d.hostShare;
  if (d.hostFlat != null) S.hostFlat = d.hostFlat;
  if (d.hostPer != null) S.hostPer = d.hostPer;
  if (d.hostMin != null) S.hostMin = d.hostMin;
  S.hostPer_stop = d.hostPer_stop || null;
  S.arrival = d.arrival || null;
  S.seedPool = d.seedPool || null;
  S.firstStopAll = !!d.firstStopAll;
  S.platformReal = !!d.platformReal;
  S.firstStopPlatform = d.firstStopPlatform === 'skip' ? 'skip' : 'held';
  I.syncRouting();
  S.levels = I.migrateLevels(d, S.regions.length);
  S.finalName = d.finalName || 'Junior Nationals';
  S.adv = d.adv && d.adv.steps ? d.adv : I.defaultAdv();
  if (!S.adv.focus) S.adv.focus = 'all';
  if (!S.adv.pool) S.adv.pool = '2026|Zones';
  I.syncLevels();
  S.scenarioId = id;
  S.scenarioName = row.name;

  return true;
}

/* The 2026 first-stop seed for a structure whose first stop is where every
   event first counts toward qualifying (both nine-zone proposals). Each cell
   comes from the real 2026 stage where that event was first a QUALIFYING event:
   Group A/B springboard from Regionals; platform (every group) and all Group C/D
   events from Zones. Platform was optional ($45, non-qualifying) at 2026
   Regionals -- 58 Group A/B platform event entries there against 345 at Zones --
   so seeding it from Regionals undercounted it by ~290 (corrected 2026-09-16).
   Exported so api/check-invariants.mjs tests the exact seed the report uses. */
export const seedFromZones = (c) => /^[CD]/.test(c) || c[2] === 'P';
/* Seed for a mandatory first stop. Preferred: the combined pool (every diver
   who competed at 2026 Regionals OR Zones, once per event -- all age groups
   compete at a single first stop). Fallback while that pool is absent:
   Regionals for Group A/B springboard, Zones for platform and Groups C/D. */
export function firstStopSeedBasis(adv) { return adv && adv.pools && adv.pools['2026|FirstStop'] ? 'combined' : 'split'; }
export function withFirstStopSeed(adv) {
  if (firstStopSeedBasis(adv) === 'combined') {
    return Object.assign({}, adv, { pools: Object.assign({}, adv.pools, { '2026|Regionals_CDfirst': JSON.parse(JSON.stringify(adv.pools['2026|FirstStop'])) }) });
  }
  const R = JSON.parse(JSON.stringify(adv.pools['2026|Regionals'] || {})), Z = adv.pools['2026|Zones'] || {};
  for (const f in R) for (const c of Object.keys(R[f])) if (seedFromZones(c)) delete R[f][c];
  for (const f in Z) for (const c in Z[f]) if (seedFromZones(c)) { R[f] = R[f] || {}; R[f][c] = (R[f][c] || 0) + Z[f][c]; }
  return Object.assign({}, adv, { pools: Object.assign({}, adv.pools, { '2026|Regionals_CDfirst': R }) });
}

/* options:
 *   cdFirstStop  (default true)  Groups C and D compete at the first stop. 2026's
 *                non-mandatory first stop is the exception, so the 2026 seed is
 *                rebuilt from everyone who competed by any path (Regionals pool
 *                for A/B/platform + Zones pool for C/D). Set false to use the
 *                scenario's stored seed as-is (what the live Money tab shows).
 *   ceilingYear  (default 2026)  membership year for the eligibility ceiling and
 *                the participation basis (2025 or 2026).
 *   lateFeeShare (default 0)     share of entries paying the $100 late fee.
 */
export async function computeBoundaryMoneyReport(boundaryScenarioId, options = {}) {
  const opts = Object.assign({ cdFirstStop: true, ceilingYear: 2026, lateFeeShare: 0, useRecapRates: false }, options);
  const { w, warnings } = await engine();
  const Ipricing = w.__pricingInternal;
  const Iboundary = w.__boundaryInternal;

  await Ipricing.bootstrap();
  if (Ipricing.PS.err) {
    throw new Error('Pricing engine bootstrap failed (needed for JuniorFlow): ' + Ipricing.PS.err);
  }
  await Ipricing.ensureFlowData(); // populates FLOW.baseline -- window.JuniorFlow.compute needs this and bootstrap() alone does not set it

  // Boundary Studio's own S.advData -- same underlying file pricing.js
  // loads into PS.adv, loaded here the same way boundary.js itself does.
  Iboundary.S.advData = await json('advance-data.json');

  const applied = await hydrateScenario(Iboundary, boundaryScenarioId);
  if (!applied) return null;

  const S = Iboundary.S;
  S.year = opts.ceilingYear === 2025 ? 'y25' : opts.ceilingYear === 2024 ? 'y24' : 'y26';
  S.lateFeeShare = opts.lateFeeShare || 0;
  // Reconciled basis: rates from the 2026 DiveMeets recaps (host share of net by
  // stage, paid-vs-competed uplift, late fees, sheet changes). Off by default so
  // the stored scenario's own host terms apply unless asked for.
  S.recapRates = opts.useRecapRates ? ((await json(opts.ceilingYear === 2025 ? 'recaps-2025.json' : 'recaps-2026.json')) || {}).byStage : null;
  const advRaw = S.advData;
  if (opts.cdFirstStop && S.year === 'y26' && S.advData && S.advData.pools) {
    S.advData = withFirstStopSeed(S.advData);
    S.seedPool = 'Regionals_CDfirst';
  }
  S.flow = w.JuniorFlow.compute({
    regions: S.regions, assign: S.assign, levels: S.levels,
    finalName: S.finalName, year: S.year,
  });

  const a = Iboundary.financialsFor(null);
  if (!a) {
    throw new Error(
      'financialsFor returned null -- pathway could not be projected. ' +
      (warnings.length ? 'Captured warnings: ' + warnings.join(' | ') : 'No warnings captured.')
    );
  }

  // Per-cell entries per tier, for the cohort load (unique athletes as a share
  // of eligible membership per age group x gender). Re-running the projection
  // is deterministic; financialsFor does not expose the per-cell result.
  const CELLS24 = ['AB1','AB3','ABP','AG1','AG3','AGP','BB1','BB3','BBP','BG1','BG3','BGP',
                   'CB1','CB3','CBP','CG1','CG3','CGP','DB1','DB3','DBP','DG1','DG3','DGP'];
  const res = Iboundary.projectPathway();
  const QR = w.QualRouting;
  const perCellByLevel = {};
  if (res) {
    S.levels.forEach((lv, L) => {
      const m = {};
      CELLS24.forEach((c) => { let e = 0; for (let g = 0; g < Iboundary.groupCountAt(L); g++) e += QR.entriesCellAt(res, L, g, c); m[c] = e; });
      perCellByLevel[L] = m;
    });
  }
  const eligYear = yearFromCode(S.year);
  const loads = {};
  for (const L of Object.keys(a.tiers)) {
    if (perCellByLevel[L]) loads[L] = await cohortLoad(perCellByLevel[L], eligYear, a.tiers[L].name, Iboundary.levelStage ? Iboundary.levelStage(+L).stage : null);
  }

  const perTier = Object.keys(a.tiers).sort((x, y) => x - y).map((L) => {
    const t = a.tiers[L];
    return {
      cohortLoad: loads[L] || null,
      level: t.name,
      meets: t.meets,
      entries: Math.round(t.entries),
      spots: t.spots ? Math.round(t.spots) : null,
      fillRate: t.spots ? Math.round(t.fill * 1000) / 10 : null, // percent, 1 decimal
      grossEntryIncome: Math.round(t.gross),
      diveMeetsPassThrough: Math.round(t.levy),
      toHosts: Math.round(t.host),
      usaDivingKeeps: Math.round(t.usad),
      measuredTakeUp: t.measured,
      biggestToSmallestRatio: t.ratio ? Math.round(t.ratio * 10) / 10 : null,
    };
  });

  const notes = [
    'Entry fees only -- membership dues and senior circuit revenue are a separate model in Pricing Studio, not included here (this is Boundary Studio\'s own "Money" tab calculation).',
    'Filled/spots reflects rule capacity, not a forecast -- a tier can legitimately exceed 100% where rules admit extra qualifiers by average score.',
  ];
  if (warnings.length) {
    notes.push('One or more data sources logged a warning during computation -- see dataLoadWarnings.');
  }

  const movementBand = await movementRates();
  // Per stop: the engine already computes every meet; surface it.
  const perMeet = Iboundary.meetManifest(res).map((m) => {
    const money = Iboundary.meetMoney(m);
    // Fee per event entry: one number, or the split when the stop prices events
    // differently (2026-style Regionals: $85 qualifying / $45 non-qualifying).
    const byFee = {};
    for (const e of m.events || []) { const f = Iboundary.feeForCell(m.level, e.cell); byFee[f] = (byFee[f] || 0) + e.n; }
    const fees = Object.keys(byFee).map(Number).sort((a, b) => b - a);
    const split = fees.length > 1;
    return { tier: m.levelName, stop: m.name, entries: m.entries, paidEntries: Math.round(money.paidEntries || m.entries), spots: m.spots || null, basis: money.basis,
      feePerEvent: split ? fees.map((f) => `$${f}`).join(' / ') : (fees.length ? fees[0] : money.fee),
      feeSplit: split ? fees.map((f) => ({ fee: f, entries: byFee[f] })) : null, grossEntryIncome: Math.round(money.gross), lateFees: Math.round(money.lateFees || 0),
      diveMeetsPassThrough: Math.round(money.levy), toHosts: Math.round(money.host), usaDivingKeeps: Math.round(money.usad),
      hostOverride: money.overridden };
  });
  // Region-choice movement is reported as a measured rate only (movementBand).
  // It is not applied to totals: an athlete who competes outside their home
  // region still enters a meet, so season entries and revenue don't move with it.
  //
  // Standard-fee comparison: a scenario that stores its own fees (the National
  // Office Proposal prices Junior Nationals at $135) is also priced at the
  // published 2026 schedule, so two proposals can be compared on structure alone.
  let atStandardFees = null;
  if (S.fees && Object.values(S.fees).some((v) => v != null)) {
    const saved = S.fees; S.fees = null;
    try { const b = Iboundary.financialsFor(null); if (b) atStandardFees = { grossEntryIncome: Math.round(b.total.gross), usaDivingKeeps: Math.round(b.total.usad),
      note: 'Same entries priced at the published 2026 schedule ($85/$45 Regionals, $90 Zones, $115 E/W/C, $125 Junior Nationals) instead of this scenario\'s own fees.' }; }
    finally { S.fees = saved; }
  }
  return {
    assumptions: { cdFirstStop: !!opts.cdFirstStop, ceilingYear: opts.ceilingYear, lateFeeShare: S.lateFeeShare || 0,
      revenueBasis: opts.useRecapRates ? (opts.ceilingYear === 2025 ? 'reconciled 2025 rates (Entry Fees.xlsx, ties to GL): $85 Regionals/Zones, $115 Nationals, $3.80 DiveMeets, 4% card fee absorbed, host $32.50/$30.00/$23.44 per entry, paid-vs-competed uplift' : 'reconciled 2026 rates: host share of net by stage (Regionals 56.4%, Zones 36.5%, E/W/C 26.3%), paid-vs-competed uplift, coach and athlete late fees, sheet changes from the DiveMeets recaps') : 'scenario\'s stored host terms; competed entries only; no late fees',
      seedPool: S.seedPool || 'inferred', seedBasis: opts.cdFirstStop ? firstStopSeedBasis(advRaw) : 'stored', firstStopPlatform: S.firstStopPlatform || 'held',
      note: opts.cdFirstStop ? (firstStopSeedBasis(advRaw) === 'combined'
        ? 'The first stop is mandatory for every age group: it is seeded with every athlete who competed in each event at 2026 Regionals or Zones, counted once.'
        : 'Groups C and D modelled at the first stop (mandatory): seeded from 2026 Regionals for Group A/B springboard and from 2026 Zones for platform and Groups C/D.') : 'Scenario evaluated with its stored seed (Groups C/D as they actually entered).' },
    scenarioFees: S.fees || null,
    hostTerms: { mode: S.hostMode || 'pct', share: S.hostShare, perEntry: S.hostPer, flat: S.hostFlat, min: S.hostMin || 0 },
    diveMeetsPerEntry: Iboundary.levyPerEntry(),
    // The structure as run, so a report can state its rules and place counts
    // from the scenario itself rather than from hand-typed text.
    structure: {
      levels: S.levels.map((l, L) => ({ name: Iboundary.tierName(L), meets: Math.max(1, Iboundary.groupCountAt(L)) })),
      finalName: S.finalName || 'Junior Nationals',
      routing: JSON.parse(JSON.stringify(S.routing || [])),
    },
    atStandardFees,
    perMeet,
    movementBand,
    scenarioId: S.scenarioId,
    scenarioName: S.scenarioName,
    fieldAtFinal: perTier.length ? perTier[perTier.length - 1].entries : null,
    grossEntryIncome: Math.round(a.total.gross),
    diveMeetsPassThrough: Math.round(a.total.levy),
    toHosts: Math.round(a.total.host),
    usaDivingKeeps: Math.round(a.total.usad),
    perTier,
    dataLoadWarnings: warnings,
    notes,
  };
}
