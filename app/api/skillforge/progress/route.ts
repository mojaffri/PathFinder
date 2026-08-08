import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { listSkillProgress } from "@/repositories/skillforge-repository";

/** Bulk read — `?skillIds=a,b,c`. Used wherever a page needs progress for several modules in one round trip (dashboard, a skill's own prerequisites for the readiness check). */
export async function GET(request: Request) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const skillIds = (searchParams.get("skillIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const progress = await listSkillProgress(user.id, skillIds);
    return NextResponse.json({ progress });
  });
}
