import { requestStructuredAI } from "@/lib/ai/structured-output";
import { EVALUATION_TOOL_JSON_SCHEMA, SkillEvaluationResultSchema, type EvaluateRequest } from "./evaluation-schema";
import type { SkillEvaluationResult } from "@/types";

const TOOL_NAME = "evaluate_skill_responses";

type TrustedEvaluateRequest = EvaluateRequest & {
  moduleName: string;
  moduleDescription: string;
  concepts: { id: string; title: string; description: string }[];
  questions: { id: string; conceptId: string; prompt: string }[];
};

function buildPrompt(req: TrustedEvaluateRequest): string {
  const conceptsBlock = req.concepts.map((c) => `- ${c.id}: ${c.title} — ${c.description}`).join("\n");
  const qaBlock = req.questions
    .map((q) => {
      const answer = req.responses.find((r) => r.questionId === q.id)?.answer.trim();
      return `Q (id: ${q.id}, concept: ${q.conceptId}): ${q.prompt}\nStudent's answer: ${answer || "(left blank)"}`;
    })
    .join("\n\n");

  return `You are evaluating a student's ${req.stage === "diagnostic" ? "diagnostic placement responses" : "mastery assessment responses"} for the skill "${req.moduleName}" (${req.moduleDescription}).

Concepts this skill covers:
${conceptsBlock}

Student responses:
${qaBlock}

Grade honestly and specifically. For EACH question, distinguish:
- "correct": accurately demonstrates the concept.
- "partially-correct": on the right track but incomplete or has a real gap.
- "incorrect": wrong or reflects a genuine misconception.
- "insufficient-evidence": too short, vague, or off-topic to judge either way — never guess in the student's favor here.

Do not reward confident-sounding but wrong or vague answers. If a student is wrong or vague, explain specifically what they got wrong or missed, referencing the actual concept.

Then give:
- knowledgeScore (0-100): overall understanding of the underlying concepts, based only on what was actually demonstrated here.
- abilityScore (0-100): how well they can apply/reason with the material, not just recite it.
- strengths: specific things they demonstrated well (empty array if genuinely none).
- weaknesses: specific gaps, tied to concept names (empty array if genuinely none).
- weakestConceptId: the single concept id (must match one of the concept ids above) they struggled with most, or null if no real weakness showed up.
- recommendedNextStep: one concrete, specific sentence telling the student what to do next (e.g. "Review [concept], then retry the assessment" or "You're ready to move on to the project").
- dimensionScores (0-100 each): accuracy, reasoning, application, and communication. Score only demonstrated work.
- overallScore (0-100): accuracy 35%, reasoning 30%, application 25%, communication 10%.
- passed: true only when overallScore is at least 70 and neither accuracy nor reasoning is below 60.
- weakConceptIds: every concept id that needs targeted review.
- gradingMetadata: method "ai-assisted", rubricVersion "skillforge-rubric-v2", provider/model null, retries 0. The server replaces provider metadata.

Never fabricate strengths, evidence, or achievements the student didn't actually demonstrate in their answers.`;
}

/**
 * Server-only. Mirrors `lib/roadmap/ai-generator.ts`: structured tool-use
 * extraction, zod-validated, returns `null` on any failure (missing key,
 * network error, malformed response) so the route handler and UI can fall
 * back to an honest "couldn't evaluate right now" state instead of crashing
 * or fabricating a result.
 */
export async function evaluateSkillResponses(req: TrustedEvaluateRequest): Promise<SkillEvaluationResult | null> {
  try {
    const result = await requestStructuredAI({
      feature: "assessment-grading",
      schema: SkillEvaluationResultSchema,
      toolSchema: EVALUATION_TOOL_JSON_SCHEMA,
      toolName: TOOL_NAME,
      toolDescription: "Return a structured, rubric-based evaluation of the student's skill responses.",
      prompt: buildPrompt(req),
      maxTokens: 2000,
      timeoutMs: 20_000,
    });
    const parsed = result.data;

    const questionIds = new Set(req.questions.map((question) => question.id));
    const conceptIds = new Set(req.concepts.map((concept) => concept.id));
    const evaluatedIds = parsed.perQuestion.map((item) => item.questionId);
    if (
      evaluatedIds.length !== questionIds.size ||
      new Set(evaluatedIds).size !== evaluatedIds.length ||
      !evaluatedIds.every((id) => questionIds.has(id)) ||
      parsed.perQuestion.some((item) => item.conceptId !== null && !conceptIds.has(item.conceptId)) ||
      (parsed.weakestConceptId !== null && !conceptIds.has(parsed.weakestConceptId))
    ) {
      return null;
    }

    const calculatedOverall = Math.round(
      parsed.dimensionScores.accuracy * 0.35 +
      parsed.dimensionScores.reasoning * 0.3 +
      parsed.dimensionScores.application * 0.25 +
      parsed.dimensionScores.communication * 0.1,
    );
    return {
      ...parsed,
      overallScore: calculatedOverall,
      passed: calculatedOverall >= 70 && parsed.dimensionScores.accuracy >= 60 && parsed.dimensionScores.reasoning >= 60,
      gradingMetadata: { method: "ai-assisted", rubricVersion: "skillforge-rubric-v2", provider: result.metadata.provider, model: result.metadata.model, retries: result.metadata.retries },
    };
  } catch {
    return null;
  }
}
