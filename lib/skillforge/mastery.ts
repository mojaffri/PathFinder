import type { ConfidenceLevel, EvidenceStrength, MasteryDimensionScores, MasteryLevel, SkillAttempt } from "@/types";

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

/** Recency-weighted, deterministic assessment signal. The latest three graded attempts matter most; stale results decay after 90 days. */
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
  const weighted = (field: "knowledgeScore" | "abilityScore") => Math.round(graded.reduce((sum, attempt, index) => sum + (attempt.evaluation?.[field] ?? 0) * weights[index], 0) / totalWeight);
  const scores = graded.map((attempt) => attempt.evaluation?.overallScore ?? 0);
  const spread = Math.max(...scores) - Math.min(...scores);
  const base = computeConfidence(graded.length);
  const confidence = spread > 25 && base === "high" ? "medium" : spread > 25 && base === "medium" ? "low" : base;
  return { knowledge: weighted("knowledgeScore"), ability: weighted("abilityScore"), confidence };
}

/** A single 0-100 number for supporting visualizations only (e.g. a compact progress ring) — never the primary state, per the mastery model. */
export function overallMasteryScore(dimensions: MasteryDimensionScores): number {
  const { knowledge, ability, evidence, interview } = dimensions;
  return Math.round((knowledge + ability + evidence + interview) / 4);
}
