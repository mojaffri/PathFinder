import { NextResponse } from "next/server";
import { extractResumeDataWithAI } from "@/lib/resume/ai-extractor";
import { extractResumeDataHeuristically } from "@/lib/resume/heuristic-extractor";
import { extractTextFromPdf } from "@/lib/resume/pdf-text";
import { extractTextFromDocx } from "@/lib/resume/docx-text";
import { reassembleLines } from "@/lib/resume/text-normalize";
import { normalizeResumeExtraction } from "@/lib/resume/normalize-extraction";
import { validateExtraction } from "@/lib/resume/validate-extraction";
import { MAX_RESUME_FILE_SIZE, validateResumeFile } from "@/lib/resume/file-validation";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { saveResume, setResumeStoragePath } from "@/repositories/resume-repository";
import { uploadResumeFile } from "@/lib/supabase/storage";
import type { ResumeUploadResult } from "@/types";
import { logActivityEvent } from "@/repositories/activity-repository";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Please sign in before uploading a resume." }, { status: 401 });
    const limited = await enforceRateLimit(user.id, "resume-analysis", 8, 3600);
    if (limited) return limited;

    // Reject oversized uploads before buffering the body into memory.
    // `formData()` below has to read the entire multipart payload up front, so
    // without this the per-file size check further down runs too late to bound
    // memory usage for a large request.
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_RESUME_FILE_SIZE * 2) {
      return NextResponse.json({ error: "That file is too large. Please upload a file under 8MB." }, { status: 413 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
    }

    const file = formData.get("resume");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No resume file was provided." }, { status: 400 });
    }
    const fileName = file instanceof File ? file.name : "resume";

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateResumeFile({ name: fileName, type: file.type, size: file.size }, buffer);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    let rawText: string;
    try {
      rawText = validation.fileType === "pdf" ? await extractTextFromPdf(buffer) : await extractTextFromDocx(buffer);
    } catch {
      return NextResponse.json(
        { error: `Couldn't read that ${validation.fileType.toUpperCase()}. It may be scanned/image-based, password-protected, or corrupted.` },
        { status: 422 },
      );
    }

    if (rawText.trim().length < 30) {
      return NextResponse.json(
        { error: "Couldn't find readable text in that file. Try manual entry instead." },
        { status: 422 },
      );
    }

    // Re-stitch lines extraction shattered mid-sentence/mid-title before
    // either extraction path sees the text — see lib/resume/text-normalize.ts.
    const normalizedText = reassembleLines(rawText);

    const aiResult = await extractResumeDataWithAI(normalizedText);
    const extraction = validateExtraction(
      normalizeResumeExtraction(aiResult ?? extractResumeDataHeuristically(normalizedText)),
    );
    const extractionMethod: "ai" | "heuristic" = aiResult ? "ai" : "heuristic";

    const { id: resumeId, profileId } = await saveResume(user.id, {
      fileName,
      fileType: validation.fileType,
      fileSizeBytes: file.size,
      storagePath: null,
      rawText: normalizedText,
      extractionMethod,
      extractionConfidence: extraction.extractionConfidence,
    });

    // Best-effort: the file itself is nice-to-have (re-download, future
    // re-analysis without re-upload) — its absence never blocks the
    // extraction result the student is actually waiting on.
    const storagePath = await uploadResumeFile(profileId, resumeId, validation.fileType, buffer);
    if (storagePath) await setResumeStoragePath(user.id, resumeId, storagePath);
    await logActivityEvent(user.id, "resume_updated", { resumeId, fileType: validation.fileType, extractionMethod });

    const data: ResumeUploadResult = { ...extraction, extractionMethod, resumeId };
    return NextResponse.json(data);
  });
}
