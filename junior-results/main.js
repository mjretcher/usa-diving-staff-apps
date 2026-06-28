/* ─────────────────────────────────────────────────────────────
   USA Diving Junior Circuit — Staff App  (main.js)
   Stages: Regionals → Zones → E/W/C → Nationals
   Qualification logic per Articles 303–306

   All extension logic (YMCA, zone foreign fix, qualification
   impact, workbench, dashboard controls) is consolidated here
   to eliminate monkey-patch race conditions.
   ───────────────────────────────────────────────────────────── */

const DATA = window.JUNIOR_RESULTS_DATA || {
  meta: { counts: {} }, stages: [], events: [], results: [],
  athletes: [], officialZoneQualifiers: [],
};

/* ── Constants (Articles 303–306) ────────────────────────────── */
const ZONE_NATIONALS_DIRECT_LIMIT     = 3;   // Art.303(b)(2)(i)
const ZONE_NATIONALS_REPLACEMENT_MAX  = 6;   // Art.303(b)(2)(ii)
const ZONE_EWC_UPPER_LIMIT            = 18;  // Art.304(a)(2)
const ZONE_EWC_LOWER_LIMIT            = 4;   // Art.304(a)(2)
const EWC_NATIONALS_DIRECT_LIMIT      = 3;   // Art.303(b)(3)(i)
const EWC_NATIONALS_AVG_MAX           = 6;   // Art.303(b)(3)(ii)
const REGIONAL_ZONE_LIMIT             = 15;  // Art.305(a)(1)

// Zone → E/W/C alignment (Art.304 & Art.305)
const ZONE_TO_EWC = { A:'East', B:'East', C:'Central', D:'Central', E:'West', F:'West' };

/* ── YMCA E/W/C Prequalified Champions (2026) ─────────────────── */
const YMCA_CHAMPIONS = [
  {name:'Jhoset Quintero',  diveMeetsId:'42164', gender:'Boys',  ageGroup:'Group D', events:['1M','Platform']},
  {name:'Aidan Turner',     diveMeetsId:'42115', gender:'Boys',  ageGroup:'Group D', events:['3M']},
  {name:'Jeslynn Fang',     diveMeetsId:'42007', gender:'Girls', ageGroup:'Group D', events:['1M']},
  {name:'Alex Birrer',      diveMeetsId:'42153', gender:'Girls', ageGroup:'Group D', events:['3M']},
  {name:'Diya Firtel',      diveMeetsId:'42320', gender:'Girls', ageGroup:'Group D', events:['Platform']},
  {name:'Levi Berlyn',      diveMeetsId:'41581', gender:'Boys',  ageGroup:'Group C', events:['1M']},
  {name:'Haskell Fagan',    diveMeetsId:'41797', gender:'Boys',  ageGroup:'Group C', events:['3M','Platform']},
  {name:'Sadie Marks',      diveMeetsId:'41894', gender:'Girls', ageGroup:'Group C', events:['1M','3M']},
  {name:'Katerina Akimov',  diveMeetsId:'41650', gender:'Girls', ageGroup:'Group C', events:['Platform']},
  {name:'Arthur Palladino', diveMeetsId:'41274', gender:'Boys',  ageGroup:'Group B', events:['1M','3M','Platform']},
  {name:'Alden Charette',   diveMeetsId:'40695', gender:'Girls', ageGroup:'Group B', events:['1M','3M','Platform']},
  {name:'Ezekiel Raybourn', diveMeetsId:'39693', gender:'Boys',  ageGroup:'Group A', events:['1M']},
  {name:'Andres Winterman', diveMeetsId:'40239', gender:'Boys',  ageGroup:'Group A', events:['3M','Platform']},
  {name:'Avaleigh Westfall',diveMeetsId:'39599', gender:'Girls', ageGroup:'Group A', events:['1M','3M','Platform']},
];

/* ── Stage definitions ────────────────────────────────────────── */
const STAGES = [
  { id:'Regionals', label:'Regionals',  icon:'R', desc:'Region Championships → Zone advancement' },
  { id:'Zones',     label:'Zones',      icon:'Z', desc:'Zone Championships → E/W/C + Nationals' },
  { id:'EWC',       label:'E/W/C',      icon:'E', desc:'East/West/Central → Nationals' },
  { id:'Nationals', label:'Nationals',  icon:'N', desc:'Junior National Championship' },
  { id:'Reports',   label:'Reports',    icon:'📊', desc:'Analytics — participation, displacements, special status' },
  { id:'Pipeline',  label:'Pipeline & Modeling', icon:'📈', desc:'Multi-year funnels, year-over-year, financial overlay' },
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
  { key:'keptInvitedJoNationals',     label:'Kept invited' },
  { key:'petition',                   label:'Petition' },
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
   ZONE diveMeetsId ENRICHMENT
   Builds a lookup from officialZoneQualifiers (which have IDs)
   to patch Zone result rows that came in with null diveMeetsId.
   ════════════════════════════════════════════════════════════════ */
function buildZoneDiveMeetsIdLookup() {
  const oqz = DATA.officialZoneQualifiers || [];
  // Primary: name → diveMeetsId (lowercase normalized)
  const byName = new Map();
  oqz.forEach(q => {
    if (!q.diveMeetsId || !q.athlete) return;
    const key = normName(q.athlete);
    if (!byName.has(key)) byName.set(key, q.diveMeetsId);
  });
  return byName;
}

function normName(v) {
  return String(v || '').toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function enrichZoneDiveMeetsIds() {
  const lookup = buildZoneDiveMeetsIdLookup();
  let patched = 0;
  DATA.results.forEach(r => {
    if (r.stage !== 'Zones' || r.diveMeetsId) return;
    const key = normName(r.athlete);
    const id = lookup.get(key);
    if (id) { r.diveMeetsId = String(id); patched++; }
  });
  DATA.meta = DATA.meta || {};
  DATA.meta.zoneDiveMeetsIdPatch = { patched, total: DATA.results.filter(r => r.stage === 'Zones').length };
}

/* ════════════════════════════════════════════════════════════════
   ZONE RULE NORMALIZATION (was zone-rule-normalize.js)
   ════════════════════════════════════════════════════════════════ */
function normalizeJuniorZoneRules() {
  if (!Array.isArray(DATA.results)) return;
  const qualifyingAges = new Set(['Group A', 'Group B', 'Group C', 'Group D']);
  const qualifyingDisciplines = new Set(['1M', '3M', 'Platform']);

  function inferAgeGroup(row) {
    const text = `${row.ageGroup || ''} ${row.eventName || ''} ${row.eventKey || ''}`;
    const match = text.match(/group\s+([abcd])/i);
    return match ? `Group ${match[1].toUpperCase()}` : row.ageGroup;
  }
  function inferDiscipline(row) {
    const text = `${row.discipline || ''} ${row.eventName || ''} ${row.eventKey || ''}`;
    if (/platform/i.test(text)) return 'Platform';
    if (/\b3\s*[- ]?m\b|3\s*meter/i.test(text)) return '3M';
    if (/\b1\s*[- ]?m\b|1\s*meter/i.test(text)) return '1M';
    return row.discipline;
  }

  DATA.results.forEach(row => {
    if (row.statusOnly || row.stage !== 'Zones') return;
    const ageGroup = inferAgeGroup(row);
    const discipline = inferDiscipline(row);
    const isSynchro = row.isSynchro === true || /synchro/i.test(`${row.eventName || ''} ${row.eventKey || ''}`);
    if (qualifyingAges.has(ageGroup) && qualifyingDisciplines.has(discipline) && !isSynchro) {
      row.ageGroup = ageGroup;
      row.discipline = discipline;
      row.qualifyingEvent = true;
      row.eventCategory = 'Qualifying Event';
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   YMCA CHAMPION MATCHING HELPERS
   ════════════════════════════════════════════════════════════════ */
function boardOf(v) {
  const s = normName(v);
  if (s.includes('platform') || s.includes('tower')) return 'Platform';
  if (s.includes('3m') || s.includes('3 meter') || s.includes('3 metre')) return '3M';
  if (s.includes('1m') || s.includes('1 meter') || s.includes('1 metre')) return '1M';
  return '';
}
function genderOf(row) {
  const s = String(row.gender || row.eventName || row.eventKey || '').toLowerCase();
  if (s.includes('girl') || s === 'f' || s === 'female') return 'Girls';
  if (s.includes('boy')  || s === 'm' || s === 'male')   return 'Boys';
  return '';
}
function ageGroupOf(row) {
  const s = String(row.ageGroup || row.eventName || row.eventKey || '');
  if (/group\s*a/i.test(s)) return 'Group A';
  if (/group\s*b/i.test(s)) return 'Group B';
  if (/group\s*c/i.test(s)) return 'Group C';
  if (/group\s*d/i.test(s)) return 'Group D';
  return '';
}
function ymcaChampionForRow(row) {
  const id   = String(row.diveMeetsId || '').trim();
  const name = normName(row.athlete || '');
  const b    = boardOf(row.discipline || row.eventName || row.eventKey || row.apparatus || '');
  const g    = genderOf(row);
  const ag   = ageGroupOf(row);
  return YMCA_CHAMPIONS.find(c =>
    (id && id === c.diveMeetsId || (!id && name && normName(c.name) === name)) &&
    (!b  || c.events.includes(b)) &&
    (!g  || g  === c.gender) &&
    (!ag || ag === c.ageGroup)
  ) || null;
}
function isYmcaChampionAthlete(row) {
  const id   = String(row.diveMeetsId || '').trim();
  const name = normName(row.athlete || '');
  return YMCA_CHAMPIONS.some(c =>
    (id && id === c.diveMeetsId) || (!id && name && normName(c.name) === name)
  );
}

/* ════════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════════ */
function init() {
  // Run data preprocessing before anything renders
  enrichZoneDiveMeetsIds();
  normalizeJuniorZoneRules();

  if (window.OverridesSync) {
    window.OverridesSync.init().then(() => {
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
    const hasData = (s.id === 'Reports' || s.id === 'Pipeline') ? true : DATA.results.some(r => stageMatch(r, s.id));
    return `<button class="stage-btn ${s.id === state.stage ? 'active' : ''} ${hasData ? 'has-data' : ''}"
      data-stage="${s.id}" title="${esc(s.desc)}">
      <span class="stage-dot"></span>${esc(s.label)}
    </button>`;
  }).join('');
  nav.querySelectorAll('.stage-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.stage = btn.dataset.stage;
      state.selectedEventId = '';
      state.kpiDrill = null;
      state.kpiDrillFilter = null;
      state.view = 'results';
      document.body.classList.toggle('pm-active', state.stage === 'Pipeline');
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
      el.addEventListener('input', () => { const q = el.value;
      state.search = q;
      // If query looks like an athlete name (not an event), find and select their event
      if (q.length >= 2) {
        const lower = q.toLowerCase();
        const athleteMatch = effectiveResults.find(r =>
          stageMatch(r, state.stage) &&
          (r.athlete || '').toLowerCase().includes(lower) &&
          !(r.eventName || '').toLowerCase().includes(lower)
        );
        if (athleteMatch && athleteMatch.eventId) {
          state.selectedEventId = athleteMatch.eventId;
        } else {
          state.selectedEventId = '';
        }
      } else {
        state.selectedEventId = '';
      }
      renderAll();
    });
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
  function renderChips() {
    const sr = effectiveResults.filter(r => stageMatch(r, state.stage));
    const rr = (window.USAD_JUNIOR_ATHLETE_STATUS?.records) || [];
    const rh = (window.USAD_JUNIOR_ATHLETE_STATUS?.headers) || [];
    function rosterCount(key) {
      return rr.filter(rec => Array.isArray(rec) ? rec[rh.indexOf(key)] : rec[key]).length;
    }
    const counts = {};
    FLAG_DEFS.forEach(f => {
      const fromResults = sr.filter(r => f.key === 'review' ? r.reviewFlags?.length : Boolean(r[f.key])).length;
      const rosterKeys = {foreignDeclared:'foreignDeclared', hps:'hps', dualDeclared:'dualDeclared', ymca:'ymca'};
      const rc = rosterKeys[f.key] ? rosterCount(rosterKeys[f.key]) : 0;
      counts[f.key] = { results: fromResults, roster: rc };
    });

    const modeBar = `<div class="flag-mode-bar">
      <span class="flag-mode-lbl">Match</span>
      <div class="flag-mode-pills">
        <button class="fmp ${state.flagMode==='any'?'on':''}" data-mode="any">Any</button>
        <button class="fmp ${state.flagMode==='all'?'on':''}" data-mode="all">All</button>
      </div>
      ${state.flags.size?'<button class="flag-clear-all" id="flagClearAll">Clear</button>':''}
    </div>`;

    const chips = FLAG_DEFS.map(f => {
      const on = state.flags.has(f.key);
      const {results: n, roster: r} = counts[f.key];
      const displayN = r > 0 ? r : n;
      return `<button class="ftog ${on?'on':''} ${n===0&&r===0?'zero':''}" data-flag="${escAttr(f.key)}" type="button">
        <span class="ftog-lbl">${esc(f.label)}</span>
        <span class="ftog-n">${displayN||''}</span>
      </button>`;
    }).join('');

    wrap.innerHTML = modeBar + `<div class="ftog-grid">${chips}</div>`;

    wrap.querySelectorAll('.fmp').forEach(b => b.addEventListener('click', () => { state.flagMode = b.dataset.mode; renderAll(); }));
    const clr = document.getElementById('flagClearAll');
    if (clr) clr.addEventListener('click', () => { state.flags.clear(); renderAll(); });
    wrap.querySelectorAll('.ftog').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.flag;
      state.flags.has(k) ? state.flags.delete(k) : state.flags.add(k);
      state.selectedEventId = '';
      renderAll();
    }));
  }
  renderChips();
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
    // Show export options dropdown
    const existing = document.getElementById('export-dropdown');
    if (existing) { existing.remove(); return; }
    const btn = $('exportBtn');
    const dropdown = document.createElement('div');
    dropdown.id = 'export-dropdown';
    dropdown.style.cssText = `position:fixed;top:${btn.getBoundingClientRect().bottom+4}px;right:12px;
      background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);
      box-shadow:0 4px 16px rgba(0,0,0,.12);z-index:500;min-width:220px;padding:6px`;
    const opts = [
      { label:'Current view (what\'s on screen)', icon:'ti-table', fn: () => doExport('current') },
      { label:'Full stage — all events & athletes', icon:'ti-database', fn: () => doExport('stage') },
      { label:'Analytics summary (TSV)', icon:'ti-chart-bar', fn: () => doExport('analytics') },
    ];
    dropdown.innerHTML = `<div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-4);padding:4px 8px 6px">Export as CSV</div>` +
      opts.map((o,i) => `<button class="export-opt" data-idx="${i}">
        <i class="ti ${o.icon}" style="font-size:14px;color:var(--ink-3)"></i>
        <span>${o.label}</span>
      </button>`).join('');
    document.body.appendChild(dropdown);
    dropdown.querySelectorAll('.export-opt').forEach((b,i) => {
      b.addEventListener('click', () => { opts[i].fn(); dropdown.remove(); });
    });
    // Close on outside click
    setTimeout(() => document.addEventListener('click', function h(e) {
      if (!dropdown.contains(e.target) && e.target !== btn) { dropdown.remove(); document.removeEventListener('click', h); }
    }), 10);
  });

  function doExport(type) {
    let rows, filename;
    if (type === 'current') {
      rows = currentRows();
      filename = `junior-${state.stage}-${state.view}-${state.selectedEventId ? 'event' : 'all'}.csv`;
    } else if (type === 'stage') {
      rows = effectiveResults.filter(r => stageMatch(r, state.stage));
      filename = `junior-${state.stage}-full.csv`;
    } else {
      // Analytics summary — all stages combined
      rows = effectiveResults;
      filename = `junior-circuit-2026-full.csv`;
    }
    const text = buildCsv(rows, ',');
    const blob = new Blob([text], { type:'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

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
      eventId: '',
      eventName: '',
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
  // Double-click confirmation — first click arms, second click fires (no native dialog)
  let _clearArmed = false, _clearTimer = null;
  $('clearOverridesButton').addEventListener('click', () => {
    if (!state.overrides.length) return;
    if (!_clearArmed) {
      _clearArmed = true;
      $('clearOverridesButton').textContent = 'Tap again to confirm';
      $('clearOverridesButton').style.background = 'var(--red, #e31937)';
      $('clearOverridesButton').style.color = '#fff';
      _clearTimer = setTimeout(() => {
        _clearArmed = false;
        $('clearOverridesButton').textContent = 'Clear all';
        $('clearOverridesButton').style.background = '';
        $('clearOverridesButton').style.color = '';
      }, 3000);
      return;
    }
    clearTimeout(_clearTimer);
    _clearArmed = false;
    $('clearOverridesButton').textContent = 'Clear all';
    $('clearOverridesButton').style.background = '';
    $('clearOverridesButton').style.color = '';
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
   RECOMPUTE
   ════════════════════════════════════════════════════════════════ */
let _rosterLookup = null;
function buildRosterLookup() {
  const sd = window.USAD_JUNIOR_ATHLETE_STATUS;
  if (!sd) return new Map();
  const records = sd.records || [];
  const headers = sd.headers || [];
  const map = new Map();
  records.forEach(rec => {
    const gf = k => Array.isArray(rec) ? rec[headers.indexOf(k)] : rec[k];
    const dmId = String(gf('diveMeetsId') || '').trim();
    if (!dmId) return;
    map.set(dmId, {
      hps:             Boolean(gf('hps')),
      ymca:            Boolean(gf('ymca')),
      foreignDeclared: Boolean(gf('foreignDeclared')),
      dualDeclared:    Boolean(gf('dualDeclared')),
      dualOtherCountry:Boolean(gf('dualOtherCountry')),
    });
  });
  return map;
}

function recompute() {
  _rosterLookup = buildRosterLookup();
  const lookup = buildOverrideLookup();
  effectiveResults = DATA.results.map(r => applyOverrides(r, lookup));
  recalcQualification(effectiveResults);
  annotateQualificationImpact(effectiveResults);
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

  // Manual overrides take priority; then roster; then baked data
  r.foreignDeclared      = get('foreign')      ?? applyRoster(r, 'foreignDeclared');
  r.dualDeclared         = get('dual')         ?? applyRoster(r, 'dualDeclared');
  r.dualOtherCountry     = get('dualEffect')   ?? applyRoster(r, 'dualOtherCountry');
  r.hps                  = get('hps')          ?? applyRoster(r, 'hps');
  r.ymca                 = get('ymca')         ?? applyRoster(r, 'ymca');
  r.declaredNotAttending = get('notAttending') ?? Boolean(row.declaredNotAttending);

  // DiveMeets exhibition/127 code → foreign
  if (isDiveMeetsForeignCode(r) && get('foreign') !== false) {
    r.diveMeetsForeignCode = true;
    r.foreignDeclared = true;
  }

  r.webpointNonUsEffective = Boolean(r.webpointNonUs && get('foreign') !== false);
  r.foreignInternational   = r.foreignDeclared || r.webpointNonUsEffective || r.dualOtherCountry;

  // YMCA champion event-specific matching
  const ymcaChampAthlete = isYmcaChampionAthlete(r);
  const ymcaMatch        = ymcaChampionForRow(r);
  if (ymcaChampAthlete) {
    r.ymca = Boolean(ymcaMatch); // only flag ymca on the matching event board
    if (ymcaMatch) {
      r.ymcaChampionEvents = ymcaMatch.events.slice();
      r.prequalification = addUnique(r.prequalification || [], 'E/W/C prelims: YMCA event champion');
    }
  }

  const ndReasons = [];
  if (r.hps)              ndReasons.push('HPS Tier 3 Junior squad');
  if (r.ymca && r.stage !== 'Zones') ndReasons.push('YMCA champion');
  if (r.foreignDeclared)  ndReasons.push('Foreign athlete');
  if (r.webpointNonUsEffective && !r.foreignDeclared) ndReasons.push('Webpoint non-US');
  if (r.dualOtherCountry) ndReasons.push('Dual — competed for another federation');

  r.ghostAdvances = Boolean(r.foreignDeclared || r.webpointNonUsEffective || r.hps || r.dualOtherCountry);

  r.prequalified     = Boolean(r.hps || r.ymca);
  r.prequalification = r.prequalification || [];
  if (r.hps  && !r.prequalification.includes('Junior Nationals: Tier 3 HPS'))
    r.prequalification.push('Junior Nationals: Tier 3 HPS');

  const isExhibition = r.exhibition === true ||
    String(r.place || '').toUpperCase() === 'EX' ||
    String(r.qualified || '').toLowerCase().includes('exhibition');
  r.exhibitionLikelyForeign = isExhibition && r.qualifyingEvent && !r.hps && !r.ymca;

  r.nonDisplacingReason = ndReasons.join(' | ');
  r.nonDisplacing       = ndReasons.length > 0;
  r.countsTowardCutoff  = Boolean(r.qualifyingEvent && !r.nonDisplacing && r.placeNumber != null);

  // Petition override: marks athlete as qualifying via medical/staff petition
  const isPetition = get('petition');
  if (isPetition === true) {
    r.petition = true;
    r.petitionGranted = true;
    r.qualificationStatus = r.qualificationStatus || 'Medical/staff petition — approved';
    if (!r.reviewFlags) r.reviewFlags = [];
    // Remove review flag if staff has explicitly granted petition
    r.reviewFlags = r.reviewFlags.filter(f => !f.toLowerCase().includes('verify') && !f.toLowerCase().includes('no qualifying path'));
  }

  // KeptInvited override: dual citizen kept on invitation list per policy
  const isKeptInvited = get('keptInvited');
  if (isKeptInvited === true) {
    r.keptInvitedJoNationals = true;
    if (!r.reviewFlags) r.reviewFlags = [];
    r.reviewFlags = r.reviewFlags.filter(f => !f.toLowerCase().includes('policy'));
  }

  // Review override: flag for staff attention
  const reviewOverride = get('review');
  if (reviewOverride === true) {
    if (!r.reviewFlags) r.reviewFlags = [];
    if (!r.reviewFlags.some(f => f.includes('Flagged'))) {
      r.reviewFlags.push('Flagged for staff review');
    }
  }

  return r;
}

function applyRoster(row, field) {
  if (_rosterLookup && _rosterLookup.size > 0) {
    const dmId = String(row.diveMeetsId || '').trim();
    const roster = dmId ? _rosterLookup.get(dmId) : null;
    if (roster && roster[field] !== undefined) {
      return roster[field] || Boolean(row[field]);
    }
  }
  return Boolean(row[field]);
}

function isDiveMeetsForeignCode(row) {
  const place = String(row.place || '').toUpperCase();
  const rawPlace = String(row.rawPlace || row.diveMeetsPlace || '').toUpperCase();
  return place === '127' || rawPlace === '127' || place === 'EX' || place === 'EXH' ||
    rawPlace === 'EX' || rawPlace === 'EXH' || row.placeNumber === 127 ||
    row.exhibition === true || String(row.qualified || '').toLowerCase().includes('exhibition') ||
    String(row.status || '').toLowerCase().includes('exhibition');
}

function addUnique(list, value) {
  if (!Array.isArray(list)) list = [];
  const v = String(value || '').trim();
  if (v && !list.includes(v)) list.push(v);
  return list;
}

/* ── Qualification recalculation ──────────────────────────────── */
function recalcQualification(rows) {
  // For Zone events with non-displacing athletes, restore score order for placement
  normalizeZoneForeignPlacements(rows);

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

/* Restore score-order placement in Zone events when foreign/ND athletes
   have been assigned exhibition/127 place numbers by DiveMeets */
function normalizeZoneForeignPlacements(rows) {
  const grouped = new Map();
  rows.forEach(r => {
    if (r.stage !== 'Zones') return;
    if (!grouped.has(r.eventId)) grouped.set(r.eventId, []);
    grouped.get(r.eventId).push(r);
  });
  grouped.forEach(eventRows => {
    const hasIssue = eventRows.some(r =>
      r.qualifyingEvent !== false && (isDiveMeetsForeignCode(r) || r.foreignDeclared || r.nonDisplacing || r.hps || r.dualOtherCountry)
    );
    if (!hasIssue) return;
    // Sort by score descending, using original place as tiebreaker
    const ordered = [...eventRows].sort((a, b) => {
      const as = Number(a.score), bs = Number(b.score);
      if (Number.isFinite(as) && Number.isFinite(bs) && as !== bs) return bs - as;
      return (Number(a.placeNumber) || 9999) - (Number(b.placeNumber) || 9999);
    });
    ordered.forEach((row, idx) => {
      row.diveMeetsPlace = row.diveMeetsPlace ?? row.place;
      row.diveMeetsPlaceNumber = row.diveMeetsPlaceNumber ?? row.placeNumber;
      row.place = String(idx + 1);
      row.placeNumber = idx + 1;
    });
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
  if (r.officialAverageScoreQualifier)  return 'Zone qualifier — avg threshold';
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
      if (r.ymca && !r.hps && !r.foreignInternational) {
        r.advancesToEWC = true;
        r.advancesToZone = true;
        r.qualificationStatus = 'E/W/C qualifier — YMCA champion';
      } else if (r.ghostAdvances) {
        r.advancesToZone = true;
        r.advancesToEWC  = true;
        r.qualificationStatus = r.foreignDeclared
          ? 'Non-displacing — foreign athlete'
          : 'Non-displacing — HPS athlete';
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
      r.qualificationStatus  = 'Nationals — direct';
    }
    // Nationals: replacement if someone in 1-3 declined (Art.303(b)(2)(ii))
    else if (declinedInDirect > 0 &&
             eligibleRank <= ZONE_NATIONALS_REPLACEMENT_MAX &&
             attendingRank <= ZONE_NATIONALS_DIRECT_LIMIT) {
      r.juniorNationalStatus = 'Replacement';
      r.advancesToNationals  = true;
      r.bumpIn               = true;
      r.qualificationStatus  = 'Nationals — replacement';
    }
    // Replacement pool (Art.303(b)(2)(ii))
    else if (eligibleRank <= ZONE_NATIONALS_REPLACEMENT_MAX) {
      r.juniorNationalStatus = 'Replacement pool';
      r.qualificationStatus  = 'Replacement pool — eligible if 1–3 declines';
    }

    // E/W/C: places 4–18 (Art.304(a)(2))
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
      if (!r.advancesToNationals) r.qualificationStatus = 'E/W/C qualifier — avg threshold';
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
      r.qualificationStatus = 'Nationals — direct';
    }
    // Average top-3 score qualifiers up to 6th (Art.303(b)(3)(ii))
    else if (r.officialThresholdScore != null && r.score != null &&
             r.score >= r.officialThresholdScore && eligibleRank <= EWC_NATIONALS_AVG_MAX) {
      r.advancesToNationals = true;
      r.bumpIn = true;
      r.qualificationStatus = 'Nationals — avg top-3 score';
    }
    // Replacement if someone in 1-3 declined
    else if (declinedInDirect > 0 &&
             eligibleRank <= EWC_NATIONALS_AVG_MAX &&
             attendingRank <= EWC_NATIONALS_DIRECT_LIMIT) {
      r.advancesToNationals = true;
      r.bumpIn = true;
      r.qualificationStatus = 'Nationals — replacement';
    }
    else {
      r.qualificationStatus = 'Does not advance';
    }
    r.advancesToZone = r.advancesToNationals;
  });
}

/* ── Qualification impact annotations ────────────────────────── */
function annotateQualificationImpact(rows) {
  rows.forEach(r => {
    r.bumpedBy    = Array.isArray(r.bumpedBy)    ? r.bumpedBy.filter(x => !x._generated)    : [];
    r.openedFor   = Array.isArray(r.openedFor)   ? r.openedFor.filter(x => !x._generated)   : [];
    r.spotShifted = r._origSpotShifted ?? r.spotShifted ?? false;
    r.bumpIn      = r._origBumpIn      ?? r.bumpIn      ?? false;
    r.openedSpot  = r._origOpenedSpot  ?? r.openedSpot  ?? false;
  });

  const grouped = new Map();
  rows.forEach(r => {
    if (!r.eventId) return;
    if (!grouped.has(r.eventId)) grouped.set(r.eventId, []);
    grouped.get(r.eventId).push(r);
  });

  grouped.forEach(evRows => {
    const ordered = evRows
      .filter(r => !r.statusOnly && r.qualifyingEvent !== false && Number(r.placeNumber) > 0)
      .sort((a, b) => Number(a.placeNumber) - Number(b.placeNumber) || (b.score || 0) - (a.score || 0));

    const sources = [];
    ordered.forEach(r => {
      if (r.nonDisplacing) { sources.push(r); return; }
      const prior = sources.filter(n => Number(n.placeNumber) < Number(r.placeNumber));
      if (!prior.length) return;
      r.spotShifted = true;
      r.displacementBeneficiary = true;
      prior.forEach(n => {
        const item = { athlete: n.athlete, place: n.place, reason: n.nonDisplacingReason || 'Non-displacing', _generated: true };
        if (!r.bumpedBy.some(x => x.athlete === n.athlete)) r.bumpedBy.push(item);
      });
      // Check if crossing a qualifying boundary
      const stg = r.stage === 'East/West/Central' ? 'EWC' : r.stage;
      const rank = Number(r.eligibleRank || r.countingRank || 0);
      const place = Number(r.placeNumber || 0);
      let crossed = false;
      if (stg === 'Regionals') crossed = !!r.advancesToZone && rank <= REGIONAL_ZONE_LIMIT && place > REGIONAL_ZONE_LIMIT;
      else if (stg === 'Zones') crossed = (r.advancesToNationals && rank <= ZONE_NATIONALS_DIRECT_LIMIT && place > ZONE_NATIONALS_DIRECT_LIMIT) ||
                                          (r.advancesToEWC && rank <= ZONE_EWC_UPPER_LIMIT && place > ZONE_EWC_UPPER_LIMIT);
      else if (stg === 'EWC') crossed = !!r.advancesToNationals && rank <= EWC_NATIONALS_DIRECT_LIMIT && place > EWC_NATIONALS_DIRECT_LIMIT;

      if (crossed) {
        r.bumpIn = true;
        prior.forEach(n => {
          n.openedSpot = true;
          const item = { athlete: r.athlete, place: r.place, countingRank: r.eligibleRank || r.countingRank || '', _generated: true };
          if (!n.openedFor.some(x => x.athlete === r.athlete)) n.openedFor.push(item);
        });
      }
    });
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
      entries:        evRows.length,
      countable:      evRows.filter(r => r.countsTowardCutoff).length,
      nonDisplacing:  evRows.filter(r => r.nonDisplacing).length,
      foreign:        evRows.filter(r => r.foreignDeclared || r.webpointNonUsEffective).length,
      dual:           evRows.filter(r => r.dualDeclared).length,
      notAttending:   evRows.filter(r => r.declaredNotAttending).length,
      bumpIns:        evRows.filter(r => r.bumpIn).length,
      advancingZone:  evRows.filter(r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC).length,
      reviewRows:     evRows.filter(r => r.reviewFlags?.length).length,
    };
  }).sort(evCompare);
}

function buildFlags(r) {
  const f = [];
  if (r.foreignDeclared)             f.push('Foreign declared');
  if (r.webpointNonUsEffective && !r.foreignDeclared) f.push('Webpoint non-US');
  if (r.dualDeclared)                f.push(r.dualOtherCountry ? 'Dual affects results' : 'Dual citizen');
  if (r.keptInvitedJoNationals)      f.push('Kept invited');
  if (r.petition)                    f.push('Petition');
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
  const flagWrap = $('filterFlags');
  if (flagWrap && flagWrap._renderChips) flagWrap._renderChips();
}

function renderOverrideBadge() {
  const active = state.overrides.filter(o => o.active).length;
  const badge = $('overrideBadge');
  badge.textContent = active;
  badge.hidden = active === 0;
}

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

/* ── KPIs ─────────────────────────────────────────────────────── */
function renderKpis() {
  // For EWC stage, KPIs reflect the Zone qualifiers heading to E/W/C
  // For Nationals stage, reflect both Zone direct + EWC qualifiers
  // For Reports stage, no KPIs needed
  if (state.stage === 'Nationals' || state.stage === 'Reports' || state.stage === 'Pipeline') {
    $('kpiRow').innerHTML = '';
    return;
  }
  let rows;
  if (state.stage === 'EWC') {
    // EWC dashboard uses zone qualifier data
    rows = effectiveResults.filter(r => r.stage === 'Zones' &&
      (r.advancesToEWC || r.advancesToNationals));
  } else {
    // Use current event filter — KPIs reflect what's in the table
    rows = filteredRows();
  }
  const hasEventSelected = Boolean(state.selectedEventId);
  const uniqueAthletes = new Set(rows.map(r => r.diveMeetsId || r.athlete));
  const advancing = rows.filter(r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC).length;

  const kpis = [
    { key:'all',       label:'Entries',        value: rows.length,     sub: `${uniqueAthletes.size} athletes` },
    { key:'advancing', label:'Advancing',      value: advancing,       accent:'green',
      sub: state.stage === 'Zones' ? '→ Nationals / E/W/C' : '→ next stage',
      filter: r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC },
    { key:'nonDisp',   label:'Non-displacing', value: rows.filter(r=>r.nonDisplacing).length,
      sub: 'no spot consumed', filter: r => r.nonDisplacing },
    { key:'foreign',   label:'Foreign',
      value: rows.filter(r=>r.foreignDeclared||r.webpointNonUsEffective||r.exhibitionLikelyForeign).length,
      accent: rows.filter(r=>r.foreignDeclared||r.webpointNonUsEffective||r.exhibitionLikelyForeign).length ? 'red' : '',
      sub: rows.filter(r=>r.exhibitionLikelyForeign&&!r.foreignDeclared).length
             ? `+${rows.filter(r=>r.exhibitionLikelyForeign&&!r.foreignDeclared).length} exhibition` : 'declared',
      filter: r => r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign },
    { key:'dual',      label:'Dual',           value: rows.filter(r=>r.dualDeclared).length,
      sub: rows.filter(r=>r.dualOtherCountry).length + ' affect results', filter: r => r.dualDeclared },
    { key:'hps',       label:'HPS',            value: rows.filter(r=>r.hps).length,
      sub: 'pre-qualified', filter: r => r.hps },
    { key:'notAtt',    label:'Not Attending',  value: rows.filter(r=>r.declaredNotAttending).length,
      accent: rows.filter(r=>r.declaredNotAttending).length ? 'amber' : '',
      sub: rows.filter(r=>r.openedSpot).length + ' spots opened', filter: r => r.declaredNotAttending },
    { key:'bumps',     label:'Bump-ins',       value: rows.filter(r=>r.bumpIn).length,
      sub: 'moved up the list', filter: r => r.bumpIn },
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
      if (state.kpiDrill === null) state.kpiDrillFilter = null;
      renderKpis();
      renderTable();
    });
  });
}

/* ── Event list ───────────────────────────────────────────────── */
function renderEventList() {
  if (state.stage === 'EWC' || state.stage === 'Nationals' || state.stage === 'Reports' || state.stage === 'Pipeline') return;
  const rows = filteredRows({ ignoreEvent: true }).filter(r => stageMatch(r, state.stage));
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
    const active    = event.id === state.selectedEventId;
    const advancing = evRows.filter(r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC).length;
    const nd        = evRows.filter(r => r.nonDisplacing).length;
    const notAtt    = evRows.filter(r => r.declaredNotAttending).length;
    const bumps     = evRows.filter(r => r.bumpIn).length;
    const flags     = evRows.filter(r => r.reviewFlags?.length || r.effectiveFlags?.length).length;
    // Color code: red = has flags/bumps, amber = has ND, green = clean
    const dotColor  = (flags || bumps) ? '#e31937' : nd ? '#d97706' : '#059669';
    return `<button type="button" class="event-item ${active ? 'active' : ''}" data-event-id="${escAttr(event.id)}">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="width:7px;height:7px;border-radius:50%;background:${dotColor};flex-shrink:0;margin-top:1px"></span>
        <span class="event-item-name">${esc(event.eventName || event.id)}</span>
      </div>
      <span class="event-item-meta">${esc((event.meetName || '').replace(/^2026 USA Diving (Junior )?/,'').replace(/ Championships$/,'').trim())}</span>
      <div class="event-item-badges">
        ${advancing ? `<span class="mini-badge green">${advancing} adv</span>` : ''}
        ${nd        ? `<span class="mini-badge slate">${nd} ND</span>` : ''}
        ${bumps     ? `<span class="mini-badge purple">${bumps} bump</span>` : ''}
        ${notAtt    ? `<span class="mini-badge amber">${notAtt} DNA</span>` : ''}
        ${flags     ? `<span class="mini-badge red">${flags} ⚑</span>` : ''}
      </div>
    </button>`;
  }).join('');
}

/* ── Context bar ──────────────────────────────────────────────── */
function renderContext() {
  if (state.stage === 'EWC' || state.stage === 'Nationals' || state.stage === 'Reports' || state.stage === 'Pipeline') return;
  const rows     = filteredRows();
  const selected = state.selectedEventId ? eventById.get(state.selectedEventId) : null;
  const title    = selected ? (selected.eventName || selected.id) : 'All matching events';
  const sub      = selected
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
      ['Entries',   rows.length],
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
  // qualifier-views.js handles EWC and Nationals stages
  if (state.stage === 'EWC' && window._qvRenderEWC)           { window._qvRenderEWC();       return; }
  if (state.stage === 'Nationals' && window._qvRenderNat)     { window._qvRenderNat();       return; }
  if (state.stage === 'Reports' && window._qvRenderReports)   { window._qvRenderReports();   return; }
  if (state.stage === 'Pipeline' && window._pmRender)         { window._pmRender();          return; }

  // Review queue: inject at top of flags view
  if (state.view === 'flags' && window._qvRenderReviewQueue) {
    const wrap = $('tableWrap');
    if (wrap) {
      // Create a review queue container before the table
      let rqEl = document.getElementById('rv-queue-wrap');
      if (!rqEl) {
        rqEl = document.createElement('div');
        rqEl.id = 'rv-queue-wrap';
        rqEl.style.cssText = 'border-bottom:1px solid var(--line);padding-bottom:4px;margin-bottom:4px';
        wrap.parentNode.insertBefore(rqEl, wrap);
      }
      window._qvRenderReviewQueue(rqEl);
    }
  } else {
    // Remove queue container when switching away from flags
    const old = document.getElementById('rv-queue-wrap');
    if (old) old.remove();
  }

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
  if (state.view === 'bumps')      return renderBumpsTable(rows);
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
  const cols = ['Place', isZone || isEWC ? 'Elig' : 'Rank', 'Athlete', 'Team', 'Score', 'Qualification', 'Flags', 'Actions'];

  const tbody = rows.map(r => {
    const rowCls = [
      (r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign) ? 'row-foreign' : '',
      r.dualDeclared ? 'row-dual' : '',
      r.declaredNotAttending ? 'row-decline' : '',
    ].filter(Boolean).join(' ');

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
  const cols = ['Athlete', 'Team', 'Events entered', 'Advancing', 'Flags'];
  const tbody = rows.map(r => {
    // Build event tags with status color
    const evTags = (r.eventRows || []).map(ev => {
      const cls = ev.advancesToNationals ? 'ev-tag-nat'
                : ev.advancesToEWC || ev.advancesToZone ? 'ev-tag-ewc'
                : ev.nonDisplacing ? 'ev-tag-nd'
                : 'ev-tag-out';
      return `<span class="ev-tag ${cls}">${esc(ev.eventKey || ev.eventName || '')}</span>`;
    }).join('');

    const qualSummary = r.advancing > 0
      ? `<span style="color:#059669;font-weight:500">${r.advancing} advancing</span>`
      : `<span style="color:var(--ink-4)">0 advancing</span>`;
    const ndNote = r.nonDisplacing > 0
      ? `<span style="color:var(--ink-4);font-size:10px"> · ${r.nonDisplacing} non-disp</span>`
      : '';

    return `<tr data-rid="${esc(r.diveMeetsId || r.athlete)}" style="cursor:pointer">
      <td style="vertical-align:top">
        <div class="athlete-name">${esc(r.athlete)}</div>
        <div class="mono athlete-id">${esc(r.diveMeetsId || '')}</div>
      </td>
      <td style="vertical-align:top;font-size:11px;color:var(--ink-3)">${esc((r.teams || []).join(', '))}</td>
      <td style="vertical-align:top">
        <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px">${evTags || '<span style="color:var(--ink-4);font-size:11px">—</span>'}</div>
      </td>
      <td style="vertical-align:top;white-space:nowrap">${qualSummary}${ndNote}</td>
      <td style="vertical-align:top">${pillList(r.flags || [])}</td>
    </tr>`;
  }).join('');
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
  $('tableWrap').querySelectorAll('button[data-override-action]').forEach(btn => {
    btn.addEventListener('click', () => handleLogAction(btn.dataset.overrideAction, btn.dataset.overrideId));
  });
}

/* ── Official qual list ───────────────────────────────────────── */
/* ── Bumps & shifts dedicated renderer ──────────────────────── */
function renderBumpsTable(rows) {
  // Group by event for cleaner display
  const eventGroups = new Map();
  rows.forEach(r => {
    const eid = r.eventId || r.eventKey || '';
    if (!eventGroups.has(eid)) eventGroups.set(eid, { event: r, rows: [] });
    eventGroups.get(eid).rows.push(r);
  });

  if (!eventGroups.size) {
    $('tableWrap').innerHTML = `<div class="empty-state">
      <div class="empty-state-title">No displacements</div>
      <div class="empty-state-sub">No bump-ins, spot shifts, or avg threshold qualifiers in this selection.</div>
    </div>`;
    return;
  }

  const sections = [...eventGroups.values()].map(({ event: ev, rows: evRows }) => {
    const bumped   = evRows.filter(r => r.bumpIn);
    const opened   = evRows.filter(r => r.openedSpot);
    const avgQ     = evRows.filter(r => r.officialAverageScoreQualifier && !r.bumpIn);

    const rows_html = evRows.map(r => {
      let rowType = '', icon = '', note = '';
      if (r.openedSpot) {
        rowType = 'bump-opened';
        icon = '<span class="bump-icon bump-icon-open" title="Opened spot">↑</span>';
        const openedFor = (r.openedFor || []).map(b => b.athlete || '').filter(Boolean);
        note = openedFor.length
          ? `Spot opened for: ${openedFor.join(', ')}`
          : `Non-displacing — ${r.nonDisplacingReason || 'does not consume spot'}`;
      } else if (r.bumpIn) {
        rowType = 'bump-in';
        icon = '<span class="bump-icon bump-icon-in" title="Bumped in">↓</span>';
        const by = (r.bumpedBy || []).map(b => b.athlete || '').filter(Boolean);
        note = by.length ? `Moved up because: ${by.join(', ')} is non-displacing` : 'Moved up due to non-displacing athlete';
      } else if (r.officialAverageScoreQualifier) {
        rowType = 'bump-avg';
        icon = '<span class="bump-icon bump-icon-avg" title="Avg threshold">★</span>';
        note = `Qualified via ${ev.stage === 'Regionals' ? '15th' : '18th'}-place average threshold`;
      }

      return `<tr class="bump-row bump-row-${rowType}">
        <td style="width:28px;text-align:center;vertical-align:middle">${icon}</td>
        <td style="vertical-align:top">
          <div class="athlete-name">${esc(r.athlete || '')}</div>
          <div class="mono athlete-id">${esc(r.diveMeetsId || '')}</div>
          <div style="font-size:10px;color:var(--ink-3)">${esc(r.team || '')}</div>
        </td>
        <td class="mono" style="width:44px">${esc(r.place || '—')}</td>
        <td class="mono" style="width:54px">${esc(String(r.eligibleRank != null ? r.eligibleRank : '—'))}</td>
        <td class="mono" style="width:80px">${fmtScore(r.score)}</td>
        <td style="font-size:11px;color:var(--ink-3);line-height:1.4">${esc(note)}</td>
        <td>${pillList(r.effectiveFlags || [])}</td>
      </tr>`;
    }).join('');

    const evName = ev.eventKey || ev.eventName || '';
    const meetShort = (ev.meetName || '').replace(/^2026 USA Diving (Junior )?/,'').replace(/ Championships$/,'');
    const badge = bumped.length ? `<span class="mini-badge slate">${bumped.length} bump-in${bumped.length!==1?'s':''}</span>` : '';
    const avgBadge = avgQ.length ? `<span class="mini-badge" style="background:#f5f3ff;color:#5b21b6">${avgQ.length} avg qual</span>` : '';

    return `<div class="bump-event-section">
      <div class="bump-event-header">
        <div class="bump-event-name">${esc(evName)}</div>
        <div class="bump-event-meta">${esc(meetShort)}</div>
        <div style="display:flex;gap:4px;flex-shrink:0">${badge}${avgBadge}</div>
      </div>
      <table class="results-table" style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr>
          <th style="width:28px"></th>
          <th>Athlete</th><th style="width:44px">Place</th>
          <th style="width:54px">Elig</th><th style="width:80px">Score</th>
          <th>Reason</th><th>Flags</th>
        </tr></thead>
        <tbody>${rows_html}</tbody>
      </table>
    </div>`;
  }).join('');

  $('tableWrap').innerHTML = `<div style="display:flex;flex-direction:column;gap:0">${sections}</div>`;
}

function renderOfficialTable(rows) {
  const NAT = window.USAD_JO_NAT_QUALIFIERS;
  const isZones = state.stage === 'Zones' || state.stage === 'EWC';
  const isRegionals = state.stage === 'Regionals';
  const isNationals = state.stage === 'Nationals';

  // Nationals stage: use JO Nationals qualifier list
  if ((isNationals || (!isRegionals && !isZones)) && NAT?.qualifiers?.length) {
    const q = (state.search || '').toLowerCase();
    const natRows = NAT.qualifiers.filter(r => {
      if (!q) return true;
      return [r.name, r.diveMeetsId, r.firstName, r.lastName]
        .join(' ').toLowerCase().includes(q);
    });
    if (!natRows.length) {
      $('tableWrap').innerHTML = `<div class="empty-state"><div class="empty-state-title">No matches</div></div>`;
      return;
    }
    const cols = ['Athlete', 'DM ID', 'Events qualified', 'Source'];
    const tbody = natRows.map(r => `<tr>
      <td><span class="athlete-name">${esc(r.name || (r.firstName+' '+r.lastName) || '')}</span></td>
      <td class="mono athlete-id">${esc(r.diveMeetsId || '')}</td>
      <td style="font-size:11px">${(r.qualifiedEvents || r.qualifiedEventKeys || []).map(e => `<span class="ev-tag ev-tag-nat">${esc(e)}</span>`).join(' ')}</td>
      <td style="font-size:11px;color:var(--ink-3)">${esc(r.qualificationSource || 'Zone / E/W/C')}</td>
    </tr>`).join('');
    $('tableWrap').innerHTML = `<div style="padding:10px 12px;font-size:11px;color:var(--ink-3);border-bottom:1px solid var(--line)">
      JO Nationals qualifier list — ${natRows.length} athletes · ${(NAT.meta?.eventCount || '')} event slots · as of ${esc(NAT.meta?.asOf || 'June 2026')}
    </div>` + tableHtml(cols, tbody);
    return;
  }

  // Zones/Regionals stage: use official zone qualifier list (OQZ)
  const official = officialRows();
  if (!official.length) {
    $('tableWrap').innerHTML = `<div class="empty-state">
      <div class="empty-state-title">No official list data</div>
      <div class="empty-state-sub">${isRegionals ? 'Switch to the Zones stage to see the official zone qualifier list.' : 'Data will appear once qualifier lists are finalized.'}</div>
    </div>`;
    return;
  }
  const cols = ['Zone', 'Event', 'Rank', 'Athlete', 'DM ID', 'Score', 'Avg threshold'];
  const q = (state.search || '').toLowerCase();
  const filtered = official.filter(r => !q || [r.athlete, r.diveMeetsId, r.team, r.zone, r.eventName].join(' ').toLowerCase().includes(q));
  const tbody = filtered.map(r => `<tr class="${r.isAverageScoreMarker ? 'row-avg-marker' : ''}">
    <td style="font-weight:600;width:50px">
      <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;
        background:${{A:'#EEEDFE',B:'#EEEDFE',C:'#E1F5EE',D:'#E1F5EE',E:'#FAEEDA',F:'#FAEEDA'}[r.zone]||'var(--surface-2)'};
        color:${{A:'#3C3489',B:'#3C3489',C:'#085041',D:'#085041',E:'#633806',F:'#633806'}[r.zone]||'var(--ink-3)'}">
        Zone ${esc(r.zone || '')}
      </span>
    </td>
    <td style="font-size:12px">${esc(r.eventKey || r.eventName || '')}</td>
    <td class="mono" style="width:44px">${esc(String(r.rank || ''))}</td>
    <td><span class="athlete-name">${esc(r.athlete || '')}</span></td>
    <td class="mono athlete-id">${esc(r.diveMeetsId || '')}</td>
    <td class="mono">${fmtScore(r.score)}${r.isAverageScoreMarker ? '<span style="color:var(--ink-4)"> *</span>' : ''}</td>
    <td style="font-size:10px;color:var(--ink-4)">${r.isAverageScoreMarker ? 'Threshold marker' : ''}</td>
  </tr>`).join('');
  $('tableWrap').innerHTML = `<div style="padding:10px 12px;font-size:11px;color:var(--ink-3);border-bottom:1px solid var(--line)">
    Official DiveMeets zone qualifier list — ${filtered.length} entries · * = average score threshold marker
  </div>` + tableHtml(cols, tbody);
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
    }).sort((a, b) =>
      (a.zone||'').localeCompare(b.zone||'') ||
      (a.eventSort||999) - (b.eventSort||999) ||
      (a.rank||9999) - (b.rank||9999)
    );
  }
  return filteredRows({ ignoreEvent: true })
    .filter(r => r.advancesToNationals || r.advancesToZone || r.advancesToEWC)
    .sort((a, b) =>
      (a.zone||'').localeCompare(b.zone||'') ||
      evCompare(eventById.get(a.eventId)||{}, eventById.get(b.eventId)||{}) ||
      (a.eligibleRank||9999) - (b.eligibleRank||9999)
    );
}

/* ════════════════════════════════════════════════════════════════
   FILTERING
   ════════════════════════════════════════════════════════════════ */
function filteredRows(opts = {}) {
  const ignoreEvent = Boolean(opts.ignoreEvent);
  const q = state.search.toLowerCase();
  return effectiveResults.filter(r => {
    if (!stageMatch(r, state.stage)) return false;
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
    if (!stageMatch(r, state.stage)) return false;
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
    const k = `${r.diveMeetsId || ''}|${r.athlete}`;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k).push(r);
  });
  return [...grouped.values()].map(evRows => {
    const first = evRows[0];
    return {
      athlete:         first.athlete,
      diveMeetsId:     first.diveMeetsId,
      teams:           [...new Set(evRows.map(r => r.team).filter(Boolean))],
      events:          evRows.length,
      eventRows:       evRows,  // full rows for event tag rendering
      advancing:       evRows.filter(r => r.advancesToZone || r.advancesToNationals || r.advancesToEWC).length,
      nonDisplacing:   evRows.filter(r => r.nonDisplacing).length,
      flags:           [...new Set(evRows.flatMap(r => r.effectiveFlags || []))],
      prequalification:[...new Set(evRows.flatMap(r => r.prequalification || []))],
      score:           Math.max(...evRows.map(r => r.score || 0)),
    };
  });
}


/* ════════════════════════════════════════════════════════════════
   OVERRIDES
   ════════════════════════════════════════════════════════════════ */
function loadOverrides() {
  try {
    const p = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '[]');
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

function saveOverrides() {
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(state.overrides));
  if (window.OverridesSync) window.OverridesSync.save(state.overrides);
}

function addOverride(input) {
  if (!input.athleteId && !input.athleteName) return;
  state.overrides.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    active: true,
    type:           input.type,
    value:          Boolean(input.value),
    athleteId:      String(input.athleteId   || '').trim(),
    athleteName:    String(input.athleteName || '').trim(),
    eventId:        input.eventId   || '',
    eventName:      input.eventName || '',
    note:           String(input.note || '').trim(),
    resolvedReview: Boolean(input.resolvedReview),
  });
  saveOverrides(); recompute(); renderAll();
}

function addOverrideFromForm() {
  const type = $('overrideType').value;
  addOverride({
    type,
    value: $('overrideValue').value === 'true',
    athleteId:   $('overrideAthleteId').value,
    athleteName: $('overrideAthleteName').value,
    eventId:   type === 'notAttending' ? (state.selectedEventId || '') : '',
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
  return {
    foreign:'Foreign athlete', dual:'Dual citizen', dualEffect:'Dual affects results',
    hps:'HPS athlete', ymca:'YMCA event champion', notAttending:'Not attending',
    petition:'Medical petition', keptInvited:'Kept invited (policy)', review:'Needs review',
  }[type] || type;
}

function overrideDesc(o) {
  return `${overrideTypeLabel(o.type)} ${o.value ? 'on' : 'off'}${o.note ? ' — ' + o.note : ''}`;
}

/* ════════════════════════════════════════════════════════════════
   CELL RENDERERS
   ════════════════════════════════════════════════════════════════ */
function athleteCell(r) {
  const showEvent = !state.selectedEventId;
  return `<div class="athlete-main">
    <span class="athlete-name">${esc(r.athlete)}</span>
    ${r.diveMeetsId ? `<span class="athlete-id">${esc(r.diveMeetsId)}</span>` : ''}
  </div>${showEvent ? `<div class="athlete-event">${esc(r.eventName || '')}</div>` : ''}`;
}

function rankCell(r) {
  return esc(String(r.countingRank || ''));
}

function eligCell(r) {
  if (!r.attendingEligibleRank && !r.eligibleRank) return '';
  if (r.attendingEligibleRank && r.eligibleRank && r.attendingEligibleRank !== r.eligibleRank) {
    return `<span style="color:var(--ink-3)">${r.eligibleRank}</span>→<strong>${r.attendingEligibleRank}</strong>`;
  }
  return esc(String(r.attendingEligibleRank || r.eligibleRank || ''));
}

function statusBadge(r) {
  const s = (r.qualificationStatus || r.juniorNationalStatus || '').toLowerCase();
  if (!s) return '';

  let cls = 'status-out', label = 'Does not advance';

  if      (s.includes('nationals') && s.includes('direct'))      { cls = 'status-qualifier';   label = 'Nationals — direct'; }
  else if (s.includes('nationals') && s.includes('replacement')) { cls = 'status-replacement'; label = 'Nationals — replacement'; }
  else if (s.includes('nationals') && s.includes('avg'))         { cls = 'status-replacement'; label = 'Nationals — avg score'; }
  else if (s.includes('zone qualifier') && s.includes('top 15')) { cls = 'status-qualifier';   label = 'Zone qualifier'; }
  else if (s.includes('zone qualifier') && s.includes('avg'))    { cls = 'status-average';     label = 'Zone — avg threshold'; }
  else if (s.includes('zone qualifier') && s.includes('official')){ cls = 'status-qualifier';  label = 'Zone — official list'; }
  else if (s.includes('e/w/c') && s.includes('ymca'))            { cls = 'status-qualifier';   label = 'E/W/C — YMCA'; }
  else if (s.includes('e/w/c') && s.includes('avg'))             { cls = 'status-average';     label = 'E/W/C — avg threshold'; }
  else if (s.includes('e/w/c'))                                  { cls = 'status-ewc';         label = 'E/W/C qualifier'; }
  else if (s.includes('replacement pool'))                       { cls = 'status-replacement'; label = 'Replacement pool'; }
  else if (s.includes('replacement'))                            { cls = 'status-replacement'; label = 'Replacement'; }
  else if (s.includes('ymca'))                                   { cls = 'status-qualifier';   label = 'YMCA champion'; }
  else if (s.includes('non-displacing') || s.includes('non displacing')) { cls = 'status-non-displacing'; label = 'Non-displacing'; }
  else if (s.includes('not attending') || s.includes('declared not'))    { cls = 'status-decline';  label = 'Not attending'; }
  else if (s.includes('not eligible') || s.includes('does not advance') || s.includes('non-qualifying')) { cls = 'status-out'; label = 'Does not advance'; }
  else { label = (r.qualificationStatus || ''); if (label.length > 28) label = label.slice(0,26)+'…'; }

  return `<span class="status ${cls}" title="${esc(r.qualificationStatus || '')}">${esc(label)}</span>`;
}

function inlineBumpNote(r) {
  const parts = [];
  if (r.bumpIn && r.bumpedBy?.length)      parts.push(`↑ By: ${r.bumpedBy.map(x => x.athlete).join(', ')}`);
  else if (r.bumpIn)                        parts.push('↑ Bumped in');
  if (r.openedSpot && r.openedFor?.length) parts.push(`↓ Opened → ${r.openedFor.map(x => x.athlete).join(', ')}`);
  else if (r.openedSpot)                   parts.push('↓ Spot opened');
  if (r.overrideNotes?.length)             parts.push(`✎ ${r.overrideNotes[0]}`);
  if (!parts.length) return '';
  return `<div style="font-size:10.5px;color:var(--ink-3);margin-top:3px">${parts.map(p => esc(p)).join(' · ')}</div>`;
}

function flagPills(r) {
  const pills = [];
  if (r.foreignDeclared)                              pills.push(pill('Foreign','foreign'));
  if (r.webpointNonUsEffective && !r.foreignDeclared) pills.push(pill('Webpoint','foreign'));
  if (r.diveMeetsForeignCode)                         pills.push(pill('DM-127','foreign'));
  if (r.dualDeclared)                                 pills.push(pill(r.dualOtherCountry ? 'Dual effect' : 'Dual','dual'));
  if (r.keptInvitedJoNationals)                       pills.push(pill('Kept invited','preq'));
  if (r.petition)                                     pills.push(pill('Petition','petition'));
  if (r.hps)                                          pills.push(pill('HPS','hps'));
  if (r.ymca)                                         pills.push(pill('YMCA','ymca'));
  if (r.prequalified)                                 pills.push(pill('Prequalified','preq'));
  if (r.declaredNotAttending)                         pills.push(pill('Not attending','decline'));
  if (r.bumpIn)                                       pills.push(pill('Bump in','bump'));
  if (r.reviewFlags?.length)                          pills.push(pill('Review','review'));
  return `<div class="pill-list">${pills.join('')}</div>`;
}

function pillList(labels) {
  return `<div class="pill-list">${labels.map(l => pill(l, pillCls(l))).join('')}</div>`;
}
function pill(label, cls)  { return `<span class="pill pill-${cls}">${esc(label)}</span>`; }
function pillCls(l) {
  const s = String(l).toLowerCase();
  if (s.includes('foreign') || s.includes('non-us') || s.includes('webpoint') || s.includes('dm-')) return 'foreign';
  if (s.includes('dual'))                                     return 'dual';
  if (s.includes('hps'))                                      return 'hps';
  if (s.includes('ymca'))                                     return 'ymca';
  if (s.includes('petition'))                                 return 'petition';
  if (s.includes('kept') || s.includes('preq'))               return 'preq';
  if (s.includes('not att') || s.includes('decline'))         return 'decline';
  if (s.includes('bump') || s.includes('avg'))                return 'bump';
  return 'review';
}

function rowActions(r) {
  const fn = !r.foreignDeclared, dn = !r.dualDeclared, de = !r.dualOtherCountry, na = !r.declaredNotAttending;
  const hn = !r.hps, yn = !r.ymca;
  return `<div class="row-actions">
    <button class="row-act-btn" data-row-override="foreign"      data-override-value="${fn}" data-row-id="${escAttr(r.id)}">${fn?'Mark Foreign':'Not Foreign'}</button>
    <button class="row-act-btn" data-row-override="hps"          data-override-value="${hn}" data-row-id="${escAttr(r.id)}">${hn?'Mark HPS':'Remove HPS'}</button>
    <button class="row-act-btn" data-row-override="notAttending" data-override-value="${na}" data-row-id="${escAttr(r.id)}">${na?'Not Attending':'Attending'}</button>
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
  return ((a.region || 999) - (b.region || 999)) ||
    ((a.sort || 999) - (b.sort || 999)) ||
    String(a.eventName || '').localeCompare(String(b.eventName || ''));
}

function athleteKey(v) {
  const id = String(v.athleteId || v.diveMeetsId || '').trim();
  if (id) return `id:${id}`;
  const name = String(v.athleteName || v.athlete || '').trim().toLowerCase();
  return name ? `name:${name}` : '';
}

/* ── Boot ─────────────────────────────────────────────────────── */
init();
