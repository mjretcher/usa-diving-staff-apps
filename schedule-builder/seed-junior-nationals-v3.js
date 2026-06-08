/* Seed schedule: 2026 Junior Nationals - Version 3 Working Draft.
   Inserts a Schedule Builder library item without adding a header button or changing the active workspace. */
(function seedJuniorNationalsV3(){
  const KEY="usa-diving-schedule-builder-saved-schedules-v1";
  const ACTIVE_KEY="usa-diving-schedule-builder-standalone-v1";
  const ID="saved-2026-junior-nationals-version-3";
  const V2_ID="saved-2026-junior-senior-nationals-junior-version-2";
  const NAME="2026 Junior Nationals - Version 3 Working Draft";
  const UPDATED="2026-06-08T18:30:00.000Z";
  const JUNIOR_DATES=["2026-07-28","2026-07-29","2026-07-30","2026-07-31","2026-08-01","2026-08-02","2026-08-03","2026-08-04"];
  const FALLBACK_DATES=[...JUNIOR_DATES,"2026-08-05","2026-08-06","2026-08-07","2026-08-08","2026-08-09","2026-08-10","2026-08-11"];
  const dayId=d=>`day-${d}`;
  const slug=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const app=a=>a==="1m"?"1-Meter":a==="3m"?"3-Meter":a==="10m"?"10-Meter":a;
  const lane=a=>(a==="Platform"||a==="10m")?"platform":String(a).toLowerCase();
  const DATA=[
    ["B","2026-07-28","jn-v3-day-01-full-practice","Junior Nationals official practice - full facility day",390,810,"Full facility Junior Nationals official practice day before Competition Day 1."],
    ["B","2026-07-29","jn-v3-day-02-open-training","Junior Nationals open training - before 2 PM competition start",390,450,"Junior Nationals open training before the first competition block; competition session begins at approximately 2 PM."],
    ["S","2026-07-29","jn-v3-session-01","Session V3-1 - A/B Prelims",840,55,[["Group B","Boys","1m","Individual","Prelim",9,40,35,1,3,""],["Group A","Boys","3m","Individual","Prelim",10,42,35,1,3,""]]],
    ["S","2026-07-29","jn-v3-session-02","Session V3-2 - A/B Finals",1080,35,[["Group B","Boys","1m","Individual","Final",4,12,35,0,0,""],["Group A","Boys","3m","Individual","Final",5,12,35,0,0,""]]],
    ["S","2026-07-30","jn-v3-session-03","Session V3-3 - A/B Prelims",480,55,[["Group A","Boys","1m","Individual","Prelim",10,47,35,1,3,""],["Group B","Girls","3m","Individual","Prelim",8,40,35,1,3,""],["Group B","Boys","Platform","Individual","Prelim",8,40,35.62,0,0,""]]],
    ["S","2026-07-30","jn-v3-session-04","Session V3-4 - Group A Girls Platform Prelim",720,55,[["Group A","Girls","Platform","Individual","Prelim",8,42,32.14,0,0,"Standalone session per Version 3 revision."]]],
    ["S","2026-07-30","jn-v3-session-05","Session V3-5 - A/B Finals",900,35,[["Group A","Boys","1m","Individual","Final",5,12,35,0,0,""],["Group B","Girls","3m","Individual","Final",3,12,35,0,0,""],["Group B","Boys","Platform","Individual","Final",4,12,45,0,0,""]]],
    ["S","2026-07-30","jn-v3-session-06","Session V3-6 - Group A Girls Platform Final",1050,35,[["Group A","Girls","Platform","Individual","Final",4,12,45,0,0,"Standalone session per Version 3 revision."]]],
    ["S","2026-07-31","jn-v3-session-07","Session V3-7 - A/B Prelims",450,55,[["Group B","Girls","1m","Individual","Prelim",8,42,35,1,3,""],["Group A","Girls","3m","Individual","Prelim",9,42,35,1,3,""],["Group A","Boys","Platform","Individual","Prelim",9,42,33.33,0,0,""]]],
    ["S","2026-07-31","jn-v3-session-08","Session V3-8 - C/D Prelims",760,55,[["Group C","Boys","1m","Individual","Prelim",8,36,35,1,3,""],["Group D","Boys","3m","Individual","Prelim",6,27,35,0,0,""],["Group D","Girls","Platform","Individual","Prelim",6,34,30,0,0,""]]],
    ["S","2026-07-31","jn-v3-session-09","Session V3-9 - A/B Finals",930,35,[["Group B","Girls","1m","Individual","Final",3,12,35,0,0,""],["Group A","Girls","3m","Individual","Final",4,12,35,0,0,""],["Group A","Boys","Platform","Individual","Final",5,12,45,0,0,""]]],
    ["S","2026-07-31","jn-v3-session-10","Session V3-10 - C/D Finals",1035,35,[["Group C","Boys","1m","Individual","Final",4,12,35,0,0,""],["Group D","Boys","3m","Individual","Final",3,12,35,0,0,""],["Group D","Girls","Platform","Individual","Final",3,12,45,0,0,""]]],
    ["S","2026-08-01","jn-v3-session-11","Session V3-11 - A/B Prelims",450,55,[["Group A","Girls","1m","Individual","Prelim",9,42,35,1,3,""],["Group B","Boys","3m","Individual","Prelim",9,39,35,1,3,""],["Group B","Girls","Platform","Individual","Prelim",7,40,34.29,0,0,""]]],
    ["S","2026-08-01","jn-v3-session-12","Session V3-12 - C/D Prelims",740,55,[["Group D","Girls","1m","Individual","Prelim",6,34,35,1,2,""],["Group C","Boys","3m","Individual","Prelim",8,36,35,1,3,""],["Group C","Girls","Platform","Individual","Prelim",6,35,36,0,0,""]]],
    ["S","2026-08-01","jn-v3-session-13","Session V3-13 - A/B Finals",900,35,[["Group A","Girls","1m","Individual","Final",4,12,35,0,0,""],["Group B","Boys","3m","Individual","Final",4,12,35,0,0,""],["Group B","Girls","Platform","Individual","Final",3,12,45,0,0,""]]],
    ["S","2026-08-01","jn-v3-session-14","Session V3-14 - C/D Finals",1020,35,[["Group D","Girls","1m","Individual","Final",3,12,35,0,0,""],["Group C","Boys","3m","Individual","Final",4,12,35,0,0,""],["Group C","Girls","Platform","Individual","Final",3,12,45,0,0,""]]],
    ["S","2026-08-02","jn-v3-session-15","Session V3-15 - C/D Prelims",480,55,[["Group C","Girls","1m","Individual","Prelim",7,36,35,1,3,""],["Group D","Girls","3m","Individual","Prelim",6,34,35,1,2,""],["Group D","Boys","Platform","Individual","Prelim",6,34,30,0,0,""]]],
    ["S","2026-08-02","jn-v3-session-16","Session V3-16 - C/D Finals",760,40,[["Group C","Girls","1m","Individual","Final",3,12,35,0,0,""],["Group D","Girls","3m","Individual","Final",3,12,35,0,0,""],["Group D","Boys","Platform","Individual","Final",3,12,45,0,0,""]]],
    ["B","2026-08-02","jn-v3-aug02-restricted-boards","Restricted senior/qualifier open boards",900,300,"Restricted to USA Nationals / National Qualifier athletes only; junior-only athletes excluded."],
    ["S","2026-08-03","jn-v3-session-17","Session V3-17 - C/D Prelims",480,55,[["Group D","Boys","1m","Individual","Prelim",6,36,35,1,2,""],["Group C","Girls","3m","Individual","Prelim",7,35,35,1,3,""],["Group C","Boys","Platform","Individual","Prelim",7,36,30,0,0,""]]],
    ["S","2026-08-03","jn-v3-session-18","Session V3-18 - C/D Finals",760,40,[["Group D","Boys","1m","Individual","Final",3,12,35,0,0,""],["Group C","Girls","3m","Individual","Final",3,12,35,0,0,""],["Group C","Boys","Platform","Individual","Final",4,12,45,0,0,""]]],
    ["S","2026-08-03","jn-v3-session-19","Session V3-19 - 14-18 Synchro Finals",930,60,[["14-18","Girls","3m","Synchronized","Final",5,12,35,0,0,""],["14-18","Boys","Platform","Synchronized","Final",5,12,45,0,0,""]]],
    ["B","2026-08-03","jn-v3-aug03-restricted-boards","Restricted senior/qualifier open boards",1080,120,"Restricted to USA Nationals / National Qualifier athletes only after the Junior Nationals synchro finals block."],
    ["B","2026-08-04","jn-v3-aug04-senior-training","Senior open training",390,180,"USA Nationals senior open training before the remaining Junior Nationals synchro finals."],
    ["S","2026-08-04","jn-v3-session-20","Session V3-20 - 14-18 Synchro Finals",570,60,[["14-18","Boys","3m","Synchronized","Final",5,12,35,0,0,""],["14-18","Girls","Platform","Synchronized","Final",5,12,45,0,0,""]]],
    ["B","2026-08-04","jn-v3-aug04-nq-training","National Qualifier open training",720,480,"Remainder of day restricted to USA Nationals / National Qualifier athletes."]
  ];
  function ev(row,sid,i){
    const [level,gender,rawApp,style,round,dives,divers,seconds,split,panels,notes]=row;
    const apparatus=app(rawApp);
    const isSynchro=/synchro|synchronized/i.test(style);
    const display=`${level} ${gender}${isSynchro?" Synchro":""} ${apparatus}`;
    return {id:slug(`${level}-${gender}-${apparatus}-${style}`),scheduleEventId:slug(`${sid}-${i}-${level}-${gender}-${apparatus}-${round}`),eventGroupId:`${sid}-lane-${lane(rawApp)}-${i}`,level,gender,apparatus,style,display,round,numberOfDives:dives,defaultNumberOfDives:dives,numberOfDivers:divers,secondsPerDive:seconds,manualSplit:Boolean(split),numberOfPanelChanges:panels||0,minutesPerPanelChange:0,notes:notes||"",canonicalKey:`${level} | ${gender} | ${apparatus} | ${style} | ${round}`,projectedAdvancers:round==="Prelim"?12:0,actualAdvancers:0,finalFieldSize:12,domesticEligibleAdvancers:12,foreignAthleteAdjustment:0,dualCitizenAdjustment:0};
  }
  function block(date,id,title,start,duration,note){return {id,dayId:dayId(date),title,isOpenPracticeSession:true,warmupStartMinutes:start,warmupMinutes:0,transitionBufferMinutes:0,roundingIncrementMinutes:5,awardsEnabled:false,locked:false,collapsed:false,events:[{id:slug(title)+"-preset",scheduleEventId:id+"-event",eventGroupId:id+"-group",level:"Schedule",gender:"Open",apparatus:"Pool",style:title,display:title,round:"Custom Block",blockTitle:title,customDurationMinutes:duration,numberOfDives:0,defaultNumberOfDives:0,numberOfDivers:0,secondsPerDive:0,notes:note||"",canonicalKey:`${title} | ${date}`}]};}
  function session(date,id,title,start,warm,events){return {id,dayId:dayId(date),title,warmupStartMinutes:start,warmupMinutes:warm,transitionBufferMinutes:5,roundingIncrementMinutes:5,awardsEnabled:events.some(e=>e[4]==="Final"),locked:false,collapsed:false,events:events.map((e,i)=>ev(e,id,i+1))};}
  function readLibrary(){try{const lib=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(lib)?lib:[];}catch(e){return [];}}
  function readActiveSchedule(){try{const parsed=JSON.parse(localStorage.getItem(ACTIVE_KEY)||"null");return parsed&&parsed.schedule?parsed.schedule:parsed;}catch(e){return null;}}
  function findBase(lib){
    const active=readActiveSchedule();
    if(active&&active.meet&&Array.isArray(active.sessions)) return active;
    const v2=lib.find(x=>x&&x.id===V2_ID&&x.schedule);
    if(v2) return v2.schedule;
    const any=lib.find(x=>x&&x.schedule&&x.meet);
    return any?any.schedule:null;
  }
  function dateForSession(schedule,session){return (schedule?.meet?.days||[]).find(d=>d.id===session.dayId)?.date||"";}
  function buildSchedule(base){
    const baseDays=(base?.meet?.days||[]).map(d=>d.date);
    const dates=Array.from(new Set([...(baseDays.length?baseDays:FALLBACK_DATES),...FALLBACK_DATES])).sort();
    const juniorDateSet=new Set(JUNIOR_DATES);
    const newJuniorSessions=DATA.map(x=>x[0]==="B"?block(x[1],x[2],x[3],x[4],x[5],x[6]):session(x[1],x[2],x[3],x[4],x[5],x[6]));
    const preserved=(base?.sessions||[]).filter(s=>{const d=dateForSession(base,s);return d&&d>"2026-08-04"&&!juniorDateSet.has(d);});
    const sessions=[...newJuniorSessions,...preserved].sort((a,b)=>{
      const da=a.dayId.replace(/^day-/,'');
      const db=b.dayId.replace(/^day-/,'');
      if(da!==db) return da.localeCompare(db);
      return Number(a.warmupStartMinutes||0)-Number(b.warmupStartMinutes||0);
    });
    return {updatedAt:UPDATED,meet:{name:NAME,venue:base?.meet?.venue||"Competition Pool",timezone:base?.meet?.timezone||"America/New_York",meetType:"custom",canvaUrl:base?.meet?.canvaUrl||"",updatedAt:UPDATED,days:dates.map(d=>({id:dayId(d),date:d,openMinutes:390,closeMinutes:1200,locked:false}))},profile:{id:"custom",label:"Custom",description:"Junior Version 3 revision: Day 1 competition begins around 2 PM; Group A Girls Platform is moved to standalone prelim/final sessions on Competition Day 2; all same-day individual prelim sessions are completed before same-day finals, with synchro treated as the exception.",allowedRounds:["Qualifier","Prelim","Semifinal","Final","Custom Block","Open Practice"],roundRelationships:[],events:base?.profile?.events||[]},sessions,selectedRound:"Prelim",outputSettings:{publicShowWarmups:true,publicShowOpenPracticeNotes:true,publicPreset:"clean",showEndTimes:true,showSubjectToChange:true},theme:"classic",entryMode:"projected",locks:{entries:false,sessionOrder:false},publishStatus:"review",currentLibraryId:ID,schedulePackageId:ID,scheduleNotes:[{id:"note-version-3-flow",scope:"meet",audience:"operations",text:"Junior Version 3 revision: Competition Day 1 starts around 2 PM after open training. Group A Girls Platform moved to standalone sessions on Competition Day 2. Individual prelim sessions are grouped before individual finals; synchro remains clustered at the end/transition window."}]};
  }
  const lib=readLibrary();
  const schedule=buildSchedule(findBase(lib));
  const item={id:ID,name:NAME,updatedAt:UPDATED,schedule};
  const idx=lib.findIndex(x=>x&&x.id===ID);
  if(idx>=0) lib[idx]=item; else lib.unshift(item);
  localStorage.setItem(KEY,JSON.stringify(lib.slice(0,50)));
})();
