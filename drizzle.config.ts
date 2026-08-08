import { defineConfig } from "drizzle-kit";

// `dbCredentials.url` is only actually dialed for `db:migrate`/introspection;
// `drizzle-kit generate` diffs the schema against migration snapshots on
// disk and doesn't need a live connection, so a placeholder keeps `generate`
// usable in an environment with no DATABASE_URL configured yet.
export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
  // `auth` is Supabase's own schema (auth.users) — we only reference it for
  // an FK target and must never let drizzle-kit try to create/alter it.
  schemaFilter: ["public"],
});
