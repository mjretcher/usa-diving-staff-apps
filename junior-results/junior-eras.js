/* ============================================================================
   junior-eras.js — per-season Junior Circuit rules

   The Junior Results Audit now spans 2013–2026, and the format changed several
   times. Showing a 2016 result under 2026 rules would be wrong in a way that
   looks right, so every season-dependent fact lives here and nothing infers a
   rule from the current season.

   PROVENANCE MATTERS. Two kinds of fact live in this file:

     • verified   — established from the data itself (dive counts derived from
                    1.58M dive rows in core.dive_sheets, cross-checked against
                    the 2018 USA Diving rule book) or from a published USA
                    Diving source.
     • unverified — the structure is visible in the data, but the qualifying
                    numbers have not been confirmed against a rule book for
                    that season.

   Anything unverified is flagged so the UI can caveat it rather than print a
   number that looks authoritative. Do not promote a fact to verified without
   a source.
   ========================================================================= */
(function () {
  'use strict';

  /* ── Dive counts ──────────────────────────────────────────────────────
     Derived empirically: modal dive count per sheet, grouped by season, age
     group, gender and board, over every Regionals / Zones / Nationals meet in
     the crawl. Confirmed against the 2018 rule book, which specifies Group A
     girls platform 9 and Group A boys platform 10 — both match.

     Observation begins in 2014; 2013 has too few sheets to establish a mode,
     so it inherits 2014 and is marked inferred.

     Each entry is [fromYear, count]; the last entry whose fromYear <= season
     wins. */
  var DIVE_COUNTS = {
    'A|Girls|1M': [[2014, 10], [2024, 9]],
    'A|Girls|3M': [[2014, 10], [2024, 9]],
    'A|Girls|PL': [[2014, 9], [2024, 8]],
    'A|Boys|1M': [[2014, 11], [2024, 10]],
    'A|Boys|3M': [[2014, 11], [2024, 10]],
    'A|Boys|PL': [[2014, 10], [2024, 9]],

    'B|Girls|1M': [[2014, 8], [2019, 9], [2024, 8]],
    'B|Girls|3M': [[2014, 8], [2019, 9], [2024, 8]],
    'B|Girls|PL': [[2014, 7]],
    'B|Boys|1M': [[2014, 9]],
    'B|Boys|3M': [[2014, 9]],
    'B|Boys|PL': [[2014, 8]],

    'C|Girls|1M': [[2014, 7], [2018, 8], [2024, 7]],
    'C|Girls|3M': [[2014, 7], [2018, 8], [2024, 7]],
    'C|Girls|PL': [[2014, 6]],
    'C|Boys|1M': [[2014, 8]],
    'C|Boys|3M': [[2014, 8]],
    'C|Boys|PL': [[2014, 7]],

    'D|Girls|1M': [[2014, 6]],
    'D|Girls|3M': [[2014, 6]],
    'D|Girls|PL': [[2014, 5], [2024, 6]],
    'D|Boys|1M': [[2014, 6]],
    'D|Boys|3M': [[2014, 6]],
    'D|Boys|PL': [[2014, 5], [2024, 6]]
  };

  var OBSERVED_FROM = 2014;

  function normGroup(g) {
    if (!g) return null;
    var m = String(g).match(/([ABCD])\s*$/i) || String(g).match(/Group\s*([ABCD])/i);
    return m ? m[1].toUpperCase() : null;
  }

  function normGender(g) {
    g = String(g || '').toLowerCase();
    if (g.indexOf('girl') === 0 || g === 'female' || g === 'women' || g === 'f') return 'Girls';
    if (g.indexOf('boy') === 0 || g === 'male' || g === 'men' || g === 'm') return 'Boys';
    return null;
  }

  function normBoard(d) {
    d = String(d || '').toLowerCase();
    if (d.indexOf('platform') >= 0 || d.indexOf('tower') >= 0 || d === 'pl') return 'PL';
    if (d.indexOf('3') >= 0) return '3M';
    if (d.indexOf('1') >= 0) return '1M';
    return null;
  }

  /* Required dive count for a season/group/gender/board.
     Returns { count, inferred } or null when the combination is unknown. */
  function diveCount(year, group, gender, board) {
    var k = [normGroup(group), normGender(gender), normBoard(board)].join('|');
    var series = DIVE_COUNTS[k];
    if (!series) return null;
    var y = Number(year);
    var val = null;
    for (var i = 0; i < series.length; i++) {
      if (y >= series[i][0]) val = series[i][1];
    }
    if (val == null) val = series[0][1];
    return { count: val, inferred: y < OBSERVED_FROM };
  }

  /* True when the required dive count differs between two seasons, which makes
     a raw total comparison across them misleading. This is the check the app
     should run before putting two seasons' scores side by side. */
  function diveCountChanged(yearA, yearB, group, gender, board) {
    var a = diveCount(yearA, group, gender, board);
    var b = diveCount(yearB, group, gender, board);
    if (!a || !b) return false;
    return a.count !== b.count;
  }

  /* Every season in which any dive count changed, for caveat text. */
  var DIVE_COUNT_CHANGE_YEARS = [2018, 2019, 2024];

  function diveCountCaveat(years) {
    var ys = (years || []).map(Number).filter(function (y) { return y; }).sort();
    if (ys.length < 2) return null;
    var crossed = DIVE_COUNT_CHANGE_YEARS.filter(function (c) {
      return c > ys[0] && c <= ys[ys.length - 1];
    });
    if (!crossed.length) return null;
    var list = crossed.length > 1
      ? crossed.slice(0, -1).join(', ') + ' and ' + crossed[crossed.length - 1]
      : String(crossed[0]);
    return 'Required dive counts changed in ' + list +
      '. Raw score totals are not directly comparable across that boundary.';
  }

  /* ── Season structure ─────────────────────────────────────────────────── */
  var SEASONS = {};

  function defineSeason(year, cfg) { SEASONS[year] = cfg; }

  // 2026 onward. Published by USA Diving, May 2025.
  defineSeason(2026, {
    structure: 'region-zone-ewc-nationals',
    stages: ['Regionals', 'Zones', 'EWC', 'Nationals'],
    verified: true,
    source: 'USA Diving, "An Update on the Junior Competitive Season Beginning in 2026"',
    regionals: {
      groups: 'Groups A & B only — C & D advance straight to Zones',
      advance: 15,
      platform: 'exhibition',
      note: 'Two-day event. Group C & D events may be held as exhibition.'
    },
    zones: {
      groups: 'A, B, C, D on 1m, 3m and platform',
      direct: 3,
      toEWC: [4, 18],
      note: 'Top 3 per event qualify directly to Junior Nationals; places 4–18 advance to E/W/C.'
    },
    ewc: {
      direct: 3,
      note: 'Top 3 per event qualify to Junior Nationals. Four-day events.'
    },
    nationals: {
      note: 'Top 3 from each zone and each E/W/C meet, plus prequalified divers, compete in prelims. No semifinal from 2026 — prelims advance straight to finals.'
    }
  });

  // 2021–2025. From the app's own qualifier engine, which is the operative
  // source for these seasons.
  [2021, 2022, 2023, 2024, 2025].forEach(function (y) {
    defineSeason(y, {
      structure: 'region-zone-nationals',
      stages: ['Regionals', 'Zones', 'Nationals'],
      verified: true,
      source: 'USA Diving junior rules; matches the qualifier engine in junior-data.js',
      regionals: {
        groups: 'All four age groups compete on springboard',
        advance: 15,
        platform: 'exhibition',
        note: 'Top 15 per springboard event advance to Zones. Platform is not contested at Regionals.'
      },
      zones: {
        groups: 'A, B, C, D on 1m, 3m and platform',
        springboardAdvance: 10,
        platformAdvance: 7,
        semifinalDirect: 3,
        alternates: [11, 16],
        note: 'Springboard top 10 and platform top 7 advance. Places 1–3 enter at the semifinal, the rest at prelims. Places 11–16 are conditional alternates only.'
      },
      ewc: null,
      nationals: { note: 'Semifinal and final.' }
    });
  });

  // 2018–2019. Structure is visible in the data — twelve Regionals, six Zones,
  // a single Junior Nationals — but the qualifying numbers for these seasons
  // have not been checked against a rule book, so they are not stated.
  [2018, 2019].forEach(function (y) {
    defineSeason(y, {
      structure: 'region-zone-nationals',
      stages: ['Regionals', 'Zones', 'Nationals'],
      verified: false,
      unverifiedNote: 'Advancement numbers for this season have not been confirmed against a rule book. Placements and scores are accurate; qualifying cutoffs are not shown.',
      regionals: { platform: 'exhibition' },
      zones: {},
      ewc: null,
      nationals: {}
    });
  });

  // 2015–2017. Junior Nationals ran inside the senior National Championships.
  [2015, 2016, 2017].forEach(function (y) {
    defineSeason(y, {
      structure: 'region-zone-nationals',
      stages: ['Regionals', 'Zones', 'Nationals'],
      verified: false,
      unverifiedNote: 'Advancement numbers for this season have not been confirmed against a rule book.',
      combinedNationals: true,
      combinedNote: 'The Junior National Championships were held within the USA Diving National Championships this season — the same meet ran junior age-group events alongside senior events.',
      combinedZones: y <= 2017,
      zonesNote: 'Zone Championships were titled "National Preliminary Zone Championships" and also ran senior events.',
      regionals: {},
      zones: {},
      ewc: null,
      nationals: {}
    });
  });

  // 2013–2014. Two separate national championships.
  [2013, 2014].forEach(function (y) {
    defineSeason(y, {
      structure: 'region-zone-nationals',
      stages: ['Regionals', 'Zones', 'Nationals', 'AgeGroup-Nationals'],
      verified: false,
      unverifiedNote: 'Advancement numbers for this season have not been confirmed against a rule book.',
      dualNationals: true,
      dualNote: 'This season ran two separate national championships: the Junior National Championships and the Age Group National Championships, both contesting Groups A–D. They are shown separately.',
      combinedZones: true,
      zonesNote: 'Zone Championships were titled "National Preliminary Zone Championships" and also ran senior events.',
      regionals: {},
      zones: {},
      ewc: null,
      nationals: {}
    });
  });

  // 2020 — cancelled after Regionals.
  defineSeason(2020, {
    structure: 'region-only',
    stages: ['Regionals'],
    verified: true,
    source: 'COVID-19 pandemic',
    cancelled: true,
    cancelledNote: 'The 2020 season ended after Region Championships. No Zone or National Championships were held.',
    regionals: {},
    zones: null,
    ewc: null,
    nationals: null
  });

  function season(year) {
    return SEASONS[Number(year)] || null;
  }

  function hasStage(year, stage) {
    var s = season(year);
    return !!(s && s.stages.indexOf(stage) >= 0);
  }

  /* Stage display label. "Nationals" is the Junior National Championships
     throughout, but 2013–2014 also ran the Age Group National Championships,
     which is a different competition and is labelled as such. */
  var STAGE_LABELS = {
    'Regionals': 'Region Championships',
    'Zones': 'Zone Championships',
    'EWC': 'East / West / Central',
    'Nationals': 'Junior Nationals',
    'AgeGroup-Nationals': 'Age Group Nationals'
  };

  function stageLabel(stage) {
    return STAGE_LABELS[stage] || stage;
  }

  /* Season notes for the UI to surface above a report. */
  function seasonNotes(year) {
    var s = season(year);
    if (!s) return [];
    var out = [];
    if (s.cancelled) out.push({ kind: 'warn', text: s.cancelledNote });
    if (s.dualNationals) out.push({ kind: 'info', text: s.dualNote });
    if (s.combinedNationals) out.push({ kind: 'info', text: s.combinedNote });
    if (s.combinedZones) out.push({ kind: 'info', text: s.zonesNote });
    if (!s.verified && s.unverifiedNote) out.push({ kind: 'caveat', text: s.unverifiedNote });
    return out;
  }

  window.JuniorEras = {
    season: season,
    seasons: function () { return Object.keys(SEASONS).map(Number).sort(); },
    hasStage: hasStage,
    stageLabel: stageLabel,
    stageLabels: STAGE_LABELS,
    seasonNotes: seasonNotes,
    diveCount: diveCount,
    diveCountChanged: diveCountChanged,
    diveCountCaveat: diveCountCaveat,
    DIVE_COUNT_CHANGE_YEARS: DIVE_COUNT_CHANGE_YEARS,
    OBSERVED_FROM: OBSERVED_FROM
  };
})();
