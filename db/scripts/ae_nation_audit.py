#!/usr/bin/env python3
"""READ-ONLY: full team/nation vocabulary, to size the normalization table."""
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
def show(t,sql,h,lim=None):
    print("\n"+"="*88); print(t); print("="*88)
    cur.execute(sql); rows=cur.fetchall()
    if not rows: print("  (none)"); return
    w=[max(len(str(x)),max((len(str(r[i])) for r in rows),default=0)) for i,x in enumerate(h)]
    print("  "+"  ".join(str(x).ljust(w[i]) for i,x in enumerate(h)))
    print("  "+"  ".join("-"*w[i] for i in range(len(h))))
    for r in rows: print("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))

show("Distinct team_name on World Aquatics rows (the nation-code population)",
 """SELECT team_name, COUNT(*) dives, COUNT(DISTINCT diver_id) divers,
           LENGTH(team_name) len, MIN(meet_year) y0, MAX(meet_year) y1
    FROM core.dive_sheets WHERE competition_family='World Aquatics'
      AND team_name IS NOT NULL AND team_name<>''
    GROUP BY 1 ORDER BY dives DESC""",
 ["team_name","dives","divers","len","y0","y1"])

show("How many distinct team_name values exist overall (all families)?",
 """SELECT competition_family, COUNT(DISTINCT team_name) distinct_teams, COUNT(*) dives
    FROM core.dive_sheets GROUP BY 1 ORDER BY dives DESC""",
 ["family","distinct_teams","dives"])

show("Suspicious short codes on WA rows (possible non-IOC)",
 """SELECT team_name, COUNT(*) dives, COUNT(DISTINCT diver_id) divers,
           STRING_AGG(DISTINCT LEFT(diver_name,26), ' | ' ORDER BY LEFT(diver_name,26)) sample
    FROM core.dive_sheets
    WHERE competition_family='World Aquatics' AND LENGTH(team_name)=3
      AND team_name NOT IN ('USA','CHN','AUS','MEX','CAN','GBR','ITA','GER','UKR','JPN',
                            'ESP','KOR','FRA','PRK','NZL','COL','CUB','BRA','SGP','MAS',
                            'POL','SWE','DOM','IND','UZB','RSA','SUI','AUT','NED','HUN',
                            'CZE','SVK','ROU','GRE','TUR','EGY','ISR','THA','PHI','VIE',
                            'INA','HKG','TPE','ARG','CHI','PER','ECU','VEN','PUR','JAM')
    GROUP BY 1 ORDER BY dives DESC LIMIT 25""",
 ["team_name","dives","divers","sample_athletes"])
cur.close(); conn.close()
