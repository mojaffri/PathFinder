import { check, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profiles } from "./profiles";

/**
 * Seeded reference table, not user data — one row per entry in
 * `data/careers.ts`, loaded by `scripts/seed-reference-data.ts`. The full
 * curated `Career` record lives in `data` as JSONB rather than normalized
 * columns: there's no query need for its internals yet (see
 * docs/architecture.md's ER design notes), and keeping it 1:1 with the
 * existing `Career` TypeScript type means the seed script is a straight
 * `JSON.stringify`, not a lossy transform.
 */
export const careers = pgTable("careers", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const careerMatches = pgTable("career_matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  careerId: text("career_id").notNull().references(() => careers.id, { onDelete: "restrict" }),
  matchPercentage: integer("match_percentage").notNull(),
  confidence: text("confidence").notNull(),
  reasons: jsonb("reasons").notNull().default(sql`'[]'::jsonb`),
  strengths: jsonb("strengths").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("career_matches_percentage_check", sql`${table.matchPercentage} BETWEEN 0 AND 100`),
  check("career_matches_confidence_check", sql`${table.confidence} IN ('low', 'medium', 'high')`),
]);
