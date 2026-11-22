/* =====================================================================
   bs-reports.js -- what is left of the old report builder.

   The builder, its templates and its sections were removed on 2026-11-21.
   Reports now live in the Reports tab (bs-report.js) and are drawn from the
   map on screen. Two things stay here:
     1. the mr-* stylesheet, which the Junior Circuit comparison reports
        (jc-report.js) are drawn with;
     2. the Reports menu in the top bar.
   ===================================================================== */
(function(){
'use strict';

function mount(){
  if (document.getElementById('mr-bar')) return;
  const tabs = document.getElementById('tabs');
  if (!tabs) return;
  const bar = document.createElement('div');
  bar.id = 'mr-bar';
  bar.className = 'mr-bar';
  bar.innerHTML = `
    <span class="mr-bar-lbl">Reports</span>
    <button class="mr-bar-btn mr-bar-prim" id="mrGoReports">Regions and zones</button>
    <button class="mr-bar-btn" onclick="window._jcOpen ? window._jcOpen() : null">Comparison reports</button>`;
  const rep = document.getElementById('topRep');          // the Reports menu in the top bar
  if (rep) rep.appendChild(bar); else tabs.parentNode.insertBefore(bar, tabs.nextSibling);
  bar.querySelector('#mrGoReports').addEventListener('click', () => {
    const bt = document.querySelector('#tabs [data-view="boundary"]');
    if (bt && !bt.classList.contains('active')) bt.click();
    if (window.BoundaryAPI && window.BoundaryAPI.openReports) window.BoundaryAPI.openReports();
  });
}

const STYLES = `
.mr-bar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:0 0 16px;padding:10px 14px;
  background:#fff;border:1px solid #e2e8f2;border-radius:12px;box-shadow:0 4px 12px rgba(16,24,40,.04)}
.mr-bar-lbl{font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;
  letter-spacing:.06em;font-size:13px;color:#171F69;padding-right:4px}
.mr-bar-btn{border:1px solid #cdd6e4;background:#fff;color:#171F69;border-radius:999px;
  padding:8px 15px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
.mr-bar-btn:hover{border-color:#009AC7;color:#00789b}
.mr-bar-prim{background:#171F69;color:#fff;border-color:#171F69}
.mr-bar-prim:hover{background:#0f1650;color:#fff}
.mr-bar-note{margin-left:auto;font-size:12px;color:#6b7390}

/* ---- builder modal ---- */
#mr-modal .mr-overlay{position:fixed;inset:0;background:rgba(15,20,45,.55);z-index:99998;
  display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:26px 16px}
#mr-modal .mr-dialog{background:#fff;border-radius:14px;max-width:1020px;width:100%;
  box-shadow:0 18px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;max-height:92vh}
#mr-modal .mr-head{display:flex;align-items:flex-start;padding:20px 24px 14px;border-bottom:3px solid #E31937}
#mr-modal .mr-eyebrow{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#009AC7}
#mr-modal .mr-title{font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:700;
  margin:2px 0 0;color:#171F69;text-transform:uppercase}
#mr-modal .mr-x{margin-left:auto;border:none;background:none;font-size:20px;cursor:pointer;color:#6b7390}
#mr-modal .mr-body{padding:16px 24px;overflow:auto}
#mr-modal .mr-step{display:flex;gap:14px;margin-bottom:22px}
#mr-modal .mr-step-n{width:28px;height:28px;border-radius:50%;background:#171F69;color:#fff;
  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex:0 0 28px}
#mr-modal .mr-step-c{flex:1;min-width:0}
#mr-modal .mr-step-h{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:17px;
  color:#171F69;text-transform:uppercase;letter-spacing:.03em;margin-bottom:9px}
#mr-modal .mr-tmpls{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:9px}
#mr-modal .mr-tmpl{text-align:left;border:1px solid #dbe2ee;border-radius:9px;padding:11px 13px;
  background:#fff;cursor:pointer;font-family:inherit}
#mr-modal .mr-tmpl:hover{border-color:#009AC7;background:#f6fbfd}
#mr-modal .mr-tmpl.is-on{border-color:#171F69;background:#eef2fb;box-shadow:inset 0 0 0 1px #171F69}
#mr-modal .mr-tmpl.is-dim{opacity:.62}
#mr-modal .mr-tmpl-n{font-weight:800;font-size:13.5px;color:#171F69}
#mr-modal .mr-tmpl-d{font-size:11.5px;color:#5a6480;margin:4px 0 6px;line-height:1.42}
#mr-modal .mr-tmpl-s{font-size:10.5px;color:#009AC7;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
#mr-modal .mr-secgrp{margin-bottom:14px}
#mr-modal .mr-secgrp-h{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;
  color:#009AC7;margin-bottom:6px}
#mr-modal .mr-sections{display:grid;grid-template-columns:repeat(auto-fill,minmax(292px,1fr));gap:7px}
#mr-modal .mr-secopt{display:flex;gap:9px;align-items:flex-start;border:1px solid #e2e8f2;
  border-radius:8px;padding:9px 11px;cursor:pointer;background:#fff}
#mr-modal .mr-secopt:hover{border-color:#009AC7}
#mr-modal .mr-secopt.is-on{border-color:#171F69;background:#f5f8fd}
#mr-modal .mr-secopt input{margin-top:2px;accent-color:#171F69}
#mr-modal .mr-secopt-n{font-weight:700;font-size:12.5px;color:#171F69}
#mr-modal .mr-secopt-d{font-size:11px;color:#5a6480;margin-top:2px;line-height:1.4}
#mr-modal .mr-chips{display:flex;gap:6px;flex-wrap:wrap}
#mr-modal .mr-scroll{max-height:132px;overflow:auto;padding:3px;border:1px solid #eef1f7;border-radius:7px}
#mr-modal .mr-chip{border:1px solid #cdd6e4;background:#fff;color:#171F69;border-radius:999px;
  padding:6px 13px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit}
#mr-modal .mr-chip.sm{padding:4px 10px;font-size:11.5px}
#mr-modal .mr-chip.is-on{background:#171F69;color:#fff;border-color:#171F69}
#mr-modal .mr-fgrp{margin-bottom:11px}
#mr-modal .mr-flbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
  color:#5a6480;margin-bottom:5px}
#mr-modal .mr-link{background:none;border:none;color:#009AC7;font-weight:700;font-size:12.5px;
  cursor:pointer;padding:2px 0;font-family:inherit;text-decoration:underline}
#mr-modal .mr-tag{font-size:9.5px;background:#eef2fb;color:#171F69;border-radius:4px;padding:1px 5px;
  text-transform:uppercase;letter-spacing:.04em}
#mr-modal .mr-tag-warn{background:#fef3e2;color:#b45309}
#mr-modal .mr-foot{display:flex;align-items:center;gap:10px;padding:13px 24px;border-top:1px solid #e5e9f2;
  background:#fafbfd;border-radius:0 0 14px 14px;flex-wrap:wrap}
#mr-modal .mr-btn{border:1px solid #cdd6e4;background:#fff;color:#171F69;border-radius:7px;
  padding:9px 17px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit}
#mr-modal .mr-btn-p{background:#171F69;color:#fff;border-color:#171F69}
#mr-modal .mr-btn.is-dim{opacity:.45;cursor:not-allowed}
#mr-modal .mr-soft{color:#6b7390;font-size:12px;font-weight:500}

/* ---- generated document ---- */
#mr-output{position:fixed;inset:0;background:#fafbfd;z-index:99999;overflow:auto;
  font-family:'Inter',system-ui,sans-serif;color:#171F69}
#mr-output .mr-toolbar{position:sticky;top:0;background:#fff;border-bottom:1px solid #e5e9f2;
  padding:10px 18px;display:flex;align-items:center;gap:8px;z-index:1}
#mr-output .mr-toolbar button{padding:7px 13px;border-radius:5px;border:1px solid #cdd6e4;background:#fff;
  cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:600;color:#171F69}
#mr-output .mr-print{background:#171F69;color:#fff;border-color:#171F69}
#mr-output .mr-doc{max-width:920px;margin:24px auto;padding:34px 46px;background:#fff;
  box-shadow:0 1px 4px rgba(0,0,0,.06)}
#mr-output .mr-doc-head{border-bottom:4px solid #E31937;padding-bottom:14px;margin-bottom:22px}
#mr-output .mr-doc-head h1{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:29px;
  margin:0;color:#171F69;text-transform:uppercase;letter-spacing:.01em}
#mr-output .mr-doc-sub{font-size:11.5px;color:#5a6480;margin-top:8px;line-height:1.65}
#mr-output .mr-section{margin:26px 0;page-break-inside:auto}
#mr-output .mr-scenario-badge{background:#171F69;color:#fff;border-radius:8px;padding:10px 16px;
  margin:0 0 14px;display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;page-break-inside:avoid}
#mr-output .mr-scenario-badge .mr-sb-label{font-family:'Barlow Condensed',sans-serif;font-weight:700;
  font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:#8FC3EA;flex-shrink:0}
#mr-output .mr-scenario-badge .mr-sb-name{font-weight:800;font-size:15px}
#mr-output .mr-scenario-badge .mr-sb-year{font-size:11px;color:#c8d0f0;margin-left:auto;white-space:nowrap}
#mr-output .mr-scenario-badge .mr-sb-dirty{font-size:10px;color:#fde68a;font-weight:600}
#mr-output .mr-scenario-badge.mr-sb-compare{display:grid;grid-template-columns:1fr auto 1fr;
  align-items:center;gap:4px 12px}
#mr-output .mr-scenario-badge.mr-sb-compare .mr-sb-col{display:flex;flex-direction:column;gap:1px}
#mr-output .mr-scenario-badge.mr-sb-compare .mr-sb-vs{font-family:'Barlow Condensed',sans-serif;
  font-weight:700;font-size:12px;color:#8FC3EA;text-align:center;padding:0 4px}
#mr-output .mr-scenario-badge.mr-sb-compare .mr-sb-col.mr-sb-right{align-items:flex-end;text-align:right}
#mr-output .mr-rules-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;
  margin:8px 0 16px}
#mr-output .mr-rules-col{background:#f7f8fc;border:1px solid #e2e5ef;border-radius:8px;padding:11px 14px}
#mr-output .mr-rules-h{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:13px;
  color:#171F69;text-transform:uppercase;letter-spacing:.02em;margin-bottom:6px;
  border-bottom:2px solid #E31937;padding-bottom:4px}
#mr-output .mr-rules-col .mr-bullets{margin:0;padding-left:16px;font-size:11px;line-height:1.6}
#mr-output .mr-h2{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:19px;color:#171F69;
  border-bottom:2px solid #171F69;padding-bottom:4px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.04em}
.mr-yearband{background:var(--navy);color:#fff;font-family:var(--display);font-size:17px;letter-spacing:.05em;
  text-transform:uppercase;padding:7px 14px;border-radius:9px;margin:22px 0 10px;page-break-after:avoid}

#mr-output .mr-h3{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14.5px;color:#171F69;
  margin:18px 0 6px;text-transform:uppercase;letter-spacing:.03em}
#mr-output .mr-p{font-size:12px;color:#2d3450;margin:0 0 9px;line-height:1.55}
#mr-output .mr-note{font-size:11px;color:#5a6480;margin:9px 0 0;line-height:1.55;
  background:#f6f8fc;border-left:3px solid #009AC7;padding:8px 11px;border-radius:0 5px 5px 0}
.mr-sub td{background:#f4f8fd}

.mr-bullets{margin:8px 0 12px;padding-left:20px;font-size:11px;line-height:1.6;color:#13213a}
.mr-bullets li{margin-bottom:4px}

#mr-output .mr-warn{background:#fef3e2;border-left:3px solid #b45309;padding:9px 12px;border-radius:0 5px 5px 0;color:#7c4a06}
#mr-output .mr-soft{color:#6b7390;font-size:10.5px}
#mr-output .mr-mono{font-family:'JetBrains Mono',monospace;font-size:11px}
#mr-output .mr-table{width:100%;border-collapse:collapse;font-size:11.5px;margin:7px 0 4px}
#mr-output .mr-table th{background:#eef1f7;color:#171F69;text-align:left;padding:5px 8px;font-weight:700;
  text-transform:uppercase;font-size:9.5px;letter-spacing:.04em;border-bottom:1px solid #c5cce0}
#mr-output .mr-table td{padding:5px 8px;border-bottom:1px solid #e9edf5;vertical-align:middle}
#mr-output .mr-table .mr-num{text-align:right;font-variant-numeric:tabular-nums;
  font-family:'JetBrains Mono',monospace;font-size:11px}
#mr-output .mr-table th.mr-num{text-align:right}
#mr-output .mr-table-sm{font-size:10.5px}
#mr-output .mr-table-sm td,#mr-output .mr-table-sm th{padding:3.5px 7px}
#mr-output .mr-table-plain td{border-bottom:none;padding:3px 8px}
#mr-output .mr-table tr.mr-total td{font-weight:800;background:#eef3fa;border-top:2px solid #c8d4e6}
#mr-output .mr-table tr.mr-muted td{color:#6b7390;font-style:italic}
#mr-output .mr-zip{page-break-inside:auto}
#mr-output .mr-up{color:#15803d;font-weight:700;font-size:11px}
#mr-output .mr-down{color:#b3122b;font-weight:700;font-size:11px}
#mr-output .mr-over{color:#b45309;font-weight:700}
#mr-output .mr-under{color:#1d4ed8;font-weight:700}
#mr-output .mr-bar{display:block;height:10px;line-height:0;background:#eef1f7;border-radius:3px;overflow:hidden;min-width:40px}
#mr-output .mr-bar-f{display:block;height:10px;min-height:10px;border-radius:3px}
#mr-output .mr-devbar{position:relative;display:block;height:11px;background:#f2f5fa;border-radius:3px}
#mr-output .mr-devbar-mid{position:absolute;left:50%;top:0;bottom:0;width:1px;background:#94a3b8}
#mr-output .mr-devbar-f{position:absolute;top:1px;bottom:1px;border-radius:2px}
#mr-output .mr-sw{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:6px;vertical-align:-1px}
#mr-output .mr-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:9px;margin:10px 0 14px}
#mr-output .mr-kpi{background:#f6f8fc;border-radius:7px;padding:11px 13px;border-top:3px solid #009AC7}
#mr-output .mr-kpi-v{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:26px;color:#171F69;line-height:1.05}
#mr-output .mr-kpi-l{font-size:10.5px;font-weight:700;color:#171F69;text-transform:uppercase;
  letter-spacing:.03em;margin-top:3px}
#mr-output .mr-kpi-s{font-size:10px;color:#5a6480;margin-top:4px;line-height:1.45}
#mr-output .mr-profile{border:1px solid #e2e8f2;border-radius:8px;padding:12px 14px;margin:11px 0;
  page-break-inside:avoid}
#mr-output .mr-profile-h{padding-left:11px;margin-bottom:9px}
#mr-output .mr-profile-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px;
  color:#171F69;text-transform:uppercase;letter-spacing:.02em}
#mr-output .mr-profile-kpi{display:flex;flex-wrap:wrap;gap:13px;font-size:11px;color:#5a6480;margin-top:3px}
#mr-output .mr-profile-kpi b{color:#171F69;font-size:12.5px}
#mr-output .mr-stack{display:flex;height:11px;border-radius:3px;overflow:hidden;margin:5px 0 9px;background:#eef1f7}
#mr-output .mr-seg{display:block;height:11px;min-height:11px}
#mr-output .mr-kv{display:flex;gap:9px;font-size:11px;margin:5px 0;line-height:1.5}
#mr-output .mr-kv-k{flex:0 0 96px;font-weight:700;color:#171F69;text-transform:uppercase;
  font-size:9.5px;letter-spacing:.04em;padding-top:1px}
#mr-output .mr-kv-v{flex:1;color:#2d3450}
#mr-output .mr-map{border:1px solid #e2e8f2;border-radius:8px;padding:8px;margin:9px 0;background:#fff}
#mr-output .mr-map svg{width:100%;height:auto;display:block}\n#mr-output .mr-stage{margin:14px 0 20px;page-break-inside:avoid}\n#mr-output .mr-stagemap{width:100%;height:auto;display:block}
#mr-output .mr-mapkeys{display:flex;flex-wrap:wrap;gap:5px 14px;margin:6px 0 2px}
#mr-output .mr-mapkey{font-size:10.5px;color:#2d3450;white-space:nowrap}
#mr-output .mr-foot-note{margin-top:20px;padding-top:10px;border-top:1px solid #e5e9f2;
  font-size:9.5px;color:#6b7390}

/* ---- potential-schedule cards (boundary_schedule report section) ----
   Matches Schedule Builder's own printed handout (HANDOUT_CSS / buildHandoutDayHTML
   in sb-app.js) as closely as a report section can -- same navy header bar, same
   red/white/blue accent stripe, same Barlow Condensed treatment for the big
   numbers -- so a page from this report and a page Schedule Builder prints for a
   real meet read as the same family of document. No clock times: this is a
   projection with no real date set yet, so entries and estimated run time replace
   start/end times as the thing each row actually reports. */
#mr-output .mr-sched-stop{border:1px solid #e2e8f2;border-radius:9px;padding:13px 15px;margin:14px 0;
  page-break-inside:avoid}
#mr-output .mr-sched-stop-h{display:flex;align-items:baseline;gap:9px;margin-bottom:3px}
#mr-output .mr-sched-stop-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;
  color:#171F69;text-transform:uppercase;letter-spacing:.02em}
#mr-output .mr-sched-stop-kpis{display:flex;flex-wrap:wrap;gap:5px 16px;font-size:11px;color:#5a6480;
  margin:2px 0 9px}
#mr-output .mr-sched-stop-kpis .mr-over{color:#b45309;font-weight:700}
#mr-output .mr-sched-stop-kpis .mr-under{color:#15803d;font-weight:700}
#mr-output .mr-hd-day{background:#fff;border:1px solid #e2e8f2;border-radius:10px;margin:10px 0;
  overflow:hidden;page-break-inside:avoid}
#mr-output .mr-hd-day.over{border-color:#f0c48a}
#mr-output .mr-hd-day-h{background:#171F69;color:#fff;padding:9px 14px;display:flex;
  justify-content:space-between;align-items:center}
#mr-output .mr-hd-day-h .mr-hd-daynum{font-family:'Barlow Condensed',sans-serif;font-weight:700;
  font-size:16px;text-transform:uppercase;letter-spacing:.03em}
#mr-output .mr-hd-day-h .mr-hd-pool{font-size:10.5px;opacity:.8}
#mr-output .mr-hd-accent{height:3px;background:linear-gradient(90deg,#E31937 0 33%,#fff 33% 66%,#009AC7 66% 100%)}
#mr-output .mr-hd-body{padding:9px 14px 11px}
#mr-output .mr-hd-day-warn{font-size:10.5px;color:#b45309;font-weight:600;margin:6px 0 0}
#mr-output .mr-hd-sess{border-bottom:1.5px solid #E5E9F2;padding:8px 0}
#mr-output .mr-hd-sess:last-child{border-bottom:none}
#mr-output .mr-hd-sess-h{display:flex;align-items:baseline;gap:8px;margin-bottom:2px}
#mr-output .mr-hd-sess-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;
  color:#171F69}
#mr-output .mr-hd-wu{font-size:10.5px;color:#009AC7;font-weight:600}
#mr-output .mr-hd-boards{font-size:10px;color:#5a6480;margin-bottom:3px}
#mr-output .mr-hd-ev{display:flex;justify-content:space-between;align-items:baseline;
  font-size:11.5px;padding:1.5px 0}
#mr-output .mr-hd-ev-name{flex:1}
#mr-output .mr-hd-ev-nums{color:#374151;font-variant-numeric:tabular-nums;font-weight:600;
  white-space:nowrap;margin-left:10px}
#mr-output .mr-hd-ev-nums .n{color:#94A3B8;font-weight:500}
#mr-output .mr-hd-ev-flag{display:block;font-size:10px;color:#b45309;font-style:italic}
#mr-output .mr-sched-practice{font-size:10.5px;color:#5a6480;margin-top:8px}
@media print{
  /* Hide the rest of the page only while a comparison report is open (#mr-output
     exists only then). Unscoped, this rule blanked every other print from
     Boundary Studio, including the committee paper's Export PDF. */
  body:has(#mr-output) > *:not(#mr-output){display:none !important}
  body:has(#mr-output) *{visibility:hidden !important}
  body:has(#mr-output) #mr-output,body:has(#mr-output) #mr-output *{visibility:visible !important}
  #mr-bar{display:none !important}      /* the Reports menu bar is navigation, never printed */
  #mr-output{position:absolute;left:0;top:0;width:100%;background:#fff;overflow:visible}
  #mr-output .mr-toolbar{display:none !important}
  #mr-output .mr-doc{box-shadow:none;margin:0;max-width:none;padding:0}
  #mr-output,#mr-output *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;
    color-adjust:exact !important}
  #mr-output .mr-h2{page-break-after:avoid}
  #mr-output .mr-h3{page-break-after:avoid}
  #mr-output table{page-break-after:auto}
  #mr-output .mr-table thead{display:table-header-group}
  #mr-output tr{page-break-inside:avoid}
  #mr-output .mr-table{table-layout:auto;max-width:100%;font-size:10px}
  #mr-output .mr-fg-tbl,#mr-output .bs-fg-tbl{font-size:8.5px}
  #mr-output .mr-rules-grid{display:block}
  #mr-output .mr-rules-col{margin-bottom:8px;page-break-inside:avoid}
  /* margins for the comparison report only (a named page), so the committee
     paper keeps its own full-bleed @page from index.html */
  @page mrpage{margin:.55in}
  #mr-output{page:mrpage}
}

/* No mobile breakpoint existed anywhere in this file before. Two fixes, both
   standard and low-risk: the document's fixed 34px/46px padding leaves very
   little usable width once the viewport itself is only a few hundred px, and
   report tables run 5-9 columns wide, which will not reflow sanely at any
   width -- letting them scroll horizontally is the safe, well-established
   fix, not attempting to reflow columns nobody has seen rendered.
   Explicitly screen-only: overflow-x:auto does nothing useful on a printed
   page (there is no scrolling), and leaving this unscoped risked being part
   of why report tables were bleeding past the printed page edge instead of
   shrinking or wrapping. */
@media screen and (max-width: 600px){
  #mr-output .mr-doc{padding:18px 14px}
  #mr-output .mr-table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;
    white-space:nowrap;max-width:100%}
  #mr-output .mr-map svg,#mr-output .mr-stagemap{max-width:100%}
}
`;


function injectCSS(){
  if (document.getElementById('mr-css')) return;
  const s = document.createElement('style');
  s.id = 'mr-css';
  s.textContent = STYLES;
  document.head.appendChild(s);
}

injectCSS();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
window.addEventListener('load', mount);

})();
