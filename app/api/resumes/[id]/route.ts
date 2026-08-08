import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { deleteResume, setActiveResume } from "@/repositories/resume-repository";
import { deleteResumeFile } from "@/lib/supabase/storage";

/** Marks this resume as the active one (used to back the profile / as job-fit evidence) — the only supported PATCH action today. */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const found = await setActiveResume(user.id, id);
    if (!found) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const deleted = await deleteResume(user.id, id);
    if (!deleted) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (deleted.storagePath) await deleteResumeFile(deleted.storagePath);
    return NextResponse.json({ ok: true });
  });
}
