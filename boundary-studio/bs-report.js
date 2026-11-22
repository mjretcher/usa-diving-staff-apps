/* =====================================================================
   bs-report.js -- the Reports tab of Boundary Studio (2026-11-21).

   One live page for the map on screen: the map, then one card per region
   (or zone) with the counts chosen in the strip at the top. Nothing is
   generated or stored; change the map and the page is different the next
   time it is drawn. Every option is a switch on the page, kept in the
   browser (localStorage "usad.bs.report").

   Reads only through window.BoundaryAPI. No pathway, fees or schedule.
   ===================================================================== */
(function(){
'use strict';

const B = () => window.BoundaryAPI;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('en-US');
const sum = a => a.reduce((s, x) => s + (x || 0), 0);

const KEY = 'usad.bs.report';
const DEFAULTS = {page: 'areas', level: 0, layout: 'grid', counts: ['comp', 'coaches', 'clubs'],
                  age: false, gender: false, boards: false, maps: true, clubNames: false, share: false,
                  routes: true, athletes: true, eachMeet: false};
let ST = null;
function state(){
  if (ST) return ST;
  let o = {};
  try { o = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e){ o = {}; }
  ST = Object.assign({}, DEFAULTS, o);
  if (!Array.isArray(ST.counts)) ST.counts = DEFAULTS.counts.slice();
  return ST;
}
function save(){ try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch(e){} }

/* What can be counted. `typed` counts need the exact membership type, which
   the import keeps for 2026 only. */
const COUNTS = [
  {k:'comp',    label:'Competition Athletes', typed:true, t:'t_comp', other:'Athletes, all types'},
  {k:'coaches', label:'Coaches'},
  {k:'clubs',   label:'Clubs'},
  {k:'ath',     label:'Athlete members',       typed:true, t:'t_ath',    only:true},
  {k:'intro',   label:'Introductory Athletes', typed:true, t:'t_intro',  only:true},
  {k:'ccoach',  label:'Competition Coaches',   typed:true, t:'t_ccoach', only:true},
  {k:'off',     label:'Judges and officials',  typed:true, t:'t_off',    only:true},
  {k:'members', label:'All members'},
];
const AGE = [                                   // order of the 15 Competition Athlete numbers
  {k:'D', label:'11 & under'}, {k:'C', label:'12 to 13'}, {k:'B', label:'14 to 15'},
  {k:'A', label:'16 to 18'}, {k:'19+', label:'19 & over'}];
const BOARDS = [{k:'1', label:'1 meter'}, {k:'3', label:'3 meter'}, {k:'P', label:'Platform'}];
const GCOL = {b:'#2456B8', g:'#E31937', u:'#b8c0cc'};
const FALLBACK = ['#171F69', '#E31937', '#009AC7', '#8FC3EA', '#6d28d9', '#047857', '#b45309', '#9d174d',
                  '#0e7490', '#4d7c0f', '#7c2d12', '#1e40af'];

/* "Region 12" -> "12", "Zone A" -> "A", otherwise up to three initials. */
function badge(name, i){
  const m = String(name || '').trim().match(/\s(\d+|[A-Za-z])$/);
  if (m) return m[1].toUpperCase();
  const ini = String(name || '').split(/\s+/).map(w => w[0] || '').join('').slice(0, 3).toUpperCase();
  return ini || String(i + 1);
}

/* Everything the page shows, for one level. */
function build(L){
  const api = B(), geo = api.geo(), y = api.year(), assign = api.assign(), regions = api.regions();
  const TG = api.tierGroupsAt(L), of = TG.of, n = TG.groups.length;
  const light = api.countyLight || (() => false);
  const areas = TG.groups.map((g, gi) => ({
    gi, name: g.name || ('Area ' + (gi + 1)), badge: badge(g.name, gi),
    color: (api.colorAt && api.colorAt(L, gi)) || (g.colors && g.colors[0]) || FALLBACK[gi % FALLBACK.length],
    m: 0, a: 0, c: 0, cl: new Set(), counties: 0, ages: [0, 0, 0, 0, 0],
    solid: [], pale: [], cx: 0, cy: 0, pts: 0,
  }));
  const un = [];
  const areaOf = f => { const ri = assign[f]; const gi = (ri != null && ri >= 0 && ri < regions.length) ? of[ri] : null;
                        return (gi == null || gi < 0 || gi >= n) ? null : areas[gi]; };
  for (const c of geo.counties){
    const A = areaOf(c.f);
    if (!A){ un.push(c.d); continue; }
    A.counties++;
    (light(c.f) ? A.pale : A.solid).push(c.d);
    const p = /M\s*(-?[\d.]+)[ ,](-?[\d.]+)/.exec(c.d);     // a county's first point is close enough for a label
    if (p){ A.cx += +p[1]; A.cy += +p[2]; A.pts++; }
  }
  const age = api.age() || {};
  for (const [fips, st] of Object.entries(geo.stats)){
    const v = st[y]; if (!v) continue;
    const A = areaOf(fips); if (!A) continue;
    A.m += v.m; A.a += v.a; A.c += v.c;
    (v.cl || []).forEach(i => A.cl.add(i));
    const ag = age[fips] && age[fips][y];
    if (ag) for (let j = 0; j < 5; j++) A.ages[j] += (ag[j] || 0);
  }
  const typed = api.memberTypesAt ? api.memberTypesAt(L) : null;
  const cath  = api.compAthAt ? api.compAthAt(L) : null;
  let cells = null;
  try { cells = api.entryCellsAt ? api.entryCellsAt(L) : null; } catch(e){ cells = null; }
  if (cells && !cells.some(r => r && Object.keys(r).length)) cells = null;
  const clubNames = geo.clubs || [];
  const allClubs = new Set(); areas.forEach(A => A.cl.forEach(i => allClubs.add(i)));
  const value = (A, k) => {
    const C = COUNTS.find(x => x.k === k);
    if (k === 'coaches') return A.c;
    if (k === 'clubs') return A.cl.size;
    if (k === 'members') return A.m;
    if (typed) return typed[A.gi][C.t];
    return k === 'comp' ? A.a : null;
  };
  const total = k => k === 'clubs' ? allClubs.size : sum(areas.map(A => value(A, k)));
  const label = k => { const C = COUNTS.find(x => x.k === k); return (!typed && C.other) ? C.other : C.label; };
  return {L, TG, n, areas, un, typed, cath, cells, value, total, label,
          clubName: i => { const c = clubNames[i]; return typeof c === 'string' ? c : (c && (c.n || c.name)) || ''; }};
}

/* ---------- map ---------- */
function mapSvg(D){
  const geo = B().geo();
  const one = (parts, color, op) => parts.length
    ? `<path d="${parts.join('')}" fill="${color}"${op} stroke="#fff" stroke-width="0.3"/>` : '';
  const body = D.areas.map(A => one(A.pale, A.color, ' fill-opacity="0.6"') + one(A.solid, A.color, '')).join('')
    + (D.un.length ? `<path d="${D.un.join('')}" fill="#e2e8f2" stroke="#fff" stroke-width="0.3"/>` : '');
  const labels = D.areas.map(A => {
    if (!A.pts) return '';
    const x = (A.cx / A.pts).toFixed(1), y = (A.cy / A.pts).toFixed(1), w = 11 + A.badge.length * 6.2;
    return `<g class="bsr-lab"><rect x="${(x - w / 2).toFixed(1)}" y="${(y - 10).toFixed(1)}" width="${w.toFixed(1)}" height="20" rx="10" fill="#fff" stroke="${A.color}" stroke-width="1.6"/>
      <text x="${x}" y="${(+y + 4.3).toFixed(1)}" text-anchor="middle">${esc(A.badge)}</text></g>`;
  }).join('');
  return `<svg class="bsr-map" viewBox="${esc(geo.viewBox || '0 0 975 610')}" role="img" aria-label="Map of ${esc(B().tierName(D.L))}">
    ${body}<path d="${geo.stateMesh}" fill="none" stroke="#fff" stroke-width="0.9"/>
    <path d="${geo.nationMesh}" fill="none" stroke="#94a3b8" stroke-width="0.7"/>${labels}</svg>`;
}
function miniSvg(A){
  const one = (parts, op) => parts.length ? `<path d="${parts.join('')}" fill="${A.color}"${op} stroke="#fff" stroke-width="0.4"/>` : '';
  return `<svg class="bsr-mini" data-fit="1" viewBox="0 0 975 610" aria-hidden="true">${one(A.pale, ' fill-opacity="0.6"')}${one(A.solid, '')}</svg>`;
}

/* ---------- card blocks ---------- */
function bar(v, max, color){
  const w = max > 0 ? Math.max(v > 0 ? 2 : 0, Math.round(100 * v / max)) : 0;
  return `<i class="bsr-bar"><i style="width:${w}%;background:${color}"></i></i>`;
}
function stack(parts, max){
  const tot = sum(parts.map(p => p[0]));
  const w = max > 0 ? Math.max(tot > 0 ? 2 : 0, Math.round(100 * tot / max)) : 0;
  return `<i class="bsr-bar"><i class="bsr-stack" style="width:${w}%">${parts.map(([v, c]) => v > 0 ? `<i style="flex:${v};background:${c}"></i>` : '').join('')}</i></i>`;
}
function ageBlock(D, A, S){
  if (D.cath){
    const v = D.cath[A.gi], max = Math.max(1, ...D.areas.map(X => Math.max(...[0,1,2,3,4].map(j => D.cath[X.gi][j*3] + D.cath[X.gi][j*3+1] + D.cath[X.gi][j*3+2]))));
    const rows = AGE.map((g, j) => {
      const b = v[j*3], gl = v[j*3+1], u = v[j*3+2], t = b + gl + u;
      return `<div class="bsr-r"><span>${g.label}</span>${S.gender ? stack([[b, GCOL.b], [gl, GCOL.g], [u, GCOL.u]], max) : bar(t, max, A.color)}
        <b>${S.gender ? `${fmt(b)} / ${fmt(gl)}${u ? ` <em>+${fmt(u)}</em>` : ''}` : fmt(t)}</b></div>`;
    }).join('');
    return `<div class="bsr-blk"><h4>Competition Athletes by age${S.gender ? ' <small>boys / girls</small>' : ''}</h4>${rows}</div>`;
  }
  const max = Math.max(1, ...D.areas.map(X => Math.max(...X.ages)));
  return `<div class="bsr-blk"><h4>Athletes by age</h4>${AGE.map((g, j) =>
    `<div class="bsr-r"><span>${g.label}</span>${bar(A.ages[j], max, A.color)}<b>${fmt(A.ages[j])}</b></div>`).join('')}</div>`;
}
function genderBlock(D, A){
  if (!D.cath) return `<div class="bsr-blk"><h4>Competition Athletes by gender</h4><p class="bsr-na">Counted for 2026 only.</p></div>`;
  const v = D.cath[A.gi], tot = k => sum([0,1,2,3,4].map(j => v[j*3 + k]));
  const max = Math.max(1, ...D.areas.map(X => Math.max(...[0,1].map(k => sum([0,1,2,3,4].map(j => D.cath[X.gi][j*3 + k]))))));
  const rows = [['Boys', tot(0), GCOL.b], ['Girls', tot(1), GCOL.g]].concat(tot(2) ? [['Not known', tot(2), GCOL.u]] : []);
  return `<div class="bsr-blk"><h4>Competition Athletes by gender</h4>${rows.map(([l, n, c]) =>
    `<div class="bsr-r"><span>${l}</span>${bar(n, max, c)}<b>${fmt(n)}</b></div>`).join('')}</div>`;
}
/* Event entries by board. Rows follow the age and gender switches. */
function boardRows(S){
  const ages = S.age ? ['D', 'C', 'B', 'A'] : [null], gens = S.gender ? ['B', 'G'] : [null];
  const rows = [];
  ages.forEach(a => gens.forEach(g => rows.push({a, g,
    label: [a ? 'Group ' + a : '', g ? (g === 'B' ? 'Boys' : 'Girls') : ''].filter(Boolean).join(' ') || 'All'})));
  return rows;
}
function cellSum(cells, a, g, b){
  let n = 0;
  for (const k in cells) if ((!a || k[0] === a) && (!g || k[1] === g) && (!b || k[2] === b)) n += cells[k];
  return n;
}
function boardBlock(D, A, S){
  const head = `<h4>Event entries by board <small>${esc(String(B().yearLabel()).slice(0, 4))} first meet</small></h4>`;
  if (!D.cells) return `<div class="bsr-blk">${head}<p class="bsr-na">No entries on file for this season.</p></div>`;
  const c = D.cells[A.gi] || {}, rows = boardRows(S);
  if (rows.length === 1){
    const max = Math.max(1, ...D.areas.map(X => Math.max(...BOARDS.map(b => cellSum(D.cells[X.gi] || {}, null, null, b.k)))));
    return `<div class="bsr-blk">${head}${BOARDS.map(b => { const n = cellSum(c, null, null, b.k);
      return `<div class="bsr-r"><span>${b.label}</span>${bar(n, max, A.color)}<b>${fmt(n)}</b></div>`; }).join('')}</div>`;
  }
  return `<div class="bsr-blk">${head}<table class="bsr-t"><thead><tr><th></th>${BOARDS.map(b => `<th>${b.label}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r.label}</td>${BOARDS.map(b => `<td>${fmt(cellSum(c, r.a, r.g, b.k))}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`;
}
function clubBlock(D, A){
  const names = [...A.cl].map(D.clubName).filter(Boolean).sort((a, b) => a.localeCompare(b));
  return `<div class="bsr-blk"><h4>Clubs with members here</h4><p class="bsr-clubs">${names.map(esc).join(' &middot; ') || 'None'}</p></div>`;
}

function shownCounts(D, S){ return COUNTS.filter(C => S.counts.includes(C.k) && !(C.only && !D.typed)); }

function cardHtml(D, A, S, maxOf){
  const stats = shownCounts(D, S).map(C => {
    const v = D.value(A, C.k), tot = D.total(C.k);
    const pct = (S.share && C.k !== 'clubs' && tot > 0) ? `<em>${(100 * v / tot).toFixed(1)}% of all</em>` : '';
    return `<div class="bsr-stat"><b>${fmt(v)}</b><span>${esc(D.label(C.k))}</span>${bar(v, maxOf[C.k], A.color)}${pct}</div>`;
  }).join('');
  return `<article class="bsr-card" style="--c:${A.color}">
    <header><span class="bsr-badge">${esc(A.badge)}</span><h3>${esc(A.name)}</h3>${S.maps ? miniSvg(A) : ''}</header>
    <div class="bsr-stats">${stats}</div>
    ${S.age ? ageBlock(D, A, S) : (S.gender ? genderBlock(D, A) : '')}
    ${S.boards ? boardBlock(D, A, S) : ''}
    ${S.clubNames ? clubBlock(D, A) : ''}
  </article>`;
}

/* ---------- table layout (also the spreadsheet) ---------- */
function tableData(D, S){
  const cols = shownCounts(D, S).map(C => ({h: D.label(C.k), v: A => D.value(A, C.k), tot: () => D.total(C.k)}));
  if (S.age){
    if (D.cath) AGE.forEach((g, j) => {
      if (S.gender){
        cols.push({h: `${g.label} boys`,  v: A => D.cath[A.gi][j*3]});
        cols.push({h: `${g.label} girls`, v: A => D.cath[A.gi][j*3+1]});
      } else cols.push({h: `Age ${g.label}`, v: A => D.cath[A.gi][j*3] + D.cath[A.gi][j*3+1] + D.cath[A.gi][j*3+2]});
    });
    else AGE.forEach((g, j) => cols.push({h: `Age ${g.label}`, v: A => A.ages[j]}));
  } else if (S.gender && D.cath){
    [['Boys', 0], ['Girls', 1], ['Gender not known', 2]].forEach(([h, k]) =>
      cols.push({h, v: A => sum([0,1,2,3,4].map(j => D.cath[A.gi][j*3 + k]))}));
  }
  if (S.boards && D.cells) boardRows(S).forEach(r => BOARDS.forEach(b =>
    cols.push({h: `${r.label === 'All' ? '' : r.label + ' '}${b.label} entries`.trim(), v: A => cellSum(D.cells[A.gi] || {}, r.a, r.g, b.k)})));
  const rows = D.areas.map(A => [A.name].concat(cols.map(c => c.v(A))));
  const totals = ['Total'].concat(cols.map(c => c.tot ? c.tot() : sum(D.areas.map(A => c.v(A)))));
  return {head: [B().tierName(D.L)].concat(cols.map(c => c.h)), rows, totals};
}
function tableHtml(D, S){
  const T = tableData(D, S);
  return `<div class="bsr-tablewrap"><table class="bsr-table"><thead><tr>${T.head.map((h, i) => `<th${i ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${T.rows.map((r, ri) => `<tr>${r.map((v, i) => i ? `<td class="n">${fmt(v)}</td>`
      : `<td><span class="bsr-badge sm" style="--c:${D.areas[ri].color}">${esc(D.areas[ri].badge)}</span>${esc(v)}</td>`).join('')}</tr>`).join('')}
    <tr class="tot">${T.totals.map((v, i) => i ? `<td class="n">${fmt(v)}</td>` : `<td>${esc(v)}</td>`).join('')}</tr></tbody></table></div>`;
}
function downloadCsv(D, S){
  const T = tableData(D, S);
  saveCsv([T.head].concat(T.rows, [T.totals]), `${B().tierName(D.L)}-${String(B().yearLabel()).slice(0, 4)}.csv`);
}
function saveCsv(table, file){
  const q = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = table.map(r => r.map(q).join(','));
  const name = String(file).replace(/[^\w.\-]+/g, '-');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], {type: 'text/csv'}));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- page ---------- */
function levelsWithAreas(){
  const api = B(), out = [];
  for (let L = 0; L < api.levelCount(); L++) if (api.groupCountAt(L) > 1) out.push(L);
  return out.length ? out : [0];
}
const usd = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const chip = (attr, key, on, label, dis) => `<button class="bsr-chip${on ? ' on' : ''}" ${attr}="${key}" aria-pressed="${on}"${dis ? ' disabled title="Counted for 2026 only"' : ''}>${esc(label)}</button>`;
const seg = (attr, opts, cur) => `<div class="bsr-seg">${opts.map(([v, l]) => `<button ${attr}="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;

/* The switches. The first row is the same on every page; the rest follow the page. */
function stripHtml(S, levels, typed){
  const api = B();
  const years = (api.availableYears ? api.availableYears() : [api.year()]);
  const cur = S.page === 'areas' ? 'L' + S.level : S.page;
  const pages = levels.map(L => ['L' + L, api.tierName(L)]).concat([['structure', 'Structure'], ['money', 'Money']]);
  const flag = (k, label) => chip('data-bsr-flag', k, !!S[k], label);
  let rows = '';
  if (S.page === 'areas') rows = `
    <div class="bsr-row"><span class="bsr-lbl">Count</span>${COUNTS.map(C => chip('data-bsr-count', C.k, S.counts.includes(C.k) && !(C.only && !typed), (!typed && C.other) ? C.other : C.label, C.only && !typed)).join('')}</div>
    <div class="bsr-row"><span class="bsr-lbl">Break down by</span>${flag('age', 'Age group')}${flag('gender', 'Gender')}${flag('boards', 'Board')}
      <span class="bsr-lbl gap">Also show</span>${flag('maps', 'Area maps')}${flag('clubNames', 'Club names')}${flag('share', 'Share of total')}</div>`;
  else if (S.page === 'structure') rows = `
    <div class="bsr-row"><span class="bsr-lbl">Break down by</span>${flag('age', 'Age group')}${flag('gender', 'Gender')}${flag('boards', 'Board')}
      <span class="bsr-lbl gap">Also show</span>${flag('routes', 'Who advances')}${flag('athletes', 'Athletes')}${flag('eachMeet', 'Each meet')}</div>`;
  else rows = `
    <div class="bsr-row"><span class="bsr-lbl">Also show</span>${flag('eachMeet', 'Each meet')}${flag('share', 'Share of total')}</div>`;
  return `<div class="bsr-strip">
    <div class="bsr-row">
      <span class="bsr-lbl">Show</span>${seg('data-bsr-page', pages, cur)}
      <span class="bsr-lbl">Season</span><select class="bsr-sel" id="bsrYear">${years.map(y => `<option value="${y}" ${y === api.year() ? 'selected' : ''}>${esc(api.yearLabel(y))}</option>`).join('')}</select>
      <span class="bsr-lbl">Layout</span>${seg('data-bsr-layout', [['grid', 'Grid'], ['table', 'Table']], S.layout)}
      <span class="bsr-grow"></span>
      <button class="bsr-btn" id="bsrCsv">Spreadsheet</button>
      <button class="bsr-btn prim" id="bsrPrint">Print or save as PDF</button>
    </div>${rows}
  </div>`;
}
function headHtml(title, extra){
  const api = B();
  const when = new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
  return `<header class="bsr-head"><div><h1>${title}</h1>
    <p>${extra ? extra + ' &middot; ' : ''}${esc(api.scenarioLabel ? api.scenarioLabel() : '')}${api.mapName && api.mapName() ? ' &middot; ' + esc(api.mapName()) : ''} &middot; ${esc(api.yearLabel())}</p></div>
    <div class="bsr-when">USA Diving<br>${esc(when)}</div></header>`;
}

function html(){
  const api = B();
  if (!api || !api.ready()) return '<div class="bsr"><p class="bsr-na">The map has not finished loading.</p></div>';
  const S = state(), levels = levelsWithAreas();
  if (!['areas', 'structure', 'money'].includes(S.page)) S.page = 'areas';
  if (!levels.includes(S.level)) S.level = levels[0];
  if (S.page !== 'areas') return pathwayPage(S, levels);
  const D = build(S.level);
  const shown = shownCounts(D, S), maxOf = {};
  shown.forEach(C => { maxOf[C.k] = Math.max(1, ...D.areas.map(A => D.value(A, C.k))); });
  const totals = shown.map(C => `<div class="bsr-total"><b>${fmt(D.total(C.k))}</b><span>${esc(D.label(C.k))}</span></div>`).join('');
  const genderKey = (S.gender && D.cath && (S.age || S.layout === 'grid'))
    ? `<span class="bsr-key"><i style="background:${GCOL.b}"></i>Boys<i style="background:${GCOL.g}"></i>Girls<i style="background:${GCOL.u}"></i>Not known</span>` : '';
  const notes = ['Members are counted in the county of their home ZIP code.',
                 'A club is counted in every area where it has members.',
                 'Lighter counties on the map have no ' + ((api.countyLightBasis && api.countyLightBasis() === 'clubs') ? 'club' : 'members') + '.']
    .concat(D.typed ? [] : ['Counts by exact membership type are kept for 2026 only.']);
  return `<div class="bsr">${stripHtml(S, levels, D.typed)}
    <div class="bsr-page">
      ${headHtml(`${fmt(D.n)} ${esc(api.tierName(S.level))}`, 'Membership')}
      <div class="bsr-top"><div class="bsr-mapbox">${mapSvg(D)}</div><div class="bsr-totals">${totals}</div></div>
      ${genderKey}
      ${S.layout === 'table' ? tableHtml(D, S) : `<div class="bsr-grid">${D.areas.map(A => cardHtml(D, A, S, maxOf)).join('')}</div>`}
      <p class="bsr-foot">${notes.join(' ')}</p>
    </div></div>`;
}

/* ---------- Structure and Money ---------- */
function pathwayData(){
  const api = B();
  if (!api.reportPathway) return null;
  const P = api.reportPathway();
  if (!P) return null;
  P.levels.forEach(l => {
    l.meets = P.meets.filter(m => m.level === l.L);
    l.entries = sum(l.meets.map(m => m.entries));
    l.cells = {};
    l.meets.forEach(m => m.events.forEach(e => { l.cells[e.cell] = (l.cells[e.cell] || 0) + e.n; }));
    ['gross', 'levy', 'host', 'usad'].forEach(k => { l[k] = sum(l.meets.map(m => m[k])); });
    l.color = gi => (api.colorAt && api.colorAt(l.L, gi)) || '#171f69';
  });
  P.total = {};
  ['entries', 'gross', 'levy', 'host', 'usad'].forEach(k => { P.total[k] = sum(P.levels.map(l => l[k])); });
  P.total.meets = P.meets.length;
  return P;
}
/* Entries at a level by the age, gender and board switches. Null when none is on. */
function entryBreakdown(l, S){
  if (!S.age && !S.gender && !S.boards) return null;
  const rows = boardRows(S), cols = S.boards ? BOARDS : [{k: null, label: 'Entries'}];
  return {cols, rows: rows.map(r => ({label: r.label, v: cols.map(b => cellSum(l.cells, r.a, r.g, b.k))}))};
}
function breakdownHtml(l, S){
  const bd = entryBreakdown(l, S);
  if (!bd) return '';
  if (bd.cols.length === 1){
    const max = Math.max(1, ...bd.rows.map(r => r.v[0]));
    return `<div class="bsr-blk"><h4>Event entries</h4>${bd.rows.map(r =>
      `<div class="bsr-r"><span>${r.label}</span>${bar(r.v[0], max, '#171f69')}<b>${fmt(r.v[0])}</b></div>`).join('')}</div>`;
  }
  return `<div class="bsr-blk"><h4>Event entries by board</h4><table class="bsr-t"><thead><tr><th></th>${bd.cols.map(b => `<th>${b.label}</th>`).join('')}</tr></thead>
    <tbody>${bd.rows.map(r => `<tr><td>${r.label}</td>${r.v.map(v => `<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function meetsHtml(l, val, show, title){
  const max = Math.max(1, ...l.meets.map(val));
  return `<div class="bsr-blk"><h4>${title}</h4>${l.meets.map(m =>
    `<div class="bsr-r wide"><span>${esc(m.name)}</span>${bar(val(m), max, l.color(m.gi))}<b>${show(val(m))}</b></div>`).join('')}</div>`;
}
function structureCard(P, l, S){
  const out = l.routes.filter(rt => rt.toLevel != null && rt.toLevel !== l.L);
  const within = l.routes.filter(rt => rt.toLevel === l.L);
  const line = rt => `<div class="bsr-route"><span>${l.rounds.length > 1 ? esc(rt.from) + ': ' : ''}${esc(rt.band)}</span><b>${rt.toLevel === l.L ? esc(rt.toRound) : esc(rt.toName) + ' ' + esc(rt.toRound)}</b></div>`;
  const routes = !S.routes ? '' : `<div class="bsr-blk"><h4>Who advances</h4>${
    (within.concat(out)).map(line).join('') || '<p class="bsr-na">Last meet of the season.</p>'}</div>`;
  return `<article class="bsr-card bsr-step" style="--c:#171f69">
    <header><span class="bsr-badge">${l.L + 1}</span><h3>${esc(l.name)}</h3><span class="bsr-meets">${fmt(l.stops)} ${l.stops === 1 ? 'meet' : 'meets'}</span></header>
    <div class="bsr-stats two">
      <div class="bsr-stat"><b>${fmt(l.entries)}</b><span>Event entries</span></div>
      ${S.athletes && l.divers ? `<div class="bsr-stat"><b>${fmt(Math.round(l.divers.n))}</b><span>Athletes, estimated</span></div>` : ''}
      ${l.stops > 1 ? `<div class="bsr-stat"><b>${fmt(Math.round(l.entries / l.stops))}</b><span>Average per meet</span></div>` : ''}
    </div>
    <p class="bsr-rounds">${l.rounds.map(r => esc(r.name)).join(' &middot; ')}</p>
    ${routes}${breakdownHtml(l, S)}${S.eachMeet && l.stops > 1 ? meetsHtml(l, m => m.entries, fmt, 'Event entries at each meet') : ''}
  </article>`;
}
function moneyBar(x){
  const t = Math.max(1, x.gross);
  return `<i class="bsr-bar tall"><i class="bsr-stack" style="width:100%">
    <i style="flex:${Math.max(0, x.usad)};background:#171f69"></i><i style="flex:${Math.max(0, x.host)};background:#009AC7"></i><i style="flex:${Math.max(0, x.levy)};background:#b8c0cc"></i></i></i>`
    + (t ? '' : '');
}
function moneyCard(P, l, S){
  const share = v => (S.share && P.total.usad > 0) ? `<em>${(100 * v / P.total.usad).toFixed(1)}% of all</em>` : '';
  const flat = l.entries > 0 && Math.abs(l.gross - l.entries * l.fee) < 1;
  return `<article class="bsr-card bsr-step" style="--c:#171f69">
    <header><span class="bsr-badge">${l.L + 1}</span><h3>${esc(l.name)}</h3><span class="bsr-meets">${fmt(l.stops)} ${l.stops === 1 ? 'meet' : 'meets'}</span></header>
    <div class="bsr-stats money">
      <div class="bsr-stat"><b>${usd(l.usad)}</b><span>USA Diving keeps</span>${share(l.usad)}</div>
      <div class="bsr-stat"><b>${usd(l.gross)}</b><span>Entry income</span></div>
    </div>
    ${moneyBar(l)}
    <div class="bsr-blk">
      <div class="bsr-route"><span>Event entries</span><b>${fmt(l.entries)}</b></div>
      ${flat ? `<div class="bsr-route"><span>Entry fee</span><b>${usd(l.fee)}</b></div>` : ''}
      <div class="bsr-route"><span>To hosts</span><b>${usd(l.host)}</b></div>
      <div class="bsr-route"><span>DiveMeets fee</span><b>${usd(l.levy)}</b></div>
    </div>
    ${S.eachMeet && l.stops > 1 ? meetsHtml(l, m => m.usad, usd, 'USA Diving keeps from each meet') : ''}
  </article>`;
}
function pathwayTable(P, S){
  const money = S.page === 'money';
  let head, rowOf;
  if (money){
    head = ['Meet', 'Meets', 'Event entries', 'Entry income', 'To hosts', 'DiveMeets fee', 'USA Diving keeps'];
    rowOf = (name, x, n) => [name, n, x.entries, Math.round(x.gross), Math.round(x.host), Math.round(x.levy), Math.round(x.usad)];
  } else {
    const bdCols = l => { const bd = entryBreakdown(l, S); return bd ? bd.rows.flatMap(r => bd.cols.map((c, i) => [`${r.label === 'All' ? '' : r.label + ' '}${c.label}`.trim(), r.v[i]])) : []; };
    head = ['Meet', 'Meets', 'Event entries'].concat(S.athletes ? ['Athletes, estimated'] : [], P.levels.length ? bdCols(P.levels[0]).map(x => x[0]) : []);
    rowOf = (name, x, n, l) => [name, n, x.entries].concat(S.athletes ? [l && l.divers ? Math.round(l.divers.n) : ''] : [],
      l ? bdCols(l).map(x => x[1]) : (P.levels.length ? bdCols(P.levels[0]).map(() => '') : []));
  }
  const rows = [], kinds = [];
  P.levels.forEach(l => {
    rows.push(rowOf(l.name, l, l.stops, l)); kinds.push('lvl');
    if (S.eachMeet && l.stops > 1) l.meets.forEach(m => { rows.push(rowOf(m.name, m, '', null)); kinds.push('meet'); });
  });
  const totals = money ? rowOf('Total', P.total, P.total.meets) : null;
  return {head, rows, kinds, totals, money};
}
function pathwayTableHtml(T){
  const cell = (v, i) => i === 0 ? `<td>${esc(v)}</td>` : `<td class="n">${v === '' ? '' : ((T.money && i >= 3) ? usd(v) : fmt(v))}</td>`;
  return `<div class="bsr-tablewrap"><table class="bsr-table"><thead><tr>${T.head.map((h, i) => `<th${i ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${T.rows.map((r, ri) => `<tr class="${T.kinds[ri]}">${r.map(cell).join('')}</tr>`).join('')}
    ${T.totals ? `<tr class="tot">${T.totals.map(cell).join('')}</tr>` : ''}</tbody></table></div>`;
}
function pathwayPage(S, levels){
  const api = B(), P = pathwayData();
  const strip = stripHtml(S, levels, true);
  const title = S.page === 'money' ? 'Money' : 'Structure';
  if (!P){
    if (api.ensurePathway && !pathwayPage._asked){ pathwayPage._asked = true; try { api.ensurePathway(); } catch(e){} }
    return `<div class="bsr">${strip}<div class="bsr-page">${headHtml(title)}<p class="bsr-na">Working out the pathway.</p></div></div>`;
  }
  pathwayPage._asked = false;
  const chain = P.levels.map(l => `${fmt(l.stops)} ${esc(l.name)}`).join(' &rarr; ');
  let body, totals, notes;
  if (S.page === 'money'){
    totals = [['USA Diving keeps', P.total.usad], ['Entry income', P.total.gross], ['To hosts', P.total.host], ['DiveMeets fee', P.total.levy]]
      .map(([l, v]) => `<div class="bsr-total"><b>${usd(v)}</b><span>${l}</span></div>`).join('');
    body = `<div class="bsr-totals row">${totals}</div>
      <div class="bsr-split">${moneyBar(P.total)}<span class="bsr-key"><i style="background:#171f69"></i>USA Diving keeps<i style="background:#009AC7"></i>To hosts<i style="background:#b8c0cc"></i>DiveMeets fee</span></div>
      ${S.layout === 'table' ? pathwayTableHtml(pathwayTable(P, S)) : `<div class="bsr-grid steps">${P.levels.map(l => moneyCard(P, l, S)).join('')}</div>`}`;
    notes = ['Entry fees only. Membership dues are not included.', 'Event entries are projected for this structure. An entry is one athlete in one event.'];
  } else {
    const last = P.levels[P.levels.length - 1];
    totals = `<div class="bsr-total"><b>${fmt(last.entries)}</b><span>Event entries at ${esc(last.name)}</span></div>`
      + (S.athletes && last.divers ? `<div class="bsr-total"><b>${fmt(Math.round(last.divers.n))}</b><span>Athletes at ${esc(last.name)}, estimated</span></div>` : '')
      + `<div class="bsr-total"><b>${fmt(P.total.meets)}</b><span>Meets in the season</span></div>`;
    body = `<div class="bsr-totals row">${totals}</div>
      ${S.layout === 'table' ? pathwayTableHtml(pathwayTable(P, S)) : `<div class="bsr-grid steps">${P.levels.map(l => structureCard(P, l, S)).join('')}</div>`}`;
    notes = ['Event entries are projected for this structure. An entry is one athlete in one event.']
      .concat(S.athletes ? ['Athletes are estimated from the number of events each athlete entered.'] : []);
  }
  return `<div class="bsr">${strip}<div class="bsr-page">${headHtml(title, chain)}${body}<p class="bsr-foot">${notes.join(' ')}</p></div></div>`;
}

function wire(root){
  css();
  const S = state();
  const again = () => { save(); root.innerHTML = html(); wire(root); };
  root.querySelectorAll('[data-bsr-page]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.bsrPage;
    if (/^L\d+$/.test(v)){ S.page = 'areas'; S.level = +v.slice(1); } else S.page = v;
    again();
  }));
  root.querySelectorAll('[data-bsr-layout]').forEach(b => b.addEventListener('click', () => { S.layout = b.dataset.bsrLayout; again(); }));
  root.querySelectorAll('[data-bsr-count]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.bsrCount, i = S.counts.indexOf(k);
    if (i >= 0) S.counts.splice(i, 1); else S.counts.push(k);
    again();
  }));
  root.querySelectorAll('[data-bsr-flag]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.bsrFlag; S[k] = !S[k]; again(); }));
  const yr = root.querySelector('#bsrYear');
  if (yr) yr.addEventListener('change', () => { if (B().setYear) B().setYear(yr.value); });
  const pr = root.querySelector('#bsrPrint'); if (pr) pr.addEventListener('click', () => window.print());
  const cs = root.querySelector('#bsrCsv'); if (cs) cs.addEventListener('click', () => {
    if (S.page === 'areas'){ downloadCsv(build(S.level), S); return; }
    const P = pathwayData(); if (!P) return;
    const T = pathwayTable(P, S);
    saveCsv([T.head].concat(T.rows, T.totals ? [T.totals] : []), `${S.page}-${String(B().yearLabel()).slice(0, 4)}.csv`);
  });
  // Fit each small map to its own area.
  root.querySelectorAll('svg[data-fit]').forEach(svg => {
    try {
      const b = svg.getBBox();
      if (b.width && b.height){ const p = Math.max(b.width, b.height) * 0.06;
        svg.setAttribute('viewBox', `${(b.x - p).toFixed(1)} ${(b.y - p).toFixed(1)} ${(b.width + 2*p).toFixed(1)} ${(b.height + 2*p).toFixed(1)}`); }
    } catch(e){}
  });
}

const CSS = `
.atl-main.atl-report{background:#f4f6fa !important;padding:0 !important;display:block !important}
.bsr{--ink:#171f69;--soft:#5a6480;--line:#e2e8f2;font-family:Inter,system-ui,sans-serif;color:#1c2540;padding:18px 28px 60px}
.bsr-strip{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin:0 auto 18px;max-width:1280px;display:flex;flex-direction:column;gap:8px}
.bsr-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.bsr-lbl{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--soft);min-width:96px}
.bsr-lbl.gap{margin-left:18px;min-width:0}
.bsr-row:first-child .bsr-lbl{min-width:0}.bsr-row:first-child .bsr-lbl:first-child{min-width:96px}
.bsr-grow{flex:1}
.bsr-seg{display:inline-flex;background:#eef1f6;border-radius:7px;padding:3px;margin-right:10px}
.bsr-seg button{border:0;background:none;padding:6px 14px;border-radius:5px;font:inherit;font-size:13px;font-weight:600;color:#4b5568;cursor:pointer}
.bsr-seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(16,24,40,.12)}
.bsr-sel{font:inherit;font-size:13px;padding:6px 8px;border:1px solid #cdd6e4;border-radius:6px;margin-right:10px;background:#fff;color:var(--ink)}
.bsr-chip{border:1px solid #cdd6e4;background:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;font-weight:600;color:#4b5568;cursor:pointer}
.bsr-chip.on{background:var(--ink);border-color:var(--ink);color:#fff}
.bsr-chip:disabled{opacity:.4;cursor:default}
.bsr-btn{border:1px solid #cdd6e4;background:#fff;border-radius:7px;padding:7px 14px;font:inherit;font-size:13px;font-weight:700;color:var(--ink);cursor:pointer}
.bsr-btn.prim{background:var(--ink);border-color:var(--ink);color:#fff}
.bsr-page{background:#fff;border:1px solid var(--line);border-radius:12px;padding:26px 30px 22px;max-width:1280px;margin:0 auto}
.bsr-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;border-bottom:3px solid var(--ink);padding-bottom:10px;margin-bottom:16px}
.bsr-head h1{font-family:'Barlow Condensed',Inter,sans-serif;font-size:38px;line-height:1;font-weight:700;color:var(--ink);margin:0 0 6px;letter-spacing:.01em}
.bsr-head p{margin:0;font-size:14px;color:var(--soft)}
.bsr-when{text-align:right;font-size:12.5px;color:var(--soft);line-height:1.45;white-space:nowrap}
.bsr-top{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:22px;align-items:center;margin-bottom:18px}
.bsr-map{width:100%;height:auto;display:block}
.bsr-lab text{font:700 11px Inter,system-ui,sans-serif;fill:#171f69}
.bsr-totals{display:flex;flex-direction:column;gap:14px}
.bsr-total{border-left:4px solid var(--ink);padding:2px 0 2px 14px}
.bsr-total b{display:block;font-family:'Barlow Condensed',Inter,sans-serif;font-size:42px;line-height:1;font-weight:700;color:var(--ink)}
.bsr-total span{font-size:13px;color:var(--soft);font-weight:600}
.bsr-key{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--soft);margin:0 0 10px}
.bsr-key i{width:11px;height:11px;border-radius:3px;display:inline-block;margin-left:10px}.bsr-key i:first-child{margin-left:0}
.bsr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
.bsr-card{border:1px solid var(--line);border-top:5px solid var(--c);border-radius:8px;padding:12px 14px 14px;break-inside:avoid;background:#fff}
.bsr-card header{display:flex;align-items:center;gap:9px;min-height:46px;margin-bottom:8px}
.bsr-card h3{font-family:'Barlow Condensed',Inter,sans-serif;font-size:22px;font-weight:700;color:var(--ink);margin:0;flex:1;line-height:1.05}
.bsr-badge{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 7px;border-radius:13px;border:2px solid var(--c);font-size:12.5px;font-weight:700;color:var(--ink);background:#fff;box-sizing:border-box}
.bsr-badge.sm{min-width:22px;height:22px;font-size:11.5px;margin-right:8px;padding:0 5px}
.bsr-mini{width:74px;height:46px;flex:none}
.bsr-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:12px 12px}
.bsr-stat b{font-family:'Barlow Condensed',Inter,sans-serif;font-size:32px;line-height:1;font-weight:700;color:var(--ink)}
.bsr-stat em{display:block;font-style:normal;font-size:11px;color:var(--soft);margin-top:4px}
.bsr-stat span{display:block;font-size:11.5px;font-weight:600;color:var(--soft);margin:2px 0 5px;line-height:1.2;min-height:28px}
.bsr-bar{display:block;height:6px;border-radius:3px;background:#eef1f6;overflow:hidden}
.bsr-bar>i{display:block;height:100%;border-radius:3px}
.bsr-stack{display:flex !important}.bsr-stack>i{display:block;height:100%}
.bsr-blk{border-top:1px solid var(--line);margin-top:12px;padding-top:9px}
.bsr-blk h4{font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--soft);margin:0 0 7px}
.bsr-blk h4 small{font-weight:600;text-transform:none;letter-spacing:0;margin-left:5px}
.bsr-r{display:grid;grid-template-columns:78px 1fr auto;gap:8px;align-items:center;font-size:12.5px;margin:4px 0}
.bsr-r span{color:#1c2540}.bsr-r b{font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums;min-width:34px;text-align:right}
.bsr-r b em{font-style:normal;font-weight:500;color:var(--soft)}
.bsr-na{font-size:12.5px;color:var(--soft);margin:0}
.bsr-clubs{font-size:12px;line-height:1.5;color:#1c2540;margin:0}
.bsr-t{width:100%;border-collapse:collapse;font-size:12.5px}
.bsr-t th{font-size:11px;font-weight:700;color:var(--soft);text-align:right;padding:2px 0 4px}
.bsr-t td{padding:3px 0;border-top:1px solid #f0f2f6;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:var(--ink)}
.bsr-t td:first-child{text-align:left;font-weight:500;color:#1c2540}
.bsr-tablewrap{overflow-x:auto}
.bsr-table{width:100%;border-collapse:collapse;font-size:14px}
.bsr-table th{font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--soft);text-align:left;padding:8px 10px;border-bottom:2px solid var(--ink);white-space:nowrap}
.bsr-table td{padding:9px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
.bsr-table .n{text-align:right;font-variant-numeric:tabular-nums}
.bsr-table td.n{font-weight:600;color:var(--ink)}
.bsr-table tr.tot td{font-weight:800;border-top:2px solid var(--ink);border-bottom:0;color:var(--ink)}
.bsr-totals.row{flex-direction:row;flex-wrap:wrap;gap:14px 44px;margin:4px 0 18px}
.bsr-grid.steps{grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}
.bsr-meets{font-size:12.5px;font-weight:600;color:var(--soft);white-space:nowrap}
.bsr-stats.two{grid-template-columns:repeat(auto-fill,minmax(104px,1fr))}
.bsr-stats.two .bsr-stat span,.bsr-stats.money .bsr-stat span{min-height:0}
.bsr-stats.money{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.bsr-rounds{font-size:12.5px;color:var(--soft);font-weight:600;margin:10px 0 0}
.bsr-route{display:flex;justify-content:space-between;gap:14px;font-size:13px;padding:5px 0;border-top:1px solid #f0f2f6}
.bsr-route:first-of-type{border-top:0}
.bsr-route span{color:#1c2540}.bsr-route b{color:var(--ink);font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.bsr-r.wide{grid-template-columns:minmax(90px,38%) 1fr auto}
.bsr-bar.tall{height:12px;border-radius:4px;margin-top:12px}.bsr-bar.tall>i{border-radius:0}
.bsr-split{margin:0 0 18px}.bsr-split .bsr-key{margin:8px 0 0}
.bsr-table tr.meet td{color:var(--soft);font-weight:500;padding-top:6px;padding-bottom:6px}.bsr-table tr.meet td:first-child{padding-left:26px}
.bsr-foot{font-size:11.5px;color:var(--soft);margin:18px 0 0;padding-top:10px;border-top:1px solid var(--line)}
@media (max-width:900px){.bsr-top{grid-template-columns:1fr}.bsr-totals{flex-direction:row;flex-wrap:wrap}}
@media print{
  @page bsr{size:letter;margin:.45in}
  .bsr{page:bsr}
  .bsr-strip{display:none !important}
  .atl-main.atl-report{background:#fff !important}
  .bsr{padding:0 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .bsr-page{border:0 !important;border-radius:0;padding:0 !important;max-width:none}
  .bsr-top{grid-template-columns:minmax(0,1fr) 180px}
  .bsr-grid{grid-template-columns:repeat(3,1fr);gap:10px}
  .bsr-card{padding:9px 10px 10px}
  .bsr-table{font-size:11px}.bsr-table td,.bsr-table th{padding:5px 6px}
}`;
function css(){
  if (document.getElementById('bsr-css')) return;
  const s = document.createElement('style'); s.id = 'bsr-css'; s.textContent = CSS; document.head.appendChild(s);
}
css();

window.BSReport = {html, wire, build, tableData};
})();
