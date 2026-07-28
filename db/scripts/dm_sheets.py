#!/usr/bin/env python3
"""
DiveMeets dive-sheet crawler (phase 3).

For each meet already covered by dm_results.py (results_done), fetches the
DiveSheetResults page for every placement row carrying a sheet_key and stores
each individual dive (dive number, height, description, net score, DD, score,
round place, and DiveMeets' own Voluntary/Optional flag) into
divemeets.sheet_dives. Newest meets first. One transaction per meet
(delete-then-insert + sheets_done flag together), so interrupted runs resume
at the next meet with nothing partial left behind.

Sheet parsing is the same 9-field row format proven by
fetch_trials_dive_sheets.py (2,686 dives, zero failures). Rows whose sheet
page yields no dives (withdrawn divers, synchro pages with a different
layout) are recorded in the meet's sheets_note rather than failing the meet.

Env:
  DATABASE_URL   required
  MEET_ID        crawl exactly this meet (ignores queue + done flag)
  SANCTION       registry sanction filter (default: USA Diving)
  TARGET_TAG     take the queue from divemeets.crawl_targets with this tag
                 instead of the sanction filter ('*' = every tag)
  FETCH_BUDGET   approx max page fetches this run (default 1100)

Report -> app_meta.config key 'dm_sheets_last_run'.
"""
import json
import os
import re
import sys
import time
import traceback
import urllib.error
import urllib.request
from datetime import datetime, timezone

import psycopg2

DB_URL = os.environ["DATABASE_URL"]
SANCTION = os.environ.get("SANCTION", "").strip() or "USA Diving"
FETCH_BUDGET = int(os.environ.get("FETCH_BUDGET") or 1100)
ONLY_MEET = (os.environ.get("MEET_ID") or "").strip()
TARGET_TAG = (os.environ.get("TARGET_TAG") or "").strip()

# See dm_results.py — same two queue scopes (whole sanction, or an explicit
# target list for NCAA). want_sheets lets a target be results-only.
if TARGET_TAG:
    SCOPE_SQL = ("EXISTS (SELECT 1 FROM divemeets.crawl_targets t "
                 "WHERE t.meet_id = m.meet_id AND t.want_sheets "
                 "AND (%s = '*' OR t.tag = %s))")
    SCOPE_PARAMS = (TARGET_TAG, TARGET_TAG)
    SCOPE_DESC = f"target_tag={TARGET_TAG!r}"
else:
    SCOPE_SQL = "m.sanction = %s"
    SCOPE_PARAMS = (SANCTION,)
    SCOPE_DESC = f"sanction={SANCTION!r}"
SLEEP_S = 0.7
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

LOG = []
def log(msg):
    print(msg, flush=True)
    LOG.append(str(msg))

fetches = 0

def fetch(url, referer=None):
    global fetches
    fetches += 1
    headers = {"User-Agent": UA,
               "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
               "Accept-Language": "en-US,en;q=0.9"}
    if referer:
        headers["Referer"] = referer
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (403, 429, 503):
                time.sleep(10 * (attempt + 1))
            elif e.code in (404, 500):
                raise
            else:
                time.sleep(3 * (attempt + 1))
        except Exception as e:
            last = e
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"fetch failed after retries: {url}: {last}")

def parse_dive_sheet(h):
    """9-field dive rows (same proven format as fetch_trials_dive_sheets.py)."""
    rows = []
    for chunk in h.split('<div class="row rowback border">')[1:]:
        fs = re.findall(r'class="fullsize">(.*?)</div>', chunk, re.S)
        if len(fs) != 9:
            continue  # totals row or trailing junk
        clean = [re.sub(r"\s+", " ", re.sub("<[^>]+>", "", x)).strip() for x in fs]
        try:
            dive_order = int(clean[0])
        except ValueError:
            continue
        def num(s):
            try:
                return float(s) if s else None
            except ValueError:
                return None
        rows.append((dive_order, clean[1], clean[2], clean[3],
                     num(clean[4]), num(clean[5]), num(clean[6]),
                     num(clean[7]), (clean[8].strip()[:1].upper() or None)))
    return rows

def db():
    return psycopg2.connect(DB_URL, keepalives=1, keepalives_idle=30,
                            keepalives_interval=10, keepalives_count=5)

def crawl_meet(meet_id):
    """Fetch phase holds NO db connection (sheet crawls run for many minutes
    and Neon closes idle connections); a fresh connection is opened only for
    the final single write transaction."""
    conn = db(); cur = conn.cursor()
    cur.execute(
        """SELECT event_id, round, profile_id, sheet_key
           FROM divemeets.results
           WHERE meet_id=%s AND sheet_key IS NOT NULL
           ORDER BY event_id, round, place NULLS LAST""", (meet_id,))
    targets = cur.fetchall()
    cur.close(); conn.close()
    all_rows, empties, failures = [], 0, []
    for (event_id, rnd, profile_id, sheet_key) in targets:
        url = (f"https://new.divemeets.com/DiveSheetResults/{meet_id}/"
               f"{event_id}/{rnd}/{profile_id}/{sheet_key}")
        referer = f"https://new.divemeets.com/EventResults/{meet_id}/{event_id}/{rnd}"
        try:
            h = fetch(url, referer=referer)
        except Exception as e:
            failures.append(f"{event_id}/{rnd}/{profile_id}: {str(e)[:80]}")
            time.sleep(SLEEP_S)
            continue
        time.sleep(SLEEP_S)
        dives = parse_dive_sheet(h)
        if not dives:
            empties += 1
            continue
        for d in dives:
            all_rows.append((meet_id, event_id, rnd, profile_id, sheet_key) + d)
    if failures:
        # refuse to mark the meet done on fetch failures — rerun will retry
        raise RuntimeError(
            f"meet {meet_id}: {len(failures)} sheet fetches failed; "
            f"first: {failures[0]}")
    note = f"{empties} sheets with no dive rows" if empties else None
    conn = db(); conn.autocommit = False; cur = conn.cursor()
    cur.execute("DELETE FROM divemeets.sheet_dives WHERE meet_id=%s", (meet_id,))
    if all_rows:
        cur.executemany(
            """INSERT INTO divemeets.sheet_dives
               (meet_id, event_id, round, profile_id, sheet_key, dive_order,
                dive_number, height, description, net_score, dd, score,
                round_place, opt_vol)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT (meet_id, event_id, round, profile_id, dive_order)
               DO NOTHING""", all_rows)
    cur.execute(
        """UPDATE divemeets.meets SET sheets_done=true, sheets_note=%s,
           sheets_crawled_at=now() WHERE meet_id=%s""", (note, meet_id))
    conn.commit(); cur.close(); conn.close()
    return len(targets), len(all_rows), note

def main():
    meets_done = 0
    while fetches < FETCH_BUDGET:
        if ONLY_MEET:
            if meets_done:
                break
            meet_id, name = int(ONLY_MEET), f"(explicit {ONLY_MEET})"
        else:
            # skip meets whose remaining sheets would blow the budget — a
            # meet must fit in one run since the transaction is per-meet
            remaining = FETCH_BUDGET - fetches
            conn = db(); cur = conn.cursor()
            cur.execute(
                f"""SELECT m.meet_id, m.meet_name,
                          (SELECT count(*) FROM divemeets.results r
                           WHERE r.meet_id=m.meet_id AND r.sheet_key IS NOT NULL)
                   FROM divemeets.meets m
                   WHERE {SCOPE_SQL} AND m.results_done AND NOT m.sheets_done
                   ORDER BY m.start_date DESC, m.meet_id DESC""",
                SCOPE_PARAMS)
            pick = None
            for (mid, mname, nsheets) in cur.fetchall():
                if nsheets <= remaining:
                    pick = (mid, mname)
                    break
            cur.close(); conn.close()
            if not pick:
                log(f"no queued meet fits remaining budget for {SCOPE_DESC}"
                    " — done for this run")
                break
            meet_id, name = pick
        n_t, n_d, note = crawl_meet(meet_id)
        meets_done += 1
        log(f"meet {meet_id} {name!r}: {n_t} sheets -> {n_d} dives"
            f"{' [' + note + ']' if note else ''}")
    log(f"run done: {meets_done} meets, {fetches} fetches")

def report(ok, err=None):
    try:
        conn = psycopg2.connect(DB_URL); cur = conn.cursor()
        cur.execute(
            """INSERT INTO app_meta.config (key, value, description)
               VALUES ('dm_sheets_last_run', %s, 'dm_sheets.py')
               ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,
                 updated_at=now()""",
            (json.dumps({"at": datetime.now(timezone.utc).isoformat(),
                         "ok": ok, "error": err, "log": LOG[-40:]}),))
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
