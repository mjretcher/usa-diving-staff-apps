#!/usr/bin/env python3
"""READ-ONLY: where does the World Aquatics data actually come from?"""
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
def show(t,sql,h):
    print("\n"+"="*84); print(t); print("="*84)
    cur.execute(sql); rows=cur.fetchall()
    if not rows: print("  (none)"); return
    w=[max(len(str(x)),max((len(str(r[i])) for r in rows),default=0)) for i,x in enumerate(h)]
    print("  "+"  ".join(str(x).ljust(w[i]) for i,x in enumerate(h)))
    print("  "+"  ".join("-"*w[i] for i in range(len(h))))
    for r in rows: print("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))
show("World Aquatics meets currently in core.dive_sheets",
 """SELECT meet_id, meet_year, COUNT(DISTINCT event_id) events,
           COUNT(*) dives, COUNT(DISTINCT diver_id) divers,
           MIN(event_name) sample_event
    FROM core.dive_sheets WHERE competition_family='World Aquatics'
    GROUP BY 1,2 ORDER BY meet_year DESC, dives DESC""",
 ["meet_id","year","events","dives","divers","sample_event"])
show("Non-US nations represented anywhere in core.dive_sheets",
 """SELECT COALESCE(NULLIF(team_name,''),'(blank)') team, COUNT(*) dives,
           COUNT(DISTINCT diver_id) divers, MAX(meet_year) last_year
    FROM core.dive_sheets WHERE competition_family='World Aquatics'
    GROUP BY 1 ORDER BY dives DESC LIMIT 30""",
 ["team","dives","divers","last_year"])
show("What competition families exist at all?",
 """SELECT competition_family, COUNT(*) dives, MIN(meet_year) y0, MAX(meet_year) y1,
           COUNT(DISTINCT meet_id) meets
    FROM core.dive_sheets GROUP BY 1 ORDER BY dives DESC""",
 ["family","dives","y0","y1","meets"])
show("divemeets.meets catalog — anything international already known?",
 """SELECT COALESCE(sanction,'(none)') sanction, COUNT(*) meets,
           MIN(start_date) first, MAX(start_date) last
    FROM divemeets.meets GROUP BY 1 ORDER BY meets DESC LIMIT 15""",
 ["sanction","meets","first","last"])
cur.close(); conn.close()
