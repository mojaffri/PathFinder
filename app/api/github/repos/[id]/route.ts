import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { deleteRepo, linkRepoToProject } from "@/repositories/github-repository";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    await deleteRepo(user.id, id);
    return NextResponse.json({ ok: true });
  });
}

/** Body: `{ projectId: string | null }` — links (or unlinks, with `null`) this analyzed repo to a profile project entry, so its detected signals count as that project's evidence. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const projectId = body && typeof body === "object" && "projectId" in body && (typeof body.projectId === "string" || body.projectId === null) ? body.projectId : undefined;
    if (projectId === undefined) {
      return NextResponse.json({ error: "Expected a projectId (string or null)." }, { status: 422 });
    }

    const repo = await linkRepoToProject(user.id, id, projectId);
    if (!repo) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ repo });
  });
}
