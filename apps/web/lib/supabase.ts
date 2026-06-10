import { createClient } from '@supabase/supabase-js'
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'
import { config } from './config'

/**
 * Single source of truth for all Supabase clients.
 *
 * Three surfaces:
 *   db                    — service-role singleton for server routes and agents
 *   createBrowserClient() — anon-key client for browser components (cookie storage)
 *   getSupabaseAnonKey()  — helper for modules that build their own client
 */

/** Accepts both the old ANON_KEY and the new PUBLISHABLE_KEY name. */
export function getSupabaseAnonKey(): string {
  return config.supabase.anonKey
}

// Server-side singleton — service role, full access (API routes + agents).
// null as never = "typed away" so callers don't need null checks, but a
// runtime null here means SUPABASE_SERVICE_ROLE_KEY is missing in env.
export const db = config.supabase.url && config.supabase.serviceRole
  ? createClient(config.supabase.url, config.supabase.serviceRole, {
      auth: { persistSession: false },
    })
  : (null as never)

// Browser client — uses @supabase/ssr so the session is stored in cookies
// (not localStorage). This is required so the Edge middleware (proxy.ts) can
// read the sb-* auth cookie to decide whether the request is authenticated.
export function createBrowserClient() {
  return createSSRBrowserClient(config.supabase.url, getSupabaseAnonKey())
}

// Legacy aliases — kept so existing imports don't break during migration.
export const supabase           = db
export const createServerClient = () => db
