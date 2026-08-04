#!/usr/bin/env python3
"""READ-ONLY: are posted_score values on one comparable scale? The career
trajectory chart plots them on a single axis against a world-medal line."""
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
def show(t,sql,h):
    print("\n"+"="*90); print(t); print("="*90)
    cur.execute(sql); rows=cur.fetchall()
    if not rows: print("  (none)"); return
    w=[max(len(str(x)),max((len(str(r[i])) for r in rows),default=0)) for i,x in enumerate(h)]
    print("  "+"  ".join(str(x).ljust(w[i]) for i,x in enumerate(h)))
    print("  "+"  ".join("-"*w[i] for i in range(len(h))))
    for r in rows: print("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))
show("posted_score range by competition family and round (3m only)",
 """SELECT competition_family, round_stage, COUNT(*) n,
           ROUND(MIN(posted_score)::numeric,1) lo,
           ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY posted_score))::numeric,1) med,
           ROUND(MAX(posted_score)::numeric,1) hi
    FROM core.result_phases
    WHERE discipline='3m' AND posted_score IS NOT NULL
    GROUP BY 1,2 HAVING COUNT(*)>30 ORDER BY med DESC LIMIT 18""",
 ["family","round","n","min","median","max"])
show("What are the 900+ scores? (3m)",
 """SELECT competition_family, round_stage, event_name, COUNT(*) n,
           ROUND(AVG(posted_score)::numeric,1) avg_score
    FROM core.result_phases
    WHERE discipline='3m' AND posted_score >= 900
    GROUP BY 1,2,3 ORDER BY n DESC LIMIT 12""",
 ["family","round","event","n","avg"])
cur.close(); conn.close()
