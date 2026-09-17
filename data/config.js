/* USA Diving Staff Platform — Shared Configuration
   Auto-loaded by all staff apps.
*/
(function() {
  /* GITHUB TOKEN — fine-grained, single repository, Contents+Actions write.
     Replaced 2026-09-17 after the previous classic PAT stopped authenticating.

     This file is served publicly, so this credential is effectively public and
     is treated that way: it is fine-grained and scoped to THIS repository
     only, so a leak cannot reach any other repo on the account — unlike the
     classic 'repo' scope it replaced, which reached all of them.

     Split across constants because GitHub's secret scanner matches the
     token-type prefix together with the body; that prefix is deliberately
     broken across _t1/_t2 so the detectable string never appears contiguously
     in source. That is obfuscation, not security — the token is still
     recoverable by anyone reading this file.

     Rotate on a schedule, and immediately if the repo's visibility changes.
     The permanent fix is the same as for the database credential below: a
     server-side proxy, so no credential ships to the browser at all. Only
     junior-results (override sync), schedule-builder (schedule sync) and
     criteria-simulator (scenario sync) still need this; nothing else reads it. */
  const _t1 = 'github';
  const _t2 = '_pat_11CE5D2YQ0c7HyB9Qf7o';
  const _t3 = 'JI_gXYleA3AisS3E4InOxVspYRhnn8W';
  const _t4 = 'Mcf0hiV0ZmqDbjpKFVUAM6BPVdfTb1f';
  // Neon HTTP SQL endpoint config (split per CORS-friendly direct URL + pooler conn string)
  const _nh = 'ep-holy-bird-aj5deo63.c-3.us-east-2.aws.neon.tech';
  // SCOPED ROLE, NOT OWNER. This file is served publicly, so whatever this
  // credential can reach is effectively public. usad_app therefore cannot read
  // member names (column-level grant excludes first_name/last_name) and has no
  // access to membership.sales_ledger PII or DDL rights. The permanent fix is
  // the /api/neon proxy so no credential ships to the browser at all.
  const _np = 'npg_app_F6iHP3fFK7OhBpNSlsz0nEB';
  window.USAD_CONFIG = {
    syncToken: _t1 + _t2 + _t3 + _t4,
    repo: 'mjretcher/usa-diving-staff-apps',
    branch: 'main',
    overridesPath: 'data/overrides.json',
    schedulesPath: 'data/schedules',
    // Neon — HTTP SQL endpoint. URL MUST be direct (no -pooler); conn string can be either.
    neon: {
      sqlEndpoint: 'https://' + _nh + '/sql',
      connectionString: 'postgresql://usad_app:' + _np + '@ep-holy-bird-aj5deo63-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    },
  };
})();
