/* Eligibility ceiling and cohort load -- shared by every report and tool.
 *
 * Rulebook basis (stated by Mike, 2026-09-10): eligible to enter the Junior
 * Circuit = Competition Athlete memberships (17U and AQUA Age 18+), AQUA age
 * 18 or under at the end of the membership year. Plain "Athlete (17U)" is NOT
 * a competition membership and is excluded. AQUA age = membership year minus
 * birth year (birth month deliberately ignored, per domain rules).
 *
 * Projected attendance can never exceed actual registered members. This module
 * converts projected ENTRIES to projected UNIQUE athletes using the real,
 * measured events-per-athlete for that year, stage and cohort (one athlete may
 * enter up to three events), and reports unique athletes as a percentage of
 * the eligible cohort. Members whose gender is unresolved in
 * membership.member_gender are carried on a separate line, never silently
 * assigned.
 */

import { neonQuery } from './_neon.js';

const GROUP_LABEL = { A: 'Group A (16-18)', B: 'Group B (14-15)', C: 'Group C (12-13)', D: 'Group D (11 & under)' };
const GENDER_LABEL = { B: 'Boys', G: 'Girls', '?': 'gender unresolved' };

const cache = { eligible: {}, epa: {} };

export async function eligibleByCohort(year) {
  if (cache.eligible[year]) return cache.eligible[year];
  const rows = await neonQuery(
    `with m as (
       select member_id, (membership_year - extract(year from birth_date))::int as aqua_age
       from membership.members
       where membership_year = $1
         and membership_type in ('Competition Athlete (17U)','Competition Athlete (AQUA Age 18+)')
         and birth_date is not null),
     g as (
       select member_id,
              case when aqua_age between 16 and 18 then 'A'
                   when aqua_age between 14 and 15 then 'B'
                   when aqua_age between 12 and 13 then 'C'
                   when aqua_age <= 11 then 'D' end as grp
       from m where aqua_age <= 18)
     select g.grp,
            case coalesce(mg.gender,'?') when 'Boys' then 'B' when 'Girls' then 'G' else '?' end as gender,
            count(distinct g.member_id)::int as eligible
     from g left join membership.member_gender mg on mg.member_id = g.member_id
     where g.grp is not null
     group by 1,2`,
    [year]
  );
  const out = {};
  for (const r of rows) out[r.grp + r.gender] = r.eligible;
  cache.eligible[year] = out;
  return out;
}

/* Real events-per-athlete for a year/stage, per cohort, with a stage-wide
   fallback for cohorts too small to measure. */
export async function eventsPerAthlete(year, stage) {
  const key = year + '|' + stage;
  if (cache.epa[key]) return cache.epa[key];
  const rows = await neonQuery(
    `select right(age_group,1) as grp,
            case gender when 'Boys' then 'B' when 'Girls' then 'G' end as gender,
            count(distinct diver_id_dm)::int as unique_athletes,
            count(distinct diver_id_dm||'|'||event_key)::int as entries
     from core.event_results
     where is_junior_circuit and year = $1 and stage = $2 and diver_id_dm is not null
     group by 1,2`,
    [year, stage]
  );
  const out = { byCohort: {}, stageWide: null };
  let u = 0, e = 0;
  for (const r of rows) {
    if (!r.gender) continue;
    out.byCohort[r.grp + r.gender] = r.entries / r.unique_athletes;
    u += r.unique_athletes; e += r.entries;
  }
  out.stageWide = u ? e / u : null;
  cache.epa[key] = out;
  return out;
}

/* The stage in core.event_results whose events-per-athlete best describes a
   tier. Nationals has its own real measurement; anything unrecognised uses Zones. */
export function stageForTierName(name) {
  const n = String(name || '').toLowerCase();
  if (/region/.test(n)) return 'Regionals';
  if (/zone/.test(n)) return 'Zones';
  if (/east|west|central|e\s*\/\s*w\s*\/\s*c|\bewc\b/.test(n)) return 'EWC';
  if (/national/.test(n)) return 'Nationals';
  return 'Zones';
}

/* perCellEntries: { 'AG1': n, ... } (24 cells). Returns one row per
   age-group x gender cohort plus a designation summary. */
export async function cohortLoad(perCellEntries, year, tierName) {
  const stage = stageForTierName(tierName);
  const [eligible, epa, e24, e25, e26] = await Promise.all([eligibleByCohort(year), eventsPerAthlete(year, stage), eligibleByCohort(2024), eligibleByCohort(2025), eligibleByCohort(2026)]);
  const eligibleAll = { 2024: e24, 2025: e25, 2026: e26 };
  // events-per-athlete year fallback: a stage that did not run in `year`
  // (e.g. EWC in 2024/2025) measures from the nearest year that has it.
  let epaUse = epa;
  if (!epa.stageWide) {
    for (const y of [2026, 2025, 2024]) { const alt = await eventsPerAthlete(y, stage); if (alt.stageWide) { epaUse = alt; break; } }
  }
  const byCohort = {};
  for (const cell of Object.keys(perCellEntries)) {
    const k = cell.slice(0, 2);
    byCohort[k] = (byCohort[k] || 0) + (perCellEntries[cell] || 0);
  }
  const rows = ['AB','AG','BB','BG','CB','CG','DB','DG'].map((k) => {
    const entries = byCohort[k] || 0;
    const ev = epaUse.byCohort[k] || epaUse.stageWide || 2.2;
    const unique = entries / ev;
    const elig = eligible[k] || 0;
    // Members whose gender is unresolved cannot be placed in a cohort. Allocate
    // them to boys/girls in the resolved ratio for an UPPER ceiling, and report
    // both: pct against resolved-only (high) and against allocated (low). The
    // truth is inside that band; neither number is presented as exact.
    const g = k[0];
    const unres = eligible[g + '?'] || 0;
    const resolvedTotal = (eligible[g + 'B'] || 0) + (eligible[g + 'G'] || 0);
    const share = resolvedTotal ? elig / resolvedTotal : 0.5;
    const eligHigh = elig + unres * share;
    // The same projected unique athletes against EACH year's real membership,
    // so a reader can toggle the ceiling (2024 / 2025 / 2026 actuals).
    const pctByMembershipYear = {};
    for (const y of [2024, 2025, 2026]) {
      const ey = eligibleAll[y] || {};
      const e0 = ey[k] || 0, u0 = ey[g + '?'] || 0;
      const rt = (ey[g + 'B'] || 0) + (ey[g + 'G'] || 0);
      const eHigh = e0 + u0 * (rt ? e0 / rt : 0.5);
      pctByMembershipYear[y] = e0 ? { eligible: e0, pct: +(100 * unique / e0).toFixed(1), pctLow: eHigh ? +(100 * unique / eHigh).toFixed(1) : null } : null;
    }
    return {
      cohort: k, ageGroup: GROUP_LABEL[k[0]], gender: GENDER_LABEL[k[1]],
      entries: Math.round(entries), uniqueAthletes: Math.round(unique),
      eventsPerAthlete: +ev.toFixed(2),
      eligibleMembers: elig, eligibleMembersIncludingUnresolved: Math.round(eligHigh),
      pctOfEligible: elig ? +(100 * unique / elig).toFixed(1) : null,
      pctOfEligibleLow: eligHigh ? +(100 * unique / eligHigh).toFixed(1) : null,
      exceedsEligible: elig ? unique > elig : null,
      exceedsEvenWithUnresolved: eligHigh ? unique > eligHigh : null,
      pctByMembershipYear,
    };
  });
  const unresolved = ['A','B','C','D'].reduce((a, g) => a + (eligible[g + '?'] || 0), 0);
  const cd = rows.filter((r) => /^[CD]/.test(r.cohort));
  return {
    stageUsedForEventsPerAthlete: stage,
    eligibleYear: year,
    rows,
    genderUnresolvedMembers: unresolved,
    ages13AndUnder: {
      label: 'Of which ages 13 & under (Groups C and D)',
      entries: cd.reduce((a, r) => a + r.entries, 0),
      uniqueAthletes: cd.reduce((a, r) => a + r.uniqueAthletes, 0),
      shareOfTierUnique: (() => { const all = rows.reduce((a, r) => a + r.uniqueAthletes, 0); const u = cd.reduce((a, r) => a + r.uniqueAthletes, 0); return all ? +(100 * u / all).toFixed(1) : null; })(),
      note: 'How many of this tier\'s athletes are Group C (ages 12-13) or Group D (11 and under). Shown separately because their first-stop participation was non-mandatory in 2026 only; projections assume they compete at the first stop.',
    },
    anyCohortExceedsEligible: rows.some((r) => r.exceedsEligible),
    over100Note: 'A cohort above 100% of eligible members means real competitors outnumber registered competition members in that cohort. Documented causes: members whose gender is unresolved (carried as a band, see pctOfEligibleLow), and foreign athletes, who compete at Regionals as non-members and are outside the membership ceiling.',
    tightestCohort: rows.filter((r) => r.pctOfEligible != null).sort((a, b) => b.pctOfEligible - a.pctOfEligible)[0] || null,
  };
}

export function yearFromCode(code) { return code === 'y24' ? 2024 : code === 'y25' ? 2025 : 2026; }

/* Region-choice movement, measured from real entries in the audit data, per
   year. Regional step: share of athletes competing outside their club's home
   region (club home = the region its athletes compete in most, 2021-2026 --
   a proxy for residence, which is PII this role cannot read; treat as an
   upper bound). Zone step: share who entered at Zones with no Regionals row
   that year ("entered first"), and share at a zone other than the one their
   own Regionals region feeds ("moved at zone"). These are the bands carried
   on projections; region choice is not predicted, only measured. */
const moveCache = {};
export async function movementRates() {
  if (moveCache.rows) return moveCache.rows;
  const rows = await neonQuery(`
    with base as (select year, stage, diver_id_dm, team_id_dm, region, zone from core.event_results
                  where is_junior_circuit and diver_id_dm is not null and year between 2021 and 2026),
    reg as (select distinct year, diver_id_dm, team_id_dm, region from base where stage='Regionals' and region is not null),
    zon as (select distinct year, diver_id_dm, team_id_dm, zone from base where stage='Zones' and zone is not null),
    club_home as (select team_id_dm, region as home_region from (
        select team_id_dm, region, count(*) n, row_number() over (partition by team_id_dm order by count(*) desc) rn from reg group by 1,2) t where rn=1),
    r2z as (select year, region, zone from (
        select r.year, r.region, z.zone, count(*) n, row_number() over (partition by r.year, r.region order by count(*) desc) rn
        from reg r join zon z on z.year=r.year and z.diver_id_dm=r.diver_id_dm group by 1,2,3) t where rn=1),
    rs as (select r.year, r.diver_id_dm, case when ch.home_region is null then 'unknown' when ch.home_region=r.region then 'home' else 'moved' end st
           from reg r left join club_home ch on ch.team_id_dm=r.team_id_dm),
    zs as (select z.year, z.diver_id_dm, case when r.region is null then 'entered_first' when y.zone=z.zone then 'home' else 'moved' end st
           from zon z left join reg r on r.year=z.year and r.diver_id_dm=z.diver_id_dm left join r2z y on y.year=z.year and y.region=r.region)
    select year,
      (select count(distinct diver_id_dm) from rs x where x.year=t.year)::int as regionals_athletes,
      (select count(distinct diver_id_dm) from rs x where x.year=t.year and st='moved')::int as regionals_moved,
      (select count(distinct diver_id_dm) from rs x where x.year=t.year and st='unknown')::int as regionals_unknown_club,
      (select count(distinct diver_id_dm) from zs x where x.year=t.year)::int as zones_athletes,
      (select count(distinct diver_id_dm) from zs x where x.year=t.year and st='entered_first')::int as zones_entered_first,
      (select count(distinct diver_id_dm) from zs x where x.year=t.year and st='moved')::int as zones_moved
    from (select distinct year from base where year between 2024 and 2026) t order by year`);
  const out = {};
  for (const r of rows) {
    out[r.year] = {
      regionals: { athletes: r.regionals_athletes, competedOutsideClubHomeRegion: r.regionals_moved,
                   rate: +(100 * r.regionals_moved / r.regionals_athletes).toFixed(1), unknownClubHome: r.regionals_unknown_club },
      zones: { athletes: r.zones_athletes, enteredAtZonesFirst: r.zones_entered_first,
               enteredFirstRate: +(100 * r.zones_entered_first / r.zones_athletes).toFixed(1),
               movedAtZone: r.zones_moved, movedAtZoneRate: +(100 * r.zones_moved / r.zones_athletes).toFixed(1) },
    };
  }
  moveCache.rows = out;
  return out;
}
