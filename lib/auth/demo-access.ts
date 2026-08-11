const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// These POST endpoints calculate a response but do not alter the fictional
// profile, roadmap, jobs, or progress shown in the shared demo. Persistence
// endpoints remain blocked separately.
const DEMO_SAFE_POSTS = new Set(["/api/skillforge/evaluate"]);

export function isReadOnlyDemoMutation(input: {
  pathname: string;
  method: string;
  userEmail: string | null | undefined;
  demoEmail: string | null | undefined;
}): boolean {
  if (!input.pathname.startsWith("/api/") || input.pathname === "/api/demo/login") return false;
  if (!MUTATING_METHODS.has(input.method.toUpperCase())) return false;
  if (input.method.toUpperCase() === "POST" && DEMO_SAFE_POSTS.has(input.pathname)) return false;
  if (!input.userEmail || !input.demoEmail) return false;
  return input.userEmail.toLowerCase() === input.demoEmail.toLowerCase();
}
