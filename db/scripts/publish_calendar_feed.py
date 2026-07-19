#!/usr/bin/env python3
"""
Publish the Season Calendar Planner as a live, subscribable ICS feed.

Reads the cloud calendar (season_calendar.calendar, doc id 'main') from Neon
and writes data/feeds/season-calendar.ics — every event across every year,
plus every dated deadline (registration open/close, standalone deadline, and
milestones) as its own all-day entry. Staff subscribe once in Outlook
("Add calendar -> Subscribe from web") and the feed stays current.

Events hidden from the internal view (internal=false) are excluded.
DTSTAMP is pinned to the cloud row's updated_at so the file is byte-stable
when nothing has changed (the workflow only commits real changes).

Env: DATABASE_URL (required).
Used by .github/workflows/calendar-feed.yml.
"""
import json
import os
import re
import sys

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")

OUT = "data/feeds/season-calendar.ics"


def ics_esc(s):
    return (str(s or "").replace("\\", "\\\\").replace(";", "\\;")
            .replace(",", "\\,").replace("\r\n", "\\n").replace("\n", "\\n"))


def plus_one(d):
    from datetime import date, timedelta
    y, m, dd = map(int, d.split("-"))
    return (date(y, m, dd) + timedelta(days=1)).strftime("%Y%m%d")


def ladder(e):
    items = []
    if e.get("regOpen"):
        items.append((e["regOpen"], "Registration opens"))
    if e.get("regClose"):
        items.append((e["regClose"], "Registration closes"))
    if e.get("deadlineDate"):
        items.append((e["deadlineDate"], e.get("deadlineLabel") or "Deadline"))
    for m in e.get("milestones") or []:
        if isinstance(m, dict) and m.get("date"):
            items.append((m["date"], m.get("label") or "Deadline"))
    return [(d, l) for d, l in items if re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(d))]


def main():
    import psycopg2
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("SELECT data, updated_at FROM season_calendar.calendar WHERE id='main'")
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        sys.exit("No cloud calendar found (season_calendar.calendar id='main')")

    doc = row[0] if isinstance(row[0], dict) else json.loads(row[0])
    stamp = row[1].strftime("%Y%m%dT%H%M%SZ")
    events = [e for e in doc.get("events", []) if e.get("internal") is not False]
    events.sort(key=lambda e: (str(e.get("year", "")), str(e.get("start", "")), str(e.get("id", ""))))

    out = ["BEGIN:VCALENDAR", "VERSION:2.0",
           "PRODID:-//USA Diving//Season Calendar Feed//EN",
           "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
           "X-WR-CALNAME:USA Diving Season Calendar",
           "X-PUBLISHED-TTL:PT1H", "REFRESH-INTERVAL;VALUE=DURATION:PT1H"]
    n_ev = n_dl = 0
    for e in events:
        start, end = str(e.get("start", "")), str(e.get("end") or e.get("start", ""))
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", start):
            continue
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", end):
            end = start
        loc = ", ".join(x for x in [e.get("facility"), e.get("city"),
                                    e.get("state"), e.get("country")] if x)
        status = e.get("status", "")
        ics_status = ("CANCELLED" if status == "Cancelled"
                      else "CONFIRMED" if status in ("Confirmed", "Completed")
                      else "TENTATIVE")
        out += ["BEGIN:VEVENT",
                f"UID:{e.get('id')}@usadiving-season-calendar",
                f"DTSTAMP:{stamp}",
                f"DTSTART;VALUE=DATE:{start.replace('-', '')}",
                f"DTEND;VALUE=DATE:{plus_one(end)}",
                f"SUMMARY:{ics_esc(e.get('name'))}"]
        if loc:
            out.append(f"LOCATION:{ics_esc(loc)}")
        desc = " · ".join(x for x in [e.get("category"), status, e.get("notes")] if x)
        out += [f"DESCRIPTION:{ics_esc(desc)}",
                f"CATEGORIES:{ics_esc(e.get('category'))}",
                f"STATUS:{ics_status}", "TRANSP:TRANSPARENT", "END:VEVENT"]
        n_ev += 1
        for d, label in ladder(e):
            slug = re.sub(r"[^a-z0-9]+", "-", label.lower())
            out += ["BEGIN:VEVENT",
                    f"UID:{e.get('id')}-{d}-{slug}@usadiving-season-calendar",
                    f"DTSTAMP:{stamp}",
                    f"DTSTART;VALUE=DATE:{d.replace('-', '')}",
                    f"DTEND;VALUE=DATE:{plus_one(d)}",
                    f"SUMMARY:{ics_esc(label + ' — ' + str(e.get('name', '')))}",
                    "CATEGORIES:Deadline", "STATUS:CONFIRMED",
                    "TRANSP:TRANSPARENT", "END:VEVENT"]
            n_dl += 1
    out.append("END:VCALENDAR")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", newline="") as f:
        f.write("\r\n".join(out) + "\r\n")
    print(f"Wrote {OUT}: {n_ev} events, {n_dl} deadlines")


if __name__ == "__main__":
    main()
