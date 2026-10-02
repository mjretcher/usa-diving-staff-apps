#!/usr/bin/env python3
"""
build_open_event.py -- the Junior Nationals Open, run against the real 2025 season.

Rule modelled: a diver who reaches Junior Nationals in one or two individual
events (of 1 m, 3 m, platform, in their age group) may enter the Open in the
event(s) they did not qualify for. Top 2 in each Open event earn a prelim spot.

Two bases, both from core.event_results (DiveMeets results):
  as run      -- who really competed at 2025 Junior Nationals.
  proportional-- the 55% Zone rule applied to the real 2025 Zone results
                 (fields of 3 or fewer all advance; Zone qualifiers limited to
                 58 / 46 per Group A/B springboard / platform event, i.e. 48 / 36
                 prelims plus the semifinal seeds; 50 / 38 Group C/D),
                 then 2026's measured 83.7% take-up, as in the engine.
"Likely" Open entries = eligible boards the diver had already dived at 2025
Zones; "eligible" = every board they could enter.

Writes boundary-studio/junior-pathway-2027-open.json. Reads only.
Usage: NEON_SQL_URL=... NEON_CONN=... python3 boundary-studio/tools/build_open_event.py
"""
import json, math, collections, re, os, urllib.request
from datetime import datetime, timezone
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
TAKE_UP = 0.837

def neon():
    url, cs = os.environ.get('NEON_SQL_URL'), os.environ.get('NEON_CONN')
    if not url or not cs:
        raise SystemExit('Set NEON_SQL_URL (https://<host>/sql) and NEON_CONN (postgresql://...) first.')
    def q(sql):
        r = urllib.request.Request(url, json.dumps({"query": sql, "params": []}).encode(),
                                   {"Content-Type": "application/json", "Neon-Connection-String": cs})
        return json.loads(urllib.request.urlopen(r, timeout=60).read())['rows']
    return q

def main():
    q = neon()
    Z = q("select diver_id_dm d, zone z, event_key e, round r, place p from core.event_results "
          "where year=2025 and stage='Zones' and is_junior_circuit and not is_synchro and event_key like 'Group%'")
    N = q("select distinct diver_id_dm d, event_key e from core.event_results "
          "where year=2025 and stage='Nationals' and not is_synchro and event_key like 'Group%'")
    board = lambda e: e.split()[-1]; grp = lambda e: ' '.join(e.split()[:3])
    ev = collections.defaultdict(dict)
    for r in Z:
        rr = (r['r'] or '').lower(); key = (0 if ('final' in rr and 'semi' not in rr) else 1, r['p'] if r['p'] is not None else 999)
        k = (r['z'], r['e'])
        if r['d'] not in ev[k] or key < ev[k][r['d']]: ev[k][r['d']] = key
    share = lambda f: f if f <= 3 else min(f, math.floor(0.55 * f + 0.5))
    def cap(e):
        g = e.split()[1]; plat = e.endswith('Platform')
        # Zone qualifiers only: Group A/B prelims keep 2 places for Open winners
        # (48 / 36 of 50 / 38), plus 10 straight to the semifinal.
        return (46 if plat else 58) if g in 'AB' else (38 if plat else 50)
    lists = collections.defaultdict(list)
    for (z, e), m in ev.items():
        ranked = [d for d, _ in sorted(m.items(), key=lambda x: x[1])]
        lists[e].append(ranked[:share(len(ranked))])
    pq = set()
    for e, ls in lists.items():
        tot = sum(map(len, ls)); c = cap(e)
        if tot <= c: take = [len(x) for x in ls]
        else:
            raw = [len(x) * c / tot for x in ls]; take = [math.floor(v) for v in raw]
            for i in sorted(range(len(raw)), key=lambda i: raw[i] - take[i], reverse=True)[:c - sum(take)]: take[i] += 1
        for x, n in zip(ls, take): pq |= {(d, e) for d in x[:n]}
    dove = {(r['d'], r['e']) for r in Z}

    def model(qset, scale):
        by = collections.defaultdict(set)
        for d, e in qset: by[(d, grp(e))].add(board(e))
        k = collections.Counter(len(b) for b in by.values())
        elig = 0; likely = collections.Counter(); ath = 0
        for (d, g), bs in by.items():
            if len(bs) in (1, 2):
                miss = [b for b in ('1M', '3M', 'Platform') if b not in bs]
                elig += len(miss)
                l = [b for b in miss if (d, f'{g} {b}') in dove]
                for b in l: likely[f'{g} {b}'] += 1
                ath += bool(l)
        r = lambda v: int(math.floor(v * scale + 0.5))
        ev_out = {e: r(v) for e, v in sorted(likely.items())}
        return {'entries': r(len(qset)), 'athletes': r(len(by)),
                'byQualified': {str(n): r(c) for n, c in sorted(k.items())},
                'eligible': r(elig), 'likely': sum(ev_out.values()), 'likelyAthletes': r(ath),
                'likelyAB': sum(v for e, v in ev_out.items() if e.split()[1] in 'AB'),
                'likelyCD': sum(v for e, v in ev_out.items() if e.split()[1] in 'CD'),
                'events': ev_out}
    out = {'generated': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'), 'season': 2025, 'takeUp': TAKE_UP,
           'asRun': model({(r['d'], r['e']) for r in N}, 1.0), 'proportional': model(pq, TAKE_UP)}
    p = ROOT / 'boundary-studio' / 'junior-pathway-2027-open.json'
    p.write_text(json.dumps(out, separators=(',', ':')))
    for k in ('asRun', 'proportional'):
        m = out[k]; print(k, {x: m[x] for x in ('entries', 'athletes', 'byQualified', 'eligible', 'likely', 'likelyAB', 'likelyCD')})

if __name__ == '__main__':
    main()
