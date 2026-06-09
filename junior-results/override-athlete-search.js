/*
  Junior override drawer athlete search
  -------------------------------------
  Lets staff type an athlete name instead of looking up a DiveMeets ID. Selecting
  a match fills the name and ID, shows event context, and applies not-attending
  overrides at athlete level across all events.
*/
(function installOverrideAthleteSearch(){
  function byId(id){ return document.getElementById(id); }
  function safe(v){ return String(v == null ? '' : v); }
  function html(v){ return safe(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function norm(v){ return safe(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function isQualified(r){ return Boolean(r.advancesToNationals || r.advancesToEWC || r.advancesToZone || r.officialQualified); }

  let selected = null;

  function athleteIndex(){
    if (!Array.isArray(effectiveResults)) return [];
    const map = new Map();
    effectiveResults.forEach(r => {
      if (!r || !r.athlete) return;
      const key = safe(r.diveMeetsId).trim() || norm(r.athlete);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: r.athlete,
          id: safe(r.diveMeetsId).trim(),
          team: r.team || '',
          stages: new Set(),
          zones: new Set(),
          events: [],
          qualified: 0,
          notAttending: false,
          foreign: false,
          dual: false,
          hps: false,
          ymca: false,
        });
      }
      const a = map.get(key);
      if (!a.id && r.diveMeetsId) a.id = safe(r.diveMeetsId).trim();
      if (!a.team && r.team) a.team = r.team;
      if (r.stage) a.stages.add(r.stage);
      if (r.zone) a.zones.add(r.zone);
      if (!a.events.some(e => e.id === r.eventId)) {
        a.events.push({ id:r.eventId, name:r.eventName || '', stage:r.stage || '', zone:r.zone || '', ewc:r.ewc || '', place:r.place || '', rank:r.eligibleRank || r.countingRank || '', status:r.qualificationStatus || '' });
      }
      if (isQualified(r)) a.qualified += 1;
      if (r.declaredNotAttending) a.notAttending = true;
      if (r.foreignDeclared || r.webpointNonUsEffective || r.exhibitionLikelyForeign) a.foreign = true;
      if (r.dualDeclared) a.dual = true;
      if (r.hps) a.hps = true;
      if (r.ymca) a.ymca = true;
    });
    return [...map.values()].sort((a,b) => a.name.localeCompare(b.name));
  }

  function scoreMatch(a, q){
    const n = norm(a.name);
    const id = norm(a.id);
    const team = norm(a.team);
    if (!q) return 0;
    if (n === q || id === q) return 100;
    if (n.startsWith(q) || id.startsWith(q)) return 80;
    if (n.includes(q) || id.includes(q)) return 60;
    const parts = q.split(' ').filter(Boolean);
    if (parts.length && parts.every(p => n.includes(p))) return 50;
    if (team.includes(q)) return 20;
    return 0;
  }

  function resultsForQuery(q){
    const clean = norm(q);
    if (clean.length < 2) return [];
    return athleteIndex()
      .map(a => ({...a, _score:scoreMatch(a, clean)}))
      .filter(a => a._score > 0)
      .sort((a,b) => b._score - a._score || b.qualified - a.qualified || a.name.localeCompare(b.name))
      .slice(0, 10);
  }

  function statusTags(a){
    const tags = [];
    if (a.qualified) tags.push(`${a.qualified} qualifying row${a.qualified === 1 ? '' : 's'}`);
    if (a.foreign) tags.push('foreign');
    if (a.dual) tags.push('dual');
    if (a.hps) tags.push('HPS');
    if (a.ymca) tags.push('YMCA');
    if (a.notAttending) tags.push('already not attending');
    return tags;
  }

  function eventPreview(a){
    const preferred = a.events.filter(e => state && (e.stage === state.stage || (state.stage === 'EWC' && e.stage === 'East/West/Central')));
    const list = (preferred.length ? preferred : a.events).slice(0, 4);
    return list.map(e => [e.stage, e.zone ? `Zone ${e.zone}` : '', e.name, e.place ? `#${e.place}` : '', e.status].filter(Boolean).join(' · ')).join(' | ');
  }

  function ensureUi(){
    const name = byId('overrideAthleteName');
    const id = byId('overrideAthleteId');
    if (!name || !id || byId('overrideAthleteSearchPanel')) return;
    name.setAttribute('autocomplete','off');
    name.placeholder = 'Start typing athlete name, team, or ID';
    id.placeholder = 'Auto-fills from selected athlete';
    id.readOnly = false;
    const panel = document.createElement('div');
    panel.id = 'overrideAthleteSearchPanel';
    panel.className = 'override-athlete-search-panel';
    panel.innerHTML = '<div class="oas-help">Type a name and select the athlete. DiveMeets ID and event context will fill automatically.</div><div id="overrideAthleteMatches" class="oas-matches"></div><div id="overrideAthletePicked" class="oas-picked" hidden></div>';
    name.closest('.form-field').insertAdjacentElement('afterend', panel);
  }

  function renderMatches(items){
    ensureUi();
    const box = byId('overrideAthleteMatches');
    const picked = byId('overrideAthletePicked');
    if (!box) return;
    if (!items.length) {
      box.innerHTML = '<div class="oas-empty">No athlete matches yet. Keep typing, or enter the name manually.</div>';
      if (picked) picked.hidden = !selected;
      return;
    }
    box.innerHTML = items.map((a,i) => `
      <button type="button" class="oas-match" data-idx="${i}">
        <span class="oas-main"><strong>${html(a.name)}</strong><em>${html([a.id ? 'DM '+a.id : 'No ID', a.team].filter(Boolean).join(' · '))}</em></span>
        <span class="oas-meta">${html([...a.stages].join(', '))}${a.zones.size ? ' · '+html([...a.zones].map(z=>'Zone '+z).join(', ')) : ''}</span>
        <span class="oas-tags">${statusTags(a).map(t=>`<b>${html(t)}</b>`).join('')}</span>
        <span class="oas-events">${html(eventPreview(a))}</span>
      </button>`).join('');
    box.querySelectorAll('.oas-match').forEach(btn => btn.addEventListener('click', () => selectAthlete(items[Number(btn.dataset.idx)])));
  }

  function selectAthlete(a){
    selected = a;
    const name = byId('overrideAthleteName');
    const id = byId('overrideAthleteId');
    if (name) name.value = a.name || '';
    if (id) id.value = a.id || '';
    const picked = byId('overrideAthletePicked');
    if (picked) {
      picked.hidden = false;
      picked.innerHTML = `<strong>Selected:</strong> ${html(a.name)} ${a.id ? `<span>DM ${html(a.id)}</span>` : '<span>No DiveMeets ID</span>'}<br><em>${html(eventPreview(a) || 'No event context found')}</em>`;
    }
    const matches = byId('overrideAthleteMatches');
    if (matches) matches.innerHTML = '';
  }

  function clearSelectedIfEdited(){
    const name = byId('overrideAthleteName');
    if (!selected || !name) return;
    if (norm(name.value) !== norm(selected.name)) {
      selected = null;
      const picked = byId('overrideAthletePicked');
      if (picked) picked.hidden = true;
    }
  }

  function addOverrideFromDrawer(){
    const type = byId('overrideType')?.value || 'notAttending';
    const value = byId('overrideValue')?.value === 'true';
    const athleteId = byId('overrideAthleteId')?.value || selected?.id || '';
    const athleteName = byId('overrideAthleteName')?.value || selected?.name || '';
    if (!athleteId && !athleteName) {
      alert('Type and select an athlete, or enter a name before adding an override.');
      return;
    }
    addOverride({
      type,
      value,
      athleteId,
      athleteName,
      eventId: '',
      eventName: '',
      note: byId('overrideNote')?.value || (type === 'notAttending' ? 'Declared not attending - athlete-level' : 'Manual entry'),
    });
    const note = byId('overrideNote');
    if (note) note.value = '';
    const picked = byId('overrideAthletePicked');
    if (picked && selected) {
      picked.innerHTML = `<strong>Applied:</strong> ${html(overrideTypeLabel(type))} ${value ? 'on' : 'off'} for ${html(athleteName)}${athleteId ? ` <span>DM ${html(athleteId)}</span>` : ''}`;
      picked.hidden = false;
    }
  }

  function patchRowNotAttending(){
    const table = byId('tableWrap');
    if (!table || table.__overrideSearchRowPatch) return;
    table.__overrideSearchRowPatch = true;
    table.addEventListener('click', function(e){
      const btn = e.target.closest('button[data-row-override="notAttending"]');
      if (!btn) return;
      const row = effectiveResults.find(r => r.id === btn.dataset.rowId);
      if (!row) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      addOverride({
        type:'notAttending',
        value: btn.dataset.overrideValue === 'true',
        athleteId: row.diveMeetsId,
        athleteName: row.athlete,
        eventId:'',
        eventName:'',
        note:'Row action - athlete-level not attending',
      });
    }, true);
  }

  function install(){
    ensureUi();
    patchRowNotAttending();
    const name = byId('overrideAthleteName');
    const add = byId('addOverrideButton');
    if (name && !name.__athleteSearchInstalled) {
      name.__athleteSearchInstalled = true;
      name.addEventListener('input', () => { clearSelectedIfEdited(); renderMatches(resultsForQuery(name.value)); });
      name.addEventListener('focus', () => { if (name.value) renderMatches(resultsForQuery(name.value)); });
    }
    if (add && !add.__athleteSearchInstalled) {
      add.__athleteSearchInstalled = true;
      add.addEventListener('click', function(e){
        e.preventDefault();
        e.stopImmediatePropagation();
        addOverrideFromDrawer();
      }, true);
    }
  }

  const css = document.createElement('style');
  css.textContent = `
    .override-athlete-search-panel{grid-column:1/-1;margin-top:-8px;margin-bottom:6px;border:1px solid var(--line,#d7dcea);border-radius:14px;background:#f8fafc;padding:10px}
    .oas-help{font-size:12px;color:var(--ink-3,#647085);margin-bottom:8px;line-height:1.35}
    .oas-matches{display:grid;gap:6px;max-height:300px;overflow:auto}
    .oas-match{display:grid;grid-template-columns:minmax(170px,1.1fr) minmax(115px,.55fr);gap:4px 10px;text-align:left;border:1px solid #d7dcea;background:#fff;border-radius:12px;padding:9px 10px;color:#111827;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.04)}
    .oas-match:hover{border-color:#101b49;box-shadow:0 8px 22px rgba(15,23,42,.10)}
    .oas-main strong{display:block;font-size:14px}.oas-main em{display:block;font-style:normal;font-size:12px;color:#647085;margin-top:2px}.oas-meta{font-size:11px;color:#647085;text-align:right}.oas-tags{display:flex;gap:4px;flex-wrap:wrap}.oas-tags b{font-size:10px;text-transform:uppercase;letter-spacing:.04em;background:#e7eefc;color:#17265f;border-radius:999px;padding:3px 6px}.oas-events{grid-column:1/-1;color:#475569;font-size:11.5px;line-height:1.35}.oas-picked{font-size:12px;line-height:1.4;background:#eef6ff;border:1px solid #cfe0ff;color:#102052;border-radius:10px;padding:8px 9px}.oas-picked span{font-family:'JetBrains Mono',monospace}.oas-picked em{font-style:normal;color:#475569}.oas-empty{font-size:12px;color:#647085;padding:4px 2px}
  `;
  document.head.appendChild(css);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
  const timer = setInterval(install, 750);
  setTimeout(() => clearInterval(timer), 10000);
})();
