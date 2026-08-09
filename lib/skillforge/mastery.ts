import type {
  ConfidenceLevel,
  EvidenceStrength,
  MasteryDimensionScores,
  MasteryLevel,
  SkillAttempt,
  SkillEvaluationResult,
  SkillModule,
  SkillProgress,
} from "@/types";

/**
 * Deterministic, explainable mastery derivation — same philosophy as the
 * career-matching and gap-analysis engines elsewhere in this app: every
 * level is a specific, documented threshold on the four tracked dimensions,
 * never an opaque or AI-guessed score.
 */

export const MASTERY_LEVEL_ORDER: MasteryLevel[] = [
  "exposure",
  "familiar",
  "working",
  "proficient",
  "interview-ready",
  "resume-ready",
];

/** Representative 0-100 score for each evidence strength, used to fold a list of evidence entries into the single `evidence` dimension score. */
export const EVIDENCE_STRENGTH_SCORE: Record<EvidenceStrength, number> = {
  none: 0,
  weak: 30,
  moderate: 60,
  strong: 90,
};

/** Inverse of `EVIDENCE_STRENGTH_SCORE` — converts the internal 0-100 evidence score back into the qualitative label actually shown to the student. */
export function evidenceStrengthFromScore(score: number): EvidenceStrength {
  if (score >= 75) return "strong";
  if (score >= 45) return "moderate";
  if (score >= 15) return "weak";
  return "none";
}

/**
 * A skill only reaches "Resume Ready" when all four dimensions clear a real
 * bar together — strong knowledge alone (or a single polished project with
 * no practice reps) is never enough, mirroring how the roadmap engine
 * refuses to call a gap closed on a single signal.
 */
export function computeMasteryLevel(dimensions: MasteryDimensionScores): MasteryLevel {
  const { knowledge, ability, evidence, interview } = dimensions;

  if (knowledge >= 70 && ability >= 70 && interview >= 70 && evidence >= 45) return "resume-ready";
  if (knowledge >= 60 && ability >= 60 && interview >= 55) return "interview-ready";
  if (knowledge >= 55 && ability >= 50) return "proficient";
  if (knowledge >= 30 || ability >= 25) return "working";
  if (knowledge >= 10) return "familiar";
  return "exposure";
}

export function isResumeReady(level: MasteryLevel): boolean {
  return level === "resume-ready";
}

/**
 * Confidence is a fact about the *evidence base*, not the AI's own opinion of
 * itself — an evaluator that says "high confidence" after one lucky answer is
 * exactly the overconfidence rule 14 warns against. Computed deterministically
 * from how many AI-evaluated diagnostic/assessment attempts back a skill's
 * knowledge/ability numbers: one attempt could be a fluke, three consistent
 * attempts are a real signal.
 */
export function computeConfidence(evaluatedAttemptCount: number): ConfidenceLevel {
  if (evaluatedAttemptCount >= 3) return "high";
  if (evaluatedAttemptCount >= 2) return "medium";
  return "low";
}

/** Recency-weighted assessment signal. Recent, consistent attempts carry the most weight. */
export function computeAssessmentSignal(attempts: SkillAttempt[], now = new Date()): {
  knowledge: number;
  ability: number;
  confidence: ConfidenceLevel;
} {
  const graded = attempts.filter((attempt) => attempt.evaluation !== null).slice(-3);
  if (graded.length === 0) return { knowledge: 0, ability: 0, confidence: "low" };

  const weights = graded.map((attempt, index) => {
    const ageDays = Math.max(0, (now.getTime() - new Date(attempt.completedAt).getTime()) / 86_400_000);
    const recency = ageDays > 180 ? 0.7 : ageDays > 90 ? 0.85 : 1;
    return (index + 1) * recency;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const weighted = (field: "knowledgeScore" | "abilityScore") =>
    Math.round(
      graded.reduce(
        (sum, attempt, index) => sum + (attempt.evaluation?.[field] ?? 0) * weights[index],
        0,
      ) / totalWeight,
    );
  const scores = graded.map((attempt) => attempt.evaluation?.overallScore ?? 0);
  const spread = Math.max(...scores) - Math.min(...scores);
  const base = computeConfidence(graded.length);
  const confidence =
    spread > 25 && base === "high" ? "medium" : spread > 25 && base === "medium" ? "low" : base;

  return { knowledge: weighted("knowledgeScore"), ability: weighted("abilityScore"), confidence };
}

/** A single 0-100 number for supporting visualizations only (e.g. a compact progress ring) — never the primary state, per the mastery model. */
export function overallMasteryScore(dimensions: MasteryDimensionScores): number {
  const { knowledge, ability, evidence, interview } = dimensions;
  return Math.round((knowledge + ability + evidence + interview) / 4);
}

function emptyDimensions(): MasteryDimensionScores {
  return { knowledge: 0, ability: 0, evidence: 0, interview: 0 };
}

/** The zero-state a skill starts in before the student has done anything — never persisted until a real mutation happens. */
export function freshProgress(skillId: string): SkillProgress {
  const dimensions = emptyDimensions();
  const now = new Date().toISOString();
  return {
    skillId,
    startedAt: null,
    lastActivityAt: null,
    completedResourceIds: [],
    completedExerciseIds: [],
    projectChallengeStatus: {},
    evidence: [],
    interviewSelfRating: null,
    attempts: [],
    mastery: {
      skillId,
      level: computeMasteryLevel(dimensions),
      dimensions,
      confidence: { knowledge: "low", ability: "low" },
      evidenceStrength: evidenceStrengthFromScore(dimensions.evidence),
      isResumeReady: false,
      updatedAt: now,
    },
  };
}

/**
 * Recomputes the four mastery dimensions from whatever the student has
 * actually done. "No fake progress" (spec rule 17): merely completing
 * resources or exercises can only carry knowledge/ability into
 * exposure/familiar territory (a low, capped ceiling) — it is never enough
 * on its own to reach "working" or higher. Real credit for knowledge/ability
 * comes from demonstrated performance: an AI-evaluated diagnostic or
 * assessment attempt, or a reviewed/submitted project. This also means a
 * student who skips straight to "Test Me First" and performs well can jump
 * straight to a high mastery level with zero resources checked off (spec
 * rule 11 — trust demonstrated ability over assumed prerequisites).
 *
 * Pure and storage-agnostic by design — both the database-backed repository
 * (`repositories/skillforge-repository.ts`) and any future caller share this
 * one implementation rather than duplicating the scoring rules.
 */
export function recomputeMastery(progress: SkillProgress, module: SkillModule): SkillProgress {
  const resourceTotal = module.learningResources.length;
  const exerciseTotal = module.practiceExercises.length;

  const resourceCompletionPct = resourceTotal > 0 ? progress.completedResourceIds.length / resourceTotal : 0;
  const exerciseCompletionPct = exerciseTotal > 0 ? progress.completedExerciseIds.length / exerciseTotal : 0;
  const knowledgeFromCompletion = Math.round(resourceCompletionPct * 25);
  const abilityFromCompletion = Math.round(exerciseCompletionPct * 20);

  const projectStatuses = Object.values(progress.projectChallengeStatus);
  const reviewedProjects = projectStatuses.filter((s) => s === "reviewed").length;
  const submittedProjects = projectStatuses.filter((s) => s === "submitted").length;
  const abilityFromProjects = Math.min(70, reviewedProjects * 50 + submittedProjects * 25);

  const evaluatedAttempts = progress.attempts.filter(
    (a): a is SkillAttempt & { evaluation: SkillEvaluationResult } => a.evaluation !== null,
  );
  const assessmentSignal = computeAssessmentSignal(evaluatedAttempts);
  const knowledgeFromEvaluation = assessmentSignal.knowledge;
  const abilityFromEvaluation = assessmentSignal.ability;

  const knowledge = Math.max(knowledgeFromCompletion, knowledgeFromEvaluation);
  const ability = Math.max(abilityFromCompletion, abilityFromProjects, abilityFromEvaluation);

  const evidenceScore =
    progress.evidence.length === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            progress.evidence.reduce((sum, e) => sum + EVIDENCE_STRENGTH_SCORE[e.strength], 0) / progress.evidence.length,
          ),
        );
  const interview = progress.interviewSelfRating ? progress.interviewSelfRating * 20 : 0;

  const dimensions: MasteryDimensionScores = { knowledge, ability, evidence: evidenceScore, interview };
  const level = computeMasteryLevel(dimensions);
  const confidence = assessmentSignal.confidence;

  return {
    ...progress,
    mastery: {
      skillId: progress.skillId,
      level,
      dimensions,
      confidence: { knowledge: confidence, ability: confidence },
      evidenceStrength: evidenceStrengthFromScore(evidenceScore),
      isResumeReady: level === "resume-ready",
      updatedAt: new Date().toISOString(),
    },
  };
}
