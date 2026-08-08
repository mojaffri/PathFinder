import { clamp, fuzzyIncludes } from "@/lib/matching/evidence";
import { gatherEvidenceForSkill, type SkillConfidenceContext } from "@/lib/evidence/confidence";
import type {
  EvidenceStrengthLevel,
  JobDescription,
  JobFitAnalysis,
  JobFitComponentKey,
  JobFitComponentScore,
  JobFitRecommendation,
  JobRequirement,
  RequirementMatch,
  RequirementMatchStatus,
  SkillEvidenceRecord,
  StudentProfile,
} from "@/types";

/**
 * Deterministic job-fit scoring: a specific saved job description's
 * requirements against a student's structured profile. No LLM anywhere in
 * this file — the AI's only role in the job-analysis pipeline is parsing
 * the posting's free text into `JobRequirement` rows
 * (`lib/jobs/ai-extractor.ts`); comparing those rows against the profile is
 * pure, explainable, and unit-testable, mirroring
 * `lib/gap-analysis/engine.ts`'s split between deterministic analysis and
 * AI-authored narrative.
 *
 * Skill/tool requirement matches reuse `lib/evidence/confidence.ts`'s
 * `gatherEvidenceForSkill()` — the exact same evidence a skill's confidence
 * report is built from (profile skills, experience, projects, GitHub
 * analyses, SkillForge assessments, manual entries) — so a requirement's
 * "evidence" always points at something real and clickable (a project, a
 * role, a repo) instead of a plain-text label, and never drifts out of sync
 * with what `/projects` shows for that same skill.
 */

const EVIDENCE_CONTEXT_DEFAULTS: Omit<SkillConfidenceContext, "profile"> = {
  skillForgeModules: [],
  skillForgeProgress: {},
  githubRepos: [],
  manualEvidence: [],
};

const STRENGTH_RANK: Record<EvidenceStrengthLevel, number> = { weak: 1, moderate: 2, strong: 3 };

function strongestStrength(records: SkillEvidenceRecord[]): EvidenceStrengthLevel | null {
  if (records.length === 0) return null;
  return records.reduce<EvidenceStrengthLevel>(
    (best, r) => (STRENGTH_RANK[r.evidenceStrength] > STRENGTH_RANK[best] ? r.evidenceStrength : best),
    records[0].evidenceStrength,
  );
}

function syntheticEvidence(input: Omit<SkillEvidenceRecord, "id" | "origin" | "createdAt" | "verificationStatus"> & { id: string }): SkillEvidenceRecord {
  return { ...input, verificationStatus: "self-reported", origin: "auto", createdAt: new Date().toISOString() };
}

const COMPONENT_WEIGHTS: Record<JobFitComponentKey, { label: string; weight: number }> = {
  requiredSkillCoverage: { label: "Required-skill coverage", weight: 30 },
  preferredSkillCoverage: { label: "Preferred-skill coverage", weight: 10 },
  experienceMatch: { label: "Experience match", weight: 20 },
  educationMatch: { label: "Education match", weight: 15 },
  evidenceStrength: { label: "Evidence strength", weight: 15 },
  projectRelevance: { label: "Project relevance", weight: 10 },
};

const STATUS_SCORE: Record<RequirementMatchStatus, number> = { strong: 100, partial: 50, missing: 0 };

function parseYear(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

/** Best-effort estimate from free-text resume dates — unparseable entries count as ~6 months rather than 0, so a real but undated role still contributes some signal. */
function estimateYearsOfExperience(profile: StudentProfile): number {
  let totalMonths = 0;
  for (const entry of profile.experience) {
    const start = parseYear(entry.startDate);
    const end = entry.endDate && /present/i.test(entry.endDate) ? new Date().getFullYear() : parseYear(entry.endDate);
    if (start !== null && end !== null && end >= start) {
      totalMonths += (end - start) * 12 || 6;
    } else {
      totalMonths += 6;
    }
  }
  return Math.round((totalMonths / 12) * 10) / 10;
}

function matchSkillOrTool(req: JobRequirement, context: SkillConfidenceContext): RequirementMatch {
  const evidence = gatherEvidenceForSkill(req.label, context);
  const strongest = strongestStrength(evidence);
  // "moderate" real evidence (one clear demonstrated/professional use) reads
  // as a genuinely strong match for a SPECIFIC requirement — a stricter bar
  // than `computeSkillConfidence`'s own "high"/"very-high" bands, which need
  // corroboration across dimensions. A "weak" match (a bare resume tag, no
  // corroborating use) stays "partial," same as before this evidence
  // system existed.
  const status: RequirementMatchStatus = strongest === "strong" || strongest === "moderate" ? "strong" : strongest === "weak" ? "partial" : "missing";
  const confidence = strongest === "strong" ? 90 : strongest === "moderate" ? 75 : strongest === "weak" ? 35 : 0;
  const gapExplanation =
    status === "missing"
      ? `No evidence of ${req.label} anywhere in your profile.`
      : status === "partial"
        ? `Limited evidence of ${req.label} — it's listed but not clearly demonstrated in a project or role yet.`
        : null;

  return { requirementId: req.id, label: req.label, category: req.category, kind: req.kind, status, confidence, evidence, gapExplanation };
}

function matchExperience(req: JobRequirement, profile: StudentProfile): RequirementMatch {
  const years = estimateYearsOfExperience(profile);
  const required = req.minYears ?? 0;

  let status: RequirementMatchStatus;
  let confidence: number;
  if (required === 0) {
    status = profile.experience.length > 0 ? "strong" : "missing";
    confidence = status === "strong" ? 80 : 0;
  } else {
    const ratio = years / required;
    status = ratio >= 1 ? "strong" : ratio >= 0.5 ? "partial" : "missing";
    confidence = clamp(Math.round(ratio * 100));
  }

  const evidence = profile.experience.slice(0, 3).map((e) =>
    syntheticEvidence({
      id: `experience-${e.id}`,
      skillName: req.label,
      sourceType: "experience",
      sourceLabel: [e.title, e.organization].filter(Boolean).join(" at ") || "Work experience",
      sourceRefType: "experience",
      sourceRefId: e.id,
      evidenceStrength: "moderate",
      explanation: [e.startDate, e.endDate].filter(Boolean).join(" – ") || "Dates not specified on your profile.",
      occurredOn: e.endDate ?? e.startDate,
    }),
  );
  const gapExplanation =
    status === "strong"
      ? null
      : `Roughly ${years} year${years === 1 ? "" : "s"} of estimated experience vs. ${required || "an unspecified amount"} required.`;

  return { requirementId: req.id, label: req.label, category: req.category, kind: req.kind, status, confidence, evidence, gapExplanation };
}

function matchEducation(req: JobRequirement, profile: StudentProfile): RequirementMatch {
  const educationText = profile.education.flatMap((e) => [e.degree ?? "", e.major ?? "", e.institution ?? ""]);
  const matched = fuzzyIncludes(educationText, req.label) || (profile.major.length > 0 && fuzzyIncludes([profile.major], req.label));

  const status: RequirementMatchStatus = matched ? "strong" : profile.education.length > 0 ? "partial" : "missing";
  const confidence = matched ? 90 : profile.education.length > 0 ? 40 : 0;
  const matchedEntry = matched ? profile.education.find((e) => fuzzyIncludes([e.degree ?? "", e.major ?? "", e.institution ?? ""], req.label)) ?? profile.education[0] : null;
  const evidence = matchedEntry
    ? [
        syntheticEvidence({
          id: `education-${matchedEntry.id}`,
          skillName: req.label,
          sourceType: "coursework",
          sourceLabel: [matchedEntry.degree, matchedEntry.institution].filter(Boolean).join(" · ") || "Education",
          sourceRefType: "education",
          sourceRefId: matchedEntry.id,
          evidenceStrength: matched ? "moderate" : "weak",
          explanation: matchedEntry.major ? `Major: ${matchedEntry.major}` : "Listed on your profile.",
          occurredOn: matchedEntry.endDate ?? matchedEntry.startDate,
        }),
      ]
    : [];
  const gapExplanation = matched ? null : `Your education doesn't clearly match "${req.label}".`;

  return { requirementId: req.id, label: req.label, category: req.category, kind: req.kind, status, confidence, evidence, gapExplanation };
}

function matchRequirement(req: JobRequirement, profile: StudentProfile, context: SkillConfidenceContext): RequirementMatch {
  if (req.kind === "experience") return matchExperience(req, profile);
  if (req.kind === "education") return matchEducation(req, profile);
  return matchSkillOrTool(req, context);
}

function coverageScore(matches: RequirementMatch[]): number {
  if (matches.length === 0) return 100; // nothing in this category to fail
  const avg = matches.reduce((sum, m) => sum + STATUS_SCORE[m.status], 0) / matches.length;
  return clamp(Math.round(avg));
}

function computeExperienceMatchScore(matches: RequirementMatch[], job: JobDescription, profile: StudentProfile): number {
  const experienceMatches = matches.filter((m) => m.kind === "experience");
  if (experienceMatches.length > 0) return coverageScore(experienceMatches);

  const required = job.minExperienceYears ?? 0;
  if (required === 0) return profile.experience.length > 0 ? 80 : 50;
  const years = estimateYearsOfExperience(profile);
  return clamp(Math.round((years / required) * 100));
}

function computeEducationMatchScore(matches: RequirementMatch[], job: JobDescription, profile: StudentProfile): number {
  const educationMatches = matches.filter((m) => m.kind === "education");
  if (educationMatches.length > 0) return coverageScore(educationMatches);

  if (!job.educationRequirement) return 70; // nothing stated — neutral-positive rather than penalized
  const educationText = profile.education.flatMap((e) => [e.degree ?? "", e.major ?? ""]);
  if (fuzzyIncludes(educationText, job.educationRequirement)) return 90;
  return profile.education.length > 0 ? 55 : 30;
}

function computeProjectRelevanceScore(job: JobDescription, profile: StudentProfile): number {
  const skillLabels = job.requirements.filter((r) => r.kind === "skill" || r.kind === "tool").map((r) => r.label);
  if (profile.projects.length === 0) return 20;
  if (skillLabels.length === 0) return 50;

  const relevant = profile.projects.filter((p) => {
    const text = [p.title, p.summary ?? "", ...p.bullets, ...p.technologies];
    return skillLabels.some((skill) => fuzzyIncludes(text, skill));
  });
  return clamp(Math.round((relevant.length / profile.projects.length) * 100));
}

function priorityFor(match: RequirementMatch): JobFitRecommendation["priority"] {
  if (match.category === "required" && match.status === "missing") return "high";
  if (match.category === "required" && match.status === "partial") return "medium";
  if (match.category === "preferred" && match.status === "missing") return "medium";
  return "low";
}

/**
 * Ranks the highest-leverage gaps to close, factoring required-vs-preferred
 * and current evidence strength (a missing required item outranks a partial
 * preferred one). Effort is approximated from the requirement's `kind` —
 * skills/tools are addressable with a focused project, experience/education
 * gaps structurally take longer — deliberately simple, per the task's own
 * "don't overcomplicate this before the skill graph phase" guidance.
 */
export function prioritizeGaps(matches: RequirementMatch[]): JobFitRecommendation[] {
  const rank: Record<JobFitRecommendation["priority"], number> = { high: 3, medium: 2, low: 1 };

  return matches
    .filter((m) => m.status !== "strong")
    .map((m) => {
      const priority = priorityFor(m);
      const isSlowToBuild = m.kind === "experience" || m.kind === "education";
      const title = m.status === "missing" ? `Build evidence for ${m.label}` : `Strengthen your evidence for ${m.label}`;
      const rationale =
        m.kind === "skill" || m.kind === "tool"
          ? `Add a deployed project or role that visibly uses ${m.label} — it's a ${m.category} requirement with ${m.status === "missing" ? "no" : "weak"} current evidence.`
          : `${m.gapExplanation ?? `Address the ${m.label} requirement`}${isSlowToBuild ? " — this one structurally takes longer to build than a single project." : ""}`;
      return { requirementId: m.requirementId, title, rationale, priority };
    })
    .sort((a, b) => rank[b.priority] - rank[a.priority])
    .slice(0, 8);
}

export function computeJobFitAnalysis(
  job: JobDescription,
  profile: StudentProfile,
  resumeId: string | null,
  evidenceContext?: Omit<SkillConfidenceContext, "profile">,
): JobFitAnalysis {
  const context: SkillConfidenceContext = { profile, ...(evidenceContext ?? EVIDENCE_CONTEXT_DEFAULTS) };
  const requirementMatches = job.requirements.map((req) => matchRequirement(req, profile, context));

  const requiredMatches = requirementMatches.filter((m) => m.category === "required");
  const preferredMatches = requirementMatches.filter((m) => m.category === "preferred");

  const scoreValues: Record<JobFitComponentKey, number> = {
    requiredSkillCoverage: coverageScore(requiredMatches),
    preferredSkillCoverage: coverageScore(preferredMatches),
    experienceMatch: computeExperienceMatchScore(requirementMatches, job, profile),
    educationMatch: computeEducationMatchScore(requirementMatches, job, profile),
    evidenceStrength:
      requirementMatches.length > 0
        ? clamp(Math.round(requirementMatches.reduce((sum, m) => sum + m.confidence, 0) / requirementMatches.length))
        : 50,
    projectRelevance: computeProjectRelevanceScore(job, profile),
  };

  const componentScores: JobFitComponentScore[] = (Object.keys(COMPONENT_WEIGHTS) as JobFitComponentKey[]).map((key) => ({
    key,
    label: COMPONENT_WEIGHTS[key].label,
    weight: COMPONENT_WEIGHTS[key].weight,
    score: scoreValues[key],
  }));

  const totalWeight = componentScores.reduce((sum, c) => sum + c.weight, 0);
  const overallFitScore = clamp(Math.round(componentScores.reduce((sum, c) => sum + c.weight * c.score, 0) / totalWeight));

  return {
    id: null,
    jobDescriptionId: job.id,
    resumeId,
    overallFitScore,
    componentScores,
    requirementMatches,
    topRecommendations: prioritizeGaps(requirementMatches),
    createdAt: null,
  };
}
