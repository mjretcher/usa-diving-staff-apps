#!/usr/bin/env python3
"""
Fetch live entry counts for a DiveMeets meet and upsert them into
junior_results.meet_entries in Neon.

Source of truth: https://new.divemeets.com/MeetInfo/{meet_id}
Each Prelim/Quarterfinal event row on that page links its entry count to
/DiveSheets/{meet_id}/{event_id}/1 — one page fetch covers every event.
Finals rows carry no counts (the field isn't set yet) and are skipped, as
are Synchro events (excluded from individual-entry planning by policy).

Parsing strategy: anchor on each DiveSheets link in the RAW html (dedup by
event id), then de-tag the preceding window and match the event name in
plain text — the site interleaves <br/> and spans inside names, so any
regex that runs against raw html for the name is one markup tweak away
from silently matching nothing.

Diagnostics: success or failure, a summary is upserted into
app_meta.config under key 'divemeets_sync_last_run' so the outcome is
inspectable straight from Neon (Actions log downloads are not always
reachable). On failure the table junior_results.meet_entries is NOT touched.

Run by .github/workflows/divemeets-entries.yml (manual dispatch + daily cron).
Env: DATABASE_URL (Neon), MEET_ID (default 12923).
"""
import json
import os
import re
import sys
import urllib.request
import urllib.error

MEET_ID = os.environ.get("MEET_ID", "12923").strip()
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")

URL = f"https://new.divemeets.com/MeetInfo/{MEET_ID}"
APPARATUS = {"1m": "1-Meter", "3m": "3-Meter", "platform": "Platform"}

def write_diag(payload):
    """Best-effort diagnostic upsert into app_meta.config (never raises)."""
    try:
        import psycopg2
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO app_meta.config (key, value, description)
               VALUES ('divemeets_sync_last_run', %s, 'Last DiveMeets entries sync outcome')
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
            (json.dumps(payload)[:8000],))
        conn.commit(); cur.close(); conn.close()
    except Exception as e:
        print(f"  (diagnostic write failed: {e})", file=sys.stderr)

def fetch(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 USA-Diving-Staff-Apps/1.0",
        "Accept": "text/html,application/xhtml+xml",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")

DETAG = re.compile(r'<[^>]+>')
NAME_RX = re.compile(
    r'Group\s+([A-D])(/[A-D])?\s*(Synchro[\w.]*)?\s*(Boys|Girls)?\s*'
    r'(1m|3m|Platform)\b[^()]*\(([^)]*)\)\s*\((Prelim/Quarterfinal|Semifinal|Final)\)',
    re.I)

def parse(html):
    """Return (rows, diag) for every individual Prelim event carrying an entries link."""
    rows, seen = [], set()
    link_rx = re.compile(r'DiveSheets/%s/(\d+)/1' % re.escape(MEET_ID))
    links = list(link_rx.finditer(html))
    unparsed = []
    for m in links:
        event_id = m.group(1)
        if event_id in seen:
            continue  # page repeats each link (count + "N entries") — dedupe
        seen.add(event_id)
        # De-tag the preceding window; the LAST event name in it is this row's.
        window = DETAG.sub(' ', html[max(0, m.start() - 2500):m.start()])
        window = window.replace('&amp;', '&')
        names = list(NAME_RX.finditer(window))
        if not names:
            unparsed.append(event_id)
            continue
        n = names[-1]
        grp, combo, synchro, gender, app, bracket, round_raw = n.groups()
        if synchro or combo:
            continue  # synchro / combined-group events excluded
        if not gender:
            unparsed.append(event_id)
            continue
        # Count: visible text right after the anchor open tag, e.g. >8< or >8 entries<
        after = html[m.end():m.end() + 250]
        cnt_m = re.search(r'>\s*(\d+)\s*(?:entries)?\s*<', after)
        entries = int(cnt_m.group(1)) if cnt_m else 0
        rows.append({
            "event_id_dm": event_id,
            "event_name": f"Group {grp.upper()} {gender.title()} {app} ({bracket.strip()}) ({round_raw})",
            "age_group": f"Group {grp.upper()}",
            "gender": gender.title(),
            "discipline": APPARATUS[app.lower()],
            "round": "Prelim" if round_raw == "Prelim/Quarterfinal" else round_raw,
            "entries": entries,
        })
    diag = {"meet_id": MEET_ID, "links_found": len(links),
            "distinct_events": len(seen), "rows_parsed": len(rows),
            "unparsed_event_ids": unparsed[:10]}
    return rows, diag

def main():
    print(f"Fetching {URL}")
    try:
        html = fetch(URL)
    except urllib.error.HTTPError as e:
        write_diag({"ok": False, "stage": "fetch", "http_status": e.code, "meet_id": MEET_ID})
        sys.exit(f"HTTP {e.code} fetching MeetInfo page")
    except Exception as e:
        write_diag({"ok": False, "stage": "fetch", "error": str(e)[:400], "meet_id": MEET_ID})
        sys.exit(f"Fetch failed: {e}")

    rows, diag = parse(html)
    if not rows:
        diag.update({"ok": False, "stage": "parse", "html_len": len(html),
                     "sample": DETAG.sub(' ', html[:1200])[:600]})
        write_diag(diag)
        sys.exit("No event rows parsed — DiveMeets page structure may have changed. NOT touching the table.")

    print(f"Parsed {len(rows)} individual prelim events:")
    for r in rows:
        print(f"  {r['age_group']} {r['gender']} {r['discipline']} ({r['round']}): {r['entries']} entries [ev {r['event_id_dm']}]")

    import psycopg2
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
    diag.update({"ok": True, "total_entries": sum(r["entries"] for r in rows)})
    write_diag(diag)
    print(f"Upserted {len(rows)} rows into junior_results.meet_entries (meet {MEET_ID}).")

if __name__ == "__main__":
    main()
