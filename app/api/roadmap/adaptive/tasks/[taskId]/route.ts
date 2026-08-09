import { NextResponse } from "next/server";
import { z } from "zod";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { getAdaptiveRoadmap, updateTaskStatus } from "@/repositories/adaptive-roadmap-repository";
import { scheduleTasks } from "@/lib/roadmap/scheduler";
import { groupTasksIntoPhases } from "@/lib/roadmap/adaptive-phases";
import { buildSkillGraphIndex } from "@/lib/roadmap/skill-graph";
import { saveAdaptiveRoadmap } from "@/repositories/adaptive-roadmap-repository";
import { logActivityEvent } from "@/repositories/activity-repository";

const BodySchema = z.object({
  status: z.enum(["not-started", "in-progress", "completed", "skipped"]),
});

/**
 * Marks one task complete/in-progress/skipped without a full recompute.
 * When the status affects future scheduling (completed/skipped free up — or
 * remove — capacity), the remaining not-started tasks are cheaply
 * rescheduled in place, reusing the same deterministic scheduler rather than
 * re-running the whole generator/priority pipeline.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const rawBody = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body.", details: parsed.error.flatten() }, { status: 400 });
    }

    const { taskId } = await params;
    const updated = await updateTaskStatus(user.id, taskId, parsed.data.status);
    if (!updated) return NextResponse.json({ error: "Task not found." }, { status: 404 });

    const roadmap = await getAdaptiveRoadmap(user.id);
    if (!roadmap) return NextResponse.json({ task: updated });

    if (parsed.data.status === "completed" || parsed.data.status === "skipped") {
      const allTasks = roadmap.phases.flatMap((p) => p.tasks);
      const { scheduledTasks, feasibility } = scheduleTasks(allTasks, roadmap.weeklyHoursAvailable, roadmap.targetDate);
      const phases = groupTasksIntoPhases(scheduledTasks, buildSkillGraphIndex());
      const rescheduled = await saveAdaptiveRoadmap(user.id, { ...roadmap, phases, feasibility }, null);
      await logActivityEvent(user.id, parsed.data.status === "completed" ? "roadmap_task_completed" : "adaptive_roadmap_task_updated", { taskId, title: updated.title, skillName: updated.skillName, status: parsed.data.status });
      return NextResponse.json({ task: rescheduled.phases.flatMap((p) => p.tasks).find((t) => t.id === updated.id) ?? updated, roadmap: rescheduled });
    }

    await logActivityEvent(user.id, "adaptive_roadmap_task_updated", { taskId, title: updated.title, skillName: updated.skillName, status: parsed.data.status });
    return NextResponse.json({ task: updated, roadmap });
  });
}
