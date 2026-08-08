import { sql } from "drizzle-orm";
import { getDb } from "./client";

export type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Runs `callback` inside one Postgres transaction with the session variable
 * `request.jwt.claim.sub` set to `userId` — this is what makes the FORCE
 * ROW LEVEL SECURITY policies in `drizzle/migrations/0001_rls_policies.sql`
 * actually apply to our backend's own direct Postgres connection (Supabase's
 * PostgREST layer sets this automatically from the caller's verified JWT;
 * we talk to Postgres directly via Drizzle, so we set it ourselves).
 *
 * `userId` MUST be the id from a server-verified Supabase session
 * (`getServerSession()` in `lib/supabase/server.ts`), never a client-supplied
 * value — RLS here is a backstop against a bug in a repository's own WHERE
 * clause, not a substitute for verifying who the caller actually is. Every
 * repository function that touches user-owned data must go through this.
 */
export async function withUserContext<T>(userId: string, callback: (tx: Tx) => Promise<T>): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('request.jwt.claim.sub', ${userId}, true)`);
    return callback(tx);
  });
}

/**
 * Runs `callback` with no user context — `auth.uid()` resolves to NULL, so
 * any policy scoped to a specific user denies all rows. Only for genuinely
 * public reference data (careers, skill_modules, assessments) or trusted
 * server-side scripts (seeding) — never for a real user's request.
 */
export async function withPublicContext<T>(callback: (tx: Tx) => Promise<T>): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => callback(tx));
}
