#!/usr/bin/env python3
"""
Measure region choice: how often athletes compete somewhere other than the area
their geography would put them in.

WHY IT MATTERS
    Under region choice an athlete may begin the pathway anywhere in the
    country, and must then stay in that region's route. Every field size any
    boundary tool projects assumes people go where the map sends them. If that
    assumption is materially wrong, the error lands directly on the thing a
    realignment proposal is deciding.

HOW, WITHOUT BEING CIRCULAR
    The obvious comparison -- competed region against assigned region -- is
    circular here, because the reference alignment was itself seeded from where
    clubs actually went. So this uses the CLUB as the anchor instead. Athletes
    from one club overwhelmingly travel together, so a club's modal region is
    its home region by revealed behaviour, and an athlete competing elsewhere is
    exercising choice. Nothing in that depends on a drawn map.

    Two figures come out of it:
      athlete leakage -- share of athletes competing outside their club's modal
                         region, which is individual choice;
      club split      -- share of clubs whose athletes do not all go to one
                         region, which is the stronger signal, because a club
                         splitting means the map is genuinely ambiguous there.

Env: DATABASE_URL (Neon). Writes membership-analytics/region-choice.json
"""
import json
import os
import sys
import datetime
import collections

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "membership-analytics", "region-choice.json")

ATH = ("COALESCE(NULLIF(diver_id_dm,''), "
       "lower(btrim(diver_first))||'|'||lower(btrim(diver_last)))")

# One row per athlete per meet: which club, which region/zone they turned up to.
SQL = """
SELECT DISTINCT year, stage,
       {ath} AS athlete,
       NULLIF(btrim(COALESCE(team,'')),'') AS club,
       COALESCE(NULLIF(btrim(COALESCE(region,'')::text),''),
                NULLIF(btrim(COALESCE(zone,'')),''),
                NULLIF(btrim(COALESCE(ewc_meet,'')),'')) AS where_competed
FROM core.event_results
WHERE is_junior_circuit = TRUE
  AND year >= 2024
  AND stage = ANY(%s)
""".format(ath=ATH)

PROBE = """
SELECT stage,
       count(*) FILTER (WHERE region IS NOT NULL)::int has_region,
       count(*) FILTER (WHERE zone IS NOT NULL)::int has_zone,
       count(*) FILTER (WHERE ewc_meet IS NOT NULL)::int has_ewc,
       count(*) FILTER (WHERE team IS NOT NULL AND btrim(team) <> '')::int has_club,
       count(*)::int rows
FROM core.event_results
WHERE is_junior_circuit = TRUE AND year >= 2024
GROUP BY 1 ORDER BY 1
"""


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    # Which of these columns actually exist? A failure here is almost always a
    # column that is not there, and the log is not reachable from every
    # environment, so find out first and say so.
    cur.execute("""
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema='core' AND table_name='event_results' ORDER BY column_name""")
    cols = {r[0]: r[1] for r in cur.fetchall()}
    print("core.event_results columns:", ", ".join(sorted(cols)))
    need = ['region','zone','ewc_meet','team','diver_id_dm','diver_first','diver_last','stage','year']
    missing = [c for c in need if c not in cols]
    if missing:
        print("MISSING:", missing)
        with open(TARGET, "w") as fh:
            json.dump({"error":"missing columns","missing":missing,
                       "available":sorted(cols)}, fh, indent=2)
        cur.close(); conn.close(); return
    print("types:", {c: cols[c] for c in need})

    cur.execute(PROBE)
    probe = [{"stage": r[0], "region": r[1], "zone": r[2], "ewc": r[3],
              "club": r[4], "rows": r[5]} for r in cur.fetchall()]
    print("field population by stage (2024+):")
    for p in probe:
        print(f"   {p['stage']!r:12} rows {p['rows']:6}  region {p['region']:6}  "
              f"zone {p['zone']:6}  ewc {p['ewc']:6}  club {p['club']:6}")

    out = {"generated": datetime.datetime.now(datetime.timezone.utc)
                                .strftime("%Y-%m-%dT%H:%M:%SZ"),
           "method": "club modal location as the home reference, so the measure does not "
                     "depend on any drawn map",
           "field_population": probe, "stages": {}}

    for stage in ("Regionals", "Zones"):
        cur.execute(SQL, ([stage],))
        rows = [r for r in cur.fetchall() if r[3] and r[4]]
        by_year = collections.defaultdict(lambda: collections.defaultdict(
            lambda: collections.defaultdict(set)))
        for year, _st, athlete, club, where in rows:
            by_year[year][club][where].add(athlete)

        per_year = {}
        for year in sorted(by_year):
            clubs = by_year[year]
            tot_ath = away = 0
            split_clubs = single_clubs = 0
            worst = []
            for club, places in clubs.items():
                counts = {p: len(a) for p, a in places.items()}
                n = sum(counts.values())
                if n == 0:
                    continue
                home = max(counts, key=counts.get)
                tot_ath += n
                away += n - counts[home]
                if len(counts) > 1:
                    split_clubs += 1
                    worst.append({"club": club, "athletes": n,
                                  "home": home, "elsewhere": n - counts[home],
                                  "places": sorted(counts)})
                else:
                    single_clubs += 1
            worst.sort(key=lambda x: -x["elsewhere"])
            per_year[str(year)] = {
                "athletes": tot_ath,
                "competing_away": away,
                "leakage_pct": round(away / tot_ath * 100, 2) if tot_ath else 0,
                "clubs": split_clubs + single_clubs,
                "clubs_split": split_clubs,
                "clubs_split_pct": round(split_clubs / max(1, split_clubs + single_clubs) * 100, 1),
                "biggest_splits": worst[:12],
            }
            p = per_year[str(year)]
            print(f"\n{stage} {year}: {p['athletes']} athletes across {p['clubs']} clubs")
            print(f"   competing outside their club's usual area: {p['competing_away']} "
                  f"({p['leakage_pct']}%)")
            print(f"   clubs whose athletes split across areas : {p['clubs_split']} "
                  f"of {p['clubs']} ({p['clubs_split_pct']}%)")
            for wq in worst[:6]:
                print(f"      {wq['club'][:40]:42} {wq['athletes']:3} athletes, "
                      f"{wq['elsewhere']:3} away from {wq['home']!r}")
        out["stages"][stage] = per_year

    cur.close()
    conn.close()
    with open(TARGET, "w") as fh:
        json.dump(out, fh, indent=2)
    print(f"\nwrote {TARGET}")


if __name__ == "__main__":
    main()
