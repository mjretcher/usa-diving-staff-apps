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
    regionCount: 12,
    zoneCount: 6,
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

  // 2019–2023. Verified against the 2019 USA Diving Competitive and Technical
  // Rules, Art. 122. USA Diving's own 2023 Region Championships FAQ states that
  // "all junior rules included in the current USA Diving rulebook (from 2019)
  // will remain in effect through the end of 2023", so one document governs
  // five seasons.
  //
  // 2024–2025 keep the same advancement structure but sit under a later
  // revision, since the required dive counts changed on 1 Jan 2024. The
  // advancement numbers below still match the qualifier engine in
  // junior-data.js for those two seasons.
  [2019, 2021, 2022, 2023, 2024, 2025].forEach(function (y) {
    defineSeason(y, {
      structure: 'region-zone-nationals',
      stages: ['Regionals', 'Zones', 'Nationals'],
      verified: true,
      source: y <= 2023
        ? '2019 USA Diving Competitive and Technical Rules, Art. 122 (in force through 2023)'
        : '2019 rule book advancement structure, carried forward; dive counts revised 1 Jan 2024',
      regionCount: 12,
      zoneCount: 6,
      regionals: {
        groups: 'All four age groups compete on springboard',
        advance: 15,
        platform: 'exhibition',
        note: 'Top 15 finishers in any springboard event who are U.S. citizens advance to Zones, provided they competed a full list. A diver scoring zero on two or more dives may not advance. A national 15th-place recalculated average also admits divers above that mark.'
      },
      zones: {
        groups: 'A, B, C, D on 1m, 3m and platform',
        springboardAdvance: 10,
        platformAdvance: 7,
        semifinalDirect: 3,
        alternates: [11, 16],
        noBackfillTop: 3,
        note: 'Springboard: top 3 to the National Championships semifinals, 4th–10th to the preliminaries. Platform: top 3 to the semifinals, 4th–7th to the preliminaries. If a top-3 diver withdraws there is no advancement; a withdrawal from the 4th–10th or 4th–7th band is backfilled by the next finisher, but no diver below 16th place is considered and prequalified divers are excluded.'
      },
      ewc: null,
      nationals: {
        note: 'Three rounds. Preliminaries contest the 4th–10th (springboard) and 4th–7th (platform) Zone qualifiers. The semifinal adds the top 3 from each Zone to the top 6 out of the preliminaries. The top 12 from the semifinal contest the final, with dives-with-limit scores carried forward; 12th–30th are ranked on semifinal scores and below 30th on preliminary scores.'
      }
    });
  });

  // 2018–2019. Structure is visible in the data — twelve Regionals, six Zones,
  // a single Junior Nationals — but the qualifying numbers for these seasons
  // have not been checked against a rule book, so they are not stated.
  [2018].forEach(function (y) {
    defineSeason(y, {
      structure: 'region-zone-nationals',
      stages: ['Regionals', 'Zones', 'Nationals'],
      verified: false,
      unverifiedNote: 'Advancement numbers for this season have not been confirmed against a rule book. Group C girls already dived the eight-dive springboard list in 2018, so this season sat under a revision between the 2014 and 2019 books rather than either of them. Placements and scores are accurate; qualifying cutoffs are not shown.',
      regionCount: 12,
      zoneCount: 6,
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
      regionCount: 12,
      zoneCount: 6,
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

  // 2013–2014. Verified against the 2014 USA Diving Competitive and Technical
  // Rules, Subpart C (Junior Diving Program), Articles 120–124. This era is
  // structurally unlike anything after it, and every number below is from that
  // document rather than inferred.
  [2013, 2014].forEach(function (y) {
    defineSeason(y, {
      structure: 'region-ew-zone-dual-nationals',
      stages: ['Regionals', 'Zones', 'Nationals', 'AgeGroup-Nationals'],
      verified: true,
      source: '2014 USA Diving Competitive and Technical Rules, Subpart C, Art. 120–124',
      regionCount: 10,
      zoneCount: 5,
      dualNationals: true,
      dualNote: 'Two national championships ran this season. Zone places 1–6 qualified for the Junior National Championships; places 7–12 qualified for the Age Group National Championships. A top-6 diver could elect to dive Age Group instead.',
      combinedZones: true,
      zonesNote: 'Zone Championships were titled "National Preliminary Zone Championships" and also ran senior events. There were five zones (A–E) and ten regions, not six and twelve.',
      springTrackNote: 'A separate spring track ran Regionals into the East/West Spring National Championships (top 6 per springboard event). Its top 3 prequalified to the prelims of either summer national championship. DiveMeets holds these as "Junior East/West National Championships"; they are not part of the summer pipeline shown here.',
      regionals: {
        groups: 'Springboard in 11 & Under, 12/13, 14/15 and 16-18',
        advance: null,
        advanceUnknown: true,
        toEastWest: 6,
        platform: 'optional at meet director discretion',
        note: 'Top 6 per springboard event advanced to the East/West Spring National Championships. The number advancing to Zones is set in Subpart F and is not stated in Subpart C.'
      },
      zones: {
        groups: 'Springboard and platform in all four age groups',
        springboardAdvance: 6,
        platformAdvance: 6,
        ageGroupBand: [7, 12],
        alternates: [null, 16],
        noBackfillTop: 6,
        note: 'Top 6 per event to Junior Nationals, with no advancement if a qualifier withdrew. Places 7–12 to Age Group Nationals prelims, backfilled no lower than 16th place.'
      },
      ewc: null,
      nationals: {
        note: 'Top 12 from prelims contested the final; prelim scores for dives with limit were carried forward.'
      }
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
    regionCount: 12,
    zoneCount: 6,
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
