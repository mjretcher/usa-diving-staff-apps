/* Tool implementations for the USA Diving internal-apps MCP server.
 *
 * Every function here is READ-ONLY by construction (see api/_neon.js's guard).
 * Kept separate from api/mcp.js so these can be unit-tested directly against
 * real Neon data without going through the MCP protocol/transport layer:
 *
 *   node --input-type=module -e "
 *     import { getQualificationStatus } from './api/_mcp-tools.js';
 *     console.log(await getQualificationStatus({ season: 2026 }));
 *   "
 *
 * v1 scope is deliberately READ-ONLY. Nothing here writes to Schedule Builder,
 * Boundary Studio, or any qualification data — see project-instructions.md on
 * why draft/commit tools need a human review step before they're built.
 */

import { neonQuery } from './_neon.js';
import { computeBoundaryMoneyReport } from './_boundary-money.js';

function addEq(clauses, params, col, val) {
  if (val != null && val !== '') {
    params.push(val);
    clauses.push(`${col} = $${params.length}`);
  }
}

export async function getQualificationStatus({
  season,
  age_group,
  gender,
  discipline,
  zone,
  qualification_path,
} = {}) {
  if (season == null) throw new Error('season is required, e.g. 2026.');
  const clauses = [];
  const params = [];
  addEq(clauses, params, 'season', season);
  addEq(clauses, params, 'age_group', age_group);
  addEq(clauses, params, 'gender', gender);
  addEq(clauses, params, 'discipline', discipline);
  addEq(clauses, params, 'zone', zone);
  addEq(clauses, params, 'qualification_path', qualification_path);
  return neonQuery(
    `select age_group, gender, discipline, zone, qualification_path,
            count(*)::int as athlete_count, max(published_at) as published_at
     from junior_results.projected_nationals_field
     where ${clauses.join(' and ')}
     group by 1,2,3,4,5
     order by 1,2,3,4,5`,
    params
  );
}

export async function getZoneThresholds({ year, zone, event_key } = {}) {
  if (year == null) throw new Error('year is required.');
  const clauses = [];
  const params = [];
  addEq(clauses, params, 'year', year);
  addEq(clauses, params, 'zone', zone);
  addEq(clauses, params, 'event_key', event_key);
  return neonQuery(
    `select zone, event_name, event_key, threshold_score, updated_at
     from junior_results.zone_thresholds
     where ${clauses.join(' and ')}
     order by zone, event_sort`,
    params
  );
}

export async function getAthleteStatus({ name, dive_meets_id } = {}) {
  if (!name && !dive_meets_id) throw new Error('Provide name or dive_meets_id.');
  const clauses = [];
  const params = [];
  if (name) {
    params.push(`%${String(name).toLowerCase()}%`);
    clauses.push(`lower(name) like $${params.length}`);
  }
  if (dive_meets_id) {
    params.push(dive_meets_id);
    clauses.push(`dive_meets_id = $${params.length}`);
  }
  return neonQuery(
    `select name, dive_meets_id, gender, age_group, region, zone, ewc_meet, team,
            hps, ymca, foreign_declared, dual_declared, already_nat_qual, updated_at
     from junior_results.athlete_status
     where ${clauses.join(' or ')}
     limit 25`,
    params
  );
}

export async function listSchedules({ year, meet_type } = {}) {
  const clauses = ['1=1'];
  const params = [];
  addEq(clauses, params, 'year', year);
  addEq(clauses, params, 'meet_type', meet_type);
  return neonQuery(
    `select id, name, meet_type, year, publish_status, updated_at
     from schedule_builder.schedules
     where ${clauses.join(' and ')}
     order by updated_at desc
     limit 25`,
    params
  );
}

export async function getSchedule({ schedule_id } = {}) {
  if (!schedule_id) throw new Error('schedule_id is required — use list_schedules to find one.');
  const rows = await neonQuery(
    `select id, name, meet_type, year, publish_status, updated_at, data->'sessions' as sessions
     from schedule_builder.schedules
     where id = $1`,
    [schedule_id]
  );
  return rows[0] || null;
}

export async function getBoundaryScenarioFinances({ scenario_id, cd_first_stop, ceiling_year, late_fee_share } = {}) {
  if (!scenario_id) throw new Error('scenario_id is required -- use list_boundary_scenarios to find one.');
  const opts = {};
  if (cd_first_stop != null) opts.cdFirstStop = !!cd_first_stop;
  if (ceiling_year != null) { const y = +ceiling_year; if (![2024, 2025, 2026].includes(y)) throw new Error('ceiling_year must be 2024, 2025 or 2026'); opts.ceilingYear = y; }
  if (late_fee_share != null) { const r = +late_fee_share; if (!(r >= 0 && r <= 1)) throw new Error('late_fee_share must be between 0 and 1'); opts.lateFeeShare = r; }
  const report = await computeBoundaryMoneyReport(scenario_id, opts);
  if (!report) throw new Error(`No boundary scenario found with id ${scenario_id}.`);
  return report;
}

export async function get2025RulesModel() {
  const { compute2025Model } = await import('./_2025-model.js');
  return compute2025Model();
}

export async function get2026CurrentModel() {
  const { compute2026BaselineWithNationals } = await import('./_2026-model.js');
  return compute2026BaselineWithNationals();
}

export async function listBoundaryScenarios({ name_contains } = {}) {
  const clauses = ['1=1'];
  const params = [];
  if (name_contains) {
    params.push(`%${name_contains}%`);
    clauses.push(`name ilike $${params.length}`);
  }
  return neonQuery(
    `select id, name, created_at, updated_at
     from membership.boundary_scenarios
     where ${clauses.join(' and ')}
     order by updated_at desc
     limit 25`,
    params
  );
}
