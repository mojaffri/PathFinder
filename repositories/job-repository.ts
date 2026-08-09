import { desc, eq, inArray, sql } from "drizzle-orm";
import { ensureProfileId } from "@/repositories/profile-repository";
import { withUserContext } from "@/lib/db/with-user-context";
import { jobDescriptions, jobMatches, jobRequirements } from "@/lib/db/schema";
import type { JobDescription, JobDescriptionSummary, JobFitAnalysis, JobRequirement } from "@/types";
import type { JobExtraction } from "@/lib/jobs/schema";

type JobDescriptionRow = typeof jobDescriptions.$inferSelect;
type JobRequirementRow = typeof jobRequirements.$inferSelect;

function toRequirement(row: JobRequirementRow): JobRequirement {
  return {
    id: row.id,
    category: row.category as JobRequirement["category"],
    kind: row.kind as JobRequirement["kind"],
    label: row.label,
    minYears: row.minYears,
    source: row.source as JobRequirement["source"],
  };
}

function toJobDescription(row: JobDescriptionRow, requirementRows: JobRequirementRow[]): JobDescription {
  return {
    id: row.id,
    rawText: row.rawText,
    title: row.title,
    company: row.company,
    minExperienceYears: row.minExperienceYears,
    preferredExperienceYears: row.preferredExperienceYears,
    educationRequirement: row.educationRequirement,
    responsibilities: row.responsibilities,
    keywords: row.keywords,
    requirements: requirementRows.sort((a, b) => a.sortOrder - b.sortOrder).map(toRequirement),
    extractionMethod: row.extractionMethod as JobDescription["extractionMethod"],
    extractionConfidence: row.extractionConfidence as JobDescription["extractionConfidence"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createJobDescription(
  userId: string,
  rawText: string,
  extraction: JobExtraction,
  extractionMethod: "ai" | "heuristic",
): Promise<JobDescription> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);

    const [row] = await tx
      .insert(jobDescriptions)
      .values({
        profileId,
        rawText,
        title: extraction.title,
        company: extraction.company,
        minExperienceYears: extraction.minExperienceYears,
        preferredExperienceYears: extraction.preferredExperienceYears,
        educationRequirement: extraction.educationRequirement,
        responsibilities: extraction.responsibilities,
        keywords: extraction.keywords,
        extractionMethod,
        extractionConfidence: extraction.extractionConfidence,
      })
      .returning();

    let requirementRows: JobRequirementRow[] = [];
    if (extraction.requirements.length > 0) {
      requirementRows = await tx
        .insert(jobRequirements)
        .values(
          extraction.requirements.map((r, i) => ({
            jobDescriptionId: row.id,
            category: r.category,
            kind: r.kind,
            label: r.label,
            minYears: r.minYears,
            source: "ai" as const,
            sortOrder: i,
          })),
        )
        .returning();
    }

    return toJobDescription(row, requirementRows);
  });
}

export async function listJobDescriptions(userId: string): Promise<JobDescriptionSummary[]> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const rows = await tx
      .select({
        id: jobDescriptions.id,
        title: jobDescriptions.title,
        company: jobDescriptions.company,
        createdAt: jobDescriptions.createdAt,
        requirementCount: sql<number>`count(${jobRequirements.id})`.mapWith(Number),
      })
      .from(jobDescriptions)
      .leftJoin(jobRequirements, eq(jobRequirements.jobDescriptionId, jobDescriptions.id))
      .where(eq(jobDescriptions.profileId, profileId))
      .groupBy(jobDescriptions.id)
      .orderBy(desc(jobDescriptions.createdAt));

    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  });
}

/**
 * Bulk-fetches every saved job description WITH its full requirements —
 * unlike `listJobDescriptions` (a lightweight summary for the `/jobs` list
 * view), this is what the adaptive roadmap engine's saved-job aggregation
 * (`lib/roadmap/saved-job-signals.ts`) needs. Batches the requirements query
 * with `inArray` rather than N+1, same convention as `roadmap-repository.ts`.
 */
export async function listFullJobDescriptions(userId: string): Promise<JobDescription[]> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const rows = await tx.select().from(jobDescriptions).where(eq(jobDescriptions.profileId, profileId)).orderBy(desc(jobDescriptions.createdAt)).limit(200);
    if (rows.length === 0) return [];

    const requirementRows = await tx
      .select()
      .from(jobRequirements)
      .where(inArray(jobRequirements.jobDescriptionId, rows.map((r) => r.id)));

    const byJobId = new Map<string, JobRequirementRow[]>();
    for (const req of requirementRows) {
      const list = byJobId.get(req.jobDescriptionId) ?? [];
      list.push(req);
      byJobId.set(req.jobDescriptionId, list);
    }

    return rows.map((row) => toJobDescription(row, byJobId.get(row.id) ?? []));
  });
}

/** Filters ONLY by `id` — RLS (`job_descriptions_owner`) enforces ownership, same pattern as `roadmap-repository.ts#getRoadmap`. */
export async function getJobDescription(userId: string, id: string): Promise<JobDescription | null> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx.select().from(jobDescriptions).where(eq(jobDescriptions.id, id)).limit(1);
    if (!row) return null;
    const requirementRows = await tx.select().from(jobRequirements).where(eq(jobRequirements.jobDescriptionId, id));
    return toJobDescription(row, requirementRows);
  });
}

export interface JobDescriptionUpdateInput {
  title: string | null;
  company: string | null;
  minExperienceYears: number | null;
  preferredExperienceYears: number | null;
  educationRequirement: string | null;
  responsibilities: string[];
  keywords: string[];
  requirements: Omit<JobRequirement, "id">[];
}

/** Full-replace update, same semantics as `profile-repository.ts#updateProfile` — the requirements array is deleted and reinserted from what's submitted. */
export async function updateJobDescription(userId: string, id: string, input: JobDescriptionUpdateInput): Promise<JobDescription | null> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx
      .update(jobDescriptions)
      .set({
        title: input.title,
        company: input.company,
        minExperienceYears: input.minExperienceYears,
        preferredExperienceYears: input.preferredExperienceYears,
        educationRequirement: input.educationRequirement,
        responsibilities: input.responsibilities,
        keywords: input.keywords,
        updatedAt: new Date(),
      })
      .where(eq(jobDescriptions.id, id))
      .returning();
    if (!row) return null;

    await tx.delete(jobRequirements).where(eq(jobRequirements.jobDescriptionId, id));
    let requirementRows: JobRequirementRow[] = [];
    if (input.requirements.length > 0) {
      requirementRows = await tx
        .insert(jobRequirements)
        .values(input.requirements.map((r, i) => ({ jobDescriptionId: id, ...r, sortOrder: i })))
        .returning();
    }

    return toJobDescription(row, requirementRows);
  });
}

export async function deleteJobDescription(userId: string, id: string): Promise<void> {
  await withUserContext(userId, async (tx) => {
    await tx.delete(jobDescriptions).where(eq(jobDescriptions.id, id));
  });
}

export async function saveJobMatch(userId: string, jobDescriptionId: string, analysis: JobFitAnalysis): Promise<JobFitAnalysis> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const [row] = await tx
      .insert(jobMatches)
      .values({
        profileId,
        jobDescriptionId,
        resumeId: analysis.resumeId,
        overallFitScore: analysis.overallFitScore,
        componentScores: analysis.componentScores,
        requirementMatches: analysis.requirementMatches,
        topRecommendations: analysis.topRecommendations,
      })
      .returning();

    return { ...analysis, id: row.id, createdAt: row.createdAt.toISOString() };
  });
}

export async function listJobMatches(userId: string, jobDescriptionId: string): Promise<JobFitAnalysis[]> {
  return withUserContext(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(jobMatches)
      .where(eq(jobMatches.jobDescriptionId, jobDescriptionId))
      .orderBy(desc(jobMatches.createdAt));

    return rows.map((row) => ({
      id: row.id,
      jobDescriptionId: row.jobDescriptionId,
      resumeId: row.resumeId,
      overallFitScore: row.overallFitScore,
      componentScores: row.componentScores as JobFitAnalysis["componentScores"],
      requirementMatches: row.requirementMatches as JobFitAnalysis["requirementMatches"],
      topRecommendations: row.topRecommendations as JobFitAnalysis["topRecommendations"],
      createdAt: row.createdAt.toISOString(),
    }));
  });
}
