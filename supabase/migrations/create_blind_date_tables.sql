-- Migration: Create Blind Date tables (user_reader_profiles + blind_date_interactions)
-- These tables power the "Blind Date With a Book" feature.

-- 1. User Reader Profiles — stores the 5-question quiz answers for each session
CREATE TABLE IF NOT EXISTS public.user_reader_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    mood VARCHAR(50),             -- 'adventurous', 'contemplative', 'escapist', 'thrilling'
    pace_preference VARCHAR(50),  -- 'fast', 'moderate', 'slow'
    complexity_preference VARCHAR(50), -- 'simple', 'layered', 'complex'
    era_preference VARCHAR(50),   -- 'classic', 'modern', 'any'
    length_preference VARCHAR(50), -- 'quick', 'standard', 'epic'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Blind Date Interactions — the feedback loop for the multi-armed bandit
-- Every time a user accepts or rejects a mystery book, we record it here.
-- The match_mystery_book() function reads this to improve over time.
CREATE TABLE IF NOT EXISTS public.blind_date_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    accepted BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_blind_date_book ON public.blind_date_interactions(book_id);
CREATE INDEX IF NOT EXISTS idx_blind_date_session ON public.blind_date_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_blind_date_accepted ON public.blind_date_interactions(accepted);

-- Enable RLS
ALTER TABLE public.user_reader_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blind_date_interactions ENABLE ROW LEVEL SECURITY;

-- Allow public read/insert for anonymous sessions
CREATE POLICY "Allow public read profiles" ON public.user_reader_profiles
    FOR SELECT USING (true);
CREATE POLICY "Allow public insert profiles" ON public.user_reader_profiles
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update profiles" ON public.user_reader_profiles
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read interactions" ON public.blind_date_interactions
    FOR SELECT USING (true);
CREATE POLICY "Allow public insert interactions" ON public.blind_date_interactions
    FOR INSERT WITH CHECK (true);
