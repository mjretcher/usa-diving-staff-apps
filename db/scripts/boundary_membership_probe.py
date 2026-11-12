#!/usr/bin/env python3
"""Read-only. Did a map or proposal saved from Boundary Studio on 12 Nov reach the
database? Prints row counts, the newest save times, and whether any name
contains 'mike' (names themselves are not printed, only how many match)."""
import os, psycopg2
conn = psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True); cur = conn.cursor()
for t in ("boundary_maps", "boundary_scenarios"):
    cur.execute(f"SELECT count(*), max(updated_at), count(*) FILTER (WHERE updated_at > now() - interval '6 hours'), count(*) FILTER (WHERE name ILIKE '%%mike%%'), count(*) FILTER (WHERE name ILIKE '%%11-12%%' OR name ILIKE '%%11/12%%') FROM membership.{t}")
    print(t, "| rows, newest save, saved in last 6h, names containing 'mike', names containing 11-12:", cur.fetchone())
    cur.execute(f"SELECT to_char(updated_at,'YYYY-MM-DD HH24:MI') u, length(name), left(id,3), pg_column_size(data), (SELECT count(*) FROM jsonb_object_keys(coalesce((data::jsonb)->'assign','{{}}'::jsonb))) FROM membership.{t} ORDER BY updated_at DESC LIMIT 6")
    print("  newest six (time UTC, name length, id prefix, size bytes, counties painted):")
    for r in cur.fetchall(): print("   ", r)
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='membership' AND table_name=%s ORDER BY ordinal_position", (t,)); print("  columns:", [r[0] for r in cur.fetchall()])
cur.execute("SELECT has_table_privilege('usad_app','membership.boundary_maps','INSERT'), has_table_privilege('usad_app','membership.boundary_maps','UPDATE'), has_table_privilege('usad_app','membership.boundary_scenarios','INSERT')")
print("usad_app can insert maps / update maps / insert proposals:", cur.fetchone())
cur.execute("SELECT now()"); print("database time:", cur.fetchone()[0])
