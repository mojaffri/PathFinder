import type { ApplicationStatus, SavedJobSkillInsight } from "./application";

export interface TimeSeriesPoint { date: string; value: number; }
export interface ActivityEventView { id: string; type: string; label: string; occurredAt: string; payload: Record<string, unknown>; }
export interface AssessmentScorePoint { date: string; skill: string; stage: "diagnostic" | "assessment"; score: number | null; }
export interface AnalyticsOverview {
  readiness: number | null;
  readinessHistory: TimeSeriesPoint[];
  skillsImproved: number;
  assessmentsCompleted: number;
  assessmentScores: AssessmentScorePoint[];
  roadmap: { completed: number; total: number; percent: number };
  tasksCompleted: number;
  applicationsByStage: Record<ApplicationStatus, number>;
  savedJobFitDistribution: { low: number; medium: number; high: number };
  recurringMissingRequirements: SavedJobSkillInsight[];
  recentActivity: ActivityEventView[];
  isDemoData: boolean;
  historyNote: string;
}

export interface DashboardOverview extends AnalyticsOverview {
  targetRoles: string[];
  targetDate: string | null;
  currentPhase: string | null;
  topSkillGaps: SavedJobSkillInsight[];
  tasksThisWeek: Array<{ id: string; title: string; skillName: string; targetDate: string | null; status: string }>;
  strongestSkills: Array<{ skillName: string; confidence: string; overallScore: number }>;
  savedJobCount: number;
}
