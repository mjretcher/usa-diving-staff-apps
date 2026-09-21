#!/usr/bin/env python3
"""
ONE-OFF DIAGNOSTIC -- not part of the regular pipeline, not scheduled.

Explores a Zoho Analytics open view discovered 2026-09-21 on
scoresandmore.live/aau-national-qualifiers/, embedded as:
  https://analytics.zoho.com/open-view/2617098000005092932
    ?ZOHO_CRITERIA="q_qualifying_sheets"."governing_body"='AAU'

This is a DIFFERENT table (q_qualifying_sheets) than anything sm_zoho.py's
VIEWS dict already knows about (q_meets, q_meet_event_results, q_event_result).
A per-SHEET governing_body field, if it holds up, would be a real sanctioning
signal -- not the name-text guessing meet_classification.py currently does --
and might be the authoritative source for "did this diver have an official
qualifying score on file," which is exactly the question the qualifying-score
check tried to reconstruct from raw results.

This script only reads and reports; it writes nothing to Neon. Output goes to
db/scratch/qualifying_sheets_explore.json so it can be inspected from outside
CI (the sandbox that wrote this script has no network path to analytics.zoho.com
or scoresandmore.live -- confirmed via direct test, 403 at the egress proxy --
so this diagnostic has to run here and report back via a committed file).
"""
import json
import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sm_zoho import ZohoOpenView, BASE, UA


def broad_capture(view_id, key, criteria="", wait_seconds=25):
    """Round 3: don't assume the response is SHOWREPORT/ZAChartView -- log
    EVERY response Zoho makes while the page loads, so a pivot/summary view
    (or whatever this actually is) can't hide from us just because it uses
    an endpoint name sm_zoho.py's existing client doesn't know about yet."""
    from playwright.sync_api import sync_playwright
    import urllib.parse

    path = f"/open-view/{view_id}"
    if key:
        path += f"/{key}"
    url = f"{BASE}{path}"
    if criteria:
        url += f"?ZOHO_CRITERIA={urllib.parse.quote(criteria, safe='')}"

    seen = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(user_agent=UA)
        page = ctx.new_page()

        def on_response(resp):
            try:
                req = resp.request
                entry = {
                    "url": resp.url,
                    "method": req.method,
                    "status": resp.status,
                    "resource_type": req.resource_type,
                    "content_type": resp.headers.get("content-type", ""),
                }
                # Only Zoho's own calls are interesting; skip fonts/images/analytics beacons.
                if "zoho.com" in resp.url and req.resource_type in ("xhr", "fetch", "document"):
                    entry["post_data"] = (req.post_data or "")[:1500]
                    try:
                        body = resp.text()
                        entry["body_preview"] = body[:3000]
                        entry["body_length"] = len(body)
                    except Exception as e:
                        entry["body_error"] = str(e)
                    seen.append(entry)
            except Exception as e:
                seen.append({"listener_error": str(e)})

        page.on("response", on_response)
        nav_error = None
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(wait_seconds * 1000)
        except Exception as e:
            nav_error = str(e)

        screenshot_path = "db/scratch/qualifying_sheets_screenshot.png"
        try:
            page.screenshot(path=screenshot_path, full_page=True)
        except Exception:
            screenshot_path = None

        page.close(); browser.close()

    return {"url": url, "nav_error": nav_error, "responses": seen,
            "screenshot": screenshot_path}

# Round 2 (2026-09-21): the AAU qualifiers page actually embeds TWO Zoho
# links, and round 1 only tried the bare one (view 2617098000005092932, no
# key) -- which is very likely just a raw table-criteria reference, not a
# published dashboard, hence no SHOWREPORT/ZAChartView ever fired for it.
# The FIRST link on that page has an actual privatelink key -- the same
# shape every other already-working view in sm_zoho.py's VIEWS dict has.
# Confirmed by checking the parallel NCAA Qualifiers page, which embeds the
# identical two-link pattern (2617098000009032337/89a70815... + a bare
# governing_body-filtered one) -- so this is the site's general convention,
# not something AAU-specific.
VIEW_ID = "2617098000011468016"
KEY = "795c275b109657a3d7be9f20338a01d3"

report = {"view_id": VIEW_ID, "key": KEY, "attempts": [], "broad_capture": None}


def attempt(label, criteria):
    entry = {"label": label, "criteria": criteria}
    try:
        v = ZohoOpenView(VIEW_ID, KEY)
        cols = v.columns(criteria)
        entry["columns"] = list(cols.values())
        try:
            rows, header = v.rows(criteria)
            entry["row_count"] = len(rows)
            entry["header"] = header
            entry["sample_rows"] = rows[:5]
            if rows:
                # Surface distinct values of anything that looks like a
                # governing-body / sanctioning column, if present -- the
                # whole point of this exploration.
                for col in header:
                    if any(k in col.lower() for k in ("govern", "sanction", "body", "org")):
                        vals = sorted(set(r.get(col) for r in rows if r.get(col) is not None))
                        entry.setdefault("distinct_values_of_interest", {})[col] = vals[:30]
        except RuntimeError as e:
            # Grid cap / pagination errors are themselves informative --
            # they mean the view is real and has more data than one page.
            entry["rows_error"] = str(e)
        v.close()
    except Exception as e:
        entry["error"] = f"{type(e).__name__}: {e}"
        entry["traceback"] = traceback.format_exc()
    report["attempts"].append(entry)


# Round 3: skip the narrow columns()/rows() attempt (round 2 already showed
# it fetches column metadata fine -- gender, dive_user_id, age_group -- but
# never sees a recognized report response). Go straight to logging every
# single network response Zoho makes, so whatever endpoint this pivot/
# summary view actually calls can't hide from a name filter that doesn't
# know about it yet.
os.makedirs("db/scratch", exist_ok=True)
report["broad_capture"] = broad_capture(VIEW_ID, KEY, criteria="", wait_seconds=25)
with open("db/scratch/qualifying_sheets_explore.json", "w") as f:
    json.dump(report, f, indent=2, default=str)

print(json.dumps(report, indent=2, default=str)[:8000])
print("\nWrote db/scratch/qualifying_sheets_explore.json")
