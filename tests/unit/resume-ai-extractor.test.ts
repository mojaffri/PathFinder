import { beforeEach, describe, expect, it, vi } from "vitest";

const requestStructuredAIMock = vi.fn();

vi.mock("@/lib/ai/structured-output", () => ({
  requestStructuredAI: requestStructuredAIMock,
}));

const { extractResumeDataWithAI } = await import("@/lib/resume/ai-extractor");

const VALID_EXTRACTION = {
  educationStage: "college-junior",
  education: [],
  experience: [],
  projects: [],
  awards: [],
  certifications: [],
  skills: ["Python"],
  extractionConfidence: "high",
  followUpQuestions: [],
};

describe("extractResumeDataWithAI", () => {
  beforeEach(() => requestStructuredAIMock.mockReset());

  it("uses schema-constrained structured output with explicit section boundaries", async () => {
    requestStructuredAIMock.mockResolvedValueOnce({ data: VALID_EXTRACTION });
    const result = await extractResumeDataWithAI("resume text");

    expect(result).toEqual(VALID_EXTRACTION);
    expect(requestStructuredAIMock).toHaveBeenCalledWith(expect.objectContaining({
      feature: "resume-extraction",
      toolName: "extract_resume_data",
      timeoutMs: 25_000,
      prompt: expect.stringContaining("Keep Certifications separate from Awards"),
    }));
  });

  it("returns null so the deterministic fallback can run when structured extraction fails", async () => {
    requestStructuredAIMock.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(extractResumeDataWithAI("resume text")).resolves.toBeNull();
  });

  it("forwards image-only PDFs for visual document extraction", async () => {
    requestStructuredAIMock.mockResolvedValueOnce({ data: VALID_EXTRACTION });
    const document = { mediaType: "application/pdf" as const, data: "base64-pdf", title: "resume.pdf" };

    await extractResumeDataWithAI("", document);

    expect(requestStructuredAIMock).toHaveBeenCalledWith(expect.objectContaining({
      document,
      prompt: expect.stringContaining("No text layer was available"),
    }));
  });
});
