// ── MEET FORMAT ───────────────────────────────────────────────────────
// The competition rules a meet publishes (how many reach a final, how the
// qualifier feeds the prelims, dives per list, DD minimums, qualifying scores)
// kept on the schedule itself in S.meet.format. Three things read it:
//   1. The schedule: the longest a day can run under the rules, and health
//      checks for dive counts and qualifier advancement that disagree with it.
//   2. The printed Advancement & Event Format and standards tables, so each
//      number is typed once.
//   3. Nothing else. It never moves a block and never changes an entry count.
// A schedule with no format behaves exactly as before.

const FMT_APPS=[['1m','1-Meter'],['3m','3-Meter'],['10m','10-Meter']];
// Numbers from the published 2026 Winter Nationals documents (Eligibility
// Criteria as amended 26 Oct 2026, Qualifier Criteria, Advancement & Event Format).
const FORMAT_PRESETS={
  winterNationals2026:{
    label:'2026 Winter Nationals',
    title:'2026 USA Diving Winter National Championships',
    finalists:12,extraNonUS:2,extraJunior10m:2,
    qualTopN:6,qualOrScore:true,
    rows:[
      {g:'Women',a:'1m',dives:5,dd:11.9,score:235,opt:47,ncaa:282},
      {g:'Women',a:'3m',dives:5,dd:13.7,score:260,opt:52,ncaa:312},
      {g:'Women',a:'10m',dives:5,dd:13.3,score:250,opt:50,ncaa:250},
      {g:'Men',a:'1m',dives:6,dd:15.9,score:318,opt:53,ncaa:318},
      {g:'Men',a:'3m',dives:6,dd:17.2,score:360,opt:60,ncaa:360},
      {g:'Men',a:'10m',dives:6,dd:17.1,score:330,opt:55,ncaa:330}
    ],
    synchro:[
      {g:'Women',a:'3m',dives:5,dd:12.3,ddOpt:8.3},
      {g:'Women',a:'10m',dives:5,dd:12.2,ddOpt:8.2},
      {g:'Men',a:'3m',dives:6,dd:15.7,ddOpt:11.7},
      {g:'Men',a:'10m',dives:6,dd:15.9,ddOpt:11.9}
    ],
    junior:[
      {grp:'Group A Girls',m1:188,o1:47,m3:208,o3:52,pl:200,op:50},
      {grp:'Group A Boys',m1:265,o1:53,m3:300,o3:60,pl:275,op:55},
      {grp:'Group B Girls',m1:141,o1:47,m3:156,o3:52,pl:150,op:50},
      {grp:'Group B Boys',m1:212,o1:53,m3:240,o3:60,pl:220,op:55}
    ],
    qualEvents:[
      'NCAA Division I Zone Championships (2025, 2026)',
      'NCAA Division I Championships (2025, 2026)',
      'NCAA Division I Conference Championships (2025, 2026) *approved by HPD',
      'USA Diving National Championships (2025, 2026)',
      'USA Diving National Championships Qualifier (2025, 2026)',
      'USA Diving Junior National Championships (2025, 2026) - Group A and B only',
      'USA Diving Winter National Championships (2025)',
      'USA Diving Winter Nationals Qualifier (2025, 2026)',
      'World Aquatics Events (2025, 2026)',
      '2026 NCAA Division II and Division III Championships (top placing U.S. citizen on 1-meter and 3-meter, with the qualifying score on six optional dives in the final)',
      'Additional events to be determined by the HPD & CCE'
    ],
    lateFee:'November 24, 2026',federation:'November 16, 2026'
  }
};
function fmtBlank(){
  return{label:'',title:(S.meet&&S.meet.name)||'',finalists:12,extraNonUS:0,extraJunior10m:0,qualTopN:12,qualOrScore:false,
    rows:['Women','Men'].flatMap(g=>FMT_APPS.map(([a])=>({g,a,dives:g==='Women'?5:6,dd:'',score:'',opt:'',ncaa:''}))),
    synchro:['Women','Men'].flatMap(g=>[['3m'],['10m']].map(([a])=>({g,a,dives:g==='Women'?5:6,dd:'',ddOpt:''}))),
    junior:[],qualEvents:[],lateFee:'',federation:''};
}
function fmt(){return(S&&S.meet&&S.meet.format)||null;}
function fmtNum(v){const n=Number(v);return v===''||v==null||isNaN(n)?null:n;}
function fmtAppLabel(a){return(FMT_APPS.find(x=>x[0]===a)||[a,a])[1];}
function fmtAppMatch(evApp,a){
  if(a==='10m')return isPlatform(evApp);
  return evApp===a||evApp===fmtAppLabel(a)||String(evApp||'').toLowerCase().replace(/[^0-9a-z]/g,'')===(a==='1m'?'1meter':'3meter');
}
// The format row an event falls under, or null (junior events, custom blocks).
function fmtRowFor(ev){
  const f=fmt();if(!f||!ev||ev.style==='Custom Block')return null;
  if(/^Group |^Junior/i.test(ev.level||''))return null;
  const list=ev.style==='Synchronized'?f.synchro:f.rows;
  return(list||[]).find(r=>r.g===ev.gender&&fmtAppMatch(ev.apparatus,r.a))||null;
}
function openFormat(){UI.modal='format';render();}
function fmtStart(key){
  upd(s=>{s.meet.format=key&&FORMAT_PRESETS[key]?JSON.parse(JSON.stringify(FORMAT_PRESETS[key])):fmtBlank();});
  toast(key?'Format loaded from the published 2026 Winter Nationals documents':'Blank format added');
}
function fmtRemove(){
  askConfirm({title:'Remove the meet format?',message:'The schedule keeps every block and entry count. Only the format numbers and the checks that use them go. You can undo with Cmd+Z.',confirmText:'Remove',danger:true,
    onConfirm:()=>{upd(s=>{delete s.meet.format;});toast('Meet format removed');}});
}
function fmtSet(path,val,isText){
  upd(s=>{
    const f=s.meet.format;if(!f)return;
    const v=isText?String(val):(val===''?'':Number(val));
    if(!isText&&v!==''&&isNaN(v))return;
    const p=path.split('.');
    if(p.length===1)f[p[0]]=v;
    else if(p.length===3&&f[p[0]]&&f[p[0]][Number(p[1])])f[p[0]][Number(p[1])][p[2]]=v;
  });
}
function fmtSetFlag(key,on){upd(s=>{if(s.meet.format)s.meet.format[key]=!!on;});}
function fmtSetLines(key,text){upd(s=>{if(s.meet.format)s.meet.format[key]=String(text).split('\n').map(x=>x.trim()).filter(Boolean);});}

// ── LONGEST CASE ──────────────────────────────────────────────────────
// How large each final and prelim can get under the rules, compared with what
// the schedule is sized for now.
function fmtGrowth(){
  const f=fmt();if(!f)return[];
  const out=[];
  const base=fmtNum(f.finalists)||12;
  (S.sessions||[]).forEach(sess=>{
    if(sess.isPractice)return;
    (sess.events||[]).forEach(ev=>{
      if(!fmtRowFor(ev))return;
      if(ev.round==='Final'){
        const pre=prelimEventFor(S,ev);
        const field=pre?entryValue(pre):null;
        const cur=entryValue(ev);
        const jr=(ev.style!=='Synchronized'&&isPlatform(ev.apparatus))?(fmtNum(f.extraJunior10m)||0):0;
        let max=base+(fmtNum(f.extraNonUS)||0)+jr;
        if(field!=null&&field>0)max=Math.min(max,field);
        if(max>cur)out.push({kind:'final',sessId:sess.id,dayId:sess.dayId,evId:ev.id,name:evName(ev)+' final',cur,max,
          why:`up to ${max} in the final (${base} U.S.${fmtNum(f.extraNonUS)?`, ${f.extraNonUS} non-U.S.`:''}${jr?`, ${jr} junior on 10-meter`:''})`});
      }else if(ev.round==='Prelim'&&ev.style!=='Synchronized'){
        const q=qualifierEventFor(ev);if(!q)return;
        const qField=qualifierFieldSize(q);if(!qField)return;
        const adv=advanceInValue(ev);
        const b=entryBase(ev);
        if(b==null)return;
        if(f.qualOrScore){
          // "Top N or the qualifying score" has no fixed ceiling short of the whole
          // qualifier field, and re-timing the day as if every qualifier diver hit
          // the score would be noise. Report what each extra diver costs instead.
          if(adv>=qField)return;
          const d=calcEvDur(ev).evMin,n=entryValue(ev);
          const per=n>0?Math.round(d/n*10)/10:null;
          out.push({kind:'open',sessId:sess.id,dayId:sess.dayId,evId:ev.id,name:evName(ev)+' prelim',cur:b+adv,max:b+adv,
            why:`${adv} counted from the qualifier; each further diver who meets the qualifying score adds${per?` about ${per} min`:' time'} (${qField} in the qualifier)`});
          return;
        }
        const maxAdv=Math.min(fmtNum(f.qualTopN)||0,qField);
        if(maxAdv<=adv)return;
        out.push({kind:'prelim',sessId:sess.id,dayId:sess.dayId,evId:ev.id,name:evName(ev)+' prelim',cur:b+adv,max:b+maxAdv,adv,maxAdv,
          why:`${maxAdv} advance from the qualifier (${adv} counted now)`});
      }
    });
  });
  return out;
}
// The schedule re-timed with every final and prelim at its largest. Later
// blocks on a day move only as far as they are pushed: existing gaps absorb the
// extra time first, and anything that already overlapped keeps its overlap.
// Works on a copy; S is swapped in only while timings are read and always
// restored, so nothing is saved and nothing is rendered from the copy.
function fmtLongest(){
  const growth=fmtGrowth();
  if(!growth.length)return{growth,days:[]};
  const sized=growth.filter(g=>g.kind!=='open');
  const plan=allTimed();
  const planBy=new Map(plan.map(s=>[s.id,s.timing]));
  const keep=S;const c=JSON.parse(JSON.stringify(S));
  const days=[];
  try{
    S=c;
    sized.forEach(g=>{
      const sess=c.sessions.find(x=>x.id===g.sessId);const ev=sess&&sess.events.find(e=>e.id===g.evId);if(!ev)return;
      if(g.kind==='final'){ev.finalDivers=g.max;ev.projectedDivers=g.max;ev.numberOfDivers=g.max;}
      else ev.advanceIn=g.maxAdv;
    });
    c.meet.days.forEach(day=>{
      const stack=c.sessions.filter(s=>s.dayId===day.id&&!isParallel(s)&&planBy.has(s.id)).sort((a,b)=>planBy.get(a.id).warmupStartMinutes-planBy.get(b.id).warmupStartMinutes);
      if(!stack.length)return;
      const moved=[];let prev=null,prevLong=null;
      stack.forEach(s=>{
        const p=planBy.get(s.id);
        let start=p.warmupStartMinutes;
        if(prev){
          const pp=planBy.get(prev.id);const buf=Number(prev.bufferMinutes||0);
          const hadOverlap=Math.max(0,pp.sessionEndMinutes+buf-p.warmupStartMinutes);
          const need=prevLong.sessionEndMinutes+buf-hadOverlap;
          if(need>start)start=ruUp(need,5);
        }
        s.warmupStartMinutes=start;
        const t=calcSessTiming(s);
        if(start>p.warmupStartMinutes)moved.push({id:s.id,label:sessLabelOf(s,plan),by:start-p.warmupStartMinutes});
        prev=s;prevLong=t;s._long=t;
      });
      const planEnd=Math.max(...stack.map(s=>planBy.get(s.id).sessionEndMinutes));
      const longEnd=Math.max(...stack.map(s=>s._long.sessionEndMinutes));
      const dayGrowth=growth.filter(g=>g.dayId===day.id);
      if(!dayGrowth.length&&longEnd<=planEnd)return;
      // Per-event extra minutes, read off the re-timed copy.
      dayGrowth.forEach(g=>{
        if(g.kind==='open'){g.extra=null;return;}
        const s=stack.find(x=>x.id===g.sessId);
        const pe=s&&(planBy.get(s.id).events||[]).find(e=>e.id===g.evId);
        const le=s&&(s._long.events||[]).find(e=>e.id===g.evId);
        g.extra=(pe&&le)?Math.round((le.eventEndMinutes-le.eventStartMinutes)-(pe.eventEndMinutes-pe.eventStartMinutes)):null;
      });
      const close=dayCloseFor(day.id);
      // Blocks pinned to a clock time do not move; say so if a session now runs into one.
      const hits=[];
      keep.sessions.filter(x=>x.dayId===day.id&&isParallel(x)&&!x.parallelWith&&planBy.has(x.id)).forEach(fx=>{
        const ft=planBy.get(fx.id);
        stack.filter(s=>!s.isPractice).forEach(s=>{
          const p=planBy.get(s.id),l=s._long;
          const was=p.warmupStartMinutes<ft.sessionEndMinutes&&ft.warmupStartMinutes<p.sessionEndMinutes;
          const now=l.warmupStartMinutes<ft.sessionEndMinutes&&ft.warmupStartMinutes<l.sessionEndMinutes;
          if(now&&!was)hits.push(`${sessLabelOf(s,plan)} would run into ${fx.title||'a fixed block'} (${f12(ft.warmupStartMinutes)})`);
        });
      });
      const lastComp=stack.filter(s=>!s.isPractice);
      const planComp=lastComp.length?Math.max(...lastComp.map(s=>planBy.get(s.id).sessionEndMinutes)):null;
      const longComp=lastComp.length?Math.max(...lastComp.map(s=>s._long.sessionEndMinutes)):null;
      days.push({dayId:day.id,date:day.date,planEnd,longEnd,planComp,longComp,growth:dayGrowth,moved,
        pastClose:longEnd>close&&planEnd<=close?close:null,hits});
    });
  }finally{S=keep;}
  return{growth,days};
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────
function formatIssues(){
  const f=fmt();if(!f)return[];
  const issues=[];
  const dayLbl=id=>{const d=(S.meet.days||[]).find(x=>x.id===id);return d?shortDate(d.date):'';};
  (S.sessions||[]).forEach(sess=>{
    if(sess.isPractice)return;
    (sess.events||[]).forEach(ev=>{
      const r=fmtRowFor(ev);if(!r)return;
      const want=fmtNum(r.dives),have=Number(ev.numberOfDives||ev.defaultDives||0);
      if(want&&have&&want!==have)issues.push({sev:'warn',title:'Dive count differs from the meet format',
        detail:`${evName(ev)} is timed at ${have} dives; the meet format says ${want}`,loc:dayLbl(sess.dayId),fixSessId:sess.id,dayId:sess.dayId,fixHint:'edit'});
      if(ev.round==='Prelim'&&ev.style!=='Synchronized'){
        const q=qualifierEventFor(ev);const qField=q?qualifierFieldSize(q):0;
        const floor=Math.min(fmtNum(f.qualTopN)||0,qField);
        if(q&&qField&&entryBase(ev)!=null&&advanceInValue(ev)<floor)issues.push({sev:'warn',title:'Fewer advancing in than the qualifier rule',
          detail:`${evName(ev)} counts ${advanceInValue(ev)} advancing in from ${evName(q)}; the format sends at least the top ${floor}${f.qualOrScore?', plus anyone who meets the qualifying score':''}`,
          loc:dayLbl(sess.dayId),fixSessId:sess.id,dayId:sess.dayId,fixHint:'entries'});
      }
    });
  });
  let L;try{L=fmtLongest();}catch(e){console.error('Meet format longest-case failed:',e);return issues;}
  L.days.forEach(d=>{
    const add=d.longEnd-d.planEnd;
    const parts=d.growth.map(g=>`${g.name}: ${g.why}${g.extra?`, about ${g.extra} min longer`:''}`);
    if(!parts.length)return;
    const bad=d.pastClose!=null||d.hits.length;
    const sizedHere=d.growth.some(g=>g.kind!=='open');
    const tail=add>0?` At the longest the day ends ${f12(d.longEnd)} instead of ${f12(d.planEnd)}.`:(sizedHere?' The gaps already on the day absorb the larger finals.':'');
    const extra=(d.pastClose!=null?` That is past the facility close (${f12(d.pastClose)}).`:'')+(d.hits.length?' '+d.hits.join('. ')+'.':'');
    issues.push({sev:bad?'warn':'info',title:bad?'Longest case under the meet format does not fit':'Could run longer under the meet format',
      detail:parts.join('. ')+'.'+tail+extra,loc:shortDate(d.date),dayId:d.dayId,fixSessId:d.growth[0].sessId,fixHint:'edit'});
  });
  return issues;
}

// ── PANEL ─────────────────────────────────────────────────────────────
function renderFormatModal(){
  const f=fmt();
  const hd=`<div class="modal-hd"><div><span class="modal-title">Meet format</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">The competition rules this meet publishes. Used for the longest-case timing, the health check and the printed format document.</div></div><button class="modal-close" aria-label="Close" onclick="closeModal()">&times;</button></div>`;
  if(!f)return`<div class="modal fm-modal" onclick="event.stopPropagation()">${hd}
    <div class="modal-body">
      <p class="fm-help">This schedule has no format yet. Nothing changes until you add one.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${Object.entries(FORMAT_PRESETS).map(([k,p])=>`<button class="btn btn-p" onclick="fmtStart('${k}')">Start from ${esc(p.label)}</button>`).join('')}
        <button class="btn" onclick="fmtStart('')">Start blank</button>
      </div>
    </div>
    <div class="modal-foot"><button class="btn" onclick="closeModal()">Close</button></div></div>`;
  const lk=S.locked?'disabled':'';
  const num=(path,v,w)=>`<input class="fi fm-n" type="number" step="any" style="width:${w||64}px" value="${esc(v==null?'':v)}" ${lk} onchange="fmtSet('${path}',this.value)"/>`;
  const rowsHtml=(f.rows||[]).map((r,i)=>`<tr><td class="fm-ev">${esc(r.g)} ${esc(fmtAppLabel(r.a))}</td><td>${num(`rows.${i}.dives`,r.dives,52)}</td><td>${num(`rows.${i}.dd`,r.dd)}</td><td>${num(`rows.${i}.score`,r.score)}</td><td>${num(`rows.${i}.opt`,r.opt,56)}</td><td>${num(`rows.${i}.ncaa`,r.ncaa)}</td></tr>`).join('');
  const synHtml=(f.synchro||[]).map((r,i)=>`<tr><td class="fm-ev">${esc(r.g)} Synchro ${esc(fmtAppLabel(r.a))}</td><td>${num(`synchro.${i}.dives`,r.dives,52)}</td><td>${num(`synchro.${i}.dd`,r.dd)}</td><td>${num(`synchro.${i}.ddOpt`,r.ddOpt)}</td></tr>`).join('');
  let L={growth:[],days:[]};try{L=fmtLongest();}catch(e){console.error(e);}
  const effect=L.days.length?`<table class="fm-tbl fm-eff"><thead><tr><th>Day</th><th>Ends as planned</th><th>Ends at the longest</th><th>What can grow</th></tr></thead><tbody>${L.days.map(d=>`<tr>
      <td class="fm-ev">${esc(shortDate(d.date))}</td><td>${f12(d.planEnd)}</td>
      <td class="${d.longEnd>d.planEnd?'fm-late':''}">${f12(d.longEnd)}${d.longEnd>d.planEnd?` <span class="fm-plus">+${d.longEnd-d.planEnd} min</span>`:''}</td>
      <td class="fm-why">${d.growth.map(g=>`<div>${esc(g.name)}: ${esc(g.why)}${g.extra?`, about ${g.extra} min longer`:''}</div>`).join('')}${d.pastClose!=null?`<div class="fm-bad">Past the facility close (${f12(d.pastClose)})</div>`:''}${d.hits.map(h=>`<div class="fm-bad">${esc(h)}</div>`).join('')}${(d.longEnd<=d.planEnd&&d.growth.some(g=>g.kind!=='open'))?'<div class="fm-ok">The gaps already on the day absorb the larger finals</div>':''}</td></tr>`).join('')}</tbody></table>`
    :`<div class="hours-note">Every final and prelim on the schedule is already sized at its largest under these rules.</div>`;
  const effNote=L.days.some(d=>d.growth.some(g=>g.kind==='open'))?`<p class="fm-help">Prelims fed by a "top ${esc(f.qualTopN)} or qualifying score" rule have no fixed ceiling, so they are not included in the longest time. The line for each shows what one more diver adds.</p>`:'';
  return`<div class="modal fm-modal fm-wide" onclick="event.stopPropagation()">${hd}
    <div class="modal-body">
      <div class="fg"><label class="fl">Title on the printed format document</label><input class="fi" value="${esc(f.title||'')}" ${lk} onchange="fmtSet('title',this.value,true)"/></div>
      <div class="fm-sec">Finals</div>
      <div class="fm-line">${num('finalists',f.finalists,56)} U.S. citizens or teams reach each final, plus up to ${num('extraNonUS',f.extraNonUS,52)} non-U.S., plus up to ${num('extraJunior10m',f.extraJunior10m,52)} junior divers without the DD on 10-meter.</div>
      <p class="fm-help">Divers who have declared another sport nationality add further places and are not counted here.</p>
      <div class="fm-sec">Qualifier</div>
      <div class="fm-line">The top ${num('qualTopN',f.qualTopN,56)} in each qualifier event advance <label class="fm-chk"><input type="checkbox" ${f.qualOrScore?'checked':''} ${lk} onchange="fmtSetFlag('qualOrScore',this.checked)"/> and so does anyone who meets the qualifying score</label></div>
      <div class="fm-sec">Individual events</div>
      <table class="fm-tbl"><thead><tr><th>Event</th><th>Dives</th><th>Minimum DD</th><th>Qualifying score</th><th>Per optional</th><th>Score at NCAA events</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      <div class="fm-sec">Synchronized events</div>
      <table class="fm-tbl"><thead><tr><th>Event</th><th>Dives</th><th>Minimum DD</th><th>Optionals DD</th></tr></thead><tbody>${synHtml}</tbody></table>
      <div class="fm-sec">Competitions where a qualifying score counts</div>
      <textarea class="fi" rows="${Math.max(4,(f.qualEvents||[]).length+1)}" style="width:100%;font-size:12px;line-height:1.5" ${lk} onchange="fmtSetLines('qualEvents',this.value)" placeholder="One per line">${esc((f.qualEvents||[]).join('\n'))}</textarea>
      <div class="hours-grid" style="margin-top:10px">
        <div class="fg"><label class="fl">Late fees begin (5 p.m. ET)</label><input class="fi" value="${esc(f.lateFee||'')}" ${lk} onchange="fmtSet('lateFee',this.value,true)"/></div>
        <div class="fg"><label class="fl">Federation requests and proof of score due</label><input class="fi" value="${esc(f.federation||'')}" ${lk} onchange="fmtSet('federation',this.value,true)"/></div>
      </div>
      <div class="fm-sec">What this does to the schedule</div>
      ${effect}${effNote}
      <p class="fm-help">Nothing here moves a block or changes an entry count. The same findings appear in the health check.</p>
    </div>
    <div class="modal-foot">
      ${S.locked?'':`<button class="btn btn-gh" onclick="fmtRemove()">Remove format</button>`}
      <div style="flex:1"></div>
      <button class="btn" onclick="openQualCheck()" title="Who has a qualifying score, from the results database">Qualifying scores check</button>
      <button class="btn" onclick="printFormatDoc()">Print format document</button>
      <button class="btn btn-p" onclick="closeModal()">Done</button>
    </div></div>`;
}

// ── PRINTED DOCUMENT ──────────────────────────────────────────────────
// Advancement & Event Format plus the standards tables, from the same numbers
// the schedule is checked against. Plain black on white, no decoration.
function fmtDocHTML(){
  const f=fmt();if(!f)return'';
  const e=esc;
  const base=fmtNum(f.finalists)||12,nonUS=fmtNum(f.extraNonUS)||0,jr=fmtNum(f.extraJunior10m)||0;
  const numWord=n=>({1:'one',2:'two',3:'three',4:'four',5:'five',6:'six',7:'seven',8:'eight',9:'nine',10:'ten',11:'eleven',12:'twelve'}[n]||String(n));
  const dd=v=>fmtNum(v)==null?'':Number(v).toFixed(1);
  const poss=g=>g==='Women'?'Women’s':'Men’s';
  const jrNote=jr?`<p class="note">Please note: Junior divers must perform all dives from 10-meter, but do not need to meet the minimum DD requirements. No more than two voluntary dives may be included in the junior diver’s list. To be considered for team selection, divers must meet the degree of difficulty requirements.</p>`:'';
  const ind=(f.rows||[]).map(r=>`<h3>${poss(r.g)} ${e(fmtAppLabel(r.a))} (Preliminary &amp; Final)</h3>
    <p>Divers will perform ${e(r.dives)} dives in the Preliminary${dd(r.dd)?`, with a minimum cumulative D.D. of ${dd(r.dd)}`:''}.</p>
    <p>The top ${base} athletes will progress to the Final.</p>
    <p>The ranking of the finalists shall be determined by the total points scored in the Preliminary and Final.</p>${r.a==='10m'?jrNote:''}`).join('');
  const syn=(f.synchro||[]).map(r=>`<h3>${poss(r.g)} Synchronized ${e(fmtAppLabel(r.a))} (Preliminary &amp; Final)</h3>
    <p>Divers will perform ${e(r.dives)} dives as a pair${dd(r.dd)?`, with a minimum cumulative D.D. of ${dd(r.dd)}`:''}, including the first 2 dives at a fixed Degree of Difficulty (2.0).</p>
    <p>The top ${base} teams will progress to the Final.</p>
    <p>The ranking of the finalists shall be determined by the total points scored in the Preliminary and Final.</p>`).join('');
  const sc=(v,o)=>fmtNum(v)==null?'':`${e(v)}${fmtNum(o)!=null?` (${e(o)}/opt)`:''}`;
  const rowBy=(g,a)=>(f.rows||[]).find(r=>r.g===g&&r.a===a)||{};
  const showNcaa=(f.rows||[]).some(r=>r.g==='Women'&&fmtNum(r.ncaa)!=null&&Number(r.ncaa)!==Number(r.score));
  const t1=`<table><thead><tr><th>Event</th><th>Senior Women${showNcaa?' (USA Diving events)':''}</th>${showNcaa?'<th>Senior Women (NCAA events)</th>':''}<th>Senior Men</th></tr></thead><tbody>${
    FMT_APPS.map(([a,l])=>{const w=rowBy('Women',a),m=rowBy('Men',a);return`<tr><td>${a==='10m'?'Platform':l}</td><td>${sc(w.score,w.opt)}</td>${showNcaa?`<td>${sc(w.ncaa,w.opt)}</td>`:''}<td>${sc(m.score,m.opt)}</td></tr>`;}).join('')}</tbody></table>`;
  const tj=(f.junior||[]).length?`<p class="cap">Junior standards</p><table><thead><tr><th>Event</th>${f.junior.map(j=>`<th>${e(j.grp)}</th>`).join('')}</tr></thead><tbody>
    <tr><td>1-Meter</td>${f.junior.map(j=>`<td>${sc(j.m1,j.o1)}</td>`).join('')}</tr>
    <tr><td>3-Meter</td>${f.junior.map(j=>`<td>${sc(j.m3,j.o3)}</td>`).join('')}</tr>
    <tr><td>Platform</td>${f.junior.map(j=>`<td>${sc(j.pl,j.op)}</td>`).join('')}</tr></tbody></table>`:'';
  const t3=`<table><thead><tr><th>Event</th><th>Women</th><th>Men</th></tr></thead><tbody>${FMT_APPS.map(([a,l])=>`<tr><td>${l}</td><td>${dd(rowBy('Women',a).dd)}</td><td>${dd(rowBy('Men',a).dd)}</td></tr>`).join('')}</tbody></table>`;
  const synBy=(g,a)=>(f.synchro||[]).find(r=>r.g===g&&r.a===a)||{};
  const sd=r=>dd(r.dd)?`${dd(r.dd)}${dd(r.ddOpt)?` (${dd(r.ddOpt)} for optionals)`:''}`:'';
  const t4=`<table><thead><tr><th>Event</th><th>Women</th><th>Men</th></tr></thead><tbody>${[['3m','Synchronized 3-Meter'],['10m','Synchronized 10-Meter']].map(([a,l])=>`<tr><td>${l}</td><td>${sd(synBy('Women',a))}</td><td>${sd(synBy('Men',a))}</td></tr>`).join('')}</tbody></table>`;
  const extraRules=(nonUS||jr)?`<p>If any divers or teams within the top ${base} are non-U.S. citizens${jr?' or, in the case of 10-meter, junior divers not meeting DD requirements':''}, the following procedures apply:</p>
    <ul>
      <li>No more than ${numWord(Math.max(nonUS,jr))} athletes from ${nonUS&&jr?'each of these groups':'this group'} may advance${nonUS&&jr?`, for a maximum of ${numWord(nonUS+jr)} additional athletes`:''}.</li>
      ${nonUS?`<li>If more than ${numWord(nonUS)} eligible non-U.S. citizens place in the top ${base}, only the ${numWord(nonUS)} highest-placing athletes will advance.</li>`:''}
      ${jr?`<li>If more than ${numWord(jr)} junior divers not meeting the DD on 10-meter place in the top ${base}, only the ${numWord(jr)} highest-placing athletes will advance.</li>`:''}
      <li>U.S. citizens finishing ${base+1}th or lower will be added until there are ${base} U.S. citizens in the final.</li>
    </ul>
    <p>Non-U.S. citizen divers and teams will not displace a U.S. diver who has met the DD requirements from advancing or medaling. They will appear in the final standings as exhibition.</p>`:'';
  const qual=fmtNum(f.qualTopN)?`<h2>Qualifier</h2><p>In each qualifier event, any diver who places in the top ${e(f.qualTopN)}${f.qualOrScore?' or meets the qualifying score listed in Table 1':''} will earn a spot in the corresponding event at the Championships.</p>`:'';
  const dl=(f.lateFee||f.federation)?`<h2>Deadlines</h2>${f.federation?`<p>Federation requests and proof of score: 5 p.m. ET on ${e(f.federation)}.</p>`:''}${f.lateFee?`<p>Late fees go into effect at 5 p.m. ET on ${e(f.lateFee)}.</p>`:''}`:'';
  return`<h1>${e(f.title||S.meet.name||'')}</h1><p class="sub">Advancement &amp; Event Format</p>
    <h2>Finals advancement</h2>
    <p>Finals will include ${base} U.S. citizens or teams from the preliminary round. In some cases, the final may have more than ${base} athletes or teams.</p>
    <p>If any divers or teams within the top ${base} are athletes with dual citizenship who have officially declared their sport nationality for a country other than the United States and have competed for that country, an additional U.S. citizen or team will advance. Those athletes do not displace U.S. divers, and the total number of finalists will increase accordingly.</p>
    ${extraRules}
    ${qual}
    <h2>Event format</h2>${ind}${syn}
    <h2>Standards for eligibility</h2>
    <p class="cap">Table 1: Minimum qualifying score requirements for event eligibility</p>${t1}${tj}
    ${(f.qualEvents||[]).length?`<p class="cap">Table 2: Competitions where a qualifying score may be achieved</p><ul>${f.qualEvents.map(x=>`<li>${e(x)}</li>`).join('')}</ul>`:''}
    <p class="cap">Table 3: Minimum degree of difficulty for individual events</p>${t3}
    <p class="cap">Table 4: Minimum total degree of difficulty for synchronized events</p>${t4}
    ${dl}`;
}
function printFormatDoc(){
  const body=fmtDocHTML();if(!body){toast('Add a meet format first');return;}
  const w=window.open('','_blank');
  if(!w){toast('Pop-up blocked. Allow pop-ups for this site to print the format document');return;}
  const css=`*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;font-size:11pt;line-height:1.4;max-width:7.2in;margin:0.5in auto;padding:0 0.2in}
h1{font-size:16pt;margin:0 0 2pt;text-align:center}.sub{text-align:center;font-size:13pt;font-weight:bold;margin:0 0 16pt}
h2{font-size:12pt;margin:16pt 0 6pt;text-transform:uppercase}h3{font-size:11pt;margin:12pt 0 3pt}p{margin:0 0 6pt}ul{margin:0 0 8pt 18pt;padding:0}li{margin-bottom:3pt}
.note{font-style:italic}.cap{font-weight:bold;margin:12pt 0 4pt}
table{border-collapse:collapse;width:100%;margin-bottom:8pt}th,td{border:1px solid #000;padding:4pt 7pt;text-align:left;font-size:10.5pt}th{font-weight:bold}
h3,table,ul{break-inside:avoid}@page{size:letter portrait;margin:0.75in}@media print{body{margin:0;max-width:none;padding:0}.np{display:none}}
.np{position:fixed;top:10px;right:10px;font:600 13px Arial;padding:8px 16px;border:1px solid #000;background:#fff;cursor:pointer}`;
  w.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc((fmt().title||S.meet.name||'Meet')+' Advancement and Event Format')}</title><style>${css}</style></head><body><button class="np" onclick="window.print()">Print</button>${body}</body></html>`);
  w.document.close();
}

// ── QUALIFYING SCORES CHECK ───────────────────────────────────────────
// An independent look at who has a qualifying score, read live from the results
// database (nothing is stored). It applies the format's Table 1 scores to the
// competitions it can identify, one round at a time, and keeps anything whose
// list length it cannot confirm in a separate group. It is a second list to hold
// against the one DiveMeets builds; the published criteria decide who is in.
const QC_USA_GROUPS=['USA Diving Nationals','USA Diving Nationals Qualifier','USA Diving Winter Nationals','USA Diving Winter Nationals Qualifier'];
const QC_NOT_CHECKED=[
  'National Team members and Junior High Performance Squad members (rosters are not in the results data)',
  'Junior Nationals Group A and B (the standard is on optional dives only)',
  'NCAA Division II and III champions',
  'Scores at a home country’s national championships, and anything approved by petition',
  'Citizenship and federation permission (nationality is blank on most result rows)'
];
let QC={state:'idle',rows:null,err:null,asOf:null,paste:'',ev:''};
function openQualCheck(){UI.modal='qualcheck';render();if(QC.state==='idle')qcLoad();}
async function qcLoad(){
  const f=fmt();if(!f)return;
  QC.state='loading';QC.err=null;if(UI.modal==='qualcheck')render();
  const lows=(f.rows||[]).flatMap(r=>[fmtNum(r.score),fmtNum(r.ncaa)]).filter(v=>v!=null);
  const floor=lows.length?Math.min(...lows):0;
  const sql=`SELECT diver_id,diver_name,team_name,nat,gender,discipline,meet_name,meet_year,competition_family,competition_group,round_stage,phase_dive_count,phase_score_from_dives,posted_score,score_is_cumulative
    FROM core.result_phases
    WHERE meet_year IN (2025,2026) AND COALESCE(is_synchronized,false)=false
      AND gender IN ('Female','Male') AND discipline IN ('1m','3m','Platform')
      AND GREATEST(COALESCE(phase_score_from_dives,0),COALESCE(posted_score,0))>=$1
      AND ((competition_group IN (${QC_USA_GROUPS.map(g=>"'"+g.replace(/'/g,"''")+"'").join(',')}) AND event_level='Senior')
        OR (competition_family='World Aquatics' AND nat IN ('USA','United States'))
        OR (competition_family='NCAA' AND ncaa_division='Division I' AND (competition_group ILIKE '%zone%' OR competition_group ILIKE '%championship%')))`;
  try{
    const r=await nq(sql,[floor]);
    QC.rows=(r.rows||[]).map(a=>({id:a[0],name:a[1],team:a[2],nat:a[3],g:a[4]==='Female'?'Women':'Men',d:a[5],meet:a[6],year:Number(a[7]),fam:a[8],grp:a[9],round:a[10],
      n:a[11]==null?null:Number(a[11]),phase:a[12]==null?null:Number(a[12]),posted:a[13]==null?null:Number(a[13]),cum:a[14]===true||a[14]==='t'||a[14]==='true'}));
    try{const m=await nq(`SELECT max(imported_at) FROM core.result_phases WHERE meet_year=2026`);QC.asOf=m.rows&&m.rows[0]&&m.rows[0][0]?String(m.rows[0][0]).slice(0,10):null;}catch{}
    QC.state='ready';
  }catch(e){QC.state='error';QC.err=(e&&e.message)||'Could not read the results database';}
  if(UI.modal==='qualcheck')render();
}
function qcRoute(row){
  if(row.fam==='World Aquatics')return{k:'wa',l:'World Aquatics event',ncaa:false};
  if(row.fam==='NCAA'){
    if(/zone/i.test(row.grp||''))return{k:'zone',l:'NCAA Division I Zone',ncaa:true};
    if(/^NCAA Division I Championships$/i.test(row.grp||''))return{k:'ncaa',l:'NCAA Division I Championships',ncaa:true};
    return{k:'conf',l:'NCAA Division I conference (needs HPD approval)',ncaa:true};
  }
  return{k:'usa',l:row.grp||'USA Diving',ncaa:false};
}
// Sort every row into: meets the score with the list length confirmed, or meets
// it on paper but the list length is missing or different. One line per athlete
// per event, best confirmed score first.
function qcAnalyse(){
  const f=fmt();if(!f||!QC.rows)return{events:[]};
  const key=d=>d==='Platform'?'10m':String(d).toLowerCase();
  const by=new Map();
  QC.rows.forEach(row=>{
    const fr=(f.rows||[]).find(x=>x.g===row.g&&x.a===key(row.d));if(!fr)return;
    const rt=qcRoute(row);
    const thr=fmtNum(rt.ncaa?(fr.ncaa!==''&&fr.ncaa!=null?fr.ncaa:fr.score):fr.score);if(thr==null)return;
    const opt=fmtNum(fr.opt);
    const expect=opt?Math.round(thr/opt):fmtNum(fr.dives);
    // A cumulative posted total is prelim plus final; only the round's own dives count.
    const own=row.phase!=null?row.phase:(row.cum?null:row.posted);
    let status=null,score=own;
    if(own!=null&&own>=thr&&row.n!=null&&row.n===expect)status='ok';
    else if(own!=null&&own>=thr)status='look';
    else if(own==null&&row.posted!=null&&row.posted>=thr){status='look';score=row.posted;}
    if(!status)return;
    const why=status==='ok'?'':(row.n==null?'dive count not recorded':(row.n!==expect?`${row.n} dives, standard is on ${expect}`:(row.cum&&row.phase==null?'cumulative total only':'')));
    const evKey=fr.g+'|'+fr.a;
    const k=evKey+'|'+(row.id||row.name);
    const cur=by.get(k);
    const cand={evKey,g:fr.g,a:fr.a,id:row.id,name:row.name,team:row.team,nat:row.nat,score,thr,status,why,meet:row.meet,year:row.year,round:row.round,n:row.n,route:rt.l,routeK:rt.k,routes:new Set([rt.k])};
    if(!cur){by.set(k,cand);return;}
    cur.routes.add(rt.k);
    const better=(cand.status==='ok'&&cur.status!=='ok')||(cand.status===cur.status&&(cand.routeK!=='conf'&&cur.routeK==='conf'||(cand.routeK==='conf')===(cur.routeK==='conf')&&cand.score>cur.score));
    if(better){cand.routes=cur.routes;by.set(k,cand);}
  });
  const events=(f.rows||[]).map(fr=>{
    const list=[...by.values()].filter(x=>x.evKey===fr.g+'|'+fr.a);
    // Conference-only athletes are held apart: the route needs an approval this page cannot see.
    const confOnly=x=>x.routes.size===1&&x.routes.has('conf');
    const ok=list.filter(x=>x.status==='ok'&&!confOnly(x)).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    const conf=list.filter(x=>x.status==='ok'&&confOnly(x)).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    const look=list.filter(x=>x.status==='look').sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    return{key:fr.g+'|'+fr.a,label:`${fr.g} ${fmtAppLabel(fr.a)}`,thr:fr.score,ncaa:fr.ncaa,ok,conf,look};
  });
  return{events};
}
function qcNorm(s){
  s=String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  if(s.includes(','))s=s.split(',').map(x=>x.trim()).reverse().join(' ');
  return s.replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim();
}
// Names pasted from the DiveMeets list that have no qualifying score here.
function qcCompare(A){
  const names=String(QC.paste||'').split('\n').map(x=>x.trim()).filter(Boolean);
  if(!names.length)return null;
  const have=new Map();
  A.events.forEach(e=>[...e.ok,...e.conf,...e.look].forEach(x=>{const k=qcNorm(x.name);if(!have.has(k))have.set(k,[]);have.get(k).push(e.label+(x.status==='look'?' (needs a look)':e.conf.includes(x)?' (conference only)':''));}));
  const missing=[],found=[];
  names.forEach(n=>{const k=qcNorm(n);if(!k)return;(have.has(k)?found:missing).push({n,where:have.get(k)||[]});});
  return{total:names.length,missing,found};
}
function qcSetPaste(v){QC.paste=v;render();}
function qcCsv(){
  const A=qcAnalyse();const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const lines=[['Event','Athlete','Team','Group','Score','Standard','Dives','Meet','Round','Route','Note'].join(',')];
  A.events.forEach(e=>[['Meets the score',e.ok],['Conference only',e.conf],['Needs a look',e.look]].forEach(([grp,l])=>l.forEach(x=>lines.push([e.label,x.name,x.team,grp,x.score,x.thr,x.n,x.meet,x.round,x.route,x.why].map(q).join(','))))); 
  const blob=new Blob([lines.join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='qualifying-scores-check.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
function renderQualCheckModal(){
  const f=fmt();
  const hd=`<div class="modal-hd"><div><span class="modal-title">Qualifying scores check</span><div style="font-size:11px;color:var(--tx3);margin-top:2px">Who has a Table 1 score at a Table 2 competition, from the results database. A second list to hold against the DiveMeets list.</div></div><button class="modal-close" aria-label="Close" onclick="closeModal()">&times;</button></div>`;
  const foot=`<div class="modal-foot"><button class="btn btn-gh" onclick="openFormat()">Back to format</button><div style="flex:1"></div>${QC.state==='ready'?`<button class="btn" onclick="qcCsv()">Download CSV</button>`:''}<button class="btn" onclick="QC.state='idle';qcLoad()">Refresh</button><button class="btn btn-p" onclick="closeModal()">Done</button></div>`;
  let body;
  if(!f)body=`<p class="fm-help">Add a meet format first. The check uses its qualifying scores.</p>`;
  else if(QC.state==='loading'||QC.state==='idle')body=`<div class="hours-note">Reading results…</div>`;
  else if(QC.state==='error')body=`<div class="hours-note bad">Could not read the results database: ${esc(QC.err)}</div>`;
  else{
    const A=qcAnalyse();const cmp=qcCompare(A);
    const cur=A.events.find(e=>e.key===QC.ev)||A.events[0];
    const tabs=A.events.map(e=>`<button class="evf-chip ${cur&&e.key===cur.key?'on':''}" onclick="QC.ev='${e.key}';render()">${esc(e.label)} <b>${e.ok.length}</b></button>`).join('');
    const tbl=(l,showWhy)=>l.length?`<table class="fm-tbl"><thead><tr><th>Athlete</th><th>Team</th><th>Score</th><th>Dives</th><th>Where</th>${showWhy?'<th>Why it needs a look</th>':''}</tr></thead><tbody>${l.map(x=>`<tr><td class="fm-ev">${esc(x.name)}</td><td>${esc(x.team||'')}</td><td>${x.score!=null?Number(x.score).toFixed(2):''}</td><td>${x.n==null?'':x.n}</td><td class="fm-why">${esc(x.meet)}${x.round?', '+esc(x.round):''}<div class="fm-ok">${esc(x.route)}</div></td>${showWhy?`<td class="fm-why">${esc(x.why)}</td>`:''}</tr>`).join('')}</tbody></table>`:`<p class="fm-help">None.</p>`;
    const cmpHtml=cmp?`<div class="hours-note ${cmp.missing.length?'warn':''}">${cmp.total} name${cmp.total===1?'':'s'} pasted. ${cmp.found.length} ha${cmp.found.length===1?'s':'ve'} a qualifying score here. <b>${cmp.missing.length}</b> do${cmp.missing.length===1?'es':''} not${cmp.missing.length?', so check these by hand':''}.</div>
      ${cmp.missing.length?`<div class="qc-miss">${cmp.missing.map(m=>`<span>${esc(m.n)}</span>`).join('')}</div><p class="fm-help">A name can be missing here and still be correctly qualified by a route this page does not check (listed at the bottom), or because the name is spelled differently in the results.</p>`:''}`:'';
    body=`
      <div class="fm-sec">Compare with the DiveMeets list</div>
      <textarea class="fi" rows="4" style="width:100%;font-size:12px;line-height:1.5" placeholder="Paste the qualified athletes' names here, one per line (First Last or Last, First)" onchange="qcSetPaste(this.value)">${esc(QC.paste)}</textarea>
      ${cmpHtml}
      <div class="fm-sec">By event</div>
      <div class="evf-row" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${tabs}</div>
      ${cur?`
      <div class="qc-h">Meets the score, list length confirmed <span>${cur.ok.length}</span></div>
      <p class="fm-help">Standard ${esc(cur.thr)}${cur.ncaa!==''&&cur.ncaa!=null&&Number(cur.ncaa)!==Number(cur.thr)?` (${esc(cur.ncaa)} at NCAA events)`:''}. One line per athlete, best confirmed score. Scores are a single round's own dives, never a prelim-plus-final total.</p>
      ${tbl(cur.ok)}
      <div class="qc-h">Score only at a conference championship <span>${cur.conf.length}</span></div>
      <p class="fm-help">Counts only if High Performance approved that conference meet.</p>
      ${tbl(cur.conf)}
      <div class="qc-h">Needs a look <span>${cur.look.length}</span></div>
      <p class="fm-help">The number clears the standard but the list length is missing or different, so it is not counted above.</p>
      ${tbl(cur.look,true)}`:''}
      <div class="fm-sec">Not checked here</div>
      <ul class="qc-not">${QC_NOT_CHECKED.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      <p class="fm-help">Results as loaded${QC.asOf?` through ${esc(QC.asOf)}`:''}. ${QC.rows.length} result rows at or above the lowest standard were read.</p>`;
  }
  return`<div class="modal fm-modal fm-wide" onclick="event.stopPropagation()">${hd}<div class="modal-body">${body}</div>${foot}</div>`;
}
