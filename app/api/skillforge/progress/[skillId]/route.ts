import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { getSkillModule } from "@/lib/skillforge/catalog";
import {
  getSkillProgress,
  markExerciseCompleted,
  markResourceCompleted,
  setInterviewSelfRating,
  setProjectChallengeStatus,
} from "@/repositories/skillforge-repository";
import type { ProjectChallengeStatus, RatingScale } from "@/types";

type MutationBody =
  | { kind: "resource"; resourceId: string; completed: boolean }
  | { kind: "exercise"; exerciseId: string; completed: boolean }
  | { kind: "project"; challengeId: string; status: ProjectChallengeStatus }
  | { kind: "interview"; rating: RatingScale };

export async function GET(_request: Request, { params }: { params: Promise<{ skillId: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { skillId } = await params;
    const progress = await getSkillProgress(user.id, skillId);
    return NextResponse.json({ progress });
  });
}

/**
 * The skill module itself is always resolved server-side from the static
 * catalog (`getSkillModule`), never trusted from the request body — the
 * client only ever needs to say which skill and what changed.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ skillId: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { skillId } = await params;
    const skillModule = getSkillModule(skillId);
    if (!skillModule) return NextResponse.json({ error: `Unknown skill "${skillId}".` }, { status: 404 });

    const body = (await request.json()) as MutationBody;
    let progress;
    switch (body.kind) {
      case "resource":
        progress = await markResourceCompleted(user.id, skillModule, body.resourceId, body.completed);
        break;
      case "exercise":
        progress = await markExerciseCompleted(user.id, skillModule, body.exerciseId, body.completed);
        break;
      case "project":
        progress = await setProjectChallengeStatus(user.id, skillModule, body.challengeId, body.status);
        break;
      case "interview":
        progress = await setInterviewSelfRating(user.id, skillModule, body.rating);
        break;
      default:
        return NextResponse.json({ error: "Unrecognized mutation." }, { status: 400 });
    }

    return NextResponse.json({ progress });
  });
}
