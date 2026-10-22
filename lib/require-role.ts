import { createClient } from '@/lib/supabase/server';

export const APP_ROLES = ['Admin', 'User', 'Faculty', 'Student'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type RoleCheck =
  | { ok: true; userId: string; role: AppRole }
  | { ok: false; status: 401 | 403; error: string };

export async function requireRole(allowedRoles: readonly AppRole[]): Promise<RoleCheck> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || !APP_ROLES.includes(profile.role as AppRole)) {
    return { ok: false, status: 403, error: 'A valid user profile and role are required.' };
  }

  const role = profile.role as AppRole;
  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403, error: 'Insufficient permissions.' };
  }

  return { ok: true, userId: user.id, role };
}
