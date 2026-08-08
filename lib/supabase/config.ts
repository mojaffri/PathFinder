/**
 * True once real Supabase credentials are configured. Every auth surface
 * (login/signup pages, the navbar, demo mode) checks this first and shows a
 * clear "backend not configured" state instead of a broken form — the same
 * graceful-degradation convention `getAnthropicClient()` established for the
 * AI integration, applied to auth/persistence.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
