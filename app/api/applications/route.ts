import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { ApplicationInputSchema } from "@/lib/applications/schema";
import { getServerUser } from "@/lib/supabase/server";
import { createApplication, listApplications } from "@/repositories/application-repository";

export async function GET() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    return NextResponse.json({ applications: await listApplications(user.id) });
  });
}

export async function POST(request: Request) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    const parsed = ApplicationInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Check the application details and try again.", issues: parsed.error.issues }, { status: 422 });
    return NextResponse.json({ application: await createApplication(user.id, parsed.data) }, { status: 201 });
  });
}
