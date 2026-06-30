/* ================================================================
   USA DIVING — JUNIOR CIRCUIT · MOBILE NAV
   FILTERS DRAWER: injects a "Filters" button into the top bar and a
   backdrop so the control sidebar slides in as an off-canvas drawer
   on phones. Inert on desktop (button hidden via mobile.css),
   idempotent, fully self-contained — no change to app behaviour.

   (Stage navigation is handled purely in CSS — on mobile the real
   #stageNav buttons are restyled as a sticky grid of pills at the
   top of the screen, so no JS is needed for it.)
   ================================================================ */
(function () {
  'use strict';

  function init() {
    var topbar  = document.querySelector('.app-topbar');
    var brand   = document.querySelector('.topbar-brand');
    var sidebar = document.querySelector('.control-sidebar');
    if (!topbar || !sidebar) return;
    if (document.querySelector('.mobile-filter-toggle')) return; // already injected

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

    // Place it right after the brand, before the stage grid.
    if (brand && brand.parentNode === topbar && brand.nextSibling) {
      topbar.insertBefore(btn, brand.nextSibling);
    } else {
      topbar.insertBefore(btn, topbar.firstChild);
    }

    var backdrop = document.createElement('div');
    backdrop.className = 'mobile-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    function open()  { document.body.classList.add('filters-open');  btn.classList.add('active');  btn.setAttribute('aria-expanded', 'true'); }
    function close() { document.body.classList.remove('filters-open'); btn.classList.remove('active'); btn.setAttribute('aria-expanded', 'false'); }

    btn.addEventListener('click', function () {
      if (document.body.classList.contains('filters-open')) close(); else open();
    });
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', function () { if (window.innerWidth > 760) close(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
