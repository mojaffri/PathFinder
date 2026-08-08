import { describe, expect, it } from "vitest";
import { matchCareers } from "@/lib/matching/engine";
import { EMPTY_QUESTIONNAIRE_ANSWERS } from "@/types";
import type { Career, QuestionnaireAnswers } from "@/types";

function makeCareer(overrides: Partial<Career>): Career {
  return {
    id: "career",
    title: "Career",
    category: "software-tech",
    description: "",
    commonMajors: [],
    degreeRequirements: "",
    advancedDegreeTypical: false,
    graduateSchoolConsiderations: "",
    workEnvironments: ["remote-first"],
    mathIntensity: 3,
    codingIntensity: 3,
    technicalIntensity: 3,
    handsOnIntensity: 3,
    researchIntensity: 3,
    communicationIntensity: 3,
    businessIntensity: 3,
    remotePotential: 3,
    salaryPotential: 3,
    salaryRange: "",
    jobGrowth: "stable",
    competitiveness: "",
    competitivenessFactors: [],
    commonEntryLevelRoles: [],
    highValueSkills: [],
    commonTools: [],
    certifications: [],
    portfolioExpectations: "",
    internshipExpectations: "",
    researchExpectations: "",
    interviewTypes: [],
    recruitingTimeline: "",
    commonMistakes: [],
    differentiationStrategies: [],
    realityCheck: "",
    ...overrides,
  };
}

const HIGH_CODING: Career = makeCareer({ id: "high-coding", title: "High Coding", codingIntensity: 5, technicalIntensity: 5 });
const HIGH_HANDS_ON: Career = makeCareer({ id: "high-hands-on", title: "High Hands-On", handsOnIntensity: 5, mathIntensity: 1, codingIntensity: 1, technicalIntensity: 1 });

describe("matchCareers", () => {
  it("returns an empty array for an empty career list", () => {
    expect(matchCareers(EMPTY_QUESTIONNAIRE_ANSWERS, [], 6)).toEqual([]);
  });

  it("scores a single career without throwing and produces a bounded percentage", () => {
    const [match] = matchCareers(EMPTY_QUESTIONNAIRE_ANSWERS, [HIGH_CODING], 6);
    expect(match.matchPercentage).toBeGreaterThanOrEqual(0);
    expect(match.matchPercentage).toBeLessThanOrEqual(100);
  });

  it("ranks a career matching stated preferences above one that doesn't, across multiple careers", () => {
    const answers: QuestionnaireAnswers = {
      ...EMPTY_QUESTIONNAIRE_ANSWERS,
      technicalProblemSolving: 5,
      workStylePreferences: ["coding"],
    };
    const results = matchCareers(answers, [HIGH_CODING, HIGH_HANDS_ON], 6);
    const codingResult = results.find((r) => r.career.id === "high-coding")!;
    const handsOnResult = results.find((r) => r.career.id === "high-hands-on")!;
    expect(codingResult.matchPercentage).toBeGreaterThan(handsOnResult.matchPercentage);
  });

  it("respects topN", () => {
    const results = matchCareers(EMPTY_QUESTIONNAIRE_ANSWERS, [HIGH_CODING, HIGH_HANDS_ON], 1);
    expect(results).toHaveLength(1);
  });

  it("always returns a non-empty reasons list, even with no decisive selections", () => {
    const [match] = matchCareers(EMPTY_QUESTIONNAIRE_ANSWERS, [HIGH_CODING], 6);
    expect(match.reasons.length).toBeGreaterThan(0);
  });
});
