import { STORAGE_KEYS } from "@/lib/storage/keys";
import { readJSON, removeKey, writeJSON } from "@/lib/storage/local-storage";
import { createEmptyProfile, normalizeProfile, type StudentProfile } from "@/types";

/**
 * Mock local "auth": there is a single profile per browser. A boolean
 * session flag tracks whether the student is currently "signed in" so they
 * can sign out without losing their saved profile, and sign back in later.
 * Swapping this for Supabase later only means rewriting this file.
 */

export function getProfile(): StudentProfile | null {
  const raw = readJSON<StudentProfile>(STORAGE_KEYS.profile);
  return raw ? normalizeProfile(raw) : null;
}

export function isSignedIn(): boolean {
  return readJSON<boolean>(STORAGE_KEYS.session) === true;
}

export function createProfile(name: string): StudentProfile {
  const profile = createEmptyProfile(name);
  writeJSON(STORAGE_KEYS.profile, profile);
  writeJSON(STORAGE_KEYS.session, true);
  return profile;
}

export function saveProfile(profile: StudentProfile): void {
  writeJSON(STORAGE_KEYS.profile, profile);
}

export function updateProfile(
  updates: Partial<Omit<StudentProfile, "id" | "createdAt">>,
): StudentProfile | null {
  const existing = getProfile();
  if (!existing) return null;

  const updated: StudentProfile = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveProfile(updated);
  return updated;
}

export function deleteProfile(): void {
  removeKey(STORAGE_KEYS.profile);
  removeKey(STORAGE_KEYS.session);
}

export function signIn(): boolean {
  if (!getProfile()) return false;
  writeJSON(STORAGE_KEYS.session, true);
  return true;
}

export function signOut(): void {
  writeJSON(STORAGE_KEYS.session, false);
}
