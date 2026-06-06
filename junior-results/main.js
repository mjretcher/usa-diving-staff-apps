/* ─────────────────────────────────────────────────────────────
   USA Diving Junior Circuit — Staff App  (main.js)
   Stages: Regionals → Zones → E/W/C → Nationals
   Qualification logic per Articles 303–306
   ───────────────────────────────────────────────────────────── */

const DATA = window.JUNIOR_RESULTS_DATA || {
  meta: { counts: {} }, stages: [], events: [], results: [],
  athletes: [], officialZoneQualifiers: [],
};

/* ── Constants (Articles 303–306) ────────────────────────────── */
const ZONE_NATIONALS_DIRECT_LIMIT     = 3;  // Art.303(b)(2)(i)
const ZONE_NATIONALS_REPLACEMENT_MAX  = 6;  // Art.303(b)(2)(ii)
const ZONE_EWC_UPPER_LIMIT            = 18; // Art.304(a)(2)
const ZONE_EWC_LOWER_LIMIT            = 4;  // Art.304(a)(2)
const EWC_NATIONALS_DIRECT_LIMIT      = 3;  // Art.303(b)(3)(i)
const EWC_NATIONALS_AVG_MAX           = 6;  // Art.303(b)(3)(ii)
const REGIONAL_ZONE_LIMIT             = 15; // Art.305(a)(1)

// Zone → E/W/C alignment (Art.304 & Art.305)
const ZONE_TO_EWC = { A:'East', B:'East', C:'Central', D:'Central', E:'West', F:'West' };

/* ── Stage definitions ────────────────────────────────────────── */
const STAGES = [
  { id:'Regionals', label:'Regionals',  icon:'R', desc:'Region Championships → Zone advancement' },
  { id:'Zones',     label:'Zones',      icon:'Z', desc:'Zone Championships → E/W/C + Nationals' },
  { id:'EWC',       label:'E/W/C',      icon:'E', desc:'East/West/Central → Nationals' },
  { id:'Nationals', label:'Nationals',  icon:'N', desc:'Junior National Championship' },
];

const OVERRIDE_KEY = 'usad.juniorResults.overrides.v2';

/* ── Application state ────────────────────────────────────────── */
const state = {
  stage:     'Regionals',
  meetName:  '',
  eventCategory: '',
  discipline:'',
  gender:    '',
  ageGroup:  '',
  zone:      '',
  ewc:       '',
  search:    '',
  eventSearch: '',
  selectedEventId: '',
  flagMode:  'any',
  flags:     new Set(),
  view:      'results',
  overrides: loadOverrides(),
  drawerOpen: false,
  kpiDrill:  null,
  kpiDrillFilter: null,
};

let effectiveResults = [];
let effectiveEvents  = [];
let eventById        = new Map();

/* ── Flag definitions ─────────────────────────────────────────── */
const FLAG_DEFS = [
  { key:'foreignDeclared',            label:'Foreign' },
  { key:'dualDeclared',               label:'Dual citizen' },
  { key:'prequalified',               label:'Prequalified' },
  { key:'hps',                        label:'HPS' },
  { key:'ymca',                       label:'YMCA' },
  { key:'nonDisplacing',              label:'Non-displacing' },
  { key:'bumpIn',                     label:'Bump in' },
  { key:'officialAverageScoreQualifier', label:'Avg qualifier' },
  { key:'officialQualified',          label:'Official list' },
  { key:'declaredNotAttending',       label:'Not attending' },
  { key:'review',                     label:'Review' },
];

/* ── Stage filter config ──────────────────────────────────────── */
function stageFilterDefs() {
  const base = [
    { id:'meetFilter',      key:'meetName',     label:'Meet',      all:'All meets' },
    { id:'eventTypeFilter', key:'eventCategory',label:'Event type', all:'All types' },
    { id:'boardFilter',     key:'discipline',   label:'Board',     all:'All boards' },
    { id:'genderFilter',    key:'gender',       label:'Gender',    all:'All genders' },
    { id:'ageFilter',       key:'ageGroup',     label:'Age group', all:'All ages' },
  ];
  if (state.stage === 'Regionals') {
    base.push({ id:'zoneFilter', key:'zone', label:'Zone', all:'All zones' });
  }
  if (state.stage === 'Zones') {
    base.push(
      { id:'zoneFilter', key:'zone', label:'Zone', all:'All zones' },
      { id:'ewcFilter',  key:'ewc',  label:'E/W/C', all:'All E/W/C' },
    );
  }
  if (state.stage === 'EWC') {
    base.push({ id:'ewcFilter', key:'ewc', label:'E/W/C', all:'All E/W/C' });
  }
  base.push({ id:'searchInput', key:'search', label:'Search', type:'search' });
  return base;
}

/* ════════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════════ */
function init() {
  // Kick off async GitHub override sync — resolves in background,
  // patches state.overrides when the fetch returns.
  if (window.OverridesSync) {
    window.OverridesSync.init().then(() => {
      // Re-render once GitHub overrides are loaded
      recompute();
      renderAll();
    });
  }
  buildStageNav();
  buildViewTabs();
  recompute();
  buildFilters();
  buildFlagChips();
  renderAll();
  attachGlobalListeners();
}

/* ── Stage nav ────────────────────────────────────────────────── */
function buildStageNav() {
  const nav = $('stageNav');
  nav.innerHTML = STAGES.map(s => {
    const hasData = DATA.results.some(r => r.stage === s.id || stageMatch(r, s.id));
    return `<button class="stage-btn ${s.id === state.stage ? 'active' : ''} ${hasData ? 'has-data' : ''}"
      data-stage="${s.id}" title="${esc(s.desc)}">
      <span class="stage-dot"></span>${esc(s.label)}
    </button>`;
  }).join('');
  nav.querySelectorAll('.stage-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.stage = btn.dataset.stage;
      state.selectedEventId = '';
      state.view = 'results';
      nav.querySelectorAll('.stage-btn').forEach(b => b.classList.toggle('active', b === btn));
      buildViewTabs();
      buildFilters();
      recompute();
      renderAll();
    });
  });
}

function stageMatch(row, stageId) {
  if (stageId === 'EWC') return row.stage === 'EWC' || row.stage === 'East/West/Central';
  return row.stage === stageId;
}

/* ── View tabs ────────────────────────────────────────────────── */
function buildViewTabs() {
  const tabs = [
    { id:'results',  label:'Results' },
    { id:'bumps',    label:'Bumps & shifts' },
    { id:'flags',    label:'Flags' },
    { id:'athletes', label:'Athletes' },
    { id:'official', label:'Official list' },
    { id:'overrides',label:'Overrides' },
  ];
  const wrap = $('viewTabs');
  wrap.innerHTML = tabs.map(t =>
    `<button class="tab-btn ${state.view === t.id ? 'active' : ''}" data-view="${t.id}">${esc(t.label)}</button>`
  ).join('');
  wrap.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      wrap.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderTable();
    });
  });
}

/* ── Filter bar ───────────────────────────────────────────────── */
function buildFilters() {
  const wrap = $('filterFields');
  wrap.innerHTML = stageFilterDefs().map(f => {
    if (f.type === 'search') {
      return `<div class="filter-field">
        <span class="filter-label">${esc(f.label)}</span>
        <input id="${f.id}" type="search" placeholder="Name, ID, team…" value="${esc(state.search)}" class="filter-search-input">
      </div>`;
    }
    return `<div class="filter-field">
      <span class="filter-label">${esc(f.label)}</span>
      <select id="${f.id}"><option value="">${esc(f.all)}</option></select>
    </div>`;
  }).join('');

  stageFilterDefs().forEach(f => {
    const el = document.getElementById(f.id);
    if (!el) return;
    if (f.type === 'search') {
      el.addEventListener('input', () => { state.search = el.value; state.selectedEventId = ''; renderAll(); });
    } else {
      el.addEventListener('change', () => { state[f.key] = el.value; state.selectedEventId = ''; populateFilters(); renderAll(); });
    }
  });
  populateFilters();
}

function populateFilters() {
  stageFilterDefs().forEach(f => {
    if (f.type === 'search') return;
    const el = document.getElementById(f.id);
    if (!el) return;
    const options = uniqueVals(rowsForOptions(f.key), f.key);
    if (state[f.key] && !options.includes(state[f.key])) state[f.key] = '';
    el.innerHTML = `<option value="">${esc(f.all)}</option>` +
      options.map(v => `<option value="${escAttr(v)}" ${state[f.key] === v ? 'selected' : ''}>${esc(String(v))}</option>`).join('');
  });
}

function buildFlagChips() {
  const wrap = $('filterFlags');
  // Always render all flags — counts show how many match in current stage,
  // but the filter buttons are always visible regardless.
  function renderChips() {
    const stageRows = effectiveResults.filter(r => stageMatch(r, state.stage) || r.stage === state.stage);
    const counts = {};
    FLAG_DEFS.forEach(f => {
      counts[f.key] = stageRows.filter(r => {
        if (f.key === 'review') return r.reviewFlags?.length;
        return Boolean(r[f.key]);
      }).length;
    });

    // Mode toggle — minimal, no dropdown
    const modeHtml = `<div class="flag-mode-toggle">
      <button class="flag-mode-btn ${state.flagMode === 'any' ? 'active' : ''}" data-mode="any">Any</button>
      <button class="flag-mode-btn ${state.flagMode === 'all' ? 'active' : ''}" data-mode="all">All</button>
      ${state.flags.size > 0 ? `<button class="flag-clear-btn" id="flagClearBtn">Clear</button>` : ''}
    </div>`;

    const chipsHtml = FLAG_DEFS.map(f => {
      const active = state.flags.has(f.key);
      const count = counts[f.key];
      return `<button class="flag-toggle ${active ? 'active' : ''} ${count === 0 ? 'zero' : ''}"
        data-flag="${escAttr(f.key)}" type="button">
        <span class="flag-toggle-label">${esc(f.label)}</span>
        ${count > 0 ? `<span class="flag-toggle-count">${count}</span>` : ''}
      </button>`;
    }).join('');

    wrap.innerHTML = modeHtml + `<div class="flag-toggle-grid">${chipsHtml}</div>`;

    // Wire mode buttons
    wrap.querySelectorAll('.flag-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.flagMode = btn.dataset.mode;
        renderAll();
      });
    });
    // Wire clear
    const clearBtn = document.getElementById('flagClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      state.flags.clear();
      renderAll();
    });
    // Wire flag toggles
    wrap.querySelectorAll('.flag-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.flag;
        if (state.flags.has(key)) state.flags.delete(key);
        else state.flags.add(key);
        state.selectedEventId = '';
        renderAll();
      });
    });
  }

  renderChips();
  // Re-render chips when stage changes (counts update)
  // We hook into renderAll via a proxy below
  wrap._renderChips = renderChips;
}

/* ── Global listeners ─────────────────────────────────────────── */
function attachGlobalListeners() {
  $('overrideToggle').addEventListener('click', () => {
    state.drawerOpen = !state.drawerOpen;
    $('overrideDrawer').hidden = !state.drawerOpen;
    $('overrideToggle').setAttribute('aria-pressed', state.drawerOpen);
    $('overrideToggle').classList.toggle('topbar-btn-active', state.drawerOpen);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.drawerOpen) {
      state.drawerOpen = false;
      $('overrideDrawer').hidden = true;
      $('overrideToggle').setAttribute('aria-pressed', false);
      $('overrideToggle').classList.remove('topbar-btn-active');
    }
  });

  $('exportBtn').addEventListener('click', () => {
    const rows = currentRows();
    const text = buildCsv(rows, ',');
    const blob = new Blob([text], { type:'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `junior-${state.stage}-${state.view}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  $('copyTsvButton').addEventListener('click', () => {
    navigator.clipboard.writeText(buildCsv(currentRows(), '\t')).then(
      () => { $('rowCount').textContent = 'Copied to clipboard'; },
      () => { $('rowCount').textContent = 'Clipboard blocked'; }
    );
  });
  $('downloadCsvButton').addEventListener('click', () => $('exportBtn').click());
  $('clearEventButton').addEventListener('click', () => { state.selectedEventId = ''; renderAll(); });

  $('eventSearch').addEventListener('input', e => {
    state.eventSearch = e.target.value;
    renderEventList();
  });

  $('tableWrap').addEventListener('click', e => {
    const btn = e.target.closest('button[data-row-override]');
    if (!btn) return;
    const row = effectiveResults.find(r => r.id === btn.dataset.rowId);
    if (!row) return;
    addOverride({
      type: btn.dataset.rowOverride,
      value: btn.dataset.overrideValue === 'true',
      athleteId: row.diveMeetsId,
      athleteName: row.athlete,
      eventId: btn.dataset.rowOverride === 'notAttending' ? row.eventId : '',
      eventName: btn.dataset.rowOverride === 'notAttending' ? row.eventName : '',
      note: 'Row action',
    });
  });

  $('eventList').addEventListener('click', e => {
    const btn = e.target.closest('button[data-event-id]');
    if (!btn) return;
    state.selectedEventId = btn.dataset.eventId === state.selectedEventId ? '' : btn.dataset.eventId;
    renderEventList();
    renderContext();
    renderTable();
  });

  // Override form
  $('addOverrideButton').addEventListener('click', addOverrideFromForm);
  $('undoOverrideButton').addEventListener('click', undoOverride);
  $('redoOverrideButton').addEventListener('click', redoOverride);
  $('clearOverridesButton').addEventListener('click', () => {
    if (!state.overrides.length) return;
    if (!confirm('Clear all overrides?')) return;
    state.overrides = []; saveOverrides(); recompute(); renderAll();
  });
  $('exportOverridesButton').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.overrides, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'overrides.json';
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('overrideLog').addEventListener('click', e => {
    const btn = e.target.closest('button[data-override-action]');
    if (!btn) return;
    handleLogAction(btn.dataset.overrideAction, btn.dataset.overrideId);
  });
}

/* ════════════════════════════════════════════════════════════════
   RECOMPUTE (applies overrides + recalculates qualification)
   ════════════════════════════════════════════════════════════════ */
function recompute() {
  const lookup = buildOverrideLookup();
  effectiveResults = DATA.results.map(r => applyOverrides(r, lookup));
  recalcQualification(effectiveResults);
  effectiveResults.forEach(r => { r.effectiveFlags = buildFlags(r); });
  effectiveEvents = buildEffectiveEvents(effectiveResults);
  eventById = new Map(effectiveEvents.map(e => [e.id, e]));
}

function buildOverrideLookup() {
  const byAthlete = new Map(), byEventAthlete = new Map();
  state.overrides.filter(o => o.active).forEach(o => {
    const key = athleteKey(o);
    if (!key) return;
    if (o.eventId) {
      const k = `${o.eventId}|${key}`;
      if (!byEventAthlete.has(k)) byEventAthlete.set(k, []);
      byEventAthlete.get(k).push(o);
    } else {
      if (!byAthlete.has(key)) byAthlete.set(key, []);
      byAthlete.get(key).push(o);
    }
  });
  return { byAthlete, byEventAthlete };
}

function applyOverrides(row, lookup) {
  const r = JSON.parse(JSON.stringify(row));
  const key = athleteKey(r);
  const overrides = [
    ...(lookup.byAthlete.get(key) || []),
    ...(lookup.byEventAthlete.get(`${r.eventId}|${key}`) || []),
  ];
  r.overrideNotes = overrides.map(overrideDesc);

  const get = type => { const m = [...overrides].reverse().find(o => o.type === type); return m ? Boolean(m.value) : null; };

  r.foreignDeclared  = get('foreign')     ?? Boolean(row.foreignDeclared);
  r.dualDeclared     = get('dual')        ?? Boolean(row.dualDeclared);
  r.dualOtherCountry = get('dualEffect')  ?? Boolean(row.dualOtherCountry);
  r.declaredNotAttending = get('notAttending') ?? false;

  r.webpointNonUsEffective = Boolean(r.webpointNonUs && get('foreign') !== false);
  r.foreignInternational   = r.foreignDeclared || r.webpointNonUsEffective || r.dualOtherCountry;

  const ndReasons = [];
  if (r.hps)              ndReasons.push('HPS Tier 3 Junior squad');
  if (r.ymca && r.stage !== 'Zones') ndReasons.push('YMCA champion');
  if (r.foreignDeclared)  ndReasons.push('Foreign athlete');
  if (r.webpointNonUsEffective && !r.foreignDeclared) ndReasons.push('Webpoint non-US');
  if (r.dualOtherCountry) ndReasons.push('Dual — competed for another federation');
  // Ghost advancement: foreign/HPS athletes advance through all stages
  // as non-displacing participants — they compete but don't consume spots.
  // They appear in next-stage results with a ghost badge.
  r.ghostAdvances = Boolean(
    r.foreignDeclared || r.webpointNonUsEffective || r.hps || r.dualOtherCountry
  );

  r.prequalified       = Boolean(r.hps || r.ymca);
  r.prequalification   = [];
  if (r.hps)  r.prequalification.push('Junior Nationals: Tier 3 HPS');
  if (r.ymca) r.prequalification.push('E/W/C prelims: YMCA champion');

  // Exhibition in a qualifying event → highly likely foreign athlete
  // DiveMeets marks foreign divers as "exhibition" before uploading results
  const isExhibition = r.exhibition === true ||
    String(r.place || '').toUpperCase() === 'EX' ||
    String(r.qualified || '').toLowerCase().includes('exhibition');
  r.exhibitionLikelyForeign = isExhibition && r.qualifyingEvent && !r.hps && !r.ymca;

  r.nonDisplacingReason = ndReasons.join(' | ');
  r.nonDisplacing       = ndReasons.length > 0;
  r.countsTowardCutoff  = Boolean(r.qualifyingEvent && !r.nonDisplacing && r.placeNumber != null);

  return r;
}

/* ── Qualification recalculation ──────────────────────────────── */
function recalcQualification(rows) {
  const grouped = new Map();
  rows.forEach(r => {
    if (!grouped.has(r.eventId)) grouped.set(r.eventId, []);
    grouped.get(r.eventId).push(r);
  });
  grouped.forEach(eventRows => {
    eventRows.sort((a, b) => (a.placeNumber || 9999) - (b.placeNumber || 9999) || (b.score || 0) - (a.score || 0));
    const stage = eventRows[0]?.stage;
    if (stage === 'Zones') recalcZones(eventRows);
    else if (stage === 'EWC' || stage === 'East/West/Central') recalcEWC(eventRows);
    else recalcRegionals(eventRows);
  });
}

/* Art.305 — Regionals → Zones */
function recalcRegionals(rows) {
  let count = 0;
  const nonDispAhead = [], bumpIns = [];
  rows.forEach(r => {
    r.countingRank = ''; r.top15Qualifier = false; r.bumpIn = false;
    r.spotShifted = false; r.openedSpot = false; r.bumpedBy = []; r.openedFor = [];
    if (r.countsTowardCutoff) {
      count += 1;
      r.countingRank = count;
      r.top15Qualifier = count <= REGIONAL_ZONE_LIMIT;
    }
    r.officialAverageScoreQualifier = Boolean(
      r.qualifyingEvent && !r.nonDisplacing &&
      r.officialThresholdScore != null && r.score != null &&
      r.score >= r.officialThresholdScore && !r.top15Qualifier
    );
    r.officialQualified = Boolean(r.officialQualified && !r.nonDisplacing);
    if (r.nonDisplacing) {
      nonDispAhead.push(r);
    } else if (r.countingRank && r.placeNumber > r.countingRank && nonDispAhead.length) {
      r.spotShifted = true;
      r.bumpedBy = nonDispAhead.map(n => ({ athlete: n.athlete, place: n.place, reason: n.nonDisplacingReason }));
    }
    if (r.top15Qualifier && r.placeNumber > REGIONAL_ZONE_LIMIT) {
      r.bumpIn = true; bumpIns.push(r);
    }
    // Ghost athletes advance even if non-displacing
    r.advancesToZone = r.top15Qualifier || r.officialAverageScoreQualifier || r.officialQualified || r.ghostAdvances;
    r.qualificationStatus = regionalStatus(r);
  });
  rows.forEach(r => {
    if (r.nonDisplacing && r.qualifyingEvent && r.placeNumber <= Math.max(REGIONAL_ZONE_LIMIT, count)) {
      r.openedSpot = true;
      r.openedFor = bumpIns
        .filter(b => b.bumpedBy.some(x => x.athlete === r.athlete))
        .map(b => ({ athlete: b.athlete, place: b.place, countingRank: b.countingRank }));
    }
  });
}

function regionalStatus(r) {
  if (!r.qualifyingEvent)               return 'Non-qualifying event';
  if (r.nonDisplacing)                  return 'Non-displacing';
  if (r.top15Qualifier)                 return 'Zone qualifier — top 15';
  if (r.officialAverageScoreQualifier)  return 'Zone qualifier — 15th avg';
  if (r.officialQualified)              return 'Zone qualifier — official list';
  return 'Does not advance';
}

/* Art.303(b)(2) + Art.304(a)(2) — Zones → Nationals & E/W/C */
function recalcZones(rows) {
  let eligibleRank = 0, attendingRank = 0, declinedInDirect = 0;
  rows.forEach(r => {
    r.eligibleRank = ''; r.attendingEligibleRank = ''; r.bumpIn = false;
    r.openedSpot = false; r.spotShifted = false; r.bumpedBy = []; r.openedFor = [];
    r.juniorNationalStatus = ''; r.advancesToNationals = false; r.advancesToEWC = false;

    const eligible = r.qualifyingEvent !== false && !r.nonDisplacing && !r.prequalified;

    if (!eligible) {
      // YMCA qualifies to E/W/C from Zones (Art.304(a)(4))
      if (r.ymca && !r.hps && !r.foreignInternational) {
        r.advancesToEWC = true;
        r.advancesToZone = true;
        r.qualificationStatus = 'E/W/C qualifier — YMCA champion';
      } else if (r.ghostAdvances) {
        // Ghost: foreign/HPS athletes advance through all stages
        // as non-displacing — they participate but don't consume spots.
        r.advancesToZone = true;
        r.advancesToEWC  = true;  // shown at next stage, still non-displacing
        r.qualificationStatus = r.foreignDeclared
          ? 'Non-displacing — foreign athlete (advances as ghost)'
          : 'Non-displacing — HPS athlete (advances as ghost)';
      } else {
        r.qualificationStatus = r.nonDisplacing ? 'Non-displacing' : 'Not eligible';
        r.advancesToZone = false;
      }
      return;
    }

    eligibleRank += 1;
    r.eligibleRank = eligibleRank;

    if (r.declaredNotAttending) {
      r.qualificationStatus = 'Declared not attending';
      r.juniorNationalStatus = 'Declined';
      if (eligibleRank <= ZONE_NATIONALS_DIRECT_LIMIT) declinedInDirect += 1;
      r.openedSpot = eligibleRank <= ZONE_NATIONALS_DIRECT_LIMIT;
      r.advancesToZone = false;
      return;
    }

    attendingRank += 1;
    r.attendingEligibleRank = attendingRank;

    // Nationals: top 3 direct (Art.303(b)(2)(i))
    if (eligibleRank <= ZONE_NATIONALS_DIRECT_LIMIT) {
      r.juniorNationalStatus = 'Direct';
      r.advancesToNationals  = true;
      r.qualificationStatus  = 'Nationals qualifier — direct';
    }
    // Nationals: replacement if someone in 1-3 declined (Art.303(b)(2)(ii))
    else if (declinedInDirect > 0 &&
             eligibleRank <= ZONE_NATIONALS_REPLACEMENT_MAX &&
             attendingRank <= ZONE_NATIONALS_DIRECT_LIMIT) {
      r.juniorNationalStatus = 'Replacement';
      r.advancesToNationals  = true;
      r.bumpIn               = true;
      r.qualificationStatus  = 'Nationals qualifier — replacement';
    }
    // Replacement pool (Art.303(b)(2)(ii))
    else if (eligibleRank <= ZONE_NATIONALS_REPLACEMENT_MAX) {
      r.juniorNationalStatus = 'Replacement pool';
      r.qualificationStatus  = 'Replacement eligible if 1–3 declines';
    }

    // E/W/C: places 4-18 (Art.304(a)(2))
    if (eligibleRank >= ZONE_EWC_LOWER_LIMIT && eligibleRank <= ZONE_EWC_UPPER_LIMIT) {
      r.advancesToEWC = true;
      if (!r.advancesToNationals) {
        r.qualificationStatus = `E/W/C qualifier — place ${eligibleRank}`;
      }
    }

    // E/W/C via 18th avg threshold (Art.304(a)(3))
    r.officialAverageScoreQualifier = Boolean(
      r.officialThresholdScore != null && r.score != null &&
      r.score >= r.officialThresholdScore && !r.advancesToEWC
    );
    if (r.officialAverageScoreQualifier) {
      r.advancesToEWC = true;
      if (!r.advancesToNationals) r.qualificationStatus = 'E/W/C qualifier — 18th avg';
    }

    r.advancesToZone = r.advancesToNationals || r.advancesToEWC;
    if (!r.qualificationStatus) r.qualificationStatus = 'Does not advance';
  });
}

/* Art.303(b)(3) — E/W/C → Nationals */
function recalcEWC(rows) {
  let eligibleRank = 0, attendingRank = 0, declinedInDirect = 0;
  rows.forEach(r => {
    r.eligibleRank = ''; r.attendingEligibleRank = '';
    r.bumpIn = false; r.openedSpot = false; r.advancesToNationals = false;

    const eligible = !r.nonDisplacing && !r.prequalified;
    if (!eligible) {
      r.qualificationStatus = r.nonDisplacing ? 'Non-displacing' : 'Not eligible';
      return;
    }

    eligibleRank += 1;
    r.eligibleRank = eligibleRank;

    if (r.declaredNotAttending) {
      if (eligibleRank <= EWC_NATIONALS_DIRECT_LIMIT) declinedInDirect += 1;
      r.openedSpot = eligibleRank <= EWC_NATIONALS_DIRECT_LIMIT;
      r.qualificationStatus = 'Declared not attending';
      return;
    }

    attendingRank += 1;
    r.attendingEligibleRank = attendingRank;

    // Top 3 direct (Art.303(b)(3)(i))
    if (eligibleRank <= EWC_NATIONALS_DIRECT_LIMIT) {
      r.advancesToNationals = true;
      r.qualificationStatus = 'Nationals qualifier — direct';
    }
    // Average top-3 score qualifiers up to 6th place (Art.303(b)(3)(ii))
    else if (r.officialThresholdScore != null && r.score != null && r.score >= r.officialThresholdScore && eligibleRank <= EWC_NATIONALS_AVG_MAX) {
      r.advancesToNationals = true;
      r.bumpIn = true;
      r.qualificationStatus = 'Nationals qualifier — avg top-3 score';
    }
    // Replacement if someone in 1-3 declined
    else if (declinedInDirect > 0 && eligibleRank <= EWC_NATIONALS_AVG_MAX && attendingRank <= EWC_NATIONALS_DIRECT_LIMIT) {
      r.advancesToNationals = true;
      r.bumpIn = true;
      r.qualificationStatus = 'Nationals qualifier — replacement';
    }
    else {
      r.qualificationStatus = 'Does not advance';
    }
    r.advancesToZone = r.advancesToNationals;
  });
}

/* ── Effective events ─────────────────────────────────────────── */
function buildEffectiveEvents(rows) {
  const grouped = new Map();
  rows.forEach(r => {
    if (!grouped.has(r.eventId)) grouped.set(r.eventId, []);
    grouped.get(r.eventId).push(r);
  });
  return [...grouped.entries()].map(([id, evRows]) => {
    const orig = DATA.events.find(e => e.id === id) || evRows[0];
    return {
      ...orig,
      entries:            evRows.length,
      countable:          evRows.filter(r => r.countsTowardCutoff).length,
      nonDisplacing:      evRows.filter(r => r.nonDisplacing).length,
      foreign:            evRows.filter(r => r.foreignDeclared || r.webpointNonUsEffective).length,
      dual:               evRows.filter(r => r.dualDeclared).length,
      notAttending:       evRows.filter(r => r.declaredNotAttending).length,
      bumpIns:            evRows.filter(r => r.bumpIn).length,
      advancingZone:      evRows.filter(r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC).length,
      reviewRows:         evRows.filter(r => r.reviewFlags?.length).length,
    };
  }).sort(evCompare);
}

function buildFlags(r) {
  const f = [];
  if (r.foreignDeclared)             f.push('Foreign declared');
  if (r.webpointNonUsEffective && !r.foreignDeclared) f.push('Webpoint non-US');
  if (r.dualDeclared)                f.push(r.dualOtherCountry ? 'Dual affects results' : 'Dual citizen');
  if (r.hps)                         f.push('HPS');
  if (r.ymca)                        f.push('YMCA');
  if (r.prequalified)                f.push('Prequalified');
  if (r.declaredNotAttending)        f.push('Not attending');
  if (r.bumpIn)                      f.push('Bump in');
  if (r.reviewFlags?.length)         f.push('Review');
  return f;
}

/* ════════════════════════════════════════════════════════════════
   RENDER
   ════════════════════════════════════════════════════════════════ */
function renderAll() {
  renderOverrideBadge();
  renderOverrideDrawer();
  renderKpis();
  renderEventList();
  renderContext();
  renderTable();
  // Re-render flag chips to update counts for current stage
  const flagWrap = $('filterFlags');
  if (flagWrap && flagWrap._renderChips) flagWrap._renderChips();
}

/* ── Override badge ───────────────────────────────────────────── */
function renderOverrideBadge() {
  const active = state.overrides.filter(o => o.active).length;
  const badge = $('overrideBadge');
  badge.textContent = active;
  badge.hidden = active === 0;
}

/* ── Override drawer ──────────────────────────────────────────── */
function renderOverrideDrawer() {
  const active = state.overrides.filter(o => o.active);
  $('undoOverrideButton').disabled = !active.length;
  $('redoOverrideButton').disabled = !state.overrides.some(o => !o.active);
  $('clearOverridesButton').disabled = !state.overrides.length;
  $('exportOverridesButton').disabled = !state.overrides.length;

  $('overrideSummary').innerHTML = [
    active.length + ' active',
    effectiveResults.filter(r => r.declaredNotAttending).length + ' not attending',
    effectiveResults.filter(r => r.dualOtherCountry).length + ' dual effect',
  ].map(t => `<span class="drawer-summary-pill">${esc(t)}</span>`).join('');

  if (!state.overrides.length) {
    $('overrideLog').innerHTML = `<div style="color:var(--ink-3);font-size:13px">No overrides yet.</div>`;
    return;
  }
  $('overrideLog').innerHTML = [...state.overrides].reverse().map(o => `
    <div class="log-item ${o.active ? '' : 'inactive'}">
      <div>
        <div class="log-item-label">${esc(overrideTypeLabel(o.type))}: ${o.value ? 'On' : 'Off'}</div>
        <div class="log-item-sub">${esc(o.athleteName || '—')} ${o.athleteId ? '· ' + o.athleteId : ''}</div>
        ${o.eventName ? `<div class="log-item-sub">${esc(o.eventName)}</div>` : ''}
        ${o.note ? `<div class="log-item-sub">${esc(o.note)}</div>` : ''}
      </div>
      <div class="log-item-actions">
        <button class="btn-ghost btn-sm" data-override-action="toggle" data-override-id="${escAttr(o.id)}">${o.active ? 'Off' : 'On'}</button>
        <button class="btn-ghost btn-sm btn-danger" data-override-action="delete" data-override-id="${escAttr(o.id)}">Del</button>
      </div>
    </div>`).join('');
}

/* ── KPIs — interactive drill-down cards ──────────────────────── */
function renderKpis() {
  const rows = filteredRows({ ignoreEvent: true });
  const athletes = new Set(rows.map(r => r.diveMeetsId || r.athlete));
  const advancing = rows.filter(r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC).length;

  const kpis = [
    { key:'all',         label:'Rows',           value: rows.length,
      sub: `${athletes.size} athletes` },
    { key:'advancing',   label:'Advancing',      value: advancing, accent:'green',
      sub: state.stage === 'Zones' ? '→ Nationals / E/W/C' : '→ next stage',
      filter: r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC },
    { key:'nonDisp',     label:'Non-displacing', value: rows.filter(r=>r.nonDisplacing).length,
      sub: 'no spot consumed',
      filter: r => r.nonDisplacing },
    { key:'foreign',     label:'Foreign',        value: rows.filter(r=>r.foreignDeclared||r.webpointNonUsEffective||r.exhibitionLikelyForeign).length,
      accent: rows.filter(r=>r.foreignDeclared||r.webpointNonUsEffective||r.exhibitionLikelyForeign).length ? 'red' : '',
      sub: rows.filter(r=>r.exhibitionLikelyForeign&&!r.foreignDeclared).length
             ? `+${rows.filter(r=>r.exhibitionLikelyForeign&&!r.foreignDeclared).length} exhibition` : 'declared',
      filter: r => r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign },
    { key:'dual',        label:'Dual',           value: rows.filter(r=>r.dualDeclared).length,
      sub: rows.filter(r=>r.dualOtherCountry).length + ' affect results',
      filter: r => r.dualDeclared },
    { key:'hps',         label:'HPS',            value: rows.filter(r=>r.hps).length,
      sub: 'pre-qualified',
      filter: r => r.hps },
    { key:'notAtt',      label:'Not Attending',  value: rows.filter(r=>r.declaredNotAttending).length,
      accent: rows.filter(r=>r.declaredNotAttending).length ? 'amber' : '',
      sub: rows.filter(r=>r.openedSpot).length + ' spots opened',
      filter: r => r.declaredNotAttending },
    { key:'bumps',       label:'Bump-ins',       value: rows.filter(r=>r.bumpIn).length,
      sub: 'moved up the list',
      filter: r => r.bumpIn },
  ];

  const active = state.kpiDrill;
  $('kpiRow').innerHTML = kpis.map(k => {
    const isActive = active === k.key;
    return `<div class="kpi-card ${k.accent ? 'accent-' + k.accent : ''} ${isActive ? 'kpi-active' : ''} ${k.key !== 'all' ? 'kpi-clickable' : ''}"
      data-kpi="${k.key}" title="${k.key !== 'all' ? 'Click to filter · click again to clear' : ''}">
      <div class="kpi-value">${k.value.toLocaleString()}</div>
      <div class="kpi-label">${esc(k.label)}</div>
      ${k.sub ? `<div class="kpi-sub">${esc(k.sub)}</div>` : ''}
      ${isActive ? '<div class="kpi-active-dot"></div>' : ''}
    </div>`;
  }).join('');

  $('kpiRow').querySelectorAll('.kpi-clickable').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.kpi;
      state.kpiDrill = state.kpiDrill === key ? null : key;
      state.kpiDrillFilter = kpis.find(k => k.key === key)?.filter || null;
      renderKpis();
      renderTable();
      showKpiDetail(key, rows, kpis);
    });
  });
}

function showKpiDetail(key, allRows, kpis) {
  const kpi = kpis.find(k => k.key === key);
  if (!kpi || !kpi.filter || state.kpiDrill !== key) {
    const panel = $('kpiDetailPanel');
    if (panel) panel.remove();
    return;
  }

  const subset = allRows.filter(kpi.filter);
  const existing = $('kpiDetailPanel');
  if (existing) existing.remove();
  if (!subset.length) return;

  // Build grouped detail HTML
  let html = '';

  if (key === 'foreign') {
    // Group by athlete, show all their events
    const byAthlete = new Map();
    subset.forEach(r => {
      const k = r.diveMeetsId || r.athlete;
      if (!byAthlete.has(k)) byAthlete.set(k, { name: r.athlete, id: r.diveMeetsId, team: r.team, rows: [] });
      byAthlete.get(k).rows.push(r);
    });
    const rows = [...byAthlete.values()].sort((a,b) => a.name.localeCompare(b.name));
    html = `<div class="kpi-detail-grid">
      ${rows.map(a => `
        <div class="kdi-athlete">
          <div class="kdi-name">${esc(a.name)} <span class="kdi-id">${esc(a.id||'')}</span></div>
          <div class="kdi-team">${esc(a.team||'')}</div>
          ${a.rows.map(r => `
            <div class="kdi-event-row">
              <span class="kdi-event">${esc(r.eventName||'')}</span>
              <span class="mono kdi-place">#${esc(String(r.place||'?'))}</span>
              <span class="mono kdi-score">${fmtScore(r.score)}</span>
              <span class="kdi-badge ${r.exhibitionLikelyForeign && !r.foreignDeclared ? 'kdi-warn' : 'kdi-nd'}">${r.exhibitionLikelyForeign && !r.foreignDeclared ? 'Exhibition (likely foreign)' : 'Non-displacing'}</span>
              ${r.openedFor?.length ? `<span class="kdi-bump">Opened spot → ${r.openedFor.map(x=>x.athlete).join(', ')}</span>` : ''}
            </div>`).join('')}
        </div>`).join('')}
    </div>`;
  } else if (key === 'notAtt') {
    html = `<div class="kpi-detail-grid">
      ${subset.map(r => `
        <div class="kdi-athlete">
          <div class="kdi-name">${esc(r.athlete)} <span class="kdi-id">${esc(r.diveMeetsId||'')}</span></div>
          <div class="kdi-event-row">
            <span class="kdi-event">${esc(r.eventName||'')}</span>
            <span class="mono kdi-place">Elig #${esc(String(r.eligibleRank||r.countingRank||'?'))}</span>
            <span class="mono kdi-score">${fmtScore(r.score)}</span>
            ${r.openedSpot ? `<span class="kdi-bump">Spot opened</span>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
  } else if (key === 'bumps') {
    html = `<div class="kpi-detail-grid">
      ${subset.map(r => `
        <div class="kdi-athlete">
          <div class="kdi-name">${esc(r.athlete)} <span class="kdi-id">${esc(r.diveMeetsId||'')}</span></div>
          <div class="kdi-event-row">
            <span class="kdi-event">${esc(r.eventName||'')}</span>
            <span class="mono kdi-place">Counted #${esc(String(r.countingRank||r.eligibleRank||'?'))}</span>
            <span class="mono kdi-score">${fmtScore(r.score)}</span>
            <span class="kdi-badge kdi-bump-badge">Bumped in</span>
            ${r.bumpedBy?.length ? `<span class="kdi-bump">By: ${r.bumpedBy.map(x=>x.athlete).join(', ')}</span>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
  } else {
    html = `<div class="kpi-detail-grid">
      ${subset.map(r => `
        <div class="kdi-athlete">
          <div class="kdi-name">${esc(r.athlete)} <span class="kdi-id">${esc(r.diveMeetsId||'')}</span></div>
          <div class="kdi-event-row">
            <span class="kdi-event">${esc(r.eventName||'')}</span>
            <span class="mono kdi-place">#${esc(String(r.place||r.eligibleRank||'?'))}</span>
            <span class="mono kdi-score">${fmtScore(r.score)}</span>
            <span class="kdi-badge kdi-qual">${esc(r.qualificationStatus||'')}</span>
          </div>
        </div>`).join('')}
    </div>`;
  }

  const panel = document.createElement('div');
  panel.id = 'kpiDetailPanel';
  panel.className = 'kpi-detail-panel';
  panel.innerHTML = `
    <div class="kdi-header">
      <span class="kdi-title">${esc(kpi.label)} — ${subset.length} ${subset.length === 1 ? 'row' : 'rows'}</span>
      <button class="btn-ghost btn-sm" id="kpiDetailClose">✕</button>
    </div>
    ${html}`;
  $('kpiRow').insertAdjacentElement('afterend', panel);
  $('kpiDetailClose').addEventListener('click', () => {
    state.kpiDrill = null; state.kpiDrillFilter = null;
    panel.remove(); renderKpis(); renderTable();
  });
}

/* ── Event list ───────────────────────────────────────────────── */
function renderEventList() {
  const rows = filteredRows({ ignoreEvent: true }).filter(r => {
    if (r.stage !== state.stage && !stageMatch(r, state.stage)) return false;
    return true;
  });

  const grouped = new Map();
  rows.forEach(r => {
    if (!grouped.has(r.eventId)) grouped.set(r.eventId, []);
    grouped.get(r.eventId).push(r);
  });

  const query = (state.eventSearch || '').toLowerCase();
  let events = [...grouped.entries()]
    .map(([id, evRows]) => ({ event: eventById.get(id), rows: evRows }))
    .filter(x => x.event && (!query || x.event.eventName?.toLowerCase().includes(query)))
    .sort((a, b) => evCompare(a.event, b.event));

  if (!events.length) {
    $('eventList').innerHTML = `<div class="empty-state"><div class="empty-state-title">No events</div></div>`;
    return;
  }

  $('eventList').innerHTML = events.map(({ event, rows: evRows }) => {
    const active = event.id === state.selectedEventId;
    const advancing = evRows.filter(r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC).length;
    const nd = evRows.filter(r => r.nonDisplacing).length;
    const notAtt = evRows.filter(r => r.declaredNotAttending).length;
    return `<button type="button" class="event-item ${active ? 'active' : ''}" data-event-id="${escAttr(event.id)}">
      <span class="event-item-name">${esc(event.eventName || event.id)}</span>
      <span class="event-item-meta">${esc((event.meetName || '').replace('2026 USA Diving Junior ', '').replace('2026 USA Diving ', ''))}</span>
      <div class="event-item-badges">
        ${advancing ? `<span class="mini-badge green">${advancing} advancing</span>` : ''}
        ${nd        ? `<span class="mini-badge slate">${nd} ND</span>` : ''}
        ${notAtt    ? `<span class="mini-badge amber">${notAtt} DNA</span>` : ''}
      </div>
    </button>`;
  }).join('');
}

/* ── Context bar ──────────────────────────────────────────────── */
function renderContext() {
  const rows = filteredRows();
  const selected = state.selectedEventId ? eventById.get(state.selectedEventId) : null;
  const title = selected ? (selected.eventName || selected.id) : 'All matching events';
  const sub   = selected
    ? [selected.meetName, selected.zone ? 'Zone ' + selected.zone : '', selected.ewc, selected.eventCategory].filter(Boolean).join(' · ')
    : `${state.stage} — use filters or click an event`;
  const threshold = selected?.officialThresholdScore != null ? fmtScore(selected.officialThresholdScore) : '—';
  const advancing = rows.filter(r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC).length;

  $('resultsContext').innerHTML = `
    <div class="context-title-block">
      <strong>${esc(title)}</strong>
      <span>${esc(sub)}</span>
    </div>
    ${[
      ['Entries',  rows.length],
      ['Advancing', advancing],
      ['Threshold', threshold],
      ['Not att.', rows.filter(r => r.declaredNotAttending).length],
    ].map(([l, v]) => `
      <div class="context-stat">
        <span class="context-stat-value">${esc(String(v))}</span>
        <span class="context-stat-label">${esc(l)}</span>
      </div>`).join('')}
  `;
}

/* ── Table dispatch ───────────────────────────────────────────── */
function renderTable() {
  const rows = currentRows();
  $('rowCount').textContent = `${rows.length.toLocaleString()} ${state.view === 'athletes' ? 'athletes' : 'rows'}`;

  if (!rows.length) {
    $('tableWrap').innerHTML = `<div class="empty-state">
      <div class="empty-state-title">No records</div>
      <div class="empty-state-sub">Try adjusting your filters.</div>
    </div>`;
    return;
  }

  if (state.view === 'athletes')   return renderAthleteTable(rows);
  if (state.view === 'overrides')  return renderOverridesTable();
  if (state.view === 'official')   return renderOfficialTable(rows);
  renderResultTable(rows);
}

function currentRows() {
  let rows = sortedRows(filteredRows());
  if (state.view === 'bumps')    return rows.filter(r => r.bumpIn || r.spotShifted || r.openedSpot || r.officialAverageScoreQualifier);
  if (state.view === 'flags')    return rows.filter(r => r.effectiveFlags?.length || r.reviewFlags?.length || r.overrideNotes?.length);
  if (state.view === 'athletes') return buildAthleteRows(rows);
  if (state.view === 'overrides')return [...state.overrides].reverse();
  if (state.view === 'official') return officialRows();
  return rows;
}

/* ── Results table ────────────────────────────────────────────── */
function renderResultTable(rows) {
  const isZone = rows[0]?.stage === 'Zones';
  const isEWC  = rows[0]?.stage === 'EWC' || rows[0]?.stage === 'East/West/Central';

  const cols = ['Place', isZone || isEWC ? 'Elig' : 'Rank', 'Athlete', 'Team', 'Score', 'Qualification', 'Flags', 'Actions'].filter(Boolean);

  const tbody = rows.map(r => {
    const rowCls = [
      (r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign) ? 'row-foreign' : '',
      r.dualDeclared ? 'row-dual' : '',
      r.declaredNotAttending ? 'row-decline' : '',
    ].filter(Boolean).join(' ');

    // Only show rank info if meaningful (non-trivial)
    const rankCol = (isZone || isEWC) ? eligCell(r) : rankCell(r);

    return `<tr class="${rowCls}">
      <td class="mono" style="width:44px">${esc(r.place || '')}</td>
      <td class="mono" style="width:54px;color:var(--ink-3)">${rankCol}</td>
      <td>${athleteCell(r)}</td>
      <td class="td-team">${esc(r.team || '')}</td>
      <td class="td-score mono">${fmtScore(r.score)}</td>
      <td class="td-status">${statusBadge(r)}${inlineBumpNote(r)}</td>
      <td>${flagPills(r)}</td>
      <td>${rowActions(r)}</td>
    </tr>`;
  }).join('');

  $('tableWrap').innerHTML = tableHtml(cols, tbody);
}

/* ── Athletes table ───────────────────────────────────────────── */
function renderAthleteTable(rows) {
  const cols = ['Athlete', 'ID', 'Team', 'Events', 'Advancing', 'ND', 'Flags', 'Pre-qualified to'];
  const tbody = rows.map(r => `<tr>
    <td><span class="athlete-name">${esc(r.athlete)}</span></td>
    <td class="mono athlete-id">${esc(r.diveMeetsId)}</td>
    <td>${esc(r.teams.join(', '))}</td>
    <td class="mono">${r.events}</td>
    <td class="mono">${r.advancing}</td>
    <td class="mono">${r.nonDisplacing}</td>
    <td>${pillList(r.flags)}</td>
    <td>${esc(r.prequalification.join(' | '))}</td>
  </tr>`).join('');
  $('tableWrap').innerHTML = tableHtml(cols, tbody);
}

/* ── Overrides table ──────────────────────────────────────────── */
function renderOverridesTable() {
  const rows = [...state.overrides].reverse();
  if (!rows.length) {
    $('tableWrap').innerHTML = `<div class="empty-state"><div class="empty-state-title">No overrides</div></div>`;
    return;
  }
  const cols = ['State', 'Type', 'Value', 'Athlete', 'Event', 'Note', 'Created', 'Actions'];
  const tbody = rows.map(o => `<tr>
    <td>${o.active ? pill('Active','hps') : pill('Inactive','decline')}</td>
    <td>${esc(overrideTypeLabel(o.type))}</td>
    <td>${esc(o.value ? 'On' : 'Off')}</td>
    <td><span class="athlete-name">${esc(o.athleteName||'—')}</span><div class="athlete-id">${esc(o.athleteId||'')}</div></td>
    <td>${esc(o.eventName||'All events')}</td>
    <td>${esc(o.note||'')}</td>
    <td class="mono" style="font-size:12px">${esc(new Date(o.createdAt).toLocaleString())}</td>
    <td>
      <div class="row-actions">
        <button class="row-act-btn" data-override-action="toggle" data-override-id="${escAttr(o.id)}">${o.active?'Deactivate':'Reactivate'}</button>
        <button class="row-act-btn" style="color:var(--red)" data-override-action="delete" data-override-id="${escAttr(o.id)}">Delete</button>
      </div>
    </td>
  </tr>`).join('');
  $('tableWrap').innerHTML = tableHtml(cols, tbody);
  // wire up buttons
  $('tableWrap').querySelectorAll('button[data-override-action]').forEach(btn => {
    btn.addEventListener('click', () => handleLogAction(btn.dataset.overrideAction, btn.dataset.overrideId));
  });
}

/* ── Official qual list ───────────────────────────────────────── */
function renderOfficialTable(rows) {
  // Try DATA.officialZoneQualifiers first, fall back to computed advancing rows
  const official = officialRows();
  if (!official.length) {
    $('tableWrap').innerHTML = `<div class="empty-state">
      <div class="empty-state-title">No official list yet</div>
      <div class="empty-state-sub">Data will appear once qualifier lists are finalized.</div>
    </div>`;
    return;
  }
  const cols = ['Zone / Group', 'Event', 'Rank', 'Athlete', 'ID', 'Team', 'Score', 'Status'];
  const tbody = official.map(r => `<tr>
    <td style="font-weight:600">${esc(r.zone || r.ewc || r.group || '')}</td>
    <td>${esc(r.eventName || '')}</td>
    <td class="mono">${esc(String(r.rank || r.eligibleRank || ''))}</td>
    <td><span class="athlete-name">${esc(r.athlete)}</span></td>
    <td class="mono athlete-id">${esc(r.diveMeetsId || '')}</td>
    <td>${esc(r.team || '')}</td>
    <td class="mono">${fmtScore(r.score)}</td>
    <td>${statusBadge(r)}</td>
  </tr>`).join('');
  $('tableWrap').innerHTML = tableHtml(cols, tbody);
}

function officialRows() {
  if (DATA.officialZoneQualifiers?.length) {
    return DATA.officialZoneQualifiers.filter(r => {
      if (state.zone && r.zone !== state.zone) return false;
      if (state.search) {
        const q = state.search.toLowerCase();
        if (![r.athlete, r.diveMeetsId, r.team, r.zone, r.eventName].join(' ').toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (a.zone||'').localeCompare(b.zone||'') || (a.eventSort||999) - (b.eventSort||999) || (a.rank||9999) - (b.rank||9999));
  }
  // Compute from effective results
  return filteredRows({ ignoreEvent: true })
    .filter(r => r.advancesToNationals || r.advancesToZone || r.advancesToEWC)
    .sort((a, b) => (a.zone||'').localeCompare(b.zone||'') || evCompare(eventById.get(a.eventId)||{}, eventById.get(b.eventId)||{}) || (a.eligibleRank||9999) - (b.eligibleRank||9999));
}

/* ════════════════════════════════════════════════════════════════
   FILTERING
   ════════════════════════════════════════════════════════════════ */
function filteredRows(opts = {}) {
  const ignoreEvent = Boolean(opts.ignoreEvent);
  const q = state.search.toLowerCase();
  return effectiveResults.filter(r => {
    if (!stageMatch(r, state.stage) && r.stage !== state.stage) return false;
    if (!opts.ignoreKpi && state.kpiDrillFilter && !state.kpiDrillFilter(r)) return false;
    if (!ignoreEvent && state.selectedEventId && r.eventId !== state.selectedEventId) return false;
    if (state.meetName      && r.meetName      !== state.meetName)      return false;
    if (state.eventCategory && r.eventCategory !== state.eventCategory) return false;
    if (state.discipline    && r.discipline    !== state.discipline)    return false;
    if (state.gender        && r.gender        !== state.gender)        return false;
    if (state.ageGroup      && r.ageGroup      !== state.ageGroup)      return false;
    if (state.zone          && r.zone          !== state.zone)          return false;
    if (state.ewc           && r.ewc           !== state.ewc)           return false;
    if (q && !searchText(r).includes(q)) return false;
    if (!matchFlags(r)) return false;
    return true;
  });
}

function rowsForOptions(exceptKey) {
  return effectiveResults.filter(r => {
    if (!stageMatch(r, state.stage) && r.stage !== state.stage) return false;
    const keys = ['meetName','eventCategory','discipline','gender','ageGroup','zone','ewc'];
    return keys.every(k => {
      if (k === exceptKey || !state[k]) return true;
      return String(r[k] || '') === state[k];
    });
  });
}

function matchFlags(r) {
  if (!state.flags.size) return true;
  const checks = [...state.flags].map(f => {
    if (f === 'review') return Boolean(r.reviewFlags?.length);
    return Boolean(r[f]);
  });
  return state.flagMode === 'all' ? checks.every(Boolean) : checks.some(Boolean);
}

function searchText(r) {
  return [r.athlete, r.diveMeetsId, r.team, r.eventName, r.meetName, (r.effectiveFlags||[]).join(' ')].join(' ').toLowerCase();
}

function sortedRows(rows) {
  return [...rows].sort((a, b) =>
    (a.placeNumber || 9999) - (b.placeNumber || 9999) ||
    evCompare(eventById.get(a.eventId)||{}, eventById.get(b.eventId)||{}) ||
    (b.score || 0) - (a.score || 0)
  );
}

function buildAthleteRows(rows) {
  const grouped = new Map();
  rows.forEach(r => {
    const k = `${r.diveMeetsId}|${r.athlete}`;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k).push(r);
  });
  return [...grouped.values()].map(evRows => {
    const first = evRows[0];
    return {
      athlete: first.athlete,
      diveMeetsId: first.diveMeetsId,
      teams: [...new Set(evRows.map(r => r.team).filter(Boolean))],
      events: evRows.length,
      advancing: evRows.filter(r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC).length,
      nonDisplacing: evRows.filter(r => r.nonDisplacing).length,
      flags: [...new Set(evRows.flatMap(r => r.effectiveFlags || []))],
      prequalification: [...new Set(evRows.flatMap(r => r.prequalification || []))],
    };
  }).sort((a, b) => a.athlete.localeCompare(b.athlete));
}

/* ════════════════════════════════════════════════════════════════
   OVERRIDES
   ════════════════════════════════════════════════════════════════ */
function loadOverrides() {
  // Initial synchronous load from localStorage.
  // OverridesSync.init() will overwrite state.overrides with the
  // GitHub-synced version as soon as the async fetch completes.
  try {
    const p = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '[]');
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

function saveOverrides() {
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(state.overrides));
  // Async push to GitHub shared storage
  if (window.OverridesSync) {
    window.OverridesSync.save(state.overrides);
  }
}

function addOverride(input) {
  if (!input.athleteId && !input.athleteName) return;
  state.overrides.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    active: true,
    type: input.type,
    value: Boolean(input.value),
    athleteId:   String(input.athleteId   || '').trim(),
    athleteName: String(input.athleteName || '').trim(),
    eventId:   input.eventId   || '',
    eventName: input.eventName || '',
    note:      String(input.note || '').trim(),
  });
  saveOverrides();
  recompute();
  renderAll();
}

function addOverrideFromForm() {
  const type = $('overrideType').value;
  if (type === 'notAttending' && !state.selectedEventId) {
    alert('Select an event first before adding a not-attending override.');
    return;
  }
  addOverride({
    type,
    value: $('overrideValue').value === 'true',
    athleteId: $('overrideAthleteId').value,
    athleteName: $('overrideAthleteName').value,
    eventId: type === 'notAttending' ? state.selectedEventId : '',
    eventName: type === 'notAttending' && state.selectedEventId ? (eventById.get(state.selectedEventId)?.eventName || '') : '',
    note: $('overrideNote').value || 'Manual entry',
  });
  $('overrideNote').value = '';
}

function undoOverride() {
  const t = [...state.overrides].reverse().find(o => o.active);
  if (!t) return;
  t.active = false; saveOverrides(); recompute(); renderAll();
}

function redoOverride() {
  const t = [...state.overrides].reverse().find(o => !o.active);
  if (!t) return;
  t.active = true; saveOverrides(); recompute(); renderAll();
}

function handleLogAction(action, id) {
  if (action === 'toggle') {
    const o = state.overrides.find(x => x.id === id);
    if (o) { o.active = !o.active; saveOverrides(); recompute(); renderAll(); }
  }
  if (action === 'delete') {
    state.overrides = state.overrides.filter(x => x.id !== id);
    saveOverrides(); recompute(); renderAll();
  }
}

function overrideTypeLabel(type) {
  return { foreign:'Foreign athlete', dual:'Dual citizen', dualEffect:'Dual affects results', notAttending:'Not attending' }[type] || type;
}

function overrideDesc(o) {
  return `${overrideTypeLabel(o.type)} ${o.value ? 'on' : 'off'}${o.note ? ' — ' + o.note : ''}`;
}

/* ════════════════════════════════════════════════════════════════
   CELL RENDERERS
   ════════════════════════════════════════════════════════════════ */
function athleteCell(r) {
  const showEvent = !state.selectedEventId; // hide event name when one event is selected
  return `<div class="athlete-main">
    <span class="athlete-name">${esc(r.athlete)}</span>
    ${r.diveMeetsId ? `<span class="athlete-id">${esc(r.diveMeetsId)}</span>` : ''}
  </div>${showEvent ? `<div class="athlete-event">${esc(r.eventName || '')}</div>` : ''}`;
}

function rankCell(r) {
  // Zones/EWC: show eligible rank cleanly
  if ((r.stage === 'Zones' || r.stage === 'EWC') && r.eligibleRank) {
    return `<span style="color:var(--ink-3);font-size:11px">elig</span> ${esc(String(r.eligibleRank))}`;
  }
  return esc(String(r.countingRank || ''));
}

function eligCell(r) {
  if (!r.attendingEligibleRank && !r.eligibleRank) return '';
  // Show compactly: "att 1" or if they differ "4 → att 3"
  if (r.attendingEligibleRank && r.eligibleRank && r.attendingEligibleRank !== r.eligibleRank) {
    return `<span style="color:var(--ink-3)">${r.eligibleRank}</span>→<strong>${r.attendingEligibleRank}</strong>`;
  }
  return esc(String(r.attendingEligibleRank || r.eligibleRank || ''));
}

function statusBadge(r) {
  const s = r.qualificationStatus || '';
  if (!s) return '';
  let cls = 'status-out';
  let label = 'Does not advance';
  if (s.includes('direct'))                        { cls = 'status-qualifier';      label = 'Direct qualifier'; }
  else if (s.includes('top 15'))                   { cls = 'status-qualifier';      label = 'Zone qualifier'; }
  else if (s.includes('average score threshold'))  { cls = 'status-average';        label = 'Avg threshold'; }
  else if (s.includes('E/W/C') && s.includes('position')) { cls = 'status-ewc';    label = 'E/W/C — position'; }
  else if (s.includes('E/W/C'))                    { cls = 'status-ewc';            label = 'E/W/C qualifier'; }
  else if (s.includes('decline replacement'))      { cls = 'status-replacement';    label = 'Decline fill'; }
  else if (s.includes('Replacement pool') || s.includes('replacement eligible')) { cls = 'status-replacement'; label = 'Replacement pool'; }
  else if (s.includes('replacement'))              { cls = 'status-replacement';    label = 'Replacement'; }
  else if (s.includes('YMCA'))                     { cls = 'status-qualifier';      label = 'YMCA champion'; }
  else if (s.includes('Prequalified'))             { cls = 'status-qualifier';      label = 'Prequalified'; }
  else if (s.includes('Non-displacing'))           { cls = 'status-non-displacing'; label = 'Non-displacing'; }
  else if (s.includes('Declared not'))             { cls = 'status-decline';        label = 'Not attending'; }
  else if (s.includes('Does not') || s.includes('Non-qualifying')) { cls = 'status-out'; label = 'Does not advance'; }
  else if (s.includes('Not eligible'))             { cls = 'status-out';            label = 'Not eligible'; }
  else { label = s.length > 28 ? s.slice(0, 26) + '…' : s; }
  return `<span class="status ${cls}" title="${esc(s)}">${esc(label)}</span>`;
}

/* Only show truly actionable info inline — threshold lives in context bar */
function inlineBumpNote(r) {
  const parts = [];
  if (r.bumpIn && r.bumpedBy?.length)    parts.push(`↑ By: ${r.bumpedBy.map(x => x.athlete).join(', ')}`);
  else if (r.bumpIn)                     parts.push('↑ Bumped in');
  if (r.openedSpot && r.openedFor?.length) parts.push(`↓ Opened → ${r.openedFor.map(x => x.athlete).join(', ')}`);
  else if (r.openedSpot)                 parts.push('↓ Spot opened');
  if (r.overrideNotes?.length)           parts.push(`✎ ${r.overrideNotes[0]}`);
  if (!parts.length) return '';
  return `<div style="font-size:10.5px;color:var(--ink-3);margin-top:3px">${parts.map(p => esc(p)).join(' · ')}</div>`;
}

function detailCell(r) { return ''; } // kept for compatibility — logic moved to inlineBumpNote

function flagPills(r) {
  const pills = [];
  if (r.foreignDeclared)                                    pills.push(pill('Foreign','foreign'));
  if (r.webpointNonUsEffective && !r.foreignDeclared)       pills.push(pill('Webpoint','foreign'));
  if (r.dualDeclared)                                       pills.push(pill(r.dualOtherCountry ? 'Dual effect' : 'Dual','dual'));
  if (r.hps)                                                pills.push(pill('HPS','hps'));
  if (r.ymca)                                               pills.push(pill('YMCA','ymca'));
  if (r.prequalified)                                       pills.push(pill('Prequalified','preq'));
  if (r.declaredNotAttending)                               pills.push(pill('Not attending','decline'));
  if (r.bumpIn)                                             pills.push(pill('Bump in','bump'));
  if (r.reviewFlags?.length)                                pills.push(pill('Review','review'));
  return `<div class="pill-list">${pills.join('')}</div>`;
}

function pillList(labels) {
  return `<div class="pill-list">${labels.map(l => pill(l, pillCls(l))).join('')}</div>`;
}

function pill(label, cls) {
  return `<span class="pill pill-${cls}">${esc(label)}</span>`;
}

function pillCls(l) {
  const s = String(l).toLowerCase();
  if (s.includes('foreign') || s.includes('non-us') || s.includes('webpoint')) return 'foreign';
  if (s.includes('dual'))     return 'dual';
  if (s.includes('hps'))      return 'hps';
  if (s.includes('ymca'))     return 'ymca';
  if (s.includes('preq'))     return 'preq';
  if (s.includes('not att') || s.includes('decline')) return 'decline';
  if (s.includes('bump') || s.includes('avg')) return 'bump';
  return 'review';
}

function rowActions(r) {
  const fn = !r.foreignDeclared, dn = !r.dualDeclared, de = !r.dualOtherCountry, na = !r.declaredNotAttending;
  return `<div class="row-actions">
    <button class="row-act-btn" data-row-override="foreign"     data-override-value="${fn}" data-row-id="${escAttr(r.id)}">${fn?'Foreign':'Not foreign'}</button>
    <button class="row-act-btn" data-row-override="dual"        data-override-value="${dn}" data-row-id="${escAttr(r.id)}">${dn?'Dual':'No dual'}</button>
    <button class="row-act-btn" data-row-override="dualEffect"  data-override-value="${de}" data-row-id="${escAttr(r.id)}">${de?'Dual effect':'No effect'}</button>
    <button class="row-act-btn" data-row-override="notAttending" data-override-value="${na}" data-row-id="${escAttr(r.id)}">${na?'Not attending':'Attending'}</button>
  </div>`;
}

function tableHtml(cols, tbody) {
  return `<table>
    <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>`;
}

/* ════════════════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════════════════ */
function buildCsv(rows, delim) {
  if (state.view === 'athletes') {
    const headers = ['Athlete','DiveMeetsID','Teams','Events','Advancing','NonDisplacing','Flags','Prequalification'];
    const lines = [headers.join(delim)];
    rows.forEach(r => lines.push([r.athlete, r.diveMeetsId, r.teams.join('; '), r.events, r.advancing, r.nonDisplacing, r.flags.join('; '), r.prequalification.join('; ')].map(v => csvVal(v, delim)).join(delim)));
    return lines.join('\n');
  }
  if (state.view === 'overrides') {
    const headers = ['Active','Type','Value','Athlete','DiveMeetsID','Event','Note','CreatedAt'];
    const lines = [headers.join(delim)];
    ([...state.overrides].reverse()).forEach(o => lines.push([o.active?'Yes':'No', overrideTypeLabel(o.type), o.value?'On':'Off', o.athleteName, o.athleteId, o.eventName||'All events', o.note, o.createdAt].map(v => csvVal(v, delim)).join(delim)));
    return lines.join('\n');
  }
  const headers = ['Stage','Meet','Event','Place','CountingRank','EligibleRank','Athlete','DiveMeetsID','Team','Score','QualificationStatus','NotAttending','Flags','NonDisplacingReason','Threshold','OverrideNotes'];
  const lines = [headers.join(delim)];
  rows.forEach(r => lines.push([r.stage, r.meetName, r.eventName, r.place, r.countingRank, r.eligibleRank, r.athlete, r.diveMeetsId, r.team, r.score, r.qualificationStatus, r.declaredNotAttending?'Yes':'No', (r.effectiveFlags||[]).join('; '), r.nonDisplacingReason, r.officialThresholdScore, (r.overrideNotes||[]).join('; ')].map(v => csvVal(v, delim)).join(delim)));
  return lines.join('\n');
}

function csvVal(v, delim) {
  const s = v == null ? '' : String(v);
  if (delim === '\t') return s.replace(/\t/g, ' ').replace(/\n/g, ' ');
  return `"${s.replace(/"/g, '""')}"`;
}

/* ════════════════════════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════════════════════════ */
function $(id) { return document.getElementById(id); }

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function escAttr(v) { return esc(v).replace(/`/g,'&#96;'); }

function fmtScore(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2);
}

function uniqueVals(rows, key) {
  return [...new Set(rows.map(r => r[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function evCompare(a, b) {
  return ((a.region || 999) - (b.region || 999)) || ((a.sort || 999) - (b.sort || 999)) || String(a.eventName || '').localeCompare(String(b.eventName || ''));
}

function athleteKey(v) {
  const id = String(v.athleteId || v.diveMeetsId || '').trim();
  if (id) return `id:${id}`;
  const name = String(v.athleteName || v.athlete || '').trim().toLowerCase();
  return name ? `name:${name}` : '';
}

/* ── Boot ─────────────────────────────────────────────────────── */
init();
