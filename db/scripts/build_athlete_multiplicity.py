#!/usr/bin/env python3
"""
Measure how many events an athlete actually enters, so a projection can report
divers as well as entries.

WHY IT IS NOT A SINGLE DIVISION
    Entries and athletes are different questions. Entries drive entry fees,
    field sizes and how long a session runs. Athletes drive venue capacity,
    hotel blocks, travel, meals and awards. Dividing entries by one global
    average would be wrong in both directions at once, because the ratio moves
    with stage, age group and gender.

    The structure helps: an athlete competes only within their own age group
    and gender, and there are three individual events -- 1M, 3M, platform. So
    overlap is bounded at three and can be measured exactly rather than
    assumed. What is measured here is the share of athletes entering each
    COMBINATION of boards, per stage, per age group, per gender.

SELECTIVITY
    The ratio is not a constant of nature. Two forces pull on it as a pathway
    gets more selective: stronger athletes tend to contest more events, which
    raises it, while a tighter cut has to be cleared separately in each event,
    which lowers it. Which wins is an empirical question, so the ratio is
    reported per stage and the trend through the pipeline is printed. A
    projection that changes selectivity should expect the ratio to move, and
    this is the evidence for which way.

UNIT
    One entry is one diver in one event at one meet. Results carry a row per
    round, so rounds are collapsed -- otherwise a diver reaching finals looks
    like several entries.

Env: DATABASE_URL (Neon). Writes membership-analytics/athlete-multiplicity.json
"""
import json
import os
import sys
import datetime
import collections

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "membership-analytics", "athlete-multiplicity.json")

GROUP_CODE = {"Group A": "A", "Group B": "B", "Group C": "C", "Group D": "D"}
GENDER_CODE = {"Boys": "B", "Girls": "G"}
BOARD_CODE = {"1M": "1", "3M": "3", "Platform": "P"}
STAGES = ["Regionals", "Zones", "EWC", "Nationals"]

ATH = ("COALESCE(NULLIF(diver_id_dm,''), "
       "lower(btrim(diver_first))||'|'||lower(btrim(diver_last)))")

SQL = """
SELECT year, stage, age_group, gender, athlete, discipline
FROM (
    SELECT DISTINCT r.year, r.stage, r.age_group, r.gender, r.discipline,
           {ath} AS athlete, r.meet_id_dm, r.event_key
    FROM core.event_results r
    WHERE r.is_junior_circuit = TRUE
      AND COALESCE(r.is_synchro, FALSE) = FALSE
      AND r.year >= 2024
      AND r.stage = ANY(%s)
      AND r.age_group = ANY(%s)
      AND r.gender IS NOT NULL
      AND r.discipline IS NOT NULL
      AND (r.place IS NULL OR r.place <> 127)
) t
""".format(ath=ATH)


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute(SQL, (STAGES, list(GROUP_CODE)))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    print(f"diver-event-meet rows: {len(rows)}")

    # (year, stage, group, gender) -> athlete -> set of boards entered
    seen = collections.defaultdict(lambda: collections.defaultdict(set))
    for year, stage, ag, gen, athlete, disc in rows:
        g, x, b = GROUP_CODE.get(ag), GENDER_CODE.get(gen), BOARD_CODE.get(disc)
        if not (g and x and b):
            continue
        seen[(year, stage, g, x)][athlete].add(b)

    out = {}
    for key in sorted(seen, key=lambda k: (k[1], k[0], k[2], k[3])):
        year, stage, g, x = key
        people = seen[key]
        athletes = len(people)
        entries = sum(len(v) for v in people.values())
        combos = collections.Counter("".join(sorted(v)) for v in people.values())
        byn = collections.Counter(len(v) for v in people.values())
        out.setdefault(f"{stage}|{year}", {})[g + x] = {
            "athletes": athletes,
            "entries": entries,
            "entries_per_athlete": round(entries / athletes, 3) if athletes else 0,
            # The share of athletes contesting exactly this set of boards. This
            # is the shape a projection needs; the mean alone hides it.
            "combinations": {k: round(v / athletes, 4) for k, v in combos.most_common()},
            "by_count": {str(k): v for k, v in sorted(byn.items())},
        }

    # Does the ratio rise or fall as the pathway gets more selective?
    print("\nentries per athlete, by stage (all cells pooled):")
    trend = {}
    for stage in STAGES:
        a = e = 0
        for k, cells in out.items():
            if not k.startswith(stage + "|"):
                continue
            for c in cells.values():
                a += c["athletes"]; e += c["entries"]
        if a:
            trend[stage] = round(e / a, 3)
            print(f"   {stage:12} {e:6} entries / {a:5} athletes = {e/a:.3f}")
    if len(trend) > 1:
        first, last = STAGES[0], [s for s in STAGES if s in trend][-1]
        if trend.get(first) and trend.get(last):
            d = trend[last] - trend[first]
            print(f"\n   {first} -> {last}: {d:+.3f} — "
                  + ("athletes contest MORE events as selection tightens"
                     if d > 0.05 else
                     "athletes contest FEWER events as selection tightens"
                     if d < -0.05 else
                     "roughly flat; selectivity does not move the ratio much"))

    print("\nby cell, most recent season of each stage:")
    for stage in STAGES:
        keys = sorted([k for k in out if k.startswith(stage + "|")])
        if not keys:
            continue
        k = keys[-1]
        print(f"   {k}")
        for cell in sorted(out[k]):
            c = out[k][cell]
            top = list(c["combinations"].items())[:3]
            print(f"      {cell}  {c['athletes']:4} athletes  {c['entries']:5} entries  "
                  f"{c['entries_per_athlete']:.2f} each   "
                  + "  ".join(f"{n}={p*100:.0f}%" for n, p in top))

    payload = {
        "generated": datetime.datetime.now(datetime.timezone.utc)
                             .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "unit": "one entry = one diver in one event at one meet; rounds collapsed",
        "note": "combinations give the share of athletes contesting exactly that set of "
                "boards (1, 3, P). Overlap is bounded at three because an athlete "
                "competes only within their own age group and gender.",
        "caution": "the ratio is not invariant to selectivity — see the stage trend before "
                   "applying one stage's ratio to a differently-selective structure",
        "stage_trend": trend,
        "cells": out,
    }
    with open(TARGET, "w") as fh:
        json.dump(payload, fh, indent=2, sort_keys=True)
    print(f"\nwrote {TARGET}")


if __name__ == "__main__":
    main()
