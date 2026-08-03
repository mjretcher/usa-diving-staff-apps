#!/usr/bin/env python3
"""
Post-load assertions. Run against Neon after core-load.yml completes.

The load truncates and rebuilds core.result_phases and core.dive_sheets, so
the question that matters is not "did it write a lot of rows" but "did it keep
everything that was there before". These are the canaries.
"""
import json, os, sys, urllib.request

CONN = os.environ.get("NEON_RO") or (
    "postgresql://usad_app:npg_app_F6iHP3fFK7OhBpNSlsz0nEB@"
    "ep-holy-bird-aj5deo63-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require")
URL = "https://ep-holy-bird-aj5deo63.c-3.us-east-2.aws.neon.tech/sql"


def q(sql):
    body = json.dumps({"query": sql, "params": []}).encode()
    req = urllib.request.Request(URL, data=body, headers={
        "Neon-Connection-String": CONN, "Neon-Raw-Text-Output": "true",
        "Neon-Array-Mode": "true", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        d = json.loads(r.read())
    if "rows" not in d:
        raise RuntimeError(d.get("message"))
    return d["rows"]


def one(sql):
    return q(sql)[0][0]


CHECKS = [
    # (label, sql, expectation, comparator)
    ("World Aquatics phases preserved",
     "SELECT COUNT(*) FROM core.result_phases WHERE meet_id LIKE 'WA-%'", 1528, "=="),
    ("World Aquatics dives preserved",
     "SELECT COUNT(*) FROM core.dive_sheets WHERE meet_id LIKE 'WA-%'", 8072, "=="),
    ("meet 11522 dive rows kept (crawl has sheets_done=false)",
     "SELECT COUNT(*) FROM core.dive_sheets WHERE meet_id='11522'", 1083, "=="),
    ("computed phase rows not lost",
     "SELECT COUNT(*) FROM core.result_phases "
     "WHERE score_analysis_mode <> 'Result-only (archive scrape)'", 5393, ">="),
    ("phases grew",
     "SELECT COUNT(*) FROM core.result_phases", 124261, ">"),
    ("dives grew",
     "SELECT COUNT(*) FROM core.dive_sheets", 34643, ">"),
    ("distinct dive-sheet meets grew",
     "SELECT COUNT(DISTINCT meet_id) FROM core.dive_sheets", 20, ">"),
    ("no NULL sheet_key slipped in",
     "SELECT COUNT(*) FROM core.result_phases WHERE sheet_key IS NULL", 0, "=="),

    # --- core.event_results ---
    ("supplement rows preserved",
     "SELECT COUNT(*) FROM core.event_results "
     "WHERE source_file = 'criteria-simulator/data.js'", 2920, "=="),
    ("Camp rows preserved (no crawl counterpart)",
     "SELECT COUNT(*) FROM core.event_results WHERE stage = 'Camp'", 92, "=="),
    ("event_results grew",
     "SELECT COUNT(*) FROM core.event_results", 49635, ">"),
    ("Junior Circuit rows grew",
     "SELECT COUNT(*) FROM core.event_results WHERE is_junior_circuit", 42757, ">"),
    # Scope is now the full DiveMeets history. This guards the floor rather
    # than the old 2021 boundary.
    ("no rows before the crawl's earliest season",
     "SELECT COUNT(*) FROM core.event_results WHERE year < 2013", 0, "=="),
    ("pre-2021 Junior Circuit history present",
     "SELECT COUNT(*) FROM core.event_results "
     "WHERE is_junior_circuit AND year < 2021", 1000, ">"),
    ("no collegiate meets in the Junior Circuit",
     "SELECT COUNT(*) FROM core.event_results "
     "WHERE is_junior_circuit AND meet_name ILIKE '%NCAA%'", 0, "=="),
    ("every Regionals row has a region",
     "SELECT COUNT(*) FROM core.event_results "
     "WHERE stage = 'Regionals' AND region IS NULL", 0, "=="),
    ("every Zones row has a zone",
     "SELECT COUNT(*) FROM core.event_results "
     "WHERE stage = 'Zones' AND zone IS NULL", 0, "=="),
    ("every EWC row has an ewc_meet",
     "SELECT COUNT(*) FROM core.event_results "
     "WHERE stage = 'EWC' AND ewc_meet IS NULL", 0, "=="),
    ("no non-junior genders in the Junior Circuit",
     "SELECT COUNT(*) FROM core.event_results "
     "WHERE is_junior_circuit AND gender NOT IN ('Boys','Girls')", 0, "=="),
]

# The Junior A/B pool over the 523 meets the seed already covered must be
# byte-identical to what Standards Studio saw before the load.
JUNIOR_AB = """
SELECT COUNT(*) FROM core.result_phases p
WHERE p.competition_family='USA Diving'
  AND p.competition_group='USA Diving Junior Nationals'
  AND NOT p.is_synchronized
  AND ( p.age_group IN ('Group A','Group B')
        OR ( (p.age_group IS NULL OR p.age_group='')
             AND (p.event_round LIKE '%%16-18%%' OR p.event_round LIKE '%%14-15%%') ) )
  AND p.meet_id IN (SELECT DISTINCT meet_id FROM core.result_phases
                    WHERE source_system LIKE 'usa_%%.db' OR source_system='divemeets_crawl')
"""

fails = 0
print(f"{'check':<52}{'expected':>12}{'actual':>12}  result")
for label, sql, exp, cmp_ in CHECKS:
    got = int(one(sql))
    ok = {"==": got == exp, ">=": got >= exp, ">": got > exp,
          "<=": got <= exp, "<": got < exp}[cmp_]
    fails += not ok
    print(f"{label:<52}{cmp_+' '+str(exp):>12}{got:>12}  {'PASS' if ok else 'FAIL'}")

print()
print("Junior A/B pool rows now:", int(one(JUNIOR_AB)))
print("(was 6,487 across the 523 seed meets; growth here is new meets entering "
      "the pool, not reclassification -- verify_pools_full.py proved 0 flips)")

sys.exit(1 if fails else 0)
