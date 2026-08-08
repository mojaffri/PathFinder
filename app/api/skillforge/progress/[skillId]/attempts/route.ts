import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { getSkillModule } from "@/lib/skillforge/catalog";
import { recordAttempt } from "@/repositories/skillforge-repository";
import type { SkillAttemptResponse, SkillEvaluationResult } from "@/types";

interface RecordAttemptBody {
  stage: "diagnostic" | "assessment";
  responses: SkillAttemptResponse[];
  evaluation: SkillEvaluationResult | null;
}

export async function POST(request: Request, { params }: { params: Promise<{ skillId: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { skillId } = await params;
    const skillModule = getSkillModule(skillId);
    if (!skillModule) return NextResponse.json({ error: `Unknown skill "${skillId}".` }, { status: 404 });

    const body = (await request.json()) as RecordAttemptBody;
    const progress = await recordAttempt(user.id, skillModule, body.stage, body.responses, body.evaluation);
    return NextResponse.json({ progress }, { status: 201 });
  });
}
