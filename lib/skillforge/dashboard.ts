import { calculateExpectedDuration, type ExpectedDuration } from "@/lib/roadmap/pacing";
import { MASTERY_LEVEL_ORDER, overallMasteryScore } from "@/lib/skillforge/mastery";
import type { GapPriority, SkillModule, SkillProgress } from "@/types";

/**
 * Dashboard-level aggregation over a student's matched modules + their
 * persisted progress. Kept separate from the components so the "what should
 * I work on next" logic is testable and reusable between the dashboard and
 * (eventually) other surfaces, rather than buried in JSX.
 */

const PRIORITY_RANK: Record<GapPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export interface SkillWithProgress {
  module: SkillModule;
  progress: SkillProgress;
}

export function sortByPriority(items: SkillWithProgress[]): SkillWithProgress[] {
  return [...items].sort((a, b) => PRIORITY_RANK[b.module.priority] - PRIORITY_RANK[a.module.priority]);
}

function isOpen(item: SkillWithProgress): boolean {
  return item.progress.mastery.level !== "resume-ready";
}

export function getHighestPrioritySkill(items: SkillWithProgress[]): SkillWithProgress | null {
  return sortByPriority(items.filter(isOpen))[0] ?? null;
}

export function getSkillsInProgress(items: SkillWithProgress[]): SkillWithProgress[] {
  return items.filter((item) => item.progress.startedAt !== null && isOpen(item));
}

export interface WeeklyMove {
  module: SkillModule;
  progress: SkillProgress;
  duration: ExpectedDuration;
}

/** Mirrors the roadmap's "top 3 moves" logic: highest-priority open skills, sized honestly against the student's real weekly availability. */
export function getTopWeeklyMoves(
  items: SkillWithProgress[],
  weeklyHoursAvailable: number | null,
  limit = 3,
): WeeklyMove[] {
  return sortByPriority(items.filter(isOpen))
    .slice(0, limit)
    .map(({ module, progress }) => ({
      module,
      progress,
      duration: calculateExpectedDuration(module.estimatedHours, weeklyHoursAvailable),
    }));
}

export interface ReadinessSummary {
  count: number;
  total: number;
}

export function getEvidenceReadiness(items: SkillWithProgress[]): ReadinessSummary {
  const count = items.filter(
    (item) => item.progress.mastery.evidenceStrength === "moderate" || item.progress.mastery.evidenceStrength === "strong",
  ).length;
  return { count, total: items.length };
}

export function getInterviewReadiness(items: SkillWithProgress[]): ReadinessSummary {
  const count = items.filter(
    (item) => item.progress.mastery.level === "interview-ready" || item.progress.mastery.level === "resume-ready",
  ).length;
  return { count, total: items.length };
}

export interface OverallReadiness {
  /** Average of `overallMasteryScore` across matched skills — a supporting number, never the primary state (same rule the per-skill score already follows). */
  averageScore: number;
  /** Skills that have actually demonstrated Proficient+ mastery, not just started something. */
  demonstratedCount: ReadinessSummary;
}

export function getOverallReadiness(items: SkillWithProgress[]): OverallReadiness {
  const averageScore =
    items.length === 0
      ? 0
      : Math.round(items.reduce((sum, item) => sum + overallMasteryScore(item.progress.mastery.dimensions), 0) / items.length);

  const count = items.filter(
    (item) => MASTERY_LEVEL_ORDER.indexOf(item.progress.mastery.level) >= MASTERY_LEVEL_ORDER.indexOf("proficient"),
  ).length;

  return { averageScore, demonstratedCount: { count, total: items.length } };
}
