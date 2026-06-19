(function () {
  "use strict";

  const VERSION = "20260618h";
  const MODULES = [
    "schedule-relationships.js",
    "catalog-rules.js",
    "catalog-actions.js"
  ];

  function alreadyLoaded(src) {
    return Array.from(document.scripts).some((script) => String(script.src || "").includes(src));
  }

  function loadModule(src) {
    if (alreadyLoaded(src)) return;
    const script = document.createElement("script");
    script.src = `${src}?v=${VERSION}`;
    script.defer = true;
    document.body.appendChild(script);
  }

  function install() {
    MODULES.forEach(loadModule);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
