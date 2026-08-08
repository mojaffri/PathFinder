import type { AwardRecord, CertificationRecord, EducationRecord, ExperienceRecord, ProjectRecord } from "./records";

/**
 * Data extracted from an uploaded resume. These are unverified, user-supplied
 * claims pulled from a document — always surfaced to the student for review
 * and correction before being used, never treated as confirmed fact.
 *
 * Structured objects (not flat tag strings) so experience/projects/awards
 * keep their real shape (title, organization, dates, bullets) end to end,
 * from extraction through profile storage through roadmap generation.
 */
export interface ResumeProfileData {
  /** The student's current standing (e.g. "college-sophomore") — separate from the structured degree history below. */
  educationStage: string | null;
  education: EducationRecord[];
  experience: ExperienceRecord[];
  projects: ProjectRecord[];
  awards: AwardRecord[];
  certifications: CertificationRecord[];
  skills: string[];
  extractionConfidence: "low" | "medium" | "high";
  extractionMethod: "ai" | "heuristic";
  followUpQuestions: string[];
}

/** `POST /api/resume`'s response — the extracted data plus the id of the resume row it was persisted as, so the upload flow can reference it later (re-analysis, evidence linking) without a second round trip. */
export interface ResumeUploadResult extends ResumeProfileData {
  resumeId: string;
}

export type ResumeFileType = "pdf" | "docx";

/** One uploaded resume, as tracked in upload history — deliberately excludes `rawText`/`storagePath` (fetched only when actually needed, e.g. re-analysis or download). */
export interface ResumeVersion {
  id: string;
  fileName: string | null;
  fileType: ResumeFileType | null;
  fileSizeBytes: number | null;
  extractionMethod: "ai" | "heuristic";
  extractionConfidence: "low" | "medium" | "high" | null;
  isActive: boolean;
  hasStoredFile: boolean;
  uploadedAt: string;
}
