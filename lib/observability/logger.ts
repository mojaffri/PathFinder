import "server-only";

type Level = "info" | "warn" | "error";

function safeError(error: unknown) {
  if (!(error instanceof Error)) return { type: typeof error, message: "Non-Error value thrown" };
  return { name: error.name, message: error.message, stack: process.env.NODE_ENV === "development" ? error.stack : undefined };
}

/** JSON logs are searchable in Vercel; callers must pass identifiers, never document bodies or tokens. */
export function logServerEvent(level: Level, event: string, context: Record<string, unknown> = {}, error?: unknown) {
  const record = JSON.stringify({ timestamp: new Date().toISOString(), level, event, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV, ...context, ...(error === undefined ? {} : { error: safeError(error) }) });
  if (level === "error") console.error(record); else if (level === "warn") console.warn(record); else console.info(record);
}
