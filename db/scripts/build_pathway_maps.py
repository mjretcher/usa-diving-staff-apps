#!/usr/bin/env python3
"""
Build boundary-studio/junior-pathway-2027-maps.json: the county map plus, for
each 2027 proportional-qualification scenario, its county->Region assignment and
dissolved Region and Zone outlines (shapely union of the county shapes), so the
report can draw Zone boundaries without shipping a geometry library.

Inputs: membership-analytics/boundary-data.json (county paths, 2026 athletes per
county) and a JSON export of the scenarios from membership.boundary_scenarios
({id: {name, regions:[{name,color}], assign, levels}}), passed as argv[1].
Solid counties = 2026 USA Diving athletes (stats[f].y26.a > 0).
"""
import json, re, sys
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.validation import make_valid

B = json.load(open('membership-analytics/boundary-data.json'))
S = json.load(open(sys.argv[1]))

def parse(d):
    out = []
    for sub in re.split(r'(?=M)', d):
        pts = [tuple(map(float, p.split(','))) for p in re.findall(r'-?\d+\.?\d*,-?\d+\.?\d*', sub)]
        if len(pts) >= 3:
            out.append(pts)
    return out

geo = {}
for c in B['counties']:
    ps = []
    for pts in parse(c['d']):
        p = Polygon(pts)
        ps.append(p if p.is_valid else make_valid(p))
    geo[c['f']] = unary_union(ps).buffer(0.05)   # closes hairline gaps between neighbours

def to_path(g):
    out = []
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        if p.geom_type != 'Polygon' or p.area < 0.5:
            continue
        for ring in [p.exterior] + list(p.interiors):
            out.append('M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in ring.coords) + 'Z')
    return ''.join(out)

def label_pt(g):
    big = max((g.geoms if hasattr(g, 'geoms') else [g]), key=lambda p: p.area)
    pt = big.representative_point()
    return [round(pt.x, 1), round(pt.y, 1)]

res = {'viewBox': B['viewBox'],
       'counties': [{'f': c['f'], 'd': c['d'], 'a': 1 if B['stats'].get(c['f'], {}).get('y26', {}).get('a', 0) > 0 else 0}
                    for c in B['counties']],
       'scenarios': {}}
for sid, sc in S.items():
    A, of = sc['assign'], sc['levels'][1]['of']
    regs, zones = [], []
    for ri, r in enumerate(sc['regions']):
        g = unary_union([geo[f] for f, v in A.items() if v == ri and f in geo]).buffer(0)
        regs.append({'name': r['name'], 'color': r['color'], 'zone': of[ri], 'outline': to_path(g.simplify(0.25)), 'label': label_pt(g)})
    for zi, z in enumerate(sc['levels'][1]['groups']):
        g = unary_union([geo[f] for f, v in A.items() if v is not None and v >= 0 and of[v] == zi and f in geo]).buffer(0)
        zones.append({'name': z['name'], 'outline': to_path(g.simplify(0.35)), 'label': label_pt(g),
                      'regions': [i for i, x in enumerate(of) if x == zi]})
    res['scenarios'][sid] = {'name': sc['name'], 'assign': A, 'regions': regs, 'zones': zones}
json.dump(res, open('boundary-studio/junior-pathway-2027-maps.json', 'w'), separators=(',', ':'))
print('wrote', len(res['scenarios']), 'scenarios')
