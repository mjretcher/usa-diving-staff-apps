/* ═══════════════════════════════════════════════════════════════════════
   BROADCAST RUN-OF-SHOW
   ───────────────────────────────────────────────────────────────────────
   Senior Nationals FINALS run on a broadcast clock, not the standard
   throughput clock. A televised/streamed dive is not "how long does the
   dive take" — it is: name announced → walk → dive → music sting →
   two commentators talk it through → replay/camera cuts → score. That is
   45–60 seconds per diver, not 32.

   This module is AUTHORITATIVE. When broadcast timing is switched on for a
   session, calcSessTiming() defers to bcastTiming() and the entire day
   reflows around it — published schedule, downstream sessions, exports.
   The broadcast clock IS the schedule for those sessions.

   Show spine (matches the World Aquatics run-of-show format):
     warm-up ends / CLOSE BOARDS
       → gap (default 10 min: deck clears, judges seat, broadcast opens)
       → ATHLETE PRESENTATION (intros)
       → RESET / commercial break (default 3 min, athletes get ready)
       → ROUND 1 … break … ROUND 2 … break … final round
       → FLASH INTERVIEWS → CEREMONY PREP → CEREMONY
       → FINISH

   Every break is named and independently timed, so "National commercial",
   "Host commercial", "Sponsor read" and a plain 90-second reset can all sit
   in the same session and read correctly to the producer and the PA.

   Results / standings time is BAKED INTO the per-diver seconds (per Mike) —
   there is deliberately no separate results column.
═══════════════════════════════════════════════════════════════════════ */

// ── ELIGIBILITY ───────────────────────────────────────────────────────
// Broadcast timing applies to SENIOR FINALS only. "Senior" is read from the
// event level (Senior / Senior Synchro) or from the session's event tag, so
// a senior block inside a combined Junior+Senior schedule still qualifies.
// National Qualifier events carry round "Qualifier" and never qualify.
function isSeniorish(sess, ev) {
  if (/^senior/i.test(ev.level || '')) return true;
  try { return sessTags(sess).includes('senior'); } catch (e) { return false; }
}
function isBcastEv(sess, ev) {
  if (!ev || ev.style === 'Custom Block') return false;
  if (ev.round !== 'Final') return false;
  return isSeniorish(sess, ev);
}
function sessHasBcastEvents(sess) {
  if (!sess || sess.isPractice) return false;
  return (sess.events || []).some(e => isBcastEv(sess, e));
}
function bcastOn(sess) {
  return Boolean(sess && sess.bcast && sess.bcast.on && sessHasBcastEvents(sess));
}

// ── DEFAULTS ──────────────────────────────────────────────────────────
const BCAST_SPD_CHOICES = [45, 50, 55, 60];
const BCAST_DEFAULTS = {
  on: false,
  boardsCloseMin: 10,      // gap from boards closing to athlete presentation
  introSecPer: 20,         // seconds per athlete during introductions
  introFlatMin: 0,         // >0 overrides the per-athlete calculation
  resetMin: 3,             // legacy minutes mirror of resetSec
  resetSec: 180,           // the "get ready" break around the introductions
  resetName: 'Commercial break',
  resetPos: 'afterIntros', // inBoards | beforeIntros | midIntros | afterIntros
  resetSplitAfter: 0,      // midIntros only — athlete number to break after (0 = halfway)
  interleave: true,        // two finals in one session alternate round by round
  awardsMode: 'end',       // 'after' = ceremony follows each event | 'end' = both at the end
  flashMin: 5,
  ceremonyPrepMin: 5,
  ceremonyMin: 8,
};
function bcastCfg(sess) {
  return Object.assign({}, BCAST_DEFAULTS, sess.bcast || {});
}
function bcastEvSpd(ev) {
  const v = Number(ev && ev.bcast && ev.bcast.spd);
  return v > 0 ? v : 45;
}
function bcastDives(ev) {
  return Math.max(1, Number(ev.numberOfDives || ev.defaultDives || 0) || 1);
}
// ── BREAK LENGTHS ─────────────────────────────────────────────────────
// Breaks are stored in SECONDS. A television break is not always a round
// number of minutes — it can be a 30-second reset between rounds, a 90-second
// sponsor read, or a full 3-minute national commercial after round 2 and 4.
// Older schedules stored whole/half minutes in `min`; those are read and
// converted on the fly, and every write mirrors `min` back out so a schedule
// saved here still reads correctly in an older cached copy of the app.
const BCAST_BREAK_DEFAULT_SEC = 120;
const BCAST_BREAK_PICKS = [0, 30, 60, 120, 180];   // None · 0:30 · 1:00 · 2:00 · 3:00
const BCAST_BREAK_MAX_SEC = 3600;

function brkSec(b, dflt) {
  if (!b) return dflt;
  if (b.sec != null && b.sec !== '') return clampSec(Number(b.sec));
  if (b.min != null && b.min !== '') return clampSec(Number(b.min) * 60);
  return dflt;
}
function clampSec(v) {
  v = Math.round(Number(v) || 0);
  return Math.min(BCAST_BREAK_MAX_SEC, Math.max(0, v));
}
// One break slot after each round. Slots are seeded on demand and preserved by
// index when a dive count changes, so a producer's naming/timing survives edits.
function bcastBreaks(ev) {
  const n = bcastDives(ev);
  const cur = (ev.bcast && Array.isArray(ev.bcast.breaks)) ? ev.bcast.breaks : [];
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = cur[i] || {};
    const sec = brkSec(b, BCAST_BREAK_DEFAULT_SEC);
    out.push({ name: b.name != null ? b.name : 'Break', sec, min: sec / 60 });
  }
  return out;
}
// The reset break after introductions is the same kind of thing, so it takes
// the same seconds-accurate control.
function bcastResetSec(c) {
  if (c.resetSec != null && c.resetSec !== '') return clampSec(Number(c.resetSec));
  return clampSec(Number(c.resetMin || 0) * 60);
}

// ── WHERE THE RESET / COMMERCIAL BREAK SITS ───────────────────────────
// Producers place the opening commercial differently depending on how the
// window is built. All four positions are legitimate run-of-show:
//   inBoards     — runs while the deck clears. Comes OUT of the boards-close
//                  gap, so the show does not get any longer.
//   beforeIntros — deck is clear, break, then the finalists walk out. Adds time.
//   midIntros    — introductions split around the break. Adds time.
//   afterIntros  — finalists introduced, break, round 1. Adds time. (default)
const BCAST_RESET_POS = ['inBoards', 'beforeIntros', 'midIntros', 'afterIntros'];
const BCAST_RESET_POS_LABEL = {
  inBoards: 'In the boards-close gap',
  beforeIntros: 'Before intros',
  midIntros: 'Middle of intros',
  afterIntros: 'After intros',
};
const BCAST_RESET_POS_HINT = {
  inBoards: 'Runs while the deck clears and the judges seat. It comes out of the boards-close gap, so the show does not get any longer.',
  beforeIntros: 'Deck is clear, break, then the finalists are introduced. This adds to the length of the show.',
  midIntros: 'Introductions split around the break — some finalists, break, the rest. This adds to the length of the show.',
  afterIntros: 'Finalists are introduced, then the break, then round one. This adds to the length of the show.',
};
function bcastResetPos(c) {
  const p = c && c.resetPos;
  return BCAST_RESET_POS.includes(p) ? p : 'afterIntros';
}
// Athlete number the introductions break after. 0 / out of range = halfway.
function bcastResetSplit(c, total) {
  const v = Math.round(Number(c && c.resetSplitAfter) || 0);
  if (v >= 1 && v <= total - 1) return v;
  return Math.max(1, Math.ceil(total / 2));
}

// ── TIME HELPERS (seconds precision — broadcast sheets need it) ───────
const bsec = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };
const bmmss = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), x = s % 60; return `${m}:${String(x).padStart(2, '0')}`; };
const bclock = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600) % 24, m = Math.floor((s % 3600) / 60), x = s % 60, ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12; return `${h12}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')} ${ap}`; };
const bclockShort = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600) % 24, m = Math.floor((s % 3600) / 60), ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12; return `${h12}:${String(m).padStart(2, '0')} ${ap}`; };

// ── PA CUE LIBRARY ────────────────────────────────────────────────────
// Cue text the on-site PA reads. Every line is editable and saved with the
// schedule. Tokens are replaced at render time:
//   {event} {round} {rounds} {divers} {meet} {break} {time}
const PA_CUE_DEFAULTS = {
  boardsClose: 'Boards are now closed. Athletes, please clear the boards and towers and report to the marshalling area.',
  presentation: 'Ladies and gentlemen, please welcome your finalists for the {event}.',
  presentationCont: 'Continuing with the introduction of your finalists for the {event}.',
  reset: 'Our finalists have {break} to prepare. Diving begins in just a few minutes.',
  round: 'Round {round} of {rounds} — {event}.',
  break: '{break}. We return with round {round} of the {event}.',
  flash: 'Please remain in your seats — we have flash interviews on the deck.',
  ceremonyPrep: 'Ladies and gentlemen, please direct your attention to the awards area.',
  ceremony: 'Awards presentation — {event}. Please stand for the presentation of medals.',
  finish: 'That concludes this session. Thank you for joining us at the {meet}.',
};
function paCues() {
  return Object.assign({}, PA_CUE_DEFAULTS, (S.meet && S.meet.paCues) || {});
}
// The standard reset line reads differently depending on where the break sits.
// A producer who has written their own line always wins — this only swaps the
// wording when the cue is still the stock one.
const RESET_CUE_BY_POS = {
  inBoards: 'Boards are closed. We are going to a short break — your finalists will be introduced in just a few minutes.',
  beforeIntros: 'We return in {break} with the introduction of your finalists for the {event}.',
  midIntros: 'We continue with the introduction of your finalists in just a moment.',
  afterIntros: PA_CUE_DEFAULTS.reset,
};
function paCueFor(row, cues) {
  let tpl = cues[row.cueKey] || '';
  const userSet = S.meet && S.meet.paCues && S.meet.paCues.reset;
  if (row.cueKey === 'reset' && row.resetPos && !userSet) tpl = RESET_CUE_BY_POS[row.resetPos] || tpl;
  if (!tpl) return '';
  return tpl
    .replace(/\{event\}/g, row.evName || 'this event')
    .replace(/\{round\}/g, row.round != null ? row.round : '')
    .replace(/\{rounds\}/g, row.rounds != null ? row.rounds : '')
    .replace(/\{divers\}/g, row.divers != null ? row.divers : '')
    .replace(/\{break\}/g, row.breakLabel || row.label || '')
    .replace(/\{meet\}/g, (S.meet && S.meet.name) || 'USA Diving National Championships')
    .replace(/\{time\}/g, bclockShort(row.startSec));
}

// ── RUNDOWN BUILDER ───────────────────────────────────────────────────
// Returns an ordered array of rows, each with absolute start/end in seconds
// from midnight. This is the single source of truth for the broadcast sheet,
// the PA run sheet, and the reflowed session timing.
function bcastRows(sess) {
  const evs = (sess.events || []).filter(e => isBcastEv(sess, e));
  if (!evs.length) return null;
  const c = bcastCfg(sess);
  const wuStart = Number(sess.warmupStartMinutes) || 0;
  const wuEnd = wuStart + (Number(sess.warmupMinutes) || 0);

  let t = wuEnd * 60;
  const rows = [];
  const push = (kind, cueKey, label, durSec, extra) => {
    const r = Object.assign({ kind, cueKey, label, startSec: t, durSec: Math.max(0, Math.round(durSec)), endSec: t + Math.max(0, Math.round(durSec)) }, extra || {});
    rows.push(r); t = r.endSec; return r;
  };

  const evLabel = evs.map(e => evName(e)).join(' & ');

  // ── Front of show ───────────────────────────────────────────────────
  const totalDivers = evs.reduce((a, e) => a + entryValue(e), 0);
  const introSec = Number(c.introFlatMin) > 0 ? Number(c.introFlatMin) * 60 : totalDivers * Number(c.introSecPer || 0);
  const introPer = Number(c.introSecPer || 0);
  const resetSec = bcastResetSec(c);
  const resetPos = bcastResetPos(c);
  const resetName = c.resetName || 'Commercial break';
  const boardsSec = Math.max(0, Number(c.boardsCloseMin || 0) * 60);

  // A break placed inside the boards-close gap is absorbed by it rather than
  // added to it — the deck-clear row shrinks by exactly the length of the break.
  const inBoards = resetPos === 'inBoards' && resetSec > 0;
  const closeSec = inBoards ? Math.max(0, boardsSec - resetSec) : boardsSec;

  const pushReset = () => {
    if (resetSec <= 0) return;
    push('reset', 'reset', resetName.toUpperCase(), resetSec, { evName: evLabel, breakLabel: resetName, resetPos });
  };
  const pushIntro = (label, divers, sec, cueKey, extra) =>
    push('presentation', cueKey || 'presentation', label, sec, Object.assign({ evName: evLabel, divers, perSec: introPer }, extra || {}));

  push('boardsclose', 'boardsClose', 'CLOSE BOARDS', closeSec, {
    evName: evLabel,
    note: inBoards ? 'Warm-up ends — deck clears and judges seat, then we go to break' : 'Warm-up ends — deck clears, judges seat, broadcast opens',
  });

  if (inBoards || resetPos === 'beforeIntros') pushReset();

  if (resetPos === 'midIntros' && resetSec > 0 && totalDivers > 1) {
    // Introductions split around the break: first block of athletes, break,
    // the rest. Time is apportioned by how many athletes are in each block.
    const cut = bcastResetSplit(c, totalDivers);
    const sec1 = Math.round(introSec * (cut / totalDivers));
    pushIntro(`ATHLETE PRESENTATION (1–${cut})`, cut, sec1);
    pushReset();
    pushIntro(`ATHLETE PRESENTATION (${cut + 1}–${totalDivers})`, totalDivers - cut, introSec - sec1, 'presentationCont');
  } else {
    pushIntro('ATHLETE PRESENTATION', totalDivers, introSec);
    if (resetPos === 'afterIntros' || (resetPos === 'midIntros' && resetSec > 0)) pushReset();
  }

  // ── Competition segments ────────────────────────────────────────────
  const interleaved = Boolean(c.interleave) && evs.length > 1;
  const segs = [];
  if (interleaved) {
    const maxR = Math.max.apply(null, evs.map(bcastDives));
    for (let r = 1; r <= maxR; r++) evs.forEach(e => { if (r <= bcastDives(e)) segs.push({ ev: e, round: r }); });
  } else {
    evs.forEach(e => { const n = bcastDives(e); for (let r = 1; r <= n; r++) segs.push({ ev: e, round: r }); });
  }

  // Ceremonies immediately after each event only make sense when events run
  // start-to-finish. If the two finals alternate rounds there is no gap to put
  // a ceremony in, so they always collect at the end.
  const ceremonyAfterEach = c.awardsMode === 'after' && !interleaved;
  const deferred = [];

  const pushCeremony = (ev) => {
    const nm = evName(ev);
    if (Number(c.flashMin) > 0) push('flash', 'flash', 'FLASH INTERVIEWS', Number(c.flashMin) * 60, { evName: nm, evId: ev.id });
    if (Number(c.ceremonyPrepMin) > 0) push('ceremonyprep', 'ceremonyPrep', 'CEREMONY PREP', Number(c.ceremonyPrepMin) * 60, { evName: nm, evId: ev.id });
    if (Number(c.ceremonyMin) > 0) push('ceremony', 'ceremony', 'CEREMONY — ' + nm.toUpperCase(), Number(c.ceremonyMin) * 60, { evName: nm, evId: ev.id });
  };

  segs.forEach((sg, i) => {
    const ev = sg.ev;
    const divers = entryValue(ev);
    const spd = bcastEvSpd(ev);
    const nRounds = bcastDives(ev);
    push('round', 'round', `ROUND ${sg.round} — ${evName(ev)}`, divers * spd, {
      evId: ev.id, evName: evName(ev), round: sg.round, rounds: nRounds, divers, perSec: spd,
    });

    const isEvLastRound = sg.round === nRounds;
    const isLastSeg = i === segs.length - 1;

    if (isEvLastRound && ceremonyAfterEach) { pushCeremony(ev); return; }
    if (isEvLastRound) deferred.push(ev);
    if (isLastSeg) return; // nothing follows the last segment except the back of show

    const br = bcastBreaks(ev)[sg.round - 1];
    const brSec = br ? brkSec(br, 0) : 0;
    if (brSec > 0) {
      const nextSeg = segs[i + 1];
      push('break', 'break', (br.name || 'Break').toUpperCase(), brSec, {
        evId: ev.id, evName: nextSeg ? evName(nextSeg.ev) : evName(ev),
        round: nextSeg ? nextSeg.round : sg.round, rounds: nRounds, breakLabel: br.name || 'Break',
      });
    }
  });

  deferred.forEach(pushCeremony);
  push('finish', 'finish', 'FINISH', 0, { evName: evLabel });

  return rows;
}

// ── AUTHORITATIVE TIMING ──────────────────────────────────────────────
// Shaped exactly like calcSessTiming()'s return so every existing consumer —
// timeline, entries grid, conflict detection, Ops export, print preview —
// keeps working with no changes.
function bcastTiming(sess) {
  if (!bcastOn(sess)) return null;
  const rows = bcastRows(sess);
  if (!rows || !rows.length) return null;

  const wuStart = Number(sess.warmupStartMinutes) || 0;
  const wuEnd = wuStart + (Number(sess.warmupMinutes) || 0);
  const pres = rows.find(r => r.kind === 'presentation');
  const roundRows = rows.filter(r => r.kind === 'round');
  const lastRound = roundRows[roundRows.length - 1];
  const finish = rows[rows.length - 1];

  // Per-event window = first round start → last round end for that event.
  const tevs = [];
  (sess.events || []).forEach(ev => {
    const mine = roundRows.filter(r => r.evId === ev.id);
    if (mine.length) {
      const s = mine[0].startSec / 60, e = mine[mine.length - 1].endSec / 60;
      const d = calcEvDur(ev);
      tevs.push(Object.assign({}, ev, {
        eventStartMinutes: s, eventEndMinutes: e, evMin: e - s, rawMin: d.rawMin,
        _combined: false, _simul: false, _bcast: true,
      }));
    }
  });
  // Any non-broadcast event sharing the session (rare) stacks after the show.
  let cursor = finish.endSec / 60;
  (sess.events || []).forEach(ev => {
    if (tevs.some(x => x.id === ev.id)) return;
    const d = calcEvDur(ev);
    tevs.push(Object.assign({}, ev, {
      eventStartMinutes: cursor, eventEndMinutes: cursor + Math.ceil(d.evMin),
      evMin: Math.ceil(d.evMin), rawMin: d.rawMin, _combined: false, _simul: false,
    }));
    cursor += Math.ceil(d.evMin);
  });

  const endMin = Math.max(finish.endSec / 60, cursor);
  return {
    warmupStartMinutes: wuStart,
    warmupEndMinutes: wuEnd,
    eventStartMinutes: pres ? pres.startSec / 60 : wuEnd,
    competitiveEnd: lastRound ? lastRound.endSec / 60 : endMin,
    sessionEndMinutes: endMin,
    events: tevs,
    flightTimes: [],
    bcastRows: rows,
  };
}

// ── DURATION CONTROL (shared by the reset break and every round break) ─
// Quick-pick buttons for the lengths a producer actually calls, plus an
// explicit minutes + seconds pair for anything else. Two separate boxes on
// purpose: a single "90" in one box is ambiguous, "1 min 30 sec" never is.
//   pickPfx : call prefix taking the value, e.g. "setBcastBreakSec('s','e',0,"
//   partPfx : call prefix taking a part,    e.g. "setBcastBreakPart('s','e',0,"
function bcDurCtl(sec, pickPfx, partPfx) {
  sec = clampSec(sec);
  const m = Math.floor(sec / 60), s = sec % 60;
  const picks = BCAST_BREAK_PICKS.map(v =>
    `<button type="button" class="bc-dp ${sec === v ? 'on' : ''}" onclick="${pickPfx}${v})">${v === 0 ? 'None' : bmmss(v)}</button>`
  ).join('');
  return `<div class="bc-dur">
    <div class="bc-dp-row">${picks}</div>
    <span class="bc-dur-ms">
      <input class="ep-inp bc-dur-i" type="number" min="0" max="60" step="1" value="${m}" aria-label="minutes" onchange="${partPfx}'m',this.value)"/><em>min</em>
      <input class="ep-inp bc-dur-i" type="number" min="0" max="59" step="5" value="${s}" aria-label="seconds" onchange="${partPfx}'s',this.value)"/><em>sec</em>
    </span>
  </div>`;
}

// ── EDITOR: SESSION PANEL ─────────────────────────────────────────────
function renderBcastSessPanel(sess) {
  if (!sessHasBcastEvents(sess)) return '';
  const c = bcastCfg(sess);
  const on = bcastOn(sess);
  const evs = (sess.events || []).filter(e => isBcastEv(sess, e));
  const multi = evs.length > 1;

  if (!on) {
    return `<div class="bc-panel off">
      <div class="bc-hd"><span class="bc-dot"></span><span class="bc-title">Broadcast timing</span>
        <button class="chip" onclick="setBcast('${sess.id}','on',true)">Turn on</button></div>
      <p class="bc-help">This session has Senior finals. Turning this on switches it to the broadcast clock — 45+ seconds per diver, named commercial breaks, intros and awards as timed show elements. <strong>The whole day reflows around it.</strong></p>
    </div>`;
  }

  const t = calcSessTiming(sess);
  const rows = t.bcastRows || [];
  const totalSec = rows.length ? rows[rows.length - 1].endSec - rows[0].startSec : 0;
  const std = evs.reduce((a, e) => a + calcEvDur(Object.assign({}, e, { bcast: null })).evMin, 0);
  const delta = Math.round(totalSec / 60 - std);

  const num = (lbl, field, val, step, hint) => `<div class="bc-f"><label>${lbl}</label><input class="ep-inp" type="number" min="0" step="${step || 1}" value="${val}" onchange="setBcast('${sess.id}','${field}',this.value)"/>${hint ? `<span class="bc-hint">${hint}</span>` : ''}</div>`;

  return `<div class="bc-panel">
    <div class="bc-hd"><span class="bc-dot on"></span><span class="bc-title">Broadcast timing</span>
      <span class="bc-live">ON AIR CLOCK</span>
      <button class="chip" onclick="setBcast('${sess.id}','on',false)">Turn off</button></div>
    <p class="bc-help">This session runs on the broadcast clock. Times below are what the streaming partner and the PA will work from, and the rest of the day is scheduled around them.</p>

    <div class="bc-sum">
      <div><span class="bc-sum-l">Show window</span><span class="bc-sum-v">${bclockShort(rows[0].startSec)} – ${bclockShort(rows[rows.length - 1].endSec)}</span></div>
      <div><span class="bc-sum-l">Total runtime</span><span class="bc-sum-v">${bsec(totalSec)}</span></div>
      <div><span class="bc-sum-l">vs. standard clock</span><span class="bc-sum-v ${delta > 0 ? 'up' : ''}">${delta > 0 ? '+' : ''}${delta} min</span></div>
    </div>

    <div class="bc-grid">
      ${num('Boards close → intros (min)', 'boardsCloseMin', c.boardsCloseMin, 1, 'Deck clears, judges seat')}
      ${num('Intro seconds per athlete', 'introSecPer', c.introSecPer, 5, c.introFlatMin > 0 ? 'Overridden below' : 'Auto from entries')}
      ${num('Fixed intro length (min)', 'introFlatMin', c.introFlatMin, 1, '0 = use per-athlete')}
    </div>
    <div class="bc-f wide"><label>Reset break around introductions</label>
      <input class="fi" value="${esc(c.resetName)}" onchange="setBcast('${sess.id}','resetName',this.value)" placeholder="Commercial break"/>
      ${bcDurCtl(bcastResetSec(c), `setBcastResetSec('${sess.id}',`, `setBcastResetPart('${sess.id}',`)}
      ${(() => {
    const pos = bcastResetPos(c);
    const rSec = bcastResetSec(c);
    const nAth = evs.reduce((a, e) => a + entryValue(e), 0);
    const cut = bcastResetSplit(c, nAth);
    const bSec = Math.max(0, Number(c.boardsCloseMin || 0) * 60);
    const chips = BCAST_RESET_POS.map(k =>
      `<button type="button" class="chip ${pos === k ? 'on' : ''}" onclick="setBcast('${sess.id}','resetPos','${k}')">${BCAST_RESET_POS_LABEL[k]}</button>`).join('');
    const over = pos === 'inBoards' && rSec > bSec;
    return `<div class="bc-pos">
        <span class="bc-pos-l">Where it goes</span>
        <div class="chiprow">${chips}</div>
        <span class="bc-hint">${BCAST_RESET_POS_HINT[pos]}</span>
        ${over ? `<span class="bc-hint warn">The break is longer than the ${bmmss(bSec)} boards-close gap, so the gap is used up and the show still gets ${bmmss(rSec - bSec)} longer.</span>` : ''}
        ${pos === 'midIntros' ? `<div class="bc-split"><span>Break after athlete</span>
          <input class="ep-inp bc-dur-i" type="number" min="1" max="${Math.max(1, nAth - 1)}" step="1" value="${cut}" onchange="setBcast('${sess.id}','resetSplitAfter',this.value)"/>
          <span>of ${nAth}</span>
          <button type="button" class="bc-dp ghost" onclick="setBcast('${sess.id}','resetSplitAfter',0)">Halfway</button></div>` : ''}
      </div>`;
  })()}
      ${bcastResetSec(c) === 0 ? `<span class="bc-hint">Set to None — no break will appear on the run-of-show.</span>` : ''}</div>

    ${multi ? `<div class="bc-f wide"><label>Two finals in this session</label>
      <div class="chiprow">
        <button class="chip ${c.interleave ? 'on' : ''}" onclick="setBcast('${sess.id}','interleave',true)">Alternate rounds</button>
        <button class="chip ${!c.interleave ? 'on' : ''}" onclick="setBcast('${sess.id}','interleave',false)">One event, then the other</button>
      </div><span class="bc-hint">Alternating keeps the broadcast moving — round 1 of both, then round 2 of both.</span></div>` : ''}

    <div class="bc-f wide"><label>Awards</label>
      <div class="chiprow">
        <button class="chip ${c.awardsMode === 'after' ? 'on' : ''}" onclick="setBcast('${sess.id}','awardsMode','after')">After each event</button>
        <button class="chip ${c.awardsMode === 'end' ? 'on' : ''}" onclick="setBcast('${sess.id}','awardsMode','end')">Both at the end</button>
      </div>
      ${(multi && c.interleave && c.awardsMode === 'after') ? `<span class="bc-hint warn">Rounds are alternating, so there is no gap mid-show — both ceremonies will run at the end, in event order.</span>` : ''}
    </div>

    <div class="bc-grid">
      ${num('Flash interviews (min)', 'flashMin', c.flashMin, 1)}
      ${num('Ceremony prep (min)', 'ceremonyPrepMin', c.ceremonyPrepMin, 1)}
      ${num('Ceremony (min)', 'ceremonyMin', c.ceremonyMin, 1)}
    </div>

    <div class="bc-actions">
      <button class="btn btn-sm" onclick="UI.modal='pa-cues';render()">Edit PA announcements</button>
      <button class="btn btn-sm" onclick="UI.modal='bcast-preview';UI.bcastSessId='${sess.id}';render()">Preview run-of-show</button>
      ${bcastAllFinals().length > 1 ? `<button class="btn btn-sm" onclick="openBcastCopy('${sess.id}',null)">Copy setup to other finals…</button>` : ''}
    </div>
  </div>`;
}

// ── EDITOR: PER-EVENT BROADCAST CONTROLS ──────────────────────────────
function renderBcastEvPanel(sess, ev) {
  if (!bcastOn(sess) || !isBcastEv(sess, ev)) return '';
  const spd = bcastEvSpd(ev);
  const breaks = bcastBreaks(ev);
  const n = bcastDives(ev);
  const divers = entryValue(ev);
  const diveSec = divers * spd * n;

  const chips = BCAST_SPD_CHOICES.map(v => `<button class="bc-spd ${spd === v ? 'on' : ''}" onclick="setBcastEv('${sess.id}','${ev.id}','spd',${v})">${v}s</button>`).join('') +
    `<button class="bc-spd ${BCAST_SPD_CHOICES.includes(spd) ? '' : 'on'}" onclick="askPrompt({title:'Seconds per diver',message:'Broadcast seconds per diver — announce, dive, music, commentary, replay, score.',inputType:'number',defaultValue:${spd},confirmText:'Set',onConfirm:(v)=>{if(v!=='')setBcastEv('${sess.id}','${ev.id}','spd',Number(v)||45)}})">Custom</button>`;

  const brRows = breaks.map((b, i) => {
    const last = i === n - 1;
    const sec = brkSec(b, 0);
    return `<div class="bc-br ${last ? 'last' : ''} ${sec === 0 ? 'off' : ''}">
      <span class="bc-br-n">After round ${i + 1}</span>
      <input class="fi bc-br-name" value="${esc(b.name)}" placeholder="Break name" onchange="setBcastBreak('${sess.id}','${ev.id}',${i},'name',this.value)"/>
      ${bcDurCtl(sec, `setBcastBreakSec('${sess.id}','${ev.id}',${i},`, `setBcastBreakPart('${sess.id}','${ev.id}',${i},`)}
      <span class="bc-br-v">${sec === 0 ? 'no break' : bmmss(sec)}</span>
      ${last ? `<span class="bc-br-note">last round — only used if another event follows</span>` : ''}
    </div>`;
  }).join('');

  // Between-rounds total is what always applies: the slot after the final round
  // only runs if a second event follows it, so it is reported separately.
  const betweenSec = breaks.slice(0, Math.max(0, n - 1)).reduce((a, b) => a + brkSec(b, 0), 0);
  const betweenCt = breaks.slice(0, Math.max(0, n - 1)).filter(b => brkSec(b, 0) > 0).length;
  const allRow = BCAST_BREAK_PICKS.map(v =>
    `<button type="button" class="bc-dp ghost" onclick="setBcastBreaksAll('${sess.id}','${ev.id}',${v})">${v === 0 ? 'None' : bmmss(v)}</button>`
  ).join('');

  return `<div class="bc-ev">
    <div class="bc-ev-hd"><span class="bc-dot on"></span>Broadcast clock</div>
    <div class="bc-ev-row">
      <div><div class="bc-ev-l">Seconds per diver</div><div class="bc-spdrow">${chips}</div></div>
      <div class="bc-ev-calc">${divers} divers × ${n} rounds × ${spd}s = <strong>${bsec(diveSec)}</strong> of diving</div>
    </div>
    <div class="bc-br-hd">
      <span class="bc-ev-l" style="margin:0">Breaks — name each one so the producer and PA read the same sheet</span>
      <span class="bc-br-tot">${betweenCt} break${betweenCt === 1 ? '' : 's'} between rounds · <strong>${bmmss(betweenSec)}</strong></span>
      ${bcastAllFinals().length > 1 ? `<button class="bc-dp ghost" onclick="openBcastCopy('${sess.id}','${ev.id}')">Copy this setup to other finals…</button>` : ''}
    </div>
    <div class="bc-br-all"><span>Set every round:</span>${allRow}</div>
    <div class="bc-brs">${brRows}</div>
  </div>`;
}

// ── STATE SETTERS ─────────────────────────────────────────────────────
const BCAST_NUM_FIELDS = ['boardsCloseMin', 'introSecPer', 'introFlatMin', 'resetMin', 'resetSplitAfter', 'flashMin', 'ceremonyPrepMin', 'ceremonyMin'];
function setBcast(sessId, field, value) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    if (!sess.bcast) sess.bcast = Object.assign({}, BCAST_DEFAULTS);
    sess.bcast[field] = BCAST_NUM_FIELDS.includes(field) ? (Number(value) || 0) : value;
    // resetMin and resetSec are two views of one number — keep them in step.
    if (field === 'resetMin') sess.bcast.resetSec = clampSec(Number(value) * 60);
    if (field === 'resetSec') { sess.bcast.resetSec = clampSec(value); sess.bcast.resetMin = sess.bcast.resetSec / 60; }
    if (field === 'on' && value === true) {
      // Seed sensible broadcast values on every eligible event the first time on.
      (sess.events || []).forEach(ev => {
        if (!isBcastEv(sess, ev)) return;
        if (!ev.bcast) ev.bcast = {};
        if (!(Number(ev.bcast.spd) > 0)) ev.bcast.spd = 45;
        if (!Array.isArray(ev.bcast.breaks) || !ev.bcast.breaks.length) ev.bcast.breaks = bcastBreaks(ev);
      });
    }
    cascadeSession(s, sess.id);
  });
}
function setBcastEv(sessId, evId, field, value) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const ev = sess.events.find(e => e.id === evId); if (!ev) return;
    if (!ev.bcast) ev.bcast = {};
    ev.bcast[field] = field === 'spd' ? (Number(value) || 45) : value;
    cascadeSession(s, sess.id);
  });
}
function setBcastBreak(sessId, evId, idx, field, value) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const ev = sess.events.find(e => e.id === evId); if (!ev) return;
    if (!ev.bcast) ev.bcast = {};
    const cur = bcastBreaks(ev);
    if (!cur[idx]) return;
    if (field === 'min') { cur[idx].sec = clampSec(Number(value) * 60); cur[idx].min = cur[idx].sec / 60; }
    else if (field === 'sec') { cur[idx].sec = clampSec(value); cur[idx].min = cur[idx].sec / 60; }
    else cur[idx][field] = value;
    ev.bcast.breaks = cur;
    cascadeSession(s, sess.id);
  });
}
// Quick-pick / typed break length, in seconds.
function setBcastBreakSec(sessId, evId, idx, sec) {
  setBcastBreak(sessId, evId, idx, 'sec', sec);
}
// Minutes box and seconds box edit the same stored value. Entering 90 in the
// seconds box gives 1:30, not an invalid state.
function setBcastBreakPart(sessId, evId, idx, part, value) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const ev = sess.events.find(e => e.id === evId); if (!ev) return;
    if (!ev.bcast) ev.bcast = {};
    const cur = bcastBreaks(ev);
    if (!cur[idx]) return;
    const now = brkSec(cur[idx], 0);
    const m = part === 'm' ? (Number(value) || 0) : Math.floor(now / 60);
    const x = part === 's' ? (Number(value) || 0) : now % 60;
    cur[idx].sec = clampSec(m * 60 + x);
    cur[idx].min = cur[idx].sec / 60;
    ev.bcast.breaks = cur;
    cascadeSession(s, sess.id);
  });
}
// One click to put every round on the same length — then override the rounds
// that carry a longer commercial.
function setBcastBreaksAll(sessId, evId, sec) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    const ev = sess.events.find(e => e.id === evId); if (!ev) return;
    if (!ev.bcast) ev.bcast = {};
    const cur = bcastBreaks(ev);
    const v = clampSec(sec);
    cur.forEach(b => { b.sec = v; b.min = v / 60; });
    ev.bcast.breaks = cur;
    cascadeSession(s, sess.id);
  });
}
function setBcastResetSec(sessId, sec) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    if (!sess.bcast) sess.bcast = Object.assign({}, BCAST_DEFAULTS);
    sess.bcast.resetSec = clampSec(sec);
    sess.bcast.resetMin = sess.bcast.resetSec / 60;
    cascadeSession(s, sess.id);
  });
}
function setBcastResetPart(sessId, part, value) {
  upd(s => {
    const sess = s.sessions.find(x => x.id === sessId); if (!sess) return;
    if (!sess.bcast) sess.bcast = Object.assign({}, BCAST_DEFAULTS);
    const now = bcastResetSec(bcastCfg(sess));
    const m = part === 'm' ? (Number(value) || 0) : Math.floor(now / 60);
    const x = part === 's' ? (Number(value) || 0) : now % 60;
    sess.bcast.resetSec = clampSec(m * 60 + x);
    sess.bcast.resetMin = sess.bcast.resetSec / 60;
    cascadeSession(s, sess.id);
  });
}
function setPaCue(key, value) {
  upd(s => { if (!s.meet.paCues) s.meet.paCues = {}; s.meet.paCues[key] = value; });
}
function resetPaCues() {
  upd(s => { s.meet.paCues = {}; });
}

// ── COPY BROADCAST SETUP TO OTHER FINALS ──────────────────────────────
// A televised session is a lot of small decisions — seconds per diver, six
// named breaks, where the opening commercial sits, how long the ceremony runs.
// Almost always the next final on the sheet should run identically. This lifts
// the whole setup onto any other finals you pick, in the same order the meet
// runs, so nothing has to be retyped.
const BCAST_SHOW_KEYS = ['boardsCloseMin', 'introSecPer', 'introFlatMin', 'resetSec', 'resetMin',
  'resetName', 'resetPos', 'resetSplitAfter', 'interleave', 'awardsMode', 'flashMin', 'ceremonyPrepMin', 'ceremonyMin'];

// Every senior final in the meet, in running order.
function bcastAllFinals() {
  const out = [];
  const seen = {};
  (S.meet.days || []).forEach((d, di) => {
    S.sessions.filter(x => x.dayId === d.id)
      .sort((a, b) => (Number(a.warmupStartMinutes) || 0) - (Number(b.warmupStartMinutes) || 0))
      .forEach(sess => {
        seen[sess.id] = 1;
        (sess.events || []).forEach(ev => { if (isBcastEv(sess, ev)) out.push({ day: d, dayIdx: di, sess, ev }); });
      });
  });
  S.sessions.forEach(sess => {   // any block not attached to a day still shows up
    if (seen[sess.id]) return;
    (sess.events || []).forEach(ev => { if (isBcastEv(sess, ev)) out.push({ day: null, dayIdx: 99, sess, ev }); });
  });
  return out;
}
function bcastCopyState() {
  return Object.assign({ srcSessId: null, srcEvId: null, sel: {}, doShow: true, doEv: true, turnOn: true }, UI.bcastCopy || {});
}
function openBcastCopy(sessId, evId) {
  const sess = S.sessions.find(x => x.id === sessId);
  const eligible = (sess && sess.events || []).filter(e => isBcastEv(sess, e));
  UI.bcastCopy = { srcSessId: sessId, srcEvId: evId || (eligible[0] && eligible[0].id) || null, sel: {}, doShow: true, doEv: true, turnOn: true };
  UI.modal = 'bcast-copy'; render();
}
function setBcastCopy(field, value) { UI.bcastCopy = Object.assign(bcastCopyState(), { [field]: value }); render(); }
function toggleBcastCopyTarget(evId) {
  const st = bcastCopyState();
  st.sel = Object.assign({}, st.sel);
  if (st.sel[evId]) delete st.sel[evId]; else st.sel[evId] = true;
  UI.bcastCopy = st; render();
}
function bcastCopySelectAll(on) {
  const st = bcastCopyState();
  st.sel = {};
  if (on) bcastAllFinals().forEach(t => { if (t.ev.id !== st.srcEvId) st.sel[t.ev.id] = true; });
  UI.bcastCopy = st; render();
}

function renderBcastCopyModal() {
  const st = bcastCopyState();
  const src = S.sessions.find(x => x.id === st.srcSessId);
  if (!src) return '';
  const srcEvs = (src.events || []).filter(e => isBcastEv(src, e));
  const srcEv = srcEvs.find(e => e.id === st.srcEvId) || srcEvs[0];
  const all = bcastAllFinals();
  const targets = all.filter(t => t.ev.id !== (srcEv && srcEv.id));
  const c = bcastCfg(src);
  const selCt = targets.filter(t => st.sel[t.ev.id]).length;
  const onCt = targets.filter(t => st.sel[t.ev.id] && !bcastOn(t.sess)).length;

  const srcSpd = srcEv ? bcastEvSpd(srcEv) : 45;
  const srcBr = srcEv ? bcastBreaks(srcEv) : [];
  const brSummary = srcBr.length
    ? srcBr.slice(0, Math.max(0, srcBr.length - 1)).map(b => bmmss(brkSec(b, 0))).join(' · ') || 'no breaks'
    : 'no breaks';

  const evChips = srcEvs.length > 1
    ? `<div class="chiprow" style="margin-top:6px">${srcEvs.map(e =>
      `<button class="chip ${srcEv && e.id === srcEv.id ? 'on' : ''}" onclick="setBcastCopy('srcEvId','${e.id}')">${esc(evName(e))}</button>`).join('')}</div>
       <span class="bc-hint">Two finals in this block — pick whose clock and breaks get copied.</span>` : '';

  const rows = targets.map(t => {
    const on = st.sel[t.ev.id];
    const live = bcastOn(t.sess);
    const nR = bcastDives(t.ev);
    const nSrc = srcEv ? bcastDives(srcEv) : nR;
    return `<button class="bcc-row ${on ? 'on' : ''}" onclick="toggleBcastCopyTarget('${t.ev.id}')">
      <span class="bcc-box">${on ? '✓' : ''}</span>
      <span class="bcc-main"><span class="bcc-ev">${esc(evName(t.ev))}</span>
        <span class="bcc-meta">${t.day ? esc(shortDate(t.day.date)) + ' · ' : ''}${esc(sessLabelOf(t.sess, null))} · ${nR} rounds</span></span>
      <span class="bcc-tags">${live ? '' : '<span class="bcc-tag off">broadcast off</span>'}${nR !== nSrc ? `<span class="bcc-tag diff">${nR > nSrc ? 'more' : 'fewer'} rounds</span>` : ''}</span>
    </button>`;
  }).join('');

  const chk = (field, label, help) => `<label class="bcc-chk"><input type="checkbox" ${st[field] ? 'checked' : ''} onchange="setBcastCopy('${field}',this.checked)"/>
    <span><b>${label}</b>${help ? `<em>${help}</em>` : ''}</span></label>`;

  return `<div class="modal modal-sm" onclick="event.stopPropagation()">
    <div class="modal-hd"><div><span class="modal-title">Copy broadcast setup</span>
      <div style="font-size:11px;color:var(--tx3);margin-top:2px">From ${esc(srcEv ? evName(srcEv) : '')} · ${esc(sessLabelOf(src, null))}</div></div>
      <button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      ${evChips}
      <label class="fl" style="margin-top:${srcEvs.length > 1 ? '12' : '0'}px">What to copy</label>
      ${chk('doEv', 'Clock and breaks', `${srcSpd}s per diver · breaks between rounds: ${brSummary}`)}
      ${chk('doShow', 'Show settings', `Boards close ${c.boardsCloseMin} min · ${esc(c.resetName || 'Commercial break')} ${bmmss(bcastResetSec(c))} (${BCAST_RESET_POS_LABEL[bcastResetPos(c)].toLowerCase()}) · awards ${c.awardsMode === 'after' ? 'after each event' : 'at the end'}`)}
      ${chk('turnOn', 'Switch broadcast timing on where it is off', 'Leave unticked to copy the numbers without changing which sessions are on the broadcast clock')}

      <div class="fdiv" style="margin:14px 0 10px"></div>
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">
        <label class="fl" style="margin:0">Copy to</label>
        <span style="margin-left:auto;display:flex;gap:6px">
          <button class="bc-dp ghost" onclick="bcastCopySelectAll(true)">All finals</button>
          <button class="bc-dp ghost" onclick="bcastCopySelectAll(false)">None</button></span>
      </div>
      ${targets.length ? `<div class="bcc-list">${rows}</div>`
      : `<div style="font-size:12px;color:var(--tx3)">There are no other senior finals in this schedule yet.</div>`}
      ${targets.some(t => st.sel[t.ev.id] && bcastDives(t.ev) !== (srcEv ? bcastDives(srcEv) : 0))
      ? `<p class="bc-hint" style="margin-top:10px">Where an event has a different number of rounds, breaks are matched round by round — extra rounds repeat the last break, and any beyond the target's round count are dropped. Names and lengths are never invented.</p>` : ''}
      ${onCt ? `<p class="bc-hint warn" style="margin-top:8px">${onCt} of these ${onCt === 1 ? 'is' : 'are'} not on the broadcast clock yet. Switching ${onCt === 1 ? 'it' : 'them'} on re-times ${onCt === 1 ? 'that day' : 'those days'} around the show.</p>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-sm" onclick="closeModal()">Cancel</button>
      <button class="btn btn-sm btn-p" ${selCt && (st.doEv || st.doShow) ? '' : 'disabled'} onclick="executeBcastCopy()">Copy to ${selCt || ''} ${selCt === 1 ? 'final' : 'finals'}</button></div>
  </div>`;
}

function executeBcastCopy() {
  const st = bcastCopyState();
  let n = 0, sw = 0, adj = 0;
  upd(s => {
    const src = s.sessions.find(x => x.id === st.srcSessId); if (!src) return;
    const srcEv = (src.events || []).find(e => e.id === st.srcEvId); if (!srcEv) return;
    const srcSpd = bcastEvSpd(srcEv);
    const srcBr = bcastBreaks(srcEv);
    const srcCfg = bcastCfg(src);
    const touched = {};

    s.sessions.forEach(sess => {
      (sess.events || []).forEach(ev => {
        if (!st.sel[ev.id] || ev.id === srcEv.id) return;
        if (!isBcastEv(sess, ev)) return;
        if (st.doEv) {
          if (!ev.bcast) ev.bcast = {};
          ev.bcast.spd = srcSpd;
          const nR = bcastDives(ev);
          if (nR !== srcBr.length) adj++;
          ev.bcast.breaks = Array.from({ length: nR }, (_, i) => {
            const b = srcBr[Math.min(i, srcBr.length - 1)] || { name: 'Break', sec: BCAST_BREAK_DEFAULT_SEC };
            return { name: b.name, sec: brkSec(b, BCAST_BREAK_DEFAULT_SEC), min: brkSec(b, BCAST_BREAK_DEFAULT_SEC) / 60 };
          });
        }
        if (st.doShow) {
          if (!sess.bcast) sess.bcast = Object.assign({}, BCAST_DEFAULTS);
          BCAST_SHOW_KEYS.forEach(k => { sess.bcast[k] = srcCfg[k]; });
        }
        if (st.turnOn && !sess.bcast) sess.bcast = Object.assign({}, BCAST_DEFAULTS);
        if (st.turnOn && !sess.bcast.on) { sess.bcast.on = true; sw++; }
        n++;
        touched[sess.id] = 1;
      });
    });
    Object.keys(touched).forEach(id => cascadeSession(s, id));
  });
  closeModal();
  toast(`Broadcast setup copied to ${n} final${n === 1 ? '' : 's'}` +
    (sw ? ` · ${sw} session${sw === 1 ? '' : 's'} switched on` : '') +
    (adj ? ` · ${adj} matched round by round` : ''));
}

// ── PA CUE EDITOR MODAL ───────────────────────────────────────────────
const PA_CUE_LABELS = {
  boardsClose: ['Boards close', 'Read when warm-up ends and the deck clears.'],
  presentation: ['Athlete introductions', 'Read as the finalists are presented.'],

  presentationCont: ['Introductions after a mid-intro break', 'Only used when the break splits the introductions.'],
  reset: ['Reset / commercial break', 'Standard wording follows where you place the break. Edit it here to lock in your own line everywhere.'],
  round: ['Start of each round', 'Read at the top of every round.'],
  break: ['During a break', 'Read at each named break between rounds.'],
  flash: ['Flash interviews', 'Read after the final dive.'],
  ceremonyPrep: ['Ceremony prep', 'Read while the awards area is set.'],
  ceremony: ['Awards ceremony', 'Read to open the medal presentation.'],
  finish: ['End of session', 'Read to close the session.'],
};
function renderPaCueModal() {
  const cues = paCues();
  const rows = Object.keys(PA_CUE_LABELS).map(k => {
    const [lbl, help] = PA_CUE_LABELS[k];
    const isCustom = (S.meet && S.meet.paCues && S.meet.paCues[k] != null && S.meet.paCues[k] !== PA_CUE_DEFAULTS[k]);
    return `<div class="pac-row">
      <div class="pac-hd"><span class="pac-lbl">${lbl}</span>${isCustom ? '<span class="pac-edited">Edited</span>' : ''}</div>
      <div class="pac-help">${help}</div>
      <textarea class="pac-ta" rows="2" onchange="setPaCue('${k}',this.value)">${esc(cues[k])}</textarea>
    </div>`;
  }).join('');
  return `<div class="modal modal-lg" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">PA announcements</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <p class="bc-help" style="margin-bottom:14px">These are the lines the arena announcer reads. They print on the run-of-show next to the time each one is due. Edit any of them — you can use <code>{event}</code>, <code>{round}</code>, <code>{rounds}</code>, <code>{divers}</code>, <code>{break}</code> and <code>{meet}</code> and they fill in automatically.</p>
      ${rows}
    </div>
    <div class="modal-foot">
      <button class="btn btn-gh" onclick="askConfirm({title:'Reset announcements',message:'Put every PA line back to the standard wording?',confirmText:'Reset',onConfirm:resetPaCues})">Reset to standard</button>
      <div style="flex:1"></div>
      <button class="btn btn-p" onclick="closeModal()">Done</button>
    </div>
  </div>`;
}

// ── RUN-OF-SHOW RENDERER (screen preview + print) ─────────────────────
const BC_KIND_LABEL = {
  boardsclose: 'Boards', presentation: 'Intros', reset: 'Break', round: 'Round',
  break: 'Break', flash: 'Flash', ceremonyprep: 'Prep', ceremony: 'Awards', finish: 'End',
};
function renderBcastSheet(timedSessions, opts) {
  opts = opts || {};
  const showCues = opts.showCues !== false;
  const cues = paCues();
  const meetName = esc(opts.title || (S.meet && S.meet.name) || 'USA Diving');
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const blocks = timedSessions.map(sess => {
    const rows = (sess.timing && sess.timing.bcastRows) || [];
    if (!rows.length) return '';
    const day = S.meet.days.find(d => d.id === sess.dayId);
    const evs = (sess.events || []).filter(e => isBcastEv(sess, e));
    const total = rows[rows.length - 1].endSec - rows[0].startSec;
    const body = rows.map(r => {
      const cue = showCues ? paCueFor(r, cues) : '';
      const per = r.kind === 'round' ? `${r.divers} × ${bmmss(r.perSec)}`
        : (r.kind === 'presentation' && r.perSec ? `${r.divers} × ${bmmss(r.perSec)}` : '');
      return `<tr class="bcr k-${r.kind}">
        <td class="bcr-t">${bclock(r.startSec)}</td>
        <td class="bcr-k">${BC_KIND_LABEL[r.kind] || ''}</td>
        <td class="bcr-l">${esc(r.label)}${r.note ? `<span class="bcr-note">${esc(r.note)}</span>` : ''}</td>
        <td class="bcr-p">${per}</td>
        <td class="bcr-d">${r.durSec ? bsec(r.durSec) : ''}</td>
        ${showCues ? `<td class="bcr-c">${esc(cue)}</td>` : ''}
      </tr>`;
    }).join('');
    return `<div class="bcs-sess">
      <div class="bcs-hd">
        <span class="bcs-badge">Broadcast</span>
        <span class="bcs-nm">${esc(evs.map(evName).join('  &  '))}</span>
        <span class="bcs-day">${day ? esc(fullDate(day.date)) : ''}</span>
        <span class="bcs-win">${bclockShort(rows[0].startSec)} – ${bclockShort(rows[rows.length - 1].endSec)} · ${bsec(total)}</span>
      </div>
      <table class="bcs-tbl">
        <thead><tr><th>Time</th><th></th><th>Element</th><th>Per</th><th>Duration</th>${showCues ? '<th>PA announcement</th>' : ''}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
  }).filter(Boolean).join('');

  if (!blocks) {
    return `<div class="bcs"><div class="pp-empty">No broadcast sessions in this scope yet. Turn on broadcast timing on a Senior finals session.</div></div>`;
  }
  return `<div class="bcs" id="bcastSheet">
    <div class="bcs-page">
      <header class="bcs-phd"><div class="bcs-pmeet">${meetName}<span>Broadcast run-of-show</span></div>
        <img class="bcs-plogo" src="../shared/images/logo-white-horizontal.png?v=202606250245" alt="USA Diving"/></header>
      <div class="bcs-body">${blocks}</div>
      <footer class="bcs-pft"><span>${meetName} · Broadcast run-of-show</span><span>Times are seconds-accurate · ${esc(today)}</span></footer>
    </div>
  </div>`;
}

function renderBcastPreviewModal() {
  const sess = S.sessions.find(x => x.id === UI.bcastSessId);
  if (!sess) return '';
  const timed = allTimed().filter(s => s.id === sess.id);
  return `<div class="modal modal-lg" onclick="event.stopPropagation()">
    <div class="modal-hd"><span class="modal-title">Run-of-show</span><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">${renderBcastSheet(timed, { showCues: true })}</div>
    <div class="modal-foot"><button class="btn btn-gh" onclick="closeModal()">Close</button><div style="flex:1"></div>
      <button class="btn" onclick="exportBroadcast()">Run-of-show (.xlsx)</button>
      <button class="btn btn-p" onclick="printBroadcast()">Print / PDF</button></div>
  </div>`;
}

// ── PRINT ─────────────────────────────────────────────────────────────
function bcastScopeSessions() {
  const timed = genTimedForPreview(allTimed());
  return timed.filter(s => bcastOn(s) && s.timing && s.timing.bcastRows);
}
function printBroadcast() {
  const list = UI.bcastSessId ? allTimed().filter(s => s.id === UI.bcastSessId) : bcastScopeSessions();
  const title = (typeof genTitle === 'function' && genTitle()) || S.meet.name || 'USA Diving';
  const showCues = !(AUD.broadcast && AUD.broadcast.showCues === false);
  const html = renderBcastSheet(list, { title, showCues });
  const w = window.open('', '_blank');
  if (!w) { alert('Pop-up blocked — allow pop-ups for this site and try again'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)} — Broadcast run-of-show</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>${BCAST_PRINT_CSS}</style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 700);
}

const BCAST_PRINT_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#171F69;--red:#E31937;--pool:#009AC7;--sky:#8FC3EA;--gray:#5F6062}
html,body{background:#fff;font-family:'Inter',system-ui,sans-serif;color:#1a1c2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:letter landscape;margin:0.35in}
.bcs-page{display:flex;flex-direction:column}
.bcs-phd{background:var(--navy);color:#fff;padding:11px 18px;display:flex;align-items:center;justify-content:space-between;position:relative}
.bcs-phd::after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--pool)}
.bcs-pmeet{font-size:16px;font-weight:800;line-height:1.15}
.bcs-pmeet span{display:block;font-size:9.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--sky);margin-top:2px}
.bcs-plogo{height:30px}
.bcs-body{padding:12px 16px 4px}
.bcs-sess{margin-bottom:14px;break-inside:avoid}
.bcs-hd{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding-bottom:4px;margin-bottom:5px;border-bottom:2px solid var(--navy)}
.bcs-badge{font-size:8px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;background:var(--pool);color:#fff;padding:2px 7px;border-radius:4px}
.bcs-nm{font-size:13px;font-weight:800;color:var(--navy)}
.bcs-day{font-size:10.5px;font-weight:600;color:var(--gray)}
.bcs-win{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--navy)}
.bcs-tbl{width:100%;border-collapse:collapse}
.bcs-tbl th{background:#F2F4F8;color:var(--navy);font-size:8px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;text-align:left;padding:4px 7px;border-bottom:1px solid #D9DEE8}
.bcs-tbl td{padding:4px 7px;font-size:10.5px;vertical-align:top;border-bottom:1px solid #EDF0F5}
.bcr-t{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--navy);white-space:nowrap;width:88px}
.bcr-k{font-size:7.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--gray);width:52px}
.bcr-l{font-weight:700;color:#1a1c2e}
.bcr-note{display:block;font-size:8.5px;font-weight:500;color:var(--gray);margin-top:1px}
.bcr-p,.bcr-d{font-family:'JetBrains Mono',monospace;font-size:10px;white-space:nowrap;width:76px;color:#33374d}
.bcr-c{font-size:9.5px;color:#33374d;line-height:1.35;font-style:italic}
.bcr.k-round{background:#EAF6FB}
.bcr.k-round .bcr-l{color:var(--navy)}
.bcr.k-break,.bcr.k-reset{background:#FFF6F8}
.bcr.k-break .bcr-l,.bcr.k-reset .bcr-l{color:var(--red)}
.bcr.k-ceremony,.bcr.k-ceremonyprep,.bcr.k-flash{background:#F5F2FA}
.bcr.k-boardsclose,.bcr.k-presentation{background:#F2F4F8}
.bcr.k-finish{background:var(--navy)}
.bcr.k-finish td{color:#fff;font-weight:800}
.bcs-pft{display:flex;justify-content:space-between;padding:8px 18px;border-top:2px solid var(--navy);font-size:9px;color:var(--gray);margin-top:6px}
.pp-empty{padding:40px;text-align:center;color:var(--gray)}
`;

// ── XLSX EXPORT ───────────────────────────────────────────────────────
async function exportBroadcast() {
  const list = UI.bcastSessId ? allTimed().filter(s => s.id === UI.bcastSessId) : bcastScopeSessions();
  if (!list.length) { toast('No broadcast sessions to export'); return; }
  if (typeof ExcelJS === 'undefined') { toast('Excel engine not loaded — use Print / PDF'); return; }
  const title = (typeof genTitle === 'function' && genTitle()) || S.meet.name || 'USA Diving';
  const cues = paCues();
  const N = 'FF171F69', P = 'FF009AC7', R = 'FFE31937', W = 'FFFFFFFF', SKY = 'FFEAF6FB', PK = 'FFFFF6F8', GR = 'FFF2F4F8', LAV = 'FFF5F2FA';
  try {
    const wb = new ExcelJS.Workbook(); wb.creator = 'USA Diving'; wb.created = new Date();
    const ws = wb.addWorksheet('Run of Show', { views: [{ state: 'frozen', ySplit: 3 }] });
    ws.columns = [{ width: 14 }, { width: 9 }, { width: 42 }, { width: 14 }, { width: 12 }, { width: 66 }];
    const fill = a => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: a } });
    const thin = { style: 'thin', color: { argb: 'FFD9DEE8' } };
    const BORD = { top: thin, left: thin, bottom: thin, right: thin };

    ws.mergeCells('A1:F1');
    const t1 = ws.getCell('A1'); t1.value = title; t1.font = { bold: true, size: 16, color: { argb: N } }; ws.getRow(1).height = 26;
    ws.mergeCells('A2:F2');
    const t2 = ws.getCell('A2'); t2.value = 'Broadcast Run-of-Show · Senior Finals · times are seconds-accurate · ' + new Date().toLocaleDateString();
    t2.font = { size: 10, color: { argb: 'FF666666' } }; ws.getRow(2).height = 16;

    const hr = ws.addRow(['Time', 'Type', 'Element', 'Per diver', 'Duration', 'PA announcement']); hr.height = 20;
    hr.eachCell(c => { c.fill = fill(N); c.font = { bold: true, size: 10, color: { argb: W } }; c.alignment = { horizontal: 'left', vertical: 'middle' }; c.border = BORD; });

    const band = (text, bg) => { const r = ws.addRow([text]); ws.mergeCells(`A${r.number}:F${r.number}`); const c = r.getCell(1); c.fill = fill(bg); c.font = { bold: true, size: 11, color: { argb: W } }; c.alignment = { vertical: 'middle' }; r.height = 18; };

    list.forEach(sess => {
      const rows = sess.timing.bcastRows || []; if (!rows.length) return;
      const day = S.meet.days.find(d => d.id === sess.dayId);
      const evs = (sess.events || []).filter(e => isBcastEv(sess, e));
      const total = rows[rows.length - 1].endSec - rows[0].startSec;
      band(`${day ? String(fullDate(day.date)).toUpperCase() : ''}  ·  ${evs.map(evName).join('  &  ').toUpperCase()}  ·  ${bclockShort(rows[0].startSec)}–${bclockShort(rows[rows.length - 1].endSec)}  (${bsec(total)})`, N);
      rows.forEach(r => {
        const bg = r.kind === 'round' ? SKY : (r.kind === 'break' || r.kind === 'reset') ? PK
          : (r.kind === 'ceremony' || r.kind === 'ceremonyprep' || r.kind === 'flash') ? LAV
            : r.kind === 'finish' ? N : GR;
        const per = r.kind === 'round' || (r.kind === 'presentation' && r.perSec) ? `${r.divers} × ${bmmss(r.perSec)}` : '';
        const row = ws.addRow([bclock(r.startSec), BC_KIND_LABEL[r.kind] || '', r.label, per, r.durSec ? bsec(r.durSec) : '', paCueFor(r, cues)]);
        row.eachCell({ includeEmpty: true }, (c, i) => {
          c.border = BORD; c.fill = fill(bg);
          c.font = { size: 10, bold: i === 1 || i === 3, color: { argb: r.kind === 'finish' ? W : 'FF1A1C2E' } };
          c.alignment = { vertical: 'top', wrapText: i === 6 };
        });
        if (r.kind === 'round') row.getCell(3).font = { size: 10, bold: true, color: { argb: N } };
        if (r.kind === 'break' || r.kind === 'reset') row.getCell(3).font = { size: 10, bold: true, color: { argb: R } };
      });
      ws.addRow([]);
    });
    const fr = ws.addRow(['USA Diving · ' + title + ' · Broadcast run-of-show']);
    ws.mergeCells(`A${fr.number}:F${fr.number}`); fr.getCell(1).font = { size: 9, color: { argb: 'FF888888' } };
    await xlsxSave(wb, `${title.replace(/[^a-z0-9]/gi, '-')}-broadcast-run-of-show.xlsx`, 'Broadcast run-of-show downloaded');
  } catch (e) { console.error('[broadcast xlsx]', e); toast('Export failed — use Print / PDF'); }
}
