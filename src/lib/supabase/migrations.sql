-- =====================================================
-- DemonOS Scraper Database Schema
-- Run this SQL in Supabase SQL Editor to create tables
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- Scraper run status
DO $$ BEGIN
    CREATE TYPE scraper_run_status AS ENUM (
        'pending',
        'running',
        'succeeded',
        'failed',
        'aborted',
        'timed_out'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Log level enum
DO $$ BEGIN
    CREATE TYPE log_level AS ENUM (
        'debug',
        'info',
        'warn',
        'error',
        'fatal'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- Table: app_logs
-- Stores application-wide logs
-- =====================================================
CREATE TABLE IF NOT EXISTS app_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level log_level NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',           -- Additional context data (user, action, etc.)
    source VARCHAR(255),                   -- Component/module that generated the log
    user_agent TEXT,                       -- Browser/client info
    ip_address VARCHAR(45),                -- IPv4 or IPv6
    request_id VARCHAR(255),               -- For tracing requests
    duration_ms INTEGER,                   -- For performance logging
    error_stack TEXT,                      -- Stack trace for errors
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for app_logs
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_source ON app_logs(source);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_context ON app_logs USING GIN(context);

-- =====================================================
-- Table: scraper_runs
-- Tracks all scraper executions from Apify
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Apify identifiers
    run_id VARCHAR(255) NOT NULL UNIQUE,   -- Apify run ID
    actor_id VARCHAR(255) NOT NULL,        -- Actor identifier (e.g., cheapget/telegram-group-member)
    actor_name VARCHAR(255) NOT NULL,      -- Human-readable name
    build_id VARCHAR(255),                 -- Apify build ID
    build_number VARCHAR(50),              -- Apify build number
    
    -- Status tracking
    status scraper_run_status DEFAULT 'pending',
    status_message TEXT,                   -- Detailed status message from Apify
    exit_code INTEGER,                     -- Exit code when finished
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER DEFAULT 0,
    
    -- Results
    items_count INTEGER DEFAULT 0,
    dataset_id VARCHAR(255),               -- Apify dataset ID for results
    default_key_value_store_id VARCHAR(255),
    default_request_queue_id VARCHAR(255),
    
    -- Input/Output
    input_config JSONB DEFAULT '{}',       -- Input parameters used
    output_summary JSONB DEFAULT '{}',     -- Summary of output/results
    
    -- Resource usage (from Apify stats)
    memory_mbytes INTEGER,
    cpu_usage DECIMAL(5,2),
    proxy_info JSONB DEFAULT '{}',
    
    -- Cost tracking
    compute_units DECIMAL(10,4),
    usage_usd DECIMAL(10,4),
    
    -- Error handling
    error_message TEXT,
    error_type VARCHAR(255),
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    container_url TEXT,
    origin VARCHAR(50),                    -- API, CONSOLE, SCHEDULER, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scraper_runs
CREATE INDEX IF NOT EXISTS idx_scraper_runs_status ON scraper_runs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_actor_id ON scraper_runs(actor_id);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_started_at ON scraper_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_dataset_id ON scraper_runs(dataset_id);

-- =====================================================
-- Table: scraper_run_logs
-- Stores logs from individual scraper runs (from Apify)
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_run_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES scraper_runs(id) ON DELETE CASCADE,
    
    -- Log content
    level log_level DEFAULT 'info',
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- Metadata
    line_number INTEGER,                   -- Line number in the log
    exception TEXT,                        -- Exception details if any
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scraper_run_logs
CREATE INDEX IF NOT EXISTS idx_scraper_run_logs_run_id ON scraper_run_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_scraper_run_logs_level ON scraper_run_logs(level);
CREATE INDEX IF NOT EXISTS idx_scraper_run_logs_timestamp ON scraper_run_logs(timestamp);

-- =====================================================
-- Table: telegram_members
-- Stores scraped Telegram group members
-- Matches output structure from cheapget/telegram-group-member
-- =====================================================
CREATE TABLE IF NOT EXISTS telegram_members (
    -- Internal fields
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES scraper_runs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Apify output fields
    source_url TEXT NOT NULL,                     -- Telegram group URL where the user was found
    processor TEXT,                               -- URL of the Apify actor that processed this data
    processed_at TIMESTAMPTZ,                     -- When the data was processed
    telegram_id VARCHAR(255) NOT NULL,            -- Telegram user unique identifier
    first_name VARCHAR(255),                      -- User's first name
    last_name VARCHAR(255),                       -- User's last name
    usernames TEXT[],                             -- List of user's active and historical usernames
    phone VARCHAR(50),                            -- User's phone number if publicly visible
    type VARCHAR(50) DEFAULT 'user',              -- Classification: user or bot
    is_deleted BOOLEAN DEFAULT FALSE,             -- Whether the account has been deleted
    is_verified BOOLEAN DEFAULT FALSE,            -- Whether officially verified by Telegram
    is_premium BOOLEAN DEFAULT FALSE,             -- Whether has Telegram Premium
    is_scam BOOLEAN DEFAULT FALSE,                -- Whether flagged as scammer
    is_fake BOOLEAN DEFAULT FALSE,                -- Whether flagged as fake account
    is_restricted BOOLEAN DEFAULT FALSE,          -- Whether restricted in certain jurisdictions
    lang_code VARCHAR(10),                        -- User's preferred interface language code
    last_seen VARCHAR(100),                       -- Activity status (Online, timestamps, etc.)
    stories_hidden BOOLEAN DEFAULT FALSE,         -- Whether stories are hidden from public
    premium_contact BOOLEAN DEFAULT FALSE,        -- Whether contacting requires premium
    
    -- Unique constraint to prevent duplicates per group
    UNIQUE(telegram_id, source_url)
);

-- Indexes for telegram_members
CREATE INDEX IF NOT EXISTS idx_telegram_members_telegram_id ON telegram_members(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_members_source_url ON telegram_members(source_url);
CREATE INDEX IF NOT EXISTS idx_telegram_members_usernames ON telegram_members USING GIN(usernames);
CREATE INDEX IF NOT EXISTS idx_telegram_members_run_id ON telegram_members(run_id);
CREATE INDEX IF NOT EXISTS idx_telegram_members_processed_at ON telegram_members(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_members_is_premium ON telegram_members(is_premium) WHERE is_premium = TRUE;
CREATE INDEX IF NOT EXISTS idx_telegram_members_is_scam ON telegram_members(is_scam) WHERE is_scam = TRUE;
CREATE INDEX IF NOT EXISTS idx_telegram_members_type ON telegram_members(type);

-- =====================================================
-- Table: scraper_schedules (for future scheduled runs)
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    input_config JSONB NOT NULL DEFAULT '{}',
    cron_expression VARCHAR(100),          -- e.g., "0 0 * * *" for daily
    is_enabled BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for schedules
CREATE INDEX IF NOT EXISTS idx_scraper_schedules_next_run ON scraper_schedules(next_run_at) WHERE is_enabled = TRUE;

-- =====================================================
-- Functions & Triggers
-- =====================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for scraper_runs
DROP TRIGGER IF EXISTS update_scraper_runs_updated_at ON scraper_runs;
CREATE TRIGGER update_scraper_runs_updated_at
    BEFORE UPDATE ON scraper_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for scraper_schedules
DROP TRIGGER IF EXISTS update_scraper_schedules_updated_at ON scraper_schedules;
CREATE TRIGGER update_scraper_schedules_updated_at
    BEFORE UPDATE ON scraper_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) Policies
-- For now, allow all operations (no auth required)
-- =====================================================
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_schedules ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all (adjust for production with proper auth)
DROP POLICY IF EXISTS "Allow all for app_logs" ON app_logs;
CREATE POLICY "Allow all for app_logs" ON app_logs
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for scraper_runs" ON scraper_runs;
CREATE POLICY "Allow all for scraper_runs" ON scraper_runs
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for scraper_run_logs" ON scraper_run_logs;
CREATE POLICY "Allow all for scraper_run_logs" ON scraper_run_logs
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for telegram_members" ON telegram_members;
CREATE POLICY "Allow all for telegram_members" ON telegram_members
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for scraper_schedules" ON scraper_schedules;
CREATE POLICY "Allow all for scraper_schedules" ON scraper_schedules
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Views for common queries
-- =====================================================

-- View: Recent runs with stats
CREATE OR REPLACE VIEW recent_scraper_runs AS
SELECT 
    sr.*,
    COUNT(tm.id) as actual_items_count,
    COUNT(CASE WHEN tm.is_premium THEN 1 END) as premium_count,
    COUNT(CASE WHEN tm.is_scam THEN 1 END) as scam_count
FROM scraper_runs sr
LEFT JOIN telegram_members tm ON tm.run_id = sr.id
GROUP BY sr.id
ORDER BY sr.started_at DESC
LIMIT 100;

-- View: Group statistics (by source_url)
CREATE OR REPLACE VIEW telegram_group_stats AS
SELECT 
    source_url,
    COUNT(*) as member_count,
    COUNT(CASE WHEN is_premium THEN 1 END) as premium_count,
    COUNT(CASE WHEN type = 'bot' THEN 1 END) as bot_count,
    COUNT(CASE WHEN is_scam THEN 1 END) as scam_count,
    COUNT(CASE WHEN is_deleted THEN 1 END) as deleted_count,
    COUNT(CASE WHEN is_verified THEN 1 END) as verified_count,
    MAX(processed_at) as last_scraped
FROM telegram_members
GROUP BY source_url
ORDER BY member_count DESC;

-- View: App log summary (last 24h)
CREATE OR REPLACE VIEW app_log_summary AS
SELECT 
    level,
    source,
    COUNT(*) as count,
    MAX(created_at) as last_occurrence
FROM app_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY level, source
ORDER BY count DESC;

-- View: Scraper run summary (last 7 days)
CREATE OR REPLACE VIEW scraper_run_summary AS
SELECT 
    actor_id,
    actor_name,
    COUNT(*) as total_runs,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_runs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_runs,
    SUM(items_count) as total_items,
    AVG(duration_ms)::INTEGER as avg_duration_ms,
    SUM(usage_usd) as total_cost_usd
FROM scraper_runs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY actor_id, actor_name
ORDER BY total_runs DESC;

-- =====================================================
-- Helper function: Log app event
-- =====================================================
CREATE OR REPLACE FUNCTION log_app_event(
    p_level log_level,
    p_message TEXT,
    p_source VARCHAR(255) DEFAULT NULL,
    p_context JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO app_logs (level, message, source, context)
    VALUES (p_level, p_message, p_source, p_context)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Cleanup function: Delete old logs (keep last 30 days)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM app_logs
        WHERE created_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    WITH deleted_run_logs AS (
        DELETE FROM scraper_run_logs
        WHERE created_at < NOW() - INTERVAL '30 days'
        RETURNING id
    )
    SELECT deleted_count + COUNT(*) INTO deleted_count FROM deleted_run_logs;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
