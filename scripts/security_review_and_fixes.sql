-- ======================================================================================
-- DBMS Security Review and Fixes
-- Addresses SECURITY DEFINER vulnerabilities and missing Row Level Security (RLS) policies.
-- ======================================================================================

BEGIN;

-- 1. Secure existing Stored Procedures (RPCs)
-- Problem: Functions matching vectors run as SECURITY DEFINER which can execute with elevated 
-- privileges. They must have a hardened search_path to prevent malicious search_path injection.

-- Secure match_books
ALTER FUNCTION public.match_books(vector, integer, double precision) 
    SET search_path = public, pg_temp;

-- Secure match_books_with_genre
ALTER FUNCTION public.match_books_with_genre(vector, uuid, integer, double precision) 
    SET search_path = public, pg_temp;

-- Revoke default public execution rights
REVOKE EXECUTE ON FUNCTION public.match_books(vector, integer, double precision) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_books_with_genre(vector, uuid, integer, double precision) FROM PUBLIC;

-- Grant execution only to authenticated application users
GRANT EXECUTE ON FUNCTION public.match_books(vector, integer, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_books_with_genre(vector, uuid, integer, double precision) TO authenticated;

-- 2. Enhance Row Level Security (RLS) on sensitive tables
-- Ensure RLS is enabled
ALTER TABLE public.user_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing generic policies if they exist (to ensure idempotent application)
DROP POLICY IF EXISTS "Users can manage their own shelves" ON public.user_shelves;
DROP POLICY IF EXISTS "Users can manage their own reviews" ON public.reviews;

-- Create policies enforcing tenant isolation (users can only access their own data)
CREATE POLICY "Users can manage their own shelves"
    ON public.user_shelves
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own reviews"
    ON public.reviews
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMIT;
