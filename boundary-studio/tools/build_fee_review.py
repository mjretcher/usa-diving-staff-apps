#!/usr/bin/env python3
"""
build_fee_review.py -- entry income for the committee report, on stated fee cards.

Proposed fees (2026-10-01, Mike Retcher):
  proportional options -- Regionals: $85 Group A/B springboard, $65 Group C
    springboard, $55 Group D springboard, $45 every non-qualifying event
    (platform at Regionals); Zones $90; Junior Nationals $125. Non-qualifying
    events are $45 at every stop (incl. the Junior Nationals Open).
  CCE Submission -- 2026 actual fees for its meet types, set explicitly on its
    stored scenario 2026-10-01: Zones $90 (every entry), E/W/C $115, Nationals $125.

Comparison cards (every option, stop for stop):
  proposedCard -- stop 1 $85 / $65 / $55 / $45 as above; stop 2 $90; Nationals $125.
  cceCard      -- stop 1 $90 every entry; stop 2 $115; Nationals $125.
Per-entry costs are the same everywhere: $25 to hosts, $4.95 DiveMeets.
Entries are the stored projections (junior-pathway-2027-data.json); first-stop
splits by age group / platform come from the 2026 fields the engine seeds from
(junior-pathway-2027-seasons.json for the proportional options; the 2026
first-stop pool for the CCE Submission). Membership sensitivity rescales the
first-stop mix to the smaller first stop.
Writes boundary-studio/junior-pathway-2027-fees.json.
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
HOST, DM = 25, 4.95
FEE1 = {'A': 85, 'B': 85, 'C': 65, 'D': 55, 'P': 45}
OPEN_FEE = 45
d = json.loads((ROOT / 'boundary-studio' / 'junior-pathway-2027-data.json').read_text())
se = json.loads((ROOT / 'boundary-studio' / 'junior-pathway-2027-seasons.json').read_text())
adv = json.loads((ROOT / 'membership-analytics' / 'advance-data.json').read_text())

def split_from_cells(cells_iter):
    t = {k: 0.0 for k in FEE1}
    for c, v in cells_iter:
        t['P' if c[2] == 'P' else c[0]] += v
    return t

cce_split = split_from_cells((c, v) for cs in adv['pools']['2026|FirstStop'].values() for c, v in cs.items())
out = {'proposed': {'stop1': FEE1, 'stop2': 90, 'nats': 125, 'nonQualifying': OPEN_FEE},
       'cards': {'proposed': {'stop1': FEE1, 'stop2': 90, 'nats': 125}, 'cce': {'stop1': 90, 'stop2': 115, 'nats': 125}},
       'costPerEntry': {'hosts': HOST, 'diveMeets': DM}, 'scenarios': {}}
for s in d['scenarios']:
    t = s['tiers']; e1, e2, e3 = t[0]['entries'], t[1]['entries'], t[-1]['entries']; n = e1 + e2 + e3
    if s['kind'] == 'pq':
        sp = split_from_cells((c, v) for r in se['scenarios'][s['id']]['years']['2026']['regions'] for c, v in r['first'].items())
    else:
        sp = dict(cce_split)
    tot = sum(sp.values()); sp = {k: v * e1 / tot for k, v in sp.items()}   # to the stored first-stop total
    stop1_prop = sum(sp[k] * FEE1[k] for k in sp)
    def price(g, entries=n):
        cost = entries * (HOST + DM)
        return {'gross': round(g), 'dm': round(entries * DM), 'hosts': round(entries * HOST), 'usad': round(g - cost)}
    prop_card = price(stop1_prop + e2 * 90 + e3 * 125)
    cce_card = price(e1 * 90 + e2 * 115 + e3 * 125)
    proposed = prop_card if s['kind'] == 'pq' else price(s['gross'])          # CCE: its 2026 actual fees
    sens = {}
    for k, v in (d.get('sensitivity') or {}).items():
        x = v.get(s['id'])
        if not x: continue
        f1, f2, f3 = x['entries']; m = f1 + f2 + f3
        g = (f1 * stop1_prop / e1 + f2 * 90 + f3 * 125) if s['kind'] == 'pq' else x['gross']
        sens[k] = price(g, m)
    out['scenarios'][s['id']] = {'label': s['label'], 'kind': s['kind'], 'entries': [e1, e2, e3],
                                 'stop1Split': {k: round(v) for k, v in sp.items()},
                                 'storedEngine': {'gross': s['gross'], 'usad': s['usad']},
                                 'proposed': proposed, 'proposedSensitivity': sens,
                                 'proposedCard': prop_card, 'cceCard': cce_card}
    print(f"{s['label'][:34]:34} n={n:,} proposed ${proposed['gross']:,}/${proposed['usad']:,} | card1 ${prop_card['gross']:,}/${prop_card['usad']:,} | cce card ${cce_card['gross']:,}/${cce_card['usad']:,} | sens {[(k,v['usad']) for k,v in sens.items()]}")
(ROOT / 'boundary-studio' / 'junior-pathway-2027-fees.json').write_text(json.dumps(out, separators=(',', ':')))
