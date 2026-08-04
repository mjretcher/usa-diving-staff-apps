#!/usr/bin/env python3
"""READ-ONLY. Definitive list of real skills: non-rulebook dive numbers that
carry a DD (i.e. genuinely scored skills), vs. concatenation artifacts (no DD)."""
import os, sys, psycopg2
DSN = os.environ.get("DATABASE_URL")
if not DSN: sys.exit("DATABASE_URL not set")
INDIV = "('1m','3m','Platform')"
VALID = r'^([1-4][01][0-9]|5[1-4][0-9][0-9]|6[1-3][0-9][0-9]?)[ABCD]$'

conn = psycopg2.connect(DSN); conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()

def show(title, sql, headers):
    print("\n"+"="*84); print(title); print("="*84)
    cur.execute(sql); rows = cur.fetchall()
    if not rows: print("  (none)"); return
    w=[max(len(str(h)),max((len(str(r[i])) for r in rows),default=0)) for i,h in enumerate(headers)]
    print("  "+"  ".join(str(h).ljust(w[i]) for i,h in enumerate(headers)))
    print("  "+"  ".join("-"*w[i] for i in range(len(headers))))
    for r in rows: print("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))

show("DEFINITIVE SKILL LIST — non-rulebook numbers WITH a DD (every one, no limit)",
 f"""SELECT dive_number, COUNT(*) AS n, COUNT(DISTINCT diver_id) AS divers,
            MODE() WITHIN GROUP (ORDER BY description) AS description,
            ROUND(MIN(dd)::numeric,2) AS min_dd, ROUND(MAX(dd)::numeric,2) AS max_dd,
            COUNT(DISTINCT dd) AS n_distinct_dd,
            STRING_AGG(DISTINCT discipline, '/') AS disciplines,
            MIN(meet_year) AS y0, MAX(meet_year) AS y1
     FROM core.dive_sheets
     WHERE discipline IN {INDIV} AND dive_number IS NOT NULL AND dive_number <> ''
       AND dive_number !~ '{VALID}' AND dd IS NOT NULL AND dd > 0
     GROUP BY 1 ORDER BY n DESC""",
 ["code","n","divers","description","min_dd","max_dd","#dd","disciplines","y0","y1"])

show("Confirm: artifacts (no DD) are ALL multi-dive concatenations",
 f"""SELECT CASE WHEN LENGTH(dive_number) > 5 THEN 'concatenated (>5 chars)'
                 ELSE 'short, no dd — needs review' END AS kind,
            COUNT(*) AS n, COUNT(DISTINCT dive_number) AS distinct_codes
     FROM core.dive_sheets
     WHERE discipline IN {INDIV} AND dive_number IS NOT NULL AND dive_number <> ''
       AND dive_number !~ '{VALID}' AND (dd IS NULL OR dd = 0)
     GROUP BY 1 ORDER BY n DESC""",
 ["kind","n","distinct_codes"])

show("Any short no-DD codes needing review",
 f"""SELECT dive_number, COUNT(*) AS n,
            MODE() WITHIN GROUP (ORDER BY description) AS description
     FROM core.dive_sheets
     WHERE discipline IN {INDIV} AND dive_number IS NOT NULL AND dive_number <> ''
       AND dive_number !~ '{VALID}' AND (dd IS NULL OR dd = 0)
       AND LENGTH(dive_number) <= 5
     GROUP BY 1 ORDER BY n DESC LIMIT 25""",
 ["code","n","description"])
print("\nDone — no writes."); cur.close(); conn.close()
