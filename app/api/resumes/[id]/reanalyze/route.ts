import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { extractResumeDataWithAI } from "@/lib/resume/ai-extractor";
import { extractResumeDataHeuristically } from "@/lib/resume/heuristic-extractor";
import { normalizeResumeExtraction } from "@/lib/resume/normalize-extraction";
import { getResumeById, updateResumeExtraction } from "@/repositories/resume-repository";
import { validateExtraction } from "@/lib/resume/validate-extraction";
import type { ResumeUploadResult } from "@/types";

/** Re-runs extraction against an already-stored resume's saved text — useful after an extraction improvement or a low-confidence first pass, without re-uploading the file. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const resume = await getResumeById(user.id, id);
    if (!resume) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!resume.rawText) {
      return NextResponse.json({ error: "This resume has no stored text to re-analyze." }, { status: 422 });
    }

    const aiResult = await extractResumeDataWithAI(resume.rawText);
    const extraction = validateExtraction(
      normalizeResumeExtraction(aiResult ?? extractResumeDataHeuristically(resume.rawText)),
    );
    const extractionMethod: "ai" | "heuristic" = aiResult ? "ai" : "heuristic";

    await updateResumeExtraction(user.id, id, { extractionMethod, extractionConfidence: extraction.extractionConfidence });

    const data: ResumeUploadResult = { ...extraction, extractionMethod, resumeId: id };
    return NextResponse.json(data);
  });
}
