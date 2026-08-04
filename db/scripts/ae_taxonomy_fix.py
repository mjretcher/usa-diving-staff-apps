#!/usr/bin/env python3
"""Diagnose leftovers and (re)seed core.dive_skills with errors surfaced."""
import os, sys, psycopg2, psycopg2.extras
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dive_taxonomy import classify

conn = psycopg2.connect(os.environ["DATABASE_URL"]); conn.autocommit = False
cur = conn.cursor()
def log(m): print(m, flush=True)

def show(t, sql, h, params=None):
    log("\n" + "="*76); log(t); log("="*76)
    cur.execute(sql, params or [])
    rows = cur.fetchall()
    if not rows: log("  (none)"); return rows
    w=[max(len(str(x)),max((len(str(r[i])) for r in rows),default=0)) for i,x in enumerate(h)]
    log("  "+"  ".join(str(x).ljust(w[i]) for i,x in enumerate(h)))
    log("  "+"  ".join("-"*w[i] for i in range(len(h))))
    for r in rows: log("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))
    return rows

show("A. UNCLASSIFIED codes — what are they?",
 """SELECT dive_number, COUNT(*) n, MODE() WITHIN GROUP (ORDER BY description) descr,
          MODE() WITHIN GROUP (ORDER BY discipline) disc,
          COUNT(*) FILTER (WHERE score IS NOT NULL AND dd>0) scored
    FROM core.dive_sheets WHERE dive_bucket='unclassified'
    GROUP BY 1 ORDER BY n DESC LIMIT 25""",
 ["code","n","description","disc","scored"])

show("B. Top SKILL codes — sanity check the reclassification",
 """SELECT dive_code_norm, COUNT(*) n, MODE() WITHIN GROUP (ORDER BY description) descr,
          ROUND(AVG(dd)::numeric,2) avg_dd
    FROM core.dive_sheets WHERE dive_bucket='skill'
      AND discipline IN ('1m','3m','Platform')
    GROUP BY 1 ORDER BY n DESC LIMIT 20""",
 ["code","n","description","avg_dd"])

log("\n(Re)seeding core.dive_skills…")
SKILL_NAMES = {
 "001":("Forward entry (lineup)","Art. 302.2(a)(3) / 401.4",False),
 "002":("Back entry (lineup)","Art. 302.2(a)(3) / 401.4",False),
 "003":("Entry (lineup, unlisted variant)","not in rulebook",False),
 "100":("Forward jump","Art. 401.4",False),
 "200":("Back jump","Art. 401.4",False),
 "600":("Armstand (unlisted variant of 620)","not in rulebook",True),
 "620":("Armstand lineup","Art. 503.15(d)",True),
 "5101":("Forward jump 1/2 twist","Art. 401.4",False),
 "5102":("Forward jump 1 twist","Art. 401.4",False),
 "5104":("Forward jump 2 twists","Art. 401.4",False),
 "5201":("Back jump 1/2 twist","Art. 401.4",False),
 "5203":("Back jump 1 1/2 twists","Art. 401.4",False),
 "5205":("Back jump 2 1/2 twists","Art. 401.4",False),
 "5301":("Reverse jump 1/2 twist","Art. 503.15(d)",False),
 "5303":("Reverse jump 1 1/2 twists","Art. 503.15(d)",False),
}
cur.execute("""SELECT dive_code_norm, COUNT(*) FROM core.dive_sheets
               WHERE dive_bucket='skill' AND dive_code_norm IS NOT NULL
               GROUP BY 1""")
seen = cur.fetchall()
log(f"  {len(seen)} distinct skill codes in data")
POS={"A":"Straight","B":"Pike","C":"Tuck","D":"Free"}
rows=[]
for code, n in seen:
    stem = code[:-1] if code and code[-1] in POS else code
    name, cite, plat = SKILL_NAMES.get(stem, ("Skill (unlisted variant)","not in rulebook",False))
    pos = POS.get(code[-1]) if code else None
    rows.append((code, stem, code[-1] if pos else None,
                 f"{name}{' — '+pos if pos else ''}", cite, plat, f"{n} rows in data"))
try:
    psycopg2.extras.execute_values(cur, """
      INSERT INTO core.dive_skills (code,stem,position_code,skill_name,rulebook_cite,platform_only,notes)
      VALUES %s ON CONFLICT (code) DO UPDATE SET
        skill_name=EXCLUDED.skill_name, rulebook_cite=EXCLUDED.rulebook_cite,
        platform_only=EXCLUDED.platform_only, notes=EXCLUDED.notes""", rows)
    conn.commit()
    log(f"  inserted/updated {len(rows)} skill codes")
except Exception as e:
    conn.rollback(); log(f"  INSERT FAILED: {type(e).__name__}: {e}")

show("C. Skills catalog after seeding (top 25 by data volume)",
 """SELECT s.code, s.skill_name, s.rulebook_cite, s.notes
    FROM core.dive_skills s ORDER BY s.stem, s.code LIMIT 25""",
 ["code","skill_name","cite","notes"])
cur.execute("SELECT COUNT(*) FROM core.dive_skills"); log(f"\n  total catalog rows: {cur.fetchone()[0]}")
cur.close(); conn.close()
