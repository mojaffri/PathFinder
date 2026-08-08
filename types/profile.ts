import type {
  AwardRecord,
  CertificationRecord,
  EducationRecord,
  ExperienceRecord,
  ProjectRecord,
} from "./records";

export type EducationStage =
  | "high-school-freshman"
  | "high-school-sophomore"
  | "high-school-junior"
  | "high-school-senior"
  | "recent-hs-grad-gap-year"
  | "college-freshman"
  | "college-sophomore"
  | "college-junior"
  | "college-senior"
  | "recent-college-grad-undecided"
  | "bootcamp-alternative-student"
  | "graduate-student"
  | "career-changer";

/** Canonical, single source of truth — every form/screen/schema should read from this list. */
export const EDUCATION_STAGES: { value: EducationStage; label: string }[] = [
  { value: "high-school-freshman", label: "High School Freshman" },
  { value: "high-school-sophomore", label: "High School Sophomore" },
  { value: "high-school-junior", label: "High School Junior" },
  { value: "high-school-senior", label: "High School Senior" },
  { value: "recent-hs-grad-gap-year", label: "Recent High School Graduate / Gap Year" },
  { value: "college-freshman", label: "College Freshman" },
  { value: "college-sophomore", label: "College Sophomore" },
  { value: "college-junior", label: "College Junior" },
  { value: "college-senior", label: "College Senior" },
  { value: "recent-college-grad-undecided", label: "Recent College Graduate / Undecided" },
  { value: "bootcamp-alternative-student", label: "Bootcamp / Alternative Student" },
  { value: "graduate-student", label: "Graduate Student" },
  { value: "career-changer", label: "Career Changer" },
];

export type WorkEnvironment =
  | "remote-first"
  | "hybrid"
  | "hybrid-lab"
  | "office-desk"
  | "laboratory"
  | "industrial-plant"
  | "field-operations"
  | "outdoors-field"
  | "clinical-healthcare"
  | "workshop-maker"
  | "courtroom";

/** Canonical, single source of truth for work-environment options and their questionnaire copy. */
export const WORK_ENVIRONMENTS: { value: WorkEnvironment; label: string; description: string }[] = [
  { value: "remote-first", label: "Remote-first", description: "Almost entirely computer-based, from anywhere" },
  { value: "hybrid", label: "Hybrid", description: "A mix of remote and in-office desk work" },
  { value: "hybrid-lab", label: "Hybrid-lab", description: "A mix of desk work and time in a lab" },
  { value: "office-desk", label: "Office / Desk", description: "Primarily in-office, computer-based work" },
  { value: "laboratory", label: "Laboratory", description: "Bench work, experiments, controlled research settings" },
  { value: "industrial-plant", label: "Industrial Plant / Manufacturing", description: "Manufacturing floors, refineries, production lines" },
  { value: "field-operations", label: "Field Operations", description: "On-site technical work, client sites, installations" },
  { value: "outdoors-field", label: "Outdoors / Field", description: "Outdoor site visits, environmental or geological fieldwork" },
  { value: "clinical-healthcare", label: "Clinical / Healthcare", description: "Hospitals, clinics, direct patient-facing settings" },
  { value: "workshop-maker", label: "Workshop / Maker Environment", description: "Hands-on building, prototyping, fabrication" },
  { value: "courtroom", label: "Courtroom / Litigation", description: "In-person advocacy, hearings, depositions, trial prep" },
];

/** 1 = lowest / least important, 5 = highest / most important. */
export type RatingScale = 1 | 2 | 3 | 4 | 5;

export interface WorkPreferences {
  environments: WorkEnvironment[];
  remoteInterest: RatingScale;
  leadershipInterest: RatingScale;
  salaryImportance: RatingScale;
  workLifeBalanceImportance: RatingScale;
}

export const DEFAULT_WORK_PREFERENCES: WorkPreferences = {
  environments: [],
  remoteInterest: 3,
  leadershipInterest: 3,
  salaryImportance: 3,
  workLifeBalanceImportance: 3,
};

/**
 * GPA scales vary by institution and can't be converted to a 4.0 scale with
 * certainty — `normalized4` is always an estimate, never treated as exact.
 */
export type GpaScale = "4.0" | "5.0" | "100" | "other";

export const GPA_SCALES: { value: GpaScale; label: string }[] = [
  { value: "4.0", label: "4.0 scale" },
  { value: "5.0", label: "5.0 scale (weighted)" },
  { value: "100", label: "100-point / percentage scale" },
  { value: "other", label: "Other / not sure" },
];

export interface GpaInfo {
  raw: number | null;
  scale: GpaScale;
  /** Estimated 4.0-scale equivalent. Null when it can't be reasonably estimated. */
  normalized4: number | null;
}

export const EMPTY_GPA: GpaInfo = { raw: null, scale: "4.0", normalized4: null };

export interface StudentProfile {
  id: string;
  name: string;
  age: number | null;
  educationStage: EducationStage | null;
  /** Quick-access snapshot of the primary/most recent education record, kept in sync with `education[0]`. */
  school: string;
  major: string;
  gpa: GpaInfo;
  /** Structured education history — may include more than one degree (e.g. undergrad + grad). */
  education: EducationRecord[];
  targetIndustry: string;
  /** One or more careers to build a roadmap for — supports students aiming for a versatile resume across paths. */
  targetCareers: string[];
  currentSkills: string[];
  interests: string[];
  experience: ExperienceRecord[];
  projects: ProjectRecord[];
  awards: AwardRecord[];
  certifications: CertificationRecord[];
  careerGoals: string;
  workPreferences: WorkPreferences;
  weeklyHoursAvailable: number | null;
  createdAt: string;
  updatedAt: string;
}

export function createEmptyProfile(name: string): StudentProfile {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    age: null,
    educationStage: null,
    school: "",
    major: "",
    gpa: EMPTY_GPA,
    education: [],
    targetIndustry: "",
    targetCareers: [],
    currentSkills: [],
    interests: [],
    experience: [],
    projects: [],
    awards: [],
    certifications: [],
    careerGoals: "",
    workPreferences: DEFAULT_WORK_PREFERENCES,
    weeklyHoursAvailable: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Backfills any field missing from a persisted profile with a safe empty
 * default. Profiles are read straight out of localStorage as untyped JSON,
 * so a record saved before a field (e.g. `targetCareers`) existed on
 * `StudentProfile` would otherwise deserialize with that field `undefined` —
 * crashing every downstream `.length`/`.map`/`.includes` call on it. Called
 * once at the storage boundary so every consumer can trust the full shape.
 */
export function normalizeProfile(raw: StudentProfile): StudentProfile {
  const empty = createEmptyProfile(raw.name ?? "");
  return {
    ...empty,
    ...raw,
    gpa: { ...empty.gpa, ...raw.gpa },
    education: raw.education ?? empty.education,
    targetCareers: raw.targetCareers ?? empty.targetCareers,
    currentSkills: raw.currentSkills ?? empty.currentSkills,
    interests: raw.interests ?? empty.interests,
    experience: raw.experience ?? empty.experience,
    projects: raw.projects ?? empty.projects,
    awards: raw.awards ?? empty.awards,
    certifications: raw.certifications ?? empty.certifications,
    workPreferences: {
      ...empty.workPreferences,
      ...raw.workPreferences,
      environments: raw.workPreferences?.environments ?? empty.workPreferences.environments,
    },
  };
}

/** Rough 0-100 estimate of how filled-out a profile is, used for dashboard progress UI. */
export function profileCompletion(profile: StudentProfile): number {
  const fields = [
    profile.name,
    profile.age,
    profile.educationStage,
    profile.school,
    profile.major,
    profile.targetIndustry,
    profile.targetCareers.length > 0,
    profile.careerGoals,
    profile.currentSkills.length > 0,
    profile.interests.length > 0,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}
