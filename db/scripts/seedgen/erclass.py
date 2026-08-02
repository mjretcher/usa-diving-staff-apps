#!/usr/bin/env python3
"""
Classification for core.event_results, derived from DiveMeets event titles and
meet names. Verified against all 46,715 existing rows by verify_erclass.py.

VOCABULARY IS DELIBERATELY NOT THE ONE classify.py USES.

core.result_phases says Male/Female and 1m/3m. core.event_results says
Boys/Girls/Men/Women and 1M/3M/Synchro-3M, and reports-view.js and
pipeline-modeling.js hardcode those spellings -- gender === 'Girls',
discipline IN ('1M', ...), stage = 'Zones'. Emitting the result_phases
vocabulary here would not raise an error, it would silently empty those
reports. So this module reproduces the legacy strings exactly.

The one thing it does NOT reproduce is the accumulated junk: 102 Junior
Circuit rows currently carry a gender that is neither Boys nor Girls and are
invisible to every report, and 75 more have a null discipline. Those come from
titles the old pipeline could not parse; the crawl titles parse fine.
"""
import re

# ---------------------------------------------------------------- event name
_ROUND_PAREN = re.compile(
    r"\s*\((?:Prelim[^)]*|Semifinal[^)]*|Quarterfinal[^)]*|Final|Head[- ]?To[- ]?Head)\)\s*$", re.I)


def event_name(title):
    """The crawl title minus its trailing round parenthetical. Other
    parentheticals -- the age ranges, "(16-18)" -- are part of the name and
    stay. Whitespace is collapsed: 985 legacy rows carry a doubled space
    ("1m  J.O") that the crawl does not."""
    t = title or ""
    m = _ROUND_PAREN.search(t)
    if m:
        t = t[:m.start()]
    return " ".join(t.split())


def round_label(round_no, title=""):
    if re.search(r"head[- ]?to[- ]?head", title or "", re.I):
        return "Head-To-Head"
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
# Legacy vocabulary: the literal token as it appears in the event name.
# Verified: across all 46,715 rows the stored gender is always a substring of
# the event name, so echoing the title is exactly right.
_GENDER_TOKENS = [("Mixed", r"\bmixed\b"), ("Girls", r"\bgirls?\b"),
                  ("Boys", r"\bboys?\b"), ("Women", r"\bwomen'?s?\b"),
                  ("Men", r"\bmen'?s?\b")]


def gender(name):
    n = name or ""
    for label, rx in _GENDER_TOKENS:
        if re.search(rx, n, re.I):
            return label
    return None


# ---------------------------------------------------------------- discipline
def is_synchro(name):
    return bool(re.search(r"\bsynchro(?:nized|nised)?\b", name or "", re.I))


def discipline(name):
    n = name or ""
    sync = is_synchro(n)
    if re.search(r"\b(platform|tower)\b", n, re.I):
        base = "Platform"
    elif re.search(r"\b3m\b", n, re.I):
        base = "3M"
    elif re.search(r"\b1m\b", n, re.I):
        base = "1M"
    else:
        return None
    return ("Synchro-" + base) if sync else base


# ---------------------------------------------------------------- age group
_AGE = [("Group A", r"\bGroup\s*A\b|\b16\s*-\s*18\b|\b14\s*-\s*18\b"),
        ("Group B", r"\bGroup\s*B\b|\b14\s*-\s*15\b"),
        ("Group C", r"\bGroup\s*C\b|\b12\s*-\s*13\b"),
        ("Group D", r"\bGroup\s*D\b|\b11\s*(?:&|and)\s*under\b|\b10\s*-\s*11\b"),
        ("Senior", r"\bsenior\b")]


def age_group(name, st=None):
    """Falls back to the meet's stage. A senior championship event titled just
    "Synchronized Women 3m" carries no age token at all, but the legacy data
    still records it as Senior."""
    n = name or ""
    if re.search(r"\bHD\b|\bhigh\s*div", n, re.I):
        return None
    for label, rx in _AGE:
        if re.search(rx, n, re.I):
            return label
    if st in SENIOR_STAGES:
        return "Senior"
    return None


def event_key(ag, gd, disc):
    """Verified exact across all 46,715 rows: age_group + gender + discipline,
    space joined, blanks dropped."""
    return " ".join(x for x in (ag, gd, disc) if x) or None


# ---------------------------------------------------------------- meet level
# Order matters. "USA Diving High Dive Open" contains "Open"; the qualifier
# variants must precede their parent championship.
_STAGE_RULES = [
    ("EWC", r"\b(east|west|central)\s+championship"),
    ("Regionals", r"\bjunior\s+region\s+\d+"),
    ("Zones", r"\bzone\s+[A-F]\b"),
    ("JrWorlds-Trials", r"junior\s+world.*trials"),
    ("Nationals", r"junior\s+national"),
    ("High-Dive", r"high\s+dive"),
    ("Camp", r"\bcamp\b"),
    ("Winter-Nationals-Qualifier", r"winter\s+national\w*\s+qualifier"),
    ("Winter-Nationals", r"winter\s+national"),
    ("Olympic-Trials-Qualifier", r"olympic.*trials?\s+qualifier"),
    ("Olympic-Trials", r"olympic.*trials"),
    # Singular "National Championship Qualifier" is its own stage but plural
    # "National Championships Qualifier" was filed under Senior-Nationals. That
    # is a legacy inconsistency, not a rule; the singular form is matched here
    # and the 83 plural rows are left to the merge.
    ("Senior-Nat-Qualifier", r"national\s+championship\s+qualifier"),
    ("Senior-Nationals", r"national\s+championship"),
    ("Open", r"open\s+championship"),
]
JUNIOR_CIRCUIT_STAGES = {"Regionals", "Zones", "EWC", "Nationals"}
SENIOR_STAGES = {"Winter-Nationals", "Winter-Nationals-Qualifier", "Senior-Nationals",
                 "Senior-Nat-Qualifier", "Open", "Olympic-Trials",
                 "Olympic-Trials-Qualifier"}
# event_level is a pure function of stage -- verified, it does not vary by
# event title within a stage.
_LEVEL_BY_STAGE = {s: "Junior" for s in JUNIOR_CIRCUIT_STAGES}
_LEVEL_BY_STAGE["JrWorlds-Trials"] = "Junior"
_LEVEL_BY_STAGE.update({s: "Senior" for s in SENIOR_STAGES})


def stage(meet_name):
    n = " ".join((meet_name or "").split())
    for label, rx in _STAGE_RULES:
        if re.search(rx, n, re.I):
            return label
    return None


def region(meet_name):
    m = re.search(r"\bjunior\s+region\s+(\d+)", meet_name or "", re.I)
    return int(m.group(1)) if m else None


def zone(meet_name):
    m = re.search(r"\bzone\s+([A-F])\b", meet_name or "", re.I)
    return m.group(1).upper() if m else None


def ewc_meet(meet_name):
    m = re.search(r"\b(east|west|central)\s+championship", meet_name or "", re.I)
    return m.group(1).capitalize() if m else None


def is_junior_circuit(st):
    return st in JUNIOR_CIRCUIT_STAGES


def event_level(st):
    return _LEVEL_BY_STAGE.get(st, "Other")
