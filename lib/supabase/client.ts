import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client — safe to import from "use client" components.
 * Only ever uses the public URL + anon key (never the service-role key).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
