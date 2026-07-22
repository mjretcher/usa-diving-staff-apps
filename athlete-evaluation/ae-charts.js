/* ============================================================
   ae-charts.js — brand-compliant SVG chart builders (pure functions
   returning SVG markup). Palette: Navy #171F69, Red #E31937,
   Pool #009AC7, Sky #8FC3EA. ADA rule: never red on blue.
   ============================================================ */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const NAVY = '#171F69', RED = '#E31937', POOL = '#009AC7', SKY = '#8FC3EA';
  const INK2 = '#5A6072', GRID = '#E4E7EF', GOLD = '#C9A227';

  function niceTicks(min, max, count) {
    if (!(max > min)) { max = min + 1; }
    const span = max - min;
    const step0 = span / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count + 0.5) || 10 * mag;
    const lo = Math.floor(min / step) * step;
    const out = [];
    for (let v = lo; v <= max + 1e-9; v += step) if (v >= min - 1e-9) out.push(+v.toFixed(6));
    return out;
  }

  /* ── Career trajectory: scatter + yearly-best line + reference lines ── */
  function trajectory(opts) {
    // opts: { points:[{x(yearFloat), y, label, color, big}], line:[{x,y}],
    //         refs:[{y,label,color,dash}], w,h, yLabel }
    const w = opts.w || 860, h = opts.h || 300;
    const padL = 52, padR = 16, padT = 14, padB = 30;
    const pts = opts.points.filter((p) => p.y != null);
    if (!pts.length) return `<div class="ae-empty">No scores to plot for this filter.</div>`;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y).concat((opts.refs || []).map((r) => r.y));
    const xMin = Math.floor(Math.min(...xs)) - 0.25, xMax = Math.ceil(Math.max(...xs)) + 0.25;
    let yMin = Math.min(...ys), yMax = Math.max(...ys);
    const yPad = (yMax - yMin || 50) * 0.08; yMin -= yPad; yMax += yPad;
    const X = (v) => padL + (v - xMin) / (xMax - xMin) * (w - padL - padR);
    const Y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (h - padT - padB);
    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img">`;
    niceTicks(yMin, yMax, 5).forEach((t) => {
      s += `<line x1="${padL}" y1="${Y(t)}" x2="${w - padR}" y2="${Y(t)}" stroke="${GRID}"/>` +
           `<text x="${padL - 7}" y="${Y(t) + 4}" text-anchor="end" class="ae-tick">${Math.round(t)}</text>`;
    });
    for (let yr = Math.ceil(xMin); yr <= Math.floor(xMax); yr++) {
      s += `<text x="${X(yr + 0.4)}" y="${h - 8}" text-anchor="middle" class="ae-tick">${yr}</text>`;
    }
    (opts.refs || []).forEach((r) => {
      if (r.y == null || r.y < yMin || r.y > yMax) return;
      s += `<line x1="${padL}" y1="${Y(r.y)}" x2="${w - padR}" y2="${Y(r.y)}" stroke="${r.color || GOLD}" stroke-width="1.6" ${r.dash ? 'stroke-dasharray="6 4"' : ''}/>` +
           `<text x="${w - padR - 4}" y="${Y(r.y) - 4}" text-anchor="end" class="ae-reflabel" fill="${r.color || GOLD}">${esc(r.label)}</text>`;
    });
    if (opts.line && opts.line.length > 1) {
      const d = opts.line.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
      s += `<path d="${d}" fill="none" stroke="${NAVY}" stroke-width="2.4" stroke-linejoin="round" opacity="0.85"/>`;
    }
    pts.forEach((p) => {
      const r = p.big ? 5 : 3.4;
      s += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${r}" fill="${p.color || NAVY}" ` +
           `stroke="#fff" stroke-width="1" opacity="${p.big ? 1 : 0.85}"><title>${esc(p.label)}</title></circle>`;
    });
    s += `</svg>`;
    return s;
  }

  /* ── Candlestick reliability row (min | p25–p75 box | p50 tick | max) ── */
  function candleRow(st, scaleMin, scaleMax, w) {
    w = w || 340;
    const h = 26, X = (v) => 2 + (Math.max(scaleMin, Math.min(scaleMax, v)) - scaleMin) / (scaleMax - scaleMin) * (w - 4);
    const zones = [[0, 4.5, '#FBE3E7'], [4.5, 6.5, '#F2F4F9'], [6.5, 8.5, '#E2F2F8'], [8.5, 10, '#D5ECD9']];
    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-candle" role="img" preserveAspectRatio="none">`;
    zones.forEach(([a, b, c]) => {
      if (b < scaleMin || a > scaleMax) return;
      s += `<rect x="${X(Math.max(a, scaleMin))}" y="0" width="${X(Math.min(b, scaleMax)) - X(Math.max(a, scaleMin))}" height="${h}" fill="${c}"/>`;
    });
    const mid = h / 2;
    s += `<line x1="${X(st.minExec)}" y1="${mid}" x2="${X(st.maxExec)}" y2="${mid}" stroke="${INK2}" stroke-width="1.4"/>`;
    s += `<rect x="${X(st.p25)}" y="${mid - 7}" width="${Math.max(2, X(st.p75) - X(st.p25))}" height="14" rx="2" fill="${POOL}" opacity="0.88"/>`;
    s += `<line x1="${X(st.p50)}" y1="${mid - 9}" x2="${X(st.p50)}" y2="${mid + 9}" stroke="${NAVY}" stroke-width="2.6"/>`;
    st.samples.forEach((sm) => {
      s += `<circle cx="${X(sm.exec)}" cy="${mid}" r="2" fill="${NAVY}" opacity="0.35"><title>${esc(sm.year + ' · ' + sm.stage + ' · ' + sm.exec.toFixed(2))}</title></circle>`;
    });
    s += `</svg>`;
    return s;
  }

  /* ── Density curve(s) for List Lab Monte Carlo output ── */
  function density(seriesList, opts) {
    // seriesList: [{samples:[...totals], color, label}]; opts:{refs:[{x,label,color}], w,h}
    const w = (opts && opts.w) || 720, h = (opts && opts.h) || 240;
    const padL = 12, padR = 12, padT = 20, padB = 28;
    const all = seriesList.flatMap((s) => s.samples);
    if (!all.length) return '';
    let mn = Math.min(...all), mx = Math.max(...all);
    (opts && opts.refs || []).forEach((r) => { if (r.x != null) { mn = Math.min(mn, r.x); mx = Math.max(mx, r.x); } });
    const pad = (mx - mn || 50) * 0.06; mn -= pad; mx += pad;
    const X = (v) => padL + (v - mn) / (mx - mn) * (w - padL - padR);
    const BINS = 46;
    const curves = seriesList.map((s) => {
      const counts = new Array(BINS).fill(0);
      s.samples.forEach((v) => { counts[Math.min(BINS - 1, Math.max(0, Math.floor((v - mn) / (mx - mn) * BINS)))]++; });
      const sm = counts.map((c, i) => (counts[i - 1] || 0) * 0.25 + c * 0.5 + (counts[i + 1] || 0) * 0.25);
      return { ...s, sm, max: Math.max(...sm) };
    });
    const gMax = Math.max(...curves.map((c) => c.max));
    const Y = (v) => padT + (1 - v / gMax) * (h - padT - padB);
    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img">`;
    niceTicks(mn, mx, 7).forEach((t) => {
      s += `<line x1="${X(t)}" y1="${padT}" x2="${X(t)}" y2="${h - padB}" stroke="${GRID}"/>` +
           `<text x="${X(t)}" y="${h - 8}" text-anchor="middle" class="ae-tick">${Math.round(t)}</text>`;
    });
    curves.forEach((c) => {
      const pts = c.sm.map((v, i) => [X(mn + (i + 0.5) / BINS * (mx - mn)), Y(v)]);
      const d = 'M' + X(mn) + ',' + Y(0) + pts.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('') + 'L' + X(mx) + ',' + Y(0) + 'Z';
      s += `<path d="${d}" fill="${c.color}" opacity="0.22"/>` +
           `<path d="${'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}" fill="none" stroke="${c.color}" stroke-width="2.4"/>`;
    });
    (opts && opts.refs || []).forEach((r) => {
      if (r.x == null) return;
      s += `<line x1="${X(r.x)}" y1="${padT - 2}" x2="${X(r.x)}" y2="${h - padB}" stroke="${r.color || GOLD}" stroke-width="1.8" stroke-dasharray="5 4"/>` +
           `<text x="${X(r.x)}" y="${padT - 6}" text-anchor="middle" class="ae-reflabel" fill="${r.color || GOLD}">${esc(r.label)}</text>`;
    });
    s += `</svg>`;
    return s;
  }

  /* ── Waterfall for Podium Gap ── */
  function waterfall(steps, opts) {
    // steps: [{label, value(absolute cumulative), delta, color}] first = base, last = target
    const w = (opts && opts.w) || 680, h = (opts && opts.h) || 260;
    const padL = 52, padR = 14, padT = 16, padB = 46;
    const vals = steps.map((s) => s.value);
    let mn = Math.min(...vals), mx = Math.max(...vals);
    const pad = (mx - mn || 40) * 0.15; mn -= pad; mx += pad * 0.4;
    const Y = (v) => padT + (1 - (v - mn) / (mx - mn)) * (h - padT - padB);
    const bw = (w - padL - padR) / steps.length;
    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img">`;
    niceTicks(mn, mx, 5).forEach((t) => {
      s += `<line x1="${padL}" y1="${Y(t)}" x2="${w - padR}" y2="${Y(t)}" stroke="${GRID}"/>` +
           `<text x="${padL - 7}" y="${Y(t) + 4}" text-anchor="end" class="ae-tick">${Math.round(t)}</text>`;
    });
    steps.forEach((st, i) => {
      const x = padL + i * bw + bw * 0.16, bwid = bw * 0.68;
      const prev = i === 0 ? mn : steps[i - 1].value;
      const isAnchor = i === 0 || i === steps.length - 1;
      const y0 = isAnchor ? Y(mn) : Y(Math.max(prev, st.value));
      const y1 = isAnchor ? Y(st.value) : Y(Math.min(prev, st.value));
      s += `<rect x="${x}" y="${Math.min(y0, y1)}" width="${bwid}" height="${Math.max(3, Math.abs(y0 - y1))}" rx="3" fill="${st.color}"><title>${esc(st.label)}: ${isAnchor ? st.value.toFixed(1) : (st.delta >= 0 ? '+' : '') + st.delta.toFixed(1)}</title></rect>`;
      if (i > 0 && !isAnchor) {
        s += `<line x1="${x - bw * 0.32}" y1="${Y(prev)}" x2="${x}" y2="${Y(prev)}" stroke="${INK2}" stroke-dasharray="3 3"/>`;
      }
      s += `<text x="${x + bwid / 2}" y="${Y(st.value) - 6}" text-anchor="middle" class="ae-wf-val">${isAnchor ? st.value.toFixed(1) : (st.delta >= 0 ? '+' : '') + st.delta.toFixed(1)}</text>`;
      const words = String(st.label).split(' ');
      const l1 = words.slice(0, Math.ceil(words.length / 2)).join(' '), l2 = words.slice(Math.ceil(words.length / 2)).join(' ');
      s += `<text x="${x + bwid / 2}" y="${h - 28}" text-anchor="middle" class="ae-tick">${esc(l1)}</text>` +
           `<text x="${x + bwid / 2}" y="${h - 15}" text-anchor="middle" class="ae-tick">${esc(l2)}</text>`;
    });
    s += `</svg>`;
    return s;
  }

  /* ── Radar across the 6 dive groups ── */
  function radar(axes, series, opts) {
    // axes: [{code,label}], series: [{values (by axis index, 0-10 scale or null), color, label, fillOpacity}]
    const w = (opts && opts.w) || 380, h = w, cx = w / 2, cy = h / 2, R = w / 2 - 46;
    const maxV = (opts && opts.max) || 10;
    const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / axes.length;
    const P = (i, v) => [cx + Math.cos(ang(i)) * R * v / maxV, cy + Math.sin(ang(i)) * R * v / maxV];
    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img">`;
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      const pts = axes.map((_, i) => P(i, maxV * f).map((v) => v.toFixed(1)).join(',')).join(' ');
      s += `<polygon points="${pts}" fill="none" stroke="${GRID}"/>`;
    });
    axes.forEach((a, i) => {
      const [x, y] = P(i, maxV);
      s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${GRID}"/>`;
      const [lx, ly] = P(i, maxV * 1.18);
      s += `<text x="${lx}" y="${ly + 4}" text-anchor="middle" class="ae-tick" font-weight="700">${esc(a.label)}</text>`;
    });
    series.forEach((sr) => {
      const idx = sr.values.map((v, i) => v != null ? i : null).filter((i) => i != null);
      if (!idx.length) return;
      const pts = idx.map((i) => P(i, sr.values[i]).map((v) => v.toFixed(1)).join(',')).join(' ');
      s += `<polygon points="${pts}" fill="${sr.color}" fill-opacity="${sr.fillOpacity != null ? sr.fillOpacity : 0.14}" stroke="${sr.color}" stroke-width="2.2"/>`;
      idx.forEach((i) => {
        const [x, y] = P(i, sr.values[i]);
        s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${sr.color}"><title>${esc(sr.label + ' — ' + axes[i].label + ': ' + sr.values[i].toFixed(2))}</title></circle>`;
      });
    });
    s += `</svg>`;
    return s;
  }

  /* ── Race bump chart: place by round ── */
  function bump(divers, nRounds, opts) {
    // divers: [{name, places:[perRound placeOrNull], totals:[...], color, hi}]
    const w = (opts && opts.w) || 860;
    const nD = divers.length;
    const rowH = 22, padT = 30, padB = 12, padL = 12, padR = 190;
    const h = padT + padB + rowH * Math.min(nD, (opts && opts.maxPlaces) || nD);
    const maxPlace = Math.max(...divers.flatMap((d) => d.places.filter((p) => p != null)), 1);
    const X = (r) => padL + r / Math.max(1, nRounds - 1) * (w - padL - padR);
    const Y = (p) => padT + (p - 1) / Math.max(1, maxPlace - 1) * (h - padT - padB - 8);
    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img">`;
    for (let r = 0; r < nRounds; r++) {
      s += `<text x="${X(r)}" y="${16}" text-anchor="middle" class="ae-tick">Dive ${r + 1}</text>` +
           `<line x1="${X(r)}" y1="${padT - 6}" x2="${X(r)}" y2="${h - padB}" stroke="${GRID}"/>`;
    }
    const sorted = divers.slice().sort((a, b) => (a.hi ? 1 : 0) - (b.hi ? 1 : 0)); // highlighted drawn last
    sorted.forEach((d) => {
      const segs = [];
      d.places.forEach((p, r) => { if (p != null) segs.push([X(r), Y(p)]); });
      if (segs.length > 1) {
        s += `<path d="${'M' + segs.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}" fill="none" stroke="${d.color}" stroke-width="${d.hi ? 3.4 : 1.7}" opacity="${d.hi ? 1 : 0.45}" stroke-linejoin="round"/>`;
      }
      segs.forEach((p, i) => {
        s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${d.hi ? 4.4 : 2.6}" fill="${d.color}" opacity="${d.hi ? 1 : 0.55}"><title>${esc(d.name)} — after dive ${i + 1}: place ${d.places[i]}${d.totals && d.totals[i] != null ? ' · ' + d.totals[i].toFixed(1) + ' pts' : ''}</title></circle>`;
      });
      const lastIdx = d.places.map((p, i) => p != null ? i : -1).filter((i) => i >= 0).pop();
      if (lastIdx != null && lastIdx >= 0) {
        s += `<text x="${X(lastIdx) + 8}" y="${Y(d.places[lastIdx]) + 4}" class="ae-bump-name" fill="${d.hi ? d.color : INK2}" font-weight="${d.hi ? 800 : 500}" opacity="${d.hi ? 1 : 0.75}">${esc((d.places[lastIdx] != null ? d.places[lastIdx] + '. ' : '') + d.name)}</text>`;
      }
    });
    s += `</svg>`;
    return s;
  }

  /* ── Slot residual bars (Pressure) ── */
  function slotBars(slots, opts) {
    // slots: [{slot, mean, n}] residuals around 0
    const w = (opts && opts.w) || 520, h = (opts && opts.h) || 190;
    const padL = 46, padR = 10, padT = 14, padB = 30;
    const vals = slots.map((s) => s.mean).filter((v) => v != null);
    if (!vals.length) return `<div class="ae-empty">Not enough paired data.</div>`;
    let mx = Math.max(0.4, ...vals.map(Math.abs)); mx *= 1.15;
    const Y = (v) => padT + (1 - (v + mx) / (2 * mx)) * (h - padT - padB);
    const bw = (w - padL - padR) / slots.length;
    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img">`;
    [-mx, -mx / 2, 0, mx / 2, mx].forEach((t) => {
      s += `<line x1="${padL}" y1="${Y(t)}" x2="${w - padR}" y2="${Y(t)}" stroke="${t === 0 ? INK2 : GRID}" ${t === 0 ? 'stroke-width="1.4"' : ''}/>` +
           `<text x="${padL - 6}" y="${Y(t) + 4}" text-anchor="end" class="ae-tick">${t > 0 ? '+' : ''}${t.toFixed(1)}</text>`;
    });
    slots.forEach((sl, i) => {
      const x = padL + i * bw + bw * 0.2, bwid = bw * 0.6;
      if (sl.mean != null) {
        const up = sl.mean >= 0;
        s += `<rect x="${x}" y="${Y(Math.max(0, sl.mean))}" width="${bwid}" height="${Math.max(2, Math.abs(Y(sl.mean) - Y(0)))}" rx="2.5" fill="${up ? POOL : RED}" opacity="${sl.n >= 5 ? 0.92 : 0.45}"><title>Dive ${sl.slot}: ${sl.mean >= 0 ? '+' : ''}${sl.mean.toFixed(2)} judge pts vs own norm (n=${sl.n})</title></rect>`;
      }
      s += `<text x="${x + bwid / 2}" y="${h - 14}" text-anchor="middle" class="ae-tick">D${sl.slot}</text>` +
           `<text x="${x + bwid / 2}" y="${h - 3}" text-anchor="middle" class="ae-tick" opacity="0.65">n${sl.n}</text>`;
    });
    s += `</svg>`;
    return s;
  }

  /* ── Medal-Track corridor: bands per age group + cohort dots + athlete ── */
  function corridorBands(groups, opts) {
    // groups: [{label, senior:{n,p10,p25,p50,p75,p90}|null, intl:{...}|null,
    //           dots:[{y,name,year,tier}], athlete:{y,hollow,label}|null }]
    const w = (opts && opts.w) || 880, h = (opts && opts.h) || 340;
    const padL = 56, padR = 16, padT = 18, padB = 34;
    const ys = [];
    groups.forEach((g) => {
      ['senior', 'intl'].forEach((t) => { if (g[t]) ys.push(g[t].p10, g[t].p90); });
      g.dots.forEach((d) => ys.push(d.y));
      if (g.athlete) ys.push(g.athlete.y);
    });
    if (!ys.length) return '<div class="ae-empty">No corridor data for this event yet.</div>';
    let mn = Math.min(...ys), mx = Math.max(...ys);
    const pad = (mx - mn || 60) * 0.07; mn -= pad; mx += pad;
    const Y = (v) => padT + (1 - (v - mn) / (mx - mn)) * (h - padT - padB);
    const gw = (w - padL - padR) / groups.length;
    let s = `<svg viewBox="0 0 ${w} ${h}" class="ae-svg" role="img">`;
    niceTicks(mn, mx, 6).forEach((t) => {
      s += `<line x1="${padL}" y1="${Y(t)}" x2="${w - padR}" y2="${Y(t)}" stroke="${GRID}"/>` +
           `<text x="${padL - 7}" y="${Y(t) + 4}" text-anchor="end" class="ae-tick">${Math.round(t)}</text>`;
    });
    const athletePts = [];
    groups.forEach((g, i) => {
      const cx = padL + i * gw + gw / 2;
      s += `<text x="${cx}" y="${h - 10}" text-anchor="middle" class="ae-tick" font-weight="800">${esc(g.label)}</text>`;
      const band = (b, x0, bw, fill, stroke, faded) => {
        if (!b) return '';
        let o = '';
        o += `<line x1="${x0 + bw / 2}" y1="${Y(b.p10)}" x2="${x0 + bw / 2}" y2="${Y(b.p90)}" stroke="${stroke}" stroke-width="1.6" opacity="${faded ? 0.4 : 0.8}"/>`;
        o += `<rect x="${x0}" y="${Y(b.p75)}" width="${bw}" height="${Math.max(3, Y(b.p25) - Y(b.p75))}" rx="4" fill="${fill}" stroke="${stroke}" opacity="${faded ? 0.35 : 0.85}"><title>n=${b.n} athletes · middle half ${b.p25.toFixed(0)}–${b.p75.toFixed(0)} · typical ${b.p50.toFixed(0)}</title></rect>`;
        o += `<line x1="${x0}" y1="${Y(b.p50)}" x2="${x0 + bw}" y2="${Y(b.p50)}" stroke="${NAVY}" stroke-width="2.4" opacity="${faded ? 0.5 : 1}"/>`;
        return o;
      };
      if (g.senior && g.senior.n >= 3) s += band(g.senior, cx - gw * 0.30, gw * 0.36, SKY, POOL, g.senior.n < 5);
      if (g.intl && g.intl.n >= 3)     s += band(g.intl,   cx + gw * 0.02, gw * 0.24, '#FBD9DE', RED, g.intl.n < 5);
      g.dots.forEach((d) => {
        const dx = cx + (d.tier === 'intl' ? gw * 0.14 : -gw * 0.12) + (Math.random() - 0.5) * gw * 0.10;
        s += `<circle cx="${dx.toFixed(1)}" cy="${Y(d.y).toFixed(1)}" r="2.6" fill="${d.tier === 'intl' ? RED : POOL}" opacity="0.45"><title>${esc(d.name)} — ${d.y.toFixed(1)} (${d.year})${d.tier === 'intl' ? ' · went international' : ' · reached a senior final'}</title></circle>`;
      });
      if (g.athlete) {
        athletePts.push([cx, Y(g.athlete.y), g.athlete]);
      }
    });
    if (athletePts.length > 1) {
      s += `<path d="${'M' + athletePts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}" fill="none" stroke="${GOLD}" stroke-width="2.6" stroke-dasharray="${athletePts.some((p) => p[2].hollow) ? '5 4' : ''}"/>`;
    }
    athletePts.forEach(([x, y, a]) => {
      s += a.hollow
        ? `<circle cx="${x}" cy="${y}" r="6" fill="#fff" stroke="${GOLD}" stroke-width="2.6"><title>${esc(a.label)}</title></circle>`
        : `<circle cx="${x}" cy="${y}" r="6.4" fill="${GOLD}" stroke="#fff" stroke-width="1.6"><title>${esc(a.label)}</title></circle>`;
    });
    s += `</svg>`;
    return s;
  }

  window.AECharts = { trajectory, candleRow, density, waterfall, radar, bump, slotBars, corridorBands, niceTicks, COLORS: { NAVY, RED, POOL, SKY, GOLD, INK2 } };
})();
