-- ChapterOne: prevent authenticated users from changing their own application role.
-- Apply in the Supabase SQL Editor using an owner-level session.
-- This intentionally preserves existing Admin assignments; audit and correct
-- unintended Admin rows separately before considering the dashboard fixed.

BEGIN;

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'User';

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove legacy policies (including permissive policies with unexpected names)
-- before installing the single self-read policy. Role writes remain server-only.
DO $$
DECLARE policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_row.policyname);
  END LOOP;
END;
$$;

CREATE POLICY users_select_own_profile
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO service_role;

COMMIT;

-- After applying, inspect current assignments:
-- SELECT id, email, role FROM public.users ORDER BY role DESC, email;
-- Change only unintended Admin rows to User, keeping the intended admin account:
-- UPDATE public.users
-- SET role = 'User', updated_at = NOW()
-- WHERE role = 'Admin' AND lower(email) <> lower('YOUR_ADMIN_EMAIL');
