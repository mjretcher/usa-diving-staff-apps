/* USA Diving Staff Platform — Vercel configuration (sanitized, no secrets).
 *
 * This file is served IN PLACE OF data/config.js on the Vercel deployment
 * (see vercel.json rewrite). It contains NO database credential and NO GitHub
 * token. Database access on Vercel goes through the read-only serverless proxy
 * at /api/neon (neon.proxy = true), so nothing sensitive ever reaches the
 * browser. Override-saving (which needs a GitHub token) is disabled here, which
 * is correct for a read-only shared viewer.
 */
(function () {
  window.USAD_CONFIG = {
    repo: 'mjretcher/usa-diving-staff-apps',
    branch: 'main',
    overridesPath: 'data/overrides.json',
    schedulesPath: 'data/schedules',
    readOnly: true,
    neon: {
      proxy: true,            // route all queries through /api/neon (read-only)
    },
  };
})();
