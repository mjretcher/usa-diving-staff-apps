/* Validates a Microsoft Entra ID access token (RS256 JWT) without any external
 * dependency -- same reasoning as dropping @modelcontextprotocol/sdk: one less
 * package for Vercel's bundler to mistrace.
 *
 * Only active once ENTRA_TENANT_ID and ENTRA_AUDIENCE are both set as env vars.
 * Until then, isEntraConfigured() returns false and api/mcp.js's shared-secret
 * check is the only auth path -- adding this file changes nothing for the
 * already-working Claude/curl path.
 *
 * ENTRA_TENANT_ID — the directory (tenant) ID, from the Entra ID overview page.
 * ENTRA_AUDIENCE  — the "API" app registration's Application ID URI (the one
 *                   exposing the scope/app role), e.g. api://<app-id>.
 */

import { createPublicKey, verify } from 'node:crypto';

let cachedJwks = null; // { keys: [...], fetchedAt } -- reused across warm invocations only, never relied on as the sole source of truth
let cachedTenantId = null;

function base64UrlDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function isEntraConfigured() {
  return Boolean(process.env.ENTRA_TENANT_ID && process.env.ENTRA_AUDIENCE);
}

async function getJwks(tenantId) {
  if (cachedJwks && cachedTenantId === tenantId) return cachedJwks;
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`);
  if (!res.ok) throw new Error(`Failed to fetch Entra JWKS: ${res.status}`);
  const jwks = await res.json();
  cachedJwks = jwks;
  cachedTenantId = tenantId;
  return jwks;
}

// Exported separately from getJwks so tests can supply a JWK set directly,
// without a network call.
export function verifyJwtSignature(token, jwks) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
  if (header.alg !== 'RS256') throw new Error(`Unsupported alg: ${header.alg}`);

  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('No matching key for this token\'s kid');

  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const signature = base64UrlDecode(sigB64);
  const signedData = Buffer.from(`${headerB64}.${payloadB64}`);
  const valid = verify('RSA-SHA256', signedData, publicKey, signature);
  if (!valid) throw new Error('Signature verification failed');

  return JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));
}

export async function verifyEntraToken(token) {
  const tenantId = process.env.ENTRA_TENANT_ID;
  const audience = process.env.ENTRA_AUDIENCE;
  const jwks = await getJwks(tenantId);
  const claims = verifyJwtSignature(token, jwks);

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && claims.exp < now) throw new Error('Token expired');
  if (claims.nbf && claims.nbf > now) throw new Error('Token not yet valid');

  const expectedIssuerV2 = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const expectedIssuerV1 = `https://sts.windows.net/${tenantId}/`;
  if (claims.iss !== expectedIssuerV2 && claims.iss !== expectedIssuerV1) {
    throw new Error(`Unexpected issuer: ${claims.iss}`);
  }
  if (claims.aud !== audience) {
    throw new Error(`Unexpected audience: ${claims.aud}`);
  }

  return claims; // caller can inspect roles/scp if it ever needs to distinguish callers
}
