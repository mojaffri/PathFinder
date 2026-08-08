import { ResumeExtractionSchema, type ResumeExtraction } from "./schema";

const SAFE_FALLBACK: ResumeExtraction = {
  educationStage: null,
  education: [],
  experience: [],
  projects: [],
  awards: [],
  certifications: [],
  skills: [],
  extractionConfidence: "low",
  followUpQuestions: ["We couldn't reliably read this resume — please fill in your details manually."],
};

/**
 * Last line of defense at the external-data boundary (CLAUDE.md's "Zod
 * validation at every external-data boundary" rule): the AI path already
 * validates its own tool-use response inside `ai-extractor.ts`, but the
 * heuristic extractor's output was never runtime-checked against its own
 * schema before this — a genuinely malformed heuristic result (a future
 * regex bug, an edge case in a weird document) would previously have
 * reached the client and the database unchecked. This can't reject the
 * upload outright (there's no AI fallback beyond the heuristic path), so an
 * invalid result degrades to a safe, clearly-low-confidence empty shape
 * instead of persisting garbage — the user still lands on a working (if
 * empty) review screen rather than a broken one.
 */
export function validateExtraction(extraction: ResumeExtraction): ResumeExtraction {
  const parsed = ResumeExtractionSchema.safeParse(extraction);
  if (parsed.success) return parsed.data;
  console.error("Resume extraction failed schema validation:", parsed.error.message);
  return SAFE_FALLBACK;
}
