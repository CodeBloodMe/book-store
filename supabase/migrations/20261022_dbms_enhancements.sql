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


-- STEP 3: Ensure RBAC profiles map to Auth identities and default to least privilege
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'User' CHECK (role IN ('Admin', 'User', 'Faculty', 'Student')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Do not create profile IDs unrelated to auth.users and never trust signup metadata for roles.
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'User';
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

-- Backfill email accounts as User while preserving any role already assigned by an owner.
INSERT INTO public.users (id, email, role)
SELECT id, email, 'User'
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Profiles are private; each authenticated user may read their own row only.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow demo read access on users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = id);
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.chapterone_handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN
        INSERT INTO public.users (id, email, role)
        VALUES (NEW.id, NEW.email, 'User')
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.chapterone_handle_new_auth_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS chapterone_on_auth_user_created ON auth.users;
CREATE TRIGGER chapterone_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.chapterone_handle_new_auth_user();


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
