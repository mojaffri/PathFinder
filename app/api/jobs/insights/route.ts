import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { buildSkillConfidenceContext } from "@/lib/evidence/build-context";
import { computeSavedJobInsights } from "@/lib/jobs/saved-job-insights";
import { getServerUser } from "@/lib/supabase/server";
import { listFullJobDescriptions } from "@/repositories/job-repository";

export async function GET() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    const [jobs, context] = await Promise.all([listFullJobDescriptions(user.id), buildSkillConfidenceContext(user.id)]);
    return NextResponse.json({ insights: computeSavedJobInsights(jobs, context) });
  });
}
