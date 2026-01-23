-- =====================================================
-- DemonOS Duplicate Management Functions
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- Function: Find duplicate records in scraped_data
-- Returns records that appear more than once based on
-- key fields (excluding the unique constraint fields)
-- =====================================================

-- View: Potential duplicates (same entity appearing in multiple sources)
CREATE OR REPLACE VIEW scraped_data_cross_source_duplicates AS
SELECT 
    entity_id,
    scraper_type,
    COUNT(*) as occurrence_count,
    COUNT(DISTINCT source_identifier) as source_count,
    ARRAY_AGG(DISTINCT source_identifier) as sources,
    ARRAY_AGG(DISTINCT username) FILTER (WHERE username IS NOT NULL) as usernames,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM scraped_data
GROUP BY entity_id, scraper_type
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC;

-- Function: Count duplicates by scraper type
CREATE OR REPLACE FUNCTION count_cross_source_duplicates(p_scraper_type VARCHAR DEFAULT NULL)
RETURNS TABLE (
    scraper_type VARCHAR,
    duplicate_entities BIGINT,
    total_duplicate_records BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sd.scraper_type::VARCHAR,
        COUNT(DISTINCT sd.entity_id)::BIGINT as duplicate_entities,
        SUM(sub.cnt)::BIGINT as total_duplicate_records
    FROM (
        SELECT 
            s.scraper_type,
            s.entity_id,
            COUNT(*) as cnt
        FROM scraped_data s
        WHERE (p_scraper_type IS NULL OR s.scraper_type = p_scraper_type)
        GROUP BY s.scraper_type, s.entity_id
        HAVING COUNT(*) > 1
    ) sub
    JOIN scraped_data sd ON sd.scraper_type = sub.scraper_type AND sd.entity_id = sub.entity_id
    GROUP BY sd.scraper_type;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Find exact duplicates within same source
-- These are records that somehow bypassed the UNIQUE constraint
-- (shouldn't happen but good to check)
-- =====================================================
CREATE OR REPLACE FUNCTION find_exact_duplicates(p_scraper_type VARCHAR DEFAULT NULL)
RETURNS TABLE (
    scraper_type VARCHAR,
    source_identifier TEXT,
    entity_id VARCHAR,
    duplicate_count BIGINT,
    ids UUID[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sd.scraper_type::VARCHAR,
        sd.source_identifier::TEXT,
        sd.entity_id::VARCHAR,
        COUNT(*)::BIGINT as duplicate_count,
        ARRAY_AGG(sd.id) as ids
    FROM scraped_data sd
    WHERE (p_scraper_type IS NULL OR sd.scraper_type = p_scraper_type)
    GROUP BY sd.scraper_type, sd.source_identifier, sd.entity_id
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Remove exact duplicates (keep oldest record)
-- =====================================================
CREATE OR REPLACE FUNCTION remove_exact_duplicates(
    p_scraper_type VARCHAR DEFAULT NULL,
    p_dry_run BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    deleted_count BIGINT,
    affected_entities BIGINT,
    details JSONB
) AS $$
DECLARE
    v_deleted_count BIGINT := 0;
    v_affected_entities BIGINT := 0;
    v_details JSONB := '[]'::JSONB;
BEGIN
    -- Find duplicates and identify records to delete (keep the oldest)
    WITH duplicates AS (
        SELECT 
            sd.id,
            sd.scraper_type,
            sd.source_identifier,
            sd.entity_id,
            sd.created_at,
            ROW_NUMBER() OVER (
                PARTITION BY sd.scraper_type, sd.source_identifier, sd.entity_id 
                ORDER BY sd.created_at ASC, sd.id ASC
            ) as rn
        FROM scraped_data sd
        WHERE (p_scraper_type IS NULL OR sd.scraper_type = p_scraper_type)
    ),
    to_delete AS (
        SELECT id, scraper_type, source_identifier, entity_id
        FROM duplicates
        WHERE rn > 1
    )
    SELECT 
        COUNT(*)::BIGINT,
        COUNT(DISTINCT entity_id)::BIGINT,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'scraper_type', scraper_type,
                    'source', source_identifier,
                    'entity_id', entity_id
                )
            ) FILTER (WHERE scraper_type IS NOT NULL),
            '[]'::JSONB
        )
    INTO v_deleted_count, v_affected_entities, v_details
    FROM to_delete;

    -- If not dry run, actually delete
    IF NOT p_dry_run THEN
        WITH duplicates AS (
            SELECT 
                sd.id,
                ROW_NUMBER() OVER (
                    PARTITION BY sd.scraper_type, sd.source_identifier, sd.entity_id 
                    ORDER BY sd.created_at ASC, sd.id ASC
                ) as rn
            FROM scraped_data sd
            WHERE (p_scraper_type IS NULL OR sd.scraper_type = p_scraper_type)
        )
        DELETE FROM scraped_data 
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
    END IF;

    RETURN QUERY SELECT v_deleted_count, v_affected_entities, v_details;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function: Merge cross-source duplicates
-- Keeps the record with most data, updates counts
-- =====================================================
CREATE OR REPLACE FUNCTION get_cross_source_duplicate_stats(p_scraper_type VARCHAR DEFAULT NULL)
RETURNS TABLE (
    scraper_type VARCHAR,
    entity_id VARCHAR,
    username VARCHAR,
    display_name VARCHAR,
    source_count BIGINT,
    sources TEXT[],
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    is_premium BOOLEAN,
    is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sd.scraper_type::VARCHAR,
        sd.entity_id::VARCHAR,
        MAX(sd.username)::VARCHAR as username,
        MAX(sd.display_name)::VARCHAR as display_name,
        COUNT(DISTINCT sd.source_identifier)::BIGINT as source_count,
        ARRAY_AGG(DISTINCT sd.source_identifier)::TEXT[] as sources,
        MIN(sd.created_at)::TIMESTAMPTZ as first_seen,
        MAX(sd.created_at)::TIMESTAMPTZ as last_seen,
        BOOL_OR(sd.is_premium) as is_premium,
        BOOL_OR(sd.is_verified) as is_verified
    FROM scraped_data sd
    WHERE (p_scraper_type IS NULL OR sd.scraper_type = p_scraper_type)
    GROUP BY sd.scraper_type, sd.entity_id
    HAVING COUNT(DISTINCT sd.source_identifier) > 1
    ORDER BY COUNT(DISTINCT sd.source_identifier) DESC, MAX(sd.created_at) DESC
    LIMIT 1000;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Summary view for duplicate statistics
-- =====================================================
CREATE OR REPLACE VIEW duplicate_stats_summary AS
SELECT 
    scraper_type,
    COUNT(DISTINCT entity_id) as total_unique_entities,
    COUNT(*) as total_records,
    COUNT(*) - COUNT(DISTINCT entity_id) as potential_duplicates,
    ROUND(
        ((COUNT(*) - COUNT(DISTINCT entity_id))::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as duplicate_percentage
FROM scraped_data
GROUP BY scraper_type
ORDER BY potential_duplicates DESC;

-- =====================================================
-- Function: Get comprehensive duplicate report
-- =====================================================
CREATE OR REPLACE FUNCTION get_duplicate_report(p_scraper_type VARCHAR DEFAULT NULL)
RETURNS TABLE (
    scraper_type VARCHAR,
    total_records BIGINT,
    unique_entities BIGINT,
    cross_source_duplicates BIGINT,
    exact_duplicates BIGINT,
    duplicate_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            sd.scraper_type,
            COUNT(*) as total,
            COUNT(DISTINCT sd.entity_id) as unique_ent
        FROM scraped_data sd
        WHERE (p_scraper_type IS NULL OR sd.scraper_type = p_scraper_type)
        GROUP BY sd.scraper_type
    ),
    cross_dupes AS (
        SELECT 
            sd.scraper_type,
            COUNT(DISTINCT sd.entity_id) as cross_dup_count
        FROM scraped_data sd
        WHERE (p_scraper_type IS NULL OR sd.scraper_type = p_scraper_type)
        GROUP BY sd.scraper_type, sd.entity_id
        HAVING COUNT(DISTINCT sd.source_identifier) > 1
    ),
    exact_dupes AS (
        SELECT 
            sd.scraper_type,
            COUNT(*) - COUNT(DISTINCT (sd.scraper_type, sd.source_identifier, sd.entity_id)) as exact_dup_count
        FROM scraped_data sd
        WHERE (p_scraper_type IS NULL OR sd.scraper_type = p_scraper_type)
        GROUP BY sd.scraper_type
    )
    SELECT 
        s.scraper_type::VARCHAR,
        s.total::BIGINT as total_records,
        s.unique_ent::BIGINT as unique_entities,
        COALESCE(cd.cross_dup_count, 0)::BIGINT as cross_source_duplicates,
        COALESCE(ed.exact_dup_count, 0)::BIGINT as exact_duplicates,
        ROUND(((s.total - s.unique_ent)::NUMERIC / NULLIF(s.total, 0)) * 100, 2) as duplicate_percentage
    FROM stats s
    LEFT JOIN (
        SELECT scraper_type, COUNT(*) as cross_dup_count
        FROM cross_dupes
        GROUP BY scraper_type
    ) cd ON s.scraper_type = cd.scraper_type
    LEFT JOIN exact_dupes ed ON s.scraper_type = ed.scraper_type;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your RLS setup)
-- GRANT EXECUTE ON FUNCTION count_cross_source_duplicates TO authenticated;
-- GRANT EXECUTE ON FUNCTION find_exact_duplicates TO authenticated;
-- GRANT EXECUTE ON FUNCTION remove_exact_duplicates TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_cross_source_duplicate_stats TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_duplicate_report TO authenticated;
