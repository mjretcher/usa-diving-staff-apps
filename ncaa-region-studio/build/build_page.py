#!/usr/bin/env python3
"""Assemble ../index.html from template.html and the JSON inputs in this folder.
Run from this folder:  python3 build_page.py
Bump CFGV / NEONV when data/config.js or shared/neon-client.js get a new cache-bust string."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
CFGV, NEONV = '202607262115', '202609172030'
rd = lambda n: open(os.path.join(HERE, n), encoding='utf-8').read()
data = json.loads(rd('data.json')); presets = json.loads(rd('presets.json')); hosts = json.loads(rd('hosts.json'))
for k, p in presets.items():
    assert len(p['states']) == 51 and len(p['names']) == 5, k
page = (rd('template.html')
        .replace('/*DATA*/', json.dumps(data, separators=(',', ':')))
        .replace('/*PRESETS*/', json.dumps(presets, separators=(',', ':')))
        .replace('/*HOSTS*/', json.dumps(hosts, separators=(',', ':')))
        .replace('/*TOPO*/', rd('states-albers-10m.json'))
        .replace('__CFGV__', CFGV).replace('__NEONV__', NEONV))
assert '/*DATA*/' not in page and '__CFGV__' not in page
open(os.path.join(HERE, '..', 'index.html'), 'w', encoding='utf-8').write(page)
print('wrote index.html,', len(page), 'bytes,', len(data['schools']), 'schools')
