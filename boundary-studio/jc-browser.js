/* Browser runtime for the shared Junior Circuit core (shared/jc/).
 *
 * The server plugs in Neon-over-HTTP, a jsdom window and the filesystem
 * (api/_boundary-money.js). This file plugs in the page's own equivalents:
 *   query     -> window.NEON (the same read client every tab uses)
 *   newEngine -> a hidden same-origin iframe running the real, unmodified
 *                routing.js / scenario-schedule-engine.js / pricing.js /
 *                boundary.js, so a report run never touches the live map's state
 *   loadJson  -> the static data files next to this page
 */
import { configure } from '../shared/jc/runtime.js';
import { ENGINE_FILES, patchFor } from '../shared/jc/engine-source.js';

// One engine and one data set for every report, whichever app opens it: the
// code is the live Boundary Studio (boundary-studio/), the data is what the build
// workflows write (membership-analytics/). Each app used to load its own copies,
// and membership-analytics/boundary.js had been frozen since the 9/17 split.
const BASE = new URL('../membership-analytics/', import.meta.url);
const ENGINE_BASE = new URL('../boundary-studio/', import.meta.url);
const textCache = new Map();

async function fetchText(name) {
  const clean = String(name).split('?')[0];
  if (!textCache.has(clean)) {
    textCache.set(clean, fetch(new URL(clean, BASE), { cache: 'no-cache' }).then(async (r) => {
      if (!r.ok) return null;
      return r.text();
    }).catch(() => null));
  }
  return textCache.get(clean);
}

async function loadJson(name) {
  const t = await fetchText(name);
  return t == null ? null : JSON.parse(t); // fresh copy every call; the engine mutates what it loads
}

let sourcesP = null;
function engineSources() {
  if (!sourcesP) {
    sourcesP = Promise.all(ENGINE_FILES.map(async (f) => {
      const t = await fetchText(new URL(f, ENGINE_BASE).href);
      if (t == null) throw new Error(`Could not load ${f} for the report engine.`);
      return patchFor(f, t);
    }));
    sourcesP.catch(() => { sourcesP = null; });
  }
  return sourcesP;
}

async function newEngine() {
  const sources = await engineSources();
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = '<!doctype html><html><head></head><body></body></html>';
  const loaded = new Promise((res) => frame.addEventListener('load', res, { once: true }));
  document.body.appendChild(frame);
  await loaded;
  const w = frame.contentWindow;
  const warnings = [];
  const pc = window.console;
  w.console = {
    log: () => {}, info: () => {}, debug: () => {},
    warn: (...a) => { warnings.push(a.map(String).join(' ')); pc.warn('[report engine]', ...a); },
    error: (...a) => { warnings.push(a.map(String).join(' ')); pc.error('[report engine]', ...a); },
  };
  w.NEON = window.NEON;
  w.fetch = async (url) => {
    const t = await fetchText(url);
    if (t == null) return { ok: false, status: 404, json: async () => { throw new Error('not found: ' + url); }, text: async () => '' };
    return { ok: true, status: 200, json: async () => JSON.parse(t), text: async () => t };
  };
  for (const src of sources) w.eval(src);
  return { w, warnings, dispose: () => frame.remove() };
}

configure({
  // Neon's HTTP API wants every bound parameter as a string (same as the server adapter).
  query: async (sql, params) => (await window.NEON.query(sql, (params || []).map((p) => (p == null ? null : String(p))))).rows,
  newEngine,
  loadJson,
});

export { loadJson };
