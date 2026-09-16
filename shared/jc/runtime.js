/* Junior Circuit report core -- runtime adapters.
 *
 * The same modules in shared/jc/ run in two places:
 *   - on the server (api/*, the MCP tools, api/check-invariants.mjs), where
 *     api/_node-runtime.js plugs in Neon over HTTP, a jsdom window and fs;
 *   - in the browser (Membership Analytics -> Reports), where
 *     membership-analytics/jc-browser.js plugs in window.NEON, a hidden
 *     iframe and fetch.
 * One implementation, so the report on screen is the report the checks test.
 *
 *   query(sql, params) -> Promise<row objects>
 *   newEngine()        -> Promise<{ w, warnings, dispose }>  w.__boundaryInternal,
 *                         w.__pricingInternal, w.QualRouting, w.JuniorFlow
 *   loadJson(name)     -> Promise<object|null>  a file in membership-analytics/
 */
export const rt = { query: null, newEngine: null, loadJson: null };
export function configure(adapters) { Object.assign(rt, adapters); }
export function q(sql, params = []) {
  if (!rt.query) throw new Error('Junior Circuit core: no query adapter configured');
  return rt.query(sql, params);
}
const live = new Set();
export async function engine() {
  if (!rt.newEngine) throw new Error('Junior Circuit core: no engine adapter configured');
  const e = await rt.newEngine();
  if (e && e.dispose) live.add(e);
  return e;
}
/* Release every engine window created so far (the report calls this when done). */
export function disposeEngines() {
  for (const e of live) { try { e.dispose(); } catch (_) { /* already gone */ } }
  live.clear();
}
export async function json(name) {
  if (!rt.loadJson) throw new Error('Junior Circuit core: no file adapter configured');
  return rt.loadJson(name);
}
