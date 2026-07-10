#!/usr/bin/env python3
"""
Fetch live entry counts for a DiveMeets meet and upsert them into
junior_results.meet_entries in Neon.

Source of truth: https://new.divemeets.com/MeetInfo/{meet_id}
Each Prelim/Quarterfinal event row on that page links its entry count to
/DiveSheets/{meet_id}/{event_id}/1 — one page fetch covers every event.
Finals rows carry no counts (the field isn't set yet) and are skipped, as
are Synchro events (excluded from individual-entry planning by policy).

Event-name normalization matches the Schedule Builder taxonomy exactly:
  "Group B Boys 1m (14-15) (Prelim/Quarterfinal)"
    -> level="Group B", gender="Boys", discipline="1-Meter", round="Prelim"

Run by .github/workflows/divemeets-entries.yml (manual dispatch + daily cron).
Env: DATABASE_URL (Neon), MEET_ID (default 12923).
"""
import os
import re
import sys
import urllib.request

MEET_ID = os.environ.get("MEET_ID", "12923").strip()
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")

URL = f"https://new.divemeets.com/MeetInfo/{MEET_ID}"

APPARATUS = {"1m": "1-Meter", "3m": "3-Meter", "platform": "Platform"}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "USA-Diving-Staff-Apps/1.0 (schedule sync)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")

def parse(html):
    """Yield dicts for every individual Prelim event row carrying an entries link."""
    rows = []
    # Every entry-count link points at /DiveSheets/{meet}/{event}/1. Grab each link
    # plus a window of preceding HTML to find the event name in the same table row.
    for m in re.finditer(r'DiveSheets/%s/(\d+)/1' % re.escape(MEET_ID), html):
        event_id = m.group(1)
        if any(r_["event_id_dm"] == event_id for r_ in rows):
            continue  # page repeats each link (count + "N entries") — dedupe
        window = html[max(0, m.start() - 1500):m.start()]
        # Last "Group ... (Prelim/Quarterfinal)" mention before the link is this row's event
        names = re.findall(
            r'(Group\s+[A-D](?:/[A-D])?\s*(?:Synchro(?:nized)?\.?\s*)?\s*(?:Boys|Girls)?[^<>()]*?\((?:11 & Under|1[2-8]-1[3-8]|11 &amp; Under)\)[^<>()]*?\((Prelim/Quarterfinal|Semifinal|Final)\)',
            window)
        if not names:
            continue
        full, round_raw = names[-1]
        if "Synchro" in full:
            continue  # synchro excluded from individual entry counts
        level_m = re.search(r'Group\s+([A-D])\b', full)
        gender_m = re.search(r'\b(Boys|Girls)\b', full)
        app_m = re.search(r'\b(1m|3m|Platform)\b', full, re.I)
        if not (level_m and gender_m and app_m):
            print(f"  !! could not normalize event name: {full!r} — skipped", file=sys.stderr)
            continue
        # Count: the visible text right after the link opening tag, e.g. >8< or >8 entries<
        after = html[m.end():m.end() + 200]
        cnt_m = re.search(r'>\s*(\d+)\s*(?:entries)?\s*<', after)
        entries = int(cnt_m.group(1)) if cnt_m else 0
        rows.append({
            "event_id_dm": event_id,
            "event_name": re.sub(r'\s+', ' ', full).strip() + f" ({round_raw})",
            "age_group": f"Group {level_m.group(1)}",
            "gender": gender_m.group(1),
            "discipline": APPARATUS[app_m.group(1).lower()],
            "round": "Prelim" if round_raw == "Prelim/Quarterfinal" else round_raw,
            "entries": entries,
        })
    return rows

def main():
    print(f"Fetching {URL}")
    html = fetch(URL)
    rows = parse(html)
    if not rows:
        sys.exit("No event rows parsed — DiveMeets page structure may have changed. NOT touching the table.")
    print(f"Parsed {len(rows)} individual prelim events:")
    for r in rows:
        print(f"  {r['age_group']} {r['gender']} {r['discipline']} ({r['round']}): {r['entries']} entries [ev {r['event_id_dm']}]")

    import psycopg2  # installed by the workflow
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    for r in rows:
        cur.execute(
            """INSERT INTO junior_results.meet_entries
                 (meet_id_dm,event_id_dm,event_name,age_group,gender,discipline,round,entries,fetched_at)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,now())
               ON CONFLICT (meet_id_dm,event_id_dm) DO UPDATE SET
                 event_name=EXCLUDED.event_name, age_group=EXCLUDED.age_group,
                 gender=EXCLUDED.gender, discipline=EXCLUDED.discipline,
                 round=EXCLUDED.round, entries=EXCLUDED.entries, fetched_at=now()""",
            (MEET_ID, r["event_id_dm"], r["event_name"], r["age_group"],
             r["gender"], r["discipline"], r["round"], r["entries"]))
    conn.commit()
    cur.close(); conn.close()
    print(f"Upserted {len(rows)} rows into junior_results.meet_entries (meet {MEET_ID}).")

if __name__ == "__main__":
    main()
