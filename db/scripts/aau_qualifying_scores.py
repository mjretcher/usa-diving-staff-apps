"""
AAU Diving National Championships -- official qualifying score / DD requirements.

Source: "2026 AAU National-Qualifying-Requirements.pdf", provided by Mike 2026-09-21.
Competitive year: Sept 1 2025 - Jul 15 2026 (a diver needs the score ONCE in that
window). Accepted from: AQUA/FINA, AAU, NFHS (1-meter only), USA Diving, or Diving
Plongeon Canada events -- our own data covers AAU (Dive Live) and, partially, NFHS
(meets scoresandmore classifies as high_school); it has no AQUA/FINA or Canadian
results at all. USA Diving coverage lives in core.event_results, a separate table
not yet cross-referenced by the checker script that uses this data.

RULE CHANGES FOR 2026 (stated on the source PDF -- do not compare 2026 platform
qualifier counts to prior years without accounting for this):
  - College Open restricted to enrolled collegiate divers only; no DD requirement;
    junior divers barred.
  - Elite Open opened to ALL divers meeting the DD minimum (previously narrower).
  - Platform now requires an actual platform score. A 3-meter score is NO LONGER
    accepted as platform qualification.

Every score below is the TOTAL for the dive count shown alongside it -- comparable
only to a result scored under that same dive count. AAU's age-group dive counts
are fixed by rule (not something scraped per result), which is why this module
carries dive count as data rather than reading it off any particular meet.
"""

RULE_VERSION = "aau-qualifying-2026.1"
COMPETITIVE_WINDOW = ("2025-09-01", "2026-07-15")

# Group E: no minimum score at all (coaches' discretion). No platform event
# exists for Group E -- a 9-and-under diver doing platform must enter Group D.
GROUP_E_NO_MINIMUM = True

# group -> gender -> apparatus -> {'score': float, 'dives': int}
# apparatus keys match aau_age_group.py's extract_apparatus(): '1M', '3M', 'Platform'.
QUALIFYING_SCORES = {
    'D': {  # 10-11
        'Girls': {'1M': {'score': 130, 'dives': 5}, '3M': {'score': 140, 'dives': 5}, 'Platform': {'score': 140, 'dives': 5}},
        'Boys':  {'1M': {'score': 120, 'dives': 5}, '3M': {'score': 125, 'dives': 5}, 'Platform': {'score': 140, 'dives': 5}},
    },
    'C': {  # 12-13
        'Girls': {'1M': {'score': 205, 'dives': 7}, '3M': {'score': 210, 'dives': 7}, 'Platform': {'score': 175, 'dives': 6}},
        'Boys':  {'1M': {'score': 210, 'dives': 8}, '3M': {'score': 225, 'dives': 8}, 'Platform': {'score': 190, 'dives': 7}},
    },
    'B': {  # 14-15
        'Girls': {'1M': {'score': 250, 'dives': 8}, '3M': {'score': 260, 'dives': 8}, 'Platform': {'score': 248, 'dives': 7}},
        'Boys':  {'1M': {'score': 255, 'dives': 9}, '3M': {'score': 275, 'dives': 9}, 'Platform': {'score': 275, 'dives': 8}},
    },
    'A': {  # 16-18 (AAU's own A1/A2/A3 = 16/17/18 collapse to this one USAD-comparable bucket)
        'Girls': {'1M': {'score': 305, 'dives': 9}, '3M': {'score': 317, 'dives': 9}, 'Platform': {'score': 250, 'dives': 8}},
        'Boys':  {'1M': {'score': 365, 'dives': 10}, '3M': {'score': 390, 'dives': 10}, 'Platform': {'score': 305, 'dives': 9}},
    },
}

# A qualifying performance earned at a USA Diving meet is judged against its
# own number where the PDF gives one (dive counts differ from AAU's own at
# this age) -- only Group D gets a separate row on the source PDF.
USAD_EARNED_SCORES = {
    'D': {
        'Girls': {'1M': {'score': 150, 'dives': 6}, '3M': {'score': 160, 'dives': 6}, 'Platform': {'score': 160, 'dives': 6}},
        'Boys':  {'1M': {'score': 140, 'dives': 6}, '3M': {'score': 150, 'dives': 6}, 'Platform': {'score': 155, 'dives': 6}},
    },
}

# NFHS (high school) qualifying is 1-meter ONLY, per the source PDF's own
# rule, and only listed for groups B and A.
HS_EARNED_1M_SCORE = {
    'B': {'Girls': {'score': 362, 'dives': 11}, 'Boys': {'score': 382, 'dives': 11}},
    'A': {'Girls': {'score': 372, 'dives': 11}, 'Boys': {'score': 405, 'dives': 11}},
}

# Elite Open: a degree-of-difficulty MINIMUM, not a point total.
ELITE_OPEN_DD = {
    'Women': {'1M': {'dd': 11.4, 'dives': 5}, '3M': {'dd': 13.2, 'dives': 5}, 'Platform': {'dd': 13.2, 'dives': 5}},
    'Men':   {'1M': {'dd': 15.4, 'dives': 6}, '3M': {'dd': 16.8, 'dives': 6}, 'Platform': {'dd': 16.2, 'dives': 6}},
}

# College Open: a dive-count requirement (NCAA format), no DD minimum, no score.
COLLEGE_OPEN_DIVE_COUNT = {
    'Women': {'1M': 6, '3M': 6, 'Platform': 5},
    'Men':   {'1M': 6, '3M': 6, 'Platform': 6},
}


def qualifying_threshold(group, gender_word):
    """gender_word: 'Girls'/'Boys' (age-group) as used in QUALIFYING_SCORES.
    Returns the {apparatus: {'score','dives'}} dict for that group/gender, or
    None for Group E (no minimum) or a group this table doesn't cover."""
    if group == 'E':
        return None
    return QUALIFYING_SCORES.get(group, {}).get(gender_word)
