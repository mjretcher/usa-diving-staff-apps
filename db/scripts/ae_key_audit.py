#!/usr/bin/env python3
"""READ-ONLY. Which identifier columns are safe to group or join on alone?

result_set_id looked like a key and is not — one value spans up to 890 meets.
Any column that fails here must never appear alone in a GROUP BY or JOIN.
"""
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()

def scope_test(table, key, scopes):
    """For each scope column, how many distinct values does one key span?"""
    out=[]
    for sc in scopes:
        cur.execute(f"""SELECT MAX(c) FROM (
            SELECT {key}, COUNT(DISTINCT {sc}) c FROM core.{table}
            WHERE {key} IS NOT NULL GROUP BY 1) x""")
        out.append(cur.fetchone()[0])
    return out

print("core.dive_sheets — max distinct values spanned by one key")
print(f"  {'key':18} {'meets':>8} {'events':>8} {'divers':>8}   verdict")
print("  " + "-"*58)
for key in ["result_set_id","sheet_key","event_id","meet_id","diver_id"]:
    try:
        m,e,d = scope_test("dive_sheets", key, ["meet_id","event_id","diver_id"])
        safe = (m==1 and e==1)
        print(f"  {key:18} {m:>8} {e:>8} {d:>8}   {'SAFE alone' if safe else 'UNSAFE alone'}")
    except Exception as ex:
        print(f"  {key:18} error: {str(ex)[:40]}")

print("\ncore.result_phases — same test")
print(f"  {'key':18} {'meets':>8} {'events':>8} {'divers':>8}   verdict")
print("  " + "-"*58)
for key in ["result_set_id","sheet_key","event_id","meet_id","diver_id"]:
    try:
        m,e,d = scope_test("result_phases", key, ["meet_id","event_id","diver_id"])
        safe = (m==1 and e==1)
        print(f"  {key:18} {m:>8} {e:>8} {d:>8}   {'SAFE alone' if safe else 'UNSAFE alone'}")
    except Exception as ex:
        print(f"  {key:18} error: {str(ex)[:40]}")

print("\nIs (meet_id, event_id, result_set_id, diver_id) a unique list key in dive_sheets?")
cur.execute("""SELECT COUNT(*) FROM (
    SELECT meet_id,event_id,result_set_id,diver_id,round_stage,
           COUNT(*) n, COUNT(DISTINCT dive_order) d
    FROM core.dive_sheets GROUP BY 1,2,3,4,5 HAVING COUNT(*) <> COUNT(DISTINCT dive_order)) x""")
print(f"  lists where dive_order is not unique within the key: {cur.fetchone()[0]:,}")

print("\nDoes event_id alone identify an event across meets?")
cur.execute("""SELECT event_id, COUNT(DISTINCT meet_id) m FROM core.dive_sheets
               GROUP BY 1 ORDER BY m DESC LIMIT 3""")
for e,m in cur.fetchall(): print(f"  event_id {e}: spans {m} meets")
cur.close(); conn.close()
