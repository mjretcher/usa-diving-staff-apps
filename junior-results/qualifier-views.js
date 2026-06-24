/* ================================================================
   qualifier-views.js  v4
   Complete rewrite — Zones qualifier origin view, E/W/C meet/event
   toggle, athlete detail slide-in panel with full trail, registration
   status overlay, prelims/finals format awareness.
   ================================================================ */
(function () {
  'use strict';

  /* ── helpers ───────────────────────────────────────────────── */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function $(id) { return document.getElementById(id); }
  function norm(v) {
    return String(v||'').toLowerCase().normalize('NFKD')
      .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function initials(name) {
    return String(name||'').split(' ').filter(Boolean)
      .map(w=>w[0].toUpperCase()).slice(0,2).join('');
  }
  function fmtScore(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : '—';
  }
  function dmLink(id, name) {
    if (!id) return '';
    const url = `https://www.divemeets.com/profile.php?id=${id}`;
    return `<a href="${esc(url)}" target="_blank" rel="noopener" class="dm-ext-link" aria-label="DiveMeets profile for ${esc(name)}">
      <i class="ti ti-external-link" aria-hidden="true"></i> DiveMeets
    </a>`;
  }

  /* ── Nat qualifier lookup from uploaded data ───────────────── */
  const NAT = window.USAD_JO_NAT_QUALIFIERS || null;

  function isNatQualified(diveMeetsId, eventKey) {
    if (!NAT || !diveMeetsId) return false;
    const id = String(diveMeetsId).trim();
    const athlete = NAT.qualifiers.find(q => q.diveMeetsId === id);
    if (!athlete) return false;
    if (!eventKey) return true;
    const ek = norm(eventKey);
    return athlete.qualifiedEventKeys.some(qek => norm(qek) === ek);
  }

  function natQualEvents(diveMeetsId) {
    if (!NAT || !diveMeetsId) return [];
    const id = String(diveMeetsId).trim();
    const athlete = NAT.qualifiers.find(q => q.diveMeetsId === id);
    return athlete ? athlete.qualifiedEvents : [];
  }

  function isForeignEWC(name) {
    if (!NAT) return null;
    const n = norm(name);
    return NAT.foreignEWC.find(f => norm(f.name) === n) || null;
  }

  function isEWCAlreadyNatQual(name) {
    if (!NAT) return [];
    const n = norm(name);
    for (const [athlete, evts] of Object.entries(NAT.ewcAlreadyNatQual || {})) {
      if (norm(athlete) === n) return evts;
    }
    return [];
  }

  function isHPSPrequal(name, gender) {
    if (!NAT) return null;
    const n = norm(name);
    const list = gender === 'F' || gender === 'Girls'
      ? (NAT.hpsPrequalFemale || [])
      : (NAT.hpsPrequalMale   || []);
    return list.find(h => norm(h.name) === n) || null;
  }

  /* ── Overrides sync helpers ────────────────────────────────── */
  function getConfirmedAttending(diveMeetsId) {
    const key = `hpsAttend:${diveMeetsId}`;
    try { return localStorage.getItem(key) === 'true'; } catch { return false; }
  }
  function setConfirmedAttending(diveMeetsId, val) {
    const key = `hpsAttend:${diveMeetsId}`;
    try { localStorage.setItem(key, String(val)); } catch {}
  }

  /* ── Module state ──────────────────────────────────────────── */
  const qv = {
    ewcGroup:    null,
    ewcMode:     'meet',    // 'meet' | 'event'
    zoneMode:    'results', // 'results' | 'origin'
    ewcSort:     'elig',
    zoneSort:    'elig',
    natSort:     'event',
    expanded:    new Set(),
    panelRow:    null,
    panelStage:  null,
  };

  const EWC_GROUPS = ['East', 'Central', 'West'];
  const EWC_ZONES  = { East:['A','B'], Central:['C','D'], West:['E','F'] };

  /* ── Wait for main.js ──────────────────────────────────────── */
  function waitForMain(cb, tries) {
    tries = tries||0;
    if (typeof renderAll === 'function' && typeof state !== 'undefined') cb();
    else if (tries < 100) setTimeout(()=>waitForMain(cb,tries+1), 50);
  }

  /* ── Data access ───────────────────────────────────────────── */
  function allResults() {
    return (typeof effectiveResults !== 'undefined') ? effectiveResults
      : (window.JUNIOR_RESULTS_DATA?.results || []);
  }

  function ewcQualifiers(group) {
    const zones = EWC_ZONES[group] || [];
    return allResults().filter(r =>
      r.stage === 'Zones' && (r.advancesToEWC || r.advancesToNationals) && zones.includes(r.zone)
    );
  }

  function nationalQualifiers() {
    return allResults().filter(r => r.advancesToNationals);
  }

  function zoneResultRows() {
    return allResults().filter(r => r.stage === 'Zones');
  }

  /* Enrich a row with nat qualifier status */
  function enrichRow(r) {
    r._natQualifiedHere = isNatQualified(r.diveMeetsId, r.eventKey);
    r._natQualAllEvents = natQualEvents(r.diveMeetsId);
    r._foreignEWC = isForeignEWC(r.athlete);
    r._ewcAlreadyNat = isEWCAlreadyNatQual(r.athlete);
    r._hpsPrequal = isHPSPrequal(r.athlete, r.gender);
    r._nonDispAtEWC = Boolean(r._foreignEWC || (r._ewcAlreadyNat && r._ewcAlreadyNat.length > 0) || r.nonDisplacing);
    return r;
  }

  /* Find Regional origin for a Zone athlete */
  function regionalOrigin(r) {
    if (!r.diveMeetsId && !r.athlete) return null;
    const regRows = allResults().filter(row =>
      row.stage === 'Regionals' &&
      norm(row.eventKey) === norm(r.eventKey) &&
      (row.diveMeetsId && row.diveMeetsId === r.diveMeetsId ||
       norm(row.athlete) === norm(r.athlete))
    );
    return regRows.length ? regRows[0] : null;
  }

  /* ── Sort ──────────────────────────────────────────────────── */
  function sortRows(rows, sortId) {
    const r = [...rows];
    switch (sortId) {
      case 'elig':    return r.sort((a,b)=>(a.eligibleRank||9999)-(b.eligibleRank||9999));
      case 'score':   return r.sort((a,b)=>(b.score??-1)-(a.score??-1));
      case 'zone':    return r.sort((a,b)=>String(a.zone||'').localeCompare(b.zone||'')||(a.placeNumber||99)-(b.placeNumber||99));
      case 'name':    return r.sort((a,b)=>String(a.athlete||'').localeCompare(b.athlete||''));
      case 'event':   return r.sort((a,b)=>String(a.eventKey||'').localeCompare(b.eventKey||'')||(a.eligibleRank||9999)-(b.eligibleRank||9999));
      default:        return r;
    }
  }

  function groupByEvent(rows) {
    const map = new Map();
    rows.forEach(r => {
      const k = r.eventKey || r.eventName || '?';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    const ord = {A:0,B:1,C:2,D:3};
    const gord = {Girls:0,Boys:1};
    const dord = {'1M':0,'3M':1,'Platform':2};
    return [...map.entries()].sort(([,ra],[,rb]) => {
      const a=ra[0],b=rb[0];
      const ag=(a.ageGroup||'').match(/Group ([A-D])/)?.[1];
      const bg=(b.ageGroup||'').match(/Group ([A-D])/)?.[1];
      return ((ord[ag]??9)-(ord[bg]??9))
           ||((gord[a.gender]??9)-(gord[b.gender]??9))
           ||((dord[a.discipline]??9)-(dord[b.discipline]??9));
    });
  }

  /* ── Status badges ─────────────────────────────────────────── */
  function qualBadge(r) {
    const s = (r.qualificationStatus||'').toLowerCase();
    if (s.includes('nationals') && s.includes('direct')) return `<span class="qvb qvb-direct">Nationals direct</span>`;
    if (s.includes('nationals') && s.includes('replacement')) return `<span class="qvb qvb-repl">Nat'ls replacement</span>`;
    if (s.includes('e/w/c') && s.includes('avg')) return `<span class="qvb qvb-avg">E/W/C avg threshold</span>`;
    if (s.includes('e/w/c') && s.includes('ymca')) return `<span class="qvb qvb-ymca">E/W/C YMCA</span>`;
    if (s.includes('e/w/c')) return `<span class="qvb qvb-ewc">E/W/C place ${r.eligibleRank||''}</span>`;
    if (s.includes('top 15')) return `<span class="qvb qvb-zone">Zone top 15</span>`;
    if (s.includes('avg threshold')) return `<span class="qvb qvb-avg">Avg threshold</span>`;
    if (r.nonDisplacing) return `<span class="qvb qvb-nd">Non-displacing</span>`;
    return `<span class="qvb qvb-out">Does not advance</span>`;
  }

  function destBadge(r) {
    if (r.advancesToNationals) return `<span class="qvb qvb-direct">Nationals</span>`;
    if (r.advancesToEWC) {
      const ewc = r.ewc || (EWC_ZONES.East.includes(r.zone)?'East':EWC_ZONES.Central.includes(r.zone)?'Central':'West');
      return `<span class="qvb qvb-ewc">${esc(ewc)}</span>`;
    }
    if (r.nonDisplacing) return `<span class="qvb qvb-nd">Non-displacing</span>`;
    return `<span class="qvb qvb-out">—</span>`;
  }

  function flagBadges(r) {
    const b = [];
    if (r.foreignDeclared || r._foreignEWC) b.push(`<span class="qvb qvb-foreign">Foreign</span>`);
    if (r.hps) b.push(`<span class="qvb qvb-hps">HPS</span>`);
    if (r.ymca) b.push(`<span class="qvb qvb-ymca">YMCA</span>`);
    if (r.dualDeclared) b.push(`<span class="qvb qvb-dual">${r.dualOtherCountry?'Dual effect':'Dual'}</span>`);
    if (r._ewcAlreadyNat?.length) b.push(`<span class="qvb qvb-nat">Already Nat's qual</span>`);
    if (r.declaredNotAttending) b.push(`<span class="qvb qvb-dna">Not attending</span>`);
    if (r.bumpIn) b.push(`<span class="qvb qvb-bump">Bump in</span>`);
    return b.join('');
  }

  function regStatus(r) {
    if (!NAT) return '';
    const qualified = isNatQualified(r.diveMeetsId, r.eventKey);
    if (!qualified) return `<span class="reg-dot reg-none" title="Not in official qualifier list">—</span>`;
    const confirmed = getConfirmedAttending(r.diveMeetsId);
    return confirmed
      ? `<i class="ti ti-check reg-yes" title="Confirmed attending"></i>`
      : `<i class="ti ti-help reg-pend" title="Qualified — attendance unconfirmed"></i>`;
  }

  /* ── Athlete detail panel ──────────────────────────────────── */
  function openPanel(row, stage) {
    enrichRow(row);
    qv.panelRow   = row;
    qv.panelStage = stage;
    renderPanel();
    const p = $('qv-panel');
    if (p) p.classList.add('open');
  }

  function closePanel() {
    const p = $('qv-panel');
    if (p) p.classList.remove('open');
    qv.panelRow = null;
  }

  function renderPanel() {
    const panel = $('qv-panel-body');
    if (!panel || !qv.panelRow) return;
    const r = qv.panelRow;
    const dm = String(r.diveMeetsId || '').trim();
    const ini = initials(r.athlete);
    const natEvts = natQualEvents(dm);
    const hpsConfirmed = getConfirmedAttending(dm);
    const isHPS = r.hps || Boolean(r._hpsPrequal);
    const isNonDisp = r.nonDisplacing || Boolean(r._foreignEWC) || Boolean(r._ewcAlreadyNat?.length);

    // Regional origin
    const regRow = regionalOrigin(r);

    panel.innerHTML = `
      <div class="panel-ath-header">
        <div class="panel-avatar">${esc(ini)}</div>
        <div class="panel-ath-info">
          <div class="panel-ath-name">${esc(r.athlete)}</div>
          <div class="panel-ath-meta">${esc(r.team||'')}</div>
          ${dm ? `<div class="panel-ath-meta" style="font-family:var(--font-mono);font-size:11px">ID ${esc(dm)}</div>` : '<div class="panel-ath-meta" style="color:#c0392b">No DiveMeets ID</div>'}
        </div>
      </div>

      ${dm ? `<a class="dm-full-btn" href="https://www.divemeets.com/profile.php?id=${esc(dm)}" target="_blank" rel="noopener">
        <i class="ti ti-external-link" aria-hidden="true"></i>
        View on DiveMeets — ${esc(r.athlete)}
      </a>` : ''}

      <div class="panel-flags">${flagBadges(r)}</div>

      ${natEvts.length ? `
        <div class="panel-section">
          <div class="panel-section-label">Qualified to Junior Nationals</div>
          <div class="panel-nat-events">${natEvts.map(e=>`<span class="qvb qvb-direct">${esc(e)}</span>`).join('')}</div>
        </div>` : ''}

      <div class="panel-section">
        <div class="panel-section-label">Qualification trail</div>

        ${regRow ? `
          <div class="trail-card">
            <div class="trail-stage-label">Regionals — ${esc(regRow.meetName||'')}</div>
            <div class="trail-stats">
              <div class="trail-stat"><div class="trail-val">${esc(regRow.place||'—')}</div><div class="trail-lbl">Place</div></div>
              <div class="trail-stat"><div class="trail-val">${fmtScore(regRow.score)}</div><div class="trail-lbl">Score</div></div>
              <div class="trail-stat"><div class="trail-val">${esc(String(regRow.countingRank||'—'))}</div><div class="trail-lbl">Counting rank</div></div>
              <div class="trail-stat"><div class="trail-val">${esc(regRow.zone ? 'Zone '+regRow.zone : '—')}</div><div class="trail-lbl">Zone</div></div>
            </div>
            <div class="trail-reason ${regRow.advancesToZone?'good':''}">${esc(regRow.qualificationStatus||'')}</div>
          </div>
          <div class="trail-connector"><i class="ti ti-arrow-down" aria-hidden="true"></i></div>` : ''}

        <div class="trail-card">
          <div class="trail-stage-label">Zone ${esc(r.zone||'')} — ${esc(r.meetName||'')}</div>
          <div class="trail-stats">
            <div class="trail-stat"><div class="trail-val">${esc(r.place||'—')}</div><div class="trail-lbl">Place</div></div>
            <div class="trail-stat"><div class="trail-val">${fmtScore(r.score)}</div><div class="trail-lbl">Score</div></div>
            <div class="trail-stat"><div class="trail-val">${esc(String(r.eligibleRank||'—'))}</div><div class="trail-lbl">Elig. rank</div></div>
            <div class="trail-stat"><div class="trail-val">${esc(r.ewc||ZONE_TO_EWC?.[r.zone]||'—')}</div><div class="trail-lbl">E/W/C group</div></div>
          </div>
          ${r.officialThresholdScore ? `<div class="trail-threshold">Avg threshold: ${fmtScore(r.officialThresholdScore)} ${r.score>=r.officialThresholdScore?'<span class="thr-met">✓ met</span>':'<span class="thr-miss">✗ not met</span>'}</div>` : ''}
          <div class="trail-reason ${r.advancesToNationals?'good':r.advancesToEWC?'ewc':r.nonDisplacing?'nd':''}">${esc(r.qualificationStatus||'')}</div>
          ${isNonDisp ? `<div class="trail-nd-note">${r._foreignEWC?'Foreign — competes non-displacing, does not consume a spot':r._ewcAlreadyNat?.length?'Already qualified to Nationals — competes non-displacing at E/W/C':r.nonDisplacingReason||'Non-displacing'}</div>` : ''}
        </div>

        <div class="trail-connector"><i class="ti ti-arrow-down" aria-hidden="true"></i></div>
        <div class="trail-card trail-dest ${r.advancesToNationals?'dest-nat':r.advancesToEWC?'dest-ewc':'dest-none'}">
          <div class="trail-stage-label">Destination</div>
          <div class="trail-dest-label">${
            r.advancesToNationals ? '🏆 Junior National Championship'
            : r.advancesToEWC ? `⚡ ${r.ewc||''} Championships (E/W/C)`
            : isNonDisp ? '👻 Competes non-displacing'
            : '✗ Does not advance'
          }</div>
          ${r.advancesToEWC && !r.advancesToNationals ? `<div style="font-size:11px;margin-top:6px;opacity:0.8">E/W/C prelims → finals → Junior Nationals qualifiers</div>` : ''}
        </div>
      </div>

      ${isHPS ? `
        <div class="panel-section">
          <div class="panel-section-label">HPS / attendance</div>
          <div class="panel-hps-note">HPS athletes may compete but do not consume a qualifying spot. Toggle confirmed attendance below.</div>
          <div class="hps-toggle" id="qv-hps-toggle" data-dm="${esc(dm)}" onclick="window._qvToggleHPS('${esc(dm)}')">
            <div class="hps-pill ${hpsConfirmed?'on':''}" id="qv-hps-pill"><div class="hps-pip"></div></div>
            <span class="hps-lbl">${hpsConfirmed?'Confirmed attending':'Attendance unconfirmed'}</span>
          </div>
        </div>` : ''}

      ${r.bumpedBy?.length ? `
        <div class="panel-section">
          <div class="panel-section-label">Bumped in by</div>
          ${r.bumpedBy.map(b=>`<div class="trail-nd-note">↑ ${esc(b.athlete)} (${esc(b.reason||'non-displacing')})</div>`).join('')}
        </div>` : ''}

      ${r.openedFor?.length ? `
        <div class="panel-section">
          <div class="panel-section-label">Opened spot for</div>
          ${r.openedFor.map(b=>`<div class="trail-nd-note">↓ ${esc(b.athlete)}</div>`).join('')}
        </div>` : ''}

      ${r.overrideNotes?.length ? `
        <div class="panel-section">
          <div class="panel-section-label">Active overrides</div>
          ${r.overrideNotes.map(n=>`<div class="trail-nd-note">✎ ${esc(n)}</div>`).join('')}
        </div>` : ''}

      <div class="panel-section">
        <div class="panel-section-label">Quick override</div>
        <div class="panel-override-row">
          <button class="panel-act-btn" onclick="window._qvOverride('${esc(dm)}','${esc(r.athlete)}','foreign','${!r.foreignDeclared}')">
            ${r.foreignDeclared ? 'Remove foreign flag' : 'Mark as foreign'}
          </button>
          <button class="panel-act-btn" onclick="window._qvOverride('${esc(dm)}','${esc(r.athlete)}','notAttending','${!r.declaredNotAttending}')">
            ${r.declaredNotAttending ? 'Mark attending' : 'Not attending'}
          </button>
          <button class="panel-act-btn" onclick="window._qvOverride('${esc(dm)}','${esc(r.athlete)}','hps','${!r.hps}')">
            ${r.hps ? 'Remove HPS' : 'Mark as HPS'}
          </button>
        </div>
      </div>`;
  }

  window._qvToggleHPS = function(dm) {
    const current = getConfirmedAttending(dm);
    setConfirmedAttending(dm, !current);
    renderPanel();
  };

  window._qvOverride = function(dm, name, type, val) {
    if (typeof addOverride === 'function') {
      addOverride({ type, value: val === 'true', athleteId: dm, athleteName: name, note: 'Panel quick override' });
    }
  };

  const ZONE_TO_EWC = { A:'East', B:'East', C:'Central', D:'Central', E:'West', F:'West' };

  /* ── Zones View ────────────────────────────────────────────── */
  function renderZonesView() {
    const tableWrap = $('tableWrap');
    const ctx       = $('resultsContext');
    if (!tableWrap) return;

    const mode = qv.zoneMode;

    // Update event list with mode toggle
    renderZonesSidebar();

    // Context bar
    const rows = allResults().filter(r => r.stage === 'Zones');
    const advancing = rows.filter(r => r.advancesToNationals || r.advancesToEWC).length;
    const nd        = rows.filter(r => r.nonDisplacing).length;
    const nat       = rows.filter(r => r.advancesToNationals).length;
    const ewcCount  = rows.filter(r => r.advancesToEWC && !r.advancesToNationals).length;

    if (ctx) ctx.innerHTML = `
      <div class="context-title-block">
        <strong>Zone Championships — ${mode==='origin'?'Qualifier origin view':'Event results'}</strong>
        <span>${rows.length} results · ${advancing} advancing</span>
      </div>
      <div class="context-stat"><strong>${nat}</strong> → Nationals direct</div>
      <div class="context-stat"><strong>${ewcCount}</strong> → E/W/C</div>
      <div class="context-stat"><strong>${nd}</strong> non-displacing</div>`;

    if (mode === 'results') {
      renderZonesResultsView(tableWrap);
    } else {
      renderZonesOriginView(tableWrap);
    }
  }

  function renderZonesSidebar() {
    const el = $('eventList');
    if (!el) return;
    el.innerHTML = `
      <div class="qv-mode-toggle-sidebar">
        <button class="qv-mode-btn ${qv.zoneMode==='results'?'active':''}" onclick="window._qvSetZoneMode('results')">Event results</button>
        <button class="qv-mode-btn ${qv.zoneMode==='origin'?'active':''}" onclick="window._qvSetZoneMode('origin')">Qualifier origin</button>
      </div>`;
  }

  window._qvSetZoneMode = function(mode) {
    qv.zoneMode = mode;
    renderZonesView();
  };

  function renderZonesResultsView(wrap) {
    // Get filtered rows from main.js state
    const stageRows = (typeof filteredRows === 'function')
      ? filteredRows({ ignoreEvent: false })
      : allResults().filter(r => r.stage === 'Zones');

    if (!stageRows.length) {
      wrap.innerHTML = `<div class="qv-empty"><div class="qv-empty-title">No Zone results</div><div class="qv-empty-sub">Adjust filters above.</div></div>`;
      return;
    }

    const sorted = sortRows(stageRows, qv.zoneSort);
    const isEligView = true;

    wrap.innerHTML = `
      ${sortBarHTML(qv.zoneSort,'zone',['elig','score','zone','name','event'])}
      <table class="qv-table">
        <thead><tr>
          <th style="width:36px">Elig.</th>
          <th>Athlete</th>
          <th>Team</th>
          <th style="width:42px">Zone</th>
          <th>Score</th>
          <th>Status</th>
          <th>Flags</th>
          <th style="width:36px">Nat's</th>
        </tr></thead>
        <tbody>${sorted.map(r => {
          enrichRow(r);
          const nd = r.nonDisplacing;
          return `<tr class="${nd?'qv-row-nd':''}" data-rid="${esc(r.id)}" onclick="window._qvOpenRow('${esc(r.id)}','Zones')">
            <td class="mono">${esc(String(r.eligibleRank||r.countingRank||'—'))}</td>
            <td><div class="ath-name">${esc(r.athlete)}</div><div class="ath-id">${esc(r.diveMeetsId||'')}</div></td>
            <td class="team-col">${esc(r.team||'')}</td>
            <td><span class="zone-pill zone-${esc(r.zone)}">Z${esc(r.zone||'?')}</span></td>
            <td class="score-col">${fmtScore(r.score)}</td>
            <td>${qualBadge(r)} ${destBadge(r)}</td>
            <td>${flagBadges(r)}</td>
            <td class="reg-col">${regStatus(r)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    wireRowClicks(wrap, 'Zones');
  }

  function renderZonesOriginView(wrap) {
    const rows = allResults().filter(r => r.stage === 'Zones' && (r.advancesToNationals || r.advancesToEWC || r.nonDisplacing));
    if (!rows.length) {
      wrap.innerHTML = `<div class="qv-empty"><div class="qv-empty-title">No Zone qualifiers yet</div><div class="qv-empty-sub">Zone result data will show qualifier origins here.</div></div>`;
      return;
    }

    const sorted = sortRows(rows, qv.zoneSort);

    wrap.innerHTML = `
      ${sortBarHTML(qv.zoneSort,'zone-origin',['elig','score','zone','name','event'])}
      <table class="qv-table">
        <thead><tr>
          <th style="width:36px">Elig.</th>
          <th>Athlete</th>
          <th>Team</th>
          <th>Zone score</th>
          <th>Regional origin</th>
          <th>Qual reason</th>
          <th>Destination</th>
          <th style="width:36px">Nat's</th>
        </tr></thead>
        <tbody>${sorted.map(r => {
          enrichRow(r);
          const reg = regionalOrigin(r);
          const nd  = r.nonDisplacing;
          const origCell = reg
            ? `<div class="origin-from"><span class="zone-pill zone-${esc(reg.zone)}">R${esc(reg.region||'?')}</span> Zone ${esc(reg.zone||'?')}</div>
               <div class="origin-scores mono">${esc(reg.place||'?')} · ${fmtScore(reg.score)}</div>`
            : `<div class="origin-from" style="color:var(--color-text-tertiary)">Regional origin not found</div>`;
          return `<tr class="${nd?'qv-row-nd':''}" data-rid="${esc(r.id)}" onclick="window._qvOpenRow('${esc(r.id)}','Zones')">
            <td class="mono">${esc(String(r.eligibleRank||'—'))}</td>
            <td><div class="ath-name">${esc(r.athlete)}</div><div class="ath-id">${esc(r.diveMeetsId||'')}</div></td>
            <td class="team-col">${esc(r.team||'')}</td>
            <td class="score-col">${fmtScore(r.score)}</td>
            <td>${origCell}</td>
            <td>${qualBadge(r)}</td>
            <td>${destBadge(r)}</td>
            <td class="reg-col">${regStatus(r)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    wireRowClicks(wrap, 'Zones');
  }

  /* ── E/W/C View ────────────────────────────────────────────── */
  function renderEWCView() {
    const tableWrap = $('tableWrap');
    const ctx       = $('resultsContext');
    if (!tableWrap) return;

    // Context
    const allEwcRows = allResults().filter(r => r.stage === 'Zones' && r.advancesToEWC);
    if (ctx) ctx.innerHTML = `
      <div class="context-title-block">
        <strong>E/W/C Championships — ${qv.ewcMode==='meet'?'Browse by meet':'Browse by event'}</strong>
        <span>Prelims → Finals format · Junior Nationals qualifiers from finals</span>
      </div>
      <div class="context-stat"><strong>${allEwcRows.length}</strong> total E/W/C qualifiers</div>
      <div class="context-stat"><strong>${allEwcRows.filter(r=>r.nonDisplacing||r._nonDispAtEWC).length}</strong> non-displacing</div>`;

    renderEWCSidebar();
    renderEWCBody(tableWrap);
  }

  function renderEWCSidebar() {
    const el = $('eventList');
    if (!el) return;
    el.innerHTML = `
      <div class="qv-mode-toggle-sidebar">
        <button class="qv-mode-btn ${qv.ewcMode==='meet'?'active':''}" onclick="window._qvSetEWCMode('meet')">By meet</button>
        <button class="qv-mode-btn ${qv.ewcMode==='event'?'active':''}" onclick="window._qvSetEWCMode('event')">By event</button>
      </div>
      ${qv.ewcMode==='meet'&&qv.ewcGroup ? `
        <div style="padding:8px 12px;border-top:0.5px solid var(--color-border-tertiary)">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-tertiary);margin-bottom:6px">Events</div>
          ${groupByEvent(ewcQualifiers(qv.ewcGroup)).map(([key])=>{
            const anchorId = `qv-ewc-${key.replace(/\W+/g,'-')}`;
            return `<button class="event-item" onclick="window._qvScrollTo('${esc(anchorId)}')">
              <span class="event-item-name">${esc(key)}</span>
            </button>`;
          }).join('')}
        </div>` : ''}`;
  }

  window._qvSetEWCMode = function(mode) {
    qv.ewcMode = mode;
    qv.ewcGroup = null;
    renderEWCView();
  };
  window._qvSetEWCMode = window._qvSetEWCMode;

  window._qvScrollTo = function(id) {
    document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  };

  function renderEWCBody(wrap) {
    if (qv.ewcMode === 'meet') {
      renderEWCByMeet(wrap);
    } else {
      renderEWCByEvent(wrap);
    }
  }

  function renderEWCByMeet(wrap) {
    // Meet picker
    const pickerHTML = `<div class="qv-meet-picker">
      ${EWC_GROUPS.map(g => {
        const cnt = ewcQualifiers(g).length;
        const nd  = ewcQualifiers(g).filter(r=>r.nonDisplacing).length;
        return `<button class="qv-meet-btn ${qv.ewcGroup===g?'active':''}" onclick="window._qvSetEWCGroup('${g}')">
          <span class="qv-meet-label">${g}</span>
          <span class="qv-meet-sub">Zones ${EWC_ZONES[g].join(' & ')}</span>
          <span class="qv-meet-count">${cnt} qualifiers · ${nd} ND</span>
        </button>`;
      }).join('')}
    </div>`;

    if (!qv.ewcGroup) {
      wrap.innerHTML = pickerHTML + `<div class="qv-empty"><div class="qv-empty-title">Select a meet above</div><div class="qv-empty-sub">Choose East, Central, or West to see Zone qualifiers</div></div>`;
      return;
    }

    const quals   = ewcQualifiers(qv.ewcGroup).map(enrichRow);
    const grouped = groupByEvent(quals);
    const [za, zb] = EWC_ZONES[qv.ewcGroup];

    let html = pickerHTML + sortBarHTML(qv.ewcSort,'ewc',['elig','score','zone','name']);
    html += `<div class="qv-event-grid">`;
    grouped.forEach(([eventKey, rows]) => {
      const sorted = sortRows(rows, qv.ewcSort);
      const anchorId = `qv-ewc-${eventKey.replace(/\W+/g,'-')}`;
      const cntA = rows.filter(r=>r.zone===za).length;
      const cntB = rows.filter(r=>r.zone===zb).length;
      const ndCnt = rows.filter(r=>r.nonDisplacing||r._nonDispAtEWC).length;
      html += `<div class="qv-event-card" id="${esc(anchorId)}">
        <div class="qv-event-header">
          <span class="qv-event-name">${esc(eventKey)}</span>
          <span class="qv-event-meta">Zone ${za}: ${cntA} · Zone ${zb}: ${cntB} · ${ndCnt > 0 ? ndCnt+' ND · ':''}</span>
          <span class="qv-event-count">${rows.length}</span>
        </div>
        <table class="qv-table">
          <thead><tr>
            <th style="width:36px">Elig.</th>
            <th>Athlete</th><th>Team</th>
            <th>Zone</th><th>Score</th>
            <th>How qualified</th><th>Flags</th>
            <th style="width:36px">Nat's</th>
          </tr></thead>
          <tbody>${sorted.map(r => {
            const nd = r.nonDisplacing || r._nonDispAtEWC;
            return `<tr class="${nd?'qv-row-nd':''}" data-rid="${esc(r.id)}" onclick="window._qvOpenRow('${esc(r.id)}','EWC')">
              <td class="mono">${esc(String(r.eligibleRank||'—'))}</td>
              <td><div class="ath-name">${esc(r.athlete)}</div><div class="ath-id">${esc(r.diveMeetsId||'')}</div></td>
              <td class="team-col">${esc(r.team||'')}</td>
              <td><span class="zone-pill zone-${esc(r.zone)}">Z${esc(r.zone||'?')}</span></td>
              <td class="score-col">${fmtScore(r.score)}</td>
              <td>${qualBadge(r)}</td>
              <td>${flagBadges(r)}</td>
              <td class="reg-col">${regStatus(r)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
    });
    html += '</div>';
    wrap.innerHTML = html;
    wireRowClicks(wrap, 'EWC');
  }

  window._qvSetEWCGroup = function(g) {
    qv.ewcGroup = qv.ewcGroup === g ? null : g;
    renderEWCView();
  };

  function renderEWCByEvent(wrap) {
    const allRows = allResults()
      .filter(r => r.stage === 'Zones' && (r.advancesToEWC || r.advancesToNationals))
      .map(enrichRow);
    const grouped = groupByEvent(allRows);

    let html = sortBarHTML(qv.ewcSort,'ewc-event',['elig','score','zone','name']);
    html += `<div class="qv-event-grid">`;
    grouped.forEach(([eventKey, rows]) => {
      const sorted = sortRows(rows, qv.ewcSort);
      const byGroup = {};
      EWC_GROUPS.forEach(g => {
        const zones = EWC_ZONES[g];
        byGroup[g] = rows.filter(r => zones.includes(r.zone));
      });
      html += `<div class="qv-event-card">
        <div class="qv-event-header">
          <span class="qv-event-name">${esc(eventKey)}</span>
          <span class="qv-event-meta">${EWC_GROUPS.map(g=>`${g}: ${byGroup[g].length}`).join(' · ')}</span>
          <span class="qv-event-count">${rows.length}</span>
        </div>
        <table class="qv-table">
          <thead><tr>
            <th style="width:36px">Elig.</th>
            <th>Athlete</th><th>Team</th>
            <th>Zone</th><th>E/W/C meet</th>
            <th>Score</th><th>How qualified</th><th>Flags</th>
            <th style="width:36px">Nat's</th>
          </tr></thead>
          <tbody>${sorted.map(r => {
            const nd = r.nonDisplacing || r._nonDispAtEWC;
            const ewc = r.ewc || ZONE_TO_EWC[r.zone] || '?';
            return `<tr class="${nd?'qv-row-nd':''}" data-rid="${esc(r.id)}" onclick="window._qvOpenRow('${esc(r.id)}','EWC')">
              <td class="mono">${esc(String(r.eligibleRank||'—'))}</td>
              <td><div class="ath-name">${esc(r.athlete)}</div><div class="ath-id">${esc(r.diveMeetsId||'')}</div></td>
              <td class="team-col">${esc(r.team||'')}</td>
              <td><span class="zone-pill zone-${esc(r.zone)}">Z${esc(r.zone||'?')}</span></td>
              <td><span class="qvb qvb-ewc">${esc(ewc)}</span></td>
              <td class="score-col">${fmtScore(r.score)}</td>
              <td>${qualBadge(r)}</td>
              <td>${flagBadges(r)}</td>
              <td class="reg-col">${regStatus(r)}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
    });
    html += '</div>';
    wrap.innerHTML = html;
    wireRowClicks(wrap, 'EWC');
  }

  /* ── Nationals View ────────────────────────────────────────── */
  function renderNationalsView() {
    const tableWrap = $('tableWrap');
    const ctx       = $('resultsContext');
    if (!tableWrap) return;

    // Primary source: uploaded qualifier list
    const hasOfficialList = NAT && NAT.qualifiers && NAT.qualifiers.length > 0;

    if (ctx) ctx.innerHTML = `
      <div class="context-title-block">
        <strong>Junior Nationals — Qualifier List</strong>
        <span>${hasOfficialList ? `Official list · ${NAT.meta.totalAthletes} athletes · ${NAT.meta.totalSlots} event slots` : 'Computed from Zone results'}</span>
      </div>
      ${hasOfficialList ? `
        <div class="context-stat"><strong>${NAT.meta.totalAthletes}</strong> athletes</div>
        <div class="context-stat"><strong>${NAT.meta.totalSlots}</strong> event slots</div>
        <div class="context-stat"><strong>${NAT.meta.totalEvents}</strong> events</div>` : ''}`;

    renderNatSidebar();

    if (hasOfficialList) {
      renderNatFromOfficialList(tableWrap);
    } else {
      renderNatFromComputed(tableWrap);
    }
  }

  function renderNatSidebar() {
    const el = $('eventList');
    if (!el) return;
    if (!NAT) { el.innerHTML = ''; return; }
    const events = [...new Set(NAT.qualifiers.map(q => q.qualifiedEventKeys).flat())].sort();
    el.innerHTML = `
      <div style="padding:8px 12px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-text-tertiary);margin-bottom:6px">Events</div>
        ${events.map(ek => {
          const count = NAT.qualifiers.filter(q => q.qualifiedEventKeys.includes(ek)).length;
          return `<div class="event-item">
            <span class="event-item-name">${esc(ek)}</span>
            <span class="event-item-meta">${count}</span>
          </div>`;
        }).join('')}
      </div>`;
  }

  function renderNatFromOfficialList(wrap) {
    // Group by event
    const byEvent = new Map();
    NAT.qualifiers.forEach(q => {
      q.qualifiedEventKeys.forEach((ek, i) => {
        if (!byEvent.has(ek)) byEvent.set(ek, []);
        byEvent.get(ek).push({ ...q, eventKey: ek, eventName: q.qualifiedEvents[i] });
      });
    });

    // Sort events by group/gender/board
    const evKeys = [...byEvent.keys()].sort((a,b) => {
      const grpOrd = {A:0,B:1,C:2,D:3,AQUA:4};
      const ag = a.match(/Group ([A-D])/)?.[1] || (a.includes('AQUA')?'AQUA':'Z');
      const bg = b.match(/Group ([A-D])/)?.[1] || (b.includes('AQUA')?'AQUA':'Z');
      const gg = {Girls:0,Boys:1};
      const dOrd = {'1M':0,'3M':1,'Platform':2};
      return (grpOrd[ag]??9)-(grpOrd[bg]??9)
           ||(gg[a.includes('Girls')?'Girls':'Boys']??9)-(gg[b.includes('Girls')?'Girls':'Boys']??9)
           ||(dOrd[a.includes('1M')?'1M':a.includes('3M')?'3M':'Platform']??9)-(dOrd[b.includes('1M')?'1M':b.includes('3M')?'3M':'Platform']??9);
    });

    // HPS athletes not yet in official list
    const hpsSection = renderHPSSection();

    let html = `<div class="qv-event-grid">`;
    evKeys.forEach(ek => {
      const athletes = byEvent.get(ek).sort((a,b)=>a.name.localeCompare(b.name));
      const alreadyNat = athletes.filter(a => {
        const n = a.name;
        return Object.keys(NAT.ewcAlreadyNatQual||{}).some(k=>norm(k)===norm(n));
      }).length;

      html += `<div class="qv-event-card">
        <div class="qv-event-header">
          <span class="qv-event-name">${esc(ek)}</span>
          <span class="qv-event-meta">${alreadyNat>0?alreadyNat+' already qualified ·':''}</span>
          <span class="qv-event-count">${athletes.length}</span>
        </div>
        <table class="qv-table">
          <thead><tr>
            <th>Athlete</th><th>DiveMeets ID</th>
            <th>Qualified events</th><th>EWC status</th>
            <th style="width:60px">Attending</th>
          </tr></thead>
          <tbody>${athletes.map(a => {
            const alreadyEvts = isEWCAlreadyNatQual(a.name);
            const confirmed = getConfirmedAttending(a.diveMeetsId);
            const hps = isHPSPrequal(a.name, '') ? true : false;
            const ewcEvts = alreadyEvts.filter(e => norm(e) === norm(a.eventKey)).length > 0;
            return `<tr>
              <td><div class="ath-name">${esc(a.name)}</div></td>
              <td><a class="dm-ext-link" href="https://www.divemeets.com/profile.php?id=${esc(a.diveMeetsId)}" target="_blank" rel="noopener"><i class="ti ti-external-link" aria-hidden="true"></i> ${esc(a.diveMeetsId)}</a></td>
              <td style="font-size:11px">${a.qualifiedEvents.join(', ')}</td>
              <td>${ewcEvts?`<span class="qvb qvb-nd">Competing EWC (non-disp.)</span>`:`<span class="qvb qvb-direct">Direct qualifier</span>`}</td>
              <td class="reg-col">
                ${hps ? `<button class="hps-attend-btn" onclick="window._qvToggleHPS('${esc(a.diveMeetsId)}')" title="${confirmed?'Confirmed':'Unconfirmed'}">
                  <i class="ti ti-${confirmed?'check':'help'}" style="color:${confirmed?'#0a8f55':'#b26a00'}"></i>
                </button>` : `<i class="ti ti-check reg-yes"></i>`}
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;
    });
    html += '</div>';

    if (hpsSection) html += hpsSection;
    wrap.innerHTML = html;
  }

  function renderHPSSection() {
    if (!NAT) return '';
    const all = [...(NAT.hpsPrequalFemale||[]), ...(NAT.hpsPrequalMale||[])];
    if (!all.length) return '';
    return `<div class="qv-event-card" style="margin:8px 16px 16px">
      <div class="qv-event-header">
        <span class="qv-event-name">HPS Pre-qualified to Nationals Prelims</span>
        <span class="qv-event-meta">Non-displacing · may or may not register</span>
        <span class="qv-event-count">${all.length}</span>
      </div>
      <table class="qv-table">
        <thead><tr><th>Athlete</th><th>Group</th><th>Gender</th><th>Confirmed attending</th></tr></thead>
        <tbody>${all.map(h => {
          const confirmed = getConfirmedAttending('hps:'+norm(h.name));
          return `<tr>
            <td><div class="ath-name">${esc(h.name)}</div></td>
            <td>${esc(h.group)}</td>
            <td>${h.gender==='F'||h.gender==='Girls'?'Girls':'Boys'}</td>
            <td><button class="hps-attend-btn" onclick="window._qvToggleHPS('hps:${esc(norm(h.name))}')" title="${confirmed?'Confirmed attending — click to toggle':'Unconfirmed — click to mark attending'}">
              <i class="ti ti-${confirmed?'check':'help'}" style="color:${confirmed?'#0a8f55':'#b26a00'}"></i>
              ${confirmed?'Confirmed':'Unconfirmed'}
            </button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
  }

  function renderNatFromComputed(wrap) {
    const quals = nationalQualifiers().map(enrichRow);
    if (!quals.length) {
      wrap.innerHTML = `<div class="qv-empty"><div class="qv-empty-title">No Nationals qualifiers yet</div><div class="qv-empty-sub">Upload the official qualifier list or add Zone results with advancesToNationals.</div></div>`;
      return;
    }
    const grouped = groupByEvent(quals);
    let html = `<div class="qv-event-grid">`;
    grouped.forEach(([eventKey, rows]) => {
      const sorted = sortRows(rows, qv.natSort);
      html += `<div class="qv-event-card">
        <div class="qv-event-header">
          <span class="qv-event-name">${esc(eventKey)}</span>
          <span class="qv-event-count">${rows.length}</span>
        </div>
        <table class="qv-table">
          <thead><tr><th style="width:36px">Elig.</th><th>Athlete</th><th>Team</th><th>Zone</th><th>Score</th><th>How</th><th>Flags</th></tr></thead>
          <tbody>${sorted.map(r => `<tr data-rid="${esc(r.id)}" onclick="window._qvOpenRow('${esc(r.id)}','Nationals')">
            <td class="mono">${esc(String(r.eligibleRank||'—'))}</td>
            <td><div class="ath-name">${esc(r.athlete)}</div><div class="ath-id">${esc(r.diveMeetsId||'')}</div></td>
            <td class="team-col">${esc(r.team||'')}</td>
            <td><span class="zone-pill zone-${esc(r.zone)}">Z${esc(r.zone||'?')}</span></td>
            <td class="score-col">${fmtScore(r.score)}</td>
            <td>${qualBadge(r)}</td>
            <td>${flagBadges(r)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>`;
    });
    html += '</div>';
    wrap.innerHTML = html;
    wireRowClicks(wrap, 'Nationals');
  }

  /* ── Row click handler ─────────────────────────────────────── */
  let _rowCache = new Map();
  function rebuildRowCache() {
    _rowCache = new Map();
    allResults().forEach(r => _rowCache.set(r.id, r));
  }

  function wireRowClicks(wrap, stage) {
    rebuildRowCache();
  }

  window._qvOpenRow = function(id, stage) {
    const r = _rowCache.get(id) || allResults().find(r => r.id === id);
    if (r) openPanel(r, stage);
  };

  /* ── Sort bar ──────────────────────────────────────────────── */
  const SORT_LABELS = { elig:'Elig. rank', score:'Score', zone:'Zone', name:'Name', event:'Event' };
  function sortBarHTML(currentSort, key, opts) {
    return `<div class="qv-sort-bar" data-key="${esc(key)}">
      <span class="qv-sort-lbl">Sort:</span>
      ${opts.map(o => `<button class="qv-sort-btn${currentSort===o?' active':''}" onclick="window._qvSort('${esc(key)}','${esc(o)}')">${esc(SORT_LABELS[o]||o)}</button>`).join('')}
    </div>`;
  }

  window._qvSort = function(key, val) {
    if (key.startsWith('zone')) qv.zoneSort = val;
    else if (key.startsWith('ewc')) qv.ewcSort = val;
    else qv.natSort = val;
    if (typeof state !== 'undefined') {
      if (state.stage === 'Zones') renderZonesView();
      else if (state.stage === 'EWC') renderEWCView();
      else if (state.stage === 'Nationals') renderNationalsView();
    }
  };

  /* ── CSS ───────────────────────────────────────────────────── */
  function injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
/* Panel */
#qv-panel{position:fixed;top:52px;right:-420px;width:400px;bottom:0;background:var(--color-background-primary);border-left:0.5px solid var(--color-border-tertiary);display:flex;flex-direction:column;z-index:200;transition:right .22s cubic-bezier(.4,0,.2,1);overflow:hidden}
#qv-panel.open{right:0;box-shadow:-4px 0 20px rgba(0,0,0,.12)}
#qv-panel-close{position:absolute;top:10px;right:12px;background:transparent;border:none;cursor:pointer;font-size:18px;color:var(--color-text-secondary);width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%}
#qv-panel-close:hover{background:var(--color-background-secondary)}
#qv-panel-body{flex:1;overflow-y:auto;padding:0 0 24px}
.panel-ath-header{display:flex;align-items:flex-start;gap:10px;padding:16px 16px 12px}
.panel-avatar{width:40px;height:40px;border-radius:50%;background:#E6F1FB;color:#0C447C;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;flex-shrink:0}
.panel-ath-name{font-size:16px;font-weight:500;color:var(--color-text-primary)}
.panel-ath-meta{font-size:12px;color:var(--color-text-secondary);margin-top:2px}
.dm-full-btn{display:flex;align-items:center;gap:6px;margin:0 16px 12px;padding:8px 14px;background:#E6F1FB;border:0.5px solid #85B7EB;border-radius:var(--border-radius-md);color:#0C447C;font-size:13px;font-weight:500;text-decoration:none;cursor:pointer}
.dm-full-btn:hover{background:#B5D4F4}
.dm-full-btn i{font-size:15px}
.panel-flags{display:flex;flex-wrap:wrap;gap:4px;padding:0 16px 10px;border-bottom:0.5px solid var(--color-border-tertiary)}
.panel-nat-events{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.panel-section{padding:10px 16px;border-top:0.5px solid var(--color-border-tertiary)}
.panel-section-label{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-tertiary);margin-bottom:6px}
.panel-override-row{display:flex;flex-wrap:wrap;gap:6px}
.panel-act-btn{padding:5px 10px;font-size:11px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);color:var(--color-text-primary);cursor:pointer}
.panel-act-btn:hover{background:var(--color-background-primary)}
/* Trail */
.trail-card{border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);padding:10px 12px;margin-bottom:0}
.trail-stage-label{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-tertiary);margin-bottom:4px}
.trail-stats{display:flex;gap:12px;margin:6px 0}
.trail-stat{flex:1}
.trail-val{font-size:16px;font-weight:500;font-family:var(--font-mono)}
.trail-lbl{font-size:10px;color:var(--color-text-secondary)}
.trail-reason{font-size:11px;padding:4px 8px;border-radius:4px;background:var(--color-background-secondary);color:var(--color-text-secondary);margin-top:6px}
.trail-reason.good{background:#EAF3DE;color:#3B6D11}
.trail-reason.ewc{background:#E6F1FB;color:#0C447C}
.trail-reason.nd{background:#F1EFE8;color:#444441}
.trail-threshold{font-size:11px;color:var(--color-text-secondary);margin-top:4px}.thr-met{color:#0a8f55;font-weight:500}.thr-miss{color:#c0392b;font-weight:500}
.trail-nd-note{font-size:11px;color:var(--color-text-secondary);background:var(--color-background-secondary);border-radius:4px;padding:4px 8px;margin-top:4px}
.trail-connector{height:18px;display:flex;align-items:center;padding:0 17px;color:var(--color-text-tertiary);font-size:13px}
.trail-dest{margin-top:0}
.trail-dest-label{font-size:14px;font-weight:500;margin-top:4px}
.dest-nat{border-color:#9FE1CB;background:#E1F5EE}
.dest-ewc{border-color:#85B7EB;background:#E6F1FB}
.dest-none{border-color:var(--color-border-tertiary);background:var(--color-background-secondary)}
/* HPS toggle */
.hps-toggle{display:flex;align-items:center;gap:10px;padding:8px 10px;border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);cursor:pointer;background:var(--color-background-secondary)}
.hps-pill{width:32px;height:18px;border-radius:9px;background:var(--color-border-secondary);position:relative;flex-shrink:0;transition:background .2s}
.hps-pill.on{background:#0a8f55}
.hps-pip{width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .2s}
.hps-pill.on .hps-pip{left:16px}
.hps-lbl{font-size:12px;color:var(--color-text-primary)}
.hps-note{font-size:11px;color:var(--color-text-secondary);margin-bottom:6px}
.panel-hps-note{font-size:11px;color:var(--color-text-secondary);margin-bottom:8px}
.hps-attend-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-tertiary);background:var(--color-background-secondary);cursor:pointer;font-size:11px;color:var(--color-text-primary)}
/* Tables */
.qv-table{width:100%;border-collapse:collapse;font-size:12px}
.qv-table th{position:sticky;top:0;background:var(--color-background-secondary);padding:6px 10px;text-align:left;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-secondary);border-bottom:0.5px solid var(--color-border-tertiary);white-space:nowrap}
.qv-table td{padding:7px 10px;border-bottom:0.5px solid var(--color-border-tertiary);vertical-align:middle}
.qv-table tr:last-child td{border-bottom:none}
.qv-table tr[data-rid]{cursor:pointer}.qv-table tr[data-rid]:hover td{background:var(--color-background-secondary)}
.qv-row-nd{opacity:.6}
.ath-name{font-weight:500;font-size:13px;color:var(--color-text-primary)}
.ath-id{font-size:10px;color:var(--color-text-tertiary);font-family:var(--font-mono);margin-top:1px}
.team-col{font-size:11px;color:var(--color-text-secondary)}
.score-col{font-family:var(--font-mono);font-size:12px;font-weight:500;color:var(--color-text-primary)}
.mono{font-family:var(--font-mono);font-size:12px}
.reg-col{text-align:center}.reg-yes{color:#0a8f55;font-size:14px}.reg-pend{color:#b26a00;font-size:14px}.reg-none{color:var(--color-text-tertiary);font-size:14px}
/* Zone pills */
.zone-pill{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700}
.zone-A,.zone-B{background:#EEEDFE;color:#3C3489}
.zone-C,.zone-D{background:#E1F5EE;color:#085041}
.zone-E,.zone-F{background:#FAEEDA;color:#633806}
/* Origin col */
.origin-from{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--color-text-secondary)}
.origin-scores{font-size:10px;color:var(--color-text-tertiary);font-family:var(--font-mono);margin-top:2px}
/* Qual badges */
.qvb{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:500;margin-right:3px;white-space:nowrap}
.qvb-direct{background:#EAF3DE;color:#3B6D11}
.qvb-ewc{background:#E6F1FB;color:#0C447C}
.qvb-avg{background:#EEEDFE;color:#3C3489}
.qvb-ymca{background:#E1F5EE;color:#085041}
.qvb-repl{background:#FAEEDA;color:#633806}
.qvb-zone{background:#EEEDFE;color:#3C3489}
.qvb-nd{background:#F1EFE8;color:#444441}
.qvb-out{background:var(--color-background-secondary);color:var(--color-text-tertiary)}
.qvb-foreign{background:#FCEBEB;color:#501313}
.qvb-hps{background:#FAECE7;color:#4A1B0C}
.qvb-dual{background:#E6F1FB;color:#042C53}
.qvb-nat{background:#EAF3DE;color:#3B6D11}
.qvb-dna{background:#FAEEDA;color:#633806}
.qvb-bump{background:#FBEAF0;color:#4B1528}
/* Meet picker */
.qv-meet-picker{display:flex;gap:10px;padding:12px 16px;border-bottom:0.5px solid var(--color-border-tertiary);flex-wrap:wrap}
.qv-meet-btn{flex:1;min-width:140px;border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);padding:10px 14px;cursor:pointer;background:var(--color-background-primary);text-align:left;transition:all .15s}
.qv-meet-btn:hover{border-color:#185FA5}
.qv-meet-btn.active{border-color:#185FA5;background:#E6F1FB}
.qv-meet-label{display:block;font-size:14px;font-weight:500;color:var(--color-text-primary)}
.qv-meet-btn.active .qv-meet-label{color:#0C447C}
.qv-meet-sub{display:block;font-size:11px;color:var(--color-text-secondary);margin-top:2px}
.qv-meet-count{display:block;font-size:11px;color:var(--color-text-tertiary);margin-top:4px}
/* Event grid */
.qv-event-grid{display:flex;flex-direction:column;gap:8px;padding:10px 16px 16px}
.qv-event-card{border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);background:var(--color-background-primary);overflow:hidden}
.qv-event-header{display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--color-background-secondary);border-bottom:0.5px solid var(--color-border-tertiary)}
.qv-event-name{font-weight:500;font-size:13px;color:var(--color-text-primary);flex:1}
.qv-event-meta{font-size:11px;color:var(--color-text-secondary)}
.qv-event-count{font-size:11px;background:var(--color-border-tertiary);padding:2px 8px;border-radius:10px;color:var(--color-text-secondary)}
/* Sort bar */
.qv-sort-bar{display:flex;align-items:center;gap:6px;padding:8px 16px;border-bottom:0.5px solid var(--color-border-tertiary);flex-wrap:wrap}
.qv-sort-lbl{font-size:11px;color:var(--color-text-secondary);font-weight:500}
.qv-sort-btn{padding:3px 10px;border-radius:14px;font-size:11px;font-weight:500;border:0.5px solid var(--color-border-tertiary);background:var(--color-background-primary);color:var(--color-text-secondary);cursor:pointer}
.qv-sort-btn:hover{border-color:#185FA5;color:#185FA5}
.qv-sort-btn.active{background:#185FA5;color:#fff;border-color:#185FA5}
/* Mode toggle */
.qv-mode-toggle-sidebar{display:flex;flex-direction:column;gap:2px;padding:8px 8px 4px}
.qv-mode-btn{width:100%;padding:7px 10px;text-align:left;font-size:12px;border:0.5px solid transparent;border-radius:var(--border-radius-md);cursor:pointer;background:transparent;color:var(--color-text-secondary)}
.qv-mode-btn:hover{background:var(--color-background-secondary)}
.qv-mode-btn.active{background:var(--color-background-secondary);color:var(--color-text-primary);font-weight:500;border-color:var(--color-border-tertiary)}
/* DiveMeets link */
.dm-ext-link{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#185FA5;text-decoration:none;padding:2px 6px;border-radius:4px;border:0.5px solid #B5D4F4;background:#E6F1FB;white-space:nowrap}
.dm-ext-link:hover{background:#B5D4F4}
/* Empty */
.qv-empty{padding:48px 24px;text-align:center}
.qv-empty-title{font-size:1.1rem;font-weight:500;color:var(--color-text-primary);margin-bottom:8px}
.qv-empty-sub{color:var(--color-text-secondary);font-size:.88rem}
`;
    document.head.appendChild(s);
  }

  /* ── Mount panel DOM ───────────────────────────────────────── */
  function mountPanel() {
    if ($('qv-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'qv-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Athlete detail');
    panel.innerHTML = `
      <button id="qv-panel-close" onclick="window._qvClosePanel()" aria-label="Close panel">×</button>
      <div id="qv-panel-body"></div>`;
    document.body.appendChild(panel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') window._qvClosePanel(); });
  }

  window._qvClosePanel = closePanel;

  /* ── Wire into main.js hooks ───────────────────────────────── */
  function patchMain() {
    injectCSS();
    mountPanel();

    window._qvRenderEWC = renderEWCView;
    window._qvRenderNat = renderNationalsView;
    window._qvRenderZones = renderZonesView;

    // Patch Zones stage to use our enhanced view when in origin mode
    if (typeof buildStageNav === 'function') {
      const stageNav = document.getElementById('stageNav');
      if (stageNav) {
        stageNav.addEventListener('click', e => {
          const btn = e.target.closest('.stage-btn');
          if (!btn) return;
          if (btn.dataset.stage !== 'EWC') qv.ewcGroup = null;
          qv.expanded.clear();
          closePanel();
        }, { capture: true });
      }
    }

    console.log('[qualifier-views v4] registered');
  }

  waitForMain(patchMain);
})();
