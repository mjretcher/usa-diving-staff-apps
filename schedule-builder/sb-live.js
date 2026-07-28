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
       s: { <sessionId>: {st, en, stAt, enAt} },
       e: { <eventId>:   {st, en, stAt, enAt} }
     }
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
  if(!S.live||typeof S.live!=='object')S.live={on:false,s:{},e:{}};
  if(!S.live.s)S.live.s={};
  if(!S.live.e)S.live.e={};
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
  if(S.currentLibraryId&&typeof scheduleSave==='function')scheduleSave();
  render();
  if(msg)toast(msg,2600);
}
function liveToggle(){
  liveState();
  const turningOn=!S.live.on;
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
      (sess?sess.events:[]).forEach(ev=>{delete l.e[ev.id]});
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
      sessions.forEach(s=>{delete l.s[s.id];(s.events||[]).forEach(ev=>{delete l.e[ev.id]})});
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
function liveProject(dayId){
  const now=liveNowMin();
  const isToday=liveIsToday(dayId);
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
      projStart=rec.st!=null?rec.st:plannedStart;
      projEnd=rec.en;
      shift=rec.en-plannedEnd;
      basis='Finished at '+f12(rec.en)+' (planned '+f12(plannedEnd)+')';
    }else if(rec.st!=null){
      status='running';
      projStart=rec.st;
      if(anchor){shift=anchor.at-anchor.planned;basis='Shifted from the last event that finished';}
      else{shift=rec.st-plannedStart;basis='Shifted from this session\u2019s actual start';}
      projEnd=plannedEnd+shift;
      // A session still running is at least as long as the clock says — but only
      // trust that on the live day.
      if(isToday&&now>projEnd){
        // Overrun well past a plausible finish almost always means nobody tapped
        // Finish. Say so instead of quietly reporting the whole day hours late.
        if(now>projEnd+90){stale=true;basis='Still marked running since '+f12(rec.st)+' \u2014 was Finish missed?';}
        else projEnd=now;
      }
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
      let est,een,estatus;
      if(er.en!=null){estatus='done';est=er.st!=null?er.st:ev.eventStartMinutes+shift;een=er.en;}
      else if(er.st!=null){estatus='running';est=er.st;
        een=ev.eventEndMinutes+shift;if(isToday&&now>een&&now<=een+90)een=now;}
      else{estatus='todo';est=ev.eventStartMinutes+shift;een=ev.eventEndMinutes+shift;}
      return{id:ev.id,name:(typeof evName==='function'?evName(ev):''),
        plannedStart:ev.eventStartMinutes,plannedEnd:ev.eventEndMinutes,
        projStart:est,projEnd:een,status:estatus,
        delta:estatus==='done'?(er.en-ev.eventEndMinutes):(est-ev.eventStartMinutes)};
    });

    // Parallel blocks don't consume their own slot, so they must not push the cursor.
    if(!parallel)cursor=projEnd+Number(sess.bufferMinutes||0);
    out.push({sess,t,status,shift,projStart,projEnd,plannedStart,plannedEnd,basis,events:evs,
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

// ── the strip ────────────────────────────────────────────────────────────
function liveStrip(){
  if(!liveOn())return'';
  const rows=liveProject(UI.dayId);
  if(!rows.length)return`<div class="live-strip"><div class="lv-off">Run sheet is on \u2014 there are no blocks on this day yet.</div>${liveStripTools()}</div>`;
  const now=liveNowMin();
  const running=rows.filter(r=>r.status==='running');
  const next=rows.find(r=>r.status==='next');
  const done=rows.filter(r=>r.status==='done').length;
  const last=rows[rows.length-1];
  const dayShift=last?Math.round(last.projEnd-last.plannedEnd):0;
  const recov=liveRecoverable(rows);

  const nowCard=running.length?running.map(r=>{
    const n=(typeof getSessNum==='function')?getSessNum(r.sess,allTimed()):'';
    const evRun=r.events.filter(e=>e.status==='running');
    const evNext=r.events.find(e=>e.status==='todo');
    return`<div class="lv-card now">
      <div class="lv-k">Now running</div>
      <div class="lv-v">${r.sess.isPractice?esc(r.sess.title||'Practice'):'Session '+n}</div>
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
      <div class="lv-v">${next.sess.isPractice?esc(next.sess.title||'Practice'):'Session '+n}</div>
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
  return`<div class="lv-tools">
    <button class="lv-tool live-ctl" onclick="liveResetDay()" title="Clear every actual time recorded for this day. The plan is untouched.">Clear day</button>
    <button class="lv-tool live-ctl" onclick="liveToggle()" title="Turn the run sheet off and show planned times only">Turn off</button>
  </div>`;
}

// ── per-session controls, injected into the card ──────────────────────────
function liveSessRow(sess,t){
  if(!liveOn())return'';
  const rec=liveSess(sess.id)||{};
  const row=liveProject(sess.dayId).find(r=>r.sess.id===sess.id);
  if(!row)return'';
  const openEvs=(sess.events||[]).filter(ev=>{const r=liveEv(ev.id);return !r||r.en==null}).length;
  let state,btns;
  if(rec.en!=null){
    state=`<span class="lv-badge done">Finished ${f12(rec.en)}</span>
           <span class="lv-chip ${liveDeltaCls(row.shift)}">${liveDelta(row.shift)}</span>`;
    btns=`<button class="lv-btn live-ctl" onclick="event.stopPropagation();liveStartSess('${sess.id}')" title="Re-open this session and set its start to now">Re-open</button>`;
  }else if(rec.st!=null){
    state=`<span class="lv-badge run">Running since ${f12(rec.st)}</span>
           <span class="lv-chip ${liveDeltaCls(row.shift)}">${liveDelta(row.shift)}</span>
           ${row.stale
             ?`<span class="lv-stale" title="${esc(row.basis)}">Still open \u2014 did this finish?</span>`
             :`<span class="lv-exp">ends about ${f12(row.projEnd)}</span>`}`;
    btns=`${openEvs?`<button class="lv-btn live-ctl" onclick="event.stopPropagation();liveStartAllEvs('${sess.id}')" title="Mark every event in this session as starting now \u2014 for boards that genuinely go at the same time">Start all ${openEvs} events</button>`:''}
      <button class="lv-btn primary live-ctl" onclick="event.stopPropagation();liveFinishSess('${sess.id}')">Finish session</button>`;
  }else{
    state=`<span class="lv-badge todo">Planned ${f12(row.plannedStart)}</span>${
      row.shift?`<span class="lv-chip ${liveDeltaCls(row.shift)}" title="${esc(row.basis)}">now expected ${f12(row.projStart)} \u00b7 ${liveDelta(row.shift)}</span>`:''}`;
    btns=`<button class="lv-btn primary live-ctl" onclick="event.stopPropagation();liveStartSess('${sess.id}')">Start session</button>
      ${(sess.events||[]).length?`<button class="lv-btn live-ctl" onclick="event.stopPropagation();liveStartAllEvs('${sess.id}')" title="Start the session and every event in it at the same moment">Start all events</button>`:''}`;
  }
  const clear=(rec.st!=null||rec.en!=null)?`<button class="lv-btn ghost live-ctl" onclick="event.stopPropagation();liveClearSess('${sess.id}')" title="Remove the recorded times for this session">Clear</button>`:'';
  return`<div class="lv-sess ${rec.en!=null?'is-done':rec.st!=null?'is-run':''}" onclick="event.stopPropagation()">
    <div class="lv-sess-state">${state}</div>
    <div class="lv-sess-btns">${btns}${clear}</div>
  </div>`;
}

// ── per-event controls, injected into each event row ──────────────────────
function liveEvCtl(sess,ev){
  if(!liveOn())return'';
  const r=liveEv(ev.id)||{};
  if(r.en!=null){
    const d=r.en-ev.eventEndMinutes;
    return`<span class="lv-ev done live-ctl" onclick="event.stopPropagation()">
      <span class="lv-ev-t">${f12(r.st!=null?r.st:ev.eventStartMinutes)}\u2013${f12(r.en)}</span>
      <span class="lv-chip sm ${liveDeltaCls(d)}">${liveDelta(d)}</span>
      <button class="lv-xbtn live-ctl" onclick="event.stopPropagation();liveStartEv('${sess.id}','${ev.id}')" title="Re-open this event and set its start to now">\u21ba</button>
    </span>`;
  }
  if(r.st!=null){
    return`<span class="lv-ev run live-ctl" onclick="event.stopPropagation()">
      <span class="lv-ev-t">on since ${f12(r.st)}</span>
      <button class="lv-xbtn end live-ctl" onclick="event.stopPropagation();liveEndEv('${ev.id}')" title="Mark this event finished now">End</button>
    </span>`;
  }
  return`<span class="lv-ev todo live-ctl" onclick="event.stopPropagation()">
    <button class="lv-xbtn live-ctl" onclick="event.stopPropagation();liveStartEv('${sess.id}','${ev.id}')" title="Mark this event as starting now">Start</button>
  </span>`;
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
