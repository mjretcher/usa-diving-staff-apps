#!/usr/bin/env python3
"""
Derive the placement-based senior prequalification pathways from
core.event_results, and write them where the Pricing Studio can read them.

CONTEXT
    The 2026 USA Diving National Championships are entered by prequalification
    against a published list of standards, not by advancing through a circuit.
    Fourteen pathways are listed in the criteria document. Some are placement
    results we already hold; the rest are roster decisions that live outside
    this database and cannot be derived at all.

DERIVABLE (placement results)
    - Champions of the 2022/2023/2024/2025 Winter National Championships
    - Champions of the 2023 and 2025 National Championships
    - 2025 Winter National Championships, places 2 to 12, on 1M / 3M / 10M

NOT DERIVABLE (recorded nowhere in this database -- left null, never guessed)
    - 2024 Olympic Games Team in their Olympic events
    - 2026 NCAA Championships top 5 U.S. citizens
    - 2026 National Team membership
    - Tier I / II / III High Performance Squad rosters
    - The HPS score-threshold athletes from 2025 Nationals

COUNTING
    A pathway qualifies an athlete FOR A SPECIFIC EVENT -- a 3M champion is
    prequalified on 3M, not across the board. Counts are therefore distinct
    (athlete, event) pairs, which is the unit entry fees are billed in.

    Pathways overlap heavily: the same athlete can win in more than one year.
    Summing the pathway rows would therefore overstate the eligible field, so
    the deduplicated union across all derivable pathways is reported alongside
    and is the figure that should be compared against an entry count.

Env: DATABASE_URL (Neon). Writes membership-analytics/senior-prequal.json
Run by .github/workflows/build-senior-prequal.yml
"""
import json
import os
import sys
import datetime

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "membership-analytics", "senior-prequal.json")

# What stages/levels exist at all, so the output is self-describing and a
# mismatch between assumption and reality is visible rather than silent.
PROBE = """
SELECT COALESCE(stage,'(null)'), COALESCE(event_level,'(null)'), year, count(*)::int
FROM core.event_results
WHERE year BETWEEN 2022 AND 2026
  AND COALESCE(is_junior_circuit, FALSE) = FALSE
GROUP BY 1,2,3 ORDER BY 3,1,2
"""

# Identify an athlete by DiveMeets id where present, else by name. diver_id_dm
# is the stable key; the name fallback only matters for older imports.
ATHLETE = "COALESCE(NULLIF(diver_id_dm::text,''), lower(btrim(diver_first))||'|'||lower(btrim(diver_last)))"

PLACERS = """
SELECT {ath} AS athlete, COALESCE(event_key, event_name) AS ev
FROM core.event_results
WHERE year = %s
  AND stage = ANY(%s)
  AND COALESCE(is_junior_circuit, FALSE) = FALSE
  AND COALESCE(is_synchro, FALSE) = FALSE
  AND place IS NOT NULL
  AND place BETWEEN %s AND %s
  AND place <> 127
  -- Placement standings are the FINAL standings. Results carry a row per
  -- round, and a prelim winner also has place = 1, so without this an event
  -- whose prelim and final were won by different athletes yields two
  -- "champions". Verified against the expected six per meet.
  AND strpos(lower(COALESCE(round,'')), 'final') = 1
GROUP BY 1,2
""".format(ath=ATHLETE)

WINTER = ["Winter-Nationals", "Winter Nationals", "WinterNationals"]
SENIOR = ["Senior-Nationals", "Nationals", "Senior Nationals"]

# (label as it appears in the criteria document, year, stages, place range)
PATHWAYS = [
    ("2022 Winter National Championships — champions",                  2022, WINTER, 1, 1),
    ("2023 National Championships — champions",                         2023, SENIOR, 1, 1),
    ("2023 Winter National Championships — champions",                  2023, WINTER, 1, 1),
    ("2024 Winter National Championships — champions",                  2024, WINTER, 1, 1),
    ("2025 National Championships — champions",                         2025, SENIOR, 1, 1),
    ("2025 Winter National Championships — champions",                  2025, WINTER, 1, 1),
    ("2025 Winter National Championships — places 2 to 12, 1M/3M/10M",  2025, WINTER, 2, 12),
]

NOT_DERIVABLE = [
    "2024 Olympic Games Team, in their Olympic events",
    "2026 NCAA Championships — top 5 U.S. citizens",
    "2026 National Team members (eligible in all events)",
    "2025-26 Tier III Junior High Performance Squad (all events)",
    "2025 Tier I or II HPS who competed at 2025 Nationals or Winter Nationals",
    "2024-25 Tier III HPS who competed at 2025 Nationals or Winter Nationals",
    "Non-HPS athletes who met an HPS score threshold at 2025 Nationals",
    # Derivable in principle once the Qualifier has been swum, but the criteria
    # document does not state a placement cutoff for it, so the rule is unknown
    # and guessing one would be worse than asking.
    "Added at the National Championships Qualifier (5-6 Aug)",
]


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    cur.execute("""
        SELECT year, COALESCE(is_synchro::text,'(null)'), count(*)::int
        FROM core.event_results
        WHERE stage IN ('Senior-Nationals','Winter-Nationals') AND year BETWEEN 2022 AND 2025
        GROUP BY 1,2 ORDER BY 1,2""")
    synflag = [{"year": r[0], "is_synchro": r[1], "rows": r[2]} for r in cur.fetchall()]
    print("is_synchro flag population on senior nationals rows:")
    for r in synflag:
        print(f"   {r['year']} is_synchro={r['is_synchro']:7} {r['rows']:6} rows")

    cur.execute("""
        SELECT COALESCE(round,'(null)'), count(*)::int
        FROM core.event_results
        WHERE stage IN ('Senior-Nationals','Winter-Nationals') AND year BETWEEN 2022 AND 2025
        GROUP BY 1 ORDER BY 2 DESC""")
    rounds = [{"round": r[0], "rows": r[1]} for r in cur.fetchall()]
    print("round values on senior nationals rows:")
    for r in rounds:
        print(f"   {r['round']!r:18} {r['rows']:6} rows")

    cur.execute(PROBE)
    probe = [{"stage": r[0], "level": r[1], "year": r[2], "rows": r[3]} for r in cur.fetchall()]
    print("senior-side stages present:")
    for p in probe:
        print(f"   {p['year']} {p['stage']!r:22} {p['level']!r:10} {p['rows']:6} rows")

    derived, union, warnings = [], set(), []
    for label, year, stages, lo, hi in PATHWAYS:
        cur.execute(PLACERS, (year, stages, lo, hi))
        pairs = {(r[0], r[1]) for r in cur.fetchall()}
        # 1M / 3M / 10M only for the places-2-to-12 pathway.
        if lo == 2:
            pairs = {p for p in pairs
                     if any(k in (p[1] or "").lower() for k in ("1m", "3m", "10m", "platform"))}
        union |= pairs
        evs = sorted({p[1] for p in pairs})
        derived.append({"label": label, "entries": len(pairs),
                        "athletes": len({p[0] for p in pairs}),
                        "events": evs, "derived": True})
        print(f"   {label}: {len(pairs)} entries / {len({p[0] for p in pairs})} athletes")
        print(f"      events: {evs}")
        if lo == 1 and hi == 1 and len(pairs) != 6:
            print(f"      WARNING: expected 6 champions (Men/Women x 1M/3M/10M), got {len(pairs)}")
            warnings.append(f"{label}: expected 6 champions, got {len(pairs)}")

    cur.close()
    conn.close()

    rows = derived + [{"label": l, "entries": None, "athletes": None, "derived": False}
                      for l in NOT_DERIVABLE]
    out = {
        "generated": datetime.datetime.now(datetime.timezone.utc)
                             .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "core.event_results",
        "unit": "distinct (athlete, event) pairs — a 3M champion is prequalified on 3M only",
        "note": "Pathways overlap: the same athlete can qualify through several. "
                "Summing rows overstates the field; use union_entries.",
        "union_entries": len(union),
        "union_athletes": len({p[0] for p in union}),
        "sum_of_derived": sum(r["entries"] for r in derived),
        "pathways": rows,
        "warnings": warnings,
        "stages_present": probe,
        "rounds_present": rounds,
        "is_synchro_flag": synflag,
    }
    with open(TARGET, "w") as fh:
        json.dump(out, fh, indent=2)
    print(f"\nunion across derivable pathways: {out['union_entries']} entries "
          f"/ {out['union_athletes']} athletes "
          f"(naive sum would be {out['sum_of_derived']})")
    print(f"wrote {TARGET}")


if __name__ == "__main__":
    main()
