// ============================================================
// BookSphere — Server-Side Supabase Client
// Used exclusively in Server Components and lib/queries.ts.
// Do NOT import this in Client Components ('use client').
// For client-side use, import from utils/supabase.ts instead.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
  );
}

// A single shared client instance for all server-side queries.
// In Next.js App Router, each request gets its own execution context,
// so this singleton pattern is safe to use in Server Components.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
