import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { readinessHistoryFromEvents, toActivityView } from "@/lib/analytics/activity";
import { buildSkillConfidenceContext } from "@/lib/evidence/build-context";
import { computeAllSkillConfidence } from "@/lib/evidence/confidence";
import { computeSavedJobInsights } from "@/lib/jobs/saved-job-insights";
import { getServerUser } from "@/lib/supabase/server";
import { listActivityEvents } from "@/repositories/activity-repository";
import { getAnalyticsRecords } from "@/repositories/analytics-repository";
import { listFullJobDescriptions } from "@/repositories/job-repository";
import type { DashboardOverview } from "@/types";

export async function GET() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const [records, events, jobs, context] = await Promise.all([
      getAnalyticsRecords(user.id), listActivityEvents(user.id, 100), listFullJobDescriptions(user.id), buildSkillConfidenceContext(user.id),
    ]);
    if (!records) return NextResponse.json({ overview: null });
    const insights = computeSavedJobInsights(jobs, context);
    const strongestSkills = context ? computeAllSkillConfidence(context).sort((a, b) => b.overallScore - a.overallScore).slice(0, 5).map(({ skillName, confidence, overallScore }) => ({ skillName, confidence, overallScore })) : [];
    const completed = records.roadmap?.completed ?? 0;
    const total = records.roadmap?.total ?? 0;
    const overview: DashboardOverview = {
      readiness: records.roadmap?.readiness ?? null,
      readinessHistory: readinessHistoryFromEvents(events),
      skillsImproved: records.skillsImproved,
      assessmentsCompleted: records.assessmentScores.length,
      assessmentScores: records.assessmentScores,
      roadmap: { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 },
      tasksCompleted: records.roadmap?.completedHistoryCount ?? completed,
      applicationsByStage: records.applicationsByStage,
      savedJobFitDistribution: records.savedJobFitDistribution,
      recurringMissingRequirements: insights.skills.filter((skill) => skill.evidence !== "Strong").slice(0, 8),
      recentActivity: events.slice(0, 10).map(toActivityView),
      isDemoData: records.profile.isDemo,
      historyNote: records.profile.isDemo ? "This account contains clearly labeled seeded demo history." : "Charts use only activity recorded by PathFinder. No history is estimated or backfilled.",
      targetRoles: records.profile.targetRoles,
      targetDate: records.profile.targetDate,
      currentPhase: records.roadmap?.currentPhase ?? null,
      topSkillGaps: insights.skills.filter((skill) => skill.evidence !== "Strong").slice(0, 5),
      tasksThisWeek: records.roadmap?.tasksThisWeek ?? [],
      strongestSkills,
      savedJobCount: insights.savedJobCount,
    };
    return NextResponse.json({ overview });
  });
}
