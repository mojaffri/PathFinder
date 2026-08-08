import { pgSchema, uuid } from "drizzle-orm/pg-core";

/**
 * Stub reference to Supabase's own `auth.users` table — NOT managed by our
 * migrations. Supabase creates and owns this table; we only declare enough
 * of its shape here so Drizzle can type a foreign key from `profiles.user_id`
 * to it. Never add columns here that aren't needed for that FK reference,
 * and never write a migration that creates/alters the `auth` schema itself.
 */
const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});
