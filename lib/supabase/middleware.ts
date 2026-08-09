import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that require a signed-in session. Server-enforced here, not just hidden client-side. */
const PROTECTED_PREFIXES = ["/dashboard", "/accelerate", "/skillforge", "/profile", "/saved", "/onboarding", "/jobs", "/projects", "/roadmap", "/applications", "/analytics"];

/**
 * Refreshes the Supabase session cookie on every request and enforces route
 * protection server-side (redirecting to /login), so a disabled/absent
 * client-side guard can never expose a protected page. If Supabase isn't
 * configured, this is a no-op that lets every request through unauthenticated
 * — consistent with the rest of the app's graceful-degradation convention,
 * though in practice the protected pages themselves will show a
 * "sign in to continue" state rather than real data in that case.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: getUser() (not getSession()) actually re-validates the token
  // against Supabase Auth rather than just trusting whatever's in the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
