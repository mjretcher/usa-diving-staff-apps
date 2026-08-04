/* ============================================================================
   team-points.js — Junior Nationals team scoring

   THE RULES THIS IMPLEMENTS

   All rule references are to the 2026 USA Diving Technical Rulebook, verified
   against the published text on 2026-08-04.

   POINTS -- Art. 602.20(e).  Team points go to the top 12 places in each event
   as 15-12-11-10-9-8-7-6-4-3-2-1. Note there is no 5: the table steps 6 then 4.

   TIES -- Art. 602.20(f).  The points allocated to the tied place are added to
   those allocated to the next place or places, the sum divided by the number of
   divers who tied, and that amount added to the score for each team. A two-way
   tie for 7th is therefore (7+6)/2 = 6.5 each, not 7 each, and 8th is absorbed.
   This keeps every event awarding exactly 88, which the panel asserts per event.

   DiveMeets' own Team Scoring report does NOT apply 602.20(f) -- it awards the
   tied place in full to both divers and skips the next -- so its 2026 Junior
   Nationals totals run 1 point high, +0.5 each to Minnesota Diving Academy and
   Mansfield Diving. This panel follows the rulebook; the audit view states the
   difference rather than hiding it.

   AWARDS -- Art. 602.20(d).  At Junior Nationals the rulebook prescribes team
   awards for the three teams with the most COMBINED (boys & girls) points. The
   girls and boys tables are shown alongside because they are awarded in practice
   and DiveMeets reports them, but combined is the table the rule names.

   WHO SCORES -- Art. 602.20(g), new for 2026.  Foreign divers are not eligible
   to earn team points; where such an athlete finishes in a scoring position the
   points and the place drop to the next highest-placing U.S. citizen athlete.
   DiveMeets implements this upstream by recording those entries with no place
   and enlarging the final to hold them (Art. 301.3), so places 1-12 are held
   entirely by scoring athletes -- verified across every event at this meet.
   Skipping place-less rows here is therefore equivalent to the drop-down, not a
   substitute for it. Unattached divers represent no club and score for nobody;
   their points are reported, not silently dropped.

   SYNCHRO.  Scores on the same table as individual events. Where the two
   partners represent different clubs the place points are SPLIT between them,
   half each. On top of that the High Performance Director's standing policy:

       each individual of a synchro pairing earns their contribution once,
       at their highest finishing place.

   So a diver in the 1st and 2nd place pairs contributes at 1st only; their
   half of 2nd is forfeited rather than passing to their partner, because each
   diver earns their own share for their own club. This is not hypothetical --
   in 2026 it fired three times, all RipFest divers doubling up, and without it
   RipFest would have finished 3rd in the boys standings instead of 7th.

   CLUB ATTRIBUTION.  A diver's club is taken from their individual entries
   when they have any, because DiveMeets can list a different club on a synchro
   row: in 2026 Kirby Danglade appears as RipFest in one pair and Northside
   Diving Academy in another, while every individual entry says RipFest.
   Athletes who enter synchro only -- permitted, since Art. 303(c)(2) requires
   just one partner to be a qualifier -- keep the club on the synchro row.
   ========================================================================= */
(function () {
  'use strict';

  var MEET_ID = 12923;
  var PTS = { 1:15, 2:12, 3:11, 4:10, 5:9, 6:8, 7:7, 8:6, 9:4, 10:3, 11:2, 12:1 };
  var FULL_SLATE = 88;   // sum of the table above

  var state = { rows: null, loading: false, error: null, view: 'comb', audit: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function fmt(v) {
    if (v == null) return '';
    var n = Number(v);
    return (Math.abs(n - Math.round(n)) < 1e-9) ? String(Math.round(n)) : n.toFixed(1);
  }
  function isSynchro(t) { return /synchro/i.test(t || ''); }
  function isGirls(t)   { return /girls/i.test(t || ''); }
  function scores(place) { return place != null && /^\d+$/.test(String(place).trim()); }

  async function neonQuery(sql, params) {
    if (!window.NEON || !window.NEON.query) throw new Error('Neon client not loaded');
    return await window.NEON.query(sql, params || []);
  }

  async function load() {
    state.loading = true; state.error = null;
    try {
      var r = await neonQuery(
        "SELECT e.title, r.round, r.place, r.diver_name, r.profile_id::text AS pid, " +
        "       r.team_name, r.diver2_name, r.profile2_id::text AS pid2, r.team2_name " +
        "FROM divemeets.results r " +
        "JOIN divemeets.events e ON e.meet_id=r.meet_id AND e.event_id=r.event_id AND e.round=r.round " +
        "WHERE r.meet_id=" + MEET_ID + " ORDER BY e.title");
      state.rows = (r && r.rows) || [];
    } catch (e) { state.error = String(e && e.message || e); }
    state.loading = false;
  }

  /* ── Compute ──────────────────────────────────────────────────────────── */
  function compute() {
    var rows = state.rows;

    // Club of record: individual entries win over a synchro row's club.
    var clubOf = {}, overrides = [], synchroOnly = [];
    rows.forEach(function (r) {
      if (!isSynchro(r.title) && r.profile_id !== null && r.pid && r.team_name) clubOf[r.pid] = r.team_name;
    });
    function club(pid, fallback) {
      return (pid && clubOf[pid]) ? clubOf[pid] : (fallback || null);
    }

    // Audit the club of every synchro participant up front, independent of
    // scoring. Doing this inside the scoring loop missed anyone whose second
    // pairing was forfeited -- which is exactly where the 2026 discrepancy sat:
    // Kirby Danglade is listed as Northside on the pair that does not count.
    rows.forEach(function (r) {
      if (!isSynchro(r.title) || String(r.round) !== '9') return;
      [[r.pid, r.diver_name, r.team_name], [r.pid2, r.diver2_name, r.team2_name]]
        .forEach(function (d) {
          var pid = d[0], nm = d[1], listed = d[2];
          if (!nm) return;
          if (pid && clubOf[pid]) {
            if (listed && listed !== clubOf[pid])
              overrides.push({ name: nm, listed: listed, used: clubOf[pid] });
          } else if (listed) {
            synchroOnly.push({ name: nm, club: listed });
          }
        });
    });

    var comb = {}, girls = {}, boys = {}, unattached = {};
    var audit = [], ties = [], forfeits = [];
    function give(team, pts, gender) {
      if (!team) return;
      comb[team] = (comb[team] || 0) + pts;
      var t = gender === 'g' ? girls : boys;
      t[team] = (t[team] || 0) + pts;
    }

    // group finals by event
    var ev = {};
    rows.forEach(function (r) {
      if (String(r.round) !== '9') return;                 // only a final awards places
      (ev[r.title] = ev[r.title] || []).push(r);
    });

    Object.keys(ev).sort().forEach(function (title) {
      var list = ev[title].filter(function (r) { return scores(r.place); });
      var gender = isGirls(title) ? 'g' : 'b';
      var syn = isSynchro(title);
      var count = {};
      list.forEach(function (r) { var p = +r.place; count[p] = (count[p] || 0) + 1; });

      var offered = 0, awarded = 0, forf = 0, used = {};
      list.sort(function (a, b) { return (+a.place) - (+b.place); }).forEach(function (r) {
        var place = +r.place, n = count[place], pts;
        if (n > 1) {                                        // tie: pool and divide
          var pool = 0;
          for (var i = 0; i < n; i++) pool += (PTS[place + i] || 0);
          pts = pool / n;
          ties.push({ event: title, place: place, n: n, each: pts, who: r.diver_name });
        } else {
          pts = PTS[place] || 0;
        }
        offered += pts;
        if (!syn) {
          var c = r.team_name || null;
          if (!c) { unattached[r.diver_name] = (unattached[r.diver_name] || 0) + pts; }
          else { give(c, pts, gender); awarded += pts; }
          return;
        }
        // synchro: half each, and a diver contributes once per event
        var half = pts / 2;
        [[r.pid, r.diver_name, r.team_name], [r.pid2, r.diver2_name, r.team2_name]]
          .forEach(function (d) {
            var pid = d[0], nm = d[1];
            if (!nm) return;
            if (pid && used[pid]) {
              forf += half;
              forfeits.push({ event: title, place: place, name: nm, pts: half });
              return;
            }
            if (pid) used[pid] = true;
            var c = club(pid, d[2]);
            if (!c) { unattached[nm] = (unattached[nm] || 0) + half; return; }
            give(c, half, gender); awarded += half;
          });
      });
      audit.push({ event: title, synchro: syn, gender: gender, placings: list.length,
                   offered: offered, awarded: awarded, forfeited: forf,
                   full: !syn && Math.abs(offered - FULL_SLATE) < 1e-9 });
    });

    function rank(o) {
      return Object.keys(o).map(function (k) { return { team: k, pts: o[k] }; })
        .sort(function (a, b) { return b.pts - a.pts || a.team.localeCompare(b.team); });
    }
    // dedupe the informational lists
    var seenO = {}, seenS = {};
    overrides = overrides.filter(function (o) {
      var k = o.name + o.listed; if (seenO[k]) return false; seenO[k] = 1; return true; });
    synchroOnly = synchroOnly.filter(function (o) {
      if (seenS[o.name]) return false; seenS[o.name] = 1; return true; });

    return { comb: rank(comb), girls: rank(girls), boys: rank(boys),
             unattached: unattached, audit: audit, ties: ties, forfeits: forfeits,
             overrides: overrides, synchroOnly: synchroOnly };
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  function table(list, label) {
    if (!list.length) return '<p class="tp-soft">No points in this category yet.</p>';
    return '<table class="tp-table"><thead><tr><th>#</th><th>' + esc(label) +
      '</th><th class="tp-n">Points</th></tr></thead><tbody>' +
      list.map(function (r, i) {
        return '<tr' + (i < 3 ? ' class="tp-podium tp-p' + (i + 1) + '"' : '') + '>' +
          '<td class="tp-rk">' + (i + 1) + '</td>' +
          '<td class="tp-tm">' + esc(r.team) + '</td>' +
          '<td class="tp-n">' + fmt(r.pts) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function auditHtml(c) {
    var evRows = c.audit.map(function (a) {
      var flag = a.synchro ? '<span class="tp-tag">synchro</span>'
               : (a.full ? '' : '<span class="tp-tag tp-bad">slate ' + fmt(a.offered) + '</span>');
      return '<tr><td>' + esc(a.event) + '</td><td class="tp-n">' + a.placings + '</td>' +
        '<td class="tp-n">' + fmt(a.offered) + '</td><td class="tp-n">' + fmt(a.awarded) + '</td>' +
        '<td class="tp-n">' + (a.forfeited ? fmt(a.forfeited) : '—') + '</td><td>' + flag + '</td></tr>';
    }).join('');
    var totOff = c.audit.reduce(function (s, a) { return s + a.offered; }, 0);
    var totAwd = c.audit.reduce(function (s, a) { return s + a.awarded; }, 0);
    var totFor = c.audit.reduce(function (s, a) { return s + a.forfeited; }, 0);
    var unTot = Object.keys(c.unattached).reduce(function (s, k) { return s + c.unattached[k]; }, 0);

    return '<div class="tp-audit">' +
      '<p class="tp-soft"><b>Art.&nbsp;602.20(d)</b> names team awards for the three teams with the ' +
      'most combined (boys &amp; girls) points at Junior Nationals. Girls and boys tables are shown ' +
      'because they are awarded in practice, but combined is the table the rule names.</p>' +
      '<h4 class="tp-h4">Every event</h4>' +
      '<table class="tp-table tp-small"><thead><tr><th>Event</th><th class="tp-n">Placings</th>' +
      '<th class="tp-n">Offered</th><th class="tp-n">To clubs</th><th class="tp-n">Forfeited</th><th></th>' +
      '</tr></thead><tbody>' + evRows +
      '<tr class="tp-tot"><td>Total</td><td></td><td class="tp-n">' + fmt(totOff) +
      '</td><td class="tp-n">' + fmt(totAwd) + '</td><td class="tp-n">' + fmt(totFor) + '</td><td></td></tr>' +
      '</tbody></table>' +

      (c.ties.length ? '<h4 class="tp-h4">Ties</h4><ul class="tp-list">' + c.ties.map(function (t) {
        return '<li>' + esc(t.event) + ' — ' + t.n + '-way tie for ' + t.place + ': ' +
          esc(t.who) + ' and others take <b>' + fmt(t.each) + '</b> each ' +
          '(place ' + t.place + ' pooled with the next, divided by ' + t.n + ').</li>';
      }).join('') + '</ul>' : '') +

      (c.forfeits.length ? '<h4 class="tp-h4">Second pairings not counted</h4>' +
        '<p class="tp-soft">A diver contributes once per event, at their highest place. ' +
        'These halves are forfeited rather than passing to the partner.</p><ul class="tp-list">' +
        c.forfeits.map(function (f) {
          return '<li>' + esc(f.event) + ' — ' + esc(f.name) + ', place ' + f.place +
            ': <b>' + fmt(f.pts) + '</b> not awarded.</li>';
        }).join('') + '</ul>' : '') +

      (c.overrides.length ? '<h4 class="tp-h4">Club taken from individual entries</h4><ul class="tp-list">' +
        c.overrides.map(function (o) {
          return '<li>' + esc(o.name) + ' — synchro row lists <i>' + esc(o.listed) +
            '</i>, individual entries say <b>' + esc(o.used) + '</b>. Scored to ' + esc(o.used) + '.</li>';
        }).join('') + '</ul>' : '') +

      (c.synchroOnly.length ? '<h4 class="tp-h4">Synchro-only entrants</h4>' +
        '<p class="tp-soft">No individual entry to check a club against, so the synchro row stands. ' +
        'Permitted — Art. 303(c)(2) requires only one partner to be a qualifier.</p><ul class="tp-list">' +
        c.synchroOnly.map(function (o) {
          return '<li>' + esc(o.name) + ' — ' + esc(o.club) + '</li>'; }).join('') + '</ul>' : '') +

      (unTot ? '<h4 class="tp-h4">Unattached</h4><p class="tp-soft">' + fmt(unTot) +
        ' points scoring for no club: ' + Object.keys(c.unattached).map(function (k) {
          return esc(k) + ' ' + fmt(c.unattached[k]); }).join(', ') + '.</p>' : '') +
      '</div>';
  }

  function csv(c) {
    var out = [['Category', 'Rank', 'Team', 'Points']];
    [['Combined', c.comb], ['Girls', c.girls], ['Boys', c.boys]].forEach(function (p) {
      p[1].forEach(function (r, i) { out.push([p[0], i + 1, r.team, fmt(r.pts)]); });
    });
    return out.map(function (r) { return r.map(function (x) {
      x = String(x == null ? '' : x);
      return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(','); }).join('\r\n');
  }

  window.renderTeamPointsPanel = async function (wrap) {
    if (!wrap) return;
    if (!state.rows && !state.loading) {
      wrap.innerHTML = '<div class="tp-loading">Computing team points&hellip;</div>';
      await load();
    }
    if (state.error) {
      wrap.innerHTML = '<div class="tp-error">Could not load: ' + esc(state.error) + '</div>';
      return;
    }
    var c = compute();
    var list = state.view === 'girls' ? c.girls : state.view === 'boys' ? c.boys : c.comb;
    var label = state.view === 'girls' ? 'Girls team' : state.view === 'boys' ? 'Boys team' : 'Combined team';
    var synEvents = c.audit.filter(function (a) { return a.synchro; }).length;
    var indEvents = c.audit.length - synEvents;
    var bad = c.audit.filter(function (a) { return !a.synchro && !a.full; }).length;

    wrap.innerHTML =
      '<div class="tp-wrap">' +
      '<header class="tp-head">' +
        '<h2 class="tp-h2">Team points</h2>' +
        '<p class="tp-sub">' + indEvents + ' individual events &middot; ' + synEvents +
          ' synchro events &middot; Art.&nbsp;602.20(e) 15-12-11-10-9-8-7-6-4-3-2-1' +
          (bad ? ' &middot; <b class="tp-warnink">' + bad + ' event(s) not awarding a full slate</b>' : '') +
        '</p>' +
        '<div class="tp-tabs">' +
          ['comb','girls','boys'].map(function (v) {
            var t = v === 'comb' ? 'Combined' : v === 'girls' ? 'Girls' : 'Boys';
            return '<button class="tp-tab' + (state.view === v ? ' on' : '') +
                   '" data-v="' + v + '">' + t + '</button>'; }).join('') +
          '<button class="tp-btn" id="tpCsv">Export CSV</button>' +
          '<button class="tp-btn tp-ghost" id="tpAudit">' +
            (state.audit ? 'Hide working' : 'Show working') + '</button>' +
        '</div>' +
      '</header>' +
      table(list, label) +
      (state.audit ? auditHtml(c) : '') +
      '</div>';

    wrap.querySelectorAll('.tp-tab').forEach(function (b) {
      b.addEventListener('click', function () { state.view = b.dataset.v; window.renderTeamPointsPanel(wrap); });
    });
    var a = wrap.querySelector('#tpAudit');
    if (a) a.addEventListener('click', function () { state.audit = !state.audit; window.renderTeamPointsPanel(wrap); });
    var cs = wrap.querySelector('#tpCsv');
    if (cs) cs.addEventListener('click', function () {
      var blob = new Blob([csv(c)], { type: 'text/csv;charset=utf-8;' });
      var el = document.createElement('a');
      el.href = URL.createObjectURL(blob); el.download = 'junior-nationals-team-points.csv';
      document.body.appendChild(el); el.click(); document.body.removeChild(el);
      URL.revokeObjectURL(el.href);
    });
    if (window.natShellRefresh) window.natShellRefresh();
  };
})();
