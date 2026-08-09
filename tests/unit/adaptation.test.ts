import { describe, expect, it } from "vitest";
import { createEmptyProfile, type StudentProfile } from "@/types/profile";
import { resolveCareers } from "@/types/career";
import { CAREERS } from "@/data/careers";
import { analyzeGaps } from "@/lib/gap-analysis/engine";
import { profileToRoadmapRequest } from "@/lib/roadmap/profile-to-request";
import { recomputeAdaptiveRoadmap } from "@/lib/roadmap/adaptation";
import type { AdaptiveRoadmapInput } from "@/lib/roadmap/adaptive-input";
import type { AdaptiveRoadmap, AdaptiveTask } from "@/types/adaptive-roadmap";

function buildInput(profileOverrides: Partial<StudentProfile> = {}, rest: Partial<AdaptiveRoadmapInput> = {}): AdaptiveRoadmapInput {
  const profile: StudentProfile = { ...createEmptyProfile("Test Student"), targetCareers: ["Backend Engineer"], weeklyHoursAvailable: 10, ...profileOverrides };
  const resolvedCareers = resolveCareers(CAREERS, profile.targetCareers);
  const gapAnalysis = analyzeGaps(profileToRoadmapRequest(profile), resolvedCareers);
  return {
    userId: "user-1",
    profile,
    resolvedCareers,
    gapAnalysis,
    savedJobs: [],
    skillForgeProgress: {},
    confidenceContext: { profile, skillForgeModules: [], skillForgeProgress: {}, githubRepos: [], manualEvidence: [] },
    previous: null,
    ...rest,
  };
}

let counter = 0;
function taskFixture(overrides: Partial<AdaptiveTask> = {}): AdaptiveTask {
  counter += 1;
  return {
    id: overrides.id ?? `task-${counter}`,
    skillId: overrides.skillId ?? `skill-${counter}`,
    skillName: overrides.skillName ?? `Skill ${counter}`,
    title: "Learn it", reason: "Because.", estimatedHours: 10, prerequisiteTaskIds: [],
    priorityScore: 50, priorityTier: "medium", scheduledStartDate: null, scheduledTargetDate: null,
    status: "not-started", completionCriteria: [], learningResource: null, assessmentSkillForgeModuleId: null,
    evidenceGoal: null, sourceGapTitle: null, sourceJobRequirementLabels: [], completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("recomputeAdaptiveRoadmap", () => {
  it("produces a real roadmap with tasks on first generation, and emits no change event (nothing to diff against)", () => {
    const input = buildInput();
    const { roadmap, changeEvent } = recomputeAdaptiveRoadmap(null, input, "manual");
    expect(roadmap.phases.flatMap((p) => p.tasks).length).toBeGreaterThan(0);
    expect(changeEvent).toBeNull();
    expect(roadmap.changeEvents).toEqual([]);
  });

  it("preserves a completed task's status across a full regenerate", () => {
    const input = buildInput();
    const { roadmap: first } = recomputeAdaptiveRoadmap(null, input, "manual");
    const someTask = first.phases[0].tasks[0];

    const withCompletion: AdaptiveRoadmap = {
      ...first,
      phases: first.phases.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === someTask.id ? { ...t, status: "completed" as const, completedAt: "2027-01-01T00:00:00.000Z" } : t)),
      })),
    };

    const { roadmap: second } = recomputeAdaptiveRoadmap(withCompletion, input, "manual");
    const survived = second.phases.flatMap((p) => p.tasks).find((t) => t.skillId === someTask.skillId);
    expect(survived?.status).toBe("completed");
    expect(survived?.completedAt).toBe("2027-01-01T00:00:00.000Z");
  });

  it("moves a completed skill that drops out of scope into completedHistory instead of deleting it", () => {
    const input = buildInput();
    const fakeCompleted = taskFixture({ skillId: "totally-unrelated-skill-xyz", status: "completed", completedAt: "2027-01-01T00:00:00.000Z", estimatedHours: 12, title: "Learn Unrelated Skill" });
    const previous: AdaptiveRoadmap = {
      id: "r1", userId: "user-1", targetCareers: [], targetDate: null, weeklyHoursAvailable: null, readiness: 0,
      phases: [{ key: "foundations", title: "Foundations", tasks: [fakeCompleted] }],
      feasibility: { feasible: true, totalRemainingHours: 0, requiredWeeks: 0, availableWeeks: null, weeklyHoursAvailable: 5, isAssumedAvailability: true, message: "", recommendations: [] },
      savedJobSkillFrequency: [], changeEvents: [], completedHistory: [],
      generatedAt: "2027-01-01T00:00:00.000Z", updatedAt: "2027-01-01T00:00:00.000Z",
    };

    const { roadmap } = recomputeAdaptiveRoadmap(previous, input, "manual");
    expect(roadmap.phases.flatMap((p) => p.tasks).some((t) => t.skillId === "totally-unrelated-skill-xyz")).toBe(false);
    expect(roadmap.completedHistory).toContainEqual({ skillId: "totally-unrelated-skill-xyz", title: "Learn Unrelated Skill", completedAt: "2027-01-01T00:00:00.000Z", estimatedHours: 12 });
  });

  it("does not duplicate a completedHistory entry that's already recorded", () => {
    const input = buildInput();
    const alreadyRecorded = { skillId: "totally-unrelated-skill-xyz", title: "Learn Unrelated Skill", completedAt: "2027-01-01T00:00:00.000Z", estimatedHours: 12 };
    const fakeCompleted = taskFixture({ skillId: "totally-unrelated-skill-xyz", status: "completed", completedAt: "2027-01-01T00:00:00.000Z" });
    const previous: AdaptiveRoadmap = {
      id: "r1", userId: "user-1", targetCareers: [], targetDate: null, weeklyHoursAvailable: null, readiness: 0,
      phases: [{ key: "foundations", title: "Foundations", tasks: [fakeCompleted] }],
      feasibility: { feasible: true, totalRemainingHours: 0, requiredWeeks: 0, availableWeeks: null, weeklyHoursAvailable: 5, isAssumedAvailability: true, message: "", recommendations: [] },
      savedJobSkillFrequency: [], changeEvents: [], completedHistory: [alreadyRecorded],
      generatedAt: "2027-01-01T00:00:00.000Z", updatedAt: "2027-01-01T00:00:00.000Z",
    };

    const { roadmap } = recomputeAdaptiveRoadmap(previous, input, "manual");
    expect(roadmap.completedHistory.filter((h) => h.skillId === "totally-unrelated-skill-xyz")).toHaveLength(1);
  });

  it("detects added skills and produces a summary naming the trigger", () => {
    const input = buildInput();
    const { roadmap: first } = recomputeAdaptiveRoadmap(null, input, "manual");
    const allFirstTasks = first.phases.flatMap((p) => p.tasks);
    const shrunk: AdaptiveRoadmap = { ...first, phases: [{ key: "foundations", title: "Foundations", tasks: allFirstTasks.slice(0, 1) }] };

    const { changeEvent } = recomputeAdaptiveRoadmap(shrunk, input, "assessment-passed");
    expect(changeEvent).not.toBeNull();
    expect(changeEvent!.addedSkillIds.length).toBeGreaterThan(0);
    expect(changeEvent!.summary).toContain("you passed a SkillForge assessment");
  });

  it("detects a changed priority tier between recomputes", () => {
    const input = buildInput();
    const { roadmap: first } = recomputeAdaptiveRoadmap(null, input, "manual");
    const allFirstTasks = first.phases.flatMap((p) => p.tasks);
    const target = allFirstTasks[0];
    const mutated = { ...target, priorityTier: target.priorityTier === "critical" ? ("low" as const) : ("critical" as const) };
    const mutatedRoadmap: AdaptiveRoadmap = { ...first, phases: [{ key: "foundations", title: "Foundations", tasks: [mutated, ...allFirstTasks.slice(1)] }] };

    const { changeEvent } = recomputeAdaptiveRoadmap(mutatedRoadmap, input, "manual");
    expect(changeEvent?.changedSkillIds).toContain(target.skillId);
  });

  it("emits no change event when nothing actually changed between recomputes", () => {
    const input = buildInput();
    const { roadmap: first } = recomputeAdaptiveRoadmap(null, input, "manual");
    const { changeEvent } = recomputeAdaptiveRoadmap(first, input, "manual");
    expect(changeEvent).toBeNull();
  });

  it("never throws for a profile with no target careers and no signals at all", () => {
    const input = buildInput({ targetCareers: [] });
    expect(() => recomputeAdaptiveRoadmap(null, input, "manual")).not.toThrow();
  });
});
