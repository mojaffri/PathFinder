import { describe, expect, it } from "vitest";
import { computeSkillConfidence, listTrackedSkills, type SkillConfidenceContext, type SkillForgeModuleLike } from "@/lib/evidence/confidence";
import { freshProgress } from "@/lib/skillforge/mastery";
import { createEmptyProfile } from "@/types";
import type { GithubRepoRecord, SkillEvidenceRecord, SkillProgress, StudentProfile } from "@/types";

function baseContext(overrides: Partial<SkillConfidenceContext> = {}): SkillConfidenceContext {
  return {
    profile: createEmptyProfile("Test"),
    skillForgeModules: [],
    skillForgeProgress: {},
    githubRepos: [],
    manualEvidence: [],
    ...overrides,
  };
}

function profileWith(overrides: Partial<StudentProfile>): StudentProfile {
  return { ...createEmptyProfile("Test"), ...overrides };
}

function repoWith(overrides: Partial<GithubRepoRecord>): GithubRepoRecord {
  return {
    id: "repo-1",
    owner: "student",
    name: "titrate",
    fullName: "student/titrate",
    htmlUrl: "https://github.com/student/titrate",
    description: null,
    primaryLanguage: "Python",
    languages: [],
    packageManifests: [],
    detectedSignals: [],
    metadata: { stars: 0, forks: 0, openIssues: 0, sizeKb: 0, pushedAt: null, createdAt: null, defaultBranch: "main", isFork: false, isArchived: false },
    skillEvidence: [],
    summary: "",
    analyzedAt: new Date().toISOString(),
    linkedProjectId: null,
    ...overrides,
  };
}

describe("listTrackedSkills", () => {
  it("returns an empty list for a completely empty context", () => {
    expect(listTrackedSkills(baseContext())).toEqual([]);
  });

  it("unions claimed skills, GitHub-detected skills, and manually-added skills", () => {
    const skills = listTrackedSkills(
      baseContext({
        profile: profileWith({ currentSkills: ["Python"] }),
        githubRepos: [repoWith({ skillEvidence: [{ skill: "Machine Learning", strength: "strong", reason: "x" }] })],
        manualEvidence: [
          { id: "m1", skillName: "Public Speaking", sourceType: "publication", sourceLabel: "x", sourceRefType: null, sourceRefId: null, evidenceStrength: "moderate", verificationStatus: "self-reported", explanation: "x", occurredOn: null, origin: "manual", createdAt: "" },
        ],
      }),
    );
    expect(skills).toEqual(["Machine Learning", "Public Speaking", "Python"]);
  });
});

describe("computeSkillConfidence", () => {
  it("never throws on a skill with zero evidence, and returns Unverified", () => {
    const score = computeSkillConfidence("Rust", baseContext());
    expect(score.confidence).toBe("unverified");
    expect(score.overallScore).toBe(0);
    expect(score.evidenceCount).toBe(0);
    expect(score.components).toHaveLength(4);
  });

  it("caps a bare self-claim (no other evidence) at Unverified — a resume tag alone is never enough", () => {
    const score = computeSkillConfidence("Python", baseContext({ profile: profileWith({ currentSkills: ["Python"] }) }));
    expect(score.confidence).toBe("unverified");
    expect(score.overallScore).toBeLessThan(15);
  });

  it("reaches High (not Very High) for the documented worked example: claimed + 88/100 assessed + strong project + moderate professional", () => {
    const skillModule: SkillForgeModuleLike = { id: "python-module", name: "Python" };
    const progress: SkillProgress = {
      ...freshProgress("python-module"),
      startedAt: "2026-01-01T00:00:00.000Z",
      lastActivityAt: "2026-01-05T00:00:00.000Z",
      mastery: {
        ...freshProgress("python-module").mastery,
        level: "proficient",
        dimensions: { knowledge: 90, ability: 86, evidence: 50, interview: 0 },
      },
    };

    const profile = profileWith({
      currentSkills: ["Python"],
      experience: [
        { id: "e1", title: "Research Assistant", organization: "University Lab", location: null, startDate: "2025-06", endDate: "2025-08", summary: "Used Python for data pipelines.", bullets: [] },
      ],
      projects: [
        { id: "p1", title: "Titrate", technologies: ["Python"], date: null, summary: "Gaussian-process optimization", bullets: [], githubUrl: "https://github.com/student/titrate" },
      ],
    });

    const repo = repoWith({
      htmlUrl: "https://github.com/student/titrate",
      skillEvidence: [{ skill: "Python", strength: "strong", reason: "Python is the primary language (95% of bytes) with a tests/ directory present." }],
    });

    const score = computeSkillConfidence(
      "Python",
      baseContext({ profile, skillForgeModules: [skillModule], skillForgeProgress: { [skillModule.id]: progress }, githubRepos: [repo] }),
    );

    expect(score.confidence).toBe("high");
    expect(score.confidence).not.toBe("very-high");
    const assessedComponent = score.components.find((c) => c.dimension === "assessed")!;
    expect(assessedComponent.detail).toContain("88/100");
  });

  it("reaches Very High only when assessed, demonstrated, and professional are all independently strong", () => {
    const skillModule: SkillForgeModuleLike = { id: "python-module", name: "Python" };
    const progress: SkillProgress = {
      ...freshProgress("python-module"),
      startedAt: "2026-01-01T00:00:00.000Z",
      mastery: { ...freshProgress("python-module").mastery, dimensions: { knowledge: 95, ability: 95, evidence: 90, interview: 0 } },
    };
    const profile = profileWith({
      currentSkills: ["Python"],
      experience: [
        { id: "e1", title: "Software Engineer", organization: "Acme", location: null, startDate: "2024", endDate: "2025", summary: "Built Python services.", bullets: ["Wrote Python microservices"] },
        { id: "e2", title: "Research Assistant", organization: "University Lab", location: null, startDate: "2023", endDate: "2024", summary: "Python data pipelines.", bullets: [] },
      ],
      projects: [{ id: "p1", title: "Titrate", technologies: ["Python"], date: null, summary: "Python project", bullets: [], githubUrl: null }],
    });
    const repo = repoWith({ skillEvidence: [{ skill: "Python", strength: "strong", reason: "Strong signal" }] });

    const score = computeSkillConfidence(
      "Python",
      baseContext({ profile, skillForgeModules: [skillModule], skillForgeProgress: { [skillModule.id]: progress }, githubRepos: [repo] }),
    );
    expect(score.confidence).toBe("very-high");
  });

  it("lands at Low for two independent but only moderate sources", () => {
    const profile = profileWith({
      experience: [{ id: "e1", title: "Intern", organization: "Acme", location: null, startDate: null, endDate: null, summary: "Used SQL for reporting.", bullets: [] }],
      projects: [{ id: "p1", title: "Dashboard", technologies: ["SQL"], date: null, summary: null, bullets: [], githubUrl: null }],
    });
    const score = computeSkillConfidence("SQL", baseContext({ profile }));
    expect(score.confidence).toBe("low");
  });

  it("every component score stays within 0-100 regardless of input combination", () => {
    const manual: SkillEvidenceRecord[] = [
      { id: "m1", skillName: "Docker", sourceType: "certification", sourceLabel: "x", sourceRefType: null, sourceRefId: null, evidenceStrength: "strong", verificationStatus: "verified", explanation: "x", occurredOn: null, origin: "manual", createdAt: "" },
    ];
    const score = computeSkillConfidence("Docker", baseContext({ manualEvidence: manual }));
    for (const c of score.components) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);
  });
});
