/* ================================================================
   qualifier-views.js  v3
   EWC meet picker + Nationals running qualifier list
   • Collapsed event cards (expand on click / sidebar click)
   • Sort bar on both views
   • Athlete audit popup with timeline + move action
   ================================================================ */

(function () {
  'use strict';

  /* ── tiny DOM helpers ──────────────────────────────────────── */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  const EWC_GROUPS = ['East', 'Central', 'West'];
  const EWC_ZONES  = { East:['A','B'], Central:['C','D'], West:['E','F'] };

  /* Module state */
  const qv = {
    ewcGroup:     null,
    ewcSort:      'score-desc',
    natSort:      'zone',
    expanded:     new Set(),   // set of eventKey strings currently expanded
    auditRow:     null,        // row being shown in the audit popup
    auditView:    null,        // 'ewc' | 'nationals' — which view opened audit
  };

  /* ── Wait for main.js ──────────────────────────────────────── */
  function waitForMain(cb, tries) {
    tries = tries || 0;
    if (typeof renderAll === 'function' && typeof state !== 'undefined') cb();
    else if (tries < 100) setTimeout(() => waitForMain(cb, tries + 1), 50);
  }

  /* ── Data ──────────────────────────────────────────────────── */
  function allResults() {
    return (typeof effectiveResults !== 'undefined')
      ? effectiveResults
      : (window.JUNIOR_RESULTS_DATA?.results || []);
  }

  function ewcQualifiers(group) {
    const zones = EWC_ZONES[group] || [];
    return allResults().filter(r =>
      r.stage === 'Zones' && r.advancesToEWC && !r.advancesToNationals
      && zones.includes(r.zone)
    );
  }

  function nationalQualifiers() {
    return allResults().filter(r => r.advancesToNationals);
  }

  /* ── Sort ──────────────────────────────────────────────────── */
  const SORT_OPTIONS = [
    { id:'score-desc', label:'Score ↓' },
    { id:'score-asc',  label:'Score ↑' },
    { id:'zone',       label:'Zone'    },
    { id:'status',     label:'Status'  },
    { id:'place',      label:'Place'   },
  ];

  function statusOrder(r) {
    const s = r.juniorNationalStatus || '';
    return { 'Direct':0, 'Replacement':1, 'Replacement pool':2, 'E/W/C':3 }[s] ?? 4;
  }

  function sortRows(rows, sortId) {
    const r = [...rows];
    switch (sortId) {
      case 'score-desc': return r.sort((a,b) => (b.score??-1)-(a.score??-1));
      case 'score-asc':  return r.sort((a,b) => (a.score??-1)-(b.score??-1));
      case 'zone':       return r.sort((a,b) =>
        String(a.zone||'').localeCompare(String(b.zone||''))
        || (a.placeNumber??99)-(b.placeNumber??99));
      case 'status':     return r.sort((a,b) =>
        statusOrder(a)-statusOrder(b) || (b.score??-1)-(a.score??-1));
      case 'place':      return r.sort((a,b) =>
        String(a.zone||'').localeCompare(String(b.zone||''))
        || (a.placeNumber??99)-(b.placeNumber??99));
      default:           return r;
    }
  }

  /* ── Group by eventKey ─────────────────────────────────────── */
  function groupByEventKey(rows) {
    const map = new Map();
    rows.forEach(r => {
      const k = r.eventKey || r.eventName || '?';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    const ageOrd  = {'Group A':0,'Group B':1,'Group C':2,'Group D':3,'Open':4};
    const genOrd  = {'Girls':0,'Boys':1};
    const discOrd = {'1M':0,'3M':1,'Platform':2};
    return [...map.entries()].sort(([,ra],[,rb]) => {
      const a=ra[0], b=rb[0];
      return ((ageOrd[a.ageGroup]??9)-(ageOrd[b.ageGroup]??9))
           ||((genOrd[a.gender]??9)-(genOrd[b.gender]??9))
           ||((discOrd[a.discipline]??9)-(discOrd[b.discipline]??9));
    });
  }

  /* ── Badges ────────────────────────────────────────────────── */
  function statusBadge(r) {
    const s = r.juniorNationalStatus || r.qualificationStatus || '';
    if (s==='Direct')           return '<span class="qv-badge qv-direct">Direct</span>';
    if (s==='Replacement')      return '<span class="qv-badge qv-repl">Replacement</span>';
    if (s==='Replacement pool') return '<span class="qv-badge qv-pool">Repl. pool</span>';
    if (s==='E/W/C')            return '<span class="qv-badge qv-ewc">E/W/C</span>';
    if ((s||'').includes('threshold')) return '<span class="qv-badge qv-thr">Threshold</span>';
    if ((s||'').includes('position'))  return '<span class="qv-badge qv-ewc">Position</span>';
    if (r.advancesToNationals)  return '<span class="qv-badge qv-direct">→ Natl</span>';
    if (r.advancesToEWC)        return '<span class="qv-badge qv-ewc">→ E/W/C</span>';
    return '';
  }

  function ndBadge(r) {
    if (!r.nonDisplacing) return '';
    const reason = r.nonDisplacingReason||'';
    const lbl = reason.includes('HPS') ? 'HPS'
              : reason.includes('Foreign') ? 'Foreign'
              : reason.includes('Dual') ? 'Dual' : 'ND';
    return `<span class="qv-badge qv-nd">${lbl}</span>`;
  }

  /* ── Sort bar ──────────────────────────────────────────────── */
  function sortBarHTML(currentSort, key) {
    return `<div class="qv-sort-bar" data-sort-key="${esc(key)}">
      <span class="qv-sort-label">Sort:</span>
      ${SORT_OPTIONS.map(o =>
        `<button class="qv-sort-btn${currentSort===o.id?' active':''}"
          data-sort="${o.id}">${esc(o.label)}</button>`
      ).join('')}
    </div>`;
  }

  /* ── Event card HTML (collapsed or expanded) ───────────────── */
  function eventCardHTML(eventKey, rows, sortId, viewType, extraHeaderInfo) {
    const anchorId = `qv-${viewType}-${eventKey.replace(/\W+/g,'-')}`;
    const isOpen   = qv.expanded.has(anchorId);
    const sorted   = isOpen ? sortRows(rows, sortId) : [];

    const colsEWC = ['Zone','Place','Athlete','Team','Score','Status'];
    const colsNat = ['Stage','Zone / Meet','Place','Athlete','Team','Score','How'];

    const cols = viewType==='ewc' ? colsEWC : colsNat;

    const tableHTML = isOpen ? `
      <table class="qv-table">
        <thead><tr>${cols.map(c=>`<th>${c==='Score'?`<span class="qv-score-col">${c}</span>`:esc(c)}</th>`).join('')}</tr></thead>
        <tbody>
          ${sorted.map((r,i) => {
            const rowCls = [r.nonDisplacing?'qv-row-nd':'', i%2?'qv-row-alt':''].filter(Boolean).join(' ');
            if (viewType==='ewc') {
              return `<tr class="${rowCls}" data-athlete-key="${esc(auditKey(r))}" style="cursor:pointer">
                <td><span class="qv-zone-pill zone-${esc(r.zone)}">Zone ${esc(r.zone)}</span></td>
                <td class="qv-place">${esc(r.place)}</td>
                <td class="qv-athlete">${esc(r.athlete)}${ndBadge(r)}</td>
                <td class="qv-team">${esc(r.team)}</td>
                <td class="qv-score">${r.score!=null?Number(r.score).toFixed(2):'—'}</td>
                <td>${statusBadge(r)}</td>
              </tr>`;
            } else {
              const loc = r.stage==='Zones'
                ? `Zone ${r.zone||''}`
                : r.meetName||r.ewc||'';
              return `<tr class="${rowCls}" data-athlete-key="${esc(auditKey(r))}" style="cursor:pointer">
                <td><span class="qv-stage-pill qv-stage-${esc((r.stage||'').toLowerCase().replace(/[^a-z]/g,''))}">${esc(r.stage||'')}</span></td>
                <td class="qv-zone">${esc(loc)}</td>
                <td class="qv-place">${esc(r.place)}</td>
                <td class="qv-athlete">${esc(r.athlete)}${ndBadge(r)}</td>
                <td class="qv-team">${esc(r.team)}</td>
                <td class="qv-score">${r.score!=null?Number(r.score).toFixed(2):'—'}</td>
                <td>${statusBadge(r)}</td>
              </tr>`;
            }
          }).join('')}
        </tbody>
      </table>` : '';

    return `
      <div class="qv-event-card${isOpen?' qv-open':''}" id="${esc(anchorId)}" data-anchor="${esc(anchorId)}">
        <button class="qv-event-header" data-anchor="${esc(anchorId)}">
          <span class="qv-chevron">${isOpen?'▾':'▸'}</span>
          <span class="qv-event-name">${esc(eventKey)}</span>
          ${extraHeaderInfo ? `<span class="qv-event-zones">${extraHeaderInfo}</span>` : ''}
          <span class="qv-event-count">${rows.length}</span>
        </button>
        <div class="qv-card-body${isOpen?'':' qv-hidden'}">
          ${tableHTML}
        </div>
      </div>`;
  }

  /* ── Audit key (unique per result row) ─────────────────────── */
  function auditKey(r) {
    return [r.stage, r.eventId||r.eventName, r.athlete, r.sourceRow].join('||');
  }

  /* Store a flat lookup of all rows by auditKey for popup lookup */
  let _rowByKey = new Map();
  function rebuildRowIndex() {
    _rowByKey = new Map();
    allResults().forEach(r => _rowByKey.set(auditKey(r), r));
  }

  /* ── Audit popup ───────────────────────────────────────────── */
  function buildTimeline(r, viewType) {
    const lines = [];
    const score = r.score != null ? Number(r.score).toFixed(2) : '—';
    const thr   = r.officialThresholdScore != null
                  ? Number(r.officialThresholdScore).toFixed(3) : null;

    // Where they competed
    lines.push({
      icon: '📍',
      text: `Competed at <strong>${esc(r.meetName||r.stage)}</strong>, Zone ${esc(r.zone||'—')} (${esc(r.ewc||'—')} group)`,
    });

    // Their result
    lines.push({
      icon: '🏊',
      text: `Finished <strong>${esc(r.place) || '—'}</strong> in <strong>${esc(r.eventKey||r.eventName)}</strong> with a score of <strong>${score}</strong>`,
    });

    // Eligible rank
    if (r.eligibleRank) {
      lines.push({
        icon: '🔢',
        text: `Eligible rank: <strong>${r.eligibleRank}</strong>${r.attendingEligibleRank ? ` (attending rank: ${r.attendingEligibleRank})` : ''}`,
      });
    }

    // Non-displacing
    if (r.nonDisplacing) {
      lines.push({
        icon: '🚫',
        text: `<strong>Non-displacing</strong> — ${esc(r.nonDisplacingReason||'no reason recorded')}. Does not consume a qualifying spot.`,
        cls: 'tl-warn',
      });
    }

    // Flags
    const flags = [];
    if (r.hps)             flags.push('HPS athlete (Tier designation)');
    if (r.foreignDeclared) flags.push(`Foreign declared${r.foreignDeclarationDetail?' — '+r.foreignDeclarationDetail:''}`);
    if (r.dualDeclared)    flags.push(`Dual citizenship${r.dualOtherCountry?' — declared for another country':' — declared for USA'}`);
    if (r.ymca)            flags.push('YMCA event champion');
    if (r.prequalified)    flags.push('Prequalified to Junior Nationals');
    if (flags.length) {
      flags.forEach(f => lines.push({ icon: '🏷️', text: esc(f), cls: 'tl-flag' }));
    }

    // Threshold
    if (thr) {
      const beat = r.score != null && r.score >= r.officialThresholdScore;
      lines.push({
        icon: beat ? '✅' : '❌',
        text: `18th-place average threshold: <strong>${thr}</strong> — athlete scored <strong>${score}</strong> — ${beat ? '<span class="tl-yes">meets threshold</span>' : '<span class="tl-no">does not meet threshold</span>'}`,
        cls: beat ? 'tl-good' : 'tl-bad',
      });
    }

    // Qual status
    const qs = r.qualificationStatus || r.juniorNationalStatus || '';
    if (qs) {
      const isGood = r.advancesToNationals || r.advancesToEWC;
      lines.push({
        icon: isGood ? '🎯' : '⛔',
        text: `Qualification status: <strong>${esc(qs)}</strong>`,
        cls: isGood ? 'tl-good' : 'tl-bad',
      });
    }

    // Override notes
    if (r.overrideNotes?.length) {
      r.overrideNotes.forEach(n => lines.push({ icon: '✏️', text: `Override: ${esc(n)}`, cls: 'tl-override' }));
    }

    return lines;
  }

  function showAudit(r, viewType) {
    qv.auditRow  = r;
    qv.auditView = viewType;

    // Remove any existing popup
    document.getElementById('qv-audit')?.remove();

    const timeline = buildTimeline(r, viewType);
    const timelineHTML = timeline.map(l =>
      `<div class="tl-item${l.cls?' '+l.cls:''}">
        <span class="tl-icon">${l.icon}</span>
        <span class="tl-text">${l.text}</span>
      </div>`
    ).join('');

    // Move actions — what can we do with this athlete?
    const canMoveToNat = viewType === 'ewc' && r.advancesToEWC && !r.advancesToNationals && !r.nonDisplacing;
    const canMoveToEWC = viewType === 'nationals' && r.advancesToNationals && !r.advancesToEWC;

    const moveHTML = canMoveToNat ? `
      <div class="audit-move-section">
        <div class="audit-move-title">Manual correction</div>
        <p class="audit-move-desc">If this athlete should instead be a Nationals direct qualifier, add an override note. This won't automatically change their spot — use the main Overrides drawer to formally change their status.</p>
        <button class="audit-move-btn" id="qv-open-overrides">Open Overrides drawer for this athlete</button>
      </div>` : canMoveToEWC ? `
      <div class="audit-move-section">
        <div class="audit-move-title">Manual correction</div>
        <p class="audit-move-desc">If this athlete should be in E/W/C rather than Nationals direct, use the Overrides drawer to adjust their status.</p>
        <button class="audit-move-btn" id="qv-open-overrides">Open Overrides drawer for this athlete</button>
      </div>` : `
      <div class="audit-move-section audit-move-info">
        <div class="audit-move-title">Status</div>
        <p class="audit-move-desc">${r.nonDisplacing
          ? 'This athlete is non-displacing — their classification is set by the roster (HPS/Foreign/Dual). Use Overrides to change their flag status if there is an error.'
          : 'No move action available for this qualification path.'}</p>
        ${r.nonDisplacing ? '<button class="audit-move-btn" id="qv-open-overrides">Open Overrides drawer</button>' : ''}
      </div>`;

    const overlay = el('div', 'qv-audit-overlay');
    overlay.id = 'qv-audit-overlay';
    overlay.addEventListener('click', closeAudit);

    const popup = el('div', 'qv-audit');
    popup.id = 'qv-audit';
    popup.innerHTML = `
      <div class="audit-header">
        <div class="audit-name">${esc(r.athlete)}</div>
        <div class="audit-sub">${esc(r.eventKey||r.eventName)} · ${esc(r.meetName||r.stage)}</div>
        <button class="audit-close" id="qv-audit-close">✕</button>
      </div>
      <div class="audit-body">
        <div class="audit-section-title">Qualification trail</div>
        <div class="audit-timeline">${timelineHTML}</div>
        ${moveHTML}
      </div>`;

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    popup.querySelector('#qv-audit-close')?.addEventListener('click', closeAudit);

    // Wire up "open overrides" shortcut
    popup.querySelector('#qv-open-overrides')?.addEventListener('click', () => {
      closeAudit();
      // Pre-fill the override drawer fields if possible
      const idInput   = document.getElementById('overrideAthleteId');
      const nameInput = document.getElementById('overrideAthleteName');
      if (idInput)   idInput.value   = r.diveMeetsId || '';
      if (nameInput) nameInput.value = r.athlete || '';
      // Open the drawer
      const drawerBtn = document.getElementById('overrideToggle');
      const drawer    = document.getElementById('overrideDrawer');
      if (drawer && drawer.hidden) drawerBtn?.click();
    });
  }

  function closeAudit() {
    document.getElementById('qv-audit')?.remove();
    document.getElementById('qv-audit-overlay')?.remove();
    qv.auditRow = null;
  }

  /* ── EWC View ──────────────────────────────────────────────── */
  function renderEWCView() {
    const tableWrap = $('tableWrap');
    const ctx       = $('resultsContext');
    if (!tableWrap) return;

    rebuildRowIndex();

    const pickerHTML = `
      <div class="qv-meet-picker">
        ${EWC_GROUPS.map(g => {
          const cnt = ewcQualifiers(g).length;
          return `<button class="qv-meet-btn${qv.ewcGroup===g?' active':''}" data-ewc="${esc(g)}">
            <span class="qv-meet-label">${esc(g)}</span>
            <span class="qv-meet-count">${cnt} E/W/C qualifiers</span>
          </button>`;
        }).join('')}
      </div>`;

    if (!qv.ewcGroup) {
      ctx.innerHTML = `<div class="context-title-block">
        <strong>E/W/C Qualifiers</strong>
        <span>Select a meet — Nationals direct qualifiers not shown</span>
      </div>`;
      tableWrap.innerHTML = pickerHTML + `<div class="qv-empty">
        <div class="qv-empty-title">Select a meet above</div>
        <div class="qv-empty-sub">Choose East, Central, or West to see Zone qualifiers for that meet</div>
      </div>`;
    } else {
      const quals   = ewcQualifiers(qv.ewcGroup);
      const grouped = groupByEventKey(quals);
      const zoneA   = EWC_ZONES[qv.ewcGroup]?.[0];
      const zoneB   = EWC_ZONES[qv.ewcGroup]?.[1];
      const thr     = quals.filter(r=>(r.qualificationStatus||'').includes('threshold')).length;
      const nd      = quals.filter(r=>r.nonDisplacing).length;

      ctx.innerHTML = `<div class="context-title-block">
        <strong>${esc(qv.ewcGroup)} Championships — E/W/C Qualifier List</strong>
        <span>Zones ${esc(zoneA)} &amp; ${esc(zoneB)} · Nationals direct qualifiers excluded · click an athlete for audit</span>
      </div>
      <div class="context-stats">
        <span>${quals.length} athletes</span>
        <span>${grouped.length} events</span>
        <span>${thr} threshold qualifiers</span>
        <span>${nd} non-displacing</span>
      </div>`;

      renderEWCSidebar(grouped, zoneA, zoneB);

      let html = pickerHTML + sortBarHTML(qv.ewcSort, 'ewc') + '<div class="qv-event-grid">';
      grouped.forEach(([eventKey, rows]) => {
        const cntA = rows.filter(r=>r.zone===zoneA).length;
        const cntB = rows.filter(r=>r.zone===zoneB).length;
        const extra = `Zone ${esc(zoneA)}: ${cntA} &nbsp;·&nbsp; Zone ${esc(zoneB)}: ${cntB}`;
        html += eventCardHTML(eventKey, rows, qv.ewcSort, 'ewc', extra);
      });
      html += '</div>';
      tableWrap.innerHTML = html;
    }

    attachEWCListeners(tableWrap);
  }

  function attachEWCListeners(tableWrap) {
    // Meet picker
    tableWrap.querySelectorAll('.qv-meet-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        qv.ewcGroup = btn.dataset.ewc === qv.ewcGroup ? null : btn.dataset.ewc;
        qv.expanded.clear();
        renderEWCView();
      })
    );
    // Sort
    tableWrap.querySelectorAll('.qv-sort-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        qv.ewcSort = btn.dataset.sort;
        renderEWCView();
      })
    );
    // Card expand/collapse
    tableWrap.querySelectorAll('.qv-event-header[data-anchor]').forEach(btn =>
      btn.addEventListener('click', () => toggleCard(btn.dataset.anchor, renderEWCView))
    );
    // Row audit click
    tableWrap.querySelectorAll('tr[data-athlete-key]').forEach(tr =>
      tr.addEventListener('click', () => {
        const r = _rowByKey.get(tr.dataset.athleteKey);
        if (r) showAudit(r, 'ewc');
      })
    );
  }

  function renderEWCSidebar(grouped, zoneA, zoneB) {
    const el_ = $('eventList');
    if (!el_) return;
    el_.innerHTML = grouped.map(([eventKey, rows]) => {
      const anchorId = `qv-ewc-${eventKey.replace(/\W+/g,'-')}`;
      const isOpen   = qv.expanded.has(anchorId);
      return `<button class="event-item${isOpen?' active':''}" data-sidebar-anchor="${esc(anchorId)}">
        <span class="event-item-name">${esc(eventKey)}</span>
        <span class="event-item-meta">${rows.length} qual</span>
      </button>`;
    }).join('');
    el_.querySelectorAll('[data-sidebar-anchor]').forEach(btn =>
      btn.addEventListener('click', () => {
        const anchor = btn.dataset.sidebarAnchor;
        // Expand if not open, then scroll
        if (!qv.expanded.has(anchor)) {
          qv.expanded.add(anchor);
          renderEWCView();
        }
        setTimeout(() => {
          document.getElementById(anchor)?.scrollIntoView({ behavior:'smooth', block:'start' });
        }, 50);
      })
    );
  }

  /* ── Nationals View ────────────────────────────────────────── */
  function renderNationalsView() {
    const tableWrap = $('tableWrap');
    const ctx       = $('resultsContext');
    if (!tableWrap) return;

    rebuildRowIndex();

    const quals   = nationalQualifiers();
    const grouped = groupByEventKey(quals);
    const direct  = quals.filter(r=>r.juniorNationalStatus==='Direct').length;
    const repl    = quals.filter(r=>r.juniorNationalStatus==='Replacement').length;
    const fromEWC = quals.filter(r=>r.stage==='EWC'||r.stage==='East/West/Central').length;
    const nd      = quals.filter(r=>r.nonDisplacing).length;

    ctx.innerHTML = `<div class="context-title-block">
      <strong>Junior Nationals — Running Qualifier List</strong>
      <span>${quals.length} total qualifiers · ${grouped.length} events · click an athlete to audit · updates as E/W/C loads</span>
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

    let html = sortBarHTML(qv.natSort, 'nat') + '<div class="qv-event-grid">';
    grouped.forEach(([eventKey, rows]) => {
      const directCnt = rows.filter(r=>r.juniorNationalStatus==='Direct').length;
      const replCnt   = rows.filter(r=>r.juniorNationalStatus==='Replacement').length;
      const extra = `${directCnt} direct · ${replCnt} replacement`;
      html += eventCardHTML(eventKey, rows, qv.natSort, 'nat', extra);
    });
    html += '</div>';
    tableWrap.innerHTML = html;

    attachNatListeners(tableWrap);
  }

  function attachNatListeners(tableWrap) {
    tableWrap.querySelectorAll('.qv-sort-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        qv.natSort = btn.dataset.sort;
        renderNationalsView();
      })
    );
    tableWrap.querySelectorAll('.qv-event-header[data-anchor]').forEach(btn =>
      btn.addEventListener('click', () => toggleCard(btn.dataset.anchor, renderNationalsView))
    );
    tableWrap.querySelectorAll('tr[data-athlete-key]').forEach(tr =>
      tr.addEventListener('click', () => {
        const r = _rowByKey.get(tr.dataset.athleteKey);
        if (r) showAudit(r, 'nationals');
      })
    );
  }

  function renderNatSidebar(grouped) {
    const el_ = $('eventList');
    if (!el_) return;
    el_.innerHTML = grouped.map(([eventKey, rows]) => {
      const anchorId = `qv-nat-${eventKey.replace(/\W+/g,'-')}`;
      const isOpen   = qv.expanded.has(anchorId);
      const direct   = rows.filter(r=>r.juniorNationalStatus==='Direct'||r.juniorNationalStatus==='Replacement').length;
      return `<button class="event-item${isOpen?' active':''}" data-sidebar-anchor="${esc(anchorId)}">
        <span class="event-item-name">${esc(eventKey)}</span>
        <span class="event-item-meta">${rows.length} qual · ${direct} direct</span>
      </button>`;
    }).join('');
    el_.querySelectorAll('[data-sidebar-anchor]').forEach(btn =>
      btn.addEventListener('click', () => {
        const anchor = btn.dataset.sidebarAnchor;
        if (!qv.expanded.has(anchor)) {
          qv.expanded.add(anchor);
          renderNationalsView();
        }
        setTimeout(() => {
          document.getElementById(anchor)?.scrollIntoView({ behavior:'smooth', block:'start' });
        }, 50);
      })
    );
  }

  /* ── Card toggle ───────────────────────────────────────────── */
  function toggleCard(anchorId, rerender) {
    if (qv.expanded.has(anchorId)) qv.expanded.delete(anchorId);
    else qv.expanded.add(anchorId);
    rerender();
  }

  /* ── CSS ───────────────────────────────────────────────────── */
  function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
/* ── Meet picker ──────────────────────────────────────────────── */
.qv-meet-picker {
  display:flex; gap:12px; padding:16px 16px 0; flex-wrap:wrap;
}
.qv-meet-btn {
  display:flex; flex-direction:column; align-items:flex-start;
  padding:14px 20px; border-radius:var(--radius-md,6px);
  border:2px solid var(--line,#e2e6ea); background:var(--surface,#fff);
  cursor:pointer; transition:all .15s; min-width:160px;
  box-shadow:var(--sh-xs,0 1px 3px rgba(0,0,0,.06));
}
.qv-meet-btn:hover { border-color:var(--accent,#1a5fff); box-shadow:0 2px 8px rgba(26,95,255,.12); }
.qv-meet-btn.active { border-color:var(--accent,#1a5fff); background:rgba(26,95,255,.06); }
.qv-meet-label { font-weight:700; font-size:.95rem; color:var(--text,#0d1724); }
.qv-meet-count { font-size:.78rem; color:var(--text-muted,#6b7a90); margin-top:3px; }

/* ── Sort bar ─────────────────────────────────────────────────── */
.qv-sort-bar {
  display:flex; align-items:center; gap:6px;
  padding:12px 16px 0; flex-wrap:wrap;
}
.qv-sort-label { font-size:.78rem; color:var(--text-muted,#6b7a90); font-weight:600; margin-right:2px; }
.qv-sort-btn {
  padding:4px 10px; border-radius:14px; font-size:.78rem; font-weight:600;
  border:1px solid var(--line,#e2e6ea); background:var(--surface,#fff);
  color:var(--text-muted,#6b7a90); cursor:pointer; transition:all .12s;
}
.qv-sort-btn:hover { border-color:var(--accent,#1a5fff); color:var(--accent,#1a5fff); }
.qv-sort-btn.active { background:var(--accent,#1a5fff); color:#fff; border-color:var(--accent,#1a5fff); }

/* ── Event grid ───────────────────────────────────────────────── */
.qv-event-grid { display:flex; flex-direction:column; gap:8px; padding:12px 16px 16px; }
.qv-event-card {
  border:1px solid var(--line,#e2e6ea); border-radius:var(--radius-md,6px);
  background:var(--surface,#fff); overflow:hidden;
  box-shadow:var(--sh-xs,0 1px 3px rgba(0,0,0,.06));
}
.qv-event-card.qv-open { border-color:var(--accent,#1a5fff); box-shadow:0 2px 8px rgba(26,95,255,.1); }

.qv-event-header {
  display:flex; align-items:center; gap:8px; width:100%;
  padding:10px 14px; text-align:left; cursor:pointer;
  background:var(--surface-raised,#f7f9fb);
  border:none; border-bottom:1px solid transparent;
  transition:background .12s;
}
.qv-event-card.qv-open .qv-event-header { border-bottom-color:var(--line,#e2e6ea); }
.qv-event-header:hover { background:rgba(26,95,255,.04); }
.qv-chevron { font-size:.8rem; color:var(--text-muted,#6b7a90); width:14px; flex-shrink:0; }
.qv-event-name  { font-weight:700; font-size:.88rem; color:var(--text,#0d1724); flex:1; text-align:left; }
.qv-event-zones { font-size:.75rem; color:var(--text-muted,#6b7a90); white-space:nowrap; }
.qv-event-count {
  font-size:.73rem; color:var(--text-muted,#6b7a90);
  background:var(--line,#e2e6ea); padding:2px 7px; border-radius:10px; white-space:nowrap;
}
.qv-card-body { overflow:hidden; }
.qv-hidden { display:none; }

/* ── Table ────────────────────────────────────────────────────── */
.qv-table { width:100%; border-collapse:collapse; font-size:.83rem; }
.qv-table th {
  padding:6px 10px; text-align:left;
  background:var(--surface-raised,#f7f9fb); color:var(--text-muted,#6b7a90);
  font-weight:600; border-bottom:1px solid var(--line,#e2e6ea);
  font-size:.73rem; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap;
}
.qv-table td { padding:7px 10px; border-bottom:1px solid var(--line,#e2e6ea); vertical-align:middle; }
.qv-table tr:last-child td { border-bottom:none; }
.qv-table tr[data-athlete-key]:hover td { background:rgba(26,95,255,.05); cursor:pointer; }
.qv-row-alt td { background:rgba(0,0,0,.012); }
.qv-row-nd { opacity:.55; }
.qv-athlete { font-weight:600; color:var(--text,#0d1724); }
.qv-team    { color:var(--text-muted,#6b7a90); font-size:.8rem; }
.qv-score   { font-family:var(--font-mono,'JetBrains Mono',monospace); text-align:right; font-weight:500; }
.qv-score-col { text-align:right; }
.qv-place   { font-family:var(--font-mono,'JetBrains Mono',monospace); color:var(--text-muted,#6b7a90); width:36px; }
.qv-zone    { color:var(--text-muted,#6b7a90); font-size:.8rem; }

/* ── Zone / stage pills ───────────────────────────────────────── */
.qv-zone-pill {
  display:inline-block; padding:2px 8px; border-radius:10px;
  font-size:.72rem; font-weight:700;
}
.zone-A,.zone-C,.zone-E { background:rgba(26,95,255,.1);  color:var(--accent,#1a5fff); }
.zone-B,.zone-D,.zone-F { background:rgba(14,165,100,.1); color:#0a8f55; }
.qv-stage-pill { display:inline-block; padding:2px 7px; border-radius:10px; font-size:.72rem; font-weight:600; }
.qv-stage-zones { background:rgba(26,95,255,.1); color:var(--accent,#1a5fff); }
.qv-stage-ewc,.qv-stage-eastwestcentral { background:rgba(14,165,100,.1); color:#0a8f55; }

/* ── Badges ───────────────────────────────────────────────────── */
.qv-badge {
  display:inline-block; padding:2px 6px; border-radius:10px;
  font-size:.7rem; font-weight:700; margin-left:4px; vertical-align:middle;
}
.qv-direct { background:rgba(14,165,100,.12); color:#0a8f55; }
.qv-repl   { background:rgba(245,158,11,.14); color:#b26a00; }
.qv-pool   { background:rgba(245,158,11,.07); color:#b26a00; border:1px solid rgba(245,158,11,.25); }
.qv-ewc    { background:rgba(26,95,255,.1);   color:var(--accent,#1a5fff); }
.qv-thr    { background:rgba(139,92,246,.1);  color:#6d28d9; }
.qv-nd     { background:rgba(107,114,128,.1); color:#4b5563; }

/* ── Context stats bar ────────────────────────────────────────── */
.context-stats {
  display:flex; gap:16px; padding:4px 0 0;
  font-size:.8rem; color:var(--text-muted,#6b7a90); flex-wrap:wrap;
}
.context-stats span { white-space:nowrap; }
.cs-accent-green { color:#0a8f55; font-weight:600; }

.qv-empty { padding:48px 24px; text-align:center; }
.qv-empty-title { font-size:1.1rem; font-weight:700; color:var(--text,#0d1724); margin-bottom:8px; }
.qv-empty-sub   { color:var(--text-muted,#6b7a90); font-size:.88rem; }

/* ── Audit overlay + popup ────────────────────────────────────── */
.qv-audit-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:9998;
  animation:qv-fadein .15s ease;
}
@keyframes qv-fadein { from{opacity:0} to{opacity:1} }

.qv-audit {
  position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
  width:min(560px, 96vw); max-height:80vh;
  background:var(--surface,#fff); border-radius:var(--radius-lg,10px);
  box-shadow:0 20px 60px rgba(0,0,0,.25); z-index:9999;
  display:flex; flex-direction:column; overflow:hidden;
  animation:qv-popin .18s cubic-bezier(.34,1.56,.64,1);
}
@keyframes qv-popin { from{opacity:0;transform:translate(-50%,-48%) scale(.96)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }

.audit-header {
  padding:16px 20px 14px;
  background:var(--navy,#0d1724);
  color:#fff; position:relative; flex-shrink:0;
}
.audit-name { font-size:1.05rem; font-weight:800; letter-spacing:.01em; }
.audit-sub  { font-size:.8rem; opacity:.7; margin-top:3px; }
.audit-close {
  position:absolute; top:14px; right:16px;
  background:rgba(255,255,255,.15); border:none; color:#fff;
  width:28px; height:28px; border-radius:50%; cursor:pointer;
  font-size:.85rem; display:flex; align-items:center; justify-content:center;
  transition:background .12s;
}
.audit-close:hover { background:rgba(255,255,255,.3); }

.audit-body { padding:20px; overflow-y:auto; flex:1; }
.audit-section-title {
  font-size:.72rem; font-weight:700; text-transform:uppercase;
  letter-spacing:.06em; color:var(--text-muted,#6b7a90); margin-bottom:12px;
}

/* Timeline */
.audit-timeline { display:flex; flex-direction:column; gap:8px; }
.tl-item {
  display:flex; gap:10px; align-items:flex-start;
  padding:8px 12px; border-radius:6px; background:var(--surface-raised,#f7f9fb);
  border:1px solid var(--line,#e2e6ea); font-size:.84rem;
}
.tl-icon { font-size:1rem; flex-shrink:0; line-height:1.4; }
.tl-text { line-height:1.5; color:var(--text,#0d1724); }
.tl-good  { background:rgba(14,165,100,.06);  border-color:rgba(14,165,100,.2); }
.tl-bad   { background:rgba(220,38,38,.05);   border-color:rgba(220,38,38,.15); }
.tl-warn  { background:rgba(245,158,11,.07);  border-color:rgba(245,158,11,.2); }
.tl-flag  { background:rgba(139,92,246,.06);  border-color:rgba(139,92,246,.15); }
.tl-override { background:rgba(26,95,255,.06); border-color:rgba(26,95,255,.2); }
.tl-yes { color:#0a8f55; font-weight:700; }
.tl-no  { color:#dc2626; font-weight:700; }

/* Move section */
.audit-move-section {
  margin-top:16px; padding:14px 16px;
  border-radius:8px; border:1px solid var(--line,#e2e6ea);
  background:var(--surface-raised,#f7f9fb);
}
.audit-move-info { border-color:rgba(107,114,128,.2); background:rgba(107,114,128,.04); }
.audit-move-title { font-size:.75rem; font-weight:700; text-transform:uppercase;
  letter-spacing:.05em; color:var(--text-muted,#6b7a90); margin-bottom:6px; }
.audit-move-desc { font-size:.83rem; color:var(--text,#0d1724); line-height:1.5; margin:0 0 10px; }
.audit-move-btn {
  padding:7px 14px; border-radius:6px;
  background:var(--accent,#1a5fff); color:#fff; border:none;
  font-size:.82rem; font-weight:700; cursor:pointer; transition:opacity .12s;
}
.audit-move-btn:hover { opacity:.85; }
`;
    document.head.appendChild(s);
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
      document.getElementById('stageNav')?.querySelectorAll('.stage-btn').forEach(btn =>
        btn.addEventListener('click', () => {
          if (btn.dataset.stage !== 'EWC') qv.ewcGroup = null;
          qv.expanded.clear();
          closeAudit();
        }, { capture: true })
      );
    };

    // Close audit on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAudit();
    });

    console.log('[qualifier-views v3] patched');
  }

  waitForMain(patchMain);
})();
