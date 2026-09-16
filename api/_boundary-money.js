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
import { configure } from '../shared/jc/runtime.js';
import { ENGINE_FILES, patchFor } from '../shared/jc/engine-source.js';

// See api/_pricing-engine.js for why this is process.cwd() and not
// import.meta.url/__dirname -- Vercel compiles this file to CommonJS.
const MA_DIR = path.join(process.cwd(), 'membership-analytics');
const SOURCES = ENGINE_FILES.map((f) => patchFor(f, fs.readFileSync(path.join(MA_DIR, f), 'utf8')));

function loadStaticJson(file) {
  const clean = String(file).split('?')[0];
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
  // Same order as the page's own script tags.
  for (const src of SOURCES) w.eval(src);
  return { w, warnings, dispose: () => w.close() };
}

// Server runtime for the shared Junior Circuit core (shared/jc/).
configure({ query: neonQuery, newEngine: async () => buildWindow(), loadJson: async (f) => loadStaticJson(f) });

export { computeBoundaryMoneyReport, hydrateScenario, seedFromZones, withFirstStopSeed } from '../shared/jc/scenario.js';
