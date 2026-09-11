/* Server-side invocation of Boundary Studio's real "Money" tab calculation.
 *
 * CORRECTION FROM EARLIER TONIGHT: the first pass at this traced
 * `summariseRouting()`, which looked right (same "USA Diving keeps" language)
 * but is actually the engine behind the COMPARE tab's per-column financials,
 * not the Money tab shown in Mike's screenshot. Confirmed by grepping the
 * screenshot's own literal text ("Entry income by tier", "USA Diving keeps,
 * entry fees only") to find which function actually contains it:
 * `atlasMoneyHtml()`, which gets its numbers from `financialsFor(null)` --
 * a different, simpler function. This file calls financialsFor, not
 * summariseRouting.
 *
 * Same methodology as api/_pricing-engine.js: load the REAL, UNMODIFIED
 * source of boundary.js (plus its real dependencies routing.js, pricing.js,
 * and scenario-schedule-engine.js) into jsdom and call its own real
 * functions, rather than re-deriving the math by hand.
 *
 * VERIFIED BEFORE WRITING THIS FILE:
 *   - Every function in the financialsFor() call chain (financialsFor,
 *     projectPathway, meetManifest, meetMoney, feeFor, syncRouting,
 *     syncLevels, migrateLevels, tierGroupsAt, groupUp, tallyInvalidate,
 *     tierName, groupCountAt) individually grepped for DOM/window
 *     references. All clean except guarded `window.JuniorFlow` /
 *     `window.QualRouting` / `window.ScenarioScheduleEngine` calls, which
 *     are real, intentional dependencies on the other three files, not bugs.
 *   - `S.geo` (the 1.1MB county-polygon map data) is NOT referenced anywhere
 *     in this chain -- the finance numbers don't need the visual map.
 *   - `S.advData` (real per-FIPS entry counts, same underlying source file
 *     as pricing.js's advance-data.json) IS needed, via seedRows() ->
 *     projectPathway() -> QR().project(). Loaded the same way pricing.js
 *     loads its copy: a plain fetch of the static file.
 *   - Boundary Studio's own `financialsFor` calls `window.JuniorFlow.compute`
 *     (pricing.js's exported API) to get calibrated take-up rates, so
 *     pricing.js must be bootstrapped first, exactly as in
 *     api/_pricing-engine.js.
 *   - `loadScenario()`, the real browser-side scenario loader, is NOT called
 *     directly -- it ends by calling `repaintAll()` and `renderPanel()`,
 *     which are genuinely DOM/canvas-heavy (confirmed by reading them) and
 *     would either crash or do pointless work in a headless context. Instead
 *     this file's hydrateScenario() copies loadScenario's own state
 *     assignment lines verbatim (a mechanical copy of `S.x = d.x || default`
 *     statements, not a reinterpretation of any logic) and stops before the
 *     UI calls. The actual math (financialsFor and everything under it) is
 *     still the real, unmodified function -- only the boring, low-risk
 *     "copy JSON fields onto S" step is hand-written.
 */

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { neonQuery } from './_neon.js';
import { cohortLoad, yearFromCode } from './_eligibility.js';

// See api/_pricing-engine.js for why this is process.cwd() and not
// import.meta.url/__dirname -- the short version: Vercel compiles this file
// to CommonJS, and import.meta is a parse-time SyntaxError there, not a
// runtime one.
const MA_DIR = path.join(process.cwd(), 'membership-analytics');

const ROUTING_SRC = fs.readFileSync(path.join(MA_DIR, 'routing.js'), 'utf8');
const SCHEDULE_ENGINE_SRC = fs.readFileSync(path.join(MA_DIR, 'scenario-schedule-engine.js'), 'utf8');
const PRICING_SRC_RAW = fs.readFileSync(path.join(MA_DIR, 'pricing.js'), 'utf8');
const BOUNDARY_SRC_RAW = fs.readFileSync(path.join(MA_DIR, 'boundary.js'), 'utf8');

const PRICING_ANCHOR = '};\n\n})();';
const PRICING_SHIM = `};

window.__pricingInternal = { PS, bootstrap, applyBoundary, computeRevenue, computeVolume, ensureFlowData };

})();`;

if (!PRICING_SRC_RAW.trimEnd().endsWith(PRICING_ANCHOR.trimEnd())) {
  throw new Error('pricing.js anchor mismatch -- see api/_boundary-money.js, refusing to guess.');
}
const PRICING_SRC =
  PRICING_SRC_RAW.trimEnd().slice(0, -PRICING_ANCHOR.trimEnd().length) + PRICING_SHIM;

// boundary.js's real closing is `})();` with no preceding blank line before it
// in the same way pricing.js has -- verified against the actual file tail
// below, not assumed to match pricing.js's exact whitespace.
const BOUNDARY_TAIL = fs.readFileSync(path.join(MA_DIR, 'boundary.js'), 'utf8').slice(-20);
const BOUNDARY_ANCHOR = '})();';
if (!BOUNDARY_SRC_RAW.trimEnd().endsWith(BOUNDARY_ANCHOR)) {
  throw new Error(
    `boundary.js does not end with the expected "${BOUNDARY_ANCHOR}" anchor (actual tail: ${JSON.stringify(BOUNDARY_TAIL)}) -- refusing to guess where to insert the export shim.`
  );
}
const BOUNDARY_SHIM = `
window.__boundaryInternal = { S, financialsFor, projectPathway, syncRouting, syncLevels, migrateLevels, defaultRegions, defaultLevels, defaultAdv, meetManifest, meetMoney, tierName, groupCountAt, groupUp };

})();`;
const BOUNDARY_SRC =
  BOUNDARY_SRC_RAW.trimEnd().slice(0, -BOUNDARY_ANCHOR.length) + BOUNDARY_SHIM;

function loadStaticJson(file) {
  const clean = file.split('?')[0];
  const p = path.join(MA_DIR, clean);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function buildWindow() {
  const dom = new JSDOM('', { runScripts: 'outside-only' });
  const w = dom.window;

  const warnings = [];
  const nativeConsole = w.console;
  w.console = {
    log: (...a) => nativeConsole.log(...a),
    warn: (...a) => { warnings.push(a.map(String).join(' ')); nativeConsole.warn(...a); },
    error: (...a) => { warnings.push(a.map(String).join(' ')); nativeConsole.error(...a); },
  };

  w.NEON = { query: async (sql, params) => ({ rows: await neonQuery(sql, params) }) };
  w.fetch = async (url) => {
    const data = loadStaticJson(url);
    if (data == null) return { ok: false, status: 404, json: async () => { throw new Error('not found'); } };
    return { ok: true, status: 200, json: async () => data };
  };

  // Order matters: routing.js and pricing.js define window.QualRouting /
  // window.JuniorFlow that boundary.js reads at call time (not load time,
  // so strictly this order isn't required for correctness -- but it matches
  // the real page's own script tag order, which is one less way to differ
  // from production for no reason).
  w.eval(ROUTING_SRC);
  w.eval(SCHEDULE_ENGINE_SRC);
  w.eval(PRICING_SRC);
  w.eval(BOUNDARY_SRC);

  return { w, warnings };
}

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

export async function computeBoundaryMoneyReport(boundaryScenarioId) {
  const { w, warnings } = buildWindow();
  const Ipricing = w.__pricingInternal;
  const Iboundary = w.__boundaryInternal;

  await Ipricing.bootstrap();
  if (Ipricing.PS.err) {
    throw new Error('Pricing engine bootstrap failed (needed for JuniorFlow): ' + Ipricing.PS.err);
  }
  await Ipricing.ensureFlowData(); // populates FLOW.baseline -- window.JuniorFlow.compute needs this and bootstrap() alone does not set it

  // Boundary Studio's own S.advData -- same underlying file pricing.js
  // loads into PS.adv, loaded here the same way boundary.js itself does.
  Iboundary.S.advData = loadStaticJson('advance-data.json');

  const applied = await hydrateScenario(Iboundary, boundaryScenarioId);
  if (!applied) return null;

  const S = Iboundary.S;
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
    if (perCellByLevel[L]) loads[L] = await cohortLoad(perCellByLevel[L], eligYear, a.tiers[L].name);
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

  return {
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
