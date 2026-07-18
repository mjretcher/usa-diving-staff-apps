#!/usr/bin/env python3
"""
DiveMeets meet-catalog crawler.

Walks new.divemeets.com meet ids DESCENDING (newest meets have the highest
ids, so descending naturally works backwards in time: 2026 -> 2025 -> ...).
For each id it fetches /MeetInfo/{id} (fallback /MeetResults/{id}), parses
name / venue / dates / address / sanctioning body / type, and upserts into
divemeets.meets. Dead ids are recorded as http_status=404 so they are never
refetched. Fully resumable: each run picks up at the lowest already-crawled
id minus one.

Env:
  DATABASE_URL   (required)
  START_ID       optional explicit ceiling for this run; default: resume
                 (min crawled id - 1), or CEILING_DEFAULT on first run
  FLOOR_ID       stop at this id (default 1)
  BATCH          max ids to process this run (default 500)
  AUTO_STOP_YEAR if the newest start_date seen in this run's batch is older
                 than Jan 1 of this year, write dm_catalog_done flag and
                 future auto runs exit immediately (default 2015; set 0 to
                 disable)

Run report -> app_meta.config key 'dm_catalog_last_run'.
Done flag   -> app_meta.config key 'dm_catalog_done' ("true"/absent).
"""
import html
import json
import os
import re
import sys
import time
import traceback
import urllib.error
import urllib.request
from datetime import date, datetime, timezone

import psycopg2

DB_URL = os.environ["DATABASE_URL"]
CEILING_DEFAULT = 13200  # comfortably above the highest known meet id (~12.9k)
FLOOR_ID = int(os.environ.get("FLOOR_ID") or 1)
BATCH = int(os.environ.get("BATCH") or 500)
AUTO_STOP_YEAR = int(os.environ.get("AUTO_STOP_YEAR") or 2015)
SLEEP_S = 0.6
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

LOG = []
def log(msg):
    print(msg, flush=True)
    LOG.append(str(msg))

def fetch(url):
    """Return (status, html_text). 404 -> (404, ''). Retries transient errors."""
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    })
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.status, resp.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return 404, ""
            last = e
            if e.code in (403, 429, 503):
                # potential Cloudflare / rate limiting — back off hard
                time.sleep(20 * (attempt + 1))
            else:
                time.sleep(3 * (attempt + 1))
        except Exception as e:  # timeouts, connection resets
            last = e
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"fetch failed after retries: {url}: {last}")

def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", " ", s)).replace("\xa0", " ").strip()

MONTHS = {m: i + 1 for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"])}

def parse_dm_date(s):
    m = re.match(r"([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})", s.strip())
    if not m or m.group(1) not in MONTHS:
        return None
    return date(int(m.group(3)), MONTHS[m.group(1)], int(m.group(2)))

HEAD_RX = re.compile(
    r"<h2>\s*<a href=\"https://new\.divemeets\.com/MeetInfo/\d+\"[^>]*>(.*?)</a>\s*</h2>"
    r"\s*<h5>\s*(.*?)\s*</h5>\s*<h5>\s*(.*?)\s*</h5>", re.S)
# labeled rows: bold label div (fullsize) ... next text-start value div (fullsize)
LABEL_RX = re.compile(
    r"class=\"col-lg-6 fw-bold text-end fullsize\">\s*(.*?)\s*</div>.*?"
    r"class=\"col-lg-6 text-start fullsize\">\s*(.*?)\s*</div>", re.S)

def parse_meet_page(h):
    out = {"meet_name": None, "venue": None, "dates_raw": None,
           "start_date": None, "end_date": None, "info": {}}
    m = HEAD_RX.search(h)
    if m:
        out["meet_name"] = strip_tags(m.group(1))
        out["venue"] = strip_tags(m.group(2))
        out["dates_raw"] = strip_tags(m.group(3))
        parts = [p.strip() for p in out["dates_raw"].split(" - ")]
        if parts:
            out["start_date"] = parse_dm_date(parts[0])
            out["end_date"] = parse_dm_date(parts[-1]) or out["start_date"]
    for lab, val in LABEL_RX.findall(h):
        lab = strip_tags(lab).rstrip(":")
        val = strip_tags(val)
        if lab and lab not in out["info"]:
            out["info"][lab] = val
    return out

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    # done flag short-circuit (for scheduled runs after the crawl finishes)
    cur.execute("SELECT value FROM app_meta.config WHERE key='dm_catalog_done'")
    r = cur.fetchone()
    if r and "true" in str(r[0]) and not os.environ.get("START_ID"):
        log("dm_catalog_done flag set — nothing to do (pass START_ID to override)")
        return

    start_env = (os.environ.get("START_ID") or "").strip()
    if start_env:
        start_id = int(start_env)
    else:
        cur.execute("SELECT min(meet_id) FROM divemeets.meets")
        r = cur.fetchone()
        start_id = (r[0] - 1) if r and r[0] else CEILING_DEFAULT
    if start_id < FLOOR_ID:
        log(f"start id {start_id} below floor {FLOOR_ID} — done")
        _set_config(cur, "dm_catalog_done", json.dumps(True)); conn.commit()
        return

    log(f"crawling ids {start_id} down to >= {max(FLOOR_ID, start_id - BATCH + 1)}")
    n_ok = n_404 = 0
    newest_seen = None
    for meet_id in range(start_id, max(FLOOR_ID, start_id - BATCH + 1) - 1, -1):
        status, h = fetch(f"https://new.divemeets.com/MeetInfo/{meet_id}")
        parsed = {"meet_name": None, "venue": None, "dates_raw": None,
                  "start_date": None, "end_date": None, "info": {}}
        if status == 404:
            # some meets hide info but show results — try the fallback page
            status2, h2 = fetch(f"https://new.divemeets.com/MeetResults/{meet_id}")
            if status2 == 200 and "MeetInfo/" in h2:
                status, parsed = 200, parse_meet_page(h2)
            else:
                n_404 += 1
        if status == 200 and h:
            parsed = parse_meet_page(h)
        if status == 200:
            n_ok += 1
            if parsed["start_date"]:
                if newest_seen is None or parsed["start_date"] > newest_seen:
                    newest_seen = parsed["start_date"]
        info = parsed["info"]
        cur.execute(
            """INSERT INTO divemeets.meets
               (meet_id, http_status, meet_name, venue, start_date, end_date,
                dates_raw, address, sanction, meet_type, info, crawled_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now())
               ON CONFLICT (meet_id) DO UPDATE SET
                 http_status=EXCLUDED.http_status, meet_name=EXCLUDED.meet_name,
                 venue=EXCLUDED.venue, start_date=EXCLUDED.start_date,
                 end_date=EXCLUDED.end_date, dates_raw=EXCLUDED.dates_raw,
                 address=EXCLUDED.address, sanction=EXCLUDED.sanction,
                 meet_type=EXCLUDED.meet_type, info=EXCLUDED.info,
                 crawled_at=now()""",
            (meet_id, status, parsed["meet_name"], parsed["venue"],
             parsed["start_date"], parsed["end_date"], parsed["dates_raw"],
             info.get("Location"), info.get("Sanctioning Body"),
             info.get("Type"), json.dumps(info)))
        if (start_id - meet_id + 1) % 50 == 0:
            conn.commit()
            log(f"  ...{meet_id}: {n_ok} pages, {n_404} dead ids so far")
        time.sleep(SLEEP_S)
    conn.commit()
    log(f"batch done: {n_ok} meets, {n_404} dead ids, "
        f"newest start_date this batch: {newest_seen}")

    if AUTO_STOP_YEAR and newest_seen and newest_seen.year < AUTO_STOP_YEAR:
        log(f"entire batch older than {AUTO_STOP_YEAR} — setting done flag")
        _set_config(cur, "dm_catalog_done", json.dumps(True))
        conn.commit()
    cur.close(); conn.close()

def _set_config(cur, key, value):
    cur.execute(
        """INSERT INTO app_meta.config (key, value, description)
           VALUES (%s,%s,'dm_catalog.py')
           ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()""",
        (key, value))

def report(ok, err=None):
    try:
        conn = psycopg2.connect(DB_URL); cur = conn.cursor()
        _set_config(cur, "dm_catalog_last_run", json.dumps({
            "at": datetime.now(timezone.utc).isoformat(), "ok": ok,
            "error": err, "log": LOG[-40:]}))
        conn.commit(); cur.close(); conn.close()
    except Exception:
        traceback.print_exc()

if __name__ == "__main__":
    try:
        main()
        report(True)
    except Exception:
        err = traceback.format_exc()
        print(err, file=sys.stderr)
        report(False, err)
        sys.exit(1)
