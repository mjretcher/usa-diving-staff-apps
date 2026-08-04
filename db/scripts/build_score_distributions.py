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

# Invitational scores, from the raw scrape via the title classification. This
# is the population a score standard would actually be applied to: everyone who
# turns up to a sanctioned meet, not the subset who already reached a
# championship. Same unit as the circuit pull -- one score per diver per event
# per meet -- so the two are directly comparable.
INVITE_SQL = """
SELECT yr, age_group, gender, discipline, best
FROM (
    SELECT EXTRACT(YEAR FROM m.start_date)::int yr,
           c.age_group, c.gender, c.discipline,
           r.profile_id, r.meet_id, r.event_id,
           max(r.score) AS best
    FROM divemeets.results r
    JOIN divemeets.event_class c
      ON c.meet_id = r.meet_id AND c.event_id = r.event_id AND c.round = r.round
    JOIN divemeets.meets m ON m.meet_id = r.meet_id
    WHERE c.sanction = 'USA Diving'
      AND c.in_circuit = FALSE
      AND c.parsed_ok = TRUE
      AND c.is_synchro = FALSE
      AND c.age_group IN ('Group A','Group B','Group C','Group D')
      AND r.score IS NOT NULL AND r.score > 0
      -- place is TEXT in the raw scrape and can hold tie markers like 'T3',
      -- so compare as text rather than casting and risking an error on a
      -- non-numeric value. 127 is the exhibition / non-displacing sentinel.
      AND COALESCE(btrim(r.place), '') <> '127'
      AND m.start_date IS NOT NULL
    GROUP BY 1,2,3,4, r.profile_id, r.meet_id, r.event_id
) t
"""

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
      -- place is TEXT in the raw scrape and can hold tie markers like 'T3',
      -- so compare as text rather than casting and risking an error on a
      -- non-numeric value. 127 is the exhibition / non-displacing sentinel.
      AND COALESCE(btrim(r.place), '') <> '127'
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


# Everything sanctioned that is not Regionals / Zones / E-W-C / Nationals is,
# in practice, an invitational. They have never been used as an official
# qualifier, so nobody has needed to know what their fields look like -- which
# is exactly why a structure that qualifies through them cannot be simulated
# from circuit data alone.
PROBE = """
SELECT COALESCE(stage,'(null)') stage,
       COALESCE(is_junior_circuit,FALSE) circuit,
       year,
       count(*)::int rows,
       count(DISTINCT COALESCE(NULLIF(diver_id_dm::text,''),
             lower(btrim(diver_first))||'|'||lower(btrim(diver_last))))::int divers,
       count(DISTINCT meet_id_dm)::int meets
FROM core.event_results
WHERE year >= 2024
  AND age_group IN ('Group A','Group B','Group C','Group D')
GROUP BY 1,2,3 ORDER BY 3,1
"""


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    cur.execute(PROBE)
    probe = [{"stage": r[0], "circuit": bool(r[1]), "year": r[2],
              "rows": r[3], "divers": r[4], "meets": r[5]} for r in cur.fetchall()]
    print("junior-aged results by stage (2024+), circuit and non-circuit:")
    for p in probe:
        tag = "circuit" if p["circuit"] else "OTHER  "
        print(f"   {p['year']} {tag} {p['stage']!r:24} {p['rows']:6} rows  "
              f"{p['divers']:5} divers  {p['meets']:4} meets")
    noncirc = [p for p in probe if not p["circuit"]]
    print(f"\nnon-circuit junior results: {sum(p['rows'] for p in noncirc)} rows across "
          f"{len(set(p['stage'] for p in noncirc))} stage labels")

    cur.execute(SQL, (STAGES,))
    rows = cur.fetchall()
    cur.close()
    print(f"circuit rows: {len(rows)}")

    # Actions log archives are not reachable from every environment, so a
    # failure here has to survive into the output file rather than only into a
    # log nobody can open.
    inv_rows, inv_error = [], None
    cur = conn.cursor()
    try:
        cur.execute(INVITE_SQL)
        inv_rows = cur.fetchall()
        print(f"invitational rows: {len(inv_rows)}")
    except Exception as e:
        conn.rollback()
        inv_error = str(e).strip()
        print("INVITATIONAL PULL FAILED:", inv_error[:400])
    finally:
        cur.close()

    # Pin the join column types: the last failure of this shape was schema drift
    # between what schema.sql declares and what the database actually has.
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT table_schema||'.'||table_name t, column_name c, data_type d
            FROM information_schema.columns
            WHERE (table_schema='divemeets' AND table_name IN ('results','event_class','events','meets')
                   AND column_name IN ('meet_id','event_id','round','score','profile_id','place','start_date'))
            ORDER BY 1,2""")
        join_types = [{"col": f"{r[0]}.{r[1]}", "type": r[2]} for r in cur.fetchall()]
        for j in join_types:
            print(f"   {j['col']:34} {j['type']}")
    except Exception as e:
        conn.rollback(); join_types = [{"error": str(e).strip()}]
    finally:
        cur.close()

    cells = collections.defaultdict(lambda: collections.defaultdict(list))
    skipped = collections.Counter()
    for yr, ag, gen, disc, best in inv_rows:
        g, x, b = GROUP_CODE.get(ag), GENDER_CODE.get(gen), BOARD_CODE.get(disc)
        if not (g and x and b):
            skipped[f"inv|{ag}|{gen}|{disc}"] += 1
            continue
        cells[g + x + b][f"Invitational|{yr}"].append(round(float(best), 2))
    for year, stage, ag, gen, disc, best in rows:
        g, x, b = GROUP_CODE.get(ag), GENDER_CODE.get(gen), BOARD_CODE.get(disc)
        if not (g and x and b):
            skipped[f"{ag}|{gen}|{disc}"] += 1
            continue
        cells[g + x + b][f"{stage}|{year}"].append(round(float(best), 2))

    conn.close()
    out_cells, total = {}, 0
    for code in sorted(cells):
        buckets = {}
        for key in sorted(cells[code]):
            arr = sorted(cells[code][key], reverse=True)
            total += len(arr)
            year = key.split("|")[-1]
            rec = {"n": len(arr),
                   "p": {str(p): pct(arr, p) for p in (10, 25, 50, 75, 90)}}
            # Full arrays only from 2024, the dive-count-comparable era and the
            # only one a cut score should be set from. Earlier seasons keep
            # percentiles for trend work without carrying 150k numbers into the
            # browser.
            if year >= "2024":
                rec["scores"] = arr
            buckets[key] = rec
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
        "stage_probe": probe,
        "invitational_error": inv_error,
        "join_types": join_types,
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
