-- Apply only after reviewing the saved output from 10_auth_rbac_preflight.sql,
-- taking a database backup, and confirming this is the intended Supabase project.
-- Effects: link profiles to auth.users, create profiles for email accounts, default new
-- profiles to User, remove public profile reads, and allow authenticated users to read
-- only their own profile. This script intentionally does not promote any user to Admin.
--
-- Rollback: if any statement fails, the transaction rolls back. After success, do not
-- restore public profile reads. If the signup trigger must be removed, drop only
-- chapterone_on_auth_user_created and chapterone_handle_new_auth_user after reviewing
-- dependent app code. Review and preserve the self-only SELECT policy.

BEGIN;

DO $$
DECLARE
    id_attnum smallint;
    existing_fk_name text;
    existing_fk_validated boolean;
    existing_fk_delete_action "char";
BEGIN
    IF to_regclass('public.users') IS NULL THEN
        RAISE EXCEPTION 'public.users is missing; reconcile the schema before applying this script.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
    ) THEN
        RAISE EXCEPTION 'public.users must contain id, email, and role columns.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.users u
        LEFT JOIN auth.users au ON au.id = u.id
        WHERE au.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Orphan public.users rows exist. Resolve them using the preflight output; no changes applied.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.users
        WHERE role IS NOT NULL AND role NOT IN ('Admin', 'User', 'Faculty', 'Student')
    ) THEN
        RAISE EXCEPTION 'Unsupported role values exist. Review them before applying this script.';
    END IF;

    SELECT attnum INTO id_attnum
    FROM pg_attribute
    WHERE attrelid = 'public.users'::regclass AND attname = 'id' AND NOT attisdropped;

    SELECT c.conname, c.convalidated, c.confdeltype
    INTO existing_fk_name, existing_fk_validated, existing_fk_delete_action
    FROM pg_constraint c
    WHERE c.conrelid = 'public.users'::regclass
      AND c.confrelid = 'auth.users'::regclass
      AND c.contype = 'f'
      AND c.conkey = ARRAY[id_attnum]
    LIMIT 1;

    IF FOUND AND existing_fk_delete_action <> 'c' THEN
        RAISE EXCEPTION 'An auth.users FK exists without ON DELETE CASCADE; review it before continuing.';
    ELSIF NOT FOUND THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_id_auth_users_fkey
            FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
        existing_fk_name := 'users_id_auth_users_fkey';
        existing_fk_validated := false;
    END IF;

    IF NOT existing_fk_validated THEN
        EXECUTE format('ALTER TABLE public.users VALIDATE CONSTRAINT %I', existing_fk_name);
    END IF;
END $$;

-- Use Auth identity IDs; do not generate unrelated profile IDs.
ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
UPDATE public.users SET role = 'User' WHERE role IS NULL;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'User';
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

-- Backfill existing email-auth accounts while preserving assigned roles.
INSERT INTO public.users (id, email, role)
SELECT au.id, au.email, 'User'
FROM auth.users au
WHERE au.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- New signups receive the least-privileged role; user metadata never chooses a role.
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

-- Remove the known permissive policies and replace them with self-only profile reads.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    existing_policy record;
BEGIN
    FOR existing_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.users', existing_policy.policyname);
    END LOOP;
END $$;
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = id);

REVOKE ALL ON TABLE public.users FROM anon, authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;

COMMIT;

-- Promote an administrator only through a trusted SQL editor after confirming the account:
-- UPDATE public.users SET role = 'Admin'
-- WHERE id = (SELECT id FROM auth.users WHERE lower(email) = lower('verified-admin@example.com'));
