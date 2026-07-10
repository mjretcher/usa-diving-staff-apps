#!/usr/bin/env python3
"""
Reconnaissance: fetch ONE DiveSheets entrant-list page and store a raw HTML
sample into app_meta.config so the entrant-name parser can be written against
real page structure. Self-diagnosing: on ANY failure, the error (HTTP status,
first bytes of body) is written to the same key so the outcome is readable
from Neon — Actions log downloads are not reachable from the dev sandbox.

Env: DATABASE_URL, MEET_ID (default 12923), EVENT_ID (default 30475).
Key: 'divemeets_divesheet_sample'.
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

MEET_ID = os.environ.get("MEET_ID", "12923").strip()
EVENT_ID = os.environ.get("EVENT_ID", "30475").strip()
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")

def store(payload):
    import psycopg2
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO app_meta.config (key, value, description)
           VALUES ('divemeets_divesheet_sample', %s, 'Raw DiveSheets page sample for parser design')
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
        (json.dumps(payload),))
    conn.commit(); cur.close(); conn.close()

url = f"https://new.divemeets.com/DiveSheets/{MEET_ID}/{EVENT_ID}/1"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": f"https://new.divemeets.com/MeetInfo/{MEET_ID}",
}
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        html = resp.read().decode("utf-8", "replace")
    store({"ok": True, "url": url, "fetched_at": datetime.now(timezone.utc).isoformat(),
           "length": len(html), "html": html[:60000]})
    print(f"Stored sample: {len(html)} bytes")
except urllib.error.HTTPError as e:
    body = ""
    try: body = e.read().decode("utf-8", "replace")[:2000]
    except Exception: pass
    store({"ok": False, "url": url, "fetched_at": datetime.now(timezone.utc).isoformat(),
           "error": f"HTTP {e.code} {e.reason}", "body_head": body,
           "resp_headers": dict(e.headers or {})})
    sys.exit(f"HTTP {e.code} — diagnostic stored")
except Exception as e:
    store({"ok": False, "url": url, "fetched_at": datetime.now(timezone.utc).isoformat(),
           "error": repr(e)[:500]})
    sys.exit(f"{e!r} — diagnostic stored")
