#!/usr/bin/env python3
"""
Classify every DiveMeets event title into age group, gender and discipline, and
store the result as a lookup keyed on (meet_id, event_id, round).

WHY A LOOKUP RATHER THAN PROMOTING ROWS
    342,404 result rows sit unclassified, spanning only ~28k distinct event
    titles. Classifying titles and joining at query time is a fraction of the
    work and leaves one source of truth. Critically it also keeps this out of
    core.event_results: that table is what the junior qualification pipeline
    reads, and inserting parser-classified invitational rows into the table
    that decides who advances is how existing numbers change without anyone
    noticing.

WHAT CONSUMERS MUST DO
    Every row carries `sanction` and `in_circuit`. USA Diving invitationals are
    the population a score standard should be calibrated against. AAU and NCAA
    are useful for membership and retention work but are a different population
    and must never be pooled into a USA Diving qualifying field.

Env: DATABASE_URL (Neon). Reports coverage to
     membership-analytics/event-class-coverage.json
"""
import json
import os
import sys
import datetime
import collections

import psycopg2
from psycopg2.extras import execute_values

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from event_title_parser import parse_title, selftest  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "membership-analytics", "event-class-coverage.json")

DDL = """
CREATE TABLE IF NOT EXISTS divemeets.event_class (
    meet_id       INTEGER NOT NULL,
    event_id      INTEGER NOT NULL,
    round         TEXT    NOT NULL,
    title         TEXT,
    sanction      TEXT,
    meet_year     SMALLINT,
    age_group     TEXT,
    gender        TEXT,
    discipline    TEXT,
    round_label   TEXT,
    is_synchro    BOOLEAN DEFAULT FALSE,
    parsed_ok     BOOLEAN DEFAULT FALSE,
    in_circuit    BOOLEAN DEFAULT FALSE,
    classified_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (meet_id, event_id, round)
);
CREATE INDEX IF NOT EXISTS idx_evclass_sanction ON divemeets.event_class(sanction, meet_year);
CREATE INDEX IF NOT EXISTS idx_evclass_cell ON divemeets.event_class(age_group, gender, discipline);
"""

READ = """
SELECT e.meet_id, e.event_id, e.round, e.title,
       COALESCE(m.sanction,'(unknown)') sanction,
       EXTRACT(YEAR FROM m.start_date)::int yr,
       EXISTS (SELECT 1 FROM core.event_results c
               WHERE c.meet_id_dm::text = e.meet_id::text) in_circuit
FROM divemeets.events e
LEFT JOIN divemeets.meets m ON m.meet_id = e.meet_id
"""

UPSERT = """
INSERT INTO divemeets.event_class
 (meet_id,event_id,round,title,sanction,meet_year,age_group,gender,discipline,
  round_label,is_synchro,parsed_ok,in_circuit,classified_at)
VALUES %s
ON CONFLICT (meet_id,event_id,round) DO UPDATE SET
  title=EXCLUDED.title, sanction=EXCLUDED.sanction, meet_year=EXCLUDED.meet_year,
  age_group=EXCLUDED.age_group, gender=EXCLUDED.gender, discipline=EXCLUDED.discipline,
  round_label=EXCLUDED.round_label, is_synchro=EXCLUDED.is_synchro,
  parsed_ok=EXCLUDED.parsed_ok, in_circuit=EXCLUDED.in_circuit,
  classified_at=EXCLUDED.classified_at
"""


def main():
    if not selftest():
        sys.exit("parser self-test failed; refusing to classify anything")
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL not set")

    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    cur.execute(DDL)
    conn.commit()

    cur.execute(READ)
    rows = cur.fetchall()
    print(f"event rows to classify: {len(rows)}")

    now = datetime.datetime.now(datetime.timezone.utc)
    payload, stats, unparsed = [], collections.Counter(), collections.Counter()
    for meet_id, event_id, rnd, title, sanction, yr, in_circuit in rows:
        p = parse_title(title)
        payload.append((meet_id, event_id, rnd, title, sanction, yr,
                        p['age_group'], p['gender'], p['discipline'],
                        p['round_label'], p['is_synchro'], p['parsed_ok'],
                        in_circuit, now))
        key = (sanction, bool(in_circuit))
        stats[key + ('total',)] += 1
        if p['parsed_ok']:
            stats[key + ('ok',)] += 1
        else:
            unparsed[(title or '(null)')[:70]] += 1

    for i in range(0, len(payload), 5000):
        execute_values(cur, UPSERT, payload[i:i+5000], page_size=1000)
    conn.commit()

    cur.execute("""
        SELECT sanction, in_circuit,
               count(*)::int events,
               count(*) FILTER (WHERE parsed_ok)::int ok,
               count(DISTINCT meet_id)::int meets
        FROM divemeets.event_class GROUP BY 1,2 ORDER BY 3 DESC""")
    summary = [{"sanction": r[0], "in_circuit": r[1], "events": r[2],
                "parsed": r[3], "meets": r[4],
                "pct": round(r[3] / r[2] * 100, 1) if r[2] else 0}
               for r in cur.fetchall()]

    # How much of the unused pile actually became usable.
    cur.execute("""
        SELECT count(*)::int
        FROM divemeets.results r
        JOIN divemeets.event_class c
          ON c.meet_id = r.meet_id AND c.event_id = r.event_id AND c.round = r.round
        WHERE c.parsed_ok AND NOT c.in_circuit AND c.sanction = 'USA Diving'
          AND NOT c.is_synchro""")
    usable = cur.fetchone()[0]

    cur.close()
    conn.close()

    print("\ncoverage:")
    for s in summary:
        tag = "circuit" if s["in_circuit"] else "other  "
        print(f"   {s['sanction']:38} {tag} {s['events']:6} events "
              f"{s['parsed']:6} parsed ({s['pct']:5.1f}%)  {s['meets']:4} meets")
    print(f"\nUSA Diving non-circuit individual result rows now classified: {usable:,}")
    print("\ntop unparsed titles:")
    for t, n in unparsed.most_common(25):
        print(f"   {n:5}  {t!r}")

    out = {"generated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
           "note": "sanction and in_circuit are on every row. USA Diving non-circuit "
                   "events are the invitational population; AAU and NCAA are a "
                   "different population and must not be pooled into a USA Diving "
                   "qualifying field.",
           "summary": summary,
           "usable_usad_noncircuit_rows": usable,
           "top_unparsed": [{"title": t, "events": n} for t, n in unparsed.most_common(60)]}
    with open(TARGET, "w") as fh:
        json.dump(out, fh, indent=2)
    print(f"\nwrote {TARGET}")


if __name__ == "__main__":
    main()
