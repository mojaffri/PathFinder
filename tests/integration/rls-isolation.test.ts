import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, insertAuthUser, closeTestDb, type TestDb } from "./db";
import { createProfile, getProfileByUserId, updateProfile, type ProfileWriteInput } from "@/repositories/profile-repository";
import { deleteRoadmap, getRoadmap, saveRoadmap } from "@/repositories/roadmap-repository";
import { getSkillProgress } from "@/repositories/skillforge-repository";
import { deleteResume, getResumeById, saveResume, setActiveResume } from "@/repositories/resume-repository";
import { deleteJobDescription, getJobDescription, createJobDescription } from "@/repositories/job-repository";
import { deleteRepo, getRepo, linkRepoToProject, saveRepoAnalysis } from "@/repositories/github-repository";
import { addManualEvidence, listManualEvidence } from "@/repositories/evidence-repository";
import { getAdaptiveRoadmap, saveAdaptiveRoadmap, updateTaskStatus } from "@/repositories/adaptive-roadmap-repository";
import { skillModules, skillProgress } from "@/lib/db/schema";
import { DEFAULT_WORK_PREFERENCES } from "@/types";
import type { Roadmap, SavedRoadmap, RepoAnalysis, AdaptiveRoadmap } from "@/types";
import type { JobExtraction } from "@/lib/jobs/schema";

/**
 * These tests exist specifically to prove the FORCE ROW LEVEL SECURITY
 * policies in drizzle/migrations/0001_rls_policies.sql do real work, not
 * just that repository code "looks" correctly scoped. Several repository
 * read/write queries below (`getRoadmap`, `deleteRoadmap`) intentionally
 * filter ONLY by the row's own id at the SQL level — ownership enforcement
 * comes entirely from `withUserContext()` + RLS. If RLS were ever
 * misconfigured or accidentally dropped, these are the tests that would
 * catch a real cross-user data leak.
 */

const USER_A = "22222222-2222-4222-8222-222222222222";
const USER_B = "33333333-3333-4333-8333-333333333333";

function profileInput(name: string): ProfileWriteInput {
  return {
    name,
    age: null,
    educationStage: null,
    school: "",
    major: "",
    gpaRaw: null,
    gpaScale: null,
    targetIndustry: "",
    targetCareers: ["Software Engineer"],
    currentSkills: [],
    interests: [],
    education: [],
    experience: [],
    projects: [],
    awards: [],
    certifications: [],
    careerGoals: "",
    workPreferences: DEFAULT_WORK_PREFERENCES,
    weeklyHoursAvailable: null,
    preferredLocations: [],
    employmentPreference: null,
    targetDate: null,
  };
}

function minimalRoadmap(): Roadmap {
  return {
    executiveSummary: "Summary",
    targetCareers: ["Software Engineer"],
    currentProfileAssessment: "Assessment",
    gapAnalysis: { currentStateSummary: [], targetCareers: ["Software Engineer"], gaps: [] },
    topMoves: [],
    competitiveAdvantages: [],
    mistakesToAvoid: [],
    phases: [],
    certificationGuidance: [],
    aiAdvantage: { categories: [], summary: "", useCases: [], templates: [] },
    targetResumeBenchmark: {
      comparisons: [],
      targetExperience: { roleTitle: "", organizationPlaceholder: "", timeframePlaceholder: "", bullets: [] },
      targetProjects: [],
      instructions: "",
    },
    portfolioIdeas: [],
    interviewPreparation: [],
    recommendedTools: [],
    recommendedResources: [],
    realityCheck: "Reality check",
    weeklyHoursAvailable: null,
    generatedAt: new Date().toISOString(),
    source: "fallback",
  };
}

function minimalRepoAnalysis(): RepoAnalysis {
  return {
    owner: "student",
    name: "titrate",
    fullName: "student/titrate",
    htmlUrl: "https://github.com/student/titrate",
    description: "A Gaussian-process optimization toolkit",
    primaryLanguage: "Python",
    languages: [{ language: "Python", bytes: 1000, percentage: 100 }],
    packageManifests: ["requirements.txt"],
    detectedSignals: [],
    metadata: { stars: 0, forks: 0, openIssues: 0, sizeKb: 10, pushedAt: null, createdAt: null, defaultBranch: "main", isFork: false, isArchived: false },
    skillEvidence: [{ skill: "Python", strength: "strong", reason: "Primary language" }],
    summary: "This project provides strong evidence of Python.",
    analyzedAt: new Date().toISOString(),
  };
}

function minimalAdaptiveRoadmap(): AdaptiveRoadmap {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    userId: "unused-overwritten-by-repository",
    targetCareers: ["Software Engineer"],
    targetDate: null,
    weeklyHoursAvailable: 10,
    readiness: 0,
    phases: [
      {
        key: "foundations",
        title: "Foundations",
        tasks: [
          {
            id: crypto.randomUUID(),
            skillId: "javascript",
            skillName: "JavaScript",
            title: "Learn JavaScript",
            reason: "Foundational.",
            estimatedHours: 30,
            prerequisiteTaskIds: [],
            priorityScore: 60,
            priorityTier: "high",
            scheduledStartDate: null,
            scheduledTargetDate: null,
            status: "not-started",
            completionCriteria: ["Complete the core material"],
            learningResource: null,
            assessmentSkillForgeModuleId: null,
            evidenceGoal: null,
            sourceGapTitle: null,
            sourceJobRequirementLabels: [],
            completedAt: null,
            createdAt: now,
          },
        ],
      },
    ],
    feasibility: { feasible: true, totalRemainingHours: 30, requiredWeeks: 3, availableWeeks: null, weeklyHoursAvailable: 10, isAssumedAvailability: false, message: "", recommendations: [] },
    savedJobSkillFrequency: [],
    changeEvents: [],
    completedHistory: [],
    generatedAt: now,
    updatedAt: now,
  };
}

describe("RLS user isolation", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
    await insertAuthUser(testDb, USER_A, "a@example.com");
    await insertAuthUser(testDb, USER_B, "b@example.com");
    await createProfile(USER_A, profileInput("User A"));
    await createProfile(USER_B, profileInput("User B"));
  });

  afterAll(async () => {
    await closeTestDb(testDb);
  });

  it("prevents one user from reading another user's roadmap by id", async () => {
    const now = new Date().toISOString();
    const saved: SavedRoadmap = {
      id: "44444444-4444-4444-8444-444444444444",
      userId: USER_A,
      major: "CS",
      targetCareers: ["Software Engineer"],
      educationStage: null,
      createdAt: now,
      updatedAt: now,
      roadmap: minimalRoadmap(),
      source: "accelerate",
    };
    await saveRoadmap(USER_A, saved);

    const ownerRead = await getRoadmap(USER_A, saved.id);
    expect(ownerRead?.id).toBe(saved.id);

    // The repository's own WHERE clause for getRoadmap filters only by id —
    // it is RLS alone that must stop this from returning User A's roadmap.
    const attackerRead = await getRoadmap(USER_B, saved.id);
    expect(attackerRead).toBeNull();
  });

  it("prevents one user from deleting another user's roadmap", async () => {
    const now = new Date().toISOString();
    const saved: SavedRoadmap = {
      id: "55555555-5555-4555-8555-555555555555",
      userId: USER_A,
      major: "CS",
      targetCareers: ["Software Engineer"],
      educationStage: null,
      createdAt: now,
      updatedAt: now,
      roadmap: minimalRoadmap(),
      source: "accelerate",
    };
    await saveRoadmap(USER_A, saved);

    await deleteRoadmap(USER_B, saved.id);

    const stillThere = await getRoadmap(USER_A, saved.id);
    expect(stillThere?.id).toBe(saved.id);
  });

  it("prevents one user from reading another user's SkillForge progress", async () => {
    // Reference-table insert: not RLS-forced, so this succeeds under
    // `app_role` purely because it owns the table (see tests/integration/db.ts).
    await testDb.db.insert(skillModules).values({ id: "demo-skill", category: "software-tech", priority: "high", data: {} });

    // Fetching profileA's own row requires going through a repository
    // function (which sets `request.jwt.claim.sub` via `withUserContext`) —
    // a raw query here would see nothing, since FORCE RLS hides every row
    // when `auth.uid()` is NULL, including from their own owner.
    const profileA = await getProfileByUserId(USER_A);
    if (!profileA) throw new Error("expected profile A to exist");

    // Same reasoning as above: inserting this fixture row also has to carry
    // User A's identity for FORCE RLS's WITH CHECK clause to allow it.
    await testDb.client.query("select set_config('request.jwt.claim.sub', $1, false)", [USER_A]);
    await testDb.db.insert(skillProgress).values({
      profileId: profileA.id,
      skillId: "demo-skill",
      level: "proficient",
      dimensions: { knowledge: 80, ability: 70, evidence: 0, interview: 0 },
    });
    await testDb.client.query("select set_config('request.jwt.claim.sub', '', false)", []);

    const asOwner = await getSkillProgress(USER_A, "demo-skill");
    expect(asOwner.mastery.level).toBe("proficient");

    // No row exists for User B, and RLS hides User A's row entirely, so this
    // must fall back to a fresh (exposure-level) progress, not User A's data.
    const asOther = await getSkillProgress(USER_B, "demo-skill");
    expect(asOther.mastery.level).toBe("exposure");
  });

  it("prevents one user from reading, activating, or deleting another user's resume", async () => {
    const resume = await saveResume(USER_A, {
      fileName: "resume.pdf",
      fileType: "pdf",
      fileSizeBytes: 100,
      storagePath: null,
      rawText: "User A's resume text",
      extractionMethod: "heuristic",
      extractionConfidence: "medium",
    });

    // getResumeById filters only by id — RLS alone must block this.
    expect(await getResumeById(USER_B, resume.id)).toBeNull();

    const activated = await setActiveResume(USER_B, resume.id);
    expect(activated).toBe(false);

    const deleted = await deleteResume(USER_B, resume.id);
    expect(deleted).toBeNull();

    // Confirm it's untouched from the real owner's perspective.
    const stillThere = await getResumeById(USER_A, resume.id);
    expect(stillThere?.id).toBe(resume.id);
  });

  it("prevents one user from reading or deleting another user's job description (and its requirements)", async () => {
    const extraction: JobExtraction = {
      title: "Software Engineer",
      company: "Acme",
      minExperienceYears: null,
      preferredExperienceYears: null,
      educationRequirement: null,
      responsibilities: [],
      keywords: [],
      requirements: [{ category: "required", kind: "skill", label: "Python", minYears: null }],
      extractionConfidence: "high",
    };
    const job = await createJobDescription(USER_A, "raw text", extraction, "ai");

    // getJobDescription filters only by id — RLS alone must block this,
    // including the job_requirements rows owned transitively through it.
    expect(await getJobDescription(USER_B, job.id)).toBeNull();

    await deleteJobDescription(USER_B, job.id);
    const stillThere = await getJobDescription(USER_A, job.id);
    expect(stillThere?.id).toBe(job.id);
    expect(stillThere?.requirements).toHaveLength(1);
  });

  it("prevents one user from reading or deleting another user's analyzed GitHub repository", async () => {
    const saved = await saveRepoAnalysis(USER_A, minimalRepoAnalysis(), null);

    // getRepo filters only by id — RLS alone must block this.
    expect(await getRepo(USER_B, saved.id)).toBeNull();

    await deleteRepo(USER_B, saved.id);
    const stillThere = await getRepo(USER_A, saved.id);
    expect(stillThere?.id).toBe(saved.id);
    expect(stillThere?.skillEvidence[0]?.skill).toBe("Python");
  });

  it("links GitHub evidence only to a project owned by the same user", async () => {
    const ownProfile = profileInput("User A");
    ownProfile.projects = [{
      id: crypto.randomUUID(),
      title: "Titrate",
      technologies: ["Python"],
      date: null,
      summary: null,
      bullets: [],
      githubUrl: "https://github.com/student/titrate",
    }];
    const updated = await updateProfile(USER_A, ownProfile);
    const projectId = updated.projects[0]?.id;
    if (!projectId) throw new Error("expected a persisted project");

    const repo = await saveRepoAnalysis(USER_A, minimalRepoAnalysis(), null);
    expect((await linkRepoToProject(USER_A, repo.id, projectId))?.linkedProjectId).toBe(projectId);
    expect(await linkRepoToProject(USER_B, repo.id, projectId)).toBeNull();
    expect(await linkRepoToProject(USER_A, repo.id, crypto.randomUUID())).toBeNull();
  });

  it("prevents one user's manually-added skill evidence from appearing in another user's list", async () => {
    await addManualEvidence(USER_A, {
      skillName: "Public Speaking",
      sourceType: "publication",
      sourceLabel: "Conference talk",
      evidenceStrength: "moderate",
      verificationStatus: "self-reported",
      explanation: "Gave a talk at a student conference.",
      occurredOn: null,
    });

    const asOwner = await listManualEvidence(USER_A);
    expect(asOwner.some((e) => e.skillName === "Public Speaking")).toBe(true);

    const asOther = await listManualEvidence(USER_B);
    expect(asOther.some((e) => e.skillName === "Public Speaking")).toBe(false);
  });

  it("prevents one user from reading another user's adaptive roadmap, and from updating its tasks", async () => {
    const saved = await saveAdaptiveRoadmap(USER_A, minimalAdaptiveRoadmap(), null);
    const taskId = saved.phases[0].tasks[0].id;

    // getAdaptiveRoadmap scopes through the caller's own profile_id lookup,
    // so User B's call must return null rather than User A's roadmap.
    expect(await getAdaptiveRoadmap(USER_B)).toBeNull();
    const ownerRead = await getAdaptiveRoadmap(USER_A);
    expect(ownerRead?.id).toBe(saved.id);

    // updateTaskStatus filters only by task id — RLS alone must block this
    // from touching User A's task when called as User B.
    const attackerUpdate = await updateTaskStatus(USER_B, taskId, "completed");
    expect(attackerUpdate).toBeNull();

    const stillNotStarted = await getAdaptiveRoadmap(USER_A);
    expect(stillNotStarted?.phases[0].tasks[0].status).toBe("not-started");
  });
});
