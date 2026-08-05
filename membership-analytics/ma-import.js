/* ==========================================================================
   USA Diving — Membership import (Webpoint export)
   --------------------------------------------------------------------------
   Loads a Webpoint membership export straight into Neon from the browser.

   WHY IN THE BROWSER
     The apps repository is PUBLIC. A Webpoint export carries home addresses,
     email addresses, phone numbers and parent contact details for a membership
     that is mostly minors. None of that can pass through GitHub, so the usual
     pattern here -- commit a file, let a workflow load it -- is not available.
     Parsing in the browser keeps the file on the machine it was downloaded to;
     only the permitted columns are ever sent, and they go straight to Neon.

   PII
     The export has 23 columns. Seven are never read: Address, Address2, email,
     Phone, Parent First Name, Parent Last Name, Parent Email. They are not
     dropped later -- they are never put into an object in the first place, so
     there is no code path that could send them. membership.members has no
     column for any of them either, so the policy is enforced twice over.

   SAFETY
     A snapshot export is the whole truth for its year, so members who have
     disappeared should disappear here too. But deleting first and inserting
     afterwards means a failure halfway through destroys the year. Instead
     every row is upserted with this run's timestamp, and only then are rows
     for that year bearing an older timestamp removed. A run that dies partway
     leaves stale rows, which is recoverable; it cannot leave an empty year.
   ========================================================================== */
(function(){
'use strict';

/* Columns we read. Anything not on this list is not parsed. */
const WANT = {
  'member id':          'member_id',
  'last name':          'last_name',
  'first name':         'first_name',
  'city':               'city',
  'state':              'state',
  'zip':                'zip',
  'country':            'country',
  'birthdate':          'birth_date',
  'mbrship start date': 'start_date',
  'mbrship exp date':   'exp_date',
  'association':        'association',
  'club':               'club',
  'membership type':    'membership_type',
  'member status':      'member_status',
};
/* Named explicitly so the screen can tell you what it refused to read. */
const REFUSED = ['Address', 'Address2', 'email', 'Phone',
                 'Parent First Name', 'Parent Last Name', 'Parent Email'];

const COLS = ['member_id','membership_year','membership_type','first_name','last_name',
              'city','state','zip','zip5','country','birth_date','start_date','exp_date',
              'association','club','member_status','loaded_at'];

const M = {file:null, rows:[], year:null, inferred:null, busy:false, result:null, err:null};

const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmt = n => Number(n||0).toLocaleString('en-US');

/* Webpoint exports are named .xls but are an HTML table. Real spreadsheets and
   CSV are accepted too so nobody has to care which they were handed. */
function parseExport(text){
  const looksHtml = /<\s*(table|tr|td)\b/i.test(text);
  const grid = looksHtml ? parseHtmlTable(text) : parseCsv(text);
  if (!grid.length) throw new Error('No rows found in that file.');
  const head = grid[0].map(h => String(h||'').trim().toLowerCase());
  const map = {};
  head.forEach((h,i) => { if (WANT[h]) map[WANT[h]] = i; });
  const missing = ['member_id','membership_type'].filter(k => map[k]==null);
  if (missing.length){
    throw new Error('That does not look like a Webpoint membership export — no ' +
                    (map.member_id==null ? 'Member ID' : 'Membership Type') + ' column.');
  }
  const out = [], seen = new Set();
  let dupes = 0;
  for (let r=1; r<grid.length; r++){
    const row = grid[r];
    if (!row || row.length < head.length) continue;
    const get = k => (map[k]==null ? '' : String(row[map[k]]==null?'':row[map[k]]).trim());
    const id = get('member_id');
    if (!id) continue;
    const type = get('membership_type');
    const key = id + '|' + type;
    if (seen.has(key)){ dupes++; continue; }   // same member, same type, twice
    seen.add(key);
    const zip = get('zip');
    out.push({
      member_id: id, membership_type: type,
      first_name: get('first_name'), last_name: get('last_name'),
      city: get('city'), state: get('state'),
      zip: zip, zip5: zip.replace(/[^0-9]/g,'').slice(0,5),
      country: get('country'),
      birth_date: usDate(get('birth_date')),
      start_date: usDate(get('start_date')),
      exp_date:   usDate(get('exp_date')),
      association: get('association'), club: get('club'),
      member_status: get('member_status'),
    });
  }
  return {rows: out, dupes, headers: grid[0].map(h=>String(h||'').trim())};
}

function parseHtmlTable(text){
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return Array.from(doc.querySelectorAll('tr')).map(tr =>
    Array.from(tr.querySelectorAll('td,th')).map(td => td.textContent.trim()));
}
function parseCsv(text){
  const rows = []; let row = [], cur = '', q = false;
  for (let i=0;i<text.length;i++){
    const c = text[i];
    if (q){
      if (c === '"'){ if (text[i+1] === '"'){ cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ','){ row.push(cur); cur = ''; }
    else if (c === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r => r.length > 1);
}

/* Webpoint writes M/D/YYYY. Anything else is left alone for Postgres to judge. */
function usDate(s){
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (m) return `${m[3]}-${String(m[1]).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  return iso ? iso[0] : null;
}

/* Which membership year is this? Expiry is the reliable signal, but Lifetime
   memberships expire in the next century and would drag any average with them,
   so take the most common non-Lifetime expiry year. Never silently: the value
   is shown and can be overridden, because loading 2026 as 2025 would be far
   worse than asking. */
function inferYear(rows){
  const c = {};
  rows.forEach(r => {
    if (!r.exp_date) return;
    const y = +r.exp_date.slice(0,4);
    if (y > 2100) return;
    c[y] = (c[y]||0) + 1;
  });
  let best = null, n = 0;
  for (const y in c) if (c[y] > n){ n = c[y]; best = +y; }
  return best;
}

function summarise(rows){
  const types = {}, status = {}, ids = new Set();
  rows.forEach(r => {
    types[r.membership_type] = (types[r.membership_type]||0)+1;
    status[r.member_status||'(none)'] = (status[r.member_status||'(none)']||0)+1;
    ids.add(r.member_id);
  });
  return {types, status, members: ids.size};
}

/* ---------- writing ---------- */
async function load(){
  if (M.busy || !M.rows.length || !M.year) return;
  M.busy = true; M.err = null; M.result = null; render();
  const stamp = new Date().toISOString();
  try {
    const before = await countYear(M.year);
    const B = 120;                       // ~2k parameters per statement
    let written = 0;
    for (let i=0; i<M.rows.length; i+=B){
      const chunk = M.rows.slice(i, i+B);
      const vals = [], params = [];
      chunk.forEach(r => {
        const base = params.length;
        vals.push('(' + COLS.map((_,j)=>'$'+(base+j+1)).join(',') + ')');
        params.push(r.member_id, M.year, r.membership_type, r.first_name, r.last_name,
                    r.city, r.state, r.zip, r.zip5, r.country, r.birth_date,
                    r.start_date, r.exp_date, r.association, r.club, r.member_status, stamp);
      });
      await NEON.query(
        `INSERT INTO membership.members (${COLS.join(',')}) VALUES ${vals.join(',')}
         ON CONFLICT (member_id, membership_year, membership_type) DO UPDATE SET
           first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name,
           city=EXCLUDED.city, state=EXCLUDED.state, zip=EXCLUDED.zip, zip5=EXCLUDED.zip5,
           country=EXCLUDED.country, birth_date=EXCLUDED.birth_date,
           start_date=EXCLUDED.start_date, exp_date=EXCLUDED.exp_date,
           association=EXCLUDED.association, club=EXCLUDED.club,
           member_status=EXCLUDED.member_status, loaded_at=EXCLUDED.loaded_at`, params);
      written += chunk.length;
      M.progress = written; render();
    }
    // Only now, with every row safely in, remove what this export no longer contains.
    const gone = await NEON.query(
      `DELETE FROM membership.members
       WHERE membership_year=$1 AND (loaded_at IS NULL OR loaded_at < $2)
       RETURNING member_id`, [M.year, stamp]);
    const after = await countYear(M.year);
    M.result = {before, after, written, removed: (gone.rows||[]).length, stamp};
  } catch(e){
    console.error(e);
    M.err = String(e && e.message || e);
  }
  M.busy = false; M.progress = 0; render();
}

async function countYear(y){
  try {
    const r = await NEON.query(
      `SELECT count(*)::int n FROM membership.members WHERE membership_year=$1`, [y]);
    return +(r.rows[0] || {}).n || 0;
  } catch(e){ return null; }
}

/* ---------- ui ---------- */
function render(){
  const host = document.getElementById('miCard');
  if (!host) return;
  const s = M.rows.length ? summarise(M.rows) : null;

  const preview = !s ? '' : `
    <div class="mi-grid">
      <div class="mi-stat"><b>${fmt(M.rows.length)}</b><span>rows to load</span></div>
      <div class="mi-stat"><b>${fmt(s.members)}</b><span>distinct members</span></div>
      <div class="mi-stat"><b>${fmt(Object.keys(s.types).length)}</b><span>membership types</span></div>
      <div class="mi-stat"><b>${esc(M.file||'')}</b><span>file</span></div>
    </div>
    <div class="mi-inline">
      <label>Membership year
        <input class="mi-in" type="number" min="2000" max="2100" id="miYear" value="${M.year||''}"></label>
      <span class="note">${M.inferred
        ? `Read as <b>${M.inferred}</b> from the most common expiry year, ignoring Lifetime memberships. Change it if that is wrong &mdash; loading a year over the top of another cannot be undone from here.`
        : 'Could not read a year from the file. Set it before loading.'}</span>
    </div>
    <details class="mi-det"><summary>What will be written, and what will not</summary>
      <p class="note"><b>Not read at all:</b> ${REFUSED.map(esc).join(', ')}. These are never
      parsed into memory, and <span class="mono">membership.members</span> has no column for any
      of them, so there is no path by which they could reach the database.</p>
      <table class="mi-tbl"><thead><tr><th>Membership type</th><th class="num">Rows</th></tr></thead>
        <tbody>${Object.entries(s.types).sort((a,b)=>b[1]-a[1])
          .map(([t,n])=>`<tr><td>${esc(t)}</td><td class="num">${fmt(n)}</td></tr>`).join('')}
        <tr class="mi-tot"><td>Total</td><td class="num">${fmt(M.rows.length)}</td></tr></tbody></table>
      <table class="mi-tbl"><thead><tr><th>Member status</th><th class="num">Rows</th></tr></thead>
        <tbody>${Object.entries(s.status).sort((a,b)=>b[1]-a[1])
          .map(([t,n])=>`<tr><td>${esc(t)}</td><td class="num">${fmt(n)}</td></tr>`).join('')}</tbody></table>
    </details>
    <div class="mi-actions">
      <button class="mi-btn primary" id="miGo" ${M.busy||!M.year?'disabled':''}>
        ${M.busy ? `Loading… ${fmt(M.progress||0)} / ${fmt(M.rows.length)}` : `Load ${fmt(M.rows.length)} rows into ${M.year||'—'}`}</button>
      <button class="mi-btn" id="miClear" ${M.busy?'disabled':''}>Clear</button>
    </div>`;

  const result = !M.result ? '' : `
    <div class="mi-ok"><b>Loaded.</b> ${fmt(M.result.written)} rows written for ${M.year}.
      ${M.result.removed ? `${fmt(M.result.removed)} member row${M.result.removed===1?'':'s'} that
        this export no longer contains ${M.result.removed===1?'was':'were'} removed.` : 'Nothing needed removing.'}
      ${M.result.before!=null ? `The year held ${fmt(M.result.before)} rows before and ${fmt(M.result.after)} now.` : ''}
      Reload the page to see it flow through the rest of the tab.</div>`;

  const err = !M.err ? '' : `
    <div class="mi-err"><b>Could not load.</b> <span class="mono">${esc(M.err)}</span>
      ${/permission|denied/i.test(M.err) ? `<br><br>The browser's database login can read this table but not write to it.
        Paste this into the Neon SQL editor &mdash; SQL only, no surrounding text:<br>
        <code class="mi-code">GRANT INSERT, UPDATE, DELETE ON membership.members TO usad_app;</code>` : ''}</div>`;

  host.innerHTML = `
    <div class="card"><div class="card-h">
      <h3>Load a Webpoint export</h3>
      <div class="note">Reads the membership export straight from your machine into the database.
        The file is never uploaded anywhere else.</div>
    </div><div class="card-b">
      <div class="mi-drop" id="miDrop">
        <input type="file" id="miFile" accept=".xls,.xlsx,.htm,.html,.csv,.txt">
        <span>Choose the export, or drag it here</span>
      </div>
      ${preview}${result}${err}
    </div></div>`;
  wire();
}

function wire(){
  const f = document.getElementById('miFile');
  if (f) f.addEventListener('change', e => { if (e.target.files[0]) take(e.target.files[0]); });
  const d = document.getElementById('miDrop');
  if (d){
    d.addEventListener('dragover', e => { e.preventDefault(); d.classList.add('on'); });
    d.addEventListener('dragleave', () => d.classList.remove('on'));
    d.addEventListener('drop', e => {
      e.preventDefault(); d.classList.remove('on');
      if (e.dataTransfer.files[0]) take(e.dataTransfer.files[0]);
    });
  }
  const y = document.getElementById('miYear');
  if (y) y.addEventListener('change', e => { M.year = +e.target.value || null; render(); });
  const go = document.getElementById('miGo');   if (go) go.addEventListener('click', load);
  const cl = document.getElementById('miClear');
  if (cl) cl.addEventListener('click', () => {
    M.file=null; M.rows=[]; M.year=null; M.inferred=null; M.result=null; M.err=null; render();
  });
}

function take(file){
  M.file = file.name; M.err = null; M.result = null;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const p = parseExport(String(fr.result));
      M.rows = p.rows;
      M.inferred = inferYear(p.rows);
      M.year = M.inferred;
      if (p.dupes) console.warn('duplicate member+type rows skipped:', p.dupes);
    } catch(e){ M.rows = []; M.err = String(e && e.message || e); }
    render();
  };
  fr.onerror = () => { M.err = 'Could not read that file.'; render(); };
  fr.readAsText(file);
}

window.renderMemberImport = render;
window.__MEMIMPORT = {M, parseExport, usDate, inferYear, summarise, WANT, REFUSED};

})();
