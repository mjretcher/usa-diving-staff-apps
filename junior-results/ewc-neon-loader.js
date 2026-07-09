/* ================================================================
   ewc-neon-loader.js
   Loads the finalized East / West / Central results from Neon and
   injects them into the in-memory dataset as stage:'EWC' rows.

   Why this exists: the static junior-data.js ships an EMPTY E/W/C slot
   ("data slot ready"). The E/W/C results engine (recalcEWC, the
   hasResults branch, ewcQualifiers preferring EWC rows) is fully built
   but was never fed data, so the E/W/C by-meet / by-event views silently
   fell back to the *Zones projection* (Zone places 4-18). That made the
   field, placements and events on those tabs diverge from the real
   results already sitting in Neon (and shown in the "computed → Nationals"
   section). This loader fills the slot at runtime so the whole E/W/C
   stage runs on the actual field, and marking not-attending drives the
   real E/W/C → Junior Nationals advancement.

   Non-fatal by design: if Neon can't be reached the E/W/C view simply
   falls back to the Zones projection exactly as before.
   ================================================================ */
(function () {
  'use strict';

  var SEASON   = 2026;
  var injected = false;

  /* Official 3rd-place-average thresholds (2026 Art.303(b)(3)(ii)), supplied
     by Mike. This is the cross-meet score bar that admits 4th-6th place E/W/C
     finishers to Junior Nationals alongside the top-3 direct qualifiers.
     Keyed "Group X|Boys/Girls|1M/3M/Platform" to match the age_group/gender/
     discipline columns coming back from core.event_results. */
  var EWC_AVG_THRESHOLD = {
    'Group A|Boys|1M':       403.85,
    'Group A|Boys|3M':       425.85,
    'Group A|Boys|Platform': 356.517,
    'Group A|Girls|1M':      340.65,
    'Group A|Girls|3M':      376.9,
    'Group A|Girls|Platform':318.1,

    'Group B|Boys|1M':       303.85,
    'Group B|Boys|3M':       333.467,
    'Group B|Boys|Platform': 273,
    'Group B|Girls|1M':      278.383,
    'Group B|Girls|3M':      294.083,
    'Group B|Girls|Platform':245.883,

    'Group C|Boys|1M':       236.883,
    'Group C|Boys|3M':       236,
    'Group C|Boys|Platform': 169.217,
    'Group C|Girls|1M':      234,
    'Group C|Girls|3M':      243.317,
    'Group C|Girls|Platform':185.667,

    'Group D|Boys|1M':       146.95,
    'Group D|Boys|3M':       147.95,
    'Group D|Boys|Platform': 155.85,
    'Group D|Girls|1M':      164.233,
    'Group D|Girls|3M':      170.533,
    'Group D|Girls|Platform':143.983
  };
  function ewcAvgThreshold(ageGroup, gender, discipline) {
    var key = String(ageGroup || '') + '|' + String(gender || '') + '|' + String(discipline || '');
    return Object.prototype.hasOwnProperty.call(EWC_AVG_THRESHOLD, key) ? EWC_AVG_THRESHOLD[key] : null;
  }

  /* Poll until main.js + neon-client are ready (main defines the globals
     DATA / recompute / renderAll; neon-client defines window.NEON). */
  function ready() {
    return typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.results)
      && typeof recompute === 'function' && typeof renderAll === 'function'
      && window.NEON && typeof window.NEON.query === 'function';
  }
  function waitFor(cb, tries) {
    tries = tries || 0;
    if (ready()) return cb();
    if (tries > 200) return;                    // ~20s ceiling, then give up quietly
    setTimeout(function () { waitFor(cb, tries + 1); }, 100);
  }

  /* Normalized-name key, mirrors main.js norm()/normName() so our
     foreign / already-qualified matching agrees with the rest of the app. */
  function nm(v) {
    return String(v || '').toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function nameSet(list) {
    var s = new Set();
    (list || []).forEach(function (x) {
      var n = nm(x && (x.name || x));
      if (n) s.add(n);
    });
    return s;
  }

  function loadEWC() {
    if (injected) return;
    var sql =
      "SELECT event_key, ewc_meet, meet_name, meet_id_dm, age_group, gender, discipline, round," +
      " diver_id_dm, diver_first, diver_last, team_name, team_code, zone, place, score, event_name" +
      " FROM core.event_results" +
      " WHERE year = $1 AND stage = 'EWC' AND is_junior_circuit AND place IS NOT NULL";
    window.NEON.query(sql, [SEASON]).then(function (res) {
      var raw = (res && res.rows) || [];
      if (raw.length) injectRows(raw);
    }).catch(function (e) {
      try { console.warn('[ewc-neon-loader] E/W/C results not loaded (view falls back to Zones projection):', e); } catch (_) {}
    });
  }

  function injectRows(raw) {
    if (injected) return;

    var EWC          = window.USAD_EWC_DATA || {};
    var foreignSet   = nameSet(EWC.foreignAthletes);   // non-displacing at E/W/C
    var alreadyNat   = nameSet(EWC.alreadyNatQual);    // already qualified — don't consume a spot

    /* 1) Deciding round per (event, meet): Final if the event held a final,
          otherwise Prelim. Divers legitimately appear in both, so we keep
          only the deciding round to get one final placement per diver. */
    var hasFinal = {};
    raw.forEach(function (r) {
      if (r.round === 'Final') hasFinal[r.event_key + '||' + r.ewc_meet] = true;
    });

    /* 2) Keep deciding-round rows; dedupe per (event, meet, diver) to best place. */
    var best = {};
    raw.forEach(function (r) {
      var k = r.event_key + '||' + r.ewc_meet;
      var keep = hasFinal[k] ? (r.round === 'Final') : true;
      if (!keep) return;
      var dk = k + '||' + r.diver_id_dm;
      var pl = Number(r.place);
      if (!best[dk] || pl < Number(best[dk].place)) best[dk] = r;
    });
    var kept = Object.keys(best).map(function (k) { return best[k]; });

    /* 3) Avg-score bar (2026 Art.303(b)(3)(ii), which admits 4th-6th finishers
          whose score clears a cross-meet bar): now sourced from EWC_AVG_THRESHOLD
          above (Mike's official 3rd-place-average data, keyed by group/gender/
          discipline). Previously this was left null, which meant recalcEWC could
          never satisfy the avg-score branch — only the 3 direct qualifiers per
          E/W/C meet (East/Central/West) ever advanced, i.e. exactly 9 per event.
          That 9-athlete undercount was propagating downstream into Schedule
          Builder's prelim pre-fill via projected_nationals_field. Fixed 2026-07-09. */

    /* 3b) Backfill missing zone: Neon's core.event_results doesn't always
          carry the zone column on the EWC-stage row (seen for athletes who
          have a perfectly good Zones-stage record with a zone already, e.g.
          YMCA/prequalified direct-Nationals qualifiers). Rather than show
          "Zone ?" for divers whose zone is knowable, look it up from their
          own Zones-stage row already sitting in DATA.results. */
    var zoneByAthleteEvent = {};
    (DATA.results || []).forEach(function (r) {
      if (r.stage === 'Zones' && r.zone && r.diveMeetsId && r.eventKey) {
        zoneByAthleteEvent[r.diveMeetsId + '||' + r.eventKey] = r.zone;
      }
    });

    /* 4) Build engine rows in the exact shape recalcEWC / the views expect. */
    var rows = kept.map(function (r) {
      var first    = (r.diver_first || '').trim();
      var last     = (r.diver_last  || '').trim();
      var athlete  = (first + ' ' + last).trim();      // "First Last" to match the registration lists
      var placeNum = Number(r.place);
      var foreign  = foreignSet.has(nm(athlete));
      var sentinel = placeNum === 127;                 // DiveMeets exhibition / non-displacing marker
      var already  = alreadyNat.has(nm(athlete));
      var nonDisp  = foreign || sentinel;
      var zone     = r.zone || zoneByAthleteEvent[String(r.diver_id_dm || '') + '||' + r.event_key] || '';
      return {
        id: 'EWC|' + r.ewc_meet + '|' + r.event_key + '|' + (r.diver_id_dm || '') + '|' + r.place,
        stage: 'EWC',
        meetName: r.meet_name || ('2026 USA Diving ' + r.ewc_meet + ' Championship'),
        meetIdDivemeets: r.meet_id_dm || '',
        region: null,
        zone: zone,
        ewc: r.ewc_meet,
        ewcMeet: r.ewc_meet,
        eventName: r.event_name || r.event_key,
        eventId: 'EWC|' + r.ewc_meet + '|' + r.event_key,
        eventKey: r.event_key,
        eventCategory: 'Qualifying Event',
        qualifyingEvent: true,
        ageGroup: r.age_group || '',
        gender: r.gender || '',
        discipline: r.discipline || '',
        isSynchro: false,
        round: r.round || '',
        diveMeetsId: String(r.diver_id_dm || ''),
        first: first,
        last: last,
        athlete: athlete,
        team: r.team_name || '',
        teamCode: r.team_code || '',
        place: String(r.place),
        placeNumber: placeNum,
        score: Number(r.score),
        citizenship: '',
        usCitizen: foreign ? 'False' : 'True',
        membershipCitizenStatus: foreign ? 'Foreign' : 'US citizen',
        foreignDeclared: foreign,
        foreignDeclarationDetail: '',
        dualDeclared: false,
        dualOtherCountry: false,
        dualSportNationalityStatus: 'No declaration',
        dualDeclarationDetail: '',
        hps: false,
        ymca: false,
        prequalified: already,
        prequalification: already ? ['Already qualified to Junior Nationals'] : [],
        webpointNonUs: false,
        citizenshipUnknown: false,
        foreignInternational: foreign,
        nonDisplacing: nonDisp,
        nonDisplacingReason: foreign  ? 'Foreign athlete — non-displacing at E/W/C'
                           : sentinel ? 'Exhibition (place 127) — non-displacing'
                           : '',
        declaredNotAttending: false,
        eligibleRank: '',
        attendingEligibleRank: '',
        juniorNationalStatus: '',
        qualificationStatus: '',
        advancesToZone: false,
        advancesToNationals: false,
        advancesToEWC: false,
        officialThresholdScore: ewcAvgThreshold(r.age_group, r.gender, r.discipline),
        bumpIn: false, openedSpot: false, spotShifted: false,
        bumpedBy: [], openedFor: [], flags: [], reviewFlags: [],
        _ewcNeonInjected: true
      };
    });

    /* 5) Inject once, then recompute + re-render so the engine and views pick it up. */
    DATA.results = DATA.results.filter(function (r) { return !r._ewcNeonInjected; });
    Array.prototype.push.apply(DATA.results, rows);
    injected = true;

    try { recompute(); } catch (e) { try { console.error('[ewc-neon-loader] recompute failed', e); } catch (_) {} }
    try {
      if (typeof state !== 'undefined' && state.stage === 'EWC' && window._qvRenderEWC) window._qvRenderEWC();
      else renderAll();
    } catch (e) { try { renderAll(); } catch (_) {} }

    try { console.log('[ewc-neon-loader] injected ' + rows.length + ' finalized E/W/C result rows'); } catch (_) {}
  }

  waitFor(loadEWC);
})();
