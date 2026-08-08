/**
 * Cross-cutting, evidence-backed skill confidence — deliberately a SEPARATE
 * domain from SkillForge's own `SkillEvidence`/`skill_evidence` (see
 * `types/skillforge.ts`), which is a narrower concept: a manual link a
 * student attaches to ONE curated `SkillModule`'s progress while working
 * through the guided SkillForge loop. This domain answers a broader
 * question — "for any named skill (not just SkillForge's curated catalog),
 * how much should PathFinder (or a recruiter) actually trust that this
 * student has it?" — by pulling together everything already in the app
 * (profile skill tags, resume experience/projects, SkillForge's own
 * assessed mastery, GitHub-analyzed repos, certifications, coursework)
 * plus manually-added evidence, never treating a self-report as proof.
 *
 * `SkillConfidenceScore` is intentionally NOT persisted — like `topMoves`/
 * `demonstratedGapIds` elsewhere in this app, it's cheap to recompute from
 * data that's already fetched and would otherwise go stale the moment any
 * input changes (a new project, a SkillForge assessment, a re-analyzed
 * repo). Only genuinely new information — manually-added evidence — is
 * persisted (`skill_evidence_records`); see `lib/evidence/confidence.ts`.
 */

export type EvidenceSourceType =
  | "resume"
  | "experience"
  | "project"
  | "github_repo"
  | "coursework"
  | "assessment"
  | "certification"
  | "publication";

export const EVIDENCE_SOURCE_TYPES: { value: EvidenceSourceType; label: string }[] = [
  { value: "resume", label: "Resume / self-reported skill" },
  { value: "experience", label: "Work experience" },
  { value: "project", label: "Project" },
  { value: "github_repo", label: "GitHub repository" },
  { value: "coursework", label: "Coursework" },
  { value: "assessment", label: "SkillForge assessment" },
  { value: "certification", label: "Certification" },
  { value: "publication", label: "Publication" },
];

/** How strong a single piece of evidence is, independent of how many pieces exist — see CLAUDE.md-style discipline: quality over count. */
export type EvidenceStrengthLevel = "weak" | "moderate" | "strong";

/**
 * Whether this evidence has been independently checked. Everything derived
 * automatically from the student's own profile/resume/GitHub is
 * "self-reported" (even a detected GitHub repo is still the student's own
 * account/work, not third-party-verified) — "verified" is reserved for
 * evidence with an actual external verification step (e.g. a real
 * certification credential ID), which this phase doesn't implement
 * verification checks for, so it's always at most "self-reported" in
 * practice today. The type exists so a future verification integration
 * doesn't need a shape change.
 */
export type VerificationStatus = "unverified" | "self-reported" | "verified";

/** The record type a piece of evidence points back to, when it points to something concrete in the app (vs. a free-text manual entry). */
export type EvidenceRefType = "experience" | "project" | "education" | "certification" | "github_repo" | "assessment" | null;

/**
 * One concrete piece of evidence for one named skill. `id` is a stable
 * synthetic id for auto-derived records (`{sourceType}-{sourceRefId}-{skillName}`)
 * so the UI can key/dedupe them even though most are never persisted —
 * only `source: "manual"` records have a real database id.
 */
export interface SkillEvidenceRecord {
  id: string;
  skillName: string;
  sourceType: EvidenceSourceType;
  /** Human-readable label, e.g. "Software Engineer Intern at Acme", "PathFinder repository (GitHub)". */
  sourceLabel: string;
  sourceRefType: EvidenceRefType;
  sourceRefId: string | null;
  evidenceStrength: EvidenceStrengthLevel;
  verificationStatus: VerificationStatus;
  /** Plain-language reason this counts as evidence — never left implicit, so a student (or recruiter) can see exactly why. */
  explanation: string;
  /** Free-text date, same convention as resume/profile date fields — see docs/database.md. */
  occurredOn: string | null;
  /** "manual" for a student-added record (persisted); "auto" for anything derived from existing profile/SkillForge/GitHub data (recomputed, never persisted). */
  origin: "manual" | "auto";
  createdAt: string;
}

/**
 * Named `SkillConfidenceLevel`, not `ConfidenceLevel` — `types/skillforge.ts`
 * already exports a `ConfidenceLevel` for a narrower concept (how much to
 * trust a SkillForge dimension score: "low"|"medium"|"high"). Different
 * scale, different meaning, kept deliberately distinct rather than
 * overloading one name across two domains.
 */
export type SkillConfidenceLevel = "unverified" | "low" | "moderate" | "high" | "very-high";

export const SKILL_CONFIDENCE_LEVELS: { value: SkillConfidenceLevel; label: string }[] = [
  { value: "unverified", label: "Unverified" },
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "very-high", label: "Very High" },
];

/** One of the four evidence dimensions the task spec calls for — see `lib/evidence/confidence.ts` for exactly how each is scored. */
export type ConfidenceDimension = "claimed" | "assessed" | "demonstrated" | "professional";

export interface SkillConfidenceComponent {
  dimension: ConfidenceDimension;
  label: string;
  /** Whether any evidence at all backs this dimension. */
  present: boolean;
  /** Plain-language summary of what was found, e.g. "88/100 (SkillForge assessment)", "Strong (2 projects)". */
  detail: string;
  /** Relative weight this dimension carries toward `overallScore`; the four weights sum to 100. */
  weight: number;
  /** 0-100 — this dimension's own score, independent of its weight. */
  score: number;
}

/** The full, explainable confidence report for one named skill. */
export interface SkillConfidenceScore {
  skillName: string;
  confidence: SkillConfidenceLevel;
  /** 0-100, deterministic weighted score — see `lib/evidence/confidence.ts`. Not shown as a bare number in the UI; `confidence` is the primary signal. */
  overallScore: number;
  components: SkillConfidenceComponent[];
  evidenceCount: number;
  /** Count of distinct `EvidenceSourceType`s backing this skill — informational; the scoring formula itself is quality-weighted, not this count. */
  independentSourceCount: number;
  explanation: string;
  evidence: SkillEvidenceRecord[];
}
