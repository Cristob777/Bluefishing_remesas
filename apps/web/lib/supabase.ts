import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnon    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Server-side singleton — service role, full access (API routes + agents)
export const db = createClient(supabaseUrl, supabaseService, {
  auth: { persistSession: false },
})

// Browser client — anon key, subject to RLS (dashboard pages)
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnon)
}

// Legacy aliases — keep during migration
export const supabase       = db
export const createServerClient = () => db
