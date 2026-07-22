#!/usr/bin/env python3
"""
Scrape the OFFICIAL Zone->Nationals qualifier lists DiveMeets publishes at
  https://new.divemeets.com/QualificationLists/USADivingJOZones_{year}/ShowQualifiers/{meet}_{event}
into core.zone_qualifier_lists.

WHY THIS EXISTS
---------------
These lists are the single thing the standard EventResults crawl (core.event_results)
cannot reproduce. They are the adjudicated top-N-per-event Zone qualifier lists USA
Diving publishes, and they legitimately include divers who never appear in a given
event's result table (a diver can qualify off a higher-scoring performance elsewhere).
The Junior Circuit app carries these as `officialZoneQualifiers` and injects them as
synthetic `sourceRow='synthetic_from_oqz'` result rows. Persisting them here lets the
qualification pipeline be rebuilt from Neon instead of a scraped usa_2026.db SQLite
file (the file that lives in a separate Git-LFS repo and breaks the weekly build).

PAGE STRUCTURE (confirmed via recon 2026-07-22, Zone A Group A Girls 1M)
------------------------------------------------------------------------
Detail page = the same Bootstrap `row rowback border` blocks EventResults uses.
Each qualifier row has five columns:
  col-lg-1  place / rank                     -> "1"
  col-lg-5  <a href="/Profile/{id}">Name</a>
  col-lg-2  <a href="/TeamProfile/{id}">TEAM</a>
  col-lg-2  <a href="/MeetResults/{regionMeetId}">Region N</a>
  col-lg-2  <a href="/DiveSheetResults/...">387.70</a>   (score + sheet link)
The page also carries a marker line: "*Nth Place Qualifying Score: 274.281" — the
average-score threshold. Stored as is_avg_score_marker=true, rank NULL.

SEED
----
48 (zone, meet_id, event_id, event_key) tuples (6 zones x 8 springboard events;
Platform is not a Zone qualifier-list event). Baked in below from the values the app
already carries, and each is re-verified against the page's own event heading on fetch
so a stale/incorrect id is caught rather than silently mis-filed.

Idempotent: unique indexes on (year, meet_id, event_id, rank) and a partial index for
the marker row mean reruns upsert safely and a partial/interrupted run can just be
re-dispatched.

Env: DATABASE_URL. Optional: QUAL_YEAR (default 2026), QUAL_EVENT_FILTER
(comma-separated "{meet}_{event}" keys for a partial/resume run).

Run by .github/workflows/zone-qualifier-lists.yml (workflow_dispatch).
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")

YEAR = int(os.environ.get("QUAL_YEAR", "2026"))
_filter_raw = os.environ.get("QUAL_EVENT_FILTER", "").strip()
EVENT_FILTER = set(x.strip() for x in _filter_raw.split(",") if x.strip()) if _filter_raw else None

# 48-event seed (meet_id, event_id, zone, event_key). Springboard only.
SEED = [
    ("12878", "30520", "A", "Group A Girls 1M"),
    ("12878", "30525", "A", "Group A Girls 3M"),
    ("12878", "30645", "A", "Group A Boys 1M"),
    ("12878", "30650", "A", "Group A Boys 3M"),
    ("12878", "30490", "A", "Group B Girls 1M"),
    ("12878", "30495", "A", "Group B Girls 3M"),
    ("12878", "30615", "A", "Group B Boys 1M"),
    ("12878", "30620", "A", "Group B Boys 3M"),
    ("12879", "30520", "B", "Group A Girls 1M"),
    ("12879", "30525", "B", "Group A Girls 3M"),
    ("12879", "30645", "B", "Group A Boys 1M"),
    ("12879", "30650", "B", "Group A Boys 3M"),
    ("12879", "30490", "B", "Group B Girls 1M"),
    ("12879", "30495", "B", "Group B Girls 3M"),
    ("12879", "30615", "B", "Group B Boys 1M"),
    ("12879", "30620", "B", "Group B Boys 3M"),
    ("12880", "30520", "C", "Group A Girls 1M"),
    ("12880", "30525", "C", "Group A Girls 3M"),
    ("12880", "30645", "C", "Group A Boys 1M"),
    ("12880", "30650", "C", "Group A Boys 3M"),
    ("12880", "30490", "C", "Group B Girls 1M"),
    ("12880", "30495", "C", "Group B Girls 3M"),
    ("12880", "30615", "C", "Group B Boys 1M"),
    ("12880", "30620", "C", "Group B Boys 3M"),
    ("12882", "30520", "D", "Group A Girls 1M"),
    ("12882", "30525", "D", "Group A Girls 3M"),
    ("12882", "30645", "D", "Group A Boys 1M"),
    ("12882", "30650", "D", "Group A Boys 3M"),
    ("12882", "30490", "D", "Group B Girls 1M"),
    ("12882", "30495", "D", "Group B Girls 3M"),
    ("12882", "30615", "D", "Group B Boys 1M"),
    ("12882", "30620", "D", "Group B Boys 3M"),
    ("12881", "30520", "E", "Group A Girls 1M"),
    ("12881", "30525", "E", "Group A Girls 3M"),
    ("12881", "30645", "E", "Group A Boys 1M"),
    ("12881", "30650", "E", "Group A Boys 3M"),
    ("12881", "30490", "E", "Group B Girls 1M"),
    ("12881", "30495", "E", "Group B Girls 3M"),
    ("12881", "30615", "E", "Group B Boys 1M"),
    ("12881", "30620", "E", "Group B Boys 3M"),
    ("12883", "30520", "F", "Group A Girls 1M"),
    ("12883", "30525", "F", "Group A Girls 3M"),
    ("12883", "30645", "F", "Group A Boys 1M"),
    ("12883", "30650", "F", "Group A Boys 3M"),
    ("12883", "30490", "F", "Group B Girls 1M"),
    ("12883", "30495", "F", "Group B Girls 3M"),
    ("12883", "30615", "F", "Group B Boys 1M"),
    ("12883", "30620", "F", "Group B Boys 3M"),
]

BASE = f"https://new.divemeets.com/QualificationLists/USADivingJOZones_{YEAR}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def fetch(url, referer=None, attempts=3):
    headers = dict(HEADERS)
    if referer:
        headers["Referer"] = referer
    last = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (403, 429, 500, 502, 503) and i < attempts - 1:
                time.sleep(6 + i * 4)
                continue
            raise
        except Exception as e:
            last = e
            if i < attempts - 1:
                time.sleep(4)
                continue
            raise
    raise last

ROW_MARKER = '<div class="row rowback border">'
PROFILE_RX = re.compile(r'/Profile/(\d+)"[^>]*>\s*([^<]+?)\s*</a>')
TEAM_RX = re.compile(r'/TeamProfile/(\d+)"[^>]*>\s*([^<]+?)\s*</a>')
REGION_RX = re.compile(r'/MeetResults/(\d+)"[^>]*>\s*([^<]+?)\s*</a>')
SHEET_RX = re.compile(r'href="(https://new\.divemeets\.com/DiveSheetResults/[^"]+)"[^>]*>\s*([\d.]+)\s*</a>')
RANK_RX = re.compile(r'col-lg-1[^"]*"[^>]*>\s*(\d+)\s*</div>', re.S)
HEADING_RX = re.compile(r'<h5[^>]*>\s*(.*?)\s*</h5>', re.S)
MARKER_RX = re.compile(r'\*\s*(\d+)\w*\s+Place\s+Qualifying\s+Score:\s*([\d.]+)', re.I)

def parse_event_key(seed_key):
    # seed_key like "Group A Girls 1M"
    m = re.match(r'Group ([AB]) (Boys|Girls) (1M|3M)', seed_key)
    if not m:
        return None, None, None
    return f"Group {m.group(1)}", m.group(2), m.group(3)

def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None

def parse_list(html, meet_id, event_id):
    """Return (event_name, rows[], marker_or_None). Each row is a dict of one qualifier line."""
    heading = None
    mh = HEADING_RX.search(html)
    if mh:
        heading = re.sub(r'<[^>]+>', '', mh.group(1)).strip()

    rows = []
    for chunk in html.split(ROW_MARKER)[1:]:
        chunk = chunk.split(ROW_MARKER)[0]
        rk = RANK_RX.search(chunk)
        pm = PROFILE_RX.search(chunk)
        if not rk or not pm:
            continue
        tm = TEAM_RX.search(chunk)
        rm = REGION_RX.search(chunk)
        sm = SHEET_RX.search(chunk)
        rows.append({
            "rank": int(rk.group(1)),
            "diver_id_dm": pm.group(1),
            "diver_name": pm.group(2).strip(),
            "team_id_dm": tm.group(1) if tm else None,
            "team_name": tm.group(2).strip() if tm else None,
            "region_meet_id_dm": rm.group(1) if rm else None,
            "region_label": rm.group(2).strip() if rm else None,
            "sheet_url": sm.group(1) if sm else None,
            "score_text": sm.group(2).strip() if sm else None,
            "score": num(sm.group(2)) if sm else None,
        })

    marker = None
    mm = MARKER_RX.search(re.sub(r'<[^>]+>', ' ', html))
    if mm:
        marker = {"rank_ordinal": int(mm.group(1)), "score": num(mm.group(2)), "score_text": mm.group(2)}
    return heading, rows, marker

def main():
    import psycopg2
    from psycopg2.extras import execute_values

    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    total_rows = 0
    total_markers = 0
    per_event = []
    failures = []

    targets = [s for s in SEED if not EVENT_FILTER or f"{s[0]}_{s[1]}" in EVENT_FILTER]
    print(f"Zone qualifier-list scrape: year={YEAR}, {len(targets)} events")

    for meet_id, event_id, zone, seed_key in targets:
        url = f"{BASE}/ShowQualifiers/{meet_id}_{event_id}"
        age_group, gender, discipline = parse_event_key(seed_key)
        try:
            html = fetch(url, referer=BASE)
            heading, rows, marker = parse_list(html, meet_id, event_id)

            # Verify the page's own heading agrees with the seed's event key, so a
            # wrong/stale event id is caught rather than silently mis-filed.
            if heading:
                hk_age = "Group A" if "Group A" in heading else ("Group B" if "Group B" in heading else None)
                hk_gender = "Girls" if "Girls" in heading else ("Boys" if "Boys" in heading else None)
                hk_disc = "1M" if re.search(r'\b1m\b', heading, re.I) else ("3M" if re.search(r'\b3m\b', heading, re.I) else None)
                if (hk_age, hk_gender, hk_disc) != (age_group, gender, discipline):
                    raise ValueError(f"heading '{heading}' != seed '{seed_key}' — event id mismatch, refusing to store")

            if not rows and not marker:
                raise ValueError("no qualifier rows and no marker parsed — page shape changed or empty")

            # Idempotent replace for THIS event only.
            cur.execute(
                "DELETE FROM core.zone_qualifier_lists WHERE year=%s AND meet_id_dm=%s AND event_id_dm=%s",
                (YEAR, meet_id, event_id))

            payload = []
            for r in rows:
                payload.append((
                    YEAR, zone, meet_id, event_id, heading, seed_key, age_group, gender, discipline,
                    r["rank"], r["diver_id_dm"], r["diver_name"], r["team_name"], r["team_id_dm"],
                    r["region_label"], r["region_meet_id_dm"], r["score"], r["score_text"],
                    r["sheet_url"], False, url,
                ))
            if marker:
                payload.append((
                    YEAR, zone, meet_id, event_id, heading, seed_key, age_group, gender, discipline,
                    None, None, None, None, None, None, None, marker["score"], marker["score_text"],
                    None, True, url,
                ))
            execute_values(cur, """
                INSERT INTO core.zone_qualifier_lists
                (year, zone, meet_id_dm, event_id_dm, event_name, event_key, age_group, gender, discipline,
                 rank, diver_id_dm, diver_name, team_name, team_id_dm, region_label, region_meet_id_dm,
                 score, score_text, sheet_url, is_avg_score_marker, source_url)
                VALUES %s
            """, payload)
            conn.commit()

            total_rows += len(rows)
            total_markers += (1 if marker else 0)
            per_event.append((zone, seed_key, len(rows), bool(marker)))
            print(f"  [{zone}] {seed_key:20} {len(rows):3} qualifiers"
                  f"{' + marker' if marker else ''}  ({meet_id}_{event_id})")
            time.sleep(1.2)

        except Exception as e:
            conn.rollback()
            failures.append((zone, seed_key, meet_id, event_id, repr(e)[:200]))
            print(f"  [{zone}] {seed_key:20} FAILED: {e}")

    # Write a run summary into app_meta.config so the outcome is readable from Neon.
    summary = {
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "year": YEAR,
        "events_ok": len(per_event),
        "events_failed": len(failures),
        "total_qualifier_rows": total_rows,
        "total_markers": total_markers,
        "failures": failures,
    }
    try:
        cur.execute("""
            INSERT INTO app_meta.config (key, value, description)
            VALUES (%s, %s, 'Zone qualifier-list scrape summary (fetch_zone_qualifier_lists.py)')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
        """, (f"zone_qualifier_scrape_{YEAR}", json.dumps(summary)))
        conn.commit()
    except Exception as e:
        print(f"  (could not write summary: {e})")

    cur.close()
    conn.close()

    print(f"\nDONE: {len(per_event)} events OK, {len(failures)} failed, "
          f"{total_rows} qualifier rows, {total_markers} markers.")
    if failures:
        sys.exit(f"{len(failures)} event(s) failed — see summary key zone_qualifier_scrape_{YEAR}")

if __name__ == "__main__":
    main()
