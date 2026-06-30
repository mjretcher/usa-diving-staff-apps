/* ================================================================
   USA DIVING — JUNIOR CIRCUIT · MOBILE NAV
   Two mobile-only enhancements, both inert on desktop and fully
   self-contained (no change to existing app behaviour):

   1. FILTERS DRAWER — injects a "Filters" button into the top bar
      and a backdrop so the control sidebar slides in as an
      off-canvas drawer on phones.

   2. BOTTOM STAGE BAR — injects a native-style bottom navigation
      bar for the six circuit stages. On a phone the cramped
      top-bar tab strip is hidden (via mobile.css) and this bar is
      the primary way to move between Regionals / Zones / E·W·C /
      Nationals / Reports / Pipeline. It does NOT reimplement any
      logic: each item simply triggers the real (hidden) top-bar
      stage button, so every existing side-effect still runs. The
      active state mirrors the real nav via a MutationObserver, so
      it stays correct no matter what changes the stage.
   ================================================================ */
(function () {
  'use strict';

  /* Short labels + icons keyed by the stage id used in main.js STAGES */
  var STAGE_META = {
    Regionals: { label: 'Regionals', icon: '<path d="M12 22c4-4.5 7-8 7-12a7 7 0 1 0-14 0c0 4 3 7.5 7 12z"/><circle cx="12" cy="10" r="2.6"/>' },
    Zones:     { label: 'Zones',     icon: '<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 13l9 5 9-5"/>' },
    EWC:       { label: 'E·W·C',     icon: '<circle cx="5" cy="6" r="1.9"/><circle cx="5" cy="18" r="1.9"/><circle cx="19" cy="12" r="1.9"/><path d="M7 6h3a4 4 0 0 1 4 4v0M7 18h3a4 4 0 0 0 4-4v0"/>' },
    Nationals: { label: 'Nationals', icon: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M7 6H4.5v1a3 3 0 0 0 3 3M17 6h2.5v1a3 3 0 0 1-3 3"/>' },
    Reports:   { label: 'Reports',   icon: '<path d="M4 20V11M10 20V4M16 20v-7M3 20h18"/>' },
    Pipeline:  { label: 'Pipeline',  icon: '<path d="M3 17l5-5 4 3 7-8"/><path d="M16 4h5v5"/>' }
  };

  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
           'aria-hidden="true">' + inner + '</svg>';
  }

  function init() {
    var topbar  = document.querySelector('.app-topbar');
    var brand   = document.querySelector('.topbar-brand');
    var sidebar = document.querySelector('.control-sidebar');
    var stageNav = document.getElementById('stageNav');
    if (!topbar) return;

    /* ════════════════════════════════════════════════════════════
       1 · FILTERS DRAWER
       ════════════════════════════════════════════════════════════ */
    if (sidebar && !document.querySelector('.mobile-filter-toggle')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-filter-toggle';
      btn.setAttribute('aria-label', 'Show filters');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML =
        '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true">' +
        '<path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" ' +
        'stroke-width="1.6" stroke-linecap="round"/></svg>' +
        '<span class="mft-label">Filters</span>';

      if (brand && brand.parentNode === topbar && brand.nextSibling) {
        topbar.insertBefore(btn, brand.nextSibling);
      } else {
        topbar.insertBefore(btn, topbar.firstChild);
      }

      var backdrop = document.createElement('div');
      backdrop.className = 'mobile-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);

      var openF  = function () { document.body.classList.add('filters-open');  btn.classList.add('active');  btn.setAttribute('aria-expanded', 'true'); };
      var closeF = function () { document.body.classList.remove('filters-open'); btn.classList.remove('active'); btn.setAttribute('aria-expanded', 'false'); };
      btn.addEventListener('click', function () {
        if (document.body.classList.contains('filters-open')) closeF(); else openF();
      });
      backdrop.addEventListener('click', closeF);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeF(); });
      window.addEventListener('resize', function () { if (window.innerWidth > 760) closeF(); });
      window._jrCloseFilters = closeF;
    }

    /* ════════════════════════════════════════════════════════════
       2 · BOTTOM STAGE BAR
       ════════════════════════════════════════════════════════════ */
    if (stageNav && !document.querySelector('.mobile-stage-nav')) {
      var realButtons = Array.prototype.slice.call(stageNav.querySelectorAll('.stage-btn'));
      if (realButtons.length) {
        var bar = document.createElement('nav');
        bar.className = 'mobile-stage-nav';
        bar.setAttribute('aria-label', 'Circuit stage');

        realButtons.forEach(function (realBtn, i) {
          var id = realBtn.dataset.stage;
          var meta = STAGE_META[id] || { label: (realBtn.textContent || id).trim(), icon: '<circle cx="12" cy="12" r="8"/>' };

          // subtle divider between the four circuit stages and the analytics views
          if (id === 'Reports') {
            var sep = document.createElement('span');
            sep.className = 'msn-sep';
            sep.setAttribute('aria-hidden', 'true');
            bar.appendChild(sep);
          }

          var item = document.createElement('button');
          item.type = 'button';
          item.className = 'msn-item' + (realBtn.classList.contains('active') ? ' active' : '');
          item.dataset.stage = id;
          item.innerHTML = svg(meta.icon) + '<span class="msn-label">' + meta.label + '</span>';
          item.addEventListener('click', function () {
            if (window._jrCloseFilters) window._jrCloseFilters();
            realBtn.click();                       // run the real handler — all side effects intact
            // scroll back to the top so the user sees the newly loaded view
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
          bar.appendChild(item);
        });

        document.body.appendChild(bar);

        // Keep the bottom bar's active state in sync with the real nav,
        // regardless of what triggered a stage change.
        var syncActive = function () {
          var activeId = null;
          var a = stageNav.querySelector('.stage-btn.active');
          if (a) activeId = a.dataset.stage;
          bar.querySelectorAll('.msn-item').forEach(function (el) {
            el.classList.toggle('active', el.dataset.stage === activeId);
          });
        };
        var mo = new MutationObserver(syncActive);
        mo.observe(stageNav, { attributes: true, subtree: true, childList: true, attributeFilter: ['class'] });
        syncActive();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
