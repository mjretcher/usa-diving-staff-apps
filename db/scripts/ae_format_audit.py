#!/usr/bin/env python3
"""READ-ONLY: what event formats exist, and are cumulative scores flagged?"""
import os, psycopg2
conn=psycopg2.connect(os.environ["DATABASE_URL"]); conn.set_session(readonly=True,autocommit=True)
cur=conn.cursor()
def show(t,sql,h):
    print("\n"+"="*92); print(t); print("="*92)
    cur.execute(sql); rows=cur.fetchall()
    if not rows: print("  (none)"); return
    w=[max(len(str(x)),max((len(str(r[i])) for r in rows),default=0)) for i,x in enumerate(h)]
    print("  "+"  ".join(str(x).ljust(w[i]) for i,x in enumerate(h)))
    print("  "+"  ".join("-"*w[i] for i in range(len(h))))
    for r in rows: print("  "+"  ".join(str(v).ljust(w[i]) for i,v in enumerate(r)))
show("3m: score range by dive count and cumulative flag",
 """SELECT phase_dive_count dives, COALESCE(score_is_cumulative::text,'(null)') cumul,
           COUNT(*) n,
           ROUND(MIN(posted_score)::numeric,1) lo,
           ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY posted_score))::numeric,1) med,
           ROUND(MAX(posted_score)::numeric,1) hi
    FROM core.result_phases
    WHERE discipline='3m' AND posted_score IS NOT NULL
    GROUP BY 1,2 HAVING COUNT(*)>50 ORDER BY 1 NULLS LAST, 2""",
 ["dives","cumulative","n","min","median","max"])
show("Does the cumulative flag explain the 900+ scores?",
 """SELECT COALESCE(score_is_cumulative::text,'(null)') cumul,
           COALESCE(score_analysis_mode,'(null)') mode,
           COUNT(*) n, ROUND(AVG(posted_score)::numeric,1) avg_score,
           ROUND(AVG(phase_dive_count)::numeric,1) avg_dives
    FROM core.result_phases
    WHERE discipline='3m' AND posted_score >= 900
    GROUP BY 1,2 ORDER BY n DESC LIMIT 10""",
 ["cumulative","mode","n","avg_score","avg_dives"])
show("Coverage: how usable are these columns?",
 """SELECT COUNT(*) total,
           COUNT(phase_dive_count) has_dive_count,
           COUNT(*) FILTER (WHERE score_is_cumulative IS TRUE) cumulative_rows,
           COUNT(*) FILTER (WHERE score_is_cumulative IS NULL) unflagged
    FROM core.result_phases WHERE posted_score IS NOT NULL""",
 ["total","has_dive_count","cumulative","unflagged"])
cur.close(); conn.close()
