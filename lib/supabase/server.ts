/**
 * Supabase server client — uses the SERVICE_ROLE key.
 * Never import this from a client component. Server-only.
 *
 * Falls back to `null` when env vars aren't set, so every caller MUST
 * null-check. The whole app continues to work without Supabase
 * (localStorage on the client; mock data on the server).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "hamr.fun" } },
  });
  return cached;
}

/**
 * `true` if Supabase is configured. Use to gate optional features
 * without forcing a network call.
 */
export function supabaseEnabled(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
