import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { listRoadmaps, saveRoadmap } from "@/repositories/roadmap-repository";
import { logActivityEvent } from "@/repositories/activity-repository";
import type { SavedRoadmap } from "@/types";

export async function GET() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const roadmaps = await listRoadmaps(user.id);
    return NextResponse.json({ roadmaps });
  });
}

export async function POST(request: Request) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = (await request.json()) as SavedRoadmap;
    // `userId` on the saved roadmap is always the server-verified session id,
    // never whatever the client sent — same rule as everywhere else in the API.
    const roadmap = await saveRoadmap(user.id, { ...body, userId: user.id });
    await logActivityEvent(user.id, "roadmap_saved", { roadmapId: roadmap.id, source: roadmap.source });
    return NextResponse.json({ roadmap }, { status: 201 });
  });
}
