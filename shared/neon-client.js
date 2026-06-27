/* Neon SQL HTTP client — handles CORS quirks.
   Required headers: Neon-Connection-String, Neon-Raw-Text-Output, Neon-Array-Mode.
   MUST NOT send Content-Type: application/json (Neon CORS preflight rejects).
   All bound params must be strings.
*/
(function(){
  const N = (window.USAD_CONFIG && window.USAD_CONFIG.neon) || {};
  const ENDPOINT = N.sqlEndpoint;
  const CONN = N.connectionString;

  async function query(sql, params){
    if (!ENDPOINT || !CONN) throw new Error('[neon] config missing');
    params = (params || []).map(function(p){ return p == null ? null : String(p); });
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
    const data = await res.json();
    // Array-mode response: { rows: [[v1,v2,...],...], fields: [{name,...},...] }
    const fields = (data.fields || []).map(function(f){ return f.name; });
    const rows = (data.rows || []).map(function(arr){
      const o = {};
      for (let i = 0; i < fields.length; i++) o[fields[i]] = arr[i];
      return o;
    });
    return { rows: rows, fields: fields, raw: data };
  }

  // Convenience helpers
  async function count(table, where){
    const sql = 'SELECT COUNT(*) AS n FROM ' + table + (where ? ' WHERE ' + where : '');
    const r = await query(sql);
    return Number(r.rows[0].n);
  }

  window.NEON = { query: query, count: count, endpoint: ENDPOINT };
})();
