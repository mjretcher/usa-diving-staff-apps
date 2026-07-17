#!/usr/bin/env python3
"""
ScoresAndMore/Zoho Analytics recon via headless Chromium (Playwright).

Loads a URL, records every XHR/fetch request+response the page makes while the
Zoho Analytics grid renders, and also captures the final rendered grid text.
Stores everything as JSON in app_meta.config under RECON_KEY so the page's real
data API can be reverse-engineered from the dev sandbox via Neon SQL.

Env: DATABASE_URL, RECON_URL, RECON_KEY, RECON_WAIT_MS (optional, default 12000)
Used via .github/workflows/scoresandmore-recon.yml (workflow_dispatch).
"""
import json
import os
import sys
from datetime import datetime, timezone

URL = os.environ.get("RECON_URL", "").strip()
KEY = os.environ.get("RECON_KEY", "sm_recon_pw").strip()
WAIT_MS = int(os.environ.get("RECON_WAIT_MS", "12000"))
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    sys.exit("DATABASE_URL not set")
if not URL:
    sys.exit("RECON_URL not set")

MAX_BODY = 60000   # per-response body cap
MAX_TOTAL = 900000 # total payload cap (app_meta.config is text; stay sane)


def store(payload):
    import psycopg2
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO app_meta.config (key, value, description)
           VALUES (%s, %s, 'ScoresAndMore Playwright recon (sm_recon_playwright.py)')
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
        (KEY, json.dumps(payload)))
    conn.commit(); cur.close(); conn.close()


def main():
    from playwright.sync_api import sync_playwright
    captured = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/126.0.0.0 Safari/537.36"))
        page = ctx.new_page()

        def on_response(resp):
            try:
                req = resp.request
                if req.resource_type not in ("xhr", "fetch", "document"):
                    return
                entry = {
                    "req_url": req.url[:1000],
                    "method": req.method,
                    "status": resp.status,
                    "resource_type": req.resource_type,
                    "content_type": (resp.headers or {}).get("content-type", "")[:200],
                }
                post = req.post_data
                if post:
                    entry["post_data"] = post[:5000]
                ct = entry["content_type"]
                if any(k in ct for k in ("json", "text", "csv", "javascript", "xml")):
                    try:
                        entry["body"] = resp.text()[:MAX_BODY]
                        entry["body_len"] = len(resp.text())
                    except Exception as e:
                        entry["body_err"] = repr(e)[:200]
                captured.append(entry)
            except Exception as e:
                captured.append({"capture_err": repr(e)[:300]})

        page.on("response", on_response)
        page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(WAIT_MS)

        # Grab rendered visible text of the grid, if any
        try:
            rendered = page.evaluate("() => document.body.innerText")[:40000]
        except Exception as e:
            rendered = f"render_err: {e!r}"
        try:
            frames = []
            for f in page.frames:
                if f != page.main_frame:
                    try:
                        frames.append({"url": f.url[:500],
                                       "text": f.evaluate("() => document.body.innerText")[:40000]})
                    except Exception:
                        pass
        except Exception:
            frames = []
        browser.close()

    # Trim total size: keep entries but truncate biggest bodies if needed
    payload = {"ok": True, "url": URL,
               "fetched_at": datetime.now(timezone.utc).isoformat(),
               "rendered_text": rendered, "frames": frames,
               "responses": captured}
    s = json.dumps(payload)
    while len(s) > MAX_TOTAL and captured:
        # drop bodies from largest entries first
        biggest = max(captured, key=lambda e: len(e.get("body", "")))
        if not biggest.get("body"):
            captured.pop()  # nothing left to trim; drop entries
        else:
            biggest["body"] = biggest["body"][:5000] + "...TRUNCATED"
        s = json.dumps(payload)
    store(payload)
    print(f"Stored {len(captured)} responses under '{KEY}' ({len(s)} bytes)")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        store({"ok": False, "url": URL,
               "fetched_at": datetime.now(timezone.utc).isoformat(),
               "error": repr(e)[:2000]})
        sys.exit(f"{e!r} — diagnostic stored under '{KEY}'")
