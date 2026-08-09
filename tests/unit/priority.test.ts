import { describe, expect, it } from "vitest";
import type { SkillNode } from "@/types/skill-graph";
import type { GapItem } from "@/types/roadmap";
import type { SkillConfidenceScore } from "@/types/evidence";
import { findMatchingGap, findMatchingJobFrequency, scoreSkillPriority, tierForScore } from "@/lib/roadmap/priority";

function node(overrides: Partial<SkillNode> & { id: string }): SkillNode {
  return {
    name: overrides.id, category: "software-tech", prerequisites: [], estimatedHours: 10,
    importanceByCareer: {}, skillForgeModuleId: null, relatedGapKeywords: [], ...overrides,
  };
}

function gap(overrides: Partial<GapItem> = {}): GapItem {
  return {
    id: "gap-1", category: "technical", title: "Learn SQL", description: "SQL is expected.",
    priority: "high", impact: 4, effort: 3, timeHorizon: "immediate", estimatedHours: 20,
    relevantCareers: ["Backend Engineer"], evidenceOfCompletion: "A project using SQL", tacticalActions: [],
    ...overrides,
  };
}

function confidence(overrides: Partial<SkillConfidenceScore> = {}): SkillConfidenceScore {
  return {
    skillName: "SQL", confidence: "moderate", overallScore: 50, components: [],
    evidenceCount: 1, independentSourceCount: 1, explanation: "", evidence: [], ...overrides,
  };
}

describe("tierForScore", () => {
  it("maps documented thresholds correctly", () => {
    expect(tierForScore(80)).toBe("critical");
    expect(tierForScore(75)).toBe("critical");
    expect(tierForScore(60)).toBe("high");
    expect(tierForScore(55)).toBe("high");
    expect(tierForScore(40)).toBe("medium");
    expect(tierForScore(30)).toBe("medium");
    expect(tierForScore(10)).toBe("low");
    expect(tierForScore(0)).toBe("low");
  });
});

describe("scoreSkillPriority", () => {
  it("always stays within 0-100 bounds", () => {
    const result = scoreSkillPriority(node({ id: "sql" }), {
      matchedGap: gap({ priority: "critical", impact: 5 }),
      jobFrequency: { skill: "SQL", count: 10, percentage: 100, savedJobCount: 10 },
      blockedSkillsCount: 10,
      confidenceScore: confidence({ overallScore: 0 }),
      masteryLevel: null,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("a skill with no matching signals at all still scores low but non-crazy (no evidence counts as weak)", () => {
    const result = scoreSkillPriority(node({ id: "sql" }), {
      matchedGap: null, jobFrequency: null, blockedSkillsCount: 0, confidenceScore: null, masteryLevel: null,
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.tier).toBe("low");
  });

  it("a critical, high-impact gap outranks a low-priority, low-impact one", () => {
    const high = scoreSkillPriority(node({ id: "a" }), {
      matchedGap: gap({ priority: "critical", impact: 5 }), jobFrequency: null, blockedSkillsCount: 0,
      confidenceScore: null, masteryLevel: null,
    });
    const low = scoreSkillPriority(node({ id: "b" }), {
      matchedGap: gap({ priority: "low", impact: 1 }), jobFrequency: null, blockedSkillsCount: 0,
      confidenceScore: null, masteryLevel: null,
    });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("saved-job frequency boosts the score", () => {
    const withoutJobs = scoreSkillPriority(node({ id: "a" }), {
      matchedGap: null, jobFrequency: null, blockedSkillsCount: 0, confidenceScore: confidence(), masteryLevel: null,
    });
    const withJobs = scoreSkillPriority(node({ id: "a" }), {
      matchedGap: null, jobFrequency: { skill: "SQL", count: 8, percentage: 80, savedJobCount: 10 },
      blockedSkillsCount: 0, confidenceScore: confidence(), masteryLevel: null,
    });
    expect(withJobs.score).toBeGreaterThan(withoutJobs.score);
  });

  it("unblocking more downstream skills increases the score", () => {
    const fewBlocked = scoreSkillPriority(node({ id: "a" }), {
      matchedGap: null, jobFrequency: null, blockedSkillsCount: 0, confidenceScore: confidence(), masteryLevel: null,
    });
    const manyBlocked = scoreSkillPriority(node({ id: "a" }), {
      matchedGap: null, jobFrequency: null, blockedSkillsCount: 5, confidenceScore: confidence(), masteryLevel: null,
    });
    expect(manyBlocked.score).toBeGreaterThan(fewBlocked.score);
  });

  it("weaker existing evidence raises priority, stronger evidence lowers it", () => {
    const weakEvidence = scoreSkillPriority(node({ id: "a" }), {
      matchedGap: null, jobFrequency: null, blockedSkillsCount: 0, confidenceScore: confidence({ overallScore: 10, confidence: "low" }), masteryLevel: null,
    });
    const strongEvidence = scoreSkillPriority(node({ id: "a" }), {
      matchedGap: null, jobFrequency: null, blockedSkillsCount: 0, confidenceScore: confidence({ overallScore: 95, confidence: "very-high" }), masteryLevel: null,
    });
    expect(weakEvidence.score).toBeGreaterThan(strongEvidence.score);
  });

  it("applies the mastery discount when SkillForge level is already proficient", () => {
    const notMastered = scoreSkillPriority(node({ id: "a" }), {
      matchedGap: gap(), jobFrequency: null, blockedSkillsCount: 0, confidenceScore: null, masteryLevel: "working",
    });
    const mastered = scoreSkillPriority(node({ id: "a" }), {
      matchedGap: gap(), jobFrequency: null, blockedSkillsCount: 0, confidenceScore: null, masteryLevel: "proficient",
    });
    expect(mastered.score).toBeLessThan(notMastered.score);
    expect(mastered.reasons.some((r) => r.includes("already strong"))).toBe(true);
  });

  it("applies the mastery discount when confidence is already high, even without SkillForge progress", () => {
    const result = scoreSkillPriority(node({ id: "a" }), {
      matchedGap: gap(), jobFrequency: null, blockedSkillsCount: 0,
      confidenceScore: confidence({ confidence: "very-high", overallScore: 95 }), masteryLevel: null,
    });
    expect(result.reasons.some((r) => r.includes("already strong"))).toBe(true);
  });
});

describe("findMatchingGap", () => {
  it("matches a gap by keyword overlap", () => {
    const match = findMatchingGap(node({ id: "sql", name: "SQL", relatedGapKeywords: ["sql", "queries"] }), [
      gap({ title: "Learn SQL", description: "SQL is expected for backend roles." }),
    ]);
    expect(match).not.toBeNull();
  });

  it("returns null when nothing matches", () => {
    const match = findMatchingGap(node({ id: "sql", name: "SQL", relatedGapKeywords: ["sql"] }), [
      gap({ title: "Build a portfolio project", description: "Unrelated." }),
    ]);
    expect(match).toBeNull();
  });

  it("returns the highest-priority match when multiple gaps match", () => {
    const match = findMatchingGap(node({ id: "sql", name: "SQL", relatedGapKeywords: ["sql"] }), [
      gap({ id: "g1", title: "SQL basics", description: "sql", priority: "low", impact: 1 }),
      gap({ id: "g2", title: "SQL basics", description: "sql", priority: "critical", impact: 5 }),
    ]);
    expect(match?.id).toBe("g2");
  });

  it("returns null for an empty gap list", () => {
    expect(findMatchingGap(node({ id: "sql" }), [])).toBeNull();
  });
});

describe("findMatchingJobFrequency", () => {
  it("matches by fuzzy skill name", () => {
    const match = findMatchingJobFrequency(node({ id: "sql", name: "SQL", relatedGapKeywords: ["sql"] }), [
      { skill: "SQL", count: 5, percentage: 50, savedJobCount: 10 },
    ]);
    expect(match?.skill).toBe("SQL");
  });

  it("returns null for an empty frequency list", () => {
    expect(findMatchingJobFrequency(node({ id: "sql" }), [])).toBeNull();
  });
});
