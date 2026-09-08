/* Shared server-side Neon HTTP SQL client.
 *
 * Used by api/neon.js (the browser proxy) and api/mcp.js (the MCP server).
 * Never imported by client-side code — the connection string lives only in
 * process.env on Vercel, set via Project → Settings → Environment Variables:
 *   NEON_READONLY_URL  — postgresql://<role>:<pwd>@<pooler-host>/neondb?sslmode=require&channel_binding=require
 *   NEON_SQL_ENDPOINT  — https://ep-holy-bird-aj5deo63.c-3.us-east-2.aws.neon.tech/sql  (direct host, no -pooler)
 */

export async function neonQuery(sql, params = []) {
  const endpoint = process.env.NEON_SQL_ENDPOINT;
  const conn = process.env.NEON_READONLY_URL;
  if (!endpoint || !conn) {
    throw new Error('Neon is not configured — missing NEON_SQL_ENDPOINT / NEON_READONLY_URL env vars.');
  }

  const trimmed = String(sql).trim().replace(/;\s*$/, '');
  if (!/^(select|with)\b/i.test(trimmed) || /;/.test(trimmed)) {
    // Defense in depth — every tool in this file only ever constructs SELECT/WITH
    // queries, but this guard means a future mistake can't silently become a write.
    throw new Error('Refusing non-SELECT query: ' + trimmed.slice(0, 80));
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': conn,
      'Neon-Raw-Text-Output': 'false',
      'Neon-Array-Mode': 'true',
    },
    body: JSON.stringify({
      query: trimmed,
      params: params.map((p) => (p == null ? null : String(p))),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neon query failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const fields = (data.fields || []).map((f) => f.name);
  const rows = (data.rows || []).map((arr) =>
    Object.fromEntries(fields.map((f, i) => [f, arr[i]]))
  );
  return rows;
}
