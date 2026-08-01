#!/usr/bin/env python3
"""
NCAA women's springboard 5-category derivation, plus its verification.

NCAA women dive a 6-dive springboard list drawn from 5 categories, so exactly
one category is repeated. The derived "5-category" score keeps the
higher-scoring dive of the repeated category and drops the other, which makes
NCAA women's springboard comparable to 5-category lists elsewhere. The raw
6-dive score is preserved separately and is never overwritten.
"""
import sqlite3, collections
from decimal import Decimal

CATEGORY_LABELS = {"1": "1 Forward", "2": "2 Back", "3": "3 Reverse",
                   "4": "4 Inward", "5": "5 Twister"}


def _num(v):
    """Format a Decimal the way the seed does: 54 not 54.0, 54.6 stays 54.6."""
    if v is None:
        return ""
    v = v.normalize()
    return format(v, "f")


def dive_category(dive_number):
    dn = (dive_number or "").strip()
    if not dn or not dn[0].isdigit():
        return "", ""
    c = dn[0]
    if c not in CATEGORY_LABELS:      # 6 = armstand, not a category here
        return "", ""
    return c, CATEGORY_LABELS[c]


def five_cat(dives, family, gender, discipline):
    """dives: list of dicts with dive_number, dd, score (Decimal).
    Returns the eight ncaa_women_springboard_* values plus, per dive, an
    inclusion status."""
    blank = dict(raw6="", score="", dd_sum="", repeated="", dropped_number="",
                 dropped_score="", status="not_applicable", note="",
                 inclusion={})
    if family != "NCAA" or gender != "Female" or discipline not in ("1m", "3m"):
        return blank
    if not dives:
        return blank

    raw6 = sum((d["score"] for d in dives if d["score"] is not None), Decimal(0))
    if len(dives) != 6:
        b = dict(blank)
        b.update(raw6=raw6, status="unexpected_dive_count",
                 note=f"Expected a 6-dive NCAA women's springboard list, found {len(dives)}. "
                      f"No 5-category score derived.")
        return b

    by_cat = collections.defaultdict(list)
    for d in dives:
        code, _ = dive_category(d["dive_number"])
        by_cat[code].append(d)
    repeated = [c for c, v in by_cat.items() if len(v) > 1]
    if len(repeated) != 1 or len(by_cat[repeated[0]]) != 2:
        b = dict(blank)
        b.update(raw6=raw6, status="ambiguous_repeated_category",
                 note="Could not identify exactly one repeated category in the 6-dive "
                      "list. No 5-category score derived.")
        return b

    cat = repeated[0]
    label = CATEGORY_LABELS[cat]
    pair = sorted(by_cat[cat], key=lambda d: (d["score"] if d["score"] is not None else Decimal(0)))
    drop, keep = pair[0], pair[1]
    # Tie guard: with equal scores there is no unique higher dive, so which one
    # to drop is undefined. The seed refuses to derive a score here rather than
    # picking arbitrarily, and so do we.
    if drop["score"] == keep["score"]:
        b = dict(blank)
        b.update(raw6=raw6, status="ambiguous_repeated_category",
                 note=f"Repeated {label} dives do not have a unique higher score.")
        return b
    kept = [d for d in dives if d is not drop]
    incl = {id(d): ("dropped" if d is drop else "included") for d in dives}
    return dict(
        raw6=raw6,
        score=sum((d["score"] for d in kept if d["score"] is not None), Decimal(0)),
        dd_sum=sum((d["dd"] for d in kept if d["dd"] is not None), Decimal(0)),
        repeated=label,
        dropped_number=drop["dive_number"],
        dropped_score=drop["score"],
        status="adjusted",
        note=(f"Derived 5-category score keeps the higher-scoring {label} dive and drops "
              f"{drop['dive_number']} ({_num(drop['score'])}). The raw NCAA 6-dive score is "
              f"preserved separately."),
        inclusion=incl,
    )


# ------------------------------------------------------------------ verify
if __name__ == "__main__":
    db = sqlite3.connect("/tmp/crawl.db")
    db.row_factory = sqlite3.Row
    db.execute("CREATE INDEX IF NOT EXISTS i_sd2 ON seed_dives(meet_id,event_id,result_set_id,sheet_key)")

    def dec(v):
        try:
            return Decimal(str(v))
        except Exception:
            return None

    rows = db.execute("""SELECT * FROM seed_phases
        WHERE ncaa_women_springboard_adjustment_status <> ''""").fetchall()
    stats = collections.Counter()
    bad = collections.defaultdict(list)
    for r in rows:
        dv = db.execute("""SELECT dive_number, dd, score FROM seed_dives
            WHERE meet_id=? AND event_id=? AND result_set_id=? AND sheet_key=?
            ORDER BY CAST(dive_order AS INT)""",
            (r["meet_id"], r["event_id"], r["result_set_id"], r["sheet_key"])).fetchall()
        dives = [dict(dive_number=x["dive_number"], dd=dec(x["dd"]), score=dec(x["score"])) for x in dv]
        got = five_cat(dives, r["competition_family"], r["gender"], r["discipline"])
        stats["rows"] += 1
        ok = got["status"] == r["ncaa_women_springboard_adjustment_status"]
        stats["status"] += ok
        if not ok and len(bad["status"]) < 6:
            bad["status"].append((r["meet_id"], r["sheet_key"],
                                  r["ncaa_women_springboard_adjustment_status"], got["status"]))
        if got["status"] == "adjusted" and r["ncaa_women_springboard_adjustment_status"] == "adjusted":
            for f, seedv, gotv in [
                ("5cat_score", r["ncaa_women_springboard_5cat_score"], got["score"]),
                ("5cat_dd", r["ncaa_women_springboard_5cat_dd_sum"], got["dd_sum"]),
                ("raw6", r["ncaa_women_springboard_raw_6_dive_score"], got["raw6"]),
                ("dropped_score", r["ncaa_women_springboard_dropped_dive_score"], got["dropped_score"]),
            ]:
                good = seedv not in (None, "") and abs(dec(seedv) - gotv) <= Decimal("0.005")
                stats[f] += bool(good)
                stats[f + "_n"] += 1
                if not good and len(bad[f]) < 5:
                    bad[f].append((r["meet_id"], r["sheet_key"], seedv, str(gotv)))
            for f, seedv, gotv in [
                ("repeated", r["ncaa_women_springboard_repeated_category"], got["repeated"]),
                ("dropped_number", r["ncaa_women_springboard_dropped_dive_number"], got["dropped_number"]),
                ("note", r["ncaa_women_springboard_adjustment_note"], got["note"]),
            ]:
                good = (seedv or "") == (gotv or "")
                stats[f] += bool(good)
                stats[f + "_n"] += 1
                if not good and len(bad[f]) < 4:
                    bad[f].append((r["meet_id"], r["sheet_key"], seedv, gotv))

    print(f"rows tested: {stats['rows']}")
    print(f"  {'status':<16}{stats['status']:>6}/{stats['rows']}")
    for f in ["raw6", "5cat_score", "5cat_dd", "dropped_score", "repeated", "dropped_number", "note"]:
        if stats[f + "_n"]:
            print(f"  {f:<16}{stats[f]:>6}/{stats[f+'_n']}")
    for k, v in bad.items():
        print(f"\n=== {k} mismatches ===")
        for x in v:
            print("   ", x)
