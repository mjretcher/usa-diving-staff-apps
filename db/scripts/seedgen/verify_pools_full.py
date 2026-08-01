#!/usr/bin/env python3
"""
End-to-end pool invariance test.

Runs the FULL regeneration path -- meetclass for competition_family /
competition_group / ncaa_division, classify for the event-level fields -- over
every seed row, then evaluates the three POOLS[*].match() predicates
transcribed from criteria-simulator/main.js against the row as it exists today
versus the row as the generator would write it.

Any flip here is a silent change to the standards the HP Director sets, so
this is the gate: generation does not ship unless the only flips are ones that
were explicitly signed off.
"""
import sqlite3, collections, sys
sys.path.insert(0, "/tmp")
import classify, meetclass

db = sqlite3.connect("/tmp/crawl.db")
db.row_factory = sqlite3.Row


def pool_senior_usa(r):
    return r["competition_family"] == "USA Diving" and r["event_level"] in ("Senior", "Senior/Open")


def pool_ncaa(r):
    return r["competition_family"] == "NCAA"


def pool_junior_ab(r):
    if r["competition_family"] != "USA Diving":
        return False
    if r["competition_group"] != "USA Diving Junior Nationals":
        return False
    if r["is_synchronized"] == "true":
        return False
    if r["age_group"] in ("Group A", "Group B"):
        return True
    if r["age_group"]:
        return False
    en = r["event_round"] or ""
    return ("16-18" in en) or ("14-15" in en)


POOLS = {"seniorUsa": pool_senior_usa, "ncaa": pool_ncaa, "juniorAB": pool_junior_ab}

rows = db.execute("""
SELECT p.meet_id, p.event_id, p.result_set_id, e.title, m.meet_name AS crawl_name, m.sanction,
       p.competition_family, p.competition_group, p.event_level, p.age_group,
       p.is_synchronized, p.event_round
FROM seed_phases p
JOIN divemeets_events e ON e.meet_id=p.meet_id AND e.event_id=p.event_id AND e.round=p.result_set_id
JOIN divemeets_meets m ON m.meet_id=p.meet_id
WHERE p.meet_id GLOB '[0-9]*'
""").fetchall()

flips = collections.defaultdict(collections.Counter)
before_n, after_n = collections.Counter(), collections.Counter()

for r in rows:
    t, mid, cn, sanc = r["title"], r["meet_id"], r["crawl_name"], r["sanction"]
    fam = meetclass.competition_family(mid, cn, sanc)
    grp = meetclass.competition_group(mid, cn, sanc)
    after = {
        "competition_family": fam,
        "competition_group": grp,
        "event_level": classify.event_level(t, grp, cn, fam),
        "age_group": classify.age_group(t),
        "is_synchronized": "true" if classify.is_synchronized(t) else "false",
        "event_round": t,
    }
    for name, fn in POOLS.items():
        b, a = fn(r), fn(after)
        before_n[name] += b
        after_n[name] += a
        if b != a:
            flips[name][(t, "IN->OUT" if b else "OUT->IN")] += 1

print(f"{'pool':<12}{'before':>10}{'after':>10}{'delta':>10}")
for name in POOLS:
    print(f"{name:<12}{before_n[name]:>10}{after_n[name]:>10}{after_n[name]-before_n[name]:>+10}")

total = sum(sum(c.values()) for c in flips.values())
print(f"\nTOTAL membership flips: {total}")
for name, c in flips.items():
    if not c:
        continue
    print(f"\n=== {name}: {sum(c.values())} flipped ===")
    for (t, d), n in c.most_common(12):
        print(f"  {n:>6}  {d:<8} {t[:62]}")
