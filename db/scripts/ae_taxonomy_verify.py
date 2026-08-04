#!/usr/bin/env python3
"""READ-ONLY verification of the taxonomy backfill."""
import os, sys, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
def show(t,sql,h):
    print("\n"+"="*76); print(t); print("="*76)
    cur.execute(sql); rows=cur.fetchall()
    if not rows: print("  (none)"); return
    w=[max(len(str(x)),max((len(str(r[i])) for r in rows),default=0)) for i,x in enumerate(h)]
    print("  "+"  ".join(str(x).ljust(w[i]) for i,x in enumerate(h)))
    print("  "+"  ".join("-"*w[i] for i in range(len(h))))
    for r in rows: print("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))
show("Dive groups (individual disciplines) — nothing uncategorised now",
 """SELECT dive_bucket, dive_group_code, dive_group_label, COUNT(*) n,
           COUNT(DISTINCT diver_id) divers,
           ROUND(AVG(LEAST(score/(3*dd),10))::numeric,3) avg_exec
    FROM core.dive_sheets
    WHERE discipline IN ('1m','3m','Platform')
    GROUP BY 1,2,3 ORDER BY 1, n DESC""",
 ["bucket","code","label","n","divers","avg_exec"])
show("Coverage check — any rows still unclassified?",
 """SELECT COALESCE(dive_bucket,'(null)') bucket, COUNT(*) n
    FROM core.dive_sheets GROUP BY 1 ORDER BY n DESC""",["bucket","n"])
show("Skills catalog",
 """SELECT code, skill_name, rulebook_cite FROM core.dive_skills ORDER BY stem, code""",
 ["code","skill_name","cite"])
cur.close(); conn.close()
