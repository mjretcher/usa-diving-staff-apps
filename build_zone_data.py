#!/usr/bin/env python3
"""
build_zone_data.py — 2026 USA Diving Junior Zone result processor.

Downloads usa_2026.db from divemeets-scraper, extracts all six Zone
Championship meets (A–F), applies the official 2026 junior circuit
qualification rules, and merges the Zone data into junior-data.js as
the "Zones" stage.  Optionally patches main.js to use the correct
constants and add E/W/C logic.

Official 2026 Zone qualification rules:
  - Eligible = not nonDisplacing, not prequalified, qualifyingEvent=True
  - Eligible rank 1–3  → Junior Nationals qualifier (direct)
  - Declined rank 1–3  → opens a replacement spot; ranks 4–6 may fill
  - Eligible ranks 4–6 → replacement pool; advance to E/W/C if not called up
  - Eligible ranks 4–18 → E/W/C qualifier (position)
  - Score ≥ avg 18th-place score across same E/W/C group → E/W/C qualifier (threshold)
  - HPS / foreign-declared / dual-declared → nonDisplacing

Usage:
  python build_zone_data.py [options]

Options:
  --db PATH            Local path to usa_2026.db (auto-downloaded if omitted)
  --js PATH            Path to junior-data.js
                       (default: junior-results/junior-data.js)
  --main-js PATH       Path to main.js
                       (default: junior-results/main.js)
  --prequalified FILE  JSON array of [{diveMeetsId, eventKey}] athletes already
                       qualified directly to Junior Nationals before Zones
  --not-attending FILE JSON array of [{diveMeetsId, eventKey}] athletes who
                       declined their Zone spot
  --patch-app          Also update ZONE_DIRECT_NATIONAL_LIMIT and
                       recalculateZoneToNational in main.js
  --dry-run            Print summary without writing any files
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import tempfile
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Qualification constants (official 2026 rules)
# ---------------------------------------------------------------------------

ZONE_DIRECT_NATIONAL_LIMIT = 3    # top 3 eligible → Junior Nationals direct
ZONE_REPLACEMENT_LIMIT = 6        # ranks 4–6 may replace a declined spot
ZONE_EWC_LIMIT = 18               # ranks 4–18 → E/W/C qualifier

# Zone letter → E/W/C group (fallback; derived from existing data where possible)
DEFAULT_ZONE_EWC: dict[str, str] = {
    "A": "East",
    "B": "East",
    "C": "Central",
    "D": "Central",
    "E": "West",
    "F": "West",
}

DB_LFS_URL = (
    "https://media.githubusercontent.com/media/mjretcher/divemeets-scraper"
    "/main/data/usa_2026.db"
)
DB_RAW_URL = (
    "https://raw.githubusercontent.com/mjretcher/divemeets-scraper"
    "/main/data/usa_2026.db"
)

DEFAULT_JS_PATH = "data/junior-data.js"
DEFAULT_MAIN_JS_PATH = "junior-results/main.js"

# ---------------------------------------------------------------------------
# Event name parsing
# ---------------------------------------------------------------------------

_AGE_GROUP_RE = [
    (re.compile(r"\bgroup\s+a\b", re.I), "Group A"),
    (re.compile(r"\bgroup\s+b\b", re.I), "Group B"),
    (re.compile(r"\bgroup\s+c\b", re.I), "Group C"),
    (re.compile(r"\bgroup\s+d\b", re.I), "Group D"),
    (re.compile(r"\bopen\b", re.I), "Open"),
]
_GENDER_RE = [
    (re.compile(r"\bgirls?\b", re.I), "Girls"),
    (re.compile(r"\bboys?\b", re.I), "Boys"),
    (re.compile(r"\bwomen\b", re.I), "Girls"),
    (re.compile(r"\bmen\b", re.I), "Boys"),
]
_DISC_RE = [
    (re.compile(r"\bplatform\b", re.I), "Platform"),
    (re.compile(r"\b3[\s-]?m\b", re.I), "3M"),
    (re.compile(r"\b1[\s-]?m\b", re.I), "1M"),
]

# These age groups do not produce qualification spots
NON_QUALIFYING_AGE_GROUPS = {"Group C", "Group D"}


def parse_event_name(name: str) -> dict:
    """Return structured fields parsed from a DiveMeets event name string."""
    is_synchro = bool(re.search(r"\bsynchro\b", name, re.I))

    age_group = next((label for pat, label in _AGE_GROUP_RE if pat.search(name)), None)
    gender = next((label for pat, label in _GENDER_RE if pat.search(name)), None)
    discipline = next((label for pat, label in _DISC_RE if pat.search(name)), None)

    if age_group and gender and discipline:
        event_key = f"{age_group} {gender} {discipline}"
        if is_synchro:
            event_key += " Synchro"
    else:
        event_key = name  # fallback: keep raw name

    qualifying = age_group not in NON_QUALIFYING_AGE_GROUPS and discipline is not None

    return {
        "ageGroup": age_group,
        "gender": gender,
        "discipline": discipline,
        "isSynchro": is_synchro,
        "eventKey": event_key,
        "eventCategory": "Qualifying Event" if qualifying else "Non-Qualifying Event",
        "qualifyingEvent": qualifying,
    }


def extract_zone_letter(meet_name: str) -> str | None:
    m = re.search(r"\bzone\s+([a-f])\b", meet_name, re.I)
    return m.group(1).upper() if m else None


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

_ZONE_MEET_RE = re.compile(
    r"(junior\s+)?zone\s+[a-f]\s+championship", re.I
)


def _rows_as_dicts(cursor: sqlite3.Cursor) -> list[dict]:
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def get_zone_meets(conn: sqlite3.Connection) -> list[dict]:
    cur = conn.execute(
        "SELECT meet_id, meet_name, meet_year, start_date, end_date, location, location AS state FROM meets"
    )
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    return [
        dict(zip(cols, row))
        for row in rows
        if _ZONE_MEET_RE.search(str(row[1] or ''))
    ]


def get_events_for_meet(conn: sqlite3.Connection, meet_id: int) -> list[dict]:
    cur = conn.execute(
        """
        SELECT event_id, event_id AS event_num, event_name AS name, gender,
               discipline AS board_height, event_round AS division, NULL AS num_dives
        FROM events
        WHERE meet_id = ?
        ORDER BY event_id
        """,
        (meet_id,),
    )
    return _rows_as_dicts(cur)


def get_results_for_event(conn: sqlite3.Connection, event_id: int) -> list[dict]:
    cur = conn.execute(
        """
        SELECT
            r.event_id || '_' || r.diver_id AS result_id,
            r.place,
            r.score                         AS score,
            NULL                            AS prelim_score,
            NULL                            AS semifinal_score,
            NULL                            AS final_score,
            d.diver_id,
            d.first_name,
            d.last_name,
            d.full_name,
            COALESCE(r.team_name, d.team, '') AS team
        FROM results r
        JOIN divers d ON r.diver_id = d.diver_id
        WHERE r.event_id = ?
        ORDER BY
            CAST(r.place AS REAL) ASC NULLS LAST,
            r.score DESC
        """,
        (event_id,),
    )
    return _rows_as_dicts(cur)


# ---------------------------------------------------------------------------
# Athlete flag cross-reference
# ---------------------------------------------------------------------------

def build_athlete_index(existing_data: dict) -> dict:
    by_id: dict[str, dict] = {}
    by_name: dict[str, dict] = {}
    for ath in existing_data.get("athletes", []):
        dm = str(ath.get("diveMeetsId", "")).strip()
        if dm:
            by_id[dm] = ath
        name = f"{ath.get('first', '')} {ath.get('last', '')}".lower().strip()
        if name:
            by_name[name] = ath
    return {"by_id": by_id, "by_name": by_name}


_FLAG_KEYS = (
    "foreignDeclared", "foreignDeclarationDetail",
    "dualDeclared", "dualOtherCountry", "dualSportNationalityStatus",
    "dualDeclarationDetail", "hps", "ymca",
    "citizenship", "usCitizen", "membershipCitizenStatus",
    "webpointNonUs", "citizenshipUnknown", "foreignInternational",
    "prequalification",
)
_FLAG_DEFAULTS = {
    "foreignDeclared": False, "foreignDeclarationDetail": "",
    "dualDeclared": False, "dualOtherCountry": False,
    "dualSportNationalityStatus": "No declaration", "dualDeclarationDetail": "",
    "hps": False, "ymca": False,
    "citizenship": None, "usCitizen": None, "membershipCitizenStatus": "Unknown",
    "webpointNonUs": False, "citizenshipUnknown": True, "foreignInternational": False,
    "prequalification": [],
}


def lookup_athlete_flags(
    idx: dict, diver_id: str, first: str, last: str
) -> dict:
    ath = idx["by_id"].get(str(diver_id))
    if ath is None:
        ath = idx["by_name"].get(f"{first} {last}".lower().strip())
    if ath is None:
        return dict(_FLAG_DEFAULTS)
    return {k: ath.get(k, _FLAG_DEFAULTS[k]) for k in _FLAG_KEYS}


def is_non_displacing(flags: dict) -> tuple[bool, str]:
    if flags["hps"]:
        return True, "HPS athlete"
    if flags["foreignDeclared"]:
        return True, "Foreign athlete declaration"
    if flags["dualDeclared"] and flags.get("dualOtherCountry"):
        return True, "Dual citizenship — declared for another country"
    return False, ""


# ---------------------------------------------------------------------------
# Optional override files
# ---------------------------------------------------------------------------

def _load_pair_set(path: str | None) -> set[tuple[str, str]]:
    if path is None:
        return set()
    with open(path) as f:
        data = json.load(f)
    return {(str(item["diveMeetsId"]), item["eventKey"]) for item in data}


# ---------------------------------------------------------------------------
# Core qualification logic
# ---------------------------------------------------------------------------

def apply_zone_qualification(
    results: list[dict],
    ewc_threshold: float | None,
) -> list[dict]:
    """
    Assign qualification status to each row in a single Zone event.
    Results must be pre-sorted by placeNumber ascending.
    Modifies rows in-place and returns the same list.
    """
    raw_rank = 0
    att_rank = 0
    declined_inside_direct = 0

    for row in results:
        # Reset computed fields
        row.update(
            eligibleRank="", attendingEligibleRank="", juniorNationalStatus="",
            bumpIn=False, openedSpot=False, spotShifted=False,
            bumpedBy=[], openedFor=[],
            advancesToNationals=False, advancesToEWC=False, advancesToZone=False,
        )

        not_qualifying = not row.get("qualifyingEvent", True)
        not_eligible = row.get("nonDisplacing") or row.get("prequalified")

        if not_qualifying:
            row["qualificationStatus"] = "Non-qualifying event"
            continue

        if not_eligible:
            if row.get("nonDisplacing"):
                row["qualificationStatus"] = "Non-displacing - no spot consumed"
            else:
                # prequalified — already headed to Nationals
                row["qualificationStatus"] = "Prequalified to Junior Nationals"
                row["advancesToNationals"] = True
                row["advancesToZone"] = True
            continue

        raw_rank += 1
        row["eligibleRank"] = raw_rank

        if row.get("declaredNotAttending"):
            row["qualificationStatus"] = "Declared not attending"
            row["juniorNationalStatus"] = "Declined"
            if raw_rank <= ZONE_DIRECT_NATIONAL_LIMIT:
                declined_inside_direct += 1
                row["openedSpot"] = True
            continue

        att_rank += 1
        row["attendingEligibleRank"] = att_rank

        if raw_rank <= ZONE_DIRECT_NATIONAL_LIMIT:
            row["qualificationStatus"] = "Junior Nationals qualifier - direct"
            row["juniorNationalStatus"] = "Direct"
            row["advancesToNationals"] = True
            row["advancesToZone"] = True

        elif (
            declined_inside_direct > 0
            and raw_rank <= ZONE_REPLACEMENT_LIMIT
            and att_rank <= ZONE_DIRECT_NATIONAL_LIMIT
        ):
            row["qualificationStatus"] = "Junior Nationals qualifier - decline replacement"
            row["juniorNationalStatus"] = "Replacement"
            row["bumpIn"] = True
            row["advancesToNationals"] = True
            row["advancesToZone"] = True

        elif raw_rank <= ZONE_REPLACEMENT_LIMIT:
            # Replacement pool: advance to E/W/C unless called up
            row["qualificationStatus"] = "Replacement eligible if a direct qualifier declines"
            row["juniorNationalStatus"] = "Replacement pool"
            row["advancesToEWC"] = True
            row["advancesToZone"] = True

        elif raw_rank <= ZONE_EWC_LIMIT:
            row["qualificationStatus"] = "E/W/C qualifier - position"
            row["juniorNationalStatus"] = "E/W/C"
            row["advancesToEWC"] = True
            row["advancesToZone"] = True

        else:
            score = row.get("score")
            if ewc_threshold is not None and score is not None and score >= ewc_threshold:
                row["qualificationStatus"] = "E/W/C qualifier - average score threshold"
                row["juniorNationalStatus"] = "E/W/C"
                row["advancesToEWC"] = True
                row["advancesToZone"] = True
            else:
                row["qualificationStatus"] = "Does not advance from Zone"

    return results


# ---------------------------------------------------------------------------
# Threshold computation
# ---------------------------------------------------------------------------

def compute_ewc_thresholds(
    grouped: dict[tuple[str, str], list[list[dict]]],
) -> dict[tuple[str, str], float | None]:
    """
    For each (eventKey, ewc), average the 18th eligible score across zones.
    Only zones with ≥18 eligible finishers contribute.
    """
    out: dict[tuple[str, str], float | None] = {}
    for key, zone_lists in grouped.items():
        scores = []
        for zone_rows in zone_lists:
            eligible = [
                r for r in zone_rows
                if not r.get("nonDisplacing") and not r.get("prequalified")
                and r.get("score") is not None
            ]
            if len(eligible) >= ZONE_EWC_LIMIT:
                scores.append(eligible[ZONE_EWC_LIMIT - 1]["score"])
        out[key] = round(sum(scores) / len(scores), 3) if scores else None
    return out


# ---------------------------------------------------------------------------
# JavaScript data I/O
# ---------------------------------------------------------------------------

def load_js_data(path: Path) -> dict:
    text = path.read_text(encoding="utf-8").strip()
    text = re.sub(r"^\s*window\.JUNIOR_RESULTS_DATA\s*=\s*", "", text)
    text = re.sub(r";?\s*$", "", text)
    return json.loads(text)


def save_js_data(data: dict, path: Path) -> None:
    body = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    path.write_text(
        f"window.JUNIOR_RESULTS_DATA = {body};",
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Database download
# ---------------------------------------------------------------------------

def download_db(dest: Path) -> None:
    for url in (DB_LFS_URL, DB_RAW_URL):
        print(f"  Trying {url} …")
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": "build_zone_data/1.0"}
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                dest.write_bytes(resp.read())
            size_mb = dest.stat().st_size / 1_048_576
            if size_mb < 0.01:
                raise ValueError(f"Downloaded file is too small ({size_mb:.1f} MB) — likely an LFS pointer")
            print(f"  Downloaded {size_mb:.1f} MB → {dest}")
            return
        except Exception as exc:
            print(f"  Failed: {exc}")
    raise RuntimeError(
        "Could not download usa_2026.db. "
        "Try cloning the repo with Git LFS enabled and pass --db path/to/usa_2026.db"
    )


# ---------------------------------------------------------------------------
# EWC mapping derivation
# ---------------------------------------------------------------------------

def derive_zone_ewc_map(existing_data: dict) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for result in existing_data.get("results", []):
        z = result.get("zone")
        ewc = result.get("ewc")
        if z and ewc and z not in mapping:
            mapping[z] = ewc
    for z, ewc in DEFAULT_ZONE_EWC.items():
        mapping.setdefault(z, ewc)
    return mapping


# ---------------------------------------------------------------------------
# Main processing
# ---------------------------------------------------------------------------

def process_zones(
    conn: sqlite3.Connection,
    existing_data: dict,
    prequalified_set: set,
    not_attending_set: set,
    zone_ewc_map: dict,
) -> tuple[list[dict], list[dict]]:
    athlete_index = build_athlete_index(existing_data)
    zone_meets = get_zone_meets(conn)

    if not zone_meets:
        print(
            "WARNING: No Zone Championship meets found in the database.\n"
            "  Meet names must match: 'Zone [A-F] Championship' (case-insensitive).\n"
            "  Run with --dry-run to inspect what meets are in the database.",
            file=sys.stderr,
        )
        return [], []

    print(f"Found {len(zone_meets)} Zone meet(s):")
    for m in sorted(zone_meets, key=lambda x: x["meet_name"]):
        print(f"  • {m['meet_name']}")

    # Phase 1: collect enriched rows, grouped by (eventKey, ewc) for threshold calc
    # Each entry: (meet, db_event, parsed_meta, ewc, zone_letter, enriched_rows)
    collected: list[tuple[dict, dict, dict, str, str, list[dict]]] = []
    grouped_for_threshold: dict[tuple[str, str], list[list[dict]]] = defaultdict(list)

    for meet in sorted(zone_meets, key=lambda m: m["name"]):
        zone_letter = extract_zone_letter(meet["meet_name"])
        if zone_letter is None:
            print(f"  SKIP '{meet['meet_name']}' — cannot extract zone letter")
            continue
        ewc = zone_ewc_map.get(zone_letter, DEFAULT_ZONE_EWC.get(zone_letter, "East"))

        for db_evt in get_events_for_meet(conn, int(meet["meet_id"])):
            # Skip prelim/semifinal rounds; only process finals (or single-round events)
            division = (db_evt.get("division") or "").lower()
            if division in ("prelim", "semifinal"):
                continue

            raw_results = get_results_for_event(conn, db_evt["event_id"])
            if not raw_results:
                continue

            parsed = parse_event_name(db_evt["name"])
            event_key = parsed["eventKey"]

            # Enrich each result with athlete flags
            enriched = []
            for idx, r in enumerate(raw_results, start=1):
                diver_id = str(r["diver_id"])
                flags = lookup_athlete_flags(
                    athlete_index, diver_id, r["first_name"], r["last_name"]
                )
                non_disp, non_disp_reason = is_non_displacing(flags)
                preq = (diver_id, event_key) in prequalified_set
                not_att = (diver_id, event_key) in not_attending_set

                row = {
                    **r,
                    **flags,
                    "nonDisplacing": non_disp,
                    "nonDisplacingReason": non_disp_reason,
                    "prequalified": preq,
                    "declaredNotAttending": not_att,
                    "zone": zone_letter,
                    "ewc": ewc,
                    "sourceRow": idx,
                }
                enriched.append(row)

            grouped_for_threshold[(event_key, ewc)].append(enriched)
            collected.append((meet, db_evt, parsed, ewc, zone_letter, enriched))

    # Phase 2: compute E/W/C threshold scores
    thresholds = compute_ewc_thresholds(grouped_for_threshold)

    # Phase 3: apply qualification logic, build output records
    new_events: list[dict] = []
    new_results: list[dict] = []
    sort_counter = 1000  # Zone events start above Regionals sort values

    for meet, db_evt, parsed, ewc, zone_letter, enriched in collected:
        event_key = parsed["eventKey"]
        threshold = thresholds.get((event_key, ewc))

        # Inject threshold into each row so main.js can read it for display
        for r in enriched:
            r["officialThresholdScore"] = threshold

        rows = apply_zone_qualification(list(enriched), threshold)

        meet_name = meet["meet_name"]
        event_name = db_evt["name"]
        event_id = f"Zones|{meet_name}|{event_name}"

        # Build result records
        for r in rows:
            diver_id = str(r["diver_id"])
            _place_raw = r.get("place")
            place_num = float(_place_raw) if _place_raw is not None else None
            place_str = str(int(_place_raw)) if _place_raw is not None and float(_place_raw) == int(float(_place_raw)) else str(_place_raw) if _place_raw is not None else ""

            flags_list = []
            if r.get("hps"):              flags_list.append("HPS")
            if r.get("foreignDeclared"): flags_list.append("Foreign")
            if r.get("dualDeclared"):    flags_list.append("Dual")
            if r.get("nonDisplacing"):   flags_list.append("Non-displacing")
            if r.get("prequalified"):    flags_list.append("Prequalified")
            if r.get("citizenshipUnknown"): flags_list.append("CitizenshipUnknown")

            new_results.append({
                "id": f"Zones|{meet_name}|{event_name}|{diver_id}|{r['sourceRow']}",
                "stage": "Zones",
                "meetName": meet_name,
                "region": None,
                "zone": zone_letter,
                "ewc": ewc,
                "eventName": event_name,
                "eventId": event_id,
                "eventKey": event_key,
                "eventCategory": parsed["eventCategory"],
                "qualifyingEvent": parsed["qualifyingEvent"],
                "ageGroup": parsed["ageGroup"],
                "gender": parsed["gender"],
                "discipline": parsed["discipline"],
                "isSynchro": parsed["isSynchro"],
                "diveMeetsId": diver_id,
                "first": r.get("first_name", ""),
                "last": r.get("last_name", ""),
                "athlete": f"{r.get('first_name', '')} {r.get('last_name', '')}".strip(),
                "team": r.get("team", ""),
                "place": place_str,
                "placeNumber": place_num,
                "score": r.get("score"),
                # Citizenship / declaration flags
                "citizenship": r.get("citizenship"),
                "usCitizen": r.get("usCitizen"),
                "membershipCitizenStatus": r.get("membershipCitizenStatus"),
                "foreignDeclared": r.get("foreignDeclared", False),
                "foreignDeclarationDetail": r.get("foreignDeclarationDetail", ""),
                "dualDeclared": r.get("dualDeclared", False),
                "dualOtherCountry": r.get("dualOtherCountry", False),
                "dualSportNationalityStatus": r.get("dualSportNationalityStatus", "No declaration"),
                "dualDeclarationDetail": r.get("dualDeclarationDetail", ""),
                "hps": r.get("hps", False),
                "ymca": r.get("ymca", False),
                "prequalified": r.get("prequalified", False),
                "prequalification": r.get("prequalification", []),
                "webpointNonUs": r.get("webpointNonUs", False),
                "citizenshipUnknown": r.get("citizenshipUnknown", False),
                "foreignInternational": r.get("foreignInternational", False),
                "nonDisplacing": r.get("nonDisplacing", False),
                "nonDisplacingReason": r.get("nonDisplacingReason", ""),
                "declaredNotAttending": r.get("declaredNotAttending", False),
                # Qualification computed fields
                "eligibleRank": r.get("eligibleRank", ""),
                "attendingEligibleRank": r.get("attendingEligibleRank", ""),
                "juniorNationalStatus": r.get("juniorNationalStatus", ""),
                "qualificationStatus": r.get("qualificationStatus", ""),
                "advancesToZone": r.get("advancesToZone", False),
                "advancesToNationals": r.get("advancesToNationals", False),
                "advancesToEWC": r.get("advancesToEWC", False),
                # Threshold score (used by main.js bumpCell display)
                "officialThresholdScore": threshold,
                # Bump / spot tracking
                "bumpIn": r.get("bumpIn", False),
                "openedSpot": r.get("openedSpot", False),
                "spotShifted": r.get("spotShifted", False),
                "bumpedBy": r.get("bumpedBy", []),
                "openedFor": r.get("openedFor", []),
                "flags": flags_list,
                "reviewFlags": [],
                "sourceRow": r["sourceRow"],
            })

        # Build event summary record
        entries = len(rows)
        non_disp_entries = sum(1 for r in rows if r.get("nonDisplacing"))
        preq_rows = sum(1 for r in rows if r.get("prequalified"))
        foreign_rows = sum(1 for r in rows if r.get("foreignDeclared"))
        dual_rows = sum(1 for r in rows if r.get("dualDeclared"))
        direct_nat = sum(1 for r in rows if r.get("juniorNationalStatus") == "Direct")
        repl_nat = sum(1 for r in rows if r.get("juniorNationalStatus") == "Replacement")
        ewc_qual = sum(1 for r in rows if r.get("advancesToEWC"))
        thr_qual = sum(
            1 for r in rows
            if (r.get("qualificationStatus") or "").endswith("average score threshold")
        )

        eligible_scores = sorted(
            (r["score"] for r in rows
             if not r.get("nonDisplacing") and not r.get("prequalified")
             and r.get("score") is not None),
            reverse=True,
        )
        lowest_direct_score = eligible_scores[ZONE_DIRECT_NATIONAL_LIMIT - 1] if len(eligible_scores) >= ZONE_DIRECT_NATIONAL_LIMIT else None
        lowest_ewc_score = eligible_scores[ZONE_EWC_LIMIT - 1] if len(eligible_scores) >= ZONE_EWC_LIMIT else None

        new_events.append({
            "id": event_id,
            "stage": "Zones",
            "meetName": meet_name,
            "zone": zone_letter,
            "ewc": ewc,
            "eventName": event_name,
            "eventKey": event_key,
            "eventCategory": parsed["eventCategory"],
            "qualifyingEvent": parsed["qualifyingEvent"],
            "ageGroup": parsed["ageGroup"],
            "gender": parsed["gender"],
            "discipline": parsed["discipline"],
            "isSynchro": parsed["isSynchro"],
            "entries": entries,
            "countableEntries": entries - non_disp_entries,
            "nonDisplacingEntries": non_disp_entries,
            "foreignRows": foreign_rows,
            "dualRows": dual_rows,
            "prequalifiedRows": preq_rows,
            "directNationalQualifiers": direct_nat,
            "replacementNationalQualifiers": repl_nat,
            "ewcQualifiers": ewc_qual,
            "thresholdQualifiers": thr_qual,
            "officialThresholdScore": threshold,
            "lowestDirectScore": lowest_direct_score,
            "lowestEWCScore": lowest_ewc_score,
            "reviewRows": 0,
            "sort": sort_counter,
        })
        sort_counter += 1

    return new_events, new_results


# ---------------------------------------------------------------------------
# Merge into existing JS data
# ---------------------------------------------------------------------------

def merge_zone_data(
    existing_data: dict,
    new_events: list[dict],
    new_results: list[dict],
) -> dict:
    # Remove any previously merged Zone records
    existing_data["events"] = [
        e for e in existing_data.get("events", []) if e.get("stage") != "Zones"
    ]
    existing_data["results"] = [
        r for r in existing_data.get("results", []) if r.get("stage") != "Zones"
    ]

    existing_data["events"].extend(new_events)
    existing_data["results"].extend(new_results)

    description = (
        f"Zone Championship results loaded "
        f"({len(new_events)} events, {len(new_results)} results)"
    )
    for collection in (
        existing_data.get("stages", []),
        existing_data.get("meta", {}).get("stageStatus", []),
    ):
        for rec in collection:
            if rec.get("stage") == "Zones":
                rec["status"] = "loaded"
                rec["description"] = description

    counts = existing_data.setdefault("meta", {}).setdefault("counts", {})
    counts["results"] = len(existing_data["results"])
    counts["events"] = len(existing_data["events"])
    existing_data["meta"]["generatedAt"] = (
        datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    )
    return existing_data


# ---------------------------------------------------------------------------
# main.js patch
# ---------------------------------------------------------------------------

# Replacement for recalculateZoneToNational with:
#   • ZONE_DIRECT_NATIONAL_LIMIT = 3  (was 5)
#   • Replacement pool (ranks 4–6) → advancesToEWC = true
#   • Ranks 4–18 → E/W/C qualifier
#   • Score threshold → E/W/C qualifier (reads officialThresholdScore from row)
#   • advancesToZone = true for both Nationals and E/W/C qualifiers
_NEW_RECALC_ZONE_FN = """\
function recalculateZoneToNational(eventRows) {
  let rawEligibleRank = 0;
  let attendingEligibleRank = 0;
  let declinedInsideDirectLimit = 0;
  const ZONE_EWC_LIMIT = 18;
  eventRows.forEach((row) => {
    row.eligibleRank = "";
    row.attendingEligibleRank = "";
    row.juniorNationalStatus = "";
    row.bumpIn = false;
    row.openedSpot = false;
    row.spotShifted = false;
    row.bumpedBy = [];
    row.openedFor = [];
    row.advancesToNationals = false;
    row.advancesToEWC = false;
    const eligible = row.qualifyingEvent !== false && !row.nonDisplacing && !row.prequalified;
    if (!eligible) {
      row.qualificationStatus = row.nonDisplacing
        ? "Non-displacing - no spot consumed"
        : "Not eligible for direct advancement";
      row.advancesToZone = false;
      return;
    }
    rawEligibleRank += 1;
    row.eligibleRank = rawEligibleRank;
    if (row.declaredNotAttending) {
      row.qualificationStatus = "Declared not attending";
      row.juniorNationalStatus = "Declined";
      if (rawEligibleRank <= ZONE_DIRECT_NATIONAL_LIMIT) declinedInsideDirectLimit += 1;
      row.advancesToZone = false;
      row.openedSpot = rawEligibleRank <= ZONE_DIRECT_NATIONAL_LIMIT;
      return;
    }
    attendingEligibleRank += 1;
    row.attendingEligibleRank = attendingEligibleRank;
    if (rawEligibleRank <= ZONE_DIRECT_NATIONAL_LIMIT) {
      row.qualificationStatus = "Junior Nationals qualifier - direct";
      row.juniorNationalStatus = "Direct";
      row.advancesToNationals = true;
      row.advancesToZone = true;
    } else if (
      declinedInsideDirectLimit > 0 &&
      rawEligibleRank <= ZONE_REPLACEMENT_ELIGIBLE_LIMIT &&
      attendingEligibleRank <= ZONE_DIRECT_NATIONAL_LIMIT
    ) {
      row.qualificationStatus = "Junior Nationals qualifier - decline replacement";
      row.juniorNationalStatus = "Replacement";
      row.bumpIn = true;
      row.advancesToNationals = true;
      row.advancesToZone = true;
    } else if (rawEligibleRank <= ZONE_REPLACEMENT_ELIGIBLE_LIMIT) {
      row.qualificationStatus = "Replacement eligible if a direct qualifier declines";
      row.juniorNationalStatus = "Replacement pool";
      row.advancesToEWC = true;
      row.advancesToZone = true;
    } else if (rawEligibleRank <= ZONE_EWC_LIMIT) {
      row.qualificationStatus = "E/W/C qualifier - position";
      row.juniorNationalStatus = "E/W/C";
      row.advancesToEWC = true;
      row.advancesToZone = true;
    } else if (
      row.officialThresholdScore != null &&
      row.score != null &&
      row.score >= row.officialThresholdScore
    ) {
      row.qualificationStatus = "E/W/C qualifier - average score threshold";
      row.juniorNationalStatus = "E/W/C";
      row.advancesToEWC = true;
      row.advancesToZone = true;
    } else {
      row.qualificationStatus = "Does not advance from Zone";
      row.advancesToZone = false;
    }
  });
}\
"""


def patch_main_js(main_js_path: Path) -> None:
    text = main_js_path.read_text(encoding="utf-8")
    original = text

    # 1. Update ZONE_DIRECT_NATIONAL_LIMIT constant
    text = re.sub(
        r"const ZONE_DIRECT_NATIONAL_LIMIT\s*=\s*\d+;",
        "const ZONE_DIRECT_NATIONAL_LIMIT = 3;",
        text,
    )

    # 2. Update the bumpCell threshold label for Zone rows
    text = text.replace(
        "if (row.officialThresholdScore != null) lines.push(`15th avg: ${formatScore(row.officialThresholdScore)}`);",
        'if (row.officialThresholdScore != null) lines.push(`${row.stage === "Zones" ? "18th" : "15th"} avg: ${formatScore(row.officialThresholdScore)}`);',
    )

    # 3. Replace the full recalculateZoneToNational function
    fn_re = re.compile(
        r"function recalculateZoneToNational\(eventRows\)\s*\{.*?\n\}",
        re.DOTALL,
    )
    if fn_re.search(text):
        text = fn_re.sub(_NEW_RECALC_ZONE_FN, text)
    else:
        print(
            "  WARNING: Could not locate recalculateZoneToNational in main.js — skipped.",
            file=sys.stderr,
        )

    if text == original:
        print("  main.js already up to date — no changes needed.")
        return

    main_js_path.write_text(text, encoding="utf-8")
    print(f"  Patched {main_js_path}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--db", metavar="PATH",
                    help="Local path to usa_2026.db (downloaded if omitted)")
    ap.add_argument("--js", metavar="PATH", default=DEFAULT_JS_PATH,
                    help=f"Path to junior-data.js (default: {DEFAULT_JS_PATH})")
    ap.add_argument("--main-js", metavar="PATH", default=DEFAULT_MAIN_JS_PATH,
                    help=f"Path to main.js (default: {DEFAULT_MAIN_JS_PATH})")
    ap.add_argument("--prequalified", metavar="FILE",
                    help="JSON [{diveMeetsId, eventKey}] athletes prequalified to Nationals")
    ap.add_argument("--not-attending", metavar="FILE", dest="not_attending",
                    help="JSON [{diveMeetsId, eventKey}] athletes who declined their spot")
    ap.add_argument("--patch-app", action="store_true",
                    help="Also update ZONE_DIRECT_NATIONAL_LIMIT and recalculateZoneToNational in main.js")
    ap.add_argument("--dry-run", action="store_true",
                    help="Print summary without writing any files")
    args = ap.parse_args()

    js_path = Path(args.js)
    main_js_path = Path(args.main_js)

    if not js_path.exists():
        sys.exit(f"ERROR: junior-data.js not found at {js_path}")
    if args.patch_app and not main_js_path.exists():
        sys.exit(f"ERROR: main.js not found at {main_js_path} (required for --patch-app)")

    # Resolve or download database
    if args.db:
        db_path = Path(args.db)
        if not db_path.exists():
            sys.exit(f"ERROR: Database not found at {db_path}")
    else:
        tmp = tempfile.mkdtemp()
        db_path = Path(tmp) / "usa_2026.db"
        print("Downloading usa_2026.db …")
        download_db(db_path)

    # Load JS data
    print(f"Loading {js_path} …")
    existing_data = load_js_data(js_path)
    print(
        f"  {len(existing_data.get('results', []))} existing results, "
        f"{len(existing_data.get('events', []))} existing events"
    )

    # Optional overrides
    preq_set = _load_pair_set(args.prequalified)
    not_att_set = _load_pair_set(args.not_attending)
    if preq_set:
        print(f"  Prequalified overrides: {len(preq_set)} athlete/event pairs")
    if not_att_set:
        print(f"  Not-attending overrides: {len(not_att_set)} athlete/event pairs")

    zone_ewc_map = derive_zone_ewc_map(existing_data)
    print(f"  Zone→EWC mapping: {zone_ewc_map}")

    # Process Zone meets
    with sqlite3.connect(db_path) as conn:
        new_events, new_results = process_zones(
            conn, existing_data, preq_set, not_att_set, zone_ewc_map
        )

    if not new_events:
        print("\nNo Zone events found — nothing to write.", file=sys.stderr)
        sys.exit(1)

    # Per-zone summary table
    by_zone: dict[str, dict] = defaultdict(
        lambda: {"events": 0, "results": 0, "nationals": 0, "ewc": 0, "threshold": 0}
    )
    for e in new_events:
        z = e["zone"]
        by_zone[z]["events"] += 1
        by_zone[z]["nationals"] += e.get("directNationalQualifiers", 0) + e.get("replacementNationalQualifiers", 0)
        by_zone[z]["ewc"] += e.get("ewcQualifiers", 0)
        by_zone[z]["threshold"] += e.get("thresholdQualifiers", 0)
    for r in new_results:
        by_zone[r["zone"]]["results"] += 1

    print(f"\nZone processing summary ({len(new_events)} events, {len(new_results)} results):")
    print(f"  {'Zone':<6} {'EWC':<9} {'Events':>6} {'Results':>8} {'→Natl':>7} {'→E/W/C':>8} {'Thr':>5}")
    print(f"  {'-'*6} {'-'*9} {'-'*6} {'-'*8} {'-'*7} {'-'*8} {'-'*5}")
    for z in sorted(by_zone):
        d = by_zone[z]
        ewc = zone_ewc_map.get(z, "?")
        print(f"  {z:<6} {ewc:<9} {d['events']:>6} {d['results']:>8} {d['nationals']:>7} {d['ewc']:>8} {d['threshold']:>5}")

    # Threshold scores per qualifying event type
    threshold_events = [e for e in new_events if e.get("officialThresholdScore")]
    if threshold_events:
        unique_keys: dict[str, dict] = {}
        for e in threshold_events:
            k = f"{e['eventKey']} ({e['ewc']})"
            if k not in unique_keys:
                unique_keys[k] = e
        print(f"\nE/W/C threshold scores (avg 18th-place, {len(unique_keys)} event types):")
        for k, e in sorted(unique_keys.items()):
            print(f"  {k}: {e['officialThresholdScore']:.3f}")

    if args.dry_run:
        print("\nDry run — no files written.")
        return

    # Write junior-data.js
    updated_data = merge_zone_data(existing_data, new_events, new_results)
    print(f"\nWriting {js_path} …")
    save_js_data(updated_data, js_path)
    print(f"  Updated counts: {updated_data['meta']['counts']}")

    # Optionally patch main.js
    if args.patch_app:
        print(f"Patching {main_js_path} …")
        patch_main_js(main_js_path)
        print(
            "\n  main.js changes:\n"
            "    • ZONE_DIRECT_NATIONAL_LIMIT: 5 → 3\n"
            "    • recalculateZoneToNational: added E/W/C (ranks 4–18) and threshold logic\n"
            "    • bumpCell: threshold label now shows '18th avg' for Zone rows"
        )
    else:
        print(
            "\nNOTE: Run with --patch-app to also update main.js.\n"
            "  Without that patch the browser will recalculate Zone qualification\n"
            "  using ZONE_DIRECT_NATIONAL_LIMIT=5 (should be 3) and will not\n"
            "  show E/W/C qualifiers (positions 4–18)."
        )

    print("\nDone.")


if __name__ == "__main__":
    main()
