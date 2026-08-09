export const APPLICATION_STATUSES = [
  "saved",
  "preparing",
  "applied",
  "phone_screen",
  "interview",
  "final_round",
  "rejected",
  "offer",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface ApplicationGapSnapshot {
  label: string;
  category: "required" | "preferred";
  status: "partial" | "missing";
}

export interface JobApplication {
  id: string;
  jobDescriptionId: string | null;
  company: string;
  title: string;
  jobDescription: string | null;
  sourceUrl: string | null;
  fitScore: number | null;
  applicationDate: string | null;
  currentStage: ApplicationStatus;
  interviewDates: string[];
  notes: string | null;
  gapsAtApplication: ApplicationGapSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export type JobApplicationInput = Omit<JobApplication, "id" | "createdAt" | "updatedAt">;

export interface SavedJobSkillInsight {
  skill: string;
  totalJobs: number;
  requiredJobs: number;
  preferredJobs: number;
  frequencyPercent: number;
  requiredFrequencyPercent: number;
  preferredFrequencyPercent: number;
  evidence: "Strong" | "Partial" | "Missing";
  evidenceScore: number;
}

export interface SavedJobInsights {
  savedJobCount: number;
  skills: SavedJobSkillInsight[];
  recommendation: string | null;
  basisLabel: string;
}
