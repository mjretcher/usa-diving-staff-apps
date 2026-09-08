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
 * net revenue) are NOT exposed here — they're computed client-side by
 * boundary.js from an internal data structure this server doesn't interpret;
 * see list_boundary_scenarios' description for why that's a deliberate v1 gap,
 * not an oversight.
 *
 * Stateless Streamable HTTP transport (sessionIdGenerator: undefined) — a new
 * McpServer + transport per request, which is the documented pattern for
 * serverless hosts that don't keep a process alive between calls.
 *
 * Required Vercel environment variables (same as api/neon.js):
 *   NEON_READONLY_URL, NEON_SQL_ENDPOINT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import {
  getQualificationStatus,
  getZoneThresholds,
  getAthleteStatus,
  listSchedules,
  getSchedule,
  listBoundaryScenarios,
} from './_mcp-tools.js';

function asToolResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function buildServer() {
  const server = new McpServer({ name: 'usa-diving-internal-apps', version: '0.1.0' });

  server.registerTool(
    'get_qualification_status',
    {
      title: 'Junior Circuit qualification status',
      description:
        'Counts of athletes in the projected Junior Nationals field, from the Junior Results Audit ' +
        'qualifier engine. This is a point-in-time snapshot published on demand, not a live feed — ' +
        'check published_at in the result. season is required (e.g. 2026). Optionally filter by ' +
        'age_group ("Group A".."Group D"), gender, discipline ("1-Meter"/"3-Meter"/"Platform"), zone, ' +
        'or qualification_path ("Zone Direct"/"E/W/C"). Qualification rules changed materially between ' +
        '2021–2025 and 2026 (the E/W/C tier did not exist before 2026) — never compare counts across ' +
        'that boundary without saying so explicitly.',
      inputSchema: {
        season: z.number().int(),
        age_group: z.string().optional(),
        gender: z.enum(['Boys', 'Girls']).optional(),
        discipline: z.string().optional(),
        zone: z.string().optional(),
        qualification_path: z.string().optional(),
      },
    },
    async (args) => asToolResult(await getQualificationStatus(args))
  );

  server.registerTool(
    'get_zone_thresholds',
    {
      title: 'Zone / E-W-C average-score qualifying thresholds',
      description:
        'The official average-score bar that admits additional finishers to the next stage — for 2026, ' +
        'the Art.303(b)(3)(ii) threshold that lets 4th–6th place E/W/C finishers advance to Junior ' +
        'Nationals; for 2021–2025, the Region→Zone 15th-place ±1SD threshold. year is required.',
      inputSchema: {
        year: z.number().int(),
        zone: z.string().optional(),
        event_key: z.string().optional(),
      },
    },
    async (args) => asToolResult(await getZoneThresholds(args))
  );

  server.registerTool(
    'get_athlete_status',
    {
      title: 'Athlete eligibility status',
      description:
        'Eligibility metadata for one athlete: HPS roster flag, foreign/dual declaration, YMCA, and ' +
        'whether already nationally qualified this cycle. Look up by name (case-insensitive partial ' +
        'match) or DiveMeets ID — provide at least one.',
      inputSchema: {
        name: z.string().optional(),
        dive_meets_id: z.string().optional(),
      },
    },
    async (args) => asToolResult(await getAthleteStatus(args))
  );

  server.registerTool(
    'list_schedules',
    {
      title: 'List Schedule Builder schedules',
      description: 'List saved schedules, optionally filtered by year or meet_type, to find a schedule_id.',
      inputSchema: {
        year: z.number().int().optional(),
        meet_type: z.string().optional(),
      },
    },
    async (args) => asToolResult(await listSchedules(args))
  );

  server.registerTool(
    'get_schedule',
    {
      title: 'Meet schedule detail',
      description:
        'Metadata and session list for one Schedule Builder schedule by id. publish_status of "draft" ' +
        'or "review" means it is NOT final — say so if asked to report on it. Use list_schedules first ' +
        'if you don\'t already have the id.',
      inputSchema: { schedule_id: z.string() },
    },
    async (args) => asToolResult(await getSchedule(args))
  );

  server.registerTool(
    'list_boundary_scenarios',
    {
      title: 'Boundary Studio scenarios (metadata only, v1)',
      description:
        'Lists saved Boundary Studio regional-restructuring scenarios by id, name, and last-updated ' +
        'time only. Does NOT return derived figures like projected Nationals field size or net revenue — ' +
        'those are computed client-side by boundary.js from a large internal data structure this server ' +
        'does not interpret. If asked for those numbers, say they are not available through this tool ' +
        'yet and that Mike would need to pull them from the Boundary Studio UI directly.',
      inputSchema: { name_contains: z.string().optional() },
    },
    async (args) => asToolResult(await listBoundaryScenarios(args))
  );

  return server;
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

  try {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error('MCP handler error:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal MCP server error: ' + String((e && e.message) || e) });
    }
  }
}
