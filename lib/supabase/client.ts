/**
 * Supabase browser client — uses the anon key.
 * Safe to import from client components.
 *
 * For now, the anon client is only used for read-only realtime
 * subscriptions in future features. All writes happen via API
 * routes using the server admin client.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  cached = createBrowserClient(url, anon);
  return cached;
}

export function supabaseEnabledClient(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
