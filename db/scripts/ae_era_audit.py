#!/usr/bin/env python3
"""READ-ONLY. First: is result_set_id globally unique, or does it collide
across meets? The previous audit grouped without meet_id and produced dive
counts exactly 2x the rulebook, which smells like a key collision rather than
a rule change."""
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
def show(t,sql,h):
    print("\n"+"="*96); print(t); print("="*96)
    cur.execute(sql); rows=cur.fetchall()
    if not rows: print("  (none)"); return
    w=[max(len(str(x)),max((len(str(r[i])) for r in rows),default=0)) for i,x in enumerate(h)]
    print("  "+"  ".join(str(x).ljust(w[i]) for i,x in enumerate(h)))
    print("  "+"  ".join("-"*w[i] for i in range(len(h))))
    for r in rows: print("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))

show("A. Does one result_set_id span multiple meets?",
 """SELECT n_meets, COUNT(*) AS result_sets FROM (
      SELECT result_set_id, COUNT(DISTINCT meet_id) AS n_meets
      FROM core.dive_sheets GROUP BY 1) x
    GROUP BY 1 ORDER BY 1""",
 ["meets_per_result_set","result_sets"])

show("B. Does one result_set_id span multiple events?",
 """SELECT n_events, COUNT(*) AS result_sets FROM (
      SELECT result_set_id, COUNT(DISTINCT event_id) AS n_events
      FROM core.dive_sheets GROUP BY 1) x
    GROUP BY 1 ORDER BY 1""",
 ["events_per_result_set","result_sets"])

show("C. Dives per list keyed properly (meet + event + result_set + diver)",
 """WITH lists AS (
      SELECT meet_year, gender,
             CASE WHEN event_name ILIKE '%group a%' THEN 'A'
                  WHEN event_name ILIKE '%group b%' THEN 'B'
                  WHEN event_name ILIKE '%group c%' THEN 'C'
                  WHEN event_name ILIKE '%group d%' THEN 'D' END AS grp,
             meet_id, event_id, result_set_id, diver_id, COUNT(*) AS n_dives
      FROM core.dive_sheets
      WHERE discipline IN ('1m','3m') AND round_stage='Final'
        AND dive_bucket='dive' AND event_name ILIKE '%group%'
      GROUP BY 1,2,3,4,5,6,7)
    SELECT grp, gender, meet_year,
           MODE() WITHIN GROUP (ORDER BY n_dives) AS modal_dives, COUNT(*) AS lists
    FROM lists WHERE grp IS NOT NULL AND meet_year BETWEEN 2021 AND 2026
    GROUP BY 1,2,3 HAVING COUNT(*) >= 10 ORDER BY 1,2,3""",
 ["group","gender","year","modal_dives","lists"])
cur.close(); conn.close()
