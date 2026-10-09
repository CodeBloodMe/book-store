-- Migration: Alter BookWeb graph table (book_edges) to add evidence tracking
-- As per the recommendation, we add fields to ensure relationships are typed, verifiable, and auditable.

ALTER TABLE public.book_edges 
ADD COLUMN IF NOT EXISTS evidence JSONB,
ADD COLUMN IF NOT EXISTS similarity_score FLOAT,
ADD COLUMN IF NOT EXISTS algorithm_version VARCHAR(50);

-- Update the relationship_type check constraint or add an explanation comment.
COMMENT ON COLUMN public.book_edges.relationship_type IS 'Must be one of: SAME_SERIES, SAME_AUTHOR, SHARED_GENRE, SHARED_SUBJECT, SEMANTIC_SIMILARITY';
