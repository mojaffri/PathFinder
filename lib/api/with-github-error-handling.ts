import { NextResponse } from "next/server";
import { GithubError } from "@/lib/github/client";
import { DatabaseNotConfiguredError } from "@/lib/db/client";

/**
 * Every GitHub-backed route handler wraps its body in this — a rate-limit
 * or not-found response from GitHub becomes a clear, structured JSON error
 * (`{ error, isRateLimit, retryAfterSeconds }`) instead of an unhandled
 * exception, so the UI can show "try again in N minutes" rather than a
 * generic failure. Composes with `withDbErrorHandling`'s DB-unset handling
 * since a GitHub route also touches the database (persisting the analysis).
 */
export async function withGithubErrorHandling(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof GithubError) {
      return NextResponse.json(
        { error: error.message, isRateLimit: error.isRateLimit, retryAfterSeconds: error.retryAfterSeconds },
        { status: error.status === 0 ? 502 : error.status },
      );
    }
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error(error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
