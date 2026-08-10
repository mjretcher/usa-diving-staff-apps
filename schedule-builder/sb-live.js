'use strict';
/* ─────────────────────────────────────────────────────────────────────────
   LIVE RUN SHEET — what is ACTUALLY happening, next to what was planned.

   The hard rule this module is built around: it NEVER writes to the plan.
   Nothing in here touches warmupStartMinutes, bufferMinutes, durations, dive
   counts or anything else calcSessTiming reads. Actuals live in their own
   namespace, S.live, and the published schedule stays exactly as authored —
   which is also why the run sheet keeps working on a LOCKED day. Locking the
   plan and running the meet are meant to happen at the same time.

   Everything is expressed as a per-session SHIFT in minutes, derived from the
   best evidence available, in this order of preference:
     1. the last event in the session that actually finished
     2. the session's actual start
     3. the projected knock-on from the session before it
   One number, one explanation: "the rest of this session is running +12".
   That is a claim a person can check against a wall clock, which matters more
   than a cleverer model nobody trusts.

   Stored shape (all times are minutes-from-midnight in the MEET's timezone):
     S.live = {
       on: true,
       day: '2026-08-03',                       // guards against stale stamps
       s: { <sessionId>:      {st, en, stAt, enAt} },
       e: { <eventId>:        {st, en, stAt, enAt} },
       b: { '<eventId>::0|1': {st, en, stAt, enAt} }   // split boards
     }
   For a split event the e[] record is DERIVED from its boards — first board in,
   last board out — so everything downstream stays right without knowing boards
   exist.
   ───────────────────────────────────────────────────────────────────────── */

// ── time helpers ─────────────────────────────────────────────────────────
function liveTz(){return (S.meet&&S.meet.timezone)||'America/New_York'}
function liveNowParts(){
  try{
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:liveTz(),year:'numeric',month:'2-digit',
      day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
    const g=t=>p.find(x=>x.type===t).value;
    let h=+g('hour');if(h===24)h=0;
    return {date:`${g('year')}-${g('month')}-${g('day')}`,min:h*60+(+g('minute'))};
  }catch(e){
    const d=new Date();
    return {date:[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),
            min:d.getHours()*60+d.getMinutes()};
  }
}
// A settable clock. Left null in normal use, so it reads the real wall clock in the
// meet's timezone. Being able to pin it is what makes the projection testable, and it
// doubles as a way to walk staff through "what does the day look like if we're 20 late
// at 2pm" without touching anything.
let _rsNow=null,_rsToday=null;
function liveNowMin(){return _rsNow!=null?_rsNow:liveNowParts().min}
function liveToday(){return _rsToday!=null?_rsToday:liveNowParts().date}
function liveSetClock(min,date){_rsNow=min;_rsToday=date||null;render()}
function liveClearClock(){_rsNow=null;_rsToday=null;render()}
// "Now" may only bend a projection on the day that is actually happening. Looking at
// Thursday's plan on Tuesday must not drag Thursday's blocks to the current time.
function liveIsToday(dayId){
  const d=((S.meet&&S.meet.days)||[]).find(x=>x.id===dayId);
  return !!(d&&d.date===liveToday());
}
// +12 / −4 / on time
function liveDelta(mins){
  const m=Math.round(mins);
  if(m===0)return'on time';
  return (m>0?'+':'\u2212')+Math.abs(m)+' min';
}
function liveDeltaCls(mins){
  const m=Math.round(mins);
  if(m>=10)return'late';if(m>=3)return'slip';if(m<=-3)return'early';return'ontime';
}

// ── state ────────────────────────────────────────────────────────────────
function liveState(){
  if(!S.live||typeof S.live!=='object')S.live={on:false,s:{},e:{},b:{}};
  if(!S.live.s)S.live.s={};
  if(!S.live.e)S.live.e={};
  if(!S.live.b)S.live.b={};   // per-board actuals, keyed evId::0 / evId::1
  return S.live;
}
function liveOn(){return !!liveState().on}
function liveSess(id){return liveState().s[id]||null}
function liveEv(id){return liveState().e[id]||null}
// Actuals are deliberately kept OUT of upd(): they must not be blocked by a lock
// (the whole point is recording reality against a frozen plan) and they should not
// pile up in the undo stack, which belongs to schedule editing.
function liveWrite(fn,msg){
  liveState();
  fn(S.live);
  S.live.day=liveToday();
  saveS();
  // Deliberately NOT scheduleSave(). That pushed the entire published schedule on
  // every tap, which is how a device holding an older copy could overwrite newer
  // plan edits made elsewhere. Actuals go to their own row and cannot touch the plan.
  if(S.currentLibraryId&&typeof scheduleRunSheetSave==='function')scheduleRunSheetSave();
  render();
  if(msg)toast(msg,2600);
}
function liveToggle(){
  liveState();
  const turningOn=!S.live.on;
  // The run sheet is a record of what actually happened, and every projection it
  // makes is anchored to "is this day today" \u2014 liveIsToday() compares day.date to
  // the real clock. A schedule still numbered Day 1, Day 2 has placeholder dates, so
  // that test can never pass and the run sheet would look on but do nothing. Refuse
  // and name the fix rather than leave it half working with a meet in progress.
  if(turningOn&&typeof datesPending==='function'&&datesPending()){
    toast('This schedule is still numbered Day 1, Day 2\u2026 \u2014 set the real meet dates first (Meet setup, then Set the dates) and the run sheet can track the day.',6000);
    if(typeof openSetDates==='function')openSetDates();
    return;
  }
  liveWrite(l=>{l.on=turningOn},turningOn
    ?'Run sheet on \u2014 tap Start when a session or event actually begins'
    :'Run sheet off \u2014 the schedule shows planned times only');
  if(turningOn)liveTick(true);
}

// ── recording ────────────────────────────────────────────────────────────
function liveStartSess(sessId){
  const now=liveNowMin();
  liveWrite(l=>{
    const r=l.s[sessId]||(l.s[sessId]={});
    r.st=now;r.stAt=new Date().toISOString();delete r.en;delete r.enAt;
  },'Session started at '+f12(now));
}
// What the big button does. Events inside a session are concurrent \u2014 the timing
// engine treats them as boards running side by side \u2014 so "the session started"
// and "the events started" were always the same moment, and making Mike say it
// twice was the clunkiest thing on the deck. One tap says it once. If a board
// genuinely went in later, its own time is still editable.
function liveStartNow(sessId){
  const sess=S.sessions.find(x=>x.id===sessId);
  if(sess&&(sess.events||[]).length)liveStartAllEvs(sessId); else liveStartSess(sessId);
  liveOpenAdj(sessId,'st');
}
function liveFinishNow(sessId){liveFinishSess(sessId);liveOpenAdj(sessId,'en');}

/* ── \"It started twenty minutes ago and I only got back to the tablet now\" ──
   Tapping the button at the moment something happens is the fast path; it is not
   the common one. Being pulled away is. So every stamp opens a strip that walks
   the time backwards a tap at a time, or takes it typed, without a modal and
   without losing your place on the page.

   A nudge moves the session AND everything that was stamped in the same instant
   \u2014 events, boards \u2014 because they were all recorded by one tap and would
   otherwise have to be corrected one at a time. Only records holding the exact
   same minute move; anything recorded separately is left alone. */
function liveOpenAdj(sessId,field){UI.liveAdj={sessId:sessId,field:field};render();}
function liveCloseAdj(){UI.liveAdj=null;render();}
function _liveMoveSess(sessId,field,to){
  const sess=S.sessions.find(x=>x.id===sessId);
  const rec=liveSess(sessId)||{};
  const from=rec[field];
  if(from==null)return;
  if(to===from)return;
  if(to<0||to>1439){toast('That time is outside the day');return;}
  const other=field==='st'?rec.en:rec.st;
  if(field==='st'&&other!=null&&to>other){toast('The start would be after the finish \u2014 fix the finish first');return;}
  if(field==='en'&&other!=null&&to<other){toast('The finish would be before the start \u2014 fix the start first');return;}
  const stamp=new Date().toISOString();
  // Counted BEFORE the write: liveWrite takes its message as an argument, so a
  // tally raised inside the callback is still zero by the time it is read.
  const moved=(sess?sess.events:[]).filter(ev=>{const er=liveEv(ev.id);return er&&er[field]===from;}).length;
  liveWrite(l=>{
    const r=l.s[sessId]||(l.s[sessId]={});
    r[field]=to;r[field+'At']=stamp;r[field+'M']=true;
    (sess?sess.events:[]).forEach(ev=>{
      const er=l.e[ev.id];
      if(er&&er[field]===from){er[field]=to;er[field+'At']=stamp;er[field+'M']=true;}
      [0,1].forEach(i=>{const br=l.b[boardKey(ev.id,i)];
        if(br&&br[field]===from){br[field]=to;br[field+'At']=stamp;br[field+'M']=true;}});
    });
  },(field==='st'?'Started ':'Finished ')+f12(to)+(moved?' \u00b7 '+moved+' event'+(moved===1?'':'s')+' moved with it':''));
}
function liveNudge(sessId,field,delta){
  const rec=liveSess(sessId)||{};
  if(rec[field]==null)return;
  _liveMoveSess(sessId,field,rec[field]+delta);
}
function liveSetAdjFromField(sessId,field){
  const el=document.getElementById('lv-adj-in');
  if(!el)return;
  const v=(el.value||'').trim();
  if(!v){toast('Type a time first');return;}
  const m=pt(v);
  if(isNaN(m)){toast('That is not a time');return;}
  _liveMoveSess(sessId,field,m);
}
function liveFinishSess(sessId){
  const now=liveNowMin();
  const sess=S.sessions.find(x=>x.id===sessId);
  liveWrite(l=>{
    const r=l.s[sessId]||(l.s[sessId]={});
    if(r.st==null){r.st=now;r.stAt=new Date().toISOString();}
    r.en=now;r.enAt=new Date().toISOString();
    // Any event still shown as running is closed out at the same moment, so the
    // sheet can never be left claiming an event is live inside a finished session.
    (sess?sess.events:[]).forEach(ev=>{
      [0,1].forEach(i=>{const br=l.b[boardKey(ev.id,i)];
        if(br&&br.st!=null&&br.en==null){br.en=now;br.enAt=new Date().toISOString();}});
      const er=l.e[ev.id];
      if(er&&er.st!=null&&er.en==null){er.en=now;er.enAt=new Date().toISOString();}
    });
  },'Session finished at '+f12(now));
}
function liveStartEv(sessId,evId){
  const now=liveNowMin();
  liveWrite(l=>{
    const r=l.e[evId]||(l.e[evId]={});
    r.st=now;r.stAt=new Date().toISOString();delete r.en;delete r.enAt;
    // Starting an event implies the session is under way.
    const sr=l.s[sessId]||(l.s[sessId]={});
    if(sr.st==null){sr.st=now;sr.stAt=new Date().toISOString();}
  },'Event started at '+f12(now));
}
function liveEndEv(evId){
  const now=liveNowMin();
  liveWrite(l=>{
    const r=l.e[evId]||(l.e[evId]={});
    if(r.st==null){r.st=now;r.stAt=new Date().toISOString();}
    r.en=now;r.enAt=new Date().toISOString();
  },'Event ended at '+f12(now));
}
// "They all went in together" — one tap for a session whose events run on
// parallel boards and genuinely do start at the same moment.
function liveStartAllEvs(sessId){
  const sess=S.sessions.find(x=>x.id===sessId);if(!sess)return;
  const open=(sess.events||[]).filter(ev=>{const r=liveEv(ev.id);return !r||r.en==null});
  if(!open.length){toast('Every event in this session has already finished');return;}
  const now=liveNowMin();
  liveWrite(l=>{
    const sr=l.s[sessId]||(l.s[sessId]={});
    if(sr.st==null){sr.st=now;sr.stAt=new Date().toISOString();}
    open.forEach(ev=>{
      if(evIsSplit(ev)){
        [0,1].forEach(i=>{const br=l.b[boardKey(ev.id,i)]||(l.b[boardKey(ev.id,i)]={});
          if(br.st==null){br.st=now;br.stAt=new Date().toISOString();}});
        liveSyncEvFromBoards(l,ev);
        return;
      }
      const r=l.e[ev.id]||(l.e[ev.id]={});
      if(r.st==null){r.st=now;r.stAt=new Date().toISOString();}
    });
  },open.length+' event'+(open.length===1?'':'s')+' started at '+f12(now));
}
function liveClearSess(sessId){
  const sess=S.sessions.find(x=>x.id===sessId);
  askConfirm({
    title:'Clear the recorded times for this session?',
    message:'The actual start and finish times you logged for this session and its events are removed. The planned schedule is not affected.',
    confirmText:'Clear recorded times',danger:true,
    onConfirm:()=>liveWrite(l=>{
      delete l.s[sessId];
      (sess?sess.events:[]).forEach(ev=>{delete l.e[ev.id];[0,1].forEach(i=>{delete l.b[boardKey(ev.id,i)]})});
    },'Recorded times cleared')
  });
}
function liveResetDay(){
  const dayId=UI.dayId;
  const sessions=S.sessions.filter(s=>s.dayId===dayId);
  askConfirm({
    title:'Clear every recorded time for this day?',
    message:'All actual start and finish times logged today are removed. The planned schedule is not affected.',
    confirmText:'Clear the day',danger:true,
    onConfirm:()=>liveWrite(l=>{
      sessions.forEach(s=>{delete l.s[s.id];
        (s.events||[]).forEach(ev=>{delete l.e[ev.id];[0,1].forEach(i=>{delete l.b[boardKey(ev.id,i)]})});
      });
    },'Recorded times cleared for this day')
  });
}

// ── projection ───────────────────────────────────────────────────────────
// One pass over a day. Returns, for every session on it:
//   plannedStart / plannedEnd  — straight from the plan, never modified
//   shift                      — minutes the session is running late (+) or early (−)
//   projStart / projEnd        — planned ± shift, or the actual where we have one
//   status                     — 'done' | 'running' | 'next' | 'todo'
//   basis                      — how the shift was worked out, for the tooltip
//   events[]                   — same idea per event
// opts.ignoreClock — leave the wall clock out of it entirely. The live view wants
// "it can't start before now" and "a session still open is at least as long as the
// clock says"; APPROVAL must not, or the mere passage of time would propose rewriting
// published times with nothing actually recorded, and the button would never settle.
function liveProject(dayId,opts){
  const now=liveNowMin();
  const isToday=liveIsToday(dayId)&&!(opts&&opts.ignoreClock);
  // Pace staleness is about "is this mark still describing what is happening",
  // which only means anything while the day is actually running. Reviewing
  // yesterday, or approving a day with ignoreClock set, the marks are simply the
  // record of what happened and the wall clock must not age them out — that read
  // the real clock against a schedule-minute timestamp and silently discarded
  // every mark on any day but today.
  const paceNow=liveIsToday(dayId)?now:null;
  const day=(S.meet.days||[]).find(d=>d.id===dayId);
  const all=(typeof timedForDay==='function'?timedForDay(dayId):[]).slice()
    .sort((a,b)=>a.timing.warmupStartMinutes-b.timing.warmupStartMinutes);
  const out=[];let cursor=null;let firstUnfinished=true;
  // Knock-on is only ever inherited from something that ACTUALLY happened. Until the
  // first real stamp of the day, projected times are the published times, full stop.
  let seenActual=false;
  all.forEach(sess=>{
    const t=sess.timing;
    const rec=liveSess(sess.id)||{};
    const plannedStart=t.warmupStartMinutes,plannedEnd=t.sessionEndMinutes;
    // A session's recorded start is when the FIRST DIVER GOES, not when warm-up
    // opened. Comparing it to the top of the block reported the whole warm-up as
    // lateness — a session four minutes late read as fifty-nine. Warm-up and
    // introductions are timed separately so each is measured against its own plan.
    const plannedCompStart=(t.eventStartMinutes!=null?t.eventStartMinutes:plannedStart);
    const plannedDur=Math.max(0,plannedEnd-plannedStart);
    const parallel=(typeof isParallel==='function')&&isParallel(sess);

    // The most recent hard evidence inside this session: the last event that finished.
    let anchor=null;
    (t.events||[]).slice().sort((a,b)=>a.eventEndMinutes-b.eventEndMinutes).forEach(ev=>{
      const er=liveEv(ev.id);
      if(er&&er.en!=null)anchor={at:er.en,planned:ev.eventEndMinutes,ev:ev.id};
    });

    let status,shift,projStart,projEnd,basis,stale=false;
    if(rec.st!=null||rec.en!=null)seenActual=true;
    if(rec.en!=null){
      status='done';
      projStart=rec.st!=null?(plannedStart+(rec.st-plannedCompStart)):plannedStart;
      projEnd=rec.en;
      shift=rec.en-plannedEnd;
      basis='Finished at '+f12(rec.en)+' (planned '+f12(plannedEnd)+')';
    }else if(rec.st!=null){
      status='running';
      if(anchor){shift=anchor.at-anchor.planned;basis='Shifted from the last event that finished';}
      else{shift=rec.st-plannedCompStart;basis='Competition started '+f12(rec.st)+' (planned '+f12(plannedCompStart)+')';}
      // The block still displays from the top of the block; it moves by whatever
      // the competition moved by.
      projStart=plannedStart+shift;
      projEnd=plannedEnd+shift;
      // The overrun / "was Finish missed?" decision is deferred until the per-event
      // ends below are known — an event that actually started can push this later,
      // and judging the session stale against a number that ignores its own boards
      // would cry wolf.
      firstUnfinished=false;
    }else{
      status=firstUnfinished?'next':'todo';
      if(firstUnfinished)firstUnfinished=false;
      // Not started: inherit the knock-on from what came before, but never pull a
      // session earlier than it was published, and never show it starting in the past.
      const inherited=(seenActual&&cursor!=null)?Math.max(plannedStart,cursor):plannedStart;
      projStart=parallel?Math.max(plannedStart,inherited===plannedStart?plannedStart:inherited):inherited;
      if(isToday&&status==='next'&&now>projStart)projStart=Math.max(projStart,now);
      shift=projStart-plannedStart;
      projEnd=projStart+plannedDur;
      basis=shift?'Knock-on from the sessions before it':'Running to plan';
    }

    const evs=(t.events||[]).map(ev=>{
      const er=liveEv(ev.id)||{};
      // Both boards of a split run the same half-field concurrently, so each board's
      // length is the event's own planned length. A board that goes in late gets off
      // late by exactly that much.
      const evDur=Math.max(0,ev.eventEndMinutes-ev.eventStartMinutes);
      const split=(typeof evIsSplit==='function')&&evIsSplit(ev);
      const bnames=split?boardNamesFor(ev.apparatus):null;
      const boards=split?[0,1].map(i=>{
        const br=liveBoard(ev.id,i)||{};
        let bst,ben,bstatus;
        if(br.en!=null){bstatus='done';bst=br.st!=null?br.st:ev.eventStartMinutes+shift;ben=br.en;}
        else if(br.st!=null){bstatus='running';bst=br.st;ben=bst+evDur;
          if(isToday&&now>ben&&now<=ben+90)ben=now;}
        else{bstatus='todo';bst=ev.eventStartMinutes+shift;ben=ev.eventEndMinutes+shift;}
        return{i:i,name:bnames[i],st:br.st,en:br.en,stM:!!br.stM,enM:!!br.enM,
          projStart:bst,projEnd:ben,status:bstatus,
          delta:bstatus==='done'?(br.en-ev.eventEndMinutes):(bst-ev.eventStartMinutes)};
      }):null;
      let est,een,estatus,paceInfo=null;
      if(er.en!=null){estatus='done';est=er.st!=null?er.st:ev.eventStartMinutes+shift;een=er.en;}
      else if(er.st!=null){
        estatus='running';est=er.st;
        // Its OWN start plus its OWN planned length. The session-level shift must not
        // speak for it: two boards that went in twenty minutes apart have to be able
        // to report finishing twenty minutes apart, which is the whole reason for
        // recording them separately.
        een=est+evDur;
        // A split event is off the boards when its LAST board is off.
        if(boards)een=Math.max.apply(null,boards.map(b=>b.projEnd));
        // A pace mark beats the planned length: it is measured from this event's
        // own dives, on this day, with these judges. Only overrides when the mark
        // is fresh and substantial enough to mean something (see livePaceRate).
        paceInfo=livePaceRate(ev,est,paceNow);
        if(paceInfo)een=paceInfo.projEnd;
        if(isToday&&now>een&&now<=een+90)een=now;}
      else{estatus='todo';est=ev.eventStartMinutes+shift;een=ev.eventEndMinutes+shift;}
      return{id:ev.id,name:(typeof evName==='function'?evName(ev):''),
        plannedStart:ev.eventStartMinutes,plannedEnd:ev.eventEndMinutes,
        projStart:est,projEnd:een,status:estatus,split:split,boards:boards,pace:paceInfo,ev:ev,
        delta:estatus==='done'?(er.en-ev.eventEndMinutes):(est-ev.eventStartMinutes)};
    });

    // A session is over when its LAST event is over. Now that each running event
    // carries its own end, fold the latest of them back up so the session — and
    // everything downstream of it — reflects the board that is actually running late.
    const anyEvActual=(t.events||[]).some(ev=>{
      const er=liveEv(ev.id);
      if(er&&(er.st!=null||er.en!=null))return true;
      return [0,1].some(i=>{const br=liveBoard(ev.id,i);return br&&(br.st!=null||br.en!=null)});
    });
    if(status==='running'&&evs.length&&anyEvActual){
      const latest=Math.max.apply(null,evs.map(e=>e.projEnd));
      // The plan's gap between its last event ending and the session ending is the
      // tail — awards, medals, clearing the deck. Preserve it rather than reporting
      // the session over the moment the last dive lands.
      const plannedLastEv=Math.max.apply(null,(t.events||[]).map(e=>e.eventEndMinutes));
      const tail=Math.max(0,plannedEnd-plannedLastEv);
      const fromEvents=latest+tail;
      if(fromEvents!==projEnd){
        projEnd=fromEvents;
        const lateEv=evs.find(e=>e.projEnd===latest);
        basis='Following '+(lateEv?lateEv.name:'the event running latest');
      }
      // Deferred from above: judge overrun against the real number, not the
      // session-start estimate.
      if(isToday&&now>projEnd){
        if(now>projEnd+90){stale=true;basis='Still marked running since '+f12(rec.st)+' \u2014 was Finish missed?';}
        else projEnd=now;
      }
    }else if(status==='running'&&isToday&&now>projEnd){
      if(now>projEnd+90){stale=true;basis='Still marked running since '+f12(rec.st)+' \u2014 was Finish missed?';}
      else projEnd=now;
    }

    // Parallel blocks don't consume their own slot, so they must not push the cursor.
    // The gap the plan leaves before the next block is SLACK. If a block runs long
    // but still finishes before the next one was due to start, the next one starts
    // on time and the overrun is simply absorbed — re-adding the buffer on top of a
    // late finish invented a delay that nobody on the deck would experience. Only
    // an overrun that eats past the next planned start actually pushes, and then
    // only by the amount that did not fit.
    if(!parallel)cursor=projEnd;
    // The block start and the first dive are different clocks; anything shown next
    // to "First dive" has to be the first dive.
    const projCompStart=projStart+(plannedCompStart-plannedStart);
    out.push({sess,t,status,shift,projStart,projEnd,projCompStart,plannedStart,plannedCompStart,plannedEnd,basis,events:evs,
      rec,parallel,stale});
  });
  return out;
}
// Buffer still unspent between sessions that have not run yet — how much of a
// delay the day could absorb without moving a published start time.
function liveRecoverable(rows){
  return rows.filter(r=>r.status==='todo'||r.status==='next')
             .reduce((a,r)=>a+Number(r.sess.bufferMinutes||0),0);
}

// ══ PACE ══════════════════════════════════════════════════════════════════
// Until now a running event's projected finish was its own start plus its own
// PLANNED length — a number that cannot move until someone taps End. Twenty-five
// divers into a thirty-nine diver round running twenty percent slow, the strip
// still said "on time", then jumped half an hour the moment the round closed.
// The run sheet could only ever report the past.
//
// A pace mark fixes that with one number: how far through the event we are.
// Progress is counted in DIVE SLOTS (round R, diver N of the field = (R-1)*field
// + N) because that is the unit the event's own duration is built from, so the
// arithmetic is the same arithmetic calcEvDur already uses — no second model of
// how long diving takes, and no way for the two to disagree.
//
//   rate  = minutes elapsed ÷ slots done
//   left  = (total slots − slots done) × rate
//
// Stored on the event's live record as p:{d,of,at} — at is the clock time the
// mark was taken, so a stale mark can be aged out rather than quietly steering
// the day. Nothing here writes to the plan; this is still a read-only module.
const PACE_MIN_SLOTS=3;      // below this the rate is noise, not a signal
const PACE_STALE_MIN=45;     // a mark older than this stops driving the projection

// Pace is OFF unless explicitly switched on. It changes the numbers people steer
// the day by, so it does not arrive mid-meet as a surprise.
function livePaceOn(){return !!liveState().pace}
function livePaceToggle(){
  liveWrite(l=>{l.pace=!l.pace},
    liveState().pace?'Live pace on — running events now project from their real rate'
                    :'Live pace off — running events project from their planned length');
}
// Total dive slots in an event: field × dives each. Split boards run half the
// field each concurrently, but a slot is still a slot — the event's own duration
// already accounts for the halving, so slots stay whole-field and the rate
// naturally comes out per-board-pair.
function paceSlots(ev){
  const divers=(typeof entryValue==='function')?Math.max(0,entryValue(ev)):0;
  const dives=Math.max(0,Number(ev.numberOfDives||ev.defaultDives||0));
  return divers*dives;
}
function livePace(evId){return (liveState().e[evId]||{}).p||null}
function liveSetPace(sessId,evId,round,diver){
  const sess=(S.sessions||[]).find(x=>x.id===sessId);
  const ev=sess&&(sess.events||[]).find(e=>e.id===evId);
  if(!ev)return;
  const divers=(typeof entryValue==='function')?Math.max(0,entryValue(ev)):0;
  const dives=Math.max(0,Number(ev.numberOfDives||ev.defaultDives||0));
  const r=Math.max(1,Math.min(dives||1,Math.round(Number(round)||1)));
  const n=Math.max(0,Math.min(divers,Math.round(Number(diver)||0)));
  const done=(r-1)*divers+n;
  const total=paceSlots(ev);
  liveWrite(l=>{
    if(!l.e[evId])l.e[evId]={};
    l.e[evId].p={d:done,of:total,r:r,n:n,at:liveNowMin()};
  },`Round ${r}, diver ${n} of ${divers} — ${done} of ${total} dives done`);
}
function liveClearPace(evId){
  liveWrite(l=>{if(l.e[evId])delete l.e[evId].p;},'Pace mark cleared');
}
// The measured rate for a running event, or null when there isn't enough to say.
// Deliberately conservative: too few slots, a stale mark, a mark taken before the
// event started, or a nonsense rate all return null and the caller falls back to
// the planned length. A projection nobody can check is worse than no projection.
function livePaceRate(ev,startMin,nowMin){
  if(!livePaceOn())return null;
  const p=livePace(ev.id);
  if(!p||startMin==null)return null;
  if(!(p.d>=PACE_MIN_SLOTS)||!(p.of>0)||p.d>p.of)return null;
  if(p.at==null||p.at<startMin)return null;
  if(nowMin!=null&&nowMin-p.at>PACE_STALE_MIN)return null;
  const elapsed=p.at-startMin;
  if(!(elapsed>0))return null;
  const rate=elapsed/p.d;                    // minutes per dive slot
  if(!isFinite(rate)||rate<=0||rate>10)return null;   // 10 min/dive is not diving
  const planned=(typeof calcEvDur==='function')?calcEvDur(ev).evMin:null;
  const plannedRate=(planned&&p.of)?planned/p.of:null;
  return{
    rate,plannedRate,done:p.d,of:p.of,at:p.at,round:p.r,diver:p.n,
    // Projected finish = when the mark was taken + what is left at the measured rate.
    projEnd:Math.round(p.at+(p.of-p.d)*rate),
    // How much slower/faster than plan, in seconds per dive — the unit an
    // announcer or referee can actually act on.
    secPerDive:plannedRate!=null?Math.round((rate-plannedRate)*60):null
  };
}
// ── the strip ────────────────────────────────────────────────────────────
function liveStrip(){
  if(!liveOn())return'';
  const rows=liveProject(UI.dayId);
  if(!rows.length)return`<div class="live-strip"><div class="lv-off">Run sheet is on \u2014 there are no blocks on this day yet.</div>${liveStripTools()}</div>`;
  const now=liveNowMin();
  // Practice never gets recorded, so it must never be offered as the thing to start.
  const comp=rows.filter(r=>!r.sess.isPractice);
  const running=comp.filter(r=>r.status==='running');
  const next=comp.find(r=>r.status==='next')||comp.find(r=>r.status==='todo');
  const done=rows.filter(r=>!r.sess.isPractice&&r.status==='done').length;
  const last=rows[rows.length-1];
  const dayShift=last?Math.round(last.projEnd-last.plannedEnd):0;
  const recov=liveRecoverable(rows);

  const nowCard=running.length?running.map(r=>{
    const n=(typeof getSessNum==='function')?getSessNum(r.sess,allTimed()):'';
    const evRun=r.events.filter(e=>e.status==='running');
    const evNext=r.events.find(e=>e.status==='todo');
    return`<div class="lv-card now">
      <div class="lv-k">Now running</div>
      <div class="lv-v">Session ${n}</div>
      <div class="lv-m">Started ${f12(r.rec.st)} \u00b7 planned ${f12(r.plannedStart)}
        <span class="lv-chip ${liveDeltaCls(r.shift)}">${liveDelta(r.shift)}</span></div>
      ${evRun.length?`<div class="lv-m2">On now: ${evRun.map(e=>esc(e.name)+' <span class="lv-since">since '+f12(e.projStart)+'</span>').join(' \u00b7 ')}</div>`:''}
      ${evNext?`<div class="lv-m2 dim">Then: ${esc(evNext.name)} \u2014 about ${f12(evNext.projStart)}</div>`:''}
      <div class="lv-m2 dim">Expected to finish ${f12(r.projEnd)} (planned ${f12(r.plannedEnd)})</div>
    </div>`}).join(''):
    `<div class="lv-card idle">
      <div class="lv-k">Now running</div>
      <div class="lv-v">${done?'Nothing — '+done+' finished':'Nothing running yet'}</div>
      <div class="lv-m dim">Tap <b>Start</b> on a session when it actually begins.</div>
    </div>`;

  const nextCard=next?(()=>{
    const n=(typeof getSessNum==='function')?getSessNum(next.sess,allTimed()):'';
    const mins=Math.round(next.projStart-now);
    return`<div class="lv-card next">
      <div class="lv-k">Next up</div>
      <div class="lv-v">Session ${n}</div>
      <div class="lv-m">${mins>0?'in '+mins+' min \u00b7 ':''}about ${f12(next.projStart)} \u00b7 planned ${f12(next.plannedStart)}
        <span class="lv-chip ${liveDeltaCls(next.shift)}">${liveDelta(next.shift)}</span></div>
      <button class="lv-go live-ctl" onclick="liveStartSess('${next.sess.id}')">Start it now</button>
    </div>`})():
    `<div class="lv-card next"><div class="lv-k">Next up</div><div class="lv-v">Nothing left today</div></div>`;

  return`<div class="live-strip">
    ${nowCard}${nextCard}
    <div class="lv-card day">
      <div class="lv-k">Day finish</div>
      <div class="lv-v">${last?f12(last.projEnd):'\u2014'}
        <span class="lv-chip ${liveDeltaCls(dayShift)}">${liveDelta(dayShift)}</span></div>
      <div class="lv-m dim">Planned ${last?f12(last.plannedEnd):'\u2014'}</div>
      ${recov?`<div class="lv-m2 dim" title="Total buffer left between the sessions that have not run yet. Spending it would recover this much \u2014 the run sheet never changes your published times on its own.">${recov} min of buffer left to absorb delay</div>`:`<div class="lv-m2 dim">No buffer left to absorb delay</div>`}
    </div>
    ${liveStripTools()}
  </div>`;
}
function liveStripTools(){
  const pending=(typeof liveApproveChanges==='function')?liveApproveChanges(UI.dayId).length:0;
  return`<div class="lv-tools">
    <button class="lv-tool primary live-ctl" onclick="openLiveApprove()" title="Update the published start times on this day to match what actually happened. Shows you every change first.">Approve times${pending?` \u00b7 ${pending}`:''}</button>
    ${typeof openRecovery==='function'?`<button class="lv-tool live-ctl" onclick="openRecovery()" title="What can actually be done about the delay \u2014 the levers, what each buys, and what each costs. Suggestions only.">Recovery options</button>`:''}
    ${typeof livePaceToggle==='function'?`<button class="lv-tool live-ctl${livePaceOn()?' on':''}" onclick="livePaceToggle()" title="${livePaceOn()?'Running events are projecting from the rate they are actually diving at. Tap to go back to planned lengths.':'Project running events from the rate they are actually diving at, instead of their planned length. Needs a \u201cWhere are we?\u201d mark on the event.'}">Live pace ${livePaceOn()?'on':'off'}</button>`:''}
    <button class="lv-tool live-ctl" onclick="liveResetDay()" title="Clear every actual time recorded for this day. The plan is untouched.">Clear day</button>
    ${S.currentLibraryId?`<button class="lv-tool live-ctl" onclick="openShareLive()" title="A read-only link anyone can open on a phone \u2014 coaches, officials, families. Shows the same live times you are looking at, and nothing they could change.">Share live times</button>`:''}
    <button class="lv-tool live-ctl" onclick="liveToggle()" title="Turn the run sheet off and show planned times only">Turn off</button>
  </div>`;
}

// ── per-session controls, injected into the card ──────────────────────────
function liveSessRow(sess,t){
  if(!liveOn())return'';
  // Open training, flighted warm-ups, technical meetings: the run sheet is for
  // recording competition, and cluttering practice blocks with Start/Finish only
  // makes the controls that matter harder to find.
  if(sess.isPractice)return'';
  const rec=liveSess(sess.id)||{};
  const row=liveProject(sess.dayId).find(r=>r.sess.id===sess.id);
  if(!row)return'';
  const openEvs=(sess.events||[]).filter(ev=>{const r=liveEv(ev.id);return !r||r.en==null}).length;
  // One thing to press. Whatever the session needs next IS the button; everything
  // else is a quiet second control or lives behind Edit times. The old row put
  // five choices on the deck at once and made you read them all to find the one.
  let state,btns;
  if(rec.en!=null){
    state=`<span class="lv-badge done"${rec.enM?' title="This finish time was typed in by hand"':''}>Finished ${f12(rec.en)}${rec.enM?' \u00b7 by hand':''}</span>
           <span class="lv-chip ${liveDeltaCls(row.shift)}">${liveDelta(row.shift)}</span>`;
    btns=`<button class="lv-btn live-ctl" onclick="event.stopPropagation();liveOpenAdj('${sess.id}','en')" title="Change the finish time right here">Change finish</button>
      <button class="lv-btn ghost live-ctl" onclick="event.stopPropagation();liveStartNow('${sess.id}')" title="Put this session back on the boards, starting now">Re-open</button>`;
  }else if(rec.st!=null){
    state=`<span class="lv-badge run"${rec.stM?' title="This start time was typed in by hand"':''}>Diving since ${f12(rec.st)}${rec.stM?' \u00b7 by hand':''}</span>
           <span class="lv-chip ${liveDeltaCls(row.shift)}">${liveDelta(row.shift)}</span>
           ${row.stale
             ?`<span class="lv-stale" title="${esc(row.basis)}">Still open \u2014 did this finish?</span>`
             :`<span class="lv-exp">ends about ${f12(row.projEnd)}</span>`}`;
    btns=`<button class="lv-btn primary live-ctl" onclick="event.stopPropagation();liveFinishNow('${sess.id}')" title="Last diver off the boards${openEvs?' \u2014 also closes the '+openEvs+' event'+(openEvs===1?'':'s')+' still running':''}">Finish</button>
      <button class="lv-btn live-ctl" onclick="event.stopPropagation();liveOpenAdj('${sess.id}','st')" title="It went in earlier or later than this \u2014 change it here, without opening anything">Change start</button>`;
  }else{
    state=`<span class="lv-badge todo" title="Block opens ${f12(row.plannedStart)} \u00b7 first dive planned ${f12(row.plannedCompStart)}">First dive ${f12(row.plannedCompStart)}</span>${
      row.shift?`<span class="lv-chip ${liveDeltaCls(row.shift)}" title="${esc(row.basis)}">first dive now ${f12(row.projCompStart!=null?row.projCompStart:row.projStart)} \u00b7 ${liveDelta(row.shift)}</span>`:''}`;
    const n=(sess.events||[]).length;
    btns=`<button class="lv-btn primary live-ctl" onclick="event.stopPropagation();liveStartNow('${sess.id}')" title="First diver on the board${n?' \u2014 starts this session and its '+n+' event'+(n===1?'':'s')+' together, because they go in together':''}">Start</button>`;
  }
  const clear='';
  // Warm-up, introductions, every event separately, and clearing what was
  // recorded \u2014 all real, none of them the thing you are doing right now.
  const edit=`<button class="lv-btn ghost live-ctl" onclick="event.stopPropagation();openLiveTimes('${sess.id}')" title="Warm-up and introductions, each event on its own, and clearing what was recorded">Edit times</button>`;
  // Warm-up and introductions: optional, one tap each, and never in the way of the
  // competition controls above them.
  const phases=LIVE_PHASES.map(ph=>{
    const a=rec[ph.st],b=rec[ph.en],dur=livePhaseDur(rec,ph);
    if(a!=null&&b!=null)
      return`<span class="lv-ph done"><span class="lv-ph-n">${ph.label}</span>
        <button class="lv-ph-t lv-ev-edit live-ctl" onclick="event.stopPropagation();openLiveTimes('${sess.id}')" title="Tap to correct by hand">${f12(a)}\u2013${f12(b)}</button>
        <span class="lv-ph-d">${liveFmtDur(dur)}</span></span>`;
    if(a!=null)
      return`<span class="lv-ph run"><span class="lv-ph-n">${ph.label}</span>
        <button class="lv-ph-t lv-ev-edit live-ctl" onclick="event.stopPropagation();openLiveTimes('${sess.id}')" title="Tap to correct by hand">since ${f12(a)}</button>
        <button class="lv-xbtn end live-ctl" onclick="event.stopPropagation();livePhaseMark('${sess.id}','${ph.en}')">End</button></span>`;
    return`<span class="lv-ph"><span class="lv-ph-n">${ph.label}</span>
      <button class="lv-xbtn live-ctl" onclick="event.stopPropagation();livePhaseMark('${sess.id}','${ph.st}')" title="${esc(ph.label)} is starting now">Start</button></span>`;
  }).join('');
  return`<div class="lv-sess ${rec.en!=null?'is-done':rec.st!=null?'is-run':''}" onclick="event.stopPropagation()">
    <div class="lv-sess-state">${state}</div>
    <div class="lv-sess-btns">${btns}${edit}${clear}</div>
    ${liveAdjStrip(sess,rec)}
    <div class="lv-phases">${phases}</div>
  </div>`;
}

// The strip that opens under a session the moment a time is stamped. It answers
// the only question that follows a late tap \u2014 "yes, but when did it actually
// go in" \u2014 in one more tap, on the row, without leaving the page.
function liveAdjStrip(sess,rec){
  const a=UI.liveAdj;
  if(!a||a.sessId!==sess.id)return'';
  const f=(a.field==='en')?'en':'st';
  const v=rec[f];
  if(v==null)return'';
  const word=(f==='st')?'Started':'Finished';
  const back=n=>`<button class="lv-adj-b live-ctl" onclick="event.stopPropagation();liveNudge('${sess.id}','${f}',${-n})" title="${n} minutes earlier than that">\u2212${n}</button>`;
  return`<div class="lv-adj live-ctl" onclick="event.stopPropagation()">
    <span class="lv-adj-q">${word} <strong>${f12(v)}</strong> \u2014 was it earlier?</span>
    <span class="lv-adj-set">${[5,10,15,20,30,45].map(back).join('')}
      <button class="lv-adj-b plus live-ctl" onclick="event.stopPropagation();liveNudge('${sess.id}','${f}',5)" title="5 minutes later than that">+5</button></span>
    <span class="lv-adj-set">
      <input id="lv-adj-in" class="lv-adj-in" type="time" value="${f24(v)}" title="Or type the time it actually happened"/>
      <button class="lv-adj-b go live-ctl" onclick="event.stopPropagation();liveSetAdjFromField('${sess.id}','${f}')">Set</button>
    </span>
    <button class="lv-adj-ok live-ctl" onclick="event.stopPropagation();liveCloseAdj()" title="Leave it as it is">That\u2019s right</button>
  </div>`;
}

// ── per-event controls, injected into each event row ──────────────────────
function liveEvCtl(sess,ev){
  if(!liveOn()||sess.isPractice)return'';
  const r=liveEv(ev.id)||{};
  // Each event's own projected finish. Events in a session run concurrently and can
  // now diverge, so "when does THIS one get off the boards" is a different question
  // per event — and the one people actually need when deciding what to do next.
  const pr=(liveProject(sess.dayId).find(x=>x.sess.id===sess.id)||{events:[]})
             .events.find(x=>x.id===ev.id);
  // A split event is two boards running at once. They start, end and get corrected
  // independently, because on the deck they genuinely do.
  if(pr&&pr.split&&pr.boards){
    const rows=pr.boards.map(b=>{
      const ed=`onclick="event.stopPropagation();openLiveTimes('${sess.id}','${ev.id}',${b.i})" title="Board ${esc(b.name)} \u2014 tap to type these times in by hand"`;
      let body;
      if(b.en!=null){
        body=`<button class="lv-bd-t lv-ev-edit live-ctl" ${ed}>${f12(b.st!=null?b.st:b.projStart)}\u2013${f12(b.en)}${(b.stM||b.enM)?' \u00b7 by hand':''}</button>
          <span class="lv-chip sm ${liveDeltaCls(b.delta)}">${liveDelta(b.delta)}</span>
          <button class="lv-xbtn live-ctl" onclick="event.stopPropagation();liveStartBoard('${sess.id}','${ev.id}',${b.i})" title="Re-open board ${esc(b.name)} and set its start to now">\u21ba</button>`;
      }else if(b.st!=null){
        body=`<button class="lv-bd-t lv-ev-edit live-ctl" ${ed}>on since ${f12(b.st)}${b.stM?' \u00b7 by hand':''}</button>
          <span class="lv-ev-proj" title="Projected finish for board ${esc(b.name)}, from its own start">\u2192 ${f12(b.projEnd)}</span>
          <button class="lv-xbtn end live-ctl" onclick="event.stopPropagation();liveEndBoard('${sess.id}','${ev.id}',${b.i})" title="Board ${esc(b.name)} is finished">End</button>`;
      }else{
        body=`<span class="lv-ev-proj dim">${f12(b.projStart)} \u2013 ${f12(b.projEnd)}</span>
          <button class="lv-xbtn live-ctl" onclick="event.stopPropagation();liveStartBoard('${sess.id}','${ev.id}',${b.i})" title="Board ${esc(b.name)} is going in now">Start</button>`;
      }
      return`<span class="lv-bd ${b.status}"><span class="lv-bd-n">${esc(b.name)}</span>${body}</span>`;
    }).join('');
    const anyOpen=pr.boards.some(b=>b.st==null);
    return`<span class="lv-ev split live-ctl" onclick="event.stopPropagation()">
      <span class="lv-bds">${rows}</span>
      ${anyOpen?`<button class="lv-xbtn live-ctl" onclick="event.stopPropagation();liveStartBothBoards('${sess.id}','${ev.id}')" title="Both boards went in at the same time">Start both</button>`:''}
    </span>`;
  }

  // Once a time is on the row, that time IS the edit control. Tapping the number
  // you want to change is the thing people try first, so it should work.
  const edit=(title)=>`onclick="event.stopPropagation();openLiveTimes('${sess.id}','${ev.id}')" title="${title}"`;
  if(r.en!=null){
    const d=r.en-ev.eventEndMinutes;
    return`<span class="lv-ev done live-ctl" onclick="event.stopPropagation()">
      <button class="lv-ev-t lv-ev-edit live-ctl" ${edit('Tap to correct these times by hand')}>${f12(r.st!=null?r.st:ev.eventStartMinutes)}\u2013${f12(r.en)}</button>
      <span class="lv-chip sm ${liveDeltaCls(d)}">${liveDelta(d)}</span>
      <button class="lv-xbtn live-ctl" onclick="event.stopPropagation();liveStartEv('${sess.id}','${ev.id}')" title="Re-open this event and set its start to now">\u21ba</button>
    </span>`;
  }
  if(r.st!=null){
    const pace=pr&&pr.pace;
    const slots=paceSlots(ev);
    // The pace control only appears once the event is running and only when the
    // event actually has countable dives — a custom block has nothing to be a
    // fraction of.
    const paceBtn=(livePaceOn()&&slots>0)?`<button class="lv-pace-set live-ctl" onclick="event.stopPropagation();openLivePace('${sess.id}','${ev.id}')" title="Where are we in this event? One tap keeps the finish time honest while the round is still running.">${pace?`R${pace.round} \u00b7 ${pace.done}/${pace.of}`:'Where are we?'}</button>`:'';
    const paceChip=pace?`<span class="lv-pace-chip ${pace.secPerDive>4?'slow':pace.secPerDive<-4?'fast':'ok'}" title="Measured from ${pace.done} dives actually completed, not from the planned length. ${pace.secPerDive>0?pace.secPerDive+' seconds per dive slower than planned':pace.secPerDive<0?Math.abs(pace.secPerDive)+' seconds per dive faster than planned':'running at the planned rate'}.">${pace.secPerDive>0?'+':''}${pace.secPerDive}s/dive</span>`:'';
    return`<span class="lv-ev run live-ctl" onclick="event.stopPropagation()">
      <button class="lv-ev-t lv-ev-edit live-ctl" ${edit('Started at '+f12(r.st)+' \u2014 tap to correct it by hand')}>on since ${f12(r.st)}${r.stM?' \u00b7 by hand':''}</button>
      ${pr?`<span class="lv-ev-proj${pace?' from-pace':''}" title="${pace?'Projected from the rate this event is actually running at':'Projected finish for this event, from its own start time and its own planned length'}">\u2192 ${f12(pr.projEnd)}</span>`:''}
      ${paceChip}${paceBtn}
      <button class="lv-xbtn end live-ctl" onclick="event.stopPropagation();liveEndEv('${ev.id}')" title="Mark this event finished now">End</button>
    </span>`;
  }
  return`<span class="lv-ev todo live-ctl" onclick="event.stopPropagation()">
    ${pr?`<span class="lv-ev-proj dim" title="Expected window for this event once the day's knock-on is applied">${f12(pr.projStart)} \u2013 ${f12(pr.projEnd)}</span>`:''}
    <button class="lv-xbtn live-ctl" onclick="event.stopPropagation();liveStartEv('${sess.id}','${ev.id}')" title="Mark this event as starting now">Start</button>
  </span>`;
}

// ── SESSION PHASES ────────────────────────────────────────────────────────
// A session is three separate things and they fail in different ways: warm-up
// runs long, introductions drag, or the competition itself is slow. Recording one
// "session start" cannot tell them apart. These are stored on the session record
// alongside st/en, which mean COMPETITION start and finish — the first diver on
// the board and the last one off.
//
//   wst / wen   warm-up      (optional — skip it and nothing else is affected)
//   ist / ien   introductions
//   st  / en    competition
const LIVE_PHASES=[
  {key:'w',st:'wst',en:'wen',label:'Warm-up',verb:'Warm-up'},
  {key:'i',st:'ist',en:'ien',label:'Introductions',verb:'Intros'}
];
function livePhaseMark(sessId,field){
  const now=liveNowMin();
  const ph=LIVE_PHASES.find(p=>p.st===field||p.en===field);
  liveWrite(l=>{
    const r=l.s[sessId]||(l.s[sessId]={});
    r[field]=now;r[field+'At']=new Date().toISOString();delete r[field+'M'];
    // Finishing a phase you never started still gives a usable duration if the
    // start gets typed in later; starting it clears a stale finish.
    if(ph&&field===ph.st&&r[ph.en]!=null&&r[ph.en]<now){delete r[ph.en];delete r[ph.en+'At'];}
  },(ph?ph.label:'Time')+' '+(ph&&field===ph.st?'started':'finished')+' at '+f12(now));
}
function livePhaseDur(rec,ph){
  if(!rec)return null;
  const a=rec[ph.st],b=rec[ph.en];
  if(a==null||b==null)return null;
  return Math.max(0,b-a);
}
function liveFmtDur(m){
  if(m==null)return'';
  if(m<60)return m+'m';
  return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m';
}

// ── SPLIT BOARDS ──────────────────────────────────────────────────────────
// A split event is one field run across TWO boards at the same time — that is
// exactly what the plan's timing means by "split" (raw/2 + panel changes). The
// boards are physical positions the deck crew names out loud, and they do not
// necessarily go in together. Recording them separately is the only way to answer
// "which board is behind, and when does each one get off".
//
// Names are per apparatus and settable per meet.
const BOARD_NAMES_DEFAULT={'1-Meter':['A','U'],'3-Meter':['S','D']};
function boardNamesFor(apparatus){
  const custom=(S.meet&&S.meet.boardNames)||{};
  const n=custom[apparatus]||BOARD_NAMES_DEFAULT[apparatus]||['A','B'];
  return [String(n[0]||'A'),String(n[1]||'B')];
}
// Same eligibility as the rest of the app's "split boards" tag.
function evIsSplit(ev){
  return Boolean(ev&&ev.manualSplit)&&!isPlatform(ev.apparatus)&&ev.round!=='Final';
}
function boardKey(evId,i){return evId+'::'+i}
function liveBoard(evId,i){return liveState().b[boardKey(evId,i)]||null}
// The event as a whole: under way once the FIRST board goes in, finished only once
// BOTH are. Deriving it keeps every existing consumer of liveEv() correct without
// having to know boards exist.
function liveSyncEvFromBoards(l,ev){
  const recs=[0,1].map(i=>l.b[boardKey(ev.id,i)]).filter(Boolean);
  const r=l.e[ev.id]||{};
  if(!recs.length){delete l.e[ev.id];return;}
  const sts=recs.map(x=>x.st).filter(v=>v!=null);
  const ens=recs.map(x=>x.en).filter(v=>v!=null);
  if(sts.length)r.st=Math.min.apply(null,sts); else delete r.st;
  if(ens.length===2)r.en=Math.max.apply(null,ens); else delete r.en;   // both boards must be done
  r.stM=recs.some(x=>!!x.stM); r.enM=recs.some(x=>!!x.enM);
  r.fromBoards=true;
  if(r.st==null&&r.en==null)delete l.e[ev.id]; else l.e[ev.id]=r;
}
function liveStartBoard(sessId,evId,i){
  const sess=S.sessions.find(x=>x.id===sessId); if(!sess)return;
  const ev=(sess.events||[]).find(e=>e.id===evId); if(!ev)return;
  const now=liveNowMin();
  liveWrite(l=>{
    const r=l.b[boardKey(ev.id,i)]||(l.b[boardKey(ev.id,i)]={});
    r.st=now;r.stAt=new Date().toISOString();
    delete r.en;delete r.enAt;delete r.stM;delete r.enM;
    liveSyncEvFromBoards(l,ev);
    const sr=l.s[sessId]||(l.s[sessId]={});
    if(sr.st==null){sr.st=now;sr.stAt=new Date().toISOString();}
  },'Board '+boardNamesFor(ev.apparatus)[i]+' started at '+f12(now));
}
function liveEndBoard(sessId,evId,i){
  const sess=S.sessions.find(x=>x.id===sessId); if(!sess)return;
  const ev=(sess.events||[]).find(e=>e.id===evId); if(!ev)return;
  const now=liveNowMin();
  liveWrite(l=>{
    const r=l.b[boardKey(ev.id,i)]||(l.b[boardKey(ev.id,i)]={});
    if(r.st==null){r.st=now;r.stAt=new Date().toISOString();}
    r.en=now;r.enAt=new Date().toISOString();
    liveSyncEvFromBoards(l,ev);
  },'Board '+boardNamesFor(ev.apparatus)[i]+' finished at '+f12(now));
}
function liveStartBothBoards(sessId,evId){
  const sess=S.sessions.find(x=>x.id===sessId); if(!sess)return;
  const ev=(sess.events||[]).find(e=>e.id===evId); if(!ev)return;
  const now=liveNowMin(); const nm=boardNamesFor(ev.apparatus);
  liveWrite(l=>{
    [0,1].forEach(i=>{
      const r=l.b[boardKey(ev.id,i)]||(l.b[boardKey(ev.id,i)]={});
      if(r.st==null){r.st=now;r.stAt=new Date().toISOString();}
    });
    liveSyncEvFromBoards(l,ev);
    const sr=l.s[sessId]||(l.s[sessId]={});
    if(sr.st==null){sr.st=now;sr.stAt=new Date().toISOString();}
  },'Boards '+nm[0]+' and '+nm[1]+' started at '+f12(now));
}

// ── typing a time in by hand ──────────────────────────────────────────────
// Tapping Start/Finish the moment something happens is the fast path, but it is
// not always possible — you are on the deck, the session went in while you were
// dealing with something else, and you only get back to the tablet twenty minutes
// later. Stamping "now" at that point would record a time that never happened.
// So every actual can also be typed in directly.
//
// Hand-entered values are flagged (stM / enM) so the sheet can say so out loud.
// The tap timestamp (stAt / enAt) still records WHEN the entry was made, which
// remains true either way and keeps the audit trail honest.
//
// Same hard rule as the rest of this module: this never touches the plan.
function openLiveTimes(sessId,evId,boardI){
  UI.liveTimesSessId=sessId;
  UI.liveTimesFocusEvId=evId||null;   // jump straight to the event you tapped
  UI.liveTimesFocusBoard=(boardI===0||boardI===1)?boardI:null;
  UI.liveTimesErr='';
  UI.modal='live-times';
  render();
}
function closeLiveTimes(){
  UI.liveTimesSessId=null;UI.liveTimesFocusEvId=null;UI.liveTimesFocusBoard=null;UI.liveTimesErr='';UI.modal=null;render();
}
// '' / null -> not recorded. Anything else -> minutes from midnight.
// A time box that is still showing its greyed planned time has not been filled
// in — it is a starting point, not a reading. It reads as empty so that opening
// this screen and pressing Save can never invent times that nobody observed.
// A box used to show the PLANNED time in grey when nothing was recorded, on the
// theory that adjusting beats retyping. In practice you could not tell, at a
// glance, which boxes were readings and which were suggestions \u2014 the single
// most confusing thing on this screen. Now a box is either empty or it holds a
// time somebody stands behind, it says which out loud, and the planned time is
// one labelled tap away.
function ltFldTouch(el){
  if(!el)return;
  const w=el.closest?el.closest('.lt-fld'):null;
  if(w)w.classList.toggle('is-set',!!(el.value||'').trim());
}
function ltFldUse(id,v){const el=document.getElementById(id);if(!el)return;el.value=v;ltFldTouch(el);}
function ltFldClear(id){const el=document.getElementById(id);if(!el)return;el.value='';ltFldTouch(el);}
function liveSugInput(id,val,plan){
  const set=val!=null;
  return`<div class="lt-fld${set?' is-set':''}">
    <input id="${id}" class="fi lt-in" type="time" value="${set?f24(val):''}" oninput="ltFldTouch(this)"/>
    <div class="lt-fmeta">
      <span class="lt-tag yes">Recorded</span>
      <span class="lt-tag no">Not recorded</span>
      <button type="button" class="lt-x" onclick="ltFldClear('${id}')" title="Un-record this time">Clear</button>
      ${plan==null?'':`<button type="button" class="lt-use" onclick="ltFldUse('${id}','${f24(plan)}')" title="Fill this box with the planned time, then adjust it">Use planned ${f12(plan)}</button>`}
    </div>
  </div>`;
}
function liveParseField(id){
  const el=document.getElementById(id);
  if(!el)return undefined;                 // field absent — leave untouched
  const v=(el.value||'').trim();
  if(!v)return null;                       // empty means not recorded
  const m=pt(v);
  return (isNaN(m)||m<0||m>1439)?undefined:m;
}
function liveSaveTimes(){
  const sessId=UI.liveTimesSessId;
  const sess=S.sessions.find(x=>x.id===sessId);
  if(!sess){closeLiveTimes();return;}
  const sSt=liveParseField('lt-s-st'),sEn=liveParseField('lt-s-en');
  // A finish before its own start is the one thing that is simply not a real
  // reading, so it is refused by name rather than quietly "corrected".
  if(sSt!=null&&sEn!=null&&sEn<sSt){
    UI.liveTimesErr='The session finish ('+f12(sEn)+') is before its start ('+f12(sSt)+'). Check both times.';
    render();return;
  }
  const phVals=[];
  for(const ph of LIVE_PHASES){
    const a=liveParseField('lt-p-'+ph.st),b=liveParseField('lt-p-'+ph.en);
    if(a!=null&&b!=null&&b<a){
      UI.liveTimesErr=ph.label+' finishes ('+f12(b)+') before it starts ('+f12(a)+'). Check both times.';
      render();return;
    }
    phVals.push({ph,st:a,en:b});
  }
  const evVals=[],bdVals=[];
  for(const ev of (sess.events||[])){
    if(evIsSplit(ev)){
      const nm=boardNamesFor(ev.apparatus);
      for(const i of [0,1]){
        const a=liveParseField('lt-b-st-'+ev.id+'-'+i),b=liveParseField('lt-b-en-'+ev.id+'-'+i);
        if(a!=null&&b!=null&&b<a){
          UI.liveTimesErr=evName(ev)+' board '+nm[i]+' finishes ('+f12(b)+') before it starts ('+f12(a)+'). Check both times.';
          render();return;
        }
        bdVals.push({ev,i,st:a,en:b});
      }
      continue;
    }
    const a=liveParseField('lt-e-st-'+ev.id),b=liveParseField('lt-e-en-'+ev.id);
    if(a!=null&&b!=null&&b<a){
      UI.liveTimesErr=evName(ev)+' finishes ('+f12(b)+') before it starts ('+f12(a)+'). Check both times.';
      render();return;
    }
    evVals.push({ev,st:a,en:b});
  }
  const stamp=new Date().toISOString();
  let n=0;
  const apply=(rec,key,val)=>{
    if(val===undefined)return;                       // field wasn't on screen
    const had=rec[key];
    if(val===null){                                   // cleared
      if(had!=null){delete rec[key];delete rec[key+'At'];delete rec[key+'M'];n++;}
      return;
    }
    if(had===val)return;                              // unchanged
    rec[key]=val;rec[key+'At']=stamp;rec[key+'M']=true;n++;
  };
  liveWrite(l=>{
    const sr=l.s[sessId]||(l.s[sessId]={});
    apply(sr,'st',sSt);apply(sr,'en',sEn);
    phVals.forEach(({ph,st,en})=>{apply(sr,ph.st,st);apply(sr,ph.en,en);});
    if(sr.st==null&&sr.en==null&&LIVE_PHASES.every(p=>sr[p.st]==null&&sr[p.en]==null))delete l.s[sessId];
    evVals.forEach(({ev,st,en})=>{
      const er=l.e[ev.id]||(l.e[ev.id]={});
      apply(er,'st',st);apply(er,'en',en);
      if(er.st==null&&er.en==null)delete l.e[ev.id];
    });
    const touched=new Set();
    bdVals.forEach(({ev,i,st,en})=>{
      const br=l.b[boardKey(ev.id,i)]||(l.b[boardKey(ev.id,i)]={});
      apply(br,'st',st);apply(br,'en',en);
      if(br.st==null&&br.en==null)delete l.b[boardKey(ev.id,i)];
      touched.add(ev);
    });
    // The event's own record is only ever a summary of its boards.
    touched.forEach(ev=>liveSyncEvFromBoards(l,ev));
  },n?(n+' time'+(n===1?'':'s')+' saved'):'No times changed');
  UI.liveTimesSessId=null;UI.liveTimesFocusEvId=null;UI.liveTimesFocusBoard=null;UI.liveTimesErr='';UI.modal=null;render();
}
function renderLiveTimesModal(){
  const sess=S.sessions.find(x=>x.id===UI.liveTimesSessId);
  if(!sess)return`<div class="modal" onclick="event.stopPropagation()"><div class="modal-hd"><span class="modal-title">Edit recorded times</span><button class="modal-close" aria-label="Close" onclick="closeLiveTimes()">&times;</button></div><div class="modal-body">That session is no longer in the schedule.</div></div>`;
  const t=(typeof timedForDay==='function'?timedForDay(sess.dayId):[]).find(x=>x.id===sess.id);
  const rec=liveSess(sess.id)||{};
  const label=(typeof sessLabelOf==='function')?sessLabelOf(sess):(sess.title||'Session');
  const hand=v=>v?`<span class="lt-hand" title="This time was typed in by hand, not stamped when it happened">by hand</span>`:'';
  // Warm-up has its own planned block; the introductions are the gap between
  // warm-up ending and the first dive, which is where the walk-outs run.
  const plannedPhase=k=>{
    if(!t)return[null,null];
    const T=t.timing;
    if(k==='w')return[T.warmupStartMinutes,T.warmupEndMinutes];
    if(k==='i')return[T.warmupEndMinutes,T.eventStartMinutes];
    return[null,null];
  };
  const evRows=(sess.events||[]).map(ev=>{
    const r=liveEv(ev.id)||{};
    const pl=(t&&(t.timing.events||[]).find(x=>x.id===ev.id))||null;
    const planned=pl?`<span class="lt-planned">planned ${f12(pl.eventStartMinutes)} \u2013 ${f12(pl.eventEndMinutes)}</span>`:'';
    // Split: two named boards, each with its own pair. There is deliberately NO
    // event-level pair to edit here — the event's times ARE its boards (first in,
    // last out), and offering both would let you contradict yourself.
    if(evIsSplit(ev)){
      const nm=boardNamesFor(ev.apparatus);
      const bd=[0,1].map(i=>{
        const br=liveBoard(ev.id,i)||{};
        const foc=(UI.liveTimesFocusEvId===ev.id&&UI.liveTimesFocusBoard===i)?' is-focus':'';
        return`<div class="lt-board${foc}">
          <div class="lt-bname">Board ${esc(nm[i])}${hand(br.stM||br.enM)}</div>
          <div class="lt-grid">
            <div class="fg"><label class="fl">Started</label>${liveSugInput('lt-b-st-'+ev.id+'-'+i,br.st,pl?pl.eventStartMinutes:null)}</div>
            <div class="fg"><label class="fl">Finished</label>${liveSugInput('lt-b-en-'+ev.id+'-'+i,br.en,pl?pl.eventEndMinutes:null)}</div>
          </div>
        </div>`;
      }).join('');
      return`<div class="lt-row${UI.liveTimesFocusEvId===ev.id?' is-focus':''}">
        <div class="lt-name">${esc(evName(ev))}<span class="lt-splittag">split \u00b7 2 boards</span>${planned}</div>
        ${bd}
      </div>`;
    }
    return`<div class="lt-row${UI.liveTimesFocusEvId===ev.id?' is-focus':''}">
      <div class="lt-name">${esc(evName(ev))}${hand(r.stM||r.enM)}${planned}</div>
      <div class="lt-grid">
        <div class="fg"><label class="fl">Started</label>${liveSugInput('lt-e-st-'+ev.id,r.st,pl?pl.eventStartMinutes:null)}</div>
        <div class="fg"><label class="fl">Finished</label>${liveSugInput('lt-e-en-'+ev.id,r.en,pl?pl.eventEndMinutes:null)}</div>
      </div>
    </div>`;
  }).join('');
  return`<div class="modal" onclick="event.stopPropagation()">
    <div class="modal-hd">
      <div><span class="modal-title">Edit recorded times</span>
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">${esc(label)}</div></div>
      <button class="modal-close" aria-label="Close" onclick="closeLiveTimes()">&times;</button>
    </div>
    <div class="modal-body">
      <p class="lt-help">What actually happened, for anything you could not tap at the moment it did. An <b>empty box is not recorded</b>; a box with a time in it is. <b>Use planned</b> fills a box with the scheduled time so you can adjust rather than retype, and <b>Clear</b> empties it again. <b>Nothing here changes the published schedule.</b></p>
      ${UI.liveTimesErr?`<div class="lt-err">${esc(UI.liveTimesErr)}</div>`:''}
      ${LIVE_PHASES.map(ph=>`<div class="lt-row">
        <div class="lt-name">${ph.label}<span class="lt-optional">optional</span>
          ${livePhaseDur(rec,ph)!=null?`<span class="lt-planned">took ${liveFmtDur(livePhaseDur(rec,ph))}</span>`:''}</div>
        <div class="lt-grid">
          <div class="fg"><label class="fl">Started</label>${liveSugInput('lt-p-'+ph.st,rec[ph.st],plannedPhase(ph.key)[0])}</div>
          <div class="fg"><label class="fl">Finished</label>${liveSugInput('lt-p-'+ph.en,rec[ph.en],plannedPhase(ph.key)[1])}</div>
        </div>
      </div>`).join('')}
      <div class="lt-row">
        <div class="lt-name">Competition \u2014 first dive to last${hand(rec.stM||rec.enM)}
          ${t?`<span class="lt-planned">planned ${f12(t.timing.eventStartMinutes!=null?t.timing.eventStartMinutes:t.timing.warmupStartMinutes)} \u2013 ${f12(t.timing.sessionEndMinutes)}</span>`:''}</div>
        <div class="lt-grid">
          <div class="fg"><label class="fl">Started</label>${liveSugInput('lt-s-st',rec.st,t?(t.timing.eventStartMinutes!=null?t.timing.eventStartMinutes:t.timing.warmupStartMinutes):null)}</div>
          <div class="fg"><label class="fl">Finished</label>${liveSugInput('lt-s-en',rec.en,t?t.timing.sessionEndMinutes:null)}</div>
        </div>
      </div>
      ${evRows?`<div class="lt-head">Events in this session</div>${evRows}`:''}
    </div>
    <div class="modal-foot">
      <button class="btn btn-sm btn-gh" onclick="closeLiveTimes()">Cancel</button>
      ${(rec.st!=null||rec.en!=null||LIVE_PHASES.some(p=>rec[p.st]!=null||rec[p.en]!=null))
        ?`<button class="btn btn-sm btn-gh" style="color:var(--red)" onclick="closeLiveTimes();liveClearSess('${sess.id}')" title="Remove every recorded time for this session. The plan is not affected.">Clear this session</button>`:''}
      <div style="flex:1"></div>
      <button class="btn btn-p" onclick="liveSaveTimes()">Save times</button>
    </div>
  </div>`;
}

// ── APPROVING REALITY INTO THE PLAN ───────────────────────────────────────
// Everything above this point is deliberately read-only with respect to the plan.
// This is the one, explicit, user-driven exception: when the day has genuinely
// moved and you want the PUBLISHED schedule to say so, you approve it.
//
// Rules it holds to:
//   • It only ever moves START times. Durations, entries, dive counts, buffers and
//     every other authored value are left exactly as they are — a session running
//     long is expressed by moving what comes after it, not by rewriting the event.
//   • Nothing happens without a preview showing every block that would move.
//   • It goes through upd(), so Cmd+Z undoes it, and it snapshots a named version
//     first so the pre-approval schedule is always recoverable.
//   • A locked day is refused up front. upd() would silently roll the change back,
//     which would look like the button did nothing.
function liveApproveChanges(dayId){
  // Approval is driven by what was RECORDED, never by the clock. With nothing logged
  // on this day there is nothing to approve, however late it is.
  const anyActual=(S.sessions||[]).filter(x=>x.dayId===dayId).some(sess=>{
    const sr=liveSess(sess.id);
    if(sr&&(sr.st!=null||sr.en!=null))return true;
    return (sess.events||[]).some(ev=>{
      const er=liveEv(ev.id);
      if(er&&(er.st!=null||er.en!=null))return true;
      return [0,1].some(i=>{const br=liveBoard(ev.id,i);return br&&(br.st!=null||br.en!=null)});
    });
  });
  if(!anyActual)return[];
  const rows=liveProject(dayId,{ignoreClock:true});
  const out=[];
  // Carry the running delta down the day rather than applying the projection's
  // absolute start. The projection rounds to the block's own rounding step, so an
  // 18-minute delay came out as a 20-minute move on the next block — and approving
  // again then proposed another 2, so the button never settled. Propagating the
  // delta is exact, converges (once approved the shift is zero), and is how anyone
  // would say it out loud: "we're running eighteen minutes late".
  let carry=0;
  rows.forEach(r=>{
    const sess=r.sess;
    if(isParallel(sess))return;                 // handled below, from its anchor
    const rec=liveSess(sess.id)||{};
    const hasEvidence=(rec.st!=null||rec.en!=null)||(sess.events||[]).some(ev=>{
      const er=liveEv(ev.id);
      if(er&&(er.st!=null||er.en!=null))return true;
      return [0,1].some(i=>{const br=liveBoard(ev.id,i);return br&&(br.st!=null||br.en!=null)});
    });
    const from=Math.round(r.plannedStart);
    let to,why;
    if(hasEvidence){
      // An actual start is exact. Otherwise lean on the projection's shift, which
      // also accounts for a block that started on time but ran long.
      // rec.st is the COMPETITION start; the field being published is the top of
      // the block. Shift the block by however much the competition moved, rather
      // than slamming the block start onto the first-dive time.
      //
      // The first dive is ROUNDED (ru(warmupEnd+intro, rounding)) while the block
      // start is exact, so most first-dive times are not representable: recording
      // 3:13 on a 5-minute session leaves a permanent -2 that approval chased
      // forever, moving the block two minutes each  pass without ever changing the
      // published first dive. Only propose a move that actually changes it.
      const compOf=(blockStart)=>{
        const round=Number(sess.rounding)||1;
        const wuEnd=blockStart+Number(sess.warmupMinutes||0);
        return ru(wuEnd+Number(sess.introMinutes||0),round);
      };
      const pcs=(r.plannedCompStart!=null?r.plannedCompStart:r.plannedStart);
      let cand=Math.round(rec.st!=null?(r.plannedStart+(rec.st-pcs)):(r.plannedStart+r.shift));
      if(rec.st!=null&&compOf(cand)===compOf(r.plannedStart))return;   // nothing would move
      to=cand;
      why=rec.st!=null?'first dive actual':'ran long';
      carry=Math.round(r.shift);
    }else{
      if(!carry)return;
      to=from+carry;
      why='knock-on from earlier blocks';
    }
    if(to===from)return;
    out.push({sess,from,to,delta:to-from,why});
  });
  // Approval must leave the day internally consistent with itself.
  //
  // A block's published DURATION is authored and is never rewritten here, but the
  // blocks after it move by the recorded END delta. When a session starts late and
  // then makes time up, its end delta is SMALLER than its start delta: the block
  // itself slides forward by the larger number while everything after it slides by
  // the smaller one, so the next block lands slightly before this one's published
  // end. That is where the 3-minute overlap right after approving comes from — the
  // day approves itself into a collision, then offers a "Fix" for it.
  //
  // Settle the proposal push-only before it is ever previewed, so the preview and
  // the result are the same thing and no fix is needed afterwards.
  {
    const byId={};out.forEach(c=>{byId[c.sess.id]=c});
    const stack=(typeof timedForDay==='function'?timedForDay(dayId):[]).slice()
      .filter(s=>!((typeof isParallel==='function')&&isParallel(s)))
      .sort((a,b)=>a.timing.warmupStartMinutes-b.timing.warmupStartMinutes);
    let prevEnd=null,prevBuf=0;
    stack.forEach(sess=>{
      const t=sess.timing;
      const dur=Math.max(0,t.sessionEndMinutes-t.warmupStartMinutes);
      const from=Math.round(t.warmupStartMinutes);
      let start=byId[sess.id]?byId[sess.id].to:from;
      if(prevEnd!=null&&start<prevEnd+prevBuf){
        start=prevEnd+prevBuf;
        if(byId[sess.id]){byId[sess.id].to=start;byId[sess.id].delta=start-byId[sess.id].from;}
        else{const c={sess,from,to:start,delta:start-from,why:'kept clear of the block before it'};out.push(c);byId[sess.id]=c;}
      }
      prevEnd=start+dur;prevBuf=Number(sess.bufferMinutes||0);
    });
    // Clamping can land a block back on the time it already had — that is not a change.
    for(let i=out.length-1;i>=0;i--)if(out[i].to===out[i].from)out.splice(i,1);
  }
  // Blocks pinned alongside another travel with it, keeping their offset.
  (S.sessions||[]).filter(x=>x.dayId===dayId&&isParallel(x)).forEach(p=>{
    const anchor=parallelAnchorOf(S,p);
    if(!anchor)return;                           // floats at a fixed clock time on purpose
    const moved=out.find(c=>c.sess.id===anchor.id);
    if(!moved)return;
    const from=Math.round(Number(p.warmupStartMinutes)||0);
    const to=Math.round(moved.to+(Number(p.parallelOffset)||0));
    if(to===from)return;
    out.push({sess:p,from,to,delta:to-from,why:'runs alongside '+(typeof sessLabelOf==='function'?sessLabelOf(anchor):'another block')});
  });
  return out.sort((a,b)=>a.from-b.from);
}
function openLiveApprove(){
  UI.modal='live-approve';UI.liveApproveDay=UI.dayId;render();
}
function closeLiveApprove(){UI.liveApproveDay=null;UI.modal=null;render();}
function liveApplyApprove(){
  const dayId=UI.liveApproveDay||UI.dayId;
  if(dayLocked(dayId)){lockRefused();return;}
  const changes=liveApproveChanges(dayId);
  if(!changes.length){toast('Nothing to approve — the schedule already matches');closeLiveApprove();return;}
  // Capture the pre-approval schedule SYNCHRONOUSLY, then apply, then push the
  // snapshot in the background. The change must not be gated on a network round
  // trip: on a bad connection at the pool that would either hang or quietly not
  // happen, and Cmd+Z plus localStorage already make it recoverable without the
  // cloud. If the snapshot genuinely fails we say so rather than let the preview's
  // promise of version history stand.
  const before=JSON.stringify(S);
  const map={};changes.forEach(c=>{map[c.sess.id]=c.to});
  upd(s=>{
    (s.sessions||[]).forEach(sess=>{
      if(map[sess.id]!=null)sess.warmupStartMinutes=map[sess.id];
    });
  });
  const n=changes.length;
  toast(n+' block'+(n===1?'':'s')+' updated to match the run sheet \u00b7 Cmd+Z to undo',6000);
  closeLiveApprove();
  if(typeof saveVersionData==='function'&&S.currentLibraryId){
    saveVersionData('Before approving run sheet times',before)
      .catch(()=>toast('Applied \u2014 but the pre-approval snapshot could not reach the cloud. Cmd+Z still undoes it.',8000));
  }
}
function renderLiveApproveModal(){
  const dayId=UI.liveApproveDay||UI.dayId;
  const day=(S.meet.days||[]).find(d=>d.id===dayId);
  const locked=dayLocked(dayId);
  const changes=locked?[]:liveApproveChanges(dayId);
  const body=locked
    ? `<div class="lt-err">This day is locked, so the published times cannot be changed. Unlock the day first, then approve.</div>`
    : (!changes.length
      ? `<div class="lt-help">Nothing to approve — every block on this day already starts when the run sheet says it did.</div>`
      : `<p class="lt-help">These are the published start times, updated to match what actually happened. Only start times change — durations, entries and dive counts are untouched. <b>Cmd+Z undoes this, and the schedule as it stands is copied to Version history.</b></p>
         <div class="ap-list">
           ${changes.map(c=>`<div class="ap-row">
             <div class="ap-name">${esc(typeof sessLabelOf==='function'?sessLabelOf(c.sess):(c.sess.title||'Block'))}
               <span class="ap-why">${esc(c.why)}</span></div>
             <div class="ap-times"><span class="ap-from">${f12(c.from)}</span>
               <span class="ap-arrow">\u2192</span>
               <span class="ap-to">${f12(c.to)}</span>
               <span class="lv-chip ${liveDeltaCls(c.delta)}">${liveDelta(c.delta)}</span></div>
           </div>`).join('')}
         </div>`);
  return`<div class="modal" onclick="event.stopPropagation()">
    <div class="modal-hd">
      <div><span class="modal-title">Approve run sheet times</span>
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">${esc(day?fullDate(day.date):'')}</div></div>
      <button class="modal-close" aria-label="Close" onclick="closeLiveApprove()">&times;</button>
    </div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot">
      <button class="btn btn-sm btn-gh" onclick="closeLiveApprove()">Cancel</button>
      <div style="flex:1"></div>
      ${(!locked&&changes.length)?`<button class="btn btn-p" onclick="liveApplyApprove()">Update ${changes.length} block${changes.length===1?'':'s'}</button>`:''}
    </div>
  </div>`;
}

// ── keep the clock honest ─────────────────────────────────────────────────
// Re-render on a timer so "in 8 min" and the running-elapsed figures stay true,
// but never while someone is typing or has a dialog open — a surprise re-render
// mid-keystroke is exactly the bug this app has been bitten by before.
let _runSheetTimer=null,_runSheetDay=null;
function liveTick(force){
  if(!liveOn())return;
  const a=document.activeElement;
  if(!force&&a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return;
  if(!force&&(UI.modal||UI.dialog||UI.palette||UI.editSessId))return;
  render();
}
function liveBoot(){
  clearInterval(_runSheetTimer);
  _runSheetTimer=setInterval(()=>{
    // Rolled past midnight at a late finals session — drop stale stamps rather
    // than reporting yesterday's actuals against today.
    const d=liveToday();
    if(_runSheetDay&&d!==_runSheetDay&&liveOn())toast('The date has changed \u2014 recorded times still belong to '+_runSheetDay,6000);
    _runSheetDay=d;
    liveTick(false);
  },30000);
  _runSheetDay=liveToday();
  // sb-app.js boots and paints before this file has loaded, so its first render sees no
  // live hooks and draws no strip. Repaint once, here, or the run sheet would appear to
  // be off after every refresh until the user happened to tap something.
  if(liveOn()&&typeof render==='function')render();
}
if(typeof window!=='undefined'){
  if(document.readyState==='complete'||document.readyState==='interactive')liveBoot();
  else window.addEventListener('DOMContentLoaded',liveBoot);
}

// ── "Where are we?" — the one-tap pace mark ────────────────────────────────
// Two numbers, both of which the referee's table already has on a board in front
// of them: which round, and which diver in the order. Everything else is derived.
function openLivePace(sessId,evId){
  UI.modal='live-pace';UI.paceSess=sessId;UI.paceEv=evId;render();
}
function closeLivePace(){UI.modal=null;UI.paceSess=null;UI.paceEv=null;render();}
function submitLivePace(){
  const r=document.getElementById('lp-round'),n=document.getElementById('lp-diver');
  if(!r||!n)return;
  liveSetPace(UI.paceSess,UI.paceEv,r.value,n.value);
  closeLivePace();
}
function renderLivePaceModal(){
  const sess=(S.sessions||[]).find(x=>x.id===UI.paceSess);
  const ev=sess&&(sess.events||[]).find(e=>e.id===UI.paceEv);
  if(!ev)return'';
  const divers=(typeof entryValue==='function')?Math.max(0,entryValue(ev)):0;
  const dives=Math.max(0,Number(ev.numberOfDives||ev.defaultDives||0));
  const p=livePace(ev.id)||{};
  const row=liveProject(sess.dayId).find(x=>x.sess.id===sess.id);
  const pr=row&&row.events.find(x=>x.id===ev.id);
  const pace=pr&&pr.pace;
  const plannedEnd=pr?pr.plannedEnd:null;
  return`<div class="modal" onclick="event.stopPropagation()">
    <div class="modal-head"><div><span class="modal-title">Where are we in ${esc(evName(ev))}?</span>
      <div class="modal-sub">${divers} divers \u00b7 ${dives} dives each. Tell it the round and the diver, and it works out the real finish time from the rate this event is actually running at.</div></div>
      <button class="modal-close" aria-label="Close" onclick="closeLivePace()">&times;</button></div>
    <div class="modal-body">
      <div class="lp-grid">
        <label class="lp-f"><span>Round now diving</span>
          <input id="lp-round" type="number" inputmode="numeric" min="1" max="${dives||1}" value="${p.r||1}"/>
          <em>of ${dives}</em></label>
        <label class="lp-f"><span>Diver in the order</span>
          <input id="lp-diver" type="number" inputmode="numeric" min="0" max="${divers}" value="${p.n||0}"/>
          <em>of ${divers}</em></label>
      </div>
      ${pace?`<div class="lp-now">
        <div><b>Right now:</b> ${pace.done} of ${pace.of} dives done, measured over ${Math.max(0,Math.round(pace.at-(pr.projStart||pace.at)))} min.</div>
        <div>Running <b>${pace.secPerDive>0?pace.secPerDive+'s per dive slower':pace.secPerDive<0?Math.abs(pace.secPerDive)+'s per dive faster':'exactly at the planned rate'}</b> than planned \u2014 finishing about <b>${f12(pace.projEnd)}</b>${plannedEnd!=null?` instead of ${f12(plannedEnd)}`:''}.</div>
      </div>`:`<div class="lt-help">Nothing recorded yet for this event. The first mark needs at least ${PACE_MIN_SLOTS} dives completed before it will move the projection \u2014 below that the rate is noise.</div>`}
      <div class="lt-help" style="margin-top:10px">This never changes your published schedule. It only changes what the run sheet expects, and it stops driving the projection after ${PACE_STALE_MIN} minutes so an old mark can't quietly steer the day.</div>
    </div>
    <div class="modal-foot">
      ${livePace(ev.id)?`<button class="btn btn-sm btn-gh" onclick="liveClearPace('${ev.id}');closeLivePace()">Clear mark</button>`:''}
      <span style="flex:1"></span>
      <button class="btn btn-sm btn-gh" onclick="closeLivePace()">Cancel</button>
      <button class="btn btn-p" onclick="submitLivePace()">Save</button>
    </div>
  </div>`;
}

// ── The public read-only link ─────────────────────────────────────────────
// live-view.html reads the saved schedule and the run sheet and renders the same
// projection this module produces. It has no write path, so handing the link out
// cannot cost you anything except the schedule becoming visible — which at a
// public meet it already is. It shows no athlete names for the same reason the
// printed heat sheet is handed out at the desk rather than posted online.
function liveShareUrl(){
  if(!S.currentLibraryId)return null;
  return location.href.replace(/\/[^\/]*(\?.*)?$/,'/')+'live-view.html?v=202607312130&s='+encodeURIComponent(S.currentLibraryId);
}
function openShareLive(){
  const url=liveShareUrl();
  if(!url){toast('Save this schedule to the library first \u2014 the link points at the saved copy');return;}
  askConfirm({
    title:'Share live times',
    message:'Anyone with this link sees the same live start times you do, updating on its own every minute. '+
            'They cannot change anything, and no athlete names are shown.\n\n'+url,
    confirmText:'Copy link',
    onConfirm:()=>{
      const done=()=>toast('Link copied \u2014 paste it wherever coaches and families will see it',6000);
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done).catch(()=>window.prompt('Copy this link:',url));
      else window.prompt('Copy this link:',url);
    }
  });
}
