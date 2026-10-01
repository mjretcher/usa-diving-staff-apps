#!/usr/bin/env python3
"""
build_fee_review.py -- every option priced on the same fee card.

Why: each option is priced at the 2026 fee card for the kind of meet each stop is.
The CCE Submission's stops are Zones ($90 every entry), East/West/Central ($115)
and Nationals ($125) -- set explicitly on its stored scenario on 2026-10-01. The
proportional options' stops are Regionals ($85 Group A/B springboard, $45 Group
C/D and platform), Zones ($90) and Nationals ($125). The difference in income is
partly where each structure's stops sit on that card.

This prices every option on two common cards, with the same per-entry costs
($25 to hosts, $4.95 DiveMeets):
  same card -- stop 1: $85 A/B springboard, $45 C/D and platform; stop 2: $90;
               Junior Nationals: $125 (the proportional options' own card).
  CCE card  -- stop 1: $90 every entry; stop 2: $115; Junior Nationals: $125
               (the CCE Submission's own 2026 fees, applied stop for stop).
Entries are the stored projections (junior-pathway-2027-data.json); the CCE
first-stop split is the real 2026 first-stop pool it is seeded from.
Writes boundary-studio/junior-pathway-2027-fees.json.
"""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
HOST, DM = 25, 4.95
d = json.loads((ROOT / 'boundary-studio' / 'junior-pathway-2027-data.json').read_text())
adv = json.loads((ROOT / 'membership-analytics' / 'advance-data.json').read_text())
pool = adv['pools']['2026|FirstStop']
cce_ab = sum(v for cs in pool.values() for c, v in cs.items() if c[0] in 'AB' and c[2] != 'P')
out = {'cards': {'same': {'stop1AB': 85, 'stop1Other': 45, 'stop2': 90, 'nats': 125},
                 'cce': {'stop1': 90, 'stop2': 115, 'nats': 125}},
       'costPerEntry': {'hosts': HOST, 'diveMeets': DM}, 'scenarios': {}}
for s in d['scenarios']:
    t = s['tiers']; e1, e2, e3 = t[0]['entries'], t[1]['entries'], t[-1]['entries']; n = e1 + e2 + e3
    if s['kind'] == 'pq':
        ab = int(s['feeSplit']['85'])
    else:
        ab = round(cce_ab)
    other = e1 - ab
    def price(g):
        cost = n * (HOST + DM)
        return {'gross': round(g), 'costs': round(cost), 'usad': round(g - cost)}
    same = price(ab * 85 + other * 45 + e2 * 90 + e3 * 125)
    ccec = price(e1 * 90 + e2 * 115 + e3 * 125)
    out['scenarios'][s['id']] = {'label': s['label'], 'entries': [e1, e2, e3], 'stop1Split': {'ab': ab, 'other': other},
                                 'asModelled': {'gross': s['gross'], 'usad': s['usad']}, 'sameCard': same, 'cceCard': ccec}
    print(f"{s['label'][:34]:34} entries {n:,} | modelled ${s['gross']:,} / ${s['usad']:,} | same card ${same['gross']:,} / ${same['usad']:,} | CCE card ${ccec['gross']:,} / ${ccec['usad']:,}")
(ROOT / 'boundary-studio' / 'junior-pathway-2027-fees.json').write_text(json.dumps(out, separators=(',', ':')))
