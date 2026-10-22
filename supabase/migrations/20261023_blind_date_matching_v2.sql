-- Blind Date matching v2
-- Apply after create_blind_date_tables.sql, create_match_mystery_book.sql,
-- and (when present) zzz_dbms_hardening.sql.
--
-- The score is a transparent 0..100 fit estimate, not a guarantee. Explicit
-- reader preferences dominate; missing metadata is neutral; feedback is a
-- small Bayesian prior so popularity cannot overwhelm fit. The profile row is
-- locked and the selected book is saved in this transaction to prevent two
-- concurrent requests from issuing the same active match for one session.

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
SET search_path = ''
AS $$
DECLARE
    v_previous_match UUID;
    v_match RECORD;
BEGIN
    IF p_session_id IS NULL OR btrim(p_session_id) = '' THEN
        RAISE EXCEPTION 'A session ID is required';
    END IF;

    -- Serialize match requests for one reader session. The API creates this
    -- profile before calling the function; never create a match without it.
    SELECT profile.last_matched_book_id
      INTO v_previous_match
      FROM public.user_reader_profiles AS profile
     WHERE profile.session_id = p_session_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reader session profile does not exist';
    END IF;

    WITH interaction_stats AS (
        SELECT
            interaction.book_id,
            COUNT(*)::DOUBLE PRECISION AS interaction_count,
            COUNT(*) FILTER (WHERE interaction.accepted)::DOUBLE PRECISION AS accepted_count
        FROM public.blind_date_interactions AS interaction
        GROUP BY interaction.book_id
    ),
    candidate_features AS (
        SELECT
            b.id AS candidate_id,
            b.title::TEXT AS candidate_title,
            b.author::TEXT AS candidate_author,
            b.cover_image_url::TEXT AS candidate_cover,
            b.description::TEXT AS candidate_description,
            b.vibe::TEXT AS candidate_vibe,
            b.length_category::TEXT AS candidate_length,
            b.difficulty_level::TEXT AS candidate_difficulty,
            b.expert_rating::FLOAT AS candidate_expert_rating,
            b.community_rating::FLOAT AS candidate_community_rating,
            COALESCE(b.tags, ARRAY[]::TEXT[]) AS candidate_tags,
            g.name::TEXT AS candidate_genre_name,
            g.color::TEXT AS candidate_genre_color,
            b.page_count AS candidate_pages,
            COALESCE(stats.interaction_count, 0) AS interaction_count,
            COALESCE(stats.accepted_count, 0) AS accepted_count,

            -- Mood is inferred from authored vibe/tags first, synopsis second.
            CASE lower(COALESCE(btrim(p_mood), ''))
                WHEN 'adventurous' THEN CASE
                    WHEN lower(COALESCE(b.vibe, '')) ~ '(adventur|action|quest|explor|survival|heroic)' THEN 1.0
                    WHEN lower(array_to_string(COALESCE(b.tags, ARRAY[]::TEXT[]), ' ')) ~ '(adventur|action|quest|explor|survival|heroic)' THEN 0.85
                    WHEN lower(COALESCE(b.description, '')) ~ '(adventur|action|quest|explor|survival|heroic)' THEN 0.65
                    WHEN b.vibe IS NULL AND COALESCE(cardinality(b.tags), 0) = 0 THEN 0.5
                    ELSE 0.15 END
                WHEN 'contemplative' THEN CASE
                    WHEN lower(COALESCE(b.vibe, '')) ~ '(contempl|reflect|philosoph|introspect|meditat|thoughtful|literary)' THEN 1.0
                    WHEN lower(array_to_string(COALESCE(b.tags, ARRAY[]::TEXT[]), ' ')) ~ '(contempl|reflect|philosoph|introspect|meditat|thoughtful|literary)' THEN 0.85
                    WHEN lower(COALESCE(b.description, '')) ~ '(contempl|reflect|philosoph|introspect|meditat|thoughtful|literary)' THEN 0.65
                    WHEN b.vibe IS NULL AND COALESCE(cardinality(b.tags), 0) = 0 THEN 0.5
                    ELSE 0.15 END
                WHEN 'escapist' THEN CASE
                    WHEN lower(COALESCE(b.vibe, '')) ~ '(escap|fantasy|magical|whimsical|imagin|immersive|wonder)' THEN 1.0
                    WHEN lower(array_to_string(COALESCE(b.tags, ARRAY[]::TEXT[]), ' ')) ~ '(escap|fantasy|magical|whimsical|imagin|immersive|wonder)' THEN 0.85
                    WHEN lower(COALESCE(b.description, '')) ~ '(escap|fantasy|magical|whimsical|imagin|immersive|wonder)' THEN 0.65
                    WHEN b.vibe IS NULL AND COALESCE(cardinality(b.tags), 0) = 0 THEN 0.5
                    ELSE 0.15 END
                WHEN 'thrilling' THEN CASE
                    WHEN lower(COALESCE(b.vibe, '')) ~ '(thrill|suspens|tense|mystery|horror|dark|page.turner)' THEN 1.0
                    WHEN lower(array_to_string(COALESCE(b.tags, ARRAY[]::TEXT[]), ' ')) ~ '(thrill|suspens|tense|mystery|horror|dark|page.turner)' THEN 0.85
                    WHEN lower(COALESCE(b.description, '')) ~ '(thrill|suspens|tense|mystery|horror|dark|page.turner)' THEN 0.65
                    WHEN b.vibe IS NULL AND COALESCE(cardinality(b.tags), 0) = 0 THEN 0.5
                    ELSE 0.15 END
                ELSE 0.5
            END::DOUBLE PRECISION AS mood_fit,

            -- Pace wording is the best evidence. Page count is only a weak
            -- fallback because length does not reliably determine pacing.
            CASE lower(COALESCE(btrim(p_pace), ''))
                WHEN 'fast' THEN CASE
                    WHEN lower(COALESCE(b.description, '') || ' ' || COALESCE(b.vibe, '') || ' ' || array_to_string(COALESCE(b.tags, ARRAY[]::TEXT[]), ' ')) ~ '(fast[ -]paced|page[ -]turner|propulsive|gripping|action[ -]packed|nonstop)' THEN 1.0
                    WHEN lower(COALESCE(b.description, '') || ' ' || COALESCE(b.vibe, '')) ~ '(slow[ -]burn|deliberate|meditative|leisurely)' THEN 0.2
                    WHEN b.page_count IS NULL THEN 0.5
                    WHEN b.page_count <= 300 THEN 0.65
                    WHEN b.page_count <= 600 THEN 0.45
                    ELSE 0.3 END
                WHEN 'slow' THEN CASE
                    WHEN lower(COALESCE(b.description, '') || ' ' || COALESCE(b.vibe, '') || ' ' || array_to_string(COALESCE(b.tags, ARRAY[]::TEXT[]), ' ')) ~ '(slow[ -]burn|deliberate|meditative|leisurely|quietly paced)' THEN 1.0
                    WHEN lower(COALESCE(b.description, '') || ' ' || COALESCE(b.vibe, '')) ~ '(fast[ -]paced|page[ -]turner|propulsive|nonstop)' THEN 0.2
                    WHEN b.page_count IS NULL THEN 0.5
                    WHEN b.page_count >= 450 THEN 0.65
                    WHEN b.page_count >= 250 THEN 0.5
                    ELSE 0.35 END
                WHEN 'moderate' THEN CASE
                    WHEN lower(COALESCE(b.description, '') || ' ' || COALESCE(b.vibe, '') || ' ' || array_to_string(COALESCE(b.tags, ARRAY[]::TEXT[]), ' ')) ~ '(steady paced|balanced pace|measured pace)' THEN 1.0
                    WHEN b.page_count IS NULL THEN 0.5
                    WHEN b.page_count BETWEEN 250 AND 600 THEN 0.65
                    ELSE 0.4 END
                ELSE 0.5
            END::DOUBLE PRECISION AS pace_fit,

            CASE lower(COALESCE(btrim(p_complexity), ''))
                WHEN 'simple' THEN CASE
                    WHEN lower(COALESCE(b.difficulty_level, '')) ~ '(simple|beginner|easy|accessible|light)' THEN 1.0
                    WHEN lower(COALESCE(b.difficulty_level, '')) ~ '(advanced|complex|challeng|dense|difficult)' THEN 0.15
                    WHEN b.difficulty_level IS NULL THEN 0.5 ELSE 0.35 END
                WHEN 'layered' THEN CASE
                    WHEN lower(COALESCE(b.difficulty_level, '')) ~ '(layered|intermediate|moderate|balanced)' THEN 1.0
                    WHEN b.difficulty_level IS NULL THEN 0.5 ELSE 0.4 END
                WHEN 'complex' THEN CASE
                    WHEN lower(COALESCE(b.difficulty_level, '')) ~ '(advanced|complex|challeng|dense|difficult)' THEN 1.0
                    WHEN lower(COALESCE(b.difficulty_level, '')) ~ '(simple|beginner|easy|accessible)' THEN 0.15
                    WHEN b.difficulty_level IS NULL THEN 0.5 ELSE 0.35 END
                ELSE 0.5
            END::DOUBLE PRECISION AS complexity_fit,

            CASE lower(COALESCE(btrim(p_era), ''))
                WHEN 'classic' THEN CASE WHEN b.published_year IS NULL THEN 0.5 WHEN b.published_year < 1980 THEN 1.0 WHEN b.published_year < 2000 THEN 0.55 ELSE 0.15 END
                WHEN 'modern' THEN CASE WHEN b.published_year IS NULL THEN 0.5 WHEN b.published_year >= 2000 THEN 1.0 WHEN b.published_year >= 1980 THEN 0.55 ELSE 0.15 END
                WHEN 'any' THEN 1.0
                ELSE 0.5
            END::DOUBLE PRECISION AS era_fit,

            CASE lower(COALESCE(btrim(p_length), ''))
                WHEN 'quick read' THEN CASE
                    WHEN lower(COALESCE(b.length_category, '')) ~ '(quick|short)' THEN 1.0
                    WHEN b.length_category IS NOT NULL THEN 0.15
                    WHEN b.page_count IS NULL THEN 0.5
                    WHEN b.page_count <= 250 THEN 0.7 ELSE 0.3 END
                WHEN 'standard' THEN CASE
                    WHEN lower(COALESCE(b.length_category, '')) ~ '(standard|medium)' THEN 1.0
                    WHEN b.length_category IS NOT NULL THEN 0.15
                    WHEN b.page_count IS NULL THEN 0.5
                    WHEN b.page_count BETWEEN 250 AND 550 THEN 0.7 ELSE 0.35 END
                WHEN 'epic' THEN CASE
                    WHEN lower(COALESCE(b.length_category, '')) ~ '(epic|long)' THEN 1.0
                    WHEN b.length_category IS NOT NULL THEN 0.15
                    WHEN b.page_count IS NULL THEN 0.5
                    WHEN b.page_count > 550 THEN 0.7 ELSE 0.3 END
                ELSE 0.5
            END::DOUBLE PRECISION AS length_fit
        FROM public.books AS b
        LEFT JOIN public.genres AS g ON g.id = b.genre_id
        LEFT JOIN interaction_stats AS stats ON stats.book_id = b.id
        WHERE b.description IS NOT NULL
          AND b.cover_image_url IS NOT NULL
          AND b.id IS DISTINCT FROM v_previous_match
          AND NOT EXISTS (
              SELECT 1
                FROM public.blind_date_interactions AS seen
               WHERE seen.session_id = p_session_id
                 AND seen.book_id = b.id
          )
    ),
    scored AS (
        SELECT
            candidate_features.*,
            (
                mood_fit * 0.29 +
                pace_fit * 0.17 +
                complexity_fit * 0.16 +
                length_fit * 0.16 +
                era_fit * 0.10 +
                (LEAST(1.0, GREATEST(0.0,
                    CASE
                        WHEN candidate_expert_rating > 0 AND candidate_community_rating > 0
                            THEN (candidate_expert_rating / 5.0) * 0.7 + (candidate_community_rating / 5.0) * 0.3
                        WHEN candidate_expert_rating > 0 THEN candidate_expert_rating / 5.0
                        WHEN candidate_community_rating > 0 THEN candidate_community_rating / 5.0
                        ELSE 0.5
                    END
                ))) * 0.08 +
                ((accepted_count + 2.0) / (interaction_count + 4.0)) * 0.04
            ) * 100.0 AS weighted_score
        FROM candidate_features
    )
    SELECT
        scored.candidate_id,
        scored.candidate_title,
        scored.candidate_author,
        scored.candidate_cover,
        scored.candidate_description,
        scored.candidate_vibe,
        scored.candidate_length,
        scored.candidate_difficulty,
        scored.candidate_expert_rating,
        scored.candidate_community_rating,
        scored.candidate_tags,
        scored.candidate_genre_name,
        scored.candidate_genre_color,
        ROUND(scored.weighted_score::NUMERIC, 2)::DOUBLE PRECISION AS rounded_score
      INTO v_match
      FROM scored
     ORDER BY scored.weighted_score DESC, md5(p_session_id || scored.candidate_id::TEXT)
     LIMIT 1;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    UPDATE public.user_reader_profiles
       SET last_matched_book_id = v_match.candidate_id
     WHERE session_id = p_session_id;

    book_id := v_match.candidate_id;
    title := v_match.candidate_title;
    author := v_match.candidate_author;
    cover_image_url := v_match.candidate_cover;
    description := v_match.candidate_description;
    vibe := v_match.candidate_vibe;
    length_category := v_match.candidate_length;
    difficulty_level := v_match.candidate_difficulty;
    expert_rating := v_match.candidate_expert_rating;
    community_rating := v_match.candidate_community_rating;
    tags := v_match.candidate_tags;
    genre_name := v_match.candidate_genre_name;
    genre_color := v_match.candidate_genre_color;
    match_score := v_match.rounded_score;
    RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.match_mystery_book(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_mystery_book(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
    TO service_role;
