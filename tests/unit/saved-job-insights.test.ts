import { describe, expect, it } from "vitest";
import { computeSavedJobInsights } from "@/lib/jobs/saved-job-insights";
import type { JobDescription, JobRequirement } from "@/types";

const requirement = (label: string, category: "required" | "preferred" = "required"): JobRequirement => ({ id: crypto.randomUUID(), label, category, kind: "skill", minYears: null, source: "ai" });
const job = (requirements: JobRequirement[]): JobDescription => ({ id: crypto.randomUUID(), rawText: "", title: null, company: null, minExperienceYears: null, preferredExperienceYears: null, educationRequirement: null, responsibilities: [], keywords: [], requirements, extractionMethod: "ai", extractionConfidence: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

describe("computeSavedJobInsights", () => {
  it("labels empty data as the user's own zero saved jobs", () => {
    const result = computeSavedJobInsights([], null);
    expect(result.savedJobCount).toBe(0);
    expect(result.skills).toEqual([]);
    expect(result.basisLabel).toContain("your 0 saved jobs");
  });

  it("separates required and preferred frequency without double-counting a job", () => {
    const result = computeSavedJobInsights([
      job([requirement("SQL"), requirement("SQL", "preferred"), requirement("AWS")]),
      job([requirement("SQL"), requirement("Docker", "preferred")]),
    ], null);
    const sql = result.skills.find((skill) => skill.skill === "SQL")!;
    expect(sql.frequencyPercent).toBe(100);
    expect(sql.requiredFrequencyPercent).toBe(100);
    expect(sql.preferredFrequencyPercent).toBe(50);
    expect(sql.evidence).toBe("Missing");
  });

  it("recommends the recurring missing skill with greatest coverage upside", () => {
    const result = computeSavedJobInsights([job([requirement("AWS"), requirement("SQL")]), job([requirement("AWS")])], null);
    expect(result.recommendation).toContain("AWS");
  });
});
