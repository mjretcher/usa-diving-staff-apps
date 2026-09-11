/* Financial projection for the CURRENT 2026 rules, using the real saved
 * "Official 2026 Alignment" scenario -- extended with the Nationals tier it
 * doesn't otherwise report.
 *
 * WHY THIS NEEDS EXTENDING AT ALL
 * ------------------------------------------------------------------------
 * The saved scenario's own stored structure only goes Regions -> Zones ->
 * E/W/C; it has no fourth "Nationals" level, so financialsFor() on it alone
 * never reports a National tier's spots/fill/revenue, unlike CCE Submission
 * and USA Diving National Office Submission, which both do. Confirmed by
 * running it unmodified and finding no fourth tier in the output.
 *
 * WHY THIS DOESN'T NEED A BYPASS (unlike api/_2025-model.js)
 * ------------------------------------------------------------------------
 * The 2025 model needed to bypass the automatic take-up calibration because
 * that calibration is built for the CURRENT system's structure -- applying
 * it to a genuinely different, older ruleset would silently substitute the
 * wrong number. Here, the opposite is true: this scenario IS the current
 * system, so the automatic calibration for levels 0-2 (Regions/Zones/E-W-C)
 * is legitimate and is used as-is via the real, unmodified financialsFor().
 * Only the missing Nationals tier is added, using the "entering" mechanism
 * (same technique already used for platform's direct Zone entry) fed by
 * REAL, ALREADY-COMPUTED current data -- not a re-derived simulation.
 *
 * DATA SOURCE FOR THE NATIONALS TIER
 * ------------------------------------------------------------------------
 * junior_results.projected_nationals_field, season=2026 -- this project's
 * own existing, already-vetted table for exactly this question (who is
 * currently projected to reach Nationals, and by which path). Summed
 * Zone Direct + E/W/C per cell. A further 29 real HPS ("not yet competed")
 * athletes exist in that table under a discipline-ambiguous placeholder
 * cell code and are NOT included in the per-cell entering total below --
 * noted here and in the tool's own output, not silently dropped.
 */

/* CORRECTION 2026-09-10: the scenario's own automatic calibration (used in
 * the previous version of this file) was checked against real, already-
 * completed 2026 meets (core.event_results) and found to be unreliable --
 * not just off by a stale rate, but zigzagging over- and under-real across
 * different tiers (Regions and E/W/C overstated, Zones and Nationals
 * understated), which means the saved scenario's structure doesn't
 * precisely match how the real season actually played out. Rather than
 * trust that calibration for any tier, this now uses real, directly
 * measured distinct-entry counts (diver+event, deduplicated across rounds)
 * from core.event_results for ALL FOUR tiers -- the same standard already
 * applied to the 2025 Model, extended here to the current system too.
 *
 * Real 2026 distinct entries (core.event_results, is_junior_circuit,
 * counting each diver+event once regardless of how many rounds -- prelim/
 * semi/final rows for the same real entry were confirmed to double- or
 * triple-count in a naive row count):
 *   Regionals: 2,405   Zones: 2,398   EWC: 1,046   Nationals: 757
 */

import { buildWindow } from './_boundary-money.js';
import { neonQuery } from './_neon.js';
import { cohortLoad, movementRates } from './_eligibility.js';

const REAL_2026_ENTRIES = { Regions: 2405, Zones: 2398, 'E / W / C': 1046, Nationals: 757 };

/* Real 2026 per-cell entries for a stage (diver+event, deduplicated across rounds). */
async function realPerCell2026(stage) {
  const rows = await neonQuery(
    `select right(age_group,1)||left(gender,1)||(case discipline when '1M' then '1' when '3M' then '3' when 'Platform' then 'P' end) as cell,
            count(distinct diver_id_dm||'|'||event_key)::int as entries
     from core.event_results
     where is_junior_circuit and year = 2026 and stage = $1 and diver_id_dm is not null
     group by 1`, [stage]);
  const m = {}; for (const r of rows) if (r.cell && !/null/.test(r.cell)) m[r.cell] = r.entries; return m;
}

/* Real 2026 per-meet entries and the fee DiveMeets published for that meet.
   Regionals (all 12) and Zones C and D publish "varies at checkout" -- host-set,
   so no flat fee exists; those stops carry the model's default fee and are
   flagged hostSetFee: true. */
async function realPerMeet2026() {
  const rows = await neonQuery(
    `with e as (select meet_id_dm, stage, count(distinct diver_id_dm||'|'||event_key) filter (where not is_synchro)::int as individual,
                       count(distinct diver_id_dm||'|'||event_key) filter (where is_synchro)::int as synchro
                from core.event_results where is_junior_circuit and year=2026 and diver_id_dm is not null group by 1,2)
     select e.stage, e.meet_id_dm, dm.meet_name, e.individual, e.synchro,
            (dm.info::jsonb)->>'Fee per Event' as fee_text, (dm.info::jsonb)->>'Late Fee' as late_text
     from e left join divemeets.meets dm on dm.meet_id::text = e.meet_id_dm::text
     order by case e.stage when 'Regionals' then 1 when 'Zones' then 2 when 'EWC' then 3 else 4 end, e.meet_id_dm`);
  return rows.map((r) => { const m = /\$?([0-9]+(?:\.[0-9]+)?)/.exec(r.fee_text || ''); return {
    stage: r.stage, meetId: r.meet_id_dm, name: r.meet_name, individualEntries: r.individual, synchroEntries: r.synchro,
    publishedFeePerEvent: m ? +m[1] : null, hostSetFee: !m, lateFeePublished: (/\$?([0-9]+)/.exec(r.late_text || '') || [])[1] ? +(/\$?([0-9]+)/.exec(r.late_text)[1]) : null }; });
}

async function computeTierFromRealEntries(level, entries, hostSettings) {
  const { w } = buildWindow();
  const I = w.__boundaryInternal;
  const S = I.S;
  S.levels = [{ name: 'Regions' }, { name: 'Zones' }, { name: 'E / W / C' }, { name: 'Nationals' }];
  S.fees = null; // DEFAULT_FEES -- same basis as CCE Submission and the rest of this report
  Object.assign(S, hostSettings);
  const money = I.meetMoney({ level, entries });
  return {
    level: S.levels[level].name, meets: null, entries,
    spots: null, fillRate: null,
    grossEntryIncome: Math.round(money.gross), diveMeetsPassThrough: Math.round(money.levy),
    toHosts: Math.round(money.host), usaDivingKeeps: Math.round(money.usad),
    measuredTakeUp: true, biggestToSmallestRatio: null,
  };
}

export async function compute2026BaselineWithNationals() {
  const hostSettings = { hostMode: 'per_entry', hostShare: 0.25, hostFlat: 3000, hostPer: 25, hostMin: 0 };
  const levelIndex = { Regions: 0, Zones: 1, 'E / W / C': 2, Nationals: 3 };

  const stageOf = { Regions: 'Regionals', Zones: 'Zones', 'E / W / C': 'EWC', Nationals: 'Nationals' };
  const perTier = [];
  for (const [name, entries] of Object.entries(REAL_2026_ENTRIES)) {
    const t = await computeTierFromRealEntries(levelIndex[name], entries, hostSettings);
    t.cohortLoad = await cohortLoad(await realPerCell2026(stageOf[name]), 2026, name);
    perTier.push(t);
  }

  const grossEntryIncome = perTier.reduce((a, t) => a + t.grossEntryIncome, 0);
  const diveMeetsPassThrough = perTier.reduce((a, t) => a + t.diveMeetsPassThrough, 0);
  const toHosts = perTier.reduce((a, t) => a + t.toHosts, 0);
  const usaDivingKeeps = perTier.reduce((a, t) => a + t.usaDivingKeeps, 0);

  const movementBand = await movementRates();
  // Per stop, from real entries and published fees. Host cost per meet uses the
  // same real meetMoney() formula, with the published per-event fee where it is
  // flat and the model default where the host sets pricing at checkout.
  const stageLevel = { Regionals: 0, Zones: 1, EWC: 2, Nationals: 3 };
  const realMeets = await realPerMeet2026();
  const perMeet = [];
  for (const rm of realMeets) {
    const { w } = buildWindow(); const I = w.__boundaryInternal; const S = I.S;
    S.levels = [{ name: 'Regions' }, { name: 'Zones' }, { name: 'E / W / C' }, { name: 'Nationals' }];
    S.fees = rm.publishedFeePerEvent != null ? { [stageLevel[rm.stage]]: rm.publishedFeePerEvent } : null;
    Object.assign(S, hostSettings);
    const entries = rm.individualEntries + rm.synchroEntries;
    const money = I.meetMoney({ level: stageLevel[rm.stage], entries });
    perMeet.push({ tier: rm.stage === 'EWC' ? 'E / W / C' : rm.stage === 'Regionals' ? 'Regions' : rm.stage, stop: rm.name, entries,
      individualEntries: rm.individualEntries, synchroEntries: rm.synchroEntries,
      feePerEvent: money.fee, feeSource: rm.hostSetFee ? 'host-set at checkout (model default used)' : 'published on DiveMeets',
      lateFeePublished: rm.lateFeePublished,
      grossEntryIncome: Math.round(money.gross), diveMeetsPassThrough: Math.round(money.levy), toHosts: Math.round(money.host), usaDivingKeeps: Math.round(money.usad) });
  }
  const mvRate = ((movementBand[2026] || {}).regionals || {}).rate || 0;
  const band = (v) => ({ low: Math.round(v * (1 - mvRate / 100)), point: Math.round(v), high: Math.round(v * (1 + mvRate / 100)) });
  return {
    assumptions: { basis: 'real 2026 entries at every tier (competed athletes only -- paid-but-not-competed entries and late fees are not in results data)', ceilingYear: 2026 },
    movementBandApplied: { ratePct: mvRate, firstTierEntries: band(perTier[0].entries), usaDivingKeeps: band(usaDivingKeeps) },
    perMeet,
    movementBand,
    scenarioId: 'seed-2026-official',
    scenarioName: 'Official 2026 Alignment (published map) -- rebuilt from real 2026 completed-meet entries',
    fieldAtFinal: perTier[perTier.length - 1].entries,
    grossEntryIncome, diveMeetsPassThrough, toHosts, usaDivingKeeps,
    perTier,
    notes: [
      'CORRECTED: previously used the saved scenario\'s own automatic calibration, which was found ' +
      '(by checking against real, already-completed 2026 meets) to zigzag over- and under-real across ' +
      'tiers -- not a simple stale rate. Every tier here now uses real, directly measured distinct-entry ' +
      'counts (diver+event, deduplicated across prelim/semi/final rounds) from core.event_results, the ' +
      'same standard already used for the 2025 Model.',
      'Entry fees only -- membership dues and senior circuit revenue are a separate model, not included here.',
      'Fee schedule: DEFAULT_FEES (same basis as CCE Submission). Host-cost settings match both live ' +
      'proposals exactly.',
    ],
  };
}
