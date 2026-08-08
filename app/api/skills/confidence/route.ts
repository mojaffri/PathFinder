import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { buildSkillConfidenceContext } from "@/lib/evidence/build-context";
import { computeAllSkillConfidence } from "@/lib/evidence/confidence";

/** Every tracked skill's full confidence report — see docs/evidence-model.md. Empty list (not an error) for a profile with no skills/experience/projects/GitHub evidence yet. */
export async function GET() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const context = await buildSkillConfidenceContext(user.id);
    if (!context) return NextResponse.json({ scores: [] });

    const scores = computeAllSkillConfidence(context);
    return NextResponse.json({ scores });
  });
}
