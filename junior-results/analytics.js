/* ================================================================
   analytics.js v4 — Pipeline Analytics dashboard
   - Always-visible filter bar with context label
   - Breakdown grid always shows what stage/zone/group it covers
   - Funnel proportional bars, clickable to drill
   - Category cards expand inline detail
   - Sidebar collapse toggle
   ================================================================ */
(function () {
  'use strict';

  // esc() and norm() are defined globally in main.js (loads first — see
  // index.html's load order) and reused here rather than kept as separate
  // local copies.
  function pct(n,d) { return d?Math.round(100*n/d):0; }
  function fmt(v)   { const n=Number(v); return Number.isFinite(n)&&n>0?n.toFixed(2):'—'; }

  const ZONE_TO_EWC = {A:'East',B:'East',C:'Central',D:'Central',E:'West',F:'West'};
  const ZONE_BG  = {A:'#EEEDFE',B:'#EEEDFE',C:'#E1F5EE',D:'#E1F5EE',E:'#FAEEDA',F:'#FAEEDA'};
  const ZONE_INK = {A:'#3C3489',B:'#3C3489',C:'#085041',D:'#085041',E:'#633806',F:'#633806'};
  const REGION_TO_ZONES = {
    '1':['A'],'2':['A','B','D'],'3':['B'],'4':['B'],
    '5':['C'],'6':['C','D'],'7':['D'],'8':['A','D','F'],
    '9':['E'],'10':['B','E','F'],'11':['D','F'],'12':['C','F']
  };

  /* ── data ────────────────────────────────────────────────────── */
  function getRaw() {
    return typeof effectiveResults!=='undefined'
      ? effectiveResults : (window.JUNIOR_RESULTS_DATA?.results||[]);
  }
  const EWC = window.USAD_EWC_DATA||null;
  const _ewcSet = new Set();
  if (EWC?.entries) EWC.entries.forEach(e=>_ewcSet.add(norm(e.name||'')));
  function isEWCReg(name) { return _ewcSet.has(norm(name||'')); }

  function isJunior(r) {
    const sr=r.sourceRow;
    if (typeof sr==='string'&&sr.startsWith('synthetic')) return false;
    if (r.gender==='Women'||r.gender==='Men') return false;
    if (!r.ageGroup) return false;
    // Synchronized diving is a separate discipline (pairs, not individual) that
    // never counts toward the individual Region->Zone->E/W/C->Nationals pipeline
    // this dashboard measures — non-qualifying everywhere it appears, and at
    // Junior Nationals it's a parallel event for divers who already qualified
    // individually, not part of the funnel itself. Checked narrowly on
    // isSynchro specifically — NOT the broader eventCategory/"Non-Qualifying
    // Event" flag, which also legitimately covers Group C/D springboard at
    // Regionals (auto-advance in 2026, still real individual competitors) and
    // Platform at Regionals (exhibition-status only) — both of which must stay
    // visible here per established convention.
    if (r.isSynchro) return false;
    return true;
  }
  function allJunior() { return getRaw().filter(isJunior); }

  /* ── filter state ────────────────────────────────────────────── */
  const F = {
    stage:'Zones', countMode:'athletes', openCat:null,
    region:'', zone:'', ewcMeet:'', ageGroup:'', gender:'', discipline:'',
    teamSearch:'',
  };

  function rowMatches(r) {
    if (F.region) {
      if (r.stage==='Zones') {
        const ok=REGION_TO_ZONES[F.region]||[];
        if (!ok.includes(r.zone)) return false;
      } else {
        if (String(r.region||'').trim()!==F.region) return false;
      }
    }
    if (F.zone    && r.zone!==F.zone)   return false;
    if (F.ewcMeet && (r.ewc||ZONE_TO_EWC[r.zone]||'')!==F.ewcMeet) return false;
    if (F.ageGroup   && r.ageGroup!==F.ageGroup)   return false;
    if (F.gender     && r.gender!==F.gender)       return false;
    if (F.discipline && r.discipline!==F.discipline) return false;
    if (F.teamSearch && !(r.team||'').toLowerCase().includes(F.teamSearch.toLowerCase())) return false;
    return true;
  }

  function uniq(rows)  { return new Set(rows.map(r=>norm(r.athlete||''))).size; }
  function cnt(rows)   { return F.countMode==='athletes'?uniq(rows):rows.length; }
  function subCnt(rows){ return F.countMode==='athletes'?`${rows.length} entries`:`${uniq(rows)} athletes`; }

  /* ── context label — the critical "what am I looking at?" string ── */
  function contextLabel() {
    const parts = [];
    // Stage
    const stageLabel = F.stage==='EWC' ? 'East / West / Central' : F.stage;
    parts.push(stageLabel);
    // Filters
    if (F.region)     parts.push(`Region ${F.region}`);
    if (F.zone)       parts.push(`Zone ${F.zone}`);
    if (F.ewcMeet)    parts.push(F.ewcMeet);
    if (F.ageGroup)   parts.push(F.ageGroup);
    if (F.gender)     parts.push(F.gender);
    if (F.discipline) parts.push(F.discipline);
    if (F.teamSearch) parts.push(`Team: ${F.teamSearch}`);
    return parts.join(' · ');
  }

  function hasFilters() {
    return F.region||F.zone||F.ewcMeet||F.ageGroup||F.gender||F.discipline||F.teamSearch;
  }

  /* ── build stage data ────────────────────────────────────────── */
  function buildData() {
    const all = allJunior();
    const stageRows = all.filter(r => {
      const sm = F.stage==='EWC' ? r.stage==='Zones' : r.stage===F.stage;
      return sm && rowMatches(r);
    });

    const nd      = stageRows.filter(r=>r.nonDisplacing);
    const foreign = stageRows.filter(r=>r.foreignDeclared||r.webpointNonUsEffective);
    const dual    = stageRows.filter(r=>r.dualOtherCountry);
    const hps     = stageRows.filter(r=>r.hps&&!r.foreignDeclared);
    const ymca    = stageRows.filter(r=>r.ymca);
    const bumped  = stageRows.filter(r=>r.bumpIn);
    const notAtt  = stageRows.filter(r=>r.declaredNotAttending);

    if (F.stage==='Regionals') {
      const qual  = stageRows.filter(r=>r.advancesToZone&&!r.nonDisplacing);
      const zNames= new Set(all.filter(r=>r.stage==='Zones').map(r=>norm(r.athlete||'')));
      const noShow= qual.filter(r=>!zNames.has(norm(r.athlete||'')));
      return { stageRows, nd, foreign, dual, hps, ymca, bumped, notAtt,
               qual, noShow, ewcQualAths:0, ewcReg:0, ewcNotReg:0, natDirect:[],
               noShowRows:noShow };
    }

    const natD  = stageRows.filter(r=>r.advancesToNationals&&!r.nonDisplacing);
    const ewcOnly=stageRows.filter(r=>r.advancesToEWC&&!r.advancesToNationals&&!r.nonDisplacing);
    const ewcAthMap=new Map();
    ewcOnly.forEach(r=>{ const n=norm(r.athlete||''); if(!ewcAthMap.has(n)) ewcAthMap.set(n,r); });
    const ewcReg   =[...ewcAthMap.keys()].filter(n=>isEWCReg(n)).length;
    const ewcNotReg=ewcAthMap.size-ewcReg;
    // isEWCReg() is a pure function of (normalized) athlete name, so every row
    // for a given athlete agrees on registered/not-registered — these raw,
    // non-deduped row arrays are the entries-mode equivalent of ewcReg/
    // ewcNotReg above (uniq() on them reproduces the exact same athlete-level
    // numbers, so nothing that already reads ewcReg/ewcNotReg is affected).
    const ewcRegRows   = ewcOnly.filter(r=>isEWCReg(r.athlete||''));
    const ewcNotRegRows= ewcOnly.filter(r=>!isEWCReg(r.athlete||''));
    return { stageRows, nd, foreign, dual, hps, ymca, bumped, notAtt,
             qual:[], noShow:[], natDirect:natD, ewcQual:ewcOnly,
             ewcQualAths:ewcAthMap.size, ewcReg, ewcNotReg, ewcRegRows, ewcNotRegRows,
             noShowRows:[...ewcAthMap.values()].filter(r=>!isEWCReg(r.athlete||'')) };
  }

  /* ── age/gender breakdown — PER FILTER STATE ─────────────────── */
  function buildBreakdown() {
    const all   = allJunior();
    const groups= ['Group A','Group B','Group C','Group D'];
    const genders=['Girls','Boys'];
    const res   = {};
    for (const g of groups) {
      res[g]={};
      for (const gn of genders) {
        const sub=all.filter(r => {
          const sm=F.stage==='EWC'?r.stage==='Zones':r.stage===F.stage;
          if (!sm||r.ageGroup!==g||r.gender!==gn) return false;
          // apply location/discipline/team filters but NOT ageGroup/gender (those are the axes)
          if (F.region) {
            if (r.stage==='Zones') { const ok=REGION_TO_ZONES[F.region]||[]; if(!ok.includes(r.zone)) return false; }
            else { if(String(r.region||'').trim()!==F.region) return false; }
          }
          if (F.zone    && r.zone!==F.zone)     return false;
          if (F.ewcMeet && (r.ewc||ZONE_TO_EWC[r.zone]||'')!==F.ewcMeet) return false;
          if (F.discipline && r.discipline!==F.discipline) return false;
          if (F.teamSearch && !(r.team||'').toLowerCase().includes(F.teamSearch.toLowerCase())) return false;
          return true;
        });
        res[g][gn]={ athletes:uniq(sub), entries:sub.length };
      }
    }
    return res;
  }

  /* ── ghost rank ──────────────────────────────────────────────── */
  function ghostRanks(evRow) {
    const all=allJunior();
    const evRows=all.filter(r=>r.stage===evRow.stage&&r.zone===evRow.zone&&r.eventKey===evRow.eventKey);
    const sorted=[...evRows].sort((a,b)=>(b.score||0)-(a.score||0));
    const idx=sorted.findIndex(r=>norm(r.athlete||'')===norm(evRow.athlete||''));
    return idx>=0?idx+1:null;
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  function render() {
    const wrap=document.getElementById('tableWrap');
    const ctx =document.getElementById('resultsContext');
    if (!wrap) return;
    try { _render(wrap,ctx); } catch(e) {
      console.error('[analytics v4]',e);
      wrap.innerHTML=`<div style="padding:20px;color:#b45309;background:#fffbeb;border-radius:8px;font-size:12px">
        <strong>Analytics error:</strong> ${esc(e.message)}</div>`;
    }
  }

  function _render(wrap, ctx) {
    const d  = buildData();
    const bkd= buildBreakdown();
    const ctxStr = contextLabel();

    if (ctx) ctx.innerHTML=`<div style="display:flex;align-items:center;gap:10px">
      <strong style="font-size:13px;color:var(--ink)">Pipeline Analytics</strong>
      <span style="font-size:11px;color:var(--ink-3)">${esc(ctxStr)}</span>
    </div>`;

    wrap.innerHTML=`<div class="an4">
      ${renderTopControls()}
      ${renderFilterBar()}
      ${renderFunnel(d)}
      ${renderBreakdownGrid(bkd, ctxStr)}
      ${renderCatStrip(d)}
      ${F.openCat ? renderDetail(d) : ''}
    </div>`;

    injectCSS();
  }

  /* ── top controls ────────────────────────────────────────────── */
  function renderTopControls() {
    const stages=[
      {id:'Regionals',label:'Regionals'},
      {id:'Zones',label:'Zones'},
      {id:'EWC',label:'East / West / Central'},
    ];
    return `<div class="an4-controls">
      <div class="an4-stage-strip">
        ${stages.map(s=>`<button class="an4-sb${s.id===F.stage?' on':''}" onclick="window._an4Stage('${s.id}')">${esc(s.label)}</button>`).join('')}
      </div>
      <div class="an4-count-tog">
        <button class="an4-ct${F.countMode==='athletes'?' on':''}" onclick="window._an4Mode('athletes')">Athletes</button>
        <button class="an4-ct${F.countMode==='entries'?' on':''}" onclick="window._an4Mode('entries')">Entries</button>
      </div>
    </div>`;
  }
  window._an4Stage = s=>{ F.stage=s; F.openCat=null; render(); };
  window._an4Mode  = m=>{ F.countMode=m; render(); };

  /* ── filter bar — always visible ─────────────────────────────── */
  function renderFilterBar() {
    function chip(field,val,label,tip) {
      const on=F[field]===val;
      return `<button class="an4-chip${on?' on':''}" title="${esc(tip||'')}"
        onclick="window._an4F('${field}','${val}')">${esc(label)}</button>`;
    }
    const showRegion= F.stage==='Regionals';
    const showZone  = F.stage==='Zones'||F.stage==='EWC';

    return `<div class="an4-filters">
      <div class="an4-fg">
        <div class="an4-fl">Age group</div>
        <div class="an4-fr">
          ${chip('ageGroup','','All')}
          ${chip('ageGroup','Group A','Group A')}
          ${chip('ageGroup','Group B','Group B')}
          ${chip('ageGroup','Group C','Group C')}
          ${chip('ageGroup','Group D','Group D')}
        </div>
      </div>
      <div class="an4-fg">
        <div class="an4-fl">Gender</div>
        <div class="an4-fr">
          ${chip('gender','','All')}
          ${chip('gender','Girls','Girls')}
          ${chip('gender','Boys','Boys')}
        </div>
      </div>
      <div class="an4-fg">
        <div class="an4-fl">Board</div>
        <div class="an4-fr">
          ${chip('discipline','','All')}
          ${chip('discipline','1M','1M')}
          ${chip('discipline','3M','3M')}
          ${chip('discipline','Platform','Platform')}
        </div>
      </div>
      ${showRegion?`<div class="an4-fg">
        <div class="an4-fl">Region</div>
        <div class="an4-fr">
          ${chip('region','','All')}
          ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n=>{
            const z=(REGION_TO_ZONES[String(n)]||[]).join('/');
            return chip('region',String(n),`Region ${n}`,`→ Zone ${z}`);
          }).join('')}
        </div>
      </div>` : ''}
      ${showZone?`<div class="an4-fg">
        <div class="an4-fl">Zone</div>
        <div class="an4-fr">
          ${chip('zone','','All')}
          ${['A','B','C','D','E','F'].map(z=>chip('zone',z,`Zone ${z}`,`→ ${ZONE_TO_EWC[z]}`)).join('')}
        </div>
      </div>
      <div class="an4-fg">
        <div class="an4-fl">E/W/C meet</div>
        <div class="an4-fr">
          ${chip('ewcMeet','','All')}
          ${chip('ewcMeet','East','East')}
          ${chip('ewcMeet','Central','Central')}
          ${chip('ewcMeet','West','West')}
        </div>
      </div>` : ''}
      <div class="an4-fg">
        <div class="an4-fl">Team search</div>
        <div class="an4-fr" style="align-items:center">
          <input class="an4-team-inp" type="search" placeholder="Search team…"
            value="${esc(F.teamSearch)}" oninput="window._an4Team(this.value)">
          ${F.teamSearch?`<button class="an4-chip" onclick="window._an4Team('')">Clear</button>`:''}
        </div>
      </div>
      ${hasFilters()?`<div class="an4-fg" style="align-self:flex-end">
        <button class="an4-clear" onclick="window._an4ClearAll()">
          <i class="ti ti-x" aria-hidden="true"></i> Clear all
        </button>
      </div>`:''}
    </div>`;
  }
  window._an4F       = (f,v)=>{ F[f]=F[f]===v?'':v; render(); };
  window._an4Team    = v=>{ F.teamSearch=v; render(); };
  window._an4ClearAll= ()=>{ F.region=F.zone=F.ewcMeet=F.ageGroup=F.gender=F.discipline=F.teamSearch=''; render(); };

  /* ── funnel ──────────────────────────────────────────────────── */
  function renderFunnel(d) {
    const cm=F.countMode;
    let rows;
    if (F.stage==='Regionals') {
      const total=cnt(d.stageRows);
      const qual =cm==='athletes'?uniq(d.qual):d.qual.length;
      const noShow=cm==='athletes'?uniq(d.noShow):d.noShow.length;
      const showed=qual-noShow;
      rows=[
        {label:'Competed',           n:cnt(d.stageRows),fill:'#E6F1FB',ink:'#0C447C',note:''},
        {label:'Qualified → Zones',  n:qual,fill:'#EAF3DE',ink:'#27500A',
          note:noShow>0?`<span style="color:#D85A30;font-weight:500">${noShow}</span> qualified but didn't attend Zones (${pct(noShow,qual)}%)`:'All qualified athletes attended Zones'},
        {label:'Attended Zones',     n:showed,fill:'#B5D4F4',ink:'#0C447C',note:''},
        {label:'Non-displacing',     n:cnt(d.nd),fill:'#F1EFE8',ink:'#5F5E5A',note:'did not consume qualifying spots'},
        {label:'Displacements',      n:cnt(d.bumped),fill:'#EEEDFE',ink:'#534AB7',note:'athletes bumped up'},
      ];
      return funnel('Regionals 2026 — qualification funnel', rows, cnt(d.stageRows));
    }
    const total   =cnt(d.stageRows);
    const natD    =cm==='athletes'?uniq(d.natDirect||[]):( d.natDirect||[]).length;
    const ewcQ    =cm==='athletes'?d.ewcQualAths:(d.ewcQual||[]).length;
    const ewcR    =cm==='athletes'?d.ewcReg:(d.ewcRegRows||[]).length;
    const ewcNR   =cm==='athletes'?d.ewcNotReg:(d.ewcNotRegRows||[]).length;
    rows=[
      {label:'Competed at Zones',      n:total,fill:'#E6F1FB',ink:'#0C447C',note:''},
      {label:'→ Nationals direct',     n:natD,fill:'#EAF3DE',ink:'#27500A',note:'top 3 per zone per event'},
      {label:'→ E/W/C qualified',      n:ewcQ,fill:'#dbeafe',ink:'#1e40af',note:'places 4–18 + avg threshold'},
      {label:'Registered at E/W/C',    n:ewcR,fill:'#B5D4F4',ink:'#0C447C',
        note:`<span style="color:#D85A30;font-weight:500">${ewcNR}</span> qualified but didn't register (${pct(ewcNR,ewcQ)}%)`},
      {label:'Non-displacing at Zones',n:cnt(d.nd),fill:'#F1EFE8',ink:'#5F5E5A',note:'did not consume spots'},
      {label:'Displacements',          n:cnt(d.bumped),fill:'#EEEDFE',ink:'#534AB7',note:''},
    ];
    return funnel(`Zones → E/W/C — qualification funnel`, rows, total);
  }

  function funnel(title, rows, maxN) {
    return `<div class="an4-funnel">
      <div class="an4-funnel-title">${esc(title)}</div>
      ${rows.map(r=>{
        const w=maxN>0?Math.max(3,Math.round(100*r.n/maxN)):0;
        return `<div class="an4-f-row">
          <div class="an4-f-lbl">${esc(r.label)}</div>
          <div class="an4-f-track">
            <div class="an4-f-bar" style="width:${w}%;background:${r.fill}">
              <span style="color:${r.ink};font-weight:500;font-size:11px;white-space:nowrap">${r.n.toLocaleString()}</span>
            </div>
          </div>
          <div class="an4-f-note">${r.note}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  /* ── breakdown grid — with explicit context header ───────────── */
  function renderBreakdownGrid(bkd, ctxStr) {
    const cm=F.countMode;

    // Build a human-readable "what you're looking at" string
    const scopeParts=[];
    if (F.stage==='EWC') scopeParts.push('East / West / Central');
    else scopeParts.push(F.stage);
    if (F.zone)       scopeParts.push(`Zone ${F.zone}`);
    if (F.ewcMeet)    scopeParts.push(F.ewcMeet);
    if (F.region)     scopeParts.push(`Region ${F.region}`);
    if (F.discipline) scopeParts.push(F.discipline);
    if (F.teamSearch) scopeParts.push(`"${F.teamSearch}"`);
    const scopeStr = scopeParts.join(' · ');

    // Gender/age filters applied: note which axes are filtered
    const agNote = F.ageGroup ? ` · filtered to ${F.ageGroup}` : '';
    const gnNote = F.gender   ? ` · filtered to ${F.gender}`   : '';

    return `<div class="an4-bk-wrap">
      <div class="an4-bk-header">
        <div class="an4-bk-scope">Participation — ${esc(scopeStr)}${esc(agNote)}${esc(gnNote)}</div>
        <div class="an4-bk-mode">${esc(cm==='athletes'?'Unique athletes':'Event entries')} shown</div>
      </div>
      <div class="an4-bk-grid">
        ${['Group A','Group B','Group C','Group D'].map(g=>`
          <div class="an4-bk-card${F.ageGroup===g?' an4-bk-active':''}">
            <div class="an4-bk-group">${esc(g)}</div>
            ${['Girls','Boys'].map(gn=>{
              const cell=bkd[g]?.[gn]||{athletes:0,entries:0};
              const primary=cm==='athletes'?cell.athletes:cell.entries;
              const sub    =cm==='athletes'?`${cell.entries} entries`:`${cell.athletes} athletes`;
              const dimmed =F.gender&&F.gender!==gn;
              return `<div class="an4-bk-row${dimmed?' an4-dimmed':''}">
                <span class="an4-bk-gn">${esc(gn)}</span>
                <div class="an4-bk-vals">
                  <span class="an4-bk-n">${primary}</span>
                  <span class="an4-bk-sub">${esc(sub)}</span>
                </div>
              </div>`;
            }).join('')}
          </div>`).join('')}
      </div>
    </div>`;
  }

  /* ── category strip ──────────────────────────────────────────── */
  function renderCatStrip(d) {
    const cm=F.countMode;
    const noShowN = F.stage==='Regionals' ? cnt(d.noShow) : cnt(d.ewcNotRegRows||[]);
    const noShowSub= F.stage==='Regionals' ? 'qualified, skipped Zones' : 'qualified, didn\'t register';
    const cats=[
      {key:'foreign',     icon:'ti-flag',           label:'Foreign',        n:cnt(d.foreign), sub:subCnt(d.foreign),  bc:'#E24B4A',bg:'#FCEBEB',ic:'#A32D2D'},
      {key:'dual',        icon:'ti-globe',           label:'Dual citizen',   n:cnt(d.dual),   sub:subCnt(d.dual),     bc:'#378ADD',bg:'#E6F1FB',ic:'#185FA5'},
      {key:'hps',         icon:'ti-star',            label:'HPS',            n:cnt(d.hps),    sub:subCnt(d.hps),      bc:'#EF9F27',bg:'#FAEEDA',ic:'#854F0B'},
      {key:'ymca',        icon:'ti-award',           label:'YMCA',           n:cnt(d.ymca||[]),sub:subCnt(d.ymca||[]),bc:'#1D9E75',bg:'#E1F5EE',ic:'#0F6E56'},
      {key:'noshow',      icon:'ti-user-off',        label:'Did not compete',n:noShowN, sub:noShowSub,               bc:'#888780',bg:'#F1EFE8',ic:'#5F5E5A'},
      {key:'displacement',icon:'ti-arrows-exchange', label:'Displacements',  n:cnt(d.bumped),sub:subCnt(d.bumped),   bc:'#7F77DD',bg:'#EEEDFE',ic:'#534AB7'},
    ];
    return `<div class="an4-cat-strip">
      ${cats.map(c=>{
        const open=F.openCat===c.key;
        return `<div class="an4-cat${open?' open':''}"
          style="${open?`border-color:${c.bc};background:${c.bg};`:''}"
          onclick="window._an4Cat('${c.key}')">
          <i class="ti ${c.icon} an4-cat-icon" style="color:${open?c.ic:'var(--ink-3)'}" aria-hidden="true"></i>
          <div class="an4-cat-name">${esc(c.label)}</div>
          <div class="an4-cat-n" style="${open?`color:${c.ic}`:''}">${c.n}</div>
          <div class="an4-cat-sub">${esc(c.sub)}</div>
        </div>`;
      }).join('')}
    </div>`;
  }
  window._an4Cat = k=>{ F.openCat=F.openCat===k?null:k; render(); };

  /* ── detail panel ────────────────────────────────────────────── */
  function renderDetail(d) {
    const cat=F.openCat;
    const cm=F.countMode;
    const unit=cm==='athletes'?'athletes':'entries';
    const all=allJunior();
    let rows=[],title='',note='',hBg='var(--surface-2)',hInk='var(--ink)';

    if (cat==='foreign')     { rows=d.foreign; title=`Foreign athletes — ${cnt(d.foreign)} athletes · ${d.foreign.length} entries`; note='Non-displacing · Art. 102(b) · shown at ghost score rank (*) when place=127'; hBg='#FCEBEB'; hInk='#791F1F'; }
    if (cat==='dual')        { rows=d.dual;    title=`Dual citizens — ${cnt(d.dual)} ${unit}`; note='Competed for another federation · non-displacing'; hBg='#E6F1FB'; hInk='#0C447C'; }
    if (cat==='hps')         { rows=d.hps;     title=`HPS athletes — ${cnt(d.hps)} ${unit}`; note='Tier 3 High Performance Squad · pre-qualified to Nationals'; hBg='#FAEEDA'; hInk='#633806'; }
    if (cat==='ymca')        { rows=d.ymca||[];title=`YMCA champions — ${cnt(d.ymca||[])} ${unit}`; note='YMCA event champions · pre-qualified to E/W/C'; hBg='#E1F5EE'; hInk='#085041'; }
    if (cat==='displacement'){ rows=d.bumped;  title=`Displacement bump-ins — ${cnt(d.bumped)} ${unit}`; note='Athletes who moved up because a non-displacing athlete placed ahead'; hBg='#EEEDFE'; hInk='#3C3489'; }
    if (cat==='noshow') {
      rows=d.noShowRows||[];
      const n=F.stage==='Regionals'?cnt(d.noShow):cnt(d.ewcNotRegRows||[]);
      title=`Did not compete — ${n} ${unit}`;
      note=F.stage==='Regionals'?'Qualified at Regionals but did not appear at Zones':'Qualified at Zones (places 4–18) but did not register for E/W/C';
    }

    // Deduplicate and group by athlete
    const seen=new Set(); const byAth=new Map();
    rows.forEach(r=>{
      const k=`${norm(r.athlete||'')}|${r.eventKey||''}|${r.zone||''}`;
      if (seen.has(k)) return; seen.add(k);
      const n=norm(r.athlete||'');
      if (!byAth.has(n)) byAth.set(n,{r,evs:[]});
      byAth.get(n).evs.push(r);
    });

    if (!byAth.size) return `<div class="an4-detail">
      <div class="an4-dh" style="background:${hBg}"><div class="an4-dt" style="color:${hInk}">${esc(title)}</div><div class="an4-dn">${esc(note)}</div></div>
      <div style="padding:20px;text-align:center;color:var(--ink-4);font-size:12px">No data matches current filters.</div>
    </div>`;

    const tbody=[...byAth.values()].map(({r,evs})=>{
      const zone=r.zone||'';
      const zBg=ZONE_BG[zone]||'var(--surface-2)';
      const zInk=ZONE_INK[zone]||'var(--ink-3)';
      const ewcM=r.ewc||ZONE_TO_EWC[zone]||'';

      const evCells=evs.map(ev=>{
        let placeDisp=ev.place==='127'||ev.placeNumber===127?'—':(ev.place||'—');
        let ghostNote='';
        if (ev.placeNumber===127||ev.place==='127') {
          const gr=ghostRanks(ev);
          if (gr) { placeDisp=`${gr}*`; ghostNote=`<span style="font-size:9px;color:var(--ink-4);font-style:italic"> score rank</span>`; }
        }
        return `<div class="an4-ev">
          <span class="an4-ev-name">${esc(ev.eventKey||'')}</span>
          <span class="an4-ev-pl">Pl: ${placeDisp}${ghostNote}</span>
          <span class="an4-ev-sc">${fmt(ev.score)}</span>
          ${ev.eligibleRank!=null&&ev.placeNumber!==127?`<span class="an4-ev-er">Elig: ${ev.eligibleRank}</span>`:''}
          ${cat==='displacement'&&ev.bumpedBy?.length?`<span class="an4-ev-bump">↑ ${esc(ev.bumpedBy.map(b=>b.athlete).join(', '))}</span>`:''}
        </div>`;
      }).join('');

      const pills=[
        r.keptInvitedJoNationals?`<span class="an4-pill an4-kept">Kept invited</span>`:'',
        r.petition?`<span class="an4-pill an4-pet">Petition</span>`:'',
        r.reviewFlags?.length?`<span class="an4-pill an4-rev">Review</span>`:'',
      ].filter(Boolean).join('');

      return `<tr>
        <td class="an4-td">
          <div style="font-weight:500;font-size:13px;color:var(--ink)">${esc(r.athlete||'')}</div>
          ${r.diveMeetsId?`<div style="font-size:10px;color:var(--ink-4);font-family:var(--f-mono,'JetBrains Mono',monospace)">DM ${esc(r.diveMeetsId)}</div>`:''}
          ${r.team?`<div style="font-size:11px;color:var(--ink-3)">${esc(r.team)}</div>`:''}
          ${pills?`<div style="margin-top:4px;display:flex;gap:3px;flex-wrap:wrap">${pills}</div>`:''}
        </td>
        <td class="an4-td" style="white-space:nowrap;vertical-align:top">
          ${zone?`<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;background:${zBg};color:${zInk}">Zone ${esc(zone)}</span>`:''}
          ${r.region?`<div style="font-size:10px;color:var(--ink-4);margin-top:2px">Region ${r.region}</div>`:''}
          ${ewcM?`<div style="font-size:10px;color:var(--ink-4)">→ ${esc(ewcM)}</div>`:''}
        </td>
        <td class="an4-td">${evCells}</td>
      </tr>`;
    }).join('');

    return `<div class="an4-detail">
      <div class="an4-dh" style="background:${hBg}">
        <div class="an4-dt" style="color:${hInk}">${esc(title)}</div>
        <div class="an4-dn">${esc(note)}</div>
      </div>
      <div style="overflow-x:auto">
        <table class="an4-table">
          <thead><tr><th>Athlete</th><th>Zone / Region</th><th>Events</th></tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </div>`;
  }

  /* ── CSS ─────────────────────────────────────────────────────── */
  let _css=false;
  function injectCSS() {
    if (_css) return; _css=true;
    const s=document.createElement('style');
    s.textContent=`
.an4{display:flex;flex-direction:column;gap:12px;padding:0 0 28px}
.an4-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0 4px}
.an4-stage-strip{display:flex;gap:6px}
.an4-sb{padding:6px 18px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;
  border:1.5px solid var(--line);background:var(--surface);color:var(--ink-3)}
.an4-sb:hover{border-color:var(--pool);color:var(--pool)}
.an4-sb.on{background:var(--nav,#0a0e38);color:#fff;border-color:var(--nav,#0a0e38)}
.an4-count-tog{display:flex;background:var(--surface-2);border-radius:20px;padding:2px;border:1px solid var(--line)}
.an4-ct{padding:4px 12px;border-radius:18px;font-size:11px;font-weight:500;cursor:pointer;border:none;background:transparent;color:var(--ink-3)}
.an4-ct.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.an4-filters{display:flex;flex-direction:column;gap:8px;padding:10px 14px;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px)}
.an4-fg{display:flex;align-items:flex-start;gap:10px}
.an4-fl{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;
  color:var(--ink-4);width:76px;flex-shrink:0;padding-top:5px}
.an4-fr{display:flex;gap:4px;flex-wrap:wrap;flex:1;align-items:center}
.an4-chip{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;cursor:pointer;
  border:1px solid var(--line);background:var(--surface-2);color:var(--ink-3)}
.an4-chip:hover{border-color:var(--pool);color:var(--pool)}
.an4-chip.on{background:var(--nav,#0a0e38);color:#fff;border-color:var(--nav,#0a0e38)}
.an4-team-inp{padding:4px 10px;border:1px solid var(--line);border-radius:20px;font-size:11px;
  background:var(--surface-2);color:var(--ink);outline:none;width:180px}
.an4-team-inp:focus{border-color:var(--pool)}
.an4-clear{display:flex;align-items:center;gap:4px;padding:4px 10px;font-size:11px;
  border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--ink-3);cursor:pointer}
.an4-clear:hover{color:var(--red,#e31937);border-color:var(--red,#e31937)}
.an4-funnel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);padding:14px 20px;display:flex;flex-direction:column;gap:8px}
.an4-funnel-title{font-size:12px;font-weight:500;color:var(--ink);margin-bottom:4px}
.an4-f-row{display:flex;align-items:center;gap:10px}
.an4-f-lbl{font-size:11px;color:var(--ink-3);width:165px;flex-shrink:0;text-align:right}
.an4-f-track{flex:1;height:28px;background:var(--surface-2);border-radius:4px;overflow:hidden}
.an4-f-bar{height:100%;border-radius:4px;display:flex;align-items:center;padding:0 8px;min-width:32px}
.an4-f-note{font-size:11px;color:var(--ink-3);width:270px;flex-shrink:0;line-height:1.4}
/* Breakdown */
.an4-bk-wrap{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);overflow:hidden}
.an4-bk-header{display:flex;align-items:baseline;justify-content:space-between;padding:10px 14px;
  border-bottom:1px solid var(--line);background:var(--surface-2)}
.an4-bk-scope{font-size:12px;font-weight:500;color:var(--ink)}
.an4-bk-mode{font-size:11px;color:var(--ink-4)}
.an4-bk-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;padding:12px}
.an4-bk-card{padding:10px 12px;border:1px solid var(--line);border-radius:var(--radius,6px);margin:4px;transition:border-color .12s}
.an4-bk-active{border-color:var(--pool);background:var(--pool-soft)}
.an4-bk-group{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-4);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--line-2)}
.an4-bk-row{display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:0.5px solid var(--line-2)}
.an4-bk-row:last-child{border-bottom:none}
.an4-bk-row.an4-dimmed{opacity:.35}
.an4-bk-gn{font-size:11px;color:var(--ink-3)}
.an4-bk-vals{display:flex;flex-direction:column;align-items:flex-end}
.an4-bk-n{font-size:15px;font-weight:500;color:var(--ink);line-height:1.1}
.an4-bk-sub{font-size:10px;color:var(--ink-4)}
/* Category strip */
.an4-cat-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.an4-cat{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);
  padding:10px 10px 8px;cursor:pointer;transition:border-color .12s,background .12s;text-align:left}
.an4-cat:hover{border-color:var(--pool)}
.an4-cat-icon{font-size:16px;display:block;margin-bottom:4px;color:var(--ink-4)}
.an4-cat-name{font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-4);margin-bottom:3px}
.an4-cat-n{font-size:19px;font-weight:500;color:var(--ink);line-height:1.1}
.an4-cat-sub{font-size:10px;color:var(--ink-4);margin-top:1px}
/* Detail */
.an4-detail{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md,8px);overflow:hidden}
.an4-dh{padding:12px 16px;border-bottom:1px solid var(--line)}
.an4-dt{font-size:13px;font-weight:500}
.an4-dn{font-size:11px;opacity:.8;margin-top:2px;color:inherit}
.an4-table{width:100%;border-collapse:collapse;font-size:12px}
.an4-table th{background:var(--surface-2);padding:7px 12px;text-align:left;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);border-bottom:1px solid var(--line)}
.an4-td{padding:10px 12px;border-bottom:0.5px solid var(--line-2);vertical-align:top}
.an4-table tr:hover .an4-td{background:var(--surface-2)}
.an4-table tr:last-child .an4-td{border-bottom:none}
.an4-ev{display:flex;align-items:baseline;gap:8px;padding:2px 0;border-bottom:0.5px solid var(--line-2);flex-wrap:wrap}
.an4-ev:last-child{border-bottom:none}
.an4-ev-name{font-size:11px;color:var(--ink-2);flex:1;min-width:120px}
.an4-ev-pl,.an4-ev-sc,.an4-ev-er{font-size:11px;color:var(--ink-3);white-space:nowrap}
.an4-ev-sc{font-family:var(--f-mono,'JetBrains Mono',monospace)}
.an4-ev-bump{font-size:10px;color:#534AB7;width:100%}
.an4-pill{display:inline-block;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:500}
.an4-kept{background:#E1F5EE;color:#085041}
.an4-pet{background:#EEEDFE;color:#3C3489}
.an4-rev{background:#FAEEDA;color:#633806}
`;
    document.head.appendChild(s);
  }

  /* ── sidebar collapse toggle ─────────────────────────────────── */
  function initSidebarToggle() {
    // Inject toggle button into topbar if it doesn't exist
    const tb = document.querySelector('.app-topbar, .topbar, header');
    if (!tb) return;
    if (document.getElementById('sb-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'sb-toggle-btn';
    btn.title = 'Toggle sidebar';
    btn.innerHTML = '<i class="ti ti-layout-sidebar" aria-hidden="true"></i>';
    btn.style.cssText = `background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
      border-radius:6px;padding:5px 8px;color:rgba(255,255,255,.65);cursor:pointer;
      display:flex;align-items:center;font-size:15px;margin-right:8px`;
    btn.addEventListener('click', toggleSidebar);
    // Insert before the first child of topbar right section
    const rightEl = document.getElementById('topbarRight') || tb.querySelector('.topbar-right');
    if (rightEl) rightEl.prepend(btn);
    else tb.appendChild(btn);
  }

  let _sidebarCollapsed = false;
  function toggleSidebar() {
    _sidebarCollapsed = !_sidebarCollapsed;
    const sidebar = document.querySelector('.control-sidebar, .sidebar, aside.app-sidebar');
    if (!sidebar) return;
    if (_sidebarCollapsed) {
      sidebar._origWidth = sidebar.style.width || '';
      sidebar._origOverflow = sidebar.style.overflow || '';
      sidebar._origMinWidth = sidebar.style.minWidth || '';
      sidebar.style.width = '44px';
      sidebar.style.minWidth = '44px';
      sidebar.style.overflow = 'hidden';
      // Hide all text labels, keep icons
      sidebar.querySelectorAll('.control-label, .filter-label, .filter-field, select, input, .flag-list, .filter-pills, .panel-head-title, #clearEventButton, #eventSearch, #filterFlags').forEach(el=>{
        el._origDisplay = el.style.display;
        el.style.display = 'none';
      });
      // Shrink event items to just icons
      sidebar.querySelectorAll('.event-item, .filter-section').forEach(el=>{
        el._origDisplay = el.style.display;
        el.style.display = 'none';
      });
      document.getElementById('sb-toggle-btn')?.querySelector('i')?.classList.replace('ti-layout-sidebar','ti-layout-sidebar-right');
    } else {
      sidebar.style.width = sidebar._origWidth || '';
      sidebar.style.minWidth = sidebar._origMinWidth || '';
      sidebar.style.overflow = sidebar._origOverflow || '';
      sidebar.querySelectorAll('.event-item, .filter-section, .control-label, .filter-label, .filter-field, select, input, .flag-list, .filter-pills, .panel-head-title, #clearEventButton, #eventSearch, #filterFlags').forEach(el=>{
        el.style.display = el._origDisplay || '';
      });
      document.getElementById('sb-toggle-btn')?.querySelector('i')?.classList.replace('ti-layout-sidebar-right','ti-layout-sidebar');
    }
    // Patch sidebar CSS transition
    sidebar.style.transition = 'width .2s ease';
  }

  /* ── init ────────────────────────────────────────────────────── */
  window._qvRenderReports = render;
  window._anRender = render;
  injectCSS();
  // Set up sidebar toggle once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarToggle);
  } else {
    setTimeout(initSidebarToggle, 500);
  }
  console.log('[analytics v4] ready');
})();
