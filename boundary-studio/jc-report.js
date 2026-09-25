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
import { buildJuniorCircuitReport, JC_BUILTIN, JC_SECTIONS, JC_REPORT_KIND } from '../shared/jc/report.js?v=202609250120';

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
    // Same display names as Boundary Studio; the superseded 2026 draft is not offered.
    const SEED_NAMES = { 'seed-2026-official': 'Official 2026 Regions (published map)' };
    JC.scenarios = (await sql(`SELECT id, name FROM membership.boundary_scenarios ORDER BY updated_at DESC LIMIT 200`))
      .filter((r) => r.id !== 'seed-2026-alignment')
      .map((r) => ({ ...r, name: SEED_NAMES[r.id] || r.name }));
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

/* ------------------------------------------------------------ picker / editor
   Plain-language flow:
     list    -> each report as a card: what it compares, one Generate button,
                Copy / Change / Delete as quiet links
     editor  -> 1 name, 2 tick what to compare (label each), 3 tick what to
                include; title, subtitle and membership year under "More options" */

function modal() {
  let m = document.getElementById('mr-modal');
  if (!m) { m = document.createElement('div'); m.id = 'mr-modal'; document.body.appendChild(m); }
  return m;
}
function close() { const m = document.getElementById('mr-modal'); if (m) m.remove(); JC.editing = null; }

const shortName = (s) => String(s || '').split(' — ')[0].trim();
const colKey = (c) => (c.type === 'scenario' ? 's:' + c.scenarioId : 'y:' + c.year);
const KIND = {
  scenario: { tag: 'Proposal', desc: 'Projected from a saved Boundary Studio proposal' },
  2026: { tag: 'Real 2026 season', desc: 'What actually happened: 2026 results and fees' },
  2025: { tag: 'Real 2025 season', desc: '2021–2025 rules modeled on real 2025 entries' },
};
const kindOf = (c) => (c.type === 'scenario' ? KIND.scenario : KIND[+c.year] || KIND[2026]);
function choices() {
  return [
    { type: 'structure', year: 2026, name: '2026 season (actual)', label: '2026 Structure' },
    { type: 'structure', year: 2025, name: '2025 season (modeled)', label: '2025 Structure' },
    ...JC.scenarios.map((s) => ({ type: 'scenario', scenarioId: s.id, name: s.name, label: shortName(s.name) })),
  ];
}
const sameConfig = (a, b) => JSON.stringify({ c: a.columns, s: a.sections, t: a.title, u: a.subtitle, y: +a.membershipYear })
  === JSON.stringify({ c: b.columns, s: b.sections, t: b.title, u: b.subtitle, y: +b.membershipYear });
const when = (d) => { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (_) { return ''; } };

const UI_CSS = `
#mr-modal .jc-card{border:1px solid #dbe2ee;border-radius:10px;padding:14px 16px;background:#fff;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
#mr-modal .jc-card.is-std{border-color:#171F69;box-shadow:inset 3px 0 0 #171F69}
#mr-modal .jc-card-main{flex:1;min-width:260px}
#mr-modal .jc-name{font-weight:800;font-size:15px;color:#171F69}
#mr-modal .jc-sub{font-size:12px;color:#5a6480;margin:2px 0 8px}
#mr-modal .jc-chips{display:flex;flex-wrap:wrap;gap:6px}
#mr-modal .jc-chip{font-size:12px;border-radius:999px;padding:3px 10px;background:#eef2fb;color:#171F69;font-weight:600;white-space:nowrap}
#mr-modal .jc-chip i{font-style:normal;font-weight:500;color:#5a6480;margin-left:4px}
#mr-modal .jc-acts{display:flex;align-items:center;gap:12px}
#mr-modal .jc-link{background:none;border:none;color:#00789b;font-weight:700;font-size:13px;cursor:pointer;padding:4px 0;font-family:inherit}
#mr-modal .jc-link.danger{color:#b3122b}
#mr-modal .jc-top{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
#mr-modal .jc-msg{font-size:12.5px;font-weight:700;color:#15803d}
#mr-modal .jc-warn{font-size:12.5px;color:#b45309}
#mr-modal .jc-pick{display:flex;align-items:center;gap:10px;border:1px solid #e2e8f2;border-radius:9px;padding:9px 12px;background:#fff;flex-wrap:wrap}
#mr-modal .jc-pick.is-on{border-color:#171F69;background:#f5f8fd}
#mr-modal .jc-pick input[type=checkbox]{width:17px;height:17px;accent-color:#171F69}
#mr-modal .jc-pick-name{font-weight:700;font-size:13.5px;color:#171F69}
#mr-modal .jc-pick-desc{font-size:11.5px;color:#5a6480}
#mr-modal .jc-pick-lbl{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;color:#5a6480}
#mr-modal .jc-in{padding:7px 9px;border:1px solid #cdd6e4;border-radius:6px;font:inherit;font-size:13px}
#mr-modal .jc-order{font-weight:800;color:#fff;background:#171F69;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px}
#mr-modal .jc-arrow{border:1px solid #cdd6e4;background:#fff;border-radius:5px;width:26px;height:26px;cursor:pointer;color:#171F69}
#mr-modal .jc-arrow:disabled{opacity:.35;cursor:default}
#mr-modal details.jc-more summary{cursor:pointer;font-weight:700;color:#00789b;font-size:13px;margin:4px 0 10px}
`;
function ensureCss() {
  if (document.getElementById('jc-ui-css')) return;
  const st = document.createElement('style'); st.id = 'jc-ui-css'; st.textContent = UI_CSS; document.head.appendChild(st);
}

function chipsFor(cfg) {
  return cfg.columns.map((c) => `<span class="jc-chip">${esc(c.label)}<i>${esc(kindOf(c).tag)}</i></span>`).join('');
}

function renderList() {
  ensureCss();
  const m = modal();
  const card = (d) => {
    const std = !!d.builtin;
    const same = !std && sameConfig(d.config, JC_BUILTIN.config);
    const sub = std ? 'The standard report. Always available; it cannot be changed.'
      : `Your version · saved ${esc(when(d.updatedAt))}${same ? ' · <span class="jc-warn">no changes from the standard report yet</span>' : ''}`;
    return `<div class="jc-card${std ? ' is-std' : ''}">
      <div class="jc-card-main">
        <div class="jc-name">${esc(d.name)}</div>
        <div class="jc-sub">${sub}</div>
        <div class="jc-chips">${chipsFor(d.config)}</div>
      </div>
      <div class="jc-acts">
        ${std ? `<button class="jc-link" onclick="window._jcDuplicate('${esc(d.id)}')">Make my own version</button>`
          : `<button class="jc-link" onclick="window._jcEdit('${esc(d.id)}')">Change</button>
             <button class="jc-link danger" onclick="window._jcDelete('${esc(d.id)}')">Delete</button>`}
        <button class="mr-btn mr-btn-p" onclick="window._jcGenerate('${esc(d.id)}')">Generate report</button>
      </div>
    </div>`;
  };
  const tableMissing = JC.loadErr && /report_definitions/.test(JC.loadErr) && /does not exist/.test(JC.loadErr);
  m.innerHTML = `
  <div class="mr-overlay" onclick="if(event.target===this)window._jcClose()">
    <div class="mr-dialog" role="dialog" aria-label="Comparison reports">
      <div class="mr-head">
        <div><div class="mr-eyebrow">Reports</div><h2 class="mr-title">Comparison reports</h2>
          <div class="mr-soft">Side-by-side comparison of proposals and real seasons: entries, athletes, Junior Nationals field and entry income. Numbers are recalculated from live data every time you generate.</div></div>
        <button class="mr-x" onclick="window._jcClose()" aria-label="Close">✕</button>
      </div>
      <div class="mr-body">
        <div class="jc-top">
          <button class="mr-btn" onclick="window._jcNew()">+ New comparison</button>
          ${JC.msg ? `<span class="jc-msg">${esc(JC.msg)}</span>` : ''}
          ${JC.loadErr ? `<span class="jc-warn">${tableMissing ? 'Saved versions are not available yet. The standard report works now.' : 'Saved versions could not be loaded: ' + esc(JC.loadErr)}</span>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">${allDefs().map(card).join('')}</div>
      </div>
    </div>
  </div>`;
}

function renderEditor() {
  ensureCss();
  const d = JC.editing; const c = d.config;
  const picked = new Map(c.columns.map((col, i) => [colKey(col), i]));
  const row = (ch) => {
    const i = picked.has(colKey(ch)) ? picked.get(colKey(ch)) : -1;
    const on = i >= 0;
    const k = kindOf(ch);
    return `<div class="jc-pick${on ? ' is-on' : ''}">
      <input type="checkbox" ${on ? 'checked' : ''} onchange="window._jcToggle('${esc(colKey(ch))}', this.checked)" aria-label="${esc(ch.name)}">
      ${on ? `<span class="jc-order" title="Column ${i + 1}">${i + 1}</span>` : ''}
      <div style="min-width:0;flex:1 1 260px"><div class="jc-pick-name">${esc(ch.name)}</div><div class="jc-pick-desc">${esc(k.tag)} — ${esc(k.desc)}</div></div>
      ${on ? `<label class="jc-pick-lbl">Column heading <input class="jc-in" style="width:190px" value="${esc(c.columns[i].label)}" oninput="window._jcColLabel(${i}, this.value)"></label>
        <button class="jc-arrow" ${i === 0 ? 'disabled' : ''} onclick="window._jcColMove(${i}, -1)" title="Move this column left">←</button>
        <button class="jc-arrow" ${i === c.columns.length - 1 ? 'disabled' : ''} onclick="window._jcColMove(${i}, 1)" title="Move this column right">→</button>` : ''}
    </div>`;
  };
  const missing = c.columns.filter((col) => col.type === 'scenario' && !JC.scenarios.some((s) => s.id === col.scenarioId));
  const dirtyNote = (() => { try { const B = window.__BOUNDARY && window.__BOUNDARY.S; return B && B.dirty ? ` “${esc(B.scenarioName || 'The proposal open in Boundary Studio')}” has unsaved changes; the report uses its last saved version.` : ''; } catch (_) { return ''; } })();
  const allOn = c.sections.length === JC_SECTIONS.length;
  const m = modal();
  m.innerHTML = `
  <div class="mr-overlay">
    <div class="mr-dialog" role="dialog" aria-label="Set up comparison">
      <div class="mr-head">
        <div><div class="mr-eyebrow">Comparison reports · ${d.isNew ? 'new' : 'change'}</div>
          <h2 class="mr-title">${d.isNew ? 'Set up a comparison' : 'Change this comparison'}</h2></div>
        <button class="mr-x" onclick="window._jcBack()" aria-label="Back">✕</button>
      </div>
      <div class="mr-body">
        <div class="mr-step"><div class="mr-step-n">1</div><div class="mr-step-c">
          <div class="mr-step-h">Name it</div>
          <input class="jc-in" style="width:100%;max-width:520px" value="${esc(d.name)}" placeholder="e.g. Board packet — October" oninput="window._jcSet('name', this.value)">
        </div></div>
        <div class="mr-step"><div class="mr-step-n">2</div><div class="mr-step-c">
          <div class="mr-step-h">Tick what to compare</div>
          <p class="mr-soft" style="margin:-4px 0 8px">Each ticked item becomes a column, in the order shown by the number. Proposals come from Boundary Studio (counties assigned, then Save).${dirtyNote}</p>
          ${missing.length ? `<p class="jc-warn">${missing.length === 1 ? 'One column uses a proposal that no longer exists' : missing.length + ' columns use proposals that no longer exist'}; untick ${missing.length === 1 ? 'it' : 'them'} below.</p>` : ''}
          <div style="display:flex;flex-direction:column;gap:6px">
            ${choices().map(row).join('')}
            ${missing.map((col) => row({ type: 'scenario', scenarioId: col.scenarioId, name: `${col.label} (scenario deleted)`, label: col.label })).join('')}
          </div>
        </div></div>
        <div class="mr-step"><div class="mr-step-n">3</div><div class="mr-step-c">
          <div class="mr-step-h">Tick what to include</div>
          <p class="mr-soft" style="margin:-4px 0 8px"><button class="jc-link" onclick="window._jcAllSections(${allOn ? 'false' : 'true'})">${allOn ? 'Clear all' : 'Include everything'}</button></p>
          <div class="mr-sections">${JC_SECTIONS.map((s) => {
            const on = c.sections.includes(s.id);
            return `<label class="mr-secopt ${on ? 'is-on' : ''}"><input type="checkbox" ${on ? 'checked' : ''} onchange="window._jcSection('${s.id}', this.checked)">
              <span><div class="mr-secopt-n">${esc(s.label)}</div><div class="mr-secopt-d">${esc(s.desc)}</div></span></label>`;
          }).join('')}</div>
        </div></div>
        <details class="jc-more"><summary>More options — title, subtitle, membership year</summary>
          <div class="mr-fgrp"><div class="mr-flbl">Title printed on the report</div><input class="jc-in" style="width:100%" value="${esc(c.title)}" oninput="window._jcSetCfg('title', this.value)"></div>
          <div class="mr-fgrp"><div class="mr-flbl">Subtitle</div><input class="jc-in" style="width:100%" value="${esc(c.subtitle || '')}" oninput="window._jcSetCfg('subtitle', this.value)"></div>
          <div class="mr-fgrp"><div class="mr-flbl">Membership year for eligible members</div>
            <div class="mr-chips">${MEMBER_YEARS.map((y) => `<button class="mr-chip sm ${+c.membershipYear === y ? 'is-on' : ''}" onclick="window._jcSetCfg('membershipYear', ${y}, true)">${y}</button>`).join('')}</div></div>
        </details>
      </div>
      <div class="mr-foot">
        <button class="mr-btn" onclick="window._jcBack()">Cancel</button>
        <span class="jc-warn">${esc(JC.msg || '')}</span>
        <span class="mr-soft" style="margin-left:auto">${c.columns.length} column${c.columns.length === 1 ? '' : 's'} · ${c.sections.length} of ${JC_SECTIONS.length} sections</span>
        <button class="mr-btn" onclick="window._jcSave(false)">Save</button>
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
window._jcNew = () => {
  JC.editing = { id: newId(), name: '', isNew: true, config: Object.assign(clone(JC_BUILTIN.config), { columns: [], title: 'Junior Circuit Comparison', subtitle: '' }) };
  JC.msg = ''; renderEditor();
};
window._jcDuplicate = (id) => {
  const src = findDef(id); if (!src) return;
  JC.editing = { id: newId(), name: '', config: clone(src.config), isNew: true };
  JC.msg = ''; renderEditor();
};
window._jcEdit = (id) => { const src = findDef(id); if (!src || src.builtin) return; JC.editing = clone(src); JC.msg = ''; renderEditor(); };
window._jcDelete = async (id) => {
  const d = findDef(id); if (!d || d.builtin) return;
  if (!window.confirm(`Delete “${d.name}”? The standard report is not affected.`)) return;
  try { await deleteDef(id); await loadLists(); JC.msg = `Deleted “${d.name}”.`; } catch (e) { JC.msg = 'Delete failed: ' + (e.message || e); }
  renderList();
};
window._jcSet = (k, v) => { JC.editing[k] = v; };
window._jcSetCfg = (k, v, redraw) => { JC.editing.config[k] = v; if (redraw) renderEditor(); };
window._jcSection = (id, on) => {
  const s = new Set(JC.editing.config.sections); if (on) s.add(id); else s.delete(id);
  JC.editing.config.sections = JC_SECTIONS.map((x) => x.id).filter((x) => s.has(x));
  renderEditor();
};
window._jcAllSections = (on) => { JC.editing.config.sections = on ? JC_SECTIONS.map((x) => x.id) : []; renderEditor(); };
window._jcToggle = (key, on) => {
  const cols = JC.editing.config.columns;
  const i = cols.findIndex((c) => colKey(c) === key);
  if (!on) { if (i >= 0) cols.splice(i, 1); }
  else if (i < 0) {
    const ch = choices().find((x) => colKey(x) === key);
    if (ch) cols.push(ch.type === 'scenario' ? { type: 'scenario', scenarioId: ch.scenarioId, label: ch.label } : { type: 'structure', year: ch.year, label: ch.label });
  }
  renderEditor();
};
window._jcColLabel = (i, v) => { JC.editing.config.columns[i].label = v; };
window._jcColMove = (i, dir) => {
  const a = JC.editing.config.columns; const j = i + dir; if (j < 0 || j >= a.length) return;
  [a[i], a[j]] = [a[j], a[i]]; renderEditor();
};
window._jcSave = async (andGenerate) => {
  const d = JC.editing;
  const problems = [];
  if (!d.name || !d.name.trim()) problems.push('give it a name');
  if (!d.config.columns.length) problems.push('tick at least one thing to compare');
  if (d.config.columns.some((c) => !String(c.label || '').trim())) problems.push('give every column a heading');
  if (d.config.columns.some((c) => c.type === 'scenario' && !JC.scenarios.some((s) => s.id === c.scenarioId))) problems.push('untick the deleted scenario');
  if (!d.config.sections.length) problems.push('tick at least one section');
  const dup = JC.defs.find((x) => x.id !== d.id && x.name.trim().toLowerCase() === String(d.name || '').trim().toLowerCase());
  if (dup) problems.push('pick a name that isn’t already used');
  if (problems.length) { JC.msg = 'Before saving: ' + problems.join(', ') + '.'; renderEditor(); return; }
  try {
    await saveDef({ id: d.id, name: d.name, config: d.config });
  } catch (e) { JC.msg = 'Save failed: ' + (e.message || e); renderEditor(); return; }
  const id = d.id;
  await loadLists();
  JC.editing = null;
  JC.msg = `Saved “${d.name.trim()}”.`;
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
      <button onclick="document.getElementById('mr-output').remove(); window._jcOpen()">← All comparison reports</button>
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
  if (sub) sub.innerHTML += `<br>Generated ${esc(new Date(r.generatedAt).toLocaleString())} from live data (DiveMeets results, USA Diving membership, saved Boundary Studio proposals)`
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
const noNat = (c) => `<span class="mr-soft">not in this proposal (ends at ${esc(stage(c.endsAt || ''))})</span>`;

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
      ${b.ewcBelowBar ? row('East, West, Central — 4th–6th, below the average score (entered another way)', b.ewcBelowBar) : ''}
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
  if (c26 && sc.length) {
    const basis = sc[0].seedBasis;
    html += `<h3 class="mr-h3">What the proposals' first stop assumes</h3>
    <p class="mr-p">A single first stop is mandatory for every age group, Groups C and D included. ${basis === 'combined'
      ? `It is seeded with every athlete who competed in each event at 2026 Regionals or Zones, counted once per event: ${n(c26.firstStops.eventEntries)} event entries (${n(c26.firstStops.uniqueAthletes)} unique athletes) in 2026 results.`
      : `It is seeded from 2026 Regionals for Group A/B springboard and from 2026 Zones for platform and Groups C/D. In 2026, ${n(c26.firstStops.eventEntries)} event entries (${n(c26.firstStops.uniqueAthletes)} unique athletes) were competed at Regionals, Zones or both.`}
    Projected first stop: ${sc.map((c) => `${esc(c.label)} ${n(c.tiers[0].eventEntries)} event entries, ${n(c.tiers[0].uniqueAthletes)} unique athletes`).join('; ')}. The projection counts only athletes whose home county is on file (about 98% of 2026 entries).</p>`;
  }
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
