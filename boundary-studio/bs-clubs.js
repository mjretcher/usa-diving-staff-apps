/* ==========================================================================
   Boundary Studio — CLUBS tab
   --------------------------------------------------------------------------
   Every USA Diving club, where it is, and how many of each membership type it
   holds, for 2024, 2025 and 2026 year to date. A county heat map of where
   members live, with a pin for every club on top, broken down by state, with a
   printable report for each year.

   Reads live from Neon (membership.members), so it updates the moment a new
   Webpoint report is loaded through the Import button. Nothing here writes.

   COUNTING RULES (stated on the page as well)
   - A count is a MEMBERSHIP: one row in the Webpoint export. Membership types
     are shown exactly as Webpoint names them. A person who holds two types is
     counted once in each; a separate "people" figure counts each person once.
   - Club = the club Webpoint lists on the member's record in that year's
     report (Webpoint stamps the club the member currently represents).
   - Members with no club listed are shown on their own line, "Unattached",
     placed in the state where they live.
   - Every membership row is counted. The club table for a year always adds up
     to every membership for that year in Neon; the page checks this and says
     so, and shows a red warning if it ever does not.
   - A club with no members in the year on screen still appears, with zeros, as
     long as it had members in any of the three years.

   PIN LOCATIONS
   Clubs on the Webpoint club roster (clubs-roster.json, built by
   db/scripts/build_clubs_roster.py with contact details removed) are pinned at
   their address ZIP, and their state is the roster's state. A club with
   members in 2024-2026 that is not on the roster (or whose roster ZIP does not
   exist) is pinned at the ZIP where the most of its members live, 2024-2026
   combined (ties to the lower ZIP), drawn dashed and labelled "Approximate".
   Roster clubs with no members in any year still appear, with zeros.

   GEOGRAPHY
   clubs-zip.json: ZIP centroid -> map position (same projection as the
   county paths in boundary-data.json) and county. Where the Map tab already
   assigns a ZIP to a county, the same county is used so both tabs agree.
   ========================================================================== */
(function(){
'use strict';

const $ = id => document.getElementById(id);
const fmt = n => Number(n || 0).toLocaleString('en-US');
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

const YEARS = [2024, 2025, 2026];
const YTD_YEAR = 2026;
const UNATTACHED = 'Unattached (no club listed in Webpoint)';
const BLANK_TYPE = '(type left blank in Webpoint)';
const OUTSIDE = 'XX';   // lives outside the United States
const NOLOC   = 'ZZ';   // no usable address on file

const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',
  DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',
  IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',
  MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',
  NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',
  OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
  WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',PR:'Puerto Rico',GU:'Guam',VI:'U.S. Virgin Islands',
  AS:'American Samoa',MP:'Northern Mariana Islands',AA:'Armed Forces (Americas)',AE:'Armed Forces (Europe)',
  AP:'Armed Forces (Pacific)',
  [OUTSIDE]:'Outside the United States', [NOLOC]:'No usable address on file',
};
const stateName = s => STATE_NAMES[s] || s;
const US_COUNTRY = c => { const v = String(c || '').trim().toLowerCase();
  return v === '' || v === 'united states' || v === 'usa' || v === 'us' || v === 'united states of america'; };

const C = {
  booted: false, loading: false, err: null,
  geo: null, zip: null, zipMeta: null,
  rows: [], people: [], loadedAt: {},
  year: YTD_YEAR, layer: 'both', type: '', state: '', q: '',
  sort: { col: 'total', dir: -1 }, stSort: { col: 'name', dir: 1 },
  hoverClub: null, selClub: null,
  // derived
  types: [], clubs: [], clubInfo: {}, agg: null,
};

/* ---------------------------------------------------------------- data ---- */
async function loadAll(){
  C.loading = true; render();
  try {
    const [geo, zipJ, roster, rowsR, peopleR, stampR] = await Promise.all([
      fetch('../membership-analytics/boundary-data.json?v=202610251530').then(r => r.json()),
      fetch('clubs-zip.json?v=202610251530').then(r => r.json()),
      fetch('clubs-roster.json?v=202610251530').then(r => r.json()),
      NEON.query(`SELECT membership_year::int AS y,
                         coalesce(trim(club),'')            AS club,
                         coalesce(trim(membership_type),'') AS t,
                         left(coalesce(zip5,''),5)          AS z,
                         upper(trim(coalesce(state,'')))    AS st,
                         coalesce(trim(country),'')         AS co,
                         count(*)::int                      AS n
                    FROM membership.members
                   WHERE membership_year IN (2024,2025,2026)
                   GROUP BY 1,2,3,4,5,6`),
      NEON.query(`SELECT membership_year::int AS y,
                         coalesce(trim(club),'')            AS club,
                         left(coalesce(zip5,''),5)          AS z,
                         upper(trim(coalesce(state,'')))    AS st,
                         coalesce(trim(country),'')         AS co,
                         count(DISTINCT member_id)::int     AS p
                    FROM membership.members
                   WHERE membership_year IN (2024,2025,2026)
                   GROUP BY 1,2,3,4,5`),
      NEON.query(`SELECT membership_year::int AS y, count(*)::int AS n,
                         count(DISTINCT member_id)::int AS p,
                         to_char(max(loaded_at) AT TIME ZONE 'America/New_York','Mon FMDD, YYYY') AS d
                    FROM membership.members WHERE membership_year IN (2024,2025,2026) GROUP BY 1`),
    ]);
    C.geo = geo; C.zip = zipJ.zips; C.zipMeta = zipJ; C.roster = roster;
    C.rows = rowsR.rows.map(r => ({ y:+r.y, club:r.club, t:r.t, z:r.z, st:r.st, co:r.co, n:+r.n }));
    C.people = peopleR.rows.map(r => ({ y:+r.y, club:r.club, z:r.z, st:r.st, co:r.co, p:+r.p }));
    C.loadedAt = {}; C.neonTotals = {};
    stampR.rows.forEach(r => { C.loadedAt[+r.y] = r.d; C.neonTotals[+r.y] = { n:+r.n, p:+r.p }; });
    derive();
    C.err = null;
  } catch(e){
    console.error('[clubs] load failed', e);
    C.err = 'Could not load membership data from Neon (' + (e && e.message || e) + '). Refresh to try again.';
  }
  C.loading = false; render();
}

/* Where a membership row lives: a state code, OUTSIDE or NOLOC. */
function locOf(z, st, co){
  const hit = C.zip[z];
  if (hit && US_COUNTRY(co)) return hit[2];
  if (!US_COUNTRY(co)) return OUTSIDE;
  if (/^[A-Z]{2}$/.test(st) && STATE_NAMES[st]) return st;
  return NOLOC;
}

function derive(){
  /* Membership types: every type seen in any of the three years, Webpoint's own
     names, ordered by how common they are across the three years. */
  const tc = {};
  C.rows.forEach(r => { const t = r.t || BLANK_TYPE; tc[t] = (tc[t] || 0) + r.n; });
  C.types = Object.keys(tc).sort((a, b) => (a === BLANK_TYPE) - (b === BLANK_TYPE) || tc[b] - tc[a] || a.localeCompare(b));

  /* Club pins: modal ZIP across all three years among members whose ZIP maps. */
  const zc = {}, sc = {};
  C.rows.forEach(r => {
    if (!r.club) return;
    const h = C.zip[r.z];
    if (h && h[0] != null && US_COUNTRY(r.co)) { (zc[r.club] = zc[r.club] || {})[r.z] = ((zc[r.club] || {})[r.z] || 0) + r.n; }
    const L = locOf(r.z, r.st, r.co);
    (sc[r.club] = sc[r.club] || {})[L] = ((sc[r.club] || {})[L] || 0) + r.n;
  });
  /* Clubs = every club in the member data (2024-2026) plus every club on the
     Webpoint club roster, so a rostered club with no members still shows. */
  const R = {}; (C.roster && C.roster.clubs || []).forEach(c => { R[c.name] = c; });
  const clubs = [...new Set([...C.rows.filter(r => r.club).map(r => r.club), ...Object.keys(R)])];
  C.clubInfo = {};
  clubs.forEach(name => {
    const rc = R[name];
    if (rc && rc.zip_valid && C.zip[rc.zip] && C.zip[rc.zip][0] != null){
      const h = C.zip[rc.zip];
      C.clubInfo[name] = { name, zip: rc.zip, x: h[0], y: h[1], st: rc.state || h[2], fips: h[3],
        exact: true, city: rc.city, onRoster: true };
      return;
    }
    let best = null, bn = -1;
    Object.entries(zc[name] || {}).forEach(([z, n]) => { if (n > bn || (n === bn && z < best)) { best = z; bn = n; } });
    if (best){
      const h = C.zip[best];
      C.clubInfo[name] = { name, zip: best, x: h[0], y: h[1], st: h[2], fips: h[3], pinFrom: bn,
        exact: false, onRoster: !!rc, badZip: rc && !rc.zip_valid ? rc.zip : null };
    } else {
      let bs = NOLOC, bsn = -1;
      Object.entries(sc[name] || {}).forEach(([s, n]) => { if (n > bsn || (n === bsn && s < bs)) { bs = s; bsn = n; } });
      C.clubInfo[name] = { name, zip: null, x: null, y: null, st: (rc && rc.state) || bs, fips: null, pinFrom: 0,
        exact: false, onRoster: !!rc, badZip: rc && !rc.zip_valid ? rc.zip : null };
    }
  });
  C.clubs = clubs.sort((a, b) => a.localeCompare(b));
  C.cache = {};
}

/* Aggregates for one year (cached). Every row lands in exactly one club line:
   a named club, or Unattached in the member's own state. */
function aggFor(year){
  if (C.cache[year]) return C.cache[year];
  const lines = {};          // key -> line
  const key = (club, st) => club ? 'c|' + club : 'u|' + st;
  const line = (club, st) => {
    const k = key(club, st);
    if (!lines[k]) {
      const info = club ? C.clubInfo[club] : null;
      lines[k] = { k, club: club || null, name: club || UNATTACHED, st: club ? info.st : st,
        info, by: {}, total: 0, people: 0, unatt: !club };
    }
    return lines[k];
  };
  // every club appears in every year, zeros included
  C.clubs.forEach(c => line(c, null));
  const county = {}, typeTot = {}; let total = 0, offMap = 0;
  C.rows.forEach(r => {
    if (r.y !== year) return;
    const t = r.t || BLANK_TYPE;
    const L = locOf(r.z, r.st, r.co);
    const ln = line(r.club, L);
    ln.by[t] = (ln.by[t] || 0) + r.n; ln.total += r.n;
    typeTot[t] = (typeTot[t] || 0) + r.n; total += r.n;
    const h = C.zip[r.z];
    if (h && h[3] && US_COUNTRY(r.co)) {
      const c = county[h[3]] || (county[h[3]] = { all: 0, by: {} });
      c.all += r.n; c.by[t] = (c.by[t] || 0) + r.n;
    } else offMap += r.n;
  });
  let people = 0;
  C.people.forEach(p => {
    if (p.y !== year) return;
    const ln = line(p.club, locOf(p.z, p.st, p.co));
    ln.people += p.p; people += p.p;
  });
  const out = { year, lines: Object.values(lines), county, typeTot, total, offMap, people };
  // states
  const st = {};
  out.lines.forEach(l => {
    const s = st[l.st] || (st[l.st] = { st: l.st, name: stateName(l.st), by: {}, total: 0, clubs: 0, clubsWith: 0, unatt: 0 });
    C.types.forEach(t => { if (l.by[t]) s.by[t] = (s.by[t] || 0) + l.by[t]; });
    s.total += l.total;
    if (l.unatt) s.unatt += l.total; else { s.clubs++; if (l.total) s.clubsWith++; }
  });
  out.states = Object.values(st);
  // reconciliation against Neon's own count for the year
  const neon = C.neonTotals[year] || { n: 0, p: 0 };
  out.reconciled = (out.total === neon.n) && out.lines.reduce((a, l) => a + l.total, 0) === neon.n;
  out.neon = neon;
  C.cache[year] = out;
  return out;
}

/* ---------------------------------------------------------------- view ---- */
const yearLabel = y => y === YTD_YEAR ? `${y} year to date` : `${y}`;
const asOf = y => C.loadedAt[y] ? `Webpoint report imported ${C.loadedAt[y]}` : '';
const typeVal = (l) => C.type ? (l.by[C.type] || 0) : l.total;
const stateOrder = (a, b) => (a.st === OUTSIDE || a.st === NOLOC) - (b.st === OUTSIDE || b.st === NOLOC) || a.name.localeCompare(b.name);

function heatColor(m, maxM){
  // Same tint as the Map tab's county heat: base grey toward navy, t^0.45.
  const base = [0xdf, 0xe8, 0xf2];
  if (!m) return 'rgb(' + base.join(',') + ')';
  const t = Math.pow(Math.min(1, m / maxM), 0.45);
  const mix = (a, c) => Math.round(a + (c - a) * t * 0.9);
  return `rgb(${mix(base[0],23)},${mix(base[1],31)},${mix(base[2],105)})`;
}

function bbox(d){
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i + 1 < nums.length; i += 2){ const x = nums[i], y = nums[i+1];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

function mapSvg(A, opts){
  opts = opts || {};
  const G = C.geo;
  const sel = opts.state != null ? opts.state : C.state;
  let vb = G.viewBox || '0 0 975 610';
  const stShape = sel && G.states.find(s => s.abbr === sel);
  if (stShape && !opts.national){
    const b = stShape._bb || (stShape._bb = bbox(stShape.d));
    const w = b[2] - b[0], h = b[3] - b[1], pad = Math.max(w, h) * 0.08 + 4;
    vb = `${(b[0]-pad).toFixed(1)} ${(b[1]-pad).toFixed(1)} ${(w+2*pad).toFixed(1)} ${(h+2*pad).toFixed(1)}`;
  }
  const scale = stShape && !opts.national ? Math.max(bbox(stShape.d)[2]-bbox(stShape.d)[0], bbox(stShape.d)[3]-bbox(stShape.d)[1]) / 975 : 1;
  const k = Math.max(0.12, scale);
  const kp = stShape && !opts.national ? k * 1.8 : k;   // pins a little larger when zoomed to one state
  const showHeat = C.layer !== 'pins', showPins = C.layer !== 'heat';
  const vals = Object.values(A.county).map(c => C.type ? (c.by[C.type] || 0) : c.all);
  const maxM = Math.max(1, ...vals);
  let s = `<svg class="cbx-map" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map of USA Diving clubs and where members live, ${esc(yearLabel(A.year))}">`;
  s += `<g class="cbx-cty">`;
  G.counties.forEach(c => {
    const v = A.county[c.f]; const m = v ? (C.type ? (v.by[C.type] || 0) : v.all) : 0;
    s += `<path d="${c.d}" fill="${showHeat ? heatColor(m, maxM) : '#eef1f6'}" data-f="${c.f}" data-n="${esc(c.n)}" data-st="${c.st}" data-m="${m}"/>`;
  });
  s += `</g>`;
  s += `<path class="cbx-mesh" d="${G.stateMesh}" fill="none" stroke="#fff" stroke-width="${(1.1*k).toFixed(2)}"/>`;
  if (!opts.print){
    s += `<g class="cbx-sthit" style="stroke-width:${(1.4*k).toFixed(2)}">` + G.states.map(st => `<path d="${st.d}" data-st="${st.abbr}" class="${st.abbr===sel?'on':''}"/>`).join('') + `</g>`;
  } else if (stShape && !opts.national){
    s += `<path d="${stShape.d}" fill="none" stroke="#171F69" stroke-width="${(1.6*k).toFixed(2)}"/>`;
  }
  if (showPins){
    const ls = A.lines.filter(l => l.club && l.info && l.info.x != null && (!sel || opts.national || l.st === sel));
    const maxN = Math.max(1, ...ls.map(typeVal));
    ls.sort((a, b) => typeVal(b) - typeVal(a));
    ls.forEach(l => {
      const v = typeVal(l);
      const r = (v ? 2.4 + 9 * Math.sqrt(v / maxN) : 2.6) * kp;
      const on = (C.selClub === l.club ? ' on' : '') + (l.info.exact ? '' : ' ap');
      const dash = l.info.exact ? '' : ` style="stroke-dasharray:${(2*kp).toFixed(2)} ${(1.4*kp).toFixed(2)}"`;
      s += v
        ? `<circle class="cbx-pin${on}" cx="${l.info.x}" cy="${l.info.y}" r="${r.toFixed(2)}" stroke-width="${((l.info.exact?0.9:1.3)*kp).toFixed(2)}"${dash} data-club="${esc(l.club)}"/>`
        : `<circle class="cbx-pin z${on}" cx="${l.info.x}" cy="${l.info.y}" r="${r.toFixed(2)}" stroke-width="${(1.1*kp).toFixed(2)}"${dash} data-club="${esc(l.club)}"/>`;
    });
  }
  s += `</svg>`;
  return s;
}

function kpis(A){
  const scope = C.state ? A.lines.filter(l => l.st === C.state) : A.lines;
  const memb = scope.reduce((a, l) => a + typeVal(l), 0);
  // Nationally, Neon's own distinct count. Within a state, the club lines are
  // summed, so the 3 or so people a year who hold types at two different
  // clubs count once at each -- said so on the tile.
  const ppl = C.state ? scope.reduce((a, l) => a + l.people, 0) : A.neon.p;
  const clubsAll = scope.filter(l => !l.unatt).length;
  const clubsWith = scope.filter(l => !l.unatt && typeVal(l) > 0).length;
  const un = scope.filter(l => l.unatt).reduce((a, l) => a + typeVal(l), 0);
  const where = C.state ? stateName(C.state) : 'All states';
  const tt = C.type ? esc(C.type) : 'All membership types';
  return `<div class="cbx-kpis">
    <div class="kpi"><div class="lbl">Memberships</div><div class="big">${fmt(memb)}</div><div class="sub">${esc(where)} &middot; ${tt}</div></div>
    <div class="kpi pool"><div class="lbl">People</div><div class="big">${C.type ? '&mdash;' : fmt(ppl)}</div><div class="sub">${C.type ? 'Shown for all membership types only' : C.state ? 'Each person counted once per club' : 'Each person counted once'}</div></div>
    <div class="kpi sky"><div class="lbl">Clubs with members</div><div class="big">${fmt(clubsWith)}</div><div class="sub">of ${fmt(clubsAll)} clubs (on the club roster or with members 2024&ndash;2026)</div></div>
    <div class="kpi red"><div class="lbl">Unattached</div><div class="big">${fmt(un)}</div><div class="sub">Memberships with no club listed</div></div>
  </div>`;
}

function stateTable(A){
  const rows = A.states.slice();
  const sc = C.stSort;
  rows.sort((a, b) => {
    if (sc.col === 'name') return sc.dir * stateOrder(a, b);
    const va = sc.col === 'total' ? a.total : sc.col === 'clubs' ? a.clubsWith : sc.col === 'un' ? a.unatt : (a.by[sc.col] || 0);
    const vb = sc.col === 'total' ? b.total : sc.col === 'clubs' ? b.clubsWith : sc.col === 'un' ? b.unatt : (b.by[sc.col] || 0);
    return sc.dir * (va - vb) || stateOrder(a, b);
  });
  const arr = c => sc.col === c ? `<span class="arr">${sc.dir > 0 ? '&#9650;' : '&#9660;'}</span>` : '';
  let h = `<table class="cbx-t cbx-st"><thead><tr>
    <th data-ssort="name" class="l">State ${arr('name')}</th>
    <th data-ssort="clubs">Clubs with members ${arr('clubs')}</th>
    ${C.types.map(t => `<th data-ssort="${esc(t)}">${esc(t)} ${arr(t)}</th>`).join('')}
    <th data-ssort="un">of which Unattached ${arr('un')}</th>
    <th data-ssort="total" class="tot">Total ${arr('total')}</th></tr></thead><tbody>`;
  rows.forEach(s => {
    h += `<tr data-pickst="${s.st}" class="${C.state === s.st ? 'sel' : ''}"><td class="l">${esc(s.name)}</td>
      <td>${fmt(s.clubsWith)} <span class="dim">/ ${fmt(s.clubs)}</span></td>
      ${C.types.map(t => cell(s.by[t])).join('')}
      ${cell(s.unatt)}<td class="tot">${fmt(s.total)}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td class="l">All states</td><td>${fmt(A.states.reduce((a,s)=>a+s.clubsWith,0))} <span class="dim">/ ${fmt(A.states.reduce((a,s)=>a+s.clubs,0))}</span></td>
    ${C.types.map(t => cell(A.typeTot[t])).join('')}${cell(A.states.reduce((a,s)=>a+s.unatt,0))}<td class="tot">${fmt(A.total)}</td></tr></tfoot></table>`;
  return h;
}
const cell = v => v ? `<td>${fmt(v)}</td>` : `<td class="z0">0</td>`;

function clubLines(A, stateFilter, query){
  let ls = A.lines.slice();
  if (stateFilter) ls = ls.filter(l => l.st === stateFilter);
  if (query){ const q = query.toLowerCase(); ls = ls.filter(l => l.name.toLowerCase().includes(q)); }
  return ls;
}
function sortLines(ls, sc){
  const v = (l, c) => c === 'name' ? 0 : c === 'total' ? l.total : c === 'people' ? l.people : c === 'state' ? 0 : (l.by[c] || 0);
  return ls.sort((a, b) => {
    if (a.unatt !== b.unatt) return a.unatt ? 1 : -1;           // Unattached lines last
    if (sc.col === 'name') return sc.dir * a.name.localeCompare(b.name);
    if (sc.col === 'state') return sc.dir * stateName(a.st).localeCompare(stateName(b.st)) || a.name.localeCompare(b.name);
    return sc.dir * (v(a, sc.col) - v(b, sc.col)) || a.name.localeCompare(b.name);
  });
}

function clubTable(A){
  const ls = sortLines(clubLines(A, C.state, C.q), C.sort);
  const sc = C.sort;
  const arr = c => sc.col === c ? `<span class="arr">${sc.dir > 0 ? '&#9650;' : '&#9660;'}</span>` : '';
  const tot = { by: {}, total: 0, people: 0 };
  ls.forEach(l => { C.types.forEach(t => { if (l.by[t]) tot.by[t] = (tot.by[t] || 0) + l.by[t]; }); tot.total += l.total; tot.people += l.people; });
  let h = `<table class="cbx-t cbx-cl"><thead><tr>
    <th data-csort="name" class="l">Club ${arr('name')}</th>
    ${C.state ? '' : `<th data-csort="state" class="l">State ${arr('state')}</th>`}
    <th data-csort="loc" class="l nos">Where the pin is</th>
    ${C.types.map(t => `<th data-csort="${esc(t)}">${esc(t)} ${arr(t)}</th>`).join('')}
    <th data-csort="total" class="tot">Total memberships ${arr('total')}</th>
    <th data-csort="people">People ${arr('people')}</th></tr></thead><tbody>`;
  ls.forEach(l => {
    const pin = pinText(l);
    h += `<tr data-club="${esc(l.club || '')}" class="${l.unatt ? 'un' : ''}${C.selClub && C.selClub === l.club ? ' sel' : ''}${!l.total ? ' zero' : ''}">
      <td class="l">${esc(l.name)}</td>${C.state ? '' : `<td class="l">${esc(stateName(l.st))}</td>`}<td class="l nos">${pin}</td>
      ${C.types.map(t => cell(l.by[t])).join('')}<td class="tot">${fmt(l.total)}</td><td>${fmt(l.people)}</td></tr>`;
  });
  h += `</tbody><tfoot><tr><td class="l">${C.q ? 'Shown' : 'Total'} (${fmt(ls.filter(l=>!l.unatt).length)} clubs${ls.some(l=>l.unatt) ? ' + Unattached' : ''})</td>${C.state ? '' : '<td></td>'}<td></td>
    ${C.types.map(t => cell(tot.by[t])).join('')}<td class="tot">${fmt(tot.total)}</td><td>${fmt(tot.people)}</td></tr></tfoot></table>`;
  return h;
}

function pinText(l){
  if (l.unatt) return '<span class="dim">Each member counted in the state they live in</span>';
  const i = l.info;
  if (i.exact) return `Club address ZIP ${esc(i.zip)}${i.city ? ' (' + esc(i.city) + ')' : ''}`;
  const why = i.badZip ? `Club ZIP ${esc(i.badZip)} in Webpoint does not exist` : i.onRoster ? 'No usable club ZIP' : 'Not on the club roster';
  return i.zip ? `<span class="ap-t">Approximate: ZIP ${esc(i.zip)}</span> <span class="dim">(${why}; most members live there)</span>`
               : `<span class="dim">No pin (${why}; no mappable member ZIP)</span>`;
}

function reconLine(A){
  if (A.reconciled){
    return `<div class="cbx-ok">Every membership is accounted for: the club lines for ${esc(yearLabel(A.year))} add up to ${fmt(A.total)}, the same as the ${fmt(A.neon.n)} memberships in Neon for that year (${fmt(A.neon.p)} people). ${fmt(A.offMap)} of them have a foreign, military or unusable ZIP and so are not shaded on the map; they are in every table.</div>`;
  }
  return `<div class="cbx-bad">Warning: the club lines for ${esc(yearLabel(A.year))} add up to ${fmt(A.total)}, but Neon holds ${fmt(A.neon.n)} memberships for that year. Do not use these figures until this is fixed.</div>`;
}

function methodNote(){
  return `<b>How to read this.</b> Counts are memberships exactly as listed in Webpoint, by membership type as Webpoint names it. A person holding two types counts once in each; the People column counts each person once per club (a handful of people a year hold types at two different clubs and appear at both; the national people total counts them once).
  Each member is shown under the club on their record in that year's Webpoint report. Members with no club are on an "Unattached" line in the state where they live.
  Clubs with no members in the year shown still appear with zeros if they had members in any year from 2024 to 2026.
  <b>Pin locations:</b> clubs on the Webpoint club roster (${fmt(rosterCount())} clubs, exported ${esc((C.roster && C.roster.exported) || '')}) are pinned at the ZIP code of the club's address. Clubs that had members in 2024&ndash;2026 but are not on that roster, or whose roster ZIP does not exist, are pinned at the ZIP where the most of their members live (2024&ndash;2026 combined) and are drawn with a dashed outline and marked "Approximate".
  The county shading is the number of memberships whose home ZIP is in that county.`;
}

const rosterCount = () => (C.roster && C.roster.clubs || []).length;

function render(){
  const root = $('viewClubs');
  if (!root) return;
  if (C.loading || !C.geo){
    root.innerHTML = C.err ? `<div class="cbx-bad" style="margin:20px">${esc(C.err)}</div>` : `<div class="loading">Loading clubs and memberships&hellip;</div>`;
    return;
  }
  if (C.err){ root.innerHTML = `<div class="cbx-bad" style="margin:20px">${esc(C.err)}</div>`; return; }
  const A = aggFor(C.year);
  const stList = A.states.slice().sort(stateOrder);
  const selInfo = C.selClub && A.lines.find(l => l.club === C.selClub);
  root.innerHTML = `
  <div class="cbx">
    <div class="cbx-bar">
      <div class="cbx-seg" role="group" aria-label="Year">${YEARS.map(y => `<button data-year="${y}" class="${C.year === y ? 'on' : ''}">${y === YTD_YEAR ? y + ' to date' : y}</button>`).join('')}</div>
      <label class="cbx-f">State<select id="cbxState"><option value="">All states</option>${stList.map(s => `<option value="${s.st}" ${C.state === s.st ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <label class="cbx-f">Membership type<select id="cbxType"><option value="">All membership types</option>${C.types.map(t => `<option ${C.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <div class="cbx-seg" role="group" aria-label="Map layers">
        <button data-layer="both" class="${C.layer === 'both' ? 'on' : ''}">Heat map + clubs</button>
        <button data-layer="pins" class="${C.layer === 'pins' ? 'on' : ''}">Clubs only</button>
        <button data-layer="heat" class="${C.layer === 'heat' ? 'on' : ''}">Heat map only</button></div>
      <div class="cbx-acts">
        <button class="cbx-btn pri" data-print="all">Print ${esc(yearLabel(C.year))} report</button>
        ${C.state ? `<button class="cbx-btn" data-print="state">Print ${esc(stateName(C.state))} only</button>` : ''}
        <button class="cbx-btn" data-csv="1">Download table (CSV)</button>
      </div>
    </div>
    <div class="cbx-asof">${esc(yearLabel(C.year))} &middot; ${esc(asOf(C.year))}${C.year === YTD_YEAR ? ' &middot; updates when a newer Webpoint report is imported' : ' &middot; full membership year'}</div>
    ${kpis(A)}
    <div class="cbx-mapcard card">
      <div class="cbx-maphead">
        <div><h2>${C.state ? esc(stateName(C.state)) : 'United States'}</h2>
        <div class="sub">${C.layer !== 'pins' ? 'Shading: memberships by home county' : ''}${C.layer === 'both' ? ' &middot; ' : ''}${C.layer !== 'heat' ? 'Pins: one per club at its address ZIP, sized by memberships (hollow = no members this year, dashed = approximate)' : ''}${C.type ? ' &middot; ' + esc(C.type) + ' only' : ''}</div></div>
        <div class="cbx-mapacts">${C.state ? `<button class="cbx-btn" data-pickst="">Back to the whole country</button>` : '<span class="note">Click a state to zoom in. Click a pin to find the club in the table.</span>'}</div>
      </div>
      <div class="cbx-mapwrap">${mapSvg(A)}<div id="cbxTip" class="cbx-tip" hidden></div></div>
      ${selInfo ? clubCard(selInfo) : ''}
      <div class="cbx-legend">${legend(A)}</div>
    </div>
    ${reconLine(A)}
    ${C.state ? '' : `<div class="card"><div class="card-h"><h2>By state</h2><div class="sub">Click a state to see its clubs. Clubs are placed in the state of their pin.</div></div><div class="cbx-scroll">${stateTable(A)}</div></div>`}
    <div class="card"><div class="card-h"><h2>${C.state ? 'Clubs in ' + esc(stateName(C.state)) : 'Every club'}</h2>
      <input id="cbxQ" class="cbx-q" type="search" placeholder="Find a club" value="${esc(C.q)}" aria-label="Find a club"></div>
      <div class="cbx-scroll tall">${clubTable(A)}</div></div>
    <div class="cbx-method note">${methodNote()}</div>
  </div>`;
  wire();
}

function clubCard(l){
  const tops = C.types.filter(t => l.by[t]).map(t => `<span><b>${fmt(l.by[t])}</b> ${esc(t)}</span>`).join('');
  return `<div class="cbx-sel"><div><b class="nm">${esc(l.name)}</b> <span class="dim">${esc(stateName(l.st))}${l.info && l.info.zip ? ' &middot; ' + (l.info.exact ? 'club address ZIP ' + esc(l.info.zip) : 'approximate pin, ZIP ' + esc(l.info.zip)) : ''}</span></div>
    <div class="cbx-sel-t">${tops || '<span class="dim">No members in ' + esc(yearLabel(C.year)) + '</span>'}</div>
    <div><b>${fmt(l.total)}</b> memberships &middot; <b>${fmt(l.people)}</b> people <button class="cbx-x" data-unsel="1" aria-label="Close">Close</button></div></div>`;
}

function legend(A){
  const vals = Object.values(A.county).map(c => C.type ? (c.by[C.type] || 0) : c.all);
  const maxM = Math.max(1, ...vals);
  const stops = [1, Math.round(maxM*0.05)||1, Math.round(maxM*0.2)||1, Math.round(maxM*0.5)||1, maxM].filter((v,i,a)=>a.indexOf(v)===i);
  return (C.layer !== 'pins' ? `<span class="lg">Memberships per county</span>${stops.map(v => `<span class="sw" style="background:${heatColor(v, maxM)}"></span><span class="lv">${fmt(v)}</span>`).join('')}` : '')
    + (C.layer !== 'heat' ? `<span class="lg sp">Club pin</span><svg width="16" height="16"><circle cx="8" cy="8" r="6" class="cbx-pin"/></svg><span class="lv">has members</span><svg width="16" height="16"><circle cx="8" cy="8" r="4" class="cbx-pin z" stroke-width="1.4"/></svg><span class="lv">no members this year</span><svg width="16" height="16"><circle cx="8" cy="8" r="6" class="cbx-pin ap" stroke-width="1.6"/></svg><span class="lv">approximate location (not on the club roster)</span>` : '');
}

/* ---------------------------------------------------------------- events -- */
function wire(){
  const root = $('viewClubs');
  root.onclick = e => {
    const b = e.target.closest('[data-year],[data-layer],[data-pickst],[data-print],[data-csv],[data-ssort],[data-csort],[data-unsel],.cbx-pin,tr[data-club]');
    if (!b) return;
    if (b.dataset.year){ C.year = +b.dataset.year; return render(); }
    if (b.dataset.layer){ C.layer = b.dataset.layer; return render(); }
    if (b.dataset.pickst != null){ C.state = b.dataset.pickst; C.selClub = null; return render(); }
    if (b.dataset.print){ return printReport(b.dataset.print === 'state' ? C.state : ''); }
    if (b.dataset.csv){ return downloadCsv(); }
    if (b.dataset.unsel){ C.selClub = null; return render(); }
    if (b.dataset.ssort){ const c = b.dataset.ssort; C.stSort = { col: c, dir: C.stSort.col === c ? -C.stSort.dir : (c === 'name' ? 1 : -1) }; return render(); }
    if (b.dataset.csort){ const c = b.dataset.csort; if (c === 'loc') return; C.sort = { col: c, dir: C.sort.col === c ? -C.sort.dir : ((c === 'name' || c === 'state') ? 1 : -1) }; return render(); }
    const club = b.dataset.club;
    if (club){
      C.selClub = C.selClub === club ? null : club;
      render();
      if (b.classList.contains('cbx-pin')){
        const row = root.querySelector(`tr[data-club="${CSS.escape(club)}"]`);
        if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  };
  const st = $('cbxState'); if (st) st.onchange = () => { C.state = st.value; C.selClub = null; render(); };
  const ty = $('cbxType'); if (ty) ty.onchange = () => { C.type = ty.value; render(); };
  const q = $('cbxQ'); if (q) q.oninput = () => {
    C.q = q.value; const A = aggFor(C.year);
    const host = q.closest('.card').querySelector('.cbx-scroll'); host.innerHTML = clubTable(A);
  };
  const map = root.querySelector('.cbx-mapwrap'), tip = $('cbxTip');
  if (map && tip){
    map.onmousemove = e => {
      const pin = e.target.closest('.cbx-pin'), cty = !pin && e.target.closest('[data-st]') && document.elementsFromPoint(e.clientX, e.clientY).find(el => el.dataset && el.dataset.f);
      let html = '';
      if (pin){
        const l = aggFor(C.year).lines.find(x => x.club === pin.dataset.club);
        if (l) html = `<b>${esc(l.name)}</b><br>${fmt(typeVal(l))} ${C.type ? esc(C.type) : 'memberships'} &middot; ${esc(stateName(l.st))}<br><span class="dim">${l.info.exact ? 'Club address ZIP ' + esc(l.info.zip) + (l.info.city ? ', ' + esc(l.info.city) : '') : 'Approximate location (ZIP ' + esc(l.info.zip) + ', where most members live)'}</span>`;
      } else if (cty){
        html = `<b>${esc(cty.dataset.n)} County, ${esc(cty.dataset.st)}</b><br>${fmt(cty.dataset.m)} ${C.type ? esc(C.type) : 'memberships'} live here`;
      }
      if (!html){ tip.hidden = true; return; }
      const r = map.getBoundingClientRect();
      tip.innerHTML = html; tip.hidden = false;
      const x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
      tip.style.left = Math.min(x, r.width - tip.offsetWidth - 6) + 'px';
      tip.style.top = Math.min(y, r.height - tip.offsetHeight - 6) + 'px';
    };
    map.onmouseleave = () => { tip.hidden = true; };
  }
}

/* ---------------------------------------------------------------- print --- */
function printReport(onlyState){
  const A = aggFor(C.year);
  const old = $('cbxPrint'); if (old) old.remove();
  const el = document.createElement('div'); el.id = 'cbxPrint';
  const title = `USA Diving Clubs and Memberships &mdash; ${esc(yearLabel(C.year))}`;
  const sub = `${esc(asOf(C.year))} &middot; printed ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${C.type ? ' &middot; map and totals filtered to ' + esc(C.type) : ''}`;
  const states = A.states.slice().sort(stateOrder).filter(s => !onlyState || s.st === onlyState);
  const savedState = C.state, savedQ = C.q, savedSel = C.selClub;
  C.selClub = null;
  let h = `<section class="pp">
    <h1>${title}${onlyState ? ' &middot; ' + esc(stateName(onlyState)) : ''}</h1><div class="ps">${sub}</div>
    <div class="ppk">${pk(A, onlyState)}</div>
    <div class="pmap">${mapSvg(A, { print: true, state: onlyState || '' })}</div>
    <div class="plg">${legend(A)}</div>
    ${reconLine(A)}
  </section>`;
  if (!onlyState){
    h += `<section class="pp"><h2>Membership by state &mdash; ${esc(yearLabel(C.year))}</h2>${printStateTable(A)}</section>`;
  }
  states.forEach(s => {
    const ls = sortLines(clubLines(A, s.st, ''), { col: 'name', dir: 1 });
    h += `<section class="pp st"><h2>${esc(s.name)} &mdash; ${esc(yearLabel(C.year))}</h2>
      <div class="ps">${fmt(s.clubsWith)} of ${fmt(s.clubs)} clubs with members &middot; ${fmt(s.total)} memberships${s.unatt ? ' (' + fmt(s.unatt) + ' Unattached)' : ''}</div>
      ${printClubTable(ls)}</section>`;
  });
  h += `<section class="pp end"><h2>Notes</h2><p>${methodNote()}</p>
    <p>Source: membership.members in Neon (Webpoint member exports, names and contact details removed). Map positions: ${esc(C.zipMeta.source)}.</p></section>`;
  el.innerHTML = h;
  document.body.appendChild(el);
  C.state = savedState; C.q = savedQ; C.selClub = savedSel;
  document.body.classList.add('cbx-printing');
  const done = () => { document.body.classList.remove('cbx-printing'); el.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 50);
}
function pk(A, st){
  const ls = st ? A.lines.filter(l => l.st === st) : A.lines;
  return `<span><b>${fmt(ls.reduce((a,l)=>a+l.total,0))}</b> memberships</span><span><b>${fmt(st ? ls.reduce((a,l)=>a+l.people,0) : A.neon.p)}</b> people</span>
    <span><b>${fmt(ls.filter(l=>!l.unatt && l.total).length)}</b> of ${fmt(ls.filter(l=>!l.unatt).length)} clubs with members</span>
    <span><b>${fmt(ls.filter(l=>l.unatt).reduce((a,l)=>a+l.total,0))}</b> Unattached</span>`;
}
function printStateTable(A){
  const rows = A.states.slice().sort(stateOrder);
  return `<table class="pt"><colgroup><col class="cn"><col class="cl"></colgroup><thead><tr><th class="l">State</th><th>Clubs w/ members</th>${C.types.map(t=>`<th>${esc(t)}</th>`).join('')}<th>Unattached</th><th class="tot">Total</th></tr></thead><tbody>
    ${rows.map(s=>`<tr><td class="l">${esc(s.name)}</td><td>${fmt(s.clubsWith)}/${fmt(s.clubs)}</td>${C.types.map(t=>cell(s.by[t])).join('')}${cell(s.unatt)}<td class="tot">${fmt(s.total)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td class="l">All</td><td>${fmt(rows.reduce((a,s)=>a+s.clubsWith,0))}/${fmt(rows.reduce((a,s)=>a+s.clubs,0))}</td>${C.types.map(t=>cell(A.typeTot[t])).join('')}${cell(rows.reduce((a,s)=>a+s.unatt,0))}<td class="tot">${fmt(A.total)}</td></tr></tfoot></table>`;
}
function printClubTable(ls){
  const tot = { by: {}, total: 0, people: 0 };
  ls.forEach(l => { C.types.forEach(t => { if (l.by[t]) tot.by[t] = (tot.by[t] || 0) + l.by[t]; }); tot.total += l.total; tot.people += l.people; });
  return `<table class="pt"><colgroup><col class="cn"><col class="cl"></colgroup><thead><tr><th class="l">Club</th><th class="l">Location</th>${C.types.map(t=>`<th>${esc(t)}</th>`).join('')}<th class="tot">Total</th><th>People</th></tr></thead><tbody>
    ${ls.map(l=>`<tr class="${l.unatt?'un':''}"><td class="l">${esc(l.name)}</td><td class="l loc">${l.unatt ? 'Where members live' : l.info.exact ? esc((l.info.city ? l.info.city + ' ' : '') + l.info.zip) : l.info.zip ? 'Approx. ' + esc(l.info.zip) : '&mdash;'}</td>${C.types.map(t=>cell(l.by[t])).join('')}<td class="tot">${fmt(l.total)}</td><td>${fmt(l.people)}</td></tr>`).join('')}
    </tbody><tfoot><tr><td class="l">State total</td><td></td>${C.types.map(t=>cell(tot.by[t])).join('')}<td class="tot">${fmt(tot.total)}</td><td>${fmt(tot.people)}</td></tr></tfoot></table>`;
}

/* ---------------------------------------------------------------- csv ----- */
function downloadCsv(){
  const A = aggFor(C.year);
  const ls = sortLines(clubLines(A, C.state, ''), { col: 'state', dir: 1 });
  const q = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [['Year', 'State', 'Club', 'Pin ZIP', 'Pin source', ...C.types, 'Total memberships', 'People'].map(q).join(',')];
  ls.forEach(l => lines.push([yearLabel(C.year), stateName(l.st), l.name, l.unatt ? '' : (l.info.zip || ''), l.unatt ? 'Members counted where they live' : l.info.exact ? 'Club address (Webpoint club roster)' : l.info.zip ? 'Approximate: where most members live' : 'No pin', ...C.types.map(t => l.by[t] || 0), l.total, l.people].map(q).join(',')));
  lines.push('');
  lines.push(q(`${yearLabel(C.year)}. ${asOf(C.year)}. Memberships as listed in Webpoint; a person with two types counts once in each.`));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `usa-diving-clubs-${C.year}${C.state ? '-' + C.state : ''}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------------------------------------------------------------- entry --- */
window.renderClubs = function(){
  if (!C.booted){ C.booted = true; loadAll(); return; }
  render();
};
// If someone opened the Clubs tab before this script finished loading, the
// tab click found no renderClubs; draw now so it never sits on "Loading".
{ const v = $('viewClubs'); if (v && v.classList.contains('active')) window.renderClubs(); }
window.BSClubs = { _state: C, aggFor: y => aggFor(y), reload: () => { C.booted = true; loadAll(); } };

})();
