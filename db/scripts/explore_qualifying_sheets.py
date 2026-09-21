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
from sm_zoho import ZohoOpenView

VIEW_ID = "2617098000005092932"
KEY = None   # the discovered URL has no privatelink path segment

report = {"view_id": VIEW_ID, "attempts": []}


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


# 1) Exactly the criteria found embedded on the live page.
attempt("aau_filter", "\"q_qualifying_sheets\".\"governing_body\"='AAU'")

# 2) No filter at all -- just to see the full column set and (likely) hit
#    the safety cap, which still tells us the table is real and populated.
attempt("no_filter", "")

# 3) A couple of plausible other governing_body values, in case the column
#    is confirmed to exist and this cheaply maps out what it distinguishes.
for gb in ("USAD", "USA Diving", "NCAA", "NFHS", "AQUA"):
    attempt(f"filter_{gb}", f"\"q_qualifying_sheets\".\"governing_body\"='{gb}'")

os.makedirs("db/scratch", exist_ok=True)
with open("db/scratch/qualifying_sheets_explore.json", "w") as f:
    json.dump(report, f, indent=2, default=str)

print(json.dumps(report, indent=2, default=str)[:8000])
print("\nWrote db/scratch/qualifying_sheets_explore.json")
