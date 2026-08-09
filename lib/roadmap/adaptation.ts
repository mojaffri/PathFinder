import type {
  AdaptiveRoadmap,
  AdaptiveTask,
  CompletedHistoryEntry,
  RoadmapChangeEvent,
  RoadmapChangeTrigger,
} from "@/types/adaptive-roadmap";
import { computeSavedJobSkillFrequency } from "./saved-job-signals";
import { buildSkillGraphIndex } from "./skill-graph";
import { generateAdaptiveTasks } from "./adaptive-generator";
import { groupTasksIntoPhases } from "./adaptive-phases";
import { scheduleTasks } from "./scheduler";
import type { AdaptiveRoadmapInput } from "./adaptive-input";

/**
 * The adaptation/recomputation layer — the only place that (a) merges a
 * freshly-generated task set with what the student already has in progress
 * so completed/skipped work is never silently lost, and (b) produces the
 * deterministic "what changed and why" summary. Never AI-authored: the
 * underlying facts (what was added/removed/changed) are all computed here;
 * an optional AI polish pass may only rephrase the resulting sentence later
 * (see `docs/roadmap-engine.md`), never recompute it.
 */

const TRIGGER_PHRASES: Record<RoadmapChangeTrigger, string> = {
  "assessment-passed": "you passed a SkillForge assessment",
  "assessment-failed": "you completed a SkillForge assessment attempt",
  "new-evidence": "new skill evidence was added",
  "new-github-project": "a new GitHub project was analyzed",
  "new-resume": "a new resume was uploaded",
  "target-role-changed": "your target role changed",
  "deadline-changed": "your target date changed",
  "weekly-hours-changed": "your weekly availability changed",
  "job-analyzed": "a new job was analyzed",
  manual: "you requested a recompute",
};

function allTasks(roadmap: AdaptiveRoadmap | null): AdaptiveTask[] {
  return roadmap?.phases.flatMap((p) => p.tasks) ?? [];
}

/**
 * Carries completed/in-progress/skipped status forward from the previous
 * roadmap's tasks onto the freshly-generated task set, matched by the
 * stable `skillId` (task ids are regenerated every run). Completed tasks
 * also keep their original schedule dates rather than being rescheduled.
 */
function mergeTaskStatus(freshTasks: AdaptiveTask[], previousTasks: AdaptiveTask[]): AdaptiveTask[] {
  const prevBySkillId = new Map(previousTasks.map((t) => [t.skillId, t]));
  return freshTasks.map((task) => {
    const prev = prevBySkillId.get(task.skillId);
    if (!prev || prev.status === "not-started") return task;
    return {
      ...task,
      status: prev.status,
      completedAt: prev.completedAt,
      createdAt: prev.createdAt,
      scheduledStartDate: prev.status === "completed" || prev.status === "skipped" ? prev.scheduledStartDate : task.scheduledStartDate,
      scheduledTargetDate: prev.status === "completed" || prev.status === "skipped" ? prev.scheduledTargetDate : task.scheduledTargetDate,
    };
  });
}

/** Append-only: previously-completed skills that drop out of the fresh working set are preserved here rather than silently disappearing. */
function mergeCompletedHistory(previous: AdaptiveRoadmap | null, previousTasks: AdaptiveTask[], nextTasks: AdaptiveTask[]): CompletedHistoryEntry[] {
  const carried = [...(previous?.completedHistory ?? [])];
  const alreadyRecorded = new Set(carried.map((h) => h.skillId));
  const nextSkillIds = new Set(nextTasks.map((t) => t.skillId));

  for (const task of previousTasks) {
    if (task.status !== "completed") continue;
    if (nextSkillIds.has(task.skillId)) continue;
    if (alreadyRecorded.has(task.skillId)) continue;
    carried.push({
      skillId: task.skillId,
      title: task.title,
      completedAt: task.completedAt ?? new Date().toISOString(),
      estimatedHours: task.estimatedHours,
    });
    alreadyRecorded.add(task.skillId);
  }

  return carried;
}

function computeReadiness(tasks: AdaptiveTask[]): number {
  if (tasks.length === 0) return 100;
  const completed = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
}

function buildChangeSummary(
  trigger: RoadmapChangeTrigger,
  added: string[],
  removed: string[],
  changed: string[],
  nextBySkillId: Map<string, AdaptiveTask>,
  prevBySkillId: Map<string, AdaptiveTask>,
): string {
  const parts: string[] = [];

  if (removed.length > 0) {
    const names = removed.map((id) => prevBySkillId.get(id)?.title ?? id).slice(0, 2).join(", ");
    parts.push(`the ${names} task${removed.length === 1 ? " was" : "s were"} removed`);
  }
  if (added.length > 0) {
    const names = added.map((id) => nextBySkillId.get(id)?.title ?? id).slice(0, 2).join(", ");
    parts.push(`${names} ${added.length === 1 ? "was" : "were"} added`);
  }
  if (changed.length > 0) {
    parts.push(`${changed.length} task${changed.length === 1 ? "" : "s"} shifted priority`);
  }

  const body = parts.length > 0 ? parts.join("; ") : "your plan was recalculated";

  const nextPriority = [...nextBySkillId.values()]
    .filter((t) => t.status === "not-started")
    .sort((a, b) => b.priorityScore - a.priorityScore)[0];
  const nextPriorityPhrase = nextPriority ? ` Your next priority is ${nextPriority.skillName}.` : "";

  return `Your roadmap changed because ${TRIGGER_PHRASES[trigger]} — ${body}.${nextPriorityPhrase}`;
}

export function recomputeAdaptiveRoadmap(
  previous: AdaptiveRoadmap | null,
  input: AdaptiveRoadmapInput,
  trigger: RoadmapChangeTrigger,
): { roadmap: AdaptiveRoadmap; changeEvent: RoadmapChangeEvent | null } {
  const now = new Date().toISOString();
  const savedJobSkillFrequency = computeSavedJobSkillFrequency(input.savedJobs);
  const index = buildSkillGraphIndex();

  const freshTasks = generateAdaptiveTasks(input, savedJobSkillFrequency, index);
  const previousTasks = allTasks(previous);
  const mergedTasks = mergeTaskStatus(freshTasks, previousTasks);
  const completedHistory = mergeCompletedHistory(previous, previousTasks, mergedTasks);

  const { scheduledTasks, feasibility } = scheduleTasks(mergedTasks, input.profile.weeklyHoursAvailable, input.profile.targetDate);
  const phases = groupTasksIntoPhases(scheduledTasks, index);

  const prevBySkillId = new Map(previousTasks.map((t) => [t.skillId, t]));
  const nextBySkillId = new Map(scheduledTasks.map((t) => [t.skillId, t]));
  const prevSkillIds = new Set(prevBySkillId.keys());
  const nextSkillIds = new Set(nextBySkillId.keys());

  const addedSkillIds = [...nextSkillIds].filter((id) => !prevSkillIds.has(id));
  const removedSkillIds = [...prevSkillIds].filter((id) => !nextSkillIds.has(id));
  const changedSkillIds = [...nextSkillIds]
    .filter((id) => prevSkillIds.has(id))
    .filter((id) => {
      const p = prevBySkillId.get(id)!;
      const n = nextBySkillId.get(id)!;
      return p.priorityTier !== n.priorityTier || p.status !== n.status;
    });

  const hasChanges = addedSkillIds.length > 0 || removedSkillIds.length > 0 || changedSkillIds.length > 0;
  const changeEvent: RoadmapChangeEvent | null =
    previous && hasChanges
      ? {
          id: crypto.randomUUID(),
          trigger,
          occurredAt: now,
          summary: buildChangeSummary(trigger, addedSkillIds, removedSkillIds, changedSkillIds, nextBySkillId, prevBySkillId),
          addedSkillIds,
          removedSkillIds,
          changedSkillIds,
        }
      : null;

  const roadmap: AdaptiveRoadmap = {
    id: previous?.id ?? crypto.randomUUID(),
    userId: input.userId,
    targetCareers: input.profile.targetCareers,
    targetDate: input.profile.targetDate,
    weeklyHoursAvailable: input.profile.weeklyHoursAvailable,
    readiness: computeReadiness(scheduledTasks),
    phases,
    feasibility,
    savedJobSkillFrequency,
    changeEvents: [...(previous?.changeEvents ?? []), ...(changeEvent ? [changeEvent] : [])],
    completedHistory,
    generatedAt: previous?.generatedAt ?? now,
    updatedAt: now,
  };

  return { roadmap, changeEvent };
}
