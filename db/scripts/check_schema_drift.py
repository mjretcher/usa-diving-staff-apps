#!/usr/bin/env python3
"""
Compare db/schema.sql against the live database and report every difference.

WHY THIS HAS TO EXIST
    Every table in schema.sql is created with CREATE TABLE IF NOT EXISTS. That
    statement silently does nothing when the table already exists -- so once a
    table is live, the file stops being able to change it, and the two drift
    apart with no error anywhere. The migration workflow reports success either
    way.

    That is not theoretical. core.event_results.meet_id_dm and diver_id_dm are
    TEXT in the database and INTEGER in the file. Queries written from the file
    fail at runtime with "operator does not exist: text = integer", which is a
    confusing way to discover that your schema definition is fiction.

    Finding those by tripping over them one at a time is not a strategy. This
    finds all of them at once and can fail the build.

Exit code 1 if drift is found, so it can gate the migration workflow.

Env: DATABASE_URL (Neon). Writes membership-analytics/schema-drift.json
"""
import json
import os
import re
import sys
import datetime

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCHEMA = os.path.join(ROOT, "db", "schema.sql")
TARGET = os.path.join(ROOT, "membership-analytics", "schema-drift.json")

# How a declaration in the file maps onto what information_schema reports back.
TYPE_MAP = {
    "text": "text", "varchar": "character varying", "char": "character",
    "integer": "integer", "int": "integer", "int4": "integer",
    "bigint": "bigint", "int8": "bigint",
    "smallint": "smallint", "int2": "smallint",
    "serial": "integer", "bigserial": "bigint",
    "boolean": "boolean", "bool": "boolean",
    "numeric": "numeric", "decimal": "numeric", "real": "real",
    "double precision": "double precision",
    "date": "date", "jsonb": "jsonb", "json": "json", "uuid": "uuid",
    "timestamptz": "timestamp with time zone",
    "timestamp with time zone": "timestamp with time zone",
    "timestamp": "timestamp without time zone",
}
CONSTRAINT_WORDS = ("primary", "unique", "foreign", "check", "constraint", "exclude")

CREATE_RX = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\s*\((.*?)\n\)\s*;",
    re.I | re.S)

# A column added to a live table can only arrive by ALTER, because CREATE TABLE
# IF NOT EXISTS no-ops. Those statements are as much a declaration as anything
# inside the CREATE block, and the file is not fully read without them.
ALTER_RX = re.compile(
    r"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\s+"
    r"ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)\s+([^;]+);",
    re.I)


def norm_type(decl):
    d = decl.strip().lower()
    d = re.sub(r"\s+", " ", d)
    if d.endswith("[]"):
        return "ARRAY"
    d = re.sub(r"\(.*?\)", "", d).strip()          # numeric(6,2) -> numeric
    for k in ("timestamp with time zone", "double precision"):
        if d.startswith(k):
            return TYPE_MAP[k]
    head = d.split(" ")[0]
    return TYPE_MAP.get(head, head)


def parse_schema_file(path):
    with open(path) as fh:
        sql = fh.read()
    # Strip line comments so a commented-out column is not parsed as real.
    sql = re.sub(r"--[^\n]*", "", sql)
    out = {}
    for schema, table, body in CREATE_RX.findall(sql):
        cols = {}
        depth = 0
        buf = []
        for ch in body:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            if ch == "," and depth == 0:
                cols_add(cols, "".join(buf))
                buf = []
            else:
                buf.append(ch)
        cols_add(cols, "".join(buf))
        out[f"{schema.lower()}.{table.lower()}"] = cols
    for schema, table, col, decl in ALTER_RX.findall(sql):
        out.setdefault(f"{schema.lower()}.{table.lower()}", {})[col.lower()] = norm_type(decl)
    return out


def cols_add(cols, frag):
    frag = frag.strip()
    if not frag:
        return
    first = frag.split()[0].lower().strip('"')
    if first in CONSTRAINT_WORDS:
        return
    parts = frag.split(None, 1)
    if len(parts) < 2:
        return
    cols[first] = norm_type(parts[1])


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")
    declared = parse_schema_file(SCHEMA)
    print(f"schema.sql declares {len(declared)} tables, "
          f"{sum(len(c) for c in declared.values())} columns")

    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute("""
        SELECT table_schema, table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog','information_schema')
    """)
    live = {}
    for s, t, c, d in cur.fetchall():
        live.setdefault(f"{s}.{t}", {})[c] = d
    cur.close()
    conn.close()
    print(f"database has {len(live)} tables")

    mismatches, missing_cols, missing_tables, undocumented = [], [], [], []
    for tbl, cols in sorted(declared.items()):
        if tbl not in live:
            missing_tables.append(tbl)
            continue
        for col, want in sorted(cols.items()):
            got = live[tbl].get(col)
            if got is None:
                # The other CREATE TABLE IF NOT EXISTS failure: a column added
                # to the file never reaches an existing table.
                missing_cols.append({"table": tbl, "column": col, "declared": want})
            elif got != want:
                mismatches.append({"table": tbl, "column": col,
                                   "declared": want, "actual": got})
        for col in sorted(live[tbl]):
            if col not in cols:
                undocumented.append({"table": tbl, "column": col,
                                     "actual": live[tbl][col]})

    print(f"\nTYPE MISMATCHES ({len(mismatches)}) -- file says one thing, database another:")
    for m in mismatches:
        print(f"   {m['table']}.{m['column']:22} file={m['declared']:28} db={m['actual']}")
    print(f"\nCOLUMNS IN FILE BUT NOT IN DATABASE ({len(missing_cols)}) -- the IF NOT EXISTS no-op:")
    for m in missing_cols:
        print(f"   {m['table']}.{m['column']:22} declared {m['declared']}")
    print(f"\nTABLES IN FILE BUT NOT IN DATABASE ({len(missing_tables)}):")
    for t in missing_tables:
        print(f"   {t}")
    print(f"\nCOLUMNS IN DATABASE BUT NOT IN FILE ({len(undocumented)}):")
    for m in undocumented[:40]:
        print(f"   {m['table']}.{m['column']:22} {m['actual']}")
    if len(undocumented) > 40:
        print(f"   ... {len(undocumented)-40} more")

    out = {"generated": datetime.datetime.now(datetime.timezone.utc)
                                .strftime("%Y-%m-%dT%H:%M:%SZ"),
           "declared_tables": len(declared), "live_tables": len(live),
           "type_mismatches": mismatches, "columns_missing_in_db": missing_cols,
           "tables_missing_in_db": missing_tables, "columns_not_in_file": undocumented}
    with open(TARGET, "w") as fh:
        json.dump(out, fh, indent=2)
    print(f"\nwrote {TARGET}")

    # Undocumented columns are untidy, not dangerous. A type mismatch or a
    # column the file thinks exists will break code at runtime.
    fatal = len(mismatches) + len(missing_cols) + len(missing_tables)
    if fatal:
        print(f"\nDRIFT: {fatal} difference(s) that will break code written from the file.")
        return 1
    print("\nNo drift. schema.sql matches the database.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
