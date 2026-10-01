#!/usr/bin/env python3
"""
build_pathway_seasons.py -- the proportional-qualification scenarios, run
against real past seasons, stop by stop and area by area.

Writes boundary-studio/junior-pathway-2027-seasons.json for section 04 of
the 2027 Junior Circuit report (junior-circuit-2027/index.html).

Method
  1. Boundary Studio's own engine projects each stored scenario
     (bs-pathway27-12-6-1, bs-pathway27-10-5-1) over the real 2025 and 2026
     fields (BoundaryAPI.withYear + BoundaryAPI.pathway, headless Chromium,
     the page served from this repo). Nothing is re-implemented here.
  2. The real outcome for the same counties comes from
     membership-analytics/advance-data.json (the pools the engine seeds from),
     summed by the scenario's own county -> Region -> Zone assignment.
  3. Whole numbers: each event at each meet is rounded, as billed entries are
     (same totals as the report). Flows between meets are allocated to those
     whole numbers by largest remainder, so every table adds up exactly.

Nothing is written to the database or to any scenario.

Usage (from the repo root):
  python3 boundary-studio/tools/build_pathway_seasons.py
Requires: playwright (python) with Chromium.
"""
from __future__ import annotations
import json, subprocess, sys, time, math
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'boundary-studio' / 'junior-pathway-2027-seasons.json'
SCENARIOS = [('bs-pathway27-12-6-1', '12-6-1 Proportional Qualification'),
             ('bs-pathway27-10-5-1', '10-5-1 Proportional Qualification')]
YEARS = {'y25': '2025', 'y26': '2026'}
PORT = 8767

EXTRACT = r"""
async () => {
  const API = window.BoundaryAPI, Q = window.QualRouting;
  const CELLS = []; ['A','B','C','D'].forEach(a=>['B','G'].forEach(g=>['1','3','P'].forEach(d=>CELLS.push(a+g+d))));
  const sc = API.scenario();
  const run = async (y) => API.withYear(y, () => {
    const res = API.pathway(); if (!res) return null;
    const R = API.routing(), LV = API.levels(), out = {levels: []};
    for (let L = 0; L < R.length; L++){
      const n = L === 0 ? API.regions().length : (LV[L].groups || []).length;
      const groups = [];
      for (let g = 0; g < n; g++){ const c = {}; CELLS.forEach(k => { const v = Q.entriesCellAt(res, L, g, k); if (v > 1e-9) c[k] = v; }); groups.push(c); }
      out.levels.push({groups});
    }
    out.flows = res.flows.map(f => ({fl:f.fromLevel, fg:f.fromGroup, tl:f.toLevel, tr:f.toRound, tg:f.toGroup, c:f.cell, n:f.n, a:f.arrived}));
    out.problems = res.problems.map(p => p.msg);
    return out;
  });
  const out = {id: sc.id, name: sc.name, dirty: sc.dirty,
    regions: API.regions().map(r => ({name: r.name, color: r.color})), assign: API.assign(),
    levels: API.levels().map(l => ({name: l.name, of: l.of || null, groups: (l.groups || []).map(g => g.name)})),
    routing: API.routing()};
  for (const y of %s) out[y] = await run(y);
  return out;
}
""" % json.dumps(list(YEARS))


def extract():
    from playwright.sync_api import sync_playwright
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=ROOT,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    got = {}
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1500, 'height': 1000})
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: d.accept())
            pg.goto(f'http://localhost:{PORT}/boundary-studio/index.html', wait_until='networkidle', timeout=150000)
            pg.wait_for_timeout(6000)
            for sid, label in SCENARIOS:
                pg.evaluate("(document.getElementById('atlPropOpen')||document.getElementById('atlMenuOpen')).click()")
                pg.wait_for_timeout(3000)
                loc = pg.locator(f':not(option):not(select) >> text=/{label}/')
                for i in range(loc.count()):
                    if loc.nth(i).is_visible(): loc.nth(i).click(); break
                pg.wait_for_timeout(14000)
                d = pg.evaluate(EXTRACT)
                if d['id'] != sid or d['dirty']:
                    raise SystemExit(f'loaded {d["id"]} (dirty={d["dirty"]}), expected clean {sid}')
                got[sid] = d
            if errs: raise SystemExit('page errors: ' + '; '.join(errs[:3]))
            b.close()
    finally:
        srv.terminate()
    return got


def lr_alloc(total: int, weights: list[float]) -> list[int]:
    """Largest-remainder split of an integer total in proportion to weights."""
    s = sum(weights)
    if total <= 0 or s <= 0: return [0] * len(weights)
    raw = [total * w / s for w in weights]
    base = [math.floor(x) for x in raw]
    for i in sorted(range(len(raw)), key=lambda i: raw[i] - base[i], reverse=True)[:total - sum(base)]:
        base[i] += 1
    return base


def build(d, y, pools):
    yr = YEARS[y]; P = d[y]
    if P is None or P['problems']: raise SystemExit(f'{d["id"]} {y}: projection problems {P and P["problems"]}')
    rn = [r['name'] for r in d['regions']]; of = d['levels'][1]['of']; zn = d['levels'][1]['groups']
    nR, nZ = len(rn), len(zn)
    cells = sorted({c for L in P['levels'] for g in L['groups'] for c in g}
                   | {c for k in ('Regionals', 'Zones', 'Nationals', 'FirstStop') for f in pools.get(f'{yr}|{k}', {}).values() for c in f})
    rint = lambda v: int(math.floor(v + 0.5)) if v >= 0.5 else 0
    first = [{c: rint(g.get(c, 0)) for c in cells} for g in P['levels'][0]['groups']]
    zone = [{c: rint(g.get(c, 0)) for c in cells} for g in P['levels'][1]['groups']]
    jn = {c: rint(P['levels'][2]['groups'][0].get(c, 0)) for c in cells}

    # Region -> Zone (springboard; platform enters Zones by open entry).
    r2z = [{c: 0 for c in cells} for _ in rn]; spots = [{c: 0.0 for c in cells} for _ in rn]
    openZ = [{c: 0 for c in cells} for _ in zn]
    for zi in range(nZ):
        regs = [ri for ri in range(nR) if of[ri] == zi]
        for c in cells:
            w = [sum(f['a'] for f in P['flows'] if f['fl'] == 0 and f['tl'] == 1 and f['fg'] == ri and f['c'] == c) for ri in regs]
            tot = zone[zi][c]
            if sum(w) > 0:
                for ri, v in zip(regs, lr_alloc(tot, w)): r2z[ri][c] = v
            else:
                openZ[zi][c] = tot
    for f in P['flows']:
        if f['fl'] == 0 and f['tl'] == 1: spots[f['fg']][f['c']] += f['n']

    # Zone -> Junior Nationals, allocated to the billed Nationals field per event.
    z2j = [{c: 0 for c in cells} for _ in zn]; semi = [{c: 0 for c in cells} for _ in zn]
    for c in cells:
        w = [sum(f['a'] for f in P['flows'] if f['fl'] == 1 and f['tl'] == 2 and f['fg'] == zi and f['c'] == c) for zi in range(nZ)]
        for zi, v in zip(range(nZ), lr_alloc(jn[c], w)): z2j[zi][c] = v
        for zi in range(nZ):
            semi[zi][c] = sum(f['n'] for f in P['flows'] if f['fl'] == 1 and f['tl'] == 2 and f['tr'] == 'semi' and f['fg'] == zi and f['c'] == c)

    # What really happened, same counties, same assignment.
    def actual(stage):
        pool = pools.get(f'{yr}|{stage}')
        if pool is None: return None
        reg = [{c: 0 for c in cells} for _ in rn]
        for fips, cs in pool.items():
            ri = d['assign'].get(fips)
            if ri is None or not (0 <= ri < nR): continue
            for c, v in cs.items(): reg[ri][c] = reg[ri].get(c, 0) + v
        return [{c: int(round(v)) for c, v in r.items()} for r in reg]
    act = {k: actual(k) for k in ('Regionals', 'Zones', 'EWC', 'Nationals')}

    regions = [{'name': rn[i], 'color': d['regions'][i]['color'], 'zone': zn[of[i]],
                'first': first[i], 'toZone': r2z[i], 'spots': {c: round(v, 2) for c, v in spots[i].items() if v},
                'actual': {k: (v[i] if v else None) for k, v in act.items()}} for i in range(nR)]
    zones = [{'name': zn[z], 'regions': [rn[i] for i in range(nR) if of[i] == z], 'field': zone[z], 'open': openZ[z],
              'toJN': z2j[z], 'semi': {c: round(v, 2) for c, v in semi[z].items() if v},
              'actual': {k: ({c: sum(v[i].get(c, 0) for i in range(nR) if of[i] == z) for c in cells} if v else None) for k, v in act.items()}}
             for z in range(nZ)]

    # Checks: every table adds up to the engine's billed stop totals.
    S = lambda rows: sum(sum(r.values()) for r in rows)
    checks = [
        ('Regions add to first stop', S(first), S([{c: rint(v) for c, v in g.items()} for g in P['levels'][0]['groups']])),
        ('Region sends + platform open entry = Zone fields', S(r2z) + S(openZ), S(zone)),
        ('Zone sends = Junior Nationals field', S(z2j), sum(jn.values())),
    ]
    for lab, a, b in checks:
        if a != b: raise SystemExit(f'{d["id"]} {y}: check failed: {lab} ({a} vs {b})')
    real_tot = {k: (sum(sum(r.values()) for r in v) if v else None) for k, v in act.items()}
    return {'cells': cells, 'regions': regions, 'zones': zones, 'jn': jn,
            'totals': {'first': S(first), 'zones': S(zone), 'jn': sum(jn.values()), 'actual': real_tot},
            'checks': [{'label': l, 'value': a, 'pass': True} for l, a, _ in checks]}


def main():
    adv = json.loads((ROOT / 'membership-analytics' / 'advance-data.json').read_text())
    raw = extract()
    out = {'generated': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
           'engine': 'Boundary Studio BoundaryAPI.pathway(), stored scenarios, withYear',
           'advanceData': adv.get('meta', {}).get('built'),
           'completeness': {k: v for k, v in adv.get('totals', {}).items() if k[:4] in YEARS.values()},
           'scenarios': {}}
    for sid, _ in SCENARIOS:
        d = raw[sid]
        out['scenarios'][sid] = {'name': d['name'], 'levels': [l['name'] for l in d['levels']],
                                 'years': {YEARS[y]: build(d, y, adv['pools']) for y in YEARS}}
        for yr, b in out['scenarios'][sid]['years'].items():
            print(f"{d['name'][:34]:34} {yr}: first {b['totals']['first']:,}  zones {b['totals']['zones']:,}  JN {b['totals']['jn']:,}  | real {b['totals']['actual']}")
    OUT.write_text(json.dumps(out, separators=(',', ':')))
    print('wrote', OUT.relative_to(ROOT), f'{OUT.stat().st_size/1024:.0f} KB')


if __name__ == '__main__':
    main()
