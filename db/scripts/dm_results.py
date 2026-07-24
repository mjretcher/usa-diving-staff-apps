#!/usr/bin/env python3
"""
DiveMeets results crawler (phase 2).

Drains the divemeets.meets registry NEWEST-FIRST (2026 -> 2016) for meets
matching SANCTION, fetching each meet's MeetResults page, discovering every
event/round, and storing all placement rows (place, diver + stable
profile_id, team + team_id, score, dive-sheet key) into divemeets.events /
divemeets.results. One transaction per meet (delete-then-insert, idempotent);
the registry row is marked results_done inside the same transaction, so an
interrupted run resumes cleanly at the next meet.

Meets whose page shows no events (results never published) are marked done
with results_note='no events found' — the auto queue only offers meets that
ended >= QUIET_DAYS ago, so "not posted yet" can't be confused with "never
posted". An explicitly-passed MEET_ID bypasses the queue filters entirely.

Env:
  DATABASE_URL   required
  MEET_ID        crawl exactly this meet (ignores queue + done flag)
  SANCTION       registry sanction filter (default: USA Diving)
  FETCH_BUDGET   approx max page fetches this run (default 700)
  QUIET_DAYS     meet must have ended this many days ago (default 3)

Report -> app_meta.config key 'dm_results_last_run'.
"""
import html as htmllib
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
SANCTION = os.environ.get("SANCTION", "").strip() or "USA Diving"
FETCH_BUDGET = int(os.environ.get("FETCH_BUDGET") or 700)
QUIET_DAYS = int(os.environ.get("QUIET_DAYS") or 3)
# A meet that fails this many times is parked and skipped by the queue so it
# cannot block every later run. Clear results_attempts to retry it.
MAX_ATTEMPTS = int(os.environ.get("MAX_ATTEMPTS") or 3)
ONLY_MEET = (os.environ.get("MEET_ID") or "").strip()
SLEEP_S = 0.8
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

LOG = []
def log(msg):
    print(msg, flush=True)
    LOG.append(str(msg))

fetches = 0

def fetch(url, referer=None):
    """GET with Referer (required by EventResults pages) + backoff retries."""
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
                time.sleep(10 * (attempt + 1))   # rate limit / CF — back off
            elif e.code in (404, 500):
                raise
            else:
                time.sleep(3 * (attempt + 1))
        except Exception as e:
            last = e
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"fetch failed after retries: {url}: {last}")

def clean(s):
    return " ".join(htmllib.unescape(re.sub(r"<[^>]+>", " ", s)).replace(
        "\xa0", " ").split())

ROW_MARKER = '<div class="row rowback border">'
EV_LINK_RX = re.compile(r'EventResults/(\d+)/(\d+)/(\d+)"[^>]*>(.*?)</a>', re.S)
PROFILE_RX = re.compile(r'/Profile/(\d+)"[^>]*>([^<]+)</a>')
TEAM_RX = re.compile(r'/TeamProfile/(\d+)"[^>]*>([^<]+)</a>')
DATE_RX = re.compile(r">\s*(\d{4}-\d{2}-\d{2})\s*<")
NUM_RX = re.compile(r"^-?\d+(?:\.\d+)?$")

def parse_meet_events(h, meet_id):
    """(event_id, round, title, entries, event_date) per event listed."""
    out, seen = [], set()
    for chunk in h.split(ROW_MARKER)[1:]:
        m = EV_LINK_RX.search(chunk)
        if not m or m.group(1) != str(meet_id):
            continue
        key = (int(m.group(2)), m.group(3))
        if key in seen:
            continue
        seen.add(key)
        title = clean(m.group(4))
        fs = [clean(x) for x in re.findall(
            r'class="col-lg-\d+[^"]*fullsize">\s*(.*?)\s*</div>', chunk, re.S)]
        entries = next((int(x) for x in fs if x.isdigit()), None)
        dm = DATE_RX.search(chunk)
        out.append((key[0], key[1], title, entries,
                    dm.group(1) if dm else None))
    return out

def parse_event_rows(h, meet_id, event_id, rnd):
    """Placement rows for one EventResults page."""
    sheet_rx = re.compile(
        rf"DiveSheetResults/{meet_id}/{event_id}/{rnd}/(\d+)/(\d+)")
    out, seen = [], set()
    for chunk in h.split(ROW_MARKER)[1:]:
        pm = PROFILE_RX.search(chunk)
        if not pm:
            continue
        profile_id = int(pm.group(1))
        if profile_id in seen:
            continue
        seen.add(profile_id)
        tm = TEAM_RX.search(chunk)
        sm = sheet_rx.search(chunk)
        # fullsize cells after the name/team: place, score, diff-from-first
        fs = [clean(x) for x in re.findall(
            r'class="col-lg-1[^"]*fullsize">\s*(.*?)\s*</div>', chunk, re.S)]
        place = fs[0] if fs else None
        score = next((float(x) for x in fs[1:2] if NUM_RX.match(x)), None)
        diff = next((float(x) for x in fs[2:3] if NUM_RX.match(x)), None)
        out.append((int(meet_id), int(event_id), str(rnd), place,
                    clean(pm.group(2)), profile_id,
                    clean(tm.group(2)) if tm else None,
                    int(tm.group(1)) if tm else None,
                    score, diff,
                    int(sm.group(2)) if sm else None))
    return out

def crawl_meet(cur, meet_id):
    mr_url = f"https://new.divemeets.com/MeetResults/{meet_id}"
    h = fetch(mr_url)
    time.sleep(SLEEP_S)
    events = parse_meet_events(h, meet_id)
    note = None
    all_rows = []
    if not events:
        note = "no events found"
    for (event_id, rnd, title, entries, ev_date) in events:
        er_url = f"https://new.divemeets.com/EventResults/{meet_id}/{event_id}/{rnd}"
        eh = fetch(er_url, referer=mr_url)
        time.sleep(SLEEP_S)
        rows = parse_event_rows(eh, meet_id, event_id, rnd)
        all_rows.append(((meet_id, event_id, rnd, title, entries, ev_date), rows))
    # single transaction: replace this meet's data + mark done
    cur.execute("DELETE FROM divemeets.results WHERE meet_id=%s", (meet_id,))
    cur.execute("DELETE FROM divemeets.events  WHERE meet_id=%s", (meet_id,))
    n_rows = 0
    for (ev, rows) in all_rows:
        cur.execute(
            """INSERT INTO divemeets.events
               (meet_id, event_id, round, title, entries, event_date)
               VALUES (%s,%s,%s,%s,%s,%s)""", ev)
        if rows:
            cur.executemany(
                """INSERT INTO divemeets.results
                   (meet_id, event_id, round, place, diver_name, profile_id,
                    team_name, team_id, score, diff_first, sheet_key)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", rows)
            n_rows += len(rows)
    cur.execute(
        """UPDATE divemeets.meets SET results_done=true, results_note=%s,
           results_crawled_at=now() WHERE meet_id=%s""", (note, meet_id))
    return len(events), n_rows, note

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()
    meets_done = 0
    meets_failed = 0
    while fetches < FETCH_BUDGET:
        if ONLY_MEET:
            if meets_done:
                break
            meet_id, name = int(ONLY_MEET), f"(explicit {ONLY_MEET})"
        else:
            cur.execute(
                """SELECT meet_id, meet_name FROM divemeets.meets
                   WHERE sanction=%s AND NOT results_done
                     AND http_status=200 AND meet_name IS NOT NULL
                     AND coalesce(results_attempts,0) < %s::int
                     AND coalesce(end_date, start_date) IS NOT NULL
                     AND coalesce(end_date, start_date)
                         <= current_date - %s::int
                   ORDER BY start_date DESC, meet_id DESC LIMIT 1""",
                (SANCTION, MAX_ATTEMPTS, QUIET_DAYS))
            r = cur.fetchone()
            if not r:
                log(f"queue empty for sanction={SANCTION!r} — all caught up")
                break
            meet_id, name = r
        try:
            n_ev, n_rows, note = crawl_meet(cur, meet_id)
            conn.commit()
            meets_done += 1
            log(f"meet {meet_id} {name!r}: {n_ev} event-rounds, "
                f"{n_rows} result rows{' [' + note + ']' if note else ''}")
        except Exception as e:
            # Isolate the failure to this meet. Re-raising here used to abort the
            # whole run, and because the queue is ordered newest-first the same
            # meet came back to the head every time -- one bad meet silently
            # stalled the entire sanction's crawl indefinitely.
            conn.rollback()
            meets_failed += 1
            msg = f"{type(e).__name__}: {e}"[:400]
            log(f"meet {meet_id} {name!r}: FAILED -- {msg}")
            try:
                cur.execute(
                    """UPDATE divemeets.meets
                          SET results_attempts = coalesce(results_attempts,0) + 1,
                              results_note = %s,
                              results_crawled_at = now()
                        WHERE meet_id = %s""",
                    (msg, meet_id))
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            if ONLY_MEET:
                raise
    log(f"run done: {meets_done} meets, {meets_failed} failed, {fetches} fetches")
    if meets_failed:
        cur.execute(
            """SELECT count(*) FROM divemeets.meets
                WHERE sanction=%s AND NOT results_done
                  AND coalesce(results_attempts,0) >= %s::int""",
            (SANCTION, MAX_ATTEMPTS))
        log(f"parked (>= {MAX_ATTEMPTS} failed attempts) for "
            f"sanction={SANCTION!r}: {cur.fetchone()[0]} meets")
    cur.close(); conn.close()

def report(ok, err=None):
    try:
        conn = psycopg2.connect(DB_URL); cur = conn.cursor()
        cur.execute(
            """INSERT INTO app_meta.config (key, value, description)
               VALUES ('dm_results_last_run', %s, 'dm_results.py')
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
