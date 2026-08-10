import { eq, inArray } from "drizzle-orm";
import { ensureProfileId } from "@/repositories/profile-repository";
import { withUserContext, type Tx } from "@/lib/db/with-user-context";
import {
  adaptiveRoadmapChangeEvents,
  adaptiveRoadmapCompletedHistory,
  adaptiveRoadmapPhases,
  adaptiveRoadmapTasks,
  adaptiveRoadmaps,
  profiles,
} from "@/lib/db/schema";
import type {
  AdaptivePhase,
  AdaptiveRoadmap,
  AdaptiveTask,
  AdaptiveTaskStatus,
  CompletedHistoryEntry,
  RoadmapChangeEvent,
  ScheduleFeasibility,
  SavedJobSkillFrequency,
} from "@/types/adaptive-roadmap";

type RoadmapRow = typeof adaptiveRoadmaps.$inferSelect;
type PhaseRow = typeof adaptiveRoadmapPhases.$inferSelect;
type TaskRow = typeof adaptiveRoadmapTasks.$inferSelect;
type ChangeEventRow = typeof adaptiveRoadmapChangeEvents.$inferSelect;
type HistoryRow = typeof adaptiveRoadmapCompletedHistory.$inferSelect;

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Roadmaps generated before the deterministic scheduler shipped stored a
 * smaller `{ status, message, weeklyHoursRequired, weeklyHoursAvailable }`
 * JSON object. Normalize that persisted shape at the repository boundary so
 * old plans remain viewable and are upgraded naturally on the next recompute.
 */
function normalizeFeasibility(
  value: unknown,
  taskRows: TaskRow[],
  configuredWeeklyHours: number | null,
): ScheduleFeasibility {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const totalRemainingHours = taskRows
    .filter((task) => task.status !== "completed" && task.status !== "skipped")
    .reduce((sum, task) => sum + task.estimatedHours, 0);
  const weeklyHoursAvailable = Math.max(
    1,
    numberOr(record.weeklyHoursAvailable, configuredWeeklyHours ?? 5),
  );
  const status = typeof record.status === "string" ? record.status : null;
  const feasible = typeof record.feasible === "boolean"
    ? record.feasible
    : !["at-risk", "behind", "unrealistic"].includes(status ?? "");

  return {
    feasible,
    totalRemainingHours: numberOr(record.totalRemainingHours, totalRemainingHours),
    requiredWeeks: numberOr(record.requiredWeeks, Math.ceil(totalRemainingHours / weeklyHoursAvailable)),
    availableWeeks: typeof record.availableWeeks === "number" ? record.availableWeeks : null,
    weeklyHoursAvailable,
    isAssumedAvailability: typeof record.isAssumedAvailability === "boolean"
      ? record.isAssumedAvailability
      : configuredWeeklyHours === null,
    message: typeof record.message === "string" ? record.message : "",
    recommendations: Array.isArray(record.recommendations)
      ? record.recommendations.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function rowToTask(row: TaskRow, skillIdToTaskId: Map<string, string>): AdaptiveTask {
  return {
    id: row.id,
    skillId: row.skillId,
    skillName: row.skillName,
    title: row.title,
    reason: row.reason,
    estimatedHours: row.estimatedHours,
    prerequisiteTaskIds: row.prerequisiteSkillIds.map((sid) => skillIdToTaskId.get(sid)).filter((id): id is string => id !== undefined),
    priorityScore: row.priorityScore,
    priorityTier: row.priorityTier as AdaptiveTask["priorityTier"],
    scheduledStartDate: row.scheduledStartDate,
    scheduledTargetDate: row.scheduledTargetDate,
    status: row.status as AdaptiveTaskStatus,
    completionCriteria: row.completionCriteria,
    learningResource: row.learningResource as AdaptiveTask["learningResource"],
    assessmentSkillForgeModuleId: row.assessmentSkillForgeModuleId,
    evidenceGoal: row.evidenceGoal,
    sourceGapTitle: row.sourceGapTitle,
    sourceJobRequirementLabels: row.sourceJobRequirementLabels,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function rowToRoadmap(
  roadmapRow: RoadmapRow,
  phaseRows: PhaseRow[],
  taskRows: TaskRow[],
  changeEventRows: ChangeEventRow[],
  historyRows: HistoryRow[],
  userId: string,
): AdaptiveRoadmap {
  const skillIdToTaskId = new Map(taskRows.map((t) => [t.skillId, t.id]));

  const phases: AdaptivePhase[] = phaseRows
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      key: p.key,
      title: p.title,
      tasks: taskRows.filter((t) => t.phaseId === p.id).map((t) => rowToTask(t, skillIdToTaskId)),
    }));

  const changeEvents: RoadmapChangeEvent[] = changeEventRows
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
    .map((e) => ({
      id: e.id,
      trigger: e.trigger as RoadmapChangeEvent["trigger"],
      occurredAt: e.occurredAt.toISOString(),
      summary: e.summary,
      addedSkillIds: e.addedSkillIds,
      removedSkillIds: e.removedSkillIds,
      changedSkillIds: e.changedSkillIds,
    }));

  const completedHistory: CompletedHistoryEntry[] = historyRows
    .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())
    .map((h) => ({ skillId: h.skillId, title: h.title, completedAt: h.completedAt.toISOString(), estimatedHours: h.estimatedHours }));

  return {
    id: roadmapRow.id,
    userId,
    targetCareers: roadmapRow.targetCareers,
    targetDate: roadmapRow.targetDate,
    weeklyHoursAvailable: roadmapRow.weeklyHoursAvailable,
    readiness: roadmapRow.readiness,
    phases,
    feasibility: normalizeFeasibility(roadmapRow.feasibility, taskRows, roadmapRow.weeklyHoursAvailable),
    savedJobSkillFrequency: Array.isArray(roadmapRow.savedJobSkillFrequency)
      ? roadmapRow.savedJobSkillFrequency as SavedJobSkillFrequency[]
      : [],
    changeEvents,
    completedHistory,
    generatedAt: roadmapRow.generatedAt.toISOString(),
    updatedAt: roadmapRow.updatedAt.toISOString(),
  };
}

async function loadFullRoadmap(tx: Tx, roadmapId: string, userId: string): Promise<AdaptiveRoadmap | null> {
  const [roadmapRow] = await tx.select().from(adaptiveRoadmaps).where(eq(adaptiveRoadmaps.id, roadmapId)).limit(1);
  if (!roadmapRow) return null;

  const phaseRows = await tx.select().from(adaptiveRoadmapPhases).where(eq(adaptiveRoadmapPhases.roadmapId, roadmapId));
  const phaseIds = phaseRows.map((p) => p.id);
  const [taskRows, changeEventRows, historyRows] = await Promise.all([
    phaseIds.length > 0 ? tx.select().from(adaptiveRoadmapTasks).where(inArray(adaptiveRoadmapTasks.phaseId, phaseIds)) : Promise.resolve([]),
    tx.select().from(adaptiveRoadmapChangeEvents).where(eq(adaptiveRoadmapChangeEvents.roadmapId, roadmapId)),
    tx.select().from(adaptiveRoadmapCompletedHistory).where(eq(adaptiveRoadmapCompletedHistory.roadmapId, roadmapId)),
  ]);

  return rowToRoadmap(roadmapRow, phaseRows, taskRows, changeEventRows, historyRows, userId);
}

export async function getAdaptiveRoadmap(userId: string): Promise<AdaptiveRoadmap | null> {
  return withUserContext(userId, async (tx) => {
    const [profileRow] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profileRow) return null;

    const [roadmapRow] = await tx.select({ id: adaptiveRoadmaps.id }).from(adaptiveRoadmaps).where(eq(adaptiveRoadmaps.profileId, profileRow.id)).limit(1);
    if (!roadmapRow) return null;

    return loadFullRoadmap(tx, roadmapRow.id, userId);
  });
}

/**
 * Delete-and-reinsert for `phases`/`tasks` only (same sanctioned pattern as
 * `roadmap-repository.ts#saveRoadmap`). `change_events` and
 * `completed_history` are APPEND-ONLY: only genuinely new rows (a change
 * event that hasn't been persisted yet; a completed skill not already
 * recorded) are inserted — existing rows are never deleted or rewritten, so
 * a student's history survives every regenerate.
 */
export async function saveAdaptiveRoadmap(
  userId: string,
  roadmap: AdaptiveRoadmap,
  newChangeEvent: RoadmapChangeEvent | null,
): Promise<AdaptiveRoadmap> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);

    const [existing] = await tx.select({ id: adaptiveRoadmaps.id }).from(adaptiveRoadmaps).where(eq(adaptiveRoadmaps.profileId, profileId)).limit(1);

    const values = {
      profileId,
      targetCareers: roadmap.targetCareers,
      targetDate: roadmap.targetDate,
      weeklyHoursAvailable: roadmap.weeklyHoursAvailable,
      readiness: roadmap.readiness,
      feasibility: roadmap.feasibility,
      savedJobSkillFrequency: roadmap.savedJobSkillFrequency,
      updatedAt: new Date(),
    };

    const roadmapId = existing?.id ?? roadmap.id;

    if (existing) {
      const oldPhases = await tx.select({ id: adaptiveRoadmapPhases.id }).from(adaptiveRoadmapPhases).where(eq(adaptiveRoadmapPhases.roadmapId, existing.id));
      if (oldPhases.length > 0) {
        await tx.delete(adaptiveRoadmapTasks).where(inArray(adaptiveRoadmapTasks.phaseId, oldPhases.map((p) => p.id)));
      }
      await tx.delete(adaptiveRoadmapPhases).where(eq(adaptiveRoadmapPhases.roadmapId, existing.id));
      await tx.update(adaptiveRoadmaps).set(values).where(eq(adaptiveRoadmaps.id, existing.id));
    } else {
      await tx.insert(adaptiveRoadmaps).values({ id: roadmapId, ...values, generatedAt: new Date(roadmap.generatedAt) });
    }

    const taskIdToSkillId = new Map(roadmap.phases.flatMap((p) => p.tasks).map((t) => [t.id, t.skillId]));

    for (let i = 0; i < roadmap.phases.length; i++) {
      const phase = roadmap.phases[i];
      const [phaseRow] = await tx.insert(adaptiveRoadmapPhases).values({ roadmapId, key: phase.key, title: phase.title, sortOrder: i }).returning();

      if (phase.tasks.length === 0) continue;
      await tx.insert(adaptiveRoadmapTasks).values(
        phase.tasks.map((t) => ({
          id: t.id,
          phaseId: phaseRow.id,
          skillId: t.skillId,
          skillName: t.skillName,
          title: t.title,
          reason: t.reason,
          estimatedHours: t.estimatedHours,
          prerequisiteSkillIds: t.prerequisiteTaskIds
            .map((taskId) => taskIdToSkillId.get(taskId))
            .filter((sid): sid is string => sid !== undefined),
          priorityScore: t.priorityScore,
          priorityTier: t.priorityTier,
          scheduledStartDate: t.scheduledStartDate,
          scheduledTargetDate: t.scheduledTargetDate,
          status: t.status,
          completionCriteria: t.completionCriteria,
          learningResource: t.learningResource,
          assessmentSkillForgeModuleId: t.assessmentSkillForgeModuleId,
          evidenceGoal: t.evidenceGoal,
          sourceGapTitle: t.sourceGapTitle,
          sourceJobRequirementLabels: t.sourceJobRequirementLabels,
          completedAt: t.completedAt ? new Date(t.completedAt) : null,
          createdAt: new Date(t.createdAt),
        })),
      );
    }

    if (newChangeEvent) {
      await tx.insert(adaptiveRoadmapChangeEvents).values({
        id: newChangeEvent.id,
        roadmapId,
        trigger: newChangeEvent.trigger,
        occurredAt: new Date(newChangeEvent.occurredAt),
        summary: newChangeEvent.summary,
        addedSkillIds: newChangeEvent.addedSkillIds,
        removedSkillIds: newChangeEvent.removedSkillIds,
        changedSkillIds: newChangeEvent.changedSkillIds,
      });
    }

    const existingHistoryRows = await tx.select({ skillId: adaptiveRoadmapCompletedHistory.skillId }).from(adaptiveRoadmapCompletedHistory).where(eq(adaptiveRoadmapCompletedHistory.roadmapId, roadmapId));
    const existingHistorySkillIds = new Set(existingHistoryRows.map((r) => r.skillId));
    const newHistoryEntries = roadmap.completedHistory.filter((h) => !existingHistorySkillIds.has(h.skillId));
    if (newHistoryEntries.length > 0) {
      await tx.insert(adaptiveRoadmapCompletedHistory).values(
        newHistoryEntries.map((h) => ({ roadmapId, skillId: h.skillId, title: h.title, completedAt: new Date(h.completedAt), estimatedHours: h.estimatedHours })),
      );
    }

    const result = await loadFullRoadmap(tx, roadmapId, userId);
    if (!result) throw new Error("Failed to load adaptive roadmap immediately after saving it.");
    return result;
  });
}

/**
 * Direct task-status update without a full regenerate — used for
 * mark-complete/mark-skip (`app/api/roadmap/adaptive/tasks/[taskId]/route.ts`).
 * On a transition to `completed`, appends a `completedHistory` row if this
 * skill isn't already recorded there.
 */
export async function updateTaskStatus(userId: string, taskId: string, status: AdaptiveTaskStatus): Promise<AdaptiveTask | null> {
  return withUserContext(userId, async (tx) => {
    const [taskRow] = await tx.select().from(adaptiveRoadmapTasks).where(eq(adaptiveRoadmapTasks.id, taskId)).limit(1);
    if (!taskRow) return null;

    const completedAt = status === "completed" ? new Date() : null;
    const [updated] = await tx.update(adaptiveRoadmapTasks).set({ status, completedAt }).where(eq(adaptiveRoadmapTasks.id, taskId)).returning();

    if (status === "completed") {
      const [phaseRow] = await tx.select({ roadmapId: adaptiveRoadmapPhases.roadmapId }).from(adaptiveRoadmapPhases).where(eq(adaptiveRoadmapPhases.id, updated.phaseId)).limit(1);
      if (phaseRow) {
        const historyRows = await tx
          .select({ skillId: adaptiveRoadmapCompletedHistory.skillId })
          .from(adaptiveRoadmapCompletedHistory)
          .where(eq(adaptiveRoadmapCompletedHistory.roadmapId, phaseRow.roadmapId));
        const alreadyRecorded = historyRows.some((r) => r.skillId === updated.skillId);
        if (!alreadyRecorded) {
          await tx.insert(adaptiveRoadmapCompletedHistory).values({
            roadmapId: phaseRow.roadmapId,
            skillId: updated.skillId,
            title: updated.title,
            completedAt: completedAt ?? new Date(),
            estimatedHours: updated.estimatedHours,
          });
        }
      }
    }

    const allTaskRows = await tx.select().from(adaptiveRoadmapTasks).where(eq(adaptiveRoadmapTasks.phaseId, updated.phaseId));
    const skillIdToTaskId = new Map(allTaskRows.map((t) => [t.skillId, t.id]));
    return rowToTask(updated, skillIdToTaskId);
  });
}

export async function deleteAdaptiveRoadmap(userId: string): Promise<void> {
  await withUserContext(userId, async (tx) => {
    const [profileRow] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profileRow) return;
    await tx.delete(adaptiveRoadmaps).where(eq(adaptiveRoadmaps.profileId, profileRow.id));
  });
}
