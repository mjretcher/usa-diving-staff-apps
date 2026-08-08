#!/usr/bin/env python3
"""
Meet classification for Dive Live (ScoresAndMore) meets.

Dive Live hosts meets for many organisations and carries NO sanctioning field.
Only ~28% of meets name a sanctioning body, so classification is name-evidence
only. Nothing is inferred from diver overlap or club composition -- that would
be circular, because the output is used to define the AAU cohort.

Every meet records the rule that fired. Bump RULE_VERSION whenever a rule
changes, so a stored classification can always be reproduced.

Decision order (explicit, not regex-precedence):
  1. disqualifiers   -- applied only to meets that otherwise read as AAU
  2. non-AAU bodies  -- NCAA / high school / YMCA / masters
  3. AAU international team trips -- NOT domestic competition
  4. AAU domestic series -- qualifier beats nationals, because an RWB
     "National Qualifier" is a feeder meet, not the championship
"""
import re

RULE_VERSION = "2026-08-08.2"

DISQUALIFIERS = [
    ("mock_or_pre_meet",    r"\bmock\b|\bpre[- ]?rwb\b|\brwb pre[- ]meet\b"),
    ("club_patriotic_name", r"red[ ,]*white[ ,]*(and |& )?blue\s+(invite|invitational)\b"),
]

RE_AAU       = r"\baau\b"
RE_RWB       = r"\brwb\b|red[ ,\-]*white[ ,\-]*(and |& )?blue"
RE_QUALIFIER = r"\bqualif\w*\b|\bqual\b"
RE_NATIONAL  = r"\bnational\w*\b"
# "AAU National Team", "AAU National Diving Team", "(AAU TEAM)"
RE_INTL      = (r"\binternational\b"
                r"|\bnational\s+(\w+\s+){0,2}team\b"
                r"|\baau team\b|\(aau team\)")

COLORS  = [("red", r"\bred\b"), ("white", r"\bwhite\b"), ("blue", r"\bblue\b")]
REGIONS = [("north", r"\bnorth\b"), ("south", r"\bsouth\b"), ("central", r"\bcentral\b")]

NON_AAU_BODIES = [
    ("ncaa",        "ncaa",    r"\bncaa\b|\bconference championship"),
    ("high_school", "hs",      r"\bhigh school\b|\bhs\b|\bstate (meet|championship)\b|\bsectional\b"),
    ("ymca",        "ymca",    r"\bymca\b"),
    ("masters",     "masters", r"\bmasters?\b"),
]


def _axes(n):
    return (next((c for c, p in COLORS  if re.search(p, n)), None),
            next((r for r, p in REGIONS if re.search(p, n)), None))


def classify(name):
    """Return dict: series, body, color, region, rule, is_domestic_aau."""
    n = (name or "").lower()
    color, region = _axes(n)

    looks_aau = bool(re.search(RE_AAU, n) or re.search(RE_RWB, n))

    # 1. disqualifiers -- only for meets that otherwise read as AAU, so an
    #    ordinary club practice meet is not recorded as a non-AAU finding.
    if looks_aau:
        for rule, pat in DISQUALIFIERS:
            if re.search(pat, n):
                return dict(series="non_aau", body="other", color=None,
                            region=None, rule=rule, is_domestic_aau=False)

    # 2. other sanctioning bodies (only when not AAU-branded)
    if not looks_aau:
        for series, body, pat in NON_AAU_BODIES:
            if re.search(pat, n):
                return dict(series=series, body=body, color=None, region=None,
                            rule=series, is_domestic_aau=False)
        return dict(series="unclassified", body="unknown", color=None,
                    region=None, rule="no_match", is_domestic_aau=False)

    # 3. AAU international team trips -- elite selections abroad, not domestic
    if re.search(RE_AAU, n) and re.search(RE_INTL, n):
        return dict(series="aau_intl_team", body="aau", color=None, region=None,
                    rule="aau_intl_team", is_domestic_aau=False)

    is_rwb  = bool(re.search(RE_RWB, n)) or bool(color and region)
    is_qual = bool(re.search(RE_QUALIFIER, n))
    is_natl = bool(re.search(RE_NATIONAL, n))

    # 4. domestic AAU. Qualifier ALWAYS beats nationals: an RWB "National
    #    Qualifier" is a feeder meet for nationals, not the championship.
    if is_rwb and is_qual:
        series = "aau_rwb_qualifier"
    elif is_rwb and is_natl:
        series = "aau_rwb_nationals"
    elif is_rwb:
        series = "aau_rwb_other"
    elif is_qual:
        series = "aau_qualifier"
    elif is_natl:
        series = "aau_nationals"
    elif re.search(r"\b(district|association|regional)\b", n):
        series = "aau_district"
    else:
        series = "aau_other"

    return dict(series=series, body="aau",
                color=color if is_rwb else None,
                region=region if is_rwb else None,
                rule=series, is_domestic_aau=True)


if __name__ == "__main__":
    import json, sys, collections
    meets = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "meets.json"))
    tally, aau = collections.Counter(), []
    for m in meets:
        c = classify(m["name"])
        tally[c["series"]] += 1
        if c["is_domestic_aau"]:
            aau.append((m, c))
    print(f"RULE_VERSION {RULE_VERSION}   meets {len(meets)}\n")
    for k, v in tally.most_common():
        print(f"  {k:22} {v:>6}")
    print(f"\n  domestic AAU meets: {len(aau)}")
    print(f"  domestic AAU diver-slots: {sum(m['divers'] for m, _ in aau)}")
