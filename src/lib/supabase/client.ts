/**
 * Supabase Client
 * Configured clients for browser and server-side usage
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Get environment variables with fallbacks for build-time safety
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Supabase client for browser/client-side usage
 * Uses anon key with RLS policies
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase admin client for server-side usage
 * Uses service role key to bypass RLS
 * Only use in API routes, never expose to client
 */
export const supabaseAdmin: SupabaseClient | null = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Get the appropriate Supabase client for server-side operations
 */
export function getServerSupabase(): SupabaseClient {
  if (!supabaseAdmin) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Supabase service role key not configured, using anon client");
    }
    return supabase;
  }
  return supabaseAdmin;
}
