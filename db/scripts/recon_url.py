#!/usr/bin/env python3
"""
Generic reconnaissance: fetch ANY new.divemeets.com URL and store a raw HTML
sample into app_meta.config so page structure can be inspected from the dev
sandbox (which cannot reach new.divemeets.com directly). Self-diagnosing: on
ANY failure, the error (HTTP status, first bytes of body) is written to the
same key so the outcome is readable from Neon.

Env: DATABASE_URL, RECON_URL (full URL to fetch), RECON_KEY (app_meta.config
key to store under), RECON_REFERER (optional).

Used ad hoc via .github/workflows/divemeets-recon.yml (workflow_dispatch).
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

URL = os.environ.get("RECON_URL", "").strip()
KEY = os.environ.get("RECON_KEY", "recon_sample").strip()
REFERER = os.environ.get("RECON_REFERER", "").strip() or None
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")
if not URL:
    sys.exit("RECON_URL not set")

def store(payload):
    import psycopg2
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO app_meta.config (key, value, description)
           VALUES (%s, %s, 'Generic recon HTML sample (recon_url.py)')
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
        (KEY, json.dumps(payload)))
    conn.commit(); cur.close(); conn.close()

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
if REFERER:
    headers["Referer"] = REFERER

try:
    req = urllib.request.Request(URL, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        html = resp.read().decode("utf-8", "replace")
    # Store in chunks if huge; app_meta.config value is JSON/text, keep it generous.
    store({"ok": True, "url": URL, "fetched_at": datetime.now(timezone.utc).isoformat(),
           "length": len(html), "html": html[:200000]})
    print(f"Stored sample under key '{KEY}': {len(html)} bytes")
except urllib.error.HTTPError as e:
    body = ""
    try: body = e.read().decode("utf-8", "replace")[:2000]
    except Exception: pass
    store({"ok": False, "url": URL, "fetched_at": datetime.now(timezone.utc).isoformat(),
           "error": f"HTTP {e.code} {e.reason}", "body_head": body,
           "resp_headers": dict(e.headers or {})})
    sys.exit(f"HTTP {e.code} — diagnostic stored under '{KEY}'")
except Exception as e:
    store({"ok": False, "url": URL, "fetched_at": datetime.now(timezone.utc).isoformat(),
           "error": repr(e)[:500]})
    sys.exit(f"{e!r} — diagnostic stored under '{KEY}'")
