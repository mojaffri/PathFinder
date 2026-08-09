import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as schema from "@/lib/db/schema";
import { __setTestDb } from "@/lib/db/client";

/**
 * Real integration test harness — an in-memory Postgres (pglite), with the
 * project's actual migrations applied (schema + FORCE RLS policies) plus a
 * minimal stand-in for Supabase's `auth.users`/`auth.uid()`
 * (`drizzle/test-support/auth-stub.sql`, which mirrors Supabase's real
 * `auth.uid()` definition exactly). Repository code under test is completely
 * unmodified — it goes through the same `getDb()`/`withUserContext()` seam
 * production code does, just pointed at this instance via `__setTestDb()`.
 * This is what makes the RLS tests meaningful: they prove the actual FORCE
 * ROW LEVEL SECURITY policies block cross-user access, not just that some
 * isolated SQL string looks right.
 */

function loadSql(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8").replaceAll("--> statement-breakpoint", "");
}

export interface TestDb {
  client: PGlite;
  db: ReturnType<typeof drizzle<typeof schema>>;
}

export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  // PGlite's bootstrap connection is a genuine Postgres superuser, and
  // superusers always bypass row security — FORCE ROW LEVEL SECURITY
  // notwithstanding. Real Supabase's direct-connection `postgres` role is
  // NOT a superuser (Supabase never grants that on a managed platform), so
  // to make these tests mean anything, everything below runs as a
  // freshly-created non-superuser role instead. Since that role — not the
  // bootstrap superuser — is the one that then creates every table, it also
  // ends up owning them, mirroring Supabase's real `postgres` role: not a
  // superuser, but the table owner (so it still bypasses RLS on the
  // intentionally-not-forced reference tables like `careers`).
  await client.exec("CREATE ROLE app_role NOSUPERUSER NOBYPASSRLS;");
  await client.exec("GRANT ALL PRIVILEGES ON DATABASE postgres TO app_role;");
  await client.exec("GRANT ALL ON SCHEMA public TO app_role;");
  await client.exec("SET ROLE app_role;");

  await client.exec(loadSql("drizzle/test-support/auth-stub.sql"));
  await client.exec(loadSql("drizzle/migrations/0000_init_schema.sql"));
  await client.exec(loadSql("drizzle/migrations/0001_rls_policies.sql"));
  await client.exec(loadSql("drizzle/migrations/0002_job_analysis_and_resume_upgrade.sql"));
  await client.exec(loadSql("drizzle/migrations/0003_drop_legacy_job_columns.sql"));
  await client.exec(loadSql("drizzle/migrations/0004_job_requirements_rls.sql"));
  await client.exec(loadSql("drizzle/migrations/0005_evidence_and_github_schema.sql"));
  await client.exec(loadSql("drizzle/migrations/0006_evidence_and_github_rls.sql"));
  await client.exec(loadSql("drizzle/migrations/0007_adaptive_roadmap_schema.sql"));
  await client.exec(loadSql("drizzle/migrations/0008_adaptive_roadmap_rls.sql"));
  await client.exec(loadSql("drizzle/migrations/0009_product_completeness.sql"));
  await client.exec(loadSql("drizzle/migrations/0010_api_rate_limits.sql"));

  __setTestDb(db);
  return { client, db };
}

export async function closeTestDb(testDb: TestDb): Promise<void> {
  __setTestDb(null);
  await testDb.client.close();
}

/** Inserts a row directly into the `auth.users` stub — the FK target `profiles.user_id` requires. */
export async function insertAuthUser(testDb: TestDb, userId: string, email: string): Promise<void> {
  await testDb.client.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [userId, email]);
}
