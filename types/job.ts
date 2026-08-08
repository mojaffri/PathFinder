import type { SkillEvidenceRecord } from "./evidence";

export type JobRequirementCategory = "required" | "preferred";
export type JobRequirementKind = "skill" | "tool" | "experience" | "education";

/** One individually editable requirement extracted from a job posting — maps 1:1 onto a `job_requirements` row. */
export interface JobRequirement {
  id: string;
  category: JobRequirementCategory;
  kind: JobRequirementKind;
  label: string;
  minYears: number | null;
  source: "ai" | "manual";
}

/** A saved, structured job description — the persisted result of `lib/jobs/{ai,heuristic}-extractor.ts`, reviewable/editable before a fit analysis is run against it. */
export interface JobDescription {
  id: string;
  rawText: string;
  title: string | null;
  company: string | null;
  minExperienceYears: number | null;
  preferredExperienceYears: number | null;
  educationRequirement: string | null;
  responsibilities: string[];
  keywords: string[];
  requirements: JobRequirement[];
  extractionMethod: "ai" | "heuristic";
  extractionConfidence: "low" | "medium" | "high" | null;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight row for the job-description list view — omits `rawText`/`requirements`. */
export interface JobDescriptionSummary {
  id: string;
  title: string | null;
  company: string | null;
  requirementCount: number;
  createdAt: string;
}

export type RequirementMatchStatus = "strong" | "partial" | "missing";

/** One requirement's deterministic match result against a profile — see `lib/jobs/fit-scoring.ts`. */
export interface RequirementMatch {
  requirementId: string;
  label: string;
  category: JobRequirementCategory;
  kind: JobRequirementKind;
  status: RequirementMatchStatus;
  /** 0-100 — how confident the match itself is (distinct from `status`, which is the human-readable bucket `confidence` falls into). */
  confidence: number;
  /** Structured, clickable evidence — the same `SkillEvidenceRecord` shape `lib/evidence/confidence.ts` uses, so a requirement match and a skill's confidence report link to the exact same underlying evidence (a project, a role, a GitHub repo) rather than a plain-text label. */
  evidence: SkillEvidenceRecord[];
  gapExplanation: string | null;
}

export type JobFitComponentKey =
  | "requiredSkillCoverage"
  | "preferredSkillCoverage"
  | "experienceMatch"
  | "educationMatch"
  | "evidenceStrength"
  | "projectRelevance";

export interface JobFitComponentScore {
  key: JobFitComponentKey;
  label: string;
  score: number;
  weight: number;
}

/** A prioritized, actionable recommendation — the output of gap prioritization (see `lib/jobs/fit-scoring.ts#prioritizeGaps`). */
export interface JobFitRecommendation {
  requirementId: string | null;
  title: string;
  rationale: string;
  priority: "high" | "medium" | "low";
}

/** A full deterministic fit analysis of one profile against one job description — the numeric score and every component are computed, never AI-generated. */
export interface JobFitAnalysis {
  id: string | null;
  jobDescriptionId: string;
  resumeId: string | null;
  overallFitScore: number;
  componentScores: JobFitComponentScore[];
  requirementMatches: RequirementMatch[];
  topRecommendations: JobFitRecommendation[];
  createdAt: string | null;
}
