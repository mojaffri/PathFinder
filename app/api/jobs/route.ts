import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { extractJobDataWithAI } from "@/lib/jobs/ai-extractor";
import { extractJobDataHeuristically } from "@/lib/jobs/heuristic-extractor";
import { createJobDescription, listJobDescriptions } from "@/repositories/job-repository";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const MIN_LENGTH = 50;
const MAX_LENGTH = 20000;

export async function GET() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const jobs = await listJobDescriptions(user.id);
    return NextResponse.json({ jobs });
  });
}

export async function POST(request: Request) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Please sign in before analyzing a job description." }, { status: 401 });
    const limited = await enforceRateLimit(user.id, "job-analysis", 10, 600);
    if (limited) return limited;

    const body: unknown = await request.json().catch(() => null);
    const rawText = body && typeof body === "object" && "rawText" in body && typeof body.rawText === "string" ? body.rawText.trim() : "";

    if (rawText.length < MIN_LENGTH) {
      return NextResponse.json({ error: "That job description looks too short to analyze — paste the full posting." }, { status: 422 });
    }
    if (rawText.length > MAX_LENGTH) {
      return NextResponse.json({ error: `Job descriptions are capped at ${MAX_LENGTH.toLocaleString()} characters — try pasting just the role/requirements sections.` }, { status: 413 });
    }

    const aiResult = await extractJobDataWithAI(rawText);
    const extraction = aiResult ?? extractJobDataHeuristically(rawText);
    const extractionMethod: "ai" | "heuristic" = aiResult ? "ai" : "heuristic";

    const job = await createJobDescription(user.id, rawText, extraction, extractionMethod);
    return NextResponse.json({ job }, { status: 201 });
  });
}
