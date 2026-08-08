import { describe, expect, it } from "vitest";
import { computeConfidence, computeMasteryLevel, evidenceStrengthFromScore, freshProgress, overallMasteryScore, recomputeMastery } from "@/lib/skillforge/mastery";
import type { MasteryDimensionScores, SkillModule } from "@/types";

function minimalModule(overrides: Partial<SkillModule> = {}): SkillModule {
  return {
    id: "m1",
    name: "Test Skill",
    category: "software-tech",
    description: "",
    targetCareerIds: [],
    prerequisites: [],
    priority: "high",
    roadmapPhaseKey: null,
    relatedGapKeywords: [],
    whyItMatters: "",
    estimatedHours: 10,
    concepts: [],
    learnOverview: { explanation: "", objectives: [], keyConcepts: [], examples: [], commonMistakes: [], estimatedMinutes: 30 },
    learningResources: [
      { id: "r1", title: "R1", type: "article", estimatedMinutes: 10, depth: "core" },
      { id: "r2", title: "R2", type: "article", estimatedMinutes: 10, depth: "core" },
    ],
    practiceExercises: [{ id: "e1", title: "E1", description: "", estimatedMinutes: 10, difficulty: "core" }],
    projectChallenges: [],
    diagnostic: { id: "d1", instructions: "", prompts: [] },
    assessment: { id: "a1", type: "self-rating", description: "", passingCriteria: "", questions: [] },
    interviewRelevance: "",
    masteryRequirements: {
      exposure: "",
      familiar: "",
      working: "",
      proficient: "",
      "interview-ready": "",
      "resume-ready": "",
    },
    ...overrides,
  };
}

describe("computeMasteryLevel", () => {
  it("returns exposure for an all-zero (empty) profile", () => {
    const dims: MasteryDimensionScores = { knowledge: 0, ability: 0, evidence: 0, interview: 0 };
    expect(computeMasteryLevel(dims)).toBe("exposure");
  });

  it("requires all four dimensions to clear the bar for resume-ready, not just one", () => {
    const strongKnowledgeOnly: MasteryDimensionScores = { knowledge: 100, ability: 0, evidence: 0, interview: 0 };
    expect(computeMasteryLevel(strongKnowledgeOnly)).not.toBe("resume-ready");

    const allStrong: MasteryDimensionScores = { knowledge: 80, ability: 80, evidence: 60, interview: 80 };
    expect(computeMasteryLevel(allStrong)).toBe("resume-ready");
  });

  it("is monotonic at the documented interview-ready boundary", () => {
    const justBelow: MasteryDimensionScores = { knowledge: 60, ability: 60, evidence: 0, interview: 54 };
    const justAt: MasteryDimensionScores = { knowledge: 60, ability: 60, evidence: 0, interview: 55 };
    expect(computeMasteryLevel(justBelow)).not.toBe("interview-ready");
    expect(computeMasteryLevel(justAt)).toBe("interview-ready");
  });
});

describe("computeConfidence", () => {
  it("is low with zero or one evaluated attempts, never assumes certainty from a single data point", () => {
    expect(computeConfidence(0)).toBe("low");
    expect(computeConfidence(1)).toBe("low");
  });

  it("only reaches high after a consistent track record (3+ attempts)", () => {
    expect(computeConfidence(2)).toBe("medium");
    expect(computeConfidence(3)).toBe("high");
    expect(computeConfidence(10)).toBe("high");
  });
});

describe("evidenceStrengthFromScore / overallMasteryScore", () => {
  it("never produces a score outside 0-100 for in-range inputs", () => {
    expect(overallMasteryScore({ knowledge: 0, ability: 0, evidence: 0, interview: 0 })).toBe(0);
    expect(overallMasteryScore({ knowledge: 100, ability: 100, evidence: 100, interview: 100 })).toBe(100);
  });

  it("maps scores to labels at the documented thresholds", () => {
    expect(evidenceStrengthFromScore(0)).toBe("none");
    expect(evidenceStrengthFromScore(14)).toBe("none");
    expect(evidenceStrengthFromScore(15)).toBe("weak");
    expect(evidenceStrengthFromScore(45)).toBe("moderate");
    expect(evidenceStrengthFromScore(75)).toBe("strong");
  });
});

describe("recomputeMastery — 'no fake progress' invariant", () => {
  it("caps knowledge/ability at a low ceiling from completion alone, with zero evidence", () => {
    const skillModule = minimalModule();
    const progress = freshProgress(skillModule.id);
    const allChecked = recomputeMastery(
      { ...progress, completedResourceIds: ["r1", "r2"], completedExerciseIds: ["e1"] },
      skillModule,
    );

    expect(allChecked.mastery.dimensions.knowledge).toBeLessThanOrEqual(25);
    expect(allChecked.mastery.dimensions.ability).toBeLessThanOrEqual(20);
    expect(["exposure", "familiar", "working"]).toContain(allChecked.mastery.level);
  });

  it("lets a student who tests out with zero resources checked reach a high level", () => {
    const skillModule = minimalModule();
    const progress = freshProgress(skillModule.id);
    const testedOut = recomputeMastery(
      {
        ...progress,
        attempts: [
          {
            id: "attempt-1",
            skillId: skillModule.id,
            stage: "assessment",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            responses: [],
            evaluation: {
              perQuestion: [],
              knowledgeScore: 90,
              abilityScore: 85,
              strengths: [],
              weaknesses: [],
              weakestConceptId: null,
              recommendedNextStep: "",
            },
          },
        ],
      },
      skillModule,
    );

    expect(testedOut.completedResourceIds).toHaveLength(0);
    expect(testedOut.mastery.dimensions.knowledge).toBe(90);
    expect(testedOut.mastery.dimensions.ability).toBe(85);
    expect(["proficient", "interview-ready", "resume-ready"]).toContain(testedOut.mastery.level);
  });

  it("never lets evidence with zero entries score above none", () => {
    const skillModule = minimalModule();
    const progress = freshProgress(skillModule.id);
    const result = recomputeMastery(progress, skillModule);
    expect(result.mastery.evidenceStrength).toBe("none");
  });
});
