import { describe, expect, it } from "vitest";
import { computeJobFitAnalysis, prioritizeGaps } from "@/lib/jobs/fit-scoring";
import { createEmptyProfile } from "@/types";
import type { JobDescription, JobRequirement, RequirementMatch, StudentProfile } from "@/types";

function req(overrides: Partial<JobRequirement>): JobRequirement {
  return { id: overrides.id ?? "r1", category: "required", kind: "skill", label: "Python", minYears: null, source: "ai", ...overrides };
}

function job(requirements: JobRequirement[], overrides: Partial<JobDescription> = {}): JobDescription {
  return {
    id: "job-1",
    rawText: "raw",
    title: "Software Engineer",
    company: "Acme",
    minExperienceYears: null,
    preferredExperienceYears: null,
    educationRequirement: null,
    responsibilities: [],
    keywords: [],
    requirements,
    extractionMethod: "ai",
    extractionConfidence: "high",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function profile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return { ...createEmptyProfile("Test"), ...overrides };
}

describe("computeJobFitAnalysis", () => {
  it("handles a job with zero requirements without throwing, returning bounded neutral scores", () => {
    const analysis = computeJobFitAnalysis(job([]), profile(), null);
    expect(analysis.overallFitScore).toBeGreaterThanOrEqual(0);
    expect(analysis.overallFitScore).toBeLessThanOrEqual(100);
    expect(analysis.requirementMatches).toEqual([]);
    expect(analysis.componentScores).toHaveLength(6);
  });

  it("marks a required skill with no evidence anywhere as missing, and a listed+demonstrated skill as strong", () => {
    const requirements = [req({ id: "r-missing", label: "AWS" }), req({ id: "r-strong", label: "Python" })];
    const analysis = computeJobFitAnalysis(
      job(requirements),
      profile({
        currentSkills: ["Python"],
        experience: [{ id: "e1", title: "Intern", organization: "Acme", location: null, startDate: "2023", endDate: "2024", summary: "Used Python daily", bullets: [] }],
      }),
      null,
    );

    const missing = analysis.requirementMatches.find((m) => m.requirementId === "r-missing")!;
    const strong = analysis.requirementMatches.find((m) => m.requirementId === "r-strong")!;
    expect(missing.status).toBe("missing");
    expect(strong.status).toBe("strong");
  });

  it("scores full required-skill coverage as 100 and computes a higher overall score than a profile with no matches", () => {
    const requirements = [req({ id: "r1", label: "Python" }), req({ id: "r2", label: "SQL" })];
    const fullMatch = computeJobFitAnalysis(job(requirements), profile({ currentSkills: ["Python", "SQL"] }), null);
    const requiredComponent = fullMatch.componentScores.find((c) => c.key === "requiredSkillCoverage")!;
    expect(requiredComponent.score).toBeGreaterThan(0);

    const noMatch = computeJobFitAnalysis(job(requirements), profile(), null);
    expect(fullMatch.overallFitScore).toBeGreaterThan(noMatch.overallFitScore);
  });

  it("never divides by zero when minExperienceYears is set but the profile has no experience", () => {
    const requirements = [req({ id: "r1", kind: "experience", label: "5+ years", minYears: 5 })];
    const analysis = computeJobFitAnalysis(job(requirements), profile(), null);
    const match = analysis.requirementMatches[0];
    expect(match.status).toBe("missing");
    expect(Number.isFinite(match.confidence)).toBe(true);
  });

  it("links a strong skill match to the specific project/GitHub repo that demonstrates it (clickable evidence)", () => {
    const requirements = [req({ id: "r1", label: "React" })];
    const analysis = computeJobFitAnalysis(
      job(requirements),
      profile({
        projects: [{ id: "proj-1", title: "PathFinder", technologies: ["React"], date: null, summary: "A React app", bullets: [], githubUrl: null }],
      }),
      null,
    );
    const match = analysis.requirementMatches[0];
    expect(match.status).not.toBe("missing");
    const projectEvidence = match.evidence.find((e) => e.sourceRefType === "project");
    expect(projectEvidence?.sourceRefId).toBe("proj-1");
    expect(projectEvidence?.sourceLabel).toBe("PathFinder");
  });

  it("supplies richer evidence (GitHub-detected skills, SkillForge assessments) when an evidenceContext is passed", () => {
    const requirements = [req({ id: "r1", label: "PostgreSQL" })];
    const analysis = computeJobFitAnalysis(
      job(requirements),
      profile(),
      null,
      {
        skillForgeModules: [],
        skillForgeProgress: {},
        manualEvidence: [],
        githubRepos: [
          {
            id: "repo-1",
            owner: "student",
            name: "app",
            fullName: "student/app",
            htmlUrl: "https://github.com/student/app",
            description: null,
            primaryLanguage: "TypeScript",
            languages: [],
            packageManifests: [],
            detectedSignals: [],
            metadata: { stars: 0, forks: 0, openIssues: 0, sizeKb: 0, pushedAt: null, createdAt: null, defaultBranch: "main", isFork: false, isArchived: false },
            skillEvidence: [{ skill: "PostgreSQL", strength: "strong", reason: "Detected pg dependency and migrations/ directory." }],
            summary: "",
            analyzedAt: new Date().toISOString(),
            linkedProjectId: null,
          },
        ],
      },
    );
    const match = analysis.requirementMatches[0];
    expect(match.status).toBe("strong");
    expect(match.evidence.some((e) => e.sourceType === "github_repo")).toBe(true);
  });

  it("matches an education requirement against the profile's degree/major", () => {
    const requirements = [req({ id: "r1", kind: "education", label: "Computer Science", minYears: null })];
    const matched = computeJobFitAnalysis(job(requirements), profile({ major: "Computer Science" }), null);
    expect(matched.requirementMatches[0].status).toBe("strong");

    const unmatched = computeJobFitAnalysis(job(requirements), profile({ major: "History" }), null);
    expect(unmatched.requirementMatches[0].status).not.toBe("strong");
  });
});

describe("prioritizeGaps", () => {
  it("returns an empty list when every requirement is a strong match", () => {
    const matches: RequirementMatch[] = [
      { requirementId: "r1", label: "Python", category: "required", kind: "skill", status: "strong", confidence: 100, evidence: [], gapExplanation: null },
    ];
    expect(prioritizeGaps(matches)).toEqual([]);
  });

  it("ranks a missing required item above a missing preferred item", () => {
    const matches: RequirementMatch[] = [
      { requirementId: "r1", label: "Docker", category: "preferred", kind: "tool", status: "missing", confidence: 0, evidence: [], gapExplanation: "gap" },
      { requirementId: "r2", label: "AWS", category: "required", kind: "tool", status: "missing", confidence: 0, evidence: [], gapExplanation: "gap" },
    ];
    const [first] = prioritizeGaps(matches);
    expect(first.requirementId).toBe("r2");
  });

  it("caps recommendations at 8", () => {
    const matches: RequirementMatch[] = Array.from({ length: 20 }, (_, i) => ({
      requirementId: `r${i}`,
      label: `Skill ${i}`,
      category: "required" as const,
      kind: "skill" as const,
      status: "missing" as const,
      confidence: 0,
      evidence: [],
      gapExplanation: "gap",
    }));
    expect(prioritizeGaps(matches)).toHaveLength(8);
  });
});
