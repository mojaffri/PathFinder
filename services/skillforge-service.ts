import { STORAGE_KEYS } from "@/lib/storage/keys";
import { readJSON, writeJSON } from "@/lib/storage/local-storage";
import { computeConfidence, computeMasteryLevel, evidenceStrengthFromScore, EVIDENCE_STRENGTH_SCORE } from "@/lib/skillforge/mastery";
import type {
  MasteryDimensionScores,
  ProjectChallengeStatus,
  RatingScale,
  SkillAttempt,
  SkillAttemptResponse,
  SkillEvaluationResult,
  SkillEvidence,
  SkillForgeState,
  SkillModule,
  SkillProgress,
} from "@/types";

/**
 * Same storage pattern as `services/roadmap-service.ts`: a flat array keyed
 * by `userId`, persisted through the shared `lib/storage/local-storage.ts`
 * wrapper (the only file that touches `window.localStorage` directly). One
 * row per user is also exactly the shape a future Supabase table would take,
 * so migrating later means rewriting this file, not the components that
 * call it.
 */

function getAllStates(): SkillForgeState[] {
  return readJSON<SkillForgeState[]>(STORAGE_KEYS.skillforge) ?? [];
}

function saveAllStates(all: SkillForgeState[]): void {
  writeJSON(STORAGE_KEYS.skillforge, all);
}

function emptyState(userId: string): SkillForgeState {
  return {
    userId,
    skillProgress: {},
    interviewSessions: [],
    interviewEvaluations: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getSkillForgeState(userId: string): SkillForgeState {
  return getAllStates().find((s) => s.userId === userId) ?? emptyState(userId);
}

function saveState(state: SkillForgeState): void {
  const all = getAllStates();
  const index = all.findIndex((s) => s.userId === state.userId);
  const updated: SkillForgeState = { ...state, updatedAt: new Date().toISOString() };

  if (index === -1) {
    all.push(updated);
  } else {
    all[index] = updated;
  }
  saveAllStates(all);
}

function emptyDimensions(): MasteryDimensionScores {
  return { knowledge: 0, ability: 0, evidence: 0, interview: 0 };
}

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

/** Pure read — never writes a "phantom" progress row just because a skill card was viewed. Persistence only happens through the mutation functions below. */
export function getSkillProgress(userId: string, skillId: string): SkillProgress {
  const state = getSkillForgeState(userId);
  return state.skillProgress[skillId] ?? freshProgress(skillId);
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
 */
function recomputeMastery(progress: SkillProgress, module: SkillModule): SkillProgress {
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
  const knowledgeFromEvaluation = evaluatedAttempts.length > 0 ? Math.max(...evaluatedAttempts.map((a) => a.evaluation.knowledgeScore)) : 0;
  const abilityFromEvaluation = evaluatedAttempts.length > 0 ? Math.max(...evaluatedAttempts.map((a) => a.evaluation.abilityScore)) : 0;

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
  const confidence = computeConfidence(evaluatedAttempts.length);

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

function persistProgress(userId: string, progress: SkillProgress): SkillProgress {
  const now = new Date().toISOString();
  const withActivity: SkillProgress = {
    ...progress,
    startedAt: progress.startedAt ?? now,
    lastActivityAt: now,
  };

  const state = getSkillForgeState(userId);
  saveState({
    ...state,
    skillProgress: { ...state.skillProgress, [withActivity.skillId]: withActivity },
  });
  return withActivity;
}

export function markResourceCompleted(
  userId: string,
  module: SkillModule,
  resourceId: string,
  completed: boolean,
): SkillProgress {
  const current = getSkillProgress(userId, module.id);
  const completedResourceIds = completed
    ? [...new Set([...current.completedResourceIds, resourceId])]
    : current.completedResourceIds.filter((id) => id !== resourceId);
  const updated = recomputeMastery({ ...current, completedResourceIds }, module);
  return persistProgress(userId, updated);
}

export function markExerciseCompleted(
  userId: string,
  module: SkillModule,
  exerciseId: string,
  completed: boolean,
): SkillProgress {
  const current = getSkillProgress(userId, module.id);
  const completedExerciseIds = completed
    ? [...new Set([...current.completedExerciseIds, exerciseId])]
    : current.completedExerciseIds.filter((id) => id !== exerciseId);
  const updated = recomputeMastery({ ...current, completedExerciseIds }, module);
  return persistProgress(userId, updated);
}

export function setProjectChallengeStatus(
  userId: string,
  module: SkillModule,
  challengeId: string,
  status: ProjectChallengeStatus,
): SkillProgress {
  const current = getSkillProgress(userId, module.id);
  const updated = recomputeMastery(
    { ...current, projectChallengeStatus: { ...current.projectChallengeStatus, [challengeId]: status } },
    module,
  );
  return persistProgress(userId, updated);
}

export function addEvidence(
  userId: string,
  module: SkillModule,
  evidence: Omit<SkillEvidence, "id" | "skillId" | "addedAt">,
): SkillProgress {
  const current = getSkillProgress(userId, module.id);
  const entry: SkillEvidence = {
    ...evidence,
    id: crypto.randomUUID(),
    skillId: module.id,
    addedAt: new Date().toISOString(),
  };
  const updated = recomputeMastery({ ...current, evidence: [...current.evidence, entry] }, module);
  return persistProgress(userId, updated);
}

export function removeEvidence(userId: string, module: SkillModule, evidenceId: string): SkillProgress {
  const current = getSkillProgress(userId, module.id);
  const updated = recomputeMastery(
    { ...current, evidence: current.evidence.filter((e) => e.id !== evidenceId) },
    module,
  );
  return persistProgress(userId, updated);
}

export function setInterviewSelfRating(userId: string, module: SkillModule, rating: RatingScale): SkillProgress {
  const current = getSkillProgress(userId, module.id);
  const updated = recomputeMastery({ ...current, interviewSelfRating: rating }, module);
  return persistProgress(userId, updated);
}

/**
 * Records one diagnostic or assessment attempt. `evaluation` is `null` when
 * the AI evaluator couldn't grade it (no API key, request failure) — the raw
 * `responses` are still saved so the student's work is never lost, and the
 * attempt can be resubmitted for grading later without retyping anything.
 */
export function recordAttempt(
  userId: string,
  module: SkillModule,
  stage: "diagnostic" | "assessment",
  responses: SkillAttemptResponse[],
  evaluation: SkillEvaluationResult | null,
): SkillProgress {
  const current = getSkillProgress(userId, module.id);
  const now = new Date().toISOString();
  const attempt: SkillAttempt = {
    id: crypto.randomUUID(),
    skillId: module.id,
    stage,
    startedAt: now,
    completedAt: now,
    responses,
    evaluation,
  };
  const updated = recomputeMastery({ ...current, attempts: [...current.attempts, attempt] }, module);
  return persistProgress(userId, updated);
}
