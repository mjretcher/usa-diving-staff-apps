(function () {
  "use strict";

  var activeSnapshot = null;
  var restoreTimer = null;

  function scrollContainers() {
    return Array.from(document.querySelectorAll([
      ".workspace",
      ".sb-session-flow",
      ".sb-board-wrap",
      ".builder-flow-dock",
      ".left-rail",
      ".timeline-preview",
      ".builder-day-tabs",
      ".sb-day-tabs"
    ].join(",")));
  }

  function captureScroll() {
    return {
      x: window.scrollX,
      y: window.scrollY,
      nodes: scrollContainers().map(function (node) {
        return { node: node, top: node.scrollTop, left: node.scrollLeft };
      })
    };
  }

  function restoreScroll(snapshot) {
    if (!snapshot) return;
    window.scrollTo(snapshot.x, snapshot.y);
    snapshot.nodes.forEach(function (item) {
      if (!document.contains(item.node)) return;
      item.node.scrollTop = item.top;
      item.node.scrollLeft = item.left;
    });
  }

  function restoreFor(durationMs) {
    var snapshot = activeSnapshot || captureScroll();
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
    }, 50);
  }

  function preserveDuring(callback) {
    var snapshot = captureScroll();
    activeSnapshot = snapshot;
    var result = callback();
    restoreFor(900);
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

  function patchActions() {
    if (!window.actions || window.actions.__scrollPreserveHelperPatched) return false;
    ["toggleSession", "toggleEventDetails", "openEventDetails"].forEach(function (name) {
      if (typeof window.actions[name] !== "function") return;
      var original = window.actions[name];
      window.actions[name] = function () {
        var self = this;
        var args = arguments;
        return preserveDuring(function () {
          return original.apply(self, args);
        });
      };
    });
    window.actions.__scrollPreserveHelperPatched = true;
    return true;
  }

  function install() {
    document.addEventListener("pointerdown", function (event) {
      if (isExpansionClick(event)) activeSnapshot = captureScroll();
    }, true);

    document.addEventListener("click", function (event) {
      if (isExpansionClick(event)) restoreFor(900);
    }, true);

    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (patchActions() || attempts >= 120) window.clearInterval(timer);
    }, 100);
    patchActions();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
