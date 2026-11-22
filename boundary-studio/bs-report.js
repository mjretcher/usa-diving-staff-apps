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
const DEFAULTS = {level: 0, layout: 'grid', counts: ['comp', 'coaches', 'clubs'],
                  age: false, gender: false, boards: false, maps: true, clubNames: false, share: false};
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
  const q = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [T.head].concat(T.rows, [T.totals]).map(r => r.map(q).join(','));
  const name = `${B().tierName(D.L)}-${String(B().yearLabel()).slice(0, 4)}.csv`.replace(/[^\w.\-]+/g, '-');
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
function html(){
  const api = B();
  if (!api || !api.ready()) return '<div class="bsr"><p class="bsr-na">The map has not finished loading.</p></div>';
  const S = state(), levels = levelsWithAreas();
  if (!levels.includes(S.level)) S.level = levels[0];
  const D = build(S.level);
  const chip = (attr, key, on, label, dis) => `<button class="bsr-chip${on ? ' on' : ''}" ${attr}="${key}" aria-pressed="${on}"${dis ? ' disabled title="Counted for 2026 only"' : ''}>${esc(label)}</button>`;
  const seg = (attr, opts, cur) => `<div class="bsr-seg">${opts.map(([v, l]) => `<button ${attr}="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  const years = (api.availableYears ? api.availableYears() : [api.year()]);
  const strip = `<div class="bsr-strip">
    <div class="bsr-row">
      <span class="bsr-lbl">Show</span>${seg('data-bsr-level', levels.map(L => [L, api.tierName(L)]), S.level)}
      <span class="bsr-lbl">Season</span><select class="bsr-sel" id="bsrYear">${years.map(y => `<option value="${y}" ${y === api.year() ? 'selected' : ''}>${esc(api.yearLabel(y))}</option>`).join('')}</select>
      <span class="bsr-lbl">Layout</span>${seg('data-bsr-layout', [['grid', 'Grid'], ['table', 'Table']], S.layout)}
      <span class="bsr-grow"></span>
      <button class="bsr-btn" id="bsrCsv">Spreadsheet</button>
      <button class="bsr-btn prim" id="bsrPrint">Print or save as PDF</button>
    </div>
    <div class="bsr-row"><span class="bsr-lbl">Count</span>${COUNTS.map(C => chip('data-bsr-count', C.k, S.counts.includes(C.k) && !(C.only && !D.typed), (!D.typed && C.other) ? C.other : C.label, C.only && !D.typed)).join('')}</div>
    <div class="bsr-row"><span class="bsr-lbl">Break down by</span>${chip('data-bsr-flag', 'age', S.age, 'Age group')}${chip('data-bsr-flag', 'gender', S.gender, 'Gender')}${chip('data-bsr-flag', 'boards', S.boards, 'Board')}
      <span class="bsr-lbl gap">Also show</span>${chip('data-bsr-flag', 'maps', S.maps, 'Area maps')}${chip('data-bsr-flag', 'clubNames', S.clubNames, 'Club names')}${chip('data-bsr-flag', 'share', S.share, 'Share of total')}</div>
  </div>`;

  const shown = shownCounts(D, S), maxOf = {};
  shown.forEach(C => { maxOf[C.k] = Math.max(1, ...D.areas.map(A => D.value(A, C.k))); });
  const totals = shown.map(C => `<div class="bsr-total"><b>${fmt(D.total(C.k))}</b><span>${esc(D.label(C.k))}</span></div>`).join('');
  const genderKey = (S.gender && D.cath && (S.age || S.layout === 'grid'))
    ? `<span class="bsr-key"><i style="background:${GCOL.b}"></i>Boys<i style="background:${GCOL.g}"></i>Girls<i style="background:${GCOL.u}"></i>Not known</span>` : '';
  const when = new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
  const notes = ['Members are counted in the county of their home ZIP code.',
                 'A club is counted in every area where it has members.',
                 'Lighter counties on the map have no ' + ((api.countyLightBasis && api.countyLightBasis() === 'clubs') ? 'club' : 'members') + '.']
    .concat(D.typed ? [] : ['Counts by exact membership type are kept for 2026 only.']);
  return `<div class="bsr">${strip}
    <div class="bsr-page">
      <header class="bsr-head"><div><h1>${fmt(D.n)} ${esc(api.tierName(S.level))}</h1>
        <p>${esc(api.scenarioLabel ? api.scenarioLabel() : '')}${api.mapName && api.mapName() ? ' &middot; ' + esc(api.mapName()) : ''} &middot; ${esc(api.yearLabel())} membership</p></div>
        <div class="bsr-when">USA Diving<br>${esc(when)}</div></header>
      <div class="bsr-top"><div class="bsr-mapbox">${mapSvg(D)}</div><div class="bsr-totals">${totals}</div></div>
      ${genderKey}
      ${S.layout === 'table' ? tableHtml(D, S) : `<div class="bsr-grid">${D.areas.map(A => cardHtml(D, A, S, maxOf)).join('')}</div>`}
      <p class="bsr-foot">${notes.join(' ')}</p>
    </div></div>`;
}

function wire(root){
  css();
  const S = state();
  const again = () => { save(); root.innerHTML = html(); wire(root); };
  root.querySelectorAll('[data-bsr-level]').forEach(b => b.addEventListener('click', () => { S.level = +b.dataset.bsrLevel; again(); }));
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
  const cs = root.querySelector('#bsrCsv'); if (cs) cs.addEventListener('click', () => downloadCsv(build(S.level), S));
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
