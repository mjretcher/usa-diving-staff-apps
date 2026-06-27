/* shared/usad-data.js — USA Diving Staff data loader
   ------------------------------------------------------------
   Loads canonical data from Neon, caches in IndexedDB, falls back
   to a local data.js fallback file if Neon is unreachable.

   Usage:
     const data = await USAD.data.load({
       cacheKey: 'criteria-sim-v1',
       versionKey: 'criteria_simulator_data_version', // app_meta.config row
       fallback: { src: '../data/criteria-data.js', global: 'DIVE_APP_DATA' },
       queries: [
         { name: 'results', sql: 'SELECT * FROM core.result_phases' },
         { name: 'dives',   sql: 'SELECT * FROM core.dive_sheets'   }
       ],
       onProgress: (msg) => console.log(msg)
     });
     // data = { results: [...], dives: [...], _source: 'neon'|'cache'|'fallback' }
   ------------------------------------------------------------ */
(function () {
  'use strict';

  const DB_NAME = 'usad-data';
  const DB_VERSION = 1;
  const STORE = 'payloads';

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'cacheKey' });
        }
      };
      req.onsuccess = (ev) => resolve(ev.target.result);
      req.onerror = (ev) => reject(ev.target.error);
    });
  }

  async function idbGet(cacheKey) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(cacheKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPut(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDelete(cacheKey) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(cacheKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function progress(opts, msg) {
    if (opts.onProgress) {
      try { opts.onProgress(msg); } catch (e) { /* ignore */ }
    }
  }

  async function readNeonVersion(versionKey) {
    if (!versionKey || !window.NEON) return null;
    try {
      const r = await window.NEON.query(
        'SELECT value FROM app_meta.config WHERE key = $1', [versionKey]
      );
      return r.rows[0]?.value || null;
    } catch (e) {
      return null;
    }
  }

  async function fetchFromNeon(opts) {
    if (!window.NEON) throw new Error('NEON client not loaded');
    const out = {};
    for (const q of opts.queries) {
      progress(opts, `Loading ${q.name}\u2026`);
      const r = await window.NEON.query(q.sql, q.params || []);
      out[q.name] = r.rows;
    }
    return out;
  }

  function loadFallbackScript(src, globalName) {
    return new Promise((resolve, reject) => {
      // Already loaded?
      if (globalName && window[globalName]) {
        resolve(window[globalName]);
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => {
        if (globalName && window[globalName]) resolve(window[globalName]);
        else resolve(null);
      };
      s.onerror = () => reject(new Error('Failed to load fallback ' + src));
      document.head.appendChild(s);
    });
  }

  async function load(opts) {
    const cacheKey = opts.cacheKey;
    if (!cacheKey) throw new Error('cacheKey required');

    // 1. Try cache
    let cached = null;
    try { cached = await idbGet(cacheKey); } catch (e) { cached = null; }

    // 2. Read remote version to see if cache is still fresh
    const remoteVersion = await readNeonVersion(opts.versionKey);

    if (cached && remoteVersion && cached.version === remoteVersion) {
      progress(opts, 'Loaded from cache.');
      return Object.assign({}, cached.payload, { _source: 'cache', _version: remoteVersion });
    }

    // 3. Try Neon (fresh fetch)
    try {
      progress(opts, 'Connecting to Neon\u2026');
      const payload = await fetchFromNeon(opts);
      const record = {
        cacheKey,
        version: remoteVersion || String(Date.now()),
        fetchedAt: new Date().toISOString(),
        payload
      };
      try { await idbPut(record); } catch (e) { /* not fatal */ }
      progress(opts, 'Loaded from Neon.');
      return Object.assign({}, payload, { _source: 'neon', _version: record.version });
    } catch (neonErr) {
      // 4. Use cache if we have any cache at all (even if version drifted)
      if (cached) {
        progress(opts, 'Neon unreachable; using cached copy.');
        return Object.assign({}, cached.payload, {
          _source: 'cache-stale',
          _version: cached.version,
          _neonError: String(neonErr.message || neonErr)
        });
      }
      // 5. Last resort: local fallback file
      if (opts.fallback && opts.fallback.src) {
        progress(opts, 'Neon unreachable; loading local fallback\u2026');
        try {
          const localPayload = await loadFallbackScript(opts.fallback.src, opts.fallback.global);
          if (localPayload) {
            // Normalise: if fallback global is something like DIVE_APP_DATA = {results, dives, meta},
            // pass it through as-is.
            return Object.assign({}, localPayload, {
              _source: 'fallback',
              _neonError: String(neonErr.message || neonErr)
            });
          }
        } catch (fbErr) {
          throw new Error(
            'Could not load data. Neon: ' + neonErr.message +
            ' | Fallback: ' + fbErr.message
          );
        }
      }
      throw neonErr;
    }
  }

  async function clearCache(cacheKey) {
    try { await idbDelete(cacheKey); return true; } catch (e) { return false; }
  }

  window.USAD = window.USAD || {};
  window.USAD.data = { load, clearCache };
})();
