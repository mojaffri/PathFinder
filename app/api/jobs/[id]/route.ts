import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { deleteJobDescription, getJobDescription, updateJobDescription, type JobDescriptionUpdateInput } from "@/repositories/job-repository";
import type { JobDescription } from "@/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const job = await getJobDescription(user.id, id);
    if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ job });
  });
}

/** Full-replace update — the client sends the complete `JobDescription` shape after edits, matching `PATCH /api/profile`'s convention. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Partial<JobDescription> | null;
    if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

    const input: JobDescriptionUpdateInput = {
      title: body.title ?? null,
      company: body.company ?? null,
      minExperienceYears: body.minExperienceYears ?? null,
      preferredExperienceYears: body.preferredExperienceYears ?? null,
      educationRequirement: body.educationRequirement ?? null,
      responsibilities: body.responsibilities ?? [],
      keywords: body.keywords ?? [],
      requirements: (body.requirements ?? []).map((r) => ({
        category: r.category,
        kind: r.kind,
        label: r.label,
        minYears: r.minYears ?? null,
        source: r.source ?? "manual",
      })),
    };

    const job = await updateJobDescription(user.id, id, input);
    if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ job });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    await deleteJobDescription(user.id, id);
    return NextResponse.json({ ok: true });
  });
}
