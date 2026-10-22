-- ChapterOne security audit (read-only except for no statements here)

-- 1. Current RLS state
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
ORDER BY c.relname;

-- 2. Policies and predicates
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public'
ORDER BY tablename, policyname;

-- 3. Privileges on public tables
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
ORDER BY table_name, grantee, privilege_type;

-- 4. SECURITY DEFINER functions, configuration and grants
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef, p.proconfig, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
ORDER BY p.proname;

-- Manual security checks required after reading the output:
-- * public.users: authenticated users must only read their own profile; they must not self-promote role.
-- * user_shelves: reads and writes must be limited to auth.uid() = user_id.
-- * reviews: public read may be acceptable, but delete must be limited to the review owner/moderator.
-- * blind_date_interactions: anonymous interaction writes need validation/rate limits to limit abuse.
-- * book_edges: public SELECT may be appropriate; mutations should use a trusted server/database role.
-- * Never expose SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL to browser/client code.
-- * Protect administrative/population routes; avoid passing secrets in URLs.
