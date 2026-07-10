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
