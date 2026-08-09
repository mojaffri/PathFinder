import { describe, expect, it } from "vitest";
import type { JobDescription, JobRequirement } from "@/types/job";
import { computeSavedJobSkillFrequency } from "@/lib/roadmap/saved-job-signals";

function requirement(label: string, overrides: Partial<JobRequirement> = {}): JobRequirement {
  return { id: `req-${label}`, category: "required", kind: "skill", label, minYears: null, source: "ai", ...overrides };
}

function job(requirements: JobRequirement[], overrides: Partial<JobDescription> = {}): JobDescription {
  return {
    id: crypto.randomUUID(), rawText: "", title: null, company: null,
    minExperienceYears: null, preferredExperienceYears: null, educationRequirement: null,
    responsibilities: [], keywords: [], requirements,
    extractionMethod: "ai", extractionConfidence: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeSavedJobSkillFrequency", () => {
  it("returns an empty array for no saved jobs", () => {
    expect(computeSavedJobSkillFrequency([])).toEqual([]);
  });

  it("counts a single job's requirements at 100% each", () => {
    const result = computeSavedJobSkillFrequency([job([requirement("SQL"), requirement("Python")])]);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.percentage === 100 && r.count === 1 && r.savedJobCount === 1)).toBe(true);
  });

  it("computes correct percentage across multiple jobs", () => {
    const jobs = [
      job([requirement("SQL"), requirement("AWS")]),
      job([requirement("SQL")]),
      job([requirement("SQL"), requirement("Docker")]),
    ];
    const result = computeSavedJobSkillFrequency(jobs);
    const sql = result.find((r) => r.skill === "SQL")!;
    expect(sql.count).toBe(3);
    expect(sql.percentage).toBe(100);
    expect(sql.savedJobCount).toBe(3);

    const aws = result.find((r) => r.skill === "AWS")!;
    expect(aws.count).toBe(1);
    expect(aws.percentage).toBe(33);
  });

  it("sorts descending by count", () => {
    const jobs = [job([requirement("SQL"), requirement("AWS")]), job([requirement("SQL")])];
    const result = computeSavedJobSkillFrequency(jobs);
    expect(result[0].skill).toBe("SQL");
  });

  it("counts a requirement only once per job even if it appears twice on the same job", () => {
    const result = computeSavedJobSkillFrequency([job([requirement("SQL"), requirement("SQL", { category: "preferred" })])]);
    expect(result.find((r) => r.skill === "SQL")?.count).toBe(1);
  });

  it("never divides by zero when a job has no requirements at all", () => {
    const result = computeSavedJobSkillFrequency([job([])]);
    expect(result).toEqual([]);
  });
});
