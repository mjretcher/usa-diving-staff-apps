/* ═══════════════════════════════════════════════════════════════════════
   JUDGES SCHEMATIC & ASSIGNMENTS
   ───────────────────────────────────────────────────────────────────────
   DiveMeets does the named assignments. This module answers the other
   half of the question: how MANY judges each event needs, where each
   numbered seat physically sits on the deck, what chair or riser it needs,
   and — where two panels rotate — which panel judges which round.

   Everything here traces to the 2026 USA Diving Technical Rulebook,
   Article 703.1. The rules that actually constrain a seating plan:

     703.1.a.2    7 judges for individual events whenever possible, 5 if
                  not, 3 in extreme cases. Synchro 11 (3+3 execution,
                  5 synchronization), 9 (2+2 execution, 5 synchro), or 7
                  (all judge both).
     703.1.a.6.i  Placed close together, preferably divided evenly on both
                  sides of the boards. One side only if that is not
                  practical.
     703.1.a.6.ii Every seat carries a distinctive number and a judge holds
                  that seat for the whole contest.
     703.1.a.6.iii NO judge seated inside the front edge of the board or
                  platform. This is the hard geometric constraint.
     703.1.a.6.iv 1M — deck level chairs.
     703.1.a.6.v  3M — not lower than 1.5 m (5 ft) above the water.
     703.1.a.6.vi Platform — 1.5 m (5 ft) or higher when possible.
     703.1.a.6.vii 3M and platform seats as far back from the pool as
                  practical.
     703.1.a.6.viii One-side fallback: two rows, HALF PLUS ONE in the front
                  row, the remainder elevated behind so they see over it.
     703.1.a.7    Synchro: judges on both sides, always exactly 5
                  synchronization judges, synchro judges sit BETWEEN the
                  execution judges, seat nearest the pool >= 5 ft and each
                  subsequent seat rises by at least 0.5 m (1' 6").
     703.1.a.7.vii A 7-judge synchro panel is seated CLOCKWISE with four on
                  the side nearest the equipment.
     703.1.a.3    Platform contests get a Platform Referee (balk judge)
                  with a clear unobstructed view of the takeoff.
     703.1.a.9    Split boards: front row judges the near board, back row
                  judges the far board and sits higher. Judge 1 has direct
                  line of sight just in front of the end of the boards.
     703.1.a.5    Double panels alternate after a maximum of three rounds.
     703.1.c.3    At Junior Nationals the Event Referee IS Judge Number 1.

   PANEL SIZE is a setting, not an assumption. Mike currently runs 5 for
   prelims and 7 for finals; both are editable per event and per session.
═══════════════════════════════════════════════════════════════════════ */

// ── FACILITY PROFILE ──────────────────────────────────────────────────
// Plan view of the well, wall at the top, boards and tower projecting down
// into the water. Mylan Park (Morgantown WV) differs from a stock layout:
// 5M sits directly under 10M, and 7.5M is offset to the 1M side with the
// 3M platform directly under it.
const JFAC_MYLAN = {
  name: 'Mylan Park Aquatic Center',
  boards: [
    { label: '3M', side: 'left', x: 168, count: 2 },
    { label: '1M', side: 'right', x: 488, count: 2 }
  ],
  towerBays: [
    { top: '10M', under: '5M', deep: true },
    { top: '7.5M', under: '3M', deep: false }
  ]
};
function jFacility() {
  return (typeof S === 'object' && S && S.judgeFacility) || JFAC_MYLAN;
}

// ── PANEL SIZE ────────────────────────────────────────────────────────
function jIsSynchro(ev) { return ev && ev.style === 'Synchronized'; }
function jIsScoring(ev) { return ev && ev.style !== 'Custom Block'; }
function jIsFinal(ev) { return ev && ev.round === 'Final'; }

function jSessDefaults(sess) {
  const d = (sess && sess.judges) || {};
  return {
    prelimSize: Number(d.prelimSize) || 5,
    finalSize: Number(d.finalSize) || 7,
    synchroSize: Number(d.synchroSize) || 9
  };
}
function jSize(sess, ev) {
  const e = (ev && ev.judges) || {};
  if (Number(e.size) > 0) return Number(e.size);
  const d = jSessDefaults(sess);
  if (jIsSynchro(ev)) return d.synchroSize;
  return jIsFinal(ev) ? d.finalSize : d.prelimSize;
}

// How many scoring events share this session — two events running at once
// cannot share one panel, so each gets its own one-side panel (703.1.a.6.viii).
function jConcurrent(sess) {
  return ((sess && sess.events) || []).filter(jIsScoring).length;
}
function jSplitSide(ev) { return /1m/i.test((ev && ev.apparatus) || '') ? 'right' : 'left'; }
function jPlacement(sess, ev) {
  const e = (ev && ev.judges) || {};
  if (e.placement && e.placement !== 'auto') return e.placement;
  if (jIsSynchro(ev)) return 'both';           // 703.1.a.7 requires both sides
  // Split boards run two full panels stacked on the deck for that apparatus.
  if (ev && ev.manualSplit) return jSplitSide(ev);
  if (jConcurrent(sess) > 1) return jSplitSide(ev);
  return 'both';
}
// Three distinct seating shapes, because they lay out differently:
//   'both'    - one panel divided across the two decks
//   'oneside' - one panel on one deck, half plus one in front (703.1.a.6.viii)
//   'split2'  - TWO full panels, one row each, on the same deck
function jMode(sess, ev) {
  if (jIsSynchro(ev)) return 'both';
  if (ev && ev.manualSplit && jPanels(sess, ev) > 1) return 'split2';
  return jPlacement(sess, ev) === 'both' ? 'both' : 'oneside';
}
// Head referee reverses the rulebook anchor: seat 1 at the far end of the row,
// numbers running back toward the boards. 'tip' restores 703.1.a.9.i.
function jNumberDir(sess, ev) {
  const e = (ev && ev.judges) || {}; if (e.numberDir) return e.numberDir;
  const d = (sess && sess.judges) || {}; if (d.numberDir) return d.numberDir;
  return 'far';
}
// Which board each row judges. House convention here inverts 703.1.a.9.i:
// the back row takes the board nearest the deck.
function jRowBoard(sess, ev, row) {
  const e = (ev && ev.judges) || {};
  if (e.rowBoards === 'rulebook') return row === 'back' ? 'far' : 'near';
  return row === 'back' ? 'near' : 'far';
}
function jPanels(sess, ev) {
  const e = (ev && ev.judges) || {};
  if (Number(e.panels) > 0) return Number(e.panels);
  return (ev && ev.manualSplit) ? 2 : 1;
}
function jBalk(sess, ev) {
  const e = (ev && ev.judges) || {};
  if (e.balk === true || e.balk === false) return e.balk;
  return typeof isPlatform === 'function' ? isPlatform(ev.apparatus) : false;
}
function jBalkSide(sess, ev) {
  const e = (ev && ev.judges) || {};
  if (e.balkSide) return e.balkSide;
  return jPlacement(sess, ev) === 'left' ? 'right' : 'left';
}

// ── SEAT MAP ──────────────────────────────────────────────────────────
// Returns numbered seats with deck, row and role. Seat 1 is always the
// anchor: direct line of sight just in front of the end of the boards
// (703.1.a.9.i), and at Junior Nationals it is the Event Referee.
function jSeatMap(sess, ev) {
  const size = jSize(sess, ev);
  const place = jPlacement(sess, ev);
  if (jIsSynchro(ev)) return jSynchroSeats(size);
  if (jMode(sess, ev) === 'split2') return jSplitSeats(sess, ev);

  const seats = [];
  if (place === 'both') {
    const left = Math.ceil(size / 2), right = size - left;
    for (let i = 0; i < left; i++) seats.push({ n: i + 1, deck: 'L', row: 'front', slot: i });
    for (let i = 0; i < right; i++) seats.push({ n: left + i + 1, deck: 'R', row: 'front', slot: i });
  } else {
    // 703.1.a.6.viii — half plus one in the front row.
    const front = Math.floor(size / 2) + 1, back = size - front;
    const deck = place === 'right' ? 'R' : 'L';
    for (let i = 0; i < front; i++) seats.push({ n: i + 1, deck, row: 'front', slot: i });
    for (let i = 0; i < back; i++) seats.push({ n: front + i + 1, deck, row: 'back', slot: i });
  }
  seats.forEach(s => { s.role = 'Execution'; });
  if (seats[0]) seats[0].ref = true;
  return seats;
}

// Split boards: two complete panels of five, one row each, same deck. Each
// panel is its own panel with its own Judge 1 / Event Referee (703.1.c.3.i).
function jSplitSeats(sess, ev) {
  const size = jSize(sess, ev);
  const deck = jPlacement(sess, ev) === 'right' ? 'R' : 'L';
  const dir = jNumberDir(sess, ev);
  const seats = [];
  ['front', 'back'].forEach(row => {
    for (let i = 0; i < size; i++) {
      seats.push({
        n: i + 1,
        deck, row,
        slot: dir === 'far' ? (size - 1 - i) : i,
        role: 'Execution',
        panel: row === 'front' ? 'Front panel' : 'Back panel',
        board: jRowBoard(sess, ev, row),
        ref: i === 0
      });
    }
  });
  return seats;
}

// Synchro: execution judges outboard on each side, the five synchronization
// judges BETWEEN them (703.1.a.7.iii), rising outward from the pool edge.
function jSynchroSeats(size) {
  const seats = [];
  if (size === 7) {
    // 703.1.a.7.vii — clockwise, four on the equipment side.
    for (let i = 0; i < 4; i++) seats.push({ n: i + 1, deck: 'L', row: 'front', slot: i, role: 'Execution + synchro' });
    for (let i = 0; i < 3; i++) seats.push({ n: i + 5, deck: 'R', row: 'front', slot: i, role: 'Execution + synchro' });
    if (seats[0]) seats[0].ref = true;
    return seats;
  }
  const exPer = size === 11 ? 3 : 2;             // 11 -> 3+3, 9 -> 2+2
  const syncL = size === 11 ? 2 : 2, syncR = 5 - syncL;
  let n = 1;
  for (let i = 0; i < exPer; i++) seats.push({ n: n++, deck: 'L', row: 'front', slot: i, role: 'Execution — diver 1' });
  for (let i = 0; i < exPer; i++) seats.push({ n: n++, deck: 'R', row: 'front', slot: i, role: 'Execution — diver 2' });
  for (let i = 0; i < syncL; i++) seats.push({ n: n++, deck: 'L', row: 'sync', slot: i, role: 'Synchronization', rise: i });
  for (let i = 0; i < syncR; i++) seats.push({ n: n++, deck: 'R', row: 'sync', slot: i, role: 'Synchronization', rise: i });
  if (seats[0]) seats[0].ref = true;
  return seats;
}

// ── PANEL ROTATION (703.1.c.3) ────────────────────────────────────────
// Keyed on dive count, and on discipline where a 9-dive springboard and a
// 9-dive platform contest rotate differently.
const J_ROTATION = {
  '5': { A: [1, 2, 5], B: [3, 4] },
  '6': { A: [1, 2, 6], B: [3, 4, 5] },
  '7': { A: [1, 2, 5, 6], B: [3, 4, 7] },
  '8': { A: [1, 2, 5, 6], B: [3, 4, 7, 8] },
  '9-sb': { A: [1, 2, 3, 6, 7], B: [4, 5, 8, 9] },
  '9-plat': { A: [1, 2, 5, 6, 7], B: [3, 4, 8, 9] },
  '10': { A: [1, 2, 3, 7, 8], B: [4, 5, 6, 9, 10] }
};
function jRotation(sess, ev) {
  if (jPanels(sess, ev) < 2) return null;
  const dives = Number(ev.numberOfDives) || Number(ev.defaultDives) || 0;
  if (!dives) return null;
  const plat = typeof isPlatform === 'function' ? isPlatform(ev.apparatus) : false;
  const key = (dives === 9) ? (plat ? '9-plat' : '9-sb') : String(dives);
  return J_ROTATION[key] || null;
}

// ── CHAIR & RISER SPEC ────────────────────────────────────────────────
function jChairSpec(sess, ev) {
  const app = String(ev.apparatus || '');
  const plat = typeof isPlatform === 'function' ? isPlatform(app) : false;
  const out = [];
  if (/1m/i.test(app)) out.push('1M — deck level chairs (703.1.a.6.iv)');
  else if (/3m/i.test(app)) out.push('3M — seats at least 5 ft above water level (703.1.a.6.v)');
  else if (plat) out.push('Platform — seats 5 ft or higher where possible (703.1.a.6.vi)');
  if (jPlacement(sess, ev) !== 'both') {
    out.push('Back row elevated above the front row so it sees over it (703.1.a.6.viii)');
  }
  if (ev.manualSplit) {
    const farRow = jRowBoard(sess, ev, 'back') === 'far' ? 'back' : 'front';
    out.push(`Split boards — two panels of ${jSize(sess, ev)}; the ${farRow} row judges the far board. Back row needs taller chairs or a platform to see over the front row (703.1.a.9.i)`);
    if (farRow === 'front') out.push('NOTE — 703.1.a.9.i pairs the FAR board with the BACK row; this event uses the head referee\u2019s reversed convention');
  }
  if (jIsSynchro(ev)) {
    out.push('Synchro — seat nearest the pool at least 5 ft, each seat outward rises at least 1\u2032 6\u2033 (703.1.a.7.iv\u2013v)');
  }
  if (!/1m/i.test(app)) out.push('Seats as far back from the pool as practical (703.1.a.6.vii)');
  out.push('No seat inside the front edge of the board or platform (703.1.a.6.iii)');
  return out;
}

// ── SCHEMATIC (SVG plan view) ─────────────────────────────────────────
const J_SVG = {
  w: 760, h: 486,
  deckL: [8, 126], pool: [130, 630], deckR: [634, 752],
  wallY: 40, boardEnd: 162, towerEnd: 156, deepEnd: 186, tipY: 196,
  rowY: 220, rowStep: 46, r: 15
};
function jSeatXY(seat, place) {
  const G = J_SVG;
  const nearL = 100, farL = 44, nearR = 660, farR = 716, midL = 67, midR = 693;
  let x;
  if (seat.deck === 'L') {
    if (place === 'both') x = midL;
    else x = seat.row === 'front' ? nearL : farL;
    if (seat.row === 'sync') x = nearL;
  } else {
    if (place === 'both') x = midR;
    else x = seat.row === 'front' ? nearR : farR;
    if (seat.row === 'sync') x = nearR;
  }
  // Split-board panels are two parallel rows at matching depths; the
  // half-plus-one fallback staggers its back row instead.
  if (seat.panel) return { x, y: 232 + seat.slot * 40 };
  let y = G.rowY + seat.slot * G.rowStep;
  if (seat.row === 'back') y += G.rowStep / 2;
  if (seat.row === 'sync') y = G.rowY + seat.slot * G.rowStep + 8;
  return { x, y };
}
function jSchematic(sess, ev) {
  const G = J_SVG, fac = jFacility();
  const place = jPlacement(sess, ev);
  const seats = jSeatMap(sess, ev);
  const size = jSize(sess, ev);
  const N = '#171F69', POOLC = '#009AC7', SKY = '#8FC3EA', RED = '#E31937', GRAY = '#5F6062';

  const towerX = 262, towerW = 190, bayW = towerW / Math.max(1, fac.towerBays.length);
  let bays = '';
  fac.towerBays.forEach((b, i) => {
    const bx = towerX + i * bayW;
    bays += `<line x1="${bx}" y1="${G.wallY + 4}" x2="${bx}" y2="${G.towerEnd}" stroke="#fff" stroke-width="1.5"/>`;
    bays += `<text x="${bx + bayW / 2}" y="${G.wallY + 48}" text-anchor="middle" class="jsv-bay">${esc(b.top)}</text>`;
    if (b.under) bays += `<text x="${bx + bayW / 2}" y="${G.wallY + 68}" text-anchor="middle" class="jsv-sub">${esc(b.under)} below</text>`;
    if (b.deep) bays += `<rect x="${bx + bayW / 2 - 26}" y="${G.towerEnd}" width="52" height="${G.deepEnd - G.towerEnd}" rx="3" fill="#C9CEDA"/>`;
  });

  let boards = '';
  fac.boards.forEach(bk => {
    for (let i = 0; i < bk.count; i++) {
      const bx = bk.x + i * 38;
      boards += `<rect x="${bx}" y="${G.wallY + 4}" width="14" height="${G.boardEnd - G.wallY - 4}" rx="3" fill="#BFE6D4" stroke="${N}" stroke-width="1"/>`;
    }
    const cx = bk.x + (bk.count - 1) * 19 + 7;
    boards += `<text x="${cx}" y="${G.boardEnd + 20}" text-anchor="middle" class="jsv-bay">${esc(bk.label)}</text>`;
  });

  let chairs = '';
  seats.forEach(s => {
    const p = jSeatXY(s, place);
    const fill = s.row === 'sync' ? SKY : (s.row === 'back' ? '#DCE3F5' : '#FFF');
    chairs += `<g><circle cx="${p.x}" cy="${p.y}" r="${G.r}" fill="${fill}" stroke="${N}" stroke-width="${s.ref ? 2.5 : 1.4}"/>`
      + `<text x="${p.x}" y="${p.y + 4}" text-anchor="middle" class="jsv-num">${s.n}</text></g>`;
    if (s.ref) chairs += `<text x="${p.x}" y="${p.y + G.r + 13}" text-anchor="middle" class="jsv-tag">REF</text>`;
  });

  let rowLabels = '';
  if (jMode(sess, ev) === 'split2') {
    const R = place === 'right';
    rowLabels = `<text x="${R ? 660 : 100}" y="212" text-anchor="middle" class="jsv-deck">FRONT</text>`
      + `<text x="${R ? 716 : 44}" y="212" text-anchor="middle" class="jsv-deck">BACK</text>`;
  }

  let balk = '';
  if (jBalk(sess, ev)) {
    const bx = jBalkSide(sess, ev) === 'right' ? 693 : 67;
    balk = `<g><circle cx="${bx}" cy="132" r="${G.r}" fill="#FDE2E7" stroke="${RED}" stroke-width="1.6"/>`
      + `<text x="${bx}" y="136" text-anchor="middle" class="jsv-num" fill="${RED}">B</text>`
      + `<text x="${bx}" y="${132 + G.r + 13}" text-anchor="middle" class="jsv-tag" fill="${RED}">BALK</text></g>`;
  }

  return `<svg viewBox="0 0 ${G.w} ${G.h}" width="100%" style="max-width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">
<style>
.jsv-bay{font:600 12px Inter,system-ui,sans-serif;fill:${N}}
.jsv-sub{font:500 10px Inter,system-ui,sans-serif;fill:${GRAY}}
.jsv-num{font:700 13px 'JetBrains Mono',monospace;fill:${N}}
.jsv-tag{font:700 8px Inter,system-ui,sans-serif;letter-spacing:.08em;fill:${GRAY}}
.jsv-deck{font:700 9px Inter,system-ui,sans-serif;letter-spacing:.1em;fill:${GRAY}}
.jsv-cap{font:500 10.5px Inter,system-ui,sans-serif;fill:${GRAY}}
</style>
<rect x="${G.pool[0]}" y="${G.wallY}" width="${G.pool[1] - G.pool[0]}" height="${G.h - G.wallY - 56}" rx="10" fill="#EAF6FB" stroke="${POOLC}" stroke-width="1"/>
<rect x="${towerX}" y="${G.wallY + 4}" width="${towerW}" height="${G.towerEnd - G.wallY - 4}" rx="4" fill="#C9CEDA" stroke="${N}" stroke-width="1"/>
${bays}${boards}
<line x1="${G.deckL[0]}" y1="${G.tipY}" x2="${G.deckR[1]}" y2="${G.tipY}" stroke="${RED}" stroke-width="1" stroke-dasharray="5 4" opacity=".75"/>
<rect x="${G.deckL[0]}" y="${G.wallY}" width="${G.deckL[1] - G.deckL[0]}" height="${G.h - G.wallY - 56}" rx="8" fill="none" stroke="${N}" stroke-width=".8" stroke-dasharray="4 4" opacity=".5"/>
<rect x="${G.deckR[0]}" y="${G.wallY}" width="${G.deckR[1] - G.deckR[0]}" height="${G.h - G.wallY - 56}" rx="8" fill="none" stroke="${N}" stroke-width=".8" stroke-dasharray="4 4" opacity=".5"/>
<text x="${(G.deckL[0] + G.deckL[1]) / 2}" y="${G.wallY + 20}" text-anchor="middle" class="jsv-deck">3M SIDE DECK</text>
<text x="${(G.deckR[0] + G.deckR[1]) / 2}" y="${G.wallY + 20}" text-anchor="middle" class="jsv-deck">1M SIDE DECK</text>
${rowLabels}${chairs}${balk}
<text x="${G.w / 2}" y="${G.h - 30}" text-anchor="middle" class="jsv-cap">Dashed line = front edge of boards and tower \u2014 no judge seats inside it (703.1.a.6.iii)</text>
<text x="${G.w / 2}" y="${G.h - 14}" text-anchor="middle" class="jsv-cap">${jCaption(sess, ev)}</text>
</svg>`;
}

// ── STATE SETTERS ─────────────────────────────────────────────────────
function jSeatSummary(sess, ev) {
  const seats = jSeatMap(sess, ev), size = jSize(sess, ev);
  const deck = jPlacement(sess, ev) === 'right' ? '1M-side deck' : '3M-side deck';
  if (jMode(sess, ev) === 'split2') {
    return `Front panel 1–${size} (${jRowBoard(sess, ev, 'front')} board) &nbsp;|&nbsp; `
      + `Back panel 1–${size} (${jRowBoard(sess, ev, 'back')} board) &nbsp;|&nbsp; both on the ${deck}`;
  }
  return seats.map(s =>
    `${s.n}${s.ref ? ' (ref)' : ''} ${s.deck === 'L' ? '3M side' : '1M side'}`
    + `${s.row === 'back' ? ', back row' : (s.row === 'sync' ? ', synchro riser' : '')}`
  ).join(' &nbsp;|&nbsp; ');
}

function jCaption(sess, ev) {
  const size = jSize(sess, ev), mode = jMode(sess, ev);
  if (mode === 'split2') {
    const fb = jRowBoard(sess, ev, 'front'), bb = jRowBoard(sess, ev, 'back');
    return `Two panels of ${size} · front panel judges the ${fb} board, back panel the ${bb} board · seat 1 = Event Referee on each panel`;
  }
  if (mode === 'oneside') return `${size}-judge panel · seat 1 = Event Referee · one side, half plus one in the front row`;
  return `${size}-judge panel · seat 1 = Event Referee · divided across both decks`;
}

function updEvJudges(sessId, evId, field, value) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const ev = sess.events.find(e => e.id === evId); if (!ev) return;
    if (!ev.judges) ev.judges = {};
    ev.judges[field] = value;
  });
}
function updSessJudges(sessId, field, value) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    if (!sess.judges) sess.judges = {};
    sess.judges[field] = Number(value) || value;
  });
}
function jApplySession(sessId) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const d = jSessDefaults(sess);
    (sess.events || []).filter(jIsScoring).forEach(ev => {
      if (!ev.judges) ev.judges = {};
      ev.judges.size = jIsSynchro(ev) ? d.synchroSize : (jIsFinal(ev) ? d.finalSize : d.prelimSize);
    });
  });
  if (typeof toast === 'function') toast('Panel sizes applied to this session');
}
function jToggleSchematic(sessId, evId) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const ev = sess.events.find(e => e.id === evId); if (!ev) return;
    if (!ev.judges) ev.judges = {};
    ev.judges.show = !ev.judges.show;
  });
}

// ── EDITOR: SESSION PANEL ─────────────────────────────────────────────
function renderJudgesSessPanel(sess) {
  if (!sess || sess.isPractice) return '';
  if (!((sess.events || []).some(jIsScoring))) return '';
  const d = jSessDefaults(sess);
  const chip = (field, v, cur) =>
    `<button class="chip ${Number(cur) === v ? 'on' : ''}" onclick="updSessJudges('${sess.id}','${field}',${v})">${v}</button>`;
  return `
    <div class="fdiv"></div>
    <div class="fsec">Judges</div>
    <div class="fg2">
      <div class="fg"><label class="fl">Prelim / qualifier panel</label>
        <div class="chiprow">${[3, 5, 7].map(v => chip('prelimSize', v, d.prelimSize)).join('')}</div></div>
      <div class="fg"><label class="fl">Final panel</label>
        <div class="chiprow">${[5, 7].map(v => chip('finalSize', v, d.finalSize)).join('')}</div></div>
    </div>
    <div class="fg"><label class="fl">Synchro panel</label>
      <div class="chiprow">${[7, 9, 11].map(v => chip('synchroSize', v, d.synchroSize)).join('')}</div></div>
    <div class="chiprow" style="margin-top:8px">
      <button class="chip" onclick="jApplySession('${sess.id}')">Apply to every event here</button>
      <button class="chip" onclick="printJudges('${sess.id}')">Print this session</button>
      <button class="chip" onclick="printJudges(null)">Print whole meet</button>
    </div>`;
}

// ── EDITOR: PER-EVENT PANEL ───────────────────────────────────────────
function renderJudgesEvPanel(sess, ev) {
  if (!jIsScoring(ev)) return '';
  const size = jSize(sess, ev), place = jPlacement(sess, ev), panels = jPanels(sess, ev);
  const rot = jRotation(sess, ev);
  const sizes = jIsSynchro(ev) ? [7, 9, 11] : [3, 5, 7];
  const lbl = s => `<div style="font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;margin-bottom:3px">${s}</div>`;
  const chip = (field, v, cur, txt) =>
    `<button class="chip ${String(cur) === String(v) ? 'on' : ''}" style="padding:3px 8px;font-size:11px" onclick="updEvJudges('${sess.id}','${ev.id}','${field}',${typeof v === 'number' ? v : `'${v}'`})">${txt == null ? v : txt}</button>`;

  const rotLine = rot
    ? `<div style="font-size:10px;color:var(--tx2);margin-top:6px">Rotation (703.1.c.3) — <strong>Panel A</strong> rounds ${rot.A.join(', ')} &nbsp;·&nbsp; <strong>Panel B</strong> rounds ${rot.B.join(', ')} &nbsp;·&nbsp; ${size * 2} judges total</div>`
    : (panels > 1
      ? `<div style="font-size:10px;color:var(--split-tx);margin-top:6px">Two panels set, but no published rotation matches ${ev.numberOfDives || '?'} dives — panels alternate after a maximum of three rounds (703.1.a.5.ii).</div>`
      : '');

  const schem = ev.judges && ev.judges.show
    ? `<div style="margin-top:10px;border:1px solid var(--bd);border-radius:var(--r);padding:8px;background:var(--surf2)">
         ${jSchematic(sess, ev)}
         <ul style="margin:8px 0 0 16px;padding:0;font-size:10px;color:var(--tx2);line-height:1.6">
           ${jChairSpec(sess, ev).map(x => `<li>${esc(x)}</li>`).join('')}
         </ul>
       </div>`
    : '';

  return `
    <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--bd2)">
      <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap">
        <div>${lbl('Judges')}<div class="chiprow">${sizes.map(v => chip('size', v, size)).join('')}</div></div>
        <div>${lbl('Panels')}<div class="chiprow">${[1, 2].map(v => chip('panels', v, panels)).join('')}</div></div>
        <div>${lbl('Seating')}<div class="chiprow">
          ${chip('placement', 'auto', (ev.judges && ev.judges.placement) || 'auto', 'Auto')}
          ${chip('placement', 'both', (ev.judges && ev.judges.placement) || '', 'Both decks')}
          ${chip('placement', 'left', (ev.judges && ev.judges.placement) || '', '3M side')}
          ${chip('placement', 'right', (ev.judges && ev.judges.placement) || '', '1M side')}
        </div></div>
        <div>${lbl('Balk judge')}<div class="chiprow">
          <button class="chip ${jBalk(sess, ev) ? 'on-r' : ''}" style="padding:3px 8px;font-size:11px" onclick="updEvJudges('${sess.id}','${ev.id}','balk',${!jBalk(sess, ev)})">${jBalk(sess, ev) ? 'On' : 'Off'}</button>
        </div></div>
        <div style="flex:1;text-align:right">
          <button class="chip" style="padding:3px 10px;font-size:11px" onclick="jToggleSchematic('${sess.id}','${ev.id}')">${ev.judges && ev.judges.show ? 'Hide' : 'Schematic'}</button>
        </div>
      </div>
      ${jMode(sess, ev) === 'split2' ? `<div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-top:8px">
        <div>${lbl('Seat 1 sits')}<div class="chiprow">
          ${chip('numberDir', 'far', jNumberDir(sess, ev), 'Far end of row')}
          ${chip('numberDir', 'tip', jNumberDir(sess, ev), 'At board tips')}
        </div></div>
        <div>${lbl('Back panel judges')}<div class="chiprow">
          ${chip('rowBoards', 'houseref', (ev.judges && ev.judges.rowBoards) || 'houseref', 'Closest board')}
          ${chip('rowBoards', 'rulebook', (ev.judges && ev.judges.rowBoards) || '', 'Furthest board')}
        </div></div>
      </div>` : ''}
      <div style="font-size:10px;color:var(--tx3);margin-top:5px">${esc(jPlaceWords(sess, ev))}</div>
      ${rotLine}${schem}
    </div>`;
}
function jPlaceWords(sess, ev) {
  const size = jSize(sess, ev), place = jPlacement(sess, ev);
  const seats = jSeatMap(sess, ev);
  if (jMode(sess, ev) === 'split2') {
    const which = place === 'right' ? '1M-side' : '3M-side';
    const dir = jNumberDir(sess, ev) === 'far'
      ? 'far end of the row, numbers running back toward the boards'
      : 'board-tip sight line (703.1.a.9.i)';
    return `Two panels of ${size} on the ${which} deck — ${size * 2} judges. Front panel judges the ${jRowBoard(sess, ev, 'front')} board, back panel the ${jRowBoard(sess, ev, 'back')} board. Each panel numbered 1–${size} with its own referee at seat 1, placed at the ${dir}.`;
  }
  if (place === 'both') {
    const l = seats.filter(s => s.deck === 'L').length, r = seats.length - l;
    return `${l} on the 3M-side deck, ${r} on the 1M-side deck. Seat 1 is the Event Referee, on the board-tip sight line.`;
  }
  const front = seats.filter(s => s.row === 'front').length, back = seats.length - front;
  const which = place === 'right' ? '1M-side' : '3M-side';
  return `All ${size} on the ${which} deck — ${front} poolside, ${back} elevated behind (half plus one in front). Seat 1 is the Event Referee.`;
}

// ── PRINT REPORT ──────────────────────────────────────────────────────
function jDayOf(sess) {
  const days = (typeof S === 'object' && S && S.days) || [];
  return days.find(d => d.id === sess.dayId) || null;
}
function jDayLabel(sess) {
  const d = jDayOf(sess);
  if (!d) return '';
  return String(d.label || d.name || d.date || '');
}
function printJudges(sessId) {
  const sessions = ((typeof S === 'object' && S && S.sessions) || [])
    .filter(s => !s.isPractice && (s.events || []).some(jIsScoring))
    .filter(s => !sessId || s.id === sessId);
  if (!sessions.length) { if (typeof toast === 'function') toast('No scoring events to report'); return; }
  const title = (typeof genTitle === 'function' && genTitle()) || (S.meet && S.meet.name) || 'USA Diving';
  const fac = jFacility();

  const blocks = sessions.map(sess => {
    const evs = (sess.events || []).filter(jIsScoring);
    const rows = evs.map(ev => {
      const size = jSize(sess, ev), panels = jPanels(sess, ev), rot = jRotation(sess, ev);
      const seats = jSeatMap(sess, ev);
      const seatTxt = jSeatSummary(sess, ev);
      const rotTxt = rot
        ? `A: ${rot.A.join(', ')} &nbsp; B: ${rot.B.join(', ')}`
        : (panels > 1 ? 'Alternate max every 3 rounds' : '\u2014');
      return `<tr>
        <td class="jr-ev">${esc(evName(ev))}${evRound(ev) ? `<span class="jr-rd">${esc(evRound(ev))}</span>` : ''}</td>
        <td class="jr-n">${size}${panels > 1 ? ` \u00d7 ${panels}` : ''}</td>
        <td class="jr-n">${panels > 1 ? size * panels : size}</td>
        <td class="jr-rot">${rotTxt}</td>
        <td class="jr-seat">${seatTxt}</td>
        <td class="jr-n">${jBalk(sess, ev) ? 'Yes' : '\u2014'}</td>
      </tr>`;
    }).join('');
    const schems = evs.map(ev => `<div class="jr-sch"><div class="jr-schh">${esc(evName(ev))} ${esc(evRound(ev) || '')}</div>${jSchematic(sess, ev)}
      <ul class="jr-spec">${jChairSpec(sess, ev).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
    return `<section class="jr-sess">
      <div class="jr-hd"><span class="jr-badge">Session</span><span class="jr-nm">${esc(sess.title || evName(evs[0]) || 'Session')}</span><span class="jr-day">${esc(jDayLabel(sess))}</span></div>
      <table class="jr-tbl"><thead><tr>
        <th>Event</th><th>Panel</th><th>Judges needed</th><th>Panel rotation</th><th>Seat map</th><th>Balk</th>
      </tr></thead><tbody>${rows}</tbody></table>
      ${schems}
    </section>`;
  }).join('');

  const html = `<div class="jr-page">
    <div class="jr-phd"><div class="jr-pmeet">${esc(title)}<span>Judging assignments &amp; deck schematics</span></div>
      <div class="jr-pfac">${esc(fac.name)}</div></div>
    <div class="jr-body">${blocks}</div>
    <div class="jr-pft"><span>Panel sizes, placement and rotations per 2026 USA Diving Technical Rulebook, Art. 703.1</span><span>Seat 1 = Event Referee \u00b7 named assignments via DiveMeets</span></div>
  </div>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Pop-up blocked — allow pop-ups for this site and try again'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)} — Judging assignments</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>${J_PRINT_CSS}</style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 700);
}

const J_PRINT_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#171F69;--red:#E31937;--pool:#009AC7;--sky:#8FC3EA;--gray:#5F6062}
html,body{background:#fff;font-family:'Inter',system-ui,sans-serif;color:#1a1c2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:letter landscape;margin:0.35in}
.jr-phd{background:var(--navy);color:#fff;padding:11px 18px;display:flex;align-items:center;justify-content:space-between;position:relative}
.jr-phd::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--pool)}
.jr-pmeet{font-size:16px;font-weight:800;line-height:1.15}
.jr-pmeet span{display:block;font-size:9.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--sky);margin-top:2px}
.jr-pfac{font-size:10px;font-weight:600;color:var(--sky)}
.jr-body{padding:12px 16px 4px}
.jr-sess{margin-bottom:16px;break-inside:avoid}
.jr-hd{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding-bottom:4px;margin-bottom:6px;border-bottom:2px solid var(--navy)}
.jr-badge{font-size:8px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;background:var(--pool);color:#fff;padding:2px 7px;border-radius:4px}
.jr-nm{font-size:13px;font-weight:800;color:var(--navy)}
.jr-day{font-size:10.5px;font-weight:600;color:var(--gray);margin-left:auto}
.jr-tbl{width:100%;border-collapse:collapse;margin-bottom:10px}
.jr-tbl th{background:#F2F4F8;color:var(--navy);font-size:8px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;text-align:left;padding:4px 7px;border-bottom:1px solid #D9DEE8}
.jr-tbl td{padding:5px 7px;font-size:10.5px;vertical-align:top;border-bottom:1px solid #EDF0F5}
.jr-ev{font-weight:700;color:#1a1c2e}
.jr-rd{display:inline-block;margin-left:6px;font-size:8px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--red)}
.jr-n{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--navy);white-space:nowrap;text-align:center;width:78px}
.jr-rot{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:#33374d;width:170px}
.jr-seat{font-size:9.5px;color:#33374d;line-height:1.45}
.jr-sch{break-inside:avoid;page-break-inside:avoid;margin:10px 0 14px;border:1px solid #E3E7F0;border-radius:8px;padding:10px}
.jr-schh{font-size:11px;font-weight:800;color:var(--navy);margin-bottom:6px}
.jr-spec{margin:6px 0 0 16px;font-size:9px;color:var(--gray);line-height:1.5}
.jr-pft{display:flex;justify-content:space-between;padding:8px 18px;border-top:2px solid var(--navy);font-size:9px;color:var(--gray);margin-top:6px}
`;
