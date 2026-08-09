import { NextResponse } from "next/server";
import { z } from "zod";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { buildAdaptiveRoadmapInput } from "@/lib/roadmap/adaptive-input";
import { recomputeAdaptiveRoadmap } from "@/lib/roadmap/adaptation";
import { saveAdaptiveRoadmap } from "@/repositories/adaptive-roadmap-repository";
import { logActivityEvent } from "@/repositories/activity-repository";

const BodySchema = z.object({
  trigger: z
    .enum([
      "assessment-passed", "assessment-failed", "new-evidence", "new-github-project", "new-resume",
      "target-role-changed", "deadline-changed", "weekly-hours-changed", "job-analyzed", "manual",
    ])
    .default("manual"),
});

/**
 * The single recompute entrypoint every trigger (manual "Recompute" button,
 * a SkillForge assessment result, a job-fit run, a profile-change prompt)
 * calls — see `docs/roadmap-engine.md` for exactly which triggers are wired
 * automatically vs. surfaced as an explicit user action.
 */
export async function POST(request: Request) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const rawBody = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body.", details: parsed.error.flatten() }, { status: 400 });
    }

    const input = await buildAdaptiveRoadmapInput(user.id);
    if (!input) return NextResponse.json({ error: "Complete your profile before generating a roadmap." }, { status: 422 });

    // `input.previous` is already fetched by `buildAdaptiveRoadmapInput` — reused here rather than re-queried.
    const { roadmap, changeEvent } = recomputeAdaptiveRoadmap(input.previous, input, parsed.data.trigger);
    const saved = await saveAdaptiveRoadmap(user.id, roadmap, changeEvent);

    await logActivityEvent(user.id, "adaptive_roadmap_recomputed", { trigger: parsed.data.trigger, hasChanges: changeEvent !== null, readiness: saved.readiness });
    if (input.previous?.readiness !== saved.readiness) {
      await logActivityEvent(user.id, "readiness_changed", { readiness: saved.readiness, previousReadiness: input.previous?.readiness ?? null, trigger: parsed.data.trigger });
    }

    return NextResponse.json({ roadmap: saved, changeEvent });
  });
}
