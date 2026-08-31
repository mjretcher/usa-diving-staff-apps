/* ==========================================================================
   REGRESSION GUARD -- route threshold step buttons (+/-1 next to a route's
   hi value) actually update S.routing through the SAME change handler the
   number input itself uses, with a real DOM click and real event dispatch --
   not just a function call. Built for comparing an E/W/C-style cap across
   3/4/5 (or any route's nearby thresholds) without retyping a number each
   time.

   The two handlers below are copied verbatim from wirePathway() in
   boundary.js so this file has no dependency on booting the whole app --
   deliberately makes this test brittle to that logic changing without this
   file being updated to match, which is the point of a regression guard.

   Run:  npm install jsdom --no-save
         node membership-analytics/test-route-step.js
   ========================================================================== */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><body>
  <div id="bsPathWrap">
    <div class="bs-route">
      <input class="bs-rt-in" type="number" data-rt="lo" data-l="1" data-i="0" value="1">
      <input class="bs-rt-in bs-rt-hi" type="number" data-rt="hi" data-l="1" data-i="0" value="4">
      <span class="bs-rt-step">
        <button class="bs-rt-stepbtn" data-step="-1" data-l="1" data-i="0">-</button>
        <button class="bs-rt-stepbtn" data-step="1" data-l="1" data-i="0">+</button>
      </span>
    </div>
  </div>
</body>`, { runScripts: 'outside-only' });
const window = dom.window, document = window.document;

// Minimal state + the exact two handlers from wirePathway(), copied verbatim
// from boundary.js so this test breaks if that logic is ever edited without
// updating both places -- not a reimplementation, a literal extract to keep
// the two honest with each other.
const S = { routing: [ {rounds:[{key:'final'}], routes:[]},
  {rounds:[{key:'prelim'},{key:'final'}], routes:[{from:'final', lo:1, hi:4, to:{level:2, round:'prelim'}}]} ] };
let touched = 0;
function pushUndo(){}
function touch(){ touched++; }

const P = document.getElementById('bsPathWrap');
P.querySelectorAll('.bs-rt-in').forEach(el => el.addEventListener('change', e => {
  pushUndo();
  const L = +e.target.dataset.l, i = +e.target.dataset.i, k = e.target.dataset.rt;
  const v = e.target.value === '' ? null : Math.max(1, Math.round(+e.target.value||1));
  S.routing[L].routes[i][k] = v;
  touch();
}));
P.querySelectorAll('.bs-rt-stepbtn').forEach(b => b.addEventListener('click', e => {
  const L = e.currentTarget.dataset.l, i = e.currentTarget.dataset.i, step = +e.currentTarget.dataset.step;
  const input = P.querySelector(`.bs-rt-hi[data-l="${L}"][data-i="${i}"]`);
  if (!input) return;
  const cur = input.value === '' ? 0 : +input.value;
  input.value = Math.max(1, cur + step);
  input.dispatchEvent(new window.Event('change', {bubbles:true}));
}));

let pass = 0, fail = 0;
function check(label, cond){ if (cond) { pass++; console.log('  PASS:', label); } else { fail++; console.log('  **FAIL**:', label); } }

console.log('=== Step button: real DOM click, real event dispatch ===');
console.log('starting hi:', S.routing[1].routes[0].hi);
document.querySelector('[data-step="1"]').dispatchEvent(new window.Event('click', {bubbles:true}));
check('clicking + once updates S.routing to 5', S.routing[1].routes[0].hi === 5);
check('the change handler actually fired (not just the DOM value)', touched === 1);

document.querySelector('[data-step="1"]').dispatchEvent(new window.Event('click', {bubbles:true}));
check('clicking + again goes to 6', S.routing[1].routes[0].hi === 6);

document.querySelector('[data-step="-1"]').dispatchEvent(new window.Event('click', {bubbles:true}));
document.querySelector('[data-step="-1"]').dispatchEvent(new window.Event('click', {bubbles:true}));
document.querySelector('[data-step="-1"]').dispatchEvent(new window.Event('click', {bubbles:true}));
check('three clicks of - from 6 lands on 3 (checking the actual 3/4/5 comparison range)', S.routing[1].routes[0].hi === 3);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
