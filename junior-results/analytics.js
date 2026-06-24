/* ================================================================
   analytics.js — Junior Circuit pipeline analytics v3
   Full participation filter system:
   - Filter by region (1-12), zone (A-F), E/W/C meet, age group,
     gender, discipline, team
   - Region→Zone mapping handled correctly (many-to-many)
   - Future Champions rows excluded (gender=Women/Men, no ageGroup)
   - Correct unique-athlete counts throughout
   - Ghost rank for exhibition/127 athletes
   - Athletes vs entries toggle
   ================================================================ */
(function () {
  'use strict';

  /* ── helpers ─────────────────────────────────────────────────── */
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
  function fmt(v) { const n=Number(v); return Number.isFinite(n)&&n>0?n.toFixed(2):'—'; }

  /* ── constants ──────────────────────────────────────────────── */
  const ZONE_TO_EWC = {A:'East',B:'East',C:'Central',D:'Central',E:'West',F:'West'};
  const ZONE_BG     = {A:'#EEEDFE',B:'#EEEDFE',C:'#E1F5EE',D:'#E1F5EE',E:'#FAEEDA',F:'#FAEEDA'};
  const ZONE_INK    = {A:'#3C3489',B:'#3C3489',C:'#085041',D:'#085041',E:'#633806',F:'#633806'};

  // Region → primary zone(s) — inferred from athlete data
  const REGION_TO_ZONES = {
    '1':['A'], '2':['A','B','D'], '3':['B'], '4':['B'],
    '5':['C'], '6':['C','D'], '7':['D'], '8':['A','D','F'],
    '9':['E'], '10':['B','E','F'], '11':['D','F'], '12':['C','F']
  };

  /* ── data sources ───────────────────────────────────────────── */
  function getRaw() {
    return typeof effectiveResults !== 'undefined'
      ? effectiveResults : (window.JUNIOR_RESULTS_DATA?.results || []);
  }
  const EWC = window.USAD_EWC_DATA || null;

  const _ewcSet = new Set();
  if (EWC?.entries) EWC.entries.forEach(e => _ewcSet.add(norm(e.name||'')));
  function isEWCReg(name) { return _ewcSet.has(norm(name||'')); }

  // Exclude synthetic rows and Future Champions rows
  function isJuniorRow(r) {
    const sr = r.sourceRow;
    if (typeof sr === 'string' && sr.startsWith('synthetic')) return false;
    if (r.gender === 'Women' || r.gender === 'Men') return false;
    if (!r.ageGroup) return false;
    return true;
  }

  function allJunior() { return getRaw().filter(isJuniorRow); }

  /* ── filter state ───────────────────────────────────────────── */
  const F = {
    stage:      'Zones',   // Regionals | Zones | EWC
    countMode:  'athletes',
    openCat:    null,
    // filter dimensions
    region:     '',   // '1'-'12' or ''
    zone:       '',   // 'A'-'F' or ''
    ewcMeet:    '',   // East|Central|West or ''
    ageGroup:   '',
    gender:     '',
    discipline: '',
    team:       '',
    teamSearch: '',
  };

  /* ── row filter predicate ───────────────────────────────────── */
  function rowMatches(r) {
    // Region filter: athlete must have competed at this region
    if (F.region) {
      const reg = str(r.region);
      // For zone rows, check if region maps to their zone
      if (r.stage === 'Zones') {
        const allowed = REGION_TO_ZONES[F.region] || [];
        if (!allowed.includes(r.zone)) return false;
      } else {
        if (reg !== F.region) return false;
      }
    }
    if (F.zone    && r.zone    !== F.zone)        return false;
    if (F.ewcMeet) {
      const m = r.ewc || ZONE_TO_EWC[r.zone] || '';
      if (m !== F.ewcMeet) return false;
    }
    if (F.ageGroup   && r.ageGroup   !== F.ageGroup)   return false;
    if (F.gender     && r.gender     !== F.gender)     return false;
    if (F.discipline && r.discipline !== F.discipline) return false;
    if (F.teamSearch) {
      const t = (r.team||'').toLowerCase();
      if (!t.includes(F.teamSearch.toLowerCase())) return false;
    }
    return true;
  }

  function str(v) { return String(v==null?'':v).trim(); }

  /* ── unique athlete counter ─────────────────────────────────── */
  function uniqCount(rows)   { return new Set(rows.map(r=>norm(r.athlete||''))).size; }
  function entries(rows)     { return rows.length; }
  function count(rows)       { return F.countMode==='athletes' ? uniqCount(rows) : entries(rows); }
  function subCount(rows)    { return F.countMode==='athletes' ? `${entries(rows)} entries` : `${uniqCount(rows)} athletes`; }

  /* ── stage data builder ─────────────────────────────────────── */
  function buildData() {
    const all = allJunior();

    if (F.stage === 'Regionals') {
      const rows   = all.filter(r => r.stage==='Regionals' && rowMatches(r));
      const qual   = rows.filter(r => r.advancesToZone && !r.nonDisplacing);
      const zNames = new Set(all.filter(r=>r.stage==='Zones').map(r=>norm(r.athlete||'')));
      const noShow = qual.filter(r => !zNames.has(norm(r.athlete||'')));
      const nd     = rows.filter(r => r.nonDisplacing);
      const foreign= rows.filter(r => r.foreignDeclared || r.webpointNonUsEffective);
      const dual   = rows.filter(r => r.dualOtherCountry);
      const hps    = rows.filter(r => r.hps && !r.foreignDeclared);
      const bumped = rows.filter(r => r.bumpIn);
      const opened = rows.filter(r => r.openedSpot);
      const avgQ   = rows.filter(r => r.officialAverageScoreQualifier);
      return { rows, qual, noShow, nd, foreign, dual, hps, bumped, opened, avgQ,
               ymca:[], notAtt:[], ewcQual:[], ewcQualAths:0, ewcReg:0, ewcNotReg:0,
               natDirect:[], noShowRows:noShow };
    }

    // Zones or EWC dashboard — both use zone result rows
    const rows    = all.filter(r => r.stage==='Zones' && rowMatches(r));
    const nd      = rows.filter(r => r.nonDisplacing);
    const foreign = rows.filter(r => r.foreignDeclared || r.webpointNonUsEffective);
    const dual    = rows.filter(r => r.dualOtherCountry);
    const hps     = rows.filter(r => r.hps && !r.foreignDeclared);
    const ymca    = rows.filter(r => r.ymca);
    const natD    = rows.filter(r => r.advancesToNationals && !r.nonDisplacing);
    const ewcOnly = rows.filter(r => r.advancesToEWC && !r.advancesToNationals && !r.nonDisplacing);
    const bumped  = rows.filter(r => r.bumpIn);
    const opened  = rows.filter(r => r.openedSpot);
    const notAtt  = rows.filter(r => r.declaredNotAttending);

    // EWC qualifiers: unique athletes
    const ewcAthMap = new Map();
    ewcOnly.forEach(r => { const n=norm(r.athlete||''); if(!ewcAthMap.has(n)) ewcAthMap.set(n,r); });
    const ewcReg    = [...ewcAthMap.keys()].filter(n=>isEWCReg(n)).length;
    const ewcNotReg = ewcAthMap.size - ewcReg;
    const noShowRows= [...ewcAthMap.values()].filter(r=>!isEWCReg(r.athlete||''));

    return { rows, nd, foreign, dual, hps, ymca, bumped, opened, notAtt,
             natDirect:natD, ewcQual:ewcOnly, ewcQualAths:ewcAthMap.size,
             ewcReg, ewcNotReg, noShowRows,
             // regionals-only fields
             qual:[], noShow:[], avgQ:[] };
  }

  /* ── age/gender breakdown ───────────────────────────────────── */
  function buildBreakdown() {
    const all = allJunior();
    const groups  = ['Group A','Group B','Group C','Group D'];
    const genders = ['Girls','Boys'];
    const res = {};
    for (const g of groups) {
      res[g] = {};
      for (const gn of genders) {
        const sub = all.filter(r => {
          if (F.stage==='Regionals') { if (r.stage!=='Regionals') return false; }
          else                        { if (r.stage!=='Zones') return false; }
          if (r.ageGroup!==g || r.gender!==gn) return false;
          // apply region/zone/ewc filters but not ageGroup/gender
          if (F.region) {
            if (r.stage==='Zones') {
              const allowed=REGION_TO_ZONES[F.region]||[];
              if(!allowed.includes(r.zone)) return false;
            } else {
              if(str(r.region)!==F.region) return false;
            }
          }
          if (F.zone    && r.zone!==F.zone) return false;
          if (F.ewcMeet && (r.ewc||ZONE_TO_EWC[r.zone]||'')!==F.ewcMeet) return false;
          if (F.discipline && r.discipline!==F.discipline) return false;
          if (F.teamSearch && !(r.team||'').toLowerCase().includes(F.teamSearch.toLowerCase())) return false;
          return true;
        });
        res[g][gn] = { athletes: uniqCount(sub), entries: entries(sub) };
      }
    }
    return res;
  }

  /* ── teams list ─────────────────────────────────────────────── */
  function getTeams() {
    const all = allJunior();
    const stageRows = all.filter(r => F.stage==='Regionals' ? r.stage==='Regionals' : r.stage==='Zones');
    return [...new Set(stageRows.map(r=>r.team||'').filter(Boolean))].sort();
  }

  /* ── ghost rank ─────────────────────────────────────────────── */
  function ghostRank(evRow, allRows) {
    const evRows = allRows.filter(r => r.stage===evRow.stage && r.zone===evRow.zone && r.eventKey===evRow.eventKey);
    const sorted = [...evRows].sort((a,b)=>(b.score||0)-(a.score||0));
    const idx = sorted.findIndex(r => norm(r.athlete||'')===norm(evRow.athlete||''));
    return idx >= 0 ? idx+1 : null;
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  function render() {
    const wrap = document.getElementById('tableWrap');
    const ctx  = document.getElementById('resultsContext');
    if (!wrap) return;

    if (ctx) ctx.innerHTML = `<div style="display:flex;align-items:center;gap:10px">
      <strong style="font-size:13px;color:var(--ink)">Pipeline Analytics</strong>
      <span style="font-size:11px;color:var(--ink-3)">Junior Circuit 2026 · ${F.countMode==='athletes'?'unique athletes':'event entries'}</span>
    </div>`;

    const d   = buildData();
    const bkd = buildBreakdown();

    wrap.innerHTML = `<div class="an3">
      ${renderStageNav()}
      ${renderTopBar()}
      ${renderFilters()}
      ${renderFunnel(d)}
      ${renderBreakdownGrid(bkd)}
      ${renderCatStrip(d)}
      ${F.openCat ? renderDetail(d) : ''}
    </div>`;

    injectCSS();
  }

  /* ── stage nav ──────────────────────────────────────────────── */
  function renderStageNav() {
    const stages = [
      {id:'Regionals', label:'Regionals'},
      {id:'Zones',     label:'Zones'},
      {id:'EWC',       label:'East / West / Central'},
    ];
    return `<div class="an3-stage-nav">
      ${stages.map(s=>`<button class="an3-sb${s.id===F.stage?' on':''}"
        onclick="window._an3Stage('${s.id}')">${esc(s.label)}</button>`).join('')}
    </div>`;
  }
  window._an3Stage = s => { F.stage=s; F.openCat=null; render(); };

  /* ── top bar (count toggle) ─────────────────────────────────── */
  function renderTopBar() {
    return `<div class="an3-bar">
      <div class="an3-tog">
        <button class="an3-tp${F.countMode==='athletes'?' on':''}" onclick="window._an3Mode('athletes')">Athletes</button>
        <button class="an3-tp${F.countMode==='entries'?' on':''}" onclick="window._an3Mode('entries')">Entries</button>
      </div>
    </div>`;
  }
  window._an3Mode = m => { F.countMode=m; render(); };

  /* ── filters ────────────────────────────────────────────────── */
  function renderFilters() {
    function chip(field, val, label, tooltip) {
      const on = F[field]===val;
      return `<button class="an3-chip${on?' on':''}"
        title="${esc(tooltip||'')}"
        onclick="window._an3F('${field}','${val}')">${esc(label)}</button>`;
    }

    const teams = getTeams();

    return `<div class="an3-filters">

      <div class="an3-filter-section">
        <div class="an3-filter-label">Age group</div>
        <div class="an3-filter-row">
          ${chip('ageGroup','','All')}
          ${chip('ageGroup','Group A','Group A')}
          ${chip('ageGroup','Group B','Group B')}
          ${chip('ageGroup','Group C','Group C')}
          ${chip('ageGroup','Group D','Group D')}
        </div>
      </div>

      <div class="an3-filter-section">
        <div class="an3-filter-label">Gender</div>
        <div class="an3-filter-row">
          ${chip('gender','','All')}
          ${chip('gender','Girls','Girls')}
          ${chip('gender','Boys','Boys')}
        </div>
      </div>

      <div class="an3-filter-section">
        <div class="an3-filter-label">Board</div>
        <div class="an3-filter-row">
          ${chip('discipline','','All')}
          ${chip('discipline','1M','1M')}
          ${chip('discipline','3M','3M')}
          ${chip('discipline','Platform','Platform')}
        </div>
      </div>

      ${F.stage==='Regionals' ? `
      <div class="an3-filter-section">
        <div class="an3-filter-label">Region</div>
        <div class="an3-filter-row">
          ${chip('region','','All')}
          ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n=>{
            const zones = (REGION_TO_ZONES[String(n)]||[]).join('/');
            return chip('region',String(n),`Region ${n}`,`Zone ${zones}`);
          }).join('')}
        </div>
      </div>` : ''}

      ${F.stage==='Zones'||F.stage==='EWC' ? `
      <div class="an3-filter-section">
        <div class="an3-filter-label">Zone</div>
        <div class="an3-filter-row">
          ${chip('zone','','All')}
          ${['A','B','C','D','E','F'].map(z=>chip('zone',z,`Zone ${z}`,`→ ${ZONE_TO_EWC[z]}`)).join('')}
        </div>
      </div>

      <div class="an3-filter-section">
        <div class="an3-filter-label">E/W/C meet</div>
        <div class="an3-filter-row">
          ${chip('ewcMeet','','All')}
          ${chip('ewcMeet','East','East')}
          ${chip('ewcMeet','Central','Central')}
          ${chip('ewcMeet','West','West')}
        </div>
      </div>` : ''}

      <div class="an3-filter-section">
        <div class="an3-filter-label">Team</div>
        <div class="an3-filter-row" style="align-items:center">
          <input class="an3-team-search" type="search" placeholder="Search team…"
            value="${esc(F.teamSearch)}"
            oninput="window._an3Team(this.value)">
          ${F.teamSearch ? `<button class="an3-chip" onclick="window._an3Team('')" style="flex-shrink:0">Clear</button>` : ''}
          ${F.teamSearch && teams.length > 0 ? `
            <div class="an3-team-pills">
              ${teams.slice(0,8).map(t=>`<button class="an3-chip${F.teamSearch===t?' on':''}"
                onclick="window._an3Team('${esc(t)}')">${esc(t)}</button>`).join('')}
              ${teams.length>8?`<span style="font-size:10px;color:var(--ink-4)">${teams.length-8} more…</span>`:''}
            </div>` : ''}
        </div>
      </div>

      ${hasActiveFilters() ? `<div class="an3-filter-section" style="align-self:flex-end">
        <button class="an3-clear" onclick="window._an3Clear()">
          <i class="ti ti-x" aria-hidden="true"></i> Clear all filters
        </button>
      </div>` : ''}

    </div>`;
  }

  function hasActiveFilters() {
    return F.region||F.zone||F.ewcMeet||F.ageGroup||F.gender||F.discipline||F.teamSearch;
  }

  window._an3F    = (f,v) => { F[f] = F[f]===v ? '' : v; render(); };
  window._an3Team = v     => { F.teamSearch=v; render(); };
  window._an3Clear= ()    => {
    F.region=F.zone=F.ewcMeet=F.ageGroup=F.gender=F.discipline=F.teamSearch='';
    render();
  };

  /* ── funnel ─────────────────────────────────────────────────── */
  function renderFunnel(d) {
    const cm = F.countMode;
    const label = hasActiveFilters() ? ' (filtered)' : '';

    if (F.stage==='Regionals') {
      const total  = count(d.rows);
      const qual   = count(d.qual);
      const showed = qual - count(d.noShow);
      const noShow = count(d.noShow);
      return funnel(`Regionals — qualification funnel${label}`,[
        {label:'Competed',            n:count(d.rows),  pctOf:total, fill:'#E6F1FB', ink:'#0C447C', note:''},
        {label:'Qualified → Zones',   n:qual,           pctOf:total, fill:'#EAF3DE', ink:'#27500A',
          note: noShow>0 ? `<span style="color:#D85A30;font-weight:500">${noShow}</span> qualified but didn't compete at Zones (${pct(noShow,qual)}%)` : 'All qualified athletes competed at Zones'},
        {label:'Attended Zones',      n:showed,         pctOf:total, fill:'#B5D4F4', ink:'#0C447C', note:''},
        {label:'Non-displacing (ND)', n:count(d.nd),    pctOf:total, fill:'#F1EFE8', ink:'#5F5E5A', note:'did not consume qualifying spots'},
        {label:'Bump-ins',            n:count(d.bumped),pctOf:total, fill:'#EEEDFE', ink:'#534AB7', note:'moved up due to ND athlete'},
      ]);
    }

    const total   = count(d.rows);
    const natD    = count(d.natDirect);
    const ewcQ    = F.countMode==='athletes' ? d.ewcQualAths : entries(d.ewcQual);
    const ewcR    = d.ewcReg;
    const ewcNR   = d.ewcNotReg;
    return funnel(`Zones → E/W/C — qualification funnel${label}`,[
      {label:'Competed at Zones',      n:total,  pctOf:total, fill:'#E6F1FB', ink:'#0C447C', note:''},
      {label:'→ Nationals direct',     n:natD,   pctOf:total, fill:'#EAF3DE', ink:'#27500A', note:'top 3 per zone per event'},
      {label:'→ E/W/C qualified',      n:ewcQ,   pctOf:total, fill:'#dbeafe', ink:'#1e40af', note:'places 4–18 + avg threshold'},
      {label:'Registered at E/W/C',    n:ewcR,   pctOf:ewcQ,  fill:'#B5D4F4', ink:'#0C447C',
        note:`<span style="color:#D85A30;font-weight:500">${ewcNR}</span> qualified but didn't register (${pct(ewcNR,ewcQ)}%)`},
      {label:'Non-displacing at Zones',n:count(d.nd),pctOf:total, fill:'#F1EFE8', ink:'#5F5E5A', note:'did not consume spots'},
      {label:'Bump-ins',               n:count(d.bumped),pctOf:total,fill:'#EEEDFE',ink:'#534AB7',note:''},
    ]);
  }

  function funnel(title, rows) {
    const maxN = Math.max(...rows.map(r=>r.n), 1);
    return `<div class="an3-funnel">
      <div class="an3-funnel-title">${esc(title)}</div>
      ${rows.map(r=>{
        const w = Math.max(4, Math.round(100*r.n/maxN));
        return `<div class="an3-f-row">
          <div class="an3-f-label">${esc(r.label)}</div>
          <div class="an3-f-track">
            <div class="an3-f-fill" style="width:${w}%;background:${r.fill}">
              <span style="color:${r.ink};font-weight:500;font-size:11px;white-space:nowrap">${r.n.toLocaleString()}</span>
            </div>
          </div>
          <div class="an3-f-note">${r.note||''}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  /* ── breakdown grid ─────────────────────────────────────────── */
  function renderBreakdownGrid(bkd) {
    const cm = F.countMode;
    return `<div class="an3-bk-grid">
      ${['Group A','Group B','Group C','Group D'].map(g=>`
        <div class="an3-bk-card">
          <div class="an3-bk-group">${esc(g)}</div>
          ${['Girls','Boys'].map(gn=>{
            const cell = bkd[g]?.[gn]||{athletes:0,entries:0};
            const primary = cm==='athletes' ? cell.athletes : cell.entries;
            const sub     = cm==='athletes' ? `${cell.entries} entries` : `${cell.athletes} athletes`;
            return `<div class="an3-bk-row">
              <span class="an3-bk-gn">${esc(gn)}</span>
              <div class="an3-bk-vals">
                <span class="an3-bk-n">${primary}</span>
                <span class="an3-bk-sub">${esc(sub)}</span>
              </div>
            </div>`;
          }).join('')}
        </div>`).join('')}
    </div>`;
  }

  /* ── category strip ─────────────────────────────────────────── */
  function renderCatStrip(d) {
    const cats = [
      {key:'foreign',     icon:'ti-flag',           label:'Foreign',          n:count(d.foreign),   sub:subCount(d.foreign),  color:'#A32D2D',bg:'#FCEBEB',bc:'#E24B4A'},
      {key:'dual',        icon:'ti-globe',           label:'Dual citizen',     n:count(d.dual),      sub:subCount(d.dual),     color:'#185FA5',bg:'#E6F1FB',bc:'#378ADD'},
      {key:'hps',         icon:'ti-star',            label:'HPS',              n:count(d.hps),       sub:subCount(d.hps),      color:'#854F0B',bg:'#FAEEDA',bc:'#EF9F27'},
      {key:'ymca',        icon:'ti-award',           label:'YMCA',             n:count(d.ymca||[]),  sub:subCount(d.ymca||[]), color:'#0F6E56',bg:'#E1F5EE',bc:'#1D9E75'},
      {key:'noshow',      icon:'ti-user-off',        label:'Did not compete',
        n: F.stage==='Regionals' ? count(d.noShow) : d.ewcNotReg,
        sub: F.stage==='Regionals' ? `qualified but skipped Zones` : `qualified but didn't register`,
        color:'#5F5E5A',bg:'#F1EFE8',bc:'#888780'},
      {key:'displacement',icon:'ti-arrows-exchange', label:'Displacements',    n:count(d.bumped),    sub:subCount(d.bumped),   color:'#534AB7',bg:'#EEEDFE',bc:'#7F77DD'},
    ];
    return `<div class="an3-cat-strip">
      ${cats.map(c=>{
        const isOpen = F.openCat===c.key;
        return `<div class="an3-cat${isOpen?' open':''}"
          style="${isOpen?`border-color:${c.bc};background:${c.bg};`:''}"
          onclick="window._an3Cat('${c.key}')">
          <i class="ti ${c.icon} an3-cat-icon" style="color:${isOpen?c.color:'var(--ink-3)'}" aria-hidden="true"></i>
          <div class="an3-cat-name">${esc(c.label)}</div>
          <div class="an3-cat-n" style="${isOpen?`color:${c.color}`:''}">${c.n}</div>
          <div class="an3-cat-sub">${esc(c.sub)}</div>
        </div>`;
      }).join('')}
    </div>`;
  }
  window._an3Cat = k => { F.openCat = F.openCat===k ? null : k; render(); };

  /* ── detail table ───────────────────────────────────────────── */
  function renderDetail(d) {
    const cat = F.openCat;
    const allRaw = allJunior();
    let rows=[], title='', note='', hBg='var(--surface-2)', hInk='var(--ink)';

    if (cat==='foreign')     { rows=d.foreign;     title=`Foreign athletes — ${count(d.foreign)} athletes · ${entries(d.foreign)} entries`;     note='Non-displacing · shown at score-rank position (ghost place) · Art. 102(b)'; hBg='#FCEBEB'; hInk='#791F1F'; }
    if (cat==='dual')        { rows=d.dual;         title=`Dual citizens — ${count(d.dual)} athletes · ${entries(d.dual)} entries`;             note='Competed for another federation · non-displacing · Art. 301.3'; hBg='#E6F1FB'; hInk='#0C447C'; }
    if (cat==='hps')         { rows=d.hps;          title=`HPS athletes — ${count(d.hps)} athletes · ${entries(d.hps)} entries`;               note='High Performance Squad Tier 3 · pre-qualified to Junior Nationals · non-displacing at Zones'; hBg='#FAEEDA'; hInk='#633806'; }
    if (cat==='ymca')        { rows=d.ymca||[];     title=`YMCA champions — ${count(d.ymca||[])} athletes`;                                      note='YMCA event champions · pre-qualified to East/West/Central'; hBg='#E1F5EE'; hInk='#085041'; }
    if (cat==='displacement'){ rows=d.bumped;       title=`Displacement bump-ins — ${count(d.bumped)} athletes`;                                 note='Athletes who moved up due to non-displacing athletes ahead'; hBg='#EEEDFE'; hInk='#3C3489'; }
    if (cat==='noshow') {
      rows = d.noShowRows||[];
      const n = F.stage==='Regionals' ? count(d.noShow) : d.ewcNotReg;
      title = `Did not compete — ${n} athletes`;
      note  = F.stage==='Regionals'
        ? 'Qualified at Regionals but did not appear at Zones'
        : 'Qualified at Zones (places 4–18) but did not register for East/West/Central';
    }

    if (!rows.length) return `<div class="an3-detail">
      <div class="an3-dh" style="background:${hBg}"><div class="an3-dt" style="color:${hInk}">${esc(title)}</div><div class="an3-dn">${esc(note)}</div></div>
      <div style="padding:20px;text-align:center;color:var(--ink-4);font-size:12px">No data matches current filters.</div>
    </div>`;

    // Deduplicate and group by athlete
    const seen = new Set();
    const byAth = new Map();
    rows.forEach(r => {
      const k = `${norm(r.athlete||'')}|${r.eventKey||''}|${r.zone||''}`;
      if (seen.has(k)) return; seen.add(k);
      const n = norm(r.athlete||'');
      if (!byAth.has(n)) byAth.set(n, {r, evs:[]});
      byAth.get(n).evs.push(r);
    });

    const tbody = [...byAth.values()].map(({r, evs}) => {
      const zone = r.zone||'';
      const zBg  = ZONE_BG[zone]||'var(--surface-2)';
      const zInk = ZONE_INK[zone]||'var(--ink-3)';
      const ewcM = r.ewc||ZONE_TO_EWC[zone]||'';
      const reg  = r.region ? `Region ${r.region}` : '';

      const evCells = evs.map(ev => {
        let placeDisp = ev.place==='127'||ev.placeNumber===127 ? '—' : (ev.place||'—');
        let ghostNote = '';
        if (ev.placeNumber===127 || ev.place==='127') {
          const gr = ghostRank(ev, allRaw);
          if (gr) { placeDisp=`${gr}*`; ghostNote=`<span class="an3-ghost">*score rank</span>`; }
        }
        return `<div class="an3-ev">
          <span class="an3-ev-name">${esc(ev.eventKey||'')}</span>
          <span class="an3-ev-pl">Pl: ${placeDisp}${ghostNote}</span>
          <span class="an3-ev-sc">${fmt(ev.score)}</span>
          ${ev.eligibleRank!=null&&ev.eligibleRank!==''&&ev.placeNumber!==127?`<span class="an3-ev-er">Elig: ${ev.eligibleRank}</span>`:''}
          ${cat==='displacement'&&ev.bumpedBy?.length?`<span class="an3-ev-bump">↑ bumped by ${esc(ev.bumpedBy.map(b=>b.athlete).join(', '))}</span>`:''}
        </div>`;
      }).join('');

      const pills = [
        r.keptInvitedJoNationals ? `<span class="an3-pill an3-kept">Kept invited</span>` : '',
        r.petition               ? `<span class="an3-pill an3-pet">Petition</span>`      : '',
        r.reviewFlags?.length    ? `<span class="an3-pill an3-rev">Review</span>`        : '',
      ].filter(Boolean).join('');

      return `<tr>
        <td class="an3-td">
          <div class="an3-ath">${esc(r.athlete||'')}</div>
          ${r.diveMeetsId?`<div class="an3-dmid">DM ${esc(r.diveMeetsId)}</div>`:''}
          ${r.team?`<div class="an3-team">${esc(r.team)}</div>`:''}
          ${pills?`<div style="margin-top:3px;display:flex;gap:3px;flex-wrap:wrap">${pills}</div>`:''}
        </td>
        <td class="an3-td" style="white-space:nowrap">
          ${zone?`<span class="an3-zone-chip" style="background:${zBg};color:${zInk}">Zone ${zone}</span>`:''}
          ${reg?`<div style="font-size:10px;color:var(--ink-4);margin-top:2px">${esc(reg)}</div>`:''}
          ${ewcM?`<div style="font-size:10px;color:var(--ink-4)">→ ${esc(ewcM)}</div>`:''}
        </td>
        <td class="an3-td">${evCells}</td>
      </tr>`;
    }).join('');

    return `<div class="an3-detail">
      <div class="an3-dh" style="background:${hBg}">
        <div class="an3-dt" style="color:${hInk}">${esc(title)}</div>
        <div class="an3-dn">${esc(note)}</div>
      </div>
      <div style="overflow-x:auto">
        <table class="an3-table">
          <thead><tr>
            <th>Athlete</th><th>Zone / Region</th><th>Events</th>
          </tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </div>`;
  }

  /* ── CSS ────────────────────────────────────────────────────── */
  let _css = false;
  function injectCSS() {
    if (_css) return; _css=true;
    const s = document.createElement('style');
    s.textContent = `
.an3{display:flex;flex-direction:column;gap:10px;padding:0 0 28px}
.an3-stage-nav{display:flex;gap:6px;flex-wrap:wrap;padding:12px 0 4px}
.an3-sb{padding:7px 18px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;
  border:1.5px solid var(--line);background:var(--surface);color:var(--ink-3)}
.an3-sb:hover{border-color:var(--pool);color:var(--pool)}
.an3-sb.on{background:var(--nav,#0a0e38);color:#fff;border-color:var(--nav,#0a0e38)}
.an3-bar{display:flex;align-items:center;gap:8px}
.an3-tog{display:flex;background:var(--surface-2);border-radius:20px;padding:2px;border:1px solid var(--line);gap:2px}
.an3-tp{padding:4px 12px;border-radius:18px;font-size:11px;font-weight:500;cursor:pointer;
  border:none;background:transparent;color:var(--ink-3)}
.an3-tp.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.an3-filters{display:flex;flex-direction:column;gap:8px;padding:10px 12px;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px)}
.an3-filter-section{display:flex;align-items:flex-start;gap:10px}
.an3-filter-label{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;
  color:var(--ink-4);width:72px;flex-shrink:0;padding-top:5px}
.an3-filter-row{display:flex;gap:4px;flex-wrap:wrap;flex:1;align-items:center}
.an3-chip{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;cursor:pointer;
  border:1px solid var(--line);background:var(--surface-2);color:var(--ink-3)}
.an3-chip:hover{border-color:var(--pool);color:var(--pool)}
.an3-chip.on{background:var(--nav,#0a0e38);color:#fff;border-color:var(--nav,#0a0e38)}
.an3-team-search{padding:4px 10px;border:1px solid var(--line);border-radius:20px;font-size:11px;
  background:var(--surface-2);color:var(--ink);outline:none;width:180px}
.an3-team-search:focus{border-color:var(--pool)}
.an3-team-pills{display:flex;gap:3px;flex-wrap:wrap;margin-top:4px;width:100%}
.an3-clear{display:flex;align-items:center;gap:4px;padding:4px 10px;font-size:11px;
  border-radius:8px;border:1px solid var(--line);background:transparent;
  color:var(--ink-3);cursor:pointer}
.an3-clear:hover{color:var(--red,#e31937);border-color:var(--red,#e31937)}
.an3-clear i{font-size:12px}
.an3-funnel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);padding:14px 18px;display:flex;flex-direction:column;gap:7px}
.an3-funnel-title{font-size:12px;font-weight:500;color:var(--ink);margin-bottom:4px}
.an3-f-row{display:flex;align-items:center;gap:10px}
.an3-f-label{font-size:11px;color:var(--ink-3);width:170px;flex-shrink:0;text-align:right}
.an3-f-track{flex:1;height:26px;background:var(--surface-2);border-radius:4px;overflow:hidden}
.an3-f-fill{height:100%;border-radius:4px;display:flex;align-items:center;padding:0 8px;min-width:32px}
.an3-f-note{font-size:11px;color:var(--ink-3);width:260px;flex-shrink:0;line-height:1.4}
.an3-bk-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.an3-bk-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);padding:10px 12px}
.an3-bk-group{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;
  color:var(--ink-4);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--line-2)}
.an3-bk-row{display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:0.5px solid var(--line-2)}
.an3-bk-row:last-child{border-bottom:none}
.an3-bk-gn{font-size:11px;color:var(--ink-3)}
.an3-bk-vals{display:flex;flex-direction:column;align-items:flex-end}
.an3-bk-n{font-size:15px;font-weight:500;color:var(--ink);line-height:1.1}
.an3-bk-sub{font-size:10px;color:var(--ink-4)}
.an3-cat-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.an3-cat{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);
  padding:10px 10px 8px;cursor:pointer;transition:border-color .12s,background .12s;text-align:left}
.an3-cat:hover{border-color:var(--pool)}
.an3-cat-icon{font-size:15px;display:block;margin-bottom:4px;color:var(--ink-4)}
.an3-cat-name{font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);margin-bottom:3px}
.an3-cat-n{font-size:18px;font-weight:500;color:var(--ink);line-height:1.1}
.an3-cat-sub{font-size:10px;color:var(--ink-4);margin-top:1px}
.an3-detail{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);overflow:hidden}
.an3-dh{padding:12px 16px;border-bottom:1px solid var(--line)}
.an3-dt{font-size:13px;font-weight:500}
.an3-dn{font-size:11px;opacity:.8;margin-top:2px;color:inherit}
.an3-table{width:100%;border-collapse:collapse;font-size:12px}
.an3-table th{background:var(--surface-2);padding:7px 12px;text-align:left;font-size:10px;
  font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);border-bottom:1px solid var(--line)}
.an3-td{padding:10px 12px;border-bottom:0.5px solid var(--line-2);vertical-align:top}
.an3-table tr:hover .an3-td{background:var(--surface-2)}
.an3-table tr:last-child .an3-td{border-bottom:none}
.an3-ath{font-weight:500;font-size:13px;color:var(--ink)}
.an3-dmid{font-size:10px;color:var(--ink-4);font-family:var(--f-mono,'JetBrains Mono',monospace)}
.an3-team{font-size:11px;color:var(--ink-3);margin-top:1px}
.an3-zone-chip{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}
.an3-ev{display:flex;align-items:baseline;gap:8px;padding:2px 0;border-bottom:0.5px solid var(--line-2);flex-wrap:wrap}
.an3-ev:last-child{border-bottom:none}
.an3-ev-name{font-size:11px;color:var(--ink-2);flex:1;min-width:120px}
.an3-ev-pl{font-size:11px;color:var(--ink-3);white-space:nowrap}
.an3-ev-sc{font-size:11px;font-family:var(--f-mono,'JetBrains Mono',monospace);color:var(--ink-2);white-space:nowrap}
.an3-ev-er{font-size:10px;color:var(--ink-4);white-space:nowrap}
.an3-ev-bump{font-size:10px;color:#534AB7;width:100%}
.an3-ghost{font-size:9px;color:var(--ink-4);font-style:italic;margin-left:2px}
.an3-pill{display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:500}
.an3-kept{background:#E1F5EE;color:#085041}
.an3-pet{background:#EEEDFE;color:#3C3489}
.an3-rev{background:#FAEEDA;color:#633806}
`;
    document.head.appendChild(s);
  }

  /* ── init ───────────────────────────────────────────────────── */
  function init() {
    injectCSS();
    window._qvRenderReports = render;
    window._anRender = render;
    console.log('[analytics v3] ready');
  }

  function wait(cb, n) {
    n=n||0;
    if (typeof effectiveResults!=='undefined'||window.JUNIOR_RESULTS_DATA) cb();
    else if (n<120) setTimeout(()=>wait(cb,n+1),50);
  }
  wait(init);
})();
