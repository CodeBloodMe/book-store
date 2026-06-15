-- Migration: Create Reviews table

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    reviewer_name VARCHAR NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON public.reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.reviews
    FOR SELECT USING (true);

-- Allow public insert access
CREATE POLICY "Allow public insert access" ON public.reviews
    FOR INSERT WITH CHECK (true);
