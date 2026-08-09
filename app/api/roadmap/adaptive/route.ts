import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { getAdaptiveRoadmap } from "@/repositories/adaptive-roadmap-repository";

export async function GET() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const roadmap = await getAdaptiveRoadmap(user.id);
    return NextResponse.json({ roadmap });
  });
}
