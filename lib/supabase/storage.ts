import "server-only";
import { getSupabaseAdminClient } from "./admin";
import { logServerEvent } from "@/lib/observability/logger";

/**
 * Resume file storage — Supabase Storage, private bucket. Every call here
 * uses the service-role client (storage has no direct-Postgres-style RLS
 * seam the way `lib/db` does), so authorization happens entirely at the
 * caller: nothing in this module is reachable from a client request without
 * `repositories/resume-repository.ts` first proving (via RLS-backed DB
 * lookup) that the requesting user owns the resume row a given path belongs
 * to. Never expose a storage path or bucket access directly to the browser.
 *
 * Storage is optional infrastructure, same convention as the Anthropic key
 * and `DATABASE_URL`: without `SUPABASE_SERVICE_ROLE_KEY` configured, every
 * function here is a no-op/null-returning — resume text extraction and
 * profile data keep working, the original file just isn't persisted.
 */

const RESUME_BUCKET = "resumes";
const MIME_BY_TYPE: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

let bucketEnsured = false;

async function ensureResumeBucket(client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>): Promise<void> {
  if (bucketEnsured) return;
  const { data } = await client.storage.getBucket(RESUME_BUCKET);
  if (!data) {
    await client.storage.createBucket(RESUME_BUCKET, {
      public: false,
      fileSizeLimit: "8MB",
      allowedMimeTypes: Object.values(MIME_BY_TYPE),
    });
  }
  bucketEnsured = true;
}

/** Uploads a resume file at `{profileId}/{resumeId}.{fileType}`, returning the storage path, or `null` if storage isn't configured or the upload failed (never throws — file storage is a nice-to-have on top of the text extraction that already succeeded). */
export async function uploadResumeFile(
  profileId: string,
  resumeId: string,
  fileType: "pdf" | "docx",
  buffer: Buffer,
): Promise<string | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;

  try {
    await ensureResumeBucket(client);
    const path = `${profileId}/${resumeId}.${fileType}`;
    const { error } = await client.storage.from(RESUME_BUCKET).upload(path, buffer, {
      contentType: MIME_BY_TYPE[fileType],
      upsert: true,
    });
    if (error) {
      logServerEvent("error", "resume_storage_upload_failed", { profileId, resumeId, fileType }, error);
      return null;
    }
    return path;
  } catch (error) {
    logServerEvent("error", "resume_storage_upload_failed", { profileId, resumeId, fileType }, error);
    return null;
  }
}

/** Short-lived signed URL for downloading the original file — never a public URL, since the bucket is private. */
export async function getResumeDownloadUrl(storagePath: string): Promise<string | null> {
  const client = getSupabaseAdminClient();
  if (!client) return null;

  const { data, error } = await client.storage.from(RESUME_BUCKET).createSignedUrl(storagePath, 60 * 5);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteResumeFile(storagePath: string): Promise<void> {
  const client = getSupabaseAdminClient();
  if (!client) return;
  const { error } = await client.storage.from(RESUME_BUCKET).remove([storagePath]);
  if (error) logServerEvent("error", "resume_storage_delete_failed", {}, error);
}

/** Removes private files before account deletion so Storage objects cannot outlive their owner. */
export async function deleteResumeFiles(storagePaths: string[]): Promise<boolean> {
  if (storagePaths.length === 0) return true;
  const client = getSupabaseAdminClient();
  if (!client) return false;
  const { error } = await client.storage.from(RESUME_BUCKET).remove(storagePaths);
  if (error) {
    logServerEvent("error", "resume_storage_bulk_delete_failed", { fileCount: storagePaths.length }, error);
    return false;
  }
  return true;
}
