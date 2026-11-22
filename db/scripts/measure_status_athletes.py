#!/usr/bin/env python3
"""
Where foreign athletes, dual citizens declared for another federation, and High
Performance Squad athletes competed on the Junior Circuit, and where they came
from. Counts only: no athlete is named in the output.

For each season (2024 on) and meet (Regionals, Zones) and each group:
  athletes         unique athletes in the group who competed at that meet level
  entries          their event entries (individual events, Groups A-D, 1m/3m/platform)
  nd_entries       of those, entries the results scored non-displacing (place 127)
  competing_away   athletes who competed somewhere other than their club's home
  by_age, by_gender, by_area (based there / competed there / left / arrived), flows

Same definitions as db/scripts/measure_region_choice.py: a club's home is the
region (or zone) where most of ITS athletes competed that season, counted over
every athlete at the meet, not just the group.

WHO IS IN A GROUP
  junior_results.athlete_status is ONE list with no season on it; it is the
  2026 list. It is applied to 2026 only. For other seasons there is no list on
  file, so the only group is "nd": athletes the results scored non-displacing,
  reason not on file. Nothing is carried back from the 2026 list.
  Add a season to STATUS_SEASONS only when that season's own list is loaded.

Env: DATABASE_URL (Neon). Writes membership-analytics/status-athletes.json
"""
import collections
import datetime
import json
import os
import re
import sys

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "membership-analytics", "status-athletes.json")
STATUS_SEASONS = {2026}

SQL = """
SELECT year, stage,
       COALESCE(NULLIF(btrim(diver_id_dm::text),''),
                lower(btrim(diver_first))||'|'||lower(btrim(diver_last))) AS athlete,
       lower(btrim(COALESCE(diver_first,'')))||' '||lower(btrim(COALESCE(diver_last,''))) AS nm,
       COALESCE(NULLIF(btrim(COALESCE(team_id_dm::text,'')),''),
                NULLIF(btrim(COALESCE(team_name,'')),'')) AS club,
       CASE WHEN stage = 'Regionals' THEN NULLIF(btrim(region::text), '')
            ELSE NULLIF(btrim(zone::text), '') END AS where_competed,
       upper(right(btrim(COALESCE(age_group,'')), 1)) AS age_letter,
       upper(left(btrim(COALESCE(gender,'')), 1)) AS gender_letter,
       btrim(place::text) AS place
FROM core.event_results
WHERE is_junior_circuit = TRUE AND NOT is_synchro
  AND year >= 2024
  AND stage IN ('Regionals', 'Zones')
  AND age_group IN ('Group A','Group B','Group C','Group D')
  AND discipline IN ('1M','3M','Platform') AND event_name LIKE 'Group%%'
"""

norm = lambda s: re.sub(r"[^a-z ]", "", re.sub(r"\s+", " ", (s or "").lower())).strip()


def blank():
    return {"athletes": 0, "entries": 0, "nd_entries": 0, "competing_away": 0,
            "by_age": collections.defaultdict(lambda: {"athletes": 0, "away": 0}),
            "by_gender": collections.defaultdict(lambda: {"athletes": 0, "away": 0}),
            "by_area": collections.defaultdict(lambda: {"athletes": 0, "competed": 0, "left": 0, "arrived": 0}),
            "flows": collections.Counter()}


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    cur.execute("SELECT dive_meets_id::text, name, category, hps FROM junior_results.athlete_status")
    status = cur.fetchall()
    cats = collections.Counter((r[2] or "", bool(r[3])) for r in status)
    print("athlete_status rows:", len(status), dict((f"{k[0] or '-'}{'+hps' if k[1] else ''}", v) for k, v in cats.items()))

    cur.execute(SQL)
    rows = [r for r in cur.fetchall() if r[5]]
    print("result rows:", len(rows))

    # (year, stage) -> athlete -> facts
    ath = collections.defaultdict(dict)
    club_places = collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(set)))
    for year, stage, a, nm, club, where, age, gen, place in rows:
        d = ath[(year, stage)].setdefault(a, {"nm": nm, "club": club, "where": collections.Counter(), "age": None,
                                               "gender": None, "entries": 0, "nd": 0})
        d["where"][where] += 1
        d["entries"] += 1
        if place == "127":
            d["nd"] += 1
        if age in ("A", "B", "C", "D") and not d["age"]:
            d["age"] = age
        g = {"B": "Boys", "M": "Boys", "G": "Girls", "F": "Girls", "W": "Girls"}.get(gen)
        if g and not d["gender"]:
            d["gender"] = g
        if club:
            club_places[(year, stage)][club][where].add(a)

    out = {"generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "home_definition": "where most of the club's athletes competed that season",
           "status_list_seasons": sorted(STATUS_SEASONS),
           "group_labels": {"foreign": "Foreign athletes", "dual": "Dual citizens declared for another federation",
                            "hps": "High Performance Squad", "nd": "Scored non-displacing, reason not on file"},
           "stages": {"Regionals": {}, "Zones": {}}}

    for (year, stage), people in sorted(ath.items()):
        home_of = {}
        for club, places in club_places[(year, stage)].items():
            home_of[club] = max(sorted(places), key=lambda p: len(places[p]))
        ids = set(people)
        by_name = collections.defaultdict(set)
        for a, d in people.items():
            by_name[norm(d["nm"])].add(a)

        def members(test):
            got = set()
            for sid, name, cat, hps in status:
                if not test(cat, hps):
                    continue
                if sid and sid in ids:
                    got.add(sid)
                got |= by_name.get(norm(name), set())
            return got

        groups = {}
        if year in STATUS_SEASONS:
            groups["foreign"] = members(lambda c, h: c == "Foreign")
            groups["dual"] = members(lambda c, h: c == "DualOther")
            groups["hps"] = members(lambda c, h: bool(h))
            known = groups["foreign"] | groups["dual"] | groups["hps"]
            groups["nd"] = {a for a, d in people.items() if d["nd"] and a not in known}
        else:
            groups["nd"] = {a for a, d in people.items() if d["nd"]}

        res = {"all_athletes": len(people), "status_list_on_file": year in STATUS_SEASONS, "groups": {}}
        for key, who in groups.items():
            G = blank()
            for a in who:
                d = people[a]
                where = d["where"].most_common(1)[0][0]
                home = home_of.get(d["club"]) or where          # no club on the row: counted where they competed
                away = home != where
                G["athletes"] += 1
                G["entries"] += d["entries"]
                G["nd_entries"] += d["nd"]
                ak, gk = d["age"] or "Not known", d["gender"] or "Not known"
                G["by_age"][ak]["athletes"] += 1
                G["by_gender"][gk]["athletes"] += 1
                G["by_area"][home]["athletes"] += 1
                G["by_area"][where]["competed"] += 1
                if away:
                    G["competing_away"] += 1
                    G["by_age"][ak]["away"] += 1
                    G["by_gender"][gk]["away"] += 1
                    G["by_area"][home]["left"] += 1
                    G["by_area"][where]["arrived"] += 1
                    G["flows"][(home, where)] += 1
            area_key = lambda x: (len(x), x)
            res["groups"][key] = {
                "athletes": G["athletes"], "entries": G["entries"], "nd_entries": G["nd_entries"],
                "competing_away": G["competing_away"],
                "by_age": {k: G["by_age"][k] for k in sorted(G["by_age"])},
                "by_gender": {k: G["by_gender"][k] for k in sorted(G["by_gender"])},
                "by_area": {k: G["by_area"][k] for k in sorted(G["by_area"], key=area_key)},
                "flows": [{"home": h, "went": w, "athletes": n} for (h, w), n in
                          sorted(G["flows"].items(), key=lambda kv: (-kv[1], kv[0]))]}
            # every total must add up from its parts
            assert sum(v["athletes"] for v in G["by_age"].values()) == G["athletes"]
            assert sum(v["athletes"] for v in G["by_area"].values()) == G["athletes"]
            assert sum(v["competed"] for v in G["by_area"].values()) == G["athletes"]
            assert sum(v["left"] for v in G["by_area"].values()) == G["competing_away"] == sum(G["flows"].values())
        out["stages"][stage][str(year)] = res
        print(f"{year} {stage:9} athletes {len(people):5} | " + " | ".join(
            f"{k} {v['athletes']} ath, {v['entries']} entries, {v['nd_entries']} ND, {v['competing_away']} away"
            for k, v in res["groups"].items()))

    with open(TARGET, "w") as fh:
        json.dump(out, fh, indent=1)
    print("wrote", TARGET)
    cur.close(); conn.close()


if __name__ == "__main__":
    main()
