import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client — reads public env vars from Vite.
 * The anon key is safe to expose to the browser.
 * Row Level Security on every table ensures users can only see their own data.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env and fill in your Supabase project credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
