/* Boundary Studio — app shell.
 *
 * Boundary Studio used to be a tab inside Membership Analytics, so ma-app.js
 * owned two things it needed: switching the visible view, and filling the
 * header's meta line. ma-app.js stays with Membership Analytics (it loads the
 * whole membership dataset, none of which this app uses), so this file
 * provides just those two things and nothing else.
 *
 * Deliberately NOT a copy of ma-app.js's boot(): that awaits loadAll() and
 * renders six membership views. Boundary Studio loads its own data inside
 * boundary.js, so this shell does no data loading at all -- the header line
 * reports what boundary.js actually loaded, once it has.
 */
(function () {
  'use strict';

  const byId = (id) => document.getElementById(id);

  function wireTabs() {
    const tabs = document.querySelectorAll('#tabs .tab');
    tabs.forEach((t) => t.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.toggle('active', x === t));
      const v = t.dataset.view;
      document.querySelectorAll('.view').forEach((x) => x.classList.remove('active'));
      const pane = byId('view' + v[0].toUpperCase() + v.slice(1));
      if (pane) pane.classList.add('active');
      // Same lazy-render handoff ma-app.js used: each panel draws on first
      // reveal rather than at boot, because both are expensive.
      if (v === 'boundary' && window.renderBoundary) window.renderBoundary();
      if (v === 'pricing' && window.renderPricing) window.renderPricing();
    }));
  }

  /* The header line. boundary.js owns the data, so rather than guess at
     counts here, report what it actually loaded and when the entry data was
     built -- the same provenance the reports cite, visible without opening
     one. Polls briefly because boundary.js loads asynchronously and does not
     emit an event we can wait on. */
  function meta() {
    const el = byId('topMeta');
    if (!el) return;
    let tries = 0;
    const tick = () => {
      tries++;
      let stamps = null, scenario = null;
      try {
        stamps = window.BoundaryAPI && window.BoundaryAPI.stamps ? window.BoundaryAPI.stamps() : null;
        scenario = window.BoundaryAPI && window.BoundaryAPI.scenario ? window.BoundaryAPI.scenario() : null;
      } catch (e) { /* not ready yet */ }
      if (stamps) {
        const built = stamps.advance_data ? String(stamps.advance_data).slice(0, 10) : 'unknown';
        const name = (scenario && scenario.name) || 'Unsaved working scenario';
        el.innerHTML = 'Scenario: ' + esc(name) +
          '<br>Entry data built ' + esc(built) + ' &middot; membership from Neon';
        return;
      }
      if (tries < 40) { setTimeout(tick, 250); return; }
      // Never leave "Loading data…" sitting there forever if something failed.
      el.textContent = 'Boundary data not loaded — check the Neon connection and refresh';
    };
    tick();
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function boot() {
    wireTabs();
    // Boundary Studio is the landing view, so draw it immediately rather than
    // waiting for a tab click that will not come.
    if (window.renderBoundary) {
      window.renderBoundary();
    } else {
      // boundary.js may not have parsed yet depending on script order.
      window.addEventListener('load', () => {
        if (window.renderBoundary) window.renderBoundary();
      });
    }
    meta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
