/* Nearby — stand-alone. Clubs, athletes and coaches within a straight-line
   distance of up to four places. Reads nearby-data.json (counts by home ZIP,
   built by db/scripts/build_nearby_data.py), nearby-places.json (every US ZIP,
   for the search box) and nearby-map.json (state outlines, same projection as
   Boundary Studio). Not connected to any proposal or pathway. */
(function () {
  'use strict';
  const COLORS = ['#171F69', '#009AC7', '#E31937', '#15803d'];
  const MAX_SITES = 4;
  const RADII = [25, 50, 75, 100, 150, 200, 250, 300, 400, 500];
  const EARTH_MI = 3958.8;
  const SHOW_CLUBS = 8;
  const S = { data: null, map: null, places: null, cities: null, byZip: null,
              sites: [], radius: 200, year: '2026', fit: true, expanded: {}, sugg: [], suggIdx: -1 };
  const P = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);
  const path = d3.geoPath(P);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('en-US');

  function miles(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const a = Math.sin((lat2 - lat1) * r / 2) ** 2 +
      Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
    return EARTH_MI * 2 * Math.asin(Math.sqrt(a));
  }

  /* ---------- places (search) ---------- */
  function indexPlaces(list) {
    const byZip = new Map(); const cities = new Map();
    for (const [zip, lat, lon, city, st] of list) {
      byZip.set(zip, { lat, lon, city, st });
      const key = (city + ', ' + st).toUpperCase();
      let c = cities.get(key);
      if (!c) { c = { city, st, lats: 0, lons: 0, n: 0 }; cities.set(key, c); }
      c.lats += lat; c.lons += lon; c.n++;
    }
    S.byZip = byZip; S.cities = cities;
  }
  function titleCase(s) { return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()); }
  function resolve(q) {
    q = q.trim();
    if (!q) return { error: 'Type a city and state, or a ZIP code.' };
    if (!S.cities) return { error: 'Place list is still loading. Try again in a moment.' };
    const zm = q.match(/^(\d{5})$/);
    if (zm) {
      const z = S.byZip.get(zm[1]);
      if (!z) return { error: 'ZIP ' + zm[1] + ' isn\u2019t in the US ZIP list.' };
      return { label: titleCase(z.city) + ', ' + z.st + ' ' + zm[1], lat: z.lat, lon: z.lon, basis: 'ZIP ' + zm[1] + ' centre' };
    }
    const m = q.match(/^(.+?)[,\s]+([A-Za-z]{2})$/);
    if (m) {
      const c = S.cities.get((m[1].trim() + ', ' + m[2]).toUpperCase());
      if (c) return cityHit(c);
    }
    const name = (m ? m[1] : q.replace(/,.*$/, '')).trim().toUpperCase();
    const hits = [...S.cities.values()].filter((c) => c.city.toUpperCase() === name).sort((a, b) => b.n - a.n);
    if (m && hits.length) return { error: 'There\u2019s no ' + titleCase(name) + ' in ' + m[2].toUpperCase() + '. Places named ' + titleCase(name) + ': ' + hits.map((h) => h.st).sort().join(', ') + '.' };
    if (hits.length === 1) return cityHit(hits[0]);
    if (hits.length > 1) return { error: 'More than one ' + titleCase(name) + ' (' + hits.map((h) => h.st).sort().join(', ') + '). Add the state, for example ' + titleCase(name) + ', ' + hits[0].st + '.' };
    if (m) return { error: 'Couldn\u2019t find ' + q + '. Check the spelling, or use a ZIP code.' };
    return { error: 'Couldn\u2019t find ' + q + '. Add the state (Knoxville, TN) or use a ZIP code.' };
  }
  function cityHit(c) {
    return { label: titleCase(c.city) + ', ' + c.st, lat: c.lats / c.n, lon: c.lons / c.n,
             basis: 'middle of ' + c.n + ' ZIP code' + (c.n === 1 ? '' : 's') };
  }
  function suggestions(q) {
    q = q.trim().toUpperCase();
    if (q.length < 3 || !S.cities || /^\d+$/.test(q)) return [];
    const out = [];
    for (const [key, c] of S.cities) {
      if (key.startsWith(q)) { out.push(c); if (out.length >= 40) break; }
    }
    out.sort((a, b) => b.n - a.n || a.city.localeCompare(b.city));
    return out.slice(0, 8).map((c) => titleCase(c.city) + ', ' + c.st);
  }
  function nearestPlace(lat, lon) {
    let best = null, bd = Infinity;
    for (const c of S.cities.values()) {
      const d = miles(lat, lon, c.lats / c.n, c.lons / c.n);
      if (d < bd) { bd = d; best = c; }
    }
    return best ? { c: best, d: bd } : null;
  }


  /* ---------- live read (no GitHub step needed after a roster import) ----------
     Same rules as db/scripts/build_nearby_data.py, run in the browser against the
     database. Only counts leave the database: no names, no member ids. */
  const SQL_ZIPS = `WITH m AS (
      SELECT membership_year y, member_id, min(left(zip5,5)) z,
             bool_or(membership_type LIKE '%Athlete%') a,
             bool_or(membership_type LIKE 'Competition Athlete%') ca,
             bool_or(membership_type LIKE '%Coach%') co
        FROM membership.members WHERE membership_year >= 2024 GROUP BY 1,2)
    SELECT y, z, count(*)::int n, count(*) FILTER (WHERE a)::int a,
           count(*) FILTER (WHERE ca)::int ca, count(*) FILTER (WHERE co)::int co
      FROM m GROUP BY 1,2`;
  const SQL_CLUBS = `WITH m AS (
      SELECT membership_year y, member_id, min(left(zip5,5)) z
        FROM membership.members WHERE membership_year >= 2024 GROUP BY 1,2)
    SELECT r.membership_year y, r.club, m.z, count(DISTINCT r.member_id)::int n,
           count(DISTINCT r.member_id) FILTER (WHERE r.membership_type LIKE '%Coach%')::int nc
      FROM membership.members r JOIN m ON m.y = r.membership_year AND m.member_id = r.member_id
     WHERE r.membership_year >= 2024 AND coalesce(r.club,'') <> '' GROUP BY 1,2,3`;
  const SQL_LOADED = `SELECT membership_year y, max(loaded_at)::text t FROM membership.members WHERE membership_year >= 2024 GROUP BY 1`;

  async function liveData() {
    if (!window.NEON || !S.byZip) throw new Error('database connection not available');
    const [zr, cr, lr] = await Promise.all([NEON.query(SQL_ZIPS), NEON.query(SQL_CLUBS), NEON.query(SQL_LOADED)]);
    const years = {};
    const Y = (y) => years[y] || (years[y] = { roster_loaded: null, members_total: 0, zips: {}, clubs: [], unplaced: { members: 0, athletes: 0, coaches: 0, clubs: [] } });
    const loc = (z) => { const p = z && S.byZip.get(z); return p ? [p.lat, p.lon] : null; };
    for (const r of zr.rows) {
      const y = Y(String(r.y)); const n = +r.n, a = +r.a, ca = +r.ca, co = +r.co; y.members_total += n;
      const p = loc(r.z);
      if (p) y.zips[r.z] = [p[0], p[1], n, a, ca, co];
      else { y.unplaced.members += n; y.unplaced.athletes += a; y.unplaced.coaches += co; }
    }
    for (const r of lr.rows) Y(String(r.y)).roster_loaded = r.t;
    const byClub = new Map();
    for (const r of cr.rows) {
      const k = r.y + '\u0000' + r.club; let c = byClub.get(k);
      if (!c) { c = { y: String(r.y), name: r.club, pts: [], coaches: 0 }; byClub.set(k, c); }
      c.coaches += +r.nc;
      const p = loc(r.z); if (p) c.pts.push({ z: r.z, p, n: +r.n, nc: +r.nc });
    }
    const names = [...byClub.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const c of names) {
      const y = Y(c.y); const N = c.pts.reduce((s, q) => s + q.n, 0);
      if (!N) { y.unplaced.clubs.push(c.name); continue; }
      const mid = [c.pts.reduce((s, q) => s + q.p[0] * q.n, 0) / N, c.pts.reduce((s, q) => s + q.p[1] * q.n, 0) / N];
      const cand = c.pts.filter((q) => q.nc > 0); const rule = cand.length ? 'coach' : 'member';
      const pick = (cand.length ? cand : c.pts).slice().sort((a, b) =>
        (miles(a.p[0], a.p[1], mid[0], mid[1]) - miles(b.p[0], b.p[1], mid[0], mid[1])) || (a.z < b.z ? -1 : 1))[0];
      y.clubs.push([c.name, pick.p[0], pick.p[1], rule, N, c.coaches, rule === 'member' && N < 3]);
    }
    return years;
  }

  /* ---------- counting ---------- */
  function compute() {
    const Y = S.data.years[S.year]; const R = S.radius;
    const zips = Object.entries(Y.zips);
    const res = S.sites.map((s) => {
      const inZip = new Set(); let m = 0, a = 0, ca = 0, co = 0;
      for (const [z, v] of zips) {
        if (miles(s.lat, s.lon, v[0], v[1]) <= R) { inZip.add(z); m += v[2]; a += v[3]; ca += v[4]; co += v[5]; }
      }
      const clubs = [];
      for (const c of Y.clubs) {
        const d = miles(s.lat, s.lon, c[1], c[2]);
        if (d <= R) clubs.push({ name: c[0], lat: c[1], lon: c[2], rule: c[3], n: c[4], coaches: c[5], unc: c[6], d });
      }
      clubs.sort((x, y) => x.d - y.d || x.name.localeCompare(y.name));
      return { site: s, inZip, members: m, ath: a, comp: ca, coach: co, clubs };
    });
    return res;
  }
  function sumZips(set) {
    const Y = S.data.years[S.year]; let m = 0, a = 0, ca = 0, co = 0;
    for (const z of set) { const v = Y.zips[z]; m += v[2]; a += v[3]; ca += v[4]; co += v[5]; }
    return { m, a, ca, co };
  }

  /* ---------- rendering ---------- */
  function shell() {
    const yrs = Object.keys(S.data.years).sort().reverse();
    $('app').innerHTML = `
      <div class="card"><div class="card-b">
        <h2>Places to compare</h2>
        <div class="controls">
          <div class="fld search-wrap"><label for="siteQ">City and state, or ZIP code</label>
            <input id="siteQ" type="text" autocomplete="off" placeholder="Morgantown, WV" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="sugg">
            <ul id="sugg" class="sugg" role="listbox" hidden></ul></div>
          <button class="btn" id="addBtn" type="button">Add place</button>
          <div class="fld"><label for="radius">Distance</label>
            <select id="radius">${RADII.map((r) => `<option value="${r}"${r === S.radius ? ' selected' : ''}>Within ${r} miles</option>`).join('')}</select></div>
          <div class="fld"><label for="year">Membership year</label>
            <select id="year">${yrs.map((y) => `<option value="${y}"${y === S.year ? ' selected' : ''}>${y}</option>`).join('')}</select></div>
          <button class="btn ghost" id="csvBtn" type="button">Download club lists (CSV)</button>
        </div>
        <div class="err" id="err" role="alert"></div>
        <div class="hint">Up to ${MAX_SITES} places. You can also click the map to drop a place.</div>
        <div class="chips" id="chips"></div>
        <div class="examples" id="examples"></div>
      </div></div>
      <div class="card map-card">
        <div class="map-tools"><span class="note" id="mapNote"></span>
          <button class="btn ghost" id="fitBtn" type="button"></button></div>
        <svg id="map" role="img" aria-label="Map of the United States with a circle around each place"></svg>
        <div class="legend"><span><i></i>Club (placed at a coach's home ZIP)</span><span id="legendSites"></span></div>
      </div>
      <div id="results"></div>
      <div class="card"><div class="card-b prov" id="prov"></div></div>`;
    const q = $('siteQ');
    q.addEventListener('input', () => { $('err').textContent = ''; S.sugg = suggestions(q.value); S.suggIdx = -1; drawSugg(); });
    q.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && S.sugg.length) { S.suggIdx = (S.suggIdx + 1) % S.sugg.length; drawSugg(); e.preventDefault(); }
      else if (e.key === 'ArrowUp' && S.sugg.length) { S.suggIdx = (S.suggIdx - 1 + S.sugg.length) % S.sugg.length; drawSugg(); e.preventDefault(); }
      else if (e.key === 'Enter') { if (S.suggIdx >= 0) q.value = S.sugg[S.suggIdx]; hideSugg(); addFromInput(); e.preventDefault(); }
      else if (e.key === 'Escape') hideSugg();
    });
    q.addEventListener('blur', () => setTimeout(hideSugg, 150));
    $('addBtn').addEventListener('click', addFromInput);
    $('radius').addEventListener('change', (e) => { S.radius = +e.target.value; update(); });
    $('year').addEventListener('change', (e) => { S.year = e.target.value; update(); });
    $('fitBtn').addEventListener('click', () => { S.fit = !S.fit; drawMap(compute()); });
    $('csvBtn').addEventListener('click', downloadCsv);
    $('map').addEventListener('click', onMapClick);
  }
  function drawSugg() {
    const ul = $('sugg'); const q = $('siteQ');
    if (!S.sugg.length) { hideSugg(); return; }
    ul.innerHTML = S.sugg.map((s, i) => `<li role="option" id="sg${i}" aria-selected="${i === S.suggIdx}">${esc(s)}</li>`).join('');
    ul.hidden = false; q.setAttribute('aria-expanded', 'true');
    if (S.suggIdx >= 0) q.setAttribute('aria-activedescendant', 'sg' + S.suggIdx); else q.removeAttribute('aria-activedescendant');
    ul.querySelectorAll('li').forEach((li, i) => li.addEventListener('mousedown', (e) => { e.preventDefault(); q.value = S.sugg[i]; hideSugg(); addFromInput(); }));
  }
  function hideSugg() { const ul = $('sugg'); if (ul) { ul.hidden = true; ul.innerHTML = ''; } S.sugg = []; S.suggIdx = -1; const q = $('siteQ'); if (q) { q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); } }

  function addSite(s) {
    if (S.sites.length >= MAX_SITES) { $('err').textContent = 'Up to ' + MAX_SITES + ' places. Remove one first.'; return false; }
    if (S.sites.some((x) => x.label === s.label)) { $('err').textContent = s.label + ' is already on the list.'; return false; }
    const used = new Set(S.sites.map((x) => x.color));
    s.color = COLORS.find((c) => !used.has(c));
    S.sites.push(s); S.fit = true; update(); return true;
  }
  function addFromInput() {
    const q = $('siteQ'); const r = resolve(q.value);
    if (r.error) { $('err').textContent = r.error; return; }
    if (addSite(r)) { q.value = ''; $('err').textContent = ''; }
  }
  function onMapClick(e) {
    if (!S.cities) return;
    const svg = $('map'); const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const p = pt.matrixTransform(ctm.inverse());
    const ll = P.invert([p.x, p.y]);
    if (!ll) { $('err').textContent = 'That spot is outside the map.'; return; }
    const near = nearestPlace(ll[1], ll[0]);
    const label = near && near.d < 15 ? 'Near ' + titleCase(near.c.city) + ', ' + near.c.st : 'Map point ' + ll[1].toFixed(2) + ', ' + ll[0].toFixed(2);
    addSite({ label, lat: ll[1], lon: ll[0], basis: 'map click at ' + ll[1].toFixed(3) + ', ' + ll[0].toFixed(3) });
  }

  function update() {
    const res = compute();
    drawChips(); drawMap(res); drawResults(res); drawProv(); writeHash();
  }
  function drawChips() {
    $('chips').innerHTML = S.sites.map((s, i) =>
      `<span class="chip" title="${esc(s.basis)}"><span class="sw" style="background:${s.color}"></span>${esc(s.label)}<button type="button" data-rm="${i}" aria-label="Remove ${esc(s.label)}">&times;</button></span>`).join('');
    $('chips').querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { S.sites.splice(+b.dataset.rm, 1); update(); }));
    const ex = ['Morgantown, WV', 'Knoxville, TN', 'Greensboro, NC'].filter((x) => !S.sites.some((s) => s.label === x));
    $('examples').innerHTML = S.sites.length ? '' : 'Try: ' + ex.map((x) => `<button type="button" data-ex="${esc(x)}">${esc(x)}</button>`).join('');
    $('examples').querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => { const r = resolve(b.dataset.ex); if (!r.error) addSite(r); }));
    $('legendSites').innerHTML = S.sites.length ? 'Shaded circle = within ' + S.radius + ' miles' : '';
  }
  function circleFeature(s) {
    return d3.geoCircle().center([s.lon, s.lat]).radius(S.radius / EARTH_MI * 180 / Math.PI).precision(2)();
  }
  function drawMap(res) {
    const M = S.map; const svg = $('map');
    let vb = M.viewBox.split(' ').map(Number);
    if (S.fit && S.sites.length) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const s of S.sites) {
        const b = path.bounds(circleFeature(s));
        if (isFinite(b[0][0])) { x0 = Math.min(x0, b[0][0]); y0 = Math.min(y0, b[0][1]); x1 = Math.max(x1, b[1][0]); y1 = Math.max(y1, b[1][1]); }
      }
      if (isFinite(x0)) {
        const pad = 24; let w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
        const aspect = 975 / 610; if (w / h < aspect) w = h * aspect; else h = w / aspect;
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; vb = [cx - w / 2, cy - h / 2, w, h];
      }
    }
    const k = vb[2] / 975; /* keep strokes and dots the same size on screen */
    svg.setAttribute('viewBox', vb.map((v) => v.toFixed(1)).join(' '));
    const inAny = new Map();
    res.forEach((r) => r.clubs.forEach((c) => { if (!inAny.has(c.name)) inAny.set(c.name, r.site.color); }));
    const Y = S.data.years[S.year];
    let h = `<g>${M.states.map(([, d]) => `<path class="land" d="${d}"/>`).join('')}</g>` +
      `<path class="mesh" d="${M.mesh}" style="stroke-width:${k}"/><path class="nat" d="${M.nation}" style="stroke-width:${0.8 * k}"/>`;
    h += S.sites.map((s) => `<path d="${path(circleFeature(s))}" fill="${s.color}" fill-opacity=".10" stroke="${s.color}" stroke-width="${1.6 * k}"/>`).join('');
    for (const c of Y.clubs) {
      const p = P([c[2], c[1]]); if (!p) continue;
      const col = inAny.get(c[0]);
      h += `<circle class="club${col ? ' in' : ''}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(col ? 3 : 2) * k}" ${col ? `style="fill:${col}"` : ''}><title>${esc(c[0])}</title></circle>`;
    }
    for (const s of S.sites) {
      const p = P([s.lon, s.lat]); if (!p) continue;
      h += `<circle class="site-dot" cx="${p[0]}" cy="${p[1]}" r="${5 * k}" fill="${s.color}" style="stroke-width:${1.6 * k}"/>` +
        `<text class="site-lbl" x="${p[0] + 8 * k}" y="${p[1] - 6 * k}" style="font-size:${13 * k}px;stroke-width:${3 * k}px">${esc(s.label)}</text>`;
    }
    svg.innerHTML = h;
    $('fitBtn').textContent = S.fit ? 'Show whole country' : 'Zoom to places';
    $('fitBtn').hidden = !S.sites.length;
    $('mapNote').textContent = S.sites.length ? '' : 'Click anywhere on the map to drop a place.';
  }
  function kpiHtml(r) {
    return `<div class="kpis">
      <div class="kpi"><div class="l">Clubs</div><div class="v">${fmt(r.clubs.length)}</div>
        <div class="s">${r.clubs.filter((c) => c.unc).length ? r.clubs.filter((c) => c.unc).length + ' with location uncertain' : 'placed by coach home ZIP'}</div></div>
      <div class="kpi"><div class="l">Coaches</div><div class="v">${fmt(r.coach)}</div><div class="s">unique members</div></div>
      <div class="kpi wide"><div class="l">Athletes</div><div class="v">${fmt(r.ath)}</div>
        <div class="s">unique members &middot; ${fmt(r.comp)} Competition Athletes</div></div>
      <div class="kpi wide"><div class="l">All members</div><div class="v">${fmt(r.members)}</div>
        <div class="s">every membership type, including judges and officials</div></div></div>`;
  }
  function basisText(c) {
    if (c.rule === 'coach') return c.coaches === 1 ? 'Placed at its coach\u2019s home ZIP' : 'Placed at the home ZIP of 1 of its ' + c.coaches + ' coaches';
    return 'No coach on the roster; placed at a member\u2019s home ZIP';
  }
  function clubRows(r, idx) {
    const all = r.clubs; const open = S.expanded[idx];
    const list = open ? all : all.slice(0, SHOW_CLUBS);
    const rows = list.map((c) => `<tr><td>${esc(c.name)}${c.unc ? '<span class="tag unc">Location uncertain</span>' : c.n < 3 ? `<span class="tag small">${c.n} member${c.n === 1 ? '' : 's'}</span>` : ''}
      <div class="basis">${basisText(c)}</div></td><td class="num">${Math.round(c.d)} mi</td></tr>`).join('');
    const more = all.length > SHOW_CLUBS ? `<div class="more"><button type="button" data-more="${idx}">${open ? 'Show fewer' : 'Show all ' + all.length + ' clubs'}</button></div>` : '';
    return all.length ? `<div class="scroll-x"><table class="clubs-t"><thead><tr><th>Club</th><th class="num">Distance</th></tr></thead><tbody>${rows}</tbody></table></div>${more}`
      : '<div class="hint">No clubs placed within this distance.</div>';
  }
  function drawResults(res) {
    const el = $('results');
    if (!res.length) { el.innerHTML = '<div class="card"><div class="empty">Add a place to see the clubs, athletes and coaches within ' + S.radius + ' miles.</div></div>'; return; }
    let h = '<div class="sites">' + res.map((r, i) => `<section class="site" style="border-top-color:${r.site.color}" aria-label="${esc(r.site.label)}">
        <h3>${esc(r.site.label)}</h3><div class="where">Within ${S.radius} miles &middot; ${S.year} members</div>
        ${kpiHtml(r)}${clubRows(r, i)}</section>`).join('') + '</div>';
    if (res.length > 1) {
      const pairs = [];
      for (let i = 0; i < res.length; i++) for (let j = i + 1; j < res.length; j++) {
        const a = res[i], b = res[j];
        const both = new Set([...a.inZip].filter((z) => b.inZip.has(z)));
        const t = sumZips(both);
        const names = new Set(b.clubs.map((c) => c.name));
        const shared = a.clubs.filter((c) => names.has(c.name)).map((c) => c.name);
        pairs.push(`<tr><td>${esc(a.site.label)} and ${esc(b.site.label)}</td><td class="num">${shared.length}</td><td class="num">${fmt(t.a)}</td><td class="num">${fmt(t.co)}</td><td>${shared.length ? esc(shared.join(', ')) : '&mdash;'}</td></tr>`);
      }
      const any = new Set(); res.forEach((r) => r.inZip.forEach((z) => any.add(z)));
      const u = sumZips(any); const uc = new Set(); res.forEach((r) => r.clubs.forEach((c) => uc.add(c.name)));
      h += `<div class="card" style="margin-top:16px"><div class="card-b overlap"><h2>Where the circles overlap</h2>
        <div>The places above are counted separately, so a club or athlete inside two circles is counted in both.</div>
        <div class="scroll-x"><table><thead><tr><th>Both places</th><th class="num">Clubs</th><th class="num">Athletes</th><th class="num">Coaches</th><th>Clubs in both</th></tr></thead><tbody>${pairs.join('')}</tbody>
        <tfoot><tr><th>Inside any circle (counted once)</th><th class="num">${fmt(uc.size)}</th><th class="num">${fmt(u.a)}</th><th class="num">${fmt(u.co)}</th><th></th></tr></tfoot></table></div></div></div>`;
    }
    el.innerHTML = h;
    el.querySelectorAll('[data-more]').forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.more; S.expanded[i] = !S.expanded[i]; drawResults(res); }));
  }
  function drawProv() {
    const D = S.data, Y = D.years[S.year], U = Y.unplaced || {};
    const loaded = Y.roster_loaded ? new Date(Y.roster_loaded).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'date not recorded';
    const nUnc = Y.clubs.filter((c) => c[6]).length;
    const how = S.mode === 'live'
      ? 'Read live from the membership database when this page opened, so a new roster import shows up on the next page load. '
      : '<span class="tag unc">Saved copy</span> The live database read didn\u2019t work' + (S.liveError ? ' (' + esc(S.liveError) + ')' : '') + ', so this is the saved copy built ' + esc(D.built) + '. Reload to try the live read again. ';
    $('prov').innerHTML = `<b>Where these numbers come from.</b> ${how}${esc(S.year)} USA Diving membership roster, imported ${esc(loaded)}: ${fmt(Y.members_total)} unique members, Current and Pending.
      Each member is counted once, at their home ZIP code. <b>Athletes</b> are any Athlete membership type (17U, 18+, Competition, Introductory); plain Lifetime members aren't counted as athletes because the type doesn't say.
      <b>Coaches</b> are Coach, Competition Coach and Lifetime Coach.
      <b>Distance</b> is straight-line miles from the place to the centre of the member's home ZIP code, not driving distance. A city is placed at the middle of its ZIP codes.
      <b>Clubs</b> have no stored address. ${esc(D.club_rule)} ${nUnc} of ${Y.clubs.length} clubs are flagged location uncertain.
      Not placed: ${fmt(U.members || 0)} members with no usable US ZIP code${(U.clubs || []).length ? ', and ' + U.clubs.length + ' club' + (U.clubs.length === 1 ? '' : 's') + ' with no placed members' : ''}.
      ZIP locations: ${esc(D.zip_locations)}.`;
  }
  function downloadCsv() {
    const res = compute();
    if (!res.length) { $('err').textContent = 'Add a place first.'; return; }
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = [['Place', 'Within miles', 'Year', 'Club', 'Miles', 'How the club is placed', 'Members with a usable ZIP', 'Location uncertain'].map(q).join(',')];
    res.forEach((r) => r.clubs.forEach((c) => lines.push([r.site.label, S.radius, S.year, c.name, Math.round(c.d), basisText(c), c.n, c.unc ? 'Yes' : 'No'].map(q).join(','))));
    lines.push('');
    lines.push(['Place', 'Within miles', 'Year', 'Clubs', 'Athletes', 'Competition Athletes', 'Coaches', 'All members'].map(q).join(','));
    res.forEach((r) => lines.push([r.site.label, S.radius, S.year, r.clubs.length, r.ath, r.comp, r.coach, r.members].map(q).join(',')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv' }));
    a.download = 'nearby-' + S.radius + 'mi-' + S.year + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  }
  function writeHash() {
    const s = S.sites.map((x) => [x.lat.toFixed(4), x.lon.toFixed(4), encodeURIComponent(x.label), encodeURIComponent(x.basis)].join(',')).join('|');
    history.replaceState(null, '', '#r=' + S.radius + '&y=' + S.year + (s ? '&s=' + s : ''));
  }
  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (RADII.includes(+h.get('r'))) S.radius = +h.get('r');
    if (h.get('y') && S.data.years[h.get('y')]) S.year = h.get('y');
    ((location.hash.match(/[#&]s=([^&]*)/) || [])[1] || '').split(/\||%7C/i).filter(Boolean).slice(0, MAX_SITES).forEach((t, i) => {
      const [lat, lon, label, basis] = t.split(',');
      if (isFinite(+lat) && isFinite(+lon)) S.sites.push({ lat: +lat, lon: +lon, label: decodeURIComponent(label || 'Place'), basis: decodeURIComponent(basis || ''), color: COLORS[i] });
    });
  }

  async function getJson(u) { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
  async function init() {
    try {
      const [data, map, pl] = await Promise.all([getJson('nearby-data.json'), getJson('nearby-map.json'), getJson('nearby-places.json')]);
      S.snapshot = data; S.map = map; indexPlaces(pl.places);
      S.data = data; S.mode = 'saved';
    } catch (e) {
      $('app').innerHTML = '<div class="card"><div class="empty">Couldn\u2019t load the page data (' + esc(e.message) + '). Reload the page to try again.</div></div>';
      return;
    }
    try {
      const years = await liveData();
      if (Object.keys(years).length) { S.data = Object.assign({}, S.snapshot, { years }); S.mode = 'live'; }
    } catch (e) { S.liveError = e.message; }
    S.year = Object.keys(S.data.years).sort().pop();
    readHash(); shell(); update();
  }
  if (typeof window !== 'undefined') window.__nearby = { S, resolve, compute, miles, indexPlaces, liveData };
  init();
})();
