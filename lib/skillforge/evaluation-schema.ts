import { z } from "zod";

/**
 * Mirrors the `lib/roadmap/schema.ts` pattern: a zod schema to validate the
 * AI's structured tool-use response, plus a hand-written JSON Schema (used as
 * the actual `input_schema` for the tool call, since the Anthropic SDK
 * doesn't accept zod schemas directly there).
 */

const QuestionVerdictSchema = z.enum(["correct", "partially-correct", "incorrect", "insufficient-evidence"]);

const QuestionEvaluationSchema = z.object({
  questionId: z.string(),
  conceptId: z.string().nullable(),
  verdict: QuestionVerdictSchema,
  explanation: z.string(),
});

export const SkillEvaluationResultSchema = z.object({
  perQuestion: z.array(QuestionEvaluationSchema),
  knowledgeScore: z.number().min(0).max(100),
  abilityScore: z.number().min(0).max(100),
  strengths: z.array(z.string()).max(5),
  weaknesses: z.array(z.string()).max(5),
  weakestConceptId: z.string().nullable(),
  recommendedNextStep: z.string(),
});

export type SkillEvaluationResultParsed = z.infer<typeof SkillEvaluationResultSchema>;

export const EVALUATION_TOOL_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    perQuestion: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questionId: { type: "string" },
          conceptId: { type: ["string", "null"] },
          verdict: { type: "string", enum: ["correct", "partially-correct", "incorrect", "insufficient-evidence"] },
          explanation: {
            type: "string",
            description: "Specific, honest reasoning for this verdict — name the concept the student got right or wrong.",
          },
        },
        required: ["questionId", "conceptId", "verdict", "explanation"],
      },
    },
    knowledgeScore: { type: "number", description: "0-100. How well the student understands the underlying concepts." },
    abilityScore: { type: "number", description: "0-100. How well the student can apply/reason with the material, not just recite it." },
    strengths: { type: "array", items: { type: "string" }, description: "Specific things the student demonstrated well. Empty array if none." },
    weaknesses: { type: "array", items: { type: "string" }, description: "Specific gaps, tied to concept names. Empty array if none." },
    weakestConceptId: {
      type: ["string", "null"],
      description: "The single concept id the student struggled with most, or null if no real weakness showed up.",
    },
    recommendedNextStep: { type: "string", description: "One concrete, specific sentence telling the student what to do next." },
  },
  required: ["perQuestion", "knowledgeScore", "abilityScore", "strengths", "weaknesses", "weakestConceptId", "recommendedNextStep"],
};

const ConceptSchema = z.object({ id: z.string(), title: z.string(), description: z.string() });
const QuestionSchema = z.object({ id: z.string(), conceptId: z.string(), prompt: z.string() });
const ResponseSchema = z.object({ questionId: z.string(), answer: z.string().max(4000) });

export const EvaluateRequestSchema = z.object({
  skillId: z.string(),
  stage: z.enum(["diagnostic", "assessment"]),
  moduleName: z.string(),
  moduleDescription: z.string(),
  concepts: z.array(ConceptSchema).min(1),
  questions: z.array(QuestionSchema).min(1),
  responses: z.array(ResponseSchema).min(1),
});

export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;
