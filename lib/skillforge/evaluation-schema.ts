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
  overallScore: z.number().min(0).max(100),
  passed: z.boolean(),
  dimensionScores: z.object({
    accuracy: z.number().min(0).max(100),
    reasoning: z.number().min(0).max(100),
    application: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
  }),
  weakConceptIds: z.array(z.string()).max(10),
  gradingMetadata: z.object({
    method: z.enum(["deterministic", "ai-assisted", "hybrid"]),
    rubricVersion: z.string(),
    provider: z.string().nullable(),
    model: z.string().nullable(),
    retries: z.number().int().min(0),
  }),
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
    overallScore: { type: "number" },
    passed: { type: "boolean" },
    dimensionScores: {
      type: "object",
      properties: {
        accuracy: { type: "number" }, reasoning: { type: "number" }, application: { type: "number" }, communication: { type: "number" },
      },
      required: ["accuracy", "reasoning", "application", "communication"],
    },
    weakConceptIds: { type: "array", items: { type: "string" } },
    gradingMetadata: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["ai-assisted"] },
        rubricVersion: { type: "string" },
        provider: { type: ["string", "null"] }, model: { type: ["string", "null"] }, retries: { type: "number" },
      },
      required: ["method", "rubricVersion", "provider", "model", "retries"],
    },
  },
  required: ["perQuestion", "knowledgeScore", "abilityScore", "strengths", "weaknesses", "weakestConceptId", "recommendedNextStep", "overallScore", "passed", "dimensionScores", "weakConceptIds", "gradingMetadata"],
};

const ResponseSchema = z.object({
  questionId: z.string().min(1).max(100),
  answer: z.string().trim().min(1, "An answer is required").max(4000),
});

export const EvaluateRequestSchema = z.object({
  skillId: z.string().min(1).max(100),
  stage: z.enum(["diagnostic", "assessment"]),
  responses: z.array(ResponseSchema).min(1).max(20),
});

export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;
