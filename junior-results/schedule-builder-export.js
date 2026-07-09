/* ================================================================
   schedule-builder-export.js
   Publishes a point-in-time snapshot of the "possible/projected" Junior
   Nationals field to junior_results.projected_nationals_field, for
   Schedule Builder to read (pre-fill projected entries, athlete-load
   breakdown by age group / gender / zone / East-West-Central).

   Source of truth: this script does NOT recompute qualification. It
   reads `effectiveResults` (the fully-processed array main.js already
   builds — base results + staff overrides + Article 303-306 recompute),
   the exact same array the Nationals tab itself renders from. This is
   the only safe source per the standing rule that the qualifier engine
   is never reimplemented a second time elsewhere.

   Two things get published:
   1. Every row where advancesToNationals is true (Zone-direct or E/W/C-
      derived), for Group A-D individual events (1M/3M/Platform).
   2. The full HPS roster from junior_results.athlete_status — this is
      a live Neon lookup, not a recompute, so it safely picks up HPS
      athletes who haven't posted a result yet this cycle (discipline
      unknown for those rows — Mike confirmed to include them anyway
      for a "max possible field" view at this stage of the builder).

   Manual, on-demand action (button in the topbar) — not automatic.
   Re-publish any time results/overrides change and you want Schedule
   Builder's numbers refreshed.
   ================================================================ */
(function () {
  'use strict';

  var SEASON = 2026;
  var mounted = false;

  function ready() {
    return window.JUNIOR_RESULTS_DATA && Array.isArray(window.JUNIOR_RESULTS_DATA.results)
      && window.NEON && typeof window.NEON.query === 'function';
  }
  function waitFor(cb, tries) {
    tries = tries || 0;
    if (ready()) return cb();
    if (tries > 200) return; // ~20s ceiling, give up quietly — button just won't appear
    setTimeout(function () { waitFor(cb, tries + 1); }, 100);
  }

  function currentResults() {
    // Mirrors qualifier-views.js's own allResults(): prefer the fully-processed
    // effectiveResults (overrides + recompute applied) when available.
    return (typeof effectiveResults !== 'undefined' && Array.isArray(effectiveResults))
      ? effectiveResults
      : (window.JUNIOR_RESULTS_DATA.results || []);
  }

  function normName(v) {
    return String(v || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function diverKey(dmId, athlete) {
    return dmId ? ('dm:' + dmId) : ('nm:' + normName(athlete));
  }
  function mapDiscipline(d) {
    if (d === '1M') return '1-Meter';
    if (d === '3M') return '3-Meter';
    if (d === 'Platform') return 'Platform';
    return null; // Synchro-* and anything outside the Group A-D individual pathway
  }
  var VALID_GROUPS = ['Group A', 'Group B', 'Group C', 'Group D'];

  /* junior_results.athlete_status is fed by multiple upstream sources (see its
     `sources` column: junior_athlete_status, ewc_hps) that were never normalized
     to the Group A-D / Boys-Girls taxonomy used everywhere else. Observed formats:
     "Group A", "Group A Boys", "Group A Girls" (gender folded into age_group),
     age-range strings "11-U"/"12-13"/"14-15"/"16-18" (confirmed 1:1 with D/C/B/A —
     e.g. Alden Charette is hardcoded ageGroup:'Group B' in main.js and shows
     age_group:'14-15' here), and "AQUA 19 Female"/"AQUA 19 Male" which are NOT
     Junior Circuit Groups A-D and are deliberately excluded (no confirmed mapping).
     Without this normalization every HPS row failed the VALID_GROUPS check and
     the roster silently contributed zero rows — see addHpsRosterRows() below. */
  var AGE_RANGE_TO_GROUP = { '16-18': 'Group A', '14-15': 'Group B', '12-13': 'Group C', '11-U': 'Group D' };
  function normalizeHpsAgeGroup(raw) {
    var s = String(raw || '').trim();
    if (VALID_GROUPS.indexOf(s) >= 0) return s;
    var m = s.match(/^(Group [A-D])\s+(Boys|Girls)$/i);
    if (m) return m[1];
    if (AGE_RANGE_TO_GROUP[s]) return AGE_RANGE_TO_GROUP[s];
    return null; // AQUA..., blank, or anything unrecognized — not Junior Circuit
  }
  function normalizeHpsGender(rawGender, rawAgeGroup) {
    var s = String(rawGender || '').trim();
    if (s === 'Boys' || s === 'Girls') return s;
    if (s === 'F') return 'Girls';
    if (s === 'M') return 'Boys';
    var m = String(rawAgeGroup || '').match(/(Boys|Girls)$/i);
    return m ? m[1] : null; // e.g. rawGender was 'Man' or blank — not recognized
  }

  function buildRows() {
    var results = currentResults();
    var rows = new Map();

    results.filter(function (r) { return r.advancesToNationals; }).forEach(function (r) {
      var disc = mapDiscipline(r.discipline);
      if (!disc) return;
      if (VALID_GROUPS.indexOf(r.ageGroup) < 0) return;
      var dm = diverKey(r.diveMeetsId, r.athlete);
      var key = dm + '|' + disc;
      var path = (r.stage === 'EWC' ? 'E/W/C' : 'Zone Direct') + (r.hps ? ' + HPS' : '');
      rows.set(key, {
        diver_key: dm, athlete_name: r.athlete || '', age_group: r.ageGroup, gender: r.gender || '',
        discipline: disc, zone: r.zone || null, ewc_meet: r.ewcMeet || r.ewc || null,
        team: r.team || null, qualification_path: path
      });
    });

    return rows;
  }

  async function addHpsRosterRows(rows) {
    var res;
    try {
      res = await window.NEON.query(
        "SELECT dive_meets_id, name, age_group, gender, zone, ewc_meet, team FROM junior_results.athlete_status WHERE hps = true"
      );
    } catch (e) {
      console.warn('[sb-export] could not load HPS roster (continuing without it)', e);
      return;
    }
    (res.rows || []).forEach(function (a) {
      var dm = diverKey(a.dive_meets_id, a.name);
      var alreadyHas = false;
      rows.forEach(function (v) { if (v.diver_key === dm) alreadyHas = true; });
      if (alreadyHas) return; // already have a real result row for this athlete — don't add a phantom one
      var ag = normalizeHpsAgeGroup(a.age_group);
      var gd = normalizeHpsGender(a.gender, a.age_group);
      if (!ag || !gd) return;
      rows.set(dm + '|__hps_unknown__', {
        diver_key: dm, athlete_name: a.name || '', age_group: ag, gender: gd,
        discipline: null, zone: a.zone || null, ewc_meet: a.ewc_meet || null, team: a.team || null,
        qualification_path: 'HPS (not yet competed)'
      });
    });
  }

  async function publish() {
    if (!ready()) { alert('Still loading results — try again in a few seconds.'); return; }
    var rows = buildRows();
    await addHpsRosterRows(rows);
    var finalRows = [...rows.values()].filter(function (r) { return r.age_group && r.gender; });

    if (!finalRows.length) { alert('No qualifying or HPS rows found — nothing to publish.'); return; }
    var msg = 'Publish ' + finalRows.length + ' athlete rows to Schedule Builder for ' + SEASON
      + '?\n\nThis replaces the previous snapshot. Schedule Builder will show this exact list until you publish again.';
    if (!confirm(msg)) return;

    setStatus('publishing', 'Publishing…');
    try {
      await window.NEON.query('DELETE FROM junior_results.projected_nationals_field WHERE season = $1', [String(SEASON)]);
      var COLS = 10, BATCH = 150;
      for (var i = 0; i < finalRows.length; i += BATCH) {
        var batch = finalRows.slice(i, i + BATCH);
        var values = [], params = [];
        batch.forEach(function (row, bi) {
          var b = bi * COLS;
          values.push('($' + (b + 1) + ',$' + (b + 2) + ',$' + (b + 3) + ',$' + (b + 4) + ',$' + (b + 5)
            + ',$' + (b + 6) + ',$' + (b + 7) + ',$' + (b + 8) + ',$' + (b + 9) + ',$' + (b + 10) + ')');
          params.push(String(SEASON), row.diver_key, row.athlete_name, row.age_group, row.gender,
            row.discipline, row.zone, row.ewc_meet, row.team, row.qualification_path);
        });
        var sql = 'INSERT INTO junior_results.projected_nationals_field '
          + '(season,diver_key,athlete_name,age_group,gender,discipline,zone,ewc_meet,team,qualification_path) VALUES '
          + values.join(',');
        await window.NEON.query(sql, params);
      }
      await refreshStatus();
      setStatus('synced', 'Published ' + finalRows.length + ' rows just now');
    } catch (e) {
      console.error('[sb-export] publish failed', e);
      setStatus('offline', 'Publish failed — see console');
      alert('Publish failed: ' + e.message);
    }
  }

  /* ── Minimal topbar UI, same pattern as the overrides sync indicator ── */
  var pillEl = null, dotEl = null, lblEl = null;

  function setStatus(state, msg) {
    if (!dotEl || !lblEl) return;
    var colors = {
      loading: ['rgba(143,195,234,.5)', 'Loading…'],
      synced: ['#4ade80', msg || 'Published'],
      publishing: ['#fbbf24', msg || 'Publishing…'],
      offline: ['#f87171', msg || 'Not published yet'],
    };
    var c = colors[state] || colors.offline;
    dotEl.style.background = c[0];
    lblEl.textContent = c[1];
  }

  async function refreshStatus() {
    try {
      var r = await window.NEON.query(
        'SELECT count(*)::int AS n, max(published_at) AS t FROM junior_results.projected_nationals_field WHERE season = $1',
        [String(SEASON)]
      );
      var row = (r.rows || [])[0];
      if (row && Number(row.n) > 0) {
        var when = row.t ? new Date(row.t).toLocaleString() : '';
        setStatus('synced', row.n + ' athletes · published ' + when);
      } else {
        setStatus('offline', 'Not published yet');
      }
    } catch (e) {
      setStatus('offline', 'Status unavailable');
    }
  }

  function mount() {
    if (mounted) return;
    var actions = document.querySelector('.topbar-actions');
    if (!actions) return;
    mounted = true;

    pillEl = document.createElement('div');
    pillEl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:0 8px;';
    pillEl.innerHTML =
      '<span class="sb-export-dot" style="width:6px;height:6px;border-radius:50%;background:rgba(200,208,240,.3);flex-shrink:0"></span>' +
      '<span class="sb-export-lbl" style="font-size:11px;font-weight:500;color:rgba(200,208,240,.7)">Loading…</span>' +
      '<button type="button" style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;border:1px solid rgba(200,208,240,.3);background:transparent;color:#fff;cursor:pointer">Publish to Schedule Builder</button>';
    dotEl = pillEl.querySelector('.sb-export-dot');
    lblEl = pillEl.querySelector('.sb-export-lbl');
    pillEl.querySelector('button').addEventListener('click', publish);
    actions.insertBefore(pillEl, actions.firstChild);

    refreshStatus();
  }

  waitFor(mount);
})();
