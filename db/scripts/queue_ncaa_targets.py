#!/usr/bin/env python3
"""
Seed divemeets.crawl_targets with the NCAA meets we actually want.

The registry holds 7,200+ NCAA-sanctioned meets (every dual, tri, invitational
and every division). Scope agreed with Mike 2026-07-27: NCAA Division I
conference championships, NCAA Division I national championships, and NCAA
Zone championships, 2015 to present.

The DiveMeets `sanction` column only says "National Collegiate Athletic
Association" — it carries no division marker — so division has to be inferred
from the meet name. Two ordered passes:

  1. NOT_D1 kills anything explicitly D2 / D3 / NAIA / club by name
     (Division III regionals, NCAC, MIAC, SCIAC, WIAC, UAA, PCSC, ...).
  2. a whitelist of D1 conferences that sponsored swimming & diving at some
     point 2015-2026 matches the survivors.

Anything not matched by the whitelist is left out rather than guessed in — a
missed conference is a re-run away, a wrongly-tagged D2 meet is bad data.

Two conference championships are genuinely multi-division and are tagged
separately (ncaa_d1_conference_multidiv) so they can be dropped later without
re-crawling: ECAC and Metropolitan. Both include D1 programs, which is why
they're in rather than out.

MANUAL_ADDS covers championship meets whose DiveMeets name omits the word
"championship" entirely; each was confirmed against a hole in the
conference-by-year grid before being added.

Idempotent: safe to re-run every season to pick up new championship meets.

Env: DATABASE_URL, YEAR_FROM (default 2015), DRY_RUN (any value = report only)
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

import psycopg2

DB_URL = os.environ["DATABASE_URL"]
YEAR_FROM = int(os.environ.get("YEAR_FROM") or 2015)
DRY_RUN = bool((os.environ.get("DRY_RUN") or "").strip())

# ---- dual/tri/invitational expansion (added 2026-08-09) -------------------
# Scope agreed 2026-07-27 was championships only. Duals are opt-in per run.
#
# There is NO name-based division filter for duals. Their DiveMeets names are
# opaque school-code pairs -- "NAVY vs GW", "Gannon vs Clarion" (both D2),
# "COLG vs HAM" (D1 vs D3), "TCNJ vs SWRM" (both D3). The NOT_D1 regex never
# fires and the D1_CONF whitelist never matches, so anything queued here is
# every division indiscriminately. Division is only knowable AFTER the crawl,
# from core.result_phases.ncaa_division and the resolved team_id.
#
# Tagged separately and deliberately verbosely so the whole set can be dropped
# with one DELETE ... WHERE tag = 'ncaa_dual_unverified_division'.
INCLUDE_DUALS = bool((os.environ.get("INCLUDE_DUALS") or "").strip())
DUAL_YEAR_FROM = os.environ.get("DUAL_YEAR_FROM") or "2026-01-01"
DUAL_LIMIT = int(os.environ.get("DUAL_LIMIT") or 0)
DUAL_TAG = "ncaa_dual_unverified_division"

# ---------------------------------------------------------------- classifier
D1_CONF = [
    (r"\bACC\b|atlantic coast", "ACC"),
    (r"\bB1G\b|big ten|bigten", "Big Ten"),
    (r"\bSEC\b", "SEC"),
    (r"pac[- ]?12|pac 12", "Pac-12"),
    (r"big 12|big twelve", "Big 12"),
    (r"\bAAC\b|american athletic|american (swimming|womens|women|mens|men)",
     "American"),
    (r"atlantic 10|\bA-?10\b", "Atlantic 10"),
    (r"america east", "America East"),
    (r"atlantic sun|\bASUN\b", "ASUN"),
    (r"big east", "Big East"),
    (r"big west", "Big West"),
    (r"\bCAA\b|colonial athletic", "CAA"),
    (r"conference usa|\bC-?USA\b", "Conference USA"),
    (r"\bCCSA\b|coastal collegiate|coastal conference", "CCSA"),
    (r"horizon league", "Horizon League"),
    (r"ivy league", "Ivy League"),
    (r"\bMAAC\b|metro atlantic", "MAAC"),
    (r"\bMAC\b|mid[- ]american", "MAC"),
    (r"missouri valley|\bMVC\b", "Missouri Valley"),
    (r"mountain west", "Mountain West"),
    (r"mountain pacific|\bMPSF\b", "MPSF"),
    (r"northeast conference|north east conference|\bNEC\b", "Northeast"),
    (r"patriot league", "Patriot League"),
    (r"summit league", "Summit League"),
    (r"sun belt", "Sun Belt"),
    (r"\bWAC\b|western athletic", "WAC"),
]
# multi-division championships that include D1 programs — kept separable
MULTIDIV_CONF = [
    (r"\bECAC\b", "ECAC"),
    (r"metropolitan", "Metropolitan"),
]
NOT_D1 = re.compile(
    r"division\s*iii|division\s*ii\b|\bd-?iii\b|\bNCAC\b|\bMIAC\b|\bSCIAC\b|"
    r"\bWIAC\b|\bUAA\b|liberal arts|landmark|new jersey athletic|\bNJAC\b|"
    r"midwest conference|\bSCAC\b|\bSAA\b|\bAMCC\b|\bNAIA\b|\bGLVC\b|"
    r"\bRMAC\b|rocky mountain|\bNSIC\b|\bGMAC\b|\bMEC\b|collegiate club|"
    r"\bPCSC\b|pacific collegiate|region\s*[1-4]\b", re.I)
D1_NATL = re.compile(r"NCAA\s*Div(ision)?\s*(I|1)\b(?!I)", re.I)
ZONE = re.compile(r"NCAA\s*ZONE\s*[A-E]\b", re.I)
CHAMPISH = re.compile(r"champ", re.I)

# meet_id -> (tag, label); championship meets whose name lacks "championship"
MANUAL_ADDS = {
    6973: ("ncaa_d1_conference", "MAAC"),   # "MAAC Swimming", 2021-03-27
    8853: ("ncaa_d1_conference", "WAC"),    # "WAC MenbWomen Swimming Diving"
}


def classify(name):
    """-> (tag, label) or (None, None)."""
    n = " " + (name or "").strip() + " "
    if ZONE.search(n):
        return "ncaa_zone", "NCAA Zone"
    if NOT_D1.search(n):
        return None, None
    if D1_NATL.search(n) and CHAMPISH.search(n):
        return "ncaa_d1_national", "NCAA D1 National"
    if not CHAMPISH.search(n):
        return None, None
    for pat, label in D1_CONF:
        if re.search(pat, n, re.I):
            return "ncaa_d1_conference", label
    for pat, label in MULTIDIV_CONF:
        if re.search(pat, n, re.I):
            return "ncaa_d1_conference_multidiv", label
    return None, None


def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute(
        """SELECT meet_id, meet_name, start_date FROM divemeets.meets
            WHERE sanction ILIKE '%%National Collegiate%%'
              AND start_date >= %s ORDER BY start_date""",
        (f"{YEAR_FROM}-01-01",))
    rows = cur.fetchall()

    picked = {}
    for meet_id, name, start in rows:
        tag, label = classify(name)
        if tag:
            picked[int(meet_id)] = (tag, label)
    for meet_id, (tag, label) in MANUAL_ADDS.items():
        picked.setdefault(meet_id, (tag, label))

    if INCLUDE_DUALS:
        # Only meets the championship classifier explicitly declined, so a
        # championship can never be demoted to a dual by this pass.
        cur.execute(
            """SELECT meet_id, meet_name FROM divemeets.meets
                WHERE sanction ILIKE '%%National Collegiate%%'
                  AND meet_type = 'NCAA Non Championship'
                  AND start_date >= %s
                  AND NOT results_done
                ORDER BY start_date DESC""",
            (DUAL_YEAR_FROM,))
        # classify() declines a meet for two different reasons -- "not a
        # championship" and "explicitly not D1". Only the first is a candidate
        # here, so NOT_D1 must be re-applied or D2/D3 meets whose names DO
        # carry a division marker (e.g. "NCAA Division III Region 1 Diving
        # Championships") get queued as duals. Caught in production 2026-08-09.
        duals = [r for r in cur.fetchall()
                 if int(r[0]) not in picked and not NOT_D1.search(r[1] or "")]
        if DUAL_LIMIT:
            duals = duals[:DUAL_LIMIT]
        for meet_id, name in duals:
            picked[int(meet_id)] = (DUAL_TAG, "dual/tri - division unverified")
        print(f"duals: queued {len(duals)} from {DUAL_YEAR_FROM}"
              f"{f' (limit {DUAL_LIMIT})' if DUAL_LIMIT else ''}")

    counts = {}
    for tag, _ in picked.values():
        counts[tag] = counts.get(tag, 0) + 1
    print(f"scanned {len(rows)} NCAA meets since {YEAR_FROM}")
    for tag in sorted(counts):
        print(f"  {tag:32s} {counts[tag]:4d}")
    print(f"  {'TOTAL':32s} {len(picked):4d}")

    if DRY_RUN:
        print("DRY_RUN — nothing written")
        return counts

    cur.executemany(
        """INSERT INTO divemeets.crawl_targets (meet_id, tag, label)
           VALUES (%s, %s, %s)
           ON CONFLICT (meet_id) DO UPDATE
             SET tag = EXCLUDED.tag, label = EXCLUDED.label""",
        [(mid, t, l) for mid, (t, l) in sorted(picked.items())])
    conn.commit()

    # Self-heal: purge any dual-tagged meet whose name DOES carry a non-D1
    # marker. The first release of the dual pass skipped NOT_D1 and queued the
    # 2026 D3 Region 1-4 championships. Idempotent; safe on every run.
    cur.execute(
        """DELETE FROM divemeets.crawl_targets t
             USING divemeets.meets m
             WHERE t.meet_id = m.meet_id AND t.tag = %s
               AND m.meet_name ~* %s""",
        (DUAL_TAG,
         r'(division\s*iii|division\s*ii\y|\yd-?iii\y|\yNCAC\y|\yMIAC\y'
         r'|\ySCIAC\y|\yWIAC\y|\yUAA\y|liberal arts|landmark'
         r'|new jersey athletic|\yNJAC\y|midwest conference|\ySCAC\y|\ySAA\y'
         r'|\yAMCC\y|\yNAIA\y|\yGLVC\y|\yRMAC\y|rocky mountain|\yNSIC\y'
         r'|\yGMAC\y|\yMEC\y|collegiate club|\yPCSC\y|pacific collegiate'
         r'|region\s*[1-4]\y)'))
    if cur.rowcount:
        print(f"purged {cur.rowcount} non-D1 meets wrongly tagged {DUAL_TAG}")
    conn.commit()

    cur.execute(
        """SELECT t.tag, count(*),
                  sum(CASE WHEN m.results_done THEN 1 ELSE 0 END),
                  sum(CASE WHEN m.sheets_done  THEN 1 ELSE 0 END)
             FROM divemeets.crawl_targets t
             JOIN divemeets.meets m USING (meet_id)
            GROUP BY 1 ORDER BY 1""")
    state = cur.fetchall()
    print("\nqueue state (tag, targets, results_done, sheets_done):")
    for r in state:
        print("  ", r)

    cur.execute(
        """INSERT INTO app_meta.config (key, value, description)
           VALUES ('dm_targets_last_seed', %s, 'queue_ncaa_targets.py')
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
             updated_at = now()""",
        (json.dumps({"at": datetime.now(timezone.utc).isoformat(),
                     "year_from": YEAR_FROM, "counts": counts,
                     "total": len(picked)}),))
    conn.commit()
    cur.close()
    conn.close()
    return counts


if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback
        traceback.print_exc()
        sys.exit(1)
