import type { AdaptiveTask, ScheduleFeasibility } from "@/types/adaptive-roadmap";

/**
 * Deterministic weekly scheduler for the adaptive roadmap engine. Never asks
 * an LLM to produce calendar dates (task-brief section 4/7) — every date is
 * computed from real weekly capacity, task effort, and dependency order.
 *
 * `completed`/`skipped` tasks are frozen (their existing dates are kept,
 * they consume no future capacity); `not-started`/`in-progress` tasks are
 * topologically ordered by `prerequisiteTaskIds` (ties broken by priority
 * score, then skill id, for full determinism) and greedily bin-packed into
 * weekly buckets starting at `startDate`, splitting a task across weeks
 * when it doesn't fit the remaining weekly capacity.
 */

const DEFAULT_WEEKLY_HOURS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

function topologicallyOrderTasks(tasks: AdaptiveTask[]): AdaptiveTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const dependents = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const task of tasks) {
    const prereqsInScope = task.prerequisiteTaskIds.filter((id) => byId.has(id));
    inDegree.set(task.id, prereqsInScope.length);
    for (const prereqId of prereqsInScope) {
      const list = dependents.get(prereqId) ?? [];
      list.push(task.id);
      dependents.set(prereqId, list);
    }
  }

  const sortByPriority = (list: AdaptiveTask[]) =>
    list.sort((a, b) => b.priorityScore - a.priorityScore || a.skillId.localeCompare(b.skillId));

  const ready = sortByPriority(tasks.filter((t) => inDegree.get(t.id) === 0));
  const result: AdaptiveTask[] = [];

  while (ready.length > 0) {
    sortByPriority(ready);
    const task = ready.shift()!;
    result.push(task);
    for (const dependentId of dependents.get(task.id) ?? []) {
      const remaining = (inDegree.get(dependentId) ?? 0) - 1;
      inDegree.set(dependentId, remaining);
      if (remaining === 0) ready.push(byId.get(dependentId)!);
    }
  }

  // Defensive only: task prerequisites mirror the (validated, acyclic) skill
  // graph, so this should never trigger — but never silently drop a task.
  if (result.length < tasks.length) {
    const placed = new Set(result.map((t) => t.id));
    for (const task of tasks) if (!placed.has(task.id)) result.push(task);
  }

  return result;
}

export function scheduleTasks(
  tasks: AdaptiveTask[],
  weeklyHoursAvailable: number | null,
  targetDate: string | null,
  startDate: Date = new Date(),
): { scheduledTasks: AdaptiveTask[]; feasibility: ScheduleFeasibility } {
  const isAssumedAvailability = !weeklyHoursAvailable || weeklyHoursAvailable <= 0;
  const weekly = isAssumedAvailability ? DEFAULT_WEEKLY_HOURS : weeklyHoursAvailable;

  const frozen = tasks.filter((t) => t.status === "completed" || t.status === "skipped");
  const active = topologicallyOrderTasks(tasks.filter((t) => t.status === "not-started" || t.status === "in-progress"));

  const totalRemainingHours = active.reduce((sum, t) => sum + t.estimatedHours, 0);

  let currentWeek = 0;
  let hoursUsedInCurrentWeek = 0;
  let anyHoursScheduled = false;
  const scheduledActive: AdaptiveTask[] = [];

  for (const task of active) {
    let hoursRemaining = task.estimatedHours;
    let startWeek: number | null = null;

    while (hoursRemaining > 0) {
      const capacityLeft = weekly - hoursUsedInCurrentWeek;
      if (capacityLeft <= 0) {
        currentWeek += 1;
        hoursUsedInCurrentWeek = 0;
        continue;
      }
      if (startWeek === null) startWeek = currentWeek;
      const consume = Math.min(capacityLeft, hoursRemaining);
      hoursUsedInCurrentWeek += consume;
      hoursRemaining -= consume;
      anyHoursScheduled = true;
    }

    scheduledActive.push({
      ...task,
      scheduledStartDate: toDateOnly(addDays(startDate, (startWeek ?? currentWeek) * 7)),
      scheduledTargetDate: toDateOnly(addDays(startDate, currentWeek * 7 + 6)),
    });
  }

  const requiredWeeks = anyHoursScheduled ? currentWeek + 1 : 0;

  let availableWeeks: number | null = null;
  if (targetDate) {
    const targetMs = new Date(`${targetDate}T00:00:00.000Z`).getTime();
    const startMs = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    availableWeeks = Math.max(0, Math.round((targetMs - startMs) / MS_PER_WEEK));
  }

  const feasible = availableWeeks === null || requiredWeeks <= availableWeeks;

  let message: string;
  const recommendations: string[] = [];

  if (requiredWeeks === 0) {
    message = "Nothing left to schedule — every task is complete or skipped.";
  } else if (feasible) {
    message =
      availableWeeks === null
        ? `At ${weekly} hour${weekly === 1 ? "" : "s"}/week, this roadmap requires approximately ${requiredWeeks} week${requiredWeeks === 1 ? "" : "s"}.`
        : `At ${weekly} hour${weekly === 1 ? "" : "s"}/week, this roadmap requires approximately ${requiredWeeks} week${requiredWeeks === 1 ? "" : "s"}, comfortably within your ${availableWeeks}-week timeline.`;
  } else {
    message = `At ${weekly} hour${weekly === 1 ? "" : "s"}/week, the current roadmap requires approximately ${requiredWeeks} weeks but your target date is ${availableWeeks} weeks away.`;

    const neededWeeklyHours = availableWeeks && availableWeeks > 0 ? Math.ceil(totalRemainingHours / availableWeeks) : null;
    if (neededWeeklyHours && neededWeeklyHours > weekly) {
      recommendations.push(`Increase your weekly hours to about ${neededWeeklyHours} hours/week to hit your target date.`);
    }

    const extendedTargetDate = toDateOnly(addDays(startDate, requiredWeeks * 7));
    recommendations.push(`Extend your target date to around ${extendedTargetDate} to keep ${weekly} hours/week.`);

    if (availableWeeks !== null) {
      const capacityInWindow = availableWeeks * weekly;
      const hoursToCut = totalRemainingHours - capacityInWindow;
      if (hoursToCut > 0) {
        const droppable = [...active].sort((a, b) => a.priorityScore - b.priorityScore);
        const toDrop: AdaptiveTask[] = [];
        let cut = 0;
        for (const task of droppable) {
          if (cut >= hoursToCut) break;
          toDrop.push(task);
          cut += task.estimatedHours;
        }
        if (toDrop.length > 0) {
          const names = toDrop.slice(0, 3).map((t) => t.skillName).join(", ");
          recommendations.push(`Reduce scope by deprioritizing ${toDrop.length} lower-priority task${toDrop.length === 1 ? "" : "s"} (e.g. ${names}) to fit your timeline.`);
        }
      }
    }
  }

  return {
    scheduledTasks: [...frozen, ...scheduledActive],
    feasibility: {
      feasible,
      totalRemainingHours,
      requiredWeeks,
      availableWeeks,
      weeklyHoursAvailable: weekly,
      isAssumedAvailability,
      message,
      recommendations,
    },
  };
}
