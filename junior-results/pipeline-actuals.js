/* ============================================================================
   pipeline-actuals.js — what actually happened at each stop of the 2026
   Junior Circuit, counted from results.

   Sits on the Pipeline tab under the flow map. Four tables:

     1. Stop to stop        unique athletes from each starting stop who reached
                            every later stop, a Junior Nationals final, top 3.
     2. Route to Nationals  every Junior Nationals event entry placed in exactly
                            one route, in this order: Zone top 3, E/W/C top 3,
                            E/W/C 4th-6th at or above the 3rd-place average,
                            HPS, non-displacing, then the entries with no
                            qualifying finish on record.
     3. Zone and E/W/C placing against what happened at Nationals.
     4. Foreign athletes and dual citizens at every stop: how many, how they
        were scored, and where they finished on score against each cut.

   Individual events only, Groups A-D, 1M / 3M / platform. Synchro, Future
   Champions, Senior and Non-Qualifier events are left out.

   The route rules are the 2026 rules. For any other season the module renders
   nothing rather than apply them where they do not belong.

   compute() is pure: rows in, counts out.
   ========================================================================= */
(function () {
  'use strict';

  var RULE_YEARS = { 2026: true };
  var cache = {};                       // year -> { rows, status, thresholds }
  var view = { group: 'All', gender: 'All', open: {} };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s || '').normalize('NFKD').replace(/[^\x00-\x7f]/g, '')
      .toLowerCase().replace(/[^a-z]/g, '');
  }
  function num(n) { return Number(n || 0).toLocaleString('en-US'); }

  /* ── Load ──────────────────────────────────────────────────────────────── */
  async function load(year) {
    if (cache[year]) return cache[year];
    var Q = window.NEON.query;
    var res = await Promise.all([
      Q("SELECT meet_id_dm::text AS meet, diver_id_dm::text AS id, diver_first, diver_last, " +
        "round, place, score, stage, age_group, gender, discipline, event_key, zone, ewc_meet " +
        "FROM core.event_results WHERE year = $1 AND is_junior_circuit AND NOT is_synchro " +
        "AND age_group IN ('Group A','Group B','Group C','Group D') " +
        "AND discipline IN ('1M','3M','Platform') AND event_name LIKE 'Group%'", [year]),
      Q("SELECT dive_meets_id::text AS id, name, category, hps, ymca, already_nat_qual FROM junior_results.athlete_status", []),
      Q("SELECT event_key, threshold_score FROM junior_results.zone_thresholds " +
        "WHERE year = $1 AND zone = 'EWC'", [year])
    ]);
    var rows = res[0].rows.map(function (r) {
      var p = r.place == null ? null : Number(r.place);
      return {
        meet: r.meet, id: r.id, name: (String(r.diver_first || '').trim() + ' ' + String(r.diver_last || '').trim()).trim(),
        nm: norm(String(r.diver_first || '') + String(r.diver_last || '')),
        round: r.round, place: p, nd: (p == null || p === 127), score: r.score == null ? null : Number(r.score),
        stage: r.stage, group: r.age_group, gender: r.gender, disc: r.discipline, ev: r.event_key,
        zone: r.zone, ewc: r.ewc_meet, key: r.event_key + '|' + r.id
      };
    });
    var th = {};
    res[2].rows.forEach(function (t) { th[t.event_key] = Number(t.threshold_score); });
    cache[year] = { rows: rows, status: res[1].rows, thresholds: th };
    return cache[year];
  }

  /* ── Status lists resolved to diver ids ────────────────────────────────────
     The status list carries a DiveMeets id for some athletes and only a name
     for others, and one declared id does not match the id in results. So an
     athlete is matched on id, and also on name. */
  function yes(v) { return v === true || v === 'true' || v === 't'; }
  function statusIds(rows, status) {
    var ids = {}, byName = {};
    rows.forEach(function (r) { ids[r.id] = true; (byName[r.nm] = byName[r.nm] || {})[r.id] = true; });
    function collect(test) {
      var out = {};
      status.forEach(function (s) {
        if (!test(s)) return;
        if (s.id && ids[s.id]) out[s.id] = true;
        var m = byName[norm(s.name)];
        if (m) Object.keys(m).forEach(function (i) { out[i] = true; });
      });
      return out;
    }
    return {
      foreign: collect(function (s) { return s.category === 'Foreign'; }),
      dual: collect(function (s) { return s.category === 'DualOther'; }),
      hps: collect(function (s) { return yes(s.hps); }),
      other: collect(function (s) { return yes(s.ymca) || yes(s.already_nat_qual); })
    };
  }

  /* ── Compute ───────────────────────────────────────────────────────────── */
  function compute(data, filt) {
    var S = statusIds(data.rows, data.status);
    var th = data.thresholds;
    var rows = data.rows.filter(function (r) {
      return (!filt || filt.group === 'All' || r.group === filt.group) &&
             (!filt || filt.gender === 'All' || r.gender === filt.gender);
    });

    var reg = {}, zon = {}, ewcP = {}, ewcF = {}, natP = {}, natF = {};
    var A = { Regionals: {}, RegQual: {}, Zones: {}, EWC: {}, Nationals: {}, Final: {}, Top3: {} };
    rows.forEach(function (r) {
      if (r.stage === 'Regionals') {
        reg[r.key] = r; A.Regionals[r.id] = true;
        if ((r.group === 'Group A' || r.group === 'Group B') && r.disc !== 'Platform') A.RegQual[r.id] = true;
      } else if (r.stage === 'Zones') { zon[r.key] = r; A.Zones[r.id] = true; }
      else if (r.stage === 'EWC') { (r.round === 'Final' ? ewcF : ewcP)[r.key] = r; A.EWC[r.id] = true; }
      else if (r.stage === 'Nationals') {
        (r.round === 'Final' ? natF : natP)[r.key] = r; A.Nationals[r.id] = true;
        if (r.round === 'Final') { A.Final[r.id] = true; if (!r.nd && r.place <= 3) A.Top3[r.id] = true; }
      }
    });
    function size(o) { return Object.keys(o).length; }
    function both(a, b) { var n = 0; for (var k in a) if (b[k]) n++; return n; }
    function minus(a, b) { var o = {}; for (var k in a) if (!b[k]) o[k] = true; return o; }

    /* 1. Stop to stop, unique athletes */
    function stopRow(label, set, from) {
      return { label: label, athletes: size(set),
        zones: from < 1 ? both(set, A.Zones) : null,
        ewc: from < 2 ? both(set, A.EWC) : null,
        nationals: both(set, A.Nationals), finals: both(set, A.Final), top3: both(set, A.Top3) };
    }
    var stops = [
      stopRow('Competed at a Regional', A.Regionals, 0),
      stopRow('Regional, Group A/B springboard (the qualifying events)', A.RegQual, 0),
      stopRow('Competed at a Zone', A.Zones, 1),
      stopRow('Zone with no Regional result', minus(A.Zones, A.Regionals), 1),
      stopRow('Competed at E/W/C', A.EWC, 2)
    ];
    var field = { total: size(A.Nationals), regionals: both(A.Nationals, A.Regionals) };
    field.zones = both(minus(A.Nationals, A.Regionals), A.Zones);
    field.neither = field.total - field.regionals - field.zones;

    /* Junior Nationals entries, one per athlete per event */
    var entries = Object.keys(natP).map(function (k) {
      var p = natP[k], f = natF[k], z = zon[k], e = ewcF[k], ep = ewcP[k];
      var t = { key: k, id: p.id, name: p.name, ev: p.ev,
        zonePlace: z ? (z.nd ? 'ND' : z.place) : null, zone: z ? z.zone : null,
        ewcPlace: e ? (e.nd ? 'ND' : e.place) : (ep ? 'prelim' : null), ewcScore: e ? e.score : null,
        natPrelim: p.nd ? 'ND' : p.place, natFinal: f ? (f.nd ? 'ND' : f.place) : null,
        inFinal: !!f, top3: !!(f && !f.nd && f.place <= 3), hps: !!S.hps[p.id] };
      var zp = z && !z.nd ? z.place : null, epl = e && !e.nd ? e.place : null;
      if (zp != null && zp <= 3) t.route = 0;
      else if (epl != null && epl <= 3) t.route = 1;
      else if (epl != null && epl >= 4 && epl <= 6 && th[p.ev] != null && e.score >= th[p.ev]) t.route = 2;
      else if (t.hps) t.route = 3;
      else if (p.nd) t.route = 4;
      else if (e || ep) t.route = 5;
      else if (z && !z.nd) t.route = 6;
      else t.route = 7;
      return t;
    });
    var ROUTES = [
      'Zone top 3',
      'E/W/C top 3',
      'E/W/C 4th to 6th, at or above the 3rd-place average',
      'HPS, no qualifying finish in this event',
      'Non-displacing',
      'Competed at E/W/C, finished below the qualifying line',
      'Zone 4th or lower, no E/W/C result',
      'No Zone or E/W/C result in this event'
    ];
    var routes = ROUTES.map(function (label, i) {
      var list = entries.filter(function (t) { return t.route === i; });
      var ath = {}; list.forEach(function (t) { ath[t.id] = true; });
      return { label: label, entries: list.length, athletes: size(ath),
        finals: list.filter(function (t) { return t.inFinal; }).length,
        top3: list.filter(function (t) { return t.top3; }).length, list: list };
    });

    /* 3. Placing at Zones and at E/W/C against Nationals */
    function band(label, src, test) {
      var keys = Object.keys(src).filter(function (k) { return test(src[k]); });
      return { label: label, entries: keys.length,
        ewc: keys.filter(function (k) { return ewcP[k] || ewcF[k]; }).length,
        nationals: keys.filter(function (k) { return natP[k]; }).length,
        finals: keys.filter(function (k) { return natF[k]; }).length,
        top3: keys.filter(function (k) { var f = natF[k]; return f && !f.nd && f.place <= 3; }).length };
    }
    function pl(lo, hi) { return function (r) { return !r.nd && r.place >= lo && r.place <= hi; }; }
    var zoneBands = [
      band('1st to 3rd', zon, pl(1, 3)), band('4th to 6th', zon, pl(4, 6)),
      band('7th to 10th', zon, pl(7, 10)), band('11th to 18th', zon, pl(11, 18)),
      band('19th and lower', zon, pl(19, 126)), band('Non-displacing', zon, function (r) { return r.nd; })
    ];
    var ewcOnlyPrelim = {};
    Object.keys(ewcP).forEach(function (k) { if (!ewcF[k]) ewcOnlyPrelim[k] = ewcP[k]; });
    var ewcBands = [
      band('Final, 1st to 3rd', ewcF, pl(1, 3)),
      band('Final, 4th to 6th at or above the 3rd-place average', ewcF, function (r) {
        return !r.nd && r.place >= 4 && r.place <= 6 && th[r.ev] != null && r.score >= th[r.ev]; }),
      band('Final, 4th to 6th below the average', ewcF, function (r) {
        return !r.nd && r.place >= 4 && r.place <= 6 && !(th[r.ev] != null && r.score >= th[r.ev]); }),
      band('Final, 7th and lower', ewcF, pl(7, 126)),
      band('Final, non-displacing', ewcF, function (r) { return r.nd; }),
      band('Prelims only', ewcOnlyPrelim, function () { return true; })
    ];

    /* 4. Foreign athletes and dual citizens */
    var pools = {};                      // meet|event|round -> scores of everyone else with a numbered place
    data.rows.forEach(function (r) {
      if (r.nd || S.foreign[r.id] || S.dual[r.id]) return;
      var k = r.meet + '|' + r.ev + '|' + r.round; (pools[k] = pools[k] || []).push(r.score);
    });
    function onScore(r) {
      var a = pools[r.meet + '|' + r.ev + '|' + r.round] || [], n = 1;
      for (var i = 0; i < a.length; i++) if (a[i] > r.score) n++;
      return n;
    }
    var STOPS = [
      { label: 'Regionals (Group A/B springboard)', cut: 15, cutLabel: 'top 15',
        test: function (r) { return r.stage === 'Regionals' && (r.group === 'Group A' || r.group === 'Group B') && r.disc !== 'Platform'; } },
      { label: 'Zones', cut: 3, cutLabel: 'top 3', test: function (r) { return r.stage === 'Zones'; } },
      { label: 'E/W/C finals', cut: 3, cutLabel: 'top 3', test: function (r) { return r.stage === 'EWC' && r.round === 'Final'; } },
      { label: 'Junior Nationals prelims', cut: 12, cutLabel: 'top 12', test: function (r) { return r.stage === 'Nationals' && r.round === 'Prelim'; } },
      { label: 'Junior Nationals finals', cut: 3, cutLabel: 'top 3', test: function (r) { return r.stage === 'Nationals' && r.round === 'Final'; } }
    ];
    var foreign = STOPS.map(function (st) {
      var list = rows.filter(function (r) { return st.test(r) && (S.foreign[r.id] || S.dual[r.id]); })
        .map(function (r) {
          return { id: r.id, name: r.name, ev: r.ev, meet: r.zone ? 'Zone ' + r.zone : (r.ewc || ''),
            type: S.foreign[r.id] ? 'Foreign' : 'Dual citizen, other federation',
            scored: r.nd ? 'Non-displacing' : 'Place ' + r.place, nd: r.nd, onScore: onScore(r) };
        });
      var ath = {}; list.forEach(function (t) { ath[t.id] = true; });
      var inside = list.filter(function (t) { return t.onScore <= st.cut; });
      return { label: st.label, cutLabel: st.cutLabel, athletes: size(ath), entries: list.length,
        nonDisplacing: list.filter(function (t) { return t.nd; }).length,
        numbered: list.filter(function (t) { return !t.nd; }).length,
        inside: inside.length, insideNumbered: inside.filter(function (t) { return !t.nd; }).length, list: list };
    });
    var unexplained = {};
    rows.forEach(function (r) {
      if (r.nd && !S.foreign[r.id] && !S.dual[r.id] && !S.hps[r.id] && !S.other[r.id]) unexplained[r.stage + '|' + r.key] = r;
    });

    return { stops: stops, field: field, routes: routes, entriesTotal: entries.length,
      zoneBands: zoneBands, ewcBands: ewcBands, foreign: foreign,
      finals: { entries: size(natF), numbered: Object.keys(natF).filter(function (k) { return !natF[k].nd; }).length },
      unexplained: Object.keys(unexplained).map(function (k) { return unexplained[k]; }) };
  }

  /* ── Render ────────────────────────────────────────────────────────────── */
  function cell(v) { return v == null ? '<td class="pa-na">&ndash;</td>' : '<td>' + num(v) + '</td>'; }
  var STATIC = false;                   // true while building the report-builder version
  function table(head, body) {
    if (STATIC) {
      return '<table class="rb-table"><thead><tr>' + head.filter(function (h) { return h !== ''; })
        .map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody></table>';
    }
    return '<div class="pa-scroll"><table class="pm-status-table pa-table"><thead><tr>' +
      head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function chips(name, options, current) {
    return '<div class="pa-chips" role="group" aria-label="' + name + '">' + options.map(function (o) {
      return '<button type="button" class="pa-chip' + (o === current ? ' is-on' : '') + '" data-pa-' + name + '="' + esc(o) + '">' +
        esc(o === 'All' ? 'All ' + (name === 'group' ? 'groups' : 'athletes') : o) + '</button>';
    }).join('') + '</div>';
  }
  function openBtn(id, n) {
    if (STATIC || !n) return '';
    return '<button type="button" class="pa-open" data-pa-open="' + id + '" aria-expanded="' + (view.open[id] ? 'true' : 'false') + '">' +
      (view.open[id] ? 'Hide' : 'Show') + '</button>';
  }
  function place(v) { return v == null ? '&ndash;' : (v === 'ND' ? 'Non-displacing' : esc(v)); }

  function render(c, year) {
    var stopBody = c.stops.map(function (s) {
      return '<tr><td>' + esc(s.label) + '</td>' + cell(s.athletes) + cell(s.zones) + cell(s.ewc) +
        cell(s.nationals) + cell(s.finals) + cell(s.top3) + '</tr>';
    }).join('');

    var routeBody = c.routes.map(function (r, i) {
      var id = 'r' + i, rowsHtml = '';
      if (view.open[id]) {
        rowsHtml = '<tr class="pa-detail"><td colspan="6">' + table(
          ['Athlete', 'Event', 'Zone place', 'E/W/C place', 'Nationals prelim', 'Nationals final'],
          r.list.slice().sort(function (a, b) { return a.name.localeCompare(b.name) || a.ev.localeCompare(b.ev); })
            .map(function (t) {
              return '<tr><td>' + esc(t.name) + '</td><td>' + esc(t.ev) + '</td><td>' + place(t.zonePlace) +
                '</td><td>' + place(t.ewcPlace) + '</td><td>' + place(t.natPrelim) + '</td><td>' + place(t.natFinal) + '</td></tr>';
            }).join('')) + '</td></tr>';
      }
      return '<tr><td>' + esc(r.label) + '</td>' + cell(r.entries) + cell(r.athletes) + cell(r.finals) + cell(r.top3) +
        (STATIC ? '' : '<td>' + openBtn(id, r.entries) + '</td>') + '</tr>' + rowsHtml;
    }).join('') +
      '<tr class="pa-total"><td>All Junior Nationals event entries</td>' + cell(c.entriesTotal) + cell(c.field.total) +
      cell(c.finals.entries) + cell(c.routes.reduce(function (a, r) { return a + r.top3; }, 0)) + (STATIC ? '' : '<td></td>') + '</tr>';

    function bandBody(list, showEwc) {
      return list.map(function (b) {
        return '<tr><td>' + esc(b.label) + '</td>' + cell(b.entries) + (showEwc ? cell(b.ewc) : '') +
          cell(b.nationals) + cell(b.finals) + cell(b.top3) + '</tr>';
      }).join('');
    }

    var forBody = c.foreign.map(function (f, i) {
      var id = 'f' + i, rowsHtml = '';
      if (view.open[id]) {
        rowsHtml = '<tr class="pa-detail"><td colspan="7">' + table(
          ['Athlete', 'Status', 'Meet', 'Event', 'Scored as', 'Finish on score'],
          f.list.slice().sort(function (a, b) { return a.onScore - b.onScore || a.name.localeCompare(b.name); })
            .map(function (t) {
              return '<tr><td>' + esc(t.name) + '</td><td>' + esc(t.type) + '</td><td>' + esc(t.meet) + '</td><td>' + esc(t.ev) +
                '</td><td>' + esc(t.scored) + '</td><td>' + num(t.onScore) + '</td></tr>';
            }).join('')) + '</td></tr>';
      }
      return '<tr><td>' + esc(f.label) + '</td>' + cell(f.athletes) + cell(f.entries) + cell(f.nonDisplacing) +
        '<td' + (f.numbered ? ' class="pa-flag"' : '') + '>' + num(f.numbered) + '</td>' +
        '<td>' + num(f.inside) + ' inside the ' + esc(f.cutLabel) +
        (f.insideNumbered ? ', ' + num(f.insideNumbered) + ' with a numbered place' : '') + '</td>' +
        (STATIC ? '' : '<td>' + openBtn(id, f.entries) + '</td>') + '</tr>' + rowsHtml;
    }).join('');


    var showing = (view.group === 'All' && view.gender === 'All') ? '' :
      '<p class="pa-showing">Showing ' + esc(view.group === 'All' ? 'all groups' : view.group) + ', ' +
      esc(view.gender === 'All' ? 'boys and girls' : view.gender.toLowerCase() + ' only') + '.</p>';
    var lead = 'Counted from results. Individual events, Groups A to D. ' +
      'Of the ' + num(c.field.total) + ' athletes at Junior Nationals, ' + num(c.field.regionals) + ' started at a Regional, ' +
      num(c.field.zones) + ' started at a Zone and ' + num(c.field.neither) + ' had no Regional or Zone result.';
    function h(t) { return STATIC ? '<h3 class="rb-h3">' + t + '</h3>' : '<h4 class="pa-h4">' + t + '</h4>'; }
    function note(t) { return '<p class="' + (STATIC ? 'rb-soft' : 'pa-note') + '">' + t + '</p>'; }
    var tables =
        h('Unique athletes reaching each later stop') +
        table(['Started', 'Athletes', 'Zones', 'E/W/C', 'Junior Nationals', 'A Nationals final', 'Top 3'], stopBody) +
        h('How each Junior Nationals event entry got there') +
        table(['Route into that event', 'Event entries', 'Unique athletes', 'Reached the final', 'Top 3', ''], routeBody) +
        note(num(c.finals.entries) + ' final entries: ' + num(c.finals.numbered) + ' with a numbered place and ' +
          num(c.finals.entries - c.finals.numbered) + ' non-displacing.') +
        h('Zone placing against Junior Nationals (event entries)') +
        table(['Zone place', 'Zone entries', 'Competed at E/W/C', 'Competed at Nationals', 'Reached the final', 'Top 3'], bandBody(c.zoneBands, true)) +
        h('E/W/C finish against Junior Nationals (event entries)') +
        table(['E/W/C finish', 'E/W/C entries', 'Competed at Nationals', 'Reached the final', 'Top 3'], bandBody(c.ewcBands, false)) +
        h('Foreign athletes and dual citizens declared for another federation') +
        table(['Stop', 'Athletes', 'Event entries', 'Scored non-displacing', 'Numbered place', 'Finish on score', ''], forBody) +
        (c.unexplained.length ? note(num(c.unexplained.length) +
          ' more event entries were scored non-displacing with no status on file for the athlete.') : '');
    if (STATIC) {
      return '<section class="rb-section"><h2 class="rb-h2">Stop to Stop, ' + esc(year) + ' Actual</h2>' +
        '<p class="rb-p">' + lead + '</p>' + tables + '</section>';
    }

    return '<section class="pm-section pa-section">' +
      '<div class="pm-section-head"><div class="pm-section-title"><span class="pm-section-num">A</span>' +
        'Stop to stop, ' + esc(year) + ' actual</div>' +
        '<div class="pm-section-explainer">' + lead + '</div></div>' +
      '<div class="pm-section-body">' +
        '<div class="pa-filters">' + chips('group', ['All', 'Group A', 'Group B', 'Group C', 'Group D'], view.group) +
          chips('gender', ['All', 'Boys', 'Girls'], view.gender) + '</div>' + showing + tables +
      '</div></section>';
  }

  /* ── Mount ─────────────────────────────────────────────────────────────── */
  var mounted = { slot: null, year: null };
  function paint() {
    var slot = mounted.slot, d = cache[mounted.year];
    if (!slot || !d) return;
    slot.innerHTML = render(compute(d, view), mounted.year);
  }
  function onClick(e) {
    var t = e.target.closest ? e.target.closest('[data-pa-group],[data-pa-gender],[data-pa-open]') : null;
    if (!t) return;
    if (t.hasAttribute('data-pa-group')) view.group = t.getAttribute('data-pa-group');
    else if (t.hasAttribute('data-pa-gender')) view.gender = t.getAttribute('data-pa-gender');
    else { var id = t.getAttribute('data-pa-open'); view.open[id] = !view.open[id]; }
    paint();
  }
  async function mount(slot, year) {
    if (!slot) return;
    year = Number(year);
    if (!RULE_YEARS[year]) { slot.innerHTML = ''; return; }
    mounted = { slot: slot, year: year };
    if (!slot.dataset.paBound) { slot.addEventListener('click', onClick); slot.dataset.paBound = '1'; }
    if (!cache[year]) {
      slot.innerHTML = '<section class="pm-section"><div class="pm-loading"><div class="pm-loading-spinner"></div>' +
        '<div class="pm-loading-text">Counting ' + year + ' results&hellip;</div></div></section>';
    }
    try { await load(year); paint(); }
    catch (err) {
      slot.innerHTML = '<div class="pm-error"><strong>Could not load the stop-to-stop tables.</strong> ' + esc(err.message || String(err)) + '</div>';
    }
  }

  /* Static version for the report builder: all groups, no controls. */
  async function report(year) {
    year = Number(year);
    if (!RULE_YEARS[year]) return '';
    var d = await load(year), keep = view;
    view = { group: 'All', gender: 'All', open: {} }; STATIC = true;
    try { return render(compute(d, view), year); }
    finally { STATIC = false; view = keep; }
  }

  window.PipelineActuals = { mount: mount, load: load, compute: compute, report: report };
})();
