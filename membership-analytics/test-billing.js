/* ==========================================================================
   REGRESSION GUARD — one fee per event per meet
   --------------------------------------------------------------------------
   An athlete pays an entry fee once per event at a meet, however many rounds
   they swim. Progressing prelim -> semi -> final costs nothing extra; it is
   the same entry.

   This is easy to get wrong in a way that looks entirely reasonable on a page,
   because every round field is a real number that belongs in the report. Only
   the BILLABLE figure may be multiplied by a fee.

   Run:  node membership-analytics/test-billing.js
   ========================================================================== */
/* One athlete, one event, one meet = one fee. However many rounds they swim. */
const fs=require('fs'); const {JSDOM}=require('jsdom');
const w=new JSDOM('',{runScripts:'outside-only'}).window;
w.eval(fs.readFileSync('routing.js','utf8'));
const R=w.QualRouting;
const C=['AG1'];   // a single event, so every number is a headcount

// One stop per level. 100 athletes enter the Zone.
const seed=[{AG1:100}];
const gc=()=>1, go=()=>0;

console.log('=== a championship with prelims, semis and finals ===');
const routing=[
 {rounds:[{key:'final'}],  routes:[{from:'final', lo:1,hi:40,to:{level:1,round:'prelim'}}]},
 {rounds:[{key:'prelim'},{key:'semi'},{key:'final'}], routes:[
   {from:'prelim',lo:1,hi:24,to:{level:1,round:'semi'}},
   {from:'semi',  lo:1,hi:12,to:{level:1,round:'final'}}]},
];
const res=R.project({routing,entries0:seed,groupCount:gc,groupOf:go,cells:C});
console.log('  Zone final field      :', R.sizeAt(res,0,'final',C));
console.log('  Champs prelim field   :', R.sizeAt(res,1,'prelim',C));
console.log('  Champs semi field     :', R.sizeAt(res,1,'semi',C), ' <- the SAME people, second round');
console.log('  Champs final field    :', R.sizeAt(res,1,'final',C), ' <- the SAME people, third round');
const sumRounds=40+24+12;
const billed=R.billableEntries(res,1,C,seed).AG1;
console.log();
console.log('  sum of the three rounds:', sumRounds, ' <- what a naive count would charge');
console.log('  billable entries       :', billed, ' <- what is actually charged');
console.log('  correct?               :', billed===40 ? 'PASS - the 40 who entered pay once each'
                                                      : 'FAIL - got '+billed);
console.log('  over-charge avoided    :', sumRounds-billed, 'entries');

console.log('\n=== and it still charges a NEW meet ===');
const r2=[
 {rounds:[{key:'final'}],routes:[{from:'final',lo:1,hi:40,to:{level:1,round:'prelim'}}]},
 {rounds:[{key:'prelim'},{key:'final'}],routes:[
   {from:'prelim',lo:1,hi:8, to:{level:2,round:'semi'}},     // straight to the champs semis
   {from:'prelim',lo:9,hi:24,to:{level:1,round:'final'}},    // stay here for finals
   {from:'final', lo:1,hi:8, to:{level:2,round:'prelim'}}]}, // then on to the champs
 {rounds:[{key:'prelim'},{key:'semi'},{key:'final'}],routes:[
   {from:'prelim',lo:1,hi:12,to:{level:2,round:'semi'}},
   {from:'semi',  lo:1,hi:12,to:{level:2,round:'final'}}]},
];
const res2=R.project({routing:r2,entries0:seed,groupCount:gc,groupOf:go,cells:C});
[[1,'prelim'],[1,'final'],[2,'prelim'],[2,'semi'],[2,'final']].forEach(([L,r])=>
  console.log(`  L${L} ${r.padEnd(7)} field ${R.sizeAt(res2,L,r,C)}`));
const b1=R.billableEntries(res2,1,C,seed).AG1, b2=R.billableEntries(res2,2,C,seed).AG1;
console.log();
console.log('  billed at the middle stop :', b1, '(the 40 who arrived)');
console.log('  billed at the champs      :', b2, '= 8 who came straight to the semis + 8 via the finals');
console.log('  correct?                  :', b1===40 && b2===16 ? 'PASS' : 'FAIL');
console.log('  a diver who swims champs prelim, semi AND final is counted:',
  (R.sizeAt(res2,2,'prelim',C)+R.sizeAt(res2,2,'semi',C)+R.sizeAt(res2,2,'final',C)) - b2,
  'times too many if you add rounds');

console.log('\n=== revenue uses the billable figure, not the rounds ===');
const rev=R.revenue(res2,C,seed,{fees:[{qual:90,non:0},{qual:115,non:0},{qual:125,non:0}],levy:4.90});
rev.perLevel.forEach(p=>console.log(`  level ${p.level}: ${p.entries} entries x fee = $${Math.round(p.gross)}`));
console.log('  champs gross           : $'+Math.round(rev.perLevel[2].gross), '=', b2, 'x $125 =', b2*125,
            rev.perLevel[2].gross===b2*125?'PASS':'FAIL');
