import { desc, eq } from "drizzle-orm";
import { ensureProfileId } from "@/repositories/profile-repository";
import { withUserContext } from "@/lib/db/with-user-context";
import { resumes } from "@/lib/db/schema";
import type { ResumeFileType, ResumeVersion } from "@/types";

type ResumeRow = typeof resumes.$inferSelect;

function toVersion(row: ResumeRow): ResumeVersion {
  return {
    id: row.id,
    fileName: row.fileName,
    fileType: row.fileType as ResumeFileType | null,
    fileSizeBytes: row.fileSizeBytes,
    extractionMethod: row.extractionMethod as "ai" | "heuristic",
    extractionConfidence: row.extractionConfidence as ResumeVersion["extractionConfidence"],
    isActive: row.isActive,
    hasStoredFile: row.storagePath !== null,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export interface SaveResumeInput {
  fileName: string;
  fileType: ResumeFileType;
  fileSizeBytes: number;
  storagePath: string | null;
  rawText: string;
  extractionMethod: "ai" | "heuristic";
  extractionConfidence: "low" | "medium" | "high";
}

/** Deactivates every other resume for this profile and inserts the new upload as the active one — every upload becomes its own version rather than overwriting the last. */
export async function saveResume(userId: string, input: SaveResumeInput): Promise<{ id: string; profileId: string }> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    await tx.update(resumes).set({ isActive: false }).where(eq(resumes.profileId, profileId));
    const [row] = await tx
      .insert(resumes)
      .values({ profileId, isActive: true, ...input })
      .returning({ id: resumes.id });
    return { id: row.id, profileId };
  });
}

export async function listResumes(userId: string): Promise<ResumeVersion[]> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const rows = await tx.select().from(resumes).where(eq(resumes.profileId, profileId)).orderBy(desc(resumes.uploadedAt));
    return rows.map(toVersion);
  });
}

/**
 * Filters ONLY by `id`, mirroring `roadmap-repository.ts#getRoadmap` — RLS
 * (`resumes_owner` in drizzle/migrations/0001_rls_policies.sql) is what
 * actually blocks a different user's resume from being returned here.
 */
export async function getResumeById(userId: string, id: string): Promise<(ResumeVersion & { rawText: string | null; storagePath: string | null }) | null> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx.select().from(resumes).where(eq(resumes.id, id)).limit(1);
    if (!row) return null;
    return { ...toVersion(row), rawText: row.rawText, storagePath: row.storagePath };
  });
}

/** Re-runs extraction against an already-stored resume's text, updating the stored method/confidence to match — see `app/api/resumes/[id]/reanalyze/route.ts`. */
export async function updateResumeExtraction(
  userId: string,
  id: string,
  update: { extractionMethod: "ai" | "heuristic"; extractionConfidence: "low" | "medium" | "high" },
): Promise<void> {
  await withUserContext(userId, async (tx) => {
    await tx.update(resumes).set(update).where(eq(resumes.id, id));
  });
}

export async function setResumeStoragePath(userId: string, id: string, storagePath: string): Promise<void> {
  await withUserContext(userId, async (tx) => {
    await tx.update(resumes).set({ storagePath }).where(eq(resumes.id, id));
  });
}

export async function setActiveResume(userId: string, id: string): Promise<boolean> {
  return withUserContext(userId, async (tx) => {
    const [target] = await tx.select({ profileId: resumes.profileId }).from(resumes).where(eq(resumes.id, id)).limit(1);
    if (!target) return false;

    await tx.update(resumes).set({ isActive: false }).where(eq(resumes.profileId, target.profileId));
    await tx.update(resumes).set({ isActive: true }).where(eq(resumes.id, id));
    return true;
  });
}

/** Returns the deleted row's `storagePath` (so the caller can also remove the file from Supabase Storage), or `null` if no such resume was found/owned. */
export async function deleteResume(userId: string, id: string): Promise<{ storagePath: string | null } | null> {
  return withUserContext(userId, async (tx) => {
    const [row] = await tx.delete(resumes).where(eq(resumes.id, id)).returning({ storagePath: resumes.storagePath });
    return row ?? null;
  });
}
