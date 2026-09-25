/* In-house recomputation of the Junior Circuit average-score bars, used as a
   CHECK against the bars DiveMeets publishes (junior_results.zone_thresholds).
   Until the rules name USA Diving as the calculator, the published bar is the
   official one; this module only reports whether our own results reproduce it.

   Methods (as published / as reproduced 2026-09-25):
   - Regionals -> Zones (zone ALL; 2024, 2025): the 15th-place score from each
     Region (or the last score if fewer than 15), averaged; any Region score more
     than one standard deviation (population) from that average is dropped and the
     rest re-averaged. DiveMeets' page text. Reproduces 2025 16/16 (5 published
     values directly), 2024 15/16.
   - E/W/C -> Junior Nationals (zone EWC; 2026): plain average of the 3rd-place
     Final score at East, West and Central. Reproduces 24/24.
   - Zones -> E/W/C (zone Z18; 2026): plain average of the 18th-place score from
     each Zone (or the last score if fewer than 18). Reproduces 16/24; the other
     8 are listed in KNOWN_DIFFERENCES below until explained.
   Places come from core.event_results; exhibition (127) and zero scores are not
   counted as a place. */

export const KNOWN_DIFFERENCES = {
  '2024|ALL|Group C Girls 3M': 'one Region\u2019s 15th-place score is 18.20 in our results; DiveMeets evidently did not count it',
  '2026|Z18|Group A Boys 1M': 'under review', '2026|Z18|Group A Boys 3M': 'under review',
  '2026|Z18|Group A Boys Platform': 'under review (no Zone has 18 platform finishers)',
  '2026|Z18|Group A Girls 1M': 'under review', '2026|Z18|Group A Girls 3M': 'under review',
  '2026|Z18|Group C Girls 1M': 'under review', '2026|Z18|Group D Boys 1M': 'under review',
  '2026|Z18|Group D Girls 1M': 'under review',
};

const METHODS = [
  { zone: 'ALL', years: [2024, 2025], stage: 'Regionals', place: 15, finalOnly: false, sdTrim: true, springboardOnly: true },
  { zone: 'Z18', years: [2026], stage: 'Zones', place: 18, finalOnly: false, sdTrim: false },
  { zone: 'EWC', years: [2026], stage: 'EWC', place: 3, finalOnly: true, sdTrim: false },
];

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

/* query(sql, params) -> rows of objects. Returns [{year, zone, event_key, computed, meets}]. */
export async function computeBars(query) {
  const out = [];
  for (const M of METHODS) for (const year of M.years) {
    const rows = await query(`select meet_id_dm m, age_group ag, gender g, discipline d, place, score, round
      from core.event_results where year=$1 and stage=$2 and is_junior_circuit and not coalesce(is_synchro,false)
        and age_group is not null ${M.springboardOnly ? "and discipline in ('1M','3M')" : ''}`, [year, M.stage]);
    const ev = {};
    for (const x of rows) {
      const k = `${x.ag} ${x.g} ${x.d}`;
      ((ev[k] = ev[k] || {})[x.m] = ev[k][x.m] || []).push(x);
    }
    for (const k of Object.keys(ev)) {
      const vals = Object.values(ev[k]).map((rs) => {
        let r = rs;
        if (M.finalOnly) { const f = rs.filter((x) => x.round === 'Final'); if (f.length) r = f; }
        const s = r.filter((x) => x.place != null && +x.place !== 127 && +x.score > 0).sort((a, b) => a.place - b.place);
        return s.length ? +s[Math.min(M.place - 1, s.length - 1)].score : null;
      }).filter((v) => v != null);
      if (!vals.length) continue;
      let bar = mean(vals);
      if (M.sdTrim) {
        const sd = Math.sqrt(vals.reduce((s, x) => s + (x - bar) ** 2, 0) / vals.length);
        const kept = vals.filter((x) => Math.abs(x - bar) <= sd);
        bar = mean(kept);
      }
      out.push({ year, zone: M.zone, event_key: k, computed: bar, meets: vals.length });
    }
  }
  return out;
}

/* Compare against the stored (published) bars. Tolerance 0.0015: DiveMeets shows
   three decimals, truncated. */
export async function checkBars(query) {
  const stored = await query(`select year, zone, event_key, threshold_score from junior_results.zone_thresholds where zone in ('ALL','Z18','EWC')`);
  const S = {}; for (const r of stored) S[`${r.year}|${r.zone}|${r.event_key}`] = +r.threshold_score;
  const comp = await computeBars(query);
  const rows = comp.filter((c) => S[`${c.year}|${c.zone}|${c.event_key}`] != null).map((c) => {
    const key = `${c.year}|${c.zone}|${c.event_key}`;
    const diff = c.computed - S[key];
    return { key, published: S[key], computed: +c.computed.toFixed(3), diff: +diff.toFixed(3),
      match: Math.abs(diff) < 0.0015, known: KNOWN_DIFFERENCES[key] || null };
  });
  return { rows, missing: Object.keys(S).filter((k) => !rows.find((r) => r.key === k)) };
}
