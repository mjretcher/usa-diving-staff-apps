#!/usr/bin/env python3
"""
Write a small, readable summary of what junior_results.meet_entries currently
holds for a set of DiveMeets meets.

WHY: Actions log archives are not always reachable, and neither is Neon from
every environment. Without this, "did the sync actually land?" can only be
answered by opening the app. Committing a tiny status file to the repo makes
the answer inspectable from anywhere that can read the repo, and gives the
apps something to show a staff member who is wondering whether a zero on
screen means "no entries" or "never synced".

Env: DATABASE_URL (Neon), MEET_IDS (comma separated).
Writes: membership-analytics/entry-sync-status.json
"""
import json
import os
import sys
import datetime

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "membership-analytics", "entry-sync-status.json")

SQL = """
SELECT meet_id_dm,
       count(*)::int                                  AS events,
       COALESCE(sum(entries), 0)::int                 AS entries,
       COALESCE(sum(entries) FILTER (
           WHERE strpos(lower(COALESCE(discipline, '')), 'synchro') > 0
              OR strpos(lower(COALESCE(event_name, '')), 'synchro') > 0), 0)::int AS synchro,
       min(round)                                     AS min_round,
       max(round)                                     AS max_round,
       to_char(max(fetched_at), 'YYYY-MM-DD HH24:MI') AS fetched
FROM junior_results.meet_entries
WHERE meet_id_dm = ANY(%s)
GROUP BY 1
"""


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")
    ids = [m.strip() for m in os.environ.get("MEET_IDS", "").split(",") if m.strip()]
    if not ids:
        sys.exit("MEET_IDS not set")

    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute(SQL, (ids,))
    rows = {r[0]: {"events": r[1], "entries": r[2], "synchro": r[3],
                   "individual": r[2] - r[3], "min_round": r[4],
                   "max_round": r[5], "fetched": r[6]} for r in cur.fetchall()}
    cur.close()
    conn.close()

    meets = {}
    for m in ids:
        r = rows.get(m)
        # A meet with no row has never been synced. A meet with a row but zero
        # entries HAS been synced and genuinely has no signups yet. Those are
        # very different things and the apps must be able to tell them apart.
        meets[m] = r if r else {"events": 0, "entries": 0, "synchro": 0,
                                "individual": 0, "min_round": None,
                                "max_round": None, "fetched": None,
                                "never_synced": True}
        print(f"  meet {m}: {json.dumps(meets[m])}")

    out = {
        "generated": datetime.datetime.now(datetime.timezone.utc)
                             .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "junior_results.meet_entries",
        "note": "entries are one row per (meet, event); never_synced=true means "
                "no row exists at all, which is different from a synced meet "
                "with zero signups",
        "meets": meets,
    }
    with open(TARGET, "w") as fh:
        json.dump(out, fh, indent=2, sort_keys=True)
    print(f"wrote {TARGET}")


if __name__ == "__main__":
    main()
