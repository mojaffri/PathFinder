import { describe, expect, it } from "vitest";
import { extractJobDataHeuristically } from "@/lib/jobs/heuristic-extractor";
import { JobExtractionSchema } from "@/lib/jobs/schema";

const SAMPLE_POSTING = `Software Engineer

We are hiring at Acme Corp for a backend role.

Requirements
- 3+ years of experience with Python
- Strong knowledge of SQL and PostgreSQL
- Bachelor's degree in Computer Science or related field

Preferred Qualifications
- Experience with AWS
- Familiarity with Docker

Responsibilities
- Build and maintain backend services
- Collaborate with the product team
`;

describe("extractJobDataHeuristically", () => {
  it("produces output that validates against the shared JobExtractionSchema", () => {
    const result = extractJobDataHeuristically(SAMPLE_POSTING);
    expect(JobExtractionSchema.safeParse(result).success).toBe(true);
  });

  it("classifies requirements-section skills as required and preferred-section skills as preferred", () => {
    const result = extractJobDataHeuristically(SAMPLE_POSTING);
    const python = result.requirements.find((r) => r.label === "Python");
    const aws = result.requirements.find((r) => r.label === "AWS");
    expect(python?.category).toBe("required");
    expect(aws?.category).toBe("preferred");
  });

  it("captures responsibilities separately from requirements", () => {
    const result = extractJobDataHeuristically(SAMPLE_POSTING);
    expect(result.responsibilities.length).toBeGreaterThan(0);
  });

  it("never throws on empty or garbage input, and returns low confidence", () => {
    const result = extractJobDataHeuristically("");
    expect(JobExtractionSchema.safeParse(result).success).toBe(true);
    expect(result.extractionConfidence).toBe("low");
    expect(result.requirements).toEqual([]);
  });
});
