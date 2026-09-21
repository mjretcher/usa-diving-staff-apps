#!/usr/bin/env python3
"""
ONE-OFF DIAGNOSTIC, round 5 -- pulls the actual "AAU Qualifier Counts" pivot
(view 2617098000011468016, key 795c275b109657a3d7be9f20338a01d3) for 2024,
2025, 2026, via a direct request (no browser needed -- round 3/4's Playwright
capture found the real endpoint: POST ZDBTableDataAction.ma, ZDBACTION=
DATAVIEW, VIEWTYPE=Pivot, with a year filter baked into the POST body's XML
as <zavmfv cr='YYYY,' dcr='YYYY' .../>).

Writes a clean {year: {age_group: {female, male, total}}} table to
db/scratch/aau_qualifier_counts.json. Read-only, writes nothing to Neon.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sm_zoho import BASE, UA

VIEW_ID = "2617098000011468016"
KEY = "795c275b109657a3d7be9f20338a01d3"
PARENT_VIEW = "2617098000005092608"
YEAR_COLID = "2617098000007130362"


def fetch_year(session, year):
    body = (
        "<DBSVRequest>\n<zadata >\n"
        f"<dbobj dispname='AAU Qualifier Counts' desc='Number of divers who have earned a qualifying score' type='Pivot' >"
        f"<zaav gt='BEST' sgt='DEF' title='' merge='false' lp='AUTO' lt='' ltm='false' lf='true' cinfo='false' jt='1' >"
        f"<zavmfv cr='{year},' dcr='{year}' lbl='year' cno='{YEAR_COLID}' ex='false' isDashCr='false' ft='100' "
        f"po='{PARENT_VIEW}' op='CONTINUOUS' asscolid='-1' />\n"
        "<zavrfv currentSelValue='{}' currentChildSelValue='{}' />\n\n</zaav>\n<zataginfo >\n</zataginfo>\n\n</dbobj>\n\n</zadata>\n"
        "<DBSVParams PARENT_VIEW_TYPE='Pivot' ZAGRIDTYPE='PivotSheet' /></DBSVRequest>"
    )
    url = (f"{BASE}/ZDBTableDataAction.ma?ZDBACTION=DATAVIEW&CONFIGASXML=true&OBJTYPE=AnalysisGrid"
           f"&OBJID={VIEW_ID}&privatelink={KEY}&CHANGESLIDERBOUNDS=true&RESETSORT=true"
           f"&FIELDSCHANGED=false&EDITMODE=false&VIEWTYPE=Pivot&SUBREQUEST=XMLHTTP&_ZVER_=101")
    r = session.post(url, data=body.encode(),
                      headers={"Content-Type": "text/plain; charset=UTF-8",
                               "X-Requested-With": "XMLHttpRequest",
                               "Referer": f"{BASE}/open-view/{VIEW_ID}/{KEY}"},
                      timeout=90)
    r.raise_for_status()
    return r.json()


def parse_grid(data):
    dt = data.get("dataTextNew", {})
    out = {}
    for k, row in dt.items():
        if k in ("n", "v"):
            continue
        group = row["n"]["fv"]
        vals = row["v"]
        out[group] = {"female": int(vals[0]["fv"]), "male": int(vals[1]["fv"]), "total": int(vals[2]["fv"])}
    if "v" in dt:
        out["_grand_total"] = {"female": int(dt["v"][0]["fv"]), "male": int(dt["v"][1]["fv"]), "total": int(dt["v"][2]["fv"])}
    return out


import requests
session = requests.Session()
session.headers.update({"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
session.get(f"{BASE}/open-view/{VIEW_ID}/{KEY}", timeout=60).raise_for_status()

results = {}
errors = {}
for year in (2024, 2025, 2026):
    try:
        data = fetch_year(session, year)
        results[year] = parse_grid(data)
    except Exception as e:
        errors[year] = str(e)

os.makedirs("db/scratch", exist_ok=True)
with open("db/scratch/aau_qualifier_counts.json", "w") as f:
    json.dump({"results": results, "errors": errors}, f, indent=2)

print(json.dumps({"results": results, "errors": errors}, indent=2))
