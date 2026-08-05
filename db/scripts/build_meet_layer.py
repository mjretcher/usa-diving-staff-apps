#!/usr/bin/env python3
"""
build_meet_layer.py — the two reference tables behind Meet Replay.

Split out of build_analytics.py deliberately. That script drops and recreates
thirteen tables, which briefly takes the whole Athlete Evaluation app offline;
these two are additive and can be rebuilt on their own at any hour without
touching anything the app is already serving.

  analytics.dive_population  what each dive number normally scores, per level
  analytics.meet_directory   one searchable row per meet holding dive data

Runs as a second step of the nightly Analytics Refresh, and on demand.
"""
import os, sys, json, time, urllib.request, urllib.error

CONN = os.environ.get("NEON_DATABASE_URL") or ""
if not CONN:
    sys.exit("NEON_DATABASE_URL not set")

# HTTP SQL endpoint must hit the DIRECT host (no -pooler).
_host = CONN.split("@", 1)[1].split("/", 1)[0]
ENDPOINT = "https://" + _host.replace("-pooler", "") + "/sql"


def sql(query, params=None, retries=3):
    body = json.dumps({"query": query,
                       "params": [None if p is None else str(p) for p in (params or [])]}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={
        "Neon-Connection-String": CONN,
        "Content-Type": "application/json",
        "Neon-Raw-Text-Output": "false",
        "Neon-Array-Mode": "true",
    })
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            raise RuntimeError("SQL error %s: %s\n-- query: %s" % (e.code, e.read().decode()[:800], query[:300]))
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))


def rows(res):
    fields = [f["name"] for f in res.get("fields", [])]
    return [dict(zip(fields, r)) for r in res.get("rows", [])]


import scopes  # the single definition of competitive scope


def log(msg):
    print(msg, flush=True)


scopes.ensure(sql)
log("meet_scope built")

# ------------------------------------------------------- dive population
# What a given dive actually scores, per level. The point of this table is to
# make a single dive interpretable: 62.05 on a 107B means nothing on its own,
# but "78th percentile of 4,971 recorded 107Bs in US senior 3m" does.
#
# Grain: scope x gender x discipline x dive_number. Position is deliberately
# part of dive_number here (107B and 107C score differently even though Art.
# 105.2 treats them as the same dive for list-duplication purposes) — this is
# a scoring reference, not a list-legality check.
#
# Execution rather than raw score is the primary axis, because raw score is
# mostly a function of DD and would rank a poorly-executed hard dive above a
# well-executed simple one. Raw score percentiles are carried too, since the
# points on the board are what actually decides a meet.
#
# COACHING CONTEXT ONLY. This is computed from whatever the scraper has
# landed, so an athlete's percentile depends on how well their level is
# covered. It is not published in advance, and coverage is not uniform across
# athletes — it fails two of the three defensibility tests and must not enter
# binding selection criteria.
sql("DROP TABLE IF EXISTS analytics.dive_population")
sql("""CREATE TABLE analytics.dive_population AS
SELECT CASE WHEN competition_family='World Aquatics' AND meet_id IN (SELECT meet_id FROM analytics.meet_scope WHERE world_tier='world-inv') THEN 'world-inv'
            WHEN competition_family='World Aquatics' THEN 'world'
            WHEN competition_family='NCAA' THEN 'ncaa'
            WHEN event_name ILIKE '%senior%' THEN 'us-senior'
            WHEN event_name ILIKE 'group%' THEN 'us-junior'
            ELSE 'us-open' END AS scope,
       gender, discipline, dive_number,
       MAX(dive_group_code) AS group_code,
       MAX(dive_group_label) AS group_label,
       COUNT(*) AS n,
       COUNT(DISTINCT diver_id) AS n_divers,
       ROUND(AVG(dd)::numeric,2) AS avg_dd,
       ROUND(AVG(LEAST(score/(3*dd),10))::numeric,3) AS avg_exec,
       ROUND((PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY LEAST(score/(3*dd),10)))::numeric,3) AS p10_exec,
       ROUND((PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY LEAST(score/(3*dd),10)))::numeric,3) AS p25_exec,
       ROUND((PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY LEAST(score/(3*dd),10)))::numeric,3) AS p50_exec,
       ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY LEAST(score/(3*dd),10)))::numeric,3) AS p75_exec,
       ROUND((PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY LEAST(score/(3*dd),10)))::numeric,3) AS p90_exec,
       ROUND(STDDEV_SAMP(LEAST(score/(3*dd),10))::numeric,3) AS sd_exec,
       ROUND(AVG(score)::numeric,2) AS avg_score,
       ROUND((PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY score))::numeric,2) AS p50_score,
       ROUND((PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY score))::numeric,2) AS p90_score,
       ROUND(AVG(CASE WHEN score/(3*dd) < 4.5 THEN 1 ELSE 0 END)::numeric,4) AS fail_rate,
       MIN(meet_year) AS y0, MAX(meet_year) AS y1
FROM core.dive_sheets
WHERE discipline IN ('1m','3m','Platform')
  AND score IS NOT NULL AND dd > 0
  AND dive_bucket = 'dive'
  AND dive_number IS NOT NULL
GROUP BY 1,2,3,4""")
sql("CREATE INDEX idx_divepop ON analytics.dive_population (scope, gender, discipline, dive_number)")
sql("CREATE INDEX idx_divepop_dive ON analytics.dive_population (dive_number)")
log("dive_population built")

# ------------------------------------------------------- meet directory
# One searchable row per meet that has dive-level data, so the app can offer a
# real search instead of a select element listing every meet ever scraped.
# search_text is pre-lowered and concatenated because the browser role can only
# SELECT — it cannot create the expression index this would otherwise want.
sql("DROP TABLE IF EXISTS analytics.meet_directory")
sql("""CREATE TABLE analytics.meet_directory AS
WITH s AS (
  SELECT meet_id,
         CASE WHEN meet_id ~ '^[0-9]{1,8}$' THEN meet_id::int END AS dm_id,
         MAX(competition_family) AS competition_family,
         MAX(meet_year) AS meet_year,
         COUNT(*) AS n_dives,
         COUNT(DISTINCT event_id) AS n_events,
         COUNT(DISTINCT diver_id) AS n_divers,
         BOOL_OR(event_name ILIKE 'group%') AS has_junior,
         BOOL_OR(event_name ILIKE '%senior%') AS has_senior
  FROM core.dive_sheets
  WHERE discipline IN ('1m','3m','Platform')
  GROUP BY 1,2)
SELECT s.meet_id,
       COALESCE(m.meet_name,
                (SELECT MAX(meet_name) FROM core.result_phases p WHERE p.meet_id = s.meet_id),
                s.meet_id) AS meet_name,
       m.start_date, m.end_date, m.venue,
       s.competition_family, s.meet_year, s.n_dives, s.n_events, s.n_divers,
       CASE WHEN s.competition_family='World Aquatics'
                 AND s.meet_id IN (SELECT meet_id FROM analytics.meet_scope
                                   WHERE world_tier='world-inv') THEN 'world-inv'
            WHEN s.competition_family='World Aquatics' THEN 'world'
            WHEN s.competition_family='NCAA' THEN 'ncaa'
            WHEN s.has_senior THEN 'us-senior'
            WHEN s.has_junior THEN 'us-junior'
            ELSE 'us-open' END AS scope,
       LOWER(CONCAT_WS(' ',
             COALESCE(m.meet_name,
                      (SELECT MAX(meet_name) FROM core.result_phases p WHERE p.meet_id = s.meet_id),
                      s.meet_id),
             m.venue, s.meet_year::text, s.competition_family)) AS search_text
FROM s LEFT JOIN divemeets.meets m ON m.meet_id = s.dm_id""")
sql("CREATE INDEX idx_meetdir ON analytics.meet_directory (meet_year DESC, n_dives DESC)")
sql("CREATE INDEX idx_meetdir_id ON analytics.meet_directory (meet_id)")
log("meet_directory built")

# The browser role reads both of these; they were just created, so their ACL
# is empty until this runs. Without it Meet Replay 42501s on every load.
sql("""DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usad_app') THEN
    GRANT USAGE ON SCHEMA analytics TO usad_app;
    GRANT SELECT ON analytics.dive_population TO usad_app;
    GRANT SELECT ON analytics.meet_directory  TO usad_app;
  END IF;
END $$""")
log("usad_app SELECT granted")

counts = {t: rows(sql("SELECT COUNT(*) AS n FROM analytics." + t))[0]["n"]
          for t in ("dive_population", "meet_directory")}
log("done: %s" % counts)

# A dive population row built from three attempts is noise wearing a
# percentile. Report how much of the table actually clears the app's own
# display threshold so a thin build is visible rather than silently trusted.
thin = rows(sql("""SELECT COUNT(*) FILTER (WHERE n >= 20) AS usable,
                          COUNT(*) AS total,
                          COUNT(DISTINCT scope) AS scopes
                   FROM analytics.dive_population"""))[0]
log("dive_population: %s of %s rows have n>=20 across %s scopes" % (thin["usable"], thin["total"], thin["scopes"]))
