/* Data-integrity checks for the Junior Circuit models and the report built on them.
 *
 * Every check here is one that would have caught a real error found in the
 * 9.11 Junior Circuit Comparison Report (2026-09-16):
 *   seed      platform seeded from a stage where it was optional (-290 event entries)
 *   fees      2025 priced at 2026 fees (+$24K); Regionals at one flat fee
 *   totals    stop table and season total disagreeing ($437K vs $404K)
 *   billing   income on 720 entries, DiveMeets/host on 757
 *   places    "6 zones x 18 x 24" when places 4-18 are 15 places
 *   backtest  model mechanics vs the real 2026 qualifier list
 *   validate  2025 model vs real 2025 totals
 *   labels    bare "Entries" / "Divers" column headings
 *
 * Read-only (SELECT only, enforced in _neon.js). Run: node api/check-invariants.mjs
 * Needs NEON_SQL_ENDPOINT and NEON_READONLY_URL. Exits 1 on any failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { neonQuery } from './_neon.js';
import { withFirstStopSeed, seedFromZones, computeBoundaryMoneyReport, buildWindow } from './_boundary-money.js';
import { compute2025Model } from './_2025-model.js';
import { compute2026BaselineWithNationals } from './_2026-model.js';
import { buildJuniorCircuitReport, JC_BUILTIN } from '../shared/jc/report.js';

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log('  PASS:', msg); } else { fail++; console.log('  FAIL:', msg); } };
const within = (a, b, pct) => b !== 0 && Math.abs(a - b) / Math.abs(b) <= pct / 100;
const MA = path.join(process.cwd(), 'membership-analytics');
const CELLS = ['AB1','AB3','ABP','AG1','AG3','AGP','BB1','BB3','BBP','BG1','BG3','BGP','CB1','CB3','CBP','CG1','CG3','CGP','DB1','DB3','DBP','DG1','DG3','DGP'];
const cellSql = `right(age_group,1)||left(gender,1)||(case discipline when '1M' then '1' when '3M' then '3' when 'Platform' then 'P' end)`;

async function realByCell(year, stage) {
  const rows = await neonQuery(`select ${cellSql} as cell, count(distinct diver_id_dm||'|'||event_key)::int as n
    from core.event_results where is_junior_circuit and year=$1 and stage=$2 and not coalesce(is_synchro,false)
      and diver_id_dm is not null and age_group is not null group by 1`, [year, stage]);
  return Object.fromEntries(rows.map((r) => [r.cell, r.n]));
}

console.log('=== seed: every first-stop cell comes from the stage where that event first qualified ===');
{
  const adv = JSON.parse(fs.readFileSync(path.join(MA, 'advance-data.json'), 'utf8'));
  const seed = withFirstStopSeed(adv).pools['2026|Regionals_CDfirst'];
  const combined = !!adv.pools['2026|FirstStop'];
  console.log(`  seed basis: ${combined ? 'combined Regionals + Zones pool' : 'split (Regionals A/B springboard, Zones platform and C/D)'}`);
  const either = {};
  for (const r of await neonQuery(`select ${cellSql} as cell, count(distinct coalesce(diver_id_dm::text, diver_first||diver_last)||'|'||age_group||gender||discipline)::int as n
      from core.event_results where is_junior_circuit and year=2026 and stage in ('Regionals','Zones') and not coalesce(is_synchro,false)
        and age_group is not null group by 1`)) either[r.cell] = r.n;
  const seeded = {}; for (const f in seed) for (const c in seed[f]) seeded[c] = (seeded[c] || 0) + seed[f][c];
  const reg = await realByCell(2026, 'Regionals'), zon = await realByCell(2026, 'Zones');
  // advance-data.json drops entries it can't place in a county (documented 1-9% gap), so allow 15% under.
  for (const grp of ['A', 'B', 'C', 'D']) for (const g of ['B', 'G']) for (const kind of ['springboard', 'platform']) {
    const cells = CELLS.filter((c) => c[0] === grp && c[1] === g && (kind === 'platform') === (c[2] === 'P'));
    const ref = cells.reduce((a, c) => a + ((combined ? either : seedFromZones(c) ? zon : reg)[c] || 0), 0);
    const got = cells.reduce((a, c) => a + (seeded[c] || 0), 0);
    ok(ref === 0 || (got >= ref * 0.85 && got <= ref * 1.05), `Group ${grp} ${g === 'B' ? 'boys' : 'girls'} ${kind}: seed ${got} event entries vs real ${ref} at ${combined ? 'Regionals or Zones' : seedFromZones(cells[0]) ? 'Zones' : 'Regionals'}`);
  }
}

console.log('=== fees: models charge what DiveMeets published for that season ===');
const m25 = await compute2025Model();
const m26 = await compute2026BaselineWithNationals();
{
  const pub = await neonQuery(`select er.year, er.stage, min(substring((m.info::jsonb)->>'Fee per Event' from '[0-9]+(?:\\.[0-9]+)?')::numeric) lo,
      max(substring((m.info::jsonb)->>'Fee per Event' from '[0-9]+(?:\\.[0-9]+)?')::numeric) hi
    from (select distinct meet_id_dm, year, stage from core.event_results where is_junior_circuit and year in (2025,2026)) er
    join divemeets.meets m on m.meet_id::text = er.meet_id_dm::text group by 1,2`);
  const P = {}; for (const r of pub) P[r.year + '|' + r.stage] = r;
  const tier25 = { Regions: 'Regionals', Zones: 'Zones', Nationals: 'Nationals' };
  for (const m of m25.perMeet) {
    const p = P['2025|' + tier25[m.tier]];
    ok(p && +p.lo === +p.hi && +m.feePerEvent === +p.lo, `2025 ${m.stop}: model $${m.feePerEvent} vs published $${p ? p.lo : '?'}`);
  }
  for (const m of m26.perMeet.filter((x) => x.tier !== 'Regions' && x.feeSource === 'published on DiveMeets')) {
    const stage = m.tier === 'E / W / C' ? 'EWC' : m.tier;
    const p = P['2026|' + stage];
    ok(p && +m.feePerEvent >= +p.lo && +m.feePerEvent <= +p.hi, `2026 ${m.stop}: model $${m.feePerEvent} within published $${p ? p.lo + '-' + p.hi : '?'}`);
  }
  const reg = m26.perMeet.filter((x) => x.tier === 'Regions');
  ok(reg.length === 12 && reg.every((m) => Math.abs(m.grossEntryIncome - (m.qualifyingEntries * 85 + m.nonQualifyingEntries * 45)) <= 1),
    '2026 Regionals: every stop = qualifying x $85 + non-qualifying x $45');
}

console.log('=== totals and billing: stops add to the season; income and costs on the same entries ===');
for (const [name, r] of [['2025 structure', m25], ['2026 structure', m26]]) {
  const s = (k) => r.perMeet.reduce((a, m) => a + m[k], 0);
  ok(Math.abs(s('grossEntryIncome') - r.grossEntryIncome) <= r.perMeet.length, `${name}: stop gross $${s('grossEntryIncome')} = season $${r.grossEntryIncome}`);
  ok(Math.abs(s('usaDivingKeeps') - r.usaDivingKeeps) <= 2 * r.perMeet.length, `${name}: stop keeps $${s('usaDivingKeeps')} = season $${r.usaDivingKeeps}`);
  ok(Math.abs(s('entries') - r.perTier.reduce((a, t) => a + t.entries, 0)) <= r.perMeet.length, `${name}: stop event entries = season event entries`);
}
{
  const nat = m26.perTier.find((t) => t.level === 'Nationals');
  ok(nat.grossEntryIncome === nat.entries * 125 && Math.abs(nat.diveMeetsPassThrough - nat.entries * 4.95) < 1 && nat.toHosts === nat.entries * 25,
    `2026 Junior Nationals: income, DiveMeets and host all on ${nat.entries} event entries`);
  ok(nat.individualEntries + nat.synchroEntries === nat.entries, `2026 Junior Nationals: ${nat.individualEntries} individual + ${nat.synchroEntries} synchro = ${nat.entries}`);
}

console.log('=== places: rule capacity = meets x band x events ===');
{
  const cce = await computeBoundaryMoneyReport('bs-msg2vatz-5q86m', {});
  const nos = await computeBoundaryMoneyReport('bs-msix7ibe-nij21', {});
  const spots = (r, lvl) => (r.perTier.find((t) => t.level === lvl) || {}).spots;
  // The championship is the last stop; its name is the submission's own (CCE calls it "The Finals").
  const lastSpots = (r) => r.perTier[r.perTier.length - 1].spots;
  ok(lastSpots(cce) === 3 * 9 * 24, `CCE Junior Nationals places ${lastSpots(cce)} = 3 x 9 x 24`);
  ok(spots(nos, 'National') === 3 * (8 + 4) * 24, `National Office Junior Nationals places ${spots(nos, 'National')} = 3 x (8 + 4) x 24`);
  ok(spots(nos, 'East, West, Central') === 9 * 16 * 24, `National Office E/W/C places ${spots(nos, 'East, West, Central')} = 9 x 16 x 24`);
  const nosLive = await computeBoundaryMoneyReport('bs-msix7ibe-nij21', { cdFirstStop: false });
  ok(nosLive.fieldAtFinal === nos.fieldAtFinal && nosLive.perTier[0].entries === nos.perTier[0].entries,
    `live Boundary Studio seed (${nosLive.perTier[0].entries} / ${nosLive.fieldAtFinal}) = report seed (${nos.perTier[0].entries} / ${nos.fieldAtFinal})`);
  for (const r of [cce, nos]) {
    const nat = r.perTier[r.perTier.length - 1];
    ok(nat.entries <= nat.spots, `${r.scenarioName.split(' —')[0]}: projected Junior Nationals event entries ${nat.entries} <= places ${nat.spots}`);
    ok(r.perTier[0].entries >= 0.9 * (m26.perTier[0].entries), `${r.scenarioName.split(' —')[0]}: first stop ${r.perTier[0].entries} event entries is not below the real 2026 first stop (${m26.perTier[0].entries})`);
  }
}

console.log('=== backtest: 2026 place mechanics vs the real qualifier list ===');
{
  const { w } = buildWindow(); const QR = w.QualRouting;
  const fields = async (stage, key) => {
    const rows = await neonQuery(`select coalesce(${key},'') k, ${cellSql} cell, count(distinct diver_id_dm)::int n from core.event_results
      where is_junior_circuit and year=2026 and stage=$1 and not coalesce(is_synchro,false) and diver_id_dm is not null and age_group is not null group by 1,2`, [stage]);
    const by = {}; for (const r of rows) (by[r.k] = by[r.k] || {})[r.cell] = r.n; return Object.values(by);
  };
  const places = (fs, hi) => fs.reduce((a, f) => a + CELLS.reduce((b, c) => b + QR.bandCount(f[c] || 0, 1, hi), 0), 0);
  const zone = places(await fields('Zones', 'zone'), 3), ewc = places(await fields('EWC', 'ewc_meet'), 3);
  const list = await neonQuery(`select qualification_path p, count(*)::int n from junior_results.projected_nationals_field where season=2026 group by 1`);
  const L = Object.fromEntries(list.map((r) => [r.p, r.n]));
  ok(within(zone, L['Zone Direct'], 5), `Zone top-3 places: model ${zone} vs qualifier list ${L['Zone Direct']} (within 5%)`);
  ok(within(zone + ewc, L['Zone Direct'] + L['E/W/C'], 5), `All ladder places: model ${zone + ewc} vs qualifier list ${L['Zone Direct'] + L['E/W/C']} (within 5%)`);
}

console.log('=== validate: 2025 model vs real 2025 ===');
{
  const z = (await realByCell(2025, 'Zones')), n = (await realByCell(2025, 'Nationals'));
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const pz = m25.perTier.find((t) => t.level === 'Zones').entries, pn = m25.perTier.find((t) => t.level === 'Nationals').entries;
  ok(within(pz, sum(z), 5), `2025 Zones: projected ${pz} vs actual ${sum(z)} event entries (within 5%)`);
  ok(within(pn, sum(n), 5), `2025 Junior Nationals: projected ${pn} vs actual ${sum(n)} individual event entries (within 5%)`);
}

console.log('=== labels: counts say event entries or unique athletes ===');
for (const f of ['boundary.js', 'pricing.js']) {
  const src = fs.readFileSync(path.join(process.cwd(), 'boundary-studio', f), 'utf8');
  const bare = (src.match(/>(Entries|Divers|Competitors)</g) || []);
  ok(bare.length === 0, `${f}: no bare "Entries"/"Divers"/"Competitors" headings (${bare.length} found)`);
}

console.log('=== report: the in-app Junior Circuit Comparison Report matches the models ===');
{
  const rep = await buildJuniorCircuitReport(JC_BUILTIN);
  ok(rep.columns.every((c) => !c.error), `report: all ${rep.columns.length} columns built`);
  ok(rep.checks.every((c) => c.pass), `report: its own ${rep.checks.length} checks pass`);
  const [cce, nos, s25, s26] = rep.columns;
  const cceM = await computeBoundaryMoneyReport('bs-msg2vatz-5q86m', {});
  ok(cce.money.keeps === cceM.usaDivingKeeps && cce.nationals.eventEntries === cceM.fieldAtFinal, `report CCE keeps $${cce.money.keeps} / Junior Nationals ${cce.nationals.eventEntries} = model`);
  ok(s25.money.keeps === m25.usaDivingKeeps && s26.money.keeps === m26.usaDivingKeeps, `report 2025 / 2026 keeps = models ($${s25.money.keeps} / $${s26.money.keeps})`);
  ok(s26.nationals.eventEntries + s26.nationals.synchroEntries === m26.perTier.find((t) => t.level === 'Nationals').entries, `report 2026 Junior Nationals ${s26.nationals.eventEntries} individual + ${s26.nationals.synchroEntries} synchro = model`);
  ok(nos.nationals.eventEntriesLow < nos.nationals.eventEntries && nos.nationals.rangeReason, 'report: projected Junior Nationals range has a low end and a stated reason');
  const b = rep.accuracy.nationals2026;
  const parts = ['zoneTop3', 'ewcTop3', 'ewcAverage', 'ewcBelowBar', 'hps', 'otherCompeted', 'otherNoResult'].reduce((a, k) => a + b[k].entries, 0);
  ok(parts === b.total.entries && b.total.entries === s26.nationals.eventEntries, `report: 2026 Junior Nationals routes add to ${parts} = ${s26.nationals.eventEntries} individual event entries`);
  ok(b.ladder.entries + b.other.entries === b.total.entries, `report: ladder ${b.ladder.entries} + other ${b.other.entries} = ${b.total.entries}`);
  ok(s26.money.individualOnly.eventEntries === s26.tiers.reduce((a, t) => a + t.individualAged, 0), `report: 2026 individual-only basis = ${s26.money.individualOnly.eventEntries} event entries`);
  // A scenario that ends at E/W/C must not report its E/W/C field as Junior Nationals.
  const seedRep = await buildJuniorCircuitReport({ config: { columns: [{ type: 'scenario', scenarioId: 'seed-2026-official', label: 'Official 2026 map' }], sections: ['summary'] } });
  ok(!seedRep.columns[0].error && seedRep.columns[0].nationals === null, 'report: a scenario that stops at E/W/C shows no Junior Nationals figures');
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
