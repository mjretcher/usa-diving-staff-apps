/* ================================================================
   qualifier-views.js
   EWC meet picker + Nationals running qualifier list
   Hooks into main.js renderAll() / renderTable() via patching.
   ================================================================ */

(function () {
  'use strict';

  /* ── helpers ─────────────────────────────────────────────────── */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function $(id) { return document.getElementById(id); }

  const EWC_GROUPS   = ['East', 'Central', 'West'];
  const EWC_ZONES    = { East: ['A','B'], Central: ['C','D'], West: ['E','F'] };

  /* State local to this module */
  const qv = {
    ewcGroup:   null,   // 'East' | 'Central' | 'West' | null
    natEventKey: null,  // selected eventKey in Nationals view
  };

  /* ── Wait for main.js to boot, then patch ──────────────────────*/
  function waitForMain(cb, tries) {
    tries = tries || 0;
    if (typeof renderAll === 'function' && typeof state !== 'undefined') {
      cb();
    } else if (tries < 80) {
      setTimeout(() => waitForMain(cb, tries + 1), 50);
    }
  }

  /* ── Core data helpers ─────────────────────────────────────────*/
  function allResults() {
    return (typeof effectiveResults !== 'undefined') ? effectiveResults
         : (window.JUNIOR_RESULTS_DATA?.results || []);
  }

  /** Zone results where advancesToEWC=true for a given EWC group */
  function ewcQualifiers(group) {
    const zones = EWC_ZONES[group] || [];
    return allResults().filter(r =>
      r.stage === 'Zones' && r.advancesToEWC && zones.includes(r.zone)
    );
  }

  /** Zone results where advancesToNationals=true (any stage) */
  function nationalQualifiers() {
    return allResults().filter(r => r.advancesToNationals);
  }

  /* Group rows by eventKey, sorted by ageGroup→gender→discipline */
  function groupByEventKey(rows) {
    const map = new Map();
    rows.forEach(r => {
      const k = r.eventKey || r.eventName || '?';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    // Sort by ageGroup then gender then discipline
    const ageOrder = { 'Group A':0, 'Group B':1, 'Group C':2, 'Group D':3, 'Open':4 };
    const genderOrder = { 'Girls':0, 'Boys':1 };
    const discOrder   = { '1M':0, '3M':1, 'Platform':2 };
    const sorted = [...map.entries()].sort(([ka,ra],[kb,rb]) => {
      const a = ra[0], b = rb[0];
      return ((ageOrder[a.ageGroup]??9) - (ageOrder[b.ageGroup]??9))
           || ((genderOrder[a.gender]??9) - (genderOrder[b.gender]??9))
           || ((discOrder[a.discipline]??9) - (discOrder[b.discipline]??9));
    });
    return sorted;
  }

  /* Sort qualifier rows within an event: by zone then eligibleRank */
  function sortQualRows(rows) {
    return [...rows].sort((a,b) =>
      String(a.zone||'').localeCompare(String(b.zone||''))
      || ((a.eligibleRank||99) - (b.eligibleRank||99))
      || ((a.placeNumber||99) - (b.placeNumber||99))
    );
  }

  /* ── Badge helpers ─────────────────────────────────────────────*/
  function statusBadge(r) {
    const s = r.juniorNationalStatus || r.qualificationStatus || '';
    if (s === 'Direct')           return '<span class="qv-badge qv-direct">Direct</span>';
    if (s === 'Replacement')      return '<span class="qv-badge qv-repl">Replacement</span>';
    if (s === 'Replacement pool') return '<span class="qv-badge qv-pool">Repl. pool</span>';
    if (s === 'E/W/C')            return '<span class="qv-badge qv-ewc">E/W/C</span>';
    if (s.includes('threshold'))  return '<span class="qv-badge qv-thr">Threshold</span>';
    if (s.includes('position'))   return '<span class="qv-badge qv-ewc">Position</span>';
    if (r.advancesToNationals)    return '<span class="qv-badge qv-direct">→ Nationals</span>';
    if (r.advancesToEWC)          return '<span class="qv-badge qv-ewc">→ E/W/C</span>';
    return '';
  }

  function ndBadge(r) {
    if (!r.nonDisplacing) return '';
    const reason = r.nonDisplacingReason || '';
    const label = reason.includes('HPS') ? 'HPS'
                : reason.includes('Foreign') ? 'Foreign'
                : reason.includes('Dual') ? 'Dual'
                : 'ND';
    return `<span class="qv-badge qv-nd">${label}</span>`;
  }

  /* ── EWC View ──────────────────────────────────────────────────*/
  function renderEWCView() {
    const tableWrap = $('tableWrap');
    const ctx       = $('resultsContext');

    if (!tableWrap) return;

    /* Group picker */
    const pickerHTML = `
      <div class="qv-meet-picker">
        ${EWC_GROUPS.map(g => `
          <button class="qv-meet-btn ${qv.ewcGroup===g?'active':''}" data-ewc="${esc(g)}">
            <span class="qv-meet-label">${esc(g)}</span>
            <span class="qv-meet-count">${ewcQualifiers(g).length} qualifiers</span>
          </button>`).join('')}
      </div>`;

    if (!qv.ewcGroup) {
      ctx.innerHTML = `<div class="context-title-block">
        <strong>E/W/C Qualifiers</strong>
        <span>Select a meet to view its qualifier list from Zones</span>
      </div>`;
      tableWrap.innerHTML = pickerHTML + `
        <div class="qv-empty">
          <div class="qv-empty-title">Select a meet above</div>
          <div class="qv-empty-sub">Choose East, Central, or West to see Zone qualifiers for that meet</div>
        </div>`;
    } else {
      const quals = ewcQualifiers(qv.ewcGroup);
      const grouped = groupByEventKey(quals);
      const totalDirect = quals.filter(r=>r.juniorNationalStatus==='Direct'||r.juniorNationalStatus==='Replacement pool').length;
      const totalEWC    = quals.filter(r=>r.advancesToEWC).length;

      ctx.innerHTML = `<div class="context-title-block">
        <strong>${esc(qv.ewcGroup)} Championships — E/W/C Qualifier List</strong>
        <span>Zones ${EWC_ZONES[qv.ewcGroup]?.join(' & ')} · ${quals.length} athletes across ${grouped.length} events · from Zone results</span>
      </div>
      <div class="context-stats">
        <span>${grouped.length} events</span>
        <span>${totalEWC} E/W/C spots</span>
        <span>${quals.filter(r=>r.nonDisplacing).length} non-displacing</span>
      </div>`;

      /* Event filter in sidebar event list — repopulate it */
      renderEWCSidebar(grouped);

      /* Main table */
      let html = pickerHTML + '<div class="qv-event-grid">';
      grouped.forEach(([eventKey, rows]) => {
        const sorted = sortQualRows(rows);
        const hasND  = rows.some(r=>r.nonDisplacing);

        html += `
          <div class="qv-event-card" id="qve-${esc(eventKey.replace(/\s+/g,'-'))}">
            <div class="qv-event-header">
              <span class="qv-event-name">${esc(eventKey)}</span>
              <span class="qv-event-count">${rows.length} qualifiers</span>
            </div>
            <table class="qv-table">
              <thead><tr>
                <th>Zone</th><th>Place</th><th>Athlete</th><th>Team</th>
                <th class="qv-score-col">Score</th><th>Status</th>
              </tr></thead>
              <tbody>
                ${sorted.map(r => `<tr class="${r.nonDisplacing?'qv-row-nd':''}">
                  <td><span class="qv-zone-pill">Zone ${esc(r.zone)}</span></td>
                  <td class="qv-place">${esc(r.place)}</td>
                  <td class="qv-athlete">${esc(r.athlete)} ${ndBadge(r)}</td>
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

    /* Attach meet picker clicks */
    tableWrap.querySelectorAll('.qv-meet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        qv.ewcGroup = btn.dataset.ewc === qv.ewcGroup ? null : btn.dataset.ewc;
        renderEWCView();
      });
    });
  }

  function renderEWCSidebar(grouped) {
    const el = $('eventList');
    if (!el) return;
    el.innerHTML = grouped.map(([eventKey, rows]) => {
      const anchorId = `qve-${eventKey.replace(/\s+/g,'-')}`;
      return `<button class="event-item" onclick="document.getElementById('${esc(anchorId)}')?.scrollIntoView({behavior:'smooth',block:'start'})">
        <span class="event-item-name">${esc(eventKey)}</span>
        <span class="event-item-meta">${rows.length} qualifiers</span>
      </button>`;
    }).join('');
  }

  /* ── Nationals View ────────────────────────────────────────────*/
  function renderNationalsView() {
    const tableWrap = $('tableWrap');
    const ctx       = $('resultsContext');
    if (!tableWrap) return;

    const quals = nationalQualifiers();
    const grouped = groupByEventKey(quals);

    /* Totals */
    const fromZones = quals.filter(r=>r.stage==='Zones').length;
    const fromEWC   = quals.filter(r=>r.stage==='EWC'||r.stage==='East/West/Central').length;
    const direct    = quals.filter(r=>r.juniorNationalStatus==='Direct').length;
    const repl      = quals.filter(r=>r.juniorNationalStatus==='Replacement').length;
    const nd        = quals.filter(r=>r.nonDisplacing).length;

    ctx.innerHTML = `<div class="context-title-block">
      <strong>Junior Nationals — Running Qualifier List</strong>
      <span>${quals.length} total qualifiers across ${grouped.length} events · updates as E/W/C results are loaded</span>
    </div>
    <div class="context-stats">
      <span class="cs-accent-green">${direct} direct</span>
      <span>${repl} replacements</span>
      <span>${fromZones} from Zones${fromEWC ? ` · ${fromEWC} from E/W/C` : ''}</span>
      <span>${nd} non-displacing</span>
    </div>`;

    if (!quals.length) {
      tableWrap.innerHTML = `<div class="qv-empty">
        <div class="qv-empty-title">No Nationals qualifiers yet</div>
        <div class="qv-empty-sub">Zone results with advancesToNationals will appear here automatically.</div>
      </div>`;
      return;
    }

    /* Sidebar */
    renderNatSidebar(grouped);

    /* Cards */
    let html = '<div class="qv-event-grid">';
    grouped.forEach(([eventKey, rows]) => {
      const sorted = sortQualRows(rows);
      const stageGroups = {};
      sorted.forEach(r => {
        const sg = r.stage || 'Unknown';
        if (!stageGroups[sg]) stageGroups[sg] = [];
        stageGroups[sg].push(r);
      });

      html += `
        <div class="qv-event-card" id="qvn-${esc(eventKey.replace(/\s+/g,'-'))}">
          <div class="qv-event-header">
            <span class="qv-event-name">${esc(eventKey)}</span>
            <span class="qv-event-count">${rows.length} qualified</span>
          </div>
          <table class="qv-table">
            <thead><tr>
              <th>Stage</th><th>Zone/Meet</th><th>Place</th>
              <th>Athlete</th><th>Team</th>
              <th class="qv-score-col">Score</th><th>How</th>
            </tr></thead>
            <tbody>
              ${sorted.map(r => `<tr class="${r.nonDisplacing?'qv-row-nd':''}">
                <td><span class="qv-stage-pill qv-stage-${esc((r.stage||'').toLowerCase().replace(/[^a-z]/g,''))}">${esc(r.stage||'')}</span></td>
                <td class="qv-zone">${r.stage==='Zones' ? `Zone ${esc(r.zone||'')}` : esc(r.meetName||r.ewc||'')}</td>
                <td class="qv-place">${esc(r.place)}</td>
                <td class="qv-athlete">${esc(r.athlete)} ${ndBadge(r)}</td>
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
      const anchorId = `qvn-${eventKey.replace(/\s+/g,'-')}`;
      const direct = rows.filter(r=>r.juniorNationalStatus==='Direct'||r.juniorNationalStatus==='Replacement').length;
      return `<button class="event-item" onclick="document.getElementById('${esc(anchorId)}')?.scrollIntoView({behavior:'smooth',block:'start'})">
        <span class="event-item-name">${esc(eventKey)}</span>
        <span class="event-item-meta">${rows.length} qual · ${direct} direct</span>
      </button>`;
    }).join('');
  }

  /* ── CSS injection ─────────────────────────────────────────────*/
  function injectCSS() {
    const style = document.createElement('style');
    style.textContent = `
/* ── Qualifier views ──────────────────────────────────────────── */
.qv-meet-picker {
  display: flex; gap: 12px; padding: 16px 16px 0;
  flex-wrap: wrap;
}
.qv-meet-btn {
  display: flex; flex-direction: column; align-items: flex-start;
  padding: 14px 20px; border-radius: var(--radius-md,6px);
  border: 2px solid var(--line,#e2e6ea);
  background: var(--surface,#fff);
  cursor: pointer; transition: all .15s; min-width: 160px;
  box-shadow: var(--sh-xs,0 1px 3px rgba(0,0,0,.06));
}
.qv-meet-btn:hover {
  border-color: var(--accent,#1a5fff);
  box-shadow: 0 2px 8px rgba(26,95,255,.12);
}
.qv-meet-btn.active {
  border-color: var(--accent,#1a5fff);
  background: rgba(26,95,255,.06);
}
.qv-meet-label {
  font-weight: 700; font-size: .95rem;
  color: var(--text,#0d1724);
}
.qv-meet-count {
  font-size: .78rem; color: var(--text-muted,#6b7a90); margin-top: 3px;
}
.qv-event-grid {
  display: flex; flex-direction: column; gap: 16px;
  padding: 16px;
}
.qv-event-card {
  border: 1px solid var(--line,#e2e6ea);
  border-radius: var(--radius-md,6px);
  background: var(--surface,#fff);
  box-shadow: var(--sh-xs,0 1px 3px rgba(0,0,0,.06));
  overflow: hidden;
}
.qv-event-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface-raised,#f7f9fb);
  border-bottom: 1px solid var(--line,#e2e6ea);
}
.qv-event-name {
  font-weight: 700; font-size: .92rem; color: var(--text,#0d1724);
}
.qv-event-count {
  font-size: .78rem; color: var(--text-muted,#6b7a90);
  background: var(--line,#e2e6ea); padding: 2px 8px; border-radius: 10px;
}
.qv-table {
  width: 100%; border-collapse: collapse; font-size: .83rem;
}
.qv-table th {
  padding: 6px 10px; text-align: left;
  background: var(--surface-raised,#f7f9fb);
  color: var(--text-muted,#6b7a90); font-weight: 600;
  border-bottom: 1px solid var(--line,#e2e6ea);
  white-space: nowrap; font-size: .75rem; text-transform: uppercase; letter-spacing: .04em;
}
.qv-table td {
  padding: 7px 10px; border-bottom: 1px solid var(--line,#e2e6ea);
  vertical-align: middle;
}
.qv-table tr:last-child td { border-bottom: none; }
.qv-table tr:hover td { background: rgba(26,95,255,.03); }
.qv-row-nd td { opacity: .6; }
.qv-athlete { font-weight: 600; color: var(--text,#0d1724); }
.qv-team    { color: var(--text-muted,#6b7a90); font-size: .8rem; }
.qv-score   { font-family: var(--font-mono,'JetBrains Mono',monospace); text-align: right; }
.qv-score-col { text-align: right; }
.qv-place   { font-family: var(--font-mono,'JetBrains Mono',monospace); color: var(--text-muted,#6b7a90); }
.qv-zone    { color: var(--text-muted,#6b7a90); font-size: .8rem; }

.qv-zone-pill {
  display: inline-block; padding: 2px 7px; border-radius: 10px;
  font-size: .73rem; font-weight: 600;
  background: rgba(26,95,255,.08); color: var(--accent,#1a5fff);
}
.qv-stage-pill {
  display: inline-block; padding: 2px 7px; border-radius: 10px;
  font-size: .73rem; font-weight: 600;
}
.qv-stage-zones  { background: rgba(26,95,255,.08); color: var(--accent,#1a5fff); }
.qv-stage-ewc, .qv-stage-eastwestcentral {
  background: rgba(14,165,100,.1); color: #0ea564;
}

/* Status badges */
.qv-badge {
  display: inline-block; padding: 2px 7px; border-radius: 10px;
  font-size: .72rem; font-weight: 700; margin-left: 4px;
}
.qv-direct { background: rgba(14,165,100,.12); color: #0a8f55; }
.qv-repl   { background: rgba(245,158,11,.12);  color: #b26a00; }
.qv-pool   { background: rgba(245,158,11,.06);  color: #b26a00; border: 1px solid rgba(245,158,11,.2); }
.qv-ewc    { background: rgba(26,95,255,.1);    color: var(--accent,#1a5fff); }
.qv-thr    { background: rgba(139,92,246,.1);   color: #6d28d9; }
.qv-nd     { background: rgba(107,114,128,.1);  color: #4b5563; }

.context-stats {
  display: flex; gap: 16px; padding: 4px 0 0;
  font-size: .8rem; color: var(--text-muted,#6b7a90); flex-wrap: wrap;
}
.context-stats span { white-space: nowrap; }
.cs-accent-green { color: #0a8f55; font-weight: 600; }

.qv-empty {
  padding: 48px 24px; text-align: center;
}
.qv-empty-title {
  font-size: 1.1rem; font-weight: 700; color: var(--text,#0d1724); margin-bottom: 8px;
}
.qv-empty-sub { color: var(--text-muted,#6b7a90); font-size: .88rem; }
`;
    document.head.appendChild(style);
  }

  /* ── Patch into main.js renderTable ───────────────────────────*/
  function patchMain() {
    injectCSS();

    const origRenderTable  = window.renderTable;
    const origRenderAll    = window.renderAll;
    const origRenderEventList = window.renderEventList;
    const origRenderContext   = window.renderContext;

    window.renderTable = function () {
      if (typeof state === 'undefined') return origRenderTable?.();
      if (state.stage === 'EWC') { renderEWCView(); return; }
      if (state.stage === 'Nationals') { renderNationalsView(); return; }
      return origRenderTable?.();
    };

    window.renderEventList = function () {
      if (typeof state === 'undefined') return origRenderEventList?.();
      // For EWC/Nationals we build the sidebar ourselves inside the view render
      if (state.stage === 'EWC' || state.stage === 'Nationals') return;
      return origRenderEventList?.();
    };

    window.renderContext = function () {
      if (typeof state === 'undefined') return origRenderContext?.();
      // For EWC/Nationals context is rendered inside the view
      if (state.stage === 'EWC' || state.stage === 'Nationals') return;
      return origRenderContext?.();
    };

    /* Reset EWC group selection when switching away and back */
    const origBuildStageNav = window.buildStageNav;
    window.buildStageNav = function () {
      origBuildStageNav?.();
      // Re-attach click listener to reset qv state on stage change
      const nav = document.getElementById('stageNav');
      if (!nav) return;
      nav.querySelectorAll('.stage-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.stage !== 'EWC') qv.ewcGroup = null;
        }, { capture: true });
      });
    };

    console.log('[qualifier-views] patched into renderTable/renderEventList/renderContext');
  }

  waitForMain(patchMain);
})();
