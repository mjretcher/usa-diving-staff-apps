(function () {
  "use strict";

  var STORAGE_KEY = "usa-diving-schedule-builder-scroll-snapshot-v2";
  var activeSnapshot = null;
  var restoreTimer = null;
  var lastCaptureAt = 0;

  var SCROLL_SELECTORS = [
    ".workspace",
    ".sb-session-flow",
    ".sb-board-wrap",
    ".builder-flow-dock",
    ".left-rail",
    ".timeline-preview",
    ".public-schedule-preview",
    ".poster-preview",
    ".daily-schedule-preview",
    ".preview-pane",
    ".reports-preview",
    ".builder-day-tabs",
    ".sb-day-tabs",
    ".entry-builder-drawer",
    ".entries-drawer",
    ".modal",
    ".drawer",
    "main",
    "#app"
  ];

  function uniqueSelectors() {
    var seen = {};
    return SCROLL_SELECTORS.filter(function (selector) {
      if (seen[selector]) return false;
      seen[selector] = true;
      return true;
    });
  }

  function captureScroll() {
    return {
      url: location.pathname + location.search + location.hash,
      time: Date.now(),
      x: window.scrollX,
      y: window.scrollY,
      docTop: document.documentElement.scrollTop || document.body.scrollTop || 0,
      docLeft: document.documentElement.scrollLeft || document.body.scrollLeft || 0,
      activeDay: document.querySelector(".builder-day-tab.active, .sb-day-tab.active, [aria-selected='true']")?.textContent || "",
      containers: uniqueSelectors().map(function (selector) {
        var node = document.querySelector(selector);
        return node ? { selector: selector, top: node.scrollTop, left: node.scrollLeft } : null;
      }).filter(Boolean)
    };
  }

  function saveSnapshot(snapshot) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot || activeSnapshot || captureScroll()));
    } catch (_error) {}
  }

  function loadSnapshot() {
    try {
      var snapshot = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!snapshot || !snapshot.time) return null;
      if (Date.now() - snapshot.time > 30000) return null;
      if (snapshot.url && snapshot.url.split("#")[0] !== (location.pathname + location.search + location.hash).split("#")[0]) return null;
      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function restoreScroll(snapshot) {
    if (!snapshot) return;
    window.scrollTo(Number(snapshot.x || snapshot.docLeft || 0), Number(snapshot.y || snapshot.docTop || 0));
    document.documentElement.scrollTop = Number(snapshot.y || snapshot.docTop || 0);
    document.body.scrollTop = Number(snapshot.y || snapshot.docTop || 0);
    (snapshot.containers || []).forEach(function (item) {
      var node = document.querySelector(item.selector);
      if (!node) return;
      node.scrollTop = item.top;
      node.scrollLeft = item.left;
    });
  }

  function restoreFor(durationMs, snapshot) {
    snapshot = snapshot || activeSnapshot || loadSnapshot() || captureScroll();
    activeSnapshot = snapshot;
    var started = Date.now();
    window.clearInterval(restoreTimer);
    restoreScroll(snapshot);
    requestAnimationFrame(function () { restoreScroll(snapshot); });
    restoreTimer = window.setInterval(function () {
      restoreScroll(snapshot);
      if (Date.now() - started > durationMs) {
        window.clearInterval(restoreTimer);
        activeSnapshot = null;
      }
    }, 40);
  }

  function captureAndSave() {
    activeSnapshot = captureScroll();
    lastCaptureAt = Date.now();
    saveSnapshot(activeSnapshot);
    return activeSnapshot;
  }

  function preserveDuring(callback) {
    captureAndSave();
    var result = callback();
    restoreFor(1800);
    return result;
  }

  function isExpansionClick(event) {
    return Boolean(event.target && event.target.closest([
      ".session-toggle",
      ".event-disclosure",
      ".session-card-header",
      ".modern-session-card-header",
      ".event-title-collapsible",
      ".event-title-main",
      ".scheduled-event"
    ].join(",")));
  }

  function isDayTabClick(event) {
    return Boolean(event.target && event.target.closest([
      ".builder-day-tab",
      ".sb-day-tab"
    ].join(",")));
  }

  function isReportOptionControl(event) {
    if (!event.target) return false;
    var control = event.target.closest('input[type="checkbox"], input[type="radio"], select, label, button');
    if (!control) return false;
    return Boolean(control.closest([
      ".public-output-controls",
      ".public-designer-panel",
      ".preview-toolbar",
      ".report-print-controls",
      "#publicHideTimesPrintControl",
      ".public-hide-times-control"
    ].join(",")));
  }

  function isBuilderMutationControl(event) {
    if (!event.target) return false;
    var control = event.target.closest([
      "button",
      "input",
      "select",
      "textarea",
      "label",
      "[role='button']",
      "[contenteditable='true']"
    ].join(","));
    if (!control) return false;
    if (control.closest(".print-toolbar")) return false;
    var text = String(control.textContent || control.value || "").toLowerCase();
    var appArea = control.closest([
      "#app",
      ".workspace",
      ".preview-toolbar",
      ".public-output-controls",
      ".public-designer-panel",
      ".builder-flow-dock",
      ".left-rail",
      ".modal",
      ".drawer",
      ".entry-builder-drawer",
      ".block-tools-panel"
    ].join(","));
    if (!appArea) return false;
    if (/print|pdf|excel|png|jpg|svg|canva/.test(text)) return false;
    return true;
  }

  function patchActions() {
    if (!window.actions || window.actions.__scrollPreserveHelperPatched) return false;
    Object.keys(window.actions).forEach(function (name) {
      if (name.indexOf("__") === 0) return;
      if (typeof window.actions[name] !== "function") return;
      var original = window.actions[name];
      if (original.__scrollPreserved) return;
      var wrapped = function () {
        var self = this;
        var args = arguments;
        return preserveDuring(function () {
          return original.apply(self, args);
        });
      };
      wrapped.__scrollPreserved = true;
      window.actions[name] = wrapped;
    });
    window.actions.__scrollPreserveHelperPatched = true;
    return true;
  }

  function restorePreviousLoad() {
    var snapshot = loadSnapshot();
    if (!snapshot) return;
    restoreFor(2500, snapshot);
    setTimeout(function () { restoreFor(1200, snapshot); }, 300);
    setTimeout(function () { restoreFor(1000, snapshot); }, 900);
  }

  function install() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    restorePreviousLoad();

    document.addEventListener("pointerdown", function (event) {
      if (isExpansionClick(event) || isDayTabClick(event) || isReportOptionControl(event) || isBuilderMutationControl(event)) captureAndSave();
    }, true);

    document.addEventListener("click", function (event) {
      if (isExpansionClick(event) || isDayTabClick(event) || isReportOptionControl(event) || isBuilderMutationControl(event)) restoreFor(1800);
    }, true);

    document.addEventListener("change", function (event) {
      if (isReportOptionControl(event) || isBuilderMutationControl(event)) restoreFor(2000);
    }, true);

    document.addEventListener("input", function (event) {
      if (Date.now() - lastCaptureAt > 700 && isBuilderMutationControl(event)) captureAndSave();
    }, true);

    window.addEventListener("beforeunload", function () {
      saveSnapshot(activeSnapshot || captureScroll());
    });

    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      patchActions();
      if (attempts >= 220) window.clearInterval(timer);
    }, 100);
    patchActions();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
