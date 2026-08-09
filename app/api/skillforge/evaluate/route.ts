import { evaluateSkillResponses } from "@/lib/skillforge/ai-evaluator";
import { EvaluateRequestSchema } from "@/lib/skillforge/evaluation-schema";
import { getSkillModule } from "@/lib/skillforge/catalog";
import { gradeDeterministicQuestions } from "@/lib/skillforge/deterministic-grader";
import { checkRateLimit, requestRateLimitKey } from "@/lib/ai/rate-limit";
import { exceedsContentLength } from "@/lib/http/request-limits";

export async function POST(request: Request) {
  if (exceedsContentLength(request, 100_000)) return Response.json({ error: "Assessment request is too large." }, { status: 413 });
  const rateLimit = checkRateLimit(requestRateLimitKey(request, "assessment"), 12);
  if (!rateLimit.allowed) return Response.json({ error: "Too many grading requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  const parsed = EvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const fieldPath = firstIssue?.path.join(".") || "request";
    return Response.json(
      { error: firstIssue ? `${fieldPath}: ${firstIssue.message}` : "Invalid evaluation request." },
      { status: 400 },
    );
  }

  const skillModule = getSkillModule(parsed.data.skillId);
  if (!skillModule) {
    return Response.json({ error: "That skill module does not exist." }, { status: 404 });
  }

  const questions = parsed.data.stage === "diagnostic" ? skillModule.diagnostic.prompts : skillModule.assessment.questions;
  const expectedIds = new Set(questions.map((question) => question.id));
  const responseIds = parsed.data.responses.map((response) => response.questionId);
  const uniqueResponseIds = new Set(responseIds);
  const hasExactQuestionSet =
    responseIds.length === expectedIds.size &&
    uniqueResponseIds.size === responseIds.length &&
    responseIds.every((id) => expectedIds.has(id));

  if (!hasExactQuestionSet) {
    return Response.json(
      { error: "Responses must answer each question exactly once." },
      { status: 400 },
    );
  }

  // The catalog is the trusted source for prompt content. The browser only
  // submits answer text and identifiers, so it cannot alter the grading rubric.
  const evaluationRequest = {
    ...parsed.data,
    moduleName: skillModule.name,
    moduleDescription: skillModule.description,
    concepts: skillModule.concepts,
    questions,
  };

  // `evaluation` is null when the AI evaluator is unavailable (no API key,
  // network failure, malformed response) — always a 200 with a null payload,
  // never a 500, so the client can render an honest "couldn't evaluate right
  // now, your answers are saved" state instead of an error boundary.
  const evaluation = gradeDeterministicQuestions(questions, parsed.data.responses) ?? await evaluateSkillResponses(evaluationRequest);
  return Response.json({ evaluation });
}
