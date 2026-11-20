/* ============================================================================
   pipeline-actuals.js — what actually happened at each stop of the 2026
   Junior Circuit, counted from results.

   Sits on the Pipeline tab under the flow map. Four tables:

     1. Stop to stop        unique athletes from each starting stop who reached
                            every later stop, a Junior Nationals final, top 3.
     2. Route to Nationals  every Junior Nationals event entry placed in exactly
                            one route, in this order: Zone top 3, E/W/C top 3,
                            E/W/C 4th-6th at or above the 3rd-place average,
                            HPS, non-displacing, moved up at Zones, moved up
                            at E/W/C, then the entries with no qualifying
                            finish on record.
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
  var view = { group: 'All', gender: 'All', disc: 'All', open: {}, mapView: 'region', mapBase: 'competed', mapMeasure: 'athletes', mapSel: null };

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
      Q("SELECT meet_id_dm::text AS meet, diver_id_dm::text AS id, team_id_dm::text AS team, diver_first, diver_last, " +
        "round, place, score, stage, age_group, gender, discipline, event_key, zone, ewc_meet, region::text AS region " +
        "FROM core.event_results WHERE year = $1 AND is_junior_circuit AND NOT is_synchro " +
        "AND age_group IN ('Group A','Group B','Group C','Group D') " +
        "AND discipline IN ('1M','3M','Platform') AND event_name LIKE 'Group%'", [year]),
      Q("SELECT dive_meets_id::text AS id, name, category, hps, ymca, already_nat_qual FROM junior_results.athlete_status", []),
      Q("SELECT event_key, threshold_score FROM junior_results.zone_thresholds " +
        "WHERE year = $1 AND zone = 'EWC'", [year]),
      Q("WITH m AS (SELECT DISTINCT stage, meet_id_dm::text AS mid FROM core.event_results " +
        "WHERE year = $1 AND is_junior_circuit) " +
        "SELECT m.stage, d.round_stage AS round, " +
        "substring(d.event_name from '^Group ([A-D]) ') AS grp, " +
        "substring(d.event_name from '^Group [A-D] (Boys|Girls) ') AS gender, " +
        "substring(d.event_name from '^Group [A-D] (?:Boys|Girls) (1m|3m|Platform)') AS board, " +
        "count(*)::int AS dives, sum(d.dd)::float8 AS dd_sum, count(DISTINCT d.diver_id)::int AS divers " +
        "FROM m JOIN core.dive_sheets d ON d.meet_id = m.mid " +
        "WHERE d.event_name ~ '^Group [A-D] (Boys|Girls) (1m|3m|Platform)' AND d.event_name !~* 'non' " +
        "AND d.dd IS NOT NULL AND d.optional_voluntary = 'O' GROUP BY 1,2,3,4,5", [year]),
      /* Club home region: the region a club's athletes have competed in most,
         2021 to this season. Same definition the circuit models use. No
         athlete address is read anywhere. */
      Q("WITH reg AS (SELECT DISTINCT year, diver_id_dm, team_id_dm, region FROM core.event_results " +
        "WHERE is_junior_circuit AND stage = 'Regionals' AND region IS NOT NULL AND diver_id_dm IS NOT NULL " +
        "AND team_id_dm IS NOT NULL AND year BETWEEN 2021 AND $1) " +
        "SELECT team_id_dm::text AS team, region::text AS home FROM (SELECT team_id_dm, region, " +
        "row_number() OVER (PARTITION BY team_id_dm ORDER BY count(*) DESC, region) rn FROM reg GROUP BY 1,2) t WHERE rn = 1", [year])
    ]);
    var rows = res[0].rows.map(function (r) {
      var p = r.place == null ? null : Number(r.place);
      return {
        meet: r.meet, id: r.id, team: r.team, name: (String(r.diver_first || '').trim() + ' ' + String(r.diver_last || '').trim()).trim(),
        nm: norm(String(r.diver_first || '') + String(r.diver_last || '')),
        round: r.round, place: p, nd: (p == null || p === 127), score: r.score == null ? null : Number(r.score),
        stage: r.stage, group: r.age_group, gender: r.gender, disc: r.discipline, ev: r.event_key,
        zone: r.zone, ewc: r.ewc_meet, region: r.region, key: r.event_key + '|' + r.id
      };
    });
    var th = {};
    res[2].rows.forEach(function (t) { th[t.event_key] = Number(t.threshold_score); });
    var BRD = { '1m': '1M', '3m': '3M', 'Platform': 'Platform' };
    var dd = res[3].rows.map(function (x) {
      return { stage: x.stage, round: x.round, group: 'Group ' + x.grp, gender: x.gender, disc: BRD[x.board],
        dives: Number(x.dives), sum: Number(x.dd_sum), divers: Number(x.divers) };
    });
    var clubHome = {};
    res[4].rows.forEach(function (x) { clubHome[x.team] = x.home; });
    cache[year] = { rows: rows, status: res[1].rows, thresholds: th, dd: dd, clubHome: clubHome };
    return cache[year];
  }

  /* ── Map geometry ───────────────────────────────────────────────────────────
     The same county shapes and the same official 2026 alignment Boundary
     Studio draws: boundary-data.json for the shapes, the saved scenario
     'seed-2026-official' for which county is in which region and which
     regions make up each zone. Loaded once, after the tables. */
  var geo = null, geoLoading = null, geoError = null;
  var MAP_SCENARIO = { 2026: 'seed-2026-official' };
  function loadGeo(year) {
    if (geo || geoError) return Promise.resolve(geo);
    if (geoLoading) return geoLoading;
    geoLoading = Promise.all([
      fetch('../membership-analytics/boundary-data.json').then(function (r) {
        if (!r.ok) throw new Error('map shapes ' + r.status); return r.json(); }),
      window.NEON.query('SELECT data FROM membership.boundary_scenarios WHERE id = $1', [MAP_SCENARIO[year]])
    ]).then(function (res) {
      var b = res[0], row = res[1].rows[0];
      if (!row) throw new Error('official alignment not found');
      var d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      geo = { viewBox: b.viewBox, counties: b.counties, stateMesh: b.stateMesh,
        assign: d.assign || {}, zoneOf: (d.tiers && d.tiers.zoneOf) || [], built: {} };
      return geo;
    }).catch(function (e) { geoError = e.message || String(e); return null; });
    return geoLoading;
  }
  function areaOfCounty(fips, mapView) {
    var ri = geo.assign[fips];
    if (ri == null || ri < 0) return null;
    if (mapView === 'region') return String(ri + 1);
    var zi = geo.zoneOf[ri];
    return zi == null ? null : 'ABCDEFGHIJ'.charAt(zi);
  }
  /* One path per area, the lines between areas, and a label point for each. */
  function buildGeo(mapView) {
    if (geo.built[mapView]) return geo.built[mapView];
    var paths = {}, box = {}, seg = {}, border = [];
    geo.counties.forEach(function (c) {
      var a = areaOfCounty(c.f, mapView);
      if (a == null) return;
      (paths[a] = paths[a] || []).push(c.d);
      var bx = box[a] || (box[a] = { sx: 0, sy: 0, n: 0 });
      c.d.split('M').forEach(function (sub) {
        if (!sub) return;
        var pts = sub.replace(/Z/g, '').split('L');
        var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (var i = 0; i < pts.length; i++) {
          var xy = pts[i].split(','), x = +xy[0], y = +xy[1];
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          var q = pts[(i + 1) % pts.length];
          if (q === pts[i]) continue;
          var k = pts[i] < q ? pts[i] + '|' + q : q + '|' + pts[i];
          var prev = seg[k];
          if (prev === undefined) seg[k] = a;
          else if (prev !== a && prev !== true) { border.push('M' + pts[i] + 'L' + q); seg[k] = true; }
        }
        var w = (x1 - x0) * (y1 - y0) + 0.01;
        bx.sx += w * (x0 + x1) / 2; bx.sy += w * (y0 + y1) / 2; bx.n += w;
      });
    });
    var out = { paths: {}, border: border.join(''), label: {} };
    Object.keys(paths).forEach(function (a) {
      out.paths[a] = paths[a].join('');
      out.label[a] = [box[a].sx / box[a].n, box[a].sy / box[a].n];
    });
    geo.built[mapView] = out;
    return out;
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
             (!filt || filt.gender === 'All' || r.gender === filt.gender) &&
             (!filt || !filt.disc || filt.disc === 'All' || r.disc === filt.disc);
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

    /* Moving up. An athlete outside the places at Zones or E/W/C can still hold
       a qualifying place once the athletes ahead who do not use one are passed
       over: those already qualified another way (HPS, YMCA, already qualified,
       or Zone top 3 when the meet is E/W/C), foreign athletes and dual citizens
       declared for another federation, and athletes who did not go on. */
    var later = {};
    rows.forEach(function (r) { if (r.stage === 'EWC' || r.stage === 'Nationals') later[r.key] = true; });
    function preQual(id) { return S.hps[id] || S.other[id] || S.foreign[id] || S.dual[id]; }
    var zField = {}, eField = {};
    rows.forEach(function (r) {
      if (r.nd) return;
      if (r.stage === 'Zones') (zField[r.zone + '|' + r.ev] = zField[r.zone + '|' + r.ev] || []).push(r);
      else if (r.stage === 'EWC' && r.round === 'Final') (eField[r.ewc + '|' + r.ev] = eField[r.ewc + '|' + r.ev] || []).push(r);
    });
    function zoneEff(z) {
      var n = 0;
      (zField[z.zone + '|' + z.ev] || []).forEach(function (o) {
        if (o.place < z.place && (preQual(o.id) || !later[o.key])) n++;
      });
      return z.place - n;
    }
    function ewcEff(e) {
      var n = 0;
      (eField[e.ewc + '|' + e.ev] || []).forEach(function (o) {
        var zo = zon[o.key];
        if (o.place < e.place && (preQual(o.id) || (zo && !zo.nd && zo.place <= 3) || !natP[o.key])) n++;
      });
      return e.place - n;
    }

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
      else if (zp != null && zoneEff(z) <= 3) t.route = 5;
      else if (epl != null && (function () {
        var eff = ewcEff(e);
        return eff <= 3 || (eff <= 6 && th[p.ev] != null && e.score >= th[p.ev]);
      })()) t.route = 6;
      else if (e || ep) t.route = 7;
      else if (z && !z.nd) t.route = 8;
      else t.route = 9;
      return t;
    });
    var ROUTES = [
      'Zone top 3',
      'E/W/C top 3',
      'E/W/C 4th to 6th, at or above the 3rd-place average',
      'HPS, no qualifying finish in this event',
      'Non-displacing',
      'Moved up at Zones: inside the top 3 once athletes ahead are passed over',
      'Moved up at E/W/C: inside the qualifying line once athletes ahead are passed over',
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

    /* 5. Score at the last qualifying place, per event */
    var EVORDER = [];
    ['Group A', 'Group B', 'Group C', 'Group D'].forEach(function (g) {
      ['Boys', 'Girls'].forEach(function (x) { ['1M', '3M', 'Platform'].forEach(function (b) { EVORDER.push(g + ' ' + x + ' ' + b); }); });
    });
    function cutAt(test, placeN, meetOf) {
      var by = {}, meets = {};
      rows.forEach(function (r) {
        if (!test(r)) return;
        var m = meetOf(r); (meets[r.ev] = meets[r.ev] || {})[m] = true;
        if (!r.nd && r.place === placeN) { (by[r.ev] = by[r.ev] || {})[m] = r.score; }
      });
      var out = {};
      Object.keys(meets).forEach(function (ev) {
        var v = Object.keys(by[ev] || {}).map(function (m) { return by[ev][m]; });
        out[ev] = v.length ? { avg: v.reduce(function (a, b) { return a + b; }, 0) / v.length,
          low: Math.min.apply(null, v), high: Math.max.apply(null, v), n: v.length, of: size(meets[ev]) }
          : { n: 0, of: size(meets[ev]) };
      });
      return out;
    }
    var isRegQ = function (r) { return r.stage === 'Regionals' && (r.group === 'Group A' || r.group === 'Group B') && r.disc !== 'Platform'; };
    var cutCols = {
      reg15: cutAt(isRegQ, 15, function (r) { return r.region; }),
      z3: cutAt(function (r) { return r.stage === 'Zones'; }, 3, function (r) { return r.zone; }),
      z18: cutAt(function (r) { return r.stage === 'Zones'; }, 18, function (r) { return r.zone; }),
      e3: cutAt(function (r) { return r.stage === 'EWC' && r.round === 'Final'; }, 3, function (r) { return r.ewc; }),
      n12: cutAt(function (r) { return r.stage === 'Nationals' && r.round === 'Prelim'; }, 12, function () { return 'JN'; }),
      n3: cutAt(function (r) { return r.stage === 'Nationals' && r.round === 'Final'; }, 3, function () { return 'JN'; })
    };
    var evShown = {}; rows.forEach(function (r) { evShown[r.ev] = true; });
    var cuts = EVORDER.filter(function (ev) { return evShown[ev]; }).map(function (ev) {
      return { ev: ev, reg15: cutCols.reg15[ev], z3: cutCols.z3[ev], z18: cutCols.z18[ev],
        e3: cutCols.e3[ev], avgBar: th[ev], n12: cutCols.n12[ev], n3: cutCols.n3[ev] };
    });

    /* 6. Average degree of difficulty of optional dives, per event and stop */
    var ddBy = {};
    (data.dd || []).forEach(function (x) {
      if (filt && filt.group !== 'All' && x.group !== filt.group) return;
      if (filt && filt.gender !== 'All' && x.gender !== filt.gender) return;
      if (filt && filt.disc && filt.disc !== 'All' && x.disc !== filt.disc) return;
      var col = x.stage === 'Regionals' ? 'reg' : x.stage === 'Zones' ? 'zone'
        : x.stage === 'EWC' ? (x.round === 'Prelim' ? 'ewc' : null)
        : x.stage === 'Nationals' ? (x.round === 'Prelim' ? 'nat' : 'fin') : null;
      if (!col) return;
      var ev = x.group + ' ' + x.gender + ' ' + x.disc;
      var o = (ddBy[ev] = ddBy[ev] || {}); var c2 = (o[col] = o[col] || { dives: 0, sum: 0 });
      c2.dives += x.dives; c2.sum += x.sum;
    });
    var ddRows = EVORDER.filter(function (ev) { return ddBy[ev]; }).map(function (ev) {
      var o = { ev: ev };
      ['reg', 'zone', 'ewc', 'nat', 'fin'].forEach(function (k) { o[k] = ddBy[ev][k] ? { avg: ddBy[ev][k].sum / ddBy[ev][k].dives, dives: ddBy[ev][k].dives } : null; });
      return o;
    });

    /* 7. Where the Nationals field and finalists competed on the way up */
    function strength(stage, field) {
      var by = {};
      rows.forEach(function (r) { if (r.stage === stage && r[field] != null && r[field] !== '') (by[r[field]] = by[r[field]] || {})[r.id] = true; });
      return Object.keys(by).map(function (k) {
        var set = by[k], a = size(set), f = both(set, A.Final);
        return { name: k, athletes: a, nationals: both(set, A.Nationals), finals: f, top3: both(set, A.Top3), rate: a ? 100 * f / a : 0 };
      }).sort(function (x, y) { return y.rate - x.rate || y.finals - x.finals; });
    }
    /* 8. Zone scores against how the zone's top three then placed at Nationals */
    var zoneNames = Object.keys(zField).map(function (k) { return k.split('|')[0]; })
      .filter(function (z, i, a) { return a.indexOf(z) === i; }).sort();
    var third = {}, evsZ = {};
    Object.keys(zField).forEach(function (k) {
      var z = k.split('|')[0], ev = k.slice(z.length + 1);
      zField[k].forEach(function (r) { if (r.place === 3) { third[ev + '|' + z] = r.score; } });
      evsZ[ev] = true;
    });
    var zonePair = zoneNames.map(function (z) {
      var diffs = [];
      Object.keys(evsZ).forEach(function (ev) {
        var v = zoneNames.map(function (y) { return third[ev + '|' + y]; });
        if (v.some(function (x) { return x == null; })) return;
        diffs.push(third[ev + '|' + z] - v.reduce(function (a, b) { return a + b; }, 0) / v.length);
      });
      var places = [], awarded = 0, fin = 0, pod = 0;
      Object.keys(zField).forEach(function (k) {
        if (k.split('|')[0] !== z) return;
        zField[k].forEach(function (r) {
          if (r.place > 3) return;
          awarded++;
          var p = natP[r.key], f = natF[r.key];
          if (p && !p.nd) places.push(p.place);
          if (f) { fin++; if (!f.nd && f.place <= 3) pod++; }
        });
      });
      return { name: z, events: diffs.length,
        diff: diffs.length ? diffs.reduce(function (a, b) { return a + b; }, 0) / diffs.length : null,
        awarded: awarded, atNat: places.length,
        avgPlace: places.length ? places.reduce(function (a, b) { return a + b; }, 0) / places.length : null,
        finals: fin, top3: pod };
    }).sort(function (a, b) { return (a.avgPlace == null ? 999 : a.avgPlace) - (b.avgPlace == null ? 999 : b.avgPlace); });

    /* 9. Region choice. Home = the club's home region. */
    var CH = data.clubHome || {};
    var r2z = {}, r2zN = {};
    data.rows.forEach(function (r) { if (r.stage === 'Regionals' && r.region) r2zN[r.id] = r.region; });
    var tally = {};
    data.rows.forEach(function (r) {
      if (r.stage !== 'Zones' || !r.zone || !r2zN[r.id]) return;
      var k = r2zN[r.id]; (tally[k] = tally[k] || {}); tally[k][r.zone] = (tally[k][r.zone] || 0) + 1;
    });
    Object.keys(tally).forEach(function (reg) {
      r2z[reg] = Object.keys(tally[reg]).sort(function (a, b) { return tally[reg][b] - tally[reg][a]; })[0];
    });
    var regAth = {}, zonAth = {};
    rows.forEach(function (r) {
      if (r.stage === 'Regionals' && r.region && !regAth[r.id]) regAth[r.id] = { id: r.id, group: r.group, at: r.region, home: CH[r.team] || null };
      if (r.stage === 'Zones' && r.zone && !zonAth[r.id]) zonAth[r.id] = { id: r.id, group: r.group, at: r.zone, home: CH[r.team] ? (r2z[CH[r.team]] || null) : null };
    });
    function statusOf(a) { return a.home == null ? 'unknown' : (a.home === a.at ? 'home' : 'away'); }
    function choiceRows(map, extra) {
      var groups = ['Group A', 'Group B', 'Group C', 'Group D'], out = [];
      groups.concat(['All']).forEach(function (g) {
        var list = Object.keys(map).map(function (k) { return map[k]; }).filter(function (a) { return g === 'All' || a.group === g; });
        if (!list.length) return;
        var o = { label: g === 'All' ? 'All shown' : g, athletes: list.length, home: 0, away: 0, unknown: 0, first: 0 };
        list.forEach(function (a) { o[statusOf(a)]++; if (extra && !A.Regionals[a.id]) o.first++; });
        o.share = (o.home + o.away) ? 100 * o.away / (o.home + o.away) : null;
        out.push(o);
      });
      return out;
    }
    var choiceReg = choiceRows(regAth, false), choiceZone = choiceRows(zonAth, true);
    var regFlow = {};
    Object.keys(regAth).forEach(function (k) {
      var a = regAth[k], st = statusOf(a);
      function slot(n) { return (regFlow[n] = regFlow[n] || { name: n, stayed: 0, left: 0, came: 0 }); }
      if (st === 'home') slot(a.at).stayed++;
      else if (st === 'away') { slot(a.home).left++; slot(a.at).came++; }
    });
    var flows = Object.keys(regFlow).map(function (k) { return regFlow[k]; })
      .sort(function (a, b) { return Number(a.name) - Number(b.name); });
    var outcome = ['home', 'away', 'unknown'].map(function (st) {
      var set = {}; Object.keys(regAth).forEach(function (k) { if (statusOf(regAth[k]) === st) set[k] = true; });
      return { label: st === 'home' ? 'Competed in the club\'s home region' : st === 'away' ? 'Competed in another region' : 'Club home region unknown',
        athletes: size(set), zones: both(set, A.Zones), nationals: both(set, A.Nationals), finals: both(set, A.Final), top3: both(set, A.Top3) };
    }).filter(function (o) { return o.athletes; });
    /* Home entries just outside the Regional top 15 in events where away entries finished inside it */
    var regEv = {};
    rows.forEach(function (r) { if (isRegQ(r) && !r.nd) (regEv[r.region + '|' + r.ev] = regEv[r.region + '|' + r.ev] || []).push(r); });
    var effect = { awayInside: 0, events: 0, pushed: 0, pushedAdvanced: 0, list: [] };
    Object.keys(regEv).forEach(function (k) {
      var f = regEv[k], away = f.filter(function (r) { return r.place <= 15 && CH[r.team] && CH[r.team] !== r.region; }).length;
      if (!away) return;
      effect.awayInside += away;
      var hit = f.filter(function (r) { return r.place > 15 && r.place <= 15 + away && !(CH[r.team] && CH[r.team] !== r.region); });
      if (hit.length) effect.events++;
      hit.forEach(function (r) { effect.pushed++; var adv = !!zon[r.key]; if (adv) effect.pushedAdvanced++;
        effect.list.push({ name: r.name, ev: r.ev, region: r.region, place: r.place, advanced: adv }); });
    });

    /* 10. Map figures: each area by where athletes competed and by club home */
    function mapStats(map, homeKeyOf) {
      var comp = {}, home = {}, unknown = 0;
      function slot(o, k) { return o[k] || (o[k] = { set: {}, moved: 0, known: 0 }); }
      Object.keys(map).forEach(function (id) {
        var a = map[id], hk = homeKeyOf(a);
        var c1 = slot(comp, a.at); c1.set[id] = true;
        if (hk == null) { unknown++; return; }
        c1.known++; if (hk !== a.at) c1.moved++;
        var h1 = slot(home, hk); h1.set[id] = true; h1.known++; if (hk !== a.at) h1.moved++;
      });
      function finish(o) {
        var out = {};
        Object.keys(o).forEach(function (k) {
          var set = o[k].set, n = size(set), f = both(set, A.Final);
          out[k] = { athletes: n, nationals: both(set, A.Nationals), finals: f, top3: both(set, A.Top3),
            rate: n ? 100 * f / n : null, moved: o[k].moved, choice: o[k].known ? 100 * o[k].moved / o[k].known : null };
        });
        return out;
      }
      return { competed: finish(comp), home: finish(home), unknown: unknown };
    }
    var mapFig = {
      region: mapStats(regAth, function (a) { return a.home; }),
      zone: mapStats(zonAth, function (a) { return a.home; })
    };

    var zoneStrength = strength('Zones', 'zone');
    var regionStrength = strength('Regionals', 'region');

    return { stops: stops, field: field, routes: routes, entriesTotal: entries.length,
      cuts: cuts, ddRows: ddRows, zoneStrength: zoneStrength, regionStrength: regionStrength,
      mapFig: mapFig, zonePair: zonePair, choiceReg: choiceReg, choiceZone: choiceZone, flows: flows, outcome: outcome, effect: effect,
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
  var ALL_LABEL = { group: 'All groups', gender: 'Boys and girls', disc: 'All boards' };
  var BOARD = { '1M': '1-meter', '3M': '3-meter', 'Platform': 'Platform' };
  function chips(name, options, current) {
    return '<div class="pa-chips" role="group" aria-label="' + name + '">' + options.map(function (o) {
      return '<button type="button" class="pa-chip' + (o === current ? ' is-on' : '') + '" data-pa-' + name + '="' + esc(o) + '">' +
        esc(o === 'All' ? ALL_LABEL[name] : (BOARD[o] || o)) + '</button>';
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
      if (!r.entries) return '';
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


    function cutCell(c, unit) {
      if (!c) return '<td class="pa-na">&ndash;</td>';
      if (!c.n) return '<td class="pa-na">no ' + unit + ' reached it</td>';
      if (c.of === 1) return '<td>' + c.avg.toFixed(2) + '</td>';
      return '<td>' + c.avg.toFixed(2) + ' <span class="pa-sub">' + c.low.toFixed(2) + ' to ' + c.high.toFixed(2) +
        (c.n < c.of ? ', ' + c.n + ' of ' + c.of + ' ' + unit + 's' : '') + '</span></td>';
    }
    function evName(ev) { return esc(ev.replace('Group ', '').replace(' 1M', ' 1-meter').replace(' 3M', ' 3-meter')); }
    var cutBody = c.cuts.map(function (r) {
      return '<tr><td>' + evName(r.ev) + '</td>' + cutCell(r.reg15, 'region') + cutCell(r.z3, 'zone') + cutCell(r.z18, 'zone') +
        cutCell(r.e3, 'meet') + (r.avgBar != null ? '<td>' + Number(r.avgBar).toFixed(2) + '</td>' : '<td class="pa-na">&ndash;</td>') +
        cutCell(r.n12, 'meet') + cutCell(r.n3, 'meet') + '</tr>';
    }).join('');
    function ddCell(x) { return x ? '<td>' + x.avg.toFixed(2) + '</td>' : '<td class="pa-na">&ndash;</td>'; }
    var ddBody = c.ddRows.map(function (r) {
      return '<tr><td>' + evName(r.ev) + '</td>' + ddCell(r.reg) + ddCell(r.zone) + ddCell(r.ewc) + ddCell(r.nat) + ddCell(r.fin) + '</tr>';
    }).join('');
    function strengthBody(list, prefix) {
      return list.map(function (z) {
        return '<tr><td>' + esc(prefix + ' ' + z.name) + '</td>' + cell(z.athletes) + cell(z.nationals) + cell(z.finals) + cell(z.top3) +
          '<td>' + z.rate.toFixed(1) + '</td></tr>';
      }).join('');
    }
    function fx(v, d) { return v == null ? '<td class="pa-na">&ndash;</td>' : '<td>' + v.toFixed(d) + '</td>'; }
    var pairBody = c.zonePair.map(function (z) {
      return '<tr><td>Zone ' + esc(z.name) + '</td>' +
        (z.diff == null ? '<td class="pa-na">&ndash;</td>' : '<td>' + (z.diff > 0 ? '+' : '') + z.diff.toFixed(1) + ' <span class="pa-sub">' + z.events + ' events</span></td>') +
        cell(z.awarded) + cell(z.atNat) + fx(z.avgPlace, 1) + cell(z.finals) + cell(z.top3) + '</tr>';
    }).join('');
    function choiceBody(list, zone) {
      return list.map(function (o) {
        return '<tr' + (o.label === 'All shown' ? ' class="pa-total"' : '') + '><td>' + esc(o.label) + '</td>' + cell(o.athletes) +
          (zone ? cell(o.first) : '') + cell(o.home) + cell(o.away) + cell(o.unknown) +
          (o.share == null ? '<td class="pa-na">&ndash;</td>' : '<td>' + o.share.toFixed(1) + '%</td>') + '</tr>';
      }).join('');
    }
    var flowBody = c.flows.map(function (f) {
      var net = f.came - f.left;
      return '<tr><td>Region ' + esc(f.name) + '</td>' + cell(f.stayed) + cell(f.left) + cell(f.came) +
        '<td>' + (net > 0 ? '+' : '') + net + '</td></tr>';
    }).join('');
    var outBody = c.outcome.map(function (o) {
      function pc(n) { return '<td>' + num(n) + ' <span class="pa-sub">' + (o.athletes ? (100 * n / o.athletes).toFixed(1) : '0.0') + '%</span></td>'; }
      return '<tr><td>' + esc(o.label) + '</td>' + cell(o.athletes) + pc(o.zones) + pc(o.nationals) + pc(o.finals) + pc(o.top3) + '</tr>';
    }).join('');
    var effId = 'e0', effDetail = '';
    if (view.open[effId] && !STATIC) {
      effDetail = table(['Athlete', 'Event', 'Region', 'Regional place', 'Competed at Zones'],
        c.effect.list.slice().sort(function (a, b) { return Number(a.region) - Number(b.region) || a.ev.localeCompare(b.ev) || a.place - b.place; })
          .map(function (t) { return '<tr><td>' + esc(t.name) + '</td><td>' + evName(t.ev) + '</td><td>' + esc(t.region) + '</td><td>' + t.place + '</td><td>' + (t.advanced ? 'Yes' : 'No') + '</td></tr>'; }).join(''));
    }
    var MEASURES = [
      ['athletes', 'Athletes'], ['nationals', 'Competed at Nationals'], ['finals', 'In a Nationals final'],
      ['rate', 'Share reaching a final'], ['choice', view.mapBase === 'home' ? 'Share who competed elsewhere' : 'Share who came from elsewhere']
    ];
    function fmtM(v, key) { return v == null ? 'none' : (key === 'rate' || key === 'choice') ? v.toFixed(1) + '%' : num(v); }
    function mapBlock() {
      var word = view.mapView === 'region' ? 'Region' : 'Zone';
      var ctl = STATIC ? '' :
        '<div class="pa-filters">' +
          '<div class="pa-chips" role="group" aria-label="Map areas">' + [['region', 'Regions'], ['zone', 'Zones']].map(function (o) {
            return '<button type="button" class="pa-chip' + (view.mapView === o[0] ? ' is-on' : '') + '" data-pa-mapview="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
          '<div class="pa-chips" role="group" aria-label="Count athletes by">' + [['competed', 'Where they competed'], ['home', 'Club home']].map(function (o) {
            return '<button type="button" class="pa-chip' + (view.mapBase === o[0] ? ' is-on' : '') + '" data-pa-mapbase="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
          '<div class="pa-chips" role="group" aria-label="Measure">' + MEASURES.map(function (m) {
            return '<button type="button" class="pa-chip' + (view.mapMeasure === m[0] ? ' is-on' : '') + '" data-pa-mapmeasure="' + m[0] + '">' + esc(m[1]) + '</button>'; }).join('') + '</div>' +
        '</div>';
      var title = h('Map: ' + esc(MEASURES.filter(function (m) { return m[0] === view.mapMeasure; })[0][1]) + ' by ' + word.toLowerCase() +
        ', ' + (view.mapBase === 'home' ? 'counted at the club\'s home' : 'counted where athletes competed'));
      if (geoError) return title + ctl + note('The map could not be loaded: ' + esc(geoError));
      if (!geo) return title + ctl + note('Loading the map.');
      var g = buildGeo(view.mapView), fig = c.mapFig[view.mapView], data = fig[view.mapBase], key = view.mapMeasure;
      var names = Object.keys(g.paths).sort(function (a, b) { return view.mapView === 'region' ? a - b : a.localeCompare(b); });
      var vals = names.map(function (n) { return data[n] ? data[n][key] : null; }).filter(function (v) { return v != null; });
      var lo = vals.length ? Math.min.apply(null, vals) : 0, hi = vals.length ? Math.max.apply(null, vals) : 0;
      var RAMP = ['#e3eef9', '#b9d8f0', '#8fc3ea', '#3ea9d1', '#0e6f9c', '#171f69'];
      function step(v) { return v == null ? -1 : (hi === lo ? 3 : Math.min(RAMP.length - 1, Math.floor((v - lo) / (hi - lo) * RAMP.length))); }
      var shapes = names.map(function (n) {
        var v = data[n] ? data[n][key] : null, st = step(v);
        return '<path d="' + g.paths[n] + '" fill="' + (st < 0 ? '#f1f2f5' : RAMP[st]) + '" data-pa-area="' + esc(n) + '"' +
          (view.mapSel === n ? ' class="is-sel"' : (view.mapSel ? ' class="is-dim"' : '')) + '><title>' + word + ' ' + esc(n) + ': ' + fmtM(v, key) + '</title></path>';
      }).join('');
      var labels = names.map(function (n) {
        var v = data[n] ? data[n][key] : null, st = step(v), p = g.label[n], dark = st >= 3;
        return '<g class="pa-map-label" transform="translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')" fill="' + (dark ? '#fff' : '#171f69') + '">' +
          '<text class="pa-map-name" text-anchor="middle" y="-3">' + (view.mapView === 'region' ? 'R' : 'Zone ') + esc(n) + '</text>' +
          '<text class="pa-map-val" text-anchor="middle" y="11">' + fmtM(v, key) + '</text></g>';
      }).join('');
      var svg = '<div class="pa-map"><svg viewBox="' + esc(geo.viewBox) + '" role="img" aria-label="' + esc(word + ' map') + '">' +
        '<g class="pa-map-areas">' + shapes + '</g>' +
        '<path class="pa-map-states" d="' + geo.stateMesh + '"/>' +
        '<path class="pa-map-border" d="' + g.border + '"/>' + labels + '</svg></div>';
      var legend = '<div class="pa-legend"><span>' + fmtM(vals.length ? lo : null, key) + '</span>' +
        RAMP.map(function (col) { return '<i style="background:' + col + '"></i>'; }).join('') + '<span>' + fmtM(vals.length ? hi : null, key) + '</span></div>';
      var body = names.map(function (n) {
        var o = data[n]; if (!o) return '';
        return '<tr' + (view.mapSel === n ? ' class="pa-total"' : '') + '><td>' + word + ' ' + esc(n) + '</td>' + cell(o.athletes) + cell(o.nationals) + cell(o.finals) + cell(o.top3) +
          (o.rate == null ? '<td class="pa-na">&ndash;</td>' : '<td>' + o.rate.toFixed(1) + '%</td>') +
          cell(o.moved) + (o.choice == null ? '<td class="pa-na">&ndash;</td>' : '<td>' + o.choice.toFixed(1) + '%</td>') + '</tr>';
      }).join('');
      var who = view.mapView === 'region' ? 'athletes who competed at a Regional' : 'athletes who competed at a Zone';
      return title + ctl + svg + legend +
        table([word, 'Athletes', 'Competed at Nationals', 'In a Nationals final', 'Top 3', 'Share reaching a final',
          view.mapBase === 'home' ? 'Competed elsewhere' : 'Came from elsewhere', 'Share'], body) +
        note('Counts ' + who + '. ' + (view.mapBase === 'home'
          ? num(fig.unknown) + ' athletes at clubs with no home on record are left off this view.'
          : 'The last two columns leave out ' + num(fig.unknown) + ' athletes at clubs with no home on record.'));
    }
    var STRENGTH_HEAD = ['Athletes', 'Competed at Nationals', 'In a Nationals final', 'Top 3', 'Finalists per 100 athletes'];

    var showing = (view.group === 'All' && view.gender === 'All' && view.disc === 'All') ? '' :
      '<p class="pa-showing">Showing ' + esc(view.group === 'All' ? 'all groups' : view.group) + ', ' +
      esc(view.gender === 'All' ? 'boys and girls' : view.gender.toLowerCase() + ' only') + ', ' +
      esc(view.disc === 'All' ? 'all boards' : BOARD[view.disc].toLowerCase() + ' only') + '.</p>';
    var lead = 'Counted from results. Individual events, Groups A to D. ' +
      'Of the ' + num(c.field.total) + ' athletes at Junior Nationals, ' + num(c.field.regionals) + ' started at a Regional, ' +
      num(c.field.zones) + ' started at a Zone and ' + num(c.field.neither) + ' had no Regional or Zone result.';
    function h(t) { return STATIC ? '<h3 class="rb-h3">' + t + '</h3>' : '<h4 class="pa-h4">' + t + '</h4>'; }
    function note(t) { return '<p class="' + (STATIC ? 'rb-soft' : 'pa-note') + '">' + t + '</p>'; }
    var tables =
        mapBlock() +
        h('Unique athletes reaching each later stop') +
        table(['Started', 'Athletes', 'Zones', 'E/W/C', 'Junior Nationals', 'A Nationals final', 'Top 3'], stopBody) +
        h('How each Junior Nationals event entry got there') +
        table(['Route into that event', 'Event entries', 'Unique athletes', 'Reached the final', 'Top 3', ''], routeBody) +
        note('Passed over: athletes ahead in that event who were already qualified another way (HPS, YMCA, Zone top 3), ' +
          'foreign athletes and dual citizens declared for another federation, and athletes who did not go on in that event.') +
        note(num(c.finals.entries) + ' final entries: ' + num(c.finals.numbered) + ' with a numbered place and ' +
          num(c.finals.entries - c.finals.numbered) + ' non-displacing.') +
        h('Zone placing against Junior Nationals (event entries)') +
        table(['Zone place', 'Zone entries', 'Competed at E/W/C', 'Competed at Nationals', 'Reached the final', 'Top 3'], bandBody(c.zoneBands, true)) +
        h('E/W/C finish against Junior Nationals (event entries)') +
        table(['E/W/C finish', 'E/W/C entries', 'Competed at Nationals', 'Reached the final', 'Top 3'], bandBody(c.ewcBands, false)) +
        h('Foreign athletes and dual citizens declared for another federation') +
        table(['Stop', 'Athletes', 'Event entries', 'Scored non-displacing', 'Numbered place', 'Finish on score', ''], forBody) +
        (c.unexplained.length ? note(num(c.unexplained.length) +
          ' more event entries were scored non-displacing with no status on file for the athlete.') : '') +
        h('Score at the last qualifying place') +
        table(['Event', 'Regional 15th', 'Zone 3rd', 'Zone 18th', 'E/W/C 3rd', 'E/W/C 3rd-place average on file', 'Nationals prelim 12th', 'Nationals final 3rd'], cutBody) +
        note('Where there is more than one meet the figure is the average across meets, with the lowest and highest. ' +
          'A count such as 6 of 12 regions means the other regions had fewer finishers than places, so everyone advanced.') +
        h('Average degree of difficulty, optional dives') +
        table(['Event', 'Regionals', 'Zones', 'E/W/C prelim', 'Nationals prelim', 'Nationals final'], ddBody) +
        h('Zone scores against Nationals results') +
        table(['Zone', 'Zone 3rd-place score against the all-zone average', 'Top 3 places awarded', 'Competed at Nationals',
          'Average Nationals prelim place', 'Reached a final', 'Top 3'], pairBody) +
        note('Each zone is scored by its own panel. Nationals is the one meet where every zone is scored by the same panel.') +
        h('Region choice at Regionals') +
        table(['Group', 'Athletes', 'Club\'s home region', 'Another region', 'Club home unknown', 'Share in another region'], choiceBody(c.choiceReg, false)) +
        h('Region choice at Zones') +
        table(['Group', 'Athletes', 'No Regional first', 'Club\'s home zone', 'Another zone', 'Club home unknown', 'Share in another zone'], choiceBody(c.choiceZone, true)) +
        h('Athletes leaving and arriving, by region') +
        table(['Region', 'Stayed home', 'Went to another region', 'Came from another region', 'Net'], flowBody) +
        h('How far Regional athletes went') +
        table(['At Regionals', 'Athletes', 'Reached Zones', 'Competed at Nationals', 'In a Nationals final', 'Top 3'], outBody) +
        note(num(c.effect.awayInside) + ' entries from another region finished inside a Regional top 15. ' +
          num(c.effect.pushed) + ' home entries finished in the places just behind them, in ' + num(c.effect.events) + ' events; ' +
          num(c.effect.pushedAdvanced) + ' of those still competed at Zones. ' + (STATIC ? '' : openBtn(effId, c.effect.pushed))) + effDetail +
        note('Home is the club\'s home region: the region its athletes have competed in most since 2021. The home zone is the zone that region feeds.') +
        h('Regions ranked by Nationals finalists per 100 athletes') +
        table(['Region'].concat(STRENGTH_HEAD), strengthBody(c.regionStrength, 'Region')) +
        note('An athlete counts for the zone or region where they competed, which is not always where they live. ' +
          'Groups C and D were not required to compete at a Regional in 2026.');
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
          chips('gender', ['All', 'Boys', 'Girls'], view.gender) +
          chips('disc', ['All', '1M', '3M', 'Platform'], view.disc) + '</div>' + showing + tables +
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
    var t = e.target.closest ? e.target.closest('[data-pa-group],[data-pa-gender],[data-pa-disc],[data-pa-open],[data-pa-mapview],[data-pa-mapbase],[data-pa-mapmeasure],[data-pa-area]') : null;
    if (!t) return;
    if (t.hasAttribute('data-pa-group')) view.group = t.getAttribute('data-pa-group');
    else if (t.hasAttribute('data-pa-gender')) view.gender = t.getAttribute('data-pa-gender');
    else if (t.hasAttribute('data-pa-disc')) view.disc = t.getAttribute('data-pa-disc');
    else if (t.hasAttribute('data-pa-mapview')) { view.mapView = t.getAttribute('data-pa-mapview'); view.mapSel = null; }
    else if (t.hasAttribute('data-pa-mapbase')) view.mapBase = t.getAttribute('data-pa-mapbase');
    else if (t.hasAttribute('data-pa-mapmeasure')) view.mapMeasure = t.getAttribute('data-pa-mapmeasure');
    else if (t.hasAttribute('data-pa-area')) { var ar = t.getAttribute('data-pa-area'); view.mapSel = view.mapSel === ar ? null : ar; }
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
    try { await load(year); paint(); loadGeo(year).then(function () { if (mounted.slot === slot) paint(); }); }
    catch (err) {
      slot.innerHTML = '<div class="pm-error"><strong>Could not load the stop-to-stop tables.</strong> ' + esc(err.message || String(err)) + '</div>';
    }
  }

  /* Static version for the report builder: all groups, no controls. */
  async function report(year) {
    year = Number(year);
    if (!RULE_YEARS[year]) return '';
    var d = await load(year), keep = view;
    await loadGeo(year);
    view = { group: 'All', gender: 'All', disc: 'All', open: {}, mapView: keep.mapView, mapBase: keep.mapBase, mapMeasure: keep.mapMeasure, mapSel: null }; STATIC = true;
    try { return render(compute(d, view), year); }
    finally { STATIC = false; view = keep; }
  }

  window.PipelineActuals = { mount: mount, load: load, compute: compute, report: report };
})();
