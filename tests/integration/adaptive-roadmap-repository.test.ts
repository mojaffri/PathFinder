import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, insertAuthUser, closeTestDb, type TestDb } from "./db";
import { getAdaptiveRoadmap, saveAdaptiveRoadmap, updateTaskStatus } from "@/repositories/adaptive-roadmap-repository";
import type { AdaptiveRoadmap, AdaptiveTask } from "@/types";

const USER_ID = "88888888-8888-4888-8888-888888888888";

let taskCounter = 0;
function taskFixture(overrides: Partial<AdaptiveTask> = {}): AdaptiveTask {
  taskCounter += 1;
  return {
    id: overrides.id ?? crypto.randomUUID(),
    skillId: overrides.skillId ?? `skill-${taskCounter}`,
    skillName: overrides.skillName ?? `Skill ${taskCounter}`,
    title: "Learn it", reason: "Because.", estimatedHours: 10, prerequisiteTaskIds: [],
    priorityScore: 50, priorityTier: "medium", scheduledStartDate: "2027-01-04", scheduledTargetDate: "2027-01-10",
    status: "not-started", completionCriteria: ["Do the thing"], learningResource: { title: "A resource", url: "https://example.com" },
    assessmentSkillForgeModuleId: null, evidenceGoal: "A project", sourceGapTitle: null, sourceJobRequirementLabels: [],
    completedAt: null, createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function roadmapFixture(tasks: AdaptiveTask[]): AdaptiveRoadmap {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), userId: USER_ID, targetCareers: ["Software Engineer"], targetDate: null,
    weeklyHoursAvailable: 10, readiness: 0,
    phases: [{ key: "foundations", title: "Foundations", tasks }],
    feasibility: { feasible: true, totalRemainingHours: 30, requiredWeeks: 3, availableWeeks: null, weeklyHoursAvailable: 10, isAssumedAvailability: false, message: "", recommendations: [] },
    savedJobSkillFrequency: [{ skill: "SQL", count: 2, percentage: 100, savedJobCount: 2 }],
    changeEvents: [], completedHistory: [], generatedAt: now, updatedAt: now,
  };
}

describe("adaptive-roadmap-repository", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
    await insertAuthUser(testDb, USER_ID, "adaptive@example.com");
  });

  afterAll(async () => {
    await closeTestDb(testDb);
  });

  it("returns null when no adaptive roadmap has been saved yet", async () => {
    expect(await getAdaptiveRoadmap(USER_ID)).toBeNull();
  });

  it("saves and round-trips a roadmap including prerequisite task ids and saved-job frequency", async () => {
    const prereq = taskFixture({ skillId: "sql" });
    const dependent = taskFixture({ skillId: "postgresql", prerequisiteTaskIds: [prereq.id] });
    const saved = await saveAdaptiveRoadmap(USER_ID, roadmapFixture([prereq, dependent]), null);

    expect(saved.phases[0].tasks).toHaveLength(2);
    const loaded = await getAdaptiveRoadmap(USER_ID);
    expect(loaded).not.toBeNull();
    expect(loaded!.savedJobSkillFrequency).toEqual([{ skill: "SQL", count: 2, percentage: 100, savedJobCount: 2 }]);

    const loadedDependent = loaded!.phases[0].tasks.find((t) => t.skillId === "postgresql")!;
    const loadedPrereq = loaded!.phases[0].tasks.find((t) => t.skillId === "sql")!;
    // prerequisiteTaskIds are resolved back to the (re-generated) sibling task id via skillId, not the original submitted id.
    expect(loadedDependent.prerequisiteTaskIds).toEqual([loadedPrereq.id]);
  });

  it("enforces one adaptive roadmap per profile — a second save overwrites phases/tasks rather than creating a second row", async () => {
    const first = await saveAdaptiveRoadmap(USER_ID, roadmapFixture([taskFixture({ skillId: "javascript" })]), null);
    const second = await saveAdaptiveRoadmap(USER_ID, roadmapFixture([taskFixture({ skillId: "typescript" })]), null);

    expect(second.id).toBe(first.id);
    const loaded = await getAdaptiveRoadmap(USER_ID);
    expect(loaded!.phases[0].tasks.map((t) => t.skillId)).toEqual(["typescript"]);
  });

  it("appends a change event without duplicating or losing prior ones across saves", async () => {
    const roadmap = roadmapFixture([taskFixture({ skillId: "docker" })]);
    const event = { id: crypto.randomUUID(), trigger: "manual" as const, occurredAt: new Date().toISOString(), summary: "First change.", addedSkillIds: ["docker"], removedSkillIds: [], changedSkillIds: [] };
    await saveAdaptiveRoadmap(USER_ID, roadmap, event);

    const afterFirst = await getAdaptiveRoadmap(USER_ID);
    expect(afterFirst!.changeEvents).toHaveLength(1);

    const secondEvent = { id: crypto.randomUUID(), trigger: "job-analyzed" as const, occurredAt: new Date().toISOString(), summary: "Second change.", addedSkillIds: [], removedSkillIds: ["docker"], changedSkillIds: [] };
    await saveAdaptiveRoadmap(USER_ID, roadmapFixture([taskFixture({ skillId: "cicd" })]), secondEvent);

    const afterSecond = await getAdaptiveRoadmap(USER_ID);
    expect(afterSecond!.changeEvents).toHaveLength(2);
    expect(afterSecond!.changeEvents.map((e) => e.summary)).toEqual(["First change.", "Second change."]);
  });

  it("marking a task complete via updateTaskStatus records it in completedHistory, and a later regenerate that drops the skill doesn't lose the history", async () => {
    const task = taskFixture({ skillId: "react" });
    await saveAdaptiveRoadmap(USER_ID, roadmapFixture([task]), null);

    const updated = await updateTaskStatus(USER_ID, task.id, "completed");
    expect(updated?.status).toBe("completed");
    expect(updated?.completedAt).not.toBeNull();

    const afterCompletion = await getAdaptiveRoadmap(USER_ID);
    expect(afterCompletion!.completedHistory.some((h) => h.skillId === "react")).toBe(true);

    // Regenerate with a roadmap that no longer includes "react" at all —
    // completedHistory must still contain it (append-only, never rewritten).
    await saveAdaptiveRoadmap(USER_ID, roadmapFixture([taskFixture({ skillId: "nextjs" })]), null);
    const afterRegenerate = await getAdaptiveRoadmap(USER_ID);
    expect(afterRegenerate!.completedHistory.some((h) => h.skillId === "react")).toBe(true);
    expect(afterRegenerate!.phases[0].tasks.some((t) => t.skillId === "react")).toBe(false);
  });

  it("updateTaskStatus returns null for an unknown task id instead of throwing", async () => {
    expect(await updateTaskStatus(USER_ID, crypto.randomUUID(), "completed")).toBeNull();
  });
});
