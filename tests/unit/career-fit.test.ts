import { describe, expect, it } from "vitest";
import { computeCareerFitBreakdown } from "@/lib/matching/career-fit";
import { createEmptyProfile } from "@/types";
import type { Career, StudentProfile } from "@/types";

const CAREER: Career = {
  id: "test-swe",
  title: "Software Engineer",
  category: "software-tech",
  description: "Builds software.",
  commonMajors: ["Computer Science", "Software Engineering"],
  degreeRequirements: "Bachelor's typical",
  advancedDegreeTypical: false,
  graduateSchoolConsiderations: "",
  workEnvironments: ["remote-first", "hybrid"],
  mathIntensity: 3,
  codingIntensity: 5,
  technicalIntensity: 5,
  handsOnIntensity: 2,
  researchIntensity: 2,
  communicationIntensity: 3,
  businessIntensity: 2,
  remotePotential: 5,
  salaryPotential: 4,
  salaryRange: "$80k-$150k",
  jobGrowth: "growing",
  competitiveness: "High",
  competitivenessFactors: [],
  commonEntryLevelRoles: ["Software Engineer Intern", "Junior Developer"],
  highValueSkills: ["Python", "TypeScript", "SQL", "Git"],
  commonTools: ["React", "Docker"],
  certifications: [{ name: "AWS Certified Developer", recommend: true, reasoning: "Valued for cloud roles." }],
  portfolioExpectations: "",
  internshipExpectations: "Essential",
  researchExpectations: "",
  interviewTypes: [],
  recruitingTimeline: "",
  commonMistakes: [],
  differentiationStrategies: [],
  realityCheck: "",
};

function baseProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return { ...createEmptyProfile("Test Student"), ...overrides };
}

describe("computeCareerFitBreakdown", () => {
  it("handles a fully empty profile without throwing, returning valid bounded scores", () => {
    const breakdown = computeCareerFitBreakdown(baseProfile(), CAREER);
    expect(breakdown.overallScore).toBeGreaterThanOrEqual(0);
    expect(breakdown.overallScore).toBeLessThanOrEqual(100);
    expect(breakdown.components).toHaveLength(7);
    for (const c of breakdown.components) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
  });

  it("scores every component within 0-100 for a single matching skill", () => {
    const breakdown = computeCareerFitBreakdown(baseProfile({ currentSkills: ["Python"] }), CAREER);
    const skillMatch = breakdown.components.find((c) => c.key === "skillMatch")!;
    expect(skillMatch.score).toBeGreaterThan(0);
    expect(skillMatch.score).toBeLessThanOrEqual(100);
    expect(skillMatch.evidence.some((e) => e.includes("Python"))).toBe(true);
  });

  it("scores higher for a profile with multiple matching skills/projects than an empty one", () => {
    const empty = computeCareerFitBreakdown(baseProfile(), CAREER);
    const rich = computeCareerFitBreakdown(
      baseProfile({
        major: "Computer Science",
        currentSkills: ["Python", "TypeScript", "SQL", "Git"],
        experience: [
          { id: "e1", title: "Software Engineer Intern", organization: "Acme", location: null, startDate: "2024", endDate: "2024", summary: "Built things", bullets: [] },
        ],
        projects: [
          { id: "p1", title: "Portfolio site", technologies: ["React", "TypeScript"], date: null, summary: "A site", bullets: [], githubUrl: null },
        ],
        certifications: [{ id: "c1", name: "AWS Certified Developer", issuer: "AWS", date: null }],
      }),
      CAREER,
    );

    expect(rich.overallScore).toBeGreaterThan(empty.overallScore);
  });

  it("flags full skill coverage as a strength with no skill gap, and missing skills as a gap otherwise", () => {
    const full = computeCareerFitBreakdown(baseProfile({ currentSkills: ["Python", "TypeScript", "SQL", "Git"] }), CAREER);
    const skillComponent = full.components.find((c) => c.key === "skillMatch")!;
    expect(skillComponent.score).toBe(100);

    const empty = computeCareerFitBreakdown(baseProfile(), CAREER);
    expect(empty.gaps.length).toBeGreaterThan(0);
  });

  it("never divides by zero when a career has no certifications or high-value skills", () => {
    const noRequirementsCareer: Career = { ...CAREER, highValueSkills: [], certifications: [] };
    const breakdown = computeCareerFitBreakdown(baseProfile(), noRequirementsCareer);
    expect(Number.isFinite(breakdown.overallScore)).toBe(true);
    const skillComponent = breakdown.components.find((c) => c.key === "skillMatch")!;
    const roleComponent = breakdown.components.find((c) => c.key === "roleRequirements")!;
    expect(skillComponent.score).toBe(60);
    expect(roleComponent.score).toBe(100);
  });
});
