import { and, eq, inArray } from "drizzle-orm";
import { withUserContext, type Tx } from "@/lib/db/with-user-context";
import { assessmentAttempts, assessments, profiles, skillEvidence, skillProgress } from "@/lib/db/schema";
import { freshProgress, recomputeMastery } from "@/lib/skillforge/mastery";
import type {
  ConfidenceLevel,
  EvidenceStrength,
  MasteryDimensionScores,
  ProjectChallengeStatus,
  RatingScale,
  SkillAttempt,
  SkillAttemptResponse,
  SkillEvaluationResult,
  SkillEvidence,
  SkillModule,
  SkillProgress,
} from "@/types";

async function getProfileRowId(tx: Tx, userId: string): Promise<string> {
  const [row] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!row) throw new Error("No profile exists for this user yet.");
  return row.id;
}

async function loadProgress(tx: Tx, profileId: string, skillId: string): Promise<SkillProgress> {
  const [row] = await tx
    .select()
    .from(skillProgress)
    .where(and(eq(skillProgress.profileId, profileId), eq(skillProgress.skillId, skillId)))
    .limit(1);

  if (!row) return freshProgress(skillId);

  const [evidenceRows, attemptRows] = await Promise.all([
    tx.select().from(skillEvidence).where(eq(skillEvidence.skillProgressId, row.id)),
    tx
      .select({ attempt: assessmentAttempts, stage: assessments.stage })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
      .where(eq(assessmentAttempts.skillProgressId, row.id)),
  ]);

  const evidence: SkillEvidence[] = evidenceRows.map((e) => ({
    id: e.id,
    skillId,
    type: e.type as SkillEvidence["type"],
    title: e.title,
    url: e.url ?? undefined,
    strength: e.strength as EvidenceStrength,
    addedAt: e.addedAt.toISOString(),
  }));

  const attempts: SkillAttempt[] = attemptRows
    .map(({ attempt, stage }) => ({
      id: attempt.id,
      skillId,
      stage: stage as "diagnostic" | "assessment",
      startedAt: attempt.startedAt.toISOString(),
      completedAt: (attempt.completedAt ?? attempt.startedAt).toISOString(),
      responses: attempt.responses as SkillAttemptResponse[],
      evaluation: attempt.evaluation as SkillEvaluationResult | null,
    }))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  return {
    skillId,
    startedAt: row.startedAt?.toISOString() ?? null,
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
    completedResourceIds: row.completedResourceIds,
    completedExerciseIds: row.completedExerciseIds,
    projectChallengeStatus: row.projectChallengeStatus as Record<string, ProjectChallengeStatus>,
    evidence,
    interviewSelfRating: row.interviewSelfRating as RatingScale | null,
    attempts,
    mastery: {
      skillId,
      level: row.level as SkillProgress["mastery"]["level"],
      dimensions: row.dimensions as MasteryDimensionScores,
      confidence: row.confidence as Record<"knowledge" | "ability", ConfidenceLevel>,
      evidenceStrength: row.evidenceStrength as EvidenceStrength,
      isResumeReady: row.level === "resume-ready",
      updatedAt: row.updatedAt.toISOString(),
    },
  };
}

async function persist(tx: Tx, profileId: string, module: SkillModule, progress: SkillProgress): Promise<SkillProgress> {
  const recomputed = recomputeMastery(progress, module);
  const now = new Date();

  await tx
    .insert(skillProgress)
    .values({
      profileId,
      skillId: module.id,
      level: recomputed.mastery.level,
      dimensions: recomputed.mastery.dimensions,
      confidence: recomputed.mastery.confidence,
      evidenceStrength: recomputed.mastery.evidenceStrength,
      completedResourceIds: recomputed.completedResourceIds,
      completedExerciseIds: recomputed.completedExerciseIds,
      projectChallengeStatus: recomputed.projectChallengeStatus,
      interviewSelfRating: recomputed.interviewSelfRating,
      startedAt: recomputed.startedAt ? new Date(recomputed.startedAt) : now,
      lastActivityAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [skillProgress.profileId, skillProgress.skillId],
      set: {
        level: recomputed.mastery.level,
        dimensions: recomputed.mastery.dimensions,
        confidence: recomputed.mastery.confidence,
        evidenceStrength: recomputed.mastery.evidenceStrength,
        completedResourceIds: recomputed.completedResourceIds,
        completedExerciseIds: recomputed.completedExerciseIds,
        projectChallengeStatus: recomputed.projectChallengeStatus,
        interviewSelfRating: recomputed.interviewSelfRating,
        lastActivityAt: now,
        updatedAt: now,
      },
    });

  return loadProgress(tx, profileId, module.id);
}

export async function getSkillProgress(userId: string, skillId: string): Promise<SkillProgress> {
  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    return loadProgress(tx, profileId, skillId);
  });
}

/**
 * Bulk-loads progress for several skills in one round trip — used wherever a
 * deterministic engine (`checkReadiness`, dashboard aggregation) needs a
 * SYNCHRONOUS `(skillId) => SkillProgress` lookup over a known set of
 * modules. Those engines stay pure and I/O-free by design (see
 * `lib/skillforge/readiness.ts`); callers fetch this map once up front and
 * derive a sync getter from it, rather than the engine awaiting anything
 * itself. Skills with no persisted row come back as `freshProgress`.
 */
export async function listSkillProgress(userId: string, skillIds: string[]): Promise<Record<string, SkillProgress>> {
  if (skillIds.length === 0) return {};

  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    const rows = await tx
      .select()
      .from(skillProgress)
      .where(and(eq(skillProgress.profileId, profileId), inArray(skillProgress.skillId, skillIds)));

    const rowIds = rows.map((r) => r.id);
    const [evidenceRows, attemptRows] = await Promise.all([
      rowIds.length > 0 ? tx.select().from(skillEvidence).where(inArray(skillEvidence.skillProgressId, rowIds)) : Promise.resolve([]),
      rowIds.length > 0
        ? tx
            .select({ attempt: assessmentAttempts, stage: assessments.stage })
            .from(assessmentAttempts)
            .innerJoin(assessments, eq(assessmentAttempts.assessmentId, assessments.id))
            .where(inArray(assessmentAttempts.skillProgressId, rowIds))
        : Promise.resolve([]),
    ]);

    const result: Record<string, SkillProgress> = {};
    for (const skillId of skillIds) {
      const row = rows.find((r) => r.skillId === skillId);
      if (!row) {
        result[skillId] = freshProgress(skillId);
        continue;
      }

      const evidence: SkillEvidence[] = evidenceRows
        .filter((e) => e.skillProgressId === row.id)
        .map((e) => ({
          id: e.id,
          skillId,
          type: e.type as SkillEvidence["type"],
          title: e.title,
          url: e.url ?? undefined,
          strength: e.strength as EvidenceStrength,
          addedAt: e.addedAt.toISOString(),
        }));

      const attempts: SkillAttempt[] = attemptRows
        .filter(({ attempt }) => attempt.skillProgressId === row.id)
        .map(({ attempt, stage }) => ({
          id: attempt.id,
          skillId,
          stage: stage as "diagnostic" | "assessment",
          startedAt: attempt.startedAt.toISOString(),
          completedAt: (attempt.completedAt ?? attempt.startedAt).toISOString(),
          responses: attempt.responses as SkillAttemptResponse[],
          evaluation: attempt.evaluation as SkillEvaluationResult | null,
        }))
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

      result[skillId] = {
        skillId,
        startedAt: row.startedAt?.toISOString() ?? null,
        lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
        completedResourceIds: row.completedResourceIds,
        completedExerciseIds: row.completedExerciseIds,
        projectChallengeStatus: row.projectChallengeStatus as Record<string, ProjectChallengeStatus>,
        evidence,
        interviewSelfRating: row.interviewSelfRating as RatingScale | null,
        attempts,
        mastery: {
          skillId,
          level: row.level as SkillProgress["mastery"]["level"],
          dimensions: row.dimensions as MasteryDimensionScores,
          confidence: row.confidence as Record<"knowledge" | "ability", ConfidenceLevel>,
          evidenceStrength: row.evidenceStrength as EvidenceStrength,
          isResumeReady: row.level === "resume-ready",
          updatedAt: row.updatedAt.toISOString(),
        },
      };
    }
    return result;
  });
}

export async function markResourceCompleted(userId: string, module: SkillModule, resourceId: string, completed: boolean): Promise<SkillProgress> {
  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    const current = await loadProgress(tx, profileId, module.id);
    const completedResourceIds = completed
      ? [...new Set([...current.completedResourceIds, resourceId])]
      : current.completedResourceIds.filter((id) => id !== resourceId);
    return persist(tx, profileId, module, { ...current, completedResourceIds });
  });
}

export async function markExerciseCompleted(userId: string, module: SkillModule, exerciseId: string, completed: boolean): Promise<SkillProgress> {
  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    const current = await loadProgress(tx, profileId, module.id);
    const completedExerciseIds = completed
      ? [...new Set([...current.completedExerciseIds, exerciseId])]
      : current.completedExerciseIds.filter((id) => id !== exerciseId);
    return persist(tx, profileId, module, { ...current, completedExerciseIds });
  });
}

export async function setProjectChallengeStatus(userId: string, module: SkillModule, challengeId: string, status: ProjectChallengeStatus): Promise<SkillProgress> {
  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    const current = await loadProgress(tx, profileId, module.id);
    return persist(tx, profileId, module, {
      ...current,
      projectChallengeStatus: { ...current.projectChallengeStatus, [challengeId]: status },
    });
  });
}

export async function setInterviewSelfRating(userId: string, module: SkillModule, rating: RatingScale): Promise<SkillProgress> {
  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    const current = await loadProgress(tx, profileId, module.id);
    return persist(tx, profileId, module, { ...current, interviewSelfRating: rating });
  });
}

export async function addEvidence(
  userId: string,
  module: SkillModule,
  evidence: Omit<SkillEvidence, "id" | "skillId" | "addedAt">,
): Promise<SkillProgress> {
  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    const current = await loadProgress(tx, profileId, module.id);
    // A child evidence row needs a skill_progress row to hang off of, so
    // make sure one exists (idempotent no-op if it already does) before
    // inserting.
    const skillProgressId = await persistAndGetId(tx, profileId, module, current);

    await tx.insert(skillEvidence).values({
      skillProgressId,
      type: evidence.type,
      title: evidence.title,
      url: evidence.url ?? null,
      strength: evidence.strength,
    });

    const reloaded = await loadProgress(tx, profileId, module.id);
    return persist(tx, profileId, module, reloaded);
  });
}

export async function removeEvidence(userId: string, module: SkillModule, evidenceId: string): Promise<SkillProgress> {
  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    await tx.delete(skillEvidence).where(eq(skillEvidence.id, evidenceId));
    const reloaded = await loadProgress(tx, profileId, module.id);
    return persist(tx, profileId, module, reloaded);
  });
}

/**
 * Records one diagnostic or assessment attempt. `evaluation` is `null` when
 * the AI evaluator couldn't grade it (no API key, request failure) — the raw
 * `responses` are still saved so the student's work is never lost, and the
 * attempt can be resubmitted for grading later without retyping anything.
 */
export async function recordAttempt(
  userId: string,
  module: SkillModule,
  stage: "diagnostic" | "assessment",
  responses: SkillAttemptResponse[],
  evaluation: SkillEvaluationResult | null,
): Promise<SkillProgress> {
  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    const current = await loadProgress(tx, profileId, module.id);
    const skillProgressId = await persistAndGetId(tx, profileId, module, current);

    const [assessmentRow] = await tx
      .select({ id: assessments.id })
      .from(assessments)
      .where(and(eq(assessments.skillId, module.id), eq(assessments.stage, stage)));
    if (!assessmentRow) {
      throw new Error(
        `No seeded assessment row for skill "${module.id}" stage "${stage}" — run "npm run db:seed:reference" after adding/editing modules in data/skillforge-modules.ts.`,
      );
    }

    const now = new Date();
    await tx.insert(assessmentAttempts).values({
      skillProgressId,
      assessmentId: assessmentRow.id,
      stage,
      responses,
      evaluation,
      startedAt: now,
      completedAt: now,
    });

    const reloaded = await loadProgress(tx, profileId, module.id);
    return persist(tx, profileId, module, reloaded);
  });
}

async function persistAndGetId(tx: Tx, profileId: string, module: SkillModule, current: SkillProgress): Promise<string> {
  await persist(tx, profileId, module, current);
  const [row] = await tx
    .select({ id: skillProgress.id })
    .from(skillProgress)
    .where(and(eq(skillProgress.profileId, profileId), eq(skillProgress.skillId, module.id)));
  return row.id;
}
