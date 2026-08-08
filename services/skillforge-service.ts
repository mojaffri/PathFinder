import type {
  ProjectChallengeStatus,
  RatingScale,
  SkillAttemptResponse,
  SkillEvaluationResult,
  SkillEvidence,
  SkillProgress,
} from "@/types";

/**
 * Thin fetch wrapper over `/api/skillforge/progress/*` — the skill module
 * itself is resolved server-side from the static catalog, so every call
 * here only ever needs the module's id, never the full object, keeping
 * request bodies small.
 */

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function getSkillProgress(skillId: string): Promise<SkillProgress> {
  const res = await fetch(`/api/skillforge/progress/${skillId}`);
  const data = (await parseJsonOrThrow(res)) as { progress: SkillProgress };
  return data.progress;
}

/** Bulk read for a known set of modules — see `app/api/skillforge/progress/route.ts`. */
export async function getSkillProgressMap(skillIds: string[]): Promise<Record<string, SkillProgress>> {
  if (skillIds.length === 0) return {};
  const res = await fetch(`/api/skillforge/progress?skillIds=${encodeURIComponent(skillIds.join(","))}`);
  const data = (await parseJsonOrThrow(res)) as { progress: Record<string, SkillProgress> };
  return data.progress;
}

async function patchProgress(skillId: string, body: unknown): Promise<SkillProgress> {
  const res = await fetch(`/api/skillforge/progress/${skillId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await parseJsonOrThrow(res)) as { progress: SkillProgress };
  return data.progress;
}

export function markResourceCompleted(skillId: string, resourceId: string, completed: boolean): Promise<SkillProgress> {
  return patchProgress(skillId, { kind: "resource", resourceId, completed });
}

export function markExerciseCompleted(skillId: string, exerciseId: string, completed: boolean): Promise<SkillProgress> {
  return patchProgress(skillId, { kind: "exercise", exerciseId, completed });
}

export function setProjectChallengeStatus(skillId: string, challengeId: string, status: ProjectChallengeStatus): Promise<SkillProgress> {
  return patchProgress(skillId, { kind: "project", challengeId, status });
}

export function setInterviewSelfRating(skillId: string, rating: RatingScale): Promise<SkillProgress> {
  return patchProgress(skillId, { kind: "interview", rating });
}

export async function addEvidence(
  skillId: string,
  evidence: Omit<SkillEvidence, "id" | "skillId" | "addedAt">,
): Promise<SkillProgress> {
  const res = await fetch(`/api/skillforge/progress/${skillId}/evidence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(evidence),
  });
  const data = (await parseJsonOrThrow(res)) as { progress: SkillProgress };
  return data.progress;
}

export async function removeEvidence(skillId: string, evidenceId: string): Promise<SkillProgress> {
  const res = await fetch(`/api/skillforge/progress/${skillId}/evidence/${evidenceId}`, { method: "DELETE" });
  const data = (await parseJsonOrThrow(res)) as { progress: SkillProgress };
  return data.progress;
}

export async function recordAttempt(
  skillId: string,
  stage: "diagnostic" | "assessment",
  responses: SkillAttemptResponse[],
  evaluation: SkillEvaluationResult | null,
): Promise<SkillProgress> {
  const res = await fetch(`/api/skillforge/progress/${skillId}/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage, responses, evaluation }),
  });
  const data = (await parseJsonOrThrow(res)) as { progress: SkillProgress };
  return data.progress;
}
