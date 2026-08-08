import type { CareerCategory } from "./career";
import type { GapPriority, RoadmapPhaseKey } from "./roadmap";
import type { RatingScale } from "./profile";

/**
 * SkillForge is the execution layer for a roadmap: it answers "how do I
 * actually become competitive," not "where should I go." It deliberately
 * does NOT introduce a second career taxonomy — every `SkillModule` points
 * back at real `Career.id`s / `CareerCategory` values from `data/careers.ts`
 * and `types/career.ts`, and every dashboard/detail view resolves a
 * student's actual saved roadmap (`types/roadmap.ts`) to explain *why* a
 * skill was recommended. The career playbooks and roadmap/gap-analysis
 * engine remain the source of truth for WHY a skill matters; SkillForge is
 * the system for HOW the student develops and proves it.
 */

// ============================== MASTERY MODEL ==============================

/**
 * The primary, structured progression state for a skill. Deliberately NOT a
 * "completed / incomplete" boolean — mastery is a ladder, and reaching
 * "Resume Ready" requires real evidence and interview readiness, not just
 * finishing a checklist of resources.
 */
export type MasteryLevel = "exposure" | "familiar" | "working" | "proficient" | "interview-ready" | "resume-ready";

export const MASTERY_LEVELS: { value: MasteryLevel; label: string }[] = [
  { value: "exposure", label: "Exposure" },
  { value: "familiar", label: "Familiar" },
  { value: "working", label: "Working" },
  { value: "proficient", label: "Proficient" },
  { value: "interview-ready", label: "Interview Ready" },
  { value: "resume-ready", label: "Resume Ready" },
];

/** The four dimensions tracked per skill. `evidence` is stored as a 0-100 score internally (for consistent math) but always displayed as a qualitative `EvidenceStrength`, never a raw percentage. */
export type MasteryDimension = "knowledge" | "ability" | "evidence" | "interview";

export interface MasteryDimensionScores {
  /** 0-100. Derived from learning-resource completion. */
  knowledge: number;
  /** 0-100. Derived from practice-exercise completion. */
  ability: number;
  /** 0-100 internally; always surfaced to the student as `EvidenceStrength`, never a raw percentage. */
  evidence: number;
  /** 0-100. Derived from the student's interview self-rating (a manual 1-5 rating, not a simulator — that's a future feature). */
  interview: number;
}

export type EvidenceStrength = "none" | "weak" | "moderate" | "strong";

/**
 * How much to trust a dimension score. Deliberately computed from *how many*
 * demonstrated (AI-evaluated) attempts back a dimension, never from the AI's
 * own self-reported confidence — a single lucky or unlucky answer shouldn't
 * be allowed to look as certain as a consistent track record.
 */
export type ConfidenceLevel = "low" | "medium" | "high";

/** The structured, computed result for a single skill — the thing actually rendered, with dimension percentages as supporting detail underneath it. */
export interface MasteryResult {
  skillId: string;
  level: MasteryLevel;
  dimensions: MasteryDimensionScores;
  /** How much to trust the knowledge/ability numbers above, based on how many demonstrated attempts back them. */
  confidence: Record<"knowledge" | "ability", ConfidenceLevel>;
  evidenceStrength: EvidenceStrength;
  isResumeReady: boolean;
  updatedAt: string;
}

// ============================== SKILL CONTENT ==============================

/**
 * A single testable idea within a skill — the unit failure diagnosis and
 * prerequisite backtracking operate on. Concept `id`s are intentionally
 * reused across modules (e.g. a foundational module and something built on
 * it can share a concept id) so `lib/skillforge/diagnosis.ts` can recognize
 * when a weak concept actually belongs to a *different*, prerequisite skill.
 */
export interface SkillConcept {
  id: string;
  title: string;
  description: string;
}

/** The "Learn" stage overview shown before the curated resource list — kept short by design so students aren't buried in material before they've even started. */
export interface LearnOverview {
  explanation: string;
  objectives: string[];
  keyConcepts: string[];
  examples: string[];
  commonMistakes: string[];
  estimatedMinutes: number;
}

export type ResourceType = "article" | "video" | "course" | "docs" | "book";

export interface LearningResource {
  id: string;
  title: string;
  type: ResourceType;
  /** External reference only — SkillForge V1 does not embed or execute any external content. */
  url?: string;
  estimatedMinutes: number;
  /** "core" is the minimum material to reach the target competency; "deeper" is optional and never required to advance. */
  depth: "core" | "deeper";
}

export type ExerciseDifficulty = "intro" | "core" | "stretch";

export interface PracticeExercise {
  id: string;
  title: string;
  description: string;
  difficulty: ExerciseDifficulty;
  estimatedMinutes: number;
  /** Which concept this exercise actually tests, if any — used by failure diagnosis to target the smallest useful review. */
  conceptId?: string;
}

export interface ProjectChallenge {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  /** A specific, real, checkable artifact — same evidence discipline as the roadmap engine, never a vague placeholder. */
  evidenceOfCompletion: string;
  difficulty: ExerciseDifficulty;
}

export type ProjectChallengeStatus = "not-started" | "in-progress" | "submitted" | "reviewed";

export type AssessmentType = "self-rating" | "checklist" | "artifact-review";

/** A single open-response prompt used by a diagnostic or mastery assessment, tagged to the concept it actually tests. */
export interface AssessmentQuestion {
  id: string;
  conceptId: string;
  prompt: string;
}

/**
 * Configuration for how a skill is assessed. `questions` are graded by the
 * server-side AI evaluator (`lib/skillforge/ai-evaluator.ts`); `description`
 * / `passingCriteria` remain as human-readable framing shown alongside them.
 */
export interface SkillAssessment {
  id: string;
  type: AssessmentType;
  description: string;
  passingCriteria: string;
  questions: AssessmentQuestion[];
}

/** A short, fast placement check — "Test Me First". Deliberately smaller than the full mastery assessment so a confident student can skip ahead quickly. */
export interface SkillDiagnostic {
  id: string;
  instructions: string;
  prompts: AssessmentQuestion[];
}

// ============================== AI EVALUATION ==============================

export type QuestionVerdict = "correct" | "partially-correct" | "incorrect" | "insufficient-evidence";

export interface QuestionEvaluation {
  questionId: string;
  conceptId: string | null;
  verdict: QuestionVerdict;
  explanation: string;
}

/**
 * The structured result of grading a diagnostic or assessment attempt.
 * Deliberately never a bare "passed" — knowledge/ability scores, named
 * strengths/weaknesses, and a specific weakest concept are what let
 * `lib/skillforge/diagnosis.ts` do real failure diagnosis instead of telling
 * a student to "try again."
 */
export interface SkillEvaluationResult {
  perQuestion: QuestionEvaluation[];
  knowledgeScore: number;
  abilityScore: number;
  strengths: string[];
  weaknesses: string[];
  weakestConceptId: string | null;
  recommendedNextStep: string;
}

export interface SkillEvidence {
  id: string;
  skillId: string;
  type: "project" | "writing-sample" | "certificate" | "portfolio-link" | "other";
  title: string;
  url?: string;
  strength: EvidenceStrength;
  addedAt: string;
}

/** A prerequisite (or reinforcing) relationship between two modules, derived from `SkillModule.prerequisites` rather than hand-maintained separately. */
export interface SkillDependency {
  skillId: string;
  dependsOnSkillId: string;
  kind: "prerequisite" | "reinforces";
}

/**
 * The core content unit. Every field that could tempt hardcoding
 * career-specific assumptions instead points back at the existing taxonomy:
 * `category` is a real `CareerCategory`, `targetCareerIds` are real
 * `Career.id`s, and `roadmapPhaseKey` is a real `RoadmapPhaseKey`.
 */
export interface SkillModule {
  id: string;
  name: string;
  category: CareerCategory;
  description: string;
  /** Career.id references this module is authored for — the existing career taxonomy is the source of truth, never duplicated here. */
  targetCareerIds: string[];
  /** SkillModule ids that should be developed first. */
  prerequisites: string[];
  priority: GapPriority;
  /** Which roadmap phase this skill typically belongs to, for connecting back to a student's actual generated roadmap. */
  roadmapPhaseKey: RoadmapPhaseKey | null;
  /** Keywords used to fuzzy-match this module against a student's live `GapAnalysis` (see `lib/skillforge/roadmap-connection.ts`) so the "why" text can cite their actual roadmap instead of generic copy. */
  relatedGapKeywords: string[];
  /** Fallback "why this matters" copy used when the student has no saved roadmap yet, or no gap matches. */
  whyItMatters: string;
  /** Total effort to reach Proficient, in hours — same unit and pacing math as roadmap milestones (`lib/roadmap/pacing.ts`). */
  estimatedHours: number;
  /** The testable ideas within this skill — the unit failure diagnosis and prerequisite backtracking operate on. */
  concepts: SkillConcept[];
  learnOverview: LearnOverview;
  learningResources: LearningResource[];
  practiceExercises: PracticeExercise[];
  projectChallenges: ProjectChallenge[];
  /** The fast, optional "Test Me First" placement check. */
  diagnostic: SkillDiagnostic;
  assessment: SkillAssessment;
  /** Short, concrete note on how this skill actually shows up in interviews for its target careers. */
  interviewRelevance: string;
  /** Short description of what it actually takes to reach each mastery level for this specific skill. */
  masteryRequirements: Record<MasteryLevel, string>;
}

// ============================== PROGRESS (PERSISTED) ==============================

/** A single question's raw student response, before/regardless of evaluation. */
export interface SkillAttemptResponse {
  questionId: string;
  answer: string;
}

/**
 * One diagnostic or assessment attempt, persisted in full. `evaluation` is
 * `null` when the AI evaluator was unavailable or failed — the student's
 * `responses` are still saved so nothing is lost and the attempt can be
 * resubmitted for grading without retyping anything.
 */
export interface SkillAttempt {
  id: string;
  skillId: string;
  stage: "diagnostic" | "assessment";
  startedAt: string;
  completedAt: string;
  responses: SkillAttemptResponse[];
  evaluation: SkillEvaluationResult | null;
}

/** Per-student, per-skill persisted progress — the thing that actually lives in storage. */
export interface SkillProgress {
  skillId: string;
  startedAt: string | null;
  lastActivityAt: string | null;
  completedResourceIds: string[];
  completedExerciseIds: string[];
  projectChallengeStatus: Record<string, ProjectChallengeStatus>;
  evidence: SkillEvidence[];
  /** Manual 1-5 self-rating driving the `interview` dimension until a real interview simulator exists. */
  interviewSelfRating: RatingScale | null;
  /** Every diagnostic + assessment attempt, newest last. */
  attempts: SkillAttempt[];
  mastery: MasteryResult;
}

// ============================== INTERVIEW (TYPES ONLY IN V1) ==============================

/**
 * Interview types are defined now so persistence and data shape are ready,
 * but V1 does not implement the interview simulator — no session UI is
 * wired up to generate sessions/evaluations yet.
 */
export interface InterviewQuestion {
  id: string;
  prompt: string;
  type: "behavioral" | "technical" | "case" | "scenario";
  relatedSkillIds: string[];
}

export interface InterviewModule {
  id: string;
  title: string;
  careerIds: string[];
  questionIds: string[];
}

export interface InterviewSession {
  id: string;
  moduleId: string;
  startedAt: string;
  completedAt: string | null;
  responses: { questionId: string; response: string }[];
}

export interface InterviewEvaluation {
  id: string;
  sessionId: string;
  evaluatedAt: string;
  strengths: string[];
  improvementAreas: string[];
  score: number | null;
}

// ============================== PERSISTED STATE ==============================

/** Everything SkillForge persists for one student, structured so a future Supabase migration is a one-row-per-user mapping, not a redesign. */
export interface SkillForgeState {
  userId: string;
  /** Keyed by SkillModule id. */
  skillProgress: Record<string, SkillProgress>;
  interviewSessions: InterviewSession[];
  interviewEvaluations: InterviewEvaluation[];
  updatedAt: string;
}

// ============================== GUIDED FREEDOM ==============================
// SkillForge recommends, it never gates. These types back the "intelligent
// warning" (readiness), failure diagnosis + prerequisite backtracking, and
// the always-present "what do I do now" answer — none of them ever produce a
// blocked/disabled UI state, only information a student can act on or ignore.

/** One potential background gap surfaced before a student starts something — informational, never a block. */
export interface ReadinessGap {
  skillId: string;
  skillName: string;
  reason: string;
  estimatedReviewHours: number;
}

export interface ReadinessCheck {
  /** True only when no gaps were found — the UI never uses this to disable anything, only to decide whether to show the warning card. */
  ready: boolean;
  gaps: ReadinessGap[];
}

/**
 * The result of backtracking from a demonstrated weak concept to the
 * smallest useful thing to review — either a concept within the SAME skill
 * (`withinSameSkill: true`, no backtracking needed) or the nearest
 * prerequisite module that actually teaches it. Deliberately prefers the
 * closest match over the deepest ancestor.
 */
export interface DiagnosisResult {
  conceptId: string;
  conceptTitle: string;
  recommendedSkillId: string;
  recommendedSkillName: string;
  withinSameSkill: boolean;
  explanation: string;
  estimatedReviewMinutes: number;
}

export type NextBestActionType = "diagnostic" | "learn" | "practice" | "build" | "assessment" | "interview" | "advance";

/** The single, always-available answer to "what am I supposed to do now?" for a skill. */
export interface NextBestAction {
  type: NextBestActionType;
  label: string;
  description: string;
}
