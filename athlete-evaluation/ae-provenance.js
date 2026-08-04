/* ============================================================
   ae-provenance.js — where did this number come from?

   Analysis that informs a selection decision has to be reproducible by
   someone who wasn't in the room. That means every figure needs to carry
   its source table, its filters, its grouping key, its sample size, and
   the date the data was read — not in a footnote, but attached to the
   number itself.

   This exists as one shared layer rather than per-view on purpose. Doing
   it per-view guarantees drift, and drift in provenance is worse than
   having none, because a stale source note looks authoritative.

   Usage from a view:

     const p = AEProv.record('podium-gap', {
       source: 'analytics.rank_cost',
       filters: { scope: 'us-senior', gender: 'Female', discipline: '3m',
                  dive_count: 9, place: 3 },
       key: 'meet_id + event_id + result_set_id + diver_id',
       n: 41, nLabel: 'meets',
       method: 'mean and sd of posted_score at place 3',
       caveats: ['Cumulative totals excluded', 'One dive-count format only'],
     });
     html += AEProv.badge(p);      // the "how was this computed" affordance

   AEProv.exportAll() returns every figure recorded in the session, which
   is what a written decision memo should be built from.
   ============================================================ */
(function () {
  'use strict';

  const esc = (s) => (window.AE && window.AE.esc ? window.AE.esc(s)
    : String(s == null ? '' : s).replace(/[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

  const registry = new Map();
  let seq = 0;

  // Keys verified unsafe on their own against live data — see
  // db/audits/ae_key_audit.txt. If a view declares one of these as its
  // grouping key without meet_id, that is worth surfacing rather than
  // trusting the number.
  const UNSAFE_KEYS = ['result_set_id', 'sheet_key', 'event_id'];

  function keyWarning(key) {
    if (!key) return null;
    const bare = UNSAFE_KEYS.filter((k) => key.includes(k));
    if (!bare.length) return null;
    if (key.includes('meet_id')) return null;
    return `Grouped on ${bare.join(', ')} without meet_id. That identifier is not `
      + 'unique across meets, so this figure may merge unrelated competitions.';
  }

  function record(id, meta) {
    const entry = {
      id: id + '-' + (++seq),
      label: id,
      source: meta.source || null,
      filters: meta.filters || {},
      key: meta.key || null,
      n: meta.n == null ? null : Number(meta.n),
      nLabel: meta.nLabel || 'rows',
      method: meta.method || null,
      caveats: (meta.caveats || []).slice(),
      readAt: new Date().toISOString(),
      dataVersion: (window.AE && window.AE.state && window.AE.state.buildMeta) || null,
    };
    const warn = keyWarning(entry.key);
    if (warn) entry.caveats.unshift(warn);
    registry.set(entry.id, entry);
    return entry;
  }

  function get(id) { return registry.get(id) || null; }

  function detailHtml(p) {
    const f = Object.keys(p.filters).length
      ? Object.entries(p.filters).map(([k, v]) =>
        `<tr><td>${esc(k)}</td><td>${esc(v == null ? 'any' : v)}</td></tr>`).join('')
      : '<tr><td colspan="2">none</td></tr>';
    return `<div class="ae-prov-body">
      <table class="ae-prov-tbl">
        <tr><th colspan="2">Source</th></tr>
        <tr><td>Table</td><td><code>${esc(p.source || 'unknown')}</code></td></tr>
        <tr><td>Grouping key</td><td><code>${esc(p.key || 'not declared')}</code></td></tr>
        <tr><td>Sample</td><td>${p.n == null ? 'not recorded'
          : p.n.toLocaleString() + ' ' + esc(p.nLabel)}</td></tr>
        <tr><td>Read at</td><td>${esc(p.readAt.replace('T', ' ').slice(0, 16))} UTC</td></tr>
        ${p.dataVersion ? `<tr><td>Data build</td><td>${esc(p.dataVersion)}</td></tr>` : ''}
        <tr><th colspan="2">Filters</th></tr>${f}
        ${p.method ? `<tr><th colspan="2">How it is computed</th></tr>
          <tr><td colspan="2">${esc(p.method)}</td></tr>` : ''}
        ${p.caveats.length ? `<tr><th colspan="2">Caveats</th></tr>
          ${p.caveats.map((c) => `<tr><td colspan="2">${esc(c)}</td></tr>`).join('')}` : ''}
      </table>
    </div>`;
  }

  function badge(p) {
    if (!p) return '';
    const flagged = p.caveats.some((c) => c.startsWith('Grouped on'));
    return `<span class="ae-prov" data-prov="${esc(p.id)}">
      <button class="ae-prov-btn${flagged ? ' warn' : ''}" type="button"
        aria-expanded="false" title="Where this number comes from">
        ${flagged ? 'source — check' : 'source'}</button>
      <span class="ae-prov-pop" hidden>${detailHtml(p)}</span></span>`;
  }

  // One delegated listener for the whole page — views don't wire anything.
  function bind(root) {
    (root || document).addEventListener('click', (ev) => {
      const btn = ev.target.closest('.ae-prov-btn');
      document.querySelectorAll('.ae-prov-pop').forEach((el) => {
        if (!btn || el.parentElement !== btn.parentElement) el.hidden = true;
      });
      if (!btn) return;
      const pop = btn.parentElement.querySelector('.ae-prov-pop');
      const open = pop.hidden;
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  // Everything recorded this session, for a decision memo or an audit trail.
  function exportAll() {
    return [...registry.values()].map((p) => ({ ...p }));
  }

  function exportText() {
    return exportAll().map((p) => {
      const f = Object.entries(p.filters).map(([k, v]) => `${k}=${v}`).join(', ') || 'none';
      return [
        `[${p.label}]`,
        `  source:  ${p.source || 'unknown'}`,
        `  key:     ${p.key || 'not declared'}`,
        `  filters: ${f}`,
        `  sample:  ${p.n == null ? 'not recorded' : p.n + ' ' + p.nLabel}`,
        p.method ? `  method:  ${p.method}` : null,
        ...p.caveats.map((c) => `  caveat:  ${c}`),
        `  read at: ${p.readAt} UTC`,
      ].filter(Boolean).join('\n');
    }).join('\n\n');
  }

  window.AEProv = { record, get, badge, bind, exportAll, exportText, keyWarning, UNSAFE_KEYS };
})();
