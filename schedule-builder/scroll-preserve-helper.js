(function () {
  "use strict";

  function captureScroll() {
    return {
      x: window.scrollX,
      y: window.scrollY,
      nodes: Array.from(document.querySelectorAll(".builder-flow-dock, .left-rail, .timeline-preview, .builder-day-tabs, .sb-main, .sb-board-wrap"))
        .map(function (node) {
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

  function preserveDuring(callback) {
    var snapshot = captureScroll();
    var result = callback();
    requestAnimationFrame(function () { restoreScroll(snapshot); });
    window.setTimeout(function () { restoreScroll(snapshot); }, 0);
    window.setTimeout(function () { restoreScroll(snapshot); }, 80);
    return result;
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
    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (patchActions() || attempts >= 30) window.clearInterval(timer);
    }, 100);
    patchActions();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
