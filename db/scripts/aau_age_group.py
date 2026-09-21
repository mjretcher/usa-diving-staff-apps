"""
Map an AAU (Dive Live) event title to a USA-Diving-comparable age group.

WHY THIS EXISTS
----------------
Dive Live has no age or birthdate field on event_results -- only the event's
own title text, which every meet host writes by hand and which varies wildly
(confirmed against 1,006 distinct real titles: "Group D (10-11)", "Boys D 10
years old", "10-11 Boys 1M", "Group A2 Boys 18-19; 1M", bare "Group E Boys
1M" with no number at all, etc.). This module extracts whatever numeric age
information is present and buckets it against USA Diving's own AQUA-age
groups (D <=11, C 12-13, B 14-15, A 16-18, 19+), rather than trusting any
single meet's own letter-code choice, which is not consistent meet to meet.

AAU's OWN age-group Nationals rules (2026 official meet packet, provided by
Mike 2026-09-21) are: Group E (9&Under), Group D (10,11), Group C (12,13),
Group B (14,15), Group A1 (16), Group A2 (17), Group A3 (18). Ages 19+ are
NOT part of this age-group ladder at all -- they fall under Masters (19-49 /
50+), Elite Open (DD-requirement based), or College Open (enrolled-student
based) instead. A1+A2+A3 together span exactly 16-18, i.e. exactly USAD's
own Group A -- so that crosswalk is clean. 19+ (Masters/Elite/College Open,
collectively) is treated as the USAD-comparable "19PLUS" bucket, understanding
that it is not a single, uniform group the way ours is.

Some meets (mostly older or non-Nationals AAU meets: RWB qualifiers, local
invitationals) combine ages in ways that straddle our buckets on their own
terms -- "18-19", "14-18", "12 & Up". These are NEVER forced into one bucket:
they come back as 'MIXED:<bucket>+<bucket>...'. Silently picking a side would
misstate the number; an explicit mixed bucket is honest about what the data
can and cannot resolve. See RULE_VERSION -- bump it if this logic changes, so
a stored classification can always be reproduced.
"""
import re

RULE_VERSION = "age-group-2026-09-21.1"

NON_AGE_GROUP_PATTERNS = [
    ("LOGISTICS",        r"warm[- ]?up|coaches?\s+meeting|technical meeting|to be announced|no events|"
                         r"next session|open practice|finals begin|check-?in"),
    ("FUTURE_CHAMPIONS", r"future champions|\bnovice level\s*\d|\bnovice lvl\s*\d"),
    ("COLLEGE_SHOWCASE", r"college showcase|showcase.*grads|class of \d{4}"),
    ("INTL_TEAM",        r"international team selection"),
    ("MASTERS",          r"\bmasters?\b"),
    ("ELITE_OPEN",       r"\belite\b"),
    ("COLLEGE_OPEN",     r"\bcollege\b|\bcollegiate\b"),
    ("SR_OPEN",          r"\bsr\.?\s*open\b|\bsenior open\b"),
    ("SYNCHRO",          r"\bsynchro"),
    ("SHOOTOUT",         r"\bshootout\b"),
    ("OPEN_ADULT",       r"\bopen\b"),   # bare "Open" -- none of the more specific tracks above matched
]
# Tracks whose divers are adults, i.e. our USAD-comparable "19PLUS".
ADULT_TRACKS = ("MASTERS", "ELITE_OPEN", "COLLEGE_OPEN", "SR_OPEN", "INTL_TEAM", "OPEN_ADULT")

RANGE_PAT    = re.compile(r'(\d{1,2})\s*[-\u2013]\s*(\d{1,2})')
UNDER_PAT    = re.compile(r'(\d{1,2})\s*(?:&|and|-)\s*under', re.I)
OVER_PAT     = re.compile(r'(\d{1,2})\s*\+|\b(\d{1,2})\s*(?:&|and)\s*(?:up|over)', re.I)
SINGLE_AGE   = re.compile(r'\b(\d{1,2})\s*(?:years?\s*old)\b', re.I)
BARE_U       = re.compile(r'\b(\d{1,2})\s*&\s*u\b', re.I)
GROUP_LETTER = re.compile(r'\bgroup\s+([edcba])\b', re.I)

# USAD's own AQUA-age bands (domain-rules.md): D <=11, C 12-13, B 14-15, A 16-18, 19+.
BUCKET_RANGES = [('D', 0, 11), ('C', 12, 13), ('B', 14, 15), ('A', 16, 18), ('19PLUS', 19, 130)]
# E is a subset of D's own span (9&under is inside 11&under); a bare "Group A"
# with no numbers spans A1+A2+A3, i.e. exactly USAD's Group A.
LETTER_TO_BUCKET = {'e': 'D', 'd': 'D', 'c': 'C', 'b': 'B', 'a': 'A'}


def usad_bucket(lo, hi):
    overlapping = [name for name, blo, bhi in BUCKET_RANGES if not (hi < blo or lo > bhi)]
    if len(overlapping) == 1:
        return overlapping[0]
    if len(overlapping) > 1:
        return 'MIXED:' + '+'.join(overlapping)
    return 'UNRECOGNIZED_RANGE'


def _classify_track(title_lower):
    for track, pat in NON_AGE_GROUP_PATTERNS:
        if re.search(pat, title_lower):
            return track
    return None


def _extract_age(title):
    """Return (usad_bucket_or_None, raw_matched_text_or_None)."""
    m = RANGE_PAT.search(title)
    if m:
        return usad_bucket(int(m.group(1)), int(m.group(2))), m.group(0)
    m = UNDER_PAT.search(title)
    if m:
        return usad_bucket(0, int(m.group(1))), m.group(0)
    m = BARE_U.search(title)
    if m:
        return usad_bucket(0, int(m.group(1))), m.group(0)
    m = OVER_PAT.search(title)
    if m:
        return usad_bucket(int(m.group(1) or m.group(2)), 130), m.group(0)
    m = SINGLE_AGE.search(title)
    if m:
        n = int(m.group(1))
        return usad_bucket(n, n), m.group(0)
    m = GROUP_LETTER.search(title)
    if m:
        return LETTER_TO_BUCKET[m.group(1).lower()], m.group(0)
    return None, None


def extract_apparatus(title_lower):
    if 'platform' in title_lower or 'tower' in title_lower:
        return 'Platform'
    if '3m' in title_lower or '3-meter' in title_lower or '3 meter' in title_lower:
        return '3M'
    if '1m' in title_lower or '1-meter' in title_lower or '1 meter' in title_lower:
        return '1M'
    return None


def classify_event_title(title, gender):
    """Return dict: track, usad_group, apparatus, gender, raw_age.

    track is one of: AGE_GROUP, SYNCHRO, SHOOTOUT, LOGISTICS,
    FUTURE_CHAMPIONS, COLLEGE_SHOWCASE, INTL_TEAM, MASTERS, ELITE_OPEN,
    COLLEGE_OPEN, SR_OPEN, OPEN_ADULT, UNCLASSIFIED.

    usad_group is one of D/C/B/A/19PLUS, a 'MIXED:...' combination that
    genuinely straddles more than one USAD bucket, 'UNRECOGNIZED_RANGE' for
    an age range this parser doesn't recognize, or None for tracks with no
    USAD-comparable age concept (logistics rows, Future Champions' own skill
    ladder, College Showcase, international-team selection has no bracket).
    """
    t = (title or '').strip()
    tl = t.lower()
    track = _classify_track(tl)
    apparatus = extract_apparatus(tl)
    if track == 'SHOOTOUT':
        return dict(track=track, usad_group='MIXED:A+B', apparatus=apparatus,
                    gender=gender, raw_age='A/B shootout')
    if track:
        _, raw_age = _extract_age(t)
        return dict(track=track, usad_group=('19PLUS' if track in ADULT_TRACKS else None),
                    apparatus=apparatus, gender=gender, raw_age=raw_age)
    bucket, raw_age = _extract_age(t)
    if bucket is None:
        return dict(track='UNCLASSIFIED', usad_group=None, apparatus=apparatus,
                    gender=gender, raw_age=None)
    return dict(track='AGE_GROUP', usad_group=bucket, apparatus=apparatus,
                gender=gender, raw_age=raw_age)
