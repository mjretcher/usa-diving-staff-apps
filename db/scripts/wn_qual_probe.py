#!/usr/bin/env python3
"""Read-only check that the Schedule Builder senior projections queries run on the
live results tables. Per-event COUNTS only for the 2025 Winter Nationals and its
qualifier (mirrors srLoad() in schedule-builder/sb-format.js). Committed to db/audits."""
import os, psycopg2
conn = psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True); cur = conn.cursor()
P = (2025, 'USA Diving Winter Nationals', 'USA Diving Winter Nationals Qualifier')
cur.execute("""SELECT competition_group,gender,discipline,COALESCE(is_synchronized,false),round_stage,count(DISTINCT diver_id)
  FROM core.result_phases WHERE meet_year=%s AND competition_group IN (%s,%s) AND gender IN ('Female','Male') GROUP BY 1,2,3,4,5 ORDER BY 1,4,2,3,5""", P)
print("meet | gender | discipline | synchro | round | athletes")
for r in cur.fetchall(): print(" | ".join(str(v) for v in r))
cur.execute("""SELECT c.gender,c.discipline,count(DISTINCT c.diver_id)
  FROM core.result_phases c WHERE c.meet_year=%s AND c.competition_group=%s AND COALESCE(c.is_synchronized,false)=false AND c.gender IN ('Female','Male')
    AND EXISTS(SELECT 1 FROM core.result_phases q WHERE q.meet_year=c.meet_year AND q.competition_group=%s AND q.diver_id=c.diver_id AND q.gender=c.gender AND q.discipline=c.discipline AND COALESCE(q.is_synchronized,false)=false)
  GROUP BY 1,2 ORDER BY 1,2""", P)
print("\nin the championship event and also in the same qualifier event:")
for r in cur.fetchall(): print(" | ".join(str(v) for v in r))
cur.execute("SELECT gender, count(*) FROM core.result_phases WHERE meet_year=2025 AND competition_group IN (%s,%s) GROUP BY 1", P[1:]); print("\ngender values:", cur.fetchall())
