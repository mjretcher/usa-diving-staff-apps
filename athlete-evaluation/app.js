/* ============================================================
   app.js — Athlete Evaluation shell: view tabs, hash routing, and
   the shared athlete picker. Field Intel (the field-level dashboard
   in main.js) boots lazily; athlete views render from AE.state.
   Deep-linkable: #view=passport&a=49903
   ============================================================ */
(function () {
  'use strict';
  const { esc, escJsAttr } = window.AE;

  const VIEWS = [
    { id: 'field',    label: 'Field Intel',      el: 'view-field',    athlete: false },
    { id: 'la28',     label: 'LA28 Watch',       el: 'view-la28',     athlete: false, mod: () => window.AELa28 },
    { id: 'passport', label: 'Athlete Passport', el: 'view-passport', athlete: true, mod: () => window.AEPassport },
    { id: 'listlab',  label: 'List Lab',         el: 'view-listlab',  athlete: true, mod: () => window.AEListLab },
    { id: 'pressure', label: 'Pressure',         el: 'view-pressure', athlete: true, mod: () => window.AEPressure },
    { id: 'podium',   label: 'Podium Gap',       el: 'view-podium',   athlete: true, mod: () => window.AEPodium },
    { id: 'race',     label: 'Race Replay',      el: 'view-race',     athlete: false, mod: () => window.AERace },
    { id: 'medaltrack', label: 'Medal Track',    el: 'view-medaltrack', athlete: false, mod: () => window.AECorridor },
  ];
  const state = { view: 'field', fieldBooted: false, searching: null };

  function parseHash() {
    const h = {}; location.hash.replace(/^#/, '').split('&').forEach((kv) => {
      const [k, v] = kv.split('='); if (k) h[k] = decodeURIComponent(v || '');
    });
    return h;
  }
  function writeHash() {
    const parts = ['view=' + state.view];
    if (window.AE.state.athleteId) parts.push('a=' + encodeURIComponent(window.AE.state.athleteId));
    history.replaceState(null, '', '#' + parts.join('&'));
  }

  async function setView(id) {
    state.view = id;
    document.querySelectorAll('.ae-tab').forEach((t) => t.classList.toggle('active', t.dataset.view === id));
    VIEWS.forEach((v) => { const el = document.getElementById(v.el); if (el) el.hidden = v.id !== id; });
    writeHash();
    const v = VIEWS.find((x) => x.id === id);
    if (v.id === 'field') {
      if (!state.fieldBooted) { state.fieldBooted = true; window.AEField.bootstrap(); }
      return;
    }
    rerender();
  }

  async function rerender() {
    const v = VIEWS.find((x) => x.id === state.view);
    if (!v || !v.mod) return;
    const root = document.getElementById(v.el);
    try {
      await v.mod().render(root);
    } catch (e) {
      root.innerHTML = `<div class="ae-card"><div class="ae-empty" style="color:var(--brand-red)">Something went wrong loading this view: ${esc(e.message || e)}</div></div>`;
      console.error('[AE]', e);
    }
  }

  /* ---------- athlete picker ---------- */
  async function selectAthlete(id) {
    const chip = document.getElementById('aeAthleteChip');
    chip.innerHTML = `<span class="ae-chip">Loading…</span>`;
    closeResults();
    try {
      const bundle = await window.AE.loadAthlete(id);
      window.AE.state.athleteId = id;
      window.AE.state.bundle = bundle;
      if (window.AEListLab) window.AEListLab.onAthleteChange();
      if (window.AEPassport) window.AEPassport.st.disc = null;
      if (window.AEPodium) window.AEPodium.onAthleteChange();
      renderChip();
      writeHash();
      if (state.view === 'field') setView('passport'); else rerender();
    } catch (e) {
      chip.innerHTML = `<span class="ae-chip" style="color:var(--brand-red)">Could not load athlete</span>`;
      console.error('[AE picker]', e);
    }
  }

  function renderChip() {
    const b = window.AE.state.bundle;
    const chip = document.getElementById('aeAthleteChip');
    if (!b) { chip.innerHTML = ''; return; }
    const iv = b.ident;
    chip.innerHTML = `<span class="ae-sel-athlete" title="${esc(iv.families || '')}">
      <b>${esc(iv.display_name)}</b>
      <span>${esc(iv.team_name || iv.nat || '')} · ${esc(iv.n_dives)} dives</span>
      <button class="ae-sel-x" onclick="AEApp.clearAthlete()" aria-label="Clear athlete">×</button></span>`;
  }

  function closeResults() {
    const r = document.getElementById('aeSearchResults');
    if (r) { r.hidden = true; r.innerHTML = ''; }
  }

  async function onSearchInput(val) {
    clearTimeout(state.searching);
    if (!val || val.trim().length < 2) { closeResults(); return; }
    state.searching = setTimeout(async () => {
      let rows = [];
      try { rows = await window.AE.searchAthletes(val); } catch (e) { console.error(e); }
      const r = document.getElementById('aeSearchResults');
      if (!rows.length) { r.innerHTML = `<div class="ae-sr-empty">No athletes match "${esc(val)}".</div>`; r.hidden = false; return; }
      r.innerHTML = rows.map((a) => `
        <button class="ae-sr-row" onclick="AEApp.pick('${escJsAttr(a.canonical_id)}')">
          <span class="ae-sr-name">${esc(a.display_name)}${a.nat && a.nat !== 'USA' ? ` <i>${esc(a.nat)}</i>` : ''}</span>
          <span class="ae-sr-meta">${esc(a.team_name || '')} · ${esc(a.first_year)}–${esc(a.last_year)} · ${esc(a.n_phase_meets)} meets${Number(a.n_dives) ? ` · ${esc(a.n_dives)} dives` : ''}${a.wa_id && a.match_method === 'name_token_exact' ? ' · <b class="ae-sr-wa">WORLD</b>' : ''}</span>
        </button>`).join('');
      r.hidden = false;
    }, 240);
  }

  function pickerPrompt(msg) {
    return `<div class="ae-card ae-prompt">
      <div class="ae-prompt-icon">◈</div>
      <div class="ae-prompt-msg">${esc(msg)}</div>
      <div class="ae-prompt-hint">Use the athlete search above — try a name like "Hedberg" or scout an international rival like "Chen".</div>
    </div>`;
  }

  /* ---------- boot ---------- */
  async function boot() {
    const tabs = document.getElementById('aeTabs');
    tabs.innerHTML = VIEWS.map((v) => `<button class="ae-tab" data-view="${v.id}" onclick="AEApp.go('${v.id}')">${esc(v.label)}</button>`).join('');

    const inp = document.getElementById('aeSearchInput');
    inp.addEventListener('input', (e) => onSearchInput(e.target.value));
    inp.addEventListener('focus', (e) => onSearchInput(e.target.value));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.ae-search')) closeResults();
    });

    // freshness chip — analytics rebuild time + latest scrape, since the scraper is live
    window.AE.buildMeta().then((m) => {
      const el = document.getElementById('aeFreshness');
      if (el && (m.built || m.latest_import)) {
        el.textContent = `analytics ${m.built || '—'} · latest scrape ${m.latest_import || '—'} · scraper active`;
        el.hidden = false;
      }
    }).catch(() => {});

    const h = parseHash();
    if (h.a) {
      try { await selectAthlete(h.a); } catch (e) {}
    }
    setView(h.view && VIEWS.some((v) => v.id === h.view) ? h.view : (h.a ? 'passport' : 'field'));
  }

  window.AEApp = {
    go: setView,
    rerender,
    pick: selectAthlete,
    pickerPrompt,
    clearAthlete() {
      window.AE.state.athleteId = null; window.AE.state.bundle = null;
      renderChip(); writeHash(); rerender();
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
