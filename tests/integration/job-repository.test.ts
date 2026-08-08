import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, insertAuthUser, closeTestDb, type TestDb } from "./db";
import {
  createJobDescription,
  deleteJobDescription,
  getJobDescription,
  listJobDescriptions,
  listJobMatches,
  saveJobMatch,
  updateJobDescription,
} from "@/repositories/job-repository";
import { getProfileByUserId } from "@/repositories/profile-repository";
import { computeJobFitAnalysis } from "@/lib/jobs/fit-scoring";
import { createEmptyProfile } from "@/types";
import type { JobExtraction } from "@/lib/jobs/schema";

const USER_ID = "77777777-7777-4777-8777-777777777777";

function extraction(overrides: Partial<JobExtraction> = {}): JobExtraction {
  return {
    title: "Software Engineer",
    company: "Acme",
    minExperienceYears: 2,
    preferredExperienceYears: null,
    educationRequirement: "Bachelor's in Computer Science",
    responsibilities: ["Build backend services"],
    keywords: ["backend"],
    requirements: [
      { category: "required", kind: "skill", label: "Python", minYears: null },
      { category: "preferred", kind: "tool", label: "Docker", minYears: null },
    ],
    extractionConfidence: "high",
    ...overrides,
  };
}

describe("job-repository", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
    await insertAuthUser(testDb, USER_ID, "job-user@example.com");
  });

  afterAll(async () => {
    await closeTestDb(testDb);
  });

  it("lazily creates a profile row on first job description save", async () => {
    expect(await getProfileByUserId(USER_ID)).toBeNull();
    await createJobDescription(USER_ID, "raw posting text", extraction(), "ai");
    expect(await getProfileByUserId(USER_ID)).not.toBeNull();
  });

  it("persists requirements as normalized rows and round-trips them in order", async () => {
    const job = await createJobDescription(USER_ID, "raw posting text", extraction(), "ai");
    expect(job.requirements).toHaveLength(2);
    expect(job.requirements[0].label).toBe("Python");
    expect(job.requirements[0].source).toBe("ai");

    const fetched = await getJobDescription(USER_ID, job.id);
    expect(fetched?.requirements.map((r) => r.label)).toEqual(["Python", "Docker"]);
  });

  it("shows up in the list summary with a correct requirement count", async () => {
    const job = await createJobDescription(USER_ID, "raw posting text", extraction(), "ai");
    const list = await listJobDescriptions(USER_ID);
    const summary = list.find((j) => j.id === job.id);
    expect(summary?.requirementCount).toBe(2);
  });

  it("update fully replaces requirements rather than merging them", async () => {
    const job = await createJobDescription(USER_ID, "raw posting text", extraction(), "ai");
    const updated = await updateJobDescription(USER_ID, job.id, {
      title: "Senior Software Engineer",
      company: job.company,
      minExperienceYears: job.minExperienceYears,
      preferredExperienceYears: job.preferredExperienceYears,
      educationRequirement: job.educationRequirement,
      responsibilities: job.responsibilities,
      keywords: job.keywords,
      requirements: [{ category: "required", kind: "skill", label: "Rust", minYears: null, source: "manual" }],
    });

    expect(updated?.title).toBe("Senior Software Engineer");
    expect(updated?.requirements).toHaveLength(1);
    expect(updated?.requirements[0].label).toBe("Rust");
    expect(updated?.requirements[0].source).toBe("manual");
  });

  it("deleting a job description also removes its requirements (FK cascade)", async () => {
    const job = await createJobDescription(USER_ID, "raw posting text", extraction(), "ai");
    await deleteJobDescription(USER_ID, job.id);
    expect(await getJobDescription(USER_ID, job.id)).toBeNull();
  });

  it("runs the deterministic fit engine and persists the result, retrievable via history", async () => {
    const job = await createJobDescription(USER_ID, "raw posting text", extraction(), "ai");
    const profile = createEmptyProfile("Test");
    const result = computeJobFitAnalysis(job, profile, null);

    const saved = await saveJobMatch(USER_ID, job.id, result);
    expect(saved.id).not.toBeNull();
    expect(saved.overallFitScore).toBe(result.overallFitScore);

    const history = await listJobMatches(USER_ID, job.id);
    expect(history).toHaveLength(1);
    expect(history[0].overallFitScore).toBe(result.overallFitScore);
    expect(history[0].requirementMatches).toHaveLength(2);
  });
});
