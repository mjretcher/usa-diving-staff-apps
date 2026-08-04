#!/usr/bin/env python3
"""
build_analytics.py — materializes the `analytics` schema for the Athlete
Evaluation app. Idempotent: drops and rebuilds every analytics table on each
run, so it can be re-run daily while the dive-sheet scraper is still
back-filling meets (currently working toward 2015 and earlier).

Tables built:
  analytics.athlete_identity   DiveMeets <-> World Aquatics crosswalk
  analytics.athlete_directory  search/browse directory with coverage counts
  analytics.benchmarks         what-it-takes lines per meet x event
  analytics.field_group_exec   execution by dive category (field context)
  analytics.field_list_dd      finalists' list-DD profile (field context)
  analytics.build_meta         build timestamp + row counts

Identity rules (agreed with Mike 2026-07-21):
  - Exact normalized-name matches between DiveMeets numeric ids and WA-<uuid>
    ids are auto-accepted ("they would be the same thing").
  - Normalization: strip diacritics, lowercase, alphabetic tokens, sorted.
    Handles "HEDBERG Joshua" (WA) == "Joshua Hedberg" (DiveMeets).
  - Ambiguous keys (same key on >1 athlete on either side) are NEVER linked;
    they stay as separate identities with a note.
  - WA synchro pair entities (names like "A / B", compound uuids) are excluded
    from individual identity entirely.

Execution normalization used downstream (validated 2026-07-21):
  5-judge (drop 1+1) and 7-judge (drop 2+2) panels both reduce to
  score = (sum of 3 middle judges) x DD, so per-judge execution
  = score / (3*DD), clamped to 10. Synchro scoring differs -> synchro rows are
  excluded from all execution analytics.
"""
import os, sys, json, time, unicodedata, urllib.request, urllib.error

CONN = os.environ.get("NEON_DATABASE_URL") or ""
if not CONN:
    sys.exit("NEON_DATABASE_URL not set")

# HTTP SQL endpoint must hit the DIRECT host (no -pooler); header conn string may be either.
_host = CONN.split("@", 1)[1].split("/", 1)[0]
ENDPOINT = "https://" + _host.replace("-pooler", "") + "/sql"

def sql(query, params=None, retries=3):
    body = json.dumps({"query": query, "params": [None if p is None else str(p) for p in (params or [])]}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={
        "Neon-Connection-String": CONN,
        "Content-Type": "application/json",
        "Neon-Raw-Text-Output": "false",
        "Neon-Array-Mode": "true",
    })
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:800]
            raise RuntimeError(f"SQL error {e.code}: {detail}\n-- query: {query[:300]}")
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))

def rows(res):
    fields = [f["name"] for f in res.get("fields", [])]
    return [dict(zip(fields, r)) for r in res.get("rows", [])]

def name_key(name):
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    toks = "".join(c if c.isalpha() else " " for c in s).split()
    return " ".join(sorted(toks))

def esc(v):
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"

def log(msg):
    print(f"[build_analytics] {msg}", flush=True)

# ---------------------------------------------------------------- DDL
log(f"endpoint: {ENDPOINT}")
sql("CREATE SCHEMA IF NOT EXISTS analytics")

sql("DROP TABLE IF EXISTS analytics.athlete_identity")
sql("""CREATE TABLE analytics.athlete_identity (
  canonical_id text PRIMARY KEY,
  dm_id        text,
  wa_id        text,
  display_name text NOT NULL,
  name_key     text NOT NULL,
  nat          text,
  match_method text NOT NULL,
  first_year   smallint,
  last_year    smallint,
  families     text,
  note         text
)""")

# --------------------------------------------------- fetch DM-side athletes
# Keyset-paginated so response sizes stay modest while the dataset grows.
def fetch_side(where_clause):
    out, last = [], ""
    while True:
        res = sql(f"""
          SELECT diver_id,
                 MAX(diver_name)                                        AS diver_name,
                 (ARRAY_AGG(nat ORDER BY meet_year DESC))[1]            AS nat,
                 MIN(meet_year)                                         AS first_year,
                 MAX(meet_year)                                         AS last_year,
                 STRING_AGG(DISTINCT competition_family, '+')           AS families
          FROM core.result_phases
          WHERE {where_clause} AND diver_id > $1
          GROUP BY diver_id ORDER BY diver_id LIMIT 4000""", [last])
        batch = rows(res)
        if not batch:
            break
        out.extend(batch)
        last = batch[-1]["diver_id"]
        if len(batch) < 4000:
            break
    return out

dm = fetch_side("diver_id NOT LIKE 'WA-%'")
wa = fetch_side("diver_id LIKE 'WA-%' AND POSITION(' / ' IN diver_name) = 0 AND diver_id NOT LIKE '%-USA-%' AND LENGTH(diver_id) <= 40")
log(f"fetched {len(dm)} DiveMeets athletes, {len(wa)} WA individual athletes")

# ------------------------------------------------------------- match by key
def index_by_key(side):
    byk = {}
    for a in side:
        k = name_key(a["diver_name"])
        a["_key"] = k
        byk.setdefault(k, []).append(a)
    return byk

dm_byk, wa_byk = index_by_key(dm), index_by_key(wa)
identities, linked = [], 0
wa_linked_ids = set()

for a in dm:
    k = a["_key"]
    wa_match, method, note = None, "dm_only", None
    if k and len(dm_byk.get(k, [])) == 1 and len(wa_byk.get(k, [])) == 1:
        wa_match = wa_byk[k][0]
        method = "name_token_exact"
        wa_linked_ids.add(wa_match["diver_id"])
        linked += 1
    elif k and k in wa_byk and (len(dm_byk[k]) > 1 or len(wa_byk[k]) > 1):
        note = "ambiguous name key - not linked"
    fy = [y for y in [a["first_year"], wa_match and wa_match["first_year"]] if y is not None]
    ly = [y for y in [a["last_year"], wa_match and wa_match["last_year"]] if y is not None]
    fams = set((a["families"] or "").split("+"))
    if wa_match:
        fams |= set((wa_match["families"] or "").split("+"))
    identities.append({
        "canonical_id": a["diver_id"], "dm_id": a["diver_id"],
        "wa_id": wa_match["diver_id"] if wa_match else None,
        "display_name": a["diver_name"], "name_key": k,
        "nat": (wa_match and wa_match["nat"]) or a["nat"],
        "match_method": method,
        "first_year": min(fy) if fy else None, "last_year": max(ly) if ly else None,
        "families": "+".join(sorted(f for f in fams if f)), "note": note,
    })

for a in wa:
    if a["diver_id"] in wa_linked_ids:
        continue
    identities.append({
        "canonical_id": a["diver_id"], "dm_id": None, "wa_id": a["diver_id"],
        "display_name": a["diver_name"], "name_key": a["_key"], "nat": a["nat"],
        "match_method": "wa_only", "first_year": a["first_year"], "last_year": a["last_year"],
        "families": a["families"], "note": None,
    })

log(f"identities: {len(identities)} total, {linked} DM<->WA links auto-accepted")

cols = ["canonical_id","dm_id","wa_id","display_name","name_key","nat","match_method","first_year","last_year","families","note"]
for i in range(0, len(identities), 400):
    chunk = identities[i:i+400]
    values = ",".join("(" + ",".join(esc(r[c]) for c in cols) + ")" for r in chunk)
    sql(f"INSERT INTO analytics.athlete_identity ({','.join(cols)}) VALUES {values}")
log("athlete_identity inserted")

# ------------------------------------------------------------- directory
# id_map: one row per raw diver_id -> canonical, so joins are plain hash joins
# (an OR-join here nested-loops over 124k x 10k rows and never finishes).
sql("DROP TABLE IF EXISTS analytics.id_map")
sql("""CREATE TABLE analytics.id_map AS
SELECT canonical_id AS source_id, canonical_id FROM analytics.athlete_identity
UNION
SELECT wa_id, canonical_id FROM analytics.athlete_identity WHERE wa_id IS NOT NULL""")
sql("ALTER TABLE analytics.id_map ADD PRIMARY KEY (source_id)")

sql("DROP TABLE IF EXISTS analytics.athlete_directory")
sql("""CREATE TABLE analytics.athlete_directory AS
WITH ph AS (
  SELECT m.canonical_id,
         COUNT(DISTINCT r.meet_id)                       AS n_phase_meets,
         COUNT(*)                                        AS n_phases,
         STRING_AGG(DISTINCT r.discipline, '/')          AS disciplines,
         (ARRAY_AGG(r.team_name ORDER BY r.meet_year DESC))[1] AS team_name,
         MAX(r.meet_year) FILTER (WHERE r.competition_family='World Aquatics') AS last_wa_year
  FROM core.result_phases r
  JOIN analytics.id_map m ON r.diver_id = m.source_id
  GROUP BY 1
),
ds AS (
  SELECT m.canonical_id,
         COUNT(DISTINCT d.meet_id) AS n_sheet_meets,
         COUNT(*)                  AS n_dives,
         MIN(d.meet_year)          AS first_sheet_year,
         MAX(d.meet_year)          AS last_sheet_year,
         COUNT(*) FILTER (WHERE d.judges_scores IS NOT NULL AND d.judges_scores <> '') AS n_judge_dives
  FROM core.dive_sheets d
  JOIN analytics.id_map m ON d.diver_id = m.source_id
  GROUP BY 1
)
SELECT i.canonical_id, i.dm_id, i.wa_id, i.display_name, i.name_key, i.nat,
       i.families, i.first_year, i.last_year, i.match_method,
       COALESCE(ph.n_phase_meets,0) AS n_phase_meets,
       COALESCE(ph.n_phases,0)      AS n_phases,
       ph.disciplines, ph.team_name, ph.last_wa_year,
       COALESCE(ds.n_sheet_meets,0) AS n_sheet_meets,
       COALESCE(ds.n_dives,0)       AS n_dives,
       ds.first_sheet_year, ds.last_sheet_year,
       COALESCE(ds.n_judge_dives,0) AS n_judge_dives
FROM analytics.athlete_identity i
LEFT JOIN ph ON ph.canonical_id = i.canonical_id
LEFT JOIN ds ON ds.canonical_id = i.canonical_id""")
sql("ALTER TABLE analytics.athlete_directory ADD PRIMARY KEY (canonical_id)")
sql("CREATE INDEX idx_dir_namekey ON analytics.athlete_directory (name_key)")
sql("CREATE INDEX idx_dir_dives   ON analytics.athlete_directory (n_dives DESC)")
log("athlete_directory built")

# ------------------------------------------------------------- benchmarks
# "What it takes" lines per meet x individual event. Cut logic is structural:
# final_cut = score, in the round BEFORE the Final, of the place equal to the
# number of Final participants; semi_cut likewise for Prelim -> Semifinal.
# Exhibition sentinel places (>=100, e.g. DiveMeets 127) are excluded.
sql("DROP TABLE IF EXISTS analytics.benchmarks")
sql("DROP TABLE IF EXISTS analytics._bm_ev")
sql("""CREATE TABLE analytics._bm_ev AS
SELECT meet_id, MAX(meet_name) AS meet_name, meet_year, competition_family,
       gender, discipline, event_id,
       MAX(age_group)  AS age_group,
       MAX(event_level) AS event_level,
       round_stage, place, MAX(posted_score) AS posted_score
FROM core.result_phases
WHERE COALESCE(is_synchronized, false) = false
  AND discipline IN ('1m','3m','Platform')
  AND posted_score IS NOT NULL AND place IS NOT NULL AND place < 100
GROUP BY meet_id, meet_year, competition_family, gender, discipline,
         event_id, round_stage, place""")
sql("""CREATE TABLE analytics.benchmarks AS
WITH grain AS (
  SELECT meet_id, event_id, MAX(meet_name) AS meet_name, meet_year,
         competition_family, gender, discipline,
         MAX(age_group) AS age_group, MAX(event_level) AS event_level,
         COUNT(*) FILTER (WHERE round_stage='Final')     AS n_final,
         COUNT(*) FILTER (WHERE round_stage='Semifinal') AS n_semi,
         COUNT(*) FILTER (WHERE round_stage='Prelim')    AS n_prelim
  FROM analytics._bm_ev
  GROUP BY meet_id, event_id, meet_year, competition_family, gender, discipline
)
SELECT g.*,
       f1.posted_score AS win_score,
       f3.posted_score AS medal_score,
       COALESCE(sc.posted_score, pc.posted_score) AS final_cut,
       ps.posted_score AS semi_cut
FROM grain g
LEFT JOIN analytics._bm_ev f1 ON f1.meet_id=g.meet_id AND f1.event_id=g.event_id
       AND f1.round_stage='Final' AND f1.place=1
LEFT JOIN analytics._bm_ev f3 ON f3.meet_id=g.meet_id AND f3.event_id=g.event_id
       AND f3.round_stage='Final' AND f3.place=3
LEFT JOIN analytics._bm_ev sc ON g.n_semi>0 AND sc.meet_id=g.meet_id AND sc.event_id=g.event_id
       AND sc.round_stage='Semifinal' AND sc.place=g.n_final
LEFT JOIN analytics._bm_ev pc ON g.n_semi=0 AND pc.meet_id=g.meet_id AND pc.event_id=g.event_id
       AND pc.round_stage='Prelim' AND pc.place=g.n_final
LEFT JOIN analytics._bm_ev ps ON g.n_semi>0 AND ps.meet_id=g.meet_id AND ps.event_id=g.event_id
       AND ps.round_stage='Prelim' AND ps.place=g.n_semi""")
sql("DROP TABLE analytics._bm_ev")
sql("CREATE INDEX idx_bm_lookup ON analytics.benchmarks (competition_family, gender, discipline, meet_year DESC)")
log("benchmarks built")

# --------------------------------------------------------- field profiles
sql("DROP TABLE IF EXISTS analytics.field_group_exec")
sql("""CREATE TABLE analytics.field_group_exec AS
SELECT competition_family, meet_year, gender, discipline,
       CASE WHEN competition_family='World Aquatics' THEN 'world'
            WHEN competition_family='NCAA' THEN 'ncaa'
            WHEN event_name ILIKE '%senior%' THEN 'us-senior'
            WHEN event_name ILIKE 'group%' THEN 'us-junior'
            ELSE 'us-open' END AS scope,
       dive_group_code AS category_code,
       MAX(dive_group_label) AS category_label,
       COUNT(*) AS n,
       COUNT(DISTINCT diver_id) AS n_divers,
       ROUND(AVG(LEAST(score/(3*dd),10))::numeric, 3)  AS avg_exec,
       ROUND((PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY LEAST(score/(3*dd),10)))::numeric,3) AS p25_exec,
       ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY LEAST(score/(3*dd),10)))::numeric,3) AS p50_exec,
       ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY LEAST(score/(3*dd),10)))::numeric,3) AS p75_exec,
       ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY LEAST(score/(3*dd),10)))::numeric,3) AS p90_exec,
       ROUND(AVG(CASE WHEN score/(3*dd) < 4.5 THEN 1 ELSE 0 END)::numeric,4) AS fail_rate,
       ROUND(AVG(dd)::numeric,3) AS avg_dd
FROM core.dive_sheets
WHERE discipline IN ('1m','3m','Platform')
  AND score IS NOT NULL AND dd > 0
  -- rulebook dives only: skills (DD 1.0 lineups/jumps) and scraper
  -- concatenations are excluded so they cannot distort field execution.
  AND dive_bucket = 'dive'
  AND dive_group_code IS NOT NULL
GROUP BY 1,2,3,4,5,6""")
sql("CREATE INDEX idx_fge ON analytics.field_group_exec (competition_family, gender, discipline, meet_year DESC)")
sql("CREATE INDEX idx_fge_scope ON analytics.field_group_exec (scope, gender, discipline, category_code)")

# --- same grain, split by voluntary vs optional (optional_voluntary was
# --- fetched by the app but never used anywhere until now)
sql("DROP TABLE IF EXISTS analytics.field_group_exec_vo")
sql("""CREATE TABLE analytics.field_group_exec_vo AS
SELECT meet_year, gender, discipline,
       CASE WHEN competition_family='World Aquatics' THEN 'world'
            WHEN competition_family='NCAA' THEN 'ncaa'
            WHEN event_name ILIKE '%senior%' THEN 'us-senior'
            WHEN event_name ILIKE 'group%' THEN 'us-junior'
            ELSE 'us-open' END AS scope,
       dive_group_code AS category_code,
       CASE WHEN optional_voluntary ILIKE 'v%' THEN 'voluntary'
            WHEN optional_voluntary ILIKE 'o%' THEN 'optional'
            ELSE 'unspecified' END AS vo,
       COUNT(*) AS n,
       COUNT(DISTINCT diver_id) AS n_divers,
       ROUND(AVG(LEAST(score/(3*dd),10))::numeric,3) AS avg_exec,
       ROUND(AVG(CASE WHEN score/(3*dd) < 4.5 THEN 1 ELSE 0 END)::numeric,4) AS fail_rate,
       ROUND(AVG(dd)::numeric,3) AS avg_dd
FROM core.dive_sheets
WHERE discipline IN ('1m','3m','Platform')
  AND score IS NOT NULL AND dd > 0 AND dive_bucket = 'dive'
GROUP BY 1,2,3,4,5,6""")
sql("CREATE INDEX idx_fgevo ON analytics.field_group_exec_vo (scope, gender, discipline, category_code)")

sql("DROP TABLE IF EXISTS analytics.field_list_dd")
sql("""CREATE TABLE analytics.field_list_dd AS
WITH lists AS (
  SELECT competition_family, meet_year, gender, discipline,
         CASE WHEN competition_family='World Aquatics' THEN 'world'
              WHEN competition_family='NCAA' THEN 'ncaa'
              WHEN event_level IN ('Senior','Senior/Open') THEN 'us-senior'
              WHEN event_level = 'Junior' THEN 'us-junior'
              ELSE 'us-open' END AS scope,
         meet_id, event_id, diver_id,
         SUM(dd) AS list_dd, COUNT(*) AS n_dives, SUM(score) AS list_score
  FROM core.dive_sheets
  WHERE discipline IN ('1m','3m','Platform')
    AND round_stage = 'Final' AND score IS NOT NULL AND dd > 0
    AND dive_bucket <> 'parse_error'
  GROUP BY 1,2,3,4,5,6,7,8
)
SELECT competition_family, meet_year, gender, discipline, scope,
       COUNT(*) AS n_lists,
       ROUND(AVG(list_dd)::numeric,2)  AS avg_list_dd,
       ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY list_dd))::numeric,2) AS p50_list_dd,
       ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY list_dd))::numeric,2) AS p90_list_dd,
       ROUND(AVG(n_dives)::numeric,1)  AS avg_n_dives
FROM lists
GROUP BY 1,2,3,4,5""")
sql("CREATE INDEX idx_fld ON analytics.field_list_dd (competition_family, gender, discipline, meet_year DESC)")
log("field profiles built")


# --------------------------------------------------------- medal-track corridor
# Cohort: athletes who later "made it" — tier 'intl' = competed at a World
# Aquatics senior event; tier 'senior' = reached a US senior-championships
# Final (includes intl athletes). Their best Junior Nationals score per age
# group (core.event_results, 2021+) forms the corridor bands current juniors
# are judged against. Exhibition sentinel places (>=100) excluded.
sql("DROP TABLE IF EXISTS analytics.cohort_seniors")
sql("""CREATE TABLE analytics.cohort_seniors AS
WITH intl AS (
  SELECT DISTINCT m.canonical_id
  FROM core.result_phases r
  JOIN analytics.id_map m ON r.diver_id = m.source_id
  WHERE r.competition_family = 'World Aquatics'
    AND COALESCE(r.is_synchronized,false) = false
),
sr AS (
  SELECT DISTINCT m.canonical_id
  FROM core.result_phases r
  JOIN analytics.id_map m ON r.diver_id = m.source_id
  WHERE r.competition_family = 'USA Diving'
    AND r.round_stage = 'Final'
    AND r.meet_name ILIKE '%National%'
    AND r.meet_name NOT ILIKE '%Junior%'
    AND r.event_level <> 'Junior'
)
SELECT canonical_id, 'intl' AS tier FROM intl
UNION
SELECT canonical_id, 'senior' AS tier FROM sr
UNION
SELECT canonical_id, 'senior' AS tier FROM intl""")
sql("CREATE INDEX idx_cs ON analytics.cohort_seniors (canonical_id, tier)")

sql("DROP TABLE IF EXISTS analytics.corridor_marks")
sql("""CREATE TABLE analytics.corridor_marks AS
WITH jr AS (
  -- Official Junior Nationals FINAL totals only (cumulative format is
  -- consistent 2021+: voluntary total carried + finals optionals), so bands
  -- mean "the Nationals result people quote". Disciplines/genders normalized
  -- to app standards (3M -> 3m, Boys -> Male).
  SELECT e.diver_id_dm::text AS canonical_id,
         MAX(e.diver_first || ' ' || e.diver_last) AS display_name,
         CASE e.gender WHEN 'Boys' THEN 'Male' WHEN 'Girls' THEN 'Female' END AS gender,
         CASE e.discipline WHEN '1M' THEN '1m' WHEN '3M' THEN '3m' ELSE e.discipline END AS discipline,
         e.age_group,
         MAX(e.score) AS best_score,
         (ARRAY_AGG(e.year ORDER BY e.score DESC))[1] AS best_year
  FROM core.event_results e
  WHERE e.stage = 'Nationals' AND e.round = 'Final'
    AND COALESCE(e.is_synchro,false) = false
    AND e.age_group IN ('Group A','Group B','Group C','Group D')
    AND e.gender IN ('Boys','Girls')
    AND e.score IS NOT NULL AND (e.place IS NULL OR e.place < 100)
  GROUP BY e.diver_id_dm, 3, 4, e.age_group
)
SELECT c.tier, jr.* FROM jr
JOIN analytics.cohort_seniors c ON c.canonical_id = jr.canonical_id""")

sql("DROP TABLE IF EXISTS analytics.corridor")
sql("""CREATE TABLE analytics.corridor AS
SELECT tier, gender, discipline, age_group,
       COUNT(*) AS n_athletes,
       ROUND((PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY best_score))::numeric,2) AS p10,
       ROUND((PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY best_score))::numeric,2) AS p25,
       ROUND((PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY best_score))::numeric,2) AS p50,
       ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY best_score))::numeric,2) AS p75,
       ROUND((PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY best_score))::numeric,2) AS p90
FROM analytics.corridor_marks
GROUP BY tier, gender, discipline, age_group""")
log("medal-track corridor built")

# --------------------------------------------------------- field judge spread
# Judge-by-judge detail exists only on World Aquatics meets. Per-dive judge
# range (max-min award) parsed in SQL; field reference for the Judge Lens.
sql("DROP TABLE IF EXISTS analytics.field_judge_spread")
sql("""CREATE TABLE analytics.field_judge_spread AS
WITH per_dive AS (
  SELECT gender, discipline,
         (SELECT MAX(v) - MIN(v) FROM (
            SELECT NULLIF(TRIM(split_part(tok, ':', 2)), '')::numeric AS v
            FROM unnest(string_to_array(judges_scores, ';')) tok
          ) jv WHERE v IS NOT NULL) AS jrange
  FROM core.dive_sheets
  WHERE judges_scores IS NOT NULL AND judges_scores <> ''
    AND discipline IN ('1m','3m','Platform')
)
SELECT gender, discipline, COUNT(*) AS n,
       ROUND(AVG(jrange)::numeric,2) AS avg_range,
       ROUND((PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY jrange))::numeric,2) AS p50_range,
       ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY jrange))::numeric,2) AS p75_range
FROM per_dive WHERE jrange IS NOT NULL
GROUP BY gender, discipline""")
log("field judge spread built")


# --------------------------------------------------------- LA28 watch engine
# Per US athlete x Olympic event: yearly best-list capability on the senior
# scoring basis (OPTIONAL dives only, >=4-dive lists, fresh per-round scores),
# execution trend (regr_slope of DD-weighted exec across seasons), and the
# dive group where execution grew most season-over-season. Deepens
# automatically as the scraper back-fills toward 2015.
# la28_watch is built through staged tables rather than one big CTE chain.
# Postgres has no statistics for a CTE result, and at 1.37M dive rows the
# planner collapsed its estimate for the final join to rows=1 and chose a
# nested loop over ~20k x ~12k rows, which never finished. Materialising each
# step and ANALYZEing it gives the planner real counts and a hash join.
sql("DROP TABLE IF EXISTS analytics._la28_lists")
sql("""CREATE TABLE analytics._la28_lists AS
SELECT m.canonical_id, d.meet_year, d.meet_id, d.event_id, d.round_stage,
         d.gender, d.discipline,
         SUM(d.score) AS tot, SUM(d.dd) AS sdd, COUNT(*) AS nd
  FROM core.dive_sheets d
  JOIN analytics.id_map m ON d.diver_id = m.source_id
  WHERE d.discipline IN ('3m','Platform') AND d.gender IN ('Male','Female')
    AND d.dd > 0 AND d.score IS NOT NULL
    AND (d.optional_voluntary IS NULL OR d.optional_voluntary IN ('','O'))
  GROUP BY 1,2,3,4,5,6,7
  HAVING COUNT(*) >= 4""")
sql("ANALYZE analytics._la28_lists")
sql("DROP TABLE IF EXISTS analytics._la28_yearly")
sql("""CREATE TABLE analytics._la28_yearly AS
SELECT DISTINCT ON (canonical_id, gender, discipline, meet_year)
         canonical_id, gender, discipline, meet_year, tot, sdd, nd,
         tot/(3*sdd) AS ehat, meet_id, round_stage
  FROM analytics._la28_lists
  ORDER BY canonical_id, gender, discipline, meet_year, tot DESC""")
sql("ANALYZE analytics._la28_yearly")
sql("DROP TABLE IF EXISTS analytics._la28_agg")
sql("""CREATE TABLE analytics._la28_agg AS
SELECT canonical_id, gender, discipline,
         COUNT(*) AS n_years, MIN(meet_year) AS first_year, MAX(meet_year) AS last_year,
         REGR_SLOPE(ehat, meet_year) AS ehat_slope,
         JSONB_AGG(JSONB_BUILD_OBJECT(
            'y', meet_year, 'tot', ROUND(tot::numeric,1), 'dd', ROUND(sdd::numeric,1),
            'ehat', ROUND(ehat::numeric,3), 'meet', meet_id, 'stage', round_stage
         ) ORDER BY meet_year) AS yearly
  FROM analytics._la28_yearly GROUP BY 1,2,3""")
sql("ANALYZE analytics._la28_agg")
sql("DROP TABLE IF EXISTS analytics._la28_latest")
sql("""CREATE TABLE analytics._la28_latest AS
SELECT DISTINCT ON (canonical_id, gender, discipline)
         canonical_id, gender, discipline,
         meet_year AS ly, tot AS last_tot, sdd AS last_dd, ehat AS last_ehat
  FROM analytics._la28_yearly ORDER BY canonical_id, gender, discipline, meet_year DESC""")
sql("ANALYZE analytics._la28_latest")
sql("DROP TABLE IF EXISTS analytics._la28_ageflag")
sql("""CREATE TABLE analytics._la28_ageflag AS
SELECT diver_id_dm::text AS canonical_id,
         (ARRAY_AGG(age_group ORDER BY year DESC))[1] AS latest_group,
         MAX(year) AS group_year
  FROM core.event_results
  WHERE age_group IN ('Group A','Group B','Group C','Group D')
  GROUP BY 1""")
sql("ANALYZE analytics._la28_ageflag")
sql("DROP TABLE IF EXISTS analytics._la28_cat_year")
sql("""CREATE TABLE analytics._la28_cat_year AS
SELECT m.canonical_id, d.gender, d.discipline, d.meet_year,
         COALESCE(NULLIF(d.dive_category_code,''), LEFT(d.dive_number,1)) AS cat,
         AVG(LEAST(d.score/(3*d.dd),10)) AS ex
  FROM core.dive_sheets d
  JOIN analytics.id_map m ON d.diver_id = m.source_id
  WHERE d.discipline IN ('3m','Platform') AND d.gender IN ('Male','Female')
    AND d.dd > 0 AND d.score IS NOT NULL
    AND (d.optional_voluntary IS NULL OR d.optional_voluntary IN ('','O'))
  GROUP BY 1,2,3,4,5 HAVING COUNT(*) >= 3""")
sql("ANALYZE analytics._la28_cat_year")
sql("DROP TABLE IF EXISTS analytics._la28_deltas")
sql("""CREATE TABLE analytics._la28_deltas AS
SELECT a.canonical_id, a.gender, a.discipline, a.cat, a.ex - b.ex AS delta,
         ROW_NUMBER() OVER (PARTITION BY a.canonical_id, a.gender, a.discipline
                            ORDER BY a.meet_year DESC, (a.ex - b.ex) DESC) AS rn
  FROM analytics._la28_cat_year a
  JOIN analytics._la28_cat_year b ON b.canonical_id = a.canonical_id AND b.gender = a.gender
    AND b.discipline = a.discipline AND b.cat = a.cat AND b.meet_year = a.meet_year - 1""")
sql("ANALYZE analytics._la28_deltas")
sql("DROP TABLE IF EXISTS analytics._la28_grow")
sql("""CREATE TABLE analytics._la28_grow AS
SELECT canonical_id, gender, discipline, cat AS grow_cat,
         ROUND(delta::numeric,2) AS grow_delta
  FROM analytics._la28_deltas WHERE rn = 1 AND delta > 0.05""")
sql("ANALYZE analytics._la28_grow")
sql("DROP TABLE IF EXISTS analytics.la28_watch")
sql("""CREATE TABLE analytics.la28_watch AS
SELECT a.canonical_id, dir.display_name, dir.nat, dir.team_name,
       a.gender, a.discipline, a.n_years, a.first_year, a.last_year,
       ROUND(a.ehat_slope::numeric, 4) AS ehat_slope, a.yearly,
       ROUND(l.last_tot::numeric,1) AS last_tot, ROUND(l.last_dd::numeric,1) AS last_dd,
       ROUND(l.last_ehat::numeric,3) AS last_ehat,
       af.latest_group, af.group_year,
       g.grow_cat, g.grow_delta
FROM analytics._la28_agg a
JOIN analytics._la28_latest l USING (canonical_id, gender, discipline)
JOIN analytics.athlete_directory dir ON dir.canonical_id = a.canonical_id
LEFT JOIN analytics._la28_ageflag af ON af.canonical_id = a.canonical_id
LEFT JOIN analytics._la28_grow g ON g.canonical_id = a.canonical_id AND g.gender = a.gender AND g.discipline = a.discipline
WHERE dir.families LIKE '%USA Diving%' AND COALESCE(NULLIF(dir.nat,''),'USA') = 'USA'""")
sql("CREATE INDEX idx_la28 ON analytics.la28_watch (gender, discipline, last_year DESC)")
for _t in ["lists","yearly","agg","latest","ageflag","cat_year","deltas","grow"]:
    sql(f"DROP TABLE IF EXISTS analytics._la28_{_t}")
log("la28 watch built")

# ---------------------------------------------------------------- meta
counts = {}


# ---------------------------------------------------------------------------
# analytics.event_profile — the field, decomposed.
#
# A total score is 3 x (sum of DD x execution). result_phases carries
# phase_dd_sum next to posted_score, so every result splits into how hard the
# list was and how well it was performed. That split, by finishing band, is
# the field-level question worth asking: is the podium winning on difficulty
# or on execution?
#
# Grain: scope x gender x discipline x dive-count format x year x finish band.
# Cumulative totals and rows without a dive count are excluded outright —
# they are not comparable measurements.
# ---------------------------------------------------------------------------
sql("DROP TABLE IF EXISTS analytics.event_profile")
sql("""CREATE TABLE analytics.event_profile AS
WITH base AS (
  SELECT meet_year, gender, discipline, phase_dive_count AS dive_count,
         CASE WHEN competition_family='World Aquatics' THEN 'world'
              WHEN competition_family='NCAA' THEN 'ncaa'
              WHEN event_level IN ('Senior','Senior/Open') THEN 'us-senior'
              WHEN event_level = 'Junior' THEN 'us-junior'
              ELSE 'us-open' END AS scope,
         place, posted_score, phase_dd_sum,
         posted_score / NULLIF(3 * phase_dd_sum, 0) AS exec_per_judge
  FROM core.result_phases
  WHERE posted_score IS NOT NULL
    AND phase_dive_count IS NOT NULL
    AND score_is_cumulative IS NOT TRUE
    AND phase_dd_sum > 0
    AND discipline IN ('1m','3m','Platform')
    AND is_synchronized IS NOT TRUE
    AND round_stage = 'Final'
)
SELECT scope, gender, discipline, dive_count, meet_year,
       CASE WHEN place <= 3 THEN 'podium'
            WHEN place <= 12 THEN 'finalist'
            ELSE 'field' END AS band,
       COUNT(*) AS n,
       ROUND(AVG(posted_score)::numeric,2)  AS avg_score,
       ROUND(AVG(phase_dd_sum)::numeric,3)  AS avg_list_dd,
       ROUND(AVG(exec_per_judge)::numeric,3) AS avg_exec,
       ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY posted_score))::numeric,2) AS p50_score,
       ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY posted_score))::numeric,2) AS p90_score,
       ROUND(MIN(posted_score)::numeric,2) AS min_score,
       ROUND(MAX(posted_score)::numeric,2) AS max_score
FROM base
WHERE place IS NOT NULL
GROUP BY 1,2,3,4,5,6""")
sql("CREATE INDEX idx_evprof ON analytics.event_profile (scope, gender, discipline, dive_count, meet_year)")

# Score-by-rank: what each finishing position actually cost, with the spread
# across meets rather than one meet's number presented as a constant.
sql("DROP TABLE IF EXISTS analytics.rank_cost")
sql("""CREATE TABLE analytics.rank_cost AS
SELECT CASE WHEN competition_family='World Aquatics' THEN 'world'
            WHEN competition_family='NCAA' THEN 'ncaa'
            WHEN event_level IN ('Senior','Senior/Open') THEN 'us-senior'
            WHEN event_level = 'Junior' THEN 'us-junior'
            ELSE 'us-open' END AS scope,
       gender, discipline, phase_dive_count AS dive_count,
       place::int AS place,
       COUNT(*) AS n_meets,
       ROUND(AVG(posted_score)::numeric,2) AS avg_score,
       ROUND((PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY posted_score))::numeric,2) AS p25_score,
       ROUND((PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY posted_score))::numeric,2) AS p50_score,
       ROUND((PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY posted_score))::numeric,2) AS p75_score,
       ROUND(STDDEV_SAMP(posted_score)::numeric,2) AS sd_score,
       MIN(meet_year) AS y0, MAX(meet_year) AS y1
FROM core.result_phases
WHERE posted_score IS NOT NULL AND phase_dive_count IS NOT NULL
  AND score_is_cumulative IS NOT TRUE
  AND discipline IN ('1m','3m','Platform') AND is_synchronized IS NOT TRUE
  AND round_stage = 'Final' AND place IS NOT NULL AND place <= 24
  AND meet_year >= 2018
GROUP BY 1,2,3,4,5""")
sql("CREATE INDEX idx_rankcost ON analytics.rank_cost (scope, gender, discipline, dive_count, place)")

for t in ["athlete_identity","athlete_directory","benchmarks","field_group_exec","field_group_exec_vo","event_profile","rank_cost","field_list_dd","cohort_seniors","corridor_marks","corridor","field_judge_spread","la28_watch"]:
    counts[t] = rows(sql(f"SELECT COUNT(*) AS n FROM analytics.{t}"))[0]["n"]
sql("CREATE TABLE IF NOT EXISTS analytics.build_meta (built_at timestamptz PRIMARY KEY, detail jsonb)")
sql("INSERT INTO analytics.build_meta (built_at, detail) VALUES (now(), $1::jsonb)", [json.dumps(counts)])

# Every table above was just DROPped and recreated, which throws away its ACL.
# db/schema.sql sets ALTER DEFAULT PRIVILEGES so new tables inherit SELECT, but
# that only helps when this script runs as the same role the migration ran as.
# Re-granting here makes the Athlete Evaluation app's access independent of that
# assumption — without it a rebuild can silently 42501 the whole app.
sql("""DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usad_app') THEN
    GRANT USAGE ON SCHEMA analytics TO usad_app;
    GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO usad_app;
  END IF;
END $$""")
log("usad_app SELECT re-granted on analytics")

log(f"done: {counts}")
