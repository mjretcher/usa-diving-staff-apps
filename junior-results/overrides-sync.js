/*
  overrides-sync.js — GitHub-backed shared override storage
  ----------------------------------------------------------
  Replaces localStorage-only override persistence with a
  GitHub-API-backed JSON file that any user of the app can
  read and write. Overrides are stored at:
    data/overrides.json  (relative to repo root)

  How it works:
  1. On app load, fetch the latest overrides.json from GitHub.
     Fall back to localStorage if the fetch fails.
  2. After every save, push the updated JSON to GitHub via
     the Contents API. This is a background operation —
     the UI updates instantly, sync happens asynchronously.
  3. A passive 60-second poll refreshes overrides if another
     user has made changes. Only rerenders if the data changed.
  4. A small sync indicator in the topbar shows: syncing / 
     synced / conflict / offline.

  Token is PUBLIC REPO with contents:write scope.
  The token is embedded in the client — this is acceptable for
  an internal staff-only app on a public repo where the data
  is not sensitive (overrides are staff decisions, not PII).
  For higher security, move to a Cloudflare Worker proxy.
*/

(function installOverridesSync() {
  const REPO     = 'mjretcher/usa-diving-staff-apps';
  const PATH     = 'data/overrides.json';
  const API_BASE = 'https://api.github.com';
  // Token comes from window.USAD_CONFIG loaded via data/config.js
  // No setup required — zero-touch for all staff.
  function getToken() {
    return (window.USAD_CONFIG && window.USAD_CONFIG.syncToken) || '';
  }
  const LOCAL_KEY = 'usad.juniorResults.overrides.v2';
  const POLL_MS  = 60_000;

  let _fileSha = null;          // GitHub blob SHA of the last known file
  let _lastContent = null;      // JSON string of last pushed content
  let _syncPending = false;
  let _pollTimer = null;
  let _syncIndicator = null;

  /* ── Indicator UI ──────────────────────────────────────── */
  function mountIndicator() {
    // Token auto-loaded from window.USAD_CONFIG — no setup needed
  function _mountBody() {
    const el = document.createElement('div');
    el.id = 'syncIndicator';
    el.style.cssText = `
      display:flex;align-items:center;gap:5px;
      font-size:11px;font-weight:500;
      color:rgba(200,208,240,.5);
      padding:0 8px;
    `;
    el.innerHTML = `<span class="sync-dot" style="width:6px;height:6px;border-radius:50%;background:rgba(200,208,240,.3);flex-shrink:0"></span><span class="sync-label">Loading overrides…</span>`;
    const actions = document.querySelector('.topbar-actions');
    if (actions) actions.insertBefore(el, actions.firstChild);
    _syncIndicator = el;
  } _mountBody(); }

  function setIndicator(state, msg) {
    if (!_syncIndicator) return;
    const dot = _syncIndicator.querySelector('.sync-dot');
    const lbl = _syncIndicator.querySelector('.sync-label');
    const colors = {
      loading: ['rgba(143,195,234,.5)', 'Loading…'],
      synced:  ['#4ade80', msg || 'Overrides synced'],
      syncing: ['#fbbf24', 'Saving…'],
      offline: ['#f87171', 'Offline — saved locally'],
      conflict:['#fb923c', 'Sync conflict — refresh'],
    };
    const [color, label] = colors[state] || colors.offline;
    dot.style.background = color;
    if (state === 'syncing') dot.style.animation = 'syncPulse 1s infinite';
    else dot.style.animation = '';
    lbl.textContent = label;

    // Auto-hide "synced" after 4s
    if (state === 'synced') {
      clearTimeout(_syncIndicator._hideTimer);
      _syncIndicator._hideTimer = setTimeout(() => {
        lbl.textContent = '';
        dot.style.background = 'rgba(200,208,240,.2)';
      }, 4000);
    }
  }

  /* ── GitHub API helpers ────────────────────────────────── */
  async function ghFetch(method, path, body) {
    const opts = {
      method,
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${path}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`GitHub ${res.status}: ${err.message || res.statusText}`);
    }
    return res.json();
  }

  /* ── Load from GitHub ──────────────────────────────────── */
  async function loadFromGitHub() {
    try {
      const data = await ghFetch('GET', PATH);
      _fileSha = data.sha;
      const decoded = atob(data.content.replace(/\n/g, ''));
      const overrides = JSON.parse(decoded);
      _lastContent = JSON.stringify(overrides);
      return Array.isArray(overrides) ? overrides : [];
    } catch (e) {
      // 404 = file doesn't exist yet, start fresh
      if (e.message.includes('404')) return [];
      throw e;
    }
  }

  /* ── Push to GitHub ────────────────────────────────────── */
  async function pushToGitHub(overrides) {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(overrides, null, 2))));
    const body = {
      message: `Override update · ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC`,
      content,
    };
    if (_fileSha) body.sha = _fileSha;

    try {
      const result = await ghFetch('PUT', PATH, body);
      _fileSha = result.content.sha;
      _lastContent = JSON.stringify(overrides);
      return true;
    } catch (e) {
      // 409 = SHA conflict (another user saved between our load and our push)
      // Reload the file and merge
      if (e.message.includes('409') || e.message.includes('conflict')) {
        await handleConflict(overrides);
        return false;
      }
      throw e;
    }
  }

  /* ── Conflict resolution: merge by override ID ─────────── */
  async function handleConflict(localOverrides) {
    setIndicator('conflict');
    try {
      const remote = await loadFromGitHub();
      const remoteIds = new Set(remote.map(o => o.id));
      // Add any local overrides not in remote
      const merged = [...remote];
      for (const o of localOverrides) {
        if (!remoteIds.has(o.id)) merged.push(o);
      }
      await pushToGitHub(merged);
      // Update local state
      if (typeof state !== 'undefined') {
        state.overrides = merged;
        localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
        if (typeof recompute === 'function') recompute();
        if (typeof renderAll === 'function') renderAll();
      }
    } catch (err) {
      console.warn('[overrides-sync] conflict resolution failed:', err);
    }
  }

  /* ── Poll for remote changes ───────────────────────────── */
  async function pollRemote() {
    if (_syncPending) return;
    try {
      const data = await ghFetch('GET', PATH);
      if (data.sha === _fileSha) return; // nothing changed
      _fileSha = data.sha;
      const decoded = atob(data.content.replace(/\n/g, ''));
      const remote = JSON.parse(decoded);
      const remoteStr = JSON.stringify(remote);
      if (remoteStr === _lastContent) return;
      _lastContent = remoteStr;
      // Update the app with new overrides
      if (typeof state !== 'undefined') {
        state.overrides = Array.isArray(remote) ? remote : [];
        localStorage.setItem(LOCAL_KEY, JSON.stringify(state.overrides));
        if (typeof recompute === 'function') recompute();
        if (typeof renderAll === 'function') renderAll();
        setIndicator('synced', 'Overrides updated');
      }
    } catch (e) {
      // Silent — poll failures are fine
    }
  }

  /* ── Public API ────────────────────────────────────────── */
  window.OverridesSync = {

    async init() {
      mountIndicator();
      setIndicator('loading');

      // Add CSS for sync pulse
      const style = document.createElement('style');
      style.textContent = `
        @keyframes syncPulse {
          0%,100% { opacity:1; } 50% { opacity:.3; }
        }
      `;
      document.head.appendChild(style);

      // Load from GitHub, fall back to localStorage
      let overrides = [];
      try {
        overrides = await loadFromGitHub();
        // If local has newer entries not on GitHub, merge them up
        const localRaw = localStorage.getItem(LOCAL_KEY);
        if (localRaw) {
          const local = JSON.parse(localRaw);
          const remoteIds = new Set(overrides.map(o => o.id));
          const localOnly = local.filter(o => !remoteIds.has(o.id));
          if (localOnly.length > 0) {
            overrides = [...overrides, ...localOnly];
            await pushToGitHub(overrides); // push merged immediately
          }
        }
        setIndicator('synced', `Overrides loaded`);
      } catch (e) {
        console.warn('[overrides-sync] init failed, using localStorage:', e);
        const localRaw = localStorage.getItem(LOCAL_KEY);
        overrides = localRaw ? JSON.parse(localRaw) : [];
        setIndicator('offline');
      }

      // Patch state — this is called before init() but after state is declared
      if (typeof state !== 'undefined') {
        state.overrides = overrides;
        localStorage.setItem(LOCAL_KEY, JSON.stringify(overrides));
      }

      // Start poll
      _pollTimer = setInterval(pollRemote, POLL_MS);
    },

    async save(overrides) {
      // Always save to localStorage immediately (synchronous safety net)
      localStorage.setItem(LOCAL_KEY, JSON.stringify(overrides));

      if (_syncPending) return; // debounce: don't queue multiple saves
      _syncPending = true;
      setIndicator('syncing');

      // Small debounce so rapid override additions batch together
      await new Promise(r => setTimeout(r, 800));
      _syncPending = false;

      try {
        await pushToGitHub(overrides);
        setIndicator('synced');
      } catch (e) {
        console.warn('[overrides-sync] push failed:', e);
        setIndicator('offline');
      }
    },

    stop() {
      clearInterval(_pollTimer);
    }
  };

})();
