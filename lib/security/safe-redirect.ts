/** Accept only same-site absolute paths; blocks protocol-relative and backslash variants. */
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("\0")) return fallback;
  return value;
}
