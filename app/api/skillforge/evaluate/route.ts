import { evaluateSkillResponses } from "@/lib/skillforge/ai-evaluator";
import { EvaluateRequestSchema } from "@/lib/skillforge/evaluation-schema";
import { getSkillModule } from "@/lib/skillforge/catalog";
import { gradeDeterministicQuestions } from "@/lib/skillforge/deterministic-grader";
import { exceedsContentLength } from "@/lib/http/request-limits";
import { getServerUser } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  return withDbErrorHandling(async () => {
  if (exceedsContentLength(request, 100_000)) {
    return NextResponse.json({ error: "Assessment request is too large." }, { status: 413 });
  }
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const limited = await enforceRateLimit(user.id, "skill-evaluation", 20, 600);
  if (limited) return limited;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  const parsed = EvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const fieldPath = firstIssue?.path.join(".") || "request";
    return NextResponse.json(
      { error: firstIssue ? `${fieldPath}: ${firstIssue.message}` : "Invalid evaluation request." },
      { status: 400 },
    );
  }

  const skillModule = getSkillModule(parsed.data.skillId);
  if (!skillModule) {
    return NextResponse.json({ error: "That skill module does not exist." }, { status: 404 });
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
    return NextResponse.json(
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
  return NextResponse.json({ evaluation });
  });
}
