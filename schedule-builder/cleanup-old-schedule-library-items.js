(function cleanupOldScheduleLibraryItems(){
  "use strict";

  const KEY="usa-diving-schedule-builder-saved-schedules-v1";
  const RUN_KEY="usa-diving-cleaned-old-schedule-library-items-v1";
  const KEEP_IDS=new Set([
    "saved-2026-usa-diving-junior-national-championships",
    "saved-2026-usa-diving-national-championships-qualifier",
    "saved-combined-2026-usa-diving-junior-and-usa-national-championships"
  ]);
  const REMOVE_IDS=new Set([
    "junior-nationals-v3-2026",
    "saved-2026-junior-nationals-version-3",
    "saved-2026-junior-senior-nationals-junior-version-2"
  ]);
  const REMOVE_NAME_PATTERNS=[
    /2026\s+junior\s+nationals\s*-\s*version\s*3\s+working\s+draft/i,
    /2026\s+junior\s+nationals\s*\+\s*national\s+qualifier\s*\+\s*usa\s+nationals\s*-\s*junior\s+version\s*2/i,
    /2026\s+junior\s+nationals\s*\+\s*national\s+qualifier\s*\+\s*usa\s+nationals\s*-\s*working\s+draft\s*v12\s+junior\s+equipment\s+remap/i
  ];

  function shouldRemove(item){
    if(!item) return false;
    const id=String(item.id||"");
    const name=String(item.name||item.schedule?.meet?.name||"");
    if(KEEP_IDS.has(id)) return false;
    if(REMOVE_IDS.has(id)) return true;
    return REMOVE_NAME_PATTERNS.some((pattern)=>pattern.test(name));
  }

  try{
    const library=JSON.parse(localStorage.getItem(KEY)||"[]");
    if(!Array.isArray(library)) return;
    const cleaned=library.filter((item)=>!shouldRemove(item));
    if(cleaned.length!==library.length){
      localStorage.setItem(KEY,JSON.stringify(cleaned));
      localStorage.setItem(RUN_KEY,new Date().toISOString());
    }
  }catch(_error){}
})();
