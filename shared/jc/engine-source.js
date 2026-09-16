/* The engine is the real, unmodified app code (routing.js,
   scenario-schedule-engine.js, pricing.js, boundary.js) loaded into a separate
   window. These two shims only add an export line at the end of the two IIFE
   files so the core can call their internal functions. Both refuse to guess if
   the file tail ever changes. */
const PRICING_ANCHOR = '};\n\n})();';
export function patchPricing(src) {
  if (!src.trimEnd().endsWith(PRICING_ANCHOR.trimEnd())) throw new Error('pricing.js anchor mismatch -- refusing to guess where to add the export.');
  return src.trimEnd().slice(0, -PRICING_ANCHOR.trimEnd().length) + `};

window.__pricingInternal = { PS, bootstrap, applyBoundary, computeRevenue, computeVolume, ensureFlowData, resizeCards, defaultFees };

})();`;
}
const BOUNDARY_ANCHOR = '})();';
export function patchBoundary(src) {
  if (!src.trimEnd().endsWith(BOUNDARY_ANCHOR)) throw new Error('boundary.js does not end with "})();" -- refusing to guess where to add the export.');
  return src.trimEnd().slice(0, -BOUNDARY_ANCHOR.length) + `
window.__boundaryInternal = { S, financialsFor, projectPathway, syncRouting, syncLevels, migrateLevels, defaultRegions, defaultLevels, defaultAdv, meetManifest, meetMoney, tierName, groupCountAt, groupUp };

})();`;
}
export const ENGINE_FILES = ['routing.js', 'scenario-schedule-engine.js', 'pricing.js', 'boundary.js'];
export function patchFor(name, src) {
  return name === 'pricing.js' ? patchPricing(src) : name === 'boundary.js' ? patchBoundary(src) : src;
}
