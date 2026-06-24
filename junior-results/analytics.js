/* ================================================================
   analytics.js — Junior Circuit pipeline analytics v2
   Per-stage dashboards: funnel + breakdown + category strip
   Counts are unique athletes (not rows). Toggle to entries.
   Foreign athletes shown at score-rank ghost position.
   ================================================================ */
(function () {
  'use strict';

  /* ── helpers ────────────────────────────────────────────────── */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function norm(v) {
    return String(v||'').toLowerCase().normalize('NFKD')
      .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function pct(n, d) { return d ? Math.round(100 * n / d) : 0; }
  function fmtScore(v) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n.toFixed(2) : '—'; }
  function agLabel(k) {
    return { 'Group A':'Group A','Group B':'Group B','Group C':'Group C','Group D':'Group D' }[k] || k || '—';
  }
  const ZONE_TO_EWC = {A:'East',B:'East',C:'Central',D:'Central',E:'West',F:'West'};
  const ZONE_COLOR  = {A:'#EEEDFE',B:'#EEEDFE',C:'#E1F5EE',D:'#E1F5EE',E:'#FAEEDA',F:'#FAEEDA'};
  const ZONE_INK    = {A:'#3C3489',B:'#3C3489',C:'#085041',D:'#085041',E:'#633806',F:'#633806'};

  /* ── data sources ───────────────────────────────────────────── */
  function allResults() {
    return typeof effectiveResults !== 'undefined'
      ? effectiveResults : (window.JUNIOR_RESULTS_DATA?.results || []);
  }
  const EWC = window.USAD_EWC_DATA || null;

  /* ── EWC registration lookup ─────────────────────────────────── */
  const _ewcSet = new Set();
  if (EWC?.entries) EWC.entries.forEach(e => _ewcSet.add(norm(e.name || '')));
  function isEWCReg(name) { return _ewcSet.has(norm(name || '')); }

  /* ── synthetic row check ─────────────────────────────────────── */
  function isSynth(r) { const s = r.sourceRow; return typeof s === 'string' && s.startsWith('synthetic'); }

  /* ── per-stage data builder ──────────────────────────────────── */
  // Returns unique-athlete counts for each metric
  function stageData(stage, filters) {
    const all = allResults().filter(r => !isSynth(r));
    function matchFilters(r) {
      if (filters.ageGroup && r.ageGroup !== filters.ageGroup) return false;
      if (filters.gender   && r.gender   !== filters.gender)   return false;
      if (filters.zone     && r.zone     !== filters.zone)     return false;
      if (filters.ewcMeet) {
        const m = r.ewc || ZONE_TO_EWC[r.zone] || '';
        if (m !== filters.ewcMeet) return false;
      }
      if (filters.discipline && r.discipline !== filters.discipline) return false;
      return true;
    }

    const rows = all.filter(r => {
      let stageMatch = false;
      if (stage === 'Regionals') stageMatch = r.stage === 'Regionals';
      else if (stage === 'Zones') stageMatch = r.stage === 'Zones';
      else if (stage === 'EWC')  stageMatch = r.stage === 'Zones'; // EWC dashboard uses zone data
      return stageMatch && matchFilters(r);
    });

    // Helper: unique athletes in a row set
    function uniq(arr, key) {
      const s = new Set(); arr.forEach(r => s.add(norm(r.athlete||''))); return s.size;
    }
    // Helper: entries count
    function entries(arr) { return arr.length; }

    if (stage === 'Regionals') {
      const qualified   = rows.filter(r => r.advancesToZone && !r.nonDisplacing);
      const zoneNames   = new Set(all.filter(r => r.stage==='Zones').map(r => norm(r.athlete||'')));
      const noShow      = qualified.filter(r => !zoneNames.has(norm(r.athlete||'')));
      const nd          = rows.filter(r => r.nonDisplacing);
      const foreign     = rows.filter(r => r.foreignDeclared || r.webpointNonUsEffective);
      const dual        = rows.filter(r => r.dualOtherCountry);
      const hps         = rows.filter(r => r.hps && !r.foreignDeclared);
      const bumped      = rows.filter(r => r.bumpIn);
      const opened      = rows.filter(r => r.openedSpot);
      const avgQual     = rows.filter(r => r.officialAverageScoreQualifier);

      return {
        total: uniq(rows), totalEntries: entries(rows),
        qualified: uniq(qualified), qualifiedEntries: entries(qualified),
        noShow: uniq(noShow), noShowEntries: entries(noShow),
        nd: uniq(nd), ndEntries: entries(nd),
        foreign: uniq(foreign), foreignEntries: entries(foreign), foreignRows: foreign,
        dual: uniq(dual), dualEntries: entries(dual), dualRows: dual,
        hps: uniq(hps), hpsEntries: entries(hps), hpsRows: hps,
        bumped: uniq(bumped), bumpedEntries: entries(bumped), bumpedRows: bumped,
        opened: uniq(opened), openedRows: opened,
        avgQual: uniq(avgQual), avgQualEntries: entries(avgQual),
        ymca: 0, ymcaEntries: 0, ymcaRows: [],
        noShowRows: noShow,
      };
    }

    if (stage === 'Zones' || stage === 'EWC') {
      const nd          = rows.filter(r => r.nonDisplacing);
      const foreign     = rows.filter(r => r.foreignDeclared || r.webpointNonUsEffective);
      const dual        = rows.filter(r => r.dualOtherCountry);
      const hps         = rows.filter(r => r.hps && !r.foreignDeclared);
      const ymca        = rows.filter(r => r.ymca);
      const natDirect   = rows.filter(r => r.advancesToNationals && !r.nonDisplacing);
      const ewcQualAll  = rows.filter(r => (r.advancesToEWC || r.advancesToNationals) && !r.nonDisplacing);
      const ewcOnly     = rows.filter(r => r.advancesToEWC && !r.advancesToNationals && !r.nonDisplacing);
      const bumped      = rows.filter(r => r.bumpIn);
      const opened      = rows.filter(r => r.openedSpot);
      const notAtt      = rows.filter(r => r.declaredNotAttending);

      // Unique athletes qualifying to EWC-only
      const ewcOnlyAths = new Map();
      ewcOnly.forEach(r => {
        const n = norm(r.athlete||'');
        if (!ewcOnlyAths.has(n)) ewcOnlyAths.set(n, r);
      });
      const regCount    = [...ewcOnlyAths.keys()].filter(n => isEWCReg(n)).length;
      const notRegCount = ewcOnlyAths.size - regCount;

      // Nat direct who are registered at EWC (non-displacing participation)
      const natAtEWC    = [...new Set(natDirect.map(r => norm(r.athlete||'')))].filter(n => isEWCReg(n)).length;

      return {
        total: uniq(rows), totalEntries: entries(rows),
        nd: uniq(nd), ndEntries: entries(nd),
        foreign: uniq(foreign), foreignEntries: entries(foreign), foreignRows: foreign,
        dual: uniq(dual), dualEntries: entries(dual), dualRows: dual,
        hps: uniq(hps), hpsEntries: entries(hps), hpsRows: hps,
        ymca: uniq(ymca), ymcaEntries: entries(ymca), ymcaRows: ymca,
        natDirect: uniq(natDirect), natDirectEntries: entries(natDirect),
        ewcQual: ewcOnlyAths.size, ewcQualEntries: entries(ewcOnly),
        ewcReg: regCount, ewcNotReg: notRegCount,
        natAtEWC,
        bumped: uniq(bumped), bumpedEntries: entries(bumped), bumpedRows: bumped,
        opened: uniq(opened), openedRows: opened,
        notAtt: uniq(notAtt), notAttEntries: entries(notAtt),
        noShowRows: [...ewcOnlyAths.values()].filter(r => !isEWCReg(r.athlete||'')),
      };
    }
    return {};
  }

  /* ── per-age-group breakdown ──────────────────────────────────── */
  function ageGenderBreakdown(stage, filters) {
    const all = allResults().filter(r => !isSynth(r));
    const groups  = ['Group A','Group B','Group C','Group D'];
    const genders = ['Girls','Boys'];
    const result  = {};
    for (const g of groups) {
      result[g] = {};
      for (const gn of genders) {
        const subset = all.filter(r => {
          if (stage === 'EWC') return r.stage === 'Zones' && r.ageGroup === g && r.gender === gn;
          return r.stage === stage && r.ageGroup === g && r.gender === gn;
        });
        const athletes = new Set(subset.map(r => norm(r.athlete||''))).size;
        result[g][gn] = { athletes, entries: subset.length };
      }
    }
    return result;
  }

  /* ── ghost rank calculator ───────────────────────────────────── */
  // For foreign athletes (place=127), compute where they'd rank by score
  function computeGhostRanks(eventRows) {
    const sorted = [...eventRows].sort((a,b) => (b.score||0) - (a.score||0));
    const ghostRanks = new Map();
    sorted.forEach((r, i) => {
      if (r.placeNumber === 127 || r.place === '127') {
        ghostRanks.set(norm(r.athlete||''), i + 1);
      }
    });
    return ghostRanks;
  }

  /* ── ui state ─────────────────────────────────────────────────── */
  const uiState = {
    stage:    'Zones',      // Regionals | Zones | EWC
    countMode:'athletes',  // athletes | entries
    openCat:  null,        // foreign | dual | hps | ymca | notatt | displacement | noshow
    ewcMeet:  '',          // East | Central | West | ''
    zone:     '',
    ageGroup: '',
    gender:   '',
    discipline:'',
  };

  function filters() {
    return {
      ageGroup:   uiState.ageGroup,
      gender:     uiState.gender,
      zone:       uiState.zone,
      ewcMeet:    uiState.ewcMeet,
      discipline: uiState.discipline,
    };
  }

  /* ── render ───────────────────────────────────────────────────── */
  function render() {
    const wrap = document.getElementById('tableWrap');
    const ctx  = document.getElementById('resultsContext');
    if (!wrap) return;

    const d   = stageData(uiState.stage, filters());
    const bkd = ageGenderBreakdown(uiState.stage, filters());

    if (ctx) ctx.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <strong style="font-size:13px;color:var(--ink)">Pipeline Analytics</strong>
        <span style="font-size:11px;color:var(--ink-3)">Junior Circuit 2026</span>
      </div>`;

    wrap.innerHTML = `<div class="an2-shell">${renderBody(d, bkd)}</div>`;
    injectCSS();
    wireEvents();
  }

  function renderBody(d, bkd) {
    return `
      ${renderStageNav()}
      ${renderCountToggle()}
      ${renderFilters()}
      ${renderFunnel(d)}
      ${renderBreakdownGrid(bkd)}
      ${renderCategoryStrip(d)}
      ${uiState.openCat ? renderDetailPanel(d) : ''}
    `;
  }

  /* ── stage nav ─────────────────────────────────────────────────── */
  function renderStageNav() {
    const stages = ['Regionals','Zones','EWC'];
    const labels = {Regionals:'Regionals',Zones:'Zones',EWC:'East / West / Central'};
    return `<div class="an2-stage-nav">
      ${stages.map(s => `<button class="an2-stage-btn${s===uiState.stage?' active':''}"
        onclick="window._anStage('${s}')">${esc(labels[s])}</button>`).join('')}
    </div>`;
  }

  window._anStage = s => { uiState.stage = s; uiState.openCat = null; render(); };

  /* ── count toggle ──────────────────────────────────────────────── */
  function renderCountToggle() {
    const on = uiState.countMode;
    return `<div class="an2-bar">
      <div class="an2-toggle">
        <button class="an2-tpill${on==='athletes'?' on':''}" onclick="window._anMode('athletes')">Athletes</button>
        <button class="an2-tpill${on==='entries'?' on':''}" onclick="window._anMode('entries')">Entries</button>
      </div>
      ${uiState.stage === 'EWC' ? `
      <div class="an2-toggle" style="margin-left:12px">
        ${['','East','Central','West'].map(m=>`
          <button class="an2-tpill${uiState.ewcMeet===m?' on':''}" onclick="window._anEWC('${m}')">
            ${m || 'All meets'}
          </button>`).join('')}
      </div>` : ''}
    </div>`;
  }
  window._anMode = m => { uiState.countMode = m; render(); };
  window._anEWC  = m => { uiState.ewcMeet = m; render(); };

  /* ── filters ────────────────────────────────────────────────────── */
  function renderFilters() {
    function chip(field, val, label) {
      const on = uiState[field] === val;
      return `<button class="an2-chip${on?' on':''}" onclick="window._anFilter('${field}','${val}')">${esc(label)}</button>`;
    }
    return `<div class="an2-filters">
      <div class="an2-filter-group">
        ${chip('ageGroup','','All groups')}
        ${chip('ageGroup','Group A','Group A')}
        ${chip('ageGroup','Group B','Group B')}
        ${chip('ageGroup','Group C','Group C')}
        ${chip('ageGroup','Group D','Group D')}
      </div>
      <div class="an2-filter-group">
        ${chip('gender','','All genders')}
        ${chip('gender','Girls','Girls')}
        ${chip('gender','Boys','Boys')}
      </div>
      <div class="an2-filter-group">
        ${chip('discipline','','All boards')}
        ${chip('discipline','1M','1M')}
        ${chip('discipline','3M','3M')}
        ${chip('discipline','Platform','Platform')}
      </div>
      ${uiState.stage === 'Zones' || uiState.stage === 'EWC' ? `
      <div class="an2-filter-group">
        ${chip('zone','','All zones')}
        ${['A','B','C','D','E','F'].map(z=>chip('zone',z,`Zone ${z}`)).join('')}
      </div>` : ''}
    </div>`;
  }
  window._anFilter = (f,v) => {
    uiState[f] = uiState[f] === v ? '' : v;
    render();
  };

  /* ── funnel ──────────────────────────────────────────────────────── */
  function renderFunnel(d) {
    const cm = uiState.countMode;
    if (uiState.stage === 'Regionals') {
      const total = cm==='athletes' ? d.total : d.totalEntries;
      const qual  = cm==='athletes' ? d.qualified : d.qualifiedEntries;
      const adv   = qual - (cm==='athletes' ? d.noShow : d.noShowEntries);
      const noShow= cm==='athletes' ? d.noShow : d.noShowEntries;
      return `<div class="an2-funnel">
        <div class="an2-funnel-title">Regionals — qualification funnel
          <span>${cm === 'athletes' ? 'Unique athletes' : 'Event entries'}</span></div>
        ${funnelRow('Competed', total, total, '#E6F1FB','#0C447C', '')}
        ${funnelRow('Qualified → Zones', qual, total, '#EAF3DE','#27500A',
          `<span style="color:#D85A30;font-weight:500">${noShow}</span> <span>didn't compete at Zones (${pct(noShow,qual)}%)</span>`)}
        ${funnelRow('Attended Zones', adv, total, '#B5D4F4','#0C447C', '')}
        ${d.avgQual ? funnelRow('Via 15th avg threshold', cm==='athletes'?d.avgQual:d.avgQualEntries, qual, '#EEEDFE','#3C3489', '') : ''}
        ${funnelRow('Non-displacing', cm==='athletes'?d.nd:d.ndEntries, total, '#F1EFE8','#5F5E5A', 'did not consume spots')}
        ${funnelRow('Displacements (bump-ins)', cm==='athletes'?d.bumped:d.bumpedEntries, total, '#EEEDFE','#534AB7', 'athletes moved up')}
      </div>`;
    }
    if (uiState.stage === 'Zones' || uiState.stage === 'EWC') {
      const total    = cm==='athletes' ? d.total : d.totalEntries;
      const natD     = cm==='athletes' ? d.natDirect : d.natDirectEntries;
      const ewcQ     = cm==='athletes' ? d.ewcQual : d.ewcQualEntries;
      const ewcR     = d.ewcReg;
      const ewcNR    = d.ewcNotReg;
      return `<div class="an2-funnel">
        <div class="an2-funnel-title">${uiState.stage === 'EWC' ? 'Zones → East / West / Central' : 'Zones'} — qualification funnel
          <span>${cm === 'athletes' ? 'Unique athletes' : 'Event entries'}</span></div>
        ${funnelRow('Competed at Zones', total, total, '#E6F1FB','#0C447C', '')}
        ${funnelRow('→ Nationals direct', natD, total, '#EAF3DE','#27500A', 'top 3 per zone event')}
        ${funnelRow('→ E/W/C qualified', ewcQ, total, '#E6F1FB','#185FA5', 'places 4–18 + avg threshold')}
        ${funnelRow('Registered at E/W/C', ewcR, ewcQ, '#B5D4F4','#0C447C',
          `<span style="color:#D85A30;font-weight:500">${ewcNR}</span> <span>qualified but didn't register (${pct(ewcNR,ewcQ)}%)</span>`)}
        ${funnelRow('Non-displacing at Zones', cm==='athletes'?d.nd:d.ndEntries, total, '#F1EFE8','#5F5E5A', 'did not consume spots')}
        ${funnelRow('Displacements (bump-ins)', cm==='athletes'?d.bumped:d.bumpedEntries, total, '#EEEDFE','#534AB7', '')}
      </div>`;
    }
    return '';
  }

  function funnelRow(label, n, total, fillColor, textColor, note) {
    const w = total > 0 ? Math.max(4, Math.round(100 * n / total)) : 0;
    return `<div class="an2-f-row">
      <div class="an2-f-label">${esc(label)}</div>
      <div class="an2-f-track">
        <div class="an2-f-fill" style="width:${w}%;background:${fillColor}">
          <span style="color:${textColor};font-weight:500;font-size:11px">${n.toLocaleString()}</span>
        </div>
      </div>
      <div class="an2-f-note">${note}</div>
    </div>`;
  }

  /* ── breakdown grid ──────────────────────────────────────────────── */
  function renderBreakdownGrid(bkd) {
    const cm = uiState.countMode;
    const groups = ['Group A','Group B','Group C','Group D'];
    return `<div class="an2-bk-grid">
      ${groups.map(g => `<div class="an2-bk-card">
        <div class="an2-bk-group">${esc(agLabel(g))}</div>
        ${['Girls','Boys'].map(gn => {
          const cell = bkd[g]?.[gn] || {athletes:0,entries:0};
          const primary = cm==='athletes' ? cell.athletes : cell.entries;
          const sub     = cm==='athletes' ? `${cell.entries} entries` : `${cell.athletes} athletes`;
          return `<div class="an2-bk-row">
            <span class="an2-bk-gender">${esc(gn)}</span>
            <div class="an2-bk-vals">
              <span class="an2-bk-primary">${primary}</span>
              <span class="an2-bk-sub">${esc(sub)}</span>
            </div>
          </div>`;
        }).join('')}
      </div>`).join('')}
    </div>`;
  }

  /* ── category strip ──────────────────────────────────────────────── */
  function renderCategoryStrip(d) {
    const cm = uiState.countMode;
    const cats = [
      { key:'foreign',     icon:'ti-flag',           label:'Foreign',        n:d.foreign,    e:d.foreignEntries,  color:'#A32D2D', bg:'#FCEBEB', bc:'#E24B4A' },
      { key:'dual',        icon:'ti-globe',          label:'Dual citizen',   n:d.dual,       e:d.dualEntries,     color:'#185FA5', bg:'#E6F1FB', bc:'#378ADD' },
      { key:'hps',         icon:'ti-star',           label:'HPS',            n:d.hps,        e:d.hpsEntries,      color:'#854F0B', bg:'#FAEEDA', bc:'#EF9F27' },
      { key:'ymca',        icon:'ti-award',          label:'YMCA',           n:d.ymca||0,    e:d.ymcaEntries||0,  color:'#0F6E56', bg:'#E1F5EE', bc:'#1D9E75' },
      { key:'noshow',      icon:'ti-user-off',       label:'Did not compete',n:d.ewcNotReg||d.noShow||0, e:0, color:'#5F5E5A', bg:'#F1EFE8', bc:'#888780' },
      { key:'displacement',icon:'ti-arrows-exchange',label:'Displacements',  n:d.bumped||0,  e:d.bumpedEntries||0,color:'#534AB7', bg:'#EEEDFE', bc:'#7F77DD' },
    ];
    return `<div class="an2-cat-strip">
      ${cats.map(c => {
        const isOpen = uiState.openCat === c.key;
        const count  = cm==='athletes' ? c.n : c.e;
        const sub    = cm==='athletes' ? `${c.e} entries` : `${c.n} athletes`;
        return `<div class="an2-cat-card${isOpen?' open':''}"
          style="${isOpen?`border-color:${c.bc};background:${c.bg};`:''}"
          onclick="window._anCat('${c.key}')">
          <i class="ti ${c.icon} an2-cat-icon" style="color:${isOpen?c.color:'var(--ink-3)'}" aria-hidden="true"></i>
          <div class="an2-cat-name">${esc(c.label)}</div>
          <div class="an2-cat-n" style="${isOpen?`color:${c.color}`:''}">${count}</div>
          <div class="an2-cat-sub">${esc(sub)}</div>
        </div>`;
      }).join('')}
    </div>`;
  }
  window._anCat = k => { uiState.openCat = uiState.openCat===k ? null : k; render(); };

  /* ── detail panel ────────────────────────────────────────────────── */
  function renderDetailPanel(d) {
    const cat = uiState.openCat;
    let rows = [];
    let title = '', note = '', headerBg = '#F1F5F9', headerColor = '#334155';

    if (cat === 'foreign') {
      rows = d.foreignRows || [];
      title = `Foreign athletes — ${d.foreign} athletes · ${d.foreignEntries} entries`;
      note  = 'Non-displacing · shown at score-rank position (ghost place) · do not consume qualifying spots';
      headerBg = '#FCEBEB'; headerColor = '#791F1F';
    } else if (cat === 'dual') {
      rows = d.dualRows || [];
      title = `Dual citizens — ${d.dual} athletes · ${d.dualEntries} entries`;
      note  = 'Competed for another federation · non-displacing · do not consume qualifying spots';
      headerBg = '#E6F1FB'; headerColor = '#0C447C';
    } else if (cat === 'hps') {
      rows = d.hpsRows || [];
      title = `HPS athletes — ${d.hps} athletes · ${d.hpsEntries} entries`;
      note  = 'High Performance Squad Tier 3 · pre-qualified to Junior Nationals · non-displacing at Zones';
      headerBg = '#FAEEDA'; headerColor = '#633806';
    } else if (cat === 'ymca') {
      rows = d.ymcaRows || [];
      title = `YMCA champions — ${d.ymca} athletes · ${d.ymcaEntries} entries`;
      note  = 'YMCA event champions · pre-qualified to East/West/Central';
      headerBg = '#E1F5EE'; headerColor = '#085041';
    } else if (cat === 'displacement') {
      rows = d.bumpedRows || [];
      title = `Displacement bump-ins — ${d.bumped} athletes`;
      note  = 'Athletes who moved up due to a non-displacing athlete ahead of them';
      headerBg = '#EEEDFE'; headerColor = '#3C3489';
    } else if (cat === 'noshow') {
      rows = d.noShowRows || [];
      const n = rows.length > 0 ? new Set(rows.map(r => norm(r.athlete||''))).size : (d.ewcNotReg || d.noShow || 0);
      title = `Did not compete — ${n} athletes`;
      note  = uiState.stage === 'Regionals'
        ? 'Qualified at Regionals but did not appear at Zones'
        : 'Qualified at Zones (places 4–18) but did not register for East/West/Central';
      headerBg = '#F1EFE8'; headerColor = '#444441';
    }

    if (!rows.length) {
      return `<div class="an2-detail">
        <div class="an2-detail-header" style="background:${headerBg}">
          <div class="an2-detail-title" style="color:${headerColor}">${esc(title)}</div>
          <div class="an2-detail-note">${esc(note)}</div>
        </div>
        <div style="padding:20px;text-align:center;color:var(--ink-4);font-size:12px">No data matches current filters.</div>
      </div>`;
    }

    // Deduplicate: one row per athlete per event
    const deduped = [];
    const seen = new Set();
    rows.forEach(r => {
      const k = `${norm(r.athlete||'')}|${r.eventKey||''}|${r.zone||''}`;
      if (!seen.has(k)) { seen.add(k); deduped.push(r); }
    });

    // Group by athlete
    const byAthlete = new Map();
    deduped.forEach(r => {
      const k = norm(r.athlete||'');
      if (!byAthlete.has(k)) byAthlete.set(k, { r, events: [] });
      byAthlete.get(k).events.push(r);
    });

    // For ghost rank: compute per event
    const all = allResults().filter(x => !isSynth(x));

    const tableRows = [...byAthlete.values()].map(({ r, events }) => {
      const zone = r.zone || '';
      const zoneLabel = zone ? `Zone ${zone}` : '—';
      const zBg = ZONE_COLOR[zone] || '#f3f4f6';
      const zInk = ZONE_INK[zone] || '#374151';
      const ewcMeet = r.ewc || ZONE_TO_EWC[zone] || '';

      const eventCells = events.map(ev => {
        // Ghost rank for foreign/127 athletes
        let placeDisplay = ev.place === '127' || ev.placeNumber === 127 ? '—' : (ev.place || '—');
        let ghostNote = '';
        if (ev.placeNumber === 127 || ev.place === '127') {
          const evRows = all.filter(x => x.stage === ev.stage && x.zone === ev.zone && x.eventKey === ev.eventKey);
          const ghosts = computeGhostRanks(evRows);
          const ghostRank = ghosts.get(norm(ev.athlete||''));
          if (ghostRank) {
            placeDisplay = `<span title="Score rank if eligible">${ghostRank}*</span>`;
            ghostNote = `<span class="an2-ghost-note">*score rank (exhibition)</span>`;
          }
        } else {
          placeDisplay = ev.place || '—';
        }

        const scoreDisp = fmtScore(ev.score);
        const eligDisp  = ev.eligibleRank != null ? ev.eligibleRank : '—';
        return `<div class="an2-ev-row">
          <span class="an2-ev-name">${esc(ev.eventKey||'')}</span>
          <span class="an2-ev-place">Place: ${placeDisplay} ${ghostNote}</span>
          <span class="an2-ev-score">${esc(scoreDisp)}</span>
          ${cat === 'displacement' ? `<span class="an2-ev-bump">bumped by ${esc((ev.bumpedBy||[]).map(b=>b.athlete).join(', '))}</span>` : ''}
        </div>`;
      }).join('');

      const flags = [];
      if (r.keptInvitedJoNationals) flags.push(`<span class="an2-pill an2-pill-kept">Kept invited</span>`);
      if (r.petition)               flags.push(`<span class="an2-pill an2-pill-pet">Petition</span>`);
      if (r.reviewFlags?.length)    flags.push(`<span class="an2-pill an2-pill-rev">Review</span>`);

      return `<tr>
        <td style="padding:10px 12px;border-bottom:0.5px solid var(--line-2);vertical-align:top">
          <div style="font-weight:500;font-size:13px;color:var(--ink)">${esc(r.athlete||'')}</div>
          ${r.diveMeetsId ? `<div style="font-size:10px;color:var(--ink-4);font-family:var(--f-mono,'JetBrains Mono',monospace)">DM ${esc(r.diveMeetsId)}</div>` : ''}
          ${r.team ? `<div style="font-size:11px;color:var(--ink-3);margin-top:1px">${esc(r.team)}</div>` : ''}
          ${flags.length ? `<div style="margin-top:4px;display:flex;gap:3px;flex-wrap:wrap">${flags.join('')}</div>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:0.5px solid var(--line-2);vertical-align:top;white-space:nowrap">
          <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;background:${zBg};color:${zInk}">${esc(zoneLabel)}</span>
          ${ewcMeet ? `<div style="font-size:10px;color:var(--ink-4);margin-top:3px">→ ${esc(ewcMeet)}</div>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:0.5px solid var(--line-2);vertical-align:top">
          ${eventCells}
        </td>
      </tr>`;
    }).join('');

    return `<div class="an2-detail">
      <div class="an2-detail-header" style="background:${headerBg}">
        <div class="an2-detail-title" style="color:${headerColor}">${esc(title)}</div>
        <div class="an2-detail-note">${esc(note)}</div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr>
              <th style="background:var(--surface-2);padding:7px 12px;text-align:left;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);border-bottom:1px solid var(--line)">Athlete</th>
              <th style="background:var(--surface-2);padding:7px 12px;text-align:left;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);border-bottom:1px solid var(--line)">Zone</th>
              <th style="background:var(--surface-2);padding:7px 12px;text-align:left;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);border-bottom:1px solid var(--line)">Events</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>`;
  }

  /* ── CSS ──────────────────────────────────────────────────────────── */
  let cssInjected = false;
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const s = document.createElement('style');
    s.textContent = `
.an2-shell{display:flex;flex-direction:column;gap:10px;padding:0 0 24px}
.an2-stage-nav{display:flex;gap:6px;flex-wrap:wrap;padding:12px 0 4px}
.an2-stage-btn{padding:7px 18px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;
  border:1.5px solid var(--line);background:var(--surface);color:var(--ink-3);transition:all .15s}
.an2-stage-btn:hover{border-color:var(--pool);color:var(--pool)}
.an2-stage-btn.active{background:var(--nav,#0a0e38);color:#fff;border-color:var(--nav,#0a0e38)}
.an2-bar{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:4px 0}
.an2-toggle{display:flex;background:var(--surface-2);border-radius:20px;padding:2px;border:1px solid var(--line);gap:2px}
.an2-tpill{padding:4px 12px;border-radius:18px;font-size:11px;font-weight:500;cursor:pointer;
  border:none;background:transparent;color:var(--ink-3);transition:all .15s}
.an2-tpill.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.an2-filters{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0 8px;border-bottom:1px solid var(--line-2)}
.an2-filter-group{display:flex;gap:3px;flex-wrap:wrap}
.an2-chip{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;cursor:pointer;
  border:1px solid var(--line);background:var(--surface-2);color:var(--ink-3);transition:all .12s}
.an2-chip:hover{border-color:var(--pool);color:var(--pool)}
.an2-chip.on{background:var(--nav,#0a0e38);color:#fff;border-color:var(--nav,#0a0e38)}
.an2-funnel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);padding:14px 18px;display:flex;flex-direction:column;gap:7px}
.an2-funnel-title{font-size:12px;font-weight:500;color:var(--ink);margin-bottom:4px;display:flex;align-items:center;justify-content:space-between}
.an2-funnel-title span{font-size:10px;font-weight:400;color:var(--ink-4)}
.an2-f-row{display:flex;align-items:center;gap:10px}
.an2-f-label{font-size:11px;color:var(--ink-3);width:160px;flex-shrink:0;text-align:right}
.an2-f-track{flex:1;height:26px;background:var(--surface-2);border-radius:4px;overflow:hidden}
.an2-f-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding:0 8px;min-width:32px;transition:width .35s}
.an2-f-note{font-size:11px;color:var(--ink-3);width:240px;flex-shrink:0}
.an2-bk-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.an2-bk-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);padding:10px 12px}
.an2-bk-group{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-4);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--line-2)}
.an2-bk-row{display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:0.5px solid var(--line-2)}
.an2-bk-row:last-child{border-bottom:none}
.an2-bk-gender{font-size:11px;color:var(--ink-3)}
.an2-bk-vals{display:flex;flex-direction:column;align-items:flex-end}
.an2-bk-primary{font-size:15px;font-weight:500;color:var(--ink);line-height:1.1}
.an2-bk-sub{font-size:10px;color:var(--ink-4)}
.an2-cat-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.an2-cat-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);
  padding:10px 10px 8px;cursor:pointer;transition:all .12s;text-align:left}
.an2-cat-card:hover{border-color:var(--pool)}
.an2-cat-icon{font-size:16px;display:block;margin-bottom:4px;color:var(--ink-4)}
.an2-cat-name{font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);margin-bottom:3px}
.an2-cat-n{font-size:18px;font-weight:500;color:var(--ink);line-height:1.1}
.an2-cat-sub{font-size:10px;color:var(--ink-4);margin-top:1px}
.an2-detail{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);overflow:hidden}
.an2-detail-header{padding:12px 16px;border-bottom:1px solid var(--line)}
.an2-detail-title{font-size:13px;font-weight:500}
.an2-detail-note{font-size:11px;opacity:.75;margin-top:2px}
.an2-ev-row{display:flex;align-items:baseline;gap:8px;padding:2px 0;border-bottom:0.5px solid var(--line-2)}
.an2-ev-row:last-child{border-bottom:none}
.an2-ev-name{font-size:11px;color:var(--ink-2);flex:1}
.an2-ev-place{font-size:11px;color:var(--ink-3);white-space:nowrap}
.an2-ev-score{font-size:11px;font-family:var(--f-mono,'JetBrains Mono',monospace);color:var(--ink-2);white-space:nowrap}
.an2-ev-bump{font-size:10px;color:#534AB7;white-space:nowrap}
.an2-ghost-note{font-size:9px;color:var(--ink-4);font-style:italic}
.an2-pill{display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:500}
.an2-pill-kept{background:#E1F5EE;color:#085041}
.an2-pill-pet{background:#EEEDFE;color:#3C3489}
.an2-pill-rev{background:#FAEEDA;color:#633806}
`;
    document.head.appendChild(s);
  }

  function wireEvents() { /* all wired via onclick=window._ */ }

  /* ── hook ─────────────────────────────────────────────────────────── */
  function init() {
    injectCSS();
    window._qvRenderReports = render;
    window._anRender = render;
    console.log('[analytics v2] ready');
  }

  function waitForMain(cb, n) {
    n = n || 0;
    if (typeof effectiveResults !== 'undefined' || window.JUNIOR_RESULTS_DATA) cb();
    else if (n < 120) setTimeout(() => waitForMain(cb, n+1), 50);
  }

  waitForMain(init);
})();
