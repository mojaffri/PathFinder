import { and, desc, eq, inArray } from "drizzle-orm";
import { deriveTopMoves } from "@/lib/gap-analysis/engine";
import { withUserContext, type Tx } from "@/lib/db/with-user-context";
import { gapItems, profiles, roadmapPhases, roadmapTasks, roadmaps } from "@/lib/db/schema";
import type {
  AIAdvantageSection,
  CertificationGuidance,
  EducationStage,
  GapItem,
  Roadmap,
  RoadmapPhase,
  RoadmapPhaseKey,
  RoadmapRecommendation,
  RoadmapMilestone,
  RoadmapSource,
  SavedRoadmap,
  TargetResumeBenchmark,
} from "@/types";

async function getProfileRowId(tx: Tx, userId: string) {
  const [row] = await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!row) throw new Error("No profile exists for this user yet.");
  return row.id;
}

function rowToSavedRoadmap(
  roadmapRow: typeof roadmaps.$inferSelect,
  gapRows: (typeof gapItems.$inferSelect)[],
  phaseRows: (typeof roadmapPhases.$inferSelect)[],
  taskRows: (typeof roadmapTasks.$inferSelect)[],
  userId: string,
): SavedRoadmap {
  const gaps: GapItem[] = gapRows
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
      id: g.id,
      category: g.category as GapItem["category"],
      title: g.title,
      description: g.description,
      priority: g.priority as GapItem["priority"],
      impact: g.impact as GapItem["impact"],
      effort: g.effort as GapItem["effort"],
      timeHorizon: g.timeHorizon as GapItem["timeHorizon"],
      estimatedHours: g.estimatedHours,
      relevantCareers: g.relevantCareers,
      evidenceOfCompletion: g.evidenceOfCompletion,
      tacticalActions: g.tacticalActions as GapItem["tacticalActions"],
    }));

  const phases: RoadmapPhase[] = phaseRows
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => {
      const tasksForPhase = taskRows.filter((t) => t.phaseId === p.id).sort((a, b) => a.sortOrder - b.sortOrder);
      const milestones: RoadmapMilestone[] = tasksForPhase
        .filter((t) => t.kind === "milestone")
        .map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description ?? "",
          estimatedHours: t.estimatedHours,
          impact: t.impact as RoadmapMilestone["impact"],
          evidenceOfCompletion: t.evidenceOfCompletion,
        }));
      const recommendedActions: RoadmapRecommendation[] = tasksForPhase
        .filter((t) => t.kind === "action")
        .map((t) => ({
          id: t.id,
          title: t.title,
          tier: (t.tier ?? "nice-to-have") as RoadmapRecommendation["tier"],
          impact: t.impact as RoadmapRecommendation["impact"],
          effort: (t.effort ?? 1) as RoadmapRecommendation["effort"],
          estimatedHours: t.estimatedHours,
          prerequisite: t.prerequisite,
          whyItMatters: t.whyItMatters ?? "",
          evidenceOfCompletion: t.evidenceOfCompletion,
        }));

      return {
        key: p.key as RoadmapPhaseKey,
        title: p.title,
        objective: p.objective,
        timeline: p.timeline,
        whyItMattersForTarget: p.whyItMattersForTarget,
        milestones,
        recommendedActions,
        resources: p.resources,
      };
    });

  const gapAnalysis = {
    currentStateSummary: roadmapRow.gapAnalysisSummary,
    targetCareers: roadmapRow.targetCareers,
    gaps,
  };

  const roadmap: Roadmap = {
    executiveSummary: roadmapRow.executiveSummary,
    targetCareers: roadmapRow.targetCareers,
    currentProfileAssessment: roadmapRow.currentProfileAssessment,
    gapAnalysis,
    topMoves: deriveTopMoves(gapAnalysis),
    competitiveAdvantages: roadmapRow.competitiveAdvantages as string[],
    mistakesToAvoid: roadmapRow.mistakesToAvoid as string[],
    phases,
    certificationGuidance: roadmapRow.certificationGuidance as CertificationGuidance[],
    aiAdvantage: roadmapRow.aiAdvantage as AIAdvantageSection,
    targetResumeBenchmark: roadmapRow.targetResumeBenchmark as TargetResumeBenchmark,
    portfolioIdeas: roadmapRow.portfolioIdeas as string[],
    interviewPreparation: roadmapRow.interviewPreparation as string[],
    recommendedTools: roadmapRow.recommendedTools as string[],
    recommendedResources: roadmapRow.recommendedResources as string[],
    realityCheck: roadmapRow.realityCheck,
    weeklyHoursAvailable: roadmapRow.weeklyHoursAvailable,
    generatedAt: roadmapRow.generatedAt.toISOString(),
    source: roadmapRow.generationSource as "ai" | "fallback",
  };

  return {
    id: roadmapRow.id,
    userId,
    major: roadmapRow.major,
    targetCareers: roadmapRow.targetCareers,
    educationStage: roadmapRow.educationStage as EducationStage | null,
    createdAt: roadmapRow.generatedAt.toISOString(),
    updatedAt: roadmapRow.updatedAt.toISOString(),
    roadmap,
    source: roadmapRow.source as RoadmapSource,
  };
}

export async function listRoadmaps(userId: string): Promise<SavedRoadmap[]> {
  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    const roadmapRows = await tx
      .select()
      .from(roadmaps)
      .where(eq(roadmaps.profileId, profileId))
      .orderBy(desc(roadmaps.updatedAt));

    if (roadmapRows.length === 0) return [];

    const ids = roadmapRows.map((r) => r.id);
    const [allGaps, relevantPhases] = await Promise.all([
      tx.select().from(gapItems).where(inArray(gapItems.roadmapId, ids)),
      tx.select().from(roadmapPhases).where(inArray(roadmapPhases.roadmapId, ids)),
    ]);
    const phaseIds = relevantPhases.map((p) => p.id);
    const allTasks = phaseIds.length > 0 ? await tx.select().from(roadmapTasks).where(inArray(roadmapTasks.phaseId, phaseIds)) : [];

    return roadmapRows.map((r) =>
      rowToSavedRoadmap(
        r,
        allGaps.filter((g) => g.roadmapId === r.id),
        relevantPhases.filter((p) => p.roadmapId === r.id),
        allTasks.filter((t) => phaseIds.includes(t.phaseId)),
        userId,
      ),
    );
  });
}

export async function getRoadmap(userId: string, id: string): Promise<SavedRoadmap | null> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx.select().from(roadmaps).where(eq(roadmaps.id, id)).limit(1);
    if (!row) return null;

    const [gapRows, phaseRows] = await Promise.all([
      tx.select().from(gapItems).where(eq(gapItems.roadmapId, row.id)),
      tx.select().from(roadmapPhases).where(eq(roadmapPhases.roadmapId, row.id)),
    ]);
    const phaseIds = phaseRows.map((p) => p.id);
    const taskRows = phaseIds.length > 0 ? await tx.select().from(roadmapTasks).where(inArray(roadmapTasks.phaseId, phaseIds)) : [];

    return rowToSavedRoadmap(row, gapRows, phaseRows, taskRows, userId);
  });
}

export async function saveRoadmap(userId: string, saved: SavedRoadmap): Promise<SavedRoadmap> {
  return withUserContext(userId, async (tx) => {
    const profileId = await getProfileRowId(tx, userId);
    const r = saved.roadmap;

    const [existing] = await tx.select({ id: roadmaps.id }).from(roadmaps).where(and(eq(roadmaps.id, saved.id), eq(roadmaps.profileId, profileId)));

    const values = {
      profileId,
      major: saved.major,
      targetCareers: saved.targetCareers,
      educationStage: saved.educationStage,
      gapAnalysisSummary: r.gapAnalysis.currentStateSummary,
      source: saved.source,
      generationSource: r.source,
      executiveSummary: r.executiveSummary,
      currentProfileAssessment: r.currentProfileAssessment,
      competitiveAdvantages: r.competitiveAdvantages,
      mistakesToAvoid: r.mistakesToAvoid,
      certificationGuidance: r.certificationGuidance,
      aiAdvantage: r.aiAdvantage,
      targetResumeBenchmark: r.targetResumeBenchmark,
      portfolioIdeas: r.portfolioIdeas,
      interviewPreparation: r.interviewPreparation,
      recommendedTools: r.recommendedTools,
      recommendedResources: r.recommendedResources,
      realityCheck: r.realityCheck,
      weeklyHoursAvailable: r.weeklyHoursAvailable,
      updatedAt: new Date(),
    };

    if (existing) {
      await tx.delete(gapItems).where(eq(gapItems.roadmapId, existing.id));
      const oldPhases = await tx.select({ id: roadmapPhases.id }).from(roadmapPhases).where(eq(roadmapPhases.roadmapId, existing.id));
      if (oldPhases.length > 0) {
        await tx.delete(roadmapTasks).where(inArray(roadmapTasks.phaseId, oldPhases.map((p) => p.id)));
      }
      await tx.delete(roadmapPhases).where(eq(roadmapPhases.roadmapId, existing.id));
      await tx.update(roadmaps).set(values).where(eq(roadmaps.id, existing.id));
    } else {
      await tx.insert(roadmaps).values({ id: saved.id, ...values, generatedAt: new Date(r.generatedAt) });
    }

    if (r.gapAnalysis.gaps.length > 0) {
      await tx.insert(gapItems).values(
        r.gapAnalysis.gaps.map((g, i) => ({
          id: g.id,
          roadmapId: saved.id,
          category: g.category,
          title: g.title,
          description: g.description,
          priority: g.priority,
          impact: g.impact,
          effort: g.effort,
          timeHorizon: g.timeHorizon,
          estimatedHours: g.estimatedHours,
          relevantCareers: g.relevantCareers,
          evidenceOfCompletion: g.evidenceOfCompletion,
          tacticalActions: g.tacticalActions,
          sortOrder: i,
        })),
      );
    }

    for (let i = 0; i < r.phases.length; i++) {
      const phase = r.phases[i];
      const [phaseRow] = await tx
        .insert(roadmapPhases)
        .values({
          roadmapId: saved.id,
          key: phase.key,
          title: phase.title,
          objective: phase.objective,
          timeline: phase.timeline,
          whyItMattersForTarget: phase.whyItMattersForTarget,
          resources: phase.resources,
          sortOrder: i,
        })
        .returning();

      const tasks = [
        ...phase.milestones.map((m, idx) => ({
          id: m.id,
          phaseId: phaseRow.id,
          kind: "milestone" as const,
          title: m.title,
          description: m.description,
          estimatedHours: m.estimatedHours,
          impact: m.impact,
          effort: null,
          tier: null,
          prerequisite: null,
          whyItMatters: null,
          evidenceOfCompletion: m.evidenceOfCompletion,
          sortOrder: idx,
        })),
        ...phase.recommendedActions.map((a, idx) => ({
          id: a.id,
          phaseId: phaseRow.id,
          kind: "action" as const,
          title: a.title,
          description: null,
          estimatedHours: a.estimatedHours,
          impact: a.impact,
          effort: a.effort,
          tier: a.tier,
          prerequisite: a.prerequisite,
          whyItMatters: a.whyItMatters,
          evidenceOfCompletion: a.evidenceOfCompletion,
          sortOrder: idx,
        })),
      ];
      if (tasks.length > 0) await tx.insert(roadmapTasks).values(tasks);
    }

    const [finalRow] = await tx.select().from(roadmaps).where(eq(roadmaps.id, saved.id));
    const [gapRows, phaseRows] = await Promise.all([
      tx.select().from(gapItems).where(eq(gapItems.roadmapId, saved.id)),
      tx.select().from(roadmapPhases).where(eq(roadmapPhases.roadmapId, saved.id)),
    ]);
    const phaseIds = phaseRows.map((p) => p.id);
    const taskRows = phaseIds.length > 0 ? await tx.select().from(roadmapTasks).where(inArray(roadmapTasks.phaseId, phaseIds)) : [];

    return rowToSavedRoadmap(finalRow, gapRows, phaseRows, taskRows, userId);
  });
}

export async function deleteRoadmap(userId: string, id: string): Promise<void> {
  await withUserContext(userId, async (tx) => {
    await tx.delete(roadmaps).where(eq(roadmaps.id, id));
  });
}
