/* Server-side invocation of Pricing Studio's real calculation engine.
 *
 * WHY THIS EXISTS AND WHY IT WORKS THIS WAY
 * ------------------------------------------------------------------------
 * Boundary Studio scenarios only store a *structure* (regions, level
 * assignments, an optional explicit routing pathway). The numbers people
 * actually care about -- projected field size at the final championship,
 * net revenue -- are not stored anywhere. They are COMPUTED by
 * membership-analytics/pricing.js, in the browser, from that structure plus
 * live membership/competition data.
 *
 * That file is an 8,700-line DOM-coupled application, not a library, so it
 * cannot be `import`ed. Rather than re-derive its math by hand (risking a
 * second implementation that silently drifts from the one Mike's staff
 * actually look at), this loads the REAL, UNMODIFIED source of pricing.js
 * and routing.js into a jsdom window and calls its own real functions --
 * the exact same bootstrap() / applyBoundary() / computeRevenue() sequence
 * the browser runs when a person picks a scenario from the dropdown.
 *
 * VERIFIED BEFORE WRITING THIS FILE (see chat history, 2026-09-08):
 *   - Every function in the bootstrap -> computeRevenue call chain was
 *     grepped individually for DOM/window references. Only one exists
 *     (msg() checking window.USADToast) and it already falls back to
 *     console.log when absent -- confirmed harmless.
 *   - Every one of bootstrap()'s data sources is either a static JSON file
 *     in this same directory (advance-data.json, age-data.json,
 *     senior-prequal.json, squad-rosters.json) or a plain NEON.query() SQL
 *     call against tables this project already queries elsewhere.
 *   - Both real scenarios used to validate this (CCE Proposal,
 *     Counter-Proposal) carry an explicit `routing` array -- routing.js
 *     MUST be loaded alongside pricing.js, or computeVolume() silently
 *     falls back to the wrong (non-routing) calculation with no error.
 *   - Calibration (PS.cal) is derived ONCE against the seed "2026
 *     Alignment" scenario during bootstrap() and deliberately never
 *     re-derived when a different scenario is loaded via applyBoundary() --
 *     confirmed by reading deriveCalibration() and buildReport()'s own
 *     "drifted" check. Re-deriving per scenario would be a real, silent
 *     correctness bug (the report's own comment: "every scenario would
 *     falsely appear to have no effect"). This file replicates the exact
 *     same order: bootstrap() [seeds + calibrates once], THEN
 *     applyBoundary(targetId) [swaps structure only].
 *   - There is no stored membership.pricing_scenarios row for any real
 *     scenario yet (table is empty as of this writing) -- so there is no
 *     saved custom pricing layer to apply. computeRevenue(true) and
 *     computeRevenue(false) are therefore currently identical: both reflect
 *     CURRENT PUBLISHED fees and dues applied to the given structure, not
 *     any hypothetical price change. This is stated explicitly in this
 *     tool's output, not silently assumed.
 *
 * If pricing.js is ever restructured, the export-shim insertion below will
 * throw a clear error (rather than silently doing nothing) if its anchor
 * text no longer matches -- see assertAndInsertShim().
 */

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { neonQuery } from './_neon.js';

// process.cwd(), not import.meta.url/__dirname: Vercel compiles this file to
// CommonJS (no "type":"module" anywhere in this repo, by design -- see
// api/mcp.js's own history tonight), and `import.meta` is a hard SyntaxError
// at parse time under CJS, not just wrong behavior at runtime. process.cwd()
// has no ESM-specific syntax at all, so it works identically whichever way
// this file gets loaded. Vercel functions execute with cwd at the deployment
// root, same layout as this repo checkout, so this resolves correctly in
// both places without needing to know which module system is in play.
const MA_DIR = path.join(process.cwd(), 'membership-analytics');

const ROUTING_SRC = fs.readFileSync(path.join(MA_DIR, 'routing.js'), 'utf8');
const PRICING_SRC_RAW = fs.readFileSync(path.join(MA_DIR, 'pricing.js'), 'utf8');

// The exact literal end of pricing.js as of the date in the comment above.
// Insertion is purely additive -- one new `window.__pricingInternal = {...}`
// assignment inside the existing closure -- and only ever applied to this
// in-memory copy of the source. The committed file on disk (and therefore
// the live browser app) is never touched.
const ANCHOR = '};\n\n})();';
const EXPORT_SHIM = `};

window.__pricingInternal = {
  PS, bootstrap, applyBoundary, computeRevenue, computeVolume,
};

})();`;

if (!PRICING_SRC_RAW.trimEnd().endsWith(ANCHOR.trimEnd())) {
  throw new Error(
    'pricing.js no longer ends with the expected anchor text -- the export shim in ' +
    'api/_pricing-engine.js needs updating before this can be trusted. Refusing to guess.'
  );
}
const PRICING_SRC = PRICING_SRC_RAW.trimEnd().slice(0, -ANCHOR.trimEnd().length) + EXPORT_SHIM;

function loadStaticJson(file) {
  const clean = file.split('?')[0];
  const p = path.join(MA_DIR, clean);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/* One fresh jsdom window per call -- no state carried between requests,
 * matching the stateless pattern already used in api/mcp.js. */
function buildWindow() {
  const dom = new JSDOM('', { runScripts: 'outside-only' });
  const w = dom.window;

  const warnings = [];
  const nativeConsole = w.console;
  w.console = {
    log: (...a) => nativeConsole.log(...a),
    warn: (...a) => { warnings.push(a.map(String).join(' ')); nativeConsole.warn(...a); },
    error: (...a) => { warnings.push(a.map(String).join(' ')); nativeConsole.error(...a); },
  };

  w.NEON = {
    query: async (sql, params) => ({ rows: await neonQuery(sql, params) }),
  };
  w.fetch = async (url) => {
    const data = loadStaticJson(url);
    if (data == null) return { ok: false, status: 404, json: async () => { throw new Error('not found'); } };
    return { ok: true, status: 200, json: async () => data };
  };

  w.eval(ROUTING_SRC);
  w.eval(PRICING_SRC);
  return { w, warnings };
}

/* Total across every event cell in a computeVolume() `final` object -- the
 * projected field size at the championship. Matches exactly how
 * buildReport() computes its own "Field at the final" KPI (tN in that
 * function), just without going through HTML. */
function sumCells(cellObj) {
  return Object.values(cellObj || {}).reduce((s, v) => s + (v || 0), 0);
}

/**
 * Compute the real projected field size and revenue for a Boundary Studio
 * scenario, by running Pricing Studio's own engine headlessly.
 *
 * Returns null if the scenario id doesn't exist. Throws if bootstrap itself
 * fails (bad Neon connectivity, missing static files, etc.) -- that's a
 * real error, not a "no data" case, and callers should not treat it as one.
 */
export async function computeScenarioReport(boundaryScenarioId) {
  const { w, warnings } = buildWindow();
  const I = w.__pricingInternal;

  await I.bootstrap();
  if (I.PS.err) {
    throw new Error('Pricing engine bootstrap failed: ' + I.PS.err);
  }

  const applied = await I.applyBoundary(boundaryScenarioId);
  if (!applied) return null;

  const sim = I.computeRevenue(true); // see file header: identical to false today, no stored pricing overrides exist yet
  const fieldSize = Math.round(sumCells(sim.V.final));

  const cb = I.PS.cal || {};
  const drifted = !!(cb.basis && (cb.basis !== I.PS.boundaryName || cb.regions !== I.PS.regions.length));

  const notes = [];
  notes.push(
    drifted
      ? `Calibration was derived against "${cb.basis}" and held fixed while simulating this scenario, which has a different region count -- this is deliberate (see Pricing Studio's own "drifted" warning) but means the take-up rates are an approximation, not a re-measurement.`
      : 'Reflects current published membership dues and entry fees applied to this scenario\'s structure -- no custom price scenario is saved for this structure yet, so this is not a "proposal-specific" price simulation.'
  );
  if (warnings.length) {
    notes.push(
      'One or more data sources failed to load during computation (see dataLoadWarnings) -- ' +
      'figures derived from those sources may be incomplete, most likely understated, not just imprecise.'
    );
  }

  return {
    scenarioId: I.PS.boundaryId,
    scenarioName: I.PS.boundaryName,
    fieldAtFinal: fieldSize,
    netRevenue: Math.round(sim.net),
    grossRevenue: Math.round(sim.gross),
    membershipDues: Math.round(sim.memberRev),
    juniorCircuitEntryFees: Math.round(sim.eventRev),
    seniorCircuitEntryFees: Math.round(sim.seniorRev),
    diveMeetsPassThrough: Math.round(sim.levyTotal),
    perLevel: sim.perLevel.map((p) => ({
      level: p.name,
      stops: p.stops,
      entries: Math.round(p.entries),
      grossRevenue: Math.round(p.rev),
      netRevenue: Math.round(p.net),
      source: p.source,
    })),
    calibrationBasis: cb.basis || null,
    calibrationDrifted: drifted,
    dataLoadWarnings: warnings,
    notes,
  };
}
