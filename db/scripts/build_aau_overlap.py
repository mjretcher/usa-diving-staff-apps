#!/usr/bin/env python3
"""
Classify Dive Live meets and measure the AAU <-> USA Diving membership overlap.

WHY THIS RUNS IN CI, NOT THE BROWSER
------------------------------------
Matching requires member names. The browser role (usad_app) deliberately cannot
read membership.members.first_name/last_name -- its credential ships publicly.
So the join happens here, under NEON_DATABASE_URL, and ONLY AGGREGATES are
written back. No name, member_id, or diver_id pairing is ever persisted.

COHORT DEFINITION (explicit, so the number is defensible)
---------------------------------------------------------
"AAU diver" = a distinct Dive Live diver_id appearing in the results of a meet
classified is_domestic_aau by sm_classify.RULE_VERSION. Dive Live carries no
sanctioning field and only ~28% of meets name a body, so this is a
NAMED-EVIDENCE FLOOR, not a census of all AAU divers. Meets that merely echo
RWB branding (club invites, mock meets) and AAU international-team trips are
excluded. Nothing is inferred from club composition or diver overlap, which
would be circular.

MATCH TIERS (reported separately; never silently merged)
--------------------------------------------------------
  exact    normalized "first last" identical
  nickname exact surname + given name equal after nickname folding
  initial  exact surname + same first initial  (WEAK - upper bound only)

Env: DATABASE_URL. Run by .github/workflows/build-aau-overlap.yml.
"""
import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sm_classify import classify, RULE_VERSION

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")

METHOD_VERSION = "overlap-2026-08-08.1"

# Common given-name variants. Folding is deliberately conservative: only
# well-established pairs, because a wrong fold inflates the match rate.
NICKNAMES = {
    "alexander": "alex", "alexandra": "alex", "alexis": "alex",
    "andrew": "andy", "anthony": "tony", "benjamin": "ben",
    "catherine": "kate", "katherine": "kate", "kathryn": "kate",
    "kaitlyn": "kate", "caitlin": "kate", "katie": "kate", "katelyn": "kate",
    "charles": "charlie", "christopher": "chris", "christina": "chris",
    "daniel": "dan", "danielle": "dani", "david": "dave",
    "edward": "ed", "elizabeth": "liz", "eliza": "liz",
    "gabriel": "gabe", "gabriella": "gabby", "gabrielle": "gabby",
    "isabella": "bella", "isabelle": "bella", "jacob": "jake",
    "james": "jim", "jennifer": "jen", "jessica": "jess",
    "jonathan": "jon", "joseph": "joe", "joshua": "josh",
    "madeline": "maddie", "madelyn": "maddie", "madison": "maddie",
    "matthew": "matt", "michael": "mike", "nicholas": "nick",
    "nicole": "nikki", "olivia": "liv", "patrick": "pat",
    "rebecca": "becca", "richard": "rick", "robert": "rob",
    # short forms folded to the same canonical token as their long form,
    # otherwise "Bob" never matches "Robert" and the rate is understated
    "bob": "rob", "bobby": "rob", "robbie": "rob", "rob": "rob",
    "kate": "kate", "katy": "kate", "cate": "kate",
    "beth": "liz", "lizzie": "liz", "betsy": "liz", "liz": "liz",
    "bill": "will", "billy": "will", "willie": "will", "will": "will",
    "jimmy": "jim", "tommy": "tom", "timmy": "tim", "danny": "dan",
    "joey": "joe", "matty": "matt", "nicky": "nick", "sammy": "sam",
    "stevie": "steve", "maddy": "maddie", "zack": "zach", "mikey": "mike",
    "samantha": "sam", "samuel": "sam", "stephanie": "steph",
    "steven": "steve", "stephen": "steve", "thomas": "tom",
    "timothy": "tim", "victoria": "tori", "william": "will", "zachary": "zach",
}

SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def norm(s):
    """Fold accents, join intra-word punctuation, drop suffixes.

    Accents are transliterated rather than deleted (Jose, not Jos) and
    apostrophes/hyphens are CLOSED rather than split, so O'Brien -> obrien and
    Mary-Kate -> marykate. Deleting them instead truncates surnames to their
    final fragment ("brien"), which silently suppresses real matches.
    """
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = s.replace("(ex.)", " ").replace("(ex)", " ")
    s = re.sub(r"[\u2018\u2019'`\-]", "", s)   # close, do not split
    s = re.sub(r"[^a-z\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    parts = [p for p in s.split() if p not in SUFFIXES]
    return " ".join(parts)


def split_name(full):
    """Dive Live gives one string. Return (given, surname)."""
    p = norm(full).split()
    if len(p) < 2:
        return (p[0] if p else "", "")
    return (p[0], p[-1])


def fold(given):
    return NICKNAMES.get(given, given)


def db():
    import psycopg2
    return psycopg2.connect(DB_URL)


def main():
    conn = db()
    cur = conn.cursor()

    # ---------------------------------------------------- classify meets
    cur.execute("""SELECT meet_id, meet_name, start_date,
                          NULLIF(data->>'# divers','')::numeric
                   FROM scoresandmore.meets WHERE start_date <= current_date""")
    meets = cur.fetchall()
    rows = []
    for mid, name, sdate, divers in meets:
        c = classify(name)
        rows.append((mid, name, sdate, c["body"], c["series"], c["color"],
                     c["region"], c["is_domestic_aau"], c["rule"], RULE_VERSION,
                     int(divers or 0)))

    cur.execute("TRUNCATE scoresandmore.meet_classification")
    from psycopg2.extras import execute_values
    execute_values(cur, """INSERT INTO scoresandmore.meet_classification
        (meet_id, meet_name, start_date, body, series, rwb_color, rwb_region,
         is_domestic_aau, rule, rule_version, source_diver_count) VALUES %s""", rows)
    n_aau = sum(1 for r in rows if r[7])
    print(f"classified {len(rows)} meets  ({n_aau} domestic AAU)  rules {RULE_VERSION}")

    # ---------------------------------------------------- AAU cohort
    cur.execute("""
        SELECT r.diver_id, r.diver_name,
               EXTRACT(YEAR FROM m.start_date)::int yr
        FROM scoresandmore.event_results r
        JOIN scoresandmore.meet_classification m ON m.meet_id = r.meet_id
        WHERE m.is_domestic_aau AND r.diver_id IS NOT NULL""")
    cohort = {}                      # (diver_id, yr) -> name
    for did, dname, yr in cur.fetchall():
        cohort.setdefault((did, yr), dname)
    print(f"AAU cohort rows: {len(cohort)}")

    # ---------------------------------------------------- membership index
    cur.execute("""SELECT membership_year, first_name, last_name
                   FROM membership.members
                   WHERE membership_type ILIKE '%%Athlete%%'
                     AND first_name IS NOT NULL AND last_name IS NOT NULL""")
    exact_ix, nick_ix, init_ix = {}, {}, {}
    for yr, fn, ln in cur.fetchall():
        g, s = norm(fn), norm(ln).split(" ")[-1] if norm(ln) else ""
        if not g or not s:
            continue
        exact_ix.setdefault(yr, set()).add(f"{g} {s}")
        nick_ix.setdefault(yr, set()).add(f"{fold(g)} {s}")
        init_ix.setdefault(yr, set()).add(f"{g[0]} {s}")
    print(f"membership years indexed: {sorted(exact_ix)}")

    # ---------------------------------------------------- match
    out = {}
    for (did, yr), dname in cohort.items():
        g, s = split_name(dname)
        if not g or not s:
            continue
        b = out.setdefault(yr, dict(cohort=0, exact=0, nickname=0, initial=0))
        b["cohort"] += 1
        # Same-year membership; fall back to prior year (season straddles years)
        yrs = [y for y in (yr, yr - 1) if y in exact_ix]
        if any(f"{g} {s}" in exact_ix[y] for y in yrs):
            b["exact"] += 1
            b["nickname"] += 1
            b["initial"] += 1
        elif any(f"{fold(g)} {s}" in nick_ix[y] for y in yrs):
            b["nickname"] += 1
            b["initial"] += 1
        elif any(f"{g[0]} {s}" in init_ix[y] for y in yrs):
            b["initial"] += 1

    cur.execute("TRUNCATE scoresandmore.aau_usad_overlap")
    recs = []
    for yr, b in sorted(out.items()):
        for tier in ("exact", "nickname", "initial"):
            recs.append((yr, tier, b["cohort"], b[tier],
                         round(100.0 * b[tier] / b["cohort"], 2) if b["cohort"] else None,
                         METHOD_VERSION, RULE_VERSION))
    execute_values(cur, """INSERT INTO scoresandmore.aau_usad_overlap
        (cohort_year, match_tier, aau_divers, matched_usad, match_pct,
         method_version, rule_version) VALUES %s""", recs)

    cur.execute("""INSERT INTO app_meta.config (key, value, description)
        VALUES (%s,%s,'AAU/USAD overlap build report')
        ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()""",
        ("aau_overlap_last_run", json.dumps({
            "at": datetime.now(timezone.utc).isoformat(),
            "rule_version": RULE_VERSION, "method_version": METHOD_VERSION,
            "domestic_aau_meets": n_aau, "cohort_rows": len(cohort),
            "by_year": {str(k): v for k, v in sorted(out.items())}})))

    conn.commit()
    print("\ncohort_year  tier      aau_divers  matched   pct")
    for yr, tier, c, mt, pct, *_ in recs:
        print(f"  {yr}      {tier:9} {c:>9} {mt:>8}   {pct}%")
    cur.close(); conn.close()


if __name__ == "__main__":
    main()
