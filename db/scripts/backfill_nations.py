#!/usr/bin/env python3
"""Resolve team_name -> IOC nation_code across core.dive_sheets. Idempotent."""
import os, sys, psycopg2, psycopg2.extras
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nations import resolve, canonical_name

conn = psycopg2.connect(os.environ["DATABASE_URL"]); conn.autocommit = False
cur = conn.cursor()
def log(m): print(m, flush=True)

# Only international families carry nations; USA Diving team_name is a club.
cur.execute("""SELECT team_name, COUNT(*) n, COUNT(DISTINCT diver_id) d,
                      MIN(meet_year), MAX(meet_year)
               FROM core.dive_sheets
               WHERE competition_family = 'World Aquatics'
                 AND team_name IS NOT NULL AND team_name <> ''
               GROUP BY 1""")
rows = cur.fetchall()
log(f"{len(rows)} distinct team_name values on World Aquatics rows")

mapping, unresolved, agg = [], [], {}
for name, n, d, y0, y1 in rows:
    code, reason = resolve(name)
    if code:
        mapping.append((name, code))
        a = agg.setdefault(code, {"n": 0, "d": 0, "y0": y0, "y1": y1})
        a["n"] += n; a["d"] += d
        a["y0"] = min(a["y0"], y0); a["y1"] = max(a["y1"], y1)
    else:
        unresolved.append((name, reason, n, d))

log(f"  resolved {len(mapping)} -> {len(agg)} distinct nations")
log(f"  unresolved {len(unresolved)}: " + ", ".join(f"{u[0]}({u[2]})" for u in unresolved))

psycopg2.extras.execute_values(cur, """
    UPDATE core.dive_sheets ds SET nation_code = v.code
    FROM (VALUES %s) AS v(team, code)
    WHERE ds.competition_family = 'World Aquatics'
      AND ds.team_name = v.team
      AND ds.nation_code IS DISTINCT FROM v.code""", mapping)
log(f"  dive_sheets updated: {cur.rowcount} rows")

psycopg2.extras.execute_values(cur, """
    INSERT INTO core.nations (ioc_code, nation_name, dives, divers, first_year, last_year)
    VALUES %s ON CONFLICT (ioc_code) DO UPDATE SET
      nation_name=EXCLUDED.nation_name, dives=EXCLUDED.dives, divers=EXCLUDED.divers,
      first_year=EXCLUDED.first_year, last_year=EXCLUDED.last_year""",
    [(c, canonical_name(c), a["n"], a["d"], a["y0"], a["y1"]) for c, a in agg.items()])

cur.execute("DELETE FROM core.nation_unresolved")
if unresolved:
    psycopg2.extras.execute_values(cur,
        "INSERT INTO core.nation_unresolved (team_name, reason, dives, divers) VALUES %s",
        unresolved)
conn.commit()

log("\nNations after normalization:")
cur.execute("""SELECT ioc_code, nation_name, dives, divers FROM core.nations
               ORDER BY dives DESC LIMIT 20""")
for c, nm, dv, dr in cur.fetchall():
    log(f"  {c}  {nm:26} {dv:>6,} dives  {dr:>4} divers")
cur.execute("SELECT COUNT(*) FROM core.nations"); log(f"  ... {cur.fetchone()[0]} nations total")
log("\nStill unresolved (for review):")
cur.execute("SELECT team_name, reason, dives FROM core.nation_unresolved ORDER BY dives DESC")
for t, r, n in cur.fetchall(): log(f"  {t:14} {n:>5} dives — {r}")
cur.close(); conn.close()
