#!/usr/bin/env python3
"""
The safety-critical test.

Standards Studio gates every evaluation through POOLS[*].match(row) in
criteria-simulator/main.js. If regenerating the seed changes which rows a pool
admits, the HP Director's standards silently move. This reimplements the three
match() predicates exactly as they are written in main.js today, runs them over
the seed as it currently exists and over the seed as the generator would
rewrite it, and reports any row whose pool membership changes.

A pass here means: the regenerated seed is behaviourally identical to the
current one as far as Standards Studio is concerned.
"""
import sqlite3, collections, sys
sys.path.insert(0, "/tmp")
import classify

db = sqlite3.connect("/tmp/crawl.db")
db.row_factory = sqlite3.Row


# ---- POOLS predicates, transcribed from criteria-simulator/main.js ----------
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
SELECT p.rowid AS rid, p.meet_id, p.event_id, p.result_set_id, e.title,
       p.competition_family, p.competition_group, p.event_level, p.age_group,
       p.is_synchronized, p.event_round, p.meet_name
FROM seed_phases p JOIN divemeets_events e
  ON e.meet_id = p.meet_id AND e.event_id = p.event_id AND e.round = p.result_set_id
WHERE p.meet_id GLOB '[0-9]*'
""").fetchall()

flips = collections.defaultdict(collections.Counter)
counts_before = collections.Counter()
counts_after = collections.Counter()

for r in rows:
    before = dict(r)
    after = dict(r)
    t = r["title"]
    # what the generator would write
    after["age_group"] = classify.age_group(t)
    after["event_level"] = classify.event_level(t, r["competition_group"], r["meet_name"])
    after["is_synchronized"] = "true" if classify.is_synchronized(t) else "false"
    after["event_round"] = t  # generator writes the full crawl title

    for name, fn in POOLS.items():
        b, a = fn(before), fn(after)
        counts_before[name] += b
        counts_after[name] += a
        if b != a:
            flips[name][(t, "IN->OUT" if b else "OUT->IN")] += 1

print(f"{'pool':<12}{'before':>10}{'after':>10}{'delta':>10}")
for name in POOLS:
    d = counts_after[name] - counts_before[name]
    print(f"{name:<12}{counts_before[name]:>10}{counts_after[name]:>10}{d:>+10}")

total_flips = sum(sum(c.values()) for c in flips.values())
print(f"\nTOTAL membership flips: {total_flips}")
for name, c in flips.items():
    if not c:
        continue
    print(f"\n=== {name}: {sum(c.values())} flipped rows ===")
    for (t, dirn), n in c.most_common(15):
        print(f"  {n:>6}  {dirn:<8} {t[:64]}")
