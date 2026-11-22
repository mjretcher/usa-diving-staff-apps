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
                  routes: true, athletes: true, eachMeet: false, even: false, change: false, cmp26: false, cmp25: false,
                  area: null, choiceStage: 'Regionals', choiceYear: null, cAge: true, cGender: true, cAreas: true, cFlows: true};
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
const BOARDS = [{k:'1', label:'1 meter', s:'1m'}, {k:'3', label:'3 meter', s:'3m'}, {k:'P', label:'Platform', s:'Plat.'}];
const bth = b => `<th><span class="l">${b.label}</span><span class="s">${b.s || b.label}</span></th>`;   // short heading on paper
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
    m: 0, a: 0, c: 0, cl: new Set(), counties: 0, withMembers: 0, states: new Map(), ages: [0, 0, 0, 0, 0],
    solid: [], pale: [], cx: 0, cy: 0, pts: 0, lp: [],
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
    if (p) A.lp.push([+p[1], +p[2], /^(02|15)/.test(String(c.f).padStart(5, '0'))]);
  }
  // The number sits on the area's main body: Alaska and Hawaii are drawn in the
  // corner of the map, so counting them dragged a western area's number out
  // over a neighbour. The middle of the remaining counties is then moved onto
  // the nearest of the area's own counties, so it cannot land outside the area.
  areas.forEach(A => {
    const main = A.lp.filter(q => !q[2]), P = main.length ? main : A.lp;
    if (!P.length) return;
    const mx = sum(P.map(q => q[0])) / P.length, my = sum(P.map(q => q[1])) / P.length;
    let best = P[0], bd = Infinity;
    P.forEach(q => { const d = (q[0] - mx) ** 2 + (q[1] - my) ** 2; if (d < bd){ bd = d; best = q; } });
    A.cx = best[0]; A.cy = best[1]; A.pts = 1; A.lp = null;
  });
  const age = api.age() || {};
  const stOf = {}; geo.counties.forEach(c => { stOf[c.f] = c.st; });
  for (const [fips, st] of Object.entries(geo.stats)){
    const v = st[y]; if (!v) continue;
    const A = areaOf(fips); if (!A) continue;
    A.m += v.m; A.a += v.a; A.c += v.c;
    if (v.m > 0){ A.withMembers++; if (stOf[fips]) A.states.set(stOf[fips], (A.states.get(stOf[fips]) || 0) + v.m); }
    (v.cl || []).forEach(i => A.cl.add(i));
    const ag = age[fips] && age[fips][y];
    if (ag) for (let j = 0; j < 5; j++) A.ages[j] += (ag[j] || 0);
  }
  const typed = api.memberTypesAt ? api.memberTypesAt(L) : null;
  const cath  = api.compAthAt ? api.compAthAt(L) : null;
  let cells = null;
  try { cells = api.entryCellsAt ? api.entryCellsAt(L) : null; } catch(e){ cells = null; }
  if (cells && !cells.some(r => r && Object.keys(r).length)) cells = null;
  let base = null;
  try { base = api.baseAt ? api.baseAt(L) : null; } catch(e){ base = null; }
  const baseRow = A => { if (!base) return null;
    if (base.rows.length === n) return base.rows[A.gi];
    const i = base.names.indexOf(A.name); return i >= 0 ? base.rows[i] : null; };
  const was = (A, k) => { const b = baseRow(A); if (!b) return null;
    return k === 'comp' ? (typed ? b.t_comp : b.athletes) : k === 'coaches' ? b.coaches : k === 'clubs' ? b.clubs : k === 'members' ? b.members : null; };
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
  return {L, TG, n, areas, un, typed, cath, cells, value, total, label, base, was,
          clubName: i => { const c = clubNames[i]; return typeof c === 'string' ? c : (c && (c.n || c.name)) || ''; }};
}

/* ---------- map ---------- */
function mapSvg(D){
  const geo = B().geo();
  const one = (parts, color, op) => parts.length
    ? `<path d="${parts.join('')}" fill="${color}"${op} stroke="#fff" stroke-opacity="0.5" stroke-width="0.2"/>` : '';
  const body = D.areas.map(A => one(A.pale, A.color, ' fill-opacity="0.6"') + one(A.solid, A.color, '')).join('')
    + (D.un.length ? `<path d="${D.un.join('')}" fill="#e2e8f2" stroke="#fff" stroke-opacity="0.5" stroke-width="0.2"/>` : '');
  const labels = D.areas.map(A => {
    if (!A.pts) return '';
    const x = (A.cx / A.pts).toFixed(1), y = (A.cy / A.pts).toFixed(1), w = 11 + A.badge.length * 6.2;
    return `<g class="bsr-lab"><rect x="${(x - w / 2).toFixed(1)}" y="${(y - 10).toFixed(1)}" width="${w.toFixed(1)}" height="20" rx="10" fill="#fff" stroke="${A.color}" stroke-width="1.6"/>
      <text x="${x}" y="${(+y + 4.3).toFixed(1)}" text-anchor="middle">${esc(A.badge)}</text></g>`;
  }).join('');
  return `<svg class="bsr-map" viewBox="${esc(geo.viewBox || '0 0 975 610')}" role="img" aria-label="Map of ${esc(B().tierName(D.L))}">
    ${body}<path d="${geo.stateMesh}" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="0.6"/>
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
  if (S.age && S.gender){        // one row per age group, boys / girls in each cell, the way the age block reads
    const pair = (a, b) => `${fmt(cellSum(c, a, 'B', b))} / ${fmt(cellSum(c, a, 'G', b))}`;
    return `<div class="bsr-blk">${head.replace('</h4>', ' <small>boys / girls</small></h4>')}<table class="bsr-t"><thead><tr><th></th>${BOARDS.map(bth).join('')}</tr></thead><tbody>
      ${['D', 'C', 'B', 'A'].map(a => `<tr><td>Group ${a}</td>${BOARDS.map(b => `<td>${pair(a, b.k)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>`;
  }
  return `<div class="bsr-blk">${head}<table class="bsr-t"><thead><tr><th></th>${BOARDS.map(bth).join('')}</tr></thead><tbody>
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
    const d = Math.round(v - sum(D.areas.map(X => D.value(X, C.k))) / Math.max(1, D.n));
    const even = S.even ? `<em>${d === 0 ? 'Even' : fmt(Math.abs(d)) + (d > 0 ? ' over' : ' under') + ' an equal share'}</em>` : '';
    const w = (S.change && D.base) ? D.was(A, C.k) : null;
    const chg = w == null ? '' : `<em>${v === w ? 'No change' : (v > w ? '+' : '&minus;') + fmt(Math.abs(v - w)) + ' since the start'}</em>`;
    return `<div class="bsr-stat"><b>${fmt(v)}</b><span>${esc(D.label(C.k))}</span>${bar(v, maxOf[C.k], A.color)}${pct}${even}${chg}</div>`;
  }).join('');
  return `<article class="bsr-card go" style="--c:${A.color}" data-bsr-area="${A.gi}" tabindex="0" role="button" aria-label="Open ${esc(A.name)}">
    <header><span class="bsr-badge">${esc(A.badge)}</span><h3>${esc(A.name)}</h3>${S.maps ? miniSvg(A) : ''}</header>
    <div class="bsr-stats${shownCounts(D, S).length > 3 ? ' c4' : ''}">${stats}</div>
    ${S.age ? ageBlock(D, A, S) : (S.gender ? genderBlock(D, A) : '')}
    ${S.boards ? boardBlock(D, A, S) : ''}
    ${S.clubNames ? `<div class="bsr-incard">${clubBlock(D, A)}</div>` : ''}
  </article>`;
}

/* ---------- table layout (also the spreadsheet) ---------- */
function tableData(D, S){
  const cols = [];
  shownCounts(D, S).forEach(C => {
    cols.push({h: D.label(C.k), v: A => D.value(A, C.k), tot: () => D.total(C.k)});
    if (S.even) cols.push({h: 'Over or under an equal share', signed: true, tot: () => '',
      v: A => Math.round(D.value(A, C.k) - sum(D.areas.map(X => D.value(X, C.k))) / Math.max(1, D.n))});
    if (S.change && D.base && D.was(D.areas[0], C.k) != null) cols.push({h: 'Change since the start', signed: true, tot: () => '',
      v: A => { const w = D.was(A, C.k); return w == null ? '' : D.value(A, C.k) - w; }});
  });
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
  return {head: [B().tierName(D.L)].concat(cols.map(c => c.h)), rows, totals, signed: [false].concat(cols.map(c => !!c.signed))};
}
function tableHtml(D, S){
  const T = tableData(D, S);
  return `<div class="bsr-tablewrap"><table class="bsr-table"><thead><tr>${T.head.map((h, i) => `<th${i ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${T.rows.map((r, ri) => `<tr>${r.map((v, i) => i ? `<td class="n">${v === '' ? '' : (T.signed[i] ? (v > 0 ? '+' : v < 0 ? '&minus;' : '') + fmt(Math.abs(v)) : fmt(v))}</td>`
      : `<td><span class="bsr-badge sm" style="--c:${D.areas[ri].color}">${esc(D.areas[ri].badge)}</span>${esc(v)}</td>`).join('')}</tr>`).join('')}
    <tr class="tot">${T.totals.map((v, i) => i ? `<td class="n">${v === '' ? '' : fmt(v)}</td>` : `<td>${esc(v)}</td>`).join('')}</tr></tbody></table></div>`;
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
const one = name => String(name || '').toLowerCase().replace(/s$/, '');      // "Regions" -> "region"
const usd = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
const chip = (attr, key, on, label, dis) => `<button class="bsr-chip${on ? ' on' : ''}" ${attr}="${key}" aria-pressed="${on}"${dis ? ' disabled title="Counted for 2026 only"' : ''}>${esc(label)}</button>`;
const seg = (attr, opts, cur) => `<div class="bsr-seg">${opts.map(([v, l]) => `<button ${attr}="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;

/* The switches. The first row is the same on every page; the rest follow the page. */
function stripHtml(S, levels, typed, hasBase){
  const api = B();
  const years = (api.availableYears ? api.availableYears() : [api.year()]);
  const cur = S.page === 'areas' ? 'L' + S.level : S.page;
  const pages = levels.map(L => ['L' + L, api.tierName(L)]).concat([['structure', 'Structure'], ['money', 'Money'], ['choice', 'Region choice']]);
  const flag = (k, label) => chip('data-bsr-flag', k, !!S[k], label);
  let rows = '';
  if (S.page === 'areas') rows = `
    <div class="bsr-row"><span class="bsr-lbl">Count</span>${COUNTS.map(C => chip('data-bsr-count', C.k, S.counts.includes(C.k) && !(C.only && !typed), (!typed && C.other) ? C.other : C.label, C.only && !typed)).join('')}</div>
    <div class="bsr-row"><span class="bsr-lbl">Break down by</span>${flag('age', 'Age group')}${flag('gender', 'Gender')}${flag('boards', 'Board')}
      <span class="bsr-lbl gap">Also show</span>${flag('maps', 'Area maps')}${flag('clubNames', 'Club names')}${flag('share', 'Share of total')}${flag('even', 'Over or under an equal share')}${hasBase ? flag('change', 'Change since the start') : ''}</div>`;
  else if (S.page === 'structure') rows = `
    <div class="bsr-row"><span class="bsr-lbl">Break down by</span>${flag('age', 'Age group')}${flag('gender', 'Gender')}${flag('boards', 'Board')}
      <span class="bsr-lbl gap">Also show</span>${flag('routes', 'Who advances')}${flag('athletes', 'Athletes')}${flag('eachMeet', 'Each meet')}
      <span class="bsr-lbl gap">Compare with</span>${flag('cmp26', '2026 season')}${flag('cmp25', '2025 season')}</div>`;
  else if (S.page === 'choice') rows = `
    <div class="bsr-row"><span class="bsr-lbl">Meets</span>${seg('data-bsr-cstage', [['Regionals', 'Regionals'], ['Zones', 'Zones']], S.choiceStage)}
      ${choiceYears(S).length ? `<span class="bsr-lbl gap">Season</span>${seg('data-bsr-cyear', choiceYears(S).map(y => [y, y]), choiceYear(S))}` : ''}
      <span class="bsr-lbl gap">Show</span>${flag('cAge', 'Age group')}${flag('cGender', 'Gender')}${flag('cAreas', 'Each region')}${flag('cFlows', 'Where they went and came from')}</div>`;
  else rows = `
    <div class="bsr-row"><span class="bsr-lbl">Also show</span>${flag('eachMeet', 'Each meet')}${flag('share', 'Share of total')}
      <span class="bsr-lbl gap">Compare with</span>${flag('cmp26', '2026 season')}${flag('cmp25', '2025 season')}</div>`;
  if (S.page === 'areas' && S.area) rows = `
    <div class="bsr-row"><button class="bsr-btn" id="bsrBack">&larr; All ${esc(api.tierName(S.level).toLowerCase())}</button>
      <button class="bsr-btn" id="bsrPacket">Print every ${esc(one(api.tierName(S.level)))}</button></div>`;
  return `<div class="bsr-strip">
    <div class="bsr-row">
      <span class="bsr-lbl">Show</span>${seg('data-bsr-page', pages, cur)}
      ${S.page === 'choice' ? '' : `<span class="bsr-lbl">Season</span><select class="bsr-sel" id="bsrYear">${years.map(y => `<option value="${y}" ${y === api.year() ? 'selected' : ''}>${esc(api.yearLabel(y))}</option>`).join('')}</select>`}
      <span class="bsr-lbl">Layout</span>${seg('data-bsr-layout', [['grid', 'Grid'], ['table', 'Table']], S.layout)}
      <span class="bsr-grow"></span>
      <button class="bsr-btn" id="bsrFile" title="One file with this page only, to send or post. It opens in any browser and holds nothing else.">Save as a file</button>
      <button class="bsr-btn" id="bsrCsv">Spreadsheet</button>
      <button class="bsr-btn prim" id="bsrPrint">Print or PDF</button>
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
  if (!['areas', 'structure', 'money', 'choice'].includes(S.page)) S.page = 'areas';
  if (!levels.includes(S.level)) S.level = levels[0];
  if (S.page === 'choice') return choicePage(S, levels);
  if (S.page !== 'areas') return pathwayPage(S, levels);
  const D = build(S.level);
  if (S.area && (S.area.L !== S.level || !D.areas[S.area.gi])) S.area = null;
  if (S.area){
    const list = PACKET ? D.areas : [D.areas[S.area.gi]], meets = meetsNow();
    return `<div class="bsr">${stripHtml(S, levels, D.typed)}${list.map(A => areaPage(D, A, meets)).join('')}</div>`;
  }
  const shown = shownCounts(D, S), maxOf = {};
  shown.forEach(C => { maxOf[C.k] = Math.max(1, ...D.areas.map(A => D.value(A, C.k))); });
  const totals = shown.map(C => `<div class="bsr-total"><b>${fmt(D.total(C.k))}</b><span>${esc(D.label(C.k))}</span></div>`).join('');
  const genderKey = (S.gender && D.cath && (S.age || S.layout === 'grid'))
    ? `<span class="bsr-key"><i style="background:${GCOL.b}"></i>Boys<i style="background:${GCOL.g}"></i>Girls<i style="background:${GCOL.u}"></i>Not known</span>` : '';
  const notes = ['Members are counted in the county of their home ZIP code.',
                 'A club is counted in every area where it has members.',
                 'Lighter counties on the map have no ' + ((api.countyLightBasis && api.countyLightBasis() === 'clubs') ? 'club' : 'members') + '.']
    .concat(D.typed ? [] : ['Counts by exact membership type are kept for 2026 only.']);
  // On paper the club lists come out of the cards and run full width after them.
  const clubSec = (S.clubNames && S.layout !== 'table') ? `<section class="bsr-clubsec"><h2 class="bsr-h2">Clubs with members in each ${esc(one(api.tierName(S.level)))}</h2>${D.areas.map(A => {
      const names = [...A.cl].map(D.clubName).filter(Boolean).sort((a, b) => a.localeCompare(b));
      return `<div class="bsr-clubrow"><b><span class="bsr-badge sm" style="--c:${A.color}">${esc(A.badge)}</span>${esc(A.name)}</b><p>${names.map(esc).join(' &middot; ') || 'None'}</p></div>`; }).join('')}</section>` : '';
  const dense = S.layout !== 'table' && (S.age || S.gender || S.boards);
  return `<div class="bsr">${stripHtml(S, levels, D.typed, !!D.base)}
    <div class="bsr-page${dense ? ' dense' : ''}"><div class="bsr-main">
      <div class="bsr-lead">
      ${headHtml(`${fmt(D.n)} ${esc(api.tierName(S.level))}`, 'Membership')}
      <div class="bsr-top${shown.length > 4 ? ' many' : ''}"><div class="bsr-mapbox">${mapSvg(D)}</div><div class="bsr-totals">${totals}</div></div>
      </div>
      <div class="bsr-cards">
      ${genderKey}
      ${S.layout === 'table' ? tableHtml(D, S) : `<div class="bsr-grid" style="--pc:${D.n <= 6 ? 3 : 4}">${D.areas.map(A => cardHtml(D, A, S, maxOf)).join('')}</div>`}
      <p class="bsr-foot">${notes.join(' ')}</p>
      </div>
      </div>${clubSec}
    </div></div>`;
}

/* ---------- one region or zone ---------- */
let PACKET = false;
function meetsNow(){ try { const P = pathwayData(); return P ? P.meets : null; } catch(e){ return null; } }
function areaPage(D, A, meets){
  const api = B(), S = Object.assign({}, state(), {gender: true, age: true, boards: true});
  const counts = COUNTS.filter(C => !(C.only && !D.typed));
  const totals = counts.map(C => `<div class="bsr-total"><b>${fmt(D.value(A, C.k))}</b><span>${esc(D.label(C.k))}</span></div>`).join('');
  const states = [...A.states.entries()].sort((a, b) => b[1] - a[1]);
  const smax = Math.max(1, ...states.map(s => s[1]));
  const inside = D.L > 0 ? (() => { const below = api.tierGroupsAt(D.L - 1), up = api.tierGroupsAt(D.L);
      // an area of the level below belongs here when its regions do
      const names = below.groups.map((g, gi) => ({g, gi})).filter(x => { const ri = below.of.indexOf(x.gi); return ri >= 0 && up.of[ri] === A.gi; }).map(x => x.g.name);
      return names.length ? `<div class="bsr-blk"><h4>${esc(api.tierName(D.L - 1))} in ${esc(A.name)}</h4><p class="bsr-clubs">${names.map(esc).join(' &middot; ')}</p></div>` : ''; })() : '';
  let meet = '';
  try { const m = meets && meets.find(x => x.level === D.L && x.gi === A.gi);
    if (m) meet = `<div class="bsr-blk"><h4>Its meet</h4><div class="bsr-route"><span>Event entries, projected</span><b>${fmt(m.entries)}</b></div></div>`; } catch(e){}
  return `<div class="bsr-page area">
    ${headHtml(`<span class="bsr-badge big" style="--c:${A.color}">${esc(A.badge)}</span>${esc(A.name)}`, 'Membership')}
    <div class="bsr-top"><div class="bsr-mapbox">${miniSvg(A).replace('class="bsr-mini"', 'class="bsr-mini big"')}</div><div class="bsr-totals">${totals}</div></div>
    <span class="bsr-key"><i style="background:${GCOL.b}"></i>Boys<i style="background:${GCOL.g}"></i>Girls<i style="background:${GCOL.u}"></i>Not known</span>
    <div class="bsr-cols" style="--c:${A.color}">
      <div>${ageBlock(D, A, S)}${meet}${inside}</div>
      <div>${boardBlock(D, A, S)}
        <div class="bsr-blk"><h4>Members by state</h4>${states.map(([st, n]) => `<div class="bsr-r"><span>${esc(st)}</span>${bar(n, smax, A.color)}<b>${fmt(n)}</b></div>`).join('') || '<p class="bsr-na">None</p>'}
          <p class="bsr-na" style="margin-top:8px">${fmt(A.counties)} counties, ${fmt(A.withMembers)} with members.</p></div></div>
    </div>
    <div class="bsr-wide" style="--c:${A.color}">${clubBlock(D, A)}</div>
    <p class="bsr-foot">Members are counted in the county of their home ZIP code. A club is listed in every area where it has members.${D.typed ? '' : ' Counts by exact membership type are kept for 2026 only.'}</p>
  </div>`;
}

/* ---------- the 2026 and 2025 seasons as they were run ----------
   Entries and athletes are counted from results (individual events), with the
   same query the comparison reports use. Money is what finance reconciled:
   the 22 DiveMeets recaps for 2026 and the 2025 entry-fee workbook. */
const STAGES = [
  {k: 'Regionals', label: 'Regionals', recap: 'Regionals', per: 'Regional'},
  {k: 'Zones', label: 'Zones', recap: 'Zones', per: 'Zone'},
  {k: 'EWC', label: 'East / West / Central', recap: 'E / W / C', per: 'E/W/C'},
  {k: 'Nationals', label: 'Junior Nationals', recap: 'Nationals', per: 'National'}];
let ACT = null, ACT_BUSY = false, ACT_ERR = null;
async function loadActuals(){
  const get = f => fetch('../membership-analytics/' + f, {cache: 'no-cache'}).then(x => x.ok ? x.json() : null).catch(() => null);
  const J = window.__JCReport;
  const count = y => (J && J.actualBySeason) ? J.actualBySeason(y).catch(e => { console.error('season counts', y, e); return null; }) : Promise.resolve(null);
  const [r26, r25, a26, a25] = await Promise.all([get('recaps-2026.json'), get('recaps-2025.json'), count(2026), count(2025)]);
  const season = (rec, act, y) => {
    const out = {};
    STAGES.forEach(s => {
      const b = rec && rec.byStage && rec.byStage[s.recap], a = act && act[s.k];
      const meets = rec && rec.perMeet ? rec.perMeet.filter(m => m.stage === s.per).length : 0;
      if (!b && !a && !meets) return;
      const gross = b ? (b.recapGross != null ? b.recapGross : b.gross) : null;
      const net = b ? (b.recapNet != null ? b.recapNet : b.net) : null;
      const host = b ? (y === 2026 ? b.recapHost : b.host) : null;
      const usad = b ? (y === 2026 ? (host != null && net != null ? net - host : null) : b.usadShare) : null;
      out[s.k] = {meets, entries: a ? a.individual : null, athletes: a ? a.athletes : null, gross, net, host, usad};
    });
    return out;
  };
  return {2026: season(r26, a26, 2026), 2025: season(r25, a25, 2025), counted: !!(a26 && a25)};
}
function needActuals(S, redraw){
  if (!(S.cmp26 || S.cmp25) || ACT || ACT_BUSY || ACT_ERR) return;
  ACT_BUSY = true;
  loadActuals().then(a => { ACT = a; }).catch(e => { ACT_ERR = String(e && e.message || e); console.error('seasons', e); })
    .then(() => { ACT_BUSY = false; if (redraw) redraw(); });
}
function compareHtml(P, S){
  if (!(S.cmp26 || S.cmp25)) return '';
  const money = S.page === 'money';
  const title = `<h2 class="bsr-h2">Against the ${[S.cmp26 ? '2026' : '', S.cmp25 ? '2025' : ''].filter(Boolean).join(' and ')} season${S.cmp26 && S.cmp25 ? 's' : ''}</h2>`;
  if (ACT_ERR) return `${title}<p class="bsr-na">The earlier seasons could not be loaded.</p>`;
  if (!ACT) return `${title}<p class="bsr-na">Loading the earlier seasons.</p>`;
  const mine = {};
  P.levels.forEach(l => { const m = mine[l.stage] || (mine[l.stage] = {meets: 0, entries: 0, athletes: null, gross: 0, host: 0, usad: 0});
    m.meets += l.stops; m.entries += l.entries; m.gross += l.gross; m.host += l.host; m.usad += l.usad;
    if (l.divers) m.athletes = (m.athletes || 0) + Math.round(l.divers.n); });
  const cols = [{k: 'now', label: 'This structure', color: '#171f69', d: mine, est: true}]
    .concat(S.cmp26 ? [{k: '26', label: '2026 season', color: '#009AC7', d: ACT[2026]}] : [])
    .concat(S.cmp25 ? [{k: '25', label: '2025 season', color: '#8FC3EA', d: ACT[2025]}] : []);
  const val = x => x ? (money ? (x.usad != null ? x.usad : x.net) : x.entries) : null;
  const totalOf = c => { const t = {meets: 0, entries: 0, athletes: null, gross: 0, host: 0, usad: 0, net: null, part: false};
    STAGES.forEach(s => { const x = c.d[s.k]; if (!x) return;
      t.meets += x.meets || 0; t.entries += x.entries || 0; t.gross += x.gross || 0; t.host += x.host || 0;
      if (x.usad != null) t.usad += x.usad; else if (x.net != null){ t.usad += x.net; t.part = true; } });
    return t; };
  const rows = STAGES.filter(s => cols.some(c => c.d[s.k])).map(s => ({label: s.label, of: c => c.d[s.k] || null}))
    .concat([{label: 'Whole season', of: c => totalOf(c), total: true}]);
  const max = r => Math.max(1, ...cols.map(c => val(r.of(c)) || 0));
  const sub = (x, c, r) => {
    if (!x) return 'Not held';
    if (money) return [x.gross != null ? `Entry income ${usd(x.gross)}` : '', x.host ? `to hosts ${usd(x.host)}` : '',
                       ((x.usad == null && x.net != null) || x.part) ? 'before the Junior Nationals host payment' : ''].filter(Boolean).join(' &middot; ');
    return [x.meets ? `${fmt(x.meets)} ${x.meets === 1 ? 'meet' : 'meets'}` : '',
            (!r.total && x.athletes != null) ? `${fmt(x.athletes)} athletes${c.est ? ', estimated' : ''}` : ''].filter(Boolean).join(' &middot; ');
  };
  const cards = rows.map(r => `<article class="bsr-card bsr-step${r.total ? ' tot' : ''}" style="--c:#171f69"><header><h3>${r.label}</h3><span class="bsr-meets">${money ? 'USA Diving keeps' : 'Event entries'}</span></header>
    ${cols.map(c => { const x = r.of(c), v = val(x);
      return `<div class="bsr-cmp"><div class="bsr-r wide"><span>${c.label}</span>${bar(v || 0, max(r), c.color)}<b>${v == null ? '&ndash;' : (money ? usd(v) : fmt(v))}</b></div><small>${sub(x, c, r)}</small></div>`; }).join('')}
  </article>`).join('');
  const note = money
    ? 'The 2026 and 2025 figures are the totals finance reconciled for every entry billed at those meets; 2026 includes late fees. This structure is projected individual event entries at the entry fee.'
    : 'The 2026 and 2025 figures are counted from results, individual events only.' + (ACT.counted ? '' : ' Entry and athlete counts for the earlier seasons could not be loaded.');
  return `${title}<div class="bsr-grid steps">${cards}</div><p class="bsr-na" style="margin-top:10px">${note}</p>`;
}

/* ---------- Region choice ----------
   How many athletes competed somewhere other than their club's home region,
   from membership-analytics/region-choice.json (db/scripts/measure_region_choice.py).
   A club's home is the region where most of its athletes competed that season.
   The regions are the ones the season was run on, not the map on screen. */
let RC = null, RC_BUSY = false, RC_ERR = null;
function needChoice(redraw){
  if (RC || RC_BUSY || RC_ERR) return;
  RC_BUSY = true;
  fetch('../membership-analytics/region-choice.json', {cache: 'no-cache'}).then(x => { if (!x.ok) throw new Error('not found'); return x.json(); })
    .then(j => { RC = j; }).catch(e => { RC_ERR = String(e && e.message || e); })
    .then(() => { RC_BUSY = false; if (redraw) redraw(); });
}
const pct1 = (a, b) => b > 0 ? (100 * a / b).toFixed(1) + '%' : '0%';
/* This page is a record of seasons already run: each season's results on the
   regions and zones that season used. It has its own season switch and does
   not follow the app's season or the proposal on the map. */
function choiceYears(S){
  const st = RC && RC.stages && RC.stages[S.choiceStage] || {};
  return Object.keys(st).filter(y => st[y] && !st[y].error).sort();
}
function choiceYear(S){
  const ys = choiceYears(S);
  return ys.includes(String(S.choiceYear)) ? String(S.choiceYear) : (ys[ys.length - 1] || '');
}
function choiceHead(S, year){
  const when = new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
  return `<header class="bsr-head"><div><h1>Region choice</h1>
    <p>${year ? esc(year) + ' ' : ''}${esc(S.choiceStage)}${year ? ` &middot; what happened, on the ${esc(year)} circuit` : ''}</p></div>
    <div class="bsr-when">USA Diving<br>${esc(when)}</div></header>`;
}
function choiceData(S){
  if (!RC || !RC.stages) return null;
  const year = choiceYear(S), st = RC.stages[S.choiceStage] || {};
  const p = st[year];
  if (!p || p.error) return {year, missing: true};
  const word = S.choiceStage === 'Zones' ? 'Zone' : 'Region';
  const areas = Object.entries(p.by_area || {}).map(([k, v]) => ({k, name: `${word} ${k}`, athletes: v.athletes, left: v.left, arrived: v.arrived,
    to: (p.flows || []).filter(f => f.home === k).map(f => ({name: `${word} ${f.went}`, n: f.athletes})),
    from: (p.flows || []).filter(f => f.went === k).map(f => ({name: `${word} ${f.home}`, n: f.athletes}))}));
  const seasons = choiceYears(S).map(y => ({y, athletes: st[y].athletes, away: st[y].competing_away, clubs: st[y].clubs, split: st[y].clubs_split}));
  return {year, p, areas, seasons, word};
}
/* Every movement as a grid: one row per home region, one column per region
   competed at. Read across for where a region's athletes went, down for where
   a region's arrivals came from. */
function choiceMatrix(C){
  const ks = C.areas.map(a => a.k), n = {};
  (C.p.flows || []).forEach(f => { n[f.home + '>' + f.went] = f.athletes; });
  return {head: [`Home ${C.word.toLowerCase()}`].concat(ks.map(k => `At ${k}`), ['Competed elsewhere']),
          rows: C.areas.map(a => [a.name].concat(ks.map(k => k === a.k ? null : (n[a.k + '>' + k] || 0)), [a.left])),
          totals: ['Came in from elsewhere'].concat(C.areas.map(a => a.arrived), [C.p.competing_away])};
}
function choiceTable(C){
  return {head: [C.word, 'Athletes from clubs based there', 'Competed elsewhere', 'Share', 'Came in from elsewhere'],
          rows: C.areas.map(a => [a.name, a.athletes, a.left, pct1(a.left, a.athletes), a.arrived]),
          totals: ['Total', C.p.athletes, C.p.competing_away, pct1(C.p.competing_away, C.p.athletes), C.p.competing_away]};
}
function choicePage(S, levels){
  const strip = stripHtml(S, levels, true);
  const title = 'Region choice';
  if (RC_ERR) return `<div class="bsr">${strip}<div class="bsr-page">${choiceHead(S)}<p class="bsr-na">The region choice figures could not be loaded.</p></div></div>`;
  const C = choiceData(S);
  if (!C) return `<div class="bsr">${strip}<div class="bsr-page">${choiceHead(S)}<p class="bsr-na">Loading.</p></div></div>`;
  if (C.missing) return `<div class="bsr">${strip}<div class="bsr-page">${choiceHead(S)}<p class="bsr-na">No ${esc(S.choiceStage)} results to measure.</p></div></div>`;
  const p = C.p, ink = '#171f69';
  const totals = `<div class="bsr-total"><b>${fmt(p.competing_away)}</b><span>Athletes who competed away from their club's home ${C.word.toLowerCase()}</span></div>
    <div class="bsr-total"><b>${pct1(p.competing_away, p.athletes)}</b><span>Of ${fmt(p.athletes)} athletes at ${esc(S.choiceStage)}</span></div>
    <div class="bsr-total"><b>${fmt(p.clubs_split)}</b><span>Of ${fmt(p.clubs)} clubs had athletes at more than one ${C.word.toLowerCase()}</span></div>`;
  const rateRows = (rows, max) => rows.map(([l, away, n]) =>
    `<div class="bsr-r rate"><span>${esc(l)}</span>${bar(n > 0 ? away / n : 0, max, ink)}<b>${pct1(away, n)}</b><small>${fmt(away)} of ${fmt(n)}</small></div>`).join('');
  const card = (h, rows) => { const max = Math.max(0.0001, ...rows.map(x => x[2] > 0 ? x[1] / x[2] : 0));
    return `<article class="bsr-card bsr-step tight" style="--c:${ink}"><header><h3>${h}</h3><span class="bsr-meets">Competed away</span></header>${rateRows(rows, max)}</article>`; };
  const AGEL = {A: 'Group A, 16 to 18', B: 'Group B, 14 to 15', C: 'Group C, 12 to 13', D: 'Group D, 11 & under'};
  const cards = [card('Season by season', C.seasons.map(s => [s.y, s.away, s.athletes]))]
    .concat(S.cAge && p.by_age ? [card('By age group', Object.keys(p.by_age).map(k => [AGEL[k] || k, p.by_age[k].away, p.by_age[k].athletes]))] : [])
    .concat(S.cGender && p.by_gender ? [card('By gender', Object.keys(p.by_gender).map(k => [k, p.by_gender[k].away, p.by_gender[k].athletes]))] : []);
  let areas = '';
  if (S.cAreas && C.areas.length){
    if (S.layout === 'table'){
      const T = choiceTable(C);
      areas = `<h2 class="bsr-h2">Each ${C.word.toLowerCase()}</h2><div class="bsr-tablewrap"><table class="bsr-table"><thead><tr>${T.head.map((h, i) => `<th${i ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${T.rows.map(r => `<tr>${r.map((v, i) => i ? `<td class="n">${typeof v === 'number' ? fmt(v) : esc(v)}</td>` : `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}
        <tr class="tot">${T.totals.map((v, i) => i ? `<td class="n">${typeof v === 'number' ? fmt(v) : esc(v)}</td>` : `<td>${esc(v)}</td>`).join('')}</tr></tbody></table></div>`;
      if (S.cFlows){
        const M = choiceMatrix(C), cell = v => v == null ? '<td class="n off"></td>' : `<td class="n${v ? '' : ' zero'}">${v ? fmt(v) : '0'}</td>`;
        areas += `<h2 class="bsr-h2">Where they went and where they came from</h2><div class="bsr-tablewrap"><table class="bsr-table bsr-od"><thead><tr>${M.head.map((h, i) => `<th${i ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${M.rows.map(r => `<tr><td>${esc(r[0])}</td>${r.slice(1, -1).map(cell).join('')}<td class="n sum">${fmt(r[r.length - 1])}</td></tr>`).join('')}
          <tr class="tot"><td>${esc(M.totals[0])}</td>${M.totals.slice(1).map(v => `<td class="n">${fmt(v)}</td>`).join('')}</tr></tbody></table></div>
          <p class="bsr-na" style="margin-top:8px">Read across for where a ${C.word.toLowerCase()}'s athletes competed, and down for where its arrivals came from.</p>`;
      }
    } else {
      const list = (rows, word) => rows.map(t => `<div class="bsr-route"><span>${word} ${esc(t.name)}</span><b>${fmt(t.n)}</b></div>`).join('');
      const side = (cls, n, label, rows, word) => `<div class="bsr-move ${cls}"><div class="bsr-moven"><b>${fmt(n)}</b><span>${label}</span></div>${S.cFlows ? list(rows, word) : ''}</div>`;
      areas = `<h2 class="bsr-h2">Each ${C.word.toLowerCase()}</h2><div class="bsr-grid moves">${C.areas.map(a => `<article class="bsr-card tight" style="--c:${ink}">
        <header><h3>${esc(a.name)}</h3><span class="bsr-meets">${fmt(a.athletes)} athletes</span></header>
        <div class="bsr-moves">${side('out', a.left, 'Went out', a.to, 'to')}${side('in', a.arrived, 'Came in', a.from, 'from')}</div>
      </article>`).join('')}</div>`;
    }
  }
  const notes = [`A club's home ${C.word.toLowerCase()} is the one where most of its athletes competed that season. An athlete competed away when they entered a different one.`,
                 `These are the ${C.word.toLowerCase()}s the ${C.year} season was run on, not the proposal on the map.`,
                 `Each athlete is counted under their club\u2019s home ${C.word.toLowerCase()}.`];
  return `<div class="bsr">${strip}<div class="bsr-page">${choiceHead(S, C.year)}
    <div class="bsr-totals row">${totals}</div>
    <div class="bsr-grid steps">${cards.join('')}</div>${areas}
    <p class="bsr-foot">${notes.join(' ')}</p></div></div>`;
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
  return `<div class="bsr-blk"><h4>Event entries by board</h4><table class="bsr-t"><thead><tr><th></th>${bd.cols.map(bth).join('')}</tr></thead>
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
      ${S.layout === 'table' ? pathwayTableHtml(pathwayTable(P, S)) : `<div class="bsr-grid steps">${P.levels.map(l => moneyCard(P, l, S)).join('')}</div>`}
      ${compareHtml(P, S)}`;
    notes = ['Entry fees only. Membership dues are not included.', 'Event entries are projected for this structure. An entry is one athlete in one event.'];
  } else {
    const last = P.levels[P.levels.length - 1];
    totals = `<div class="bsr-total"><b>${fmt(last.entries)}</b><span>Event entries at ${esc(last.name)}</span></div>`
      + (S.athletes && last.divers ? `<div class="bsr-total"><b>${fmt(Math.round(last.divers.n))}</b><span>Athletes at ${esc(last.name)}, estimated</span></div>` : '')
      + `<div class="bsr-total"><b>${fmt(P.total.meets)}</b><span>Meets in the season</span></div>`;
    body = `<div class="bsr-totals row">${totals}</div>
      ${S.layout === 'table' ? pathwayTableHtml(pathwayTable(P, S)) : `<div class="bsr-grid steps">${P.levels.map(l => structureCard(P, l, S)).join('')}</div>`}
      ${compareHtml(P, S)}`;
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
    S.area = null;
    again();
  }));
  root.querySelectorAll('[data-bsr-layout]').forEach(b => b.addEventListener('click', () => { S.layout = b.dataset.bsrLayout; again(); }));
  root.querySelectorAll('[data-bsr-count]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.bsrCount, i = S.counts.indexOf(k);
    if (i >= 0) S.counts.splice(i, 1); else S.counts.push(k);
    again();
  }));
  root.querySelectorAll('[data-bsr-flag]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.bsrFlag; S[k] = !S[k]; again(); }));
  root.querySelectorAll('[data-bsr-area]').forEach(c => {
    const open = () => { S.area = {L: S.level, gi: +c.dataset.bsrArea}; again(); window.scrollTo(0, 0); };
    c.addEventListener('click', open);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); } });
  });
  const bk = root.querySelector('#bsrBack'); if (bk) bk.addEventListener('click', () => { S.area = null; again(); });
  const pk = root.querySelector('#bsrPacket'); if (pk) pk.addEventListener('click', () => {
    PACKET = true; root.innerHTML = html(); wire(root);
    setTimeout(() => { window.print(); PACKET = false; root.innerHTML = html(); wire(root); }, 150);
  });
  root.querySelectorAll('[data-bsr-cstage]').forEach(b => b.addEventListener('click', () => { S.choiceStage = b.dataset.bsrCstage; again(); }));
  root.querySelectorAll('[data-bsr-cyear]').forEach(b => b.addEventListener('click', () => { S.choiceYear = b.dataset.bsrCyear; again(); }));
  if (S.page === 'choice') needChoice(() => { if (!B().onReports || B().onReports()){ root.innerHTML = html(); wire(root); } });
  const fl = root.querySelector('#bsrFile'); if (fl) fl.addEventListener('click', () => saveFile(root));
  if (S.page === 'structure' || S.page === 'money') needActuals(S, () => { if (!B().onReports || B().onReports()){ root.innerHTML = html(); wire(root); } });
  const yr = root.querySelector('#bsrYear');
  if (yr) yr.addEventListener('change', () => { if (B().setYear) B().setYear(yr.value); });
  const pr = root.querySelector('#bsrPrint'); if (pr) pr.addEventListener('click', () => window.print());
  const cs = root.querySelector('#bsrCsv'); if (cs) cs.addEventListener('click', () => {
    if (S.page === 'areas'){ downloadCsv(build(S.level), S); return; }
    if (S.page === 'choice'){ const C = choiceData(S); if (!C || C.missing) return; const T = choiceTable(C);
      const moves = (C.p.flows || []).map(f => [`${C.word} ${f.home}`, `${C.word} ${f.went}`, f.athletes]);
      saveCsv([T.head].concat(T.rows, [T.totals], moves.length ? [[], [`Home ${C.word.toLowerCase()}`, 'Competed at', 'Athletes']].concat(moves) : []), `region-choice-${S.choiceStage}-${C.year}.csv`); return; }
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

/* One file holding this page and nothing else: no scripts, no data files, no
   link back to the site. What is on screen is what is in the file. */
function saveFile(root){
  const pages = [...root.querySelectorAll('.bsr-page')].map(p => p.outerHTML).join('');
  if (!pages) return;
  const h1 = root.querySelector('.bsr-head h1'), hc = h1 ? h1.cloneNode(true) : null;
  if (hc) hc.querySelectorAll('.bsr-badge').forEach(b => b.remove());
  const title = (hc ? hc.textContent.trim() : 'Report') + ' - USA Diving';
  const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>body{margin:0;background:#f4f6fa}.bsr-card.go{cursor:default}${CSS}${PAGE_CSS}@media print{body{background:#fff}${paperCss('')}}</style></head><body><div class="bsr">${pages}</div></body></html>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([doc], {type: 'text/html'}));
  a.download = title.replace(/[^\w.\-]+/g, '-') + '.html'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
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
.bsr-card.tight{padding:10px 14px 12px}.bsr-card.tight header{min-height:0;margin-bottom:6px}
.bsr-r.rate{grid-template-columns:minmax(96px,36%) 1fr 46px 92px;margin:5px 0;font-size:13px}
.bsr-r.rate small{font-size:12px;color:var(--soft);text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.bsr-grid.moves{grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;align-items:start}
.bsr-moves{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
.bsr-move{border-top:3px solid var(--m);padding-top:6px;min-width:0}
.bsr-move.out{--m:#E31937}.bsr-move.in{--m:#009AC7}
.bsr-moven{display:flex;align-items:baseline;gap:7px;margin-bottom:3px}
.bsr-moven b{font-family:'Barlow Condensed',Inter,sans-serif;font-size:28px;line-height:1;font-weight:700;color:var(--ink)}
.bsr-moven span{font-size:12px;font-weight:600;color:var(--soft);line-height:1.15}
.bsr-move .bsr-route{padding:3px 0;font-size:12.5px;gap:8px}
.bsr-od th,.bsr-od td{padding:6px 8px}.bsr-od td.off{background:#f4f6fa}.bsr-od td.zero{color:#c3cad8;font-weight:500}
.bsr-od td.sum,.bsr-od th:last-child{border-left:2px solid var(--ink)}
.bsr-bar.tall{height:12px;border-radius:4px;margin-top:12px}.bsr-bar.tall>i{border-radius:0}
.bsr-split{margin:0 0 18px}.bsr-split .bsr-key{margin:8px 0 0}
.bsr-table tr.meet td{color:var(--soft);font-weight:500;padding-top:6px;padding-bottom:6px}.bsr-table tr.meet td:first-child{padding-left:26px}
.bsr-card.go{cursor:pointer;transition:box-shadow .15s ease}
.bsr-card.go:hover,.bsr-card.go:focus-visible{box-shadow:0 4px 14px rgba(16,24,40,.12);outline:none}
.bsr-badge.big{min-width:40px;height:40px;border-radius:20px;font-size:19px;margin-right:12px;vertical-align:4px;font-family:Inter,sans-serif;border-width:3px}
.bsr-mini.big{width:100%;height:340px}
.bsr-page.area .bsr-top{grid-template-columns:minmax(0,1fr) 400px}
.bsr-page.area .bsr-totals{display:grid;grid-template-columns:1fr 1fr;gap:16px 18px}
.bsr-page.area .bsr-total b{font-size:34px}
.bsr-cols{display:grid;grid-template-columns:1fr 1fr;gap:0 34px}
.bsr-page + .bsr-page{margin-top:22px}
.bsr-h2{font-family:'Barlow Condensed',Inter,sans-serif;font-size:26px;font-weight:700;color:var(--ink);margin:28px 0 12px;padding-top:16px;border-top:3px solid var(--ink)}
.bsr-cmp{margin:10px 0}.bsr-cmp small{display:block;font-size:11.5px;color:var(--soft);margin-top:2px}
.bsr-card.tot{background:#f7f8fb}
@media (max-width:760px){.bsr-cols{grid-template-columns:1fr}}
.bsr-foot{font-size:11.5px;color:var(--soft);margin:18px 0 0;padding-top:10px;border-top:1px solid var(--line)}
@media (max-width:900px){.bsr-top{grid-template-columns:1fr}.bsr-totals{flex-direction:row;flex-wrap:wrap}}
@media print{
  /* Only the report prints. Everything that is not the report, or a box the
     report sits inside, is taken out, and the boxes it sits inside lose their
     spacing, so nothing is left over to spill onto a page of its own. The
     class is set while a print of this tab is running (printOn, below). */
  html.bsr-print body :not(:has(.bsr)):not(.bsr):not(.bsr *){display:none !important}
  html.bsr-print,html.bsr-print body,html.bsr-print body :has(.bsr){display:block !important;margin:0 !important;padding:0 !important;
    border:0 !important;min-height:0 !important;height:auto !important;width:auto !important;max-width:none !important;
    overflow:visible !important;position:static !important;transform:none !important;background:#fff !important;box-shadow:none !important}
}
.bsr-clubsec{display:none}
.bsr-t .s{display:none}
`;
/* The page as it goes on paper: letter, .45in margins, 7.6in of width. Written
   once and used twice: in the app under html.bsr-print, which is set while a
   print is running so the page can be measured and fitted before it goes out,
   and in a saved file under @media print. "P " stands for whichever applies. */
const PAPER = `
P .bsr{width:7.6in;box-sizing:border-box;padding:0 !important;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
P .bsr-strip{display:none !important}
P .bsr-page{border:0 !important;border-radius:0;padding:0 !important;max-width:none;margin:0}
P .bsr-page + .bsr-page{break-before:page;margin-top:0}
P .bsr-page.split .bsr-clubsec{break-before:page}
P .bsr-head{padding-bottom:7px;margin-bottom:10px}
P .bsr-head h1{font-size:30px;margin-bottom:4px}
P .bsr-head p{font-size:12px}
P .bsr-when{font-size:11px}
P .bsr-top{grid-template-columns:minmax(0,1fr) 170px;gap:16px;margin-bottom:10px}
P .bsr-top.many{grid-template-columns:minmax(0,1fr) 270px}
P .bsr-top.many .bsr-totals{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
P .bsr-page.maponly .bsr-cards{break-before:page}
P .bsr-page.maponly .bsr-lead{page:bsrmap;width:10.1in}
P .bsr-page.maponly .bsr-top .bsr-totals{margin-top:2px}
P .bsr-stats.c4{grid-template-columns:repeat(2,minmax(0,1fr))}
P .bsr-stats.c4 .bsr-stat span{min-height:0}
P .bsr-page.maponly .bsr-top{grid-template-columns:1fr;gap:14px;margin-bottom:0}
P .bsr-page.maponly .bsr-top .bsr-totals{display:flex;flex-direction:row;flex-wrap:wrap;gap:12px 34px}
P .bsr-totals{gap:10px}
P .bsr-total{padding-left:10px}
P .bsr-total b{font-size:30px}
P .bsr-total span{font-size:11px}
P .bsr-totals.row{gap:10px 30px;margin:2px 0 12px}
P .bsr-key{font-size:10.5px;margin-bottom:6px}
P .bsr-grid{grid-template-columns:repeat(var(--pc,3),minmax(0,1fr));gap:8px}
P .bsr-grid.steps{grid-template-columns:repeat(3,minmax(0,1fr))}
P .bsr-card{padding:7px 9px 9px;border-top-width:4px}
P .bsr-card header{min-height:0;margin-bottom:5px;gap:6px}
P .bsr-card h3{font-size:17px}
P .bsr-card .bsr-badge{min-width:22px;height:22px;font-size:11px;padding:0 5px}
P .bsr-mini{width:46px;height:28px}
P .bsr-stats{gap:6px 6px;grid-template-columns:repeat(auto-fill,minmax(46px,1fr))}
P .bsr-stats.two{grid-template-columns:repeat(auto-fill,minmax(80px,1fr))}
P .bsr-stats.money{grid-template-columns:1fr 1fr}
P .bsr-stat b{font-size:22px}
P .bsr-stat span{font-size:9.5px;line-height:1.15;margin:1px 0 3px;min-height:22px}
P .bsr-stats.two .bsr-stat span,P .bsr-stats.money .bsr-stat span{min-height:0}
P .bsr-stat em{font-size:9.5px;margin-top:2px}
P .bsr-bar{height:4px}
P .bsr-bar.tall{height:9px;margin-top:8px}
P .bsr-blk{margin-top:7px;padding-top:6px;break-inside:avoid}
P .bsr-blk h4{font-size:9.5px;line-height:1.2;margin-bottom:3px}
P .bsr-blk h4 small{white-space:nowrap}
P .bsr-r{font-size:10.5px;line-height:1.2;margin:1px 0;gap:6px;grid-template-columns:62px 1fr auto;break-inside:avoid}
P .bsr-r.wide{grid-template-columns:minmax(70px,38%) 1fr auto}
P .bsr-r b{min-width:0}
P .bsr-t{font-size:10.5px;line-height:1.2}
P .bsr-t th{font-size:9.5px;padding:0 0 2px 5px;text-transform:none;letter-spacing:0;white-space:nowrap}
P .bsr-t .l{display:none}
P .bsr-t .s{display:inline}
P .bsr-t td{padding:1.5px 0;font-size:10.5px}
P .bsr-t td:first-child{white-space:nowrap}
P .bsr-route{font-size:10.5px;padding:3px 0;gap:8px;break-inside:avoid}
P .bsr-rounds,P .bsr-meets,P .bsr-na{font-size:10.5px}
P .bsr-rounds{margin-top:6px}
P .bsr-cmp{margin:6px 0;break-inside:avoid}
P .bsr-cmp small{font-size:9.5px}
P .bsr-h2{font-size:19px;margin:14px 0 8px;padding-top:9px;border-top-width:2px;break-after:avoid}
P .bsr-incard{display:none}
P .bsr-clubsec{display:block}
P .bsr-clubrow{display:grid;grid-template-columns:104px 1fr;gap:10px;align-items:start;padding:4px 0;border-top:1px solid #e2e8f2;break-inside:avoid}
P .bsr-clubrow b{font-size:11px;color:#171f69;white-space:nowrap}
P .bsr-clubrow p{margin:0;font-size:9.5px;line-height:1.4;color:#1c2540}
P .bsr-foot{font-size:9.5px;margin-top:10px;padding-top:6px;break-inside:avoid}
P .bsr-table{font-size:11px}
P .bsr-table td,P .bsr-table th{padding:5px 6px}
P .bsr-table thead{display:table-header-group}
P .bsr-table tr{break-inside:avoid}
P .bsr-mini.big{width:100%;height:210px}
P .bsr-page.area .bsr-top{grid-template-columns:minmax(0,1fr) 300px;margin-bottom:10px}
P .bsr-page.area .bsr-totals{gap:10px 14px}
P .bsr-page.area .bsr-total b{font-size:26px}
P .bsr-page.area .bsr-clubs{font-size:10px;line-height:1.4}
P .bsr-wide .bsr-blk{break-inside:auto}
P .bsr-badge.big{min-width:32px;height:32px;font-size:15px;margin-right:9px;vertical-align:3px}
`;
const paperCss = prefix => PAPER.replace(/^P /gm, prefix).replace(/,P /g, ',' + prefix);

function css(){
  if (document.getElementById('bsr-css')) return;
  const s = document.createElement('style'); s.id = 'bsr-css'; s.textContent = CSS + paperCss('html.bsr-print '); document.head.appendChild(s);
}
css();

/* Printing. The page margins used to come from a named page on the report,
   which made the browser start a new sheet for whatever followed the report
   in the page, so a blank sheet came out at the end. Now the margins are set
   only while this tab is being printed, the rest of the page is switched off
   for the print, and each report page is fitted to one sheet when it can be. */
/* Empty margin boxes tell the browser the page supplies its own header and
   footer, so it leaves out the date and time, page title, web address and
   page number it would otherwise print in the margins (Chrome and Edge). */
const NO_BROWSER_MARKS = '@top-left{content:""}@top-right{content:""}@bottom-left{content:""}@bottom-right{content:""}';
/* When the map has a sheet to itself that sheet is turned sideways, so the map
   prints at the full length of the paper instead of leaving half the sheet
   empty. The sheets after it stay upright. */
const PAGE_CSS = '@page{size:letter;margin:.45in;' + NO_BROWSER_MARKS + '}@page bsrmap{size:11in 8.5in;margin:.45in;' + NO_BROWSER_MARKS + '}';
const PAPER_W = 7.6 * 96, PAPER_H = 10.1 * 96 - 12, SMALLEST = 0.7;
const WIDE_W = 10.1 * 96, WIDE_H = 7.6 * 96 - 12;          // the sideways sheet
/* Shrink one block until it is a single sheet tall. It is made wider by the
   same factor it is shrunk, so it still fills the sheet side to side. False
   when it would have to go below SMALLEST to fit; it is then left full size. */
function fitOne(el, W, H){
  W = W || PAPER_W; H = H || PAPER_H;
  const set = z => { el.style.zoom = z === 1 ? '' : String(z); el.style.width = z === 1 ? '' : (W / z) + 'px'; };
  const tall = () => el.getBoundingClientRect().height;
  set(1);
  if (tall() <= H) return true;
  set(SMALLEST);
  if (tall() > H){ set(1); return false; }
  let lo = SMALLEST, hi = 1;
  for (let i = 0; i < 7; i++){ const z = (lo + hi) / 2; set(z); if (tall() <= H) lo = z; else hi = z; }
  set(lo);
  return true;
}
function fitPages(){
  document.querySelectorAll('.bsr .bsr-page').forEach(pg => {
    const main = pg.querySelector(':scope > .bsr-main'), clubs = pg.querySelector(':scope > .bsr-clubsec');
    const lead = main && main.querySelector(':scope > .bsr-lead'), cards = main && main.querySelector(':scope > .bsr-cards');
    pg.classList.remove('split', 'maponly');
    if (fitOne(pg) || !main) return;
    if (clubs){                          // the club lists take a sheet of their own
      pg.classList.add('split'); fitOne(clubs);
      if (fitOne(main) || !lead || !cards) return;
    } else if (!lead || !cards) return;
    // Still too much for one sheet: the map gets the first sheet to itself at
    // full width, and the regions or zones take the next.
    pg.classList.add('maponly');
    fitOne(lead, WIDE_W, WIDE_H); fitOne(cards);
  });
}
function unfitPages(){
  document.querySelectorAll('.bsr .bsr-page, .bsr .bsr-main, .bsr .bsr-lead, .bsr .bsr-cards, .bsr .bsr-clubsec').forEach(el => { el.style.zoom = ''; el.style.width = ''; el.classList.remove('split', 'maponly'); });
}
function printOn(){
  const r = document.querySelector('.bsr');
  if (!r || !r.offsetParent || document.getElementById('mr-output')) return;
  document.documentElement.classList.add('bsr-print');
  if (!document.getElementById('bsr-pagecss')){
    const s = document.createElement('style'); s.id = 'bsr-pagecss'; s.textContent = PAGE_CSS;
    document.head.appendChild(s);
  }
  try { fitPages(); } catch(e){ console.error('fit to page', e); }
}
function printOff(){
  document.documentElement.classList.remove('bsr-print');
  const s = document.getElementById('bsr-pagecss'); if (s) s.remove();
  unfitPages();
}
window.addEventListener('beforeprint', printOn);
window.addEventListener('afterprint', printOff);

window.BSReport = {html, wire, build, tableData, reset: () => { ST = null; }};
})();
