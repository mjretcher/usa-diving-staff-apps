#!/usr/bin/env python3
"""
Consumer-invariance test for the core.event_results regeneration.

reports-view.js and pipeline-modeling.js reference core.event_results at 91
sites. Rather than extract and re-run 91 queries -- which would test my
transcription of them as much as the data -- this compares the full
cross-tabulation of every column those files filter on, between the table as
it exists today and the table as the generator would rebuild it.

If each combination of (stage, gender, discipline, age_group, event_level,
region, zone, ewc_meet, round, is_synchro, is_junior_circuit, year) maps to the
same row count in both, then any query built out of those predicates returns
the same answer. That is a stronger guarantee than sampling queries.

It also runs the one query Athlete Evaluation issues, verbatim.
"""
import sqlite3, collections, sys
sys.path.insert(0, "/tmp/seedgen")
import erclass

db = sqlite3.connect("/tmp/crawl.db")
db.row_factory = sqlite3.Row

FILTER_COLS = ["stage", "gender", "discipline", "age_group", "event_level",
               "region", "zone", "ewc_meet", "round", "is_synchro",
               "is_junior_circuit", "year"]

# ---- build the regenerated rows from the crawl -----------------------------
idx = collections.defaultdict(lambda: collections.defaultdict(dict))
for e in db.execute("SELECT meet_id, round, title FROM divemeets_events"):
    t = e["title"] or ""
    idx[e["meet_id"]][erclass.event_name(t)][str(e["round"])] = t

meet_names = {m["meet_id"]: m["meet_name"] or ""
              for m in db.execute("SELECT meet_id, meet_name FROM divemeets_meets")}


def regenerate(r):
    """Derive what the generator would write for this row's event."""
    mn = r["meet_name"]
    base = " ".join((r["event_name"] or "").split())
    by_round = idx.get(r["meet_id_dm"], {}).get(base)
    title = base
    rno = None
    if by_round:
        for cr, t in by_round.items():
            if erclass.round_label(cr, t) == r["round"]:
                title, rno = t, cr
                break
        else:
            rno, title = next(iter(by_round.items()))
    nm = erclass.event_name(title)
    st = erclass.stage(mn)
    ag = erclass.age_group(nm, st)
    gd = erclass.gender(nm)
    di = erclass.discipline(nm)
    return {
        "stage": st,
        "gender": gd,
        "discipline": di,
        "age_group": ag,
        "event_level": erclass.event_level(st, nm),
        "region": erclass.region(mn),
        "zone": erclass.zone(mn),
        "ewc_meet": erclass.ewc_meet(mn),
        "round": erclass.round_label(rno, title) if rno else r["round"],
        "is_synchro": erclass.is_synchro(nm),
        "is_junior_circuit": erclass.is_junior_circuit(st, nm),
        "year": r["year"],
        "event_key": erclass.event_key(ag, gd, di),
    }


def norm(v):
    # NB: `v in (True, ...)` would fold region=1 into True, since 1 == True in
    # Python. Test the type explicitly.
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        return v
    if v in ("t", "True"):
        return True
    if v in ("f", "False"):
        return False
    return str(v)


rows = db.execute("""SELECT * FROM core_event_results
                     WHERE source_file <> 'criteria-simulator/data.js'""").fetchall()

before, after = collections.Counter(), collections.Counter()
for r in rows:
    g = regenerate(r)
    before[tuple(norm(r[c]) for c in FILTER_COLS)] += 1
    after[tuple(norm(g[c]) for c in FILTER_COLS)] += 1

keys = set(before) | set(after)
moved = sum(abs(before[k] - after[k]) for k in keys) // 2
print(f"rows compared:            {len(rows)}")
print(f"distinct filter combos:   before {len(before)}  after {len(after)}")
print(f"rows landing in a different combo: {moved}")

diffs = [(k, before[k], after[k]) for k in keys if before[k] != after[k]]
diffs.sort(key=lambda x: -abs(x[1] - x[2]))
print(f"combos whose count changed: {len(diffs)}")
for k, b, a in diffs[:12]:
    shown = ", ".join(f"{c}={v!r}" for c, v in zip(FILTER_COLS, k)
                      if v is not None)[:118]
    print(f"  {b:>6} -> {a:<6}  {shown}")

# ---- the query Athlete Evaluation actually runs -----------------------------
print("\n=== ae-data.js nationalsHistory(), verbatim predicates ===")


def ae_rows(get):
    out = collections.Counter()
    for r in rows:
        v = get(r)
        if (v["stage"] == "Nationals" and not v["is_synchro"]
                and v["age_group"] in ("Group A", "Group B", "Group C", "Group D")
                and r["score"] not in (None, "")
                and (r["place"] in (None, "") or int(r["place"]) < 100)):
            out[(r["diver_id_dm"], v["age_group"])] += 1
    return out


b = ae_rows(lambda r: {k: norm(r[k]) if k != "is_synchro" else norm(r[k])
                       for k in ("stage", "is_synchro", "age_group")})
a = ae_rows(regenerate)
print(f"  qualifying rows before: {sum(b.values())}   after: {sum(a.values())}")
print(f"  athlete/age-group cells before: {len(b)}   after: {len(a)}")
gained = sum(v for k, v in a.items() if k not in b)
lost = sum(v for k, v in b.items() if k not in a)
print(f"  cells gained: {gained}   cells lost: {lost}")
