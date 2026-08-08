import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the "middleware" file convention to "proxy" (the
// underlying mechanism — a Node.js-runtime function that runs before a
// route renders — is otherwise unchanged). See node_modules/next/dist/docs/
// 01-app/03-api-reference/03-file-conventions/proxy.md.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets and image optimization files — everything else
    // (including API routes, which do their own auth check) passes through
    // so the session cookie stays refreshed app-wide.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
