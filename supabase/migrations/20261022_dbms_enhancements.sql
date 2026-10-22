-- ============================================================================
-- CHAPTERONE DBMS LAB ASSESSMENT DATABASE REPAIR & ENHANCEMENT SCRIPT
-- Course: BCSE302P | Faculty: Dr. V. Sivakumar | Slot: L25+L26
-- Student Name: Krish | Register Number: 24BCE0846
-- ============================================================================

-- STEP 1: Restore the 4 Missing Super Categories (Enables 3-Table Joins)
INSERT INTO public.super_categories (id, name, slug, icon, color)
SELECT '3d308f69-8ca8-4fb6-ba3a-6a44f5d07c14'::uuid, 'Computer Science & Technology', 'tech', '💻', '#3b82f6'
WHERE NOT EXISTS (SELECT 1 FROM public.super_categories WHERE id = '3d308f69-8ca8-4fb6-ba3a-6a44f5d07c14'::uuid);

INSERT INTO public.super_categories (id, name, slug, icon, color)
SELECT 'ae94147c-cbbf-4748-bc49-7bc554ee3698'::uuid, 'Fiction', 'fiction', '📚', '#8b5cf6'
WHERE NOT EXISTS (SELECT 1 FROM public.super_categories WHERE id = 'ae94147c-cbbf-4748-bc49-7bc554ee3698'::uuid);

INSERT INTO public.super_categories (id, name, slug, icon, color)
SELECT 'db573de8-36f6-406c-b011-1efd5400361b'::uuid, 'Non-Fiction & Growth', 'non-fiction', '🌱', '#10b981'
WHERE NOT EXISTS (SELECT 1 FROM public.super_categories WHERE id = 'db573de8-36f6-406c-b011-1efd5400361b'::uuid);

INSERT INTO public.super_categories (id, name, slug, icon, color)
SELECT '794be577-f211-4bb1-a80e-f75629a77610'::uuid, 'Global Catalog', 'global', '🌐', '#94a3b8'
WHERE NOT EXISTS (SELECT 1 FROM public.super_categories WHERE id = '794be577-f211-4bb1-a80e-f75629a77610'::uuid);

-- Enable public read for super_categories so joins never fail
ALTER TABLE public.super_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on super_categories" ON public.super_categories;
CREATE POLICY "Allow public read on super_categories" ON public.super_categories FOR SELECT USING (true);


-- STEP 2: Safe Foreign Keys with NOT VALID (zero data loss on existing historical reviews)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_shelves_book_id_fkey'
    ) THEN
        ALTER TABLE public.user_shelves
        ADD CONSTRAINT user_shelves_book_id_fkey
        FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_book_id_fkey'
    ) THEN
        ALTER TABLE public.reviews
        ADD CONSTRAINT reviews_book_id_fkey
        FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE NOT VALID;
    END IF;
END $$;


-- STEP 3: Ensure RBAC Users Table has Default ID and Test Users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'User' CHECK (role IN ('Admin', 'User', 'Faculty', 'Student')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure id has default generator in case table existed without it
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Sync authenticated Supabase users into public.users as Admin
INSERT INTO public.users (id, email, role)
SELECT id, email, 'Admin'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET role = 'Admin';

-- Allow public read on users so demo queries work cleanly
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow demo read access on users" ON public.users;
CREATE POLICY "Allow demo read access on users" ON public.users FOR SELECT USING (true);


-- STEP 4: Trigger to auto-update updated_at on users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_modtime ON public.users;
CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- STEP 5: Stored Procedure for Book Rating Stats (Faculty Demo)
CREATE OR REPLACE FUNCTION get_book_rating_metrics(p_book_id UUID)
RETURNS TABLE(book_title VARCHAR, total_reviews BIGINT, avg_rating NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.title::VARCHAR,
        COUNT(r.id)::BIGINT,
        ROUND(COALESCE(AVG(r.rating), 0)::NUMERIC, 2)
    FROM public.books b
    LEFT JOIN public.reviews r ON r.book_id = b.id
    WHERE b.id = p_book_id
    GROUP BY b.id, b.title;
END;
$$ LANGUAGE plpgsql;
