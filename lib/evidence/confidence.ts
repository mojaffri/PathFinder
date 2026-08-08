import { fuzzyIncludes, normalizeText } from "@/lib/matching/evidence";
import { MASTERY_LEVELS } from "@/types";
import type {
  ConfidenceDimension,
  EvidenceSourceType,
  EvidenceStrengthLevel,
  GithubRepoRecord,
  SkillConfidenceComponent,
  SkillConfidenceLevel,
  SkillConfidenceScore,
  SkillEvidenceRecord,
  SkillModule,
  SkillProgress,
  StudentProfile,
} from "@/types";

/** Only the fields the confidence engine actually needs from a `SkillModule` — callers can pass the full catalog or a lightweight fixture in tests. */
export type SkillForgeModuleLike = Pick<SkillModule, "id" | "name">;

/**
 * Deterministic skill-confidence scoring — the core of "evidence-backed
 * skills rather than self-reported ones." No LLM anywhere in this file, per
 * the same deterministic-vs-AI split the rest of the app follows.
 *
 * Two responsibilities, deliberately kept separate:
 * 1. `aggregate*Evidence()` — derive `SkillEvidenceRecord`s from data that
 *    already exists (profile skills/experience/projects, SkillForge
 *    progress, analyzed GitHub repos) PLUS whatever the student manually
 *    added. Nothing here is persisted — it's recomputed fresh every call,
 *    same as `deriveTopMoves()`/`getDemonstratedGapIds()` elsewhere in this
 *    app, so it can never go stale relative to its inputs.
 * 2. `computeSkillConfidence()` — turn that evidence into one of five
 *    confidence bands. The formula is QUALITY-weighted, not count-based:
 *    a single self-report (`claimed`) is capped at a low weight and can
 *    never alone clear "Unverified," while one genuinely strong,
 *    independently-sourced piece of evidence (an assessed SkillForge score,
 *    a demonstrated project, professional experience) moves the needle far
 *    more than repeating the same weak signal. See docs/evidence-model.md
 *    for the full worked-through rationale and the exact weights/thresholds
 *    below, which are deliberately documented rather than "tuned in code."
 */

const SOURCE_TYPE_DIMENSION: Record<EvidenceSourceType, ConfidenceDimension> = {
  resume: "claimed",
  experience: "professional",
  project: "demonstrated",
  github_repo: "demonstrated",
  coursework: "demonstrated",
  publication: "demonstrated",
  certification: "assessed",
  assessment: "assessed",
};

const STRENGTH_SCORE: Record<EvidenceStrengthLevel, number> = { weak: 30, moderate: 60, strong: 100 };

const DIMENSION_LABEL: Record<ConfidenceDimension, string> = {
  claimed: "Claimed proficiency",
  assessed: "Assessed proficiency",
  demonstrated: "Demonstrated proficiency",
  professional: "Professional evidence",
};

/** Weights sum to 100 — a bare self-claim (claimed=10 max) can never alone reach "Moderate," while assessed+demonstrated (65 combined) dominate, reflecting that graded/shipped work is worth far more than a resume tag. */
const DIMENSION_WEIGHT: Record<ConfidenceDimension, number> = {
  claimed: 10,
  assessed: 30,
  demonstrated: 35,
  professional: 25,
};

function newId(...parts: string[]): string {
  return parts.map((p) => normalizeText(p) || "x").join("-");
}

function makeRecord(input: Omit<SkillEvidenceRecord, "id" | "origin" | "createdAt"> & { id: string }): SkillEvidenceRecord {
  return { ...input, origin: "auto", createdAt: new Date().toISOString() };
}

function claimedEvidence(skillName: string, profile: StudentProfile): SkillEvidenceRecord[] {
  if (!fuzzyIncludes(profile.currentSkills, skillName)) return [];
  return [
    makeRecord({
      id: newId("resume", skillName),
      skillName,
      sourceType: "resume",
      sourceLabel: "Listed on your profile",
      sourceRefType: null,
      sourceRefId: null,
      evidenceStrength: "weak",
      verificationStatus: "self-reported",
      explanation: `${skillName} is listed as a skill on your profile — a self-report, not yet demonstrated.`,
      occurredOn: null,
    }),
  ];
}

function professionalEvidence(skillName: string, profile: StudentProfile): SkillEvidenceRecord[] {
  const records: SkillEvidenceRecord[] = [];
  const matchingExperience = profile.experience.filter((exp) => fuzzyIncludes([exp.summary ?? "", ...exp.bullets], skillName));

  // A skill corroborated across two or more DIFFERENT roles is a genuinely
  // stronger signal than one mention — a bounded exception to "not
  // count-based" (repeating the same claim never helps; independent roles do).
  const strength: EvidenceStrengthLevel = matchingExperience.length >= 2 ? "strong" : "moderate";

  for (const exp of matchingExperience) {
    records.push(
      makeRecord({
        id: newId("experience", exp.id, skillName),
        skillName,
        sourceType: "experience",
        sourceLabel: [exp.title, exp.organization].filter(Boolean).join(" at ") || "Work experience",
        sourceRefType: "experience",
        sourceRefId: exp.id,
        evidenceStrength: strength,
        verificationStatus: "self-reported",
        explanation: `${skillName} appears in your experience${exp.organization ? ` at ${exp.organization}` : ""}.`,
        occurredOn: exp.endDate ?? exp.startDate,
      }),
    );
  }

  for (const cert of profile.certifications) {
    if (!fuzzyIncludes([cert.name], skillName) && !fuzzyIncludes([skillName], cert.name)) continue;
    records.push(
      makeRecord({
        id: newId("certification", cert.id, skillName),
        skillName,
        sourceType: "certification",
        sourceLabel: cert.name,
        sourceRefType: "certification",
        sourceRefId: cert.id,
        evidenceStrength: cert.issuer ? "moderate" : "weak",
        verificationStatus: "self-reported",
        explanation: `${cert.name}${cert.issuer ? ` (issued by ${cert.issuer})` : ""} is listed as a certification.`,
        occurredOn: cert.date,
      }),
    );
  }
  return records;
}

function demonstratedEvidence(skillName: string, profile: StudentProfile, githubRepos: GithubRepoRecord[]): SkillEvidenceRecord[] {
  const records: SkillEvidenceRecord[] = [];
  const linkedRepoUrls = new Set(profile.projects.map((p) => p.githubUrl).filter((u): u is string => !!u));

  for (const project of profile.projects) {
    const text = [project.title, project.summary ?? "", ...project.bullets, ...project.technologies];
    if (!fuzzyIncludes(text, skillName)) continue;

    const linkedRepo = project.githubUrl ? githubRepos.find((r) => r.htmlUrl === project.githubUrl) : undefined;
    const repoSignal = linkedRepo?.skillEvidence.find((s) => normalizeText(s.skill) === normalizeText(skillName));
    const strength: EvidenceStrengthLevel = repoSignal?.strength ?? (fuzzyIncludes(project.technologies, skillName) ? "moderate" : "weak");

    records.push(
      makeRecord({
        id: newId("project", project.id, skillName),
        skillName,
        sourceType: "project",
        sourceLabel: project.title,
        sourceRefType: "project",
        sourceRefId: project.id,
        evidenceStrength: strength,
        verificationStatus: "self-reported",
        explanation: repoSignal
          ? repoSignal.reason
          : `${skillName} is used in the "${project.title}" project.`,
        occurredOn: project.date,
      }),
    );
  }

  // Repos not yet linked to a profile project entry are still real evidence
  // — a student may have analyzed a repo without writing it up as a project.
  for (const repo of githubRepos) {
    if (linkedRepoUrls.has(repo.htmlUrl)) continue;
    const signal = repo.skillEvidence.find((s) => normalizeText(s.skill) === normalizeText(skillName));
    if (!signal) continue;
    records.push(
      makeRecord({
        id: newId("github", repo.id, skillName),
        skillName,
        sourceType: "github_repo",
        sourceLabel: repo.fullName,
        sourceRefType: "github_repo",
        sourceRefId: repo.id,
        evidenceStrength: signal.strength,
        verificationStatus: "self-reported",
        explanation: signal.reason,
        occurredOn: repo.metadata.pushedAt,
      }),
    );
  }

  for (const edu of profile.education) {
    if (!edu.major || (!fuzzyIncludes([edu.major], skillName) && !fuzzyIncludes([skillName], edu.major))) continue;
    records.push(
      makeRecord({
        id: newId("coursework", edu.id, skillName),
        skillName,
        sourceType: "coursework",
        sourceLabel: [edu.degree, edu.institution].filter(Boolean).join(" · ") || "Coursework",
        sourceRefType: "education",
        sourceRefId: edu.id,
        evidenceStrength: "weak",
        verificationStatus: "self-reported",
        explanation: `Your studies in ${edu.major} are adjacent to ${skillName}, but coursework alone doesn't demonstrate applied skill.`,
        occurredOn: edu.endDate ?? edu.startDate,
      }),
    );
  }

  return records;
}

/**
 * SkillForge's own assessed mastery, when the skill fuzzy-matches a
 * curated module the student has actually started. Returns both a
 * human-readable evidence record AND the raw 0-100 knowledge/ability
 * average, since the confidence formula uses the exact number (matching
 * the task's own worked example, "Assessment: 88/100") rather than
 * bucketing it down to weak/moderate/strong the way other dimensions are.
 */
function assessedEvidence(
  skillName: string,
  modules: SkillForgeModuleLike[],
  progressBySkillId: Record<string, SkillProgress>,
): { records: SkillEvidenceRecord[]; rawScore: number | null } {
  const catalogModule = modules.find((m) => fuzzyIncludes([m.name], skillName) || fuzzyIncludes([skillName], m.name));
  if (!catalogModule) return { records: [], rawScore: null };

  const progress = progressBySkillId[catalogModule.id];
  if (!progress || progress.startedAt === null) return { records: [], rawScore: null };

  const rawScore = Math.round((progress.mastery.dimensions.knowledge + progress.mastery.dimensions.ability) / 2);
  const levelLabel = MASTERY_LEVELS.find((l) => l.value === progress.mastery.level)?.label ?? progress.mastery.level;
  const strength: EvidenceStrengthLevel = rawScore >= 75 ? "strong" : rawScore >= 45 ? "moderate" : "weak";

  return {
    records: [
      makeRecord({
        id: newId("assessment", catalogModule.id, skillName),
        skillName,
        sourceType: "assessment",
        sourceLabel: `SkillForge: ${catalogModule.name}`,
        sourceRefType: "assessment",
        sourceRefId: catalogModule.id,
        evidenceStrength: strength,
        verificationStatus: progress.attempts.some((a) => a.evaluation !== null) ? "self-reported" : "unverified",
        explanation: `SkillForge assessed this at "${levelLabel}" (${rawScore}/100 knowledge + ability average).`,
        occurredOn: progress.lastActivityAt,
      }),
    ],
    rawScore,
  };
}

export interface SkillConfidenceContext {
  profile: StudentProfile;
  skillForgeModules: SkillForgeModuleLike[];
  skillForgeProgress: Record<string, SkillProgress>;
  githubRepos: GithubRepoRecord[];
  manualEvidence: SkillEvidenceRecord[];
}

/** Every skill name currently worth showing a confidence score for — the union of what's claimed, what's been analyzed via GitHub, and what's been manually added. Doesn't include every SkillForge module by default (only ones with real started progress), so an untouched catalog doesn't flood the list. */
export function listTrackedSkills(context: SkillConfidenceContext): string[] {
  const names = new Set<string>();
  for (const skill of context.profile.currentSkills) names.add(skill.trim());
  for (const repo of context.githubRepos) {
    for (const s of repo.skillEvidence) names.add(s.skill.trim());
  }
  for (const record of context.manualEvidence) names.add(record.skillName.trim());
  for (const catalogModule of context.skillForgeModules) {
    const progress = context.skillForgeProgress[catalogModule.id];
    if (progress && progress.startedAt !== null) names.add(catalogModule.name.trim());
  }
  return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function strongestScore(records: SkillEvidenceRecord[]): number {
  if (records.length === 0) return 0;
  return Math.max(...records.map((r) => STRENGTH_SCORE[r.evidenceStrength]));
}

/**
 * Every auto-derived + manual evidence record for one named skill, across
 * all four dimensions — the shared building block behind both
 * `computeSkillConfidence` (this file) and the job-fit engine's
 * requirement-to-evidence linking (`lib/jobs/fit-scoring.ts`), so a
 * requirement match and a skill's confidence report always point at the
 * exact same underlying evidence rather than two independently-derived
 * text searches.
 */
export function gatherEvidenceForSkill(skillName: string, context: SkillConfidenceContext): SkillEvidenceRecord[] {
  const manual = context.manualEvidence.filter((r) => normalizeText(r.skillName) === normalizeText(skillName));
  const claimed = claimedEvidence(skillName, context.profile);
  const professional = professionalEvidence(skillName, context.profile);
  const demonstrated = demonstratedEvidence(skillName, context.profile, context.githubRepos);
  const { records: assessedRecords } = assessedEvidence(skillName, context.skillForgeModules, context.skillForgeProgress);
  return [...claimed, ...professional, ...demonstrated, ...assessedRecords, ...manual];
}

export function computeSkillConfidence(skillName: string, context: SkillConfidenceContext): SkillConfidenceScore {
  const { rawScore: assessedRawScore } = assessedEvidence(skillName, context.skillForgeModules, context.skillForgeProgress);
  const allEvidence = gatherEvidenceForSkill(skillName, context);

  const byDimension: Record<ConfidenceDimension, SkillEvidenceRecord[]> = { claimed: [], assessed: [], demonstrated: [], professional: [] };
  for (const record of allEvidence) {
    byDimension[SOURCE_TYPE_DIMENSION[record.sourceType]].push(record);
  }

  const dimensionScore: Record<ConfidenceDimension, number> = {
    claimed: byDimension.claimed.length > 0 ? 100 : 0,
    professional: strongestScore(byDimension.professional),
    demonstrated: strongestScore(byDimension.demonstrated),
    // Prefer SkillForge's exact numeric score when available; otherwise fall
    // back to the bucketed strength of any certification evidence.
    assessed: assessedRawScore !== null ? Math.max(assessedRawScore, strongestScore(byDimension.assessed)) : strongestScore(byDimension.assessed),
  };

  const components: SkillConfidenceComponent[] = (Object.keys(DIMENSION_WEIGHT) as ConfidenceDimension[]).map((dimension) => ({
    dimension,
    label: DIMENSION_LABEL[dimension],
    present: byDimension[dimension].length > 0 || (dimension === "assessed" && assessedRawScore !== null),
    detail: describeDimension(dimension, dimensionScore[dimension], byDimension[dimension], assessedRawScore),
    weight: DIMENSION_WEIGHT[dimension],
    score: dimensionScore[dimension],
  }));

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const overallScore = Math.round(components.reduce((sum, c) => sum + c.weight * c.score, 0) / totalWeight);

  // "Very High" additionally requires broad, independently strong evidence
  // (not just a high weighted average one dominant source could produce) —
  // see the module doc for the worked example this threshold was tuned against.
  const independentStrongCount = (["assessed", "demonstrated", "professional"] as ConfidenceDimension[]).filter(
    (d) => dimensionScore[d] >= 70,
  ).length;

  const confidence = levelFor(overallScore, independentStrongCount);
  const independentSourceCount = new Set(allEvidence.map((e) => e.sourceType)).size;

  return {
    skillName,
    confidence,
    overallScore,
    components,
    evidenceCount: allEvidence.length,
    independentSourceCount,
    explanation: explain(skillName, confidence, components),
    evidence: allEvidence,
  };
}

function levelFor(overallScore: number, independentStrongCount: number): SkillConfidenceLevel {
  if (overallScore >= 88 && independentStrongCount >= 3) return "very-high";
  if (overallScore >= 65) return "high";
  if (overallScore >= 40) return "moderate";
  if (overallScore >= 15) return "low";
  return "unverified";
}

function describeDimension(dimension: ConfidenceDimension, score: number, records: SkillEvidenceRecord[], rawScore: number | null): string {
  if (dimension === "assessed" && rawScore !== null) return `${rawScore}/100 (SkillForge assessment)`;
  if (records.length === 0) return "No evidence found";
  const strongest = records.reduce((best, r) => (STRENGTH_SCORE[r.evidenceStrength] > STRENGTH_SCORE[best.evidenceStrength] ? r : best));
  const countNote = records.length > 1 ? ` across ${records.length} sources` : "";
  return `${strongest.evidenceStrength[0].toUpperCase()}${strongest.evidenceStrength.slice(1)}${countNote}`;
}

function explain(skillName: string, confidence: SkillConfidenceLevel, components: SkillConfidenceComponent[]): string {
  const present = components.filter((c) => c.present).map((c) => c.label.toLowerCase());
  if (present.length === 0) return `No evidence found for ${skillName} yet.`;
  const summary = present.length === 1 ? present[0] : `${present.slice(0, -1).join(", ")} and ${present[present.length - 1]}`;
  return `${confidence === "unverified" ? "Unverified" : confidence[0].toUpperCase() + confidence.slice(1)} confidence in ${skillName}, based on ${summary}.`;
}

export function computeAllSkillConfidence(context: SkillConfidenceContext): SkillConfidenceScore[] {
  return listTrackedSkills(context)
    .map((skill) => computeSkillConfidence(skill, context))
    .sort((a, b) => b.overallScore - a.overallScore);
}
