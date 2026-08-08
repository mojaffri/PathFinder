import { CAREERS } from "@/data/careers";
import { getAIAdvantageForCategories } from "@/data/ai-advantage";
import { analyzeGaps, deriveTopMoves } from "@/lib/gap-analysis/engine";
import { generateRoadmapWithAI } from "@/lib/roadmap/ai-generator";
import { generateFallbackRoadmap } from "@/lib/roadmap/fallback";
import { computePhaseTimelines, totalEstimatedHours } from "@/lib/roadmap/pacing";
import { RoadmapRequestSchema } from "@/lib/roadmap/schema";
import { buildTargetResumeBenchmark } from "@/lib/roadmap/target-resume";
import { resolveCareers, type Roadmap } from "@/types";
import { checkRateLimit, requestRateLimitKey } from "@/lib/ai/rate-limit";
import { exceedsContentLength } from "@/lib/http/request-limits";

export async function POST(request: Request) {
  if (exceedsContentLength(request, 500_000)) return Response.json({ error: "Roadmap request is too large." }, { status: 413 });
  const rateLimit = checkRateLimit(requestRateLimitKey(request, "roadmap"), 6);
  if (!rateLimit.allowed) return Response.json({ error: "Too many roadmap requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  const parsed = RoadmapRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const fieldPath = firstIssue?.path.join(".") || "request";
    return Response.json(
      {
        error: firstIssue ? `${fieldPath}: ${firstIssue.message}` : "Invalid roadmap request.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const req = parsed.data;
  const resolvedCareers = resolveCareers(CAREERS, req.targetCareers);

  const gapAnalysis = analyzeGaps(req, resolvedCareers);
  const topMoves = deriveTopMoves(gapAnalysis);
  const aiAdvantage = getAIAdvantageForCategories(resolvedCareers.map((rc) => rc.career?.category ?? null));
  const targetResumeBenchmark = buildTargetResumeBenchmark(req, resolvedCareers);

  const aiContent = await generateRoadmapWithAI(req, resolvedCareers, gapAnalysis);
  const content = aiContent ?? generateFallbackRoadmap(req, resolvedCareers, gapAnalysis);

  // Phase timing is never left to hardcoded presets or free-text AI output —
  // it's computed here, once, from each phase's actual milestone hours and
  // the student's real weekly availability, so windows are always accurate
  // and flow back-to-back without overlapping.
  const phaseHours = content.phases.map((phase) => totalEstimatedHours(phase.milestones));
  const phaseTimelines = computePhaseTimelines(phaseHours, req.weeklyHoursAvailable);
  content.phases = content.phases.map((phase, i) => ({ ...phase, timeline: phaseTimelines[i] }));

  const roadmap: Roadmap = {
    ...content,
    targetCareers: req.targetCareers,
    gapAnalysis,
    topMoves,
    aiAdvantage,
    targetResumeBenchmark,
    weeklyHoursAvailable: req.weeklyHoursAvailable,
    generatedAt: new Date().toISOString(),
    source: aiContent ? "ai" : "fallback",
  };

  return Response.json(roadmap);
}
