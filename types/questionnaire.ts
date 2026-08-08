import type { CareerCategory } from "./career";
import type { EducationStage, RatingScale, WorkEnvironment } from "./profile";
import { WORK_ENVIRONMENTS } from "./profile";

export type FavoriteSubject =
  | "biology"
  | "chemistry"
  | "physics"
  | "mathematics"
  | "computer-science"
  | "engineering"
  | "environmental-science"
  | "law-government"
  | "business-economics"
  | "humanities-writing"
  | "psychology-social-science";

export const FAVORITE_SUBJECTS: { value: FavoriteSubject; label: string }[] = [
  { value: "biology", label: "Biology" },
  { value: "chemistry", label: "Chemistry" },
  { value: "physics", label: "Physics" },
  { value: "mathematics", label: "Mathematics" },
  { value: "computer-science", label: "Computer Science" },
  { value: "engineering", label: "Engineering" },
  { value: "environmental-science", label: "Environmental Science" },
  { value: "law-government", label: "Law & Government" },
  { value: "business-economics", label: "Business & Economics" },
  { value: "humanities-writing", label: "Humanities & Writing" },
  { value: "psychology-social-science", label: "Psychology & Social Science" },
];

/**
 * Which career categories each favorite subject is a real signal for. Single
 * source of truth for both the questionnaire (which subjects to even show,
 * given the student's chosen fields) and the matching engine (the "favorite
 * subjects" scoring dimension), so the two can never drift apart.
 */
export const SUBJECT_CATEGORY_AFFINITY: Record<FavoriteSubject, CareerCategory[]> = {
  biology: ["biotech-life-sciences", "healthcare", "science-research"],
  chemistry: ["engineering", "science-research", "biotech-life-sciences"],
  physics: ["engineering", "science-research"],
  mathematics: ["data-ai", "science-research"],
  "computer-science": ["software-tech", "data-ai"],
  engineering: ["engineering", "software-tech"],
  "environmental-science": ["engineering", "science-research"],
  "law-government": ["law", "humanities-social-sciences"],
  "business-economics": ["business-finance", "data-ai"],
  "humanities-writing": ["humanities-social-sciences", "law"],
  "psychology-social-science": ["humanities-social-sciences", "healthcare", "business-finance"],
};

export type WorkStyle = "coding" | "physical-systems" | "data" | "science" | "writing-communication" | "strategy-analysis";

export const WORK_STYLES: { value: WorkStyle; label: string }[] = [
  { value: "coding", label: "Writing code & building software" },
  { value: "physical-systems", label: "Designing & building physical systems" },
  { value: "data", label: "Analyzing data & finding patterns" },
  { value: "science", label: "Running experiments & scientific research" },
  { value: "writing-communication", label: "Writing, arguing, and persuading" },
  { value: "strategy-analysis", label: "Strategy, analysis, and decision-making" },
];

/** Which work styles are actually relevant signal for each field, so the questionnaire only shows on-topic options. */
export const CATEGORY_WORK_STYLE_RELEVANCE: Record<CareerCategory, WorkStyle[]> = {
  engineering: ["physical-systems", "coding", "data"],
  "software-tech": ["coding", "data"],
  "data-ai": ["data", "coding"],
  "biotech-life-sciences": ["science", "data"],
  healthcare: ["science", "writing-communication"],
  "science-research": ["science", "data"],
  law: ["writing-communication", "strategy-analysis"],
  "business-finance": ["strategy-analysis", "data"],
  "humanities-social-sciences": ["writing-communication", "strategy-analysis"],
};

/** Which work environments are actually relevant to each field, so the questionnaire only shows on-topic options. */
export const CATEGORY_ENVIRONMENT_RELEVANCE: Record<CareerCategory, WorkEnvironment[]> = {
  engineering: ["workshop-maker", "industrial-plant", "field-operations", "office-desk", "hybrid"],
  "software-tech": ["remote-first", "hybrid", "office-desk"],
  "data-ai": ["remote-first", "hybrid", "office-desk"],
  "biotech-life-sciences": ["laboratory", "hybrid-lab", "office-desk"],
  healthcare: ["clinical-healthcare", "hybrid"],
  "science-research": ["laboratory", "hybrid-lab", "outdoors-field", "office-desk"],
  law: ["courtroom", "office-desk", "hybrid"],
  "business-finance": ["office-desk", "hybrid", "remote-first"],
  "humanities-social-sciences": ["office-desk", "hybrid", "remote-first", "outdoors-field"],
};

/** The five 1-5 rating dimensions asked in Discover, kept generic so the relevance map below can reference them by key. */
export type RatingDimension = "mathComfort" | "technicalProblemSolving" | "tinkeringInterest" | "researchInterest" | "communicationInterest";

/** Which rating questions are actually differentiating signal for each field, so a Pre-Law student isn't asked about tinkering and an engineer isn't asked about persuasive writing. */
export const CATEGORY_RATING_RELEVANCE: Record<CareerCategory, RatingDimension[]> = {
  engineering: ["mathComfort", "technicalProblemSolving", "tinkeringInterest"],
  "software-tech": ["technicalProblemSolving", "tinkeringInterest"],
  "data-ai": ["mathComfort", "technicalProblemSolving", "researchInterest"],
  "biotech-life-sciences": ["researchInterest", "technicalProblemSolving"],
  healthcare: ["communicationInterest", "researchInterest"],
  "science-research": ["mathComfort", "researchInterest", "technicalProblemSolving"],
  law: ["communicationInterest"],
  "business-finance": ["communicationInterest", "technicalProblemSolving"],
  "humanities-social-sciences": ["communicationInterest", "researchInterest"],
};

/** Union a per-category relevance map over the student's chosen fields, preserving the option list's canonical order. Falls back to every option when no field is chosen yet. */
function relevantFor<T extends string>(
  categories: CareerCategory[],
  relevanceMap: Record<CareerCategory, T[]>,
  allOptions: T[],
): T[] {
  if (categories.length === 0) return allOptions;
  const relevant = new Set(categories.flatMap((c) => relevanceMap[c]));
  return allOptions.filter((option) => relevant.has(option));
}

const WORK_ENVIRONMENTS_ORDER = WORK_ENVIRONMENTS.map((e) => e.value);

export function relevantEnvironments(categories: CareerCategory[]): WorkEnvironment[] {
  return relevantFor(categories, CATEGORY_ENVIRONMENT_RELEVANCE, WORK_ENVIRONMENTS_ORDER);
}

export function relevantWorkStyles(categories: CareerCategory[]): WorkStyle[] {
  return relevantFor(categories, CATEGORY_WORK_STYLE_RELEVANCE, WORK_STYLES.map((s) => s.value));
}

export function relevantRatingDimensions(categories: CareerCategory[]): RatingDimension[] {
  return relevantFor(categories, CATEGORY_RATING_RELEVANCE, ALL_RATING_DIMENSIONS);
}

export function relevantSubjects(categories: CareerCategory[]): FavoriteSubject[] {
  if (categories.length === 0) return FAVORITE_SUBJECTS.map((s) => s.value);
  const categorySet = new Set(categories);
  return FAVORITE_SUBJECTS.map((s) => s.value).filter((subject) =>
    SUBJECT_CATEGORY_AFFINITY[subject].some((c) => categorySet.has(c)),
  );
}

const ALL_RATING_DIMENSIONS: RatingDimension[] = [
  "mathComfort",
  "technicalProblemSolving",
  "tinkeringInterest",
  "researchInterest",
  "communicationInterest",
];

export type PriorityFactor =
  | "salary"
  | "work-life-balance"
  | "remote-flexibility"
  | "leadership-entrepreneurship"
  | "learning-growth"
  | "prestige-impact";

export const PRIORITY_FACTORS: { value: PriorityFactor; label: string }[] = [
  { value: "salary", label: "Salary" },
  { value: "work-life-balance", label: "Work-life balance" },
  { value: "remote-flexibility", label: "Remote flexibility" },
  { value: "leadership-entrepreneurship", label: "Leadership / entrepreneurship" },
  { value: "learning-growth", label: "Learning & growth" },
  { value: "prestige-impact", label: "Prestige & impact" },
];

export const DEFAULT_PRIORITY_RANKING: PriorityFactor[] = PRIORITY_FACTORS.map((p) => p.value);

export interface QuestionnaireAnswers {
  age: number | null;
  educationStage: EducationStage | null;
  categoryAffinities: CareerCategory[];
  workEnvironments: WorkEnvironment[];
  mathComfort: RatingScale;
  technicalProblemSolving: RatingScale;
  tinkeringInterest: RatingScale;
  researchInterest: RatingScale;
  /** Interest in writing, argumentation, and persuasion — drives fit for law, humanities, and business/strategy roles. */
  communicationInterest: RatingScale;
  favoriteSubjects: FavoriteSubject[];
  workStylePreferences: WorkStyle[];
  remoteWorkInterest: RatingScale;
  /** Ordered most-important-first. Drives salary/work-life-balance/leadership weighting in matching. */
  priorityRanking: PriorityFactor[];
}

export const EMPTY_QUESTIONNAIRE_ANSWERS: QuestionnaireAnswers = {
  age: null,
  educationStage: null,
  categoryAffinities: [],
  workEnvironments: [],
  mathComfort: 3,
  technicalProblemSolving: 3,
  tinkeringInterest: 3,
  researchInterest: 3,
  communicationInterest: 3,
  favoriteSubjects: [],
  workStylePreferences: [],
  remoteWorkInterest: 3,
  priorityRanking: DEFAULT_PRIORITY_RANKING,
};

/** Rank position (0 = most important) → a 1-5 importance weight for scoring. */
export function rankToImportance(ranking: PriorityFactor[], factor: PriorityFactor): RatingScale {
  const index = ranking.indexOf(factor);
  if (index === -1) return 3;
  const weights: RatingScale[] = [5, 4, 4, 3, 2, 1];
  return weights[Math.min(index, weights.length - 1)];
}
