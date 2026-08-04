/* ============================================================================
   nat-shell.js — the frame around the Junior Nationals stage.

   THE BRIEF. Five panels grew here one at a time: the qualifier list, the
   computed E/W/C layer, team points, full results, and the reconciliation.
   Each was styled on its own, so the stage became five competing top-level
   headings on one unbroken scroll with no way to move between them. This is
   the flagship view of a flagship tool and it read like an accumulation.

   WHAT THIS ADDS, and deliberately what it does not.

   A sticky meet strip and section rail, so the page can be navigated rather
   than scrolled, with the active section tracked as you move.

   A PROVENANCE CHIP on every section. This is the one bold element and the
   reason the rest stays quiet. Numbers on this stage reach High Performance
   Squad selection, and a selection decision is reviewable by a neutral
   arbitrator who will ask where a figure came from. So each section states,
   in the same three words every time:

     OFFICIAL   as published by DiveMeets -- placings, scores
     COMPUTED   derived here, with the governing rule named
     INFERRED   a pattern observed in the data, not a source of truth

   That distinction already lived in prose scattered through the panels. Making
   it a fixed, repeated element is what turns it from commentary into something
   a reader can rely on at a glance -- and repetition is the point, not
   decoration, because consistency is what makes it scannable.

   It does NOT restyle the panels or duplicate their headings. The chip bar
   sits above each panel and the panel keeps its own title, so there is exactly
   one name for each section. Panels stay independently renderable.
   ========================================================================= */
(function () {
  'use strict';

  /* Order matches the reading order of the stage: what happened, then how it
     was scored, then how the field compared to the invitation list, then the
     list itself. */
  var SECTIONS = [
    { id: 'qvTeamPoints', label: 'Team points', src: 'computed',
      note: 'Placings official; points applied under Art. 602.20 and the synchro policy.' },
    { id: 'qvNatResults', label: 'Results', src: 'computed',
      note: 'Placings and scores official; the voluntary/optional split is summed from dive sheets.' },
    { id: 'qvNatRecon', label: 'Reconciliation', src: 'inferred',
      note: 'Counts are exact. How an unlisted diver qualified is inferred from where they appear.' },
    { id: 'qvComputedEWCNat', label: 'E/W/C qualifiers', src: 'computed',
      note: 'Derived from E/W/C placings under Art. 303(b)(3).' },
    { id: 'qvNatListWrap', label: 'Who was invited', src: 'official',
      note: 'The official qualifier list as published, unmodified.' }
  ];

  var SRC = {
    official: { text: 'Official', cls: 'nsx-official' },
    computed: { text: 'Computed', cls: 'nsx-computed' },
    inferred: { text: 'Inferred', cls: 'nsx-inferred' }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function present(sec) {
    var el = document.getElementById(sec.id);
    if (!el) return null;
    // A panel that rendered nothing (no data yet) should not get a rail entry.
    var host = el.closest('details') || el;
    return (el.textContent || '').trim() ? host : null;
  }

  function chipBar(sec) {
    var s = SRC[sec.src];
    var bar = document.createElement('div');
    bar.className = 'nsx-chipbar';
    bar.innerHTML =
      '<span class="nsx-rule"></span>' +
      '<span class="nsx-chip ' + s.cls + '" title="' + esc(sec.note) + '">' +
        '<span class="nsx-dot"></span>' + esc(s.text) +
      '</span>';
    return bar;
  }

  function build() {
    var wrap = document.getElementById('tableWrap');
    if (!wrap) return;

    var live = SECTIONS.map(function (sec) {
      var host = present(sec);
      return host ? { sec: sec, host: host } : null;
    }).filter(Boolean);
    if (!live.length) return;

    /* Tear down and rebuild every bar. The reconciliation panel physically
       moves sections once results exist, which strands any bar inserted before
       the move next to the wrong section — that put the qualifier list's
       "Official" chip on the reconciliation. Rebuilding is cheap and is the
       only version of this that is correct regardless of render order. */
    Array.prototype.forEach.call(
      document.querySelectorAll('.nsx-chipbar'), function (b) { b.remove(); });

    live.forEach(function (x) {
      x.host.classList.add('nsx-sec');
      x.host.setAttribute('data-nsx', x.sec.id);
      x.host.parentNode.insertBefore(chipBar(x.sec), x.host);
    });

    var old = document.getElementById('nsxRail');
    if (old) old.remove();

    var meet = (window.USAD_JO_NAT_QUALIFIERS && window.USAD_JO_NAT_QUALIFIERS.meta &&
                window.USAD_JO_NAT_QUALIFIERS.meta.title) || 'Junior Nationals';
    var rail = document.createElement('nav');
    rail.id = 'nsxRail';
    rail.className = 'nsx-rail';
    rail.setAttribute('aria-label', 'Sections of this meet');
    rail.innerHTML =
      '<div class="nsx-meet">' + esc(meet.replace(/ Qualifier List$/, '')) + '</div>' +
      '<div class="nsx-links">' +
        live.map(function (x) {
          return '<button type="button" class="nsx-link" data-go="' + x.sec.id + '">' +
                   esc(x.sec.label) + '</button>';
        }).join('') +
      '</div>';
    wrap.insertBefore(rail, wrap.firstChild);

    rail.querySelectorAll('.nsx-link').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = document.querySelector('[data-nsx="' + b.dataset.go + '"]');
        if (!t) return;
        var det = t.closest('details');
        if (det && !det.open) det.open = true;      // never scroll to something hidden
        var bar = t.previousElementSibling;
        (bar && bar.classList.contains('nsx-chipbar') ? bar : t)
          .scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
      });
    });

    track(live, rail);
  }

  function prefersReduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function track(live, rail) {
    if (!window.IntersectionObserver) return;
    if (window._nsxObs) window._nsxObs.disconnect();
    var seen = {};
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen[e.target.getAttribute('data-nsx')] = e.isIntersecting; });
      var active = live.map(function (x) { return x.sec.id; })
                       .filter(function (id) { return seen[id]; })[0];
      rail.querySelectorAll('.nsx-link').forEach(function (b) {
        b.classList.toggle('on', b.dataset.go === active);
      });
    }, { rootMargin: '-90px 0px -60% 0px' });
    live.forEach(function (x) { obs.observe(x.host); });
    window._nsxObs = obs;
  }

  var pending = null;
  window.natShellRefresh = function () {
    clearTimeout(pending);
    pending = setTimeout(build, 60);   // panels render async; settle before framing
  };
})();
