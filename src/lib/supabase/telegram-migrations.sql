-- Telegram Messaging System Migrations
-- Version: 1.0.0
-- Created: 2026-01-22

-- ========================================
-- Table: telegram_auth
-- Stores encrypted Telegram authentication credentials and sessions
-- ========================================

CREATE TABLE IF NOT EXISTS telegram_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    api_id VARCHAR(50) NOT NULL,
    api_hash VARCHAR(100) NOT NULL,
    session_string TEXT, -- Encrypted MTProto session
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup of active sessions
CREATE INDEX IF NOT EXISTS idx_telegram_auth_active ON telegram_auth(is_active, phone_number);

-- ========================================
-- Table: telegram_campaigns
-- Manages messaging campaigns
-- ========================================

CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS telegram_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    message_template TEXT NOT NULL,
    
    -- Target configuration (JSONB for flexibility)
    -- Example: {"source_groups": ["group1", "group2"], "is_premium": true, "is_verified": false}
    target_filter JSONB DEFAULT '{}',
    
    -- Rate limiting configuration
    -- Example: {"messages_per_hour": 60, "delay_min": 60, "delay_max": 80, "pause_after": 20, "pause_duration": 300}
    rate_limit_config JSONB DEFAULT '{"messages_per_hour": 60, "delay_min": 60, "delay_max": 80}',
    
    status campaign_status DEFAULT 'draft',
    
    -- Statistics (updated as campaign progresses)
    total_targets INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    messages_pending INTEGER DEFAULT 0,
    responses_received INTEGER DEFAULT 0,
    
    created_by VARCHAR(255), -- Optional: user/admin who created
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for campaign queries
CREATE INDEX IF NOT EXISTS idx_telegram_campaigns_status ON telegram_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_telegram_campaigns_created_at ON telegram_campaigns(created_at DESC);

-- ========================================
-- Table: telegram_messages
-- Tracks individual messages sent in campaigns
-- ========================================

CREATE TYPE message_status AS ENUM ('pending', 'sent', 'failed', 'replied');

CREATE TABLE IF NOT EXISTS telegram_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES telegram_campaigns(id) ON DELETE CASCADE,
    
    -- Recipient information
    recipient_telegram_id VARCHAR(255) NOT NULL,
    recipient_username VARCHAR(255),
    recipient_name VARCHAR(255),
    
    -- Message content and tracking
    message_text TEXT NOT NULL,
    telegram_message_id BIGINT, -- Telegram's message ID (for tracking replies)
    
    status message_status DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    error_type VARCHAR(100), -- FloodWait, UserPrivacy, UserBlocked, etc.
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for message queries
CREATE INDEX IF NOT EXISTS idx_telegram_messages_campaign ON telegram_messages(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_recipient ON telegram_messages(recipient_telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_status ON telegram_messages(status);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_sent_at ON telegram_messages(sent_at DESC);

-- Unique constraint to prevent duplicate messages to same recipient in same campaign
CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_messages_unique 
ON telegram_messages(campaign_id, recipient_telegram_id);

-- ========================================
-- Table: telegram_responses
-- Tracks responses received from recipients
-- ========================================

CREATE TABLE IF NOT EXISTS telegram_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES telegram_messages(id) ON DELETE CASCADE,
    
    -- Response content
    response_text TEXT NOT NULL,
    response_telegram_id BIGINT, -- Telegram's message ID of the response
    
    -- Response metadata
    received_at TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false, -- For UI notification system
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for response queries
CREATE INDEX IF NOT EXISTS idx_telegram_responses_message ON telegram_responses(message_id);
CREATE INDEX IF NOT EXISTS idx_telegram_responses_received_at ON telegram_responses(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_responses_unread ON telegram_responses(is_read) WHERE is_read = false;

-- ========================================
-- Views for analytics and reporting
-- ========================================

-- Campaign statistics view
CREATE OR REPLACE VIEW telegram_campaign_stats AS
SELECT 
    c.id,
    c.name,
    c.status,
    c.total_targets,
    c.messages_sent,
    c.messages_failed,
    c.messages_pending,
    c.responses_received,
    CASE 
        WHEN c.messages_sent > 0 THEN 
            ROUND((c.responses_received::NUMERIC / c.messages_sent::NUMERIC) * 100, 2)
        ELSE 0 
    END as response_rate_percent,
    c.created_at,
    c.started_at,
    c.completed_at,
    CASE 
        WHEN c.started_at IS NOT NULL AND c.completed_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (c.completed_at - c.started_at)) / 3600
        WHEN c.started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (NOW() - c.started_at)) / 3600
        ELSE NULL
    END as duration_hours
FROM telegram_campaigns c;

-- Recent messages with response status
CREATE OR REPLACE VIEW telegram_messages_with_responses AS
SELECT 
    m.id,
    m.campaign_id,
    c.name as campaign_name,
    m.recipient_telegram_id,
    m.recipient_username,
    m.recipient_name,
    m.message_text,
    m.status,
    m.sent_at,
    m.error_message,
    m.retry_count,
    CASE WHEN r.id IS NOT NULL THEN true ELSE false END as has_response,
    r.response_text,
    r.received_at as response_received_at,
    r.is_read as response_is_read
FROM telegram_messages m
LEFT JOIN telegram_campaigns c ON c.id = m.campaign_id
LEFT JOIN telegram_responses r ON r.message_id = m.id;

-- ========================================
-- Functions for updating statistics
-- ========================================

-- Function to update campaign statistics when message status changes
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update campaign counters based on message status
    IF TG_OP = 'INSERT' THEN
        UPDATE telegram_campaigns
        SET messages_pending = messages_pending + 1,
            updated_at = NOW()
        WHERE id = NEW.campaign_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Decrement old status counter
        IF OLD.status = 'pending' THEN
            UPDATE telegram_campaigns SET messages_pending = messages_pending - 1 WHERE id = NEW.campaign_id;
        ELSIF OLD.status = 'sent' THEN
            UPDATE telegram_campaigns SET messages_sent = messages_sent - 1 WHERE id = NEW.campaign_id;
        ELSIF OLD.status = 'failed' THEN
            UPDATE telegram_campaigns SET messages_failed = messages_failed - 1 WHERE id = NEW.campaign_id;
        END IF;
        
        -- Increment new status counter
        IF NEW.status = 'pending' THEN
            UPDATE telegram_campaigns SET messages_pending = messages_pending + 1 WHERE id = NEW.campaign_id;
        ELSIF NEW.status = 'sent' THEN
            UPDATE telegram_campaigns SET messages_sent = messages_sent + 1 WHERE id = NEW.campaign_id;
        ELSIF NEW.status = 'failed' THEN
            UPDATE telegram_campaigns SET messages_failed = messages_failed + 1 WHERE id = NEW.campaign_id;
        END IF;
        
        UPDATE telegram_campaigns SET updated_at = NOW() WHERE id = NEW.campaign_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign stats on message changes
DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON telegram_messages;
CREATE TRIGGER trigger_update_campaign_stats
    AFTER INSERT OR UPDATE ON telegram_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_stats();

-- Function to increment response counter when a response is received
CREATE OR REPLACE FUNCTION increment_response_counter()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE telegram_campaigns
    SET responses_received = responses_received + 1,
        updated_at = NOW()
    WHERE id = (SELECT campaign_id FROM telegram_messages WHERE id = NEW.message_id);
    
    -- Update message status to 'replied'
    UPDATE telegram_messages
    SET status = 'replied',
        updated_at = NOW()
    WHERE id = NEW.message_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment response counter
DROP TRIGGER IF EXISTS trigger_increment_response_counter ON telegram_responses;
CREATE TRIGGER trigger_increment_response_counter
    AFTER INSERT ON telegram_responses
    FOR EACH ROW
    EXECUTE FUNCTION increment_response_counter();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_telegram_auth_updated_at ON telegram_auth;
CREATE TRIGGER update_telegram_auth_updated_at
    BEFORE UPDATE ON telegram_auth
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_telegram_campaigns_updated_at ON telegram_campaigns;
CREATE TRIGGER update_telegram_campaigns_updated_at
    BEFORE UPDATE ON telegram_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_telegram_messages_updated_at ON telegram_messages;
CREATE TRIGGER update_telegram_messages_updated_at
    BEFORE UPDATE ON telegram_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Row Level Security (RLS) Policies
-- Optional: Uncomment if using RLS
-- ========================================

-- Enable RLS on tables
-- ALTER TABLE telegram_auth ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE telegram_campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE telegram_responses ENABLE ROW LEVEL SECURITY;

-- Example policy: Allow all operations for authenticated users
-- CREATE POLICY "Allow all for authenticated users" ON telegram_campaigns
--     FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- Sample data for testing (optional)
-- ========================================

-- INSERT INTO telegram_campaigns (name, description, message_template, target_filter)
-- VALUES (
--     'Test Campaign',
--     'Test campaign for development',
--     'Ciao {name}, questo è un messaggio di test!',
--     '{"source_groups": ["testgroup"], "is_active": true}'
-- );

-- ========================================
-- Cleanup and utility functions
-- ========================================

-- Function to cleanup old failed messages (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_failed_messages(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM telegram_messages
    WHERE status = 'failed'
    AND created_at < NOW() - (days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Comments for documentation
-- ========================================

COMMENT ON TABLE telegram_auth IS 'Stores Telegram authentication credentials and encrypted sessions';
COMMENT ON TABLE telegram_campaigns IS 'Manages messaging campaigns with target filters and rate limiting';
COMMENT ON TABLE telegram_messages IS 'Tracks individual messages sent to recipients';
COMMENT ON TABLE telegram_responses IS 'Stores responses received from message recipients';

COMMENT ON COLUMN telegram_campaigns.target_filter IS 'JSONB filter for selecting target recipients from scraped_data';
COMMENT ON COLUMN telegram_campaigns.rate_limit_config IS 'JSONB configuration for rate limiting (messages_per_hour, delays, etc.)';
COMMENT ON COLUMN telegram_messages.telegram_message_id IS 'Telegram API message ID used for tracking replies';
COMMENT ON COLUMN telegram_messages.error_type IS 'Type of error encountered (FloodWait, UserPrivacy, UserBlocked, etc.)';
