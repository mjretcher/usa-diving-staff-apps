/* ==========================================================================
   USA Diving — Qualification routing
   --------------------------------------------------------------------------
   Projects any qualification pathway, not just "the top N advance".

   WHY THIS EXISTS
     The flow engine could express one rule shape: a stop has one field, the
     top N go up, the top few go straight to the final championship. Real
     proposals do not look like that. A worked example:

       Of the top 24 in East/West/Central prelims, the top 8 go straight to the
       SEMI-FINALS at Junior Nationals. Places 9-24 swim the E/W/C final, and
       the top 8 of those go to the PRELIMS at Junior Nationals.

     Two things there are new. Athletes are routed out of a stop MID-COMPETITION
     rather than at the end of it, and two groups arriving at the same
     championship enter it at DIFFERENT ROUNDS. Neither can be written as a
     single advance count.

   THE MODEL
     A level has rounds. Each round has routes, and a route says: places LO to
     HI finishing this round go to that level, entering at that round. A route
     with no destination is elimination. That single shape expresses the
     current rulebook, the example above, and anything else built from
     placements — which is what a qualification pathway is.

       {from:'prelim', lo:1, hi:8,  to:{level:3, round:'semi'}}
       {from:'prelim', lo:9, hi:24, to:{level:2, round:'final'}}
       {from:'final',  lo:1, hi:8,  to:{level:3, round:'prelim'}}

   WHAT IT DELIBERATELY DOES NOT DO
     It does not decide who wins. Places are counted, never simulated — a band
     of places 9 to 24 yields however many athletes actually sit in that band,
     capped by the size of the field. Nothing here invents a score.
   ========================================================================== */
(function(){
'use strict';

const ROUND_ORDER = ['prelim', 'quarter', 'semi', 'final'];
const ROUND_NAME  = {prelim:'Preliminaries', quarter:'Quarter-finals',
                     semi:'Semi-finals', final:'Finals'};

/* How many athletes sit in places lo..hi of a field this size. A band reaching
   beyond the field simply yields fewer, exactly as a short field sends fewer
   divers on under the current rules. */
function bandCount(fieldSize, lo, hi){
  const a = Math.max(1, Math.floor(lo || 1));
  const b = Math.floor(hi == null ? Infinity : hi);
  if (!(fieldSize > 0) || b < a) return 0;
  return Math.max(0, Math.min(b, fieldSize) - a + 1);
}

/* The rounds a level runs, in competition order. */
function roundsOf(level){
  const r = (level && level.rounds && level.rounds.length) ? level.rounds : [{key:'final'}];
  return r.slice().sort((x,y) => ROUND_ORDER.indexOf(x.key) - ROUND_ORDER.indexOf(y.key));
}

/* ---------- the current rulebook, as routes ----------
   Written out rather than hard-coded in the engine, so the 2026 pathway is one
   configuration among many and can be diffed against a proposal. */
function defaultRouting(levelCount, finalLevel){
  const F = finalLevel == null ? levelCount : finalLevel;
  const out = [];
  for (let L = 0; L < levelCount; L++){
    if (L === 0){
      // Regionals and Zones run a single round, so their only round is the
      // final one and that is also where arrivals land.
      out.push({rounds:[{key:'final'}],
                routes:[{from:'final', lo:1, hi:15, to:{level:1, round:'final'}}]});
    } else if (L === 1){
      out.push({rounds:[{key:'final'}],
                routes:[{from:'final', lo:1,  hi:3,  to:{level:F, round:'prelim'}},
                        {from:'final', lo:4,  hi:18, to:{level:2, round:'prelim'}}]});
    } else {
      out.push({rounds:[{key:'prelim'},{key:'final'}],
                routes:[{from:'prelim', lo:1, hi:12, to:{level:L, round:'final'}},
                        {from:'final',  lo:1, hi:3,  to:{level:F, round:'prelim'}}]});
    }
  }
  out.push({rounds:[{key:'prelim'},{key:'final'}],
            routes:[{from:'prelim', lo:1, hi:12, to:{level:F, round:'final'}}]});
  return out;
}

/* ---------- validation ----------
   Overlapping bands double-count athletes and gaps silently drop them. Both
   produce a plausible-looking number, which is the dangerous kind of wrong, so
   they are reported before anyone reads the projection. */
function validate(routing){
  const problems = [];
  routing.forEach((lvl, L) => {
    const rounds = roundsOf(lvl).map(r => r.key);
    const byRound = {};
    (lvl.routes || []).forEach(rt => (byRound[rt.from] = byRound[rt.from] || []).push(rt));

    Object.keys(byRound).forEach(rk => {
      if (rounds.indexOf(rk) < 0){
        problems.push({level:L, kind:'no-such-round',
          msg:`routes leave a "${rk}" round that this level does not run`});
      }
      // A route pointing at a round the destination does not run is the worst
      // kind of error: the athletes simply never arrive, and every downstream
      // number is quietly too small. Checking departures alone missed it.
      byRound[rk].forEach(rt => {
        if (!rt.to) return;
        const dest = routing[rt.to.level];
        if (!dest){
          problems.push({level:L, kind:'no-such-level',
            msg:`a route out of ${rk} points at level ${rt.to.level}, which does not exist`});
          return;
        }
        if (roundsOf(dest).every(r => r.key !== rt.to.round)){
          problems.push({level:L, kind:'no-such-destination-round',
            msg:`places ${rt.lo}-${rt.hi ?? '∞'} out of ${rk} are sent to the "${rt.to.round}" ` +
                `round of level ${rt.to.level}, which only runs ` +
                roundsOf(dest).map(r=>`"${r.key}"`).join(', ')});
        }
      });
      const bands = byRound[rk].slice().sort((a,b) => (a.lo||1) - (b.lo||1));
      for (let i = 1; i < bands.length; i++){
        const prev = bands[i-1], cur = bands[i];
        const prevHi = prev.hi == null ? Infinity : prev.hi;
        if ((cur.lo || 1) <= prevHi){
          problems.push({level:L, kind:'overlap',
            msg:`places ${cur.lo}-${cur.hi ?? '∞'} overlap ${prev.lo}-${prev.hi ?? '∞'} out of ${rk} — ` +
                `athletes in both bands would be counted twice`});
        } else if ((cur.lo || 1) > prevHi + 1){
          problems.push({level:L, kind:'gap',
            msg:`places ${prevHi + 1}-${(cur.lo||1) - 1} out of ${rk} go nowhere — ` +
                `intended, or a gap?`});
        }
      }
    });

    rounds.forEach(rk => {
      const leaves = (byRound[rk] || []).length;
      const fed = L === 0 && rk === rounds[0];
      const arrives = routing.some(l2 => (l2.routes||[]).some(rt =>
        rt.to && rt.to.level === L && rt.to.round === rk));
      if (!leaves && !arrives && !fed){
        problems.push({level:L, kind:'orphan-round',
          msg:`the "${rk}" round is never entered and never left`});
      } else if (arrives && !leaves && rounds.indexOf(rk) < rounds.length - 1){
        // Elimination is a normal outcome, so a level's LAST round having no
        // exit is expected. An earlier round with athletes in it and no way out,
        // while a later round exists, means the sequence is broken and those
        // athletes are stranded.
        problems.push({level:L, kind:'stranded',
          msg:`athletes reach the "${rk}" round but nothing takes them out of it, ` +
              `while a later round runs here — is the sequence wired through?`});
      } else if (leaves && !arrives && !fed){
        // Adding a round does not rewire what feeds it. The round then sits at
        // zero and every route out of it quietly does nothing -- which reads as
        // a structure that simply produces no athletes rather than as an error.
        problems.push({level:L, kind:'unfed-round',
          msg:`nothing arrives at the "${rk}" round, so the routes out of it move nobody — ` +
              `something upstream probably still points at a later round here`});
      }
    });
  });
  return problems;
}

/* ---------- projection ----------
   entries0  : per level-0 group, {cell: count} — the observed starting field
   groupOf   : (fromLevel, fromGroup, toLevel) -> destination group index
   conv      : optional {level: {cell: multiplier}} take-up, applied on arrival
   Returns field sizes for every level, group, round and cell.
*/
function project(opts){
  const routing = opts.routing;
  const entries0 = opts.entries0 || [];
  const groupCount = opts.groupCount;          // (level) -> number of groups
  const groupOf = opts.groupOf;                // (fromL, fromG, toL) -> group index
  const conv = opts.conv || {};
  const cells = opts.cells;

  // field[L][round][group][cell]
  const field = routing.map((lvl, L) => {
    const f = {};
    roundsOf(lvl).forEach(r => {
      f[r.key] = Array.from({length: Math.max(1, groupCount(L))}, () => ({}));
    });
    return f;
  });

  // Seed the entry level.
  const firstRound = roundsOf(routing[0])[0].key;
  entries0.forEach((row, g) => {
    if (!field[0][firstRound][g]) return;
    cells.forEach(c => { if (row[c]) field[0][firstRound][g][c] = row[c]; });
  });

  const flows = [], dropped = [];
  const add = (toL, toR, toG, cell, n) => {
    if (n <= 0) return;
    const lvl = field[toL];
    if (!lvl || !lvl[toR] || !lvl[toR][toG]){
      // Record it. Athletes vanishing without trace is how a projection ends up
      // confidently wrong.
      dropped.push({toLevel:toL, toRound:toR, toGroup:toG, cell, n,
                    why: !lvl ? 'no such level' : !lvl[toR] ? 'no such round' : 'no such group'});
      return;
    }
    const k = (conv[toL] && conv[toL][cell] != null) ? conv[toL][cell] : 1;
    lvl[toR][toG][cell] = (lvl[toR][toG][cell] || 0) + n * k;
  };

  // Levels in order; rounds within a level in competition order. A route may
  // only ever point forward, which is what makes one pass sufficient.
  routing.forEach((lvl, L) => {
    roundsOf(lvl).forEach(r => {
      const outs = (lvl.routes || []).filter(rt => rt.from === r.key);
      for (let g = 0; g < groupCount(L); g++){
        const here = field[L][r.key][g] || {};
        cells.forEach(cell => {
          const size = here[cell] || 0;
          if (size <= 0) return;
          outs.forEach(rt => {
            const n = bandCount(size, rt.lo, rt.hi);
            if (!n || !rt.to) return;
            const toL = rt.to.level;
            const toG = (toL === L) ? g : groupOf(L, g, toL);
            if (toG == null) return;
            add(toL, rt.to.round, toG, cell, n);
            flows.push({fromLevel:L, fromRound:r.key, fromGroup:g,
                        toLevel:toL, toRound:rt.to.round, toGroup:toG,
                        cell, n});
          });
        });
      }
    });
  });

  const problems = validate(routing);
  if (dropped.length){
    const n = dropped.reduce((s,d) => s + d.n, 0);
    problems.push({level:null, kind:'dropped',
      msg:`${Math.round(n)} athlete place(s) were routed somewhere that does not exist and ` +
          `have been lost from the projection — fix the routes before reading these numbers`});
  }
  return {field, flows, dropped, problems};
}

/* Total athletes entering a level's given round, across groups and cells. */
function sizeAt(res, level, round, cells){
  const lvl = res.field[level];
  if (!lvl || !lvl[round]) return 0;
  return lvl[round].reduce((s, g) =>
    s + cells.reduce((q, c) => q + (g[c] || 0), 0), 0);
}

/* Plain-English description of a level's routes, for a report or a panel. */
function describe(routing, L, levelName){
  const lvl = routing[L];
  if (!lvl) return '';
  return roundsOf(lvl).map(r => {
    const outs = (lvl.routes || []).filter(rt => rt.from === r.key);
    if (!outs.length) return `${ROUND_NAME[r.key] || r.key}: nobody advances`;
    return `${ROUND_NAME[r.key] || r.key}: ` + outs.map(rt => {
      const band = rt.hi == null ? `places ${rt.lo} and below`
                 : rt.lo === rt.hi ? `place ${rt.lo}`
                 : `places ${rt.lo}–${rt.hi}`;
      if (!rt.to) return `${band} out`;
      const dest = levelName(rt.to.level);
      const rn = (ROUND_NAME[rt.to.round] || rt.to.round).toLowerCase();
      return `${band} → ${dest} ${rn}`;
    }).join('; ');
  }).join(' · ');
}

/* The round a level is entered at when nothing says otherwise: its first. */
function entryRound(level){ return roundsOf(level)[0].key; }

window.QualRouting = {
  ROUND_ORDER, ROUND_NAME, roundsOf, bandCount, entryRound,
  defaultRouting, validate, project, sizeAt, describe,
};

})();
