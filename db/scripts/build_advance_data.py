#!/usr/bin/env python3
"""
Rebuild membership-analytics/advance-data.json from core.event_results.

WHY THIS EXISTS
    advance-data.json was originally produced ad hoc in a throwaway sandbox,
    which left two problems: East/West/Central was never extracted (so the
    Pricing Studio had to model that level instead of observing it), and the
    file silently goes stale whenever the underlying diver data is corrected.
    This script makes the whole file reproducible from one committed method.

WHAT IT PRODUCES
    pools["{year}|{stage}"][county_fips][event_code] = number of entries
    event_code is [A-D][B|G][1|3|P] -- age group, gender, board.
    Stages: Regionals, Zones, EWC. Years: 2025, 2026.

COUNTY RESOLUTION
    Deliberately does NOT re-geocode. membership-analytics/boundary-data.json
    already carries stats[fips].z = {zip5: [...]}, which is the exact zip ->
    county assignment that produced the existing pools. Inverting it keeps the
    new E/W/C pool consistent with Regionals and Zones; re-running a geocoder
    would risk a slightly different assignment and make levels incomparable.

ENTRY COUNTING
    An entry is one diver in one event at one meet. Results carry a row per
    round, so rounds are collapsed with DISTINCT -- otherwise a diver who made
    finals would be counted two or three times. Synchro is excluded (it is
    billed per team, not per diver, and is handled separately downstream).
    Exhibition / non-displacing placings are KEPT: those athletes still entered
    and still paid an entry fee, which is what this pool is used to measure.

SAFETY
    Refuses to write if the rebuilt Regionals/Zones pools drift from the
    existing file by more than TOLERANCE. A rebuild that cannot reproduce the
    pools we already trust must not be allowed to overwrite them.

Env: DATABASE_URL (Neon). Run by .github/workflows/build-advance-data.yml.
"""
import json
import os
import sys
import collections

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BOUNDARY = os.path.join(ROOT, "membership-analytics", "boundary-data.json")
TARGET = os.path.join(ROOT, "membership-analytics", "advance-data.json")

YEARS = (2025, 2026)
STAGE_ALIASES = {
    "Regionals": "Regionals",
    "Regional": "Regionals",
    "Zones": "Zones",
    "Zone": "Zones",
    "EWC": "EWC",
    "E/W/C": "EWC",
    "East/West/Central": "EWC",
}
GROUP_CODE = {"Group A": "A", "Group B": "B", "Group C": "C", "Group D": "D"}
GENDER_CODE = {"Boys": "B", "Girls": "G"}
BOARD_CODE = {"1M": "1", "3M": "3", "Platform": "P"}

# Regionals and Zones are already trusted. A rebuild that moves them by more
# than this is a bug in the rebuild, not a correction.
TOLERANCE = 0.02


def zip_to_fips():
    with open(BOUNDARY) as fh:
        stats = json.load(fh)["stats"]
    out, clashes = {}, 0
    for fips, rec in stats.items():
        for zip5 in (rec.get("z") or {}):
            if zip5 in out and out[zip5] != fips:
                clashes += 1
                continue
            out[zip5] = fips
    return out, clashes


SQL = """
WITH ent AS (
    SELECT DISTINCT
        lower(btrim(r.diver_first)) AS f,
        lower(btrim(r.diver_last))  AS l,
        r.year, r.stage, r.meet_id_dm, r.event_key,
        r.age_group, r.gender, r.discipline
    FROM core.event_results r
    WHERE r.is_junior_circuit = TRUE
      AND COALESCE(r.is_synchro, FALSE) = FALSE
      AND r.year = ANY(%s)
      AND r.stage = ANY(%s)
      AND r.age_group IS NOT NULL
      AND r.gender IS NOT NULL
      AND r.discipline IS NOT NULL
),
mem AS (
    SELECT lower(btrim(first_name)) AS f,
           lower(btrim(last_name))  AS l,
           (array_agg(zip5 ORDER BY membership_year DESC))[1] AS zip5
    FROM membership.members
    WHERE zip5 IS NOT NULL AND btrim(zip5) <> ''
    GROUP BY 1, 2
)
SELECT e.year, e.stage, m.zip5, e.age_group, e.gender, e.discipline, count(*) AS n
FROM ent e
LEFT JOIN mem m ON m.f = e.f AND m.l = e.l
GROUP BY 1, 2, 3, 4, 5, 6
"""

STAGE_PROBE = """
SELECT stage, year, count(*) FROM core.event_results
WHERE is_junior_circuit = TRUE AND year = ANY(%s)
GROUP BY 1, 2 ORDER BY 2, 1
"""


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")

    z2f, clashes = zip_to_fips()
    print(f"zip -> county: {len(z2f)} zips, {clashes} clashes")

    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    cur.execute(STAGE_PROBE, (list(YEARS),))
    stages_seen = [(r[0], r[1], int(r[2])) for r in cur.fetchall()]
    print("stages present in core.event_results:")
    for s, y, n in stages_seen:
        print(f"   {y} {s!r:24} {n:6} rows")

    wanted = sorted({k for k in STAGE_ALIASES})
    cur.execute(SQL, (list(YEARS), wanted))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    print(f"aggregated rows: {len(rows)}")

    pools = collections.defaultdict(lambda: collections.defaultdict(dict))
    totals = collections.defaultdict(lambda: {"mapped": 0, "unmapped": 0, "total": 0})
    skipped = collections.Counter()

    for year, stage, zip5, ag, gen, disc, n in rows:
        n = int(n)
        st = STAGE_ALIASES.get(stage)
        if st is None:
            skipped[f"stage:{stage}"] += n
            continue
        g, x, b = GROUP_CODE.get(ag), GENDER_CODE.get(gen), BOARD_CODE.get(disc)
        if not (g and x and b):
            skipped[f"cell:{ag}|{gen}|{disc}"] += n
            continue
        code = g + x + b
        key = f"{year}|{st}"
        totals[key]["total"] += n
        fips = z2f.get(zip5) if zip5 else None
        if fips is None:
            totals[key]["unmapped"] += n
            continue
        totals[key]["mapped"] += n
        cell = pools[key][fips]
        cell[code] = cell.get(code, 0) + n

    for k in sorted(totals):
        t = totals[k]
        print(f"   {k:22} mapped={t['mapped']:5} unmapped={t['unmapped']:4} total={t['total']:5}")
    if skipped:
        print("skipped:")
        for k, v in skipped.most_common(12):
            print(f"   {k}: {v}")

    # --- regression gate against the pools we already trust -----------------
    prior = {}
    if os.path.exists(TARGET):
        with open(TARGET) as fh:
            prior = (json.load(fh).get("totals") or {})
    failures = []
    for key, old in prior.items():
        new = totals.get(key)
        if not new:
            failures.append(f"{key}: pool disappeared in rebuild")
            continue
        o, n2 = int(old.get("total") or 0), new["total"]
        if o and abs(n2 - o) / o > TOLERANCE:
            failures.append(f"{key}: total moved {o} -> {n2} ({(n2-o)/o*100:+.1f}%)")
    if failures:
        print("\nREBUILD REJECTED -- would not reproduce the trusted pools:")
        for f in failures:
            print("   " + f)
        sys.exit(1)

    out = {
        "meta": {
            "built": __import__("datetime").date.today().isoformat(),
            "source": "core.event_results joined to membership.members by name -> zip5 -> county",
            "county_resolution": "zip5 -> county inverted from boundary-data.json stats[fips].z "
                                 "(same assignment that produced the original pools)",
            "entry_rule": "one diver per event per meet; rounds collapsed; synchro excluded; "
                          "exhibition placings kept (they paid an entry fee)",
            "builder": "db/scripts/build_advance_data.py",
            "stages_seen": [{"stage": s, "year": y, "rows": n} for s, y, n in stages_seen],
            "skipped": dict(skipped),
        },
        "pools": {k: dict(v) for k, v in sorted(pools.items())},
        "totals": {k: totals[k] for k in sorted(totals)},
    }
    with open(TARGET, "w") as fh:
        json.dump(out, fh, separators=(",", ":"), sort_keys=True)
    print(f"\nwrote {TARGET} ({os.path.getsize(TARGET)} bytes), pools: {sorted(out['pools'])}")


if __name__ == "__main__":
    main()
