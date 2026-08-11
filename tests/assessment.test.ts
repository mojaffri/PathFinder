import assert from "node:assert/strict";
import { test } from "vitest";
import { gradeDeterministicQuestions } from "../lib/skillforge/deterministic-grader";
import { SKILL_MODULES } from "../data/skillforge-modules";

test("deterministic grading normalizes answers and identifies weak concepts", () => {
  const result = gradeDeterministicQuestions(
    [
      { id: "q1", conceptId: "loops", prompt: "Output?", kind: "code-output", correctAnswer: "1 2 3" },
      { id: "q2", conceptId: "types", prompt: "True?", kind: "true-false", correctAnswer: "true" },
    ],
    [{ questionId: "q1", answer: "  1   2 3 " }, { questionId: "q2", answer: "false" }],
  );
  assert.equal(result?.overallScore, 50);
  assert.equal(result?.passed, false);
  assert.deepEqual(result?.weakConceptIds, ["types"]);
  assert.equal(result?.gradingMetadata.method, "deterministic");
});

test("open responses are deliberately not graded deterministically", () => {
  assert.equal(gradeDeterministicQuestions([{ id: "q", conceptId: "reasoning", prompt: "Explain", kind: "open-response" }], [{ questionId: "q", answer: "Because" }]), null);
});

test("every Test Me First diagnostic has deterministic selectable answers", () => {
  for (const skillModule of SKILL_MODULES) {
    const questions = skillModule.diagnostic.prompts;
    assert.ok(questions.every((question) => question.kind === "multiple-choice" || question.kind === "true-false"), skillModule.id);
    assert.ok(questions.every((question) => question.options && question.options.length >= 2), skillModule.id);
    assert.ok(questions.every((question) => question.correctAnswer && question.options?.includes(question.correctAnswer)), skillModule.id);
    const result = gradeDeterministicQuestions(
      questions,
      questions.map((question) => ({ questionId: question.id, answer: question.correctAnswer ?? "" })),
    );
    assert.equal(result?.overallScore, 100, skillModule.id);
  }
});

test("every current mastery assessment can be graded without an AI provider", () => {
  for (const skillModule of SKILL_MODULES) {
    const questions = skillModule.assessment.questions;
    assert.ok(questions.every((question) => question.kind === "multiple-choice" || question.kind === "true-false" || question.kind === "code-output"), skillModule.id);
    assert.ok(questions.every((question) => question.correctAnswer), skillModule.id);
    const result = gradeDeterministicQuestions(
      questions,
      questions.map((question) => ({ questionId: question.id, answer: question.correctAnswer ?? "" })),
    );
    assert.equal(result?.overallScore, 100, skillModule.id);
  }
});
