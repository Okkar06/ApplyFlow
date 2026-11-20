import { createClient } from '@supabase/supabase-js'

// Browser-safe values only. Accepts our VITE_* names and the NEXT_PUBLIC_* names
// that Vercel's Supabase integration creates (exposed via envPrefix in
// vite.config.ts). Secret/service-role keys never have a public prefix, so they
// can't reach the bundle.
// Each name is referenced directly so Vite inlines only these values.
const pick = (...values: unknown[]) => values.find((value): value is string => typeof value === 'string' && value.trim() !== '')?.trim()

export const supabaseUrl = pick(import.meta.env.VITE_SUPABASE_URL, import.meta.env.NEXT_PUBLIC_SUPABASE_URL)
export const supabaseAnonKey = pick(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
)

/** Names of missing settings; the app shows a setup screen instead of crashing. */
export const missingSupabaseConfig = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
].filter((name): name is string => Boolean(name))

// createClient throws on an empty URL at import time, which would blank the
// page before React mounts. Use an inert placeholder when unconfigured; main.tsx
// renders the setup screen and never calls it.
export const supabase = createClient(supabaseUrl ?? 'https://unconfigured.invalid', supabaseAnonKey ?? 'unconfigured', {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
  },
})
