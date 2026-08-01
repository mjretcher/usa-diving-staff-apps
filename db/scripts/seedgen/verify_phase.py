#!/usr/bin/env python3
"""
Verify the phase-score reconstruction: given the dive rows for one
(meet, event, round, sheet_key), reproduce phase_dive_count, phase_dd_sum,
phase_score_from_dives, score_delta_posted_minus_phase, score_is_cumulative
and score_analysis_mode exactly as the seed records them.
"""
import sqlite3, collections
from decimal import Decimal

db = sqlite3.connect("/tmp/crawl.db")
db.row_factory = sqlite3.Row
db.execute("CREATE INDEX IF NOT EXISTS i_sd ON seed_dives(meet_id,event_id,result_set_id,sheet_key)")

TOL = Decimal("0.005")


def dec(v):
    try:
        return Decimal(str(v))
    except Exception:
        return None


def phase(dives, posted):
    """dives: list of (dd, score). posted: Decimal|None"""
    if not dives:
        return dict(count="", dd_sum="", from_dives=posted, delta=Decimal(0),
                    cumulative=False, mode="Result-only (archive scrape)")
    n = len(dives)
    dd_sum = sum((d for d, _ in dives if d is not None), Decimal(0))
    tot = sum((s for _, s in dives if s is not None), Decimal(0))
    if posted is None:
        return dict(count=n, dd_sum=dd_sum, from_dives=tot, delta=None,
                    cumulative=False, mode="Phase score from dives only")
    delta = posted - tot
    if abs(delta) <= TOL:
        mode, cum = "Posted score equals phase score", False
    else:
        mode, cum = "Posted score differs from phase score", True
    return dict(count=n, dd_sum=dd_sum, from_dives=tot, delta=delta,
                cumulative=cum, mode=mode)


rows = db.execute("""
SELECT meet_id, event_id, result_set_id, sheet_key, posted_score,
       phase_score_from_dives, phase_dive_count, phase_dd_sum,
       score_delta_posted_minus_phase, score_is_cumulative, score_analysis_mode
FROM seed_phases WHERE score_analysis_mode <> 'Result-only (archive scrape)'
""").fetchall()

stats = collections.Counter()
bad = collections.defaultdict(list)

for r in rows:
    dv = db.execute("""SELECT dd, score FROM seed_dives
        WHERE meet_id=? AND event_id=? AND result_set_id=? AND sheet_key=?""",
        (r["meet_id"], r["event_id"], r["result_set_id"], r["sheet_key"])).fetchall()
    dives = [(dec(x["dd"]), dec(x["score"])) for x in dv]
    got = phase(dives, dec(r["posted_score"]))
    stats["rows"] += 1
    checks = {
        "count": str(got["count"]) == (r["phase_dive_count"] or ""),
        "dd_sum": got["dd_sum"] == "" or abs(dec(r["phase_dd_sum"]) - got["dd_sum"]) <= TOL,
        "from_dives": abs(dec(r["phase_score_from_dives"]) - got["from_dives"]) <= TOL,
        "cumulative": ("true" if got["cumulative"] else "false") == r["score_is_cumulative"],
        "mode": got["mode"] == r["score_analysis_mode"],
    }
    if got["delta"] is not None:
        checks["delta"] = abs(dec(r["score_delta_posted_minus_phase"]) - got["delta"]) <= TOL
    for k, ok in checks.items():
        stats[k] += bool(ok)
        if not ok and len(bad[k]) < 5:
            bad[k].append((r["meet_id"], r["event_id"], r["result_set_id"],
                           r["sheet_key"], dict(r), got))

n = stats["rows"]
print(f"computed phase rows tested: {n}")
for k in ["count", "dd_sum", "from_dives", "delta", "cumulative", "mode"]:
    print(f"  {k:<14}{stats[k]:>7}/{n}  {100.0*stats[k]/n:6.2f}%")
for k, v in bad.items():
    print(f"\n=== {k} mismatches ===")
    for mid, eid, rd, sk, seed, got in v:
        print(f"  meet {mid} ev {eid} rd {rd} sheet {sk}")
        print(f"    seed: cnt={seed['phase_dive_count']} dd={seed['phase_dd_sum']} "
              f"from={seed['phase_score_from_dives']} delta={seed['score_delta_posted_minus_phase']} "
              f"cum={seed['score_is_cumulative']} mode={seed['score_analysis_mode']}")
        print(f"    mine: cnt={got['count']} dd={got['dd_sum']} from={got['from_dives']} "
              f"delta={got['delta']} cum={got['cumulative']} mode={got['mode']}")
