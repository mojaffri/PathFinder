import type { CareerCategory } from "./career";
import type { EducationStage, RatingScale } from "./profile";

export type GapCategory = "academic" | "technical" | "experience" | "professional";
export type GapPriority = "critical" | "high" | "medium" | "low";

/**
 * When a gap belongs in the plan, independent of its category. Drives phase
 * placement so long-horizon credentials never crowd out immediate
 * resume-building: "immediate" anchors Phase A (build the resume right now),
 * "near-term" is real but not urgent this month (an internship search, an
 * admissions test once genuinely close to the window, networking), and
 * "long-term" is structurally gated behind further progress (a licensing
 * exam that requires finishing school first) and always gets pushed to
 * Phase C rather than competing with immediate resume-building.
 */
export type GapTimeHorizon = "immediate" | "near-term" | "long-term";

/**
 * A single granular, operational step toward closing a gap — e.g. for the
 * gap/milestone "Clear the FE Chemical Exam", a tactical action might be
 * "Schedule 3 practice tests using NCEES official study materials". These
 * are what render as "Recommended actions"; the gap itself is what renders
 * as the "Milestone" — the two must never be the same text.
 */
export interface GapTacticalAction {
  title: string;
  /** Short, specific rationale or how-to for this exact step. */
  detail: string;
  estimatedHours: number;
  /** A specific, real, checkable artifact that proves this exact step was done. */
  evidenceOfCompletion: string;
}

export interface GapItem {
  id: string;
  category: GapCategory;
  title: string;
  description: string;
  priority: GapPriority;
  impact: RatingScale;
  effort: RatingScale;
  timeHorizon: GapTimeHorizon;
  /** Concrete hour estimate to close this specific gap. */
  estimatedHours: number;
  /**
   * Which target career(s) this gap applies to. A gap relevant to more than
   * one target career is closing multiple gaps with a single effort — the
   * highest-leverage move for a student aiming for versatility across paths.
   */
  relevantCareers: string[];
  /** A specific, real artifact/tool/platform that proves this gap was closed — never a vague placeholder. */
  evidenceOfCompletion: string;
  /** The granular, step-by-step operational tasks that make accomplishing this gap/milestone possible. */
  tacticalActions: GapTacticalAction[];
}

export interface GapAnalysis {
  currentStateSummary: string[];
  targetCareers: string[];
  gaps: GapItem[];
}

export interface TopMove {
  id: string;
  title: string;
  impact: RatingScale;
  effort: RatingScale;
  /** Concrete hour estimate — powers the weekly-hours-aware duration calculation. */
  estimatedHours: number;
  why: string;
  /** Which target career(s) this move advances — more than one means it's an overlap win. */
  relevantCareers: string[];
}

export type RecommendationTier = "must-do" | "high-leverage" | "nice-to-have";

export const TIER_LABELS: Record<RecommendationTier, string> = {
  "must-do": "Must do",
  "high-leverage": "High leverage",
  "nice-to-have": "Nice to have",
};

export interface RoadmapRecommendation {
  id: string;
  title: string;
  tier: RecommendationTier;
  impact: RatingScale;
  effort: RatingScale;
  /** Concrete hour estimate — expected duration is derived from this + weeklyHoursAvailable, not stated directly. */
  estimatedHours: number;
  prerequisite: string | null;
  whyItMatters: string;
  evidenceOfCompletion: string;
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  impact: RatingScale;
  evidenceOfCompletion: string;
}

export type RoadmapPhaseKey =
  | "academic-technical-edge"
  | "experience-portfolio"
  | "execution-interview";

export interface RoadmapPhase {
  key: RoadmapPhaseKey;
  title: string;
  objective: string;
  timeline: string;
  whyItMattersForTarget: string;
  milestones: RoadmapMilestone[];
  recommendedActions: RoadmapRecommendation[];
  resources: string[];
}

export interface CertificationGuidance {
  name: string;
  recommend: boolean;
  reasoning: string;
}

export interface AIWorkflowTemplate {
  name: string;
  steps: string[];
}

export interface AIAdvantageSection {
  /** One entry per distinct category among the target careers — merged when they span more than one. */
  categories: CareerCategory[];
  summary: string;
  useCases: string[];
  templates: AIWorkflowTemplate[];
}

export interface ResumeBenchmarkItem {
  label: string;
  current: string;
  target: string;
}

export interface TargetResumeExperience {
  roleTitle: string;
  organizationPlaceholder: string;
  timeframePlaceholder: string;
  bullets: string[];
}

export interface TargetResumeProject {
  title: string;
  tools: string[];
  bullets: string[];
}

export interface TargetResumeBenchmark {
  comparisons: ResumeBenchmarkItem[];
  targetExperience: TargetResumeExperience;
  targetProjects: TargetResumeProject[];
  instructions: string;
}

export interface Roadmap {
  executiveSummary: string;
  targetCareers: string[];
  currentProfileAssessment: string;
  gapAnalysis: GapAnalysis;
  topMoves: TopMove[];
  competitiveAdvantages: string[];
  mistakesToAvoid: string[];
  phases: RoadmapPhase[];
  certificationGuidance: CertificationGuidance[];
  aiAdvantage: AIAdvantageSection;
  targetResumeBenchmark: TargetResumeBenchmark;
  portfolioIdeas: string[];
  interviewPreparation: string[];
  recommendedTools: string[];
  recommendedResources: string[];
  realityCheck: string;
  /** Carried from the request so the UI can compute expected duration without re-fetching the profile. */
  weeklyHoursAvailable: number | null;
  generatedAt: string;
  source: "ai" | "fallback";
}

export type RoadmapSource = "discover" | "accelerate";

export interface SavedRoadmap {
  id: string;
  userId: string;
  major: string;
  targetCareers: string[];
  educationStage: EducationStage | null;
  createdAt: string;
  updatedAt: string;
  roadmap: Roadmap;
  source: RoadmapSource;
}
