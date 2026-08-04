#!/usr/bin/env python3
"""
Build junior-circuit score distributions, so a cut score can be simulated
against what athletes actually scored.

WHY NOT qual-data.json
    That file exists to model one thing: the 15th-place bar out of Regionals.
    It excludes platform entirely, drops any field under 15 finishers and any
    meet containing a shared place, and covers 2024-25 only. Sensible for its
    job, useless for this one -- a cut-score standard has to cover every age
    group, gender and event, platform included.

UNIT
    One score per diver per event per meet: an athlete's best result at that
    meet, which is what a score standard would be measured against. Results
    carry a row per round, so without this a diver who made finals contributes
    two or three points and skews the distribution toward the deep end.

EXCLUSIONS
    - Synchro (a team score is not an individual standard).
    - Place 127, the DiveMeets exhibition / non-displacing sentinel: those
      athletes are not advancing, so they are not part of a qualifying pool.
    - Years before 2024. USA Diving aligned junior dive counts with World
      Aquatics on 1 January 2024, so earlier raw scores are not comparable for
      Group A, Group C girls or Group D. Mixing them would quietly bias any
      cut set from the combined pool.

Env: DATABASE_URL (Neon). Writes membership-analytics/score-distributions.json
"""
import json
import os
import sys
import datetime
import collections

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "membership-analytics", "score-distributions.json")

GROUP_CODE = {"Group A": "A", "Group B": "B", "Group C": "C", "Group D": "D"}
GENDER_CODE = {"Boys": "B", "Girls": "G"}
BOARD_CODE = {"1M": "1", "3M": "3", "Platform": "P"}
STAGES = ["Regionals", "Zones", "EWC", "Nationals"]

SQL = """
SELECT year, stage, age_group, gender, discipline, best
FROM (
    SELECT r.year, r.stage, r.age_group, r.gender, r.discipline,
           r.diver_id_dm, r.diver_first, r.diver_last, r.meet_id_dm, r.event_key,
           max(r.score) AS best
    FROM core.event_results r
    WHERE r.is_junior_circuit = TRUE
      AND COALESCE(r.is_synchro, FALSE) = FALSE
      AND r.year >= 2024
      AND r.stage = ANY(%s)
      AND r.score IS NOT NULL
      AND r.score > 0
      AND (r.place IS NULL OR r.place <> 127)
      AND r.age_group IS NOT NULL
      AND r.gender IS NOT NULL
      AND r.discipline IS NOT NULL
    GROUP BY 1,2,3,4,5,
             r.diver_id_dm, r.diver_first, r.diver_last, r.meet_id_dm, r.event_key
) t
"""


def pct(sorted_desc, p):
    """Percentile of a descending-sorted list, p in 0..100 where 100 is best."""
    if not sorted_desc:
        return None
    i = int(round((100 - p) / 100.0 * (len(sorted_desc) - 1)))
    return sorted_desc[max(0, min(len(sorted_desc) - 1, i))]


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute(SQL, (STAGES,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    print(f"rows: {len(rows)}")

    cells = collections.defaultdict(lambda: collections.defaultdict(list))
    skipped = collections.Counter()
    for year, stage, ag, gen, disc, best in rows:
        g, x, b = GROUP_CODE.get(ag), GENDER_CODE.get(gen), BOARD_CODE.get(disc)
        if not (g and x and b):
            skipped[f"{ag}|{gen}|{disc}"] += 1
            continue
        cells[g + x + b][f"{stage}|{year}"].append(round(float(best), 2))

    out_cells, total = {}, 0
    for code in sorted(cells):
        buckets = {}
        for key in sorted(cells[code]):
            arr = sorted(cells[code][key], reverse=True)
            total += len(arr)
            buckets[key] = {
                "n": len(arr),
                "scores": arr,
                "p": {str(p): pct(arr, p) for p in (10, 25, 50, 75, 90)},
            }
        out_cells[code] = buckets

    # A cut score set from a handful of results is not a standard, it is a
    # coin toss. Flag anything too thin to reason from rather than let it be
    # dragged onto a slider like the well-populated cells.
    thin = [f"{c}/{k}" for c, bs in out_cells.items() for k, b in bs.items() if b["n"] < 30]

    out = {
        "generated": datetime.datetime.now(datetime.timezone.utc)
                             .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "core.event_results",
        "unit": "one score per diver per event per meet (their best at that meet)",
        "basis": "2024 onward only. USA Diving aligned junior dive counts with World "
                 "Aquatics on 1 January 2024, so earlier raw scores are not comparable "
                 "for Group A, Group C girls or Group D.",
        "exclusions": "synchro; place 127 (exhibition / non-displacing); null or zero scores",
        "total_scores": total,
        "thin_buckets": thin,
        "unmapped": dict(skipped),
        "cells": out_cells,
    }
    with open(TARGET, "w") as fh:
        json.dump(out, fh, separators=(",", ":"), sort_keys=True)

    print(f"cells: {len(out_cells)}  scores: {total}")
    for code in sorted(out_cells):
        tot = sum(b["n"] for b in out_cells[code].values())
        print(f"  {code}: {tot:5} across {len(out_cells[code])} stage-years")
    if skipped:
        print("unmapped:", dict(skipped))
    print(f"thin buckets (<30): {len(thin)}")
    print(f"wrote {TARGET} ({os.path.getsize(TARGET)} bytes)")


if __name__ == "__main__":
    main()
