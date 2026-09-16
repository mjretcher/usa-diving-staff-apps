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

import { q as neonQuery, engine, json } from './runtime.js';
import { cohortLoad, movementRates } from './eligibility.js';

/* Real 2026 per-cell entries for a stage, optionally one meet (diver+event,
   deduplicated across rounds). Synchro entries are one cell, 'SYN', so the
   per-cell list always covers every entry that DiveMeets bills and the host is
   paid on -- income, DiveMeets and host are computed on the same entries.
   (Before 2026-09-16 synchro was left out of the list while still counted in
   the entry total: Nationals income was priced on 720 entries and costs on 757.) */
async function realPerCell2026(stage, meetId = null) {
  const rows = await neonQuery(
    `select case when coalesce(is_synchro,false) then 'SYN'
                 else right(age_group,1)||left(gender,1)||(case discipline when '1M' then '1' when '3M' then '3' when 'Platform' then 'P' end) end as cell,
            count(distinct diver_id_dm||'|'||event_key)::int as entries
     from core.event_results
     where is_junior_circuit and year = 2026 and stage = $1 and diver_id_dm is not null
       and ($2::text is null or meet_id_dm::text = $2::text)
     group by 1`, [stage, meetId == null ? null : String(meetId)]);
  const m = {};
  for (const r of rows) {
    if (!r.cell || /null/.test(r.cell)) {
      // Regionals also run non-circuit events (the "FC Level" developmental
      // events): no Junior age group, never qualifying. They are billed entries,
      // so they stay in, priced as non-qualifying ('NQ' = $45).
      if (stage === 'Regionals') { m.NQ = (m.NQ || 0) + r.entries; continue; }
      throw new Error(`2026 ${stage}: ${r.entries} entries have no age group / gender / board -- refusing to price them as something else`);
    }
    m[r.cell] = r.entries;
  }
  return m;
}
const sumCells = (m) => Object.values(m).reduce((a, n) => a + n, 0);

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

async function computeTierFromRealEntries(level, entries, hostSettings, perCell, w) {
  const I = w.__boundaryInternal;
  const S = I.S;
  S.levels = [{ name: 'Regions' }, { name: 'Zones' }, { name: 'E / W / C' }, { name: 'Nationals' }];
  S.fees = null; // DEFAULT_FEES -- same basis as CCE Submission and the rest of this report
  S.year = 'y26';
  Object.assign(S, hostSettings);
  // Carry the per-cell event list so Regionals price each entry by event type:
  // qualifying (Group A/B 1-meter, 3-meter) $85, non-qualifying (platform,
  // Groups C/D, synchro) $45 -- 2026 Athlete Progression Guide.
  const events = perCell ? Object.entries(perCell).map(([cell, n]) => ({ cell, n })) : null;
  const money = I.meetMoney({ level, entries, events });
  return {
    level: S.levels[level].name, meets: null, entries,
    spots: null, fillRate: null,
    grossEntryIncome: Math.round(money.gross), diveMeetsPassThrough: Math.round(money.levy),
    toHosts: Math.round(money.host), usaDivingKeeps: Math.round(money.usad),
    measuredTakeUp: true, biggestToSmallestRatio: null,
  };
}

export async function compute2026BaselineWithNationals() {
  // One engine for every tier and stop: each call sets the fields it prices with.
  const { w } = await engine();
  const hostSettings = { hostMode: 'per_entry', hostShare: 0.25, hostFlat: 3000, hostPer: 25, hostMin: 0 };
  const levelIndex = { Regions: 0, Zones: 1, 'E / W / C': 2, Nationals: 3 };

  const stageOf = { Regions: 'Regionals', Zones: 'Zones', 'E / W / C': 'EWC', Nationals: 'Nationals' };
  const perTier = [];
  for (const name of Object.keys(stageOf)) {
    const perCell = await realPerCell2026(stageOf[name]);
    const entries = sumCells(perCell);
    const t = await computeTierFromRealEntries(levelIndex[name], entries, hostSettings, perCell, w);
    t.synchroEntries = perCell.SYN || 0;
    t.otherNonCircuitEntries = perCell.NQ || 0;
    t.individualEntries = entries - t.synchroEntries - t.otherNonCircuitEntries;
    const indiv = Object.assign({}, perCell); delete indiv.SYN; delete indiv.NQ;
    t.cohortLoad = await cohortLoad(indiv, 2026, name);
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
    const I = w.__boundaryInternal; const S = I.S; S.recapRates = null; S.hostPer_stop = null;
    S.levels = [{ name: 'Regions' }, { name: 'Zones' }, { name: 'E / W / C' }, { name: 'Nationals' }];
    S.year = 'y26';
    // Regionals: always the Guide's two-rate schedule, whatever DiveMeets shows
    // (it lists "varies at checkout"). Other stops: the published flat fee, or the
    // stage default where the host sets pricing.
    const isRegional = rm.stage === 'Regionals';
    S.fees = (!isRegional && rm.publishedFeePerEvent != null) ? { [stageLevel[rm.stage]]: rm.publishedFeePerEvent } : null;
    Object.assign(S, hostSettings);
    const cells = await realPerCell2026(rm.stage, rm.meetId);
    const entries = sumCells(cells);
    const events = isRegional ? Object.entries(cells).map(([cell, n]) => ({ cell, n })) : null;
    const money = I.meetMoney({ level: stageLevel[rm.stage], entries, events });
    const qualifying = isRegional ? Object.entries(cells).filter(([c]) => /^[AB][BG][13]$/.test(c)).reduce((a, [, n]) => a + n, 0) : null;
    perMeet.push({ tier: rm.stage === 'EWC' ? 'E / W / C' : rm.stage === 'Regionals' ? 'Regions' : rm.stage, stop: rm.name, entries,
      individualEntries: rm.individualEntries, synchroEntries: rm.synchroEntries,
      qualifyingEntries: qualifying, nonQualifyingEntries: isRegional ? entries - qualifying : null,
      feePerEvent: isRegional ? '$85 qualifying / $45 non-qualifying' : money.fee,
      feeSource: isRegional ? '2026 Athlete Progression Guide' : rm.hostSetFee ? 'host-set at checkout (stage default used)' : 'published on DiveMeets',
      lateFeePublished: rm.lateFeePublished,
      grossEntryIncome: Math.round(money.gross), diveMeetsPassThrough: Math.round(money.levy), toHosts: Math.round(money.host), usaDivingKeeps: Math.round(money.usad) });
  }
  // Reconciled actuals from the 2026 DiveMeets recaps (membership-analytics/recaps-2026.json):
  // paid entries, gross, DiveMeets cut, net to USA Diving, and the calculated host split per meet.
  let recaps = null;
  try { recaps = await json('recaps-2026.json'); } catch (e) { recaps = null; }
  const keyOf = (n) => { const m = /Region (\d+)|Zone ([A-F])|(East|Central|West)|(Junior Nationals)/.exec(n || ''); return m ? m[0] : n; };
  const recByKey = {}; if (recaps) for (const r of recaps.perMeet) recByKey[keyOf(r.name)] = r;
  for (const m of perMeet) {
    const r = recByKey[keyOf(m.stop)];
    if (r) m.recap = { paidEntries: r.paid, competedEntries: r.competed, paidNotCompetedPct: r.no_show_pct, lateFeeCount: r.late_count, lateFeeTotal: r.late_total,
      sheetChanges: r.sheet_changes, gross: r.gross, diveMeetsFees: r.divemeets, netToUsaDiving: r.net, hostSplit: r.host, hostConfirmedInBooks: false, settlementDate: r.settlement };
  }
  const reconciled = recaps ? (() => {
    const rows = recaps.perMeet; const sum = (k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
    return { source: recaps.source, paidEntries: sum('paid'), competedEntries: sum('competed'), gross: +sum('gross').toFixed(2), diveMeetsFees: +sum('divemeets').toFixed(2),
      netToUsaDiving: +sum('net').toFixed(2), hostSplitBooked: +sum('host').toFixed(2), hostUnreconciled: ['Junior Nationals'],
      usaDivingKeepsBeforeNationalsHost: +(sum('net') - sum('host')).toFixed(2), byStage: recaps.byStage,
      note: 'Host figures are the calculated split, not confirmed QuickBooks postings; E/W/C host bills also net merch and ticket sales (East $10,851.24, Central $8,030.38, West $9,214.17 actual bills). Zone C/D host share ($60/$40 question) open with finance as of 2026-06-11.' };
  })() : null;
  // Stop totals must equal the season totals -- they are the same entries at the
  // same fees. A mismatch here is what put $404K and $437K in the same report.
  const stopKeeps = perMeet.reduce((a, m) => a + m.usaDivingKeeps, 0);
  const stopGross = perMeet.reduce((a, m) => a + m.grossEntryIncome, 0);
  if (Math.abs(stopGross - grossEntryIncome) > perMeet.length || Math.abs(stopKeeps - usaDivingKeeps) > perMeet.length * 2) {
    throw new Error(`2026 model: stops sum to gross $${stopGross} / keeps $${stopKeeps} but season is $${grossEntryIncome} / $${usaDivingKeeps}`);
  }
  return {
    assumptions: { basis: 'model: real 2026 competed entries at every tier with the scenario host terms. reconciled: the DiveMeets recaps (paid entries, late fees, actual host split).', ceilingYear: 2026 },
    reconciled,
    perMeet,
    movementBand,
    scenarioId: 'seed-2026-official',
    structure: {
      levels: [{ name: 'Regionals', meets: 12 }, { name: 'Zones', meets: 6 }, { name: 'E/W/C', meets: 3 }, { name: 'Junior Nationals', meets: 1 }],
      rules: [
        { from: 'Regionals', text: 'Group A/B: top 15 in each 1-meter and 3-meter event, plus anyone meeting the 15th-place average, advance to Zones. Platform and Groups C/D are non-qualifying at Regionals.', places: 12 * 15 * 8, placesText: '12 meets × 15 × 8 Group A/B springboard events' },
        { from: 'Zones', text: 'Places 1–3 advance to Junior Nationals preliminaries.', places: 6 * 3 * 24, placesText: '6 meets × 3 × 24 events' },
        { from: 'Zones', text: 'Places 4–18, plus anyone meeting the 18th-place average, advance to E/W/C preliminaries.', places: 6 * 15 * 24, placesText: '6 meets × 15 × 24 events' },
        { from: 'E/W/C', text: 'Places 1–3 advance to Junior Nationals; places 4–6 also advance if they meet the average 3rd-place score.', places: 3 * 3 * 24, placesText: '3 meets × 3 × 24 events (plus up to 216 more for 4th–6th)' },
      ],
    },
    scenarioName: 'Official 2026 Alignment (published map) -- rebuilt from real 2026 completed-meet entries',
    fieldAtFinal: perTier[perTier.length - 1].entries,
    fieldAtFinalIndividual: perTier[perTier.length - 1].individualEntries,
    fieldAtFinalSynchro: perTier[perTier.length - 1].synchroEntries,
    grossEntryIncome, diveMeetsPassThrough, toHosts, usaDivingKeeps,
    perTier,
    notes: [
      'CORRECTED: previously used the saved scenario\'s own automatic calibration, which was found ' +
      '(by checking against real, already-completed 2026 meets) to zigzag over- and under-real across ' +
      'tiers -- not a simple stale rate. Every tier here now uses real, directly measured distinct-entry ' +
      'counts (diver+event, deduplicated across prelim/semi/final rounds) from core.event_results, the ' +
      'same standard already used for the 2025 Model.',
      'Entry fees only -- membership dues and senior circuit revenue are a separate model, not included here.',
      'Fees (2026 Athlete Progression Guide): Regionals $85 qualifying event (Group A/B 1-meter, 3-meter), ' +
      '$45 non-qualifying (platform, Groups C/D, synchro, and the non-circuit FC Level events); Zones $90; E/W/C $115; Junior Nationals $125. ' +
      'Host-cost settings match both live proposals exactly ($25 per entry).',
      'Junior Nationals entries include synchro (fieldAtFinalSynchro). Compare with the proposals, which project ' +
      'individual events only, using fieldAtFinalIndividual.',
      'Region-choice movement (movementBand) is reported as a measured rate only. It is not applied to entry ' +
      'or revenue totals: an athlete who competes outside their home region still enters a meet.',
    ],
  };
}
