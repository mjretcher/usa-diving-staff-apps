/* ============================================================================
   hps-tracker.js — Junior High Performance Squad tracker

   Reproduces, from scraped results, the sheet the HP Director builds by hand
   after Junior Nationals. Two qualifying pathways, per the 2026-2027 Junior
   High Performance Squad Selection Criteria:

     1. TARGET SCORE  — Groups A, B and C hitting a published total at the
        2026 Junior National Championships (preliminaries or finals).

     2. VOLUNTARY     — Group C as an alternative route, and Group D as a
        discretionary benchmark: an average judge score of 7.0 or higher on
        the voluntary dives in the preliminaries.

   HOW THE VOLUNTARY TEST WORKS, and why it is per dive.
   A dive's award is the sum of the surviving judges after the highest and
   lowest are struck — three judges survive on an individual event — and that
   sum is then multiplied by the degree of difficulty. So "all 7s" is a
   surviving-judge sum of 21.0, and DiveMeets stores that sum directly as
   net_score. Verified across the whole crawl: net_score never exceeds 30 on
   an individual event.

   The criteria say "an average judge score of 7.0 or higher on all voluntary
   dives", which could be read as an average across the dives. It is applied
   per dive. Confirmed by Mike and by the HP Director's own sheet: Raine
   Rutter's 2026 Group C Platform voluntaries were 23, 24, 23.5 and 20.5 —
   an average of 22.75, comfortably clear — and were annotated "off by .5",
   which only makes sense if the 20.5 dive fails on its own. The average is
   still shown alongside, because the sheet doubles as a discretionary-review
   record and near misses are the point.

   SYNCHRO IS EXCLUDED from the voluntary test. A synchro panel leaves five
   judges standing rather than three, so net_score runs to 50 and 21.0 means
   nothing there. Synchro qualifies on total points only.

   NOT YET AUTOMATED: AQUA age. Group A targets split at AQUA 16/17 vs 18/19,
   and DiveMeets does not publish a diver's age on any page the crawler can
   reach. membership.members holds birth_date but carries no name by design,
   so it cannot be joined to a diver. Group A divers who clear the higher
   18/19 bar qualify whatever their age; those landing between the two bars
   are listed separately for the HP Director to resolve by hand.
   ========================================================================= */
(function () {
  'use strict';

  var MEET_ID = 12923;              // 2026 USA Diving Junior National Championships
  var VOL_TARGET = 21.0;            // 3 surviving judges x 7.0

  /* Published 2026 target scores. Group A carries two, keyed by AQUA age. */
  var TARGETS = {
    'Girls|A|3M':  { aqua1617: 400, aqua1819: 414 },
    'Girls|A|PL':  { aqua1617: 364, aqua1819: 379 },
    'Girls|B|3M':  { flat: 350 },
    'Girls|B|PL':  { flat: 315 },
    'Girls|C|3M':  { flat: 290 },
    'Girls|C|PL':  { flat: 250 },
    'Boys|A|3M':   { aqua1617: 475, aqua1819: 491 },
    'Boys|A|PL':   { aqua1617: 441, aqua1819: 456 },
    'Boys|B|3M':   { flat: 420 },
    'Boys|B|PL':   { flat: 385 },
    'Boys|C|3M':   { flat: 344 },
    'Boys|C|PL':   { flat: 310 },
    'Girls|AB|SYNC3M': { flat: 249 },
    'Girls|AB|SYNCPL': { flat: 249 },
    'Boys|AB|SYNC3M':  { flat: 264 },
    'Boys|AB|SYNCPL':  { flat: 264 }
  };

  /* 1m carries no published target. It is still shown, because the voluntary
     pathway is worded as "voluntary dives performed during preliminaries"
     without naming an event, so a Group C or D diver can meet the benchmark
     on 1m. Score-pathway 1m rows are informational only and never marked
     qualified. */
  var NO_TARGET_NOTE = 'No published target score for 1m — shown for reference.';

  var state = { rows: null, vols: null, loading: false, error: null,
                showNearMiss: true, meetName: '', hasSynchro: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(v, d) {
    if (v == null || v === '') return '';
    var n = Number(v);
    if (!isFinite(n)) return String(v);
    return (d == null) ? String(n) : n.toFixed(d).replace(/\.?0+$/, '');
  }

  /* ── Classify an event title into group / gender / board ──────────────── */
  function classify(title) {
    var t = title || '';
    var gender = /girls/i.test(t) ? 'Girls' : (/boys/i.test(t) ? 'Boys' : null);
    var synchro = /synchro/i.test(t);
    var board = /platform|tower/i.test(t) ? 'PL' : (/\b3m\b/i.test(t) ? '3M'
              : (/\b1m\b/i.test(t) ? '1M' : null));
    var group = null;
    if (/group\s*a\b|16-18/i.test(t)) group = 'A';
    else if (/group\s*b\b|14-15/i.test(t)) group = 'B';
    else if (/group\s*c\b|12-13/i.test(t)) group = 'C';
    else if (/group\s*d\b|11\s*(&|and)\s*under/i.test(t)) group = 'D';
    if (synchro && /group\s*a\/b|a\/b/i.test(t)) group = 'AB';
    return { gender: gender, group: group, board: board, synchro: synchro };
  }

  function targetFor(c) {
    if (!c.gender || !c.group || !c.board) return null;
    var key = c.synchro
      ? c.gender + '|AB|SYNC' + c.board
      : c.gender + '|' + c.group + '|' + c.board;
    return TARGETS[key] || null;
  }

  function roundLabel(r) {
    return String(r) === '1' ? 'Preliminaries' : (String(r) === '9' ? 'Finals' : 'Semifinal');
  }

  /* ── Load ─────────────────────────────────────────────────────────────── */

  /* Every panel file is its own IIFE, so the neonQuery helper in
     reports-view.js is private to that file and not reachable here. This is a
     local copy of the same two-line wrapper over the shared client. */
  async function neonQuery(sql, params) {
    if (!window.NEON || !window.NEON.query) {
      throw new Error('Neon client not loaded (shared/neon-client.js)');
    }
    return await window.NEON.query(sql, params || []);
  }

  async function load() {
    state.loading = true; state.error = null;
    try {
      var res = await neonQuery(
        "SELECT e.title, r.round, r.place, r.diver_name, r.profile_id::text AS profile_id, " +
        "       r.team_name, r.score, r.sheet_key::text AS sheet_key, r.event_id::text AS event_id " +
        "FROM divemeets.results r " +
        "JOIN divemeets.events e ON e.meet_id=r.meet_id AND e.event_id=r.event_id AND e.round=r.round " +
        "WHERE r.meet_id=" + MEET_ID + " AND r.score IS NOT NULL " +
        "ORDER BY e.title, r.round, r.score DESC");
      state.rows = (res && res.rows) || [];

      /* The published criteria carry synchro target scores, but synchro results
         are only shown if the crawl actually holds them. As of the 2026 crawl it
         does not, and an empty synchro section would read as "nobody qualified"
         rather than "not checked". Detected rather than hard-coded, so this note
         disappears by itself once synchro is crawled. */
      state.hasSynchro = state.rows.some(function (r) {
        return /synchro/i.test(r.title || '');
      });

      // Voluntary dives, preliminaries only, individual events only.
      // DiveMeets tags a dive V, O or S. S appears only on Group D platform
      // sheets, exactly once per diver, always in the first dive slot. It is a
      // VOLUNTARY: Art. 302.2(a)(3) sets Group D platform at four voluntaries
      // plus two optionals, and the crawl holds 3 V + 1 S + 2 O — so S is the
      // fourth voluntary, and the four V+S degrees of difficulty sum to just
      // under the 7.6 cap that rule places on the voluntary list. Filtering on
      // 'V' alone tested Group D platform on three of its four voluntaries and
      // understated one near miss.
      var vol = await neonQuery(
        "SELECT e.title, s.sheet_key::text AS sheet_key, s.dive_order, s.dive_number, " +
        "       s.net_score, r.diver_name, r.profile_id::text AS profile_id, r.team_name " +
        "FROM divemeets.sheet_dives s " +
        "JOIN divemeets.events e ON e.meet_id=s.meet_id AND e.event_id=s.event_id AND e.round=s.round " +
        "LEFT JOIN divemeets.results r ON r.meet_id=s.meet_id AND r.event_id=s.event_id " +
        "     AND r.round=s.round AND r.sheet_key=s.sheet_key " +
        "WHERE s.meet_id=" + MEET_ID + " AND s.round='1' AND s.opt_vol IN ('V','S') " +
        "  AND e.title !~* 'synchro' " +
        "ORDER BY e.title, r.diver_name, s.dive_order");
      state.vols = (vol && vol.rows) || [];

      var mn = await neonQuery(
        "SELECT meet_name FROM divemeets.meets WHERE meet_id=" + MEET_ID);
      state.meetName = (mn && mn.rows && mn.rows[0] && mn.rows[0].meet_name) || ('Meet ' + MEET_ID);
    } catch (e) {
      state.error = String(e && e.message || e);
    }
    state.loading = false;
  }

  /* ── Score pathway ────────────────────────────────────────────────────── */
  function scoreBlocks() {
    var by = {};
    state.rows.forEach(function (r) {
      var c = classify(r.title);
      if (!c.gender || !c.board) return;
      var k = [c.gender, c.synchro ? 'AB-Synchro' : ('Group ' + c.group), c.board,
               roundLabel(r.round)].join('|');
      (by[k] = by[k] || { c: c, round: roundLabel(r.round), rows: [] }).rows.push(r);
    });
    return Object.keys(by).sort().map(function (k) {
      var b = by[k], t = targetFor(b.c);
      var parts = k.split('|');
      b.key = k;
      b.label = parts[0] + ' ' + parts[1] + ' ' + (parts[2] === 'PL' ? 'Platform' : parts[2]);
      b.target = t;
      b.noTarget = !t;
      b.qualified = [];
      b.ageDependent = [];
      b.rows.forEach(function (r) {
        var sc = Number(r.score);
        if (!t) return;
        if (t.flat != null) {
          if (sc >= t.flat) b.qualified.push(r);
        } else {
          // Group A: clears the 18/19 bar => qualified whatever the age.
          if (sc >= t.aqua1819) b.qualified.push(r);
          else if (sc >= t.aqua1617) b.ageDependent.push(r);
        }
      });
      return b;
    });
  }

  /* ── Voluntary pathway ────────────────────────────────────────────────── */
  function volBlocks() {
    var by = {};
    state.vols.forEach(function (v) {
      var c = classify(v.title);
      if (!c.gender || !c.group || (c.group !== 'C' && c.group !== 'D')) return;
      var k = [c.gender, 'Group ' + c.group, c.board].join('|');
      var blk = (by[k] = by[k] || { c: c, key: k, divers: {} });
      var id = v.sheet_key;
      var d = (blk.divers[id] = blk.divers[id] || {
        name: v.diver_name || '(unmatched sheet)', team: v.team_name || '', dives: []
      });
      d.dives.push({ order: v.dive_order, number: v.dive_number, judges: Number(v.net_score) });
    });
    return Object.keys(by).sort().map(function (k) {
      var b = by[k], parts = k.split('|');
      b.label = parts[0] + ' ' + parts[1] + ' ' + (parts[2] === 'PL' ? 'Platform' : parts[2]);
      b.met = []; b.nearMiss = []; b.no = [];
      Object.keys(b.divers).forEach(function (id) {
        var d = b.divers[id];
        d.dives.sort(function (a, z) { return a.order - z.order; });
        var shorts = d.dives.filter(function (x) { return x.judges < VOL_TARGET; });
        d.worstShort = shorts.length
          ? Math.max.apply(null, shorts.map(function (x) { return VOL_TARGET - x.judges; }))
          : 0;
        d.shortCount = shorts.length;
        d.avg = d.dives.length
          ? d.dives.reduce(function (s, x) { return s + x.judges; }, 0) / d.dives.length : 0;
        if (!shorts.length) b.met.push(d);
        else if (d.worstShort <= 1.5) b.nearMiss.push(d);
        else b.no.push(d);
      });
      var byName = function (a, z) { return a.name.localeCompare(z.name); };
      b.met.sort(byName);
      b.nearMiss.sort(function (a, z) { return a.worstShort - z.worstShort; });
      return b;
    });
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  function rowLine(r, extra) {
    return '<tr><td class="hps-pl">' + esc(r.place) + '</td>' +
      '<td class="hps-nm">' + esc(r.diver_name) + '</td>' +
      '<td class="hps-tm">' + esc(r.team_name || '') + '</td>' +
      '<td class="hps-sc">' + num(r.score, 2) + '</td>' +
      (extra ? '<td class="hps-note">' + extra + '</td>' : '') + '</tr>';
  }

  function renderScore(blocks) {
    return blocks.map(function (b) {
      if (b.noTarget && b.c.board !== '1M') return '';
      var head, body;
      if (b.noTarget) {
        head = '<span class="hps-target hps-target-none">no target</span>';
        body = '<p class="hps-soft">' + esc(NO_TARGET_NOTE) + '</p>';
      } else {
        head = b.target.flat != null
          ? '<span class="hps-target">' + b.target.flat + ' pts</span>'
          : '<span class="hps-target">' + b.target.aqua1617 + ' pts (AQUA 16/17)</span>' +
            '<span class="hps-target">' + b.target.aqua1819 + ' pts (AQUA 18/19)</span>';
        body = '';
        if (b.qualified.length) {
          body += '<table class="hps-table"><thead><tr><th>Pl</th><th>Diver</th><th>Team</th><th>Score</th></tr></thead><tbody>' +
            b.qualified.map(function (r) { return rowLine(r); }).join('') + '</tbody></table>';
        }
        if (b.ageDependent.length) {
          body += '<p class="hps-soft hps-agewarn"><b>Age-dependent —</b> these clear the AQUA 16/17 target but not the 18/19 target, so whether they qualify depends on the diver\'s AQUA age, which DiveMeets does not publish. Confirm by hand.</p>' +
            '<table class="hps-table hps-table-age"><thead><tr><th>Pl</th><th>Diver</th><th>Team</th><th>Score</th><th>Short of 18/19</th></tr></thead><tbody>' +
            b.ageDependent.map(function (r) {
              return rowLine(r, num(b.target.aqua1819 - Number(r.score), 2) + ' pts');
            }).join('') + '</tbody></table>';
        }
        if (!b.qualified.length && !b.ageDependent.length) {
          body += '<p class="hps-soft">No diver reached the target in this event.</p>';
        }
      }
      return '<section class="hps-block"><h3 class="hps-h3">' + esc(b.label) +
        ' <span class="hps-round">' + esc(b.round) + '</span> ' + head + '</h3>' + body + '</section>';
    }).join('');
  }

  function volRow(d, showShort) {
    return '<tr><td class="hps-nm">' + esc(d.name) + '</td>' +
      '<td class="hps-tm">' + esc(d.team) + '</td>' +
      '<td class="hps-dives">' + d.dives.map(function (x) {
        return '<span class="hps-dv ' + (x.judges < VOL_TARGET ? 'is-short' : '') + '" title="' +
          esc(x.number) + '">' + num(x.judges, 1) + '</span>';
      }).join('') + '</td>' +
      '<td class="hps-sc">' + num(d.avg, 2) + '</td>' +
      (showShort ? '<td class="hps-note">off by ' + num(d.worstShort, 1) +
        (d.shortCount > 1 ? ' on ' + d.shortCount + ' dives' : '') + '</td>' : '') + '</tr>';
  }

  function renderVol(blocks) {
    return blocks.map(function (b) {
      var isD = b.c.group === 'D';
      var body = '';
      if (b.met.length) {
        body += '<table class="hps-table"><thead><tr><th>Diver</th><th>Team</th><th>Voluntary dives (judge total)</th><th>Avg</th></tr></thead><tbody>' +
          b.met.map(function (d) { return volRow(d, false); }).join('') + '</tbody></table>';
      } else {
        body += '<p class="hps-soft">No diver cleared 21.0 on every voluntary in this event.</p>';
      }
      if (state.showNearMiss && b.nearMiss.length) {
        body += '<p class="hps-soft"><b>Near misses</b> — short on at least one dive by 1.5 or less.</p>' +
          '<table class="hps-table hps-table-near"><thead><tr><th>Diver</th><th>Team</th><th>Voluntary dives (judge total)</th><th>Avg</th><th>Shortfall</th></tr></thead><tbody>' +
          b.nearMiss.map(function (d) { return volRow(d, true); }).join('') + '</tbody></table>';
      }
      return '<section class="hps-block"><h3 class="hps-h3">' + esc(b.label) +
        ' <span class="hps-round">Preliminaries</span>' +
        '<span class="hps-target">21.0 on each voluntary</span>' +
        (isD ? '<span class="hps-disc">discretionary</span>' : '') + '</h3>' +
        (isD ? '<p class="hps-soft">Group D is a discretionary benchmark. Meeting it does not guarantee selection; the High Performance Director reviews in consultation with the CCE.</p>' : '') +
        body + '</section>';
    }).join('');
  }

  window.renderHpsTrackerPanel = async function (wrap) {
    if (!state.rows && !state.loading) {
      wrap.innerHTML = '<div class="hps-loading">Loading Junior Nationals results…</div>';
      await load();
    }
    if (state.error) {
      wrap.innerHTML = '<div class="hps-error">Could not load: ' + esc(state.error) + '</div>';
      return;
    }
    var sBlocks = scoreBlocks(), vBlocks = volBlocks();
    var totalQual = sBlocks.reduce(function (n, b) { return n + b.qualified.length; }, 0);
    var totalAge = sBlocks.reduce(function (n, b) { return n + b.ageDependent.length; }, 0);
    var totalVol = vBlocks.reduce(function (n, b) { return n + b.met.length; }, 0);

    wrap.innerHTML =
      '<div class="hps-wrap">' +
      '<header class="hps-head">' +
        '<h2 class="hps-h2">2026–2027 Junior High Performance Squad — tracker</h2>' +
        '<p class="hps-sub">' + esc(state.meetName) + '. Computed from scraped results and dive sheets.</p>' +
        '<div class="hps-kpis">' +
          '<div class="hps-kpi"><b>' + totalQual + '</b><span>met a target score</span></div>' +
          '<div class="hps-kpi"><b>' + totalVol + '</b><span>met the voluntary benchmark</span></div>' +
          '<div class="hps-kpi hps-kpi-warn"><b>' + totalAge + '</b><span>need AQUA age to decide</span></div>' +
        '</div>' +
        '<p class="hps-caveat"><b>⚠ Not included.</b> World Junior Championship team members (criterion E), ' +
        '2024 World Juniors finalists under the injury provision (criterion G), and Group A AQUA age. ' +
        'Nationals and Winter Nationals target hits are also not shown here — this covers the Junior ' +
        'National Championships only.' +
        (state.hasSynchro ? '' :
          ' <b>Synchro is not checked.</b> The published criteria set synchro targets, but no synchro ' +
          'results have been collected for this meet, so no synchro diver can appear below either way.') +
        '</p>' +
      '</header>' +
      '<h2 class="hps-h2">Target score pathway</h2>' + renderScore(sBlocks) +
      '<h2 class="hps-h2">Voluntary dive pathway — Groups C and D</h2>' + renderVol(vBlocks) +
      '</div>';
  };

  window._hpsToggleNearMiss = function () {
    state.showNearMiss = !state.showNearMiss;
    var w = document.getElementById('rptPanelWrap');
    if (w) window.renderHpsTrackerPanel(w);
  };
})();
