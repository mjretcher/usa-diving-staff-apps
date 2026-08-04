-- ============================================================
-- USA Diving Staff Apps — Neon Database Schema
-- One project (neondb), 5 schemas, minimal connection usage
-- ============================================================

-- SCHEMA 1: schedule_builder
CREATE SCHEMA IF NOT EXISTS schedule_builder;

CREATE TABLE IF NOT EXISTS schedule_builder.schedules (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    meet_type      TEXT,
    year           SMALLINT,
    is_builtin     BOOLEAN DEFAULT FALSE,
    publish_status TEXT DEFAULT 'draft',
    data           JSONB NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_builder.presence (
    editor_id   TEXT PRIMARY KEY,
    schedule_id TEXT,
    display_name TEXT DEFAULT 'Editor',
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sb_year ON schedule_builder.schedules(year);
CREATE INDEX IF NOT EXISTS idx_sb_type ON schedule_builder.schedules(meet_type);

-- Add folder column for library organization (idempotent)
ALTER TABLE schedule_builder.schedules ADD COLUMN IF NOT EXISTS folder TEXT;
CREATE INDEX IF NOT EXISTS idx_sb_folder ON schedule_builder.schedules(folder);


-- SCHEMA 2: junior_results
CREATE SCHEMA IF NOT EXISTS junior_results;

CREATE TABLE IF NOT EXISTS junior_results.results (
    id           SERIAL PRIMARY KEY,
    year         SMALLINT NOT NULL,
    stage        TEXT NOT NULL,
    zone         TEXT,
    meet_name    TEXT,
    meet_date    DATE,
    athlete_name TEXT NOT NULL,
    club         TEXT,
    region       TEXT,
    age_group    TEXT,
    gender       TEXT,
    apparatus    TEXT,
    score        NUMERIC(8,2),
    place        SMALLINT,
    qualified    BOOLEAN DEFAULT FALSE,
    qual_type    TEXT,
    is_hps       BOOLEAN DEFAULT FALSE,
    is_foreign   BOOLEAN DEFAULT FALSE,
    is_dual      BOOLEAN DEFAULT FALSE,
    raw_data     JSONB,
    scraped_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jr_year_stage ON junior_results.results(year, stage);
CREATE INDEX IF NOT EXISTS idx_jr_zone        ON junior_results.results(year, zone);
CREATE INDEX IF NOT EXISTS idx_jr_event       ON junior_results.results(year, age_group, gender, apparatus);
CREATE INDEX IF NOT EXISTS idx_jr_athlete     ON junior_results.results(year, athlete_name);

CREATE TABLE IF NOT EXISTS junior_results.scrape_log (
    id           SERIAL PRIMARY KEY,
    year         SMALLINT,
    stage        TEXT,
    zone         TEXT,
    rows_written INT,
    duration_ms  INT,
    status       TEXT DEFAULT 'ok',
    error_msg    TEXT,
    ran_at       TIMESTAMPTZ DEFAULT now()
);

-- Athlete status / eligibility metadata (foreign, dual, HPS, YMCA, already-qualified).
-- Single consolidated source, merged from the former junior-athlete-status.js and
-- ewc-data.js roster files. Seeded by neon-seed-athlete-status.yml.
CREATE TABLE IF NOT EXISTS junior_results.athlete_status (
    id                     BIGSERIAL PRIMARY KEY,
    dive_meets_id          TEXT,
    usa_diving_id          TEXT,
    name                   TEXT,
    first_name             TEXT,
    last_name              TEXT,
    gender                 TEXT,
    age_group              TEXT,
    region                 TEXT,
    zone                   TEXT,
    ewc_meet               TEXT,
    team                   TEXT,
    category               TEXT,
    athlete_type           TEXT,
    status_source          TEXT,
    hps                    BOOLEAN DEFAULT false,
    ymca                   BOOLEAN DEFAULT false,
    foreign_declared       BOOLEAN DEFAULT false,
    dual_declared          BOOLEAN DEFAULT false,
    dual_other_country     BOOLEAN DEFAULT false,
    federation_represented TEXT,
    already_nat_qual       BOOLEAN DEFAULT false,
    sources                TEXT,
    updated_at             TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jas_dmid ON junior_results.athlete_status(dive_meets_id);
CREATE INDEX IF NOT EXISTS idx_jas_name ON junior_results.athlete_status(lower(name));

-- Official Zone qualifying thresholds (average-score bar per zone per event).
-- Seeded by neon-seed-zone-thresholds.yml from the former junior-data.js officialThresholds.
CREATE TABLE IF NOT EXISTS junior_results.zone_thresholds (
    id              BIGSERIAL PRIMARY KEY,
    year            SMALLINT,
    zone            TEXT,
    meet_id         TEXT,
    event_id        TEXT,
    event_name      TEXT,
    event_key       TEXT,
    threshold_score NUMERIC,
    event_sort      INT,
    source_url      TEXT,
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jzt_year_event ON junior_results.zone_thresholds(year, zone, event_key);

-- Snapshot of the "possible/projected" Junior Nationals field, published on demand from the
-- Junior Results Audit qualifier engine (advancesToNationals, after all merges/overrides) plus
-- the full HPS roster (athlete_status). Consumed read-only by Schedule Builder to pre-fill
-- projected entries and show athlete-load breakdowns by age group / gender / zone / E-W-C
-- while building a schedule. This is a point-in-time snapshot, replaced wholesale on each
-- publish — not a live feed. discipline is NULL for HPS roster members who have not yet
-- competed in a tracked event this cycle (apparatus not yet knowable).
CREATE TABLE IF NOT EXISTS junior_results.projected_nationals_field (
    id                  BIGSERIAL PRIMARY KEY,
    season              SMALLINT NOT NULL,
    diver_key           TEXT NOT NULL,
    athlete_name        TEXT NOT NULL,
    age_group           TEXT NOT NULL,
    gender              TEXT NOT NULL,
    discipline          TEXT,
    zone                TEXT,
    ewc_meet            TEXT,
    team                TEXT,
    qualification_path  TEXT NOT NULL,
    published_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pnf_season ON junior_results.projected_nationals_field(season);
CREATE INDEX IF NOT EXISTS idx_pnf_lookup ON junior_results.projected_nationals_field(season, age_group, gender, discipline);


-- SCHEMA 3: hp_analytics
CREATE SCHEMA IF NOT EXISTS hp_analytics;

CREATE TABLE IF NOT EXISTS hp_analytics.athlete_summaries (
    id           SERIAL PRIMARY KEY,
    year         SMALLINT NOT NULL,
    athlete_name TEXT NOT NULL,
    club         TEXT,
    region       TEXT,
    gender       TEXT,
    age_group    TEXT,
    apparatus    TEXT,
    meet_count   SMALLINT,
    best_score   NUMERIC(8,2),
    avg_score    NUMERIC(8,2),
    result_count SMALLINT,
    data         JSONB,
    updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hp_uniq  ON hp_analytics.athlete_summaries(year, athlete_name, apparatus);
CREATE INDEX IF NOT EXISTS idx_hp_group         ON hp_analytics.athlete_summaries(year, age_group, gender, apparatus);


-- SCHEMA 4: criteria_simulator
CREATE SCHEMA IF NOT EXISTS criteria_simulator;

CREATE TABLE IF NOT EXISTS criteria_simulator.scenarios (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    criteria    JSONB NOT NULL,
    results     JSONB,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);


-- SCHEMA 5: app_meta
CREATE SCHEMA IF NOT EXISTS app_meta;

CREATE TABLE IF NOT EXISTS app_meta.config (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    description TEXT,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO app_meta.config (key, value, description) VALUES
  ('current_season_year',      '2026', 'Active competition year for all apps'),
  ('scraper_last_run',         NULL,   'ISO timestamp of last GitHub Actions scraper run'),
  ('schedule_builder_version', '2',    'Schedule builder data schema version'),
  ('hp_analytics_version',     '1',    'HP analytics data schema version'),
  ('junior_results_version',   '1',    'Junior results data schema version')
ON CONFLICT (key) DO NOTHING;


-- Auto-update updated_at on writes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_sb_schedules BEFORE UPDATE ON schedule_builder.schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_presence BEFORE UPDATE ON schedule_builder.presence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_cs_scenarios BEFORE UPDATE ON criteria_simulator.scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_hp_summaries BEFORE UPDATE ON hp_analytics.athlete_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- SCHEMA 6: core — raw event results from DiveMeets (ALL meets, all years)
-- Used by every app (junior results, HP analytics, criteria sim)
-- One row per (meet, event, round, athlete)
-- ============================================================
CREATE SCHEMA IF NOT EXISTS core;

CREATE TABLE IF NOT EXISTS core.event_results (
    id              BIGSERIAL PRIMARY KEY,
    -- DiveMeets identifiers
    meet_id_dm      INTEGER,
    diver_id_dm     INTEGER,
    team_id_dm      INTEGER,
    -- Raw fields (verbatim from DiveMeets)
    meet_name       TEXT NOT NULL,
    event_name      TEXT NOT NULL,
    round           TEXT,
    diver_first     TEXT,
    diver_last      TEXT,
    team_name       TEXT,
    team_code       TEXT,
    place           SMALLINT,
    score           NUMERIC(10,2),
    -- Derived classification (set at import time)
    year            SMALLINT,
    stage           TEXT,        -- Regionals / Zones / EWC / Nationals / Senior-Nationals / Winter-Nationals / Open / Trials / Other
    event_level     TEXT,        -- Junior / Senior / Open / Other
    age_group       TEXT,        -- Group A / Group B / Group C / Group D / Senior / null
    gender          TEXT,        -- Boys / Girls / Men / Women / Mixed
    discipline      TEXT,        -- 1M / 3M / Platform / Synchro-3M / Synchro-Platform / etc.
    event_key       TEXT,        -- normalized: "Group A Boys 1M" (cross-year stable)
    is_synchro      BOOLEAN DEFAULT FALSE,
    is_junior_circuit BOOLEAN DEFAULT FALSE,  -- true iff stage in (Regionals, Zones, EWC, Nationals) and not Senior
    region          SMALLINT,    -- 1-12 for Regionals
    zone            TEXT,        -- A-F for Zones
    ewc_meet        TEXT,        -- East / West / Central
    -- House-keeping
    source_file     TEXT,
    imported_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ev_year         ON core.event_results(year);
CREATE INDEX IF NOT EXISTS idx_ev_stage_year   ON core.event_results(stage, year);
CREATE INDEX IF NOT EXISTS idx_ev_diver        ON core.event_results(diver_id_dm);
CREATE INDEX IF NOT EXISTS idx_ev_event_key    ON core.event_results(event_key, year);
CREATE INDEX IF NOT EXISTS idx_ev_meet         ON core.event_results(meet_id_dm);
CREATE INDEX IF NOT EXISTS idx_ev_team         ON core.event_results(team_id_dm);
CREATE INDEX IF NOT EXISTS idx_ev_junior       ON core.event_results(year, is_junior_circuit) WHERE is_junior_circuit;
CREATE INDEX IF NOT EXISTS idx_ev_athlete_year ON core.event_results(diver_id_dm, year);

-- Athlete identity table (populated by import via INSERT...ON CONFLICT)
CREATE TABLE IF NOT EXISTS core.divers (
    diver_id_dm        INTEGER PRIMARY KEY,
    first_name         TEXT,
    last_name          TEXT,
    current_team_id_dm INTEGER,
    first_seen_year    SMALLINT,
    last_seen_year     SMALLINT,
    result_count       INT DEFAULT 0,
    notes              JSONB,
    updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.teams (
    team_id_dm INTEGER PRIMARY KEY,
    name       TEXT,
    code       TEXT,
    notes      JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Helper view: junior circuit only, common subset apps will use
CREATE OR REPLACE VIEW core.junior_results AS
SELECT * FROM core.event_results
WHERE is_junior_circuit = TRUE
  AND is_synchro = FALSE;

-- Bump version
INSERT INTO app_meta.config (key, value, description) VALUES
  ('core_schema_version', '1', 'Core event_results schema version')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();


-- ============================================================
-- MIGRATION: criteria simulator data + type widening for international IDs
-- Idempotent: safe to re-run.
-- ============================================================

-- Widen identifier columns to TEXT so they can hold both numeric DiveMeets IDs
-- (e.g. "11526") and World Aquatics IDs (e.g. "WA-4847", "WA-29edadbb-..." UUIDs,
-- and 3-letter country team codes like "CHN", "AUS", "MEX").
-- Each ALTER is guarded so the migration can re-run without error.

-- Drop dependent view so we can change the column types it references.
-- View is recreated immediately after the type migration completes.
DROP VIEW IF EXISTS core.junior_results;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='core' AND table_name='event_results' AND column_name='meet_id_dm') = 'integer' THEN
    ALTER TABLE core.event_results ALTER COLUMN meet_id_dm TYPE TEXT USING meet_id_dm::TEXT;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='core' AND table_name='event_results' AND column_name='diver_id_dm') = 'integer' THEN
    ALTER TABLE core.event_results ALTER COLUMN diver_id_dm TYPE TEXT USING diver_id_dm::TEXT;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='core' AND table_name='event_results' AND column_name='team_id_dm') = 'integer' THEN
    ALTER TABLE core.event_results ALTER COLUMN team_id_dm TYPE TEXT USING team_id_dm::TEXT;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='core' AND table_name='divers' AND column_name='diver_id_dm') = 'integer' THEN
    ALTER TABLE core.divers ALTER COLUMN diver_id_dm TYPE TEXT USING diver_id_dm::TEXT;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='core' AND table_name='divers' AND column_name='current_team_id_dm') = 'integer' THEN
    ALTER TABLE core.divers ALTER COLUMN current_team_id_dm TYPE TEXT USING current_team_id_dm::TEXT;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='core' AND table_name='teams' AND column_name='team_id_dm') = 'integer' THEN
    ALTER TABLE core.teams ALTER COLUMN team_id_dm TYPE TEXT USING team_id_dm::TEXT;
  END IF;
END $$;

-- Recreate view (now references TEXT columns)
CREATE OR REPLACE VIEW core.junior_results AS
SELECT * FROM core.event_results
WHERE is_junior_circuit = TRUE
  AND is_synchro = FALSE;


-- ============================================================
-- core.result_phases — phase-level results (criteria simulator scope: 2024-2026)
-- 5,393 rows: USA Diving Senior/Junior Nationals, Trials, NCAA Championships,
-- World Aquatics Championships, World Cup, American Cup, etc.
-- Augments core.event_results with DD-sum, dive-count, and NCAA 5-cat scoring detail.
-- ============================================================
CREATE TABLE IF NOT EXISTS core.result_phases (
    id                                          BIGSERIAL PRIMARY KEY,
    meet_id                                     TEXT NOT NULL,
    event_id                                    TEXT NOT NULL,
    result_set_id                               TEXT NOT NULL,
    sheet_key                                   TEXT NOT NULL,
    diver_id                                    TEXT NOT NULL,
    diver_name                                  TEXT,
    team_name                                   TEXT,
    team_id                                     TEXT,
    nat                                         TEXT,
    place                                       NUMERIC(6,1),
    posted_score                                NUMERIC(10,2),
    phase_score_from_dives                      NUMERIC(10,2),
    phase_dive_count                            SMALLINT,
    phase_dd_sum                                NUMERIC(8,3),
    score_delta_posted_minus_phase              NUMERIC(10,4),
    score_is_cumulative                         BOOLEAN,
    score_analysis_mode                         TEXT,
    meet_name                                   TEXT,
    meet_year                                   SMALLINT,
    competition_family                          TEXT,
    competition_group                           TEXT,
    ncaa_division                               TEXT,
    gender                                      TEXT,
    discipline                                  TEXT,
    event_level                                 TEXT,
    age_group                                   TEXT,
    event_round                                 TEXT,
    round_stage                                 TEXT,
    is_synchronized                             BOOLEAN,
    source_system                               TEXT,
    ncaa_women_springboard_raw_6_dive_score     NUMERIC(10,2),
    ncaa_women_springboard_5cat_score           NUMERIC(10,2),
    ncaa_women_springboard_5cat_dd_sum          NUMERIC(8,3),
    ncaa_women_springboard_repeated_category    TEXT,
    ncaa_women_springboard_dropped_dive_number  TEXT,
    ncaa_women_springboard_dropped_dive_score   NUMERIC(10,2),
    ncaa_women_springboard_adjustment_status    TEXT,
    ncaa_women_springboard_adjustment_note      TEXT,
    imported_at                                 TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rp_natural ON core.result_phases(meet_id, event_id, result_set_id, diver_id, sheet_key);
CREATE INDEX IF NOT EXISTS idx_rp_diver        ON core.result_phases(diver_id);
CREATE INDEX IF NOT EXISTS idx_rp_meet         ON core.result_phases(meet_id);
CREATE INDEX IF NOT EXISTS idx_rp_year         ON core.result_phases(meet_year);
CREATE INDEX IF NOT EXISTS idx_rp_event        ON core.result_phases(meet_year, age_group, gender, discipline);
CREATE INDEX IF NOT EXISTS idx_rp_family       ON core.result_phases(competition_family, competition_group);


-- ============================================================
-- core.dive_sheets — per-dive detail (criteria simulator scope: 2024-2026)
-- 31,957 rows. One row per dive on a diver's sheet.
-- Join to result_phases on (meet_id, event_id, result_set_id, diver_id, sheet_key)
-- or to event_results on (meet_id_dm, diver_id_dm).
-- ============================================================
CREATE TABLE IF NOT EXISTS core.dive_sheets (
    id                          BIGSERIAL PRIMARY KEY,
    meet_id                     TEXT NOT NULL,
    event_id                    TEXT NOT NULL,
    result_set_id               TEXT NOT NULL,
    diver_id                    TEXT NOT NULL,
    sheet_key                   TEXT NOT NULL,
    dive_order                  SMALLINT NOT NULL,
    dive_number                 TEXT,
    height                      TEXT,
    description                 TEXT,
    dd                          NUMERIC(6,3),
    score                       NUMERIC(8,2),
    net_score                   NUMERIC(8,2),
    round_place                 NUMERIC(6,1),
    optional_voluntary          TEXT,
    judges_scores               TEXT,
    running_total_points        NUMERIC(10,2),
    diver_name                  TEXT,
    team_name                   TEXT,
    event_name                  TEXT,
    gender                      TEXT,
    discipline                  TEXT,
    round_stage                 TEXT,
    competition_family          TEXT,
    competition_group           TEXT,
    ncaa_division               TEXT,
    meet_year                   SMALLINT,
    dive_category_code          TEXT,
    dive_category_label         TEXT,
    ncaa_5cat_inclusion_status  TEXT,
    ncaa_5cat_inclusion_note    TEXT,
    imported_at                 TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ds_natural ON core.dive_sheets(meet_id, event_id, result_set_id, diver_id, sheet_key, dive_order);
CREATE INDEX IF NOT EXISTS idx_ds_diver        ON core.dive_sheets(diver_id);
CREATE INDEX IF NOT EXISTS idx_ds_meet         ON core.dive_sheets(meet_id);
CREATE INDEX IF NOT EXISTS idx_ds_year         ON core.dive_sheets(meet_year);
CREATE INDEX IF NOT EXISTS idx_ds_dd           ON core.dive_sheets(dd);
CREATE INDEX IF NOT EXISTS idx_ds_category     ON core.dive_sheets(dive_category_code);
CREATE INDEX IF NOT EXISTS idx_ds_optional     ON core.dive_sheets(meet_year, discipline) WHERE optional_voluntary = 'O';

-- ---------------------------------------------------------------------------
-- core.zone_qualifier_lists — the OFFICIAL Zone->Nationals qualifier lists that
-- DiveMeets publishes at /QualificationLists/USADivingJOZones_{year}/ShowQualifiers/{meet}_{event}
-- These are NOT event results. They are the adjudicated top-N-per-event lists
-- USA Diving publishes as the authoritative Zone qualifiers, and they include
-- entries that never appear in a single event's result table (a diver can
-- qualify from a higher-scoring performance elsewhere). junior-data.js carries
-- these as `officialZoneQualifiers` / synthetic `sourceRow='synthetic_from_oqz'`
-- rows; this table is their durable home in Neon so the qualification pipeline
-- can be rebuilt from the database instead of a scraped SQLite file.
--
-- Row grain: one qualifier line (rank) per (meet_id, event_id). The optional
-- "*Nth Place Qualifying Score" average-score marker line each list carries is
-- stored with is_avg_score_marker = true and rank = NULL.
CREATE TABLE IF NOT EXISTS core.zone_qualifier_lists (
    id                   BIGSERIAL PRIMARY KEY,
    year                 SMALLINT NOT NULL,
    zone                 TEXT     NOT NULL,          -- 'A'..'F'
    meet_id_dm           TEXT     NOT NULL,          -- Zone meet id, e.g. '12878'
    event_id_dm          TEXT     NOT NULL,          -- DiveMeets event id, e.g. '30520'
    event_name           TEXT,                       -- 'Group A Girls 1m (16-18) - Final'
    event_key            TEXT,                       -- normalized 'Group A Girls 1M'
    age_group            TEXT,                       -- 'Group A' / 'Group B'
    gender               TEXT,                       -- 'Boys' / 'Girls'
    discipline           TEXT,                       -- '1M' / '3M'
    rank                 SMALLINT,                   -- qualifier rank (NULL for the marker row)
    diver_id_dm          TEXT,                       -- /Profile/{id}
    diver_name           TEXT,
    team_name            TEXT,
    team_id_dm           TEXT,                       -- /TeamProfile/{id}
    region_label         TEXT,                       -- 'Region 1'
    region_meet_id_dm    TEXT,                       -- /MeetResults/{id} the score came from
    score                NUMERIC,
    score_text           TEXT,                       -- verbatim '387.70'
    sheet_url            TEXT,                       -- DiveSheetResults link, verbatim
    is_avg_score_marker  BOOLEAN NOT NULL DEFAULT false,
    source_url           TEXT,
    imported_at          TIMESTAMPTZ DEFAULT now()
);
-- One row per qualifier line. rank is NULL only for the marker row, so the
-- marker is keyed separately (a partial unique index per event for it).
CREATE UNIQUE INDEX IF NOT EXISTS idx_zql_natural
    ON core.zone_qualifier_lists(year, meet_id_dm, event_id_dm, rank)
    WHERE rank IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_zql_marker
    ON core.zone_qualifier_lists(year, meet_id_dm, event_id_dm)
    WHERE is_avg_score_marker;
CREATE INDEX IF NOT EXISTS idx_zql_year   ON core.zone_qualifier_lists(year);
CREATE INDEX IF NOT EXISTS idx_zql_event  ON core.zone_qualifier_lists(year, event_key);
CREATE INDEX IF NOT EXISTS idx_zql_diver  ON core.zone_qualifier_lists(diver_id_dm);
CREATE INDEX IF NOT EXISTS idx_zql_zone   ON core.zone_qualifier_lists(year, zone);

-- Bump version
INSERT INTO app_meta.config (key, value, description) VALUES
  ('criteria_simulator_data_version', '1', 'Criteria sim phases + dive sheets in core')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- DiveMeets live entry counts, refreshed by .github/workflows/divemeets-entries.yml.
-- One row per (meet, DiveMeets event id); the workflow upserts on every run so
-- fetched_at always reflects the latest scrape. Read by Schedule Builder's
-- "Sync actual entries" feature.
CREATE TABLE IF NOT EXISTS junior_results.meet_entries (
    meet_id_dm   TEXT NOT NULL,
    event_id_dm  TEXT NOT NULL,
    event_name   TEXT NOT NULL,
    age_group    TEXT,
    gender       TEXT,
    discipline   TEXT,
    round        TEXT,
    entries      INTEGER NOT NULL DEFAULT 0,
    fetched_at   TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (meet_id_dm, event_id_dm)
);
CREATE INDEX IF NOT EXISTS idx_meet_entries_meet ON junior_results.meet_entries(meet_id_dm);

-- Per-diver registered entrants from DiveSheets pages, refreshed alongside
-- meet_entries by the same workflow. diver_key uses the projected-field
-- convention ('nm:' + lowercased whitespace-collapsed name) so registered
-- entrants JOIN directly to junior_results.projected_nationals_field.
CREATE TABLE IF NOT EXISTS junior_results.meet_entrants (
    meet_id_dm     TEXT NOT NULL,
    event_id_dm    TEXT NOT NULL,
    dm_profile_id  TEXT NOT NULL,
    diver_name     TEXT NOT NULL,
    team_id_dm     TEXT,
    team           TEXT,
    diver_key      TEXT NOT NULL,
    age_group      TEXT,
    gender         TEXT,
    discipline     TEXT,
    fetched_at     TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (meet_id_dm, event_id_dm, dm_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_meet_entrants_meet  ON junior_results.meet_entrants(meet_id_dm);
CREATE INDEX IF NOT EXISTS idx_meet_entrants_key   ON junior_results.meet_entrants(diver_key);


-- ============================================================
-- SCHEMA: season_calendar — cloud sync for the Season Calendar Planner
-- Single shared document (one row, id='main') holding the whole
-- events + versions payload as JSONB, so all staff see the same
-- working draft instead of separate per-device localStorage copies.
-- ============================================================
CREATE SCHEMA IF NOT EXISTS season_calendar;

CREATE TABLE IF NOT EXISTS season_calendar.calendar (
    id          TEXT PRIMARY KEY DEFAULT 'main',
    data        JSONB NOT NULL,
    updated_by  TEXT,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Self-heal: an earlier version of this table existed without updated_by
-- and without the 'main' default on id. Idempotent guards fix either state.
ALTER TABLE season_calendar.calendar ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE season_calendar.calendar ALTER COLUMN id SET DEFAULT 'main';

DO $$ BEGIN
  CREATE TRIGGER trg_season_calendar BEFORE UPDATE ON season_calendar.calendar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO app_meta.config (key, value, description) VALUES
  ('season_calendar_version', '1', 'Season Calendar Planner data schema version')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- scoresandmore: scraped data from scoresandmore.live (Dive Live / AAU Diving)
-- Populated by db/scripts/sm_scrape.py via .github/workflows/scoresandmore-scrape.yml.
-- Every table keeps the full parsed source row in `data` JSONB (zero data loss).
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS scoresandmore;

CREATE TABLE IF NOT EXISTS scoresandmore.meets (
  meet_id     integer PRIMARY KEY,
  meet_name   text,
  start_date  date,
  end_date    date,
  data        jsonb NOT NULL,
  scraped_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scoresandmore.meet_events (
  id          bigserial PRIMARY KEY,
  -- event_id can legitimately repeat in the source events list (observed:
  -- event 37592 listed twice at meet 6925) — preserved verbatim, so NOT a PK.
  event_id    integer NOT NULL,
  meet_id     integer NOT NULL,
  meet_name   text,
  event_date  date,
  session     text,
  event_title text,
  rounds      integer,
  num_dives   integer,
  gender      text,
  novice      text,
  synchro     text,
  results_url text,
  data        jsonb NOT NULL,
  scraped_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sm_meet_events_meet ON scoresandmore.meet_events(meet_id);
CREATE INDEX IF NOT EXISTS sm_meet_events_event ON scoresandmore.meet_events(event_id);
-- Migration for tables created before the surrogate-PK change:
ALTER TABLE scoresandmore.meet_events ADD COLUMN IF NOT EXISTS id bigserial;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'scoresandmore.meet_events'::regclass
      AND c.contype = 'p'
      AND (SELECT attname FROM pg_attribute
           WHERE attrelid = c.conrelid AND attnum = c.conkey[1]) = 'event_id'
  ) THEN
    ALTER TABLE scoresandmore.meet_events DROP CONSTRAINT meet_events_pkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'scoresandmore.meet_events'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE scoresandmore.meet_events ADD PRIMARY KEY (id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS scoresandmore.event_results (
  id          bigserial PRIMARY KEY,
  meet_id     integer NOT NULL,
  event_id    integer NOT NULL,
  place       text,
  diver_name  text,      -- verbatim from source, incl. any "(Ex.)" prefix
  -- true when the source lists the diver as exhibition ("(Ex.)" name prefix);
  -- exhibition divers carry their own place numbers within an event
  is_exhibition boolean NOT NULL DEFAULT false,
  grad_year   text,
  team_name   text,
  total       numeric,
  vols_total  numeric,
  opts_total  numeric,
  team_points numeric,
  diver_id    integer,   -- from Dive Live sheet URL /DiveList/{diver_id}-{sheet_id}
  sheet_id    integer,
  pdf_url     text,
  sheet_url   text,
  data        jsonb NOT NULL,
  scraped_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sm_event_results_event ON scoresandmore.event_results(event_id);
CREATE INDEX IF NOT EXISTS sm_event_results_meet  ON scoresandmore.event_results(meet_id);
CREATE INDEX IF NOT EXISTS sm_event_results_diver ON scoresandmore.event_results(diver_id);
-- Migration for tables created before the exhibition flag:
ALTER TABLE scoresandmore.event_results
  ADD COLUMN IF NOT EXISTS is_exhibition boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS scoresandmore.team_points (
  id         bigserial PRIMARY KEY,
  meet_id    integer NOT NULL,
  team_name  text,
  points     numeric,
  data       jsonb NOT NULL,
  scraped_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sm_team_points_meet ON scoresandmore.team_points(meet_id);

CREATE TABLE IF NOT EXISTS scoresandmore.coach_points (
  id         bigserial PRIMARY KEY,
  meet_id    integer NOT NULL,
  coach_name text,
  team_name  text,
  points     numeric,
  data       jsonb NOT NULL,
  scraped_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sm_coach_points_meet ON scoresandmore.coach_points(meet_id);

-- ============================================================
-- DiveMeets crawl registry (divemeets schema)
-- Catalog of every new.divemeets.com meet id, crawled newest-first.
-- Status flags let results/dive-sheet crawlers drain work by year
-- (2026 -> 2016) without re-scraping anything already in core.*.
-- ============================================================
CREATE SCHEMA IF NOT EXISTS divemeets;

CREATE TABLE IF NOT EXISTS divemeets.meets (
  meet_id      integer PRIMARY KEY,
  http_status  integer,              -- 200 = page exists, 404 = dead id
  meet_name    text,
  venue        text,
  start_date   date,
  end_date     date,
  dates_raw    text,
  address      text,
  sanction     text,                 -- "Sanctioning Body" from MeetInfo
  meet_type    text,
  info         jsonb,                -- all labeled MeetInfo fields, verbatim
  results_done boolean NOT NULL DEFAULT false,
  sheets_done  boolean NOT NULL DEFAULT false,
  crawled_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dm_meets_year     ON divemeets.meets(start_date);
CREATE INDEX IF NOT EXISTS dm_meets_sanction ON divemeets.meets(sanction);

-- DiveMeets results layer (phase 2): every event + placement row per meet,
-- crawled from the divemeets.meets registry newest-first.
CREATE TABLE IF NOT EXISTS divemeets.events (
  id         bigserial PRIMARY KEY,
  meet_id    integer NOT NULL,
  event_id   integer NOT NULL,
  round      text NOT NULL,      -- "1"=Prelim/Quarterfinal, "9"=Final, etc.
  title      text,
  entries    integer,
  event_date date,
  UNIQUE (meet_id, event_id, round)
);
CREATE INDEX IF NOT EXISTS dm_events_meet ON divemeets.events(meet_id);

CREATE TABLE IF NOT EXISTS divemeets.results (
  id         bigserial PRIMARY KEY,
  meet_id    integer NOT NULL,
  event_id   integer NOT NULL,
  round      text NOT NULL,
  place      text,               -- verbatim (can be non-numeric for Ex./DQ)
  diver_name text,
  profile_id integer,            -- stable DiveMeets athlete id
  team_name  text,
  team_id    integer,
  score      numeric,
  diff_first numeric,
  sheet_key  bigint              -- key for the DiveSheetResults page (phase 3)
);
CREATE INDEX IF NOT EXISTS dm_results_meet    ON divemeets.results(meet_id);
CREATE INDEX IF NOT EXISTS dm_results_profile ON divemeets.results(profile_id);
CREATE INDEX IF NOT EXISTS dm_results_event   ON divemeets.results(meet_id, event_id, round);
-- crawl bookkeeping on the registry
ALTER TABLE divemeets.meets ADD COLUMN IF NOT EXISTS results_note text;
ALTER TABLE divemeets.meets ADD COLUMN IF NOT EXISTS results_crawled_at timestamptz;
-- Per-meet failure counter so one un-crawlable meet cannot poison the head of
-- the results queue forever (queue is ordered newest-first and the crawler used
-- to re-raise, killing every scheduled run on the same meet).
ALTER TABLE divemeets.meets ADD COLUMN IF NOT EXISTS results_attempts integer NOT NULL DEFAULT 0;

-- ScoresAndMore (Dive Live) coverage gaps: events whose results grid exceeded
-- Zoho's 200-row cap and were therefore skipped rather than ingested partially.
-- Lets the apps distinguish "this event had no entrants" from "we could not
-- fetch this event".
-- Gender derived for athlete members by name-matching Junior Circuit results
-- (core.event_results carries gender; the Webpoint export does not). Only
-- unambiguous name matches are stored; validated at 96.4% age-group agreement.
CREATE TABLE IF NOT EXISTS membership.member_gender (
  member_id  text PRIMARY KEY,
  gender     text NOT NULL,
  source     text NOT NULL,
  match_name text,
  derived_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scoresandmore.scrape_gaps (
  meet_id  integer NOT NULL,
  event_id integer NOT NULL,
  reason   text,
  noted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meet_id, event_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- season_calendar.meet_deadlines — DiveMeets MeetInfo deadline pulls
-- Populated by db/scripts/fetch_meet_deadlines.py
-- (.github/workflows/divemeets-deadlines.yml — weekly cron + on-demand).
-- One row per DiveMeets meet id referenced by a Season Calendar event.
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS season_calendar.meet_deadlines (
  dm_id      text PRIMARY KEY,      -- DiveMeets meet id (verbatim string)
  meet_name  text,                  -- meet name as shown on MeetInfo page
  meet_dates text,                  -- raw date-range line from MeetInfo page
  deadlines  jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- deadlines shape:
  -- { "signupCloses": {"raw": "...", "date": "YYYY-MM-DD"|null, "time": "HH:MM"|null},
  --   "lateFee":      {"raw": "...", "date": "YYYY-MM-DD"|null, "time": "HH:MM"|null},
  --   "feePerEvent":  "$115.00" | null,
  --   "error":        "..." (present only when the fetch/parse failed) }
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- DiveMeets dive-sheet layer (phase 3): every individual dive for every
-- placement row in divemeets.results, keyed by the sheet_key captured there.
CREATE TABLE IF NOT EXISTS divemeets.sheet_dives (
  id          bigserial PRIMARY KEY,
  meet_id     integer NOT NULL,
  event_id    integer NOT NULL,
  round       text NOT NULL,
  profile_id  integer NOT NULL,
  sheet_key   bigint NOT NULL,
  dive_order  integer NOT NULL,
  dive_number text,
  height      text,
  description text,
  net_score   numeric,
  dd          numeric,
  score       numeric,
  round_place numeric,
  opt_vol     text,              -- DiveMeets' own V/O flag per dive
  UNIQUE (meet_id, event_id, round, profile_id, dive_order)
);
CREATE INDEX IF NOT EXISTS dm_sheet_dives_meet    ON divemeets.sheet_dives(meet_id);
CREATE INDEX IF NOT EXISTS dm_sheet_dives_profile ON divemeets.sheet_dives(profile_id);
ALTER TABLE divemeets.meets ADD COLUMN IF NOT EXISTS sheets_note text;
ALTER TABLE divemeets.meets ADD COLUMN IF NOT EXISTS sheets_crawled_at timestamptz;

-- Targeted crawl queue. The results/sheets crawlers normally drain a whole
-- sanction (USA Diving, AAU). NCAA is different: the registry holds 7,200+
-- NCAA meets, of which only D1 conference/national/zone championships are
-- wanted, so those crawlers also accept TARGET_TAG and pull their queue from
-- this table instead of the sanction filter. Seeded (and re-seeded as new
-- seasons appear) by db/scripts/queue_ncaa_targets.py.
--   tag examples: ncaa_d1_national, ncaa_d1_conference, ncaa_zone,
--                 ncaa_d1_conference_multidiv  (ECAC/Metropolitan — kept
--                 separable because those championships mix divisions)
CREATE TABLE IF NOT EXISTS divemeets.crawl_targets (
  meet_id    integer PRIMARY KEY,
  tag        text NOT NULL,
  label      text,
  want_sheets boolean NOT NULL DEFAULT true,
  added_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dm_crawl_targets_tag ON divemeets.crawl_targets(tag);


-- SCHEMA 10: membership — Membership Analytics app
-- PII POLICY (agreed 2026-07-20): NEVER load street addresses, emails,
-- phone numbers, or parent contact info into this schema. Analytical
-- fields only: identity (id/name), geography (city/state/zip), birth date
-- (needed for age-group analysis + DiveMeets matching), membership metadata.
CREATE SCHEMA IF NOT EXISTS membership;

CREATE TABLE IF NOT EXISTS membership.members (
    member_id       TEXT NOT NULL,
    membership_year SMALLINT NOT NULL,
    membership_type TEXT NOT NULL DEFAULT '',
    first_name      TEXT,
    last_name       TEXT,
    city            TEXT,
    state           TEXT,
    zip             TEXT,
    zip5            TEXT,
    country         TEXT,
    birth_date      DATE,
    start_date      DATE,
    exp_date        DATE,
    association     TEXT,
    club            TEXT,
    member_status   TEXT,
    loaded_at       TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (member_id, membership_year, membership_type)
);
CREATE INDEX IF NOT EXISTS idx_mem_year   ON membership.members(membership_year);
CREATE INDEX IF NOT EXISTS idx_mem_assoc  ON membership.members(association);
CREATE INDEX IF NOT EXISTS idx_mem_state  ON membership.members(state);
CREATE INDEX IF NOT EXISTS idx_mem_zip5   ON membership.members(zip5);
CREATE INDEX IF NOT EXISTS idx_mem_id     ON membership.members(member_id);

CREATE TABLE IF NOT EXISTS membership.ingest_log (
    id SERIAL PRIMARY KEY,
    membership_year SMALLINT,
    source_file TEXT,
    row_count INT,
    loaded_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT
);

-- Boundary Studio scenarios (Membership Analytics)
CREATE TABLE IF NOT EXISTS membership.boundary_scenarios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Accounting same-period membership sales ledger (source: accountant xlsx, Dec-Jun windows)
CREATE TABLE IF NOT EXISTS membership.sales_ledger (
    year INT NOT NULL,
    month INT NOT NULL,
    item TEXT NOT NULL,
    cnt INT NOT NULL,
    total NUMERIC(12,2),
    PRIMARY KEY (year, month, item)
);

-- ── analytics schema ──────────────────────────────────────────────
-- Materialized analytics for the Athlete Evaluation app. Tables are
-- OWNED and rebuilt by db/scripts/build_analytics.py (daily via
-- analytics-refresh.yml, safe to re-run while the dive-sheet scraper
-- back-fills toward 2015). Only the schema itself is created here.
CREATE SCHEMA IF NOT EXISTS analytics;


-- Dive Live crawl state (MODE=queue in db/scripts/sm_scrape.py). Same
-- done/attempts/note shape as the DiveMeets registry so the two pipelines are
-- read the same way.
ALTER TABLE scoresandmore.meets ADD COLUMN IF NOT EXISTS results_done boolean NOT NULL DEFAULT false;
ALTER TABLE scoresandmore.meets ADD COLUMN IF NOT EXISTS results_note text;
ALTER TABLE scoresandmore.meets ADD COLUMN IF NOT EXISTS results_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE scoresandmore.meets ADD COLUMN IF NOT EXISTS results_crawled_at timestamptz;
CREATE INDEX IF NOT EXISTS sm_meets_queue ON scoresandmore.meets(results_done, start_date);


-- ---------------------------------------------------------------------------
-- Version history. This table was created ad hoc outside the schema and was
-- never declared here, so a rebuilt database would not have had it and version
-- history would have failed silently. Declared now, matching the live shape.
CREATE TABLE IF NOT EXISTS schedule_builder.schedule_versions (
    id          BIGSERIAL PRIMARY KEY,
    schedule_id TEXT,
    label       TEXT,
    data        JSONB,
    created_at  TIMESTAMPTZ DEFAULT now()
);
-- CREATE TABLE IF NOT EXISTS silently no-ops on a table that already exists, so
-- columns are guarded individually or drift goes unnoticed.
ALTER TABLE schedule_builder.schedule_versions ADD COLUMN IF NOT EXISTS schedule_id TEXT;
ALTER TABLE schedule_builder.schedule_versions ADD COLUMN IF NOT EXISTS label       TEXT;
ALTER TABLE schedule_builder.schedule_versions ADD COLUMN IF NOT EXISTS data        JSONB;
ALTER TABLE schedule_builder.schedule_versions ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT now();
-- Every read is "this schedule's versions, newest first".
CREATE INDEX IF NOT EXISTS schedule_versions_by_schedule
    ON schedule_builder.schedule_versions(schedule_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Live run sheet: what ACTUALLY happened, kept OUT of the schedule blob.
--
-- Actuals used to live inside schedules.data as data->'live'. That meant every
-- tap on the deck rewrote and republished the entire published schedule, so a
-- device holding an older copy could overwrite newer plan edits made elsewhere.
-- Recording reality and authoring the plan are different jobs with different
-- edit patterns and they now have different rows.
CREATE TABLE IF NOT EXISTS schedule_builder.run_sheets (
    schedule_id TEXT PRIMARY KEY,
    data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One-time backfill of anything already recorded inside a schedule blob.
-- ON CONFLICT DO NOTHING makes it safe to re-run on every migration: once a
-- run sheet row exists it is the source of truth and is never overwritten from
-- the (now frozen) copy in the blob.
INSERT INTO schedule_builder.run_sheets(schedule_id, data, updated_at)
SELECT id, data->'live', now()
  FROM schedule_builder.schedules
 WHERE data ? 'live'
   AND jsonb_typeof(data->'live') = 'object'
ON CONFLICT (schedule_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Scoped-role grants. usad_app is the browser-facing read role shipped in
-- data/config.js, so this list is effectively public: only public competition
-- data goes here. The membership schema is deliberately absent (PII policy).
-- Without this, every new table added above is invisible to the apps until
-- someone remembers to grant it by hand.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usad_app') THEN
    GRANT USAGE ON SCHEMA divemeets, scoresandmore TO usad_app;
    GRANT SELECT ON ALL TABLES IN SCHEMA divemeets    TO usad_app;
    GRANT SELECT ON ALL TABLES IN SCHEMA scoresandmore TO usad_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA divemeets
      GRANT SELECT ON TABLES TO usad_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA scoresandmore
      GRANT SELECT ON TABLES TO usad_app;
    -- core + analytics are what the Athlete Evaluation app actually reads.
    -- These grants were applied by hand once and were silently lost, because
    -- build_analytics.py DROPs and recreates every analytics table on each
    -- daily run and a dropped table takes its ACL with it. The ALTER DEFAULT
    -- PRIVILEGES line below is the durable fix: tables created by this same
    -- migration role in analytics inherit SELECT automatically, so a rebuild
    -- can no longer lock the browser role out.
    GRANT USAGE ON SCHEMA core, analytics TO usad_app;
    GRANT SELECT ON ALL TABLES IN SCHEMA core      TO usad_app;
    GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO usad_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA core
      GRANT SELECT ON TABLES TO usad_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
      GRANT SELECT ON TABLES TO usad_app;
    -- Schedule Builder is READ-WRITE from the browser, unlike the crawl schemas
    -- above. These grants existed only because someone applied them by hand; a
    -- rebuilt database would have had the tables and no access to them.
    GRANT USAGE ON SCHEMA schedule_builder TO usad_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      schedule_builder.schedules,
      schedule_builder.presence,
      schedule_builder.schedule_versions,
      schedule_builder.run_sheets
      TO usad_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA schedule_builder TO usad_app;
    -- NOTE: usad_app deliberately has no CREATE on this schema. Tables are the
    -- migration's job. Client code must never try to create one.
    ALTER DEFAULT PRIVILEGES IN SCHEMA schedule_builder
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO usad_app;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- core.dive_skills — the Skills Bank (2026 Rulebook Art. 401.4 / 503.15(d))
-- plus the Group D platform lineup allowance (Art. 302.2(a)(3)).
-- These are NOT rulebook dives; they are scored actions at DD 1.0 used in
-- novice / Future Champions / age-group competition. Catalogued separately so
-- they never contaminate dive-group execution statistics.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.dive_skills (
    code            TEXT PRIMARY KEY,
    stem            TEXT NOT NULL,
    position_code   TEXT,
    skill_name      TEXT NOT NULL,
    rulebook_cite   TEXT,
    platform_only   BOOLEAN DEFAULT false,
    notes           TEXT
);

-- Taxonomy columns on core.dive_sheets. CREATE TABLE IF NOT EXISTS no-ops on an
-- existing table, so these must be explicit ALTERs.
ALTER TABLE core.dive_sheets ADD COLUMN IF NOT EXISTS dive_bucket      TEXT;
ALTER TABLE core.dive_sheets ADD COLUMN IF NOT EXISTS dive_group_code  TEXT;
ALTER TABLE core.dive_sheets ADD COLUMN IF NOT EXISTS dive_group_label TEXT;
ALTER TABLE core.dive_sheets ADD COLUMN IF NOT EXISTS dive_code_norm   TEXT;

CREATE INDEX IF NOT EXISTS idx_ds_bucket ON core.dive_sheets(dive_bucket);
CREATE INDEX IF NOT EXISTS idx_ds_groupcode ON core.dive_sheets(dive_group_code);

-- ---------------------------------------------------------------------------
-- core.nations — IOC nation reference, and nation_code on dive_sheets.
-- team_name arrives as IOC codes from some sources and full English names from
-- others; without this, nation-level analysis splits each country in two.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS core.nations (
    ioc_code      TEXT PRIMARY KEY,
    nation_name   TEXT NOT NULL,
    dives         INTEGER DEFAULT 0,
    divers        INTEGER DEFAULT 0,
    first_year    INTEGER,
    last_year     INTEGER
);

ALTER TABLE core.dive_sheets ADD COLUMN IF NOT EXISTS nation_code TEXT;
CREATE INDEX IF NOT EXISTS idx_ds_nation ON core.dive_sheets(nation_code);

-- Values that look like nations but could not be resolved, kept for review
-- rather than silently guessed.
CREATE TABLE IF NOT EXISTS core.nation_unresolved (
    team_name   TEXT PRIMARY KEY,
    reason      TEXT,
    dives       INTEGER,
    divers      INTEGER,
    seen_at     TIMESTAMPTZ DEFAULT now()
);

-- Grants for the browser role on the tables added with the dive taxonomy and
-- nation normalization. schema.sql grants per-schema elsewhere, but tables
-- created after those blocks need an explicit pass or the app role cannot read.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usad_app') THEN
    GRANT SELECT ON core.dive_skills        TO usad_app;
    GRANT SELECT ON core.nations            TO usad_app;
    GRANT SELECT ON core.nation_unresolved  TO usad_app;
  END IF;
END $$;
