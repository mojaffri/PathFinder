import type { RatingScale, WorkEnvironment } from "./profile";

export type JobGrowth = "declining" | "stable" | "growing" | "fast-growing";

export const JOB_GROWTH_LABELS: Record<JobGrowth, string> = {
  declining: "Declining",
  stable: "Stable",
  growing: "Growing",
  "fast-growing": "Fast-growing",
};

/**
 * Every career and academic path in the app, STEM and beyond. This list is
 * the scope key for the entire app (Discovery, matching, gap analysis, and
 * roadmap generation all key off of it), so a new category needs at least
 * one curated `Career` entry in `data/careers.ts` to actually surface.
 */
export type CareerCategory =
  | "engineering"
  | "software-tech"
  | "data-ai"
  | "biotech-life-sciences"
  | "healthcare"
  | "science-research"
  | "law"
  | "business-finance"
  | "humanities-social-sciences";

/** Resolves a `targetIndustry` label (as stored on `StudentProfile`) back to its category value, for filtering the career dropdown by field. */
export function categoryFromLabel(label: string): CareerCategory | null {
  return CAREER_CATEGORIES.find((c) => c.label === label)?.value ?? null;
}

export const CAREER_CATEGORIES: { value: CareerCategory; label: string }[] = [
  { value: "engineering", label: "Engineering" },
  { value: "software-tech", label: "Software / Technology / Cybersecurity" },
  { value: "data-ai", label: "Data / AI / Quantitative" },
  { value: "biotech-life-sciences", label: "Biotech / Life Sciences" },
  { value: "healthcare", label: "Healthcare / Clinical" },
  { value: "science-research", label: "Physical Sciences / Research" },
  { value: "law", label: "Law / Pre-Law" },
  { value: "business-finance", label: "Business / Finance" },
  { value: "humanities-social-sciences", label: "Humanities / Social Sciences / Public Policy" },
];

/** How much a specific factor matters for being competitive in this career. */
export interface CompetitivenessFactor {
  factor: string;
  description: string;
  weight: RatingScale;
}

/**
 * When a credential realistically becomes attainable, independent of how
 * valuable it is. "eligible-now" (default when omitted) means no real
 * prerequisite — start whenever motivated. "requires-upperclass-standing"
 * means it only makes sense once genuinely close to the exam/application
 * window (junior year or later) — e.g. the FE Exam, LSAT, MCAT.
 * "requires-program-completion" means it's structurally impossible until the
 * current degree/licensure pipeline is finished — e.g. the Bar Exam, a PE
 * license — and should never be scheduled into an undergraduate's near-term
 * plan no matter how far along they are.
 */
export type ReadinessGate = "eligible-now" | "requires-upperclass-standing" | "requires-program-completion";

export interface CertificationNote {
  name: string;
  recommend: boolean;
  /** Honest note on whether this cert is actually valued, vs. a project/internship being more valuable. */
  reasoning: string;
  /** Defaults to "eligible-now" when omitted. */
  readinessGate?: ReadinessGate;
}

export interface Career {
  id: string;
  title: string;
  category: CareerCategory;
  description: string;

  commonMajors: string[];
  degreeRequirements: string;
  advancedDegreeTypical: boolean;
  graduateSchoolConsiderations: string;

  workEnvironments: WorkEnvironment[];
  mathIntensity: RatingScale;
  codingIntensity: RatingScale;
  technicalIntensity: RatingScale;
  handsOnIntensity: RatingScale;
  researchIntensity: RatingScale;
  communicationIntensity: RatingScale;
  businessIntensity: RatingScale;

  remotePotential: RatingScale;
  salaryPotential: RatingScale;
  /** Qualitative/estimated range, not a verified statistic. */
  salaryRange: string;
  jobGrowth: JobGrowth;
  /** Short qualitative label, e.g. "Very high", "Moderate". */
  competitiveness: string;
  competitivenessFactors: CompetitivenessFactor[];

  commonEntryLevelRoles: string[];
  highValueSkills: string[];
  commonTools: string[];
  certifications: CertificationNote[];

  portfolioExpectations: string;
  internshipExpectations: string;
  researchExpectations: string;
  interviewTypes: string[];
  recruitingTimeline: string;

  commonMistakes: string[];
  differentiationStrategies: string[];
  realityCheck: string;
}

export type MatchConfidence = "low" | "medium" | "high";

export interface CareerMatch {
  career: Career;
  matchPercentage: number;
  confidence: MatchConfidence;
  reasons: string[];
  strengths: string[];
}

export type CareerFitComponentKey =
  | "skillMatch"
  | "experienceMatch"
  | "educationMatch"
  | "projectEvidence"
  | "interestAlignment"
  | "preferenceAlignment"
  | "roleRequirements";

/** One weighted dimension of a `CareerFitBreakdown` — see `lib/matching/career-fit.ts`. */
export interface CareerFitComponentScore {
  key: CareerFitComponentKey;
  label: string;
  /** 0-100. */
  score: number;
  /** Relative weight this component carries toward `overallScore`; all seven weights across a breakdown sum to 100. */
  weight: number;
  evidence: string[];
}

/**
 * A full, explainable career-fit report for one student profile against one
 * curated career: the recruiter-visible "why this score" breakdown —
 * component scores, the concrete evidence behind each, and plain strengths/
 * gaps. `overallScore` is a deterministic weighted average of `components`,
 * never an LLM-generated number (see `lib/matching/career-fit.ts`).
 */
export interface CareerFitBreakdown {
  careerId: string;
  careerTitle: string;
  overallScore: number;
  components: CareerFitComponentScore[];
  strengths: string[];
  gaps: string[];
  /** Deterministic template text summarizing the score — not AI-generated (see CLAUDE.md's deterministic-vs-AI rule). */
  explanation: string;
}

/** Loose lookup so free-text target-career values still resolve to structured data where possible. */
export function findCareerByTitle(careers: Career[], title: string): Career | null {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return null;

  const exact = careers.find((c) => c.title.toLowerCase() === normalized);
  if (exact) return exact;

  const partial = careers.find(
    (c) => c.title.toLowerCase().includes(normalized) || normalized.includes(c.title.toLowerCase()),
  );
  return partial ?? null;
}

/**
 * A student-entered target career title paired with its structured database
 * match, if any (free-text/"other" entries resolve to `career: null` and
 * still get carried through by title everywhere gaps/roadmaps reference it).
 */
export interface ResolvedCareer {
  title: string;
  career: Career | null;
}

export function resolveCareers(careers: Career[], titles: string[]): ResolvedCareer[] {
  return titles
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title) => ({ title, career: findCareerByTitle(careers, title) }));
}
