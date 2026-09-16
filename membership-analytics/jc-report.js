/* Membership Analytics -> Reports -> Comparison reports.
 *
 * The Junior Circuit Comparison Report, generated inside the app from the same
 * code the server tools and the data checks use (shared/jc/). A report
 * definition is only a recipe -- which columns to compare, what to call them,
 * which sections to show. Every figure is recomputed from live data each time.
 *
 * The built-in definition is read-only. "Duplicate" makes an editable copy
 * saved to membership.report_definitions.
 *
 * Labeling rule for every count: the unit (event entries = one athlete in one
 * event; unique athletes = each person once) and the status (actual,
 * projected, modeled). Ranges state their reason.
 */
import './jc-browser.js';
import { buildJuniorCircuitReport, JC_BUILTIN, JC_SECTIONS, JC_REPORT_KIND } from '../shared/jc/report.js';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v) => (v == null || !Number.isFinite(+v) ? '—' : Math.round(+v).toLocaleString('en-US'));
const usd = (v) => (v == null || !Number.isFinite(+v) ? '—' : (v < 0 ? '−$' : '$') + Math.abs(Math.round(+v)).toLocaleString('en-US'));
const fee = (v) => (typeof v === 'number' ? '$' + (Number.isInteger(v) ? v : v.toFixed(2)) : esc(v || '—'));
const pct = (v, d = 1) => (v == null || !Number.isFinite(+v) ? '—' : (+v).toFixed(d) + '%');
const signPct = (a, b) => (b ? ((a - b) / b * 100 >= 0 ? '+' : '−') + Math.abs((a - b) / b * 100).toFixed(1) + '%' : '—');

const STATUS = { projected: 'projected', actual: 'actual', modeled: 'modeled' };
const STAGE = { Regions: 'Regionals', Nationals: 'Junior Nationals', National: 'Junior Nationals', 'E / W / C': 'East, West, Central' };
const stage = (s) => STAGE[s] || s;
const COHORTS = ['AB', 'AG', 'BB', 'BG', 'CB', 'CG', 'DB', 'DG'];
const GROUP = { A: 'Group A (16–18)', B: 'Group B (14–15)', C: 'Group C (12–13)', D: 'Group D (11 & under)' };
const GENDER = { B: 'boys', G: 'girls', '?': 'gender not on file' };
const cohortName = (k) => `${GROUP[k[0]]} ${GENDER[k[1]]}`;
const MEMBER_YEARS = [2024, 2025, 2026];

const JC = { defs: [], scenarios: [], loadErr: null, editing: null, msg: '' };

/* ------------------------------------------------------------ storage */

async function sql(text, params) { return (await window.NEON.query(text, (params || []).map((p) => (p == null ? null : String(p))))).rows; }

async function loadLists() {
  JC.loadErr = null;
  try {
    const rows = await sql(`SELECT id, name, config, updated_at FROM membership.report_definitions WHERE kind=$1 ORDER BY updated_at DESC`, [JC_REPORT_KIND]);
    JC.defs = rows.map((r) => ({ id: r.id, name: r.name, config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config, updatedAt: r.updated_at }));
  } catch (e) { JC.defs = []; JC.loadErr = String(e && e.message || e); }
  try {
    JC.scenarios = await sql(`SELECT id, name FROM membership.boundary_scenarios ORDER BY updated_at DESC LIMIT 200`);
  } catch (e) { JC.scenarios = []; }
}

async function saveDef(def) {
  await sql(`INSERT INTO membership.report_definitions (id, name, kind, config) VALUES ($1,$2,$3,$4::jsonb)
    ON CONFLICT (id) DO UPDATE SET name=$2, config=$4::jsonb, updated_at=now()`,
  [def.id, def.name.trim(), JC_REPORT_KIND, JSON.stringify(def.config)]);
}
async function deleteDef(id) { await sql(`DELETE FROM membership.report_definitions WHERE id=$1 AND kind=$2`, [id, JC_REPORT_KIND]); }

const newId = () => 'rd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
const clone = (o) => JSON.parse(JSON.stringify(o));
const allDefs = () => [JC_BUILTIN, ...JC.defs];
const findDef = (id) => allDefs().find((d) => d.id === id);

/* ------------------------------------------------------------ picker / editor */

function modal() {
  let m = document.getElementById('mr-modal');
  if (!m) { m = document.createElement('div'); m.id = 'mr-modal'; document.body.appendChild(m); }
  return m;
}
function close() { const m = document.getElementById('mr-modal'); if (m) m.remove(); JC.editing = null; }

function colSummary(c) {
  if (c.type === 'scenario') {
    const s = JC.scenarios.find((x) => x.id === c.scenarioId);
    return `${esc(c.label)} <span class="mr-soft">— saved scenario ${esc(s ? s.name : c.scenarioId)} · projected</span>`;
  }
  return `${esc(c.label)} <span class="mr-soft">— ${+c.year === 2026 ? 'actual 2026 results' : 'modeled on real 2025 entries'}</span>`;
}

function renderList() {
  const m = modal();
  const row = (d) => `
    <div class="mr-secopt" style="cursor:default;align-items:center">
      <div style="flex:1;min-width:0">
        <div class="mr-secopt-n">${esc(d.name)} ${d.builtin ? '<span class="mr-tag">Built in · read-only</span>' : ''}</div>
        <div class="mr-secopt-d">${esc(d.config.title)}${d.config.subtitle ? ' — ' + esc(d.config.subtitle) : ''}</div>
        <div class="mr-secopt-d">${d.config.columns.map(colSummary).join('<br>')}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        <button class="mr-btn mr-btn-p" onclick="window._jcGenerate('${esc(d.id)}')">Generate</button>
        <button class="mr-btn" onclick="window._jcDuplicate('${esc(d.id)}')">Duplicate</button>
        ${d.builtin ? '' : `<button class="mr-btn" onclick="window._jcEdit('${esc(d.id)}')">Edit</button>
        <button class="mr-btn" onclick="window._jcDelete('${esc(d.id)}')">Delete</button>`}
      </div>
    </div>`;
  m.innerHTML = `
  <div class="mr-overlay" onclick="if(event.target===this)window._jcClose()">
    <div class="mr-dialog" role="dialog" aria-label="Comparison reports">
      <div class="mr-head">
        <div><div class="mr-eyebrow">Reports</div><h2 class="mr-title">Comparison reports</h2>
          <div class="mr-soft">Every figure is recomputed from live data when you press Generate. A copy keeps its own columns, labels and sections.</div></div>
        <button class="mr-x" onclick="window._jcClose()" aria-label="Close">✕</button>
      </div>
      <div class="mr-body">
        ${JC.msg ? `<p class="mr-soft" style="color:#15803d;font-weight:700">${esc(JC.msg)}</p>` : ''}
        ${JC.loadErr ? `<p class="mr-soft" style="color:#b45309">${/report_definitions/.test(JC.loadErr) && /does not exist/.test(JC.loadErr)
          ? 'Saved copies are not available yet — the database table for them is still being created. The built-in report works now.'
          : 'Saved copies could not be loaded: ' + esc(JC.loadErr)}</p>` : ''}
        <div style="display:flex;flex-direction:column;gap:8px">${allDefs().map(row).join('')}</div>
      </div>
    </div>
  </div>`;
}

function renderEditor() {
  const d = JC.editing; const c = d.config;
  const scenOpts = (sel) => JC.scenarios.map((s) => `<option value="${esc(s.id)}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('')
    + (sel && !JC.scenarios.some((s) => s.id === sel) ? `<option value="${esc(sel)}" selected>${esc(sel)} (not found)</option>` : '');
  const kindOf = (col) => (col.type === 'scenario' ? 'scenario' : 'y' + col.year);
  const colRow = (col, i) => `
    <div class="mr-secopt" style="cursor:default;align-items:center;flex-wrap:wrap">
      <span class="mr-step-n" style="width:22px;height:22px;flex:0 0 22px;font-size:11px">${i + 1}</span>
      <select onchange="window._jcColKind(${i}, this.value)" style="padding:6px">
        <option value="scenario" ${kindOf(col) === 'scenario' ? 'selected' : ''}>Saved Boundary Studio scenario (projected)</option>
        <option value="y2025" ${kindOf(col) === 'y2025' ? 'selected' : ''}>2025 structure (modeled on real 2025 entries)</option>
        <option value="y2026" ${kindOf(col) === 'y2026' ? 'selected' : ''}>2026 structure (actual results)</option>
      </select>
      ${col.type === 'scenario' ? `<select onchange="window._jcColScenario(${i}, this.value)" style="padding:6px;max-width:260px">${scenOpts(col.scenarioId)}</select>` : ''}
      <label class="mr-soft">Column label <input value="${esc(col.label)}" oninput="window._jcColLabel(${i}, this.value)" style="padding:6px;width:200px"></label>
      <span style="margin-left:auto;display:flex;gap:4px">
        <button class="mr-btn" ${i === 0 ? 'disabled' : ''} onclick="window._jcColMove(${i}, -1)" title="Move up">↑</button>
        <button class="mr-btn" ${i === c.columns.length - 1 ? 'disabled' : ''} onclick="window._jcColMove(${i}, 1)" title="Move down">↓</button>
        <button class="mr-btn" ${c.columns.length === 1 ? 'disabled' : ''} onclick="window._jcColRemove(${i})">Remove</button>
      </span>
    </div>`;
  const m = modal();
  m.innerHTML = `
  <div class="mr-overlay">
    <div class="mr-dialog" role="dialog" aria-label="Edit comparison report">
      <div class="mr-head">
        <div><div class="mr-eyebrow">Comparison reports · ${d.isNew ? 'new copy (not saved yet)' : 'saved copy'}</div>
          <h2 class="mr-title">${esc(d.name || 'Untitled')}</h2></div>
        <button class="mr-x" onclick="window._jcBack()" aria-label="Back">✕</button>
      </div>
      <div class="mr-body">
        <div class="mr-step"><div class="mr-step-n">1</div><div class="mr-step-c">
          <div class="mr-step-h">Name and heading</div>
          <div class="mr-fgrp"><div class="mr-flbl">Name in this list</div><input value="${esc(d.name)}" oninput="window._jcSet('name', this.value)" style="padding:7px;width:100%"></div>
          <div class="mr-fgrp"><div class="mr-flbl">Report title</div><input value="${esc(c.title)}" oninput="window._jcSetCfg('title', this.value)" style="padding:7px;width:100%"></div>
          <div class="mr-fgrp"><div class="mr-flbl">Subtitle</div><input value="${esc(c.subtitle || '')}" oninput="window._jcSetCfg('subtitle', this.value)" style="padding:7px;width:100%"></div>
          <div class="mr-fgrp"><div class="mr-flbl">Membership year used for eligible members (capacity section and scenario ceilings)</div>
            <div class="mr-chips">${MEMBER_YEARS.map((y) => `<button class="mr-chip sm ${+c.membershipYear === y ? 'is-on' : ''}" onclick="window._jcSetCfg('membershipYear', ${y}, true)">${y}</button>`).join('')}</div></div>
        </div></div>
        <div class="mr-step"><div class="mr-step-n">2</div><div class="mr-step-c">
          <div class="mr-step-h">Columns to compare</div>
          <p class="mr-soft" style="margin:-4px 0 8px">Only saved Boundary Studio scenarios are listed. A new scenario must have counties assigned and be saved before it can be a column${(() => { try { const B = window.__BOUNDARY && window.__BOUNDARY.S; return B && B.dirty ? ` — “${esc(B.scenarioName || 'the scenario open in Boundary Studio')}” has unsaved changes, so the report will use its last saved version` : ''; } catch (_) { return ''; } })()}.</p>
          <div style="display:flex;flex-direction:column;gap:6px">${c.columns.map(colRow).join('')}</div>
          <button class="mr-link" onclick="window._jcColAdd()">+ Add a column</button>
        </div></div>
        <div class="mr-step"><div class="mr-step-n">3</div><div class="mr-step-c">
          <div class="mr-step-h">Sections</div>
          <div class="mr-sections">${JC_SECTIONS.map((s) => {
            const on = c.sections.includes(s.id);
            return `<label class="mr-secopt ${on ? 'is-on' : ''}"><input type="checkbox" ${on ? 'checked' : ''} onchange="window._jcSection('${s.id}', this.checked)">
              <span><div class="mr-secopt-n">${esc(s.label)}</div><div class="mr-secopt-d">${esc(s.desc)}</div></span></label>`;
          }).join('')}</div>
        </div></div>
      </div>
      <div class="mr-foot">
        <button class="mr-btn" onclick="window._jcBack()">Cancel</button>
        <span class="mr-soft">${esc(JC.msg || '')}</span>
        <button class="mr-btn" style="margin-left:auto" onclick="window._jcSave(false)">Save</button>
        <button class="mr-btn mr-btn-p" onclick="window._jcSave(true)">Save and generate</button>
      </div>
    </div>
  </div>`;
}

async function open() {
  modal().innerHTML = `<div class="mr-overlay"><div class="mr-dialog"><div class="mr-body">Loading comparison reports…</div></div></div>`;
  await loadLists();
  JC.msg = '';
  renderList();
}

window._jcOpen = open;
window._jcClose = close;
window._jcBack = () => { JC.editing = null; JC.msg = ''; renderList(); };
window._jcDuplicate = (id) => {
  const src = findDef(id); if (!src) return;
  JC.editing = { id: newId(), name: 'Copy of ' + src.name, config: clone(src.config), isNew: true };
  JC.msg = ''; renderEditor();
};
window._jcEdit = (id) => { const src = findDef(id); if (!src || src.builtin) return; JC.editing = clone(src); JC.msg = ''; renderEditor(); };
window._jcDelete = async (id) => {
  const d = findDef(id); if (!d || d.builtin) return;
  if (!window.confirm(`Delete the saved report "${d.name}"? The built-in report is not affected.`)) return;
  try { await deleteDef(id); await loadLists(); JC.msg = `Deleted "${d.name}".`; } catch (e) { JC.msg = 'Delete failed: ' + (e.message || e); }
  renderList();
};
window._jcSet = (k, v) => { JC.editing[k] = v; };
window._jcSetCfg = (k, v, redraw) => { JC.editing.config[k] = v; if (redraw) renderEditor(); };
window._jcSection = (id, on) => {
  const s = new Set(JC.editing.config.sections); if (on) s.add(id); else s.delete(id);
  JC.editing.config.sections = JC_SECTIONS.map((x) => x.id).filter((x) => s.has(x));
  renderEditor();
};
window._jcColKind = (i, v) => {
  const col = JC.editing.config.columns[i];
  if (v === 'scenario') JC.editing.config.columns[i] = { type: 'scenario', scenarioId: (JC.scenarios[0] || {}).id || '', label: col.label };
  else JC.editing.config.columns[i] = { type: 'structure', year: v === 'y2025' ? 2025 : 2026, label: col.label };
  renderEditor();
};
window._jcColScenario = (i, v) => { JC.editing.config.columns[i].scenarioId = v; };
window._jcColLabel = (i, v) => { JC.editing.config.columns[i].label = v; };
window._jcColMove = (i, dir) => {
  const a = JC.editing.config.columns; const j = i + dir; if (j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]]; renderEditor();
};
window._jcColRemove = (i) => { JC.editing.config.columns.splice(i, 1); renderEditor(); };
window._jcColAdd = () => {
  JC.editing.config.columns.push({ type: 'scenario', scenarioId: (JC.scenarios[0] || {}).id || '', label: 'New column' });
  renderEditor();
};
window._jcSave = async (andGenerate) => {
  const d = JC.editing;
  const problems = [];
  if (!d.name || !d.name.trim()) problems.push('give it a name');
  if (!d.config.columns.length) problems.push('add at least one column');
  if (d.config.columns.some((c) => !String(c.label || '').trim())) problems.push('label every column');
  if (d.config.columns.some((c) => c.type === 'scenario' && !c.scenarioId)) problems.push('pick a scenario for every scenario column');
  if (!d.config.sections.length) problems.push('pick at least one section');
  if (problems.length) { JC.msg = 'Before saving: ' + problems.join(', ') + '.'; renderEditor(); return; }
  try {
    await saveDef({ id: d.id, name: d.name, config: d.config });
  } catch (e) { JC.msg = 'Save failed: ' + (e.message || e); renderEditor(); return; }
  const id = d.id;
  await loadLists();
  JC.editing = null;
  JC.msg = `Saved "${d.name.trim()}".`;
  if (andGenerate) generate(id); else renderList();
};
window._jcGenerate = (id) => generate(id);

/* ------------------------------------------------------------ generate */

async function generate(id) {
  const def = findDef(id);
  if (!def) return;
  close();
  const cfg = def.config;
  const prev = document.getElementById('mr-output'); if (prev) prev.remove();
  const out = document.createElement('div');
  out.id = 'mr-output';
  out.innerHTML = `
    <div class="mr-toolbar">
      <button class="mr-print" onclick="window.print()">Print / save as PDF</button>
      <button onclick="document.getElementById('mr-output').remove(); window._jcOpen()">Back to comparison reports</button>
      <button onclick="document.getElementById('mr-output').remove()">✕ Close</button>
      <span class="mr-soft" style="margin-left:auto">Sized for US Letter.</span>
    </div>
    <div class="mr-doc">
      <div class="mr-doc-head">
        <h1>${esc(cfg.title)}</h1>
        <div class="mr-doc-sub" id="jc-sub">${cfg.subtitle ? `<strong>${esc(cfg.subtitle)}</strong><br>` : ''}Report: ${esc(def.name)}</div>
      </div>
      <div id="mr-doc-body"><p class="mr-soft">Building… <span id="jc-prog"></span></p></div>
    </div>`;
  document.body.appendChild(out);
  const prog = (t) => { const el = document.getElementById('jc-prog'); if (el) el.textContent = t; };
  let r;
  try {
    r = await buildJuniorCircuitReport(def, prog);
  } catch (e) {
    document.getElementById('mr-doc-body').innerHTML = `<p class="mr-p mr-warn">The report could not be built: ${esc(e && e.message || e)}</p>`;
    return;
  }
  const sub = document.getElementById('jc-sub');
  if (sub) sub.innerHTML += `<br>Generated ${esc(new Date(r.generatedAt).toLocaleString())} from live data (DiveMeets results, USA Diving membership, saved Boundary Studio scenarios)`
    + `<br>Columns: ${r.columns.map((c) => esc(c.label)).join(' · ')}`
    + `<br>Data checks: <strong>${r.checks.filter((c) => c.pass).length} passed, ${r.checks.filter((c) => !c.pass).length} failed</strong>`;
  document.getElementById('mr-doc-body').innerHTML = renderReport(r);
}

/* ------------------------------------------------------------ renderer */

const statusWord = (c) => (c.kind === 'scenario' ? 'projected' : c.kind === 'structure2025' ? 'modeled' : 'actual');
const colSub = (c) => (c.kind === 'scenario' ? 'Projected' : c.kind === 'structure2025' ? 'Modeled on real 2025 entries' : 'Actual 2026 results');
const ok = (c) => !c.error;

function section(title, body) {
  return `<section class="mr-section"><h2 class="mr-h2">${esc(title)}</h2>${body}</section>`;
}
function headRow(cols, first) {
  return `<tr><th>${esc(first)}</th>${cols.map((c) => `<th class="mr-num">${esc(c.label)}<br><span class="mr-soft" style="text-transform:none;font-weight:600">${esc(c.error ? 'not built' : colSub(c))}</span></th>`).join('')}</tr>`;
}
const cellOf = (html) => `<td class="mr-num">${html}</td>`;

function rangeText(lo, hi) { return lo != null && lo !== hi ? `${n(lo)}–${n(hi)}` : n(hi); }

const natOf = (c) => c.nationals;
const noNat = (c) => `<span class="mr-soft">not in this scenario (ends at ${esc(stage(c.endsAt || ''))})</span>`;

function secSummary(r) {
  const cols = r.columns;
  const rows = [];
  const add = (label, f, cls) => rows.push(`<tr${cls ? ` class="${cls}"` : ''}><td>${label}</td>${cols.map((c) => cellOf(ok(c) ? f(c) : '—')).join('')}</tr>`);
  add('First stop — event entries', (c) => {
    const t = c.tiers[0];
    if (c.kind === 'structure2026') return `${n(t.individualAged)} <span class="mr-soft">actual, individual</span><br><span class="mr-soft">${esc(stage(t.name))} · ${n(t.eventEntries)} billed</span>`;
    return `${n(t.eventEntries)} <span class="mr-soft">${statusWord(c)}</span><br><span class="mr-soft">${esc(stage(t.name))}</span>`;
  });
  add('First stop — unique athletes', (c) => `${n(c.tiers[0].uniqueAthletes)} <span class="mr-soft">${statusWord(c)}</span>`);
  add('Junior Nationals — qualifying-ladder event entries', (c) => {
    const N = natOf(c);
    if (!N) return noNat(c);
    if (c.kind === 'scenario') return `${rangeText(N.eventEntriesLow, N.eventEntries)} <span class="mr-soft">projected†</span>`;
    if (c.kind === 'structure2026') return `${n(N.ladderEntries)} <span class="mr-soft">actual</span>`;
    return '<span class="mr-soft">not separated</span>';
  });
  add('Junior Nationals — qualifying-ladder unique athletes', (c) => {
    const N = natOf(c);
    if (!N) return noNat(c);
    if (c.kind === 'scenario') return `${rangeText(N.uniqueAthletesLow, N.uniqueAthletes)} <span class="mr-soft">projected†</span>`;
    if (c.kind === 'structure2026') return `${n(N.ladderAthletes)} <span class="mr-soft">actual</span>`;
    return '<span class="mr-soft">not separated</span>';
  });
  add('Junior Nationals — all individual event entries', (c) => {
    const N = natOf(c);
    if (!N) return noNat(c);
    if (c.kind === 'scenario') return '<span class="mr-soft">ladder only — plus High Performance Squad and other entries (2026: ' + n(r.accuracy.nationals2026 && r.accuracy.nationals2026.other.entries) + ')</span>';
    if (c.kind === 'structure2025') return `${n(N.eventEntries)} <span class="mr-soft">modeled</span><br><span class="mr-soft">${n(N.actualEventEntries)} actual</span>`;
    return `${n(N.eventEntries)} <span class="mr-soft">actual</span><br><span class="mr-soft">plus ${n(N.synchroEntries)} synchro</span>`;
  });
  add('Junior Nationals — all unique athletes', (c) => {
    const N = natOf(c);
    if (!N) return noNat(c);
    if (c.kind === 'scenario') return '<span class="mr-soft">ladder only</span>';
    if (c.kind === 'structure2025') return `${n(N.uniqueAthletes)} <span class="mr-soft">modeled</span><br><span class="mr-soft">${n(N.actualUniqueAthletes)} actual</span>`;
    return `${n(N.uniqueAthletes)} <span class="mr-soft">actual</span>`;
  });
  add('Junior Nationals — places the rules create', (c) => {
    const N = natOf(c);
    if (!N) return noNat(c);
    return N.places != null ? `${n(N.places)}${N.placesNote ? `<br><span class="mr-soft">${esc(N.placesNote)}</span>` : ''}` : '—';
  });
  add('Season — event entries, all stops', (c) => (c.kind === 'structure2026'
    ? `${n(c.money.individualOnly.eventEntries)} <span class="mr-soft">actual, individual</span><br><span class="mr-soft">${n(c.tiers.reduce((a, t) => a + t.eventEntries, 0))} billed</span>`
    : `${n(c.tiers.reduce((a, t) => a + t.eventEntries, 0))} <span class="mr-soft">${statusWord(c)}</span>`));
  add('Gross entry income', (c) => usd(c.money.gross));
  add('<strong>USA Diving keeps (entry fees)</strong>', (c) => `<strong>${usd(c.money.keeps)}</strong>`
    + (c.money.atStandardFees ? `<br><span class="mr-soft">${usd(c.money.atStandardFees.usaDivingKeeps)} at 2026 published fees</span>` : '')
    + (c.money.individualOnly ? `<br><span class="mr-soft">${usd(c.money.individualOnly.keeps)} individual events only§</span>` : '')
    + (c.money.reconciledKeeps != null ? `<br><span class="mr-soft">${usd(c.money.reconciledKeeps)} reconciled‡</span>` : ''), 'mr-total');
  const scen = cols.find((c) => ok(c) && c.kind === 'scenario' && c.nationals);
  const notes = [];
  if (scen) notes.push(`† ${esc(scen.nationals.rangeReason)} ${esc(scen.nationals.excludes)}`);
  const c26 = cols.find((c) => ok(c) && c.kind === 'structure2026');
  if (c26) notes.push(`2026 individual = junior circuit individual events with an age group. Billed also includes synchro and FC Level entries. 2026 athletes who competed at Regionals, Zones or both: ${n(c26.firstStops.eventEntries)} event entries, ${n(c26.firstStops.uniqueAthletes)} unique athletes — the comparison for a proposal whose one first stop replaces both.`);
  if (c26) notes.push('§ Same basis as the proposals: individual circuit events only (synchro and FC Level entries removed at the fee each paid).');
  const rec = cols.filter((c) => ok(c) && c.money.reconciledKeeps != null);
  if (rec.length) notes.push('‡ ' + rec.map((c) => `${esc(c.label)}: ${esc(c.money.reconciledNote)}`).join(' '));
  notes.push('Event entry = one athlete in one event. Unique athlete = each person counted once, however many events they enter.');
  return section('Summary', `<table class="mr-table">${headRow(cols, 'Figure')}${rows.join('')}</table>${notes.map((t) => `<p class="mr-note">${t}</p>`).join('')}`);
}

function secPathways(r) {
  const blocks = r.columns.filter(ok).map((c) => {
    const stops = (c.structure.levels || []).map((l) => `${l.meets} ${esc(stage(l.name))} meet${l.meets === 1 ? '' : 's'}`);
    const hasJN = (c.structure.levels || []).some((l) => /national/i.test(l.name));
    if (c.kind === 'scenario' && !hasJN) stops.push(`${esc(c.structure.finalName || 'Junior Nationals')} <span class="mr-soft">(not modeled in this scenario)</span>`);
    return `<div class="mr-rules-col"><div class="mr-rules-h">${esc(c.label)}</div>
      <p class="mr-p" style="font-size:11px"><strong>Stops:</strong> ${stops.join(' → ')}</p>
      <ul class="mr-bullets">${(c.rules || []).map((x) => `<li>${esc(x.text)}${x.places != null ? ` <strong>${n(x.places)} places</strong> <span class="mr-soft">(${esc(x.placesText)})</span>` : ''}${x.internal ? ' <span class="mr-soft">— inside the same meet</span>' : ''}</li>`).join('')}</ul>
      ${c.assumption ? `<p class="mr-p" style="font-size:11px"><strong>Assumption:</strong> ${esc(c.assumption)}</p>` : ''}
      <p class="mr-soft">${esc(c.source)}</p></div>`;
  });
  return section('How each structure works', `<div class="mr-rules-grid">${blocks.join('')}</div>
    <p class="mr-note">Places = meets × places per event × events offered (24 junior events: 4 age groups × 2 genders × 1m, 3m, platform). Where a rule also admits anyone who meets an average score, the place count is a floor, not a cap.</p>`);
}

function secTiers(r) {
  const parts = r.columns.filter(ok).map((c) => {
    const st = statusWord(c);
    const act25 = c.kind === 'structure2025';
    const is26 = c.kind === 'structure2026';
    const head = `<tr><th>Stop</th><th class="mr-num">Meets</th>`
      + (is26 ? '<th class="mr-num">Individual event entries (actual)</th><th class="mr-num">Event entries billed (actual)</th>' : `<th class="mr-num">Event entries (${st})</th>`)
      + `<th class="mr-num">Unique athletes (${st})</th>`
      + (act25 ? '<th class="mr-num">Event entries (actual)</th><th class="mr-num">Unique athletes (actual)</th>' : '')
      + (c.kind === 'scenario' ? '<th class="mr-num">Places the rules create</th>' : '') + '</tr>';
    const body = c.tiers.map((t) => `<tr><td>${esc(stage(t.name))}</td><td class="mr-num">${n(t.meets)}</td>`
      + (is26 ? `<td class="mr-num">${n(t.individualAged)}</td>` : '')
      + `<td class="mr-num">${n(t.eventEntries)}</td><td class="mr-num">${n(t.uniqueAthletes)}</td>`
      + (act25 ? `<td class="mr-num">${n(t.actualEventEntries)}</td><td class="mr-num">${n(t.actualUniqueAthletes)}</td>` : '')
      + (c.kind === 'scenario' ? `<td class="mr-num">${t.places == null ? '<span class="mr-soft">open entry</span>' : n(t.places)}</td>` : '') + '</tr>').join('');
    const note = is26
      ? 'Individual = junior circuit individual events with an age group. Billed = every entry charged at that stop, which adds synchro and FC Level entries with no age group (' + c.tiers.filter((t) => t.eventEntries !== t.individualAged).map((t) => `${stage(t.name)} +${n(t.eventEntries - t.individualAged)}`).join(', ') + '). Unique athletes = individual-event competitors.'
      : act25 ? 'Modeled: the 2021–2025 rules run on real 2025 Regionals entries. Actual event entries are individual events only; 2025 Junior Nationals also had synchro entries, shown in the Junior Nationals section.'
        : 'Projected unique athletes = projected event entries ÷ the measured events per athlete for that age group, gender and stop.';
    return `<h3 class="mr-h3">${esc(c.label)} — ${esc(colSub(c).toLowerCase())}</h3><table class="mr-table mr-table-sm">${head}${body}</table><p class="mr-note">${esc(note)}</p>`;
  });
  return section('Event entries and athletes by stop type', parts.join(''));
}

function secNationals(r) {
  const cols = r.columns;
  const rows = [];
  const add = (label, f) => rows.push(`<tr><td>${label}</td>${cols.map((c) => cellOf(ok(c) ? (c.nationals ? f(c, c.nationals) : noNat(c)) : '—')).join('')}</tr>`);
  add('Qualifying-ladder event entries — high end', (c, N) => (c.kind === 'scenario' ? `${n(N.eventEntries)} <span class="mr-soft">projected</span>` : '—'));
  add('Qualifying-ladder event entries — low end', (c, N) => (c.kind === 'scenario' ? `${n(N.eventEntriesLow)} <span class="mr-soft">projected</span>` : '—'));
  add('Qualifying-ladder event entries', (c, N) => (c.kind === 'structure2026' ? `${n(N.ladderEntries)} <span class="mr-soft">actual</span>` : '—'));
  add('Qualifying-ladder unique athletes', (c, N) => (c.kind === 'scenario' ? `${rangeText(N.uniqueAthletesLow, N.uniqueAthletes)} <span class="mr-soft">projected</span>`
    : c.kind === 'structure2026' ? `${n(N.ladderAthletes)} <span class="mr-soft">actual</span>` : '—'));
  add('High Performance Squad, backfilled and other event entries', (c, N) => (c.kind === 'scenario' ? '<span class="mr-soft">not modeled</span>'
    : c.kind === 'structure2026' ? `${n(N.otherEntries)} <span class="mr-soft">actual</span>` : '—'));
  add('All individual event entries', (c, N) => (c.kind === 'scenario' ? '<span class="mr-soft">ladder only</span>'
    : c.kind === 'structure2025' ? `${n(N.eventEntries)} modeled<br><span class="mr-soft">${n(N.actualEventEntries)} actual</span>` : `${n(N.eventEntries)} <span class="mr-soft">actual</span>`));
  add('All unique athletes (individual events)', (c, N) => (c.kind === 'scenario' ? '<span class="mr-soft">ladder only</span>'
    : c.kind === 'structure2025' ? `${n(N.uniqueAthletes)} modeled<br><span class="mr-soft">${n(N.actualUniqueAthletes)} actual</span>` : `${n(N.uniqueAthletes)} <span class="mr-soft">actual</span>`));
  add('Synchro event entries', (c, N) => (c.kind === 'scenario' ? '<span class="mr-soft">not modeled</span>' : `${n(c.kind === 'structure2025' ? N.actualSynchro : N.synchroEntries)} <span class="mr-soft">actual</span>`));
  add('Places the rules create', (c, N) => (N.places != null ? `${n(N.places)}${N.placesNote ? `<br><span class="mr-soft">${esc(N.placesNote)}</span>` : ''}` : '—'));
  let html = `<table class="mr-table">${headRow(cols, 'Junior Nationals')}${rows.join('')}</table>`;
  const scen = cols.find((c) => ok(c) && c.kind === 'scenario' && c.nationals);
  if (scen) html += `<p class="mr-note"><strong>Why a range:</strong> ${esc(scen.nationals.rangeReason)}<br><strong>Not included in projected figures:</strong> ${esc(scen.nationals.excludes)}</p>`;
  const b = r.accuracy.nationals2026;
  if (b) {
    const row = (label, x, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${label}</td><td class="mr-num">${n(x.entries)}</td><td class="mr-num">${n(x.athletes)}</td></tr>`;
    html += `<h3 class="mr-h3">2026 Junior Nationals — who actually competed, by how they earned the place</h3>
    <table class="mr-table mr-table-sm"><tr><th>Route (read from 2026 results)</th><th class="mr-num">Individual event entries (actual)</th><th class="mr-num">Unique athletes (actual)</th></tr>
      ${row('Zones — top 3', b.zoneTop3)}
      ${row('East, West, Central — top 3', b.ewcTop3)}
      ${row('East, West, Central — 4th–6th, met the average score', b.ewcAverage)}
      ${row('Qualifying ladder, subtotal', b.ladder, 'mr-total')}
      ${row('High Performance Squad', b.hps)}
      ${row('Competed in that event at Zones or E/W/C without a qualifying finish (backfilled places, other approvals)', b.otherCompeted)}
      ${row('No Zones or E/W/C result in that event', b.otherNoResult)}
      ${row('Total competed', b.total, 'mr-total')}
    </table>
    <p class="mr-note">Each event entry is counted once, in the first route that applies, top to bottom. Unique athletes do not add across rows: one athlete can earn places by different routes in different events.
    ${n(b.earnedTop3.entries)} event entries (${n(b.earnedTop3.athletes)} unique athletes) earned a place by finishing top 3 at Zones or E/W/C; ${n(b.competedTop3.entries)} (${n(b.competedTop3.athletes)} unique athletes) competed in that event = ${pct(100 * b.attendance)}, the low end of every projected range.
    For reference, the qualifier list published in July shows ${n(b.publishedList.entries)} event entries (${n(b.publishedList.athletes)} unique athletes) for Zone Direct and E/W/C.</p>`;
  }
  return section('Junior Nationals field', html);
}

function fmtFees(c) {
  if (c.kind !== 'scenario') return esc(c.money.feesUsed || '');
  const f = c.money.fees;
  if (!f || !Object.values(f).some((v) => v != null)) return 'Published 2026 fees';
  return Object.entries(f).filter(([, v]) => v != null).map(([L, v]) => `${esc(stage((c.structure.levels[+L] || {}).name || ('level ' + L)))} $${v}`).join(', ') + '; other stops at 2026 published fees';
}

function secMoney(r) {
  const cols = r.columns;
  const rows = [];
  const add = (label, f, cls) => rows.push(`<tr${cls ? ` class="${cls}"` : ''}><td>${label}</td>${cols.map((c) => cellOf(ok(c) ? f(c) : '—')).join('')}</tr>`);
  add('Fees used', (c) => `<span class="mr-soft">${fmtFees(c)}</span>`);
  add('Event entries charged', (c) => `${n(c.stops.reduce((a, x) => a + x.eventEntries, 0))} <span class="mr-soft">${c.kind === 'structure2026' ? 'actual billed' : statusWord(c)}</span>`);
  add('Gross entry income', (c) => usd(c.money.gross));
  add('DiveMeets fees', (c) => usd(-c.money.diveMeets));
  add('Paid to hosts', (c) => usd(-c.money.hosts));
  add('USA Diving keeps', (c) => usd(c.money.keeps), 'mr-total');
  if (cols.some((c) => ok(c) && c.money.individualOnly)) add('USA Diving keeps, individual circuit events only', (c) => (c.money.individualOnly
    ? `${usd(c.money.individualOnly.keeps)}<br><span class="mr-soft">${n(c.money.individualOnly.eventEntries)} event entries</span>`
    : c.kind === 'scenario' ? '<span class="mr-soft">same as above (individual only)</span>' : '<span class="mr-soft">not separated</span>'));
  if (cols.some((c) => ok(c) && c.money.atStandardFees)) add('USA Diving keeps at 2026 published fees', (c) => (c.money.atStandardFees ? usd(c.money.atStandardFees.usaDivingKeeps)
    : c.kind === 'structure2025' ? '<span class="mr-soft">not calculated (2025 fees)</span>' : '<span class="mr-soft">same as above</span>'));
  if (cols.some((c) => ok(c) && c.money.reconciledKeeps != null)) add('USA Diving share, reconciled to actual payments', (c) => (c.money.reconciledKeeps != null ? usd(c.money.reconciledKeeps) : '<span class="mr-soft">n/a — not held yet</span>'));
  const notes = cols.filter(ok).map((c) => `<strong>${esc(c.label)}:</strong> ${esc(c.money.basis)}${c.money.reconciledNote && c.money.reconciledKeeps != null ? ' Reconciled: ' + esc(c.money.reconciledNote) : ''}${c.money.atStandardFees ? ' ' + esc(c.money.atStandardFees.note) : ''}`);
  return section('Entry income', `<table class="mr-table">${headRow(cols, 'Entry fees only')}${rows.join('')}</table>
    ${notes.map((t) => `<p class="mr-note">${t}</p>`).join('')}
    <p class="mr-note">Entry fees only. Membership dues, late fees and senior-circuit income are not included. Host payments follow each column's stated terms (the two proposals and the 2025/2026 models use $25 per event entry); actual host payments differ, which is why the reconciled figures are lower.</p>`);
}

const COHORT_SHORT = { AB: 'A boys', AG: 'A girls', BB: 'B boys', BG: 'B girls', CB: 'C boys', CG: 'C girls', DB: 'D boys', DG: 'D girls' };
function secCapacity(r) {
  const parts = r.columns.filter(ok).map((c) => {
    const tiers = c.tiers.filter((t) => t.cohorts && t.cohorts.length);
    if (!tiers.length) return '';
    const keys = [...new Set(tiers.flatMap((t) => t.cohorts.map((x) => x.cohort)))].sort((a, b) => COHORTS.indexOf(a) - COHORTS.indexOf(b));
    const st = statusWord(c);
    const elig = (k) => (tiers.map((t) => t.cohorts.find((x) => x.cohort === k)).find(Boolean) || {}).eligible;
    const head = `<tr><th>Unique athletes (${st})</th>${keys.map((k) => `<th class="mr-num">${esc(COHORT_SHORT[k] || k)}</th>`).join('')}</tr>`;
    const eligRow = `<tr class="mr-muted"><td>Eligible members</td>${keys.map((k) => `<td class="mr-num">${n(elig(k))}</td>`).join('')}</tr>`;
    const body = tiers.map((t) => `<tr><td>${esc(stage(t.name))}</td>${keys.map((k) => {
      const x = t.cohorts.find((y) => y.cohort === k);
      return `<td class="mr-num">${x ? `${n(x.uniqueAthletes)}<br><span class="mr-soft">${pct(x.pct, 0)}</span>` : '—'}</td>`;
    }).join('')}</tr>`).join('');
    return `<h3 class="mr-h3">${esc(c.label)}</h3><table class="mr-table mr-table-sm">${head}${eligRow}${body}</table>`;
  });
  return section('Capacity against membership', parts.join('')
    + `<p class="mr-note">Groups: A 16–18, B 14–15, C 12–13, D 11 and under. Each cell: unique athletes, then that number as a share of eligible members in the same cohort.</p>`
    + (r.columns.some((c) => c.kind === 'structure2026') ? `<p class="mr-note">2026 structure: unique athletes per cohort are counted from results. They can add to slightly less than the stop total: an athlete with no age group on their entry is in the stop total but in no cohort row.</p>` : '')
    + `<p class="mr-note">Eligible members = unique Competition Athlete members, AQUA age 18 and under, in the membership year the column is measured against. Above 100% means more athletes competed than hold that membership (foreign athletes and members with no gender on file are the documented causes).</p>`);
}

function secMembership(r) {
  const m = r.membership;
  const rank = (k) => (COHORTS.indexOf(k) < 0 ? 99 + 'ABCD'.indexOf(k[0]) : COHORTS.indexOf(k));
  const keys = [...new Set(MEMBER_YEARS.flatMap((y) => Object.keys(m[y] || {})))].sort((a, b) => rank(a) - rank(b));
  const total = (y) => Object.values(m[y] || {}).reduce((a, b) => a + b, 0);
  const body = keys.map((k) => `<tr><td>${esc(cohortName(k))}</td>${MEMBER_YEARS.map((y) => `<td class="mr-num">${n((m[y] || {})[k] || 0)}</td>`).join('')}</tr>`).join('');
  return section('Eligible membership, 2024–2026', `<table class="mr-table mr-table-sm">
    <tr><th>Cohort (unique members, actual)</th>${MEMBER_YEARS.map((y) => `<th class="mr-num">${y}</th>`).join('')}</tr>${body}
    <tr class="mr-total"><td>Eligible Competition Athlete members</td>${MEMBER_YEARS.map((y) => `<td class="mr-num">${n(total(y))}</td>`).join('')}</tr>
    <tr><td>Change from the year before</td><td class="mr-num">—</td>${MEMBER_YEARS.slice(1).map((y) => `<td class="mr-num">${signPct(total(y), total(y - 1))}</td>`).join('')}</tr></table>
    <p class="mr-note">Competition Athlete (17U) and Competition Athlete (AQUA Age 18+) members with a birth date on file, AQUA age 18 and under. 2024 and 2025 are full membership years. 2026 is as of the last membership import (${esc(m.asOf2026 || 'date unknown')}); members who joined after that date are not counted, so the 2026 change is not a same-date comparison.</p>`);
}

function secAccuracy(r) {
  let html = '';
  const v = r.accuracy.validation2025;
  if (v) {
    html += `<h3 class="mr-h3">2025: the model run on real 2025 entries, against what happened</h3>
    <table class="mr-table mr-table-sm"><tr><th>Figure</th><th class="mr-num">Modeled</th><th class="mr-num">Actual</th><th class="mr-num">Difference</th></tr>
    <tr><td>Zones — individual event entries</td><td class="mr-num">${n(v.zoneTotal.projected)}</td><td class="mr-num">${n(v.zoneTotal.real)}</td><td class="mr-num">${signPct(v.zoneTotal.projected, v.zoneTotal.real)}</td></tr>
    <tr><td>Junior Nationals — individual event entries</td><td class="mr-num">${n(v.nationalsIndividual.projected)}</td><td class="mr-num">${n(v.nationalsIndividual.real)}</td><td class="mr-num">${signPct(v.nationalsIndividual.projected, v.nationalsIndividual.real)}</td></tr>
    </table><p class="mr-note">2025 Junior Nationals also had ${n(v.nationalsIndividual.realIncludingSynchro - v.nationalsIndividual.real)} synchro event entries (${n(v.nationalsIndividual.realIncludingSynchro)} in total); the model covers individual events only.</p>`;
  } else html += '<p class="mr-p mr-soft">Add the 2025 structure as a column to include the 2025 validation.</p>';
  const b = r.accuracy.nationals2026;
  if (b) html += `<h3 class="mr-h3">2026: how the projected Junior Nationals range is set</h3>
    <p class="mr-p">In 2026, ${n(b.earnedTop3.entries)} individual event entries (${n(b.earnedTop3.athletes)} unique athletes) earned a Junior Nationals place by finishing top 3 at Zones or East, West, Central. ${n(b.competedTop3.entries)} (${n(b.competedTop3.athletes)} unique athletes) competed in that event — ${pct(100 * b.attendance)}. Another ${n(b.otherCompeted.entries)} event entries came from athletes who competed in that event at Zones or E/W/C without a qualifying finish (places declined by others and filled from further down, or other approvals). A projection that fills every earned place is the high end; the same projection at ${pct(100 * b.attendance)} is the low end.</p>`;
  const c26 = r.columns.find((c) => ok(c) && c.kind === 'structure2026');
  const sc = r.columns.filter((c) => ok(c) && c.kind === 'scenario' && c.assumption);
  if (c26 && sc.length) html += `<h3 class="mr-h3">What the proposals' first stop assumes</h3>
    <p class="mr-p">Projected first stop (${sc.map((c) => `${esc(c.label)} ${n(c.tiers[0].eventEntries)} event entries, ${n(c.tiers[0].uniqueAthletes)} unique athletes`).join('; ')}) is built from 2026 Regionals springboard for Groups A and B, plus 2026 Zones for platform and Groups C and D. In 2026, ${n(c26.firstStops.eventEntries)} event entries (${n(c26.firstStops.uniqueAthletes)} unique athletes) were competed at Regionals, Zones or both. The gap is mostly Group C and D athletes who dove at Regionals but did not go on to Zones; the projection does not assume they would travel to a Zones-sized first stop.</p>`;
  return section('How accurate the model is', html);
}

function secStops(r) {
  const parts = r.columns.filter(ok).map((c) => {
    const st = c.kind === 'structure2026' ? 'actual billed' : statusWord(c);
    const q26 = c.kind === 'structure2026';
    const tot = (k) => c.stops.reduce((a, x) => a + (x[k] || 0), 0);
    const body = c.stops.map((x) => `<tr><td>${esc(x.stop)}</td><td>${esc(stage(x.tier))}</td><td class="mr-num">${n(x.eventEntries)}${q26 && x.qualifyingEntries != null ? `<br><span class="mr-soft">${n(x.qualifyingEntries)} qualifying / ${n(x.nonQualifyingEntries)} non-qualifying</span>` : ''}${x.feeSplit ? `<br><span class="mr-soft">${x.feeSplit.map((f) => `${n(f.entries)} at $${f.fee}`).join(' / ')}</span>` : ''}</td>
      <td class="mr-num">${fee(x.fee)}</td><td class="mr-num">${usd(x.gross)}</td><td class="mr-num">${usd(x.keeps)}</td></tr>`).join('');
    return `<h3 class="mr-h3">${esc(c.label)}</h3><table class="mr-table mr-table-sm">
      <tr><th>Stop</th><th>Stop type</th><th class="mr-num">Event entries (${st})</th><th class="mr-num">Fee per event entry</th><th class="mr-num">Gross</th><th class="mr-num">USA Diving keeps</th></tr>
      ${body}<tr class="mr-total"><td colspan="2">Season</td><td class="mr-num">${n(tot('eventEntries'))}</td><td></td><td class="mr-num">${usd(c.money.gross)}</td><td class="mr-num">${usd(c.money.keeps)}</td></tr></table>
      ${Math.abs(tot('keeps') - c.money.keeps) + Math.abs(tot('gross') - c.money.gross) > 0 ? `<p class="mr-note">Each stop is rounded to the dollar; the season line is the unrounded season total, so the stops add to within $${Math.max(Math.abs(tot('keeps') - c.money.keeps), Math.abs(tot('gross') - c.money.gross))} of it.</p>` : ''}`;
  });
  return section('Entry income by stop', parts.join(''));
}

function secChecks(r) {
  const warn = r.columns.filter((c) => ok(c) && c.warnings && c.warnings.length);
  return section('Data checks', `<table class="mr-table mr-table-sm"><tr><th style="width:70px">Result</th><th>Check</th></tr>
    ${r.checks.map((c) => `<tr><td style="font-weight:800;color:${c.pass ? '#15803d' : '#b3122b'}">${c.pass ? 'PASS' : 'FAIL'}</td><td>${esc(c.msg)}</td></tr>`).join('')}</table>
    ${warn.map((c) => `<p class="mr-note mr-warn">${esc(c.label)} logged data warnings: ${esc(c.warnings.slice(0, 5).join(' · '))}</p>`).join('')}
    <p class="mr-note">The full check suite (seed, fees, totals, places, back-test, 2025 validation, labels) also runs automatically on every change to the models and every Monday.</p>`);
}

function secDefinitions() {
  const D = [
    ['Event entry', 'One athlete entered in one event. An athlete in 1m, 3m and platform is three event entries.'],
    ['Unique athlete', 'Each person counted once, however many events they enter.'],
    ['Actual', 'Counted from DiveMeets results or USA Diving membership records.'],
    ['Projected', 'Calculated by applying a proposal’s rules to real 2026 entries.'],
    ['Modeled', 'Calculated by applying the 2021–2025 rules to real 2025 Regionals entries, then checked against what actually happened in 2025.'],
    ['Range', 'Low end and high end of a projection, with the reason stated beside it.'],
    ['Places', 'Advancement spots a rule creates: meets × places per event × events offered.'],
    ['USA Diving keeps', 'Entry income minus DiveMeets fees and host payments. Entry fees only.'],
    ['Reconciled', 'Taken from actual payments (general ledger or DiveMeets settlement recaps), not from a fee × entries calculation.'],
  ];
  return section('Definitions', `<table class="mr-table mr-table-sm mr-table-plain">${D.map(([k, v]) => `<tr><td style="width:150px"><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`).join('')}</table>`);
}

const RENDER = {
  summary: secSummary, pathways: secPathways, tiers: secTiers, nationals: secNationals, money: secMoney,
  stops: secStops, capacity: secCapacity, membership: secMembership, accuracy: secAccuracy, checks: secChecks, definitions: secDefinitions,
};

function renderReport(r) {
  const errs = r.columns.filter((c) => c.error).map((c) => `<p class="mr-p mr-warn">${esc(c.label)} could not be built: ${esc(c.error)}</p>`).join('');
  const failed = r.checks.filter((c) => !c.pass);
  const banner = failed.length ? `<p class="mr-p mr-warn"><strong>${failed.length} data check${failed.length === 1 ? '' : 's'} failed.</strong> Do not circulate this report until the failures in the Data checks section are resolved.</p>` : '';
  return banner + errs + r.config.sections.filter((id) => RENDER[id]).map((id) => {
    try { return RENDER[id](r); } catch (e) {
      const s = JC_SECTIONS.find((x) => x.id === id);
      return section(s ? s.label : id, `<p class="mr-p mr-warn">This section could not be built: ${esc(e.message || e)}</p>`);
    }
  }).join('');
}

// Test hook: lets the headless check render a report without clicking.
window.__JCReport = { buildJuniorCircuitReport, renderReport, JC_BUILTIN };
