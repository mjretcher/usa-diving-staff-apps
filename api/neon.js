/* Serverless Neon SQL proxy — used ONLY by the Vercel deployment.
 *
 * Purpose: external viewers of the Junior Results app must NEVER receive a
 * database credential in the browser. The browser posts { query, params } to
 * this function; the function attaches a READ-ONLY Neon connection string from
 * a server-side environment variable and forwards to Neon's HTTP SQL endpoint.
 * The credential never leaves the server.
 *
 * Defense in depth: even though the role itself is read-only, this proxy also
 * rejects anything that isn't a single SELECT / WITH read query.
 *
 * Required Vercel environment variables (Project → Settings → Environment Variables):
 *   NEON_READONLY_URL  — postgresql://<readonly_role>:<pwd>@<pooler-host>/neondb?sslmode=require&channel_binding=require
 *   NEON_SQL_ENDPOINT  — https://ep-holy-bird-aj5deo63.c-3.us-east-2.aws.neon.tech/sql   (direct host, no -pooler)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed — POST only' });
    return;
  }

  const CONN = process.env.NEON_READONLY_URL;
  const ENDPOINT = process.env.NEON_SQL_ENDPOINT;
  if (!CONN || !ENDPOINT) {
    res.status(500).json({ error: 'Neon proxy is not configured (missing NEON_READONLY_URL / NEON_SQL_ENDPOINT).' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const query = (body && body.query) || '';
  const params = ((body && body.params) || []).map(function (p) { return p == null ? null : String(p); });

  // Read-only guard: allow a single SELECT / WITH statement only.
  const trimmed = String(query).trim().replace(/;\s*$/, '');
  if (!/^(select|with)\b/i.test(trimmed) || /;/.test(trimmed)) {
    res.status(403).json({ error: 'This deployment is read-only — only a single SELECT/WITH query is permitted.' });
    return;
  }

  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': CONN,
        'Neon-Raw-Text-Output': 'false',
        'Neon-Array-Mode': 'true',
      },
      body: JSON.stringify({ query: query, params: params }),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'Upstream Neon request failed: ' + String((e && e.message) || e) });
  }
}
