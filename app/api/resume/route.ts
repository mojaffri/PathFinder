import { extractResumeDataWithAI } from "@/lib/resume/ai-extractor";
import { extractResumeDataHeuristically } from "@/lib/resume/heuristic-extractor";
import { extractTextFromPdf } from "@/lib/resume/pdf-text";
import { reassembleLines } from "@/lib/resume/text-normalize";
import { normalizeResumeExtraction } from "@/lib/resume/normalize-extraction";
import type { ResumeProfileData } from "@/types";
import { checkRateLimit, requestRateLimitKey } from "@/lib/ai/rate-limit";
import { exceedsContentLength } from "@/lib/http/request-limits";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

export async function POST(request: Request) {
  if (exceedsContentLength(request, MAX_FILE_SIZE + 1_000_000)) return Response.json({ error: "Resume request is too large." }, { status: 413 });
  const rateLimit = checkRateLimit(requestRateLimitKey(request, "resume"), 6);
  if (!rateLimit.allowed) return Response.json({ error: "Too many resume requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = formData.get("resume");
  if (!(file instanceof Blob)) {
    return Response.json({ error: "No resume file was provided." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return Response.json({ error: "Please upload a PDF file." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "That file is too large. Please upload a PDF under 8MB." }, { status: 400 });
  }

  let rawText: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rawText = await extractTextFromPdf(buffer);
  } catch {
    return Response.json(
      { error: "Couldn't read that PDF. It may be scanned/image-based or corrupted." },
      { status: 422 },
    );
  }

  if (rawText.trim().length < 30) {
    return Response.json(
      { error: "Couldn't find readable text in that PDF. Try manual entry instead." },
      { status: 422 },
    );
  }

  // Re-stitch lines PDF extraction shattered mid-sentence/mid-title before
  // either extraction path sees the text — see lib/resume/text-normalize.ts.
  const normalizedText = reassembleLines(rawText);

  const aiResult = await extractResumeDataWithAI(normalizedText);
  const extraction = normalizeResumeExtraction(aiResult ?? extractResumeDataHeuristically(normalizedText));

  const data: ResumeProfileData = {
    ...extraction,
    extractionMethod: aiResult ? "ai" : "heuristic",
  };

  return Response.json(data);
}
