/* ================================================================
   qualifier-views.js
   EWC meet picker + Nationals running qualifier list
   Hooks into main.js renderTable / renderEventList / renderContext.
   ================================================================ */

(function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function $(id) { return document.getElementById(id); }

  const EWC_GROUPS = ['East', 'Central', 'West'];
  const EWC_ZONES  = { East: ['A','B'], Central: ['C','D'], West: ['E','F'] };

  /* Module state */
  const qv = {
    ewcGroup:  null,        // 'East' | 'Central' | 'West' | null
    ewcSort:   'score-desc', // default sort for EWC event cards
  };

  /* ── Wait for main.js to boot ──────────────────────────────── */
  function waitForMain(cb, tries) {
    tries = tries || 0;
    if (typeof renderAll === 'function' && typeof state !== 'undefined') cb();
    else if (tries < 80) setTimeout(() => waitForMain(cb, tries + 1), 50);
  }

  /* ── Data helpers ──────────────────────────────────────────── */
  function allResults() {
    return (typeof effectiveResults !== 'undefined')
      ? effectiveResults
      : (window.JUNIOR_RESULTS_DATA?.results || []);
  }

  /**
   * EWC qualifiers for a group:
   *   - advancesToEWC = true  (position 4-18, threshold, replacement pool)
   *   - advancesToNationals = false  (direct/replacement Nationals qualifiers excluded)
   *   - from the two zones that feed this group
   */
  function ewcQualifiers(group) {
    const zones = EWC_ZONES[group] || [];
    return allResults().filter(r =>
      r.stage === 'Zones'
      && r.advancesToEWC
      && !r.advancesToNationals
      && zones.includes(r.zone)
    );
  }

  /** Everyone currently qualified to Nationals (all stages) */
  function nationalQualifiers() {
    return allResults().filter(r => r.advancesToNationals);
  }

  /* ── Sorting ───────────────────────────────────────────────── */
  const SORT_OPTIONS = [
    { id: 'score-desc', label: 'Score ↓' },
    { id: 'score-asc',  label: 'Score ↑' },
    { id: 'zone',       label: 'Zone' },
    { id: 'status',     label: 'Status' },
    { id: 'place',      label: 'Place' },
  ];

  function sortRows(rows, sortId) {
    const r = [...rows];
    switch (sortId) {
      case 'score-desc':
        return r.sort((a,b) => (b.score??-1) - (a.score??-1));
      case 'score-asc':
        return r.sort((a,b) => (a.score??-1) - (b.score??-1));
      case 'zone':
        return r.sort((a,b) =>
          String(a.zone||'').localeCompare(String(b.zone||''))
          || (b.score??-1) - (a.score??-1)
        );
      case 'status':
        return r.sort((a,b) =>
          statusOrder(a) - statusOrder(b)
          || (b.score??-1) - (a.score??-1)
        );
      case 'place':
        return r.sort((a,b) =>
          String(a.zone||'').localeCompare(String(b.zone||''))
          || (a.placeNumber??99) - (b.placeNumber??99)
        );
      default:
        return r;
    }
  }

  function statusOrder(r) {
    const s = r.juniorNationalStatus || '';
    if (s === 'Direct')           return 0;
    if (s === 'Replacement')      return 1;
    if (s === 'Replacement pool') return 2;
    if (s === 'E/W/C')            return 3;
    return 4;
  }

  /* ── Event grouping ────────────────────────────────────────── */
  function groupByEventKey(rows) {
    const map = new Map();
    rows.forEach(r => {
      const k = r.eventKey || r.eventName || '?';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    const ageOrder    = { 'Group A':0,'Group B':1,'Group C':2,'Group D':3,'Open':4 };
    const genderOrder = { 'Girls':0,'Boys':1 };
    const discOrder   = { '1M':0,'3M':1,'Platform':2 };
    return [...map.entries()].sort(([,ra],[,rb]) => {
      const a = ra[0], b = rb[0];
      return ((ageOrder[a.ageGroup]??9)  - (ageOrder[b.ageGroup]??9))
           || ((genderOrder[a.gender]??9) - (genderOrder[b.gender]??9))
           || ((discOrder[a.discipline]??9) - (discOrder[b.discipline]??9));
    });
  }

  /* ── Badge helpers ─────────────────────────────────────────── */
  function statusBadge(r) {
    const s = r.juniorNationalStatus || r.qualificationStatus || '';
    if (s === 'Direct')           return '<span class="qv-badge qv-direct">Direct</span>';
    if (s === 'Replacement')      return '<span class="qv-badge qv-repl">Replacement</span>';
    if (s === 'Replacement pool') return '<span class="qv-badge qv-pool">Repl. pool</span>';
    if (s === 'E/W/C')            return '<span class="qv-badge qv-ewc">E/W/C</span>';
    if ((s||'').includes('threshold')) return '<span class="qv-badge qv-thr">Threshold</span>';
    if ((s||'').includes('position'))  return '<span class="qv-badge qv-ewc">Position</span>';
    if (r.advancesToNationals)    return '<span class="qv-badge qv-direct">→ Natl</span>';
    if (r.advancesToEWC)          return '<span class="qv-badge qv-ewc">→ E/W/C</span>';
    return '';
  }

  function ndBadge(r) {
    if (!r.nonDisplacing) return '';
    const reason = r.nonDisplacingReason || '';
    const label = reason.includes('HPS') ? 'HPS'
                : reason.includes('Foreign') ? 'Foreign'
                : reason.includes('Dual') ? 'Dual' : 'ND';
    return `<span class="qv-badge qv-nd">${label}</span>`;
  }

  /* ── Sort bar HTML ─────────────────────────────────────────── */
  function sortBarHTML(currentSort) {
    return `<div class="qv-sort-bar">
      <span class="qv-sort-label">Sort:</span>
      ${SORT_OPTIONS.map(o =>
        `<button class="qv-sort-btn ${currentSort===o.id?'active':''}" data-sort="${o.id}">${esc(o.label)}</button>`
      ).join('')}
    </div>`;
  }

  /* ── EWC View ──────────────────────────────────────────────── */
  function renderEWCView() {
    const tableWrap = $('tableWrap');
    const ctx       = $('resultsContext');
    if (!tableWrap) return;

    const pickerHTML = `
      <div class="qv-meet-picker">
        ${EWC_GROUPS.map(g => {
          const cnt = ewcQualifiers(g).length;
          return `<button class="qv-meet-btn ${qv.ewcGroup===g?'active':''}" data-ewc="${esc(g)}">
            <span class="qv-meet-label">${esc(g)}</span>
            <span class="qv-meet-count">${cnt} E/W/C qualifiers</span>
          </button>`;
        }).join('')}
      </div>`;

    if (!qv.ewcGroup) {
      ctx.innerHTML = `<div class="context-title-block">
        <strong>E/W/C Qualifiers</strong>
        <span>Select a meet — shows athletes advancing from Zones to E/W/C (Nationals direct qualifiers excluded)</span>
      </div>`;
      tableWrap.innerHTML = pickerHTML + `
        <div class="qv-empty">
          <div class="qv-empty-title">Select a meet above</div>
          <div class="qv-empty-sub">Choose East, Central, or West to see Zone qualifiers for that meet</div>
        </div>`;
    } else {
      const quals   = ewcQualifiers(qv.ewcGroup);
      const grouped = groupByEventKey(quals);
      const thr     = quals.filter(r => (r.qualificationStatus||'').includes('threshold')).length;
      const nd      = quals.filter(r => r.nonDisplacing).length;

      ctx.innerHTML = `<div class="context-title-block">
        <strong>${esc(qv.ewcGroup)} Championships — E/W/C Qualifier List</strong>
        <span>Zones ${EWC_ZONES[qv.ewcGroup]?.join(' & ')} · Nationals direct qualifiers not shown</span>
      </div>
      <div class="context-stats">
        <span>${quals.length} athletes</span>
        <span>${grouped.length} events</span>
        <span>${thr} threshold qualifiers</span>
        <span>${nd} non-displacing</span>
      </div>`;

      renderEWCSidebar(grouped);

      let html = pickerHTML + sortBarHTML(qv.ewcSort) + '<div class="qv-event-grid">';

      grouped.forEach(([eventKey, rows]) => {
        const sorted    = sortRows(rows, qv.ewcSort);
        const anchorId  = `qve-${eventKey.replace(/\W+/g,'-')}`;
        const zoneA     = EWC_ZONES[qv.ewcGroup]?.[0];
        const zoneB     = EWC_ZONES[qv.ewcGroup]?.[1];
        const cntA      = rows.filter(r=>r.zone===zoneA).length;
        const cntB      = rows.filter(r=>r.zone===zoneB).length;

        html += `
          <div class="qv-event-card" id="${esc(anchorId)}">
            <div class="qv-event-header">
              <span class="qv-event-name">${esc(eventKey)}</span>
              <span class="qv-event-zones">Zone ${esc(zoneA)}: ${cntA} &nbsp;·&nbsp; Zone ${esc(zoneB)}: ${cntB}</span>
              <span class="qv-event-count">${rows.length} total</span>
            </div>
            <table class="qv-table">
              <thead><tr>
                <th>Zone</th><th>Place</th><th>Athlete</th>
                <th>Team</th><th class="qv-score-col">Score</th><th>Status</th>
              </tr></thead>
              <tbody>
                ${sorted.map((r,i) => `<tr class="${r.nonDisplacing?'qv-row-nd':''} ${i%2===0?'':'qv-row-alt'}">
                  <td><span class="qv-zone-pill zone-${esc(r.zone)}">Zone ${esc(r.zone)}</span></td>
                  <td class="qv-place">${esc(r.place)}</td>
                  <td class="qv-athlete">${esc(r.athlete)}${ndBadge(r)}</td>
                  <td class="qv-team">${esc(r.team)}</td>
                  <td class="qv-score">${r.score!=null ? Number(r.score).toFixed(2) : '—'}</td>
                  <td>${statusBadge(r)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
      });
      html += '</div>';
      tableWrap.innerHTML = html;
    }

    /* Meet picker clicks */
    tableWrap.querySelectorAll('.qv-meet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        qv.ewcGroup = (btn.dataset.ewc === qv.ewcGroup) ? null : btn.dataset.ewc;
        renderEWCView();
      });
    });

    /* Sort bar clicks */
    tableWrap.querySelectorAll('.qv-sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        qv.ewcSort = btn.dataset.sort;
        renderEWCView();
      });
    });
  }

  function renderEWCSidebar(grouped) {
    const el = $('eventList');
    if (!el) return;
    el.innerHTML = grouped.map(([eventKey, rows]) => {
      const anchorId = `qve-${eventKey.replace(/\W+/g,'-')}`;
      return `<button class="event-item"
        onclick="document.getElementById('${esc(anchorId)}')?.scrollIntoView({behavior:'smooth',block:'start'})">
        <span class="event-item-name">${esc(eventKey)}</span>
        <span class="event-item-meta">${rows.length} qualifiers</span>
      </button>`;
    }).join('');
  }

  /* ── Nationals View ────────────────────────────────────────── */
  function renderNationalsView() {
    const tableWrap = $('tableWrap');
    const ctx       = $('resultsContext');
    if (!tableWrap) return;

    const quals   = nationalQualifiers();
    const grouped = groupByEventKey(quals);
    const direct  = quals.filter(r=>r.juniorNationalStatus==='Direct').length;
    const repl    = quals.filter(r=>r.juniorNationalStatus==='Replacement').length;
    const fromEWC = quals.filter(r=>r.stage==='EWC'||r.stage==='East/West/Central').length;
    const nd      = quals.filter(r=>r.nonDisplacing).length;

    ctx.innerHTML = `<div class="context-title-block">
      <strong>Junior Nationals — Running Qualifier List</strong>
      <span>${quals.length} total qualifiers · ${grouped.length} events · updates as E/W/C results are loaded</span>
    </div>
    <div class="context-stats">
      <span class="cs-accent-green">${direct} direct from Zones</span>
      <span>${repl} replacements</span>
      ${fromEWC ? `<span>${fromEWC} from E/W/C</span>` : ''}
      <span>${nd} non-displacing</span>
    </div>`;

    if (!quals.length) {
      tableWrap.innerHTML = `<div class="qv-empty">
        <div class="qv-empty-title">No Nationals qualifiers yet</div>
        <div class="qv-empty-sub">Zone results with advancesToNationals will appear here automatically.</div>
      </div>`;
      renderNatSidebar([]);
      return;
    }

    renderNatSidebar(grouped);

    let html = '<div class="qv-event-grid">';
    grouped.forEach(([eventKey, rows]) => {
      const sorted   = sortRows(rows, 'zone'); // Nationals: zone then place by default
      const anchorId = `qvn-${eventKey.replace(/\W+/g,'-')}`;
      const directCnt = rows.filter(r=>r.juniorNationalStatus==='Direct').length;
      const replCnt   = rows.filter(r=>r.juniorNationalStatus==='Replacement').length;

      html += `
        <div class="qv-event-card" id="${esc(anchorId)}">
          <div class="qv-event-header">
            <span class="qv-event-name">${esc(eventKey)}</span>
            <span class="qv-event-zones">${directCnt} direct · ${replCnt} replacement</span>
            <span class="qv-event-count">${rows.length} qualified</span>
          </div>
          <table class="qv-table">
            <thead><tr>
              <th>Stage</th><th>Zone / Meet</th><th>Place</th>
              <th>Athlete</th><th>Team</th>
              <th class="qv-score-col">Score</th><th>How</th>
            </tr></thead>
            <tbody>
              ${sorted.map((r,i) => `<tr class="${r.nonDisplacing?'qv-row-nd':''} ${i%2===0?'':'qv-row-alt'}">
                <td><span class="qv-stage-pill qv-stage-${esc((r.stage||'').toLowerCase().replace(/[^a-z]/g,''))}">${esc(r.stage||'')}</span></td>
                <td class="qv-zone">${r.stage==='Zones' ? `Zone ${esc(r.zone||'')}` : esc(r.meetName||r.ewc||'')}</td>
                <td class="qv-place">${esc(r.place)}</td>
                <td class="qv-athlete">${esc(r.athlete)}${ndBadge(r)}</td>
                <td class="qv-team">${esc(r.team)}</td>
                <td class="qv-score">${r.score!=null ? Number(r.score).toFixed(2) : '—'}</td>
                <td>${statusBadge(r)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    });
    html += '</div>';
    tableWrap.innerHTML = html;
  }

  function renderNatSidebar(grouped) {
    const el = $('eventList');
    if (!el) return;
    el.innerHTML = grouped.map(([eventKey, rows]) => {
      const anchorId = `qvn-${eventKey.replace(/\W+/g,'-')}`;
      const direct = rows.filter(r=>r.juniorNationalStatus==='Direct'||r.juniorNationalStatus==='Replacement').length;
      return `<button class="event-item"
        onclick="document.getElementById('${esc(anchorId)}')?.scrollIntoView({behavior:'smooth',block:'start'})">
        <span class="event-item-name">${esc(eventKey)}</span>
        <span class="event-item-meta">${rows.length} qual · ${direct} direct</span>
      </button>`;
    }).join('');
  }

  /* ── CSS ───────────────────────────────────────────────────── */
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
.qv-meet-picker {
  display: flex; gap: 12px; padding: 16px 16px 0; flex-wrap: wrap;
}
.qv-meet-btn {
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 14px 20px; border-radius: var(--radius-md,6px);
  border: 2px solid var(--line,#e2e6ea);
  background: var(--surface,#fff); cursor: pointer;
  transition: all .15s; min-width: 160px;
  box-shadow: var(--sh-xs,0 1px 3px rgba(0,0,0,.06));
}
.qv-meet-btn:hover { border-color: var(--accent,#1a5fff); box-shadow: 0 2px 8px rgba(26,95,255,.12); }
.qv-meet-btn.active { border-color: var(--accent,#1a5fff); background: rgba(26,95,255,.06); }
.qv-meet-label { font-weight: 700; font-size: .95rem; color: var(--text,#0d1724); }
.qv-meet-count { font-size: .78rem; color: var(--text-muted,#6b7a90); margin-top: 3px; }

/* Sort bar */
.qv-sort-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 12px 16px 0; flex-wrap: wrap;
}
.qv-sort-label { font-size: .78rem; color: var(--text-muted,#6b7a90); font-weight: 600; margin-right: 2px; }
.qv-sort-btn {
  padding: 4px 10px; border-radius: 14px; font-size: .78rem; font-weight: 600;
  border: 1px solid var(--line,#e2e6ea); background: var(--surface,#fff);
  color: var(--text-muted,#6b7a90); cursor: pointer; transition: all .12s;
}
.qv-sort-btn:hover { border-color: var(--accent,#1a5fff); color: var(--accent,#1a5fff); }
.qv-sort-btn.active {
  background: var(--accent,#1a5fff); color: #fff; border-color: var(--accent,#1a5fff);
}

.qv-event-grid { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
.qv-event-card {
  border: 1px solid var(--line,#e2e6ea); border-radius: var(--radius-md,6px);
  background: var(--surface,#fff);
  box-shadow: var(--sh-xs,0 1px 3px rgba(0,0,0,.06)); overflow: hidden;
}
.qv-event-header {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: var(--surface-raised,#f7f9fb); border-bottom: 1px solid var(--line,#e2e6ea);
  flex-wrap: wrap;
}
.qv-event-name  { font-weight: 700; font-size: .92rem; color: var(--text,#0d1724); flex: 1; }
.qv-event-zones { font-size: .78rem; color: var(--text-muted,#6b7a90); }
.qv-event-count {
  font-size: .75rem; color: var(--text-muted,#6b7a90);
  background: var(--line,#e2e6ea); padding: 2px 8px; border-radius: 10px; white-space: nowrap;
}

.qv-table { width: 100%; border-collapse: collapse; font-size: .83rem; }
.qv-table th {
  padding: 6px 10px; text-align: left;
  background: var(--surface-raised,#f7f9fb); color: var(--text-muted,#6b7a90);
  font-weight: 600; border-bottom: 1px solid var(--line,#e2e6ea);
  white-space: nowrap; font-size: .74rem; text-transform: uppercase; letter-spacing: .04em;
}
.qv-table td { padding: 7px 10px; border-bottom: 1px solid var(--line,#e2e6ea); vertical-align: middle; }
.qv-table tr:last-child td { border-bottom: none; }
.qv-row-alt td { background: rgba(0,0,0,.012); }
.qv-table tr:hover td { background: rgba(26,95,255,.03); }
.qv-row-nd { opacity: .55; }
.qv-athlete { font-weight: 600; color: var(--text,#0d1724); }
.qv-team    { color: var(--text-muted,#6b7a90); font-size: .8rem; }
.qv-score   { font-family: var(--font-mono,'JetBrains Mono',monospace); text-align: right; font-weight: 500; }
.qv-score-col { text-align: right; }
.qv-place   { font-family: var(--font-mono,'JetBrains Mono',monospace); color: var(--text-muted,#6b7a90); width:40px; }
.qv-zone    { color: var(--text-muted,#6b7a90); font-size: .8rem; }

/* Zone pills — two distinct colors for the two zones in each group */
.qv-zone-pill {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: .73rem; font-weight: 700;
}
.zone-A, .zone-C, .zone-E { background: rgba(26,95,255,.1);  color: var(--accent,#1a5fff); }
.zone-B, .zone-D, .zone-F { background: rgba(14,165,100,.1); color: #0a8f55; }

.qv-stage-pill {
  display: inline-block; padding: 2px 7px; border-radius: 10px;
  font-size: .73rem; font-weight: 600;
}
.qv-stage-zones           { background: rgba(26,95,255,.1);  color: var(--accent,#1a5fff); }
.qv-stage-ewc, .qv-stage-eastwestcentral { background: rgba(14,165,100,.1); color: #0a8f55; }

/* Badges */
.qv-badge {
  display: inline-block; padding: 2px 7px; border-radius: 10px;
  font-size: .71rem; font-weight: 700; margin-left: 4px; vertical-align: middle;
}
.qv-direct { background: rgba(14,165,100,.12); color: #0a8f55; }
.qv-repl   { background: rgba(245,158,11,.14);  color: #b26a00; }
.qv-pool   { background: rgba(245,158,11,.07);  color: #b26a00; border: 1px solid rgba(245,158,11,.25); }
.qv-ewc    { background: rgba(26,95,255,.1);    color: var(--accent,#1a5fff); }
.qv-thr    { background: rgba(139,92,246,.1);   color: #6d28d9; }
.qv-nd     { background: rgba(107,114,128,.1);  color: #4b5563; }

.context-stats {
  display: flex; gap: 16px; padding: 4px 0 0;
  font-size: .8rem; color: var(--text-muted,#6b7a90); flex-wrap: wrap;
}
.context-stats span { white-space: nowrap; }
.cs-accent-green { color: #0a8f55; font-weight: 600; }

.qv-empty { padding: 48px 24px; text-align: center; }
.qv-empty-title { font-size: 1.1rem; font-weight: 700; color: var(--text,#0d1724); margin-bottom: 8px; }
.qv-empty-sub   { color: var(--text-muted,#6b7a90); font-size: .88rem; }
`;
    document.head.appendChild(style);
  }

  /* ── Patch main.js hooks ───────────────────────────────────── */
  function patchMain() {
    injectCSS();

    const origRenderTable     = window.renderTable;
    const origRenderEventList = window.renderEventList;
    const origRenderContext   = window.renderContext;
    const origBuildStageNav   = window.buildStageNav;

    window.renderTable = function () {
      if (typeof state === 'undefined') return origRenderTable?.();
      if (state.stage === 'EWC')       { renderEWCView();       return; }
      if (state.stage === 'Nationals') { renderNationalsView(); return; }
      return origRenderTable?.();
    };

    window.renderEventList = function () {
      if (typeof state === 'undefined') return origRenderEventList?.();
      if (state.stage === 'EWC' || state.stage === 'Nationals') return;
      return origRenderEventList?.();
    };

    window.renderContext = function () {
      if (typeof state === 'undefined') return origRenderContext?.();
      if (state.stage === 'EWC' || state.stage === 'Nationals') return;
      return origRenderContext?.();
    };

    window.buildStageNav = function () {
      origBuildStageNav?.();
      const nav = document.getElementById('stageNav');
      if (!nav) return;
      nav.querySelectorAll('.stage-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.stage !== 'EWC') qv.ewcGroup = null;
        }, { capture: true });
      });
    };

    console.log('[qualifier-views] patched');
  }

  waitForMain(patchMain);
})();
