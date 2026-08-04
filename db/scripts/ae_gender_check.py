#!/usr/bin/env python3
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
cur.execute("""SELECT scope, gender, SUM(n) dives FROM analytics.field_group_exec
               GROUP BY 1,2 ORDER BY 1,3 DESC""")
print("scope       gender      dives")
print("-"*40)
for s,g,n in cur.fetchall(): print(f"{s:11} {str(g):11} {n:>8,}")
cur.close(); conn.close()
