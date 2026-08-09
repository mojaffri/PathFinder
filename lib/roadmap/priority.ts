import type { SkillNode } from "@/types/skill-graph";
import type { GapItem, GapPriority } from "@/types/roadmap";
import type { SkillConfidenceScore } from "@/types/evidence";
import type { MasteryLevel } from "@/types/skillforge";
import type { SavedJobSkillFrequency } from "@/types/adaptive-roadmap";
import { clamp, fuzzyIncludes } from "@/lib/matching/evidence";
import { MASTERY_LEVEL_ORDER } from "@/lib/skillforge/mastery";

/**
 * Deterministic skill-priority scoring for the adaptive roadmap engine — same
 * discipline as `lib/evidence/confidence.ts`: a documented weighted formula,
 * unit-testable, no AI anywhere in the scoring path. AI may explain a task's
 * reason in prose elsewhere, but never computes this number (task-brief
 * section 7: "AI must NOT determine... numerical priority").
 *
 * Weights (sum to at most 100, then clamped):
 *   - Gap priority baseline: critical=25 / high=18 / medium=10 / low=4 / none=0
 *   - Gap impact:            impact (1-5) * 8, capped at 40
 *   - Saved-job frequency:   (percentage / 100) * 20
 *   - Unblock boost:         min(blockedSkillsCount * 5, 15) — "this closes a
 *     prerequisite other skills are waiting on"
 *   - Evidence-weakness:     (100 - confidenceScore) / 100 * 15 — weaker
 *     existing evidence makes building the skill higher priority, not lower
 * A mastery discount (x0.2) applies when the student's SkillForge level is
 * already >= "proficient" or their skill confidence is already "high"/
 * "very-high" — the skill is technically still "in scope" (so its task stays
 * visible/traceable) but shouldn't compete for a student's limited hours.
 */

const PRIORITY_BASELINE: Record<GapPriority, number> = { critical: 25, high: 18, medium: 10, low: 4 };
const MASTERY_DISCOUNT_LEVEL: MasteryLevel = "proficient";
const HIGH_CONFIDENCE_LEVELS = new Set(["high", "very-high"]);

export interface SkillPriorityContext {
  matchedGap: GapItem | null;
  jobFrequency: SavedJobSkillFrequency | null;
  blockedSkillsCount: number;
  confidenceScore: SkillConfidenceScore | null;
  masteryLevel: MasteryLevel | null;
}

export interface SkillPriorityScore {
  skillId: string;
  score: number;
  tier: GapPriority;
  /** Ordered list of which signals actually fired — drives the deterministic `AdaptiveTask.reason` text; never itself free text from an LLM. */
  reasons: string[];
}

export function tierForScore(score: number): GapPriority {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 30) return "medium";
  return "low";
}

export function scoreSkillPriority(node: SkillNode, ctx: SkillPriorityContext): SkillPriorityScore {
  let score = 0;
  const reasons: string[] = [];

  if (ctx.matchedGap) {
    score += PRIORITY_BASELINE[ctx.matchedGap.priority];
    score += clamp(ctx.matchedGap.impact * 8, 0, 40);
    reasons.push(`matches your "${ctx.matchedGap.title}" gap (${ctx.matchedGap.priority} priority)`);
  }

  if (ctx.jobFrequency && ctx.jobFrequency.savedJobCount > 0) {
    score += (ctx.jobFrequency.percentage / 100) * 20;
    reasons.push(
      `appears in ${ctx.jobFrequency.count} of your ${ctx.jobFrequency.savedJobCount} saved jobs (${ctx.jobFrequency.percentage}%)`,
    );
  }

  if (ctx.blockedSkillsCount > 0) {
    score += Math.min(ctx.blockedSkillsCount * 5, 15);
    reasons.push(
      `unblocks ${ctx.blockedSkillsCount} downstream skill${ctx.blockedSkillsCount === 1 ? "" : "s"}`,
    );
  }

  if (ctx.confidenceScore) {
    const weaknessBoost = ((100 - ctx.confidenceScore.overallScore) / 100) * 15;
    score += weaknessBoost;
    if (ctx.confidenceScore.overallScore < 65) {
      reasons.push(`current evidence for this skill is only "${ctx.confidenceScore.confidence}"`);
    }
  } else {
    // No evidence at all is the weakest possible state — same 15-point ceiling as a 0-score confidence report.
    score += 15;
  }

  let clamped = clamp(score, 0, 100);

  const isMastered =
    (ctx.masteryLevel !== null &&
      MASTERY_LEVEL_ORDER.indexOf(ctx.masteryLevel) >= MASTERY_LEVEL_ORDER.indexOf(MASTERY_DISCOUNT_LEVEL)) ||
    (ctx.confidenceScore !== null && HIGH_CONFIDENCE_LEVELS.has(ctx.confidenceScore.confidence));
  if (isMastered) {
    clamped = clamp(clamped * 0.2, 0, 100);
    reasons.push("already strong here — kept visible for traceability, not urgent");
  }

  return { skillId: node.id, score: Math.round(clamped), tier: tierForScore(clamped), reasons };
}

/** Fuzzy-matches a skill node against a student's gap items, returning the highest-priority match (if any). */
export function findMatchingGap(node: SkillNode, gaps: GapItem[]): GapItem | null {
  const rank: Record<GapPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const matches = gaps.filter((gap) => fuzzyIncludes([...node.relatedGapKeywords, node.name], gap.title) || fuzzyIncludes([gap.title, gap.description], node.name));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => rank[b.priority] - rank[a.priority] || b.impact - a.impact)[0];
}

/** Fuzzy-matches a skill node against saved-job skill frequency, returning the highest-count match (if any). */
export function findMatchingJobFrequency(node: SkillNode, frequencies: SavedJobSkillFrequency[]): SavedJobSkillFrequency | null {
  const matches = frequencies.filter((f) => fuzzyIncludes([...node.relatedGapKeywords, node.name], f.skill) || fuzzyIncludes([f.skill], node.name));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.count - a.count)[0];
}
