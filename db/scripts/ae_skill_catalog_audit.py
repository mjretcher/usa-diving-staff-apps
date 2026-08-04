#!/usr/bin/env python3
"""
ae_skill_catalog_audit.py — READ-ONLY. Separates real rulebook dive numbers
from non-rulebook "skills" (001A etc., used almost exclusively in novice /
age-group / junior events), so skills can live in their own catalog instead
of being silently miscategorised or dropped.

Rulebook grammar (position letter A/B/C/D, optionally suffixed):
  groups 1-4   G + flying(0|1) + half-somersaults + letter        105B, 405C
  group 5      5 + direction(1-4) + soms + half-twists + letter   5152B, 5337D
  group 6      6 + direction(1-3) + soms [+ twists] + letter      612B, 6243D
Anything else -> SKILL.
"""
import os, sys, psycopg2

DSN = os.environ.get("DATABASE_URL")
if not DSN:
    sys.exit("DATABASE_URL not set")

INDIV = "('1m','3m','Platform')"
# POSIX regex for a valid rulebook dive number
VALID = r'^([1-4][01][0-9]|5[1-4][0-9][0-9]|6[1-3][0-9][0-9]?)[ABCD]$'


def show(title, sql, headers, limit_note=None):
    print("\n" + "=" * 78)
    print(title)
    print("=" * 78)
    cur.execute(sql)
    rows = cur.fetchall()
    if not rows:
        print("  (no rows)")
        return rows
    w = [max(len(str(h)), max((len(str(r[i])) for r in rows), default=0)) for i, h in enumerate(headers)]
    print("  " + "  ".join(str(h).ljust(w[i]) for i, h in enumerate(headers)))
    print("  " + "  ".join("-" * w[i] for i in range(len(headers))))
    for r in rows:
        print("  " + "  ".join(str(v).ljust(w[i]) for i, v in enumerate(r)))
    if limit_note:
        print("  " + limit_note)
    return rows


conn = psycopg2.connect(DSN)
conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()
print("Athlete Evaluation — rulebook dive vs. skill audit (read-only)")

show("0. Split: valid rulebook dive numbers vs. everything else",
     f"""SELECT CASE WHEN dive_number ~ '{VALID}' THEN 'rulebook dive' ELSE 'NOT rulebook' END AS kind,
                COUNT(*) AS n,
                COUNT(DISTINCT dive_number) AS distinct_numbers,
                COUNT(DISTINCT diver_id) AS divers,
                MIN(meet_year) AS y0, MAX(meet_year) AS y1
         FROM core.dive_sheets
         WHERE discipline IN {INDIV} AND dive_number IS NOT NULL AND dive_number <> ''
         GROUP BY 1 ORDER BY n DESC""",
     ["kind", "n", "distinct_numbers", "divers", "y0", "y1"])

show("1. Top 40 NON-rulebook numbers — the skill candidates",
     f"""SELECT dive_number, COUNT(*) AS n,
                COUNT(DISTINCT diver_id) AS divers,
                MODE() WITHIN GROUP (ORDER BY description) AS common_description,
                MODE() WITHIN GROUP (ORDER BY discipline)  AS common_discipline,
                ROUND(MIN(dd)::numeric,2) AS min_dd, ROUND(MAX(dd)::numeric,2) AS max_dd,
                MIN(meet_year) AS y0, MAX(meet_year) AS y1
         FROM core.dive_sheets
         WHERE discipline IN {INDIV} AND dive_number IS NOT NULL AND dive_number <> ''
           AND dive_number !~ '{VALID}'
         GROUP BY 1 ORDER BY n DESC LIMIT 40""",
     ["dive_number", "n", "divers", "common_description", "disc", "min_dd", "max_dd", "y0", "y1"])

show("2. Where do non-rulebook numbers appear? (event context)",
     f"""SELECT CASE WHEN event_name ILIKE 'group%'   THEN 'junior (Group A-D)'
                     WHEN event_name ILIKE '%senior%' THEN 'senior'
                     WHEN event_name ILIKE '%novice%' THEN 'novice'
                     WHEN competition_family = 'NCAA' THEN 'NCAA'
                     WHEN competition_family = 'World Aquatics' THEN 'world'
                     ELSE 'other / open' END AS context,
                COUNT(*) FILTER (WHERE dive_number !~ '{VALID}') AS skills,
                COUNT(*) FILTER (WHERE dive_number ~  '{VALID}') AS rulebook,
                ROUND(100.0 * COUNT(*) FILTER (WHERE dive_number !~ '{VALID}')
                      / NULLIF(COUNT(*),0), 1) AS pct_skill
         FROM core.dive_sheets
         WHERE discipline IN {INDIV} AND dive_number IS NOT NULL AND dive_number <> ''
         GROUP BY 1 ORDER BY skills DESC""",
     ["context", "skills", "rulebook", "pct_skill"])

show("3. Do skills carry scores? (are they scored competition dives)",
     f"""SELECT CASE WHEN score IS NOT NULL AND dd > 0 THEN 'scored (score+dd)'
                     WHEN score IS NOT NULL             THEN 'score, no dd'
                     ELSE 'unscored' END AS status,
                COUNT(*) AS n
         FROM core.dive_sheets
         WHERE discipline IN {INDIV} AND dive_number IS NOT NULL AND dive_number <> ''
           AND dive_number !~ '{VALID}'
         GROUP BY 1 ORDER BY n DESC""",
     ["status", "n"])

show("4. Sanity check — armstands (6xxx) that PASS the rulebook test",
     f"""SELECT LEFT(dive_number,2) AS prefix, COUNT(*) AS n,
                COUNT(DISTINCT dive_number) AS distinct_numbers,
                MODE() WITHIN GROUP (ORDER BY description) AS common_description
         FROM core.dive_sheets
         WHERE discipline IN {INDIV} AND dive_number LIKE '6%'
           AND dive_number ~ '{VALID}'
         GROUP BY 1 ORDER BY 1""",
     ["prefix", "n", "distinct", "common_description"])

show("5. Distinct-count of skills, to size the catalog table",
     f"""SELECT COUNT(*) AS distinct_skill_numbers,
                SUM(n) AS total_skill_rows
         FROM (SELECT dive_number, COUNT(*) AS n
               FROM core.dive_sheets
               WHERE discipline IN {INDIV} AND dive_number IS NOT NULL AND dive_number <> ''
                 AND dive_number !~ '{VALID}'
               GROUP BY 1) s""",
     ["distinct_skill_numbers", "total_skill_rows"])

print("\nAudit complete — no writes performed.")
cur.close(); conn.close()
