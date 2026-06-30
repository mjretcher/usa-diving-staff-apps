/* Neon SQL HTTP client — handles CORS quirks.
   Required headers (direct mode): Neon-Connection-String, Neon-Raw-Text-Output, Neon-Array-Mode.
   MUST NOT send Content-Type: application/json (Neon CORS preflight rejects).
   All bound params must be strings.

   Two modes:
   - Direct (GitHub Pages / local): posts straight to Neon with the connection
     string from window.USAD_CONFIG.neon.connectionString. Unchanged behavior.
   - Proxy (Vercel shared deploy, neon.proxy === true): posts { query, params }
     to the serverless read-only proxy at /api/neon. No credential in the browser.
*/
(function(){
  const N = (window.USAD_CONFIG && window.USAD_CONFIG.neon) || {};
  const ENDPOINT = N.sqlEndpoint;
  const CONN = N.connectionString;
  const USE_PROXY = N.proxy === true;
  const PROXY_ENDPOINT = (N.proxyEndpoint) || '/api/neon';

  function shape(data){
    // Array-mode response: { rows: [[v1,v2,...],...], fields: [{name,...},...] }
    const fields = (data.fields || []).map(function(f){ return f.name; });
    const rows = (data.rows || []).map(function(arr){
      const o = {};
      for (let i = 0; i < fields.length; i++) o[fields[i]] = arr[i];
      return o;
    });
    return { rows: rows, fields: fields, raw: data };
  }

  async function query(sql, params){
    params = (params || []).map(function(p){ return p == null ? null : String(p); });

    if (USE_PROXY) {
      const res = await fetch(PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql, params: params }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error('[neon-proxy ' + res.status + '] ' + text.slice(0, 400));
      }
      return shape(await res.json());
    }

    if (!ENDPOINT || !CONN) throw new Error('[neon] config missing');
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': CONN,
        'Neon-Raw-Text-Output': 'false',
        'Neon-Array-Mode': 'true',
      },
      body: JSON.stringify({ query: sql, params: params }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('[neon ' + res.status + '] ' + text.slice(0, 400));
    }
    return shape(await res.json());
  }

  // Convenience helpers
  async function count(table, where){
    const sql = 'SELECT COUNT(*) AS n FROM ' + table + (where ? ' WHERE ' + where : '');
    const r = await query(sql);
    return Number(r.rows[0].n);
  }

  window.NEON = { query: query, count: count, endpoint: USE_PROXY ? PROXY_ENDPOINT : ENDPOINT };
})();
