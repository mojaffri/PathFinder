import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { ApplicationInputSchema } from "@/lib/applications/schema";
import { getServerUser } from "@/lib/supabase/server";
import { deleteApplication, updateApplication } from "@/repositories/application-repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    const parsed = ApplicationInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Check the application details and try again.", issues: parsed.error.issues }, { status: 422 });
    const { id } = await params;
    const application = await updateApplication(user.id, id, parsed.data);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    return NextResponse.json({ application });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    const { id } = await params;
    if (!await deleteApplication(user.id, id)) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}
