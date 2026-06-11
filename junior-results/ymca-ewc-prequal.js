/*
  YMCA E/W/C Prequalification Overlay
  -----------------------------------
  Source: uploaded "Prequalfied to EWC Prelims.xlsx" / 2026 YMCA National Diving Champions.

  Each listed athlete is the YMCA national event champion in the listed event(s).
  By rule workflow for this app: YMCA champions are prequalified to E/W/C
  preliminaries in their respective event(s), act like HPS/non-displacing
  athletes for those event(s), and do not consume an advancement spot.
*/
(function installYmcaEwcPrequal(){
  const CHAMPIONS = [
    {name:'Jhoset Quintero', diveMeetsId:'42164', gender:'Boys', ageGroup:'Group D', events:['1M','Platform']},
    {name:'Aidan Turner', diveMeetsId:'42115', gender:'Boys', ageGroup:'Group D', events:['3M']},
    {name:'Jeslynn Fang', diveMeetsId:'42007', gender:'Girls', ageGroup:'Group D', events:['1M']},
    {name:'Alex Birrer', diveMeetsId:'42153', gender:'Girls', ageGroup:'Group D', events:['3M']},
    {name:'Diya Firtel', diveMeetsId:'42320', gender:'Girls', ageGroup:'Group D', events:['Platform']},
    {name:'Levi Berlyn', diveMeetsId:'41581', gender:'Boys', ageGroup:'Group C', events:['1M']},
    {name:'Haskell Fagan', diveMeetsId:'41797', gender:'Boys', ageGroup:'Group C', events:['3M','Platform']},
    {name:'Sadie Marks', diveMeetsId:'41894', gender:'Girls', ageGroup:'Group C', events:['1M','3M']},
    {name:'Katerina Akimov', diveMeetsId:'41650', gender:'Girls', ageGroup:'Group C', events:['Platform']},
    {name:'Arthur Palladino', diveMeetsId:'41274', gender:'Boys', ageGroup:'Group B', events:['1M','3M','Platform']},
    {name:'Alden Charette', diveMeetsId:'40695', gender:'Girls', ageGroup:'Group B', events:['1M','3M','Platform']},
    {name:'Ezekiel Raybourn', diveMeetsId:'39693', gender:'Boys', ageGroup:'Group A', events:['1M']},
    {name:'Andres Winterman', diveMeetsId:'40239', gender:'Boys', ageGroup:'Group A', events:['3M','Platform']},
    {name:'Avaleigh Westfall', diveMeetsId:'39599', gender:'Girls', ageGroup:'Group A', events:['1M','3M','Platform']},
  ];

  window.USAD_YMCA_EWC_CHAMPIONS = CHAMPIONS;

  function norm(v){ return String(v == null ? '' : v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function board(v){
    const s = norm(v);
    if (s.includes('platform') || s.includes('tower')) return 'Platform';
    if (s.includes('3m') || s.includes('3 meter') || s.includes('3 metre')) return '3M';
    if (s.includes('1m') || s.includes('1 meter') || s.includes('1 metre')) return '1M';
    return '';
  }
  function genderOf(row){
    const s = String(row.gender || row.eventName || row.eventKey || '').toLowerCase();
    if (s.includes('girl') || s === 'f' || s === 'female') return 'Girls';
    if (s.includes('boy') || s === 'm' || s === 'male') return 'Boys';
    return '';
  }
  function ageGroupOf(row){
    const s = String(row.ageGroup || row.eventName || row.eventKey || '');
    if (/group\s*a/i.test(s)) return 'Group A';
    if (/group\s*b/i.test(s)) return 'Group B';
    if (/group\s*c/i.test(s)) return 'Group C';
    if (/group\s*d/i.test(s)) return 'Group D';
    return '';
  }
  function championForRow(row){
    const id = String(row.diveMeetsId || row.athleteId || '').trim();
    const name = norm(row.athlete || row.athleteName || row.name || '');
    const b = board(row.discipline || row.eventName || row.eventKey || row.apparatus || '');
    const g = genderOf(row);
    const ag = ageGroupOf(row);
    return CHAMPIONS.find(c =>
      (id && id === c.diveMeetsId || (!id && name && norm(c.name) === name)) &&
      (!b || c.events.includes(b)) &&
      (!g || g === c.gender) &&
      (!ag || ag === c.ageGroup)
    ) || null;
  }
  function championByRecord(record, headers){
    const get = k => Array.isArray(record) ? record[headers.indexOf(k)] : record[k];
    const id = String(get('diveMeetsId') || '').trim();
    const name = norm(get('name') || '');
    return CHAMPIONS.find(c => id && id === c.diveMeetsId || (!id && name && norm(c.name) === name));
  }
  function addUnique(list, value){
    if (!Array.isArray(list)) list = [];
    const v = String(value || '').trim();
    if (v && !list.includes(v)) list.push(v);
    return list;
  }
  function stripYmcaReason(text){
    return String(text || '').split('|').map(s=>s.trim()).filter(s => s && !/YMCA/i.test(s)).join(' | ');
  }
  function setRecordField(record, headers, key, value){
    if (Array.isArray(record)) {
      let idx = headers.indexOf(key);
      if (idx === -1) { headers.push(key); idx = headers.length - 1; }
      record[idx] = value;
    } else {
      record[key] = value;
    }
  }
  function getRecordField(record, headers, key){
    return Array.isArray(record) ? record[headers.indexOf(key)] : record[key];
  }
  function championRecord(c){
    const events = c.events.map(e => `${c.ageGroup} ${c.gender} ${e}`).join('; ');
    return {
      category:'YMCA', name:c.name, lastName:c.name.split(' ').slice(1).join(' '), firstName:c.name.split(' ')[0],
      gender:c.gender === 'Girls' ? 'F' : 'M', ageGroup:`${c.ageGroup} ${c.gender}`,
      regions:'', zones:'A; B; C; D; E; F', ewc:'', knownEvents:events, declaredEvents:events,
      team:'', diveMeetsId:c.diveMeetsId, usaDivingId:'', statusSource:'2026 YMCA National Diving Champion',
      athleteType:'YMCA event champion', hps:false, ymca:true, foreignDeclared:false,
      dualDeclared:false, dualOtherCountry:false, approval:'Prequalified to E/W/C preliminaries - YMCA event champion',
      review:''
    };
  }
  function ensureStatusRecords(){
    const source = window.USAD_JUNIOR_ATHLETE_STATUS || (window.USAD_JUNIOR_ATHLETE_STATUS = {meta:{},headers:[],records:[]});
    source.headers = Array.isArray(source.headers) && source.headers.length ? source.headers : [
      'category','name','lastName','firstName','gender','ageGroup','regions','zones','ewc','knownEvents','declaredEvents','team','diveMeetsId','usaDivingId','statusSource','athleteType','hps','ymca','foreignDeclared','dualDeclared','dualOtherCountry','approval','review'
    ];
    source.records = Array.isArray(source.records) ? source.records : [];
    const headers = source.headers;
    CHAMPIONS.forEach(c => {
      let rec = source.records.find(r => championByRecord(r, headers) === c);
      const events = c.events.map(e => `${c.ageGroup} ${c.gender} ${e}`).join('; ');
      if (!rec) {
        source.records.push(championRecord(c));
        return;
      }
      setRecordField(rec, headers, 'ymca', true);
      setRecordField(rec, headers, 'category', getRecordField(rec, headers, 'category') || 'YMCA');
      setRecordField(rec, headers, 'athleteType', getRecordField(rec, headers, 'athleteType') || 'YMCA event champion');
      setRecordField(rec, headers, 'statusSource', [getRecordField(rec, headers, 'statusSource'), '2026 YMCA National Diving Champion'].filter(Boolean).join(' | '));
      setRecordField(rec, headers, 'knownEvents', [getRecordField(rec, headers, 'knownEvents'), events].filter(Boolean).join('; '));
      setRecordField(rec, headers, 'declaredEvents', [getRecordField(rec, headers, 'declaredEvents'), events].filter(Boolean).join('; '));
      setRecordField(rec, headers, 'diveMeetsId', getRecordField(rec, headers, 'diveMeetsId') || c.diveMeetsId);
      setRecordField(rec, headers, 'approval', [getRecordField(rec, headers, 'approval'), 'Prequalified to E/W/C preliminaries - YMCA event champion'].filter(Boolean).join(' | '));
    });
    source.meta = source.meta || {};
    source.meta.ymcaEwcPrelimSource = 'Prequalfied to EWC Prelims.xlsx';
    source.meta.summary = source.meta.summary || {};
    source.meta.summary.ymca = CHAMPIONS.length;
    source.meta.summary.ymcaEventChampionEvents = CHAMPIONS.reduce((sum,c)=>sum+c.events.length,0);
    source.meta.summary.ymcaRule = 'YMCA event champions are E/W/C prelim prequalified in their respective event(s) and non-displacing.';
  }
  function patchApplyOverrides(){
    if (typeof applyOverrides !== 'function' || applyOverrides.__ymcaEwcPrequalPatch) return false;
    const originalApplyOverrides = applyOverrides;
    applyOverrides = function ymcaEwcApplyOverrides(row, lookup){
      const r = originalApplyOverrides(row, lookup);
      const championAthlete = CHAMPIONS.find(c => (r.diveMeetsId && String(r.diveMeetsId).trim() === c.diveMeetsId) || (!r.diveMeetsId && norm(r.athlete) === norm(c.name)));
      const match = championForRow(r);
      if (championAthlete) {
        // YMCA prequalification is event-specific. Do not paint every row for that athlete.
        r.ymca = Boolean(match);
      }
      if (match) {
        r.ymcaChampionEvents = match.events.slice();
        r.ymcaPrequalifiedEvent = board(r.discipline || r.eventName || r.eventKey || r.apparatus || '');
        r.prequalified = true;
        r.prequalification = addUnique(r.prequalification, 'E/W/C prelims: YMCA event champion');
        r.nonDisplacingReason = stripYmcaReason(r.nonDisplacingReason);
        r.nonDisplacingReason = [r.nonDisplacingReason, 'YMCA champion - E/W/C prelim prequalified'].filter(Boolean).join(' | ');
        r.nonDisplacing = true;
        r.countsTowardCutoff = false;
        r.sourceReviewNotes = addUnique(r.sourceReviewNotes, 'YMCA event champion: prequalified to E/W/C prelims in this event; non-displacing for advancement spots.');
      } else if (championAthlete && !r.hps) {
        r.prequalification = Array.isArray(r.prequalification) ? r.prequalification.filter(x => !/YMCA/i.test(x)) : [];
        r.prequalified = Boolean(r.hps);
        r.nonDisplacingReason = stripYmcaReason(r.nonDisplacingReason);
        r.nonDisplacing = Boolean(r.nonDisplacingReason || r.foreignDeclared || r.webpointNonUsEffective || r.dualOtherCountry || r.hps);
        r.countsTowardCutoff = Boolean(r.qualifyingEvent && !r.nonDisplacing && !r.prequalified && r.placeNumber != null);
      }
      return r;
    };
    applyOverrides.__ymcaEwcPrequalPatch = true;
    if (typeof recompute === 'function') {
      recompute();
      if (typeof renderAll === 'function') renderAll();
    }
    return true;
  }
  function buildIntegrityReport(){
    const results = Array.isArray(window.JUNIOR_RESULTS_DATA?.results) ? window.JUNIOR_RESULTS_DATA.results : [];
    window.USAD_YMCA_EWC_INTEGRITY = CHAMPIONS.map(c => {
      const rows = results.filter(r => String(r.diveMeetsId || '').trim() === c.diveMeetsId || norm(r.athlete) === norm(c.name));
      const matchedEvents = rows.filter(r => championForRow(r)).map(r => ({stage:r.stage, zone:r.zone, event:r.eventName, meet:r.meetName}));
      return {name:c.name, diveMeetsId:c.diveMeetsId, events:c.events, foundInResults:rows.length, matchedChampionEventRows:matchedEvents.length, matchedEvents};
    });
  }

  ensureStatusRecords();
  buildIntegrityReport();
  const timer = setInterval(() => { if (patchApplyOverrides()) clearInterval(timer); }, 100);
  setTimeout(() => clearInterval(timer), 10000);
})();