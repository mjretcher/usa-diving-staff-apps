#!/usr/bin/env python3
"""READ-ONLY: what values scope result_phases?"""
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
for col in ["event_level","competition_group","age_group","competition_family"]:
    cur.execute(f"""SELECT COALESCE({col},'(null)'), COUNT(*) FROM core.result_phases
                    GROUP BY 1 ORDER BY 2 DESC LIMIT 8""")
    print(f"\n{col}:")
    for v,n in cur.fetchall(): print(f"   {str(v)[:40]:42} {n:>8,}")
cur.close(); conn.close()
