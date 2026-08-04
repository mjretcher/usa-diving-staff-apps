#!/usr/bin/env python3
"""
ae_taxonomy_audit.py — READ-ONLY audit of dive-category coverage in
core.dive_sheets, ahead of the Athlete Evaluation dive-group rebuild.

Answers four questions against live data:
  1. How do twisting dives (5xxx) split by underlying direction?
  2. How many armstand dives (6xxx) are missing a category code/label?
  3. How many malformed (concatenated) dive numbers sit on INDIVIDUAL
     disciplines with a usable score+dd — i.e. are polluting
     analytics.field_group_exec right now?
  4. What comparison scopes actually exist in field_group_exec, and how
     much data is behind each?

Writes nothing. Prints to stdout so results land in the Actions run log.
"""
import os
import sys
import psycopg2

DSN = os.environ.get("DATABASE_URL")
if not DSN:
    sys.exit("DATABASE_URL not set")

INDIV = "('1m','3m','Platform')"


def show(title, sql, headers):
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)
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
    return rows


conn = psycopg2.connect(DSN)
conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()

print("Athlete Evaluation — dive taxonomy audit (read-only)")

show(
    "0. Baseline row counts",
    f"""SELECT
         COUNT(*)                                                   AS all_rows,
         COUNT(*) FILTER (WHERE discipline IN {INDIV})              AS individual_rows,
         COUNT(*) FILTER (WHERE discipline IN {INDIV}
                            AND score IS NOT NULL AND dd > 0)       AS in_field_stats,
         MIN(meet_year) AS first_year, MAX(meet_year) AS last_year
       FROM core.dive_sheets""",
    ["all_rows", "individual", "in_field_stats", "y0", "y1"],
)

show(
    "1. TWISTERS (5xxx) — split by underlying direction (2nd digit)",
    f"""SELECT SUBSTRING(dive_number FROM 2 FOR 1) AS dir_digit,
              CASE SUBSTRING(dive_number FROM 2 FOR 1)
                   WHEN '1' THEN 'Forward twisting'
                   WHEN '2' THEN 'Back twisting'
                   WHEN '3' THEN 'Reverse twisting'
                   WHEN '4' THEN 'Inward twisting'
                   ELSE 'UNEXPECTED' END AS resolved_group,
              COUNT(*) AS n,
              COUNT(DISTINCT diver_id) AS divers,
              ROUND(AVG(LEAST(score/(3*dd),10))::numeric,3) AS avg_exec
       FROM core.dive_sheets
       WHERE dive_number LIKE '5%' AND LENGTH(dive_number) <= 5
         AND discipline IN {INDIV} AND score IS NOT NULL AND dd > 0
       GROUP BY 1,2 ORDER BY 1""",
    ["digit", "resolved_group", "n", "divers", "avg_exec"],
)

show(
    "2. ARMSTANDS (6xxx) — direction split + category-code coverage",
    f"""SELECT SUBSTRING(dive_number FROM 2 FOR 1) AS dir_digit,
              COUNT(*) AS n,
              COUNT(*) FILTER (WHERE COALESCE(dive_category_code,'') = '') AS blank_code,
              COUNT(*) FILTER (WHERE COALESCE(dive_category_label,'') = '') AS blank_label,
              ROUND(AVG(LEAST(score/(3*dd),10))::numeric,3) AS avg_exec
       FROM core.dive_sheets
       WHERE dive_number LIKE '6%' AND LENGTH(dive_number) <= 5
         AND discipline IN {INDIV} AND score IS NOT NULL AND dd > 0
       GROUP BY 1 ORDER BY 1""",
    ["digit", "n", "blank_code", "blank_label", "avg_exec"],
)

show(
    "3. CATEGORY-CODE COVERAGE by leading digit (individual disciplines)",
    f"""SELECT LEFT(dive_number,1) AS lead,
              COUNT(*) AS n,
              COUNT(*) FILTER (WHERE COALESCE(dive_category_code,'')  = '') AS blank_code,
              COUNT(*) FILTER (WHERE COALESCE(dive_category_label,'') = '') AS blank_label
       FROM core.dive_sheets
       WHERE discipline IN {INDIV} AND dive_number IS NOT NULL
       GROUP BY 1 ORDER BY 1""",
    ["lead", "n", "blank_code", "blank_label"],
)

show(
    "4. MALFORMED dive numbers on INDIVIDUAL disciplines (>5 chars = concatenated)",
    f"""SELECT LENGTH(dive_number) AS len,
              COUNT(*) AS n,
              COUNT(*) FILTER (WHERE score IS NOT NULL AND dd > 0) AS polluting_field_stats,
              MIN(dive_number) AS example,
              ROUND(MIN(dd)::numeric,3) AS min_dd, ROUND(MAX(dd)::numeric,3) AS max_dd
       FROM core.dive_sheets
       WHERE discipline IN {INDIV} AND LENGTH(dive_number) > 5
       GROUP BY 1 ORDER BY 1""",
    ["len", "n", "polluting", "example", "min_dd", "max_dd"],
)

show(
    "4b. Execution impact of those malformed rows vs clean rows",
    f"""SELECT CASE WHEN LENGTH(dive_number) > 5 THEN 'malformed' ELSE 'clean' END AS bucket,
              COUNT(*) AS n,
              ROUND(AVG(LEAST(score/(3*dd),10))::numeric,3) AS avg_exec,
              ROUND(AVG(CASE WHEN score/(3*dd) < 4.5 THEN 1 ELSE 0 END)::numeric,4) AS fail_rate
       FROM core.dive_sheets
       WHERE discipline IN {INDIV} AND score IS NOT NULL AND dd > 0
         AND dive_number IS NOT NULL
       GROUP BY 1 ORDER BY 1""",
    ["bucket", "n", "avg_exec", "fail_rate"],
)

show(
    "5. SCOPES available in analytics.field_group_exec",
    """SELECT scope, COUNT(*) AS grain_rows, SUM(n) AS dives,
              MIN(meet_year) AS y0, MAX(meet_year) AS y1,
              COUNT(DISTINCT category_code) AS categories
       FROM analytics.field_group_exec
       GROUP BY 1 ORDER BY dives DESC""",
    ["scope", "grain_rows", "dives", "y0", "y1", "cats"],
)

show(
    "6. Scope x discipline depth (is us-senior usable as a comparison field?)",
    """SELECT scope, discipline, gender, SUM(n) AS dives
       FROM analytics.field_group_exec
       WHERE meet_year >= 2024
       GROUP BY 1,2,3 ORDER BY 1,2,3""",
    ["scope", "discipline", "gender", "dives"],
)

print("\nAudit complete — no writes performed.")
cur.close()
conn.close()
