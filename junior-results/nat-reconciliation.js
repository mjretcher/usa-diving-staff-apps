/* ============================================================================
   nat-reconciliation.js — what the Junior Nationals qualifier list meant,
   once the meet has actually been contested.

   THE PROBLEM THIS SOLVES

   The Nationals stage was built to answer "who is coming". It leads with the
   official qualifier list and, when that list predates E/W/C, a banner saying
   so. That is exactly right in June. Once the meet is over it is the least
   useful thing on the page, and the banner apologises for a gap instead of
   measuring it: the 2026 list held 237 athletes and 343 competed.

   So this module does two things when results exist for the season:

     1. Replaces the staleness banner with a reconciliation -- who was listed,
        who turned up, who was added afterwards and by what route, and who
        never came.
     2. Reorders the stage so results and team points sit above the qualifier
        list, and collapses the list rather than deleting it. It still matters:
        it is the only record of who was invited.

   If no results exist for the season it renders nothing and touches no layout,
   so the pre-meet view is unchanged. The switch is driven by the data, not by
   a date or a hard-coded year, which is the only part of this safe to carry
   into a season whose format is not yet decided.

   HOW AN ADDITION IS CLASSIFIED. A diver who competed but was not on the list
   is placed in exactly one bucket, in this order:

     non-displacing   place 127, the exhibition sentinel. Foreign athletes and
                      those declaring another sport nationality would never
                      appear on a qualifier list.
     via E/W/C        has an E/W/C result that season. The expected case when
                      the list predates that meet.
     no E/W/C route   everything else. Consistent with Art. 104 pre-qualified
                      divers, who need not attend a qualifying event and are
                      not counted when qualifying positions are assigned -- in
                      2026 this bucket is Mannarino, Rutter, Horwitz, Kerim and
                      similar. Labelled as an observation, not a conclusion:
                      the app cannot see a pre-qualification list, only that no
                      qualifying route is visible in the data.
   ========================================================================= */
(function () {
  'use strict';

  var state = { done: false, data: null };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  async function neonQuery(sql, params) {
    if (!window.NEON || !window.NEON.query) throw new Error('Neon client not loaded');
    return await window.NEON.query(sql, params || []);
  }

  function season() {
    var t = (window.USAD_JO_NAT_QUALIFIERS && window.USAD_JO_NAT_QUALIFIERS.meta &&
             window.USAD_JO_NAT_QUALIFIERS.meta.title) || '';
    var m = t.match(/\b(20\d\d)\b/);
    return m ? Number(m[1]) : new Date().getFullYear();
  }

  async function gather(year) {
    var nat = await neonQuery(
      "SELECT diver_id_dm::text AS id, diver_first, diver_last, place::text AS place " +
      "FROM core.event_results WHERE year=$1 AND stage='Nationals' AND is_junior_circuit", [year]);
    var rows = (nat && nat.rows) || [];
    if (!rows.length) return null;

    var prior = await neonQuery(
      "SELECT DISTINCT diver_id_dm::text AS id, stage FROM core.event_results " +
      "WHERE year=$1 AND is_junior_circuit AND stage IN ('EWC','Zones','Regionals')", [year]);
    var seen = { EWC:{}, Zones:{}, Regionals:{} };
    ((prior && prior.rows) || []).forEach(function (r) {
      if (seen[r.stage]) seen[r.stage][r.id] = true;
    });

    var competed = {}, nonDisp = {};
    rows.forEach(function (r) {
      competed[r.id] = (r.diver_first + ' ' + r.diver_last).trim();
      if (String(r.place) === '127') nonDisp[r.id] = true;
    });

    var NAT = window.USAD_JO_NAT_QUALIFIERS;
    var listed = {}, listedEvents = {};
    ((NAT && NAT.qualifiers) || []).forEach(function (q) {
      var id = String(q.diveMeetsId);
      listed[id] = q.name;
      listedEvents[id] = q.qualifiedEventKeys || [];
    });

    var matched = [], noShow = [], viaEWC = [], nonDispL = [], noRoute = [];
    Object.keys(listed).forEach(function (id) {
      (competed[id] ? matched : noShow).push(id);
    });
    Object.keys(competed).forEach(function (id) {
      if (listed[id]) return;
      if (nonDisp[id]) nonDispL.push(id);
      else if (seen.EWC[id]) viaEWC.push(id);
      else noRoute.push(id);
    });
    return { year: year, listed: listed, listedEvents: listedEvents, competed: competed,
             seen: seen, matched: matched, noShow: noShow,
             viaEWC: viaEWC, nonDisp: nonDispL, noRoute: noRoute,
             listedCount: Object.keys(listed).length,
             competedCount: Object.keys(competed).length };
  }

  function nameOf(d, id) { return d.competed[id] || d.listed[id] || id; }

  function render(wrap, d) {
    var addN = d.viaEWC.length + d.nonDisp.length + d.noRoute.length;
    var meta = (window.USAD_JO_NAT_QUALIFIERS && window.USAD_JO_NAT_QUALIFIERS.meta) || {};

    wrap.innerHTML =
      '<div class="nrc-wrap">' +
      '<h3 class="nrc-h3">Qualifier list vs the field that competed</h3>' +
      '<p class="nrc-sub">Official list generated ' + esc(String(meta.generatedAt || '').slice(0,10)) +
        '. Reconciled against the ' + d.year + ' Junior Nationals results.</p>' +

      '<div class="nrc-kpis">' +
        '<div class="nrc-kpi"><b>' + d.listedCount + '</b><span>on the official list</span></div>' +
        '<div class="nrc-kpi"><b>' + d.competedCount + '</b><span>actually competed</span></div>' +
        '<div class="nrc-kpi"><b>' + d.matched.length + '</b><span>on the list and competed</span></div>' +
        '<div class="nrc-kpi nrc-warn"><b>' + d.noShow.length + '</b><span>listed, never competed</span></div>' +
      '</div>' +

      '<h4 class="nrc-h4">' + addN + ' competed who were not on the list</h4>' +
      '<table class="nrc-table"><tbody>' +
        '<tr><td class="nrc-n">' + d.viaEWC.length + '</td><td>Advanced at E/W/C &mdash; the expected case, ' +
          'since the list predates that meet.</td></tr>' +
        '<tr><td class="nrc-n">' + d.noRoute.length + '</td><td>No E/W/C result that season. Consistent with ' +
          'Art.&nbsp;104 pre-qualification, which does not require attending a qualifying event. ' +
          '<span class="nrc-soft">Observed from the data; the app cannot see a pre-qualification list.</span></td></tr>' +
        '<tr><td class="nrc-n">' + d.nonDisp.length + '</td><td>Non-displacing entries, which never appear ' +
          'on a qualifier list.</td></tr>' +
      '</tbody></table>' +
      (d.noRoute.length ? '<details class="nrc-det"><summary>Show the ' + d.noRoute.length +
        ' with no E/W/C route</summary><ul class="nrc-list">' +
        d.noRoute.slice().sort(function (a,b) { return nameOf(d,a).localeCompare(nameOf(d,b)); })
          .map(function (id) {
            var w = ['Zones','Regionals'].filter(function (s) { return d.seen[s][id]; });
            return '<li>' + esc(nameOf(d,id)) + ' <span class="nrc-soft">' +
              (w.length ? 'competed ' + d.year + ' at ' + w.join(' and ') : 'no ' + d.year +
               ' junior circuit appearance') + '</span></li>';
          }).join('') + '</ul></details>' : '') +

      (d.noShow.length ? '<h4 class="nrc-h4">' + d.noShow.length +
        ' qualified but did not compete</h4>' +
        '<p class="nrc-soft">Slots that went unused. Worth knowing for pipeline sizing &mdash; ' +
        'these athletes earned a place and did not take it.</p>' +
        '<ul class="nrc-list nrc-cols">' +
        d.noShow.slice().sort(function (a,b) { return nameOf(d,a).localeCompare(nameOf(d,b)); })
          .map(function (id) {
            var ev = d.listedEvents[id] || [];
            return '<li>' + esc(nameOf(d,id)) + ' <span class="nrc-soft">' + ev.length +
              ' event' + (ev.length === 1 ? '' : 's') + ': ' + esc(ev.join(', ')) + '</span></li>';
          }).join('') + '</ul>' : '') +
      '</div>';
  }

  /* Results-first ordering. The qualifier list is kept, not removed -- it is
     the only record of who was invited -- but it stops leading the page. */
  function reorder() {
    var wrap = document.getElementById('tableWrap');
    var list = document.getElementById('qvNatListWrap');
    var recon = document.getElementById('qvNatRecon');
    var tp = document.getElementById('qvTeamPoints');
    var res = document.getElementById('qvNatResults');
    if (!wrap || !list || !recon) return;
    [recon, tp, res].forEach(function (el) { if (el) wrap.insertBefore(el, list); });
    if (!list.dataset.collapsed) {
      var det = document.createElement('details');
      det.className = 'nrc-listfold';
      det.innerHTML = '<summary>Official qualifier list &mdash; who was invited</summary>';
      list.parentNode.insertBefore(det, list);
      det.appendChild(list);
      list.dataset.collapsed = '1';
    }
  }

  window.renderNatReconciliation = async function (wrap) {
    if (!wrap) return;
    try {
      if (!state.done) { state.data = await gather(season()); state.done = true; }
    } catch (e) {
      wrap.innerHTML = '<div class="nrc-err">Reconciliation unavailable: ' + esc(e.message) + '</div>';
      return;
    }
    if (!state.data) { wrap.innerHTML = ''; return; }   // meet not contested yet
    render(wrap, state.data);
    reorder();
    if (window.natShellRefresh) window.natShellRefresh();
  };
})();
