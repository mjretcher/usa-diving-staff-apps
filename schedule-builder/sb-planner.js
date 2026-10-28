/* ─────────────────────────────────────────────────────────────────────────
   EVENT PLANNER — put every event's rounds on meet days from one grid.

   Building a championship from scratch used to mean opening a session, opening
   the event picker, choosing one event, choosing one round, adding it — and
   doing that 72 times for a four-group, three-board, three-round meet while
   trying to remember what was already placed where. This grid shows every
   event as a row and every day as a column; each cell holds a chip per round
   (P / S / F). Tapping a chip places that round on that day — moving it from
   wherever it was — and tapping it again takes it out.

   Nothing here is a separate model. The grid reads straight from S.sessions,
   and placing a round creates or reuses an ordinary competition session on
   that day using the same makeEvent() the picker uses. Once events are on
   days, every existing tool (drag between sessions, warm-ups, timing, entries,
   reports) works on them exactly as before.

   Session grouping on placement:
     • rounds never share a session (Prelims with Prelims, Finals with Finals)
     • a session fills up to "New session after N events" (S.meet.plannerCap)
     • a Final (or Semifinal) joins the session holding the finals of the
       events whose prelims sit in the same prelim session — so sessions pair
       up the way a real championship day is run
     • within a day, Prelim sessions sit before Semifinal sessions before Final
       sessions; practice blocks are left where they are
   ───────────────────────────────────────────────────────────────────────── */
(function(){
'use strict';

const ROUND_ORDER=['Qualifier','Prelim','Semifinal','Final'];
const ROUND_SHORT={Qualifier:'Q',Prelim:'P',Semifinal:'S',Final:'F'};
const ROUND_PLURAL={Qualifier:'Qualifier',Prelim:'Prelims',Semifinal:'Semifinals',Final:'Finals'};
const ROUND_RANK={Qualifier:0,Prelim:1,Semifinal:2,Final:3};
const CAP_OPTIONS=[2,3,4,0]; // 0 = no limit

// Rounds this meet actually runs. Defaults to the meet type; Junior Nationals
// can turn Semifinals on here without touching the meet type.
function meetRounds(){
  const def=MEET_TYPES[S.meet.meetType]||MEET_TYPES.custom;
  const base=(Array.isArray(S.meet.rounds)&&S.meet.rounds.length)?S.meet.rounds:(def.rounds||['Qualifier']);
  return ROUND_ORDER.filter(r=>base.includes(r));
}
// Rounds offered as toggles: the meet type's own, plus Semifinal for any
// prelim/final meet (Junior Nationals has run semis in past seasons).
function offeredRounds(){
  const def=MEET_TYPES[S.meet.meetType]||MEET_TYPES.custom;
  const set=new Set(def.rounds||['Qualifier']);
  if(set.has('Prelim')&&set.has('Final'))set.add('Semifinal');
  (S.meet.rounds||[]).forEach(r=>set.add(r));
  return ROUND_ORDER.filter(r=>set.has(r));
}
function plannerCap(){const c=Number(S.meet.plannerCap);return CAP_OPTIONS.includes(c)?c:3}

function evKey(e){return `${e.level}|${e.gender}|${e.apparatus}|${e.style||'Individual'}`}
function isCompEv(e){return e&&e.style!=='Custom Block'}

// The rows of the grid: the meet type's catalog, plus any competition event
// already in the schedule that the catalog doesn't know (imported, custom).
function plannerRows(){
  const cat=buildCatalog(S.meet.meetType);
  const rounds=meetRounds();
  const rows=cat.map(p=>({p,key:evKey(p),rounds:p.style==='Synchronized'?p.rounds.slice():rounds.slice(),group:p.level,gender:p.gender}));
  const known=new Set(rows.map(r=>r.key));
  S.sessions.forEach(sess=>{if(sess.isPractice)return;sess.events.forEach(ev=>{
    if(!isCompEv(ev))return;const k=evKey(ev);if(known.has(k))return;known.add(k);
    const p={id:'extra-'+k.toLowerCase().replace(/[^a-z0-9]+/g,'-'),level:ev.level,gender:ev.gender,apparatus:ev.apparatus,style:ev.style||'Individual',defaultDives:ev.defaultDives||6,defaultSpd:ev.defaultSpd||35,rounds:rounds.slice(),extra:true};
    rows.push({p,key:k,rounds:rounds.slice(),group:ev.level,gender:ev.gender,extra:true});
  })});
  // A round that is in the schedule but switched off in the meet still shows,
  // so nothing placed can ever be hidden from the grid.
  const placed=placedMap();
  rows.forEach(r=>{ROUND_ORDER.forEach(rd=>{if(!r.rounds.includes(rd)&&placed.has(r.key+'|'+rd))r.rounds.push(rd)});r.rounds.sort((a,b)=>ROUND_RANK[a]-ROUND_RANK[b])});
  return rows;
}
// key|round -> {sess, ev}
function placedMap(){
  const m=new Map();
  S.sessions.forEach(sess=>{if(sess.isPractice)return;sess.events.forEach(ev=>{if(!isCompEv(ev))return;m.set(evKey(ev)+'|'+ev.round,{sess,ev});})});
  return m;
}
function findPlaced(s,key,round){
  for(const sess of s.sessions){if(sess.isPractice)continue;const ev=sess.events.find(e=>isCompEv(e)&&evKey(e)+'|'+e.round===key+'|'+round);if(ev)return{sess,ev};}
  return null;
}
function sessRound(sess){
  const evs=sess.events.filter(isCompEv);
  if(!evs.length)return null;
  const r=evs[0].round;return evs.every(e=>e.round===r)?r:'mixed';
}
function sessRank(sess){const r=sessRound(sess);return r==null?-1:r==='mixed'?1.5:ROUND_RANK[r]}
function dayIndex(dayId){return S.meet.days.findIndex(d=>d.id===dayId)}

// ── placement ───────────────────────────────────────────────────────────

function newCompSession(s,dayId,round){
  const day=s.meet.days.find(d=>d.id===dayId);
  return{id:uid(),dayId,warmupStartMinutes:0,warmupMinutes:55,rounding:5,introMinutes:0,bufferMinutes:5,awardsEnabled:false,isPractice:false,title:'',eventTags:day&&day.eventTag?[day.eventTag]:[],flights:[],events:[],plannerRound:round};
}
// Where a newly created session lands in the day: before the first session of
// a later round, otherwise after the last session on the day. reflowDay()
// then pushes everything into place.
function seatNewSession(s,dayId,sess){
  const others=s.sessions.filter(x=>x.dayId===dayId&&x.id!==sess.id&&!isParallel(x)).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  const myRank=ROUND_RANK[sess.plannerRound]??1;
  const later=others.find(x=>!x.isPractice&&sessRank(x)>myRank);
  if(later){sess.warmupStartMinutes=Math.max(0,Number(later.warmupStartMinutes)-5);return;}
  const day=s.meet.days.find(d=>d.id===dayId);
  const open=day&&day.openMinutes!=null?Number(day.openMinutes):390;
  if(!others.length){sess.warmupStartMinutes=Math.max(open,390);return;}
  const lastEnd=others.reduce((m,x)=>Math.max(m,calcSessTiming(x).sessionEndMinutes+Number(x.bufferMinutes||0)),open);
  sess.warmupStartMinutes=ruUp(lastEnd,5);
}
// Pick the session on this day that this round should join.
function destSession(s,dayId,round,key){
  const cap=plannerCap();
  const day=s.sessions.filter(x=>x.dayId===dayId&&!x.isPractice&&!isParallel(x)).sort((a,b)=>Number(a.warmupStartMinutes)-Number(b.warmupStartMinutes));
  const room=x=>!cap||x.events.filter(isCompEv).length<cap;
  const sameRound=day.filter(x=>sessRound(x)===round);
  // Pair finals with the session that holds the finals of this event's
  // prelim-session mates (Semifinals pair off Prelims; Finals off Semis,
  // or Prelims when there are no semis).
  if(round!=='Qualifier'&&round!=='Prelim'){
    const feeders=round==='Final'?['Semifinal','Prelim']:['Prelim'];
    for(const fr of feeders){
      const feeder=findPlaced(s,key,fr);
      if(!feeder||feeder.sess.dayId!==dayId)continue;
      const mates=feeder.sess.events.filter(e=>isCompEv(e)&&evKey(e)!==key).map(evKey);
      if(!mates.length)break;
      const paired=sameRound.find(x=>x.events.some(e=>isCompEv(e)&&mates.includes(evKey(e))));
      if(paired)return paired; // joins its mates even past the cap — the pairing matters more
      break;
    }
  }
  const open=sameRound.find(room);
  if(open)return open;
  const empty=day.find(x=>!x.events.filter(isCompEv).length);
  if(empty){empty.plannerRound=round;return empty;}
  const ns=newCompSession(s,dayId,round);
  s.sessions.push(ns);
  seatNewSession(s,dayId,ns);
  return ns;
}
function pruneIfEmpty(s,sess){
  if(!sess||sess.isPractice)return;
  if(sess.events.filter(isCompEv).length)return;
  if(!sess.plannerRound)return; // a session someone built by hand is theirs to delete
  s.sessions=s.sessions.filter(x=>x!==sess);
  if(UI.editSessId===sess.id)UI.editSessId=null;
}
function linkRounds(s,key){
  const pre=findPlaced(s,key,'Prelim'),semi=findPlaced(s,key,'Semifinal'),fin=findPlaced(s,key,'Final');
  if(fin)fin.ev.linkedPrelimId=(semi||pre)?(semi||pre).ev.id:undefined;
  if(semi)semi.ev.linkedPrelimId=pre?pre.ev.id:undefined;
}
// Place one round of one event on a day (state-level; no render).
function placeRound(s,p,round,dayId){
  const key=evKey(p);
  const found=findPlaced(s,key,round);
  if(found&&found.sess.dayId===dayId)return false;
  let ev,fromDay=null;
  if(found){found.sess.events=found.sess.events.filter(e=>e!==found.ev);ev=found.ev;fromDay=found.sess.dayId;pruneIfEmpty(s,found.sess);}
  else ev=makeEvent(p,round);
  const dest=destSession(s,dayId,round,key);
  dest.events.push(ev);
  linkRounds(s,key);
  reflowDay(s,dayId);
  if(fromDay&&fromDay!==dayId)reflowDay(s,fromDay);
  return true;
}
function removeRound(s,key,round){
  const found=findPlaced(s,key,round);
  if(!found)return false;
  found.sess.events=found.sess.events.filter(e=>e!==found.ev);
  const dayId=found.sess.dayId;
  pruneIfEmpty(s,found.sess);
  linkRounds(s,key);
  reflowDay(s,dayId);
  return true;
}
function rowByKey(key){return plannerRows().find(r=>r.key===key)}

// ── actions (window-level so inline handlers can reach them) ────────────

window.openPlanner=function(){
  UI.editSessId=null;UI.entriesOpen=false;UI.previewOpen=false;
  UI.plannerSel=UI.plannerSel||[];UI.plannerFilter=UI.plannerFilter||{};
  UI.modal='planner';render();
};
window.plannerToggle=function(key,round,dayId){
  if(dayLocked(dayId)){lockRefused();return;}
  const row=rowByKey(key);if(!row)return;
  const cur=findPlaced(S,key,round);
  if(cur&&cur.sess.dayId===dayId){
    if(dayLocked(cur.sess.dayId)){lockRefused();return;}
    upd(s=>removeRound(s,key,round));
    toast(`${evName(row.p)} ${ROUND_PLURAL[round]} taken off ${shortDate(dayOf(dayId))}`);
    return;
  }
  if(cur&&dayLocked(cur.sess.dayId)){lockRefused();return;}
  upd(s=>placeRound(s,row.p,round,dayId));
  toast(`${evName(row.p)} ${ROUND_PLURAL[round]} — ${shortDate(dayOf(dayId))}`);
};
function dayOf(dayId){const d=S.meet.days.find(x=>x.id===dayId);return d?d.date:''}
window.plannerSetRounds=function(round,on){
  const cur=new Set(meetRounds());
  if(on)cur.add(round);else cur.delete(round);
  if(!cur.size){toast('A meet needs at least one round');return;}
  upd(s=>{s.meet.rounds=ROUND_ORDER.filter(r=>cur.has(r));});
};
window.plannerSetCap=function(n){upd(s=>{s.meet.plannerCap=Number(n)})};
window.plannerFilter=function(kind,val){
  const f=UI.plannerFilter||(UI.plannerFilter={});
  f[kind]=f[kind]===val?null:val;render();
};
window.plannerSelect=function(key,on){
  const sel=new Set(UI.plannerSel||[]);if(on)sel.add(key);else sel.delete(key);UI.plannerSel=[...sel];render();
};
window.plannerSelectGroup=function(keysCsv,on){
  const sel=new Set(UI.plannerSel||[]);keysCsv.split(',').forEach(k=>{if(on)sel.add(k);else sel.delete(k)});UI.plannerSel=[...sel];render();
};
window.plannerClearSel=function(){UI.plannerSel=[];render()};
// Bulk: put one round of every selected event on a day ('' = take it off).
window.plannerBulkPlace=function(round,dayId){
  const keys=UI.plannerSel||[];if(!keys.length)return;
  if(dayId&&dayLocked(dayId)){lockRefused();return;}
  let n=0;
  upd(s=>{keys.forEach(key=>{const row=rowByKey(key);if(!row||!row.rounds.includes(round))return;
    if(!dayId){if(removeRound(s,key,round))n++;}
    else{const cur=findPlaced(s,key,round);if(cur&&dayLocked(cur.sess.dayId))return;if(placeRound(s,row.p,round,dayId))n++;}
  })});
  toast(dayId?`${n} ${ROUND_PLURAL[round]} placed on ${shortDate(dayOf(dayId))}`:`${n} ${ROUND_PLURAL[round]} taken off the schedule`);
};
// Bulk: a later round follows the earlier one's day, for selected rows (or all
// rows when nothing is selected).
window.plannerFollow=function(round){
  const feederOf={Semifinal:'Prelim',Final:null};
  const keys=(UI.plannerSel&&UI.plannerSel.length)?UI.plannerSel:plannerRows().map(r=>r.key);
  let n=0;
  upd(s=>{keys.forEach(key=>{const row=rowByKey(key);if(!row||!row.rounds.includes(round))return;
    const feederRound=round==='Final'?(row.rounds.includes('Semifinal')?'Semifinal':'Prelim'):feederOf[round];
    const feeder=feederRound&&findPlaced(s,key,feederRound);if(!feeder)return;
    if(dayLocked(feeder.sess.dayId))return;
    const cur=findPlaced(s,key,round);if(cur&&dayLocked(cur.sess.dayId))return;
    if(placeRound(s,row.p,round,feeder.sess.dayId))n++;
  })});
  toast(n?`${n} ${ROUND_PLURAL[round]} now on the same day as their ${round==='Final'?'earlier round':'prelims'}`:`Nothing to move — ${ROUND_PLURAL[round].toLowerCase()} already follow their earlier round`);
};
// Bulk: the later rounds go on the day AFTER prelims (Junior Nationals runs
// prelims one day, then semis and finals together the next). Selected rows,
// or every row when nothing is selected. Finals land in their own session
// after the semis because rounds never share a session.
window.plannerNextDay=function(){
  const keys=(UI.plannerSel&&UI.plannerSel.length)?UI.plannerSel:plannerRows().map(r=>r.key);
  let n=0,noNext=0;
  upd(s=>{keys.forEach(key=>{const row=rowByKey(key);if(!row)return;
    const pre=findPlaced(s,key,'Prelim');if(!pre)return;
    const di=s.meet.days.findIndex(d=>d.id===pre.sess.dayId);const next=s.meet.days[di+1];
    if(!next){noNext++;return;}
    if(dayLocked(next.id))return;
    row.rounds.filter(r=>r==='Semifinal'||r==='Final').forEach(r=>{const cur=findPlaced(s,key,r);if(cur&&dayLocked(cur.sess.dayId))return;if(placeRound(s,row.p,r,next.id))n++;});
  })});
  toast(n?`${n} rounds placed the day after their prelims`:noNext?'Prelims on the last day have no next day — add a day first':'Nothing to move — later rounds already follow the day after prelims');
};
window.plannerCollapse=function(g){
  const c=new Set(UI.plannerCollapsed||[]);if(c.has(g))c.delete(g);else c.add(g);UI.plannerCollapsed=[...c];render();
};
window.plannerClearAll=function(){
  askConfirm({title:'Take every event off the schedule?',message:'Every competition event is removed from every day. Practice blocks, meetings and the days themselves stay. You can undo with Cmd+Z.',confirmText:'Clear events',danger:true,onConfirm:()=>{
    upd(s=>{s.sessions.forEach(sess=>{if(sess.isPractice)return;if(sess.events.some(e=>isCompEv(e)&&dayLocked(sess.dayId)))return;sess.events=sess.events.filter(e=>!isCompEv(e));});
      s.sessions=s.sessions.filter(sess=>sess.isPractice||sess.events.length||!sess.plannerRound);
      s.meet.days.forEach(d=>reflowDay(s,d.id));});
    toast('All events cleared — days and practice blocks kept');
  }});
};

// ── render ──────────────────────────────────────────────────────────────

function dayHead(d,i){
  const dd=new Date(`${d.date}T00:00:00`);
  const pending=datesPending();
  const wd=pending?'Day':(isNaN(dd)?'':dd.toLocaleDateString('en-US',{weekday:'short'}));
  const num=pending?(i+1):(isNaN(dd)?d.date:dd.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
  return{wd,num};
}
window.renderPlannerModal=function(){
  const days=S.meet.days;
  const rows=plannerRows();
  const placed=placedMap();
  const timed=allTimed();
  // Session numbers are day-relative here ("S2" = second session of that
  // day) — the meet-wide number changes every time an earlier day changes.
  const sessNum=new Map();days.forEach(d=>{let n=0;timed.filter(x=>x.dayId===d.id&&!x.isPractice&&x.events.some(isCompEv)).forEach(x=>sessNum.set(x.id,++n));});
  const collapsed=new Set(UI.plannerCollapsed||[]);
  const f=UI.plannerFilter||{};
  const sel=new Set(UI.plannerSel||[]);
  const rounds=meetRounds();
  const offered=offeredRounds();
  const cap=plannerCap();
  const groups=[...new Set(rows.map(r=>r.group))];
  const genders=[...new Set(rows.map(r=>r.gender))];
  const boards=[...new Set(rows.map(r=>r.p.apparatus))];
  const visible=rows.filter(r=>(!f.group||r.group===f.group)&&(!f.gender||r.gender===f.gender)&&(!f.board||r.p.apparatus===f.board));

  // Per-day counts by round, plus "sessions" so load is visible at a glance
  const counts=days.map(d=>{const c={},b={};let sessions=0,minutes=0,unsized=0;const squads=new Map();
    timed.forEach(s=>{if(s.dayId!==d.id||s.isPractice)return;const evs=s.events.filter(isCompEv);if(!evs.length)return;sessions++;
      minutes+=Math.max(0,s.timing.sessionEndMinutes-s.timing.warmupStartMinutes);
      evs.forEach(e=>{c[e.round]=(c[e.round]||0)+1;const bk=isPlatform(e.apparatus)?'Platform':e.apparatus;b[bk]=(b[bk]||0)+1;if(e.round!=='Final'&&entryValue(e)<=0)unsized++;
        if(e.style!=='Synchronized'){const sq=e.level+'|'+e.gender;if(!squads.has(sq))squads.set(sq,new Set());squads.get(sq).add(bk);}});});
    // A squad (age group + gender) on two different boards in one day = the
    // same athletes competing twice that day. Advisory only.
    const clash=new Set();squads.forEach((boards,sq)=>{if(boards.size>1)clash.add(sq)});
    return{c,b,sessions,minutes,unsized,clash}});
  const clashTotal=counts.reduce((n,x)=>n+x.clash.size,0);

  let total=0,done=0,issues=0;
  const body=groups.map(g=>{
    const gRows=visible.filter(r=>r.group===g);if(!gRows.length)return'';
    const gKeys=gRows.map(r=>r.key);const gAll=gKeys.every(k=>sel.has(k));
    const isCol=collapsed.has(g);
    const gPlaced=gRows.reduce((n,r)=>n+r.rounds.filter(rd=>placed.has(r.key+'|'+rd)).length,0),gTotal=gRows.reduce((n,r)=>n+r.rounds.length,0);
    const head=`<tr class="pl-grp"><td class="pl-sticky"><label class="pl-chk"><input type="checkbox" ${gAll?'checked':''} onchange="plannerSelectGroup('${esc(gKeys.join(','))}',this.checked)" aria-label="Select all ${esc(g)}"/><span>${esc(g)}</span></label></td><td colspan="${days.length+1}"><button type="button" class="pl-fold" onclick="plannerCollapse('${esc(g)}')" aria-expanded="${isCol?'false':'true'}">${isCol?'Show':'Hide'} ${gRows.length} events · ${gPlaced} of ${gTotal} placed ${isCol?'▸':'▾'}</button></td></tr>`;
    if(isCol){gRows.forEach(r=>{total+=r.rounds.length;done+=r.rounds.filter(rd=>placed.has(r.key+'|'+rd)).length;});return head;}
    const lines=gRows.map(r=>{
      const name=evName(r.p).replace(new RegExp('^'+r.group.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*'),'');
      const where={};r.rounds.forEach(rd=>{const hit=placed.get(r.key+'|'+rd);if(hit)where[rd]=hit});
      const placedN=Object.keys(where).length;total+=r.rounds.length;done+=placedN;
      // Order check: a later round on an earlier day than the round before it
      const bad=[];for(let i=1;i<r.rounds.length;i++){const a=where[r.rounds[i-1]],b=where[r.rounds[i]];if(a&&b&&dayIndex(b.sess.dayId)<dayIndex(a.sess.dayId))bad.push(ROUND_PLURAL[r.rounds[i]]+' before '+ROUND_PLURAL[r.rounds[i-1]].toLowerCase());}
      if(bad.length)issues++;
      const sq=r.p.level+'|'+r.p.gender;const rowBoard=isPlatform(r.p.apparatus)?'Platform':r.p.apparatus;
      let rowClash=null;
      const cells=days.map((d,di)=>{
        const lk=dayLocked(d.id);
        const dayClash=r.p.style!=='Synchronized'&&counts[di].clash.has(sq)&&r.rounds.some(rd=>where[rd]&&where[rd].sess.dayId===d.id);
        if(dayClash&&!rowClash)rowClash={day:shortDate(d.date),tip:`${r.p.level} ${r.p.gender} compete on another board ${shortDate(d.date)} as well — the same athletes twice in one day`};
        return`<td class="pl-cell ${lk?'locked':''} ${dayClash?'clash':''}" ${dayClash?`title="${esc(r.p.level+' '+r.p.gender)} compete on another board this day too — same athletes twice in one day"`:''}>${r.rounds.map(rd=>{
          const hit=where[rd];const here=hit&&hit.sess.dayId===d.id;const elsewhere=hit&&!here;
          const sn=here?sessNum.get(hit.sess.id):null;
          const tip=here?`${esc(evName(r.p))} ${ROUND_PLURAL[rd]} — ${esc(shortDate(d.date))}, session ${sn} of that day. Click to take it off.`:elsewhere?`${ROUND_PLURAL[rd]} are on ${esc(shortDate(dayOf(hit.sess.dayId)))}. Click to move them here.`:`Put ${ROUND_PLURAL[rd]} on ${esc(shortDate(d.date))}`;
          return`<button type="button" class="pl-chip r-${rd.toLowerCase()} ${here?'on':''} ${elsewhere?'away':''}" ${lk?'disabled':''} title="${tip}" aria-label="${tip}" onclick="plannerToggle('${esc(r.key)}','${rd}','${d.id}')"><span class="pl-chip-l">${ROUND_SHORT[rd]}</span>${here?`<span class="pl-chip-s">S${sn}</span>`:''}</button>`;
        }).join('')}</td>`;
      }).join('');
      const status=bad.length?`<span class="pl-status bad" title="${esc(bad.join('; '))}">${esc(bad[0])}</span>`:rowClash?`<span class="pl-status warn" title="${esc(rowClash.tip)}">Twice ${esc(rowClash.day)}</span>`:placedN===r.rounds.length?`<span class="pl-status ok">All ${r.rounds.length} placed</span>`:placedN?`<span class="pl-status part">${placedN} of ${r.rounds.length}</span>`:`<span class="pl-status none">Not placed</span>`;
      return`<tr class="pl-row ${sel.has(r.key)?'sel':''}"><td class="pl-sticky"><label class="pl-chk"><input type="checkbox" ${sel.has(r.key)?'checked':''} onchange="plannerSelect('${esc(r.key)}',this.checked)" aria-label="Select ${esc(evName(r.p))}"/><span class="pl-name">${esc(name)}${r.extra?' <em>(not in this meet type)</em>':''}</span></label></td>${cells}<td class="pl-statcell">${status}</td></tr>`;
    }).join('');
    return head+lines;
  }).join('');

  const dayOpts=`<option value="">—</option>${days.map((d,i)=>{const h=dayHead(d,i);return`<option value="${d.id}">${esc(h.wd+' '+h.num)}</option>`}).join('')}`;
  const bulk=sel.size?`<div class="pl-bulk">
      <b>${sel.size} event${sel.size===1?'':'s'} selected</b>
      ${rounds.map(rd=>`<label class="pl-bulk-item"><span>${ROUND_PLURAL[rd]} on</span><select class="fi-sm" onchange="plannerBulkPlace('${rd}',this.value);this.value=''" aria-label="Put ${ROUND_PLURAL[rd]} of the selected events on a day"><option value="" selected disabled>pick a day…</option>${days.map((d,i)=>{const h=dayHead(d,i);return`<option value="${d.id}">${esc(h.wd+' '+h.num)}</option>`}).join('')}<option value="">— take off the schedule</option></select></label>`).join('')}
      <button class="btn btn-sm btn-gh" onclick="plannerClearSel()">Deselect</button>
    </div>`:'';

  const filterChips=(label,kind,vals,cur)=>`<div class="pl-fgroup"><span class="pl-flabel">${label}</span>${vals.map(v=>`<button type="button" class="chip ${cur===v?'on':''}" onclick="plannerFilter('${kind}','${esc(v)}')">${esc(kind==='board'?al(v):v)}</button>`).join('')}</div>`;

  return`<div class="modal modal-xl pl-modal" onclick="event.stopPropagation()">
    <div class="modal-hd">
      <div><span class="modal-title">Place events on days</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">${done} of ${total} rounds placed${issues?` · <span style="color:var(--red)">${issues} event${issues===1?'':'s'} with a round out of order</span>`:''}${clashTotal?` · <span style="color:var(--warn)">${clashTotal} squad${clashTotal===1?'':'s'} on two boards in one day</span>`:''} · tap a chip to put that round on that day, tap again to take it off</div></div>
      <button class="modal-close" aria-label="Close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body pl-body" data-keepscroll="planner">
      ${!days.length?`<div class="empty"><div class="empty-title">No days yet</div><div class="empty-sub">Add the meet days first (the + in the day bar), then come back here.</div><button class="btn btn-p btn-sm" style="margin-top:10px" onclick="closeModal();addDay()">Add a day</button></div>`:`
      <div class="pl-tools">
        <div class="pl-fgroup"><span class="pl-flabel">Rounds this meet runs</span>${offered.map(rd=>`<button type="button" class="chip ${rounds.includes(rd)?'on':''}" onclick="plannerSetRounds('${rd}',${rounds.includes(rd)?'false':'true'})">${ROUND_PLURAL[rd]}</button>`).join('')}</div>
        <div class="pl-fgroup"><span class="pl-flabel">New session after</span>${CAP_OPTIONS.map(n=>`<button type="button" class="chip ${cap===n?'on':''}" onclick="plannerSetCap(${n})" title="${n?`Start a new session once one holds ${n} events of the same round`:'Keep adding to the same session'}">${n?n+' events':'no limit'}</button>`).join('')}</div>
        <div class="pl-spacer"></div>
        <div class="pl-fgroup"><span class="pl-flabel">Shortcuts</span>
          ${rounds.includes('Semifinal')?`<button type="button" class="chip" onclick="plannerFollow('Semifinal')" title="Semifinals go on the same day as their prelims (selected events, or all events when nothing is selected)">Semis follow prelims</button>`:''}
          ${rounds.includes('Final')?`<button type="button" class="chip" onclick="plannerFollow('Final')" title="Finals go on the same day as the round before them (selected events, or all events when nothing is selected)">Finals follow ${rounds.includes('Semifinal')?'semis':'prelims'}</button>`:''}
          ${rounds.includes('Prelim')&&(rounds.includes('Semifinal')||rounds.includes('Final'))?`<button type="button" class="chip" onclick="plannerNextDay()" title="${rounds.includes('Semifinal')?'Semis and finals':'Finals'} go on the day after their prelims, in separate sessions (selected events, or all events when nothing is selected)">${rounds.includes('Semifinal')?'Semis + finals':'Finals'} day after prelims</button>`:''}
          <button type="button" class="chip" style="color:var(--red)" onclick="plannerClearAll()">Clear every event</button>
        </div>
      </div>
      <div class="pl-tools pl-filters">
        ${filterChips('Show','group',groups,f.group)}
        ${filterChips('','gender',genders,f.gender)}
        ${filterChips('','board',boards,f.board)}
        ${(f.group||f.gender||f.board)?`<button type="button" class="chip" onclick="UI.plannerFilter={};render()">Show everything</button>`:''}
      </div>
      ${bulk}
      <div class="pl-scroll">
      <table class="pl-table">
        <thead><tr>
          <th class="pl-sticky pl-th-ev">Event</th>
          ${days.map((d,i)=>{const h=dayHead(d,i);const c=counts[i];const parts=rounds.filter(rd=>c.c[rd]).map(rd=>`<span class="pl-cnt r-${rd.toLowerCase()}">${c.c[rd]} ${ROUND_SHORT[rd]}</span>`);const lk=dayLocked(d.id);
            const boards=['1m','3m','Platform'].filter(b=>c.b[b]).map(b=>`<span class="pl-cnt brd">${c.b[b]} ${b==='Platform'?'PL':b.toUpperCase()}</span>`).join('');
            const hrs=c.sessions?`<span class="pl-cnt hrs ${c.unsized?'est':''}" title="${c.unsized?`Competition time from current entry counts — ${c.unsized} prelim/semi event${c.unsized===1?' has':'s have'} no entries yet, so this will grow once Projections or Entries are filled in`:'Competition time from current entry counts, warm-ups included'}">${fdur(c.minutes)}${c.unsized?' +':''}</span>`:'';
            const clash=c.clash.size?`<span class="pl-cnt clash" title="${esc([...c.clash].map(x=>x.replace('|',' ')).join(', '))} compete on two boards this day">${c.clash.size} twice</span>`:'';return`<th class="pl-th-day ${d.id===UI.dayId?'cur':''} ${lk?'locked':''}" title="${esc(fullDate(d.date))}${lk?' — locked':''}"><button type="button" class="pl-daybtn" onclick="closeModal();selectDay('${d.id}')" title="Open this day"><span class="pl-wd">${esc(h.wd)}</span><span class="pl-num">${esc(String(h.num))}</span></button><div class="pl-daycounts">${parts.length?parts.join(''):'<span class="pl-cnt empty">empty</span>'}${c.sessions?`<span class="pl-cnt sess">${c.sessions} sess</span>`:''}${lk?'<span class="pl-cnt lock">locked</span>':''}</div>${boards||hrs||clash?`<div class="pl-daycounts">${boards}${hrs}${clash}</div>`:''}</th>`}).join('')}
          <th class="pl-th-stat">Status</th>
        </tr></thead>
        <tbody>${body||`<tr><td colspan="${days.length+2}" style="padding:24px;text-align:center;color:var(--tx3)">No events match that filter</td></tr>`}</tbody>
      </table>
      </div>
      <div class="pl-legend">${rounds.map(rd=>`<span class="pl-chip r-${rd.toLowerCase()} on demo"><span class="pl-chip-l">${ROUND_SHORT[rd]}</span></span> ${ROUND_PLURAL[rd]}`).join('')} <span class="pl-chip away demo"><span class="pl-chip-l">P</span></span> placed on another day · S2 = second session of that day · <span class="pl-cnt clash">twice</span> = same age group and gender on two boards that day · hours marked + grow once entries are filled in</div>
      `}
    </div>
    <div class="modal-foot">
      <span style="font-size:11px;color:var(--tx3);flex:1">Sessions are created as you go. Open a day afterwards to set warm-ups, times and entries, or drag events between sessions, exactly as before.</span>
      <button class="btn btn-sm btn-p" onclick="closeModal()">Done</button>
    </div>
  </div>`;
};
})();
