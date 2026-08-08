import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

/**
 * Minimal hand-rolled migration runner — applies every `.sql` file in
 * `drizzle/migrations/` in filename order, tracked in a `_migrations` table
 * for idempotency. Deliberately not drizzle-kit's own migrator: this project
 * needs to run both drizzle-kit-generated schema migrations AND hand-written
 * SQL (the RLS policies in 0001) from the same directory, in one linear
 * sequence, which drizzle-kit's journal-based migrator doesn't support for
 * files it didn't generate itself.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres/Supabase instance.");
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false, max: 1 });
  const migrationsDir = join(process.cwd(), "drizzle", "migrations");

  try {
    await sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const [row] = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`;
      if (row) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }

      const raw = readFileSync(join(migrationsDir, file), "utf8");
      const statements = raw.replaceAll("--> statement-breakpoint", "");

      console.log(`apply ${file}`);
      await sql.begin(async (tx) => {
        await tx.unsafe(statements);
        await tx`INSERT INTO _migrations (name) VALUES (${file})`;
      });
    }

    console.log("Migrations complete.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
