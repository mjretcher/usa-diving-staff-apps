#!/usr/bin/env python3
"""
Meet-level classification: competition_family, competition_group,
ncaa_division. Derived from the DiveMeets meet name + sanction, and verified
against all 523 numeric-meet-id seed meets by verify_meets.py.

competition_group is a canonical championship label where one applies, and the
(whitespace-normalised) meet name otherwise. The canonical labels are what
Standards Studio's POOLS registry keys off -- juniorAB matches
competition_group == 'USA Diving Junior Nationals' exactly -- so these strings
are load-bearing and must not drift.
"""
import re

# Canonical championship labels, tested in order. First match wins, so the
# more specific pattern (Qualifier) must precede the general one.
CANONICAL = [
    ("NCAA Division I Championships",
     lambda n, s: _ncaa(s) and re.search(r"\bdiv\w*\s*(i|1)\b", n, re.I)
     and re.search(r"champion", n, re.I)),

    ("USA Diving Olympic Trials Qualifier",
     lambda n, s: re.search(r"olympic\s+.*trials?\s+qualifier", n, re.I)
     or re.search(r"last chance olympic trials qualifier", n, re.I)),
    ("USA Diving Olympic Trials",
     lambda n, s: re.search(r"olympic\s+team\s+trials", n, re.I)
     or re.search(r"\bolympic\s+trials\b", n, re.I)),

    ("USA Diving Winter Nationals Qualifier",
     lambda n, s: re.search(r"winter\s+nationals?\s+.*qualifier", n, re.I)
     or re.search(r"winter\s+nationals?\s+qualifier", n, re.I)),
    ("USA Diving Winter Nationals",
     lambda n, s: re.search(r"winter\s+national", n, re.I)
     or re.search(r"national\s+winter\s+championship", n, re.I)),

    ("USA Diving Junior Nationals",
     lambda n, s: re.search(r"junior", n, re.I) and re.search(r"national", n, re.I)
     and not re.search(r"\btrials?\b", n, re.I)
     and not re.search(r"qualifier", n, re.I)
     and not re.search(r"region|zone", n, re.I)),

    ("USA Diving Nationals Qualifier",
     lambda n, s: re.search(r"national\s+champion\w*\s+qualifier", n, re.I)
     or re.search(r"senior\s+national\s+qualifier", n, re.I)),
    ("USA Diving Nationals",
     lambda n, s: re.search(r"(senior\s+national\s+diving\s+champion|"
                            r"usa\s+diving\s+national\s+champion)", n, re.I)),
]

_WA_MEETS = {"12722"}  # 2026 American Cup: USA Diving sanction, World Aquatics event


def normalize_name(name):
    return " ".join((name or "").split())


def _ncaa(sanction):
    return bool(re.search(r"NCAA|National Collegiate", sanction or "", re.I))


def competition_family(meet_id, meet_name, sanction):
    if str(meet_id) in _WA_MEETS:
        return "World Aquatics"
    if _ncaa(sanction):
        return "NCAA"
    if re.search(r"World Aquatics|FINA", sanction or "", re.I):
        return "World Aquatics"
    return "USA Diving"


def competition_group(meet_id, meet_name, sanction):
    n = normalize_name(meet_name)
    if str(meet_id) in _WA_MEETS:
        return "World Aquatics Recognized Event"
    for label, test in CANONICAL:
        if test(n, sanction):
            return label
    return n


def ncaa_division(meet_id, meet_name, sanction):
    if competition_family(meet_id, meet_name, sanction) != "NCAA":
        return ""
    n = normalize_name(meet_name)
    if re.search(r"\bdiv\w*\s*(iii|3)\b", n, re.I):
        return "Division III"
    if re.search(r"\bdiv\w*\s*(ii|2)\b", n, re.I):
        return "Division II"
    return "Division I"


# Canonical groups that denote a senior-level championship. Used by
# classify.event_level to decide Senior vs Senior/Open vs Other.
SENIOR_CHAMPIONSHIP_GROUPS = {
    "USA Diving Nationals",
    "USA Diving Nationals Qualifier",
    "USA Diving Winter Nationals",
    "USA Diving Winter Nationals Qualifier",
    "USA Diving Olympic Trials",
    "USA Diving Olympic Trials Qualifier",
}
