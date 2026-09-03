/* ==========================================================================
   REGRESSION GUARD — the qualification engine and schedule engine agreeing
   with themselves under conditions a "current rulebook only" test never
   exercises: a genuinely different structure (arbitrary tier counts, an
   internal prelim/final split at a level), and a person overriding the
   schedule by hand.

   Four things this guards, each found and fixed against real 2026 data
   during the new-circuit proposal work:

   1. Same-day pairing: a prelim and its final must land on the same day.
      Verified against the real 2026 Junior Nationals schedule (26 real
      sessions, 0 exceptions) before this was written as a rule.
   2. The same guarantee holds when a person manually moves ONLY the prelim
      (or only the final) of a pair -- the untouched half must follow its
      sibling, not get auto-placed as an orphaned single event.
   3. routing.js route bands support a per-cell override (rt.byCell) without
      a second data model, and it doesn't leak into cells that don't use it.
   4. conv (measured take-up rate) is applied once, on genuinely joining a
      level from elsewhere -- not a second time on an internal round
      transition within a level that runs more than one round. Silently
      double-applying it undercounted arrivals through any multi-round level
      (E/W/C's own prelim/final) by however far that level's conv sits from 1.

   Run:  npm install jsdom --no-save   (matches test-billing.js's own,
         currently undocumented, requirement -- neither file's dependency is
         declared anywhere else in the repo)
         node membership-analytics/test-studio.js
   ========================================================================== */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const w = new JSDOM('', { runScripts: 'outside-only' }).window;
w.eval(fs.readFileSync('routing.js', 'utf8'));
w.eval(fs.readFileSync('scenario-schedule-engine.js', 'utf8'));
const QR = w.QualRouting;
const E = w.ScenarioScheduleEngine || (typeof module !== 'undefined' && module.exports);

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log('  PASS:', label); }
  else { fail++; console.log('  **FAIL**:', label); }
}

console.log('=== 1. Same-day pairing, fully automatic ===');
(function () {
  const AGE = { A: 'Group A', B: 'Group B', C: 'Group C', D: 'Group D' }, GEN = { B: 'Boys', G: 'Girls' };
  const DIS = { '1': '1-Meter', '3': '3-Meter', P: 'Platform' };
  const cells = [];
  ['A', 'B', 'C', 'D'].forEach(g => ['B', 'G'].forEach(x => ['1', '3', 'P'].forEach(d => cells.push(g + x + d))));
  const rounds = [
    { key: 'prelim', cells: Object.fromEntries(cells.map(c => [`${AGE[c[0]]}|${GEN[c[1]]}|${DIS[c[2]]}|prelim`, 60])) },
    { key: 'final', cells: Object.fromEntries(cells.map(c => [`${AGE[c[0]]}|${GEN[c[1]]}|${DIS[c[2]]}|final`, 12])) },
  ];
  const spec = k => (k.split('|')[3] === 'final' ? { dives: 4, secondsPerDive: 35 } : { dives: 8, secondsPerDive: 35 });
  const sim = E.simulateStop({ stopName: 'test', rounds }, spec, null, null);
  const dayOf = {};
  sim.days.forEach((day, di) => day.sessions.forEach(sess => sess.events.forEach(ev => {
    const pk = ev.group + '|' + ev.gender + '|' + ev.discipline;
    dayOf[pk] = dayOf[pk] || {}; dayOf[pk][ev.round] = di + 1;
  })));
  let violations = 0, checked = 0;
  Object.values(dayOf).forEach(d => { if (d.prelim && d.final) { checked++; if (d.prelim !== d.final) violations++; } });
  check(`all ${checked} prelim/final pairs land same-day (expect 24 checked, 0 violations)`, checked === 24 && violations === 0);

  console.log('\n=== 2. Same-day pairing holds under a PARTIAL manual override ===');
  const simPartial = E.simulateStop({ stopName: 'test', rounds }, spec, null,
    { dayOf: { 'Group A|Boys|1-Meter|prelim': 1 }, minDays: 3 });
  const pair = {};
  simPartial.days.forEach((day, di) => day.sessions.forEach(sess => sess.events.forEach(ev => {
    if (ev.group === 'Group A' && ev.gender === 'Boys' && ev.discipline === '1-Meter') pair[ev.round] = di + 1;
  })));
  check('manually moving only the prelim pulls its final onto the same day',
    pair.prelim === 1 && pair.final === 1);

  console.log('\n=== 3. A deliberate FULL conflict (both sides manually placed, different days) is honoured, not silently fixed ===');
  const simConflict = E.simulateStop({ stopName: 'test', rounds }, spec, null,
    { dayOf: { 'Group A|Boys|1-Meter|prelim': 1, 'Group A|Boys|1-Meter|final': 2 }, minDays: 3 });
  const pairC = {};
  simConflict.days.forEach((day, di) => day.sessions.forEach(sess => sess.events.forEach(ev => {
    if (ev.group === 'Group A' && ev.gender === 'Boys' && ev.discipline === '1-Meter') pairC[ev.round] = di + 1;
  })));
  check('two explicit manual placements both stand exactly as set (this is deliberate, not a bug)',
    pairC.prelim === 1 && pairC.final === 2);
})();

console.log('\n=== 4. Per-cell band overrides (rt.byCell) apply only to the cell they target ===');
(function () {
  const routing = [
    { rounds: [{ key: 'final' }], routes: [{ from: 'final', lo: 1, hi: 15, to: { level: 1, round: 'final' }, byCell: { PLAT: { lo: 1, hi: 3 } } }] },
    { rounds: [{ key: 'final' }], routes: [] },
  ];
  const res = QR.project({ routing, entries0: [{ '1M': 20, PLAT: 20 }], groupCount: () => 1, groupOf: () => 0, conv: {}, cells: ['1M', 'PLAT'] });
  check('overridden cell (PLAT) respects its own band (3, not the route default of 15)', QR.entriesAt(res, 1, 0, ['PLAT']) === 3);
  check('non-overridden cell (1M) is unaffected by another cell\'s override', QR.entriesAt(res, 1, 0, ['1M']) === 15);
})();

console.log('\n=== 5. conv (take-up rate) is not applied twice on an internal round transition ===');
(function () {
  // Zone -> E/W/C prelim -> E/W/C's own final (internal, same level) -> Nationals.
  // conv[1] (E/W/C's measured take-up) must be applied once, on arriving at
  // E/W/C from Zone -- not again on the internal prelim-to-final step.
  const routing = [
    { rounds: [{ key: 'final' }], routes: [{ from: 'final', lo: 1, hi: 20, to: { level: 1, round: 'prelim' } }] },
    { rounds: [{ key: 'prelim' }, { key: 'final' }], routes: [
      { from: 'prelim', lo: 1, hi: 12, to: { level: 1, round: 'final' } },
      { from: 'final', lo: 1, hi: 3, to: { level: 2, round: 'prelim' } },
    ] },
    { rounds: [{ key: 'prelim' }], routes: [] },
  ];
  const conv = { 1: { X: 0.5 } }; // a measured 50% take-up rate at the E/W/C level
  const res = QR.project({ routing, entries0: [{ X: 20 }], groupCount: () => 1, groupOf: () => 0, conv, cells: ['X'] });
  // 20 into Zone -> 20 arrive at E/W/C prelim, conv applied once = 10.
  // Internal cut top-12 on that 10 -> all 10 pass through to E/W/C's own final (conv must NOT re-apply here).
  // Final top-3 -> Nationals, k=1 there (conv[2] unset) -> 3.
  const nationalsArrivals = QR.entriesAt(res, 2, 0, ['X']);
  check('conv applied once (not twice) through a multi-round level: 3 arrive at Nationals, not ~1.5', nationalsArrivals === 3);
})();

console.log('\n=== 6. "Add a day" (minDays above what the meet needs) actually spreads events onto the new day ===');
(function () {
  const AGE = { A: 'Group A', B: 'Group B', C: 'Group C', D: 'Group D' }, GEN = { B: 'Boys', G: 'Girls' };
  const DIS = { '1': '1-Meter', '3': '3-Meter', P: 'Platform' };
  const cells = [];
  ['A', 'B', 'C', 'D'].forEach(g => ['B', 'G'].forEach(x => ['1', '3', 'P'].forEach(d => cells.push(g + x + d))));
  const rounds = [
    { key: 'prelim', cells: Object.fromEntries(cells.map(c => [`${AGE[c[0]]}|${GEN[c[1]]}|${DIS[c[2]]}|prelim`, 60])) },
    { key: 'final', cells: Object.fromEntries(cells.map(c => [`${AGE[c[0]]}|${GEN[c[1]]}|${DIS[c[2]]}|final`, 12])) },
  ];
  const spec = k => (k.split('|')[3] === 'final' ? { dives: 4, secondsPerDive: 35 } : { dives: 8, secondsPerDive: 35 });
  const base = E.simulateStop({ stopName: 'test', rounds }, spec, null, null);
  const more = E.simulateStop({ stopName: 'test', rounds }, spec, null, { minDays: base.totalDays + 1 });
  const lastDay = more.days[more.days.length - 1];
  const onLast = (lastDay.sessions || []).reduce((a, s) => a + s.events.length, 0);
  check(`the added day (${more.totalDays} of them now) holds events, not nothing (${onLast} placed there)`, more.totalDays === base.totalDays + 1 && onLast > 0);
  const dayOf = {};
  more.days.forEach((day, di) => day.sessions.forEach(s => s.events.forEach(ev => { const pk = ev.group + '|' + ev.gender + '|' + ev.discipline; dayOf[pk] = dayOf[pk] || {}; dayOf[pk][ev.round] = di + 1; })));
  check('prelim/final pairs still share a day after the spread', Object.values(dayOf).every(d => !(d.prelim && d.final) || d.prelim === d.final));
})();

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
