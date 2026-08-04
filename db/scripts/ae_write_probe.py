#!/usr/bin/env python3
"""Why did the INSERT fail read-only? Probe the connection state."""
import os, psycopg2
conn = psycopg2.connect(os.environ["DATABASE_URL"]); conn.autocommit = True
cur = conn.cursor()
for q in ["SELECT current_user", "SELECT current_database()",
          "SHOW default_transaction_read_only", "SHOW transaction_read_only",
          "SELECT pg_is_in_recovery()", "SHOW server_version"]:
    try:
        cur.execute(q); print(f"  {q:45} -> {cur.fetchone()[0]}")
    except Exception as e:
        print(f"  {q:45} -> ERROR {e}")
print("\nWrite test into core.dive_skills:")
try:
    cur.execute("""INSERT INTO core.dive_skills (code,stem,skill_name,rulebook_cite)
                   VALUES ('__probe__','__probe__','probe','probe')
                   ON CONFLICT (code) DO NOTHING""")
    cur.execute("DELETE FROM core.dive_skills WHERE code='__probe__'")
    print("  WRITE OK")
except Exception as e:
    print(f"  WRITE FAILED: {type(e).__name__}: {e}")
print("\nDid the earlier UPDATE persist?")
cur.execute("""SELECT dive_bucket, COUNT(*) FROM core.dive_sheets
               GROUP BY 1 ORDER BY 2 DESC""")
for b,n in cur.fetchall(): print(f"  {str(b):14} {n:>9,}")
cur.close(); conn.close()
