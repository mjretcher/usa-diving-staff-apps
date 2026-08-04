#!/usr/bin/env python3
"""
key_safety_scan.py — catch queries that group or join on an identifier that
is not unique on its own.

Why this exists. `result_set_id` reads like a primary key and is declared
NOT NULL, but one value spans up to 890 meets and 1,157 events. Grouping on
it alone silently merges unrelated competitions, and the result looks
plausible — a Group A boys list came back as 20 dives instead of 10, which
is exactly the shape of a real rule change. Two full audit cycles went into
chasing that before the key turned out to be the cause.

Verified against live data (see db/audits/ae_key_audit.txt):

    meet_id          safe alone   — identifies one meet
    diver_id         safe alone   — identifies one diver
    event_id         UNSAFE       — unique only within a meet (spans 555)
    sheet_key        UNSAFE       — collides across 6 meets, 9 events
    result_set_id    UNSAFE       — collides across 890 meets, 1,157 events

    (meet_id, event_id, result_set_id, diver_id) is a valid list key:
    zero dive_order collisions across the whole table.

A usage is safe when the unsafe key is either accompanied by meet_id in the
same GROUP BY / JOIN, or the enclosing query is pinned to a single meet by a
WHERE clause. Both count — pinning by WHERE is the common and correct case.

Exit code 1 when anything unsafe is found, so this can gate a build.
"""
import glob
import re
import sys

UNSAFE = ("result_set_id", "sheet_key", "event_id")
PIN = re.compile(r"\bmeet_id\s*(?:=|IN\b)", re.I)


def enclosing_query(src, pos):
    """Rough bounds of the SQL statement containing pos, for scope checks."""
    start = max(src.rfind("SELECT", 0, pos), src.rfind("select", 0, pos))
    if start < 0:
        start = max(0, pos - 1200)
    end = pos + 400
    return src[start:end]


def scan_file(path):
    src = open(path, encoding="utf-8", errors="replace").read()
    out = []

    def check(clause, pos, kind):
        scope = enclosing_query(src, pos)
        pinned = bool(PIN.search(scope))
        for k in UNSAFE:
            if not re.search(r"\b" + k + r"\b", clause):
                continue
            with_meet = re.search(r"\bmeet_id\b", clause)
            if with_meet or pinned:
                continue
            line = src[:pos].count("\n") + 1
            out.append({
                "file": path, "line": line, "kind": kind, "key": k,
                "clause": " ".join(clause.split())[:80],
                "reason": "no meet_id in the key and the query is not pinned to one meet",
            })

    for m in re.finditer(r"GROUP BY\s+([^\n;)]*)", src, re.I):
        check(m.group(1), m.start(), "GROUP BY")
    for m in re.finditer(r"JOIN\s+[\w.]+\s+\w*\s*ON\s+([^\n]*)", src, re.I):
        check(m.group(1), m.start(), "JOIN ON")
    # JS: building a Map/Set key from one unsafe id
    for m in re.finditer(r"\.(?:set|get|has)\(\s*\w+\.(result_set_id|sheet_key|event_id)\s*[,)]", src):
        scope = enclosing_query(src, m.start())
        if PIN.search(scope):
            continue
        out.append({
            "file": path, "line": src[:m.start()].count("\n") + 1, "kind": "JS map key",
            "key": m.group(1), "clause": m.group(0).strip(),
            "reason": "single-id map key with no meet scope in view",
        })
    return out


def main():
    roots = sys.argv[1:] or [
        "db/scripts/*.py", "athlete-evaluation/*.js",
        "junior-results/*.js", "membership-analytics/*.js",
        "schedule-builder/*.js",
    ]
    files = [f for r in roots for f in glob.glob(r)]
    findings = [x for f in files for x in scan_file(f)]

    print(f"key-safety scan — {len(files)} files")
    if not findings:
        print("  clean: no unscoped grouping or joining on a colliding key")
        return 0
    print(f"  {len(findings)} unsafe usage(s)\n")
    for x in findings:
        print(f"  {x['file']}:{x['line']}  [{x['kind']}] {x['key']}")
        print(f"    {x['clause']}")
        print(f"    -> {x['reason']}\n")
    return 1


if __name__ == "__main__":
    sys.exit(main())
