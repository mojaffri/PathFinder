import { evaluateSkillResponses } from "@/lib/skillforge/ai-evaluator";
import { EvaluateRequestSchema } from "@/lib/skillforge/evaluation-schema";

export async function POST(request: Request) {
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

  // `evaluation` is null when the AI evaluator is unavailable (no API key,
  // network failure, malformed response) — always a 200 with a null payload,
  // never a 500, so the client can render an honest "couldn't evaluate right
  // now, your answers are saved" state instead of an error boundary.
  const evaluation = await evaluateSkillResponses(parsed.data);
  return Response.json({ evaluation });
}
