import { describe, expect, it, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("@/lib/ai/anthropic-client", () => ({
  ANTHROPIC_MODEL: "claude-sonnet-5",
  getAnthropicClient: () => ({ messages: { create: createMock } }),
}));

const { extractJobDataWithAI } = await import("@/lib/jobs/ai-extractor");

const VALID_EXTRACTION = {
  title: "Software Engineer",
  company: "Acme",
  minExperienceYears: 2,
  preferredExperienceYears: null,
  educationRequirement: null,
  responsibilities: [],
  keywords: [],
  requirements: [],
  extractionConfidence: "high",
};

function toolUseResponse(input: unknown) {
  return { content: [{ type: "tool_use", input }] };
}

describe("extractJobDataWithAI", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("returns the parsed extraction on a valid first response", async () => {
    createMock.mockResolvedValueOnce(toolUseResponse(VALID_EXTRACTION));
    const result = await extractJobDataWithAI("some job text");
    expect(result?.title).toBe("Software Engineer");
    expect(createMock).toHaveBeenCalledTimes(1);
    const request = createMock.mock.calls[0]?.[0];
    expect(request.messages[0].content).toContain("Read qualifications at sentence level");
    expect(request.messages[0].content).toContain("Requirements, responsibilities, benefits, and company-description text are separate concepts");
  });

  it("retries once on a schema-invalid response and succeeds on the retry", async () => {
    createMock
      .mockResolvedValueOnce(toolUseResponse({ title: "missing everything else" }))
      .mockResolvedValueOnce(toolUseResponse(VALID_EXTRACTION));

    const result = await extractJobDataWithAI("some job text");
    expect(result?.title).toBe("Software Engineer");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after exhausting retries on a persistently schema-invalid response", async () => {
    createMock.mockResolvedValue(toolUseResponse({ title: "still broken" }));
    const result = await extractJobDataWithAI("some job text");
    expect(result).toBeNull();
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on a network/API error — fails fast to the fallback", async () => {
    createMock.mockRejectedValueOnce(new Error("network timeout"));
    const result = await extractJobDataWithAI("some job text");
    expect(result).toBeNull();
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
