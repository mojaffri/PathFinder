import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedRoute } from "@/lib/auth/route-access";

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "redirectTo",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

/**
 * Refreshes the Supabase session cookie on every request and enforces route
 * protection server-side (redirecting to /login), so a disabled/absent
 * client-side guard can never expose a protected page. If Supabase isn't
 * configured, public pages remain available while private pages redirect to
 * the user-facing sign-in-unavailable state instead of rendering failed API
 * requests or leaking deployment instructions.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return isProtectedRoute(request.nextUrl.pathname)
      ? redirectToLogin(request)
      : response;
  }

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

  if (isProtectedRoute(request.nextUrl.pathname) && !user) {
    return redirectToLogin(request);
  }

  return response;
}
