import type { GapPriority } from "./roadmap";

/**
 * The adaptive, evidence-aware roadmap engine (Phase 3) — a SEPARATE system
 * from the narrative `Roadmap`/`SavedRoadmap` in `types/roadmap.ts`, which is
 * untouched by this feature. Where `Roadmap` is a one-shot AI/fallback
 * narrative generated from a questionnaire, `AdaptiveRoadmap` is a single,
 * continuously-recomputed plan driven by a real skill dependency graph
 * (`types/skill-graph.ts`), a deterministic weekly scheduler
 * (`lib/roadmap/scheduler.ts`), and real signals (saved jobs, SkillForge
 * mastery, evidence confidence). See `docs/roadmap-engine.md`.
 */

/**
 * Frequency of each requirement label across a student's OWN saved job
 * descriptions — deliberately personalized, never presented as general
 * labor-market statistics. See `lib/roadmap/saved-job-signals.ts`.
 */
export interface SavedJobSkillFrequency {
  skill: string;
  count: number;
  /** count / savedJobCount * 100, rounded. */
  percentage: number;
  savedJobCount: number;
}

export type AdaptiveTaskStatus = "not-started" | "in-progress" | "completed" | "skipped";

export interface AdaptiveTask {
  id: string;
  skillId: string;
  skillName: string;
  title: string;
  /** Deterministic, generated from `SkillPriorityScore.reasons` — never AI-authored. */
  reason: string;
  estimatedHours: number;
  /** Other AdaptiveTask ids (within the same roadmap) that must be completed first. */
  prerequisiteTaskIds: string[];
  priorityScore: number;
  priorityTier: GapPriority;
  /** ISO date (yyyy-mm-dd) — null until the scheduler places this task. */
  scheduledStartDate: string | null;
  scheduledTargetDate: string | null;
  status: AdaptiveTaskStatus;
  completionCriteria: string[];
  learningResource: { title: string; url?: string } | null;
  /** Real `SkillModule.id` when this skill has an assessable SkillForge module. */
  assessmentSkillForgeModuleId: string | null;
  evidenceGoal: string | null;
  sourceGapTitle: string | null;
  sourceJobRequirementLabels: string[];
  completedAt: string | null;
  createdAt: string;
}

export interface AdaptivePhase {
  key: string;
  title: string;
  tasks: AdaptiveTask[];
}

export interface ScheduleFeasibility {
  feasible: boolean;
  totalRemainingHours: number;
  requiredWeeks: number;
  /** Weeks between the schedule's start date and the target date; null when no target date is set. */
  availableWeeks: number | null;
  weeklyHoursAvailable: number;
  isAssumedAvailability: boolean;
  message: string;
  recommendations: string[];
}

export type RoadmapChangeTrigger =
  | "assessment-passed"
  | "assessment-failed"
  | "new-evidence"
  | "new-github-project"
  | "new-resume"
  | "target-role-changed"
  | "deadline-changed"
  | "weekly-hours-changed"
  | "job-analyzed"
  | "manual";

export const ROADMAP_CHANGE_TRIGGER_LABELS: Record<RoadmapChangeTrigger, string> = {
  "assessment-passed": "SkillForge assessment passed",
  "assessment-failed": "SkillForge assessment attempt",
  "new-evidence": "New skill evidence added",
  "new-github-project": "New GitHub project analyzed",
  "new-resume": "New resume uploaded",
  "target-role-changed": "Target role changed",
  "deadline-changed": "Target date changed",
  "weekly-hours-changed": "Weekly availability changed",
  "job-analyzed": "New job analyzed",
  manual: "Manual recompute",
};

export interface RoadmapChangeEvent {
  id: string;
  trigger: RoadmapChangeTrigger;
  occurredAt: string;
  /** Deterministic, template-generated summary — see `lib/roadmap/adaptation.ts`. */
  summary: string;
  addedSkillIds: string[];
  removedSkillIds: string[];
  changedSkillIds: string[];
}

export interface CompletedHistoryEntry {
  skillId: string;
  title: string;
  completedAt: string;
  estimatedHours: number;
}

export interface AdaptiveRoadmap {
  id: string;
  userId: string;
  targetCareers: string[];
  targetDate: string | null;
  weeklyHoursAvailable: number | null;
  /** 0-100 — proportion of in-scope skills already mastered or in-progress-and-scheduled; a coarse "how close are you" summary. */
  readiness: number;
  phases: AdaptivePhase[];
  feasibility: ScheduleFeasibility;
  savedJobSkillFrequency: SavedJobSkillFrequency[];
  /** Newest-last, append-only — never rewritten on regeneration. */
  changeEvents: RoadmapChangeEvent[];
  /** Append-only record of completed skills, preserved even if a later regeneration no longer includes that skill in active scope. */
  completedHistory: CompletedHistoryEntry[];
  generatedAt: string;
  updatedAt: string;
}
