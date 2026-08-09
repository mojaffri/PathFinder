import { computeSkillConfidence, type SkillConfidenceContext } from "@/lib/evidence/confidence";
import { normalizeText } from "@/lib/matching/evidence";
import type { JobDescription, SavedJobInsights, SavedJobSkillInsight } from "@/types";

/** Personalized aggregation over only the caller's saved postings. */
export function computeSavedJobInsights(jobs: JobDescription[], context: SkillConfidenceContext | null): SavedJobInsights {
  const bySkill = new Map<string, { skill: string; required: Set<string>; preferred: Set<string> }>();

  for (const job of jobs) {
    for (const requirement of job.requirements) {
      if (requirement.kind !== "skill" && requirement.kind !== "tool") continue;
      const key = normalizeText(requirement.label);
      if (!key) continue;
      const entry = bySkill.get(key) ?? { skill: requirement.label, required: new Set(), preferred: new Set() };
      entry[requirement.category].add(job.id);
      bySkill.set(key, entry);
    }
  }

  const skills: SavedJobSkillInsight[] = [...bySkill.values()].map((entry) => {
    const allJobs = new Set([...entry.required, ...entry.preferred]);
    const confidence = context ? computeSkillConfidence(entry.skill, context) : null;
    const evidenceScore = confidence?.overallScore ?? 0;
    const evidence: SavedJobSkillInsight["evidence"] = evidenceScore >= 65 ? "Strong" : evidenceScore >= 25 ? "Partial" : "Missing";
    return {
      skill: entry.skill,
      totalJobs: allJobs.size,
      requiredJobs: entry.required.size,
      preferredJobs: entry.preferred.size,
      frequencyPercent: jobs.length ? Math.round((allJobs.size / jobs.length) * 100) : 0,
      requiredFrequencyPercent: jobs.length ? Math.round((entry.required.size / jobs.length) * 100) : 0,
      preferredFrequencyPercent: jobs.length ? Math.round((entry.preferred.size / jobs.length) * 100) : 0,
      evidence,
      evidenceScore,
    };
  }).sort((a, b) => b.frequencyPercent - a.frequencyPercent || b.requiredFrequencyPercent - a.requiredFrequencyPercent || a.skill.localeCompare(b.skill));

  const opportunity = skills
    .filter((skill) => skill.evidence !== "Strong")
    .sort((a, b) => (b.frequencyPercent * (100 - b.evidenceScore)) - (a.frequencyPercent * (100 - a.evidenceScore)))[0];

  return {
    savedJobCount: jobs.length,
    skills,
    recommendation: opportunity ? `${opportunity.skill} currently offers the highest potential improvement in coverage across your saved jobs.` : null,
    basisLabel: `Based only on your ${jobs.length} saved job${jobs.length === 1 ? "" : "s"} — not the broader labor market.`,
  };
}
