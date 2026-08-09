import { describe, expect, it } from "vitest";
import type { AdaptiveTask } from "@/types/adaptive-roadmap";
import { scheduleTasks } from "@/lib/roadmap/scheduler";

let counter = 0;
function task(overrides: Partial<AdaptiveTask> = {}): AdaptiveTask {
  counter += 1;
  return {
    id: overrides.id ?? `task-${counter}`,
    skillId: overrides.skillId ?? `skill-${counter}`,
    skillName: overrides.skillName ?? `Skill ${counter}`,
    title: "Learn it",
    reason: "Because.",
    estimatedHours: 10,
    prerequisiteTaskIds: [],
    priorityScore: 50,
    priorityTier: "medium",
    scheduledStartDate: null,
    scheduledTargetDate: null,
    status: "not-started",
    completionCriteria: [],
    learningResource: null,
    assessmentSkillForgeModuleId: null,
    evidenceGoal: null,
    sourceGapTitle: null,
    sourceJobRequirementLabels: [],
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const START = new Date("2027-01-04T00:00:00.000Z"); // a Monday

describe("scheduleTasks", () => {
  it("returns zero-required-weeks for an empty task list", () => {
    const { scheduledTasks, feasibility } = scheduleTasks([], 10, null, START);
    expect(scheduledTasks).toEqual([]);
    expect(feasibility.requiredWeeks).toBe(0);
    expect(feasibility.feasible).toBe(true);
  });

  it("schedules a single task within its own week when it fits", () => {
    const { scheduledTasks, feasibility } = scheduleTasks([task({ estimatedHours: 4 })], 10, null, START);
    expect(feasibility.requiredWeeks).toBe(1);
    expect(scheduledTasks[0].scheduledStartDate).toBe("2027-01-04");
  });

  it("never exceeds weekly capacity — splits a task across weeks if needed", () => {
    const { feasibility } = scheduleTasks([task({ estimatedHours: 25 })], 10, null, START);
    // 25 hours at 10 hrs/week needs 3 weeks (10 + 10 + 5)
    expect(feasibility.requiredWeeks).toBe(3);
  });

  it("respects prerequisites — a task never starts before its prerequisite's week finishes", () => {
    const prereq = task({ id: "p", skillId: "sql", estimatedHours: 10 });
    const dependent = task({ id: "d", skillId: "postgres", estimatedHours: 10, prerequisiteTaskIds: ["p"] });
    const { scheduledTasks } = scheduleTasks([dependent, prereq], 10, null, START);
    const p = scheduledTasks.find((t) => t.id === "p")!;
    const d = scheduledTasks.find((t) => t.id === "d")!;
    expect(new Date(d.scheduledStartDate!).getTime()).toBeGreaterThanOrEqual(new Date(p.scheduledTargetDate!).getTime());
  });

  it("schedules higher-priority independent work in earlier weeks", () => {
    const low = task({ id: "low", priorityScore: 10, estimatedHours: 10 });
    const high = task({ id: "high", priorityScore: 90, estimatedHours: 10 });
    const { scheduledTasks } = scheduleTasks([low, high], 10, null, START);
    const lowSched = scheduledTasks.find((t) => t.id === "low")!;
    const highSched = scheduledTasks.find((t) => t.id === "high")!;
    expect(new Date(highSched.scheduledStartDate!).getTime()).toBeLessThanOrEqual(new Date(lowSched.scheduledStartDate!).getTime());
  });

  it("never reschedules completed or skipped tasks and they don't consume future capacity", () => {
    const completed = task({ id: "c", status: "completed", estimatedHours: 100, scheduledStartDate: "2020-01-01", scheduledTargetDate: "2020-01-07" });
    const activeTask = task({ id: "a", estimatedHours: 5 });
    const { scheduledTasks, feasibility } = scheduleTasks([completed, activeTask], 10, null, START);
    const c = scheduledTasks.find((t) => t.id === "c")!;
    expect(c.scheduledStartDate).toBe("2020-01-01");
    expect(feasibility.requiredWeeks).toBe(1);
    expect(feasibility.totalRemainingHours).toBe(5);
  });

  it("defaults weekly hours and flags it as assumed when null or zero", () => {
    const nullResult = scheduleTasks([task({ estimatedHours: 5 })], null, null, START);
    expect(nullResult.feasibility.isAssumedAvailability).toBe(true);
    expect(nullResult.feasibility.weeklyHoursAvailable).toBeGreaterThan(0);

    const zeroResult = scheduleTasks([task({ estimatedHours: 5 })], 0, null, START);
    expect(zeroResult.feasibility.isAssumedAvailability).toBe(true);
  });

  it("detects an impossible deadline and explains it in the documented format", () => {
    // 40 hours of work at 4 hrs/week is 10 weeks, but the target date is ~4 weeks away.
    const tasks = [task({ estimatedHours: 40 })];
    const targetDate = new Date(START.getTime() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { feasibility } = scheduleTasks(tasks, 4, targetDate, START);

    expect(feasibility.feasible).toBe(false);
    expect(feasibility.requiredWeeks).toBe(10);
    expect(feasibility.availableWeeks).toBe(4);
    expect(feasibility.message).toContain("At 4 hours/week");
    expect(feasibility.message).toContain("requires approximately 10 weeks");
    expect(feasibility.message).toContain("4 weeks away");
    expect(feasibility.recommendations.length).toBeGreaterThan(0);
    expect(feasibility.recommendations.some((r) => r.includes("hours/week"))).toBe(true);
  });

  it("recommends increasing weekly hours to a value that would actually make the deadline feasible", () => {
    const tasks = [task({ estimatedHours: 40 })];
    const targetDate = new Date(START.getTime() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { feasibility } = scheduleTasks(tasks, 4, targetDate, START);
    // 40 hours / 4 weeks = 10 hrs/week needed.
    expect(feasibility.recommendations.some((r) => r.includes("10 hours/week"))).toBe(true);
  });

  it("is feasible (not flagged) when the deadline comfortably fits", () => {
    const tasks = [task({ estimatedHours: 10 })];
    const targetDate = new Date(START.getTime() + 10 * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { feasibility } = scheduleTasks(tasks, 10, targetDate, START);
    expect(feasibility.feasible).toBe(true);
    expect(feasibility.recommendations).toEqual([]);
  });

  it("is deterministic across repeated calls with identical input", () => {
    const tasks = [task({ id: "a", priorityScore: 20 }), task({ id: "b", priorityScore: 80 }), task({ id: "c", priorityScore: 50 })];
    const first = scheduleTasks(tasks, 8, null, START);
    const second = scheduleTasks(tasks, 8, null, START);
    expect(first.scheduledTasks.map((t) => [t.id, t.scheduledStartDate])).toEqual(
      second.scheduledTasks.map((t) => [t.id, t.scheduledStartDate]),
    );
  });
});
