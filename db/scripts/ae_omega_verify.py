#!/usr/bin/env python3
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
def show(t,sql,h):
    print("\n"+"="*82); print(t); print("="*82)
    cur.execute(sql); rows=cur.fetchall()
    if not rows: print("  (none)"); return
    w=[max(len(str(x)),max((len(str(r[i])) for r in rows),default=0)) for i,x in enumerate(h)]
    print("  "+"  ".join(str(x).ljust(w[i]) for i,x in enumerate(h)))
    print("  "+"  ".join("-"*w[i] for i in range(len(h))))
    for r in rows: print("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))
show("OMEGA rows now in core.dive_sheets",
 """SELECT meet_year, gender, discipline, round_stage, COUNT(*) dives,
           COUNT(DISTINCT diver_id) divers, COUNT(DISTINCT nation_code) nations
    FROM core.dive_sheets WHERE meet_id LIKE 'OM-%'
    GROUP BY 1,2,3,4 ORDER BY 1,2,3""",
 ["year","gender","disc","stage","dives","divers","nations"])
show("Nations represented (OMEGA only)",
 """SELECT nation_code, COUNT(*) dives, COUNT(DISTINCT diver_id) divers
    FROM core.dive_sheets WHERE meet_id LIKE 'OM-%' AND nation_code IS NOT NULL
    GROUP BY 1 ORDER BY dives DESC LIMIT 12""",
 ["nation","dives","divers"])
show("Taxonomy applied to the new international rows?",
 """SELECT COALESCE(dive_bucket,'(unclassified - needs backfill)') bucket, COUNT(*) n
    FROM core.dive_sheets WHERE meet_id LIKE 'OM-%' GROUP BY 1 ORDER BY n DESC""",
 ["bucket","n"])
cur.close(); conn.close()
