#!/usr/bin/env python3
"""
Fetch entry-deadline info from new.divemeets.com MeetInfo pages for every
DiveMeets meet id referenced by Season Calendar events, and upsert into
season_calendar.meet_deadlines for the Season Calendar Planner to read.

Captured per meet (meet-level fields on the MeetInfo page):
  - "Online Signup Closes at"   -> deadlines.signupCloses {raw, date, time}
  - "Late Fee goes into effect" -> deadlines.lateFee      {raw, date, time}
  - "Fee per Event"             -> deadlines.feePerEvent  (raw string)
  - meet name + raw date-range line (lets the app flag year mismatches,
    e.g. a calendar event pointing at last season's meet id)

If a value is present but carries no parseable date (e.g. "See Event
Schedule below for signup closing times."), the raw text is stored with
date=null — the app shows it as informational and never invents a date.

Env:
  DATABASE_URL  (required) Neon connection string
  MEET_IDS      (optional) comma-separated DiveMeets meet ids; when empty,
                ids are collected from every event with a dmId in
                season_calendar.calendar documents.

Used by .github/workflows/divemeets-deadlines.yml (weekly cron + dispatch).
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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

MONTHS = {m: i + 1 for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"])}


def db():
    import psycopg2
    return psycopg2.connect(DB_URL)


def collect_meet_ids(conn):
    env_ids = [x.strip() for x in os.environ.get("MEET_IDS", "").split(",") if x.strip()]
    if env_ids:
        ids = env_ids
    else:
        cur = conn.cursor()
        cur.execute("SELECT data FROM season_calendar.calendar")
        ids = []
        for (data,) in cur.fetchall():
            doc = data if isinstance(data, dict) else json.loads(data)
            for e in doc.get("events", []):
                dm = str(e.get("dmId") or "").strip()
                if dm:
                    ids.append(dm)
        cur.close()
    # numeric ids only, deduped, stable order
    out, seen = [], set()
    for i in ids:
        if re.fullmatch(r"\d{1,8}", i) and i not in seen:
            seen.add(i)
            out.append(i)
    return out


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", "replace")


def field(html, label):
    """MeetInfo layout: bold label div, compressed duplicate, then the first
    'text-start fullsize' div after the label holds the value."""
    m = re.search(re.escape(label) + r':?\s*</div>.*?text-start fullsize"\s*>\s*(.*?)\s*</div>',
                  html, re.S)
    if not m:
        return None
    v = re.sub(r"<[^>]+>", "", m.group(1))
    return re.sub(r"\s+", " ", v).strip() or None


def parse_dt(raw):
    if not raw:
        return None, None
    m = re.search(r"([A-Z][a-z]+) (\d{1,2}),? (\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?", raw)
    if not m or m.group(1) not in MONTHS:
        return None, None
    date = f"{int(m.group(3)):04d}-{MONTHS[m.group(1)]:02d}-{int(m.group(2)):02d}"
    tm = None
    if m.group(4):
        h = int(m.group(4)) % 12 + (12 if m.group(6) == "PM" else 0)
        tm = f"{h:02d}:{m.group(5)}"
    return date, tm


def meet_header(html):
    """Name + raw date-range line: after tag-stripping, the info block reads
    'Meet Info' / <name> / <venue> / '<Month D YYYY - Month D YYYY>'."""
    lines = [l.strip() for l in re.sub(r"<[^>]+>", "\n", html).split("\n") if l.strip()]
    for i, l in enumerate(lines):
        if l == "Meet Info" and i + 3 < len(lines):
            rng = None
            for j in range(i + 1, min(i + 5, len(lines))):
                if re.search(r"[A-Z][a-z]+ \d{1,2},? \d{4}\s*[-–]", lines[j]):
                    rng = lines[j]
                    break
            if rng:
                return lines[i + 1], rng
    return None, None


def dt_field(html, label):
    raw = field(html, label)
    d, t = parse_dt(raw)
    return {"raw": raw, "date": d, "time": t} if raw else None


def main():
    conn = db()
    ids = collect_meet_ids(conn)
    print(f"Meet ids to check: {ids or '(none)'}")
    if not ids:
        conn.close()
        return

    cur = conn.cursor()
    ok = failed = 0
    for i, mid in enumerate(ids):
        if i:
            time.sleep(3)  # polite pacing
        url = f"https://new.divemeets.com/MeetInfo/{mid}"
        name = dates = None
        try:
            html = fetch(url)
            name, dates = meet_header(html)
            deadlines = {
                "signupCloses": dt_field(html, "Online Signup Closes at"),
                "lateFee": dt_field(html, "Late Fee goes into effect"),
                "feePerEvent": field(html, "Fee per Event"),
            }
            deadlines = {k: v for k, v in deadlines.items() if v}
            ok += 1
            print(f"  {mid}: {name!r} | {json.dumps(deadlines)[:160]}")
        except Exception as exc:  # store the failure so the app can show it
            deadlines = {"error": f"{type(exc).__name__}: {exc}"}
            failed += 1
            print(f"  {mid}: FAILED — {deadlines['error']}", file=sys.stderr)
        cur.execute(
            """INSERT INTO season_calendar.meet_deadlines
                 (dm_id, meet_name, meet_dates, deadlines, fetched_at)
               VALUES (%s, %s, %s, %s, now())
               ON CONFLICT (dm_id) DO UPDATE SET
                 meet_name  = EXCLUDED.meet_name,
                 meet_dates = EXCLUDED.meet_dates,
                 deadlines  = EXCLUDED.deadlines,
                 fetched_at = now()""",
            (mid, name, dates, json.dumps(deadlines)))
        conn.commit()
    cur.close()
    conn.close()
    print(f"Done: {ok} ok, {failed} failed at {datetime.now(timezone.utc).isoformat()}")
    if ok == 0 and failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
