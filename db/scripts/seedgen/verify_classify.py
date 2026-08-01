#!/usr/bin/env python3
"""
Differential test: run classify.py over every seed row that has a matching
crawl event title, and compare field by field against what the seed already
says. Reports per-field agreement plus the specific title shapes that disagree.

The seed IS the ground truth here -- it is what the live apps read today.
"""
import sqlite3, collections, sys
sys.path.insert(0, "/tmp")
import classify

db = sqlite3.connect("/tmp/crawl.db")
db.row_factory = sqlite3.Row

rows = db.execute("""
SELECT e.title, p.result_set_id, p.gender, p.discipline, p.age_group,
       p.event_level, p.round_stage, p.is_synchronized, p.competition_group,
       p.meet_year, p.meet_id, COUNT(*) n
FROM seed_phases p JOIN divemeets_events e
  ON e.meet_id = p.meet_id AND e.event_id = p.event_id AND e.round = p.result_set_id
WHERE p.meet_id GLOB '[0-9]*'
GROUP BY 1,2,3,4,5,6,7,8,9,10,11
""").fetchall()

fields = ["gender", "discipline", "age_group", "event_level", "round_stage", "is_synchronized"]
agree = collections.Counter()
total = collections.Counter()
bad = collections.defaultdict(collections.Counter)

for r in rows:
    t = r["title"]
    got = {
        "gender": classify.gender(t),
        "discipline": classify.discipline(t),
        "age_group": classify.age_group(t),
        "event_level": classify.event_level(t, r["competition_group"]),
        "round_stage": classify.round_stage(r["result_set_id"]),
        "is_synchronized": "true" if classify.is_synchronized(t) else "false",
    }
    for f in fields:
        total[f] += r["n"]
        if got[f] == (r[f] or ""):
            agree[f] += r["n"]
        else:
            bad[f][(t, r[f] or "", got[f])] += r["n"]

print(f"{'field':<18}{'rows':>10}{'agree':>10}{'pct':>9}")
for f in fields:
    pct = 100.0 * agree[f] / total[f] if total[f] else 0
    print(f"{f:<18}{total[f]:>10}{agree[f]:>10}{pct:>8.2f}%")

for f in fields:
    if not bad[f]:
        continue
    print(f"\n=== {f}: top disagreements (seed -> mine) ===")
    for (t, want, got), n in bad[f].most_common(12):
        print(f"  {n:>7}  {t[:58]:<58} {want!r:>14} -> {got!r}")
