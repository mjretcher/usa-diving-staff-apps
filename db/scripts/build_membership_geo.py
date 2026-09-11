"""Per-area membership breakdown for the Boundary Studio membership-geography report.
For each county: members / athletes / coaches / distinct clubs, and a count per
membership type, for 2025 and 2026. Aggregated by the report against whatever map
is loaded. Owner connection (member rows), aggregates only out.
Env: DATABASE_URL. Workflow: build-membership-geo.yml."""
import os, json, sys, psycopg2
from collections import defaultdict
DB=os.environ.get("DATABASE_URL")
if not DB: sys.exit("DATABASE_URL not set")
ATHLETE=('Athlete (17U)','Athlete (AQUA Age 18+)','Competition Athlete (17U)','Competition Athlete (AQUA Age 18+)','Introductory Athlete 17U','Introductory Athlete AQUA Age 18+','Lifetime')
COACH=('Competition Coach','Coach','Lifetime Coach')
conn=psycopg2.connect(DB); cur=conn.cursor()
cur.execute("""select membership_year, left(zip5,5), membership_type, club, count(*)::int
  from membership.members where membership_year in (2025,2026) and zip5 is not null group by 1,2,3,4""")
byzip=defaultdict(lambda: defaultdict(lambda: {"types":defaultdict(int),"clubs":set()}))
for yr,zip5,mt,club,n in cur.fetchall():
    d=byzip[str(yr)][zip5]; d["types"][mt]+=n
    if club: d["clubs"].add(club)
out={"years":{}, "types_athlete":list(ATHLETE), "types_coach":list(COACH)}
for yr,zips in byzip.items():
    out["years"][yr]={z:{"types":dict(v["types"]),"clubs":sorted(v["clubs"])} for z,v in zips.items()}
os.makedirs("membership-analytics",exist_ok=True)
open("membership-analytics/membership-geo.json","w").write(json.dumps(out,separators=(",",":")))
tot=sum(sum(v["types"].values()) for v in byzip["2026"].values())
print(f"2026 members placed by zip: {tot}; zips 2026: {len(byzip['2026'])}")
conn.close()
