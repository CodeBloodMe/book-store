import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | undefined;

function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer current Supabase secret keys; retain legacy service_role compatibility.
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing server configuration: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) is required for protected server-side database operations.'
    );
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return adminClient;
}

/**
 * Privileged Supabase client for server-only API routes.
 * NEVER import this module from a Client Component and NEVER expose the key
 * through a NEXT_PUBLIC_* variable. Keep user input validation in each route.
 */
// Lazy initialization lets unauthenticated/error responses work without
// privileged credentials being configured. Accessing any client method still
// fails closed with a clear server configuration error.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getAdminClient();
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
