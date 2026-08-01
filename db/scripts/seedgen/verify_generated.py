#!/usr/bin/env python3
"""
Row-level differential: compare generator output against the existing seed for
the same meets, keyed on (meet_id, event_id, result_set_id, sheet_key,
diver_id). Reports rows only in one side, and per-column disagreement on the
rows present in both.
"""
import csv, sys, collections
from decimal import Decimal, InvalidOperation

gen_path, seed_path, meets_csv = sys.argv[1], sys.argv[2], sys.argv[3]
KEY = ["meet_id", "event_id", "result_set_id", "sheet_key", "diver_id"]
meets = {m.strip() for m in meets_csv.split(",")}
# Columns that are known, signed-off differences rather than defects.
EXPECTED_DIFF = {"source_system", "event_level", "event_round",
                 "phase_dive_count", "phase_dd_sum"}


def load(path):
    out = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["meet_id"] not in meets:
                continue
            out.setdefault(tuple(row[k] for k in KEY), []).append(row)
    return out


def same(a, b):
    if (a or "") == (b or ""):
        return True
    try:
        return abs(Decimal(a or "0") - Decimal(b or "0")) <= Decimal("0.005")
    except (InvalidOperation, ValueError):
        return False


g, s = load(gen_path), load(seed_path)
print(f"keys: generated={len(g)} seed={len(s)}")
only_g, only_s = set(g) - set(s), set(s) - set(g)
print(f"  only in generated: {len(only_g)}   only in seed: {len(only_s)}")
for k in list(only_s)[:5]:
    print("    seed-only:", k)
for k in list(only_g)[:5]:
    print("    gen-only :", k)

cols = list(next(iter(g.values()))[0].keys())
diff = collections.Counter()
ex = collections.defaultdict(list)
both = set(g) & set(s)
for k in both:
    a, b = g[k][0], s[k][0]
    for c in cols:
        if c not in b:
            continue
        if not same(a.get(c), b.get(c)):
            diff[c] += 1
            if len(ex[c]) < 3:
                ex[c].append((k, b.get(c), a.get(c)))
print(f"\nrows compared: {len(both)}")
if not diff:
    print("  ALL COLUMNS IDENTICAL")
for c, n in diff.most_common():
    tag = "  (expected)" if c in EXPECTED_DIFF else ""
    print(f"  {c:<46}{n:>7} differ{tag}")
    for k, sv, gv in ex[c]:
        print(f"       {k}  seed={sv!r} gen={gv!r}")
