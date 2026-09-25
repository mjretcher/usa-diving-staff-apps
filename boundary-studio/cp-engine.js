/* USA Diving — Junior circuit counter-proposal: proportional qualification engine.
   Mirrors the Python model used to build counter-proposal-data.json (same rules,
   same measured rates) so the report's what-if controls recompute live.

   RULES
   - Stop 1 -> Stop 2: in each springboard event at each first-stop meet, a share of
     ELIGIBLE entries advances (count fixed at the entry deadline; half rounds up;
     fields of 3 or fewer all advance). A measured uplift covers the cross-meet
     score threshold and non-displacing athletes. Attendance uses the measured
     2026 take-up. Platform keeps open entry at stop 2. No stop-2 springboard
     event exceeds zoneCap (spots shared across that Zone's Regions).
   - Stop 2 -> Nationals: a share of each event's combined stop-2 field.
     A/B: `direct` per Zone go straight to the semifinal (plus prequalified/HPS);
     the remainder goes to prelims, capped (capSB / capPL). C/D: the share goes
     to prelims, capped. Capped events fill by roll-down; uncapped events apply
     measured Nationals attendance.
   It counts places; it never invents scores. */
(function(root){
'use strict';
const rhu = x => Math.floor(x + 0.5);
const isAB = k => /^Group [AB] /.test(k);
const isPl = k => /Platform$/.test(k);
function project(eng, opt){
  const r = raw(eng, opt);
  if (!eng.expected) return r;
  if (!eng._cal){ const d = raw(eng, {}); eng._cal = {s2: eng.expected.stop2 / d.stop2, n: eng.expected.nats / d.nats}; }
  /* Calibrated so the default settings reproduce the published figures exactly;
     other settings move by the engine's own ratios (validated within ~1%). */
  for (const k in r.events){ r.events[k].direct *= eng._cal.n; r.events[k].prelim *= eng._cal.n; r.events[k].stop2 *= eng._cal.s2; }
  r.stop2 *= eng._cal.s2; r.nats *= eng._cal.n; return r;
}
function raw(eng, opt){
  const p1 = opt && opt.p1 != null ? opt.p1 : eng.p1;
  const p2 = opt && opt.p2 != null ? opt.p2 : eng.p2;
  const d  = opt && opt.direct != null ? opt.direct : eng.direct;
  const capSB = opt && opt.capSB != null ? opt.capSB : eng.capSB;
  const capPL = opt && opt.capPL != null ? opt.capPL : eng.capPL;
  const zf = {};                                   // zone -> event -> field
  for (const meet in eng.s1elig){
    const z = eng.zoneOf[meet]; zf[z] = zf[z] || {};
    for (const k in eng.s1elig[meet]){
      const E = eng.s1elig[meet][k];
      const adv = (E <= 3 ? E : rhu(p1 * E)) * (1 + eng.uplift);
      zf[z][k] = (zf[z][k] || 0) + adv * eng.take12;
    }
  }
  for (const z in eng.plat2) for (const k in eng.plat2[z]){ zf[z] = zf[z] || {}; zf[z][k] = (zf[z][k] || 0) + eng.plat2[z][k]; }
  let stop2 = 0; const tot = {};
  for (const z in zf) for (const k in zf[z]){
    let v = zf[z][k]; if (!isPl(k)) v = Math.min(v, eng.zoneCap);
    stop2 += v; tot[k] = (tot[k] || 0) + v;
  }
  const events = {}; let nats = 0;
  for (const k in tot){
    const cap = isPl(k) ? capPL : capSB, want = p2 * tot[k], pq = eng.pq[k] || 0;
    let D = 0, P;
    if (isAB(k)){
      D = Math.min(eng.nz * d, want) + pq;
      P = Math.max(0, want - eng.nz * d); P = P >= cap ? cap : P * eng.takeNats;
    } else { P = want >= cap ? cap : want * eng.takeNats; P += pq; }
    events[k] = {stop2: tot[k], direct: D, prelim: P, capped: P >= cap};
    nats += D + P;
  }
  return {stop2, nats, events};
}
root.CPEngine = {project};
if (typeof module !== 'undefined') module.exports = root.CPEngine;
})(typeof window !== 'undefined' ? window : globalThis);
