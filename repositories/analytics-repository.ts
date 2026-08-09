import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  adaptiveRoadmapCompletedHistory, adaptiveRoadmapPhases, adaptiveRoadmaps, adaptiveRoadmapTasks,
  applications, assessmentAttempts, assessments, careerGoals, jobMatches, profiles, skillModules, skillProgress,
} from "@/lib/db/schema";
import { withUserContext } from "@/lib/db/with-user-context";
import type { ApplicationStatus, AssessmentScorePoint } from "@/types";

export async function getAnalyticsRecords(userId: string) {
  return withUserContext(userId, async (tx) => {
    const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) return null;

    const [roadmap] = await tx.select().from(adaptiveRoadmaps).where(eq(adaptiveRoadmaps.profileId, profile.id)).limit(1);
    const [applicationRows, progressRows, matchRows, targetRows] = await Promise.all([
      tx.select().from(applications).where(eq(applications.profileId, profile.id)).orderBy(desc(applications.updatedAt)),
      tx.select().from(skillProgress).where(eq(skillProgress.profileId, profile.id)),
      tx.select().from(jobMatches).where(eq(jobMatches.profileId, profile.id)).orderBy(desc(jobMatches.createdAt)).limit(500),
      tx.select().from(careerGoals).where(eq(careerGoals.profileId, profile.id)).orderBy(careerGoals.rank),
    ]);

    let taskRows: Array<typeof adaptiveRoadmapTasks.$inferSelect> = [];
    let phaseRows: Array<typeof adaptiveRoadmapPhases.$inferSelect> = [];
    let completedHistoryRows: Array<typeof adaptiveRoadmapCompletedHistory.$inferSelect> = [];
    if (roadmap) {
      phaseRows = await tx.select().from(adaptiveRoadmapPhases).where(eq(adaptiveRoadmapPhases.roadmapId, roadmap.id)).orderBy(adaptiveRoadmapPhases.sortOrder);
      const phaseIds = phaseRows.map((phase) => phase.id);
      [taskRows, completedHistoryRows] = await Promise.all([
        phaseIds.length ? tx.select().from(adaptiveRoadmapTasks).where(inArray(adaptiveRoadmapTasks.phaseId, phaseIds)) : Promise.resolve([]),
        tx.select().from(adaptiveRoadmapCompletedHistory).where(eq(adaptiveRoadmapCompletedHistory.roadmapId, roadmap.id)),
      ]);
    }

    const progressIds = progressRows.map((progress) => progress.id);
    const attemptRows = progressIds.length ? await tx
      .select({ completedAt: assessmentAttempts.completedAt, stage: assessmentAttempts.stage, evaluation: assessmentAttempts.evaluation, skillId: skillProgress.skillId, skillData: skillModules.data })
      .from(assessmentAttempts)
      .innerJoin(skillProgress, eq(skillProgress.id, assessmentAttempts.skillProgressId))
      .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
      .innerJoin(skillModules, eq(skillModules.id, assessments.skillId))
      .where(and(inArray(assessmentAttempts.skillProgressId, progressIds), gte(assessmentAttempts.completedAt, new Date("2000-01-01"))))
      .orderBy(assessmentAttempts.completedAt) : [];

    const applicationsByStage = Object.fromEntries(["saved", "preparing", "applied", "phone_screen", "interview", "final_round", "rejected", "offer", "withdrawn"].map((status) => [status, 0])) as Record<ApplicationStatus, number>;
    for (const application of applicationRows) applicationsByStage[application.status as ApplicationStatus]++;

    const latestMatchByJob = new Map<string, number>();
    for (const match of matchRows) if (!latestMatchByJob.has(match.jobDescriptionId)) latestMatchByJob.set(match.jobDescriptionId, match.overallFitScore);
    const distribution = { low: 0, medium: 0, high: 0 };
    for (const score of latestMatchByJob.values()) {
      if (score < 50) distribution.low++;
      else if (score < 75) distribution.medium++;
      else distribution.high++;
    }

    const assessmentScores: AssessmentScorePoint[] = attemptRows.filter((attempt) => attempt.completedAt).map((attempt) => {
      const evaluation = attempt.evaluation as { knowledgeScore?: number; abilityScore?: number } | null;
      const data = attempt.skillData as { name?: string };
      const values = [evaluation?.knowledgeScore, evaluation?.abilityScore].filter((value): value is number => typeof value === "number");
      return { date: attempt.completedAt!.toISOString(), skill: data.name ?? attempt.skillId, stage: attempt.stage as "diagnostic" | "assessment", score: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null };
    });

    const today = new Date();
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
    const tasksThisWeek = taskRows.filter((task) => task.status !== "completed" && task.status !== "skipped" && task.scheduledStartDate && new Date(task.scheduledStartDate) <= weekEnd).sort((a, b) => (a.scheduledTargetDate ?? "9999").localeCompare(b.scheduledTargetDate ?? "9999")).slice(0, 5).map((task) => ({ id: task.id, title: task.title, skillName: task.skillName, targetDate: task.scheduledTargetDate, status: task.status }));
    const currentTask = taskRows.filter((task) => task.status !== "completed" && task.status !== "skipped").sort((a, b) => b.priorityScore - a.priorityScore)[0];
    const currentPhase = currentTask ? phaseRows.find((phase) => phase.id === currentTask.phaseId)?.title ?? null : null;

    return {
      profile: { isDemo: profile.isDemo, targetDate: profile.targetDate, targetRoles: targetRows.map((row) => row.title) },
      roadmap: roadmap ? { readiness: roadmap.readiness, currentPhase, completed: taskRows.filter((task) => task.status === "completed").length, total: taskRows.filter((task) => task.status !== "skipped").length, tasksThisWeek, completedHistoryCount: completedHistoryRows.length } : null,
      skillsImproved: progressRows.filter((progress) => progress.level !== "exposure").length,
      assessmentScores,
      applicationsByStage,
      savedJobFitDistribution: distribution,
    };
  });
}
