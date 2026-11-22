/* Deckside — sponsorship inventory, venue photo zones and broadcast commercial time.
   One shared document (deckside.workspace, id='main') plus image rows in
   deckside.files. Works from localStorage / IndexedDB when the database is
   unreachable and syncs when it is. */
(function () {
  'use strict';

  var LOCAL_ONLY = /[?&]local=1/.test(location.search);
  var LS_KEY = LOCAL_ONLY ? 'deckside_doc_localtest' : 'deckside_doc_v1';
  var LS_BASE = LOCAL_ONLY ? 'deckside_base_localtest' : 'deckside_base_v1';
  var STATUSES = ['Open', 'Held', 'Sold', 'Comped', 'Facility'];
  var STATUS_COLOR = { Open: '#059669', Held: '#d97706', Sold: '#171f69', Comped: '#6b7280', Facility: '#6b7280' };

  var doc = null;
  var cloud = { ready: false, base: '', pushing: false, timer: null, conflict: false };
  var ui = { tab: 'inventory', photoId: null, zoneId: null, maskDraft: null, drag: null, filter: '' };

  /* ── helpers ─────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function uid(p) { return (p || 'x') + Math.random().toString(36).slice(2, 10); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Math.round(n || 0).toLocaleString('en-US'); }
  function num(v) { var n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
  function clock(sec) { sec = Math.round(sec); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }
  function pl(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function toast(m, kind) { if (window.USAD && USAD.toast) USAD.toast(m, { kind: kind || 'info' }); }

  /* ── starting document ───────────────────────────────── */
  function seedDoc() {
    var tiers = [
      { name: 'Marquee', low: 4000, high: 7500 },
      { name: 'Prominent', low: 1500, high: 2500 },
      { name: 'Standard', low: 800, high: 1500 },
      { name: 'Programmatic', low: 400, high: 800 }
    ];
    function a(name, area, tier, qty, status, notes) {
      return { id: uid('a'), name: name, area: area, tier: tier, qty: qty, status: status, sponsor: '', price: '', notes: notes || '' };
    }
    var assets = [
      a('Tower wrap, 10m level', 'Diving tower', 'Marquee', 1, 'Open', ''),
      a('Tower wrap, 7.5m level', 'Diving tower', 'Marquee', 1, 'Open', ''),
      a('Tower wrap, 5m level', 'Diving tower', 'Marquee', 1, 'Open', ''),
      a('Tower base banner', 'Diving tower', 'Marquee', 1, 'Open', 'USA Diving banner hung here in 2025'),
      a('Hanging banners from tower', 'Diving tower', 'Prominent', 2, 'Open', 'Count to confirm on site'),
      a('Pillar A, dive well', 'Dive well deck', 'Prominent', 1, 'Open', ''),
      a('Pillar B, dive well', 'Dive well deck', 'Prominent', 1, 'Open', ''),
      a('Pillar C, dive well', 'Dive well deck', 'Prominent', 1, 'Open', ''),
      a('Backdrop behind 3m springboards', 'Dive well deck', 'Prominent', 1, 'Open', 'USA Diving step-and-repeat in 2025'),
      a('Backdrop behind 1m springboards', 'Dive well deck', 'Prominent', 1, 'Open', 'USA Diving step-and-repeat in 2025'),
      a('Athlete walk-out arch', 'Pool deck', 'Prominent', 1, 'Open', 'USA Diving arch in 2025'),
      a('Curved backdrop by scoring table', 'Pool deck', 'Standard', 1, 'Open', '')
    ];
    var frames2025 = ['Colorado Time Systems', 'USA Diving', 'ARK', 'COM Aquatics', 'ARK', 'Diamondback Energy', 'Frost', 'Insignia'];
    frames2025.forEach(function (n, i) {
      assets.push(a('Deck frame sign ' + (i + 1), i < 4 ? 'Pool deck, bleacher side' : 'Pool deck, entry side', 'Programmatic', 1, 'Open', '2025 photos show ' + n + ' here'));
    });
    assets.push(a('Scoring table front, left', 'Scoring table', 'Programmatic', 1, 'Open', '2025 photos show Visit Midland here'));
    assets.push(a('Scoring table front, right', 'Scoring table', 'Programmatic', 1, 'Open', '2025 photos show Frost here'));
    assets.push(a('Hospitality room', 'Hospitality', 'Standard', 1, 'Open', ''));
    assets.push(a('Dryland area', 'Dryland', 'Standard', 1, 'Open', ''));
    assets.push(a('Medals', 'Awards', 'Prominent', 1, 'Open', ''));
    assets.push(a('Awards ceremony', 'Awards', 'Prominent', 1, 'Open', 'PA mentions and ceremony visibility'));
    assets.push(a('VIP area', 'Event-wide', 'Standard', 1, 'Open', ''));
    var ribbon = a('Medal ribbons', 'Awards', 'Prominent', 1, 'Sold', 'Sold through 2027. Do not pitch.');
    ribbon.sponsor = 'Royal Caribbean';
    assets.push(ribbon);
    assets.push(a('Scoreboard logos', 'Main pool wall', 'Marquee', 1, 'Facility', 'Facility controls scoreboard sponsors'));

    var shows = [
      ['Fri Dec 11, Senior Men 3M Final', 0], ['Fri Dec 11, Senior Women 10M Final', 2],
      ['Sat Dec 12, Senior Men 1M Final', 1], ['Sat Dec 12, Senior Women 3M Final', 1],
      ['Sun Dec 13, Senior Men 10M Final', 1], ['Sun Dec 13, Senior Women 1M Final', 1]
    ].map(function (s) { return { id: uid('s'), name: s[0], ceremonyBreaks: s[1] }; });

    var venueId = uid('v');
    var d = {
      v: 1,
      venues: [{ id: venueId, name: 'COM Aquatics', city: 'Midland, TX', photos: [] }],
      events: [{
        id: uid('e'), name: '2026 Winter National Championships', dates: 'Dec 9-15, 2026', venueId: venueId,
        tiers: tiers, assets: assets, zoneCreative: {},
        broadcast: { share: 0.25, inShowSec: 360, ceremonySec: 180, unitPrice: 350, shows: shows, slots: [] }
      }]
    };
    d.activeEventId = d.events[0].id;
    d.events[0].broadcast.shows.forEach(function (s) { fillSlots(d.events[0].broadcast, s); });
    return d;
  }

  function ev() { return doc.events.filter(function (e) { return e.id === doc.activeEventId; })[0] || doc.events[0]; }
  function venue() { var e = ev(); return doc.venues.filter(function (v) { return v.id === e.venueId; })[0] || doc.venues[0]; }
  function photo() { var v = venue(); return v.photos.filter(function (p) { return p.id === ui.photoId; })[0] || null; }
  function zone() { var p = photo(); return p ? p.zones.filter(function (z) { return z.id === ui.zoneId; })[0] || null : null; }
  function assetById(id) { return ev().assets.filter(function (a) { return a.id === id; })[0] || null; }
  // Sponsor artwork for this event. A zone or 3D sign linked to an asset shares that asset's artwork.
  function creativeOf(item) { var e = ev(); return e.zoneCreative[item.id] || (item.assetId && e.assetCreative && e.assetCreative[item.assetId]) || null; }
  function setCreativeFor(item, fileId) { var e = ev(); e.zoneCreative[item.id] = fileId; if (item.assetId) { e.assetCreative = e.assetCreative || {}; e.assetCreative[item.assetId] = fileId; } }
  function clearCreativeFor(item) { var e = ev(); delete e.zoneCreative[item.id]; if (item.assetId && e.assetCreative) delete e.assetCreative[item.assetId]; }
  function tierOf(a) { return ev().tiers.filter(function (t) { return t.name === a.tier; })[0] || { low: 0, high: 0 }; }

  /* ── valuation ───────────────────────────────────────── */
  function assetValue(a) {
    var t = tierOf(a), q = num(a.qty) || 0, p = num(a.price);
    if (a.price !== '' && a.price != null && p >= 0 && String(a.price).trim() !== '') return { low: p * q, high: p * q, set: true };
    return { low: t.low * q, high: t.high * q, set: false };
  }
  function showSeconds(bc, s) { return (num(bc.inShowSec) + num(s.ceremonyBreaks) * num(bc.ceremonySec)) * num(bc.share); }
  function slotPrice(bc, sl) { return (sl.price !== '' && sl.price != null) ? num(sl.price) : num(bc.unitPrice) * sl.len / 30; }
  function fillSlots(bc, s) {
    var used = bc.slots.filter(function (x) { return x.showId === s.id; }).reduce(function (t, x) { return t + x.len; }, 0);
    var left = Math.round(showSeconds(bc, s)) - used;
    while (left >= 30) { bc.slots.push({ id: uid('k'), showId: s.id, len: 30, status: 'Open', sponsor: '', spot: '', price: '' }); left -= 30; }
    if (left >= 15) { bc.slots.push({ id: uid('k'), showId: s.id, len: 15, status: 'Open', sponsor: '', spot: '', price: '' }); }
  }
  function totals() {
    var e = ev(), t = { openLow: 0, openHigh: 0, openN: 0, sold: 0, soldN: 0, heldLow: 0, heldHigh: 0, heldN: 0, bcOpen: 0, bcOpenSec: 0, bcSold: 0, bcSoldSec: 0, bcSec: 0 };
    e.assets.forEach(function (a) {
      var v = assetValue(a);
      if (a.status === 'Open') { t.openLow += v.low; t.openHigh += v.high; t.openN += num(a.qty); }
      else if (a.status === 'Held') { t.heldLow += v.low; t.heldHigh += v.high; t.heldN += num(a.qty); }
      else if (a.status === 'Sold') { if (v.set) t.sold += v.low; t.soldN += num(a.qty); }
    });
    var bc = e.broadcast;
    bc.shows.forEach(function (s) { t.bcSec += showSeconds(bc, s); });
    bc.slots.forEach(function (sl) {
      if (sl.status === 'Sold') { t.bcSold += slotPrice(bc, sl); t.bcSoldSec += sl.len; }
      else if (sl.status === 'Open' || sl.status === 'Held') { t.bcOpen += slotPrice(bc, sl); t.bcOpenSec += sl.len; }
    });
    return t;
  }

  /* ── storage: local document ─────────────────────────── */
  function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(doc)); } catch (e) {} }
  function changed() { saveLocal(); renderKpis(); schedulePush(); }

  /* ── storage: database ───────────────────────────────── */
  function setBadge(text, cls) { var b = $('syncBadge'); b.textContent = text; b.className = 'dk-sync' + (cls ? ' ' + cls : ''); }
  function schedulePush() {
    if (!cloud.ready || cloud.conflict) { if (!cloud.ready) setBadge('Saved on this device only', 'warn'); return; }
    setBadge('Saving');
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(push, 1200);
  }
  async function push() {
    if (cloud.pushing) { schedulePush(); return; }
    cloud.pushing = true;
    try {
      var r = await NEON.query(
        "INSERT INTO deckside.workspace (id, data, updated_by) VALUES ('main', $1::jsonb, $2) " +
        "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_by = EXCLUDED.updated_by, updated_at = now() " +
        "WHERE deckside.workspace.updated_at::text = $3 OR $3 = '' RETURNING updated_at::text AS u",
        [JSON.stringify(doc), localStorage.getItem('usad_user_name') || '', cloud.base]);
      if (r.rows.length) { cloud.base = r.rows[0].u; localStorage.setItem(LS_BASE, cloud.base); setBadge('Saved', 'ok'); }
      else { cloud.conflict = true; setBadge('Changed elsewhere. Reload.', 'warn'); toast('Someone else saved changes. Reload the page to get them before editing.', 'warn'); }
    } catch (e) { setBadge('Saved on this device only', 'warn'); }
    cloud.pushing = false;
  }
  async function loadDoc() {
    var local = null;
    try { local = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) {}
    var localBase = localStorage.getItem(LS_BASE) || '';
    try {
      if (LOCAL_ONLY) throw new Error('local only');
      var r = await NEON.query("SELECT data::text AS d, updated_at::text AS u FROM deckside.workspace WHERE id = 'main'");
      cloud.ready = true;
      if (r.rows.length) {
        var row = r.rows[0];
        if (local && localBase === row.u) { doc = local; cloud.base = row.u; setBadge('Saved', 'ok'); push(); }
        else { doc = JSON.parse(row.d); cloud.base = row.u; localStorage.setItem(LS_BASE, cloud.base); saveLocal(); setBadge('Saved', 'ok'); }
      } else { doc = local || seedDoc(); cloud.base = ''; saveLocal(); push(); }
    } catch (e) {
      cloud.ready = false;
      doc = local || seedDoc(); saveLocal();
      setBadge('Saved on this device only', 'warn');
    }
  }

  /* ── storage: images (IndexedDB cache + database) ────── */
  var idb = null, imgCache = {};
  function idbOpen() {
    return new Promise(function (res) {
      try {
        var rq = indexedDB.open('deckside_files', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('f'); };
        rq.onsuccess = function () { idb = rq.result; res(); };
        rq.onerror = function () { res(); };
      } catch (e) { res(); }
    });
  }
  function idbGet(id) { return new Promise(function (res) { if (!idb) return res(null); var rq = idb.transaction('f').objectStore('f').get(id); rq.onsuccess = function () { res(rq.result || null); }; rq.onerror = function () { res(null); }; }); }
  function idbPut(id, v) { if (!idb) return; try { idb.transaction('f', 'readwrite').objectStore('f').put(v, id); } catch (e) {} }
  function loadImage(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
  async function fileUrl(id) {
    var d = await idbGet(id);
    if (!d && cloud.ready) {
      try { var r = await NEON.query('SELECT data FROM deckside.files WHERE id = $1', [id]); if (r.rows.length) { d = r.rows[0].data; idbPut(id, d); } } catch (e) {}
    }
    return d;
  }
  function getImg(id) {
    if (!id) return Promise.resolve(null);
    if (!imgCache[id]) imgCache[id] = fileUrl(id).then(function (d) { return d ? loadImage(d) : null; }).catch(function () { return null; });
    return imgCache[id];
  }
  var heicLib = null;
  function loadHeic() {
    if (!heicLib) heicLib = new Promise(function (res, rej) { var sc = document.createElement('script'); sc.src = 'vendor/heic2any.min.js?v=0.0.4'; sc.onload = function () { res(window.heic2any); }; sc.onerror = rej; document.head.appendChild(sc); });
    return heicLib;
  }
  function isHeic(f) { return /hei[cf]/i.test(f.type || '') || /\.hei[cf]$/i.test(f.name || ''); }
  function isVideo(f) { return /^video\//.test(f.type || '') || /\.(mov|mp4|m4v)$/i.test(f.name || ''); }
  function looksLikePicture(f) { return /^image\//.test(f.type || '') || isHeic(f) || (!f.type && !isVideo(f)); }
  // Opens a picture file. iPhone HEIC photos are converted to JPEG when the browser cannot read them itself.
  async function decodeFile(file) {
    var url = URL.createObjectURL(file);
    try { return await loadImage(url); }
    catch (e) {
      if (!isHeic(file) && file.type) throw e;
      var conv = await loadHeic(), out = await conv({ blob: file, toType: 'image/jpeg', quality: 0.9 });
      var u2 = URL.createObjectURL(Array.isArray(out) ? out[0] : out);
      try { return await loadImage(u2); } finally { URL.revokeObjectURL(u2); }
    } finally { URL.revokeObjectURL(url); }
  }
  // Everything a drop or paste can carry: real files, or a picture dragged out of a web page or app as a link.
  async function filesFrom(dt) {
    if (!dt) return [];
    var out = Array.prototype.slice.call(dt.files || []);
    if (!out.length && dt.items) for (var i = 0; i < dt.items.length; i++) { if (dt.items[i].kind === 'file') { var f = dt.items[i].getAsFile(); if (f) out.push(f); } }
    if (!out.length && dt.getData) {
      var src = '', html = dt.getData('text/html') || '', m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m) src = m[1].replace(/&amp;/g, '&'); else src = (dt.getData('text/uri-list') || '').split(/\r?\n/).filter(function (l) { return l && l[0] !== '#'; })[0] || '';
      if (src) {
        try { var r = await fetch(src), b = await r.blob(); if (/^image\//.test(b.type)) out.push(new File([b], (src.split('/').pop() || 'picture').split('?')[0], { type: b.type })); }
        catch (e) { toast('That picture came as a web link the browser is not allowed to copy. Save it first, or copy and paste it.', 'warn'); }
      }
    }
    return out;
  }

  async function importImage(file, maxEdge) {
    var img = await decodeFile(file);
    var s = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    var w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    var png = /png/i.test(file.type) && w * h <= 1400 * 1400;
    var data = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.86);
    var id = uid('f');
    idbPut(id, data);
    imgCache[id] = loadImage(data);
    if (cloud.ready) {
      NEON.query('INSERT INTO deckside.files (id, name, data, bytes) VALUES ($1, $2, $3, $4)', [id, file.name || '', data, data.length])
        .catch(function () { toast('That picture is saved on this device but did not reach the database.', 'warn'); });
    }
    return { id: id, w: w, h: h, name: (file.name || 'Photo').replace(/\.[a-z0-9]+$/i, '') };
  }

  /* ── KPIs ────────────────────────────────────────────── */
  function renderKpis() {
    var t = totals(), e = ev();
    $('kpis').innerHTML =
      '<div class="dk-kpi"><span>Open physical inventory</span><b>' + money(t.openLow) + ' to ' + money(t.openHigh) + '</b><small>' + pl(t.openN, 'asset') + ' still to sell, at tier prices</small></div>' +
      '<div class="dk-kpi"><span>Sold physical</span><b>' + money(t.sold) + '</b><small>' + pl(t.soldN, 'asset') + ' sold. The total counts only those with a price entered.</small></div>' +
      '<div class="dk-kpi"><span>On hold</span><b>' + money(t.heldLow) + ' to ' + money(t.heldHigh) + '</b><small>' + pl(t.heldN, 'asset') + ' held for a prospect</small></div>' +
      '<div class="dk-kpi"><span>Broadcast time</span><b>' + money(t.bcSold) + ' sold</b><small>' + clock(t.bcOpenSec) + ' of ' + clock(t.bcSec) + ' still open, worth ' + money(t.bcOpen) + ' at $' + num(e.broadcast.unitPrice) + ' per :30</small></div>';
  }

  /* ── inventory tab ───────────────────────────────────── */
  function renderInventory() {
    var e = ev();
    var rows = e.assets.filter(function (a) { return !ui.filter || a.status === ui.filter; });
    var h = '<thead><tr><th>Asset</th><th>Area</th><th>Tier</th><th>Qty</th><th>Status</th><th>Sponsor</th><th>Agreed price each</th><th style="text-align:right">Value</th><th>Notes</th><th></th></tr></thead><tbody>';
    rows.forEach(function (a) {
      var v = assetValue(a);
      h += '<tr data-id="' + a.id + '">' +
        '<td style="min-width:230px"><input data-f="name" value="' + esc(a.name) + '"></td>' +
        '<td style="min-width:170px"><input data-f="area" value="' + esc(a.area) + '"></td>' +
        '<td><select data-f="tier">' + e.tiers.map(function (t) { return '<option' + (t.name === a.tier ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '</select></td>' +
        '<td><input class="num qty" data-f="qty" inputmode="numeric" value="' + esc(a.qty) + '"></td>' +
        '<td><select data-f="status" class="st-' + a.status + '">' + STATUSES.map(function (s) { return '<option' + (s === a.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td>' +
        '<td style="min-width:150px"><input data-f="sponsor" list="sponsorList" value="' + esc(a.sponsor) + '" placeholder="' + (a.status === 'Open' ? '' : 'Who') + '"></td>' +
        '<td><input class="num" data-f="price" inputmode="decimal" value="' + esc(a.price) + '" placeholder="tier"></td>' +
        '<td class="val">' + (a.status === 'Facility' || a.status === 'Comped' ? 'not for sale' : (v.low === v.high ? money(v.low) : money(v.low) + ' to ' + money(v.high))) + '</td>' +
        '<td style="min-width:260px"><input data-f="notes" value="' + esc(a.notes) + '"></td>' +
        '<td><button class="dk-x" data-del="' + a.id + '" title="Remove this asset">Remove</button></td></tr>';
    });
    var t = totals();
    h += '</tbody><tfoot><tr><td colspan="7">Open inventory at tier prices</td><td class="val">' + money(t.openLow) + ' to ' + money(t.openHigh) + '</td><td colspan="2"></td></tr></tfoot>';
    $('invTable').innerHTML = h + '<datalist id="sponsorList">' + sponsorNames().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>';
  }
  function sponsorNames() {
    var s = {}, e = ev();
    e.assets.forEach(function (a) { if (a.sponsor) s[a.sponsor] = 1; });
    e.broadcast.slots.forEach(function (k) { if (k.sponsor) s[k.sponsor] = 1; });
    return Object.keys(s).sort();
  }
  function onInvChange(evt) {
    var el = evt.target, tr = el.closest('tr[data-id]'); if (!tr || !el.dataset.f) return;
    var a = assetById(tr.dataset.id); if (!a) return;
    var f = el.dataset.f, val = el.value;
    if (f === 'qty') val = Math.max(0, Math.round(num(val)));
    if (f === 'price') val = String(val).trim() === '' ? '' : num(val);
    a[f] = val;
    if (f === 'status' && val === 'Open') a.sponsor = '';
    changed();
    if (f === 'status' || f === 'tier' || f === 'qty' || f === 'price') { var y = window.scrollY; renderInventory(); window.scrollTo(0, y); }
  }
  function downloadText(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/csv' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function csvRow(arr) { return arr.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }
  function exportInventoryCsv() {
    var e = ev(), out = [csvRow(['Asset', 'Area', 'Tier', 'Qty', 'Status', 'Sponsor', 'Agreed price each', 'Value low', 'Value high', 'Notes'])];
    e.assets.forEach(function (a) { var v = assetValue(a); out.push(csvRow([a.name, a.area, a.tier, a.qty, a.status, a.sponsor, a.price, v.low, v.high, a.notes])); });
    downloadText('deckside-inventory.csv', out.join('\n'));
  }
  function editTiers() {
    var e = ev();
    var html = '<div class="dk-form"><b>Tier</b><b>Low to high, per asset</b>' + e.tiers.map(function (t, i) {
      return '<input data-i="' + i + '" data-k="name" value="' + esc(t.name) + '"><span style="display:flex;gap:4px"><input data-i="' + i + '" data-k="low" value="' + t.low + '"><input data-i="' + i + '" data-k="high" value="' + t.high + '"></span>';
    }).join('') + '</div>';
    USAD.modal.open({ title: 'Price tiers for this event', contentHTML: html, buttons: [
      { label: 'Cancel' },
      { label: 'Save', kind: 'primary', onClick: function (close, dlg) {
        dlg.querySelectorAll('input[data-i]').forEach(function (inp) {
          var t = e.tiers[+inp.dataset.i], k = inp.dataset.k;
          if (k === 'name') { var old = t.name, nn = inp.value.trim() || old; e.assets.forEach(function (a) { if (a.tier === old) a.tier = nn; }); t.name = nn; }
          else t[k] = num(inp.value);
        });
        changed(); renderInventory(); close();
      } }
    ] });
  }

  /* ── broadcast tab ───────────────────────────────────── */
  function renderBroadcast() {
    var e = ev(), bc = e.broadcast, h = '';
    bc.shows.forEach(function (s) {
      var total = Math.round(showSeconds(bc, s));
      var slots = bc.slots.filter(function (k) { return k.showId === s.id; });
      var used = slots.reduce(function (t, k) { return t + k.len; }, 0), left = total - used;
      h += '<div class="dk-show" data-show="' + s.id + '"><div class="dk-show-head"><h3>' + esc(s.name) + '</h3>' +
        '<span class="meta">USA Diving time ' + clock(total) + '</span>' +
        '<span class="left ' + (left < 0 ? 'over' : left === 0 ? 'full' : '') + '">' + (left < 0 ? clock(-left) + ' over the allotment' : left === 0 ? 'Fully scheduled' : clock(left) + ' not yet split into spots') + '</span>' +
        '<button class="dk-btn small" data-add="30">Add :30</button><button class="dk-btn small" data-add="15">Add :15</button></div>' +
        '<div class="dk-bar">' + slots.map(function (k) { return '<i class="' + k.status + '" style="width:' + (k.len / Math.max(total, used) * 100) + '%" title="' + esc((k.sponsor || k.status) + ' :' + k.len) + '"></i>'; }).join('') + '</div>' +
        '<table class="dk-table"><thead><tr><th>Length</th><th>Status</th><th>Sponsor</th><th>Spot or creative name</th><th>Price</th><th></th></tr></thead><tbody>' +
        slots.map(function (k) {
          return '<tr data-slot="' + k.id + '"><td>:' + k.len + '</td>' +
            '<td><select data-f="status" class="st-' + k.status + '">' + ['Open', 'Held', 'Sold', 'Comped'].map(function (x) { return '<option' + (x === k.status ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td>' +
            '<td><input data-f="sponsor" list="sponsorList2" value="' + esc(k.sponsor) + '"></td>' +
            '<td><input data-f="spot" value="' + esc(k.spot) + '" placeholder="File or version the truck should play"></td>' +
            '<td><input class="num" data-f="price" value="' + esc(k.price) + '" placeholder="' + Math.round(num(bc.unitPrice) * k.len / 30) + '"></td>' +
            '<td><button class="dk-x" data-delslot="' + k.id + '">Remove</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    });
    var t = totals();
    h += '<div class="dk-note">USA Diving receives ' + Math.round(num(bc.share) * 100) + '% of all commercial time in each show: ' + clock(num(bc.inShowSec)) + ' of in-show breaks plus ' + clock(num(bc.ceremonySec)) + ' before each awards ceremony. Total across ' + bc.shows.length + ' shows: ' + clock(t.bcSec) + '. Where that time sits inside each show is still to be agreed with ESPN production.</div>' +
      '<datalist id="sponsorList2">' + sponsorNames().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>';
    $('bcBody').innerHTML = h;
  }
  function onBcChange(evt) {
    var el = evt.target, tr = el.closest('tr[data-slot]'); if (!tr || !el.dataset.f) return;
    var bc = ev().broadcast, k = bc.slots.filter(function (x) { return x.id === tr.dataset.slot; })[0]; if (!k) return;
    var f = el.dataset.f;
    k[f] = f === 'price' ? (String(el.value).trim() === '' ? '' : num(el.value)) : el.value;
    if (f === 'status' && k.status === 'Open') k.sponsor = '';
    changed();
    if (f === 'status') { var y = window.scrollY; renderBroadcast(); window.scrollTo(0, y); }
  }
  function onBcClick(evt) {
    var b = evt.target.closest('button'); if (!b) return;
    var bc = ev().broadcast, y = window.scrollY;
    if (b.dataset.add) {
      var sh = b.closest('[data-show]').dataset.show;
      bc.slots.push({ id: uid('k'), showId: sh, len: +b.dataset.add, status: 'Open', sponsor: '', spot: '', price: '' });
    } else if (b.dataset.delslot) {
      bc.slots = bc.slots.filter(function (k) { return k.id !== b.dataset.delslot; });
    } else return;
    changed(); renderBroadcast(); window.scrollTo(0, y);
  }
  function bcSettings() {
    var bc = ev().broadcast;
    var html = '<div class="dk-form">' +
      '<span>USA Diving share of commercial time (%)</span><input id="bcShare" value="' + Math.round(num(bc.share) * 100) + '">' +
      '<span>In-show commercial time per show (seconds)</span><input id="bcIn" value="' + num(bc.inShowSec) + '">' +
      '<span>Each pre-ceremony break (seconds)</span><input id="bcCer" value="' + num(bc.ceremonySec) + '">' +
      '<span>Price per :30</span><input id="bcPrice" value="' + num(bc.unitPrice) + '">' +
      '<b class="wide" style="margin-top:8px">Shows and the number of awards ceremonies in each</b>' +
      bc.shows.map(function (s, i) { return '<input data-si="' + i + '" data-k="name" value="' + esc(s.name) + '"><input data-si="' + i + '" data-k="ceremonyBreaks" value="' + num(s.ceremonyBreaks) + '">'; }).join('') +
      '<input id="bcNew" class="wide" placeholder="Add a show: type its name here"></div>';
    USAD.modal.open({ title: 'Break settings', contentHTML: html, buttons: [
      { label: 'Cancel' },
      { label: 'Save', kind: 'primary', onClick: function (close, dlg) {
        var q = function (s) { return dlg.querySelector(s); };
        bc.share = Math.min(100, Math.max(0, num(q('#bcShare').value))) / 100;
        bc.inShowSec = num(q('#bcIn').value); bc.ceremonySec = num(q('#bcCer').value); bc.unitPrice = num(q('#bcPrice').value);
        dlg.querySelectorAll('input[data-si]').forEach(function (inp) { var s = bc.shows[+inp.dataset.si]; if (inp.dataset.k === 'name') s.name = inp.value.trim() || s.name; else s.ceremonyBreaks = Math.max(0, Math.round(num(inp.value))); });
        var nn = q('#bcNew').value.trim();
        if (nn) { var ns = { id: uid('s'), name: nn, ceremonyBreaks: 1 }; bc.shows.push(ns); fillSlots(bc, ns); }
        changed(); renderBroadcast(); close();
      } }
    ] });
  }
  function exportRunList() {
    var bc = ev().broadcast, out = [csvRow(['Show', 'Spot number', 'Length', 'Status', 'Sponsor', 'Spot or creative name', 'Price'])];
    bc.shows.forEach(function (s) {
      bc.slots.filter(function (k) { return k.showId === s.id; }).forEach(function (k, i) { out.push(csvRow([s.name, i + 1, ':' + k.len, k.status, k.sponsor, k.spot, slotPrice(bc, k)])); });
    });
    downloadText('deckside-broadcast-run-list.csv', out.join('\n'));
  }

  /* ── photo canvas: perspective drawing ───────────────── */
  function homography(q) {
    // Unit square (0,0)(1,0)(1,1)(0,1) to quad q (TL,TR,BR,BL), projective.
    var x0 = q[0][0], y0 = q[0][1], x1 = q[1][0], y1 = q[1][1], x2 = q[2][0], y2 = q[2][1], x3 = q[3][0], y3 = q[3][1];
    var dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3;
    var den = dx1 * dy2 - dx2 * dy1, g = 0, h = 0;
    if (Math.abs(den) > 1e-9) { g = (sx * dy2 - dx2 * sy) / den; h = (dx1 * sy - sx * dy1) / den; }
    var a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
    return function (u, v) { var w = g * u + h * v + 1; return [(a * u + b * v + x0) / w, (d * u + e * v + y0) / w]; };
  }
  function drawTri(ctx, img, s0, s1, s2, d0, d1, d2) {
    // Affine-map source triangle s to destination triangle d, with a hair of overlap to hide seams.
    var cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    function grow(p) { var vx = p[0] - cx, vy = p[1] - cy, l = Math.sqrt(vx * vx + vy * vy) || 1; return [p[0] + vx / l * 0.7, p[1] + vy / l * 0.7]; }
    var e0 = grow(d0), e1 = grow(d1), e2 = grow(d2);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
    var den = (s0[0] - s2[0]) * (s1[1] - s2[1]) - (s1[0] - s2[0]) * (s0[1] - s2[1]);
    if (Math.abs(den) < 1e-9) { ctx.restore(); return; }
    var m11 = ((d0[0] - d2[0]) * (s1[1] - s2[1]) - (d1[0] - d2[0]) * (s0[1] - s2[1])) / den;
    var m12 = ((d1[0] - d2[0]) * (s0[0] - s2[0]) - (d0[0] - d2[0]) * (s1[0] - s2[0])) / den;
    var m21 = ((d0[1] - d2[1]) * (s1[1] - s2[1]) - (d1[1] - d2[1]) * (s0[1] - s2[1])) / den;
    var m22 = ((d1[1] - d2[1]) * (s0[0] - s2[0]) - (d0[1] - d2[1]) * (s1[0] - s2[0])) / den;
    var dx = d2[0] - m11 * s2[0] - m12 * s2[1], dy = d2[1] - m21 * s2[0] - m22 * s2[1];
    ctx.transform(m11, m21, m12, m22, dx, dy);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
  function quadPath(ctx, q) { ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (var i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.closePath(); }
  function px(q, W, H) { return q.map(function (p) { return [p[0] * W, p[1] * H]; }); }

  function drawCreative(ctx, photoImg, crImg, q, W, H) {
    var layer = document.createElement('canvas'); layer.width = W; layer.height = H;
    var lc = layer.getContext('2d'), map = homography(q), N = 14, iw = crImg.naturalWidth || crImg.width, ih = crImg.naturalHeight || crImg.height;
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
      var u0 = i / N, u1 = (i + 1) / N, v0 = j / N, v1 = (j + 1) / N;
      var p00 = map(u0, v0), p10 = map(u1, v0), p11 = map(u1, v1), p01 = map(u0, v1);
      drawTri(lc, crImg, [u0 * iw, v0 * ih], [u1 * iw, v0 * ih], [u1 * iw, v1 * ih], p00, p10, p11);
      drawTri(lc, crImg, [u0 * iw, v0 * ih], [u1 * iw, v1 * ih], [u0 * iw, v1 * ih], p00, p11, p01);
    }
    // Carry the venue's lighting onto the creative: a heavily blurred brightness map of the photo, multiplied in.
    try {
      var sw = 48, sh = Math.max(8, Math.round(48 * H / W));
      var small = document.createElement('canvas'); small.width = sw; small.height = sh;
      var sc = small.getContext('2d'); sc.drawImage(photoImg, 0, 0, sw, sh);
      var id = sc.getImageData(0, 0, sw, sh), d = id.data, sum = 0, n = 0, k;
      var xs = q.map(function (p) { return p[0] / W * sw; }), ys = q.map(function (p) { return p[1] / H * sh; });
      var minx = Math.max(0, Math.floor(Math.min.apply(null, xs))), maxx = Math.min(sw - 1, Math.ceil(Math.max.apply(null, xs)));
      var miny = Math.max(0, Math.floor(Math.min.apply(null, ys))), maxy = Math.min(sh - 1, Math.ceil(Math.max.apply(null, ys)));
      for (var y = miny; y <= maxy; y++) for (var x = minx; x <= maxx; x++) { k = (y * sw + x) * 4; sum += (d[k] + d[k + 1] + d[k + 2]) / 3; n++; }
      var mean = n ? sum / n : 128;
      for (k = 0; k < d.length; k += 4) { var g = (d[k] + d[k + 1] + d[k + 2]) / 3 / (mean || 1); g = Math.max(0.62, Math.min(1, g * 0.97)) * 255; d[k] = d[k + 1] = d[k + 2] = g; d[k + 3] = 255; }
      sc.putImageData(id, 0, 0);
      var alpha = document.createElement('canvas'); alpha.width = W; alpha.height = H; alpha.getContext('2d').drawImage(layer, 0, 0);
      lc.save(); lc.globalCompositeOperation = 'multiply'; lc.imageSmoothingEnabled = true; lc.imageSmoothingQuality = 'high';
      quadPath(lc, q); lc.clip(); lc.drawImage(small, 0, 0, W, H); lc.restore();
      // multiply also paints where the artwork was transparent; trim back to the artwork's own shape.
      lc.save(); lc.globalCompositeOperation = 'destination-in'; lc.drawImage(alpha, 0, 0); lc.restore();
    } catch (e) {}
    ctx.drawImage(layer, 0, 0);
  }

  var view = { W: 0, H: 0, img: null };
  async function renderScene(ctx, W, H, opts) {
    var p = photo(), e = ev(); if (!p) return;
    var img = await getImg(p.fileId); if (!img) return;
    view.img = img;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    for (var i = 0; i < p.zones.length; i++) {
      var z = p.zones[i], q = px(z.quad, W, H), cr = await getImg(creativeOf(z));
      if (cr) {
        drawCreative(ctx, img, cr, q, W, H);
        (z.masks || []).forEach(function (m) { if (m.length < 3) return; ctx.save(); quadPath(ctx, px(m, W, H)); ctx.clip(); ctx.drawImage(img, 0, 0, W, H); ctx.restore(); });
      }
    }
    var s = W / 1000;
    p.zones.forEach(function (z) {
      var q = px(z.quad, W, H), a = assetById(z.assetId), st = a ? a.status : 'Open', col = STATUS_COLOR[st] || '#059669', sel = opts.handles && z.id === ui.zoneId;
      var hasCr = !!creativeOf(z);
      if (opts.labels || sel) {
        ctx.save(); ctx.lineWidth = (sel ? 3.5 : 2.5) * s; ctx.strokeStyle = col; if (hasCr && !sel) ctx.setLineDash([8 * s, 6 * s]);
        quadPath(ctx, q); ctx.stroke(); ctx.restore();
      }
      if (opts.labels) {
        var name = z.label || (a ? a.name : 'Zone');
        var sub = a ? (st === 'Open' ? 'Open' : st + (a.sponsor ? ', ' + a.sponsor : '')) : '';
        var txt = sub ? name + '  ·  ' + sub : name;
        ctx.save(); ctx.font = '600 ' + Math.round(15 * s) + 'px Inter, system-ui, sans-serif';
        var tw = ctx.measureText(txt).width, bx = Math.min(q[0][0], q[3][0]), by = Math.max(q[2][1], q[3][1]) + 6 * s, bh = 24 * s;
        if (by + bh > H) by = Math.min(q[0][1], q[1][1]) - bh - 6 * s;
        if (bx + tw + 14 * s > W) bx = W - tw - 14 * s;
        ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, tw + 14 * s, bh);
        ctx.fillStyle = col; ctx.textBaseline = 'middle'; ctx.fillText(txt, bx + 7 * s, by + bh / 2 + s); ctx.restore();
      }
      if (sel) {
        (z.masks || []).forEach(function (m) { ctx.save(); ctx.lineWidth = 1.5 * s; ctx.strokeStyle = '#8fc3ea'; ctx.setLineDash([5 * s, 4 * s]); quadPath(ctx, px(m, W, H)); ctx.stroke(); ctx.restore(); });
        q.forEach(function (pt) { ctx.beginPath(); ctx.arc(pt[0], pt[1], 8 * s, 0, 6.3); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3 * s; ctx.strokeStyle = col; ctx.stroke(); });
      }
    });
    if (opts.handles && ui.maskDraft && ui.maskDraft.length) {
      var m = px(ui.maskDraft, W, H);
      ctx.save(); ctx.strokeStyle = '#8fc3ea'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(m[0][0], m[0][1]); for (var k = 1; k < m.length; k++) ctx.lineTo(m[k][0], m[k][1]); ctx.stroke();
      m.forEach(function (pt) { ctx.beginPath(); ctx.arc(pt[0], pt[1], 4 * s, 0, 6.3); ctx.fillStyle = '#8fc3ea'; ctx.fill(); }); ctx.restore();
    }
  }
  var drawQueued = false;
  function draw() {
    if (drawQueued) return; drawQueued = true;
    requestAnimationFrame(async function () {
      drawQueued = false;
      var cv = $('cv'), p = photo();
      $('stageEmpty').hidden = !!p; cv.hidden = !p; if (!p) return;
      var stage = $('stage'), maxW = stage.clientWidth - 20, maxH = Math.max(420, window.innerHeight - 230);
      var sc = Math.min(maxW / p.w, maxH / p.h, 1.6), cssW = Math.round(p.w * sc), cssH = Math.round(p.h * sc);
      var dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
      view.W = W; view.H = H;
      await renderScene(cv.getContext('2d'), W, H, { labels: $('showLabels').checked, handles: true });
    });
  }

  /* ── photo canvas: pointer handling ──────────────────── */
  function evtPt(evt) { var r = $('cv').getBoundingClientRect(); return [(evt.clientX - r.left) / r.width, (evt.clientY - r.top) / r.height]; }
  function inPoly(pt, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function onDown(evt) {
    var p = photo(); if (!p) return;
    var pt = evtPt(evt), r = $('cv').getBoundingClientRect();
    if (ui.maskDraft) {
      if (ui.maskDraft.length >= 3) { var f = ui.maskDraft[0]; if (Math.hypot((pt[0] - f[0]) * r.width, (pt[1] - f[1]) * r.height) < 12) { finishMask(); return; } }
      ui.maskDraft.push(pt); draw(); return;
    }
    var z = zone();
    if (z) {
      for (var i = 0; i < 4; i++) {
        if (Math.hypot((pt[0] - z.quad[i][0]) * r.width, (pt[1] - z.quad[i][1]) * r.height) < 14) { ui.drag = { kind: 'corner', i: i }; $('cv').setPointerCapture(evt.pointerId); return; }
      }
    }
    for (var k = p.zones.length - 1; k >= 0; k--) {
      if (inPoly(pt, p.zones[k].quad)) {
        if (ui.zoneId !== p.zones[k].id) { ui.zoneId = p.zones[k].id; renderZonePanel(); }
        ui.drag = { kind: 'move', last: pt }; $('cv').setPointerCapture(evt.pointerId); draw(); return;
      }
    }
    if (ui.zoneId) { ui.zoneId = null; renderZonePanel(); draw(); }
  }
  function onMove(evt) {
    if (!ui.drag) return; var z = zone(); if (!z) return;
    var pt = evtPt(evt);
    if (ui.drag.kind === 'corner') { z.quad[ui.drag.i] = [Math.max(0, Math.min(1, pt[0])), Math.max(0, Math.min(1, pt[1]))]; }
    else { var dx = pt[0] - ui.drag.last[0], dy = pt[1] - ui.drag.last[1]; z.quad = z.quad.map(function (q) { return [q[0] + dx, q[1] + dy]; }); (z.masks || []).forEach(function (m) { m.forEach(function (q) { q[0] += dx; q[1] += dy; }); }); ui.drag.last = pt; }
    ui.drag.moved = true; draw();
  }
  function onUp() { if (ui.drag && ui.drag.moved) changed(); ui.drag = null; }
  function finishMask() {
    var z = zone();
    if (z && ui.maskDraft && ui.maskDraft.length >= 3) { z.masks = z.masks || []; z.masks.push(ui.maskDraft); changed(); }
    ui.maskDraft = null; renderZonePanel(); draw();
  }

  /* ── photos tab: lists and side panel ────────────────── */
  async function renderPhotoList() {
    var v = venue(); $('venueName').textContent = v.name;
    if (!photo() && v.photos.length) ui.photoId = v.photos[0].id;
    var box = $('photoList'); box.innerHTML = '';
    for (var i = 0; i < v.photos.length; i++) {
      var p = v.photos[i], b = document.createElement('button');
      b.className = 'dk-thumb' + (p.id === ui.photoId ? ' active' : ''); b.dataset.photo = p.id;
      var url = await fileUrl(p.fileId);
      b.innerHTML = (url ? '<img alt="" src="' + url + '">' : '<div style="height:92px"></div>') + '<span>' + esc(p.name) + '</span>';
      box.appendChild(b);
    }
  }
  function renderZonePanel() {
    var p = photo(), z = zone(), e = ev(), box = $('zonePanel');
    if (!p) { box.innerHTML = '<h3>Zones</h3><p>Zones mark where a sponsor can go on a photo. Add a photo first.</p>'; return; }
    if (!z) {
      box.innerHTML = '<h3>Zones on this photo</h3>' + (p.zones.length ? '<div class="dk-zlist">' + p.zones.map(function (zz) {
        var a = assetById(zz.assetId); return '<button data-zone="' + zz.id + '"><span>' + esc(zz.label || (a ? a.name : 'Zone')) + '</span><span class="dk-pill ' + (a ? a.status : 'Open') + '">' + (a ? a.status : 'Not linked') + '</span></button>';
      }).join('') + '</div>' : '<p>No zones yet. Choose Add zone, then drag its four corners onto the sign, wall or backdrop.</p>') +
        '<p>Click a zone on the photo to edit it.</p>';
      return;
    }
    var cr = creativeOf(z);
    box.innerHTML = '<h3>Zone</h3>' +
      '<label>Name on the photo<input id="zLabel" value="' + esc(z.label || '') + '" placeholder="Uses the asset name if blank"></label>' +
      '<label>Inventory asset<select id="zAsset"><option value="">Not linked</option>' + e.assets.map(function (a) { return '<option value="' + a.id + '"' + (a.id === z.assetId ? ' selected' : '') + '>' + esc(a.name) + ' (' + a.status + ')</option>'; }).join('') + '</select></label>' +
      '<label>Sponsor artwork for this event<div class="dk-drop" id="crDrop">' + (cr ? '<img id="crPrev" alt="">Click or drop to replace' : 'Drop or paste a picture here, or click to choose') + '</div><input type="file" id="crInput" accept="image/*" hidden></label>' +
      (cr ? '<div class="row"><button class="dk-btn small" id="crClear">Remove artwork</button></div>' : '') +
      '<label>Things in front of this zone</label><p>Outline a board, railing or person so it stays in front of the artwork. Click around it, then click the first point to finish.</p>' +
      '<div class="row">' + (ui.maskDraft ? '<button class="dk-btn small primary" id="maskDone">Finish outline</button><button class="dk-btn small" id="maskCancel">Cancel</button>' : '<button class="dk-btn small" id="maskAdd">Outline something in front</button>') +
      ((z.masks || []).length ? '<button class="dk-btn small" id="maskClear">Clear ' + z.masks.length + ' outline' + (z.masks.length > 1 ? 's' : '') + '</button>' : '') + '</div>' +
      '<div class="row" style="margin-top:auto"><button class="dk-btn" id="zDone">Done</button><button class="dk-btn danger" id="zDel">Delete zone</button></div>';
    if (cr) fileUrl(cr).then(function (u) { var im = $('crPrev'); if (im && u) im.src = u; });
  }
  async function setCreative(file) {
    var z = zone(); if (!z || !file) return;
    try { var f = await importImage(file, 1600); setCreativeFor(z, f.id); changed(); renderZonePanel(); draw(); }
    catch (e) { toast('That file could not be read as a picture.', 'error'); }
  }
  async function addPhotos(fileList) {
    var files = Array.prototype.slice.call(fileList), v = venue(), added = 0;
    for (var i = 0; i < files.length; i++) {
      if (isVideo(files[i])) { toast('Videos cannot be added. Use a still photo or a screenshot from the video.', 'warn'); continue; }
      if (!looksLikePicture(files[i])) continue;
      try { var f = await importImage(files[i], 2000); v.photos.push({ id: uid('p'), name: f.name, fileId: f.id, w: f.w, h: f.h, zones: [] }); ui.photoId = v.photos[v.photos.length - 1].id; added++; }
      catch (e) { toast((files[i].name || 'That file') + ' could not be read as a picture.', 'error'); }
    }
    if (added) { ui.zoneId = null; changed(); await renderPhotoList(); renderZonePanel(); draw(); }
  }
  async function exportPicture() {
    var p = photo(); if (!p) return;
    var c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
    var keep = ui.zoneId; ui.zoneId = null;
    await renderScene(c.getContext('2d'), p.w, p.h, { labels: $('showLabels').checked, handles: false });
    ui.zoneId = keep;
    c.toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (p.name || 'venue') + '-rendering.jpg'; document.body.appendChild(a); a.click(); a.remove(); }, 'image/jpeg', 0.92);
  }

  /* ── events ──────────────────────────────────────────── */
  function renderEventSel() {
    $('eventSel').innerHTML = doc.events.map(function (e) { return '<option value="' + e.id + '"' + (e.id === doc.activeEventId ? ' selected' : '') + '>' + esc(e.name) + '</option>'; }).join('');
  }
  function eventSettings() {
    var e = ev(), v = venue();
    var html = '<div class="dk-form"><span>Event name</span><span></span><input id="evName" class="wide" value="' + esc(e.name) + '">' +
      '<span>Dates</span><span></span><input id="evDates" class="wide" value="' + esc(e.dates || '') + '">' +
      '<span>Venue</span><span></span><input id="evVenue" class="wide" value="' + esc(v.name) + '">' +
      '<b class="wide" style="margin-top:10px">Start another event</b><input id="evNew" class="wide" placeholder="New event name">' +
      '<label class="dk-check wide"><input type="checkbox" id="evSameVenue" checked> Same venue and photos. Copies this event\'s assets and prices with everything set back to Open.</label></div>';
    USAD.modal.open({ title: 'Event settings', contentHTML: html, buttons: [
      { label: 'Cancel' },
      { label: 'Save', kind: 'primary', onClick: function (close, dlg) {
        var q = function (s) { return dlg.querySelector(s); };
        e.name = q('#evName').value.trim() || e.name; e.dates = q('#evDates').value.trim(); v.name = q('#evVenue').value.trim() || v.name;
        var nn = q('#evNew').value.trim();
        if (nn) {
          var copy = JSON.parse(JSON.stringify(e)); copy.id = uid('e'); copy.name = nn; copy.dates = ''; copy.zoneCreative = {}; copy.assetCreative = {};
          copy.assets.forEach(function (a) { if (a.status === 'Sold' || a.status === 'Held') { a.status = 'Open'; a.sponsor = ''; a.price = ''; } });
          copy.broadcast.slots.forEach(function (k) { k.status = 'Open'; k.sponsor = ''; k.spot = ''; k.price = ''; });
          if (!q('#evSameVenue').checked) { var nv = { id: uid('v'), name: 'New venue', city: '', photos: [] }; doc.venues.push(nv); copy.venueId = nv.id; }
          doc.events.push(copy); doc.activeEventId = copy.id; ui.photoId = null; ui.zoneId = null;
        }
        changed(); renderAll(); close();
      } }
    ] });
  }

  /* ── wiring ──────────────────────────────────────────── */
  function showTab(t) {
    ui.tab = t;
    ['inventory', 'photos', 'model', 'broadcast'].forEach(function (n) { $('tab-' + n).hidden = n !== t; });
    document.querySelectorAll('#tabs [data-tab]').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === t); });
    if (t === 'inventory') renderInventory();
    if (t === 'broadcast') renderBroadcast();
    if (window.DECKSIDE3D) { if (t === 'model') window.DECKSIDE3D.show(); else window.DECKSIDE3D.hide(); }
    if (t === 'photos') { renderPhotoList().then(function () { renderZonePanel(); draw(); }); }
  }
  function renderAll() { renderEventSel(); renderKpis(); showTab(ui.tab); }

  function wire() {
    $('tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });
    $('eventSel').addEventListener('change', function (e) { doc.activeEventId = e.target.value; ui.photoId = null; ui.zoneId = null; changed(); renderAll(); });
    $('eventMenuBtn').addEventListener('click', eventSettings);
    $('invTable').addEventListener('change', onInvChange);
    $('invTable').addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]'); if (!b) return;
      var a = assetById(b.dataset.del);
      USAD.modal.confirm({ title: 'Remove this asset?', body: (a ? a.name : '') + ' will be taken off this event.', confirmLabel: 'Remove', danger: true }).then(function (ok) {
        if (!ok) return; var e2 = ev(); e2.assets = e2.assets.filter(function (x) { return x.id !== b.dataset.del; }); changed(); var y = window.scrollY; renderInventory(); window.scrollTo(0, y);
      });
    });
    $('invFilter').addEventListener('change', function (e) { ui.filter = e.target.value; renderInventory(); });
    $('addAssetBtn').addEventListener('click', function () {
      var e = ev(); e.assets.push({ id: uid('a'), name: 'New asset', area: '', tier: e.tiers[e.tiers.length - 1].name, qty: 1, status: 'Open', sponsor: '', price: '', notes: '' });
      ui.filter = ''; $('invFilter').value = ''; changed(); renderInventory();
      var rows = $('invTable').querySelectorAll('tbody tr'), last = rows[rows.length - 1]; if (last) { var inp = last.querySelector('input'); inp.focus(); inp.select(); }
    });
    $('tiersBtn').addEventListener('click', editTiers);
    $('csvBtn').addEventListener('click', exportInventoryCsv);
    $('bcBody').addEventListener('change', onBcChange);
    $('bcBody').addEventListener('click', onBcClick);
    $('bcSettingsBtn').addEventListener('click', bcSettings);
    $('runListBtn').addEventListener('click', exportRunList);

    $('photoInput').addEventListener('change', function (e) { addPhotos(e.target.files); e.target.value = ''; });
    $('photoList').addEventListener('click', function (e) { var b = e.target.closest('[data-photo]'); if (!b) return; ui.photoId = b.dataset.photo; ui.zoneId = null; ui.maskDraft = null; renderPhotoList(); renderZonePanel(); draw(); });
    $('addZoneBtn').addEventListener('click', function () {
      var p = photo(); if (!p) { toast('Add a photo first.'); return; }
      var z = { id: uid('z'), label: '', assetId: '', quad: [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]], masks: [] };
      p.zones.push(z); ui.zoneId = z.id; changed(); renderZonePanel(); draw();
    });
    $('showLabels').addEventListener('change', draw);
    $('exportBtn').addEventListener('click', exportPicture);
    $('delPhotoBtn').addEventListener('click', function () {
      var p = photo(); if (!p) return;
      USAD.modal.confirm({ title: 'Remove this photo?', body: 'Its zones (' + p.zones.length + ') go with it.', confirmLabel: 'Remove', danger: true }).then(function (ok) {
        if (!ok) return; var v = venue(); v.photos = v.photos.filter(function (x) { return x.id !== p.id; }); ui.photoId = null; ui.zoneId = null; changed(); renderPhotoList().then(function () { renderZonePanel(); draw(); });
      });
    });
    var cv = $('cv');
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
    // Drop pictures anywhere on the page (from Messages, Photos, the desktop or a web page), or paste one.
    var stage = $('stage'), dragDepth = 0;
    function isFileDrag(e) { var t = e.dataTransfer && e.dataTransfer.types; if (!t) return false; for (var k = 0; k < t.length; k++) if (t[k] === 'Files' || t[k] === 'text/html' || t[k] === 'text/uri-list') return true; return false; }
    window.addEventListener('dragenter', function (e) { if (!isFileDrag(e)) return; dragDepth++; document.body.classList.add('dk-dragging'); });
    window.addEventListener('dragleave', function () { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('dk-dragging'); });
    window.addEventListener('dragover', function (e) { if (isFileDrag(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
    window.addEventListener('drop', async function (e) {
      if (!isFileDrag(e)) return;
      e.preventDefault(); dragDepth = 0; document.body.classList.remove('dk-dragging');
      var onArt = e.target.closest && e.target.closest('#crDrop'), onCanvas = e.target === $('cv'), pt = onCanvas ? evtPt(e) : null;
      var files = await filesFrom(e.dataTransfer); if (!files.length) return;
      if (ui.tab === 'model' && window.DECKSIDE3D) { window.DECKSIDE3D.drop(e, files[0]); return; }
      if (ui.tab !== 'photos') showTab('photos');
      var p = photo();
      if (onArt && zone()) { setCreative(files[0]); return; }
      if (p && pt) {
        for (var k = p.zones.length - 1; k >= 0; k--) if (inPoly(pt, p.zones[k].quad)) { ui.zoneId = p.zones[k].id; setCreative(files[0]); return; }
      }
      addPhotos(files);
    });
    document.addEventListener('paste', async function (e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      var files = (await filesFrom(e.clipboardData)).filter(looksLikePicture); if (!files.length) return;
      e.preventDefault();
      if (ui.tab === 'model' && window.DECKSIDE3D) { window.DECKSIDE3D.paste(files[0]); return; }
      if (ui.tab !== 'photos') showTab('photos');
      if (zone()) { setCreative(files[0]); toast('Pasted as the artwork for the selected zone.'); }
      else addPhotos(files);
    });
    $('zonePanel').addEventListener('click', function (e) {
      var t = e.target, zb = t.closest('[data-zone]');
      if (zb) { ui.zoneId = zb.dataset.zone; renderZonePanel(); draw(); return; }
      var z = zone(); if (!z) return;
      if (t.id === 'crClear') { clearCreativeFor(z); changed(); renderZonePanel(); draw(); }
      else if (t.id === 'maskAdd') { ui.maskDraft = []; renderZonePanel(); }
      else if (t.id === 'maskDone') { finishMask(); }
      else if (t.id === 'maskCancel') { ui.maskDraft = null; renderZonePanel(); draw(); }
      else if (t.id === 'maskClear') { z.masks = []; changed(); renderZonePanel(); draw(); }
      else if (t.id === 'zDone') { ui.zoneId = null; ui.maskDraft = null; renderZonePanel(); draw(); }
      else if (t.id === 'zDel') { var p = photo(); p.zones = p.zones.filter(function (x) { return x.id !== z.id; }); delete ev().zoneCreative[z.id]; ui.zoneId = null; ui.maskDraft = null; changed(); renderZonePanel(); draw(); }
    });
    $('zonePanel').addEventListener('change', function (e) {
      var z = zone(); if (!z) return;
      if (e.target.id === 'zLabel') { z.label = e.target.value.trim(); changed(); draw(); }
      else if (e.target.id === 'zAsset') { z.assetId = e.target.value; changed(); draw(); }
      else if (e.target.id === 'crInput') { setCreative(e.target.files[0]); }
    });
    window.addEventListener('resize', function () { if (ui.tab === 'photos') draw(); });
    window.addEventListener('beforeunload', function () { if (cloud.timer && cloud.ready && !cloud.conflict) push(); });
  }

  // Pictures added while the database was unreachable are uploaded the next time it is reachable.
  async function syncFiles() {
    if (!cloud.ready) return;
    var ids = {};
    doc.venues.forEach(function (v) { v.photos.forEach(function (p) { ids[p.fileId] = 1; }); });
    doc.events.forEach(function (e) { ['zoneCreative', 'assetCreative'].forEach(function (k) { Object.keys(e[k] || {}).forEach(function (z) { ids[e[k][z]] = 1; }); }); });
    try {
      var r = await NEON.query('SELECT id FROM deckside.files'), have = {};
      r.rows.forEach(function (x) { have[x.id] = 1; });
      for (var id in ids) {
        if (have[id]) continue;
        var d = await idbGet(id);
        if (d) await NEON.query('INSERT INTO deckside.files (id, name, data, bytes) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [id, '', d, d.length]);
      }
    } catch (e) {}
  }

  async function init() {
    await idbOpen();
    await loadDoc();
    syncFiles();
    wire();
    renderAll();
    window.DECKSIDE.isReady = true; document.dispatchEvent(new Event('deckside-ready'));
  }
  window.DECKSIDE = { _doc: function () { return doc; }, _totals: totals, ev: ev, venue: venue, assetById: assetById, assetValue: assetValue,
    changed: changed, getImg: getImg, fileUrl: fileUrl, importImage: importImage, creativeOf: creativeOf, setCreativeFor: setCreativeFor, clearCreativeFor: clearCreativeFor,
    uid: uid, esc: esc, money: money, toast: toast, STATUSES: STATUSES, STATUS_COLOR: STATUS_COLOR, tab: function () { return ui.tab; }, ready: null };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
