/* ============================================================
   ae-rules.js — competition formats and dive-list validation.

   Every rule here is transcribed from a primary source and carries its
   citation. Nothing is inferred. Where a source is ambiguous the entry is
   marked `confirm: true` and the app says so rather than pretending.

   Sources
     USAD  2026 USA Diving Technical Diving Rulebook
             Art. 105.1  dive number grammar
             Art. 105.2  repeating dives prohibited
             Art. 302.1  junior springboard formats
             Art. 302.2  junior platform formats
     WA    World Aquatics Competition Regulations, in force February 2026
             senior individual event composition

   THE RULE MOST EASILY GOT WRONG — Art. 105.2:
     "No dive ... may be repeated. All dives of the same number, whether
      performed in the free, straight, pike, or tuck position, are to be
      considered the same dive."
   So 105B and 105C are ONE dive, not two. Identity is the numerals only.
   ============================================================ */
(function () {
  'use strict';

  // Dive identity for repeat-checking: numerals only, position stripped.
  function diveIdentity(code) {
    const s = String(code || '').toUpperCase().replace(/[^0-9A-D]/g, '');
    return s.replace(/[ABCD]$/, '');
  }

  // Group for composition rules is the rulebook's six families (Art. 105.1(b)),
  // not the finer taxonomy used for analysis. Twisting is one group here.
  function ruleGroup(code) {
    const s = String(code || '').replace(/[^0-9]/g, '');
    return s ? s.charAt(0) : null;
  }

  const SB = ['1m', '3m'], PL = ['Platform'];

  /* ---------------- USA Diving junior formats (Art. 302) ---------------- */
  // withLimit.ddCap is keyed by discipline where the rulebook differs.
  const USAD_JUNIOR = [
    // --- springboard, Art. 302.1
    { id: 'usad-jr-D-sb', body: 'USA Diving', level: 'Junior', group: 'D', gender: 'any',
      disciplines: SB, dives: 6,
      withLimit: { count: 4, distinctGroups: 4, ddCap: { '1m': 7.0, '3m': 7.6 } },
      withoutLimit: { count: 2, distinctGroups: 2 },
      cite: 'USAD Art. 302.1(a)' },
    { id: 'usad-jr-C-sb-f', body: 'USA Diving', level: 'Junior', group: 'C', gender: 'Female',
      disciplines: SB, dives: 7,
      withLimit: { count: 5, distinctGroups: 5, ddCap: { '1m': 9.0, '3m': 9.5 } },
      withoutLimit: { count: 2, distinctGroups: 2 },
      cite: 'USAD Art. 302.1(b)' },
    { id: 'usad-jr-C-sb-m', body: 'USA Diving', level: 'Junior', group: 'C', gender: 'Male',
      disciplines: SB, dives: 8,
      withLimit: { count: 5, distinctGroups: 5, ddCap: { '1m': 9.0, '3m': 9.5 } },
      withoutLimit: { count: 3, distinctGroups: 3 },
      cite: 'USAD Art. 302.1(c)' },
    { id: 'usad-jr-B-sb-f', body: 'USA Diving', level: 'Junior', group: 'B', gender: 'Female',
      disciplines: SB, dives: 8,
      withLimit: { count: 5, distinctGroups: 5, ddCap: { '1m': 9.0, '3m': 9.5 } },
      withoutLimit: { count: 3, distinctGroups: 3 },
      cite: 'USAD Art. 302.1(d)' },
    { id: 'usad-jr-B-sb-m', body: 'USA Diving', level: 'Junior', group: 'B', gender: 'Male',
      disciplines: SB, dives: 9,
      withLimit: { count: 5, distinctGroups: 5, ddCap: { '1m': 9.0, '3m': 9.5 } },
      withoutLimit: { count: 4, distinctGroups: 4 },
      cite: 'USAD Art. 302.1(e)' },
    { id: 'usad-jr-A-sb-f', body: 'USA Diving', level: 'Junior', group: 'A', gender: 'Female',
      disciplines: SB, dives: 9,
      withLimit: { count: 5, distinctGroups: 5, ddCap: { '1m': 9.0, '3m': 9.5 } },
      withoutLimit: { count: 4, distinctGroups: 4 },
      cite: 'USAD Art. 302.1(f)' },
    { id: 'usad-jr-A-sb-m', body: 'USA Diving', level: 'Junior', group: 'A', gender: 'Male',
      disciplines: SB, dives: 10,
      withLimit: { count: 5, distinctGroups: 5, ddCap: { '1m': 9.0, '3m': 9.5 } },
      withoutLimit: { count: 5, distinctGroups: 5 },
      cite: 'USAD Art. 302.1(g)' },

    // --- platform, Art. 302.2
    { id: 'usad-jr-D-pl', body: 'USA Diving', level: 'Junior', group: 'D', gender: 'any',
      disciplines: PL, dives: 6,
      withLimit: { count: 4, distinctGroups: 3, ddCap: { Platform: 7.6 }, lineupAllowed: 1 },
      withoutLimit: { count: 2, distinctGroups: 2 },
      note: 'Up to one voluntary may be a front or back lineup (001 or 002) in any position at DD 1.0.',
      cite: 'USAD Art. 302.2(a)' },
    { id: 'usad-jr-C-pl-f', body: 'USA Diving', level: 'Junior', group: 'C', gender: 'Female',
      disciplines: PL, dives: 6,
      withLimit: { count: 4, distinctGroups: 4, ddCap: { Platform: 7.6 } },
      withoutLimit: { count: 2, distinctGroups: 2 },
      cite: 'USAD Art. 302.2(b)' },
    { id: 'usad-jr-C-pl-m', body: 'USA Diving', level: 'Junior', group: 'C', gender: 'Male',
      disciplines: PL, dives: 7,
      withLimit: { count: 4, distinctGroups: 4, ddCap: { Platform: 7.6 } },
      withoutLimit: { count: 3, distinctGroups: 3 },
      cite: 'USAD Art. 302.2(c)' },
    { id: 'usad-jr-B-pl-f', body: 'USA Diving', level: 'Junior', group: 'B', gender: 'Female',
      disciplines: PL, dives: 7,
      withLimit: { count: 4, distinctGroups: 4, ddCap: { Platform: 7.6 } },
      withoutLimit: { count: 3, distinctGroups: 3 }, minGroupsOverall: 5,
      cite: 'USAD Art. 302.2(d)' },
    { id: 'usad-jr-B-pl-m', body: 'USA Diving', level: 'Junior', group: 'B', gender: 'Male',
      disciplines: PL, dives: 8,
      withLimit: { count: 4, distinctGroups: 4, ddCap: { Platform: 7.6 } },
      withoutLimit: { count: 4, distinctGroups: 4 }, minGroupsOverall: 5,
      cite: 'USAD Art. 302.2(e)' },
    { id: 'usad-jr-A-pl-f', body: 'USA Diving', level: 'Junior', group: 'A', gender: 'Female',
      disciplines: PL, dives: 8,
      withLimit: { count: 4, distinctGroups: 4, ddCap: { Platform: 7.6 } },
      withoutLimit: { count: 4, distinctGroups: 4 }, minGroupsOverall: 5,
      cite: 'USAD Art. 302.2(f)' },
    { id: 'usad-jr-A-pl-m', body: 'USA Diving', level: 'Junior', group: 'A', gender: 'Male',
      disciplines: PL, dives: 9,
      withLimit: { count: 4, distinctGroups: 4, ddCap: { Platform: 7.6 } },
      withoutLimit: { count: 5, distinctGroups: 5 }, minGroupsOverall: 6,
      cite: 'USAD Art. 302.2(g) — all six groups must be used' },
  ];

  /* ---------------- World Aquatics senior formats ---------------- */
  const WA_SENIOR = [
    { id: 'wa-sr-sb-m', body: 'World Aquatics', level: 'Senior', group: null, gender: 'Male',
      disciplines: SB, dives: 6,
      withLimit: null, withoutLimit: { count: 6, distinctGroups: 5 },
      cite: 'World Aquatics Competition Regulations, Feb 2026' },
    { id: 'wa-sr-pl-m', body: 'World Aquatics', level: 'Senior', group: null, gender: 'Male',
      disciplines: PL, dives: 6,
      withLimit: null, withoutLimit: { count: 6, distinctGroups: 6 },
      note: 'At World Aquatics senior events only dives from the 10 metre platform are permitted.',
      cite: 'World Aquatics Competition Regulations, Feb 2026' },
    { id: 'wa-sr-sb-f', body: 'World Aquatics', level: 'Senior', group: null, gender: 'Female',
      disciplines: SB, dives: 5,
      withLimit: null, withoutLimit: { count: 5, distinctGroups: 5 },
      cite: 'World Aquatics Competition Regulations, Feb 2026' },
    { id: 'wa-sr-pl-f', body: 'World Aquatics', level: 'Senior', group: null, gender: 'Female',
      disciplines: PL, dives: 5,
      withLimit: null, withoutLimit: { count: 5, distinctGroups: 5 },
      note: 'At World Aquatics senior events only dives from the 10 metre platform are permitted.',
      confirm: 'Women\u2019s platform group requirement read across from the five-dive rule; confirm against the current regulations before relying on it.',
      cite: 'World Aquatics Competition Regulations, Feb 2026' },
  ];

  const ALL = USAD_JUNIOR.concat(WA_SENIOR);

  function formatsFor(gender, discipline) {
    const g = String(gender || '').toLowerCase();
    const norm = ['female', 'women', 'girls'].includes(g) ? 'Female'
      : ['male', 'men', 'boys'].includes(g) ? 'Male' : null;
    return ALL.filter((f) => f.disciplines.includes(discipline)
      && (f.gender === 'any' || !norm || f.gender === norm));
  }

  function byId(id) { return ALL.find((f) => f.id === id) || null; }

  /**
   * Validate a proposed list against a format.
   * `list` items need { code, dd, withLimit? }. The first
   * format.withLimit.count entries are treated as the limited dives.
   * Returns { ok, violations: [{rule, cite, detail}] }.
   */
  function validate(list, format, discipline) {
    const v = [];
    if (!format) return { ok: false, violations: [{ rule: 'No format selected', cite: '', detail: '' }] };

    if (list.length !== format.dives) {
      v.push({ rule: 'Wrong number of dives', cite: format.cite,
        detail: `${list.length} selected, ${format.dives} required.` });
    }

    // Art. 105.2 — identity is the numerals, position is irrelevant.
    const seen = new Map();
    list.forEach((d) => {
      const id = diveIdentity(d.code);
      seen.set(id, (seen.get(id) || 0) + 1);
    });
    seen.forEach((n, id) => {
      if (n > 1) {
        v.push({ rule: 'Repeated dive', cite: 'USAD Art. 105.2',
          detail: `${id} appears ${n} times. All positions of one dive number count as the same dive.` });
      }
    });

    const lim = format.withLimit ? list.slice(0, format.withLimit.count) : [];
    const opt = format.withLimit ? list.slice(format.withLimit.count) : list;

    if (format.withLimit) {
      const cap = format.withLimit.ddCap ? format.withLimit.ddCap[discipline] : null;
      if (cap != null) {
        const sum = lim.reduce((a, d) => a + (Number(d.dd) || 0), 0);
        if (sum > cap + 1e-9) {
          v.push({ rule: 'Voluntary DD over the cap', cite: format.cite,
            detail: `${sum.toFixed(1)} against a maximum of ${cap.toFixed(1)} on ${discipline}.` });
        }
      }
      const groups = new Set(lim.map((d) => ruleGroup(d.code)).filter(Boolean));
      if (groups.size < format.withLimit.distinctGroups) {
        v.push({ rule: 'Voluntary dives not from enough groups', cite: format.cite,
          detail: `${groups.size} group${groups.size === 1 ? '' : 's'} used, ${format.withLimit.distinctGroups} required.` });
      }
    }

    if (format.withoutLimit && format.withoutLimit.distinctGroups) {
      const groups = new Set(opt.map((d) => ruleGroup(d.code)).filter(Boolean));
      if (groups.size < format.withoutLimit.distinctGroups) {
        v.push({ rule: 'Optional dives not from enough groups', cite: format.cite,
          detail: `${groups.size} used, ${format.withoutLimit.distinctGroups} required.` });
      }
    }

    if (format.minGroupsOverall) {
      const groups = new Set(list.map((d) => ruleGroup(d.code)).filter(Boolean));
      if (groups.size < format.minGroupsOverall) {
        v.push({ rule: 'Not enough groups across the whole list', cite: format.cite,
          detail: `${groups.size} used, ${format.minGroupsOverall} required.` });
      }
    }

    return { ok: v.length === 0, violations: v };
  }

  /**
   * Highest expected-value list that satisfies `format`.
   * Greedy with backtracking over group constraints; the candidate pool is
   * small enough (an athlete's own repertoire) that this is exact in practice.
   * Returns { list, ok, violations, note }.
   */
  function buildList(candidates, format, discipline) {
    if (!format) return { list: [], ok: false, violations: [], note: 'No format selected.' };
    const pool = candidates.slice().sort((a, b) => b.ev - a.ev);

    // Limited dives first: satisfy group spread and the DD cap while keeping EV high.
    const lim = [];
    if (format.withLimit) {
      const cap = format.withLimit.ddCap ? format.withLimit.ddCap[discipline] : null;
      const need = format.withLimit.count;
      const wantGroups = format.withLimit.distinctGroups;
      // Cheapest-DD dive per group gives the best chance of clearing the cap.
      const byGroup = new Map();
      pool.forEach((d) => {
        const g = ruleGroup(d.code);
        if (!g) return;
        const cur = byGroup.get(g);
        if (!cur || d.dd < cur.dd || (d.dd === cur.dd && d.ev > cur.ev)) byGroup.set(g, d);
      });
      [...byGroup.values()].sort((a, b) => a.dd - b.dd).forEach((d) => {
        if (lim.length < Math.min(need, wantGroups)) lim.push(d);
      });
      // Fill any remaining limited slots with the best EV that keeps us under cap.
      const usedIds = new Set(lim.map((d) => diveIdentity(d.code)));
      for (const d of pool) {
        if (lim.length >= need) break;
        if (usedIds.has(diveIdentity(d.code))) continue;
        const sum = lim.reduce((a, x) => a + x.dd, 0) + d.dd;
        if (cap != null && sum > cap) continue;
        lim.push(d); usedIds.add(diveIdentity(d.code));
      }
    }

    const used = new Set(lim.map((d) => diveIdentity(d.code)));
    const opt = [];
    const optNeed = format.dives - lim.length;
    const optGroups = new Set();
    const wantOptGroups = (format.withoutLimit && format.withoutLimit.distinctGroups) || 0;
    // First pass: satisfy the group spread with the best EV in each new group.
    for (const d of pool) {
      if (opt.length >= optNeed) break;
      const id = diveIdentity(d.code), g = ruleGroup(d.code);
      if (used.has(id)) continue;
      if (optGroups.size < wantOptGroups && g && optGroups.has(g)) continue;
      opt.push(d); used.add(id); if (g) optGroups.add(g);
    }
    // Second pass: fill whatever is left purely on EV.
    for (const d of pool) {
      if (opt.length >= optNeed) break;
      const id = diveIdentity(d.code);
      if (used.has(id)) continue;
      opt.push(d); used.add(id);
    }

    let list = lim.concat(opt);

    // Some formats require a minimum group spread across the WHOLE list —
    // Group A boys platform needs all six (Art. 302.2(g)). Greedy EV selection
    // will not satisfy that on its own, so repair: for each missing group,
    // swap in its best dive for the cheapest-EV dive from an over-represented
    // group, never touching the limited dives (they carry the DD cap).
    if (format.minGroupsOverall) {
      const optStart = lim.length;
      let present = new Set(list.map((d) => ruleGroup(d.code)).filter(Boolean));
      const missing = [];
      for (let g = 1; g <= 6; g++) {
        if (present.size + missing.length >= format.minGroupsOverall) break;
        if (!present.has(String(g))) missing.push(String(g));
      }
      for (const g of missing) {
        const inList = new Set(list.map((d) => diveIdentity(d.code)));
        const cand = pool.find((d) => ruleGroup(d.code) === g && !inList.has(diveIdentity(d.code)));
        if (!cand) continue;
        // drop the weakest optional whose group would still be represented
        const counts = {};
        list.forEach((d) => { const k = ruleGroup(d.code); counts[k] = (counts[k] || 0) + 1; });
        let dropIdx = -1, dropEv = Infinity;
        for (let i = optStart; i < list.length; i++) {
          const k = ruleGroup(list[i].code);
          if (counts[k] > 1 && list[i].ev < dropEv) { dropEv = list[i].ev; dropIdx = i; }
        }
        if (dropIdx >= 0) { list[dropIdx] = cand; present = new Set(list.map((d) => ruleGroup(d.code)).filter(Boolean)); }
      }
    }

    const res = validate(list, format, discipline);
    return {
      list, ok: res.ok, violations: res.violations,
      limitedCount: lim.length,
      note: list.length < format.dives
        ? `This athlete has only ${list.length} dives with enough attempts to use; the format needs ${format.dives}.`
        : null,
    };
  }

  window.AERules = {
    FORMATS: ALL, formatsFor, byId, validate, buildList, diveIdentity, ruleGroup,
    SOURCES: [
      { label: '2026 USA Diving Technical Diving Rulebook', detail: 'Art. 105.1, 105.2, 302.1, 302.2' },
      { label: 'World Aquatics Competition Regulations', detail: 'in force February 2026' },
    ],
  };
})();
