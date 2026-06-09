(function restore2026ChampionshipsOnce(){
  "use strict";
  const FLAG="usa-diving-2026-championship-schedules-restored-once-v1";
  if(localStorage.getItem(FLAG)==="done") return;
  localStorage.setItem(FLAG,"done");
  document.write('<script src="seed-2026-championships-reset.js?v=20260609f"><\/script>');
})();
