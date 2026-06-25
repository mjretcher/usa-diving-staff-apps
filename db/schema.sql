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
