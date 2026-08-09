import assert from "node:assert/strict";
import { test } from "vitest";
import { gradeDeterministicQuestions } from "../lib/skillforge/deterministic-grader";

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
