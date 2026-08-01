#!/usr/bin/env python3
"""Pull Neon tables into a local SQLite file for offline analysis."""
import json, sqlite3, sys, urllib.request

ENDPOINT = "https://ep-holy-bird-aj5deo63.c-3.us-east-2.aws.neon.tech/sql"
CONN = ("postgresql://usad_app:npg_app_F6iHP3fFK7OhBpNSlsz0nEB@"
        "ep-holy-bird-aj5deo63-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require")


def q(sql, params=None):
    body = json.dumps({"query": sql, "params": params or []}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={
        "Neon-Connection-String": CONN,
        "Neon-Raw-Text-Output": "true",
        "Neon-Array-Mode": "true",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=180) as r:
        d = json.loads(r.read())
    return [f["name"] for f in d["fields"]], d["rows"]


def pull(db, table, order_col, where="", page=20000):
    cols, _ = q(f"SELECT * FROM {table} LIMIT 0")
    local = table.replace(".", "_")
    db.execute(f"DROP TABLE IF EXISTS {local}")
    db.execute(f"CREATE TABLE {local} ({','.join(c+' TEXT' for c in cols)})")
    ph = ",".join("?" * len(cols))
    last, total = None, 0
    while True:
        w = f"WHERE {where}" if where else ""
        if last is not None:
            w = (w + " AND " if w else "WHERE ") + f"{order_col} > {last}"
        _, rows = q(f"SELECT * FROM {table} {w} ORDER BY {order_col} LIMIT {page}")
        if not rows:
            break
        db.executemany(f"INSERT INTO {local} VALUES ({ph})", rows)
        total += len(rows)
        last = rows[-1][cols.index(order_col)]
        print(f"  {local}: {total}", flush=True)
        if len(rows) < page:
            break
    db.commit()
    return total


if __name__ == "__main__":
    db = sqlite3.connect("/tmp/crawl.db")
    for spec in sys.argv[1:]:
        table, order_col, where = (spec.split("::") + ["", ""])[:3]
        print(f"pulling {table} ...")
        pull(db, table, order_col, where)
    db.close()
