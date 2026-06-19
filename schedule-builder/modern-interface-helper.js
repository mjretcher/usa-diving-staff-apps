(function(){
  "use strict";
  function inject(){
    if(document.getElementById("modernInterfaceHelperStyles")) return;
    var s=document.createElement("style");
    s.id="modernInterfaceHelperStyles";
    s.textContent=`
      :root{--ui-blue:#171F69;--ui-red:#E31937;--ui-cyan:#009AC7;--ui-sky:#8FC3EA;--ui-line:rgba(23,31,105,.13);--ui-shadow:0 18px 50px rgba(23,31,105,.12);--ui-soft:0 8px 28px rgba(23,31,105,.08);--ui-radius:22px;}
      body.modern-usad-ui{background:linear-gradient(180deg,#f8fbff 0%,#eef3fa 100%)!important;}
      body.modern-usad-ui .panel,body.modern-usad-ui .session-card,body.modern-usad-ui .day-lane,body.modern-usad-ui .catalog-add-card,body.modern-usad-ui .selected-event-panel,body.modern-usad-ui .schedule-health-panel,body.modern-usad-ui .builder-flow-dock,body.modern-usad-ui .preview-pane,body.modern-usad-ui [class*="modal"]{border-color:var(--ui-line)!important;border-radius:var(--ui-radius)!important;box-shadow:var(--ui-soft)!important;}
      body.modern-usad-ui .session-card,body.modern-usad-ui .catalog-event-card,body.modern-usad-ui .sb-cat-item,body.modern-usad-ui .scheduled-event,body.modern-usad-ui .sb-lib-item{transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease;}
      body.modern-usad-ui .session-card:hover,body.modern-usad-ui .catalog-event-card:hover,body.modern-usad-ui .sb-cat-item:hover,body.modern-usad-ui .scheduled-event:hover,body.modern-usad-ui .sb-lib-item:hover{transform:translateY(-1px);box-shadow:var(--ui-shadow)!important;}
      body.modern-usad-ui input:focus,body.modern-usad-ui select:focus,body.modern-usad-ui textarea:focus,body.modern-usad-ui button:focus-visible{outline:none!important;border-color:var(--ui-cyan)!important;box-shadow:0 0 0 4px rgba(0,154,199,.16)!important;}
      body.modern-usad-ui .primary-button,body.modern-usad-ui .compact-primary,body.modern-usad-ui .catalog-add-button{background:linear-gradient(135deg,var(--ui-blue),#27308f)!important;border:0!important;color:#fff!important;box-shadow:0 12px 28px rgba(23,31,105,.22)!important;}
      body.modern-usad-ui .builder-day-tabs,body.modern-usad-ui .sb-day-tabs,body.modern-usad-ui .preview-toolbar,body.modern-usad-ui .entry-mode-toolbar{position:sticky;top:0;z-index:10;backdrop-filter:blur(14px);background:rgba(255,255,255,.86)!important;border:1px solid rgba(23,31,105,.08)!important;border-radius:18px!important;box-shadow:0 8px 24px rgba(23,31,105,.08)!important;}
      body.modern-usad-ui .builder-day-tab.active,body.modern-usad-ui .sb-day-tab.active,body.modern-usad-ui .segmented button.active,body.modern-usad-ui .entry-mode-switch button.active{background:linear-gradient(135deg,var(--ui-blue),#27308f)!important;color:#fff!important;box-shadow:0 8px 22px rgba(23,31,105,.20)!important;}
      body.modern-usad-ui .entry-manager-modal{width:min(1120px,calc(100vw - 28px))!important;max-width:calc(100vw - 28px)!important;max-height:calc(100vh - 28px)!important;overflow:hidden!important;}
      body.modern-usad-ui .entry-manager-table-wrap{overflow-x:hidden!important;overflow-y:auto!important;}body.modern-usad-ui .entry-manager-table{width:100%!important;table-layout:fixed!important;}body.modern-usad-ui .entry-manager-table th,body.modern-usad-ui .entry-manager-table td{white-space:normal!important;overflow-wrap:anywhere!important;}
      body.modern-usad-ui .usad-modern-brand-mark{display:flex;align-items:center;gap:10px;margin:8px 0 14px;padding:10px 12px;border-radius:18px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);}body.modern-usad-ui .usad-modern-brand-mark img{max-width:160px;height:auto;display:block;}
    `;
    document.head.appendChild(s);
  }
  function brand(){
    var rail=document.querySelector(".left-rail,.sb-sidebar,[class*='sidebar']");
    if(!rail||rail.querySelector(".usad-modern-brand-mark")) return;
    var logo=window.USAD_ASSETS&&(window.USAD_ASSETS.logoWhite||window.USAD_ASSETS.logo);
    if(!logo) return;
    var mark=document.createElement("div");
    mark.className="usad-modern-brand-mark";
    mark.innerHTML='<img src="'+logo+'" alt="USA Diving">';
    rail.insertBefore(mark,rail.firstChild);
  }
  function install(){document.body.classList.add("modern-usad-ui");inject();brand();}
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install); else install();
  setInterval(install,1000);
})();