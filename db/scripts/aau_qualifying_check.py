#!/usr/bin/env python3
"""
For AAU (Summer) National Championship attendees, check whether we have any
record of them clearing the published qualifying score at ANY meet in our
data -- Dive Live (AAU + whatever high-school meets it hosts) or USA Diving
(core.event_results) -- during the competitive year. Writes aggregates only
to scoresandmore.aau_qualifying_check(_detail); runs in CI under owner
credentials for the same reason build_aau_overlap.py does (core.event_results
carries diver_first/diver_last, and the browser role should not be the one
running a cross-source name match at scale even though those particular
names are otherwise public).

WHAT THIS CAN AND CANNOT SAY
-----------------------------
"No qualifying result found in our data" is NOT the same as "did not have a
qualifying score." Per the source PDF (aau_qualifying_scores.py), a score is
also accepted from USA Diving, NFHS (1-meter only), AQUA/FINA, or Diving
Plongeon Canada events:
  - USA Diving results (core.event_results, 123k+ rows, clean age_group/
    gender/discipline/score fields) ARE cross-referenced, by normalized
    exact first+last name -- the strictest tier the AAU/USAD overlap build
    uses, no nickname folding here. A diver whose Dive-Live name doesn't
    exactly match how DiveMeets recorded them will be missed.
  - NFHS (high school) meets are partially covered via Dive Live's own
    'high_school'-classified meets. Not a national census of every state
    high-school meet.
  - AQUA/FINA and Diving Plongeon Canada (international/Canadian meets) are
    not in our data at all.
So a diver who "comes up empty" here may still have legitimately qualified
at a state HS meet we never scraped, or internationally -- this is a floor
on verified qualification (AAU + USA Diving + partial NFHS), not a
determination that anyone lacked a score.

DIVE COUNT: AAU's age-group dive counts are fixed by rule, not a field we
can reliably read off a scraped result (meet_events.num_dives inspected and
rejected -- it does not represent per-diver dive count). This checker
therefore assumes a result was scored under the rule-mandated dive count for
its apparent age group, per AAU's own rules, and compares raw totals
directly. It does not independently verify each individual result's dive
count.

Env: DATABASE_URL. Run by .github/workflows/build-aau-overlap.yml (same
workflow as the overlap build -- same data family, same daily cadence).
"""
import json
import os
import re
import sys
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aau_age_group import classify_event_title, RULE_VERSION as AGE_GROUP_RULE_VERSION
from aau_qualifying_scores import QUALIFYING_SCORES, RULE_VERSION as SCORES_RULE_VERSION

METHOD_VERSION = "qualifying-check-2026-09-21.1"
GENDER_TO_AGEGROUP_WORD = {"Male": "Boys", "Female": "Girls"}
CHECK_YEARS = (2025, 2026)

DB_URL = os.environ.get("DATABASE_URL")


def db():
    import psycopg2
    return psycopg2.connect(DB_URL)


def window_start(yr):
    """The competitive year straddles Sept (yr-1) to mid-July (yr)."""
    return date(yr - 1, 9, 1)


def norm_name(first, last):
    """Exact tier only (no nickname folding) -- this is an analytical
    cross-check, not a persisted membership match."""
    def clean(s):
        return re.sub(r"[^a-z]", "", (s or "").lower())
    return clean(first), clean(last)


def split_dive_live_name(full):
    parts = re.sub(r"[^a-zA-Z\s]", " ", (full or "")).split()
    if len(parts) < 2:
        return "", ""
    return parts[0], parts[-1]


def usad_qualifying_lookup(cur, yr):
    """diver (first,last) normalized -> set of (group, gender_word, apparatus)
    cleared at a USA Diving meet within year in (yr-1, yr) -- the finest
    date granularity core.event_results offers."""
    cur.execute("""
        SELECT diver_first, diver_last, age_group, gender, discipline, score
        FROM core.event_results
        WHERE year IN (%s, %s)
          AND age_group IN ('Group D','Group C','Group B','Group A')
          AND gender IN ('Boys','Girls')
          AND discipline IN ('1M','3M','Platform')
          AND score IS NOT NULL""", (yr - 1, yr))
    cleared = {}
    for first, last, ag, gender, disc, score in cur.fetchall():
        group = ag.replace("Group ", "")
        thresh = QUALIFYING_SCORES.get(group, {}).get(gender, {}).get(disc)
        if not thresh or float(score) < thresh["score"]:
            continue
        cleared.setdefault(norm_name(first, last), set()).add((group, gender, disc))
    return cleared


def check_year(cur, yr):
    cur.execute("""SELECT MIN(start_date) FROM scoresandmore.meet_classification
                   WHERE series='aau_nationals' AND EXTRACT(YEAR FROM start_date)=%s""", (yr,))
    row = cur.fetchone()
    nationals_date = row[0] if row else None
    if not nationals_date:
        print(f"{yr}: no AAU Nationals meet found in our data, skipping")
        return None
    win_start = window_start(yr)

    # 1) Every Nationals attendee's OWN (group, gender_word, apparatus)
    #    bucket, read off their own Nationals entry.
    cur.execute("""
        SELECT r.diver_id, r.diver_name, me.event_title, me.gender
        FROM scoresandmore.event_results r
        JOIN scoresandmore.meet_classification m ON m.meet_id = r.meet_id
        JOIN scoresandmore.meet_events me ON me.meet_id = r.meet_id AND me.event_id = r.event_id
        WHERE m.series = 'aau_nationals' AND EXTRACT(YEAR FROM m.start_date) = %s
          AND r.diver_id IS NOT NULL""", (yr,))
    attendee_buckets, attendee_name = {}, {}
    for did, dname, title, gender in cur.fetchall():
        c = classify_event_title(title, gender)
        if c["track"] != "AGE_GROUP" or c["usad_group"] not in ("D", "C", "B", "A") or c["apparatus"] is None:
            continue   # Group E (no minimum), adult tracks, mixed brackets, synchro -- not this check
        gw = GENDER_TO_AGEGROUP_WORD.get(gender)
        if not gw:
            continue
        attendee_buckets.setdefault(did, set()).add((c["usad_group"], gw, c["apparatus"]))
        attendee_name[did] = dname

    if not attendee_buckets:
        print(f"{yr}: no age-group (D/C/B/A) Nationals entries found")
        return None

    # 2) EVERY Dive-Live result for those same divers, any meet, any
    #    classification, in the qualifying window -- widens the net beyond
    #    meets flagged domestic-AAU by name (most of the results volume).
    diver_ids = list(attendee_buckets.keys())
    cur.execute("""
        SELECT r.diver_id, r.total, me.event_title, me.gender
        FROM scoresandmore.event_results r
        JOIN scoresandmore.meet_classification m ON m.meet_id = r.meet_id
        JOIN scoresandmore.meet_events me ON me.meet_id = r.meet_id AND me.event_id = r.event_id
        WHERE r.diver_id = ANY(%s) AND m.start_date >= %s AND m.start_date <= %s
        """, (diver_ids, win_start, nationals_date))
    qualified = {}
    for did, total, title, gender in cur.fetchall():
        if total is None:
            continue
        c = classify_event_title(title, gender)
        if c["track"] != "AGE_GROUP" or c["usad_group"] not in ("D", "C", "B", "A") or c["apparatus"] is None:
            continue
        gw = GENDER_TO_AGEGROUP_WORD.get(gender)
        if not gw:
            continue
        thresh = QUALIFYING_SCORES.get(c["usad_group"], {}).get(gw, {}).get(c["apparatus"])
        if thresh and float(total) >= thresh["score"]:
            qualified.setdefault(did, set()).add((c["usad_group"], gw, c["apparatus"]))

    # 3) Same check against USA Diving results, by normalized exact name.
    usad_cleared = usad_qualifying_lookup(cur, yr)
    usad_key_for = {did: norm_name(*split_dive_live_name(attendee_name[did])) for did in diver_ids}

    # 4) Compare, per attendee AND per (group, gender, apparatus) bucket --
    #    the detail rows are what let the dashboard break this down instead
    #    of only showing one overall number.
    detail = {}   # (group, gender, apparatus) -> dict(entrants, dl_only, ud_only, both, neither)
    for did, buckets in attendee_buckets.items():
        for b in buckets:
            dl_hit = b in qualified.get(did, set())
            ud_hit = b in usad_cleared.get(usad_key_for[did], set())
            d = detail.setdefault(b, dict(entrants=0, dl_only=0, ud_only=0, both=0, neither=0))
            d["entrants"] += 1
            if dl_hit and ud_hit:
                d["both"] += 1
            elif dl_hit:
                d["dl_only"] += 1
            elif ud_hit:
                d["ud_only"] += 1
            else:
                d["neither"] += 1

    # Overall (per-attendee, not summed from the per-bucket detail above --
    # a diver entering multiple events must only count once here).
    total_n = len(attendee_buckets)
    dl_only = ud_only = both = neither = 0
    for did, buckets in attendee_buckets.items():
        dl_hit = bool(buckets & qualified.get(did, set()))
        ud_hit = bool(buckets & usad_cleared.get(usad_key_for[did], set()))
        if dl_hit and ud_hit: both += 1
        elif dl_hit: dl_only += 1
        elif ud_hit: ud_only += 1
        else: neither += 1
    verified_n = both + dl_only + ud_only

    print(f"\n=== {yr} AAU Nationals (age-group D/C/B/A entrants only; window {win_start} to {nationals_date}) ===")
    print(f"  entrants checked: {total_n}")
    print(f"  verified via AAU/Dive-Live result only: {dl_only}")
    print(f"  verified via USA Diving result only:    {ud_only}")
    print(f"  verified via both sources:               {both}")
    print(f"  verified overall:                        {verified_n} ({100*verified_n/total_n:.1f}%)")
    print(f"  NO qualifying result found in either:    {neither} ({100*neither/total_n:.1f}%)")
    return dict(year=yr, total=total_n, dl_only=dl_only, ud_only=ud_only, both=both,
                verified=verified_n, unverified=neither, detail=detail)


def main():
    if not DB_URL:
        sys.exit("DATABASE_URL not set")
    conn = db()
    cur = conn.cursor()

    results = [r for r in (check_year(cur, yr) for yr in CHECK_YEARS) if r]
    if not results:
        print("Nothing to write -- no years had data.")
        cur.close(); conn.close()
        return

    from psycopg2.extras import execute_values

    cur.execute("TRUNCATE scoresandmore.aau_qualifying_check")
    coarse_recs = [
        (r["year"], r["total"], r["dl_only"], r["ud_only"], r["both"], r["verified"], r["unverified"],
         round(100.0 * r["verified"] / r["total"], 2) if r["total"] else None,
         METHOD_VERSION, SCORES_RULE_VERSION, AGE_GROUP_RULE_VERSION)
        for r in results
    ]
    execute_values(cur, """INSERT INTO scoresandmore.aau_qualifying_check
        (cohort_year, entrants, verified_dive_live_only, verified_usad_only, verified_both,
         verified_total, unverified, verified_pct, method_version, scores_rule_version,
         age_group_rule_version) VALUES %s""", coarse_recs)

    cur.execute("TRUNCATE scoresandmore.aau_qualifying_check_detail")
    detail_recs = []
    for r in results:
        for (group, gender, apparatus), d in r["detail"].items():
            verified = d["both"] + d["dl_only"] + d["ud_only"]
            detail_recs.append((r["year"], group, gender, apparatus, d["entrants"],
                                 d["dl_only"], d["ud_only"], d["both"], verified, d["neither"],
                                 round(100.0 * verified / d["entrants"], 2) if d["entrants"] else None,
                                 METHOD_VERSION, SCORES_RULE_VERSION, AGE_GROUP_RULE_VERSION))
    execute_values(cur, """INSERT INTO scoresandmore.aau_qualifying_check_detail
        (cohort_year, usad_group, gender, apparatus, entrants, verified_dive_live_only,
         verified_usad_only, verified_both, verified_total, unverified, verified_pct,
         method_version, scores_rule_version, age_group_rule_version) VALUES %s""", detail_recs)

    cur.execute("""INSERT INTO app_meta.config (key, value, description)
        VALUES (%s,%s,'AAU qualifying-score verification check')
        ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()""",
        ("aau_qualifying_check_last_run", json.dumps({
            "at": datetime.now(timezone.utc).isoformat(),
            "method_version": METHOD_VERSION, "scores_rule_version": SCORES_RULE_VERSION,
            "age_group_rule_version": AGE_GROUP_RULE_VERSION,
            "by_year": {str(r["year"]): {k: v for k, v in r.items() if k != "detail"} for r in results}})))

    conn.commit()
    print(f"\nwrote {len(coarse_recs)} coarse rows, {len(detail_recs)} detail rows")
    cur.close(); conn.close()


if __name__ == "__main__":
    main()
