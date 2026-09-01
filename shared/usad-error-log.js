/* shared/usad-error-log.js — client-side error monitoring
   ==========================================================================
   Nothing told anyone when a staff member hit a JS error in production
   unless they happened to mention it. This catches uncaught errors and
   unhandled promise rejections and reports them to app_meta.client_errors.

   Deliberately independent of neon-client.js: an error monitor that depends
   on the rest of the app (including that script) having loaded successfully
   defeats its own purpose. It does reuse that file's exact proven request
   shape for the direct-mode case -- no Content-Type header, the specific
   Neon-Connection-String / Neon-Raw-Text-Output / Neon-Array-Mode headers --
   since that pattern is what actually avoids a CORS preflight rejection
   against this endpoint, and there's no reason to risk a different mistake
   by writing it independently.

   Throttled to at most 5 distinct errors per page load, deduped by
   message+line, so a page stuck looping on the same error doesn't spam the
   table. No stack trace, message, or URL is ever longer than a few hundred
   characters, both to keep the table small and because a truncated string
   is enough to find the bug without needing to store more than that.

   On the Vercel shared viewer (neon.proxy === true), this deliberately does
   nothing: that proxy is read-only by design, and an INSERT against it isn't
   something this script should try to route around.
   ========================================================================== */
(function () {
  var MAX_PER_LOAD = 5;
  var seen = {};
  var sent = 0;

  var APP = (function () {
    var m = String(location.pathname || '').match(/\/([a-z0-9-]+)\/[^/]*$/i);
    return m ? m[1] : 'unknown';
  })();

  function trunc(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) : s; }

  function post(row) {
    try {
      var cfg = window.USAD_CONFIG && window.USAD_CONFIG.neon;
      if (!cfg || cfg.proxy === true) return; // read-only viewer -- nothing to do here
      if (!cfg.sqlEndpoint || !cfg.connectionString) return;
      var sql = 'INSERT INTO app_meta.client_errors '
        + '(app, message, source, line, col, stack, url, user_agent) '
        + 'VALUES ($1,$2,$3,$4,$5,$6,$7,$8)';
      var params = [row.app, row.message, row.source, row.line, row.col, row.stack, row.url, row.userAgent]
        .map(function (p) { return p == null ? null : String(p); });
      fetch(cfg.sqlEndpoint, {
        method: 'POST',
        headers: {
          'Neon-Connection-String': cfg.connectionString,
          'Neon-Raw-Text-Output': 'false',
          'Neon-Array-Mode': 'true',
        },
        body: JSON.stringify({ query: sql, params: params }),
      }).catch(function () { /* the error logger failing to log is not itself worth logging */ });
    } catch (e) { /* never let this script be the thing that throws */ }
  }

  function report(message, source, line, col, stack) {
    if (sent >= MAX_PER_LOAD) return;
    var key = message + '|' + line;
    if (seen[key]) return;
    seen[key] = true;
    sent++;
    post({
      app: APP,
      message: trunc(message, 500),
      source: trunc(source, 300),
      line: (typeof line === 'number') ? line : null,
      col: (typeof col === 'number') ? col : null,
      stack: trunc(stack, 2000),
      url: trunc(location.href, 300),
      userAgent: trunc(navigator.userAgent, 300),
    });
  }

  window.addEventListener('error', function (e) {
    report(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason;
    var message = (reason && reason.message) ? reason.message : String(reason);
    var stack = (reason && reason.stack) ? reason.stack : '';
    report('Unhandled promise rejection: ' + message, location.pathname, null, null, stack);
  });
})();
