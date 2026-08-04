/* ============================================================================
   nationals-results.js — Junior Nationals full results, every event, every diver

   WHY THIS PANEL EXISTS, and the one thing to understand before reading it.

   There are two different "totals" in circulation for this meet and they do
   not rank divers the same way.

     OFFICIAL   Art. 303(c)(2): "the scores of the dives with limit from the
                preliminary session will be carried forward and added to the
                scores in the final competition to determine the 12 rankings."
                Dives with limit are the voluntaries. So the official figure is
                  voluntary(prelim) + finals
                This is what DiveMeets publishes on EventResults and what the
                places are actually assigned from. Verified against all 287
                finalists in this meet: zero mismatches.

     SHEET      DiveMeets' "Selection Procedure" report, subtitled "No carry
                overs for all segments of competition added together", totals
                  prelim(all dives) + finals
                It counts the prelim optionals a second time. It is a
                legitimate selection view of total body of work, but it is NOT
                the placing, and it reorders the podium: in Group B Boys 1m,
                Amir Owens is the official bronze medalist and lands 6th on
                that sheet, while Larson Mckeown is officially 6th and shows
                3rd. Both are shown here side by side, ranked by official, with
                the movement called out, so nobody has to guess which sheet
                they are holding.

   DIVERS BELOW 12th never swim a final, so Art. 303(c)(2) ranks them on the
   preliminary score. For them official and sheet are the same number.

   VOLUNTARY DETECTION. DiveMeets tags each dive V, O or S. S appears only on
   Group D platform sheets, exactly once per diver, always in the first slot,
   and it is a voluntary: Art. 302.2(a)(3) sets Group D platform at four
   voluntaries plus two optionals, the crawl holds 3 V + 1 S + 2 O, and the
   four V+S degrees of difficulty sum to just under that rule's 7.6 cap.
   Treating S as anything else silently drops a voluntary for 37 divers.

   RECONSTRUCTION IS EXACT. Summing the dive sheets reproduces every published
   number in the meet: 720 of 720 preliminary scores and 287 of 287 finals
   scores, to the cent. If that ever stops being true the panel says so rather
   than quietly showing a wrong split.
   ========================================================================= */
(function () {
  'use strict';

  var MEET_ID = 12923;

  var state = {
    rows: null, loading: false, error: null,
    meetName: '', asOf: null, startDate: null, endDate: null,
    q: '', eventPick: '', scope: 'all', onlyMoves: false
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function n2(v) { return (v == null) ? '' : Number(v).toFixed(2); }
  function num(v) { return v == null ? 0 : Number(v); }

  /* Each panel file is its own IIFE, so the neonQuery helper in reports-view.js
     is not reachable here. Local copy of the same wrapper over the shared client. */
  async function neonQuery(sql, params) {
    if (!window.NEON || !window.NEON.query) {
      throw new Error('Neon client not loaded (shared/neon-client.js)');
    }
    return await window.NEON.query(sql, params || []);
  }

  /* ── Load ─────────────────────────────────────────────────────────────── */
  async function load() {
    state.loading = true; state.error = null;
    try {
      var r = await neonQuery(
        "SELECT e.title, s.round, r.place, r.diver_name, r.team_name, " +
        "       sum(CASE WHEN s.opt_vol IN ('V','S') THEN s.score ELSE 0 END) AS vol, " +
        "       sum(CASE WHEN s.opt_vol = 'O'        THEN s.score ELSE 0 END) AS opt, " +
        "       count(*) FILTER (WHERE s.opt_vol IN ('V','S')) AS nvol, " +
        "       count(*) FILTER (WHERE s.opt_vol = 'O')        AS nopt, " +
        "       max(r.score) AS published " +
        "FROM divemeets.results r " +
        "JOIN divemeets.events e ON e.meet_id=r.meet_id AND e.event_id=r.event_id AND e.round=r.round " +
        "JOIN divemeets.sheet_dives s ON s.meet_id=r.meet_id AND s.event_id=r.event_id " +
        "     AND s.round=r.round AND s.sheet_key=r.sheet_key " +
        "WHERE r.meet_id=" + MEET_ID + " " +
        "GROUP BY e.title, s.round, r.place, r.diver_name, r.team_name " +
        "ORDER BY e.title, s.round");
      state.rows = (r && r.rows) || [];

      var m = await neonQuery(
        "SELECT meet_name, results_crawled_at::text, start_date::text, end_date::text " +
        "FROM divemeets.meets WHERE meet_id=" + MEET_ID);
      var mr = m && m.rows && m.rows[0];
      if (mr) {
        state.meetName  = mr.meet_name || ('Meet ' + MEET_ID);
        state.asOf      = mr.results_crawled_at || null;
        state.startDate = mr.start_date || null;
        state.endDate   = mr.end_date || null;
      }
    } catch (e) {
      state.error = String(e && e.message || e);
    }
    state.loading = false;
  }

  /* ── Shape ────────────────────────────────────────────────────────────── */
  function baseTitle(t) {
    return String(t || '')
      .replace(/\s*\(Prelim\s*\/\s*Quarterfinal\)\s*$/i, '')
      .replace(/\s*\(Final\)\s*$/i, '')
      .trim();
  }

  function build() {
    var ev = {};
    state.rows.forEach(function (row) {
      var base = baseTitle(row.title);
      var e = ev[base] || (ev[base] = { title: base, divers: {}, fmt: {} });
      var d = e.divers[row.diver_name] || (e.divers[row.diver_name] = {
        name: row.diver_name, team: row.team_name || '', P: null, F: null
      });
      var seg = {
        vol: num(row.vol), opt: num(row.opt),
        nvol: num(row.nvol), nopt: num(row.nopt),
        place: row.place, published: num(row.published)
      };
      if (String(row.round) === '1') { d.P = seg; e.fmt.nvol = seg.nvol; e.fmt.nopt = seg.nopt; }
      else                           { d.F = seg; e.fmt.nfin = seg.nvol + seg.nopt; }
      if (row.team_name) d.team = row.team_name;
    });

    return Object.keys(ev).sort().map(function (k) {
      var e = ev[k];
      // An event whose final has not been contested yet must not report its
      // prelim leaders as having failed to start one.
      var hasFinal = Object.keys(e.divers).some(function (nm) { return !!e.divers[nm].F; });
      var list = Object.keys(e.divers).map(function (nm) {
        var d = e.divers[nm];
        var P = d.P, F = d.F;
        var prelim = P ? P.vol + P.opt : null;
        var finals = F ? F.vol + F.opt : null;
        var finalist = !!F;
        var toNum = function (v) {
          return (v != null && /^\d+$/.test(String(v).trim())) ? parseInt(v, 10) : null;
        };
        var prelimRank = P ? toNum(P.place) : null;
        // Non-displacing: DiveMeets records "Exhibition" instead of a place for
        // foreign athletes and those who have declared another sport nationality.
        // Art. 102(b) / 301.3 keep them from taking a placing or a final spot
        // from a U.S. athlete; the final is enlarged to fit them instead.
        var isEx = toNum(finalist ? F.place : (P ? P.place : null)) == null;
        // A diver who made the prelim top 12 but is absent from the final did
        // not start it, and the next diver moved up under Art. 106.3(e). Their
        // prelim place is NOT a finishing place. Reading it as one turned Brody
        // Johnson — who won the Group C Boys 3m prelim and then did not swim —
        // into the national champion, ahead of Charles Torrione who actually won.
        var dns = hasFinal && !finalist && !isEx && prelimRank != null && prelimRank <= 12;
        return {
          name: d.name, team: d.team,
          volP: P ? P.vol : null, optP: P ? P.opt : null,
          nvol: P ? P.nvol : null, noptP: P ? P.nopt : null,
          prelim: prelim, finals: finals, finalist: finalist,
          // Art. 303(c)(2) — voluntaries carried forward, plus the final
          official: finalist ? (P ? P.vol + finals : finals) : prelim,
          // Selection Procedure sheet — every segment added
          sheet: finalist ? (prelim + finals) : prelim,
          // Only a final produces a finishing place.
          place: finalist ? toNum(F.place) : null,
          prelimRank: prelimRank,
          dns: dns,
          exhibition: isEx,
          // cross-check: does our split reproduce what DiveMeets published?
          checkP: P ? Math.abs((P.vol + P.opt) - P.published) < 0.005 : true,
          checkF: F ? Math.abs((P ? P.vol + finals : finals) - F.published) < 0.005 : true
        };
      });

      var scoring = list.filter(function (d) { return !d.exhibition; });
      var bySheet = scoring.slice().sort(function (a, b) { return b.sheet - a.sheet; });
      bySheet.forEach(function (d, i) { d.sheetRank = i + 1; });
      scoring.forEach(function (d) {
        d.move = (d.place != null && d.sheetRank != null) ? (d.sheetRank - d.place) : 0;
      });
      list.sort(function (a, b) {
        var key = function (d) {
          if (d.exhibition) return 3000 + (d.prelimRank || 999);
          if (d.finalist)   return d.place || 999;
          return 1000 + (d.prelimRank || 999);
        };
        return key(a) - key(b);
      });

      e.list = list;
      e.moved = scoring.filter(function (d) { return d.move !== 0; }).length;
      e.dns = list.filter(function (d) { return d.dns; }).length;
      e.hasFinal = hasFinal;
      e.badSplit = list.filter(function (d) { return !d.checkP || !d.checkF; }).length;
      e.finalists = list.filter(function (d) { return d.finalist; }).length;
      return e;
    });
  }

  /* ── Filters ──────────────────────────────────────────────────────────── */
  function visible(events) {
    var q = state.q.trim().toLowerCase();
    return events.map(function (e) {
      if (state.eventPick && e.title !== state.eventPick) return null;
      var list = e.list.filter(function (d) {
        if (state.scope === 'finalists' && !d.finalist) return false;
        if (state.onlyMoves && !d.move) return false;
        if (q && (d.name + ' ' + d.team).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      if (!list.length) return null;
      return { title: e.title, fmt: e.fmt, list: list, moved: e.moved, dns: e.dns,
               hasFinal: e.hasFinal, badSplit: e.badSplit, finalists: e.finalists };
    }).filter(Boolean);
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  function fmtLine(f) {
    var bits = [];
    if (f.nvol != null) bits.push('Prelim ' + f.nvol + ' voluntary + ' + f.nopt + ' optional');
    if (f.nfin != null) bits.push('Final ' + f.nfin + ' optional');
    return bits.join(' &middot; ');
  }

  function rowHtml(d) {
    if (d.exhibition) {
      return '<tr class="nr-ex"><td>&mdash;</td><td class="nr-nm">' + esc(d.name) +
        '</td><td class="nr-tm">' + esc(d.team) + '</td>' +
        '<td class="nr-n">' + n2(d.volP) + '</td><td class="nr-n">' + n2(d.optP) + '</td>' +
        '<td class="nr-n">' + n2(d.prelim) + '</td><td class="nr-n">' + n2(d.finals) + '</td>' +
        '<td class="nr-n">&mdash;</td><td class="nr-n">&mdash;</td><td></td><td>' +
        '<span class="nr-tag">exhibition &middot; non-scoring</span></td></tr>';
    }
    var mv = d.move;
    var mvHtml = !d.finalist ? '<span class="nr-flat">&ndash;</span>'
      : !mv ? '<span class="nr-flat">&ndash;</span>'
      : '<span class="nr-move ' + (mv > 0 ? 'nr-up' : 'nr-down') + '">' +
        (mv > 0 ? '&#9650; ' + mv : '&#9660; ' + Math.abs(mv)) + '</span>';
    var warn = (!d.checkP || !d.checkF)
      ? ' <span class="nr-warn" title="dive-sheet split does not reproduce the published score">!</span>' : '';
    var plCell = d.finalist
      ? '<td class="nr-pl">' + d.place + '</td>'
      : '<td class="nr-pl nr-pl-prelim" title="preliminary rank — not a finishing place">P'
        + (d.prelimRank == null ? '?' : d.prelimRank) + '</td>';
    var tail = d.dns
      ? '<span class="nr-tag nr-tag-dns">qualified &middot; did not start the final</span>'
      : (!d.finalist ? '<span class="nr-tag">did not advance</span>' : '');
    return '<tr class="' + (d.dns ? 'nr-dns' : (d.finalist ? '' : 'nr-noswim')) + '">' +
      plCell +
      '<td class="nr-nm">' + esc(d.name) + warn + '</td>' +
      '<td class="nr-tm">' + esc(d.team || 'Unattached') + '</td>' +
      '<td class="nr-n nr-vol">' + n2(d.volP) + '</td>' +
      '<td class="nr-n">' + n2(d.optP) + '</td>' +
      '<td class="nr-n">' + n2(d.prelim) + '</td>' +
      '<td class="nr-n">' + (d.finalist ? n2(d.finals) : '<span class="nr-flat">&mdash;</span>') + '</td>' +
      '<td class="nr-n nr-official">' + n2(d.official) + '</td>' +
      '<td class="nr-n">' + n2(d.sheet) + '</td>' +
      '<td class="nr-n nr-sr">' + (d.sheetRank || '') + '</td>' +
      '<td class="nr-mv">' + mvHtml + ' ' + tail + '</td></tr>';
  }

  function eventHtml(e) {
    return '<section class="nr-block">' +
      '<h3 class="nr-h3">' + esc(e.title) +
        '<span class="nr-fmt">' + fmtLine(e.fmt) + '</span>' +
        (e.moved ? '<span class="nr-badge">' + e.moved + ' place' + (e.moved === 1 ? '' : 's') +
                   ' differ between the two totals</span>' : '') +
        (e.hasFinal === false ? '<span class="nr-badge">final not yet contested &mdash; prelim only</span>' : '') +
        (e.dns ? '<span class="nr-badge nr-badge-bad">' + e.dns +
                 ' qualifier did not start the final</span>' : '') +
        (e.badSplit ? '<span class="nr-badge nr-badge-bad">' + e.badSplit +
                      ' split mismatch</span>' : '') +
      '</h3>' +
      '<div class="nr-scroll"><table class="nr-table"><thead><tr>' +
        '<th>Pl</th><th>Diver</th><th>Team</th>' +
        '<th class="nr-n">Vol<span>prelim</span></th>' +
        '<th class="nr-n">Opt<span>prelim</span></th>' +
        '<th class="nr-n">Prelim<span>total</span></th>' +
        '<th class="nr-n">Finals<span>session</span></th>' +
        '<th class="nr-n nr-official">Official<span>vol + finals</span></th>' +
        '<th class="nr-n">Sheet<span>all segments</span></th>' +
        '<th class="nr-n">Sheet<span>rank</span></th>' +
        '<th>Move</th>' +
      '</tr></thead><tbody>' + e.list.map(rowHtml).join('') + '</tbody></table></div></section>';
  }

  function csv(events) {
    var out = [['Event', 'FinishPlace', 'PrelimRank', 'Diver', 'Team',
                'VolPrelim', 'OptPrelim', 'PrelimTotal', 'FinalsSession',
                'OfficialTotal', 'SheetTotal', 'SheetRank', 'Move', 'Note']];
    events.forEach(function (e) {
      e.list.forEach(function (d) {
        out.push([e.title, d.finalist ? d.place : '', d.exhibition ? '' : (d.prelimRank || ''),
          d.name, d.team || 'Unattached',
          n2(d.volP), n2(d.optP), n2(d.prelim), d.finalist ? n2(d.finals) : '',
          d.exhibition ? '' : n2(d.official), d.exhibition ? '' : n2(d.sheet),
          d.exhibition ? '' : (d.sheetRank || ''), d.finalist ? d.move : '',
          d.exhibition ? 'non-displacing - no place, no team points'
            : d.dns ? 'qualified - did not start the final'
            : d.finalist ? '' : 'did not advance - prelim rank only']);
      });
    });
    return out.map(function (r) {
      return r.map(function (c) {
        c = String(c == null ? '' : c);
        return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
      }).join(',');
    }).join('\r\n');
  }

  function inProgress() {
    if (!state.endDate || !state.asOf) return false;
    // crawl finished before the meet's last day is over
    return String(state.asOf).slice(0, 10) <= String(state.endDate);
  }

  window.renderNationalsResultsPanel = async function (wrap) {
    if (!wrap) return;
    if (!state.rows && !state.loading) {
      wrap.innerHTML = '<div class="nr-loading">Loading Junior Nationals dive sheets&hellip;</div>';
      await load();
    }
    if (state.error) {
      wrap.innerHTML = '<div class="nr-error">Could not load: ' + esc(state.error) + '</div>';
      return;
    }

    var all = build();
    var shown = visible(all);
    var totalDivers = all.reduce(function (n, e) {
      return n + e.list.filter(function (d) { return !d.exhibition; }).length; }, 0);
    var totalMoved = all.reduce(function (n, e) { return n + e.moved; }, 0);
    var totalBad = all.reduce(function (n, e) { return n + e.badSplit; }, 0);
    var totalDns = all.reduce(function (n, e) { return n + e.dns; }, 0);
    var totalEx  = all.reduce(function (n, e) {
      return n + e.list.filter(function (d) { return d.exhibition; }).length; }, 0);

    wrap.innerHTML =
      '<div class="nr-wrap">' +
      '<header class="nr-head">' +
        '<h2 class="nr-h2">Junior Nationals &mdash; full results by event</h2>' +
        '<p class="nr-sub">' + esc(state.meetName) +
          (state.asOf ? ' &middot; as of ' + esc(String(state.asOf).slice(0, 16).replace(' ', ' ')) + ' UTC' : '') +
        '</p>' +
        (inProgress()
          ? '<p class="nr-live"><b>Meet still in progress.</b> These figures reflect the last crawl' +
            (state.endDate ? ', and the meet runs through ' + esc(state.endDate) : '') +
            '. Events finishing after that crawl are not here yet. Re-run the results crawl before circulating anything final.</p>'
          : '') +
        '<div class="nr-kpis">' +
          '<div class="nr-kpi"><b>' + all.length + '</b><span>events</span></div>' +
          '<div class="nr-kpi"><b>' + totalDivers + '</b><span>scoring finishes</span></div>' +
          '<div class="nr-kpi' + (totalMoved ? ' nr-kpi-warn' : '') + '"><b>' + totalMoved +
            '</b><span>places where the two totals disagree</span></div>' +
          (totalDns ? '<div class="nr-kpi nr-kpi-bad"><b>' + totalDns +
            '</b><span>qualified but did not start a final</span></div>' : '') +
          '<div class="nr-kpi"><b>' + totalEx + '</b><span>non-displacing entries</span></div>' +
          (totalBad ? '<div class="nr-kpi nr-kpi-bad"><b>' + totalBad +
            '</b><span>dive-sheet split mismatches</span></div>' : '') +
        '</div>' +
        '<p class="nr-explain"><b>Two totals, on purpose.</b> ' +
          '<b>Official</b> is the placing figure &mdash; the voluntary scores carried forward from the ' +
          'prelim plus the finals session, per Art.&nbsp;303(c)(2), and it is what DiveMeets publishes. ' +
          '<b>Sheet</b> is the "Selection Procedure" total, which adds every segment and so counts the ' +
          'prelim optionals twice. Rows are ranked by Official; <b>Move</b> shows how far a diver sits ' +
          'from that on the Sheet ordering.</p>' +
        '<p class="nr-explain"><b>Only a final produces a place.</b> Finishing places 1&ndash;12 come from ' +
          'the final. Everyone else shows a <b>P-number</b>, which is their preliminary rank and not a ' +
          'finishing place &mdash; including any diver who made the top 12 and then did not start the final, ' +
          'who is flagged as such because the next diver moved up under Art.&nbsp;106.3(e). ' +
          '<b>Non-displacing entries</b> &mdash; foreign athletes and those who have declared another sport ' +
          'nationality &mdash; are listed for reference but hold no place, take none from a U.S. athlete, ' +
          'and score no team points under Art.&nbsp;602.20(g). The final is enlarged to accommodate them ' +
          'rather than shortened, per Art.&nbsp;301.3.</p>' +
      '</header>' +

      '<div class="nr-controls">' +
        '<input class="nr-in" id="nrQ" type="search" placeholder="Search diver or team&hellip;" value="' + esc(state.q) + '">' +
        '<select class="nr-in" id="nrEvent"><option value="">All events</option>' +
          all.map(function (e) {
            return '<option value="' + esc(e.title) + '"' +
              (state.eventPick === e.title ? ' selected' : '') + '>' + esc(e.title) + '</option>';
          }).join('') + '</select>' +
        '<select class="nr-in" id="nrScope">' +
          '<option value="all"' + (state.scope === 'all' ? ' selected' : '') + '>Every athlete</option>' +
          '<option value="finalists"' + (state.scope === 'finalists' ? ' selected' : '') + '>Finalists only</option>' +
        '</select>' +
        '<label class="nr-chk"><input type="checkbox" id="nrMoves"' + (state.onlyMoves ? ' checked' : '') +
          '> Only rows where the orders differ</label>' +
        '<button class="nr-btn" id="nrCsv">Export CSV</button>' +
      '</div>' +

      (shown.length ? shown.map(eventHtml).join('')
                    : '<p class="nr-soft">Nothing matches those filters.</p>') +
      '</div>';

    var q = wrap.querySelector('#nrQ');
    if (q) q.addEventListener('input', function () {
      state.q = q.value;
      var pos = q.selectionStart;
      window.renderNationalsResultsPanel(wrap).then(function () {
        var nq = wrap.querySelector('#nrQ');
        if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} }
      });
    });
    var sel = wrap.querySelector('#nrEvent');
    if (sel) sel.addEventListener('change', function () {
      state.eventPick = sel.value; window.renderNationalsResultsPanel(wrap);
    });
    var sc = wrap.querySelector('#nrScope');
    if (sc) sc.addEventListener('change', function () {
      state.scope = sc.value; window.renderNationalsResultsPanel(wrap);
    });
    var mv = wrap.querySelector('#nrMoves');
    if (mv) mv.addEventListener('change', function () {
      state.onlyMoves = mv.checked; window.renderNationalsResultsPanel(wrap);
    });
    var cs = wrap.querySelector('#nrCsv');
    if (cs) cs.addEventListener('click', function () {
      var blob = new Blob([csv(shown)], { type: 'text/csv;charset=utf-8;' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'junior-nationals-results.csv';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(a.href);
    });
  };
})();
