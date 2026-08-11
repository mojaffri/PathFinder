const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isReadOnlyDemoMutation(input: {
  pathname: string;
  method: string;
  userEmail: string | null | undefined;
  demoEmail: string | null | undefined;
}): boolean {
  if (!input.pathname.startsWith("/api/") || input.pathname === "/api/demo/login") return false;
  if (!MUTATING_METHODS.has(input.method.toUpperCase())) return false;
  if (!input.userEmail || !input.demoEmail) return false;
  return input.userEmail.toLowerCase() === input.demoEmail.toLowerCase();
}
