-- Migration: Add User Shelves, Series Tracking, and Auth to Reviews

-- 1. Create user_shelves table
CREATE TABLE IF NOT EXISTS public.user_shelves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('want_to_read', 'reading', 'read')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, book_id)
);

-- 2. Add RLS to user_shelves
ALTER TABLE public.user_shelves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shelves" ON public.user_shelves
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own shelves" ON public.user_shelves
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shelves" ON public.user_shelves
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shelves" ON public.user_shelves
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Add series tracking to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS series_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS series_number INTEGER;

-- 4. Add user_id to reviews table
-- Note: We make it nullable for now so existing anonymous reviews don't break
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Update reviews RLS policies (allow users to manage their own reviews)
-- Drop the public delete policy we added previously
DROP POLICY IF EXISTS "Allow public delete access" ON public.reviews;

-- Create authenticated delete policy
CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Update public insert access to require user_id to match if provided
DROP POLICY IF EXISTS "Allow public insert access" ON public.reviews;
CREATE POLICY "Allow authenticated insert access" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create authenticated update policy
CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
