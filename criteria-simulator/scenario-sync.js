/*
  scenario-sync.js — GitHub-backed shared scenario library for Criteria Simulator
  --------------------------------------------------------------------------------
  Mirrors schedule-builder/schedule-sync.js. Saves/loads criteria scenarios to
  data/criteria-scenarios/ in the repo so EVERY staff member sees the same saved
  scenarios. Token comes from window.USAD_CONFIG.syncToken (zero-touch for staff).
*/
(function installScenarioSync() {
  const REPO = (window.USAD_CONFIG && window.USAD_CONFIG.repo) || 'mjretcher/usa-diving-staff-apps';
  const BASE = 'data/criteria-scenarios';
  const API  = 'https://api.github.com';

  function getToken() {
    return (window.USAD_CONFIG && window.USAD_CONFIG.syncToken) || '';
  }
  function hasToken() { return !!getToken(); }

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
    const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, opts);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    return res.json();
  }

  // ── Save one scenario → data/criteria-scenarios/{id}.json ──────────
  async function save(scenario) {
    if (!scenario || !scenario.id) throw new Error('Scenario must have an id');
    const path = `${BASE}/${scenario.id}.json`;
    // Strip transient client flags before persisting to the shared store.
    const clean = {
      id: scenario.id,
      name: scenario.name,
      snapshot: scenario.snapshot,
      updated_at: scenario.updated_at || new Date().toISOString(),
    };
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(clean, null, 2))));
    const existing = await ghFetch('GET', path);
    const body = { message: `Save criteria scenario: ${scenario.name || scenario.id}`, content };
    if (existing && existing.sha) body.sha = existing.sha;
    await ghFetch('PUT', path, body);
    return true;
  }

  // ── Load all shared scenarios ──────────────────────────────────────
  async function loadAll() {
    try {
      const files = await ghFetch('GET', BASE);
      if (!Array.isArray(files)) return [];
      const items = await Promise.all(
        files
          .filter(f => f.name.endsWith('.json'))
          .map(async f => {
            const file = await ghFetch('GET', f.path);
            if (!file || !file.content) return null;
            try { return JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\n/g, ''))))); }
            catch { return null; }
          })
      );
      return items.filter(Boolean);
    } catch (e) {
      console.warn('[scenario-sync] load failed:', e);
      return [];
    }
  }

  // ── Delete one shared scenario ─────────────────────────────────────
  async function remove(scenarioId) {
    const path = `${BASE}/${scenarioId}.json`;
    const existing = await ghFetch('GET', path);
    if (!existing) return false;
    await ghFetch('DELETE', path, { message: `Delete criteria scenario: ${scenarioId}`, sha: existing.sha });
    return true;
  }

  window.CriteriaScenarioSync = { save, loadAll, remove, hasToken };
  console.log('[scenario-sync] Ready — GitHub-backed shared scenario library');
})();
