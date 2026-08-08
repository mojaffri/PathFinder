import type { StudentProfile } from "@/types";

/**
 * Thin fetch wrapper over `/api/profile` — the actual persistence now lives
 * in Postgres via `repositories/profile-repository.ts`; "who is signed in"
 * is Supabase Auth's session cookie, checked server-side on every request,
 * not a local boolean flag. This file exists so call sites elsewhere in the
 * app didn't need to change shape, only how they're invoked (async now).
 */

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function getProfile(): Promise<StudentProfile | null> {
  const res = await fetch("/api/profile");
  if (res.status === 401) return null;
  const data = (await parseJsonOrThrow(res)) as { profile: StudentProfile | null };
  return data.profile;
}

export async function createProfile(name: string): Promise<StudentProfile> {
  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = (await parseJsonOrThrow(res)) as { profile: StudentProfile };
  return data.profile;
}

export async function updateProfile(updates: Partial<Omit<StudentProfile, "id" | "createdAt">>): Promise<StudentProfile | null> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (res.status === 404) return null;
  const data = (await parseJsonOrThrow(res)) as { profile: StudentProfile };
  return data.profile;
}

export async function deleteProfile(): Promise<void> {
  await fetch("/api/profile", { method: "DELETE" });
}

export async function completeOnboarding(): Promise<StudentProfile> {
  const res = await fetch("/api/profile/complete-onboarding", { method: "POST" });
  const data = (await parseJsonOrThrow(res)) as { profile: StudentProfile };
  return data.profile;
}

/** Permanently deletes the Supabase account itself (not just the profile row) — see `app/api/account/route.ts`. */
export async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/account", { method: "DELETE" });
  await parseJsonOrThrow(res);
}
