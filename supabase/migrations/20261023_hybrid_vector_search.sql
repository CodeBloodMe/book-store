-- Hybrid semantic + lexical retrieval for book recommendations.
-- Prerequisite: public.books.embedding VECTOR(768), public.books.search_vector
-- TSVECTOR, and the existing GIN/HNSW indexes.

CREATE OR REPLACE FUNCTION public.match_books_hybrid(
    query_embedding VECTOR(768),
    query_text TEXT,
    match_threshold DOUBLE PRECISION,
    match_count INTEGER
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    author TEXT,
    cover_image_url TEXT,
    description TEXT,
    expert_rating NUMERIC,
    community_rating NUMERIC,
    similarity FLOAT
)
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
    WITH search_query AS (
        SELECT
            NULLIF(btrim(query_text), '') AS raw_text,
            websearch_to_tsquery('english', NULLIF(btrim(query_text), '')) AS parsed_query
    ),
    vector_candidates AS MATERIALIZED (
        SELECT
            b.id,
            (1.0 - (b.embedding <=> query_embedding))::DOUBLE PRECISION AS vector_similarity
        FROM public.books AS b
        WHERE query_embedding IS NOT NULL
          AND b.embedding IS NOT NULL
          AND (1.0 - (b.embedding <=> query_embedding)) > COALESCE(match_threshold, 0.0)
        ORDER BY b.embedding <=> query_embedding
        LIMIT LEAST(GREATEST(COALESCE(match_count, 20), 1) * 4, 400)
    ),
    lexical_candidates AS MATERIALIZED (
        SELECT
            b.id,
            ts_rank_cd(
                COALESCE(
                    b.search_vector,
                    setweight(to_tsvector('english', COALESCE(b.title, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(b.author, '')), 'B') ||
                    setweight(to_tsvector('english', COALESCE(b.description, '')), 'C') ||
                    setweight(to_tsvector('english', COALESCE(array_to_string(b.tags, ' '), '')), 'B')
                ) || setweight(to_tsvector('english', COALESCE(g.name, '')), 'A'),
                sq.parsed_query
            )::DOUBLE PRECISION AS lexical_rank
        FROM public.books AS b
        LEFT JOIN public.genres AS g ON g.id = b.genre_id
        CROSS JOIN search_query AS sq
        WHERE sq.raw_text IS NOT NULL
          AND numnode(sq.parsed_query) > 0
          AND (
              COALESCE(
                  b.search_vector,
                  setweight(to_tsvector('english', COALESCE(b.title, '')), 'A') ||
                  setweight(to_tsvector('english', COALESCE(b.author, '')), 'B') ||
                  setweight(to_tsvector('english', COALESCE(b.description, '')), 'C') ||
                  setweight(to_tsvector('english', COALESCE(array_to_string(b.tags, ' '), '')), 'B')
              ) @@ sq.parsed_query
              OR to_tsvector('english', COALESCE(g.name, '')) @@ sq.parsed_query
          )
        ORDER BY lexical_rank DESC, b.id
        LIMIT LEAST(GREATEST(COALESCE(match_count, 20), 1) * 4, 400)
    ),
    candidate_scores AS (
        SELECT
            candidates.id,
            MAX(candidates.vector_similarity) AS vector_similarity,
            MAX(candidates.lexical_rank) AS lexical_rank
        FROM (
            SELECT vc.id, vc.vector_similarity, NULL::DOUBLE PRECISION AS lexical_rank
            FROM vector_candidates AS vc
            UNION ALL
            SELECT lc.id, NULL::DOUBLE PRECISION, lc.lexical_rank
            FROM lexical_candidates AS lc
        ) AS candidates
        GROUP BY candidates.id
    ),
    ranked AS (
        SELECT
            b.id,
            b.title::TEXT AS title,
            b.author::TEXT AS author,
            b.cover_image_url::TEXT AS cover_image_url,
            b.description::TEXT AS description,
            b.expert_rating::NUMERIC AS expert_rating,
            b.community_rating::NUMERIC AS community_rating,
            CASE
                WHEN cs.vector_similarity IS NOT NULL AND cs.lexical_rank IS NOT NULL THEN
                    0.82 * LEAST(1.0, GREATEST(0.0, cs.vector_similarity)) +
                    0.18 * (cs.lexical_rank / (1.0 + cs.lexical_rank))
                WHEN cs.vector_similarity IS NOT NULL THEN
                    LEAST(1.0, GREATEST(0.0, cs.vector_similarity))
                ELSE
                    0.75 * (cs.lexical_rank / (1.0 + cs.lexical_rank))
            END::FLOAT AS similarity
        FROM candidate_scores AS cs
        JOIN public.books AS b ON b.id = cs.id
    )
    SELECT
        ranked.id,
        ranked.title,
        ranked.author,
        ranked.cover_image_url,
        ranked.description,
        ranked.expert_rating,
        ranked.community_rating,
        ranked.similarity
    FROM ranked
    ORDER BY ranked.similarity DESC, ranked.id
    LIMIT LEAST(GREATEST(COALESCE(match_count, 20), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.match_books_hybrid(VECTOR(768), TEXT, DOUBLE PRECISION, INTEGER)
    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_books_hybrid(VECTOR(768), TEXT, DOUBLE PRECISION, INTEGER)
    TO anon, authenticated, service_role;
