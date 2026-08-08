import { createClient } from "@supabase/supabase-js";
import "server-only";

/**
 * Service-role Supabase client — bypasses RLS entirely. Reserved for the two
 * operations an authenticated user's own session can't do:
 * `auth.admin.deleteUser()` (account deletion) and reference-data seeding.
 * Never import this from anything reachable by a client request without a
 * verified server-side authorization check first. Returns `null` if
 * `SUPABASE_SERVICE_ROLE_KEY` isn't configured, same convention as
 * `getAnthropicClient()`.
 */
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
