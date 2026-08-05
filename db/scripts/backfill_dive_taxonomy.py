#!/usr/bin/env python3
"""
backfill_dive_taxonomy.py — classify every dive_number in core.dive_sheets
using the canonical rulebook taxonomy, and seed core.dive_skills.

Efficient by design: there are only a few thousand DISTINCT dive numbers across
1.6M rows, so we classify the distinct set in Python and push the mapping back
as a single VALUES join per batch.

Idempotent — safe to re-run.
"""
import os, sys, psycopg2, psycopg2.extras
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dive_taxonomy import classify, SKILL_STEMS

DSN = os.environ.get("DATABASE_URL")
if not DSN:
    sys.exit("DATABASE_URL not set")

SKILL_NAMES = {
    "001": ("Forward entry (lineup)", "Art. 302.2(a)(3) / 401.4", False),
    "002": ("Back entry (lineup)",    "Art. 302.2(a)(3) / 401.4", False),
    "003": ("Entry (lineup, unlisted variant)", "not in rulebook", False),
    "100": ("Forward jump",           "Art. 401.4",  False),
    "200": ("Back jump",              "Art. 401.4",  False),
    "600": ("Armstand (unlisted variant of 620)", "not in rulebook", True),
    "620": ("Armstand lineup",        "Art. 503.15(d)", True),
    "5101": ("Forward jump 1/2 twist",  "Art. 401.4", False),
    "5102": ("Forward jump 1 twist",    "Art. 401.4", False),
    "5104": ("Forward jump 2 twists",   "Art. 401.4", False),
    "5201": ("Back jump 1/2 twist",     "Art. 401.4", False),
    "5203": ("Back jump 1 1/2 twists",  "Art. 401.4", False),
    "5205": ("Back jump 2 1/2 twists",  "Art. 401.4", False),
    "5301": ("Reverse jump 1/2 twist",  "Art. 503.15(d)", False),
    "5303": ("Reverse jump 1 1/2 twists", "Art. 503.15(d)", False),
}

conn = psycopg2.connect(DSN); conn.autocommit = False
cur = conn.cursor()

def log(m): print(m, flush=True)


def _record_failure(payload):
    """Persist the traceback to app_meta.config.

    Same reasoning as load_core.py: nothing outside GitHub Actions can read a
    job's logs, so a step that fails there is otherwise a bare red cross. This
    job failed once in 33 seconds with no way to see why, which is what
    prompted adding it. Uses its own connection because the failure may well
    have poisoned the outer transaction.
    """
    try:
        c = psycopg2.connect(DSN)
        k = c.cursor()
        k.execute("""INSERT INTO app_meta.config (key, value) VALUES (%s, %s)
                     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value""",
                  ("dive_taxonomy_last_error", payload[:60000]))
        c.commit(); k.close(); c.close()
    except Exception as e:
        print(f"could not record failure: {e}", flush=True)

try:
    log("Reading distinct dive numbers…")
    cur.execute("""SELECT DISTINCT dive_number FROM core.dive_sheets
                   WHERE dive_number IS NOT NULL AND dive_number <> ''""")
    codes = [r[0] for r in cur.fetchall()]
    log(f"  {len(codes):,} distinct codes")

    mapping, tally = [], {}
    for c in codes:
        r = classify(c)
        mapping.append((c, r["code"], r["bucket"], r["group_code"], r["group_label"]))
        tally[r["bucket"]] = tally.get(r["bucket"], 0) + 1
    log("  classified: " + ", ".join(f"{k}={v}" for k, v in sorted(tally.items())))

    log("Applying mapping to core.dive_sheets…")
    B = 500
    for i in range(0, len(mapping), B):
        chunk = mapping[i:i + B]
        psycopg2.extras.execute_values(cur, """
            UPDATE core.dive_sheets ds SET
              dive_code_norm   = v.norm,
              dive_bucket      = v.bucket,
              dive_group_code  = v.gcode,
              dive_group_label = v.glabel
            FROM (VALUES %s) AS v(raw, norm, bucket, gcode, glabel)
            WHERE ds.dive_number = v.raw
              AND (ds.dive_bucket IS DISTINCT FROM v.bucket
                   OR ds.dive_group_code IS DISTINCT FROM v.gcode)
        """, chunk)
        conn.commit()
        log(f"  {min(i+B, len(mapping)):,}/{len(mapping):,} codes applied")

    log("Seeding core.dive_skills…")
    rows = {}
    for c in codes:
        r = classify(c)
        if r["bucket"] != "skill":
            continue
        s = r["code"]
        stem = s[:-1] if s and s[-1] in "ABCD" else s
        name, cite, plat = SKILL_NAMES.get(stem, ("Skill (unlisted)", "not in rulebook", False))
        pos = {"A": "Straight", "B": "Pike", "C": "Tuck", "D": "Free"}.get(s[-1])
        # Keyed by canonical code, not appended, because several raw codes
        # normalise to one skill: '001B' arrives as '0001B', '001B' and 'OO1B'
        # (letter O for zero, straight from DiveMeets). Folding them is correct
        # — but proposing the same primary key twice in one INSERT is a
        # CardinalityViolation, which is how this job was failing. classify()
        # is deterministic, so every variant yields an identical payload and
        # last-write-wins is safe.
        rows[s] = (s, stem, s[-1] if pos else None,
                   f"{name}{' — ' + pos if pos else ''}", cite, plat, None)
    if rows:
        psycopg2.extras.execute_values(cur, """
            INSERT INTO core.dive_skills
              (code, stem, position_code, skill_name, rulebook_cite, platform_only, notes)
            VALUES %s
            ON CONFLICT (code) DO UPDATE SET
              skill_name = EXCLUDED.skill_name,
              rulebook_cite = EXCLUDED.rulebook_cite,
              platform_only = EXCLUDED.platform_only
        """, list(rows.values()))
        conn.commit()
    log(f"  {len(rows)} skill codes catalogued")

    log("\nFinal distribution:")
    cur.execute("""SELECT dive_bucket, dive_group_code, dive_group_label,
                          COUNT(*) AS n, COUNT(DISTINCT diver_id) AS divers
                   FROM core.dive_sheets
                   WHERE discipline IN ('1m','3m','Platform')
                   GROUP BY 1,2,3 ORDER BY 1, n DESC""")
    for b, g, l, n, d in cur.fetchall():
        log(f"  {str(b):14} {str(g):6} {str(l):34} {n:>9,}  {d:>6} divers")

    log("\nBackfill complete.")
    cur.close(); conn.close()

    # A clean run should now report zero rows updated: load_core.py classifies
    # every dive as it writes, so this is a standing check that the two agree
    # rather than the thing that puts the taxonomy there.
    cur.execute("""SELECT COUNT(*) FROM core.dive_sheets
                   WHERE dive_number IS NOT NULL AND dive_number <> ''
                     AND dive_bucket IS NULL""")
    log(f"\nrows still unclassified: {cur.fetchone()[0]:,}")
    _record_failure("")
except Exception:
    import traceback
    tb = traceback.format_exc()
    print(tb, flush=True)
    _record_failure(tb)
    raise
