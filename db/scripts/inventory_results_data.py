#!/usr/bin/env python3
"""
Inventory what results we actually hold, before anyone crawls anything.

An earlier probe concluded we had no invitational results. That probe filtered
on year >= 2024 AND age_group IN (Group A..D) -- both of which a non-circuit
meet could easily fail, because the classification logic that populates
age_group was written for circuit meets. A negative result under those filters
says nothing about whether the data exists.

This looks at the raw scrape and the canonical table side by side, with no
filters, so the difference between "never scraped" and "scraped but never
classified" is visible. Those need completely different fixes.

Env: DATABASE_URL (Neon). Writes membership-analytics/data-inventory.json
"""
import json
import os
import sys
import datetime

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "membership-analytics", "data-inventory.json")

QUERIES = {
    # --- canonical table, unfiltered ---
    "core_by_year_stage": """
        SELECT year, COALESCE(stage,'(null)') stage,
               COALESCE(event_level,'(null)') lvl,
               count(*)::int rows, count(DISTINCT meet_id_dm)::int meets
        FROM core.event_results GROUP BY 1,2,3 ORDER BY 1,2,3
    """,
    "core_age_group_fill": """
        SELECT COALESCE(stage,'(null)') stage,
               count(*)::int rows,
               count(*) FILTER (WHERE age_group IS NOT NULL)::int with_age,
               count(*) FILTER (WHERE discipline IS NOT NULL)::int with_disc,
               count(*) FILTER (WHERE score IS NOT NULL)::int with_score
        FROM core.event_results GROUP BY 1 ORDER BY 2 DESC
    """,
    # --- raw scrape ---
    "dm_meets_by_year": """
        SELECT EXTRACT(YEAR FROM start_date)::int yr,
               COALESCE(sanction,'(null)') sanction,
               count(*)::int meets
        FROM divemeets.meets
        WHERE start_date IS NOT NULL
        GROUP BY 1,2 ORDER BY 1,2
    """,
    "dm_results_by_year": """
        SELECT EXTRACT(YEAR FROM m.start_date)::int yr,
               COALESCE(m.sanction,'(null)') sanction,
               count(DISTINCT r.meet_id)::int meets_with_results,
               count(*)::int rows
        FROM divemeets.results r
        JOIN divemeets.meets m ON m.meet_id = r.meet_id
        GROUP BY 1,2 ORDER BY 1,2
    """,
    "column_types": """
        SELECT table_schema||'.'||table_name tbl, column_name col, data_type typ
        FROM information_schema.columns
        WHERE (table_schema='core' AND table_name='event_results'
               AND column_name IN ('meet_id_dm','diver_id_dm','year','place'))
           OR (table_schema='divemeets' AND table_name IN ('results','meets')
               AND column_name IN ('meet_id','event_id','profile_id'))
        ORDER BY 1,2
    """,
    # Feasibility: promoting those rows means parsing age group, gender and
    # discipline out of event titles. Championship titles are house style;
    # invitational titles are whatever the host typed. Sample them before
    # promising anything.
    "invitational_event_titles": """
        SELECT e.title, count(DISTINCT e.meet_id)::int meets, count(*)::int events
        FROM divemeets.events e
        JOIN divemeets.meets m ON m.meet_id = e.meet_id
        WHERE m.sanction = 'USA Diving'
          AND NOT EXISTS (SELECT 1 FROM core.event_results c
                          WHERE c.meet_id_dm::text = e.meet_id::text)
          AND e.title IS NOT NULL
        GROUP BY 1 ORDER BY 3 DESC LIMIT 40
    """,
    "invitational_title_shape": """
        SELECT count(*)::int events,
               count(*) FILTER (WHERE e.title ~* '(1m|3m|platform|5m|7\\.5m|10m)')::int has_board,
               count(*) FILTER (WHERE e.title ~* '(boys|girls|men|women|male|female)')::int has_gender,
               count(*) FILTER (WHERE e.title ~* '(group [a-d]|1[1-8]|under|u1[0-9]|9-10|11-12|12-13|14-15|16-18)')::int has_age,
               count(*) FILTER (WHERE e.title ~* 'synchro')::int synchro
        FROM divemeets.events e
        JOIN divemeets.meets m ON m.meet_id = e.meet_id
        WHERE m.sanction = 'USA Diving'
          AND NOT EXISTS (SELECT 1 FROM core.event_results c
                          WHERE c.meet_id_dm::text = e.meet_id::text)
    """,
    # The gap that matters: meets we scraped results for that never made it
    # into the canonical table.
    "scraped_not_canonical": """
        SELECT EXTRACT(YEAR FROM m.start_date)::int yr,
               COALESCE(m.sanction,'(null)') sanction,
               count(DISTINCT r.meet_id)::int meets, count(*)::int rows
        FROM divemeets.results r
        JOIN divemeets.meets m ON m.meet_id = r.meet_id
        WHERE NOT EXISTS (
            SELECT 1 FROM core.event_results c
            WHERE c.meet_id_dm::text = r.meet_id::text)
        GROUP BY 1,2 ORDER BY 1,2
    """,
}


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")
    conn = psycopg2.connect(dsn)
    out = {"generated": datetime.datetime.now(datetime.timezone.utc)
                                .strftime("%Y-%m-%dT%H:%M:%SZ"),
           "note": "Unfiltered inventory. 'scraped_not_canonical' is the set that "
                   "exists in the raw scrape but was never promoted into "
                   "core.event_results -- present but unusable, which is a very "
                   "different problem from absent."}

    for name, sql in QUERIES.items():
        cur = conn.cursor()
        try:
            cur.execute(sql)
            cols = [c[0] for c in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
            out[name] = rows
            print(f"\n=== {name} ({len(rows)} rows) ===")
            for r in rows[:60]:
                print("   " + "  ".join(f"{k}={v}" for k, v in r.items()))
            if len(rows) > 60:
                print(f"   ... {len(rows)-60} more")
        except Exception as e:
            conn.rollback()
            out[name] = {"error": str(e).strip()}
            print(f"\n=== {name} FAILED ===\n   {str(e).strip()[:200]}")
        finally:
            cur.close()

    conn.close()
    with open(TARGET, "w") as fh:
        json.dump(out, fh, indent=2, default=str)
    print(f"\nwrote {TARGET}")


if __name__ == "__main__":
    main()
