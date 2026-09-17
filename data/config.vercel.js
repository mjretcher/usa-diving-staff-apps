/* USA Diving Staff Platform — Vercel configuration (sanitized, no secrets).
 *
 * Served IN PLACE OF data/config.js on the Vercel deployment (vercel.json
 * rewrite). No database credential and no GitHub token: every query goes
 * through the serverless proxy at /api/neon, which holds the credential
 * server-side and decides what each caller may do.
 *
 * Two shares live on this host:
 *   /                  the read-only Junior Results share (readOnly: true —
 *                      override saving needs a GitHub token and is disabled)
 *   /boundary-studio/  the passcode-gated Boundary Studio share
 *                      (boundaryShare: true — the shell asks for the passcode
 *                      before loading the app; saves are allowed and are
 *                      scoped to the passcode's group by the database)
 */
(function () {
  window.USAD_CONFIG = {
    repo: 'mjretcher/usa-diving-staff-apps',
    branch: 'main',
    overridesPath: 'data/overrides.json',
    schedulesPath: 'data/schedules',
    readOnly: true,
    boundaryShare: true,
    neon: {
      proxy: true,
    },
  };
})();
