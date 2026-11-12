#!/usr/bin/env python3
"""
One-off data fix for the 2026 Winter Nationals schedule in Schedule Builder
(schedule_builder.schedules id = wtspo3t6), requested by Mike 2026-11-11:

  1. Venue name -> O'Shaughnessy Diving Center (the criteria documents' name;
     the schedule said City of Midland Aquatic Center).
  2. Remove wording left over from the Summer Nationals schedule this one was
     copied from ("USA Nationals ...", "National Qualifier entrants only", ...)
     from block notes and block labels.

Safe to re-run: it changes nothing once the wording is gone. Before writing it
stores the current copy in schedule_versions, and the UPDATE only lands if
nobody saved the schedule between the read and the write.

Env: DATABASE_URL. Prints a before/after summary (committed to db/audits).
"""
import json, os, re, sys
import psycopg2

SID = "wtspo3t6"
VENUE = "O’Shaughnessy Diving Center"
SUMMER = re.compile(r"USA Nationals|National Qualifier entrants|senior/qualifier|Senior open training", re.I)

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute("SELECT data, updated_at, name FROM schedule_builder.schedules WHERE id=%s", (SID,))
row = cur.fetchone()
if not row:
    print("schedule not found:", SID); sys.exit(1)
data, updated_at, name = row
if isinstance(data, str):
    data = json.loads(data)
print("schedule:", name, "| updated_at:", updated_at)
meet = data.get("meet", {})
print("meet.name:", meet.get("name")); print("meet.venue (before):", repr(meet.get("venue")), "| meet.city:", repr(meet.get("city")))
print("days:", [(d.get("id"), d.get("date")) for d in meet.get("days", [])])

changes = []
if meet.get("venue") != VENUE:
    changes.append(("meet.venue", meet.get("venue"), VENUE)); meet["venue"] = VENUE

for s in data.get("sessions", []):
    title = (s.get("title") or "").strip()
    for key in ("note", "notes"):
        v = s.get(key)
        if isinstance(v, str) and SUMMER.search(v):
            changes.append((f"session {s.get('id')} {key}", v, "")); s[key] = ""
    for ev in s.get("events", []):
        v = ev.get("notes")
        if isinstance(v, str) and SUMMER.search(v):
            changes.append((f"block '{title}' ({s.get('id')}) notes", v, "")); ev["notes"] = ""
        v = ev.get("customLabel")
        if isinstance(v, str) and SUMMER.search(v):
            new = title or "Open Training"
            changes.append((f"block '{title}' ({s.get('id')}) label", v, new)); ev["customLabel"] = new

# Anything else that still mentions summer wording, for a human to look at.
left = [m.group(0) for m in re.finditer(r'"[^"]*(?:USA Nationals|National Qualifier entrants)[^"]*"', json.dumps(data))]

print(f"\n{len(changes)} change(s):")
for what, old, new in changes:
    print(f"  {what}: {old!r} -> {new!r}")
print("still mentioning summer wording after the fix:", left or "nothing")

if not changes:
    print("\nNothing to change."); sys.exit(0)

cur.execute("INSERT INTO schedule_builder.schedule_versions(schedule_id,label,data,created_at) "
            "SELECT id, %s, data, now() FROM schedule_builder.schedules WHERE id=%s",
            ("Before venue and wording fix (11 Nov)", SID))
data["updatedAt"] = __import__("datetime").datetime.utcnow().isoformat(timespec="milliseconds") + "Z"
cur.execute("UPDATE schedule_builder.schedules SET data=%s::jsonb, updated_at=now() WHERE id=%s AND updated_at=%s RETURNING updated_at",
            (json.dumps(data), SID, updated_at))
r = cur.fetchone()
if not r:
    conn.rollback(); print("\nNOT WRITTEN: the schedule was saved by someone else during the fix. Re-run."); sys.exit(2)
conn.commit()
print("\nWritten. New updated_at:", r[0], "| previous copy kept in Version history.")
