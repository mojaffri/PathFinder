import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { disconnectGithub, getGithubConnectionStatus } from "@/repositories/github-repository";

export async function GET() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const connection = await getGithubConnectionStatus(user.id);
    return NextResponse.json({ connection });
  });
}

/** Disconnects a linked GitHub account — deletes the encrypted token; previously analyzed repos are kept (their `connectionId` becomes null via `ON DELETE SET NULL`), since the analysis itself remains valid evidence. */
export async function DELETE() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    await disconnectGithub(user.id);
    return NextResponse.json({ ok: true });
  });
}
