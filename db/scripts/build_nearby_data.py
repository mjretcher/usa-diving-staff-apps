"""Data for the standalone Nearby page (boundary-studio/nearby.html).

Counts only -- no names, no member ids leave this script.

Output boundary-studio/nearby-data.json:
  years[YYYY].zips   zip -> [lat, lon, members, athletes, competition_athletes, coaches]
                     (unique members; one home ZIP per member per year)
  years[YYYY].clubs  [name, lat, lon, rule, located_members, coaches_on_roster, uncertain]
  years[YYYY].unplaced  members whose ZIP is missing or not a US ZIP
Output boundary-studio/nearby-places.json: every US ZIP [zip, lat, lon, city, state]
for the search box.

Club placement (Mike, 2026-10-05): a club with a coach sits at a coach's home ZIP --
the coach who lives closest to the middle of the club's members when there are
several. A club with no coach sits at the member who lives closest to the middle.
A club with no coach and fewer than 3 members with a usable ZIP is flagged
"location uncertain". Every club row also carries how many members and coaches
it was placed from, so the page can say "placed from 1 coach's home ZIP".

Definitions (match the 2026-10-05 answer to Mike):
  athlete             = any membership type containing "Athlete"
  competition athlete = type starting "Competition Athlete"
  coach               = any membership type containing "Coach"
  plain "Lifetime" is not counted as an athlete (the type doesn't say).

Env: DATABASE_URL (workflow), or NEON_CONNECTION_STRING for an HTTP read in a session.
Workflow: build-nearby-data.yml."""
import os, sys, json, math, datetime
from collections import defaultdict, Counter
import zipcodes

ZIPCODES_VERSION = "3.0.0"
YEARS = (2025, 2026)
UNCERTAIN_BELOW = 3

SQL = """select membership_year, member_id::text, membership_type, nullif(club,''), left(zip5,5)
           from membership.members where membership_year = any(%s)"""
SQL_LOADED = "select membership_year, max(loaded_at)::text from membership.members where membership_year = any(%s) group by 1"


def fetch(sql, years):
    if os.environ.get("DATABASE_URL"):
        import psycopg2
        conn = psycopg2.connect(os.environ["DATABASE_URL"]); cur = conn.cursor()
        cur.execute(sql, (list(years),)); rows = cur.fetchall(); conn.close()
        return [list(r) for r in rows]
    cs = os.environ.get("NEON_CONNECTION_STRING")
    if not cs:
        sys.exit("DATABASE_URL or NEON_CONNECTION_STRING required")
    import urllib.request
    host = cs.split("@")[1].split("/")[0].replace("-pooler", "")
    body = json.dumps({"query": sql.replace("%s", "$1"), "params": ["{" + ",".join(map(str, years)) + "}"]}).encode()
    req = urllib.request.Request(f"https://{host}/sql", data=body, headers={
        "Neon-Connection-String": cs, "Neon-Raw-Text-Output": "false",
        "Neon-Array-Mode": "true", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=120).read(), strict=False)["rows"]


def miles(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(h))


ALL = [z for z in zipcodes.list_all() if z.get("lat") and z.get("long")]
Z = {z["zip_code"]: (round(float(z["lat"]), 4), round(float(z["long"]), 4)) for z in ALL}

rows = fetch(SQL, YEARS)
loaded = {int(y): t for y, t in fetch(SQL_LOADED, YEARS)}

out = {"built": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
       "source": "membership.members (roster imports), counts only",
       "zip_locations": f"US ZIP centre points from the zipcodes Python package {ZIPCODES_VERSION}",
       "distance": "straight-line miles (great-circle), site to member home ZIP centre",
       "club_rule": "Club placed at a coach's home ZIP (the coach closest to the middle of the club's members); "
                    "no coach: the member closest to the middle. No coach and fewer than 3 members with a usable ZIP = location uncertain.",
       "years": {}}

for yr in YEARS:
    yrows = [r for r in rows if int(r[0]) == yr]
    per = {}  # member -> {zip, ath, comp, coach}
    club_members = defaultdict(set); club_coaches = defaultdict(set)
    for _, mid, mt, club, z in yrows:
        mt = mt or ""
        p = per.setdefault(mid, {"zip": z, "ath": False, "comp": False, "coach": False})
        if not p["zip"] and z: p["zip"] = z
        if "Athlete" in mt: p["ath"] = True
        if mt.startswith("Competition Athlete"): p["comp"] = True
        if "Coach" in mt: p["coach"] = True
        if club:
            club_members[club].add(mid)
            if "Coach" in mt: club_coaches[club].add(mid)
    zips = defaultdict(lambda: [0, 0, 0, 0]); unplaced = Counter()
    for mid, p in per.items():
        if p["zip"] in Z:
            c = zips[p["zip"]]; c[0] += 1; c[1] += p["ath"]; c[2] += p["comp"]; c[3] += p["coach"]
        else:
            unplaced["members"] += 1; unplaced["athletes"] += p["ath"]; unplaced["coaches"] += p["coach"]
    clubs = []; unplaced_clubs = []
    for club in sorted(set(club_members) | set(club_coaches)):
        pts = [Z[per[m]["zip"]] for m in club_members[club] if per[m]["zip"] in Z]
        if not pts:
            unplaced_clubs.append(club); continue
        mid_pt = (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
        cpts = sorted({per[m]["zip"] for m in club_coaches[club] if per[m]["zip"] in Z})
        if cpts:
            z = min(cpts, key=lambda zz: (miles(Z[zz], mid_pt), zz)); rule = "coach"
        else:
            mzips = sorted({per[m]["zip"] for m in club_members[club] if per[m]["zip"] in Z})
            z = min(mzips, key=lambda zz: (miles(Z[zz], mid_pt), zz)); rule = "member"
        clubs.append([club, Z[z][0], Z[z][1], rule, len(pts), len(club_coaches[club]), rule == "member" and len(pts) < UNCERTAIN_BELOW])
    out["years"][str(yr)] = {
        "roster_loaded": loaded.get(yr),
        "members_total": len(per),
        "zips": {z: [Z[z][0], Z[z][1], *v] for z, v in sorted(zips.items())},
        "clubs": clubs,
        "unplaced": dict(unplaced, clubs=unplaced_clubs),
    }
    print(f"{yr}: {len(per)} members, {sum(v[0] for v in zips.values())} placed, "
          f"{unplaced['members']} unplaced; {len(clubs)} clubs placed "
          f"({sum(1 for c in clubs if c[6])} uncertain), {len(unplaced_clubs)} clubs unplaced")

os.makedirs("boundary-studio", exist_ok=True)
with open("boundary-studio/nearby-data.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))
places = sorted([z["zip_code"], round(float(z["lat"]), 3), round(float(z["long"]), 3), z["city"], z["state"]] for z in ALL)
with open("boundary-studio/nearby-places.json", "w") as f:
    json.dump({"source": out["zip_locations"], "places": places}, f, separators=(",", ":"))
