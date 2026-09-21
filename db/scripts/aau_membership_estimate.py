#!/usr/bin/env python3
"""
Estimate AAU's own membership size -- something USA Diving has no direct
visibility into -- from unique event-entry names across every domestic-AAU-
classified Dive Live meet in a season. Mike's own framing (2026-09-21): AAU
publishes no membership numbers we can pull, so counting who actually shows
up to compete, year over year, by gender and age group, is the way to
estimate it and set it beside our own membership.

TWO IDENTITY KEYS, BOTH REPORTED -- NEITHER IS "THE" ANSWER
-------------------------------------------------------------
  - unique_names:     distinct normalized "first last" (deleting duplicates
                       across meets and events -- the method Mike asked for)
  - unique_diver_ids: distinct Dive Live diver_id (the identity key the
                       AAU/USAD overlap build already uses)
These usually track closely. Where they diverge it is itself informative:
unique_names < unique_diver_ids suggests the same person picked up more than
one diver_id (a real duplicate the diver_id count would over-state); unique_
names > unique_diver_ids would mean two different people share a normalized
name (a rarer risk, and it means the name count understates reality for that
slice). Report both rather than silently picking one.

SCOPE: this is a floor on true AAU membership, not a census. It only counts
people we have EVIDENCE of via a domestic-AAU-classified meet result (55
meets currently) -- an AAU member who only trains, or whose club's meets
don't carry AAU branding in the name (most of Dive Live's volume: 52,621 of
82,471 total results sit in meets never specifically flagged AAU by name),
is invisible to this count. It is a lower bound, likely a substantial one.

Env: DATABASE_URL. Run by .github/workflows/build-aau-overlap.yml.
"""
import os
import re
import sys
from datetime import datetime, timezone
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aau_age_group import classify_event_title, RULE_VERSION as AGE_GROUP_RULE_VERSION

METHOD_VERSION = "membership-estimate-2026-09-21.1"
GENDER_TO_AGEGROUP_WORD = {"Male": "Boys", "Female": "Girls"}
CLEAN_GROUPS = {"D", "C", "B", "A", "19PLUS"}
OTHER_BUCKET = "OTHER"   # Group E, mixed brackets, synchro, logistics-adjacent, unclassifiable

DB_URL = os.environ.get("DATABASE_URL")


def db():
    import psycopg2
    return psycopg2.connect(DB_URL)


def norm_name(full):
    return re.sub(r"[^a-z]", "", (full or "").lower())


def main():
    if not DB_URL:
        sys.exit("DATABASE_URL not set")
    conn = db()
    cur = conn.cursor()

    # Grand total per year -- every distinct name/diver_id in ANY domestic-
    # AAU-classified result, no bucketing, so nobody is dropped for lacking a
    # classifiable age-group event (e.g. Masters-only or logistics rows).
    cur.execute("""
        SELECT EXTRACT(YEAR FROM m.start_date)::int yr, r.diver_id, r.diver_name
        FROM scoresandmore.event_results r
        JOIN scoresandmore.meet_classification m ON m.meet_id = r.meet_id
        WHERE m.is_domestic_aau AND r.diver_id IS NOT NULL AND r.diver_name IS NOT NULL""")
    total_names, total_ids = {}, {}
    for yr, did, dname in cur.fetchall():
        total_names.setdefault(yr, set()).add(norm_name(dname))
        total_ids.setdefault(yr, set()).add(did)

    # Breakdown by gender x broad age bucket -- needs the event's own title
    # and gender, same join as the overlap detail build.
    cur.execute("""
        SELECT EXTRACT(YEAR FROM m.start_date)::int yr, r.diver_id, r.diver_name,
               me.gender, me.event_title
        FROM scoresandmore.event_results r
        JOIN scoresandmore.meet_classification m ON m.meet_id = r.meet_id
        JOIN scoresandmore.meet_events me ON me.meet_id = r.meet_id AND me.event_id = r.event_id
        WHERE m.is_domestic_aau AND r.diver_id IS NOT NULL AND r.diver_name IS NOT NULL""")
    bucket_names, bucket_ids = {}, {}   # (yr, gender_word, group) -> set
    for yr, did, dname, gender, title in cur.fetchall():
        gw = GENDER_TO_AGEGROUP_WORD.get(gender)
        if not gw:
            continue   # 'Any' / null gender events (mixed-gender relays, etc.) -- no clean bucket
        c = classify_event_title(title, gender)
        group = c["usad_group"] if c["usad_group"] in CLEAN_GROUPS else OTHER_BUCKET
        key = (yr, gw, group)
        bucket_names.setdefault(key, set()).add(norm_name(dname))
        bucket_ids.setdefault(key, set()).add(did)

    years = sorted(total_names)
    print("\ncohort_year  unique_names  unique_diver_ids  gap")
    coarse_recs = []
    for yr in years:
        n, i = len(total_names[yr]), len(total_ids[yr])
        print(f"  {yr}         {n:>7}       {i:>7}        {n-i:+d}")
        coarse_recs.append((yr, n, i, METHOD_VERSION, AGE_GROUP_RULE_VERSION))

    detail_recs = []
    for (yr, gw, group), names in bucket_names.items():
        ids = bucket_ids[(yr, gw, group)]
        detail_recs.append((yr, gw, group, len(names), len(ids), METHOD_VERSION, AGE_GROUP_RULE_VERSION))

    from psycopg2.extras import execute_values

    cur.execute("TRUNCATE scoresandmore.aau_membership_estimate")
    execute_values(cur, """INSERT INTO scoresandmore.aau_membership_estimate
        (cohort_year, unique_names, unique_diver_ids, method_version, age_group_rule_version)
        VALUES %s""", coarse_recs)

    cur.execute("TRUNCATE scoresandmore.aau_membership_estimate_detail")
    execute_values(cur, """INSERT INTO scoresandmore.aau_membership_estimate_detail
        (cohort_year, gender, usad_group, unique_names, unique_diver_ids, method_version,
         age_group_rule_version) VALUES %s""", detail_recs)

    cur.execute("""INSERT INTO app_meta.config (key, value, description)
        VALUES (%s,%s,'AAU membership estimate (unique names, all domestic-AAU meets)')
        ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()""",
        ("aau_membership_estimate_last_run", json.dumps({
            "at": datetime.now(timezone.utc).isoformat(),
            "method_version": METHOD_VERSION, "age_group_rule_version": AGE_GROUP_RULE_VERSION,
            "by_year": {str(yr): {"unique_names": len(total_names[yr]), "unique_diver_ids": len(total_ids[yr])} for yr in years}})))

    conn.commit()
    print(f"\nwrote {len(coarse_recs)} coarse rows, {len(detail_recs)} detail rows")
    cur.close(); conn.close()


if __name__ == "__main__":
    main()
