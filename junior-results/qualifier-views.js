/* ================================================================
   qualifier-views.js  v4.1
   v4.1 patch — uses USAD_EWC_DATA for registration, foreign/dual/HPS,
   EWC entry events in panel, corrected non-displacing logic.
   status overlay, prelims/finals format awareness.
   ================================================================ */
(function () {
  'use strict';

  /* ── helpers ───────────────────────────────────────────────── */
  // esc(), escJsAttr(), and norm() are defined globally in main.js (which
  // always loads first — see index.html's load order) and reused here
  // rather than kept as separate local copies, so a fix to any of them
  // (e.g. the escJsAttr apostrophe-in-onclick fix) reaches every file.
  function $(id) { return document.getElementById(id); }
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

  /* ── Data sources ──────────────────────────────────────────── */
  const NAT = window.USAD_JO_NAT_QUALIFIERS || null;
  const EWC = window.USAD_EWC_DATA || null;

  /* ── JO Nationals qualifier lookup ────────────────────────── */
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

  /* ── EWC registration lookup (from USAD_EWC_DATA) ─────────── */
  function ewcEntry(name, meet) {
    if (!EWC) return null;
    const n = norm(name);
    return EWC.entries.find(e =>
      norm(e.name) === n && (!meet || e.meet === meet)
    ) || null;
  }

  function isRegisteredAtEWC(name, meet) {
    return Boolean(ewcEntry(name, meet));
  }

  function ewcEntryEvents(name, meet) {
    const e = ewcEntry(name, meet);
    return e ? e.events : [];
  }

  /* ── Foreign athlete lookup (EWC data is authoritative) ───── */
  function isForeignEWC(name) {
    // Use EWC data first (authoritative), fall back to NAT embedded list
    if (EWC) {
      const n = norm(name);
      const f = EWC.foreignAthletes.find(a => norm(a.name) === n);
      if (f) return f;
    }
    if (NAT) {
      const n = norm(name);
      return NAT.foreignEWC.find(f => norm(f.name) === n) || null;
    }
    return null;
  }

  /* ── Dual citizen lookup ───────────────────────────────────── */
  function isDualCitizen(name) {
    if (!EWC) return null;
    const n = norm(name);
    return EWC.dualCitizens.find(d => norm(d.name) === n) || null;
  }

  /* ── Already-nat-qual at EWC lookup ───────────────────────── */
  function isEWCAlreadyNatQual(name) {
    if (EWC) {
      const n = norm(name);
      const a = EWC.alreadyNatQual.find(x => norm(x.name) === n);
      if (a) return a.qualifiedEvents || [];
    }
    if (NAT) {
      const n = norm(name);
      for (const [athlete, evts] of Object.entries(NAT.ewcAlreadyNatQual || {})) {
        if (norm(athlete) === n) return evts;
      }
    }
    return [];
  }

  /* ── HPS lookup ────────────────────────────────────────────── */
  function isHPSPrequal(name) {
    // Use EWC data (has full HPS list, confirmed none registered at EWC)
    if (EWC) {
      const n = norm(name);
      return EWC.hpsAthletes.find(h => norm(h.name) === n) || null;
    }
    if (NAT) {
      const n = norm(name);
      const all = [...(NAT.hpsPrequalFemale||[]), ...(NAT.hpsPrequalMale||[])];
      return all.find(h => norm(h.name) === n) || null;
    }
    return null;
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
    // Computed E/W/C → Nationals (from Neon) — cached after first load
    computedEWCNat:        null,
    computedEWCNatLoading: false,
    computedEWCNatError:   null,
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
    // Prefer the actual E/W/C RESULTS for the meet (now loaded and processed by
    // recalcEWC). Fall back to the projected entry field (Zone places 4–18) only
    // when results aren't present (e.g. pre-championship).
    const results = allResults().filter(r => r.stage === 'EWC' && r.ewcMeet === group);
    if (results.length) return results;
    const zones = EWC_ZONES[group] || [];
    return allResults().filter(r =>
      r.stage === 'Zones' && r.advancesToEWC && !r.advancesToNationals && zones.includes(r.zone)
    );
  }
  function ewcHasResults() { return allResults().some(r => r.stage === 'EWC'); }

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
    r._foreignEWC       = isForeignEWC(r.athlete);
    r._dualCitizen      = isDualCitizen(r.athlete);
    r._ewcAlreadyNat    = isEWCAlreadyNatQual(r.athlete);
    r._hpsPrequal       = isHPSPrequal(r.athlete);
    const _zoneToEWC    = {A:'East',B:'East',C:'Central',D:'Central',E:'West',F:'West'};
    const ewcMeet       = r.ewc || _zoneToEWC[r.zone] || null;
    r._ewcRegistered    = isRegisteredAtEWC(r.athlete, ewcMeet);
    r._ewcEntryEvents   = ewcEntryEvents(r.athlete, ewcMeet);
    r._ewcMeet          = ewcMeet;
    r._nonDispAtEWC = Boolean(
      r._foreignEWC ||
      (r._ewcAlreadyNat && r._ewcAlreadyNat.length > 0) ||
      r.nonDisplacing
    );
    if (r._foreignEWC && !r.foreignDeclared) {
      r.foreignDeclared = true;
      r.nonDisplacing = true;
      r._nonDispAtEWC = true;
    }
    if (r._dualCitizen && r._dualCitizen.dualOtherCountry && !r.dualOtherCountry) {
      r.dualOtherCountry = true;
      r.dualDeclared = true;
    }
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
    if (r.hps || r._hpsPrequal) b.push(`<span class="qvb qvb-hps">HPS</span>`);
    if (r.ymca) b.push(`<span class="qvb qvb-ymca">YMCA</span>`);
    if (r._dualCitizen || r.dualDeclared) b.push(`<span class="qvb qvb-dual" title="${esc((r._dualCitizen?.federationRepresented)||'')}">${r.dualOtherCountry||r._dualCitizen?.dualOtherCountry?'Dual effect':'Dual'}</span>`);
    if (r._ewcAlreadyNat?.length) b.push(`<span class="qvb qvb-nat">Already Nat\u2019s qual</span>`);
    if (r._nonDispAtEWC && !r.nonDisplacing) b.push(`<span class="qvb qvb-nd">Non-displacing at E/W/C</span>`);
    if (r.nonDisplacing && !r._nonDispAtEWC) b.push(`<span class="qvb qvb-nd">Non-displacing</span>`);
    if (r.declaredNotAttending) b.push(`<span class="qvb qvb-dna">Not attending</span>`);
    if (r.bumpIn) b.push(`<span class="qvb qvb-bump">Bump in</span>`);
    return b.join('');
  }

  function regStatus(r) {
    // For zone/EWC rows: show whether athlete is registered at their EWC meet
    const ewcMeet = r._ewcMeet || r.ewc || ({A:'East',B:'East',C:'Central',D:'Central',E:'West',F:'West'})[r.zone];
    if (ewcMeet && EWC) {
      // Non-displacing athletes (foreign, already-nat-qual) show a ghost icon
      if (r._nonDispAtEWC && !r.nonDisplacing) {
        return `<span title="Registered — non-displacing"><i class="ti ti-ghost reg-nd"></i></span>`;
      }
      const reg = r._ewcRegistered !== undefined ? r._ewcRegistered : isRegisteredAtEWC(r.athlete, ewcMeet);
      if (reg) return `<i class="ti ti-check reg-yes" title="Registered at ${esc(ewcMeet)}"></i>`;
      // Not registered — could still be coming (entries may not be final)
      return `<i class="ti ti-x reg-no" title="Not in entry list"></i>`;
    }
    // For Nationals view: use JO qualifier list
    if (!NAT) return '';
    const qualified = isNatQualified(r.diveMeetsId, r.eventKey);
    if (!qualified) return `<span class="reg-dot reg-none" title="Not in JO qualifier list">—</span>`;
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
    // Clear body so stale content isn't briefly visible on reopen
    const body = $('qv-panel-body');
    if (body) body.innerHTML = '';
  }

  /* ── Review section ────────────────────────────────────────── */
  // Flag type → plain English reason + action buttons
  const REVIEW_ACTIONS = {
    'Zone result not in scraped data': {
      reason: 'This athlete appears on the official DiveMeets qualifier list but has no scraped zone result. Verify their qualification route.',
      actions: [
        { label:'Normal qualification', type:'review', note:'Confirmed: normal zone qualifier — data gap only', value:false },
        { label:'Medical petition',      type:'petition',note:'Medical petition approved',                       value:true  },
        { label:'Exhibition only',       type:'foreign', note:'Exhibition/foreign — should not count',           value:true  },
        { label:'Dismiss flag',          type:'review',  note:'Dismissed: data verified, no action needed',     value:false },
      ],
    },
    'Citizenship missing/unknown': {
      reason: 'This athlete\'s citizenship could not be confirmed from available data. Please designate their status.',
      actions: [
        { label:'US Citizen',       type:'review',   note:'Confirmed US citizen',           value:false },
        { label:'Foreign declared', type:'foreign',  note:'Foreign declared — non-displacing', value:true },
        { label:'Dual citizen',     type:'dual',     note:'Dual citizen declared',           value:true  },
        { label:'Dismiss / TBD',    type:'review',   note:'Dismissed: citizenship TBD',     value:false },
      ],
    },
    'Webpoint non-US but no foreign declaration': {
      reason: 'Webpoint registration shows a non-US country but no formal foreign declaration was filed at this meet.',
      actions: [
        { label:'Mark foreign',         type:'foreign', note:'Foreign declared — non-displacing',  value:true  },
        { label:'Confirm US citizen',   type:'review',  note:'Confirmed US citizen — Webpoint error', value:false },
        { label:'Mark dual citizen',    type:'dual',    note:'Dual citizen declared',               value:true  },
        { label:'Dismiss',              type:'review',  note:'Dismissed: reviewed and no action',  value:false },
      ],
    },
    'Dual other-country declaration without foreign declaration': {
      reason: 'This athlete has a dual citizenship affecting results flag but was not formally declared as foreign at meet check-in.',
      actions: [
        { label:'Non-displacing dual',  type:'dualEffect', note:'Dual — non-displacing, affects results', value:true  },
        { label:'Mark foreign',         type:'foreign',    note:'Foreign declared — non-displacing',      value:true  },
        { label:'Confirm US citizen',   type:'review',     note:'Confirmed US citizen — flag error',      value:false },
        { label:'Dismiss',              type:'review',     note:'Dismissed: reviewed and no action',      value:false },
      ],
    },
    'Dual declaration reviewed - no other sport nationality': {
      reason: 'This athlete was flagged as a dual citizen but review indicates they have not competed for another federation in diving.',
      actions: [
        { label:'Confirm — no effect',  type:'review',   note:'Confirmed dual declared, no effect on diving results', value:false },
        { label:'Mark non-displacing',  type:'dualEffect',note:'Dual — affects results, non-displacing',              value:true  },
        { label:'Dismiss',              type:'review',   note:'Dismissed: reviewed and no action',                    value:false },
      ],
    },
    'Place=127': {
      reason: 'DiveMeets assigned place 127 (exhibition code) to this athlete but they are not flagged as foreign or non-displacing.',
      actions: [
        { label:'Mark foreign',     type:'foreign', note:'Foreign/exhibition — non-displacing', value:true  },
        { label:'Data error',       type:'review',  note:'Data error — place 127 incorrect',    value:false },
        { label:'Dismiss',          type:'review',  note:'Dismissed: reviewed',                 value:false },
      ],
    },
    'Score=0': {
      reason: 'This athlete has a score of zero, which usually indicates a DNS, scratch, or data entry error.',
      actions: [
        { label:'DNS / Scratch',    type:'notAttending', note:'DNS or scratch — did not compete', value:true  },
        { label:'Data error',       type:'review',       note:'Data error — score incorrect',      value:false },
        { label:'Dismiss',          type:'review',       note:'Dismissed: reviewed',               value:false },
      ],
    },
    'Dual citizen (dualOtherCountry)': {
      reason: 'This dual citizen competed for another federation. Confirm whether they are kept on the Junior Nationals invitation list per policy.',
      actions: [
        { label:'Kept invited to Nationals', type:'keptInvited', note:'Kept invited per policy despite dual OC status', value:true  },
        { label:'Non-displacing only',       type:'dualEffect',  note:'Non-displacing — not kept on Nationals list',    value:true  },
        { label:'Dismiss',                   type:'review',      note:'Dismissed: reviewed',                            value:false },
      ],
    },
  };

  function getReviewActions(reviewFlags) {
    if (!reviewFlags?.length) return null;
    for (const flag of reviewFlags) {
      for (const [key, def] of Object.entries(REVIEW_ACTIONS)) {
        if (flag.includes(key)) return { ...def, flag };
      }
    }
    return {
      reason: reviewFlags[0],
      actions: [
        { label:'Mark as resolved', type:'review', note:'Manually resolved', value:false },
        { label:'Dismiss',          type:'review', note:'Dismissed',         value:false },
      ],
      flag: reviewFlags[0],
    };
  }

  function renderReviewSection(r) {
    const dm   = String(r.diveMeetsId || '').trim();
    const name = escJsAttr(r.athlete || '');
    const def  = getReviewActions(r.reviewFlags);
    if (!def) return '';
    return `<div class="rv-section">
      <div class="rv-header">
        <i class="ti ti-alert-triangle rv-icon" aria-hidden="true"></i>
        <div class="rv-title">Review required</div>
      </div>
      <div class="rv-reason">${esc(def.reason)}</div>
      <div class="rv-flag-text">${esc(def.flag || '')}</div>
      <div class="rv-actions">
        ${def.actions.map(a => `
          <button class="rv-btn rv-btn-${a.type==='review'?'dismiss':a.type}"
            onclick="window._qvReviewAction('${esc(dm)}','${name}','${esc(a.type)}',${a.value},'${escJsAttr(a.note || '')}')">
            ${esc(a.label)}
          </button>`).join('')}
      </div>
    </div>`;
  }

  window._qvReviewAction = function(dm, name, type, value, note) {
    if (typeof addOverride === 'function') {
      addOverride({
        type,
        value: Boolean(value),
        athleteId:   dm,
        athleteName: name,
        note: note || 'Review decision',
        resolvedReview: true,
      });
    }
    // Close the panel after action
    closePanel();
  };

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
          ${dm ? `<div class="panel-ath-meta" style="font-family:var(--f-mono,'JetBrains Mono',monospace);font-size:11px">ID ${esc(dm)}</div>` : '<div class="panel-ath-meta" style="color:#c0392b">No DiveMeets ID</div>'}
        </div>
      </div>

      ${dm
        ? `<a class="dm-full-btn" href="https://www.divemeets.com/profile.php?id=${esc(dm)}" target="_blank" rel="noopener">
        <i class="ti ti-external-link" aria-hidden="true"></i>
        View on DiveMeets — ${esc(r.athlete)}
      </a>`
        : `<div style="margin:0 16px 10px;font-size:11px;color:#c0392b;padding:6px 10px;background:#fff5f5;border-radius:var(--radius,6px);border:1px solid #fca5a5">
        No DiveMeets ID — cannot link to profile or cross-reference official lists
      </div>`}

      <div class="panel-flags">${flagBadges(r)}</div>

      ${(r.reviewFlags?.length && !r.reviewResolved) ? renderReviewSection(r) : ''}

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
          <div class="trail-stage-label">${r.zone ? `Zone ${esc(r.zone)}` : 'Zones'} — ${esc((r.meetName||'').replace(/^2026 USA Diving /,'').replace(/ Championships$/,''))}</div>
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

      ${r._dualCitizen ? `
        <div class="panel-section">
          <div class="panel-section-label">Dual citizenship — affects results</div>
          <div class="trail-nd-note">Competed for <strong>${esc(r._dualCitizen.federationRepresented)}</strong></div>
          <div class="trail-nd-note" style="font-size:10px;margin-top:2px">${esc(r._dualCitizen.events||'')}</div>
        </div>` : ''}

      ${r._ewcRegistered !== undefined ? `
        <div class="panel-section">
          <div class="panel-section-label">E/W/C registration</div>
          ${r._ewcRegistered
            ? `<div class="trail-reason good">Registered at ${esc(r._ewcMeet||'')} · ${r._ewcEntryEvents?.length||0} events</div>
               <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${(r._ewcEntryEvents||[]).map(e=>`<span class="qvb qvb-ewc">${esc(e)}</span>`).join('')}</div>`
            : `<div class="trail-reason" style="color:#c0392b">Not in entry list for ${esc(r._ewcMeet||'')}</div>`}
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
          <button class="panel-act-btn" onclick="window._qvOverride('${esc(dm)}','${escJsAttr(r.athlete)}','foreign','${!r.foreignDeclared}')">
            ${r.foreignDeclared ? 'Remove foreign flag' : 'Mark as foreign'}
          </button>
          <button class="panel-act-btn" onclick="window._qvOverride('${esc(dm)}','${escJsAttr(r.athlete)}','notAttending','${!r.declaredNotAttending}')">
            ${r.declaredNotAttending ? 'Mark attending' : 'Not attending'}
          </button>
          <button class="panel-act-btn" onclick="window._qvOverride('${esc(dm)}','${escJsAttr(r.athlete)}','hps','${!r.hps}')">
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
            <td><span class="zone-pill zone-${esc(r.zone)}">Zone ${esc(r.zone||'?')}</span></td>
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
            : `<div class="origin-from" style="color:var(--ink-4)">Regional origin not found</div>`;
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

    const hasResults = ewcHasResults();
    if (hasResults) {
      const ewcAll = allResults().filter(r => r.stage === 'EWC');
      const natl   = ewcAll.filter(r => r.advancesToNationals).length;
      const nd     = ewcAll.filter(r => r.nonDisplacing || r._nonDispAtEWC).length;
      const decl   = ewcAll.filter(r => r.declaredNotAttending).length;
      if (ctx) ctx.innerHTML = `
        <div class="context-title-block">
          <strong>E/W/C — Results & Qualifiers · ${qv.ewcMode==='meet'?'Browse by meet':'Browse by event'}</strong>
          <span>Top-3 per event advance direct; 4th–6th also advance if they meet the average-score bar; a top-3 decline invites the next up</span>
        </div>
        <div class="context-stat"><strong>${natl}</strong> → Junior Nationals</div>
        <div class="context-stat"><strong>${decl}</strong> declared not attending</div>
        <div class="context-stat"><strong>${nd}</strong> non-displacing</div>`;
    } else {
      const allEwcRows = allResults().filter(r => r.stage === 'Zones' && r.advancesToEWC && !r.advancesToNationals);
      if (ctx) ctx.innerHTML = `
        <div class="context-title-block">
          <strong>E/W/C — Qualified Field (from Zones) · ${qv.ewcMode==='meet'?'Browse by meet':'Browse by event'}</strong>
          <span>Zone places 4–18 entering East / West / Central · final E/W/C results are not shown here</span>
        </div>
        <div class="context-stat"><strong>${allEwcRows.length}</strong> qualified into E/W/C</div>
        <div class="context-stat"><strong>${allEwcRows.filter(r=>r.nonDisplacing||r._nonDispAtEWC).length}</strong> non-displacing</div>`;
    }

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
        <div style="padding:8px 12px;border-top:1px solid var(--line)">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--ink-4);margin-bottom:6px">Events</div>
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

    // Surface events that other E/W/C meets have but this meet's results feed
    // does not, so a gap in the DiveMeets scrape is visible instead of the meet
    // just looking "complete" with fewer events.
    let missingBanner = '';
    if (ewcHasResults()) {
      const allKeys  = new Set(allResults().filter(r => r.stage === 'EWC').map(r => r.eventKey));
      const hereKeys = new Set(quals.map(r => r.eventKey));
      const missing  = [...allKeys].filter(k => !hereKeys.has(k)).sort(cmpEventKey);
      if (missing.length) {
        missingBanner = `<div class="qv-data-banner">
          <i class="ti ti-alert-triangle" aria-hidden="true"></i>
          <div><strong>${missing.length} event${missing.length>1?'s':''} not in the ${esc(qv.ewcGroup)} results feed:</strong>
            ${missing.map(esc).join(' · ')}.
            <br>These are absent from the loaded DiveMeets results for this meet — not hidden by the app.
            They need to be re-scraped and reloaded before divers can be marked here.</div>
        </div>`;
      }
    }

    let html = pickerHTML + missingBanner + sortBarHTML(qv.ewcSort,'ewc',['elig','score','zone','name']);
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
              <td><span class="zone-pill zone-${esc(r.zone)}">Zone ${esc(r.zone||'?')}</span></td>
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
    // Prefer the actual E/W/C RESULTS (now loaded from Neon and grouped by the
    // meet each diver competed at). Fall back to the projected entry field
    // (Zone places 4-18) only when results aren't present yet.
    const useResults = ewcHasResults();
    const allRows = (useResults
      ? allResults().filter(r => r.stage === 'EWC')
      : allResults().filter(r => r.stage === 'Zones' && r.advancesToEWC && !r.advancesToNationals)
    ).map(enrichRow);
    const grouped = groupByEvent(allRows);

    let html = sortBarHTML(qv.ewcSort,'ewc-event',['elig','score','zone','name']);
    html += `<div class="qv-event-grid">`;
    grouped.forEach(([eventKey, rows]) => {
      const sorted = sortRows(rows, qv.ewcSort);
      const byGroup = {};
      EWC_GROUPS.forEach(g => {
        byGroup[g] = useResults
          ? rows.filter(r => (r.ewcMeet || r.ewc) === g)
          : rows.filter(r => (EWC_ZONES[g] || []).includes(r.zone));
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
              <td><span class="zone-pill zone-${esc(r.zone)}">Zone ${esc(r.zone||'?')}</span></td>
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

  /* ── Computed E/W/C → Junior Nationals (sourced from Neon) ──────
     The official list predates E/W/C, so this section computes the E/W/C
     qualifiers directly from the finalized results: top 3 by FINAL placement
     in each event, at each E/W/C meet (East / West / Central). It is preliminary
     by design — placement only — and cannot apply the registration-dependent
     pieces (non-displacing foreign finishers, average-score / replacement /
     declined adjustments), which is stated plainly in the section. */
  const EWC_NAT_SEASON = 2026;  // matches the loaded official list's season

  function cmpEventKey(a, b) {
    const grpOrd = { A:0, B:1, C:2, D:3, AQUA:4 };
    const dOrd   = { '1M':0, '3M':1, 'Platform':2 };
    const ag = a.match(/Group ([A-D])/)?.[1] || (a.includes('AQUA') ? 'AQUA' : 'Z');
    const bg = b.match(/Group ([A-D])/)?.[1] || (b.includes('AQUA') ? 'AQUA' : 'Z');
    const ad = a.includes('1M') ? '1M' : a.includes('3M') ? '3M' : 'Platform';
    const bd = b.includes('1M') ? '1M' : b.includes('3M') ? '3M' : 'Platform';
    return (grpOrd[ag] ?? 9) - (grpOrd[bg] ?? 9)
        || (a.includes('Girls') ? 0 : 1) - (b.includes('Girls') ? 0 : 1)
        || (dOrd[ad] ?? 9) - (dOrd[bd] ?? 9);
  }

  function loadComputedEWCNat() {
    // Deciding round per (event, meet) = Final if any final rows exist, else Prelim.
    // Top-3 by place on that round are the E/W/C qualifiers to Junior Nationals.
    const sql =
      "WITH ewc AS (" +
      "  SELECT event_key, ewc_meet, age_group, gender, discipline, round," +
      "         diver_id_dm, diver_first, diver_last, team_name, team_code, zone, place, score" +
      "  FROM core.event_results" +
      "  WHERE year = $1 AND stage = 'EWC' AND is_junior_circuit AND place IS NOT NULL" +
      ")," +
      "decider AS (" +
      "  SELECT event_key, ewc_meet," +
      "         CASE WHEN bool_or(round = 'Final') THEN 'Final' ELSE 'Prelim' END AS dr" +
      "  FROM ewc GROUP BY event_key, ewc_meet" +
      ")" +
      "SELECT e.event_key, e.ewc_meet, e.age_group, e.gender, e.discipline," +
      "       e.diver_id_dm, e.diver_first, e.diver_last, e.team_name, e.team_code, e.zone, e.place, e.score" +
      "  FROM ewc e" +
      "  JOIN decider d ON d.event_key = e.event_key AND d.ewc_meet = e.ewc_meet AND e.round = d.dr" +
      "  WHERE e.place <= 3" +                         // top-3 direct (Art.303(b)(3)(i))
      "  ORDER BY e.event_key, e.ewc_meet, e.place";
    return window.NEON.query(sql, [EWC_NAT_SEASON]).then(function (res) {
      const rows = res.rows || [];
      const byEvent = new Map();
      let totalSlots = 0, newSlots = 0; const newDivers = new Set();
      rows.forEach(function (r) {
        const ek = r.event_key;
        if (!byEvent.has(ek)) byEvent.set(ek, { eventKey: ek, meets: {} });
        const ev = byEvent.get(ek);
        const m = r.ewc_meet || '?';
        (ev.meets[m] = ev.meets[m] || []).push(r);
        totalSlots++;
        r._onOfficialList = isNatQualified(r.diver_id_dm, ek);
        if (!r._onOfficialList) { newSlots++; newDivers.add(String(r.diver_id_dm)); }
      });
      return { byEvent: byEvent, totalSlots: totalSlots, newSlots: newSlots, newDivers: newDivers.size, season: EWC_NAT_SEASON };
    });
  }

  function computedLoadingHTML() {
    return `<div class="qv-computed-wrap"><div class="qv-computed-loading">
      <span class="qv-spin"></span> Computing E/W/C qualifiers from the finalized results…
    </div></div>`;
  }
  function computedErrorHTML(msg) {
    return `<div class="qv-computed-wrap"><div class="qv-computed-error">
      Could not reach the results database to compute E/W/C qualifiers${msg ? ' (' + esc(msg) + ')' : ''}.
      The official list above is unaffected.
    </div></div>`;
  }

  function renderComputedEWCNatHTML(data) {
    if (!data || !data.totalSlots) {
      return `<div class="qv-computed-wrap"><div class="qv-computed-note">
        No finalized E/W/C results found for ${data ? data.season : EWC_NAT_SEASON} to compute qualifiers from.
      </div></div>`;
    }
    const events = [...data.byEvent.values()].sort(function (a, b) { return cmpEventKey(a.eventKey, b.eventKey); });
    const meetsOrder = ['East', 'Central', 'West'];
    let html = `<div class="qv-computed-wrap">
      <div class="qv-computed-head">
        <div class="qv-computed-title">
          <i class="ti ti-calculator" aria-hidden="true"></i>
          <div>
            <strong>E/W/C → Junior Nationals — computed from results</strong>
            <span>Top 3 by final placement in each event, at each E/W/C meet · ${data.season}</span>
          </div>
        </div>
        <div class="qv-computed-stats">
          <span class="qv-cstat"><strong>${data.totalSlots}</strong> qualifying places</span>
          <span class="qv-cstat new"><strong>${data.newSlots}</strong> not yet on official list</span>
          <span class="qv-cstat"><strong>${data.newDivers}</strong> athletes to add</span>
        </div>
      </div>
      <div class="qv-computed-note">
        <strong>Preliminary — by placement only.</strong> This does not remove non-displacing (foreign) finishers
        or apply the average-score, replacement, or declined adjustments, which require the registration file.
        Verify against the official list before publishing.
      </div>
      <div class="qv-event-grid">`;
    events.forEach(function (ev) {
      const meets = meetsOrder.filter(function (m) { return ev.meets[m]; })
        .concat(Object.keys(ev.meets).filter(function (m) { return meetsOrder.indexOf(m) < 0; }));
      const total = meets.reduce(function (a, m) { return a + ev.meets[m].length; }, 0);
      const evNew = meets.reduce(function (a, m) { return a + ev.meets[m].filter(function (r) { return !r._onOfficialList; }).length; }, 0);
      html += `<div class="qv-event-card">
        <div class="qv-event-header">
          <span class="qv-event-name">${esc(ev.eventKey)}</span>
          <span class="qv-event-meta">${evNew > 0 ? evNew + ' new ·' : ''}</span>
          <span class="qv-event-count">${total}</span>
        </div>
        <div class="qv-meet-cols">`;
      meets.forEach(function (m) {
        const list = ev.meets[m].slice().sort(function (a, b) { return Number(a.place) - Number(b.place); });
        html += `<div class="qv-meet-col">
          <div class="qv-meet-col-head">${esc(m)}</div>
          ${list.map(function (r) {
            const nm = `${r.diver_first || ''} ${r.diver_last || ''}`.trim();
            return `<div class="qv-comp-row${r._onOfficialList ? '' : ' is-new'}">
              <span class="qv-comp-place">${esc(String(r.place))}</span>
              <span class="qv-comp-name">${esc(nm)}${r.team_code ? `<span class="qv-comp-team">${esc(r.team_code)}</span>` : ''}</span>
              ${r._onOfficialList ? `<span class="qvb qvb-onlist" title="Already on the official list">on list</span>` : `<span class="qvb qvb-new" title="Not yet on the official list">NEW</span>`}
            </div>`;
          }).join('')}
        </div>`;
      });
      html += `</div></div>`;
    });
    html += `</div></div>`;
    return html;
  }

  function mountComputedEWCNat() {
    const host = $('qvComputedEWCNat');
    if (!host) return;
    if (!(window.NEON && window.NEON.query)) { host.innerHTML = ''; return; }  // offline → official list still shown
    if (qv.computedEWCNat) { host.innerHTML = renderComputedEWCNatHTML(qv.computedEWCNat); return; }
    if (qv.computedEWCNatError) { host.innerHTML = computedErrorHTML(qv.computedEWCNatError); return; }
    host.innerHTML = computedLoadingHTML();
    if (qv.computedEWCNatLoading) return;
    qv.computedEWCNatLoading = true;
    loadComputedEWCNat().then(function (data) {
      qv.computedEWCNat = data; qv.computedEWCNatLoading = false;
      const h = $('qvComputedEWCNat'); if (h) h.innerHTML = renderComputedEWCNatHTML(data);
    }).catch(function (err) {
      qv.computedEWCNatLoading = false;
      qv.computedEWCNatError = String((err && err.message) || err);
      const h = $('qvComputedEWCNat'); if (h) h.innerHTML = computedErrorHTML(qv.computedEWCNatError);
    });
  }

  /* ── Nationals View ────────────────────────────────────────── */
  /* Data-state banner: if the loaded official qualifier list was generated
     BEFORE E/W/C was scored, it cannot contain the E/W/C top-3 qualifiers.
     Detected from the data itself (list date vs E/W/C results date) so it
     disappears automatically once a refreshed post-E/W/C list is loaded. */
  function natStalenessBanner() {
    const ewcRes  = (window.EWC_2026_RESULTS && window.EWC_2026_RESULTS.results) || [];
    const ewcMeta = (window.EWC_2026_RESULTS && window.EWC_2026_RESULTS.meta)    || null;
    const natDate = (NAT && NAT.meta) ? NAT.meta.generatedAt : null;
    const ewcDate = ewcMeta ? ewcMeta.generatedAt : null;
    if (!ewcRes.length || !natDate || !ewcDate) return '';
    if (new Date(natDate) >= new Date(ewcDate)) return '';   // list already current
    return `<div class="qv-data-banner">
      <i class="ti ti-alert-triangle" aria-hidden="true"></i>
      <div>
        <strong>This official list predates E/W/C.</strong>
        It was generated ${esc(String(natDate).slice(0,10))}, before the East / West / Central
        championships were scored, so the <strong>E/W/C top-3 qualifiers to Junior Nationals are not yet included</strong>.
        It currently reflects Zone direct qualifiers (places 1–3) and pre-qualified athletes only.
        Load the refreshed post-E/W/C qualifier file to complete it.
      </div>
    </div>`;
  }

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

    // Computed E/W/C → Nationals layer (from Neon), appended below either path.
    tableWrap.insertAdjacentHTML('beforeend', '<div id="qvComputedEWCNat"></div>');
    mountComputedEWCNat();
  }

  function renderNatSidebar() {
    const el = $('eventList');
    if (!el) return;
    if (!NAT) { el.innerHTML = ''; return; }
    const events = [...new Set(NAT.qualifiers.map(q => q.qualifiedEventKeys).flat())].sort();
    el.innerHTML = `
      <div style="padding:8px 12px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:var(--ink-4);margin-bottom:6px">Events</div>
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

    let html = natStalenessBanner() + `<div class="qv-event-grid">`;
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
            const hps = isHPSPrequal(a.name) ? true : false;
            const ewcEvts = alreadyEvts.filter(e => norm(e) === norm(a.eventKey)).length > 0;
            return `<tr>
              <td><div class="ath-name">${esc(a.name)}</div></td>
              <td><a class="dm-ext-link" href="https://www.divemeets.com/profile.php?id=${esc(a.diveMeetsId)}" target="_blank" rel="noopener"><i class="ti ti-external-link" aria-hidden="true"></i> ${esc(a.diveMeetsId)}</a></td>
              <td style="font-size:11px">${a.qualifiedEvents.map(e=>esc(e)).join(', ')}</td>
              <td>${ewcEvts?`<span class="qvb qvb-nd">Competing EWC (non-disp.)</span>`:`<span class="qvb qvb-direct">Direct qualifier</span>`}</td>
              <td class="reg-col">
                ${hps ? `<button class="hps-attend-btn" onclick="window._qvToggleHPS('${esc(a.diveMeetsId)}')" title="${confirmed?'Confirmed':'Unconfirmed'}">
                  <i class="ti ti-${confirmed?'check':'help'}" style="color:${confirmed?'var(--pool, #009ac7)':'#b26a00'}"></i>
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
              <i class="ti ti-${confirmed?'check':'help'}" style="color:${confirmed?'var(--pool, #009ac7)':'#b26a00'}"></i>
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
    let html = natStalenessBanner() + `<div class="qv-event-grid">`;
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
            <td><span class="zone-pill zone-${esc(r.zone)}">Zone ${esc(r.zone||'?')}</span></td>
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
/* ── Data-state banner (stale list warning) ───────────── */
.qv-data-banner{display:flex;gap:12px;align-items:flex-start;margin:12px 16px;padding:12px 16px;
  background:#fff8ec;border:1px solid #f0d9a8;border-left:4px solid #b26a00;border-radius:8px;
  font-size:13.5px;line-height:1.5;color:#3a2e16}
.qv-data-banner .ti{color:#b26a00;font-size:20px;flex:0 0 auto;margin-top:1px}
.qv-data-banner strong{color:#171f69}
/* ── Computed E/W/C → Nationals section ───────────────── */
.qv-computed-wrap{margin:18px 16px 8px;border-top:2px solid #e7e9f2;padding-top:16px}
.qv-computed-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:8px}
.qv-computed-title{display:flex;gap:10px;align-items:flex-start}
.qv-computed-title .ti{font-size:22px;color:#009ac7;flex:0 0 auto;margin-top:2px}
.qv-computed-title strong{display:block;font-size:15px;color:#171f69}
.qv-computed-title span{display:block;font-size:12px;color:var(--ink-3,#5f6b7a);margin-top:1px}
.qv-computed-stats{display:flex;gap:8px;flex-wrap:wrap}
.qv-cstat{background:#eef1f8;border-radius:8px;padding:6px 12px;font-size:12px;color:#2d3a4a}
.qv-cstat strong{color:#171f69;font-size:15px;margin-right:3px}
.qv-cstat.new{background:#e6f5fb}
.qv-cstat.new strong{color:#0d7fa6}
.qv-computed-note{background:#fff8ec;border:1px solid #f0d9a8;border-left:4px solid #b26a00;border-radius:8px;
  padding:10px 14px;font-size:12.5px;line-height:1.5;color:#3a2e16;margin-bottom:14px}
.qv-computed-note strong{color:#171f69}
.qv-meet-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;padding:10px}
.qv-meet-col{background:var(--surface-2,#f7f8fc);border-radius:8px;padding:8px}
.qv-meet-col-head{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#171f69;font-weight:700;
  margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid #e3e6f0}
.qv-comp-row{display:flex;align-items:center;gap:7px;padding:4px 2px;font-size:12.5px}
.qv-comp-row.is-new{background:#e6f5fb;border-radius:5px;padding:4px 5px}
.qv-comp-place{font-variant-numeric:tabular-nums;font-weight:700;color:#171f69;width:16px;flex:0 0 auto}
.qv-comp-name{flex:1;color:#1c2430;display:flex;flex-direction:column;line-height:1.2}
.qv-comp-team{font-size:10px;color:var(--ink-4,#8a93a3)}
.qvb-new{background:#009ac7;color:#fff;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:4px;letter-spacing:.03em}
.qvb-onlist{background:#e3e6f0;color:#5f6b7a;font-size:9.5px;font-weight:600;padding:2px 6px;border-radius:4px}
.qv-computed-loading{padding:16px;color:var(--ink-3,#5f6b7a);font-size:13.5px;display:flex;align-items:center;gap:10px}
.qv-computed-error{padding:14px 16px;background:#fff8ec;border:1px solid #f0d9a8;border-radius:8px;font-size:13px;color:#3a2e16}
.qv-spin{width:16px;height:16px;border:2px solid #cdd3e6;border-top-color:#009ac7;border-radius:50%;display:inline-block;animation:qvspin .7s linear infinite}
@keyframes qvspin{to{transform:rotate(360deg)}}
/* ── Panel slide-in ────────────────────────────────────── */
#qv-panel{position:fixed;top:var(--bar-h,52px);right:-420px;width:400px;bottom:0;
  background:var(--surface);border-left:1px solid var(--line);
  display:flex;flex-direction:column;z-index:200;
  transition:right .22s cubic-bezier(.4,0,.2,1);overflow:hidden;
  box-shadow:-2px 0 0 var(--line)}
#qv-panel.open{right:0;box-shadow:-4px 0 24px rgba(13,17,48,.18)}
#qv-panel-close{position:absolute;top:10px;right:12px;background:rgba(255,255,255,.15);
  border:none;cursor:pointer;font-size:18px;color:#fff;
  width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%}
#qv-panel-close:hover{background:rgba(255,255,255,.28)}
#qv-panel-body{flex:1;overflow-y:auto;padding:0 0 24px;background:var(--surface)}

/* Panel header */
.panel-ath-header{display:flex;align-items:flex-start;gap:10px;padding:14px 16px 12px;background:var(--surface);border-bottom:1px solid var(--line-2)}
.panel-avatar{width:40px;height:40px;border-radius:50%;background:#E6F1FB;color:#0C447C;
  display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;flex-shrink:0}
.panel-ath-name{font-size:15px;font-weight:500;color:var(--ink)}
.panel-ath-meta{font-size:11px;color:var(--ink-3);margin-top:2px}
.dm-full-btn{display:flex;align-items:center;gap:6px;margin:0 16px 10px;padding:8px 14px;
  background:#E6F1FB;border:1px solid #85B7EB;border-radius:var(--radius-md,8px);
  color:#0C447C;font-size:12px;font-weight:500;text-decoration:none;cursor:pointer;width:auto}
.dm-full-btn:hover{background:#B5D4F4}
.panel-flags{display:flex;flex-wrap:wrap;gap:4px;padding:6px 16px 10px;border-bottom:1px solid var(--line)}
.panel-nat-events{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.panel-section{padding:10px 16px;border-top:1px solid var(--line-2)}
.panel-section-label{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-4);margin-bottom:6px}
.panel-override-row{display:flex;flex-wrap:wrap;gap:6px}
.panel-act-btn{padding:5px 10px;font-size:11px;border-radius:var(--radius,6px);
  border:1px solid var(--line);background:var(--surface-2);color:var(--ink-2);cursor:pointer}
.panel-act-btn:hover{background:var(--surface)}

/* Qualification trail */
.trail-card{border:1px solid var(--line);border-radius:var(--radius-md,8px);
  padding:10px 12px;margin-bottom:0;background:var(--surface)}
.trail-stage-label{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);margin-bottom:4px}
.trail-stats{display:flex;gap:12px;margin:6px 0}
.trail-stat{flex:1}
.trail-val{font-size:16px;font-weight:500;font-family:var(--f-mono,'JetBrains Mono',monospace);color:var(--ink)}
.trail-lbl{font-size:10px;color:var(--ink-3)}
.trail-reason{font-size:11px;padding:4px 8px;border-radius:4px;
  background:var(--surface-2);color:var(--ink-3);margin-top:6px}
.trail-reason.good{background:#ecfdf5;color:#065f46}
.trail-reason.ewc{background:#eff6ff;color:#1e40af}
.trail-reason.nd{background:#f3f4f6;color:#4b5563}
.trail-threshold{font-size:11px;color:var(--ink-3);margin-top:4px}
.thr-met{color:#059669;font-weight:500}.thr-miss{color:#e31937;font-weight:500}
.trail-nd-note{font-size:11px;color:var(--ink-3);background:var(--surface-2);
  border-radius:4px;padding:4px 8px;margin-top:4px}
.trail-connector{height:16px;display:flex;align-items:center;padding:0 17px;color:var(--ink-4);font-size:12px}
.trail-dest{margin-top:0}
.trail-dest-label{font-size:14px;font-weight:500;margin-top:4px;color:var(--ink)}
.dest-nat{border-color:#a7f3d0;background:#ecfdf5}
.dest-nat .trail-dest-label{color:#065f46}
.dest-ewc{border-color:#bae0f9;background:#eff6ff}
.dest-ewc .trail-dest-label{color:#1e40af}
.dest-none{border-color:var(--line);background:var(--surface-2)}

/* HPS toggle */
.hps-toggle{display:flex;align-items:center;gap:10px;padding:8px 10px;
  border:1px solid var(--line);border-radius:var(--radius-md,8px);cursor:pointer;background:var(--surface-2)}
.hps-pill{width:32px;height:18px;border-radius:9px;background:var(--line);position:relative;flex-shrink:0;transition:background .2s}
.hps-pill.on{background:#059669}
.hps-pip{width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:left .2s}
.hps-pill.on .hps-pip{left:16px}
.hps-lbl{font-size:12px;color:var(--ink)}
.panel-hps-note{font-size:11px;color:var(--ink-3);margin-bottom:8px}
.hps-attend-btn{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;
  border-radius:var(--radius,6px);border:1px solid var(--line);
  background:var(--surface-2);cursor:pointer;font-size:11px;color:var(--ink-2)}

/* Review section */
.rv-section{margin:0 16px 12px;border:1.5px solid #F59E0B;border-radius:var(--radius-md,8px);
  background:#FFFBEB;overflow:hidden}
.rv-header{display:flex;align-items:center;gap:8px;padding:10px 12px 6px;
  border-bottom:1px solid #FDE68A}
.rv-icon{font-size:15px;color:#D97706}
.rv-title{font-size:12px;font-weight:500;color:#92400E}
.rv-reason{font-size:11px;color:#78350F;padding:8px 12px 4px;line-height:1.5}
.rv-flag-text{font-size:10px;color:#B45309;padding:0 12px 8px;font-style:italic}
.rv-actions{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 12px;
  border-top:1px solid #FDE68A}
.rv-btn{padding:5px 10px;font-size:11px;font-weight:500;border-radius:var(--radius,6px);
  cursor:pointer;border:1px solid;transition:all .12s;white-space:nowrap}
.rv-btn-foreign{background:#FFF1F2;color:#9F1239;border-color:#FDA4AF}
.rv-btn-foreign:hover{background:#FFE4E6}
.rv-btn-dual,.rv-btn-dualEffect{background:#EFF6FF;color:#1E3A8A;border-color:#93C5FD}
.rv-btn-dual:hover,.rv-btn-dualEffect:hover{background:#DBEAFE}
.rv-btn-petition{background:#F3E8FF;color:#581C87;border-color:#C4B5FD}
.rv-btn-petition:hover{background:#EDE9FE}
.rv-btn-keptInvited{background:#ECFDF5;color:#065F46;border-color:#6EE7B7}
.rv-btn-keptInvited:hover{background:#D1FAE5}
.rv-btn-notAttending{background:#F9FAFB;color:#374151;border-color:#D1D5DB}
.rv-btn-notAttending:hover{background:#F3F4F6}
.rv-btn-dismiss{background:var(--surface-2);color:var(--ink-3);border-color:var(--line)}
.rv-btn-dismiss:hover{background:var(--surface);color:var(--ink)}

/* Review queue in flags tab */
.rq-wrap{padding:12px 16px;display:flex;flex-direction:column;gap:8px}
.rq-header{display:flex;align-items:center;justify-content:space-between;
  padding-bottom:8px;border-bottom:1px solid var(--line)}
.rq-title{font-size:13px;font-weight:500;color:var(--ink)}
.rq-progress{font-size:11px;color:var(--ink-3)}
.rq-group-label{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;
  color:var(--ink-4);margin:8px 0 4px}
.rq-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);
  overflow:hidden;transition:border-color .12s}
.rq-card:hover{border-color:#F59E0B}
.rq-card-header{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;cursor:pointer}
.rq-ath-name{font-weight:500;font-size:13px;color:var(--ink)}
.rq-ath-meta{font-size:10px;color:var(--ink-4);font-family:var(--f-mono,'JetBrains Mono',monospace);margin-top:1px}
.rq-ath-team{font-size:11px;color:var(--ink-3);margin-top:1px}
.rq-flag-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;
  font-weight:500;background:#FEF3C7;color:#92400E;margin-left:auto;flex-shrink:0}
.rq-reason{font-size:11px;color:var(--ink-3);padding:0 12px 4px;line-height:1.5}
.rq-acts{display:flex;flex-wrap:wrap;gap:5px;padding:8px 12px 10px;
  border-top:1px solid var(--line-2);background:var(--surface-2)}
.rq-empty{padding:24px;text-align:center;color:var(--ink-4);font-size:12px;
  background:var(--surface-2);border-radius:var(--radius-md,8px);
  border:1px dashed var(--line)}

/* Tables */
.qv-table{width:100%;border-collapse:collapse;font-size:12px}
.qv-table th{position:sticky;top:0;z-index:2;background:var(--surface-2);padding:6px 10px;
  text-align:left;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;
  color:var(--ink-3);border-bottom:1px solid var(--line);white-space:nowrap}
.qv-table td{padding:7px 10px;border-bottom:1px solid var(--line-2);vertical-align:middle;color:var(--ink-2)}
.qv-table tr:last-child td{border-bottom:none}
.qv-table tr[data-rid]{cursor:pointer}
.qv-table tr[data-rid]:hover td{background:var(--surface-2)}
.qv-row-nd{opacity:.65}
.ath-name{font-weight:500;font-size:13px;color:var(--ink)}
.ath-id{font-size:10px;color:var(--ink-4);font-family:var(--f-mono,'JetBrains Mono',monospace);margin-top:1px}
.team-col{font-size:11px;color:var(--ink-3)}
.score-col{font-family:var(--f-mono,'JetBrains Mono',monospace);font-size:12px;font-weight:500;color:var(--ink)}
.mono{font-family:var(--f-mono,'JetBrains Mono',monospace);font-size:12px;color:var(--ink-2)}
.reg-col{text-align:center}
.reg-yes{color:#059669;font-size:14px}.reg-pend{color:#d97706;font-size:14px}
.reg-no{color:#e31937;font-size:14px}.reg-nd{color:var(--ink-4);font-size:14px}
.reg-none{color:var(--ink-4);font-size:14px}

/* Zone pills */
.zone-pill{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700}
.zone-A,.zone-B{background:#ede9fe;color:#5b21b6}
.zone-C,.zone-D{background:#d1fae5;color:#065f46}
.zone-E,.zone-F{background:#fef3c7;color:#92400e}

/* Origin column */
.origin-from{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink-3)}
.origin-scores{font-size:10px;color:var(--ink-4);font-family:var(--f-mono,'JetBrains Mono',monospace);margin-top:2px}

/* Qual badges */
.qvb{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:500;margin-right:3px;white-space:nowrap}
.qvb-direct{background:#ecfdf5;color:#065f46}
.qvb-ewc{background:#eff6ff;color:#1e40af}
.qvb-avg{background:#f5f3ff;color:#5b21b6}
.qvb-ymca{background:#d1fae5;color:#065f46}
.qvb-repl{background:#fffbeb;color:#92400e}
.qvb-zone{background:#ede9fe;color:#5b21b6}
.qvb-nd{background:#f3f4f6;color:#4b5563}
.qvb-out{background:var(--surface-2);color:var(--ink-4)}
.qvb-foreign{background:#fff1f2;color:#9f1239}
.qvb-hps{background:#fff7ed;color:#9a3412}
.qvb-dual{background:#eff6ff;color:#1e3a8a}
.qvb-nat{background:#ecfdf5;color:#065f46}
.qvb-dna{background:#fffbeb;color:#92400e}
.qvb-bump{background:#fdf2f8;color:#86198f}

/* Meet picker */
.qv-meet-picker{display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.qv-meet-btn{flex:1;min-width:140px;border:1px solid var(--line);border-radius:var(--radius-md,8px);
  padding:10px 14px;cursor:pointer;background:var(--surface);text-align:left;transition:all .15s}
.qv-meet-btn:hover{border-color:var(--pool);box-shadow:0 0 0 3px var(--pool-soft)}
.qv-meet-btn.active{border-color:var(--pool);background:var(--pool-soft)}
.qv-meet-label{display:block;font-size:14px;font-weight:500;color:var(--ink)}
.qv-meet-sub{display:block;font-size:11px;color:var(--ink-3);margin-top:2px}
.qv-meet-count{display:block;font-size:11px;color:var(--ink-4);margin-top:4px}

/* Event grid */
.qv-event-grid{display:flex;flex-direction:column;gap:8px;padding:10px 16px 16px}
.qv-event-card{border:1px solid var(--line);border-radius:var(--radius-md,8px);
  background:var(--surface);overflow:hidden}
.qv-event-header{display:flex;align-items:center;gap:8px;padding:9px 12px;
  background:var(--surface-2);border-bottom:1px solid var(--line)}
.qv-event-name{font-weight:500;font-size:13px;color:var(--ink);flex:1}
.qv-event-meta{font-size:11px;color:var(--ink-3)}
.qv-event-count{font-size:11px;background:var(--line);padding:2px 8px;border-radius:10px;color:var(--ink-3)}

/* Sort bar */
.qv-sort-bar{display:flex;align-items:center;gap:6px;padding:8px 16px;
  border-bottom:1px solid var(--line);flex-wrap:wrap}
.qv-sort-lbl{font-size:11px;color:var(--ink-3);font-weight:500}
.qv-sort-btn{padding:3px 10px;border-radius:14px;font-size:11px;font-weight:500;
  border:1px solid var(--line);background:var(--surface);color:var(--ink-3);cursor:pointer}
.qv-sort-btn:hover{border-color:var(--pool);color:var(--pool)}
.qv-sort-btn.active{background:var(--pool);color:#fff;border-color:var(--pool)}

/* Mode toggle sidebar */
.qv-mode-toggle-sidebar{display:flex;flex-direction:column;gap:2px;padding:8px 8px 4px}
.qv-mode-btn{width:100%;padding:7px 10px;text-align:left;font-size:12px;
  border:1px solid transparent;border-radius:var(--radius,6px);cursor:pointer;
  background:transparent;color:var(--ink-3)}
.qv-mode-btn:hover{background:var(--surface-2)}
.qv-mode-btn.active{background:var(--surface-2);color:var(--ink);font-weight:500;border-color:var(--line)}

/* DiveMeets link */
.dm-ext-link{display:inline-flex;align-items:center;gap:3px;font-size:11px;
  color:var(--pool);text-decoration:none;padding:2px 6px;border-radius:4px;
  border:1px solid var(--pool-soft);background:var(--pool-soft);white-space:nowrap}
.dm-ext-link:hover{background:rgba(0,154,199,.2)}

/* Empty */
.qv-empty{padding:36px 24px;text-align:center;color:var(--ink-3);font-size:13px}

/* Context stats bar */
.context-stats{display:flex;gap:16px;padding:4px 0 0;
  font-size:12px;color:var(--ink-3);flex-wrap:wrap}
.context-stats span{white-space:nowrap}
.cs-accent-green{color:#059669;font-weight:500}
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

    // Click outside panel to close
    document.addEventListener('mousedown', e => {
      const panel = document.getElementById('qv-panel');
      if (panel && panel.classList.contains('open') && !panel.contains(e.target)) {
        // Don't close if clicking a table row (that would re-open it)
        if (!e.target.closest('[data-rid]') && !e.target.closest('.rq-card-header')) {
          window._qvClosePanel();
        }
      }
    });
  }

  window._qvClosePanel = closePanel;

  /* ── Wire into main.js hooks ───────────────────────────────── */
  /* ── Review queue renderer (used by main.js flags view) ────── */
  function renderReviewQueue(containerEl) {
    const all = typeof effectiveResults !== 'undefined'
      ? effectiveResults : (window.JUNIOR_RESULTS_DATA?.results || []);

    const byAth = new Map();
    all.forEach(r => {
      if (!r.reviewFlags?.length) return;
      const n = (r.athlete||'').trim();
      if (!n) return;
      if (!byAth.has(n)) byAth.set(n, {name:n, dm:String(r.diveMeetsId||''), team:r.team||'', flags:new Set(), stages:new Set()});
      r.reviewFlags.forEach(f => byAth.get(n).flags.add(f));
      byAth.get(n).stages.add(r.stage||'');
    });

    const resolvedNames = new Set(
      (state?.overrides||[]).filter(o=>o.active&&o.resolvedReview).map(o=>(o.athleteName||'').trim())
    );
    const pending = [...byAth.values()].filter(a => !resolvedNames.has(a.name));
    const total = byAth.size;
    const resolved = resolvedNames.size;

    if (!pending.length) {
      containerEl.innerHTML = `<div class="rq-empty">
        <i class="ti ti-circle-check" style="font-size:24px;color:#059669;display:block;margin-bottom:8px" aria-hidden="true"></i>
        All ${total} review items resolved.
      </div>`;
      return;
    }

    const byType = new Map();
    pending.forEach(a => {
      const flag = [...a.flags][0]||'';
      const typeKey = Object.keys(REVIEW_ACTIONS).find(k=>flag.includes(k))||'Other';
      if (!byType.has(typeKey)) byType.set(typeKey,[]);
      byType.get(typeKey).push({...a, primaryFlag:flag});
    });

    const groups = [...byType.entries()].map(([type, athletes]) => {
      const cards = athletes.map(a => {
        const def = getReviewActions([a.primaryFlag]);
        return `<div class="rq-card">
          <div class="rq-card-header" onclick="window._qvOpenPanelByName('${escJsAttr(a.name)}')">
            <div>
              <div class="rq-ath-name">${esc(a.name)}</div>
              ${a.dm?`<div class="rq-ath-meta">DM ${esc(a.dm)}</div>`:''}
              ${a.team?`<div class="rq-ath-team">${esc(a.team)}</div>`:''}
            </div>
            <span class="rq-flag-badge">${[...a.stages].join(' / ')}</span>
          </div>
          <div class="rq-reason">${def?esc(def.reason):esc(a.primaryFlag)}</div>
          <div class="rq-acts">
            ${(def?.actions||[]).map(act=>`
              <button class="rv-btn rv-btn-${act.type==='review'?'dismiss':act.type}"
                onclick="window._qvReviewAction('${esc(a.dm)}','${escJsAttr(a.name)}','${esc(act.type)}',${act.value},'${escJsAttr(act.note||'')}')">
                ${esc(act.label)}
              </button>`).join('')}
          </div>
        </div>`;
      }).join('');
      return `<div class="rq-group-label">${esc(type==='Other'?'Other flags':type)} — ${athletes.length}</div>${cards}`;
    }).join('');

    containerEl.innerHTML = `<div class="rq-wrap">
      <div class="rq-header">
        <div class="rq-title">Review queue</div>
        <div class="rq-progress">${pending.length} pending · ${resolved} resolved</div>
      </div>${groups}
    </div>`;
  }

  window._qvOpenPanelByName = function(name) {
    const all = typeof effectiveResults!=='undefined' ? effectiveResults : (window.JUNIOR_RESULTS_DATA?.results||[]);
    const row = all.find(r=>(r.athlete||'').trim()===name && r.reviewFlags?.length);
    if (row) openPanel(row, row.stage);
  };
  window._qvRenderReviewQueue = renderReviewQueue;

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
