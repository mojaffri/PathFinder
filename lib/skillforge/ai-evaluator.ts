import { ANTHROPIC_MODEL, getAnthropicClient } from "@/lib/ai/anthropic-client";
import { EVALUATION_TOOL_JSON_SCHEMA, SkillEvaluationResultSchema, type EvaluateRequest } from "./evaluation-schema";
import type { SkillEvaluationResult } from "@/types";

const TOOL_NAME = "evaluate_skill_responses";

function buildPrompt(req: EvaluateRequest): string {
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

Never fabricate strengths, evidence, or achievements the student didn't actually demonstrate in their answers.`;
}

/**
 * Server-only. Mirrors `lib/roadmap/ai-generator.ts`: structured tool-use
 * extraction, zod-validated, returns `null` on any failure (missing key,
 * network error, malformed response) so the route handler and UI can fall
 * back to an honest "couldn't evaluate right now" state instead of crashing
 * or fabricating a result.
 */
export async function evaluateSkillResponses(req: EvaluateRequest): Promise<SkillEvaluationResult | null> {
  const client = getAnthropicClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      tools: [
        {
          name: TOOL_NAME,
          description: "Return a structured, honest evaluation of the student's skill responses.",
          input_schema: EVALUATION_TOOL_JSON_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [{ role: "user", content: buildPrompt(req) }],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return null;

    const parsed = SkillEvaluationResultSchema.safeParse(toolUse.input);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
