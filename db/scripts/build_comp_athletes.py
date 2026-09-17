"""Competition Athlete members per county, by AQUA age group and gender.

Output: membership-analytics/comp-athletes-data.json
  {"meta": {...}, "counties": {fips: {"y26": [ D_boys, D_girls, D_unknown,
                                                C_boys, C_girls, C_unknown,
                                                B_..., A_..., 19+_... ]}}}
  15 integers per county: 5 age groups x (boys, girls, gender not known).

Rules (same as age-data.json / boundary-data.json so the numbers line up):
  * Competition Athlete (17U) + Competition Athlete (AQUA Age 18+), one count per member.
  * Age group = AQUA age on Dec 31 of the membership year (year - birth year):
    D <=11, C 12-13, B 14-15, A 16-18, 19+.
  * Gender comes from membership.member_gender (name-matched to results;
    Webpoint has no gender field). Members without a match are counted as
    "gender not known" -- never estimated.
  * zip5 -> county uses boundary-data.json stats[fips].z, the same list the map
    uses; a zip it does not cover is left out, exactly as for member totals.
  * 2026 only: Webpoint rewrites renewing members' earlier-year rows with their
    current type, so earlier-year counts by exact type are not reliable.
County-level counts only; no zip- or member-level data is written.

Env: DATABASE_URL (owner connection, used by the workflow), or NEON_HTTP_CONN
(a read connection string, queried over Neon's HTTP API) for a local run.
Workflow: build-comp-athletes.yml.
"""
import json, os, sys, urllib.request
from collections import defaultdict

YEARS = [2026]
TYPES = ("Competition Athlete (17U)", "Competition Athlete (AQUA Age 18+)")
SQL = """
select m.membership_year, left(m.zip5,5) as zip5,
       m.membership_year - extract(year from m.birth_date)::int as age,
       coalesce(g.gender, '') as gender,
       count(distinct m.member_id)::int as n
from membership.members m
left join membership.member_gender g on g.member_id = m.member_id
where m.membership_year = any(%(years)s)
  and m.membership_type in %(types)s
  and m.zip5 is not null and m.birth_date is not null
group by 1,2,3,4
"""


def query():
    db = os.environ.get("DATABASE_URL")
    if db:
        import psycopg2
        conn = psycopg2.connect(db)
        cur = conn.cursor()
        cur.execute(SQL, {"years": YEARS, "types": TYPES})
        rows = cur.fetchall()
        conn.close()
        return rows
    conn = os.environ.get("NEON_HTTP_CONN")
    if not conn:
        sys.exit("Set DATABASE_URL (or NEON_HTTP_CONN for a local read-only run).")
    host = conn.split("@", 1)[1].split("/", 1)[0].replace("-pooler", "")
    sql = SQL.replace("%(years)s", "$1::int[]").replace("%(types)s", "(" + ",".join(f"'{t}'" for t in TYPES) + ")")
    req = urllib.request.Request(
        f"https://{host}/sql",
        data=json.dumps({"query": sql, "params": ["{" + ",".join(map(str, YEARS)) + "}"]}).encode(),
        headers={"Neon-Connection-String": conn, "Neon-Array-Mode": "true", "Content-Type": "application/json"},
    )
    d = json.loads(urllib.request.urlopen(req, timeout=120).read())
    return [(int(a), b, int(c), d_, int(e)) for a, b, c, d_, e in d["rows"]]


def bucket(age):
    return 0 if age <= 11 else 1 if age <= 13 else 2 if age <= 15 else 3 if age <= 18 else 4


def main():
    here = os.path.join(os.path.dirname(__file__), "..", "..", "membership-analytics")
    geo = json.load(open(os.path.join(here, "boundary-data.json")))
    z2c = {}
    for fips, st in geo["stats"].items():
        for z in (st.get("z") or {}):
            z2c[z] = fips
    out = defaultdict(lambda: defaultdict(lambda: [0] * 15))
    placed = defaultdict(int)
    missed = defaultdict(int)
    for yr, zip5, age, gender, n in query():
        f = z2c.get(zip5)
        if not f:
            missed[yr] += n
            continue
        g = 0 if gender == "Boys" else 1 if gender == "Girls" else 2
        out[f]["y" + str(yr)[2:]][bucket(age) * 3 + g] += n
        placed[yr] += n
    totals = {}
    for yr in YEARS:
        y = "y" + str(yr)[2:]
        v = [sum(c[y][i] for c in out.values() if y in c) for i in range(15)]
        totals[y] = {"placed": placed[yr], "not_mappable": missed[yr],
                     "boys": sum(v[0::3]), "girls": sum(v[1::3]), "gender_not_known": sum(v[2::3])}
    doc = {
        "meta": {
            "builder": "db/scripts/build_comp_athletes.py",
            "what": "Competition Athlete members (17U + AQUA Age 18+) per county",
            "layout": "15 per county-year: age groups D, C, B, A, 19+; each boys, girls, gender not known",
            "age_rule": "AQUA age on Dec 31 of the membership year",
            "gender_rule": "membership.member_gender name match; unmatched = gender not known (not estimated)",
            "totals": totals,
        },
        "counties": {f: dict(v) for f, v in sorted(out.items())},
    }
    open(os.path.join(here, "comp-athletes-data.json"), "w").write(json.dumps(doc, separators=(",", ":")))
    print(json.dumps(totals))


if __name__ == "__main__":
    main()
