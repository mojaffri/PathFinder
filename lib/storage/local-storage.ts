/**
 * Thin, SSR-safe wrapper around window.localStorage. This is the only file
 * that touches `window.localStorage` directly — the `services/` layer builds
 * on these two functions, so swapping to Supabase later means rewriting the
 * services without touching any component code.
 */

export function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort persistence; ignore quota/serialization errors.
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable in privacy modes; deletion remains best effort.
  }
}
