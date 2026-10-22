-- ChapterOne BookWeb v2: evidence-backed hybrid edges and exact weighted paths.
-- Apply after create_book_edges.sql. Vector neighbors are optional: if books.embedding
-- exists, only rows tagged with the current Gemini embedding model are considered.

BEGIN;

ALTER TABLE public.book_edges
  ADD COLUMN IF NOT EXISTS evidence JSONB,
  ADD COLUMN IF NOT EXISTS similarity_score DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS algorithm_version VARCHAR(50);

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS embedding_model TEXT;

CREATE INDEX IF NOT EXISTS idx_book_edges_type_weight
  ON public.book_edges (relationship_type, weight);

-- A sparse per-book nearest-neighbor candidate list. The graph builder fuses this
-- optional vector signal with TF-IDF and catalog metadata, then applies thresholds.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.books'::regclass
      AND attname = 'embedding'
      AND NOT attisdropped
  ) THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.get_bookweb_vector_candidates(neighbor_limit INTEGER DEFAULT 16)
      RETURNS TABLE(book_a_id UUID, book_b_id UUID, similarity DOUBLE PRECISION)
      LANGUAGE SQL
      STABLE
      SET search_path = public, extensions, pg_temp
      AS $function$
        SELECT
          source.id,
          neighbor.id,
          (1.0 - (neighbor.embedding <=> source.embedding))::DOUBLE PRECISION
        FROM public.books AS source
        CROSS JOIN LATERAL (
          SELECT candidate.id, candidate.embedding
          FROM public.books AS candidate
          WHERE candidate.id <> source.id
            AND candidate.embedding IS NOT NULL
            AND candidate.embedding_model = source.embedding_model
          ORDER BY candidate.embedding <=> source.embedding, candidate.id
          LIMIT LEAST(GREATEST(COALESCE(neighbor_limit, 16), 1), 40)
        ) AS neighbor
        WHERE source.embedding IS NOT NULL
          AND source.embedding_model = 'gemini-embedding-001'
      $function$
    $sql$;

    EXECUTE 'REVOKE ALL ON FUNCTION public.get_bookweb_vector_candidates(INTEGER) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_bookweb_vector_candidates(INTEGER) TO service_role';
  END IF;
END;
$$;

-- Dijkstra's algorithm returns the minimum-cost path, not the first path found
-- by a bounded recursive enumeration. The graph is treated as undirected.
CREATE OR REPLACE FUNCTION public.find_reading_path(
  start_id UUID,
  end_id UUID,
  max_depth INT DEFAULT 6
)
RETURNS TABLE(path UUID[], total_weight DOUBLE PRECISION, depth INT)
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  current_id UUID;
  current_cost DOUBLE PRECISION;
  current_path UUID[];
  edge_row RECORD;
  depth_limit INT := LEAST(GREATEST(COALESCE(max_depth, 6), 1), 12);
BEGIN
  IF start_id IS NULL OR end_id IS NULL OR start_id = end_id THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS bookweb_dijkstra_state (
    node_id UUID PRIMARY KEY,
    cost DOUBLE PRECISION NOT NULL,
    path UUID[] NOT NULL,
    visited BOOLEAN NOT NULL DEFAULT FALSE
  ) ON COMMIT DROP;
  TRUNCATE TABLE pg_temp.bookweb_dijkstra_state;

  INSERT INTO pg_temp.bookweb_dijkstra_state (node_id, cost, path)
  VALUES (start_id, 0.0, ARRAY[start_id]);

  LOOP
    current_id := NULL;
    SELECT state.node_id, state.cost, state.path
      INTO current_id, current_cost, current_path
    FROM pg_temp.bookweb_dijkstra_state AS state
    WHERE NOT state.visited
    ORDER BY state.cost, state.node_id
    LIMIT 1;

    IF current_id IS NULL THEN
      RETURN;
    END IF;

    IF current_id = end_id THEN
      RETURN QUERY
        SELECT current_path, current_cost, cardinality(current_path) - 1;
      RETURN;
    END IF;

    UPDATE pg_temp.bookweb_dijkstra_state
      SET visited = TRUE
      WHERE node_id = current_id;

    IF cardinality(current_path) - 1 >= depth_limit THEN
      CONTINUE;
    END IF;

    FOR edge_row IN
      SELECT adjacent.neighbor_id, adjacent.edge_cost
      FROM (
        SELECT edge.book_b_id AS neighbor_id, edge.weight AS edge_cost
        FROM public.book_edges AS edge
        WHERE edge.book_a_id = current_id
          AND edge.weight >= 0
          AND edge.weight < 'Infinity'::DOUBLE PRECISION
        UNION ALL
        SELECT edge.book_a_id AS neighbor_id, edge.weight AS edge_cost
        FROM public.book_edges AS edge
        WHERE edge.book_b_id = current_id
          AND edge.weight >= 0
          AND edge.weight < 'Infinity'::DOUBLE PRECISION
      ) AS adjacent
      WHERE NOT adjacent.neighbor_id = ANY(current_path)
      ORDER BY adjacent.edge_cost, adjacent.neighbor_id
    LOOP
      UPDATE pg_temp.bookweb_dijkstra_state AS state
        SET cost = current_cost + edge_row.edge_cost,
            path = current_path || edge_row.neighbor_id
      WHERE state.node_id = edge_row.neighbor_id
        AND NOT state.visited
        AND current_cost + edge_row.edge_cost < state.cost;

      IF NOT FOUND THEN
        INSERT INTO pg_temp.bookweb_dijkstra_state (node_id, cost, path)
        VALUES (edge_row.neighbor_id, current_cost + edge_row.edge_cost, current_path || edge_row.neighbor_id)
        ON CONFLICT (node_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.find_reading_path(UUID, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_reading_path(UUID, UUID, INT) TO anon, authenticated, service_role;

COMMIT;
