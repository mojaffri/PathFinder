import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logServerEvent } from "@/lib/observability/logger";

/**
 * Signs the browser in as the shared demo account, server-side — the demo
 * password is read from a server-only env var and never sent to the client.
 * Uses the same cookie-aware server client as a real login, so the session
 * this sets is indistinguishable from a normal sign-in afterward.
 */
export async function POST() {
  const email = process.env.DEMO_USER_EMAIL;
  const password = process.env.DEMO_USER_PASSWORD;
  if (!email || !password) {
    return NextResponse.json({ error: "Demo mode isn't configured on this deployment." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logServerEvent("error", "demo_login_failed", {}, error);
    return NextResponse.json({ error: "Could not start the demo session." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
