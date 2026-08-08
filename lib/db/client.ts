import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Thrown by `getDb()` when `DATABASE_URL` isn't configured. Callers (API
 * routes) catch this and return a clear 503 rather than letting a raw
 * connection error leak — mirrors `getAnthropicClient()` returning `null` on
 * a missing key, except the database has no deterministic fallback to fall
 * through to, so we fail loudly and specifically instead of silently.
 */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Supabase/Postgres instance.");
    this.name = "DatabaseNotConfiguredError";
  }
}

// The public type every repository is written against — deliberately the
// driver-agnostic Drizzle base type (not `PostgresJsDatabase` specifically),
// so `tests/integration/db.ts` can inject a `drizzle-orm/pglite` instance
// through the exact same seam and exercise real repository code against an
// in-memory Postgres, instead of every test needing a live database.
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

let queryClient: postgres.Sql | null = null;
let db: AnyPgDatabase | null = null;
let testOverride: AnyPgDatabase | null = null;

/**
 * Lazily creates the Postgres connection + Drizzle client on first use —
 * never at module load time. Importing this file must never throw or open a
 * connection, so `next build`'s route/page collection stays safe in an
 * environment with no `DATABASE_URL` configured (e.g. this repo's CI/local
 * dev without a provisioned database).
 */
export function getDb(): AnyPgDatabase {
  if (testOverride) return testOverride;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseNotConfiguredError();

  if (!db) {
    queryClient = postgres(connectionString, { prepare: false });
    db = drizzle(queryClient, { schema }) as unknown as AnyPgDatabase;
  }
  return db;
}

/**
 * Test-only injection seam — swaps `getDb()`'s return value for an in-memory
 * pglite instance (or back to `null` to restore normal behavior). Never call
 * this outside `tests/integration/db.ts`; production code always goes
 * through the lazy postgres.js path above.
 */
export function __setTestDb(instance: unknown): void {
  testOverride = instance as AnyPgDatabase | null;
}

export type Database = AnyPgDatabase;
