(function () {
  "use strict";

  function isPrintButton(event) {
    const button = event.target?.closest?.("button");
    if (!button) return false;
    const text = String(button.textContent || "").toLowerCase();
    const attr = String(button.getAttribute("onclick") || "").toLowerCase();
    return /pdf|print/.test(text) || /printpreview|exportpdf|printcurrentreport/.test(attr);
  }

  window.addEventListener("click", (event) => {
    if (!isPrintButton(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window.actions?.printPreview) window.actions.printPreview();
  }, true);
})();
