'use strict';
/* ─────────────────────────────────────────────────────────────────────────
   RECOVERY OPTIONS — what to DO about a late day.

   The run sheet is good at telling you the day is +18 and that there are 45
   minutes of buffer left. Both true; neither is a decision. The decision a
   meet director actually makes at two in the afternoon is: do I cut warm-up on
   the next block, spend the buffer, or accept the day runs late and take the
   consequences at the far end — the facility close time, and the finals block
   people have been told to turn up for.

   Everything needed to lay that out is already authored: per-session buffer,
   warm-up minutes, the venue's close time, and which sessions carry finals.
   This module reads them and presents the levers side by side, with what each
   one buys and what it costs.

   TWO HARD RULES, both inherited from the rest of this app:
     • ADVISORY ONLY. Nothing here writes to the plan. There is no Apply button
       anywhere in this file, and adding one later would be a mistake — a lever
       that looks reasonable in a table is still a decision about real athletes'
       warm-up, and the person holding the tablet is the one who gets to make it.
     • It NEVER proposes moving a published start time earlier. Recovering time
       means giving less of it away later, never pulling a block forward onto
       people who are not there yet.
   ───────────────────────────────────────────────────────────────────────── */

// A warm-up this short is not a warm-up. Used as the floor for any trim the
// panel suggests, so it can never recommend sending divers up cold.
const RECOVERY_MIN_WARMUP = 25;
// Trimming below this per session isn't worth the disruption of announcing it.
const RECOVERY_MIN_TRIM = 5;

function recoveryDayRows(dayId){
  return (typeof liveProject === 'function') ? liveProject(dayId, {ignoreClock:true}) : [];
}

// The state of the day as one object: how late it is, what is still to come,
// and where it lands against the facility close.
function recoveryPicture(dayId){
  const rows = recoveryDayRows(dayId).filter(r => !r.sess.isPractice);
  if (!rows.length) return null;
  const day = (S.meet.days || []).find(d => d.id === dayId);
  const closeM = day && day.closeMinutes != null ? Number(day.closeMinutes) : null;
  const last = rows[rows.length - 1];
  const shift = Math.round(last.projEnd - last.plannedEnd);
  // "Still to come" is everything not finished — those are the only blocks whose
  // warm-up or buffer can still be changed. A block that has run is history.
  const ahead = rows.filter(r => r.status !== 'done');
  const finalsAhead = ahead.filter(r => (r.sess.events || []).some(e => e.round === 'Final'));
  return {
    rows, ahead, finalsAhead, day, closeM, last, shift,
    projEnd: last.projEnd, plannedEnd: last.plannedEnd,
    overClose: closeM != null ? Math.round(last.projEnd - closeM) : null
  };
}

// The levers, each with what it buys (mins) and what it costs, in plain words.
// Order is deliberate: cheapest first, so the panel reads as an escalation.
function recoveryOptions(dayId){
  const p = recoveryPicture(dayId);
  if (!p) return [];
  const out = [];

  // ── LEVER 1: spend the buffer already sitting between blocks ──────────────
  // This is the free one. Buffer is deliberate slack; spending it costs nothing
  // but the slack itself, which is exactly what it is there for.
  const bufRows = p.ahead.filter(r => Number(r.sess.bufferMinutes || 0) > 0);
  const buf = bufRows.reduce((a, r) => a + Number(r.sess.bufferMinutes || 0), 0);
  if (buf > 0) {
    out.push({
      key: 'buffer',
      title: 'Spend the buffer between the remaining blocks',
      gain: buf,
      detail: `${bufRows.length} block${bufRows.length === 1 ? '' : 's'} still to run carry ${buf} min of buffer between them.`,
      cost: 'Nothing except the slack itself — but once it is gone the next delay lands straight on the published times.',
      how: 'Set the gap to 0 on the blocks you choose, in the timeline.'
    });
  }

  // ── LEVER 2: trim warm-up on blocks that have not started ────────────────
  // The expensive one, and the panel says so. It names the athlete cost in the
  // same breath as the minutes, because the minutes are the easy part.
  const trims = [];
  p.ahead.forEach(r => {
    if (r.status === 'running') return;              // already in warm-up; too late to trim
    const wu = Number(r.sess.warmupMinutes || 0);
    const room = wu - RECOVERY_MIN_WARMUP;
    if (room < RECOVERY_MIN_TRIM) return;
    const divers = (r.sess.events || []).reduce((a, e) => a + (typeof entryValue === 'function' ? entryValue(e) : 0), 0);
    trims.push({ sess: r.sess, from: wu, to: RECOVERY_MIN_WARMUP, gain: room, divers,
      label: (typeof sessLabelOf === 'function') ? sessLabelOf(r.sess) : 'a later block' });
  });
  if (trims.length) {
    const total = trims.reduce((a, t) => a + t.gain, 0);
    const divers = trims.reduce((a, t) => a + t.divers, 0);
    out.push({
      key: 'warmup',
      title: 'Trim warm-up on blocks that have not started',
      gain: total,
      detail: trims.map(t => `${t.label}: ${t.from}\u2192${t.to} min (${t.gain} back)`).join(' \u00b7 '),
      cost: `${divers} diver${divers === 1 ? '' : 's'} get less warm-up. Nothing here goes below ${RECOVERY_MIN_WARMUP} min.`,
      how: 'Change Warm-up on those blocks in the session editor.',
      rows: trims
    });
  }

  // ── LEVER 3: accept it ────────────────────────────────────────────────────
  // Always present, always last, and stated as a real option rather than a
  // failure — most of the time it IS the right answer, and a panel that only
  // offers ways to cut things pushes people into cutting things.
  out.push({
    key: 'accept',
    title: 'Accept the delay and run late',
    gain: 0,
    detail: p.shift > 0
      ? `The day finishes about ${f12(p.projEnd)} instead of ${f12(p.plannedEnd)} — ${p.shift} min late.`
      : 'The day is not running late. Nothing needs recovering.',
    cost: p.overClose != null && p.overClose > 0
      ? `Runs ${p.overClose} min past the facility close of ${f12(p.closeM)}. Check this with the venue before choosing it.`
      : (p.finalsAhead.length
          ? `${p.finalsAhead.length} finals block${p.finalsAhead.length === 1 ? '' : 's'} still to come would start late. Spectators and streaming have been told the published time.`
          : 'No finals left today, so the delay lands on staff and clean-up rather than on spectators.'),
    how: p.shift > 0 ? 'Approve times to make the published schedule say so.' : ''
  });

  return out;
}

function openRecovery(){ UI.modal = 'live-recovery'; UI.recoveryDay = UI.dayId; render(); }
function closeRecovery(){ UI.modal = null; UI.recoveryDay = null; render(); }

function renderRecoveryModal(){
  const dayId = UI.recoveryDay || UI.dayId;
  const p = recoveryPicture(dayId);
  const opts = recoveryOptions(dayId);
  const day = (S.meet.days || []).find(d => d.id === dayId);
  const dayName = day ? (typeof shortDate === 'function' ? shortDate(day.date) : day.date) : '';

  const head = `<div class="modal-head"><div><span class="modal-title">Recovery options \u2014 ${esc(dayName)}</span>
    <div class="modal-sub">${p && p.shift > 0
      ? `Running ${p.shift} min late. Here is what you can actually do about it, and what each one costs.`
      : 'The day is on or ahead of plan — this is here so you can see the levers before you need them.'}</div></div>
    <button class="modal-close" aria-label="Close" onclick="closeRecovery()">&times;</button></div>`;

  if (!p) return `<div class="modal" onclick="event.stopPropagation()">${head}
    <div class="modal-body"><div class="lt-help">There are no competition blocks on this day.</div></div>
    <div class="modal-foot"><button class="btn btn-sm btn-gh" onclick="closeRecovery()">Close</button></div></div>`;

  const need = Math.max(0, p.shift);
  const recoverable = opts.filter(o => o.gain > 0).reduce((a, o) => a + o.gain, 0);
  const banner = need === 0
    ? `<div class="rc-banner ok">Nothing to recover. The day is projected to finish ${f12(p.projEnd)}, on plan.</div>`
    : recoverable >= need
      ? `<div class="rc-banner ok">The ${need} min can be recovered in full \u2014 ${recoverable} min is available across the options below.</div>`
      : `<div class="rc-banner warn">${need} min late, and only ${recoverable} min can be recovered. ${need - recoverable} min will land on the end of the day whatever you choose.</div>`;

  const cards = opts.map(o => `<div class="rc-opt ${o.key}">
      <div class="rc-opt-hd">
        <span class="rc-opt-t">${esc(o.title)}</span>
        ${o.gain > 0 ? `<span class="rc-gain">recovers ${o.gain} min</span>` : `<span class="rc-gain none">no time recovered</span>`}
      </div>
      <div class="rc-detail">${esc(o.detail)}</div>
      <div class="rc-cost"><b>Costs:</b> ${esc(o.cost)}</div>
      ${o.how ? `<div class="rc-how">${esc(o.how)}</div>` : ''}
    </div>`).join('');

  return `<div class="modal modal-lg" onclick="event.stopPropagation()">${head}
    <div class="modal-body">
      ${banner}
      ${cards}
      <div class="lt-help" style="margin-top:12px">These are suggestions only. Nothing on this panel changes your schedule \u2014 there is no apply button on purpose, because cutting a warm-up is a decision about real divers and it stays yours to make.</div>
    </div>
    <div class="modal-foot"><span style="flex:1"></span>
      <button class="btn btn-sm btn-gh" onclick="closeRecovery()">Close</button></div>
  </div>`;
}
