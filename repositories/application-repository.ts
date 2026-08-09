import { and, desc, eq } from "drizzle-orm";
import { activityEvents, applications, jobDescriptions, jobMatches } from "@/lib/db/schema";
import { withUserContext } from "@/lib/db/with-user-context";
import { ensureProfileId } from "@/repositories/profile-repository";
import type { ApplicationGapSnapshot, JobApplication, JobApplicationInput } from "@/types";

type Row = typeof applications.$inferSelect;

function toApplication(row: Row): JobApplication {
  return {
    id: row.id,
    jobDescriptionId: row.jobDescriptionId,
    company: row.company,
    title: row.role,
    jobDescription: row.jobDescriptionText,
    sourceUrl: row.sourceUrl,
    fitScore: row.fitScore,
    applicationDate: row.appliedAt,
    currentStage: row.status as JobApplication["currentStage"],
    interviewDates: row.interviewDates,
    notes: row.notes,
    gapsAtApplication: row.gapsSnapshot as ApplicationGapSnapshot[],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listApplications(userId: string): Promise<JobApplication[]> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const rows = await tx.select().from(applications).where(eq(applications.profileId, profileId)).orderBy(desc(applications.updatedAt)).limit(250);
    return rows.map(toApplication);
  });
}

export async function createApplication(userId: string, input: JobApplicationInput): Promise<JobApplication> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    let resolved = input;

    if (input.jobDescriptionId) {
      const [job] = await tx.select().from(jobDescriptions).where(and(eq(jobDescriptions.id, input.jobDescriptionId), eq(jobDescriptions.profileId, profileId))).limit(1);
      if (!job) throw new Error("Saved job not found.");
      const [latestMatch] = await tx.select().from(jobMatches).where(and(eq(jobMatches.jobDescriptionId, job.id), eq(jobMatches.profileId, profileId))).orderBy(desc(jobMatches.createdAt)).limit(1);
      const gaps = latestMatch
        ? (latestMatch.requirementMatches as Array<{ label: string; category: "required" | "preferred"; status: "strong" | "partial" | "missing" }>).flatMap(({ label, category, status }) => status === "strong" ? [] : [{ label, category, status }])
        : input.gapsAtApplication;
      resolved = {
        ...input,
        company: input.company || job.company || "Unknown company",
        title: input.title || job.title || "Untitled role",
        jobDescription: input.jobDescription || job.rawText,
        fitScore: input.fitScore ?? latestMatch?.overallFitScore ?? null,
        gapsAtApplication: gaps,
      };
    }

    const [row] = await tx.insert(applications).values({
      profileId,
      jobDescriptionId: resolved.jobDescriptionId,
      company: resolved.company,
      role: resolved.title,
      jobDescriptionText: resolved.jobDescription,
      sourceUrl: resolved.sourceUrl,
      fitScore: resolved.fitScore,
      status: resolved.currentStage,
      appliedAt: resolved.applicationDate,
      interviewDates: resolved.interviewDates,
      notes: resolved.notes,
      gapsSnapshot: resolved.gapsAtApplication,
    }).returning();

    await tx.insert(activityEvents).values({ profileId, eventType: "application_created", payload: { applicationId: row.id, company: row.company, title: row.role, stage: row.status } });
    return toApplication(row);
  });
}

export async function updateApplication(userId: string, id: string, input: JobApplicationInput): Promise<JobApplication | null> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const [previous] = await tx.select().from(applications).where(and(eq(applications.id, id), eq(applications.profileId, profileId))).limit(1);
    if (!previous) return null;

    const [row] = await tx.update(applications).set({
      jobDescriptionId: input.jobDescriptionId,
      company: input.company,
      role: input.title,
      jobDescriptionText: input.jobDescription,
      sourceUrl: input.sourceUrl,
      fitScore: input.fitScore,
      status: input.currentStage,
      appliedAt: input.applicationDate,
      interviewDates: input.interviewDates,
      notes: input.notes,
      gapsSnapshot: input.gapsAtApplication,
      updatedAt: new Date(),
    }).where(and(eq(applications.id, id), eq(applications.profileId, profileId))).returning();

    if (previous.status !== row.status) {
      await tx.insert(activityEvents).values({ profileId, eventType: "application_stage_changed", payload: { applicationId: row.id, company: row.company, title: row.role, from: previous.status, to: row.status } });
    }
    return toApplication(row);
  });
}

export async function deleteApplication(userId: string, id: string): Promise<boolean> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const rows = await tx.delete(applications).where(and(eq(applications.id, id), eq(applications.profileId, profileId))).returning({ id: applications.id });
    return rows.length > 0;
  });
}
