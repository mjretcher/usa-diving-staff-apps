#!/usr/bin/env python3
"""READ-ONLY: when did junior dive counts change, and for which groups?
The corridor pools an athlete's best score across all years; if the required
number of dives changed, those totals are not comparable."""
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
def show(t,sql,h):
    print("\n"+"="*94); print(t); print("="*94)
    cur.execute(sql); rows=cur.fetchall()
    if not rows: print("  (none)"); return
    w=[max(len(str(x)),max((len(str(r[i])) for r in rows),default=0)) for i,x in enumerate(h)]
    print("  "+"  ".join(str(x).ljust(w[i]) for i,x in enumerate(h)))
    print("  "+"  ".join("-"*w[i] for i in range(len(h))))
    for r in rows: print("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))

show("Modal dives per list by age group / gender / year (springboard, Nationals finals)",
 """WITH lists AS (
      SELECT meet_year, gender, discipline,
             CASE WHEN event_name ILIKE '%group a%' THEN 'A'
                  WHEN event_name ILIKE '%group b%' THEN 'B'
                  WHEN event_name ILIKE '%group c%' THEN 'C'
                  WHEN event_name ILIKE '%group d%' THEN 'D' END AS grp,
             result_set_id, diver_id, COUNT(*) AS n_dives
      FROM core.dive_sheets
      WHERE discipline IN ('1m','3m') AND round_stage='Final'
        AND dive_bucket='dive' AND event_name ILIKE '%group%'
      GROUP BY 1,2,3,4,5,6)
    SELECT grp, gender, meet_year,
           MODE() WITHIN GROUP (ORDER BY n_dives) AS modal_dives,
           COUNT(*) AS lists
    FROM lists WHERE grp IS NOT NULL AND meet_year BETWEEN 2021 AND 2026
    GROUP BY 1,2,3 HAVING COUNT(*) >= 10 ORDER BY 1,2,3""",
 ["group","gender","year","modal_dives","lists"])
cur.close(); conn.close()
