/* Proportional-qualification visuals -- shared by the Boundary Studio committee
   paper and the 2027 Junior Circuit report, so both always draw the same way.
   Pure functions: data in, SVG string out. No libraries, no network.

   PQVisuals.oddsScatter({points, share, xLabel, yLabel, fixedLabel})
     every real event at one stop as a dot (x = divers in the event at that meet,
     y = share who advanced as it happened) against a flat line for the
     proportional rule (fields of 3 or fewer all advance).
   PQVisuals.pathwayBars(rows)
     one row per scenario, one aligned column per stop, bar length = event
     entries on a common scale; the rule sits between the bars.
   PQVisuals.zoneWalkthrough(ex)
     one event followed through one Zone: each Region's real field as dots,
     how many advance, the Zone's field (with its cap), and who goes on to
     Junior Nationals -- next to what actually happened. */
(function(root){
'use strict';
const NAVY = '#171F69', POOL = '#009AC7', RED = '#E31937', INK = '#141a3c', MUTED = '#5b6385', FAINT = '#dbe0ea', LINE = '#dde1ee';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = n => Math.round(n).toLocaleString('en-US');
const rhu = x => Math.floor(x + 0.5);
const quota = (n, share) => n <= 3 ? n : rhu(share * n);
const T = (x, y, s, o) => `<text x="${x}" y="${y}" font-family="Inter,system-ui,sans-serif" font-size="${(o&&o.size)||12}" fill="${(o&&o.fill)||MUTED}"${o&&o.weight?` font-weight="${o.weight}"`:''}${o&&o.anchor?` text-anchor="${o.anchor}"`:''}>${esc(s)}</text>`;

function oddsScatter(o){
  const W = 760, H = 380, L = 64, R = 24, Tp = 20, B = 52, pts = o.points || [], share = o.share;
  const xMax = Math.max(10, Math.ceil(Math.max(...pts.map(p => p[0])) / 10) * 10);
  const X = v => L + (W - L - R) * v / xMax, Y = v => Tp + (H - Tp - B) * (1 - v / 105);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(o.aria || 'Share advancing by field size')}">`;
  for (let v = 0; v <= 100; v += 25){ s += `<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${LINE}"/>` + T(L-8, Y(v)+4, v + '%', {anchor:'end'}); }
  for (let v = 0; v <= xMax; v += 10){ s += T(X(v), H-B+18, String(v), {anchor:'middle'}); }
  s += T((L+W-R)/2, H-10, o.xLabel || 'Divers in the event at that meet', {anchor:'middle'});
  pts.forEach(p => { s += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="4.2" fill="${RED}" fill-opacity=".45" stroke="${RED}" stroke-opacity=".8" stroke-width=".8"/>`; });
  // The rule as a clean line: fields of 3 or fewer all advance; otherwise the
  // set share (rounding to whole divers moves small fields a few points).
  s += `<path d="M${X(1)},${Y(100)} L${X(3)},${Y(100)} L${X(3.5)},${Y(share*100)} L${X(xMax)},${Y(share*100)}" fill="none" stroke="${NAVY}" stroke-width="2.6" stroke-linejoin="round"/>`;
  s += T(X(xMax)-4, Y(share*100)-8, `${Math.round(share*100)}% in every field`, {anchor:'end', fill:NAVY, weight:700});
  s += `<rect x="${W-R-300}" y="${Tp+4}" width="296" height="46" rx="6" fill="#fff" fill-opacity=".92" stroke="${LINE}"/>`
     + `<circle cx="${W-R-284}" cy="${Tp+20}" r="4.5" fill="${RED}" fill-opacity=".5" stroke="${RED}"/>` + T(W-R-272, Tp+24, o.fixedLabel || 'As it happened (one dot per event)', {fill:INK})
     + `<line x1="${W-R-292}" x2="${W-R-276}" y1="${Tp+38}" y2="${Tp+38}" stroke="${NAVY}" stroke-width="2.6"/>` + T(W-R-272, Tp+42, `Proportional: ${Math.round(share*100)}% of every field`, {fill:INK});
  return s + '</svg>';
}

function pathwayBars(rows){
  const cols = [{k:'first', label:'First stop'}, {k:'second', label:'Second stop'}, {k:'ewc', label:'East / West / Central'}, {k:'nats', label:'Junior Nationals'}];
  const W = 900, x0 = 190, colW = (W - x0 - 10) / cols.length, barMax = colW - 18, rowH = 80;
  const max = Math.max(...rows.map(r => Math.max(...Object.values(r.stops).map(s => s.entries || 0))));
  const H = 44 + rows.length * rowH + 30;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Event entries at each stop, one row per scenario, on a common scale">`;
  cols.forEach((c, i) => { s += T(x0 + i*colW, 22, c.label, {weight:600, fill:INK}); });
  s += `<line x1="10" x2="${W-10}" y1="32" y2="32" stroke="${INK}" stroke-width="1.2"/>`;
  rows.forEach((r, ri) => {
    const y = 44 + ri*rowH;
    if (r.highlight) s += `<rect x="4" y="${y-6}" width="${W-8}" height="${rowH-6}" rx="8" fill="#eef4fb"/>`;
    s += T(16, y+18, r.name, {weight:700, fill:INK, size:13}) + T(16, y+36, r.sub || '', {size:11.5});
    const fill = r.kind === 'real' ? 'none' : (r.kind === 'pq' ? POOL : '#8a93b0');
    cols.forEach((c, i) => {
      const st = r.stops[c.k], bx = x0 + i*colW;
      if (!st){ s += T(bx, y+22, '—', {fill:'#aab1c7'}); return; }
      const w = Math.max(3, barMax * st.entries / max);
      s += `<rect x="${bx}" y="${y+6}" width="${w.toFixed(1)}" height="16" rx="3" fill="${c.k==='nats' && r.kind!=='real' ? (r.kind==='pq'?NAVY:'#5b6385') : fill}"${r.kind==='real'?` stroke="#8a93b0" stroke-dasharray="3 2"`:''}/>`;
      s += T(bx, y+42, fmt(st.entries), {weight:700, fill:INK, size:14});
      if (st.rule) s += T(bx, y+58, '→ ' + st.rule, {size:11});
    });
    s += `<line x1="10" x2="${W-10}" y1="${y+rowH-8}" y2="${y+rowH-8}" stroke="${LINE}"/>`;
  });
  s += T(16, H-8, 'Bar length = event entries (one athlete in one event), same scale in every row. → shows how athletes advance from that stop.', {size:11});
  return s + '</svg>';
}

function dots(n, filled, x0, y0, cols, colors){
  let s = '';
  for (let i = 0; i < n; i++){ const c = i % cols, r = Math.floor(i / cols);
    let col = FAINT; for (const seg of colors){ if (i < seg.upTo){ col = seg.color; break; } }
    s += `<circle cx="${x0 + c*11}" cy="${y0 + r*11}" r="4.2" fill="${col}"/>`; }
  return s;
}
function zoneWalkthrough(ex){
  // ex: {event, zone, regions:[{name, field, actualSent}], stage1Share, takeUp, zoneCap, stage2Share, direct, actualZoneField, actualToNats}
  const W = 900, H = 330, reg = ex.regions;
  const adv = reg.map(r => quota(r.field, ex.stage1Share));
  const arriving = Math.round(adv.reduce((a, b) => a + b, 0) * ex.takeUp);
  const zoneField = Math.min(arriving, ex.zoneCap || Infinity);
  const toNats = quota(zoneField, ex.stage2Share), direct = Math.min(ex.direct || 0, toNats);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(ex.event)} followed through ${esc(ex.zone)}">`;
  s += T(10, 20, `${ex.event} · ${ex.zone} · real ${ex.year} fields, proportional rule applied`, {weight:700, fill:INK, size:13});
  reg.forEach((r, i) => {
    const y = 48 + i*150;
    s += T(10, y, `${r.name}: ${r.field} divers`, {weight:600, fill:INK});
    s += dots(r.field, adv[i], 14, y+14, 10, [{upTo: adv[i], color: POOL}]);
    s += T(10, y + 14 + Math.ceil(r.field/10)*11 + 12, `${adv[i]} advance (${Math.round(ex.stage1Share*100)}%)`, {fill:POOL, weight:700});
  });
  s += `<path d="M150,118 C215,118 215,86 272,86 M150,268 C230,268 230,100 272,100" fill="none" stroke="${POOL}" stroke-width="2"/>`;
  s += `<polygon points="272,80 282,86 272,92" fill="${POOL}"/><polygon points="272,94 282,100 272,106" fill="${POOL}"/>`;
  const zx = 290, zy = 60;
  s += T(zx, zy-12, `${ex.zone}: ${zoneField} divers`, {weight:600, fill:INK});
  s += dots(zoneField, toNats, zx+4, zy+4, 10, [{upTo: direct, color: NAVY}, {upTo: toNats, color: '#4a6cc9'}]);
  const zyEnd = zy + 4 + Math.ceil(zoneField/10)*11;
  s += T(zx, zyEnd + 12, `${fmt(arriving)} qualify and attend${ex.zoneCap && arriving > ex.zoneCap ? `; capped at ${ex.zoneCap}` : ''}`, {size:11.5});
  s += T(zx, zyEnd + 30, `${toNats} advance (${Math.round(ex.stage2Share*100)}%)`, {fill:NAVY, weight:700});
  s += `<path d="M420,92 L500,92" stroke="${NAVY}" stroke-width="2"/><polygon points="500,86 510,92 500,98" fill="${NAVY}"/>`;
  const nx = 530;
  s += T(nx, 70, 'Junior Nationals', {weight:600, fill:INK});
  s += `<rect x="${nx}" y="86" width="16" height="12" rx="2" fill="${NAVY}"/>` + T(nx+24, 96, `${direct} straight to the semifinal (places 1–2)`, {fill:INK});
  s += `<rect x="${nx}" y="108" width="16" height="12" rx="2" fill="#4a6cc9"/>` + T(nx+24, 118, `${toNats - direct} into prelims`, {fill:INK});
  s += `<rect x="${nx-10}" y="150" width="${W-nx}" height="140" rx="10" fill="#f6f7fb" stroke="${LINE}"/>`;
  s += T(nx, 176, `What actually happened in ${ex.year}`, {weight:700, fill:INK});
  reg.forEach((r, i) => { s += T(nx, 200 + i*20, `${r.name}: ${r.actualSent} of ${r.field} went to Zones (${Math.round(100*r.actualSent/r.field)}%)`, {fill:INK}); });
  s += T(nx, 200 + reg.length*20, `${ex.zone}: ${ex.actualZoneField} divers`, {fill:INK});
  s += T(nx, 220 + reg.length*20, `${ex.actualToNats} reached Junior Nationals${ex.actualNote ? ' ' + ex.actualNote : ''}`, {fill:INK});
  s += T(10, H-10, `Take-up ${Math.round(ex.takeUp*100)}% at Zones (measured). Dots are divers; filled dots advance. Real fields from DiveMeets results; the proportional rule is applied to them.`, {size:11});
  return s + '</svg>';
}
root.PQVisuals = {oddsScatter, pathwayBars, zoneWalkthrough, quota};
if (typeof module !== 'undefined') module.exports = root.PQVisuals;
})(typeof window !== 'undefined' ? window : globalThis);
