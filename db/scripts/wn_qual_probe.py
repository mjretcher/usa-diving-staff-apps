#!/usr/bin/env python3
"""Read-only look at what core.result_phases holds for the meets named in the
2026 Winter Nationals criteria (Table 2), before building a qualifying-score check.
Counts and meet names only; no athlete rows. Output committed to db/audits."""
import os, psycopg2
conn = psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True); cur = conn.cursor()
def q(title, sql, args=None):
    print("\n## " + title); cur.execute(sql, args or ())
    print(" | ".join(d[0] for d in cur.description))
    for r in cur.fetchall(): print(" | ".join("" if v is None else str(v) for v in r))
q("columns", "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='core' AND table_name='result_phases' ORDER BY ordinal_position")
q("families 2025-26", """SELECT meet_year, competition_family, competition_group, ncaa_division, event_level, count(*) AS rows, count(DISTINCT meet_id) AS meets
  FROM core.result_phases WHERE meet_year IN (2025,2026) AND COALESCE(is_synchronized,false)=false GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5""")
q("USA Diving senior-side meets 2025-26", """SELECT meet_year, meet_id, meet_name, competition_family, competition_group, count(*) AS rows, count(DISTINCT diver_id) AS divers
  FROM core.result_phases WHERE meet_year IN (2025,2026) AND (meet_name ILIKE '%%national%%' OR meet_name ILIKE '%%world%%' OR meet_name ILIKE '%%trials%%') AND COALESCE(is_synchronized,false)=false
  GROUP BY 1,2,3,4,5 ORDER BY 1,3""")
q("NCAA meets 2025-26 by family/group", """SELECT meet_year, competition_group, ncaa_division, count(DISTINCT meet_id) AS meets, count(*) AS rows, min(meet_name), max(meet_name)
  FROM core.result_phases WHERE meet_year IN (2025,2026) AND (competition_family ILIKE '%%ncaa%%' OR ncaa_division IS NOT NULL) GROUP BY 1,2,3 ORDER BY 1,2,3""")
q("rounds / dive counts / cumulative, senior-level 2025-26", """SELECT event_level, gender, discipline, event_round, round_stage, phase_dive_count, score_is_cumulative, count(*) AS rows
  FROM core.result_phases WHERE meet_year IN (2025,2026) AND event_level IN ('Senior','Open','College','NCAA') AND COALESCE(is_synchronized,false)=false
  GROUP BY 1,2,3,4,5,6,7 ORDER BY 8 DESC LIMIT 70""")
q("event_level x age_group values 2025-26", "SELECT event_level, age_group, gender, discipline, count(*) FROM core.result_phases WHERE meet_year IN (2025,2026) GROUP BY 1,2,3,4 ORDER BY 5 DESC LIMIT 60")
q("nat population", "SELECT (nat IS NULL OR nat='') AS nat_blank, count(*) FROM core.result_phases WHERE meet_year IN (2025,2026) GROUP BY 1")
q("role can read", "SELECT has_table_privilege('usad_app','core.result_phases','SELECT'), has_table_privilege('usad_app','core.dive_sheets','SELECT')")
