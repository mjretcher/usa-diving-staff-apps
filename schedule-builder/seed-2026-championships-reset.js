/* Reset library schedules for 2026 Junior Nationals, National Qualifier/USA Nationals, and combined championship schedule.
   Source: uploaded Junior V3 public schedule PDF and Senior/National Qualifier operations PDF. */
(function seed2026ChampionshipsReset(){
  const KEY="usa-diving-schedule-builder-saved-schedules-v1";
  const UPDATED="2026-06-09T16:30:00.000Z";
  const VENUE="Peak Health Aquatic Center at Mylan Park, Morgantown, WV";
  const TZ="America/New_York";
  const OLD_IDS=new Set([
    "junior-nationals-v3-2026",
    "saved-2026-junior-nationals-version-3",
    "saved-2026-junior-senior-nationals-junior-version-2"
  ]);
  const IDS={
    junior:"saved-2026-usa-diving-junior-national-championships",
    senior:"saved-2026-usa-diving-national-championships-qualifier",
    combined:"saved-combined-2026-usa-diving-junior-and-usa-national-championships"
  };
  const NAMES={
    junior:"2026 USA Diving Junior National Championships",
    senior:"2026 USA Diving National Championships & National Championships Qualifier",
    combined:"Combined 2026 USA Diving Junior & USA National Championships"
  };
  const juniorDates=["2026-07-28","2026-07-29","2026-07-30","2026-07-31","2026-08-01","2026-08-02","2026-08-03","2026-08-04"];
  const seniorDates=["2026-08-04","2026-08-05","2026-08-06","2026-08-07","2026-08-08","2026-08-09","2026-08-10","2026-08-11"];
  const combinedDates=["2026-07-28","2026-07-29","2026-07-30","2026-07-31","2026-08-01","2026-08-02","2026-08-03","2026-08-04","2026-08-05","2026-08-06","2026-08-07","2026-08-08","2026-08-09","2026-08-10","2026-08-11"];
  const dayId=d=>`day-${d}`;
  const slug=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const app=a=>a==="1m"?"1-Meter":a==="3m"?"3-Meter":a==="10m"?"10-Meter":a;
  const lane=a=>(a==="Platform"||a==="10m"||a==="10-Meter")?"platform":String(a).toLowerCase();
  const restrictedNote="Restricted: USA Nationals / National Qualifier entrants only. Junior-only athletes excluded. Athletes entered in both Junior Nationals and USA Nationals/Qualifier are eligible.";

  const juniorData=[
    ["B","2026-07-28","jn-reset-full-practice","Junior Nationals official practice - full facility day",390,810,""],
    ["B","2026-07-29","jn-reset-open-training-before-2pm","Junior Nationals open training - before 2 PM competition start",390,450,"Junior Nationals open training before the first competition block; competition session begins at approximately 2 PM."],
    ["S","2026-07-29","jn-reset-session-01","Session 1",840,55,[["Group B","Boys","1m","Individual","Prelim",9,40,35,3,""],["Group A","Boys","3m","Individual","Prelim",10,42,35,3,""]]],
    ["S","2026-07-29","jn-reset-session-02","Session 2",1030,35,[["Group B","Boys","1m","Individual","Final",4,12,35,0,""],["Group A","Boys","3m","Individual","Final",5,12,35,0,""]]],
    ["S","2026-07-30","jn-reset-session-03","Session 3",480,55,[["Group A","Boys","1m","Individual","Prelim",10,47,35,3,""],["Group B","Girls","3m","Individual","Prelim",8,40,35,3,""],["Group B","Boys","Platform","Individual","Prelim",8,40,35.62,0,""]]],
    ["S","2026-07-30","jn-reset-session-04","Session 4",725,55,[["Group A","Girls","Platform","Individual","Prelim",8,42,32.14,0,""]]],
    ["S","2026-07-30","jn-reset-session-05","Session 5",970,35,[["Group A","Boys","1m","Individual","Final",5,12,35,0,""],["Group B","Girls","3m","Individual","Final",3,12,35,0,""],["Group B","Boys","Platform","Individual","Final",4,12,45,0,""]]],
    ["S","2026-07-30","jn-reset-session-06","Session 6",1070,35,[["Group A","Girls","Platform","Individual","Final",4,12,45,0,""]]],
    ["S","2026-07-31","jn-reset-session-07","Session 7",450,55,[["Group B","Girls","1m","Individual","Prelim",8,42,35,3,""],["Group A","Girls","3m","Individual","Prelim",9,42,35,3,""],["Group A","Boys","Platform","Individual","Prelim",9,42,33.33,0,""]]],
    ["S","2026-07-31","jn-reset-session-08","Session 8",715,55,[["Group C","Boys","1m","Individual","Prelim",8,36,35,3,""],["Group D","Boys","3m","Individual","Prelim",6,27,35,0,""],["Group D","Girls","Platform","Individual","Prelim",6,34,30,0,""]]],
    ["S","2026-07-31","jn-reset-session-09","Session 9",885,35,[["Group B","Girls","1m","Individual","Final",3,12,35,0,""],["Group A","Girls","3m","Individual","Final",4,12,35,0,""],["Group A","Boys","Platform","Individual","Final",5,12,45,0,""]]],
    ["S","2026-07-31","jn-reset-session-10","Session 10",990,35,[["Group C","Boys","1m","Individual","Final",4,12,35,0,""],["Group D","Boys","3m","Individual","Final",3,12,35,0,""],["Group D","Girls","Platform","Individual","Final",3,12,45,0,""]]],
    ["S","2026-08-01","jn-reset-session-11","Session 11",450,55,[["Group A","Girls","1m","Individual","Prelim",9,42,35,3,""],["Group B","Boys","3m","Individual","Prelim",9,39,35,3,""],["Group B","Girls","Platform","Individual","Prelim",7,40,34.29,0,""]]],
    ["S","2026-08-01","jn-reset-session-12","Session 12",670,55,[["Group D","Girls","1m","Individual","Prelim",6,34,35,2,""],["Group C","Boys","3m","Individual","Prelim",8,36,35,3,""],["Group C","Girls","Platform","Individual","Prelim",6,35,36,0,""]]],
    ["S","2026-08-01","jn-reset-session-13","Session 13",865,35,[["Group A","Girls","1m","Individual","Final",4,12,35,0,""],["Group B","Boys","3m","Individual","Final",4,12,35,0,""],["Group B","Girls","Platform","Individual","Final",3,12,45,0,""]]],
    ["S","2026-08-01","jn-reset-session-14","Session 14",955,35,[["Group D","Girls","1m","Individual","Final",3,12,35,0,""],["Group C","Boys","3m","Individual","Final",4,12,35,0,""],["Group C","Girls","Platform","Individual","Final",3,12,45,0,""]]],
    ["S","2026-08-02","jn-reset-session-15","Session 15",480,55,[["Group C","Girls","1m","Individual","Prelim",7,36,35,3,""],["Group D","Girls","3m","Individual","Prelim",6,34,35,2,""],["Group D","Boys","Platform","Individual","Prelim",6,34,30,0,""]]],
    ["S","2026-08-02","jn-reset-session-16","Session 16",650,40,[["Group C","Girls","1m","Individual","Final",3,12,35,0,""],["Group D","Girls","3m","Individual","Final",3,12,35,0,""],["Group D","Boys","Platform","Individual","Final",3,12,45,0,""]]],
    ["B","2026-08-02","jn-reset-restricted-aug02","Restricted senior/qualifier open boards",740,460,"Restricted to USA Nationals / National Qualifier athletes only; junior-only athletes excluded."],
    ["S","2026-08-03","jn-reset-session-17","Session 17",480,55,[["Group D","Boys","1m","Individual","Prelim",6,36,35,2,""],["Group C","Girls","3m","Individual","Prelim",7,35,35,3,""],["Group C","Boys","Platform","Individual","Prelim",7,36,30,0,""]]],
    ["S","2026-08-03","jn-reset-session-18","Session 18",675,40,[["Group D","Boys","1m","Individual","Final",3,12,35,0,""],["Group C","Girls","3m","Individual","Final",3,12,35,0,""],["Group C","Boys","Platform","Individual","Final",4,12,45,0,""]]],
    ["S","2026-08-03","jn-reset-session-19","Session 19",780,60,[["14-18","Girls","3m","Synchronized","Final",5,12,35,0,""],["14-18","Boys","Platform","Synchronized","Final",5,12,45,0,""]]],
    ["B","2026-08-03","jn-reset-restricted-aug03","Restricted senior/qualifier open boards",905,295,"Restricted to USA Nationals / National Qualifier athletes only after the Junior Nationals synchro finals block."],
    ["B","2026-08-04","jn-reset-senior-open-training","Senior open training",390,180,"USA Nationals senior open training before the remaining Junior Nationals synchro finals."],
    ["S","2026-08-04","jn-reset-session-20","Session 20",580,60,[["14-18","Boys","3m","Synchronized","Final",5,12,35,0,""],["14-18","Girls","Platform","Synchronized","Final",5,12,45,0,""]]],
    ["B","2026-08-04","jn-reset-national-qualifier-training","National Qualifier open training",705,495,"Remainder of day restricted to USA Nationals / National Qualifier athletes."]
  ];

  const seniorData=[
    ["B","2026-08-04","sr-reset-senior-open-training","Senior open training",390,180,"USA Nationals senior open training before the remaining Junior Nationals synchro finals."],
    ["S","2026-08-04","sr-reset-session-18","Session 18",580,60,[["14-18","Boys","3m","Synchronized","Final",5,12,35,0,""],["14-18","Girls","Platform","Synchronized","Final",5,12,45,0,""]]],
    ["B","2026-08-04","sr-reset-national-qualifier-training","National Qualifier open training",705,495,"Remainder of day restricted to USA Nationals / National Qualifier athletes."],
    ["B","2026-08-05","sr-reset-open-warmup-aug05","Restricted senior/qualifier open warm-up",420,300,"Restricted to USA Nationals/National Qualifier athletes only. Revised to 7:00 AM-12:00 PM per user request."],
    ["B","2026-08-05","sr-reset-technical-meeting","Technical Meeting",720,60,"Technical Meeting"],
    ["B","2026-08-05","sr-reset-open-training-aug05","Restricted senior/qualifier open training",785,175,"Restricted to USA Nationals/National Qualifier athletes only."],
    ["S","2026-08-05","sr-reset-session-20","Session 20",960,55,[["National Qualifier","Men","3m","Individual","Prelim",6,36,32,0,""],["National Qualifier","Women","10m","Individual","Prelim",5,17,38,0,""]]],
    ["B","2026-08-05","sr-reset-open-warmup-pm-aug05","Restricted senior/qualifier open warm-up - remaining time until 8:00 PM",1140,60,"Custom Block"],
    ["B","2026-08-06","sr-reset-open-practice-aug06","Open Practice",390,90,"Open Practice"],
    ["S","2026-08-06","sr-reset-session-21","Session 21",480,55,[["National Qualifier","Men","10m","Individual","Prelim",6,11,38,0,""],["National Qualifier","Women","1m","Individual","Prelim",5,34,32,0,""]]],
    ["B","2026-08-06","sr-reset-midday-buffer-aug06","Restricted senior/qualifier open boards - midday buffer",635,205,"Custom Block"],
    ["S","2026-08-06","sr-reset-session-22","Session 22",840,45,[["National Qualifier","Women","3m","Individual","Prelim",5,40,32,0,""],["National Qualifier","Men","1m","Individual","Prelim",6,25,32,0,""]]],
    ["B","2026-08-06","sr-reset-post-prelims-aug06","Restricted senior/qualifier open boards - post afternoon prelims",1000,200,"Custom Block"],
    ["B","2026-08-07","sr-reset-restricted-boards-aug07-am","USA Nationals restricted open boards",420,120,restrictedNote],
    ["S","2026-08-07","sr-reset-session-23","Session 23",540,55,[["Senior","Men","3m","Individual","Prelim",6,43,32,0,""],["Senior","Women","10m","Individual","Prelim",5,28,38,0,""]]],
    ["B","2026-08-07","sr-reset-restricted-boards-aug07-midday","USA Nationals restricted open boards",740,210,"USA Nationals restricted open boards"],
    ["S","2026-08-07","sr-reset-session-24","Session 24",960,35,[["Senior","Men","3m","Individual","Final",6,12,32,0,""]]],
    ["S","2026-08-07","sr-reset-session-25","Session 25",1045,35,[["Senior","Women","10m","Individual","Final",5,12,38,0,""]]],
    ["B","2026-08-07","sr-reset-open-practice-aug07","Open Practice",1125,75,"Open Practice"],
    ["B","2026-08-08","sr-reset-restricted-boards-aug08-am","USA Nationals restricted open boards",420,120,restrictedNote],
    ["S","2026-08-08","sr-reset-session-26","Session 26",540,55,[["Senior","Men","1m","Individual","Prelim",6,36,32,0,""],["Senior","Women","3m","Individual","Prelim",5,33,32,0,""]]],
    ["B","2026-08-08","sr-reset-restricted-boards-aug08-midday","USA Nationals restricted open boards",720,180,"USA Nationals restricted open boards"],
    ["S","2026-08-08","sr-reset-session-27","Session 27",910,55,[["Senior","Men","1m","Individual","Final",6,12,32,0,""]]],
    ["S","2026-08-08","sr-reset-session-28","Session 28",1015,35,[["Senior","Women","3m","Individual","Final",5,12,32,0,""]]],
    ["B","2026-08-08","sr-reset-open-practice-aug08","Open Practice",1090,110,"Open Practice"],
    ["B","2026-08-09","sr-reset-restricted-boards-aug09-am","USA Nationals restricted open boards",420,120,restrictedNote],
    ["S","2026-08-09","sr-reset-session-29","Session 29",540,55,[["Senior","Men","10m","Individual","Prelim",6,28,38,0,""],["Senior","Women","1m","Individual","Prelim",5,29,32,0,""]]],
    ["B","2026-08-09","sr-reset-restricted-boards-aug09-midday","USA Nationals restricted open boards",710,250,"USA Nationals restricted open boards"],
    ["S","2026-08-09","sr-reset-session-30","Session 30",970,35,[["Senior","Men","10m","Individual","Final",6,12,38,0,""]]],
    ["S","2026-08-09","sr-reset-session-31","Session 31",1065,35,[["Senior","Women","1m","Individual","Final",5,12,32,0,""]]],
    ["B","2026-08-09","sr-reset-open-practice-aug09","Open Practice",1140,60,"Open Practice"],
    ["B","2026-08-10","sr-reset-restricted-boards-aug10-am","USA Nationals restricted open boards - synchro day 1 morning",420,115,restrictedNote],
    ["S","2026-08-10","sr-reset-session-32","Session 32",535,60,[["Senior Synchro","Women","10m","Synchronized","Prelim",5,6,35,0,""],["Senior Synchro","Men","3m","Synchronized","Prelim",6,9,34,0,""]]],
    ["B","2026-08-10","sr-reset-restricted-boards-aug10-midday","USA Nationals restricted open boards - synchro day 1 midday",635,170,"USA Nationals restricted open boards"],
    ["S","2026-08-10","sr-reset-session-33","Session 33",815,30,[["Senior Synchro","Women","10m","Synchronized","Final",5,6,45,0,""],["Senior Synchro","Men","3m","Synchronized","Final",6,9,45,0,""]]],
    ["B","2026-08-10","sr-reset-open-practice-aug10","Open Practice",895,185,"Open Practice"],
    ["B","2026-08-11","sr-reset-restricted-boards-aug11-am","USA Nationals restricted open boards - synchro day 2 morning",420,115,restrictedNote],
    ["S","2026-08-11","sr-reset-session-34","Session 34",535,55,[["Senior Synchro","Women","3m","Synchronized","Prelim",5,5,40,0,""],["Senior Synchro","Men","10m","Synchronized","Prelim",6,7,40,0,""]]],
    ["B","2026-08-11","sr-reset-restricted-boards-aug11-midday","USA Nationals restricted open boards - synchro day 2 midday",625,180,"USA Nationals restricted open boards"],
    ["S","2026-08-11","sr-reset-session-35","Session 35",815,30,[["Senior Synchro","Women","3m","Synchronized","Final",5,5,45,0,""],["Senior Synchro","Men","10m","Synchronized","Final",6,7,45,0,""]]]
  ];

  function eventFromRow(row, sessionId, index){
    const [level,gender,rawApp,style,round,dives,divers,seconds,splitPanels,notes]=row;
    const apparatus=app(rawApp);
    const isSplit=Number(splitPanels||0)>0;
    const isSynchro=/synchro|synchronized/i.test([level,style].join(" "));
    const display=`${level} ${gender}${isSynchro && !/synchro/i.test(level) ? " Synchro" : ""} ${apparatus}`.replace(/\s+/g," ").trim();
    return {
      id:slug(`${level}-${gender}-${apparatus}-${style}`),
      scheduleEventId:slug(`${sessionId}-${index}-${level}-${gender}-${apparatus}-${round}`),
      eventGroupId:`${sessionId}-lane-${lane(rawApp)}-${index}`,
      level,gender,apparatus,style,display,round,
      numberOfDives:dives,defaultNumberOfDives:dives,numberOfDivers:divers,secondsPerDive:seconds,
      manualSplit:isSplit,numberOfPanelChanges:Number(splitPanels||0),minutesPerPanelChange:3,
      notes:notes||"",canonicalKey:`${level} | ${gender} | ${apparatus} | ${style} | ${round}`,
      projectedAdvancers:round==="Prelim"?12:0,actualAdvancers:0,finalFieldSize:12,domesticEligibleAdvancers:12,
      foreignAthleteAdjustment:0,dualCitizenAdjustment:0,detailsOpen:false
    };
  }
  function block(date,id,title,start,duration,note){
    return {id,dayId:dayId(date),title,isOpenPracticeSession:true,warmupStartMinutes:start,warmupMinutes:0,transitionBufferMinutes:0,roundingIncrementMinutes:5,awardsEnabled:false,locked:false,collapsed:false,events:[{
      id:slug(title)+"-preset",scheduleEventId:id+"-event",eventGroupId:id+"-group",level:"Schedule",gender:"Open",apparatus:"Pool",style:title,display:title,round:"Custom Block",blockTitle:title,customDurationMinutes:duration,numberOfDives:0,defaultNumberOfDives:0,numberOfDivers:0,secondsPerDive:0,notes:note||"",canonicalKey:`${title} | ${date}`,projectedAdvancers:0,actualAdvancers:0,finalFieldSize:0,domesticEligibleAdvancers:0,foreignAthleteAdjustment:0,dualCitizenAdjustment:0
    }]};
  }
  function session(date,id,title,start,warm,events){
    return {id,dayId:dayId(date),title,warmupStartMinutes:start,warmupMinutes:warm,transitionBufferMinutes:5,roundingIncrementMinutes:5,awardsEnabled:false,locked:false,collapsed:false,events:events.map((event,index)=>eventFromRow(event,id,index+1))};
  }
  function sessionsFrom(data){return data.map(row=>row[0]==="B"?block(row[1],row[2],row[3],row[4],row[5],row[6]):session(row[1],row[2],row[3],row[4],row[5],row[6]));}
  function buildSchedule(id,name,dates,data,description){
    return {
      updatedAt:UPDATED,
      meet:{name,venue:VENUE,timezone:TZ,meetType:"custom",canvaUrl:"",updatedAt:UPDATED,days:dates.map(date=>({id:dayId(date),date,openMinutes:390,closeMinutes:1200,locked:false}))},
      profile:{id:"custom",label:"Custom",description,allowedRounds:["Qualifier","Prelim","Semifinal","Final","Custom Block","Open Practice"],roundRelationships:[],events:[]},
      sessions:sessionsFrom(data).sort((a,b)=>a.dayId===b.dayId?Number(a.warmupStartMinutes||0)-Number(b.warmupStartMinutes||0):a.dayId.localeCompare(b.dayId)),
      selectedRound:"Prelim",outputSettings:{publicShowWarmups:true,publicShowOpenPracticeNotes:true,publicPreset:"clean",showEndTimes:true,showSubjectToChange:true},theme:"classic",entryMode:"projected",locks:{entries:false,sessionOrder:false},publishStatus:"review",currentLibraryId:id,schedulePackageId:id,
      scheduleNotes:[{id:`note-${id}`,scope:"meet",audience:"operations",text:description}]
    };
  }

  const combinedData=[...juniorData,...seniorData.filter(row=>row[1]>"2026-08-04")];
  const items=[
    {id:IDS.junior,name:NAMES.junior,updatedAt:UPDATED,schedule:buildSchedule(IDS.junior,NAMES.junior,juniorDates,juniorData,"Standalone Junior National Championships schedule rebuilt from the uploaded Junior V3 PDF, July 28-August 4, using the projected entries previously supplied.")},
    {id:IDS.senior,name:NAMES.senior,updatedAt:UPDATED,schedule:buildSchedule(IDS.senior,NAMES.senior,seniorDates,seniorData,"Standalone National Championships Qualifier and USA Diving National Championships schedule rebuilt from the uploaded senior operations PDF, August 4-August 11, using projected entries from that PDF.")},
    {id:IDS.combined,name:NAMES.combined,updatedAt:UPDATED,schedule:buildSchedule(IDS.combined,NAMES.combined,combinedDates,combinedData,"Combined schedule rebuilt from the uploaded Junior V3 PDF for July 28-August 4 and the uploaded senior operations PDF for August 5-August 11.")}
  ];

  let library=[];
  try{const parsed=JSON.parse(localStorage.getItem(KEY)||"[]");library=Array.isArray(parsed)?parsed:[];}catch(_error){library=[];}
  const resetIds=new Set([...OLD_IDS,Object.values(IDS)].flat());
  library=library.filter(item=>item&&item.id&&!resetIds.has(item.id));
  localStorage.setItem(KEY,JSON.stringify([...items,...library].slice(0,100)));
})();
