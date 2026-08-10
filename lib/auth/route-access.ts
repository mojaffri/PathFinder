/** Routes that require a signed-in session. Keep this list server-enforced. */
export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/accelerate",
  "/skillforge",
  "/profile",
  "/saved",
  "/onboarding",
  "/jobs",
  "/projects",
  "/roadmap",
  "/applications",
  "/analytics",
] as const;

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
