-- Migration: Create BookWeb graph table (book_edges)
-- This table stores weighted connections between books for the BookWeb
-- graph traversal engine. Lower weight = closer relationship.

CREATE TABLE IF NOT EXISTS public.book_edges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_a_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    book_b_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    weight FLOAT NOT NULL DEFAULT 1.0,
    relationship_type VARCHAR(50) NOT NULL,
    -- Valid types: 'same_author', 'same_genre', 'shared_tags', 'same_era', 'same_difficulty'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate edges and self-loops
    UNIQUE(book_a_id, book_b_id),
    CHECK (book_a_id <> book_b_id)
);

-- Indexes for fast traversal from either direction
CREATE INDEX IF NOT EXISTS idx_book_edges_book_a ON public.book_edges(book_a_id);
CREATE INDEX IF NOT EXISTS idx_book_edges_book_b ON public.book_edges(book_b_id);

-- Composite index for relationship type filtering
CREATE INDEX IF NOT EXISTS idx_book_edges_relationship ON public.book_edges(relationship_type);

-- Enable RLS
ALTER TABLE public.book_edges ENABLE ROW LEVEL SECURITY;

-- Allow public read access (the graph is public knowledge)
CREATE POLICY "Allow public read access to book graph" ON public.book_edges
    FOR SELECT USING (true);
