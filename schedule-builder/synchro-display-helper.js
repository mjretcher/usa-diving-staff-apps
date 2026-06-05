(function () {
  "use strict";

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function addSynchroToTitle(title) {
    const text = clean(title);
    if (!text || /\bSynchro\b/i.test(text)) return text;
    return text.replace(/\s+(1-Meter|3-Meter|Platform|10-Meter)$/i, " Synchro $1");
  }

  function patchEventCard(card) {
    const meta = clean(card.querySelector(".event-title-main span, .compact-event-main span")?.textContent || "");
    if (!/^Synchronized\b/i.test(meta)) return;
    const title = card.querySelector(".event-title-main strong, .compact-event-main strong");
    if (!title) return;
    title.childNodes.forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const next = addSynchroToTitle(node.nodeValue);
      if (next && next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function patchSessionSummary(root) {
    root.querySelectorAll(".session-title-lockup span").forEach((node) => {
      let text = clean(node.textContent || "");
      if (!text || /Synchro/i.test(text)) return;
      text = text.replace(/(\d+\s+events?:\s*)/i, "$1");
      text = text.replace(/\b(\d{1,2}-\d{1,2}\s+(?:Girls|Boys|Women|Men)\s+)(1-Meter|3-Meter|Platform|10-Meter)(\s+Final\b)/gi, "$1Synchro $2$3");
      if (text !== clean(node.textContent || "")) node.textContent = text;
    });
  }

  function patchSynchroTitles() {
    document.querySelectorAll(".scheduled-event").forEach(patchEventCard);
    patchSessionSummary(document);
  }

  function install() {
    patchSynchroTitles();
    document.addEventListener("click", () => setTimeout(patchSynchroTitles, 50), true);
    document.addEventListener("change", () => setTimeout(patchSynchroTitles, 50), true);
    new MutationObserver(patchSynchroTitles).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
