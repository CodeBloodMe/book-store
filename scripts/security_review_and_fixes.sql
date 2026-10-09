-- ======================================================================================
-- DBMS Security Review and Fixes
-- Addresses SECURITY DEFINER vulnerabilities and missing Row Level Security (RLS) policies.
-- ======================================================================================

BEGIN;

-- 1. Secure existing Stored Procedures (RPCs)
-- Problem: Functions running as SECURITY DEFINER can execute with elevated privileges.
-- They must have a hardened search_path to prevent malicious search_path injection.

-- Secure match_books
ALTER FUNCTION public.match_books(vector, double precision, integer) 
    SET search_path = public, pg_temp;

-- Secure match_mystery_book
ALTER FUNCTION public.match_mystery_book(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) 
    SET search_path = public, pg_temp;

-- Secure get_blind_date_stats
ALTER FUNCTION public.get_blind_date_stats() 
    SET search_path = public, pg_temp;

-- Secure find_reading_path
ALTER FUNCTION public.find_reading_path(UUID, UUID, integer) 
    SET search_path = public, pg_temp;

-- Secure get_book_neighbors
ALTER FUNCTION public.get_book_neighbors(UUID, integer) 
    SET search_path = public, pg_temp;


-- Revoke default public execution rights to prevent anonymous unauthenticated abuse
REVOKE EXECUTE ON FUNCTION public.match_books(vector, double precision, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_mystery_book(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_blind_date_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_reading_path(UUID, UUID, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_book_neighbors(UUID, integer) FROM PUBLIC;


-- Grant execution only to authenticated application users
GRANT EXECUTE ON FUNCTION public.match_books(vector, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_mystery_book(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blind_date_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_reading_path(UUID, UUID, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_book_neighbors(UUID, integer) TO authenticated;


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
