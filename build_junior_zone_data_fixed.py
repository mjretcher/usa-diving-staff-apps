#!/usr/bin/env python3
"""
Safe wrapper for build_zone_data.py.

This preserves the existing processor while correcting two operational issues:
1. Empty data/junior-data.js should not make the build fail.
2. 2026 Zone individual Group A-D 1M, 3M, and Platform events are qualifying events.

It also fails loudly if the source database contains Zone meet headers but no
processed results for one or more of those zones. That prevents a false-success
build from silently publishing only Zone B when Zone E/F meet shells are present
but their result tables have not been scraped into usa_2026.db yet.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import build_zone_data as builder


def load_js_data(path: Path) -> dict:
    text = path.read_text(encoding="utf-8").strip() if path.exists() else ""
    text = re.sub(r"^\s*window\.JUNIOR_RESULTS_DATA\s*=\s*", "", text)
    text = re.sub(r";?\s*$", "", text)
    if not text:
        return {
            "meta": {
                "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
                "counts": {"events": 0, "results": 0},
                "stageStatus": [
                    {"stage": "Regionals", "status": "pending", "description": "Regional data not present in committed junior-data.js"},
                    {"stage": "Zones", "status": "pending", "description": "Zone data pending build"},
                    {"stage": "EWC", "status": "pending", "description": "E/W/C data pending"},
                    {"stage": "Nationals", "status": "pending", "description": "Nationals data pending"},
                ],
            },
            "stages": [
                {"stage": "Regionals", "status": "pending"},
                {"stage": "Zones", "status": "pending"},
                {"stage": "EWC", "status": "pending"},
                {"stage": "Nationals", "status": "pending"},
            ],
            "events": [],
            "results": [],
            "athletes": [],
            "officialZoneQualifiers": [],
        }
    return json.loads(text)


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
    (re.compile(r"\b3[\s-]?m\b|3\s*meter", re.I), "3M"),
    (re.compile(r"\b1[\s-]?m\b|1\s*meter", re.I), "1M"),
]
QUALIFYING_AGE_GROUPS = {"Group A", "Group B", "Group C", "Group D"}
QUALIFYING_DISCIPLINES = {"1M", "3M", "Platform"}


def parse_event_name(name: str) -> dict:
    is_synchro = bool(re.search(r"\bsynchro\b", name, re.I))
    age_group = next((label for pat, label in _AGE_GROUP_RE if pat.search(name)), None)
    gender = next((label for pat, label in _GENDER_RE if pat.search(name)), None)
    discipline = next((label for pat, label in _DISC_RE if pat.search(name)), None)

    if age_group and gender and discipline:
        event_key = f"{age_group} {gender} {discipline}"
        if is_synchro:
            event_key += " Synchro"
    else:
        event_key = name

    qualifying = (
        age_group in QUALIFYING_AGE_GROUPS
        and discipline in QUALIFYING_DISCIPLINES
        and not is_synchro
    )

    return {
        "ageGroup": age_group,
        "gender": gender,
        "discipline": discipline,
        "isSynchro": is_synchro,
        "eventKey": event_key,
        "eventCategory": "Qualifying Event" if qualifying else "Non-Qualifying Event",
        "qualifyingEvent": qualifying,
    }


_original_process_zones = builder.process_zones


def process_zones_with_guard(conn, existing_data, prequalified_set, not_attending_set, zone_ewc_map):
    zone_meets = builder.get_zone_meets(conn)
    expected_zones = {
        builder.extract_zone_letter(m["name"])
        for m in zone_meets
        if builder.extract_zone_letter(m["name"])
    }

    new_events, new_results = _original_process_zones(
        conn, existing_data, prequalified_set, not_attending_set, zone_ewc_map
    )
    result_zones = {r.get("zone") for r in new_results if r.get("zone")}
    missing = sorted(expected_zones - result_zones)

    if missing:
        print("", file=sys.stderr)
        print("ERROR: Zone meet headers were found, but no result rows were processed for: " + ", ".join(missing), file=sys.stderr)
        print("This usually means usa_2026.db has meet/event shells but the DiveMeets results for those zones have not been scraped into the results table yet.", file=sys.stderr)
        print("Use the restored known-good B/E/F junior-data.js until the source scraper DB contains full Zone E/F results.", file=sys.stderr)
        sys.exit(2)

    return new_events, new_results


builder.load_js_data = load_js_data
builder.parse_event_name = parse_event_name
builder.process_zones = process_zones_with_guard

if __name__ == "__main__":
    builder.main()
