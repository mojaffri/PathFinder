import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, insertAuthUser, closeTestDb, type TestDb } from "./db";
import {
  completeOnboarding,
  createProfile,
  deleteProfile,
  getProfileByUserId,
  markAsDemo,
  updateProfile,
  type ProfileWriteInput,
} from "@/repositories/profile-repository";
import { DEFAULT_WORK_PREFERENCES } from "@/types";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function baseInput(overrides: Partial<ProfileWriteInput> = {}): ProfileWriteInput {
  return {
    name: "Ada Lovelace",
    age: 21,
    educationStage: "college-junior",
    school: "State University",
    major: "Computer Science",
    gpaRaw: 3.8,
    gpaScale: "4.0",
    targetIndustry: "Technology",
    targetCareers: ["Software Engineer"],
    currentSkills: ["Python", "SQL"],
    interests: ["compilers"],
    education: [
      { id: "e1", institution: "State University", degree: "B.S.", major: "CS", gpa: 3.8, gpaScale: "4.0", startDate: "2022-08", endDate: "2026-05" },
    ],
    experience: [],
    projects: [],
    awards: [],
    certifications: [],
    careerGoals: "Become a great software engineer.",
    workPreferences: DEFAULT_WORK_PREFERENCES,
    weeklyHoursAvailable: 10,
    preferredLocations: ["Remote"],
    employmentPreference: "internship",
    targetDate: "2026-05-01",
    ...overrides,
  };
}

describe("profile-repository", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
    await insertAuthUser(testDb, USER_ID, "ada@example.com");
  });

  afterAll(async () => {
    await closeTestDb(testDb);
  });

  it("returns null for a user with no profile yet", async () => {
    const profile = await getProfileByUserId(USER_ID);
    expect(profile).toBeNull();
  });

  it("creates a profile and round-trips every field, including child collections", async () => {
    const created = await createProfile(USER_ID, baseInput());

    expect(created.name).toBe("Ada Lovelace");
    expect(created.gpa.raw).toBe(3.8);
    expect(created.gpa.scale).toBe("4.0");
    expect(created.targetCareers).toEqual(["Software Engineer"]);
    expect(created.currentSkills).toEqual(["Python", "SQL"]);
    expect(created.preferredLocations).toEqual(["Remote"]);
    expect(created.employmentPreference).toBe("internship");
    expect(created.education).toHaveLength(1);
    expect(created.education[0].institution).toBe("State University");
    expect(created.onboardingCompletedAt).toBeNull();
    expect(created.isDemo).toBe(false);

    const fetched = await getProfileByUserId(USER_ID);
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.education).toHaveLength(1);
  });

  it("update fully replaces child collections rather than merging them", async () => {
    const updated = await updateProfile(
      USER_ID,
      baseInput({
        currentSkills: ["Rust"],
        education: [],
        projects: [{ id: "p1", title: "New project", technologies: ["Rust"], date: null, summary: null, bullets: [], githubUrl: null }],
      }),
    );

    expect(updated.currentSkills).toEqual(["Rust"]);
    expect(updated.education).toHaveLength(0);
    expect(updated.projects).toHaveLength(1);
    expect(updated.projects[0].title).toBe("New project");
  });

  it("completeOnboarding sets a timestamp and is idempotent", async () => {
    const first = await completeOnboarding(USER_ID);
    expect(first.onboardingCompletedAt).not.toBeNull();

    const second = await completeOnboarding(USER_ID);
    expect(second.onboardingCompletedAt).not.toBeNull();
  });

  it("markAsDemo flags the account and completes onboarding", async () => {
    const demo = await markAsDemo(USER_ID);
    expect(demo.isDemo).toBe(true);
    expect(demo.onboardingCompletedAt).not.toBeNull();
  });

  it("deleteProfile removes the profile entirely", async () => {
    await deleteProfile(USER_ID);
    const afterDelete = await getProfileByUserId(USER_ID);
    expect(afterDelete).toBeNull();
  });
});
