#!/usr/bin/env python3
"""
For AAU (Summer) National Championship attendees, check whether we have any
record of them clearing the published qualifying score at ANY meet in our
Dive Live scrape during the competitive year.

WHAT THIS CAN AND CANNOT SAY
-----------------------------
"No qualifying result found in our data" is NOT the same as "did not have a
qualifying score." Per the source PDF (aau_qualifying_scores.py), a score is
also accepted from USA Diving, NFHS (1-meter only), AQUA/FINA, or Diving
Plongeon Canada events:
  - USA Diving results (core.event_results, 123k+ rows, clean age_group/
    gender/discipline/score fields) ARE cross-referenced, by normalized
    exact first+last name -- the same tier the AAU/USAD overlap build uses
    at its strictest, no nickname folding here. A diver whose Dive-Live
    name doesn't exactly match how DiveMeets recorded them will be missed.
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

Runs over the public HTTP SQL endpoint (same credential the browser apps
use) -- no PII involved; diver names in Dive Live results are already
public, unlike membership.members.
"""
import json
import os
import sys
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aau_age_group import classify_event_title
from aau_qualifying_scores import QUALIFYING_SCORES, COMPETITIVE_WINDOW

import requests

SQL_URL = "https://ep-holy-bird-aj5deo63.c-3.us-east-2.aws.neon.tech/sql"
CONN = os.environ.get(
    "USAD_APP_CONN",
    "postgresql://usad_app:npg_app_F6iHP3fFK7OhBpNSlsz0nEB@"
    "ep-holy-bird-aj5deo63-pooler.c-3.us-east-2.aws.neon.tech/neondb"
    "?sslmode=require&channel_binding=require",
)


def q(sql):
    r = requests.post(
        SQL_URL,
        headers={
            "Neon-Connection-String": CONN,
            "Neon-Raw-Text-Output": "false",
            "Neon-Array-Mode": "true",
            "Content-Type": "application/json",
        },
        json={"query": sql},
    )
    r.raise_for_status()
    return r.json().get("rows", [])


GENDER_TO_AGEGROUP_WORD = {"Male": "Boys", "Female": "Girls"}
# window_start(yr) -- the competitive year straddles Sept (yr-1) to mid-July (yr).
def window_start(yr):
    return date(yr - 1, 9, 1)


def norm_name(first, last):
    """Same normalization spirit as build_aau_overlap.py's norm() -- lowercase,
    strip punctuation -- but simpler (exact tier only, no nickname folding;
    this is an analytical check, not a persisted membership match)."""
    import re
    def clean(s):
        return re.sub(r"[^a-z]", "", (s or "").lower())
    return clean(first), clean(last)


def split_dive_live_name(full):
    import re
    parts = re.sub(r"[^a-zA-Z\s]", " ", (full or "")).split()
    if len(parts) < 2:
        return "", ""
    return parts[0], parts[-1]


def usad_qualifying_lookup(yr):
    """diver (first,last) normalized -> set of (group, gender_word, apparatus)
    they cleared at a USA Diving meet (core.event_results) within year in
    (yr-1, yr) -- the finest-grained date this table offers."""
    rows = q(f"""
        SELECT diver_first, diver_last, age_group, gender, discipline, score
        FROM core.event_results
        WHERE year IN ({yr - 1}, {yr})
          AND age_group IN ('Group D','Group C','Group B','Group A')
          AND gender IN ('Boys','Girls')
          AND discipline IN ('1M','3M','Platform')
          AND score IS NOT NULL
    """)
    cleared = {}
    for first, last, ag, gender, disc, score in rows:
        group = ag.replace("Group ", "")
        thresh = QUALIFYING_SCORES.get(group, {}).get(gender, {}).get(disc)
        if not thresh or float(score) < thresh["score"]:
            continue
        key = norm_name(first, last)
        cleared.setdefault(key, set()).add((group, gender, disc))
    return cleared


def check_year(yr):
    nationals_start_rows = q(
        f"SELECT MIN(start_date) FROM scoresandmore.meet_classification "
        f"WHERE series='aau_nationals' AND EXTRACT(YEAR FROM start_date)={yr}"
    )
    nationals_date = nationals_start_rows[0][0]
    if not nationals_date:
        print(f"{yr}: no AAU Nationals meet found in our data, skipping")
        return None
    nationals_date = datetime.strptime(nationals_date, "%Y-%m-%d").date()
    win_start = window_start(yr)

    # 1) Every Nationals attendee's OWN (group, gender_word, apparatus) bucket,
    #    read off their own Nationals entry -- Nationals event titles use the
    #    same age-group language, so this is the authoritative source for
    #    which bucket each attendee actually competed in.
    nat_rows = q(f"""
        SELECT r.diver_id, r.diver_name, me.event_title, me.gender
        FROM scoresandmore.event_results r
        JOIN scoresandmore.meet_classification m ON m.meet_id = r.meet_id
        JOIN scoresandmore.meet_events me ON me.meet_id = r.meet_id AND me.event_id = r.event_id
        WHERE m.series = 'aau_nationals' AND EXTRACT(YEAR FROM m.start_date) = {yr}
          AND r.diver_id IS NOT NULL
    """)
    attendee_buckets = {}   # diver_id -> set of (group, gender_word, apparatus)
    attendee_name = {}
    for did, dname, title, gender in nat_rows:
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
    #    classification, in or near the qualifying window -- this is the
    #    part that widens the net beyond the 'domestic AAU'-flagged meets,
    #    which is most of the volume (52,621 of 82,471 total results sit in
    #    meets never specifically flagged AAU by name).
    diver_ids = list(attendee_buckets.keys())
    id_list = ",".join(str(d) for d in diver_ids)
    all_results = q(f"""
        SELECT r.diver_id, r.total, me.event_title, me.gender, m.start_date
        FROM scoresandmore.event_results r
        JOIN scoresandmore.meet_classification m ON m.meet_id = r.meet_id
        JOIN scoresandmore.meet_events me ON me.meet_id = r.meet_id AND me.event_id = r.event_id
        WHERE r.diver_id IN ({id_list}) AND m.start_date >= '{win_start.isoformat()}'
          AND m.start_date <= '{nationals_date.isoformat()}'
    """)

    qualified = {}   # diver_id -> set of (group, gender_word, apparatus) they cleared
    for did, total, title, gender, start_date in all_results:
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

    # 3) Same check against USA Diving results (core.event_results), by
    #    normalized exact name -- widens the check beyond Dive Live entirely.
    usad_cleared = usad_qualifying_lookup(yr)
    usad_key_for = {did: norm_name(*split_dive_live_name(attendee_name[did])) for did in diver_ids}

    # 4) Compare: for each attendee's Nationals bucket, did we find a
    #    qualifying result in that SAME bucket anywhere -- Dive Live OR USA
    #    Diving -- in the window?
    dive_live_only, usad_only, both, neither = [], [], [], []
    detail_rows = []
    for did, buckets in attendee_buckets.items():
        dl_hit = bool(buckets & qualified.get(did, set()))
        ud_hit = bool(buckets & usad_cleared.get(usad_key_for[did], set()))
        if dl_hit and ud_hit:
            both.append(did)
        elif dl_hit:
            dive_live_only.append(did)
        elif ud_hit:
            usad_only.append(did)
        else:
            neither.append(did)
        for b in buckets:
            detail_rows.append((did, attendee_name[did], b[0], b[1], b[2],
                                 b in qualified.get(did, set()), b in usad_cleared.get(usad_key_for[did], set())))

    total_n = len(attendee_buckets)
    verified_n = len(both) + len(dive_live_only) + len(usad_only)
    print(f"\n=== {yr} AAU Nationals (age-group D/C/B/A entrants only; window {win_start} to {nationals_date}) ===")
    print(f"  entrants checked: {total_n}")
    print(f"  verified via AAU/Dive-Live result only: {len(dive_live_only)}")
    print(f"  verified via USA Diving result only:    {len(usad_only)}")
    print(f"  verified via both sources:               {len(both)}")
    print(f"  verified overall:                        {verified_n} ({100*verified_n/total_n:.1f}%)")
    print(f"  NO qualifying result found in either:    {len(neither)} ({100*len(neither)/total_n:.1f}%)")
    return dict(year=yr, total=total_n, dive_live_only=len(dive_live_only), usad_only=len(usad_only),
                both=len(both), verified=verified_n, unverified=len(neither), detail=detail_rows)


if __name__ == "__main__":
    results = []
    for yr in (2025, 2026):
        r = check_year(yr)
        if r:
            results.append(r)
    with open("/tmp/aau_qualifying_check_results.json", "w") as f:
        json.dump(results, f, default=str)
