#!/usr/bin/env python3
"""Run one SELECT against Neon inside a READ ONLY transaction and print the
rows. Dispatch-only diagnostic (see .github/workflows/neon-readonly-probe.yml);
sessions cannot reach Neon with the write role, and ad-hoc writes are not
allowed outside committed workflows anyway. Env: DATABASE_URL, SQL."""
import os, sys, json
import psycopg2
sql = os.environ["SQL"].strip()
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute("BEGIN; SET TRANSACTION READ ONLY; SET statement_timeout = '60s';")
cur.execute(sql)
cols = [d[0] for d in cur.description]
rows = cur.fetchmany(500)
print(json.dumps({"columns": cols, "rows": [[str(v) if v is not None else None for v in r] for r in rows],
                  "truncated_at_500": len(rows) == 500}, indent=1))
conn.rollback(); cur.close(); conn.close()
