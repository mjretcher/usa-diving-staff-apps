/* Junior Circuit Comparison Report -- data assembly.
 *
 * A report definition names the columns to compare (saved Boundary Studio
 * scenarios and/or the 2025 and 2026 structures) and the sections to show.
 * buildJuniorCircuitReport(definition) runs every column through the same code
 * the server tools and api/check-invariants.mjs use and returns plain data;
 * the renderer only formats it. No number in the report is typed by hand.
 *
 * Every count carries a unit ('eventEntries' | 'uniqueAthletes') and a status
 * ('projected' | 'actual' | 'modeled'); every range carries its reason.
 */
import { q, disposeEngines } from './runtime.js';
import { computeBoundaryMoneyReport } from './scenario.js';
import { compute2025Model } from './model-2025.js';
import { compute2026BaselineWithNationals } from './model-2026.js';
import { eligibleByCohort } from './eligibility.js';

export const JC_REPORT_KIND = 'junior_circuit_comparison';

export const JC_SECTIONS = [
  { id: 'summary',     label: 'Summary',                         desc: 'Side-by-side headline figures for every column.' },
  { id: 'pathways',    label: 'How each structure works',        desc: 'Stops, advancement rules and the places each rule creates, read from the structure itself.' },
  { id: 'tiers',       label: 'Event entries and athletes by stop type', desc: 'Every stage of every column: event entries, unique athletes, places.' },
  { id: 'nationals',   label: 'Junior Nationals field',           desc: 'Projected range, what drives it, and the 2026 actual field broken down.' },
  { id: 'money',       label: 'Entry income',                     desc: 'Gross, DiveMeets, host and USA Diving keeps; standard-fee and reconciled figures where they exist.' },
  { id: 'stops',       label: 'Entry income by stop',             desc: 'Every meet in every column, with its fee.' },
  { id: 'capacity',    label: 'Capacity against membership',      desc: 'Projected unique athletes as a share of eligible Competition Athlete members, by cohort.' },
  { id: 'membership',  label: 'Eligible membership, 2024–2026',    desc: 'Competition Athlete members, AQUA age 18 and under, by age group and gender.' },
  { id: 'accuracy',    label: 'How accurate the model is',        desc: '2025 validation and the 2026 place-mechanics back-test.' },
  { id: 'checks',      label: 'Data checks',                      desc: 'The checks run for this report, pass or fail.' },
  { id: 'definitions', label: 'Definitions',                      desc: 'What every unit and status label means.' },
];

export const JC_BUILTIN = {
  id: 'builtin-junior-circuit-comparison',
  name: 'Junior Circuit Comparison',
  builtin: true,
  config: {
    title: 'Junior Circuit Qualification Structure',
    subtitle: 'Two proposals against the 2025 and 2026 structures',
    membershipYear: 2026,
    columns: [
      { type: 'scenario', scenarioId: 'bs-msg2vatz-5q86m', label: 'CCE Proposal' },
      { type: 'scenario', scenarioId: 'bs-msix7ibe-nij21', label: 'National Office Proposal' },
      { type: 'structure', year: 2025, label: '2025 Structure' },
      { type: 'structure', year: 2026, label: '2026 Structure' },
    ],
    sections: JC_SECTIONS.map((s) => s.id),
  },
};

const CELLS = ['AB1','AB3','ABP','AG1','AG3','AGP','BB1','BB3','BBP','BG1','BG3','BGP','CB1','CB3','CBP','CG1','CG3','CGP','DB1','DB3','DBP','DG1','DG3','DGP'];
const n0 = (v) => (v == null ? '?' : Math.round(v).toLocaleString('en-US'));
const round = (v) => (v == null ? null : Math.round(v));
const sumUnique = (cl) => (cl && cl.rows ? cl.rows.reduce((a, r) => a + (r.uniqueAthletes || 0), 0) : null);

/* Actual counts from DiveMeets results for a season, by stage. */
async function actualBySeason(year) {
  const rows = await q(`select stage,
      count(distinct diver_id_dm||'|'||event_key) filter (where not coalesce(is_synchro,false))::int as individual,
      count(distinct diver_id_dm||'|'||event_key) filter (where not coalesce(is_synchro,false) and age_group is not null)::int as individual_aged,
      count(distinct diver_id_dm||'|'||event_key) filter (where coalesce(is_synchro,false))::int as synchro,
      count(distinct diver_id_dm) filter (where not coalesce(is_synchro,false))::int as athletes
    from core.event_results where is_junior_circuit and year=$1 and diver_id_dm is not null group by 1`, [year]);
  const out = {}; for (const r of rows) out[r.stage] = r; return out;
}

/* Actual unique athletes per age group x gender, individual events, by stage. */
async function actualCohorts(year) {
  const rows = await q(`select stage, right(age_group,1)||left(gender,1) as k, count(distinct diver_id_dm)::int as n
    from core.event_results where is_junior_circuit and year=$1 and not coalesce(is_synchro,false)
      and diver_id_dm is not null and age_group is not null group by 1,2`, [year]);
  const out = {}; for (const r of rows) (out[r.stage] = out[r.stage] || {})[r.k] = r.n; return out;
}

/* 2026 Junior Nationals: who actually competed, by how they earned the place,
   read from results by DiveMeets id (no name matching for the ladder).
   Order of precedence per individual event entry:
     Zones top 3 -> E/W/C top 3 -> E/W/C 4th-6th (average-score rule)
     -> High Performance Squad (published list) -> competed at Zones/E/W/C in
     that event without a qualifying finish (backfilled places and other
     approvals) -> no Zones/E/W/C result in that event. */
async function nationals2026Breakdown() {
  const base = `with jn as (select distinct diver_id_dm::text did, discipline disc,
        lower(regexp_replace(diver_first||' '||diver_last,'\\s+',' ','g')) nm
      from core.event_results where year=2026 and is_junior_circuit and stage='Nationals' and not coalesce(is_synchro,false) and diver_id_dm is not null),
    fin as (select distinct diver_id_dm::text did, discipline disc, stage, place from core.event_results
      where year=2026 and is_junior_circuit and not coalesce(is_synchro,false) and diver_id_dm is not null
        and stage in ('Zones','EWC') and round='Final'),
    top3 as (select distinct did, disc, stage from fin where place between 1 and 3),
    hps as (select distinct diver_key k, lower(regexp_replace(athlete_name,'\\s+',' ','g')) nm
      from junior_results.projected_nationals_field where season=2026 and qualification_path like 'HPS%'),
    anyres as (select distinct diver_id_dm::text did, discipline disc from core.event_results
      where year=2026 and is_junior_circuit and not coalesce(is_synchro,false) and stage in ('Zones','EWC')),
    c as (select jn.did, jn.disc, case
      when exists (select 1 from top3 t where t.did=jn.did and t.disc=jn.disc and t.stage='Zones') then 'zoneTop3'
      when exists (select 1 from top3 t where t.did=jn.did and t.disc=jn.disc and t.stage='EWC') then 'ewcTop3'
      when exists (select 1 from fin f where f.did=jn.did and f.disc=jn.disc and f.stage='EWC' and f.place between 4 and 6) then 'ewcAverage'
      when exists (select 1 from hps h where h.k='dm:'||jn.did or h.nm=jn.nm) then 'hps'
      when exists (select 1 from anyres a where a.did=jn.did and a.disc=jn.disc) then 'otherCompeted'
      else 'otherNoResult' end cat from jn)`;
  const byCat = await q(base + ` select cat, count(*)::int entries, count(distinct did)::int athletes from c group by 1`);
  const groups = await q(base + ` select
      count(*) filter (where cat in ('zoneTop3','ewcTop3'))::int place_e,
      count(distinct did) filter (where cat in ('zoneTop3','ewcTop3'))::int place_a,
      count(*) filter (where cat in ('zoneTop3','ewcTop3','ewcAverage'))::int ladder_e,
      count(distinct did) filter (where cat in ('zoneTop3','ewcTop3','ewcAverage'))::int ladder_a,
      count(*) filter (where cat not in ('zoneTop3','ewcTop3','ewcAverage'))::int other_e,
      count(distinct did) filter (where cat not in ('zoneTop3','ewcTop3','ewcAverage'))::int other_a,
      count(*)::int total_e, count(distinct did)::int total_a from c`);
  // Everyone who earned a place by finishing top 3 (Zones, then E/W/C), and how many of them competed in that event.
  const earned = await q(`with t as (select distinct diver_id_dm::text did, discipline disc from core.event_results
        where year=2026 and is_junior_circuit and not coalesce(is_synchro,false) and diver_id_dm is not null
          and stage in ('Zones','EWC') and round='Final' and place between 1 and 3),
      jn as (select distinct diver_id_dm::text did, discipline disc from core.event_results
        where year=2026 and is_junior_circuit and stage='Nationals' and not coalesce(is_synchro,false) and diver_id_dm is not null)
    select count(*)::int earned_e, count(distinct t.did)::int earned_a, count(jn.did)::int competed_e, count(distinct jn.did)::int competed_a
    from t left join jn on jn.did=t.did and jn.disc=t.disc`);
  const listed = await q(`select count(*)::int entries, count(distinct diver_key)::int athletes from junior_results.projected_nationals_field
      where season=2026 and qualification_path in ('Zone Direct','E/W/C')`);
  const get = (k) => { const r = byCat.find((x) => x.cat === k); return r ? { entries: r.entries, athletes: r.athletes } : { entries: 0, athletes: 0 }; };
  const g = groups[0], e = earned[0];
  return {
    zoneTop3: get('zoneTop3'), ewcTop3: get('ewcTop3'), ewcAverage: get('ewcAverage'), hps: get('hps'),
    otherCompeted: get('otherCompeted'), otherNoResult: get('otherNoResult'),
    byPlace: { entries: g.place_e, athletes: g.place_a },
    ladder: { entries: g.ladder_e, athletes: g.ladder_a },
    other: { entries: g.other_e, athletes: g.other_a },
    total: { entries: g.total_e, athletes: g.total_a },
    earnedTop3: { entries: e.earned_e, athletes: e.earned_a },
    competedTop3: { entries: e.competed_e, athletes: e.competed_a },
    publishedList: listed[0],
    attendance: e.earned_e ? e.competed_e / e.earned_e : null,
  };
}

/* 2026 athletes who competed at Regionals, at Zones, or at either -- the
   comparison for a proposal whose single first stop replaces both. */
async function firstStops2026() {
  const r = await q(`with u as (select distinct diver_id_dm, stage, discipline, age_group from core.event_results
      where is_junior_circuit and year=2026 and stage in ('Regionals','Zones') and not coalesce(is_synchro,false)
        and diver_id_dm is not null and age_group is not null)
    select count(distinct diver_id_dm||'|'||discipline||'|'||age_group)::int either_e, count(distinct diver_id_dm)::int either_a from u`);
  return { eventEntries: r[0].either_e, uniqueAthletes: r[0].either_a };
}

async function membershipAsOf() {
  const r = await q(`select max(loaded_at)::date::text d from membership.members where membership_year = 2026`);
  return r[0] && r[0].d;
}

/* Places a structure's rules create, read from a saved routing. */
function describeRouting(structure) {
  const levels = structure.levels || [];
  const name = (L) => (L != null && levels[L] ? levels[L].name : (L === levels.length ? structure.finalName : 'next stop'));
  const roundName = { prelim: 'preliminaries', semi: 'semifinal', quarter: 'quarterfinal', final: 'final' };
  const rules = [];
  (structure.routing || []).forEach((lvl, L) => {
    const offered = CELLS.filter((c) => !(lvl.notOffered || []).includes(c));
    const meets = (levels[L] && levels[L].meets) || 1;
    (lvl.routes || []).forEach((rt) => {
      if (!rt.to) return;
      let places = 0;
      for (const c of offered) {
        const ov = rt.byCell && rt.byCell[c];
        const lo = ov ? ov.lo : rt.lo, hi = ov ? ov.hi : rt.hi;
        if (hi != null) places += Math.max(0, hi - (lo || 1) + 1);
      }
      places *= meets;
      const band = rt.hi == null ? `places ${rt.lo || 1} and below` : (rt.lo || 1) === 1 ? `top ${rt.hi}` : `places ${rt.lo}–${rt.hi}`;
      const same = rt.to.level === L;
      rules.push({
        from: name(L),
        text: `${name(L)} ${roundName[rt.from] || rt.from}: ${band} per event → ${same ? name(L) : name(rt.to.level)} ${roundName[rt.to.round] || rt.to.round}.`,
        places, placesText: `${meets} meet${meets === 1 ? '' : 's'} × ${rt.hi == null ? '?' : (rt.hi - (rt.lo || 1) + 1)} × ${offered.length} events`,
        internal: same,
      });
    });
  });
  return rules;
}

function tierRows(perTier, status) {
  return perTier.map((t) => ({
    name: t.level, meets: t.meets, places: t.spots != null ? round(t.spots) : null,
    eventEntries: round(t.entries), uniqueAthletes: round(sumUnique(t.cohortLoad)), status,
    individualEntries: t.individualEntries, synchroEntries: t.synchroEntries,
    gross: t.grossEntryIncome, diveMeets: t.diveMeetsPassThrough, hosts: t.toHosts, keeps: t.usaDivingKeeps,
    cohorts: t.cohortLoad ? t.cohortLoad.rows.map((r) => ({ cohort: r.cohort, ageGroup: r.ageGroup, gender: r.gender,
      eventEntries: round(r.entries), uniqueAthletes: round(r.uniqueAthletes), eligible: r.eligibleMembers, pct: r.pctOfEligible })) : [],
  }));
}

async function buildColumn(col, ctx) {
  if (col.type === 'scenario') {
    const r = await computeBoundaryMoneyReport(col.scenarioId, { ceilingYear: ctx.membershipYear });
    if (!r) throw new Error(`Saved proposal ${col.scenarioId} was not found.`);
    const tiers = tierRows(r.perTier, 'projected');
    if (!tiers.length || !(tiers[0].eventEntries > 0)) {
      throw new Error(`Saved proposal “${r.scenarioName}” projects no event entries — its map has no counties assigned (a new proposal starts blank). Open it in Boundary Studio, draw or choose a map, save, then generate again.`);
    }
    // Junior Nationals is only in the report when the scenario models it as a stop.
    const nat = tiers.find((t) => /national/i.test(t.name)) || null;
    const att = ctx.jn26 ? ctx.jn26.attendance : null;
    return {
      label: col.label || r.scenarioName, kind: 'scenario', source: `Saved proposal “${r.scenarioName}” (${col.scenarioId})`,
      assumption: [r.assumptions && r.assumptions.note,
        r.assumptions && r.assumptions.firstStopPlatform === 'skip' ? `Platform is not held at ${r.structure.levels[0].name}; platform divers enter ${(r.structure.levels[1] || {}).name || 'the next stop'} directly.` : null].filter(Boolean).join(' '),
      seedBasis: r.assumptions && r.assumptions.seedBasis,
      endsAt: tiers[tiers.length - 1].name,
      status: 'projected', tiers,
      nationals: !nat ? null : {
        eventEntries: nat.eventEntries, uniqueAthletes: nat.uniqueAthletes, places: nat.places, status: 'projected',
        eventEntriesLow: att != null ? round(nat.eventEntries * att) : null,
        uniqueAthletesLow: att != null ? round(nat.uniqueAthletes * att) : null,
        rangeReason: att != null ? `High end: every earned place is taken (declined places backfilled). Low end: ${(100 * att).toFixed(1)}% taken — the share of 2026 top-3 place winners (Zones and E/W/C) who competed in that event at Junior Nationals.` : null,
        excludes: 'Qualifying-ladder places only. High Performance Squad, backfilled places and other approved entries are not included (2026 had ' + (ctx.jn26 ? ctx.jn26.other.entries : '?') + ' such event entries).',
      },
      money: {
        gross: r.grossEntryIncome, diveMeets: r.diveMeetsPassThrough, hosts: r.toHosts, keeps: r.usaDivingKeeps,
        basis: `Projected event entries at the fees shown; DiveMeets $${r.diveMeetsPerEntry} per event entry; host ${hostText(r.hostTerms)}; no late fees.`,
        diveMeetsPerEntry: r.diveMeetsPerEntry, hostPerEntry: r.hostTerms && r.hostTerms.mode === 'per_entry' ? +r.hostTerms.perEntry : null,
        fees: r.scenarioFees, atStandardFees: r.atStandardFees,
      },
      stops: r.perMeet.map((m) => ({ tier: m.tier, stop: m.stop, eventEntries: m.entries, fee: m.feePerEvent, feeSplit: m.feeSplit, gross: m.grossEntryIncome,
        diveMeets: m.diveMeetsPassThrough, hosts: m.toHosts, keeps: m.usaDivingKeeps })),
      rules: describeRouting(r.structure),
      structure: r.structure,
      warnings: r.dataLoadWarnings || [],
    };
  }
  if (col.type === 'structure' && +col.year === 2025) {
    const [m, act] = await Promise.all([compute2025Model(), actualBySeason(2025)]);
    const tiers = tierRows(m.perTier, 'modeled');
    const actualFor = { Regions: act.Regionals, Zones: act.Zones, Nationals: act.Nationals };
    tiers.forEach((t) => { const a = actualFor[t.name]; if (a) { t.actualEventEntries = a.individual; t.actualUniqueAthletes = a.athletes; t.actualSynchro = a.synchro; } });
    const nat = tiers[tiers.length - 1];
    return {
      label: col.label || '2025 Structure', kind: 'structure2025', source: 'Modeled on actual 2025 Regional event entries under the 2021–2025 rules',
      assumption: `The model starts from 2025 Regionals event entries that could be matched to a county (${n0(m.perTier[0].entries)} of ${n0(act.Regionals && act.Regionals.individual_aged)}).`,
      status: 'modeled', tiers,
      nationals: { eventEntries: nat.eventEntries, uniqueAthletes: nat.uniqueAthletes, status: 'modeled', places: 1296, placesNote: 'plus anyone meeting the average bar',
        actualEventEntries: act.Nationals && act.Nationals.individual, actualUniqueAthletes: act.Nationals && act.Nationals.athletes,
        actualSynchro: act.Nationals && act.Nationals.synchro },
      money: { gross: m.grossEntryIncome, diveMeets: m.diveMeetsPassThrough, hosts: m.toHosts, keeps: m.usaDivingKeeps,
        basis: 'Modeled event entries at 2025 published fees ($85 Regionals, $85 Zones, $115 Junior Nationals); DiveMeets $3.80; host $25 per event entry.',
        feesUsed: '2025 published fees',
        reconciledKeeps: m.reconciled ? m.reconciled.usadShare : null,
        reconciledNote: 'Actual 2025 USA Diving share per the general ledger, after all host payments.' },
      stops: m.perMeet.map((x) => ({ tier: x.tier, stop: x.stop, eventEntries: x.entries, fee: x.feePerEvent, gross: x.grossEntryIncome,
        diveMeets: x.diveMeetsPassThrough, hosts: x.toHosts, keeps: x.usaDivingKeeps })),
      rules: m.structure.rules, structure: m.structure, validation: m.validation, warnings: [],
    };
  }
  if (col.type === 'structure' && +col.year === 2026) {
    const [m, act, coh] = await Promise.all([compute2026BaselineWithNationals(), actualBySeason(2026), actualCohorts(2026)]);
    const tiers = tierRows(m.perTier, 'actual');
    const STAGE_OF = { Regions: 'Regionals', Zones: 'Zones', 'E / W / C': 'EWC', Nationals: 'Nationals' };
    tiers.forEach((t) => {
      const a = act[STAGE_OF[t.name]];
      if (a) { t.uniqueAthletes = a.athletes; t.individualAged = a.individual_aged; } // actual, individual events
      t.meets = new Set(m.perMeet.filter((x) => x.tier === t.name).map((x) => x.stop)).size || t.meets;
      // Cohort rows: counted from results, not derived from entries.
      const c = coh[STAGE_OF[t.name]] || {};
      t.cohorts.forEach((r) => {
        r.uniqueAthletes = c[r.cohort] || 0;
        r.pct = r.eligible ? Math.round(1000 * r.uniqueAthletes / r.eligible) / 10 : null;
      });
    });
    const nat = tiers[tiers.length - 1];
    return {
      label: col.label || '2026 Structure', kind: 'structure2026', source: 'Actual 2026 event entries from DiveMeets results',
      status: 'actual', tiers,
      nationals: { eventEntries: nat.individualEntries, uniqueAthletes: nat.uniqueAthletes, synchroEntries: nat.synchroEntries,
        status: 'actual', breakdown: ctx.jn26, places: 432 + 216, placesNote: 'plus up to 216 by average score',
        ladderEntries: ctx.jn26.ladder.entries, ladderAthletes: ctx.jn26.ladder.athletes,
        otherEntries: ctx.jn26.other.entries, otherAthletes: ctx.jn26.other.athletes },
      firstStops: ctx.firstStops26,
      money: { gross: m.grossEntryIncome, diveMeets: m.diveMeetsPassThrough, hosts: m.toHosts, keeps: m.usaDivingKeeps,
        basis: 'Actual competed event entries (including synchro and non-circuit events billed) at the 2026 Guide fees: Regionals $85 qualifying / $45 non-qualifying, Zones $90, E/W/C $115, Junior Nationals $125; DiveMeets $4.95; host $25 per event entry.',
        feesUsed: '2026 published fees',
        individualOnly: individualOnly2026(m, tiers),
        reconciledKeeps: m.reconciled ? m.reconciled.usaDivingKeepsBeforeNationalsHost : null,
        reconciledNote: 'Actual 2026 USA Diving share per the 22 DiveMeets settlement recaps, BEFORE the Junior Nationals host payout (not yet reconciled).' },
      stops: m.perMeet.slice().sort((a, b) => (a.tier === b.tier ? String(a.stop).localeCompare(String(b.stop), 'en', { numeric: true }) : 0)).map((x) => ({ tier: x.tier, stop: x.stop, eventEntries: x.entries, fee: x.feePerEvent, gross: x.grossEntryIncome,
        diveMeets: x.diveMeetsPassThrough, hosts: x.toHosts, keeps: x.usaDivingKeeps,
        qualifyingEntries: x.qualifyingEntries, nonQualifyingEntries: x.nonQualifyingEntries })),
      rules: m.structure.rules, structure: m.structure, warnings: [],
    };
  }
  throw new Error(`Unknown column type: ${JSON.stringify(col)}`);
}

/* 2026 on the proposals' basis: individual circuit events only. The billed
   figures also carry synchro and entries with no age group (FC Level); take
   those out at the fee each was charged. */
function individualOnly2026(m, tiers) {
  const FEE = { Regions: 45, Zones: 90, 'E / W / C': 115, Nationals: 125 }; // non-individual entries: Regionals pay the $45 non-qualifying fee
  const DM = 4.95, HOST = 25;
  let entries = 0, gross = m.grossEntryIncome, dm = m.diveMeetsPassThrough, hosts = m.toHosts;
  for (const t of tiers) {
    const extra = Math.max(0, t.eventEntries - (t.individualAged || 0));
    entries += t.individualAged || 0;
    gross -= extra * (FEE[t.name] || 0); dm -= extra * DM; hosts -= extra * HOST;
  }
  return { eventEntries: entries, gross: Math.round(gross), diveMeets: Math.round(dm), hosts: Math.round(hosts), keeps: Math.round(gross - dm - hosts) };
}

function hostText(h) {
  if (!h) return 'per the proposal';
  const min = +h.min ? ` (minimum $${(+h.min).toLocaleString('en-US')})` : '';
  if (h.mode === 'per_entry') return `$${+h.perEntry} per event entry${min}`;
  if (h.mode === 'flat') return `$${(+h.flat || 0).toLocaleString('en-US')} per meet${min}`;
  return `${Math.round(100 * (+h.share || 0))}% of what each meet nets after DiveMeets${min}`;
}

function checksFor(columns) {
  const out = [];
  const ok = (pass, msg) => out.push({ pass: !!pass, msg });
  for (const c of columns) {
    if (c.error) { ok(false, `${c.label}: could not be built — ${c.error}`); continue; }
    const s = (k) => c.stops.reduce((a, x) => a + (x[k] || 0), 0);
    ok(Math.abs(s('gross') - c.money.gross) <= c.stops.length, `${c.label}: stops add to the season gross ($${s('gross').toLocaleString()} = $${c.money.gross.toLocaleString()})`);
    ok(Math.abs(s('keeps') - c.money.keeps) <= 2 * c.stops.length, `${c.label}: stops add to what USA Diving keeps`);
    ok(Math.abs(s('eventEntries') - c.tiers.reduce((a, t) => a + t.eventEntries, 0)) <= c.stops.length, `${c.label}: stops add to the season event entries`);
    const withPlaces = c.kind === 'scenario' ? c.tiers.filter((t) => t.places != null) : [];
    if (c.kind === 'scenario') ok(withPlaces.every((t) => t.eventEntries <= t.places), `${c.label}: no stage has more projected event entries than places`);
    const rulesOk = (c.rules || []).every((r) => r.places == null || Number.isFinite(r.places));
    ok(rulesOk, `${c.label}: every advancement rule has a place count`);
    if (c.kind === 'scenario') ok(c.tiers.every((t) => t.status === 'projected'), `${c.label}: every figure labeled projected`);
    const expected = (x) => (typeof x.fee === 'number' ? x.eventEntries * x.fee
      : x.feeSplit ? x.feeSplit.reduce((a, f) => a + f.fee * f.entries, 0)
      : x.qualifyingEntries != null ? x.qualifyingEntries * 85 + x.nonQualifyingEntries * 45 : null);
    const priced = c.stops.filter((x) => expected(x) != null);
    const badFee = priced.filter((x) => Math.abs(expected(x) - x.gross) > 1);
    ok(!badFee.length, `${c.label}: every stop's gross = event entries × fee${badFee.length ? ' (off at ' + badFee.map((x) => x.stop).join(', ') + ')' : ''}`);
    const ent = c.stops.reduce((a, x) => a + x.eventEntries, 0);
    const dmRate = c.kind === 'scenario' ? c.money.diveMeetsPerEntry : c.kind === 'structure2025' ? 3.8 : 4.95;
    const hostRate = c.kind === 'scenario' ? c.money.hostPerEntry : 25;
    ok(Math.abs(c.money.diveMeets - ent * dmRate) <= 1 && (hostRate == null || Math.abs(c.money.hosts - ent * hostRate) <= 1),
      `${c.label}: DiveMeets ($${dmRate})${hostRate != null ? ` and host ($${hostRate})` : ''} charged on the same ${ent.toLocaleString('en-US')} event entries as the fees`);
    if (c.nationals && c.nationals.places != null && c.kind === 'scenario') ok(c.nationals.eventEntries <= c.nationals.places, `${c.label}: Junior Nationals event entries within the places the rules create`);
  }
  return out;
}

export async function buildJuniorCircuitReport(definition, onProgress = () => {}) {
  try { return await buildReport(definition, onProgress); }
  finally { disposeEngines(); }
}

async function buildReport(definition, onProgress) {
  const cfg = Object.assign({}, JC_BUILTIN.config, definition && definition.config);
  const ctx = { membershipYear: +cfg.membershipYear || 2026 };
  onProgress('Loading 2026 Junior Nationals actuals');
  [ctx.jn26, ctx.firstStops26] = await Promise.all([nationals2026Breakdown(), firstStops2026()]);
  const columns = [];
  for (const [i, col] of cfg.columns.entries()) {
    onProgress(`Running ${col.label || col.scenarioId || col.year} (${i + 1} of ${cfg.columns.length})`);
    try { columns.push(await buildColumn(col, ctx)); }
    catch (e) { columns.push({ label: col.label || String(col.scenarioId || col.year), error: String(e && e.message || e) }); }
  }
  onProgress('Loading membership');
  const [e24, e25, e26] = await Promise.all([eligibleByCohort(2024), eligibleByCohort(2025), eligibleByCohort(2026)]);
  const membership = { 2024: e24, 2025: e25, 2026: e26, asOf2026: await membershipAsOf() };
  const s25 = columns.find((c) => c.kind === 'structure2025');
  const accuracy = {
    validation2025: s25 && s25.validation ? s25.validation.projectedVsReal : null,
    nationals2026: ctx.jn26,
  };
  const checks = checksFor(columns);
  return JSON.parse(JSON.stringify({
    definition: { id: definition && definition.id, name: (definition && definition.name) || JC_BUILTIN.name },
    config: cfg, generatedAt: new Date().toISOString(), columns, membership, accuracy, checks,
  }));
}
