#!/usr/bin/env python3
"""READ-ONLY: confirm the rebuilt field tables back the Dive Groups view."""
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
def show(t,sql,h):
    print("\n"+"="*80); print(t); print("="*80)
    cur.execute(sql); rows=cur.fetchall()
    if not rows: print("  (none)"); return
    w=[max(len(str(x)),max((len(str(r[i])) for r in rows),default=0)) for i,x in enumerate(h)]
    print("  "+"  ".join(str(x).ljust(w[i]) for i,x in enumerate(h)))
    print("  "+"  ".join("-"*w[i] for i in range(len(h))))
    for r in rows: print("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))
show("Scope depth after rebuild (skills + artifacts now excluded)",
 """SELECT scope, SUM(n) dives, COUNT(DISTINCT category_code) groups,
           MIN(meet_year) y0, MAX(meet_year) y1
    FROM analytics.field_group_exec GROUP BY 1 ORDER BY dives DESC""",
 ["scope","dives","groups","y0","y1"])
show("US Junior girls 3m — the comparison baseline the view will use",
 """SELECT category_code, MAX(category_label) label, SUM(n) dives,
           ROUND((SUM(avg_exec*n)/NULLIF(SUM(n),0))::numeric,3) avg_exec
    FROM analytics.field_group_exec
    WHERE scope='us-junior' AND gender='Women' AND discipline='3m' AND meet_year>=2024
    GROUP BY 1 ORDER BY dives DESC""",
 ["code","label","dives","avg_exec"])
show("Voluntary vs optional (never surfaced before) — US Junior, 3m",
 """SELECT vo, SUM(n) dives, ROUND((SUM(avg_exec*n)/NULLIF(SUM(n),0))::numeric,3) avg_exec,
           ROUND((SUM(fail_rate*n)/NULLIF(SUM(n),0))::numeric,4) fail_rate,
           ROUND((SUM(avg_dd*n)/NULLIF(SUM(n),0))::numeric,3) avg_dd
    FROM analytics.field_group_exec_vo
    WHERE scope='us-junior' AND discipline='3m' AND meet_year>=2024
    GROUP BY 1 ORDER BY dives DESC""",
 ["vo","dives","avg_exec","fail_rate","avg_dd"])
cur.close(); conn.close()
