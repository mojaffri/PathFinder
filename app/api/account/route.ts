import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { logServerEvent } from "@/lib/observability/logger";

/**
 * Permanently deletes the signed-in user's Supabase Auth account. This
 * cascades through `profiles` (FK `ON DELETE CASCADE` on `user_id`) and from
 * there through every child table — one delete removes everything the
 * student ever entered. Requires `SUPABASE_SERVICE_ROLE_KEY`; without it,
 * account deletion isn't possible (a user can still stop using the app, but
 * can't self-serve delete their data — flagged clearly in docs/security.md).
 */
export async function DELETE() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Account deletion requires SUPABASE_SERVICE_ROLE_KEY to be configured on the server." },
      { status: 503 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    logServerEvent("error", "account_deletion_failed", { userId: user.id }, error);
    return NextResponse.json({ error: "Could not delete account. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
