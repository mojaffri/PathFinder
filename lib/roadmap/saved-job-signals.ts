import type { JobDescription } from "@/types/job";
import type { SavedJobSkillFrequency } from "@/types/adaptive-roadmap";
import { normalizeText } from "@/lib/matching/evidence";

/**
 * Frequency of each requirement label across a student's OWN saved job
 * descriptions — deliberately personalized, never presented as general
 * labor-market statistics (per the adaptive-roadmap task brief's section 6:
 * "Clearly label this as personalized data, not general labor-market
 * statistics"). Every caller/UI surface must keep that framing (e.g. "Across
 * your N saved jobs", not "X% of jobs require...").
 */
export function computeSavedJobSkillFrequency(jobs: JobDescription[]): SavedJobSkillFrequency[] {
  const savedJobCount = jobs.length;
  if (savedJobCount === 0) return [];

  const byKey = new Map<string, { skill: string; count: number }>();
  for (const job of jobs) {
    // A requirement label appearing more than once on the SAME job (e.g.
    // required + a duplicate preferred entry) should still only count once
    // toward that job's contribution to frequency.
    const seenOnThisJob = new Set<string>();
    for (const req of job.requirements) {
      const key = normalizeText(req.label);
      if (!key || seenOnThisJob.has(key)) continue;
      seenOnThisJob.add(key);
      const entry = byKey.get(key) ?? { skill: req.label, count: 0 };
      entry.count += 1;
      byKey.set(key, entry);
    }
  }

  return [...byKey.values()]
    .map((entry) => ({
      skill: entry.skill,
      count: entry.count,
      percentage: Math.round((entry.count / savedJobCount) * 100),
      savedJobCount,
    }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
}
