import { createClient } from '@/lib/supabase/server';

export type RoleCheck =
  | { ok: true; userId: string; role: string }
  | { ok: false; status: 401 | 403; error: string };

// Requires a public.users profile row. The optional migration in sql/06_auth_rbac_setup.sql
// backfills profiles and creates a safe default role on new Auth signups.
export async function requireRole(allowedRoles: string[]): Promise<RoleCheck> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, status: 401, error: 'Authentication required.' };

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return { ok: false, status: 403, error: 'User profile or role is unavailable.' };
  if (!allowedRoles.includes(profile.role)) return { ok: false, status: 403, error: 'Insufficient permissions.' };
  return { ok: true, userId: user.id, role: profile.role };
}
