import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import "server-only";

/**
 * Server-side Supabase client for use in route handlers and Server
 * Components. Reads/writes the session cookie via Next's `cookies()` — the
 * `setAll` call is wrapped in try/catch because Server Components can't set
 * cookies (only Server Actions/route handlers can); `middleware.ts` is what
 * actually keeps the session refreshed on every request either way.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — middleware.ts refreshes the session instead.
        }
      },
    },
  });
}

/**
 * The one function every server-side authorization check should call.
 * Returns `null` when there's no valid session — callers must treat that as
 * "not authenticated," never fall back to trusting a client-supplied user id.
 */
export async function getServerUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
