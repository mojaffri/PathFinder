import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { logServerEvent } from "@/lib/observability/logger";
import { deleteResumeFiles } from "@/lib/supabase/storage";
import { listResumeStoragePaths } from "@/repositories/resume-repository";

/**
 * Permanently deletes the signed-in user's private resume objects and then
 * their Supabase Auth account. The auth deletion cascades through `profiles`
 * and every relational child. File cleanup runs first because Storage does
 * not participate in Postgres foreign-key cascades.
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

  const storagePaths = await listResumeStoragePaths(user.id);
  if (!(await deleteResumeFiles(storagePaths))) {
    return NextResponse.json(
      { error: "Could not remove your stored resume files. Your account was not deleted; please try again." },
      { status: 500 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    logServerEvent("error", "account_deletion_failed", { userId: user.id }, error);
    return NextResponse.json({ error: "Could not delete account. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
