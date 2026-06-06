/*
  schedule-sync.js — GitHub-backed schedule library for Schedule Builder
  -----------------------------------------------------------------------
  Saves/loads schedules to data/schedules/ in the repo.
  Zero-touch for staff — token comes from window.USAD_CONFIG.
*/
(function installScheduleSync() {
  const REPO   = 'mjretcher/usa-diving-staff-apps';
  const BASE   = 'data/schedules';
  const API    = 'https://api.github.com';

  function getToken() {
    return (window.USAD_CONFIG && window.USAD_CONFIG.syncToken) || '';
  }

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

  // ── Save a schedule ────────────────────────────────────────────
  async function saveSchedule(schedule) {
    if (!schedule || !schedule.id) throw new Error('Schedule must have an id');
    const path = `${BASE}/${schedule.id}.json`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(schedule, null, 2))));

    // Get existing SHA if file exists (needed for update)
    const existing = await ghFetch('GET', path);
    const sha = existing ? existing.sha : undefined;

    const body = {
      message: `Save schedule: ${schedule.name || schedule.id}`,
      content,
    };
    if (sha) body.sha = sha;

    await ghFetch('PUT', path, body);
    return true;
  }

  // ── Load all schedules ─────────────────────────────────────────
  async function loadSchedules() {
    try {
      const files = await ghFetch('GET', BASE);
      if (!Array.isArray(files)) return [];
      const schedules = await Promise.all(
        files
          .filter(f => f.name.endsWith('.json'))
          .map(async f => {
            const file = await ghFetch('GET', f.path);
            if (!file || !file.content) return null;
            try {
              return JSON.parse(atob(file.content.replace(/\n/g, '')));
            } catch { return null; }
          })
      );
      return schedules.filter(Boolean);
    } catch (e) {
      console.warn('[schedule-sync] load failed:', e);
      return [];
    }
  }

  // ── Delete a schedule ──────────────────────────────────────────
  async function deleteSchedule(scheduleId) {
    const path = `${BASE}/${scheduleId}.json`;
    const existing = await ghFetch('GET', path);
    if (!existing) return false;
    await ghFetch('DELETE', path, {
      message: `Delete schedule: ${scheduleId}`,
      sha: existing.sha,
    });
    return true;
  }

  // ── Public API ─────────────────────────────────────────────────
  window.ScheduleSync = { saveSchedule, loadSchedules, deleteSchedule };

  console.log('[schedule-sync] Ready — zero-touch GitHub-backed schedule library');
})();
