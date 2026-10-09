-- Migration: Create find_reading_path() Postgres function
-- This is the core BookWeb algorithm — a recursive CTE that performs
-- Dijkstra-style BFS to find the shortest reading path between two books.
--
-- The graph is bidirectional: an edge from A→B also means B→A.
-- We UNION both directions to make the graph traversal work in both ways.

CREATE OR REPLACE FUNCTION public.find_reading_path(
    start_id UUID,
    end_id UUID,
    max_depth INT DEFAULT 6
)
RETURNS TABLE(path UUID[], total_weight FLOAT, depth INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE reading_path AS (
        -- Base case: start at the source book
        SELECT
            ARRAY[start_id] AS path,
            0.0::FLOAT AS total_weight,
            0 AS depth,
            start_id AS current_id

        UNION ALL

        -- Recursive case: traverse edges in BOTH directions
        SELECT
            rp.path || edge_target,
            rp.total_weight + edge_weight,
            rp.depth + 1,
            edge_target
        FROM reading_path rp
        CROSS JOIN LATERAL (
            -- Forward edges (book_a → book_b)
            SELECT be.book_b_id AS edge_target, be.weight AS edge_weight
            FROM public.book_edges be
            WHERE be.book_a_id = rp.current_id
              AND be.book_b_id <> ALL(rp.path) -- no cycles

            UNION ALL

            -- Reverse edges (book_b → book_a) — makes graph bidirectional
            SELECT be.book_a_id AS edge_target, be.weight AS edge_weight
            FROM public.book_edges be
            WHERE be.book_b_id = rp.current_id
              AND be.book_a_id <> ALL(rp.path) -- no cycles
        ) edges
        WHERE rp.depth < max_depth
    )
    SELECT rp.path, rp.total_weight, rp.depth
    FROM reading_path rp
    WHERE rp.current_id = end_id
    ORDER BY rp.total_weight ASC
    LIMIT 1;
END;
$$;

-- Also create a helper to get a book's direct neighbors in the graph
CREATE OR REPLACE FUNCTION public.get_book_neighbors(
    target_book_id UUID,
    neighbor_limit INT DEFAULT 10
)
RETURNS TABLE(
    book_id UUID,
    weight FLOAT,
    relationship_type VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        neighbor_id,
        edge_weight,
        edge_type
    FROM (
        -- Forward edges
        SELECT be.book_b_id AS neighbor_id, be.weight AS edge_weight, be.relationship_type AS edge_type
        FROM public.book_edges be
        WHERE be.book_a_id = target_book_id

        UNION ALL

        -- Reverse edges
        SELECT be.book_a_id AS neighbor_id, be.weight AS edge_weight, be.relationship_type AS edge_type
        FROM public.book_edges be
        WHERE be.book_b_id = target_book_id
    ) all_neighbors
    ORDER BY edge_weight ASC
    LIMIT neighbor_limit;
END;
$$;
