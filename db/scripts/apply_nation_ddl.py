#!/usr/bin/env python3
"""Apply the nation DDL statement-by-statement so any failure is visible."""
import os, psycopg2
STMTS = [
 ("core.nations table", """CREATE TABLE IF NOT EXISTS core.nations (
      ioc_code TEXT PRIMARY KEY, nation_name TEXT NOT NULL,
      dives INTEGER DEFAULT 0, divers INTEGER DEFAULT 0,
      first_year INTEGER, last_year INTEGER)"""),
 ("dive_sheets.nation_code", "ALTER TABLE core.dive_sheets ADD COLUMN IF NOT EXISTS nation_code TEXT"),
 ("idx_ds_nation", "CREATE INDEX IF NOT EXISTS idx_ds_nation ON core.dive_sheets(nation_code)"),
 ("core.nation_unresolved", """CREATE TABLE IF NOT EXISTS core.nation_unresolved (
      team_name TEXT PRIMARY KEY, reason TEXT, dives INTEGER, divers INTEGER,
      seen_at TIMESTAMPTZ DEFAULT now())"""),
]
conn = psycopg2.connect(os.environ["DATABASE_URL"]); conn.autocommit = True
cur = conn.cursor()
fails = 0
for label, sql in STMTS:
    try:
        cur.execute(sql); print(f"  OK    {label}", flush=True)
    except Exception as e:
        fails += 1; print(f"  FAIL  {label}: {type(e).__name__}: {e}", flush=True)
print("\nVerifying:")
for t in ["nations", "nation_unresolved"]:
    cur.execute("SELECT to_regclass(%s)", (f"core.{t}",))
    print(f"  core.{t}: {cur.fetchone()[0]}")
cur.execute("""SELECT column_name FROM information_schema.columns
               WHERE table_schema='core' AND table_name='dive_sheets'
                 AND column_name='nation_code'""")
print(f"  dive_sheets.nation_code present: {bool(cur.fetchone())}")
cur.close(); conn.close()
raise SystemExit(1 if fails else 0)
