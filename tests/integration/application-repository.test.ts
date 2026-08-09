import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeTestDb, createTestDb, insertAuthUser, type TestDb } from "./db";
import { createApplication, deleteApplication, listApplications, updateApplication } from "@/repositories/application-repository";
import { listActivityEvents } from "@/repositories/activity-repository";
import { consumeRateLimit } from "@/repositories/rate-limit-repository";
import type { JobApplicationInput } from "@/types";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const input = (overrides: Partial<JobApplicationInput> = {}): JobApplicationInput => ({ jobDescriptionId: null, company: "Acme", title: "Software Engineer", jobDescription: "Build reliable services", sourceUrl: "https://example.com/job", fitScore: 72, applicationDate: null, currentStage: "saved", interviewDates: [], notes: "Tailor resume", gapsAtApplication: [{ label: "AWS", category: "required", status: "missing" }], ...overrides });

describe("application repository and API throttling", () => {
  let testDb: TestDb;
  beforeAll(async () => { testDb = await createTestDb(); await insertAuthUser(testDb, USER_A, "a@example.com"); await insertAuthUser(testDb, USER_B, "b@example.com"); });
  afterAll(async () => closeTestDb(testDb));

  it("round-trips the complete compact application record", async () => {
    const created = await createApplication(USER_A, input());
    expect(created.currentStage).toBe("saved");
    expect(created.gapsAtApplication[0].label).toBe("AWS");
    expect(created.fitScore).toBe(72);
    expect((await listApplications(USER_A)).some((item) => item.id === created.id)).toBe(true);
  });

  it("records stage-change history and preserves ownership", async () => {
    const created = await createApplication(USER_A, input());
    const updated = await updateApplication(USER_A, created.id, input({ currentStage: "phone_screen", applicationDate: "2026-08-09" }));
    expect(updated?.currentStage).toBe("phone_screen");
    expect(await updateApplication(USER_B, created.id, input({ currentStage: "offer" }))).toBeNull();
    expect((await listActivityEvents(USER_A)).some((event) => event.type === "application_stage_changed")).toBe(true);
    expect(await deleteApplication(USER_B, created.id)).toBe(false);
  });

  it("atomically denies requests beyond the per-window limit", async () => {
    expect((await consumeRateLimit(USER_A, "test", 2, 60)).allowed).toBe(true);
    expect((await consumeRateLimit(USER_A, "test", 2, 60)).allowed).toBe(true);
    expect((await consumeRateLimit(USER_A, "test", 2, 60)).allowed).toBe(false);
    expect((await consumeRateLimit(USER_B, "test", 2, 60)).allowed).toBe(true);
  });
});
