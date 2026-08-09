import { NextResponse } from "next/server";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { logServerEvent } from "@/lib/observability/logger";

/**
 * Every DB-backed route handler wraps its body in this — a missing
 * `DATABASE_URL` becomes a clear 503 instead of an unhandled exception /
 * generic 500, and any other repository error becomes a safe, generic 500
 * (never leaking a raw SQL error or stack trace to the client).
 */
export async function withDbErrorHandling(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const requestId = crypto.randomUUID();
    logServerEvent("error", "database_route_failure", { requestId }, error);
    return NextResponse.json({ error: "Something went wrong. Please try again.", requestId }, { status: 500 });
  }
}
