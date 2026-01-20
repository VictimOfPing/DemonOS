-- =====================================================
-- DemonOS Database Schema v2 - Generic Scraper Data
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- Table: scraped_data
-- Generic table for storing data from ANY scraper type
-- =====================================================
CREATE TABLE IF NOT EXISTS scraped_data (
    -- Internal fields
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES scraper_runs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Scraper identification
    scraper_type VARCHAR(50) NOT NULL,            -- "telegram", "instagram", "twitter", etc.
    scraper_actor VARCHAR(255),                    -- Actor ID (e.g., "bhansalisoft/telegram-group-member-scraper")
    
    -- Source identification
    source_identifier VARCHAR(500) NOT NULL,      -- Group URL, username, profile URL, etc.
    source_name VARCHAR(255),                      -- Human-readable name of the source
    
    -- Entity identification (the scraped item)
    entity_id VARCHAR(255) NOT NULL,              -- Unique ID within the platform (user_id, post_id, etc.)
    entity_type VARCHAR(50) DEFAULT 'user',       -- "user", "post", "comment", "member", etc.
    entity_name VARCHAR(255),                      -- Display name
    
    -- Flexible data storage
    data JSONB NOT NULL DEFAULT '{}',             -- All platform-specific data
    
    -- Common metadata (extracted from data for indexing)
    username VARCHAR(255),                         -- Primary username if applicable
    display_name VARCHAR(255),                     -- Primary display name
    profile_url TEXT,                              -- Direct link to the entity
    
    -- Flags (common across platforms)
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    is_bot BOOLEAN DEFAULT FALSE,
    is_suspicious BOOLEAN DEFAULT FALSE,          -- Scam, fake, etc.
    is_active BOOLEAN DEFAULT TRUE,               -- Not deleted/banned
    
    -- Unique constraint per scraper type and source
    UNIQUE(scraper_type, source_identifier, entity_id)
);

-- Indexes for scraped_data
CREATE INDEX IF NOT EXISTS idx_scraped_data_scraper_type ON scraped_data(scraper_type);
CREATE INDEX IF NOT EXISTS idx_scraped_data_source_identifier ON scraped_data(source_identifier);
CREATE INDEX IF NOT EXISTS idx_scraped_data_entity_id ON scraped_data(entity_id);
CREATE INDEX IF NOT EXISTS idx_scraped_data_entity_type ON scraped_data(entity_type);
CREATE INDEX IF NOT EXISTS idx_scraped_data_run_id ON scraped_data(run_id);
CREATE INDEX IF NOT EXISTS idx_scraped_data_created_at ON scraped_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_data_data ON scraped_data USING GIN(data);
CREATE INDEX IF NOT EXISTS idx_scraped_data_username ON scraped_data(username);
CREATE INDEX IF NOT EXISTS idx_scraped_data_is_premium ON scraped_data(is_premium) WHERE is_premium = TRUE;
CREATE INDEX IF NOT EXISTS idx_scraped_data_is_verified ON scraped_data(is_verified) WHERE is_verified = TRUE;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_scraped_data_updated_at ON scraped_data;
CREATE TRIGGER update_scraped_data_updated_at
    BEFORE UPDATE ON scraped_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policy
ALTER TABLE scraped_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for scraped_data" ON scraped_data;
CREATE POLICY "Allow all for scraped_data" ON scraped_data
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Table: scraper_configs
-- Configuration for different scraper types
-- =====================================================
CREATE TABLE IF NOT EXISTS scraper_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scraper_type VARCHAR(50) NOT NULL UNIQUE,     -- "telegram", "instagram", etc.
    name VARCHAR(255) NOT NULL,                    -- "Telegram Group Scraper"
    description TEXT,
    actor_id VARCHAR(255) NOT NULL,                -- Apify actor ID
    platform VARCHAR(50) NOT NULL,                 -- Platform name
    icon VARCHAR(50),                              -- Icon name or emoji
    color VARCHAR(20),                             -- Theme color
    
    -- Input schema (what fields the scraper accepts)
    input_schema JSONB DEFAULT '{}',
    
    -- Output mapping (how to map actor output to scraped_data)
    output_mapping JSONB DEFAULT '{}',
    
    -- Settings
    is_enabled BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,              -- Requires premium subscription
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for scraper_configs
ALTER TABLE scraper_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for scraper_configs" ON scraper_configs;
CREATE POLICY "Allow all for scraper_configs" ON scraper_configs
    FOR ALL USING (true) WITH CHECK (true);

-- Insert default Telegram scraper config
INSERT INTO scraper_configs (scraper_type, name, description, actor_id, platform, icon, color, input_schema, output_mapping)
VALUES (
    'telegram',
    'Telegram Group Scraper',
    'Extract members from Telegram groups and channels. Scrapes user info including usernames, names, and profile data.',
    'bhansalisoft/telegram-group-member-scraper',
    'Telegram',
    '📱',
    '#0088cc',
    '{
        "target_group": {"type": "string", "required": true, "label": "Target Group Name"},
        "auth_token": {"type": "string", "required": false, "label": "Auth Token", "secret": true}
    }',
    '{
        "entity_id": "user_id",
        "username": "user_name",
        "display_name": "first_name",
        "entity_type": "member"
    }'
) ON CONFLICT (scraper_type) DO UPDATE SET
    actor_id = EXCLUDED.actor_id,
    input_schema = EXCLUDED.input_schema,
    output_mapping = EXCLUDED.output_mapping,
    updated_at = NOW();

-- =====================================================
-- Views for analytics
-- =====================================================

-- View: Data summary by scraper type
CREATE OR REPLACE VIEW scraped_data_summary AS
SELECT 
    scraper_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT source_identifier) as unique_sources,
    COUNT(CASE WHEN is_premium THEN 1 END) as premium_count,
    COUNT(CASE WHEN is_verified THEN 1 END) as verified_count,
    COUNT(CASE WHEN is_bot THEN 1 END) as bot_count,
    COUNT(CASE WHEN is_suspicious THEN 1 END) as suspicious_count,
    MAX(created_at) as last_scraped
FROM scraped_data
GROUP BY scraper_type
ORDER BY total_records DESC;

-- View: Source statistics
CREATE OR REPLACE VIEW source_stats AS
SELECT 
    scraper_type,
    source_identifier,
    source_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN is_premium THEN 1 END) as premium_count,
    COUNT(CASE WHEN is_verified THEN 1 END) as verified_count,
    COUNT(CASE WHEN is_bot THEN 1 END) as bot_count,
    MAX(created_at) as last_scraped
FROM scraped_data
GROUP BY scraper_type, source_identifier, source_name
ORDER BY record_count DESC;

-- =====================================================
-- Migration: Copy existing telegram_members data
-- (Run this only if you have existing data to migrate)
-- =====================================================
-- INSERT INTO scraped_data (
--     scraper_type, scraper_actor, source_identifier, source_name,
--     entity_id, entity_type, entity_name, username, display_name,
--     is_verified, is_premium, is_bot, is_suspicious, is_active,
--     data, created_at
-- )
-- SELECT 
--     'telegram',
--     'bhansalisoft/telegram-group-member-scraper',
--     source_url,
--     source_url,
--     telegram_id,
--     'member',
--     COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''),
--     usernames[1],
--     first_name,
--     is_verified,
--     is_premium,
--     type = 'bot',
--     is_scam OR is_fake,
--     NOT is_deleted,
--     jsonb_build_object(
--         'first_name', first_name,
--         'last_name', last_name,
--         'usernames', usernames,
--         'phone', phone,
--         'type', type,
--         'is_deleted', is_deleted,
--         'is_scam', is_scam,
--         'is_fake', is_fake,
--         'is_restricted', is_restricted,
--         'lang_code', lang_code,
--         'last_seen', last_seen,
--         'stories_hidden', stories_hidden,
--         'premium_contact', premium_contact
--     ),
--     created_at
-- FROM telegram_members
-- ON CONFLICT (scraper_type, source_identifier, entity_id) DO NOTHING;
