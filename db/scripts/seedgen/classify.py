#!/usr/bin/env python3
"""
Derive the classification columns that core.result_phases / core.dive_sheets
carry, from a DiveMeets event title plus its meet context.

Every rule here was reverse-engineered from the existing seed CSVs and is
verified against them by verify_classify.py. Nothing is guessed: if a title
shape was not observed in the seed, classify() reports it as unknown rather
than inventing a value, so a new title shape shows up as a test failure
instead of silently landing wrong data in the apps.
"""
import re

# ---------------------------------------------------------------- round stage
# Verified against 122,733 seed rows: round 1 -> Prelim, 5-8 -> Semifinal,
# 9-11 -> Final. No other round numbers appear.
def round_stage(round_no):
    try:
        n = int(round_no)
    except (TypeError, ValueError):
        return ""
    if n <= 4:
        return "Prelim"
    if n <= 8:
        return "Semifinal"
    return "Final"


# ---------------------------------------------------------------- gender
_MIXED = re.compile(r"\bmixed\b", re.I)
_FEMALE = re.compile(r"\b(girls?|women|womens|female|ladies)\b", re.I)
_MALE = re.compile(r"\b(boys?|men|mens|male)\b", re.I)


def gender(title):
    t = title or ""
    if _MIXED.search(t):
        return "Mixed"
    f, m = bool(_FEMALE.search(t)), bool(_MALE.search(t))
    if f and not m:
        return "Female"
    if m and not f:
        return "Male"
    return ""


# ---------------------------------------------------------------- discipline
_SYNCHRO = re.compile(r"\bsynchro(?:nized|nised)?\b\.?", re.I)
_PLATFORM = re.compile(r"\b(platform|tower|10m|7\.5m|5m|3m\s*platform)\b", re.I)
_3M = re.compile(r"\b3m\b", re.I)
_1M = re.compile(r"\b1m\b", re.I)


def discipline(title):
    t = title or ""
    sync = bool(_SYNCHRO.search(t))
    # Order matters: a synchro platform title also contains "Platform".
    if _PLATFORM.search(t):
        base = "Platform"
    elif _3M.search(t):
        base = "3m"
    elif _1M.search(t):
        base = "1m"
    else:
        base = ""
    if sync:
        return ("Synchronized " + base).strip() if base else "Synchronized"
    return base


def is_synchronized(title):
    return bool(_SYNCHRO.search(title or ""))


# ---------------------------------------------------------------- age group
# Junior Circuit brackets. Both the explicit "Group X" label and the age-range
# spelling appear in DiveMeets titles; they are the same thing.
_GROUP_LETTER = re.compile(r"\bGroup\s+([ABCD])\b", re.I)
_AGE_RANGES = [
    ("Group A", re.compile(r"\b16\s*-\s*18\b")),
    ("Group B", re.compile(r"\b14\s*-\s*15\b")),
    ("Group C", re.compile(r"\b12\s*-\s*13\b")),
    ("Group D", re.compile(r"\b(11\s*(&|and)\s*under|11\s*-\s*under|10\s*-\s*11)\b", re.I)),
]
_SENIOR = re.compile(r"\bsenior\b", re.I)
# High Diving reuses the words "Group A" for a 17-18-19 bracket that has
# nothing to do with the Junior Circuit A/B brackets. Left unguarded this
# pulls high-diving rows into the Junior A/B pool in Standards Studio.
_HIGH_DIVING = re.compile(r"\bHD\b|\bhigh\s*div", re.I)


def age_group(title):
    t = title or ""
    if _HIGH_DIVING.search(t):
        return ""
    m = _GROUP_LETTER.search(t)
    if m:
        return "Group " + m.group(1).upper()
    for label, rx in _AGE_RANGES:
        if rx.search(t):
            return label
    if _SENIOR.search(t):
        return "Senior"
    return ""


# ---------------------------------------------------------------- event level
_JO = re.compile(r"\bJ\.?\s*O\.?\b|\bjunior\b|\bage\s*group\b", re.I)


def event_level(title, competition_group="", meet_name=""):
    """event_level tracks the MEET, not the event title: the identical title
    "16-18 Girls 1m J.O (Final)" is Junior at a Junior Region championship and
    Other at an invitational. Verified against the seed."""
    t = title or ""
    g = competition_group or ""
    n = meet_name or ""
    if _HIGH_DIVING.search(t):
        return "Other"
    if re.search(r"\bjunior\b", g, re.I) or re.search(r"\bjunior\b", n, re.I):
        return "Junior"
    if _SENIOR.search(g) or _SENIOR.search(n) or _SENIOR.search(t):
        return "Senior"
    return "Other"
