-- READ-ONLY preflight for the ChapterOne users/RBAC hardening script.
-- Run this first in the intended Supabase project and save its output.
-- This script does not change database state and does not print emails or secrets.

-- 1. Confirm the profile table and its column definitions.
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. Review constraints involving the users table, including auth.users references.
SELECT c.conname,
       c.contype,
       c.convalidated,
       c.confdeltype,
       c.confrelid::regclass AS referenced_table,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid = to_regclass('public.users')
ORDER BY c.contype, c.conname;

-- 3. Review all user-table policies and effective table grants.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY grantee, privilege_type;

-- 4. Count invalid, orphaned, and missing profile rows without exposing user data.
DO $$
DECLARE
    profile_count bigint;
    orphan_count bigint;
    auth_without_profile_count bigint;
    invalid_role_count bigint;
BEGIN
    IF to_regclass('public.users') IS NULL THEN
        RAISE NOTICE 'public.users is missing; stop and reconcile migrations before continuing.';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
    ) THEN
        RAISE NOTICE 'public.users lacks id or role; stop and reconcile migrations before continuing.';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM public.users' INTO profile_count;
    EXECUTE $query$
        SELECT count(*)
        FROM public.users u
        LEFT JOIN auth.users au ON au.id = u.id
        WHERE au.id IS NULL
    $query$ INTO orphan_count;
    EXECUTE $query$
        SELECT count(*)
        FROM auth.users au
        LEFT JOIN public.users u ON u.id = au.id
        WHERE u.id IS NULL AND au.email IS NOT NULL
    $query$ INTO auth_without_profile_count;
    EXECUTE $query$
        SELECT count(*)
        FROM public.users
        WHERE role IS NULL OR role NOT IN ('Admin', 'User', 'Faculty', 'Student')
    $query$ INTO invalid_role_count;

    RAISE NOTICE 'public.users rows: %', profile_count;
    RAISE NOTICE 'profiles without matching auth.users: %', orphan_count;
    RAISE NOTICE 'email accounts missing a public.users profile: %', auth_without_profile_count;
    RAISE NOTICE 'null or invalid role rows: %', invalid_role_count;
END $$;

-- 5. Inspect public SECURITY DEFINER functions and their search_path/grants.
SELECT p.oid::regprocedure AS function_signature,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       p.proacl AS function_grants
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
ORDER BY p.oid::regprocedure::text;
