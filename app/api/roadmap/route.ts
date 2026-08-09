import { CAREERS } from "@/data/careers";
import { getAIAdvantageForCategories } from "@/data/ai-advantage";
import { analyzeGaps, deriveTopMoves } from "@/lib/gap-analysis/engine";
import { generateRoadmapWithAI } from "@/lib/roadmap/ai-generator";
import { generateFallbackRoadmap } from "@/lib/roadmap/fallback";
import { computePhaseTimelines, totalEstimatedHours } from "@/lib/roadmap/pacing";
import { RoadmapRequestSchema } from "@/lib/roadmap/schema";
import { buildTargetResumeBenchmark } from "@/lib/roadmap/target-resume";
import { resolveCareers, type Roadmap } from "@/types";
import { getServerUser } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { exceedsContentLength } from "@/lib/http/request-limits";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  return withDbErrorHandling(async () => {
  if (exceedsContentLength(request, 500_000)) {
    return NextResponse.json({ error: "Roadmap request is too large." }, { status: 413 });
  }
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const limited = await enforceRateLimit(user.id, "roadmap-generation", 10, 600);
  if (limited) return limited;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  const parsed = RoadmapRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const fieldPath = firstIssue?.path.join(".") || "request";
    return NextResponse.json(
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

  return NextResponse.json(roadmap);
  });
}
