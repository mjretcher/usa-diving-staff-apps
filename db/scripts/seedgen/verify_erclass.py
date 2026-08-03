#!/usr/bin/env python3
"""
Differential test for erclass.py against every core.event_results row that has
a matching crawl event. The stored values are the ground truth: they are what
reports-view.js and pipeline-modeling.js read today.

Supplement rows (source_file = 'criteria-simulator/data.js') are excluded --
they come from a different source with its own conventions (Male/Female, the
round left inside event_name) and have no crawl counterpart, so the loader
carries them through untouched rather than regenerating them.
"""
import sqlite3, collections, sys
sys.path.insert(0, "/tmp/seedgen")
import erclass

db = sqlite3.connect("/tmp/crawl.db")
db.row_factory = sqlite3.Row

# crawl title index: meet -> normalised base name -> {round: title}
idx = collections.defaultdict(lambda: collections.defaultdict(dict))
for e in db.execute("SELECT meet_id, round, title FROM divemeets_events"):
    t = e["title"] or ""
    idx[e["meet_id"]][erclass.event_name(t)][str(e["round"])] = t

rows = db.execute("""
SELECT meet_id_dm, meet_name, event_name, round, stage, event_level, age_group,
       gender, discipline, event_key, is_synchro, is_junior_circuit,
       region, zone, ewc_meet, COUNT(*) n
FROM core_event_results
WHERE source_file <> 'criteria-simulator/data.js'
GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15
""").fetchall()

FIELDS = ["stage", "event_level", "age_group", "gender", "discipline", "event_key",
          "is_synchro", "is_junior_circuit", "region", "zone", "ewc_meet", "round"]
agree, total = collections.Counter(), collections.Counter()
bad = collections.defaultdict(collections.Counter)
unmatched = 0

for r in rows:
    base = " ".join((r["event_name"] or "").split())
    by_round = idx.get(r["meet_id_dm"], {}).get(base)
    if not by_round:
        unmatched += r["n"]
        continue
    # pick the crawl round whose label matches the stored round label
    title, rno = None, None
    for cr, t in by_round.items():
        if erclass.round_label(cr, t) == r["round"]:
            title, rno = t, cr
            break
    if title is None:
        title, rno = next(iter(by_round.items()))[1], next(iter(by_round))

    mn = r["meet_name"]
    nm = erclass.event_name(title)
    st = erclass.stage(mn)
    got = {
        "stage": st,
        "event_level": erclass.event_level(st, nm),
        "age_group": erclass.age_group(nm, st),
        "gender": erclass.gender(nm),
        "discipline": erclass.discipline(nm),
        "event_key": erclass.event_key(erclass.age_group(nm, st), erclass.gender(nm),
                                       erclass.discipline(nm)),
        "is_synchro": erclass.is_synchro(nm),
        "is_junior_circuit": erclass.is_junior_circuit(st, nm),
        "region": erclass.region(mn),
        "zone": erclass.zone(mn),
        "ewc_meet": erclass.ewc_meet(mn),
        "round": erclass.round_label(rno, title),
    }
    for f in FIELDS:
        want = r[f]
        if f in ("is_synchro", "is_junior_circuit"):
            want = (want == "t" or want is True)
        elif f == "region":
            want = int(want) if want not in (None, "") else None
        total[f] += r["n"]
        if (got[f] if got[f] not in ("",) else None) == (want if want not in ("",) else None):
            agree[f] += r["n"]
        else:
            bad[f][(nm[:44], str(want), str(got[f]))] += r["n"]

print(f"rows with no crawl event matched: {unmatched}")
print(f"{'field':<20}{'rows':>10}{'agree':>10}{'pct':>9}")
for f in FIELDS:
    if not total[f]:
        continue
    print(f"{f:<20}{total[f]:>10}{agree[f]:>10}{100.0*agree[f]/total[f]:>8.2f}%")
print("\n=== residual direction check ===")
harmful = 0
for f in FIELDS:
    for (nm, w, g), n in bad[f].items():
        if w not in ("None", "", "null"):
            harmful += n
            print(f"  CHANGES A REAL VALUE: {f} {nm!r} {w!r} -> {g!r} x{n}")
print(f"  residuals that overwrite an existing value: {harmful}")
print(f"  residuals that fill a legacy null:          "
      f"{sum(sum(c.values()) for c in bad.values()) - harmful}")

for f in FIELDS:
    if not bad[f]:
        continue
    print(f"\n=== {f} (stored -> mine) ===")
    for (nm, w, g), n in bad[f].most_common(8):
        print(f"  {n:>6}  {nm:<44} {w!r:>18} -> {g!r}")
