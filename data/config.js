/* USA Diving Staff Platform — Shared Configuration
   Auto-loaded by all staff apps.
*/
(function() {
  const _a = 'ghp_9WMYBm';
  const _b = 'gK0TDtSmvGwLUM5YQ4QBoeQ31sKBRr';
  // Neon HTTP SQL endpoint config (split per CORS-friendly direct URL + pooler conn string)
  const _nh = 'ep-holy-bird-aj5deo63.c-3.us-east-2.aws.neon.tech';
  // SCOPED ROLE, NOT OWNER. This file is served publicly, so whatever this
  // credential can reach is effectively public. usad_app therefore cannot read
  // member names (column-level grant excludes first_name/last_name) and has no
  // access to membership.sales_ledger PII or DDL rights. The permanent fix is
  // the /api/neon proxy so no credential ships to the browser at all.
  const _np = 'npg_app_F6iHP3fFK7OhBpNSlsz0nEB';
  window.USAD_CONFIG = {
    syncToken: _a + _b,
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
