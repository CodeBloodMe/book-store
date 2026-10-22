-- OPTIONAL AUTH/RBAC HARDENING MIGRATION
-- Review the live schema and take a backup before applying.
-- Uses one public.users profile table, linked to Supabase auth.users.
-- A newly signed-up user receives only the least-privileged 'User' role.

CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email varchar NOT NULL,
    role varchar(50) NOT NULL DEFAULT 'User'
        CHECK (role IN ('Admin', 'User', 'Faculty', 'Student')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill existing Auth users without overwriting roles already assigned by an administrator.
INSERT INTO public.users (id, email, role)
SELECT id, COALESCE(email, ''), 'User'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Create or replace the trusted Auth trigger. Never copy an incoming metadata role into this table.
CREATE OR REPLACE FUNCTION public.chapterone_handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, COALESCE(NEW.email, ''), 'User')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chapterone_on_auth_user_created ON auth.users;
CREATE TRIGGER chapterone_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.chapterone_handle_new_auth_user();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Intentionally do not add a client UPDATE policy on role. Administrators change roles
-- through a trusted administrative path, not through ordinary profile editing.
REVOKE ALL ON public.users FROM anon;
GRANT SELECT ON public.users TO authenticated;

-- Verify signup creates a row, users can read only their own profile, and a normal user cannot
-- change their own role before relying on this migration for assessment evidence.
