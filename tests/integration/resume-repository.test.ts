import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, insertAuthUser, closeTestDb, type TestDb } from "./db";
import {
  deleteResume,
  getResumeById,
  listResumeStoragePaths,
  listResumes,
  saveResume,
  setActiveResume,
  setResumeStoragePath,
  updateResumeExtraction,
} from "@/repositories/resume-repository";
import { getProfileByUserId } from "@/repositories/profile-repository";

const USER_ID = "66666666-6666-4666-8666-666666666666";

function upload(overrides: Partial<Parameters<typeof saveResume>[1]> = {}) {
  return saveResume(USER_ID, {
    fileName: "resume.pdf",
    fileType: "pdf",
    fileSizeBytes: 12345,
    storagePath: null,
    rawText: "Some resume text",
    extractionMethod: "heuristic",
    extractionConfidence: "medium",
    ...overrides,
  });
}

describe("resume-repository", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createTestDb();
    await insertAuthUser(testDb, USER_ID, "resume-user@example.com");
  });

  afterAll(async () => {
    await closeTestDb(testDb);
  });

  it("lazily creates a profile row on first upload — resume upload doesn't require onboarding first", async () => {
    expect(await getProfileByUserId(USER_ID)).toBeNull();
    await upload();
    expect(await getProfileByUserId(USER_ID)).not.toBeNull();
  });

  it("every new upload becomes the active resume, deactivating the previous one", async () => {
    const first = await upload({ fileName: "v1.pdf" });
    let versions = await listResumes(USER_ID);
    expect(versions.find((v) => v.id === first.id)?.isActive).toBe(true);

    const second = await upload({ fileName: "v2.pdf" });
    versions = await listResumes(USER_ID);
    expect(versions.find((v) => v.id === second.id)?.isActive).toBe(true);
    expect(versions.find((v) => v.id === first.id)?.isActive).toBe(false);
  });

  it("setActiveResume switches which version is active", async () => {
    const first = await upload({ fileName: "a.pdf" });
    const second = await upload({ fileName: "b.pdf" });

    const found = await setActiveResume(USER_ID, first.id);
    expect(found).toBe(true);

    const versions = await listResumes(USER_ID);
    expect(versions.find((v) => v.id === first.id)?.isActive).toBe(true);
    expect(versions.find((v) => v.id === second.id)?.isActive).toBe(false);
  });

  it("setActiveResume returns false for a nonexistent id, without throwing", async () => {
    const found = await setActiveResume(USER_ID, "00000000-0000-4000-8000-000000000000");
    expect(found).toBe(false);
  });

  it("re-analysis updates the stored extraction method/confidence in place", async () => {
    const resume = await upload({ extractionMethod: "heuristic", extractionConfidence: "low" });
    await updateResumeExtraction(USER_ID, resume.id, { extractionMethod: "ai", extractionConfidence: "high" });

    const fetched = await getResumeById(USER_ID, resume.id);
    expect(fetched?.extractionMethod).toBe("ai");
    expect(fetched?.extractionConfidence).toBe("high");
  });

  it("stores a storage path once the file upload completes", async () => {
    const resume = await upload();
    await setResumeStoragePath(USER_ID, resume.id, `${resume.profileId}/${resume.id}.pdf`);
    const fetched = await getResumeById(USER_ID, resume.id);
    expect(fetched?.hasStoredFile).toBe(true);
  });

  it("deleteResume removes the row and returns its storage path", async () => {
    const resume = await upload();
    await setResumeStoragePath(USER_ID, resume.id, `${resume.profileId}/${resume.id}.pdf`);

    const deleted = await deleteResume(USER_ID, resume.id);
    expect(deleted?.storagePath).toBe(`${resume.profileId}/${resume.id}.pdf`);
    expect(await getResumeById(USER_ID, resume.id)).toBeNull();
  });

  it("lists only persisted original-file paths for account cleanup", async () => {
    await upload({ fileName: "stored.pdf", storagePath: "profile/stored.pdf" });
    await upload({ fileName: "text-only.pdf", storagePath: null });
    expect(await listResumeStoragePaths(USER_ID)).toContain("profile/stored.pdf");
    expect(await listResumeStoragePaths(USER_ID)).not.toContain(null);
  });
});
