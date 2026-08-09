import assert from "node:assert/strict";
import { test } from "vitest";
import { computeAssessmentSignal, computeMasteryLevel } from "../lib/skillforge/mastery";
import type { SkillAttempt, SkillEvaluationResult } from "../types/skillforge";

function evaluation(score: number): SkillEvaluationResult {
  return { perQuestion: [], knowledgeScore: score, abilityScore: score, overallScore: score, passed: score >= 70, dimensionScores: { accuracy: score, reasoning: score, application: score, communication: score }, strengths: [], weaknesses: [], weakestConceptId: null, weakConceptIds: [], recommendedNextStep: "Retry", gradingMetadata: { method: "deterministic", rubricVersion: "v2", provider: null, model: null, retries: 0 } };
}
function attempt(number: number, score: number, completedAt: string): SkillAttempt {
  return { id: String(number), skillId: "skill", stage: "assessment", assessmentId: "assessment", attemptNumber: number, startedAt: completedAt, completedAt, responses: [], evaluation: evaluation(score) };
}

test("recent repeated performance outweighs an older result", () => {
  const signal = computeAssessmentSignal([attempt(1, 30, "2025-01-01T00:00:00.000Z"), attempt(2, 80, "2026-07-01T00:00:00.000Z"), attempt(3, 90, "2026-07-02T00:00:00.000Z")], new Date("2026-07-03T00:00:00.000Z"));
  assert.ok(signal.knowledge > 70);
  assert.equal(signal.confidence, "medium"); // large spread reduces certainty
});

test("mastery requires demonstrated dimensions, not completion alone", () => {
  assert.equal(computeMasteryLevel({ knowledge: 25, ability: 20, evidence: 0, interview: 0 }), "familiar");
  assert.equal(computeMasteryLevel({ knowledge: 75, ability: 75, evidence: 60, interview: 75 }), "resume-ready");
});
