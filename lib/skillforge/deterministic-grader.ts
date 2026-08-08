import type { AssessmentQuestion, QuestionEvaluation, SkillAttemptResponse, SkillEvaluationResult } from "../../types/skillforge";

export const ASSESSMENT_RUBRIC_VERSION = "skillforge-rubric-v2";

export function isDeterministicQuestion(question: AssessmentQuestion): boolean {
  return question.kind === "multiple-choice" || question.kind === "true-false" || question.kind === "code-output";
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function gradeDeterministicQuestions(
  questions: AssessmentQuestion[],
  responses: SkillAttemptResponse[],
): SkillEvaluationResult | null {
  if (questions.length === 0 || !questions.every(isDeterministicQuestion)) return null;
  const answers = new Map(responses.map((response) => [response.questionId, response.answer]));
  const perQuestion: QuestionEvaluation[] = questions.map((question) => {
    const accepted = [question.correctAnswer, ...(question.acceptedAnswers ?? [])].filter((answer): answer is string => Boolean(answer));
    const correct = accepted.some((answer) => normalize(answer) === normalize(answers.get(question.id) ?? ""));
    return {
      questionId: question.id,
      conceptId: question.conceptId,
      verdict: correct ? "correct" : "incorrect",
      explanation: correct ? "Correct." : "That answer does not match the expected result.",
    };
  });
  const overallScore = Math.round((perQuestion.filter((item) => item.verdict === "correct").length / perQuestion.length) * 100);
  const weakConceptIds = [...new Set(perQuestion.filter((item) => item.verdict !== "correct").map((item) => item.conceptId).filter((id): id is string => id !== null))];
  return {
    perQuestion,
    knowledgeScore: overallScore,
    abilityScore: overallScore,
    overallScore,
    passed: overallScore >= 70,
    dimensionScores: { accuracy: overallScore, reasoning: overallScore, application: overallScore, communication: 100 },
    strengths: overallScore > 0 ? ["Correctly answered deterministic assessment items."] : [],
    weaknesses: weakConceptIds.map((id) => `Review ${id}.`),
    weakestConceptId: weakConceptIds[0] ?? null,
    weakConceptIds,
    recommendedNextStep: overallScore >= 70 ? "Continue to the next evidence challenge." : "Review the missed concepts and retry.",
    gradingMetadata: { method: "deterministic", rubricVersion: ASSESSMENT_RUBRIC_VERSION, provider: null, model: null, retries: 0 },
  };
}
