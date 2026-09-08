/* MCP server for USA Diving's internal staff apps.
 *
 * Exposes read-only tools over Junior Results Audit, Schedule Builder, and
 * Boundary Studio data to any MCP client — a Microsoft 365 Copilot federated
 * connector, or a Claude project connector — so both draw on the identical
 * live Neon data instead of two separate copies of the truth.
 *
 * v1 is READ-ONLY BY DESIGN. See project-instructions.md's selection-integrity
 * section on why a draft-and-review step, not a bare tool call, is required
 * before anything here is allowed to write to a live schedule or qualification
 * field. Boundary Studio's derived numbers (projected Nationals field size,
 * net revenue) are NOT exposed here — see list_boundary_scenarios' description.
 *
 * IMPLEMENTATION NOTE: this hand-rolls the MCP JSON-RPC protocol (initialize /
 * tools-list / tools-call) instead of using @modelcontextprotocol/sdk. That
 * package's subpath exports (only a root export + a "./*" wildcard, no direct
 * per-file entries) didn't bundle reliably through Vercel's dependency tracer —
 * first attempt found the ESM file but not its CJS counterpart, second attempt
 * (after scoping api/ to ESM) couldn't find the package at all. The protocol
 * subset actually needed here (single JSON response per request, no server-
 * initiated messages, no session state) is small enough that hand-rolling it
 * removes the bundling failure mode entirely, and matches this repo's existing
 * no-build-tooling convention better than fighting a package that doesn't
 * bundle cleanly in this environment. If a future SDK version ships flatter
 * exports, this can be revisited.
 *
 * Required Vercel environment variables (same as api/neon.js):
 *   NEON_READONLY_URL, NEON_SQL_ENDPOINT
 *
 * Additionally required — this endpoint is CALLABLE, not just readable, which
 * is a different risk than a static file: it needs its own auth regardless of
 * what platform hosts it.
 *   MCP_SHARED_SECRET  — a long random string. Callers must send
 *                        `Authorization: Bearer <MCP_SHARED_SECRET>`.
 *                        Generate with: openssl rand -hex 32
 */

import {
  getQualificationStatus,
  getZoneThresholds,
  getAthleteStatus,
  listSchedules,
  getSchedule,
  listBoundaryScenarios,
} from './_mcp-tools.js';

const SERVER_INFO = { name: 'usa-diving-internal-apps', version: '0.1.0' };
const PROTOCOL_VERSION = '2025-06-18';

// Plain JSON Schema (no zod) -- each entry pairs the schema tools/list needs
// to advertise with the function tools/call should invoke.
const TOOLS = [
  {
    name: 'get_qualification_status',
    description:
      'Counts of athletes in the projected Junior Nationals field, from the Junior Results Audit ' +
      'qualifier engine. This is a point-in-time snapshot published on demand, not a live feed — ' +
      'check published_at in the result. season is required (e.g. 2026). Optionally filter by ' +
      'age_group ("Group A".."Group D"), gender, discipline ("1-Meter"/"3-Meter"/"Platform"), zone, ' +
      'or qualification_path ("Zone Direct"/"E/W/C"). Qualification rules changed materially between ' +
      '2021–2025 and 2026 (the E/W/C tier did not exist before 2026) — never compare counts across ' +
      'that boundary without saying so explicitly.',
    inputSchema: {
      type: 'object',
      properties: {
        season: { type: 'integer' },
        age_group: { type: 'string' },
        gender: { type: 'string', enum: ['Boys', 'Girls'] },
        discipline: { type: 'string' },
        zone: { type: 'string' },
        qualification_path: { type: 'string' },
      },
      required: ['season'],
    },
    handler: getQualificationStatus,
  },
  {
    name: 'get_zone_thresholds',
    description:
      'The official average-score bar that admits additional finishers to the next stage — for 2026, ' +
      'the Art.303(b)(3)(ii) threshold that lets 4th–6th place E/W/C finishers advance to Junior ' +
      'Nationals; for 2021–2025, the Region→Zone 15th-place ±1SD threshold. year is required.',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer' },
        zone: { type: 'string' },
        event_key: { type: 'string' },
      },
      required: ['year'],
    },
    handler: getZoneThresholds,
  },
  {
    name: 'get_athlete_status',
    description:
      'Eligibility metadata for one athlete: HPS roster flag, foreign/dual declaration, YMCA, and ' +
      'whether already nationally qualified this cycle. Look up by name (case-insensitive partial ' +
      'match) or DiveMeets ID — provide at least one.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        dive_meets_id: { type: 'string' },
      },
    },
    handler: getAthleteStatus,
  },
  {
    name: 'list_schedules',
    description: 'List saved schedules, optionally filtered by year or meet_type, to find a schedule_id.',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'integer' },
        meet_type: { type: 'string' },
      },
    },
    handler: listSchedules,
  },
  {
    name: 'get_schedule',
    description:
      'Metadata and session list for one Schedule Builder schedule by id. publish_status of "draft" ' +
      'or "review" means it is NOT final — say so if asked to report on it. Use list_schedules first ' +
      "if you don't already have the id.",
    inputSchema: {
      type: 'object',
      properties: { schedule_id: { type: 'string' } },
      required: ['schedule_id'],
    },
    handler: getSchedule,
  },
  {
    name: 'list_boundary_scenarios',
    description:
      'Lists saved Boundary Studio regional-restructuring scenarios by id, name, and last-updated ' +
      'time only. Does NOT return derived figures like projected Nationals field size or net revenue — ' +
      'those are computed client-side by boundary.js from a large internal data structure this server ' +
      'does not interpret. If asked for those numbers, say they are not available through this tool ' +
      'yet and that Mike would need to pull them from the Boundary Studio UI directly.',
    inputSchema: {
      type: 'object',
      properties: { name_contains: { type: 'string' } },
    },
    handler: listBoundaryScenarios,
  },
];

const TOOLS_BY_NAME = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}
function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

async function handleRpc(msg) {
  // Notifications (no "id") get no response body -- caller sends 202 and stops.
  const isNotification = !('id' in msg);
  const { id, method, params } = msg;

  if (method === 'initialize') {
    return rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }

  if (method === 'notifications/initialized') {
    return null; // nothing to do, nothing to send back
  }

  if (method === 'tools/list') {
    return rpcResult(id, {
      tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    });
  }

  if (method === 'tools/call') {
    const toolName = params && params.name;
    const tool = TOOLS_BY_NAME[toolName];
    if (!tool) {
      return rpcError(id, -32602, `Unknown tool: ${toolName}`);
    }
    try {
      const data = await tool.handler((params && params.arguments) || {});
      return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false });
    } catch (e) {
      // Tool-level errors go back as a normal result with isError so the
      // calling model can see and react to the message, per MCP convention --
      // not as a JSON-RPC protocol error.
      return rpcResult(id, {
        content: [{ type: 'text', text: 'Error: ' + String((e && e.message) || e) }],
        isError: true,
      });
    }
  }

  if (isNotification) return null;
  return rpcError(id, -32601, `Method not found: ${method}`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed — MCP Streamable HTTP requires POST.' });
    return;
  }
  if (!process.env.NEON_SQL_ENDPOINT || !process.env.NEON_READONLY_URL) {
    res.status(500).json({
      error: 'MCP server is not configured (missing NEON_SQL_ENDPOINT / NEON_READONLY_URL env vars).',
    });
    return;
  }

  const secret = process.env.MCP_SHARED_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'MCP server is not configured (missing MCP_SHARED_SECRET env var).' });
    return;
  }
  const authHeader = req.headers['authorization'] || '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const { timingSafeEqual } = await import('node:crypto');
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  const authorized = a.length === b.length && timingSafeEqual(a, b);
  if (!authorized) {
    res.status(401).json({ error: 'Unauthorized — missing or invalid bearer token.' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        res.status(400).json(rpcError(null, -32700, 'Parse error'));
        return;
      }
    }

    // Support both a single JSON-RPC message and a batch array.
    const messages = Array.isArray(body) ? body : [body];
    const responses = [];
    for (const msg of messages) {
      const result = await handleRpc(msg);
      if (result) responses.push(result);
    }

    if (responses.length === 0) {
      // All notifications -- no content to return.
      res.status(202).end();
      return;
    }
    res.status(200).json(Array.isArray(body) ? responses : responses[0]);
  } catch (e) {
    console.error('MCP handler error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal MCP server error: ' + String((e && e.message) || e) });
    }
  }
}
