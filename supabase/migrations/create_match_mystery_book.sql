-- Migration: Create match_mystery_book() Postgres function
-- This is the Blind Date multi-armed bandit algorithm.
--
-- Scoring formula:
--   score = attribute_match (0-5) + acceptance_exploitation (0-3) + exploration_bonus (0-2)
--
-- UCB1-inspired: books with few interactions get a random exploration bonus
-- so the system doesn't converge too early on already-popular books.

CREATE OR REPLACE FUNCTION public.match_mystery_book(
    p_session_id TEXT,
    p_mood TEXT DEFAULT NULL,
    p_pace TEXT DEFAULT NULL,
    p_complexity TEXT DEFAULT NULL,
    p_era TEXT DEFAULT NULL,
    p_length TEXT DEFAULT NULL
)
RETURNS TABLE(
    book_id UUID,
    title TEXT,
    author TEXT,
    cover_image_url TEXT,
    description TEXT,
    vibe TEXT,
    length_category TEXT,
    difficulty_level TEXT,
    expert_rating FLOAT,
    community_rating FLOAT,
    tags TEXT[],
    genre_name TEXT,
    genre_color TEXT,
    match_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id AS book_id,
        b.title::TEXT,
        b.author::TEXT,
        b.cover_image_url::TEXT,
        b.description::TEXT,
        b.vibe::TEXT,
        b.length_category::TEXT,
        b.difficulty_level::TEXT,
        b.expert_rating::FLOAT,
        b.community_rating::FLOAT,
        b.tags::TEXT[],
        g.name::TEXT AS genre_name,
        g.color::TEXT AS genre_color,
        (
            -- Attribute match score (0-5 points)
            (CASE WHEN p_mood IS NOT NULL AND b.vibe ILIKE '%' || p_mood || '%' THEN 1.0 ELSE 0.0 END) +
            (CASE WHEN p_length IS NOT NULL AND b.length_category ILIKE p_length THEN 1.0 ELSE 0.0 END) +
            (CASE WHEN p_complexity IS NOT NULL AND b.difficulty_level ILIKE p_complexity THEN 1.0 ELSE 0.0 END) +
            (CASE 
                WHEN p_era = 'classic' AND b.published_year IS NOT NULL AND b.published_year < 1980 THEN 1.0
                WHEN p_era = 'modern' AND b.published_year IS NOT NULL AND b.published_year >= 2000 THEN 1.0
                WHEN p_era = 'any' THEN 0.5
                ELSE 0.0
            END) +
            (CASE 
                WHEN p_pace = 'fast' AND b.page_count IS NOT NULL AND b.page_count < 300 THEN 1.0
                WHEN p_pace = 'moderate' AND b.page_count IS NOT NULL AND b.page_count BETWEEN 300 AND 500 THEN 1.0
                WHEN p_pace = 'slow' AND b.page_count IS NOT NULL AND b.page_count > 500 THEN 1.0
                ELSE 0.0
            END) +
            -- Acceptance rate exploitation (0-3 points)
            COALESCE(stats.acceptance_rate * 3.0, 1.5) +
            -- Exploration bonus for under-explored books (UCB1-inspired)
            CASE WHEN COALESCE(stats.interaction_count, 0) < 5 THEN random() * 2.0 ELSE 0.0 END +
            -- Quality bonus — prefer higher-rated books slightly
            COALESCE(b.expert_rating::FLOAT / 5.0, 0.0)
        )::FLOAT AS match_score
    FROM public.books b
    LEFT JOIN public.genres g ON g.id = b.genre_id
    LEFT JOIN (
        SELECT
            bdi.book_id AS stat_book_id,
            COUNT(*) FILTER (WHERE bdi.accepted = true)::FLOAT / NULLIF(COUNT(*), 0) AS acceptance_rate,
            COUNT(*) AS interaction_count
        FROM public.blind_date_interactions bdi
        GROUP BY bdi.book_id
    ) stats ON stats.stat_book_id = b.id
    WHERE b.id NOT IN (
        -- Don't show books this session has already seen
        SELECT bdi2.book_id FROM public.blind_date_interactions bdi2 WHERE bdi2.session_id = p_session_id
    )
    -- Must have some minimum data quality
    AND b.description IS NOT NULL
    AND b.cover_image_url IS NOT NULL
    ORDER BY match_score DESC
    LIMIT 1;
END;
$$;

-- Also create a stats function for the UI footer
CREATE OR REPLACE FUNCTION public.get_blind_date_stats()
RETURNS TABLE(
    total_dates BIGINT,
    accepted_dates BIGINT,
    acceptance_rate FLOAT,
    dates_this_week BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_dates,
        COUNT(*) FILTER (WHERE accepted = true)::BIGINT AS accepted_dates,
        (COUNT(*) FILTER (WHERE accepted = true)::FLOAT / NULLIF(COUNT(*), 0))::FLOAT AS acceptance_rate,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::BIGINT AS dates_this_week
    FROM public.blind_date_interactions;
END;
$$;
