import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { deleteRoadmap, getRoadmap } from "@/repositories/roadmap-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const roadmap = await getRoadmap(user.id, id);
    if (!roadmap) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ roadmap });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    await deleteRoadmap(user.id, id);
    return NextResponse.json({ ok: true });
  });
}
