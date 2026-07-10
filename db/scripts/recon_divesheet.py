#!/usr/bin/env python3
"""
Reconnaissance: fetch ONE DiveSheets entrant-list page and store a raw HTML
sample into app_meta.config so the entrant-name parser can be written against
real page structure (the dev sandbox cannot reach divemeets.com; the Actions
runner can). Read-only against DiveMeets; writes only the sample key.

Env: DATABASE_URL, MEET_ID (default 12923), EVENT_ID (default 30475 = C Girls 1m).
Stores: key 'divemeets_divesheet_sample' with {url, fetched_at, length, html (first ~60KB)}.
"""
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

MEET_ID = os.environ.get("MEET_ID", "12923").strip()
EVENT_ID = os.environ.get("EVENT_ID", "30475").strip()
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")

url = f"https://new.divemeets.com/DiveSheets/{MEET_ID}/{EVENT_ID}/1"
req = urllib.request.Request(url, headers={
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 USA-Diving-Staff-Apps/1.0",
    "Accept": "text/html,application/xhtml+xml",
})
with urllib.request.urlopen(req, timeout=60) as resp:
    html = resp.read().decode("utf-8", "replace")

payload = {
    "url": url,
    "fetched_at": datetime.now(timezone.utc).isoformat(),
    "length": len(html),
    "html": html[:60000],
}

import psycopg2
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()
cur.execute(
    """INSERT INTO app_meta.config (key, value, description)
       VALUES ('divemeets_divesheet_sample', %s, 'Raw DiveSheets page sample for parser design')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
    (json.dumps(payload),))
conn.commit(); cur.close(); conn.close()
print(f"Stored sample: {len(html)} bytes from {url}")
