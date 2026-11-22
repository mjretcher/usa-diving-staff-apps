/* Deckside 3D venue. A scale model of the room with every sponsor sign as a
   clickable panel tied to the same inventory as the other tabs. The room
   geometry below is COM Aquatics (Midland); the signs are data and can be
   moved, resized, added and removed in the app. Units are metres. */
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const D = window.DECKSIDE;
const $ = (id) => document.getElementById(id);
let R, scene, cam, controls, signs, room, built = false, visible = false, selId = null, needs = false, hoverId = null;
const texCache = new Map();

/* ── default signs for COM Aquatics ───────────────────── */
function defaultSigns() {
  const P = Math.PI, f = (id, name, w, h, x, y, z, ry, kind) => ({ id, name, w, h, x, y, z, ry: ry || 0, kind: kind || 'flat' });
  const s = [
    f('m_t10', 'Tower wrap, 10m level', 3.2, 1.0, 0, 9.34, 3.03),
    f('m_t75', 'Tower wrap, 7.5m level', 2.6, 0.95, -3.4, 6.86, 2.23),
    f('m_t5', 'Tower wrap, 5m level', 2.6, 0.95, 3.4, 4.36, 2.23),
    f('m_base', 'Tower base banner', 7.2, 2.3, 0, 1.3, -0.95),
    f('m_hang1', 'Hanging banners from tower', 1.1, 3.4, -1.05, 5.6, -1.05),
    f('m_hang2', 'Hanging banners from tower', 1.1, 3.4, 1.05, 5.6, -1.05),
    f('m_pa', 'Pillar A, dive well', 0.9, 2.4, -13.6, 1.3, -0.82),
    f('m_pb', 'Pillar B, dive well', 0.9, 2.4, -7.4, 1.3, -0.82),
    f('m_pc', 'Pillar C, dive well', 0.9, 2.4, 5.6, 1.3, -1.02),
    f('m_bd3', 'Backdrop behind 3m springboards', 7.6, 2.5, -10.5, 4.15, -3.3),
    f('m_bd1', 'Backdrop behind 1m springboards', 8.2, 3.0, 10.4, 1.55, -2.3),
    f('m_arch', 'Athlete walk-out arch', 3.2, 2.6, 17.4, 1.35, 33.5, -P / 2.5),
    f('m_curve', 'Curved backdrop by scoring table', 3.0, 2.4, -15.6, 1.25, 35.0, P / 2.8),
    f('m_tl', 'Scoring table front, left', 3.6, 0.7, -2.2, 0.4, 35.02, P),
    f('m_tr', 'Scoring table front, right', 3.6, 0.7, 2.2, 0.4, 35.02, P),
    f('m_sb', 'Scoreboard logos', 6.5, 2.8, -22.75, 9.2, 30, P / 2)
  ];
  // Deck frames stand side by side in groups, as in the 2025 photos.
  [[-14.3, 9.0], [-14.3, 11.0], [-14.3, 13.0], [-14.3, 15.0]].forEach((p, i) => s.push(f('m_f' + (i + 1), 'Deck frame sign ' + (i + 1), 1.9, 0.8, p[0], 0.4, p[1], P / 2, 'aframe')));
  [[14.3, 7.0], [14.3, 9.0], [14.3, 26.0], [14.3, 28.0]].forEach((p, i) => s.push(f('m_f' + (i + 5), 'Deck frame sign ' + (i + 5), 1.9, 0.8, p[0], 0.4, p[1], -P / 2, 'aframe')));
  return s;
}
/* ── displays USA Diving owns (Backdrop Source orders, Nov 2025 to Nov 2026) ── */
const FT = 0.3048, r2 = (n) => Math.round(n * 100) / 100;
const SKIN26 = 'A new double sided skin was ordered for the 2026 Winter Nationals.';
const DISPLAYS = [
  { key: 'glide', name: 'Glide Wave Exhibition Display', size: '16 x 8 ft', own: 1, kind: 'wall', w: r2(16 * FT), h: r2(8 * FT), plan: 'swave', d: 0.45, skin: SKIN26 },
  { key: 'cwave', name: 'Curved Wave Trade Show Display', size: '15 ft wide, 6 to 7.4 ft tall', own: 1, kind: 'wall', w: r2(15 * FT), h: r2(7.4 * FT), plan: 'arc', d: 0.5, low: 6 / 7.4, skin: SKIN26 },
  { key: 'ctmw', name: 'Curved Tension Portable Media Wall', size: '19.5 x 7.5 ft', own: 1, kind: 'wall', w: r2(19.5 * FT), h: r2(7.5 * FT), plan: 'arc', d: 0.9 },
  { key: 's164', name: 'Straight Tension Backdrop, 16.4 ft', size: '16.4 x 7.5 ft', own: 1, kind: 'flat', w: r2(16.4 * FT), h: r2(7.5 * FT), skin: SKIN26 },
  { key: 's195', name: 'Straight Tension Backdrop, 19.5 ft', size: '19.5 x 7.5 ft', own: 1, kind: 'flat', w: r2(19.5 * FT), h: r2(7.5 * FT), skin: SKIN26 },
  { key: 'sqarch', name: 'Square Fabric Arch Entrance', size: '7.87 ft wide, 7.54 ft tall, 3 ft deep', own: 3, kind: 'arch', w: r2(7.87 * FT), h: r2(7.54 * FT), depth: 0.95, leg: 0.5, head: 0.45 },
  { key: 'warch', name: 'Welcome Arch Stand', size: '9.7 x 8.8 ft', own: 1, kind: 'arch', w: r2(9.7 * FT), h: r2(8.8 * FT), depth: 0.25, leg: 0.6, head: 0.6, skin: SKIN26 },
  { key: 'popup', name: 'Horizontal Pop-Up Banner', size: '4 x 2.3 ft', own: 5, kind: 'aframe', w: r2(4 * FT), h: r2(2.3 * FT) },
  { key: 'fabric', name: 'Fabric banner print', size: '45 x 7 ft', own: 3, kind: 'flat', w: r2(45 * FT), h: r2(7 * FT) },
  { key: 'aframe26', name: 'Deck A-frame sign, 2026 order', size: '6.56 x 3.28 ft', own: 21, kind: 'aframe', w: 2, h: 1, skin: 'Bought new from BannerBuzz for the 2026 Winter Nationals, frames and fabric graphics.' },
  { key: 'aframe', name: 'Deck A-frame sign, earlier size', size: 'about 6 x 2.6 ft', own: null, kind: 'aframe', w: 1.9, h: 0.8 },
  { key: 'flat', name: 'Flat sign, any size', size: 'set your own', own: null, kind: 'flat', w: 2, h: 1 }
];
const displayOf = (s) => DISPLAYS.filter((d) => d.key === s.preset)[0] || null;
function applyDisplay(s, key) { const d = DISPLAYS.filter((x) => x.key === key)[0]; if (!d) return s; s.preset = d.key; s.kind = d.kind; s.w = d.w; s.h = d.h; ['plan', 'd', 'low', 'depth', 'leg', 'head'].forEach((k) => { if (d[k] != null) s[k] = d[k]; else delete s[k]; }); return s; }
// First placement of the owned displays, read from the 2025 Winter Nationals photos. Only untouched default signs are converted.
function migrate(m) {
  const from = m.v || 1; if (from >= 5) return false;
  if (from < 2) {
    const was = { m_bd1: [8.2, 3.0, 'glide', 1.22], m_bd3: [7.6, 2.5, 'cwave', 4.02], m_arch: [3.2, 2.6, 'sqarch', 1.15], m_curve: [3.0, 2.4, 'ctmw', 1.14] };
    m.signs.forEach((s) => { const w = was[s.id]; if (w && s.kind === 'flat' && s.w === w[0] && s.h === w[1]) { applyDisplay(s, w[2]); s.y = w[3]; } });
  }
  // The deck A-frames bought for the 2026 Winter Nationals are 6.56 x 3.28 ft. Untouched deck frames take that size.
  m.signs.forEach((s) => { if (s.kind === 'aframe' && !s.preset && s.w === 1.9 && s.h === 0.8) { const bottom = s.y - s.h / 2; applyDisplay(s, 'aframe26'); s.y = r2(Math.max(0, bottom) + s.h / 2); } });
  // Near end of the pool, corrected from the 2025 photo taken from the tower end: the scoreboard is on the end wall,
  // the awards podium and its backdrop sit in the middle of that end with a row of deck frames either side, and the
  // scoring tables are toward the entrance corner. Only signs still at their original spot are moved.
  if (from < 4) {
    const at = (s, x, z) => s && s.x === x && s.z === z, by = (id) => m.signs.filter((s) => s.id === id)[0];
    let s = by('m_sb'); if (at(s, -22.75, 30)) Object.assign(s, { x: 0, y: 9.6, z: 42.05, ry: Math.PI, w: 7.5, h: 3.6 });
    s = by('m_tl'); if (at(s, -2.2, 35.02)) Object.assign(s, { x: 6.3, z: 36.92 });
    s = by('m_tr'); if (at(s, 2.2, 35.02)) Object.assign(s, { x: 10.7, z: 36.92 });
    s = by('m_curve'); if (at(s, -15.6, 35)) Object.assign(s, { x: 14.6, z: 38.4, ry: Math.PI * 0.92 });
    if (by('m_arch') && !by('m_awards')) {
      const e = D.ev(), used = {}; m.signs.forEach((x) => { used[x.assetId] = 1; });
      const a = e.assets.filter((x) => x.name === 'Awards ceremony' && !used[x.id])[0];
      const aw = applyDisplay({ id: 'm_awards', name: 'Awards backdrop', x: 0, y: 0, z: 37.6, ry: Math.PI, assetId: a ? a.id : '' }, 's195'); aw.y = r2(aw.h / 2); m.signs.push(aw);
      [8.5, 6.4, 4.3, 2.2, -2.2, -4.3, -6.4, -8.5].forEach((x, i) => { const f = applyDisplay({ id: 'm_e' + (i + 1), name: 'End deck frame ' + (i + 1), x, y: 0, z: 34.9, ry: Math.PI, assetId: '' }, 'aframe26'); f.y = r2(f.h / 2); m.signs.push(f); });
    }
  }
  // The eight frames along the awards end get their own inventory rows so they can be priced and sold like the side frames.
  if (from < 5) {
    const seen = ['Frost', 'Visit Midland', 'COM Aquatics', 'a pool products sign', 'Colorado Time Systems', 'USA Diving', 'Insignia', 'Visit Midland'], v = D.venue();
    D._doc().events.filter((e) => e.venueId === v.id).forEach((e) => {
      const like = e.assets.filter((a) => /^Deck frame sign/.test(a.name))[0], tier = like ? like.tier : e.tiers[e.tiers.length - 1].name;
      m.signs.forEach((s) => {
        const k = /^m_e([1-8])$/.exec(s.id); if (!k) return;
        let a = e.assets.filter((x) => x.id === s.assetId)[0];
        if (!a) {
          if (!s.assetId) s.assetId = D.uid('a');
          a = { id: s.assetId, name: 'End deck frame sign ' + k[1], area: 'Pool deck, awards end', tier, qty: 1, status: 'Open', sponsor: '', price: '', notes: '2025 photo shows ' + seen[k[1] - 1] + ' here' };
          e.assets.push(a);
        }
      });
    });
  }
  m.v = 5; return true;
}
function model() {
  const v = D.venue();
  if (!v.model || !v.model.signs) {
    const e = D.ev();
    v.model = { v: 1, signs: defaultSigns().map((s) => { const a = e.assets.filter((x) => x.name === s.name)[0]; s.assetId = a ? a.id : ''; return s; }) };
    migrate(v.model);
    D.changed();
  } else if (migrate(v.model)) D.changed();
  return v.model;
}
const signById = (id) => model().signs.filter((s) => s.id === id)[0] || null;

/* ── textures ─────────────────────────────────────────── */
function canvasTex(w, h, paint, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const wallTex = (rx, ry) => canvasTex(64, 64, (g) => { for (let x = 0; x < 64; x++) { const v = 205 + Math.round(7 * Math.sin(x / 64 * Math.PI * 4)); g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.fillRect(x, 0, 1, 64); } }, [rx, ry]);
const deckTex = () => canvasTex(256, 256, (g) => { g.fillStyle = '#c9ccd1'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { const v = 170 + Math.random() * 60; g.fillStyle = `rgba(${v},${v},${v + 3},0.5)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } }, [10, 12]);
const waterTex = () => canvasTex(256, 256, (g) => { g.fillStyle = '#0d6fb8'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); g.bezierCurveTo(x + 30, y - 12, x + 50, y + 14, x + 84, y); g.stroke(); } }, [5, 6]);

function labelTex(sign, asset) {
  const st = asset ? asset.status : 'Open', col = D.STATUS_COLOR[st] || '#059669';
  const k = Math.min(260, 2048 / Math.max(sign.w, sign.h));
  return canvasTex(Math.max(64, Math.round(sign.w * k)), Math.max(64, Math.round(sign.h * k)), (g, w, h) => {
    g.fillStyle = '#fbfcfe'; g.fillRect(0, 0, w, h);
    const lw = Math.max(8, Math.min(w, h) * 0.05); g.lineWidth = lw; g.strokeStyle = col; g.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    const name = (sign.label || (asset ? asset.name : sign.name) || 'Sign').toUpperCase();
    const sub = !asset ? 'NOT LINKED' : st === 'Open' ? 'OPEN' : (st.toUpperCase() + (asset.sponsor ? ' · ' + asset.sponsor.toUpperCase() : ''));
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = name.split(/\s+/).filter(Boolean); let best = null;
    for (let n = 1; n <= Math.min(4, words.length); n++) {
      const per = Math.ceil(words.length / n), lines = []; for (let i = 0; i < words.length; i += per) lines.push(words.slice(i, i + per).join(' '));
      g.font = '700 100px Inter, Arial, sans-serif'; const widest = Math.max(...lines.map((l) => g.measureText(l).width));
      const fs = Math.min(w * 0.86 / widest * 100, h * 0.58 / (lines.length * 1.18 + 0.9));
      if (!best || fs > best.fs) best = { fs, lines };
    }
    const fs = best.fs, lines = best.lines, block = lines.length * fs * 1.18 + fs * 0.9, top = (h - block) / 2 + fs * 0.6;
    g.font = `700 ${fs}px Inter, Arial, sans-serif`; g.fillStyle = '#171f69';
    lines.forEach((l, i) => g.fillText(l, w / 2, top + i * fs * 1.18));
    let fs2 = fs * 0.7; g.font = `700 ${fs2}px Inter, Arial, sans-serif`; const sw = g.measureText(sub).width; if (sw > w * 0.86) { fs2 *= w * 0.86 / sw; g.font = `700 ${fs2}px Inter, Arial, sans-serif`; }
    g.fillStyle = col; g.fillText(sub, w / 2, top + lines.length * fs * 1.18 + fs2 * 0.25);
  });
}
async function artTex(fileId) {
  if (texCache.has(fileId)) return texCache.get(fileId);
  const img = await D.getImg(fileId); if (!img) return null;
  const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  texCache.set(fileId, t); return t;
}

/* ── the room ─────────────────────────────────────────── */
function buildRoom() {
  let g = new THREE.Group(); scene.add(g); room = g;
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, o || {}));
  const box = (w, h, d, x, y, z, m, cast) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = cast !== false; b.receiveShadow = true; g.add(b); return b; };
  const plane = (w, h, x, y, z, rx, ry, m) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); p.receiveShadow = true; g.add(p); return p; };
  const steel = M(0x232a45, { roughness: 0.55, metalness: 0.3 }), white = M(0xf2f4f7), dark = M(0x15171f), navy = M(0x1b2350);
  // deck, pool, water
  box(46, 0.4, 49, 0, -0.2, 18, M(0xffffff, { map: deckTex() }), false);
  box(25.7, 0.42, 30.7, 0, -0.2, 18, M(0xf5f7fa), false);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(25, 30), new THREE.MeshPhysicalMaterial({ map: waterTex(), color: 0xffffff, roughness: 0.12, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.4, envMapIntensity: 0.35 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.03, 18); water.receiveShadow = true; g.add(water);
  [23.5, 26, 28.5].forEach((z) => { box(17, 0.13, 0.13, -4, 0.07, z, M(0xf0c020, { roughness: 0.6 }), false); box(8, 0.13, 0.13, 8.5, 0.07, z, M(0x111318, { roughness: 0.6 }), false); });
  // walls and roof face inward only, so the room opens up when you look in from outside
  const wm = (rx, ry) => new THREE.MeshStandardMaterial({ map: wallTex(rx, ry), roughness: 0.9 });
  plane(46, 15, 0, 7.5, -6.5, 0, 0, wm(46, 1));
  plane(49, 15, -23, 7.5, 18, 0, Math.PI / 2, wm(49, 1));
  plane(49, 15, 23, 7.5, 18, 0, -Math.PI / 2, wm(49, 1));
  plane(46, 15, 0, 7.5, 42.5, 0, Math.PI, wm(46, 1));
  const roofG = new THREE.Group(); g.add(roofG); g.userData.roof = roofG; const gAll = g; g = roofG;
  const roofM = M(0xeef3f8, { roughness: 0.95 }), slope = Math.atan2(4, 23), len = Math.hypot(23, 4);
  [-1, 1].forEach((sd) => { const r = plane(len, 49, sd * 11.5, 17, 18, Math.PI / 2, 0, roofM); r.rotation.set(Math.PI / 2, sd * slope, 0); });
  for (let z = -3; z <= 40; z += 6.2) [-1, 1].forEach((sd) => { const b = box(len, 0.35, 0.25, sd * 11.5, 16.8, z, white, false); b.rotation.z = -sd * slope; });
  for (let z = 0; z <= 36; z += 9) [-12, 0, 12].forEach((x) => { const y = 16.4 - Math.abs(x) * 4 / 23; box(1.6, 0.12, 0.9, x, y, z, new THREE.MeshBasicMaterial({ color: 0xffffff }), false); });
  g = gAll;
  // college-style banners on the far wall (plain colours, no marks)
  ['#c2410c', '#7f1d1d', '#1e3a8a', '#991b1b', '#111827', '#b91c1c', '#ea580c', '#1d4ed8', '#6d28d9', '#7c2d12', '#111827', '#dc2626'].forEach((c, i) => plane(1.5, 2.1, -19.5 + (i % 6) * 1.75, 11.2 - Math.floor(i / 6) * 2.4, -6.42, 0, 0, M(c)));
  // 10m tower
  [[-1.6, -4.8], [1.6, -4.8], [-1.6, -1.2], [1.6, -1.2]].forEach((p) => box(0.3, 10, 0.3, p[0], 5, p[1], steel));
  [3, 5, 7.5, 10].forEach((y) => { box(3.5, 0.16, 0.2, 0, y - 0.14, -4.8, steel); box(3.5, 0.16, 0.2, 0, y - 0.14, -1.2, steel); box(0.2, 0.16, 3.8, -1.6, y - 0.14, -3, steel); box(0.2, 0.16, 3.8, 1.6, y - 0.14, -3, steel); });
  for (let lv = 0; lv < 4; lv++) { const y0 = lv * 2.5, dir = lv % 2 ? -1 : 1; for (let i = 0; i < 10; i++) box(1.1, 0.06, 0.3, dir * 0.75, y0 + 0.25 + i * 0.25, -4.3 + dir * (-1.35 + i * 0.3), steel, false); box(2.9, 0.08, 0.9, 0, y0 + 2.5, -4.3 + dir * 1.6, steel, false); }
  const pt = M(0xe9eef4, { roughness: 0.7 });
  const platform = (w, d, x, y, z) => {
    box(w, 0.3, d, x, y - 0.15, z, pt); box(w, 0.02, d, x, y + 0.01, z, M(0x9fc4dc, { roughness: 0.9 }), false);
    const rl = d * 0.6, rz = z - d / 2 + rl / 2;
    [-1, 1].forEach((sd) => { const rx = x + sd * (w / 2 - 0.04); [1.0, 0.55].forEach((h) => box(0.05, 0.05, rl, rx, y + h, rz, steel, false)); for (let k = 0; k <= 3; k++) box(0.05, 1.0, 0.05, rx, y + 0.5, z - d / 2 + k * rl / 3, steel, false); });
    [1.0, 0.55].forEach((h) => box(w, 0.05, 0.05, x, y + h, z - d / 2 + 0.03, steel, false));
  };
  platform(3.2, 7.2, 0, 10, -0.6); platform(2.6, 6.2, -3.4, 7.5, -0.9); platform(2.6, 6.2, 3.4, 5, -0.9); platform(2.4, 5.4, -3.4, 3, -1.3);
  [[-4.5, 7.5], [-2.3, 7.5], [4.5, 5], [2.3, 5]].forEach((p) => box(0.26, p[1], 0.26, p[0], p[1] / 2, -3.4, steel));
  box(0.9, 2.6, 0.9, 5.6, 1.3, -1.5, M(0xcfd4dc));
  // 3m springboard stand
  box(8.2, 0.34, 4.6, -10.5, 2.72, -1.3, M(0xd9dde3)); [-13.6, -7.4].forEach((x) => box(0.9, 2.55, 0.9, x, 1.28, -1.3, M(0xcfd4dc)));
  box(8.2, 0.06, 0.06, -10.5, 3.95, -3.5, M(0xe8c21a), false); [-14.5, -10.5, -6.5].forEach((x) => box(0.06, 1.05, 0.06, x, 3.42, -3.5, M(0xe8c21a), false));
  const board = (x, y, z0) => { box(0.5, 0.06, 4.9, x, y, z0 + 2.45, M(0x3fc9b4, { roughness: 0.45 })); box(0.7, 0.35, 0.5, x, y - 0.2, z0 + 1.5, M(0x9aa3b2)); };
  board(-12.6, 3.02, -0.9); board(-8.4, 3.02, -0.9);
  // 1m springboards at the tower end and along both sides
  [9.3, 11.5].forEach((x) => { box(0.95, 0.8, 2.3, x, 0.4, 0.3, dark); board(x, 1.02, -0.8); });
  const sideBoard = (sd, z) => { box(2.3, 0.8, 0.95, sd * 14.6, 0.4, z, M(0xd9c7a3)); const b = box(4.9, 0.06, 0.5, sd * 12.4, 1.02, z, M(0x3fc9b4, { roughness: 0.45 })); return b; };
  [18.5, 21].forEach((z) => { sideBoard(-1, z); sideBoard(1, z); });
  // mezzanine seating
  const mezz = (sd, z0, z1, rows) => { const zl = z1 - z0, zc = (z0 + z1) / 2; box(5.5, 0.3, zl, sd * 20.25, 3.2, zc, M(0x3a4160)); box(0.18, 1.0, zl, sd * 17.5, 3.0, zc, navy); for (let i = 0; i < rows; i++) box(0.85, 0.42, zl - 0.6, sd * (18.4 + i * 0.9), 3.56 + i * 0.42, zc, white); for (let z = z0 + 1; z < z1; z += 6) box(0.3, 3.05, 0.3, sd * 17.7, 1.52, z, M(0xc9ced6)); };
  mezz(-1, 0, 36, 5); mezz(1, -3, 13, 4);
  // scoring tables and drape at the near end
  [6.3, 10.7].forEach((x) => box(4.2, 0.76, 0.9, x, 0.38, 37.4, dark));
  box(36, 2.4, 0.12, 0, 1.2, 39.4, M(0x0e0f14, { roughness: 1 }));
  // awards podium
  box(1.0, 0.6, 0.9, 0, 0.3, 36.2, dark); box(1.0, 0.42, 0.9, -1.0, 0.21, 36.2, dark); box(1.0, 0.3, 0.9, 1.0, 0.15, 36.2, dark);
  // scoreboard and the facility's own sponsor boards on the end wall (not USA Diving inventory)
  box(9.4, 6.4, 0.3, 0, 9.6, 42.3, M(0xf2c318, { roughness: 0.6 }), false); box(8.2, 4.2, 0.32, 0, 9.6, 42.28, M(0x1a1c22, { roughness: 0.5 }), false);
  [-6.6, 6.6].forEach((x) => box(3.3, 1.5, 0.15, x, 7.3, 42.3, M(0xf7f8fa), false));
  for (let i = 0; i < 11; i++) box(2.25, 1.3, 0.15, -12.5 + i * 2.5, 5.6, 42.3, M(i === 8 ? 0xf2a23a : i === 9 ? 0xf2d21a : 0xf7f8fa), false);
  return g;
}

/* ── signs ────────────────────────────────────────────── */
// A fabric wall that can curve in plan (arc or S-wave) and slope along its top edge.
function wallShape(s) {
  const N = 40, pos = [], uv = [], idx = [], edge = [], low = s.low || 1, d = s.d || 0;
  const zAt = (u) => s.plan === 'arc' ? d * (2 * u - 1) * (2 * u - 1) - d / 2 : s.plan === 'swave' ? d / 2 * Math.sin(2 * Math.PI * u) : 0;
  for (let k = 0; k <= N; k++) {
    const u = k / N, x = (u - 0.5) * s.w, z = zAt(u), top = s.h * (low + (1 - low) * u) - s.h / 2;
    pos.push(x, -s.h / 2, z, x, top, z); uv.push(u, 0, u, (top + s.h / 2) / s.h);
    if (k < N) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  for (let k = 0; k <= N; k++) edge.push(new THREE.Vector3(pos[k * 6], pos[k * 6 + 1], pos[k * 6 + 2]));
  for (let k = N; k >= 0; k--) edge.push(new THREE.Vector3(pos[k * 6 + 3], pos[k * 6 + 4], pos[k * 6 + 5]));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return { g, edge };
}
async function buildSigns() {
  const old = signs; signs = new THREE.Group(); signs.userData.trash = []; scene.add(signs);
  if (old) { scene.remove(old); (old.userData.trash || []).forEach((t) => t.dispose()); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); }); }
  const showLabels = $('m3Labels').checked, mine = signs, trash = signs.userData.trash;
  for (const s of model().signs) {
    const a = D.assetById(s.assetId), fid = D.creativeOf(s), art = fid ? await artTex(fid) : null;
    if (mine !== signs) return;
    const st = a ? a.status : 'Open', col = new THREE.Color(D.STATUS_COLOR[st] || '#059669');
    const tex = art || (showLabels ? labelTex(s, a) : null); if (tex && !art) trash.push(tex);
    const faceMat = (t, side) => new THREE.MeshStandardMaterial({ map: t, color: 0xffffff, roughness: 1, envMapIntensity: 0.2, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: t ? 0.42 : 0.25, side: side || THREE.FrontSide });
    const part = (ox, oy, rx, ry) => { if (!tex) return null; const c = tex.clone(); c.offset.set(ox, oy); c.repeat.set(rx, ry); c.needsUpdate = true; trash.push(c); return c; };
    const edge = new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.9, emissive: 0xffffff, emissiveIntensity: 0.3 });
    const grp = new THREE.Group(); grp.position.set(s.x, s.y, s.z); grp.rotation.y = s.ry || 0; grp.userData.sid = s.id;
    const tag = (m) => { m.castShadow = true; m.receiveShadow = true; m.userData.sid = s.id; return m; };
    const box = (w, h, dp, t) => tag(new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), [edge, edge, edge, edge, faceMat(t), dp > 0.1 ? faceMat(t) : edge]));
    const lines = (geo, color) => new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color }));
    const marks = (m, w, h, dp) => { if (art && showLabels) m.add(lines(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.06, h + 0.06, dp + 0.02)), col)); if (s.id === selId) m.add(lines(new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.16, h + 0.16, dp + 0.04)), 0x009ac7)); };
    if (s.kind === 'aframe') {
      const tilt = 0.26, off = Math.sin(tilt) * s.h / 2 + 0.03;
      const b1 = box(s.w, s.h, 0.05, tex); b1.rotation.x = -tilt; b1.position.z = off;
      const b2 = box(s.w, s.h, 0.05, tex); b2.rotation.y = Math.PI; b2.rotation.x = tilt; b2.position.z = -off;
      [b1, b2].forEach((b) => { marks(b, s.w, s.h, 0.05); grp.add(b); });
    } else if (s.kind === 'wall') {
      const sh = wallShape(s), m = tag(new THREE.Mesh(sh.g, faceMat(tex, THREE.DoubleSide)));
      const loop = (color, lift) => { const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(sh.edge), new THREE.LineBasicMaterial({ color })); l.scale.setScalar(lift); m.add(l); };
      if (art && showLabels) loop(col, 1.005); if (s.id === selId) loop(0x009ac7, 1.03);
      grp.add(m);
    } else if (s.kind === 'arch') {
      const leg = Math.min(s.leg || 0.5, s.w / 3), head = Math.min(s.head || 0.45, s.h / 2), dp = s.depth || 0.3, lu = leg / s.w, hv = head / s.h;
      const L = box(leg, s.h, dp, part(0, 0, lu, 1)); L.position.x = -(s.w / 2 - leg / 2);
      const Rr = box(leg, s.h, dp, part(1 - lu, 0, lu, 1)); Rr.position.x = s.w / 2 - leg / 2;
      const T = box(s.w - 2 * leg, head, dp, part(lu, 1 - hv, 1 - 2 * lu, hv)); T.position.y = s.h / 2 - head / 2;
      [[L, leg, s.h], [Rr, leg, s.h], [T, s.w - 2 * leg, head]].forEach((b) => { marks(b[0], b[1], b[2], dp); grp.add(b[0]); });
    } else { const b = box(s.w, s.h, 0.05, tex); marks(b, s.w, s.h, 0.05); grp.add(b); }
    signs.add(grp);
  }
  draw();
}

/* ── rendering and picking ────────────────────────────── */
function inside() { const p = cam.position; return p.y < 13 && Math.abs(p.x) < 23 && p.z > -6.5 && p.z < 42.5; }
function draw() { if (!visible || needs) return; needs = true; requestAnimationFrame(() => { needs = false; if (!R) return; room.userData.roof.visible = inside(); R.render(scene, cam); }); }
function resize() { const st = $('m3Stage'), h = Math.max(420, Math.min(window.innerHeight - 210, 900)); st.style.height = h + 'px'; if (window.innerWidth > 1000) $('m3Panel').style.height = (h + st.previousElementSibling.offsetHeight) + 'px'; else $('m3Panel').style.height = ''; const w = st.clientWidth; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); draw(); }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  const r = R.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cam); const hit = ray.intersectObjects(signs ? signs.children : [], true).filter((h) => h.object.isMesh)[0];
  return hit ? hit.object.userData.sid : null;
}
const VIEWS = [
  ['Overview', [-33, 24, 50], [0, 2, 13]], ['Broadcast side', [-19.5, 6.2, 24], [1, 4, -1]], ['Deck level', [0, 1.7, 34], [0, 4.2, 0]],
  ['1m end', [14, 2.2, 11], [10, 1.5, -2]], ['Left deck', [-9, 1.8, 20], [-14.5, 0.6, 11]], ['Entrance', [9, 2.0, 27], [17.4, 1.3, 33.5]], ['Awards end', [0, 5.5, 14], [0, 3.2, 40]], ['From above', [0, 62, 18.1], [0, 0, 18]]
];
function goView(i) { cam.position.set(...VIEWS[i][1]); controls.target.set(...VIEWS[i][2]); controls.update(); document.querySelectorAll('#m3Views .dk-btn').forEach((b, k) => b.classList.toggle('on', k === i)); draw(); }

/* ── side panel ───────────────────────────────────────── */
function renderPanel() {
  const box = $('m3Panel'), e = D.ev(), s = signById(selId), esc = D.esc;
  if (!s) {
    box.innerHTML = '<h3>Signs in this venue</h3><p>Click a sign to edit it. Once it is selected, drag it to move it. Drop a picture onto a sign to see the artwork in place. Drag empty space to turn the room, scroll to zoom.</p><div class="dk-zlist">' +
      model().signs.map((x) => { const a = D.assetById(x.assetId); return '<button data-sid="' + x.id + '"><span>' + esc(x.label || (a ? a.name : x.name)) + '</span><span class="dk-pill ' + (a ? a.status : 'Open') + '">' + (a ? a.status : 'Not linked') + '</span></button>'; }).join('') + '</div>';
    return;
  }
  const a = D.assetById(s.assetId), fid = D.creativeOf(s), deg = Math.round((s.ry || 0) * 180 / Math.PI);
  const disp = displayOf(s);
  box.innerHTML = '<h3>Sign</h3>' + (disp && disp.own != null ? '<p><b>' + esc(disp.name) + '</b><br>' + esc(disp.size) + '. USA Diving owns ' + disp.own + '.' + (disp.skin ? '<br>' + esc(disp.skin) : '') + '</p>' : '') +
    '<label>Display type<select id="m3Type"><option value="">Keep as it is</option>' + DISPLAYS.map((d) => '<option value="' + d.key + '"' + (d.key === s.preset ? ' selected' : '') + '>' + esc(d.name) + '</option>').join('') + '</select></label>' +
    '<label>Inventory asset<select id="m3Asset"><option value="">Not linked</option>' + e.assets.map((x) => '<option value="' + x.id + '"' + (x.id === s.assetId ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label>' +
    (a ? '<label>Status<select id="m3Status" class="st-' + a.status + '">' + D.STATUSES.map((x) => '<option' + (x === a.status ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></label>' +
      '<label>Sponsor<input id="m3Sponsor" value="' + esc(a.sponsor) + '"></label><label>Agreed price each<input id="m3Price" inputmode="decimal" value="' + esc(a.price) + '" placeholder="Uses the ' + esc(a.tier) + ' tier"></label>' : '<p>Link this sign to an inventory asset to track its status and price.</p>') +
    '<label>Sponsor artwork for this event<div class="dk-drop" id="m3Drop">' + (fid ? '<img id="m3Prev" alt="">Click or drop to replace' : 'Drop or paste a picture here, or click to choose') + '</div><input type="file" id="m3File" accept="image/*,.heic,.heif" hidden></label>' +
    D.artChoicesHtml(fid) +
    '<div class="row">' + (fid ? '<button class="dk-btn small" id="m3CopyArt">Copy artwork</button>' : '') + (D.clip() && D.clip() !== fid ? '<button class="dk-btn small" id="m3PasteArt">Paste artwork</button>' : '') +
    (fid && !(disp && disp.own != null) ? '<button class="dk-btn small" id="m3Fit">Match sign shape to artwork</button>' : '') + (fid ? '<button class="dk-btn small" id="m3Clear">Remove artwork</button>' : '') + '</div><p id="m3FitNote" hidden></p>' +
    '<label>Placement, in metres</label><div class="dk-adjust">' +
    [['x', 'Left / right', s.x], ['z', 'Tower end / near end', s.z], ['y', 'Height off deck', s.y], ['deg', 'Turn, degrees', deg], ['w', 'Width', s.w], ['h', 'Height', s.h]].map((f) => '<label>' + f[1] + '<input data-adj="' + f[0] + '" type="number" step="' + (f[0] === 'deg' ? 5 : 0.1) + '" value="' + (Math.round(f[2] * 100) / 100) + '"></label>').join('') + '</div>' +
    '<div class="row" style="margin-top:auto"><button class="dk-btn" id="m3Done">Done</button><button class="dk-btn" id="m3Copy">Copy sign</button><button class="dk-btn danger" id="m3Del">Remove sign</button></div>';
  if (fid) D.fileUrl(fid).then((u) => { const im = $('m3Prev'); if (im && u) im.src = u; });
  if (fid) D.getImg(fid).then((im) => {
    const n = $('m3FitNote'); if (!n || !im || selId !== s.id) return;
    const sa = s.w / s.h, ia = im.naturalWidth / im.naturalHeight; if (Math.abs(sa - ia) / sa < 0.04) return;
    n.hidden = false; n.textContent = 'This sign is ' + sa.toFixed(2) + ' to 1 and the artwork is ' + ia.toFixed(2) + ' to 1, so it is ' + (ia > sa ? 'squeezed' : 'stretched') + ' sideways here. For print, design it at ' + (s.w / FT).toFixed(1) + ' x ' + (s.h / FT).toFixed(1) + ' ft.';
  });
}
function renderAddSel() {
  const placed = {}; model().signs.forEach((x) => { if (x.preset) placed[x.preset] = (placed[x.preset] || 0) + 1; });
  $('m3AddSel').innerHTML = '<option value="">Add a sign or display</option>' + DISPLAYS.map((d) => '<option value="' + d.key + '">' + D.esc(d.name) + ' (' + D.esc(d.size) + ')' + (d.own != null ? ': own ' + d.own + ', ' + (placed[d.key] || 0) + ' placed' : '') + '</option>').join('');
}
function select(id) { const x = window.scrollX, y = window.scrollY; selId = id; renderPanel(); renderAddSel(); $('m3Panel').scrollTop = 0; buildSigns(); window.scrollTo(x, y); }
async function setArt(id, file) {
  const s = signById(id); if (!s || !file) return;
  try { const f = await D.importImage(file, 1600); D.libAdd(f); D.setCreativeFor(s, f.id); D.changed(); selId = id; renderPanel(); buildSigns(); }
  catch (err) { D.toast('That file could not be read as a picture.', 'error'); }
}

function wire() {
  const el = R.domElement; let down = null;
  let dragS = null; const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), grab = new THREE.Vector3();
  const floorPt = (e, y) => { const r = el.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); plane.constant = -y; return ray.ray.intersectPlane(plane, hit); };
  el.addEventListener('pointerdown', (e) => {
    down = [e.clientX, e.clientY];
    if (selId && pick(e) === selId) { const s = signById(selId); if (floorPt(e, s.y)) { dragS = { s, moved: false }; grab.set(hit.x - s.x, 0, hit.z - s.z); controls.enabled = false; el.setPointerCapture(e.pointerId); } }
  });
  el.addEventListener('pointerup', (e) => {
    if (dragS) { controls.enabled = true; const mv = dragS.moved; dragS = null; if (mv) { D.changed(); renderPanel(); return; } }
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const id = pick(e); if (id !== selId) select(id);
  });
  el.addEventListener('pointermove', (e) => {
    if (dragS) {
      if (!dragS.moved && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) return;
      if (!floorPt(e, dragS.s.y)) return; dragS.moved = true;
      dragS.s.x = r2(Math.max(-22, Math.min(22, hit.x - grab.x))); dragS.s.z = r2(Math.max(-6, Math.min(42, hit.z - grab.z)));
      const g = signs.children.filter((c) => c.userData.sid === dragS.s.id)[0]; if (g) g.position.set(dragS.s.x, dragS.s.y, dragS.s.z); draw(); return;
    }
    if (e.buttons) return; const id = pick(e); if (id !== hoverId) { hoverId = id; el.style.cursor = id ? (id === selId ? 'move' : 'pointer') : 'grab'; } });
  $('m3Views').innerHTML = VIEWS.map((v, i) => '<button class="dk-btn small" data-view="' + i + '">' + v[0] + '</button>').join('');
  $('m3Views').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) goView(+b.dataset.view); });
  $('m3Labels').addEventListener('change', buildSigns);
  $('m3AddSel').addEventListener('change', (e) => {
    const key = e.target.value; if (!key) return; const d = DISPLAYS.filter((x) => x.key === key)[0];
    const s = applyDisplay({ id: D.uid('m'), name: d.name, x: 0, y: 0, z: 37, ry: Math.PI, assetId: '' }, key); s.y = r2(s.h / 2);
    model().signs.push(s); D.changed(); select(s.id); D.toast('Added at the near end of the pool. Drag it to where it goes.');
  });
  $('m3Export').addEventListener('click', async () => { const keep = selId; selId = null; await buildSigns(); room.userData.roof.visible = inside(); R.render(scene, cam); const a = document.createElement('a'); a.href = R.domElement.toDataURL('image/jpeg', 0.92); a.download = (D.venue().name || 'venue') + '-3d.jpg'; document.body.appendChild(a); a.click(); a.remove(); selId = keep; buildSigns(); });
  const P = $('m3Panel');
  P.addEventListener('click', (e) => {
    const t = e.target, sb = t.closest('[data-sid]'); if (sb) { select(sb.dataset.sid); return; }
    const s = signById(selId); if (!s) return;
    if (t.id === 'm3Done') select(null);
    else if (t.id === 'm3Clear') { D.clearCreativeFor(s); D.changed(); renderPanel(); buildSigns(); }
    else if (t.closest('[data-art]')) D.pasteArt(s, t.closest('[data-art]').dataset.art);
    else if (t.id === 'm3CopyArt') D.copyArt(s);
    else if (t.id === 'm3PasteArt') D.pasteArt(s);
    else if (t.id === 'm3Fit') { D.getImg(D.creativeOf(s)).then((im) => { if (!im) return; s.w = Math.round(s.h * im.naturalWidth / im.naturalHeight * 100) / 100; D.changed(); renderPanel(); buildSigns(); }); }
    else if (t.id === 'm3Copy') { const c = Object.assign({}, s, { id: D.uid('m'), z: s.z + (s.kind === 'aframe' ? s.w + 0.1 : 0), x: s.x + (s.kind === 'aframe' ? 0 : s.w + 0.2), assetId: '' }); model().signs.push(c); D.changed(); select(c.id); }
    else if (t.id === 'm3Del') { const m = model(); m.signs = m.signs.filter((x) => x.id !== s.id); D.changed(); select(null); }
  });
  P.addEventListener('change', (e) => {
    const t = e.target, s = signById(selId); if (!s) return; const a = D.assetById(s.assetId);
    if (t.id === 'm3Asset') s.assetId = t.value;
    else if (t.id === 'm3Type') { if (!t.value) return; const bottom = s.y - s.h / 2; applyDisplay(s, t.value); s.y = r2(bottom + s.h / 2); }
    else if (t.id === 'm3Status' && a) { a.status = t.value; if (a.status === 'Open') a.sponsor = ''; }
    else if (t.id === 'm3Sponsor' && a) a.sponsor = t.value;
    else if (t.id === 'm3Price' && a) a.price = String(t.value).trim() === '' ? '' : (parseFloat(t.value) || 0);
    else if (t.id === 'm3File') { setArt(s.id, t.files[0]); return; }
    else if (t.dataset.adj) { const v = parseFloat(t.value); if (!isFinite(v)) return; const k = t.dataset.adj; if (k === 'deg') s.ry = v * Math.PI / 180; else s[k] = (k === 'w' || k === 'h') ? Math.max(0.2, v) : v; D.changed(); buildSigns(); return; }
    else return;
    D.changed(); renderPanel(); buildSigns();
  });
  new ResizeObserver(() => { if (visible) resize(); }).observe($('m3Stage'));
}

function build() {
  try { R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); }
  catch (e) { $('m3Msg').textContent = 'This browser could not start the 3D view.'; return false; }
  R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NoToneMapping;
  $('m3Msg').remove(); $('m3Stage').appendChild(R.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xdfe5ef);
  const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  cam = new THREE.PerspectiveCamera(40, 1.6, 0.2, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd5dbe6, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0); sun.position.set(-10, 34, 24); sun.target.position.set(0, 0, 14); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 34, bottom: -34, near: 1, far: 90 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xffffff, 0.75); fill.position.set(6, 18, -4); fill.target.position.set(0, 4, 42); scene.add(fill); scene.add(fill.target);
  buildRoom();
  controls = new OrbitControls(cam, R.domElement); controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 3; controls.maxDistance = 110; controls.addEventListener('change', draw);
  wire(); built = true; return true;
}

window.DECKSIDE3D = {
  selected() { return signById(selId); },
  show() { visible = true; if (!built && !build()) return; resize(); renderAddSel(); if (!this._viewed) { goView(0); this._viewed = true; } if (selId && !signById(selId)) selId = null; renderPanel(); buildSigns(); },
  hide() { visible = false; },
  drop(e, file) { const id = e.target === (R && R.domElement) ? pick(e) : (e.target.closest && e.target.closest('#m3Drop') ? selId : null); if (id) setArt(id, file); else D.toast('Drop the picture onto a sign in the model.'); },
  paste(file) { if (selId) setArt(selId, file); else D.toast('Click a sign first, then paste.'); },
  _screen(id) { const s = signById(id), v = new THREE.Vector3(s.x, s.y, s.z).project(cam), r = R.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; },
  _state: () => ({ selId, signs: model().signs.length, cam: cam && cam.position.toArray() })
};
if (D.isReady) { if (D.tab() === 'model') window.DECKSIDE3D.show(); }
else document.addEventListener('deckside-ready', () => { if (D.tab() === 'model') window.DECKSIDE3D.show(); });
