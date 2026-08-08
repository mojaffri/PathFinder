import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { getResumeById } from "@/repositories/resume-repository";
import { getResumeDownloadUrl } from "@/lib/supabase/storage";

/** Returns a short-lived signed URL for the original uploaded file — ownership is re-verified via `getResumeById` (RLS-backed) before a URL is ever generated, never derived from a client-supplied storage path. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const resume = await getResumeById(user.id, id);
    if (!resume) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!resume.storagePath) {
      return NextResponse.json({ error: "The original file wasn't stored for this resume." }, { status: 404 });
    }

    const url = await getResumeDownloadUrl(resume.storagePath);
    if (!url) return NextResponse.json({ error: "File storage isn't configured." }, { status: 503 });
    return NextResponse.json({ url });
  });
}
