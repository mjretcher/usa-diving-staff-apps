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

  /* ---- loading the app ----
     The app's scripts are listed in #bsAppScripts (index.html) and loaded here
     in that order. Dynamically inserted scripts with async=false run in
     insertion order, so the dependency chain routing -> engine -> boundary ->
     reports -> pricing holds exactly as it did with static tags. boundary.js
     boots on DOMContentLoaded, which has already fired by the time it loads,
     so we call its renderer once the chain has finished. */
  function loadAppScripts() {
    return new Promise((resolve, reject) => {
      let list = [];
      try { list = JSON.parse(byId('bsAppScripts').textContent); } catch (e) { reject(e); return; }
      let i = 0;
      const next = () => {
        if (i >= list.length) { resolve(); return; }
        const spec = list[i++];
        const el = document.createElement('script');
        el.src = spec.src; el.async = false;
        if (spec.module) el.type = 'module';
        el.onload = next;
        el.onerror = () => reject(new Error('Failed to load ' + spec.src));
        document.body.appendChild(el);
      };
      next();
    });
  }

  function share() { return !!(window.USAD_CONFIG && window.USAD_CONFIG.boundaryShare); }

  /* ---- the passcode gate (share deployment only) ----
     The passcode is checked by the proxy against share_access.tokens; this
     page only asks and remembers. Nothing about the app loads until the proxy
     has accepted it, and every later database call carries it. */
  function gate() {
    return new Promise((resolve) => {
      const params = new URLSearchParams(location.search);
      const preset = params.get('key') || '';
      let tok = '', who = '';
      try { tok = sessionStorage.getItem('usad_share_token') || ''; who = sessionStorage.getItem('usad_share_name') || ''; } catch (e) {}

      const check = async (token, name) => {
        const r = await fetch('/api/neon', { method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Share-Token': token, 'X-Share-Name': name },
          body: JSON.stringify({ ping: true }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok || j.scope !== 'boundary') throw new Error(j.error || 'That passcode is not valid for Boundary Studio.');
        try {
          sessionStorage.setItem('usad_share_token', token);
          sessionStorage.setItem('usad_share_name', name);
          sessionStorage.setItem('usad_share_label', j.label || '');
        } catch (e) {}
      };

      const show = (err) => {
        const wrap = document.createElement('div');
        wrap.className = 'bs-gate';
        wrap.innerHTML = '<form class="bs-gate-card">' +
          '<h1>Boundary Studio</h1><p class="sub">USA Diving &middot; shared workspace</p>' +
          '<label for="bsGateKey">Passcode</label><input id="bsGateKey" type="password" autocomplete="off" required value="' + esc(preset) + '">' +
          '<label for="bsGateName">Your name</label><input id="bsGateName" type="text" autocomplete="name" maxlength="80" required placeholder="So USA Diving can see who saved what" value="' + esc(who) + '">' +
          '<button type="submit">Open Boundary Studio</button>' +
          '<div class="bs-gate-err">' + esc(err || '') + '</div>' +
          '<p class="bs-gate-note">Proposals you save are visible to USA Diving staff and to others using this passcode. USA Diving\u2019s own proposals open read-only; saving one makes your own copy.</p>' +
          '</form>';
        document.body.appendChild(wrap);
        const form = wrap.querySelector('form'), btn = wrap.querySelector('button'), errEl = wrap.querySelector('.bs-gate-err');
        (preset ? byId('bsGateName') : byId('bsGateKey')).focus();
        form.addEventListener('submit', async (e) => {
          e.preventDefault(); btn.disabled = true; errEl.textContent = '';
          try {
            await check(byId('bsGateKey').value.trim(), byId('bsGateName').value.trim());
            wrap.remove(); resolve();
          } catch (ex) { errEl.textContent = ex.message; btn.disabled = false; }
        });
      };

      if (tok && who) check(tok, who).then(resolve, () => show('Your session expired. Enter the passcode again.'));
      else show('');
    });
  }

  /* On the share, the parts that reach beyond Boundary Studio are removed
     rather than left to fail: Pricing Studio reads membership counts the share
     is not allowed, and the schedule generator writes a Schedule Builder file. */
  function fenceShare() {
    const pricingTab = document.querySelector('#tabs .tab[data-view="pricing"]');
    if (pricingTab) pricingTab.remove();
    const st = document.createElement('style');
    st.textContent = '#bsGenSchedule{display:none !important}';
    document.head.appendChild(st);
    const hub = document.querySelector('a[href="../index.html"], a[href="../"]');
    if (hub) hub.remove();
  }

  async function boot() {
    if (share()) { fenceShare(); await gate(); }
    try { await loadAppScripts(); }
    catch (e) { const el = byId('topMeta'); if (el) el.textContent = e.message; return; }
    wireTabs();
    if (window.renderBoundary) window.renderBoundary();
    meta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
