/* Serverless Neon SQL proxy — used ONLY by the Vercel deployment.
 *
 * External viewers must NEVER receive a database credential in the browser.
 * The browser posts { query, params } here; this function attaches a
 * server-side connection string and forwards to Neon's HTTP SQL endpoint.
 *
 * Two audiences share this door, told apart by the share token on the request:
 *
 *   junior    — the read-only Junior Results share (the original behaviour).
 *               No token required for reads; every write is refused.
 *   boundary  — the passcode-gated Boundary Studio share. A valid token with
 *               scope 'boundary' unlocks INSERT / UPDATE / DELETE on exactly
 *               four membership tables, and every such write runs inside a
 *               transaction that first sets app.owner / app.saved_by from the
 *               token. Row-level security in the database (db/schema.sql) then
 *               decides what that owner may touch — staff rows never.
 *
 * The regex checks here are defence in depth. The database is the authority.
 *
 * Required Vercel environment variables:
 *   NEON_READONLY_URL  — connection string for usad_readonly_share
 *   NEON_SQL_ENDPOINT  — https://<direct host>/sql   (no -pooler)
 */
const WRITE_TABLES = /^membership\.(boundary_scenarios|boundary_maps|pathways|scenario_schedules|report_definitions)\b/;

async function neon(endpoint, conn, body, extraHeaders) {
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: Object.assign({
      'Content-Type': 'application/json',
      'Neon-Connection-String': conn,
      'Neon-Raw-Text-Output': 'false',
      'Neon-Array-Mode': 'true',
    }, extraHeaders || {}),
    body: JSON.stringify(body),
  });
  return { status: r.status, text: await r.text() };
}

/* Look the token up, bump its use counters, and return its scope + label.
   A revoked or unknown token returns null. */
async function resolveToken(endpoint, conn, token) {
  if (!token) return null;
  const r = await neon(endpoint, conn, {
    query: `UPDATE share_access.tokens SET use_count = COALESCE(use_count,0) + 1, last_used_at = now()
            WHERE token = $1 AND revoked_at IS NULL RETURNING label, scope`,
    params: [token],
  });
  if (r.status !== 200) return null;
  let j; try { j = JSON.parse(r.text); } catch (e) { return null; }
  const row = j.rows && j.rows[0];
  return row ? { label: row[0], scope: row[1] } : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const CONN = process.env.NEON_READONLY_URL;
  const ENDPOINT = process.env.NEON_SQL_ENDPOINT;
  if (!CONN || !ENDPOINT) { res.status(500).json({ error: 'Neon proxy is not configured.' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const query = String((body && body.query) || '');
  const params = ((body && body.params) || []).map((p) => (p == null ? null : String(p)));
  const trimmed = query.trim().replace(/;\s*$/, '');
  if (/;/.test(trimmed)) { res.status(403).json({ error: 'One statement per request.' }); return; }

  const token = String(req.headers['x-share-token'] || '');
  const savedBy = String(req.headers['x-share-name'] || '').slice(0, 80);

  // A bare token check the gate page uses: returns scope + label, nothing else.
  if (body && body.ping === true) {
    const t = await resolveToken(ENDPOINT, CONN, token);
    if (!t) { res.status(401).json({ error: 'That passcode is not valid.' }); return; }
    res.status(200).json({ ok: true, scope: t.scope, label: t.label });
    return;
  }

  const isRead = /^(select|with)\b/i.test(trimmed);
  if (isRead) {
    // Boundary Studio's data (everything under membership.) is behind the
    // passcode for reads as well, so the gate is real and not a curtain. The
    // Junior share reads other schemas and is unaffected.
    if (/\bmembership\./i.test(trimmed)) {
      const t = await resolveToken(ENDPOINT, CONN, token);
      if (!t || t.scope !== 'boundary') { res.status(401).json({ error: 'A valid Boundary Studio passcode is required.' }); return; }
    }
    const r = await neon(ENDPOINT, CONN, { query: trimmed, params });
    res.status(r.status); res.setHeader('Content-Type', 'application/json'); res.send(r.text);
    return;
  }

  // A write. Only a boundary-scoped token, only the four tables, always inside
  // a transaction that names the owner first so row-level security can act.
  const isWrite = /^(insert\s+into|update|delete\s+from)\s+([a-z_]+\.[a-z_]+)/i.exec(trimmed);
  if (!isWrite) { res.status(403).json({ error: 'Only a single SELECT, INSERT, UPDATE or DELETE is permitted.' }); return; }
  const table = isWrite[2].toLowerCase();
  if (!WRITE_TABLES.test(table)) { res.status(403).json({ error: 'Writes are not permitted to ' + table + ' from this deployment.' }); return; }

  const t = await resolveToken(ENDPOINT, CONN, token);
  if (!t || t.scope !== 'boundary') { res.status(401).json({ error: 'A valid Boundary Studio passcode is required to save.' }); return; }

  const r = await neon(ENDPOINT, CONN, {
    queries: [
      { query: 'SELECT set_config($1, $2, true), set_config($3, $4, true)', params: ['app.owner', t.label, 'app.saved_by', savedBy] },
      { query: trimmed, params },
    ],
  }, { 'Neon-Batch-Isolation-Level': 'ReadCommitted', 'Neon-Batch-Read-Only': 'false' });

  // Unwrap the batch so the browser client sees the same shape as a single query.
  try {
    const j = JSON.parse(r.text);
    if (j.results && j.results.length === 2) { res.status(r.status).json(j.results[1]); return; }
    // An error inside the batch surfaces as a top-level message; a row-level
    // security refusal lands here and reads plainly in the app.
    res.status(r.status === 200 ? 403 : r.status).json({ error: j.message || 'Save refused.' });
  } catch (e) {
    res.status(502).json({ error: 'Upstream Neon request failed.' });
  }
}
